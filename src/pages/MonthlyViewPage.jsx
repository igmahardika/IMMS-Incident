import React, { useEffect, useState } from 'react';
import { api, MONTH_NAMES, formatDuration } from '../utils/api.js';
import { NcalBadge, Spinner, SectionCard } from '../components/ui/index.jsx';
import { Calendar, Clock, Zap, TrendingUp, Filter, BarChart2 } from 'lucide-react';

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
    if (!count) return <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', opacity: 0.4 }}>—</div>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0' }}>
        <div className="text-sm" style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: 4 }}>
          {count} <span className="text-xs" style={{ color: 'var(--text-muted)', fontWeight: 500 }}>CASES</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div className="text-xs" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={10} style={{ opacity: 0.5 }} />
            <span className="text-id" style={{ fontWeight: 500 }}>{gross ? formatDuration(Math.round(gross)) : '0s'}</span>
          </div>
          <div className="text-xs" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Zap size={10} style={{ opacity: 0.8 }} />
            <span className="text-id" style={{ fontWeight: 600 }}>{nett ? formatDuration(Math.round(nett)) : '0s'}</span>
          </div>
        </div>
      </div>
    );
  };

  // Yearly Stats for KPI
  const yearlyCount = history.length;
  const yearlyNett = history.reduce((s, i) => s + (i.duration_nett_seconds || 0), 0);
  const avgYearlyNett = yearlyCount ? Math.round(yearlyNett / yearlyCount) : 0;
  
  // Find Busy Month
  const busyMonthIdx = Object.keys(grouped).reduce((a, b) => {
    const countA = Object.values(grouped[a]).reduce((s, n) => s + n.count, 0);
    const countB = Object.values(grouped[b]).reduce((s, n) => s + n.count, 0);
    return countA > countB ? a : b;
  }, Object.keys(grouped)[0] || 1);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title text-xl">Monthly View Analysis</div>
          <div className="page-subtitle text-xs">Monthly performance patterns and handling duration by category</div>
        </div>
        <div className="page-actions">
          <div className="filter-bar" style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)' }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select className="form-control" value={year} onChange={e => setYear(e.target.value)} style={{ width: 100, border: 'none', background: 'transparent', height: 'auto', padding: '0 4px' }}>
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
      ) : (
        <>
          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <SectionCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <BarChart2 size={22} />
                </div>
                <div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL INCIDENTS {year}</div>
                  <div className="text-xl" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{yearlyCount} <span className="text-sm" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Cases</span></div>
                </div>
              </div>
            </SectionCard>
            <SectionCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                  <TrendingUp size={22} />
                </div>
                <div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>AVG NETT DURATION</div>
                  <div className="text-lg" style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatDuration(avgYearlyNett)}</div>
                </div>
              </div>
            </SectionCard>
            <SectionCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                  <Calendar size={22} />
                </div>
                <div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>BUSIEST MONTH</div>
                  <div className="text-lg" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{MONTH_NAMES[busyMonthIdx - 1]}</div>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="section-card" style={{ padding: 0 }}>
            <div className="table-wrap" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th className="text-xs" style={{ minWidth: 160, position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 10, borderBottom: '2px solid var(--border)' }}>Period</th>
                    {NCAL_ORDER.map(n => (
                      <th key={n} style={{ textAlign: 'left', minWidth: 150, borderBottom: '2px solid var(--border)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <NcalBadge value={n} />
                          <div className="text-xs" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 700, display: 'flex', gap: 8 }}>
                            <span>CASES</span>
                            <span>•</span>
                            <span>GROSS</span>
                            <span>•</span>
                            <span>NETT</span>
                          </div>
                        </div>
                      </th>
                    ))}
                    <th className="text-xs" style={{ minWidth: 160, background: 'var(--bg-elevated)', borderBottom: '2px solid var(--border)' }}>Monthly Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(mo => {
                    const monthData = grouped[mo] || {};
                    const totalCount = NCAL_ORDER.reduce((s, n) => s + (monthData[n]?.count || 0), 0);
                    const totalNett = NCAL_ORDER.reduce((s, n) => s + (monthData[n]?.totalNett || 0), 0);
                    
                    return (
                      <tr key={mo} style={{ height: 80 }}>
                        <td className="text-sm" style={{ fontWeight: 800, position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 5, borderRight: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 4, height: 24, borderRadius: 2, background: totalCount > 0 ? 'var(--accent)' : 'transparent' }} />
                            <div>
                              <div>{MONTH_NAMES[mo - 1]}</div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Year {year}</div>
                            </div>
                          </div>
                        </td>
                        {NCAL_ORDER.map(n => (
                          <td key={n} style={{ verticalAlign: 'middle' }}>
                            <MetricCell 
                              count={monthData[n]?.count} 
                              nett={monthData[n]?.totalNett}
                              gross={monthData[n]?.totalGross}
                            />
                          </td>
                        ))}
                        <td style={{ background: 'var(--bg-elevated)', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="text-lg" style={{ fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{totalCount || 0}</div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Cases</div>
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              Avg Nett: <span className="text-id" style={{ fontWeight: 700, color: 'var(--accent)' }}>
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
                  <tr style={{ background: 'var(--bg-elevated)', borderTop: '2px solid var(--accent)' }}>
                    <td className="text-sm" style={{ fontWeight: 900, color: 'var(--accent)', position: 'sticky', left: 0, background: 'var(--bg-elevated)', zIndex: 10 }}>YEARLY TOTAL</td>
                    {NCAL_ORDER.map(n => {
                      const cnt = Object.values(grouped).reduce((s, m) => s + (m[n]?.count || 0), 0);
                      const nt = Object.values(grouped).reduce((s, m) => s + (m[n]?.totalNett || 0), 0);
                      const gr = Object.values(grouped).reduce((s, m) => s + (m[n]?.totalGross || 0), 0);
                      return (
                        <td key={n} style={{ verticalAlign: 'middle' }}>
                          <MetricCell count={cnt} nett={nt} gross={gr} />
                        </td>
                      );
                    })}
                    <td style={{ background: 'var(--accent)', color: '#fff', verticalAlign: 'middle', padding: '12px' }}>
                      <div className="page-stack" style={{ gap: 2 }}>
                        <div className="text-xl" style={{ fontWeight: 900, lineHeight: 1 }}>{yearlyCount}</div>
                        <div className="text-xs" style={{ opacity: 0.9, fontWeight: 700, textTransform: 'uppercase' }}>Grand Avg Nett</div>
                        <div className="text-id text-sm" style={{ fontWeight: 800 }}>
                          {formatDuration(avgYearlyNett)}
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
