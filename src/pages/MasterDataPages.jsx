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
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [form, setForm] = useState({ customer_id: '', service_id: '', company_name: '', brand_site: '', address: '', service_type: 'Internet Dedicated', grade: 'Bronze', support_level: 'L1', link_coverage: '', latitude: '', longitude: '' });
  const { addToast } = useToast();
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

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
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase leading-tight">Customer Master</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">{customers.length} registered customers</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
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
          (() => {
            const filtered = customers.filter(c => 
              (c.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              (c.brand_site || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              (c.service_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              (c.customer_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              (c.address || '').toLowerCase().includes(searchQuery.toLowerCase())
            );
            
            if (filtered.length === 0) return <EmptyState icon={<Database size={40} />} title="Not Found" desc="Try adjusting your search query" />;
            
            const totalPages = Math.ceil(filtered.length / rowsPerPage);
            const startIdx = (currentPage - 1) * rowsPerPage;
            const paginated = filtered.slice(startIdx, startIdx + rowsPerPage);
            
            return (
              <div className="flex flex-col h-full">
                <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-foreground/5">
                      <tr className="bg-foreground/[0.02]">
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 w-12 text-center">#</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 min-w-[100px]">Cust ID</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 min-w-[100px]">Service ID</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5">Company Name</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 min-w-[180px]">Brand / Site</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 text-center">Grade</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 text-center">Level</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 text-center">Status</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5">Service</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 text-right pr-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/5">
                      {paginated.map((c, i) => (
                        <tr key={c.id} className="hover:bg-foreground/[0.01] transition-colors group">
                          <td className="px-4 py-2.5 text-[10px] font-bold text-foreground/30 text-center font-mono italic">{startIdx + i + 1}</td>
                          <td className="px-4 py-2.5 text-[11px] font-bold text-primary font-mono tracking-tighter">{c.customer_id}</td>
                          <td className="px-4 py-2.5 text-[11px] font-bold text-secondary font-mono tracking-tighter">{c.service_id}</td>
                          <td className="px-4 py-2.5 text-[11px] font-bold text-foreground/80 tracking-tight">{c.company_name}</td>
                          <td className="px-4 py-2.5 text-[11px] font-bold text-foreground/60 tracking-tight">
                            <div className="flex items-center gap-1.5">
                              {c.brand_site}
                              {(!c.latitude || !c.longitude) && (
                                <span title="No coordinates found" className="text-error flex shrink-0">
                                  <MapPinOff size={10} strokeWidth={3} />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center"><GradeBadge grade={c.grade} /></td>
                          <td className="px-4 py-2.5 text-center"><AccentBadge text={c.support_level} /></td>
                          <td className="px-4 py-2.5 text-center"><StatusBadge active={c.is_active} /></td>
                          <td className="px-4 py-2.5 text-[10px] font-black text-foreground/40 uppercase tracking-widest font-mono">{c.service_type}</td>
                          <td className="px-4 py-2.5 text-right pr-4">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="xs" onClick={() => openEdit(c)} className="w-7 h-7 p-0" aria-label="Edit customer" title="Edit Customer"><Edit2 size={12} strokeWidth={ICON_ST} /></Button>
                              <Button variant="ghost" size="xs" onClick={() => handleDelete(c.id)} className="w-7 h-7 p-0 text-error hover:bg-error/10" aria-label="Deactivate customer" title="Deactivate Customer"><Trash2 size={12} strokeWidth={ICON_ST} /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-2 bg-foreground/[0.02] border-t border-foreground/5 gap-4 mt-auto">
                  <div className="text-[10px] font-black uppercase tracking-widest text-foreground/30">
                    Showing <span className="text-foreground/60">{startIdx + 1}</span> to <span className="text-foreground/60">{Math.min(startIdx + rowsPerPage, filtered.length)}</span> of <span className="text-foreground/60">{filtered.length}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">Rows</span>
                       <select 
                        className="bg-transparent border-none text-[11px] font-bold focus:ring-0 p-0 h-auto cursor-pointer text-foreground/60 uppercase"
                        value={rowsPerPage} 
                        onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      >
                        {[20, 50, 100].map(v => <option key={v} value={v} className="bg-background">{v}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="xs" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-7 h-7 p-0"><ChevronRight className="rotate-180" size={12} /></Button>
                      <div className="text-[10px] font-black flex items-center gap-1.5 px-3 uppercase tracking-widest">
                         <span className="text-foreground/70">{currentPage}</span>
                         <span className="text-foreground/20">/</span>
                         <span className="text-foreground/50">{totalPages}</span>
                      </div>
                      <Button variant="ghost" size="xs" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-7 h-7 p-0"><ChevronRight size={12} /></Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
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
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase leading-tight">Classification Master</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">Hierarchy of incident categories</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="xs" onClick={openCreate} className="font-black text-[9px] tracking-widest px-4 h-8"><Plus size={12} /> Add Category</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pr-1">
        {loading ? <TableSkeleton rows={6} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [form, setForm] = useState({ employee_id: '', username: '', password: '', role: 'technician', name: '', email: '' });
  const { addToast } = useToast();
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const ROLES = ['admin', 'manager', 'noc', 'technician'];

  const load = () => api.getUsers().then(setUsers).catch(e => addToast(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openEdit = (u) => { setModal(u); setForm({ employee_id: u.employee_id || '', username: u.username, password: '', role: u.role, name: u.name, email: u.email || '' }); };
  const openCreate = () => { setModal('create'); setForm({ employee_id: '', username: '', password: '', role: 'technician', name: '', email: '' }); };
  
  const handleSave = async () => {
    try {
      if (modal === 'create') { await api.createUser(form); addToast('User created successfully', 'success'); }
      else { await api.updateUser(modal.id, form); addToast('User updated successfully', 'success'); }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    try { await api.deleteUser(id); addToast('User removed', 'warning'); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };

  const handleToggle = async (u) => {
    try { await api.updateUser(u.id, { is_active: u.is_active ? 0 : 1 }); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase leading-tight">User Accounts</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">{users.length} registered access keys</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
          <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/5 rounded-md px-3 h-8 flex-1 max-w-[300px] shadow-sm ring-1 ring-foreground/5 focus-within:ring-primary/40 focus-within:bg-background transition-all">
            <Search size={14} strokeWidth={ICON_ST} className="text-foreground/30" />
            <input 
              type="text" 
              className="bg-transparent border-none focus:ring-0 text-[11px] font-bold w-full py-1 placeholder:text-foreground/20 uppercase tracking-wider h-full" 
              placeholder="Search Username or Name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search user accounts"
            />
          </div>
          <Button size="xs" onClick={openCreate} className="font-black text-[9px] tracking-widest px-4 h-8"><Plus size={12} /> Create Account</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0  bg-background/50 rounded-xl overflow-hidden shadow-2xl shadow-primary/5 ring-1 ring-foreground/5 border border-foreground/[0.02]">
        {loading ? <TableSkeleton rows={10} /> : (() => {
          const filtered = users.filter(u => 
            (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.employee_id || '').toLowerCase().includes(searchQuery.toLowerCase())
          );
          if (filtered.length === 0) return <EmptyState icon={<Database size={40} />} title="Not Found" desc="No users match the search criteria" />;
          
          const totalPages = Math.ceil(filtered.length / rowsPerPage);
          const startIdx = (currentPage - 1) * rowsPerPage;
          const paginated = filtered.slice(startIdx, startIdx + rowsPerPage);

          return (
            <div className="flex flex-col h-full">
              <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-foreground/5">
                    <tr className="bg-foreground/[0.02]">
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 w-12 text-center">#</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 min-w-[80px] text-center">Emp ID</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5">User Identity</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 min-w-[150px]">Email Access</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 text-center">Permissions</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 text-center">Account State</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 text-right pr-6 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">Management</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/5 text-[11px]">
                    {paginated.map((u, i) => (
                      <tr key={u.id} className="hover:bg-foreground/[0.01] transition-colors group">
                        <td className="px-4 py-2.5 text-[10px] font-bold text-foreground/30 text-center font-mono italic">{startIdx + i + 1}</td>
                        <td className="px-4 py-2.5 text-center font-mono font-bold text-primary/80 tracking-tighter">{u.employee_id || '—'}</td>
                        <td className="px-4 py-2.5">
                           <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-foreground/80 tracking-tight">{u.name}</span>
                              <span className="text-[9px] font-black font-mono text-foreground/40 uppercase tracking-widest">@{u.username}</span>
                           </div>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-foreground/50 tracking-tight">{u.email || '—'}</td>
                        <td className="px-4 py-2.5 text-center"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-2.5 text-center">
                          <button onClick={() => handleToggle(u)} className="transition-transform active:scale-95">
                            <StatusBadge active={u.is_active} />
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-right pr-4">
                           <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                             <Button variant="ghost" size="xs" onClick={() => openEdit(u)} className="w-7 h-7 p-0" aria-label="Edit user account" title="Edit User"><Edit2 size={12} strokeWidth={ICON_ST} /></Button>
                             <Button variant="ghost" size="xs" onClick={() => handleDelete(u.id)} className="w-7 h-7 p-0 text-error hover:bg-error/10" aria-label="Delete user account" title="Delete User"><Trash2 size={12} strokeWidth={ICON_ST} /></Button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-2 bg-foreground/[0.02] border-t border-foreground/5 gap-4 mt-auto">
                <div className="text-[10px] font-black uppercase tracking-widest text-foreground/30">
                  Showing <span className="text-foreground/60">{startIdx + 1}</span> to <span className="text-foreground/60">{Math.min(startIdx + rowsPerPage, filtered.length)}</span> of <span className="text-foreground/60">{filtered.length}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">Rows</span>
                     <select 
                      className="bg-transparent border-none text-[11px] font-bold focus:ring-0 p-0 h-auto cursor-pointer text-foreground/60 uppercase"
                      value={rowsPerPage} 
                      onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    >
                      {[20, 50, 100].map(v => <option key={v} value={v} className="bg-background">{v}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="xs" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-7 h-7 p-0"><ChevronRight className="rotate-180" size={12} /></Button>
                    <div className="text-[10px] font-black flex items-center gap-1.5 px-3 uppercase tracking-widest">
                       <span className="text-foreground/70">{currentPage}</span>
                       <span className="text-foreground/20">/</span>
                       <span className="text-foreground/50">{totalPages}</span>
                    </div>
                    <Button variant="ghost" size="xs" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-7 h-7 p-0"><ChevronRight size={12} /></Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
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

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase leading-tight">Personnel Records</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">{data.length} registered field engineers</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
          <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/5 rounded-md px-3 h-8 flex-1 max-w-[300px] shadow-sm ring-1 ring-foreground/5 focus-within:ring-primary/40 focus-within:bg-background transition-all">
            <Search size={14} strokeWidth={ICON_ST} className="text-foreground/30" />
            <input 
              type="text" 
              className="bg-transparent border-none focus:ring-0 text-[11px] font-bold w-full py-1 placeholder:text-foreground/20 uppercase tracking-wider h-full" 
              placeholder="Filter Technicians..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search personnel records"
            />
          </div>
          <Button variant="ghost" size="xs" onClick={downloadTemplate} className="font-bold text-[9px] tracking-widest px-2 h-8"><Download size={12} strokeWidth={ICON_ST} /> Template</Button>
          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
            <Button variant="ghost" size="xs" className="font-bold text-[9px] tracking-widest h-8 pointer-events-none">
              <Database size={12} strokeWidth={ICON_ST} /> Upload
            </Button>
          </label>
          <Button size="xs" onClick={openCreate} className="font-black text-[9px] tracking-widest px-6 h-8"><Plus size={12} /> Add Personnel</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-background/50 rounded-xl overflow-hidden shadow-2xl shadow-primary/5 ring-1 ring-foreground/5 border border-foreground/[0.02]">
        {loading ? <TableSkeleton rows={12} /> : (
          (() => {
            const filtered = data.filter(it => 
              it.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
              it.unit?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            if (filtered.length === 0) return <EmptyState icon={<Database size={40} />} title="Not Found" desc="No personnel match your search" />;

            return (
              <div className="flex flex-col h-full">
                <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-foreground/5">
                      <tr className="bg-foreground/[0.02]">
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 w-12 text-center">#</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 w-24 text-center">Assign No</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 min-w-[200px]">Engineer Name</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5">Assignment / Unit</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 text-right pr-6">Management</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/5 text-[11px]">
                      {filtered.map((item, i) => (
                        <tr key={item.id} className="hover:bg-foreground/[0.01] transition-colors group">
                          <td className="px-4 py-2.5 text-[10px] font-bold text-foreground/30 text-center font-mono italic">{i + 1}</td>
                          <td className="px-4 py-2.5 text-center font-mono font-bold text-foreground/40 tracking-tighter">{item.no || '—'}</td>
                          <td className="px-4 py-2.5 font-bold text-foreground/80 tracking-tight">{item.name}</td>
                          <td className="px-4 py-2.5">
                             <span className="px-1.5 py-0.5 rounded bg-primary/5 text-primary text-[9px] font-black uppercase tracking-wider border border-primary/10">
                               {item.unit}
                             </span>
                          </td>
                          <td className="px-4 py-2.5 text-right pr-4">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="xs" onClick={() => openEdit(item)} className="w-7 h-7 p-0" aria-label="Edit personnel record" title="Edit"><Edit2 size={12} strokeWidth={ICON_ST} /></Button>
                              <Button variant="ghost" size="xs" onClick={() => api.deleteTechnicalSupport(item.id).then(load)} className="w-7 h-7 p-0 text-error hover:bg-error/10" aria-label="Delete personnel record" title="Delete"><Trash2 size={12} strokeWidth={ICON_ST} /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()
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
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [form, setForm] = useState({ type: 'Fiber Optic', level_1: '', level_2: '', level_3: '', level_4: '', latitude: '', longitude: '' });
  const { addToast } = useToast();
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

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
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase leading-tight">Distribution Topology</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">{data.length} registered distribution points</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
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
          <div className="flex gap-1">
            <label className="cursor-pointer">
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              <Button variant="ghost" size="xs" className="font-bold text-[9px] tracking-widest px-2 h-8 pointer-events-none"><Database size={12} /> Upload</Button>
            </label>
            <Button size="xs" onClick={openCreate} className="font-black text-[9px] tracking-widest px-4 h-8"><Plus size={12} /> Add Point</Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-background/50 rounded-xl overflow-hidden shadow-2xl shadow-primary/5 ring-1 ring-foreground/5 border border-foreground/[0.02]">
        {loading ? <TableSkeleton rows={15} /> : viewMode === 'map' ? (
          <div className="h-full p-4">
             <DistributionMap data={data} onRefresh={load} />
          </div>
        ) : (() => {
          const filtered = data.filter(d => 
            (d.level_1 || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.level_2 || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.level_3 || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.level_4 || '').toLowerCase().includes(searchQuery.toLowerCase())
          );
          const totalPages = Math.ceil(filtered.length / rowsPerPage);
          const startIdx = (currentPage - 1) * rowsPerPage;
          const paginated = filtered.slice(startIdx, startIdx + rowsPerPage);

          return (
            <div className="flex flex-col h-full">
              <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-foreground/5">
                    <tr className="bg-foreground/[0.02]">
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 w-12 text-center">#</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5">Type</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5">Level 1</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5">Level 2</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5">Level 3 / Extra</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5">Level 4 / Extra</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/5 text-[11px]">
                    {paginated.map((d, i) => (
                      <tr key={d.id} className="hover:bg-foreground/[0.01] transition-colors group">
                        <td className="px-4 py-2.5 text-[10px] font-bold text-foreground/30 text-center font-mono italic">{startIdx + i + 1}</td>
                        <td className="px-4 py-2.5 font-black uppercase text-[10px] tracking-widest text-primary/70">{d.type}</td>
                        <td className="px-4 py-2.5 font-bold text-foreground/80 tracking-tight">{d.level_1}</td>
                        <td className="px-4 py-2.5 font-bold text-foreground/70 tracking-tight">{d.level_2}</td>
                        <td className="px-4 py-2.5 font-bold text-foreground/60 tracking-tight">{d.level_3 || '—'}</td>
                        <td className="px-4 py-2.5 font-bold text-foreground/60 tracking-tight">{d.level_4 || '—'}</td>
                        <td className="px-4 py-2.5 text-right pr-4">
                           <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                             <Button variant="ghost" size="xs" onClick={() => openEdit(d)} className="w-7 h-7 p-0"><Edit2 size={12} /></Button>
                             <Button variant="ghost" size="xs" onClick={() => handleDelete(d.id)} className="w-7 h-7 p-0 text-error hover:bg-error/10"><Trash2 size={12} /></Button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-2 bg-foreground/[0.02] border-t border-foreground/5 gap-4 mt-auto">
                <div className="text-[10px] font-black uppercase tracking-widest text-foreground/30">
                  Showing <span className="text-foreground/60">{startIdx + 1}</span> to <span className="text-foreground/60">{Math.min(startIdx + rowsPerPage, filtered.length)}</span> of <span className="text-foreground/60">{filtered.length}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="xs" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-7 h-7 p-0"><ChevronRight className="rotate-180" size={12} /></Button>
                    <div className="text-[10px] font-black flex items-center gap-1.5 px-3 uppercase tracking-widest">
                       <span className="text-foreground/70">{currentPage}</span>
                       <span className="text-foreground/20">/</span>
                       <span className="text-foreground/50">{totalPages}</span>
                    </div>
                    <Button variant="ghost" size="xs" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-7 h-7 p-0"><ChevronRight size={12} /></Button>
                </div>
              </div>
            </div>
          );
        })()}
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
    <div className="flex flex-col gap-4 h-full min-h-0 max-w-2xl mx-auto w-full">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase leading-tight">Response Actions</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">{actions.length} preset incident actions</p>
        </div>
        <Button size="xs" onClick={openCreate} className="font-black text-[9px] tracking-widest px-4 h-8"><Plus size={12} /> Add Action</Button>
      </div>

      <div className="flex-1 min-h-0 bg-background/50 rounded-xl overflow-hidden shadow-2xl shadow-primary/5 ring-1 ring-foreground/5 border border-foreground/[0.02]">
        {loading ? <TableSkeleton rows={8} /> : (
          <div className="flex flex-col h-full">
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-foreground/5">
                  <tr className="bg-foreground/[0.02]">
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 w-12 text-center">#</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5">Action Description</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-foreground/5 text-right pr-6">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5 text-[11px]">
                  {actions.map((a, i) => (
                    <tr key={a.id} className="hover:bg-foreground/[0.01] transition-colors group">
                      <td className="px-4 py-2.5 text-[10px] font-bold text-foreground/30 text-center font-mono italic">{i + 1}</td>
                      <td className="px-4 py-2.5 font-bold text-foreground/80 tracking-tight">{a.name}</td>
                      <td className="px-4 py-2.5 text-right pr-4">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                          <Button variant="ghost" size="xs" onClick={() => openEdit(a)} className="w-7 h-7 p-0"><Edit2 size={12} /></Button>
                          <Button variant="ghost" size="xs" onClick={() => handleDelete(a.id)} className="w-7 h-7 p-0 text-error hover:bg-error/10"><Trash2 size={12} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
