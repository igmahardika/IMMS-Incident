import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDuration, NCAL_ORDER, MONTH_NAMES } from '../utils/api.js';
import { NcalBadge, SectionCard, Spinner } from '../components/ui/index.jsx';
import { AlertTriangle, CheckCircle, Activity, TrendingUp, Plus, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const NCAL_COLORS = { BLACK: '#a78bfa', RED: '#f87171', ORANGE: '#fb923c', YELLOW: '#fbbf24', BLUE: '#60a5fa' };

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [sla, setSla] = useState([]);
  const [duration, setDuration] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  useEffect(() => {
    Promise.all([
      api.getDashboard(),
      api.getSla({ year }),
      api.getDuration({ year }),
    ]).then(([d, s, dur]) => {
      setData(d);
      setSla(s);
      // Transform duration data for chart
      const months = {};
      dur.forEach(r => {
        const mo = parseInt(r.month, 10);
        if (!months[mo]) months[mo] = { month: MONTH_NAMES[mo - 1] };
        months[mo][r.ncal] = Math.round((r.avg_nett_seconds || 0) / 60);
      });
      setDuration(Object.values(months).sort((a, b) => MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month)));
    }).catch(console.error).finally(() => setLoading(false));
  }, [year]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}><Spinner /></div>;

  const byNcal = {};
  (data?.activeByNcal || []).forEach(r => { byNcal[r.ncal] = r.count; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Monitoring & Performa Incident Real-time</div>
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
          <div className="kpi-label">Total Aktif</div>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>{data?.totalActive || 0}</div>
          <div className="kpi-meta">Incident belum selesai</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Selesai</div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{data?.totalDone || 0}</div>
          <div className="kpi-meta">Semua waktu</div>
        </div>
        {NCAL_ORDER.map(ncal => (
          <div className="kpi-card" key={ncal}>
            <div className="kpi-label"><NcalBadge value={ncal} /></div>
            <div className="kpi-value" style={{ color: NCAL_COLORS[ncal] || 'var(--text-primary)' }}>{byNcal[ncal] || 0}</div>
            <div className="kpi-meta">Aktif sekarang</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Duration Trend Chart */}
        <SectionCard title="Tren Durasi Penanganan (Menit)" subtitle={`Tahun ${year}`} style={{ gridColumn: '1 / -1' }}>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={duration} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} />
                <Tooltip
                  contentStyle={{ background: '#0d1426', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {NCAL_ORDER.map(ncal => (
                  <Line key={ncal} type="monotone" dataKey={ncal} stroke={NCAL_COLORS[ncal]} strokeWidth={2} dot={{ r: 3, fill: NCAL_COLORS[ncal] }} activeDot={{ r: 5 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* SLA Table */}
        <SectionCard title="SLA Ringkasan Tahun Ini" subtitle="Berdasarkan kategori NCAL">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>NCAL</th>
                  <th>Total</th>
                  <th>Avg Durasi</th>
                  <th>SLA Met</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {sla.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>Belum ada data</td></tr>
                )}
                {sla.map(row => {
                  const pct = row.total_cases ? Math.round((row.sla_met / row.total_cases) * 100) : 0;
                  return (
                    <tr key={row.ncal}>
                      <td><NcalBadge value={row.ncal} /></td>
                      <td><strong>{row.total_cases}</strong></td>
                      <td>{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                      <td>{row.sla_met || 0}</td>
                      <td>
                        <span style={{ color: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }}>
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
        <SectionCard title="Baru Selesai" subtitle="5 incident terakhir yang ditutup">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(data?.recentClosed || []).length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem', textAlign: 'center' }}>Belum ada data</div>
            )}
            {(data?.recentClosed || []).map(inc => (
              <div key={inc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                <NcalBadge value={inc.ncal} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inc.case_no} — {inc.site_name_manual || '—'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {inc.technician_name || '—'} · {formatDuration(inc.duration_nett_seconds)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
