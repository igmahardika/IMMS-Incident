import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDuration, NCAL_ORDER, MONTH_NAMES } from '../utils/api.js';
import { NcalBadge, SectionCard, PageSpinner } from '../components/ui/index.jsx';
import { AlertTriangle, CheckCircle, Activity, TrendingUp, Plus, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const NCAL_COLORS = { BLACK: '#a78bfa', RED: '#f87171', ORANGE: '#fb923c', YELLOW: '#fbbf24', BLUE: '#60a5fa' };
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

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Real-time Incident Monitoring & Performance</div>
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
          <div className="kpi-label">Active Incidents</div>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>{data?.totalActive || 0}</div>
          <div className="kpi-meta">Unresolved cases</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Resolved Incidents</div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{data?.totalDone || 0}</div>
          <div className="kpi-meta">Total all time</div>
        </div>
        {NCAL_ORDER.map(ncal => (
          <div className="kpi-card" key={ncal}>
            <div className="kpi-label"><NcalBadge value={ncal} /></div>
            <div className="kpi-value" style={{ color: NCAL_COLORS[ncal] || 'var(--text-primary)' }}>{byNcal[ncal] || 0}</div>
            <div className="kpi-meta">Currently active</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Duration Trend Chart */}
        <SectionCard title="Resolution Duration Trend (Minutes)" subtitle={`Year ${CURRENT_YEAR}`} style={{ gridColumn: '1 / -1' }}>
          <div className="chart-wrap" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={300} minWidth={0}>
              <LineChart data={duration} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-primary)', boxShadow: 'var(--shadow-lg)' }}
                  labelStyle={{ color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {NCAL_ORDER.map(ncal => (
                  <Line key={ncal} type="monotone" dataKey={ncal} stroke={NCAL_COLORS[ncal]} strokeWidth={2} dot={{ r: 3, fill: NCAL_COLORS[ncal] }} activeDot={{ r: 5 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
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
                      <td className="text-center" style={{ fontWeight: 600 }}>{row.total_cases}</td>
                      <td className="text-mono" style={{ fontSize: '0.786rem' }}>{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                      <td className="text-center" style={{ fontWeight: 600 }}>{row.sla_met || 0}</td>
                      <td className="text-right">
                        <span style={{ color: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700, fontSize: '0.845rem' }}>
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
              <div key={inc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem 0.875rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div style={{ flexShrink: 0 }}><NcalBadge value={inc.ncal} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="id-link text-truncate" onClick={() => navigate(`/incidents/${inc.id}`)} style={{ display: 'block', marginBottom: 2 }}>
                    {inc.case_no} <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--font-family)', fontSize: '0.8rem' }}>— {inc.site_name_manual || '—'}</span>
                  </div>
                  <div style={{ fontSize: '0.714rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="text-truncate" style={{ maxWidth: 120 }}>{inc.technician_name || '—'}</span>
                    <span>·</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontFamily: 'monospace' }}>{formatDuration(inc.duration_nett_seconds)}</span>
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
