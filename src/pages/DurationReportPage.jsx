import React, { useEffect, useState } from 'react';
import { api, formatDuration, NCAL_ORDER, MONTH_NAMES } from '../utils/api.js';
import { NcalBadge, SectionCard, Spinner, ChartContainer, ChartTooltip, ChartLegend, ResponsiveContainer } from '../components/ui/index.jsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Calendar } from 'lucide-react';
import { cn } from '../lib/utils.js';

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
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-black tracking-tight text-foreground uppercase">Duration Report</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 leading-relaxed">Analysis of handling duration & SLA performance</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-background border border-foreground/5 rounded-md px-3 h-9 shadow-sm">
                <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12} /> Year</span>
                <select 
                    className="bg-transparent border-none focus:ring-0 text-[11px] font-black text-foreground outline-none cursor-pointer"
                    value={year} 
                    onChange={e => setYear(e.target.value)}
                >
                    {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="flex flex-col gap-6">
          {/* Trend Analysis */}
          <SectionCard 
            title="Statistical Momentum" 
            subtitle="Avg Nett Duration Trend (Minutes) per NCAL" 
            padding={false}
          >
            <div className="p-6">
              <ChartContainer config={chartConfig} className="h-[300px] md:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={duration} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-foreground)" opacity={0.05} />
                    <XAxis 
                        dataKey="month" 
                        tick={{ fill: 'var(--color-foreground)', opacity: 0.4, fontWeight: 900, fontSize: 10 }} 
                        axisLine={false} 
                        tickLine={false} 
                        tickMargin={12} 
                    />
                    <YAxis 
                        tick={{ fill: 'var(--color-foreground)', opacity: 0.4, fontWeight: 900, fontSize: 10 }} 
                        unit="m" 
                        axisLine={false} 
                        tickLine={false} 
                        tickMargin={12} 
                    />
                    <Tooltip content={<ChartTooltip config={chartConfig} valueFormatter={(val) => `${val} min`} />} />
                    <Legend content={<ChartLegend config={chartConfig} />} verticalAlign="top" align="right" height={40} />
                    {NCAL_ORDER.map(ncal => (
                      <Line 
                        key={ncal} 
                        type="monotone" 
                        dataKey={ncal} 
                        stroke={chartConfig[ncal].color} 
                        strokeWidth={4} 
                        dot={{ r: 0 }} 
                        activeDot={{ r: 6, strokeWidth: 4, stroke: 'var(--color-background)' }} 
                        connectNulls 
                        animationDuration={1500}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SLA Summary Table */}
            <SectionCard title="SLA Compliance" subtitle="Service Level performance by Category" padding={false} className="flex flex-col min-h-0">
              <div className="flex-1 min-h-0 overflow-auto custom-scrollbar w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-foreground/[0.02] border-b border-foreground/5">
                        <th className="uppercase tracking-widest text-[9px] font-black text-foreground/30 py-4 px-4 sticky top-0 bg-background/95 backdrop-blur-md z-10">NCAL Category</th>
                        <th className="text-center uppercase tracking-widest text-[9px] font-black text-foreground/30 py-4 px-4 sticky top-0 bg-background/95 backdrop-blur-md z-10">Total</th>
                        <th className="text-center uppercase tracking-widest text-[9px] font-black text-foreground/30 py-4 px-4 sticky top-0 bg-background/95 backdrop-blur-md z-10">Avg Nett</th>
                        <th className="text-center uppercase tracking-widest text-[9px] font-black text-foreground/30 py-4 px-4 sticky top-0 bg-background/95 backdrop-blur-md z-10 text-primary">Met</th>
                        <th className="text-right uppercase tracking-widest text-[9px] font-black text-foreground/30 py-4 px-4 sticky top-0 bg-background/95 backdrop-blur-md z-10">Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/5">
                    {sla.length === 0 && (
                        <tr><td colSpan={5} className="text-center py-20 opacity-20 font-black text-[10px] uppercase tracking-widest">No Intelligence Data</td></tr>
                    )}
                    {sla.map(row => {
                      const pct = row.total_cases ? Math.round((row.sla_met / row.total_cases) * 100) : 0;
                      return (
                        <tr key={row.ncal} className="hover:bg-foreground/[0.01] transition-colors group">
                          <td className="py-4 px-4"><NcalBadge value={row.ncal} /></td>
                          <td className="text-center font-black text-[11px] text-foreground/80 tabular-nums">{row.total_cases}</td>
                          <td className="text-center font-mono font-black text-[11px] text-foreground/60 tabular-nums">{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                          <td className="text-center font-black text-[11px] text-primary tabular-nums">{row.sla_met || 0}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3 justify-end">
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className={cn(
                                        "text-[11px] font-black tabular-nums",
                                        pct >= 85 ? 'text-success' : pct >= 70 ? 'text-warning' : 'text-error'
                                    )}>{pct}%</span>
                                    <span className="text-[8px] font-black text-foreground/20 uppercase tracking-widest">SLA {row.sla_target_minutes}m</span>
                                </div>
                                <div className="w-16 bg-foreground/5 h-1 rounded-full overflow-hidden">
                                    <div className={cn(
                                        "h-full rounded-full transition-all duration-1000",
                                        pct >= 85 ? 'bg-success' : pct >= 70 ? 'bg-warning' : 'bg-error'
                                    )} style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* Technician Performance Table */}
            <SectionCard title="Field Intelligence" subtitle="Personnel Efficiency Benchmarks" padding={false} className="flex flex-col min-h-0">
              <div className="flex-1 min-h-0 overflow-auto custom-scrollbar w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-foreground/[0.02] border-b border-foreground/5">
                        <th className="uppercase tracking-widest text-[9px] font-black text-foreground/30 py-4 px-4 sticky top-0 bg-background/95 backdrop-blur-md z-10">Operator Segment</th>
                        <th className="text-center uppercase tracking-widest text-[9px] font-black text-foreground/30 py-4 px-4 sticky top-0 bg-background/95 backdrop-blur-md z-10">Volume</th>
                        <th className="text-center uppercase tracking-widest text-[9px] font-black text-foreground/30 py-4 px-4 sticky top-0 bg-background/95 backdrop-blur-md z-10 text-primary">Avg</th>
                        <th className="text-center uppercase tracking-widest text-[9px] font-black text-foreground/30 py-4 px-4 sticky top-0 bg-background/95 backdrop-blur-md z-10 text-success">Min</th>
                        <th className="text-right uppercase tracking-widest text-[9px] font-black text-foreground/30 py-4 px-4 sticky top-0 bg-background/95 backdrop-blur-md z-10 text-error">Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/5">
                    {techPerf.length === 0 && (
                        <tr><td colSpan={5} className="text-center py-20 opacity-20 font-black text-[10px] uppercase tracking-widest">No Intelligence Data</td></tr>
                    )}
                    {techPerf.map(row => (
                      <tr key={row.technician} className="hover:bg-foreground/[0.01] transition-colors group">
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-black text-foreground/80 uppercase tracking-tighter leading-none">{row.technician}</span>
                            <span className="text-[8px] font-black text-foreground/20 uppercase tracking-widest">Technician</span>
                          </div>
                        </td>
                        <td className="text-center font-black text-[11px] text-foreground/70 tabular-nums uppercase">{row.total_handled} cases</td>
                        <td className="text-center font-mono font-black text-[11px] text-primary tabular-nums">{formatDuration(Math.round(row.avg_nett_seconds || 0))}</td>
                        <td className="text-center font-mono font-black text-[11px] text-success/70 tabular-nums">{formatDuration(row.min_nett)}</td>
                        <td className="text-right px-4 font-mono font-black text-[11px] text-error/70 tabular-nums">{formatDuration(row.max_nett)}</td>
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
