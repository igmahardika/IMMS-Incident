import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Database,
  Download,
  Edit2,
  ExternalLink,
  Globe,
  LayoutList,
  Map as MapIcon,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { api } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Button,
  GradeBadge,
  Input,
  Modal,
  PageHeader,
  SectionCard,
  Select,
  StatusBadge,
  TableSkeleton,
  Textarea,
} from '../../components/ui/index.jsx';
import { DataTable } from '../../components/tables/DataTable.jsx';
import CustomerMap from '../../components/ui/CustomerMap.jsx';
import GeoSummary from '../../components/ui/GeoSummary.jsx';
import { parseCsvFile, downloadCsv } from '../../utils/csv.js';
import { cn } from '../../lib/utils.js';

const EMPTY_FORM = {
  customer_id: '',
  service_id: '',
  company_name: '',
  brand_site: '',
  address: '',
  city: '',
  province: '',
  service_type: 'Internet Dedicated',
  grade: 'Bronze',
  support_level: 'L1',
  link_coverage: '',
  osc_reference: '',
  odc_reference: '',
  odp_reference: '',
  latitude: '',
  longitude: '',
  coord_source: '',
  survey_name_raw: '',
  survey_latitude: '',
  survey_longitude: '',
  survey_source: '',
};

const DEFAULT_SERVICE_TYPES = [
  'Internet Dedicated',
  'Broadband',
  'VPN IP',
  'MPLS',
  'Astinet',
  'VSAT',
  'Clear Channel',
];

const DEFAULT_GRADE_OPTIONS = ['VIP', 'Gold', 'Silver', 'Bronze', 'A', 'B', 'C', 'High', 'Medium', 'Low'];
const DEFAULT_SUPPORT_OPTIONS = ['L1', 'L2', 'L3', '1', '2', '3'];
const COORD_SOURCE_OPTIONS = [
  '',
  'manual',
  'geocoder',
  'anchor',
  'update-workbook-customer',
  'update-workbook-odp',
];

function StatCard({ label, value, meta, icon, tone = 'default' }) {
  const Icon = icon;

  const toneClassName = {
    default: 'text-primary',
    warning: 'text-warning',
    success: 'text-success',
    info: 'text-info',
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {meta ? (
            <p className="text-[11px] text-muted-foreground">
              {meta}
            </p>
          ) : null}
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Icon className={cn('h-4.5 w-4.5', toneClassName[tone] || toneClassName.default)} />
        </div>
      </div>
    </div>
  );
}

