import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  PauseCircle,
  Plus,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { api } from '../utils/api.js';
import { cn } from '../lib/utils.js';
import { NCAL_ORDER, MONTH_NAMES } from '../utils/constants.js';
import {
  calculateIncidentLevel,
  formatDuration,
  getIncidentDisplayName,
  getSLATarget,
} from '../utils/incidentUtils.js';
import {
  Button,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  LevelBadge,
  LiveTimer,
  NcalBadge,
  PageHeader,
  PageSpinner,
  ResponsiveContainer,
  SectionCard,
  StatusPill,
} from '../components/ui/index.jsx';

const CURRENT_YEAR = new Date().getFullYear();

const chartConfig = {
  BLACK: { label: 'BLACK', color: 'var(--color-ncal-black)' },
  RED: { label: 'RED', color: 'var(--color-ncal-red)' },
  ORANGE: { label: 'ORANGE', color: 'var(--color-ncal-orange)' },
  YELLOW: { label: 'YELLOW', color: 'var(--color-ncal-yellow)' },
  BLUE: { label: 'BLUE', color: 'var(--color-ncal-blue)' },
};

const statusTone = {
  open: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
  progress: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
};
const EMPTY_LIST = [];

function MissionMetricCard({ label, value, hint, icon, tone = 'default' }) {
  const toneClassName = {
    default: 'bg-muted text-foreground',
    danger: 'bg-destructive/10 text-destructive',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    info: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>

        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', toneClassName[tone])}>
          {React.createElement(icon, { className: 'h-4.5 w-4.5' })}
        </div>
      </div>
    </div>
  );
}

function NcalPressureCard({ ncal, value, total }) {
  const progress = total ? Math.round((value / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <NcalBadge value={ncal} />
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Active</span>
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${total ? Math.max(6, progress) : 0}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{progress}% of active queue</p>
      </div>
    </div>
  );
}

function SignalRow({ label, value, hint, barClassName, progress }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', barClassName)}
          style={{ width: `${Math.max(6, Math.min(progress, 100))}%` }}
        />
      </div>
    </div>
  );
}

