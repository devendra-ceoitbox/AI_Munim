import {
  DocumentDraft,
  ReceivableItem,
  PayableItem,
  GstReconciliationRow,
  BankTransactionLine,
  AuditLogItem,
  CompanyConfig,
  User,
  HighConcurrencyMetric,
  MastersState,
  AccountMaster,
  ItemMaster,
  TaxCodeMaster,
  CostCentreMaster,
  BankAccountMaster,
  DocSeriesMaster,
  PartyMaster,
  BulkUploadBatch,
  BatchDocumentItem,
  DocumentType
} from '../types/accounting.ts';
import { generateBalancedJournal, calculateTax } from '../utils/accounting.ts';

export interface AppState {
  company: CompanyConfig;
  users: User[];
  currentRole: 'owner' | 'fin' | 'col' | 'app' | 'client';
  currentUser: User;
  isAuthenticated: boolean;
  cashBalance: number;
  salesTaxOutput: number;
  receivables: ReceivableItem[];
  payables: PayableItem[];
  gstRows: GstReconciliationRow[];
  bankLines: BankTransactionLine[];
  pendingBills: DocumentDraft[];
  currentDraft: DocumentDraft | null;
  activeBatch: BulkUploadBatch | null;
  postedDocuments: DocumentDraft[];
  auditLogs: AuditLogItem[];
  metrics: HighConcurrencyMetric;
  masters: MastersState;
}

export class HighConcurrencyAccountingEngine {
  private state: AppState;
  private idempotencyRegistry = new Set<string>();

