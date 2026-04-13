import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Plus, TrendingUp } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../utils/api.js';
import { cn } from '../lib/utils.js';
import { NCAL_ORDER, MONTH_NAMES } from '../utils/constants.js';
import { formatDuration, getIncidentDisplayName } from '../utils/incidentUtils.js';
import {
  Button,
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
  NcalBadge,
  PageHeader,
  PageSpinner,
  ResponsiveContainer,
  SectionCard,
} from '../components/ui/index.jsx';

const chartConfig = {
  BLACK: { label: 'BLACK', color: 'var(--color-primary)' },
  RED: { label: 'RED', color: 'var(--color-error)' },
  ORANGE: { label: 'ORANGE', color: 'var(--color-warning)' },
  YELLOW: { label: 'YELLOW', color: 'var(--color-info)' },
  BLUE: { label: 'BLUE', color: 'var(--color-success)' },
};

const CURRENT_YEAR = new Date().getFullYear();

const KPI_ACCENTS = {
  totalActive: {
    icon: AlertTriangle,
    label: 'Open Queue',
    valueClassName: 'text-destructive',
    iconClassName: 'text-destructive/70',
  },
  totalDone: {
    icon: CheckCircle2,
    label: 'Resolved',
    valueClassName: 'text-emerald-600 dark:text-emerald-400',
    iconClassName: 'text-emerald-600/70 dark:text-emerald-400/70',
  },
};

const NCAL_KPI_STYLES = {
  BLACK: {
    dotClassName: 'bg-foreground/70',
    valueClassName: 'text-foreground',
  },
  RED: {
    dotClassName: 'bg-destructive',
    valueClassName: 'text-destructive',
  },
  ORANGE: {
    dotClassName: 'bg-amber-500',
    valueClassName: 'text-amber-600 dark:text-amber-400',
  },
  YELLOW: {
    dotClassName: 'bg-yellow-500',
    valueClassName: 'text-yellow-600 dark:text-yellow-400',
  },
  BLUE: {
    dotClassName: 'bg-blue-500',
    valueClassName: 'text-blue-600 dark:text-blue-400',
  },
};

function MetricCard({ icon, label, value, valueClassName, iconClassName }) {
  const Icon = icon;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {label}
          </p>
          <p className={cn('text-3xl font-semibold tracking-tight', valueClassName)}>
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Icon className={cn('h-5 w-5', iconClassName)} />
        </div>
      </div>
    </div>
  );
}

function NcalMetricCard({ ncal, value }) {
  const styles = NCAL_KPI_STYLES[ncal];

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          {ncal}
        </p>
        <span className={cn('h-2.5 w-2.5 rounded-full', styles.dotClassName)} />
      </div>

      <p className={cn('mt-3 text-3xl font-semibold tracking-tight', styles.valueClassName)}>
        {value}
      </p>
    </div>
  );
}

