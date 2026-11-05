import React from 'react';
import { Sparkles, Menu, Plus, Activity, Bot, LogOut, UserCircle } from 'lucide-react';
import { UserRole, User } from '../types/accounting.ts';

interface TopBarProps {
  currentTab: string;
  tabTitle: string;
  currentRole: UserRole;
  currentUser?: User;
  onSelectRole: (role: UserRole) => void;
  onLogout?: () => void;
  onOpenMobileMenu: () => void;
  onOpenAddBill: () => void;
  onOpenAi: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  tabTitle,
  currentRole,
  currentUser,
  onSelectRole,
  onLogout,
  onOpenMobileMenu,
  onOpenAddBill,
  onOpenAi
}) => {
  const roleBadges: Record<UserRole, { label: string; cls: string }> = {
    owner: { label: 'Admin', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    fin: { label: 'Finance', cls: 'bg-blue-50 text-blue-800 border-blue-200' },
    col: { label: 'Collections', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    app: { label: 'Approver', cls: 'bg-purple-50 text-purple-800 border-purple-200' },
    client: { label: 'Client', cls: 'bg-teal-50 text-teal-800 border-teal-200' }
  };

  const badge = roleBadges[currentRole] || roleBadges.owner;

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 z-10">
      {/* Zone 1: Mobile toggle + Breadcrumb Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 text-sm md:text-base tracking-tight whitespace-nowrap">
            {tabTitle}
          </span>
          <span className="hidden sm:inline-block text-xs text-slate-400 font-mono">
            / Sample Traders Pvt Ltd
          </span>
        </div>
      </div>

      {/* Zone 2: Real-time Concurrency & State Indicator */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span className="text-[11px] text-slate-700 font-medium">Node.js PG Concurrency Active</span>
        </div>
      </div>

      {/* Zone 3: Actions & Active Persona Pill */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Quick Ask AI button */}
        <button
          onClick={onOpenAi}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap"
        >
          <Bot className="w-3.5 h-3.5 text-teal-600" />
          <span>Ask AI</span>
        </button>

        {/* Quick Add Bill (for owner and finance) */}
        {(currentRole === 'owner' || currentRole === 'fin') && (
          <button
            onClick={onOpenAddBill}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors whitespace-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Bill</span>
            <span className="sm:hidden">Bill</span>
          </button>
        )}

        {/* User Persona Profile Pill */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {currentUser?.name || 'Anita Rao'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {currentUser?.email || 'owner@sampletraders.in'}
            </span>
          </div>

          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badge.cls}`}>
            {badge.label}
          </span>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
              title="Sign Out / Switch Persona"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
