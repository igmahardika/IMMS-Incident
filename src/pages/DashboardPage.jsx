import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDuration, NCAL_ORDER, MONTH_NAMES } from '../utils/api.js';
import { NcalBadge, SectionCard, PageSpinner, ChartContainer, ChartTooltip, ChartLegend, ResponsiveContainer } from '../components/ui/index.jsx';
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

  if (loading) return <PageSpinner />;

  const byNcal = {};
  (data?.activeByNcal || []).forEach(r => { byNcal[r.ncal] = r.count; });

  const NCAL_COLORS_KPI = { BLACK: 'var(--ncal-black-text)', RED: 'var(--ncal-red-text)', ORANGE: 'var(--ncal-orange-text)', YELLOW: 'var(--ncal-yellow-text)', BLUE: 'var(--ncal-blue-text)' };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title text-xl">Dashboard</div>
          <div className="page-subtitle text-xs">Real-time Incident Monitoring & Performance</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/incidents/create')}>
            <Plus size={16} strokeWidth={2} /> Create Incident
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="flex flex-col gap-4">
        <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
          <div className="stat">
            <div className="stat-figure text-error"><AlertTriangle size={32} /></div>
            <div className="stat-title uppercase tracking-widest text-xs font-bold opacity-70">Active Incidents</div>
            <div className="stat-value text-error">{data?.totalActive || 0}</div>
            <div className="stat-desc">Unresolved cases</div>
          </div>
          <div className="stat">
            <div className="stat-figure text-success"><CheckCircle size={32} /></div>
            <div className="stat-title uppercase tracking-widest text-xs font-bold opacity-70">Resolved</div>
            <div className="stat-value text-success">{data?.totalDone || 0}</div>
            <div className="stat-desc">Total all time</div>
          </div>
        </div>
        
        <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
          {NCAL_ORDER.map((ncal, i) => (
            <div className="stat" key={ncal}>
              <div className="stat-title mb-2"><NcalBadge value={ncal} /></div>
              <div className="stat-value text-3xl" style={{ color: NCAL_COLORS_KPI[ncal] }}>{byNcal[ncal] || 0}</div>
              <div className="stat-desc">Active</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Duration Trend Chart */}
        <SectionCard title="Resolution Duration Trend (Minutes)" subtitle={`Year ${CURRENT_YEAR}`} style={{ gridColumn: '1 / -1' }}>
          <ChartContainer config={chartConfig} style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={duration} margin={{ top: 20, right: 20, left: 10, bottom: 40 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.05} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={12} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={12} width={40} />
                <Tooltip content={<ChartTooltip config={chartConfig} valueFormatter={(val) => formatDuration(Math.round(val * 60))} />} />
                <Legend content={<ChartLegend config={chartConfig} />} verticalAlign="bottom" height={40} wrapperStyle={{ paddingTop: '20px' }} />
                {NCAL_ORDER.map(ncal => (
                  <Line key={ncal} type="monotone" dataKey={ncal} stroke={chartConfig[ncal].color} strokeWidth={1.5} dot={{ r: 2, fill: chartConfig[ncal].color, strokeWidth: 0 }} activeDot={{ r: 4, stroke: 'var(--bg-surface)', strokeWidth: 2 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </SectionCard>

        <div className="layout-with-aside">
          {/* SLA Table */}
          <SectionCard title="SLA Summary This Year" subtitle="Based on NCAL segments" style={{ padding: 0 }}>
            <div className="overflow-x-auto w-full">
              <table className="table table-zebra table-sm">
                <thead>
                <tr>
                  <th className="w-1/12 text-center">NCAL</th>
                  <th className="w-2/12 text-center">CASES</th>
                  <th className="w-4/12 text-center">AVG DURATION</th>
                  <th className="w-3/12 text-center">SLA MET</th>
                  <th className="w-1/12 text-center">%</th>
                </tr>
              </thead>
              <tbody>
                {sla.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem' }}>No data available</td></tr>
                )}
                {sla.map(row => {
                  const pct = row.total_cases ? Math.round((row.sla_met / row.total_cases) * 100) : 0;
                  return (
                    <tr key={row.ncal}>
                      <td className="text-center"><NcalBadge value={row.ncal} /></td>
                      <td className="text-center tabular" style={{ fontWeight: 600 }}>{row.total_cases}</td>
                      <td className="text-center text-id tabular" style={{ fontSize: 'var(--f-xs)' }}>{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                      <td className="text-center tabular" style={{ fontWeight: 600 }}>{row.sla_met || 0}</td>
                      <td className="text-center tabular">
                        <span className="text-sm" style={{ color: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700 }}>
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
            <table className="table table-zebra table-sm">
              <thead>
                <tr>
                  <th className="w-2/12 text-center">NCAL</th>
                  <th className="w-5/12 text-left">INCIDENT</th>
                  <th className="w-5/12 text-right">DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentClosed || []).length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem' }}>No recently closed incidents</td></tr>
                )}
                {(data?.recentClosed || []).map(inc => (
                  <tr key={inc.id} className="tr-hover-accent" style={{ cursor: 'pointer' }} onClick={() => navigate(`/incidents/${inc.id}`)}>
                    <td className="text-center"><NcalBadge value={inc.ncal} /></td>
                    <td className="text-left">
                      <div className="id-link text-id text-sm" style={{ marginBottom: 2, fontWeight: 700 }}>{inc.case_no}</div>
                      <div className="text-truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{inc.site_name_manual || '—'}</div>
                    </td>
                    <td className="text-right">
                      <div className="tabular text-sm" style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{formatDuration(inc.duration_nett_seconds)}</div>
                      <div className="text-truncate text-xs" style={{ color: 'var(--text-muted)' }}>{inc.technician_name || '—'}</div>
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
