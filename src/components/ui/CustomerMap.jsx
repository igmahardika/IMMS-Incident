import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../../utils/api';

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

  // Auto-Geocoding Logic
  useEffect(() => {
    if (geocodingRef.current) return;
    
    const startAutoGeocode = async () => {
      try {
        const missing = await api.getCustomersWithMissingCoords();
        if (missing && missing.length > 0) {
          geocodingRef.current = true;
          setGeocodingStatus({ active: true, current: 0, total: missing.length });
          
          // Process in small batches of 5 to avoid overloading/timeout
          const batchSize = 5;
          for (let i = 0; i < missing.length; i += batchSize) {
            const batch = missing.slice(i, i + batchSize);
            const ids = batch.map(m => m.id);
            await api.autoGeocodeCustomers(ids);
            
            setGeocodingStatus(prev => ({ ...prev, current: i + batch.length }));
          }
          if (onRefresh) onRefresh(); 
          setGeocodingStatus({ active: false, current: 0, total: 0 });
        }
      } catch (err) {
        console.error('Auto-Geocoding error:', err);
        setGeocodingStatus({ active: false, current: 0, total: 0 });
      }
    };

    startAutoGeocode();
  }, [onRefresh]);

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
    <div className="section-card" style={{ height: '700px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ 
        padding: '1rem', 
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Network Infrastructure Map</h3>
          
          {(isProcessing || geocodingStatus.active || isTroubleLoading) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.25rem 0.75rem', background: 'var(--bg-elevated)', borderRadius: '99px', border: '1px solid var(--border)' }}>
              <div className="spinner spinner-xs"></div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {geocodingStatus.active 
                   ? `Pencarian Koordinat Otomatis: ${geocodingStatus.current}/${geocodingStatus.total}`
                  : mapMode === 'trouble' && isTroubleLoading
                  ? 'Loading Trouble Patterns...'
                  : `Processing Nodes: ${Math.round((renderedCount / filteredCustomers.length) * 100 || 0)}%`
                }
              </span>
            </div>
          )}
          {mapMode === 'trouble' && !isTroubleLoading && (
            <div style={{ 
              fontSize: '0.75rem', 
              fontWeight: 600, 
              color: troubleError ? '#ef4444' : troubleData.length > 0 ? '#ef4444' : 'var(--text-muted)', 
              background: troubleError ? 'rgba(239, 68, 68, 0.1)' : troubleData.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-elevated)', 
              padding: '0.25rem 0.75rem', 
              borderRadius: '99px', 
              border: '1px solid ' + (troubleError || troubleData.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'var(--border)') 
            }}>
              {troubleError 
                ? `❌ Error: ${troubleError}`
                : troubleData.length > 0 
                ? `🎯 ${troubleData.length} Trouble Spots Detected` 
                : `ℹ️ No Trouble Spots found (${startDate.split(' ')[0]} to ${endDate.split(' ')[0]})`}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {showTroubleMode && (
            <div className="btn-group" style={{ background: 'var(--bg-elevated)', padding: '2px', borderRadius: '8px' }}>
              {!hideCustomerPins && (
                <button 
                  className={`btn btn-xs ${mapMode === 'customers' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setMapMode('customers')}
                  style={{ fontSize: '0.7rem' }}
                >
                  Customer Pins
                </button>
              )}
              <button 
                className={`btn btn-xs ${mapMode === 'trouble' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setMapMode('trouble')}
                style={{ fontSize: '0.7rem' }}
              >
                🔥 Trouble Spots
              </button>
            </div>
          )}
          
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search Site, Service ID, or City..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '320px', paddingLeft: '2.5rem' }}
            />
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
          </div>
            <button type="submit" className="btn btn-primary">Locate</button>
          </form>
        </div>
      </header>

      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer 
          center={semarangCenter} 
          zoom={12} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
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
                  <div style={{ minWidth: '220px', padding: '4px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <span style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 800, 
                        textTransform: 'uppercase',
                        color: PROVINCE_COLORS[c.province] || '#666',
                        letterSpacing: '0.05em'
                      }}>
                        {c.service_id}
                      </span>
                      <span style={{ 
                        fontSize: '0.65rem',
                        background: 'var(--bg-elevated)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)'
                      }}>{c.grade}</span>
                    </div>
                    
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c.brand_site}</h4>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.company_name}</p>
                    
                    <div style={{ 
                      fontSize: '0.7rem', 
                      padding: '8px',
                      background: 'var(--bg-elevated)',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      marginBottom: '8px'
                    }}>
                      <div style={{ marginBottom: '4px' }}><strong>📍 Location:</strong> {c.city || 'N/A'}</div>
                      <div><strong>🛠️ Type:</strong> {c.service_type}</div>
                    </div>
                    
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: '1.4' }}>
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
                  <div style={{ minWidth: '220px', padding: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444' }}>💥 {t.incident_count > 10 ? 'HIGH' : 'ACTIVE'} FREQUENCY AREA</span>
                      <span style={{ 
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: getBubbleColor(t.incident_count),
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '99px'
                      }}>{t.incident_count} Cases</span>
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{t.brand_site}</h4>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.company_name}</p>
                    
                    <div style={{ 
                      fontSize: '0.7rem', 
                      padding: '8px',
                      background: 'var(--bg-elevated)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      marginBottom: '4px'
                    }}>
                      <div><strong>📅 Analysis Period:</strong> {startDate.split(' ')[0]} to {endDate.split(' ')[0]}</div>
                      <div><strong>🕒 Last Incident:</strong> {t.last_incident_at ? new Date(t.last_incident_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))
          )}
        </MapContainer>
        
        <style>{`
          .premium-popup .leaflet-popup-content-wrapper {
            border-radius: 12px;
            padding: 8px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            border: 1px solid var(--border);
          }
          .premium-popup .leaflet-popup-tip {
            box-shadow: none;
            border: 1px solid var(--border);
          }
        `}</style>
      </div>
    </div>
  );
}
