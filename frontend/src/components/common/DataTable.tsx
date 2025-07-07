import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type Table as TableType,
  flexRender,
} from '@tanstack/react-table';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  loading?: boolean;
  pagination?: {
    pageIndex: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  selection?: {
    enableRowSelection: boolean;
    onRowSelectionChange?: (selectedRows: T[]) => void;
  };
  sorting?: {
    enableSorting: boolean;
  };
  filtering?: {
    enableGlobalFilter: boolean;
    globalFilter?: string;
    onGlobalFilterChange?: (filter: string) => void;
  };
  className?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  pagination,
  selection,
  sorting = { enableSorting: true },
  filtering,
  className = '',
  emptyMessage = '暂无数据'
}: DataTableProps<T>) {
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: selection?.enableRowSelection ?? false,
    enableSorting: sorting.enableSorting,
    enableGlobalFilter: filtering?.enableGlobalFilter ?? false,
    globalFilter: filtering?.globalFilter ?? '',
    onGlobalFilterChange: filtering?.onGlobalFilterChange,
    state: {
      pagination: pagination ? {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize
      } : undefined,
      globalFilter: filtering?.globalFilter ?? '',
    },
    pageCount: pagination ? Math.ceil(pagination.total / pagination.pageSize) : undefined,
    manualPagination: !!pagination,
    onRowSelectionChange: (updaterOrValue) => {
      if (selection?.onRowSelectionChange) {
        // 获取选中的行数据
        const newSelection = typeof updaterOrValue === 'function' 
          ? updaterOrValue(table.getState().rowSelection)
          : updaterOrValue;
        
        const selectedRows = Object.keys(newSelection)
          .filter(key => newSelection[key])
          .map(key => data[parseInt(key)])
          .filter(Boolean);
        
        selection.onRowSelectionChange(selectedRows);
      }
    },
  });

  const handlePageChange = (page: number) => {
    pagination?.onPageChange(page);
  };

  const handlePageSizeChange = (pageSize: number) => {
    pagination?.onPageSizeChange(pageSize);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* 全局搜索 */}
      {filtering?.enableGlobalFilter && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="全局搜索..."
            value={filtering.globalFilter ?? ''}
            onChange={(e) => filtering.onGlobalFilterChange?.(e.target.value)}
            className="input input-bordered w-full max-w-sm"
          />
        </div>
      )}

      {/* 表格容器 */}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          {/* 表头 */}
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th 
                    key={header.id}
                    className={`
                      ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                      ${header.column.getIsSorted() ? 'bg-base-200' : ''}
                    `}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      
                      {/* 排序指示器 */}
                      {header.column.getCanSort() && (
                        <span className="text-xs">
                          {{
                            asc: '↑',
                            desc: '↓',
                          }[header.column.getIsSorted() as string] ?? '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* 表体 */}
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8">
                  <span className="loading loading-spinner loading-md"></span>
                  <span className="ml-2">加载中...</span>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-base-content/60">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr 
                  key={row.id}
                  className={`
                    hover:bg-base-200/50 transition-colors
                    ${row.getIsSelected() ? 'bg-primary/10' : ''}
                  `}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页控件 */}
      {pagination && (
        <div className="flex items-center justify-between mt-4">
          {/* 左侧：页面大小选择 */}
          <div className="flex items-center gap-2">
            <span className="text-sm">每页显示</span>
            <select
              className="select select-bordered select-sm"
              value={pagination.pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
            <span className="text-sm">条</span>
          </div>

          {/* 中间：页码信息 */}
          <div className="text-sm text-base-content/70">
            第 {pagination.pageIndex + 1} 页，共 {Math.ceil(pagination.total / pagination.pageSize)} 页
            （总计 {pagination.total} 条）
          </div>

          {/* 右侧：页码控件 */}
          <div className="join">
            <button
              className="join-item btn btn-sm"
              onClick={() => handlePageChange(0)}
              disabled={pagination.pageIndex === 0}
            >
              首页
            </button>
            <button
              className="join-item btn btn-sm"
              onClick={() => handlePageChange(pagination.pageIndex - 1)}
              disabled={pagination.pageIndex === 0}
            >
              上一页
            </button>
            <button
              className="join-item btn btn-sm"
              onClick={() => handlePageChange(pagination.pageIndex + 1)}
              disabled={pagination.pageIndex >= Math.ceil(pagination.total / pagination.pageSize) - 1}
            >
              下一页
            </button>
            <button
              className="join-item btn btn-sm"
              onClick={() => handlePageChange(Math.ceil(pagination.total / pagination.pageSize) - 1)}
              disabled={pagination.pageIndex >= Math.ceil(pagination.total / pagination.pageSize) - 1}
            >
              尾页
            </button>
          </div>
        </div>
      )}

      {/* 选择统计 */}
      {selection?.enableRowSelection && (
        <div className="mt-2 text-sm text-base-content/70">
          已选择 {Object.keys(table.getState().rowSelection).length} 项
        </div>
      )}
    </div>
  );
}