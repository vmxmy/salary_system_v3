import { useState, useRef } from 'react';
import type { Table } from '@tanstack/react-table';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface DataExportProps<TData> {
  table: Table<TData>;
  fileName?: string;
  onExport?: (data: any[], format: ExportFormat) => void;
  className?: string;
}

type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';

interface ExportConfig {
  format: ExportFormat;
  includeHeaders: boolean;
  visibleColumnsOnly: boolean;
  selectedRowsOnly: boolean;
  customFileName: string;
  dateRange?: {
    from: string;
    to: string;
  };
}

export function DataExport<TData>({
  table,
  fileName = 'data',
  onExport,
  className,
}: DataExportProps<TData>) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [config, setConfig] = useState<ExportConfig>({
    format: 'csv',
    includeHeaders: true,
    visibleColumnsOnly: true,
    selectedRowsOnly: false,
    customFileName: fileName,
  });

  const downloadRef = useRef<HTMLAnchorElement>(null);

  const exportFormats = [
    { value: 'csv', label: 'CSV', icon: '📄', description: t('export.csvDescription') },
    { value: 'xlsx', label: 'Excel', icon: '📊', description: t('export.excelDescription') },
    { value: 'json', label: 'JSON', icon: '🔧', description: t('export.jsonDescription') },
    { value: 'pdf', label: 'PDF', icon: '📋', description: t('export.pdfDescription') },
  ] as const;

  const getDataToExport = () => {
    const rows = config.selectedRowsOnly 
      ? table.getSelectedRowModel().rows
      : table.getPreFilteredRowModel().rows;

    const columns = config.visibleColumnsOnly
      ? table.getVisibleLeafColumns().filter(col => col.id !== 'select' && col.id !== 'actions')
      : table.getAllLeafColumns().filter(col => col.id !== 'select' && col.id !== 'actions');

    const data = rows.map(row => {
      const rowData: Record<string, any> = {};
      columns.forEach(column => {
        const cell = row.getVisibleCells().find(cell => cell.column.id === column.id);
        const value = cell ? cell.getValue() : row.getValue(column.id);
        
        // Format the value for export
        let exportValue = value;
        if (value instanceof Date) {
          exportValue = value.toISOString().split('T')[0];
        } else if (typeof value === 'object' && value !== null) {
          exportValue = JSON.stringify(value);
        } else if (value === null || value === undefined) {
          exportValue = '';
        }

        const header = typeof column.columnDef.header === 'string' 
          ? column.columnDef.header 
          : column.id;
        
        rowData[header] = exportValue;
      });
      return rowData;
    });

    return { data, columns: columns.map(col => ({
      id: col.id,
      header: typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id
    })) };
  };

  const generateCSV = (data: any[], columns: any[]) => {
    const headers = config.includeHeaders 
      ? columns.map(col => col.header).join(',')
      : '';
    
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.header];
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    return config.includeHeaders ? [headers, ...rows].join('\n') : rows.join('\n');
  };

  const generateJSON = (data: any[]) => {
    return JSON.stringify(data, null, 2);
  };

  const generateExcel = async (data: any[], columns: any[]) => {
    // This is a simplified version - in a real app you'd use a library like xlsx
    const csvContent = generateCSV(data, columns);
    return new Blob([csvContent], { type: 'application/vnd.ms-excel' });
  };

  const generatePDF = async (data: any[], columns: any[]) => {
    // This is a placeholder - in a real app you'd use a library like jsPDF or Puppeteer
    const textContent = config.includeHeaders 
      ? columns.map(col => col.header).join('\t') + '\n' + 
        data.map(row => columns.map(col => row[col.header]).join('\t')).join('\n')
      : data.map(row => columns.map(col => row[col.header]).join('\t')).join('\n');
    
    return new Blob([textContent], { type: 'text/plain' });
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const { data, columns } = getDataToExport();
      
      if (data.length === 0) {
        alert(t('export.noDataToExport'));
        return;
      }

      // Call custom export handler if provided
      if (onExport) {
        onExport(data, config.format);
        setIsOpen(false);
        return;
      }

      let blob: Blob;
      let mimeType: string;
      let fileExtension: string;

      switch (config.format) {
        case 'csv':
          blob = new Blob([generateCSV(data, columns)], { type: 'text/csv' });
          mimeType = 'text/csv';
          fileExtension = 'csv';
          break;
        case 'json':
          blob = new Blob([generateJSON(data)], { type: 'application/json' });
          mimeType = 'application/json';
          fileExtension = 'json';
          break;
        case 'xlsx':
          blob = await generateExcel(data, columns);
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileExtension = 'xlsx';
          break;
        case 'pdf':
          blob = await generatePDF(data, columns);
          mimeType = 'application/pdf';
          fileExtension = 'pdf';
          break;
        default:
          throw new Error(`Unsupported export format: ${config.format}`);
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const finalFileName = `${config.customFileName}.${fileExtension}`;
      
      if (downloadRef.current) {
        downloadRef.current.href = url;
        downloadRef.current.download = finalFileName;
        downloadRef.current.click();
      }

      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 100);
      setIsOpen(false);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('export.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  const selectedRowsCount = table.getSelectedRowModel().rows.length;
  const totalRowsCount = table.getPreFilteredRowModel().rows.length;
  const visibleColumnsCount = table.getVisibleLeafColumns().filter(col => 
    col.id !== 'select' && col.id !== 'actions'
  ).length;

  return (
    <div className={cn('data-export', className)}>
      {/* Export Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-outline btn-sm gap-2"
        disabled={totalRowsCount === 0}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        {t('export.export')}
      </button>

      {/* Hidden download link */}
      <a ref={downloadRef} style={{ display: 'none' }} />

      {/* Export Panel */}
      {isOpen && (
        <div className="card bg-base-100 shadow-xl mt-2 w-full max-w-lg">
          <div className="card-body p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title text-lg">{t('export.exportData')}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Export Format Selection */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">{t('export.format')}</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {exportFormats.map(format => (
                  <label
                    key={format.value}
                    className={cn(
                      'cursor-pointer border rounded-lg p-3 transition-colors',
                      config.format === format.value
                        ? 'border-primary bg-primary/10'
                        : 'border-base-300 hover:border-primary/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={format.value}
                      checked={config.format === format.value}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        format: e.target.value as ExportFormat 
                      }))}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-2xl mb-1">{format.icon}</div>
                      <div className="font-medium text-sm">{format.label}</div>
                      <div className="text-xs opacity-60 mt-1">{format.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* File Name */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">{t('export.fileName')}</span>
              </label>
              <input
                type="text"
                value={config.customFileName}
                onChange={(e) => setConfig(prev => ({ ...prev, customFileName: e.target.value }))}
                className="input input-bordered"
                placeholder={t('export.enterFileName')}
              />
            </div>

            {/* Export Options */}
            <div className="space-y-3 mb-6">
              <label className="cursor-pointer label justify-start gap-3">
                <input
                  type="checkbox"
                  checked={config.includeHeaders}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeHeaders: e.target.checked }))}
                  className="checkbox checkbox-sm"
                />
                <div>
                  <span className="label-text font-medium">{t('export.includeHeaders')}</span>
                  <div className="text-xs opacity-60">{t('export.includeHeadersDescription')}</div>
                </div>
              </label>

              <label className="cursor-pointer label justify-start gap-3">
                <input
                  type="checkbox"
                  checked={config.visibleColumnsOnly}
                  onChange={(e) => setConfig(prev => ({ ...prev, visibleColumnsOnly: e.target.checked }))}
                  className="checkbox checkbox-sm"
                />
                <div>
                  <span className="label-text font-medium">{t('export.visibleColumnsOnly')}</span>
                  <div className="text-xs opacity-60">
                    {t('export.columnsCount', { count: visibleColumnsCount })}
                  </div>
                </div>
              </label>

              {selectedRowsCount > 0 && (
                <label className="cursor-pointer label justify-start gap-3">
                  <input
                    type="checkbox" 
                    checked={config.selectedRowsOnly}
                    onChange={(e) => setConfig(prev => ({ ...prev, selectedRowsOnly: e.target.checked }))}
                    className="checkbox checkbox-sm"
                  />
                  <div>
                    <span className="label-text font-medium">{t('export.selectedRowsOnly')}</span>
                    <div className="text-xs opacity-60">
                      {t('export.selectedRowsCount', { count: selectedRowsCount, total: totalRowsCount })}
                    </div>
                  </div>
                </label>
              )}
            </div>

            {/* Export Summary */}
            <div className="bg-base-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-sm mb-2">{t('export.summary')}</h4>
              <div className="text-sm space-y-1 opacity-80">
                <div>{t('export.rowsToExport')}: {config.selectedRowsOnly ? selectedRowsCount : totalRowsCount}</div>
                <div>{t('export.columnsToExport')}: {config.visibleColumnsOnly ? visibleColumnsCount : table.getAllLeafColumns().length - 2}</div>
                <div>{t('export.fileFormat')}: {config.format.toUpperCase()}</div>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={isExporting || totalRowsCount === 0}
              className="btn btn-primary w-full gap-2"
            >
              {isExporting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {t('export.exporting')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3" />
                  </svg>
                  {t('export.startExport')}
                </>
              )}
            </button>

            {totalRowsCount === 0 && (
              <div className="text-center text-warning text-sm mt-2">
                {t('export.noDataAvailable')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}