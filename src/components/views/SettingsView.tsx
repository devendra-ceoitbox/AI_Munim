import React, { useState } from 'react';
import {
  Settings,
  Building,
  Users,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  History,
  UserPlus,
  Database,
  Layers,
  Zap,
  Lock,
  Cpu,
  CheckCircle2,
  ListTree,
  Plus,
  Search,
  Filter,
  CreditCard,
  Building2,
  FileText,
  Tag,
  Briefcase,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { AppState } from '../../db/concurrencyEngine.ts';
import {
  UserRole,
  AccountMaster,
  ItemMaster,
  TaxCodeMaster,
  CostCentreMaster,
  BankAccountMaster,
  DocSeriesMaster,
  PartyMaster,
  DocumentType
} from '../../types/accounting.ts';
import { validateGstin, formatINR } from '../../utils/accounting.ts';

interface SettingsViewProps {
  state: AppState;
  onUpdateCompany: (company: any) => void;
  onToggleUser: (index: number) => void;
  onAddUser: (name: string, email: string, role: UserRole) => void;
  onRunBenchmark: (count: number) => Promise<{
    totalTransactions: number;
    completed: number;
    conflictsHandled: number;
    durationMs: number;
    effectiveTps: number;
  }>;
  onAddAccount: (acc: Omit<AccountMaster, 'id'>) => void;
  onToggleAccount: (id: string) => void;
  onAddItem: (item: Omit<ItemMaster, 'id'>) => void;
  onToggleItem: (id: string) => void;
  onAddTaxCode: (tax: Omit<TaxCodeMaster, 'id'>) => void;
  onToggleTaxCode: (id: string) => void;
  onAddCostCentre: (cc: Omit<CostCentreMaster, 'id'>) => void;
  onToggleCostCentre: (id: string) => void;
  onAddBankAccount: (ba: Omit<BankAccountMaster, 'id'>) => void;
  onToggleBankAccount: (id: string) => void;
  onAddDocSeries: (ds: Omit<DocSeriesMaster, 'id'>) => void;
  onToggleDocSeries: (id: string) => void;
  onAddParty: (party: Omit<PartyMaster, 'id'>) => void;
  onToggleParty: (id: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  onUpdateCompany,
  onToggleUser,
  onAddUser,
  onRunBenchmark,
  onAddAccount,
  onToggleAccount,
  onAddItem,
  onToggleItem,
  onAddTaxCode,
  onToggleTaxCode,
  onAddCostCentre,
  onToggleCostCentre,
  onAddBankAccount,
  onToggleBankAccount,
  onAddDocSeries,
  onToggleDocSeries,
  onAddParty,
  onToggleParty
}) => {
  const [mainTab, setMainTab] = useState<
    'masters' | 'db' | 'company' | 'users' | 'audit'
  >('masters');

  // Masters active category
  const [masterCategory, setMasterCategory] = useState<
    'accounts' | 'items' | 'taxCodes' | 'costCentres' | 'bankAccounts' | 'docSeries' | 'parties'
  >('accounts');
  const [masterSearch, setMasterSearch] = useState('');
  const [showAddMasterModal, setShowAddMasterModal] = useState(false);

  // Company Form state
  const [legalName, setLegalName] = useState(state.company.legalName);
  const [gstin, setGstin] = useState(state.company.gstin);
  const [fy, setFy] = useState(state.company.financialYear);
  const [industry, setIndustry] = useState(state.company.industryProfile);
  const [limit, setLimit] = useState(state.company.approverLimit.toString());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // Add User Form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('fin');

  // Benchmark & DB Architecture state
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [dbSubTab, setDbSubTab] = useState<'architecture' | 'schema' | 'benchmark'>('architecture');

  // Quick form states for new master additions
  const [newAccountCode, setNewAccountCode] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountGroup, setNewAccountGroup] = useState('Revenue');
  const [newAccountType, setNewAccountType] = useState<AccountMaster['type']>('INCOME');

  const [newItemCode, setNewItemCode] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemHsn, setNewItemHsn] = useState('3901');
  const [newItemUnit, setNewItemUnit] = useState<ItemMaster['unit']>('KGS');
  const [newItemRate, setNewItemRate] = useState(18);
  const [newItemLedger, setNewItemLedger] = useState('Raw Materials Purchase');

  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState(18);

  const [newCcCode, setNewCcCode] = useState('');
  const [newCcName, setNewCcName] = useState('');
  const [newCcBranch, setNewCcBranch] = useState('Gurugram Central');
  const [newCcManager, setNewCcManager] = useState('');

  const [newBankName, setNewBankName] = useState('');
  const [newBankAccNo, setNewBankAccNo] = useState('');
  const [newBankIfsc, setNewBankIfsc] = useState('');
  const [newBankType, setNewBankType] = useState<BankAccountMaster['accountType']>('Current');
  const [newBankBal, setNewBankBal] = useState(50000);

  const [newDsType, setNewDsType] = useState<DocumentType>('Sales Invoice');
  const [newDsPrefix, setNewDsPrefix] = useState('INV-');
  const [newDsStart, setNewDsStart] = useState(1001);

  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyType, setNewPartyType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [newPartyGstin, setNewPartyGstin] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [newPartyDays, setNewPartyDays] = useState(30);

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateGstin(gstin)) {
      setError('Invalid GSTIN format. Must be 15 alphanumeric characters.');
      return;
    }
    setError('');
    onUpdateCompany({
      legalName,
      gstin: gstin.toUpperCase(),
      financialYear: fy,
      industryProfile: industry,
      approverLimit: parseFloat(limit) || 100000
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newEmail.includes('@')) {
      alert('Please enter a valid name and email address.');
      return;
    }
    onAddUser(newName.trim(), newEmail.trim(), newRole);
    setNewName('');
    setNewEmail('');
  };

  const handleRunBenchmarkTest = async (count: number) => {
    setIsRunningTest(true);
    try {
      const res = await onRunBenchmark(count);
      setTestResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleCreateMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterCategory === 'accounts') {
      if (!newAccountCode.trim() || !newAccountName.trim()) return;
      onAddAccount({
        code: newAccountCode.trim(),
        name: newAccountName.trim(),
        group: newAccountGroup,
        type: newAccountType,
        isControlAccount: false,
        active: true
      });
      setNewAccountCode('');
      setNewAccountName('');
    } else if (masterCategory === 'items') {
      if (!newItemCode.trim() || !newItemDesc.trim()) return;
      onAddItem({
        code: newItemCode.trim(),
        description: newItemDesc.trim(),
        hsnSac: newItemHsn.trim(),
        unit: newItemUnit,
        defaultTaxRate: Number(newItemRate),
        defaultLedger: newItemLedger,
        active: true
      });
      setNewItemCode('');
      setNewItemDesc('');
    } else if (masterCategory === 'taxCodes') {
      if (!newTaxName.trim()) return;
      const rate = Number(newTaxRate);
      onAddTaxCode({
        name: newTaxName.trim(),
        rate,
        cgstRate: rate / 2,
        sgstRate: rate / 2,
        igstRate: rate,
        cessRate: 0,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        active: true
      });
      setNewTaxName('');
    } else if (masterCategory === 'costCentres') {
      if (!newCcCode.trim() || !newCcName.trim()) return;
      onAddCostCentre({
        code: newCcCode.trim(),
        name: newCcName.trim(),
        branch: newCcBranch.trim(),
        manager: newCcManager.trim() || 'Anita Rao',
        active: true
      });
      setNewCcCode('');
      setNewCcName('');
    } else if (masterCategory === 'bankAccounts') {
      if (!newBankName.trim() || !newBankIfsc.trim()) return;
      onAddBankAccount({
        bankName: newBankName.trim(),
        accountNumberMasked: newBankAccNo.trim() || 'XXXX-XXXX-9900',
        ifsc: newBankIfsc.trim().toUpperCase(),
        accountType: newBankType,
        openingBalance: Number(newBankBal) || 0,
        active: true
      });
      setNewBankName('');
      setNewBankIfsc('');
      setNewBankAccNo('');
    } else if (masterCategory === 'docSeries') {
      if (!newDsPrefix.trim()) return;
      onAddDocSeries({
        docType: newDsType,
        prefix: newDsPrefix.trim(),
        startingNumber: Number(newDsStart) || 1,
        currentNumber: Number(newDsStart) || 1,
        fySuffix: '/26-27',
        active: true
      });
      setNewDsPrefix('');
    } else if (masterCategory === 'parties') {
      if (!newPartyName.trim()) return;
      onAddParty({
        partyType: newPartyType,
        name: newPartyName.trim(),
        legalName: `${newPartyName.trim()} Private Limited`,
        gstin: newPartyGstin.trim().toUpperCase() || '06AABCT9981K1Z3',
        stateCode: '06',
        phone: newPartyPhone.trim() || '+91 98000 11223',
        creditDays: Number(newPartyDays) || 30,
        creditLimit: newPartyType === 'CUSTOMER' ? 500000 : 0,
        active: true
      });
      setNewPartyName('');
      setNewPartyGstin('');
      setNewPartyPhone('');
    }
    setShowAddMasterModal(false);
  };

  const roleLabels: Record<UserRole, string> = {
    owner: 'Owner / Admin',
    fin: 'Finance Executive',
    col: 'Collections Executive',
    app: 'Approver',
    client: 'Client Portal'
  };

  const schemaSnippet = `-- HIGH CONCURRENCY PARTITIONED DOCUMENT TABLE
CREATE TABLE documents (
    id UUID DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    doc_type VARCHAR(32) NOT NULL,
    doc_no VARCHAR(64) NOT NULL,
    taxable_value NUMERIC(15,2) NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(32) DEFAULT 'DRAFT' NOT NULL,
    lock_version INT DEFAULT 1 NOT NULL, -- Optimistic Concurrency Control (OCC)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- PARTIAL INDEX: Fast Approver Queue (Skips millions of posted invoices)
CREATE INDEX idx_documents_awaiting_approval
    ON documents(organization_id, due_date)
 WHERE status = 'AWAITING_APPROVAL';

-- WORKER QUEUE: Lock-free high throughput reconciliation
-- SELECT id FROM bank_lines WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED;`;

  return (
    <div className="space-y-6">
      {/* Top Main Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs flex flex-wrap gap-1">
        <button
          onClick={() => setMainTab('masters')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            mainTab === 'masters'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ListTree className="w-4 h-4" />
          <span>Dropdown Masters Setup</span>
        </button>

        <button
          onClick={() => setMainTab('db')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            mainTab === 'db'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Database &amp; Concurrency</span>
        </button>

        <button
          onClick={() => setMainTab('company')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            mainTab === 'company'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Company Setup</span>
        </button>

        <button
          onClick={() => setMainTab('users')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            mainTab === 'users'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users &amp; RBAC</span>
        </button>

        <button
          onClick={() => setMainTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            mainTab === 'audit'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Trail</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: DROPDOWN MASTERS SETUP
          ========================================================================= */}
      {mainTab === 'masters' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ListTree className="w-5 h-5 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Dropdown Masters Configuration
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure primary dropdown options used across invoices, vouchers, tax classification, and bank reconciliation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddMasterModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New {masterCategory === 'accounts' ? 'Account' : masterCategory === 'items' ? 'Item' : masterCategory === 'taxCodes' ? 'Tax Code' : masterCategory === 'costCentres' ? 'Cost Centre' : masterCategory === 'bankAccounts' ? 'Bank Account' : masterCategory === 'docSeries' ? 'Series' : 'Party'}</span>
              </button>
            </div>
          </div>

          {/* Master Category Selector & Filter */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => { setMasterCategory('accounts'); setMasterSearch(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  masterCategory === 'accounts'
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Chart of Accounts ({state.masters.accounts.length})
              </button>
              <button
                onClick={() => { setMasterCategory('items'); setMasterSearch(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  masterCategory === 'items'
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Items &amp; Services ({state.masters.items.length})
              </button>
              <button
                onClick={() => { setMasterCategory('taxCodes'); setMasterSearch(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  masterCategory === 'taxCodes'
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tax Codes ({state.masters.taxCodes.length})
              </button>
              <button
                onClick={() => { setMasterCategory('costCentres'); setMasterSearch(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  masterCategory === 'costCentres'
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cost Centres ({state.masters.costCentres.length})
              </button>
              <button
                onClick={() => { setMasterCategory('bankAccounts'); setMasterSearch(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  masterCategory === 'bankAccounts'
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Bank Accounts ({state.masters.bankAccounts.length})
              </button>
              <button
                onClick={() => { setMasterCategory('docSeries'); setMasterSearch(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  masterCategory === 'docSeries'
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Doc Series ({state.masters.docSeries.length})
              </button>
              <button
                onClick={() => { setMasterCategory('parties'); setMasterSearch(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  masterCategory === 'parties'
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Parties / Contacts ({state.masters.parties.length})
              </button>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={masterSearch}
                onChange={e => setMasterSearch(e.target.value)}
                placeholder="Search master..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Master Table Display */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {/* 1. ACCOUNTS */}
            {masterCategory === 'accounts' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Code</th>
                      <th className="py-2.5 px-4 text-left">Account Name</th>
                      <th className="py-2.5 px-4 text-left">Group</th>
                      <th className="py-2.5 px-4 text-left">Type</th>
                      <th className="py-2.5 px-4 text-center">Control Account</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.masters.accounts
                      .filter(
                        a =>
                          a.name.toLowerCase().includes(masterSearch.toLowerCase()) ||
                          a.code.includes(masterSearch) ||
                          a.group.toLowerCase().includes(masterSearch.toLowerCase())
                      )
                      .map(acc => (
                        <tr key={acc.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{acc.code}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-800">{acc.name}</td>
                          <td className="py-2.5 px-4 text-slate-600">{acc.group}</td>
                          <td className="py-2.5 px-4">
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {acc.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {acc.isControlAccount ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                                Control A/c
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">–</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                acc.active
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {acc.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => onToggleAccount(acc.id)}
                              className="text-xs text-slate-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-slate-100"
                            >
                              {acc.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. ITEMS & SERVICES */}
            {masterCategory === 'items' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Item Code</th>
                      <th className="py-2.5 px-4 text-left">Description</th>
                      <th className="py-2.5 px-4 text-left">HSN / SAC</th>
                      <th className="py-2.5 px-4 text-center">Unit</th>
                      <th className="py-2.5 px-4 text-right">Default GST %</th>
                      <th className="py-2.5 px-4 text-left">Default Ledger</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.masters.items
                      .filter(
                        i =>
                          i.description.toLowerCase().includes(masterSearch.toLowerCase()) ||
                          i.code.toLowerCase().includes(masterSearch.toLowerCase()) ||
                          i.hsnSac.includes(masterSearch)
                      )
                      .map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{item.code}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-800">{item.description}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-600">{item.hsnSac}</td>
                          <td className="py-2.5 px-4 text-center font-mono text-slate-600">{item.unit}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                            {item.defaultTaxRate}%
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">{item.defaultLedger}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                item.active
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {item.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => onToggleItem(item.id)}
                              className="text-xs text-slate-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-slate-100"
                            >
                              {item.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. TAX CODES */}
            {masterCategory === 'taxCodes' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Tax Code / Description</th>
                      <th className="py-2.5 px-4 text-right">Total Rate</th>
                      <th className="py-2.5 px-4 text-right">CGST</th>
                      <th className="py-2.5 px-4 text-right">SGST</th>
                      <th className="py-2.5 px-4 text-right">IGST</th>
                      <th className="py-2.5 px-4 text-left">Effective Date</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.masters.taxCodes
                      .filter(t => t.name.toLowerCase().includes(masterSearch.toLowerCase()))
                      .map(tax => (
                        <tr key={tax.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{tax.name}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-teal-700">{tax.rate}%</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">{tax.cgstRate}%</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">{tax.sgstRate}%</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">{tax.igstRate}%</td>
                          <td className="py-2.5 px-4 font-mono text-slate-500">{tax.effectiveFrom}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                tax.active
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {tax.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => onToggleTaxCode(tax.id)}
                              className="text-xs text-slate-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-slate-100"
                            >
                              {tax.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. COST CENTRES */}
            {masterCategory === 'costCentres' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Code</th>
                      <th className="py-2.5 px-4 text-left">Cost Centre Name</th>
                      <th className="py-2.5 px-4 text-left">Branch / Facility</th>
                      <th className="py-2.5 px-4 text-left">Manager In-Charge</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.masters.costCentres
                      .filter(
                        c =>
                          c.name.toLowerCase().includes(masterSearch.toLowerCase()) ||
                          c.code.toLowerCase().includes(masterSearch.toLowerCase()) ||
                          c.branch.toLowerCase().includes(masterSearch.toLowerCase())
                      )
                      .map(cc => (
                        <tr key={cc.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{cc.code}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-800">{cc.name}</td>
                          <td className="py-2.5 px-4 text-slate-600">{cc.branch}</td>
                          <td className="py-2.5 px-4 text-slate-700">{cc.manager}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                cc.active
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {cc.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => onToggleCostCentre(cc.id)}
                              className="text-xs text-slate-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-slate-100"
                            >
                              {cc.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. BANK ACCOUNTS */}
            {masterCategory === 'bankAccounts' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Bank Name</th>
                      <th className="py-2.5 px-4 text-left">Account Number</th>
                      <th className="py-2.5 px-4 text-left">IFSC Code</th>
                      <th className="py-2.5 px-4 text-left">Facility Type</th>
                      <th className="py-2.5 px-4 text-right">Opening Balance</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.masters.bankAccounts
                      .filter(
                        b =>
                          b.bankName.toLowerCase().includes(masterSearch.toLowerCase()) ||
                          b.ifsc.toLowerCase().includes(masterSearch.toLowerCase())
                      )
                      .map(ba => (
                        <tr key={ba.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{ba.bankName}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-700">{ba.accountNumberMasked}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-600">{ba.ifsc}</td>
                          <td className="py-2.5 px-4">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium">
                              {ba.accountType}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                            {formatINR(ba.openingBalance)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                ba.active
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {ba.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => onToggleBankAccount(ba.id)}
                              className="text-xs text-slate-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-slate-100"
                            >
                              {ba.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 6. DOCUMENT SERIES */}
            {masterCategory === 'docSeries' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Document Type</th>
                      <th className="py-2.5 px-4 text-left">Prefix</th>
                      <th className="py-2.5 px-4 text-center">Start No</th>
                      <th className="py-2.5 px-4 text-center">Current No</th>
                      <th className="py-2.5 px-4 text-left">FY Suffix</th>
                      <th className="py-2.5 px-4 text-left">Sample Generated Number</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.masters.docSeries
                      .filter(
                        d =>
                          d.docType.toLowerCase().includes(masterSearch.toLowerCase()) ||
                          d.prefix.toLowerCase().includes(masterSearch.toLowerCase())
                      )
                      .map(ds => (
                        <tr key={ds.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{ds.docType}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-teal-700">{ds.prefix}</td>
                          <td className="py-2.5 px-4 text-center font-mono text-slate-600">{ds.startingNumber}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800">{ds.currentNumber}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-500">{ds.fySuffix}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-900 bg-slate-50/60 font-medium">
                            {ds.prefix}{ds.currentNumber}{ds.fySuffix}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                ds.active
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {ds.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => onToggleDocSeries(ds.id)}
                              className="text-xs text-slate-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-slate-100"
                            >
                              {ds.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 7. PARTIES / CONTACTS */}
            {masterCategory === 'parties' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Trade Name</th>
                      <th className="py-2.5 px-4 text-left">Role</th>
                      <th className="py-2.5 px-4 text-left">GSTIN</th>
                      <th className="py-2.5 px-4 text-left">Phone</th>
                      <th className="py-2.5 px-4 text-center">Credit Days</th>
                      <th className="py-2.5 px-4 text-right">Credit Limit</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.masters.parties
                      .filter(
                        p =>
                          p.name.toLowerCase().includes(masterSearch.toLowerCase()) ||
                          p.gstin.toLowerCase().includes(masterSearch.toLowerCase()) ||
                          p.phone.includes(masterSearch)
                      )
                      .map(party => (
                        <tr key={party.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            <div>{party.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{party.legalName}</div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                party.partyType === 'CUSTOMER'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {party.partyType}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-800">{party.gstin}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-600">{party.phone}</td>
                          <td className="py-2.5 px-4 text-center font-mono">{party.creditDays}d</td>
                          <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900">
                            {party.creditLimit > 0 ? formatINR(party.creditLimit) : '–'}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                party.active
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {party.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => onToggleParty(party.id)}
                              className="text-xs text-slate-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-slate-100"
                            >
                              {party.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: DATABASE & CONCURRENCY (MOVED FROM ROOT TAB INTO SETTINGS)
          ========================================================================= */}
      {mainTab === 'db' && (
        <div className="space-y-6">
          {/* Top Banner & Telemetry */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs border border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-inner">
                  <Database className="w-5 h-5 text-teal-100" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    High-Concurrency Node.js &amp; PostgreSQL Backend
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Engineered for sub-millisecond read/write latency, ACID double-entry invariants, and non-blocking worker pools.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRunBenchmarkTest(500)}
                  disabled={isRunningTest}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isRunningTest ? 'Running Stress Test...' : 'Simulate 500 Concurrent Ops'}</span>
                </button>
              </div>
            </div>

            {/* Live Telemetry KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 font-mono uppercase block">Active PG Pool Size</span>
                <span className="font-mono text-base font-bold text-white">
                  {state.metrics.activePoolConnections} / {state.metrics.maxPoolSize}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-mono uppercase block">Throughput (TPS)</span>
                <span className="font-mono text-base font-bold text-teal-400">
                  {state.metrics.transactionsPerSecond.toLocaleString()} TPS
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-mono uppercase block">Avg Lock Wait</span>
                <span className="font-mono text-base font-bold text-emerald-400">
                  {state.metrics.avgLockWaitMs} ms
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-mono uppercase block">Idempotency Deduplications</span>
                <span className="font-mono text-base font-bold text-purple-400">
                  {state.metrics.idempotentDeduplications}
                </span>
              </div>
            </div>
          </div>

          {/* Sub Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200">
            <button
              onClick={() => setDbSubTab('architecture')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
                dbSubTab === 'architecture'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              High-Concurrency Strategies
            </button>
            <button
              onClick={() => setDbSubTab('schema')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
                dbSubTab === 'schema'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              PostgreSQL DDL &amp; Partitioning
            </button>
            <button
              onClick={() => setDbSubTab('benchmark')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
                dbSubTab === 'benchmark'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Concurrency Benchmark Runner
            </button>
          </div>

          {/* Sub Tab 1: Architecture Pillars */}
          {dbSubTab === 'architecture' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-wider">
                  <Layers className="w-4 h-4" />
                  <span>1. Monthly Range Partitioning</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">Partitioned Tables for Documents &amp; Journals</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tables holding invoices (<code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">documents</code>) and general ledger lines (<code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">journal_lines</code>) are partitioned by month on <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">created_at</code>. This isolates active fiscal periods from historical data, preventing index bloat and maintaining constant query times.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
                  <Lock className="w-4 h-4" />
                  <span>2. Optimistic Concurrency Control (OCC)</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">Lock-Free Document Mutations via Versioning</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every financial record contains a <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">lock_version</code> column. Concurrent updates verify <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">WHERE id = $1 AND lock_version = $2</code>. In case of conflicting edits, retries are handled with bounded jitter without blocking other threads.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
                  <Cpu className="w-4 h-4" />
                  <span>3. Row-Level Locks with SKIP LOCKED</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">Deadlock-Free Background Processing</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Worker processes matching bank lines or running OCR extraction poll jobs using <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">SELECT ... FOR UPDATE SKIP LOCKED</code>. Multiple worker pods process statement batches simultaneously without waiting or deadlocking.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-purple-700 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>4. Partial &amp; BRIN Indexing</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">Targeted Index Memory Footprint</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Approver queues use partial index <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">WHERE status = 'AWAITING_APPROVAL'</code>, indexing only 0.1% of active records. High-frequency audit trails use Block Range Indexing (BRIN), keeping index storage under 1% of table size.
                </p>
              </div>
            </div>
          )}

          {/* Sub Tab 2: Schema Viewer */}
          {dbSubTab === 'schema' && (
            <div className="bg-slate-950 text-slate-200 rounded-xl p-5 border border-slate-800 font-mono text-xs overflow-x-auto shadow-inner">
              <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-800 text-[11px] text-slate-400">
                <span>File: src/db/schema.sql (PostgreSQL 16 Enterprise)</span>
                <span className="text-teal-400">Range Partitioned &amp; Indexed</span>
              </div>
              <pre className="text-emerald-300 leading-relaxed whitespace-pre font-mono">
                {schemaSnippet}
              </pre>
            </div>
          )}

          {/* Sub Tab 3: Benchmark Runner */}
          {dbSubTab === 'benchmark' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Real-Time Concurrency &amp; Throughput Stress Simulator
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Executes burst parallel transactions through the Node.js state machine with conflict retry handling.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunBenchmarkTest(200)}
                    disabled={isRunningTest}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md border border-slate-300"
                  >
                    200 Ops
                  </button>
                  <button
                    onClick={() => handleRunBenchmarkTest(1000)}
                    disabled={isRunningTest}
                    className="px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-md shadow-xs"
                  >
                    1,000 Ops
                  </button>
                </div>
              </div>

              {testResult && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-teal-900 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-teal-700" />
                    <span>Stress Benchmark Completed Successfully!</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-teal-800 font-mono">
                    <div>
                      <span className="text-[10px] text-teal-600 block">Total Transactions</span>
                      <span className="font-bold text-sm">{testResult.totalTransactions}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-teal-600 block">Resolved Latency</span>
                      <span className="font-bold text-sm">{testResult.durationMs} ms</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-teal-600 block">Throughput Rate</span>
                      <span className="font-bold text-sm text-teal-900">{testResult.effectiveTps.toLocaleString()} TPS</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-teal-600 block">OCC Conflicts Resolved</span>
                      <span className="font-bold text-sm">{testResult.conflictsHandled}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: COMPANY ONBOARDING & STATUTORY SETUP
          ========================================================================= */}
      {mainTab === 'company' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
            <Building className="w-5 h-5 text-teal-700" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Company Onboarding &amp; Statutory Setup
              </h3>
              <p className="text-xs text-slate-500">
                Configure master business entity details, primary GSTIN registration, and approval thresholds.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="mb-4 p-3 bg-teal-50 border border-teal-200 text-teal-800 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Company setup and limits saved successfully.</span>
            </div>
          )}

          <form onSubmit={handleSaveCompany} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Legal Business Name
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={e => setLegalName(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Primary GSTIN (15 chars)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={e => setGstin(e.target.value.toUpperCase())}
                  maxLength={15}
                  className="w-full text-xs p-2 border border-slate-300 rounded-md uppercase font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Active Financial Year
                </label>
                <input
                  type="text"
                  value={fy}
                  onChange={e => setFy(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Industry Profile
                </label>
                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value as any)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-md"
                >
                  <option value="Trading">Trading &amp; Wholesale</option>
                  <option value="Manufacturing">Manufacturing &amp; Processing</option>
                  <option value="Services">Consulting &amp; IT Services</option>
                  <option value="Distribution">Supply Chain &amp; Distribution</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Approver Limit per Bill (₹)
                </label>
                <input
                  type="number"
                  value={limit}
                  onChange={e => setLimit(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-md font-mono"
                />
                <span className="text-[11px] text-slate-400 block mt-0.5">Bills above this require Owner sign-off</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md shadow-xs"
              >
                Save Company Setup
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 4: USERS & RBAC
          ========================================================================= */}
      {mainTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-700" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Role-Based Access Control (RBAC) &amp; Team Management
              </h4>
            </div>
            <span className="text-xs text-slate-500 font-mono">{state.users.length} configured profiles</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-600 text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 text-left">Member Name</th>
                  <th className="py-2.5 px-4 text-left">Email Address</th>
                  <th className="py-2.5 px-4 text-left">Assigned Role</th>
                  <th className="py-2.5 px-4 text-center">Access Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {state.users.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-800">{u.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">{roleLabels[u.role] || u.role}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                          u.active
                            ? 'bg-teal-50 text-teal-800 border-teal-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {u.active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {idx === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">Primary Owner</span>
                      ) : (
                        <button
                          onClick={() => onToggleUser(idx)}
                          className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors"
                        >
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add New Team User Form */}
          <form onSubmit={handleAddUser} className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2.5 items-center">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Full Name (e.g. Ramesh Shah)"
              className="text-xs p-2 bg-white border border-slate-300 rounded-md flex-1 min-w-[160px]"
            />
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="Email (e.g. ramesh@sampletraders.in)"
              className="text-xs p-2 bg-white border border-slate-300 rounded-md flex-1 min-w-[200px]"
            />
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value as UserRole)}
              className="text-xs p-2 bg-white border border-slate-300 rounded-md"
            >
              <option value="owner">Owner / Admin</option>
              <option value="fin">Finance Executive</option>
              <option value="col">Collections Executive</option>
              <option value="app">Approver</option>
            </select>
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md flex items-center gap-1.5 shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 5: AUDIT TRAIL
          ========================================================================= */}
      {mainTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-teal-700" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Comprehensive Audit Trail (Immutable)
              </h4>
            </div>
            <span className="text-xs text-slate-400 font-mono">Row-Level Traceability</span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
            {state.auditLogs.map(log => (
              <div key={log.id} className="p-3 hover:bg-slate-50 flex items-start justify-between gap-4">
                <div>
                  <span className="font-semibold text-slate-800">{log.user}: </span>
                  <span className="text-slate-600">{log.action}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono shrink-0">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD NEW MASTER RECORD
          ========================================================================= */}
      {showAddMasterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Add New {masterCategory === 'accounts' ? 'Account Master' : masterCategory === 'items' ? 'Item / Service Master' : masterCategory === 'taxCodes' ? 'Tax Code Master' : masterCategory === 'costCentres' ? 'Cost Centre Master' : masterCategory === 'bankAccounts' ? 'Bank Account Master' : masterCategory === 'docSeries' ? 'Document Series Master' : 'Party Master'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddMasterModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMaster} className="space-y-3.5">
              {/* ACCOUNTS FORM */}
              {masterCategory === 'accounts' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Account Code</label>
                      <input
                        type="text"
                        value={newAccountCode}
                        onChange={e => setNewAccountCode(e.target.value)}
                        placeholder="e.g. 5060"
                        className="w-full text-xs p-2 border border-slate-300 rounded font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Account Group</label>
                      <select
                        value={newAccountGroup}
                        onChange={e => setNewAccountGroup(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-300 rounded"
                      >
                        <option value="Revenue">Revenue</option>
                        <option value="Direct Expenses">Direct Expenses</option>
                        <option value="Indirect Expenses">Indirect Expenses</option>
                        <option value="Current Assets">Current Assets</option>
                        <option value="Current Liabilities">Current Liabilities</option>
                        <option value="Bank Accounts">Bank Accounts</option>
                        <option value="Equity">Equity</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Account Name / Ledger</label>
                    <input
                      type="text"
                      value={newAccountName}
                      onChange={e => setNewAccountName(e.target.value)}
                      placeholder="e.g. Cloud Hosting &amp; Server Infrastructure"
                      className="w-full text-xs p-2 border border-slate-300 rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Accounting Classification</label>
                    <select
                      value={newAccountType}
                      onChange={e => setNewAccountType(e.target.value as any)}
                      className="w-full text-xs p-2 border border-slate-300 rounded"
                    >
                      <option value="EXPENSE">EXPENSE</option>
                      <option value="INCOME">INCOME</option>
                      <option value="ASSET">ASSET</option>
                      <option value="LIABILITY">LIABILITY</option>
                      <option value="EQUITY">EQUITY</option>
                    </select>
                  </div>
                </>
              )}

              {/* ITEMS FORM */}
              {masterCategory === 'items' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Item Code</label>
                      <input
                        type="text"
                        value={newItemCode}
                        onChange={e => setNewItemCode(e.target.value)}
                        placeholder="e.g. ITM-009"
                        className="w-full text-xs p-2 border border-slate-300 rounded font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">HSN / SAC Code</label>
                      <input
                        type="text"
                        value={newItemHsn}
                        onChange={e => setNewItemHsn(e.target.value)}
                        placeholder="e.g. 3901"
                        className="w-full text-xs p-2 border border-slate-300 rounded font-mono"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Description</label>
                    <input
                      type="text"
                      value={newItemDesc}
                      onChange={e => setNewItemDesc(e.target.value)}
                      placeholder="e.g. Polypropylene Granules Grade A"
                      className="w-full text-xs p-2 border border-slate-300 rounded"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Unit of Measure</label>
                      <select
                        value={newItemUnit}
                        onChange={e => setNewItemUnit(e.target.value as any)}
                        className="w-full text-xs p-2 border border-slate-300 rounded"
                      >
                        <option value="KGS">KGS</option>
                        <option value="PCS">PCS</option>
                        <option value="BOX">BOX</option>
                        <option value="MTR">MTR</option>
                        <option value="NOS">NOS</option>
                        <option value="HRS">HRS</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">GST Rate (%)</label>
                      <input
                        type="number"
                        value={newItemRate}
                        onChange={e => setNewItemRate(Number(e.target.value))}
                        className="w-full text-xs p-2 border border-slate-300 rounded font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Default Ledger</label>
                      <input
                        type="text"
                        value={newItemLedger}
                        onChange={e => setNewItemLedger(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-300 rounded"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* TAX CODES FORM */}
              {masterCategory === 'taxCodes' && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tax Code Name</label>
                    <input
                      type="text"
                      value={newTaxName}
                      onChange={e => setNewTaxName(e.target.value)}
                      placeholder="e.g. GST 18% (Electronics &amp; IT)"
                      className="w-full text-xs p-2 border border-slate-300 rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">GST Total Rate (%)</label>
                    <input
                      type="number"
                      value={newTaxRate}
                      onChange={e => setNewTaxRate(Number(e.target.value))}
                      className="w-full text-xs p-2 border border-slate-300 rounded font-mono"
                      required
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      CGST ({newTaxRate / 2}%) + SGST ({newTaxRate / 2}%) or IGST ({newTaxRate}%)
                    </span>
                  </div>
                </>
              )}

              {/* COST CENTRES FORM */}
              {masterCategory === 'costCentres' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Code</label>
                      <input
                        type="text"
                        value={newCcCode}
                        onChange={e => setNewCcCode(e.target.value)}
                        placeholder="e.g. CC-BLR"
                        className="w-full text-xs p-2 border border-slate-300 rounded font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Branch / Location</label>
                      <input
                        type="text"
                        value={newCcBranch}
                        onChange={e => setNewCcBranch(e.target.value)}
                        placeholder="e.g. Bengaluru Tech Hub"
                        className="w-full text-xs p-2 border border-slate-300 rounded"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Cost Centre Name</label>
                    <input
                      type="text"
                      value={newCcName}
                      onChange={e => setNewCcName(e.target.value)}
                      placeholder="e.g. South Region Enterprise Operations"
                      className="w-full text-xs p-2 border border-slate-300 rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Manager In-Charge</label>
                    <input
                      type="text"
                      value={newCcManager}
                      onChange={e => setNewCcManager(e.target.value)}
                      placeholder="e.g. Neha Kapoor"
                      className="w-full text-xs p-2 border border-slate-300 rounded"
                    />
                  </div>
                </>
              )}

              {/* BANK ACCOUNTS FORM */}
              {masterCategory === 'bankAccounts' && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Bank Name &amp; Branch</label>
                    <input
                      type="text"
                      value={newBankName}
                      onChange={e => setNewBankName(e.target.value)}
                      placeholder="e.g. Axis Bank Current A/c"
                      className="w-full text-xs p-2 border border-slate-300 rounded"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Account Number (Masked)</label>
                      <input
                        type="text"
                        value={newBankAccNo}
                        onChange={e => setNewBankAccNo(e.target.value)}
                        placeholder="XXXX-XXXX-1234"
                        className="w-full text-xs p-2 border border-slate-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={newBankIfsc}
                        onChange={e => setNewBankIfsc(e.target.value.toUpperCase())}
                        placeholder="UTIB0000452"
                        className="w-full text-xs p-2 border border-slate-300 rounded uppercase font-mono"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Facility Type</label>
                      <select
                        value={newBankType}
                        onChange={e => setNewBankType(e.target.value as any)}
                        className="w-full text-xs p-2 border border-slate-300 rounded"
                      >
                        <option value="Current">Current</option>
                        <option value="Cash Credit (CC)">Cash Credit (CC)</option>
                        <option value="Overdraft (OD)">Overdraft (OD)</option>
                        <option value="Savings">Savings</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Opening Balance (₹)</label>
                      <input
                        type="number"
                        value={newBankBal}
                        onChange={e => setNewBankBal(Number(e.target.value))}
                        className="w-full text-xs p-2 border border-slate-300 rounded font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* DOCUMENT SERIES FORM */}
              {masterCategory === 'docSeries' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Document Type</label>
                      <select
                        value={newDsType}
                        onChange={e => setNewDsType(e.target.value as DocumentType)}
                        className="w-full text-xs p-2 border border-slate-300 rounded"
                      >
                        <option value="Sales Invoice">Sales Invoice</option>
                        <option value="Purchase Invoice">Purchase Invoice</option>
                        <option value="Credit Note">Credit Note</option>
                        <option value="Debit Note">Debit Note</option>
                        <option value="Expense Voucher">Expense Voucher</option>
                        <option value="Bank Statement">Bank Statement</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Prefix</label>
                      <input
                        type="text"
                        value={newDsPrefix}
                        onChange={e => setNewDsPrefix(e.target.value.toUpperCase())}
                        placeholder="e.g. INV-EXP-"
                        className="w-full text-xs p-2 border border-slate-300 rounded font-mono uppercase"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Starting Sequence Number</label>
                    <input
                      type="number"
                      value={newDsStart}
                      onChange={e => setNewDsStart(Number(e.target.value))}
                      className="w-full text-xs p-2 border border-slate-300 rounded font-mono"
                      required
                    />
                  </div>
                </>
              )}

              {/* PARTIES FORM */}
              {masterCategory === 'parties' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Party Name</label>
                      <input
                        type="text"
                        value={newPartyName}
                        onChange={e => setNewPartyName(e.target.value)}
                        placeholder="e.g. Sterling Polyplast"
                        className="w-full text-xs p-2 border border-slate-300 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Party Role</label>
                      <select
                        value={newPartyType}
                        onChange={e => setNewPartyType(e.target.value as any)}
                        className="w-full text-xs p-2 border border-slate-300 rounded"
                      >
                        <option value="CUSTOMER">Customer (Receivables)</option>
                        <option value="SUPPLIER">Supplier / Vendor (Payables)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">GSTIN (15 chars)</label>
                      <input
                        type="text"
                        value={newPartyGstin}
                        onChange={e => setNewPartyGstin(e.target.value.toUpperCase())}
                        placeholder="06AABCS1234F1Z5"
                        maxLength={15}
                        className="w-full text-xs p-2 border border-slate-300 rounded font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={newPartyPhone}
                        onChange={e => setNewPartyPhone(e.target.value)}
                        placeholder="+91 98123 45678"
                        className="w-full text-xs p-2 border border-slate-300 rounded font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Standard Credit Terms (Days)</label>
                    <input
                      type="number"
                      value={newPartyDays}
                      onChange={e => setNewPartyDays(Number(e.target.value))}
                      className="w-full text-xs p-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMasterModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md shadow-xs"
                >
                  Save Master Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
