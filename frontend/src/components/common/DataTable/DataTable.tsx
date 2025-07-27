import { flexRender } from '@tanstack/react-table';
import { useDataTable } from './hooks/useDataTable';
import { DataTableToolbar } from './DataTableToolbar';
import { DataTablePagination } from './DataTablePagination';
import { LoadingScreen } from '../LoadingScreen';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import type { DataTableProps } from './types';

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  totalRows,
  currentPage,
  onPaginationChange,
  onSortingChange,
  onColumnFiltersChange,
  globalFilter,
  onGlobalFilterChange,
  enableRowSelection = false,
  onRowSelectionChange,
  onColumnVisibilityChange,
  onTableReady,
  initialSorting,
  initialPagination,
  loading = false,
  emptyMessage,
  showToolbar = true,
  showPagination = true,
  showColumnToggle = true,
  showGlobalFilter = true,
  actions,
  enableExport = false,
  exportFileName = 'data',
  className,
  striped = false,
  hover = true,
  compact = false,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation('common');
  
  const {
    table,
    sorting,
    columnFilters,
    columnVisibility,
    rowSelection,
    pagination: tablePagination,
    columnSizing,
  } = useDataTable({
    data,
    columns,
    pageCount,
    enableRowSelection,
    enableColumnResizing: true,
    initialSorting,
    initialPagination: pageCount !== undefined ? {
      pageIndex: (currentPage || 1) - 1,
      pageSize: data.length,
    } : (initialPagination || {
      pageIndex: 0,
      pageSize: 50, // 默认每页50条
    }),
  });

  // 同步外部状态变化到内部
  useEffect(() => {
    if (onPaginationChange && pageCount !== undefined) {
      onPaginationChange?.(tablePagination);
    }
  }, [tablePagination, onPaginationChange, pageCount]);

  useEffect(() => {
    onSortingChange?.(sorting);
  }, [sorting, onSortingChange]);

  useEffect(() => {
    onColumnFiltersChange?.(columnFilters);
  }, [columnFilters, onColumnFiltersChange]);

  useEffect(() => {
    onRowSelectionChange?.(rowSelection);
  }, [rowSelection, onRowSelectionChange]);

  useEffect(() => {
    onColumnVisibilityChange?.(columnVisibility);
  }, [columnVisibility, onColumnVisibilityChange]);

  // 将 table 实例传递给父组件
  useEffect(() => {
    onTableReady?.(table);
  }, [table, onTableReady]);

  if (loading) {
    return <LoadingScreen variant="inline" />;
  }

  return (
    <div className={cn("card bg-base-100 shadow", className)}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="card-body pb-0">
          <DataTableToolbar
            table={table}
            globalFilter={globalFilter}
            onGlobalFilterChange={onGlobalFilterChange}
            showColumnToggle={showColumnToggle}
            enableExport={enableExport}
            exportFileName={exportFileName}
          />
        </div>
      )}

      {/* Table */}
      <div className="card-body pt-4">
        <div className="overflow-x-auto">
          <table className={cn(
            "table",
            compact && "table-sm",
            striped && "table-zebra",
            hover && "table-hover"
          )}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{
                        width: header.getSize(),
                        minWidth: header.column.columnDef.minSize,
                        maxWidth: header.column.columnDef.maxSize,
                      }}
                      className={cn(
                        header.column.getCanSort() && "cursor-pointer select-none",
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: <span className="text-primary">↑</span>,
                            desc: <span className="text-primary">↓</span>,
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      row.getIsSelected() && "bg-primary/10"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="text-center py-8">
                    <div className="text-base-content/60">
                      {emptyMessage || t('table.noData')}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="card-body pt-0">
          <DataTablePagination
            table={table}
            totalRows={totalRows}
            currentPage={currentPage}
            totalPages={pageCount}
          />
        </div>
      )}
    </div>
  );
}