import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { accountingEngine } from './src/db/concurrencyEngine.ts';
import { formatINR, getEligibleItc, calculateCashForecast } from './src/utils/accounting.ts';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// --- SSE CLIENTS FOR REAL-TIME STREAMING ---
const sseClients: Response[] = [];

function broadcastStateUpdate() {
  const data = JSON.stringify(accountingEngine.getState());
  sseClients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
}

// Real-time Server-Sent Events endpoint
app.get('/api/realtime/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  // Send initial state immediately
  res.write(`data: ${JSON.stringify(accountingEngine.getState())}\n\n`);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// --- REST API ENDPOINTS ---
app.get('/api/state', (req: Request, res: Response) => {
  res.json(accountingEngine.getState());
});

app.post('/api/role', (req: Request, res: Response) => {
  const { role } = req.body;
  if (['owner', 'fin', 'col', 'app'].includes(role)) {
    accountingEngine.setRole(role);
    broadcastStateUpdate();
    return res.json({ success: true, role });
  }
  res.status(400).json({ error: 'Invalid role' });
});

// Authentication endpoints
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = accountingEngine.loginUser(email, password);
  if (result.success) broadcastStateUpdate();
  res.json(result);
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  accountingEngine.logoutUser();
  broadcastStateUpdate();
  res.json({ success: true });
});

// Document capture across all types
app.post('/api/documents/capture', (req: Request, res: Response) => {
  const { sampleKey } = req.body; // 's' | 'p' | 'd' | 'cn' | 'dn' | 'exp' | 'bst'

  const SAMPLES: Record<string, any> = {
    s: {
      id: `doc-${Date.now()}`,
      type: 'Sales Invoice',
      party: 'Bluewave Services',
      docNo: 'INV-1058',
      date: '04 Nov 2026',
      gstin: '06AABCB4521K1Z7',
      taxableValue: 84000,
      gstRate: 18,
      hsn: '998314',
      ledger: 'Consulting Revenue',
      ledgerConfidence: 71,
      status: 'Extracted',
      userEditedLedger: false
    },
    p: {
      id: `doc-${Date.now()}`,
      type: 'Purchase Invoice',
      party: 'Delta Chemicals',
      docNo: 'DC-910',
      date: '30 Oct 2026',
      gstin: '06AAECD1177H1Z4',
      taxableValue: 67222,
      gstRate: 18,
      hsn: '2915',
      ledger: 'Raw Materials Purchase',
      ledgerConfidence: 92,
      status: 'Extracted',
      userEditedLedger: false
    },
    d: {
      id: `doc-${Date.now()}`,
      type: 'Purchase Invoice',
      party: 'Raj Polymers',
      docNo: 'RP/221',
      date: '28 Oct 2026',
      gstin: '06AAACR8890M1Z2',
      taxableValue: 175000,
      gstRate: 18,
      hsn: '3901',
      ledger: 'Raw Materials Purchase',
      ledgerConfidence: 95,
      status: 'Extracted',
      userEditedLedger: false
    },
    cn: {
      id: `doc-${Date.now()}`,
      type: 'Credit Note',
      party: 'Gupta Exports',
      docNo: 'CN-04',
      date: '02 Nov 2026',
      gstin: '06AABCG1290L1Z3',
      taxableValue: 15000,
      gstRate: 18,
      hsn: '998314',
      ledger: 'Sales Returns & Allowances',
      ledgerConfidence: 94,
      status: 'Extracted',
      userEditedLedger: false
    },
    dn: {
      id: `doc-${Date.now()}`,
      type: 'Debit Note',
      party: 'Raj Polymers',
      docNo: 'DN-02',
      date: '01 Nov 2026',
      gstin: '06AAACR8890M1Z2',
      taxableValue: 8500,
      gstRate: 18,
      hsn: '3901',
      ledger: 'Purchase Returns',
      ledgerConfidence: 91,
      status: 'Extracted',
      userEditedLedger: false
    },
    exp: {
      id: `doc-${Date.now()}`,
      type: 'Expense Voucher',
      party: 'Apex Packaging',
      docNo: 'EXP-318',
      date: '03 Nov 2026',
      gstin: '06AABCA7712P1Z0',
      taxableValue: 12400,
      gstRate: 12,
      hsn: '4819',
      ledger: 'Office Expenses',
      ledgerConfidence: 89,
      status: 'Extracted',
      userEditedLedger: false
    },
    bst: {
      id: `doc-${Date.now()}`,
      type: 'Bank Statement',
      party: 'ICICI Bank Current A/c',
      docNo: 'BST-112',
      date: '04 Nov 2026',
      gstin: '06AAACI0001K1Z9',
      taxableValue: 118000,
      gstRate: 0,
      hsn: '997119',
      ledger: 'Bank Charges',
      ledgerConfidence: 98,
      status: 'Extracted',
      userEditedLedger: false
    }
  };

  const draft = SAMPLES[sampleKey];
  if (!draft) {
    return res.status(400).json({ error: 'Invalid document sample key' });
  }

  accountingEngine.setDraft(draft);
  broadcastStateUpdate();
  res.json({ success: true, draft });
});

