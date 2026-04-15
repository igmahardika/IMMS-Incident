import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, Database, Network, RefreshCw, Search } from 'lucide-react';
import { api } from '../../utils/api.js';
import { formatDateTime } from '../../utils/incidentUtils.js';
import { cn } from '../../lib/utils.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button, Input, SectionCard, Spinner } from './index.jsx';

const SEMARANG_CENTER = [-7.0051, 110.4381];
const NORMAL_POINT_COLORS = {
  fiber: '#4f46e5',
  wireless: '#d97706',
};

function ChangeView({ center, zoom, viewId }) {
  const map = useMap();
  const lastId = useRef(viewId);

  useEffect(() => {
    if (viewId && viewId !== lastId.current) {
      map.setView(center, zoom, { animate: true, duration: 1 });
      lastId.current = viewId;
    }
  }, [center, zoom, viewId, map]);

  return null;
}

function SegmentedButton({ active, children, onClick, tone = 'default' }) {
  const activeClassName = {
    default: 'bg-primary text-primary-foreground shadow-sm',
    destructive: 'bg-destructive text-destructive-foreground shadow-sm',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors',
        active
          ? activeClassName[tone] || activeClassName.default
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {children}
    </button>
  );
}

function LegendItem({ colorClassName, label }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn('h-3 w-3 rounded-full ring-4', colorClassName)} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function StatChip({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-background/90 px-3 py-2 shadow-sm backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ReportReasonList({ title, items = [] }) {
  if (!items.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-muted-foreground">{item.label}</span>
            <span className="font-medium text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DistributionGeocodeReportCard({ report }) {
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
      className="min-w-[340px] shadow-lg"
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

function InfrastructurePopup({ point }) {
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

function TroublePopup({ point, toneClassName, color }) {
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

export default function DistributionMap({ data, onRefresh }) {
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewState, setViewState] = useState({ center: SEMARANG_CENTER, zoom: 12, id: 0 });
  const [geocodingStatus, setGeocodingStatus] = useState({ active: false, current: 0, total: 0 });
  const [viewMode, setViewMode] = useState('normal');
  const [troubleData, setTroubleData] = useState([]);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-02-28');
  const [highlightedId, setHighlightedId] = useState(null);
  const [locatedLabel, setLocatedLabel] = useState('');
  const [geocodeReport, setGeocodeReport] = useState(null);

  const points = useMemo(
    () => (data || []).filter((item) => item.latitude && item.longitude),
    [data]
  );
  const troublePoints = useMemo(
    () => troubleData.filter((item) => item.latitude && item.longitude),
    [troubleData]
  );
  const activePoints = viewMode === 'normal' ? points : troublePoints;
  const missingPointCount = Math.max((viewMode === 'normal' ? (data || []).length : troubleData.length) - activePoints.length, 0);

  const loadGeocodeReport = useCallback(async () => {
    try {
      const report = await api.getDistribusiGeocodeReport();
      setGeocodeReport(report);
    } catch (error) {
      console.error('Failed to load topology geocode report:', error);
    }
  }, []);

  const startAutoGeocode = async () => {
    if (geocodingStatus.active) return;

    try {
      const missing = await api.getDistribusiWithMissingCoords();
      if (!missing?.length) {
        addToast('All topology nodes already have coordinates', 'info');
        return;
      }

      setGeocodingStatus({ active: true, current: 0, total: missing.length });
      const batchSize = 100;
      let updated = 0;
      let failed = 0;
      let skipped = 0;
      let derived = 0;
      let cached = 0;
      let geocoded = 0;
      let remaining = 0;

      for (let index = 0; index < missing.length; index += batchSize) {
        const batch = missing.slice(index, index + batchSize);
        const response = await api.autoGeocodeDistribusi(batch.map((item) => item.id));
        updated += response.updated || 0;
        failed += response.failed || 0;
        skipped += response.skipped || 0;
        derived += response.derived || 0;
        cached += response.cached || 0;
        geocoded += response.geocoded || 0;
        remaining = response.remaining || remaining;
        setGeocodingStatus((previous) => ({
          ...previous,
          current: Math.min(previous.total, index + batch.length),
        }));
      }

      await onRefresh?.();
      await loadGeocodeReport();
      addToast(
        [
          `Topology sync complete: ${updated} updated.`,
          derived ? `${derived} derived from incident/customer anchors.` : null,
          geocoded ? `${geocoded} geocoded.` : null,
          cached ? `${cached} reused from cache.` : null,
          skipped ? `${skipped} skipped (no location anchor).` : null,
          failed ? `${failed} failed.` : null,
          Number.isFinite(remaining) ? `${remaining} still missing.` : null,
        ].filter(Boolean).join(' '),
        failed > 0 ? 'warning' : 'success',
        7000
      );
    } catch (error) {
      console.error('Auto-geocoding distribution error:', error);
      addToast(error.message || 'Topology sync failed', 'error');
    } finally {
      setGeocodingStatus({ active: false, current: 0, total: 0 });
    }
  };

  const loadTroubleData = useCallback(async () => {
    setIsProcessing(true);

    try {
      const response = await api.getDistributionTrouble(
        startDate ? `${startDate} 00:00:00` : '',
        endDate ? `${endDate} 23:59:59` : ''
      );
      setTroubleData(response || []);
    } catch (error) {
      console.error('Failed to load distribution trouble data:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (viewMode === 'trouble') {
      loadTroubleData();
      return undefined;
    }

    setIsProcessing(true);
    const timeoutId = window.setTimeout(() => setIsProcessing(false), 500);
    return () => window.clearTimeout(timeoutId);
  }, [loadTroubleData, points.length, viewMode]);

  useEffect(() => {
    loadGeocodeReport();
  }, [loadGeocodeReport]);

  const handleSearch = (event) => {
    event.preventDefault();

    const term = searchTerm.toLowerCase();
    if (!term.trim()) return;
    const searchCollection = viewMode === 'normal' ? (data || []) : troubleData;
    const found = searchCollection.find(
      (point) =>
        (point.level_4 || '').toLowerCase().includes(term) ||
        (point.level_1 || '').toLowerCase().includes(term) ||
        (point.level_2 || '').toLowerCase().includes(term) ||
        (point.level_3 || '').toLowerCase().includes(term)
    );

    if (!found) {
      addToast('No topology record matched that search', 'warning');
      return;
    }

    if (found.latitude != null && found.longitude != null) {
      setViewState({
        center: [Number(found.latitude), Number(found.longitude)],
        zoom: 16,
        id: Date.now(),
      });
      setHighlightedId(found.id);
      setLocatedLabel(found.level_4 || found.level_3 || found.level_2 || found.level_1 || 'Located node');
      addToast(`Centered on ${found.level_4 || found.level_3 || found.level_2 || found.level_1}`, 'success', 2500);
      return;
    }

    addToast(
      `Topology node ${found.level_4 || found.level_3 || found.level_2 || found.level_1} exists, but it has no coordinates yet. Sync can only map nodes that have usable location anchors.`,
      'warning',
      6500
    );
  };

  const getTroubleVisual = (incidentCount) => {
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
  };

  return (
    <div className="flex h-full min-h-[680px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-4 py-4 md:px-5">
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Distribution Topology Map
          </h3>
          <p className="text-sm text-muted-foreground">
            Explore active infrastructure nodes and recent trouble concentration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1">
            <SegmentedButton active={viewMode === 'normal'} onClick={() => setViewMode('normal')}>
              <Network className="mr-2 h-4 w-4" />
              Normal
            </SegmentedButton>
            <SegmentedButton
              active={viewMode === 'trouble'}
              onClick={() => setViewMode('trouble')}
              tone="destructive"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Trouble
            </SegmentedButton>
          </div>

          <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
            {viewMode === 'trouble' ? (
              <>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                className="w-[156px]"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                className="w-[156px]"
                />
              </>
            ) : null}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={viewMode === 'normal' ? 'Search ODP, POP, or BTS' : 'Search trouble node'}
                className="w-64 pl-9"
              />
            </div>

            <Button type="submit" variant="outline">
              Locate
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={startAutoGeocode}
              disabled={geocodingStatus.active}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', geocodingStatus.active && 'animate-spin')} />
              {geocodingStatus.active ? 'Syncing' : 'Sync'}
            </Button>
          </form>
        </div>
      </div>

      <div className="map-surface relative min-h-0 flex-1 bg-muted/20">
        <MapContainer center={SEMARANG_CENTER} zoom={12} className="h-full w-full" zoomControl={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <ZoomControl position="bottomright" />
          <ChangeView center={viewState.center} zoom={viewState.zoom} viewId={viewState.id} />

          {viewMode === 'normal'
            ? points.map((point) => {
                const isFiber = point.type === 'Fiber Optic';
                const color = isFiber ? NORMAL_POINT_COLORS.fiber : NORMAL_POINT_COLORS.wireless;

                return (
                  <CircleMarker
                    key={point.id}
                    center={[Number(point.latitude), Number(point.longitude)]}
                    radius={highlightedId === point.id ? 11 : 8}
                    pathOptions={{
                      fillColor: color,
                      color: highlightedId === point.id ? '#0f172a' : '#ffffff',
                      weight: highlightedId === point.id ? 3 : 2,
                      fillOpacity: 0.9,
                    }}
                  >
                    <Popup className="map-popup">
                      <InfrastructurePopup point={point} />
                    </Popup>
                  </CircleMarker>
                );
              })
            : troublePoints.map((point) => {
                const visual = getTroubleVisual(point.incident_count);
                const radius = 6 + Math.min(point.incident_count * 3, 24);

                return (
                  <CircleMarker
                    key={`trouble-${point.id}`}
                    center={[Number(point.latitude), Number(point.longitude)]}
                    radius={highlightedId === point.id ? radius + 3 : radius}
                    pathOptions={{
                      fillColor: visual.color,
                      color: highlightedId === point.id ? '#0f172a' : visual.color,
                      weight: highlightedId === point.id ? 3 : 2,
                      fillOpacity: 0.4,
                    }}
                  >
                    <Popup className="map-popup">
                      <TroublePopup point={point} toneClassName={visual.toneClassName} color={visual.color} />
                    </Popup>
                  </CircleMarker>
                );
              })}
        </MapContainer>

        {(isProcessing || geocodingStatus.active) ? (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-[1000] flex justify-center px-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/90 px-4 py-2 shadow-sm backdrop-blur">
              <Spinner size="sm" className="p-0" />
              <span className="text-sm text-muted-foreground">
                {geocodingStatus.active
                  ? `Syncing ${geocodingStatus.current}/${geocodingStatus.total}`
                  : 'Loading map'}
              </span>
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute left-5 top-5 z-[1000] hidden items-start gap-3 xl:flex">
          <div className="grid gap-3">
            <StatChip label={viewMode === 'normal' ? 'Visible Nodes' : 'Trouble Nodes'} value={activePoints.length} />
            <StatChip label="Missing Coords" value={missingPointCount} />
            <StatChip
              label={viewMode === 'normal' ? 'Mapped Registry' : 'Window'}
              value={viewMode === 'normal' ? `${points.length} mapped` : `${startDate} to ${endDate}`}
            />
            {locatedLabel ? <StatChip label="Located" value={locatedLabel} /> : null}
          </div>
          {viewMode === 'normal' ? <DistributionGeocodeReportCard report={geocodeReport} /> : null}
        </div>

        <SectionCard
          className="pointer-events-none absolute bottom-5 left-5 z-[1000] min-w-[220px] shadow-lg"
          title={viewMode === 'normal' ? 'Infrastructure' : 'Trouble Intensity'}
        >
          <div className="pointer-events-auto space-y-3">
            {viewMode === 'normal' ? (
              <>
                <LegendItem colorClassName="bg-primary ring-primary/10" label="Fiber optic node" />
                <LegendItem colorClassName="bg-amber-500 ring-amber-500/10" label="Wireless node" />
                <div className="border-t border-border pt-3 text-sm text-muted-foreground">
                  {points.length} active nodes
                </div>
              </>
            ) : (
              <>
                <LegendItem colorClassName="bg-destructive ring-destructive/10" label="High (>5 events)" />
                <LegendItem colorClassName="bg-amber-500 ring-amber-500/10" label="Medium (3-5)" />
                <LegendItem colorClassName="bg-yellow-500 ring-yellow-500/10" label="Low (1-2)" />
              </>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
