import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDateTime } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { NcalBadge, StatusPill, LiveTimer, Spinner, Modal, EmptyState } from '../components/ui/index.jsx';
import { Play, Pause, Square, Edit2, RefreshCw, Plus, AlertTriangle, Clock, Bell } from 'lucide-react';

function PauseModal({ open, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="⏸ Pause Incident"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn btn-warning" onClick={() => { onConfirm(reason); setReason(''); }}>Pause Sekarang</button>
      </>}
    >
      <div className="form-group">
        <label className="form-label">Alasan Pause *</label>
        <textarea className="form-control" placeholder="Misal: Menunggu material, cuaca buruk, koordinasi dengan vendor..." value={reason} onChange={e => setReason(e.target.value)} rows={3} />
      </div>
    </Modal>
  );
}

function UpdateModal({ open, onClose, incident, onSaved }) {
  const [form, setForm] = useState({});
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedParent, setSelectedParent] = useState('');
  const { addToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!open || !incident) return;
    setForm({
      technician_id: incident.technician_id || '',
      root_cause: '', // Clear for fresh update
      last_action: '', // Clear for fresh update
      power_before: incident.power_before || '',
      power_after: incident.power_after || '',
      classification_id: incident.classification_id || '',
    });
    // Request full incident detail directly from API to ensure we have all properties (start_time, end_time, pause_logs, audit_logs)
    api.getIncident(incident.id).then(fullData => {
      // Keep form but allow us to render full details
      incident._fullData = fullData;
    });
    Promise.all([api.getUsers(), api.getClassifications()]).then(([u, c]) => {  
      setUsers(u); 
      setClasses(c); 
      if (incident.classification_id) {
        const cl = c.find(x => x.id === incident.classification_id);
        if (cl) setSelectedParent(cl.klasifikasi);
      }
    });
  }, [open, incident]);

  const uniqueParents = [...new Set(classes.map(c => c.klasifikasi))];

  const handleSave = async () => {
    try {
      await api.updateIncident(incident.id, form);
      addToast('Incident diupdate', 'success');
      onSaved(); onClose();
    } catch (e) { addToast(e.message, 'error'); }
  };

  if (!incident) return null;
  const iData = incident._fullData || incident; // Fallback to shallow object if full data is still loading
  
  return (
    <Modal open={open} onClose={onClose} title={`Update — ${incident.case_no}`} size="xl"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn btn-primary" onClick={handleSave}>Simpan Update</button>
      </>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 1fr', gap: '1.25rem', marginBottom: '1.5rem', maxHeight: '50vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Column 1: Detail Panel mimicking IncidentDetailPage */}
          <div className="card" style={{ padding: '1rem', background: 'var(--bg-glass)' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Informasi Dasar</div>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div><dt style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>SITE / SEGMEN</dt><dd style={{ fontSize: '0.8rem' }}>{iData.site_name_manual || iData.company_name || '—'}</dd></div>
              <div><dt style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>ODP / BTS</dt><dd style={{ fontSize: '0.8rem' }}>{iData.odp_bts || '—'}</dd></div>
              <div><dt style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>LEVEL</dt><dd style={{ fontSize: '0.8rem' }}>{iData.level_support || '—'}</dd></div>
              <div><dt style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>TEKNISI</dt><dd style={{ fontSize: '0.8rem' }}>{iData.technician_name || iData.technician_name_manual || '—'}</dd></div>
            </dl>
            <div className="divider" style={{ margin: '0.75rem 0' }} />
            <div><dt style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>PROBLEM AWAL</dt><dd style={{ fontSize: '0.8rem', marginTop: 2 }}>{iData.initial_problem || '—'}</dd></div>
          </div>
          
          {iData.start_time && (
            <div className="card" style={{ padding: '1rem', background: 'var(--bg-glass)' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}><Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Timeline & Durasi</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>START TIME</div><div style={{ fontSize: '0.75rem', marginTop: 2 }}>{formatDateTime(iData.start_time)}</div></div>
                <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>START ACTION</div><div style={{ fontSize: '0.75rem', marginTop: 2 }}>{formatDateTime(iData.start_action_time)}</div></div>
                <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL PAUSE</div><div style={{ fontSize: '0.75rem', marginTop: 2 }}>{iData.total_pause_duration_seconds ? iData.total_pause_duration_seconds + ' s' : '00:00:00'}</div></div>
                <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>DURASI GROSS/NETT</div><div style={{ fontSize: '0.75rem', marginTop: 2, color: 'var(--primary)' }}><LiveTimer startIso={iData.start_time} pausedSec={iData.total_pause_duration_seconds} paused={iData.status === 'pending'} /></div></div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Column 2: Update View */}
          <div className="card" style={{ padding: '1rem', border: '1px solid var(--accent)' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Resolusi & Update</div>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
              <div><dt style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>PENYEBAB SEBELUMNYA</dt><dd style={{ fontSize: '0.8rem', marginTop: 2 }}>{iData.root_cause || '—'}</dd></div>
              <div><dt style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACTION TERAKHIR SEBELUMNYA</dt><dd style={{ fontSize: '0.8rem', marginTop: 2 }}>{iData.last_action || '—'}</dd></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div><dt style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>POWER BEFORE</dt><dd style={{ fontSize: '0.85rem' }}>{iData.power_before || '—'}</dd></div>
                <div><dt style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>POWER AFTER</dt><dd style={{ fontSize: '0.85rem' }}>{iData.power_after || '—'}</dd></div>
              </div>
              <div><dt style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>KLASIFIKASI</dt><dd style={{ fontSize: '0.8rem' }}>{iData.klasifikasi ? `${iData.klasifikasi} — ${iData.sub_klasifikasi}` : iData.classification_manual || '—'}</dd></div>
            </dl>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1rem' }}>
        {/* History Section inside Update Modal - MOVED ABOVE FORM */}
        {(() => {
          const actionLogs = [
            {
              id: 'initial',
              isInitial: true,
              time: iData.start_time || iData.created_at,
              user: iData.created_by_name || 'System / NOC',
              penyebab: iData.initial_problem || '—',
              penanganan: iData.indikasi || '—'
            },
            ...(iData.audit_logs || [])
              .filter(log => log.action === 'UPDATE')
              .map(log => {
                const causeMatch = log.details.match(/Penyebab:\s*([^|]+)/);
                const actionMatch = log.details.match(/Action Terakhir:\s*([^|]+)/);
                return {
                  id: log.id,
                  time: log.timestamp,
                  user: log.user_name,
                  penyebab: causeMatch ? causeMatch[1].trim() : '—',
                  penanganan: actionMatch ? actionMatch[1].trim() : '—'
                };
              })
              .filter(log => log.penyebab !== '—' || log.penanganan !== '—')
          ].sort((a, b) => new Date(b.time) - new Date(a.time));

          if (actionLogs.length === 0) return null;

          return (
            <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--border)' }}>
                <Clock size={12} /> RIWAYAT UPDATE SEBELUMNYA
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Penyebab</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Penanganan</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>User</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: log.isInitial ? 'rgba(59,130,246,0.05)' : 'transparent' }}>
                        <td style={{ padding: '0.6rem 0.5rem', verticalAlign: 'top', color: 'var(--text-secondary)' }}>{log.penyebab}</td>
                        <td style={{ padding: '0.6rem 0.5rem', verticalAlign: 'top', color: 'var(--text-secondary)' }}>{log.penanganan}</td>
                        <td style={{ padding: '0.6rem 0.5rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{log.user}</td>
                        <td style={{ padding: '0.6rem 0.5rem', verticalAlign: 'top', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{formatDateTime(log.time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        <div style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Form Update Incident</div>
        {['admin', 'noc', 'manager'].includes(user?.role) && (
          <>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Teknisi</label>
                <select className="form-control" value={form.technician_id || ''} onChange={e => setForm(p => ({ ...p, technician_id: e.target.value }))}>
                  <option value="">-- Pilih Teknisi --</option>
                  {users.filter(u => u.role === 'technician').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Klasifikasi (Parent)</label>
                <select className="form-control" value={selectedParent} onChange={e => { setSelectedParent(e.target.value); setForm(p => ({...p, classification_id: ''})); }}>
                  <option value="">-- Pilih Parent --</option>
                  {uniqueParents.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Sub-Klasifikasi (Child)</label>
              <select className="form-control" value={form.classification_id || ''} onChange={e => setForm(p => ({ ...p, classification_id: e.target.value }))} disabled={!selectedParent}>
                <option value="">-- Pilih Sub --</option>
                {classes.filter(c => c.klasifikasi === selectedParent).map(c => <option key={c.id} value={c.id}>{c.sub_klasifikasi}</option>)}
              </select>
            </div>
          </>
        )}
      <div className="form-group">
        <label className="form-label">Penyebab (Root Cause)</label>
        <textarea className="form-control" value={form.root_cause} onChange={e => setForm(p => ({ ...p, root_cause: e.target.value }))} placeholder="Deskripsikan penyebab gangguan..." rows={2} />
      </div>
      <div className="form-group">
        <label className="form-label">Action Terakhir</label>
        <textarea className="form-control" value={form.last_action} onChange={e => setForm(p => ({ ...p, last_action: e.target.value }))} placeholder="Deskripsikan tindakan terakhir..." rows={2} />
      </div>
        {iData.ncal === 'YELLOW' && (
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Power Before (dBm)</label>
              <input type="text" className="form-control" value={form.power_before} onChange={e => setForm(p => ({ ...p, power_before: e.target.value }))} placeholder="-20.5 dBm" />
            </div>
            <div className="form-group">
              <label className="form-label">Power After (dBm)</label>
              <input type="text" className="form-control" value={form.power_after} onChange={e => setForm(p => ({ ...p, power_after: e.target.value }))} placeholder="-18.2 dBm" />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CloseModal({ open, onClose, incident, onClosed }) {
  const { addToast } = useToast();
  const [waktu_online, setWaktuOnline] = useState(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));

  const handleClose = async () => {
    try {
      await api.closeIncident(incident.id, { waktu_online });
      addToast('Incident berhasil ditutup!', 'success');
      onClosed(); onClose();
    } catch (e) { addToast(e.message, 'error'); }
  };
  if (!incident) return null;
  return (
    <Modal open={open} onClose={onClose} title="Close Incident"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn btn-danger" onClick={handleClose}>✕ Tutup Incident</button>
      </>}
    >
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <p>Anda akan menutup incident <strong style={{ color: 'var(--text-primary)' }}>{incident.case_no}</strong>.</p>
        <div style={{ marginTop: 12, padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div><NcalBadge value={incident.ncal} /> &nbsp; {incident.site_name_manual || incident.company_name || '—'}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Problem: {incident.initial_problem || '—'}</div>
          {incident.odp_bts && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ODP: {incident.odp_bts}</div>}
        </div>
        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label" style={{ color: 'var(--text-primary)' }}>Waktu Online (End Time) *</label>
          <input type="datetime-local" className="form-control" value={waktu_online} onChange={e => setWaktuOnline(e.target.value)} required />
        </div>
        <p style={{ marginTop: 12, color: 'var(--warning)', fontSize: '0.78rem' }}>⚠ Sistem akan menghitung durasi downtime (gross dan nett) secara otomatis berdasarkan Waktu Down dan Waktu Online ini.</p>
      </div>
    </Modal>
  );
}

export default function CurrentTroublePage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pauseModal, setPauseModal] = useState(null);
  const [updateModal, setUpdateModal] = useState(null);
  const [closeModal, setCloseModal] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const { addToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try { const data = await api.getIncidents(); setIncidents(data); }
    catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, []);

  const loadNotifications = useCallback(async () => {
    try { 
      const data = await api.getNotifications(); 
      setNotifications(data); 
    } catch (e) { 
      console.error(e);
      addToast('Gagal memuat notifikasi. Pastikan server backend berjalan.', 'error');
    }
  }, [addToast]);

  useEffect(() => { 
    load(); 
    loadNotifications();
    const t = setInterval(() => { load(); loadNotifications(); }, 10000); 
    return () => clearInterval(t); 
  }, [load, loadNotifications]);

  const handleStart = async (id) => {
    try { await api.startAction(id); addToast('Action dimulai!', 'success'); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };
  const handlePause = async (inc, reason) => {
    try { await api.pauseIncident(inc.id, { reason }); addToast('Incident di-pause', 'warning'); setPauseModal(null); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };
  const handleResume = async (id) => {
    try { await api.resumeIncident(id); addToast('Incident dilanjutkan', 'success'); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}><Spinner /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Current Trouble</div>
          <div className="page-subtitle">{incidents.length} incident aktif</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
          {['admin', 'noc'].includes(user?.role) && (
            <button className="btn btn-primary" onClick={() => navigate('/incidents/create')}><Plus size={14} /> Create Incident</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: ['admin', 'noc', 'manager'].includes(user?.role) ? '1fr 320px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {incidents.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle size={48} />}
            title="Tidak ada incident aktif"
            desc="Semua jaringan dalam kondisi normal"
            action={['admin', 'noc'].includes(user?.role) && <button className="btn btn-primary" onClick={() => navigate('/incidents/create')}><Plus size={14} /> Buat Incident Baru</button>}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Case No</th>
                  <th>NCAL</th>
                  <th>Site / Customer</th>
                  <th>ODP / BTS</th>
                  <th>Problem</th>
                  <th>Status</th>
                  <th>Elapsed</th>
                  <th>Start</th>
                  <th>Teknisi</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(inc => (
                  <tr key={inc.id}>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/incidents/${inc.id}`)} style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {inc.case_no}
                      </button>
                    </td>
                    <td><NcalBadge value={inc.ncal} /></td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '0.8rem' }}>{inc.site_name_manual || inc.company_name || '—'}</div>
                      {!['ORANGE', 'RED', 'BLACK'].includes(inc.ncal) && inc.brand_site && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{inc.brand_site}</div>}
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{inc.odp_bts || '—'}</td>
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.initial_problem || '—'}</div>
                    </td>
                    <td><StatusPill status={inc.status} /></td>
                    <td>
                      <LiveTimer
                        startIso={inc.start_action_time || inc.start_time}
                        pausedSec={inc.total_pause_duration_seconds}
                        paused={inc.status === 'pending'}
                      />
                    </td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(inc.start_time)}</td>
                    <td style={{ fontSize: '0.78rem' }}>{inc.technician_name || inc.technician_name_manual || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {inc.status === 'open' && (
                          <button className="btn btn-success btn-sm" onClick={() => handleStart(inc.id)} title="Start Action">
                            <Play size={11} /> Start
                          </button>
                        )}
                        {inc.status === 'progress' && ['admin', 'noc'].includes(user?.role) && (
                          <button className="btn btn-warning btn-sm" onClick={() => setPauseModal(inc)} title="Pause">
                            <Pause size={11} /> Pause
                          </button>
                        )}
                        {inc.status === 'pending' && ['admin', 'noc'].includes(user?.role) && (
                          <button className="btn btn-success btn-sm" onClick={() => handleResume(inc.id)} title="Resume">
                            <Play size={11} /> Resume
                          </button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => setUpdateModal(inc)} title="Update">
                          Update
                        </button>
                        {['admin', 'noc'].includes(user?.role) && (
                          <button className="btn btn-danger btn-sm" onClick={() => setCloseModal(inc)} title="Close">
                            <Square size={11} /> Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {['admin', 'noc', 'manager'].includes(user?.role) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
              <Bell size={18} color="var(--accent)" />
              Recent Updates
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '72vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {notifications.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                  Belum ada pembaharuan aktivitas
                </div>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n.id} 
                    style={{ 
                      fontSize: '0.8rem', 
                      padding: '0.85rem', 
                      background: n.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(99,102,241,0.12)', 
                      borderRadius: 10, 
                      borderLeft: `4px solid ${n.is_read ? 'transparent' : 'var(--accent)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      api.markNotificationRead(n.id);
                      if (n.incident_id) navigate(`/incidents/${n.incident_id}`);
                    }}
                  >
                    <div style={{ fontWeight: n.is_read ? 500 : 700, marginBottom: 6, lineHeight: 1.4, color: n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{formatDateTime(n.created_at)}</span>
                      {!n.is_read && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Baru</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      </div>

      <PauseModal open={!!pauseModal} onClose={() => setPauseModal(null)} onConfirm={(r) => handlePause(pauseModal, r)} />
      <UpdateModal open={!!updateModal} onClose={() => setUpdateModal(null)} incident={updateModal} onSaved={load} />
      <CloseModal open={!!closeModal} onClose={() => setCloseModal(null)} incident={closeModal} onClosed={load} />
    </div>
  );
}
