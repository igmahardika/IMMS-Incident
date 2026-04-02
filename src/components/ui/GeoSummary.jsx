import React, { useMemo } from 'react';
import { MapPin, Globe, TrendingUp, Users } from 'lucide-react';

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
      <div className="card bg-base-200 border border-base-300 shadow-sm flex flex-col items-center justify-center p-12 text-center gap-4">
        <Globe size={48} className="text-base-content/20" />
        <div className="text-sm font-medium text-base-content/50 leading-relaxed">
          No geographical distribution data available. 
          <br />Use the Map View to trigger auto-geocoding.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="card bg-base-100 border border-base-300 shadow-sm p-6 flex flex-row items-center gap-5 border-l-4 border-l-primary relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Users size={80} />
          </div>
          <div className="p-3 bg-primary/10 rounded-2xl text-primary shrink-0">
            <Users size={24} />
          </div>
          <div className="z-10">
            <div className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-1">Total Infrastructure</div>
            <div className="text-2xl font-bold tracking-tight">
              {stats.totalMapped.toLocaleString()} <span className="text-xs font-semibold text-base-content/40 ml-1 uppercase tracking-wider">Mapped Nodes</span>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300 shadow-sm p-6 flex flex-row items-center gap-5 border-l-4 border-l-success relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <TrendingUp size={80} />
          </div>
          <div className="p-3 bg-success/10 rounded-2xl text-success shrink-0">
            <TrendingUp size={24} />
          </div>
          <div className="z-10">
            <div className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-1">Network Coverage</div>
            <div className="text-2xl font-bold tracking-tight">
              {stats.sorted.length} <span className="text-xs font-semibold text-base-content/40 ml-1 uppercase tracking-wider">Cities & Regencies</span>
            </div>
          </div>
        </div>
      </div>

      {/* City Grid */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <header className="px-6 py-4 border-b border-base-200 flex justify-between items-center bg-base-100/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <MapPin size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-tight text-base-content/80">Geographical Distribution</h3>
              <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mt-0.5">Updated real-time from geocoding task</p>
            </div>
          </div>
        </header>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-base-200/30">
          {stats.sorted.map(([city, count]) => {
            const percentage = ((count / stats.totalWithCity) * 100).toFixed(1);
            return (
              <div 
                key={city} 
                className="group p-5 bg-base-100 border border-base-200 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="font-semibold text-sm tracking-tight text-base-content group-hover:text-primary transition-colors">{city}</div>
                  <div className="badge badge-primary badge-outline font-semibold text-xs px-1.5 py-0.5 h-auto">
                    {percentage}%
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="text-2xl font-bold tracking-tighter text-base-content">{count}</span>
                  <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">sites</span>
                </div>

                {/* Progress Mini Bar */}
                <div className="w-full h-1.5 bg-base-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000 group-hover:bg-primary"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
