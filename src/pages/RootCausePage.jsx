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
          <div className="page-title text-xl">Root Cause Analysis</div>
          <div className="page-subtitle text-xs">Historical statistics of incident classifications</div>
        </div>
      </div>

      <div className="filter-bar mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} /> FILTER:
        </div>
        <select className="select select-bordered select-md " value={filters.year} onChange={e => setF('year', e.target.value)} style={{ width: 100 }}>
          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="select select-bordered select-md " value={filters.month} onChange={e => setF('month', e.target.value)} style={{ width: 140 }}>
          <option value="">All Months</option>
          {MONTH_NAMES.map((m, i) => <option key={i+1} value={String(i+1).padStart(2,'0')}>{m}</option>)}
        </select>
        <select className="select select-bordered select-md " value={filters.ncal} onChange={e => setF('ncal', e.target.value)} style={{ width: 140 }}>
          <option value="">All NCAL</option>
          {NCAL_OPTIONS.filter(Boolean).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}><Spinner /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Pie Chart — overflow:visible so outer labels aren't clipped */}
          <SectionCard title="Classification Distribution" subtitle={`Total: ${total} incidents`} style={{ overflow: 'visible' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <ChartContainer config={rootCauseConfig} style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
                    <Pie data={data} dataKey="count" nameKey="classification" cx="50%" cy="50%" outerRadius={95} strokeWidth={2} stroke="var(--bg-elevated)" labelLine={false} label={CustomLabel}>
                      {data.map((entry, i) => <Cell key={i} fill={rootCauseConfig[entry.classification]?.color || PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip config={rootCauseConfig} />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              {/* Legend rendered outside ChartContainer to avoid clipping */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <ChartLegend
                  payload={data.map((entry, i) => ({
                    value: entry.classification,
                    color: rootCauseConfig[entry.classification]?.color || PIE_COLORS[i % PIE_COLORS.length],
                  }))}
                  config={rootCauseConfig}
                />
              </div>
            </div>
          </SectionCard>

          {/* Bar Chart — overflow:visible prevents bar label clipping */}
          <SectionCard title="Frequency per Classification" subtitle="Sorted by frequency" style={{ overflow: 'visible' }}>
            <ChartContainer config={rootCauseConfig} style={{ height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 40, top: 8, bottom: 8 }}>
                  <CartesianGrid vertical={false} horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="classification" width={160} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip config={rootCauseConfig} />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                    {data.slice(0, 10).map((entry, i) => {
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
              <table className="data-table">
                <colgroup>
                  <col className="cg-check" />
                  <col className="cg-auto" />
                  <col className="cg-id-sm" />
                  <col className="cg-priority" />
                  <col className="cg-status" />
                </colgroup>
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="text-left">Classification</th>
                    <th>Count</th>
                    <th>Percentage</th>
                    <th className="text-left">Chart</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No data available</td></tr>}
                  {data.map((row, i) => {
                    const pct = total ? ((row.count / total) * 100).toFixed(1) : 0;
                    return (
                      <tr key={row.classification} className="tr-hover-accent">
                        <td className="text-center text-xs tabular" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>#{i + 1}</td>
                        <td className="text-left text-sm" style={{ fontWeight: 600 }}>{row.classification}</td>
                        <td className="text-center tabular" style={{ fontWeight: 600 }}>{row.count}</td>
                        <td className="text-center tabular"><span style={{ color: PIE_COLORS[i % PIE_COLORS.length], fontWeight: 600, fontSize: 'var(--f-sm)' }}>{pct}%</span></td>
                        <td className="text-left" style={{ paddingRight: '24px' }}>
                          <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, minWidth: 80 }}>
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
