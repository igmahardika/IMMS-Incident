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
  return <text x={x} y={y} className="fill-base-content/40 font-medium" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>{`${(percent * 100).toFixed(0)}%`}</text>;
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
        <div className="text-xs font-semibold uppercase tracking-wider text-base-content/40">Historical statistics of incident classifications</div>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-base-100 p-4 py-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-base-content/40 uppercase tracking-wider">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-base-100 shadow-xl rounded-2xl overflow-visible">
            <div className="p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/40">Classification Distribution</h3>
              <p className="text-sm font-medium text-base-content/70 mt-1 uppercase tracking-tight">Total: {total} incidents</p>
            </div>
            <div className="p-6 overflow-visible">
              <ChartContainer config={rootCauseConfig} className="h-[250px] md:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
                    <Pie data={data} dataKey="count" nameKey="classification" cx="50%" cy="50%" outerRadius={95} strokeWidth={2} stroke="currentColor" className="text-base-100" labelLine={false} label={CustomLabel}>
                      {data.map((entry, i) => <Cell key={i} fill={rootCauseConfig[entry.classification]?.color || PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip config={rootCauseConfig} />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="mt-6 pt-6">
                <ChartLegend
                  payload={data.map((entry, i) => ({
                    value: entry.classification,
                    color: rootCauseConfig[entry.classification]?.color || PIE_COLORS[i % PIE_COLORS.length],
                  }))}
                  config={rootCauseConfig}
                />
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-base-100 shadow-xl rounded-2xl overflow-visible">
            <div className="p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/40">Frequency per Classification</h3>
              <p className="text-sm font-medium text-base-content/70 mt-1 uppercase tracking-tight">Sorted by frequency</p>
            </div>
            <div className="p-6 overflow-visible">
              <ChartContainer config={rootCauseConfig} className="h-[300px] md:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 40, top: 8, bottom: 8 }}>
                    <CartesianGrid vertical={false} horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="classification" width={160} tick={{ className: "fill-base-content/60 font-medium", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip config={rootCauseConfig} />} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                      {data.slice(0, 10).map((entry, i) => {
                        const color = rootCauseConfig[entry.classification]?.color || PIE_COLORS[i % PIE_COLORS.length];
                        return <Cell key={i} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>

          {/* Top Table */}
          <div className="bg-base-100 shadow-xl rounded-2xl lg:col-span-2 overflow-hidden">
            <div className="p-6">
              <h3 className="text-base font-bold">Classification Breakdown</h3>
            </div>
            <div className="overflow-auto max-h-[60vh] custom-scrollbar w-full p-0">
              <table className="table table-sm table-pin-rows table-stacked w-full">
                <thead>
                  <tr className="shadow-[0_1px_0_rgba(var(--bc),0.05)]">
                    <th className="bg-base-100/90 backdrop-blur-md w-16 text-center uppercase tracking-wider text-xs text-base-content/50 py-3">#</th>
                    <th className="bg-base-100/90 backdrop-blur-md text-left uppercase tracking-wider text-xs text-base-content/50 py-3">Classification</th>
                    <th className="bg-base-100/90 backdrop-blur-md min-w-[150px] text-center uppercase tracking-wider text-xs text-base-content/50 py-3">Count</th>
                    <th className="bg-base-100/90 backdrop-blur-md min-w-[150px] text-center uppercase tracking-wider text-xs text-base-content/50 py-3">Percentage</th>
                    <th className="bg-base-100/90 backdrop-blur-md min-w-[200px] text-left uppercase tracking-wider text-xs text-base-content/50 py-3">Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 && <tr><td colSpan={5} className="text-center py-10 opacity-50">No data available</td></tr>}
                  {data.map((row, i) => {
                    const pct = total ? ((row.count / total) * 100).toFixed(1) : 0;
                    return (
                      <tr key={row.classification} className="hover:bg-base-200/50 transition-colors duration-300 group border-b border-base-content/5">
                        <td data-label="RANK" className="text-center font-mono opacity-50 text-sm md:py-3">#{i + 1}</td>
                        <td data-label="CLASSIFICATION" className="font-semibold text-sm md:py-3">{row.classification}</td>
                        <td data-label="COUNT" className="text-center font-mono font-semibold text-sm md:py-3">{row.count}</td>
                        <td data-label="PERCENTAGE" className="text-center font-mono md:py-3">
                          <span className="badge badge-sm font-semibold text-xs uppercase tracking-wider" style={{ backgroundColor: `${PIE_COLORS[i % PIE_COLORS.length]}15`, color: PIE_COLORS[i % PIE_COLORS.length] }}>
                            {pct}%
                          </span>
                        </td>
                        <td data-label="DISTRIBUTION" className="md:py-3">
                          <div className="w-full bg-base-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-1000" 
                              style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} 
                            />
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
