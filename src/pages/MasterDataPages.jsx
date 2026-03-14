import React, { useEffect, useState } from 'react';
import { api } from '../utils/api.js';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastContext.jsx';
import { Modal, PageSpinner, EmptyState } from '../components/ui/index.jsx';
import { CustomerMap } from '../components/ui/CustomerMap.jsx';
import { Plus, Edit2, Trash2, Database, Download, Network, ChevronRight, ChevronDown, Map as MapIcon, Table as TableIcon, MapPin } from 'lucide-react';

// ─── Shared role/badge helpers ─────────────────────────────────────────────────
const ROLE_COLORS = { admin: '#6366f1', manager: '#10b981', noc: '#3b82f6', technician: '#f59e0b' };

function RoleBadge({ role }) {
  const color = ROLE_COLORS[role] || '#999';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0.125rem 0.5rem', borderRadius: '99px',
      fontSize: '0.714rem', fontWeight: 700,
      background: `${color}22`, color,
      textTransform: 'capitalize', letterSpacing: '0.04em'
    }}>
      {role}
    </span>
  );
}

function StatusBadge({ active }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '0.125rem 0.5rem', borderRadius: '99px',
      fontSize: '0.714rem', fontWeight: 600,
      background: active ? 'var(--success-bg)' : 'var(--bg-card)',
      color: active ? 'var(--success)' : 'var(--text-muted)',
      border: '1px solid',
      borderColor: active ? 'var(--success-border)' : 'var(--border)',
    }}>
      {active ? '✓ Active' : '— Inactive'}
    </span>
  );
}

function AccentBadge({ text }) {
  return (
    <span className="badge badge-accent">{text}</span>
  );
}

