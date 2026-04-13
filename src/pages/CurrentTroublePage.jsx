import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Edit2,
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
  processTimeline,
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

function parseHistoryDetails(details) {
  const parts = (details || '').split(' | ');
  let cause = '';
  let action = '';
  let classificationId = '';

  parts.forEach((part) => {
    if (part.startsWith('Cause:') || part.startsWith('Penyebab:')) {
      cause = part.replace('Cause:', '').replace('Penyebab:', '').trim();
    }

    if (part.startsWith('Last Action:') || part.startsWith('Action Terakhir:')) {
      action = part.replace('Last Action:', '').replace('Action Terakhir:', '').trim();
    }

    if (part.startsWith('Classification ID:') || part.startsWith('Klasifikasi ID:')) {
      classificationId = part
        .replace('Classification ID:', '')
        .replace('Klasifikasi ID:', '')
        .trim();
    }
  });

  return {
    cause,
    action,
    classificationId,
  };
}

function IncidentSummaryCard({ incident }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const targetSeconds = getSLATarget(incident.ncal);
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - new Date(incident.start_time).getTime()) / 1000)
  );
  const percentUsed = Math.min(100, Math.max(0, Math.round((elapsedSeconds / targetSeconds) * 100)));
  const isDanger = percentUsed >= 80;

  return (
    <div className="space-y-5 rounded-xl border bg-muted/20 p-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <NcalBadge value={incident.ncal} />
          <StatusPill status={incident.status} />
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">
            {getIncidentDisplayName(incident)}
          </p>
          <p className="mt-1 font-mono text-xs text-primary">
            {incident.case_no}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-lg border bg-background p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            SLA Level
          </p>
          <LevelBadge
            level={calculateIncidentLevel(incident.start_time)}
            targetHours={targetSeconds / 3600}
          />
        </div>

        <div className="space-y-2 rounded-lg border bg-background p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Net Duration
          </p>
          <DurationBadge
            seconds={Math.max(0, elapsedSeconds - (incident.total_pause_duration_seconds || 0))}
            target={targetSeconds}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            SLA Consumption
          </p>
          <span
            className={cn(
              'text-xs font-medium',
              isDanger ? 'text-destructive' : 'text-primary'
            )}
          >
            {percentUsed}%
          </span>
        </div>

        <progress
          className={cn(
            'h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted',
            isDanger
              ? '[&::-moz-progress-bar]:bg-destructive [&::-webkit-progress-value]:bg-destructive'
              : '[&::-moz-progress-bar]:bg-primary [&::-webkit-progress-value]:bg-primary'
          )}
          max={100}
          value={percentUsed}
        />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{Math.round(targetSeconds / 3600)}h target</span>
          <span>{formatDateTime(incident.start_time)}</span>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border bg-background p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Current Timer
        </p>
        <div className="font-mono text-lg font-semibold tracking-tight text-foreground">
          <LiveTimer
            startIso={incident.start_time}
            pausedSec={incident.total_pause_duration_seconds}
            paused={incident.status === 'pending'}
            target={targetSeconds}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border bg-background p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Initial Problem
        </p>
        <p className="text-sm leading-6 text-foreground">
          {incident.initial_problem || 'No description provided.'}
        </p>
      </div>
    </div>
  );
}

function PauseModal({ open, onClose, onConfirm }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) {
      setReason('');
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm(reason);
    setReason('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pause Incident"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleConfirm} disabled={!reason.trim()}>
            Confirm Pause
          </Button>
        </>
      )}
    >
      <div className="space-y-5">
        <Textarea
          id="pause-reason"
          label="Reason for Pause"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Describe why the incident handling must be paused."
          description="This note will be written to the incident timeline and used as the official pause reason."
        />

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          Pausing an incident stops the active handling timer until the team resumes work.
        </div>
      </div>
    </Modal>
  );
}

