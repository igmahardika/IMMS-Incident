import React, { useMemo } from 'react';
import { MapPin, Globe, TrendingUp, Users, Activity, Crosshair } from 'lucide-react';
import { cn } from '../../lib/utils.js';

/**
 * Spatial Analyst Panel - High-Density Geographical Analytics
 * Docked panel for spatial distribution breakdown.
 */

const MiniStatCard = ({ label, val, icon, color }) => {
  const IconComponent = icon;

  return (
    <div className="flex flex-col gap-1 p-3 bg-foreground/[0.02] border border-foreground/[0.04] rounded-xl hover:bg-foreground/[0.04] transition-all group">
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground/30 font-mono leading-none">{label}</span>
        <IconComponent size={12} className={cn("opacity-20 group-hover:opacity-100 transition-opacity", color)} />
      </div>
      <span className="text-sm font-black tracking-tighter text-foreground/80 leading-none uppercase tabular-nums">{val}</span>
    </div>
  );
};

export default function GeoSummary({ customers }) {
  const stats = useMemo(() => {
    const cityCounts = customers.reduce((acc, c) => {
      if (!c.city) return acc;
      acc[c.city] = (acc[c.city] || 0) + 1;
      return acc;
    }, {});

    const sorted = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1]);
    
    const totalMapped = customers.filter(c => c.latitude && c.longitude).length;
    const totalWithCity = Object.values(cityCounts).reduce((a, b) => a + b, 0);

    return { sorted, totalMapped, totalWithCity };
  }, [customers]);

  if (stats.sorted.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-4 bg-foreground/[0.01]">
        <Globe size={48} className="text-foreground/10" />
        <div className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.2em] leading-relaxed italic max-w-[180px]">
          Registry currently holds zero spatial telemetry nodes.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background border-l border-foreground/[0.08] w-[320px] shrink-0 overflow-hidden font-sans">
      <header className="px-5 py-4 border-b border-foreground/[0.04] flex flex-col gap-1 shrink-0">
        <div className="flex items-center gap-2">
           <Crosshair size={14} className="text-primary" />
           <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground/80">Spatial Analytics</h3>
        </div>
        <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest italic leading-tight">Geographical Density Registry</p>
      </header>

      {/* Analyst Overview */}
      <div className="p-4 grid grid-cols-2 gap-2 shrink-0 border-b border-foreground/[0.04] bg-foreground/[0.01]">
         <MiniStatCard label="Mapped Nodes" val={stats.totalMapped} icon={Users} color="text-primary" />
         <MiniStatCard label="Coverage" val={stats.sorted.length} icon={TrendingUp} color="text-success" />
      </div>

      {/* Density Breakdown */}
      <div className="flex-1 overflow-auto custom-scrollbar p-1">
        <div className="flex flex-col py-3">
          <span className="px-4 text-[9px] font-black text-foreground/20 uppercase tracking-[0.25em] mb-3 leading-none flex items-center gap-2">
            <MapPin size={10} /> Regency Distribution
          </span>
          <div className="flex flex-col px-1">
            {stats.sorted.map(([city, count]) => {
              const percentage = ((count / stats.totalWithCity) * 100).toFixed(1);
              return (
                <div 
                  key={city} 
                  className="group px-4 py-3 rounded-xl hover:bg-foreground/[0.03] transition-all flex flex-col gap-2 relative overflow-hidden"
                >
                  <div className="flex justify-between items-baseline min-w-0 relative z-10">
                    <span className="text-[10px] font-black text-foreground/60 tracking-tight uppercase truncate mr-2">{city}</span>
                    <span className="text-[10px] font-black text-primary font-mono shrink-0">{count}n</span>
                  </div>

                  <div className="flex items-center gap-2 relative z-10">
                    <div className="flex-1 h-1 bg-foreground/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/40 rounded-full transition-all duration-1000 group-hover:bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.3)]"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-[9px] font-bold text-foreground/30 font-mono shrink-0">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="p-4 border-t border-foreground/[0.04] bg-foreground/[0.02] shrink-0">
         <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-background border border-foreground/[0.05]">
            <Activity size={12} className="text-success animate-pulse shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40 leading-none">Scanning Active Nodes</span>
         </div>
      </footer>
    </div>
  );
}
