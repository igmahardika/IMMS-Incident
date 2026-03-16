import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDateTime, MONTH_NAMES, calculateIncidentLevel } from '../utils/api.js';
import { NcalBadge, StatusPill, DurationBadge, PageSpinner, EmptyState, LevelBadge } from '../components/ui/index.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Search, Download, Eye, Trash2, LayoutList, Map as MapIcon } from 'lucide-react';
import CustomerMap from '../components/ui/CustomerMap.jsx';

const NCAL_OPTIONS = ['', 'BLACK', 'RED', 'ORANGE', 'YELLOW', 'BLUE'];
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => currentYear - i);

function exportCSV(data) {
  const cols = ['case_no','ncal','site_name_manual','odp_bts','initial_problem','status','technician_name','root_cause','last_action','power_before','power_after','classification_name','start_time','end_time','duration_gross_seconds','duration_nett_seconds','total_pause_duration_seconds'];
  const head = cols.join(',');
  const rows = data.map(r => cols.map(c => `"${(r[c] ?? '').toString().replace(/"/g,'""')}"`).join(','));
  const csv = [head, ...rows].join('\n');
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
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
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
    if (viewMode === 'map' && customers.length === 0) {
      api.getCustomers().then(setCustomers).catch(console.error);
    }
  }, [viewMode, customers.length]);

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} incidents?`)) return;
    setDeleting(true);
    try {
      await api.deleteIncidents({ ids: selectedIds });
      addToast(`${selectedIds.length} incidents deleted successfully`, 'success');
      load();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setDeleting(false); }
  };

  const filtered = filters.search
    ? data.filter(r => [r.case_no, r.site_name_manual, r.initial_problem, r.technician_name].join(' ').toLowerCase().includes(filters.search.toLowerCase()))
    : data;

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  return (
    <div className="page-stack">
      {/* Page header */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Incident History</div>
          <div className="page-subtitle">{filtered.length} records found</div>
        </div>
        <div className="page-actions">
          {filtered.length > 0 && (
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => setSelectedIds(allSelected ? [] : filtered.map(r => r.id))}
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          )}
          {selectedIds.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected} disabled={deleting}>
              <Trash2 size={13} /> {deleting ? 'Deleting...' : `Delete (${selectedIds.length})`}
            </button>
          )}
          <div className="btn-group" style={{ marginRight: '0.5rem' }}>
            <button 
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <LayoutList size={14} />
            </button>
            <button 
              className={`btn btn-sm ${viewMode === 'map' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setViewMode('map')}
              title="Map View"
            >
              <MapIcon size={14} />
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(filtered)}>
            <Download size={13} /> Export to CSV
          </button>
        </div>
      </div>

      {viewMode === 'map' ? (
        <CustomerMap 
          customers={customers} 
          onRefresh={() => api.getCustomers().then(setCustomers)} 
          initialMode="trouble" 
          showTroubleMode={true}
          hideCustomerPins={true}
          startDate={filters.month ? `${filters.year}-${filters.month}-01 00:00:00` : `${filters.year}-01-01 00:00:00`}
          endDate={filters.month 
            ? `${filters.year}-${filters.month}-${new Date(parseInt(filters.year), parseInt(filters.month), 0).getDate()} 23:59:59` 
            : `${filters.year}-12-31 23:59:59`
          }
        />
      ) : (
        <>

      {/* Filter bar */}
      <div className="filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div className="filter-search" style={{ flex: 1, minWidth: '240px' }}>
          <Search size={13} className="filter-search-icon" />
          <input
            type="text" className="form-control filter-input"
            placeholder="Search by case, site, technician..."
            value={filters.search} onChange={e => setF('search', e.target.value)}
          />
        </div>
        <select className="form-control" style={{ width: '100px' }} value={filters.year} onChange={e => setF('year', e.target.value)}>
          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="form-control" style={{ width: '140px' }} value={filters.month} onChange={e => setF('month', e.target.value)}>
          <option value="">All Months</option>
          {MONTH_NAMES.map((m, i) => <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
        </select>
        <select className="form-control" style={{ width: '140px' }} value={filters.ncal} onChange={e => setF('ncal', e.target.value)}>
          <option value="">All NCAL</option>
          {NCAL_OPTIONS.filter(Boolean).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="section-card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="📂" title="No data found" desc="Try adjusting filters or search queries" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-xs">Incident</th>
                  <th className="text-xs">Site / ODP</th>
                  <th className="text-xs">Technical Details</th>
                  <th className="text-xs">Timeline</th>
                  <th className="text-xs">Durations</th>
                  <th className="text-xs">Technician</th>
                  <th className="text-right text-xs">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => {
                  const isSelected = selectedIds.includes(row.id);
                  return (
                    <tr
                      key={row.id}
                      onClick={() => {
                        setSelectedIds(p => isSelected ? p.filter(id => id !== row.id) : [...p, row.id]);
                      }}
                      style={{ 
                        background: isSelected ? 'var(--accent-subtle)' : undefined,
                        cursor: 'pointer'
                      }}
                      className="history-row"
                    >
                    <td>
                      <div className="page-stack" style={{ gap: 4 }}>
                        <div className="text-id text-sm" style={{ fontWeight: 600 }}>{row.case_no}</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <NcalBadge value={row.ncal} />
                          <LevelBadge level={calculateIncidentLevel(row.start_time, row.end_time)} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="page-stack" style={{ gap: 2 }}>
                        <div className="text-sm" style={{ fontWeight: 600 }}>
                          {['ORANGE', 'RED', 'BLACK'].includes(row.ncal) ? (row.odp_bts || row.site_name_manual || '—') : (row.site_name_manual || row.company_name || '—')}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{row.odp_bts || '—'}</div>
                      </div>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <div className="page-stack" style={{ gap: 4 }}>
                        <div className="text-sm text-truncate" title={row.initial_problem}>{row.initial_problem || '—'}</div>
                        <div className="text-xs text-truncate" style={{ color: 'var(--text-muted)' }} title={row.root_cause}>
                           {row.root_cause || row.classification_name || '—'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="page-stack" style={{ gap: 2 }}>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="text-id">{formatDateTime(row.start_time)}</span>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="text-id">{formatDateTime(row.end_time)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <DurationBadge seconds={row.duration_nett_seconds} />
                        <div className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>Gross: {Math.round(row.duration_gross_seconds/60)}m</div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{row.technician_name || '—'}</div>
                    </td>
                    <td>
                      <div className="cell-actions">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/incidents/${row.id}`); }} title="View Detailed Log">
                          <Eye size={14} className="text-accent" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
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