function UpdateModal({ open, onClose, incident, onSaved }) {
  const [form, setForm] = useState({
    technician_id: '',
    root_cause: '',
    last_action: '',
    power_before: '',
    power_after: '',
    level_support: '',
  });
  const [users, setUsers] = useState([]);
  const [detailIncident, setDetailIncident] = useState(null);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    if (!open || !incident) {
      setDetailIncident(null);
      return undefined;
    }

    setForm({
      technician_id: incident.technician_id || '',
      root_cause: '',
      last_action: '',
      power_before: incident.power_before || '',
      power_after: incident.power_after || '',
      level_support: incident.level_support || '2',
    });

    api.getIncident(incident.id)
      .then((fullData) => {
        if (!mounted) return;
        setDetailIncident(fullData);
        setForm((previous) => ({
          ...previous,
          power_before: previous.power_before || fullData.power_before || '',
          power_after: previous.power_after || fullData.power_after || '',
        }));
      })
      .catch(() => {
        if (mounted) {
          setDetailIncident(incident);
        }
      });

    if (user?.role !== 'technician') {
      api.getUsers()
        .then((data) => {
          if (mounted) {
            setUsers(data);
          }
        })
        .catch((error) => {
          if (error.message !== 'Insufficient permissions') {
            console.error(error);
          }
        });
    }

    return () => {
      mounted = false;
    };
  }, [incident, open, user?.role]);

  const handleSave = async () => {
    if (!incident) return;

    setSaving(true);
    try {
      await api.updateIncident(incident.id, form);
      addToast('Incident updated successfully', 'success');
      onSaved();
      onClose();
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!incident) return null;

  const summaryIncident = detailIncident || incident;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Update Incident - ${incident.case_no}`}
      size="2xl"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleSave} isLoading={saving}>
            Save Changes
          </Button>
        </>
      )}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Handling Update
            </h3>
            <p className="text-sm text-muted-foreground">
              Record the latest field progress, technical findings, and current handling state.
            </p>
          </div>

          <div className="space-y-5 rounded-xl border bg-muted/20 p-5">
            {user?.role !== 'technician' ? (
              <Select
                id="technician"
                label="Assigned Technician"
                value={form.technician_id}
                onChange={(event) => setForm((previous) => ({ ...previous, technician_id: event.target.value }))}
              >
                <option value="">Unassigned</option>
                {users
                  .filter((account) => ['technician', 'noc', 'admin'].includes(account.role))
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
              </Select>
            ) : null}

            <Input
              id="root-cause"
              label="Root Cause Update"
              value={form.root_cause}
              onChange={(event) => setForm((previous) => ({ ...previous, root_cause: event.target.value }))}
              placeholder="Brief summary of the suspected or confirmed root cause."
            />

            <Textarea
              id="last-action"
              label="Technical Handling Notes"
              value={form.last_action}
              onChange={(event) => setForm((previous) => ({ ...previous, last_action: event.target.value }))}
              placeholder="Describe troubleshooting steps, vendor coordination, or field progress."
              className="min-h-[140px]"
            />

            {user?.role !== 'technician' && incident.ncal === 'YELLOW' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  id="power-before"
                  label="Optical RX (Initial)"
                  value={form.power_before}
                  onChange={(event) => setForm((previous) => ({ ...previous, power_before: event.target.value }))}
                  placeholder="-00.00 dBm"
                  className="font-mono"
                />
                <Input
                  id="power-after"
                  label="Optical RX (Current)"
                  value={form.power_after}
                  onChange={(event) => setForm((previous) => ({ ...previous, power_after: event.target.value }))}
                  placeholder="-00.00 dBm"
                  className="font-mono"
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <IncidentSummaryCard incident={summaryIncident} />

          <div className="space-y-4 rounded-xl border bg-muted/20 p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                Handling Timeline
              </h3>
              <p className="text-xs text-muted-foreground">
                Technical and system updates for the active incident.
              </p>
            </div>

            <div className="space-y-4">
              <div className="max-h-64 overflow-y-auto rounded-lg border bg-background p-3">
                <UnifiedTimeline
                  timeline={processTimeline(summaryIncident)}
                  filterType="technical"
                  isCompact
                />
              </div>

              <div className="max-h-40 overflow-y-auto rounded-lg border bg-background p-3">
                <UnifiedTimeline
                  timeline={processTimeline(summaryIncident)}
                  filterType="system"
                  isCompact
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function CloseModal({ open, onClose, incident, onClosed }) {
  const { addToast } = useToast();
  const [waktuOnline, setWaktuOnline] = useState(
    new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );
  const [rootCause, setRootCause] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedParent, setSelectedParent] = useState('');
  const [classificationId, setClassificationId] = useState('');
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!open || !incident) {
      return undefined;
    }

    setWaktuOnline(
      new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    );
    setRootCause('');
    setActionTaken('');
    setHistory([]);
    setClassificationId('');
    setSelectedParent('');

    api.getClassifications()
      .then((data) => {
        if (!mounted) return;
        setClasses(data);
        if (incident.classification_id) {
          const matched = data.find((item) => item.id === incident.classification_id);
          if (matched) {
            setSelectedParent(matched.klasifikasi);
          }
        }
      })
      .catch((error) => console.error('Error fetching classifications:', error));

    api.getIncident(incident.id)
      .then((fullIncident) => {
        if (!mounted) return;
        setRootCause(fullIncident.root_cause || '');
        setActionTaken(fullIncident.last_action || '');
        if (fullIncident.classification_id) {
          setClassificationId(String(fullIncident.classification_id));
        }
        const updates = (fullIncident.audit_logs || []).filter(
          (log) => log.action === 'UPDATE' && log.details
        );
        setHistory(updates);
      })
      .catch((error) => console.error('Error fetching incident history:', error));

    return () => {
      mounted = false;
    };
  }, [incident, open]);

  const uniqueParents = useMemo(
    () => [...new Set(classes.map((item) => item.klasifikasi))],
    [classes]
  );

  const selectFromHistory = useCallback((item) => {
    const parsed = parseHistoryDetails(item.details);

    if (parsed.cause) {
      setRootCause(parsed.cause);
    }

    if (parsed.action) {
      setActionTaken(parsed.action);
    }

    if (parsed.classificationId) {
      setClassificationId(parsed.classificationId);
      const matched = classes.find((entry) => String(entry.id) === String(parsed.classificationId));
      if (matched) {
        setSelectedParent(matched.klasifikasi);
      }
    }
  }, [classes]);

  const handleCloseIncident = async () => {
    if (!incident) return;

    try {
      if (!classificationId) {
        addToast('Please select a classification first', 'warning');
        return;
      }

      if (!actionTaken.trim()) {
        addToast('Please provide the final handling action', 'warning');
        return;
      }

      setSaving(true);
      await api.closeIncident(incident.id, {
        waktu_online: waktuOnline,
        root_cause: rootCause,
        last_action: actionTaken,
        classification_id: classificationId,
      });
      addToast('Incident successfully closed', 'success');
      onClosed();
      onClose();
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!incident) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Close Incident - ${incident.case_no}`}
      size="2xl"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleCloseIncident} isLoading={saving}>
            Close Incident
          </Button>
        </>
      )}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-muted/20 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Active Case
            </p>
            <p className="mt-2 font-mono text-sm text-primary">
              {incident.case_no}
            </p>
            <p className="mt-3 text-sm font-medium text-foreground">
              {getIncidentDisplayName(incident)}
            </p>
          </div>

          <div className="rounded-xl border bg-muted/20 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Severity & Status
              </p>
              <NcalBadge value={incident.ncal} />
            </div>
            <div className="mt-3">
              <StatusPill status={incident.status} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            id="root-category"
            label="Root Category"
            value={selectedParent}
            onChange={(event) => {
              setSelectedParent(event.target.value);
              setClassificationId('');
            }}
          >
            <option value="">Select category</option>
            {uniqueParents.map((parent) => (
              <option key={parent} value={parent}>
                {parent}
              </option>
            ))}
          </Select>

          <Select
            id="sub-classification"
            label="Sub Classification"
            value={classificationId}
            onChange={(event) => setClassificationId(event.target.value)}
            disabled={!selectedParent}
          >
            <option value="">Select detail</option>
            {classes
              .filter((item) => item.klasifikasi === selectedParent)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sub_klasifikasi}
                </option>
              ))}
          </Select>
        </div>

        <SectionCard
          title="Handling History"
          subtitle="Reuse the most recent update details if they match the final resolution."
          padding={false}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="w-14 px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    No
                  </th>
                  <th className="w-36 px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Cause
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No update history available.
                    </td>
                  </tr>
                ) : (
                  [...history].reverse().map((item, index) => {
                    const parsed = parseHistoryDetails(item.details);
                    const isSelected = rootCause === parsed.cause && actionTaken === parsed.action;

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          'cursor-pointer border-b transition-colors hover:bg-muted/30',
                          isSelected && 'bg-primary/5'
                        )}
                        onClick={() => selectFromHistory(item)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {formatDateTime(item.timestamp)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {parsed.cause || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {parsed.action || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="grid gap-4 md:grid-cols-2">
          <Textarea
            id="final-root-cause"
            label="Final Root Cause"
            value={rootCause}
            onChange={(event) => setRootCause(event.target.value)}
            placeholder="Summarize the confirmed root cause."
          />

          <Textarea
            id="final-action"
            label="Final Action Taken"
            value={actionTaken}
            onChange={(event) => setActionTaken(event.target.value)}
            placeholder="Describe the final resolution performed."
          />
        </div>

        <Input
          id="restore-time"
          type="datetime-local"
          label="Restore Time"
          value={waktuOnline}
          onChange={(event) => setWaktuOnline(event.target.value)}
          required
        />

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          The system will calculate downtime automatically from the incident start time and the restore time you submit here.
        </div>
      </div>
    </Modal>
  );
}

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
      className={cn('h-8 w-8', toneClassName[tone] || toneClassName.default)}
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
      size: 92,
      meta: { className: 'px-3' },
    },
    {
      accessorKey: 'case_no',
      header: 'Incident',
      cell: ({ row }) => (
        <div className="space-y-2">
          <button
            type="button"
            className="font-mono text-sm font-medium text-primary transition-colors hover:underline"
            onClick={() => navigate(`/incidents/${row.original.id}`)}
          >
            {row.original.case_no}
          </button>
          <StatusPill status={row.original.status} />
        </div>
      ),
      size: 128,
      meta: { className: 'whitespace-nowrap' },
    },
    {
      id: 'level',
      header: 'Level',
      cell: ({ row }) => (
        <LevelBadge
          level={calculateIncidentLevel(row.original.start_time)}
          targetHours={getSLATarget(row.original.ncal) / 3600}
        />
      ),
      size: 98,
      meta: { className: 'px-2 text-center' },
    },
    {
      id: 'infrastructure',
      header: 'Infrastructure',
      cell: ({ row }) => {
        const incident = row.original;
        const displayName = getIncidentDisplayName(incident);

        return (
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium text-foreground" title={displayName}>
              {displayName}
            </p>
            <p className="truncate font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {incident.odp_bts || incident.service_id || '—'}
            </p>
          </div>
        );
      },
      size: 280,
      meta: { flexible: true },
    },
    {
      id: 'logs',
      header: 'Current Logs',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-2">
          <p className="line-clamp-2 text-sm text-foreground">
            {row.original.initial_problem || '—'}
          </p>
          {row.original.last_action ? (
            <div className="inline-flex max-w-full items-center gap-2 rounded-md bg-primary/5 px-2.5 py-1 text-xs text-primary">
              <Activity className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{row.original.last_action}</span>
            </div>
          ) : null}
        </div>
      ),
      size: 320,
      meta: { flexible: true },
    },
    {
      id: 'downtime',
      header: 'Downtime',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-mono text-sm font-medium text-foreground">
            <LiveTimer
              startIso={row.original.start_time}
              pausedSec={row.original.total_pause_duration_seconds}
              paused={row.original.status === 'pending'}
              target={getSLATarget(row.original.ncal)}
            />
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {formatDateTime(row.original.start_time)}
          </p>
        </div>
      ),
      size: 148,
      meta: { className: 'px-3 whitespace-nowrap' },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const incident = row.original;
        const canManage = ['admin', 'noc'].includes(user?.role);

        return (
          <div className="flex items-center justify-end gap-1">
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
      size: 148,
      meta: { className: 'px-3 text-right' },
    },
  ], [handleResume, handleStart, navigate, user?.role]);

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden">
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
