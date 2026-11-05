import { DocumentDraft, JournalLineItem, ReceivableItem, PayableItem, GstReconciliationRow, CashForecastPoint } from '../types/accounting.ts';

export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]\dZ[A-Z\d]$/;

/**
 * Format number to Indian Rupee notation (e.g. ₹1,18,000)
 */
export function formatINR(n: number): string {
  if (isNaN(n) || n === null || n === undefined) return '₹0';
  const isNegative = n < 0;
  const absVal = Math.abs(Math.round(n));
  return (isNegative ? '−₹' : '₹') + absVal.toLocaleString('en-IN');
}

/**
 * Validate standard 15-character Indian GSTIN
 */
export function validateGstin(gstin: string): boolean {
  if (!gstin) return false;
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

/**
 * Calculate GST amounts (taxable * rate / 100)
 */
export function calculateTax(taxable: number, rate: number): number {
  return Math.round((taxable * rate) / 100);
}

/**
 * Generate balanced double-entry journal lines
 * Total Debits MUST equal Total Credits
 */
export function generateBalancedJournal(doc: DocumentDraft): JournalLineItem[] {
  const taxAmt = calculateTax(doc.taxableValue, doc.gstRate);
  const total = doc.taxableValue + taxAmt;
  const isSale = doc.type.toLowerCase().includes('sales');

  if (isSale) {
    // Sales: Debit Customer (AR), Credit Revenue Ledger, Credit Output GST
    return [
      { account: `Accounts Receivable – ${doc.party}`, debit: total, credit: 0 },
      { account: doc.ledger || 'Sales Revenue', debit: 0, credit: doc.taxableValue },
      { account: 'Output GST Payable', debit: 0, credit: taxAmt }
    ];
  } else {
    // Purchase: Debit Expense/Asset Ledger, Debit Input GST (ITC), Credit Supplier (AP)
    return [
      { account: doc.ledger || 'Purchase / Expense', debit: doc.taxableValue, credit: 0 },
      { account: 'Input Tax Credit (ITC)', debit: taxAmt, credit: 0 },
      { account: `Accounts Payable – ${doc.party}`, debit: 0, credit: total }
    ];
  }
}

/**
 * Categorize receivables into standardized ageing buckets
 */
export function calculateAgeingBuckets(arList: ReceivableItem[]): {
  notDue: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  daysOver90: number;
  disputed: number;
  total: number;
} {
  let notDue = 0;
  let days1To30 = 0;
  let days31To60 = 0;
  let days61To90 = 0;
  let daysOver90 = 0;
  let disputed = 0;
  let total = 0;

  for (const inv of arList) {
    total += inv.amount;
    if (inv.isDisputed) {
      disputed += inv.amount;
      continue; // Disputed items track separately
    }

    if (inv.overdueDays <= 0) {
      notDue += inv.amount;
    } else if (inv.overdueDays <= 30) {
      days1To30 += inv.amount;
    } else if (inv.overdueDays <= 60) {
      days31To60 += inv.amount;
    } else if (inv.overdueDays <= 90) {
      days61To90 += inv.amount;
    } else {
      daysOver90 += inv.amount;
    }
  }

  return {
    notDue,
    days1To30,
    days31To60,
    days61To90,
    daysOver90,
    disputed,
    total
  };
}

/**
 * Calculate eligible ITC from GSTR-2B reconciliation
 * Only 'matched' or 'resolved' portal amounts are eligible
 */
export function getEligibleItc(gstRows: GstReconciliationRow[]): number {
  return gstRows
    .filter(r => r.status === 'matched' || r.status === 'resolved')
    .reduce((sum, r) => sum + (r.portalTax || r.booksTax || 0), 0);
}

/**
 * Generate 30-day cash forecast projection curve
 */
export function calculateCashForecast(
  openingCash: number,
  arList: ReceivableItem[],
  apList: PayableItem[],
  scenario: 'base' | 'cautious' | 'optimistic' = 'base',
  outputTaxEstimated: number = 112500,
  eligibleItcEstimated: number = 77400,
  days: number = 30
): {
  points: CashForecastPoint[];
  lowestCash: number;
  lowestDay: number;
  shortfallDays: number[];
  finalCash: number;
} {
  // Collect scheduled cash inflows and outflows
  interface DayEvent {
    day: number;
    inflow: number;
    outflow: number;
    note: string;
  }

  const events: DayEvent[] = [];

  // Inflows from Receivables (excluding disputed)
  for (const inv of arList) {
    if (inv.isDisputed) continue;

    // Determine expected arrival day
    let expectedDay = 8;
    if (inv.promiseDays !== null && inv.promiseDays !== undefined) {
      expectedDay = Math.max(1, inv.promiseDays);
    } else if (inv.overdueDays > 0) {
      expectedDay = inv.overdueDays > 30 ? 12 : 8;
    } else {
      expectedDay = Math.max(1, -inv.overdueDays);
    }

    let amt = inv.amount;

    if (scenario === 'cautious') {
      expectedDay = Math.min(30, expectedDay + 10);
      amt = amt * 0.8; // 20% delay haircut in cautious mode
    } else if (scenario === 'optimistic') {
      expectedDay = Math.max(1, expectedDay - 2);
    }

    events.push({
      day: Math.min(days, expectedDay),
      inflow: amt,
      outflow: 0,
      note: `Inflow: ${inv.customer} (${formatINR(amt)})`
    });
  }

  // Outflows from Payables (Supplier bills)
  for (const bill of apList) {
    const dueDay = Math.max(1, Math.min(days, bill.dueInDays));
    events.push({
      day: dueDay,
      inflow: 0,
      outflow: bill.amount,
      note: `Bill: ${bill.supplier} (${formatINR(bill.amount)})`
    });
  }

  // Statutory GST Payment (Day 17)
  const netGstPayable = Math.max(0, outputTaxEstimated - eligibleItcEstimated);
  if (netGstPayable > 0) {
    events.push({
      day: 17,
      inflow: 0,
      outflow: netGstPayable,
      note: `GST Net Settlement (${formatINR(netGstPayable)})`
    });
  }

  // Operating Payroll / Rent commitments (Day 25)
  events.push({
    day: 25,
    inflow: 0,
    outflow: 260000,
    note: 'Payroll & Operating Fixed Costs (₹2,60,000)'
  });

  // Calculate day-by-day closing cash
  let currentCash = openingCash;
  const points: CashForecastPoint[] = [];
  let lowestCash = openingCash;
  let lowestDay = 0;
  const shortfallDays: number[] = [];

  // Day 0
  points.push({
    day: 0,
    dateStr: 'Today',
    baseCash: openingCash,
    cautiousCash: openingCash,
    optimisticCash: openingCash,
    inflow: 0,
    outflow: 0,
    events: ['Opening Cash Balance']
  });

  const today = new Date();

  for (let d = 1; d <= days; d++) {
    const dayEvents = events.filter(e => e.day === d);
    const dayInflow = dayEvents.reduce((sum, e) => sum + e.inflow, 0);
    const dayOutflow = dayEvents.reduce((sum, e) => sum + e.outflow, 0);

    currentCash = currentCash + dayInflow - dayOutflow;

    if (currentCash < lowestCash) {
      lowestCash = currentCash;
      lowestDay = d;
    }

    if (currentCash < 0) {
      shortfallDays.push(d);
    }

    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + d);
    const dateStr = futureDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

    points.push({
      day: d,
      dateStr: `Day +${d} (${dateStr})`,
      baseCash: Math.round(currentCash),
      cautiousCash: Math.round(currentCash * 0.92 - (d > 15 ? 30000 : 0)),
      optimisticCash: Math.round(currentCash * 1.05 + 15000),
      inflow: Math.round(dayInflow),
      outflow: Math.round(dayOutflow),
      events: dayEvents.map(e => e.note)
    });
  }

  return {
    points,
    lowestCash: Math.round(lowestCash),
    lowestDay,
    shortfallDays,
    finalCash: Math.round(currentCash)
  };
}
