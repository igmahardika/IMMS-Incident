import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, formatDuration, NCAL_ORDER, MONTH_NAMES } from '../utils/api.js';
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
      <div className="flex items-start justify-between gap-4 flex-wrap shrink-0 mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-black tracking-tight text-foreground uppercase">Dashboard</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 leading-relaxed">System Health & Incident Monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" icon={<Plus size={14} strokeWidth={2} />} onClick={() => navigate('/incidents/create')}>
            Create Incident
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pr-2 -mr-2">
        <div className="flex flex-col gap-6 pb-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            <div className="bg-background border border-foreground/5 shadow-sm rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 text-error/[0.03] group-hover:text-error/10 transition-colors duration-300">
                <AlertTriangle strokeWidth={1} size={100} />
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-lg bg-error/10 text-error flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Active Cases</span>
                  <span className="text-[9px] font-bold tracking-widest text-foreground/40 mt-0.5 uppercase">Queue Size</span>
                </div>
              </div>
              <div className="text-4xl font-black text-error tracking-tighter mt-4 relative z-10 tabular-nums">
                {data?.totalActive || 0}
              </div>
            </div>

            <div className="bg-background border border-foreground/5 shadow-sm rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 text-success/[0.03] group-hover:text-success/10 transition-colors duration-300">
                <CheckCircle strokeWidth={1} size={100} />
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
                  <CheckCircle size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Resolutions</span>
                  <span className="text-[9px] font-bold tracking-widest text-foreground/40 mt-0.5 uppercase">History</span>
                </div>
              </div>
              <div className="text-4xl font-black text-success tracking-tighter mt-4 relative z-10 tabular-nums">
                {data?.totalDone || 0}
              </div>
            </div>
            
            <div className="bg-background border border-foreground/5 shadow-sm rounded-xl flex items-stretch divide-x divide-foreground/5 overflow-hidden">
              {NCAL_ORDER.slice(0, 3).map((ncal) => (
                <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2 hover:bg-foreground/[0.01] transition-colors" key={ncal}>
                  <NcalBadge value={ncal} />
                  <div className={cn("text-2xl font-black tabular-nums font-mono tracking-tighter", NCAL_COLORS_KPI[ncal])}>
                    {byNcal[ncal] || 0}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-background border border-foreground/5 shadow-sm rounded-xl flex items-stretch divide-x divide-foreground/5 overflow-hidden">
              {NCAL_ORDER.slice(3).map((ncal) => (
                <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2 hover:bg-foreground/[0.01] transition-colors" key={ncal}>
                  <NcalBadge value={ncal} />
                  <div className={cn("text-2xl font-black tabular-nums font-mono tracking-tighter", NCAL_COLORS_KPI[ncal])}>
                    {byNcal[ncal] || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Duration Trend Chart */}
            <SectionCard title="Resolution Duration Trend (Minutes)" subtitle={`Year ${CURRENT_YEAR}`} padding={false} className="xl:col-span-2">
              <div className="p-4 md:p-6 h-[380px] w-full min-h-0">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={duration} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="fill-foreground/5 stroke-foreground/10" />
                      <XAxis dataKey="month" tick={{ fill: "var(--color-foreground)", opacity: 0.5, fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} tickMargin={15} />
                      <YAxis tick={{ fill: "var(--color-foreground)", opacity: 0.5, fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} tickMargin={10} width={45} />
                      <Tooltip content={<ChartTooltip config={chartConfig} valueFormatter={(val) => formatDuration(Math.round(val * 60))} />} />
                      <Legend content={<ChartLegend config={chartConfig} />} verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
                      {NCAL_ORDER.map(ncal => (
                        <Line key={ncal} type="monotone" dataKey={ncal} stroke={chartConfig[ncal].color} strokeWidth={2.5} dot={{ r: 4, fill: chartConfig[ncal].color, strokeWidth: 0 }} activeDot={{ r: 6, stroke: "var(--color-background)", strokeWidth: 2 }} connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </SectionCard>

            {/* Recent Closed */}
            <SectionCard title="Recently Resolved" subtitle="Last 5 closed incidents" padding={false} className="xl:col-span-1">
              <div className="overflow-x-auto w-full custom-scrollbar">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-foreground/[0.02] border-y border-foreground/5">
                      <th className="w-[80px] text-center">NCAL</th>
                      <th className="min-w-[200px]">INCIDENT</th>
                      <th className="w-[120px] text-right">DETAILS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/5">
                    {(data?.recentClosed || []).length === 0 && (
                      <tr><td colSpan={3} className="text-center text-[11px] font-medium text-foreground/30 py-10 px-4">No recently closed incidents</td></tr>
                    )}
                    {(data?.recentClosed || []).map(inc => (
                      <tr key={inc.id} className="hover:bg-foreground/[0.02] transition-colors duration-200 group cursor-pointer" onClick={() => navigate(`/incidents/${inc.id}`)}>
                        <td className="text-center align-top"><div className="mt-1"><NcalBadge value={inc.ncal} /></div></td>
                        <td className="align-top">
                          <div className="font-mono text-[11px] font-bold text-primary tracking-tight mb-1">{inc.case_no}</div>
                          <div className="text-[11px] font-semibold text-foreground/70 leading-snug line-clamp-2">{inc.site_name_manual || '—'}</div>
                        </td>
                        <td className="text-right align-top">
                          <div className="font-mono text-[11px] font-bold tabular-nums text-foreground/80 mb-1">{formatDuration(inc.duration_nett_seconds)}</div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-foreground/50 truncate max-w-[120px] ml-auto">{inc.technician_name || '—'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data?.recentClosed?.length > 0 && (
                <div className="px-4 py-3 bg-muted/10 border-t border-foreground/5 text-center">
                  <button onClick={() => navigate('/history')} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/70 transition-colors">View Full History</button>
                </div>
              )}
            </SectionCard>
          </div>
          
          {/* SLA Table */}
          <SectionCard title="SLA Summary This Year" subtitle="Based on NCAL segments" padding={false}>
            <div className="overflow-x-auto w-full custom-scrollbar">
              <table className="w-full text-left border-separate border-spacing-0 table-fixed">
                <thead>
                  <tr className="bg-foreground/[0.02]">
                    <th className="text-center w-[80px]">NCAL</th>
                    <th className="text-center w-[80px]">CASES</th>
                    <th className="min-w-[200px]">AVG DURATION</th>
                    <th className="text-center w-[100px]">SLA MET</th>
                    <th className="text-center w-[150px]">SUCCESS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {sla.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-[11px] font-medium text-foreground/30 py-10 px-4">No data available</td></tr>
                  )}
                  {sla.map(row => {
                    const pct = row.total_cases ? Math.round((row.sla_met / row.total_cases) * 100) : 0;
                    return (
                      <tr key={row.ncal} className="hover:bg-foreground/[0.01] transition-colors">
                        <td className="text-center"><NcalBadge value={row.ncal} /></td>
                        <td className="text-center font-black text-[11px] tabular-nums text-foreground/70">{row.total_cases}</td>
                        <td className="font-mono font-black text-[11px] text-foreground/60 tracking-tight">{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                        <td className="text-center text-[11px] font-black text-primary tabular-nums">{row.sla_met || 0}</td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className={cn(
                              "font-black text-[11px] tabular-nums tracking-widest w-10 text-right",
                              pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-error'
                            )}>
                              {pct}%
                            </span>
                            <div className="w-16 h-1 rounded-full bg-foreground/10 overflow-hidden shrink-0">
                               <div className={cn("h-full rounded-full", pct >= 80 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-error')} style={{ width: `${pct}%` }} />
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
