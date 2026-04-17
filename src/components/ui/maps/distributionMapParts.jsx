import React from 'react';
import { AlertTriangle, Database, Network } from 'lucide-react';
import { formatDateTime } from '../../../utils/incidentUtils.js';
import { cn } from '../../../lib/utils.js';
import { SectionCard } from '../index.jsx';
import { ReportReasonList, StatChip } from './MapShared.jsx';

export const SEMARANG_CENTER = [-7.0051, 110.4381];
export const NORMAL_POINT_COLORS = {
  fiber: '#4f46e5',
  wireless: '#d97706',
};

export function DistributionGeocodeReportCard({ report }) {
  if (!report) return null;

  const typeItems = (report.typeBreakdown || []).map((item) => ({
    label: item.type,
    value: `${item.mapped}/${item.total}`,
  }));
  const sampleItems = (report.samples || []).slice(0, 3).map((item) => ({
    label: item.level_4 || item.level_3 || item.level_2 || item.level_1 || `Node #${item.id}`,
    value: item.reason.replaceAll('_', ' '),
  }));

  return (
    <SectionCard
      title="Sync Health"
      subtitle="Readiness of topology nodes for coordinate sync."
      className="shadow-none"
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatChip label="Mapped" value={report.mapped} />
          <StatChip label="Anchorable" value={report.anchorable} />
          <StatChip label="Geocode Candidate" value={report.geocodeCandidate} />
          <StatChip label="No Anchor" value={report.noCoordinateAnchor} />
        </div>

        <ReportReasonList title="Coverage By Type" items={typeItems} />
        <ReportReasonList title="Recent Unmapped Samples" items={sampleItems} />
      </div>
    </SectionCard>
  );
}

export function InfrastructurePopup({ point }) {
  const isFiber = point.type === 'Fiber Optic';

  return (
    <div className="min-w-[220px] space-y-4 p-1">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            isFiber ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          )}
        >
          {isFiber ? <Database className="h-4.5 w-4.5" /> : <Network className="h-4.5 w-4.5" />}
        </div>

        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {point.level_4 || point.level_2 || 'Node'}
          </p>
          <p className="text-xs text-muted-foreground">{point.type}</p>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
        {isFiber ? (
          <>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">POP</span>
              <span className="font-medium text-foreground">{point.level_1 || '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">OSC</span>
              <span className="font-medium text-foreground">{point.level_2 || '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">ODC</span>
              <span className="font-medium text-foreground">{point.level_3 || '—'}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">BTS Site</span>
            <span className="font-medium text-foreground">{point.level_1 || '—'}</span>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-3 text-xs font-mono text-muted-foreground">
        {Number(point.latitude).toFixed(5)}, {Number(point.longitude).toFixed(5)}
      </div>
    </div>
  );
}

export function DistributionTroublePopup({ point, toneClassName, color }) {
  return (
    <div className="min-w-[220px] space-y-4 p-1">
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', toneClassName)}>
          <AlertTriangle className="h-5 w-5" />
        </div>

        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {point.level_4 || point.level_2 || 'Node'}
          </p>
          <p className="text-xs text-muted-foreground">Infrastructure trouble</p>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Frequency</span>
          <span className="font-semibold" style={{ color }}>
            {point.incident_count}x
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Last incident</span>
          <span className="font-medium text-foreground">{formatDateTime(point.last_incident_at)}</span>
        </div>
      </div>
    </div>
  );
}

export function getTroubleVisual(incidentCount) {
  if (incidentCount > 5) {
    return {
      color: '#ef4444',
      toneClassName: 'bg-destructive/10 text-destructive',
      legendClassName: 'bg-destructive ring-destructive/10',
    };
  }

  if (incidentCount > 2) {
    return {
      color: '#f59e0b',
      toneClassName: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      legendClassName: 'bg-amber-500 ring-amber-500/10',
    };
  }

  return {
    color: '#eab308',
    toneClassName: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
    legendClassName: 'bg-yellow-500 ring-yellow-500/10',
  };
}
