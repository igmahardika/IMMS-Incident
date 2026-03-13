import React, { useEffect, useState } from 'react';
import { api, MONTH_NAMES, formatDuration } from '../utils/api.js';
import { NcalBadge, Spinner } from '../components/ui/index.jsx';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => currentYear - i);
const NCAL_ORDER = ['BLACK', 'RED', 'ORANGE', 'YELLOW', 'BLUE'];

export default function MonthlyViewPage() {
  const [year, setYear] = useState(String(currentYear));
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getHistory({ year, limit: 2000 }).then(setHistory).catch(console.error).finally(() => setLoading(false));
  }, [year]);

  // Group by month and NCAL
  const grouped = {};
  history.forEach(inc => {
    if (!inc.end_time) return;
    const mo = new Date(inc.end_time).getMonth() + 1;
    if (!grouped[mo]) grouped[mo] = {};
    if (!grouped[mo][inc.ncal]) grouped[mo][inc.ncal] = { count: 0, totalNett: 0 };
    grouped[mo][inc.ncal].count += 1;
    grouped[mo][inc.ncal].totalNett += inc.duration_nett_seconds || 0;
  });

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Monthly View</div>
          <div className="page-subtitle">Rekapan bulanan per kategori NCAL</div>
        </div>
        <div className="page-actions">
          <select className="form-control" value={year} onChange={e => setYear(e.target.value)} style={{ maxWidth: 100 }}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}><Spinner /></div> : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bulan</th>
                  {NCAL_ORDER.map(n => (
                    <React.Fragment key={n}>
                      <th style={{ textAlign: 'center' }}><NcalBadge value={n} /></th>
                    </React.Fragment>
                  ))}
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Avg Durasi Nett</th>
                </tr>
              </thead>
              <tbody>
                {months.map(mo => {
                  const monthData = grouped[mo] || {};
                  const total = NCAL_ORDER.reduce((s, n) => s + (monthData[n]?.count || 0), 0);
                  const totalNett = NCAL_ORDER.reduce((s, n) => s + (monthData[n]?.totalNett || 0), 0);
                  const avgNett = total ? Math.round(totalNett / total) : null;
                  return (
                    <tr key={mo}>
                      <td style={{ fontWeight: 600 }}>{MONTH_NAMES[mo - 1]} {year}</td>
                      {NCAL_ORDER.map(n => (
                        <td key={n} style={{ textAlign: 'center' }}>
                          {monthData[n]?.count
                            ? <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{monthData[n].count}</span>
                            : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                        </td>
                      ))}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: total > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{total || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {avgNett ? (
                          <span className="timer-badge">{formatDuration(avgNett)}</span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
                {/* Total row */}
                <tr style={{ borderTop: '2px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>TOTAL {year}</td>
                  {NCAL_ORDER.map(n => {
                    const cnt = Object.values(grouped).reduce((s, m) => s + (m[n]?.count || 0), 0);
                    return <td key={n} style={{ textAlign: 'center', fontWeight: 700, color: cnt > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{cnt || '—'}</td>;
                  })}
                  <td style={{ textAlign: 'center', fontWeight: 800 }}>{history.length}</td>
                  <td style={{ textAlign: 'center' }}>
                    {history.length > 0 ? (
                      <span className="timer-badge">{formatDuration(Math.round(history.reduce((s, i) => s + (i.duration_nett_seconds || 0), 0) / history.length))}</span>
                    ) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
