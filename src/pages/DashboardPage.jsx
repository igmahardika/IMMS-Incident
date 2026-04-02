import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDuration, NCAL_ORDER, MONTH_NAMES } from '../utils/api.js';
import { NcalBadge, SectionCard, CardSkeleton, ChartContainer, ChartTooltip, ChartLegend, ResponsiveContainer } from '../components/ui/index.jsx';
import { AlertTriangle, CheckCircle, Activity, TrendingUp, Plus, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const chartConfig = {
  BLACK: { label: 'BLACK', color: 'var(--ncal-black-text)' },
  RED: { label: 'RED', color: 'var(--ncal-red-text)' },
  ORANGE: { label: 'ORANGE', color: 'var(--ncal-orange-text)' },
  YELLOW: { label: 'YELLOW', color: 'var(--ncal-yellow-text)' },
  BLUE: { label: 'BLUE', color: 'var(--ncal-blue-text)' },
};

const CURRENT_YEAR = new Date().getFullYear();

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [sla, setSla] = useState([]);
  const [duration, setDuration] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = useCallback(() => {
    Promise.all([
      api.getDashboard(),
      api.getSla({ year: CURRENT_YEAR }),
      api.getDuration({ year: CURRENT_YEAR }),
    ]).then(([d, s, dur]) => {
      setData(d);
      setSla(s);
      const months = {};
      dur.forEach(r => {
        const mo = parseInt(r.month, 10);
        if (!months[mo]) months[mo] = { month: MONTH_NAMES[mo - 1] };
        months[mo][r.ncal] = Math.round((r.avg_nett_seconds || 0) / 60);
      });
      setDuration(Object.values(months).sort((a, b) => MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month)));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 30000); // 30s
    return () => clearInterval(t);
  }, [loadData]);

  if (loading) return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardSkeleton /> <CardSkeleton /> <CardSkeleton /> <CardSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><CardSkeleton /></div>
        <div><CardSkeleton /></div>
      </div>
    </div>
  );

  const byNcal = {};
  (data?.activeByNcal || []).forEach(r => { byNcal[r.ncal] = r.count; });

  const NCAL_COLORS_KPI = { BLACK: 'var(--color-neutral-content)', RED: 'var(--color-error)', ORANGE: 'var(--color-warning)', YELLOW: 'var(--color-info)', BLUE: 'var(--color-primary)' };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-base-content uppercase">Dashboard</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-base-content/40 leading-relaxed">System Health & Incident Monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-primary" onClick={() => navigate('/incidents/create')}>
            <Plus size={16} strokeWidth={2} /> Create Incident
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stats shadow-sm bg-base-100 rounded-lg w-full">
          <div className="stat p-4">
            <div className="stat-figure text-error/20"><AlertTriangle size={24} /></div>
            <div className="stat-title uppercase tracking-[0.15em] text-[10px] font-bold text-base-content/40">Active Cases</div>
            <div className="stat-value text-error text-xl font-bold">{data?.totalActive || 0}</div>
            <div className="stat-desc text-[9px] font-bold uppercase tracking-[0.15em] text-base-content/20 mt-1">Incident Queue</div>
          </div>
        </div>

        <div className="stats shadow-sm bg-base-100 rounded-lg w-full">
          <div className="stat p-4">
            <div className="stat-figure text-success/20"><CheckCircle size={24} /></div>
            <div className="stat-title uppercase tracking-[0.15em] text-[10px] font-bold text-base-content/40">Resolutions</div>
            <div className="stat-value text-success text-xl font-bold">{data?.totalDone || 0}</div>
            <div className="stat-desc text-[9px] font-bold uppercase tracking-[0.15em] text-base-content/20 mt-1">Total History</div>
          </div>
        </div>
        
        <div className="stats shadow-sm bg-base-100 rounded-lg w-full">
          <div className="flex w-full divide-x divide-base-content/5">
            {NCAL_ORDER.slice(0, 3).map((ncal) => (
              <div className="stat px-3 py-4 flex-1" key={ncal}>
                <div className="stat-title mb-1"><NcalBadge value={ncal} /></div>
                <div className="stat-value text-lg font-bold tracking-tight" style={{ color: NCAL_COLORS_KPI[ncal] }}>{byNcal[ncal] || 0}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="stats shadow-sm bg-base-100 rounded-lg w-full">
          <div className="flex w-full divide-x divide-base-content/5">
            {NCAL_ORDER.slice(3).map((ncal) => (
              <div className="stat px-3 py-4 flex-1" key={ncal}>
                <div className="stat-title mb-1"><NcalBadge value={ncal} /></div>
                <div className="stat-value text-lg font-bold tracking-tight" style={{ color: NCAL_COLORS_KPI[ncal] }}>{byNcal[ncal] || 0}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Duration Trend Chart */}
        <SectionCard title="Resolution Duration Trend (Minutes)" subtitle={`Year ${CURRENT_YEAR}`}>
          <ChartContainer config={chartConfig} className="h-[300px] md:h-[350px] lg:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={duration} margin={{ top: 20, right: 20, left: 10, bottom: 40 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="opacity-5" />
                <XAxis dataKey="month" tick={{ className: "fill-base-content/40 font-bold", fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={12} />
                <YAxis tick={{ className: "fill-base-content/40 font-bold", fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={12} width={40} />
                <Tooltip content={<ChartTooltip config={chartConfig} valueFormatter={(val) => formatDuration(Math.round(val * 60))} />} />
                <Legend content={<ChartLegend config={chartConfig} />} verticalAlign="bottom" height={40} wrapperStyle={{ paddingTop: '20px' }} />
                {NCAL_ORDER.map(ncal => (
                  <Line key={ncal} type="monotone" dataKey={ncal} stroke={chartConfig[ncal].color} strokeWidth={2} dot={{ r: 3, fill: chartConfig[ncal].color, strokeWidth: 0 }} activeDot={{ r: 5, className: "stroke-base-100", strokeWidth: 2 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* SLA Table */}
          <SectionCard title="SLA Summary This Year" subtitle="Based on NCAL segments" className="p-0">
            <div className="overflow-x-auto w-full">
              <table className="table table-zebra table-sm">
                <thead>
                <tr className="bg-base-200/50">
                  <th className="w-1/12 text-center text-[10px] uppercase tracking-[0.15em] font-bold text-base-content/40 py-3">NCAL</th>
                  <th className="w-2/12 text-center text-[10px] uppercase tracking-[0.15em] font-bold text-base-content/40 py-3">CASES</th>
                  <th className="w-4/12 text-center text-[10px] uppercase tracking-[0.15em] font-bold text-base-content/40 py-3">AVG DURATION</th>
                  <th className="w-3/12 text-center text-[10px] uppercase tracking-[0.15em] font-bold text-base-content/40 py-3">SLA MET</th>
                  <th className="w-1/12 text-center text-[10px] uppercase tracking-[0.15em] font-bold text-base-content/40 py-3">%</th>
                </tr>
              </thead>
              <tbody>
                {sla.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-base-content/50 py-8 px-4">No data available</td></tr>
                )}
                {sla.map(row => {
                  const pct = row.total_cases ? Math.round((row.sla_met / row.total_cases) * 100) : 0;
                  return (
                    <tr key={row.ncal} className="hover:bg-base-200 transition-colors">
                      <td className="text-center"><NcalBadge value={row.ncal} /></td>
                      <td className="text-center font-bold text-[12px]">{row.total_cases}</td>
                      <td className="text-center font-mono text-[12px] opacity-70 tracking-tight">{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                      <td className="text-center text-[12px] font-medium text-primary/80">{row.sla_met || 0}</td>
                      <td className="text-center">
                        <span className={`font-bold text-[12px] tabular-nums ${pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-error'}`}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Recent Closed */}
        <SectionCard title="Recently Resolved" subtitle="Last 5 closed incidents" padding={0}>
          <div className="overflow-x-auto w-full">
            <table className="table-imms">
              <thead>
                <tr>
                  <th className="w-2/12 text-center">NCAL</th>
                  <th className="w-5/12 text-left">INCIDENT</th>
                  <th className="w-5/12 text-right">DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentClosed || []).length === 0 && (
                  <tr><td colSpan={3} className="text-center text-base-content/20 py-8 px-4 text-[12px]">No recently closed incidents</td></tr>
                )}
                {(data?.recentClosed || []).map(inc => (
                  <tr key={inc.id} className="hover:bg-base-200 cursor-pointer transition-colors" onClick={() => navigate(`/incidents/${inc.id}`)}>
                    <td className="text-center"><NcalBadge value={inc.ncal} /></td>
                    <td className="text-left">
                      <div className="font-mono text-[12px] font-bold text-primary mb-0.5 tracking-tighter">{inc.case_no}</div>
                      <div className="truncate text-[12px] font-medium text-base-content/70">{inc.site_name_manual || '—'}</div>
                    </td>
                    <td className="text-right">
                      <div className="font-mono text-[12px] font-bold text-base-content/90 mb-0.5">{formatDuration(inc.duration_nett_seconds)}</div>
                      <div className="truncate text-[12px] font-medium text-base-content/40 uppercase tracking-[0.15em]">{inc.technician_name || '—'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
        </div>
      </div>
    </div>
  );
}
