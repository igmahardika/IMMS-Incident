import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Edit2,
  Info,
  MapPin,
  Shield,
} from 'lucide-react';
import { useIncident } from '../hooks/useIncidents.js';
import {
  calculateIncidentLevel,
  formatDateTime,
  getIncidentDisplayName,
  normalizeInfrastructureLabel,
  getSLATarget,
  processTimeline,
} from '../utils/incidentUtils.js';
import {
  Button,
  DurationBadge,
  EmptyState,
  LevelBadge,
  NcalBadge,
  PageHeader,
  PageSpinner,
  SectionCard,
  StatusPill,
  UnifiedTimeline,
} from '../components/ui/index.jsx';
import { cn } from '../lib/utils.js';

function DetailItem({ label, value, icon: Icon, mono = false, className = '' }) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          'text-sm font-medium leading-6 text-foreground',
          mono && 'font-mono',
          className
        )}
      >
        {value || '—'}
      </div>
    </div>
  );
}

function MetricItem({ label, value }) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="min-h-5 text-sm font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

function TextPanel({ label, value, emptyText = 'No information available.', tone = 'default' }) {
  const toneClassName = {
    default: 'bg-muted/20 text-foreground',
    primary: 'bg-primary/5 text-foreground border-primary/10',
    destructive: 'bg-destructive/5 text-destructive border-destructive/10',
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div
        className={cn(
          'min-h-[88px] rounded-lg border p-4 text-sm leading-6',
          toneClassName[tone] || toneClassName.default
        )}
      >
        {value || emptyText}
      </div>
    </div>
  );
}

