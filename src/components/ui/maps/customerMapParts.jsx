import React from 'react';
import { AlertCircle, MapPin, Radar, TrendingUp } from 'lucide-react';
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
      className="shadow-none"
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

export function CustomerTroubleSummaryCard({ troublePoints = [] }) {
  const cityCounts = troublePoints.reduce((accumulator, item) => {
    const city = item.city || 'Unknown';
    accumulator[city] = (accumulator[city] || 0) + 1;
    return accumulator;
  }, {});

  const sortedCities = Object.entries(cityCounts).sort((left, right) => right[1] - left[1]);
  const totalIncidents = troublePoints.reduce((sum, item) => sum + Number(item.incident_count || 0), 0);

  return (
    <SectionCard
      title="Incident Geography"
      subtitle="Archive trouble clusters based on customer locations in the selected date range."
      className="shadow-none"
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatChip label="Incident Nodes" value={troublePoints.length} />
          <StatChip label="Incident Volume" value={totalIncidents} />
          <StatChip label="Cities" value={sortedCities.length} />
          <StatChip
            label="Top City"
            value={sortedCities.length ? sortedCities[0][0] : '—'}
          />
        </div>

        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Top city concentration</p>
          </div>

          <div className="space-y-2">
            {sortedCities.length ? (
              sortedCities.slice(0, 5).map(([city, count]) => {
                const percentage = troublePoints.length ? (count / troublePoints.length) * 100 : 0;
                return (
                  <div key={city} className="rounded-lg border border-border bg-background p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{city}</p>
                        <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% of incident nodes</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-foreground">{count}</p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No mapped incident nodes for the selected date range.</p>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">Highest Frequency</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {troublePoints.length ? `${Math.max(...troublePoints.map((item) => Number(item.incident_count || 0)))}x` : '0x'}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">Mapped Coverage</p>
              <Radar className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {troublePoints.length ? 'Ready' : 'Empty'}
            </p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export function getBubbleColor(count) {
  if (count > 10) return '#ef4444';
  if (count > 5) return '#f97316';
  return '#eab308';
}
