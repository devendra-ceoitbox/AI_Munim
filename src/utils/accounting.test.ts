import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatINR,
  validateGstin,
  calculateTax,
  generateBalancedJournal,
  calculateAgeingBuckets,
  getEligibleItc,
  calculateCashForecast
} from './accounting.ts';
import { DocumentDraft, ReceivableItem, PayableItem, GstReconciliationRow } from '../types/accounting.ts';

test('formatINR formats currency in Indian system correctly', () => {
  assert.equal(formatINR(0), '₹0');
  assert.equal(formatINR(118000), '₹1,18,000');
  assert.equal(formatINR(-38000), '−₹38,000');
  assert.equal(formatINR(1750000), '₹17,50,000');
});

test('validateGstin validates 15-character GST format', () => {
  assert.equal(validateGstin('06AABCS1234F1Z5'), true);
  assert.equal(validateGstin('06AABCB4521K1Z7'), true);
  assert.equal(validateGstin('INVALID_GSTIN'), false);
  assert.equal(validateGstin(''), false);
  assert.equal(validateGstin('123456789012345'), false);
});

test('calculateTax computes rounded GST amounts', () => {
  assert.equal(calculateTax(100000, 18), 18000);
  assert.equal(calculateTax(84000, 18), 15120);
  assert.equal(calculateTax(67222, 18), 12100);
});

test('generateBalancedJournal ensures sum(debit) equals sum(credit)', () => {
  const salesDoc: DocumentDraft = {
    id: 'test-1',
    type: 'Sales Invoice',
    party: 'Bluewave Services',
    docNo: 'INV-1058',
    date: '04 Nov 2026',
    gstin: '06AABCB4521K1Z7',
    taxableValue: 84000,
    gstRate: 18,
    hsn: '998314',
    ledger: 'Consulting Revenue',
    ledgerConfidence: 95,
    status: 'Extracted'
  };

  const journal = generateBalancedJournal(salesDoc);
  const totalDebit = journal.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = journal.reduce((sum, line) => sum + line.credit, 0);

  assert.equal(totalDebit, 84000 + 15120);
  assert.equal(totalCredit, 84000 + 15120);
  assert.equal(totalDebit, totalCredit, 'Debits and Credits must balance identically');
});

test('calculateAgeingBuckets segregates open receivables accurately', () => {
  const sampleAr: ReceivableItem[] = [
    { id: '1', customer: 'A', amount: 50000, overdueDays: -10, promiseDays: null }, // Not due
    { id: '2', customer: 'B', amount: 80000, overdueDays: 15, promiseDays: null },  // 1-30d
    { id: '3', customer: 'C', amount: 120000, overdueDays: 45, promiseDays: null }, // 31-60d
    { id: '4', customer: 'D', amount: 30000, overdueDays: 75, promiseDays: null },  // 61-90d
    { id: '5', customer: 'E', amount: 90000, overdueDays: 95, promiseDays: null, isDisputed: true } // Disputed
  ];

  const buckets = calculateAgeingBuckets(sampleAr);
  assert.equal(buckets.notDue, 50000);
  assert.equal(buckets.days1To30, 80000);
  assert.equal(buckets.days31To60, 120000);
  assert.equal(buckets.days61To90, 30000);
  assert.equal(buckets.disputed, 90000);
  assert.equal(buckets.total, 370000);
});

test('getEligibleItc only includes matched or resolved items', () => {
  const rows: GstReconciliationRow[] = [
    { id: '1', supplier: 'A', docNo: 'A1', booksTax: 10000, portalTax: 10000, status: 'matched' },
    { id: '2', supplier: 'B', docNo: 'B1', booksTax: 20000, portalTax: 18000, status: 'mismatch' },
    { id: '3', supplier: 'C', docNo: 'C1', booksTax: 5000, portalTax: 5000, status: 'resolved' },
    { id: '4', supplier: 'D', docNo: 'D1', booksTax: 3000, portalTax: null, status: 'books' }
  ];

  const eligible = getEligibleItc(rows);
  assert.equal(eligible, 10000 + 5000); // Only matched (10000) + resolved (5000)
});

test('calculateCashForecast generates 30 continuous projection days', () => {
  const ar: ReceivableItem[] = [{ id: '1', customer: 'A', amount: 100000, overdueDays: 5, promiseDays: 3 }];
  const ap: PayableItem[] = [{ id: '1', supplier: 'X', amount: 40000, dueInDays: 4 }];

  const forecast = calculateCashForecast(300000, ar, ap, 'base', 50000, 30000, 30);
  assert.equal(forecast.points.length, 31); // Day 0 to 30
  assert.equal(forecast.points[0].baseCash, 300000);
  assert.ok(typeof forecast.lowestCash === 'number');
});
