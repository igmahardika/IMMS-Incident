import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDateTime, MONTH_NAMES, calculateIncidentLevel, getSLATarget } from '../utils/api.js';
import { NcalBadge, StatusPill, EmptyState, LevelBadge, Button, SectionCard, TableSkeleton } from '../components/ui/index.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Search, Download, Eye, Trash2, LayoutList, Map as MapIcon, ChevronRight, Calendar } from 'lucide-react';
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

function exportCSV(data) {
  const cols = ['case_no', 'ncal', 'brand_site', 'odp_bts', 'initial_problem', 'status',
    'technician_name', 'root_cause', 'last_action', 'power_before', 'power_after',
    'classification_name', 'start_time', 'end_time', 'duration_gross_seconds',
    'duration_nett_seconds', 'total_pause_duration_seconds'];
  const csv = [cols.join(','),
    ...data.map(r => cols.map(c => `"${(r[c] ?? '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `IMMS_History_${Date.now()}.csv`;
  a.click();
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

  const filtered = filters.search
    ? data.filter(r =>
        [r.case_no, r.brand_site, r.company_name, r.initial_problem, r.technician_name]
          .join(' ').toLowerCase().includes(filters.search.toLowerCase())
      )
    : data;

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const toggleRow = id => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const faintHdr = "py-3 px-3 text-[10px] font-black uppercase tracking-widest text-foreground/40 text-left bg-foreground/[0.02] border-b border-foreground/5";

  return (
    <div className="flex flex-col gap-6 h-full font-inter">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase">Incident Archive</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">{filtered.length} verified historical records</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
              <Button variant="ghost" size="sm" className="text-[9px] font-black tracking-widest" onClick={() => setSelectedIds(allSelected ? [] : filtered.map(r => r.id))}>
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
          <Button variant="ghost" size="sm" onClick={() => exportCSV(filtered)} className="font-bold text-[9px] tracking-widest">
            <Download size={12} /> EXPORT CSV
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
            <div className="overflow-auto w-full max-h-[70vh] custom-scrollbar">
              {loading ? (
                <TableSkeleton rows={12} />
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<Search size={40} className="text-foreground/10" />}
                  title="Archive Entry Not Found"
                  desc="Try adjusting filters or search parameters."
                />
              ) : (
                <table className="w-full text-left border-separate border-spacing-0 min-w-[2800px]">
                  <thead>
                    <tr className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
                      <th className={cn(faintHdr, "w-10 text-center sticky left-0 z-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]")} />
                      <th className={cn(faintHdr, "w-32 sticky left-10 z-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]")}>Ticket Hash</th>
                      <th className={cn(faintHdr, "min-w-[300px] max-w-[300px] sticky left-[168px] z-50 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.15)] pr-8")}>Site Specification</th>
                      <th className={cn(faintHdr, "w-32 text-center pl-6")}>Segment</th>
                      <th className={cn(faintHdr, "w-24 text-center")}>Spt. Level</th>
                      <th className={cn(faintHdr, "w-28 text-center")}>Lifecycle</th>
                      <th className={cn(faintHdr, "w-16 text-center")}>Level</th>
                      <th className={cn(faintHdr, "w-44")}>Field Engineer</th>
                      <th className={cn(faintHdr, "w-44")}>Node Mapping</th>
                      <th className={cn(faintHdr, "w-36")}>T0 (Discovery)</th>
                      <th className={cn(faintHdr, "w-36")}>T1 (Dispatch)</th>
                      <th className={cn(faintHdr, "w-36")}>T2 (Resolution)</th>
                      <th className={cn(faintHdr, "w-24 text-center")}>Gross ΔT</th>
                      <th className={cn(faintHdr, "w-24 text-center text-primary font-black bg-primary/[0.03]")}>Nett ΔT</th>
                      <th className={cn(faintHdr, "w-36")}>Pause A Start</th>
                      <th className={cn(faintHdr, "w-36")}>Pause A End</th>
                      <th className={cn(faintHdr, "w-36")}>Pause B Start</th>
                      <th className={cn(faintHdr, "w-36")}>Pause B End</th>
                      <th className={cn(faintHdr, "w-24 text-center")}>Sum Pause</th>
                      <th className={cn(faintHdr, "min-w-[280px]")}>Incident Manifest</th>
                      <th className={cn(faintHdr, "min-w-[280px]")}>Root Cause Analysis</th>
                      <th className={cn(faintHdr, "min-w-[280px]")}>Final Countermeasure</th>
                      <th className={cn(faintHdr, "min-w-[180px]")}>Audit Class</th>
                      <th className={cn(faintHdr, "w-20 text-center")}>Pwr₁</th>
                      <th className={cn(faintHdr, "w-20 text-center")}>Pwr₂</th>
                      <th className={cn(faintHdr, "w-12 sticky right-0 z-50 shadow-[-1px_0_0_0_rgba(0,0,0,0.05)]")} />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-foreground/5 text-[11px] font-bold">
                    {filtered.map(row => {
                      const isSel = selectedIds.includes(row.id);
                      const grossSec = row.duration_gross_seconds ?? 0;
                      const nettSec  = row.duration_nett_seconds  ?? 0;
                      const pauseSec = row.total_pause_duration_seconds ?? Math.max(0, grossSec - nettSec);
                      const siteName = ['BLACK', 'RED', 'ORANGE'].includes(row.ncal)
                        ? (row.brand_site || row.company_name || row.odp_bts || '—')
                        : (row.brand_site || row.company_name || '—');
                      const segOdp = row.ncal === 'BLUE' ? '' : (row.odp_bts || '');
                      const sptLv  = row.level_support || row.cust_support_level || '—';

                      return (
                        <tr key={row.id} className={cn("transition-all duration-200 group cursor-pointer", isSel ? "bg-primary/[0.08]" : "hover:bg-foreground/[0.02]")} onClick={() => toggleRow(row.id)}>
                          <td className={cn("px-4 py-2.5 text-center transition-colors sticky left-0 z-30 border-b border-foreground/5", isSel ? "bg-primary/5 shadow-[2px_0_4px_-2px_rgba(var(--color-primary),0.05)]" : "bg-background group-hover:bg-foreground/[0.01] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]")} onClick={e => e.stopPropagation()}>
                            <input type="checkbox" className="w-3.5 h-3.5 rounded border-foreground/20 text-primary transition-all focus:ring-primary focus:ring-offset-background bg-transparent" checked={isSel} onChange={() => toggleRow(row.id)} />
                          </td>

                          <td className={cn("px-3 py-2.5 sticky left-10 z-30 font-mono font-black text-[10px] text-primary tracking-tighter border-b border-r border-foreground/5", isSel ? "bg-primary/5 shadow-[2px_0_4px_-2px_rgba(var(--color-primary),0.05)]" : "bg-background group-hover:bg-foreground/[0.01] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]")}>{row.case_no || '—'}</td>
                          <td className={cn("px-4 py-2.5 sticky left-[168px] z-30 font-bold text-[11px] text-foreground tracking-tight truncate border-b border-r border-foreground/5 pr-8", isSel ? "bg-primary/5 shadow-[4px_0_12px_-4px_rgba(var(--color-primary),0.15)]" : "bg-background group-hover:bg-foreground/[0.01] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.15)]")} title={siteName}>{siteName}</td>
                          
                          <td className="px-3 py-2.5 text-center border-b border-r border-foreground/5 pl-6"><NcalBadge value={row.ncal} /></td>
                          <td className="px-3 py-2.5 text-center font-bold text-[10px] text-foreground/40 uppercase tracking-widest border-b border-r border-foreground/5">{sptLv}</td>
                          <td className="px-3 py-2.5 text-center border-b border-r border-foreground/5"><StatusPill status={row.status} /></td>
                          <td className="px-3 py-2.5 text-center border-b border-r border-foreground/5"><LevelBadge level={calculateIncidentLevel(row.start_time, row.end_time)} targetHours={getSLATarget(row.ncal) / 3600} /></td>
                          <td className="px-3 py-2.5 font-bold text-[11px] text-foreground/70 tracking-tight border-b border-r border-foreground/5" title={row.technician_name}>{row.technician_name || '—'}</td>
                          <td className="px-3 py-2.5 font-black text-[9px] text-foreground/20 uppercase tracking-widest truncate border-b border-r border-foreground/5" title={segOdp}>{segOdp || '—'}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-[10px] text-foreground/60 tabular-nums whitespace-pre border-b border-r border-foreground/5 leading-tight">{formatDateTime(row.start_time).replace(', ', '\n') || '—'}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-[10px] text-foreground/30 tabular-nums whitespace-pre border-b border-r border-foreground/5 leading-tight">{formatDateTime(row.escalation_time).replace(', ', '\n') || '—'}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-[10px] text-foreground/60 tabular-nums whitespace-pre border-b border-r border-foreground/5 leading-tight">{formatDateTime(row.end_time).replace(', ', '\n') || '—'}</td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-[10px] text-foreground/40 tabular-nums italic border-b border-r border-foreground/5">{fmtDur(grossSec)}</td>
                          <td className={cn("px-3 py-2.5 text-center font-mono font-black text-[11px] text-primary tabular-nums border-b border-r border-foreground/5", isSel ? "bg-primary/5" : "bg-primary/[0.02]")}>{fmtDur(nettSec)}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-[10px] text-foreground/30 tabular-nums whitespace-pre border-b border-r border-foreground/5 leading-tight">{formatDateTime(row.pause1_start).replace(', ', '\n') || '—'}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-[10px] text-foreground/30 tabular-nums whitespace-pre border-b border-r border-foreground/5 leading-tight">{formatDateTime(row.pause1_end).replace(', ', '\n') || '—'}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-[10px] text-foreground/30 tabular-nums whitespace-pre border-b border-r border-foreground/5 leading-tight">{formatDateTime(row.pause2_start).replace(', ', '\n') || '—'}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-[10px] text-foreground/30 tabular-nums whitespace-pre border-b border-r border-foreground/5 leading-tight">{formatDateTime(row.pause2_end).replace(', ', '\n') || '—'}</td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-[10px] text-foreground/40 tabular-nums italic border-b border-r border-foreground/5">{fmtDur(pauseSec)}</td>
                          <td className="px-4 py-2.5 font-bold text-[11px] text-foreground/70 tracking-tight leading-relaxed line-clamp-2 border-b border-r border-foreground/5" title={row.initial_problem}>{row.initial_problem || ''}</td>
                          <td className="px-4 py-2.5 font-bold text-[11px] text-foreground/70 tracking-tight leading-relaxed line-clamp-2 border-b border-r border-foreground/5" title={row.root_cause}>{row.root_cause || ''}</td>
                          <td className="px-4 py-2.5 font-bold text-[11px] text-foreground/70 tracking-tight leading-relaxed line-clamp-2 border-b border-r border-foreground/5" title={row.last_action}>{row.last_action || ''}</td>
                          <td className="px-4 py-2.5 font-black text-[9px] text-foreground/20 uppercase tracking-widest border-b border-r border-foreground/5" title={row.classification_name || row.klasifikasi}>{row.classification_name || row.klasifikasi || '—'}</td>
                          <td className="px-3 py-2.5 text-center font-mono font-black text-[10px] text-info/70 tabular-nums border-b border-r border-foreground/5">{row.power_before != null ? row.power_before : ''}</td>
                          <td className="px-3 py-2.5 text-center font-mono font-black text-[10px] text-success/70 tabular-nums border-b border-foreground/5">{row.power_after != null ? row.power_after : ''}</td>
                          
                          <td className={cn("px-2 py-1.5 align-middle border-b sticky right-0 z-30 transition-colors shadow-[-1px_0_0_0_rgba(0,0,0,0.05)]", isSel ? "bg-primary/5" : "bg-background group-hover:bg-foreground/[0.01]")} onClick={e => e.stopPropagation()}>
                            <button className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-foreground/5 transition-all active:scale-95 opacity-0 group-hover:opacity-100 mx-auto" onClick={() => navigate(`/incidents/${row.id}`)} title="View Detail">
                               <ChevronRight size={14} className="text-foreground/40" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
