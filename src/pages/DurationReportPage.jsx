import React, { useEffect, useState } from 'react';
import { api, formatDuration, NCAL_ORDER, MONTH_NAMES } from '../utils/api.js';
import { NcalBadge, SectionCard, Spinner, ChartContainer, ChartTooltip, ChartLegend, ResponsiveContainer } from '../components/ui/index.jsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const chartConfig = {
  BLACK: { label: 'BLACK', color: 'var(--ncal-black-text)' },
  RED: { label: 'RED', color: 'var(--ncal-red-text)' },
  ORANGE: { label: 'ORANGE', color: 'var(--ncal-orange-text)' },
  YELLOW: { label: 'YELLOW', color: 'var(--ncal-yellow-text)' },
  BLUE: { label: 'BLUE', color: 'var(--ncal-blue-text)' },
};

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
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title text-xl">Duration Report</div>
          <div className="page-subtitle text-xs">Analysis of handling duration & SLA performance</div>
        </div>
      </div>

      <div className="filter-bar mb-4">
        <div style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '0.5rem' }}>FILTER:</div>
        <select className="select select-bordered select-md " value={year} onChange={e => setYear(e.target.value)} style={{ width: 100 }}>
          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}><Spinner /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Line Chart */}
          <SectionCard title="Avg Nett Duration Trend (Minutes)" subtitle={`Per NCAL - Year ${year}`}>
            <ChartContainer config={chartConfig} style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={duration} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickMargin={12} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} unit=" min" axisLine={false} tickLine={false} tickMargin={12} />
                  <Tooltip content={<ChartTooltip config={chartConfig} valueFormatter={(val) => formatDuration(Math.round(val * 60))} />} />
                  <Legend content={<ChartLegend config={chartConfig} />} verticalAlign="bottom" height={36} />
                  {NCAL_ORDER.map(ncal => (
                    <Line key={ncal} type="monotone" dataKey={ncal} stroke={chartConfig[ncal].color} strokeWidth={2.5} dot={{ r: 4, fill: chartConfig[ncal].color, strokeWidth: 0 }} activeDot={{ r: 6, stroke: 'var(--bg-surface)', strokeWidth: 2 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </SectionCard>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* SLA Table */}
            <SectionCard title="SLA Summary per NCAL" subtitle={`Year ${year}`}>
              <div className="table-wrap">
                <table className="data-table">
                  <colgroup>
                    <col className="cg-ncal" />
                    <col className="cg-id-sm" />
                    <col className="cg-duration" />
                    <col className="cg-id-sm" />
                    <col className="cg-duration" />
                    <col className="cg-priority" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>NCAL</th>
                      <th>Total</th>
                      <th>Avg Nett</th>
                      <th>SLA Met</th>
                      <th>SLA Target</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sla.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No data available</td></tr>}
                    {sla.map(row => {
                      const pct = row.total_cases ? Math.round((row.sla_met / row.total_cases) * 100) : 0;
                      return (
                        <tr key={row.ncal} className="tr-hover-accent">
                          <td className="text-center"><NcalBadge value={row.ncal} /></td>
                          <td className="text-center tabular" style={{ fontWeight: 600 }}>{row.total_cases}</td>
                          <td className="text-center text-id text-sm">{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                          <td className="text-center tabular" style={{ fontWeight: 600 }}>{row.sla_met || 0}</td>
                          <td className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>{row.sla_target_minutes ? `${row.sla_target_minutes} min` : '—'}</td>
                          <td className="text-center tabular"><span className="text-sm" style={{ color: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700 }}>{pct}%</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* Technician Performance */}
            <SectionCard title="Technician Performance" subtitle={`Year ${year}`}>
              <div className="table-wrap">
                <table className="data-table">
                  <colgroup>
                    <col className="cg-auto" />
                    <col className="cg-id-sm" />
                    <col className="cg-duration" />
                    <col className="cg-duration" />
                    <col className="cg-duration" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="text-left">Technician</th>
                      <th>Total</th>
                      <th>Avg Duration</th>
                      <th>Min</th>
                      <th>Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {techPerf.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No data available</td></tr>}
                    {techPerf.map(row => (
                      <tr key={row.technician} className="tr-hover-accent">
                        <td className="text-left text-sm" style={{ fontWeight: 600 }}>{row.technician}</td>
                        <td className="text-center tabular" style={{ fontWeight: 600 }}>{row.total_handled}</td>
                        <td className="text-center text-id text-xs">{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                        <td className="text-center text-id text-xs" style={{ color: 'var(--success)' }}>{formatDuration(row.min_nett)}</td>
                        <td className="text-center text-id text-xs" style={{ color: 'var(--danger)' }}>{formatDuration(row.max_nett)}</td>
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
