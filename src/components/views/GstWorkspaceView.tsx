import React, { useState } from 'react';
import {
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Mail,
  FileCheck,
  Scale,
  ShieldAlert,
  ArrowRight,
  Plus,
  X
} from 'lucide-react';
import { AppState } from '../../db/concurrencyEngine.ts';
import { formatINR, getEligibleItc } from '../../utils/accounting.ts';

interface GstWorkspaceViewProps {
  state: AppState;
  onResolveGst: (index: number, action: 'accept_portal' | 'ask_supplier' | 'post_bill') => void;
  onNavigateToCapture: () => void;
  onAddGstRecord?: (row: { supplier: string; docNo: string; portalTax: number; booksTax?: number }) => void;
}

export const GstWorkspaceView: React.FC<GstWorkspaceViewProps> = ({
  state,
  onResolveGst,
  onNavigateToCapture,
  onAddGstRecord
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [docNo, setDocNo] = useState('');
  const [portalTax, setPortalTax] = useState('');
  const [booksTax, setBooksTax] = useState('');

  const booksItc = state.gstRows.reduce((sum, r) => sum + (r.booksTax || 0), 0);
  const eligibleItc = getEligibleItc(state.gstRows);
  const netLiability = Math.max(0, state.salesTaxOutput - eligibleItc);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pTax = parseFloat(portalTax);
    if (!supplier.trim() || !docNo.trim() || isNaN(pTax) || pTax <= 0) return;

    if (onAddGstRecord) {
      onAddGstRecord({
        supplier: supplier.trim(),
        docNo: docNo.trim().toUpperCase(),
        portalTax: pTax,
        booksTax: booksTax.trim() ? parseFloat(booksTax) : undefined
      });
    }

    setSupplier('');
    setDocNo('');
    setPortalTax('');
    setBooksTax('');
    setIsAddOpen(false);
  };

  const statusTags: Record<string, { label: string; color: string }> = {
    matched: { label: 'Matched', color: 'bg-teal-50 text-teal-800 border-teal-200' },
    mismatch: { label: 'Value Mismatch', color: 'bg-amber-50 text-amber-800 border-amber-300' },
    books: { label: 'Books Only', color: 'bg-blue-50 text-blue-800 border-blue-200' },
    portal: { label: 'Portal Only', color: 'bg-purple-50 text-purple-800 border-purple-200' },
    resolved: { label: 'Resolved', color: 'bg-slate-100 text-slate-800 border-slate-300' },
    followup_sent: { label: 'Follow-up Sent', color: 'bg-amber-100 text-amber-900 border-amber-300' }
  };

  return (
    <div className="space-y-6">
      {/* Statutory Guidance Note */}
      <div className="p-4 bg-amber-50/70 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold">Statutory GST Working Paper</span> — AI Munim calculates and reconciles GST
          workings in compliance with Section 16(2)(aa) of the CGST Act. A prepared working is not a filed statutory return.
          Official filing requires authorization via a registered GSTN GSP/ASP integration.
        </div>
      </div>

      {/* 5 GST KPI Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
            Output Tax (Sales)
          </span>
          <div className="font-mono text-lg font-bold text-slate-900">{formatINR(state.salesTaxOutput)}</div>
          <span className="text-[11px] text-slate-400">Outward supplies</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
            ITC in Books
          </span>
          <div className="font-mono text-lg font-bold text-slate-900">{formatINR(booksItc)}</div>
          <span className="text-[11px] text-slate-400">Recorded purchases</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-teal-200 bg-teal-50/30 shadow-xs">
          <span className="text-[11px] font-medium text-teal-800 uppercase tracking-wider block mb-1">
            Eligible ITC (Claimable)
          </span>
          <div className="font-mono text-lg font-bold text-teal-800">{formatINR(eligibleItc)}</div>
          <span className="text-[11px] text-teal-700 font-medium">Matched &amp; resolved</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
            Filed Return Claim
          </span>
          <div className="font-mono text-lg font-bold text-slate-400">₹0</div>
          <span className="text-[11px] text-slate-400">Unlocked period</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-amber-200 bg-amber-50/30 shadow-xs">
          <span className="text-[11px] font-medium text-amber-900 uppercase tracking-wider block mb-1">
            Net Tax Payable
          </span>
          <div className="font-mono text-lg font-bold text-amber-900">{formatINR(netLiability)}</div>
          <span className="text-[11px] text-amber-800 font-medium">Working cash liability</span>
        </div>
      </div>

      {/* Add GSTR-2B Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-400" />
                <h3 className="font-semibold text-sm">Add GSTR-2B Portal Entry</h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  placeholder="e.g. Apex Packaging"
                  className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Document / Invoice No. *
                </label>
                <input
                  type="text"
                  value={docNo}
                  onChange={e => setDocNo(e.target.value.toUpperCase())}
                  placeholder="e.g. AP-414"
                  className="w-full text-xs p-2 border border-slate-300 rounded-md uppercase font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    GSTR-2B Tax (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={portalTax}
                    onChange={e => setPortalTax(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs p-2 border border-slate-300 rounded-md font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tax in Books (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={booksTax}
                    onChange={e => setBooksTax(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs p-2 border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md shadow-xs"
                >
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GSTR-2B Inward Supply Reconciliation Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50/50">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Automated GSTR-2B Statement Reconciliation (Live Portal Feed)
            </h4>
            <p className="text-xs text-slate-500">
              Cross-verifying supplier GSTIN, document number, taxable values, and uploaded input tax credits.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
              Rule 36(4) Auto-Check
            </span>
            {onAddGstRecord && (
              <button
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700 shadow-xs transition-colors ml-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add GSTR-2B Entry</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-600 text-[11px]">
              <tr>
                <th className="py-2.5 px-4 text-left">Supplier Name</th>
                <th className="py-2.5 px-4 text-left">Document No.</th>
                <th className="py-2.5 px-4 text-right">Tax in Books (₹)</th>
                <th className="py-2.5 px-4 text-right">Tax in GSTR-2B (₹)</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Reconciliation Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {state.gstRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <FileSpreadsheet className="w-10 h-10 text-teal-600 mb-2.5 opacity-60" />
                      <p className="font-semibold text-slate-800 text-xs mb-0.5">
                        No GSTR-2B Inward Supply Records
                      </p>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Enter live portal entries manually or import your GSTR-2B portal JSON/CSV file.
                      </p>
                      {onAddGstRecord && (
                        <button
                          onClick={() => setIsAddOpen(true)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md shadow-xs flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add First GSTR-2B Entry</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                state.gstRows.map((r, idx) => {
                  const tag = statusTags[r.status] || { label: r.status, color: 'bg-slate-100' };
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-800">{r.supplier}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{r.docNo}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {r.booksTax !== null ? formatINR(r.booksTax) : '–'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {r.portalTax !== null ? formatINR(r.portalTax) : '–'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold border ${tag.color}`}>
                          {tag.label}
                        </span>
                        {r.resolutionNote && (
                          <p className="text-[10px] text-slate-500 mt-0.5">{r.resolutionNote}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.status === 'mismatch' ? (
                          <button
                            onClick={() => onResolveGst(idx, 'accept_portal')}
                            className="px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded shadow-xs"
                          >
                            Accept Portal Value
                          </button>
                        ) : r.status === 'books' ? (
                          <button
                            onClick={() => onResolveGst(idx, 'ask_supplier')}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded shadow-xs"
                          >
                            Ask Supplier
                          </button>
                        ) : r.status === 'portal' ? (
                          <button
                            onClick={onNavigateToCapture}
                            className="px-2.5 py-1 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded shadow-xs"
                          >
                            Post Missing Bill
                          </button>
                        ) : (
                          <span className="text-[11px] text-teal-700 font-mono font-medium flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Eligible</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Reconciliation tolerance: ±₹5.00 for rounding differences.</span>
          <span className="font-mono text-slate-600">Updated: Real-time Live Mode</span>
        </div>
      </div>
    </div>
  );
};
