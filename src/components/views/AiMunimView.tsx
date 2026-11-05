import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  HelpCircle,
  FileText,
  ShieldCheck,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { AppState } from '../../db/concurrencyEngine.ts';
import { AiChatMessage } from '../../types/accounting.ts';

interface AiMunimViewProps {
  state: AppState;
  onAskQuestion: (question: string) => Promise<AiChatMessage>;
}

const PRESET_QUESTIONS = [
  'Which customers are overdue?',
  'Will cash be enough for 30 days?',
  'What is my GST liability?',
  'What payments are due next week?',
  'Why is GSTR-2B different?'
];

export const AiMunimView: React.FC<AiMunimViewProps> = ({ state, onAskQuestion }) => {
  const [inputQuestion, setInputQuestion] = useState('');
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'init-1',
      question: 'Will cash be enough for 30 days?',
      answer:
        'Book Cash Balance: ₹3,00,000\nBase Scenario Low Point: ₹68,500 on Day +17\nCautious Scenario: Cash deficit of −₹48,200 projected around Day +25 due to simultaneous payroll and delayed collections. Recommendation: Stagger supplier payments or chase top 2 overdue accounts (Sharma Traders & Kapoor Steels).',
      basis:
        '30-day projection modeling receivables inflow timing, scheduled supplier payables, statutory GST payment on Day 17 (₹36,000), and fixed payroll on Day 25 (₹2,60,000).',
      sources: ['Cash Forecast Engine', 'Open Receivables', 'Open Payables'],
      timestamp: 'Today, 08:35 PM'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setInputQuestion('');
    try {
      const res = await onAskQuestion(trimmed);
      setMessages(prev => [res, ...prev]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
            <Bot className="w-4 h-4 text-teal-100" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              AI Munim – Financial Copilot &amp; Intelligence
            </h3>
            <p className="text-xs text-slate-500">
              Deterministic, read-only financial assistant. Answers derive exclusively from verified application ledgers and state calculations.
            </p>
          </div>
        </div>

        {/* Input Form */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSubmit(inputQuestion);
          }}
          className="mt-4 flex gap-2"
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={e => setInputQuestion(e.target.value)}
            placeholder="Ask about overdue dues, cash runway, net GST liability, or upcoming supplier bills..."
            className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white transition-all font-sans"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuestion.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Analyzing...' : 'Ask AI'}</span>
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Suggested:</span>
          {PRESET_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => handleSubmit(q)}
              disabled={isLoading}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-slate-200 text-slate-600 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Answer History */}
      <div className="space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-900 font-sans">
                Q: {msg.question}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">{msg.timestamp}</span>
            </div>

            {/* Structured Answer */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-line">
              {msg.answer}
            </div>

            {/* Verifiable Basis & Sources */}
            <div className="pt-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span><b>Basis:</b> {msg.basis}</span>
              </div>
              {msg.sources.length > 0 && (
                <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                  <span>Sources: {msg.sources.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
