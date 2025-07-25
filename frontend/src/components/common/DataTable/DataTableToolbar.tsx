import { type Table } from '@tanstack/react-table';
import { SearchIcon, DownloadIcon, EyeOffIcon } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useState } from 'react';
import { exportTableToCSV, exportTableToJSON, exportTableToExcel } from './utils';

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
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportCSV = () => {
    const rows = table.getFilteredRowModel().rows;
    const data = rows.map(row => row.original);
    const columns = table.getAllColumns()
      .filter(col => col.getIsVisible() && col.id !== 'select' && col.id !== 'actions')
      .map(col => col.id);
    
    exportTableToCSV(data as any[], exportFileName, columns);
    setShowExportMenu(false);
  };

  const handleExportJSON = () => {
    const rows = table.getFilteredRowModel().rows;
    const data = rows.map(row => row.original);
    
    exportTableToJSON(data, exportFileName);
    setShowExportMenu(false);
  };

  const handleExportExcel = async () => {
    try {
      const rows = table.getFilteredRowModel().rows;
      const data = rows.map(row => row.original);
      const columns = table.getAllColumns()
        .filter(col => col.getIsVisible() && col.id !== 'select' && col.id !== 'actions')
        .map(col => col.id);
      
      await exportTableToExcel(data as any[], exportFileName, columns);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Export failed:', error);
      // TODO: Show error toast
    }
  };

  return (
    <div className={`flex items-center pb-4 ${onGlobalFilterChange ? 'justify-between' : 'justify-end'}`}>
      {/* Global filter */}
      {onGlobalFilterChange && (
        <div className="flex items-center space-x-2">
          <SearchIcon className="h-4 w-4 text-base-content/50" />
          <input
            type="text"
            placeholder={t('placeholder.search')}
            value={globalFilter}
            onChange={(e) => onGlobalFilterChange(e.target.value)}
            className="input input-bordered input-sm max-w-xs"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-2">
        {/* Export button */}
        {enableExport && (
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn btn-sm btn-ghost"
              title={t('common.export')}
            >
              <DownloadIcon className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">{t('common.export')}</span>
            </button>

            {/* Export dropdown */}
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-base-100 shadow-lg rounded-lg z-10 border border-base-300">
                <div className="p-1">
                  <button
                    onClick={handleExportExcel}
                    className="btn btn-ghost btn-sm btn-block justify-start"
                  >
                    Excel
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="btn btn-ghost btn-sm btn-block justify-start"
                  >
                    CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="btn btn-ghost btn-sm btn-block justify-start"
                  >
                    JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Column visibility toggle */}
        {showColumnToggle && (
          <div className="relative">
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="btn btn-sm btn-ghost"
              title="Toggle columns"
            >
              <EyeOffIcon className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Columns</span>
            </button>

            {/* Column visibility dropdown */}
            {showColumnMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-base-100 shadow-lg rounded-lg z-10 border border-base-300">
                <div className="p-2">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <label
                        key={column.id}
                        className="flex items-center p-2 hover:bg-base-200 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm mr-2"
                          checked={column.getIsVisible()}
                          onChange={(e) => column.toggleVisibility(e.target.checked)}
                        />
                        <span className="text-sm capitalize">
                          {column.id.replace(/_/g, ' ')}
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}