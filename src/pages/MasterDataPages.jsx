import React, { useEffect, useState } from 'react';
import { api } from '../utils/api.js';
import { ROLE_COLORS, GRADE_COLORS } from '../utils/constants.js';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastContext.jsx';
import { Modal, PageSpinner, EmptyState, RoleBadge, StatusBadge, GradeBadge, AccentBadge } from '../components/ui/index.jsx';
import { Plus, Edit2, Trash2, Database, Download, Network, ChevronRight, ChevronDown, Layout, Map as MapIcon, LayoutList, MapPinOff, Search } from 'lucide-react';
import DistributionMap from '../components/ui/DistributionMap.jsx';
import CustomerMap from '../components/ui/CustomerMap.jsx';
import GeoSummary from '../components/ui/GeoSummary.jsx';

// ─── Component helpers ────────────────────────────────────────────────────────

function TableCard({ children }) {
  return (
    <div className="section-card">
      <div className="table-wrap">{children}</div>
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
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title text-xl">Customer Master</div>
          <div className="page-subtitle text-xs">{customers.length} registered customers</div>
        </div>
        <div style={{ flex: 1, maxWidth: '400px', margin: '0 2rem', position: 'relative' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search Customer, Service ID, or Address..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem', borderRadius: '99px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
        <div className="page-actions">
          <div className="btn-group" style={{ marginRight: '0.5rem' }}>
            <button 
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <LayoutList size={14} />
            </button>
            <button 
              className={`btn btn-sm ${viewMode === 'map' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setViewMode('map')}
              title="Map View"
            >
              <MapIcon size={14} />
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}><Download size={13} /> Template</button>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
            <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileUpload} />
            <Database size={13} /> Bulk Upload
          </label>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Add Customer</button>
        </div>
      </div>


      {viewMode === 'map' ? (
        <div className="page-stack">
          <CustomerMap customers={customers} onRefresh={load} />
          <GeoSummary customers={customers} />
        </div>
      ) : (
        <TableCard>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div> :
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
            <div className="pagination-container">
              <table className="data-table compact-table">
                <colgroup>
                  <col className="col-no" /><col className="col-md" /><col className="col-md" />
                  <col className="col-auto" /><col className="col-lg" />
                  <col className="col-sm" /><col className="col-sm" /><col className="col-sm" />
                  <col className="col-md" /><col className="col-actions" />
                </colgroup>
                <thead><tr>
                  <th>#</th><th className="text-left">Cust ID</th><th className="text-left">Service ID</th>
                  <th className="text-left">Company Name</th><th className="text-left">Brand / Site</th>
                  <th>Grade</th><th>Level</th><th>Status</th>
                  <th className="text-left">Service Type</th><th className="text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {paginated.map((c, i) => (
                    <tr key={c.id} className="tr-hover-accent">
                      <td className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>{startIdx + i + 1}</td>
                      <td className="text-id text-xs text-left">{c.customer_id}</td>
                      <td className="text-id text-xs text-left">{c.service_id}</td>
                      <td className="text-left text-sm" style={{ fontWeight: 600 }}>{c.company_name}</td>
                      <td className="text-left text-xs" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {c.brand_site}
                        {(!c.latitude || !c.longitude) && (
                          <span title="No coordinates found" style={{ color: '#ef4444', display: 'inline-flex' }}>
                            <MapPinOff size={10} strokeWidth={3} />
                          </span>
                        )}
                      </td>
                      <td className="text-center"><GradeBadge grade={c.grade} /></td>
                      <td className="text-center"><AccentBadge text={c.support_level} /></td>
                      <td className="text-center"><StatusBadge active={c.is_active} /></td>
                      <td className="text-left text-xs" style={{ color: 'var(--text-secondary)' }}>{c.service_type}</td>
                      <td className="text-right">
                        <div className="cell-actions">
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(c)} title="Edit"><Edit2 size={12} /></button>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(c.id)} title="Hapus"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="table-pagination">
                <div className="pagination-info">
                  Showing <b>{startIdx + 1}</b> to <b>{Math.min(startIdx + rowsPerPage, filtered.length)}</b> of <b>{filtered.length}</b> entries
                </div>
                <div className="pagination-controls">
                  <div className="rows-selector">
                    <span>Rows per page:</span>
                    <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                      {[20, 50, 100, 200].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="btn-group">
                    <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
                    <span className="page-indicator">Page {currentPage} of {totalPages}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>Last</button>
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
        <div className="form-grid form-grid-2">
          <div className="form-group"><label className="form-label">Customer ID *</label><input type="text" className="form-control" value={form.customer_id} onChange={e => setF('customer_id', e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">Service ID *</label><input type="text" className="form-control" value={form.service_id} onChange={e => setF('service_id', e.target.value)} required /></div>
        </div>
        <div className="form-grid form-grid-2">
          <div className="form-group"><label className="form-label">Company Name *</label><input type="text" className="form-control" value={form.company_name} onChange={e => setF('company_name', e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">Brand / Site *</label><input type="text" className="form-control" value={form.brand_site} onChange={e => setF('brand_site', e.target.value)} required /></div>
        </div>
        <div className="form-group"><label className="form-label">Address</label><textarea className="form-control" rows={2} value={form.address} onChange={e => setF('address', e.target.value)} /></div>
        <div className="form-grid form-grid-3">
          <div className="form-group"><label className="form-label">Service Type</label>
            <select className="form-control" value={form.service_type} onChange={e => setF('service_type', e.target.value)}>
              {['Internet Dedicated', 'Broadband', 'VPN IP', 'MPLS', 'Astinet', 'VSAT', 'Clear Channel'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">SLA Grade</label>
            <select className="form-control" value={form.grade} onChange={e => setF('grade', e.target.value)}>
              {['VIP', 'Gold', 'Silver', 'Bronze'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Support Level</label>
            <select className="form-control" value={form.support_level} onChange={e => setF('support_level', e.target.value)}>
              {['L1', 'L2', 'L3'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group"><label className="form-label">Link Coverage (Maps/NMS URL)</label><input type="url" className="form-control" value={form.link_coverage} onChange={e => setF('link_coverage', e.target.value)} /></div>
        <div className="form-grid form-grid-2">
          <div className="form-group"><label className="form-label">Latitude</label><input type="number" step="any" className="form-control" placeholder="-6.1234..." value={form.latitude} onChange={e => setF('latitude', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Longitude</label><input type="number" step="any" className="form-control" placeholder="110.1234..." value={form.longitude} onChange={e => setF('longitude', e.target.value)} /></div>
        </div>
      </Modal>

      <style>{`
        .compact-table th {
          padding: 0.5rem 0.75rem !important;
          font-size: 0.75rem !important;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        .compact-table td {
          padding: 0.4rem 0.75rem !important;
          font-size: 0.8125rem;
          vertical-align: middle;
        }
        .compact-table tr:hover {
          background-color: var(--bg-elevated) !important;
        }
        .text-id {
          font-family: var(--font-mono);
          letter-spacing: -0.01em;
        }
        .table-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--bg-card);
          border-top: 1px solid var(--border);
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .rows-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .rows-selector select {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          border: 1px solid var(--border);
          background: var(--bg-input);
          color: var(--text-main);
          outline: none;
        }
        .page-indicator {
          padding: 0 1rem;
          font-weight: 500;
          color: var(--text-main);
        }
        .pagination-container {
          display: flex;
          flex-direction: column;
        }
      `}</style>
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
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Classification Master</div>
          <div className="page-subtitle">Root causes / incident categories grouped by parent</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Add Classification</button>
        </div>
      </div>

      {loading ? <PageSpinner /> : classes.length === 0 ? <EmptyState icon="🏷️" title="No classifications found" /> : (
        <div className="section-card" style={{ padding: '0.5rem' }}>
          {Object.entries(grouped).map(([parent, children]) => (
            <div key={parent} style={{ borderBottom: '1px solid var(--border)', lastChild: { borderBottom: 'none' } }}>
              <div 
                onClick={() => toggle(parent)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '1rem', cursor: 'pointer',
                  background: expanded[parent] ? 'var(--bg-elevated)' : 'transparent',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ color: 'var(--text-muted)' }}>
                  {expanded[parent] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.925rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AccentBadge text={parent} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>({children.length} items)</span>
                </div>
              </div>
              
              {expanded[parent] && (
                <div style={{ 
                  padding: '0.5rem 1rem 1rem 3rem',
                  display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                  {children.map(c => (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem', borderRadius: 6,
                      background: 'var(--bg-card)', border: '1px solid var(--border)'
                    }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{c.sub_klasifikasi}</div>
                      <div className="cell-actions">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(c)}><Edit2 size={12} /></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(c.id)}><Trash2 size={12} /></button>
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
        <div className="form-group">
          <label className="form-label">Classification (Parent) *</label>
          <input type="text" className="form-control" value={form.klasifikasi} onChange={e => setF('klasifikasi', e.target.value)} placeholder="e.g., Cable Cut" list="parent-list" />
          <datalist id="parent-list">
            {Object.keys(grouped).map(k => <option key={k} value={k} />)}
          </datalist>
        </div>
        <div className="form-group">
          <label className="form-label">Sub-Classification (Child) *</label>
          <input type="text" className="form-control" value={form.sub_klasifikasi} onChange={e => setF('sub_klasifikasi', e.target.value)} placeholder="e.g., Tree Trimming" />
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
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">User Management</div>
          <div className="page-subtitle">{users.length} registered users</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Add User</button>
        </div>
      </div>

      <TableCard>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div> : (
          <table className="data-table">
            <colgroup>
              <col className="col-id" /><col style={{ width: 130 }} /><col className="col-auto" />
              <col className="col-xl" /><col className="col-md" /><col className="col-md" /><col className="col-sm" />
            </colgroup>
            <thead><tr>
              <th>ID</th><th className="text-left">Username</th><th className="text-left">Name</th>
              <th className="text-left">Email</th><th>Role</th><th>Status</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="tr-hover-accent">
                  <td className="text-center text-id text-sm" style={{ color: 'var(--accent-light)', fontWeight: 700 }}>{u.employee_id || '—'}</td>
                  <td className="text-left text-id text-sm">{u.username}</td>
                  <td className="text-left text-sm" style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ fontSize: '0.786rem', color: 'var(--text-secondary)' }} className="text-truncate text-left">{u.email || '—'}</td>
                  <td className="text-center"><RoleBadge role={u.role} /></td>
                  <td className="text-center">
                    <button onClick={() => handleToggle(u)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <StatusBadge active={u.is_active} />
                    </button>
                  </td>
                  <td className="text-right">
                    <div className="cell-actions">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(u)}><Edit2 size={12} /></button>
                    </div>
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
        <div className="form-grid form-grid-3">
          <div className="form-group"><label className="form-label">Employee ID *</label><input type="text" className="form-control" value={form.employee_id} onChange={e => setF('employee_id', e.target.value)} placeholder="1001" maxLength={4} /></div>
          <div className="form-group"><label className="form-label">Username *</label><input type="text" className="form-control" value={form.username} onChange={e => setF('username', e.target.value)} placeholder="username" disabled={modal !== 'create'} /></div>
          <div className="form-group"><label className="form-label">Password {modal !== 'create' ? '(leave empty = no change)' : '*'}</label><input type="password" className="form-control" value={form.password} onChange={e => setF('password', e.target.value)} /></div>
        </div>
        <div className="form-grid form-grid-2">
          <div className="form-group"><label className="form-label">Full Name *</label><input type="text" className="form-control" value={form.name} onChange={e => setF('name', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Role</label>
            <select className="form-control" value={form.role} onChange={e => setF('role', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-control" value={form.email} onChange={e => setF('email', e.target.value)} /></div>
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
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Technical Personnel</div>
          <div className="page-subtitle">{data.length} personnel registered</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}><Download size={13} /> Template</button>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
            <Database size={13} /> Bulk Upload
          </label>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Add Data</button>
        </div>
      </div>

      <TableCard>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div> : (
          <table className="data-table">
            <colgroup>
              <col className="col-no" /><col className="col-sm" /><col className="col-auto" /><col className="col-lg" /><col className="col-actions" />
            </colgroup>
            <thead><tr>
              <th>#</th><th>No</th><th className="text-left">Name</th><th className="text-left">Unit</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={item.id} className="tr-hover-accent">
                  <td className="text-center text-id text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td className="text-center text-id text-xs" style={{ color: 'var(--text-muted)' }}>{item.no || '—'}</td>
                  <td className="text-left text-sm" style={{ fontWeight: 600 }}>{item.name}</td>
                  <td className="text-left">
                    <span style={{ fontSize: '0.786rem', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '0.125rem 0.5rem', borderRadius: 4, color: 'var(--text-secondary)' }}>
                      {item.unit}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="cell-actions">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)}><Edit2 size={12} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => api.deleteTechnicalSupport(item.id).then(load)}><Trash2 size={12} /></button>
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
        <div className="form-group"><label className="form-label">No</label><input type="text" className="form-control" value={form.no} onChange={e => setF('no', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Name *</label><input type="text" className="form-control" value={form.name} onChange={e => setF('name', e.target.value)} required /></div>
        <div className="form-group"><label className="form-label">Unit *</label><input type="text" className="form-control" value={form.unit} onChange={e => setF('unit', e.target.value)} required /></div>
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
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0.375rem 0.5rem',
            cursor: hasChildren ? 'pointer' : 'default',
            borderRadius: 'var(--radius-xs)',
            transition: 'background var(--t-fast)',
          }}
          onMouseEnter={e => { if (hasChildren) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={{ width: 14, flexShrink: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            {hasChildren ? (isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : null}
          </span>
          {icon}
          <span style={{ fontSize: '0.845rem', fontWeight: icon ? 700 : 400, color: icon ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
        </div>
        {isExpanded && hasChildren && (
          <div style={{ paddingLeft: '1.25rem', borderLeft: '1px solid var(--border)', marginLeft: '0.5rem' }}>
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
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Network Distribution Tree</div>
          <div className="page-subtitle">Visual map of Fiber Optic & Wireless segmentation</div>
        </div>
        <div className="page-actions">
          <div className="view-mode-toggle" style={{ marginRight: '1rem' }}>
            <button 
              className={`btn btn-sm ${viewMode === 'tree' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setViewMode('tree')}
            >
              <Layout size={14} /> Tree
            </button>
            <button 
              className={`btn btn-sm ${viewMode === 'map' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setViewMode('map')}
            >
              <MapIcon size={14} /> Map
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowDropdown(!showDropdown)}><Download size={13} /> Template</button>
            {showDropdown && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', zIndex: 100, padding: '0.25rem', minWidth: 150, boxShadow: 'var(--shadow-lg)' }}>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={downloadTemplateFO}>🌳 Fiber Optic</button>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={downloadTemplateWl}>🗼 Wireless</button>
              </div>
            )}
          </div>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
            <input type="file" accept=".xlsx" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'Fiber Optic')} />
            Upload FO
          </label>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
            <input type="file" accept=".xlsx" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'Wireless')} />
            Upload Wireless
          </label>
        </div>
      </div>

      {loading ? <PageSpinner /> : viewMode === 'map' ? (
        <DistributionMap data={data} onRefresh={load} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {/* Fiber Optic Tree */}
          <div className="section-card">
            <div className="section-card-header">
              <div className="section-card-title">🌳 Fiber Optic Tree</div>
            </div>
            <div className="section-card-body">
              {Object.keys(tree['Fiber Optic']).length === 0
                ? <div className="empty-state" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
                    <div className="empty-state-icon"><Network size={36} /></div>
                    <div className="empty-state-title">No data available</div>
                    <div className="empty-state-desc">Upload Fiber Optic Excel to populate tree</div>
                  </div>
                : Object.entries(tree['Fiber Optic']).map(([pop, osc]) => (
                    <TreeItem key={pop} label={pop} children={osc} path={`FO/${pop}`} icon={<Database size={13} color="var(--accent)" style={{ flexShrink: 0 }} />} />
                  ))
              }
            </div>
          </div>

          {/* Wireless Tree */}
          <div className="section-card">
            <div className="section-card-header">
              <div className="section-card-title">🗼 Wireless Grid</div>
            </div>
            <div className="section-card-body">
              {Object.keys(tree['Wireless']).length === 0
                ? <div className="empty-state" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
                    <div className="empty-state-icon"><Network size={36} /></div>
                    <div className="empty-state-title">No data available</div>
                    <div className="empty-state-desc">Upload Wireless Excel to populate grid</div>
                  </div>
                : Object.entries(tree['Wireless']).map(([bts, radio]) => (
                    <TreeItem key={bts} label={bts} children={radio} path={`WL/${bts}`} icon={<Network size={13} color="var(--warning)" style={{ flexShrink: 0 }} />} />
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
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Master Handling (Actions)</div>
          <div className="page-subtitle">{data.length} predefined handling options</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Add Action</button>
        </div>
      </div>

      <TableCard>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div> : (
          <table className="data-table">
            <colgroup>
              <col className="col-no" /><col className="col-auto" /><col className="col-actions" />
            </colgroup>
            <thead><tr>
              <th>#</th><th className="text-left">Handling Action Name</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={item.id} className="tr-hover-accent">
                  <td className="text-center" style={{ color: 'var(--text-muted)', fontSize: '0.786rem' }}>{i + 1}</td>
                  <td className="text-left" style={{ fontWeight: 600 }}>{item.name}</td>
                  <td className="text-right">
                    <div className="cell-actions">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)}><Edit2 size={12} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => { if(confirm('Delete this action?')) api.deleteAction(item.id).then(load); }}><Trash2 size={12} /></button>
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
        <div className="form-group"><label className="form-label">Action Name *</label><input type="text" className="form-control" value={form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g., Splicing FO" required /></div>
      </Modal>
    </div>
  );
}
