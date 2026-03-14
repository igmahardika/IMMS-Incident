import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Helper to center map
function AutoCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// Coordinate Picker component
function LocationMarker({ onLocationSelect, position }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });

  return position ? (
    <CircleMarker 
      center={position} 
      radius={10}
      pathOptions={{ fillColor: '#3b82f6', color: '#fff', weight: 2, fillOpacity: 0.8 }}
    >
      <Popup>Selected Location</Popup>
    </CircleMarker>
  ) : null;
}

export function CustomerMap({ customers = [], onMarkerClick, onLocationSelect, pickerMode = false, pickPosition = null, center = [-6.9667, 110.4167], zoom = 13 }) {
  return (
    <div className="customer-map-container" style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        {!pickerMode ? (
          <>
            <AutoCenter center={center} />
            {customers.map(c => (
              c.latitude && c.longitude && (
                <CircleMarker 
                  key={c.id} 
                  center={[c.latitude, c.longitude]} 
                  radius={8}
                  pathOptions={{ 
                    fillColor: c.grade === 'VIP' ? '#a78bfa' : c.grade === 'Gold' ? '#f59e0b' : '#3b82f6', 
                    color: '#fff', 
                    weight: 2, 
                    fillOpacity: 0.9 
                  }}
                  eventHandlers={{ click: () => onMarkerClick && onMarkerClick(c) }}
                >
                  <Popup>
                    <div style={{ padding: '4px', minWidth: '150px' }}>
                      <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', color: 'var(--text-primary)' }}>{c.brand_site}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.company_name}</span>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                        <span style={{ fontSize: '0.65rem', background: 'var(--accent-light)', color: 'white', padding: '1px 4px', borderRadius: '3px' }}>{c.grade}</span>
                        <span style={{ fontSize: '0.65rem', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1px 4px', borderRadius: '3px' }}>{c.service_type}</span>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            ))}
          </>
        ) : (
          <LocationMarker onLocationSelect={onLocationSelect} position={pickPosition} />
        )}
      </MapContainer>
    </div>
  );
}
