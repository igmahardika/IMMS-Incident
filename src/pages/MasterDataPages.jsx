import React, { useEffect, useState } from 'react';
import { api } from '../utils/api.js';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastContext.jsx';
import { Modal, Spinner, EmptyState, SectionCard } from '../components/ui/index.jsx';
import { Plus, Edit2, Trash2, Database, Download, Network, ChevronRight, ChevronDown } from 'lucide-react';
import { NcalBadge } from '../components/ui/index.jsx';

// ─── Master Customer Page ─────────────────────────────────────────────────────────
export function MasterCustomerPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | {customer object}
  const [form, setForm] = useState({ customer_id: '', service_id: '', company_name: '', brand_site: '', address: '', service_type: 'Internet Dedicated', grade: 'Bronze', support_level: 'L1', link_coverage: '' });
  const { addToast } = useToast();
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = () => api.getCustomers().then(setCustomers).catch(e => addToast(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openEdit = (cust) => { setModal(cust); setForm({ ...cust }); };
  const openCreate = () => { setModal('create'); setForm({ customer_id: '', service_id: '', company_name: '', brand_site: '', address: '', service_type: 'Internet Dedicated', grade: 'Bronze', support_level: 'L1', link_coverage: '' }); };

  const handleSave = async () => {
    try {
      if (modal === 'create') { await api.createCustomer(form); addToast('Customer berhasil ditambahkan', 'success'); }
      else { await api.updateCustomer(modal.id, form); addToast('Customer diupdate', 'success'); }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Nonaktifkan customer ini?')) return;
    try { await api.deleteCustomer(id); addToast('Customer dinonaktifkan', 'warning'); load(); }
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

      if (parsed.length === 0) throw new Error('Data tidak valid atau kolom tidak sesuai (butuh "Customer ID")');
      
      const res = await api.uploadCustomers(parsed);
      addToast(`Berhasil upload ${res.count} data customer`, 'success');
      load();
    } catch(err) {
      addToast(`Gagal upload: ${err.message}`, 'error');
      setLoading(false);
    } finally {
      e.target.value = null; // reset
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Customer ID': 'CUST-001',
      'Service ID': 'SRV-001',
      'Company Name': 'PT Contoh Perusahaan',
      'Brand / Site': 'Cabang Utama',
      'Alamat': 'Jl. Sudirman No 1',
      'Layanan': 'Internet Dedicated',
      'Grade': 'Gold',
      'Support Level': 'L2',
      'Link Coverage': 'https://maps.google.com/...'
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Master_Customer.xlsx');
  };

  const CustomerForm = () => (
    <>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Customer ID *</label><input type="text" className="form-control" value={form.customer_id} onChange={e => setF('customer_id', e.target.value)} required /></div>
        <div className="form-group"><label className="form-label">Service ID *</label><input type="text" className="form-control" value={form.service_id} onChange={e => setF('service_id', e.target.value)} required /></div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Company Name *</label><input type="text" className="form-control" value={form.company_name} onChange={e => setF('company_name', e.target.value)} required /></div>
        <div className="form-group"><label className="form-label">Brand / Site *</label><input type="text" className="form-control" value={form.brand_site} onChange={e => setF('brand_site', e.target.value)} required /></div>
      </div>
      <div className="form-group"><label className="form-label">Alamat</label><textarea className="form-control" rows={2} value={form.address} onChange={e => setF('address', e.target.value)} /></div>
      <div className="form-grid form-grid-3">
        <div className="form-group"><label className="form-label">Service Type</label>
          <select className="form-control" value={form.service_type} onChange={e => setF('service_type', e.target.value)}>
            {['Internet Dedicated', 'Broadband', 'VPN IP', 'MPLS', 'Astinet', 'VSAT', 'Clear Channel'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Grade</label>
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
      <div className="form-group"><label className="form-label">Link Coverage (URL)</label><input type="url" className="form-control" value={form.link_coverage} onChange={e => setF('link_coverage', e.target.value)} /></div>
    </>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group"><div className="page-title">Master Customer</div><div className="page-subtitle">{customers.length} customer terdaftar</div></div>
        <div className="page-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}>
            <Download size={13} style={{ marginRight: 4 }} /> Template
          </button>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
            <input type="file" accept=".xlsx, .xls, .csv" style={{ display: 'none' }} onChange={handleFileUpload} />
            <Database size={13} style={{ marginRight: 4 }} /> Upload Excel
          </label>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Tambah Customer</button>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div> : customers.length === 0 ? <EmptyState icon={<Database size={40} />} title="Belum ada customer" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Cust ID</th><th>Service ID</th><th>Company</th><th>Brand/Site</th><th>Grade & Lvl</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{i + 1}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{c.customer_id}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{c.service_id}</td>
                    <td style={{ fontWeight: 500, fontSize: '0.82rem' }}>{c.company_name}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.brand_site}</td>
                    <td style={{ fontSize: '0.78rem' }}>
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: 'rgba(255,255,255,0.1)', borderRadius: 4, marginRight: 4 }}>{c.grade}</span>
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: 'rgba(99,102,241,0.2)', color: 'var(--accent)', borderRadius: 4 }}>{c.support_level}</span>
                    </td>
                    <td><span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 99, background: c.is_active ? 'var(--success-bg)' : 'rgba(255,255,255,0.06)', color: c.is_active ? 'var(--success)' : 'var(--text-muted)' }}>{c.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(c)}><Edit2 size={11} /></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(c.id)}><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Tambah Customer' : 'Edit Customer'}
        footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Batal</button><button className="btn btn-primary" onClick={handleSave}>Simpan</button></>}
      >
        <CustomerForm />
      </Modal>
    </div>
  );
}

