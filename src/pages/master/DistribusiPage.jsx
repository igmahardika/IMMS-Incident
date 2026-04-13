import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { 
  Modal, 
  TableSkeleton, 
  SectionCard, 
  Button, 
  Input, 
  Select
} from '../../components/ui/index.jsx';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Cable, 
  RadioReceiver, 
  ChevronRight, 
  ChevronDown, 
  Network, 
  MapPin, 
  Activity, 
  Server,
  Cpu,
  Database,
  Info,
  Maximize2
} from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Topology Explorer - Distribution Management
 * Visualizes the network architecture from POP/BTS hubs to leaf ODP nodes.
 */

// Helper to transform flat API data into a hierarchical tree
const buildTopologyTree = (data) => {
  const tree = { fo: {}, wireless: {} };

  data.forEach(item => {
    if (item.type === 'Fiber Optic') {
      const { level_1: pop, level_2: osc, level_3: odc, level_4: odp } = item;
      if (!tree.fo[pop]) tree.fo[pop] = { name: pop, children: {}, type: 'pop', raw: item };
      if (osc) {
        if (!tree.fo[pop].children[osc]) tree.fo[pop].children[osc] = { name: osc, children: {}, type: 'osc', raw: item };
        if (odc) {
          if (!tree.fo[pop].children[osc].children[odc]) tree.fo[pop].children[osc].children[odc] = { name: odc, children: {}, type: 'odc', raw: item };
          if (odp) {
            tree.fo[pop].children[osc].children[odc].children[odp] = { name: odp, children: null, type: 'odp', raw: item };
          }
        }
      }
    } else {
      const { level_1: bts, level_2: radio } = item;
      if (!tree.wireless[bts]) tree.wireless[bts] = { name: bts, children: {}, type: 'bts', raw: item };
      if (radio) {
        tree.wireless[bts].children[radio] = { name: radio, children: null, type: 'radio', raw: item };
      }
    }
  });

  return tree;
};

