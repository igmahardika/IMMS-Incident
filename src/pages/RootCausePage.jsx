import React, { useEffect, useState } from 'react';
import { api, MONTH_NAMES } from '../utils/api.js';
import { NcalBadge, Spinner } from '../components/ui/index.jsx';
import { SectionCard } from '../components/ui/index.jsx';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const PIE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#f97316','#ec4899','#14b8a6','#84cc16','#64748b'];
const NCAL_OPTIONS = ['', 'BLACK', 'RED', 'ORANGE', 'YELLOW', 'BLUE'];
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => currentYear - i);

const CustomLabel = ({ cx, cy, midAngle, outerRadius, name, percent }) => {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const r = outerRadius + 20;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="var(--text-secondary)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>{`${(percent * 100).toFixed(0)}%`}</text>;
};

export default function RootCausePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ year: String(currentYear), month: '', ncal: '' });
  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.year) params.year = filters.year;
    if (filters.month) params.month = filters.month;
    if (filters.ncal) params.ncal = filters.ncal;
    api.getRootCause(params).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [filters.year, filters.month, filters.ncal]);

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Root Cause Analysis</div>
          <div className="page-subtitle">Statistik klasifikasi gangguan</div>
        </div>
        <div className="page-actions">
          <select className="form-control" value={filters.year} onChange={e => setF('year', e.target.value)} style={{ maxWidth: 100 }}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="form-control" value={filters.month} onChange={e => setF('month', e.target.value)} style={{ maxWidth: 120 }}>
            <option value="">Semua Bulan</option>
            {MONTH_NAMES.map((m, i) => <option key={i+1} value={String(i+1).padStart(2,'0')}>{m}</option>)}
          </select>
          <select className="form-control" value={filters.ncal} onChange={e => setF('ncal', e.target.value)} style={{ maxWidth: 120 }}>
            <option value="">Semua NCAL</option>
            {NCAL_OPTIONS.filter(Boolean).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}><Spinner /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Pie Chart */}
          <SectionCard title="Distribusi Klasifikasi" subtitle={`Total: ${total} incident`}>
            <div style={{ height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data} dataKey="count" nameKey="classification" cx="50%" cy="50%" outerRadius={110} labelLine={false} label={CustomLabel}>
                    {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0d1426', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [`${v} (${total ? ((v/total)*100).toFixed(1) : 0}%)`, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* Bar Chart */}
          <SectionCard title="Jumlah per Klasifikasi" subtitle="Diurutkan berdasarkan frekuensi">
            <div style={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 30, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="classification" width={160} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#0d1426', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {data.slice(0, 8).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* Top Table */}
          <SectionCard title="Detail Klasifikasi" style={{ gridColumn: '1 / -1' }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Klasifikasi</th><th>Jumlah</th><th>Persentase</th><th>Bar</th></tr></thead>
                <tbody>
                  {data.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>Belum ada data</td></tr>}
                  {data.map((row, i) => {
                    const pct = total ? ((row.count / total) * 100).toFixed(1) : 0;
                    return (
                      <tr key={row.classification}>
                        <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>#{i + 1}</td>
                        <td style={{ fontWeight: 600, fontSize: '0.82rem' }}>{row.classification}</td>
                        <td><strong>{row.count}</strong></td>
                        <td><span style={{ color: PIE_COLORS[i % PIE_COLORS.length], fontWeight: 700 }}>{pct}%</span></td>
                        <td>
                          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, minWidth: 80 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 3, transition: 'width 0.5s ease' }} />
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
      )}
    </div>
  );
}
