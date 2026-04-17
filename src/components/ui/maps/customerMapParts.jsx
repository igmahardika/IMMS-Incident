import React from 'react';
import { AlertCircle } from 'lucide-react';
import { formatDateTime } from '../../../utils/incidentUtils.js';
import { SectionCard } from '../index.jsx';
import { ReportReasonList, StatChip } from './MapShared.jsx';

export const SEMARANG_CENTER = [-7.0051, 110.4381];
export const PROVINCE_COLORS = {
  'Jawa Tengah': '#4f46e5',
  'Jawa Barat': '#059669',
  'Jawa Timur': '#d97706',
  'DKI Jakarta': '#dc2626',
  Banten: '#7c3aed',
  Others: '#64748b',
};

export function CustomerGeocodeReportCard({ report }) {
  if (!report) return null;

  const provinceItems = (report.provinceBreakdown || []).slice(0, 4).map((item) => ({
    label: item.province,
    value: item.count,
  }));
  const sampleItems = (report.samples || []).slice(0, 3).map((item) => ({
    label: item.brand_site || item.company_name || item.city || `Customer #${item.id}`,
    value: item.reason === 'ready_to_sync'
      ? 'Ready'
      : item.reason === 'cached_miss'
        ? 'Previously failed'
        : 'Needs address',
  }));

  return (
    <SectionCard
      title="Sync Health"
      subtitle="Map readiness for customer coordinates."
      className="min-w-[320px] shadow-lg"
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatChip label="Mapped" value={report.mapped} />
          <StatChip label="Ready To Sync" value={report.readyToSync ?? report.addressReady} />
          <StatChip label="Previous Misses" value={report.cachedMiss || 0} />
          <StatChip label="Missing Address" value={report.missingAddress} />
          <StatChip label="Unmapped Total" value={report.missing} />
        </div>

        <ReportReasonList title="Highest Missing Provinces" items={provinceItems} />
        <ReportReasonList title="Recent Unmapped Samples" items={sampleItems} />
      </div>
    </SectionCard>
  );
}

export function CustomerPopup({ customer }) {
  return (
    <div className="min-w-[240px] space-y-4 p-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {customer.brand_site || 'Unlabeled site'}
          </p>
          <span className="rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {customer.grade || 'N/A'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{customer.company_name || 'Unknown customer'}</p>
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Service ID</span>
          <span className="font-medium text-foreground">{customer.service_id || '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">City</span>
          <span className="font-medium text-foreground">{customer.city || '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Province</span>
          <span className="font-medium text-foreground">{customer.province || '—'}</span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Address</p>
        <p className="text-sm leading-6 text-foreground">{customer.address || 'No address available'}</p>
      </div>
    </div>
  );
}

export function CustomerTroublePopup({ trouble }) {
  return (
    <div className="min-w-[240px] space-y-4 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
        </div>

        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {trouble.brand_site || 'Cluster node'}
          </p>
          <p className="text-xs text-muted-foreground">{trouble.company_name || 'Customer location'}</p>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Incident frequency</span>
          <span className="font-semibold text-destructive">{trouble.incident_count}x</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Last incident</span>
          <span className="font-medium text-foreground">
            {trouble.last_incident_at ? formatDateTime(trouble.last_incident_at) : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function getBubbleColor(count) {
  if (count > 10) return '#ef4444';
  if (count > 5) return '#f97316';
  return '#eab308';
}
