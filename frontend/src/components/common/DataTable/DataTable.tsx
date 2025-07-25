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
    // Set initial pagination based on external state or defaults
    initialPagination: pageCount !== undefined ? {
      pageIndex: 0, // Will be updated by external pagination handler
      pageSize: 50 // Default page size
    } : { pageIndex: 0, pageSize: 50 },
  });

  // Update external state when internal state changes
  useEffect(() => {
    if (onPaginationChange) {
      const paginationState = table.getState().pagination;
      onPaginationChange(paginationState);
    }
  }, [tablePagination.pageIndex, tablePagination.pageSize, onPaginationChange, table]);

  useEffect(() => {
    if (onSortingChange) {
      const sortingState = table.getState().sorting;
      onSortingChange(sortingState);
    }
  }, [sorting, onSortingChange, table]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Toolbar */}
      {showToolbar && (
        <DataTableToolbar
          table={table}
          globalFilter={globalFilter}
          onGlobalFilterChange={showGlobalFilter ? onGlobalFilterChange : undefined}
          showColumnToggle={showColumnToggle}
          enableExport={enableExport}
          exportFileName={exportFileName}
        />
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className={cn(
          'table w-full',
          striped && 'table-zebra',
          hover && 'table-hover',
          compact && 'table-compact'
        )} style={{ width: table.getCenterTotalSize() }}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th 
                    key={header.id} 
                    className="bg-base-200 relative"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : 
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )
                    }
                    {/* Column resizer */}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={cn(
                          'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none',
                          'bg-base-300 opacity-0 hover:opacity-100 hover:bg-primary',
                          header.column.getIsResizing() && 'opacity-100 bg-primary'
                        )}
                      />
                    )}
                  </th>
                ))}
                {actions && <th className="bg-base-200">{t('common.actions')}</th>}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    'border-b border-base-200',
                    row.getIsSelected() && 'bg-base-200'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  {actions && (
                    <td className="w-32">
                      {actions(row.original)}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="h-24 text-center"
                >
                  {emptyMessage || t('table.noData')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <DataTablePagination 
          table={table}
          totalRows={totalRows}
          currentPage={currentPage}
          totalPages={pageCount}
        />
      )}
    </div>
  );
}