import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function DataTable({ 
  columns, 
  data, 
  globalFilter, 
  setGlobalFilter,
  pageSize = 50,
  className = "",
  getRowClassName = () => "",
  rowSelection,
  onRowSelectionChange,
  enableRowSelection = false,
  getRowId,
}) {
  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange,
    enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId,
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
  });

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left">
          <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const size = header.getSize();
                  const isFlexible = header.column.columnDef.meta?.flexible;
                  return (
                    <th 
                      key={header.id}
                      className={cn(
                        "border-b border-border bg-muted/30 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground",
                        header.column.columnDef.meta?.className
                      )}
                      style={{ 
                        width: isFlexible ? 'auto' : `${size}px`,
                        minWidth: `${size}px`
                      }}
                    >
                      {header.isPlaceholder ? null : (
                        <div 
                          className={cn(
                            "flex items-center gap-2 select-none whitespace-nowrap",
                            header.column.getCanSort() && "cursor-pointer transition-colors hover:text-foreground"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' && <ChevronUp size={12} className="shrink-0 text-primary" />}
                          {header.column.getIsSorted() === 'desc' && <ChevronDown size={12} className="shrink-0 text-primary" />}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className={cn("hover:bg-foreground/[0.02] transition-colors group", getRowClassName(row.original))}
                >
                  {row.getVisibleCells().map(cell => {
                    const size = cell.column.getSize();
                    const isFlexible = cell.column.columnDef.meta?.flexible;
                    return (
                      <td 
                        key={cell.id}
                        className={cn(
                          "border-b border-border/70 px-4 py-4 align-top text-sm text-foreground transition-colors",
                          cell.column.columnDef.meta?.className
                        )}
                        style={{ 
                          width: isFlexible ? 'auto' : `${size}px`,
                          minWidth: `${size}px`
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-24 text-center text-sm text-muted-foreground">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="flex shrink-0 items-center justify-between border-t border-border bg-background px-4 py-3">
         <div className="text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-medium text-foreground">
              {table.getRowModel().rows.length > 0
                ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
                : 0}
            </span>
            {' '}-{' '}
            <span className="font-medium text-foreground">
              {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)}
            </span>
            {' '}of{' '}
            <span className="font-medium text-foreground">{data.length}</span>
         </div>

         {table.getPageCount() > 1 ? (
            <div className="flex items-center gap-2">
              <button
                className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </button>
              <button
                className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </button>
            </div>
         ) : null}
      </div>
    </div>
  );
}
