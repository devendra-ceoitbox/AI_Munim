export type UserRole = 'owner' | 'fin' | 'col' | 'app' | 'client';

export interface RoleConfig {
  name: string;
  badge: string;
  description: string;
  canSubmit: boolean;
  canApprove: boolean;
  canCollect: boolean;
  canConfigure: boolean;
  defaultLandingTab: string;
  navItems: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  active: boolean;
  avatar?: string;
  department?: string;
}

export interface AuthSession {
  user: User;
  isAuthenticated: boolean;
  loginTime: string;
}

export interface CompanyConfig {
  legalName: string;
  gstin: string;
  financialYear: string;
  industryProfile: 'Trading' | 'Manufacturing' | 'Services' | 'Distribution';
  approverLimit: number; // e.g. 100000 INR
  baseCurrency: string;
}

export interface InvoiceItem {
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  amount: number;
  gstRate: number;
}

export type DocumentType =
  | 'Sales Invoice'
  | 'Purchase Invoice'
  | 'Credit Note'
  | 'Debit Note'
  | 'Expense Voucher'
  | 'Bank Statement';

export type DocumentStatus =
  | 'Draft'
  | 'Scanning'
  | 'Extracted'
  | 'Validated'
  | 'Awaiting approval'
  | 'Approved'
  | 'Posted'
  | 'Disputed'
  | 'Rejected';

export interface DocumentDraft {
  id: string;
  type: DocumentType;
  party: string;
  docNo: string;
  date: string;
  dueDate?: string;
  gstin: string;
  taxableValue: number;
  gstRate: number;
  hsn: string;
  ledger: string;
  ledgerConfidence: number;
  status: DocumentStatus;
  submittedBy?: string;
  userEditedLedger?: boolean;
  items?: InvoiceItem[];
  sourceFile?: string;
  journalVoucher?: JournalLineItem[];
  overdueDays?: number;
  promiseDays?: number | null;
  isDisputed?: boolean;
  ocrConfidenceMap?: Record<string, number>;
  batchId?: string;
}

export interface BatchDocumentItem extends DocumentDraft {
  fileName: string;
  fileSize: string;
  scanProgress: number; // 0 - 100%
  extractedFieldsCount: number;
}

export interface BulkUploadBatch {
  id: string;
  timestamp: string;
  docType: DocumentType;
  files: BatchDocumentItem[];
  totalTaxable: number;
  totalTax: number;
  totalAmount: number;
  status: 'scanning' | 'ready' | 'submitted' | 'posted';
}

export interface JournalLineItem {
  account: string;
  debit: number;
  credit: number;
}

export interface ReceivableItem {
  id: string;
  customer: string;
  amount: number;
  overdueDays: number; // >0 is overdue, <0 is days until due
  promiseDays: number | null;
  isDisputed?: boolean;
  gstin?: string;
  docDate?: string;
}

export interface PayableItem {
  id: string;
  supplier: string;
  amount: number;
  dueInDays: number;
  gstin?: string;
  docDate?: string;
  priority?: 'high' | 'normal' | 'low';
}

export type GstStatus = 'matched' | 'mismatch' | 'books' | 'portal' | 'resolved' | 'followup_sent';

export interface GstReconciliationRow {
  id: string;
  supplier: string;
  docNo: string;
  booksTax: number | null;
  portalTax: number | null;
  status: GstStatus;
  resolutionNote?: string;
}

export interface BankTransactionLine {
  id: number;
  narration: string;
  amount: number; // positive = credit (receipt), negative = debit (payment)
  suggestion: string;
  confidence: number;
  matchedDocId?: string;
  status: 'pending' | 'reconciled' | 'exception';
  category?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  category: 'document' | 'approval' | 'gst' | 'bank' | 'collection' | 'system';
}

export interface CashForecastPoint {
  day: number;
  dateStr: string;
  baseCash: number;
  cautiousCash: number;
  optimisticCash: number;
  inflow: number;
  outflow: number;
  events: string[];
}

export interface AiChatMessage {
  id: string;
  question: string;
  answer: string;
  basis: string;
  sources: string[];
  timestamp: string;
}

export interface HighConcurrencyMetric {
  activePoolConnections: number;
  maxPoolSize: number;
  queuedQueries: number;
  transactionsPerSecond: number;
  avgLockWaitMs: number;
  idempotentDeduplications: number;
  optimisticRetryCount: number;
}

// ==============================================================================
// MASTER DATA MANAGEMENT TYPES (DROPDOWN MASTERS IN SETTINGS TAB)
// ==============================================================================

export interface AccountMaster {
  id: string;
  code: string;
  name: string;
  group: string; // e.g. 'Revenue', 'Direct Expenses', 'Current Assets', 'Current Liabilities'
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  isControlAccount: boolean;
  active: boolean;
}

export interface ItemMaster {
  id: string;
  code: string;
  description: string;
  hsnSac: string;
  unit: 'PCS' | 'KGS' | 'MTR' | 'NOS' | 'BOX' | 'HRS';
  defaultTaxRate: number;
  defaultLedger: string;
  active: boolean;
}

export interface TaxCodeMaster {
  id: string;
  name: string;
  rate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  effectiveFrom: string;
  active: boolean;
}

export interface CostCentreMaster {
  id: string;
  code: string;
  name: string;
  branch: string;
  manager: string;
  active: boolean;
}

export interface BankAccountMaster {
  id: string;
  bankName: string;
  accountNumberMasked: string;
  ifsc: string;
  accountType: 'Current' | 'Cash Credit (CC)' | 'Overdraft (OD)' | 'Savings';
  openingBalance: number;
  active: boolean;
}

export interface DocSeriesMaster {
  id: string;
  docType: DocumentType;
  prefix: string;
  startingNumber: number;
  currentNumber: number;
  fySuffix: string;
  active: boolean;
}

export interface PartyMaster {
  id: string;
  partyType: 'CUSTOMER' | 'SUPPLIER';
  name: string;
  legalName: string;
  gstin: string;
  stateCode: string;
  phone: string;
  creditDays: number;
  creditLimit: number;
  active: boolean;
}

export interface MastersState {
  accounts: AccountMaster[];
  items: ItemMaster[];
  taxCodes: TaxCodeMaster[];
  costCentres: CostCentreMaster[];
  bankAccounts: BankAccountMaster[];
  docSeries: DocSeriesMaster[];
  parties: PartyMaster[];
}
