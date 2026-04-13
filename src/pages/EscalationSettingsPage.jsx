import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Info,
  Save,
  Send,
  Smartphone,
} from 'lucide-react';
import {
  useEscalationSettings,
  useTestEscalationSettings,
  useUpdateEscalationSettings,
} from '../hooks/useSettings.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Button,
  NcalBadge,
  PageHeader,
  PageSpinner,
  SectionCard,
  Select,
  Textarea,
} from '../components/ui/index.jsx';
import { cn } from '../lib/utils.js';

const SEGMENTS = ['BLUE', 'YELLOW', 'ORANGE', 'RED', 'BLACK'];

const DEFAULT_TEMPLATES = (() => {
  const templates = {
    template_open_internal_blue: `N-CAL  : {ncal} - Level {level}\nNomor case : {case_no}\nSite  : {brand}\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\npic: {pic}`,
    template_close_internal_blue: `[CLOSE] {case_no}\n{ncal} - Level {level}\nSite: {brand}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nResolved: {time}`,
    template_open_internal_yellow: `N-CAL  : {ncal} - Level {level}\nNomor case : {case_no}\nSite  : {brand}\nLink Status  : Down\nODP : {odp}\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\nDown Time : {time}\nPIC: {pic}`,
    template_open_vendor_yellow: `Maintenance Order\n{ncal}\nSite : {brand}\nCase Number : {case_no}\nCase Date : {date}\nCustomer Address : {address}\nCustomer Coordinates : {koordinat}\nODP Name : {odp}\nPower RX Onu : {power_rx}\nCable : {kabel}\nTotal Length : {panjang_kabel}\nPIC : {pic}\nProblem : {problem}`,
    template_close_internal_yellow: `[CLOSE] {case_no}\n{ncal} - Level {level}\nSite: {brand}\nLink Status  : Up\nRoot Cause: {root_cause}\nNett Duration: {duration}\nResolved: {time}`,
    template_close_vendor_yellow: `Close Order\n{ncal}\nSite : {brand}\nCase Number : {case_no}\nRoot Cause: {root_cause}\nAction: {action}\nNett: {duration}`,
  };

  ['orange', 'red', 'black'].forEach((segment) => {
    const infraVar = segment === 'orange' ? '{odp}' : segment === 'red' ? '{odc}' : '{osc}/{pop}';
    templates[`template_open_internal_${segment}`] = `N-CAL  : {ncal} - Level {level}\nNomor case : {case_no}\nDistribution : ${infraVar}\nLink Status  : Down\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\nDown Time : {time}\nImpacted Customers :\n{customer_terdampak}`;
    templates[`template_close_internal_${segment}`] = `[CLOSE] {case_no}\n{ncal} - Level {level}\nODP : {odp}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nResolved: {time}`;
  });

  return templates;
})();

const INITIAL_TEMPLATES = (() => {
  const templates = { ...DEFAULT_TEMPLATES };

  SEGMENTS.forEach((segment) => {
    const key = segment.toLowerCase();
    if (!templates[`template_open_internal_${key}`]) templates[`template_open_internal_${key}`] = '';
    if (!templates[`template_open_vendor_${key}`]) templates[`template_open_vendor_${key}`] = '';
    if (!templates[`template_close_internal_${key}`]) templates[`template_close_internal_${key}`] = '';
    if (!templates[`template_close_vendor_${key}`]) templates[`template_close_vendor_${key}`] = '';
  });

  return templates;
})();

