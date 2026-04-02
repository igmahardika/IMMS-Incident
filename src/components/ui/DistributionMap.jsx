
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Network, Database, Search, Map as MapIcon, Layout, Info, Calendar, AlertTriangle } from 'lucide-react';
import { api, formatDateTime } from '../../utils/api';

const createODPIcon = (type) => {
  const color = type === 'Fiber Optic' ? '#4f46e5' : '#d97706';
  return new L.DivIcon({
    className: 'custom-marker-odp',
    html: `
      <div style="
        background-color: ${color}; 
        width: 14px; 
        height: 14px; 
        border-radius: 50%; 
        border: 2px solid white; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const SEMARANG_CENTER = [-7.0051, 110.4381];

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

export default function DistributionMap({ data, onRefresh }) {
  const [renderedCount, setRenderedCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewState, setViewState] = useState({ center: SEMARANG_CENTER, zoom: 12, id: 0 });
  const [geocodingStatus, setGeocodingStatus] = useState({ active: false, current: 0, total: 0 });
  
  // Trouble Mode State
  const [viewMode, setViewMode] = useState('normal'); // 'normal' | 'trouble'
  const [troubleData, setTroubleData] = useState([]);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-02-28'); // Set default to Feb 2026
  
  const geocodingRef = useRef(false);

  const points = useMemo(() => (data || []).filter(d => d.latitude && d.longitude), [data]);

  // Points were previously rendered in background batches, removing for stability as requested.
  const pointsToRender = useMemo(() => {
    if (viewMode === 'normal') return points;
    return [];
  }, [viewMode, points]);

  // Manual Trigger for Geocoding
  const startAutoGeocode = async () => {
    if (geocodingStatus.active) return;
    try {
      const missing = await api.getDistribusiWithMissingCoords();
      if (missing && missing.length > 0) {
        setGeocodingStatus({ active: true, current: 0, total: missing.length });
        
        const batchSize = 3;
        for (let i = 0; i < missing.length; i += batchSize) {
          const batch = missing.slice(i, i + batchSize);
          const ids = batch.map(m => m.id);
          await api.autoGeocodeDistribusi(ids);
          setGeocodingStatus(prev => ({ ...prev, current: i + batch.length }));
        }
        if (onRefresh) onRefresh(); 
      }
    } catch (err) {
      console.error('Auto-Geocoding distribution error:', err);
    } finally {
      setGeocodingStatus({ active: false, current: 0, total: 0 });
    }
  };

  // Load Trouble Data
  const loadTroubleData = async () => {
    setIsProcessing(true);
    try {
      const resp = await api.getDistributionTrouble(
        startDate ? `${startDate} 00:00:00` : '',
        endDate ? `${endDate} 23:59:59` : ''
      );
      setTroubleData(resp || []);
    } catch (err) {
      console.error('Failed to load distribution trouble data:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'trouble') {
      loadTroubleData();
    }
  }, [viewMode, startDate, endDate]);

  const troublePoints = useMemo(() => troubleData.filter(d => d.latitude && d.longitude), [troubleData]);

  const handleSearch = (e) => {
    e.preventDefault();
    const term = searchTerm.toLowerCase();
    const found = points.find(p => 
      (p.level_4 || '').toLowerCase().includes(term) || 
      (p.level_1 || '').toLowerCase().includes(term) ||
      (p.level_2 || '').toLowerCase().includes(term)
    );
    if (found) {
      setViewState({ 
        center: [found.latitude, found.longitude], 
        zoom: 16, 
        id: Date.now() 
      });
    }
  };

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm flex flex-col overflow-hidden h-[700px]">
      <header className="flex items-center justify-between flex-wrap gap-4 px-6 py-4 border-b border-base-200 bg-base-100/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold uppercase tracking-tight text-base-content/80">Network Segments Map</h3>
            <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mt-0.5 whitespace-nowrap">Active Infrastructure Nodes</p>
          </div>
          
          {(isProcessing || geocodingStatus.active) && (
            <div className="flex items-center gap-2.5 px-3 py-1 bg-primary/5 rounded-full border border-primary/10">
              <span className="loading loading-spinner loading-xs text-primary"></span>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                {geocodingStatus.active 
                   ? `Syncing: ${geocodingStatus.current}/${geocodingStatus.total}`
                   : `Loading Map...`
                }
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="join bg-base-200 p-1 rounded-xl">
            <button 
              className={`btn btn-xs join-item border-none ${viewMode === 'normal' ? 'btn-primary shadow-sm' : 'bg-transparent text-base-content/60'}`}
              onClick={() => setViewMode('normal')}
            >
              <Network size={12} /> Normal
            </button>
            <button 
              className={`btn btn-xs join-item border-none ${viewMode === 'trouble' ? 'btn-error shadow-sm' : 'bg-transparent text-base-content/60'}`}
              onClick={() => setViewMode('trouble')}
            >
              <AlertTriangle size={12} /> Trouble
            </button>
          </div>

          {viewMode === 'trouble' && (
            <div className="flex items-center gap-2 px-2 py-1 bg-base-200 rounded-xl border border-base-300">
              <Calendar size={12} className="text-base-content/40" />
              <input 
                type="date" 
                className="bg-transparent border-none text-sm font-medium text-base-content focus:outline-none w-24"
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
              />
              <span className="text-base-content/20 text-xs">—</span>
              <input 
                type="date" 
                className="bg-transparent border-none text-sm font-medium text-base-content focus:outline-none w-24"
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
              />
            </div>
          )}

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-base-content/40 pointer-events-none" />
              <input 
                type="text" 
                className="input input-bordered input-sm pl-9 w-48 font-medium" 
                placeholder="ODP, POP, or BTS..." 
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
          center={SEMARANG_CENTER} 
          zoom={12} 
          className="h-full w-full z-0"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <ZoomControl position="bottomright" />
          <ChangeView center={viewState.center} zoom={viewState.zoom} viewId={viewState.id} />
          
          {viewMode === 'normal' ? (
            pointsToRender.map((p) => (
              <Marker 
                key={p.id} 
                position={[p.latitude, p.longitude]} 
                icon={createODPIcon(p.type)}
              >
                <Popup className="premium-popup">
                  <div className="min-w-[200px] p-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.type === 'Fiber Optic' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>
                        {p.type === 'Fiber Optic' ? <Database size={16} /> : <Network size={16} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold tracking-tight text-base-content leading-none">{p.level_4 || p.level_2 || 'Node'}</span>
                        <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mt-1">{p.type}</span>
                      </div>
                    </div>
                    
                    <div className="bg-base-200/50 rounded-xl p-3 border border-base-300 flex flex-col gap-2">
                        {p.type === 'Fiber Optic' ? (
                          <>
                            <div className="flex justify-between items-center text-xs"><span className="font-semibold text-base-content/40 uppercase tracking-wider text-xs">POP</span> <strong className="text-base-content">{p.level_1}</strong></div>
                            <div className="flex justify-between items-center text-xs"><span className="font-semibold text-base-content/40 uppercase tracking-wider text-xs">OSC</span> <strong className="text-base-content">{p.level_2}</strong></div>
                            <div className="flex justify-between items-center text-xs"><span className="font-semibold text-base-content/40 uppercase tracking-wider text-xs">ODC</span> <strong className="text-base-content">{p.level_3}</strong></div>
                          </>
                        ) : (
                          <div className="flex justify-between items-center text-xs"><span className="font-semibold text-base-content/40 uppercase tracking-wider text-xs">BTS Site</span> <strong className="text-base-content">{p.level_1}</strong></div>
                        )}
                        <div className="border-t border-base-300 pt-2 mt-1 text-xs font-mono font-medium text-base-content/40 text-right">
                          {Number(p.latitude).toFixed(5)}, {Number(p.longitude).toFixed(5)}
                        </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))
          ) : (
            troublePoints.map((p) => {
              const radius = 5 + Math.min(p.incident_count * 3, 25);
              const color = p.incident_count > 5 ? '#ef4444' : p.incident_count > 2 ? '#f59e0b' : '#eab308';
              const variantClass = p.incident_count > 5 ? 'text-error bg-error/10 border-error/20' : p.incident_count > 2 ? 'text-warning bg-warning/10 border-warning/20' : 'text-accent bg-accent/10 border-accent/20';
              
              return (
                <CircleMarker
                  key={`trouble-${p.id}`}
                  center={[p.latitude, p.longitude]}
                  radius={radius}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.6,
                    color: color,
                    weight: 2
                  }}
                >
                  <Popup className="premium-popup">
                    <div className="min-w-[220px] p-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${variantClass.split(' ')[0]} ${variantClass.split(' ')[1]} border ${variantClass.split(' ')[2]}`}>
                          <AlertTriangle size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold tracking-tight text-base-content">{p.level_4 || p.level_2}</div>
                          <div className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mt-0.5">Infrastructure Trouble</div>
                        </div>
                      </div>

                      <div className="bg-base-200/50 rounded-xl p-3.5 border border-base-300 flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-base-content/40 uppercase tracking-wider text-xs">Frekunsi</span>
                          <span className={`text-sm font-semibold ${variantClass.split(' ')[0]}`}>{p.incident_count}x</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-base-content/40 uppercase tracking-wider text-xs">Last Incident</span>
                          <span className="font-bold text-base-content">{formatDateTime(p.last_incident_at)}</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })
          )}
        </MapContainer>

        {/* Legend Overlay */}
        <div className="absolute bottom-6 left-6 z-[1000] bg-base-100/80 backdrop-blur-md p-4 rounded-2xl border border-base-300 shadow-xl flex flex-col gap-2.5 min-w-[160px]">
          {viewMode === 'normal' ? (
            <>
              <div className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-1">Infrastructure</div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-primary/10"></div>
                <span className="text-xs font-semibold text-base-content/70">Fiber Optic (ODP)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-warning ring-4 ring-warning/10"></div>
                <span className="text-xs font-semibold text-base-content/70">Wireless (Node)</span>
              </div>
              <div className="mt-2 pt-2.5 border-t border-base-300 text-xs font-semibold text-base-content/30 uppercase tracking-wider text-center">
                {points.length} Active Nodes
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-1 text-error">Trouble Intensity</div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-error ring-4 ring-error/10"></div>
                <span className="text-xs font-semibold text-base-content/70">High (&gt;5 Events)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-warning ring-4 ring-warning/10"></div>
                <span className="text-xs font-semibold text-base-content/70">Medium (3-5)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-accent ring-4 ring-accent/10"></div>
                <span className="text-xs font-semibold text-base-content/70">Low (1-2)</span>
              </div>
            </>
          )}
        </div>

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
          .custom-marker-odp {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}</style>
      </div>
    </div>
  );
}
