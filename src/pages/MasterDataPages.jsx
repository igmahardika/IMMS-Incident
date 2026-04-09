import React, { useEffect, useState } from 'react';
import { api } from '../utils/api.js';
import { ROLE_COLORS, GRADE_COLORS } from '../utils/constants.js';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastContext.jsx';
import { Modal, TableSkeleton, EmptyState, RoleBadge, StatusBadge, GradeBadge, AccentBadge, SectionCard, Button, Input, Spinner } from '../components/ui/index.jsx';
import { Plus, Edit2, Trash2, Database, Download, Network, ChevronRight, ChevronDown, Layout, Map as MapIcon, LayoutList, MapPinOff, Search, Tag, Router, Cable, RadioReceiver } from 'lucide-react';
import DistributionMap from '../components/ui/DistributionMap.jsx';
import CustomerMap from '../components/ui/CustomerMap.jsx';
import GeoSummary from '../components/ui/GeoSummary.jsx';
import { cn } from '../lib/utils.js';

import { DataTable } from '../components/tables/DataTable.jsx';

// Global icon stroke standard
const ICON_ST = 2;
const ICON_HD = 2.5;

// ─── Component helpers ────────────────────────────────────────────────────────

function TableCard({ children, title, subtitle, footer, headerAction }) {
  return (
    <SectionCard title={title} subtitle={subtitle} footer={footer} headerAction={headerAction} padding={false} className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar relative">
        {children}
      </div>
    </SectionCard>
  );
}

