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
            <Plus size={14} /> Create Incident
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label text-xs">Active Incidents</div>
          <div className="kpi-value text-xl" style={{ color: 'var(--danger)' }}>{data?.totalActive || 0}</div>
          <div className="kpi-meta text-xs">Unresolved cases</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label text-xs">Resolved Incidents</div>
          <div className="kpi-value text-xl" style={{ color: 'var(--success)' }}>{data?.totalDone || 0}</div>
          <div className="kpi-meta text-xs">Total all time</div>
        </div>
        {NCAL_ORDER.map(ncal => (
          <div className="kpi-card" key={ncal}>
            <div className="kpi-label"><NcalBadge value={ncal} /></div>
            <div className="kpi-value text-xl" style={{ color: NCAL_COLORS_KPI[ncal] || 'var(--text-primary)' }}>{byNcal[ncal] || 0}</div>
            <div className="kpi-meta text-xs">Currently active</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Duration Trend Chart */}
        <SectionCard title="Resolution Duration Trend (Minutes)" subtitle={`Year ${CURRENT_YEAR}`} style={{ gridColumn: '1 / -1' }}>
          <ChartContainer config={chartConfig} style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={duration} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickMargin={12} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickMargin={12} />
                <Tooltip content={<ChartTooltip config={chartConfig} valueFormatter={(val) => formatDuration(Math.round(val * 60))} />} />
                <Legend content={<ChartLegend config={chartConfig} />} verticalAlign="bottom" height={36} />
                {NCAL_ORDER.map(ncal => (
                  <Line key={ncal} type="monotone" dataKey={ncal} stroke={chartConfig[ncal].color} strokeWidth={2.5} dot={{ r: 4, fill: chartConfig[ncal].color, strokeWidth: 0 }} activeDot={{ r: 6, stroke: 'var(--bg-surface)', strokeWidth: 2 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </SectionCard>

        <div className="layout-with-aside">
          {/* SLA Table */}
          <SectionCard title="SLA Summary This Year" subtitle="Based on NCAL segments" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                <tr>
                  <th>NCAL</th>
                  <th className="text-center">Total Cases</th>
                  <th>Avg Duration</th>
                  <th className="text-center">SLA Met</th>
                  <th className="text-right">%</th>
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
                      <td><NcalBadge value={row.ncal} /></td>
                      <td className="text-center text-sm" style={{ fontWeight: 600 }}>{row.total_cases}</td>
                      <td className="text-id text-xs">{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                      <td className="text-center text-sm" style={{ fontWeight: 600 }}>{row.sla_met || 0}</td>
                      <td className="text-right">
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
        <SectionCard title="Recently Resolved" subtitle="Last 5 closed incidents">
          <div className="page-stack" style={{ gap: '0.5rem' }}>
            {(data?.recentClosed || []).length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '2rem 1rem', textAlign: 'center' }}>No recently closed incidents</div>
            )}
            {(data?.recentClosed || []).map(inc => (
              <div key={inc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.875rem 0', borderBottom: '1px dashed var(--border)' }}>
                <div style={{ flexShrink: 0 }}><NcalBadge value={inc.ncal} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="id-link text-truncate text-id text-sm" onClick={() => navigate(`/incidents/${inc.id}`)} style={{ display: 'block', marginBottom: 2 }}>
                    {inc.case_no} <span className="text-sm" style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--font-main)' }}>— {inc.site_name_manual || '—'}</span>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="text-truncate" style={{ maxWidth: 120 }}>{inc.technician_name || '—'}</span>
                    <span>·</span>
                    <span className="text-id" style={{ color: 'var(--text-secondary)' }}>{formatDuration(inc.duration_nett_seconds)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        </div>
      </div>
    </div>
  );
}
