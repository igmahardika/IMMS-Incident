import React, { useEffect, useState } from 'react';
import { api, MONTH_NAMES, formatDuration } from '../utils/api.js';
import { NcalBadge, Spinner } from '../components/ui/index.jsx';
import { Calendar, Clock, Zap, TrendingUp, BarChart2 } from 'lucide-react';

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
    if (!grouped[mo][inc.ncal]) grouped[mo][inc.ncal] = { count: 0, totalNett: 0, totalGross: 0 };
    grouped[mo][inc.ncal].count += 1;
    grouped[mo][inc.ncal].totalNett += inc.duration_nett_seconds || 0;
    grouped[mo][inc.ncal].totalGross += inc.duration_gross_seconds || 0;
  });

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const MetricCell = ({ count, nett, gross }) => {
    if (!count) return <div style={{ color: 'var(--text-muted)', opacity: 0.3, fontSize: '0.75rem' }}>—</div>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '2px 0' }}>
        <div className="text-sm" style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: 4 }}>
          {count} <span className="text-xs" style={{ color: 'var(--text-muted)', fontWeight: 500 }}>cases</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div className="text-xs" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} strokeWidth={1.5} style={{ opacity: 0.4 }} />
            <span className="text-id tabular">{gross ? formatDuration(Math.round(gross)) : '0s'}</span>
          </div>
          <div className="text-xs" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={10} strokeWidth={1.5} style={{ opacity: 0.7 }} />
            <span className="text-id tabular" style={{ fontWeight: 600 }}>{nett ? formatDuration(Math.round(nett)) : '0s'}</span>
          </div>
        </div>
      </div>
    );
  };

  // Yearly Stats
  const yearlyCount = history.length;
  const yearlyNett = history.reduce((s, i) => s + (i.duration_nett_seconds || 0), 0);
  const avgYearlyNett = yearlyCount ? Math.round(yearlyNett / yearlyCount) : 0;

  const busyMonthIdx = Object.keys(grouped).reduce((a, b) => {
    const countA = Object.values(grouped[a] || {}).reduce((s, n) => s + n.count, 0);
    const countB = Object.values(grouped[b] || {}).reduce((s, n) => s + n.count, 0);
    return countA > countB ? a : b;
  }, Object.keys(grouped)[0] || 1);

  return (
    <div className="page-stack">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Monthly View Analysis</div>
          <div className="page-subtitle">Monthly performance patterns and handling duration by category</div>
        </div>
        <div className="page-actions">
          <select className="select select-bordered select-md " value={year} onChange={e => setYear(e.target.value)} style={{ width: 100 }}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                  <BarChart2 size={18} />
                </div>
                <div>
                  <div className="kpi-label">Total Incidents {year}</div>
                  <div className="kpi-value tabular" style={{ fontSize: '1.5rem' }}>{yearlyCount} <span className="text-sm" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>cases</span></div>
                </div>
              </div>
            </div>
            <div className="kpi-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', flexShrink: 0 }}>
                  <TrendingUp size={18} />
                </div>
                <div>
                  <div className="kpi-label">Avg Nett Duration</div>
                  <div className="kpi-value tabular" style={{ fontSize: '1.25rem' }}>{formatDuration(avgYearlyNett)}</div>
                </div>
              </div>
            </div>
            <div className="kpi-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)', flexShrink: 0 }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <div className="kpi-label">Busiest Month</div>
                  <div className="kpi-value" style={{ fontSize: '1.25rem' }}>{MONTH_NAMES[busyMonthIdx - 1] || '—'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="section-card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="data-table" style={{ borderCollapse: 'collapse' }}>
                <colgroup>
                  <col style={{ width: 180 }} />
                  <col style={{ width: 145 }} />
                  <col style={{ width: 145 }} />
                  <col style={{ width: 145 }} />
                  <col style={{ width: 145 }} />
                  <col style={{ width: 145 }} />
                  <col style={{ width: 180 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="text-left" style={{ position: 'sticky', left: 0, background: 'var(--bg-elevated)', zIndex: 10 }}>
                      Period
                    </th>
                    {NCAL_ORDER.map(n => (
                      <th key={n}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
                          <NcalBadge value={n} />
                          <div className="text-xs" style={{ color: 'var(--text-muted)', letterSpacing: '0.04em', display: 'flex', gap: 6, fontWeight: 500 }}>
                            <span>CASES</span><span style={{ opacity: 0.4 }}>·</span><span>GROSS</span><span style={{ opacity: 0.4 }}>·</span><span>NETT</span>
                          </div>
                        </div>
                      </th>
                    ))}
                    <th>MONTHLY SUMMARY</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(mo => {
                    const monthData = grouped[mo] || {};
                    const totalCount = NCAL_ORDER.reduce((s, n) => s + (monthData[n]?.count || 0), 0);
                    const totalNett = NCAL_ORDER.reduce((s, n) => s + (monthData[n]?.totalNett || 0), 0);

                    return (
                      <tr key={mo} className="tr-hover-accent" style={{ height: 72 }}>
                        <td className="text-left text-sm" style={{ fontWeight: 700, position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 3, height: 20, borderRadius: 2, background: totalCount > 0 ? 'var(--accent)' : 'var(--border)', flexShrink: 0 }} />
                            <div>
                              <div>{MONTH_NAMES[mo - 1]}</div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{year}</div>
                            </div>
                          </div>
                        </td>
                        {NCAL_ORDER.map(n => (
                          <td key={n} className="text-center" style={{ verticalAlign: 'middle' }}>
                            <MetricCell
                              count={monthData[n]?.count}
                              nett={monthData[n]?.totalNett}
                              gross={monthData[n]?.totalGross}
                            />
                          </td>
                        ))}
                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                              <div className="text-lg" style={{ fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{totalCount || 0}</div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>cases</div>
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              AVG: <span className="text-id tabular" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                                {totalCount ? formatDuration(Math.round(totalNett / totalCount)) : '—'}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '1px dashed var(--border-strong)' }}>
                    <td className="text-xs text-left" style={{ fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', position: 'sticky', left: 0, background: 'var(--bg-elevated)', zIndex: 10 }}>
                      Yearly Total
                    </td>
                    {NCAL_ORDER.map(n => {
                      const cnt = Object.values(grouped).reduce((s, m) => s + (m[n]?.count || 0), 0);
                      const nt = Object.values(grouped).reduce((s, m) => s + (m[n]?.totalNett || 0), 0);
                      const gr = Object.values(grouped).reduce((s, m) => s + (m[n]?.totalGross || 0), 0);
                      return (
                        <td key={n} style={{ background: 'var(--bg-elevated)', verticalAlign: 'middle' }}>
                          <MetricCell count={cnt} nett={nt} gross={gr} />
                        </td>
                      );
                    })}
                    <td className="text-center" style={{ background: 'var(--accent-subtle)', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <div className="text-xl" style={{ fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{yearlyCount}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>total</div>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Grand Avg: <span className="text-id" style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatDuration(avgYearlyNett)}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
