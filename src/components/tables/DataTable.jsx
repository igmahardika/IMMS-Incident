import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, Search, Filter } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function DataTable({ 
  columns, 
  data, 
  globalFilter, 
  setGlobalFilter,
  pageSize = 50,
  className = "",
  getRowClassName = () => ""
}) {
  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
  });

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse border-separate border-spacing-0 table-fixed">
          <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-md">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const size = header.getSize();
                  const isFlexible = header.column.columnDef.meta?.flexible;
                  return (
                    <th 
                      key={header.id}
                      className={cn(
                        "px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 border-b border-foreground/5 bg-foreground/[0.01]",
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
                            header.column.getCanSort() && "cursor-pointer hover:text-foreground/70 transition-colors"
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
          <tbody className="divide-y divide-foreground/5">
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
                          "px-4 py-2.5 text-[11px] font-bold leading-tight border-b border-foreground/[0.03] transition-colors text-foreground/80",
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
                <td colSpan={columns.length} className="text-center py-24 text-foreground/20 text-[10px] font-black uppercase tracking-[0.3em]">
                  No Intelligence Data Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination & Info */}
      <div className="flex items-center justify-between px-6 py-4 bg-background border-t border-foreground/[0.06] shrink-0">
         <div className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.15em] flex items-center gap-4">
            <span className="flex items-center gap-2">
              Viewing <span className="text-foreground/60">{table.getRowModel().rows.length > 0 ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 : 0} — {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)}</span> of <span className="text-foreground/60">{data.length}</span> entries
            </span>
            {table.getPageCount() > 1 && (
               <div className="w-1 h-1 rounded-full bg-foreground/10" />
            )}
            {table.getPageCount() > 1 && (
               <span className="text-primary/40">Sequence {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
            )}
         </div>
         
         {table.getPageCount() > 1 && (
            <div className="flex gap-2">
              <button
                className="h-8 px-4 text-[10px] font-black uppercase tracking-widest border border-foreground/[0.08] rounded-lg bg-background hover:bg-foreground/[0.03] hover:border-foreground/20 transition-all disabled:opacity-20 disabled:pointer-events-none active:scale-95"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </button>
              <button
                className="h-8 px-4 text-[10px] font-black uppercase tracking-widest border border-foreground/[0.08] rounded-lg bg-background hover:bg-foreground/[0.03] hover:border-foreground/20 transition-all disabled:opacity-20 disabled:pointer-events-none active:scale-95"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </button>
            </div>
         )}
      </div>
    </div>
  );
}
