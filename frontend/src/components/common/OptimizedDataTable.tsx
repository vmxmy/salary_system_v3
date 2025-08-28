import React, { useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table';
import { useOptimizedLoading, useTableLoading } from '@/hooks/core/useOptimizedLoading';
import { getOptimizedConfig, TABLE_PERFORMANCE_CONFIG } from '@/lib/performanceConfig';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

/**
 * 优化的数据表格组件
 * 集成了所有性能优化功能
 */
export interface OptimizedDataTableProps<T> {
  // 数据和列定义
  data: T[];
  columns: ColumnDef<T>[];
  
  // Loading状态
  isLoading?: boolean;
  
  // 分页配置
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  pageCount?: number;
  
  // 排序配置
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  
  // 样式和UI配置
  className?: string;
  tableClassName?: string;
  
  // 性能配置
  enableVirtualization?: boolean;
  virtualizationThreshold?: number;
  
  // 空状态配置
  emptyState?: {
    title?: string;
    description?: string;
    action?: React.ReactNode;
  };
  
  // 错误状态
  error?: Error | null;
  
  // 其他表格选项
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableRowSelection?: boolean;
}

export function OptimizedDataTable<T>({
  data,
  columns,
  isLoading = false,
  pagination,
  onPaginationChange,
  pageCount,
  sorting,
  onSortingChange,
  className = '',
  tableClassName = '',
  enableVirtualization = false,
  virtualizationThreshold = TABLE_PERFORMANCE_CONFIG.virtualizationThreshold,
  emptyState,
  error,
  enableSorting = true,
  enableFiltering = false,
  enableRowSelection = false,
}: OptimizedDataTableProps<T>) {
  
  const config = getOptimizedConfig();
  
  // 使用优化的Loading状态
  const { isLoading: showLoading, showSkeleton } = useTableLoading(
    isLoading,
    data.length
  );

  // 判断是否需要虚拟化
  const shouldVirtualize = useMemo(() => {
    return enableVirtualization && data.length > virtualizationThreshold;
  }, [enableVirtualization, data.length, virtualizationThreshold]);

  // 表格实例
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
    
    // 分页配置
    ...(pagination && {
      pageCount: pageCount ?? Math.ceil(data.length / (pagination.pageSize || config.pagination.defaultPageSize)),
      manualPagination: !!onPaginationChange,
      onPaginationChange: onPaginationChange ? (updaterOrValue) => {
        const newPagination = typeof updaterOrValue === 'function' 
          ? updaterOrValue(pagination) 
          : updaterOrValue;
        onPaginationChange(newPagination);
      } : undefined,
      state: {
        pagination,
      },
    }),
    
    // 排序配置
    ...(enableSorting && {
      manualSorting: !!onSortingChange,
      onSortingChange: onSortingChange ? (updaterOrValue) => {
        const newSorting = typeof updaterOrValue === 'function' 
          ? updaterOrValue(sorting || []) 
          : updaterOrValue;
        onSortingChange(newSorting);
      } : undefined,
      state: {
        sorting: sorting || [],
      },
    }),
  });

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-error text-lg font-semibold mb-2">
          数据加载失败
        </div>
        <div className="text-base-content/60 text-sm mb-4">
          {error.message || '未知错误'}
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => window.location.reload()}
        >
          重新加载
        </button>
      </div>
    );
  }

  // Loading状态
  if (showLoading) {
    if (showSkeleton) {
      return <TableSkeleton />;
    }
    
    return (
      <div className="flex justify-center items-center py-12">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-3">正在加载数据...</span>
      </div>
    );
  }

  // 空状态
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-base-content/60 text-lg font-semibold mb-2">
          {emptyState?.title || '暂无数据'}
        </div>
        <div className="text-base-content/40 text-sm mb-4">
          {emptyState?.description || '当前没有符合条件的记录'}
        </div>
        {emptyState?.action}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      {/* 表格容器 */}
      <div className="overflow-x-auto">
        <table className={`table table-zebra w-full ${tableClassName}`}>
          {/* 表头 */}
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th 
                    key={header.id}
                    className={`
                      ${enableSorting && header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                      ${header.column.getIsSorted() ? 'bg-base-200' : ''}
                    `}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      width: header.getSize(),
                      minWidth: header.getSize(),
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {header.isPlaceholder ? null : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                      
                      {/* 排序指示器 */}
                      {enableSorting && header.column.getCanSort() && (
                        <div className="flex flex-col">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUpIcon className="w-4 h-4 text-primary" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDownIcon className="w-4 h-4 text-primary" />
                          ) : (
                            <div className="w-4 h-4 opacity-30">
                              <ChevronUpIcon className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* 表体 */}
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr 
                key={row.id}
                className="hover:bg-base-200/50 transition-colors duration-150"
              >
                {row.getVisibleCells().map(cell => (
                  <td 
                    key={cell.id}
                    style={{
                      width: cell.column.getSize(),
                      minWidth: cell.column.getSize(),
                    }}
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页控制 */}
      {pagination && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-base-content/60">
            共 {pageCount ? pageCount * (pagination.pageSize || config.pagination.defaultPageSize) : data.length} 条记录，
            当前第 {pagination.pageIndex + 1} / {pageCount || Math.ceil(data.length / (pagination.pageSize || config.pagination.defaultPageSize))} 页
          </div>
          
          <div className="join">
            <button
              className="join-item btn btn-sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              首页
            </button>
            <button
              className="join-item btn btn-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              上一页
            </button>
            <button
              className="join-item btn btn-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              下一页
            </button>
            <button
              className="join-item btn btn-sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              末页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 表格骨架屏组件
 */
function TableSkeleton() {
  const rows = Array.from({ length: 5 }, (_, i) => i);
  const cols = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr>
            {cols.map((col) => (
              <th key={col}>
                <div className="skeleton h-4 w-20"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              {cols.map((col) => (
                <td key={col}>
                  <div className="skeleton h-4 w-full"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default OptimizedDataTable;