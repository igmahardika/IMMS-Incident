import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, Network, RefreshCw, Search } from 'lucide-react';
import { api } from '../../utils/api.js';
import { cn } from '../../lib/utils.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button, Input, SectionCard, Spinner } from './index.jsx';
import {
  DistributionGeocodeReportCard,
  DistributionTroublePopup,
  getTroubleVisual,
  InfrastructurePopup,
  NORMAL_POINT_COLORS,
  SEMARANG_CENTER,
} from './maps/distributionMapParts.jsx';
import { ChangeView, LegendItem, SegmentedButton, StatChip } from './maps/MapShared.jsx';

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

  return (
    <div className="flex h-full min-h-[680px] flex-col overflow-hidden rounded-xl bg-card">
      <div className="border-b border-border bg-background/90 px-4 py-4 backdrop-blur md:px-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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

            <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-end">
              <StatChip
                label={viewMode === 'normal' ? 'Visible Nodes' : 'Trouble Nodes'}
                value={activePoints.length}
              />
              <StatChip label="Missing Coords" value={missingPointCount} />
              <StatChip
                label={viewMode === 'normal' ? 'Mapped Registry' : 'Window'}
                value={viewMode === 'normal' ? `${points.length} mapped` : `${startDate} to ${endDate}`}
              />
              {locatedLabel ? <StatChip label="Located" value={locatedLabel} /> : null}
            </div>
          </div>

          <form
            onSubmit={handleSearch}
            className={cn(
              'grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]',
              viewMode === 'trouble' && 'xl:grid-cols-[156px_156px_minmax(0,1fr)_auto_auto]'
            )}
          >
            {viewMode === 'trouble' ? (
              <>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  aria-label="Start date"
                  wrapperClassName="gap-0"
                  className="h-9 w-full"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  aria-label="End date"
                  wrapperClassName="gap-0"
                  className="h-9 w-full"
                />
              </>
            ) : null}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={viewMode === 'normal' ? 'Search ODP, POP, or BTS' : 'Search trouble node'}
                aria-label="Search topology nodes"
                wrapperClassName="gap-0"
                className="h-9 w-full pl-9"
              />
            </div>

            <Button type="submit" variant="outline" size="sm" className="w-full lg:w-auto">
              Locate
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={startAutoGeocode}
              disabled={geocodingStatus.active}
              className="w-full gap-2 lg:w-auto"
            >
              <RefreshCw className={cn('h-4 w-4', geocodingStatus.active && 'animate-spin')} />
              {geocodingStatus.active ? 'Syncing' : 'Sync'}
            </Button>
          </form>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="map-surface relative min-h-[460px] bg-muted/20 xl:min-h-0">
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
                      <DistributionTroublePopup point={point} toneClassName={visual.toneClassName} color={visual.color} />
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

        </div>

        <div className="min-h-0 overflow-y-auto border-t border-border bg-background/95 p-4 backdrop-blur xl:border-l xl:border-t-0 xl:p-5">
          <div className="space-y-4">
            <SectionCard
              title="Map Snapshot"
              subtitle={viewMode === 'normal' ? 'Realtime topology visibility for the current registry.' : 'Trouble concentration for the selected date window.'}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <StatChip label={viewMode === 'normal' ? 'Visible Nodes' : 'Trouble Nodes'} value={activePoints.length} />
                <StatChip label="Missing Coords" value={missingPointCount} />
                <StatChip
                  label={viewMode === 'normal' ? 'Mapped Registry' : 'Window'}
                  value={viewMode === 'normal' ? `${points.length} mapped` : `${startDate} to ${endDate}`}
                />
                {locatedLabel ? <StatChip label="Located" value={locatedLabel} /> : <StatChip label="Located" value="—" />}
              </div>
            </SectionCard>

            {viewMode === 'normal' ? <DistributionGeocodeReportCard report={geocodeReport} /> : null}

            <SectionCard
              title={viewMode === 'normal' ? 'Infrastructure' : 'Trouble Intensity'}
            >
              <div className="space-y-3">
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
      </div>
    </div>
  );
}
