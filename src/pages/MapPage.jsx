import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../utils/api.js';
import { PageSpinner, SectionCard } from '../components/ui/index.jsx';
import { Map as MapIcon, Users, Search, Filter, ArrowRight } from 'lucide-react';

const SEMARANG_COORD = [-6.9932, 110.4203];

const PROVINCE_COLORS = {
  'Jawa Tengah': '#3b82f6',
  'DI Yogyakarta': '#ef4444',
  'DKI Jakarta': '#10b981',
  'Jawa Barat': '#f59e0b',
  'Jawa Timur': '#8b5cf6',
  'Sumatera Selatan': '#ec4899',
  'Sulawesi Selatan': '#6366f1',
  'Lainnya': '#94a3b8'
};

// Create a custom icon with color
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
    popupAnchor: [0, -20]
  });
};

function SetViewOnSelect({ coords, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView(coords, zoom || 15, { animate: true });
  }, [coords, zoom, map]);
  return null;
}

export default function MapPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [viewCoords, setViewCoords] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getCustomers();
        // Filter those with valid coordinates
        const valid = data.filter(c => c.latitude && c.longitude);
        
        // Background loading simulation for "progress" feel if data is large
        // But for 1k records it's instant, so we simulate a bit to show the user the requested "bg loading"
        setCustomers([]);
        const batchSize = 100;
        for (let i = 0; i < valid.length; i += batchSize) {
          const chunk = valid.slice(i, i + batchSize);
          setCustomers(prev => [...prev, ...chunk]);
          setLoadingProgress(Math.round(((i + batchSize) / valid.length) * 100));
          await new Promise(r => setTimeout(r, 50)); // Tiny delay for UI update
        }
      } catch (err) {
        console.error('Failed to load map data', err);
      } finally {
        setLoading(false);
        setLoadingProgress(100);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return customers
      .filter(c => {
        const matchSearch = (c.brand_site + c.company_name).toLowerCase().includes(search.toLowerCase());
        const matchCity = !selectedCity || c.city === selectedCity;
        return matchSearch && matchCity;
      })
      .sort((a, b) => {
        // Prioritize Semarang
        const aIsSemarang = a.city === 'Semarang';
        const bIsSemarang = b.city === 'Semarang';
        if (aIsSemarang && !bIsSemarang) return -1;
        if (!aIsSemarang && bIsSemarang) return 1;
        return 0;
      });
  }, [customers, search, selectedCity]);

  const citySummary = useMemo(() => {
    const counts = {};
    customers.forEach(c => {
      const city = c.city || 'Lainnya';
      counts[city] = (counts[city] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [customers]);

  if (loading && customers.length === 0) {
    return <PageSpinner />;
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MapIcon size={24} /> Customer Distribution Map
          </div>
          <div className="page-subtitle">Visualizing {customers.length} locations across Indonesia</div>
        </div>
        {loadingProgress < 100 && (
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 20, padding: '4px 12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, marginBottom: 2 }}>LOADING MARKERS...</div>
            <div style={{ width: 100, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${loadingProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }}></div>
            </div>
          </div>
        )}
      </div>

      <div className="layout-with-aside">
        <div className="page-stack">
          {/* Map Container */}
          <SectionCard noPadding style={{ height: '600px', minHeight: '600px', position: 'relative', overflow: 'hidden', border: '2px solid var(--border-strong)' }}>
            <MapContainer center={SEMARANG_COORD} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <SetViewOnSelect coords={viewCoords} />
              {filtered.map(c => (
                <Marker 
                  key={c.id} 
                  position={[c.latitude, c.longitude]} 
                  icon={createCustomIcon(PROVINCE_COLORS[c.province] || PROVINCE_COLORS['Lainnya'])}
                >
                  <Popup>
                    <div style={{ padding: '4px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.9rem', marginBottom: 4 }}>{c.brand_site}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{c.company_name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 8, fontStyle: 'italic' }}>{c.address}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <span style={{ fontSize: '0.65rem', background: '#eee', padding: '2px 6px', borderRadius: 4 }}>{c.city}</span>
                        <span style={{ fontSize: '0.65rem', background: PROVINCE_COLORS[c.province] + '22', color: PROVINCE_COLORS[c.province], padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{c.province}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            
            {/* Search Overlay on Map */}
            <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, display: 'flex', gap: 8 }}>
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '0.5rem', display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'var(--shadow-lg)', minWidth: 280 }}>
                <Search size={14} color="var(--text-muted)" />
                <input 
                  type="text" 
                  placeholder="Search site or customer..." 
                  className="form-control" 
                  style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.85rem' }} 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </SectionCard>

          {/* Summary Tables */}
          <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <SectionCard title={<span><Users size={16} /> Regional Distribution</span>}>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>City / Regency</th>
                      <th className="text-right">Total Sites</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {citySummary.map(city => (
                      <tr key={city.name} className={selectedCity === city.name ? 'active' : ''} onClick={() => setSelectedCity(city.name === selectedCity ? '' : city.name)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 600 }}>{city.name}</td>
                        <td className="text-right">{city.count}</td>
                        <td className="text-right"><ArrowRight size={12} opacity={0.5} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title={<span><Filter size={16} /> Search & Selection</span>}>
               <div className="page-stack" style={{ maxMaxHeight: '400px', overflowY: 'auto' }}>
                  {filtered.slice(0, 100).map(c => (
                    <div 
                      key={c.id} 
                      className="list-item" 
                      style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => setViewCoords([c.latitude, c.longitude])}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.brand_site}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.city}, {c.province}</div>
                    </div>
                  ))}
                  {filtered.length > 100 && <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Show 100 of {filtered.length} matches</div>}
                  {filtered.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No sites found</div>}
               </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
