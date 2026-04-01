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
      <div className="card bg-base-200 border border-base-300 shadow-sm" style={{ padding: '2rem', textAlign: 'center' }}>
        <Globe size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          No geographical distribution data available. 
          <br />Use the Map View to trigger auto-geocoding.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" style={{ gap: '1.5rem' }}>
      {/* Hero Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1rem' 
      }}>
        <div className="card bg-base-200 border border-base-300 shadow-sm" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ padding: '0.75rem', background: 'var(--primary-subtle)', borderRadius: '12px', color: 'var(--primary)' }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Infrastructure</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.totalMapped.toLocaleString()} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Mapped Nodes</span></div>
          </div>
        </div>

        <div className="card bg-base-200 border border-base-300 shadow-sm" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ padding: '0.75rem', background: '#10b98122', borderRadius: '12px', color: '#10b981' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Network Coverage</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.sorted.length} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Cities & Regencies</span></div>
          </div>
        </div>
      </div>

      {/* City Grid */}
      <div className="card bg-base-200 border border-base-300 shadow-sm">
        <header style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} className="text-primary" />
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Geographical Distribution</h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updated real-time from geocoding task</span>
        </header>

        <div style={{ 
          padding: '1.5rem',
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '1rem' 
        }}>
          {stats.sorted.map(([city, count]) => {
            const percentage = ((count / stats.totalWithCity) * 100).toFixed(1);
            return (
              <div 
                key={city} 
                className="geo-card"
                style={{ 
                  padding: '1.25rem', 
                  background: 'var(--bg-elevated)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '16px',
                  transition: 'all 0.2s ease',
                  cursor: 'default',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{city}</div>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 800, 
                    color: 'var(--primary)', 
                    background: 'var(--primary-subtle)', 
                    padding: '2px 8px', 
                    borderRadius: '20px' 
                  }}>
                    {percentage}%
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{count}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>sites</span>
                </div>

                {/* Progress Mini Bar */}
                <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', marginTop: '1rem' }}>
                  <div style={{ 
                    width: `${percentage}%`, 
                    height: '100%', 
                    background: 'var(--primary)', 
                    borderRadius: '2px',
                    boxShadow: '0 0 8px var(--primary-subtle)'
                  }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .geo-card:hover {
          transform: translateY(-4px);
          border-color: var(--primary);
          box-shadow: var(--shadow-lg);
          background: var(--bg-card);
        }
      `}</style>
    </div>
  );
}