// ─── Master Customer Page ─────────────────────────────────────────────────────
export function MasterCustomerPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [modal, setModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState({ 
    customer_id: '', service_id: '', company_name: '', brand_site: '', 
    address: '', service_type: 'Internet Dedicated', grade: 'Bronze', 
    support_level: 'L1', link_coverage: '', latitude: '', longitude: '' 
  });
  const { addToast } = useToast();
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Column definitions for DataTable
  const columns = React.useMemo(() => [
    {
      accessorFn: (_, i) => i + 1,
      id: "index",
      header: "#",
      size: 40,
      cell: info => <span className="text-foreground/30 font-mono italic">{info.getValue()}</span>,
    },
    {
      accessorKey: "customer_id",
      header: "Cust ID",
      size: 70,
      meta: { className: 'whitespace-nowrap font-mono' },
      cell: info => <span className="text-primary font-mono tracking-tighter">{info.getValue()}</span>,
    },
    {
      accessorKey: "service_id",
      header: "Service ID",
      size: 70,
      meta: { className: 'whitespace-nowrap font-mono' },
      cell: info => <span className="text-secondary font-mono tracking-tighter">{info.getValue()}</span>,
    },
    {
      accessorKey: "company_name",
      header: "Company Name",
      size: 200,
      meta: { className: 'truncate flex-1', flexible: true },
      cell: info => <span className="text-foreground/80 tracking-tight font-bold">{info.getValue()}</span>,
    },
    {
      accessorKey: "brand_site",
      header: "Brand / Site",
      size: 130,
      meta: { className: 'truncate', flexible: true },
      cell: info => {
        const c = info.row.original;
        return (
          <div className="flex items-center gap-1.5 text-foreground/60 tracking-tight">
            <span className="truncate">{c.brand_site}</span>
            {(!c.latitude || !c.longitude) && (
              <span title="No coordinates found" className="text-error flex shrink-0">
                <MapPinOff size={10} strokeWidth={3} />
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "grade",
      header: "Grade",
      size: 60,
      meta: { className: 'text-center' },
      cell: info => <GradeBadge grade={info.getValue()} />,
    },
    {
      accessorKey: "support_level",
      header: "Level",
      size: 60,
      meta: { className: 'text-center' },
      cell: info => <AccentBadge text={info.getValue()} />,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      size: 60,
      meta: { className: 'text-center' },
      cell: info => <StatusBadge active={info.getValue()} />,
    },
    {
      accessorKey: "service_type",
      header: "Segment",
      size: 90,
      meta: { className: 'whitespace-nowrap px-1' },
      cell: info => <span className="text-[10px] font-black uppercase text-foreground/40">{info.getValue()}</span>,
    },
    {
      id: "actions",
      header: "",
      size: 70,
      meta: { className: 'text-right px-2' },
      cell: info => (
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="xs" onClick={() => openEdit(info.row.original)} className="w-6 h-6 p-0"><Edit2 size={11} strokeWidth={ICON_ST} /></Button>
          <Button variant="ghost" size="xs" onClick={() => handleDelete(info.row.original.id)} className="w-6 h-6 p-0 text-error hover:bg-error/10"><Trash2 size={11} strokeWidth={ICON_ST} /></Button>
        </div>
      ),
    },
  ], []);

  const load = () => api.getCustomers().then(setCustomers).catch(e => addToast(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openEdit = (c) => { setModal(c); setForm({ ...c }); };
  const openCreate = () => { setModal('create'); setForm({ customer_id: '', service_id: '', company_name: '', brand_site: '', address: '', service_type: 'Internet Dedicated', grade: 'Bronze', support_level: 'L1', link_coverage: '', latitude: '', longitude: '' }); };
  const handleSave = async () => {
    try {
      if (modal === 'create') { await api.createCustomer(form); addToast('Customer added successfully', 'success'); }
      else { await api.updateCustomer(modal.id, form); addToast('Customer updated successfully', 'success'); }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to deactivate this customer?')) return;
    try { await api.deleteCustomer(id); addToast('Customer deactivated', 'warning'); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      const parsed = rows.map(r => ({
        customer_id: r['Customer ID']?.toString() || '',
        service_id: r['Service ID']?.toString() || '',
        company_name: r['Company Name']?.toString() || '',
        brand_site: r['Brand / Site']?.toString() || '',
        address: r['Address']?.toString() || '',
        service_type: r['Service']?.toString() || '',
        grade: r['Grade']?.toString() || '',
        support_level: r['Support Level']?.toString() || '',
        link_coverage: r['Link Coverage']?.toString() || '',
      })).filter(c => c.customer_id);
      if (parsed.length === 0) throw new Error('Invalid data format');
      const res = await api.uploadCustomers(parsed);
      addToast(`Successfully uploaded ${res.count} customers`, 'success');
      load();
    } catch(err) { addToast(`Failed: ${err.message}`, 'error'); setLoading(false); }
    finally { e.target.value = null; }
  };
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ 'Customer ID': 'CUST-001', 'Service ID': 'SRV-001', 'Company Name': 'Example Co', 'Brand / Site': 'Main Branch', 'Address': 'Jl. Sudirman No 1', 'Service': 'Internet Dedicated', 'Grade': 'Gold', 'Support Level': 'L2', 'Link Coverage': 'https://maps.google.com/...' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Master_Customer.xlsx');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shrink-0 mb-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase leading-tight">Customer Master</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">{customers.length} registered customers</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/5 rounded-md px-3 h-8 flex-1 max-w-[300px] shadow-sm ring-1 ring-foreground/5 focus-within:ring-primary/40 focus-within:bg-background transition-all">
            <Search size={14} strokeWidth={ICON_ST} className="text-foreground/30" />
            <input 
              type="text" 
              className="bg-transparent border-none focus:ring-0 text-[11px] font-bold w-full py-1 placeholder:text-foreground/20 uppercase tracking-wider h-full" 
              placeholder="Search Customer..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search customer database"
            />
          </div>
          <div className="flex items-center gap-1 bg-foreground/[0.03] border border-foreground/5 p-1 rounded-md shrink-0 h-8">
            <button 
              className={cn(
                "p-1 rounded-md transition-all",
                viewMode === 'list' ? 'bg-background text-primary shadow-sm' : 'text-foreground/40 hover:text-foreground/60'
              )} 
              onClick={() => setViewMode('list')} aria-label="Toggle List View" title="List View"
            ><LayoutList size={14} strokeWidth={ICON_ST} /></button>
            <button 
              className={cn(
                "p-1 rounded-md transition-all",
                viewMode === 'map' ? 'bg-background text-primary shadow-sm' : 'text-foreground/40 hover:text-foreground/60'
              )} 
              onClick={() => setViewMode('map')} aria-label="Toggle Map View" title="Map View"
            ><MapIcon size={14} strokeWidth={ICON_ST} /></button>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="xs" onClick={downloadTemplate} className="font-bold text-[9px] tracking-widest px-2 h-8"><Download size={12} /> Template</Button>
            <label className="cursor-pointer">
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
              <Button variant="ghost" size="xs" className="font-bold text-[9px] tracking-widest pointer-events-none px-2 h-8">
                <Database size={12} /> Upload
              </Button>
            </label>
            <Button size="xs" onClick={openCreate} className="font-black text-[9px] tracking-widest px-4 h-8" aria-label="Add new customer record"><Plus size={12} strokeWidth={ICON_HD} /> Add Customer</Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-background/50 rounded-xl overflow-hidden shadow-2xl shadow-primary/5 ring-1 ring-foreground/5 border border-foreground/[0.02]">
        {loading ? (
            <TableSkeleton rows={15} />
        ) : viewMode === 'map' ? (
          <div className="h-full flex flex-col p-4 gap-4">
            <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-foreground/5 shadow-inner">
               <CustomerMap customers={customers} onRefresh={load} />
            </div>
            <GeoSummary customers={customers} />
          </div>
        ) : (
          <DataTable 
            data={customers} 
            columns={columns} 
            globalFilter={searchQuery} 
            setGlobalFilter={setSearchQuery}
            pageSize={20}
          />
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add New Customer' : 'Edit Customer'}
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave} className="px-6">Save Changes</Button></>}
      >
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Customer ID *" value={form.customer_id} onChange={e => setF('customer_id', e.target.value)} required />
            <Input label="Service ID *" value={form.service_id} onChange={e => setF('service_id', e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Company Name *" value={form.company_name} onChange={e => setF('company_name', e.target.value)} required />
            <Input label="Brand / Site *" value={form.brand_site} onChange={e => setF('brand_site', e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">Address</label>
            <textarea className="flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-bold shadow-sm focus:ring-1 focus:ring-ring min-h-[80px]" rows={2} value={form.address} onChange={e => setF('address', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">Service Type</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-bold shadow-sm focus:ring-1 focus:ring-ring" value={form.service_type} onChange={e => setF('service_type', e.target.value)}>
                {['Internet Dedicated', 'Broadband', 'VPN IP', 'MPLS', 'Astinet', 'VSAT', 'Clear Channel'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">SLA Grade</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-bold shadow-sm focus:ring-1 focus:ring-ring" value={form.grade} onChange={e => setF('grade', e.target.value)}>
                {['VIP', 'Gold', 'Silver', 'Bronze'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">Support Level</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-bold shadow-sm focus:ring-1 focus:ring-ring" value={form.support_level} onChange={e => setF('support_level', e.target.value)}>
                {['L1', 'L2', 'L3'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <Input label="Link Coverage (Maps/NMS URL)" type="url" value={form.link_coverage} onChange={e => setF('link_coverage', e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Latitude" type="number" step="any" placeholder="-6.1234..." value={form.latitude} onChange={e => setF('latitude', e.target.value)} />
            <Input label="Longitude" type="number" step="any" placeholder="110.1234..." value={form.longitude} onChange={e => setF('longitude', e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Master Classification Page ───────────────────────────────────────────────
export function MasterClassificationPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ klasifikasi: '', sub_klasifikasi: '' });
  const { addToast } = useToast();
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = () => api.getClassifications().then(setClasses).catch(e => addToast(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const toggle = (k) => setExpanded(p => ({ ...p, [k]: !p[k] }));
  const openEdit = (c) => { setModal(c); setForm({ klasifikasi: c.klasifikasi, sub_klasifikasi: c.sub_klasifikasi || '' }); };
  const openCreate = () => { setModal('create'); setForm({ klasifikasi: '', sub_klasifikasi: '' }); };
  
  const handleSave = async () => {
    try {
      if (modal === 'create') { await api.createClassification(form); addToast('Classification added', 'success'); }
      else { await api.updateClassification(modal.id, form); addToast('Updated successfully', 'success'); }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this classification?')) return;
    try { await api.deleteClassification(id); addToast('Deleted', 'warning'); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };

  const grouped = classes.reduce((acc, c) => {
    if (!acc[c.klasifikasi]) acc[c.klasifikasi] = [];
    acc[c.klasifikasi].push(c);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-start justify-between gap-4 flex-wrap shrink-0 mb-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase leading-tight">Classification Master</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">Hierarchy of incident categories</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="xs" onClick={openCreate} className="font-black text-[9px] tracking-widest px-4 h-8 uppercase"><Plus size={12} strokeWidth={ICON_HD} /> Add Category</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pr-2 -mr-2">
        {loading ? <TableSkeleton rows={6} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {Object.entries(grouped).map(([klasifikasi, items]) => (
              <SectionCard 
                key={klasifikasi}
                title={klasifikasi.toUpperCase()}
                subtitle={`${items.length} sub-categories defined`}
                padding={false}
                className="flex flex-col h-fit"
                headerAction={
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="xs" onClick={() => toggle(klasifikasi)} className="w-7 h-7 p-0">
                      {expanded[klasifikasi] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </Button>
                  </div>
                }
              >
                <div className="divide-y divide-foreground/5 bg-foreground/[0.01]">
                  {items.map(c => (
                    <div key={c.id} className="group hover:bg-background transition-colors px-4 py-2 flex items-center justify-between gap-4 border-l-2 border-transparent hover:border-primary/40">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold text-foreground/80 tracking-tight">{c.sub_klasifikasi || 'General / Root'}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button variant="ghost" size="xs" onClick={() => openEdit(c)} className="w-6 h-6 p-0"><Edit2 size={11} strokeWidth={ICON_ST} /></Button>
                        <Button variant="ghost" size="xs" onClick={() => handleDelete(c.id)} className="w-6 h-6 p-0 text-error hover:bg-error/10"><Trash2 size={11} strokeWidth={ICON_ST} /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Classification' : 'Edit Classification'}
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave} className="px-6">Save Changes</Button></>}
      >
        <div className="flex flex-col gap-6">
          <Input label="Primary Classification *" value={form.klasifikasi} onChange={e => setF('klasifikasi', e.target.value)} required />
          <Input label="Sub Classification" value={form.sub_klasifikasi} onChange={e => setF('sub_klasifikasi', e.target.value)} placeholder="Optional" />
        </div>
      </Modal>
    </div>
  );
}

// ─── User Management Page ─────────────────────────────────────────────────────
export function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const ROLES = ['admin', 'manager', 'noc', 'technician'];
  const columns = React.useMemo(() => [
    {
      accessorFn: (_, i) => i + 1,
      id: "index",
      header: "#",
      size: 40,
      cell: info => <span className="text-foreground/30 font-mono italic">{info.getValue()}</span>,
    },
    {
      accessorKey: "employee_id",
      header: "Emp ID",
      size: 70,
      cell: info => <div className="text-center font-mono font-bold text-primary/80 tracking-tighter">{info.getValue() || '—'}</div>,
    },
    {
      accessorKey: "name",
      header: "User Identity",
      size: 200,
      meta: { className: 'truncate', flexible: true },
      cell: info => {
        const u = info.row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-foreground/80 tracking-tight truncate">{u.name}</span>
            <span className="text-[9px] font-black font-mono text-foreground/40 uppercase tracking-widest truncate">@{u.username}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email Access",
      size: 150,
      meta: { className: 'truncate opacity-60', flexible: true },
      cell: info => <span className="font-bold tracking-tight">{info.getValue() || '—'}</span>,
    },
    {
      accessorKey: "role",
      header: "Permissions",
      size: 90,
      meta: { className: 'whitespace-nowrap text-center px-1' },
      cell: info => <RoleBadge role={info.getValue()} />,
    },
    {
      accessorKey: "is_active",
      header: "State",
      size: 60,
      meta: { className: 'text-center' },
      cell: info => (
        <button onClick={() => handleToggle(info.row.original)} className="transition-transform active:scale-95">
          <StatusBadge active={info.getValue()} />
        </button>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 70,
      meta: { className: 'text-right px-2' },
      cell: info => (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
          <Button variant="ghost" size="xs" onClick={() => openEdit(info.row.original)} className="w-6 h-6 p-0"><Edit2 size={11} strokeWidth={ICON_ST} /></Button>
          <Button variant="ghost" size="xs" onClick={() => handleDelete(info.row.original.id)} className="w-6 h-6 p-0 text-error hover:bg-error/10"><Trash2 size={11} strokeWidth={ICON_ST} /></Button>
        </div>
      ),
    },
  ], []);

  const [form, setForm] = useState({ employee_id: '', username: '', password: '', name: '', role: 'noc', email: '' });
  const { addToast } = useToast();
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = () => api.getUsers().then(setUsers).catch(e => addToast(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openEdit = (u) => { setModal(u); setForm({ ...u, password: '' }); };
  const openCreate = () => { setModal('create'); setForm({ employee_id: '', username: '', password: '', name: '', role: 'noc', email: '' }); };

  const handleSave = async () => {
    try {
      if (modal === 'create') { await api.createUser(form); addToast('User created', 'success'); }
      else { await api.updateUser(modal.id, form); addToast('User updated', 'success'); }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    try { await api.deleteUser(id); addToast('User deleted', 'warning'); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };

  const handleToggle = async (u) => {
    try { await api.updateUser(u.id, { is_active: !u.is_active }); addToast(`User ${!u.is_active ? 'activated' : 'deactivated'}`, 'info'); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shrink-0 mb-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase leading-tight">User Accounts</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">{users.length} registered access keys</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/5 rounded-md px-3 h-8 flex-1 max-w-[300px] shadow-sm ring-1 ring-foreground/5 focus-within:ring-primary/40 focus-within:bg-background transition-all">
            <Search size={14} strokeWidth={ICON_ST} className="text-foreground/30" />
            <input 
              type="text" 
              className="bg-transparent border-none focus:ring-0 text-[11px] font-bold w-full py-1 placeholder:text-foreground/20 uppercase tracking-wider h-full" 
              placeholder="Search Username or Name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button size="xs" onClick={openCreate} className="font-black text-[9px] tracking-widest px-4 h-8 shrink-0 uppercase"><Plus size={12} strokeWidth={ICON_HD} /> Create Account</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0  bg-background/50 rounded-xl overflow-hidden shadow-2xl shadow-primary/5 ring-1 ring-foreground/5 border border-foreground/[0.02]">
        {loading ? <TableSkeleton rows={10} /> : (
          <DataTable 
            data={users} 
            columns={columns} 
            globalFilter={searchQuery} 
            setGlobalFilter={setSearchQuery}
            pageSize={20}
          />
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Create New Account' : 'Edit Account Details'}
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave} className="px-6">Save Account</Button></>}
      >
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input 
              label="Employee ID *" 
              value={form.employee_id} 
              onChange={e => setF('employee_id', e.target.value)} 
              placeholder="e.g. 1001" 
              maxLength={4} 
              required
            />
            <Input 
              label="Username *" 
              value={form.username} 
              onChange={e => setF('username', e.target.value)} 
              placeholder="username" 
              disabled={modal !== 'create'} 
              required
            />
            <Input 
              label={`Password ${modal !== 'create' ? '(Optional)' : '*'}`}
              type="password" 
              value={form.password} 
              onChange={e => setF('password', e.target.value)} 
              placeholder={modal !== 'create' ? '••••••••' : 'Password'}
              required={modal === 'create'}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="Full Name *" 
              value={form.name} 
              onChange={e => setF('name', e.target.value)} 
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">System Role</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-bold shadow-sm focus:ring-1 focus:ring-ring" 
                value={form.role} 
                onChange={e => setF('role', e.target.value)}
              >
                {ROLES.map(r => <option key={r} value={r} className="bg-background">{r.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <Input 
            label="Email Address" 
            type="email" 
            value={form.email} 
            onChange={e => setF('email', e.target.value)} 
            placeholder="user@example.com"
          />
        </div>
      </Modal>
    </div>
  );
}

// ─── Master Technical Support Page ────────────────────────────────────────────
export function MasterTechnicalSupportPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ no: '', name: '', unit: '' });
  const { addToast } = useToast();
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = () => api.getTechnicalSupport().then(setData).catch(e => addToast(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openEdit = (item) => { setModal(item); setForm({ no: item.no || '', name: item.name, unit: item.unit }); };
  const openCreate = () => { setModal('create'); setForm({ no: '', name: '', unit: '' }); };
  
  const handleSave = async () => {
    try {
      if (modal === 'create') { await api.createTechnicalSupport(form); addToast('Personnel added successfully', 'success'); }
      else { await api.updateTechnicalSupport(modal.id, form); addToast('Updated successfully', 'success'); }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record permanently?')) return;
    try {
      await api.deleteTechnicalSupport(id);
      addToast('Deleted successfully', 'success');
      load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      const parsed = rows.map(r => ({ no: r['No']?.toString() || '', name: r['Name']?.toString() || '', unit: r['Unit']?.toString() || '' })).filter(r => r.name && r.unit);
      const res = await api.uploadTechnicalSupport(parsed);
      addToast(`Successfully uploaded ${res.count} records`, 'success');
      load();
    } catch(err) { addToast(err.message, 'error'); setLoading(false); }
    finally { e.target.value = null; }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ No: '1', Name: 'John Doe', Unit: 'Maintenance Area A' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Personel_Data.xlsx');
  };

  // Column definitions for DataTable
  const columns = React.useMemo(() => [
    {
      accessorFn: (_, i) => i + 1,
      id: "index",
      header: "#",
      size: 40,
      cell: info => <span className="text-foreground/30 font-mono italic">{info.getValue()}</span>,
    },
    {
      accessorKey: "no",
      header: "NRK / No",
      size: 90,
      meta: { className: 'whitespace-nowrap font-mono' },
      cell: info => <div className="text-center font-mono font-bold text-primary/80 tracking-tighter">{info.getValue() || '—'}</div>,
    },
    {
      accessorKey: "name",
      header: "Personnel Name",
      size: 200,
      meta: { className: 'truncate', flexible: true },
      cell: info => <span className="font-bold text-foreground/80 tracking-tight">{info.getValue()}</span>,
    },
    {
      accessorKey: "unit",
      header: "Assigned Unit / Area",
      size: 200,
      meta: { className: 'truncate', flexible: true },
      cell: info => (
        <span className="px-1.5 py-0.5 rounded bg-primary/5 text-primary text-[9px] font-black uppercase tracking-wider border border-primary/10">
          {info.getValue()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 70,
      meta: { className: 'text-right px-2' },
      cell: info => (
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="xs" onClick={() => openEdit(info.row.original)} className="w-6 h-6 p-0"><Edit2 size={11} strokeWidth={ICON_ST} /></Button>
          <Button variant="ghost" size="xs" onClick={() => handleDelete(info.row.original.id)} className="w-6 h-6 p-0 text-error hover:bg-error/10"><Trash2 size={11} strokeWidth={ICON_ST} /></Button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shrink-0 mb-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase leading-tight">Personnel Records</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">{data.length} registered field engineers</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/5 rounded-md px-3 h-8 flex-1 max-w-[300px] shadow-sm ring-1 ring-foreground/5 focus-within:ring-primary/40 focus-within:bg-background transition-all">
            <Search size={14} strokeWidth={ICON_ST} className="text-foreground/30" />
            <input 
              type="text" 
              className="bg-transparent border-none focus:ring-0 text-[11px] font-bold w-full py-1 placeholder:text-foreground/20 uppercase tracking-wider h-full" 
              placeholder="Filter Technicians..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="xs" onClick={downloadTemplate} className="font-bold text-[9px] tracking-widest px-2 h-8"><Download size={12} strokeWidth={ICON_ST} /> Template</Button>
          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
            <Button variant="ghost" size="xs" className="font-bold text-[9px] tracking-widest h-8 pointer-events-none">
              <Database size={12} strokeWidth={ICON_ST} /> Upload
            </Button>
          </label>
          <Button size="xs" onClick={openCreate} className="font-black text-[9px] tracking-widest px-6 h-8 shrink-0 uppercase"><Plus size={12} strokeWidth={ICON_HD} /> Add Personnel</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-background/50 rounded-xl overflow-hidden shadow-2xl shadow-primary/5 ring-1 ring-foreground/5 border border-foreground/[0.02]">
        {loading ? <TableSkeleton rows={12} /> : (
          <DataTable 
            data={data} 
            columns={columns} 
            globalFilter={searchQuery} 
            setGlobalFilter={setSearchQuery}
            pageSize={20}
          />
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Support Contact' : 'Edit Support Contact'}
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave} className="px-6">Save Record</Button></>}
      >
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Input label="Assign No" value={form.no} onChange={e => setF('no', e.target.value)} placeholder="e.g. 1" />
            <div className="md:col-span-3">
              <Input label="Engineer Name *" value={form.name} onChange={e => setF('name', e.target.value)} required />
            </div>
          </div>
          <Input label="Unit / Assignment *" value={form.unit} onChange={e => setF('unit', e.target.value)} placeholder="e.g. Area Jakarta Timur" required />
        </div>
      </Modal>
    </div>
  );
}

// ─── Master Distribusi Page ──────────────────────────────────────────────────
export function MasterDistribusiPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [modal, setModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ type: 'Fiber Optic', level_1: '', level_2: '', level_3: '', level_4: '', latitude: '', longitude: '' });
  const { addToast } = useToast();
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Column definitions for DataTable
  const columns = React.useMemo(() => [
    {
      accessorFn: (_, i) => i + 1,
      id: "index",
      header: "#",
      size: 40,
      cell: info => <span className="text-foreground/30 font-mono italic">{info.getValue()}</span>,
    },
    {
      accessorKey: "type",
      header: "Type",
      size: 90,
      meta: { className: 'whitespace-nowrap px-1' },
      cell: info => <span className="font-black uppercase text-[10px] tracking-widest text-primary/70">{info.getValue()}</span>,
    },
    {
      accessorKey: "level_1",
      header: "Level 1",
      size: 130,
      meta: { className: 'truncate', flexible: true },
      cell: info => <span className="font-bold text-foreground/80 tracking-tight">{info.getValue()}</span>,
    },
    {
      accessorKey: "level_2",
      header: "Level 2",
      size: 130,
      meta: { className: 'truncate', flexible: true },
      cell: info => <span className="font-bold text-foreground/70 tracking-tight">{info.getValue()}</span>,
    },
    {
      accessorKey: "level_3",
      header: "Level 3",
      size: 130,
      meta: { className: 'truncate', flexible: true },
      cell: info => <span className="font-bold text-foreground/60 tracking-tight">{info.getValue() || '—'}</span>,
    },
    {
      accessorKey: "level_4",
      header: "Level 4",
      size: 130,
      meta: { className: 'truncate', flexible: true },
      cell: info => <span className="font-bold text-foreground/60 tracking-tight">{info.getValue() || '—'}</span>,
    },
    {
      id: "actions",
      header: "",
      size: 70,
      meta: { className: 'text-right px-2' },
      cell: info => (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
          <Button variant="ghost" size="xs" onClick={() => openEdit(info.row.original)} className="w-6 h-6 p-0"><Edit2 size={11} /></Button>
          <Button variant="ghost" size="xs" onClick={() => handleDelete(info.row.original.id)} className="w-6 h-6 p-0 text-error hover:bg-error/10"><Trash2 size={11} /></Button>
        </div>
      ),
    },
  ], []);

  const load = () => api.getDistribusi().then(setData).catch(e => addToast(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openEdit = (d) => { setModal(d); setForm({ ...d }); };
  const openCreate = () => { setModal('create'); setForm({ type: 'Fiber Optic', level_1: '', level_2: '', level_3: '', level_4: '', latitude: '', longitude: '' }); };
  
  const handleSave = async () => {
    try {
      if (modal === 'create') { await api.createDistribusi(form); addToast('Distribution record added', 'success'); }
      else { await api.updateDistribusi(modal.id, form); addToast('Updated successfully', 'success'); }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this record?')) return;
    try { await api.deleteDistribusi(id); addToast('Deleted', 'warning'); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      
      const fo = rows.filter(r => r['Type'] === 'Fiber Optic').map(r => ({
        type: 'Fiber Optic',
        level_1: r['POP'] || '',
        level_2: r['OSC'] || '',
        level_3: r['ODC'] || '',
        level_4: r['ODP'] || '',
        latitude: r['Latitude'],
        longitude: r['Longitude']
      }));
      
      const wireless = rows.filter(r => r['Type'] === 'Wireless').map(r => ({
        type: 'Wireless',
        level_1: r['BTS'] || '',
        level_2: r['Radio'] || '',
        latitude: r['Latitude'],
        longitude: r['Longitude']
      }));

      if (fo.length) await api.uploadDistribusi('Fiber Optic', fo);
      if (wireless.length) await api.uploadDistribusi('Wireless', wireless);
      
      addToast(`Uploaded ${fo.length + wireless.length} records`, 'success');
      load();
    } catch(err) { addToast(err.message, 'error'); setLoading(false); }
    finally { e.target.value = null; }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shrink-0 mb-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase leading-tight">Distribution Topology</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">{data.length} registered distribution points</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/5 rounded-md px-3 h-8 flex-1 max-w-[300px] shadow-sm ring-1 ring-foreground/5 focus-within:ring-primary/40 focus-within:bg-background transition-all">
            <Search size={14} strokeWidth={ICON_ST} className="text-foreground/30" />
            <input 
              type="text" 
              className="bg-transparent border-none focus:ring-0 text-[11px] font-bold w-full py-1 placeholder:text-foreground/20 uppercase tracking-wider h-full" 
              placeholder="Search Topology..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 bg-foreground/[0.03] border border-foreground/5 p-1 rounded-md shrink-0 h-8">
            <button className={cn("p-1 rounded-md transition-all", viewMode === 'list' ? 'bg-background text-primary shadow-sm' : 'text-foreground/40')} onClick={() => setViewMode('list')}><LayoutList size={14} /></button>
            <button className={cn("p-1 rounded-md transition-all", viewMode === 'map' ? 'bg-background text-primary shadow-sm' : 'text-foreground/40')} onClick={() => setViewMode('map')}><MapIcon size={14} /></button>
          </div>
          <div className="flex gap-1 justify-end">
            <label className="cursor-pointer">
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              <Button variant="ghost" size="xs" className="font-bold text-[9px] tracking-widest px-2 h-8 pointer-events-none uppercase"><Database size={12} /> Upload</Button>
            </label>
            <Button size="xs" onClick={openCreate} className="font-black text-[9px] tracking-widest px-4 h-8 uppercase"><Plus size={12} strokeWidth={ICON_HD} /> Add Point</Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-background/50 rounded-xl overflow-hidden shadow-2xl shadow-primary/5 ring-1 ring-foreground/5 border border-foreground/[0.02]">
        {loading ? <TableSkeleton rows={15} /> : viewMode === 'map' ? (
          <div className="h-full p-4">
             <DistributionMap data={data} onRefresh={load} />
          </div>
        ) : (
          <DataTable 
            data={data} 
            columns={columns} 
            globalFilter={searchQuery} 
            setGlobalFilter={setSearchQuery}
            pageSize={20}
          />
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Distribution Point' : 'Edit Distribution Point'}
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave} className="px-6">Save</Button></>}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">Type</label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-bold shadow-sm"
              value={form.type} onChange={e => setF('type', e.target.value)}>
              <option>Fiber Optic</option>
              <option>Wireless</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Input label={form.type === 'Fiber Optic' ? 'POP (Level 1) *' : 'BTS (Level 1) *'} value={form.level_1} onChange={e => setF('level_1', e.target.value)} required />
            <Input label={form.type === 'Fiber Optic' ? 'OSC (Level 2) *' : 'Radio (Level 2) *'} value={form.level_2} onChange={e => setF('level_2', e.target.value)} required />
          </div>
          {form.type === 'Fiber Optic' && (
            <div className="grid grid-cols-2 gap-6">
              <Input label="ODC (Level 3)" value={form.level_3} onChange={e => setF('level_3', e.target.value)} />
              <Input label="ODP (Level 4)" value={form.level_4} onChange={e => setF('level_4', e.target.value)} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-6">
            <Input label="Latitude" type="number" step="any" value={form.latitude} onChange={e => setF('latitude', e.target.value)} />
            <Input label="Longitude" type="number" step="any" value={form.longitude} onChange={e => setF('longitude', e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Master Action Page ───────────────────────────────────────────────────────
export function MasterActionPage() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ name: '' });
  const { addToast } = useToast();
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const columns = React.useMemo(() => [
    {
      accessorFn: (_, i) => i + 1,
      id: "index",
      header: "#",
      size: 40,
      cell: info => <span className="text-foreground/33 font-mono italic">{info.getValue()}</span>,
    },
    {
      accessorKey: "name",
      header: "Action Description",
      size: 400,
      meta: { className: 'truncate flex-1', flexible: true },
      cell: info => <span className="font-bold text-foreground/80 tracking-tight">{info.getValue()}</span>,
    },
    {
      id: "actions",
      header: "",
      size: 70,
      meta: { className: 'text-right px-2' },
      cell: info => (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
          <Button variant="ghost" size="xs" onClick={() => openEdit(info.row.original)} className="w-6 h-6 p-0"><Edit2 size={11} /></Button>
          <Button variant="ghost" size="xs" onClick={() => handleDelete(info.row.original.id)} className="w-6 h-6 p-0 text-error hover:bg-error/10"><Trash2 size={11} /></Button>
        </div>
      ),
    },
  ], []);

  const load = () => api.getActions().then(setActions).catch(e => addToast(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openEdit = (a) => { setModal(a); setForm({ name: a.name }); };
  const openCreate = () => { setModal('create'); setForm({ name: '' }); };

  const handleSave = async () => {
    try {
      if (modal === 'create') { await api.createAction(form); addToast('Action added', 'success'); }
      else { await api.updateAction(modal.id, form); addToast('Updated', 'success'); }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this action?')) return;
    try { await api.deleteAction(id); addToast('Deleted', 'warning'); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-start justify-between gap-4 flex-wrap shrink-0 mb-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase leading-tight">Response Actions</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">{actions.length} preset incident actions</p>
        </div>
        <Button size="xs" onClick={openCreate} className="font-black text-[9px] tracking-widest px-4 h-8 uppercase"><Plus size={12} strokeWidth={ICON_HD} /> Add Action</Button>
      </div>

      <div className="flex-1 min-h-0 bg-background/50 rounded-xl overflow-hidden shadow-2xl shadow-primary/5 ring-1 ring-foreground/5 border border-foreground/[0.02]">
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

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Define New Action' : 'Modify Action'}
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave} className="px-6">Save Changes</Button></>}
      >
        <Input label="Action Name / Description *" value={form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. Restart OLT Port" required />
      </Modal>
    </div>
  );
}