export default function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: incident, isLoading: loading } = useIncident(id);

  if (loading) {
    return <PageSpinner />;
  }

  if (!incident) {
    return (
      <EmptyState
        title="Incident not found"
        desc="The requested incident record could not be loaded or no longer exists."
        action={(
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        )}
      />
    );
  }

  const isDistribusi = ['ORANGE', 'RED', 'BLACK'].includes(incident.ncal);
  const timeline = processTimeline(incident);
  const targetHours = getSLATarget(incident.ncal) / 3600;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <PageHeader
        title={incident.case_no}
        subtitle="Review asset metadata, duration metrics, activity timeline, and final resolution details for this incident."
        action={(
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
            <Button
              icon={<Edit2 className="h-4 w-4" />}
              onClick={() => navigate(`/incidents/edit/${incident.id}`)}
            >
              Edit Incident
            </Button>
          </div>
        )}
      />

      <div className="flex-1 overflow-y-auto pb-6">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_380px]">
          <div className="space-y-6">
            <SectionCard
              title="Incident Overview"
              subtitle="Current state, severity, and core infrastructure identity."
            >
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={incident.status} />
                  <LevelBadge
                    level={calculateIncidentLevel(incident.start_time, incident.end_time)}
                    targetHours={targetHours}
                  />
                  <NcalBadge value={incident.ncal} />
                </div>

                <div className="grid items-stretch gap-6 md:grid-cols-2">
                  <DetailItem
                    label={isDistribusi ? 'Distribution Node' : 'Site Name'}
                    value={getIncidentDisplayName(incident)}
                    icon={MapPin}
                  />
                  <DetailItem
                    label={incident.ncal === 'BLUE' ? 'Device ID' : 'Infrastructure'}
                    value={normalizeInfrastructureLabel(incident.odp_bts, incident.ncal) || '—'}
                    icon={Shield}
                  />
                  <DetailItem
                    label="Priority Level"
                    value={incident.level_support ? `P${incident.level_support}` : '—'}
                    icon={Info}
                  />
                  <DetailItem
                    label="Assigned Operator"
                    value={incident.pic || incident.technician_name || incident.technician_name_manual || '—'}
                    icon={Activity}
                  />
                </div>

                {incident.address || incident.koordinat ? (
                  <div className="grid items-stretch gap-6 md:grid-cols-2">
                    {incident.address ? (
                      <DetailItem
                        label="Site Address"
                        value={incident.address}
                        icon={MapPin}
                      />
                    ) : null}
                    {incident.koordinat ? (
                      <DetailItem
                        label="Coordinates"
                        value={incident.koordinat}
                        icon={MapPin}
                        mono
                        className="text-primary"
                      />
                    ) : null}
                  </div>
                ) : null}

                <div className="grid items-stretch gap-6 md:grid-cols-2">
                  <TextPanel
                    label="Problem Statement"
                    value={incident.initial_problem}
                    emptyText="No problem statement provided."
                  />
                  <TextPanel
                    label="Indication / Findings"
                    value={incident.indikasi}
                    emptyText="No indication recorded."
                  />
                </div>
              </div>
            </SectionCard>

            {incident.ncal === 'YELLOW' ? (
              <SectionCard
                title="Maintenance Specification"
                subtitle="Technical maintenance metadata captured for yellow incidents."
              >
                <div className="grid items-stretch gap-6 md:grid-cols-3">
                  <DetailItem label="Cable Medium" value={incident.kabel || '—'} />
                  <DetailItem
                    label="Span Distance"
                    value={incident.panjang_kabel ? `${incident.panjang_kabel} m` : '—'}
                    mono
                    className="text-warning"
                  />
                  <DetailItem
                    label="Initial Power"
                    value={incident.power_before || '—'}
                    mono
                  />
                </div>
              </SectionCard>
            ) : null}

            <SectionCard
              title="Performance Metrics"
              subtitle="Timeline checkpoints and downtime calculations for this incident."
            >
              <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
                <MetricItem label="Reported Time" value={incident.start_time ? formatDateTime(incident.start_time) : '—'} />
                <MetricItem label="Action Start" value={incident.start_action_time ? formatDateTime(incident.start_action_time) : '—'} />
                <MetricItem label="Resolution Time" value={incident.end_time ? formatDateTime(incident.end_time) : '—'} />
                <MetricItem label="Total Pause" value={<DurationBadge seconds={incident.total_pause_duration_seconds} />} />
                <MetricItem label="Gross Duration" value={<DurationBadge seconds={incident.duration_gross_seconds} />} />
                <MetricItem
                  label="Net Duration"
                  value={(
                    <DurationBadge
                      seconds={incident.duration_nett_seconds}
                      target={getSLATarget(incident.ncal)}
                    />
                  )}
                />
              </div>
            </SectionCard>

            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard
                title="Technical Timeline"
                subtitle="Field activities and handling progression."
                padding={false}
              >
                <div className="min-h-[320px] p-3">
                  <UnifiedTimeline timeline={timeline} filterType="technical" />
                </div>
              </SectionCard>

              <SectionCard
                title="System Timeline"
                subtitle="Audit and system-generated events."
                padding={false}
              >
                <div className="min-h-[320px] p-3">
                  <UnifiedTimeline timeline={timeline} filterType="system" />
                </div>
              </SectionCard>
            </div>
          </div>

          <div className="space-y-6 xl:sticky xl:top-6">
            <SectionCard
              title="Resolution Summary"
              subtitle="Root cause, final handling action, and classification result."
            >
              <div className="space-y-5">
                <TextPanel
                  label="Root Cause"
                  value={incident.root_cause}
                  emptyText="Investigation is still in progress."
                />

                <TextPanel
                  label="Final Handling Action"
                  value={incident.last_action}
                  emptyText="No final handling action documented."
                  tone="primary"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailItem
                    label="Power (Initial)"
                    value={incident.power_before || '—'}
                    mono
                    className="text-primary"
                  />
                  <DetailItem
                    label="Power (Final)"
                    value={incident.power_after || '—'}
                    mono
                    className="text-success"
                  />
                </div>

                <div className="rounded-lg border border-primary/10 bg-primary/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                    Classification
                  </p>
                  {incident.klasifikasi ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        {incident.klasifikasi}
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {incident.sub_klasifikasi}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      This incident has not been classified yet.
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>

            {incident.customer_terdampak && isDistribusi ? (
              <SectionCard
                title="Customer Impact"
                subtitle="Accounts or entities affected by this distribution incident."
              >
                <div className="rounded-lg border border-destructive/10 bg-destructive/5 p-4 text-sm leading-6 text-destructive whitespace-pre-wrap">
                  {incident.customer_terdampak}
                </div>
              </SectionCard>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
