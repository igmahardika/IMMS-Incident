import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api, formatDateTime, processTimeline, formatDuration, calculateIncidentLevel, getSLATarget } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { NcalBadge, StatusPill, LiveTimer, PageSpinner, Modal, EmptyState, UnifiedTimeline, DurationBadge, Spinner, SectionCard, LevelBadge, Button } from '../components/ui/index.jsx';
import { DataTable } from '../components/tables/DataTable.jsx';
import { Play, Pause, Square, Edit2, Plus, AlertTriangle, Activity, X as XIcon, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils.js';

function PauseModal({ open, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Pause Incident"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="warning" size="sm" onClick={() => { onConfirm(reason); setReason(''); }}>Confirm Pause</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest ml-1">Reason for Halt *</label>
          <textarea 
            className="flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px]" 
            placeholder="e.g., Awaiting materials, weather conditions, vendor coordination..." 
            value={reason} 
            onChange={e => setReason(e.target.value)} 
            rows={3} 
          />
        </div>
        <div className="p-4 bg-warning/10 rounded-xl text-sm font-medium text-warning leading-relaxed border border-warning/20">
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
  const [saving, setSaving] = useState(false);

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
  }, [open, incident, user?.role]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateIncident(incident.id, form);
      addToast('Incident updated successfully', 'success');
      onSaved(); onClose();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  if (!incident) return null;
  const iData = incident._fullData || incident;
  
  return (
    <Modal open={open} onClose={onClose} title={`Update Incident — ${incident.case_no}`} size="xl"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" className="px-8 shadow-lg shadow-primary/20" onClick={handleSave} isLoading={saving}>Save Changes</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column: Update Form */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Active Resolution Logs</h3>
            <p className="text-sm font-semibold text-foreground/65 leading-relaxed italic">Document the latest technical progress and root cause findings.</p>
          </div>

          <div className="flex flex-col gap-6 p-6 bg-foreground/[0.03] rounded-2xl border border-foreground/5">
            {user?.role && user.role !== 'technician' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest ml-1">Field Technician</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                    value={form.technician_id} 
                    onChange={e => setForm(p => ({ ...p, technician_id: e.target.value }))}
                  >
                    <option value="">— Unassigned —</option>
                    {users.filter(u => ['technician', 'noc', 'admin'].includes(u.role)).map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest ml-1">Root Cause Update</label>
              <input 
                type="text" 
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                value={form.root_cause} 
                onChange={e => setForm(p => ({ ...p, root_cause: e.target.value }))} 
                placeholder="Brief summary of root cause..." 
              />
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest ml-1">Technical Handling Notes</label>
              <textarea 
                className="flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[120px]" 
                rows={5} 
                value={form.last_action} 
                onChange={e => setForm(p => ({ ...p, last_action: e.target.value }))} 
                placeholder="Document resolution steps or field progress update..." 
              />
            </div>

            {user?.role && user.role !== 'technician' && incident?.ncal === 'YELLOW' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 mt-2">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest ml-1">Optical RX (INI)</label>
                  <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-mono font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={form.power_before} onChange={e => setForm(p => ({ ...p, power_before: e.target.value }))} placeholder="-00.00 dBm" />
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest ml-1">Optical RX (CUR)</label>
                  <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-mono font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={form.power_after} onChange={e => setForm(p => ({ ...p, power_after: e.target.value }))} placeholder="-00.00 dBm" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Compact Info & Handling History */}
        <div className="flex flex-col gap-6">
          {/* Compact Info Summary */}
          <div className="flex flex-col gap-6 p-6 bg-foreground/[0.03] border border-foreground/5 rounded-2xl">
            <div className="flex flex-col gap-2">
                 <div className="text-sm font-semibold tracking-tight leading-snug text-foreground">
                 {['ORANGE', 'RED', 'BLACK'].includes(iData.ncal) ? (iData.odp_bts || iData.site_name_manual || '—') : (iData.site_name_manual || iData.company_name || '—')}
               </div>
            </div>

            <div className="flex flex-col gap-3">
               <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest leading-none">SLA Progress</span>
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
                        <div className="w-full h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                           <div className={`h-full transition-all duration-1000 ${isDanger ? 'bg-error shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-widest">
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
                   <span className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest">Nett Duration</span>
                   <StatusPill status={iData.status} />
                </div>
                <div className="text-2xl font-black font-mono tracking-tighter text-primary">
                  <LiveTimer 
                    startIso={iData.start_time} 
                    pausedSec={iData.total_pause_duration_seconds} 
                    paused={iData.status === 'pending'} 
                    target={getSLATarget(iData.ncal)}
                  />
                </div>
            </div>

            <div className="flex flex-col gap-2 pt-4">
               <span className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest">Reported Problem</span>
               <div className="text-[11px] font-medium text-foreground/80 leading-relaxed italic border-l-2 border-primary/30 pl-3 py-1">
                 "{iData.initial_problem || 'No description provided'}"
               </div>
            </div>
          </div>

          {/* Activity Logs */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
               <h3 className="text-[10px] font-semibold uppercase tracking-widest text-primary/80">Handling History</h3>
               <div className="max-h-[250px] overflow-y-auto custom-scrollbar rounded-xl bg-foreground/[0.02] border border-foreground/5 p-2">
                 <UnifiedTimeline timeline={processTimeline(iData)} filterType="technical" isCompact={true} />
               </div>
            </div>

            <div className="flex flex-col gap-3">
               <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">System Activity Log</h3>
               <div className="max-h-[150px] overflow-y-auto custom-scrollbar rounded-xl bg-foreground/[0.02] border border-foreground/5 p-2">
                 <UnifiedTimeline timeline={processTimeline(iData)} filterType="system" isCompact={true} />
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !incident) return;
    
    setRootCause('');
    setActionTaken('');
    setHistory([]);
    setClassificationId('');
    setSelectedParent('');
    setLoadingHistory(true);

    api.getClassifications().then(c => {
      setClasses(c);
      if (incident.classification_id) {
        const cl = c.find(x => x.id === incident.classification_id);
        if (cl) setSelectedParent(cl.klasifikasi);
      }
    }).catch(e => console.error('Error fetching classifications:', e));

    api.getIncident(incident.id).then(full => {
      setRootCause(full.root_cause || '');
      setActionTaken(full.last_action || '');
      if (full.classification_id) {
        setClassificationId(full.classification_id);
      }
      const logs = full.audit_logs || [];
      const updates = logs.filter(l => l.action === 'UPDATE' && l.details);
      setHistory(updates);
    }).catch(e => console.error('Error fetching incident history:', e)).finally(() => setLoadingHistory(false));

  }, [open, incident?.id]);

  const selectFromHistory = (item) => {
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
      const cl = classes.find(x => x.id == cid);
      if (cl) setSelectedParent(cl.klasifikasi);
    }
  };

  const uniqueParents = [...new Set(classes.map(c => c.klasifikasi))];

  const handleClose = async () => {
    try {
      if (!classificationId) { addToast('Please select a classification first', 'warning'); return; }
      if (!actionTaken) { addToast('Please select a handling action first', 'warning'); return; }
      
      setSaving(true);
      await api.closeIncident(incident.id, { 
        waktu_online, 
        root_cause: rootCause, 
        last_action: actionTaken,
        classification_id: classificationId
      });
      addToast('Incident successfully closed', 'success');
      onClosed(); onClose();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setSaving(false); }
  };
  
  if (!incident) return null;
  return (
    <Modal open={open} onClose={onClose} title="Close Incident" size="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="error" size="sm" onClick={handleClose} isLoading={saving} className="px-6"><XIcon size={14} className="mr-2" /> Close Incident</Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="p-5 bg-foreground/[0.02] border border-foreground/5 rounded-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Active Case</span>
                <span className="text-sm font-bold font-mono text-primary tracking-tight">{incident.case_no}</span>
             </div>
             <NcalBadge value={incident.ncal} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Infrastructure</span>
            <span className="text-sm font-semibold text-foreground/80 tracking-tight">{incident.site_name_manual || incident.company_name || '—'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest ml-1">Root Category *</label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={selectedParent} onChange={e => { setSelectedParent(e.target.value); setClassificationId(''); }}>
              <option value="">— Select Category —</option>
              {uniqueParents.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest ml-1">Sub-Classification *</label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={classificationId} onChange={e => setClassificationId(e.target.value)} disabled={!selectedParent}>
              <option value="">— Select Detail —</option>
              {classes.filter(c => c.klasifikasi === selectedParent).map(c => <option key={c.id} value={c.id}>{c.sub_klasifikasi}</option>)}
            </select>
          </div>
        </div>

        <SectionCard title="Update & Handling History" padding={false}>
          <div className="overflow-x-auto custom-scrollbar w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-foreground/[0.02] border-y border-foreground/5">
                  <th className="text-center py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-foreground/40 w-[10%]">#</th>
                  <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-foreground/40 w-[20%]">Time</th>
                  <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-foreground/40 w-[35%]">Cause</th>
                  <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-foreground/40 w-[35%]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {history.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-[10px] font-bold uppercase tracking-widest text-foreground/30">No update history available</td></tr>
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
                    <tr key={item.id} className={cn("transition-all cursor-pointer group", isSelected ? 'bg-primary/5' : 'hover:bg-foreground/[0.02]')} onClick={() => selectFromHistory(item)}>
                      <td className="text-center py-2 px-3 font-mono font-bold text-[10px] text-foreground/40">{idx + 1}</td>
                      <td className="text-left py-2 px-3 font-mono text-[10px] font-medium text-foreground/50 whitespace-nowrap">{formatDateTime(item.timestamp).split(',')[1]}</td>
                      <td className="text-left py-2 px-3 font-semibold text-[10px] text-foreground/80 leading-snug">{cause}</td>
                      <td className="text-left py-2 px-3 font-semibold text-[10px] text-foreground/80 leading-snug">{action}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>


        <div className="flex flex-col gap-1.5 w-full mt-2">
          <label className="text-[10px] font-bold text-foreground/80 uppercase tracking-widest ml-1">Waktu Up (Restore Time) *</label>
          <input type="datetime-local" className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={waktu_online} onChange={e => setWaktuOnline(e.target.value)} required />
        </div>
        <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-[11px] font-medium text-warning mt-2 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          The system will automatically calculate the downtime duration based on the Start time and this Up time.
        </div>
      </div>
    </Modal>
  );
}

export default function CurrentTroublePage() {
  const { data: incidents = [], isLoading: loading, refetch: load } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const res = await api.getIncidents();
      return res;
    }
  });

  const [alertedIds, setAlertedIds] = useState(new Set());
  const [highlightedIds, setHighlightedIds] = useState(new Set());
  const prevDataRef = useRef([]);

  const [pauseModal, setPauseModal] = useState(null);
  const [updateModal, setUpdateModal] = useState(null);
  const [closeModal, setCloseModal] = useState(null);
  const { addToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Detect changes for highlighting
  useEffect(() => {
    if (incidents.length > 0 && prevDataRef.current.length > 0) {
      const changed = incidents.filter(inc => {
        const prev = prevDataRef.current.find(p => p.id === inc.id);
        if (!prev) return true; // New record
        return prev.status !== inc.status || prev.last_action !== inc.last_action; // Status or log changed
      });
      
      if (changed.length > 0) {
        const ids = new Set(changed.map(c => c.id));
        setHighlightedIds(prev => new Set([...prev, ...ids]));
        setTimeout(() => {
          setHighlightedIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => next.delete(id));
            return next;
          });
        }, 5000); // 5 seconds highlight for live updates
      }
    }
    prevDataRef.current = incidents;
  }, [incidents]);

  // SLA Breach Detection
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

  const columns = useMemo(() => [
    {
      accessorKey: 'ncal',
      header: 'NCAL',
      cell: ({ row }) => <NcalBadge value={row.original.ncal} />,
      size: 70,
      meta: { className: 'whitespace-nowrap px-2' },
    },
    {
      accessorKey: 'case_no',
      header: 'Incident',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 items-start">
          <button 
            className="text-[11px] font-bold font-mono tracking-tight text-primary hover:underline leading-none" 
            onClick={() => navigate(`/incidents/${row.original.id}`)}
          >
            {row.original.case_no}
          </button>
          <div className="flex items-center gap-1.5 mt-0.5">
            <StatusPill status={row.original.status} />
            {row.original.recurring_count > 0 && (
              <div className="p-0.5 rounded bg-error/10 text-error flex"><AlertTriangle size={10} strokeWidth={2.5} /></div>
            )}
          </div>
        </div>
      ),
      size: 110,
      meta: { className: 'whitespace-nowrap' },
    },
    {
      id: 'level',
      header: 'LV',
      cell: ({ row }) => <LevelBadge level={calculateIncidentLevel(row.original.start_time)} targetHours={getSLATarget(row.original.ncal) / 3600} />,
      size: 45,
      meta: { className: 'text-center px-1' },
    },
    {
      id: 'infrastructure',
      header: 'Infrastructure',
      cell: ({ row }) => {
        const inc = row.original;
        const name = ['ORANGE', 'RED', 'BLACK'].includes(inc.ncal) ? (inc.odp_bts || inc.site_name_manual || '—') : (inc.site_name_manual || inc.company_name || '—');
        return (
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11px] font-bold tracking-tight text-foreground leading-none truncate" title={name}>{name}</span>
            <span className="text-[9px] font-mono font-bold text-foreground/40 uppercase tracking-widest truncate">{inc.odp_bts || inc.service_id || '—'}</span>
          </div>
        );
      },
      size: 200,
      meta: { flexible: true },
    },
    {
      id: 'logs',
      header: 'Current Logs',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[11px] font-medium text-foreground/70 leading-snug line-clamp-1" title={row.original.initial_problem}>{row.original.initial_problem || '—'}</span>
          {row.original.last_action && (
            <div className="text-[9px] flex items-center gap-1 font-semibold text-primary/70 bg-primary/5 rounded px-1.5 py-0.5 w-fit max-w-full">
              <Activity size={10} className="shrink-0" /> <span className="truncate">{row.original.last_action}</span>
            </div>
          )}
        </div>
      ),
      size: 250,
      meta: { flexible: true },
    },
    {
      id: 'downtime',
      header: 'Downtime',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5 justify-center">
            <LiveTimer 
              startIso={row.original.start_time} 
              pausedSec={row.original.total_pause_duration_seconds} 
              paused={row.original.status === 'pending'} 
              target={getSLATarget(row.original.ncal)}
            />
          <div className="text-[9px] font-mono font-bold text-foreground/30 uppercase tracking-widest leading-none whitespace-nowrap">
            {formatDateTime(row.original.start_time).split(',')[1]}
          </div>
        </div>
      ),
      size: 110,
      meta: { className: 'whitespace-nowrap px-2' },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const inc = row.original;
        const actions = [];
        if (inc.status === 'open') actions.push({ label: 'Start', icon: Play, onClick: () => handleStart(inc.id), className: 'text-success hover:bg-success/10' });
        if (inc.status === 'progress' && ['admin', 'noc'].includes(user?.role)) actions.push({ label: 'Pause', icon: Pause, onClick: () => setPauseModal(inc), className: 'text-warning hover:bg-warning/10' });
        if (inc.status === 'pending' && ['admin', 'noc'].includes(user?.role)) actions.push({ label: 'Resume', icon: Play, onClick: () => handleResume(inc.id), className: 'text-success hover:bg-success/10' });
        actions.push({ label: 'Update', icon: Edit2, onClick: () => setUpdateModal(inc), className: 'text-primary hover:bg-primary/10' });
        if (['admin', 'noc'].includes(user?.role)) actions.push({ label: 'Close', icon: Square, onClick: () => setCloseModal(inc), className: 'text-error hover:bg-error/10' });

        return (
          <div className="flex items-center justify-end gap-0.5">
            {actions.map(a => (
               <button key={a.label} className={cn("p-1.5 rounded transition-all active:scale-95", a.className)} onClick={a.onClick} title={a.label}>
                  <a.icon size={13} />
               </button>
            ))}
          </div>
        );
      },
      size: 120,
      meta: { className: 'text-right px-2' },
    }
  ], [user?.role, navigate, highlightedIds]);

  if (loading) return <PageSpinner />;
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-start justify-between gap-4 flex-wrap shrink-0 mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-black tracking-tight text-foreground uppercase">Active Troubles</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 leading-relaxed">
            Monitoring <span className="text-primary">{incidents.length}</span> live incidents
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user?.role !== 'technician' && (
            <Button variant="primary" icon={<Plus size={14} />} onClick={() => navigate('/incidents/create')}>
              Create Incident
            </Button>
          )}
        </div>
      </div>

      <div className="bg-background border border-foreground/5 shadow-sm rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
        {incidents.length === 0 ? (
          <div className="flex-1 overflow-auto">
            <EmptyState
              icon={<CheckCircle size={48} className="text-success" />}
              title="All Clear"
              desc="No active incidents reported. The network is operating normally."
              action={['admin', 'noc'].includes(user?.role) && (
                <Button variant="outline" size="sm" onClick={() => navigate('/incidents/create')} icon={<Plus size={14}/>}>
                  Create Incident Manually
                </Button>
              )}
            />
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={incidents} 
            className="flex-1"
            pageSize={100}
            getRowClassName={(row) => highlightedIds.has(row.id) ? "bg-primary/5 shadow-inner" : ""}
          />
        )}
      </div>

      <PauseModal open={!!pauseModal} onClose={() => setPauseModal(null)} onConfirm={(r) => handlePause(pauseModal, r)} />
      <UpdateModal open={!!updateModal} onClose={() => setUpdateModal(null)} incident={updateModal} onSaved={load} />
      <CloseModal open={!!closeModal} onClose={() => setCloseModal(null)} incident={closeModal} onClosed={load} />
    </div>
  );
}