// ─── Master Classification Page ───────────────────────────────────────────────
export function MasterClassificationPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ klasifikasi: '', sub_klasifikasi: '' });
  const { addToast } = useToast();
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = () => api.getClassifications().then(setClasses).catch(e => addToast(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openEdit = (c) => { setModal(c); setForm({ klasifikasi: c.klasifikasi, sub_klasifikasi: c.sub_klasifikasi || '' }); };
  const openCreate = () => { setModal('create'); setForm({ klasifikasi: '', sub_klasifikasi: '' }); };

  const handleSave = async () => {
    try {
      if (modal === 'create') { await api.createClassification(form); addToast('Klasifikasi ditambahkan', 'success'); }
      else { await api.updateClassification(modal.id, form); addToast('Klasifikasi diupdate', 'success'); }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Nonaktifkan klasifikasi ini?')) return;
    try { await api.deleteClassification(id); addToast('Dihapus', 'warning'); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group"><div className="page-title">Master Klasifikasi</div><div className="page-subtitle">Penyebab / kategori gangguan (Parent-Child)</div></div>
        <div className="page-actions"><button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Tambah Klasifikasi</button></div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div> : classes.length === 0 ? <EmptyState icon="🏷️" title="Belum ada klasifikasi" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Klasifikasi (Parent)</th><th>Sub-Klasifikasi (Child)</th><th>Actions</th></tr></thead>
              <tbody>
                {classes.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}><span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: 99, background: 'rgba(99,102,241,0.15)', color: 'var(--accent)', fontWeight: 600 }}>{c.klasifikasi}</span></td>
                    <td style={{ fontWeight: 500 }}>{c.sub_klasifikasi}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(c)}><Edit2 size={11} /></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(c.id)}><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Tambah Klasifikasi' : 'Edit Klasifikasi'}
        footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Batal</button><button className="btn btn-primary" onClick={handleSave}>Simpan</button></>}
      >
        <div className="form-group"><label className="form-label">Klasifikasi (Parent) *</label><input type="text" className="form-control" value={form.klasifikasi} onChange={e => setF('klasifikasi', e.target.value)} placeholder="Misal: Kabel Putus" /></div>
        <div className="form-group"><label className="form-label">Sub-Klasifikasi (Child) *</label><input type="text" className="form-control" value={form.sub_klasifikasi} onChange={e => setF('sub_klasifikasi', e.target.value)} placeholder="Misal: Rabas Pohon" /></div>
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
      if (modal === 'create') { await api.createUser(form); addToast('User dibuat', 'success'); }
      else { await api.updateUser(modal.id, form); addToast('User diupdate', 'success'); }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  };
  const handleToggle = async (u) => {
    try { await api.updateUser(u.id, { is_active: u.is_active ? 0 : 1 }); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };

  const ROLE_COLORS = { admin: '#6366f1', manager: '#10b981', noc: '#3b82f6', technician: '#f59e0b' };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group"><div className="page-title">User Management</div><div className="page-subtitle">{users.length} user terdaftar</div></div>
        <div className="page-actions"><button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Tambah User</button></div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Username</th><th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)' }}>{u.employee_id || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700 }}>{u.username}</td>
                    <td style={{ fontWeight: 500 }}>{u.name}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email || '—'}</td>
                    <td><span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.55rem', borderRadius: 99, background: `${ROLE_COLORS[u.role]}22` || 'rgba(255,255,255,0.06)', color: ROLE_COLORS[u.role] || 'var(--text-muted)', textTransform: 'capitalize' }}>{u.role}</span></td>
                    <td>
                      <button onClick={() => handleToggle(u)} style={{ background: u.is_active ? 'var(--success-bg)' : 'rgba(255,255,255,0.06)', color: u.is_active ? 'var(--success)' : 'var(--text-muted)', border: 'none', borderRadius: 99, fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.5rem', cursor: 'pointer' }}>
                        {u.is_active ? '✓ Aktif' : '✗ Nonaktif'}
                      </button>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(u)}><Edit2 size={11} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Tambah User Baru' : 'Edit User'}
        footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Batal</button><button className="btn btn-primary" onClick={handleSave}>Simpan</button></>}
      >
        <div className="form-grid form-grid-3">
          <div className="form-group"><label className="form-label">ID (4 Angka) *</label><input type="text" className="form-control" value={form.employee_id} onChange={e => setF('employee_id', e.target.value)} placeholder="1001" maxLength={4} /></div>
          <div className="form-group"><label className="form-label">Username *</label><input type="text" className="form-control" value={form.username} onChange={e => setF('username', e.target.value)} placeholder="username" disabled={modal !== 'create'} /></div>
          <div className="form-group"><label className="form-label">Password {modal !== 'create' ? '(kosong = tidak berubah)' : '*'}</label><input type="password" className="form-control" value={form.password} onChange={e => setF('password', e.target.value)} /></div>
        </div>
        <div className="form-grid form-grid-2">
          <div className="form-group"><label className="form-label">Nama Lengkap *</label><input type="text" className="form-control" value={form.name} onChange={e => setF('name', e.target.value)} /></div>
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
      else { await api.updateTechnicalSupport(modal.id, form); addToast('Data diupdate', 'success'); }
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
      
      const parsed = rows.map(r => ({
        no: r['No']?.toString() || '',
        name: r['Name']?.toString() || '',
        unit: r['Unit']?.toString() || '',
      })).filter(r => r.name && r.unit);

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

  const FormFields = () => (
    <>
      <div className="form-group"><label className="form-label">No</label><input type="text" className="form-control" value={form.no} onChange={e => setF('no', e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Name *</label><input type="text" className="form-control" value={form.name} onChange={e => setF('name', e.target.value)} required /></div>
      <div className="form-group"><label className="form-label">Unit *</label><input type="text" className="form-control" value={form.unit} onChange={e => setF('unit', e.target.value)} required /></div>
    </>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group"><div className="page-title">Personel Data</div><div className="page-subtitle">{data.length} personil terdaftar</div></div>
        <div className="page-actions" style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}><Download size={13} /> Template</button>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
            <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleFileUpload} />
            <Database size={13} /> Upload
          </label>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Tambah Data</button>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {loading ? <Spinner center /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>No</th><th>Name</th><th>Unit</th><th>Actions</th></tr></thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id}>
                    <td>{item.no || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td><span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>{item.unit}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)}><Edit2 size={11} /></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => api.deleteTechnicalSupport(item.id).then(load)}><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Tambah Personel' : 'Edit Personel'} footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Batal</button><button className="btn btn-primary" onClick={handleSave}>Simpan</button></>}>
        <FormFields />
      </Modal>
    </div>
  );
}

