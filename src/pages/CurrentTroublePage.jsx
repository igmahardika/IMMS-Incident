import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  History,
  Pause,
  Play,
  Plus,
  Square,
} from 'lucide-react';
import { api } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { cn } from '../lib/utils.js';
import {
  calculateIncidentLevel,
  formatDateTime,
  getIncidentDisplayName,
  getSLATarget,
  isIncidentOpenStatus,
} from '../utils/incidentUtils.js';
import {
  Button,
  DurationBadge,
  EmptyState,
  Input,
  LevelBadge,
  LiveTimer,
  Modal,
  NcalBadge,
  PageHeader,
  PageSpinner,
  SectionCard,
  Select,
  StatusPill,
  Textarea,
  UnifiedTimeline,
} from '../components/ui/index.jsx';
import { DataTable } from '../components/tables/DataTable.jsx';
import PauseModal from './current-trouble/PauseModal.jsx';
import UpdateModal from './current-trouble/UpdateModal.jsx';
import CloseModal from './current-trouble/CloseModal.jsx';

const NCAL_FILTER_STYLES = {
  BLACK: {
    active: 'border-foreground bg-foreground text-background',
    badge: 'bg-background/20 text-inherit',
    dot: 'bg-foreground',
  },
  RED: {
    active: 'border-destructive bg-destructive text-destructive-foreground',
    badge: 'bg-black/10 text-inherit',
    dot: 'bg-destructive',
  },
  ORANGE: {
    active: 'border-amber-500 bg-amber-500 text-white',
    badge: 'bg-black/10 text-inherit',
    dot: 'bg-amber-500',
  },
  YELLOW: {
    active: 'border-yellow-500 bg-yellow-500 text-black',
    badge: 'bg-black/10 text-inherit',
    dot: 'bg-yellow-500',
  },
  BLUE: {
    active: 'border-blue-500 bg-blue-500 text-white',
    badge: 'bg-black/10 text-inherit',
    dot: 'bg-blue-500',
  },
};

// Extracted helpers and modals live under ./current-trouble/*

