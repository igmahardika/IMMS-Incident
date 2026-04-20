import React from 'react';
import { Input, SectionCard, Select } from '../../../components/ui/index.jsx';

export function CustomerToolbar({
  viewMode,
  searchQuery,
  setSearchQuery,
  serviceFilter,
  setServiceFilter,
  serviceTypeOptions,
  gradeFilter,
  setGradeFilter,
  gradeOptions,
}) {
  if (viewMode === 'review') {
    return null;
  }

  return (
    <SectionCard padding={false}>
      <div className="p-4">
        {viewMode === 'list' ? (
          <div className="grid items-center gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by customer, address, city, province, OSC, ODC, or ODP"
              aria-label="Search customers"
              wrapperClassName="gap-0"
              className="h-9"
            />
            <Select
              value={serviceFilter}
              onChange={(event) => setServiceFilter(event.target.value)}
              aria-label="Filter by service"
              wrapperClassName="gap-0"
              className="h-9"
            >
              <option value="all">All Services</option>
              {serviceTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Select
              value={gradeFilter}
              onChange={(event) => setGradeFilter(event.target.value)}
              aria-label="Filter by grade"
              wrapperClassName="gap-0"
              className="h-9"
            >
              <option value="all">All Grades</option>
              {gradeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by customer, address, city, province, OSC, ODC, or ODP"
            aria-label="Search customers"
            wrapperClassName="gap-0"
            className="h-9"
          />
        )}
      </div>
    </SectionCard>
  );
}
