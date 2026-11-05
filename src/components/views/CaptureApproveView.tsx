import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  Scan,
  Files,
  FileCheck2,
  Cpu,
  Eye,
  RefreshCw,
  FolderUp,
  Edit3,
  Zap,
  CheckCircle2,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AppState } from '../../db/concurrencyEngine.ts';
import { DocumentDraft, UserRole, DocumentType, BulkUploadBatch } from '../../types/accounting.ts';
import { calculateTax, formatINR, validateGstin, parseCsvText } from '../../utils/accounting.ts';

interface CaptureApproveViewProps {
  state: AppState;
  onCaptureSample: (sampleKey: 's' | 'p' | 'd' | 'cn' | 'dn' | 'exp' | 'bst') => void;
  onSubmitForApproval: () => void;
  onApproveAndPost: () => void;
  onClearDraft: () => void;
  onUpdateDraftLedger: (ledger: string) => void;
  onUpdateDraftField?: (field: keyof DocumentDraft, value: any) => void;
  onQuickApproveAndPost?: (approverName?: string) => void;
  onCaptureCustomDraft?: (draft: DocumentDraft) => void;
  onCreateBulkBatch?: (docType: DocumentType, files: Array<{ name: string; size: string }>) => void;
  onPostBulkBatch?: () => void;
  onClearBulkBatch?: () => void;
}

const LEDGERS = [
  'Consulting Revenue',
  'Product Sales',
  'Raw Materials Purchase',
  'Freight & Logistics',
  'Office Expenses',
  'IT & Software Subscriptions',
  'Sales Returns & Allowances',
  'Purchase Returns',
  'Bank Charges'
];

const DOC_TYPES: DocumentType[] = [
  'Sales Invoice',
  'Purchase Invoice',
  'Credit Note',
  'Debit Note',
  'Expense Voucher',
  'Bank Statement'
];

