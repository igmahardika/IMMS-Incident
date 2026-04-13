import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../../utils/api.js';
import { Button, Spinner } from './index.jsx';
import { cn } from '../../lib/utils.js';
import { Search, AlertCircle, Users, Activity, RefreshCw } from 'lucide-react';

/**
 * Enhanced Customer Map - Spatial Visualization Protocol
 * Integrated with internal glassmorphism controls and multi-mode telemetry.
 */

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
        border: 2px solid white; 
        box-shadow: 0 0 10px ${color}44;
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
  showTroubleMode = true,
  startDate = '2026-01-01',
  endDate = '2026-02-28 23:59:59',
  hideCustomerPins = false
}) {
  const [isProcessing, setIsProcessing] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [geocodingStatus, setGeocodingStatus] = useState({ active: false, current: 0, total: 0 });
  const [mapMode, setMapMode] = useState(initialMode); // 'customers' | 'trouble'
  const [troubleData, setTroubleData] = useState([]);
  const semarangCenter = [-7.0051, 110.4381];
  const [viewState, setViewState] = useState({ center: semarangCenter, zoom: 12 });

  const filteredCustomers = useMemo(() => 
    customers.filter(c => c.latitude && c.longitude),
    [customers]
  );

  // Background Rendering Progress logic
  useEffect(() => {
    if (filteredCustomers.length === 0) {
      setIsProcessing(false);
      return;
    }
    setIsProcessing(true);
    const timeout = setTimeout(() => setIsProcessing(false), 800);
    return () => clearTimeout(timeout);
  }, [filteredCustomers.length]);

  const startAutoGeocode = async () => {
    if (geocodingStatus.active) return;
    try {
      const missing = await api.getCustomersWithMissingCoords();
      if (missing && missing.length > 0) {
        setGeocodingStatus({ active: true, current: 0, total: missing.length });
        const batchSize = 3;
        for (let i = 0; i < missing.length; i += batchSize) {
          const batch = missing.slice(i, i + batchSize);
          await api.autoGeocodeCustomers(batch.map(m => m.id));
          setGeocodingStatus(prev => ({ ...prev, current: Math.min(prev.total, i + batch.length) }));
        }
        if (onRefresh) onRefresh(); 
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeocodingStatus({ active: false, current: 0, total: 0 });
    }
  };

  useEffect(() => {
    if (mapMode === 'trouble' && showTroubleMode) {
      const fetchTroubleData = async () => {
        try {
          const data = await api.getTroubleMapData(startDate, endDate);
          setTroubleData(data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchTroubleData();
    }
  }, [mapMode, startDate, endDate, showTroubleMode]);

  const getBubbleColor = (count) => {
    if (count > 10) return '#ef4444';
    if (count > 5) return '#f97316';
    return '#eab308';
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const term = searchTerm.toLowerCase();
    const found = filteredCustomers.find(c => 
      (c.brand_site || '').toLowerCase().includes(term) || 
      (c.company_name || '').toLowerCase().includes(term) ||
      (c.service_id || '').toLowerCase().includes(term)
    );
    if (found) {
      setViewState({ center: [found.latitude, found.longitude], zoom: 16 });
    }
  };

  return (
    <div className="relative flex h-full min-h-[640px] flex-1 overflow-hidden bg-background animate-in fade-in duration-500">
      <MapContainer 
        center={semarangCenter} 
        zoom={12} 
        className="h-full w-full z-0 font-sans"
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
                <div className="min-w-[220px] p-1 font-sans">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] font-black tracking-widest uppercase text-foreground/40 font-mono">
                      {c.service_id}
                    </span>
                    <div className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                      {c.grade}
                    </div>
                  </div>
                  
                  <h4 className="text-[11px] font-black tracking-tight text-foreground uppercase leading-tight mb-0.5">{c.brand_site}</h4>
                  <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest mb-3 truncate italic">{c.company_name}</p>
                  
                  <div className="bg-foreground/[0.02] border border-foreground/[0.04] rounded-xl p-3 flex flex-col gap-2 mb-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-foreground/20 uppercase tracking-widest leading-none">Location Node</span>
                      <div className="text-[10px] font-black text-foreground/70 uppercase">{c.city || 'UNSET'}</div>
                    </div>
                  </div>
                  
                  <div className="text-[8px] font-bold text-foreground/20 leading-relaxed uppercase tracking-widest border-t border-foreground/[0.04] pt-2">
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
              radius={Math.min(Math.max(t.incident_count * 3, 8), 25)}
              pathOptions={{
                fillColor: getBubbleColor(t.incident_count),
                color: 'white',
                weight: 1.5,
                fillOpacity: 0.6
              }}
            >
              <Popup className="premium-popup">
                <div className="min-w-[220px] p-1 font-sans">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] font-black tracking-widest text-error uppercase flex items-center gap-1.5"><Activity size={10} strokeWidth={3}/> Pattern Alert</span>
                    <div className="bg-error font-black text-[8px] px-2 py-0.5 rounded-full text-white uppercase tracking-widest shadow-sm shadow-error/20">
                      {t.incident_count} Nodes
                    </div>
                  </div>
                  <h4 className="text-[11px] font-black tracking-tight text-foreground leading-tight mb-0.5 uppercase">{t.brand_site}</h4>
                  <p className="text-[9px] font-bold text-foreground/40 mb-3 truncate italic uppercase">{t.company_name}</p>
                  <div className="bg-error/[0.02] border border-error/10 rounded-xl p-3 flex flex-col gap-2">
                     <span className="text-[8px] font-black tracking-widest text-error/40 uppercase">Critical Cluster</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))
        )}
      </MapContainer>

      {/* Internal Glass Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap gap-2 pointer-events-none">
         {/* Left Controls: Mode & Status */}
         <div className="flex items-center gap-2 p-1 bg-background/60 backdrop-blur-xl border border-foreground/[0.08] shadow-2xl rounded-2xl pointer-events-auto ring-1 ring-white/20">
            <div className="flex items-center gap-1.5 px-3 border-r border-foreground/[0.04]">
               <Activity size={14} className={cn("transition-colors", isProcessing || geocodingStatus.active ? "text-primary animate-pulse" : "text-foreground/20")} />
               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/60 whitespace-nowrap">
                  {geocodingStatus.active ? `SYNCING [${geocodingStatus.current}/${geocodingStatus.total}]` : `SPATIAL_SYNC_OK`}
               </span>
            </div>
            
            <div className="flex gap-1">
               <button 
                  onClick={() => setMapMode('customers')}
                  className={cn(
                     "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                     mapMode === 'customers' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-foreground/40 hover:bg-foreground/[0.05]"
                  )}
               >
                  <Users size={12} className="inline mr-1.5" /> Nodes
               </button>
               {showTroubleMode && (
                  <button 
                     onClick={() => setMapMode('trouble')}
                     className={cn(
                        "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                        mapMode === 'trouble' ? "bg-error text-white shadow-lg shadow-error/20" : "text-foreground/40 hover:bg-foreground/[0.05]"
                     )}
                  >
                     <AlertCircle size={12} className="inline mr-1.5" /> Incidents
                  </button>
               )}
            </div>
         </div>

         {/* Right Controls: Search & Tools */}
         <div className="ml-auto flex items-center gap-2 pointer-events-auto">
            <form onSubmit={handleSearch} className="flex items-center gap-2 p-1 bg-background/60 backdrop-blur-xl border border-foreground/[0.08] shadow-2xl rounded-2xl ring-1 ring-white/20">
               <div className="relative flex items-center">
                  <Search className="absolute left-3 text-foreground/40" size={14} strokeWidth={3} />
                  <input 
                     type="text" 
                     className="bg-transparent border-none focus:ring-0 text-[10px] font-black w-48 pl-9 pr-3 py-1.5 placeholder:text-foreground/20 uppercase tracking-widest h-8" 
                     placeholder="Locate Node..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
               <button 
                  type="button"
                  onClick={startAutoGeocode}
                  className={cn(
                     "flex items-center justify-center w-8 h-8 rounded-xl transition-all",
                     geocodingStatus.active ? "bg-primary/20 text-primary" : "bg-foreground/[0.03] text-foreground/40 hover:text-primary hover:bg-primary/5"
                  )}
                  title="Resync Coordinates"
               >
                  <RefreshCw size={14} strokeWidth={2.5} className={cn(geocodingStatus.active && "animate-spin")} />
               </button>
            </form>
         </div>
      </div>

      <style>{`
        .leaflet-container { 
          background: transparent !important; 
          height: 100% !important;
          width: 100% !important;
        }
        .premium-popup .leaflet-popup-content-wrapper {
          border-radius: 1rem;
          padding: 4px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 1px solid var(--color-border);
          background: var(--color-background);
        }
        .premium-popup .leaflet-popup-tip {
           background: var(--color-background);
           border: 1px solid var(--color-border);
           border-top: none;
           border-left: none;
        }
        .premium-popup .leaflet-popup-content { margin: 12px; }
      `}</style>
    </div>
  );
}
