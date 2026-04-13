import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../utils/api.js';
import { formatDuration } from '../utils/incidentUtils.js';
import { NCAL_ORDER, MONTH_NAMES } from '../utils/constants.js';
import { 
  NcalBadge, 
  SectionCard, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ResponsiveContainer, 
  Spinner 
} from '../components/ui/index.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Calendar, Activity, Zap, Clock, ShieldCheck, UserCheck, ChevronDown, BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils.js';

/**
 * Temporal Intelligence - Stabilized Spectral Analytics
 * Resolving render issues with explicit height management and robust SVG definitions.
 */

const chartConfig = {
  BLACK: { label: 'Black Sector', color: '#18181b' },
  RED: { label: 'Red Sector', color: '#ef4444' },
  ORANGE: { label: 'Orange Sector', color: '#f97316' },
  YELLOW: { label: 'Yellow Sector', color: '#eab308' },
  BLUE: { label: 'Blue Sector', color: '#3b82f6' },
};

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => currentYear - i);

export default function DurationReportPage() {
  const [year, setYear] = useState(String(currentYear));
  const [duration, setDuration] = useState([]);
  const [sla, setSla] = useState([]);
  const [techPerf, setTechPerf] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getDuration({ year }), api.getSla({ year }), api.getTechPerf({ year })])
      .then(([dur, s, tp]) => {
        const months = {};
        dur.forEach(r => {
          const mo = parseInt(r.month, 10);
          if (!months[mo]) months[mo] = { month: MONTH_NAMES[mo - 1], total: 0 };
          months[mo][r.ncal] = Math.max(0, Math.round((r.avg_nett_seconds || 0) / 60));
          months[mo].total = (months[mo].total || 0) + r.total_cases;
        });
        
        // Ensure all NCAL keys exist even with 0 value to prevent Recharts key-missing crashes
        const processed = Object.values(months).map(m => {
          const entry = { ...m };
          NCAL_ORDER.forEach(n => { if (entry[n] === undefined) entry[n] = 0; });
          return entry;
        });
        
        setDuration(processed);
        setSla(s);
        setTechPerf(tp);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const stats = useMemo(() => {
    const totalCases = sla.reduce((s, r) => s + (r.total_cases || 0), 0);
    const avgMttR = sla.length ? sla.reduce((s, r) => s + (r.avg_nett_seconds || 0), 0) / sla.length : 0;
    const slaSuccess = totalCases ? (sla.reduce((s, r) => s + (r.sla_met || 0), 0) / totalCases) * 100 : 0;
    const maxDur = techPerf.length ? Math.max(...techPerf.map(r => r.max_nett)) : 0;
    return { totalCases, avgMttR, slaSuccess, maxDur };
  }, [sla, techPerf]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden font-sans bg-background animate-in fade-in duration-700">
      {/* Precision Header */}
      <div className="flex flex-col gap-6 shrink-0 mb-6 px-1">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1.5">
             <h1 className="text-xl font-black tracking-tight text-foreground uppercase leading-none">Temporal Intelligence</h1>
             <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 shadow-sm">
                   <span className="text-[9px] font-black text-primary uppercase tracking-widest">{year} BGT FISCAL</span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/40 leading-none">
                  Efficiency audit for <span className="text-foreground/80 font-mono italic">{stats.totalCases}</span> registered incidents
                </p>
             </div>
          </div>

          <div className="flex items-center gap-2 p-1 bg-foreground/[0.015] border border-foreground/[0.06] rounded-xl shadow-sm backdrop-blur-md">
             <div className="flex items-center gap-2 px-4 border-r border-foreground/[0.04] text-foreground/30">
                <Calendar size={11} strokeWidth={3} />
                <span className="text-[8px] font-black uppercase tracking-[0.25em] leading-none">Instruments</span>
             </div>
             <div className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-foreground/[0.03] transition-all group cursor-pointer relative overflow-hidden">
                <select 
                  className="bg-transparent border-none p-0 text-[10px] font-black text-foreground/80 focus:ring-0 cursor-pointer uppercase tracking-widest w-24 appearance-none outline-none z-10"
                  value={year} 
                  onChange={e => setYear(e.target.value)}
                >
                  {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y} FISCAL</option>)}
                </select>
                <ChevronDown size={10} className="text-foreground/20 group-hover:text-primary transition-colors" />
             </div>
          </div>
        </div>

        {/* Telemetry Nodes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
           {[
             { label: 'Incident Volume', val: stats.totalCases, icon: Activity, color: 'text-primary' },
             { label: 'Enterprise MTTR', val: formatDuration(Math.round(stats.avgMttR)), icon: Clock, color: 'text-warning' },
             { label: 'SLA Success Threshold', val: `${stats.slaSuccess.toFixed(1)}%`, icon: ShieldCheck, color: 'text-success' },
             { label: 'Max Handle Tail', val: formatDuration(stats.maxDur), icon: TrendingUp, color: 'text-error' },
           ].map((stat, i) => (
             <div key={i} className="bg-foreground/[0.015] border border-foreground/[0.04] rounded-2xl p-4 flex flex-col gap-2 group hover:bg-foreground/[0.03] transition-all relative border-l-4" style={{ borderLeftColor: i === 0 ? 'var(--color-primary)' : 'transparent' }}>
                <div className="flex items-center justify-between">
                   <span className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground/20 font-mono leading-none">{stat.label}</span>
                   <stat.icon size={11} className={cn("opacity-40 group-hover:opacity-100 transition-opacity", stat.color)} />
                </div>
                <span className={cn(
                  "text-lg font-black tracking-tighter text-foreground/70 leading-none uppercase tabular-nums truncate",
                  stat.label.includes('MTTR') && "font-mono"
                )}>{stat.val}</span>
             </div>
           ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pr-1 -mr-1">
        {loading ? <div className="flex justify-center py-32"><Spinner size="lg" className="opacity-20" /></div> : (
          <div className="flex flex-col gap-6 pb-12">
            
            {/* Interactive Area Redesign - STABILIZED */}
            <SectionCard 
              title="Stacked Spectral Momentum" 
              subtitle="Analytical breakdown of temporal handling volume by NCAL sector" 
              padding={false}
              className="border-foreground/[0.08] shadow-lg bg-background overflow-hidden"
              headerAction={
                <div className="flex items-center gap-2 px-3 py-1 transparent border border-foreground/[0.04] rounded-full">
                   <TrendingUp size={10} className="text-success" />
                   <span className="text-[9px] font-black text-foreground/40 font-mono tracking-widest uppercase truncate max-w-[120px]">Analysis_Sync_0x8C</span>
                </div>
              }
            >
              <div className="px-1 pt-6 sm:px-4 sm:pt-8 bg-foreground/[0.005]">
                <ChartContainer 
                  config={chartConfig} 
                  className="aspect-auto h-[380px] w-full"
                  style={{ height: '380px', minHeight: '380px' }}
                >
                  <ResponsiveContainer width="100%" height={380}>
                    <AreaChart data={duration} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                      <defs>
                        {NCAL_ORDER.map(ncal => (
                          <linearGradient key={`fill${ncal}`} id={`fill${ncal}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartConfig[ncal].color} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={chartConfig[ncal].color} stopOpacity={0.1}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--color-foreground)" opacity={0.03} />
                      <XAxis 
                        dataKey="month" 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        minTickGap={32}
                        tick={{ fill: 'var(--color-foreground)', opacity: 0.3, fontWeight: 900, fontSize: 10 }} 
                        tickFormatter={(value) => value ? value.slice(0, 3) : ''}
                      />
                      <YAxis 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        tick={{ fill: 'var(--color-foreground)', opacity: 0.3, fontWeight: 900, fontSize: 10 }} 
                        unit="m" 
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      {NCAL_ORDER.map(ncal => (
                        <Area 
                          key={ncal} 
                          dataKey={ncal}
                          type="natural" 
                          fill={`url(#fill${ncal})`}
                          stroke={chartConfig[ncal].color}
                          strokeWidth={1.5}
                          stackId="a"
                          animationDuration={1500}
                        />
                      ))}
                      <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </SectionCard>

            {/* Audit Grid: SLA & Personnel */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 px-1">
              
              {/* Compliance Registry */}
              <SectionCard title="SLA Compliance Registry" subtitle="Operational service level monitoring protocol" padding={false} className="border-foreground/[0.08] shadow-sm flex flex-col h-fit overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed min-w-[500px]">
                    <thead>
                      <tr className="bg-foreground/[0.015] border-b border-foreground/[0.05]">
                        <th className="p-4 w-[160px]"><span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest">Sector Definition</span></th>
                        <th className="p-4 text-center w-[80px]"><span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest">Cases</span></th>
                        <th className="p-4 text-center w-[120px] text-primary"><span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest">MTTR Avg</span></th>
                        <th className="p-4 text-right pr-6"><span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest font-mono">Success_Ratio</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/[0.03]">
                      {sla.map(row => {
                        const pct = row.total_cases ? Math.round((row.sla_met / row.total_cases) * 100) : 0;
                        return (
                          <tr key={row.ncal} className="hover:bg-foreground/[0.01] group transition-all">
                            <td className="p-4">
                               <div className="flex items-center gap-3">
                                  <div className="w-1.5 h-3 rounded-sm transform group-hover:scale-y-125 transition-transform" style={{ backgroundColor: chartConfig[row.ncal]?.color }} />
                                  <span className="text-[11px] font-black text-foreground/60 tracking-tighter leading-none uppercase group-hover:text-foreground transition-colors">{row.ncal}</span>
                               </div>
                            </td>
                            <td className="p-4 text-center font-black text-[11px] text-foreground/30 tabular-nums">{row.total_cases}</td>
                            <td className="p-4 text-center font-mono font-black text-[11px] text-primary tabular-nums">{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                            <td className="p-4 pr-6">
                               <div className="flex items-center justify-end gap-3">
                                  <div className="flex flex-col items-end">
                                     <span className={cn(
                                       "text-[10px] font-black font-mono leading-none tabular-nums",
                                       pct >= 85 ? "text-success" : pct >= 70 ? "text-warning" : "text-error"
                                     )}>{pct}%</span>
                                     <span className="text-[7px] font-black text-foreground/20 uppercase mt-0.5 tracking-widest italic">{row.sla_target_hours}h SLA</span>
                                  </div>
                                  <div className="w-16 h-1 bg-foreground/[0.04] rounded-full overflow-hidden">
                                     <div 
                                      className={cn(
                                        "h-full rounded-full transition-all duration-1000",
                                        pct >= 85 ? "bg-success shadow-[0_0_8px_rgba(var(--color-success),0.3)]" : pct >= 70 ? "bg-warning" : "bg-error"
                                      )} 
                                      style={{ width: `${pct}%` }} 
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

              {/* Agent Benchmark Hub */}
              <SectionCard title="Agent Benchmark Hub" subtitle="Analyst handling intelligence and capacity audit" padding={false} className="border-foreground/[0.08] shadow-sm flex flex-col h-fit overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed min-w-[500px]">
                    <thead>
                      <tr className="bg-foreground/[0.015] border-b border-foreground/[0.05]">
                        <th className="p-4"><span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest">Analyst Segment</span></th>
                        <th className="p-4 text-center w-[100px]"><span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest">Load</span></th>
                        <th className="p-4 text-center w-[110px] text-primary"><span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest">Mean</span></th>
                        <th className="p-4 text-right pr-6 w-[120px]"><span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest font-mono">Tail_Max</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/[0.03]">
                      {techPerf.slice(0, 10).map(row => (
                        <tr key={row.technician} className="hover:bg-foreground/[0.01] group transition-all">
                          <td className="p-4">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06] flex items-center justify-center text-foreground/20 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
                                   <UserCheck size={11} className="group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                   <span className="text-[11px] font-black text-foreground/70 tracking-tight uppercase leading-none truncate group-hover:text-foreground transition-colors">{row.technician}</span>
                                   <span className="text-[8px] font-black text-foreground/20 uppercase tracking-widest italic leading-none opacity-40">Personnel_Ops</span>
                                </div>
                             </div>
                          </td>
                          <td className="p-4 text-center font-black text-[11px] text-foreground/30 tabular-nums">{row.total_handled}n</td>
                          <td className="p-4 text-center font-mono font-black text-[11px] text-primary tabular-nums">{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                          <td className="p-4 text-right pr-6 font-mono font-black text-[11px] text-foreground/30 tabular-nums">{formatDuration(row.max_nett)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

            </div>

             {/* Registry Empty State */}
             {duration.length === 0 && (
              <div className="py-32 mx-1 flex flex-col items-center justify-center gap-4 border border-foreground/[0.04] rounded-3xl bg-foreground/[0.015] shadow-inner font-mono">
                 <Zap size={32} className="text-foreground/5 animate-pulse" strokeWidth={1} />
                 <span className="text-[9px] font-black text-foreground/10 uppercase tracking-[0.5em]">System_Data_Null_Response</span>
              </div>
            )}

          </div>
        )}
      </div>

       <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; height: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(var(--color-primary), 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(var(--color-primary), 0.3); }
      `}</style>
    </div>
  );
}
