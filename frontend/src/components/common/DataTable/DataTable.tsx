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
  initialColumnVisibility,
  initialRowSelection,
  initialColumnPinning,
  loading = false,
  emptyMessage,
  showToolbar = true,
  showPagination = true,
  showColumnToggle = true,
  showGlobalFilter: _showGlobalFilter = true,
  actions: _actions,
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
    rowSelection: _rowSelection,
    pagination: _tablePagination,
    columnSizing: _columnSizing,
    setPagination: _setPagination,
  } = useDataTable({
    data,
    columns: columns as any,
    pageCount,
    enableRowSelection,
    enableColumnResizing: true,
    onPaginationChange,
    onRowSelectionChange,
    initialSorting,
    initialColumnVisibility,
    initialRowSelection,
    initialColumnPinning,
    initialPagination: pageCount !== undefined ? {
      pageIndex: (currentPage || 1) - 1,
      pageSize: data.length,
    } : (initialPagination || {
      pageIndex: 0,
      pageSize: 75, // 默认每页75条
    }),
  });

  // 同步外部状态变化到内部 - 移除有问题的useEffect以避免无限循环
  // useEffect(() => {
  //   if (onPaginationChange && pageCount !== undefined) {
  //     onPaginationChange?.(tablePagination);
  //   }
  // }, [tablePagination, onPaginationChange, pageCount]);

  useEffect(() => {
    onSortingChange?.(sorting);
  }, [sorting, onSortingChange]);

  useEffect(() => {
    onColumnFiltersChange?.(columnFilters);
  }, [columnFilters, onColumnFiltersChange]);

  // 移除有问题的useEffect以避免无限循环 - 现在在useDataTable中处理
  // useEffect(() => {
  //   onRowSelectionChange?.(rowSelection);
  // }, [rowSelection, onRowSelectionChange]);

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
    <div className={cn("card card-compact bg-base-100 shadow", className)}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="card-body toolbar-compact pb-1">
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
      <div className="card-body pt-1">
        <div className="overflow-x-auto">
          <table className={cn(
            "table table-compact data-table-compact",
            compact && "table-sm",
            striped && "table-zebra",
            hover && "table-hover"
          )}>
            <thead className="bg-base-200/50 border-b-2 border-base-300">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isPinned = header.column.getIsPinned();
                    const pinnedOffset = header.column.getStart('left');
                    
                    return (
                      <th
                        key={header.id}
                        style={{
                          width: header.getSize(),
                          minWidth: header.column.columnDef.minSize,
                          maxWidth: header.column.columnDef.maxSize,
                          ...(isPinned === 'left' && {
                            position: 'sticky',
                            left: pinnedOffset,
                            zIndex: 20,
                            backgroundColor: 'hsl(var(--b1))',
                            borderRight: '2px solid hsl(var(--bc) / 0.2)'
                          }),
                          ...(isPinned === 'right' && {
                            position: 'sticky',
                            right: header.column.getAfter('right'),
                            zIndex: 20,
                            backgroundColor: 'hsl(var(--b1))',
                            borderLeft: '2px solid hsl(var(--bc) / 0.2)'
                          })
                        }}
                        className={cn(
                          "px-3 py-2 text-xs font-semibold text-base-content/80 uppercase tracking-wider",
                          header.column.getCanSort() && "cursor-pointer select-none hover:bg-base-300/50 transition-colors",
                          isPinned && "bg-base-100 shadow-md"
                        )}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex flex-col gap-1">
                            {/* 表头标题和排序 */}
                            <div
                              className="flex items-center gap-2"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <span className="truncate">
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                              </span>
                              {header.column.getCanSort() && (
                                <span className="inline-flex">
                                  {{
                                    asc: (
                                      <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                      </svg>
                                    ),
                                    desc: (
                                      <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    ),
                                  }[header.column.getIsSorted() as string] ?? (
                                    header.column.getCanSort() && (
                                      <svg className="w-3 h-3 text-base-content/30" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                      </svg>
                                    )
                                  )}
                                </span>
                              )}
                            </div>
                            
                            {/* TanStack Table 原生列筛选器 */}
                            {header.column.getCanFilter() && (
                              <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={(header.column.getFilterValue() ?? '') as string}
                                  onChange={(e) => header.column.setFilterValue(e.target.value || undefined)}
                                  placeholder="筛选..."
                                  className="input input-xs w-full max-w-full bg-base-100 border-base-300 text-base-content placeholder:text-base-content/50 focus:border-primary focus:outline-none"
                                  style={{ fontSize: '11px' }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
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
                      "border-b border-base-200/50 transition-colors",
                      row.getIsSelected() && "bg-primary/10 hover:bg-primary/15",
                      !row.getIsSelected() && "hover:bg-base-200/30"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isPinned = cell.column.getIsPinned();
                      const pinnedOffset = cell.column.getStart('left');
                      
                      return (
                        <td 
                          key={cell.id} 
                          style={{
                            ...(isPinned === 'left' && {
                              position: 'sticky',
                              left: pinnedOffset,
                              zIndex: 10,
                              backgroundColor: 'hsl(var(--b1))',
                              borderRight: '2px solid hsl(var(--bc) / 0.2)'
                            }),
                            ...(isPinned === 'right' && {
                              position: 'sticky',
                              right: cell.column.getAfter('right'),
                              zIndex: 10,
                              backgroundColor: 'hsl(var(--b1))',
                              borderLeft: '2px solid hsl(var(--bc) / 0.2)'
                            })
                          }}
                          className={cn(
                            "px-3 py-2 text-sm text-base-content/90",
                            isPinned && "bg-base-100 shadow-sm"
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="text-center py-8">
                    <div className="text-base-content/50 text-sm">
                      {emptyMessage || String(t('table.noData'))}
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
        <div className="card-body pt-1 pagination-compact">
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