// Bulk Batch OCR Ingestion
app.post('/api/documents/bulk', (req: Request, res: Response) => {
  const { docType, files } = req.body;
  const batch = accountingEngine.createBulkBatch(docType || 'Purchase Invoice', files || []);
  broadcastStateUpdate();
  res.json({ success: true, batch });
});

app.post('/api/documents/bulk/post', (req: Request, res: Response) => {
  const result = accountingEngine.postBulkBatch();
  broadcastStateUpdate();
  res.json({ success: true, ...result });
});

app.post('/api/documents/bulk/clear', (req: Request, res: Response) => {
  accountingEngine.clearBulkBatch();
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/documents/submit', (req: Request, res: Response) => {
  const ok = accountingEngine.submitDraftForApproval();
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

app.post('/api/documents/approve', (req: Request, res: Response) => {
  const ok = accountingEngine.postDraft();
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

app.post('/api/documents/clear', (req: Request, res: Response) => {
  accountingEngine.setDraft(null);
  broadcastStateUpdate();
  res.json({ success: true });
});

// Payables: Add Supplier Bill
app.post('/api/bills', (req: Request, res: Response) => {
  const { party, docNo, gstin, taxableValue, gstRate, ledger, idempotencyKey } = req.body;
  const result = accountingEngine.addSupplierBill({
    party,
    docNo,
    gstin,
    taxableValue: parseFloat(taxableValue),
    gstRate: parseInt(gstRate, 10),
    ledger,
    idempotencyKey
  });

  if (result.success) broadcastStateUpdate();
  res.json(result);
});

app.post('/api/bills/approve', (req: Request, res: Response) => {
  const { index } = req.body;
  const result = accountingEngine.approvePendingBill(index);
  if (result.success) broadcastStateUpdate();
  res.json(result);
});

app.post('/api/bills/reject', (req: Request, res: Response) => {
  const { index } = req.body;
  const ok = accountingEngine.rejectPendingBill(index);
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

// Collections: Promise, Dispute, Reminder
app.post('/api/collections/promise', (req: Request, res: Response) => {
  const { index, days } = req.body;
  const ok = accountingEngine.recordPromise(index, days);
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

app.post('/api/collections/dispute', (req: Request, res: Response) => {
  const { index } = req.body;
  const ok = accountingEngine.toggleDispute(index);
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

app.post('/api/collections/remind', (req: Request, res: Response) => {
  const { index } = req.body;
  const result = accountingEngine.sendReminder(index);
  if (result.success) broadcastStateUpdate();
  res.json(result);
});

// GST Reconciliation Actions
app.post('/api/gst/resolve', (req: Request, res: Response) => {
  const { index, action } = req.body;
  const ok = accountingEngine.resolveGstRow(index, action);
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

// Bank Reconciliation
app.post('/api/bank/confirm', (req: Request, res: Response) => {
  const { id } = req.body;
  const ok = accountingEngine.reconcileBankLine(id);
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

app.post('/api/bank/exception', (req: Request, res: Response) => {
  const { id } = req.body;
  const ok = accountingEngine.sendBankLineToException(id);
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

// Concurrency Benchmark Runner
app.post('/api/benchmark', (req: Request, res: Response) => {
  const { count } = req.body;
  const result = accountingEngine.runConcurrencyBenchmark(count || 200);
  broadcastStateUpdate();
  res.json(result);
});

// Grounded AI Natural Language Assistant
app.post('/api/ai/ask', (req: Request, res: Response) => {
  const { question } = req.body;
  const state = accountingEngine.getState();
  const qLower = (question || '').toLowerCase();

  let answer = '';
  let basis = '';
  let sources: string[] = [];

  const eligibleItc = getEligibleItc(state.gstRows);
  const netGst = Math.max(0, state.salesTaxOutput - eligibleItc);

  if (/overdue|customer|receivable|chase/.test(qLower)) {
    const overdueList = state.receivables
      .filter(r => r.overdueDays > 0)
      .sort((a, b) => b.amount * b.overdueDays - a.amount * a.overdueDays);

    answer = overdueList
      .map(
        r =>
          `• ${r.customer} (${r.id}): ${formatINR(r.amount)} — overdue by ${r.overdueDays} days ${
            r.isDisputed
              ? '[DISPUTED]'
              : r.promiseDays !== null
              ? `(Promise in +${r.promiseDays} days)`
              : '(No promise captured)'
          }`
      )
      .join('\n');

    basis = `Ranked by overdue severity (Amount × Overdue Days). Disputed invoices are tracked separately.`;
    sources = overdueList.map(r => r.id);
  } else if (/cash|sufficient|enough|30\s*day|burn/.test(qLower)) {
    const baseForecast = calculateCashForecast(state.cashBalance, state.receivables, state.payables, 'base', state.salesTaxOutput, eligibleItc);
    const cautiousForecast = calculateCashForecast(state.cashBalance, state.receivables, state.payables, 'cautious', state.salesTaxOutput, eligibleItc);

    answer = `Book Cash Balance: ${formatINR(state.cashBalance)}\n` +
      `Base Scenario Low Point: ${formatINR(baseForecast.lowestCash)} on Day +${baseForecast.lowestDay}\n` +
      `Cautious Scenario: ${
        cautiousForecast.lowestCash < 0
          ? `Cash deficit of ${formatINR(cautiousForecast.lowestCash)} projected around Day +${cautiousForecast.lowestDay}. Recommendation: Stagger supplier payments or chase top 2 overdue accounts.`
          : `Adequate liquidity. Projected low point of ${formatINR(cautiousForecast.lowestCash)}.`
      }`;

    basis = `30-day projection modeling receivables inflow timing, scheduled supplier payables, statutory GST payment on Day 17 (${formatINR(netGst)}), and fixed payroll on Day 25 (₹2,60,000).`;
    sources = ['Cash Forecast Engine', 'Open Receivables', 'Open Payables'];
  } else if (/gst|liability|tax|itc|2b/.test(qLower)) {
    answer = `Estimated Net GST Liability: ${formatINR(netGst)}\n` +
      `• Output GST on Sales: ${formatINR(state.salesTaxOutput)}\n` +
      `• Eligible ITC (Matched/Resolved GSTR-2B): ${formatINR(eligibleItc)}\n` +
      `• Book ITC before reconciliation: ${formatINR(state.gstRows.reduce((acc, r) => acc + (r.booksTax || 0), 0))}`;

    basis = `Calculated in compliance with Section 16(2)(aa) of CGST Act. Only matched or resolved portal invoices count towards eligible ITC. Working paper is not a filed return.`;
    sources = state.gstRows.map(r => r.docNo);
  } else if (/payment|payables|supplier|due|week/.test(qLower)) {
    const due7 = state.payables.filter(p => p.dueInDays <= 7);
    const totalDue = due7.reduce((sum, p) => sum + p.amount, 0);

    answer = due7.length > 0
      ? due7.map(p => `• ${p.supplier} (${p.id}): ${formatINR(p.amount)} due in ${p.dueInDays} days`).join('\n') +
        `\n\nTotal Due within 7 Days: ${formatINR(totalDue)}.`
      : 'No supplier bills are due within the next 7 days.';

    basis = 'Accounts payable subledger filtered by due_in_days <= 7. Payments require human release authorization.';
    sources = due7.map(p => p.id);
  } else if (/mismatch|difference|exception/.test(qLower)) {
    const mismatches = state.gstRows.filter(r => ['mismatch', 'books', 'portal'].includes(r.status));
    answer = mismatches.map(
      r => `• ${r.supplier} (${r.docNo}): Books ${r.booksTax ? formatINR(r.booksTax) : 'None'} vs Portal ${r.portalTax ? formatINR(r.portalTax) : 'None'} (${r.status.toUpperCase()})`
    ).join('\n') || 'All GSTR-2B documents are matched or resolved.';

    basis = 'Comparison between internal purchase register and imported GSTR-2B portal entries.';
    sources = mismatches.map(r => r.docNo);
  } else {
    answer = `I can answer queries regarding overdue customer collections, 30-day cash flow adequacy, GST net liability & ITC reconciliation, upcoming supplier dues, or high-concurrency database architecture.`;
    basis = 'Deterministic AI Munim calculation layer.';
    sources = ['Financial Masters'];
  }

  accountingEngine.logAction('AI Munim', `Answered question: "${question.slice(0, 45)}"`, 'system');
  broadcastStateUpdate();

  res.json({
    question,
    answer,
    basis,
    sources,
    timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  });
});

// Settings
app.post('/api/settings/company', (req: Request, res: Response) => {
  accountingEngine.updateCompany(req.body);
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/settings/user/toggle', (req: Request, res: Response) => {
  const { index } = req.body;
  const ok = accountingEngine.toggleUserStatus(index);
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

app.post('/api/settings/user/add', (req: Request, res: Response) => {
  const { name, email, role } = req.body;
  accountingEngine.addUser(name, email, role);
  broadcastStateUpdate();
  res.json({ success: true });
});

// Dropdown Masters Routes
app.post('/api/masters/account', (req: Request, res: Response) => {
  const item = accountingEngine.addMasterAccount(req.body);
  broadcastStateUpdate();
  res.json({ success: true, item });
});

app.post('/api/masters/account/toggle', (req: Request, res: Response) => {
  accountingEngine.toggleMasterAccount(req.body.id);
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/masters/item', (req: Request, res: Response) => {
  const item = accountingEngine.addMasterItem(req.body);
  broadcastStateUpdate();
  res.json({ success: true, item });
});

app.post('/api/masters/item/toggle', (req: Request, res: Response) => {
  accountingEngine.toggleMasterItem(req.body.id);
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/masters/tax-code', (req: Request, res: Response) => {
  const item = accountingEngine.addMasterTaxCode(req.body);
  broadcastStateUpdate();
  res.json({ success: true, item });
});

app.post('/api/masters/tax-code/toggle', (req: Request, res: Response) => {
  accountingEngine.toggleMasterTaxCode(req.body.id);
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/masters/cost-centre', (req: Request, res: Response) => {
  const item = accountingEngine.addMasterCostCentre(req.body);
  broadcastStateUpdate();
  res.json({ success: true, item });
});

app.post('/api/masters/cost-centre/toggle', (req: Request, res: Response) => {
  accountingEngine.toggleMasterCostCentre(req.body.id);
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/masters/bank-account', (req: Request, res: Response) => {
  const item = accountingEngine.addMasterBankAccount(req.body);
  broadcastStateUpdate();
  res.json({ success: true, item });
});

app.post('/api/masters/bank-account/toggle', (req: Request, res: Response) => {
  accountingEngine.toggleMasterBankAccount(req.body.id);
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/masters/doc-series', (req: Request, res: Response) => {
  const item = accountingEngine.addMasterDocSeries(req.body);
  broadcastStateUpdate();
  res.json({ success: true, item });
});

app.post('/api/masters/doc-series/toggle', (req: Request, res: Response) => {
  accountingEngine.toggleMasterDocSeries(req.body.id);
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/masters/party', (req: Request, res: Response) => {
  const item = accountingEngine.addMasterParty(req.body);
  broadcastStateUpdate();
  res.json({ success: true, item });
});

app.post('/api/masters/party/toggle', (req: Request, res: Response) => {
  accountingEngine.toggleMasterParty(req.body.id);
  broadcastStateUpdate();
  res.json({ success: true });
});

// --- VITE MIDDLEWARE / STATIC ASSETS ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(import.meta.dirname || process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Munim Node.js + PostgreSQL Engine running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