function ComplianceProgress({ percent }) {
  const valueClassName = percent >= 85
    ? 'text-emerald-600 dark:text-emerald-400'
    : percent >= 60
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-destructive';

  const progressClassName = percent >= 85
    ? '[&::-moz-progress-bar]:bg-emerald-500 [&::-webkit-progress-value]:bg-emerald-500'
    : percent >= 60
      ? '[&::-moz-progress-bar]:bg-amber-500 [&::-webkit-progress-value]:bg-amber-500'
      : '[&::-moz-progress-bar]:bg-destructive [&::-webkit-progress-value]:bg-destructive';

  return (
    <div className="flex items-center justify-end gap-3">
      <div className="min-w-12 text-right">
        <p className={cn('text-sm font-semibold tracking-tight', valueClassName)}>
          {percent}%
        </p>
        <p className="text-xs text-muted-foreground">
          compliance
        </p>
      </div>

      <progress
        className={cn(
          'h-2 w-28 overflow-hidden rounded-full [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full',
          progressClassName
        )}
        max={100}
        value={percent}
      />
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: qData, isLoading: loading } = useQuery({
    queryKey: ['incidents', 'dashboard', CURRENT_YEAR],
    queryFn: async () => {
      const [dashboardData, slaData, durationData] = await Promise.all([
        api.getDashboard(),
        api.getSla({ year: CURRENT_YEAR }),
        api.getDuration({ year: CURRENT_YEAR }),
      ]);

      const months = {};
      durationData.forEach((row) => {
        const month = Number.parseInt(row.month, 10);
        if (!months[month]) {
          months[month] = { month: MONTH_NAMES[month - 1] };
        }
        months[month][row.ncal] = Math.round((row.avg_nett_seconds || 0) / 60);
      });

      return {
        data: dashboardData,
        sla: slaData,
        duration: Object.values(months).sort(
          (a, b) => MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month)
        ),
      };
    },
  });

  const data = qData?.data || null;
  const sla = qData?.sla || [];
  const duration = qData?.duration || [];

  if (loading) {
    return <PageSpinner />;
  }

  const byNcal = {};
  (data?.activeByNcal || []).forEach((row) => {
    byNcal[row.ncal] = row.count;
  });

  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden">
      <PageHeader
        title="Network Operations Dashboard"
        subtitle="Monitor live incident volume, average resolution duration, and SLA compliance across all service segments."
        action={(
          <Button
            variant="default"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/incidents/create')}
          >
            Create Incident
          </Button>
        )}
      />

      <div className="flex-1 space-y-6 overflow-y-auto pb-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
          <MetricCard
            icon={KPI_ACCENTS.totalActive.icon}
            label={KPI_ACCENTS.totalActive.label}
            value={data?.totalActive || 0}
            valueClassName={KPI_ACCENTS.totalActive.valueClassName}
            iconClassName={KPI_ACCENTS.totalActive.iconClassName}
          />

          <MetricCard
            icon={KPI_ACCENTS.totalDone.icon}
            label={KPI_ACCENTS.totalDone.label}
            value={data?.totalDone || 0}
            valueClassName={KPI_ACCENTS.totalDone.valueClassName}
            iconClassName={KPI_ACCENTS.totalDone.iconClassName}
          />

          {NCAL_ORDER.map((ncal) => (
            <NcalMetricCard key={ncal} ncal={ncal} value={byNcal[ncal] || 0} />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-4">
          <SectionCard
            title="Resolution Trend"
            subtitle={`Average net resolution duration per month in ${CURRENT_YEAR}`}
            padding={false}
            className="xl:col-span-3"
          >
            <div className="h-[380px] p-4 md:p-6">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={duration} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                      tickMargin={12}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                      tickMargin={12}
                      width={48}
                    />
                    <Tooltip content={<ChartTooltipContent config={chartConfig} />} />
                    <Legend content={<ChartLegendContent config={chartConfig} />} />
                    {NCAL_ORDER.map((ncal) => (
                      <Line
                        key={ncal}
                        type="monotone"
                        dataKey={ncal}
                        stroke={chartConfig[ncal].color}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4, stroke: 'var(--color-background)', strokeWidth: 2 }}
                        connectNulls
                        animationDuration={700}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Recent Resolutions"
            subtitle="Five most recently closed incidents"
            padding={false}
            className="xl:col-span-1"
            footer={(
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/history')}
              >
                View All History
              </Button>
            )}
          >
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b">
                    <th className="w-20 px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      NCAL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Incident
                    </th>
                    <th className="w-28 px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentClosed || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-16 text-center text-sm text-muted-foreground">
                        No resolved incidents yet.
                      </td>
                    </tr>
                  ) : (
                    (data?.recentClosed || []).map((incident) => (
                      <tr
                        key={incident.id}
                        className="cursor-pointer border-b transition-colors hover:bg-muted/40"
                        onClick={() => navigate(`/incidents/${incident.id}`)}
                      >
                        <td className="px-4 py-4 align-top">
                          <NcalBadge value={incident.ncal} />
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1">
                            <p className="font-mono text-xs font-medium text-primary">
                              {incident.case_no}
                            </p>
                            <p className="line-clamp-2 text-sm font-medium text-foreground">
                              {getIncidentDisplayName(incident)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {incident.technician_name || 'NOC'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right align-top">
                          <p className="font-mono text-sm font-medium text-foreground">
                            {formatDuration(incident.duration_nett_seconds)}
                          </p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="SLA Compliance"
          subtitle="Year-to-date adherence by NCAL segment"
          padding={false}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="w-36 px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Segment
                  </th>
                  <th className="w-28 px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Cases
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Average Net Duration
                  </th>
                  <th className="w-28 px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    SLA Met
                  </th>
                  <th className="w-52 px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Compliance
                  </th>
                </tr>
              </thead>
              <tbody>
                {sla.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center text-sm text-muted-foreground">
                      No SLA data available for this period.
                    </td>
                  </tr>
                ) : (
                  sla.map((row) => {
                    const percent = row.total_cases
                      ? Math.round((row.sla_met / row.total_cases) * 100)
                      : 0;

                    return (
                      <tr key={row.ncal} className="border-b transition-colors hover:bg-muted/30">
                        <td className="px-4 py-4">
                          <NcalBadge value={row.ncal} />
                        </td>
                        <td className="px-4 py-4 text-center font-medium text-foreground">
                          {row.total_cases}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">
                              {formatDuration(Math.round(row.avg_nett_seconds || 0))}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-medium text-foreground">
                          {row.sla_met || 0}
                        </td>
                        <td className="px-4 py-4">
                          <ComplianceProgress percent={percent} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