function QueueRow({ incident, onOpen }) {
  const targetSeconds = incident.targetSeconds || getSLATarget(incident.ncal);
  const progress = incident.progress || 0;
  const level = calculateIncidentLevel(incident.start_time);

  return (
    <button
      type="button"
      onClick={() => onOpen(incident.id)}
      className="grid w-full grid-cols-1 gap-4 rounded-xl border border-border bg-background px-4 py-4 text-left shadow-sm transition-colors hover:bg-muted/40 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.35fr)_240px]"
    >
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <NcalBadge value={incident.ncal} />
          <StatusPill status={incident.status} />
          <span className={cn('inline-flex rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-[0.12em]', statusTone[incident.status] || 'bg-muted text-muted-foreground')}>
            {incident.case_no}
          </span>
        </div>

        <div className="space-y-1">
          <p className="truncate text-base font-semibold tracking-tight text-foreground">
            {getIncidentDisplayName(incident)}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {incident.company_name || incident.brand_site || incident.odp_bts || 'Unlabeled incident scope'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{incident.technician_name || 'Unassigned operator'}</span>
          <span>•</span>
          <span>{incident.initial_problem || 'No problem statement'}</span>
        </div>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Current handling</p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-foreground">
            {incident.last_action || incident.root_cause || incident.indikasi || 'No handling update yet.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <LevelBadge level={level} targetHours={Math.ceil(targetSeconds / 3600)} />
          {incident.recurring_count > 0 ? (
            <span className="rounded-md bg-destructive/10 px-2 py-1 font-medium text-destructive">
              Recurring +{incident.recurring_count}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Live timer</p>
            <LiveTimer
              startIso={incident.start_time}
              pausedSec={incident.total_pause_duration_seconds || 0}
              paused={incident.status === 'pending'}
              target={targetSeconds}
            />
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">SLA exposure</p>
            <p className="text-sm font-semibold text-foreground">{progress}%</p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full',
                progress >= 100
                  ? 'bg-destructive'
                  : progress >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              )}
              style={{ width: `${Math.max(8, progress)}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}

function CompactIncidentRow({ incident, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(incident.id)}
      className="flex w-full items-start justify-between gap-3 rounded-lg border border-transparent px-3 py-3 text-left transition-colors hover:border-border hover:bg-muted/30"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <NcalBadge value={incident.ncal} />
          <p className="font-mono text-xs font-medium text-primary">{incident.case_no}</p>
        </div>
        <p className="truncate text-sm font-medium text-foreground">{getIncidentDisplayName(incident)}</p>
        <p className="text-xs text-muted-foreground">{incident.technician_name || 'Unassigned operator'}</p>
      </div>

      <LiveTimer
        startIso={incident.start_time}
        pausedSec={incident.total_pause_duration_seconds || 0}
        paused={incident.status === 'pending'}
        target={getSLATarget(incident.ncal)}
      />
    </button>
  );
}

function WatchlistRow({ incident, onOpen, meta }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(incident.id)}
      className="flex w-full items-start justify-between gap-3 rounded-lg border border-transparent px-3 py-3 text-left transition-colors hover:border-border hover:bg-muted/30"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <NcalBadge value={incident.ncal} />
          <p className="font-mono text-xs font-medium text-primary">{incident.case_no}</p>
        </div>
        <p className="truncate text-sm font-medium text-foreground">{getIncidentDisplayName(incident)}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>

      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    data: queryData,
    isLoading,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['incidents', 'dashboard', CURRENT_YEAR],
    refetchInterval: 30000,
    queryFn: async () => {
      const [dashboardData, slaData, durationData, activeIncidents, rootCauseData, technicianData] = await Promise.all([
        api.getDashboard(),
        api.getSla({ year: CURRENT_YEAR }),
        api.getDuration({ year: CURRENT_YEAR }),
        api.getIncidents(),
        api.getRootCause({ year: CURRENT_YEAR }),
        api.getTechPerf({ year: CURRENT_YEAR }),
      ]);

      const months = {};
      durationData.forEach((row) => {
        const month = Number.parseInt(row.month, 10);
        if (!month) return;

        if (!months[month]) {
          months[month] = { month: MONTH_NAMES[month - 1] };
        }

        months[month][row.ncal] = Math.round(row.avg_nett_seconds || 0);
      });

      return {
        dashboard: dashboardData,
        activeIncidents,
        rootCause: rootCauseData,
        technicianPerf: technicianData,
        sla: slaData,
        duration: Object.values(months).sort(
          (left, right) => MONTH_NAMES.indexOf(left.month) - MONTH_NAMES.indexOf(right.month)
        ),
        snapshotTime: Date.now(),
      };
    },
  });

  const dashboard = queryData?.dashboard || {};
  const activeIncidents = queryData?.activeIncidents ?? EMPTY_LIST;
  const rootCause = queryData?.rootCause ?? EMPTY_LIST;
  const technicianPerf = queryData?.technicianPerf ?? EMPTY_LIST;
  const sla = queryData?.sla ?? EMPTY_LIST;
  const duration = queryData?.duration ?? EMPTY_LIST;
  const snapshotTime = queryData?.snapshotTime ?? dataUpdatedAt ?? 0;

  const derived = useMemo(() => {
    const activeByNcal = Object.fromEntries((dashboard.activeByNcal || []).map((row) => [row.ncal, row.count]));
    const activeByStatus = Object.fromEntries((dashboard.activeByStatus || []).map((row) => [row.status, row.count]));

    const enriched = activeIncidents.map((incident) => {
      const targetSeconds = getSLATarget(incident.ncal);
      const elapsedGross = Math.max(
        0,
        Math.floor((snapshotTime - new Date(incident.start_time).getTime()) / 1000)
      );
      const elapsedNet = Math.max(0, elapsedGross - (incident.total_pause_duration_seconds || 0));
      const progress = targetSeconds ? Math.round((elapsedNet / targetSeconds) * 100) : 0;

      return {
        ...incident,
        targetSeconds,
        elapsedNet,
        progress,
      };
    });

    const monitored = [...enriched].sort((left, right) => {
      if (right.progress !== left.progress) return right.progress - left.progress;
      return new Date(left.start_time).getTime() - new Date(right.start_time).getTime();
    });

    const atRisk = monitored.filter((incident) => incident.progress >= 80).length;
    const paused = monitored.filter((incident) => incident.status === 'pending').length;
    const openedToday = monitored.filter((incident) => {
      const createdAt = new Date(incident.created_at || incident.start_time);
      const snapshot = new Date(snapshotTime);
      return (
        createdAt.getFullYear() === snapshot.getFullYear() &&
        createdAt.getMonth() === snapshot.getMonth() &&
        createdAt.getDate() === snapshot.getDate()
      );
    });
    const unassigned = monitored.filter((incident) => !incident.technician_id);
    const pausedItems = monitored.filter((incident) => incident.status === 'pending');
    const rootCauseTop = rootCause.slice(0, 5);
    const technicianTop = technicianPerf.slice(0, 5);
    const avgActiveMinutes = monitored.length
      ? Math.round(monitored.reduce((sum, incident) => sum + incident.elapsedNet, 0) / monitored.length / 60)
      : 0;
    const topPressureEntry = NCAL_ORDER
      .map((ncal) => ({ ncal, value: activeByNcal[ncal] || 0 }))
      .sort((left, right) => right.value - left.value)[0];

    return {
      activeByNcal,
      activeByStatus,
      monitored,
      atRisk,
      paused,
      openedToday,
      unassigned,
      pausedItems,
      rootCauseTop,
      technicianTop,
      avgActiveMinutes,
      topPressureEntry,
    };
  }, [activeIncidents, dashboard.activeByNcal, dashboard.activeByStatus, rootCause, snapshotTime, technicianPerf]);

  if (isLoading) {
    return <PageSpinner />;
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden">
      <PageHeader
        title="Operations Command Center"
        subtitle="Realtime incident monitoring, service risk awareness, and decision-support analytics across the full IMMS workspace."
        action={(
          <>
            <Button variant="outline" onClick={() => navigate('/incidents')}>
              Open Active Troubles
            </Button>
            <Button variant="default" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/incidents/create')}>
              Create Incident
            </Button>
          </>
        )}
      />

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-6">
        <SectionCard
          title="Realtime Overview"
          subtitle={`Live operational state across the active queue. Last refreshed ${snapshotTime ? new Date(snapshotTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}.`}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {NCAL_ORDER.map((ncal) => (
              <NcalPressureCard
                key={ncal}
                ncal={ncal}
                value={derived.activeByNcal[ncal] || 0}
                total={dashboard.totalActive || 0}
              />
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MissionMetricCard
              label="Active Queue"
              value={dashboard.totalActive || 0}
              hint={`${dashboard.unassignedActive || 0} currently unassigned`}
              icon={Activity}
              tone="danger"
            />
            <MissionMetricCard
              label="Paused Cases"
              value={derived.paused}
              hint="Incidents waiting for external dependency or hold"
              icon={PauseCircle}
              tone="warning"
            />
            <MissionMetricCard
              label="SLA At Risk"
              value={derived.atRisk}
              hint="Active incidents above 80% of SLA target"
              icon={ShieldAlert}
              tone="danger"
            />
            <MissionMetricCard
              label="Resolved Today"
              value={dashboard.resolvedToday || 0}
              hint={`${dashboard.totalDone || 0} total incidents closed`}
              icon={CheckCircle2}
              tone="success"
            />
            <MissionMetricCard
              label="Average Active Age"
              value={`${derived.avgActiveMinutes}m`}
              hint={`${dashboard.createdToday || 0} incidents opened today`}
              icon={Clock3}
              tone="info"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background px-4 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Opened Today</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{derived.openedToday.length}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background px-4 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Needs Owner</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{derived.unassigned.length}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <UserRound className="h-4.5 w-4.5" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background px-4 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Top NCAL Pressure</p>
                  <div className="mt-2 flex items-center gap-2">
                    <NcalBadge value={derived.topPressureEntry?.ncal || 'BLUE'} />
                    <span className="text-2xl font-semibold tracking-tight text-foreground">
                      {derived.topPressureEntry?.value || 0}
                    </span>
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                  <ShieldAlert className="h-4.5 w-4.5" />
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-12">
          <SectionCard title="New Queue Today" subtitle="Incidents created today that require active monitoring." className="xl:col-span-4">
            <div className="space-y-1">
              {derived.openedToday.length === 0 ? (
                <p className="text-sm text-muted-foreground">No new incidents have been opened today.</p>
              ) : (
                derived.openedToday.slice(0, 6).map((incident) => (
                  <WatchlistRow
                    key={`opened-${incident.id}`}
                    incident={incident}
                    onOpen={(id) => navigate(`/incidents/${id}`)}
                    meta={`Created ${incident.created_at ? new Date(incident.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'} • ${incident.technician_name || 'Unassigned operator'}`}
                  />
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Paused Watchlist" subtitle="Cases currently on hold and waiting for next operational action." className="xl:col-span-4">
            <div className="space-y-1">
              {derived.pausedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No incidents are paused right now.</p>
              ) : (
                derived.pausedItems.slice(0, 6).map((incident) => (
                  <WatchlistRow
                    key={`paused-${incident.id}`}
                    incident={incident}
                    onOpen={(id) => navigate(`/incidents/${id}`)}
                    meta={`${incident.technician_name || 'Unassigned operator'} • ${incident.last_action || incident.root_cause || 'Awaiting follow-up update'}`}
                  />
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Needs Immediate Assignment" subtitle="Open incidents with no technician or owner assigned yet." className="xl:col-span-4">
            <div className="space-y-1">
              {derived.unassigned.length === 0 ? (
                <p className="text-sm text-muted-foreground">All active incidents already have an assigned owner.</p>
              ) : (
                derived.unassigned.slice(0, 6).map((incident) => (
                  <WatchlistRow
                    key={`unassigned-${incident.id}`}
                    incident={incident}
                    onOpen={(id) => navigate(`/incidents/${id}`)}
                    meta={`${incident.initial_problem || 'No problem statement'} • opened ${incident.start_time ? new Date(incident.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}`}
                  />
                ))
              )}
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Command Signals" subtitle="The most important live indicators for queue health and ownership.">
            <div className="space-y-5">
              <SignalRow
                label="In Progress"
                hint="Active handling underway"
                value={derived.activeByStatus.progress || 0}
                progress={dashboard.totalActive ? ((derived.activeByStatus.progress || 0) / dashboard.totalActive) * 100 : 0}
                barClassName="bg-emerald-500"
              />
              <SignalRow
                label="Open / Awaiting Start"
                hint="Created but not yet actively handled"
                value={derived.activeByStatus.open || 0}
                progress={dashboard.totalActive ? ((derived.activeByStatus.open || 0) / dashboard.totalActive) * 100 : 0}
                barClassName="bg-sky-500"
              />
              <SignalRow
                label="Paused"
                hint="Queue items on hold"
                value={derived.activeByStatus.pending || 0}
                progress={dashboard.totalActive ? ((derived.activeByStatus.pending || 0) / dashboard.totalActive) * 100 : 0}
                barClassName="bg-amber-500"
              />
              <SignalRow
                label="Unassigned"
                hint="Requires immediate ownership"
                value={dashboard.unassignedActive || 0}
                progress={dashboard.totalActive ? ((dashboard.unassignedActive || 0) / dashboard.totalActive) * 100 : 0}
                barClassName="bg-destructive"
              />
            </div>
          </SectionCard>

          <SectionCard title="NCAL Pressure" subtitle="Active queue concentration by NCAL severity.">
            <div className="space-y-4">
              {NCAL_ORDER.map((ncal) => (
                <div key={ncal} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <NcalBadge value={ncal} />
                      <span className="text-sm text-muted-foreground">active incidents</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{derived.activeByNcal[ncal] || 0}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${dashboard.totalActive ? Math.max(6, ((derived.activeByNcal[ncal] || 0) / dashboard.totalActive) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="grid items-stretch gap-6 xl:grid-cols-12">
          <SectionCard
            title="Resolution Trend"
            subtitle={`Average net resolution duration per month in ${CURRENT_YEAR}`}
            padding={false}
            className="h-full xl:col-span-7"
          >
            <div className="flex min-h-[420px] flex-1 p-4 md:p-6">
              <ChartContainer config={chartConfig} className="h-full w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={duration} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      {NCAL_ORDER.map((ncal) => (
                        <linearGradient key={`dashboard-fill-${ncal}`} id={`dashboard-fill-${ncal}`} x1="0" y1="0" x2="0" y2="1">
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
                      tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                      tickMargin={12}
                      minTickGap={24}
                      tickFormatter={(value) => (value ? value.slice(0, 3) : '')}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                      tickMargin={12}
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
                    <ChartLegend content={<ChartLegendContent config={chartConfig} />} />
                    {NCAL_ORDER.map((ncal) => (
                      <Area
                        key={ncal}
                        type="natural"
                        dataKey={ncal}
                        fill={`url(#dashboard-fill-${ncal})`}
                        stroke={chartConfig[ncal].color}
                        strokeWidth={1.5}
                        animationDuration={700}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Recent Resolutions"
            subtitle="The latest incidents closed by the operations team."
            padding={false}
            className="h-full xl:col-span-5"
            footer={(
              <Button variant="outline" className="w-full" onClick={() => navigate('/history')}>
                View Resolved Incidents
              </Button>
            )}
          >
            <div className="p-3">
              {(dashboard.recentClosed || []).length === 0 ? (
                <div className="flex min-h-[300px] items-center justify-center text-center text-sm text-muted-foreground">
                  No resolved incidents yet.
                </div>
              ) : (
                <div className="space-y-1">
                  {(dashboard.recentClosed || []).map((incident) => (
                    <CompactIncidentRow key={incident.id} incident={incident} onOpen={(id) => navigate(`/incidents/${id}`)} />
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <SectionCard title="Root Cause Snapshot" subtitle="Top classifications contributing to closed incidents this year." className="xl:col-span-4">
            <div className="space-y-3">
              {derived.rootCauseTop.length === 0 ? (
                <p className="text-sm text-muted-foreground">No root cause data available for this period.</p>
              ) : (
                derived.rootCauseTop.map((item, index) => (
                  <div key={`${item.classification}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.classification}</p>
                      <p className="text-xs text-muted-foreground">Closed incident count</p>
                    </div>
                    <span className="text-lg font-semibold tracking-tight text-foreground">{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Technician Throughput" subtitle="Highest handled incident volume across resolved work." className="xl:col-span-4">
            <div className="space-y-3">
              {derived.technicianTop.length === 0 ? (
                <p className="text-sm text-muted-foreground">No technician throughput data available for this period.</p>
              ) : (
                derived.technicianTop.map((row, index) => (
                  <div key={`${row.technician}-${index}`} className="rounded-lg border border-border bg-background px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-muted-foreground" />
                          <p className="truncate text-sm font-medium text-foreground">{row.technician}</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Average net duration {formatDuration(Math.round(row.avg_nett_seconds || 0))}
                        </p>
                      </div>
                      <span className="text-lg font-semibold tracking-tight text-foreground">{row.total_handled}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="SLA Compliance" subtitle="Year-to-date adherence by NCAL segment." className="xl:col-span-4">
            <div className="space-y-3">
              {sla.length === 0 ? (
                <p className="text-sm text-muted-foreground">No SLA data available for this period.</p>
              ) : (
                sla.map((row) => {
                  const percent = row.total_cases ? Math.round((row.sla_met / row.total_cases) * 100) : 0;

                  return (
                    <div key={row.ncal} className="rounded-lg border border-border bg-background px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <NcalBadge value={row.ncal} />
                          <span className="text-xs text-muted-foreground">{row.total_cases} cases</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{percent}%</span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            percent >= 85 ? 'bg-emerald-500' : percent >= 60 ? 'bg-amber-500' : 'bg-destructive'
                          )}
                          style={{ width: `${Math.max(6, percent)}%` }}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{row.sla_met || 0} within SLA</span>
                        <span className="font-mono">{formatDuration(Math.round(row.avg_nett_seconds || 0))}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
