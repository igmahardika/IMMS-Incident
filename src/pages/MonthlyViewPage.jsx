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
    if (!count) return <div className="text-base-content/20 text-[10px] font-bold uppercase tracking-[0.15em]">Empty</div>;
    return (
      <div className="flex flex-col gap-0.5 py-1">
        <div className="text-[13.5px] font-bold text-base-content flex items-baseline gap-1 tracking-tight">
          {count} <span className="text-[10px] text-base-content/30 font-bold uppercase tracking-wider">cases</span>
        </div>
        <div className="flex flex-col gap-px">
          <div className="text-[10px] text-base-content/50 font-bold flex items-center gap-1.5">
            <Clock size={10} strokeWidth={1.5} className="opacity-30" />
            <span className="font-mono tabular-nums">{gross ? formatDuration(Math.round(gross)) : '0s'}</span>
          </div>
          <div className="text-[10px] text-primary font-bold flex items-center gap-1.5">
            <Zap size={10} strokeWidth={1.5} className="opacity-50" />
            <span className="font-mono tabular-nums">{nett ? formatDuration(Math.round(nett)) : '0s'}</span>
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
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <div className="text-2xl font-bold tracking-tight">Monthly Analysis</div>
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-base-content/40">Performance patterns and handling duration by category</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-bold opacity-40 uppercase tracking-[0.15em]">
            <Calendar size={14} /> Year:
          </div>
          <select className="select select-bordered select-sm w-32 font-bold" value={year} onChange={e => setYear(e.target.value)}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-base-100 shadow-sm rounded-xl overflow-hidden border border-base-content/5">
              <div className="p-4 md:p-6 flex flex-row items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <BarChart2 size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <div className="text-[9px] md:text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Total Incidents</div>
                  <div className="text-xl md:text-2xl font-bold font-mono tracking-tighter text-base-content">{yearlyCount} <span className="text-[9px] md:text-[10px] font-bold text-base-content/20">CASES</span></div>
                </div>
              </div>
            </div>
            <div className="bg-base-100 shadow-sm rounded-xl overflow-hidden border border-base-content/5">
              <div className="p-4 md:p-6 flex flex-row items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-success/10 flex items-center justify-center text-success shadow-inner">
                  <TrendingUp size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <div className="text-[9px] md:text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Avg Nett Duration</div>
                  <div className="text-xl md:text-2xl font-bold font-mono tracking-tighter text-success">{formatDuration(avgYearlyNett)}</div>
                </div>
              </div>
            </div>
            <div className="bg-base-100 shadow-sm rounded-xl overflow-hidden border border-base-content/5">
              <div className="p-4 md:p-6 flex flex-row items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-warning/10 flex items-center justify-center text-warning shadow-inner">
                  <Calendar size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <div className="text-[9px] md:text-[10px] font-bold text-base-content/40 uppercase tracking-[0.15em]">Busiest Month</div>
                  <div className="text-xl md:text-2xl font-bold tracking-tighter text-base-content truncate max-w-[120px]">{MONTH_NAMES[busyMonthIdx - 1] || '—'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-base-100 shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="shadow-[0_1px_0_rgba(var(--bc),0.05)]">
                    <th className="sticky left-0 bg-base-100/90 backdrop-blur-md z-30 w-40 min-w-[120px] border-r border-base-content/5 uppercase tracking-[0.15em] text-[10px] text-base-content/50 py-3">Period</th>
                    {NCAL_ORDER.map(n => (
                      <th key={n} className="text-center min-w-[140px] md:min-w-[160px] bg-transparent">
                        <div className="flex flex-col items-center gap-2">
                          <NcalBadge value={n} />
                          <div className="text-[8px] md:text-[9px] font-bold opacity-30 uppercase tracking-[0.15em]">CASES · GROSS · NETT</div>
                        </div>
                      </th>
                    ))}
                    <th className="sticky right-0 bg-base-100/90 backdrop-blur-md z-30 text-center w-40 md:w-48 uppercase tracking-[0.15em] text-[10px] text-base-content/50 py-3 border-l border-base-content/5">MONTHLY SUMMARY</th>
                  </tr>
                </thead>
                <tbody className="">
                  {months.map(mo => {
                    const monthData = grouped[mo] || {};
                    const totalCount = NCAL_ORDER.reduce((s, n) => s + (monthData[n]?.count || 0), 0);
                    const totalNett = NCAL_ORDER.reduce((s, n) => s + (monthData[n]?.totalNett || 0), 0);

                    return (
                      <tr key={mo} className="hover:bg-base-200/50 transition-colors group">
                        <td className="sticky left-0 bg-base-100 group-hover:bg-base-200/50 z-10 transition-colors border-r border-base-content/5">
                          <div className="flex items-center gap-3">
                            <div className={`w-1 h-8 rounded-full transition-colors ${totalCount > 0 ? 'bg-primary' : 'bg-base-300/30'}`} />
                            <div className="flex flex-col">
                              <span className="font-bold text-xs md:text-sm tracking-tight">{MONTH_NAMES[mo - 1]}</span>
                              <span className="text-[9px] md:text-[10px] font-bold opacity-40 uppercase tracking-[0.15em]">{year}</span>
                            </div>
                          </div>
                        </td>
                        {NCAL_ORDER.map(n => (
                          <td key={n} className="text-center p-4">
                            <MetricCell
                              count={monthData[n]?.count}
                              nett={monthData[n]?.totalNett}
                              gross={monthData[n]?.totalGross}
                            />
                          </td>
                        ))}
                        <td className="sticky right-0 bg-base-100 group-hover:bg-base-200/50 z-10 transition-colors text-center border-l border-base-content/5 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                          <div className="flex flex-col gap-1 items-center">
                            <div className="flex items-baseline gap-1">
                              <span className="text-base md:text-lg font-bold font-mono tracking-tighter">{totalCount || 0}</span>
                              <span className="text-[8px] md:text-[10px] font-bold opacity-40 uppercase">CASES</span>
                            </div>
                            <div className="text-[8px] md:text-[10px] font-bold flex items-center gap-1 opacity-60">
                              AVG: <span className="font-mono text-primary font-bold">
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
                  <tr className="bg-base-200/30">
                    <td className="sticky left-0 bg-base-200/50 z-20">
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary px-3">YEARLY TOTAL</span>
                    </td>
                    {NCAL_ORDER.map(n => {
                      const cnt = Object.values(grouped).reduce((s, m) => s + (m[n]?.count || 0), 0);
                      const nt = Object.values(grouped).reduce((s, m) => s + (m[n]?.totalNett || 0), 0);
                      const gr = Object.values(grouped).reduce((s, m) => s + (m[n]?.totalGross || 0), 0);
                      return (
                        <td key={n} className="text-center p-4">
                          <MetricCell count={cnt} nett={nt} gross={gr} />
                        </td>
                      );
                    })}
                    <td className="bg-primary/5 text-center">
                      <div className="flex flex-col gap-1 items-center py-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold font-mono tracking-tighter text-primary">{yearlyCount}</span>
                          <span className="text-[10px] font-bold opacity-40 uppercase tracking-[0.1em]">TOTAL</span>
                        </div>
                        <div className="text-[10px] font-bold opacity-60">
                          Grand Avg: <span className="font-mono text-primary font-bold">{formatDuration(avgYearlyNett)}</span>
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
