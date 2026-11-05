import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Check,
  Plus,
  X
} from 'lucide-react';
import { AppState } from '../../db/concurrencyEngine.ts';
import { formatINR } from '../../utils/accounting.ts';

interface BankReconciliationViewProps {
  state: AppState;
  onConfirmBankLine: (id: number) => void;
  onSendToException: (id: number) => void;
  onAddBankLine?: (line: { narration: string; amount: number; category?: string; matchedDocId?: string }) => void;
}

export const BankReconciliationView: React.FC<BankReconciliationViewProps> = ({
  state,
  onConfirmBankLine,
  onSendToException,
  onAddBankLine
}) => {
  const role = state.currentRole;
  const canReconcile = role === 'owner' || role === 'fin';

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [narration, setNarration] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [matchedDocId, setMatchedDocId] = useState('');

  const pendingLines = state.bankLines.filter(b => b.status === 'pending');
  const reconciledLines = state.bankLines.filter(b => b.status === 'reconciled');
  const exceptionLines = state.bankLines.filter(b => b.status === 'exception');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!narration.trim() || isNaN(val) || val <= 0) return;

    if (onAddBankLine) {
      onAddBankLine({
        narration: narration.trim(),
        amount: type === 'credit' ? val : -val,
        matchedDocId: matchedDocId.trim() || undefined
      });
    }

    setNarration('');
    setAmount('');
    setMatchedDocId('');
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Automated Bank Feed &amp; Statement Matching
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            AI matches statement narrations and amounts to open customer invoices, bills, and expense ledgers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Current Book Cash</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{formatINR(state.cashBalance)}</span>
          </div>
        </div>
      </div>

      {/* Add Bank Line Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-400" />
                <h3 className="font-semibold text-sm">Add Live Bank Transaction Line</h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Bank Statement Narration *
                </label>
                <input
                  type="text"
                  value={narration}
                  onChange={e => setNarration(e.target.value)}
                  placeholder="e.g. NEFT-IN: RELIANCE RETAIL SETTLEMENT"
                  className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Transaction Type *
                  </label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-md"
                  >
                    <option value="credit">Credit / Deposit (+)</option>
                    <option value="debit">Debit / Payment (-)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs p-2 border border-slate-300 rounded-md font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Match Document Ref (Optional)
                </label>
                <input
                  type="text"
                  value={matchedDocId}
                  onChange={e => setMatchedDocId(e.target.value.toUpperCase())}
                  placeholder="e.g. INV-2026-001 or BILL-101"
                  className="w-full text-xs p-2 border border-slate-300 rounded-md uppercase font-mono"
                />
                <span className="text-[11px] text-slate-400 block mt-1">If specified, confirming match will adjust the balance of this document.</span>
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
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Imported Bank Lines Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-700" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Imported Transactions ({state.bankLines.length})
            </h4>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Pending: <b className="text-slate-800">{pendingLines.length}</b></span>
              <span>Reconciled: <b className="text-teal-700">{reconciledLines.length}</b></span>
              <span>Exceptions: <b className="text-rose-700">{exceptionLines.length}</b></span>
            </div>
            {canReconcile && (
              <button
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700 shadow-xs transition-colors ml-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Bank Line</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-600 text-[11px]">
              <tr>
                <th className="py-2.5 px-4 text-left">Bank Narration</th>
                <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                <th className="py-2.5 px-4 text-left">AI Matching Rule &amp; Confidence</th>
                <th className="py-2.5 px-4 text-right">Reconciliation Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {state.bankLines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <Building2 className="w-10 h-10 text-teal-600 mb-2.5 opacity-60" />
                      <p className="font-semibold text-slate-800 text-xs mb-0.5">
                        No Bank Statement Lines Imported
                      </p>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Enter bank statement entries manually or import your bank feed via Bulk CSV.
                      </p>
                      {canReconcile && (
                        <button
                          onClick={() => setIsAddOpen(true)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md shadow-xs flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add First Bank Transaction</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                state.bankLines.map(line => {
                  const isCredit = line.amount > 0;
                  return (
                    <tr key={line.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          {isCredit ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                          <span>{line.narration}</span>
                        </div>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold ${
                          isCredit ? 'text-teal-700' : 'text-slate-900'
                        }`}
                      >
                        {isCredit ? '+' : ''}{formatINR(line.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700">{line.suggestion}</span>
                          {line.confidence > 0 && (
                            <span
                              className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                line.confidence >= 85
                                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {line.confidence}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {line.status === 'reconciled' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded">
                            <Check className="w-3.5 h-3.5" />
                            <span>Reconciled</span>
                          </span>
                        ) : line.status === 'exception' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Exception Queue</span>
                          </span>
                        ) : (
                          <div className="space-x-2">
                            <button
                              onClick={() => onConfirmBankLine(line.id)}
                              disabled={!canReconcile}
                              className="px-3 py-1 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 rounded shadow-xs"
                            >
                              Confirm Match
                            </button>
                            {line.confidence === 0 && (
                              <button
                                onClick={() => onSendToException(line.id)}
                                disabled={!canReconcile}
                                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                              >
                                To Exceptions
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            Confirming a match automatically updates the book cash balance, marks the receivable/payable settled, and refreshes the 30-day forecast.
          </span>
        </div>
      </div>
    </div>
  );
};
