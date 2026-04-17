import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Database,
  Globe,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  PageHeader,
  SectionCard,
  TableSkeleton,
} from '../../components/ui/index.jsx';
import { DataTable } from '../../components/tables/DataTable.jsx';
import CustomerMap from '../../components/ui/CustomerMap.jsx';
import GeoSummary from '../../components/ui/GeoSummary.jsx';
import { parseCsvFile, downloadCsv } from '../../utils/csv.js';
import { CustomerEditModal } from './customers/CustomerEditModal.jsx';
import { CustomerHeaderActions } from './customers/CustomerHeaderActions.jsx';
import { CustomerStatCard } from './customers/CustomerStatCard.jsx';
import { CustomerSyncReview } from './customers/CustomerSyncReview.jsx';
import { CustomerToolbar } from './customers/CustomerToolbar.jsx';
import { buildCustomerColumns } from './customers/customerTableColumns.jsx';
import {
  DEFAULT_GRADE_OPTIONS,
  DEFAULT_SERVICE_TYPES,
  DEFAULT_SUPPORT_OPTIONS,
  EMPTY_FORM,
} from './customers/config.js';

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

  const openCandidateCreate = (candidate) => {
    const canonicalOdp = candidate?.odp
      ? (candidate.odp.toUpperCase().startsWith('ODP ') ? candidate.odp.toUpperCase() : `ODP ${candidate.odp.toUpperCase()}`)
      : '';

    const customerIdSeed = (candidate?.simplified_name || candidate?.name || 'candidate')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'CANDIDATE';

    setForm({
      ...EMPTY_FORM,
      customer_id: `CAND-${customerIdSeed}`,
      service_id: '',
      company_name: candidate?.simplified_name || candidate?.name || '',
      brand_site: candidate?.simplified_name || candidate?.name || '',
      address: candidate?.address || '',
      osc_reference: candidate?.olt || '',
      odc_reference: candidate?.odc || '',
      odp_reference: canonicalOdp,
      latitude: candidate?.latitude ?? '',
      longitude: candidate?.longitude ?? '',
      coord_source: candidate?.latitude != null && candidate?.longitude != null ? 'update-workbook-customer' : '',
      survey_name_raw: candidate?.name || '',
      survey_latitude: candidate?.latitude ?? '',
      survey_longitude: candidate?.longitude ?? '',
      survey_source: 'UPDATE.xlsx:CUSTOMER',
    });
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

  const columns = useMemo(
    () => buildCustomerColumns({ onEdit: openEdit, onDelete: handleDelete }),
    [handleDelete]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <PageHeader
        title="Customer Records"
        subtitle={`Manage ${customers.length} customer endpoints, keep location data accurate, and switch between registry and map views without leaving the workspace.`}
        action={(
          <CustomerHeaderActions
            viewMode={viewMode}
            setViewMode={setViewMode}
            downloadTemplate={downloadTemplate}
            fileInputRef={fileInputRef}
            openCreate={openCreate}
          />
        )}
      />

      <div className="grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-4">
        <CustomerStatCard
          label="Total Records"
          value={stats.total}
          meta="Customer endpoints registered"
          icon={Globe}
          tone="default"
        />
        <CustomerStatCard
          label="Priority Accounts"
          value={stats.priority}
          meta="VIP and Gold service grades"
          icon={ShieldCheck}
          tone="warning"
        />
        <CustomerStatCard
          label="Mapped Nodes"
          value={stats.mapped}
          meta="Records with latitude and longitude"
          icon={MapPin}
          tone="info"
        />
        <CustomerStatCard
          label="Linked Monitoring"
          value={stats.withLinks}
          meta="NMS links available for quick access"
          icon={Activity}
          tone="success"
        />
      </div>

      <CustomerToolbar
        viewMode={viewMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        serviceFilter={serviceFilter}
        setServiceFilter={setServiceFilter}
        serviceTypeOptions={serviceTypeOptions}
        gradeFilter={gradeFilter}
        setGradeFilter={setGradeFilter}
        gradeOptions={gradeOptions}
      />

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
              ? 'Review one-time UPDATE.xlsx enrichment results and continue maintenance directly from Customer Records.'
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
          <CustomerSyncReview
            reviewMetrics={reviewMetrics}
            stats={stats}
            onUseCandidate={openCandidateCreate}
          />
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

      <CustomerEditModal
        modal={modal}
        form={form}
        setField={setField}
        handleSave={handleSave}
        onClose={() => setModal(null)}
        serviceTypeOptions={serviceTypeOptions}
        gradeOptions={gradeOptions}
        supportOptions={supportOptions}
      />
    </div>
  );
}
