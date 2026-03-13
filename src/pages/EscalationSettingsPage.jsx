import React, { useEffect, useState } from 'react';
import { api } from '../utils/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Spinner, SectionCard } from '../components/ui/index.jsx';
import { Save, Send, Settings } from 'lucide-react';

export default function EscalationSettingsPage() {
  const segments_raw = ['blue', 'yellow', 'orange', 'red', 'black'];
  const defaultTemplates = {
    template_open_internal_blue: `N-CAL  : {ncal}\nNomor case : {case_no}\nSite  : {brand}\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndikasi : {indikasi}\npic: {pic}`,
    template_close_internal_blue: `[CLOSE] {case_no}\n{ncal}\nSite: {brand}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`,
    template_open_internal_yellow: `N-CAL  : {ncal}\nNomor case : {case_no}\nSite  : {brand}\nStatus Link  : Down\nODP : {odp}\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndikasi : {indikasi}\nWaktu Down : {time}\npic: {pic}`,
    template_open_vendor_yellow: `Maintenance Order\n{ncal}\nSite : {brand}\nNomor case : {case_no}\nTanggal case : {date}\nAlamat Customer : {address}\nKoordinat customer : {koordinat}\nNama ODP : {odp}\nPower RX Onu : {power_rx}\nKabel : {kabel}\nTotal Panjang : {panjang_kabel}\nPIC : {pic}\nProblem : {problem}`,
    template_close_internal_yellow: `[CLOSE] {case_no}\n{ncal}\nSite: {brand}\nStatus Link  : Up\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`,
    template_close_vendor_yellow: `Close Order\n{ncal}\nSite : {brand}\nNomor case : {case_no}\nRoot Cause: {root_cause}\nAction: {action}\nNett: {duration}`,
  };
  ['orange', 'red', 'black'].forEach(seg => {
    const infraVar = seg === 'orange' ? '{odp}' : seg === 'red' ? '{odc}' : '{osc}/{pop}';
    const infraLabel = seg === 'orange' ? 'Distribusi' : 'Distribusi';
    defaultTemplates[`template_open_internal_${seg}`] = `N-CAL  : {ncal}\nNomor case : {case_no}\n${infraLabel} : ${infraVar}\nStatus Link  : Down\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndikasi : {indikasi}\nWaktu Down : {time}\nCustomer Terdampak :\n{customer_terdampak}`;
    defaultTemplates[`template_close_internal_${seg}`] = `[CLOSE] {case_no}\n{ncal}\nODP : {odp}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`;
  });

  const initialTemplates = { ...defaultTemplates };
  segments_raw.forEach(s => {
    if (!initialTemplates[`template_open_internal_${s}`]) initialTemplates[`template_open_internal_${s}`] = '';
    if (!initialTemplates[`template_open_vendor_${s}`]) initialTemplates[`template_open_vendor_${s}`] = '';
    if (!initialTemplates[`template_close_internal_${s}`]) initialTemplates[`template_close_internal_${s}`] = '';
    if (!initialTemplates[`template_close_vendor_${s}`]) initialTemplates[`template_close_vendor_${s}`] = '';
  });

  const [cfg, setCfg] = useState({ 
    type: 'telegram', 
    webhook_url: '', 
    webhook_url_vendor: '', 
    is_active: false, 
    template_open: '', 
    template_open_vendor: '', 
    template_close: '', 
    template_close_vendor: '',
    ...initialTemplates
  });
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const { addToast } = useToast();
  const [previewNcal, setPreviewNcal] = useState('BLUE');
  const [previewType, setPreviewType] = useState('open'); // 'open' or 'close'
  const setF = (k, v) => setCfg(p => ({ ...p, [k]: v }));

  useEffect(() => {
    api.getEscalation().then(d => { 
      if (d.id) {
        const merged = { ...d, is_active: !!d.is_active };
        Object.keys(defaultTemplates).forEach(k => {
          if (!merged[k]) merged[k] = defaultTemplates[k];
        });
        setCfg(prev => ({ ...prev, ...merged })); 
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try { await api.updateEscalation(cfg); addToast('Konfigurasi disimpan', 'success'); }
    catch (e) { addToast(e.message, 'error'); }
  };
  const handleTest = async () => {
    setTesting(true);
    try { await api.testEscalation(); addToast('Test message terkirim!', 'success'); }
    catch (e) { addToast(e.message, 'error'); }
    finally { setTesting(false); }
  };

  const renderPreview = (template, ncal, isClose = false) => {
    if (!template) return '';
    let label = ncal;
    if (isClose) label = `🟢 ${ncal}`;
    else {
      if (ncal === 'BLACK') label = `⚫ ${ncal}`;
      else if (ncal === 'RED') label = `🔴 ${ncal}`;
      else if (ncal === 'ORANGE') label = `🟠 ${ncal}`;
      else if (ncal === 'YELLOW') label = `🟡 ${ncal}`;
      else if (ncal === 'BLUE') label = `🔵 ${ncal}`;
    }

    // Infra mock values vary by segment for alias variables
    const infraMock = ncal === 'RED' ? 'ODC PELABUHAN' : ncal === 'BLACK' ? 'POP SEMARANG' : 'ODP-SMG-01';
    const mock = {
      ncal: label,
      case_no: 'C260313-1234',
      company: 'PT Sample Customer',
      brand: 'BRAND SITE A',
      root_cause: 'Kabel FO Putus',
      problem: 'LOS / Redaman Tinggi',
      action: 'Splicing core #5',
      duration: '01:23:45',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      address: 'Jl. Pemuda No. 1, Semarang',
      koordinat: '-6.9823, 110.4231',
      odp: infraMock,
      // Alias variables - same value as odp, named per segment convention
      odc: infraMock,   // RED segment (ODC)
      bts: infraMock,   // RED wireless (BTS)
      pop: infraMock,   // BLACK segment (POP)
      osc: infraMock,   // BLACK segment (OSC)
      radio: infraMock, // ORANGE wireless (Radio)
      power_rx: '-28.5 dBm',
      support_level: 'Level 2',
      indikasi: 'Patchcord Rusak',
      kabel: 'Dropcore 2 Core',
      panjang_kabel: '150m',
      pic: 'Technician B',
      customer_terdampak: '1. PT Customer Alpha\n2. PT Customer Beta\n3. PT Customer Gamma'
    };

    let text = template;
    Object.keys(mock).forEach(k => {
      const regex = new RegExp(`\\{${k}\\}`, 'g');
      text = text.replace(regex, mock[k]);
    });
    return text;
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}><Spinner /></div>;

  const segments = ['BLUE', 'YELLOW', 'ORANGE', 'RED', 'BLACK'];

  const getActiveTemplate = (type, side) => {
    const seg = previewNcal.toLowerCase();
    const key = `template_${type}_${side}_${seg}`;
    return cfg[key] || cfg[`template_${type}${side === 'vendor' ? '_vendor' : ''}`] || '';
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title"><Settings size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Escalation Settings</div>
          <div className="page-subtitle">Konfigurasi notifikasi otomatis</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', alignItems: 'start' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Webhook Configuration</div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Platform</label>
              <select className="form-control" value={cfg.type} onChange={e => setF('type', e.target.value)}>
                <option value="telegram">Telegram Bot</option>
                <option value="whatsapp">WhatsApp API</option>
                <option value="custom">Custom Webhook</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={!!cfg.is_active} onChange={e => setF('is_active', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{cfg.is_active ? 'Aktif' : 'Nonaktif'}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {cfg.type === 'telegram' ? 'Telegram Webhook URL (Grup Koordinasi Internal)' : 'Webhook URL (Internal)'} *
            </label>
            <input type="url" className="form-control" value={cfg.webhook_url || ''} onChange={e => setF('webhook_url', e.target.value)} placeholder="https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID_INTERNAL>" />
          </div>

          <div className="form-group">
            <label className="form-label">
              {cfg.type === 'telegram' ? 'Telegram Webhook URL (Grup Vendor/MO)' : 'Webhook URL (Vendor)'}
            </label>
            <input type="url" className="form-control" value={cfg.webhook_url_vendor || ''} onChange={e => setF('webhook_url_vendor', e.target.value)} placeholder="https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID_VENDOR>" />
          </div>

          {/* Template Editing Tabs */}
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 10, marginBottom: '1.25rem' }}>
              {segments.map(seg => (
                <button 
                   key={seg}
                   onClick={() => setPreviewNcal(seg)}
                   style={{
                     padding: '8px 12px',
                     fontSize: '0.75rem',
                     fontWeight: 600,
                     background: 'none',
                     border: 'none',
                     borderBottom: previewNcal === seg ? '2px solid var(--accent)' : '2px solid transparent',
                     color: previewNcal === seg ? 'var(--text-primary)' : 'var(--text-muted)',
                     cursor: 'pointer',
                     transition: 'all 0.2s'
                   }}
                >
                  {seg}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Template Pesan OPEN - {previewNcal}</div>
              <div className="form-group">
                <label className="form-label">Template OPEN (Internal)</label>
                <textarea 
                  className="form-control" 
                  rows={4} 
                  value={cfg[`template_open_internal_${previewNcal.toLowerCase()}`] || cfg.template_open || ''} 
                  onChange={e => setF(`template_open_internal_${previewNcal.toLowerCase()}`, e.target.value)} 
                  placeholder="Gunakan template global jika kosong..." 
                />
              </div>
              {previewNcal === 'YELLOW' && (
                <div className="form-group">
                  <label className="form-label">Template OPEN (Vendor/MO)</label>
                  <textarea 
                    className="form-control" 
                    rows={4} 
                    value={cfg[`template_open_vendor_${previewNcal.toLowerCase()}`] || cfg.template_open_vendor || ''} 
                    onChange={e => setF(`template_open_vendor_${previewNcal.toLowerCase()}`, e.target.value)} 
                    placeholder="Gunakan template global jika kosong..." 
                  />
                </div>
              )}

              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginTop: 10 }}>Template Pesan CLOSE - {previewNcal}</div>
              <div className="form-group">
                <label className="form-label">Template CLOSE (Internal)</label>
                <textarea 
                  className="form-control" 
                  rows={4} 
                  value={cfg[`template_close_internal_${previewNcal.toLowerCase()}`] || cfg.template_close || ''} 
                  onChange={e => setF(`template_close_internal_${previewNcal.toLowerCase()}`, e.target.value)} 
                  placeholder="Gunakan template global jika kosong..." 
                />
              </div>
              {previewNcal === 'YELLOW' && (
                <div className="form-group">
                  <label className="form-label">Template CLOSE (Vendor/MO)</label>
                  <textarea 
                    className="form-control" 
                    rows={4} 
                    value={cfg[`template_close_vendor_${previewNcal.toLowerCase()}`] || cfg.template_close_vendor || ''} 
                    onChange={e => setF(`template_close_vendor_${previewNcal.toLowerCase()}`, e.target.value)} 
                    placeholder="Gunakan template global jika kosong..." 
                  />
                </div>
              )}
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Meninggalkan field kosong akan menggunakan Template Global.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={handleTest} disabled={testing || !cfg.webhook_url}>
              <Send size={12} /> {testing ? 'Mengirim...' : 'Test Global'}
            </button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={handleSave}><Save size={14} /> Simpan Semua Konfigurasi</button>
          </div>
        </div>

        {/* Info Card / Previews */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(255,255,255,0.02) 100%)', position: 'sticky', top: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>📱 Notification Preview</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['open', 'close'].map(t => (
                  <button key={t} onClick={() => setPreviewType(t)} style={{ padding: '4px 8px', fontSize: '0.65rem', borderRadius: 6, border: '1px solid var(--border)', background: previewType === t ? 'var(--accent)' : 'transparent', color: previewType === t ? 'white' : 'var(--text-muted)', cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {['BLUE', 'YELLOW', 'ORANGE', 'RED', 'BLACK'].map(n => (
                <button 
                  key={n} 
                  onClick={() => setPreviewNcal(n)}
                  style={{ 
                    padding: '6px 10px', 
                    borderRadius: 8, 
                    fontSize: '0.7rem', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    background: previewNcal === n ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: previewNcal === n ? 'var(--accent)' : 'var(--text-muted)',
                    transition: 'all 0.2s'
                  }}
                >
                  {n}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>INTERNAL GROUP ALL NCAL</div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 12, fontSize: '0.8rem', whiteSpace: 'pre-wrap', fontFamily: 'SF Mono, monospace', border: '1px solid rgba(255,255,255,0.05)', color: 'white', lineHeight: 1.5 }}>
                  {renderPreview(getActiveTemplate(previewType, 'internal'), previewNcal, previewType === 'close')}
                </div>
              </div>

              {(previewNcal === 'YELLOW' || getActiveTemplate(previewType, 'vendor')) && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>VENDOR / MO GROUP {previewNcal === 'YELLOW' ? 'YELLOW ONLY' : ''}</div>
                  <div style={{ background: 'rgba(0,0,255,0.1)', padding: '1rem', borderRadius: 12, fontSize: '0.8rem', whiteSpace: 'pre-wrap', fontFamily: 'SF Mono, monospace', border: '1px solid rgba(0,102,255,0.2)', color: 'white', lineHeight: 1.5 }}>
                    {renderPreview(getActiveTemplate(previewType, 'vendor'), previewNcal, previewType === 'close')}
                  </div>
                </div>
              )}
              
              <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,0,0.05)', borderRadius: 10, border: '1px solid rgba(255,255,0,0.1)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#facc15', marginBottom: 4 }}>💡 Variable Glossary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 10px', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                  <div><b>{'{ncal}'}</b>: Segment + Emoji</div>
                  <div><b>{'{odp}'}</b>: Nama Distribusi (ODP/Radio)</div>
                  <div><b>{'{odc}'}</b>: Alias {'{odp}'} untuk RED (ODC)</div>
                  <div><b>{'{pop}'}</b>: Alias {'{odp}'} untuk BLACK (POP)</div>
                  <div><b>{'{osc}'}</b>: Alias {'{odp}'} untuk BLACK (OSC)</div>
                  <div><b>{'{bts}'}</b>: Alias {'{odp}'} untuk RED (BTS)</div>
                  <div><b>{'{brand}'}</b>: Brand / Site Name</div>
                  <div><b>{'{duration}'}</b>: Downtime duration</div>
                  <div><b>{'{time}'}</b>: Local time (HH:mm)</div>
                  <div><b>{'{date}'}</b>: Date (DD Month YYYY)</div>
                  <div><b>{'{address}'}</b>: Alamat customer (master)</div>
                  <div><b>{'{koordinat}'}</b>: Koordinat customer</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
