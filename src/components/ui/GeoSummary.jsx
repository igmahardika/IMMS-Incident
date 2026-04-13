import React, { useMemo } from 'react';
import { Activity, Globe, MapPin, TrendingUp, Users } from 'lucide-react';

function SummaryStat({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {React.createElement(icon, { className: 'h-4 w-4 text-muted-foreground' })}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

export default function GeoSummary({ customers = [] }) {
  const stats = useMemo(() => {
    const cityCounts = customers.reduce((accumulator, customer) => {
      if (!customer.city) return accumulator;
      accumulator[customer.city] = (accumulator[customer.city] || 0) + 1;
      return accumulator;
    }, {});

    const sorted = Object.entries(cityCounts).sort((left, right) => right[1] - left[1]);
    const totalMapped = customers.filter((customer) => customer.latitude && customer.longitude).length;
    const totalWithCity = Object.values(cityCounts).reduce((sum, value) => sum + value, 0);

    return { sorted, totalMapped, totalWithCity };
  }, [customers]);

  if (stats.sorted.length === 0) {
    return (
      <aside className="flex w-[19rem] shrink-0 items-center justify-center border-l border-border bg-card p-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/40">
            <Globe className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No mapped customer data</p>
            <p className="text-sm text-muted-foreground">Add customer coordinates to unlock geographic insights.</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-[19rem] shrink-0 flex-col border-l border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-base font-semibold tracking-tight text-foreground">Geographic Summary</h3>
        <p className="mt-1 text-sm text-muted-foreground">Customer density by city and mapped coverage.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-border p-4">
        <SummaryStat label="Mapped Nodes" value={stats.totalMapped} icon={Users} />
        <SummaryStat label="Cities" value={stats.sorted.length} icon={TrendingUp} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-3 flex items-center gap-2 px-1">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Top city distribution</p>
        </div>

        <div className="space-y-2">
          {stats.sorted.map(([city, count]) => {
            const percentage = stats.totalWithCity ? (count / stats.totalWithCity) * 100 : 0;

            return (
              <div key={city} className="rounded-lg border border-border bg-background p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{city}</p>
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% of mapped registry</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-foreground">{count}</p>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <Activity className="h-4 w-4 text-success" />
          <p className="text-sm text-muted-foreground">Map analytics are based on the current filtered registry.</p>
        </div>
      </div>
    </aside>
  );
}
