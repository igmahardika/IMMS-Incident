import React from 'react';
import { Cable, RadioReceiver } from 'lucide-react';
import { EmptyState, Input, SectionCard, TableSkeleton } from '../../../components/ui/index.jsx';
import { TopologyTreeNode } from './TopologyTreeNode.jsx';

export function TopologyExplorerPanel({
  loading,
  stats,
  searchQuery,
  setSearchQuery,
  normalizedSearch,
  filteredTree,
  selectedNode,
  setSelectedNode,
}) {
  return (
    <SectionCard
      title="Explorer"
      subtitle="Browse fiber and wireless branches, then select a node to inspect or edit."
      className="min-h-0"
      padding={false}
      headerAction={(
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
            {stats.fiberRoots} fiber roots
          </span>
          <span className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
            {stats.wirelessRoots} wireless roots
          </span>
        </div>
      )}
    >
      {loading ? (
        <TableSkeleton rows={14} />
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b p-4">
            <Input
              label="Search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search POP, OSC, ODP, BTS, or radio"
              wrapperClassName="gap-1"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-sm font-medium text-foreground">
                  {normalizedSearch ? 'Filtered explorer results' : 'Topology navigator'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select a branch to inspect its coordinates, hierarchy, and linked customers on the right.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  <Cable className="h-3.5 w-3.5 text-primary" />
                  Fiber Optic
                </div>
                <div className="space-y-2">
                  {Object.values(filteredTree.fo).length ? (
                    Object.values(filteredTree.fo).map((node) => (
                      <TopologyTreeNode
                        key={`fiber-${node.name}`}
                        node={node}
                        onSelect={setSelectedNode}
                        selectedId={selectedNode?.id}
                        forceOpen={Boolean(normalizedSearch)}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No fiber nodes match the current search.</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  <RadioReceiver className="h-3.5 w-3.5 text-warning" />
                  Wireless
                </div>
                <div className="space-y-2">
                  {Object.values(filteredTree.wireless).length ? (
                    Object.values(filteredTree.wireless).map((node) => (
                      <TopologyTreeNode
                        key={`wireless-${node.name}`}
                        node={node}
                        onSelect={setSelectedNode}
                        selectedId={selectedNode?.id}
                        forceOpen={Boolean(normalizedSearch)}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No wireless nodes match the current search.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
