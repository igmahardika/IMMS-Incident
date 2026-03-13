import React, { useEffect, useState } from 'react';
import { api, MONTH_NAMES } from '../utils/api.js';
import { NcalBadge, Spinner, SectionCard, ChartContainer, ChartTooltip, ChartLegend, ResponsiveContainer } from '../components/ui/index.jsx';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Filter } from 'lucide-react';

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

  // Dynamic config for root causes
  const rootCauseConfig = React.useMemo(() => {
    const config = {};
    data.forEach((item, idx) => {
      config[item.classification] = {
        label: item.classification,
        color: PIE_COLORS[idx % PIE_COLORS.length]
      };
    });
    return config;
  }, [data]);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Root Cause Analysis</div>
          <div className="page-subtitle">Historical statistics of incident classifications</div>
        </div>
      </div>

      <div className="filter-bar mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} /> FILTER:
        </div>
        <select className="form-control" value={filters.year} onChange={e => setF('year', e.target.value)} style={{ width: 100 }}>
          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="form-control" value={filters.month} onChange={e => setF('month', e.target.value)} style={{ width: 140 }}>
          <option value="">All Months</option>
          {MONTH_NAMES.map((m, i) => <option key={i+1} value={String(i+1).padStart(2,'0')}>{m}</option>)}
        </select>
        <select className="form-control" value={filters.ncal} onChange={e => setF('ncal', e.target.value)} style={{ width: 140 }}>
          <option value="">All NCAL</option>
          {NCAL_OPTIONS.filter(Boolean).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}><Spinner /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Pie Chart */}
          <SectionCard title="Classification Distribution" subtitle={`Total: ${total} incidents`}>
            <ChartContainer config={rootCauseConfig} style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="count" nameKey="classification" cx="50%" cy="50%" outerRadius={100} strokeWidth={2} stroke="var(--bg-elevated)" labelLine={false} label={CustomLabel}>
                    {data.map((entry, i) => <Cell key={i} fill={rootCauseConfig[entry.classification]?.color || PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip config={rootCauseConfig} />} />
                  <Legend content={<ChartLegend config={rootCauseConfig} />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </SectionCard>

          {/* Bar Chart */}
          <SectionCard title="Frequency per Classification" subtitle="Sorted by frequency">
            <ChartContainer config={rootCauseConfig} style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                  <CartesianGrid vertical={false} horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="classification" width={150} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip config={rootCauseConfig} />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                    {data.slice(0, 8).map((entry, i) => {
                      const color = rootCauseConfig[entry.classification]?.color || PIE_COLORS[i % PIE_COLORS.length];
                      return <Cell key={i} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </SectionCard>

          {/* Top Table */}
          <SectionCard title="Classification Breakdown" style={{ gridColumn: '1 / -1' }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Classification</th><th>Count</th><th>Percentage</th><th>Chart</th></tr></thead>
                <tbody>
                  {data.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No data available</td></tr>}
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
