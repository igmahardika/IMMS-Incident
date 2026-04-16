import React from 'react';
import { Database, Search, ShieldCheck } from 'lucide-react';
import { CustomerStatCard } from './CustomerStatCard.jsx';

export function CustomerSyncReview({ reviewMetrics, stats }) {
  if (!reviewMetrics) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Workbook sync report is not available yet.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border p-4 md:p-6">
        <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CustomerStatCard
            label="Survey Linked"
            value={stats.withSurvey}
            meta="Customer rows carrying imported survey coordinates"
            icon={Database}
            tone="info"
          />
          <CustomerStatCard
            label="Topology Linked"
            value={stats.withTopologyRefs}
            meta="Customers already linked to OSC / ODC / ODP"
            icon={ShieldCheck}
            tone="success"
          />
          <CustomerStatCard
            label="Unmatched Rows"
            value={reviewMetrics.unmatched || 0}
            meta="Workbook rows that could not be safely matched"
            icon={Search}
            tone="default"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="space-y-6">
          <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
            Conflicting workbook coordinates are discarded automatically. Continue cleanup from unmatched rows or maintain customer coordinates directly from the registry.
          </div>
        </div>
      </div>
    </div>
  );
}
