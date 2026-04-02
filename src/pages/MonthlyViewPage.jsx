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
    if (!count) return (
      <div className="flex flex-col items-center justify-center h-full opacity-10">
        <div className="w-8 h-px bg-base-content/20" />
      </div>
    );
    
    // Calculate Averages
    const avgNett = Math.round(nett / count);
    const avgGross = Math.round(gross / count);
    
    return (
      <div className="flex flex-col gap-0.5 group/cell">
        <div className="flex items-start justify-between">
          <div className="text-sm font-bold text-base-content font-mono tracking-tighter leading-none">
            {formatDuration(avgNett)}
          </div>
          <div className="badge badge-sm badge-ghost font-bold text-[10px] opacity-60 px-1 h-3.5 border-none min-w-[20px]">
            {count}
          </div>
        </div>
        <div className="flex flex-col border-l border-base-content/10 pl-1.5">
          <div className="text-xs text-base-content/65 font-bold flex items-center gap-1 uppercase tracking-tighter leading-none">
            <span className="font-mono text-base-content/80 text-[11px]">{formatDuration(avgGross)}</span>
          </div>
        </div>
      </div>
    );
  };

  // Yearly Stats
  const yearlyCount = history.length;
  const yearlyNett = history.reduce((s, i) => s + (i.duration_nett_seconds || 0), 0);
  const yearlyGross = history.reduce((s, i) => s + (i.duration_gross_seconds || 0), 0);
  const avgYearlyNett = yearlyCount ? Math.round(yearlyNett / yearlyCount) : 0;
  const avgYearlyGross = yearlyCount ? Math.round(yearlyGross / yearlyCount) : 0;
  const efficiencyRatio = yearlyGross ? Math.round((yearlyNett / yearlyGross) * 100) : 0;

  const busyMonthIdx = Object.keys(grouped).reduce((a, b) => {
    const countA = Object.values(grouped[a] || {}).reduce((s, n) => s + n.count, 0);
    const countB = Object.values(grouped[b] || {}).reduce((s, n) => s + n.count, 0);
    return countA > countB ? a : b;
  }, Object.keys(grouped)[0] || 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 py-1">
        <div className="flex items-baseline gap-3">
          <div className="text-xl font-bold tracking-tight">Monthly Analysis</div>
          <div className="hidden md:block text-xs font-semibold uppercase tracking-wider text-base-content/50">Performance patterns by category</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold opacity-50 uppercase tracking-widest">
            <Calendar size={12} /> Year
          </div>
          <select className="select select-bordered select-xs w-24 font-bold h-7 min-h-0 text-xs" value={year} onChange={e => setYear(e.target.value)}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-base-100 shadow-sm rounded-xl p-3 border border-base-content/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <BarChart2 size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-base-content/65 uppercase tracking-tighter leading-none">Total Case</div>
                <div className="text-xl font-bold font-mono tracking-tighter text-base-content mt-1 leading-none">{yearlyCount}</div>
              </div>
            </div>
            
            <div className="bg-base-100 shadow-sm rounded-xl p-3 border border-base-content/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center text-success border border-success/20">
                <Clock size={18} />
              </div>
              <div>
                <div className="text-[10px] font-bold text-base-content/30 uppercase tracking-widest leading-none">Avg Nett</div>
                <div className="text-lg font-bold font-mono tracking-tighter text-success mt-0.5">{formatDuration(avgYearlyNett)}</div>
              </div>
            </div>

            <div className="bg-base-100 shadow-sm rounded-xl p-3 border border-base-content/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-base-content/5 flex items-center justify-center text-base-content/60 border border-base-content/10">
                <Calendar size={18} />
              </div>
              <div>
                <div className="text-[10px] font-bold text-base-content/30 uppercase tracking-widest leading-none">Peak Month</div>
                <div className="text-lg font-bold tracking-tighter text-base-content mt-0.5 truncate max-w-[100px]">
                  {MONTH_NAMES[busyMonthIdx - 1] || '—'}
                </div>
              </div>
            </div>

            <div className="bg-base-100 shadow-sm rounded-xl p-3 border border-base-content/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center text-warning border border-warning/20">
                <Zap size={18} />
              </div>
              <div>
                <div className="text-[10px] font-bold text-base-content/30 uppercase tracking-widest leading-none">Efficiency</div>
                <div className="text-lg font-bold font-mono tracking-tighter text-warning mt-0.5">{efficiencyRatio}%</div>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-base-100 shadow-sm border border-base-content/5 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table table-bordered w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-base-200/50 backdrop-blur-md">
                    <th className="sticky left-0 bg-base-200/80 z-30 min-w-[140px] border-r border-base-content/10 uppercase tracking-tighter text-xs text-base-content/65 py-2.5 font-bold">Period</th>
                    {NCAL_ORDER.map(n => (
                      <th key={n} className="text-center min-w-[110px] md:min-w-[130px] pb-1.5 bg-transparent border-r border-base-content/5">
                        <div className="flex flex-col items-center gap-1.5">
                          <NcalBadge value={n} />
                        </div>
                      </th>
                    ))}
                    <th className="sticky right-0 bg-base-200/80 z-30 text-center min-w-[140px] md:min-w-[160px] uppercase tracking-tighter text-xs text-base-content/65 py-2.5 border-l border-base-content/10 font-bold">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-content/5">
                  {months.map(mo => {
                    const monthData = grouped[mo] || {};
                    const totalCount = NCAL_ORDER.reduce((s, n) => s + (monthData[n]?.count || 0), 0);
                    const totalNett = NCAL_ORDER.reduce((s, n) => s + (monthData[n]?.totalNett || 0), 0);
                    const totalGross = NCAL_ORDER.reduce((s, n) => s + (monthData[n]?.totalGross || 0), 0);
                    const avgNett = totalCount ? Math.round(totalNett / totalCount) : 0;
                    const eff = totalGross ? Math.round((totalNett / totalGross) * 100) : 0;

                    return (
                      <tr key={mo} className="hover:bg-primary/5 transition-all group border-b border-base-content/5">
                        <td className="sticky left-0 bg-base-100 group-hover:bg-base-100 z-10 transition-colors border-r border-base-content/10">
                          <div className="flex items-center gap-3 px-1">
                            <div className={`w-1 h-7 rounded-full transition-all duration-300 ${totalCount > 0 ? 'bg-primary' : 'bg-base-300/20'}`} />
                            <div className="flex flex-col">
                              <span className="font-bold text-xs tracking-tight">{MONTH_NAMES[mo - 1]}</span>
                              <span className="text-[10px] font-bold opacity-20 uppercase tracking-widest leading-none">{year}</span>
                            </div>
                          </div>
                        </td>
                        {NCAL_ORDER.map(n => (
                          <td key={n} className="py-1 px-3 border-r border-base-content/5">
                            <MetricCell
                              count={monthData[n]?.count}
                              nett={monthData[n]?.totalNett}
                              gross={monthData[n]?.totalGross}
                            />
                          </td>
                        ))}
                        <td className="sticky right-0 bg-base-100 group-hover:bg-base-100 z-10 text-center border-l border-base-content/10">
                          <div className="flex flex-col gap-0 items-center px-2">
                            <div className="flex items-center gap-1.5">
                               <span className="text-lg font-bold font-mono tracking-tighter text-primary">{totalCount || 0}</span>
                               <span className="badge badge-sm font-bold opacity-65 uppercase h-4 px-1 text-xs border-none">{eff}%</span>
                            </div>
                            <div className="text-xs font-bold text-base-content/65 flex items-center gap-1 uppercase tracking-tighter leading-none">
                               <span className="font-mono text-base-content/85">{formatDuration(avgNett)}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-base-content/5">
                    <td className="sticky left-0 bg-base-300 z-20 border-r border-base-content/10 py-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-base-content/50 px-3">Yearly Profile</span>
                    </td>
                    {NCAL_ORDER.map(n => {
                      const cnt = Object.values(grouped).reduce((s, m) => s + (m[n]?.count || 0), 0);
                      const nt = Object.values(grouped).reduce((s, m) => s + (m[n]?.totalNett || 0), 0);
                      const gr = Object.values(grouped).reduce((s, m) => s + (m[n]?.totalGross || 0), 0);
                      return (
                        <td key={n} className="py-1 px-3 border-r border-base-content/5">
                          <MetricCell count={cnt} nett={nt} gross={gr} />
                        </td>
                      );
                    })}
                    <td className="bg-primary z-20 text-center py-1.5">
                      <div className="flex flex-col gap-0 items-center">
                        <div className="flex items-baseline gap-1 focus-within:outline-none">
                          <span className="text-base font-bold font-mono tracking-tighter text-primary-content">{yearlyCount}</span>
                          <span className="text-[10px] font-bold text-primary-content/30 uppercase tracking-widest">Total</span>
                        </div>
                        <div className="text-[10px] font-bold text-primary-content/60 leading-none">
                          <span className="font-mono">{formatDuration(avgYearlyNett)}</span>
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
