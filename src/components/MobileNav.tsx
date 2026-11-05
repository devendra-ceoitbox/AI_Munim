import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileScan,
  Users,
  TrendingUp,
  MoreHorizontal,
  X,
  Receipt,
  FileSpreadsheet,
  Building2,
  Bot,
  Settings,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { UserRole } from '../types/accounting.ts';

interface MobileNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onLogout?: () => void;
  isOpenDrawer: boolean;
  onCloseDrawer: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
  currentRole,
  onSelectRole,
  onLogout,
  isOpenDrawer,
  onCloseDrawer
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'capture', label: 'Capture', icon: FileScan },
    { id: 'collections', label: 'Collections', icon: Users },
    { id: 'cash', label: 'Forecast', icon: TrendingUp }
  ];

  const moreTabs = [
    { id: 'payables', label: 'Payables & Bills', icon: Receipt },
    { id: 'gst', label: 'GST Workspace', icon: FileSpreadsheet },
    { id: 'bank', label: 'Bank Reconciliation', icon: Building2 },
    { id: 'ai', label: 'Ask AI Munim', icon: Bot },
    { id: 'settings', label: 'Settings & Masters', icon: Settings }
  ];

  const handleTabClick = (tabId: string) => {
    onSelectTab(tabId);
    setShowMoreMenu(false);
    onCloseDrawer();
  };

  return (
    <>
      {/* Slide-out Full Mobile Drawer */}
      {(isOpenDrawer || showMoreMenu) && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => {
              setShowMoreMenu(false);
              onCloseDrawer();
            }}
          />
          <div className="relative w-72 max-w-[80vw] bg-slate-900 text-white flex flex-col p-4 shadow-2xl z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="font-bold text-sm tracking-tight">AI Munim Menu</span>
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onCloseDrawer();
                }}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role switch in mobile drawer */}
            <div className="py-3 border-b border-slate-800">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Role Persona
              </label>
              <select
                value={currentRole}
                onChange={e => onSelectRole(e.target.value as UserRole)}
                className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-md p-2"
              >
                <option value="owner">Owner / Admin</option>
                <option value="fin">Finance Executive</option>
                <option value="col">Collections Executive</option>
                <option value="app">Approver</option>
                <option value="client">Client Portal</option>
              </select>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 space-y-1">
              {[...mainTabs, ...moreTabs].map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-colors ${
                      isActive ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Sign out button at bottom of mobile menu */}
            {onLogout && (
              <div className="pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onCloseDrawer();
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-900 rounded-lg hover:bg-rose-900/60"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out / Switch Persona</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Sticky Tab Bar (Smartphone only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-30 shadow-lg safe-bottom">
        {mainTabs.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                isActive ? 'text-teal-700 font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setShowMoreMenu(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-slate-500 hover:text-slate-900`}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span className="text-[10px] tracking-tight mt-0.5">More</span>
        </button>
      </div>
    </>
  );
};
