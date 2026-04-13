import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { 
  Modal, 
  TableSkeleton, 
  SectionCard, 
  Button, 
  Input, 
  PageSpinner 
} from '../../components/ui/index.jsx';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  User, 
  Activity, 
  Database, 
  Download, 
  Search, 
  MoreVertical,
  ShieldCheck,
  Zap,
  MapPin
} from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { DataTable } from '../../components/tables/DataTable.jsx';
import { parseCsvFile, downloadCsv } from '../../utils/csv.js';

/**
 * Personnel Registry - Enhanced Engineering Management
 * High-density management of field technical support nodes.
 */

const TechAvatar = ({ name }) => {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  return (
    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-black text-[11px] tracking-tighter shrink-0 transition-transform group-hover:scale-105">
      {initials}
    </div>
  );
};

export default function MasterTechnicalSupportPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ no: '', name: '', unit: '' });
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTechnicalSupport();
      setData(res);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = data.length;
    const units = new Set(data.map(d => d.unit)).size;
    return { total, units };
  }, [data]);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openEdit = (item) => {
    setForm({ no: item.no || '', name: item.name, unit: item.unit });
    setModal(item);
  };

  const openCreate = () => {
    setForm({ no: '', name: '', unit: '' });
    setModal('create');
  };
  
  const handleSave = async () => {
    try {
      if (modal === 'create') {
        await api.createTechnicalSupport(form);
        addToast('Personnel node registered in central registry', 'success');
      } else {
        await api.updateTechnicalSupport(modal.id, form);
        addToast('Personnel identification protocol refined', 'success');
      }
      setModal(null);
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleDelete = useCallback(async (item) => {
    if (!window.confirm(`Purge personnel node ${item.name}? This action will de-register the identity.`)) return;
    try {
      await api.deleteTechnicalSupport(item.id);
      addToast('Node purged from registry', 'warning');
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
  }, [addToast, load]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const rows = await parseCsvFile(file);
      const parsed = rows.map(r => ({ 
        no: r['No']?.toString() || '', 
        name: r['Name']?.toString() || '', 
        unit: r['Unit']?.toString() || '' 
      })).filter(r => r.name && r.unit);
      
      const res = await api.uploadTechnicalSupport(parsed);
      addToast(`Synched ${res.count} personnel nodes to registry`, 'success');
      load();
    } catch(err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const downloadTemplate = () => {
    downloadCsv(
      [{ No: '1001', Name: 'JOHN SMITH', Unit: 'JAKARTA CENTER' }],
      'IMMS_Personnel_Template.csv'
    );
  };

  const columns = useMemo(() => [
    {
      accessorKey: "identity",
      header: "Personnel Identity",
      size: 280,
      meta: { flexible: true },
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <TechAvatar name={row.original.name} />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11px] font-black text-foreground/90 tracking-tight truncate leading-tight uppercase">
              {row.original.name}
            </span>
            <span className="text-[9px] font-mono font-bold text-primary/60 uppercase tracking-[0.2em] leading-none">
              NRK: {row.original.no || 'NULL_00'}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "unit",
      header: "Deployment Node / Unit",
      size: 240,
      meta: { flexible: true },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-success/40 shrink-0" />
           <span className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/50">
             {row.original.unit}
           </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 80,
      meta: { className: 'text-right' },
      cell: ({ row }) => (
        <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity pr-2">
          <button 
            onClick={() => openEdit(row.original)} 
            className="p-1.5 rounded-lg text-foreground/30 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Edit2 size={13} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => handleDelete(row.original)} 
            className="p-1.5 rounded-lg text-foreground/30 hover:text-error hover:bg-error/5 transition-all"
          >
            <Trash2 size={13} strokeWidth={2.5} />
          </button>
        </div>
      ),
    },
  ], [handleDelete]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Registry Header */}
      <div className="flex flex-col gap-6 shrink-0 mb-6">
        <div className="flex items-end justify-between gap-4 flex-wrap px-1">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-black tracking-tight text-foreground uppercase">Personnel Registry</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50 leading-relaxed italic">
              Administration of <span className="text-primary font-mono">{data.length}</span> registered engineering nodes
            </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/[0.06] rounded-xl px-3 h-10 w-[240px] focus-within:ring-1 focus-within:ring-primary/30 focus-within:bg-background transition-all">
                <Search size={14} className="text-foreground/20" />
                <input 
                  type="text" 
                  className="bg-transparent border-none focus:ring-0 text-[11px] font-bold w-full placeholder:text-foreground/20 uppercase tracking-widest" 
                  placeholder="Scan Registry Nodes..." 
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
        <div className="grid grid-cols-2 gap-3 px-1">
           {[
             { label: 'Total Registry', val: stats.total, icon: User, color: 'text-primary' },
             { label: 'Deployed Units', val: stats.units, icon: Zap, color: 'text-success' },
           ].map((stat, i) => (
             <div key={i} className="bg-foreground/[0.02] border border-foreground/[0.04] rounded-2xl p-3 flex flex-col gap-2 group hover:bg-foreground/[0.04] transition-all">
                <div className="flex items-center justify-between">
                   <span className="text-[8px] font-black uppercase tracking-[0.25em] text-foreground/30 font-mono leading-none">{stat.label}</span>
                   <stat.icon size={12} className={cn("opacity-20 group-hover:opacity-100 transition-opacity", stat.color)} />
                </div>
                <span className="text-lg font-black tracking-tighter text-foreground/80 leading-none tabular-nums uppercase">{stat.val}</span>
             </div>
           ))}
        </div>
      </div>

      {/* Main Registry Table */}
      <SectionCard padding={false} className="flex-1 min-h-0 border-foreground/[0.08] shadow-sm mb-4">
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button 
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-3 h-8 bg-background border border-foreground/[0.06] rounded-lg text-[9px] font-black uppercase tracking-widest text-foreground/40 hover:text-primary transition-all shadow-sm"
          >
            <Download size={12} /> Template
          </button>
          <label className="cursor-pointer">
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
            <div className="flex items-center gap-2 px-3 h-8 bg-primary/5 border border-primary/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all shadow-sm">
              <Database size={12} /> Batch Sync
            </div>
          </label>
        </div>

        {loading ? <TableSkeleton rows={12} /> : (
          <DataTable 
            data={data} 
            columns={columns} 
            globalFilter={searchQuery} 
            setGlobalFilter={setSearchQuery}
            pageSize={50}
          />
        )}
      </SectionCard>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Initialize Personnel Node' : 'Refine Personnel Protocol'} size="sm"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Abort</Button><Button onClick={handleSave} className="px-8 shadow-lg shadow-primary/20 leading-none">Commit Protocol Change</Button></>}
      >
        <div className="flex flex-col gap-8 py-2">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-1 h-3 bg-primary rounded-full" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Personnel Identification</span>
            </div>
            <div className="flex flex-col gap-6">
              <Input label="NRK / Assignment Code" value={form.no} onChange={e => setF('no', e.target.value)} placeholder="e.g. 100x" />
              <Input label="Personnel Legal Name *" value={form.name} onChange={e => setF('name', e.target.value)} required placeholder="FullName" />
              <Input label="Deployment Unit *" value={form.unit} onChange={e => setF('unit', e.target.value)} placeholder="e.g. JAKARTA CENTER UNIT" required />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
