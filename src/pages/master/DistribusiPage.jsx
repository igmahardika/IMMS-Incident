import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Cable,
  ChevronDown,
  ChevronRight,
  Cpu,
  Edit2,
  LayoutList,
  Map,
  MapPin,
  Network,
  Plus,
  RadioReceiver,
  Server,
  Trash2,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { api } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DistributionMap from '../../components/ui/DistributionMap.jsx';
import {
  Button,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  SectionCard,
  Select,
  TableSkeleton,
} from '../../components/ui/index.jsx';
import { cn } from '../../lib/utils.js';

const EMPTY_FORM = {
  type: 'Fiber Optic',
  level_1: '',
  level_2: '',
  level_3: '',
  level_4: '',
  survey_latitude: '',
  survey_longitude: '',
  survey_source: '',
  coord_source: '',
  latitude: '',
  longitude: '',
};

const COORD_SOURCE_OPTIONS = [
  '',
  'manual',
  'geocoder',
  'anchor',
  'update-workbook-odp',
];

function buildTopologyTree(data) {
  const tree = { fo: {}, wireless: {} };

  data.forEach((item) => {
    if (item.type === 'Fiber Optic') {
      const { level_1: pop, level_2: osc, level_3: odc, level_4: odp } = item;

      if (!tree.fo[pop]) {
        tree.fo[pop] = { name: pop, children: {}, type: 'pop', raw: item };
      }

      if (osc) {
        if (!tree.fo[pop].children[osc]) {
          tree.fo[pop].children[osc] = { name: osc, children: {}, type: 'osc', raw: item };
        }

        if (odc) {
          if (!tree.fo[pop].children[osc].children[odc]) {
            tree.fo[pop].children[osc].children[odc] = { name: odc, children: {}, type: 'odc', raw: item };
          }

          if (odp) {
            tree.fo[pop].children[osc].children[odc].children[odp] = {
              name: odp,
              children: null,
              type: 'odp',
              raw: item,
            };
          }
        }
      }
    } else {
      const { level_1: bts, level_2: radio } = item;

      if (!tree.wireless[bts]) {
        tree.wireless[bts] = { name: bts, children: {}, type: 'bts', raw: item };
      }

      if (radio) {
        tree.wireless[bts].children[radio] = {
          name: radio,
          children: null,
          type: 'radio',
          raw: item,
        };
      }
    }
  });

  return tree;
}

function filterTree(nodes, term) {
  if (!term) return nodes;

  return Object.entries(nodes).reduce((accumulator, [key, node]) => {
    const isMatch = node.name.toLowerCase().includes(term);
    const filteredChildren = node.children ? filterTree(node.children, term) : null;

    if (isMatch || (filteredChildren && Object.keys(filteredChildren).length > 0)) {
      accumulator[key] = {
        ...node,
        children: filteredChildren,
      };
    }

    return accumulator;
  }, {});
}

function getNodeIcon(type) {
  if (type === 'pop' || type === 'bts') return <Server className="h-4 w-4" />;
  if (type === 'osc' || type === 'radio') return <Activity className="h-4 w-4" />;
  if (type === 'odc') return <Cpu className="h-4 w-4" />;
  return <Network className="h-4 w-4" />;
}

function getNodeTone(type) {
  if (type === 'pop' || type === 'osc' || type === 'odc' || type === 'odp') {
    return 'bg-primary/10 text-primary border-primary/20';
  }

  return 'bg-warning/10 text-warning border-warning/20';
}

