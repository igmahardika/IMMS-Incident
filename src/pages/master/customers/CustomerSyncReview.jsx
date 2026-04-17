import React from 'react';
import { Button } from '../../../components/ui/index.jsx';

export function CustomerSyncReview({ reviewMetrics, onUseCandidate }) {
  if (!reviewMetrics) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Workbook sync report is not available yet.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="space-y-6">
          <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
            Conflicting workbook coordinates are discarded automatically. Continue cleanup from unmatched rows or maintain customer coordinates directly from the registry.
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Actionable stewardship queue</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    These rows already point to an active address, ODP, ODC, or OSC and are the best candidates for in-system follow-up.
                  </p>
                </div>
                <span className="rounded-md border border-border bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground">
                  {reviewMetrics.unmatched_actionable || 0}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {(reviewMetrics.unmatched_actionable_examples || []).length ? (
                  reviewMetrics.unmatched_actionable_examples.slice(0, 12).map((item) => (
                    <div key={`${item.name}-${item.address}`} className="rounded-lg border border-border bg-muted/10 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.simplified_name || item.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.address || 'Address not available'}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => onUseCandidate?.(item)}>
                          Use Candidate
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(item.reasons || []).map((reason) => (
                          <span key={reason} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">
                            {reason.toUpperCase()}
                          </span>
                        ))}
                        {item.odp ? (
                          <span className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">
                            {item.odp}
                          </span>
                        ) : null}
                        {item.latitude != null && item.longitude != null ? (
                          <span className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">
                            {item.latitude}, {item.longitude}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No actionable unmatched workbook rows remain.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">External-only workbook rows</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    These rows still have no safe anchor to the active customer or topology registry and should stay outside the live registry until reviewed manually.
                  </p>
                </div>
                <span className="rounded-md border border-border bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground">
                  {reviewMetrics.unmatched_external_only || 0}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {(reviewMetrics.unmatched_external_examples || []).length ? (
                  reviewMetrics.unmatched_external_examples.slice(0, 12).map((item) => (
                    <div key={`${item.name}-${item.address}`} className="rounded-lg border border-border bg-muted/10 p-3">
                      <p className="text-sm font-medium text-foreground">{item.simplified_name || item.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.address || 'Address not available'}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.odp ? (
                          <span className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">
                            {item.odp}
                          </span>
                        ) : null}
                        {!item.odp && !item.odc && !item.olt ? (
                          <span className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">
                            No topology anchor
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No external-only unmatched rows remain.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
