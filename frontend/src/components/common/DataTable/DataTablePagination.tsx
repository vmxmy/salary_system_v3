import { type Table } from '@tanstack/react-table';
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  // Server-side pagination info (optional)
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

  return (
    <div className="flex items-center justify-between px-2 py-4">
      {/* Row selection and total info */}
      <div className="flex-1 text-sm text-base-content/70">
        {table.getFilteredSelectedRowModel().rows.length > 0 ? (
          <span>
            {table.getFilteredSelectedRowModel().rows.length} of{' '}
            {totalRows ?? table.getFilteredRowModel().rows.length} row(s) selected
          </span>
        ) : (
          totalRows && (
            <span>
              {t('table.total', { total: totalRows })}
            </span>
          )
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-6 lg:space-x-8">
        {/* Page size selector */}
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">{t('table.pageSize', { size: '' }).replace(' ', '')}</p>
          <select
            className="select select-bordered select-sm"
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
          >
            {[10, 20, 30, 40, 50, 100].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>

        {/* Page info */}
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          {t('table.page', {
            current: currentPage ?? (table.getState().pagination.pageIndex + 1),
            total: totalPages ?? table.getPageCount(),
          })}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center space-x-2">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeftIcon className="h-4 w-4" />
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}