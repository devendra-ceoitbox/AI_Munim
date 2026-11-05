import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Layers,
  ArrowRight,
  Database,
  Table,
  Check,
  X,
  Sparkles,
  Info
} from 'lucide-react';
import { AppState } from '../../db/concurrencyEngine.ts';
import { parseCsvText, downloadCsvFile, SAMPLE_CSV_TEMPLATES } from '../../utils/accounting.ts';

interface BulkCsvUploadViewProps {
  state: AppState;
  onImportDataset: (dataset: string, rows: Record<string, string>[]) => Promise<{ count: number; dataset: string }>;
  onShowToast?: (message: string) => void;
}

interface DatasetOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  badgeCount: number;
}

export const BulkCsvUploadView: React.FC<BulkCsvUploadViewProps> = ({
  state,
  onImportDataset,
  onShowToast
}) => {
  const [activeDataset, setActiveDataset] = useState<string>('receivables');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<{ count: number; dataset: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const DATASETS: DatasetOption[] = [
    {
      id: 'receivables',
      label: 'Sales Invoices / Receivables',
      description: 'Customer invoices, amounts, due dates, and GSTIN for tracking and collections',
      icon: 'Receipt',
      badgeCount: state.receivables.length
    },
    {
      id: 'payables',
      label: 'Vendor Bills / Payables',
      description: 'Supplier invoices, due dates, payment priority, and expense tracking',
      icon: 'CreditCard',
      badgeCount: state.payables.length
    },
    {
      id: 'bank',
      label: 'Bank Statement Feeds',
      description: 'Transaction narrations, credits, debits, and categories for automated reconciliation',
      icon: 'Building2',
      badgeCount: state.bankLines.length
    },
    {
      id: 'gstr2b',
      label: 'GSTR-2B Portal Records',
      description: 'Government GST portal inward supplies for 2B reconciliation and ITC audit',
      icon: 'ShieldCheck',
      badgeCount: state.gstRows.length
    },
    {
      id: 'accounts',
      label: 'Chart of Accounts (COA)',
      description: 'General ledger account codes, groups, types (Asset/Liability/Revenue/Expense)',
      icon: 'Table',
      badgeCount: state.masters.accounts.length
    },
    {
      id: 'items',
      label: 'Items & Products Master',
      description: 'HSN/SAC codes, standard costs, selling prices, and default GST rates',
      icon: 'Package',
      badgeCount: state.masters.items.length
    },
    {
      id: 'parties',
      label: 'Parties (Customers & Vendors)',
      description: 'Contact names, legal trade entities, GSTIN, credit terms, and limits',
      icon: 'Users',
      badgeCount: state.masters.parties.length
    }
  ];

  const currentDatasetConfig = DATASETS.find(d => d.id === activeDataset) || DATASETS[0];

  // Handle template download
  const handleDownloadTemplate = () => {
    const tpl = SAMPLE_CSV_TEMPLATES[activeDataset];
    if (tpl) {
      downloadCsvFile(tpl.filename, tpl.content);
      if (onShowToast) onShowToast(`Downloaded template ${tpl.filename}`);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (text) {
        const { headers, rows } = parseCsvText(text);
        setParsedHeaders(headers);
        setParsedRows(rows);
        if (onShowToast) onShowToast(`Parsed ${rows.length} rows from ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  // Load sample data directly into the preview
  const handleLoadSampleData = () => {
    const tpl = SAMPLE_CSV_TEMPLATES[activeDataset];
    if (!tpl) return;
    setUploadedFileName(`sample_${activeDataset}.csv`);
    setImportSuccess(null);
    const { headers, rows } = parseCsvText(tpl.content);
    setParsedHeaders(headers);
    setParsedRows(rows);
    if (onShowToast) onShowToast(`Loaded sample template with ${rows.length} records`);
  };

  // Trigger import
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await onImportDataset(activeDataset, parsedRows);
      setImportSuccess(res);
      if (onShowToast) {
        onShowToast(`Successfully imported ${res.count} records into ${activeDataset.toUpperCase()}`);
      }
    } catch (err) {
      console.error('Import error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setUploadedFileName(null);
    setParsedHeaders([]);
    setParsedRows([]);
    setImportSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filter preview rows by search query
  const filteredRows = parsedRows.filter(row => {
    if (!searchQuery.trim()) return true;
    return Object.values(row).some(val => val.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Bulk CSV Upload &amp; Migration Hub</h2>
              <p className="text-xs text-slate-500">
                Bulk upload, validate, and inject entire datasets into the PostgreSQL engine with live schema validation
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV Template</span>
          </button>
          <button
            onClick={handleLoadSampleData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Load Demo Data</span>
          </button>
        </div>
      </div>

      {/* Dataset Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {DATASETS.map(d => (
          <button
            key={d.id}
            onClick={() => {
              setActiveDataset(d.id);
              handleClear();
            }}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
              activeDataset === d.id
                ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold line-clamp-1">{d.label}</span>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-500">In Live Engine</span>
              <span className="text-xs font-mono font-bold text-slate-900">{d.badgeCount}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Active Dataset Upload Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Import to {currentDatasetConfig.label}</span>
              <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Dataset: {activeDataset}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{currentDatasetConfig.description}</p>
          </div>
        </div>

        {/* Drag & Drop Upload Dropzone */}
        <div className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl p-8 text-center bg-slate-50/50 transition-colors">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,text/csv,text/plain"
            onChange={handleFileChange}
            className="hidden"
            id="csv-file-input"
          />
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto shadow-inner">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <label
                htmlFor="csv-file-input"
                className="text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer underline"
              >
                Click to browse CSV file
              </label>
              <span className="text-xs text-slate-600"> or drag and drop here</span>
              <p className="text-[11px] text-slate-500 mt-1">Supports UTF-8 formatted .csv files up to 25 MB</p>
            </div>
            {uploadedFileName && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-teal-300 rounded-lg text-xs font-medium text-teal-900 shadow-xs">
                <FileCheck className="w-4 h-4 text-teal-600" />
                <span>Selected: {uploadedFileName}</span>
                <button onClick={handleClear} className="text-slate-400 hover:text-rose-600 ml-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Success Confirmation Banner */}
        {importSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Import Successful!</span>
                <p className="text-emerald-700 mt-0.5">
                  Added {importSuccess.count} records into the live PostgreSQL engine for dataset{' '}
                  <span className="font-mono font-semibold">{importSuccess.dataset.toUpperCase()}</span>.
                </p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              Upload Another
            </button>
          </div>
        )}

        {/* Parsed CSV Preview & Validation Table */}
        {parsedRows.length > 0 && !importSuccess && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Data Preview &amp; Schema Validation
                </h4>
                <span className="text-[11px] font-mono font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {parsedRows.length} Rows Detected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter preview..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 w-48 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />

                <button
                  onClick={handleExecuteImport}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Writing to Database...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5" />
                      <span>Import {parsedRows.length} Records to Live Engine</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-80">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2 px-3 text-left w-12">#</th>
                    {parsedHeaders.map(h => (
                      <th key={h} className="py-2 px-3 text-left font-mono">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-1.5 px-3 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                      {parsedHeaders.map(h => (
                        <td key={h} className="py-1.5 px-3 font-mono text-[11px] text-slate-800">
                          {row[h] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRows.length > 50 && (
              <p className="text-[11px] text-slate-500 text-center">
                Showing first 50 rows of {filteredRows.length}. All records will be imported upon confirmation.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
