import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, formatDateTime } from '../utils/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { NcalBadge, Spinner, SectionCard, Button, Input } from '../components/ui/index.jsx';
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
             addToast('Restored draft from your last session', 'info');
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
    if (!form.case_no.trim()) return addToast('Case Number is required', 'warning');
    if (!form.initial_problem.trim()) return addToast('Initial Problem is required', 'warning');
    
    const isDistribsi = ['ORANGE', 'RED', 'BLACK'].includes(form.ncal);
    if (isDistribsi && form.ncal === 'ORANGE' && distForm.selectedItems.length === 0) {
      return addToast('Please select at least one infrastructure for ORANGE segment', 'warning');
    }
    if (!isDistribsi && !form.customer_id) {
      return addToast('Please select a customer for LAN/Lastmile segment', 'warning');
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
        addToast('Incident updated successfully', 'success');
      } else {
        await api.createIncident(payload);
        addToast('Incident created successfully', 'success');
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

  const getCombinedOptions = () => {
    if (form.ncal === 'ORANGE') {
      const odps = [...new Set(distribusi.filter(d => d.type === 'Fiber Optic').map(d => d.level_4))].filter(Boolean);
      const radios = [...new Set(distribusi.filter(d => d.type === 'Wireless').map(d => d.level_2))].filter(Boolean);
      return [
        ...odps.map(o => ({ label: o, searchKey: `ODP ${o}`, value: o })),
        ...radios.map(r => ({ label: r, searchKey: `RADIO ${r}`, value: r }))
      ].sort((a,b) => a.label.localeCompare(b.label));
    }
    if (form.ncal === 'RED') {
      const odcs = [...new Set(distribusi.filter(d => d.type === 'Fiber Optic').map(d => d.level_3))].filter(Boolean);
      const bts = [...new Set(distribusi.filter(d => d.type === 'Wireless').map(d => d.level_1))].filter(Boolean);
      return [
        ...odcs.map(o => ({ label: o, searchKey: `ODC ${o}`, value: o })),
        ...bts.map(b => ({ label: b, searchKey: `BTS ${b}`, value: b }))
      ].sort((a,b) => a.label.localeCompare(b.label));
    }
    if (form.ncal === 'BLACK') {
      const pops = [...new Set(distribusi.filter(d => d.type === 'Fiber Optic').map(d => d.level_1))].filter(Boolean);
      const oscs = [...new Set(distribusi.filter(d => d.type === 'Fiber Optic').map(d => d.level_2))].filter(Boolean);
      return [
        ...pops.map(p => ({ label: p, searchKey: `POP ${p}`, value: p })),
        ...oscs.map(o => ({ label: o, searchKey: `OSC ${o}`, value: o }))
      ].sort((a,b) => a.label.localeCompare(b.label));
    }
    return [];
  };

  const combOptions = getCombinedOptions();
  
  const yellowDistOptions = [...new Set([
    ...distribusi.filter(d => d.type === 'Fiber Optic').map(d => d.level_4),
    ...distribusi.filter(d => d.type === 'Wireless').map(d => d.level_2)
  ])].filter(Boolean).sort();

  if (loadingData) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-primary w-8 h-8" />
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap shrink-0 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="rounded-full w-9 h-9 p-0 bg-foreground/5">
            <ArrowLeft size={16} />
          </Button>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-black tracking-tight uppercase text-foreground/90 leading-tight">
              {isEdit ? 'Edit Record' : 'New Incident'}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">
              {isEdit ? `Modifying ticket #${form.case_no}` : 'Initialize monitoring ticket'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" onClick={() => navigate(-1)} className="font-bold text-[10px] tracking-widest uppercase">
              Cancel
           </Button>
           <Button onClick={handleSubmit} isLoading={loading} icon={isEdit ? <Save size={14} /> : <Send size={14} />} className="font-black text-[10px] tracking-widest uppercase px-6">
              {isEdit ? 'Save Changes' : 'Create Incident'}
           </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pr-2 -mr-2">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pb-12">
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Section 1: Basic Information */}
          <SectionCard title="General Information" className="overflow-visible z-30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input 
                label="Case Number *" 
                placeholder="e.g., C240313-001" 
                value={form.case_no} 
                onChange={e => set('case_no', e.target.value)} 
                required 
                className="font-mono font-bold"
              />
              <Input 
                label="Reported Time *" 
                type="datetime-local" 
                value={form.start_time} 
                onChange={e => set('start_time', e.target.value)} 
                required 
                className="font-mono font-bold"
              />
              <div className="flex flex-col gap-1.5 w-full">
                <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">NCAL Segment *</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-bold shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring uppercase tracking-wider"
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
                  {NCAL_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </SectionCard>

          {/* Section 2: Asset/Infrastructure Selection */}
          <SectionCard title="Asset & Network Configuration" className="overflow-visible z-20">
            {!isDistribsi ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col relative gap-1.5 custom-dropdown-container">
                  <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">
                    {form.ncal === 'BLUE' ? 'Select Site *' : 'Select Customer *'}
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-bold shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Search site or company name..." 
                      value={search} 
                      onChange={e => { setSearch(e.target.value); setShowDropdown(true); }} 
                      onFocus={() => setShowDropdown(true)} 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30">
                       <ChevronRight size={14} className="rotate-90" />
                    </div>
                  </div>
                  
                  {showDropdown && (
                    <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-background/95 border border-border rounded-lg shadow-2xl max-h-80 overflow-y-auto z-[100] p-1.5 flex flex-col gap-0.5 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                      {customers.filter(c => 
                        (c.brand_site || '').toLowerCase().includes(search.toLowerCase()) || 
                        (c.company_name || '').toLowerCase().includes(search.toLowerCase())
                      ).map(c => (
                        <button key={c.id} type="button" className="flex flex-col px-3 py-2.5 hover:bg-foreground/5 rounded-md text-left transition-all active:scale-[0.98] group" onClick={() => handleCustomerSelect(c)}>
                          <span className="font-bold text-[11px] tracking-tight text-foreground group-hover:text-primary transition-colors">{c.brand_site}</span>
                          <span className="text-[9px] text-foreground/40 font-black uppercase tracking-widest mt-0.5">{c.company_name} — SLA {c.grade}</span>
                        </button>
                      ))}
                      {customers.filter(c => (c.brand_site || '').toLowerCase().includes(search.toLowerCase()) || (c.company_name || '').toLowerCase().includes(search.toLowerCase())).length === 0 && (
                        <div className="py-8 text-center text-[10px] font-bold text-foreground/30 uppercase tracking-widest">No results found</div>
                      )}
                    </div>
                  )}
                </div>

                {form.ncal !== 'BLUE' && (
                  <div className="flex flex-col relative gap-1.5 custom-dropdown-container">
                    <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">
                      {form.ncal === 'YELLOW' ? 'Distribution (ODP / BTS) *' : 'Link / ODP'}
                    </label>
                    <div className="flex flex-col gap-2">
                      <div 
                        className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-bold shadow-sm items-center justify-between cursor-pointer transition-all hover:bg-foreground/[0.02]"
                        onClick={() => setShowOdpDropdown(!showOdpDropdown)}
                      >
                        <span className={cn(!form.odp_bts && "text-muted-foreground font-medium")}>{form.odp_bts || '— Select Distribution —'}</span>
                        <ChevronRight size={14} className={cn("rotate-90 opacity-40 transition-transform", showOdpDropdown && "rotate-[-90deg]")} />
                      </div>
                      
                      {showOdpDropdown && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-background/95 border border-border rounded-lg shadow-2xl max-h-80 overflow-y-auto z-[100] p-1.5 flex flex-col gap-0.5 backdrop-blur-md">
                          <input 
                            type="text" 
                            className="bg-foreground/5 border-none w-full px-3 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest placeholder:text-foreground/20 focus:ring-0 mb-1" 
                            placeholder="Filter options..." 
                            value={odpSearch} 
                            onChange={e => setOdpSearch(e.target.value)}
                            onClick={e => e.stopPropagation()} 
                          />
                          {[
                            ...((form.ncal === 'YELLOW' && yellowDistOptions) || []),
                            ...((!isDistribsi && customers.find(c => c.id === form.customer_id)?.link_coverage?.split('\n').filter(Boolean)) || [])
                          ].filter(o => o.toLowerCase().includes(odpSearch.toLowerCase())).map(o => (
                            <button key={o} type="button" className="px-3 py-2.5 hover:bg-foreground/5 rounded-md text-left text-[11px] font-bold uppercase tracking-wider transition-all" onClick={() => { set('odp_bts', o); setShowOdpDropdown(false); }}>
                              {o}
                            </button>
                          ))}
                          <button type="button" className="p-3 bg-primary/5 text-primary rounded-md text-left text-[10px] font-black uppercase tracking-widest transition-all mt-1 flex items-center justify-between hover:bg-primary/10" onClick={() => { set('odp_bts', 'MANUAL_INPUT'); setShowOdpDropdown(false); }}>
                            <span>+ Manual Entry</span>
                            <ChevronRight size={10} className="opacity-60" />
                          </button>
                        </div>
                      )}

                      {form.odp_bts === 'MANUAL_INPUT' && (
                        <input 
                          type="text" 
                          className="flex h-10 w-full rounded-md border border-input bg-foreground/[0.03] px-3 py-2 text-[11px] font-bold shadow-inner placeholder:text-muted-foreground animate-in slide-in-from-top-2 duration-200"
                          placeholder="Type manual ODP/BTS name..." 
                          value={form.distribusi_manual} 
                          onChange={e => set('distribusi_manual', e.target.value)} 
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col relative gap-1.5 custom-dropdown-container">
                <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">
                  Infrastructure Selection ({form.ncal} Segment) *
                </label>
                <div 
                  className={cn(
                    "flex flex-wrap gap-2 items-center p-2 rounded-md border border-input bg-background/50 min-h-[44px] cursor-pointer transition-all hover:bg-foreground/[0.02]",
                    showDistDropdown && "ring-1 ring-ring border-ring"
                  )} 
                  onClick={() => setShowDistDropdown(!showDistDropdown)}
                >
                  {distForm.selectedItems.length === 0 ? (
                    <span className="text-muted-foreground text-[11px] font-medium pl-1 uppercase tracking-widest opacity-60">Search and select infrastructures...</span>
                  ) : distForm.selectedItems.map(item => (
                    <div key={item} className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded text-[10px] font-black uppercase tracking-widest">
                      {item}
                      <button type="button" onClick={(e) => { e.stopPropagation(); toggleItem(item); }} className="hover:text-foreground p-0.5 leading-none">✕</button>
                    </div>
                  ))}
                  <div className="ml-auto pr-1 opacity-20"><ChevronRight size={14} className="rotate-90" /></div>
                </div>

                {showDistDropdown && (
                  <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-background/95 border border-border rounded-lg shadow-2xl max-h-80 overflow-y-auto z-[100] p-1.5 flex flex-col gap-0.5 backdrop-blur-md" onClick={e => e.stopPropagation()}>
                    <input 
                      type="text" 
                      className="bg-foreground/5 border-none w-full px-3 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest placeholder:text-foreground/20 focus:ring-0 mb-1" 
                      placeholder="Filter items..." 
                      value={distSearch} 
                      onChange={e => setDistSearch(e.target.value)} 
                      onFocus={e => e.stopPropagation()} 
                    />
                    <div className="flex flex-col gap-0.5">
                      {combOptions.filter(o => !distForm.selectedItems.includes(o.value) && o.searchKey.toLowerCase().includes(distSearch.toLowerCase())).map(o => (
                        <button key={o.value} type="button" className="flex items-center justify-between px-3 py-2.5 hover:bg-foreground/5 rounded-md text-left transition-all active:scale-[0.98] group" onClick={() => toggleItem(o.value)}>
                          <div className="flex flex-col">
                            <span className="font-bold text-[11px] tracking-tight text-foreground">{o.label}</span>
                            <span className="text-[9px] text-foreground/40 font-black uppercase tracking-widest">{o.value.split(':')[0]}</span>
                          </div>
                          <div className="w-4 h-4 rounded border border-foreground/10 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                            <Plus size={10} className="text-foreground/20 group-hover:text-primary transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Section 3: Technical Details */}
          <SectionCard title="Incident Scope & Details">
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">Initial Problem *</label>
                  <textarea 
                    className="flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-bold shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed resize-none" 
                    placeholder="Describe the detected issue in technical terms..." 
                    value={form.initial_problem} 
                    onChange={e => set('initial_problem', e.target.value)} 
                    rows={4} 
                    required 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">Technical Indications</label>
                  <textarea 
                    className="flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-bold shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed resize-none text-foreground/70" 
                    placeholder="Loss of signal, high attenuation, port flap, etc..." 
                    value={form.indikasi} 
                    onChange={e => set('indikasi', e.target.value)} 
                    rows={4} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">Service Priority *</label>
                  <div className="flex flex-col gap-2">
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-bold shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50" 
                      value={form.level_support} 
                      onChange={e => set('level_support', e.target.value)} 
                      required
                      disabled={!isDistribsi && !!form.customer_id}
                    >
                      {LEVEL_OPTIONS.filter(opt => isDistribsi ? opt.value !== '4' : true).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {!isDistribsi && form.customer_id && (
                      <div className="flex items-center gap-2 px-2 py-1 bg-primary/5 rounded border border-primary/10 self-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[9px] font-black tracking-widest text-primary uppercase">Synced via Customer Record</span>
                      </div>
                    )}
                  </div>
                </div>
                {!isDistribsi && (
                  <Input 
                    label="Assigned Technician / PIC" 
                    placeholder="Enter personnel name or ID..." 
                    value={form.pic} 
                    onChange={e => set('pic', e.target.value)} 
                    className="font-bold"
                  />
                )}
              </div>

              {isDistribsi && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">Impacted Customers</label>
                  <textarea 
                    className="flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-bold shadow-sm focus-visible:ring-ring leading-relaxed resize-none h-16" 
                    placeholder="List downstream sites or companies affected by this event..." 
                    value={form.customer_terdampak} 
                    onChange={e => set('customer_terdampak', e.target.value)} 
                  />
                </div>
              )}

              {form.ncal === 'YELLOW' && (
                <div className="bg-warning/[0.03] border border-warning/10 rounded-xl p-5 flex flex-col gap-5 mt-2 shadow-inner">
                  <div className="text-[10px] font-black text-warning uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                    <Network size={14} className="animate-pulse" /> Vendor Maintenance Order Details
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-[10px] uppercase tracking-widest text-warning/50 ml-1">Original Address (Site)</label>
                      <div className="bg-background/40 border border-border/50 rounded-md p-3 text-[10px] font-bold text-foreground/50 leading-relaxed min-h-[50px] shadow-sm select-none">
                        {form.address_preview || 'No address data available'}
                      </div>
                    </div>
                    <Input 
                      label="Coordinates (GPS Override)" 
                      placeholder="Lat, Long (e.g. -6.1, 106.8)" 
                      value={form.koordinat} 
                      onChange={e => set('koordinat', e.target.value)} 
                      className="bg-background font-mono font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Input 
                      label="RX Power (Before)" 
                      placeholder="-20.5 dBm" 
                      value={form.power_before} 
                      onChange={e => set('power_before', e.target.value)} 
                      className="bg-background font-mono font-bold"
                    />
                    <Input 
                      label="Cable Type" 
                      placeholder="e.g. Dropcore 12c" 
                      value={form.kabel} 
                      onChange={e => set('kabel', e.target.value)} 
                      className="bg-background font-bold"
                    />
                    <Input 
                      label="Total Length" 
                      placeholder="Meters" 
                      value={form.panjang_kabel} 
                      onChange={e => set('panjang_kabel', e.target.value)} 
                      className="bg-background font-mono font-bold"
                    />
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
          
        </div>

        {/* Sidebar / Preview Column */}
        <div className="flex flex-col gap-6 sticky top-6">
          <SectionCard title="Live Ticket Preview" className="bg-background shadow-2xl overflow-hidden border-primary/10">
            <div className="flex flex-col gap-6">
              <div className="p-4 bg-foreground/[0.03] border border-foreground/5 rounded-xl flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em]">Impact Segment</span>
                  <div className="flex"><NcalBadge value={form.ncal} /></div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em]">Infrastructure Scope</span>
                  <div className="font-black text-xs tracking-tight leading-tight text-foreground/90 uppercase">
                    {isDistribsi 
                      ? (distForm.selectedItems.length > 0 ? distForm.selectedItems.join(', ') : <span className="opacity-20">No nodes selected</span>)
                      : (form.site_name_manual || <span className="opacity-20">No asset selected</span>)
                    }
                  </div>
                  {!isDistribsi && form.sla && (
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[9px] font-black text-primary uppercase tracking-[0.1em] bg-primary/10 px-2 py-0.5 rounded border border-primary/20">Grade {form.sla}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 px-1">
                <span className="text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em]">Detected Issue</span>
                <div className="text-[11px] font-bold leading-relaxed text-foreground/80 italic border-l-2 border-primary/20 pl-3">
                  {form.initial_problem || <span className="opacity-20 text-[10px] font-medium not-italic">Awaiting problem description input...</span>}
                </div>
              </div>

              <div className="mt-2 p-4 bg-foreground/[0.02] border border-dashed border-foreground/10 rounded-xl space-y-4">
                <div className="flex items-start gap-3">
                   <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center text-foreground/40 shrink-0">
                      <MapPin size={14} />
                   </div>
                   <div className="flex flex-col gap-0.5 overflow-hidden">
                      <span className="text-[9px] font-black text-foreground/30 uppercase tracking-widest">Geo Context</span>
                      <span className="text-[10px] font-bold truncate text-foreground/60">{form.koordinat || 'No location set'}</span>
                   </div>
                </div>
                <div className="flex items-start gap-3">
                   <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center text-foreground/40 shrink-0">
                      <Globe size={14} />
                   </div>
                   <div className="flex flex-col gap-0.5 overflow-hidden">
                      <span className="text-[9px] font-black text-foreground/30 uppercase tracking-widest">Metadata Hash</span>
                      <div className="text-[10px] font-bold text-foreground/60 uppercase">
                        Log <span className="text-primary tracking-tighter">#{form.case_no || 'Pending'}</span> — <span className="font-mono text-[9px]">{formatDateTime(form.start_time).split(' ')[1]}</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-foreground/5 flex flex-col gap-4">
               <div className="flex items-center justify-between text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em] px-2">
                  <span>Author Roles</span>
                  <span>Validation State</span>
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                     {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-foreground/10 border-2 border-background" />)}
                  </div>
                  <div className="flex items-center gap-1.5 text-success">
                     <div className="w-1 h-1 rounded-full bg-success" />
                     <span className="text-[10px] font-black tracking-widest uppercase">Draft Ready</span>
                  </div>
               </div>
            </div>
          </SectionCard>
        </div>
        </form>
      </div>
    </div>
  );
}
