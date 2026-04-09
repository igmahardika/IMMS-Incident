import React, { useEffect, useState } from 'react';
import { api, MONTH_NAMES, formatDuration } from '../utils/api.js';
import { NcalBadge, SectionCard } from '../components/ui/index.jsx';
import { Calendar, Clock, Zap, BarChart2 } from 'lucide-react';
import { cn } from '../lib/utils.js';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => currentYear - i);
const NCAL_ORDER = ['BLACK', 'RED', 'ORANGE', 'YELLOW', 'BLUE'];

const PageSpinner = () => (
    <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
);

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
      <div className="flex flex-col items-center justify-center p-3 opacity-5 overflow-hidden">
        <div className="w-4 h-0.5 bg-foreground rounded-full rotate-45 transform translate-y-0.5" />
      </div>
    );
    
    const avgNett = Math.round(nett / count);
    const avgGross = Math.round(gross / count);
    
    return (
      <div className="flex flex-col gap-1.5 py-2.5 px-3 group/cell hover:bg-foreground/[0.02] transition-colors">
        <div className="flex items-start justify-between">
          <div className="text-[11px] font-black text-foreground tracking-tighter leading-none font-mono">
            {formatDuration(avgNett)}
          </div>
          <div className="bg-primary/10 text-primary font-black text-[9px] px-1 rounded-sm h-3.5 flex items-center justify-center min-w-[18px] border border-primary/20">
            {count}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1 flex-1 bg-foreground/5 rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-500", avgNett < avgGross ? "bg-success" : "bg-warning")} 
              style={{ width: `${Math.min(100, (avgNett / Math.max(1, avgGross)) * 100)}%` }} 
            />
          </div>
          <span className="text-[9px] font-black text-foreground/20 font-mono tracking-tighter">{formatDuration(avgGross)}</span>
        </div>
      </div>
    );
  };

  // Yearly Stats
  const yearlyCount = history.length;
  const yearlyNett = history.reduce((s, i) => s + (i.duration_nett_seconds || 0), 0);
  const yearlyGross = history.reduce((s, i) => s + (i.duration_gross_seconds || 0), 0);
  const avgYearlyNett = yearlyCount ? Math.round(yearlyNett / yearlyCount) : 0;
  const efficiencyRatio = yearlyGross ? Math.round((yearlyNett / yearlyGross) * 100) : 0;

  const busyMonthIdx = Object.keys(grouped).length > 0
    ? Object.keys(grouped).reduce((a, b) => {
        const countA = Object.values(grouped[a] || {}).reduce((s, n) => s + n.count, 0);
        const countB = Object.values(grouped[b] || {}).reduce((s, n) => s + n.count, 0);
        return countA > countB ? a : b;
      }, Object.keys(grouped)[0])
    : 1;

  return (
    <div className="flex flex-col h-full overflow-hidden font-inter">
      <div className="flex items-start justify-between gap-4 flex-wrap shrink-0 mb-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase">Monthly Analysis</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">Strategic performance & lifecycle trends</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/5 rounded-md px-3 h-9 shadow-[inset_0_1px_1px_rgba(0,0,0,0.02)]">
            <span className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.15em] flex items-center gap-1.5"><Calendar size={12} /> Temporal Filter</span>
            <div className="w-px h-3 bg-foreground/10 mx-1" />
            <select 
              className="bg-transparent border-none focus:ring-0 text-[10px] font-black text-foreground/70 uppercase tracking-widest outline-none cursor-pointer"
              value={year} 
              onChange={e => setYear(e.target.value)}
            >
              {YEAR_OPTIONS.map(y => <option key={y} value={y} className="bg-background">{y} CALENDAR</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pr-2 -mr-2">
          <div className="flex flex-col gap-6 pb-8">
            {/* KPI Analytics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                  { label: 'Yearly Aggregate', value: yearlyCount, sub: 'Total Cases', icon: BarChart2, color: 'text-primary', bg: 'bg-primary/5' },
                  { label: 'Resolution AVG', value: formatDuration(avgYearlyNett), sub: 'Nett Response', icon: Clock, color: 'text-success', bg: 'bg-success/5' },
                  { label: 'Temporal Peak', value: (MONTH_NAMES[busyMonthIdx - 1] || '—').toUpperCase(), sub: 'Volume Max', icon: Calendar, color: 'text-foreground/40', bg: 'bg-foreground/5' },
                  { label: 'Efficiency Ratio', value: `${efficiencyRatio}%`, sub: 'Nett/Gross', icon: Zap, color: 'text-warning', bg: 'bg-warning/5' }
              ].map((kpi, i) => (
                  <div key={i} className="relative group overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.03] to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                      <div className="relative bg-background border border-foreground/5 rounded-xl p-4 flex items-center gap-4 transition-all duration-300 group-hover:border-primary/20 group-hover:shadow-xl group-hover:shadow-primary/5">
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-foreground/5 transition-transform duration-500 group-hover:rotate-6", kpi.bg, kpi.color)}>
                              <kpi.icon size={18} />
                          </div>
                          <div className="flex flex-col min-w-0">
                              <span className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em] leading-none mb-1.5">{kpi.label}</span>
                              <span className="text-xl font-black tracking-tighter text-foreground leading-none truncate font-mono">{kpi.value}</span>
                              <div className="flex items-center gap-1.5 mt-2">
                                  <div className={cn("h-1 w-8 rounded-full", kpi.bg.replace('/5', '/20'))} />
                                  <span className="text-[8px] font-black tracking-[0.1em] text-foreground/20 uppercase whitespace-nowrap">{kpi.sub}</span>
                              </div>
                          </div>
                      </div>
                  </div>
              ))}
            </div>

            {/* Main Table */}
            <SectionCard padding={false} className="border-foreground/5 overflow-hidden">
              <div className="overflow-auto custom-scrollbar w-full relative">
                <table className="w-full text-left border-separate border-spacing-0 table-fixed">
                  <thead>
                    <tr className="bg-foreground/[0.02]">
                      <th className="sticky left-0 top-0 bg-background/95 backdrop-blur-md z-40 w-[140px] border-r border-b border-foreground/5 shadow-[1px_1px_0_0_rgba(0,0,0,0.05)]">Temporal Period</th>
                      {NCAL_ORDER.map(n => (
                        <th key={n} className="sticky top-0 bg-background/95 backdrop-blur-md z-30 text-center w-[120px] border-r border-b border-foreground/5">
                          <NcalBadge value={n} />
                        </th>
                      ))}
                      <th className="sticky right-0 top-0 bg-background/95 backdrop-blur-md z-40 text-center min-w-[150px] border-l border-b border-foreground/5 shadow-[-1px_1px_0_0_rgba(0,0,0,0.05)]">Performance Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/5">
                    {months.map(mo => {
                      const monthData = grouped[mo] || {};
                      const totalCount = NCAL_ORDER.reduce((s, n) => s + (monthData[n]?.count || 0), 0);
                      const totalNett = NCAL_ORDER.reduce((s, n) => s + (monthData[n]?.totalNett || 0), 0);
                      const totalGross = NCAL_ORDER.reduce((s, n) => s + (monthData[n]?.totalGross || 0), 0);
                      const avgNett = totalCount ? Math.round(totalNett / totalCount) : 0;
                      const eff = totalGross ? Math.round((totalNett / totalGross) * 100) : 0;

                      return (
                        <tr key={mo} className="hover:bg-foreground/[0.01] transition-colors group">
                          <td className={cn("sticky left-0 z-10 transition-colors border-r border-foreground/5 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]", 
                              totalCount > 0 ? "bg-background group-hover:bg-foreground/[0.01]" : "bg-foreground/[0.01] opacity-40")}>
                            <div className="flex items-center gap-4">
                              <div className={cn("w-1 h-7 rounded-full transition-all duration-500", totalCount > 0 ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-foreground/5')} />
                              <div className="flex flex-col">
                                <span className="font-black text-[12px] tracking-tight text-foreground uppercase leading-none">{MONTH_NAMES[mo - 1]}</span>
                                <span className="text-[9px] font-black text-foreground/30 uppercase tracking-widest mt-1.5">{year} PERIOD</span>
                              </div>
                            </div>
                          </td>
                          {NCAL_ORDER.map(n => (
                            <td key={n} className="p-0 border-r border-foreground/5 align-top">
                              <MetricCell
                                count={monthData[n]?.count}
                                nett={monthData[n]?.totalNett}
                                gross={monthData[n]?.totalGross}
                              />
                            </td>
                          ))}
                          <td className="sticky right-0 bg-background group-hover:bg-foreground/[0.01] z-10 text-center border-l border-foreground/5 px-5 py-4 shadow-[-1px_0_0_0_rgba(0,0,0,0.05)] transition-colors">
                            <div className="flex flex-col gap-1 items-center">
                              <div className="flex items-center gap-3">
                                 <span className="text-2xl font-black font-mono tracking-tighter text-primary leading-none tabular-nums">{totalCount || 0}</span>
                                 <div className={cn(
                                     "text-[9px] font-black px-1.5 py-0.5 rounded-sm flex items-center border",
                                     eff >= 80 ? "bg-success/5 text-success border-success/20" : "bg-warning/5 text-warning border-warning/20"
                                 )}>{eff}%</div>
                              </div>
                              <div className="text-[10px] font-black text-foreground/30 uppercase tracking-widest leading-none font-mono mt-1">
                                  {formatDuration(avgNett)} <span className="opacity-40">AVG</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-foreground/[0.03]">
                    <tr className="border-t border-foreground/10">
                      <td className="sticky left-0 bg-foreground/[0.03] z-20 border-r border-foreground/5 py-5 px-5 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Temporal Sum</span>
                      </td>
                      {NCAL_ORDER.map(n => {
                        const cnt = Object.values(grouped).reduce((s, m) => s + (m[n]?.count || 0), 0);
                        const nt = Object.values(grouped).reduce((s, m) => s + (m[n]?.totalNett || 0), 0);
                        const gr = Object.values(grouped).reduce((s, m) => s + (m[n]?.totalGross || 0), 0);
                        return (
                          <td key={n} className="p-0 border-r border-foreground/5">
                            <MetricCell count={cnt} nett={nt} gross={gr} />
                          </td>
                        );
                      })}
                      <td className="sticky right-0 bg-primary/95 backdrop-blur-md z-40 text-center py-5 px-5 text-primary-foreground shadow-[-5px_0_20px_-5px_rgba(var(--color-primary),0.4)]">
                        <div className="flex flex-col gap-1 items-center">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black font-mono tracking-tighter leading-none tabular-nums">{yearlyCount}</span>
                            <span className="text-[9px] font-black opacity-50 uppercase tracking-widest tracking-[0.1em]">TOTAL</span>
                          </div>
                          <div className="text-[10px] font-black opacity-60 leading-none font-mono uppercase tracking-widest mt-1">
                            {formatDuration(avgYearlyNett)} <span className="opacity-50">ANNUAL AVG</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
