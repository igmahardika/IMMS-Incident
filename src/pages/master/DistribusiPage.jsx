import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Cable,
  ChevronDown,
  ChevronRight,
  Cpu,
  Edit2,
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
  latitude: '',
  longitude: '',
};

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
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getDistribusi();
      setData(response);
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
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={openCreate}
          >
            Add Node
          </Button>
        )}
      />

      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.05fr)]">
        <SectionCard
          title="Explorer"
          subtitle="Browse fiber and wireless branches, then select a node to inspect or edit."
          className="min-h-0"
          padding={false}
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    Coordinates
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Latitude</span>
                      <span className="font-medium text-foreground">{selectedNode.latitude || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Longitude</span>
                      <span className="font-medium text-foreground">{selectedNode.longitude || 'Not set'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <Activity className="h-4 w-4 text-primary" />
                    Metadata
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium text-foreground">{selectedNode.type}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium text-success">Active</span>
                    </div>
                  </div>
                </div>
              </div>

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
        </div>
      </Modal>
    </div>
  );
}
