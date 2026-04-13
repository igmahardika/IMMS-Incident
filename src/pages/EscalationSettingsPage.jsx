import React, { useEffect, useState } from 'react';
import { useEscalationSettings, useUpdateEscalationSettings, useTestEscalationSettings } from '../hooks/useSettings.js';
import { useToast } from '../context/ToastContext.jsx';
import { PageSpinner, SectionCard, Button, Input, Spinner, Select } from '../components/ui/index.jsx';
import { Save, Send, Settings, Smartphone, Info, Circle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils.js';

// Global icon stroke standard
const ICON_ST = 2;
const ICON_HD = 2.5;
const SEGMENTS_RAW = ['blue', 'yellow', 'orange', 'red', 'black'];
const DEFAULT_TEMPLATES = (() => {
  const templates = {
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
    templates[`template_open_internal_${seg}`] = `N-CAL  : {ncal} - Level {level}\nNomor case : {case_no}\n${infraLabel} : ${infraVar}\nLink Status  : Down\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\nDown Time : {time}\nImpacted Customers :\n{customer_terdampak}`;
    templates[`template_close_internal_${seg}`] = `[CLOSE] {case_no}\n{ncal} - Level {level}\nODP : {odp}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nResolved: {time}`;
  });

  return templates;
})();

const INITIAL_TEMPLATES = (() => {
  const templates = { ...DEFAULT_TEMPLATES };
  SEGMENTS_RAW.forEach(segment => {
    if (!templates[`template_open_internal_${segment}`]) templates[`template_open_internal_${segment}`] = '';
    if (!templates[`template_open_vendor_${segment}`]) templates[`template_open_vendor_${segment}`] = '';
    if (!templates[`template_close_internal_${segment}`]) templates[`template_close_internal_${segment}`] = '';
    if (!templates[`template_close_vendor_${segment}`]) templates[`template_close_vendor_${segment}`] = '';
  });
  return templates;
})();

