import React, { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Activity,
  Calendar,
  Clock,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Zap,
} from 'lucide-react';
import { api } from '../utils/api.js';
import { formatDuration } from '../utils/incidentUtils.js';
import { MONTH_NAMES, NCAL_ORDER } from '../utils/constants.js';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  PageHeader,
  ResponsiveContainer,
  SectionCard,
  Select,
  Spinner,
} from '../components/ui/index.jsx';
import { cn } from '../lib/utils.js';

const chartConfig = {
  BLACK: { label: 'BLACK', color: 'var(--color-ncal-black)' },
  RED: { label: 'RED', color: 'var(--color-ncal-red)' },
  ORANGE: { label: 'ORANGE', color: 'var(--color-ncal-orange)' },
  YELLOW: { label: 'YELLOW', color: 'var(--color-ncal-yellow)' },
  BLUE: { label: 'BLUE', color: 'var(--color-ncal-blue)' },
};

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, index) => currentYear - index);

function StatCard({ label, value, icon, tone = 'default' }) {
  const Icon = icon;

  const toneClassName = {
    default: 'text-primary',
    warning: 'text-warning',
    success: 'text-success',
    destructive: 'text-destructive',
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Icon className={cn('h-5 w-5', toneClassName[tone] || toneClassName.default)} />
        </div>
      </div>
    </div>
  );
}

