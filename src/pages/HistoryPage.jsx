import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDateTime, MONTH_NAMES, calculateIncidentLevel, getSLATarget } from '../utils/api.js';
import { NcalBadge, StatusPill, EmptyState, LevelBadge } from '../components/ui/index.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Search, Download, Eye, Trash2, LayoutList, Map as MapIcon } from 'lucide-react';
import CustomerMap from '../components/ui/CustomerMap.jsx';

const NCAL_OPTIONS = ['', 'BLACK', 'RED', 'ORANGE', 'YELLOW', 'BLUE'];
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => currentYear - i);

// ─── Table CSS ────────────────────────────────────────────────────────────────
// Key design decisions:
//   • Single font: var(--font-main) everywhere — no mixed mono/sans
//   • td has overflow:hidden so content NEVER bleeds into adjacent columns
//   • Spans use white-space:normal → long text wraps within the column width
//   • Only fixed-format values (timestamps, HH:MM:SS, case no) use nowrap
  /* TABLE_CSS block intentionally removed for Tailwind classes */

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
  }, [filters.month, filters.year, filters.ncal]);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight uppercase">Incident History</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-base-content/40">{filtered.length} records found</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <>
              <button className="btn btn-ghost btn-sm"
                onClick={() => setSelectedIds(allSelected ? [] : filtered.map(r => r.id))}>
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected} disabled={deleting}>
                <Trash2 size={12} /> {deleting ? 'Deleting...' : `Delete (${selectedIds.length})`}
              </button>
            </>
          )}
          <div className="join">
            <button className={`btn btn-sm join-item ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('list')} title="List View"><LayoutList size={14} /></button>
            <button className={`btn btn-sm join-item ${viewMode === 'map' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('map')} title="Map View"><MapIcon size={14} /></button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(filtered)}>
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {viewMode === 'map' ? (
        <CustomerMap customers={customers} onRefresh={() => api.getCustomers().then(setCustomers)}
          initialMode="trouble" showTroubleMode hideCustomerPins
          startDate={filters.month ? `${filters.year}-${filters.month}-01 00:00:00` : `${filters.year}-01-01 00:00:00`}
          endDate={filters.month
            ? `${filters.year}-${filters.month}-${new Date(+filters.year, +filters.month, 0).getDate()} 23:59:59`
            : `${filters.year}-12-31 23:59:59`}
        />
      ) : (
        <>
          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap bg-base-100 p-3 rounded-xl shadow-sm">
            <label className="input input-ghost input-md flex items-center gap-2 flex-1 min-w-[240px] bg-base-200/50">
              <Search size={16} className="text-base-content/60" />
              <input type="text" className="grow font-semibold text-sm"
                placeholder="Search case, site, technician..."
                value={filters.search} onChange={e => setF('search', e.target.value)} />
            </label>
            <select className="select select-ghost select-md w-[100px] font-semibold text-sm bg-base-200/50" value={filters.year}
              onChange={e => setF('year', e.target.value)}>
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="select select-ghost select-md w-[140px] font-semibold text-sm bg-base-200/50" value={filters.month}
              onChange={e => setF('month', e.target.value)}>
              <option value="">All Months</option>
              {MONTH_NAMES.map((m, i) => <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
            </select>
            <select className="select select-ghost select-md w-[140px] font-semibold text-sm bg-base-200/50" value={filters.ncal}
              onChange={e => setF('ncal', e.target.value)}>
              <option value="">All NCAL</option>
              {NCAL_OPTIONS.filter(Boolean).map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="bg-base-100 shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-auto w-full max-h-[75vh] custom-scrollbar border-t border-base-content/5">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                  <span className="loading loading-spinner loading-lg text-primary opacity-20"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-base-content/65">Syncing History Data</span>
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<Search size={48} className="opacity-20" />}
                  title="No results found"
                  desc="Try adjusting your filters or search terms."
                />
              ) : (
                <table className="table table-sm table-pin-rows table-stacked w-full lg:min-w-[2840px]">
                  <thead>
                    <tr className="shadow-[0_1px_0_rgba(var(--bc),0.05)]">
                      <th className="bg-base-100/80 backdrop-blur-xl w-[36px]" />
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[110px] text-left text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">No Case</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[200px] text-left text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Site</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[90px] text-center text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">NCAL</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[90px] text-center text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Spt. Level</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[80px] text-center text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Status</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[60px] text-center text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Lv</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[160px] text-left text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Technician</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[160px] text-left text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Segment / ODP</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[155px] text-left text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Start Open</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[155px] text-left text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Start Esc.</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[155px] text-left text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">End</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[90px] text-center text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Gross</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[90px] text-center text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Nett</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[155px] text-left text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Pause 1 Start</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[155px] text-left text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Pause 1 End</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[155px] text-left text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Pause 2 Start</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[155px] text-left text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Pause 2 End</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[90px] text-center text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Tot. Pause</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[240px] text-left text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Problem</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[220px] text-left text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Penyebab</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[220px] text-left text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Action Terakhir</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[140px] text-left text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Klasifikasi</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[70px] text-center text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Pwr↓</th>
                      <th className="bg-base-100/80 backdrop-blur-xl min-w-[70px] text-center text-xs font-bold uppercase tracking-wider text-base-content/65 py-3">Pwr↑</th>
                      <th className="bg-base-100/80 backdrop-blur-xl w-[40px]" />
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map(row => {
                      const isSel = selectedIds.includes(row.id);
                      const grossSec = row.duration_gross_seconds ?? 0;
                      const nettSec  = row.duration_nett_seconds  ?? 0;
                      const pauseSec = row.total_pause_duration_seconds ?? Math.max(0, grossSec - nettSec);
                      // Site: infra NCAL (BLACK/RED/ORANGE) may not have brand_site → fallback odp_bts
                      const siteName = ['BLACK', 'RED', 'ORANGE'].includes(row.ncal)
                        ? (row.brand_site || row.company_name || row.odp_bts || '—')
                        : (row.brand_site || row.company_name || '—');
                      // Segment/ODP: BLUE is always empty
                      const segOdp = row.ncal === 'BLUE' ? '' : (row.odp_bts || '');
                      const sptLv  = row.level_support || row.cust_support_level || '—';

                      // Style helpers — single font, only 3 variants:
                      //   .dim   = muted secondary text
                      //   .bold  = primary bold (case no, site, nett dur)
                      //   .faint = very muted (pause, escalation)
                      // Style helpers mapped to JetBrains Mono and Font-Medium
                      const dim   = 'text-base-content/65 font-bold';
                      const bold  = 'text-base-content/95 font-bold';
                      const faint = 'text-base-content/45 font-bold';
                      const reg   = 'text-base-content/85 font-medium'; // Higher contrast for body text
                      const nwrap = 'font-mono whitespace-nowrap text-sm tracking-tight tabular-nums';
                      const awrap = 'whitespace-normal font-sans text-sm leading-relaxed tracking-tight'; 

                      return (
                        <tr key={row.id} className={`hover:bg-base-200/50 transition-colors duration-300 group border-b border-base-content/5 ${isSel ? 'bg-primary/5' : ''}`} onClick={() => toggleRow(row.id)}>

                          {/* Checkbox — hover-reveal */}
                          <td className="px-2 text-center" onClick={e => e.stopPropagation()} data-label="Select">
                            <input type="checkbox" className={`form-checkbox ht-cb`}
                              checked={isSel} onChange={() => toggleRow(row.id)} />
                          </td>

                          <td data-label="No Case">
                            <span className={`${nwrap} ${bold}`}>{row.case_no || '—'}</span>
                          </td>

                          {/* Site — wraps if long */}
                          <td title={siteName} data-label="Site">
                            <span className={`${awrap} ${bold}`}>{siteName}</span>
                          </td>

                          {/* NCAL */}
                          <td className="text-center" data-label="NCAL">
                            <NcalBadge value={row.ncal} />
                          </td>

                          {/* Support Level */}
                          <td className="text-center" data-label="Spt. Level">
                            <span className={dim}>{sptLv}</span>
                          </td>

                          {/* Status */}
                          <td className="text-center" data-label="Status">
                            <StatusPill status={row.status} />
                          </td>

                          {/* Level */}
                          <td className="text-center text-xs" data-label="Lv">
                            <LevelBadge level={calculateIncidentLevel(row.start_time, row.end_time)}
                              targetHours={getSLATarget(row.ncal) / 3600} />
                          </td>

                          {/* Technician — wraps if long */}
                          <td title={row.technician_name} data-label="Technician">
                            <span className={`${awrap} ${dim}`}>{row.technician_name || '—'}</span>
                          </td>

                          {/* Segment / ODP — wraps */}
                          <td title={segOdp} data-label="Segment / ODP">
                            <span className={`${awrap} ${faint}`}>{segOdp}</span>
                          </td>

                          {/* Start Open — fixed format, nowrap */}
                          <td data-label="Start Open">
                            <span className={`${nwrap} ${dim}`}>{formatDateTime(row.start_time) || '—'}</span>
                          </td>

                          {/* Start Escalation */}
                          <td data-label="Start Esc.">
                            <span className={`${nwrap} ${faint}`}>{formatDateTime(row.escalation_time) || '—'}</span>
                          </td>

                          {/* End */}
                          <td data-label="End">
                            <span className={`${nwrap} ${dim}`}>{formatDateTime(row.end_time) || '—'}</span>
                          </td>

                          {/* Gross Duration */}
                          <td className="text-center" data-label="Gross">
                            <span className={`${nwrap} ${faint}`}>{fmtDur(grossSec)}</span>
                          </td>

                          {/* Nett Duration — primary/bold */}
                          <td className="text-center" data-label="Nett">
                            <span className={`${nwrap} ${bold}`}>{fmtDur(nettSec)}</span>
                          </td>

                          {/* Pause 1 Start */}
                          <td data-label="Pause 1 Start"><span className={`${nwrap} ${faint}`}>{formatDateTime(row.pause1_start) || '—'}</span></td>

                          {/* Pause 1 End */}
                          <td data-label="Pause 1 End"><span className={`${nwrap} ${faint}`}>{formatDateTime(row.pause1_end) || '—'}</span></td>

                          {/* Pause 2 Start */}
                          <td data-label="Pause 2 Start"><span className={`${nwrap} ${faint}`}>{formatDateTime(row.pause2_start) || '—'}</span></td>

                          {/* Pause 2 End */}
                          <td data-label="Pause 2 End"><span className={`${nwrap} ${faint}`}>{formatDateTime(row.pause2_end) || '—'}</span></td>

                          {/* Total Pause */}
                          <td className="text-center" data-label="Tot. Pause">
                            <span className={`${nwrap} ${faint}`}>{fmtDur(pauseSec)}</span>
                          </td>

                          {/* Problem — wrap max 3 lines */}
                          <td title={row.initial_problem} data-label="Problem">
                            <span className={`${awrap} ${reg}`}>{row.initial_problem || ''}</span>
                          </td>

                          {/* Penyebab */}
                          <td title={row.root_cause} data-label="Penyebab">
                            <span className={`${awrap} ${reg}`}>{row.root_cause || ''}</span>
                          </td>

                          {/* Action Terakhir */}
                          <td title={row.last_action} data-label="Action Terakhir">
                            <span className={`${awrap} ${reg}`}>{row.last_action || ''}</span>
                          </td>

                          {/* Klasifikasi — wraps */}
                          <td title={row.classification_name || row.klasifikasi} data-label="Klasifikasi">
                            <span className={`${awrap} ${reg}`}>{row.classification_name || row.klasifikasi || ''}</span>
                          </td>

                          {/* Power Before */}
                          <td className="text-center" data-label="Pwr↓">
                            <span className={`${nwrap} text-info`}>
                              {row.power_before != null ? row.power_before : ''}
                            </span>
                          </td>

                          {/* Power After */}
                          <td className="text-center" data-label="Pwr↑">
                            <span className={`${nwrap} text-success`}>
                              {row.power_after != null ? row.power_after : ''}
                            </span>
                          </td>

                          {/* Detail */}
                          <td className="text-center" onClick={e => e.stopPropagation()} data-label="Actions">
                            <div className="md:opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-95 group-hover:scale-100">
                              <button className="btn btn-ghost btn-circle btn-sm shadow-sm opacity-80 hover:opacity-100"
                                onClick={() => navigate(`/incidents/${row.id}`)} title="View Detail">
                                <Eye size={15} className="text-accent" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
