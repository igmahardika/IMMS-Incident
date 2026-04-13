import React, { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import {
  Activity,
  Database,
  Filter,
  ShieldAlert,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { api } from '../utils/api.js';
import { MONTH_NAMES } from '../utils/constants.js';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  PageHeader,
  ResponsiveContainer,
  SectionCard,
  Select,
  Spinner,
} from '../components/ui/index.jsx';
import { cn } from '../lib/utils.js';

const PIE_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-info)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-destructive)',
  'var(--color-primary)',
];

const SEGMENT_STYLES = [
  {
    dot: 'bg-[var(--color-chart-1)]',
    text: 'text-[var(--color-chart-1)]',
    badge: 'bg-[color-mix(in_oklab,var(--color-chart-1)_14%,transparent)] text-[var(--color-chart-1)]',
    accent: 'accent-[var(--color-chart-1)]',
  },
  {
    dot: 'bg-[var(--color-chart-2)]',
    text: 'text-[var(--color-chart-2)]',
    badge: 'bg-[color-mix(in_oklab,var(--color-chart-2)_14%,transparent)] text-[var(--color-chart-2)]',
    accent: 'accent-[var(--color-chart-2)]',
  },
  {
    dot: 'bg-[var(--color-chart-3)]',
    text: 'text-[var(--color-chart-3)]',
    badge: 'bg-[color-mix(in_oklab,var(--color-chart-3)_14%,transparent)] text-[var(--color-chart-3)]',
    accent: 'accent-[var(--color-chart-3)]',
  },
  {
    dot: 'bg-[var(--color-chart-4)]',
    text: 'text-[var(--color-chart-4)]',
    badge: 'bg-[color-mix(in_oklab,var(--color-chart-4)_16%,transparent)] text-[var(--color-chart-4)]',
    accent: 'accent-[var(--color-chart-4)]',
  },
  {
    dot: 'bg-[var(--color-chart-5)]',
    text: 'text-[var(--color-chart-5)]',
    badge: 'bg-[color-mix(in_oklab,var(--color-chart-5)_14%,transparent)] text-[var(--color-chart-5)]',
    accent: 'accent-[var(--color-chart-5)]',
  },
  {
    dot: 'bg-info',
    text: 'text-info',
    badge: 'bg-info/10 text-info',
    accent: 'accent-[var(--color-info)]',
  },
  {
    dot: 'bg-success',
    text: 'text-success',
    badge: 'bg-success/10 text-success',
    accent: 'accent-[var(--color-success)]',
  },
  {
    dot: 'bg-warning',
    text: 'text-warning',
    badge: 'bg-warning/10 text-warning',
    accent: 'accent-[var(--color-warning)]',
  },
  {
    dot: 'bg-destructive',
    text: 'text-destructive',
    badge: 'bg-destructive/10 text-destructive',
    accent: 'accent-[var(--color-destructive)]',
  },
  {
    dot: 'bg-primary',
    text: 'text-primary',
    badge: 'bg-primary/10 text-primary',
    accent: 'accent-primary',
  },
];

const NCAL_OPTIONS = ['', 'BLACK', 'RED', 'ORANGE', 'YELLOW', 'BLUE'];
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, index) => currentYear - index);

function StatCard({ label, value, meta, icon, tone = 'default' }) {
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
          {meta ? (
            <p className="text-xs text-muted-foreground">
              {meta}
            </p>
          ) : null}
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Icon className={cn('h-5 w-5', toneClassName[tone] || toneClassName.default)} />
        </div>
      </div>
    </div>
  );
}

