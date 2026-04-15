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
      <div className="grid gap-6 px-4 py-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_160px_180px_160px_auto]">
        <Input
          id="archive-search"
          value={filters.search}
          onChange={(event) => setFilter('search', event.target.value)}
          placeholder="Search case no, site, customer, technician..."
        />

        <Select
          id="archive-year"
          value={filters.year}
          onChange={(event) => setFilter('year', event.target.value)}
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
        >
          <option value="">All NCAL</option>
          {ncalOptions.filter(Boolean).map((ncal) => (
            <option key={ncal} value={ncal}>
              {ncal}
            </option>
          ))}
        </Select>

        {(filters.search || filters.month || filters.ncal) ? (
          <div className="flex items-center xl:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
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
