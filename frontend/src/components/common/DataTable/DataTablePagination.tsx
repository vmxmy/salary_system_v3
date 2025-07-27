import { type Table } from '@tanstack/react-table';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

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
  const { t } = useTranslation('common');

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const isFirstPage = !table.getCanPreviousPage();
  const isLastPage = !table.getCanNextPage();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4">
      {/* Row Info */}
      <div className="text-sm text-base-content/70">
        {table.getFilteredSelectedRowModel().rows.length > 0 ? (
          <span>
            已选择 {table.getFilteredSelectedRowModel().rows.length} 项，
            共 {totalRows ?? table.getFilteredRowModel().rows.length} 项
          </span>
        ) : (
          <span>
            共 {totalRows ?? table.getFilteredRowModel().rows.length} 项
          </span>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-2">
        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-base-content/70">每页显示：</span>
          <select
            className="select select-bordered select-sm"
            value={pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {[10, 20, 30, 40, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Page Info */}
        <div className="text-sm text-base-content/70">
          第 {currentPage ?? (pageIndex + 1)} 页，
          共 {totalPages ?? table.getPageCount()} 页
        </div>

        {/* Navigation Buttons */}
        <div className="join">
          <button
            className="join-item btn btn-sm"
            onClick={() => table.setPageIndex(0)}
            disabled={isFirstPage}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="join-item btn btn-sm"
            onClick={() => table.previousPage()}
            disabled={isFirstPage}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="join-item btn btn-sm"
            onClick={() => table.nextPage()}
            disabled={isLastPage}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            className="join-item btn btn-sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={isLastPage}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}