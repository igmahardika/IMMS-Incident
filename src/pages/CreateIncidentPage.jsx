import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  Network,
  Plus,
  Save,
  Search,
  Send,
  X,
} from 'lucide-react';
import { api } from '../utils/api.js';
import { formatDateTime, getIncidentDisplayName } from '../utils/incidentUtils.js';
import { incidentService } from '../services/incidentService.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Button,
  Input,
  NcalBadge,
  PageHeader,
  SectionCard,
  Select,
  Textarea,
} from '../components/ui/index.jsx';
import { cn } from '../lib/utils.js';

const NCAL_OPTIONS = ['BLUE', 'YELLOW', 'ORANGE', 'RED', 'BLACK'];
const LEVEL_OPTIONS = [
  { value: '1', label: 'Level 1' },
  { value: '2', label: 'Level 2' },
  { value: '3', label: 'Level 3' },
  { value: '4', label: 'Level 4' },
];

function DropdownSurface({ children, className = '' }) {
  return (
    <div
      className={cn(
        'absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 rounded-lg border border-border bg-popover p-2 shadow-lg',
        className
      )}
    >
      {children}
    </div>
  );
}

function PreviewItem({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="text-sm font-medium text-foreground">
            {value || '—'}
          </p>
        </div>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </div>
    </div>
  );
}

