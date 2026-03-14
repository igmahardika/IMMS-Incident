import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon issues in React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

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
    <Marker position={position}>
      <Popup>Selected Location</Popup>
    </Marker>
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
                <Marker key={c.id} position={[c.latitude, c.longitude]} eventHandlers={{ click: () => onMarkerClick && onMarkerClick(c) }}>
                  <Popup>
                    <div style={{ padding: '4px' }}>
                      <strong style={{ display: 'block', fontSize: '1rem', marginBottom: '4px' }}>{c.brand_site}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.company_name}</span>
                      <div style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }}>
                         {c.grade} • {c.service_type}
                      </div>
                    </div>
                  </Popup>
                </Marker>
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
