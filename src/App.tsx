/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { MobileNav } from './components/MobileNav.tsx';
import { LoginPage } from './components/auth/LoginPage.tsx';
import { OverviewView } from './components/views/OverviewView.tsx';
import { CaptureApproveView } from './components/views/CaptureApproveView.tsx';
import { PayablesView } from './components/views/PayablesView.tsx';
import { CollectionsView } from './components/views/CollectionsView.tsx';
import { GstWorkspaceView } from './components/views/GstWorkspaceView.tsx';
import { BankReconciliationView } from './components/views/BankReconciliationView.tsx';
import { CashForecastView } from './components/views/CashForecastView.tsx';
import { AiMunimView } from './components/views/AiMunimView.tsx';
import { SettingsView } from './components/views/SettingsView.tsx';
import { VisualReportsView } from './components/views/VisualReportsView.tsx';
import { BulkCsvUploadView } from './components/views/BulkCsvUploadView.tsx';
import { WhatsAppModal } from './components/modals/WhatsAppModal.tsx';
import { AddBillModal } from './components/modals/AddBillModal.tsx';
import { AddInvoiceModal } from './components/modals/AddInvoiceModal.tsx';
import { AppState, accountingEngine } from './db/concurrencyEngine.ts';
import {
  UserRole,
  User,
  ReceivableItem,
  AiChatMessage,
  DocumentType,
  DocumentDraft,
  AccountMaster,
  ItemMaster,
  TaxCodeMaster,
  CostCentreMaster,
  BankAccountMaster,
  DocSeriesMaster,
  PartyMaster
} from './types/accounting.ts';

const TAB_TITLES: Record<string, string> = {
  overview: 'Executive Financial Overview',
  reports: 'Visual Reports & Statutory Financials',
  capture: 'Capture & Approve (AI OCR Lab)',
  'bulk-csv': 'Bulk CSV Upload & Migration Hub',
  payables: 'Payables & Supplier Commitments',
  collections: 'Collections Autopilot & Receivables',
  gst: 'GST Compliance & GSTR-2B Workspace',
  bank: 'Automated Bank Reconciliation',
  cash: '30-Day Liquidity & Cash Flow Forecast',
  ai: 'Ask AI Munim (Financial Copilot)',
  settings: 'Settings, Dropdown Masters & Database Architecture'
};

