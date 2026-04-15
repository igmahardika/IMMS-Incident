import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { cn } from '../../lib/utils.js';
import { formatDateTime, getIncidentDisplayName } from '../../utils/incidentUtils.js';
import {
  Button,
  Input,
  Modal,
  NcalBadge,
  SectionCard,
  Select,
  StatusPill,
  Textarea,
} from '../../components/ui/index.jsx';
import { parseHistoryDetails } from './historyDetails.js';

export default function CloseModal({ open, onClose, incident, onClosed }) {
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
        const updates = (fullIncident.audit_logs || []).filter((log) => log.action === 'UPDATE' && log.details);
        setHistory(updates);
      })
      .catch((error) => console.error('Error fetching incident history:', error));

    return () => {
      mounted = false;
    };
  }, [incident, open]);

  const uniqueParents = useMemo(() => [...new Set(classes.map((item) => item.klasifikasi))], [classes]);

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
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Active Case</p>
            <p className="mt-2 font-mono text-sm text-primary">{incident.case_no}</p>
            <p className="mt-3 text-sm font-medium text-foreground">{getIncidentDisplayName(incident)}</p>
          </div>

          <div className="rounded-xl border bg-muted/20 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Severity & Status</p>
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
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{index + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {formatDateTime(item.timestamp)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{parsed.cause || '-'}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{parsed.action || '-'}</td>
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