export default function RootCausePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    year: String(currentYear),
    month: '',
    ncal: '',
  });

  const setFilter = (key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  useEffect(() => {
    setLoading(true);

    api.getRootCause({ ...filters })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.count, 0),
    [data]
  );

  const dominant = useMemo(() => {
    if (!data.length) return null;
    return data.reduce((current, next) => (current.count > next.count ? current : next));
  }, [data]);

  const topThreeShare = useMemo(() => {
    if (!total) return 0;
    return data
      .slice(0, 3)
      .reduce((sum, item) => sum + ((item.count / total) * 100), 0);
  }, [data, total]);

  const rootCauseConfig = useMemo(() => {
    const config = {};

    data.forEach((item, index) => {
      config[item.classification] = {
        label: item.classification,
        color: PIE_COLORS[index % PIE_COLORS.length],
      };
    });

    return config;
  }, [data]);

  const topSegments = useMemo(() => data.slice(0, 5), [data]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <PageHeader
        title="Root Cause Intelligence"
        subtitle="Inspect classification mix, dominant failure patterns, and their proportional share across archived incidents."
        action={(
          <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto">
            <Select
              aria-label="Filter by year"
              value={filters.year}
              onChange={(event) => setFilter('year', event.target.value)}
              className="min-w-[132px]"
              wrapperClassName="gap-1"
              label="Year"
            >
              {YEAR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Filter by month"
              value={filters.month}
              onChange={(event) => setFilter('month', event.target.value)}
              className="min-w-[140px]"
              wrapperClassName="gap-1"
              label="Month"
            >
              <option value="">All Months</option>
              {MONTH_NAMES.map((month, index) => (
                <option key={month} value={String(index + 1).padStart(2, '0')}>
                  {month}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Filter by NCAL"
              value={filters.ncal}
              onChange={(event) => setFilter('ncal', event.target.value)}
              className="min-w-[140px]"
              wrapperClassName="gap-1"
              label="NCAL"
            >
              <option value="">All NCAL</option>
              {NCAL_OPTIONS.filter(Boolean).map((option) => (
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
                label="Analysed Incidents"
                value={total}
                meta={`${data.length} active classification buckets`}
                icon={Activity}
                tone="default"
              />
              <StatCard
                label="Dominant Failure"
                value={dominant?.classification || 'No data'}
                meta={dominant ? `${dominant.count} incidents in this class` : 'Awaiting classified archive data'}
                icon={ShieldAlert}
                tone="destructive"
              />
              <StatCard
                label="Top Three Share"
                value={`${topThreeShare.toFixed(1)}%`}
                meta="Combined contribution from the three largest classes"
                icon={TrendingUp}
                tone="success"
              />
              <StatCard
                label="Filter Scope"
                value={filters.ncal || 'All NCAL'}
                meta={filters.month ? `${MONTH_NAMES[Number.parseInt(filters.month, 10) - 1]} ${filters.year}` : `Full year ${filters.year}`}
                icon={Database}
                tone="warning"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
              <div className="space-y-6">
                <SectionCard
                  title="Classification Share"
                  subtitle="Pie composition of incident classifications after the current filter scope is applied."
                  padding={false}
                >
                  <div className="grid gap-6 p-6">
                    <div className="relative mx-auto h-[280px] w-full max-w-[280px]">
                      <ChartContainer config={rootCauseConfig} className="h-full w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data}
                              dataKey="count"
                              nameKey="classification"
                              innerRadius="66%"
                              outerRadius="92%"
                              stroke="var(--color-background)"
                              strokeWidth={4}
                              paddingAngle={2}
                              animationDuration={700}
                            >
                              {data.map((item, index) => (
                                <Cell
                                  key={item.classification}
                                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent config={rootCauseConfig} />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>

                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Total incidents
                        </p>
                        <p className="text-4xl font-semibold tracking-tight text-foreground">
                          {total}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {data.length} classifications observed
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {topSegments.map((item, index) => {
                        const share = total ? (item.count / total) * 100 : 0;
                        const segmentStyle = SEGMENT_STYLES[index % SEGMENT_STYLES.length];

                        return (
                          <div
                            key={item.classification}
                            className="rounded-lg border border-border bg-muted/20 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={cn('h-2.5 w-2.5 rounded-full', segmentStyle.dot)} />
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {item.classification}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {item.count} incidents recorded
                                </p>
                              </div>

                              <span className={cn(
                                'inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium',
                                segmentStyle.badge
                              )}>
                                {share.toFixed(1)}%
                              </span>
                            </div>

                            <progress
                              className={cn(
                                'mt-3 h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted',
                                segmentStyle.accent
                              )}
                              max={100}
                              value={share}
                            />
                          </div>
                        );
                      })}

                      {!topSegments.length ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center">
                          <Zap className="h-8 w-8 text-muted-foreground" />
                          <p className="mt-4 text-sm font-medium text-foreground">
                            No root cause data for this filter set
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Try a broader year, month, or NCAL scope.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </SectionCard>
              </div>

              <SectionCard
                title="Classification Registry"
                subtitle="Full ranking of classifications and their proportional share in the selected archive scope."
                padding={false}
                headerAction={(
                  <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" />
                    {data.length} segments
                  </div>
                )}
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="w-16 px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Classification
                        </th>
                        <th className="w-28 px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Incidents
                        </th>
                        <th className="w-48 px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Share
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, index) => {
                        const share = total ? (row.count / total) * 100 : 0;
                        const segmentStyle = SEGMENT_STYLES[index % SEGMENT_STYLES.length];

                        return (
                          <tr key={row.classification} className="border-b transition-colors hover:bg-muted/20">
                            <td className="px-4 py-4 text-sm font-medium text-muted-foreground">
                              {String(index + 1).padStart(2, '0')}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <span className={cn('h-2.5 w-2.5 rounded-full', segmentStyle.dot)} />
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-foreground">
                                    {row.classification}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Root cause class
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={cn('text-sm font-semibold', segmentStyle.text)}>
                                {row.count}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-end gap-3">
                                <progress
                                  className={cn(
                                    'h-2 w-24 overflow-hidden rounded-full [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted',
                                    segmentStyle.accent
                                  )}
                                  max={100}
                                  value={share}
                                />
                                <span className="w-14 text-right text-sm font-medium text-foreground">
                                  {share.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {!data.length ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <Zap className="h-8 w-8 text-muted-foreground" />
                              <p className="text-sm font-medium text-foreground">
                                No registry rows available
                              </p>
                              <p className="text-sm text-muted-foreground">
                                The selected filter combination did not return any incident classifications.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
