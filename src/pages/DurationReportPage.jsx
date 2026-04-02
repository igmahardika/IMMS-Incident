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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">Duration Report</h1>
        <p className="text-xs md:text-xs font-bold uppercase tracking-wider text-base-content/65">Analysis of handling duration & SLA performance</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-base-100 p-3 px-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-base-content/65 uppercase tracking-wider">
          Filter Year:
        </div>
        <select className="select select-sm w-32 font-semibold text-sm h-9 bg-base-200/50" value={year} onChange={e => setYear(e.target.value)}>
          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? <div className="flex justify-center pt-12"><Spinner /></div> : (
        <div className="flex flex-col gap-4">
          {/* Line Chart */}
          <div className="bg-base-100 shadow-xl rounded-2xl overflow-visible">
            <div className="p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/65">Avg Nett Duration Trend (Minutes)</h3>
              <p className="text-sm font-bold text-base-content/85 mt-1 uppercase tracking-tight">Per NCAL — Year {year}</p>
            </div>
            <div className="p-6">
              <ChartContainer config={chartConfig} className="h-[300px] md:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={duration} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ className: "fill-base-content/70 font-bold", fontSize: 12 }} axisLine={false} tickLine={false} tickMargin={12} />
                    <YAxis tick={{ className: "fill-base-content/70 font-bold", fontSize: 12 }} unit=" min" axisLine={false} tickLine={false} tickMargin={12} />
                    <Tooltip content={<ChartTooltip config={chartConfig} valueFormatter={(val) => formatDuration(Math.round(val * 60))} />} />
                    <Legend content={<ChartLegend config={chartConfig} />} verticalAlign="bottom" height={36} />
                    {NCAL_ORDER.map(ncal => (
                      <Line key={ncal} type="monotone" dataKey={ncal} stroke={chartConfig[ncal].color} strokeWidth={2.5} dot={{ r: 4, fill: chartConfig[ncal].color, strokeWidth: 0 }} activeDot={{ r: 6, className: "stroke-base-100", strokeWidth: 2 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* SLA Table */}
            <div className="bg-base-100 shadow-xl rounded-2xl overflow-hidden">
              <div className="p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/65">SLA Summary per NCAL</h3>
                <p className="text-sm font-bold text-base-content/85 mt-1 uppercase tracking-tight">Year {year}</p>
              </div>
              <div className="overflow-auto max-h-[50vh] custom-scrollbar w-full p-0">
                <table className="table table-sm table-pin-rows table-stacked w-full">
                  <thead>
                    <tr className="shadow-[0_1px_0_rgba(var(--bc),0.05)]">
                    <th className="bg-base-100/90 backdrop-blur-md min-w-[100px] text-center uppercase tracking-wider text-xs font-bold text-base-content/65 py-3">NCAL</th>
                    <th className="bg-base-100/90 backdrop-blur-md text-center uppercase tracking-wider text-xs font-bold text-base-content/65 py-3">Total</th>
                    <th className="bg-base-100/90 backdrop-blur-md text-center uppercase tracking-wider text-xs font-bold text-base-content/65 py-3">Avg Nett</th>
                    <th className="bg-base-100/90 backdrop-blur-md text-center uppercase tracking-wider text-xs font-bold text-base-content/65 py-3">SLA Met</th>
                    <th className="bg-base-100/90 backdrop-blur-md text-center whitespace-nowrap uppercase tracking-wider text-xs font-bold text-base-content/65 py-3">SLA Target</th>
                    <th className="bg-base-100/90 backdrop-blur-md text-center uppercase tracking-wider text-xs font-bold text-base-content/65 py-3">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sla.length === 0 && <tr><td colSpan={6} className="text-center py-10 opacity-50">No data available</td></tr>}
                    {sla.map(row => {
                      const pct = row.total_cases ? Math.round((row.sla_met / row.total_cases) * 100) : 0;
                      return (
                        <tr key={row.ncal} className="hover:bg-base-200/50 transition-colors duration-300 group border-b border-base-content/5">
                          <td data-label="NCAL" className="text-center md:py-3"><NcalBadge value={row.ncal} /></td>
                          <td data-label="TOTAL" className="text-center font-semibold text-sm md:py-3">{row.total_cases}</td>
                          <td data-label="AVG NETT" className="text-center font-mono font-bold text-sm text-base-content/85 md:py-3">{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                          <td data-label="SLA MET" className="text-center font-bold text-primary text-sm md:py-3">{row.sla_met || 0}</td>
                          <td data-label="SLA TARGET" className="text-center text-base-content/65 text-xs uppercase font-bold tracking-tighter md:py-3">{row.sla_target_minutes ? `${row.sla_target_minutes}m` : '—'}</td>
                          <td data-label="PERCENTAGE" className="text-center md:py-3">
                            <span className={`font-bold tabular-nums ${pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-error'}`}>
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Technician Performance */}
            <div className="bg-base-100 shadow-xl rounded-2xl overflow-hidden">
              <div className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/40">Technician Performance</h3>
                <p className="text-sm font-medium text-base-content/70 mt-1 uppercase tracking-tight">Year {year}</p>
              </div>
              <div className="overflow-auto max-h-[50vh] custom-scrollbar w-full p-0">
                <table className="table table-sm table-pin-rows table-stacked w-full">
                  <thead>
                    <tr className="shadow-[0_1px_0_rgba(var(--bc),0.05)]">
                    <th className="bg-base-100/90 backdrop-blur-md text-left min-w-[200px] uppercase tracking-wider text-xs font-bold text-base-content/65 py-3">Technician</th>
                    <th className="bg-base-100/90 backdrop-blur-md text-center min-w-[100px] uppercase tracking-wider text-xs font-bold text-base-content/65 py-3">Total</th>
                    <th className="bg-base-100/90 backdrop-blur-md text-center min-w-[120px] uppercase tracking-wider text-xs font-bold text-base-content/65 py-3">Avg</th>
                    <th className="bg-base-100/90 backdrop-blur-md text-center min-w-[100px] uppercase tracking-wider text-xs font-bold text-success py-3">Min</th>
                    <th className="bg-base-100/90 backdrop-blur-md text-center min-w-[100px] uppercase tracking-wider text-xs font-bold text-error py-3">Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {techPerf.length === 0 && <tr><td colSpan={5} className="text-center py-10 opacity-50">No data available</td></tr>}
                    {techPerf.map(row => (
                      <tr key={row.technician} className="hover:bg-base-200/50 transition-colors duration-300 group border-b border-base-content/5">
                        <td data-label="TECHNICIAN" className="font-semibold text-sm tracking-tight md:py-3">{row.technician}</td>
                        <td data-label="TOTAL" className="text-center font-mono font-semibold text-sm md:py-3">{row.total_handled}</td>
                        <td data-label="AVG" className="text-center font-mono font-semibold text-sm text-base-content/70 md:py-3">{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                        <td data-label="MIN" className="text-center font-mono text-sm text-success md:py-3">{formatDuration(row.min_nett)}</td>
                        <td data-label="MAX" className="text-center font-mono text-sm text-error md:py-3">{formatDuration(row.max_nett)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
