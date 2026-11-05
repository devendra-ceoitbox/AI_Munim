import React, { useState } from 'react';
import {
  Database,
  Cpu,
  Layers,
  Zap,
  ShieldCheck,
  Play,
  Terminal,
  Activity,
  CheckCircle2,
  Lock,
  GitBranch
} from 'lucide-react';
import { AppState } from '../../db/concurrencyEngine.ts';

interface DatabaseArchitectureViewProps {
  state: AppState;
  onRunBenchmark: (count: number) => Promise<{
    totalTransactions: number;
    completed: number;
    conflictsHandled: number;
    durationMs: number;
    effectiveTps: number;
  }>;
}

export const DatabaseArchitectureView: React.FC<DatabaseArchitectureViewProps> = ({
  state,
  onRunBenchmark
}) => {
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'architecture' | 'schema' | 'benchmark'>('architecture');

  const metrics = state.metrics;

  const handleBenchmark = async (count: number) => {
    setIsRunningTest(true);
    try {
      const res = await onRunBenchmark(count);
      setTestResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningTest(false);
    }
  };

  const schemaSnippet = `-- HIGH CONCURRENCY PARTITIONED DOCUMENT TABLE
CREATE TABLE documents (
    id UUID DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    doc_type VARCHAR(32) NOT NULL,
    doc_no VARCHAR(64) NOT NULL,
    taxable_value NUMERIC(15,2) NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(32) DEFAULT 'DRAFT' NOT NULL,
    lock_version INT DEFAULT 1 NOT NULL, -- Optimistic Concurrency Control (OCC)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- PARTIAL INDEX: Fast Approver Queue (Skips millions of posted invoices)
CREATE INDEX idx_documents_awaiting_approval
    ON documents(organization_id, due_date)
 WHERE status = 'AWAITING_APPROVAL';

-- WORKER QUEUE: Lock-free high throughput reconciliation
-- SELECT id FROM bank_lines WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED;`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-inner">
              <Database className="w-5 h-5 text-teal-100" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                High-Concurrency Node.js &amp; PostgreSQL Backend
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Engineered for sub-millisecond read/write latency, ACID double-entry invariants, and non-blocking worker pools.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBenchmark(500)}
              disabled={isRunningTest}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isRunningTest ? 'Running Stress Test...' : 'Simulate 500 Concurrent Ops'}</span>
            </button>
          </div>
        </div>

        {/* Live Telemetry KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
          <div>
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Active PG Pool Size</span>
            <span className="font-mono text-base font-bold text-white">
              {metrics.activePoolConnections} / {metrics.maxPoolSize}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Throughput (TPS)</span>
            <span className="font-mono text-base font-bold text-teal-400">
              {metrics.transactionsPerSecond.toLocaleString()} TPS
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Avg Lock Wait</span>
            <span className="font-mono text-base font-bold text-emerald-400">
              {metrics.avgLockWaitMs} ms
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Idempotency Deduplications</span>
            <span className="font-mono text-base font-bold text-purple-400">
              {metrics.idempotentDeduplications}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('architecture')}
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'architecture'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          High-Concurrency Strategies
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'schema'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          PostgreSQL DDL &amp; Partitioning
        </button>
        <button
          onClick={() => setActiveTab('benchmark')}
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'benchmark'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Concurrency Benchmark Runner
        </button>
      </div>

      {/* Tab 1: Architecture Pillars */}
      {activeTab === 'architecture' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              <span>1. Monthly Range Partitioning</span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">Partitioned Tables for Documents &amp; Journals</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tables holding invoices (<code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">documents</code>) and general ledger lines (<code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">journal_lines</code>) are partitioned by month on <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">created_at</code>. This isolates active fiscal periods from historical data, preventing index bloat and maintaining constant query times.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
              <Lock className="w-4 h-4" />
              <span>2. Optimistic Concurrency Control (OCC)</span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">Lock-Free Document Mutations via Versioning</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every financial record contains a <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">lock_version</code> column. Concurrent updates verify <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">WHERE id = $1 AND lock_version = $2</code>. In case of conflicting edits, retries are handled with bounded jitter without blocking other threads.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
              <Cpu className="w-4 h-4" />
              <span>3. Row-Level Locks with SKIP LOCKED</span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">Deadlock-Free Background Processing</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Worker processes matching bank lines or running OCR extraction poll jobs using <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">SELECT ... FOR UPDATE SKIP LOCKED</code>. Multiple worker pods process statement batches simultaneously without waiting or deadlocking.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-purple-700 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>4. Partial &amp; BRIN Indexing</span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">Targeted Index Memory Footprint</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Approver queues use partial index <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">WHERE status = 'AWAITING_APPROVAL'</code>, indexing only 0.1% of active records. High-frequency audit trails use Block Range Indexing (BRIN), keeping index storage under 1% of table size.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Schema Viewer */}
      {activeTab === 'schema' && (
        <div className="bg-slate-950 text-slate-200 rounded-xl p-5 border border-slate-800 font-mono text-xs overflow-x-auto shadow-inner">
          <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-800 text-[11px] text-slate-400">
            <span>File: src/db/schema.sql (PostgreSQL 16 Enterprise)</span>
            <span className="text-teal-400">Range Partitioned &amp; Indexed</span>
          </div>
          <pre className="text-emerald-300 leading-relaxed whitespace-pre font-mono">
            {schemaSnippet}
          </pre>
        </div>
      )}

      {/* Tab 3: Benchmark Runner */}
      {activeTab === 'benchmark' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Real-Time Concurrency &amp; Throughput Stress Simulator
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Executes burst parallel transactions through the Node.js state machine with conflict retry handling.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBenchmark(200)}
                disabled={isRunningTest}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md border border-slate-300"
              >
                200 Ops
              </button>
              <button
                onClick={() => handleBenchmark(1000)}
                disabled={isRunningTest}
                className="px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-md shadow-xs"
              >
                1,000 Ops
              </button>
            </div>
          </div>

          {testResult && (
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-teal-900 text-sm">
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                <span>Stress Benchmark Completed Successfully!</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-teal-800 font-mono">
                <div>
                  <span className="text-[10px] text-teal-600 block">Total Transactions</span>
                  <span className="font-bold text-sm">{testResult.totalTransactions}</span>
                </div>
                <div>
                  <span className="text-[10px] text-teal-600 block">Resolved Latency</span>
                  <span className="font-bold text-sm">{testResult.durationMs} ms</span>
                </div>
                <div>
                  <span className="text-[10px] text-teal-600 block">Throughput Rate</span>
                  <span className="font-bold text-sm text-teal-900">{testResult.effectiveTps.toLocaleString()} TPS</span>
                </div>
                <div>
                  <span className="text-[10px] text-teal-600 block">OCC Conflicts Resolved</span>
                  <span className="font-bold text-sm">{testResult.conflictsHandled}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
