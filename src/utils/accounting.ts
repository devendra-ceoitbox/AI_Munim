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

/**
 * Robust Client-Side CSV Parser supporting quoted fields and commas
 */
export function parseCsvText(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  if (!csvText || !csvText.trim()) return { headers: [], rows: [] };

  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  // Parse a CSV line taking quotes into account
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(h => h.replace(/^["']|["']$/g, '').trim());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 1 && values[0] === '') continue; // skip blank line

    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      let val = values[idx] || '';
      val = val.replace(/^["']|["']$/g, '').trim();
      rowObj[header] = val;
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Triggers a browser download of a CSV file using Blob
 */
export function downloadCsvFile(filename: string, content: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloadable sample CSV templates for all 7 business datasets
 */
export const SAMPLE_CSV_TEMPLATES: Record<string, { filename: string; content: string }> = {
  accounts: {
    filename: 'sample_chart_of_accounts.csv',
    content: `code,name,group,type,isControlAccount,active
1010,Cash in Hand,Current Assets,ASSET,false,true
1020,ICICI Bank Current A/c,Bank Accounts,ASSET,false,true
1040,Accounts Receivable Control,Current Assets,ASSET,true,true
2010,Accounts Payable Control,Current Liabilities,LIABILITY,true,true
2020,Output GST Payable,Current Liabilities,LIABILITY,true,true
2030,Input Tax Credit (ITC),Current Assets,ASSET,true,true
4010,Consulting Revenue,Revenue,INCOME,false,true
4020,Product Sales,Revenue,INCOME,false,true
5010,Raw Materials Purchase,Direct Expenses,EXPENSE,false,true
5020,Freight & Logistics,Direct Expenses,EXPENSE,false,true`
  },
  items: {
    filename: 'sample_items_master.csv',
    content: `code,description,hsnSac,unit,defaultGstRate,standardCost,sellingPrice
ITM-001,High Density Polymer Granules,3901,KGS,18,110,135
ITM-002,Industrial Corrugated Boxes 5-Ply,4819,NOS,12,24,35
ITM-003,Liquid Stabilizer Resin Grade B,2915,KGS,18,185,240
ITM-004,Senior IT & ERP Advisory Support,998314,HRS,18,2200,3500
ITM-005,Standard Palletised Packaging Shrink,3920,MTR,18,45,65`
  },
  parties: {
    filename: 'sample_parties_master.csv',
    content: `code,legalName,tradeName,type,gstin,stateCode,creditPeriodDays,creditLimit
CUST-001,Bluewave Services Pvt Ltd,Bluewave,CUSTOMER,06AABCB4521K1Z7,06,30,500000
CUST-002,Zenith Retailers LLP,Zenith Stores,CUSTOMER,06AAEFZ4412P1Z9,06,45,300000
CUST-003,Gupta Global Exports,Gupta Exports,CUSTOMER,06AABCG1290L1Z3,06,15,750000
VEND-001,Delta Chemicals Corporation,Delta Chem,VENDOR,06AAECD1177H1Z4,06,30,1000000
VEND-002,Raj Polymers Private Limited,Raj Poly,VENDOR,06AAACR8890M1Z2,06,30,800000
VEND-003,Om Logistics Transport Ltd,Om Logistics,VENDOR,06AAECO4412J1Z8,06,15,250000`
  },
  receivables: {
    filename: 'sample_sales_invoices.csv',
    content: `id,customer,amount,overdueDays,docDate,gstin
INV-1090,Bluewave Services Pvt Ltd,99120,-25,02 Nov 2026,06AABCB4521K1Z7
INV-1091,Zenith Retailers LLP,142500,14,20 Oct 2026,06AAEFZ4412P1Z9
INV-1092,Gupta Global Exports,318000,42,15 Sep 2026,06AABCG1290L1Z3
INV-1093,Om Logistics Transport,28320,-10,28 Oct 2026,06AAECO4412J1Z8
INV-1094,Nova Tech Ventures,88500,68,20 Aug 2026,06AAECN9988P1Z5`
  },
  payables: {
    filename: 'sample_vendor_bills.csv',
    content: `id,supplier,amount,dueInDays,docDate,gstin,priority
BILL-301,Delta Chemicals Corporation,79322,12,28 Oct 2026,06AAECD1177H1Z4,high
BILL-302,Raj Polymers Private Limited,206500,22,25 Oct 2026,06AAACR8890M1Z2,normal
BILL-303,Apex Packaging Industries,13888,5,02 Nov 2026,06AABCA7712P1Z0,high
BILL-304,Om Logistics Transport Ltd,25200,18,30 Oct 2026,06AAECO4412J1Z8,low
BILL-305,CloudGrid Servers India,18400,2,04 Nov 2026,06AAECG7722M1Z1,high`
  },
  bank: {
    filename: 'sample_bank_statement.csv',
    content: `date,narration,amount,category
01 Nov 2026,NEFT-CR-BLUEWAVE SERVICES PVT LTD,99120,Customer Receipt
02 Nov 2026,RTGS-DR-DELTA CHEMICALS VENDOR PMT,-79322,Vendor Payment
03 Nov 2026,UPI-CR-ZENITH RETAILERS PART-PAY,45000,Customer Receipt
04 Nov 2026,CHQ-DR-OFFICE RENT & MAINTENANCE,-55000,Operating Expense
04 Nov 2026,BANK CHARGES & GST TAX DEBIT,-1180,Bank Charges`
  },
  gstr2b: {
    filename: 'sample_gstr2b_portal.csv',
    content: `gstin,supplier,docNo,portalTax,status
06AAECD1177H1Z4,Delta Chemicals Corporation,DC-910,12100,matched
06AAACR8890M1Z2,Raj Polymers Private Limited,RP/221,31500,matched
06AABCA7712P1Z0,Apex Packaging Industries,EXP-318,1488,matched
06AAECT9981K1Z3,Tata Steel Tubes Ltd,TST-402,37800,portal
06AAECO4412J1Z8,Om Logistics Transport,OL-88,1200,matched`
  }
};

