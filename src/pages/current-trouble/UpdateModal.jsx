import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';

import { api } from '../../utils/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { cn } from '../../lib/utils.js';
import { formatDateTime, processTimeline } from '../../utils/incidentUtils.js';
import {
  Button,
  Input,
  Modal,
  SectionCard,
  Select,
  Textarea,
  UnifiedTimeline,
} from '../../components/ui/index.jsx';
import IncidentSummaryCard from './IncidentSummaryCard.jsx';
import { parseHistoryDetails } from './historyDetails.js';

export default function UpdateModal({ open, onClose, incident, onSaved }) {
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
  const handlingHistory = (summaryIncident.audit_logs || []).filter(
    (log) => log.action === 'UPDATE' && log.details
  );
  const latestHandlingHistory = handlingHistory.slice(0, 6);
  const latestTechnicalTimeline = processTimeline(summaryIncident)
    .filter((item) => item.type === 'technical')
    .slice(0, 8);
  const latestSystemTimeline = processTimeline(summaryIncident)
    .filter((item) => item.type === 'system')
    .slice(0, 8);

  const applyHistoryToForm = (item) => {
    const parsed = parseHistoryDetails(item.details);
    setForm((previous) => ({
      ...previous,
      root_cause: parsed.cause || previous.root_cause,
      last_action: parsed.action || previous.last_action,
    }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Update Incident - ${incident.case_no}`}
      size="3xl"
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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.95fr)]">
        <div className="space-y-6">
          <SectionCard title="Handling Update">
            <div className="space-y-5">
              {user?.role !== 'technician' ? (
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <Select
                    id="technician"
                    label="Assigned Technician"
                    value={form.technician_id}
                    onChange={(event) => setForm((previous) => ({ ...previous, technician_id: event.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {users
                      .filter((account) => ['technician', 'noc'].includes(account.role))
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                  </Select>

                  <Input
                    id="support-level"
                    label="Support Level"
                    value={form.level_support}
                    onChange={(event) => setForm((previous) => ({ ...previous, level_support: event.target.value }))}
                    placeholder="2"
                  />
                </div>
              ) : null}

              <Textarea
                id="root-cause"
                label="Root Cause"
                value={form.root_cause}
                onChange={(event) => setForm((previous) => ({ ...previous, root_cause: event.target.value }))}
                placeholder="Write the current or confirmed cause."
                className="min-h-[96px]"
              />

              <Textarea
                id="last-action"
                label="Latest Handling Update"
                value={form.last_action}
                onChange={(event) => setForm((previous) => ({ ...previous, last_action: event.target.value }))}
                placeholder="Write the latest field progress."
                className="min-h-[180px]"
              />

              {user?.role !== 'technician' && incident.ncal === 'YELLOW' ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    id="power-before"
                    label="Optical RX Before"
                    value={form.power_before}
                    onChange={(event) => setForm((previous) => ({ ...previous, power_before: event.target.value }))}
                    placeholder="-00.00 dBm"
                    className="font-mono"
                  />
                  <Input
                    id="power-after"
                    label="Optical RX Current"
                    value={form.power_after}
                    onChange={(event) => setForm((previous) => ({ ...previous, power_after: event.target.value }))}
                    placeholder="-00.00 dBm"
                    className="font-mono"
                  />
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Previous Handling Updates"
            headerAction={(
              <div className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {handlingHistory.length} update{handlingHistory.length === 1 ? '' : 's'}
              </div>
            )}
          >
            {latestHandlingHistory.length > 0 ? (
              <div className="space-y-3">
                {latestHandlingHistory.map((entry) => {
                  const parsed = parseHistoryDetails(entry.details);
                  const hasCause = Boolean(parsed.cause);
                  const hasAction = Boolean(parsed.action);
                  const isApplied =
                    (parsed.cause && parsed.cause === form.root_cause) ||
                    (parsed.action && parsed.action === form.last_action);

                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        'rounded-lg border p-4 transition-colors',
                        isApplied ? 'border-primary bg-primary/5' : 'bg-background'
                      )}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 space-y-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-medium text-foreground">
                              <History className="h-3.5 w-3.5" />
                              Update Log
                            </span>
                            <span>{entry.user_name || 'System User'}</span>
                            <span className="hidden h-1 w-1 rounded-full bg-border md:block" />
                            <span>{formatDateTime(entry.timestamp)}</span>
                          </div>

                          {hasCause ? (
                            <div className="space-y-1">
                              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                Root Cause
                              </p>
                              <p className="text-sm font-medium leading-6 text-foreground">{parsed.cause}</p>
                            </div>
                          ) : null}

                          {hasAction ? (
                            <div className="space-y-1">
                              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                Handling Note
                              </p>
                              <p className="text-sm leading-6 text-foreground">{parsed.action}</p>
                            </div>
                          ) : null}

                          {!hasCause && !hasAction ? (
                            <p className="text-sm text-muted-foreground">No reusable details.</p>
                          ) : null}
                        </div>

                        <Button
                          variant={isApplied ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => applyHistoryToForm(entry)}
                          disabled={!hasCause && !hasAction}
                        >
                          {isApplied ? 'Applied' : 'Use This Update'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
                No previous technical update is available for this incident yet.
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <IncidentSummaryCard incident={summaryIncident} />

          <SectionCard title="Recent Technical Timeline" padding={false}>
            <div className="max-h-[300px] overflow-y-auto px-4 py-4">
              {latestTechnicalTimeline.length > 0 ? (
                <UnifiedTimeline timeline={latestTechnicalTimeline} filterType="technical" isCompact />
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                  No technical activity has been recorded yet.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="System Activity" padding={false}>
            <div className="max-h-[220px] overflow-y-auto px-4 py-4">
              {latestSystemTimeline.length > 0 ? (
                <UnifiedTimeline timeline={latestSystemTimeline} filterType="system" isCompact />
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                  No system activity is available for this incident.
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </Modal>
  );
}

