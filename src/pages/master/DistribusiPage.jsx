import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Network,
} from 'lucide-react';
import { api } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DistributionMap from '../../components/ui/DistributionMap.jsx';
import {
  EmptyState,
  PageHeader,
  SectionCard,
  TableSkeleton,
} from '../../components/ui/index.jsx';
import { EMPTY_FORM } from './distribusi/config.js';
import { TopologyDetailPanel } from './distribusi/TopologyDetailPanel.jsx';
import { TopologyEditModal } from './distribusi/TopologyEditModal.jsx';
import { TopologyExplorerPanel } from './distribusi/TopologyExplorerPanel.jsx';
import { TopologyHeaderActions } from './distribusi/TopologyHeaderActions.jsx';
import { TopologyReviewGuidance } from './distribusi/TopologyReviewGuidance.jsx';
import { TopologyReviewPanel } from './distribusi/TopologyReviewPanel.jsx';
import { buildTopologyTree, filterTree } from './distribusi/topologyTree.jsx';

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
        action={<TopologyHeaderActions viewMode={viewMode} setViewMode={setViewMode} openCreate={openCreate} />}
      />

      {viewMode === 'review' && topologyReview ? <TopologyReviewPanel topologyReview={topologyReview} /> : null}

      {viewMode === 'map' ? (
        <SectionCard
          padding={false}
          className="min-h-[720px] flex-1"
        >
          {loading ? (
            <TableSkeleton rows={12} />
          ) : (
            <DistributionMap data={data} onRefresh={load} />
          )}
        </SectionCard>
      ) : viewMode === 'review' ? (
        <TopologyReviewGuidance />
      ) : (
        <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.05fr)]">
          <TopologyExplorerPanel
            loading={loading}
            stats={stats}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            normalizedSearch={normalizedSearch}
            filteredTree={filteredTree}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
          />

          <TopologyDetailPanel
            selectedNode={selectedNode}
            hierarchy={hierarchy}
            linkedCustomers={linkedCustomers}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      <TopologyEditModal
        modal={modal}
        form={form}
        setField={setField}
        handleSave={handleSave}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
