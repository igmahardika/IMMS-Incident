import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { NcalBadge, Spinner } from '../components/ui/index.jsx';
import { ArrowLeft, Send, Network } from 'lucide-react';

const NCAL_OPTIONS = ['BLUE', 'YELLOW', 'ORANGE', 'RED', 'BLACK'];
const LEVEL_OPTIONS = ['Level 1 - NOC', 'Level 2 - Teknisi Lapangan', 'Level 3 - Vendor Khusus', 'Level 4 - Core Network'];

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
  const [distSearch, setDistSearch] = useState('');
  const [showDistDropdown, setShowDistDropdown] = useState(false);
  const [distForm, setDistForm] = useState({ selectedItems: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { 
    api.getCustomers().then(setCustomers).catch(console.error); 
    api.getDistribusi().then(setDistribusi).catch(console.error);
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.case_no.trim()) return addToast('Nomor Case wajib diisi', 'warning');
    if (!form.initial_problem.trim()) return addToast('Problem awal wajib diisi', 'warning');
    
    const isDistribsi = ['ORANGE', 'RED', 'BLACK'].includes(form.ncal);
    if (isDistribsi && form.ncal === 'ORANGE' && distForm.selectedItems.length === 0) {
      return addToast('Pilih minimal satu infrastruktur untuk segmen ORANGE', 'warning');
    }
    if (!isDistribsi && !form.customer_id) {
       return addToast('Pilih customer untuk segmen LAN/Lastmile', 'warning');
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
      addToast(`Incident ${inc.case_no} berhasil dibuat!`, 'success');
      navigate('/incidents');
    } catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const isDistribsi = ['ORANGE', 'RED', 'BLACK'].includes(form.ncal);

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
        ...odps.map(o => ({ label: o, searchKey: `ODP ${o}`, value: `ODP: ${o}` })),
        ...radios.map(r => ({ label: r, searchKey: `RADIO ${r}`, value: `RADIO: ${r}` }))
      ].sort((a,b) => a.label.localeCompare(b.label));
    }
    if (form.ncal === 'RED') {
      const odcs = [...new Set(distribusi.filter(d => d.type === 'Fiber Optic').map(d => d.level_3))].filter(Boolean);
      const bts = [...new Set(distribusi.filter(d => d.type === 'Wireless').map(d => d.level_1))].filter(Boolean);
      return [
        ...odcs.map(o => ({ label: o, searchKey: `ODC ${o}`, value: `ODC: ${o}` })),
        ...bts.map(b => ({ label: b, searchKey: `BTS ${b}`, value: `BTS: ${b}` }))
      ].sort((a,b) => a.label.localeCompare(b.label));
    }
    if (form.ncal === 'BLACK') {
      const pops = [...new Set(distribusi.filter(d => d.type === 'Fiber Optic').map(d => d.level_1))].filter(Boolean);
      const oscs = [...new Set(distribusi.filter(d => d.type === 'Fiber Optic').map(d => d.level_2))].filter(Boolean);
      return [
        ...pops.map(p => ({ label: p, searchKey: `POP ${p}`, value: `POP: ${p}` })),
        ...oscs.map(o => ({ label: o, searchKey: `OSC ${o}`, value: `OSC: ${o}` }))
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
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate('/incidents')}><ArrowLeft size={15} /></button>
            <div>
              <div className="page-title">Create Incident</div>
              <div className="page-subtitle">Buat laporan gangguan baru</div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', alignItems: 'start' }}>
          {/* Main Form */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>📋 Detail Incident</div>

            {!isDistribsi ? (
              <div className="form-grid form-grid-2">
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Search Customer ID / Company / Site *</label>
                  <input 
                     type="text" 
                     className="form-control" 
                     placeholder="Ketik Brand/Site, ID, atau nama perusahaan..." 
                     value={search} 
                     onChange={e => { setSearch(e.target.value); setShowDropdown(true); set('customer_id', ''); }}
                     onFocus={() => setShowDropdown(true)}
                     onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  />
                  {showDropdown && (
                     <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', zIndex: 9999, maxHeight: 200, overflowY: 'auto', borderRadius: 8, marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                       {customers.filter(c => 
                          c.customer_id.toLowerCase().includes((search||'').toLowerCase()) || 
                          c.company_name.toLowerCase().includes((search||'').toLowerCase()) ||
                          (c.brand_site || '').toLowerCase().includes((search||'').toLowerCase())
                        ).map(c => (
                           <div 
                           key={c.id} 
                           style={{ padding: '0.6rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                           onMouseDown={() => {
                             setSearch(c.brand_site || c.company_name);
                             set('customer_id', c.id);
                             set('site_name_manual', c.brand_site || c.company_name);
                             set('sla', c.sla || '');
                             set('level_support', c.support_level || '');
                             set('address_preview', c.address || '');
                             setShowDropdown(false);
                           }}
                         >
                           <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.brand_site}</div>
                           <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{c.customer_id} — {c.company_name}</div>
                         </div>
                       ))}
                       {customers.filter(c => 
                          c.customer_id.toLowerCase().includes((search||'').toLowerCase()) || 
                          c.company_name.toLowerCase().includes((search||'').toLowerCase()) ||
                          (c.brand_site || '').toLowerCase().includes((search||'').toLowerCase())
                        ).length === 0 && (
                         <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tidak ditemukan</div>
                       )}
                     </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Preview Company details</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                    <input type="text" className="form-control" placeholder="PT. Nama Pelanggan" value={form.site_name_manual} disabled />
                    <input type="text" className="form-control" placeholder="SLA" value={form.sla} style={{ width: 100, textAlign: 'center' }} disabled />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
                   <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Network size={18} /></div>
                   <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Konfigurasi Segmen {form.ncal}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pilih entitas infrastruktur yang terdampak</div>
                   </div>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="form-group">
                    <label className="form-label">Infrastruktur / Distribusi (Search & Pilih) *</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Selected Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: 10, border: '1px solid var(--border)', minHeight: 46 }}>
                        {distForm.selectedItems.length === 0 ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Belum ada yang dipilih...</span>
                        ) : (
                          distForm.selectedItems.map(item => (
                            <span key={item} style={{ background: 'var(--accent)', color: 'white', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                              {item.includes(':') ? item.split(':')[1].trim() : item}
                              <button type="button" onClick={() => toggleItem(item)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: 0 }}>×</button>
                            </span>
                          ))
                        )}
                      </div>

                      {/* Search Input & Dropdown */}
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Cari ODP, Radio, BTS, POP..." 
                          value={distSearch}
                          onChange={e => { setDistSearch(e.target.value); setShowDistDropdown(true); }}
                          onFocus={() => setShowDistDropdown(true)}
                          onBlur={() => setTimeout(() => setShowDistDropdown(false), 200)}
                        />
                        {showDistDropdown && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', zIndex: 9999, maxHeight: 200, overflowY: 'auto', borderRadius: 8, marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)' }}>
                            {combOptions
                              .filter(o => !distForm.selectedItems.includes(o.value) && o.searchKey.toLowerCase().includes(distSearch.toLowerCase()))
                              .map(o => (
                                <div 
                                  key={o.value} 
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    toggleItem(o.value);
                                    setDistSearch('');
                                    setShowDistDropdown(false);
                                  }}
                                  style={{ padding: '0.6rem 0.85rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}
                                  onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                  onMouseLeave={e => e.target.style.background = 'transparent'}
                                >
                                  {o.label} <span style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>({o.value.split(':')[0]})</span>
                                </div>
                              ))
                            }
                            {combOptions.filter(o => !distForm.selectedItems.includes(o.value) && o.searchKey.toLowerCase().includes(distSearch.toLowerCase())).length === 0 && (
                              <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tidak ditemukan</div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        * Anda dapat mengetik untuk mencari dan memilih lebih dari satu item. Data akan otomatis diklasifikasikan berdasarkan kategori.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Nomor Case *</label>
                <input type="text" className="form-control" placeholder="Ketik Nomor Case (Wajib)..." value={form.case_no} onChange={e => set('case_no', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Waktu Down (Downtime) *</label>
                <input type="datetime-local" className="form-control" value={form.start_time} onChange={e => set('start_time', e.target.value)} required />
              </div>
            </div>

            <div className="form-grid form-grid-3">
              <div className="form-group">
                <label className="form-label">NCAL *</label>
                <select className="form-control" value={form.ncal} onChange={e => {
                  set('ncal', e.target.value);
                  // Reset if switching to Distribusi
                  if (['ORANGE', 'RED', 'BLACK'].includes(e.target.value)) {
                    set('customer_id', '');
                    set('site_name_manual', '');
                    set('sla', '');
                    setSearch('');
                  } else {
                    setDistForm({ selectedItems: [] });
                  }
                }} required>
                  {NCAL_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {form.ncal === 'YELLOW' && (
                <div className="form-group">
                  <label className="form-label">Distribusi (ODP/Radio) *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="form-control" style={{ flex: 1 }} value={form.odp_bts} onChange={e => set('odp_bts', e.target.value)}>
                      <option value="">-- Pilih Distribusi --</option>
                      {yellowDistOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      <option value="MANUAL_INPUT">-- Isi Manual --</option>
                    </select>
                    {form.odp_bts === 'MANUAL_INPUT' && (
                      <input type="text" className="form-control" style={{ flex: 1 }} placeholder="Ketik manual..." value={form.distribusi_manual} onChange={e => set('distribusi_manual', e.target.value)} />
                    )}
                  </div>
                </div>
              )}
              <div className="form-group" style={{ gridColumn: (isDistribsi || form.ncal === 'BLUE' || form.ncal === 'YELLOW') ? 'span 2' : 'auto' }}>
                <label className="form-label">Level Support *</label>
                <select className="form-control" value={form.level_support} onChange={e => set('level_support', e.target.value)} required>
                  <option value="">-- Pilih Level --</option>
                  <option value="1">Level 1 - NOC</option>
                  <option value="2">Level 2 - Teknisi Lapangan</option>
                  <option value="3">Level 3 - Vendor Khusus</option>
                  <option value="4">Level 4 - Core Network</option>
                </select>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Problem Awal *</label>
                 <textarea className="form-control" placeholder="Misal: Link FO termonitor LOS..." value={form.initial_problem} onChange={e => set('initial_problem', e.target.value)} rows={4} required />
              </div>
              <div className="form-group">
                <label className="form-label">Indikasi</label>
                 <textarea className="form-control" placeholder="Indikasi tambahan (jika ada)..." value={form.indikasi} onChange={e => set('indikasi', e.target.value)} rows={4} />
              </div>
            </div>

            {['BLUE', 'YELLOW'].includes(form.ncal) && (
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">PIC</label>
                <input type="text" className="form-control" placeholder="Nama PIC / Jabatan (contoh: Satpam Bpk Budi)..." value={form.pic} onChange={e => set('pic', e.target.value)} />
              </div>
            )}

            {isDistribsi && (
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Customer Terdampak</label>
                <textarea className="form-control" placeholder="Daftar customer yang terdampak..." value={form.customer_terdampak} onChange={e => set('customer_terdampak', e.target.value)} rows={4} />
              </div>
            )}

            {form.ncal === 'YELLOW' && (
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--warning)', borderRadius: 8, padding: '1rem', marginTop: '0.5rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--warning)', marginBottom: '0.75rem' }}>⚠️ Data Khusus Maintenance Order (Vendor)</div>
                <div className="form-grid form-grid-2" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Alamat Customer</label>
                    <textarea className="form-control" rows={2} placeholder="Otomatis terisi dari data master..." value={form.address_preview} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Koordinat Customer (Manual)</label>
                    <input type="text" className="form-control" placeholder="Isi - jika tidak ada koordinat..." value={form.koordinat} onChange={e => set('koordinat', e.target.value)} />
                  </div>
                </div>
                <div className="form-grid form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Power RX Onu</label>
                    <input type="text" className="form-control" placeholder="-23,28" value={form.power_before} onChange={e => set('power_before', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kabel</label>
                    <input type="text" className="form-control" placeholder="Drop core" value={form.kabel} onChange={e => set('kabel', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Panjang</label>
                    <input type="text" className="form-control" placeholder="- Meter" value={form.panjang_kabel} onChange={e => set('panjang_kabel', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/incidents')}>Batal</button>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                <Send size={14} /> {loading ? 'Menyimpan...' : 'Buat Incident'}
              </button>
            </div>
          </div>

          {/* Preview Card */}
          <div className="card" style={{ position: 'sticky', top: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Preview</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>NCAL:</span>
                <NcalBadge value={form.ncal} />
                {form.case_no && <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem', marginLeft: 'auto' }}>{form.case_no}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{isDistribsi ? 'Segmen Distribusi' : 'Site'}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {isDistribsi 
                      ? (distForm.selectedItems.length > 0 ? distForm.selectedItems.join(', ') : '—')
                      : (form.site_name_manual || '—')
                    }
                  </div>
                </div>
                {form.sla && !isDistribsi && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SLA</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>{form.sla}</div>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{isDistribsi ? 'Detail Infrastruktur' : 'Distribusi'}</div>
                <div style={{ fontSize: '0.85rem' }}>
                  {isDistribsi 
                    ? (distForm.selectedItems.length > 0 ? distForm.selectedItems.join(', ') : '—')
                    : (form.odp_bts || form.distribusi_manual || '—')
                  }
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Problem</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {form.initial_problem || '—'}
                  {form.indikasi && <><br/><span style={{ color: 'var(--text-muted)' }}>Indikasi:</span> {form.indikasi}</>}
                </div>
              </div>
              {form.ncal === 'YELLOW' && (
                <>
                  <div className="divider" style={{ margin: '0.25rem 0' }} />
                  <div style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 600 }}>Data MO Vendor</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.75rem' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Power:</span> {form.power_before || '-'}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Kabel:</span> {form.kabel || '-'}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Panjang:</span> {form.panjang_kabel || '-'}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>PIC:</span> {form.pic || '-'}</div>
                  </div>
                </>
              )}
              <div className="divider" />
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                ⏱ Downtime direcord pada {form.start_time.replace('T', ' ')}.<br />
                🔔 Notifikasi escalation akan dikirim ke grup jika aktif.
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
