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
  service_type: 'Internet Dedicated',
  grade: 'Bronze',
  support_level: 'L1',
  link_coverage: '',
  latitude: '',
  longitude: '',
};

const SERVICE_TYPES = [
  'Internet Dedicated',
  'Broadband',
  'VPN IP',
  'MPLS',
  'Astinet',
  'VSAT',
  'Clear Channel',
];

const GRADE_OPTIONS = ['VIP', 'Gold', 'Silver', 'Bronze'];
const SUPPORT_OPTIONS = ['L1', 'L2', 'L3'];

function StatCard({ label, value, meta, icon, tone = 'default' }) {
  const Icon = icon;

  const toneClassName = {
    default: 'text-primary',
    warning: 'text-warning',
    success: 'text-success',
    info: 'text-info',
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
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

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Icon className={cn('h-4.5 w-4.5', toneClassName[tone] || toneClassName.default)} />
        </div>
      </div>
    </div>
  );
}

export default function MasterCustomerPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [modal, setModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getCustomers();
      setCustomers(response);
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
    if (!term) return customers;

    return customers.filter((customer) => (
      customer.customer_id?.toLowerCase().includes(term)
      || customer.service_id?.toLowerCase().includes(term)
      || customer.company_name?.toLowerCase().includes(term)
      || customer.brand_site?.toLowerCase().includes(term)
      || customer.address?.toLowerCase().includes(term)
    ));
  }, [customers, searchQuery]);

  const stats = useMemo(() => {
    const total = customers.length;
    const priority = customers.filter((customer) => ['VIP', 'Gold'].includes(customer.grade)).length;
    const mapped = customers.filter((customer) => customer.latitude && customer.longitude).length;
    const withLinks = customers.filter((customer) => customer.link_coverage).length;

    return {
      total,
      priority,
      mapped,
      withLinks,
    };
  }, [customers]);

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
              {row.original.city || row.original.brand_site || 'Location pending'}
            </p>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {row.original.address || 'No address registered'}
            </p>
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
              className="h-8 w-8"
              icon={<ExternalLink className="h-4 w-4" />}
              onClick={() => window.open(row.original.link_coverage, '_blank', 'noopener,noreferrer')}
            />
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            icon={<Edit2 className="h-4 w-4" />}
            onClick={() => openEdit(row.original)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => handleDelete(row.original)}
          />
        </div>
      ),
    },
  ], [handleDelete]);

  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden">
      <PageHeader
        title="Customer Records"
        subtitle={`Manage ${customers.length} customer endpoints, keep location data accurate, and switch between registry and map views without leaving the workspace.`}
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-md border border-border bg-muted/30 p-1">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8"
                icon={<LayoutList className="h-4 w-4" />}
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
              <Button
                variant={viewMode === 'map' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8"
                icon={<MapIcon className="h-4 w-4" />}
                onClick={() => setViewMode('map')}
              >
                Map
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <SectionCard
        padding={false}
      >
        <div className="p-4">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by customer ID, service ID, company, site, or address"
            wrapperClassName="gap-1"
            label="Search"
          />
        </div>
      </SectionCard>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileUpload}
      />

      <SectionCard
        title={viewMode === 'map' ? 'Customer Map' : 'Customer Registry'}
        subtitle={viewMode === 'map'
          ? 'Inspect mapped customer nodes and their geographic concentration.'
          : 'Browse, sort, and maintain customer metadata in a single table view.'}
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
        size="lg"
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
        <div className="space-y-6">
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

          <Textarea
            label="Address"
            value={form.address}
            onChange={(event) => setField('address', event.target.value)}
            placeholder="Province, city, district, and street details"
          />

          <div className="grid gap-4 md:grid-cols-3">
            <Select
              label="Service Type"
              value={form.service_type}
              onChange={(event) => setField('service_type', event.target.value)}
            >
              {SERVICE_TYPES.map((option) => (
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
              {GRADE_OPTIONS.map((option) => (
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
              {SUPPORT_OPTIONS.map((option) => (
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

          <div className="grid gap-4 md:grid-cols-2">
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
        </div>
      </Modal>
    </div>
  );
}
