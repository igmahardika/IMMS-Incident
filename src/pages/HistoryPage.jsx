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
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Incident History</div>
          <div className="page-subtitle">{filtered.length} records found</div>
        </div>
        <div className="page-actions">
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
          <div className="btn-group" style={{ marginRight: '0.5rem' }}>
            <button className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('list')} title="List View"><LayoutList size={14} /></button>
            <button className={`btn btn-sm ${viewMode === 'map' ? 'btn-primary' : 'btn-ghost'}`}
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
          <div className="filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="filter-search" style={{ flex: 1, minWidth: '240px' }}>
              <Search size={13} className="filter-search-icon" />
              <input type="text" className="input input-bordered input-md  filter-input"
                placeholder="Search by case, site, technician..."
                value={filters.search} onChange={e => setF('search', e.target.value)} />
            </div>
            <select className="select select-bordered select-md " style={{ width: 100 }} value={filters.year}
              onChange={e => setF('year', e.target.value)}>
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="select select-bordered select-md " style={{ width: 140 }} value={filters.month}
              onChange={e => setF('month', e.target.value)}>
              <option value="">All Months</option>
              {MONTH_NAMES.map((m, i) => <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
            </select>
            <select className="select select-bordered select-md " style={{ width: 140 }} value={filters.ncal}
              onChange={e => setF('ncal', e.target.value)}>
              <option value="">All NCAL</option>
              {NCAL_OPTIONS.filter(Boolean).map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="section-card" style={{ padding: 0 }}>
            {/* TABLE_CSS removed */}
            <div style={{ overflowX: 'auto', width: '100%' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
              ) : filtered.length === 0 ? (
                <EmptyState icon="📂" title="No data found" desc="Try adjusting filters or search queries" />
              ) : (
                /*
                  Column widths (content-driven, single font var(--font-main) 11px):
                  cb=36  case=110  site=175  ncal=90  spt=80  status=72  lv=46
                  tech=145  seg=148  t_open=132  t_esc=132  t_end=132
                  gross=82  nett=82
                  p1s=132  p1e=132  p2s=132  p2e=132  tot=82
                  problem=200  penyebab=160  action=160  klasif=120
                  pwrB=62  pwrA=62  detail=40
                  Total ≈ 2,840px
                */
                <table className="table table-zebra table-sm" style={{ minWidth: '2840px' }}>
                  <thead>
                    <tr>
                      <th className="w-[36px]" />
                      <th className="w-[110px] text-left">No Case</th>
                      <th className="w-[175px] text-left">Site</th>
                      <th className="w-[90px] text-center">NCAL</th>
                      <th className="w-[80px] text-center">Spt. Level</th>
                      <th className="w-[72px] text-center">Status</th>
                      <th className="w-[62px] text-center">Lv</th>
                      <th className="w-[145px] text-left">Technician</th>
                      <th className="w-[148px] text-left">Segment / ODP</th>
                      <th className="w-[132px] text-left">Start Open</th>
                      <th className="w-[132px] text-left">Start Esc.</th>
                      <th className="w-[132px] text-left">End</th>
                      <th className="w-[82px] text-center">Gross</th>
                      <th className="w-[82px] text-center">Nett</th>
                      <th className="w-[132px] text-left">Pause 1 Start</th>
                      <th className="w-[132px] text-left">Pause 1 End</th>
                      <th className="w-[132px] text-left">Pause 2 Start</th>
                      <th className="w-[132px] text-left">Pause 2 End</th>
                      <th className="w-[82px] text-center">Tot. Pause</th>
                      <th className="w-[200px] text-left">Problem</th>
                      <th className="w-[160px] text-left">Penyebab</th>
                      <th className="w-[160px] text-left">Action Terakhir</th>
                      <th className="w-[120px] text-left">Klasifikasi</th>
                      <th className="w-[62px] text-center">Pwr↓</th>
                      <th className="w-[62px] text-center">Pwr↑</th>
                      <th className="w-[40px]" />
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
                      const dim   = { color: 'var(--text-secondary)' };
                      const bold  = { color: 'var(--text-primary)', fontWeight: 600 };
                      const faint = { color: 'var(--text-muted)' };
                      const nwrap = 'ht-nowrap'; // class shorthand for fixed-format values

                      return (
                        <tr key={row.id} className={isSel ? 'sel' : ''} onClick={() => toggleRow(row.id)}>

                          {/* Checkbox — hover-reveal */}
                          <td style={{ padding: '0 8px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <input type="checkbox" className={`form-checkbox ht-cb`}
                              checked={isSel} onChange={() => toggleRow(row.id)} />
                          </td>

                          {/* No Case — fixed width code, nowrap */}
                          <td>
                            <span className={nwrap} style={bold}>{row.case_no || '—'}</span>
                          </td>

                          {/* Site — wraps if long */}
                          <td title={siteName}>
                            <span className="ht-wrap" style={bold}>{siteName}</span>
                          </td>

                          {/* NCAL */}
                          <td style={{ textAlign: 'center' }}>
                            <NcalBadge value={row.ncal} />
                          </td>

                          {/* Support Level */}
                          <td style={{ textAlign: 'center' }}>
                            <span style={dim}>{sptLv}</span>
                          </td>

                          {/* Status */}
                          <td style={{ textAlign: 'center' }}>
                            <StatusPill status={row.status} />
                          </td>

                          {/* Level */}
                          <td style={{ textAlign: 'center' }}>
                            <LevelBadge level={calculateIncidentLevel(row.start_time, row.end_time)}
                              targetHours={getSLATarget(row.ncal) / 3600} />
                          </td>

                          {/* Technician — wraps if long */}
                          <td title={row.technician_name}>
                            <span className="ht-wrap" style={dim}>{row.technician_name || '—'}</span>
                          </td>

                          {/* Segment / ODP — wraps */}
                          <td title={segOdp}>
                            <span className="ht-wrap" style={faint}>{segOdp}</span>
                          </td>

                          {/* Start Open — fixed format, nowrap */}
                          <td>
                            <span className={nwrap} style={dim}>{formatDateTime(row.start_time) || '—'}</span>
                          </td>

                          {/* Start Escalation */}
                          <td>
                            <span className={nwrap} style={faint}>{formatDateTime(row.escalation_time) || '—'}</span>
                          </td>

                          {/* End */}
                          <td>
                            <span className={nwrap} style={dim}>{formatDateTime(row.end_time) || '—'}</span>
                          </td>

                          {/* Gross Duration */}
                          <td style={{ textAlign: 'center' }}>
                            <span className={nwrap} style={faint}>{fmtDur(grossSec)}</span>
                          </td>

                          {/* Nett Duration — primary/bold */}
                          <td style={{ textAlign: 'center' }}>
                            <span className={nwrap} style={bold}>{fmtDur(nettSec)}</span>
                          </td>

                          {/* Pause 1 Start */}
                          <td><span className={nwrap} style={faint}>{formatDateTime(row.pause1_start) || '—'}</span></td>

                          {/* Pause 1 End */}
                          <td><span className={nwrap} style={faint}>{formatDateTime(row.pause1_end) || '—'}</span></td>

                          {/* Pause 2 Start */}
                          <td><span className={nwrap} style={faint}>{formatDateTime(row.pause2_start) || '—'}</span></td>

                          {/* Pause 2 End */}
                          <td><span className={nwrap} style={faint}>{formatDateTime(row.pause2_end) || '—'}</span></td>

                          {/* Total Pause */}
                          <td style={{ textAlign: 'center' }}>
                            <span className={nwrap} style={faint}>{fmtDur(pauseSec)}</span>
                          </td>

                          {/* Problem — wrap max 3 lines */}
                          <td title={row.initial_problem}>
                            <span className="ht-wrap" style={dim}>{row.initial_problem || ''}</span>
                          </td>

                          {/* Penyebab */}
                          <td title={row.root_cause}>
                            <span className="ht-wrap" style={dim}>{row.root_cause || ''}</span>
                          </td>

                          {/* Action Terakhir */}
                          <td title={row.last_action}>
                            <span className="ht-wrap" style={dim}>{row.last_action || ''}</span>
                          </td>

                          {/* Klasifikasi — wraps */}
                          <td title={row.classification_name || row.klasifikasi}>
                            <span className="ht-wrap" style={dim}>{row.classification_name || row.klasifikasi || ''}</span>
                          </td>

                          {/* Power Before */}
                          <td style={{ textAlign: 'center' }}>
                            <span className={nwrap}
                              style={{ color: row.power_before != null ? 'var(--info)' : 'transparent' }}>
                              {row.power_before != null ? row.power_before : ''}
                            </span>
                          </td>

                          {/* Power After */}
                          <td style={{ textAlign: 'center' }}>
                            <span className={nwrap}
                              style={{ color: row.power_after != null ? 'var(--success)' : 'transparent' }}>
                              {row.power_after != null ? row.power_after : ''}
                            </span>
                          </td>

                          {/* Detail */}
                          <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <button className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => navigate(`/incidents/${row.id}`)} title="View Detail">
                              <Eye size={13} strokeWidth={1.5} className="text-accent" />
                            </button>
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
