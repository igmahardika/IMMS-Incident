import React, { useEffect, useState } from 'react';
import { api, formatDuration, NCAL_ORDER, MONTH_NAMES } from '../utils/api.js';
import { NcalBadge, SectionCard, Spinner } from '../components/ui/index.jsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const NCAL_COLORS = { BLACK: '#a78bfa', RED: '#f87171', ORANGE: '#fb923c', YELLOW: '#fbbf24', BLUE: '#60a5fa' };
const PIE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#f97316','#ec4899','#14b8a6','#84cc16','#6b7280'];
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
          months[mo][r.ncal] = Math.round((r.avg_nett_seconds || 0) / 60);
          months[mo].total = (months[mo].total || 0) + r.total_cases;
        });
        setDuration(Object.values(months));
        setSla(s);
        setTechPerf(tp);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Duration Report</div>
          <div className="page-subtitle">Analisis durasi penanganan & performa SLA</div>
        </div>
        <div className="page-actions">
          <select className="form-control" value={year} onChange={e => setYear(e.target.value)} style={{ maxWidth: 100 }}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}><Spinner /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Line Chart */}
          <SectionCard title="Tren Rata-rata Durasi Nett (Menit)" subtitle={`Per NCAL - Tahun ${year}`}>
            <div className="chart-wrap">
              <ResponsiveContainer>
                <LineChart data={duration} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} unit=" min" />
                  <Tooltip contentStyle={{ background: '#0d1426', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {NCAL_ORDER.map(ncal => (
                    <Line key={ncal} type="monotone" dataKey={ncal} stroke={NCAL_COLORS[ncal]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* SLA Table */}
            <SectionCard title="Rangkuman SLA per NCAL" subtitle={`Tahun ${year}`}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>NCAL</th><th>Total</th><th>Avg Nett</th><th>SLA Met</th><th>SLA Target</th><th>%</th></tr></thead>
                  <tbody>
                    {sla.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>Belum ada data</td></tr>}
                    {sla.map(row => {
                      const pct = row.total_cases ? Math.round((row.sla_met / row.total_cases) * 100) : 0;
                      return (
                        <tr key={row.ncal}>
                          <td><NcalBadge value={row.ncal} /></td>
                          <td><strong>{row.total_cases}</strong></td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                          <td>{row.sla_met || 0}</td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.sla_target_minutes ? `${row.sla_target_minutes} min` : '—'}</td>
                          <td><span style={{ color: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700 }}>{pct}%</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* Technician Performance */}
            <SectionCard title="Performa Teknisi" subtitle={`Tahun ${year}`}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Teknisi</th><th>Total</th><th>Avg Durasi</th><th>Min</th><th>Max</th></tr></thead>
                  <tbody>
                    {techPerf.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>Belum ada data</td></tr>}
                    {techPerf.map(row => (
                      <tr key={row.technician}>
                        <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>{row.technician}</td>
                        <td>{row.total_handled}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--success)' }}>{formatDuration(row.min_nett)}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--danger)' }}>{formatDuration(row.max_nett)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