function GradeBadge({ grade }) {
  const colors = { VIP: '#a78bfa', Gold: '#f59e0b', Silver: '#94a3b8', Bronze: '#ea580c' };
  const color = colors[grade] || 'var(--text-muted)';
  return (
    <span style={{
      display: 'inline-flex', padding: '0.125rem 0.438rem', borderRadius: 4,
      fontSize: '0.714rem', fontWeight: 600,
      background: `${color}1a`, color, border: `1px solid ${color}30`
    }}>
      {grade}
    </span>
  );
}

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
  const [modal, setModal] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'map'
  const [form, setForm] = useState({ 
    customer_id: '', service_id: '', company_name: '', brand_site: '', 
    address: '', service_type: 'Internet Dedicated', grade: 'Bronze', 
    support_level: 'L1', link_coverage: '', latitude: null, longitude: null 
  });
  const { addToast } = useToast();
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = () => api.getCustomers().then(setCustomers).catch(e => addToast(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openEdit = (c) => { setModal(c); setForm({ ...c }); };
  const openCreate = () => { setModal('create'); setForm({ customer_id: '', service_id: '', company_name: '', brand_site: '', address: '', service_type: 'Internet Dedicated', grade: 'Bronze', support_level: 'L1', link_coverage: '', latitude: null, longitude: null }); };
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
        address: r['Alamat']?.toString() || '',
        service_type: r['Layanan']?.toString() || '',
        grade: r['Grade']?.toString() || '',
        support_level: r['Support Level']?.toString() || '',
        link_coverage: r['Link Coverage']?.toString() || '',
      })).filter(c => c.customer_id);
      if (parsed.length === 0) throw new Error('Data tidak valid');
      const res = await api.uploadCustomers(parsed);
      addToast(`Berhasil upload ${res.count} customer`, 'success');
      load();
    } catch(err) { addToast(`Gagal: ${err.message}`, 'error'); setLoading(false); }
    finally { e.target.value = null; }
  };
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ 'Customer ID': 'CUST-001', 'Service ID': 'SRV-001', 'Company Name': 'PT Contoh', 'Brand / Site': 'Cabang Utama', 'Alamat': 'Jl. Sudirman No 1', 'Layanan': 'Internet Dedicated', 'Grade': 'Gold', 'Support Level': 'L2', 'Link Coverage': 'https://maps.google.com/...' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Master_Customer.xlsx');
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Customer Master</div>
          <div className="page-subtitle">{customers.length} registered customers</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}><Download size={13} /> Template</button>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
            <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileUpload} />
            <Database size={13} /> Bulk Upload
          </label>
          <button className="btn btn-ghost btn-sm" onClick={() => setViewMode(viewMode === 'table' ? 'map' : 'table')}>
            {viewMode === 'table' ? <><MapIcon size={13} /> Map View</> : <><TableIcon size={13} /> Table View</>}
          </button>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Add Customer</button>
        </div>
      </div>

      {viewMode === 'map' && (
        <div style={{ height: '500px', marginBottom: '1.5rem' }}>
          <CustomerMap 
            customers={customers.filter(c => c.latitude && c.longitude)} 
            onMarkerClick={(c) => openEdit(c)}
          />
        </div>
      )}

      {viewMode === 'table' && (
        <TableCard>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div> :
         customers.length === 0 ? <EmptyState icon={<Database size={40} />} title="No customers found" desc="Add customer data or upload from Excel" /> : (
          <table className="data-table">
            <colgroup>
              <col className="col-no" /><col className="col-md" /><col className="col-md" />
              <col className="col-auto" /><col className="col-lg" />
              <col className="col-sm" /><col className="col-sm" /><col className="col-sm" />
              <col className="col-md" /><col className="col-actions" />
            </colgroup>
            <thead><tr>
              <th className="text-center">#</th><th>Cust ID</th><th>Service ID</th>
              <th>Company Name</th><th>Brand / Site</th>
              <th>Grade</th><th>Level</th><th>Status</th>
              <th>Service Type</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id}>
                  <td className="text-center" style={{ color: 'var(--text-muted)', fontSize: '0.786rem' }}>{i + 1}</td>
                  <td className="text-mono">{c.customer_id}</td>
                  <td className="text-mono">{c.service_id}</td>
                  <td style={{ fontWeight: 600 }} className="text-truncate">{c.company_name}</td>
                  <td className="text-truncate" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{c.brand_site}</td>
                  <td><GradeBadge grade={c.grade} /></td>
                  <td><AccentBadge text={c.support_level} /></td>
                  <td><StatusBadge active={c.is_active} /></td>
                  <td style={{ fontSize: '0.786rem', color: 'var(--text-secondary)' }} className="text-truncate">{c.service_type}</td>
                  <td>
                    <div className="cell-actions">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(c)} title="Edit"><Edit2 size={12} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(c.id)} title="Hapus"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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

        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={14} /> Geographic Location 
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Click map to pick coordinates)</span>
          </label>
          <div className="form-grid form-grid-2" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.65rem' }}>Latitude</label>
              <input type="number" step="any" className="form-control" value={form.latitude || ''} onChange={e => setF('latitude', parseFloat(e.target.value))} placeholder="-6.123" />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.65rem' }}>Longitude</label>
              <input type="number" step="any" className="form-control" value={form.longitude || ''} onChange={e => setF('longitude', parseFloat(e.target.value))} placeholder="106.123" />
            </div>
          </div>
          <div style={{ height: '200px', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <CustomerMap 
              pickerMode 
              pickPosition={form.latitude && form.longitude ? [form.latitude, form.longitude] : null}
              onLocationSelect={(latlng) => {
                setF('latitude', latlng.lat);
                setF('longitude', latlng.lng);
              }}
              center={form.latitude && form.longitude ? [form.latitude, form.longitude] : [-6.9147, 107.6098]}
              zoom={15}
            />
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
      if (modal === 'create') { await api.createClassification(form); addToast('Klasifikasi ditambahkan', 'success'); }
      else { await api.updateClassification(modal.id, form); addToast('Diperbarui', 'success'); }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus klasifikasi ini?')) return;
    try { await api.deleteClassification(id); addToast('Dihapus', 'warning'); load(); }
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
              <th>ID</th><th>Username</th><th>Name</th>
              <th>Email</th><th>Role</th><th>Status</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="text-mono" style={{ color: 'var(--accent-light)', fontWeight: 700 }}>{u.employee_id || '—'}</td>
                  <td className="text-mono">{u.username}</td>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ fontSize: '0.786rem', color: 'var(--text-secondary)' }} className="text-truncate">{u.email || '—'}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td>
                    <button onClick={() => handleToggle(u)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <StatusBadge active={u.is_active} />
                    </button>
                  </td>
                  <td>
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
      if (modal === 'create') { await api.createTechnicalSupport(form); addToast('Data ditambahkan', 'success'); }
      else { await api.updateTechnicalSupport(modal.id, form); addToast('Diperbarui', 'success'); }
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
      addToast(`Berhasil upload ${res.count} data`, 'success');
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
              <th className="text-center">#</th><th>No</th><th>Name</th><th>Unit</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={item.id}>
                  <td className="text-center" style={{ color: 'var(--text-muted)', fontSize: '0.786rem' }}>{i + 1}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.786rem' }}>{item.no || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>
                    <span style={{ fontSize: '0.786rem', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '0.125rem 0.5rem', borderRadius: 4, color: 'var(--text-secondary)' }}>
                      {item.unit}
                    </span>
                  </td>
                  <td>
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
      addToast(`Berhasil upload ${res.count} data ${type}`, 'success');
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

      {loading ? <PageSpinner /> : (
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
      else { await api.updateAction(modal.id, form); addToast('Updated', 'success'); }
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
              <th className="text-center">#</th><th>Handling Action Name</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={item.id}>
                  <td className="text-center" style={{ color: 'var(--text-muted)', fontSize: '0.786rem' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>
                    <div className="cell-actions">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)}><Edit2 size={12} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => { if(confirm('Hapus action ini?')) api.deleteAction(item.id).then(load); }}><Trash2 size={12} /></button>
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
