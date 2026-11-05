import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowDownRight,
  Info
} from 'lucide-react';
import { AppState } from '../../db/concurrencyEngine.ts';
import { formatINR, calculateCashForecast, getEligibleItc } from '../../utils/accounting.ts';

interface CashForecastViewProps {
  state: AppState;
}

export const CashForecastView: React.FC<CashForecastViewProps> = ({ state }) => {
  const [scenario, setScenario] = useState<'base' | 'cautious' | 'optimistic'>('base');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  const eligibleItc = getEligibleItc(state.gstRows);
  const forecast = calculateCashForecast(
    state.cashBalance,
    state.receivables,
    state.payables,
    scenario,
    state.salesTaxOutput,
    eligibleItc,
    30
  );

  const points = forecast.points;
  const values = points.map(p => (scenario === 'base' ? p.baseCash : scenario === 'cautious' ? p.cautiousCash : p.optimisticCash));
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 400000);

  // SVG Chart Dimensions
  const width = 800;
  const height = 240;
  const padLeft = 70;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 35;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const getY = (val: number) => {
    return padTop + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
  };

  const getX = (idx: number) => {
    return padLeft + (idx / (points.length - 1)) * chartW;
  };

  const polylinePoints = points.map((p, idx) => `${getX(idx)},${getY(values[idx])}`).join(' ');
  const zeroY = getY(0);

  const lowestPointIndex = values.indexOf(forecast.lowestCash);
  const selectedPoint = selectedDayIndex !== null ? points[selectedDayIndex] : null;

  return (
    <div className="space-y-6">
      {/* Chart Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              30-Day Liquidity &amp; Cash Flow Projection
            </h3>
            <p className="text-xs text-slate-500">
              Simulating dynamic receivables velocity against supplier obligations and statutory tax outlays.
            </p>
          </div>

          {/* Scenario Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['cautious', 'base', 'optimistic'] as const).map(sc => (
              <button
                key={sc}
                onClick={() => setScenario(sc)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  scenario === sc
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sc.charAt(0).toUpperCase() + sc.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Status Callout */}
        <div
          className={`p-3 rounded-lg border mb-4 flex items-center justify-between text-xs ${
            forecast.lowestCash < 0
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-teal-50 border-teal-200 text-teal-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {forecast.lowestCash < 0 ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            )}
            <span>
              {forecast.lowestCash < 0
                ? `Projected Liquidity Deficit: Cash balance drops below zero around Day +${forecast.lowestDay}, reaching ${formatINR(forecast.lowestCash)}.`
                : `Liquidity Covered: Lowest projected cash balance is ${formatINR(forecast.lowestCash)} on Day +${forecast.lowestDay}.`}
            </span>
          </div>
          <span className="font-mono font-bold">{formatINR(forecast.lowestCash)}</span>
        </div>

        {/* SVG Projection Graph */}
        <div className="relative overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none"
            style={{ minWidth: '600px' }}
          >
            {/* Zero Axis Line */}
            {minVal < 0 && (
              <line
                x1={padLeft}
                y1={zeroY}
                x2={width - padRight}
                y2={zeroY}
                stroke="#dc2626"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.6"
              />
            )}

            {/* Grid Lines & Y Axis Labels */}
            {[maxVal, (maxVal + minVal) / 2, minVal].map((val, idx) => {
              const y = getY(val);
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    fontSize="10"
                    fill="#64748b"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {formatINR(val)}
                  </text>
                </g>
              );
            })}

            {/* Cash Curve Line */}
            <polyline
              fill="none"
              stroke="#0d9488"
              strokeWidth="2.5"
              points={polylinePoints}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive Circles & Lowest Point */}
            {points.map((p, idx) => {
              const x = getX(idx);
              const y = getY(values[idx]);
              const isLowest = idx === lowestPointIndex;
              const isSelected = idx === selectedDayIndex;

              return (
                <g key={idx}>
                  {isLowest && (
                    <circle
                      cx={x}
                      cy={y}
                      r={forecast.lowestCash < 0 ? 6 : 4}
                      fill={forecast.lowestCash < 0 ? '#dc2626' : '#0d9488'}
                      stroke="#fff"
                      strokeWidth="2"
                    />
                  )}
                  {/* Invisible Hitbox for Mouse Hover / Click */}
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill="transparent"
                    className="cursor-pointer hover:stroke-teal-600 hover:stroke-2"
                    onClick={() => setSelectedDayIndex(idx)}
                  />
                </g>
              );
            })}

            {/* X Axis Labels */}
            <text x={padLeft} y={height - 8} fontSize="10" fill="#64748b" fontFamily="monospace">
              Day 0 (Today)
            </text>
            <text x={padLeft + chartW / 2} y={height - 8} fontSize="10" fill="#64748b" textAnchor="middle" fontFamily="monospace">
              Day +15
            </text>
            <text x={width - padRight} y={height - 8} fontSize="10" fill="#64748b" textAnchor="end" fontFamily="monospace">
              Day +30
            </text>
          </svg>
        </div>

        {/* Selected Day Inspector */}
        {selectedPoint && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <span className="font-bold text-slate-800">{selectedPoint.dateStr}: </span>
              <span className="font-mono text-teal-800 font-semibold mr-3">
                Closing Cash: {formatINR(scenario === 'base' ? selectedPoint.baseCash : scenario === 'cautious' ? selectedPoint.cautiousCash : selectedPoint.optimisticCash)}
              </span>
              <span className="text-slate-500 font-mono">
                (+{formatINR(selectedPoint.inflow)} / -{formatINR(selectedPoint.outflow)})
              </span>
            </div>
            {selectedPoint.events.length > 0 ? (
              <span className="text-[11px] text-slate-600 italic">
                {selectedPoint.events.join(', ')}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">No scheduled lump-sum transactions</span>
            )}
          </div>
        )}
      </div>

      {/* Model Assumptions & Rules Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Forecast Assumptions &amp; Sensitivity Parameters
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="space-y-2 border-l-2 border-teal-600 pl-3">
            <span className="font-semibold text-slate-900 block">Cash Inflow Dynamics</span>
            <p>
              • Inflows honor customer promise-to-pay dates where recorded.
            </p>
            <p>
              • Unpromised invoices default to 8 days (1–30d overdue) or 12 days (&gt;30d overdue).
            </p>
            <p>
              • <b>Cautious Mode:</b> Customer collections slip by +10 days with a 20% haircut for delays.
            </p>
          </div>

          <div className="space-y-2 border-l-2 border-amber-600 pl-3">
            <span className="font-semibold text-slate-900 block">Committed Outflow Outlays</span>
            <p>
              • Supplier bills fall due precisely on maturity date (e.g. Day +4, +7, +11).
            </p>
            <p>
              • <b>Statutory GST Settlement:</b> Scheduled for Day 17 ({formatINR(Math.max(0, state.salesTaxOutput - eligibleItc))}).
            </p>
            <p>
              • <b>Fixed Operating Payroll:</b> ₹2,60,000 committed on Day 25.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
