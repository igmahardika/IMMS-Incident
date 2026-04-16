import React from 'react';
import { SectionCard } from '../../../components/ui/index.jsx';

export function TopologyReviewPanel({ topologyReview }) {
  if (!topologyReview) return null;

  return (
    <SectionCard
      title="Workbook Coordinate Review"
      subtitle="UPDATE.xlsx has already been applied. Conflicting workbook coordinates are discarded automatically, so this queue focuses on sync coverage and unmatched active labels."
    >
      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Survey Linked</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{topologyReview.matched || 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">Topology nodes with workbook coordinate evidence.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Live Coordinates Filled</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{topologyReview.actual_filled || 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">Nodes that were previously blank and now have usable map coordinates.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Unmatched Labels</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{topologyReview.unmatched || 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">Workbook ODP labels that do not exist in the active registry.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-foreground">Unmatched ODP labels</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(topologyReview.unmatched_examples || []).length ? (
              topologyReview.unmatched_examples.slice(0, 20).map((item) => (
                <span key={item} className="rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
                  {item}
                </span>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">All workbook labels were matched to active topology nodes.</p>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