const TreeNode = ({ node, level = 0, onSelect, selectedId }) => {
  const [isOpen, setIsOpen] = useState(level < 1); // Roots open by default
  const hasChildren = node.children && Object.keys(node.children).length > 0;
  const isSelected = selectedId === node.raw?.id;

  const Icon = node.type === 'pop' || node.type === 'bts' ? Server 
             : node.type === 'osc' || node.type === 'radio' ? Activity
             : node.type === 'odc' ? Cpu
             : Network;

  return (
    <div className="flex flex-col">
      <div 
        className={cn(
          "group flex items-center gap-3 px-3 py-2 rounded-xl border border-transparent transition-all cursor-pointer relative",
          isSelected ? "bg-primary/10 border-primary/20" : "hover:bg-foreground/[0.03]"
        )}
        onClick={() => {
          onSelect(node.raw);
          if (hasChildren) setIsOpen(!isOpen);
        }}
      >
        {/* Branch Line Guide */}
        {level > 0 && (
          <div className="absolute -left-4 top-1/2 w-4 h-[1px] bg-foreground/10" />
        )}
        
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
          node.type === 'pop' || node.type === 'bts' ? "bg-primary/20 text-primary shadow-lg shadow-primary/10" : "bg-foreground/[0.05] text-foreground/40"
        )}>
          <Icon size={14} strokeWidth={2.5} />
        </div>

        <div className="flex flex-col gap-0.5 min-w-0">
          <span className={cn(
            "text-[11px] font-black tracking-tight truncate leading-tight uppercase",
            isSelected ? "text-primary" : "text-foreground/80"
          )}>
            {node.name}
          </span>
          <span className="text-[8px] font-black text-foreground/30 uppercase tracking-[0.2em] font-mono leading-none">
            Protocol: {node.type}
          </span>
        </div>

        {hasChildren && (
          <div className="ml-auto text-foreground/20 group-hover:text-foreground/40 transition-colors">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && hasChildren && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-8 border-l border-foreground/[0.05] pl-4 mt-1 flex flex-col gap-1 overflow-hidden"
          >
            {Object.values(node.children).map((child, i) => (
              <TreeNode 
                key={i} 
                node={child} 
                level={level + 1} 
                onSelect={onSelect} 
                selectedId={selectedId}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function MasterDistribusiPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState(null);
  const { addToast } = useToast();

  const [form, setForm] = useState({ 
    type: 'Fiber Optic', level_1: '', level_2: '', level_3: '', level_4: '', latitude: '', longitude: '' 
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getDistribusi();
      setData(res);
      if (res.length > 0 && !selectedNode) setSelectedNode(res[0]);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const tree = useMemo(() => buildTopologyTree(data), [data]);
  
  const stats = useMemo(() => {
    const foRoots = Object.keys(tree.fo).length;
    const wrRoots = Object.keys(tree.wireless).length;
    const total = data.length;
    return { foRoots, wrRoots, total };
  }, [tree, data]);

  const filteredTree = useMemo(() => {
    if (!searchQuery) return tree;
    const s = searchQuery.toLowerCase();
    const filterBranch = (nodes) => {
      return Object.entries(nodes).reduce((acc, [k, node]) => {
        const match = node.name.toLowerCase().includes(s);
        const childrenMatch = node.children ? filterBranch(node.children) : null;
        if (match || (childrenMatch && Object.keys(childrenMatch).length > 0)) {
          acc[k] = { ...node, children: childrenMatch };
        }
        return acc;
      }, {});
    };
    return {
      fo: filterBranch(tree.fo),
      wireless: filterBranch(tree.wireless)
    };
  }, [tree, searchQuery]);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = () => {
    setForm({ type: 'Fiber Optic', level_1: '', level_2: '', level_3: '', level_4: '', latitude: '', longitude: '' });
    setModal('create');
  };

  const openEdit = () => {
    if (!selectedNode) return;
    setForm({ ...selectedNode });
    setModal('edit');
  };

  const handleSave = async () => {
    try {
      if (modal === 'create') {
        await api.createDistribusi(form);
        addToast('Topology protocol synched', 'success');
      } else {
        await api.updateDistribusi(selectedNode.id, form);
        addToast('Topology node refined', 'success');
      }
      setModal(null);
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedNode) return;
    if (!confirm(`Purge topology node "${selectedNode.level_4 || selectedNode.level_1}"? This protocol action is irreversible.`)) return;
    try {
      await api.deleteDistribusi(selectedNode.id);
      addToast('Protocol node purged', 'warning');
      setSelectedNode(null);
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Topology Header */}
      <div className="flex flex-col gap-6 shrink-0 mb-6">
        <div className="flex items-end justify-between gap-4 flex-wrap px-1">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-black tracking-tight text-foreground uppercase">Topology Explorer</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50 leading-relaxed italic">
              Recursive mapping of <span className="text-primary font-mono">{stats.total}</span> active distribution nodes
            </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/[0.06] rounded-xl px-3 h-10 w-[240px] focus-within:ring-1 focus-within:ring-primary/30 focus-within:bg-background transition-all">
                <Search size={14} className="text-foreground/20" />
                <input 
                  type="text" 
                  className="bg-transparent border-none focus:ring-0 text-[11px] font-bold w-full placeholder:text-foreground/20 uppercase tracking-widest" 
                  placeholder="Scan Network Tree..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
             </div>
             <Button variant="primary" onClick={openCreate} className="h-10 px-6">
                <Plus size={14} strokeWidth={3} className="mr-2" /> Initialize Hub
             </Button>
          </div>
        </div>

        {/* KPI Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-1">
           {[
             { label: 'Network Points', val: stats.total, icon: Network, color: 'text-primary' },
             { label: 'Fiber POPs', val: stats.foRoots, icon: Cable, color: 'text-info' },
             { label: 'Wireless BTS', val: stats.wrRoots, icon: RadioReceiver, color: 'text-warning' },
           ].map((stat, i) => (
             <div key={i} className="bg-foreground/[0.02] border border-foreground/[0.04] rounded-2xl p-3 flex flex-col gap-2 group hover:bg-foreground/[0.04] transition-all">
                <div className="flex items-center justify-between">
                   <span className="text-[8px] font-black uppercase tracking-[0.25em] text-foreground/30 font-mono leading-none">{stat.label}</span>
                   <stat.icon size={12} className={cn("opacity-20 group-hover:opacity-100 transition-opacity", stat.color)} />
                </div>
                <span className="text-lg font-black tracking-tighter text-foreground/80 leading-none lowercase tabular-nums">{stat.val}</span>
             </div>
           ))}
        </div>
      </div>

      {/* Main Explorer View */}
      <div className="flex-1 min-h-0 flex gap-6 pb-4">
        {/* Tree Pane */}
        <SectionCard padding={false} className="w-[45%] flex flex-col border-foreground/[0.08] shadow-sm relative overflow-hidden">
          {loading ? <TableSkeleton rows={15} /> : (
            <div className="flex-1 overflow-auto custom-scrollbar p-5 flex flex-col gap-8">
              {/* Fiber Optic Section */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background/95 backdrop-blur-md pt-1 pb-2 z-10 border-b border-foreground/[0.04]">
                   <Cable size={14} className="text-info" />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Fiber Infrastructure</span>
                </div>
                <div className="flex flex-col gap-3">
                  {Object.values(filteredTree.fo).map((pop, i) => (
                    <TreeNode 
                      key={i} 
                      node={pop} 
                      onSelect={setSelectedNode} 
                      selectedId={selectedNode?.id} 
                    />
                  ))}
                  {Object.keys(filteredTree.fo).length === 0 && (
                    <span className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest italic ml-1">No Fiber Nodes Found</span>
                  )}
                </div>
              </div>

              {/* Wireless Section */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background/95 backdrop-blur-md pt-1 pb-2 z-10 border-b border-foreground/[0.04]">
                   <RadioReceiver size={14} className="text-warning" />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Wireless Mesh</span>
                </div>
                <div className="flex flex-col gap-3">
                  {Object.values(filteredTree.wireless).map((bts, i) => (
                    <TreeNode 
                      key={i} 
                      node={bts} 
                      onSelect={setSelectedNode} 
                      selectedId={selectedNode?.id} 
                    />
                  ))}
                  {Object.keys(filteredTree.wireless).length === 0 && (
                    <span className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest italic ml-1">No Wireless Nodes Found</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Details Pane */}
        <SectionCard padding={false} className="flex-1 flex flex-col border-foreground/[0.08] bg-foreground/[0.01] shadow-sm overflow-hidden">
          {selectedNode ? (
            <div className="flex flex-col h-full">
              <div className="p-6 flex flex-col gap-8 flex-1 overflow-auto custom-scrollbar">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--color-primary),0.5)]" />
                       <h2 className="text-lg font-black tracking-tight text-foreground uppercase truncate">{selectedNode.level_4 || selectedNode.level_1}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-primary/60 uppercase tracking-widest flex items-center gap-1.5">
                        <Maximize2 size={10} /> UUID: {String(selectedNode.id).slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={openEdit} className="p-2 rounded-lg bg-background text-foreground/40 hover:text-primary transition-all border border-foreground/5 shadow-sm">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={handleDelete} className="p-2 rounded-lg bg-background text-foreground/40 hover:text-error transition-all border border-foreground/5 shadow-sm">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/40 border border-foreground/[0.04] p-4 rounded-2xl flex flex-col gap-3">
                     <span className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em] flex items-center gap-2">
                       <MapPin size={10} /> Spatial Integrity
                     </span>
                     <div className="flex flex-col gap-1">
                       <div className="flex items-center justify-between text-[11px] font-bold font-mono tracking-tight">
                         <span className="text-foreground/40">LAT</span>
                         <span className="text-foreground/70">{selectedNode.latitude || 'NULL'}</span>
                       </div>
                       <div className="flex items-center justify-between text-[11px] font-bold font-mono tracking-tight">
                         <span className="text-foreground/40">LNG</span>
                         <span className="text-foreground/70">{selectedNode.longitude || 'NULL'}</span>
                       </div>
                     </div>
                  </div>
                  <div className="bg-background/40 border border-foreground/[0.04] p-4 rounded-2xl flex flex-col gap-3">
                     <span className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em] flex items-center gap-2">
                       <Info size={10} /> Protocol Specs
                     </span>
                     <div className="flex flex-col gap-1">
                       <div className="flex items-center justify-between text-[11px] font-bold tracking-tight">
                         <span className="text-foreground/40">DOMAIN</span>
                         <span className="text-primary/70">{selectedNode.type.toUpperCase()}</span>
                       </div>
                       <div className="flex items-center justify-between text-[11px] font-bold tracking-tight">
                         <span className="text-foreground/40">STATUS</span>
                         <span className="text-success/70 font-mono">ENBL_0x0</span>
                       </div>
                     </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <span className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em] ml-1">Historical Sequence Trace</span>
                  <div className="flex flex-col border-l-2 border-primary/20 ml-2 pl-4 gap-6">
                     {[
                       { l: 'Primary Hub', v: selectedNode.level_1 },
                       { l: 'Secondary Link', v: selectedNode.level_2 },
                       { l: 'Tertiary Dist', v: selectedNode.level_3 },
                       { l: 'Endpoint', v: selectedNode.level_4 }
                     ].filter(i => i.v).map((item, i) => (
                       <div key={i} className="flex flex-col relative">
                          <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-background border-2 border-primary/40" />
                          <span className="text-[8px] font-black uppercase text-foreground/20 tracking-widest">{item.l}</span>
                          <span className="text-[11px] font-black text-foreground/60 tracking-tight uppercase">{item.v}</span>
                       </div>
                     ))}
                  </div>
                </div>
              </div>

              {/* Mini Map Placeholder */}
              <div className="h-48 shrink-0 bg-foreground/[0.02] border-t border-foreground/[0.04] p-3">
                 <div className="w-full h-full rounded-xl border border-foreground/[0.06] bg-background/50 flex flex-col items-center justify-center gap-2 opacity-60">
                    <MapPin size={24} className="text-primary/40" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30 italic">Spatial Engine Standby</span>
                 </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 gap-4">
               <div className="w-16 h-16 rounded-3xl bg-foreground/[0.03] flex items-center justify-center text-foreground/10">
                 <Network size={32} />
               </div>
               <div className="flex flex-col gap-1">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40">Protocol Registry Idle</h3>
                 <p className="text-[10px] font-medium text-foreground/20 max-w-[200px] leading-relaxed mx-auto">Select a node from the explorer to view localized telemetry and administrative actions.</p>
               </div>
            </div>
          )}
        </SectionCard>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Initialize Topology Node' : 'Refine Topology Metadata'} size="md"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Abort</Button><Button onClick={handleSave} className="px-8 shadow-lg shadow-primary/20">Commit Changes</Button></>}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 ml-1">Distribution Protocol</label>
            <Select 
              value={form.type} onChange={e => setF('type', e.target.value)}
              className="bg-background/50 h-10 border-foreground/10"
            >
              <option>Fiber Optic</option>
              <option>Wireless</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Input label={form.type === 'Fiber Optic' ? 'POP (Sequence 01) *' : 'BTS (Sequence 01) *'} value={form.level_1} onChange={e => setF('level_1', e.target.value)} required placeholder="e.g. POP-A" />
            <Input label={form.type === 'Fiber Optic' ? 'OSC (Sequence 02) *' : 'RADIO (Sequence 02) *'} value={form.level_2} onChange={e => setF('level_2', e.target.value)} required placeholder="e.g. OSC-01" />
          </div>
          {form.type === 'Fiber Optic' && (
            <div className="grid grid-cols-2 gap-6">
              <Input label="ODC (Sequence 03)" value={form.level_3} onChange={e => setF('level_3', e.target.value)} placeholder="Optional" />
              <Input label="ODP (Sequence 04)" value={form.level_4} onChange={e => setF('level_4', e.target.value)} placeholder="Optional" />
            </div>
          )}
          <div className="h-[1px] bg-foreground/5 my-2" />
          <div className="grid grid-cols-2 gap-6">
            <Input label="Spatial Latitude" type="number" step="any" value={form.latitude} onChange={e => setF('latitude', e.target.value)} placeholder="-6.123..." />
            <Input label="Spatial Longitude" type="number" step="any" value={form.longitude} onChange={e => setF('longitude', e.target.value)} placeholder="110.123..." />
          </div>
        </div>
      </Modal>
    </div>
  );
}
