import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api, formatDateTime, formatDate } from '../../utils/api';

// Province colors - Refined for premium look
const PROVINCE_COLORS = {
  'Jawa Tengah': '#4f46e5', // Indigo 600
  'Jawa Barat': '#059669', // Emerald 600
  'Jawa Timur': '#d97706', // Amber 600
  'DKI Jakarta': '#dc2626', // Red 600
  'Banten': '#7c3aed', // Violet 600
  'Others': '#64748b'  // Slate 500
};

const createCustomMarker = (province) => {
  const color = PROVINCE_COLORS[province] || PROVINCE_COLORS['Others'];
  return new L.DivIcon({
    className: 'custom-marker-simple',
    html: `
      <div style="
        background-color: ${color}; 
        width: 12px; 
        height: 12px; 
        border-radius: 50%; 
        border: 1.5px solid white; 
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1 });
  }, [center, zoom, map]);
  return null;
}

export default function CustomerMap({ 
  customers, 
  onRefresh, 
  initialMode = 'customers', 
  showTroubleMode = false,
  startDate = '2026-01-01',
  endDate = '2026-02-28 23:59:59',
  hideCustomerPins = false
}) {
  const [renderedCount, setRenderedCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [geocodingStatus, setGeocodingStatus] = useState({ active: false, current: 0, total: 0 });
  const [mapMode, setMapMode] = useState(initialMode); // 'customers' | 'trouble'
  const [troubleData, setTroubleData] = useState([]);
  const [isTroubleLoading, setIsTroubleLoading] = useState(false);
  const [troubleError, setTroubleError] = useState(null);
  
  const semarangCenter = [-7.0051, 110.4381];
  const [viewState, setViewState] = useState({ center: semarangCenter, zoom: 12 });
  const geocodingRef = useRef(false);

  const filteredCustomers = useMemo(() => 
    customers.filter(c => c.latitude && c.longitude),
    [customers]
  );

  // Background Rendering Progress
  useEffect(() => {
    if (filteredCustomers.length === 0 && !geocodingStatus.active) {
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    setRenderedCount(0);
    
    let current = 0;
    const batchSize = Math.max(50, Math.floor(filteredCustomers.length / 20));
    const interval = setInterval(() => {
      current += batchSize;
      if (current >= filteredCustomers.length) {
        setRenderedCount(filteredCustomers.length);
        setIsProcessing(false);
        clearInterval(interval);
      } else {
        setRenderedCount(current);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [filteredCustomers.length, geocodingStatus.active]);

  // Geocoding trigger moved to manual button to avoid 429 surges
  const startAutoGeocode = async () => {
    if (geocodingStatus.active) return;
    try {
      const missing = await api.getCustomersWithMissingCoords();
      if (missing && missing.length > 0) {
        setGeocodingStatus({ active: true, current: 0, total: missing.length });
        
        // Process in small batches
        const batchSize = 3;
        for (let i = 0; i < missing.length; i += batchSize) {
          const batch = missing.slice(i, i + batchSize);
          const ids = batch.map(m => m.id);
          await api.autoGeocodeCustomers(ids);
          setGeocodingStatus(prev => ({ ...prev, current: i + batch.length }));
        }
        if (onRefresh) onRefresh(); 
      }
    } catch (err) {
      console.error('Auto-Geocoding error:', err);
    } finally {
      setGeocodingStatus({ active: false, current: 0, total: 0 });
    }
  };

  // Fetch Trouble Map Data
  useEffect(() => {
    if (mapMode === 'trouble') {
      const fetchTroubleData = async () => {
        setIsTroubleLoading(true);
        setTroubleError(null);
        try {
          const data = await api.getTroubleMapData(startDate, endDate);
          setTroubleData(data);
        } catch (err) {
          console.error('Failed to fetch trouble map data:', err);
          setTroubleError(err.message);
        } finally {
          setIsTroubleLoading(false);
        }
      };
      fetchTroubleData();
    }
  }, [mapMode, startDate, endDate]);

  const getBubbleColor = (count) => {
    if (count > 10) return '#ef4444'; // Red 500
    if (count > 5) return '#f97316';  // Orange 500
    if (count > 2) return '#f59e0b';  // Amber 500
    return '#eab308';                // Yellow 500
  };

  const getBubbleRadius = (count) => {
    return Math.min(Math.max(count * 3, 8), 25);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const term = searchTerm.toLowerCase();
    
    const found = filteredCustomers
      .sort((a, b) => {
        const aIsSem = (a.city || '').toLowerCase().includes('semarang') ? -1 : 1;
        const bIsSem = (b.city || '').toLowerCase().includes('semarang') ? -1 : 1;
        return aIsSem - bIsSem;
      })
      .find(c => 
        (c.brand_site || '').toLowerCase().includes(term) || 
        (c.company_name || '').toLowerCase().includes(term) ||
        (c.city || '').toLowerCase().includes(term) ||
        (c.service_id || '').toLowerCase().includes(term)
      );

    if (found) {
      setViewState({ center: [found.latitude, found.longitude], zoom: 16 });
    }
  };

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm flex flex-col overflow-hidden h-[700px]">
      <header className="flex items-center justify-between flex-wrap gap-4 px-6 py-4 border-b border-base-200 bg-base-100/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold uppercase tracking-tight text-base-content/80">Customer Density Map</h3>
            <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mt-0.5 whitespace-nowrap">Service Locations & Analytics</p>
          </div>
          
          {(isProcessing || geocodingStatus.active || isTroubleLoading) && (
            <div className="flex items-center gap-2.5 px-3 py-1 bg-primary/5 rounded-full border border-primary/10">
              <span className="loading loading-spinner loading-xs text-primary"></span>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                {geocodingStatus.active 
                   ? `Syncing: ${geocodingStatus.current}/${geocodingStatus.total}`
                   : isTroubleLoading ? 'Analyzing Patterns...' : `Loading Nodes...`
                }
              </span>
            </div>
          )}
          {mapMode === 'trouble' && !isTroubleLoading && (
            <div className={`badge badge-sm font-bold gap-2 ${
              troubleError || troubleData.length > 0
                ? 'badge-error badge-outline'
                : 'badge-ghost opacity-60'
            }`}>
              {troubleError 
                ? `Error: ${troubleError}`
                : troubleData.length > 0 
                ? `${troubleData.length} Trouble Spots` 
                : `No Trouble Spots`}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {showTroubleMode && (
            <div className="join bg-base-200 p-1 rounded-xl">
              {!hideCustomerPins && (
                <button 
                  className={`btn btn-xs join-item border-none ${mapMode === 'customers' ? 'btn-primary shadow-sm' : 'bg-transparent text-base-content/60'}`}
                  onClick={() => setMapMode('customers')}
                >
                  Customers
                </button>
              )}
              <button 
                className={`btn btn-xs join-item border-none ${mapMode === 'trouble' ? 'btn-error shadow-sm' : 'bg-transparent text-base-content/60'}`}
                onClick={() => setMapMode('trouble')}
              >
                Trouble
              </button>
            </div>
          )}
          
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex items-center">
              <span className="absolute left-3 text-base-content/40 pointer-events-none text-xs">🔍</span>
              <input 
                type="text" 
                className="input input-bordered input-sm pl-9 w-56 font-medium" 
                placeholder="Site, Service ID, or City..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-sm btn-primary font-bold">Locate</button>
            <button 
              type="button" 
              className={`btn btn-sm ${geocodingStatus.active ? 'btn-disabled' : 'btn-ghost'} px-3 font-bold`}
              onClick={startAutoGeocode}
            >
              {geocodingStatus.active ? 'Syncing...' : '🔄 Sync'}
            </button>
          </form>
        </div>
      </header>

      <div className="flex-1 relative">
        <MapContainer 
          center={semarangCenter} 
          zoom={12} 
          className="h-full w-full z-0"
          zoomControl={false}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <ZoomControl position="bottomright" />
          <ChangeView center={viewState.center} zoom={viewState.zoom} />
          
          {mapMode === 'customers' && !hideCustomerPins ? (
            filteredCustomers.map((c) => (
              <Marker 
                key={c.id} 
                position={[c.latitude, c.longitude]} 
                icon={createCustomMarker(c.province)}
              >
                <Popup className="premium-popup">
                  <div className="min-w-[220px] p-1">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-semibold tracking-wider uppercase opacity-40">
                        {c.service_id}
                      </span>
                      <div className="badge badge-neutral badge-outline font-semibold text-xs px-1.5 py-0.5 h-auto rounded-md">
                        {c.grade}
                      </div>
                    </div>
                    
                    <h4 className="text-sm font-semibold tracking-tight text-base-content mb-0.5">{c.brand_site}</h4>
                    <p className="text-xs font-medium text-base-content/60 mb-3">{c.company_name}</p>
                    
                    <div className="bg-base-200/50 border border-base-300 rounded-xl p-3 flex flex-col gap-2 mb-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-base-content/40 uppercase tracking-wider">Location</span>
                        <div className="text-sm font-medium text-base-content">{c.city || 'N/A'}</div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-base-content/40 uppercase tracking-wider">Type</span>
                        <div className="text-sm font-medium text-base-content">{c.service_type}</div>
                      </div>
                    </div>
                    
                    <div className="text-xs font-medium text-base-content/40 leading-relaxed italic border-t border-base-200 pt-2">
                      {c.address}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))
          ) : (
            troubleData
              .filter(t => t.latitude != null && t.longitude != null)
              .map((t) => (
              <CircleMarker
                key={t.id}
                center={[Number(t.latitude), Number(t.longitude)]}
                radius={getBubbleRadius(t.incident_count)}
                pathOptions={{
                  fillColor: getBubbleColor(t.incident_count),
                  color: 'white',
                  weight: 1,
                  fillOpacity: 0.7
                }}
              >
                <Popup className="premium-popup">
                  <div className="min-w-[220px] p-1">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-semibold tracking-wider text-error uppercase">💥 Area Pattern</span>
                      <div className="badge badge-error font-semibold text-xs px-2 py-0.5 h-auto rounded-full">
                        {t.incident_count} Cases
                      </div>
                    </div>
                    <h4 className="text-sm font-semibold tracking-tight text-base-content mb-0.5">{t.brand_site}</h4>
                    <p className="text-xs font-medium text-base-content/60 mb-3">{t.company_name}</p>
                    
                    <div className="bg-base-200/50 border border-base-300 rounded-xl p-3.5 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs">
                         <span className="font-semibold text-base-content/40 uppercase tracking-wider text-xs">Analysis Period</span>
                         <span className="font-bold text-base-content text-right">{formatDate(startDate)} to {formatDate(endDate)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                         <span className="font-semibold text-base-content/40 uppercase tracking-wider text-xs">Last Incident</span>
                         <span className="font-bold text-base-content">{t.last_incident_at ? formatDateTime(t.last_incident_at) : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))
          )}
        </MapContainer>
        
        <style>{`
          .premium-popup .leaflet-popup-content-wrapper {
            border-radius: 1.25rem;
            padding: 4px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            border: 1px solid var(--color-base-300);
            background: var(--color-base-100);
          }
          .premium-popup .leaflet-popup-tip {
             background: var(--color-base-100);
             border: 1px solid var(--color-base-300);
          }
        `}</style>
      </div>
    </div>
  );
}
