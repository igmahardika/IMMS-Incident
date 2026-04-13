import React, { useMemo, useState } from 'react';
import { Calendar, Clock, Layers3 } from 'lucide-react';
import { useIncidentHistory } from '../hooks/useIncidents.js';
import { formatDuration } from '../utils/incidentUtils.js';
import { MONTH_NAMES } from '../utils/constants.js';
import {
  NcalBadge,
  PageHeader,
  SectionCard,
  Select,
  Spinner,
} from '../components/ui/index.jsx';
import { cn } from '../lib/utils.js';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, index) => currentYear - index);
const NCAL_ORDER = ['BLACK', 'RED', 'ORANGE', 'YELLOW', 'BLUE'];

function MetricCell({ count, nett, gross }) {
  if (!count) {
    return (
      <div className="flex min-h-[82px] items-center justify-center px-3 py-4 text-sm text-muted-foreground">
        —
      </div>
    );
  }

  const avgNett = Math.round(nett / count);
  const avgGross = Math.round(gross / count);

  return (
    <div className="space-y-2 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formatDuration(avgNett)}
        </p>
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-muted px-2 text-xs font-medium text-foreground">
          {count}
        </span>
      </div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        Gross {formatDuration(avgGross)}
      </p>
    </div>
  );
}

export default function MonthlyViewPage() {
  const [year, setYear] = useState(String(currentYear));
  const { data: history = [], isLoading: loading } = useIncidentHistory({ year, limit: 2000 });

  const summary = useMemo(() => {
    const grouped = {};

    history.forEach((incident) => {
      if (!incident.end_time) return;
      const month = new Date(incident.end_time).getMonth() + 1;

      if (!grouped[month]) grouped[month] = {};
      if (!grouped[month][incident.ncal]) {
        grouped[month][incident.ncal] = { count: 0, totalNett: 0, totalGross: 0 };
      }

      grouped[month][incident.ncal].count += 1;
      grouped[month][incident.ncal].totalNett += incident.duration_nett_seconds || 0;
      grouped[month][incident.ncal].totalGross += incident.duration_gross_seconds || 0;
    });

    const months = Array.from({ length: 12 }, (_, index) => index + 1);
    const yearlyCount = history.length;
    const yearlyNett = history.reduce((sum, incident) => sum + (incident.duration_nett_seconds || 0), 0);
    const yearlyGross = history.reduce((sum, incident) => sum + (incident.duration_gross_seconds || 0), 0);
    const avgYearlyNett = yearlyCount ? Math.round(yearlyNett / yearlyCount) : 0;

    return {
      grouped,
      months,
      yearlyCount,
      yearlyNett,
      yearlyGross,
      avgYearlyNett,
    };
  }, [history]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <PageHeader
        title="Monthly Analysis"
        subtitle={`Review incident closures by month and NCAL severity for ${year}.`}
        action={(
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground sm:flex">
              <Calendar className="h-3.5 w-3.5" />
              Reporting Year
            </div>
            <Select
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="w-[140px]"
              wrapperClassName="gap-0"
            >
              {YEAR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        )}
      />

      <SectionCard
        title="Monthly Resolution Matrix"
        subtitle="Each cell shows average net duration and the resolved case count for that month and severity."
        padding={false}
        className="flex-1 min-h-0"
        headerAction={(
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
              <Layers3 className="h-3.5 w-3.5" />
              {summary.yearlyCount} cases
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
              <Clock className="h-3.5 w-3.5" />
              Avg {formatDuration(summary.avgYearlyNett)}
            </div>
          </div>
        )}
      >
        {loading ? (
          <div className="flex justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="min-h-0 overflow-auto">
            <table className="w-full min-w-[920px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="sticky left-0 top-0 z-20 w-[160px] border-b border-r border-border bg-background px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Month
                  </th>
                  {NCAL_ORDER.map((ncal) => (
                    <th
                      key={ncal}
                      className="sticky top-0 z-10 border-b border-r border-border bg-background px-4 py-3 text-center"
                    >
                      <NcalBadge value={ncal} />
                    </th>
                  ))}
                  <th className="sticky right-0 top-0 z-20 w-[176px] border-b border-l border-border bg-background px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Summary
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.months.map((month) => {
                  const monthData = summary.grouped[month] || {};
                  const totalCount = NCAL_ORDER.reduce((sum, ncal) => sum + (monthData[ncal]?.count || 0), 0);
                  const totalNett = NCAL_ORDER.reduce((sum, ncal) => sum + (monthData[ncal]?.totalNett || 0), 0);
                  const totalGross = NCAL_ORDER.reduce((sum, ncal) => sum + (monthData[ncal]?.totalGross || 0), 0);
                  const avgNett = totalCount ? Math.round(totalNett / totalCount) : 0;
                  const efficiency = totalGross ? Math.round((totalNett / totalGross) * 100) : 0;

                  return (
                    <tr key={month} className="transition-colors hover:bg-muted/20">
                      <td className="sticky left-0 z-10 border-b border-r border-border bg-background px-4 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {MONTH_NAMES[month - 1]}
                          </p>
                          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            {year}
                          </p>
                        </div>
                      </td>

                      {NCAL_ORDER.map((ncal) => (
                        <td key={ncal} className="border-b border-r border-border align-top">
                          <MetricCell
                            count={monthData[ncal]?.count}
                            nett={monthData[ncal]?.totalNett}
                            gross={monthData[ncal]?.totalGross}
                          />
                        </td>
                      ))}

                      <td className="sticky right-0 z-10 border-b border-l border-border bg-background px-4 py-4">
                        <div className="space-y-2 text-center">
                          <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                            {totalCount}
                          </p>
                          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            Avg {formatDuration(avgNett)}
                          </p>
                          <div className="mx-auto inline-flex rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                            {efficiency}% efficiency
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30">
                  <td className="sticky bottom-0 left-0 z-20 border-r border-t border-border bg-background px-4 py-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Year Total</p>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{year}</p>
                    </div>
                  </td>

                  {NCAL_ORDER.map((ncal) => {
                    const count = Object.values(summary.grouped).reduce((sum, month) => sum + (month[ncal]?.count || 0), 0);
                    const nett = Object.values(summary.grouped).reduce((sum, month) => sum + (month[ncal]?.totalNett || 0), 0);
                    const gross = Object.values(summary.grouped).reduce((sum, month) => sum + (month[ncal]?.totalGross || 0), 0);

                    return (
                      <td key={ncal} className="border-r border-t border-border">
                        <MetricCell count={count} nett={nett} gross={gross} />
                      </td>
                    );
                  })}

                  <td className="sticky bottom-0 right-0 z-20 border-l border-t border-border bg-background px-4 py-4">
                    <div className="space-y-2 text-center">
                      <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                        {summary.yearlyCount}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Avg {formatDuration(summary.avgYearlyNett)}
                      </p>
                      <div
                        className={cn(
                          'mx-auto inline-flex rounded-md border px-2.5 py-1 text-xs font-medium',
                          summary.yearlyGross
                            ? 'border-border bg-muted text-foreground'
                            : 'border-border bg-muted text-muted-foreground'
                        )}
                      >
                        {summary.yearlyGross
                          ? `${Math.round((summary.yearlyNett / summary.yearlyGross) * 100)}% efficiency`
                          : 'No data'}
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
