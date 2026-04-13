import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../utils/api.js';
import { MONTH_NAMES } from '../utils/constants.js';
import { 
  Spinner, 
  SectionCard, 
  ChartContainer, 
  ChartTooltip, 
  ResponsiveContainer
} from '../components/ui/index.jsx';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Filter, Activity, ShieldAlert, BarChart3, Database, TrendingUp, ChevronDown, Zap } from 'lucide-react';
import { cn } from '../lib/utils.js';

/**
 * Root Cause Analysis - NOC-Grade Intelligence Interface
 * High-fidelity visualization of incident classification and failure vectors.
 */

const PIE_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#0ea5e9', // Sky
  '#8b5cf6', // Violet
  '#f97316', // Orange
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#84cc16'  // Lime
];

const NCAL_OPTIONS = ['', 'BLACK', 'RED', 'ORANGE', 'YELLOW', 'BLUE'];
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => currentYear - i);

export default function RootCausePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ year: String(currentYear), month: '', ncal: '' });
  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  useEffect(() => {
    setLoading(true);
    const params = { ...filters };
    api.getRootCause(params)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  const total = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data]);

  const dominant = useMemo(() => {
    if (data.length === 0) return 'N/A';
    return data.reduce((a, b) => a.count > b.count ? a : b).classification;
  }, [data]);

  const rootCauseConfig = useMemo(() => {
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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden font-sans bg-background text-foreground animate-in fade-in duration-500">
      {/* Precision Header & Filters */}
      <div className="flex flex-col gap-5 shrink-0 mb-6 bg-background/50 backdrop-blur-sm z-20">
        <div className="flex items-end justify-between gap-4 px-1">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-black tracking-tight uppercase leading-none">Root Cause <span className="text-primary italic">Intelligence</span></h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-foreground/40 leading-relaxed">
              Geological Classification <span className="mx-1 opacity-20">|</span> <span className="text-foreground/60">{total}</span> Analysed Samples
            </p>
          </div>
          
          {/* Instrument Control Bar */}
          <div className="flex items-center gap-1.5 p-1 bg-foreground/[0.03] border border-foreground/[0.08] rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 px-3 border-r border-foreground/[0.06] text-foreground/30">
               <Filter size={11} strokeWidth={3} />
               <span className="text-[8px] font-black uppercase tracking-[0.25em] leading-none">Instruments</span>
            </div>
            <div className="flex gap-1 pr-1">
               {[
                 { label: 'Y', key: 'year', icon: 'YEAR', options: YEAR_OPTIONS.map(y => ({ v: String(y), l: String(y) })) },
                 { label: 'M', key: 'month', icon: 'MNTH', options: [{ v: '', l: 'ALL_TIME' }, ...MONTH_NAMES.map((m, i) => ({ v: String(i+1).padStart(2,'0'), l: m.toUpperCase().slice(0,3) }))] },
                 { label: 'N', key: 'ncal', icon: 'NCAL', options: [{ v: '', l: 'ALL_NCAL' }, ...NCAL_OPTIONS.filter(Boolean).map(n => ({ v: n, l: n }))] }
               ].map(f => (
                 <div key={f.key} className="flex flex-col px-3 py-1 rounded-xl bg-background/40 hover:bg-background border border-foreground/[0.04] transition-all group cursor-pointer relative min-w-[80px]">
                    <span className="text-[7px] font-black text-foreground/20 uppercase tracking-[0.2em] leading-none mb-1 group-hover:text-primary/40 transition-colors">{f.icon}</span>
                    <div className="flex items-center justify-between gap-2">
                       <select 
                         className="bg-transparent border-none p-0 text-[10px] font-black text-foreground/80 focus:ring-0 cursor-pointer uppercase tracking-widest w-full appearance-none"
                         value={filters[f.key]}
                         onChange={e => setF(f.key, e.target.value)}
                       >
                         {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                       </select>
                       <ChevronDown size={10} className="text-foreground/20 shrink-0" />
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Telemetry Node Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-1">
           {[
             { label: 'Analysed Volume', val: total, icon: Activity, color: 'text-primary' },
             { label: 'Dominant Failure', val: dominant, icon: ShieldAlert, color: 'text-error' },
             { label: 'Temporal Trend', val: 'STABLE', icon: TrendingUp, color: 'text-success' },
             { label: 'Logic Sync', val: '0xBD73', icon: Database, color: 'text-foreground/20' },
           ].map((stat, i) => (
             <div key={i} className="bg-foreground/[0.02] border border-foreground/[0.06] rounded-2xl p-4 flex flex-col gap-2 group hover:bg-foreground/[0.04] hover:shadow-lg hover:shadow-primary/[0.02] transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                   <stat.icon size={48} />
                </div>
                <div className="flex items-center justify-between relative z-10">
                   <span className="text-[9px] font-black uppercase tracking-[0.3em] text-foreground/30 font-mono leading-none">{stat.label}</span>
                   <stat.icon size={13} className={cn("opacity-40 group-hover:opacity-100 transition-opacity", stat.color)} />
                </div>
                <span className={cn(
                  "text-xl font-black tracking-tighter text-foreground/90 leading-none uppercase truncate relative z-10",
                  typeof stat.val === 'number' ? "font-mono tabular-nums" : "font-sans"
                )}>{stat.val}</span>
             </div>
           ))}
        </div>
      </div>

      {/* Synchronized Analytics Engine */}
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pr-1 -mr-1">
        {loading ? <div className="flex justify-center py-32"><Spinner size="lg" className="opacity-20" /></div> : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-12">
            
            {/* Visual Intelligence Pane (Left) */}
            <div className="flex flex-col gap-6 xl:col-span-4">
               {/* Spectral Donut Visualization */}
               <SectionCard title="Categorical Weight" subtitle="Spectral Distribution Analysis" padding={false} className="border-foreground/[0.08] shadow-sm overflow-hidden">
                  <div className="p-8 flex flex-col items-center bg-foreground/[0.01]">
                    <div className="relative w-full aspect-square max-w-[280px]">
                       <ChartContainer config={rootCauseConfig} className="h-full w-full">
                         <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                             <Pie 
                               data={data} 
                               dataKey="count" 
                               nameKey="classification" 
                               innerRadius="75%" 
                               outerRadius="95%" 
                               strokeWidth={0} 
                               animationDuration={1500}
                               paddingAngle={3}
                               cornerRadius={4}
                             >
                               {data.map((entry, i) => (
                                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer shadow-xl" />
                               ))}
                             </Pie>
                             <Tooltip content={<ChartTooltip config={rootCauseConfig} />} />
                           </PieChart>
                         </ResponsiveContainer>
                       </ChartContainer>
                       {/* Central Metadata */}
                       <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/20 mb-1">Total_Vol</span>
                          <span className="text-5xl font-black tracking-tighter font-mono text-foreground/90">{total}</span>
                          <div className="mt-2 px-3 py-1 rounded-full bg-foreground/[0.03] border border-foreground/[0.05]">
                             <span className="text-[8px] font-black text-foreground/40 uppercase tracking-widest">{Math.min(total, 100)}% RELIABLE</span>
                          </div>
                       </div>
                    </div>
                  </div>
               </SectionCard>

               {/* High-Contrast Ranking */}
               <SectionCard title="Dominant Hub" subtitle="Classification Vector Analysis" padding={false} className="border-foreground/[0.08] shadow-sm">
                  <div className="p-5 flex flex-col gap-5 bg-foreground/[0.01]">
                    {data.slice(0, 5).map((item, i) => {
                      const color = PIE_COLORS[i % PIE_COLORS.length];
                      const pct = total ? (item.count / total) * 100 : 0;
                      return (
                        <div key={item.classification} className="flex flex-col gap-2 group cursor-default">
                           <div className="flex justify-between items-end">
                              <div className="flex items-center gap-2.5 min-w-0">
                                 <div className="w-1 h-3 rounded-full shrink-0 group-hover:scale-y-125 transition-transform" style={{ backgroundColor: color }} />
                                 <span className="text-[10px] font-black tracking-tight text-foreground/60 uppercase truncate group-hover:text-foreground transition-colors">{item.classification}</span>
                              </div>
                              <div className="flex items-baseline gap-2 shrink-0">
                                 <span className="text-[10px] font-black text-foreground/80 font-mono tabular-nums leading-none">{item.count}</span>
                                 <span className="text-[8px] font-bold text-foreground/20 uppercase tracking-widest">({pct.toFixed(0)}%)</span>
                              </div>
                           </div>
                           <div className="w-full h-1 bg-foreground/[0.03] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-1500 ease-out shadow-[0_0_8px_rgba(var(--color-primary),0.2)]" style={{ width: `${pct}%`, backgroundColor: color }} />
                           </div>
                        </div>
                      );
                    })}
                  </div>
               </SectionCard>
            </div>

            {/* Spectral Audit Registry (Right) */}
            <SectionCard 
              title="Audit Registry" 
              subtitle="Comprehensive Classification Inventory" 
              padding={false}
              className="xl:col-span-8 flex flex-col border-foreground/[0.08] shadow-sm h-fit overflow-hidden"
              headerAction={
                <div className="flex items-center gap-2 bg-foreground/[0.03] px-3 py-1.5 rounded-xl border border-foreground/[0.06]">
                  <BarChart3 size={12} className="text-primary/60" />
                  <span className="text-[9px] font-black text-foreground/40 font-mono uppercase tracking-[0.15em]">SCAN_PROTOCOL_v4</span>
                </div>
              }
            >
              <div className="overflow-x-auto overflow-y-auto max-h-[800px] custom-scrollbar">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-foreground/[0.02] border-b border-foreground/[0.05]">
                      <th className="w-[60px] text-center p-4 sticky top-0 bg-background/95 backdrop-blur-md z-10"><span className="text-[9px] font-black text-foreground/20 uppercase font-mono">ID</span></th>
                      <th className="p-4 sticky top-0 bg-background/95 backdrop-blur-md z-10"><span className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em]">Sector Definition</span></th>
                      <th className="w-[100px] text-center p-4 sticky top-0 bg-background/95 backdrop-blur-md z-10"><span className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em]">Volume</span></th>
                      <th className="w-[180px] text-right p-4 sticky top-0 bg-background/95 backdrop-blur-md z-10 pr-8"><span className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em]">Spectral Share</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/[0.03]">
                    {data.map((row, i) => {
                      const pct = total ? (row.count / total) * 100 : 0;
                      const color = PIE_COLORS[i % PIE_COLORS.length];
                      return (
                        <tr key={row.classification} className="group hover:bg-foreground/[0.01] transition-all relative">
                          <td className="p-4 text-center text-[10px] font-black font-mono text-foreground/20 group-hover:text-foreground/40 transition-colors tabular-nums">
                            { (i + 1).toString().padStart(2, '0') }
                          </td>
                          <td className="p-4">
                             <div className="flex items-center gap-3">
                                <div className="w-[2px] h-4 rounded-full transition-transform group-hover:scale-y-110" style={{ backgroundColor: color }} />
                                <span className="text-[11px] font-black text-foreground/70 tracking-tight leading-none uppercase truncate group-hover:text-foreground transition-colors">
                                  {row.classification}
                                </span>
                             </div>
                          </td>
                          <td className="p-4 text-center">
                             <span className="text-[11px] font-black text-primary font-mono tabular-nums leading-none tracking-tight">{row.count}</span>
                          </td>
                          <td className="p-4 pr-8">
                             <div className="flex items-center justify-end gap-4">
                                <span className="text-[10px] font-black text-foreground/30 font-mono tabular-nums w-12 text-right">{pct.toFixed(1)}%</span>
                                <div className="w-20 bg-foreground/[0.04] rounded-full h-1 overflow-hidden shrink-0 group-hover:bg-foreground/[0.06] transition-colors">
                                  <div className="h-full rounded-full transition-all duration-1500" style={{ width: `${pct}%`, backgroundColor: color }} />
                                </div>
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                    {data.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-32 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-[0.05]">
                             <Zap size={48} strokeWidth={1} />
                             <span className="text-[11px] font-black uppercase tracking-[0.5em]">System_Null_Report</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>

          </div>
        )}
      </div>

      <style>{`
        .leaflet-container { background: transparent !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; height: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(var(--color-primary), 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(var(--color-primary), 0.3); }
      `}</style>
    </div>
  );
}