function TableActionButton({ label, icon, onClick, tone = 'default' }) {
  const Icon = icon;

  const toneClassName = {
    default: 'text-muted-foreground hover:text-foreground hover:bg-accent',
    success: 'text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300',
    warning: 'text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300',
    destructive: 'text-destructive hover:bg-destructive/10 hover:text-destructive',
    primary: 'text-primary hover:bg-primary/10 hover:text-primary',
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('rounded-md', toneClassName[tone] || toneClassName.default)}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

export default function CurrentTroublePage() {
  const { data: incidents = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => api.getIncidents(),
  });

  const [alertedIds, setAlertedIds] = useState(new Set());
  const [highlightedIds, setHighlightedIds] = useState(new Set());
  const [ncalFilter, setNcalFilter] = useState(null);
  const [pauseModal, setPauseModal] = useState(null);
  const [updateModal, setUpdateModal] = useState(null);
  const [closeModal, setCloseModal] = useState(null);
  const prevDataRef = useRef([]);
  const { addToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (incidents.length > 0 && prevDataRef.current.length > 0) {
      const changed = incidents.filter((incident) => {
        const previous = prevDataRef.current.find((item) => item.id === incident.id);
        if (!previous) return true;
        return previous.status !== incident.status || previous.last_action !== incident.last_action;
      });

      if (changed.length > 0) {
        const changedIds = new Set(changed.map((incident) => incident.id));
        setHighlightedIds((previous) => new Set([...previous, ...changedIds]));

        const timeoutId = window.setTimeout(() => {
          setHighlightedIds((previous) => {
            const next = new Set(previous);
            changedIds.forEach((id) => next.delete(id));
            return next;
          });
        }, 5000);

        prevDataRef.current = incidents;
        return () => window.clearTimeout(timeoutId);
      }
    }

    prevDataRef.current = incidents;
    return undefined;
  }, [incidents]);

  useEffect(() => {
    incidents.forEach((incident) => {
      if (isIncidentOpenStatus(incident.status)) {
        const target = getSLATarget(incident.ncal);
        const start = new Date(incident.start_time).getTime();
        const elapsed = Math.floor((Date.now() - start) / 1000);
        if (elapsed > target && !alertedIds.has(incident.id)) {
          addToast(`CRITICAL: SLA Exceeded for ${incident.case_no} (${incident.ncal})`, 'error');
          setAlertedIds((previous) => new Set([...previous, incident.id]));
        }
      }
    });
  }, [addToast, alertedIds, incidents]);

  const handleStart = useCallback(async (id) => {
    try {
      await api.startAction(id);
      addToast('Action started!', 'success');
      refetch();
    } catch (error) {
      addToast(error.message, 'error');
    }
  }, [addToast, refetch]);

  const handlePause = useCallback(async (incident, reason) => {
    try {
      await api.pauseIncident(incident.id, { reason });
      addToast('Incident paused', 'warning');
      setPauseModal(null);
      refetch();
    } catch (error) {
      addToast(error.message, 'error');
    }
  }, [addToast, refetch]);

  const handleResume = useCallback(async (id) => {
    try {
      await api.resumeIncident(id);
      addToast('Incident resumed', 'success');
      refetch();
    } catch (error) {
      addToast(error.message, 'error');
    }
  }, [addToast, refetch]);

  const filteredIncidents = useMemo(
    () => (ncalFilter ? incidents.filter((incident) => incident.ncal === ncalFilter) : incidents),
    [incidents, ncalFilter]
  );

  const countsByNcal = useMemo(() => {
    const counts = {};
    incidents.forEach((incident) => {
      counts[incident.ncal] = (counts[incident.ncal] || 0) + 1;
    });
    return counts;
  }, [incidents]);

  const columns = useMemo(() => [
    {
      accessorKey: 'ncal',
      header: 'NCAL',
      cell: ({ row }) => <NcalBadge value={row.original.ncal} />,
      size: 96,
      meta: { className: 'px-4' },
    },
    {
      accessorKey: 'case_no',
      header: 'Incident',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-2">
          <button
            type="button"
            className="block font-mono text-sm font-semibold text-foreground transition-colors hover:text-primary"
            onClick={() => navigate(`/incidents/${row.original.id}`)}
          >
            {row.original.case_no}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={row.original.status} />
          </div>
        </div>
      ),
      size: 156,
      meta: { className: 'whitespace-nowrap' },
    },
    {
      id: 'level',
      header: 'Level',
      cell: ({ row }) => (
        <div className="pt-0.5">
          <LevelBadge
            level={calculateIncidentLevel(row.original.start_time)}
            targetHours={getSLATarget(row.original.ncal) / 3600}
          />
        </div>
      ),
      size: 106,
      meta: { className: 'px-3' },
    },
    {
      id: 'infrastructure',
      header: 'Infrastructure',
      cell: ({ row }) => {
        const incident = row.original;
        const displayName = getIncidentDisplayName(incident);

        return (
          <div className="min-w-0 space-y-1.5">
            <p
              className="line-clamp-2 text-sm font-semibold leading-5 text-foreground"
              title={displayName}
            >
              {displayName}
            </p>
            <p
              className="line-clamp-1 text-xs text-muted-foreground"
              title={incident.odp_bts || incident.service_id || 'No infrastructure code'}
            >
              {incident.odp_bts || incident.service_id || '—'}
            </p>
          </div>
        );
      },
      size: 320,
      meta: { flexible: true },
    },
    {
      id: 'logs',
      header: 'Current Logs',
      cell: ({ row }) => {
        const incident = row.original;
        const headline = incident.last_action || incident.initial_problem || 'No active update yet.';
        const supporting = incident.last_action && incident.initial_problem !== incident.last_action
          ? incident.initial_problem
          : `Started ${formatDateTime(incident.start_time)}`;

        return (
          <div className="min-w-0 space-y-2">
            <p className="line-clamp-2 text-sm font-medium leading-5 text-foreground" title={headline}>
              {headline}
            </p>
            <div className="flex min-w-0 items-start gap-2 text-xs text-muted-foreground">
              <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2" title={supporting}>
                {supporting}
              </span>
            </div>
          </div>
        );
      },
      size: 360,
      meta: { flexible: true },
    },
    {
      id: 'downtime',
      header: 'Downtime',
      cell: ({ row }) => (
        <div className="space-y-2">
          <div className="font-mono text-sm font-semibold text-foreground">
            <LiveTimer
              startIso={row.original.start_time}
              pausedSec={row.original.total_pause_duration_seconds}
              paused={row.original.status === 'pending'}
              target={getSLATarget(row.original.ncal)}
            />
          </div>
          <div className="space-y-1">
            <StatusPill status={row.original.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(row.original.start_time)}
          </p>
        </div>
      ),
      size: 164,
      meta: { className: 'px-4 whitespace-nowrap' },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const incident = row.original;
        const canManage = ['admin', 'noc'].includes(user?.role);

        return (
          <div className="flex items-center justify-end gap-1.5">
            {incident.status === 'open' ? (
              <TableActionButton
                label="Start"
                icon={Play}
                onClick={() => handleStart(incident.id)}
                tone="success"
              />
            ) : null}

            {incident.status === 'progress' && canManage ? (
              <TableActionButton
                label="Pause"
                icon={Pause}
                onClick={() => setPauseModal(incident)}
                tone="warning"
              />
            ) : null}

            {incident.status === 'pending' && canManage ? (
              <TableActionButton
                label="Resume"
                icon={Play}
                onClick={() => handleResume(incident.id)}
                tone="success"
              />
            ) : null}

            <TableActionButton
              label="Update"
              icon={Edit2}
              onClick={() => setUpdateModal(incident)}
              tone="primary"
            />

            {canManage ? (
              <TableActionButton
                label="Close"
                icon={Square}
                onClick={() => setCloseModal(incident)}
                tone="destructive"
              />
            ) : null}
          </div>
        );
      },
      size: 176,
      meta: { className: 'px-3 text-right' },
    },
  ], [handleResume, handleStart, navigate, user?.role]);

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <PageHeader
        title="Active Incident Queue"
        subtitle={`Monitor ${incidents.length} live incident${incidents.length === 1 ? '' : 's'}, track SLA pressure, and update handling activity in real time.`}
        action={user?.role !== 'technician' ? (
          <Button
            variant="default"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/incidents/create')}
          >
            Create Incident
          </Button>
        ) : null}
      />

      <SectionCard padding={false} className="flex min-h-0 flex-1 flex-col">
        {incidents.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
            title="No active incidents"
            desc="The monitoring board is clear. New incidents will appear here as soon as they are created."
            action={['admin', 'noc'].includes(user?.role) ? (
              <Button
                variant="outline"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/incidents/create')}
              >
                Create Incident
              </Button>
            ) : null}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-col gap-4 border-b bg-muted/20 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Button
                  variant={!ncalFilter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNcalFilter(null)}
                >
                  All Segments
                </Button>

                {['BLACK', 'RED', 'ORANGE', 'YELLOW', 'BLUE'].map((ncal) => {
                  const count = countsByNcal[ncal] || 0;
                  const active = ncalFilter === ncal;
                  if (!count && !active) return null;

                  return (
                    <button
                      key={ncal}
                      type="button"
                      onClick={() => setNcalFilter(ncal)}
                      className={cn(
                        'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors',
                        active
                          ? NCAL_FILTER_STYLES[ncal].active
                          : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full',
                          active ? 'bg-current' : NCAL_FILTER_STYLES[ncal].dot
                        )}
                      />
                      <span>{ncal}</span>
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-xs',
                          active ? NCAL_FILTER_STYLES[ncal].badge : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-destructive/20 ring-1 ring-destructive/20" />
                  SLA breach
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary/20 ring-1 ring-primary/20" />
                  Recent update
                </div>
              </div>
            </div>

            <DataTable
              columns={columns}
              data={filteredIncidents}
              className="flex-1"
              pageSize={100}
              getRowClassName={(row) => {
                const isHighlighted = highlightedIds.has(row.id);
                const target = getSLATarget(row.ncal);
                const elapsed = Math.floor((Date.now() - new Date(row.start_time).getTime()) / 1000);
                const isSlaBreached = isIncidentOpenStatus(row.status) && elapsed > target;

                if (isHighlighted) {
                  return 'bg-primary/5 shadow-[inset_3px_0_0_0_var(--color-primary)]';
                }

                if (isSlaBreached) {
                  return 'bg-destructive/5 shadow-[inset_3px_0_0_0_var(--color-destructive)]';
                }

                return 'hover:bg-muted/20';
              }}
            />
          </div>
        )}
      </SectionCard>

      <PauseModal
        open={Boolean(pauseModal)}
        onClose={() => setPauseModal(null)}
        onConfirm={(reason) => handlePause(pauseModal, reason)}
      />
      <UpdateModal
        open={Boolean(updateModal)}
        onClose={() => setUpdateModal(null)}
        incident={updateModal}
        onSaved={refetch}
      />
      <CloseModal
        open={Boolean(closeModal)}
        onClose={() => setCloseModal(null)}
        incident={closeModal}
        onClosed={refetch}
      />
    </div>
  );
}
