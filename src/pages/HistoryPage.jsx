import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDateTime, MONTH_NAMES, calculateIncidentLevel, getSLATarget } from '../utils/api.js';
import { NcalBadge, StatusPill, EmptyState, LevelBadge, Button, SectionCard, TableSkeleton } from '../components/ui/index.jsx';
import { DataTable } from '../components/tables/DataTable.jsx';
import { exportToExcel } from '../utils/exportStats.js';
import { useToast } from '../context/ToastContext.jsx';
import { Search, FileSpreadsheet, Trash2, LayoutList, Map as MapIcon, ChevronRight, Calendar } from 'lucide-react';
import CustomerMap from '../components/ui/CustomerMap.jsx';
import { cn } from '../lib/utils.js';

const NCAL_OPTIONS = ['', 'BLACK', 'RED', 'ORANGE', 'YELLOW', 'BLUE'];
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => currentYear - i);

// Format seconds → HH:MM:SS
function fmtDur(sec) {
  if (sec == null || sec === '') return '';
  if (sec === 0) return '00:00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function exportData(data) {
  exportToExcel(data, `IMMS_History_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export default function HistoryPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ month: '', year: String(currentYear), ncal: '', search: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [customers, setCustomers] = useState([]);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 1000 };
      if (filters.month) params.month = filters.month;
      if (filters.year) params.year = filters.year;
      if (filters.ncal) params.ncal = filters.ncal;
      const res = await api.getHistory(params);
      setData(res);
      setSelectedIds([]);
    } catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [filters.month, filters.year, filters.ncal, addToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (viewMode === 'map' && customers.length === 0)
      api.getCustomers().then(setCustomers).catch(console.error);
  }, [viewMode, customers.length]);

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} incidents permanently?`)) return;
    setDeleting(true);
    try {
      await api.deleteIncidents({ ids: selectedIds });
      addToast(`${selectedIds.length} incidents deleted`, 'success');
      load();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setDeleting(false); }
  };

  const columns = useMemo(() => [
    {
      id: 'selection',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="w-3 h-3 rounded border-foreground/20 text-primary"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="w-3 h-3 rounded border-foreground/20 text-primary"
        />
      ),
      size: 50,
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'case_no',
      header: 'Case No',
      cell: ({ row }) => <span className="font-mono text-primary font-bold">{row.original.case_no}</span>,
      size: 100,
      meta: { className: 'whitespace-nowrap px-2' },
    },
    {
      accessorKey: 'brand_site',
      header: 'Site Specification',
      cell: ({ row }) => {
        const val = row.original.brand_site || row.original.company_name || '—';
        return <span title={val} className="truncate block">{val}</span>;
      },
      size: 280,
      meta: { flexible: true },
    },
    {
      accessorKey: 'ncal',
      header: 'NCAL',
      cell: ({ row }) => <NcalBadge value={row.original.ncal} />,
      size: 85,
      meta: { className: 'whitespace-nowrap px-2' },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.status} />,
      size: 100,
      meta: { className: 'whitespace-nowrap px-2' },
    },
    {
      accessorKey: 'technician_name',
      header: 'Technician',
      cell: ({ row }) => <span className="text-foreground/70 truncate block">{row.original.technician_name || '—'}</span>,
      size: 150,
      meta: { flexible: true },
    },
    {
      accessorKey: 'start_time',
      header: 'Start Date',
      cell: ({ row }) => <span className="font-mono text-[10px] text-foreground/50 tabular-nums">{formatDateTime(row.original.start_time)}</span>,
      size: 160,
      meta: { className: 'whitespace-nowrap px-2' },
    },
    {
      id: 'duration',
      header: 'Nett Time',
      cell: ({ row }) => <span className="font-mono text-primary tabular-nums font-bold">{fmtDur(row.original.duration_nett_seconds)}</span>,
      size: 110,
      meta: { className: 'whitespace-nowrap' },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button 
          onClick={(e) => { e.stopPropagation(); navigate(`/incidents/${row.original.id}`); }}
          className="p-1 hover:bg-foreground/5 rounded transition-transform active:scale-90"
        >
          <ChevronRight size={14} className="text-foreground/40" />
        </button>
      ),
      size: 50,
      meta: { className: 'text-right' },
    }
  ], [navigate]);

  const allSelected = selectedIds.length > 0 && selectedIds.length === data.length;
  const toggleRow = id => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const faintHdr = "py-3 px-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 text-left bg-foreground/[0.02] border-b border-foreground/5";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-start justify-between gap-4 flex-wrap shrink-0 mb-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase">Incident Archive</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">{data.length} verified historical records</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
              <Button variant="ghost" size="sm" className="text-[9px] font-black tracking-widest" onClick={() => setSelectedIds(allSelected ? [] : data.map(r => r.id))}>
                {allSelected ? 'DESELECT' : 'SELECT ALL'}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDeleteSelected} isLoading={deleting} className="text-error hover:bg-error/10 text-[9px] font-black tracking-widest">
                <Trash2 size={12} /> DELETE ({selectedIds.length})
              </Button>
            </div>
          )}
          <div className="flex bg-foreground/[0.03] p-0.5 rounded-md border border-foreground/5 mr-2">
            <button className={cn("px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded transition-all", viewMode === 'list' ? "bg-background text-primary shadow-sm" : "text-foreground/40 hover:text-foreground/60")} onClick={() => setViewMode('list')}>
              <LayoutList size={12} className="inline mr-1" /> List
            </button>
            <button className={cn("px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded transition-all", viewMode === 'map' ? "bg-background text-primary shadow-sm" : "text-foreground/40 hover:text-foreground/60")} onClick={() => setViewMode('map')}>
              <MapIcon size={12} className="inline mr-1" /> Map
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => exportData(data)} className="font-bold text-[9px] tracking-widest text-success hover:bg-success/10">
            <FileSpreadsheet size={12} className="mr-1" /> EXCEL REPORT
          </Button>
        </div>
      </div>

      {viewMode === 'map' ? (
        <SectionCard padding={false} className="min-h-[600px]">
          <CustomerMap customers={customers} onRefresh={() => api.getCustomers().then(setCustomers)}
            initialMode="trouble" showTroubleMode hideCustomerPins
            startDate={filters.month ? `${filters.year}-${filters.month}-01 00:00:00` : `${filters.year}-01-01 00:00:00`}
            endDate={filters.month
              ? `${filters.year}-${filters.month}-${new Date(+filters.year, +filters.month, 0).getDate()} 23:59:59`
              : `${filters.year}-12-31 23:59:59`}
          />
        </SectionCard>
      ) : (
        <>
          {/* Filter system */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4">
            <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/5 rounded-md px-3 h-9">
              <Search size={14} className="text-foreground/30" />
              <input 
                type="text" 
                className="bg-transparent border-none focus:ring-0 text-[11px] font-bold w-full py-1 placeholder:text-foreground/20 uppercase tracking-widest" 
                placeholder="Search Archive (Case, Site, Tech)..." 
                value={filters.search} 
                onChange={e => setF('search', e.target.value)} 
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/5 rounded-md px-3 h-9">
                <Calendar size={12} className="text-foreground/30" />
                <select className="bg-transparent border-none focus:ring-0 text-[10px] font-black text-foreground/60 uppercase tracking-widest min-w-[80px]" value={filters.year} onChange={e => setF('year', e.target.value)}>
                  {YEAR_OPTIONS.map(y => <option key={y} value={y} className="bg-background">{y}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/5 rounded-md px-3 h-9">
                <select className="bg-transparent border-none focus:ring-0 text-[10px] font-black text-foreground/60 uppercase tracking-widest min-w-[120px]" value={filters.month} onChange={e => setF('month', e.target.value)}>
                  <option value="" className="bg-background">Full Year</option>
                  {MONTH_NAMES.map((m, i) => <option key={i + 1} value={String(i + 1).padStart(2, '0')} className="bg-background">{m.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/5 rounded-md px-3 h-9">
                <select className="bg-transparent border-none focus:ring-0 text-[10px] font-black text-foreground/60 uppercase tracking-widest min-w-[100px]" value={filters.ncal} onChange={e => setF('ncal', e.target.value)}>
                  <option value="" className="bg-background">ALL NCAL</option>
                  {NCAL_OPTIONS.filter(Boolean).map(n => <option key={n} value={n} className="bg-background">{n}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Data grid */}
          <SectionCard padding={false} className="border-foreground/5 min-h-0 flex-1">
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              {loading ? (
                <TableSkeleton rows={12} />
              ) : data.length === 0 ? (
                <EmptyState
                  icon={<Search size={40} className="text-foreground/10" />}
                  title="Archive Entry Not Found"
                  desc="Try adjusting filters or search parameters."
                />
              ) : (
                <DataTable 
                  columns={columns} 
                  data={data} 
                  globalFilter={filters.search}
                  setGlobalFilter={(val) => setF('search', val)}
                  pageSize={25}
                />
              )}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
