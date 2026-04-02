import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDateTime } from '../utils/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { NcalBadge, Spinner, SectionCard } from '../components/ui/index.jsx';
import { ArrowLeft, Send, Network } from 'lucide-react';

const NCAL_OPTIONS = ['BLUE', 'YELLOW', 'ORANGE', 'RED', 'BLACK'];
const LEVEL_OPTIONS = [
  { value: '1', label: 'Level 1' },
  { value: '2', label: 'Level 2' },
  { value: '3', label: 'Level 3' },
  { value: '4', label: 'Level 4' }
];

export default function CreateIncidentPage() {
  const [form, setForm] = useState({
    case_no: '', start_time: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    customer_id: '', site_name_manual: '', ncal: 'YELLOW',
    odp_bts: '', level_support: '2', sla: '',
    initial_problem: '', indikasi: '', power_before: '', kabel: '', panjang_kabel: '', pic: '', customer_terdampak: '', koordinat: '', address_preview: '',
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
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { 
    api.getCustomers().then(setCustomers).catch(console.error); 
    api.getDistribusi().then(setDistribusi).catch(console.error);
  }, []);

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

      const inc = await api.createIncident(payload);
      addToast('Incident created successfully', 'success');
      navigate('/incidents');
    } catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
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
    setSearch(c.brand_site); setShowDropdown(false); 
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

  return (
    <div className="flex flex-col gap-4 pb-24 md:pb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button className="btn btn-ghost btn-circle btn-sm" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={18} /></button>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight uppercase">New Incident</h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-base-content/40">Create a new monitoring ticket</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Section 1: Basic Information */}
          <SectionCard title="General Information" className="overflow-visible z-30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <label className="form-control w-full gap-1.5">
                <div className="label p-0 min-h-0"><span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/50">Case Number *</span></div>
                <input type="text" className="input input-md w-full font-mono font-semibold text-sm bg-base-200/50" placeholder="e.g., C240313-001" value={form.case_no} onChange={e => set('case_no', e.target.value)} required />
              </label>
              <label className="form-control w-full gap-1.5">
                <div className="label p-0 min-h-0"><span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/50">Reported Time *</span></div>
                <input type="datetime-local" className="input input-md w-full font-mono font-semibold text-sm bg-base-200/50 px-3" value={form.start_time} onChange={e => set('start_time', e.target.value)} required />
              </label>
              <label className="form-control w-full gap-1.5">
                <div className="label p-0 min-h-0"><span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/50">NCAL Segment *</span></div>
                <select className="select select-md w-full font-semibold text-sm bg-base-200/50" value={form.ncal} onChange={e => {
                  set('ncal', e.target.value);
                  if (['ORANGE', 'RED', 'BLACK'].includes(e.target.value)) {
                    set('customer_id', ''); set('site_name_manual', ''); set('sla', ''); setSearch('');
                  } else {
                    setDistForm({ selectedItems: [] });
                  }
                }} required>
                  {NCAL_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
          </SectionCard>

          {/* Section 2: Asset/Infrastructure Selection */}
          <SectionCard title="Asset & Network Configuration" className="overflow-visible z-20">
            {!isDistribsi ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control w-full relative gap-1.5 custom-dropdown-container">
                  <div className="label p-0 min-h-0">
                    <span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/40">{form.ncal === 'BLUE' ? 'Select Site *' : 'Select Customer *'}</span>
                  </div>
                  <input type="text" className="input input-md w-full font-semibold text-sm bg-base-200/50" placeholder="Search site or company name..." value={search} onChange={e => { setSearch(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} />
                  {showDropdown && (
                    <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-base-100 rounded-lg shadow-2xl max-h-80 overflow-y-auto z-[100] p-2 flex flex-col gap-1 backdrop-blur-md">
                      {customers.filter(c => (c.brand_site || '').toLowerCase().includes(search.toLowerCase()) || (c.company_name || '').toLowerCase().includes(search.toLowerCase())).map(c => (
                        <button key={c.id} type="button" className="flex flex-col p-3 hover:bg-base-200 rounded-lg text-left transition-all active:scale-[0.98]" onClick={() => handleCustomerSelect(c)}>
                          <span className="font-semibold text-sm tracking-tight text-base-content">{c.brand_site}</span>
                          <span className="text-xs text-base-content/40 font-semibold uppercase tracking-wide">{c.company_name} — SLA {c.grade}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {form.ncal !== 'BLUE' && (
                  <div className="form-control w-full relative gap-1.5 custom-dropdown-container">
                    <div className="label p-0 min-h-0"><span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/40">{form.ncal === 'YELLOW' ? 'Distribution (ODP / BTS) *' : 'Link / ODP'}</span></div>
                    <div className="flex flex-col gap-2">
                      <div className="input input-md w-full flex items-center justify-between cursor-pointer font-semibold text-sm bg-base-200/50" onClick={() => setShowOdpDropdown(!showOdpDropdown)}>
                        <span>{form.odp_bts || '— Select Distribution —'}</span>
                        <span className="text-base-content/50 text-xs">▼</span>
                      </div>
                      
                      {showOdpDropdown && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-base-100 rounded-lg shadow-2xl max-h-80 overflow-y-auto z-[100] p-2 flex flex-col gap-1 backdrop-blur-md">
                          <div className="p-1 px-2 mb-1 pb-2">
                             <input 
                              type="text" 
                              className="input input-xs input-ghost w-full font-semibold uppercase tracking-wider text-xs" 
                              placeholder="Search ODP/Wireless..." 
                              value={odpSearch} 
                              onChange={e => setOdpSearch(e.target.value)}
                              onClick={e => e.stopPropagation()} 
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            {[
                              ...((form.ncal === 'YELLOW' && yellowDistOptions) || []),
                              ...((!isDistribsi && customers.find(c => c.id === form.customer_id)?.link_coverage?.split('\n').filter(Boolean)) || [])
                            ].filter(o => o.toLowerCase().includes(odpSearch.toLowerCase())).map(o => (
                              <button key={o} type="button" className="p-3 hover:bg-base-200 rounded-xl text-left text-sm font-medium uppercase tracking-wider transition-all active:scale-[0.98]" onClick={() => { set('odp_bts', o); setShowOdpDropdown(false); }}>
                                {o}
                              </button>
                            ))}
                            <button type="button" className="p-3 hover:bg-primary/10 text-primary rounded-lg text-left text-sm font-medium uppercase tracking-wider transition-all mt-1 flex items-center justify-between" onClick={() => { set('odp_bts', 'MANUAL_INPUT'); setShowOdpDropdown(false); }}>
                              <span>+ Manual Entry</span>
                              <ArrowLeft size={12} className="rotate-180 opacity-60" />
                            </button>
                          </div>
                        </div>
                      )}

                      {form.odp_bts === 'MANUAL_INPUT' && (
                        <input type="text" className="input w-full font-medium bg-base-200/80 animate-in slide-in-from-top-2 duration-200" placeholder="Enter manual name..." value={form.distribusi_manual} onChange={e => set('distribusi_manual', e.target.value)} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="form-control w-full relative gap-1.5 custom-dropdown-container">
                <div className="label p-0 min-h-0"><span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/40">Infrastructure Selection ({form.ncal} Segment) *</span></div>
                <div className="input input-md w-full h-auto min-h-[44px] flex flex-wrap gap-2 items-center p-3 cursor-pointer transition-all bg-base-200/50 hover:bg-base-200" onClick={() => setShowDistDropdown(!showDistDropdown)}>
                  {distForm.selectedItems.length === 0 ? (
                    <span className="text-base-content/50 text-sm font-medium uppercase tracking-wider pl-1">Search and select items...</span>
                  ) : distForm.selectedItems.map(item => (
                    <div key={item} className="badge badge-primary badge-sm gap-1 pl-2.5 pr-1 py-3 font-semibold text-xs uppercase tracking-wider rounded-lg">
                      {item}
                      <button type="button" onClick={(e) => { e.stopPropagation(); toggleItem(item); }} className="btn btn-ghost btn-xs btn-circle h-5 w-5 hover:bg-white/20">×</button>
                    </div>
                  ))}
                </div>
                {showDistDropdown && (
                    <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-base-100 rounded-lg shadow-2xl max-h-80 overflow-y-auto z-[100] p-2 flex flex-col gap-1 backdrop-blur-md" onClick={e => e.stopPropagation()}>
                      <div className="p-1 px-2 mb-1 pb-2">
                        <input type="text" className="input input-xs input-ghost w-full font-semibold uppercase tracking-wider text-xs" placeholder="Filter infrastructure..." value={distSearch} onChange={e => setDistSearch(e.target.value)} onFocus={e => e.stopPropagation()} />
                      </div>
                      <div className="flex flex-col gap-1">
                          {combOptions.filter(o => !distForm.selectedItems.includes(o.value) && o.searchKey.toLowerCase().includes(distSearch.toLowerCase())).map(o => (
                          <button key={o.value} type="button" className="flex items-center gap-3 p-3 hover:bg-base-200 rounded-xl text-left transition-all active:scale-[0.98] group" onClick={() => toggleItem(o.value)}>
                            <div className={`w-5 h-5 rounded-lg border-2 border-primary/20 flex items-center justify-center transition-all ${distForm.selectedItems.includes(o.value) ? 'bg-primary border-primary' : 'bg-base-200'}`}>
                              {distForm.selectedItems.includes(o.value) && <span className="text-xs text-primary-content font-bold">✓</span>}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm tracking-tight text-base-content">{o.label}</span>
                              <span className="text-xs text-base-content/60 font-semibold uppercase tracking-wider">{o.value.split(':')[0]}</span>
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
          <SectionCard title="Incident Details">
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="form-control w-full gap-1.5">
                  <div className="label p-0 min-h-0"><span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/40">Initial Problem *</span></div>
                  <textarea className="textarea w-full font-semibold text-sm bg-base-200/50 leading-relaxed" placeholder="Describe the detected issue..." value={form.initial_problem} onChange={e => set('initial_problem', e.target.value)} rows={3} required />
                </label>
                <label className="form-control w-full gap-1.5">
                  <div className="label p-0 min-h-0"><span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/40">Technical Indications</span></div>
                  <textarea className="textarea w-full font-semibold text-sm text-base-content/80 bg-base-200/50 leading-relaxed" placeholder="Loss of signal, high attenuation, etc..." value={form.indikasi} onChange={e => set('indikasi', e.target.value)} rows={3} />
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="form-control w-full">
                  <div className="label"><span className="label-text font-medium text-base-content/70">Priority *</span></div>
                  <div className="flex flex-col gap-2">
                    <select 
                      className="select select-ghost bg-base-200/50 w-full font-semibold text-sm" 
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
                      <div className="flex items-center gap-2 px-1">
                        <div className="badge badge-primary badge-sm text-xs font-medium tracking-wider">AUTO</div>
                        <span className="text-xs font-semibold opacity-40 uppercase tracking-wider">Pulled from record</span>
                      </div>
                    )}
                  </div>
                </label>
                {!isDistribsi && (
                  <label className="form-control w-full">
                  <div className="label"><span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/40">Assigned Technician / PIC</span></div>
                    <input type="text" className="input input-ghost bg-base-200/50 w-full font-semibold text-sm" placeholder="Enter name or ID..." value={form.pic} onChange={e => set('pic', e.target.value)} />
                  </label>
                )}
              </div>

              {isDistribsi && (
                <label className="form-control w-full">
                  <div className="label"><span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/40">Impacted Customers</span></div>
                  <textarea className="textarea textarea-ghost bg-base-200/50 w-full font-semibold text-sm" placeholder="List impacted sites/companies..." value={form.customer_terdampak} onChange={e => set('customer_terdampak', e.target.value)} rows={2} />
                </label>
              )}

              {form.ncal === 'YELLOW' && (
                <div className="bg-warning/10 rounded-lg p-6 flex flex-col gap-6">
                  <div className="text-xs font-semibold text-warning uppercase tracking-wider flex items-center gap-2">
                    <Network size={12} /> Vendor Maintenance Order Details
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="form-control w-full">
                      <div className="label"><span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/40">Original Address (Site)</span></div>
                      <textarea className="textarea textarea-ghost bg-base-200 w-full opacity-60 text-xs font-semibold" rows={2} value={form.address_preview} disabled />
                    </label>
                    <label className="form-control w-full">
                      <div className="label"><span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/40">Coordinates (Override)</span></div>
                      <input type="text" className="input input-ghost bg-base-200 w-full font-mono font-semibold text-sm" placeholder="GPS Lat, Long" value={form.koordinat} onChange={e => set('koordinat', e.target.value)} />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <label className="form-control w-full">
                      <div className="label"><span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/40">RX Power (Before)</span></div>
                      <input type="text" className="input input-ghost bg-base-200 w-full font-mono font-semibold text-sm" placeholder="-20.5 dBm" value={form.power_before} onChange={e => set('power_before', e.target.value)} />
                    </label>
                    <label className="form-control w-full">
                      <div className="label"><span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/40">Cable Type</span></div>
                      <input type="text" className="input input-ghost bg-base-200 w-full font-semibold text-sm" placeholder="Dropcore..." value={form.kabel} onChange={e => set('kabel', e.target.value)} />
                    </label>
                    <label className="form-control w-full">
                      <div className="label"><span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/40">Total Length</span></div>
                      <input type="text" className="input input-ghost bg-base-200 w-full font-mono font-semibold text-sm" placeholder="Meters" value={form.panjang_kabel} onChange={e => set('panjang_kabel', e.target.value)} />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
          
          <div className="sticky-action-mobile mt-6">
            <button type="button" className="btn btn-ghost flex-1 md:flex-none font-semibold uppercase tracking-wider text-xs" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1 md:btn-wide font-semibold uppercase tracking-wider text-xs shadow-xl shadow-primary/20" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-sm"></span> : <><Send size={16} /> <span className="md:inline">Create Incident</span></>}
            </button>
          </div>
        </div>

        {/* Sidebar / Preview Column */}
        <div className="flex flex-col gap-6 sticky top-6">
          <SectionCard title="Ticket Preview" className="bg-base-100 shadow-xl overflow-hidden">
            <div className="flex flex-col gap-6">
              <div className="p-5 bg-base-200 rounded-lg flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-base-content/30 uppercase tracking-wider">Impact Segment</span>
                  <NcalBadge value={form.ncal} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-base-content/30 uppercase tracking-wider">Infrastructures</span>
                  <div className="font-semibold text-sm tracking-tight leading-tight text-base-content">
                    {isDistribsi 
                      ? (distForm.selectedItems.length > 0 ? distForm.selectedItems.join(', ') : 'None')
                      : (form.site_name_manual || 'None')
                    }
                  </div>
                  {!isDistribsi && form.sla && (
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-xs font-medium text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">Grade {form.sla}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 px-1">
                <span className="text-xs font-medium text-base-content/30 uppercase tracking-wider">Initial Issue</span>
                <div className="text-sm font-medium leading-relaxed text-base-content/70 italic">
                  {form.initial_problem || <span className="opacity-20">Awaiting input...</span>}
                </div>
              </div>

              <div className="mt-2 p-3 bg-base-300/30 rounded-xl">
                <div className="text-xs font-medium text-base-content/40 uppercase tracking-wider mb-1">Ticket Metadata</div>
                <div className="text-xs font-semibold text-base-content/40 leading-relaxed">
                  Log <span className="text-primary font-bold">#{form.case_no || 'TBD'}</span> at <span className="font-mono text-base-content/60">{formatDateTime(form.start_time)}</span>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </form>
    </div>
  );
}
