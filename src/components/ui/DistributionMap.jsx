
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
    <div className="section-card" style={{ height: '700px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ 
        padding: '1rem', 
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-card)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Network Segments Map</h3>
          
          {(isProcessing || geocodingStatus.active) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.25rem 0.75rem', background: 'var(--bg-elevated)', borderRadius: '99px', border: '1px solid var(--border)' }}>
              <div className="spinner spinner-xs"></div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {geocodingStatus.active 
                   ? `Auto-Geocoding Segments: ${geocodingStatus.current}/${geocodingStatus.total}`
                   : `Loading Infrastructure Map...`
                }
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="btn-group" style={{ marginRight: '0.5rem' }}>
            <button 
              className={`btn btn-sm ${viewMode === 'normal' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('normal')}
            >
              <Network size={14} /> Normal
            </button>
            <button 
              className={`btn btn-sm ${viewMode === 'trouble' ? 'btn-danger' : 'btn-ghost'}`}
              onClick={() => setViewMode('trouble')}
            >
              <MapIcon size={14} /> Trouble
            </button>
          </div>

          {viewMode === 'trouble' && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              marginRight: '1rem', 
              padding: '0.25rem 0.5rem', 
              background: 'var(--bg-elevated)', 
              borderRadius: '8px', 
              border: '1px solid var(--border)' 
            }}>
              <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
              <input 
                type="date" 
                className="form-control form-control-xs" 
                style={{ width: '130px', border: 'none', background: 'transparent' }} 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
              <input 
                type="date" 
                className="form-control form-control-xs" 
                style={{ width: '130px', border: 'none', background: 'transparent' }} 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
              />
            </div>
          )}

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search ODP, POP, or BTS..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '200px', paddingLeft: '2.5rem' }}
              />
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Search size={14} />
              </span>
            </div>
            <button type="submit" className="btn btn-primary">Locate</button>
            <button 
              type="button" 
              className={`btn ${geocodingStatus.active ? 'btn-disabled' : 'btn-ghost'}`}
              onClick={startAutoGeocode}
              title="Sync coordinates for nodes without 📍"
              style={{ fontSize: '0.75rem', padding: '0 0.75rem' }}
            >
              {geocodingStatus.active ? 'Syncing...' : '🔄 Sync'}
            </button>
          </form>
        </div>
      </header>

      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer 
          center={SEMARANG_CENTER} 
          zoom={12} 
          style={{ height: '100%', width: '100%' }}
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
                  <div style={{ minWidth: '200px', padding: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      {p.type === 'Fiber Optic' ? <Database size={16} color="#4f46e5" /> : <Network size={16} color="#d97706" />}
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{p.level_4 || p.level_2 || 'Node'}</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {p.type === 'Fiber Optic' ? (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          padding: '8px',
                          background: 'var(--bg-elevated)',
                          borderRadius: '6px',
                          border: '1px solid var(--border)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>POP:</span> <strong>{p.level_1}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>OSC:</span> <strong>{p.level_2}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>ODC:</span> <strong>{p.level_3}</strong></div>
                        </div>
                      ) : (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          padding: '8px',
                          background: 'var(--bg-elevated)',
                          borderRadius: '6px',
                          border: '1px solid var(--border)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>BTS Site:</span> <strong>{p.level_1}</strong></div>
                        </div>
                      )}
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>
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
                    <div style={{ minWidth: '220px', padding: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                          <AlertTriangle size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{p.level_4 || p.level_2}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Infrastructure Trouble Spot</div>
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Frekunsi Trouble:</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color }}>{p.incident_count}x</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status Terakhir:</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Terdeteksi</span>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '2px' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>LAST INCIDENT</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)' }}>{formatDateTime(p.last_incident_at)}</div>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })
          )}
        </MapContainer>

        {/* Legend */}
        <div style={{ 
          position: 'absolute', 
          bottom: '20px', 
          left: '20px', 
          zIndex: 1000, 
          background: 'var(--bg-card)', 
          padding: '10px 14px', 
          borderRadius: '10px', 
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {viewMode === 'normal' ? (
            <>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '2px' }}>INFRASTRUCTURE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4f46e5' }}></div>
                <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Fiber Optic (ODP)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706' }}></div>
                <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Wireless (Node)</span>
              </div>
              <div style={{ marginTop: '4px', borderTop: '1px solid var(--border)', paddingTop: '6px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Showing <strong>{points.length}</strong> active segments
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>TROUBLE INTENSITY</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }}></div>
                <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>High (&gt;5)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }}></div>
                <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Medium (3-5)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308' }}></div>
                <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Low (1-2)</span>
              </div>
            </>
          )}
        </div>

        <style>{`
          .premium-popup .leaflet-popup-content-wrapper {
            border-radius: 12px;
            padding: 4px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            border: 1px solid var(--border);
            background: var(--bg-card);
          }
          .custom-marker-odp {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          @keyframes trouble-pulse {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 0.4; }
            100% { transform: scale(1); opacity: 0.8; }
          }
          .pulse-marker {
            animation: trouble-pulse 2s infinite ease-in-out;
          }
        `}</style>
      </div>
    </div>
  );
}