function renderPreview(template, ncal) {
  if (!template) return '—';

  let text = template;
  const mock = {
    ncal: `[${ncal}]`,
    case_no: 'C260313-1234',
    company: 'PT Sample Customer',
    brand: 'BRAND SITE A',
    root_cause: 'Fiber Cut',
    problem: 'LOS / High Attenuation',
    action: 'Splicing core #5',
    duration: '01:23:45',
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    address: '123 Business St, Landmark Sq',
    koordinat: '-6.9823, 110.4231',
    odp: 'ODP-SMG-01',
    odc: 'ODC PELABUHAN',
    bts: 'BTS-SMG-01',
    pop: 'POP SEMARANG',
    osc: 'OSC SEMARANG',
    radio: 'RADIO-A',
    power_rx: '-28.5 dBm',
    support_level: 'Level 2',
    level: '2',
    indikasi: 'Damaged patchcord',
    kabel: 'Dropcore 2 Core',
    panjang_kabel: '150m',
    pic: 'Technician B',
    customer_terdampak: '1. ABC Corp\n2. XYZ Limited\n3. Global Solutions',
  };

  Object.keys(mock).forEach((key) => {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), mock[key]);
  });

  return text;
}

export default function EscalationSettingsPage() {
  const { data: escalationData, isLoading: loading } = useEscalationSettings();
  const updateSettings = useUpdateEscalationSettings();
  const testSettings = useTestEscalationSettings();
  const { addToast } = useToast();

  const [cfg, setCfg] = useState({
    type: 'telegram',
    webhook_url: '',
    webhook_url_vendor: '',
    is_active: false,
    template_open: '',
    template_open_vendor: '',
    template_close: '',
    template_close_vendor: '',
    ...INITIAL_TEMPLATES,
  });
  const [previewNcal, setPreviewNcal] = useState('BLUE');
  const [previewType, setPreviewType] = useState('open');

  useEffect(() => {
    if (!escalationData?.id) return;

    const merged = {
      ...INITIAL_TEMPLATES,
      ...escalationData,
      is_active: Boolean(escalationData.is_active),
    };

    Object.keys(DEFAULT_TEMPLATES).forEach((key) => {
      if (!merged[key]) merged[key] = DEFAULT_TEMPLATES[key];
    });

    setCfg((previous) => ({ ...previous, ...merged }));
  }, [escalationData]);

  const setField = (key, value) => {
    setCfg((previous) => ({ ...previous, [key]: value }));
  };

  const handleSave = () => {
    updateSettings.mutate(cfg, {
      onSuccess: () => addToast('Escalation settings saved', 'success'),
      onError: (error) => addToast(error.message, 'error'),
    });
  };

  const handleTest = () => {
    testSettings.mutate(undefined, {
      onSuccess: () => addToast('Test notification sent', 'success'),
      onError: (error) => addToast(error.message, 'error'),
    });
  };

  if (loading) return <PageSpinner />;

  const activeSegment = previewNcal.toLowerCase();
  const internalTemplateKey = `template_${previewType}_internal_${activeSegment}`;
  const vendorTemplateKey = `template_${previewType}_vendor_${activeSegment}`;
  const showVendor = previewNcal === 'YELLOW' || Boolean(cfg[vendorTemplateKey]);

  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden">
      <PageHeader
        title="Escalation Settings"
        subtitle="Configure notification endpoints and message templates for incident opening and closing broadcasts."
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                'inline-flex items-center rounded-md border px-3 py-2 text-xs font-medium',
                cfg.is_active
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-border bg-muted text-muted-foreground'
              )}
            >
              {cfg.is_active ? 'Automation active' : 'Automation paused'}
            </div>
            <Button
              variant="outline"
              icon={<Send className="h-4 w-4" />}
              onClick={handleTest}
              disabled={testSettings.isPending || !cfg.webhook_url}
            >
              {testSettings.isPending ? 'Sending Test' : 'Send Test'}
            </Button>
            <Button
              variant="primary"
              icon={<Save className="h-4 w-4" />}
              onClick={handleSave}
              isLoading={updateSettings.isPending}
            >
              Save Settings
            </Button>
          </div>
        )}
      />

      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="min-h-0 space-y-6 overflow-y-auto pb-6">
          <SectionCard
            title="Core Integration"
            subtitle="Choose the escalation channel, set endpoints, and control whether outbound automation is active."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Platform"
                value={cfg.type}
                onChange={(event) => setField('type', event.target.value)}
              >
                <option value="telegram">Telegram Bot API</option>
                <option value="whatsapp">WhatsApp Business</option>
                <option value="custom">Generic Webhook</option>
              </Select>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">
                  Automation
                </label>
                <label className="inline-flex h-9 items-center gap-3 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={cfg.is_active}
                    onChange={(event) => setField('is_active', event.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                  />
                  Enable outbound escalation
                </label>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <InputField
                label={cfg.type === 'telegram' ? 'Internal Endpoint' : 'Primary Webhook URL'}
                value={cfg.webhook_url || ''}
                onChange={(value) => setField('webhook_url', value)}
                placeholder="https://api.telegram.org/bot..."
              />
              <InputField
                label={cfg.type === 'telegram' ? 'Vendor Endpoint' : 'Vendor Webhook URL'}
                value={cfg.webhook_url_vendor || ''}
                onChange={(value) => setField('webhook_url_vendor', value)}
                placeholder="https://field-ops.example/webhook"
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Template Editor"
            subtitle="Edit internal and vendor message blueprints for each NCAL severity."
            padding={false}
          >
            <div className="border-b p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="NCAL Segment"
                  value={previewNcal}
                  onChange={(event) => setPreviewNcal(event.target.value)}
                >
                  {SEGMENTS.map((segment) => (
                    <option key={segment} value={segment}>
                      {segment}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Template Type"
                  value={previewType}
                  onChange={(event) => setPreviewType(event.target.value)}
                >
                  <option value="open">Open</option>
                  <option value="close">Close</option>
                </Select>
              </div>
            </div>

            <div className="space-y-6 p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <NcalBadge value={previewNcal} />
                  <p className="text-sm font-medium text-foreground">
                    Internal {previewType === 'open' ? 'opening' : 'resolution'} message
                  </p>
                </div>
                <Textarea
                  value={cfg[internalTemplateKey] || ''}
                  onChange={(event) => setField(internalTemplateKey, event.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  wrapperClassName="gap-1"
                />
              </div>

              {showVendor ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-foreground">
                    Vendor {previewType === 'open' ? 'opening' : 'resolution'} message
                  </p>
                  <Textarea
                    value={cfg[vendorTemplateKey] || ''}
                    onChange={(event) => setField(vendorTemplateKey, event.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                    wrapperClassName="gap-1"
                  />
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>

        <div className="min-h-0 xl:sticky xl:top-6">
          <SectionCard
            title="Preview"
            subtitle="Live preview of the selected message using sample incident data."
            className="max-h-[calc(100vh-12rem)]"
          >
            <div className="space-y-6 overflow-y-auto">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {previewType === 'open' ? 'Opening broadcast' : 'Resolution broadcast'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sample render for the currently selected template
                    </p>
                  </div>
                </div>
                <NcalBadge value={previewNcal} />
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Internal channel
                  </p>
                  <div className="rounded-xl border border-border bg-card p-4 font-mono text-sm leading-6 whitespace-pre-wrap text-foreground">
                    {renderPreview(cfg[internalTemplateKey], previewNcal)}
                  </div>
                </div>

                {showVendor ? (
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground">
                      Vendor channel
                    </p>
                    <div className="rounded-xl border border-border bg-card p-4 font-mono text-sm leading-6 whitespace-pre-wrap text-foreground">
                      {renderPreview(cfg[vendorTemplateKey], previewNcal)}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Info className="h-4 w-4 text-primary" />
                  Available placeholders
                </div>
                <div className="space-y-2">
                  {[
                    ['{ncal}', 'NCAL severity'],
                    ['{level}', 'support level'],
                    ['{case_no}', 'incident number'],
                    ['{brand}', 'brand or site name'],
                    ['{root_cause}', 'final root cause'],
                    ['{duration}', 'net duration'],
                    ['{time}', 'execution time'],
                  ].map(([token, description]) => (
                    <div key={token} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
                      <code className="font-mono text-primary">{token}</code>
                      <span className="text-muted-foreground">{description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Keep templates short and operational. Long payloads tend to be ignored during active incident handling.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 font-mono text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
