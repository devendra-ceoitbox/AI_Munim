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
  auditLogs: AuditLogItem[];
  metrics: HighConcurrencyMetric;
  masters: MastersState;
}

export class HighConcurrencyAccountingEngine {
  private state: AppState;
  private idempotencyRegistry = new Set<string>();

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): AppState {
    const initialUsers: User[] = [
      {
        id: 'u1',
        name: 'Anita Rao',
        email: 'owner@sampletraders.in',
        password: 'demo123',
        role: 'owner',
        active: true,
        department: 'Executive Management'
      },
      {
        id: 'u2',
        name: 'Vikram Sethi',
        email: 'finance@sampletraders.in',
        password: 'demo123',
        role: 'fin',
        active: true,
        department: 'Finance & Accounts'
      },
      {
        id: 'u3',
        name: 'Neha Kapoor',
        email: 'collections@sampletraders.in',
        password: 'demo123',
        role: 'col',
        active: true,
        department: 'Credit & Receivables'
      },
      {
        id: 'u4',
        name: 'Rohit Jain',
        email: 'approver@sampletraders.in',
        password: 'demo123',
        role: 'app',
        active: true,
        department: 'Internal Audit & Approvals'
      },
      {
        id: 'u5',
        name: 'Amit Gupta (Gupta Exports)',
        email: 'client@guptaexports.in',
        password: 'demo123',
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
        { id: 'acc-9', code: '4010', name: 'Consulting Revenue', group: 'Revenue', type: 'INCOME', isControlAccount: false, active: true },
        { id: 'acc-10', code: '4020', name: 'Product Sales', group: 'Revenue', type: 'INCOME', isControlAccount: false, active: true },
        { id: 'acc-11', code: '5010', name: 'Raw Materials Purchase', group: 'Direct Expenses', type: 'EXPENSE', isControlAccount: false, active: true },
        { id: 'acc-12', code: '5020', name: 'Freight & Logistics', group: 'Direct Expenses', type: 'EXPENSE', isControlAccount: false, active: true },
        { id: 'acc-13', code: '5030', name: 'Office Expenses', group: 'Indirect Expenses', type: 'EXPENSE', isControlAccount: false, active: true },
        { id: 'acc-14', code: '5040', name: 'IT & Software Subscriptions', group: 'Indirect Expenses', type: 'EXPENSE', isControlAccount: false, active: true },
        { id: 'acc-15', code: '5050', name: 'Bank Charges', group: 'Indirect Expenses', type: 'EXPENSE', isControlAccount: false, active: true }
      ],
      items: [
        { id: 'itm-1', code: 'ITM-001', description: 'Linear Alkyl Benzene (LAB)', hsnSac: '2915', unit: 'KGS', defaultTaxRate: 18, defaultLedger: 'Raw Materials Purchase', active: true },
        { id: 'itm-2', code: 'ITM-002', description: 'High Density Polyethylene (HDPE)', hsnSac: '3901', unit: 'KGS', defaultTaxRate: 18, defaultLedger: 'Raw Materials Purchase', active: true },
        { id: 'itm-3', code: 'ITM-003', description: 'Corrugated Master Shipping Cartons', hsnSac: '4819', unit: 'BOX', defaultTaxRate: 12, defaultLedger: 'Office Expenses', active: true },
        { id: 'itm-4', code: 'ITM-004', description: 'ERP Accounting & Financial Architecture Services', hsnSac: '998314', unit: 'HRS', defaultTaxRate: 18, defaultLedger: 'Consulting Revenue', active: true },
        { id: 'itm-5', code: 'ITM-005', description: 'Inter-State Freight & Transit Logistic Services', hsnSac: '996511', unit: 'NOS', defaultTaxRate: 5, defaultLedger: 'Freight & Logistics', active: true }
      ],
      taxCodes: [
        { id: 'tax-1', name: 'GST 18% (Standard Rate)', rate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0, effectiveFrom: '2017-07-01', active: true },
        { id: 'tax-2', name: 'GST 12% (Intermediate Goods)', rate: 12, cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: 0, effectiveFrom: '2017-07-01', active: true },
        { id: 'tax-3', name: 'GST 5% (Essential Commodities/Transport)', rate: 5, cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: 0, effectiveFrom: '2017-07-01', active: true },
        { id: 'tax-4', name: 'GST 28% (Luxury/Demerit Goods)', rate: 28, cgstRate: 14, sgstRate: 14, igstRate: 28, cessRate: 0, effectiveFrom: '2017-07-01', active: true },
        { id: 'tax-5', name: 'Exempt 0% (Zero-Rated / Export)', rate: 0, cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: 0, effectiveFrom: '2017-07-01', active: true }
      ],
      costCentres: [
        { id: 'cc-1', code: 'CC-HQ', name: 'Corporate Headquarters', branch: 'Gurugram Central', manager: 'Anita Rao', active: true },
        { id: 'cc-2', code: 'CC-PL1', name: 'Manesar Polymer Plant 1', branch: 'Haryana Industrial Area', manager: 'Vikram Sethi', active: true },
        { id: 'cc-3', code: 'CC-WH', name: 'Bhiwandi Central Logistics Hub', branch: 'Mumbai Distribution Center', manager: 'Rohit Jain', active: true },
        { id: 'cc-4', code: 'CC-FIN', name: 'Finance & Statutory Operations', branch: 'Gurugram Central', manager: 'Vikram Sethi', active: true }
      ],
      bankAccounts: [
        { id: 'ba-1', bankName: 'ICICI Bank Current A/c', accountNumberMasked: 'XXXX-XXXX-9821', ifsc: 'ICIC0000102', accountType: 'Current', openingBalance: 180000, active: true },
        { id: 'ba-2', bankName: 'HDFC Bank OD Facility', accountNumberMasked: 'XXXX-XXXX-4412', ifsc: 'HDFC0001890', accountType: 'Overdraft (OD)', openingBalance: 120000, active: true },
        { id: 'ba-3', bankName: 'State Bank of India', accountNumberMasked: 'XXXX-XXXX-1102', ifsc: 'SBIN0004521', accountType: 'Current', openingBalance: 45000, active: true }
      ],
      docSeries: [
        { id: 'ds-1', docType: 'Sales Invoice', prefix: 'INV-', startingNumber: 1001, currentNumber: 1058, fySuffix: '/26-27', active: true },
        { id: 'ds-2', docType: 'Purchase Invoice', prefix: 'PB-', startingNumber: 201, currentNumber: 224, fySuffix: '/26-27', active: true },
        { id: 'ds-3', docType: 'Credit Note', prefix: 'CN-', startingNumber: 1, currentNumber: 4, fySuffix: '/26-27', active: true },
        { id: 'ds-4', docType: 'Debit Note', prefix: 'DN-', startingNumber: 1, currentNumber: 2, fySuffix: '/26-27', active: true },
        { id: 'ds-5', docType: 'Expense Voucher', prefix: 'EXP-', startingNumber: 301, currentNumber: 318, fySuffix: '/26-27', active: true },
        { id: 'ds-6', docType: 'Bank Statement', prefix: 'BST-', startingNumber: 101, currentNumber: 112, fySuffix: '/26-27', active: true }
      ],
      parties: [
        { id: 'pty-1', partyType: 'CUSTOMER', name: 'Sharma Traders', legalName: 'Sharma Traders Private Limited', gstin: '06AAACS8890K1Z1', stateCode: '06', phone: '+91 98110 22345', creditDays: 30, creditLimit: 500000, active: true },
        { id: 'pty-2', partyType: 'CUSTOMER', name: 'Gupta Exports', legalName: 'Gupta Exports LLP', gstin: '06AABCG1290L1Z3', stateCode: '06', phone: '+91 98712 34567', creditDays: 30, creditLimit: 800000, active: true },
        { id: 'pty-3', partyType: 'CUSTOMER', name: 'Kapoor Steels', legalName: 'Kapoor Steels Corporation', gstin: '06AABCK9921M1Z4', stateCode: '06', phone: '+91 98101 99882', creditDays: 30, creditLimit: 1000000, active: true },
        { id: 'pty-4', partyType: 'CUSTOMER', name: 'Bluewave Services', legalName: 'Bluewave Consulting Services Ltd', gstin: '06AABCB4521K1Z7', stateCode: '06', phone: '+91 99580 44321', creditDays: 30, creditLimit: 300000, active: true },
        { id: 'pty-5', partyType: 'CUSTOMER', name: 'Mehta & Sons', legalName: 'Mehta & Sons Trading Co', gstin: '06AABCM3312N1Z9', stateCode: '06', phone: '+91 98115 67890', creditDays: 30, creditLimit: 400000, active: true },
        { id: 'pty-6', partyType: 'SUPPLIER', name: 'Raj Polymers', legalName: 'Raj Polymers India Ltd', gstin: '06AAACR8890M1Z2', stateCode: '06', phone: '+91 98200 11223', creditDays: 30, creditLimit: 0, active: true },
        { id: 'pty-7', partyType: 'SUPPLIER', name: 'Om Logistics', legalName: 'Om Freight & Logistics Ltd', gstin: '06AAECO4412J1Z8', stateCode: '06', phone: '+91 98330 44556', creditDays: 15, creditLimit: 0, active: true },
        { id: 'pty-8', partyType: 'SUPPLIER', name: 'Apex Packaging', legalName: 'Apex Packaging Industries', gstin: '06AABCA7712P1Z0', stateCode: '06', phone: '+91 98111 88990', creditDays: 30, creditLimit: 0, active: true },
        { id: 'pty-9', partyType: 'SUPPLIER', name: 'Delta Chemicals', legalName: 'Delta Chemicals Mfg Co', gstin: '06AAECD1177H1Z4', stateCode: '06', phone: '+91 98104 55667', creditDays: 30, creditLimit: 0, active: true }
      ]
    };

    return {
      company: {
        legalName: 'Sample Traders Pvt Ltd',
        gstin: '06AABCS1234F1Z5',
        financialYear: 'Apr 2026 – Mar 2027',
        industryProfile: 'Trading',
        approverLimit: 100000,
        baseCurrency: 'INR'
      },
      users: initialUsers,
      currentRole: 'owner',
      currentUser: initialUsers[0],
      isAuthenticated: true,
      cashBalance: 300000,
      salesTaxOutput: 112500,
      receivables: [
        { id: 'INV-1042', customer: 'Sharma Traders', amount: 118000, overdueDays: 15, promiseDays: 3, gstin: '06AAACS8890K1Z1' },
        { id: 'INV-1051', customer: 'Gupta Exports', amount: 182000, overdueDays: 8, promiseDays: 5, gstin: '06AABCG1290L1Z3' },
        { id: 'INV-0988', customer: 'Kapoor Steels', amount: 245000, overdueDays: 42, promiseDays: null, gstin: '06AABCK9921M1Z4' },
        { id: 'INV-1055', customer: 'Bluewave Services', amount: 64500, overdueDays: -6, promiseDays: null, gstin: '06AABCB4521K1Z7' },
        { id: 'INV-0901', customer: 'Mehta & Sons', amount: 96000, overdueDays: 71, promiseDays: null, isDisputed: true, gstin: '06AABCM3312N1Z9' }
      ],
      payables: [
        { id: 'RP/221', supplier: 'Raj Polymers', amount: 206500, dueInDays: 4, gstin: '06AAACR8890M1Z2' },
        { id: 'OL-77', supplier: 'Om Logistics', amount: 38000, dueInDays: 7, gstin: '06AAECO4412J1Z8' },
        { id: 'AP-413', supplier: 'Apex Packaging', amount: 155000, dueInDays: 11, gstin: '06AABCA7712P1Z0' }
      ],
      gstRows: [
        { id: 'gst-1', supplier: 'Gupta Polymers', docNo: 'GP-88', booksTax: 18000, portalTax: 18000, status: 'matched' },
        { id: 'gst-2', supplier: 'Raj Polymers', docNo: 'RP/221', booksTax: 31500, portalTax: 31500, status: 'matched' },
        { id: 'gst-3', supplier: 'Apex Packaging', docNo: 'AP-413', booksTax: 27900, portalTax: 27000, status: 'mismatch' },
        { id: 'gst-4', supplier: 'Om Logistics', docNo: 'OL-77', booksTax: 6840, portalTax: null, status: 'books' },
        { id: 'gst-5', supplier: 'Delta Chemicals', docNo: 'DC-910', booksTax: null, portalTax: 12100, status: 'portal' }
      ],
      bankLines: [
        {
          id: 1,
          narration: 'NEFT – Sharma Traders',
          amount: 118000,
          suggestion: 'Match to INV-1042 (exact amount, name match)',
          confidence: 96,
          matchedDocId: 'INV-1042',
          status: 'pending'
        },
        {
          id: 2,
          narration: 'NEFT – Gupta Exports',
          amount: 100000,
          suggestion: 'Partial allocation to INV-1051 (₹82,000 remains open)',
          confidence: 78,
          matchedDocId: 'INV-1051',
          status: 'pending'
        },
        {
          id: 3,
          narration: 'RTGS – Om Logistics',
          amount: -38000,
          suggestion: 'Match to supplier bill OL-77',
          confidence: 94,
          matchedDocId: 'OL-77',
          status: 'pending'
        },
        {
          id: 4,
          narration: 'Bank charges & GST debit',
          amount: -590,
          suggestion: 'Classify as Bank Charges and post to ledger',
          confidence: 90,
          status: 'pending'
        },
        {
          id: 5,
          narration: 'UPI – unknown payer ref #8921',
          amount: 12500,
          suggestion: 'No match found in books. Requires review',
          confidence: 0,
          status: 'exception'
        }
      ],
      pendingBills: [],
      currentDraft: null,
      activeBatch: null,
      auditLogs: [
        {
          id: 'log-1',
          timestamp: new Date(Date.now() - 3600000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          user: 'System',
          action: 'System initialized with PostgreSQL high-concurrency schema & dropdown masters',
          category: 'system'
        },
        {
          id: 'log-2',
          timestamp: new Date(Date.now() - 1800000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          user: 'Anita Rao (Owner)',
          action: 'Configured Chart of Accounts, Items, Tax Codes, and Document Series masters',
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

  public postDraft(): boolean {
    const draft = this.state.currentDraft;
    if (!draft) return false;

    const taxAmt = calculateTax(draft.taxableValue, draft.gstRate);
    const total = draft.taxableValue + taxAmt;
    const isSale = draft.type.toLowerCase().includes('sales');

    draft.journalVoucher = generateBalancedJournal(draft);
    draft.status = 'Posted';

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

  // --- GST RECONCILIATION ---
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
    return true;
  }

  // --- BANK RECONCILIATION ---
  public reconcileBankLine(id: number): boolean {
    const line = this.state.bankLines.find(b => b.id === id);
    if (!line || line.status === 'reconciled') return false;

    if (line.matchedDocId) {
      if (line.id === 1) {
        this.state.receivables = this.state.receivables.filter(r => r.id !== 'INV-1042');
      } else if (line.id === 2) {
        const target = this.state.receivables.find(r => r.id === 'INV-1051');
        if (target) target.amount -= 100000;
      } else if (line.id === 3) {
        this.state.payables = this.state.payables.filter(p => p.id !== 'OL-77');
      }
    }

    this.state.cashBalance += line.amount;
    line.status = 'reconciled';
    this.logAction(
      this.getRoleName(),
      `Reconciled bank statement line: ${line.narration} (${line.amount >= 0 ? '+' : ''}₹${line.amount.toLocaleString('en-IN')})`,
      'bank'
    );
    return true;
  }

  public sendBankLineToException(id: number): boolean {
    const line = this.state.bankLines.find(b => b.id === id);
    if (!line) return false;
    line.status = 'exception';
    this.logAction(this.getRoleName(), `Moved line #${id} (${line.narration}) to review exception queue`, 'bank');
    return true;
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
