import React from 'react';
import {
  LayoutDashboard,
  FileScan,
  Receipt,
  Users,
  FileSpreadsheet,
  Building2,
  TrendingUp,
  Bot,
  Settings,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  LogOut,
  UserCheck
} from 'lucide-react';
import { UserRole } from '../types/accounting.ts';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onLogout?: () => void;
  badgeCounts: {
    pendingBills: number;
    gstExceptions: number;
    bankPending: number;
    overdueInvoices: number;
  };
}

const ROLES: Record<UserRole, { name: string; title: string; color: string }> = {
  owner: { name: 'Owner / Admin', title: 'Full Access & Final Approver', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' },
  fin: { name: 'Finance Executive', title: 'Data Entry, GST & Bank Prep', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  col: { name: 'Collections Executive', title: 'Receivables & WhatsApp Follow-up', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  app: { name: 'Approver', title: 'Maker-Checker & Sign-Off Limits', color: 'bg-purple-500/10 text-purple-700 border-purple-500/20' },
  client: { name: 'External Client', title: 'Customer Statement & Dues', color: 'bg-teal-500/10 text-teal-700 border-teal-500/20' }
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentRole,
  onSelectRole,
  onLogout,
  badgeCounts
}) => {
  // Navigation visibility based on role (Note: 'db' moved to Settings tab per user request)
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ['owner', 'fin', 'col', 'app'] },
    { id: 'capture', label: 'Capture & Approve (OCR)', icon: FileScan, roles: ['owner', 'fin', 'app'], badge: badgeCounts.pendingBills },
    { id: 'payables', label: 'Payables & Bills', icon: Receipt, roles: ['owner', 'fin', 'app'] },
    { id: 'collections', label: 'Collections Autopilot', icon: Users, roles: ['owner', 'fin', 'col', 'client'], badge: badgeCounts.overdueInvoices },
    { id: 'gst', label: 'GST Workspace', icon: FileSpreadsheet, roles: ['owner', 'fin', 'app'], badge: badgeCounts.gstExceptions },
    { id: 'bank', label: 'Bank Reconciliation', icon: Building2, roles: ['owner', 'fin'], badge: badgeCounts.bankPending },
    { id: 'cash', label: 'Cash Forecast', icon: TrendingUp, roles: ['owner', 'fin', 'col', 'app'] },
    { id: 'ai', label: 'Ask AI Munim', icon: Bot, roles: ['owner', 'fin', 'col', 'app'] },
    { id: 'settings', label: 'Settings & Masters', icon: Settings, roles: ['owner'] }
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(currentRole));

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold shadow-inner">
            <Sparkles className="w-5 h-5 text-teal-100" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-tight">AI Munim</h1>
            <p className="text-[11px] text-slate-400 font-medium">GST, Collections &amp; Cash Flow</p>
          </div>
        </div>
      </div>

      {/* Role Switcher Selector */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Workspace Persona
          </label>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-[10px] text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
              title="Sign out to persona login page"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
        <select
          value={currentRole}
          onChange={e => onSelectRole(e.target.value as UserRole)}
          className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
          aria-label="Select User Role"
        >
          <option value="owner">Owner / Admin (Anita Rao)</option>
          <option value="fin">Finance Executive (Vikram Sethi)</option>
          <option value="col">Collections Executive (Neha Kapoor)</option>
          <option value="app">Approver (Rohit Jain)</option>
          <option value="client">Client Portal (Amit Gupta)</option>
        </select>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="truncate">{ROLES[currentRole]?.title || 'Workspace Member'}</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredNav.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-teal-600 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${
                    isActive ? 'bg-white text-teal-800' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Database & Node.js Engine Status Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px]">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="font-medium text-slate-300">Backend Engine</span>
          <span className="text-teal-400 font-mono text-[10px]">Node.js + PG</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-normal">
          High-concurrency ACID ledger with OCC locks. Masters &amp; DB in Settings.
        </p>
      </div>
    </aside>
  );
};
