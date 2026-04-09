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
import { motion } from 'framer-motion';
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
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar border-t border-foreground/5">
        <table className="w-full text-left border-collapse border-separate border-spacing-0 table-fixed">
          <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th 
                    key={header.id}
                    className={cn(
                      "border-r border-foreground/5 bg-foreground/[0.02] last:border-r-0",
                      header.column.columnDef.meta?.className
                    )}
                    style={{ width: header.column.columnDef.meta?.flexible ? 'auto' : `${header.getSize()}px` }}
                  >
                    {header.isPlaceholder ? null : (
                      <div 
                        className={cn(
                          "flex items-center gap-2 select-none",
                          header.column.getCanSort() && "cursor-pointer hover:text-foreground/70"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span className="truncate">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {header.column.getIsSorted() === 'asc' && <ChevronUp size={12} className="shrink-0" />}
                        {header.column.getIsSorted() === 'desc' && <ChevronDown size={12} className="shrink-0" />}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <motion.tr 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={row.id} 
                  className={cn("hover:bg-foreground/[0.02] transition-colors group", getRowClassName(row.original))}
                >
                  {row.getVisibleCells().map(cell => (
                    <td 
                      key={cell.id}
                      className={cn(
                        "border-r border-foreground/5 last:border-r-0 truncate",
                        cell.column.columnDef.meta?.className
                      )}
                      style={{ width: cell.column.columnDef.meta?.flexible ? 'auto' : `${cell.column.getSize()}px` }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </motion.tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-20 text-foreground/30 text-xs font-bold uppercase tracking-widest">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination & Info */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t border-foreground/5 shrink-0">
         <div className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest flex items-center gap-4">
            <span>
              Showing {table.getRowModel().rows.length > 0 ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 : 0} to {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)} of {data.length} entries
            </span>
            {table.getPageCount() > 1 && (
               <span className="text-primary/60">— Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
            )}
         </div>
         
         {table.getPageCount() > 1 && (
           <div className="flex gap-1">
             <button
               className="h-7 px-3 text-[9px] font-black uppercase border border-foreground/10 rounded-md bg-background hover:bg-foreground/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
               onClick={() => table.previousPage()}
               disabled={!table.getCanPreviousPage()}
             >
               Prev
             </button>
             <button
               className="h-7 px-3 text-[9px] font-black uppercase border border-foreground/10 rounded-md bg-background hover:bg-foreground/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
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
