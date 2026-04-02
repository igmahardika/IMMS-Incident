import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDateTime, processTimeline, formatDuration, calculateIncidentLevel, getSLATarget } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { NcalBadge, StatusPill, LiveTimer, PageSpinner, Modal, EmptyState, UnifiedTimeline, DurationBadge, Spinner, SectionCard, LevelBadge } from '../components/ui/index.jsx';
import { Play, Pause, Square, Edit2, Plus, AlertTriangle, Activity, X as XIcon } from 'lucide-react';

function PauseModal({ open, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Pause Incident"
      footer={
        <>
          <button className="btn btn-ghost font-semibold uppercase tracking-wider text-xs" onClick={onClose}>Cancel</button>
          <button className="btn btn-warning font-semibold uppercase tracking-wider text-xs px-6" onClick={() => { onConfirm(reason); setReason(''); }}>Confirm Pause</button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="form-control w-full">
          <div className="label"><span className="label-text font-semibold text-base-content/40 uppercase tracking-wider text-xs">Reason for Halt *</span></div>
          <textarea className="textarea w-full font-semibold text-sm bg-base-200/80" placeholder="e.g., Awaiting materials, weather conditions, vendor coordination..." value={reason} onChange={e => setReason(e.target.value)} rows={3} />
        </label>
        <div className="p-4 bg-warning/5 rounded-xl text-sm font-medium text-warning leading-relaxed">
          PAUSE: This will stop the active timer. Ensure the reason is documented as it will be logged in the handling history.
        </div>
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
    level_support: '',
  });
  const [users, setUsers] = useState([]);
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
      level_support: incident.level_support || '2',
    });
    api.getIncident(incident.id).then(fullData => {
      incident._fullData = fullData;
      setForm(prev => ({
        ...prev,
        power_before: prev.power_before || fullData.power_before || '',
        power_after: prev.power_after || fullData.power_after || '',
      }));
    });


    if (user?.role !== 'technician') {
      api.getUsers().then(setUsers).catch(e => {
        if (e.message !== 'Insufficient permissions') console.error(e);
      });
    }
  }, [open, incident]);

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
          <button className="btn btn-ghost font-semibold uppercase tracking-wider text-xs" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary px-8 font-semibold uppercase tracking-wider text-xs shadow-lg shadow-primary/20" onClick={handleSave}>Save Changes</button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-4 max-h-[75vh] overflow-y-auto pr-1">
        
        {/* Main Column: Update Form */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Active Resolution Logs</h3>
            <p className="text-sm font-medium text-base-content/60 leading-relaxed italic">Document the latest technical progress and root cause findings.</p>
          </div>

          <div className="flex flex-col gap-6 p-6 bg-base-200/30 rounded-2xl">
            {user?.role && user.role !== 'technician' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="form-control w-full">
                  <div className="label"><span className="label-text font-semibold text-base-content/40 uppercase tracking-wider text-xs">Field Technician</span></div>
                  <select 
                    className="select w-full font-semibold text-sm bg-base-200/80" 
                    value={form.technician_id} 
                    onChange={e => setForm(p => ({ ...p, technician_id: e.target.value }))}
                  >
                    <option value="">— Unassigned —</option>
                    {users.filter(u => ['technician', 'noc', 'admin'].includes(u.role)).map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <label className="form-control w-full">
              <div className="label"><span className="label-text font-semibold text-base-content/40 uppercase tracking-wider text-xs">Root Cause Update</span></div>
              <input type="text" className="input w-full font-semibold text-sm bg-base-200/80" value={form.root_cause} onChange={e => setForm(p => ({ ...p, root_cause: e.target.value }))} placeholder="Brief summary of root cause..." />
            </label>

            <label className="form-control w-full">
              <div className="label"><span className="label-text font-semibold text-base-content/40 uppercase tracking-wider text-xs">Technical Handling Notes</span></div>
              <textarea className="textarea w-full font-semibold text-sm leading-relaxed bg-base-200/80" rows={5} value={form.last_action} onChange={e => setForm(p => ({ ...p, last_action: e.target.value }))} placeholder="Document resolution steps or field progress update..." />
            </label>

            {user?.role && user.role !== 'technician' && incident?.ncal === 'YELLOW' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 mt-2">
                <label className="form-control w-full">
                  <div className="label"><span className="label-text font-semibold text-base-content/40 uppercase tracking-wider text-xs">Optical RX (INI)</span></div>
                  <input type="text" className="input w-full font-mono font-semibold text-sm bg-base-200/80" value={form.power_before} onChange={e => setForm(p => ({ ...p, power_before: e.target.value }))} placeholder="-00.00 dBm" />
                </label>
                <label className="form-control w-full">
                  <div className="label"><span className="label-text font-semibold text-base-content/40 uppercase tracking-wider text-xs">Optical RX (CUR)</span></div>
                  <input type="text" className="input w-full font-mono font-semibold text-sm bg-base-200/80" value={form.power_after} onChange={e => setForm(p => ({ ...p, power_after: e.target.value }))} placeholder="-00.00 dBm" />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Compact Info & Handling History */}
        <div className="flex flex-col gap-6">
          
          {/* Compact Info Summary */}
          <div className="flex flex-col gap-6 p-6 bg-base-200/50 rounded-2xl">
            <div className="flex flex-col gap-2">
                 <div className="text-sm font-semibold tracking-tight leading-snug text-base-content">
                 {['ORANGE', 'RED', 'BLACK'].includes(iData.ncal) ? (iData.odp_bts || iData.site_name_manual || '—') : (iData.site_name_manual || iData.company_name || '—')}
               </div>
            </div>

            <div className="flex flex-col gap-3">
               <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider leading-none">SLA Progress</span>
               <div className="flex flex-col gap-2.5">
                 <div className="flex items-center justify-between">
                    <LevelBadge level={calculateIncidentLevel(iData.start_time)} targetHours={getSLATarget(iData.ncal) / 3600} />
                    <NcalBadge value={iData.ncal} />
                 </div>
                 
                 {(() => {
                    const elapsed = (new Date() - new Date(iData.start_time)) / 1000;
                    const target = getSLATarget(iData.ncal);
                    const pct = Math.min(100, Math.max(5, (elapsed / target) * 100));
                    const isDanger = pct > 80;
                    return (
                      <div className="flex flex-col gap-2 mt-1">
                        <div className="w-full h-1.5 bg-base-content/5 rounded-full overflow-hidden">
                           <div className={`h-full transition-all duration-1000 ${isDanger ? 'bg-error shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider">
                           <span className={isDanger ? 'text-error animate-pulse' : 'text-primary'}>{Math.round(pct)}% Used</span>
                           <span className="opacity-40">{Math.round(target / 3600)}h Target</span>
                        </div>
                      </div>
                    );
                 })()}
               </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-4">
                <div className="flex items-center justify-between">
                   <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Nett Duration</span>
                   <StatusPill status={iData.status} />
                </div>
                <div className="text-2xl font-bold font-mono tracking-tighter text-primary">
                  <LiveTimer 
                    startIso={iData.start_time} 
                    pausedSec={iData.total_pause_duration_seconds} 
                    paused={iData.status === 'pending'} 
                    target={getSLATarget(iData.ncal)}
                  />
                </div>
            </div>

            <div className="flex flex-col gap-2 pt-4">
               <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Reported Problem</span>
               <div className="text-sm font-medium text-base-content/80 leading-relaxed italic">
                 "{iData.initial_problem || 'No description provided'}"
               </div>
            </div>
          </div>

          {/* Activity Logs */}
          <div className="flex flex-col gap-8 mt-2">
            <div className="flex flex-col gap-4">
               <h3 className="text-xs font-semibold uppercase tracking-wider text-primary/80 mb-1">Handling History</h3>
               <div className="max-h-[300px] overflow-y-auto custom-scrollbar-slim rounded-xl bg-base-200/20">
                 <UnifiedTimeline 
                   timeline={processTimeline(iData)} 
                   filterType="technical" 
                   isCompact={true}
                 />
               </div>
            </div>

            <div className="flex flex-col gap-4">
               <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-1">System Activity Log</h3>
               <div className="max-h-[200px] overflow-y-auto custom-scrollbar-slim rounded-xl bg-base-200/20">
                 <UnifiedTimeline 
                   timeline={processTimeline(iData)} 
                   filterType="system" 
                   isCompact={true}
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
  const [rootCause, setRootCause] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedParent, setSelectedParent] = useState('');
  const [classificationId, setClassificationId] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!open || !incident) return;
    
    // Reset states
    setRootCause('');
    setActionTaken('');
    setHistory([]);
    setClassificationId('');
    setSelectedParent('');
    setLoadingHistory(true);

    // Fetch classifications
    api.getClassifications().then(c => {
      setClasses(c);
      // If incident has classification already, set parents
      if (incident.classification_id) {
        const cl = c.find(x => x.id === incident.classification_id);
        if (cl) setSelectedParent(cl.klasifikasi);
      }
    }).catch(e => console.error('Error fetching classifications:', e));

    // Fetch incident details & history
    api.getIncident(incident.id).then(full => {
      // Set initial values from latest data
      setRootCause(full.root_cause || '');
      setActionTaken(full.last_action || '');
      if (full.classification_id) {
        setClassificationId(full.classification_id);
      }
      
      // Process history logs
      const logs = full.audit_logs || [];
      const updates = logs.filter(l => l.action === 'UPDATE' && l.details);
      setHistory(updates);
    }).catch(e => console.error('Error fetching incident history:', e)).finally(() => setLoadingHistory(false));

  }, [open, incident?.id]); // Depend on open and incident.id

  const selectFromHistory = (item) => {
    // Details pattern: "Penyebab: ... | Action Terakhir: ..."
    const parts = (item.details || '').split(' | ');
    let cause = '';
    let action = '';
    parts.forEach(p => {
      if (p.startsWith('Cause:') || p.startsWith('Penyebab:')) {
        cause = p.replace('Cause:', '').replace('Penyebab:', '').trim();
      }
      if (p.startsWith('Last Action:') || p.startsWith('Action Terakhir:')) {
        action = p.replace('Last Action:', '').replace('Action Terakhir:', '').trim();
      }
    });
    if (cause) setRootCause(cause);
    if (action) setActionTaken(action);
    const classIdPart = parts.find(p => p.startsWith('Classification ID:'));
    if (classIdPart) {
      const cid = classIdPart.replace('Klasifikasi ID:', '').trim();
      setClassificationId(cid);
      // Also find and set parent for the select dropdown
      const cl = classes.find(x => x.id == cid);
      if (cl) setSelectedParent(cl.klasifikasi);
    }
    addToast('Data selected from history', 'success');
  };

  const uniqueParents = [...new Set(classes.map(c => c.klasifikasi))];

  const handleClose = async () => {
    try {
      if (!classificationId) {
        addToast('Please select a classification first', 'warning');
        return;
      }
      if (!actionTaken) {
        addToast('Please select a handling action first', 'warning');
        return;
      }
      await api.closeIncident(incident.id, { 
        waktu_online, 
        root_cause: rootCause, 
        last_action: actionTaken,
        classification_id: classificationId
      });
      addToast('Incident successfully closed', 'success');
      onClosed(); onClose();
    } catch (e) { addToast(e.message, 'error'); }
  };
  
  if (!incident) return null;
  return (
    <Modal open={open} onClose={onClose} title="Close Incident" size="lg"
      footer={
        <>
          <button className="btn btn-ghost font-semibold uppercase tracking-wider text-xs" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger font-semibold uppercase tracking-wider text-xs" onClick={handleClose}><XIcon size={14} /> Close Incident</button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="p-5 bg-base-200/50 rounded-lg flex flex-col gap-4">
          <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Active Case</span>
                <span className="text-sm font-semibold font-mono text-primary">{incident.case_no}</span>
             </div>
             <NcalBadge value={incident.ncal} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Infrastructure</span>
            <span className="text-sm font-semibold text-base-content/80 tracking-tight">{incident.site_name_manual || incident.company_name || '—'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Reported Problem</span>
            <span className="text-sm font-medium text-base-content/80 leading-relaxed italic">"{incident.initial_problem || '—'}"</span>
          </div>
          {incident.recurring_count > 0 && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-error/10 text-error text-xs font-semibold uppercase tracking-wider">
              <AlertTriangle size={14} /> 
              Recurring Issue ({incident.recurring_count}X in 24h)
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="form-control w-full">
            <div className="label"><span className="label-text font-semibold text-base-content/40 uppercase tracking-wider text-xs">Root Category *</span></div>
            <select className="select w-full font-semibold text-sm bg-base-200/80" value={selectedParent} onChange={e => { setSelectedParent(e.target.value); setClassificationId(''); }}>
              <option value="">— Select Category —</option>
              {uniqueParents.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="form-control w-full">
            <div className="label"><span className="label-text font-semibold text-base-content/40 uppercase tracking-wider text-xs">Sub-Classification *</span></div>
            <select className="select w-full font-semibold text-sm bg-base-200/80" value={classificationId} onChange={e => setClassificationId(e.target.value)} disabled={!selectedParent}>
              <option value="">— Select Detail —</option>
              {classes.filter(c => c.klasifikasi === selectedParent).map(c => <option key={c.id} value={c.id}>{c.sub_klasifikasi}</option>)}
            </select>
          </label>
        </div>

        <SectionCard title="Update & Handling History" className="bg-base-200/50">
          <div className="overflow-x-auto -mx-6 -my-6">
            <table className="table table-xs border-separate border-spacing-0 w-full">
              <thead>
                <tr className="bg-base-200/50">
                  <th className="text-center py-3 text-xs font-medium uppercase tracking-wider text-base-content/40">#</th>
                  <th className="text-left py-3 text-xs font-medium uppercase tracking-wider text-base-content/40">Timestamp</th>
                  <th className="text-left py-3 text-xs font-medium uppercase tracking-wider text-base-content/40">Root Cause</th>
                  <th className="text-left py-3 text-xs font-medium uppercase tracking-wider text-base-content/40">Action</th>
                  <th className="text-center py-3 text-xs font-medium uppercase tracking-wider text-base-content/40">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-xs font-semibold uppercase tracking-wider text-base-content/20">No update history available</td></tr>
                ) : [...history].reverse().map((item, idx) => {
                  const parts = (item.details || '').split(' | ');
                  let cause = '-';
                  let action = '-';
                  parts.forEach(p => {
                    if (p.startsWith('Cause:') || p.startsWith('Penyebab:')) {
                      cause = p.replace('Cause:', '').replace('Penyebab:', '').trim();
                    }
                    if (p.startsWith('Last Action:') || p.startsWith('Action Terakhir:')) {
                      action = p.replace('Last Action:', '').replace('Action Terakhir:', '').trim();
                    }
                  });
                  const isSelected = rootCause === cause && actionTaken === action;
                  return (
                    <tr key={item.id} className={`hover:bg-base-300 transition-all cursor-pointer group ${isSelected ? 'bg-primary/10' : ''}`} onClick={() => selectFromHistory(item)}>
                      <td className="text-center font-mono font-semibold text-sm text-base-content/20">{idx + 1}</td>
                      <td className="text-left font-mono text-sm font-medium text-base-content/40 whitespace-nowrap">{formatDateTime(item.timestamp)}</td>
                      <td className="text-left font-semibold text-sm text-base-content/70 leading-snug line-clamp-1">{cause}</td>
                      <td className="text-left font-semibold text-sm text-base-content/70 leading-snug line-clamp-1">{action}</td>
                      <td className="text-center">
                        <div className={`w-2 h-2 rounded-full mx-auto ${isSelected ? 'bg-primary shadow-sm shadow-primary/40' : 'bg-base-content/10 group-hover:bg-base-content/20'}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>


        <label className="form-control w-full mt-4">
          <div className="label"><span className="label-text font-bold text-base-content/80">Waktu Up (Restore Time) *</span></div>
          <input type="datetime-local" className="input w-full bg-base-200/80" value={waktu_online} onChange={e => setWaktuOnline(e.target.value)} required />
        </label>
        <div className="info-banner info-banner-warning mt-4">
          ⚠ The system will automatically calculate the downtime duration based on the Start time and this Up time.
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
  const { addToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try { const data = await api.getIncidents(); setIncidents(data); }
    catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { 
    load();
    const t = setInterval(() => { load(); }, 10000); 
    return () => clearInterval(t); 
  }, [load]);

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
    try { await api.startAction(id); addToast('Action started!', 'success'); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };
  const handlePause = async (inc, reason) => {
    try { await api.pauseIncident(inc.id, { reason }); addToast('Incident paused', 'warning'); setPauseModal(null); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };
  const handleResume = async (id) => {
    try { await api.resumeIncident(id); addToast('Incident resumed', 'success'); load(); }
    catch (e) { addToast(e.message, 'error'); }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-base-content uppercase">Active Troubles</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-base-content/40 leading-relaxed">
            Monitoring <span className="text-primary">{incidents.length}</span> live incidents
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user?.role !== 'technician' && (
            <button className="btn btn-primary btn-sm px-6 font-semibold uppercase tracking-wider text-xs shadow-lg shadow-primary/20" onClick={() => navigate('/incidents/create')}>
              <Plus size={16} /> Create Incident
            </button>
          )}
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm overflow-hidden">
        {incidents.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle size={48} className="opacity-20" />}
            title="No active incidents"
            desc="All networks are monitoring as normal."
            action={['admin', 'noc'].includes(user?.role) && <button className="btn btn-primary" onClick={() => navigate('/incidents/create')}><Plus size={16} /> Create New Incident</button>}
          />
        ) : (
          <div className="overflow-x-auto max-h-[70vh] custom-scrollbar border-t border-base-content/5">
            <table className="table table-sm table-pin-rows table-stacked w-full">
              <thead>
                <tr className="shadow-[0_1px_0_rgba(var(--bc),0.05)]">
                  <th className="bg-base-100/80 backdrop-blur-xl text-center min-w-[100px] uppercase tracking-wider text-xs text-base-content/50">NCAL</th>
                  <th className="bg-base-100/80 backdrop-blur-xl text-left min-w-[220px] uppercase tracking-wider text-xs text-base-content/50">Incident</th>
                  <th className="bg-base-100/80 backdrop-blur-xl text-center min-w-[80px] uppercase tracking-wider text-xs text-base-content/50">Lv</th>
                  <th className="bg-base-100/80 backdrop-blur-xl text-left min-w-[280px] uppercase tracking-wider text-xs text-base-content/50">Infrastructure</th>
                  <th className="bg-base-100/80 backdrop-blur-xl text-left min-w-[320px] uppercase tracking-wider text-xs text-base-content/50">Current Logs</th>
                  <th className="bg-base-100/80 backdrop-blur-xl text-center min-w-[120px] uppercase tracking-wider text-xs text-base-content/50">Prio</th>
                  <th className="bg-base-100/80 backdrop-blur-xl text-center min-w-[180px] whitespace-nowrap uppercase tracking-wider text-xs text-base-content/50">Downtime</th>
                  <th className="bg-base-100/80 backdrop-blur-xl text-right min-w-[150px] pr-4 uppercase tracking-wider text-xs text-base-content/50">Action</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(inc => {
                  const actions = [];
                  if (inc.status === 'open') {
                    actions.push({ label: 'Start', icon: Play, onClick: () => handleStart(inc.id), className: 'text-success hover:bg-success/20' });
                  }
                  if (inc.status === 'progress' && ['admin', 'noc'].includes(user?.role)) {
                    actions.push({ label: 'Pause', icon: Pause, onClick: () => setPauseModal(inc), className: 'text-warning hover:bg-warning/20' });
                  }
                  if (inc.status === 'pending' && ['admin', 'noc'].includes(user?.role)) {
                    actions.push({ label: 'Resume', icon: Play, onClick: () => handleResume(inc.id), className: 'text-success hover:bg-success/20' });
                  }
                  actions.push({ label: 'Update', icon: Edit2, onClick: () => setUpdateModal(inc), className: 'text-primary hover:bg-primary/20' });
                  if (['admin', 'noc'].includes(user?.role)) {
                    actions.push({ label: 'Close', icon: Square, onClick: () => setCloseModal(inc), className: 'text-error hover:bg-error/20' });
                  }

                  return (
                    <tr key={inc.id} className="hover:bg-base-200/50 transition-colors duration-300 group border-b border-base-content/5">
                      <td className="text-center md:py-3" data-label="NCAL">
                        <NcalBadge value={inc.ncal} />
                      </td>
                      <td className="text-left md:py-3" data-label="Incident">
                        <div className="flex flex-col gap-1">
                          <button 
                            className="text-sm font-semibold font-mono tracking-tighter text-primary hover:underline text-left leading-none" 
                            onClick={() => navigate(`/incidents/${inc.id}`)}
                          >
                            {inc.case_no}
                          </button>
                          <div className="flex items-center gap-2">
                            <StatusPill status={inc.status} />
                            {inc.recurring_count > 0 && (
                              <div className="tooltip tooltip-error tooltip-right" data-tip={`Recurring ${inc.recurring_count + 1}X`}>
                                <div className="p-1 rounded-md bg-error/10 text-error"><AlertTriangle size={12} strokeWidth={2.5} /></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center md:py-3" data-label="Lv">
                        <LevelBadge level={calculateIncidentLevel(inc.start_time)} targetHours={getSLATarget(inc.ncal) / 3600} />
                      </td>
                      <td className="text-left md:py-3" data-label="Infrastructure">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold tracking-tight text-base-content/90 leading-snug">
                            {['ORANGE', 'RED', 'BLACK'].includes(inc.ncal) ? (inc.odp_bts || inc.site_name_manual || '—') : (inc.site_name_manual || inc.company_name || '—')}
                          </span>
                          <span className="text-xs font-mono font-semibold text-base-content/40 uppercase tracking-wide">
                            {inc.odp_bts || inc.service_id || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="text-left md:py-3" data-label="Logs">
                        <div className="flex flex-col gap-1.5 max-w-xs md:max-w-md">
                          <span className="text-sm font-normal text-base-content/70 leading-relaxed line-clamp-1">{inc.initial_problem || '—'}</span>
                          {inc.last_action && (
                            <div className="text-xs flex items-center gap-1 font-normal tracking-tight text-base-content/50">
                              <Activity size={10} className="text-primary/60" /> <span className="line-clamp-1">{inc.last_action}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="text-center md:py-3" data-label="Prio">
                        {inc.level_support ? (
                          <span className="badge badge-sm badge-soft border-none rounded-md font-mono font-bold opacity-70">P{inc.level_support}</span>
                        ) : <span className="opacity-20">—</span>}
                      </td>
                      <td className="text-center md:py-3" data-label="Downtime">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm font-semibold font-mono tracking-tighter text-primary leading-none">
                            <LiveTimer 
                              startIso={inc.start_time} 
                              pausedSec={inc.total_pause_duration_seconds} 
                              paused={inc.status === 'pending'} 
                              target={getSLATarget(inc.ncal)}
                            />
                          </div>
                          <div className="text-xs font-mono font-semibold text-base-content/30 uppercase tracking-wider leading-none">
                            SINCE {formatDateTime(inc.start_time)}
                          </div>
                        </div>
                      </td>
                      <td className="text-right md:py-3" data-label="Actions">
                        <div className="flex items-center justify-end gap-1.5 md:opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-95 group-hover:scale-100">
                          {actions.map(a => (
                            <div key={a.label} className="tooltip tooltip-top" data-tip={a.label}>
                              <button 
                                className={`btn btn-ghost btn-circle btn-sm shadow-sm opacity-80 hover:opacity-100 ${a.className}`} 
                                onClick={a.onClick}
                              >
                                <a.icon size={15} />
                              </button>
                            </div>
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

      <PauseModal open={!!pauseModal} onClose={() => setPauseModal(null)} onConfirm={(r) => handlePause(pauseModal, r)} />
      <UpdateModal open={!!updateModal} onClose={() => setUpdateModal(null)} incident={updateModal} onSaved={load} />
      <CloseModal open={!!closeModal} onClose={() => setCloseModal(null)} incident={closeModal} onClosed={load} />
    </div>
  );
}