// ─── Master Distribusi Page ───────────────────────────────────────────────────
export function MasterDistribusiPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({}); // { 'path': boolean }
  const [showDropdown, setShowDropdown] = useState(false);
  const { addToast } = useToast();

  const load = () => api.getDistribusi().then(setData).catch(e => addToast(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const toggle = (path) => setExpanded(p => ({ ...p, [path]: !p[path] }));

  // Convert flat data to tree
  const tree = { 'Fiber Optic': {}, 'Wireless': {} };
  data.forEach(d => {
    if (!tree[d.type]) tree[d.type] = {};
    if (d.type === 'Fiber Optic') {
      const p = d.level_1; // POP
      if (!tree[d.type][p]) tree[d.type][p] = {};
      const o = d.level_2; // OSC
      if (o) {
        if (!tree[d.type][p][o]) tree[d.type][p][o] = {};
        const dc = d.level_3; // ODC
        if (dc) {
          if (!tree[d.type][p][o][dc]) tree[d.type][p][o][dc] = [];
          const dp = d.level_4; // ODP
          if (dp && Array.isArray(tree[d.type][p][o][dc]) && !tree[d.type][p][o][dc].includes(dp)) {
             tree[d.type][p][o][dc].push(dp);
          }
        }
      }
    } else if (d.type === 'Wireless') {
      const b = d.level_1; // BTS
      if (!tree[d.type][b]) tree[d.type][b] = [];
      const r = d.level_2; // RADIO
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
      <div style={{ marginLeft: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.35rem 0', cursor: hasChildren ? 'pointer' : 'default', borderBottom: '1px solid rgba(255,255,255,0.02)' }} onClick={() => hasChildren && toggle(path)}>
          {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <div style={{ width: 14 }} />}
          {icon}
          <span style={{ fontSize: '0.82rem', fontWeight: icon ? 600 : 400 }}>{label}</span>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {Array.isArray(children) ? (
              children.map(c => <TreeItem key={path + c} label={c} path={`${path}/${c}`} />)
            ) : (
              Object.entries(children).map(([k, v]) => <TreeItem key={path + k} label={k} children={v} path={`${path}/${k}`} />)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group"><div className="page-title">Master Distribusi Tree</div><div className="page-subtitle">Peta segmentasi jaringan FO & Wireless</div></div>
        <div className="page-actions" style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative' }}>
             <button className="btn btn-ghost btn-sm" onClick={() => setShowDropdown(!showDropdown)}><Download size={13} /> Template</button>
             {showDropdown && (
               <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 100, padding: '0.25rem', minWidth: 140, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', marginTop: 4 }}>
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={downloadTemplateFO}>Fiber Optic</button>
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={downloadTemplateWl}>Wireless</button>
               </div>
             )}
          </div>
          <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
             <input type="file" accept=".xlsx" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'Fiber Optic')} />
             Upload FO
          </label>
          <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
             <input type="file" accept=".xlsx" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'Wireless')} />
             Upload Wireless
          </label>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <SectionCard title="🌳 Fiber Optic Tree">
          <div style={{ padding: '0.5rem' }}>
            {Object.keys(tree['Fiber Optic']).length === 0 ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No data. Upload Excel to build tree.</p> : 
              Object.entries(tree['Fiber Optic']).map(([pop, osc]) => (
                <TreeItem key={pop} label={pop} children={osc} path={`FO/${pop}`} icon={<Database size={13} color="var(--accent)" />} />
              ))
            }
          </div>
        </SectionCard>

        <SectionCard title="🗼 Wireless Tree">
          <div style={{ padding: '0.5rem' }}>
            {Object.keys(tree['Wireless']).length === 0 ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No data. Upload Excel to build tree.</p> : 
              Object.entries(tree['Wireless']).map(([bts, radio]) => (
                <TreeItem key={bts} label={bts} children={radio} path={`WL/${bts}`} icon={<Database size={13} color="var(--warning)" />} />
              ))
            }
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