export default function MasterCustomerPage() {
  const [customers, setCustomers] = useState([]);
  const [syncReport, setSyncReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [modal, setModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [form, setForm] = useState(EMPTY_FORM);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [customerResponse, reportResponse] = await Promise.all([
        api.getCustomers(),
        api.getUpdateSyncReport(),
      ]);
      setCustomers(customerResponse);
      setSyncReport(reportResponse);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal('create');
  };

  const openEdit = (customer) => {
    setForm({
      ...EMPTY_FORM,
      ...customer,
      latitude: customer.latitude ?? '',
      longitude: customer.longitude ?? '',
      survey_latitude: customer.survey_latitude ?? '',
      survey_longitude: customer.survey_longitude ?? '',
    });
    setModal(customer);
  };

  const handleSave = async () => {
    try {
      if (modal === 'create') {
        await api.createCustomer(form);
        addToast('Customer record created', 'success');
      } else {
        await api.updateCustomer(modal.id, form);
        addToast('Customer record updated', 'success');
      }

      setModal(null);
      await load();
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleDelete = useCallback(async (item) => {
    if (!window.confirm(`Delete customer record for ${item.company_name}?`)) return;

    try {
      await api.deleteCustomer(item.id);
      addToast('Customer record deleted', 'warning');
      await load();
    } catch (error) {
      addToast(error.message, 'error');
    }
  }, [addToast, load]);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const rows = await parseCsvFile(file);
      const parsed = rows.map((row) => ({
        customer_id: row['Customer ID']?.toString() || '',
        service_id: row['Service ID']?.toString() || '',
        company_name: row['Company Name']?.toString() || '',
        brand_site: row['Brand / Site']?.toString() || '',
        address: row.Address?.toString() || '',
        city: row.City?.toString() || '',
        province: row.Province?.toString() || '',
        service_type: row.Service?.toString() || '',
        grade: row.Grade?.toString() || '',
        support_level: row['Support Level']?.toString() || '',
        link_coverage: row['Link Coverage']?.toString() || '',
      })).filter((customer) => customer.customer_id);

      const response = await api.uploadCustomers(parsed);
      addToast(`Imported ${response.count} customer records`, 'success');
      await load();
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
      event.target.value = null;
    }
  };

  const downloadTemplate = () => {
    downloadCsv(
      [{
        'Customer ID': 'CUST-01',
        'Service ID': 'SID-01',
        'Company Name': 'GLOBAL TECH',
        'Brand / Site': 'HQ',
        Address: 'STREET 01',
        City: 'Semarang',
        Province: 'Jawa Tengah',
        Service: 'Internet Dedicated',
        Grade: 'Gold',
        'Support Level': 'L2',
        'Link Coverage': 'https://nms.internal/customer-id',
      }],
      'IMMS_Customer_Template.csv'
    );
  };

  const filteredCustomers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesSearch = !term || (
        customer.customer_id?.toLowerCase().includes(term)
        || customer.service_id?.toLowerCase().includes(term)
        || customer.company_name?.toLowerCase().includes(term)
        || customer.brand_site?.toLowerCase().includes(term)
        || customer.address?.toLowerCase().includes(term)
        || customer.city?.toLowerCase().includes(term)
        || customer.province?.toLowerCase().includes(term)
        || customer.osc_reference?.toLowerCase().includes(term)
        || customer.odc_reference?.toLowerCase().includes(term)
        || customer.odp_reference?.toLowerCase().includes(term)
        || customer.survey_name_raw?.toLowerCase().includes(term)
        || customer.survey_source?.toLowerCase().includes(term)
      );

      const matchesService = serviceFilter === 'all' || customer.service_type === serviceFilter;
      const matchesGrade = gradeFilter === 'all' || customer.grade === gradeFilter;

      return matchesSearch && matchesService && matchesGrade;
    });
  }, [customers, gradeFilter, searchQuery, serviceFilter]);

  const stats = useMemo(() => {
    const total = customers.length;
    const priority = customers.filter((customer) => ['VIP', 'Gold'].includes(customer.grade)).length;
    const mapped = customers.filter((customer) => customer.latitude && customer.longitude).length;
    const withLinks = customers.filter((customer) => customer.link_coverage).length;
    const withSurvey = customers.filter((customer) => customer.survey_latitude && customer.survey_longitude).length;
    const withTopologyRefs = customers.filter((customer) => customer.odp_reference || customer.odc_reference || customer.osc_reference).length;

    return {
      total,
      priority,
      mapped,
      withLinks,
      withSurvey,
      withTopologyRefs,
    };
  }, [customers]);

  const reviewMetrics = syncReport?.customer || null;

  const serviceTypeOptions = useMemo(() => {
    const values = new Set(DEFAULT_SERVICE_TYPES);
    customers.forEach((customer) => {
      if (customer.service_type) values.add(customer.service_type);
    });
    return Array.from(values).sort((left, right) => left.localeCompare(right));
  }, [customers]);

  const gradeOptions = useMemo(() => {
    const values = new Set(DEFAULT_GRADE_OPTIONS);
    customers.forEach((customer) => {
      if (customer.grade) values.add(customer.grade);
    });
    return Array.from(values).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  }, [customers]);

  const supportOptions = useMemo(() => {
    const values = new Set(DEFAULT_SUPPORT_OPTIONS);
    customers.forEach((customer) => {
      if (customer.support_level) values.add(String(customer.support_level));
    });
    return Array.from(values).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  }, [customers]);

  const handleOpenConflict = (customerId) => {
    const target = customers.find((customer) => customer.customer_id === customerId);
    if (!target) {
      addToast(`Customer ${customerId} is not in the active registry anymore.`, 'warning');
      return;
    }
    openEdit(target);
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'identity',
      header: 'Customer',
      size: 320,
      meta: { flexible: true },
      cell: ({ row }) => (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              {row.original.company_name}
            </p>
            {row.original.brand_site ? (
              <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                {row.original.brand_site}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Customer ID: {row.original.customer_id}</span>
            <span>Service ID: {row.original.service_id}</span>
            {row.original.odp_reference ? <span>ODP: {row.original.odp_reference}</span> : null}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'address',
      header: 'Location',
      size: 240,
      meta: { flexible: true },
      cell: ({ row }) => (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {[row.original.city, row.original.province].filter(Boolean).join(', ') || row.original.brand_site || 'Location pending'}
            </p>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {row.original.address || 'No address registered'}
            </p>
            {(row.original.osc_reference || row.original.odc_reference || row.original.odp_reference) ? (
            <p className="text-[11px] text-muted-foreground">
                {[row.original.osc_reference, row.original.odc_reference, row.original.odp_reference].filter(Boolean).join(' / ')}
              </p>
            ) : null}
            {row.original.coord_source ? (
              <p className="text-[11px] text-muted-foreground">
                Source: {row.original.coord_source}
              </p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'service_type',
      header: 'Service',
      size: 160,
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {row.original.service_type}
        </span>
      ),
    },
    {
      accessorKey: 'grade',
      header: 'Grade',
      size: 96,
      meta: { className: 'text-center' },
      cell: ({ row }) => <GradeBadge grade={row.original.grade} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 100,
      meta: { className: 'text-center' },
      cell: ({ row }) => <StatusBadge active={row.original.is_active} />,
    },
    {
      id: 'actions',
      header: '',
      size: 132,
      meta: { className: 'text-right' },
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {row.original.link_coverage ? (
            <Button
              variant="ghost"
              size="icon"
              icon={<ExternalLink className="h-4 w-4" />}
              onClick={() => window.open(row.original.link_coverage, '_blank', 'noopener,noreferrer')}
            />
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            icon={<Edit2 className="h-4 w-4" />}
            onClick={() => openEdit(row.original)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => handleDelete(row.original)}
          />
        </div>
      ),
    },
  ], [handleDelete]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <PageHeader
        title="Customer Records"
        subtitle={`Manage ${customers.length} customer endpoints, keep location data accurate, and switch between registry and map views without leaving the workspace.`}
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-md border border-border bg-muted/30 p-1">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                icon={<LayoutList className="h-4 w-4" />}
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
              <Button
                variant={viewMode === 'map' ? 'secondary' : 'ghost'}
                size="sm"
                icon={<MapIcon className="h-4 w-4" />}
                onClick={() => setViewMode('map')}
              >
                Map
              </Button>
              <Button
                variant={viewMode === 'review' ? 'secondary' : 'ghost'}
                size="sm"
                icon={<Database className="h-4 w-4" />}
                onClick={() => setViewMode('review')}
              >
                Sync Review
              </Button>
            </div>

            <Button
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={downloadTemplate}
            >
              Template
            </Button>
            <Button
              variant="outline"
              icon={<Database className="h-4 w-4" />}
              onClick={() => fileInputRef.current?.click()}
            >
              Import CSV
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={openCreate}
            >
              Add Customer
            </Button>
          </div>
        )}
      />

      <div className="grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Records"
          value={stats.total}
          meta="Customer endpoints registered"
          icon={Globe}
          tone="default"
        />
        <StatCard
          label="Priority Accounts"
          value={stats.priority}
          meta="VIP and Gold service grades"
          icon={ShieldCheck}
          tone="warning"
        />
        <StatCard
          label="Mapped Nodes"
          value={stats.mapped}
          meta="Records with latitude and longitude"
          icon={MapPin}
          tone="info"
        />
        <StatCard
          label="Linked Monitoring"
          value={stats.withLinks}
          meta="NMS links available for quick access"
          icon={Activity}
          tone="success"
        />
      </div>

      {viewMode !== 'review' ? (
        <SectionCard
          padding={false}
        >
          <div className="p-4">
            {viewMode === 'list' ? (
              <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(180px,0.7fr)_minmax(140px,0.5fr)]">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by customer, address, city, province, OSC, ODC, or ODP"
                  wrapperClassName="gap-1"
                  label="Search"
                />
                <Select
                  label="Service"
                  value={serviceFilter}
                  onChange={(event) => setServiceFilter(event.target.value)}
                >
                  <option value="all">All Services</option>
                  {serviceTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Grade"
                  value={gradeFilter}
                  onChange={(event) => setGradeFilter(event.target.value)}
                >
                  <option value="all">All Grades</option>
                  {gradeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by customer, address, city, province, OSC, ODC, or ODP"
                wrapperClassName="gap-1"
                label="Search"
              />
            )}
          </div>
        </SectionCard>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileUpload}
      />

      <SectionCard
        title={
          viewMode === 'map'
            ? 'Customer Map'
            : viewMode === 'review'
              ? 'Workbook Sync Review'
              : 'Customer Registry'
        }
        subtitle={
          viewMode === 'map'
            ? 'Inspect mapped customer nodes and their geographic concentration.'
            : viewMode === 'review'
              ? 'Review one-time UPDATE.xlsx enrichment results, resolve coordinate conflicts, and continue maintenance directly from Customer Records.'
              : 'Browse, sort, and maintain customer metadata in a single table view.'
        }
        padding={false}
        className="flex-1 min-h-0"
      >
        {loading ? (
          <TableSkeleton rows={14} />
        ) : viewMode === 'map' ? (
          <div className="flex h-full min-h-0 overflow-hidden">
            <div className="min-w-0 flex-1">
              <CustomerMap customers={filteredCustomers} onRefresh={load} />
            </div>
            <GeoSummary customers={filteredCustomers} />
          </div>
        ) : viewMode === 'review' ? (
          reviewMetrics ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-border p-4 md:p-6">
                <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Survey Linked"
                    value={stats.withSurvey}
                    meta="Customer rows carrying imported survey coordinates"
                    icon={Database}
                    tone="info"
                  />
                  <StatCard
                    label="Topology Linked"
                    value={stats.withTopologyRefs}
                    meta="Customers already linked to OSC / ODC / ODP"
                    icon={ShieldCheck}
                    tone="success"
                  />
                  <StatCard
                    label="Coord Conflicts"
                    value={reviewMetrics.coord_conflicts || 0}
                    meta="Workbook rows that need manual coordinate decision"
                    icon={MapPin}
                    tone="warning"
                  />
                  <StatCard
                    label="Unmatched Rows"
                    value={reviewMetrics.unmatched || 0}
                    meta="Workbook rows that could not be safely matched"
                    icon={Search}
                    tone="default"
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-foreground">Coordinate conflicts</h3>
                    <p className="text-sm text-muted-foreground">
                      Keep the correct live coordinate in the main fields, and preserve workbook evidence in the survey snapshot for comparison.
                    </p>
                  </div>

                  {(reviewMetrics.coord_conflict_examples?.length || 0) > 0 ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {reviewMetrics.coord_conflict_examples.map((item) => (
                        <div key={item.customer_id} className="rounded-xl border border-border bg-card p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">{item.brand_site}</p>
                              <p className="text-xs text-muted-foreground">{item.customer_id}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleOpenConflict(item.customer_id)}>
                              Open
                            </Button>
                          </div>
                          <div className="mt-4 space-y-2">
                            {item.coords.slice(0, 5).map((coord, index) => (
                              <div key={`${item.customer_id}-${index}`} className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                                {coord[0]}, {coord[1]}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                      No customer coordinate conflict remains from the workbook enrichment.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
              Workbook sync report is not available yet.
            </div>
          )
        ) : (
          <DataTable
            data={filteredCustomers}
            columns={columns}
            globalFilter={searchQuery}
            setGlobalFilter={setSearchQuery}
            pageSize={50}
          />
        )}
      </SectionCard>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Add Customer Record' : 'Edit Customer Record'}
        subtitle={modal === 'create'
          ? 'Create a new customer endpoint with topology and coordinate context.'
          : 'Maintain customer identity, topology references, and survey evidence from a single workspace.'}
        size="2xl"
        bodyClassName="pt-6"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {modal === 'create' ? 'Create Record' : 'Save Changes'}
            </Button>
          </>
        )}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <section className="space-y-4 rounded-xl border border-border bg-card p-5">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">Identity</h3>
                <p className="text-xs text-muted-foreground">Primary registry details used throughout incidents, maps, and history views.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Customer ID"
                  value={form.customer_id}
                  onChange={(event) => setField('customer_id', event.target.value)}
                  placeholder="CUST-0001"
                  required
                />
                <Input
                  label="Service ID"
                  value={form.service_id}
                  onChange={(event) => setField('service_id', event.target.value)}
                  placeholder="SID-0001"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Company Name"
                  value={form.company_name}
                  onChange={(event) => setField('company_name', event.target.value)}
                  placeholder="PT Global Technology"
                  required
                />
                <Input
                  label="Brand / Site"
                  value={form.brand_site}
                  onChange={(event) => setField('brand_site', event.target.value)}
                  placeholder="HQ Semarang"
                  required
                />
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-border bg-card p-5">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">Location</h3>
                <p className="text-xs text-muted-foreground">Editable operational address and regional context for map and incident routing.</p>
              </div>

              <Textarea
                label="Address"
                value={form.address}
                onChange={(event) => setField('address', event.target.value)}
                placeholder="Province, city, district, and street details"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="City"
                  value={form.city}
                  onChange={(event) => setField('city', event.target.value)}
                  placeholder="Semarang"
                />
                <Input
                  label="Province"
                  value={form.province}
                  onChange={(event) => setField('province', event.target.value)}
                  placeholder="Jawa Tengah"
                />
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-border bg-card p-5">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">Service Profile</h3>
                <p className="text-xs text-muted-foreground">Customer tiering and monitoring linkage used for support priority.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Select
                  label="Service Type"
                  value={form.service_type}
                  onChange={(event) => setField('service_type', event.target.value)}
                >
                  {serviceTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Grade"
                  value={form.grade}
                  onChange={(event) => setField('grade', event.target.value)}
                >
                  {gradeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Support Level"
                  value={form.support_level}
                  onChange={(event) => setField('support_level', event.target.value)}
                >
                  {supportOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>

              <Input
                label="Monitoring Link"
                type="url"
                value={form.link_coverage}
                onChange={(event) => setField('link_coverage', event.target.value)}
                placeholder="https://nms.internal/customer-id"
              />
            </section>
          </div>

          <div className="space-y-6">
            <section className="space-y-4 rounded-xl border border-border bg-card p-5">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">Topology References</h3>
                <p className="text-xs text-muted-foreground">
                  Canonical OSC, ODC, and ODP references used to connect this customer to the active topology tree.
                </p>
              </div>

              <div className="grid gap-4">
                <Input
                  label="OSC Reference"
                  value={form.osc_reference}
                  onChange={(event) => setField('osc_reference', event.target.value.toUpperCase())}
                  placeholder="OSC KIC"
                />
                <Input
                  label="ODC Reference"
                  value={form.odc_reference}
                  onChange={(event) => setField('odc_reference', event.target.value.toUpperCase())}
                  placeholder="ODC KIC"
                />
                <Input
                  label="ODP Reference"
                  value={form.odp_reference}
                  onChange={(event) => setField('odp_reference', event.target.value.toUpperCase())}
                  placeholder="ODP KIC-B27"
                />
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-border bg-card p-5">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">Live Coordinates</h3>
                <p className="text-xs text-muted-foreground">These are the coordinates actively used by maps and operational views.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <Input
                  label="Latitude"
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(event) => setField('latitude', event.target.value)}
                  placeholder="-6.123456"
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(event) => setField('longitude', event.target.value)}
                  placeholder="110.123456"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <Select
                  label="Coordinate Source"
                  value={form.coord_source || ''}
                  onChange={(event) => setField('coord_source', event.target.value)}
                >
                  {COORD_SOURCE_OPTIONS.map((option) => (
                    <option key={option || 'blank'} value={option}>
                      {option || 'Unspecified'}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Survey Source"
                  value={form.survey_source}
                  onChange={(event) => setField('survey_source', event.target.value)}
                  placeholder="UPDATE.xlsx:CUSTOMER"
                />
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">Survey Snapshot</h3>
                <p className="text-xs text-muted-foreground">
                  Preserve imported workbook evidence here while keeping the live coordinates above editable and authoritative.
                </p>
              </div>

              <Input
                label="Survey Name Raw"
                value={form.survey_name_raw}
                onChange={(event) => setField('survey_name_raw', event.target.value)}
                placeholder="Raw NAME from external workbook"
              />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <Input
                  label="Survey Latitude"
                  type="number"
                  step="any"
                  value={form.survey_latitude}
                  onChange={(event) => setField('survey_latitude', event.target.value)}
                  placeholder="-6.123456"
                />
                <Input
                  label="Survey Longitude"
                  type="number"
                  step="any"
                  value={form.survey_longitude}
                  onChange={(event) => setField('survey_longitude', event.target.value)}
                  placeholder="110.123456"
                />
              </div>
            </section>
          </div>
        </div>
      </Modal>
    </div>
  );
}
