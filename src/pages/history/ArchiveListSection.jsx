import React from 'react';
import { Search } from 'lucide-react';
import { DataTable } from '../../components/tables/DataTable.jsx';
import {
  EmptyState,
  SectionCard,
  TableSkeleton,
} from '../../components/ui/index.jsx';

export function ArchiveListSection({
  loading,
  filteredData,
  columns,
  selectedRowMap,
  setSelectedRowMap,
  enableRowSelection,
}) {
  return (
    <SectionCard
      title="Archive Records"
      subtitle="Browse closed incidents, inspect durations, and open the full detail record."
      padding={false}
      className="min-h-0 flex-1"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {loading ? (
          <TableSkeleton rows={12} />
        ) : filteredData.length === 0 ? (
          <EmptyState
            icon={<Search className="h-8 w-8 text-muted-foreground" />}
            title="No archive results"
            desc="Try widening the date range or adjusting the search filters."
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredData}
            pageSize={25}
            className="flex-1"
            rowSelection={selectedRowMap}
            onRowSelectionChange={setSelectedRowMap}
            enableRowSelection={enableRowSelection}
            getRowId={(row) => String(row.id)}
          />
        )}
      </div>
    </SectionCard>
  );
}
