import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { NcalBadge, Spinner } from '../components/ui/index.jsx';
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
    distribusi_manual: ''
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
    <div className="page-stack">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={16} /></button>
          <div>
            <div className="page-title">New Incident</div>
            <div className="page-subtitle">Create a new monitoring ticket</div>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner size={16} /> : <><Send size={16} /> Create & Send</>}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
      <div className="layout-with-aside">
        <div className="page-stack">
          {/* Section 1: Basic Information */}
          <div className="section-card" style={{ position: 'relative', overflow: 'visible', zIndex: (showDropdown || showDistDropdown || showOdpDropdown) ? 10 : 1 }}>
            <div className="section-card-header">
              <div className="section-card-title">General Information</div>
            </div>
            <div className="section-card-body">
              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label">Case Number *</label>
                  <input type="text" className="form-control" placeholder="e.g., C240313-001" value={form.case_no} onChange={e => set('case_no', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Reported Time *</label>
                  <input type="datetime-local" className="form-control" value={form.start_time} onChange={e => set('start_time', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">NCAL Segment *</label>
                  <select className="form-control" value={form.ncal} onChange={e => {
                    set('ncal', e.target.value);
                    if (['ORANGE', 'RED', 'BLACK'].includes(e.target.value)) {
                      set('customer_id', ''); set('site_name_manual', ''); set('sla', ''); setSearch('');
                    } else {
                      setDistForm({ selectedItems: [] });
                    }
                  }} required>
                    {NCAL_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Asset/Infrastructure Selection */}
          <div className="section-card" style={{ position: 'relative', overflow: 'visible', zIndex: (showDropdown || showDistDropdown || showOdpDropdown) ? 20 : 1 }}>
            <div className="section-card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="section-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Network size={16} /> Asset & Network Configuration</div>
            </div>
            <div className="section-card-body">
              {!isDistribsi ? (
                <div className="form-grid" style={{ gridTemplateColumns: form.ncal === 'BLUE' ? '1fr' : '1fr 1fr' }}>
                  <div className="form-group custom-dropdown-container" style={{ position: 'relative', zIndex: showDropdown ? 100 : 1 }}>
                    <label className="form-label">Select Site/Customer *</label>
                    <input type="text" className="form-control" placeholder="Search site or company name..." value={search} onChange={e => { setSearch(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} />
                    {showDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', marginTop: 4, maxHeight: 300, overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
                        {customers.filter(c => c.brand_site.toLowerCase().includes(search.toLowerCase()) || c.company_name.toLowerCase().includes(search.toLowerCase())).map(c => (
                          <div key={c.id} style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }} className="dropdown-item-hover" onClick={() => handleCustomerSelect(c)}>
                            <div style={{ fontWeight: 600 }}>{c.brand_site}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.company_name} — SLA {c.grade}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {form.ncal !== 'BLUE' && (
                    <div className="form-group custom-dropdown-container" style={{ zIndex: showOdpDropdown ? 90 : 1 }}>
                      <label className="form-label">Link/Distribution (ODP/BTS)</label>
                      <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
                        <div className="form-control" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowOdpDropdown(!showOdpDropdown)}>
                          <span style={{ fontSize: '0.85rem' }}>{form.odp_bts || '— Select Distribution —'}</span>
                          <span style={{ fontSize: '0.7rem' }}>▼</span>
                        </div>
                        
                        {showOdpDropdown && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 900, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', marginTop: 4, maxHeight: 250, overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
                            <input 
                              type="text" 
                              className="form-control" 
                              style={{ margin: 8, width: 'calc(100% - 16px)', fontSize: '0.8rem' }} 
                              placeholder="Filter distribution..." 
                              value={odpSearch} 
                              onChange={e => setOdpSearch(e.target.value)}
                              onClick={e => e.stopPropagation()} 
                            />
                            {[
                              ...((form.ncal === 'YELLOW' && yellowDistOptions) || []),
                              ...((!isDistribsi && customers.find(c => c.id === form.customer_id)?.link_coverage?.split('\n').filter(Boolean)) || [])
                            ].filter(o => o.toLowerCase().includes(odpSearch.toLowerCase())).map(o => (
                              <div key={o} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }} className="dropdown-item-hover" onClick={() => { set('odp_bts', o); setShowOdpDropdown(false); }}>
                                {o}
                              </div>
                            ))}
                            <div style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem' }} className="dropdown-item-hover" onClick={() => { set('odp_bts', 'MANUAL_INPUT'); setShowOdpDropdown(false); }}>
                              + Manual Entry
                            </div>
                          </div>
                        )}

                        {form.odp_bts === 'MANUAL_INPUT' && (
                          <input type="text" className="form-control" style={{ flex: 1 }} placeholder="Enter manual name..." value={form.distribusi_manual} onChange={e => set('distribusi_manual', e.target.value)} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Infrastructure Selection ({form.ncal} Segment) *</label>
                  <div className="custom-dropdown-container" style={{ position: 'relative', zIndex: showDistDropdown ? 110 : 1 }}>
                    <div className="form-control" style={{ minHeight: '38px', height: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 8px', cursor: 'pointer' }} onClick={() => setShowDistDropdown(!showDistDropdown)}>
                      {distForm.selectedItems.length === 0 ? <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '4px 0' }}>Search and select infrastructure items...</span> : distForm.selectedItems.map(item => (
                        <span key={item} style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {item}
                          <button type="button" onClick={(e) => { e.stopPropagation(); toggleItem(item); }} style={{ border: 'none', background: 'none', color: 'inherit', padding: 0, cursor: 'pointer', display: 'flex' }}>&times;</button>
                        </span>
                      ))}
                    </div>
                    {showDistDropdown && (
                       <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1100, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', marginTop: 4, maxHeight: 300, overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }} onClick={e => e.stopPropagation()}>
                          <input type="text" className="form-control" style={{ margin: 8, width: 'calc(100% - 16px)', fontSize: '0.85rem' }} placeholder="Filter infrastructure..." value={distSearch} onChange={e => setDistSearch(e.target.value)} onFocus={e => e.stopPropagation()} />
                          <div style={{ padding: '4px 0' }}>
                           {combOptions.filter(o => !distForm.selectedItems.includes(o.value) && o.searchKey.toLowerCase().includes(distSearch.toLowerCase())).map(o => (
                             <div key={o.value} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }} className="dropdown-item-hover" onClick={() => toggleItem(o.value)}>
                               <input type="checkbox" checked={distForm.selectedItems.includes(o.value)} readOnly style={{ pointerEvents: 'none' }} />
                               <span style={{ fontSize: '0.85rem' }}>{o.label} <small style={{ color: 'var(--text-muted)' }}>({o.value.split(':')[0]})</small></span>
                             </div>
                           ))}
                          </div>
                       </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Technical Details */}
          <div className="section-card">
            <div className="section-card-header">
              <div className="section-card-title">Incident Details</div>
            </div>
            <div className="section-card-body">
              <div className="form-grid form-grid-2" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Initial Problem *</label>
                  <textarea className="form-control" placeholder="Describe the detected issue..." value={form.initial_problem} onChange={e => set('initial_problem', e.target.value)} rows={3} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Technical Indications</label>
                  <textarea className="form-control" placeholder="Loss of signal, high attenuation, etc..." value={form.indikasi} onChange={e => set('indikasi', e.target.value)} rows={3} />
                </div>
              </div>
              
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Priority *</label>
                  <select 
                    className="form-control" 
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
                    <div style={{ fontSize: '0.68rem', color: 'var(--accent)', marginTop: 4, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ background: 'var(--accent)', color: 'white', padding: '1px 4px', borderRadius: 3, fontSize: '0.6rem' }}>AUTO</span>
                      Pulled from customer record
                    </div>
                  )}
                </div>
                {!isDistribsi && (
                  <div className="form-group">
                    <label className="form-label">Assigned Technician / PIC</label>
                    <input type="text" className="form-control" placeholder="Enter name or ID..." value={form.pic} onChange={e => set('pic', e.target.value)} />
                  </div>
                )}
              </div>

              {isDistribsi && (
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Impacted Customers</label>
                  <textarea className="form-control" placeholder="List impacted sites/companies..." value={form.customer_terdampak} onChange={e => set('customer_terdampak', e.target.value)} rows={2} />
                </div>
              )}

              {form.ncal === 'YELLOW' && (
                <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--warning)', borderRadius: 8, padding: '1rem', marginTop: '1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--warning)', marginBottom: '0.75rem' }}>⚠️ Vendor Maintenance Order Details</div>
                  <div className="form-grid form-grid-2" style={{ marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Original Address (Site)</label>
                      <textarea className="form-control" rows={2} value={form.address_preview} disabled />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Coordinates (Manual Override)</label>
                      <input type="text" className="form-control" placeholder="GPS Lat, Long" value={form.koordinat} onChange={e => set('koordinat', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-grid form-grid-3">
                    <div className="form-group">
                      <label className="form-label">RX Power (Before)</label>
                      <input type="text" className="form-control" placeholder="-20.5 dBm" value={form.power_before} onChange={e => set('power_before', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cable Type</label>
                      <input type="text" className="form-control" placeholder="Dropcore / Patchcord" value={form.kabel} onChange={e => set('kabel', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Total Length</label>
                      <input type="text" className="form-control" placeholder="Meters" value={form.panjang_kabel} onChange={e => set('panjang_kabel', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '0.5rem 0' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? <Spinner size={16} /> : <><Send size={16} /> Create Incident</>}
            </button>
          </div>
        </div>

        {/* Sidebar / Preview Column */}
        <div className="aside-sticky">
          <div className="section-card">
            <div className="section-card-header">
              <div className="section-card-title">Live Preview</div>
            </div>
            <div className="section-card-body" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>NCAL SEGMENT</div>
                  <div style={{ marginTop: 4 }}><NcalBadge value={form.ncal} /></div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>SITE / INFRASTRUCTURE</div>
                  <div style={{ marginTop: 4, fontWeight: 600, fontSize: '0.9rem' }}>
                    {isDistribsi 
                      ? (distForm.selectedItems.length > 0 ? distForm.selectedItems.join(', ') : 'No infrastructure selected')
                      : (form.site_name_manual || 'No site selected')
                    }
                  </div>
                  {!isDistribsi && form.sla && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 2, fontWeight: 700 }}>SLA {form.sla}</div>}
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>PROBLEM SUMMARY</div>
                  <div style={{ marginTop: 4, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{form.initial_problem || '—'}</div>
                </div>
                <div className="divider" />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  This ticket will be created at {new Date(form.start_time).toLocaleString()} and relevant groups will be notified.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
    </div>
  );
}