export default function EscalationSettingsPage() {
  const { data: escalationData, isLoading: loading } = useEscalationSettings();
  const updateSettings = useUpdateEscalationSettings();
  const testSettings = useTestEscalationSettings();

  const [cfg, setCfg] = useState({
    type: 'telegram',
    webhook_url: '',
    webhook_url_vendor: '',
    is_active: false,
    template_open: '',
    template_open_vendor: '',
    template_close: '',
    template_close_vendor: '',
    ...INITIAL_TEMPLATES
  });
  
  const { addToast } = useToast();
  const [previewNcal, setPreviewNcal] = useState('BLUE');
  const [previewType, setPreviewType] = useState('open');
  const setF = (k, v) => setCfg(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (escalationData && escalationData.id) {
      const merged = { ...escalationData, is_active: !!escalationData.is_active };
      Object.keys(DEFAULT_TEMPLATES).forEach(k => { if (!merged[k]) merged[k] = DEFAULT_TEMPLATES[k]; });
      setCfg(prev => ({ ...prev, ...merged }));
    }
  }, [escalationData]);

  const handleSave = () => {
    updateSettings.mutate(cfg, {
      onSuccess: () => addToast('Configuration saved successfully', 'success'),
      onError: (e) => addToast(e.message, 'error')
    });
  };
  const handleTest = () => {
    testSettings.mutate(undefined, {
      onSuccess: () => addToast('Test message sent!', 'success'),
      onError: (e) => addToast(e.message, 'error')
    });
  };

  const renderPreview = (template, ncal) => {
    if (!template) return '—';

    // We can't safely inject React nodes into the preview string, so we use a compact text label instead.
    // The color/icon are rendered by the surrounding preview shell.
    // This keeps the preview readable without mixing HTML into the template.
    // let's just make the preview render the icon OUTSIDE the string, or just use text if inside.
    // Actually, since the template uses `{ncal}` directly in the string, we can't easily inject React nodes.
    // Let's strip `{ncal}` and put a nice header above the preview instead! 
    // Wait, the template string might literally say "N-CAL  : {ncal}". Let's replace `{ncal}` with just the string `[${ncal}]` for text view.
    let label = `[${ncal}]`;

    const infraMock = ncal === 'RED' ? 'ODC PELABUHAN' : ncal === 'BLACK' ? 'POP SEMARANG' : 'ODP-SMG-01';
    const mock = {
      ncal: label, case_no: 'C260313-1234', company: 'PT Sample Customer',
      brand: 'BRAND SITE A', root_cause: 'Fiber Cut', problem: 'LOS / High Attenuation',
      action: 'Splicing core #5', duration: '01:23:45',
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
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
    <div className="flex flex-col gap-6 h-full font-sans">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase">Webhook Escalation</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">Automated incident broadcasting & response protocols</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="ghost" size="sm" onClick={handleTest} disabled={testSettings.isPending || !cfg.webhook_url} className="font-bold text-[9px] tracking-widest" aria-label="Send test notification" title="Send Test">
            <Send size={12} strokeWidth={ICON_ST} /> {testSettings.isPending ? 'DISPATCHING...' : 'GLOBAL TEST'}
          </Button>
          <Button size="sm" onClick={handleSave} isLoading={updateSettings.isPending} className="font-black text-[9px] tracking-widest px-6 shadow-xl shadow-primary/20" aria-label="Save escalation configuration" title="Save Configuration">
            <Save size={12} strokeWidth={ICON_HD} /> SAVE CONFIGURATION
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Left: config form */}
        <div className="flex flex-col gap-6">
          <SectionCard 
            title="Core Integration" 
            subtitle="Notification endpoints & lifecycle enforcement" 
            icon={<Settings size={16} strokeWidth={ICON_HD} className="text-primary" />}
            headerAction={
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all",
                cfg.is_active ? "bg-success/10 border-success/20 text-success" : "bg-foreground/5 border-foreground/10 text-foreground/30"
              )}>
                <div className={cn("w-1 h-1 rounded-full", cfg.is_active ? "bg-success animate-pulse" : "bg-foreground/20")} />
                {cfg.is_active ? 'System Live' : 'Maintenance'}
              </div>
            }
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="font-black text-[10px] uppercase tracking-widest text-foreground/40 ml-1">Platform Architecture</label>
                  <Select 
                    className="flex h-9 w-full rounded-md border border-foreground/10 bg-foreground/[0.03] px-3 py-1 text-[11px] font-bold shadow-sm focus:ring-1 focus:ring-primary transition-all uppercase tracking-tight" 
                    value={cfg.type} 
                    onChange={e => setF('type', e.target.value)}
                  >
                    <option value="telegram" className="bg-background">Telegram Bot API</option>
                    <option value="whatsapp" className="bg-background">WhatsApp Business Protocol</option>
                    <option value="custom" className="bg-background">Generic Webhook (JSON)</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-black text-[10px] uppercase tracking-widest text-foreground/40 ml-1">Traffic Routing</label>
                  <div className="flex items-center h-9 bg-foreground/[0.02] border border-dashed border-foreground/10 rounded-md px-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/20">
                        <input
                          type="checkbox" 
                          id="broadcast-automation"
                          className="peer sr-only"
                          checked={!!cfg.is_active}
                          onChange={e => setF('is_active', e.target.checked)}
                        />
                        <div className="h-4 w-8 rounded-full bg-foreground/10 transition-colors peer-checked:bg-primary shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)]" />
                        <div className="absolute left-0.5 h-3 w-3 rounded-full bg-white transition-all peer-checked:translate-x-4 shadow-sm" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 peer-checked:text-foreground transition-colors">Broadcast Automation</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <Input 
                  label={cfg.type === 'telegram' ? "Internal Group Endpoint (Bot API Token / Chat ID)" : "Production Webhook URL"} 
                  value={cfg.webhook_url || ''} 
                  onChange={e => setF('webhook_url', e.target.value)}
                  placeholder="https://api.telegram.org/bot..."
                  className="font-mono text-[10px]"
                />
                <Input 
                  label={cfg.type === 'telegram' ? "Vendor / Field Force Endpoint" : "Deployment Webhook URL"} 
                  value={cfg.webhook_url_vendor || ''} 
                  onChange={e => setF('webhook_url_vendor', e.target.value)}
                  placeholder="https://field-ops.enterprise/..."
                  className="font-mono text-[10px]"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard 
            title="Message Blueprints" 
            subtitle="Payload definitions per NCAL severitiy levels" 
            padding={false}
          >
            {/* NCAL Tab Bar */}
            <div className="flex bg-foreground/[0.03] p-1 gap-1 border-b border-foreground/5">
              {segments.map(seg => (
                <button
                  key={seg}
                  className={cn(
                    "flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-md",
                    previewNcal === seg 
                      ? "bg-background text-primary shadow-sm border border-foreground/5" 
                      : "text-foreground/30 hover:text-foreground/50"
                  )}
                  onClick={() => setPreviewNcal(seg)}
                  aria-label={`Preview ${seg} level templates`}
                >
                  {seg}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 rounded bg-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60 italic">Opening Manifest — {previewNcal}</span>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-black text-[9px] uppercase tracking-widest text-foreground/40 ml-1">Internal Channel Payload</label>
                    <textarea
                      className="flex w-full rounded-md border border-foreground/10 bg-foreground/[0.01] px-4 py-3 text-[11px] font-mono leading-relaxed shadow-sm focus:ring-1 focus:ring-primary min-h-[160px] custom-scrollbar" 
                      value={cfg[`template_open_internal_${previewNcal.toLowerCase()}`] || cfg.template_open || ''}
                      onChange={e => setF(`template_open_internal_${previewNcal.toLowerCase()}`, e.target.value)}
                    />
                  </div>
                  {(previewNcal === 'YELLOW' || getActiveTemplate('open', 'vendor')) && (
                    <div className="flex flex-col gap-1.5">
                      <label className="font-black text-[9px] uppercase tracking-widest text-foreground/40 ml-1">Vendor / MO Protocol</label>
                      <textarea
                        className="flex w-full rounded-md border border-foreground/10 bg-warning/5 px-4 py-3 text-[11px] font-mono leading-relaxed shadow-sm focus:ring-1 focus:ring-warning min-h-[160px] custom-scrollbar" 
                        value={cfg[`template_open_vendor_${previewNcal.toLowerCase()}`] || cfg.template_open_vendor || ''}
                        onChange={e => setF(`template_open_vendor_${previewNcal.toLowerCase()}`, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-foreground/5 bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 rounded bg-success" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60 italic">Resolution Manifest — {previewNcal}</span>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-black text-[9px] uppercase tracking-widest text-foreground/40 ml-1">Internal Resolution Payload</label>
                    <textarea
                      className="flex w-full rounded-md border border-foreground/10 bg-foreground/[0.01] px-4 py-3 text-[11px] font-mono leading-relaxed shadow-sm focus:ring-1 focus:ring-success min-h-[160px] custom-scrollbar" 
                      value={cfg[`template_close_internal_${previewNcal.toLowerCase()}`] || cfg.template_close || ''}
                      onChange={e => setF(`template_close_internal_${previewNcal.toLowerCase()}`, e.target.value)}
                    />
                  </div>
                  {(previewNcal === 'YELLOW' || getActiveTemplate('close', 'vendor')) && (
                    <div className="flex flex-col gap-1.5">
                      <label className="font-black text-[9px] uppercase tracking-widest text-foreground/40 ml-1">Vendor Clearance Manifest</label>
                      <textarea
                        className="flex w-full rounded-md border border-foreground/10 bg-success/5 px-4 py-3 text-[11px] font-mono leading-relaxed shadow-sm focus:ring-1 focus:ring-success min-h-[160px] custom-scrollbar" 
                        value={cfg[`template_close_vendor_${previewNcal.toLowerCase()}`] || cfg.template_close_vendor || ''}
                        onChange={e => setF(`template_close_vendor_${previewNcal.toLowerCase()}`, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Right: Simulation Engine */}
        <div className="xl:sticky xl:top-6 flex flex-col gap-6">
          <SectionCard 
            title="Protocol Simulation" 
            subtitle="Live mobile device visualization" 
            icon={<Smartphone size={16} className="text-primary" />}
            padding={false}
          >
            <div className="p-4 border-b border-foreground/5 bg-foreground/[0.02]">
              <div className="flex bg-foreground/[0.05] p-0.5 rounded-md">
                {['open', 'close'].map(t => (
                  <button
                    key={t}
                    onClick={() => setPreviewType(t)}
                    className={cn(
                      "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
                      previewType === t ? "bg-background text-primary shadow-sm" : "text-foreground/40 hover:text-foreground/60"
                    )}
                    aria-label={`Toggle simulation to ${t}`}
                  >
                    {t === 'open' ? 'Deployment' : 'Resolution'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Internal Channel Mock */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className="w-1 h-3 rounded bg-primary/40" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 italic">Coordination Channel</span>
                   </div>
                   {(() => {
                      const ncalColorsMap = { BLACK: 'text-foreground/80', RED: 'text-error', ORANGE: 'text-orange-500', YELLOW: 'text-warning', BLUE: 'text-info' };
                      const colorClass = previewType === 'close' ? 'text-success' : (ncalColorsMap[previewNcal] || 'text-foreground/80');
                      return (
                        <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest", previewType === 'close' ? "bg-success/5 border-success/10 text-success" : "bg-foreground/5 border-foreground/10 " + colorClass)}>
                          {previewType === 'close' ? <CheckCircle2 size={10} /> : <Circle size={10} fill="currentColor" />}
                          {previewNcal}
                        </div>
                      );
                   })()}
                </div>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity blur" />
                  <div className="relative bg-background border border-foreground/10 rounded-lg p-5 font-mono text-[10px] leading-relaxed whitespace-pre-wrap shadow-2xl">
                    {renderPreview(getActiveTemplate(previewType, 'internal'), previewNcal, previewType === 'close') || <span className="text-foreground/20 italic font-sans">[ No Template Defined ]</span>}
                  </div>
                </div>
              </div>

              {/* Vendor Channel Mock */}
              {(previewNcal === 'YELLOW' || getActiveTemplate(previewType, 'vendor')) && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 rounded bg-warning/40" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 italic">Vendor Field Protocol</span>
                  </div>
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-warning/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity blur" />
                    <div className="relative bg-warning/[0.03] border border-warning/10 rounded-lg p-5 font-mono text-[10px] leading-relaxed whitespace-pre-wrap shadow-xl text-warning/90">
                      {renderPreview(getActiveTemplate(previewType, 'vendor'), previewNcal, previewType === 'close') || <span className="text-warning/20 italic font-sans">[ No Template Defined ]</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Data Directive Guide */}
              <div className="pt-6 border-t border-foreground/5">
                <div className="flex items-center gap-2 mb-4">
                  <Info size={14} className="text-primary/60" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">Dynamic Directives</span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    ['{ncal}', 'NCAL Status Icon'],
                    ['{level}', 'Service Priority Level'],
                    ['{case_no}', 'Incident Tracking Number'],
                    ['{brand}', 'Customer Brand / Site Name'],
                    ['{odp}', 'Infrastructure ID (ODP/ODC)'],
                    ['{duration}', 'Elapsed Settlement Time'],
                    ['{time}', 'Timestamp of Event Execution']
                  ].map(([v, d]) => (
                    <div key={v} className="flex justify-between items-center py-2 px-3 rounded bg-foreground/[0.02] border border-foreground/[0.02] group hover:bg-foreground/[0.04] transition-colors">
                      <code className="text-[10px] font-black text-primary font-mono">{v}</code>
                      <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest group-hover:text-foreground/60 transition-colors">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
