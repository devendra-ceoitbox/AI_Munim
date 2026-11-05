import React from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Building,
  Scale,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { AppState } from '../../db/concurrencyEngine.ts';
import { formatINR, getEligibleItc, calculateCashForecast } from '../../utils/accounting.ts';

interface OverviewViewProps {
  state: AppState;
  onNavigateTab: (tab: string) => void;
  onOpenAddBill?: () => void;
  onOpenAddInvoice?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  state,
  onNavigateTab,
  onOpenAddBill,
  onOpenAddInvoice
}) => {
  const eligibleItc = getEligibleItc(state.gstRows);
  const netGst = Math.max(0, state.salesTaxOutput - eligibleItc);

  const totalAr = state.receivables.reduce((sum, r) => sum + r.amount, 0);
  const overdueAr = state.receivables
    .filter(r => r.overdueDays > 0 && !r.isDisputed)
    .reduce((sum, r) => sum + r.amount, 0);

  const payablesDue7 = state.payables
    .filter(p => p.dueInDays <= 7)
    .reduce((sum, p) => sum + p.amount, 0);

  const baseForecast = calculateCashForecast(
    state.cashBalance,
    state.receivables,
    state.payables,
    'base',
    state.salesTaxOutput,
    eligibleItc
  );

  const cautiousForecast = calculateCashForecast(
    state.cashBalance,
    state.receivables,
    state.payables,
    'cautious',
    state.salesTaxOutput,
    eligibleItc
  );

  const gstMismatchCount = state.gstRows.filter(r => ['mismatch', 'books', 'portal'].includes(r.status)).length;
  const unreconciledBankCount = state.bankLines.filter(b => b.status === 'pending').length;
  const isPristineLiveState = state.receivables.length === 0 && state.payables.length === 0 && state.bankLines.length === 0;

  // Workflow steps corresponding to user attachment infographic
  const workflowSteps = [
    {
      num: 1,
      title: 'Capture',
      desc: 'Invoices, bills & bank data',
      tab: 'capture',
      icon: FileText
    },
    {
      num: 2,
      title: 'AI Reads',
      desc: 'OCR & field extraction',
      tab: 'capture',
      icon: Sparkles
    },
    {
      num: 3,
      title: 'Validate',
      desc: 'GST check & deduplication',
      tab: 'capture',
      icon: ShieldCheck
    },
    {
      num: 4,
      title: 'Approve & Post',
      desc: 'Balanced double-entry',
      tab: 'payables',
      icon: CheckCircle2
    },
    {
      num: 5,
      title: 'Reconcile',
      desc: 'GSTR-2B & bank match',
      tab: 'gst',
      icon: Scale
    },
    {
      num: 6,
      title: 'Analyse',
      desc: 'Forecast & AI Munim',
      tab: 'cash',
      icon: TrendingDown
    }
  ];

  return (
    <div className="space-y-6">
      {/* Pristine Live Mode Welcome Banner */}
      {isPristineLiveState && (
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 border border-teal-700/60 rounded-xl p-5 text-white shadow-md">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-teal-300 font-bold">
                  Live Production Mode Active • Zero Hardcoded Data
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Welcome to {state.company.legalName || 'CEO ITBox Private Limited'}
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl mt-0.5 leading-relaxed">
                Your statutory Indian Chart of Accounts (COA) and GST tax slabs are fully provisioned. The transactional ledgers are clean and ready to record real business activity.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onOpenAddInvoice && (
                <button
                  onClick={onOpenAddInvoice}
                  className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>+ Real Invoice</span>
                </button>
              )}
              {onOpenAddBill && (
                <button
                  onClick={onOpenAddBill}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span>+ Supplier Bill</span>
                </button>
              )}
              <button
                onClick={() => onNavigateTab('bulk-csv')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-teal-200 font-semibold text-xs rounded-lg transition-colors"
              >
                Bulk CSV Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6 Core Financial Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Book Cash */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Book Cash</span>
            <Wallet className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="font-mono text-lg font-bold text-slate-900">{formatINR(state.cashBalance)}</div>
          <span className="text-[11px] text-slate-500">Live ledger position</span>
        </div>

        {/* Receivables Outstanding */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Receivables</span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="font-mono text-lg font-bold text-slate-900">{formatINR(totalAr)}</div>
          <span className="text-[11px] text-slate-500">{state.receivables.length} open customer invoices</span>
        </div>

        {/* Overdue (Excl. Disputed) */}
        <div className="bg-white p-3.5 rounded-lg border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Overdue Dues</span>
            <Clock className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="font-mono text-lg font-bold text-rose-700">{formatINR(overdueAr)}</div>
          <span className="text-[11px] text-rose-600 font-medium">Excludes disputed accounts</span>
        </div>

        {/* Payables Due in 7 Days */}
        <div className="bg-white p-3.5 rounded-lg border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Payables (7d)</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="font-mono text-lg font-bold text-amber-800">{formatINR(payablesDue7)}</div>
          <span className="text-[11px] text-amber-700">{state.payables.length} open obligations</span>
        </div>

        {/* Estimated Net GST */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Est. Net GST</span>
            <FileCheck2 className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="font-mono text-lg font-bold text-slate-900">{formatINR(netGst)}</div>
          <span className="text-[11px] text-slate-500">Output {formatINR(state.salesTaxOutput)} − ITC</span>
        </div>

        {/* 30-Day Low Point (Base) */}
        <div
          className={`p-3.5 rounded-lg border shadow-xs ${
            baseForecast.lowestCash < 0 ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">30d Cash Low</span>
            <TrendingDown className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div
            className={`font-mono text-lg font-bold ${
              baseForecast.lowestCash < 0 ? 'text-rose-700' : 'text-slate-900'
            }`}
          >
            {formatINR(baseForecast.lowestCash)}
          </div>
          <span className="text-[11px] text-slate-500">Day +{baseForecast.lowestDay} projected point</span>
        </div>
      </div>

      {/* End-to-End Workflow Infographic Bar (User Attachment Adaptation) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              AI Munim End-to-End Operating Pipeline
            </h3>
            <p className="text-xs text-slate-500">
              From raw documents to ledger posting, reconciliation, and cash flow decisions.
            </p>
          </div>
          <span className="text-[11px] font-mono text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
            Autonomous Pipeline Active
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {workflowSteps.map(step => {
            const Icon = step.icon;
            return (
              <button
                key={step.num}
                onClick={() => onNavigateTab(step.tab)}
                className="group p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-teal-500 hover:shadow-xs transition-all text-left flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-mono text-[11px] font-bold flex items-center justify-center">
                      {step.num}
                    </span>
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 group-hover:text-teal-700">
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{step.desc}</p>
                </div>
                <div className="mt-2.5 flex items-center text-[10px] text-teal-600 font-medium">
                  <span>Open workspace</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Needs Attention & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs Attention Action Center */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-900">Priority Action Center</h3>
            <span className="text-xs text-slate-500">Live Exception Feed</span>
          </div>

          <div className="space-y-2.5">
            {isPristineLiveState && (
              <div className="p-4 rounded-lg border border-teal-200 bg-teal-50/40 text-center">
                <CheckCircle2 className="w-6 h-6 text-teal-600 mx-auto mb-1.5" />
                <h4 className="text-xs font-bold text-teal-950">No Overdue Debts or Mismatches</h4>
                <p className="text-[11px] text-teal-800 mt-0.5">
                  Your business books are in pristine condition. Ready to record customer receivables and supplier payables.
                </p>
              </div>
            )}

            {cautiousForecast.lowestCash < 0 && (
              <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/40 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-rose-900">Cash Shortfall in Cautious Scenario</h4>
                    <p className="text-xs text-rose-700 mt-0.5">
                      Closing cash projects to {formatINR(cautiousForecast.lowestCash)} on Day +{cautiousForecast.lowestDay} if collections lag.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('cash')}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded shrink-0"
                >
                  Inspect
                </button>
              </div>
            )}

            {gstMismatchCount > 0 && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-amber-900">
                      {gstMismatchCount} GSTR-2B Exceptions Open
                    </h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Tax discrepancies reduce eligible ITC. Resolve differences with suppliers before return lock.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('gst')}
                  className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded shrink-0"
                >
                  Resolve
                </button>
              </div>
            )}

            {state.receivables.filter(r => r.overdueDays > 30 && !r.isDisputed).map(inv => (
              <div
                key={inv.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800">{inv.customer}</span>
                    <span className="text-[10px] font-mono font-medium text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                      {inv.overdueDays}d overdue
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Invoice {inv.id} for {formatINR(inv.amount)} has no confirmed promise date.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('collections')}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded shrink-0"
                >
                  Follow-up
                </button>
              </div>
            ))}

            {unreconciledBankCount > 0 && (
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">
                    {unreconciledBankCount} Bank Transactions Awaiting Match
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    AI matched high-confidence lines with open invoices. 1-click confirm updates book cash.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('bank')}
                  className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded shrink-0"
                >
                  Reconcile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Audit Trail */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-bold text-slate-900">Recent Immutable Activity Log</h3>
              <span className="text-xs text-slate-400 font-mono">BRIN Partitioned</span>
            </div>

            <div className="space-y-3">
              {state.auditLogs.slice(0, 5).map(log => (
                <div key={log.id} className="text-xs border-b border-slate-100 pb-2.5 last:border-0">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                    <span className="font-semibold text-slate-700">{log.user}</span>
                    <span className="font-mono">{log.timestamp}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{log.action}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Every posted transaction creates balanced journal entries.</span>
            <button
              onClick={() => onNavigateTab('settings')}
              className="text-teal-700 font-semibold hover:underline flex items-center gap-1"
            >
              <span>View Masters &amp; Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
