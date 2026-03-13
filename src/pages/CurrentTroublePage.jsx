import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDateTime, processTimeline, formatDuration, calculateIncidentLevel, getSLATarget } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { NcalBadge, StatusPill, LiveTimer, PageSpinner, Modal, EmptyState, UnifiedTimeline, DurationBadge, Spinner, SectionCard, LevelBadge } from '../components/ui/index.jsx';
import { Play, Pause, Square, Edit2, RefreshCw, Plus, AlertTriangle, Clock, Bell } from 'lucide-react';

function PauseModal({ open, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="⏸ Pause Incident"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-warning" onClick={() => { onConfirm(reason); setReason(''); }}>Pause Now</button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Reason for Pause *</label>
        <textarea className="form-control" placeholder="e.g., Awaiting materials, bad weather, vendor coordination..." value={reason} onChange={e => setReason(e.target.value)} rows={3} />
      </div>
    </Modal>
  );
}

function UpdateModal({ open, onClose, incident, onSaved }) {
  const [form, setForm] = useState({
    technician_id: '',
    root_cause: '',
    last_action: '',
    power_before: '',
    power_after: '',
    classification_id: '',
    level_support: '',
  });
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
      root_cause: '',
      last_action: '',
      power_before: incident.power_before || '',
      power_after: incident.power_after || '',
      classification_id: incident.classification_id || '',
      level_support: incident.level_support || '2',
    });
    api.getIncident(incident.id).then(fullData => {
      incident._fullData = fullData;
    });
    api.getClassifications().then(c => {
      setClasses(c);
      if (incident.classification_id) {
        const cl = c.find(x => x.id === incident.classification_id);
        if (cl) setSelectedParent(cl.klasifikasi);
      }
    });

    if (user?.role !== 'technician') {
      api.getUsers().then(setUsers).catch(e => {
        if (e.message !== 'Insufficient permissions') console.error(e);
      });
    }
  }, [open, incident]);

  const uniqueParents = [...new Set(classes.map(c => c.klasifikasi))];

  const handleSave = async () => {
    try {
      await api.updateIncident(incident.id, form);
      addToast('Incident updated successfully', 'success');
      onSaved(); onClose();
    } catch (e) { addToast(e.message, 'error'); }
  };

  if (!incident) return null;
  const iData = incident._fullData || incident;
  
  return (
    <Modal open={open} onClose={onClose} title={`Update Incident — ${incident.case_no}`} size="xl"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
        </>
      }
    >
      <div className="layout-with-aside" style={{ marginBottom: '1.5rem', maxHeight: '72vh', overflowY: 'auto' }}>
        
        {/* Main Column: Update Form */}
        <div className="page-stack">
          <div className="section-card">
            <div className="section-card-header">
              <div className="section-card-title">Update Resolution & Classification</div>
            </div>
            <div className="section-card-body" style={{ padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {user?.role && user.role !== 'technician' && (
                  <div className="form-group">
                    <label className="form-label">Assign Technician</label>
                    <select 
                      className="form-control" 
                      value={form.technician_id} 
                      onChange={e => setForm(p => ({ ...p, technician_id: e.target.value }))}
                    >
                      <option value="">— Unassigned —</option>
                      {users.filter(u => ['technician', 'noc', 'admin'].includes(u.role)).map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {user?.role && user.role !== 'technician' && (
                <div className="form-group mb-3">
                  <label className="form-label">Root Cause Classification</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="form-control" style={{ flex: 1 }} value={selectedParent} onChange={e => { setSelectedParent(e.target.value); setForm(p => ({ ...p, classification_id: '' })); }}>
                      <option value="">— Select Category —</option>
                      {uniqueParents.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select className="form-control" style={{ flex: 1.5 }} value={form.classification_id} onChange={e => setForm(p => ({ ...p, classification_id: e.target.value }))} disabled={!selectedParent}>
                      <option value="">— Select Detailed Cause —</option>
                      {classes.filter(c => c.klasifikasi === selectedParent).map(c => <option key={c.id} value={c.id}>{c.sub_klasifikasi}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div className="form-group mb-4">
                <label className="form-label">Update Root Cause (Permanent)</label>
                <textarea className="form-control" rows={3} value={form.root_cause} onChange={e => setForm(p => ({ ...p, root_cause: e.target.value }))} placeholder="Explain the root cause..." />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Action Taken / Update Notes</label>
                <textarea className="form-control" rows={4} value={form.last_action} onChange={e => setForm(p => ({ ...p, last_action: e.target.value }))} placeholder="Explain the resolution steps or update technician notes..." />
              </div>
              {user?.role && user.role !== 'technician' && !['ORANGE', 'RED', 'BLACK'].includes(incident?.ncal) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
          </div>
        </div>

        {/* Sidebar: Compact Info & Handling History */}
        <div className="aside-sticky" style={{ width: '340px' }}>
          <div className="page-stack">
            
            {/* Compact Info Summary */}
            <div className="section-card">
              <div className="section-card-body" style={{ padding: '0.875rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                   <div>
                     <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>SITE / SEGMENT</div>
                     <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2 }}>
                        {['ORANGE', 'RED', 'BLACK'].includes(iData.ncal) ? (iData.odp_bts || iData.site_name_manual || '—') : (iData.site_name_manual || iData.company_name || '—')}
                      </div>
                   </div>
                   <div style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr 1fr', gap: '0.875rem', alignItems: 'center' }}>
                      <LevelBadge level={calculateIncidentLevel(iData.start_time)} />
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>NCAL</div>
                        <div style={{ marginTop: 4 }}><NcalBadge value={iData.ncal} /></div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>STATUS</div>
                        <div style={{ marginTop: 4 }}><StatusPill status={iData.status} /></div>
                      </div>
                   </div>
                   <div>
                     <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>NETT DURATION</div>
                     <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>
                       <LiveTimer 
                         startIso={iData.start_time} 
                         pausedSec={iData.total_pause_duration_seconds} 
                         paused={iData.status === 'pending'} 
                         target={getSLATarget(iData.ncal)}
                       />
                     </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Handling History Only */}
            <div className="section-card">
              <div className="section-card-header" style={{ background: 'var(--accent-subtle)', borderBottomColor: 'rgba(99,102,241,0.1)', padding: '0.625rem 0.875rem' }}>
                <div className="section-card-title" style={{ fontSize: '0.75rem', color: 'var(--accent-light)' }}>Handling History</div>
              </div>
              <div className="section-card-body" style={{ padding: 0 }}>
                <UnifiedTimeline 
                  timeline={processTimeline(iData).filter(item => {
                    const isTech = user?.role === 'technician';
                    const action = item.type === 'pause' ? 'PAUSE' : item.action;
                    if (isTech) {
                      // Technicians only see updates to Root Cause or Action Taken
                      return action === 'UPDATE' && (
                        (item.details || '').includes('Penyebab:') || 
                        (item.details || '').includes('Action Terakhir:')
                      );
                    }
                    return action === 'UPDATE' || action === 'PAUSE';
                  })} 
                />
              </div>
            </div>
          </div>
        </div>
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
      addToast('Incident successfully closed', 'success');
      onClosed(); onClose();
    } catch (e) { addToast(e.message, 'error'); }
  };
  if (!incident) return null;
  return (
    <Modal open={open} onClose={onClose} title="Close Incident"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleClose}>✕ Close Incident</button>
        </>
      }
    >
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <p>You are about to close incident <strong style={{ color: 'var(--text-primary)' }}>{incident.case_no}</strong>.</p>
        <div className="preview-block" style={{ marginTop: 12, padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontWeight: 600 }}><NcalBadge value={incident.ncal} /> &nbsp; {incident.site_name_manual || incident.company_name || '—'}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Problem: <span style={{ color: 'var(--text-primary)' }}>{incident.initial_problem || '—'}</span></div>
          {incident.odp_bts && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ODP/BTS: <span style={{ color: 'var(--text-primary)' }}>{incident.odp_bts}</span></div>}
        </div>
        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label" style={{ color: 'var(--text-primary)' }}>Restore Time (End Time) *</label>
          <input type="datetime-local" className="form-control" value={waktu_online} onChange={e => setWaktuOnline(e.target.value)} required />
        </div>
        <div className="info-banner info-banner-warning mt-4">
          ⚠ The system will automatically calculate downtime based on the Start Time and this Restore Time.
        </div>
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
    try { const data = await api.getNotifications(); setNotifications(data); } 
    catch (e) { console.error(e); }
  }, []);

  useEffect(() => { 
    load(); loadNotifications();
    const t = setInterval(() => { load(); loadNotifications(); }, 10000); 
    return () => clearInterval(t); 
  }, [load, loadNotifications]);

  const [alertedIds, setAlertedIds] = useState(new Set());

  // SLA Breach Detection (Simulation)
  useEffect(() => {
    incidents.forEach(inc => {
      if (inc.status !== 'closed' && inc.status !== 'resolved') {
        const target = getSLATarget(inc.ncal);
        const start = new Date(inc.start_time).getTime();
        const elapsed = Math.floor((Date.now() - start) / 1000);
        if (elapsed > target && !alertedIds.has(inc.id)) {
          addToast(`CRITICAL: SLA Exceeded for ${inc.case_no} (${inc.ncal})`, 'error');
          setAlertedIds(prev => new Set([...prev, inc.id]));
        }
      }
    });
  }, [incidents, addToast, alertedIds]);

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

  if (loading) return <PageSpinner />;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Active Troubles</div>
          <div className="page-subtitle">Currently monitoring {incidents.length} active incidents</div>
        </div>
        <div className="page-actions">
          {user?.role !== 'technician' && (
            <button className="btn btn-primary" onClick={() => navigate('/incidents/create')}><Plus size={16} /> Create Incident</button>
          )}
        </div>
      </div>

      <div className={['admin', 'noc', 'manager'].includes(user?.role) ? 'layout-with-aside' : ''}>
        
        {/* Main Incident List */}
        <div className="section-card" style={{ padding: 0 }}>
          {incidents.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle size={48} />}
              title="Tidak ada incident aktif"
              desc="Semua jaringan terpantau dalam kondisi normal."
              action={['admin', 'noc'].includes(user?.role) && <button className="btn btn-primary" onClick={() => navigate('/incidents/create')}><Plus size={14} /> Buat Incident Baru</button>}
            />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case No</th>
                    <th>Site / Segment</th>
                    <th>Problem Information</th>
                    <th>Status</th>
                    <th>Timer</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map(inc => {
                    const actions = [];
                    if (inc.status === 'open') {
                      actions.push({ label: 'Start', icon: Play, onClick: () => handleStart(inc.id), className: 'text-success' });
                    }
                    if (inc.status === 'progress' && ['admin', 'noc'].includes(user?.role)) {
                      actions.push({ label: 'Pause', icon: Pause, onClick: () => setPauseModal(inc), className: 'text-warning' });
                    }
                    if (inc.status === 'pending' && ['admin', 'noc'].includes(user?.role)) {
                      actions.push({ label: 'Resume', icon: Play, onClick: () => handleResume(inc.id), className: 'text-success' });
                    }
                    actions.push({ label: 'Update', icon: Edit2, onClick: () => setUpdateModal(inc), className: 'text-primary' });
                    if (['admin', 'noc'].includes(user?.role)) {
                      actions.push({ label: 'Close', icon: Square, onClick: () => setCloseModal(inc), className: 'text-danger' });
                    }

                    return (
                      <tr key={inc.id}>
                        <td>
                          <button className="id-link" onClick={() => navigate(`/incidents/${inc.id}`)} style={{ background: 'none', border: 'none' }}>
                            {inc.case_no}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <LevelBadge level={calculateIncidentLevel(inc.start_time)} />
                            <NcalBadge value={inc.ncal} />
                            {inc.level_support && (
                              <span style={{ 
                                fontSize: '0.65rem', 
                                fontWeight: 800, 
                                background: 'var(--bg-elevated)', 
                                color: 'var(--text-secondary)', 
                                padding: '2px 6px', 
                                borderRadius: 4, 
                                border: '1px solid var(--border)' 
                              }}>
                                P{inc.level_support}
                              </span>
                            )}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem' }} className="text-truncate">
                            {['ORANGE', 'RED', 'BLACK'].includes(inc.ncal) ? (inc.odp_bts || inc.site_name_manual || '—') : (inc.site_name_manual || inc.company_name || '—')}
                          </div>
                          {!['ORANGE', 'RED', 'BLACK'].includes(inc.ncal) && inc.brand_site && <div style={{ fontSize: '0.714rem', color: 'var(--text-secondary)' }} className="text-truncate">{inc.brand_site}</div>}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} className="text-truncate">{inc.initial_problem || '—'}</div>
                          <div style={{ fontSize: '0.714rem', color: 'var(--text-muted)' }} className="text-truncate">{inc.odp_bts || '—'}</div>
                        </td>
                        <td><StatusPill status={inc.status} /></td>
                        <td>
                          <div style={{ fontSize: '0.845rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            <LiveTimer 
                              startIso={inc.start_time} 
                              pausedSec={inc.total_pause_duration_seconds} 
                              paused={inc.status === 'pending'} 
                              target={getSLATarget(inc.ncal)}
                            />
                          </div>
                          <div style={{ fontSize: '0.714rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(inc.start_time)}</div>
                        </td>
                        <td>
                          <div className="cell-actions">
                            {actions.map(a => (
                              <button key={a.label} className={`btn btn-sm btn-ghost`} onClick={a.onClick} title={a.label}>
                                <a.icon size={14} className={a.className} />
                                <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{a.label}</span>
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar: Recent Updates */}
        {['admin', 'noc', 'manager'].includes(user?.role) && (
          <div className="aside-sticky">
            <div className="section-card">
              <div className="section-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
                  <Bell size={16} /> Recent Updates
                </div>
              </div>
              <div className="section-card-body" style={{ padding: '0.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.786rem', textAlign: 'center', padding: '1rem 0' }}>No recent activities</div>
                ) : (
                  <div className="page-stack" style={{ gap: '0.625rem' }}>
                    {notifications.map(n => (
                      <div 
                        key={n.id} 
                        style={{ 
                          fontSize: '0.845rem', 
                          padding: '0.875rem', 
                          background: n.is_read ? 'var(--bg-elevated)' : 'var(--accent-subtle)', 
                          borderRadius: 'var(--radius-sm)', 
                          border: `1px solid ${n.is_read ? 'var(--border)' : 'rgba(99,102,241,0.25)'}`,
                          borderLeft: `3px solid ${n.is_read ? 'var(--border)' : 'var(--accent)'}`,
                          cursor: 'pointer',
                          transition: 'background var(--t-fast)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = n.is_read ? 'var(--bg-card-hover)' : 'var(--accent-subtle)'}
                        onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'var(--bg-elevated)' : 'var(--accent-subtle)'}
                        onClick={() => {
                          api.markNotificationRead(n.id);
                          if (n.incident_id) navigate(`/incidents/${n.incident_id}`);
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 8, lineHeight: 1.4, color: n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                          {n.message}
                        </div>
                        <div style={{ fontSize: '0.714rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{formatDateTime(n.created_at)}</span>
                          {!n.is_read && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Baru</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <PauseModal open={!!pauseModal} onClose={() => setPauseModal(null)} onConfirm={(r) => handlePause(pauseModal, r)} />
      <UpdateModal open={!!updateModal} onClose={() => setUpdateModal(null)} incident={updateModal} onSaved={load} />
      <CloseModal open={!!closeModal} onClose={() => setCloseModal(null)} incident={closeModal} onClosed={load} />
    </div>
  );
}
