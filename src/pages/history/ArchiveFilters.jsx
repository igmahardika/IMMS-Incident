import React from 'react';
import { Button, Input, SectionCard, Select } from '../../components/ui/index.jsx';

export function ArchiveFilters({
  filters,
  setFilter,
  setFilters,
  currentYear,
  yearOptions,
  monthNames,
  ncalOptions,
}) {
  return (
    <SectionCard padding={false}>
      <div className="grid items-center gap-3 px-4 py-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_132px_168px_152px_auto]">
        <Input
          id="archive-search"
          value={filters.search}
          onChange={(event) => setFilter('search', event.target.value)}
          placeholder="Search case no, site, customer, technician..."
          aria-label="Search archive"
          wrapperClassName="gap-0"
          className="h-9"
        />

        <Select
          id="archive-year"
          value={filters.year}
          onChange={(event) => setFilter('year', event.target.value)}
          aria-label="Filter by year"
          wrapperClassName="gap-0"
          className="h-9"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Select>

        <Select
          id="archive-month"
          value={filters.month}
          onChange={(event) => setFilter('month', event.target.value)}
          aria-label="Filter by month"
          wrapperClassName="gap-0"
          className="h-9"
        >
          <option value="">Full Year</option>
          {monthNames.map((month, index) => (
            <option key={month} value={String(index + 1).padStart(2, '0')}>
              {month}
            </option>
          ))}
        </Select>

        <Select
          id="archive-ncal"
          value={filters.ncal}
          onChange={(event) => setFilter('ncal', event.target.value)}
          aria-label="Filter by NCAL"
          wrapperClassName="gap-0"
          className="h-9"
        >
          <option value="">All NCAL</option>
          {ncalOptions.filter(Boolean).map((ncal) => (
            <option key={ncal} value={ncal}>
              {ncal}
            </option>
          ))}
        </Select>

        {(filters.search || filters.month || filters.ncal) ? (
          <div className="flex items-center lg:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => setFilters({ month: '', year: String(currentYear), ncal: '', search: '' })}
            >
              Reset
            </Button>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
