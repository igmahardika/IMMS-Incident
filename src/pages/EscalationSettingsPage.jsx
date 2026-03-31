import React, { useEffect, useState } from 'react';
import { api } from '../utils/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { PageSpinner, SectionCard } from '../components/ui/index.jsx';
import { Save, Send, Settings, Smartphone, Info } from 'lucide-react';

export default function EscalationSettingsPage() {
  const segments_raw = ['blue', 'yellow', 'orange', 'red', 'black'];
  const defaultTemplates = {
    template_open_internal_blue: `N-CAL  : {ncal} - Level {level}\nNomor case : {case_no}\nSite  : {brand}\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\npic: {pic}`,
    template_close_internal_blue: `[CLOSE] {case_no}\n{ncal} - Level {level}\nSite: {brand}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nResolved: {time}`,
    template_open_internal_yellow: `N-CAL  : {ncal} - Level {level}\nNomor case : {case_no}\nSite  : {brand}\nLink Status  : Down\nODP : {odp}\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\nDown Time : {time}\nPIC: {pic}`,
    template_open_vendor_yellow: `Maintenance Order\n{ncal}\nSite : {brand}\nCase Number : {case_no}\nCase Date : {date}\nCustomer Address : {address}\nCustomer Coordinates : {koordinat}\nODP Name : {odp}\nPower RX Onu : {power_rx}\nCable : {kabel}\nTotal Length : {panjang_kabel}\nPIC : {pic}\nProblem : {problem}`,
    template_close_internal_yellow: `[CLOSE] {case_no}\n{ncal} - Level {level}\nSite: {brand}\nLink Status  : Up\nRoot Cause: {root_cause}\nNett Duration: {duration}\nResolved: {time}`,
    template_close_vendor_yellow: `Close Order\n{ncal}\nSite : {brand}\nCase Number : {case_no}\nRoot Cause: {root_cause}\nAction: {action}\nNett: {duration}`,
  };
  ['orange', 'red', 'black'].forEach(seg => {
    const infraVar = seg === 'orange' ? '{odp}' : seg === 'red' ? '{odc}' : '{osc}/{pop}';
    const infraLabel = 'Distribution';
    defaultTemplates[`template_open_internal_${seg}`] = `N-CAL  : {ncal} - Level {level}\nNomor case : {case_no}\n${infraLabel} : ${infraVar}\nLink Status  : Down\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\nDown Time : {time}\nImpacted Customers :\n{customer_terdampak}`;
    defaultTemplates[`template_close_internal_${seg}`] = `[CLOSE] {case_no}\n{ncal} - Level {level}\nODP : {odp}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nResolved: {time}`;
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
  const [previewType, setPreviewType] = useState('open');
  const setF = (k, v) => setCfg(p => ({ ...p, [k]: v }));

  useEffect(() => {
    api.getEscalation().then(d => {
      if (d.id) {
        const merged = { ...d, is_active: !!d.is_active };
        Object.keys(defaultTemplates).forEach(k => { if (!merged[k]) merged[k] = defaultTemplates[k]; });
        setCfg(prev => ({ ...prev, ...merged }));
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try { await api.updateEscalation(cfg); addToast('Configuration saved successfully', 'success'); }
    catch (e) { addToast(e.message, 'error'); }
  };
  const handleTest = async () => {
    setTesting(true);
    try { await api.testEscalation(); addToast('Test message sent!', 'success'); }
    catch (e) { addToast(e.message, 'error'); }
    finally { setTesting(false); }
  };

  const renderPreview = (template, ncal, isClose = false) => {
    if (!template) return '—';
    let label = ncal;
    if (isClose) label = `🟢 ${ncal}`;
    else {
      const icons = { BLACK: '⚫', RED: '🔴', ORANGE: '🟠', YELLOW: '🟡', BLUE: '🔵' };
      label = `${icons[ncal] || ''} ${ncal}`;
    }
    const infraMock = ncal === 'RED' ? 'ODC PELABUHAN' : ncal === 'BLACK' ? 'POP SEMARANG' : 'ODP-SMG-01';
    const mock = {
      ncal: label, case_no: 'C260313-1234', company: 'PT Sample Customer',
      brand: 'BRAND SITE A', root_cause: 'Fiber Cut', problem: 'LOS / High Attenuation',
      action: 'Splicing core #5', duration: '01:23:45',
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      address: '123 Business St, Landmark Sq', koordinat: '-6.9823, 110.4231',
      odp: infraMock, odc: infraMock, bts: infraMock, pop: infraMock,
      osc: infraMock, radio: infraMock, power_rx: '-28.5 dBm',
      support_level: 'Level 2', level: '2', indikasi: 'Damaged Patchcord',
      kabel: 'Dropcore 2 Core', panjang_kabel: '150m', pic: 'Technician B',
      customer_terdampak: '1. ABC Corp\n2. XYZ Limited\n3. Global Solutions'
    };
    let text = template;
    Object.keys(mock).forEach(k => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), mock[k]);
    });
    return text;
  };

  if (loading) return <PageSpinner />;

  const segments = ['BLUE', 'YELLOW', 'ORANGE', 'RED', 'BLACK'];
  const getActiveTemplate = (type, side) => {
    const seg = previewNcal.toLowerCase();
    const key = `template_${type}_${side}_${seg}`;
    return cfg[key] || cfg[`template_${type}${side === 'vendor' ? '_vendor' : ''}`] || '';
  };

  return (
    <div className="page-stack">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">
            <Settings size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 8 }} />
            Escalation Settings
          </div>
          <div className="page-subtitle">Configure automated notifications via Webhook endpoints</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleTest} disabled={testing || !cfg.webhook_url}>
            <Send size={13} /> {testing ? 'Sending...' : 'Global Test'}
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={14} /> Save Configuration
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="layout-with-aside">
        {/* Left: config form */}
        <div className="page-stack">
          {/* Webhook config */}
          <div className="section-card">
            <div className="section-card-header">
              <div>
                <div className="section-card-title">Webhook Configuration</div>
                <div className="section-card-subtitle">Set up platforms and notification endpoint URLs</div>
              </div>
              {/* Active status indicator */}
              <div className="status-row">
                <div className={`status-dot ${cfg.is_active ? 'status-dot-active' : 'status-dot-inactive'}`} />
                <span style={{ fontSize: '0.786rem', color: 'var(--text-secondary)' }}>
                  {cfg.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="section-card-body">
              <div className="form-grid form-grid-2" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Platform</label>
                  <select className="form-control" value={cfg.type} onChange={e => setF('type', e.target.value)}>
                    <option value="telegram">Telegram Bot</option>
                    <option value="whatsapp">WhatsApp API</option>
                    <option value="custom">Custom Webhook</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notification Status</label>
                  <div style={{ paddingTop: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox" checked={!!cfg.is_active}
                        onChange={e => setF('is_active', e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.857rem', fontWeight: 500 }}>Enable notification delivery</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">
                  {cfg.type === 'telegram' ? 'Webhook URL — Internal Coordination Group' : 'Webhook URL (Internal)'} *
                </label>
                <input
                  type="url" className="form-control"
                  value={cfg.webhook_url || ''}
                  onChange={e => setF('webhook_url', e.target.value)}
                  placeholder="https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<INTERNAL>"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {cfg.type === 'telegram' ? 'Webhook URL — Vendor / MO Group' : 'Webhook URL (Vendor)'}
                </label>
                <input
                  type="url" className="form-control"
                  value={cfg.webhook_url_vendor || ''}
                  onChange={e => setF('webhook_url_vendor', e.target.value)}
                  placeholder="https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<VENDOR>"
                />
              </div>
            </div>
          </div>

          {/* Template editing */}
          <div className="section-card">
            <div className="section-card-header">
              <div>
                <div className="section-card-title">Message Templates</div>
                <div className="section-card-subtitle">OPEN & CLOSE message templates per NCAL segment</div>
              </div>
            </div>
            <div className="section-card-body">
              {/* Tab bar */}
              <div className="tab-bar">
                {segments.map(seg => (
                  <button
                    key={seg}
                    className={`tab-btn${previewNcal === seg ? ' active' : ''}`}
                    onClick={() => setPreviewNcal(seg)}
                  >
                    {seg}
                  </button>
                ))}
              </div>

              <div className="form-section">
                <div className="form-section-title">Template OPEN — {previewNcal}</div>
                <div className="form-group">
                  <label className="form-label">Internal Group</label>
                  <textarea
                    className="form-control" rows={5}
                    value={cfg[`template_open_internal_${previewNcal.toLowerCase()}`] || cfg.template_open || ''}
                    onChange={e => setF(`template_open_internal_${previewNcal.toLowerCase()}`, e.target.value)}
                    placeholder="Notification template for internal groups..."
                  />
                </div>
                {previewNcal === 'YELLOW' && (
                  <div className="form-group">
                    <label className="form-label">Vendor / MO Group</label>
                    <textarea
                      className="form-control" rows={5}
                      value={cfg[`template_open_vendor_${previewNcal.toLowerCase()}`] || cfg.template_open_vendor || ''}
                      onChange={e => setF(`template_open_vendor_${previewNcal.toLowerCase()}`, e.target.value)}
                      placeholder="Template for Maintenance Order to vendors..."
                    />
                  </div>
                )}
              </div>

              <div className="form-section">
                <div className="form-section-title">Template CLOSE — {previewNcal}</div>
                <div className="form-group">
                  <label className="form-label">Internal Group</label>
                  <textarea
                    className="form-control" rows={5}
                    value={cfg[`template_close_internal_${previewNcal.toLowerCase()}`] || cfg.template_close || ''}
                    onChange={e => setF(`template_close_internal_${previewNcal.toLowerCase()}`, e.target.value)}
                    placeholder="Resolution notification template for internal groups..."
                  />
                </div>
                {previewNcal === 'YELLOW' && (
                  <div className="form-group">
                    <label className="form-label">Vendor / MO Group</label>
                    <textarea
                      className="form-control" rows={5}
                      value={cfg[`template_close_vendor_${previewNcal.toLowerCase()}`] || cfg.template_close_vendor || ''}
                      onChange={e => setF(`template_close_vendor_${previewNcal.toLowerCase()}`, e.target.value)}
                      placeholder="Close order template for vendors..."
                    />
                  </div>
                )}
              </div>

              <div className="info-banner info-banner-accent" style={{ marginTop: '0.25rem' }}>
                Empty fields will automatically fall back to the Global Template.
              </div>
            </div>
          </div>
        </div>

        {/* Right: sticky preview */}
        <div className="aside-sticky">
          <div className="section-card">
            <div className="section-card-header">
              <div>
                <div className="section-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Smartphone size={14} /> Notification Preview</div>
                <div className="section-card-subtitle">Real-time preview based on active templates</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['open', 'close'].map(t => (
                  <button
                    key={t}
                    onClick={() => setPreviewType(t)}
                    className={`btn btn-sm ${previewType === t ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ textTransform: 'capitalize', minHeight: 28, padding: '0 10px' }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="section-card-body">
              {/* NCAL selector */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '1rem' }}>
                {segments.map(n => (
                  <button
                    key={n}
                    onClick={() => setPreviewNcal(n)}
                    className={`btn btn-sm ${previewNcal === n ? 'btn-secondary' : 'btn-ghost'}`}
                    style={{ minHeight: 28, padding: '0 10px', fontWeight: 700, fontSize: '0.714rem' }}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {/* Internal preview */}
              <div style={{ marginBottom: '0.875rem' }}>
                <div className="form-section-title" style={{ marginBottom: 6 }}>Internal Group — {previewNcal}</div>
                <div className="preview-block">
                  {renderPreview(getActiveTemplate(previewType, 'internal'), previewNcal, previewType === 'close') || <span style={{ color: 'var(--text-muted)' }}>Template is empty</span>}
                </div>
              </div>

              {/* Vendor preview (Yellow only or if template exists) */}
              {(previewNcal === 'YELLOW' || getActiveTemplate(previewType, 'vendor')) && (
                <div style={{ marginBottom: '0.875rem' }}>
                  <div className="form-section-title" style={{ marginBottom: 6 }}>
                    Vendor / MO {previewNcal === 'YELLOW' ? '— Yellow Only' : ''}
                  </div>
                  <div className="preview-block" style={{ borderColor: 'var(--info-border)', background: 'var(--info-bg)' }}>
                    {renderPreview(getActiveTemplate(previewType, 'vendor'), previewNcal, previewType === 'close') || <span style={{ color: 'var(--text-muted)' }}>Template is empty</span>}
                  </div>
                </div>
              )}

              {/* Variable Glossary */}
              <div className="var-glossary">
                <div className="var-glossary-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Info size={12} /> Variable Reference</div>
                <div className="var-glossary-grid">
                  <div><b>{'{ncal}'}</b>: Segment + Emoji</div>
                  <div><b>{'{level}'}</b>: Incident Duration Level</div>
                  <div><b>{'{odp}'}</b>: Distribution Name (ODP/Radio)</div>
                  <div><b>{'{odc}'}</b>: Alias for RED (ODC)</div>
                  <div><b>{'{pop}'}</b>: Alias for BLACK (POP)</div>
                  <div><b>{'{osc}'}</b>: Alias for BLACK (OSC)</div>
                  <div><b>{'{bts}'}</b>: Alias for RED (BTS)</div>
                  <div><b>{'{brand}'}</b>: Brand / Site Name</div>
                  <div><b>{'{duration}'}</b>: Downtime duration</div>
                  <div><b>{'{time}'}</b>: Local time (HH:mm)</div>
                  <div><b>{'{date}'}</b>: Date (DD Month YYYY)</div>
                  <div><b>{'{address}'}</b>: Customer address (from master)</div>
                  <div><b>{'{koordinat}'}</b>: Customer coordinates</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
