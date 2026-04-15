import React from 'react';
import { Check, MapPin, Network } from 'lucide-react';
import { NcalBadge, SectionCard } from '../../components/ui/index.jsx';
import { PreviewItem } from './PreviewItem.jsx';

export function IncidentPreviewCard({
  isEdit,
  loading,
  ncal,
  previewNode,
  sla,
  initialProblem,
  coordinates,
  previewHash,
}) {
  return (
    <SectionCard
      title="Incident Preview"
      subtitle="Live summary of the record you are about to submit."
      className="bg-card"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Impact Segment
            </p>
            <NcalBadge value={ncal} />
          </div>

          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            {isEdit ? 'Edit Mode' : 'Draft Mode'}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Affected Node
          </p>
          <p className="text-sm font-medium leading-6 text-foreground">
            {previewNode || 'No node selected yet.'}
          </p>
          {sla ? (
            <div className="inline-flex rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-primary">
              Priority grade {sla}
            </div>
          ) : null}
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Problem Summary
          </p>
          <p className="text-sm leading-6 text-foreground">
            {initialProblem || 'Problem description will appear here.'}
          </p>
        </div>

        <div className="grid gap-3">
          <PreviewItem label="Coordinates" value={coordinates || 'Not provided'} icon={MapPin} />
          <PreviewItem label="Incident Hash" value={previewHash} icon={Network} />
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Submit State
              </p>
              <p className="text-sm font-medium text-foreground">
                {loading ? 'Submitting incident...' : 'Ready to submit'}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Connected
            </div>
          </div>
        </div>

        {!isEdit ? (
          <div className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            <Check className="h-3.5 w-3.5" />
            Draft is autosaved while you work.
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
