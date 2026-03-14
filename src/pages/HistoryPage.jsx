import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDateTime, MONTH_NAMES, calculateIncidentLevel } from '../utils/api.js';
import { NcalBadge, StatusPill, DurationBadge, PageSpinner, EmptyState, LevelBadge } from '../components/ui/index.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Search, Download, Eye, Trash2 } from 'lucide-react';

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
          {selectedIds.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected} disabled={deleting}>
              <Trash2 size={13} /> {deleting ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(filtered)}>
            <Download size={13} /> Export to CSV
          </button>
        </div>
      </div>

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
                  <th className="text-center">
                    <input
                      type="checkbox"
                      style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                      checked={allSelected}
                      onChange={e => setSelectedIds(e.target.checked ? filtered.map(r => r.id) : [])}
                    />
                  </th>
                  <th>Case No</th>
                  <th>Level</th>
                  <th>NCAL</th>
                  <th>Site</th>
                  <th>ODP / BTS</th>
                  <th>Problem</th>
                  <th>Technician</th>
                  <th>Classification</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Gross</th>
                  <th>Nett</th>
                  <th className="text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr
                    key={row.id}
                    style={{ background: selectedIds.includes(row.id) ? 'var(--accent-subtle)' : undefined }}
                  >
                    <td className="text-center">
                      <input
                        type="checkbox"
                        style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                        checked={selectedIds.includes(row.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedIds(p => [...p, row.id]);
                          else setSelectedIds(p => p.filter(id => id !== row.id));
                        }}
                      />
                    </td>
                    <td className="text-mono">{row.case_no}</td>
                    <td><LevelBadge level={calculateIncidentLevel(row.start_time, row.end_time)} /></td>
                    <td><NcalBadge value={row.ncal} /></td>
                    <td className="text-truncate" style={{ fontSize: '0.845rem' }}>
                      {['ORANGE', 'RED', 'BLACK'].includes(row.ncal) ? (row.odp_bts || row.site_name_manual || '—') : (row.site_name_manual || row.company_name || '—')}
                    </td>
                    <td className="text-truncate" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row.odp_bts || '—'}</td>
                    <td className="text-truncate" style={{ fontSize: '0.786rem', color: 'var(--text-secondary)' }}>{row.initial_problem || '—'}</td>
                    <td style={{ fontSize: '0.845rem' }}>{row.technician_name || '—'}</td>
                    <td className="text-truncate" style={{ fontSize: '0.786rem', color: 'var(--text-muted)' }}>{row.classification_name || '—'}</td>
                    <td style={{ fontSize: '0.786rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(row.start_time)}</td>
                    <td style={{ fontSize: '0.786rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(row.end_time)}</td>
                    <td><DurationBadge seconds={row.duration_gross_seconds} /></td>
                    <td><DurationBadge seconds={row.duration_nett_seconds} /></td>
                    <td>
                      <div className="cell-actions">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/incidents/${row.id}`)} title="Detail">
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