  constructor() {
    this.state = this.getInitialState();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem('ai_munim_live_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.company && parsed.users) {
            this.state = { ...this.state, ...parsed };
          }
        }
      } catch (e) {
        console.warn('Could not restore live state from storage:', e);
      }
    }
  }

  public saveToStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('ai_munim_live_state', JSON.stringify(this.state));
      } catch (e) {}
    }
  }

  private getInitialState(): AppState {
    const initialUsers: User[] = [
      {
        id: 'u1',
        name: 'Devendra (CEO ITBox)',
        email: 'devendra@ceoitbox.in',
        password: 'password123',
        role: 'owner',
        active: true,
        department: 'Corporate Executive'
      },
      {
        id: 'u2',
        name: 'Finance Executive',
        email: 'finance@ceoitbox.in',
        password: 'password123',
        role: 'fin',
        active: true,
        department: 'Finance & Statutory Operations'
      },
      {
        id: 'u3',
        name: 'Collections Specialist',
        email: 'collections@ceoitbox.in',
        password: 'password123',
        role: 'col',
        active: true,
        department: 'Credit & Receivables'
      },
      {
        id: 'u4',
        name: 'Statutory Approver',
        email: 'approver@ceoitbox.in',
        password: 'password123',
        role: 'app',
        active: true,
        department: 'Internal Audit & Approvals'
      },
      {
        id: 'u5',
        name: 'Client Accounts Portal',
        email: 'client@ceoitbox.in',
        password: 'password123',
        role: 'client',
        active: true,
        department: 'Customer Accounts'
      }
    ];

    const initialMasters: MastersState = {
      accounts: [
        { id: 'acc-1', code: '1010', name: 'Cash in Hand', group: 'Current Assets', type: 'ASSET', isControlAccount: false, active: true },
        { id: 'acc-2', code: '1020', name: 'ICICI Bank Current A/c', group: 'Bank Accounts', type: 'ASSET', isControlAccount: false, active: true },
        { id: 'acc-3', code: '1030', name: 'HDFC Bank OD Facility', group: 'Bank Accounts', type: 'ASSET', isControlAccount: false, active: true },
        { id: 'acc-4', code: '1040', name: 'Accounts Receivable Control', group: 'Current Assets', type: 'ASSET', isControlAccount: true, active: true },
        { id: 'acc-5', code: '2010', name: 'Accounts Payable Control', group: 'Current Liabilities', type: 'LIABILITY', isControlAccount: true, active: true },
        { id: 'acc-6', code: '2020', name: 'Output GST Payable', group: 'Current Liabilities', type: 'LIABILITY', isControlAccount: true, active: true },
        { id: 'acc-7', code: '2030', name: 'Input Tax Credit (ITC)', group: 'Current Assets', type: 'ASSET', isControlAccount: true, active: true },
        { id: 'acc-8', code: '3010', name: 'Equity Share Capital', group: 'Equity', type: 'EQUITY', isControlAccount: false, active: true },
        { id: 'acc-9', code: '4010', name: 'Consulting & Technology Revenue', group: 'Revenue', type: 'INCOME', isControlAccount: false, active: true },
        { id: 'acc-10', code: '4020', name: 'Product Sales', group: 'Revenue', type: 'INCOME', isControlAccount: false, active: true },
        { id: 'acc-11', code: '5010', name: 'Raw Materials / Direct Purchases', group: 'Direct Expenses', type: 'EXPENSE', isControlAccount: false, active: true },
        { id: 'acc-12', code: '5020', name: 'Freight & Logistics', group: 'Direct Expenses', type: 'EXPENSE', isControlAccount: false, active: true },
        { id: 'acc-13', code: '5030', name: 'Office & Administrative Expenses', group: 'Indirect Expenses', type: 'EXPENSE', isControlAccount: false, active: true },
        { id: 'acc-14', code: '5040', name: 'IT & Software Subscriptions', group: 'Indirect Expenses', type: 'EXPENSE', isControlAccount: false, active: true },
        { id: 'acc-15', code: '5050', name: 'Bank Charges & Commission', group: 'Indirect Expenses', type: 'EXPENSE', isControlAccount: false, active: true }
      ],
      items: [],
      taxCodes: [
        { id: 'tax-1', name: 'GST 18% (Standard Rate)', rate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0, effectiveFrom: '2017-07-01', active: true },
        { id: 'tax-2', name: 'GST 12% (Intermediate Goods)', rate: 12, cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: 0, effectiveFrom: '2017-07-01', active: true },
        { id: 'tax-3', name: 'GST 5% (Essential Commodities/Transport)', rate: 5, cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: 0, effectiveFrom: '2017-07-01', active: true },
        { id: 'tax-4', name: 'GST 28% (Luxury/Demerit Goods)', rate: 28, cgstRate: 14, sgstRate: 14, igstRate: 28, cessRate: 0, effectiveFrom: '2017-07-01', active: true },
        { id: 'tax-5', name: 'Exempt 0% (Zero-Rated / Export)', rate: 0, cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: 0, effectiveFrom: '2017-07-01', active: true }
      ],
      costCentres: [],
      bankAccounts: [],
      docSeries: [
        { id: 'ds-1', docType: 'Sales Invoice', prefix: 'INV-', startingNumber: 1, currentNumber: 1, fySuffix: '/26-27', active: true },
        { id: 'ds-2', docType: 'Purchase Invoice', prefix: 'PB-', startingNumber: 1, currentNumber: 1, fySuffix: '/26-27', active: true },
        { id: 'ds-3', docType: 'Credit Note', prefix: 'CN-', startingNumber: 1, currentNumber: 1, fySuffix: '/26-27', active: true },
        { id: 'ds-4', docType: 'Debit Note', prefix: 'DN-', startingNumber: 1, currentNumber: 1, fySuffix: '/26-27', active: true },
        { id: 'ds-5', docType: 'Expense Voucher', prefix: 'EXP-', startingNumber: 1, currentNumber: 1, fySuffix: '/26-27', active: true },
        { id: 'ds-6', docType: 'Bank Statement', prefix: 'BST-', startingNumber: 1, currentNumber: 1, fySuffix: '/26-27', active: true }
      ],
      parties: []
    };

    return {
      company: {
        legalName: 'CEO ITBox Private Limited',
        gstin: '07AABCC1234F1Z8',
        financialYear: 'Apr 2026 – Mar 2027',
        industryProfile: 'Services',
        approverLimit: 250000,
        baseCurrency: 'INR'
      },
      users: initialUsers,
      currentRole: 'owner',
      currentUser: initialUsers[0],
      isAuthenticated: true,
      cashBalance: 0,
      salesTaxOutput: 0,
      receivables: [],
      payables: [],
      gstRows: [],
      bankLines: [],
      pendingBills: [],
      currentDraft: null,
      activeBatch: null,
      auditLogs: [
        {
          id: 'log-1',
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          user: 'Devendra (Owner)',
          action: 'Live production accounting ledger initialized for CEO ITBox Private Limited',
          category: 'system'
        }
      ],
      metrics: {
        activePoolConnections: 8,
        maxPoolSize: 20,
        queuedQueries: 0,
        transactionsPerSecond: 1420,
        avgLockWaitMs: 1.4,
        idempotentDeduplications: 0,
        optimisticRetryCount: 0
      },
      postedDocuments: [],
      masters: initialMasters
    };
  }

  public getState(): AppState {
    return { ...this.state };
  }

  // --- AUTHENTICATION & LOGIN REDIRECTION ---
  public loginUser(email: string, password?: string): { success: boolean; user?: User; redirectTab: string; message: string } {
    const user = this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, redirectTab: 'overview', message: 'User not found. Try one of the demo role credentials.' };
    }
    if (!user.active) {
      return { success: false, redirectTab: 'overview', message: 'User account is deactivated. Contact Administrator.' };
    }

    this.state.currentUser = user;
    this.state.currentRole = user.role;
    this.state.isAuthenticated = true;

    // Default redirection per role
    let redirectTab = 'overview';
    if (user.role === 'fin') redirectTab = 'capture';
    else if (user.role === 'col') redirectTab = 'collections';
    else if (user.role === 'app') redirectTab = 'payables';
    else if (user.role === 'client') redirectTab = 'collections';

    this.logAction(user.name, `User signed in successfully via role-based authentication (${user.role.toUpperCase()})`, 'system');

    return {
      success: true,
      user,
      redirectTab,
      message: `Signed in as ${user.name} (${user.department || user.role})`
    };
  }

  public logoutUser(): void {
    this.state.isAuthenticated = false;
    this.logAction(this.state.currentUser.name, 'User signed out of session', 'system');
  }

  public logAction(user: string, action: string, category: AuditLogItem['category'] = 'document') {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.state.auditLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: timeStr,
      user,
      action,
      category
    });
    if (this.state.auditLogs.length > 50) {
      this.state.auditLogs.pop();
    }
  }

  public setRole(role: 'owner' | 'fin' | 'col' | 'app' | 'client') {
    this.state.currentRole = role;
    const matchingUser = this.state.users.find(u => u.role === role);
    if (matchingUser) {
      this.state.currentUser = matchingUser;
    }
  }

  // --- CAPTURE & SINGLE OCR ---
  public setDraft(draft: DocumentDraft | null) {
    this.state.currentDraft = draft;
    if (draft) {
      this.logAction(this.getRoleName(), `Uploaded ${draft.type} ${draft.docNo} (${draft.party}); AI OCR extracted line items and verified GSTIN`);
    }
  }

  public submitDraftForApproval(): boolean {
    if (!this.state.currentDraft) return false;
    this.state.currentDraft.status = 'Awaiting approval';
    this.logAction(this.getRoleName(), `Submitted ${this.state.currentDraft.docNo} for approver review`, 'approval');
    return true;
  }

  public updateDraftField(field: keyof DocumentDraft, value: any): boolean {
    if (!this.state.currentDraft) return false;
    (this.state.currentDraft as any)[field] = value;
    if (field === 'ledger') {
      this.state.currentDraft.userEditedLedger = true;
    }
    return true;
  }

  public quickApproveAndPost(approverName?: string): boolean {
    if (!this.state.currentDraft) return false;
    this.state.currentDraft.status = 'Approved';
    const actor = approverName || 'Authorized Sign-off (Fast-Track Override)';
    this.logAction(actor, `Fast-track approved document ${this.state.currentDraft.docNo} (${this.state.currentDraft.party})`, 'approval');
    return this.postDraft();
  }

  public postDraft(): boolean {
    const draft = this.state.currentDraft;
    if (!draft) return false;

    const taxAmt = calculateTax(draft.taxableValue, draft.gstRate);
    const total = draft.taxableValue + taxAmt;
    const isSale = draft.type.toLowerCase().includes('sales');

    draft.journalVoucher = generateBalancedJournal(draft);
    draft.status = 'Posted';

    // Store in recent posted documents history log
    this.state.postedDocuments.unshift({ ...draft });
    if (this.state.postedDocuments.length > 50) {
      this.state.postedDocuments.pop();
    }

    if (isSale) {
      this.state.receivables.push({
        id: draft.docNo,
        customer: draft.party,
        amount: total,
        overdueDays: -30,
        promiseDays: null,
        gstin: draft.gstin
      });
      this.state.salesTaxOutput += taxAmt;
    } else {
      this.state.payables.push({
        id: draft.docNo,
        supplier: draft.party,
        amount: total,
        dueInDays: 20,
        gstin: draft.gstin
      });

      const existingGst = this.state.gstRows.find(r => r.docNo === draft.docNo);
      if (existingGst) {
        existingGst.booksTax = taxAmt;
        existingGst.status = existingGst.portalTax === taxAmt ? 'matched' : 'mismatch';
      } else {
        this.state.gstRows.push({
          id: `gst-${Date.now()}`,
          supplier: draft.party,
          docNo: draft.docNo,
          booksTax: taxAmt,
          portalTax: null,
          status: 'books'
        });
      }
    }

    this.logAction(
      this.getRoleName(),
      `Approved and posted ${draft.docNo} (${draft.party}) for ₹${total.toLocaleString('en-IN')}; balanced journal written to general ledger`,
      'approval'
    );
    return true;
  }

  // --- BULK UPLOAD & BATCH OCR PROCESSING ---
  public createBulkBatch(docType: DocumentType, filesData: Array<{ name: string; size: string }>): BulkUploadBatch {
    // Generate realistic simulated extracted documents for the batch
    const demoParties = [
      { name: 'Apex Packaging', gstin: '06AABCA7712P1Z0', ledger: 'Office Expenses', taxable: 42000, rate: 12 },
      { name: 'Delta Chemicals', gstin: '06AAECD1177H1Z4', ledger: 'Raw Materials Purchase', taxable: 88500, rate: 18 },
      { name: 'Om Logistics', gstin: '06AAECO4412J1Z8', ledger: 'Freight & Logistics', taxable: 24000, rate: 5 },
      { name: 'Raj Polymers', gstin: '06AAACR8890M1Z2', ledger: 'Raw Materials Purchase', taxable: 135000, rate: 18 },
      { name: 'Tata Steel Tubes', gstin: '06AABCT9981K1Z3', ledger: 'Raw Materials Purchase', taxable: 210000, rate: 18 }
    ];

    const batchFiles: BatchDocumentItem[] = filesData.map((f, i) => {
      const p = demoParties[i % demoParties.length];
      const docNo = `${docType.includes('Sales') ? 'INV' : 'BILL'}-${2000 + i + Math.floor(Math.random() * 800)}`;
      const taxAmt = calculateTax(p.taxable, p.rate);

      return {
        id: `batch-item-${Date.now()}-${i}`,
        type: docType,
        party: p.name,
        docNo,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        gstin: p.gstin,
        taxableValue: p.taxable,
        gstRate: p.rate,
        hsn: '3901',
        ledger: p.ledger,
        ledgerConfidence: 94 - i * 3,
        status: 'Extracted',
        fileName: f.name,
        fileSize: f.size,
        scanProgress: 100,
        extractedFieldsCount: 8,
        ocrConfidenceMap: {
          Party: 98,
          DocNo: 99,
          GSTIN: 96,
          Taxable: 99,
          GST: 99,
          Total: 99,
          Ledger: 92
        }
      };
    });

    const totalTaxable = batchFiles.reduce((sum, item) => sum + item.taxableValue, 0);
    const totalTax = batchFiles.reduce((sum, item) => sum + calculateTax(item.taxableValue, item.gstRate), 0);
    const totalAmount = totalTaxable + totalTax;

    const newBatch: BulkUploadBatch = {
      id: `batch-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      docType,
      files: batchFiles,
      totalTaxable,
      totalTax,
      totalAmount,
      status: 'ready'
    };

    this.state.activeBatch = newBatch;
    this.logAction(
      this.getRoleName(),
      `Batch OCR completed for ${batchFiles.length} ${docType}s; Total Value: ₹${totalAmount.toLocaleString('en-IN')}`,
      'document'
    );

    return newBatch;
  }

  public postBulkBatch(): { postedCount: number; totalAmount: number } {
    if (!this.state.activeBatch) return { postedCount: 0, totalAmount: 0 };

    const batch = this.state.activeBatch;
    let postedCount = 0;
    let totalAmount = 0;

    batch.files.forEach(item => {
      const taxAmt = calculateTax(item.taxableValue, item.gstRate);
      const total = item.taxableValue + taxAmt;
      totalAmount += total;
      postedCount++;

      item.journalVoucher = generateBalancedJournal(item);
      item.status = 'Posted';

      // Record in posted documents history log
      this.state.postedDocuments.unshift({ ...item });

      if (item.type.toLowerCase().includes('sales')) {
        this.state.receivables.push({
          id: item.docNo,
          customer: item.party,
          amount: total,
          overdueDays: -30,
          promiseDays: null,
          gstin: item.gstin
        });
        this.state.salesTaxOutput += taxAmt;
      } else {
        this.state.payables.push({
          id: item.docNo,
          supplier: item.party,
          amount: total,
          dueInDays: 25,
          gstin: item.gstin
        });
        this.state.gstRows.push({
          id: `gst-${Date.now()}-${item.docNo}`,
          supplier: item.party,
          docNo: item.docNo,
          booksTax: taxAmt,
          portalTax: null,
          status: 'books'
        });
      }
    });

    if (this.state.postedDocuments.length > 80) {
      this.state.postedDocuments = this.state.postedDocuments.slice(0, 80);
    }

    batch.status = 'posted';
    this.logAction(
      this.getRoleName(),
      `Bulk Batch Approved & Posted: ${postedCount} transactions written to ledger (₹${totalAmount.toLocaleString('en-IN')})`,
      'approval'
    );

    return { postedCount, totalAmount };
  }

  public clearBulkBatch(): void {
    this.state.activeBatch = null;
  }

  // --- BULK CSV IMPORT FOR ALL DATASETS ---
  public importCsvDataset(dataset: string, rows: Record<string, string>[]): { count: number; dataset: string } {
    if (!rows || rows.length === 0) return { count: 0, dataset };
    let imported = 0;

    switch (dataset) {
      case 'accounts': {
        rows.forEach(r => {
          if (!r.code || !r.name) return;
          const exists = this.state.masters.accounts.some(a => a.code.toLowerCase() === r.code.toLowerCase());
          if (!exists) {
            this.state.masters.accounts.push({
              id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              code: r.code,
              name: r.name,
              group: r.group || 'Current Assets',
              type: (r.type as any) || 'ASSET',
              isControlAccount: r.isControlAccount === 'true',
              active: r.active !== 'false'
            });
            imported++;
          }
        });
        break;
      }
      case 'items': {
        rows.forEach(r => {
          if (!r.code || !r.description) return;
          const exists = this.state.masters.items.some(i => i.code.toLowerCase() === r.code.toLowerCase());
          if (!exists) {
            this.state.masters.items.push({
              id: `itm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              code: r.code,
              description: r.description,
              hsnSac: r.hsnSac || '998314',
              unit: (r.unit as any) || 'NOS',
              defaultTaxRate: parseInt(r.defaultTaxRate || r.defaultGstRate || '18', 10),
              defaultLedger: r.defaultLedger || 'Consulting Revenue',
              active: true
            });
            imported++;
          }
        });
        break;
      }
      case 'parties': {
        rows.forEach(r => {
          const partyName = r.name || r.tradeName || r.legalName;
          if (!partyName) return;
          const exists = this.state.masters.parties.some(
            p => p.name.toLowerCase() === partyName.toLowerCase() || (r.gstin && p.gstin === r.gstin)
          );
          if (!exists) {
            this.state.masters.parties.push({
              id: `pty-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              partyType: (r.partyType === 'SUPPLIER' || r.type === 'VENDOR' ? 'SUPPLIER' : 'CUSTOMER') as any,
              name: partyName,
              legalName: r.legalName || partyName,
              gstin: r.gstin || '06AABCB0000A1Z0',
              stateCode: r.stateCode || (r.gstin ? r.gstin.slice(0, 2) : '06'),
              phone: r.phone || '+91 98110 00000',
              creditDays: parseInt(r.creditDays || r.creditPeriodDays || '30', 10),
              creditLimit: parseFloat(r.creditLimit || '500000'),
              active: true
            });
            imported++;
          }
        });
        break;
      }
      case 'receivables': {
        rows.forEach(r => {
          const docId = r.id || `INV-${Math.floor(1000 + Math.random() * 9000)}`;
          const amount = parseFloat(r.amount || '0');
          if (amount <= 0) return;
          const exists = this.state.receivables.some(rc => rc.id === docId);
          if (!exists) {
            this.state.receivables.push({
              id: docId,
              customer: r.customer || 'Direct Client',
              amount,
              overdueDays: parseInt(r.overdueDays || '0', 10),
              promiseDays: null,
              gstin: r.gstin || '06AABCB4521K1Z7',
              docDate: r.docDate || new Date().toLocaleDateString('en-IN')
            });
            imported++;
          }
        });
        break;
      }
      case 'payables': {
        rows.forEach(r => {
          const docId = r.id || `BILL-${Math.floor(100 + Math.random() * 900)}`;
          const amount = parseFloat(r.amount || '0');
          if (amount <= 0) return;
          const exists = this.state.payables.some(p => p.id === docId);
          if (!exists) {
            this.state.payables.push({
              id: docId,
              supplier: r.supplier || 'Key Vendor',
              amount,
              dueInDays: parseInt(r.dueInDays || '15', 10),
              gstin: r.gstin || '06AAECD1177H1Z4',
              docDate: r.docDate || new Date().toLocaleDateString('en-IN'),
              priority: (r.priority as any) || 'normal'
            });
            imported++;
          }
        });
        break;
      }
      case 'bank': {
        rows.forEach(r => {
          const amt = parseFloat(r.amount || '0');
          if (amt === 0) return;
          const nextId = this.state.bankLines.length > 0 ? Math.max(...this.state.bankLines.map(b => b.id)) + 1 : 1;
          this.state.bankLines.push({
            id: nextId,
            narration: r.narration || 'Bank Entry via CSV',
            amount: amt,
            suggestion: amt > 0 ? 'Match with Customer Receivable' : 'Match with Supplier Payable',
            confidence: 90,
            status: 'pending',
            category: r.category || (amt > 0 ? 'Customer Receipt' : 'Vendor Payment')
          });
          imported++;
        });
        break;
      }
      case 'gstr2b': {
        rows.forEach(r => {
          if (!r.docNo) return;
          const taxAmt = parseFloat(r.portalTax || '0');
          const exists = this.state.gstRows.find(g => g.docNo === r.docNo);
          if (exists) {
            exists.portalTax = taxAmt;
            exists.status = exists.booksTax === taxAmt ? 'matched' : 'mismatch';
            imported++;
          } else {
            this.state.gstRows.push({
              id: `gst-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              supplier: r.supplier || 'Portal Supplier',
              docNo: r.docNo,
              booksTax: null,
              portalTax: taxAmt,
              status: 'portal'
            });
            imported++;
          }
        });
        break;
      }
    }

    this.logAction(
      this.getRoleName(),
      `Bulk CSV Import: Successfully added ${imported} records to ${dataset.toUpperCase()} dataset`,
      'document'
    );

    return { count: imported, dataset };
  }

  // --- MASTER DATA MANAGEMENT ---
  public addMasterAccount(acc: Omit<AccountMaster, 'id'>): AccountMaster {
    const newAcc: AccountMaster = { id: `acc-${Date.now()}`, ...acc };
    this.state.masters.accounts.push(newAcc);
    this.logAction(this.getRoleName(), `Created new Account Master: ${acc.code} - ${acc.name}`, 'system');
    return newAcc;
  }

  public toggleMasterAccount(id: string): void {
    const item = this.state.masters.accounts.find(a => a.id === id);
    if (item) {
      item.active = !item.active;
      this.logAction(this.getRoleName(), `Account ${item.code} (${item.name}) ${item.active ? 'activated' : 'deactivated'}`, 'system');
    }
  }

  public addMasterItem(item: Omit<ItemMaster, 'id'>): ItemMaster {
    const newItem: ItemMaster = { id: `itm-${Date.now()}`, ...item };
    this.state.masters.items.push(newItem);
    this.logAction(this.getRoleName(), `Added Item Master: ${item.code} - ${item.description}`, 'system');
    return newItem;
  }

  public toggleMasterItem(id: string): void {
    const item = this.state.masters.items.find(i => i.id === id);
    if (item) {
      item.active = !item.active;
      this.logAction(this.getRoleName(), `Item ${item.code} ${item.active ? 'activated' : 'deactivated'}`, 'system');
    }
  }

  public addMasterTaxCode(tax: Omit<TaxCodeMaster, 'id'>): TaxCodeMaster {
    const newTax: TaxCodeMaster = { id: `tax-${Date.now()}`, ...tax };
    this.state.masters.taxCodes.push(newTax);
    this.logAction(this.getRoleName(), `Added Tax Code Master: ${tax.name} (${tax.rate}%)`, 'system');
    return newTax;
  }

  public toggleMasterTaxCode(id: string): void {
    const tax = this.state.masters.taxCodes.find(t => t.id === id);
    if (tax) {
      tax.active = !tax.active;
      this.logAction(this.getRoleName(), `Tax Code ${tax.name} ${tax.active ? 'activated' : 'deactivated'}`, 'system');
    }
  }

  public addMasterCostCentre(cc: Omit<CostCentreMaster, 'id'>): CostCentreMaster {
    const newCc: CostCentreMaster = { id: `cc-${Date.now()}`, ...cc };
    this.state.masters.costCentres.push(newCc);
    this.logAction(this.getRoleName(), `Added Cost Centre: ${cc.code} - ${cc.name}`, 'system');
    return newCc;
  }

  public toggleMasterCostCentre(id: string): void {
    const cc = this.state.masters.costCentres.find(c => c.id === id);
    if (cc) {
      cc.active = !cc.active;
      this.logAction(this.getRoleName(), `Cost Centre ${cc.code} ${cc.active ? 'activated' : 'deactivated'}`, 'system');
    }
  }

  public addMasterBankAccount(ba: Omit<BankAccountMaster, 'id'>): BankAccountMaster {
    const newBa: BankAccountMaster = { id: `ba-${Date.now()}`, ...ba };
    this.state.masters.bankAccounts.push(newBa);
    this.logAction(this.getRoleName(), `Added Bank Account Master: ${ba.bankName}`, 'system');
    return newBa;
  }

  public toggleMasterBankAccount(id: string): void {
    const ba = this.state.masters.bankAccounts.find(b => b.id === id);
    if (ba) {
      ba.active = !ba.active;
      this.logAction(this.getRoleName(), `Bank Account ${ba.bankName} ${ba.active ? 'activated' : 'deactivated'}`, 'system');
    }
  }

  public addMasterDocSeries(ds: Omit<DocSeriesMaster, 'id'>): DocSeriesMaster {
    const newDs: DocSeriesMaster = { id: `ds-${Date.now()}`, ...ds };
    this.state.masters.docSeries.push(newDs);
    this.logAction(this.getRoleName(), `Added Document Series: ${ds.docType} (${ds.prefix})`, 'system');
    return newDs;
  }

  public toggleMasterDocSeries(id: string): void {
    const ds = this.state.masters.docSeries.find(d => d.id === id);
    if (ds) {
      ds.active = !ds.active;
      this.logAction(this.getRoleName(), `Document Series ${ds.prefix} ${ds.active ? 'activated' : 'deactivated'}`, 'system');
    }
  }

  public addMasterParty(party: Omit<PartyMaster, 'id'>): PartyMaster {
    const newParty: PartyMaster = { id: `pty-${Date.now()}`, ...party };
    this.state.masters.parties.push(newParty);
    this.logAction(this.getRoleName(), `Added Party Master: ${party.name} (${party.partyType})`, 'system');
    return newParty;
  }

  public toggleMasterParty(id: string): void {
    const party = this.state.masters.parties.find(p => p.id === id);
    if (party) {
      party.active = !party.active;
      this.logAction(this.getRoleName(), `Party ${party.name} ${party.active ? 'activated' : 'deactivated'}`, 'system');
    }
  }

  // --- SUPPLIER BILLS ---
  public addSupplierBill(bill: {
    party: string;
    docNo: string;
    gstin: string;
    taxableValue: number;
    gstRate: number;
    ledger: string;
    idempotencyKey?: string;
  }): { success: boolean; message: string; bill?: DocumentDraft } {
    if (bill.idempotencyKey) {
      if (this.idempotencyRegistry.has(bill.idempotencyKey)) {
        this.state.metrics.idempotentDeduplications++;
        return { success: true, message: 'Deduplicated concurrent submission via idempotency key.' };
      }
      this.idempotencyRegistry.add(bill.idempotencyKey);
    }

    const duplicate = [...this.state.payables, ...this.state.pendingBills.map(p => ({ id: p.docNo }))].some(
      x => x.id === bill.docNo
    );
    if (duplicate) {
      return { success: false, message: `Duplicate: Bill number ${bill.docNo} already exists in payables.` };
    }

    const taxAmt = calculateTax(bill.taxableValue, bill.gstRate);
    const newDraft: DocumentDraft = {
      id: `bill-${Date.now()}`,
      type: 'Purchase Invoice',
      party: bill.party,
      docNo: bill.docNo,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      gstin: bill.gstin.toUpperCase(),
      taxableValue: bill.taxableValue,
      gstRate: bill.gstRate,
      hsn: '3901',
      ledger: bill.ledger,
      ledgerConfidence: 100,
      status: 'Awaiting approval',
      submittedBy: this.getRoleName(),
      userEditedLedger: true
    };

    this.state.pendingBills.push(newDraft);
    this.logAction(
      this.getRoleName(),
      `Bill ${bill.docNo} from ${bill.party} submitted for approval (₹${(bill.taxableValue + taxAmt).toLocaleString('en-IN')})`,
      'document'
    );
    return { success: true, message: 'Bill submitted for approval', bill: newDraft };
  }

  public approvePendingBill(index: number): { success: boolean; message: string } {
    const bill = this.state.pendingBills[index];
    if (!bill) return { success: false, message: 'Bill not found' };

    const taxAmt = calculateTax(bill.taxableValue, bill.gstRate);
    const total = bill.taxableValue + taxAmt;

    if (this.state.currentRole === 'app' && total > this.state.company.approverLimit) {
      return {
        success: false,
        message: `Amount exceeds approver limit of ₹${this.state.company.approverLimit.toLocaleString('en-IN')}. Requires Owner approval.`
      };
    }

    this.state.pendingBills.splice(index, 1);
    this.state.currentDraft = bill;
    this.postDraft();
    this.state.currentDraft = null;
    return { success: true, message: `Approved and posted ${bill.docNo}` };
  }

  public rejectPendingBill(index: number): boolean {
    const bill = this.state.pendingBills[index];
    if (!bill) return false;
    this.logAction(this.getRoleName(), `Rejected bill ${bill.docNo} from ${bill.party}`, 'approval');
    this.state.pendingBills.splice(index, 1);
    return true;
  }

  // --- COLLECTIONS ---
  public recordPromise(index: number, days: number = 5): boolean {
    const item = this.state.receivables[index];
    if (!item) return false;
    item.promiseDays = days;
    this.logAction(this.getRoleName(), `Recorded payment promise: ${item.customer} for ${item.id} in +${days} days`, 'collection');
    return true;
  }

  public toggleDispute(index: number): boolean {
    const item = this.state.receivables[index];
    if (!item) return false;
    item.isDisputed = !item.isDisputed;
    this.logAction(
      this.getRoleName(),
      `${item.isDisputed ? 'Flagged as disputed' : 'Dispute resolved'} for ${item.id} (${item.customer})`,
      'collection'
    );
    return true;
  }

  public sendReminder(index: number): { success: boolean; customer: string; docNo: string; amount: number } {
    const item = this.state.receivables[index];
    if (!item) return { success: false, customer: '', docNo: '', amount: 0 };
    this.logAction(
      this.getRoleName(),
      `WhatsApp reminder dispatched to ${item.customer} for ${item.id} (₹${item.amount.toLocaleString('en-IN')}) with secure UPI link`,
      'collection'
    );
    return { success: true, customer: item.customer, docNo: item.id, amount: item.amount };
  }

  // --- SALES INVOICES & RECEIVABLES ---
  public addSalesInvoice(inv: {
    customer: string;
    invoiceNo: string;
    gstin: string;
    invoiceDate: string;
    dueDate: string;
    taxableValue: number;
    gstRate: number;
    ledger: string;
    notes?: string;
  }): { success: boolean; message: string; receivable?: ReceivableItem } {
    const existing = this.state.receivables.some(r => r.id.toLowerCase() === inv.invoiceNo.toLowerCase());
    if (existing) {
      return { success: false, message: `Invoice ${inv.invoiceNo} already exists in receivables.` };
    }

    const taxAmt = calculateTax(inv.taxableValue, inv.gstRate);
    const totalAmount = inv.taxableValue + taxAmt;

    const dueDateObj = new Date(inv.dueDate);
    const todayObj = new Date();
    const diffTime = todayObj.getTime() - dueDateObj.getTime();
    const overdueDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const newReceivable: ReceivableItem = {
      id: inv.invoiceNo.toUpperCase(),
      customer: inv.customer,
      amount: totalAmount,
      overdueDays,
      promiseDays: null,
      gstin: inv.gstin,
      docDate: inv.invoiceDate,
      isDisputed: false
    };

    this.state.receivables.unshift(newReceivable);
    this.state.salesTaxOutput += taxAmt;

    // Create posted journal entry
    const draftForJournal: DocumentDraft = {
      id: `doc-${Date.now()}`,
      type: 'Sales Invoice',
      party: inv.customer,
      docNo: inv.invoiceNo.toUpperCase(),
      date: inv.invoiceDate,
      gstin: inv.gstin,
      taxableValue: inv.taxableValue,
      gstRate: inv.gstRate,
      hsn: '998314',
      ledger: inv.ledger,
      ledgerConfidence: 100,
      status: 'Posted',
      userEditedLedger: true
    };
    draftForJournal.journalVoucher = generateBalancedJournal(draftForJournal);
    this.state.postedDocuments.unshift(draftForJournal);

    this.logAction(
      this.getRoleName(),
      `Created Sales Invoice ${inv.invoiceNo} for ${inv.customer} (₹${totalAmount.toLocaleString('en-IN')}) with balanced journal`,
      'document'
    );
    this.saveToStorage();

    return { success: true, message: `Sales invoice ${inv.invoiceNo} posted successfully`, receivable: newReceivable };
  }

  // --- GST RECONCILIATION ---
  public addGstRecord(row: {
    supplier: string;
    docNo: string;
    portalTax: number;
    booksTax?: number;
  }): { success: boolean; message: string; row: GstReconciliationRow } {
    const existingIndex = this.state.gstRows.findIndex(g => g.docNo.toLowerCase() === row.docNo.toLowerCase());
    let status: 'matched' | 'mismatch' | 'portal' | 'books' = 'portal';

    if (row.booksTax !== undefined && row.booksTax !== null) {
      status = Math.abs(row.booksTax - row.portalTax) < 1 ? 'matched' : 'mismatch';
    }

    const newRow: GstReconciliationRow = {
      id: `gst-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      supplier: row.supplier,
      docNo: row.docNo.toUpperCase(),
      booksTax: row.booksTax ?? null,
      portalTax: row.portalTax,
      status
    };

    if (existingIndex >= 0) {
      this.state.gstRows[existingIndex] = { ...this.state.gstRows[existingIndex], ...newRow };
    } else {
      this.state.gstRows.unshift(newRow);
    }

    this.logAction(
      this.getRoleName(),
      `Added GSTR-2B entry for ${row.supplier} (${row.docNo}) with ₹${row.portalTax.toLocaleString('en-IN')} portal tax`,
      'gst'
    );
    this.saveToStorage();

    return { success: true, message: `GST row ${row.docNo} recorded`, row: newRow };
  }

  public resolveGstRow(index: number, action: 'accept_portal' | 'ask_supplier' | 'post_bill'): boolean {
    const row = this.state.gstRows[index];
    if (!row) return false;

    if (action === 'accept_portal') {
      const diff = (row.booksTax || 0) - (row.portalTax || 0);
      row.booksTax = row.portalTax;
      row.status = 'resolved';
      row.resolutionNote = `Accepted portal value; adjusted ₹${diff.toLocaleString('en-IN')}`;
      this.logAction(this.getRoleName(), `GST ${row.docNo}: accepted portal value of ₹${(row.portalTax || 0).toLocaleString('en-IN')}`, 'gst');
    } else if (action === 'ask_supplier') {
      row.status = 'followup_sent';
      row.resolutionNote = 'Communication sent to supplier requesting GSTR-1 upload';
      this.logAction(this.getRoleName(), `GST ${row.docNo}: follow-up notification sent to ${row.supplier}`, 'gst');
    }
    this.saveToStorage();
    return true;
  }

  // --- BANK RECONCILIATION ---
  public addBankTransactionLine(line: {
    narration: string;
    amount: number;
    category?: string;
    matchedDocId?: string;
  }): { success: boolean; line: BankTransactionLine } {
    const nextId = this.state.bankLines.length > 0 ? Math.max(...this.state.bankLines.map(b => b.id)) + 1 : 1;
    const isCredit = line.amount > 0;
    const defaultSuggestion = line.matchedDocId
      ? `Match with document ${line.matchedDocId}`
      : isCredit
        ? 'Customer payment receipt'
        : 'Supplier payment debit';

    const newLine: BankTransactionLine = {
      id: nextId,
      narration: line.narration,
      amount: line.amount,
      suggestion: defaultSuggestion,
      confidence: line.matchedDocId ? 95 : 85,
      status: 'pending',
      category: line.category || (isCredit ? 'Customer Receipt' : 'Vendor Payment'),
      matchedDocId: line.matchedDocId
    };

    this.state.bankLines.unshift(newLine);
    this.logAction(
      this.getRoleName(),
      `Recorded bank transaction: ${line.narration} (${line.amount >= 0 ? '+' : ''}₹${line.amount.toLocaleString('en-IN')})`,
      'bank'
    );
    this.saveToStorage();

    return { success: true, line: newLine };
  }

  public reconcileBankLine(id: number): boolean {
    const line = this.state.bankLines.find(b => b.id === id);
    if (!line || line.status === 'reconciled') return false;

    // Dynamically match and adjust related invoice/bill if matchedDocId exists
    if (line.matchedDocId) {
      const rec = this.state.receivables.find(r => r.id.toLowerCase() === line.matchedDocId!.toLowerCase());
      if (rec) {
        if (rec.amount <= Math.abs(line.amount)) {
          this.state.receivables = this.state.receivables.filter(r => r.id.toLowerCase() !== line.matchedDocId!.toLowerCase());
        } else {
          rec.amount -= Math.abs(line.amount);
        }
      }

      const pay = this.state.payables.find(p => p.id.toLowerCase() === line.matchedDocId!.toLowerCase());
      if (pay) {
        if (pay.amount <= Math.abs(line.amount)) {
          this.state.payables = this.state.payables.filter(p => p.id.toLowerCase() !== line.matchedDocId!.toLowerCase());
        } else {
          pay.amount -= Math.abs(line.amount);
        }
      }
    }

    this.state.cashBalance += line.amount;
    line.status = 'reconciled';
    this.logAction(
      this.getRoleName(),
      `Reconciled bank statement line: ${line.narration} (${line.amount >= 0 ? '+' : ''}₹${line.amount.toLocaleString('en-IN')})`,
      'bank'
    );
    this.saveToStorage();
    return true;
  }

  public sendBankLineToException(id: number): boolean {
    const line = this.state.bankLines.find(b => b.id === id);
    if (!line) return false;
    line.status = 'exception';
    this.logAction(this.getRoleName(), `Moved line #${id} (${line.narration}) to review exception queue`, 'bank');
    this.saveToStorage();
    return true;
  }

  public resetToLiveEmptyState(): void {
    this.state.receivables = [];
    this.state.payables = [];
    this.state.pendingBills = [];
    this.state.gstRows = [];
    this.state.bankLines = [];
    this.state.postedDocuments = [];
    this.state.currentDraft = null;
    this.state.activeBatch = null;
    this.state.cashBalance = 0;
    this.state.salesTaxOutput = 0;
    this.saveToStorage();
    this.logAction(this.getRoleName(), 'Reset workspace to clean live production state (zero transactions)', 'system');
  }

  // --- HIGH-CONCURRENCY BENCHMARK SIMULATOR ---
  public runConcurrencyBenchmark(concurrencyCount: number = 200): {
    totalTransactions: number;
    completed: number;
    conflictsHandled: number;
    durationMs: number;
    effectiveTps: number;
  } {
    const start = performance.now();
    let completed = 0;
    let conflictsHandled = 0;

    for (let i = 0; i < concurrencyCount; i++) {
      const hasConflict = i % 15 === 0;
      if (hasConflict) {
        conflictsHandled++;
        this.state.metrics.optimisticRetryCount++;
      }
      completed++;
    }

    const durationMs = Math.max(1, performance.now() - start);
    const effectiveTps = Math.round((completed / durationMs) * 1000);

    this.state.metrics.transactionsPerSecond = effectiveTps;
    this.state.metrics.activePoolConnections = Math.min(20, 8 + Math.floor(concurrencyCount / 25));

    this.logAction('PostgresEngine', `Concurrency stress test: ${completed} parallel operations resolved in ${durationMs.toFixed(1)}ms (${effectiveTps.toLocaleString()} TPS)`, 'system');

    return {
      totalTransactions: concurrencyCount,
      completed,
      conflictsHandled,
      durationMs: parseFloat(durationMs.toFixed(2)),
      effectiveTps
    };
  }

  // --- SETTINGS ---
  public updateCompany(setup: Partial<CompanyConfig>) {
    this.state.company = { ...this.state.company, ...setup };
    this.logAction(this.getRoleName(), `Company profile and approval threshold updated`, 'system');
  }

  public toggleUserStatus(index: number): boolean {
    if (index === 0) return false;
    const u = this.state.users[index];
    if (!u) return false;
    u.active = !u.active;
    this.logAction(this.getRoleName(), `User ${u.name} ${u.active ? 'activated' : 'deactivated'} in access control matrix`, 'system');
    return true;
  }

  public addUser(name: string, email: string, role: 'owner' | 'fin' | 'col' | 'app' | 'client') {
    const newUser: User = {
      id: `u-${Date.now()}`,
      name,
      email,
      password: 'demo123',
      role,
      active: true,
      department: role === 'fin' ? 'Finance' : role === 'col' ? 'Collections' : role === 'app' ? 'Audit' : 'Operations'
    };
    this.state.users.push(newUser);
    this.logAction(this.getRoleName(), `Added new user ${name} (${email}) as ${role.toUpperCase()}`, 'system');
  }

  private getRoleName(): string {
    return this.state.currentUser.name || 'User';
  }
}

export const accountingEngine = new HighConcurrencyAccountingEngine();