function TreeNode({ node, level = 0, onSelect, selectedId, forceOpen = false }) {
  const [isOpen, setIsOpen] = useState(level === 0);
  const hasChildren = node.children && Object.keys(node.children).length > 0;
  const isSelected = selectedId === node.raw?.id;
  const icon = getNodeIcon(node.type);

  useEffect(() => {
    if (forceOpen && hasChildren) {
      setIsOpen(true);
    }
  }, [forceOpen, hasChildren]);

  const handleClick = () => {
    onSelect(node.raw);
    if (hasChildren) {
      setIsOpen((previous) => !previous);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
          isSelected ? 'border-primary/20 bg-primary/5' : 'border-transparent hover:bg-muted/30'
        )}
      >
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', getNodeTone(node.type))}>
          {icon}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <p className={cn('truncate text-sm font-medium', isSelected ? 'text-primary' : 'text-foreground')}>
            {node.name}
          </p>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {node.type}
          </p>
        </div>

        {hasChildren ? (
          isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : null}
      </button>

      <AnimatePresence>
        {isOpen && hasChildren ? (
          <div className="ml-5 border-l border-border pl-4">
            <div className="space-y-2">
              {Object.values(node.children).map((child) => (
                <TreeNode
                  key={`${child.type}-${child.name}`}
                  node={child}
                  level={level + 1}
                  onSelect={onSelect}
                  selectedId={selectedId}
                  forceOpen={forceOpen}
                />
              ))}
            </div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function MasterDistribusiPage() {
  const [data, setData] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [syncReport, setSyncReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('explorer');
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [topologyResponse, customerResponse, reportResponse] = await Promise.all([
        api.getDistribusi(),
        api.getCustomers(),
        api.getUpdateSyncReport(),
      ]);
      setData(topologyResponse);
      setCustomers(customerResponse);
      setSyncReport(reportResponse);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!data.length) {
      setSelectedNode(null);
      return;
    }

    if (!selectedNode) {
      setSelectedNode(data[0]);
      return;
    }

    const nextSelected = data.find((item) => item.id === selectedNode.id);
    setSelectedNode(nextSelected || data[0]);
  }, [data, selectedNode]);

  const tree = useMemo(() => buildTopologyTree(data), [data]);
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredTree = useMemo(() => ({
    fo: filterTree(tree.fo, normalizedSearch),
    wireless: filterTree(tree.wireless, normalizedSearch),
  }), [tree, normalizedSearch]);

  const stats = useMemo(() => ({
    total: data.length,
    fiberRoots: Object.keys(tree.fo).length,
    wirelessRoots: Object.keys(tree.wireless).length,
  }), [data, tree]);

  const hierarchy = useMemo(() => {
    if (!selectedNode) return [];

    return [
      { label: selectedNode.type === 'Fiber Optic' ? 'POP / BTS' : 'Primary Site', value: selectedNode.level_1 },
      { label: selectedNode.type === 'Fiber Optic' ? 'OSC / Radio' : 'Secondary Link', value: selectedNode.level_2 },
      { label: 'ODC', value: selectedNode.level_3 },
      { label: 'ODP / Endpoint', value: selectedNode.level_4 },
    ].filter((item) => item.value);
  }, [selectedNode]);

  const linkedCustomers = useMemo(() => {
    if (!selectedNode) return [];

    if (selectedNode.level_4) {
      return customers.filter((customer) => customer.odp_reference === selectedNode.level_4);
    }
    if (selectedNode.level_3) {
      return customers.filter((customer) => customer.odc_reference === selectedNode.level_3);
    }
    if (selectedNode.level_2) {
      return customers.filter((customer) => customer.osc_reference === selectedNode.level_2);
    }

    return [];
  }, [customers, selectedNode]);

  const topologyReview = syncReport?.topology || null;

  const setField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal('create');
  };

  const openEdit = () => {
    if (!selectedNode) return;

    setForm({
      type: selectedNode.type || 'Fiber Optic',
      level_1: selectedNode.level_1 || '',
      level_2: selectedNode.level_2 || '',
      level_3: selectedNode.level_3 || '',
      level_4: selectedNode.level_4 || '',
      survey_latitude: selectedNode.survey_latitude || '',
      survey_longitude: selectedNode.survey_longitude || '',
      survey_source: selectedNode.survey_source || '',
      coord_source: selectedNode.coord_source || '',
      latitude: selectedNode.latitude || '',
      longitude: selectedNode.longitude || '',
    });
    setModal('edit');
  };

  const handleSave = async () => {
    try {
      if (modal === 'create') {
        await api.createDistribusi(form);
        addToast('Topology node created', 'success');
      } else if (selectedNode) {
        await api.updateDistribusi(selectedNode.id, form);
        addToast('Topology node updated', 'success');
      }

      setModal(null);
      await load();
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedNode) return;
    if (!window.confirm(`Delete topology node "${selectedNode.level_4 || selectedNode.level_1}"?`)) return;

    try {
      await api.deleteDistribusi(selectedNode.id);
      addToast('Topology node deleted', 'warning');
      setSelectedNode(null);
      await load();
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <PageHeader
        title="Distribution Topology"
        subtitle={`Manage ${stats.total} active infrastructure nodes across fiber and wireless distribution layers.`}
        action={(
          <>
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1">
              <Button
                variant={viewMode === 'explorer' ? 'default' : 'ghost'}
                size="sm"
                className="shadow-none"
                icon={<LayoutList className="h-4 w-4" />}
                onClick={() => setViewMode('explorer')}
              >
                Explorer
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="sm"
                className="shadow-none"
                icon={<Map className="h-4 w-4" />}
                onClick={() => setViewMode('map')}
              >
                Map
              </Button>
              <Button
                variant={viewMode === 'review' ? 'default' : 'ghost'}
                size="sm"
                className="shadow-none"
                icon={<Activity className="h-4 w-4" />}
                onClick={() => setViewMode('review')}
              >
                Review
              </Button>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={openCreate}
            >
              Add Node
            </Button>
          </>
        )}
      />

      {viewMode === 'review' && topologyReview ? (
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
      ) : null}

      {viewMode === 'map' ? (
        <SectionCard
          padding={false}
          className="min-h-[720px] flex-1"
        >
          {loading ? (
            <TableSkeleton rows={12} />
          ) : (
            <DistributionMap data={data} onRefresh={load} showHeader={true} />
          )}
        </SectionCard>
      ) : viewMode === 'review' ? (
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
                After this enrichment, keep live coordinates, survey evidence, and linked customers updated directly from IMMS.
              </p>
            </div>
          </div>
        </SectionCard>
      ) : (
        <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.05fr)]">
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
                            <TreeNode
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
                            <TreeNode
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

          <SectionCard
            title="Node Detail"
            subtitle={selectedNode
              ? 'Review hierarchy, coordinates, and operational metadata for the selected node.'
              : 'Choose a node from the explorer to inspect its metadata.'}
            className="min-h-0"
            headerAction={selectedNode ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" icon={<Edit2 className="h-4 w-4" />} onClick={openEdit}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" icon={<Trash2 className="h-4 w-4" />} onClick={handleDelete}>
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
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Add Topology Node' : 'Edit Topology Node'}
        size="md"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {modal === 'create' ? 'Create Node' : 'Save Changes'}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <Select
            label="Topology Type"
            value={form.type}
            onChange={(event) => setField('type', event.target.value)}
          >
            <option value="Fiber Optic">Fiber Optic</option>
            <option value="Wireless">Wireless</option>
          </Select>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={form.type === 'Fiber Optic' ? 'POP' : 'BTS'}
              value={form.level_1}
              onChange={(event) => setField('level_1', event.target.value)}
              placeholder={form.type === 'Fiber Optic' ? 'POP-A' : 'BTS-A'}
              required
            />
            <Input
              label={form.type === 'Fiber Optic' ? 'OSC' : 'Radio'}
              value={form.level_2}
              onChange={(event) => setField('level_2', event.target.value)}
              placeholder={form.type === 'Fiber Optic' ? 'OSC-01' : 'RADIO-01'}
              required
            />
          </div>

          {form.type === 'Fiber Optic' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="ODC"
                value={form.level_3}
                onChange={(event) => setField('level_3', event.target.value)}
                placeholder="Optional"
              />
              <Input
                label="ODP"
                value={form.level_4}
                onChange={(event) => setField('level_4', event.target.value)}
                placeholder="Optional"
              />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={(event) => setField('latitude', event.target.value)}
              placeholder="-6.123456"
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={(event) => setField('longitude', event.target.value)}
              placeholder="110.123456"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Coordinate Source"
              value={form.coord_source || ''}
              onChange={(event) => setField('coord_source', event.target.value)}
            >
              {COORD_SOURCE_OPTIONS.map((option) => (
                <option key={option || 'blank'} value={option}>
                  {option || 'Unspecified'}
                </option>
              ))}
            </Select>
            <Input
              label="Survey Source"
              value={form.survey_source}
              onChange={(event) => setField('survey_source', event.target.value)}
              placeholder="UPDATE.xlsx:ODP"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Survey Latitude"
              type="number"
              step="any"
              value={form.survey_latitude}
              onChange={(event) => setField('survey_latitude', event.target.value)}
              placeholder="-6.123456"
            />
            <Input
              label="Survey Longitude"
              type="number"
              step="any"
              value={form.survey_longitude}
              onChange={(event) => setField('survey_longitude', event.target.value)}
              placeholder="110.123456"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