export default function CreateIncidentPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    case_no: '',
    start_time: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16),
    customer_id: '',
    company_name: '',
    brand_site: '',
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [customersResponse, distribusiResponse] = await Promise.all([
          api.getCustomers(),
          api.getDistribusi(),
        ]);
        setCustomers(customersResponse);
        setDistribusi(distribusiResponse);

        if (isEdit) {
          const incident = await api.getIncident(id);
          if (incident) {
            setForm({
              ...incident,
              start_time: incident.start_time
                ? new Date(incident.start_time).toISOString().slice(0, 16)
                : '',
            });
            setSearch(incident.brand_site || incident.company_name || '');
            if (['ORANGE', 'RED', 'BLACK'].includes(incident.ncal)) {
              setDistForm({
                selectedItems: incident.odp_bts ? incident.odp_bts.split(', ') : [],
              });
            }
          }
        } else {
          const draft = localStorage.getItem('imms_incident_draft');
          if (draft) {
            const { form: draftForm, dist: draftDist, search: draftSearch } = JSON.parse(draft);
            setForm((previous) => ({
              ...previous,
              ...draftForm,
              start_time: previous.start_time,
            }));
            setDistForm(draftDist || { selectedItems: [] });
            setSearch(draftSearch || '');
            addToast('Protocol draft restored', 'info');
          }
        }
      } catch (error) {
        addToast(error.message, 'error');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [addToast, id, isEdit]);

  useEffect(() => {
    if (isEdit || loadingData) return undefined;

    const timeoutId = window.setTimeout(() => {
      localStorage.setItem(
        'imms_incident_draft',
        JSON.stringify({ form, dist: distForm, search })
      );
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [form, distForm, search, isEdit, loadingData]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!event.target.closest('.custom-dropdown-container')) {
        setShowDropdown(false);
        setShowDistDropdown(false);
        setShowOdpDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const isDistribusi = ['ORANGE', 'RED', 'BLACK'].includes(form.ncal);

  const filteredCustomers = useMemo(
    () => customers.filter((customer) => (
      (customer.brand_site || '').toLowerCase().includes(search.toLowerCase()) ||
      (customer.company_name || '').toLowerCase().includes(search.toLowerCase())
    )),
    [customers, search]
  );

  const combinedOptions = useMemo(
    () => incidentService.getCombinedOptions(form.ncal, distribusi),
    [distribusi, form.ncal]
  );

  const yellowDistOptions = useMemo(
    () => [...new Set([
      ...distribusi.filter((item) => item.type === 'Fiber Optic').map((item) => item.level_4),
      ...distribusi.filter((item) => item.type === 'Wireless').map((item) => item.level_2),
    ])]
      .filter(Boolean)
      .sort(),
    [distribusi]
  );

  const customerCoverageOptions = useMemo(() => (
    customers
      .find((customer) => customer.id === form.customer_id)?.link_coverage
      ?.split('\n')
      .filter(Boolean) || []
  ), [customers, form.customer_id]);

  const filteredOdpOptions = useMemo(
    () => [
      ...(form.ncal === 'YELLOW' ? yellowDistOptions : []),
      ...(!isDistribusi ? customerCoverageOptions : []),
    ].filter((option) => option.toLowerCase().includes(odpSearch.toLowerCase())),
    [customerCoverageOptions, form.ncal, isDistribusi, odpSearch, yellowDistOptions]
  );

  const filteredDistributionOptions = useMemo(
    () => combinedOptions.filter((option) => (
      !distForm.selectedItems.includes(option.value) &&
      option.searchKey.toLowerCase().includes(distSearch.toLowerCase())
    )),
    [combinedOptions, distForm.selectedItems, distSearch]
  );

  const handleCustomerSelect = (customer) => {
    let autoLevel = '2';
    if (customer.support_level) {
      const match = String(customer.support_level).match(/\d+/);
      if (match) autoLevel = match[0];
    }

    setForm((previous) => ({
      ...previous,
      customer_id: customer.id,
      company_name: customer.company_name,
      brand_site: customer.brand_site,
      sla: customer.grade,
      address_preview: customer.address || '',
      level_support: autoLevel,
    }));
    setSearch(customer.brand_site);
    setShowDropdown(false);
  };

  const toggleDistributionItem = (item) => {
    setDistForm((previous) => ({
      ...previous,
      selectedItems: previous.selectedItems.includes(item)
        ? previous.selectedItems.filter((selected) => selected !== item)
        : [...previous.selectedItems, item],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.case_no.trim()) {
      addToast('TICKET_ID required', 'warning');
      return;
    }
    if (!form.initial_problem.trim()) {
      addToast('PROBLEM_DESC required', 'warning');
      return;
    }

    if (isDistribusi && form.ncal === 'ORANGE' && distForm.selectedItems.length === 0) {
      addToast('Assign at least one NODE for ORANGE protocol', 'warning');
      return;
    }

    if (!isDistribusi && !form.customer_id) {
      addToast('Define target NODE for LAN/LASTMILE sequence', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form };
      if (isDistribusi) {
        payload.customer_id = null;
        payload.odp_bts = distForm.selectedItems.join(', ');
      } else if (form.ncal === 'YELLOW') {
        payload.odp_bts = form.odp_bts === 'MANUAL_INPUT' ? form.distribusi_manual : form.odp_bts;
      }

      if (isEdit) {
        await api.updateIncident(id, payload);
        addToast('Incident record refined', 'success');
      } else {
        await api.createIncident(payload);
        addToast('Incident protocol initialized', 'success');
        localStorage.removeItem('imms_incident_draft');
      }

      navigate(isEdit ? `/incidents/${id}` : '/incidents');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const previewNode = isDistribusi
    ? (distForm.selectedItems.length > 0 ? distForm.selectedItems.join(', ') : '')
    : getIncidentDisplayName(form);

  const previewHash = `${form.case_no || 'TICKET-NULL'} • ${formatDateTime(form.start_time)}`;

  if (loadingData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading incident data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <PageHeader
        title={isEdit ? 'Edit Incident' : 'Create Incident'}
        subtitle={isEdit
          ? `Update the incident record for ${form.case_no || 'this ticket'}.`
          : 'Register a new incident with customer, topology, and technical impact details.'}
        action={(
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
            <Button
              type="submit"
              form="incident-form"
              isLoading={loading}
              icon={isEdit ? <Save className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            >
              {isEdit ? 'Save Changes' : 'Submit Incident'}
            </Button>
          </div>
        )}
      />

      <div className="flex-1 overflow-y-auto pb-6">
        <form
          id="incident-form"
          onSubmit={handleSubmit}
          className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_380px]"
        >
          <div className="space-y-6">
            <SectionCard
              title="Incident Basics"
              subtitle="Define the ticket identity, start time, and NCAL segment."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  id="case_no"
                  label="Ticket ID"
                  placeholder="C24XXXX-XXX"
                  value={form.case_no}
                  onChange={(event) => setField('case_no', event.target.value.toUpperCase())}
                  required
                  className="font-mono"
                />

                <Input
                  id="start_time"
                  label="Start Time"
                  type="datetime-local"
                  value={form.start_time}
                  onChange={(event) => setField('start_time', event.target.value)}
                  required
                  className="font-mono"
                />

                <Select
                  id="ncal"
                  label="NCAL Segment"
                  value={form.ncal}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setForm((previous) => {
                      const updated = { ...previous, ncal: nextValue };
                      if (['ORANGE', 'RED', 'BLACK'].includes(nextValue)) {
                        updated.customer_id = '';
                        updated.company_name = '';
                        updated.brand_site = '';
                        updated.sla = '';
                      }
                      return updated;
                    });
                    setSearch('');
                    setShowDropdown(false);
                    setShowOdpDropdown(false);
                    if (!['ORANGE', 'RED', 'BLACK'].includes(nextValue)) {
                      setDistForm({ selectedItems: [] });
                    }
                  }}
                  required
                >
                  {NCAL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
            </SectionCard>

            <SectionCard
              title="Target & Topology"
              subtitle="Choose the affected customer or topology node based on the selected NCAL."
            >
              {!isDistribusi ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="custom-dropdown-container relative space-y-2">
                    <label
                      htmlFor="customer-search"
                      className="text-sm font-medium text-foreground"
                    >
                      {form.ncal === 'BLUE' ? 'Installation Site' : 'Target Entity'}
                    </label>

                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="customer-search"
                        type="text"
                        className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-10 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Search customer or site..."
                        value={search}
                        onChange={(event) => {
                          setSearch(event.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                      />
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>

                    {showDropdown ? (
                      <DropdownSurface className="max-h-80 overflow-y-auto">
                        {filteredCustomers.length === 0 ? (
                          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                            No customer matched your search.
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {filteredCustomers.map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                className="flex w-full flex-col rounded-md px-3 py-3 text-left transition-colors hover:bg-accent"
                                onClick={() => handleCustomerSelect(customer)}
                              >
                                <span className="text-sm font-medium text-foreground">
                                  {customer.brand_site}
                                </span>
                                <span className="mt-1 text-xs text-muted-foreground">
                                  {customer.company_name} • Grade {customer.grade || '—'}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </DropdownSurface>
                    ) : null}
                  </div>

                  {form.ncal !== 'BLUE' ? (
                    <div className="custom-dropdown-container relative space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        {form.ncal === 'YELLOW' ? 'Distribution Node (ODP/BTS)' : 'Node Sequence'}
                      </label>

                      <button
                        type="button"
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors hover:bg-accent"
                        onClick={() => setShowOdpDropdown((previous) => !previous)}
                      >
                        <span className={cn(!form.odp_bts && 'text-muted-foreground')}>
                          {form.odp_bts && form.odp_bts !== 'MANUAL_INPUT'
                            ? form.odp_bts
                            : form.odp_bts === 'MANUAL_INPUT'
                              ? 'Manual entry selected'
                              : 'Select topology node'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </button>

                      {showOdpDropdown ? (
                        <DropdownSurface className="max-h-80 overflow-y-auto">
                          <div className="sticky top-0 bg-popover pb-2">
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <input
                                type="text"
                                className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Filter nodes..."
                                value={odpSearch}
                                onChange={(event) => setOdpSearch(event.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            {filteredOdpOptions.map((option) => (
                              <button
                                key={option}
                                type="button"
                                className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                                onClick={() => {
                                  setField('odp_bts', option);
                                  setShowOdpDropdown(false);
                                }}
                              >
                                <span>{option}</span>
                              </button>
                            ))}

                            <button
                              type="button"
                              className="mt-2 flex w-full items-center justify-between rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                              onClick={() => {
                                setField('odp_bts', 'MANUAL_INPUT');
                                setShowOdpDropdown(false);
                              }}
                            >
                              <span>Manual override</span>
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </DropdownSurface>
                      ) : null}

                      {form.odp_bts === 'MANUAL_INPUT' ? (
                        <Input
                          id="manual-distribusi"
                          label="Manual Node Value"
                          value={form.distribusi_manual}
                          onChange={(event) => setField('distribusi_manual', event.target.value.toUpperCase())}
                          placeholder="Enter custom topology node"
                          className="font-mono"
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="custom-dropdown-container relative space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Distribution Nodes
                  </label>

                  <button
                    type="button"
                    className={cn(
                      'flex min-h-11 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left shadow-sm transition-colors hover:bg-accent',
                      showDistDropdown && 'ring-1 ring-ring'
                    )}
                    onClick={() => setShowDistDropdown((previous) => !previous)}
                  >
                    {distForm.selectedItems.length === 0 ? (
                      <span className="text-sm text-muted-foreground">
                        Select one or more affected topology nodes
                      </span>
                    ) : (
                      distForm.selectedItems.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                        >
                          {item}
                          <button
                            type="button"
                            className="rounded-sm p-0.5 transition-colors hover:bg-primary/10"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleDistributionItem(item);
                            }}
                            aria-label={`Remove ${item}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    )}

                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>

                  {showDistDropdown ? (
                    <DropdownSurface className="max-h-80 overflow-y-auto">
                      <div className="sticky top-0 bg-popover pb-2">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="Search topology nodes..."
                            value={distSearch}
                            onChange={(event) => setDistSearch(event.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        {filteredDistributionOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className="flex w-full items-center justify-between rounded-md px-3 py-3 text-left transition-colors hover:bg-accent"
                            onClick={() => toggleDistributionItem(option.value)}
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                {option.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {option.value.split(':')[0]}
                              </p>
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ))}

                        {filteredDistributionOptions.length === 0 ? (
                          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                            No topology node matched your search.
                          </div>
                        ) : null}
                      </div>
                    </DropdownSurface>
                  ) : null}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Technical Details"
              subtitle="Document the initial problem, indications, impact scope, and support level."
            >
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Textarea
                    id="initial_problem"
                    label="Problem Description"
                    value={form.initial_problem}
                    onChange={(event) => setField('initial_problem', event.target.value)}
                    placeholder="Describe the technical anomaly or outage symptoms."
                    className="min-h-[140px]"
                    required
                  />

                  <Textarea
                    id="indikasi"
                    label="Diagnostic Indications"
                    value={form.indikasi}
                    onChange={(event) => setField('indikasi', event.target.value)}
                    placeholder="List symptoms such as signal loss, attenuation, or flap indications."
                    className="min-h-[140px]"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <Select
                      id="level_support"
                      label="Support Level"
                      value={form.level_support}
                      onChange={(event) => setField('level_support', event.target.value)}
                      required
                      disabled={!isDistribusi && Boolean(form.customer_id)}
                    >
                      {LEVEL_OPTIONS
                        .filter((option) => (isDistribusi ? option.value !== '4' : true))
                        .map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                    </Select>

                    {!isDistribusi && form.customer_id ? (
                      <div className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                        <Check className="h-3.5 w-3.5" />
                        Support level is locked to customer metadata.
                      </div>
                    ) : null}
                  </div>

                  {!isDistribusi ? (
                    <Input
                      id="pic"
                      label="PIC / Assigned Operator"
                      placeholder="Enter responsible operator name"
                      value={form.pic}
                      onChange={(event) => setField('pic', event.target.value)}
                    />
                  ) : null}
                </div>

                {isDistribusi ? (
                  <Textarea
                    id="customer_terdampak"
                    label="Impacted Customers"
                    value={form.customer_terdampak}
                    onChange={(event) => setField('customer_terdampak', event.target.value)}
                    placeholder="List customer names, service areas, or affected branches."
                    className="min-h-[100px]"
                  />
                ) : null}

                {form.ncal === 'YELLOW' ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                      <Network className="h-4 w-4" />
                      Yellow segment maintenance details
                    </div>

                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Static Address
                          </label>
                          <div className="rounded-md border border-border bg-background px-3 py-3 text-sm text-muted-foreground">
                            {form.address_preview || 'No address available from selected customer.'}
                          </div>
                        </div>

                        <Input
                          id="koordinat"
                          label="Coordinates"
                          placeholder="Latitude, Longitude"
                          value={form.koordinat}
                          onChange={(event) => setField('koordinat', event.target.value)}
                          className="font-mono"
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <Input
                          id="power_before"
                          label="Signal Power (RX)"
                          placeholder="dBm"
                          value={form.power_before}
                          onChange={(event) => setField('power_before', event.target.value)}
                          className="font-mono"
                        />

                        <Input
                          id="kabel"
                          label="Infrastructure Spec"
                          placeholder="e.g. CORE-FIBER"
                          value={form.kabel}
                          onChange={(event) => setField('kabel', event.target.value)}
                        />

                        <Input
                          id="panjang_kabel"
                          label="Path Dimension"
                          placeholder="Meters"
                          value={form.panjang_kabel}
                          onChange={(event) => setField('panjang_kabel', event.target.value)}
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>

          <div className="xl:sticky xl:top-6">
            <SectionCard
              title="Incident Preview"
              subtitle="Live summary of the record you are about to submit."
              className="bg-card"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Impact Segment
                    </p>
                    <NcalBadge value={form.ncal} />
                  </div>

                  <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                    {isEdit ? 'Edit Mode' : 'Draft Mode'}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Affected Node
                  </p>
                  <p className="text-sm font-medium leading-6 text-foreground">
                    {previewNode || 'No node selected yet.'}
                  </p>
                  {!isDistribusi && form.sla ? (
                    <div className="inline-flex rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-primary">
                      Priority grade {form.sla}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Problem Summary
                  </p>
                  <p className="text-sm leading-6 text-foreground">
                    {form.initial_problem || 'Problem description will appear here.'}
                  </p>
                </div>

                <div className="grid gap-3">
                  <PreviewItem label="Coordinates" value={form.koordinat || 'Not provided'} icon={MapPin} />
                  <PreviewItem label="Incident Hash" value={previewHash} icon={Network} />
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Submit State
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {loading ? 'Submitting incident...' : 'Ready to submit'}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Connected
                    </div>
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
