import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { 
  Modal, 
  TableSkeleton, 
  SectionCard, 
  Button, 
  Input
} from '../../components/ui/index.jsx';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Tag, 
  ChevronRight, 
  Activity, 
  Network,
  Hierarchy,
  Layers,
  Database
} from 'lucide-react';
import { cn } from '../../lib/utils.js';

/**
 * Incident Ontology - Enhanced Classification Management
 * High-density management of trouble categories and root causes.
 */

export default function MasterClassificationPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ klasifikasi: '', sub_klasifikasi: '' });
  const { addToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getClassifications();
      setClasses(res);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = () => {
    setForm({ klasifikasi: '', sub_klasifikasi: '' });
    setModal('create');
  };

  const openEdit = (item) => {
    setForm({ klasifikasi: item.klasifikasi, sub_klasifikasi: item.sub_klasifikasi || '' });
    setModal(item);
  };

  const handleSave = async () => {
    try {
      if (modal === 'create') {
        await api.createClassification(form);
        addToast('Ontology node registered', 'success');
      } else {
        await api.updateClassification(modal.id, form);
        addToast('Ontology definition refined', 'success');
      }
      setModal(null);
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Purge ontology node "${item.sub_klasifikasi || item.klasifikasi}"? This action is irreversible.`)) return;
    try {
      await api.deleteClassification(item.id);
      addToast('Definition purged from ontology', 'warning');
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  // Grouping logic for Hub-based visualization
  const filteredClasses = useMemo(() => {
    if (!searchQuery) return classes;
    const s = searchQuery.toLowerCase();
    return classes.filter(c => 
      c.klasifikasi.toLowerCase().includes(s) || 
      (c.sub_klasifikasi?.toLowerCase().includes(s))
    );
  }, [classes, searchQuery]);

  const grouped = useMemo(() => {
    return filteredClasses.reduce((acc, c) => {
      if (!acc[c.klasifikasi]) acc[c.klasifikasi] = [];
      acc[c.klasifikasi].push(c);
      return acc;
    }, {});
  }, [filteredClasses]);

  const stats = useMemo(() => {
    const hubs = Object.keys(grouped).length;
    const atomic = classes.length;
    return { hubs, atomic };
  }, [grouped, classes]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Ontology Header */}
      <div className="flex flex-col gap-6 shrink-0 mb-6 font-sans">
        <div className="flex items-end justify-between gap-4 flex-wrap px-1">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-black tracking-tight text-foreground uppercase">Incident Ontology</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50 leading-relaxed italic">
              Hierarchy of <span className="text-primary font-mono">{stats.hubs}</span> master domains and <span className="text-primary font-mono">{stats.atomic}</span> atomic nodes
            </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/[0.06] rounded-xl px-3 h-10 w-[240px] focus-within:ring-1 focus-within:ring-primary/30 focus-within:bg-background transition-all">
                <Search size={14} className="text-foreground/20" />
                <input 
                  type="text" 
                  className="bg-transparent border-none focus:ring-0 text-[11px] font-bold w-full placeholder:text-foreground/20 uppercase tracking-widest" 
                  placeholder="Scan Ontology Hubs..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
             </div>
             <Button variant="primary" icon={<Plus size={14} strokeWidth={2.5} />} onClick={openCreate} className="h-10 px-6">
                Initialize node
             </Button>
          </div>
        </div>

        {/* KPI Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-1">
           {[
             { label: 'Primary Sequences', val: stats.hubs, icon: Layers, color: 'text-primary' },
             { label: 'Atomic Definitions', val: stats.atomic, icon: Tag, color: 'text-info' },
             { label: 'Semantic Health', val: 'OPTIMIZED', icon: Activity, color: 'text-success font-mono' },
             { label: 'Registry Sync', val: 'PROT_0x1', icon: Database, color: 'text-foreground/20 font-mono' },
           ].map((stat, i) => (
             <div key={i} className="bg-foreground/[0.02] border border-foreground/[0.04] rounded-2xl p-3 flex flex-col gap-2 group hover:bg-foreground/[0.04] transition-all">
                <div className="flex items-center justify-between">
                   <span className="text-[8px] font-black uppercase tracking-[0.25em] text-foreground/30 font-mono leading-none">{stat.label}</span>
                   <stat.icon size={12} className={cn("opacity-20 group-hover:opacity-100 transition-opacity", stat.color)} />
                </div>
                <span className="text-lg font-black tracking-tighter text-foreground/80 leading-none uppercase tabular-nums">{stat.val}</span>
             </div>
           ))}
        </div>
      </div>

      {/* Main Ontology Grid */}
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pr-1 -mr-1">
        {loading ? <TableSkeleton rows={8} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-8">
            {Object.entries(grouped).map(([klasifikasi, items]) => (
              <SectionCard 
                key={klasifikasi}
                title={klasifikasi.toUpperCase()}
                subtitle={`${items.length} atomic nodes registered`}
                padding={false}
                className="flex flex-col h-fit border border-foreground/[0.08] shadow-sm hover:border-primary/20 transition-all group/card"
                headerAction={
                   <div className="flex items-center gap-1.5 bg-foreground/[0.03] px-2 py-1 rounded-lg border border-foreground/[0.05]">
                      <Hierarchy size={10} className="text-primary/40" />
                      <span className="text-[9px] font-black text-foreground/40 font-mono">SEQ_{klasifikasi.slice(0,3).toUpperCase()}</span>
                   </div>
                }
              >
                <div className="flex flex-col bg-foreground/[0.01]">
                  {items.map(c => (
                    <div key={c.id} className="group flex items-center justify-between gap-4 px-4 py-3 border-b border-foreground/[0.04] last:border-0 hover:bg-background transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                         <div className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover:bg-primary transition-colors shrink-0" />
                         <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[11px] font-black text-foreground/80 tracking-tight leading-none uppercase truncate">
                              {c.sub_klasifikasi || 'General Classification'}
                            </span>
                            <span className="text-[8px] font-bold text-foreground/20 uppercase tracking-[0.2em] leading-none italic">
                              Ontology ID: {c.id.toString().padStart(3, '0')}
                            </span>
                         </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <button 
                          onClick={() => openEdit(c)} 
                          className="p-1.5 rounded-lg text-foreground/30 hover:text-primary hover:bg-primary/5"
                          title="Refine Definition"
                        >
                          <Edit2 size={12} strokeWidth={2.5} />
                        </button>
                        <button 
                          onClick={() => handleDelete(c)} 
                          className="p-1.5 rounded-lg text-foreground/30 hover:text-error hover:bg-error/5"
                          title="Purge Definition"
                        >
                          <Trash2 size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ))}
            
            {Object.keys(grouped).length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center p-24 text-center gap-4 opacity-20">
                 <Hierarchy size={48} />
                 <span className="text-[11px] font-black uppercase tracking-[0.3em]">No ontology matches found</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Initialize Ontology Node' : 'Refine Ontology Protocol'} size="sm"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Abort</Button><Button onClick={handleSave} className="px-8 shadow-lg shadow-primary/20 leading-none">Commit Protocol Change</Button></>}
      >
        <div className="flex flex-col gap-8 py-2">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-1 h-3 bg-primary rounded-full" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Knowledge Sequence Configuration</span>
            </div>
            <div className="flex flex-col gap-6">
              <Input label="Primary Sequence Hub *" value={form.klasifikasi} onChange={e => setF('klasifikasi', e.target.value)} required placeholder="e.g. INFRASTRUCTURE" />
              <Input label="Atomic Definition Name" value={form.sub_klasifikasi} onChange={e => setF('sub_klasifikasi', e.target.value)} placeholder="e.g. CORE SWITCH FAILURE" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