export default function App() {
  const [state, setState] = useState<AppState>(accountingEngine.getState());
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [whatsAppTarget, setWhatsAppTarget] = useState<ReceivableItem | null>(null);
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(current => (current === msg ? null : current));
    }, 3200);
  };

  // Synchronize state via SSE / REST
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/realtime/stream');
      eventSource.onmessage = (event) => {
        try {
          const newState = JSON.parse(event.data);
          setState(newState);
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };
    } catch (err) {
      console.warn('Real-time SSE fallback to local engine:', err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  const updateEngineState = () => {
    setState({ ...accountingEngine.getState() });
  };

  // --- AUTHENTICATION & ROLE REDIRECTION ---
  const handleLoginSuccess = async (user: User, redirectTab: string) => {
    const res = accountingEngine.loginUser(user.email, user.password);
    if (res.success) {
      updateEngineState();
      setCurrentTab(redirectTab);
      showToast(`Welcome ${user.name}! Redirected to ${TAB_TITLES[redirectTab] || redirectTab}`);
      try {
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, password: user.password })
        });
      } catch {}
    }
  };

  const handleLogout = async () => {
    accountingEngine.logoutUser();
    updateEngineState();
    showToast('Signed out of session');
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
  };

  const handleSelectRole = async (role: UserRole) => {
    accountingEngine.setRole(role);
    updateEngineState();
    showToast(`Switched active workspace role to ${role.toUpperCase()}`);
    try {
      await fetch('/api/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
    } catch (e) {}
  };

  // --- DOCUMENT CAPTURE & SINGLE OCR ---
  const handleCaptureSample = async (sampleKey: 's' | 'p' | 'd' | 'cn' | 'dn' | 'exp' | 'bst') => {
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
    if (draft) {
      accountingEngine.setDraft(draft);
      updateEngineState();
      showToast(`AI OCR extracted ${draft.type} ${draft.docNo}`);
    }

    try {
      await fetch('/api/documents/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleKey })
      });
    } catch (e) {}
  };

  const handleSubmitDraft = async () => {
    const ok = accountingEngine.submitDraftForApproval();
    if (ok) {
      updateEngineState();
      showToast('Document submitted for approver sign-off');
      try {
        await fetch('/api/documents/submit', { method: 'POST' });
      } catch {}
    }
  };

  const handleApproveDraft = async () => {
    const ok = accountingEngine.postDraft();
    if (ok) {
      updateEngineState();
      showToast('Approved & Posted! Double-entry balanced journal created');
      try {
        await fetch('/api/documents/approve', { method: 'POST' });
      } catch {}
    }
  };

  const handleClearDraft = async () => {
    accountingEngine.setDraft(null);
    updateEngineState();
    try {
      await fetch('/api/documents/clear', { method: 'POST' });
    } catch {}
  };

  const handleUpdateDraftLedger = (ledger: string) => {
    if (state.currentDraft) {
      state.currentDraft.ledger = ledger;
      state.currentDraft.userEditedLedger = true;
      state.currentDraft.ledgerConfidence = 100;
      updateEngineState();
      showToast(`Ledger updated to ${ledger} and confirmed`);
    }
  };

  const handleUpdateDraftField = async (field: keyof DocumentDraft, value: any) => {
    accountingEngine.updateDraftField(field, value);
    updateEngineState();
    try {
      await fetch('/api/documents/update-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value })
      });
    } catch {}
  };

  const handleQuickApproveAndPost = async (approverName?: string) => {
    const success = accountingEngine.quickApproveAndPost(approverName);
    if (success) {
      updateEngineState();
      showToast('⚡ Fast-Track Approved & Posted! Balanced journal committed to General Ledger');
      try {
        await fetch('/api/documents/quick-approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approverName })
        });
      } catch {}
    }
  };

  const handleCaptureCustomDraft = async (customDraft: DocumentDraft) => {
    accountingEngine.setDraft(customDraft);
    updateEngineState();
    showToast(`AI Vision ingested ${customDraft.sourceFile || customDraft.docNo}`);
  };

  const handleImportCsvDataset = async (dataset: string, rows: Record<string, string>[]) => {
    const result = accountingEngine.importCsvDataset(dataset, rows);
    updateEngineState();
    try {
      await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset, rows })
      });
    } catch {}
    return result;
  };

  // --- BULK UPLOAD & BATCH OCR ---
  const handleCreateBulkBatch = async (docType: DocumentType, files: Array<{ name: string; size: string }>) => {
    const batch = accountingEngine.createBulkBatch(docType, files);
    updateEngineState();
    showToast(`Batch OCR extracted ${files.length} ${docType} documents`);
    try {
      await fetch('/api/documents/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType, files })
      });
    } catch {}
  };

  const handlePostBulkBatch = async () => {
    const res = accountingEngine.postBulkBatch();
    updateEngineState();
    showToast(`Bulk Batch Posted! ${res.postedCount} transactions written to General Ledger`);
    try {
      await fetch('/api/documents/bulk/post', { method: 'POST' });
    } catch {}
  };

  const handleClearBulkBatch = async () => {
    accountingEngine.clearBulkBatch();
    updateEngineState();
    try {
      await fetch('/api/documents/bulk/clear', { method: 'POST' });
    } catch {}
  };

  // --- PAYABLES ---
  const handleAddBill = async (bill: any) => {
    const res = accountingEngine.addSupplierBill({
      ...bill,
      idempotencyKey: `bill-${bill.docNo}-${Date.now()}`
    });
    if (res.success) {
      updateEngineState();
      showToast(`Bill ${bill.docNo} submitted for maker-checker review`);
      try {
        await fetch('/api/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bill)
        });
      } catch {}
    } else {
      showToast(res.message);
    }
  };

  const handleApproveBill = async (index: number) => {
    const res = accountingEngine.approvePendingBill(index);
    showToast(res.message);
    updateEngineState();
    try {
      await fetch('/api/bills/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index })
      });
    } catch {}
  };

  const handleRejectBill = async (index: number) => {
    accountingEngine.rejectPendingBill(index);
    updateEngineState();
    showToast('Bill rejected and removed from queue');
    try {
      await fetch('/api/bills/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index })
      });
    } catch {}
  };

  // --- COLLECTIONS ---
  const handleRecordPromise = async (index: number, days: number) => {
    accountingEngine.recordPromise(index, days);
    updateEngineState();
    showToast(`Promise to pay in +${days} days recorded. Forecast updated.`);
    try {
      await fetch('/api/collections/promise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index, days })
      });
    } catch {}
  };

  const handleToggleDispute = async (index: number) => {
    accountingEngine.toggleDispute(index);
    updateEngineState();
    showToast('Dispute status toggled');
    try {
      await fetch('/api/collections/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index })
      });
    } catch {}
  };

  const handleSendWhatsApp = async (item: ReceivableItem) => {
    const originalIndex = state.receivables.findIndex(r => r.id === item.id);
    if (originalIndex !== -1) {
      accountingEngine.sendReminder(originalIndex);
      updateEngineState();
      showToast(`WhatsApp reminder dispatched to ${item.customer}`);
      try {
        await fetch('/api/collections/remind', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index: originalIndex })
        });
      } catch {}
    }
  };

  const handleAddInvoice = async (invoice: any) => {
    const res = accountingEngine.addSalesInvoice(invoice);
    if (res.success) {
      updateEngineState();
      showToast(`Sales invoice ${invoice.invoiceNo} posted to receivables`);
      try {
        await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoice)
        });
      } catch {}
    } else {
      showToast(res.message);
    }
  };

  // --- GST ---
  const handleResolveGst = async (index: number, action: 'accept_portal' | 'ask_supplier' | 'post_bill') => {
    accountingEngine.resolveGstRow(index, action);
    updateEngineState();
    showToast('GSTR-2B reconciliation action recorded');
    try {
      await fetch('/api/gst/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index, action })
      });
    } catch {}
  };

  const handleAddGstRow = async (row: any) => {
    const res = accountingEngine.addGstRecord(row);
    if (res.success) {
      updateEngineState();
      showToast(`GSTR-2B record added for ${row.supplier}`);
      try {
        await fetch('/api/gst/rows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row)
        });
      } catch {}
    }
  };

  // --- BANK ---
  const handleAddBankLine = async (line: any) => {
    const res = accountingEngine.addBankTransactionLine(line);
    if (res.success) {
      updateEngineState();
      showToast(`Bank transaction recorded: ${line.narration}`);
      try {
        await fetch('/api/bank/lines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(line)
        });
      } catch {}
    }
  };

  // --- BANK ---
  const handleConfirmBankLine = async (id: number) => {
    accountingEngine.reconcileBankLine(id);
    updateEngineState();
    showToast('Bank line confirmed! Cash and ledger updated');
    try {
      await fetch('/api/bank/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch {}
  };

  const handleSendToException = async (id: number) => {
    accountingEngine.sendBankLineToException(id);
    updateEngineState();
    showToast('Transaction line moved to review exception queue');
    try {
      await fetch('/api/bank/exception', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch {}
  };

  // --- BENCHMARK ---
  const handleRunBenchmark = async (count: number) => {
    const res = accountingEngine.runConcurrencyBenchmark(count);
    updateEngineState();
    showToast(`Concurrency stress test passed: ${res.effectiveTps.toLocaleString()} TPS`);
    try {
      await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count })
      });
    } catch {}
    return res;
  };

  // --- AI MUNIM ---
  const handleAskQuestion = async (question: string): Promise<AiChatMessage> => {
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const data = await res.json();
      return {
        id: `ai-${Date.now()}`,
        question: data.question,
        answer: data.answer,
        basis: data.basis,
        sources: data.sources || [],
        timestamp: data.timestamp || 'Just now'
      };
    } catch {
      return {
        id: `ai-${Date.now()}`,
        question,
        answer: `Analyzed from live ledger: Book Cash ${state.cashBalance}, Overdue Receivables ${state.receivables.filter(r => r.overdueDays > 0).length} accounts. All calculations are deterministic.`,
        basis: 'Deterministic state engine.',
        sources: ['Financial Masters'],
        timestamp: 'Just now'
      };
    }
  };

  // --- SETTINGS: COMPANY & USERS ---
  const handleUpdateCompany = async (setup: any) => {
    accountingEngine.updateCompany(setup);
    updateEngineState();
    try {
      await fetch('/api/settings/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setup)
      });
    } catch {}
  };

  const handleToggleUser = async (index: number) => {
    accountingEngine.toggleUserStatus(index);
    updateEngineState();
    try {
      await fetch('/api/settings/user/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index })
      });
    } catch {}
  };

  const handleAddUser = async (name: string, email: string, role: UserRole) => {
    accountingEngine.addUser(name, email, role);
    updateEngineState();
    try {
      await fetch('/api/settings/user/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role })
      });
    } catch {}
  };

  // --- SETTINGS: DROPDOWN MASTERS HANDLERS ---
  const handleAddAccount = async (acc: Omit<AccountMaster, 'id'>) => {
    accountingEngine.addMasterAccount(acc);
    updateEngineState();
    showToast(`Added Account Master: ${acc.code} - ${acc.name}`);
    try {
      await fetch('/api/masters/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(acc)
      });
    } catch {}
  };

  const handleToggleAccount = async (id: string) => {
    accountingEngine.toggleMasterAccount(id);
    updateEngineState();
    try {
      await fetch('/api/masters/account/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch {}
  };

  const handleAddItem = async (item: Omit<ItemMaster, 'id'>) => {
    accountingEngine.addMasterItem(item);
    updateEngineState();
    showToast(`Added Item Master: ${item.code} - ${item.description}`);
    try {
      await fetch('/api/masters/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    } catch {}
  };

  const handleToggleItem = async (id: string) => {
    accountingEngine.toggleMasterItem(id);
    updateEngineState();
    try {
      await fetch('/api/masters/item/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch {}
  };

  const handleAddTaxCode = async (tax: Omit<TaxCodeMaster, 'id'>) => {
    accountingEngine.addMasterTaxCode(tax);
    updateEngineState();
    showToast(`Added Tax Code: ${tax.name} (${tax.rate}%)`);
    try {
      await fetch('/api/masters/tax-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tax)
      });
    } catch {}
  };

  const handleToggleTaxCode = async (id: string) => {
    accountingEngine.toggleMasterTaxCode(id);
    updateEngineState();
    try {
      await fetch('/api/masters/tax-code/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch {}
  };

  const handleAddCostCentre = async (cc: Omit<CostCentreMaster, 'id'>) => {
    accountingEngine.addMasterCostCentre(cc);
    updateEngineState();
    showToast(`Added Cost Centre: ${cc.code} - ${cc.name}`);
    try {
      await fetch('/api/masters/cost-centre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cc)
      });
    } catch {}
  };

  const handleToggleCostCentre = async (id: string) => {
    accountingEngine.toggleMasterCostCentre(id);
    updateEngineState();
    try {
      await fetch('/api/masters/cost-centre/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch {}
  };

  const handleAddBankAccount = async (ba: Omit<BankAccountMaster, 'id'>) => {
    accountingEngine.addMasterBankAccount(ba);
    updateEngineState();
    showToast(`Added Bank Account: ${ba.bankName}`);
    try {
      await fetch('/api/masters/bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ba)
      });
    } catch {}
  };

  const handleToggleBankAccount = async (id: string) => {
    accountingEngine.toggleMasterBankAccount(id);
    updateEngineState();
    try {
      await fetch('/api/masters/bank-account/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch {}
  };

  const handleAddDocSeries = async (ds: Omit<DocSeriesMaster, 'id'>) => {
    accountingEngine.addMasterDocSeries(ds);
    updateEngineState();
    showToast(`Added Document Series: ${ds.docType} (${ds.prefix})`);
    try {
      await fetch('/api/masters/doc-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ds)
      });
    } catch {}
  };

  const handleToggleDocSeries = async (id: string) => {
    accountingEngine.toggleMasterDocSeries(id);
    updateEngineState();
    try {
      await fetch('/api/masters/doc-series/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch {}
  };

  const handleAddParty = async (party: Omit<PartyMaster, 'id'>) => {
    accountingEngine.addMasterParty(party);
    updateEngineState();
    showToast(`Added Party: ${party.name} (${party.partyType})`);
    try {
      await fetch('/api/masters/party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(party)
      });
    } catch {}
  };

  const handleToggleParty = async (id: string) => {
    accountingEngine.toggleMasterParty(id);
    updateEngineState();
    try {
      await fetch('/api/masters/party/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch {}
  };

  // Badge counts
  const badgeCounts = {
    pendingBills: state.pendingBills.length + (state.currentDraft?.status === 'Awaiting approval' ? 1 : 0),
    gstExceptions: state.gstRows.filter(r => ['mismatch', 'books', 'portal'].includes(r.status)).length,
    bankPending: state.bankLines.filter(b => b.status === 'pending').length,
    overdueInvoices: state.receivables.filter(r => r.overdueDays > 0 && !r.isDisputed).length
  };

  // If user is not authenticated, display role-based login redirection gateway
  if (!state.isAuthenticated) {
    return (
      <LoginPage
        availableUsers={state.users}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-100/70 font-sans text-slate-900 overflow-hidden">
      {/* Desktop / Tablet Sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          currentRole={state.currentRole}
          onSelectRole={handleSelectRole}
          onLogout={handleLogout}
          badgeCounts={badgeCounts}
        />
      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Bar */}
        <TopBar
          currentTab={currentTab}
          tabTitle={TAB_TITLES[currentTab] || 'Dashboard'}
          currentRole={state.currentRole}
          currentUser={state.currentUser}
          companyName={state.company.legalName || 'CEO ITBox Pvt Ltd'}
          onSelectRole={handleSelectRole}
          onLogout={handleLogout}
          onOpenMobileMenu={() => setMobileDrawerOpen(true)}
          onOpenAddBill={() => setIsAddBillOpen(true)}
          onOpenAddInvoice={() => setIsAddInvoiceOpen(true)}
          onOpenAi={() => setCurrentTab('ai')}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'overview' && (
              <OverviewView
                state={state}
                onNavigateTab={setCurrentTab}
                onOpenAddBill={() => setIsAddBillOpen(true)}
                onOpenAddInvoice={() => setIsAddInvoiceOpen(true)}
              />
            )}
            {currentTab === 'reports' && (
              <VisualReportsView state={state} />
            )}
            {currentTab === 'capture' && (
              <CaptureApproveView
                state={state}
                onCaptureSample={handleCaptureSample}
                onSubmitForApproval={handleSubmitDraft}
                onApproveAndPost={handleApproveDraft}
                onClearDraft={handleClearDraft}
                onUpdateDraftLedger={handleUpdateDraftLedger}
                onUpdateDraftField={handleUpdateDraftField}
                onQuickApproveAndPost={handleQuickApproveAndPost}
                onCaptureCustomDraft={handleCaptureCustomDraft}
                onCreateBulkBatch={handleCreateBulkBatch}
                onPostBulkBatch={handlePostBulkBatch}
                onClearBulkBatch={handleClearBulkBatch}
              />
            )}
            {currentTab === 'bulk-csv' && (
              <BulkCsvUploadView
                state={state}
                onImportDataset={handleImportCsvDataset}
                onShowToast={showToast}
              />
            )}
            {currentTab === 'payables' && (
              <PayablesView
                state={state}
                onOpenAddBill={() => setIsAddBillOpen(true)}
                onApproveBill={handleApproveBill}
                onRejectBill={handleRejectBill}
              />
            )}
            {currentTab === 'collections' && (
              <CollectionsView
                state={state}
                onOpenWhatsApp={item => setWhatsAppTarget(item)}
                onRecordPromise={handleRecordPromise}
                onToggleDispute={handleToggleDispute}
                onOpenAddInvoice={() => setIsAddInvoiceOpen(true)}
              />
            )}
            {currentTab === 'gst' && (
              <GstWorkspaceView
                state={state}
                onResolveGst={handleResolveGst}
                onNavigateToCapture={() => setCurrentTab('capture')}
                onAddGstRecord={handleAddGstRow}
              />
            )}
            {currentTab === 'bank' && (
              <BankReconciliationView
                state={state}
                onConfirmBankLine={handleConfirmBankLine}
                onSendToException={handleSendToException}
                onAddBankLine={handleAddBankLine}
              />
            )}
            {currentTab === 'cash' && (
              <CashForecastView state={state} />
            )}
            {currentTab === 'ai' && (
              <AiMunimView state={state} onAskQuestion={handleAskQuestion} />
            )}
            {currentTab === 'settings' && (
              <SettingsView
                state={state}
                onUpdateCompany={handleUpdateCompany}
                onToggleUser={handleToggleUser}
                onAddUser={handleAddUser}
                onRunBenchmark={handleRunBenchmark}
                onAddAccount={handleAddAccount}
                onToggleAccount={handleToggleAccount}
                onAddItem={handleAddItem}
                onToggleItem={handleToggleItem}
                onAddTaxCode={handleAddTaxCode}
                onToggleTaxCode={handleToggleTaxCode}
                onAddCostCentre={handleAddCostCentre}
                onToggleCostCentre={handleToggleCostCentre}
                onAddBankAccount={handleAddBankAccount}
                onToggleBankAccount={handleToggleBankAccount}
                onAddDocSeries={handleAddDocSeries}
                onToggleDocSeries={handleToggleDocSeries}
                onAddParty={handleAddParty}
                onToggleParty={handleToggleParty}
              />
            )}
          </div>
        </main>

        {/* Mobile Smartphone Navigation */}
        <MobileNav
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          currentRole={state.currentRole}
          onSelectRole={handleSelectRole}
          onLogout={handleLogout}
          isOpenDrawer={mobileDrawerOpen}
          onCloseDrawer={() => setMobileDrawerOpen(false)}
        />
      </div>

      {/* WhatsApp Modal */}
      <WhatsAppModal
        item={whatsAppTarget}
        onClose={() => setWhatsAppTarget(null)}
        onSend={handleSendWhatsApp}
      />

      {/* Add Supplier Bill Modal */}
      <AddBillModal
        isOpen={isAddBillOpen}
        onClose={() => setIsAddBillOpen(false)}
        onSubmit={handleAddBill}
        existingDocNos={[...state.payables.map(p => p.id), ...state.pendingBills.map(p => p.docNo)]}
      />

      {/* Add Real Customer Sales Invoice Modal */}
      <AddInvoiceModal
        isOpen={isAddInvoiceOpen}
        onClose={() => setIsAddInvoiceOpen(false)}
        onSubmit={handleAddInvoice}
        existingInvoiceNos={state.receivables.map(r => r.id)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 max-w-md w-max animate-fade-in"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
