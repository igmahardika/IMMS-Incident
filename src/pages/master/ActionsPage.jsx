import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal, TableSkeleton, SectionCard, Button, Input } from '../../components/ui/index.jsx';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { DataTable } from '../../components/tables/DataTable.jsx';

function TableCard({ children, title, subtitle, footer, headerAction }) {
  return (
    <SectionCard title={title} subtitle={subtitle} footer={footer} headerAction={headerAction} padding={false} className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar relative">
        {children}
      </div>
    </SectionCard>
  );
}

export default function MasterActionPage() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ name: '' });
  const { addToast } = useToast();
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(() => {
    setLoading(true);
    return api.getActions()
      .then(setActions)
      .catch(e => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const handleDelete = useCallback(async (id) => {
    if (!confirm('Purge this action protocol?')) return;
    try { await api.deleteAction(id); addToast('Protocol Purged', 'warning'); load(); }
    catch (e) { addToast(e.message, 'error'); }
  }, [addToast, load]);

  const columns = React.useMemo(() => [
    {
      accessorKey: "index",
      header: "#",
      size: 40,
      cell: info => <span className="text-foreground/20 font-mono italic">{info.row.index + 1}</span>,
    },
    {
      accessorKey: "name",
      header: "Action Logic / Sequence",
      size: 400,
      meta: { flexible: true },
      cell: info => (
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded bg-primary/40 shrink-0" />
           <span className="font-black text-foreground/80 tracking-tight uppercase">{info.getValue()}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 80,
      meta: { className: 'text-right pr-4' },
      cell: info => (
        <div className="opacity-20 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
          <button onClick={() => openEdit(info.row.original)} className="p-1.5 rounded bg-foreground/5 hover:bg-primary/10 hover:text-primary transition-colors">
            <Edit2 size={12} strokeWidth={2.5} />
          </button>
          <button onClick={() => handleDelete(info.row.original.id)} className="p-1.5 rounded bg-foreground/5 hover:bg-error/10 hover:text-error transition-colors">
            <Trash2 size={12} strokeWidth={2.5} />
          </button>
        </div>
      ),
    },
  ], [handleDelete]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (a) => { setModal(a); setForm({ name: a.name }); };
  const openCreate = () => { setModal('create'); setForm({ name: '' }); };

  const handleSave = async () => {
    try {
      if (modal === 'create') { await api.createAction(form); addToast('Action Logic Registered', 'success'); }
      else { await api.updateAction(modal.id, form); addToast('Action Logic Updated', 'success'); }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Visual Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap shrink-0 mb-6 px-1">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-black tracking-tight text-foreground uppercase">Response Intelligence</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 leading-relaxed italic">
            Administration of <span className="text-primary">{actions.length}</span> preset incident response protocols
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-foreground/[0.04] border border-foreground/[0.06] rounded-xl px-3 h-9 w-[280px] shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-background transition-all group">
            <Search size={14} strokeWidth={3} className="text-foreground/20 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              className="bg-transparent border-none focus:ring-0 text-[11px] font-black w-full py-1 placeholder:text-foreground/20 uppercase tracking-widest h-full" 
              placeholder="Search actions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button size="xs" onClick={openCreate} className="font-black text-[9px] tracking-[0.2em] px-5 h-9 uppercase shadow-lg shadow-primary/10">
            <Plus size={13} strokeWidth={2.5} /> INITIALIZE ACTION
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-background border border-foreground/[0.08] rounded-2xl overflow-hidden shadow-sm flex flex-col mb-4">
        {loading ? <TableSkeleton rows={8} /> : (
          <DataTable 
            data={actions} 
            columns={columns} 
            globalFilter={searchQuery} 
            setGlobalFilter={setSearchQuery}
            pageSize={20}
          />
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Initialize Action Protocol' : 'Refine Action Logic'} size="sm"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Abort</Button><Button onClick={handleSave} className="px-8 shadow-lg shadow-primary/20">Commit Changes</Button></>}
      >
        <Input label="Action Logic Descriptor *" value={form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. REBOOT CORE INFRASTRUCTURE" required />
      </Modal>
    </div>
  );
}
