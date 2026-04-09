import React, { useEffect, useState } from 'react';
import { api, MONTH_NAMES } from '../utils/api.js';
import { NcalBadge, Spinner, SectionCard, ChartContainer, ChartTooltip, ResponsiveContainer } from '../components/ui/index.jsx';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Filter, Zap } from 'lucide-react';
import { cn } from '../lib/utils.js';

const PIE_COLORS = [
  'var(--color-primary)', 
  'var(--color-success)', 
  'var(--color-warning)', 
  'var(--color-error)', 
  'var(--color-info)',
  '#8b5cf6', '#f97316', '#ec4899', '#14b8a6', '#84cc16'
];
const NCAL_OPTIONS = ['', 'BLACK', 'RED', 'ORANGE', 'YELLOW', 'BLUE'];
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => currentYear - i);

const CustomLabel = ({ cx, cy, midAngle, outerRadius, name, percent }) => {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const r = outerRadius + 20;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text 
      x={x} y={y} 
      className="fill-foreground/40 font-black" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central" 
      fontSize={10}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
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
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-black tracking-tight text-foreground uppercase">Root Cause Analysis</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 leading-relaxed">Historical statistics of incident classifications</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-background border border-foreground/5 p-4 py-3 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 text-[10px] font-black text-foreground/40 uppercase tracking-widest mr-2">
          <Filter size={14} strokeWidth={2.5} /> Filter Perspective
        </div>
        
        <div className="flex flex-wrap gap-3">
            {[
                { label: 'Year', value: filters.year, key: 'year', options: YEAR_OPTIONS.map(y => ({ v: y, l: y })) },
                { label: 'Month', value: filters.month, key: 'month', options: [{ v: '', l: 'All Months' }, ...MONTH_NAMES.map((m, i) => ({ v: String(i+1).padStart(2,'0'), l: m }))] },
                { label: 'NCAL', value: filters.ncal, key: 'ncal', options: [{ v: '', l: 'All NCAL' }, ...NCAL_OPTIONS.filter(Boolean).map(n => ({ v: n, l: n }))] }
            ].map(f => (
                <div key={f.key} className="flex items-center gap-2 bg-muted/30 border border-foreground/5 rounded-md px-3 h-8">
                    <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{f.label}</span>
                    <select 
                        className="bg-transparent border-none focus:ring-0 text-[11px] font-black text-foreground outline-none cursor-pointer"
                        value={f.value} 
                        onChange={e => setF(f.key, e.target.value)}
                    >
                        {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                </div>
            ))}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Visual Analytics */}
          <div className="xl:col-span-5 flex flex-col gap-6">
            {/* Pie Chart */}
            <SectionCard title="Categorical Weight" subtitle="Classification Distribution" padding={false}>
              <div className="p-6">
                <ChartContainer config={rootCauseConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie 
                        data={data} 
                        dataKey="count" 
                        nameKey="classification" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={70} 
                        outerRadius={95} 
                        strokeWidth={4} 
                        stroke="var(--color-background)" 
                        labelLine={false} 
                        label={CustomLabel}
                        animationDuration={1000}
                        paddingAngle={2}
                      >
                        {data.map((entry, i) => (
                           <Cell 
                             key={i} 
                             fill={rootCauseConfig[entry.classification]?.color || PIE_COLORS[i % PIE_COLORS.length]} 
                           />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip config={rootCauseConfig} />} />
                      {total > 0 && (
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground">
                          <tspan x="50%" dy="-10" className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">INCIDENTS</tspan>
                          <tspan x="50%" dy="28" className="text-4xl font-black tracking-tighter tabular-nums">{total}</tspan>
                        </text>
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </SectionCard>

            {/* Ranking Progress List */}
            <SectionCard title="Frequency Ranking" subtitle="Primary Volume Drivers" padding={false}>
              <div className="p-6 flex flex-col gap-5 overflow-auto max-h-[300px] custom-scrollbar">
                {data.slice(0, 8).map((entry, i) => {
                  const color = rootCauseConfig[entry.classification]?.color || PIE_COLORS[i % PIE_COLORS.length];
                  const pct = total ? (entry.count / total) * 100 : 0;
                  return (
                    <div key={entry.classification} className="flex flex-col gap-2">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-[11px] font-black tracking-tight text-foreground/80 uppercase">{entry.classification}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[11px] font-black text-foreground tabular-nums">{entry.count}</span>
                          <span className="text-[9px] font-bold text-foreground/30 w-8 text-right uppercase">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="w-full h-1 bg-foreground/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          {/* Right Panel: Detailed Breakdown */}
          <SectionCard 
            title="Classification Audit" 
            subtitle="Full Inventory & Statistical Breakdown" 
            padding={false}
            className="xl:col-span-7 flex flex-col min-h-0"
          >
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-foreground/[0.02] border-b border-foreground/5">
                    <th className="w-14 text-center uppercase tracking-widest text-[9px] font-black text-foreground/30 py-4 px-4 sticky top-0 bg-background/95 backdrop-blur-md z-10">ID</th>
                    <th className="text-left uppercase tracking-widest text-[9px] font-black text-foreground/30 py-4 px-4 sticky top-0 bg-background/95 backdrop-blur-md z-10">Classification Segment</th>
                    <th className="w-24 text-center uppercase tracking-widest text-[9px] font-black text-foreground/30 py-4 px-4 sticky top-0 bg-background/95 backdrop-blur-md z-10">Volume</th>
                    <th className="w-48 text-right uppercase tracking-widest text-[9px] font-black text-foreground/30 py-4 px-4 sticky top-0 bg-background/95 backdrop-blur-md z-10">Historical Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-24">
                        <div className="flex flex-col items-center gap-2 opacity-20">
                            <Zap size={32} />
                            <span className="text-[10px] font-black uppercase tracking-widest">No Intelligence Found</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {data.map((row, i) => {
                    const pct = total ? ((row.count / total) * 100).toFixed(1) : 0;
                    const color = PIE_COLORS[i % PIE_COLORS.length];
                    return (
                      <tr key={row.classification} className="hover:bg-foreground/[0.01] transition-colors group">
                        <td className="text-center font-mono font-black text-foreground/20 text-[10px] py-4">
                          {String(i + 1).padStart(2, '0')}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-4 rounded-full" style={{ backgroundColor: color }} />
                            <span className="font-black text-[11px] tracking-tight text-foreground/80 uppercase leading-none">{row.classification}</span>
                          </div>
                        </td>
                        <td className="text-center font-mono font-black text-[12px] py-4 text-primary tabular-nums">
                          {row.count}
                        </td>
                        <td className="py-4 pr-6">
                          <div className="flex items-center gap-4 justify-end">
                            <span className="font-mono font-black text-[10px] w-12 text-right text-foreground/50 tabular-nums">{pct}%</span>
                            <div className="w-24 bg-foreground/5 rounded-full h-1 overflow-hidden">
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
          </SectionCard>
        </div>
      )}
    </div>
  );
}
