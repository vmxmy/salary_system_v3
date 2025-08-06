import { type Table } from '@tanstack/react-table';
import { useTranslation } from '@/hooks/useTranslation';
import { DataExport } from './components/DataExport';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  globalFilter?: string;
  onGlobalFilterChange?: (filter: string) => void;
  showColumnToggle?: boolean;
  enableExport?: boolean;
  exportFileName?: string;
}

export function DataTableToolbar<TData>({
  table,
  globalFilter = '',
  onGlobalFilterChange,
  showColumnToggle = true,
  enableExport = false,
  exportFileName = 'data',
}: DataTableToolbarProps<TData>) {
  const { t } = useTranslation('common');

  return (
    <div className="flex items-center justify-between pb-6">
      {/* Global Search */}
      {onGlobalFilterChange && (
        <div className="flex items-center">
          <input
            type="text"
            placeholder={String(t('table.search')) || '搜索...'}
            value={globalFilter}
            onChange={(e) => onGlobalFilterChange(e.target.value)}
            className="input input-bordered w-full max-w-xs"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Column Toggle */}
        {showColumnToggle && (
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-sm btn-outline">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {String(t('table.columns')) || '列'}
            </label>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <li key={column.id}>
                    <label className="label cursor-pointer">
                      <span className="label-text">{column.id}</span>
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={(e) => column.toggleVisibility(e.target.checked)}
                        className="checkbox checkbox-sm"
                      />
                    </label>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Export */}
        {enableExport && (
          <DataExport
            table={table}
            fileName={exportFileName}
          />
        )}
      </div>
    </div>
  );
}