import React, { useEffect, useState } from 'react';
import { api } from '../utils/api.js';
import { ROLE_COLORS, GRADE_COLORS } from '../utils/constants.js';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastContext.jsx';
import { Modal, TableSkeleton, EmptyState, RoleBadge, StatusBadge, GradeBadge, AccentBadge } from '../components/ui/index.jsx';
import { Plus, Edit2, Trash2, Database, Download, Network, ChevronRight, ChevronDown, Layout, Map as MapIcon, LayoutList, MapPinOff, Search } from 'lucide-react';
import DistributionMap from '../components/ui/DistributionMap.jsx';
import CustomerMap from '../components/ui/CustomerMap.jsx';
import GeoSummary from '../components/ui/GeoSummary.jsx';

// ─── Component helpers ────────────────────────────────────────────────────────

function TableCard({ children }) {
  return (
    <div className="bg-base-100 shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto p-0">
        {children}
      </div>
    </div>
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
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-base-content uppercase">Customer Master</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-base-content/40 leading-relaxed">{customers.length} registered customers</p>
        </div>
        <label className="input flex items-center gap-2 flex-1 max-w-[400px] rounded-full bg-base-200/80 transition-all">
          <Search size={16} className="text-base-content/60" />
          <input 
            type="text" 
            className="grow border-none focus:ring-0" 
            placeholder="Search Customer, Service ID, or Address..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="join">
            <button 
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <LayoutList size={18} />
            </button>
            <button 
              className={`btn btn-sm ${viewMode === 'map' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setViewMode('map')}
              title="Map View"
            >
              <MapIcon size={18} />
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}><Download size={18} /> Template</button>
          <label className="btn btn-ghost btn-sm cursor-pointer m-0">
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
            <Database size={18} /> Bulk Upload
          </label>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Add Customer</button>
        </div>
      </div>


      {viewMode === 'map' ? (
        <div className="flex flex-col gap-6">
          <CustomerMap customers={customers} onRefresh={load} />
          <GeoSummary customers={customers} />
        </div>
      ) : (
        <TableCard>
        {loading ? <TableSkeleton rows={5} /> :
         (() => {
           const filtered = customers.filter(c => 
             (c.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
             (c.brand_site || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
             (c.service_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
             (c.customer_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
             (c.address || '').toLowerCase().includes(searchQuery.toLowerCase())
           );
           
           if (filtered.length === 0) return <EmptyState icon={<Database size={40} />} title="Not Found" desc="No data matches your search query" />;
           
           const totalPages = Math.ceil(filtered.length / rowsPerPage);
           const startIdx = (currentPage - 1) * rowsPerPage;
           const paginated = filtered.slice(startIdx, startIdx + rowsPerPage);
           
           return (
            <div className="flex flex-col h-full">
              <div className="overflow-x-auto">
                <table className="table-imms table-stacked">
                  <thead>
                    <tr>
                      <th className="w-12 text-center whitespace-nowrap">#</th>
                      <th className="w-24 text-left whitespace-nowrap">Cust ID</th>
                      <th className="w-24 text-left whitespace-nowrap">Service ID</th>
                      <th className="text-left">Company Name</th>
                      <th className="w-48 text-left">Brand / Site</th>
                      <th className="w-20 text-center">Grade</th>
                      <th className="w-20 text-center">Level</th>
                      <th className="w-24 text-center">Status</th>
                      <th className="w-32 text-left">Service</th>
                      <th className="w-24 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((c, i) => (
                      <tr key={c.id} className="hover:bg-base-200 transition-colors">
                        <td className="text-center opacity-40 font-mono italic text-[12px]" data-label="#">{startIdx + i + 1}</td>
                        <td className="font-mono text-[12px] font-bold text-primary tracking-tighter text-left" data-label="Cust ID">{c.customer_id}</td>
                        <td className="font-mono text-[12px] font-medium text-secondary tracking-tighter text-left" data-label="Srv ID">{c.service_id}</td>
                        <td className="text-left font-semibold text-[12px] tracking-tight" data-label="Company">{c.company_name}</td>
                        <td className="text-left text-[12px] opacity-70" data-label="Site">
                          <div className="flex items-center gap-1.5">
                            {c.brand_site}
                            {(!c.latitude || !c.longitude) && (
                              <span title="No coordinates found" className="text-error flex shrink-0">
                                <MapPinOff size={11} strokeWidth={2.5} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-center" data-label="Grade"><GradeBadge grade={c.grade} /></td>
                        <td className="text-center" data-label="Level"><AccentBadge text={c.support_level} /></td>
                        <td className="text-center" data-label="Status"><StatusBadge active={c.is_active} /></td>
                        <td className="text-left text-[10px] font-bold uppercase opacity-60 tracking-wider font-mono" data-label="Service">{c.service_type}</td>
                        <td className="text-right pr-6" data-label="Actions">
                          <div className="flex justify-end gap-1">
                            <div className="tooltip" data-tip="Edit"><button className="btn btn-ghost btn-square btn-xs" onClick={() => openEdit(c)} aria-label="Edit"><Edit2 size={14} /></button></div>
                            <div className="tooltip" data-tip="Delete"><button className="btn btn-ghost btn-square btn-xs text-error hover:bg-error/10" onClick={() => handleDelete(c.id)} aria-label="Delete"><Trash2 size={14} /></button></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-base-100 text-xs gap-4">
                <div className="opacity-60 font-medium">
                  Showing <span className="text-base-content font-bold">{startIdx + 1}</span> to <span className="text-base-content font-bold">{Math.min(startIdx + rowsPerPage, filtered.length)}</span> of <span className="text-base-content font-bold">{filtered.length}</span> entries
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="opacity-60 font-bold">Rows per page:</span>
                    <select 
                      className="select select-xs font-bold bg-base-200/80" 
                      value={rowsPerPage} 
                      onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    >
                      {[20, 50, 100, 200].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="join shadow-sm">
                    <button className="join-item btn btn-xs px-3" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</button>
                    <button className="join-item btn btn-xs px-3" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
                    <button className="join-item btn btn-xs btn-disabled no-animation bg-base-200 px-4 text-base-content/70 font-bold">
                      Page {currentPage} of {totalPages}
                    </button>
                    <button className="join-item btn btn-xs px-3" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
                    <button className="join-item btn btn-xs px-3" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>Last</button>
                  </div>
                </div>
              </div>
            </div>
           );
         })()
        }
      </TableCard>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add New Customer' : 'Edit Customer'}
        footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save Changes</button></>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Customer ID *</label><input type="text" className="input input-md bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.customer_id} onChange={e => setF('customer_id', e.target.value)} required /></div>
          <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Service ID *</label><input type="text" className="input input-md bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.service_id} onChange={e => setF('service_id', e.target.value)} required /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Company Name *</label><input type="text" className="input input-md bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.company_name} onChange={e => setF('company_name', e.target.value)} required /></div>
          <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Brand / Site *</label><input type="text" className="input input-md bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.brand_site} onChange={e => setF('brand_site', e.target.value)} required /></div>
        </div>
        <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Address</label><textarea className="textarea textarea-md bg-base-200/80 font-semibold text-[13.5px]" rows={2} value={form.address} onChange={e => setF('address', e.target.value)} /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Service Type</label>
            <select className="select select-md bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.service_type} onChange={e => setF('service_type', e.target.value)}>
              {['Internet Dedicated', 'Broadband', 'VPN IP', 'MPLS', 'Astinet', 'VSAT', 'Clear Channel'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">SLA Grade</label>
            <select className="select select-md bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.grade} onChange={e => setF('grade', e.target.value)}>
              {['VIP', 'Gold', 'Silver', 'Bronze'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Support Level</label>
            <select className="select select-md bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.support_level} onChange={e => setF('support_level', e.target.value)}>
              {['L1', 'L2', 'L3'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Link Coverage (Maps/NMS URL)</label><input type="url" className="input input-md bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.link_coverage} onChange={e => setF('link_coverage', e.target.value)} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Latitude</label><input type="number" step="any" className="input input-md bg-base-200/80 font-semibold text-[13.5px] h-10" placeholder="-6.1234..." value={form.latitude} onChange={e => setF('latitude', e.target.value)} /></div>
          <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Longitude</label><input type="number" step="any" className="input input-md bg-base-200/80 font-semibold text-[13.5px] h-10" placeholder="110.1234..." value={form.longitude} onChange={e => setF('longitude', e.target.value)} /></div>
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

  // Group classes by primary classification
  const grouped = classes.reduce((acc, c) => {
    if (!acc[c.klasifikasi]) acc[c.klasifikasi] = [];
    acc[c.klasifikasi].push(c);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-base-content uppercase">Classification Master</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-base-content/40 leading-relaxed">Incident categories grouped by parent</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Add Classification</button>
        </div>
      </div>

      {loading ? <TableSkeleton rows={3} /> : classes.length === 0 ? <EmptyState icon="🏷️" title="No classifications found" /> : (
        <div className="bg-base-100 shadow-sm rounded-lg overflow-hidden">
          {Object.entries(grouped).map(([parent, children]) => (
            <div key={parent}>
              <button 
                onClick={() => toggle(parent)}
                className={`flex items-center gap-3 w-full p-4 text-left transition-colors hover:bg-base-200/50 ${expanded[parent] ? 'bg-base-200/30' : ''}`}
              >
                <div className="opacity-40">
                  {expanded[parent] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
                <div className="font-bold flex items-center gap-3">
                  <span className="badge badge-primary badge-outline badge-sm px-3 h-6 rounded-md font-mono tracking-[0.15em] text-[10px]">{parent}</span>
                  <span className="text-[10px] font-bold opacity-40 uppercase tracking-[0.15em]">{children.length} categor{children.length > 1 ? 'ies' : 'y'}</span>
                </div>
              </button>
              
              {expanded[parent] && (
                <div className="p-2 pl-12 bg-base-200/10 space-y-1 pb-4">
                  {children.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2 pl-4 bg-base-100 rounded-lg hover:bg-base-200/50 transition-all group">
                      <div className="text-[12px] font-semibold opacity-80">{c.sub_klasifikasi}</div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="tooltip" data-tip="Edit"><button className="btn btn-ghost btn-square btn-xs" onClick={() => openEdit(c)} aria-label="Edit"><Edit2 size={14} /></button></div>
                        <div className="tooltip" data-tip="Delete"><button className="btn btn-ghost btn-square btn-xs text-error hover:bg-error/10" onClick={() => handleDelete(c.id)} aria-label="Delete"><Trash2 size={14} /></button></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Classification' : 'Edit Classification'}
        footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save Changes</button></>}
      >
        <div className="form-control">
          <label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Classification (Parent) *</label>
          <input type="text" className="input bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.klasifikasi} onChange={e => setF('klasifikasi', e.target.value)} placeholder="e.g., Cable Cut" list="parent-list" />
          <datalist id="parent-list">
            {Object.keys(grouped).map(k => <option key={k} value={k} />)}
          </datalist>
        </div>
        <div className="form-control">
          <label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Sub-Classification (Child) *</label>
          <input type="text" className="input bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.sub_klasifikasi} onChange={e => setF('sub_klasifikasi', e.target.value)} placeholder="Tree Trimming" />
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
  const handleToggle = async (u) => {
    try { await api.updateUser(u.id, { is_active: u.is_active ? 0 : 1 }); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-base-content uppercase">User Management</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-base-content/40 leading-relaxed">{users.length} registered accounts</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Add User</button>
        </div>
      </div>

      <TableCard>
        {loading ? <TableSkeleton rows={4} /> : (
          <table className="table-imms table-stacked">
            <thead>
              <tr>
                <th className="w-20 text-center">ID</th>
                <th className="w-32 text-left">Username</th>
                <th className="text-left">Name</th>
                <th className="w-48 text-left">Email</th>
                <th className="w-24 text-center">Role</th>
                <th className="w-20 text-center">Status</th>
                <th className="w-24 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="hover:bg-base-200 transition-colors">
                  <td className="text-center font-mono font-bold text-primary text-[12px]" data-label="ID">{u.employee_id || '—'}</td>
                  <td className="text-left font-mono font-medium opacity-70 tracking-tight text-[12px]" data-label="User">{u.username}</td>
                  <td className="text-left font-semibold text-[12px] tracking-tight" data-label="Name">{u.name}</td>
                  <td className="text-left opacity-60 text-[12px] font-medium truncate max-w-[150px]" data-label="Email">{u.email || '—'}</td>
                  <td className="text-center" data-label="Role"><RoleBadge role={u.role} /></td>
                  <td className="text-center" data-label="Status">
                    <button onClick={() => handleToggle(u)} className="btn btn-ghost btn-xs p-0 m-0 hover:bg-transparent">
                      <StatusBadge active={u.is_active} />
                    </button>
                  </td>
                  <td className="text-right" data-label="Edit">
                     <div className="tooltip" data-tip="Edit"><button className="btn btn-ghost btn-square btn-xs" onClick={() => openEdit(u)} aria-label="Edit"><Edit2 size={14} /></button></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add New User' : 'Edit User'}
        footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save Changes</button></>}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Employee ID *</label><input type="text" className="input bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.employee_id} onChange={e => setF('employee_id', e.target.value)} placeholder="1001" maxLength={4} /></div>
          <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Username *</label><input type="text" className="input bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.username} onChange={e => setF('username', e.target.value)} placeholder="username" disabled={modal !== 'create'} /></div>
          <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Password {modal !== 'create' ? '(leave empty = no change)' : '*'}</label><input type="password" className="input bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.password} onChange={e => setF('password', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Full Name *</label><input type="text" className="input bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.name} onChange={e => setF('name', e.target.value)} /></div>
          <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Role</label>
            <select className="select bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.role} onChange={e => setF('role', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Email</label><input type="email" className="input bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.email} onChange={e => setF('email', e.target.value)} /></div>
      </Modal>
    </div>
  );
}

// ─── Master Technical Support Page ────────────────────────────────────────────
export function MasterTechnicalSupportPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ no: '', name: '', unit: '' });
  const { addToast } = useToast();
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = () => api.getTechnicalSupport().then(setData).catch(e => addToast(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const openEdit = (item) => { setModal(item); setForm({ no: item.no || '', name: item.name, unit: item.unit }); };
  const openCreate = () => { setModal('create'); setForm({ no: '', name: '', unit: '' }); };
  const handleSave = async () => {
    try {
      if (modal === 'create') { await api.createTechnicalSupport(form); addToast('Data added successfully', 'success'); }
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
    const ws = XLSX.utils.json_to_sheet([{ No: '1', Name: 'John Doe', Unit: 'Maintenance' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Personel_Data.xlsx');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-base-content uppercase">Technical Personnel</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-base-content/40 leading-relaxed">{data.length} registered personnel</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}><Download size={18} /> Template</button>
          <label className="btn btn-ghost btn-sm cursor-pointer m-0">
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
            <Database size={18} /> Bulk Upload
          </label>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Add Data</button>
        </div>
      </div>

      <TableCard>
        {loading ? <TableSkeleton rows={4} /> : (
          <table className="table-imms table-stacked">
            <thead><tr>
              <th className="w-12 text-center whitespace-nowrap">#</th>
              <th className="w-20 text-center whitespace-nowrap">No</th>
              <th className="text-left">Name</th>
              <th className="w-48 text-left">Unit</th>
              <th className="w-24 text-right pr-4">Actions</th>
            </tr></thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={item.id} className="hover:bg-base-200 transition-colors">
                  <td className="text-center opacity-40 font-mono italic" data-label="#">{i + 1}</td>
                  <td className="text-center font-mono font-medium opacity-60" data-label="No">{item.no || '—'}</td>
                  <td className="text-left font-medium text-sm" data-label="Name">{item.name}</td>
                  <td className="text-left" data-label="Unit">
                    <span className="badge badge-neutral badge-outline badge-xs px-2 py-2 font-medium opacity-70 tracking-wider">
                      {item.unit}
                    </span>
                  </td>
                  <td className="text-right" data-label="Actions">
                    <div className="flex justify-end gap-1">
                      <div className="tooltip" data-tip="Edit"><button className="btn btn-ghost btn-square btn-xs" onClick={() => openEdit(item)} aria-label="Edit"><Edit2 size={14} /></button></div>
                      <div className="tooltip" data-tip="Delete"><button className="btn btn-ghost btn-square btn-xs text-error hover:bg-error/10" onClick={() => api.deleteTechnicalSupport(item.id).then(load)} aria-label="Delete"><Trash2 size={14} /></button></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Personnel' : 'Edit Personnel'}
        footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save Changes</button></>}
      >
        <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">No</label><input type="text" className="input bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.no} onChange={e => setF('no', e.target.value)} /></div>
        <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Name *</label><input type="text" className="input bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.name} onChange={e => setF('name', e.target.value)} required /></div>
        <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Unit *</label><input type="text" className="input bg-base-200/80 font-semibold text-[13.5px] h-10" value={form.unit} onChange={e => setF('unit', e.target.value)} required /></div>
      </Modal>
    </div>
  );
}

// ─── Master Distribusi Page ───────────────────────────────────────────────────
export function MasterDistribusiPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [showDropdown, setShowDropdown] = useState(false);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'map'
  const { addToast } = useToast();

  const load = () => api.getDistribusi().then(setData).catch(e => addToast(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const toggle = (path) => setExpanded(p => ({ ...p, [path]: !p[path] }));

  const tree = { 'Fiber Optic': {}, 'Wireless': {} };
  data.forEach(d => {
    if (!tree[d.type]) tree[d.type] = {};
    if (d.type === 'Fiber Optic') {
      const p = d.level_1;
      if (!tree[d.type][p]) tree[d.type][p] = {};
      const o = d.level_2;
      if (o) {
        if (!tree[d.type][p][o]) tree[d.type][p][o] = {};
        const dc = d.level_3;
        if (dc) {
          if (!tree[d.type][p][o][dc]) tree[d.type][p][o][dc] = [];
          const dp = d.level_4;
          if (dp && Array.isArray(tree[d.type][p][o][dc]) && !tree[d.type][p][o][dc].includes(dp)) {
            tree[d.type][p][o][dc].push(dp);
          }
        }
      }
    } else if (d.type === 'Wireless') {
      const b = d.level_1;
      if (!tree[d.type][b]) tree[d.type][b] = [];
      const r = d.level_2;
      if (r && Array.isArray(tree[d.type][b]) && !tree[d.type][b].includes(r)) {
        tree[d.type][b].push(r);
      }
    }
  });

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      const res = await api.uploadDistribusi(type, rows);
      addToast(`Successfully uploaded ${res.count} ${type} records`, 'success');
      load();
    } catch(err) { addToast(err.message, 'error'); setLoading(false); }
    finally { e.target.value = null; }
  };

  const downloadTemplateFO = () => {
    const ws = XLSX.utils.json_to_sheet([{ POP: 'PLB-1', OSC: 'OSC-A', ODC: 'ODC-1', ODP: 'ODP-001' }]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'FO');
    XLSX.writeFile(wb, 'Template_Distribusi_FO.xlsx');
    setShowDropdown(false);
  };
  const downloadTemplateWl = () => {
    const ws = XLSX.utils.json_to_sheet([{ BTS: 'BTS-Palembang', RADIO: 'Radio-North' }]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'WL');
    XLSX.writeFile(wb, 'Template_Distribusi_Wireless.xlsx');
    setShowDropdown(false);
  };

  const TreeItem = ({ label, children, path, icon }) => {
    const isExpanded = expanded[path];
    const hasChildren = children && (Array.isArray(children) ? children.length > 0 : Object.keys(children).length > 0);
    return (
      <div>
        <div
          onClick={() => hasChildren && toggle(path)}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
            hasChildren ? 'cursor-pointer hover:bg-base-300 active:bg-base-300' : 'cursor-default'
          }`}
        >
          <span className="w-4 shrink-0 text-base-content/60 flex items-center">
            {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
          </span>
          {icon}
          <span className={`text-[12px] ${icon ? 'font-bold text-base-content/80' : 'font-medium text-base-content/40'} tracking-tight`}>{label}</span>
        </div>
        {isExpanded && hasChildren && (
          <div className="pl-4 ml-3.5 mt-0.5 space-y-0.5">
            {Array.isArray(children)
              ? children.map(c => <TreeItem key={path + c} label={c} path={`${path}/${c}`} />)
              : Object.entries(children).map(([k, v]) => <TreeItem key={path + k} label={k} children={v} path={`${path}/${k}`} />)
            }
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-base-content uppercase">Network Distribution Tree</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-base-content/40 leading-relaxed">Fiber Optic & Wireless segmentation</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="join">
            <button className={`btn btn-sm join-item ${viewMode === 'tree' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('tree')}>
              <Layout size={18} /> Tree
            </button>
            <button className={`btn btn-sm join-item ${viewMode === 'map' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('map')}>
              <MapIcon size={18} /> Map
            </button>
          </div>
          <div className="relative">
            <button className="btn btn-ghost btn-sm font-bold uppercase tracking-[0.15em] text-[10px]" onClick={() => setShowDropdown(!showDropdown)}><Download size={14} /> Template</button>
            {showDropdown && (
              <div className="absolute top-[calc(100%+8px)] right-0 bg-base-100 rounded-lg z-[100] p-1.5 min-w-[180px] shadow-2xl backdrop-blur-md">
                <button className="btn btn-ghost btn-xs w-full justify-start font-bold py-3" onClick={downloadTemplateFO}>🌳 Fiber Optic</button>
                <button className="btn btn-ghost btn-xs w-full justify-start font-bold py-3" onClick={downloadTemplateWl}>🗼 Wireless</button>
              </div>
            )}
          </div>
          <label className="btn btn-ghost btn-sm cursor-pointer m-0">
            <input type="file" accept=".xlsx" className="hidden" onChange={e => handleFileUpload(e, 'Fiber Optic')} />
            Upload FO
          </label>
          <label className="btn btn-ghost btn-sm cursor-pointer m-0">
            <input type="file" accept=".xlsx" className="hidden" onChange={e => handleFileUpload(e, 'Wireless')} />
            Upload Wireless
          </label>
        </div>
      </div>

      {loading ? <TableSkeleton rows={6} /> : viewMode === 'map' ? (
        <DistributionMap data={data} onRefresh={load} />
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {/* Fiber Optic Tree */}
          <div className="bg-base-200/50 shadow-sm rounded-lg">
            <div className="p-6">
              <h2 className="text-base-content/70 text-sm uppercase tracking-wider mb-4 pb-2">🌳 Fiber Optic Tree</h2>
              {Object.keys(tree['Fiber Optic']).length === 0
                ? <div className="flex flex-col items-center gap-4 py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-base-300 flex items-center justify-center text-base-content/20">
                      <Network size={32} />
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-[11px] text-base-content/60 uppercase tracking-[0.15em]">No Topology Detected</div>
                      <div className="text-[10px] font-bold text-base-content/30 uppercase tracking-[0.15em]">Upload Fiber Optic Excel to populate tree</div>
                    </div>
                  </div>
                : Object.entries(tree['Fiber Optic']).map(([pop, osc]) => (
                    <TreeItem key={pop} label={pop} children={osc} path={`FO/${pop}`} icon={<Database size={14} className="text-primary shrink-0" />} />
                  ))
              }
            </div>
          </div>

          {/* Wireless Tree */}
          <div className="bg-base-200/50 shadow-sm rounded-lg">
            <div className="p-6">
              <h2 className="text-base-content/70 text-sm uppercase tracking-wider mb-4 pb-2">🗼 Wireless Grid</h2>
              {Object.keys(tree['Wireless']).length === 0
                ? <div className="flex flex-col items-center gap-4 py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-base-300 flex items-center justify-center text-base-content/20">
                      <Network size={32} />
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-[11px] text-base-content/60 uppercase tracking-[0.15em]">Grid Empty</div>
                      <div className="text-[10px] font-bold text-base-content/30 uppercase tracking-[0.15em]">Upload Wireless Excel to populate grid</div>
                    </div>
                  </div>
                : Object.entries(tree['Wireless']).map(([bts, radio]) => (
                    <TreeItem key={bts} label={bts} children={radio} path={`WL/${bts}`} icon={<Network size={14} className="text-warning shrink-0" />} />
                  ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── Master Action (Handling) Page ────────────────────────────────────────────
export function MasterActionPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const { addToast } = useToast();
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = () => api.getActions().then(setData).catch(e => addToast(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const openEdit = (item) => { setModal(item); setForm({ name: item.name }); };
  const openCreate = () => { setModal('create'); setForm({ name: '' }); };
  const handleSave = async () => {
    try {
      if (modal === 'create') { await api.createAction(form); addToast('Action added successfully', 'success'); }
      else { await api.updateAction(modal.id, form); addToast('Updated successfully', 'success'); }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-base-content uppercase">Master Handling (Actions)</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-base-content/40 leading-relaxed">{data.length} predefined handling options</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Add Action</button>
        </div>
      </div>

      <TableCard>
        {loading ? <TableSkeleton rows={4} /> : (
          <table className="table-imms">
            <thead>
              <tr>
                <th className="w-12 text-center whitespace-nowrap">#</th>
                <th className="text-left">Handling Action Name</th>
                <th className="w-24 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={item.id} className="hover:bg-base-200 transition-colors">
                  <td className="text-center opacity-40 font-mono italic text-xs">{i + 1}</td>
                  <td className="text-left font-semibold">{item.name}</td>
                  <td className="text-right">
                    <div className="cell-actions">
                      <div className="tooltip" data-tip="Edit"><button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)} aria-label="Edit"><Edit2 size={18} /></button></div>
                      <div className="tooltip" data-tip="Delete"><button className="btn btn-ghost btn-icon btn-sm text-error hover:bg-error/10" onClick={() => { if(confirm('Delete this action?')) api.deleteAction(item.id).then(load); }} aria-label="Delete"><Trash2 size={18} /></button></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Action' : 'Edit Action'}
        footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save Changes</button></>}
      >
        <div className="form-control"><label className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Action Name *</label><input type="text" className="input input-bordered input-md font-semibold text-[13.5px] h-10" value={form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g., Splicing FO" required /></div>
      </Modal>
    </div>
  );
}
