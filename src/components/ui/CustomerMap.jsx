import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertCircle, RefreshCw, Search, Users } from 'lucide-react';
import { api } from '../../utils/api.js';
import { formatDateTime } from '../../utils/incidentUtils.js';
import { cn } from '../../lib/utils.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button, Input, SectionCard, Spinner } from './index.jsx';

const SEMARANG_CENTER = [-7.0051, 110.4381];
const PROVINCE_COLORS = {
  'Jawa Tengah': '#4f46e5',
  'Jawa Barat': '#059669',
  'Jawa Timur': '#d97706',
  'DKI Jakarta': '#dc2626',
  Banten: '#7c3aed',
  Others: '#64748b',
};

function ChangeView({ center, zoom, viewId }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1 });
  }, [center, zoom, map, viewId]);

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

function LegendItem({ className, label }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn('h-3 w-3 rounded-full ring-4', className)} />
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

function CustomerPopup({ customer }) {
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

function TroublePopup({ trouble }) {
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

export default function CustomerMap({
  customers = [],
  onRefresh,
  initialMode = 'customers',
  showTroubleMode = true,
  startDate = '2026-01-01',
  endDate = '2026-02-28 23:59:59',
  hideCustomerPins = false,
}) {
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [geocodingStatus, setGeocodingStatus] = useState({ active: false, current: 0, total: 0 });
  const [mapMode, setMapMode] = useState(initialMode);
  const [troubleData, setTroubleData] = useState([]);
  const [viewState, setViewState] = useState({ center: SEMARANG_CENTER, zoom: 12, id: 0 });
  const [highlightedId, setHighlightedId] = useState(null);
  const [locatedLabel, setLocatedLabel] = useState('');

  const filteredCustomers = useMemo(
    () => customers.filter((customer) => customer.latitude && customer.longitude),
    [customers]
  );
  const troublePoints = useMemo(
    () => troubleData.filter((item) => item.latitude != null && item.longitude != null),
    [troubleData]
  );
  const provinceCount = useMemo(
    () => new Set(filteredCustomers.map((customer) => customer.province).filter(Boolean)).size,
    [filteredCustomers]
  );
  const missingCustomerCoords = Math.max(customers.length - filteredCustomers.length, 0);

  useEffect(() => {
    if (mapMode === 'trouble' && showTroubleMode) {
      const fetchTroubleData = async () => {
        setIsProcessing(true);

        try {
          const data = await api.getTroubleMapData(startDate, endDate);
          setTroubleData(data || []);
        } catch (error) {
          console.error('Failed to load trouble map data:', error);
        } finally {
          setIsProcessing(false);
        }
      };

      fetchTroubleData();
      return;
    }

    setIsProcessing(true);
    const timeoutId = window.setTimeout(() => setIsProcessing(false), 500);
    return () => window.clearTimeout(timeoutId);
  }, [filteredCustomers.length, mapMode, startDate, endDate, showTroubleMode]);

  const startAutoGeocode = async () => {
    if (geocodingStatus.active) return;

    try {
      const missing = await api.getCustomersWithMissingCoords();
      if (!missing?.length) {
        addToast('All customer map records already have coordinates', 'info');
        return;
      }

      setGeocodingStatus({ active: true, current: 0, total: missing.length });
      const batchSize = 50;
      let updated = 0;
      let failed = 0;
      let skipped = 0;
      let cached = 0;
      let geocoded = 0;
      let remaining = 0;

      for (let index = 0; index < missing.length; index += batchSize) {
        const batch = missing.slice(index, index + batchSize);
        const response = await api.autoGeocodeCustomers(batch.map((item) => item.id));
        updated += response.updated || 0;
        failed += response.failed || 0;
        skipped += response.skipped || 0;
        cached += response.cached || 0;
        geocoded += response.geocoded || 0;
        remaining = response.remaining || remaining;
        setGeocodingStatus((previous) => ({
          ...previous,
          current: Math.min(previous.total, index + batch.length),
        }));
      }

      await onRefresh?.();
      addToast(
        [
          `Customer sync complete: ${updated} updated.`,
          geocoded ? `${geocoded} geocoded.` : null,
          cached ? `${cached} reused from cache.` : null,
          skipped ? `${skipped} skipped (missing address).` : null,
          failed ? `${failed} failed.` : null,
          Number.isFinite(remaining) ? `${remaining} still missing.` : null,
        ].filter(Boolean).join(' '),
        failed > 0 ? 'warning' : 'success',
        7000
      );
    } catch (error) {
      console.error('Auto-geocoding customer error:', error);
      addToast(error.message || 'Customer sync failed', 'error');
    } finally {
      setGeocodingStatus({ active: false, current: 0, total: 0 });
    }
  };

  const getBubbleColor = (count) => {
    if (count > 10) return '#ef4444';
    if (count > 5) return '#f97316';
    return '#eab308';
  };

  const handleSearch = (event) => {
    event.preventDefault();

    const term = searchTerm.toLowerCase();
    if (!term.trim()) return;
    const searchCollection = mapMode === 'trouble' ? troubleData : customers;
    const found = searchCollection.find(
      (item) =>
        (item.address || '').toLowerCase().includes(term) ||
        (item.city || '').toLowerCase().includes(term) ||
        (item.province || '').toLowerCase().includes(term) ||
        (item.customer_id || '').toLowerCase().includes(term) ||
        (item.service_id || '').toLowerCase().includes(term) ||
        (item.brand_site || '').toLowerCase().includes(term) ||
        (item.company_name || '').toLowerCase().includes(term)
    );

    if (!found) {
      addToast('No customer record matched that search', 'warning');
      return;
    }

    if (found.latitude != null && found.longitude != null) {
      setViewState({
        center: [Number(found.latitude), Number(found.longitude)],
        zoom: 16,
        id: Date.now(),
      });
      setHighlightedId(found.id);
      setLocatedLabel(found.brand_site || found.company_name || found.service_id || found.customer_id || 'Located point');
      addToast(`Centered on ${found.brand_site || found.company_name || found.service_id || found.customer_id}`, 'success', 2500);
      return;
    }

    addToast(
      `Record found for ${found.brand_site || found.company_name || found.service_id || found.customer_id}, but it has no coordinates yet. Run Sync after fixing the address if needed.`,
      'warning',
      6000
    );
  };

  return (
    <div className="map-surface relative flex h-full min-h-[600px] flex-1 overflow-hidden rounded-xl bg-muted/20">
      <MapContainer
        center={SEMARANG_CENTER}
        zoom={12}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ZoomControl position="bottomright" />
        <ChangeView center={viewState.center} zoom={viewState.zoom} viewId={viewState.id} />

        {mapMode === 'customers' && !hideCustomerPins
          ? filteredCustomers.map((customer) => {
              const color = PROVINCE_COLORS[customer.province] || PROVINCE_COLORS.Others;

              return (
                <CircleMarker
                  key={customer.id}
                  center={[Number(customer.latitude), Number(customer.longitude)]}
                  radius={highlightedId === customer.id ? 10 : 7}
                  pathOptions={{
                    fillColor: color,
                    color: highlightedId === customer.id ? '#0f172a' : '#ffffff',
                    weight: highlightedId === customer.id ? 3 : 2,
                    fillOpacity: 0.92,
                  }}
                >
                  <Popup className="map-popup">
                    <CustomerPopup customer={customer} />
                  </Popup>
                </CircleMarker>
              );
            })
          : troublePoints.map((trouble) => (
              <CircleMarker
                key={`trouble-${trouble.id}`}
                center={[Number(trouble.latitude), Number(trouble.longitude)]}
                radius={highlightedId === trouble.id ? Math.min(Math.max(trouble.incident_count * 3, 10), 28) : Math.min(Math.max(trouble.incident_count * 3, 8), 25)}
                pathOptions={{
                  fillColor: getBubbleColor(trouble.incident_count),
                  color: highlightedId === trouble.id ? '#0f172a' : '#ffffff',
                  weight: highlightedId === trouble.id ? 3 : 2,
                  fillOpacity: 0.62,
                }}
              >
                <Popup className="map-popup">
                  <TroublePopup trouble={trouble} />
                </Popup>
              </CircleMarker>
            ))}
      </MapContainer>

      <div className="pointer-events-none absolute left-4 top-4 right-4 z-[1000] flex flex-wrap items-start gap-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/92 px-4 py-3 shadow-sm backdrop-blur">
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1">
            <SegmentedButton active={mapMode === 'customers'} onClick={() => setMapMode('customers')}>
              <Users className="mr-2 h-4 w-4" />
              Customers
            </SegmentedButton>
            {showTroubleMode ? (
              <SegmentedButton
                active={mapMode === 'trouble'}
                onClick={() => setMapMode('trouble')}
                tone="destructive"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Incidents
              </SegmentedButton>
            ) : null}
          </div>

          <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={
                  mapMode === 'trouble'
                    ? 'Search address, city, service ID, or site'
                    : 'Search address, city, province, or service ID'
                }
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

        <div className="pointer-events-none ml-auto hidden items-stretch gap-3 xl:flex">
          <StatChip
            label={mapMode === 'trouble' ? 'Incident Nodes' : 'Mapped Customers'}
            value={mapMode === 'trouble' ? troublePoints.length : filteredCustomers.length}
          />
          <StatChip label={mapMode === 'trouble' ? 'Unmapped' : 'Missing Coords'} value={mapMode === 'trouble' ? Math.max(troubleData.length - troublePoints.length, 0) : missingCustomerCoords} />
          <StatChip label="Coverage" value={`${provinceCount} provinces`} />
          {locatedLabel ? <StatChip label="Located" value={locatedLabel} /> : null}
        </div>
      </div>

      {(isProcessing || geocodingStatus.active) ? (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-[1000] flex justify-center px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/92 px-4 py-2 shadow-sm backdrop-blur">
            <Spinner size="sm" className="p-0" />
            <span className="text-sm text-muted-foreground">
              {geocodingStatus.active
                ? `Syncing ${geocodingStatus.current}/${geocodingStatus.total}`
                : 'Loading map'}
            </span>
          </div>
        </div>
      ) : null}

      <SectionCard
        title={mapMode === 'trouble' ? 'Incident Density' : 'Customer Coverage'}
        className="pointer-events-none absolute bottom-5 left-5 z-[1000] min-w-[220px] shadow-lg"
      >
        <div className="pointer-events-auto space-y-3">
          {mapMode === 'trouble' ? (
            <>
              <LegendItem className="bg-destructive ring-destructive/10" label="High (>10 incidents)" />
              <LegendItem className="bg-orange-500 ring-orange-500/10" label="Medium (6-10 incidents)" />
              <LegendItem className="bg-yellow-500 ring-yellow-500/10" label="Low (1-5 incidents)" />
            </>
          ) : (
            <>
              <LegendItem className="bg-primary ring-primary/10" label="Jawa Tengah" />
              <LegendItem className="bg-emerald-600 ring-emerald-600/10" label="Jawa Barat" />
              <LegendItem className="bg-amber-600 ring-amber-600/10" label="Jawa Timur" />
              <LegendItem className="bg-slate-500 ring-slate-500/10" label="Other province" />
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
