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
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <div className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings size={18} />
            Escalation Settings
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-base-content/40">Configure automated notifications via Webhook endpoints</div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="btn btn-ghost btn-sm flex-1 md:flex-none" onClick={handleTest} disabled={testing || !cfg.webhook_url}>
            <Send size={18} /> {testing ? 'Sending...' : 'Global Test'}
          </button>
          <button className="btn btn-primary btn-sm md:btn-md flex-1 md:flex-none" onClick={handleSave}>
            <Save size={18} /> <span className="hidden md:inline">Save Configuration</span><span className="md:hidden">Save</span>
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Left: config form */}
        <div className="flex flex-col gap-6">
          {/* Webhook config */}
          <div className="bg-base-100 shadow-xl rounded-lg overflow-hidden">
            <div className="p-4 md:p-8 bg-base-200/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-lg md:text-xl font-bold tracking-tight text-base-content">Core Configuration</h1>
                  <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] text-base-content/30 mt-1">Notification endpoints & Global Status</p>
                </div>
                {/* Active status indicator */}
                <div className={`flex items-center self-start md:self-auto gap-2 px-3 py-1.5 rounded-full transition-all ${cfg.is_active ? 'bg-success/10 text-success' : 'bg-base-300/30 text-base-content/30'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${cfg.is_active ? 'bg-success animate-pulse' : 'bg-base-content/10'}`} />
                  <span className="text-[9px] md:text-[10px] font-bold tracking-[0.15em] uppercase">
                    {cfg.is_active ? 'Live' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-8 space-y-6 md:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="form-control w-full">
                  <label className="label pt-0"><span className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Integration Platform</span></label>
                  <select className="select select-bordered select-md w-full font-bold text-[13.5px] tracking-tight h-12 rounded-lg" value={cfg.type} onChange={e => setF('type', e.target.value)}>
                    <option value="telegram">Telegram Protocol</option>
                    <option value="whatsapp">WhatsApp Business API</option>
                    <option value="custom">Standard Webhook (JSON)</option>
                  </select>
                </div>
                <div className="form-control w-full">
                  <label className="label pt-0"><span className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Service Enforcement</span></label>
                  <div className="flex items-center h-12">
                    <label className="label cursor-pointer justify-start gap-4 p-0">
                      <input
                        type="checkbox" 
                        className="toggle toggle-primary toggle-sm"
                        checked={!!cfg.is_active}
                        onChange={e => setF('is_active', e.target.checked)}
                      />
                      <span className="label-text text-[13.5px] font-bold tracking-tight text-base-content/70">Enable automated event pushing</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label pb-2">
                  <span className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">
                    {cfg.type === 'telegram' ? 'Internal Coordination Endpoint' : 'Internal Webhook Resource'}
                  </span>
                </label>
                <input
                  type="url" 
                  className="input input-bordered input-md w-full font-mono font-bold text-[12px] h-12 rounded-lg bg-base-200/30 focus:bg-base-100 transition-all font-bold"
                  value={cfg.webhook_url || ''}
                  onChange={e => setF('webhook_url', e.target.value)}
                  placeholder="https://core-api.v1/..."
                />
              </div>

              <div className="form-control w-full">
                <label className="label pb-2">
                  <span className="label-text text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">
                    {cfg.type === 'telegram' ? 'Vendor / Operation Endpoint' : 'External Webhook Resource'}
                  </span>
                </label>
                <input
                  type="url" 
                  className="input input-bordered input-md w-full font-mono font-bold text-[12px] h-12 rounded-lg bg-base-200/30 focus:bg-base-100 transition-all font-bold"
                  value={cfg.webhook_url_vendor || ''}
                  onChange={e => setF('webhook_url_vendor', e.target.value)}
                  placeholder="https://vendor-api.v1/..."
                />
              </div>
            </div>
          </div>

          {/* Template editing */}
          <div className="bg-base-100 shadow-sm rounded-lg overflow-hidden">
            <div className="p-6 bg-base-200/30">
              <h3 className="text-base font-bold">Message Templates</h3>
              <p className="text-xs opacity-60">OPEN & CLOSE message templates per NCAL segment</p>
            </div>
            <div className="p-0">
              {/* Tab bar */}
              <div className="flex bg-base-200 p-2 gap-1 overflow-x-auto no-scrollbar">
                {segments.map(seg => (
                  <button
                    key={seg}
                    className={`px-6 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase transition-all rounded-lg ${
                      previewNcal === seg 
                        ? 'bg-primary text-primary-content shadow-lg shadow-primary/20' 
                        : 'text-base-content/40 hover:bg-base-300 hover:text-base-content/60'
                    }`}
                    onClick={() => setPreviewNcal(seg)}
                  >
                    {seg}
                  </button>
                ))}
              </div>

              <div className="p-4 md:p-8 space-y-6 md:space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-5 bg-primary rounded-full" />
                    <span className="text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Deployment Template — {previewNcal}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <label className="form-control w-full">
                      <div className="label pt-0"><span className="label-text text-[10px] font-bold text-base-content/30 uppercase tracking-[0.15em]">Internal Coordination Payload</span></div>
                      <textarea
                        className="textarea textarea-bordered w-full font-mono font-bold text-[12px] leading-relaxed bg-base-200/30 focus:bg-base-100 transition-all rounded-lg" 
                        rows={6}
                        value={cfg[`template_open_internal_${previewNcal.toLowerCase()}`] || cfg.template_open || ''}
                        onChange={e => setF(`template_open_internal_${previewNcal.toLowerCase()}`, e.target.value)}
                        placeholder="Define internal notification schema..."
                      />
                    </label>
                    {previewNcal === 'YELLOW' && (
                      <label className="form-control w-full">
                        <div className="label pt-0"><span className="label-text text-[10px] font-bold text-base-content/30 uppercase tracking-[0.15em]">Vendor / MO Protocol</span></div>
                        <textarea
                          className="textarea textarea-bordered w-full font-mono font-bold text-[12px] leading-relaxed bg-base-200/30 focus:bg-base-100 transition-all rounded-lg" 
                          rows={6}
                          value={cfg[`template_open_vendor_${previewNcal.toLowerCase()}`] || cfg.template_open_vendor || ''}
                          onChange={e => setF(`template_open_vendor_${previewNcal.toLowerCase()}`, e.target.value)}
                          placeholder="Define vendor maintenance order schema..."
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="divider opacity-10"></div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-5 bg-success rounded-full" />
                    <span className="text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Resolution Template — {previewNcal}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <label className="form-control w-full">
                      <div className="label pt-0"><span className="label-text text-[10px] font-bold text-base-content/30 uppercase tracking-[0.15em]">Internal Resolution Payload</span></div>
                      <textarea
                        className="textarea textarea-bordered w-full font-mono font-bold text-[12px] leading-relaxed bg-base-200/30 focus:bg-base-100 transition-all rounded-lg" 
                        rows={6}
                        value={cfg[`template_close_internal_${previewNcal.toLowerCase()}`] || cfg.template_close || ''}
                        onChange={e => setF(`template_close_internal_${previewNcal.toLowerCase()}`, e.target.value)}
                        placeholder="Define internal resolution schema..."
                      />
                    </label>
                    {previewNcal === 'YELLOW' && (
                      <label className="form-control w-full">
                        <div className="label pt-0"><span className="label-text text-[10px] font-bold text-base-content/30 uppercase tracking-[0.15em]">Vendor Clearance Protocol</span></div>
                        <textarea
                          className="textarea textarea-bordered w-full font-mono font-bold text-[12px] leading-relaxed bg-base-200/30 focus:bg-base-100 transition-all rounded-lg" 
                          rows={6}
                          value={cfg[`template_close_vendor_${previewNcal.toLowerCase()}`] || cfg.template_close_vendor || ''}
                          onChange={e => setF(`template_close_vendor_${previewNcal.toLowerCase()}`, e.target.value)}
                          placeholder="Define vendor clearance schema..."
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="alert alert-info bg-info/10 text-info-content rounded-lg p-3">
                  <Info size={16} />
                  <span className="text-xs font-medium">Empty fields will automatically fall back to the Global Template.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: sticky preview */}
        <div className="lg:sticky lg:top-6 h-fit">
          <div className="bg-base-100 shadow-xl rounded-lg overflow-hidden">
            <div className="p-6 bg-base-200/30">
               <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="card-title text-base font-bold flex items-center gap-2"><Smartphone size={18} className="text-primary" /> Preview</h3>
                  <p className="text-xs opacity-60">Mobile notification view</p>
                </div>
                <div className="join bg-base-200/50 p-1 rounded-lg">
                  {['open', 'close'].map(t => (
                    <button
                      key={t}
                      onClick={() => setPreviewType(t)}
                      className={`btn btn-xs join-item border-none ${previewType === t ? 'btn-primary shadow-sm' : 'bg-transparent opacity-60'}`}
                      
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-8 space-y-8">
              {/* NCAL selector */}
              <div className="flex flex-wrap gap-2">
                {segments.map(n => (
                  <button
                    key={n}
                    onClick={() => setPreviewNcal(n)}
                    className={`btn btn-xs rounded-lg border-none h-8 px-4 transition-all ${previewNcal === n ? 'btn-primary shadow-lg shadow-primary/20' : 'bg-base-300 text-base-content/40 hover:bg-base-content/10'} font-bold text-[10px] tracking-[0.15em]`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {/* Internal preview */}
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em] flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  Internal Simulation
                </div>
                <div className="bg-base-200/50 rounded-lg p-5 font-mono text-xs leading-relaxed border-none whitespace-pre-wrap break-words min-h-[160px] text-base-content/80 shadow-inner">
                  {renderPreview(getActiveTemplate(previewType, 'internal'), previewNcal, previewType === 'close') || <span className="opacity-20 italic">No template defined</span>}
                </div>
              </div>

              {/* Vendor preview (Yellow only or if template exists) */}
              {(previewNcal === 'YELLOW' || getActiveTemplate(previewType, 'vendor')) && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em] flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-warning" />
                    Vendor Simulation
                  </div>
                  <div className="bg-warning/5 rounded-lg p-5 font-mono text-xs leading-relaxed border-none whitespace-pre-wrap break-words min-h-[160px] text-warning/80 shadow-inner">
                    {renderPreview(getActiveTemplate(previewType, 'vendor'), previewNcal, previewType === 'close') || <span className="opacity-20 italic">No template defined</span>}
                  </div>
                </div>
              )}

              {/* Variable Glossary */}
               <div className="bg-primary/5 rounded-lg p-6">
                <div className="text-[10px] font-bold text-primary uppercase tracking-[0.15em] flex items-center gap-2 mb-4">
                  <Info size={14} /> Data Directives
                </div>
                <div className="grid grid-cols-1 gap-2 text-[11px] font-bold">
                  {[
                    ['{ncal}', 'Segment Icon'],
                    ['{level}', 'Service Prio'],
                    ['{odp}', 'Infra ID'],
                    ['{brand}', 'Site Name'],
                    ['{duration}', 'Time Metric'],
                    ['{time}', 'Local Time'],
                  ].map(([v, d]) => (
                    <div key={v} className="flex justify-between items-center py-1.5 last:border-0">
                      <span className="font-mono text-primary bg-primary/10 px-1.5 rounded">{v}</span>
                      <span className="text-base-content/30 uppercase tracking-[0.15em] text-[10px] font-bold">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
