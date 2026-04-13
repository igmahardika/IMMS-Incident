import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatDateTime } from '../utils/incidentUtils.js';
import { incidentService } from '../services/incidentService.js';
import { useToast } from '../context/ToastContext.jsx';
import { NcalBadge, Spinner, SectionCard, Button, Input, Select } from '../components/ui/index.jsx';
import { ArrowLeft, Send, Network, Save, Loader2, ChevronRight, MapPin, Globe } from 'lucide-react';
import { cn } from '../lib/utils.js';

const NCAL_OPTIONS = ['BLUE', 'YELLOW', 'ORANGE', 'RED', 'BLACK'];
const LEVEL_OPTIONS = [
  { value: '1', label: 'Level 1' },
  { value: '2', label: 'Level 2' },
  { value: '3', label: 'Level 3' },
  { value: '4', label: 'Level 4' }
];

export default function CreateIncidentPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    case_no: '', 
    start_time: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    customer_id: '', 
    site_name_manual: '', 
    ncal: 'YELLOW',
    odp_bts: '', 
    level_support: '2', 
    sla: '',
    initial_problem: '', 
    indikasi: '', 
    power_before: '', 
    kabel: '', 
    panjang_kabel: '', 
    pic: '', 
    customer_terdampak: '', 
    koordinat: '', 
    address_preview: '',
    distribusi_manual: '',
  });

  const [customers, setCustomers] = useState([]);
  const [distribusi, setDistribusi] = useState([]);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [distSearch, setDistSearch] = useState('');
  const [showDistDropdown, setShowDistDropdown] = useState(false);
  const [distForm, setDistForm] = useState({ selectedItems: [] });
  const [showOdpDropdown, setShowOdpDropdown] = useState(false);
  const [odpSearch, setOdpSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  // Load initial options & Draft
  useEffect(() => { 
    const loadData = async () => {
      try {
        const [custRes, distRes] = await Promise.all([
          api.getCustomers(),
          api.getDistribusi()
        ]);
        setCustomers(custRes);
        setDistribusi(distRes);

        if (isEdit) {
          const inc = await api.getIncident(id);
          if (inc) {
            setForm({
              ...inc,
              start_time: inc.start_time ? new Date(inc.start_time).toISOString().slice(0, 16) : ''
            });
            setSearch(inc.site_name_manual || '');
            if (['ORANGE', 'RED', 'BLACK'].includes(inc.ncal)) {
              setDistForm({ selectedItems: inc.odp_bts ? inc.odp_bts.split(', ') : [] });
            }
          }
        } else {
          // Check for draft
          const draft = localStorage.getItem('imms_incident_draft');
          if (draft) {
             const { form: dForm, dist: dDist, search: dSearch } = JSON.parse(draft);
             setForm(prev => ({ ...prev, ...dForm, start_time: prev.start_time })); // Keep fresh start time
             setDistForm(dDist || { selectedItems: [] });
             setSearch(dSearch || '');
             addToast('Protocol Draft Restored', 'info');
          }
        }
      } catch (e) {
        addToast(e.message, 'error');
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [id, isEdit, addToast]);

  // Save draft
  useEffect(() => {
    if (isEdit || loadingData) return;
    const t = setTimeout(() => {
      localStorage.setItem('imms_incident_draft', JSON.stringify({ form, dist: distForm, search }));
    }, 1000);
    return () => clearTimeout(t);
  }, [form, distForm, search, isEdit, loadingData]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleOutside = (e) => {
      if (!e.target.closest('.custom-dropdown-container')) {
        setShowDropdown(false);
        setShowDistDropdown(false);
        setShowOdpDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.case_no.trim()) return addToast('TICKET_ID required', 'warning');
    if (!form.initial_problem.trim()) return addToast('PROBLEM_DESC required', 'warning');
    
    const isDistribsi = ['ORANGE', 'RED', 'BLACK'].includes(form.ncal);
    if (isDistribsi && form.ncal === 'ORANGE' && distForm.selectedItems.length === 0) {
      return addToast('Assign at least one NODE for ORANGE protocol', 'warning');
    }
    if (!isDistribsi && !form.customer_id) {
      return addToast('Define target NODE for LAN/LASTMILE sequence', 'warning');
    }

    setLoading(true);
    try {
      const payload = { ...form };
      if (isDistribsi) {
        payload.customer_id = null;
        payload.odp_bts = distForm.selectedItems.join(', ');
        payload.site_name_manual = `Segmen ${form.ncal}: ${distForm.selectedItems.join(', ')}`;
      } else if (form.ncal === 'YELLOW') {
        payload.odp_bts = form.odp_bts === 'MANUAL_INPUT' ? form.distribusi_manual : form.odp_bts;
      }

      if (isEdit) {
        await api.updateIncident(id, payload);
        addToast('Incident Record Refined', 'success');
      } else {
        await api.createIncident(payload);
        addToast('Incident Protocol Initialized', 'success');
        localStorage.removeItem('imms_incident_draft');
      }
      navigate(isEdit ? `/incidents/${id}` : '/incidents');
    } catch (e) { 
      addToast(e.message, 'error'); 
    } finally { 
      setLoading(false); 
    }
  };

  const isDistribsi = ['ORANGE', 'RED', 'BLACK'].includes(form.ncal);

  const handleCustomerSelect = (c) => {
    let autoLevel = '2';
    if (c.support_level) {
      const match = String(c.support_level).match(/\d+/);
      if (match) autoLevel = match[0];
    }
    setForm(prev => ({
      ...prev,
      customer_id: c.id,
      site_name_manual: c.brand_site,
      sla: c.grade,
      address_preview: c.address || '',
      level_support: autoLevel
    }));
    setSearch(c.brand_site); 
    setShowDropdown(false); 
  };

  const toggleItem = (item) => {
    setDistForm(p => ({
      ...p,
      selectedItems: p.selectedItems.includes(item) 
        ? p.selectedItems.filter(i => i !== item)
        : [...p.selectedItems, item]
    }));
  };

  const combOptions = incidentService.getCombinedOptions(form.ncal, distribusi);
  
  const yellowDistOptions = [...new Set([
    ...distribusi.filter(d => d.type === 'Fiber Optic').map(d => d.level_4),
    ...distribusi.filter(d => d.type === 'Wireless').map(d => d.level_2)
  ])].filter(Boolean).sort();

  if (loadingData) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/20">Synching Records...</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Dynamic Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap shrink-0 mb-8 px-1">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06] flex items-center justify-center text-foreground/40 hover:text-primary hover:bg-primary/5 hover:border-primary/20 transition-all shadow-sm active:scale-90"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-black tracking-tight uppercase text-foreground">
              {isEdit ? 'Refine Protocol' : 'Initialize Node'}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none italic">
              {isEdit ? `Modifying ticket entity #${form.case_no}` : 'Establish new monitoring sequence'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" onClick={() => navigate(-1)} className="font-black text-[9px] tracking-[0.2em] uppercase h-10 px-6 opacity-60 hover:opacity-100 transition-opacity">
              Abort
           </Button>
           <Button onClick={handleSubmit} isLoading={loading} className="font-black text-[9px] tracking-[0.2em] uppercase h-10 px-8 shadow-lg shadow-primary/20">
              {isEdit ? <Save size={13} strokeWidth={2.5} className="mr-2" /> : <Send size={13} strokeWidth={2.5} className="mr-2" />}
              {isEdit ? 'Commit Changes' : 'Initialize Command'}
           </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pr-2 -mr-2">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start pb-20">
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Node Metadata */}
          <SectionCard title="Command Parameters" className="overflow-visible border border-foreground/[0.08] shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Input 
                label="Ticket Terminal ID *" 
                placeholder="C24XXXX-XXX" 
                value={form.case_no} 
                onChange={e => set('case_no', e.target.value.toUpperCase())} 
                required 
                className="font-mono font-black tracking-tighter text-primary"
              />
              <Input 
                label="Initialize Timestamp *" 
                type="datetime-local" 
                value={form.start_time} 
                onChange={e => set('start_time', e.target.value)} 
                required 
                className="font-mono font-black tracking-tighter opacity-80"
              />
              <div className="flex flex-col gap-2 w-full">
                <label className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground/40 ml-1 italic">Protocol Segment *</label>
                <Select 
                  className="flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-[11px] font-black shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase tracking-widest"
                  value={form.ncal} 
                  onChange={e => {
                    const val = e.target.value;
                    setForm(prev => {
                      const upd = { ...prev, ncal: val };
                      if (['ORANGE', 'RED', 'BLACK'].includes(val)) {
                        upd.customer_id = ''; upd.site_name_manual = ''; upd.sla = '';
                      }
                      return upd;
                    });
                    setSearch('');
                    if (!['ORANGE', 'RED', 'BLACK'].includes(val)) {
                      setDistForm({ selectedItems: [] });
                    }
                  }} 
                  required
                >
                  {NCAL_OPTIONS.map(n => <option key={n} value={n} className="bg-background">{n}</option>)}
                </Select>
              </div>
            </div>
          </SectionCard>

          {/* Infrastructure Context */}
          <SectionCard title="Target Nodes & Topology" className="overflow-visible border border-foreground/[0.08] shadow-sm">
            {!isDistribsi ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col relative gap-2 custom-dropdown-container">
                  <label className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground/40 ml-1 italic">
                    {form.ncal === 'BLUE' ? 'Installation Site *' : 'Target Entity *'}
                  </label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      className="flex h-11 w-full rounded-xl border border-input bg-background/50 pl-4 pr-10 py-2 text-[11px] font-black shadow-sm transition-all placeholder:text-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase tracking-widest"
                      placeholder="IDENTIFY NODE..." 
                      value={search} 
                      onChange={e => { setSearch(e.target.value); setShowDropdown(true); }} 
                      onFocus={() => setShowDropdown(true)} 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none group-focus-within:text-primary group-focus-within:opacity-100 transition-all">
                       <ChevronRight size={16} strokeWidth={3} className="rotate-90" />
                    </div>
                  </div>
                  
                  {showDropdown && (
                    <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-background border border-foreground/[0.08] rounded-2xl shadow-xl max-h-80 overflow-y-auto z-[100] p-2 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
                      {customers.filter(c => 
                        (c.brand_site || '').toLowerCase().includes(search.toLowerCase()) || 
                        (c.company_name || '').toLowerCase().includes(search.toLowerCase())
                      ).map(c => (
                        <button key={c.id} type="button" className="flex flex-col px-4 py-3 hover:bg-primary/[0.03] rounded-xl text-left transition-all active:scale-[0.98] group" onClick={() => handleCustomerSelect(c)}>
                          <span className="font-black text-[12px] tracking-tight text-foreground/80 group-hover:text-primary transition-colors uppercase leading-none">{c.brand_site}</span>
                          <span className="text-[9px] text-foreground/30 font-black uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                             {c.company_name} <div className="w-1 h-1 rounded-full bg-foreground/10" /> GRADE {c.grade}
                          </span>
                        </button>
                      ))}
                      {customers.filter(c => (c.brand_site || '').toLowerCase().includes(search.toLowerCase()) || (c.company_name || '').toLowerCase().includes(search.toLowerCase())).length === 0 && (
                        <div className="py-12 text-center text-[10px] font-black text-foreground/20 uppercase tracking-[0.3em] italic">Zero Records Matched</div>
                      )}
                    </div>
                  )}
                </div>

                {form.ncal !== 'BLUE' && (
                  <div className="flex flex-col relative gap-2 custom-dropdown-container">
                    <label className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground/40 ml-1 italic">
                      {form.ncal === 'YELLOW' ? 'Distribution Node (ODP/BTS) *' : 'Node Sequence'}
                    </label>
                    <div className="flex flex-col gap-3">
                      <button 
                        type="button"
                        className="flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-[11px] font-black shadow-sm items-center justify-between cursor-pointer transition-all hover:bg-foreground/[0.04] focus:ring-2 focus:ring-primary/20 uppercase tracking-widest text-left"
                        onClick={() => setShowOdpDropdown(!showOdpDropdown)}
                      >
                        <span className={cn(!form.odp_bts && "text-foreground/20 italic font-bold tracking-widest")}>{form.odp_bts || 'SELECT SEQUENCE'}</span>
                        <ChevronRight size={16} strokeWidth={3} className={cn("rotate-90 opacity-20 transition-transform", showOdpDropdown && "rotate-[-90deg] text-primary opacity-100")} />
                      </button>
                      
                      {showOdpDropdown && (
                        <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-background border border-foreground/[0.08] rounded-2xl shadow-xl max-h-80 overflow-y-auto z-[100] p-2 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300" onClick={e => e.stopPropagation()}>
                          <div className="p-2 mb-1 sticky top-0 bg-background/80 backdrop-blur-md z-10">
                            <input 
                              type="text" 
                              className="bg-foreground/[0.04] border-none w-full px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] placeholder:text-foreground/20 focus:ring-2 focus:ring-primary/20" 
                              placeholder="FILTER PROTOCOL..." 
                              value={odpSearch} 
                              onChange={e => setOdpSearch(e.target.value)}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            {[
                              ...((form.ncal === 'YELLOW' && yellowDistOptions) || []),
                              ...((!isDistribsi && customers.find(c => c.id === form.customer_id)?.link_coverage?.split('\n').filter(Boolean)) || [])
                            ].filter(o => o.toLowerCase().includes(odpSearch.toLowerCase())).map(o => (
                              <button key={o} type="button" className="px-4 py-3 hover:bg-primary/[0.03] rounded-xl text-left text-[11px] font-black uppercase tracking-widest transition-all hover:text-primary" onClick={() => { set('odp_bts', o); setShowOdpDropdown(false); }}>
                                {o}
                              </button>
                            ))}
                            <button type="button" className="p-4 bg-primary/5 text-primary rounded-xl text-left text-[10px] font-black uppercase tracking-[0.2em] transition-all mt-2 flex items-center justify-between hover:bg-primary/10 shadow-sm border border-primary/10" onClick={() => { set('odp_bts', 'MANUAL_INPUT'); setShowOdpDropdown(false); }}>
                              <span>+ MANUAL OVERRIDE</span>
                              <ChevronRight size={12} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      )}

                      {form.odp_bts === 'MANUAL_INPUT' && (
                        <input 
                          type="text" 
                          className="flex h-11 w-full rounded-xl border border-input bg-foreground/[0.03] px-4 py-2 text-[11px] font-black shadow-inner placeholder:text-foreground/20 animate-in slide-in-from-top-2 duration-300 uppercase tracking-widest focus:ring-2 focus:ring-primary/20"
                          placeholder="INPUT CUSTOM SEQUENCE..." 
                          value={form.distribusi_manual} 
                          onChange={e => set('distribusi_manual', e.target.value.toUpperCase())} 
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col relative gap-2 custom-dropdown-container">
                <label className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground/40 ml-1 italic">
                  Node Grid Selection ({form.ncal} Protocol) *
                </label>
                <div 
                  className={cn(
                    "flex flex-wrap gap-2 items-center p-3 rounded-xl border border-input bg-background/50 min-h-[52px] cursor-pointer transition-all hover:bg-foreground/[0.04] focus:ring-2 focus:ring-primary/20",
                    showDistDropdown && "ring-2 ring-primary/20 bg-background"
                  )} 
                  onClick={() => setShowDistDropdown(!showDistDropdown)}
                >
                  {distForm.selectedItems.length === 0 ? (
                    <span className="text-foreground/20 text-[11px] font-black pl-1 uppercase tracking-[0.2em] italic">IDENTIFY TARGET NODES...</span>
                  ) : distForm.selectedItems.map(item => (
                    <div key={item} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border border-primary/10">
                      {item}
                      <button type="button" onClick={(e) => { e.stopPropagation(); toggleItem(item); }} className="hover:text-foreground p-0.5 leading-none bg-primary/10 rounded-full w-4 h-4 flex items-center justify-center ml-1">✕</button>
                    </div>
                  ))}
                  <div className="ml-auto pr-1 opacity-20"><ChevronRight size={16} strokeWidth={3} className="rotate-90" /></div>
                </div>

                {showDistDropdown && (
                  <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-background border border-foreground/[0.08] rounded-2xl shadow-xl max-h-80 overflow-y-auto z-[100] p-2 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300" onClick={e => e.stopPropagation()}>
                    <div className="p-2 mb-1 sticky top-0 bg-background/80 backdrop-blur-md z-10">
                      <input 
                        type="text" 
                        className="bg-foreground/[0.04] border-none w-full px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] placeholder:text-foreground/20 focus:ring-2 focus:ring-primary/20" 
                        placeholder="SEARCH NODES..." 
                        value={distSearch} 
                        onChange={e => setDistSearch(e.target.value)} 
                        onFocus={e => e.stopPropagation()} 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      {combOptions.filter(o => !distForm.selectedItems.includes(o.value) && o.searchKey.toLowerCase().includes(distSearch.toLowerCase())).map(o => (
                        <button key={o.value} type="button" className="flex items-center justify-between px-4 py-3 hover:bg-primary/[0.03] rounded-xl text-left transition-all active:scale-[0.98] group" onClick={() => toggleItem(o.value)}>
                          <div className="flex flex-col">
                            <span className="font-black text-[11px] tracking-tight text-foreground/80 uppercase group-hover:text-primary transition-colors">{o.label}</span>
                            <span className="text-[8px] text-foreground/20 font-black uppercase tracking-[0.2em] mt-1">{o.value.split(':')[0]}</span>
                          </div>
                          <div className="w-5 h-5 rounded-lg border border-foreground/10 flex items-center justify-center group-hover:border-primary/50 group-hover:bg-primary/10 transition-all">
                            <Plus size={12} strokeWidth={3} className="text-foreground/10 group-hover:text-primary transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Intel Details */}
          <SectionCard title="Technical Analysis & Impact" className="border border-foreground/[0.08] shadow-sm">
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col gap-2">
                  <label className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground/40 ml-1 italic">Problem Description *</label>
                  <textarea 
                    className="flex w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-[11px] font-bold shadow-sm transition-all placeholder:text-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 leading-relaxed resize-none min-h-[120px]" 
                    placeholder="DEFINE TECHNICAL ANOMALY..." 
                    value={form.initial_problem} 
                    onChange={e => set('initial_problem', e.target.value)} 
                    rows={4} 
                    required 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground/40 ml-1 italic">Diagnostic Indications</label>
                  <textarea 
                    className="flex w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-[11px] font-bold shadow-sm transition-all placeholder:text-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 leading-relaxed resize-none text-foreground/60 min-h-[120px]" 
                    placeholder="SIGNAL LOSS, ATTENUATION, FLAPS..." 
                    value={form.indikasi} 
                    onChange={e => set('indikasi', e.target.value)} 
                    rows={4} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                <div className="flex flex-col gap-2">
                  <label className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground/40 ml-1 italic">Service Priority Tier *</label>
                  <div className="flex flex-col gap-3">
                    <Select 
                      className="flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-[11px] font-black shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-30 uppercase tracking-widest" 
                      value={form.level_support} 
                      onChange={e => set('level_support', e.target.value)} 
                      required
                      disabled={!isDistribsi && !!form.customer_id}
                    >
                      {LEVEL_OPTIONS.filter(opt => isDistribsi ? opt.value !== '4' : true).map(opt => (
                        <option key={opt.value} value={opt.value} className="bg-background">{opt.label.toUpperCase()}</option>
                      ))}
                    </Select>
                    {!isDistribsi && form.customer_id && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/[0.03] rounded-lg border border-primary/10 self-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[9px] font-black tracking-[0.2em] text-primary uppercase">Validated via Node Metadata</span>
                      </div>
                    )}
                  </div>
                </div>
                {!isDistribsi && (
                  <Input 
                    label="Command Personnel / PIC" 
                    placeholder="ASSIGN OPERATOR..." 
                    value={form.pic} 
                    onChange={e => set('pic', e.target.value)} 
                    className="font-black uppercase tracking-widest h-11"
                  />
                )}
              </div>

              {isDistribsi && (
                <div className="flex flex-col gap-2">
                  <label className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground/40 ml-1 italic">Entity Impact Scope</label>
                  <textarea 
                    className="flex w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-[11px] font-bold shadow-sm focus-visible:ring-primary/20 leading-relaxed resize-none h-20 placeholder:text-foreground/10" 
                    placeholder="DEFINE DOWNSTREAM IMPACT..." 
                    value={form.customer_terdampak} 
                    onChange={e => set('customer_terdampak', e.target.value)} 
                  />
                </div>
              )}

              {form.ncal === 'YELLOW' && (
                <div className="bg-warning/[0.02] border border-warning/10 rounded-2xl p-6 flex flex-col gap-6 mt-2 shadow-inner border-dashed">
                  <div className="text-[10px] font-black text-warning uppercase tracking-[0.3em] flex items-center gap-3">
                    <Network size={16} strokeWidth={3} className="animate-pulse" /> MAINTENANCE PROTOCOL OVERRIDE
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="font-black text-[10px] uppercase tracking-[0.2em] text-warning/40 ml-1 italic">Static Node Address</label>
                      <div className="bg-background/40 border border-warning/5 rounded-xl p-4 text-[10px] font-bold text-foreground/40 leading-relaxed min-h-[60px] shadow-sm select-none italic">
                        {form.address_preview || 'PROTOCOL_ADDR_UNDEFINED'}
                      </div>
                    </div>
                    <Input 
                      label="Spatial Coordinates (GPS)" 
                      placeholder="LAT, LONG" 
                      value={form.koordinat} 
                      onChange={e => set('koordinat', e.target.value)} 
                      className="bg-background font-mono font-black text-warning tracking-tighter h-11"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input 
                      label="Signal Power (RX)" 
                      placeholder="dBm" 
                      value={form.power_before} 
                      onChange={e => set('power_before', e.target.value)} 
                      className="bg-background font-mono font-black h-11"
                    />
                    <Input 
                      label="Infrastructure Spec" 
                      placeholder="e.g. CORE-FIBER" 
                      value={form.kabel} 
                      onChange={e => set('kabel', e.target.value)} 
                      className="bg-background font-black h-11"
                    />
                    <Input 
                      label="Path Dimension" 
                      placeholder="METERS" 
                      value={form.panjang_kabel} 
                      onChange={e => set('panjang_kabel', e.target.value)} 
                      className="bg-background font-mono font-black h-11"
                    />
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
          
        </div>

        {/* Live Command Preview */}
        <div className="flex flex-col gap-8 sticky top-8">
          <div className="bg-background border border-foreground/[0.08] rounded-3xl overflow-hidden shadow-2xl shadow-primary/5 flex flex-col relative group">
            <div className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-primary via-primary/60 to-primary/40 opacity-80" />
            
            <div className="p-6 flex flex-col gap-8">
               <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/30 italic">Command Receipt</h3>
                  <div className="flex items-center gap-1.5 text-success">
                     <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(var(--color-success),0.5)]" />
                     <span className="text-[9px] font-black tracking-widest uppercase">Live Link</span>
                  </div>
               </div>

               <div className="flex flex-col gap-6">
                 <div className="p-5 bg-foreground/[0.04] border border-foreground/[0.04] rounded-2xl flex flex-col gap-6 shadow-inner">
                    <div className="flex flex-col gap-3">
                      <span className="text-[9px] font-black text-foreground/40 uppercase tracking-[0.25em] flex items-center gap-2">
                        <div className="w-3 h-[1px] bg-foreground/10" /> Impact Logic
                      </span>
                      <div className="flex"><NcalBadge value={form.ncal} /></div>
                    </div>
                    <div className="h-[1px] bg-foreground/[0.04] w-full" />
                    <div className="flex flex-col gap-3">
                      <span className="text-[9px] font-black text-foreground/40 uppercase tracking-[0.25em] flex items-center gap-2">
                        <div className="w-3 h-[1px] bg-foreground/10" /> Infrastructure Node
                      </span>
                      <div className="font-black text-[11px] tracking-tight leading-tight text-foreground/90 uppercase bg-background/50 p-3 rounded-xl border border-foreground/[0.04] min-h-[50px] flex items-center">
                        {isDistribsi 
                          ? (distForm.selectedItems.length > 0 ? distForm.selectedItems.join(', ') : <span className="opacity-10 italic">NODEID_NULL</span>)
                          : (form.site_name_manual || <span className="opacity-10 italic">NODEID_NULL</span>)
                        }
                      </div>
                      {!isDistribsi && form.sla && (
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] bg-primary/5 px-2 py-1 rounded-md border border-primary/10">Priority Grade {form.sla}</span>
                        </div>
                      )}
                    </div>
                 </div>

                 <div className="flex flex-col gap-3 px-1">
                    <span className="text-[9px] font-black text-foreground/40 uppercase tracking-[0.25em] flex items-center gap-2 font-mono">
                      // problem_desc
                    </span>
                    <div className="text-[11px] font-bold leading-relaxed text-foreground/60 italic border-l-2 border-primary/40 pl-4 py-1">
                      {form.initial_problem || <span className="opacity-10 not-italic tracking-tighter">AWAITING_INPUT_SEQUENCE...</span>}
                    </div>
                 </div>

                 <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between p-4 bg-foreground/[0.02] border border-foreground/[0.04] rounded-2xl group transition-all hover:bg-foreground/[0.04]">
                       <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-foreground/20 uppercase tracking-[0.2em]">Spatial Node</span>
                          <span className="text-[10px] font-black text-foreground/60 tracking-tighter uppercase font-mono">{form.koordinat || 'SPATIAL_VOID'}</span>
                       </div>
                       <MapPin size={16} strokeWidth={2.5} className="text-foreground/10 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-foreground/[0.02] border border-foreground/[0.04] rounded-2xl group transition-all hover:bg-foreground/[0.04]">
                       <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-foreground/20 uppercase tracking-[0.2em]">Protocol Hash</span>
                          <div className="text-[10px] font-black text-foreground/60 uppercase font-mono tracking-tighter">
                            #{form.case_no || 'TICKET_NULL'} — {formatDateTime(form.start_time).split(' ')[1]}
                          </div>
                       </div>
                       <Network size={16} strokeWidth={2.5} className="text-foreground/10 group-hover:text-primary transition-colors" />
                    </div>
                 </div>
               </div>

               <div className="mt-6 pt-6 border-t border-foreground/[0.04] flex flex-col gap-5">
                  <div className="flex items-center justify-between text-[8px] font-black text-foreground/20 uppercase tracking-[0.25em] px-1 font-mono">
                     <span>OPERATOR_SIG</span>
                     <span>VERIFICATION_HASH</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <div className="flex -space-x-3">
                        {[1,2,3].map(i => (
                          <div key={i} className="w-7 h-7 rounded-full bg-foreground/[0.05] border-2 border-background ring-1 ring-foreground/[0.05] group-hover:bg-primary/10 transition-colors" />
                        ))}
                     </div>
                     <div className="px-3 py-1.5 bg-success/[0.03] border border-success/20 rounded-lg flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        <span className="text-[9px] font-black tracking-[0.2em] text-success uppercase">Active Hub</span>
                     </div>
                  </div>
               </div>
            </div>
            
            <div className="p-4 bg-foreground/[0.02] text-center">
               <span className="text-[8px] font-black text-foreground/10 uppercase tracking-[0.4em]">IMMS COMMAND INTERFACE V4.0.1</span>
            </div>
          </div>
        </div>
        </form>
      </div>
    </div>
  );
}