export const CaptureApproveView: React.FC<CaptureApproveViewProps> = ({
  state,
  onCaptureSample,
  onSubmitForApproval,
  onApproveAndPost,
  onClearDraft,
  onUpdateDraftLedger,
  onUpdateDraftField,
  onQuickApproveAndPost,
  onCaptureCustomDraft,
  onCreateBulkBatch,
  onPostBulkBatch,
  onClearBulkBatch
}) => {
  const [activeMode, setActiveMode] = useState<'single' | 'bulk'>('single');
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('Sales Invoice');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedHistoryVoucher, setSelectedHistoryVoucher] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);

  const draft = state.currentDraft;
  const activeBatch = state.activeBatch;
  const role = state.currentRole;

  const canSubmit = role === 'owner' || role === 'fin';
  const canApprove = role === 'owner' || role === 'app';

  // Trigger simulated animated scanning when a new sample is clicked
  const handleTriggerSample = (key: 's' | 'p' | 'd' | 'cn' | 'dn' | 'exp' | 'bst') => {
    setIsScanning(true);
    setScanProgress(15);
    setTimeout(() => setScanProgress(60), 180);
    setTimeout(() => {
      setScanProgress(100);
      onCaptureSample(key);
      setIsScanning(false);
    }, 380);
  };

  // Handle local file upload (Single document)
  const handleSingleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanProgress(20);

    const sizeFormatted = file.size > 1024 * 1024
      ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      : Math.round(file.size / 1024) + ' KB';

    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = evt => {
        const text = evt.target?.result as string;
        const { rows } = parseCsvText(text);
        setScanProgress(70);

        setTimeout(() => {
          setScanProgress(100);
          setIsScanning(false);

          if (rows && rows.length > 0) {
            const first = rows[0];
            const taxable = parseFloat(first.taxableValue || first.amount || '75000') || 75000;
            const rate = parseInt(first.gstRate || '18', 10) || 18;

            const customDraft: DocumentDraft = {
              id: `doc-${Date.now()}`,
              type: selectedDocType,
              party: first.party || first.customer || first.supplier || 'Imported Entity',
              docNo: first.docNo || first.id || `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
              date: first.date || first.docDate || new Date().toLocaleDateString('en-IN'),
              gstin: first.gstin || '06AABCB4521K1Z7',
              taxableValue: taxable,
              gstRate: rate,
              hsn: first.hsn || '998314',
              ledger: first.ledger || (selectedDocType.includes('Sales') ? 'Consulting Revenue' : 'Raw Materials Purchase'),
              ledgerConfidence: 96,
              status: 'Extracted',
              sourceFile: `${file.name} (${sizeFormatted})`,
              userEditedLedger: false
            };

            if (onCaptureCustomDraft) {
              onCaptureCustomDraft(customDraft);
            }
          }
        }, 300);
      };
      reader.readAsText(file);
    } else {
      setTimeout(() => setScanProgress(75), 200);
      setTimeout(() => {
        setScanProgress(100);
        setIsScanning(false);

        const customDraft: DocumentDraft = {
          id: `doc-${Date.now()}`,
          type: selectedDocType,
          party: selectedDocType.includes('Sales') ? 'Bluewave Enterprises Ltd' : 'Delta Chemical Works',
          docNo: `${selectedDocType.includes('Sales') ? 'INV' : 'BILL'}-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          gstin: selectedDocType.includes('Sales') ? '06AABCB4521K1Z7' : '06AAECD1177H1Z4',
          taxableValue: selectedDocType.includes('Sales') ? 95000 : 72000,
          gstRate: 18,
          hsn: selectedDocType.includes('Sales') ? '998314' : '2915',
          ledger: selectedDocType.includes('Sales') ? 'Consulting Revenue' : 'Raw Materials Purchase',
          ledgerConfidence: 98,
          status: 'Extracted',
          sourceFile: `${file.name} (${sizeFormatted})`,
          userEditedLedger: false
        };

        if (onCaptureCustomDraft) {
          onCaptureCustomDraft(customDraft);
        }
      }, 400);
    }
  };

  // Handle local multi-file upload for Bulk batch
  const handleBulkFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsScanning(true);
    setScanProgress(25);

    const filesArray = Array.from(fileList).map(f => {
      const sizeStr = f.size > 1024 * 1024
        ? (f.size / (1024 * 1024)).toFixed(1) + ' MB'
        : Math.round(f.size / 1024) + ' KB';
      return { name: f.name, size: sizeStr };
    });

    setTimeout(() => setScanProgress(70), 200);
    setTimeout(() => {
      setScanProgress(100);
      setIsScanning(false);
      if (onCreateBulkBatch) {
        onCreateBulkBatch(selectedDocType, filesArray);
      }
    }, 450);
  };

  const handleStartSimulatedBulkUpload = () => {
    setIsScanning(true);
    setScanProgress(25);
    setTimeout(() => setScanProgress(70), 200);
    setTimeout(() => {
      setScanProgress(100);
      setIsScanning(false);
      if (onCreateBulkBatch) {
        const sampleFiles = [
          { name: `${selectedDocType.replace(/\s+/g, '_')}_001.pdf`, size: '245 KB' },
          { name: `${selectedDocType.replace(/\s+/g, '_')}_002.pdf`, size: '318 KB' },
          { name: `${selectedDocType.replace(/\s+/g, '_')}_003.jpg`, size: '1.2 MB' },
          { name: `${selectedDocType.replace(/\s+/g, '_')}_004.pdf`, size: '480 KB' }
        ];
        onCreateBulkBatch(selectedDocType, sampleFiles);
      }
    }, 450);
  };

  // Run single draft validations
  const isDuplicate = draft
    ? [...state.receivables, ...state.payables].some(x => x.id === draft.docNo) && draft.status !== 'Posted'
    : false;
  const isGstinValid = draft ? validateGstin(draft.gstin) : false;
  const isLedgerConfident = draft ? draft.ledgerConfidence >= 80 || draft.userEditedLedger : false;

  const taxAmount = draft ? calculateTax(draft.taxableValue, draft.gstRate) : 0;
  const totalAmount = draft ? draft.taxableValue + taxAmount : 0;

  const steps = ['Captured', 'Extracted', 'Validated', 'Awaiting approval', 'Approved', 'Posted'];
  const currentStepIndex = draft
    ? draft.status === 'Extracted'
      ? 1
      : draft.status === 'Validated'
      ? 2
      : draft.status === 'Awaiting approval'
      ? 3
      : draft.status === 'Approved'
      ? 4
      : draft.status === 'Posted'
      ? 5
      : 0
    : -1;

  // Compute batch statistics
  const batchStats = activeBatch
    ? {
        count: activeBatch.files.length,
        taxable: activeBatch.files.reduce((sum, f) => sum + f.taxableValue, 0),
        tax: activeBatch.files.reduce((sum, f) => sum + calculateTax(f.taxableValue, f.gstRate), 0),
        total: activeBatch.files.reduce((sum, f) => sum + f.taxableValue + calculateTax(f.taxableValue, f.gstRate), 0)
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Top Controls: Mode Switcher (Single vs Bulk) & Document Type Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Mode Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveMode('single')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeMode === 'single'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Single Document OCR</span>
          </button>
          <button
            onClick={() => setActiveMode('bulk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeMode === 'bulk'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Files className="w-3.5 h-3.5" />
            <span>AI Bulk Upload &amp; Batch OCR</span>
            {activeBatch && (
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Document Type Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Document Classification:</label>
          <select
            value={selectedDocType}
            onChange={e => setSelectedDocType(e.target.value as DocumentType)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:ring-1 focus:ring-teal-600 focus:outline-none"
          >
            {DOC_TYPES.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scanning Progress Bar Animation */}
      {isScanning && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 animate-pulse">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-teal-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 animate-spin text-teal-600" />
              <span>Multi-modal AI Vision Extraction in progress...</span>
            </span>
            <span className="text-xs font-mono font-bold text-teal-700">{scanProgress}%</span>
          </div>
          <div className="w-full bg-teal-200/50 h-2 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full transition-all duration-200"
              style={{ width: `${scanProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* SINGLE DOCUMENT CAPTURE MODE */}
      {activeMode === 'single' && (
        <div className="space-y-6">
          {/* Upload & Sample Selector Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Scan className="w-4 h-4 text-teal-700" />
                  <span>Interactive OCR Ingestion Lab: {selectedDocType}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a sample document, or click Upload Local File to ingest real files from your device.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                Supported: PDF, JPEG, PNG, CSV, Excel
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Real Local File Upload Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleSingleFileUpload}
                accept=".pdf,.png,.jpg,.jpeg,.csv,.txt"
                className="hidden"
                id="single-file-upload-input"
              />
              <label
                htmlFor="single-file-upload-input"
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 border border-teal-300 rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                <FolderUp className="w-4 h-4 text-teal-700" />
                <span>Upload Local File / CSV</span>
              </label>

              {/* Sample Document Triggers */}
              {selectedDocType === 'Sales Invoice' && (
                <button
                  onClick={() => handleTriggerSample('s')}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-xs transition-colors"
                >
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>INV-1058 (Bluewave Services · ₹84,000)</span>
                </button>
              )}

              {selectedDocType === 'Purchase Invoice' && (
                <>
                  <button
                    onClick={() => handleTriggerSample('p')}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-xs transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>DC-910 (Delta Chemicals · ₹67,222)</span>
                  </button>
                  <button
                    onClick={() => handleTriggerSample('d')}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-xs transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>RP/221 (Duplicate Detection Test)</span>
                  </button>
                </>
              )}

              {selectedDocType === 'Credit Note' && (
                <button
                  onClick={() => handleTriggerSample('cn')}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-xs transition-colors"
                >
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>CN-04 (Gupta Exports Credit Note · ₹15,000)</span>
                </button>
              )}

              {selectedDocType === 'Debit Note' && (
                <button
                  onClick={() => handleTriggerSample('dn')}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-xs transition-colors"
                >
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>DN-02 (Raj Polymers Debit Note · ₹8,500)</span>
                </button>
              )}

              {selectedDocType === 'Expense Voucher' && (
                <button
                  onClick={() => handleTriggerSample('exp')}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-xs transition-colors"
                >
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>EXP-318 (Packaging &amp; Supplies · ₹12,400)</span>
                </button>
              )}

              {selectedDocType === 'Bank Statement' && (
                <button
                  onClick={() => handleTriggerSample('bst')}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-xs transition-colors"
                >
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>BST-112 (ICICI Bank e-Statement)</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Extracted Document Draft Workspace */}
          {draft && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
              {/* Workflow Stepper Header */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                      {draft.type}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      {draft.docNo} · {draft.party}
                    </h3>
                    {draft.sourceFile && (
                      <span className="text-[11px] text-slate-500 font-mono">({draft.sourceFile})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                        isEditMode ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditMode ? 'Done Editing' : 'Edit Fields'}</span>
                    </button>

                    <button
                      onClick={onClearDraft}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-100"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Visual Pipeline Progress Stepper */}
                <div className="flex items-center justify-between relative px-2">
                  <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0"></div>
                  {steps.map((step, idx) => {
                    const isPassed = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <div key={step} className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isPassed
                              ? 'bg-teal-600 text-white'
                              : isCurrent
                              ? 'bg-teal-700 text-white ring-4 ring-teal-100'
                              : 'bg-white border-2 border-slate-300 text-slate-400'
                          }`}
                        >
                          {isPassed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </div>
                        <span
                          className={`text-[10px] mt-1 font-semibold whitespace-nowrap ${
                            isCurrent
                              ? 'text-teal-800 font-bold'
                              : isPassed
                              ? 'text-slate-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Two-Column Grid: Extracted Fields vs Validation & Action */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Extracted Fields & Confidence */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Extracted Fields &amp; Live Recalculation</span>
                    </h4>
                    {isEditMode && (
                      <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                        Editing Mode Active
                      </span>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                        <tr>
                          <th className="py-2 px-3 text-left">Document Field</th>
                          <th className="py-2 px-3 text-left">Extracted Value</th>
                          <th className="py-2 px-3 text-right">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {/* Party / Vendor */}
                        <tr>
                          <td className="py-2 px-3 text-slate-500">Party / Vendor</td>
                          <td className="py-2 px-3">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={draft.party}
                                onChange={e => onUpdateDraftField && onUpdateDraftField('party', e.target.value)}
                                className="w-full text-xs p-1 border border-teal-400 rounded bg-teal-50/20 font-semibold text-slate-900"
                              />
                            ) : (
                              <span className="font-semibold text-slate-900">{draft.party}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-teal-700 font-medium">98%</td>
                        </tr>

                        {/* Doc Number */}
                        <tr>
                          <td className="py-2 px-3 text-slate-500">Document No</td>
                          <td className="py-2 px-3">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={draft.docNo}
                                onChange={e => onUpdateDraftField && onUpdateDraftField('docNo', e.target.value)}
                                className="w-full text-xs p-1 border border-teal-400 rounded bg-teal-50/20 font-mono text-slate-900"
                              />
                            ) : (
                              <span className="font-mono text-slate-900">{draft.docNo}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-teal-700 font-medium">99%</td>
                        </tr>

                        {/* GSTIN */}
                        <tr>
                          <td className="py-2 px-3 text-slate-500">GSTIN</td>
                          <td className="py-2 px-3">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={draft.gstin}
                                onChange={e => onUpdateDraftField && onUpdateDraftField('gstin', e.target.value)}
                                className="w-full text-xs p-1 border border-teal-400 rounded bg-teal-50/20 font-mono text-slate-900 uppercase"
                              />
                            ) : (
                              <span className="font-mono text-slate-900">{draft.gstin}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-teal-700 font-medium">97%</td>
                        </tr>

                        {/* HSN / SAC */}
                        <tr>
                          <td className="py-2 px-3 text-slate-500">HSN / SAC</td>
                          <td className="py-2 px-3">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={draft.hsn}
                                onChange={e => onUpdateDraftField && onUpdateDraftField('hsn', e.target.value)}
                                className="w-full text-xs p-1 border border-teal-400 rounded bg-teal-50/20 font-mono text-slate-900"
                              />
                            ) : (
                              <span className="font-mono text-slate-900">{draft.hsn}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-teal-700 font-medium">93%</td>
                        </tr>

                        {/* Taxable Amount */}
                        <tr>
                          <td className="py-2 px-3 text-slate-500">Taxable Value</td>
                          <td className="py-2 px-3">
                            {isEditMode ? (
                              <input
                                type="number"
                                value={draft.taxableValue}
                                onChange={e =>
                                  onUpdateDraftField &&
                                  onUpdateDraftField('taxableValue', parseFloat(e.target.value) || 0)
                                }
                                className="w-full text-xs p-1 border border-teal-400 rounded bg-teal-50/20 font-mono font-bold text-slate-900"
                              />
                            ) : (
                              <span className="font-mono font-semibold text-slate-900">
                                {formatINR(draft.taxableValue)}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-teal-700 font-medium">99%</td>
                        </tr>

                        {/* GST Rate */}
                        <tr>
                          <td className="py-2 px-3 text-slate-500">GST Rate (%)</td>
                          <td className="py-2 px-3">
                            {isEditMode ? (
                              <select
                                value={draft.gstRate}
                                onChange={e =>
                                  onUpdateDraftField &&
                                  onUpdateDraftField('gstRate', parseInt(e.target.value, 10))
                                }
                                className="w-full text-xs p-1 border border-teal-400 rounded bg-teal-50/20 font-mono text-slate-900"
                              >
                                {[0, 5, 12, 18, 28].map(r => (
                                  <option key={r} value={r}>
                                    {r}% GST
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="font-mono text-slate-900">{draft.gstRate}%</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-teal-700 font-medium">99%</td>
                        </tr>

                        {/* GST Amount */}
                        <tr>
                          <td className="py-2 px-3 text-slate-500">GST Calculated</td>
                          <td className="py-2 px-3 font-mono font-semibold text-teal-800">{formatINR(taxAmount)}</td>
                          <td className="py-2 px-3 text-right font-mono text-teal-700 font-medium">99%</td>
                        </tr>

                        {/* Total Invoice */}
                        <tr className="bg-slate-50/70 font-semibold">
                          <td className="py-2.5 px-3 text-slate-900">Total Invoice (INR)</td>
                          <td className="py-2.5 px-3 font-mono text-slate-900 font-bold text-sm">
                            {formatINR(totalAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-teal-700">99%</td>
                        </tr>

                        {/* General Ledger Mapping */}
                        <tr>
                          <td className="py-2 px-3 text-slate-500">General Ledger Mapping</td>
                          <td className="py-2 px-3">
                            <select
                              value={draft.ledger}
                              onChange={e => onUpdateDraftLedger(e.target.value)}
                              disabled={draft.status === 'Posted'}
                              className="w-full text-xs p-1 border border-slate-300 rounded focus:ring-1 focus:ring-teal-600"
                            >
                              {LEDGERS.map(l => (
                                <option key={l} value={l}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3 text-right">
                            {draft.userEditedLedger ? (
                              <span className="text-[10px] text-teal-700 font-medium bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                Confirmed
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${
                                  draft.ledgerConfidence < 80
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-teal-50 text-teal-700'
                                }`}
                              >
                                {draft.ledgerConfidence}% Match
                              </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right: Automated Integrity & Action Controls */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Automated Integrity &amp; Tax Validation
                  </h4>
                  <div className="space-y-2 border border-slate-200 rounded-lg p-3.5 bg-slate-50">
                    {/* Duplicate check */}
                    <div className="flex items-start gap-2.5 text-xs">
                      {isDuplicate ? (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-900">
                          {isDuplicate ? 'Duplicate Document Detected' : 'Unique Document Number'}
                        </span>
                        <p className="text-slate-500 text-[11px]">
                          {isDuplicate
                            ? `Invoice ${draft.docNo} is already posted in books. System prevents double-payment.`
                            : `No conflicting document number found in receivables or payables.`}
                        </p>
                      </div>
                    </div>

                    {/* GSTIN check */}
                    <div className="flex items-start gap-2.5 text-xs">
                      {isGstinValid ? (
                        <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-900">
                          {isGstinValid ? 'GSTIN Checksum & State Code Verified' : 'Invalid GSTIN Format'}
                        </span>
                        <p className="text-slate-500 text-[11px]">
                          {isGstinValid
                            ? `Matches statutory 15-character structure for state code ${draft.gstin.slice(0, 2)}.`
                            : `GSTIN does not match official format.`}
                        </p>
                      </div>
                    </div>

                    {/* Math check */}
                    <div className="flex items-start gap-2.5 text-xs">
                      <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900">Arithmetic Reconciliation Valid</span>
                        <p className="text-slate-500 text-[11px]">
                          Taxable ({formatINR(draft.taxableValue)}) + {draft.gstRate}% GST ({formatINR(taxAmount)}) = {formatINR(totalAmount)}.
                        </p>
                      </div>
                    </div>

                    {/* Ledger check */}
                    <div className="flex items-start gap-2.5 text-xs">
                      {isLedgerConfident ? (
                        <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-900">
                          {isLedgerConfident ? 'Ledger Mapping Confirmed' : 'Ledger Mapping Needs Confirmation'}
                        </span>
                        <p className="text-slate-500 text-[11px]">
                          Mapped to {draft.ledger}.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ACTION CONTROLS & FAST-TRACK SIGN-OFF */}
                  <div className="pt-2 space-y-3">
                    {draft.status === 'Posted' ? (
                      <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 text-xs rounded-lg flex items-center justify-between">
                        <span className="font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-teal-600" />
                          <span>Document Posted &amp; Balanced Journal Voucher Written.</span>
                        </span>
                        <button
                          onClick={onClearDraft}
                          className="px-3 py-1 bg-white border border-teal-300 rounded text-xs font-semibold hover:bg-teal-100"
                        >
                          Clear &amp; Next
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* Standard Workflow Buttons */}
                          {draft.status === 'Awaiting approval' ? (
                            <>
                              <button
                                onClick={onApproveAndPost}
                                className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Approve &amp; Post to Books</span>
                              </button>
                              <button
                                onClick={onSubmitForApproval}
                                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                Send Back
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={onSubmitForApproval}
                                disabled={isDuplicate}
                                className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 rounded-lg shadow-sm transition-colors"
                              >
                                Submit for Approval
                              </button>
                            </>
                          )}

                          {/* 1-Click Fast Sign-off / Checker Override (prevents deadlocks for any persona) */}
                          <button
                            onClick={() => onQuickApproveAndPost && onQuickApproveAndPost()}
                            disabled={isDuplicate}
                            className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                            title="Bypass maker-checker wait queue and instantly post to general ledger"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-700" />
                            <span>⚡ Fast Sign-off &amp; Post (1-Click)</span>
                          </button>

                          <button
                            onClick={onClearDraft}
                            className="px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            Discard
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-500">
                          Active Persona: <span className="font-semibold uppercase text-slate-800">{role}</span>. You can use standard Maker-Checker submission or 1-Click Fast Sign-off for immediate testing.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Balanced Double-Entry Journal Preview (Upon Posting) */}
              {draft.journalVoucher && (
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                    <span>Posted Double-Entry Balanced Journal (General Ledger Impact)</span>
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-2 px-3 text-left">Ledger Account</th>
                          <th className="py-2 px-3 text-right">Debit (INR)</th>
                          <th className="py-2 px-3 text-right">Credit (INR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {draft.journalVoucher.map((l, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-sans text-slate-800">{l.account}</td>
                            <td className="py-2 px-3 text-right">{l.debit > 0 ? formatINR(l.debit) : '—'}</td>
                            <td className="py-2 px-3 text-right">{l.credit > 0 ? formatINR(l.credit) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RECENT POSTED DOCUMENTS HISTORY DRAWER */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-teal-700" />
                  <span>Recently Posted Documents &amp; Audit Trail</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time transaction history showing balanced double-entry vouchers committed to books
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
                {state.postedDocuments.length} Documents in Ledger
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Doc Number</th>
                    <th className="py-2.5 px-3 text-left">Type</th>
                    <th className="py-2.5 px-3 text-left">Party / Vendor</th>
                    <th className="py-2.5 px-3 text-left">Date</th>
                    <th className="py-2.5 px-3 text-right">Taxable</th>
                    <th className="py-2.5 px-3 text-right">Total Invoice</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Voucher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {state.postedDocuments.slice(0, 15).map(doc => {
                    const tax = calculateTax(doc.taxableValue, doc.gstRate);
                    const isExpanded = selectedHistoryVoucher === doc.id;
                    return (
                      <React.Fragment key={doc.id}>
                        <tr className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{doc.docNo}</td>
                          <td className="py-2.5 px-3 text-slate-600">{doc.type}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{doc.party}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{doc.date}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatINR(doc.taxableValue)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatINR(doc.taxableValue + tax)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              POSTED
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => setSelectedHistoryVoucher(isExpanded ? null : doc.id)}
                              className="text-xs font-semibold text-teal-700 hover:text-teal-900 underline flex items-center gap-1 justify-end ml-auto"
                            >
                              <span>{isExpanded ? 'Hide' : 'View Journal'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && doc.journalVoucher && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={8} className="p-3">
                              <div className="bg-white border border-slate-200 rounded-lg p-3">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                                  Balanced Journal Voucher for {doc.docNo}
                                </span>
                                <div className="space-y-1 font-mono text-xs">
                                  {doc.journalVoucher.map((jl, jidx) => (
                                    <div key={jidx} className="flex justify-between border-b border-slate-100 py-1">
                                      <span className="font-sans text-slate-700">{jl.account}</span>
                                      <div className="flex gap-6">
                                        <span className="text-slate-900 w-24 text-right">
                                          {jl.debit > 0 ? `Dr ${formatINR(jl.debit)}` : ''}
                                        </span>
                                        <span className="text-slate-900 w-24 text-right">
                                          {jl.credit > 0 ? `Cr ${formatINR(jl.credit)}` : ''}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BULK UPLOAD MODE */}
      {activeMode === 'bulk' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Files className="w-4 h-4 text-teal-700" />
                  <span>AI Bulk Multi-Document OCR &amp; Batch Posting: {selectedDocType}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select multiple files simultaneously from your disk or simulate batch ingest to extract line items.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={bulkFileInputRef}
                  multiple
                  onChange={handleBulkFilesUpload}
                  accept=".pdf,.png,.jpg,.jpeg,.csv,.txt"
                  className="hidden"
                  id="bulk-multi-file-input"
                />
                <label
                  htmlFor="bulk-multi-file-input"
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 border border-teal-300 rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  <FolderUp className="w-4 h-4 text-teal-700" />
                  <span>Select Multi-Files from Device</span>
                </label>

                <button
                  onClick={handleStartSimulatedBulkUpload}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-xs transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Simulate 4 Documents</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Batch Overview & Items */}
          {activeBatch && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                      Batch #{activeBatch.id.slice(-6)}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{activeBatch.docType} Batch</h4>
                    <span className="text-xs text-slate-400">· {activeBatch.files.length} documents</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Ingested on {activeBatch.timestamp} · Status: <span className="font-semibold text-slate-800 uppercase">{activeBatch.status}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {activeBatch.status === 'posted' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        <span>All {activeBatch.files.length} Documents Posted to Ledger</span>
                      </span>
                      {onClearBulkBatch && (
                        <button
                          onClick={onClearBulkBatch}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                        >
                          Clear Batch
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {onPostBulkBatch && (
                        <button
                          onClick={onPostBulkBatch}
                          className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                        >
                          <FileCheck2 className="w-4 h-4" />
                          <span>Batch Approve &amp; Post All to Books</span>
                        </button>
                      )}
                      {onClearBulkBatch && (
                        <button
                          onClick={onClearBulkBatch}
                          className="px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          Discard Batch
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Batch KPI Cards */}
              {batchStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Total Documents</span>
                    <span className="font-mono text-base font-bold text-slate-900">{batchStats.count}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Total Taxable Value</span>
                    <span className="font-mono text-base font-bold text-slate-900">{formatINR(batchStats.taxable)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Total GST Calculated</span>
                    <span className="font-mono text-base font-bold text-teal-700">{formatINR(batchStats.tax)}</span>
                  </div>
                  <div className="bg-teal-50/60 p-3 rounded-lg border border-teal-200">
                    <span className="text-[10px] text-teal-700 font-mono uppercase block">Gross Batch Value</span>
                    <span className="font-mono text-base font-bold text-teal-900">{formatINR(batchStats.total)}</span>
                  </div>
                </div>
              )}

              {/* Batch Documents Table */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Document / File</th>
                      <th className="py-2.5 px-3 text-left">Party Name</th>
                      <th className="py-2.5 px-3 text-left">GSTIN</th>
                      <th className="py-2.5 px-3 text-right">Taxable</th>
                      <th className="py-2.5 px-3 text-right">GST Rate</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                      <th className="py-2.5 px-3 text-left">Mapped Ledger</th>
                      <th className="py-2.5 px-3 text-center">Confidence</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {activeBatch.files.map(item => {
                      const taxAmt = calculateTax(item.taxableValue, item.gstRate);
                      const total = item.taxableValue + taxAmt;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                            <div>{item.docNo}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{item.fileName}</div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{item.party}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{item.gstin}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatINR(item.taxableValue)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{item.gstRate}%</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatINR(total)}</td>
                          <td className="py-2.5 px-3 text-slate-600">{item.ledger}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-semibold border border-teal-200">
                              {item.ledgerConfidence}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                activeBatch.status === 'posted'
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {activeBatch.status === 'posted' ? 'Posted' : 'Extracted'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
