import React from 'react';
import { SectionCard } from '../../../components/ui/index.jsx';

export function TopologyReviewPanel({ topologyReview }) {
  if (!topologyReview) return null;

  return (
    <SectionCard
      title="Workbook Coordinate Review"
      subtitle="UPDATE.xlsx has already been applied. Conflicting workbook coordinates are discarded automatically, so this queue focuses on sync coverage and unmatched active labels."
    >
      <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
        Workbook sync is already applied. Keep the active topology registry authoritative, use alias matching where possible, and resolve remaining unmatched labels directly from Explorer.
      </div>

      <div className="mt-6 grid gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-foreground">Unmatched ODP labels</h3>
            <span className="rounded-md border border-border bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground">
              {topologyReview.unmatched || 0}
            </span>
          </div>
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
