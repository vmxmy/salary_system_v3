import { type Table } from '@tanstack/react-table';
import { useTranslation } from '@/hooks/useTranslation';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  totalRows?: number;
  currentPage?: number;
  totalPages?: number;
}

export function DataTablePagination<TData>({
  table,
  totalRows,
  currentPage,
  totalPages,
}: DataTablePaginationProps<TData>) {
  const { t: _t } = useTranslation('common');

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const isFirstPage = !table.getCanPreviousPage();
  const isLastPage = !table.getCanNextPage();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 pt-4">
      {/* Row Info - 紧凑显示 */}
      <div className="text-sm text-base-content/70 flex-shrink-0">
        {table.getFilteredSelectedRowModel().rows.length > 0 ? (
          <span className="whitespace-nowrap">
            已选 {table.getFilteredSelectedRowModel().rows.length} / 共 {totalRows ?? table.getFilteredRowModel().rows.length} 项
          </span>
        ) : (
          <span className="whitespace-nowrap">
            共 {totalRows ?? table.getFilteredRowModel().rows.length} 项
          </span>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Page Size Selector - 紧凑布局 */}
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-sm text-base-content/70 whitespace-nowrap">每页</span>
          <select
            className="select select-bordered select-sm w-16 min-w-0"
            value={pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {[10, 20, 30, 40, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-sm text-base-content/70 whitespace-nowrap">条</span>
        </div>

        {/* Page Info - 紧凑显示 */}
        <div className="text-sm text-base-content/70 whitespace-nowrap">
          <span className="hidden sm:inline">第 </span>
          {currentPage ?? (pageIndex + 1)}
          <span className="hidden sm:inline"> 页，共 </span>
          <span className="sm:hidden">/</span>
          {totalPages ?? table.getPageCount()}
          <span className="hidden sm:inline"> 页</span>
        </div>

        {/* Navigation Buttons - 紧凑按钮组 */}
        <div className="join flex-shrink-0">
          {/* 只显示必要的导航按钮 */}
          <button
            className="join-item btn btn-sm px-2"
            onClick={() => table.setPageIndex(0)}
            disabled={isFirstPage}
            title="首页"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="join-item btn btn-sm px-2"
            onClick={() => table.previousPage()}
            disabled={isFirstPage}
            title="上一页"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="join-item btn btn-sm px-2"
            onClick={() => table.nextPage()}
            disabled={isLastPage}
            title="下一页"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            className="join-item btn btn-sm px-2"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={isLastPage}
            title="末页"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}