import React, { useState, useEffect } from 'react';
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
  FolderUp
} from 'lucide-react';
import { AppState } from '../../db/concurrencyEngine.ts';
import { DocumentDraft, UserRole, DocumentType, BulkUploadBatch } from '../../types/accounting.ts';
import { calculateTax, formatINR, validateGstin } from '../../utils/accounting.ts';

interface CaptureApproveViewProps {
  state: AppState;
  onCaptureSample: (sampleKey: 's' | 'p' | 'd' | 'cn' | 'dn' | 'exp' | 'bst') => void;
  onSubmitForApproval: () => void;
  onApproveAndPost: () => void;
  onClearDraft: () => void;
  onUpdateDraftLedger: (ledger: string) => void;
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
  onCreateBulkBatch,
  onPostBulkBatch,
  onClearBulkBatch
}) => {
  const [activeMode, setActiveMode] = useState<'single' | 'bulk'>('single');
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('Sales Invoice');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const draft = state.currentDraft;
  const activeBatch = state.activeBatch;
  const role = state.currentRole;

  const canSubmit = role === 'owner' || role === 'fin';
  const canApprove = role === 'owner' || role === 'app';

  // Trigger simulated animated scanning when a new sample is clicked
  const handleTriggerSample = (key: 's' | 'p' | 'd' | 'cn' | 'dn' | 'exp' | 'bst') => {
    setIsScanning(true);
    setScanProgress(15);
    setTimeout(() => setScanProgress(60), 200);
    setTimeout(() => {
      setScanProgress(100);
      onCaptureSample(key);
      setIsScanning(false);
    }, 450);
  };

  const handleStartBulkUpload = () => {
    setIsScanning(true);
    setScanProgress(25);
    setTimeout(() => setScanProgress(70), 250);
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
    }, 500);
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
            <Scan className="w-3.5 h-3.5 text-teal-600" />
            <span>Single Document (OCR Lab)</span>
          </button>
          <button
            onClick={() => setActiveMode('bulk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeMode === 'bulk'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderUp className="w-3.5 h-3.5 text-teal-600" />
            <span>Bulk Upload &amp; Batch OCR</span>
            {activeBatch && (
              <span className="w-2 h-2 rounded-full bg-teal-500 inline-block ml-0.5" />
            )}
          </button>
        </div>

        {/* Document Type Selector Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1.5 shrink-0">
            Document Type:
          </span>
          {DOC_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setSelectedDocType(type)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedDocType === type
                  ? 'bg-teal-700 text-white font-semibold'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* OCR SCANNING HUD ANIMATION (When active) */}
      {isScanning && (
        <div className="bg-slate-950 text-white rounded-xl p-5 border border-teal-500/40 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-teal-500/5 animate-pulse" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-600/30 border border-teal-500 flex items-center justify-center text-teal-300">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>AI Munim OCR Engine Processing {selectedDocType}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                    Confidence Scanning Active
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detecting vendor GSTIN checksum, tabular line items, HSN classification, and math balance...
                </p>
              </div>
            </div>

            <div className="w-full sm:w-48 text-right font-mono text-xs">
              <div className="text-teal-400 font-bold mb-1">{scanProgress}% Extracted</div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 transition-all duration-300 rounded-full"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODE 1: SINGLE DOCUMENT OCR LAB
          ========================================================================= */}
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
                  Select a pre-configured sample document or test duplicate detection to inspect AI extraction.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                Supported: PDF, JPEG, PNG, Excel
              </span>
            </div>

            {canSubmit ? (
              <div className="flex flex-wrap items-center gap-2.5">
                {selectedDocType === 'Sales Invoice' && (
                  <button
                    onClick={() => handleTriggerSample('s')}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
                  >
                    <FileText className="w-4 h-4" />
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
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>CN-04 (Gupta Exports Credit Note · ₹15,000)</span>
                  </button>
                )}

                {selectedDocType === 'Debit Note' && (
                  <button
                    onClick={() => handleTriggerSample('dn')}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>DN-02 (Raj Polymers Debit Note · ₹8,500)</span>
                  </button>
                )}

                {selectedDocType === 'Expense Voucher' && (
                  <button
                    onClick={() => handleTriggerSample('exp')}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>EXP-318 (Packaging &amp; Supplies · ₹12,400)</span>
                  </button>
                )}

                {selectedDocType === 'Bank Statement' && (
                  <button
                    onClick={() => handleTriggerSample('bst')}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>BST-112 (ICICI Bank e-Statement)</span>
                  </button>
                )}

                {/* Quick File Drop Area */}
                <label className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-xs cursor-pointer transition-colors">
                  <UploadCloud className="w-4 h-4 text-teal-600" />
                  <span>Upload Local File</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleTriggerSample(selectedDocType === 'Sales Invoice' ? 's' : 'p');
                      }
                    }}
                  />
                </label>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Your current role ({role.toUpperCase()}) cannot upload new documents. Switch role to Finance Executive or Owner to upload.
                </span>
              </div>
            )}
          </div>

          {/* Extracted Document Workspace */}
          {draft ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-6">
              {/* Header & Lifecycle Progress Bar */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-teal-50 text-teal-800 border border-teal-200 uppercase font-mono">
                      {draft.type}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{draft.docNo}</span>
                    <span className="text-xs text-slate-500 font-medium">· {draft.party}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-mono">Status:</span>
                    <span className="font-semibold text-slate-800 px-2 py-0.5 bg-slate-100 rounded">
                      {draft.status}
                    </span>
                  </div>
                </div>

                {/* Lifecycle Stages */}
                <div className="pt-4 flex flex-wrap gap-2">
                  {steps.map((st, idx) => {
                    const isPassed = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <div
                        key={st}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                          isCurrent
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : isPassed
                            ? 'bg-teal-50 text-teal-800 border-teal-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        {isPassed ? <Check className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 text-center text-[10px]">{idx + 1}</span>}
                        <span>{st}</span>
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
                      <span>AI Extracted Fields &amp; Confidence Breakdown</span>
                    </h4>
                    <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      OCR Model: Multimodal Vision
                    </span>
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
                        <tr>
                          <td className="py-2 px-3 text-slate-500">Party / Vendor</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{draft.party}</td>
                          <td className="py-2 px-3 text-right font-mono text-teal-700 font-medium">98%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-500">Number / Date</td>
                          <td className="py-2 px-3 text-slate-900 font-mono">{draft.docNo} · {draft.date}</td>
                          <td className="py-2 px-3 text-right font-mono text-teal-700 font-medium">99%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-500">GSTIN</td>
                          <td className="py-2 px-3 font-mono text-slate-900">{draft.gstin}</td>
                          <td className="py-2 px-3 text-right font-mono text-teal-700 font-medium">97%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-500">HSN / SAC</td>
                          <td className="py-2 px-3 font-mono text-slate-900">{draft.hsn}</td>
                          <td className="py-2 px-3 text-right font-mono text-teal-700 font-medium">93%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-500">Taxable Amount</td>
                          <td className="py-2 px-3 font-mono text-slate-900">{formatINR(draft.taxableValue)}</td>
                          <td className="py-2 px-3 text-right font-mono text-teal-700 font-medium">99%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-500">GST @ {draft.gstRate}%</td>
                          <td className="py-2 px-3 font-mono text-slate-900">{formatINR(taxAmount)}</td>
                          <td className="py-2 px-3 text-right font-mono text-teal-700 font-medium">99%</td>
                        </tr>
                        <tr className="bg-slate-50/50 font-semibold">
                          <td className="py-2.5 px-3 text-slate-900">Total Invoice</td>
                          <td className="py-2.5 px-3 font-mono text-slate-900">{formatINR(totalAmount)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-teal-700">99%</td>
                        </tr>
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
                                {draft.ledgerConfidence}% · {draft.ledgerConfidence < 80 ? 'Review' : 'Match'}
                              </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right: Automated Validation Checklist & Actions */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Automated Integrity &amp; Tax Validation
                  </h4>
                  <div className="space-y-2 border border-slate-200 rounded-lg p-3.5 bg-slate-50">
                    {/* 1. Duplicate check */}
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

                    {/* 2. GSTIN format check */}
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
                            : `GSTIN does not match official format. Verify supplier tax registration.`}
                        </p>
                      </div>
                    </div>

                    {/* 3. Mathematical check */}
                    <div className="flex items-start gap-2.5 text-xs">
                      <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900">Arithmetic Reconciliation Valid</span>
                        <p className="text-slate-500 text-[11px]">
                          Taxable value ({formatINR(draft.taxableValue)}) + {draft.gstRate}% GST ({formatINR(taxAmount)}) equals invoice total ({formatINR(totalAmount)}).
                        </p>
                      </div>
                    </div>

                    {/* 4. Ledger mapping check */}
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
                          {isLedgerConfident
                            ? `Account ${draft.ledger} verified by user or high historical confidence.`
                            : `AI mapped to ${draft.ledger} with ${draft.ledgerConfidence}% confidence. Please confirm.`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="pt-2">
                    {draft.status === 'Posted' ? (
                      <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 text-xs rounded-lg flex items-center justify-between">
                        <span className="font-semibold">Document Posted and General Ledger Updated.</span>
                        <button
                          onClick={onClearDraft}
                          className="px-3 py-1 bg-white border border-teal-300 rounded text-xs font-semibold hover:bg-teal-100"
                        >
                          Clear &amp; Upload Next
                        </button>
                      </div>
                    ) : draft.status === 'Awaiting approval' ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={onApproveAndPost}
                            disabled={!canApprove}
                            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 rounded-lg shadow-sm transition-colors"
                          >
                            Approve &amp; Post to Books
                          </button>
                          <button
                            onClick={() => onSubmitForApproval()}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            Return for Correction
                          </button>
                          <button
                            onClick={onClearDraft}
                            className="px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                        {!canApprove && (
                          <p className="text-xs text-slate-500">
                            Awaiting an Approver or Owner. Switch role in the sidebar to complete approval.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={onSubmitForApproval}
                          disabled={!canSubmit || isDuplicate}
                          className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 rounded-lg shadow-sm transition-colors"
                        >
                          Submit for Approval
                        </button>
                        <button
                          onClick={onClearDraft}
                          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Discard Draft
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Balanced Double-Entry Journal Preview (Upon Posting) */}
              {draft.journalVoucher && (
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                    Posted Double-Entry Balanced Journal
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs font-mono">
                      <thead className="bg-slate-100 text-slate-700 text-[11px]">
                        <tr>
                          <th className="py-2 px-3 text-left">Account Ledger</th>
                          <th className="py-2 px-3 text-right">Debit (₹)</th>
                          <th className="py-2 px-3 text-right">Credit (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {draft.journalVoucher.map((line, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 text-slate-800 font-sans">{line.account}</td>
                            <td className="py-2 px-3 text-right text-slate-900">
                              {line.debit > 0 ? formatINR(line.debit) : '–'}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-900">
                              {line.credit > 0 ? formatINR(line.credit) : '–'}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-teal-50 font-bold">
                          <td className="py-2 px-3 text-teal-900 font-sans">Total Balanced Entry</td>
                          <td className="py-2 px-3 text-right text-teal-900">{formatINR(totalAmount)}</td>
                          <td className="py-2 px-3 text-right text-teal-900">{formatINR(totalAmount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* =========================================================================
          MODE 2: BULK UPLOAD & BATCH OCR
          ========================================================================= */}
      {activeMode === 'bulk' && (
        <div className="space-y-6">
          {/* Bulk Ingestion Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <FolderUp className="w-4 h-4 text-teal-700" />
                  <span>High-Throughput Bulk OCR Ingestion: {selectedDocType}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Process up to 50 scanned bills or invoices concurrently with automated duplicate checks and batch GL posting.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartBulkUpload}
                  disabled={isScanning || !canSubmit}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  <Files className="w-4 h-4" />
                  <span>Simulate Batch Ingest (4 {selectedDocType}s)</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop Visual Zone */}
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <UploadCloud className="w-8 h-8 text-teal-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800">
                Drag and drop multi-page PDFs or ZIP archives containing scanned bills
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                AI Munim extracts line items, validates tax calculations, and stages transactions for one-click ledger posting.
              </p>
            </div>
          </div>

          {/* Active Batch Overview & Items */}
          {activeBatch && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
              {/* Batch Summary Header */}
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

                {/* Batch Actions */}
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
                          disabled={!canApprove}
                          className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                        >
                          <FileCheck2 className="w-4 h-4" />
                          <span>Batch Approve &amp; Post to Books</span>
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
