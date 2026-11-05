import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  Lock,
  Building,
  Users,
  CheckCircle2,
  FileCheck2,
  Receipt,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { UserRole, User } from '../../types/accounting.ts';

interface LoginPageProps {
  onLoginSuccess: (user: User, redirectTab: string) => void;
  availableUsers: User[];
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, availableUsers }) => {
  const [selectedEmail, setSelectedEmail] = useState('owner@sampletraders.in');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleMeta: Record<
    UserRole,
    { title: string; desc: string; landing: string; landingLabel: string; color: string; icon: any }
  > = {
    owner: {
      title: 'Owner / Executive Admin',
      desc: 'Company-wide financial dashboards, master settings, cash forecasts, and final payment approvals.',
      landing: 'overview',
      landingLabel: 'Overview Dashboard',
      color: 'border-emerald-500/40 hover:border-emerald-500 bg-emerald-50/30 text-emerald-950',
      icon: TrendingUp
    },
    fin: {
      title: 'Finance Executive',
      desc: 'AI OCR document capture, supplier bill entry, GSTR-2B matching, and bank statement line reconciliation.',
      landing: 'capture',
      landingLabel: 'Capture & Approve (OCR)',
      color: 'border-blue-500/40 hover:border-blue-500 bg-blue-50/30 text-blue-950',
      icon: FileCheck2
    },
    col: {
      title: 'Collections Executive',
      desc: 'Receivables ageing tracking, customer payment promises, and TRAI-compliant WhatsApp reminder dispatches.',
      landing: 'collections',
      landingLabel: 'Collections Autopilot',
      color: 'border-amber-500/40 hover:border-amber-500 bg-amber-50/30 text-amber-950',
      icon: Users
    },
    app: {
      title: 'Designated Approver',
      desc: 'Maker-Checker dual authorization, journal validation, and bill approvals up to configured limits.',
      landing: 'payables',
      landingLabel: 'Payables & Approvals',
      color: 'border-purple-500/40 hover:border-purple-500 bg-purple-50/30 text-purple-950',
      icon: Receipt
    },
    client: {
      title: 'External Client Portal',
      desc: 'Customer statement review, invoice payment reconciliation, and dispute ticket tracking.',
      landing: 'collections',
      landingLabel: 'Statement & Dues',
      color: 'border-teal-500/40 hover:border-teal-500 bg-teal-50/30 text-teal-950',
      icon: Building
    }
  };

  const handleQuickLogin = (user: User) => {
    setSelectedEmail(user.email);
    setPassword(user.password || 'demo123');
    setError('');

    const meta = roleMeta[user.role] || roleMeta.owner;
    setIsSubmitting(true);
    setTimeout(() => {
      onLoginSuccess(user, meta.landing);
      setIsSubmitting(false);
    }, 300);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = availableUsers.find(u => u.email.toLowerCase() === selectedEmail.toLowerCase().trim());
    if (!user) {
      setError('Invalid account email. Please choose one of the configured demo personas.');
      return;
    }
    if (!user.active) {
      setError('This user profile has been deactivated by administrator.');
      return;
    }

    const meta = roleMeta[user.role] || roleMeta.owner;
    setIsSubmitting(true);
    setTimeout(() => {
      onLoginSuccess(user, meta.landing);
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-10 font-sans">
      {/* Top Brand Bar */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-900/30">
            <Sparkles className="w-5 h-5 text-teal-100" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-tight">AI Munim</h1>
            <p className="text-xs text-slate-400">GST, Collections &amp; Cash Flow on Autopilot</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span>Role-Based Portal Redirection Active</span>
        </div>
      </div>

      {/* Main Login Workspace */}
      <div className="max-w-6xl mx-auto w-full py-8 sm:py-10">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-[11px] font-mono uppercase tracking-widest text-teal-400 bg-teal-950/60 border border-teal-800/80 px-3 py-1 rounded-full inline-block mb-3">
            Role-Based Authentication Gateway
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sign In to Your Financial Workspace
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
            Select an authorized persona below for 1-click login and automatic redirection to your department workspace, or sign in using your credentials.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-6 p-3 bg-rose-950/60 border border-rose-800 text-rose-200 text-xs rounded-lg flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1-Click Role Persona Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-10">
          {availableUsers.slice(0, 4).map(user => {
            const meta = roleMeta[user.role];
            const Icon = meta.icon;
            const isSelected = selectedEmail.toLowerCase() === user.email.toLowerCase();

            return (
              <div
                key={user.id}
                onClick={() => handleQuickLogin(user)}
                className={`cursor-pointer rounded-xl p-4 border transition-all text-left flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-slate-800 border-teal-500 shadow-lg shadow-teal-950/40 ring-1 ring-teal-500'
                    : 'bg-slate-800/60 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-700/80 group-hover:bg-teal-600/30 flex items-center justify-center text-teal-400 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-700">
                      Redirect: {meta.landingLabel}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                    {user.name}
                  </h3>
                  <p className="text-[11px] text-teal-400 font-medium mb-1.5">{meta.title}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{meta.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/70">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-2">
                    <span>ID: {user.email}</span>
                  </div>
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-white bg-slate-700 group-hover:bg-teal-600 transition-colors"
                  >
                    <span>Quick Login</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Manual Login Card with Dummy ID helper */}
        <div className="max-w-md mx-auto bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl backdrop-blur-xs">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white">Manual Sign In &amp; Role Redirection</h3>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Authorized User Email / Dummy ID
              </label>
              <input
                type="email"
                value={selectedEmail}
                onChange={e => setSelectedEmail(e.target.value)}
                placeholder="e.g. owner@sampletraders.in"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              />
              <span className="text-[10px] text-slate-500 block mt-1">Default demo password: <code className="text-teal-400 font-mono">demo123</code></span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md shadow-teal-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Authenticating & Redirecting...' : 'Sign In & Redirect to Workspace'}</span>
            </button>
          </form>

          {/* Dummy ID quick copy chips */}
          <div className="mt-5 pt-4 border-t border-slate-700/80">
            <span className="text-[11px] text-slate-400 block mb-2 font-medium">Quick Persona Fill:</span>
            <div className="flex flex-wrap gap-1.5">
              {availableUsers.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedEmail(u.email);
                    setPassword('demo123');
                    setError('');
                  }}
                  className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
                    selectedEmail === u.email
                      ? 'bg-teal-950 text-teal-300 border-teal-700 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {u.role.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Security & Architecture Footer */}
      <div className="max-w-6xl mx-auto w-full pt-6 border-t border-slate-800 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
          <span>Tenant Isolation • Role-Based Row-Level Access • Double-Entry Ledger Invariants</span>
        </div>
        <span className="font-mono text-slate-400">Node.js Express &amp; PostgreSQL 16</span>
      </div>
    </div>
  );
};
