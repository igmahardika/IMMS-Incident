import React from 'react';
import { Edit2, MapPin, Network, Trash2 } from 'lucide-react';
import { Button, EmptyState, SectionCard } from '../../../components/ui/index.jsx';
import { cn } from '../../../lib/utils.js';
import { getNodeTone } from './topologyTree.jsx';

export function TopologyDetailPanel({
  selectedNode,
  hierarchy,
  linkedCustomers,
  onEdit,
  onDelete,
}) {
  return (
    <SectionCard
      title="Node Detail"
      subtitle={selectedNode
        ? 'Review hierarchy, coordinates, and operational metadata for the selected node.'
        : 'Choose a node from the explorer to inspect its metadata.'}
      className="min-h-0"
      headerAction={selectedNode ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<Edit2 className="h-4 w-4" />} onClick={onEdit}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete}>
            Delete
          </Button>
        </div>
      ) : null}
    >
      {selectedNode ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-muted/20 p-5">
              <div className="flex items-start gap-4">
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border', getNodeTone(selectedNode.type === 'Wireless' ? 'bts' : 'pop'))}>
                  <Network className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-xl font-semibold tracking-tight text-foreground">
                    {selectedNode.level_4 || selectedNode.level_2 || selectedNode.level_1}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{selectedNode.type}</span>
                    <span>Node ID: {selectedNode.id}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Type</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{selectedNode.type}</p>
                <p className="mt-1 text-xs text-muted-foreground">Active topology node</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Coordinates</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {selectedNode.latitude && selectedNode.longitude
                    ? `${selectedNode.latitude}, ${selectedNode.longitude}`
                    : 'Not set'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{selectedNode.coord_source || 'No source recorded'}</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Linked Customers</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{linkedCustomers.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Derived from OSC / ODC / ODP references</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Network className="h-4 w-4 text-primary" />
                  Hierarchy Path
                </div>
                <div className="space-y-4">
                  {hierarchy.map((item, index) => (
                    <div key={`${item.label}-${item.value}`} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full border-2 border-primary bg-background" />
                        {index < hierarchy.length - 1 ? <div className="mt-1 h-full w-px bg-border" /> : null}
                      </div>
                      <div className="space-y-1 pb-2">
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  Survey Snapshot
                </div>
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Survey Latitude</p>
                    <p className="text-sm font-medium text-foreground">{selectedNode.survey_latitude || 'Not set'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Survey Longitude</p>
                    <p className="text-sm font-medium text-foreground">{selectedNode.survey_longitude || 'Not set'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Survey Source</p>
                    <p className="text-sm font-medium text-foreground">{selectedNode.survey_source || 'Not set'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Linked Customers</p>
                  <p className="text-xs text-muted-foreground">
                    Customers are derived from canonical OSC, ODC, and ODP references stored in Customer Records.
                  </p>
                </div>
                <span className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                  {linkedCustomers.length} records
                </span>
              </div>

              {linkedCustomers.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {linkedCustomers.slice(0, 8).map((customer) => (
                    <div key={customer.id} className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-sm font-medium text-foreground">
                        {customer.brand_site || customer.company_name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[customer.customer_id, customer.service_id].filter(Boolean).join(' • ')}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[customer.osc_reference, customer.odc_reference, customer.odp_reference].filter(Boolean).join(' / ')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No customer currently references this node. Populate OSC, ODC, or ODP references in Customer Records to build the relation.
                </p>
              )}

              {linkedCustomers.length > 8 ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  Showing first 8 linked customers. Use Customer Records to review the full list.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Network className="h-6 w-6" />}
          title="No node selected"
          desc="Select a topology branch from the explorer to see its metadata and hierarchy."
        />
      )}
    </SectionCard>
  );
}
