import React, { useState } from 'react';
import {
  Users,
  Search,
  MessageSquare,
  Calendar,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Plus,
  FileText
} from 'lucide-react';
import { AppState } from '../../db/concurrencyEngine.ts';
import { ReceivableItem } from '../../types/accounting.ts';
import { formatINR, calculateAgeingBuckets } from '../../utils/accounting.ts';

interface CollectionsViewProps {
  state: AppState;
  onOpenWhatsApp: (item: ReceivableItem) => void;
  onRecordPromise: (index: number, days: number) => void;
  onToggleDispute: (index: number) => void;
  onOpenAddInvoice?: () => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  state,
  onOpenWhatsApp,
  onRecordPromise,
  onToggleDispute,
  onOpenAddInvoice
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'overdue' | 'disputed'>('all');

  const buckets = calculateAgeingBuckets(state.receivables);
  const maxBucketVal = Math.max(buckets.notDue, buckets.days1To30, buckets.days31To60, buckets.days61To90, 1);

  const filteredInvoices = state.receivables.filter(inv => {
    const matchesSearch =
      inv.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterMode === 'overdue') return inv.overdueDays > 0 && !inv.isDisputed;
    if (filterMode === 'disputed') return inv.isDisputed;
    return true;
  });

  const canCollect = state.currentRole === 'owner' || state.currentRole === 'fin' || state.currentRole === 'col';

  return (
    <div className="space-y-6">
      {/* Ageing Buckets Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Accounts Receivable Ageing Analysis
            </h3>
            <p className="text-xs text-slate-500">
              Categorized by due date maturity. Disputed amounts are isolated from cash forecasting.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">Total Ledger Outstanding</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{formatINR(buckets.total)}</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {/* Not Due */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-600">Current / Not Due</span>
              <span className="font-mono font-semibold text-slate-900">{formatINR(buckets.notDue)}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-300"
                style={{ width: `${(buckets.notDue / maxBucketVal) * 100}%` }}
              />
            </div>
          </div>

          {/* 1 - 30 days */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-amber-700">1 – 30 Days Overdue</span>
              <span className="font-mono font-semibold text-amber-800">{formatINR(buckets.days1To30)}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${(buckets.days1To30 / maxBucketVal) * 100}%` }}
              />
            </div>
          </div>

          {/* 31 - 60 days */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-rose-600">31 – 60 Days Overdue</span>
              <span className="font-mono font-semibold text-rose-700">{formatINR(buckets.days31To60)}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${(buckets.days31To60 / maxBucketVal) * 100}%` }}
              />
            </div>
          </div>

          {/* 61 - 90+ days */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-purple-700">61 – 90+ Days Overdue</span>
              <span className="font-mono font-semibold text-purple-800">{formatINR(buckets.days61To90 + buckets.daysOver90)}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all duration-300"
                style={{ width: `${((buckets.days61To90 + buckets.daysOver90) / maxBucketVal) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Customer Invoices Table & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by customer or invoice..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              All Invoices
            </button>
            <button
              onClick={() => setFilterMode('overdue')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterMode === 'overdue'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Overdue Only
            </button>
            <button
              onClick={() => setFilterMode('disputed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterMode === 'disputed'
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Disputed
            </button>

            {onOpenAddInvoice && canCollect && (
              <button
                onClick={onOpenAddInvoice}
                className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Invoice</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-4 text-left font-semibold">Invoice No.</th>
                <th className="py-2.5 px-4 text-left font-semibold">Customer / Client</th>
                <th className="py-2.5 px-4 text-right font-semibold">Open Balance</th>
                <th className="py-2.5 px-4 text-center font-semibold">Due Status</th>
                <th className="py-2.5 px-4 text-center font-semibold">Promise to Pay</th>
                <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 mb-3">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 mb-1">
                        Live Receivables Register Empty
                      </p>
                      <p className="text-xs text-slate-500 mb-4">
                        No outstanding customer invoices recorded yet. Create your first real customer invoice or import from CSV.
                      </p>
                      {onOpenAddInvoice && (
                        <button
                          onClick={onOpenAddInvoice}
                          className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Create Live Sales Invoice</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv, idx) => {
                  const originalIndex = state.receivables.findIndex(r => r.id === inv.id);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{inv.id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{inv.customer}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(inv.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {inv.isDisputed ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                            Disputed
                          </span>
                        ) : inv.overdueDays > 0 ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              inv.overdueDays > 30
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {inv.overdueDays} days overdue
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                            Due in {-inv.overdueDays} days
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {inv.promiseDays !== null ? (
                          <span className="text-teal-700 font-semibold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                            Day +{inv.promiseDays}
                          </span>
                        ) : (
                          <span className="text-slate-400">–</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => onOpenWhatsApp(inv)}
                          disabled={!canCollect}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors disabled:opacity-40"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={() => onRecordPromise(originalIndex, 5)}
                          disabled={!canCollect}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors disabled:opacity-40"
                          title="Record customer promise to pay in 5 days"
                        >
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>+5d Promise</span>
                        </button>

                        <button
                          onClick={() => onToggleDispute(originalIndex)}
                          disabled={!canCollect}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors disabled:opacity-40 ${
                            inv.isDisputed
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <span>{inv.isDisputed ? 'Resolve' : 'Dispute'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Disputed balances remain in receivables ledger but are excluded from liquidity forecast calculations.</span>
          </div>
          <span>Showing {filteredInvoices.length} entries</span>
        </div>
      </div>
    </div>
  );
};
