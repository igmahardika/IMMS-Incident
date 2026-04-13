import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { 
  Modal, 
  TableSkeleton, 
  EmptyState, 
  RoleBadge, 
  StatusBadge, 
  SectionCard, 
  Button, 
  Input, 
  Select,
  PageSpinner
} from '../../components/ui/index.jsx';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  User, 
  ShieldCheck, 
  Activity, 
  Users, 
  Lock,
  Mail,
  Fingerprint,
  MoreVertical,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { DataTable } from '../../components/tables/DataTable.jsx';

/**
 * Identity Hub - Enhanced User Management
 * High-density UI for administrative control of system access nodes.
 */

// Mini Avatar Component for Table Alignment
const UserAvatar = ({ name, role }) => {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const roleColors = {
    admin: 'bg-primary/20 text-primary border-primary/20',
    noc: 'bg-info/20 text-info border-info/20',
    manager: 'bg-warning/20 text-warning border-warning/20',
    technician: 'bg-secondary/20 text-secondary border-secondary/20'
  };
  
  return (
    <div className={cn(
      "w-9 h-9 rounded-xl border flex items-center justify-center font-black text-[11px] tracking-tighter shrink-0 transition-all group-hover:scale-105",
      roleColors[role] || 'bg-foreground/5 text-foreground/40 border-foreground/10'
    )}>
      {initials}
    </div>
  );
};

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'create' or user object
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useToast();

  const [form, setForm] = useState({ 
    employee_id: '', 
    username: '', 
    password: '', 
    name: '', 
    role: 'noc', 
    email: '' 
  });
  
  const ROLES = ['admin', 'manager', 'noc', 'technician'];

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.is_active).length;
    const roleCounts = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});
    
    return { total, active, ...roleCounts };
  }, [users]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = () => {
    setForm({ employee_id: '', username: '', password: '', name: '', role: 'noc', email: '' });
    setModal('create');
  };

  const openEdit = (u) => {
    setForm({ ...u, password: '' });
    setModal(u);
  };

  const handleSave = async () => {
    try {
      if (modal === 'create') {
        await api.createUser(form);
        addToast('Authorized access node initialized', 'success');
      } else {
        await api.updateUser(modal.id, form);
        addToast('Identity protocol refined', 'success');
      }
      setModal(null);
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Purge identity protocol for ${u.name}? This action is irreversible.`)) return;
    try {
      await api.deleteUser(u.id);
      addToast('Identity purged from registry', 'warning');
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleToggle = async (u) => {
    try {
      await api.updateUser(u.id, { is_active: !u.is_active });
      addToast(`Access terminal ${!u.is_active ? 'ENABLED' : 'DISABLED'}`, 'info');
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'identity',
      header: 'Personnel Identity',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={row.original.name} role={row.original.role} />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11px] font-black text-foreground/90 tracking-tight truncate leading-tight">
              {row.original.name}
            </span>
            <span className="text-[9px] font-mono font-bold text-foreground/40 uppercase tracking-[0.2em] leading-none">
              @{row.original.username}
            </span>
          </div>
        </div>
      ),
      size: 260,
      meta: { flexible: true }
    },
    {
      accessorKey: 'role',
      header: 'Authorization',
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
      size: 130,
      meta: { className: 'text-center' }
    },
    {
      accessorKey: 'metadata',
      header: 'Access Meta',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-foreground/50">
            <Mail size={10} className="shrink-0" />
            <span className="text-[10px] font-semibold truncate max-w-[140px]">{row.original.email || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-primary/60 font-mono text-[9px] font-black uppercase tracking-widest">
            <Fingerprint size={10} className="shrink-0" />
            Emp-ID: {row.original.employee_id || 'NULL'}
          </div>
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: 'is_active',
      header: 'Terminal State',
      cell: ({ row }) => (
        <div className="flex justify-center">
          <button 
            onClick={() => handleToggle(row.original)}
            className={cn(
              "group relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              row.original.is_active ? "bg-success" : "bg-foreground/10"
            )}
          >
            <span className={cn(
              "pointer-events-none block h-3.5 w-3.5 rounded-full bg-background shadow-lg ring-0 transition-transform",
              row.original.is_active ? "translate-x-5.5" : "translate-x-1"
            )} />
          </button>
        </div>
      ),
      size: 110,
      meta: { className: 'text-center' }
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 px-2">
          <button 
            onClick={() => openEdit(row.original)}
            className="p-1.5 rounded-lg text-foreground/30 hover:text-primary hover:bg-primary/5 transition-all"
            title="Refine Protocol"
          >
            <Edit2 size={13} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => handleDelete(row.original)}
            className="p-1.5 rounded-lg text-foreground/30 hover:text-error hover:bg-error/5 transition-all"
            title="Purge Identity"
          >
            <Trash2 size={13} strokeWidth={2.5} />
          </button>
        </div>
      ),
      size: 80,
      meta: { className: 'text-right' }
    }
  ], [handleToggle, handleDelete]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Visual Header */}
      <div className="flex flex-col gap-6 shrink-0 mb-6">
        <div className="flex items-end justify-between gap-4 flex-wrap px-1">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-black tracking-tight text-foreground uppercase">Identity Registry</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50 leading-relaxed italic">
              Administration of <span className="text-primary">{users.length}</span> authorized access points
            </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/[0.06] rounded-xl px-3 h-10 w-[240px] focus-within:ring-1 focus-within:ring-primary/30 focus-within:bg-background transition-all">
                <Search size={14} className="text-foreground/20" />
                <input 
                  type="text" 
                  className="bg-transparent border-none focus:ring-0 text-[11px] font-bold w-full placeholder:text-foreground/20 uppercase tracking-widest" 
                  placeholder="Scan Protocol Registry..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
             </div>
             <Button variant="primary" icon={<Plus size={14} strokeWidth={2.5} />} onClick={openCreate} className="h-10 px-6">
                Initialize Node
             </Button>
          </div>
        </div>

        {/* KPI Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-1">
           {[
             { label: 'Total Registry', val: stats.total, icon: Users, color: 'text-primary' },
             { label: 'Active Access', val: stats.active, icon: Activity, color: 'text-success' },
             { label: 'Privileged', val: stats.admin || 0, icon: ShieldCheck, color: 'text-warning' },
             { label: 'NOC Command', val: stats.noc || 0, icon: Lock, color: 'text-info' },
             { label: 'Field Agents', val: stats.technician || 0, icon: User, color: 'text-secondary' },
           ].map((stat, i) => (
             <div key={i} className="bg-foreground/[0.02] border border-foreground/[0.04] rounded-2xl p-3 flex flex-col gap-2 group hover:bg-foreground/[0.04] transition-all">
                <div className="flex items-center justify-between">
                   <span className="text-[8px] font-black uppercase tracking-[0.25em] text-foreground/30 font-mono leading-none">{stat.label}</span>
                   <stat.icon size={12} className={cn("opacity-20 group-hover:opacity-100 transition-opacity", stat.color)} />
                </div>
                <span className="text-lg font-black tracking-tighter text-foreground/80 leading-none">{stat.val}</span>
             </div>
           ))}
        </div>
      </div>

      <SectionCard padding={false} className="flex-1 min-h-0 border-foreground/[0.08] shadow-sm mb-4">
        {loading ? <TableSkeleton rows={12} /> : (
          <DataTable 
            columns={columns} 
            data={users} 
            globalFilter={searchQuery}
            setGlobalFilter={setSearchQuery}
            pageSize={50}
            getRowClassName={(row) => !row.is_active ? 'opacity-50 grayscale-[0.5]' : ''}
          />
        )}
      </SectionCard>

      <Modal 
        open={!!modal} 
        onClose={() => setModal(null)} 
        title={modal === 'create' ? 'Initialize Identity Node' : 'Refine Identity Protocol'} 
        size="2xl"
        footer={
          <div className="flex gap-2.5 w-full justify-end">
            <Button variant="ghost" onClick={() => setModal(null)}>Abort</Button>
            <Button variant="primary" onClick={handleSave} className="px-8 shadow-lg shadow-primary/20 leading-none">
               Commit Protocol Change
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-8 py-2">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-1 h-3 bg-primary rounded-full" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Personnel Profile</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Legal Identity Name *" 
                value={form.name} 
                onChange={e => setF('name', e.target.value)} 
                placeholder="Full operational name"
              />
              <Input 
                label="Communications Access (Email)" 
                type="email" 
                value={form.email} 
                onChange={e => setF('email', e.target.value)} 
                placeholder="identity@internal.protocol"
              />
              <Input 
                label="Employee ID Registry *" 
                value={form.employee_id} 
                onChange={e => setF('employee_id', e.target.value)} 
                placeholder="e.g. 1001"
                maxLength={10} 
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 ml-1">Operational Role</label>
                <Select 
                  value={form.role} 
                  onChange={e => setF('role', e.target.value)}
                  className="bg-background/50 h-10 border-foreground/10"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                </Select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-1 h-3 bg-warning rounded-full" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Access Credentials</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Command Username *" 
                value={form.username} 
                onChange={e => setF('username', e.target.value)} 
                placeholder="username" 
                disabled={modal !== 'create'}
                className="bg-foreground/[0.02]"
              />
              <Input 
                label={`Auth Password ${modal !== 'create' ? '(Leave blank to retain)' : '*'}`}
                type="password" 
                value={form.password} 
                onChange={e => setF('password', e.target.value)} 
                placeholder="••••••••"
              />
            </div>
            {modal !== 'create' && (
              <div className="mt-2 p-4 bg-warning/5 border border-warning/10 rounded-xl flex items-start gap-3">
                 <Lock size={14} className="text-warning mt-0.5 shrink-0" />
                 <p className="text-[10px] font-medium text-warning leading-relaxed">
                   SECURITY PROTOCOL: Updating the username is restricted for established identities. 
                   Passwords should only be refined if the access key has been compromised.
                 </p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
