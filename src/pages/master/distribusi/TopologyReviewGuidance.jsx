import React from 'react';
import { SectionCard } from '../../../components/ui/index.jsx';

export function TopologyReviewGuidance() {
  return (
    <SectionCard
      title="Review Guidance"
      subtitle="Use unmatched workbook labels as a cleanup queue, then continue editing the live topology registry from Explorer or Map."
      className="flex-1"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">1. Fix unmatched labels</p>
          <p className="mt-2 text-sm text-muted-foreground">
            If a workbook ODP label is valid, add or rename the active topology node in Explorer so future syncs can attach cleanly.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">2. Keep project names authoritative</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The active topology registry stays as the source of truth for node names. Workbook coordinates only enrich nodes that already match.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">3. Maintain in-app only</p>
          <p className="mt-2 text-sm text-muted-foreground">
            After this enrichment, keep live coordinates, survey evidence, and linked customers updated directly from Nexaris.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
