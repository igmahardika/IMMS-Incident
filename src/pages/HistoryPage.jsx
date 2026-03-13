import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDateTime, MONTH_NAMES } from '../utils/api.js';
import { NcalBadge, StatusPill, DurationBadge, SectionCard, Spinner, EmptyState } from '../components/ui/index.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Search, Download, Eye } from 'lucide-react';

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
  const { addToast } = useToast();
  const navigate = useNavigate();

  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.month) params.month = filters.month;
      if (filters.year) params.year = filters.year;
      if (filters.ncal) params.ncal = filters.ncal;
      const res = await api.getHistory(params);
      setData(res);
    } catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [filters.month, filters.year, filters.ncal]);

  useEffect(() => { load(); }, [load]);

  const filtered = filters.search
    ? data.filter(r => [r.case_no, r.site_name_manual, r.initial_problem, r.technician_name].join(' ').toLowerCase().includes(filters.search.toLowerCase()))
    : data;

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Done Incidents</div>
          <div className="page-subtitle">{filtered.length} record ditemukan</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(filtered)}><Download size={13} /> Export CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input type="text" className="form-control" placeholder="Cari..." style={{ paddingLeft: '2rem', maxWidth: 200 }} value={filters.search} onChange={e => setF('search', e.target.value)} />
        </div>
        <select className="form-control" value={filters.year} onChange={e => setF('year', e.target.value)}>
          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="form-control" value={filters.month} onChange={e => setF('month', e.target.value)}>
          <option value="">Semua Bulan</option>
          {MONTH_NAMES.map((m, i) => <option key={i+1} value={String(i+1).padStart(2,'0')}>{m}</option>)}
        </select>
        <select className="form-control" value={filters.ncal} onChange={e => setF('ncal', e.target.value)}>
          <option value="">Semua NCAL</option>
          {NCAL_OPTIONS.filter(Boolean).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📂" title="Tidak ada data" desc="Coba ubah filter atau buat incident baru" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Case No</th><th>NCAL</th><th>Site</th><th>ODP/BTS</th>
                  <th>Problem</th><th>Teknisi</th><th>Klasifikasi</th>
                  <th>Mulai</th><th>Selesai</th><th>Gross</th><th>Nett</th><th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700 }}>{row.case_no}</td>
                    <td><NcalBadge value={row.ncal} /></td>
                    <td style={{ maxWidth: 150 }}>
                      <div style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.site_name_manual || row.company_name || '—'}</div>
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{row.odp_bts || '—'}</td>
                    <td style={{ maxWidth: 180 }}>
                      <div style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{row.initial_problem || '—'}</div>
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{row.technician_name || '—'}</td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{row.classification_name || '—'}</td>
                    <td style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(row.start_time)}</td>
                    <td style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(row.end_time)}</td>
                    <td><DurationBadge seconds={row.duration_gross_seconds} /></td>
                    <td><DurationBadge seconds={row.duration_nett_seconds} /></td>
                    <td>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/incidents/${row.id}`)}><Eye size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
