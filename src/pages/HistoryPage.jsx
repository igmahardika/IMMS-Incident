import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  FileUp,
  LayoutList,
  Map as MapIcon,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '../utils/api.js';
import { formatDateTime, normalizeInfrastructureLabel } from '../utils/incidentUtils.js';
import { MONTH_NAMES } from '../utils/constants.js';
import {
  Button,
  EmptyState,
  Input,
  NcalBadge,
  PageHeader,
  SectionCard,
  Select,
  StatusPill,
  TableSkeleton,
} from '../components/ui/index.jsx';
import { DataTable } from '../components/tables/DataTable.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const NCAL_OPTIONS = ['', 'BLACK', 'RED', 'ORANGE', 'YELLOW', 'BLUE'];
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, index) => currentYear - index);
const CustomerMap = lazy(() => import('../components/ui/CustomerMap.jsx'));
const REQUIRED_HISTORY_HEADERS = [
  'Priority',
  'Site',
  'No Case',
  'NCAL',
  'Status',
  'Level',
  'TS',
  'ODP/BTS',
  'Start',
  'Start Escalation Vendor',
  'End',
  'Duration',
  'Duration Vendor',
  'Problem',
  'Penyebab',
  'Action Terakhir',
  'Note',
  'Klasifikasi Gangguan',
  'Power Before',
  'Power After',
  'Start Pause',
  'End Pause',
  'Start Pause 2',
  'End Pause 2',
  'Total Duration Pause',
  'Total Duration Vendor',
];

