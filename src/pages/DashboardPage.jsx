import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api.js';
import { formatDuration } from '../utils/incidentUtils.js';
import { NCAL_ORDER, MONTH_NAMES } from '../utils/constants.js';
import { NcalBadge, SectionCard, CardSkeleton, ChartContainer, ChartTooltip, ChartLegend, ResponsiveContainer, Button, PageSpinner } from '../components/ui/index.jsx';
import { AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { cn } from '../lib/utils.js';

const chartConfig = {
  BLACK: { label: 'BLACK', color: 'var(--color-primary)' },
  RED: { label: 'RED', color: 'var(--color-error)' },
  ORANGE: { label: 'ORANGE', color: 'var(--color-warning)' },
  YELLOW: { label: 'YELLOW', color: 'var(--color-info)' },
  BLUE: { label: 'BLUE', color: 'var(--color-success)' },
};

const CURRENT_YEAR = new Date().getFullYear();

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: qData, isLoading: loading } = useQuery({
    queryKey: ['incidents', 'dashboard', CURRENT_YEAR],
    queryFn: async () => {
      const [d, s, dur] = await Promise.all([
        api.getDashboard(),
        api.getSla({ year: CURRENT_YEAR }),
        api.getDuration({ year: CURRENT_YEAR }),
      ]);
      const months = {};
      dur.forEach(r => {
        const mo = parseInt(r.month, 10);
        if (!months[mo]) months[mo] = { month: MONTH_NAMES[mo - 1] };
        months[mo][r.ncal] = Math.round((r.avg_nett_seconds || 0) / 60);
      });
      return { 
        data: d, 
        sla: s, 
        duration: Object.values(months).sort((a, b) => MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month)) 
      };
    }
  });

  const data = qData?.data || null;
  const sla = qData?.sla || [];
  const duration = qData?.duration || [];

  if (loading) return <PageSpinner />;

  const byNcal = {};
  (data?.activeByNcal || []).forEach(r => { byNcal[r.ncal] = r.count; });

  const NCAL_COLORS_KPI = { BLACK: 'text-foreground/70', RED: 'text-error', ORANGE: 'text-warning', YELLOW: 'text-info', BLUE: 'text-success' };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap shrink-0 mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-black tracking-tight text-foreground uppercase">Network Operations</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 leading-relaxed italic">
            Live infrastructure health & session monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" icon={<Plus size={14} strokeWidth={2.5} />} onClick={() => navigate('/incidents/create')}>
            Initialize Ticket
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pr-2 -mr-2">
        <div className="flex flex-col gap-6 pb-8">
          
          {/* Unified KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 shrink-0">
            {/* Core Metrics */}
            <div className="col-span-1 lg:col-span-1 bg-background border border-foreground/[0.08] shadow-sm rounded-xl p-3 flex flex-col justify-between hover:border-error/30 transition-colors group relative overflow-hidden">
               <div className="absolute -right-2 -top-2 text-error/5 group-hover:text-error/10 transition-colors">
                  <AlertTriangle size={60} strokeWidth={1} />
               </div>
               <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40 relative z-10">Queue</span>
               <span className="text-2xl font-black text-error font-mono tabular-nums leading-none mt-2 relative z-10">{data?.totalActive || 0}</span>
            </div>

            <div className="col-span-1 lg:col-span-1 bg-background border border-foreground/[0.08] shadow-sm rounded-xl p-3 flex flex-col justify-between hover:border-success/30 transition-colors group relative overflow-hidden">
               <div className="absolute -right-2 -top-2 text-success/5 group-hover:text-success/10 transition-colors">
                  <CheckCircle size={60} strokeWidth={1} />
               </div>
               <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40 relative z-10">Resolved</span>
               <span className="text-2xl font-black text-success font-mono tabular-nums leading-none mt-2 relative z-10">{data?.totalDone || 0}</span>
            </div>

            {/* NCAL segments directly in the grid */}
            {NCAL_ORDER.map(ncal => (
               <div className="col-span-1 lg:col-span-1 bg-background border border-foreground/[0.08] shadow-sm rounded-xl p-3 flex flex-col justify-between hover:bg-foreground/[0.02] transition-colors" key={ncal}>
                  <div className="flex items-center justify-between">
                     <span className="text-[9px] font-black uppercase tracking-widest text-foreground/30">{ncal}</span>
                     <div className={cn("w-1 h-1 rounded-full", {
                        'bg-foreground/50': ncal === 'BLACK',
                        'bg-error': ncal === 'RED',
                        'bg-warning': ncal === 'ORANGE',
                        'bg-yellow-500': ncal === 'YELLOW',
                        'bg-blue-500': ncal === 'BLUE',
                     })} />
                  </div>
                  <span className={cn("text-2xl font-black tabular-nums font-mono leading-none mt-2", NCAL_COLORS_KPI[ncal])}>
                    {byNcal[ncal] || 0}
                  </span>
               </div>
            ))}
          </div>

          {/* Main Visual Content */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
            {/* Duration Trend Chart */}
            <SectionCard title="Performance Momentum" subtitle={`Avg Resolution Duration (min) — ${CURRENT_YEAR}`} padding={false} className="xl:col-span-3">
              <div className="p-4 md:p-6 h-[420px] w-full min-h-0">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={duration} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-foreground)" opacity={0.03} />
                      <XAxis dataKey="month" tick={{ fill: "var(--color-foreground)", opacity: 0.4, fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} tickMargin={15} />
                      <YAxis tick={{ fill: "var(--color-foreground)", opacity: 0.4, fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} tickMargin={10} width={45} />
                      <Tooltip content={<ChartTooltip config={chartConfig} valueFormatter={(val) => formatDuration(Math.round(val * 60))} />} />
                      <Legend content={<ChartLegend config={chartConfig} />} verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
                      {NCAL_ORDER.map(ncal => (
                        <Line key={ncal} type="monotone" dataKey={ncal} stroke={chartConfig[ncal].color} strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 5, stroke: "var(--color-background)", strokeWidth: 2 }} connectNulls animationDuration={1000} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </SectionCard>

            {/* Recent Closed Table */}
            <SectionCard title="Recent Accomplishments" subtitle="Last 5 resolved tickets" padding={false} className="xl:col-span-1 self-stretch flex flex-col">
              <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-foreground/[0.03] border-b border-foreground/5 sticky top-0 z-10">
                      <th className="w-[70px] px-3 py-2 text-center text-[9px] font-black uppercase tracking-widest opacity-40">Lv</th>
                      <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest opacity-40">Identity</th>
                      <th className="w-[100px] px-3 py-2 text-right text-[9px] font-black uppercase tracking-widest opacity-40">Dur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/5">
                    {(data?.recentClosed || []).length === 0 && (
                      <tr><td colSpan={3} className="text-center text-[10px] font-bold text-foreground/20 py-20 px-4 uppercase tracking-[0.2em]">Silent Air</td></tr>
                    )}
                    {(data?.recentClosed || []).map(inc => (
                      <tr key={inc.id} className="hover:bg-foreground/[0.03] transition-colors duration-150 group cursor-pointer" onClick={() => navigate(`/incidents/${inc.id}`)}>
                        <td className="px-3 py-3 text-center align-top"><NcalBadge value={inc.ncal} /></td>
                        <td className="px-3 py-3 align-top">
                          <div className="font-mono text-[11px] font-black text-primary mb-1 tracking-tighter">{inc.case_no}</div>
                          <div className="text-[10px] font-bold text-foreground/70 leading-tight line-clamp-2 uppercase tracking-tight">{inc.site_name_manual || '—'}</div>
                        </td>
                        <td className="px-3 py-3 text-right align-top">
                          <div className="font-mono text-[11px] font-black tabular-nums text-foreground/80 mb-1">{formatDuration(inc.duration_nett_seconds)}</div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-foreground/30 truncate">{inc.technician_name?.split(' ')[0] || 'NOC'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-foreground/5 bg-foreground/[0.02]">
                 <button onClick={() => navigate('/history')} className="w-full py-2 bg-foreground/5 hover:bg-foreground/10 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40 transition-all active:scale-[0.98]">
                    Audit All History
                 </button>
              </div>
            </SectionCard>
          </div>
          
          {/* SLA Performance Summary */}
          <SectionCard title="SLA Compliance Matrix" subtitle="Aggregate performance since start of year" padding={false}>
            <div className="overflow-x-auto w-full custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-foreground/[0.03] border-b border-foreground/5">
                    <th className="w-[140px] px-4 py-3 text-[10px] uppercase font-black tracking-widest opacity-40">Segment</th>
                    <th className="w-[100px] px-4 py-3 text-center text-[10px] uppercase font-black tracking-widest opacity-40">Throughput</th>
                    <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest opacity-40">Latency Profile</th>
                    <th className="w-[120px] px-4 py-3 text-center text-[10px] uppercase font-black tracking-widest opacity-40">SLA Met</th>
                    <th className="w-[180px] px-4 py-3 text-right text-[10px] uppercase font-black tracking-widest opacity-40">Compliance Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {sla.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-20 text-[10px] font-black text-foreground/20 uppercase tracking-[0.3em]">No Data Synced</td></tr>
                  )}
                  {sla.map(row => {
                    const pct = row.total_cases ? Math.round((row.sla_met / row.total_cases) * 100) : 0;
                    return (
                      <tr key={row.ncal} className="hover:bg-foreground/[0.01] transition-colors">
                        <td className="px-4 py-3.5"><NcalBadge value={row.ncal} /></td>
                        <td className="px-4 py-3.5 text-center text-[12px] font-black tabular-nums text-foreground/80">{row.total_cases} <span className="text-[9px] text-foreground/30 ml-1 uppercase">units</span></td>
                        <td className="px-4 py-3.5 font-mono text-[12px] font-black text-foreground/50 tabular-nums">
                          {formatDuration(Math.round(row.avg_nett_seconds || 0))} <span className="text-[10px] ml-1 opacity-50 uppercase tracking-tighter italic">average nett</span>
                        </td>
                        <td className="px-4 py-3.5 text-center text-[12px] font-black text-primary tabular-nums">{row.sla_met || 0}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-3">
                            <div className="flex flex-col items-end gap-0.5 min-w-[3rem]">
                               <span className={cn(
                                 "text-[13px] font-black tabular-nums font-mono leading-none",
                                 pct >= 85 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-error'
                               )}>
                                 {pct}%
                               </span>
                               <span className="text-[8px] font-black text-foreground/20 uppercase tracking-widest">SLA Goal</span>
                            </div>
                            <div className="w-24 h-1.5 rounded-full bg-foreground/5 overflow-hidden shrink-0 border border-foreground/[0.03]">
                               <div className={cn("h-full rounded-full transition-all duration-1000", pct >= 85 ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-error')} style={{ width: `${pct}%` }} />
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
      </div>
    </div>
  );
}