export default function DurationReportPage() {
  const [year, setYear] = useState(String(currentYear));
  const [duration, setDuration] = useState([]);
  const [sla, setSla] = useState([]);
  const [techPerf, setTechPerf] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      api.getDuration({ year }),
      api.getSla({ year }),
      api.getTechPerf({ year }),
    ])
      .then(([durationRows, slaRows, technicianRows]) => {
        const months = {};

        durationRows.forEach((row) => {
          const month = Number.parseInt(row.month, 10);
          if (!months[month]) {
            months[month] = {
              month: MONTH_NAMES[month - 1],
              total: 0,
            };
          }
          months[month][row.ncal] = Math.max(0, Math.round(row.avg_nett_seconds || 0));
          months[month].total = (months[month].total || 0) + row.total_cases;
        });

        const processedDuration = Object.values(months).map((monthEntry) => {
          const entry = { ...monthEntry };
          NCAL_ORDER.forEach((ncal) => {
            if (entry[ncal] === undefined) entry[ncal] = 0;
          });
          return entry;
        });

        setDuration(processedDuration);
        setSla(slaRows);
        setTechPerf(technicianRows);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const stats = useMemo(() => {
    const totalCases = sla.reduce((sum, row) => sum + (row.total_cases || 0), 0);
    const avgMttR = sla.length
      ? sla.reduce((sum, row) => sum + (row.avg_nett_seconds || 0), 0) / sla.length
      : 0;
    const slaSuccess = totalCases
      ? (sla.reduce((sum, row) => sum + (row.sla_met || 0), 0) / totalCases) * 100
      : 0;
    const maxDur = techPerf.length ? Math.max(...techPerf.map((row) => row.max_nett || 0)) : 0;

    return {
      totalCases,
      avgMttR,
      slaSuccess,
      maxDur,
    };
  }, [sla, techPerf]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <PageHeader
        title="Duration Intelligence"
        subtitle={`Review incident duration trends, SLA performance, and technician handling efficiency for ${year}.`}
        action={(
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground sm:flex">
              <Calendar className="h-3.5 w-3.5" />
              Fiscal Year
            </div>
            <Select value={year} onChange={(event) => setYear(event.target.value)} className="w-[140px]">
              {YEAR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        )}
      />

      <div className="flex-1 overflow-y-auto pb-6">
        {loading ? (
          <div className="flex justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Incident Volume"
                value={stats.totalCases}
                icon={Activity}
                tone="default"
              />
              <StatCard
                label="Enterprise MTTR"
                value={formatDuration(Math.round(stats.avgMttR))}
                icon={Clock}
                tone="warning"
              />
              <StatCard
                label="SLA Success"
                value={`${stats.slaSuccess.toFixed(1)}%`}
                icon={ShieldCheck}
                tone="success"
              />
              <StatCard
                label="Longest Case"
                value={formatDuration(stats.maxDur)}
                icon={TrendingUp}
                tone="destructive"
              />
            </div>

            <SectionCard
              title="Duration Trend"
              subtitle="Average net handling duration per month, segmented by NCAL."
              padding={false}
            >
              <div className="h-[400px] p-4 md:p-6">
                <ChartContainer config={chartConfig} className="h-full w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={duration} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <defs>
                        {NCAL_ORDER.map((ncal) => (
                          <linearGradient key={`fill-${ncal}`} id={`fill-${ncal}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartConfig[ncal].color} stopOpacity={0.7} />
                            <stop offset="95%" stopColor={chartConfig[ncal].color} stopOpacity={0.08} />
                          </linearGradient>
                        ))}
                      </defs>

                      <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />

                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tickMargin={12}
                        minTickGap={24}
                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                        tickFormatter={(value) => (value ? value.slice(0, 3) : '')}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickMargin={12}
                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                        width={74}
                        tickFormatter={(value) => formatDuration(value)}
                      />

                      <ChartTooltip
                        content={(
                          <ChartTooltipContent
                            config={chartConfig}
                            labelFormatter={(value) => String(value || '').toUpperCase()}
                            valueFormatter={(value) => formatDuration(Number(value || 0))}
                          />
                        )}
                      />

                      {NCAL_ORDER.map((ncal) => (
                        <Area
                          key={ncal}
                          dataKey={ncal}
                          type="natural"
                          fill={`url(#fill-${ncal})`}
                          stroke={chartConfig[ncal].color}
                          strokeWidth={1.5}
                          animationDuration={700}
                        />
                      ))}

                      <ChartLegend content={<ChartLegendContent config={chartConfig} />} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </SectionCard>

            <div className="grid gap-6 xl:grid-cols-2">
              <SectionCard
                title="SLA Compliance"
                subtitle="Year-to-date SLA performance by NCAL segment."
                padding={false}
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Segment
                        </th>
                        <th className="w-24 px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Cases
                        </th>
                        <th className="w-36 px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Avg MTTR
                        </th>
                        <th className="w-40 px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Success
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sla.map((row) => {
                        const pct = row.total_cases ? Math.round((row.sla_met / row.total_cases) * 100) : 0;

                        return (
                          <tr key={row.ncal} className="border-b transition-colors hover:bg-muted/20">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="h-8 w-1 rounded-full"
                                  style={{ backgroundColor: chartConfig[row.ncal]?.color }}
                                />
                                <span className="text-sm font-medium text-foreground">
                                  {row.ncal}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center font-medium text-foreground">
                              {row.total_cases}
                            </td>
                            <td className="px-4 py-4 text-center font-mono text-sm text-primary">
                              {formatDuration(Math.round(row.avg_nett_seconds || 0))}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-end gap-3">
                                <div className="min-w-12 text-right">
                                  <p className={cn(
                                    'text-sm font-semibold',
                                    pct >= 85 ? 'text-success' : pct >= 70 ? 'text-warning' : 'text-destructive'
                                  )}>
                                    {pct}%
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDuration((row.sla_target_hours || 0) * 3600)} SLA
                                  </p>
                                </div>
                                <progress
                                  className={cn(
                                    'h-2 w-20 overflow-hidden rounded-full [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted',
                                    pct >= 85
                                      ? '[&::-moz-progress-bar]:bg-emerald-500 [&::-webkit-progress-value]:bg-emerald-500'
                                      : pct >= 70
                                        ? '[&::-moz-progress-bar]:bg-amber-500 [&::-webkit-progress-value]:bg-amber-500'
                                        : '[&::-moz-progress-bar]:bg-destructive [&::-webkit-progress-value]:bg-destructive'
                                  )}
                                  max={100}
                                  value={pct}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <SectionCard
                title="Technician Benchmark"
                subtitle="Handling load and duration performance across the top operators."
                padding={false}
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Technician
                        </th>
                        <th className="w-24 px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Load
                        </th>
                        <th className="w-36 px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Mean
                        </th>
                        <th className="w-32 px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Max
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {techPerf.slice(0, 10).map((row) => (
                        <tr key={row.technician} className="border-b transition-colors hover:bg-muted/20">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <UserCheck className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {row.technician}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Personnel ops
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center font-medium text-foreground">
                            {row.total_handled}
                          </td>
                          <td className="px-4 py-4 text-center font-mono text-sm text-primary">
                            {formatDuration(Math.round(row.avg_nett_seconds || 0))}
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-sm text-muted-foreground">
                            {formatDuration(row.max_nett)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>

            {duration.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/20 py-20">
                <Zap className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No duration data is available for the selected year.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