function formatDuration(seconds) {
  if (seconds == null || seconds === '') return '';
  if (seconds === 0) return '00:00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export default function HistoryPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    month: '',
    year: String(currentYear),
    ncal: '',
    search: '',
  });
  const [selectedRowMap, setSelectedRowMap] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [customers, setCustomers] = useState([]);
  const { addToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const setFilter = (key, value) => setFilters((previous) => ({ ...previous, [key]: value }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 1000 };
      if (filters.month) params.month = filters.month;
      if (filters.year) params.year = filters.year;
      if (filters.ncal) params.ncal = filters.ncal;

      const response = await api.getHistory(params);
      setData(response);
      setSelectedRowMap({});
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, filters.month, filters.ncal, filters.year]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (viewMode === 'map' && customers.length === 0) {
      api.getCustomers().then(setCustomers).catch(console.error);
    }
  }, [customers.length, viewMode]);

  const filteredData = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    if (!term) return data;

    return data.filter((item) => [
      item.case_no,
      item.brand_site,
      item.company_name,
      item.technician_name,
      normalizeInfrastructureLabel(item.odp_bts, item.ncal),
      item.root_cause,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term)));
  }, [data, filters.search]);

  const selectedIds = useMemo(
    () => filteredData
      .filter((item) => selectedRowMap[String(item.id)])
      .map((item) => item.id),
    [filteredData, selectedRowMap]
  );

  const allVisibleSelected = filteredData.length > 0 && selectedIds.length === filteredData.length;

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} incidents permanently?`)) return;

    setDeleting(true);
    try {
      const result = await api.deleteIncidents({ ids: selectedIds });
      addToast(
        [
          `${result.deleted || selectedIds.length} incidents deleted.`,
          result.deletedLegacyCustomers ? `${result.deletedLegacyCustomers} legacy sites cleaned.` : null,
          result.deletedLegacyUsers ? `${result.deletedLegacyUsers} legacy users cleaned.` : null,
        ].filter(Boolean).join(' '),
        'success'
      );
      load();
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const { exportToCsv } = await import('../utils/exportStats.js');
      await exportToCsv(
        filteredData,
        `IMMS_History_${new Date().toISOString().split('T')[0]}.csv`
      );
    } catch (error) {
      addToast(error.message || 'Failed to export CSV report', 'error');
    } finally {
      setExporting(false);
    }
  }, [addToast, filteredData]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!/\.xlsx$/i.test(file.name)) {
      addToast('Only .xlsx files with the manual history format are supported.', 'error');
      return;
    }

    const confirmed = window.confirm(
      `Import resolved incidents from "${file.name}"? Existing duplicate case numbers will be skipped or suffixed automatically.`
    );
    if (!confirmed) return;

    setImporting(true);
    addToast('Uploading resolved history workbook...', 'info', 2500);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read workbook.'));
        reader.readAsDataURL(file);
      });

      const contentBase64 = dataUrl.split(',')[1];
      const response = await api.importResolvedHistory({ filename: file.name, contentBase64 });
      const report = response.report || {};
      const imported = Number(report.inserted_incidents || 0);
      const skipped = Number(report.skipped_existing_case_count || 0);
      const createdSites = Number(report.created_legacy_customers || 0);
      const createdUsers = Number(report.created_legacy_users || 0);
      const adjustedPauseSegments = Number(report.invalid_pause_segment_count || 0);
      const successMessage = imported > 0
        ? [
          `${imported} resolved incidents imported.`,
          skipped ? `${skipped} duplicates skipped.` : null,
          createdSites ? `${createdSites} legacy sites added.` : null,
          createdUsers ? `${createdUsers} legacy users added.` : null,
          adjustedPauseSegments ? `${adjustedPauseSegments} invalid pause segments normalized.` : null,
        ].filter(Boolean).join(' ')
        : [
          'No new resolved incidents were imported.',
          skipped ? `${skipped} rows already existed.` : null,
        ].filter(Boolean).join(' ');
      addToast(successMessage, 'success', 6000);
      await load();
    } catch (error) {
      const message = String(error.message || 'Failed to import resolved history workbook.');
      const headerHint = `Required header order: ${REQUIRED_HISTORY_HEADERS.join(' | ')}`;
      addToast(
        message.includes('Unexpected workbook header order')
          ? `Invalid workbook header order. ${headerHint}`
          : message,
        'error',
        9000
      );
    } finally {
      setImporting(false);
    }
  };

  const columns = useMemo(() => [
    ...(user?.role === 'admin' ? [{
      id: 'selection',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="h-4 w-4 rounded border-input"
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="h-4 w-4 rounded border-input"
          aria-label={`Select ${row.original.case_no}`}
        />
      ),
      size: 52,
      meta: { className: 'text-center' },
    }] : []),
    {
      accessorKey: 'case_no',
      header: 'Case No',
      cell: ({ row }) => (
        <button
          type="button"
          className="font-mono text-sm font-medium text-primary transition-colors hover:underline"
          onClick={() => navigate(`/incidents/${row.original.id}`)}
        >
          {row.original.case_no}
        </button>
      ),
      size: 116,
      meta: { className: 'whitespace-nowrap px-2' },
    },
    {
      accessorKey: 'brand_site',
      header: 'Site / Customer',
      cell: ({ row }) => {
        const infrastructure = normalizeInfrastructureLabel(row.original.odp_bts, row.original.ncal);
        const value = row.original.brand_site || row.original.company_name || infrastructure || '—';
        return (
          <div className="min-w-0 space-y-1">
            <span title={value} className="block truncate text-sm font-medium text-foreground">
              {value}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {row.original.company_name || infrastructure || '—'}
            </span>
          </div>
        );
      },
      size: 280,
      meta: { flexible: true },
    },
    {
      accessorKey: 'ncal',
      header: 'NCAL',
      cell: ({ row }) => <NcalBadge value={row.original.ncal} />,
      size: 88,
      meta: { className: 'whitespace-nowrap px-2' },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.status} />,
      size: 110,
      meta: { className: 'whitespace-nowrap px-2' },
    },
    {
      accessorKey: 'technician_name',
      header: 'Technician',
      cell: ({ row }) => (
        <span className="block truncate text-sm text-muted-foreground">
          {row.original.technician_name || '—'}
        </span>
      ),
      size: 160,
      meta: { flexible: true },
    },
    {
      accessorKey: 'start_time',
      header: 'Start Time',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatDateTime(row.original.start_time)}
        </span>
      ),
      size: 164,
      meta: { className: 'whitespace-nowrap px-2' },
    },
    {
      id: 'duration',
      header: 'Net Duration',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium text-primary">
          {formatDuration(row.original.duration_nett_seconds)}
        </span>
      ),
      size: 120,
      meta: { className: 'whitespace-nowrap px-2' },
    },
  ], [navigate, user?.role]);

  const startDate = filters.month
    ? `${filters.year}-${filters.month}-01 00:00:00`
    : `${filters.year}-01-01 00:00:00`;
  const endDate = filters.month
    ? `${filters.year}-${filters.month}-${new Date(+filters.year, +filters.month, 0).getDate()} 23:59:59`
    : `${filters.year}-12-31 23:59:59`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleImportFile}
      />
      <PageHeader
        title="Incident Archive"
        subtitle={`${filteredData.length} archived incident${filteredData.length === 1 ? '' : 's'} ready for review, export, or spatial analysis.`}
        action={(
          <div className="flex flex-wrap items-center gap-2">
            {user?.role === 'admin' && viewMode === 'list' && selectedIds.length > 0 ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (allVisibleSelected) {
                      setSelectedRowMap({});
                    } else {
                      setSelectedRowMap(
                        filteredData.reduce((accumulator, item) => {
                          accumulator[String(item.id)] = true;
                          return accumulator;
                        }, {})
                      );
                    }
                  }}
                >
                  {allVisibleSelected ? 'Clear Selection' : 'Select Visible'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteSelected}
                  isLoading={deleting}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedIds.length})
                </Button>
              </>
            ) : null}

            <div className="flex items-center rounded-md border border-border bg-muted/30 p-1">
              <Button
                type="button"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="mr-2 h-4 w-4" />
                List
              </Button>
              <Button
                type="button"
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('map')}
              >
                <MapIcon className="mr-2 h-4 w-4" />
                Map
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              isLoading={exporting}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </Button>

            {user?.role === 'admin' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportClick}
                isLoading={importing}
              >
                <FileUp className="mr-2 h-4 w-4" />
                Bulk Upload
              </Button>
            ) : null}
          </div>
        )}
      />

      <SectionCard padding={false}>
        <div className="grid gap-6 px-4 py-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_160px_180px_160px_auto]">
          <Input
            id="archive-search"
            value={filters.search}
            onChange={(event) => setFilter('search', event.target.value)}
            placeholder="Search case no, site, customer, technician..."
          />

          <Select
            id="archive-year"
            value={filters.year}
            onChange={(event) => setFilter('year', event.target.value)}
          >
            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>

          <Select
            id="archive-month"
            value={filters.month}
            onChange={(event) => setFilter('month', event.target.value)}
          >
            <option value="">Full Year</option>
            {MONTH_NAMES.map((month, index) => (
              <option key={month} value={String(index + 1).padStart(2, '0')}>
                {month}
              </option>
            ))}
          </Select>

          <Select
            id="archive-ncal"
            value={filters.ncal}
            onChange={(event) => setFilter('ncal', event.target.value)}
          >
            <option value="">All NCAL</option>
            {NCAL_OPTIONS.filter(Boolean).map((ncal) => (
              <option key={ncal} value={ncal}>
                {ncal}
              </option>
            ))}
          </Select>

          {(filters.search || filters.month || filters.ncal) ? (
            <div className="flex items-center xl:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ month: '', year: String(currentYear), ncal: '', search: '' })}
              >
                Reset
              </Button>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {viewMode === 'map' ? (
        <SectionCard
          title="Spatial Archive View"
          subtitle="Visualize archived incident activity by customer location within the selected date range."
          padding={false}
          className="min-h-[640px] flex-1"
        >
          <Suspense fallback={<TableSkeleton rows={8} />}>
            <CustomerMap
              customers={customers}
              onRefresh={() => api.getCustomers().then(setCustomers)}
              initialMode="trouble"
              showTroubleMode
              hideCustomerPins
              startDate={startDate}
              endDate={endDate}
            />
          </Suspense>
        </SectionCard>
      ) : (
        <SectionCard
          title="Archive Records"
          subtitle="Browse closed incidents, inspect durations, and open the full detail record."
          padding={false}
          className="min-h-0 flex-1"
        >
          <div className="flex min-h-0 flex-1 flex-col">
            {loading ? (
              <TableSkeleton rows={12} />
            ) : filteredData.length === 0 ? (
              <EmptyState
                icon={<Search className="h-8 w-8 text-muted-foreground" />}
                title="No archive results"
                desc="Try widening the date range or adjusting the search filters."
              />
            ) : (
              <DataTable
                columns={columns}
                data={filteredData}
                pageSize={25}
                className="flex-1"
                rowSelection={selectedRowMap}
                onRowSelectionChange={setSelectedRowMap}
                enableRowSelection={user?.role === 'admin'}
                getRowId={(row) => String(row.id)}
              />
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
