import React, { useEffect, useState } from 'react';
import { api, MONTH_NAMES } from '../utils/api.js';
import { NcalBadge, Spinner, SectionCard, ChartContainer, ChartTooltip, ChartLegend, ResponsiveContainer } from '../components/ui/index.jsx';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Filter } from 'lucide-react';

const PIE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#f97316','#ec4899','#14b8a6','#84cc16','#64748b'];
const NCAL_OPTIONS = ['', 'BLACK', 'RED', 'ORANGE', 'YELLOW', 'BLUE'];
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => currentYear - i);

const CustomLabel = ({ cx, cy, midAngle, outerRadius, name, percent }) => {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const r = outerRadius + 20;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} className="fill-base-content/70 font-bold" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>{`${(percent * 100).toFixed(0)}%`}</text>;
};

export default function RootCausePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ year: String(currentYear), month: '', ncal: '' });
  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.year) params.year = filters.year;
    if (filters.month) params.month = filters.month;
    if (filters.ncal) params.ncal = filters.ncal;
    api.getRootCause(params).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [filters.year, filters.month, filters.ncal]);

  const total = data.reduce((s, d) => s + d.count, 0);

  // Dynamic config for root causes
  const rootCauseConfig = React.useMemo(() => {
    const config = {};
    data.forEach((item, idx) => {
      config[item.classification] = {
        label: item.classification,
        color: PIE_COLORS[idx % PIE_COLORS.length]
      };
    });
    return config;
  }, [data]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="text-2xl font-bold tracking-tight">Root Cause Analysis</div>
        <div className="text-xs font-bold uppercase tracking-wider text-base-content/65">Historical statistics of incident classifications</div>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-base-100 p-4 py-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-base-content/65 uppercase tracking-wider">
          <Filter size={14} /> Filter Analysis
        </div>
        <select className="select select-sm w-32 font-semibold text-sm bg-base-200/50" value={filters.year} onChange={e => setF('year', e.target.value)}>
          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="select select-sm w-40 font-semibold text-sm bg-base-200/50" value={filters.month} onChange={e => setF('month', e.target.value)}>
          <option value="">All Months</option>
          {MONTH_NAMES.map((m, i) => <option key={i+1} value={String(i+1).padStart(2,'0')}>{m}</option>)}
        </select>
        <select className="select select-sm w-40 font-semibold text-sm bg-base-200/50" value={filters.ncal} onChange={e => setF('ncal', e.target.value)}>
          <option value="">All NCAL</option>
          {NCAL_OPTIONS.filter(Boolean).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Visual Analytics */}
          <div className="xl:col-span-5 flex flex-col gap-6">
            {/* Pie Chart */}
            <div className="bg-base-100 shadow-sm rounded-2xl border border-base-content/5 overflow-visible">
              <div className="p-5 border-b border-base-content/5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/65">Classification Distribution</h3>
              </div>
              <div className="p-6 relative">
                <ChartContainer config={rootCauseConfig} className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie data={data} dataKey="count" nameKey="classification" cx="50%" cy="50%" innerRadius={65} outerRadius={85} strokeWidth={2} stroke="currentColor" className="text-base-100" labelLine={false} label={CustomLabel}>
                        {data.map((entry, i) => <Cell key={i} fill={rootCauseConfig[entry.classification]?.color || PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip config={rootCauseConfig} />} />
                      {total > 0 && (
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-base-content">
                          <tspan x="50%" dy="-8" className="text-[10px] font-bold uppercase tracking-widest opacity-50">Total</tspan>
                          <tspan x="50%" dy="22" className="text-3xl font-bold tracking-tighter">{total}</tspan>
                        </text>
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>

            {/* Bar Chart (Freq) */}
            <div className="bg-base-100 shadow-sm rounded-2xl border border-base-content/5 overflow-visible">
              <div className="p-5 border-b border-base-content/5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/65">Frequency ranking</h3>
              </div>
              <div className="p-5 flex flex-col gap-4 overflow-auto h-[220px] custom-scrollbar">
                {data.slice(0, 5).map((entry, i) => {
                  const color = rootCauseConfig[entry.classification]?.color || PIE_COLORS[i % PIE_COLORS.length];
                  const pct = total ? (entry.count / total) * 100 : 0;
                  return (
                    <div key={entry.classification} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-bold tracking-tight text-base-content/85">{entry.classification}</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-base-content">{entry.count}</span>
                          <span className="text-[10px] font-bold text-base-content/40 w-8 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-base-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Panel: Detailed Breakdown */}
          <div className="xl:col-span-7 bg-base-100 shadow-sm rounded-2xl border border-base-content/5 overflow-hidden flex flex-col xl:h-[calc(250px+220px+120px+24px)]">
            <div className="p-5 border-b border-base-content/5 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/65">Classification Breakdown</h3>
              <div className="badge badge-sm font-bold bg-base-200 text-base-content/65 border-none px-3 uppercase tracking-wider">{data.length} Types</div>
            </div>
            
            <div className="overflow-auto flex-1 custom-scrollbar w-full p-0">
              <table className="table table-sm table-pin-rows w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="bg-base-100/95 backdrop-blur-md w-14 text-center uppercase tracking-wider text-[10px] font-bold text-base-content/65 py-4 border-b border-base-content/5">#</th>
                    <th className="bg-base-100/95 backdrop-blur-md text-left uppercase tracking-wider text-[10px] font-bold text-base-content/65 py-4 border-b border-base-content/5">Classification</th>
                    <th className="bg-base-100/95 backdrop-blur-md w-24 text-center uppercase tracking-wider text-[10px] font-bold text-base-content/65 py-4 border-b border-base-content/5">Count</th>
                    <th className="bg-base-100/95 backdrop-blur-md w-48 text-left uppercase tracking-wider text-[10px] font-bold text-base-content/65 py-4 border-b border-base-content/5">Share %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-content/5">
                  {data.length === 0 && <tr><td colSpan={4} className="text-center py-20 font-bold text-base-content/30 uppercase tracking-widest text-xs">Analysis Offline</td></tr>}
                  {data.map((row, i) => {
                    const pct = total ? ((row.count / total) * 100).toFixed(1) : 0;
                    const color = PIE_COLORS[i % PIE_COLORS.length];
                    return (
                      <tr key={row.classification} className="hover:bg-base-200/50 transition-colors duration-200 group">
                        <td className="text-center font-mono font-bold text-base-content/30 text-xs py-3.5">
                          {String(i + 1).padStart(2, '0')}
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-[2px] shrink-0" style={{ backgroundColor: color }} />
                            <span className="font-bold text-sm tracking-tight text-base-content/85">{row.classification}</span>
                          </div>
                        </td>
                        <td className="text-center font-mono font-bold text-sm py-3.5 text-primary">
                          {row.count}
                        </td>
                        <td className="py-3.5 pr-5">
                          <div className="flex items-center gap-4">
                            <span className="font-mono font-bold text-xs w-12 text-right text-base-content/65">{pct}%</span>
                            <div className="flex-1 bg-base-200 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-1000" 
                                style={{ width: `${pct}%`, backgroundColor: color }} 
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
