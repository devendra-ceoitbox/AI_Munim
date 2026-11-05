import React from 'react';
import {
  Receipt,
  Plus,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  Building,
  CreditCard
} from 'lucide-react';
import { AppState } from '../../db/concurrencyEngine.ts';
import { formatINR, calculateTax } from '../../utils/accounting.ts';

interface PayablesViewProps {
  state: AppState;
  onOpenAddBill: () => void;
  onApproveBill: (index: number) => void;
  onRejectBill: (index: number) => void;
}

export const PayablesView: React.FC<PayablesViewProps> = ({
  state,
  onOpenAddBill,
  onApproveBill,
  onRejectBill
}) => {
  const role = state.currentRole;
  const canSubmit = role === 'owner' || role === 'fin';
  const canApprove = role === 'owner' || role === 'app';
  const limit = state.company.approverLimit;

  const totalPayables = state.payables.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Add Bill CTA */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Accounts Payable &amp; Supplier Commitments
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Maker-Checker approval controls with configured thresholds. Approver limit: {formatINR(limit)} per bill.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-400 block">Total Book Payables</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{formatINR(totalPayables)}</span>
          </div>
          {canSubmit && (
            <button
              onClick={onOpenAddBill}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supplier Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* Awaiting Approval Queue */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Bills Awaiting Review &amp; Approval ({state.pendingBills.length})
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">Dual-Authorization Pipeline</span>
        </div>

        {state.pendingBills.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <CheckCircle className="w-8 h-8 text-teal-600 mx-auto mb-2 opacity-60" />
            <p className="font-medium">No pending supplier bills in the approval queue.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              New bills submitted by Finance Executives or extracted via OCR will appear here for review.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-600 text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 text-left">Supplier</th>
                  <th className="py-2.5 px-4 text-left">Bill No.</th>
                  <th className="py-2.5 px-4 text-right">Taxable</th>
                  <th className="py-2.5 px-4 text-right">Total Amount</th>
                  <th className="py-2.5 px-4 text-left">Submitted By</th>
                  <th className="py-2.5 px-4 text-right">Approval Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {state.pendingBills.map((b, idx) => {
                  const taxAmt = calculateTax(b.taxableValue, b.gstRate);
                  const total = b.taxableValue + taxAmt;
                  const exceedsApproverLimit = role === 'app' && total > limit;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-800">{b.party}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{b.docNo}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatINR(b.taxableValue)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(total)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{b.submittedBy || 'Finance Team'}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {exceedsApproverLimit ? (
                          <span className="text-[11px] text-rose-700 font-medium bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            Exceeds Limit ({formatINR(limit)}) · Needs Owner
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => onApproveBill(idx)}
                              disabled={!canApprove}
                              className="px-3 py-1 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 rounded shadow-xs"
                            >
                              Approve &amp; Post
                            </button>
                            <button
                              onClick={() => onRejectBill(idx)}
                              disabled={!canApprove}
                              className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier Bills in Books */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Approved Supplier Bills in General Ledger
          </h4>
          <span className="text-xs text-slate-500 font-mono">{state.payables.length} open obligations</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-600 text-[11px]">
              <tr>
                <th className="py-2.5 px-4 text-left">Supplier Name</th>
                <th className="py-2.5 px-4 text-left">Bill Reference</th>
                <th className="py-2.5 px-4 text-left">Supplier GSTIN</th>
                <th className="py-2.5 px-4 text-right">Open Amount</th>
                <th className="py-2.5 px-4 text-right">Payment Maturity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {state.payables.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <Receipt className="w-8 h-8 text-teal-600 mb-2 opacity-60" />
                      <p className="font-semibold text-slate-800 text-xs mb-0.5">
                        Live Payables Subledger Empty
                      </p>
                      <p className="text-[11px] text-slate-500 mb-3">
                        No outstanding supplier obligations in the system yet.
                      </p>
                      {canSubmit && (
                        <button
                          onClick={onOpenAddBill}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md shadow-xs flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Record Supplier Bill</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                state.payables.map(bill => (
                  <tr key={bill.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-800">{bill.supplier}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{bill.id}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{bill.gstin || '–'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(bill.amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          bill.dueInDays <= 7
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        Due in +{bill.dueInDays} days
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Payment proposals are simulated. Release of bank transfers requires authorized human execution.</span>
        </div>
      </div>
    </div>
  );
};
