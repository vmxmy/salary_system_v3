import { useState, useRef } from 'react';
import type { Table } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface EmployeeExportProps<TData> {
  table: Table<TData>;
  fileName?: string;
  className?: string;
}

type ExportFormat = 'csv' | 'xlsx' | 'json';

interface ExportConfig {
  format: ExportFormat;
  includeHeaders: boolean;
  visibleColumnsOnly: boolean;
  selectedRowsOnly: boolean;
  customFileName: string;
}

export function EmployeeExport<TData>({
  table,
  fileName = 'employees',
  className,
}: EmployeeExportProps<TData>) {
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
    { 
      value: 'csv', 
      label: 'CSV', 
      icon: '📄', 
      description: '逗号分隔值文件，适合Excel打开'
    },
    { 
      value: 'xlsx', 
      label: 'Excel', 
      icon: '📊', 
      description: '标准Excel工作簿文件，支持格式化和样式'
    },
    { 
      value: 'json', 
      label: 'JSON', 
      icon: '🔧', 
      description: 'JSON数据文件，适合程序处理'
    },
  ] as const;

  const getDataToExport = () => {
    // 获取要导出的行数据
    const rows = config.selectedRowsOnly 
      ? table.getSelectedRowModel().rows
      : table.getPreFilteredRowModel().rows;

    // 获取要导出的列
    const columns = config.visibleColumnsOnly
      ? table.getVisibleLeafColumns().filter(col => 
          col.id !== 'select' && 
          col.id !== 'actions' && 
          col.id !== 'checkbox'
        )
      : table.getAllLeafColumns().filter(col => 
          col.id !== 'select' && 
          col.id !== 'actions' && 
          col.id !== 'checkbox'
        );

    // 构建导出数据
    const data = rows.map(row => {
      const rowData: Record<string, any> = {};
      columns.forEach(column => {
        const value = row.getValue(column.id);
        
        // 格式化导出值
        let exportValue = value;
        if (value instanceof Date) {
          exportValue = value.toISOString().split('T')[0];
        } else if (typeof value === 'object' && value !== null) {
          exportValue = JSON.stringify(value);
        } else if (value === null || value === undefined) {
          exportValue = '';
        } else if (typeof value === 'string') {
          exportValue = value.trim();
        }

        // 获取列标题 - 优先从字段元数据获取中文标题
        const header = getColumnHeader(column);
        
        rowData[header] = exportValue;
      });
      return rowData;
    });

    return { 
      data, 
      columns: columns.map(col => ({
        id: col.id,
        header: getColumnHeader(col)
      })) 
    };
  };

  // 辅助函数：获取列的中文标题
  const getColumnHeader = (column: any) => {
    // 优先从列的meta信息中获取field.label（中文标题）
    if (column.columnDef.meta?.field?.label) {
      return column.columnDef.meta.field.label;
    }
    
    // 如果header是字符串，直接使用
    if (typeof column.columnDef.header === 'string') {
      return column.columnDef.header;
    }
    
    // 最后回退到列ID
    return column.id;
  };

  const generateCSV = (data: any[], columns: any[]) => {
    const headers = config.includeHeaders 
      ? columns.map(col => col.header).join(',')
      : '';
    
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.header];
        // 处理包含逗号、引号或换行符的值
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
    // 使用 XLSX 库生成真正的 Excel 文件
    
    // 1. 准备数据
    const worksheetData = [];
    
    // 2. 添加表头
    if (config.includeHeaders) {
      worksheetData.push(columns.map(col => col.header));
    }
    
    // 3. 添加数据行
    data.forEach(row => {
      const rowData = columns.map(col => {
        const value = row[col.header];
        // 处理特殊值
        if (value instanceof Date) {
          return value.toISOString().split('T')[0]; // 格式化日期
        } else if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        } else if (value === null || value === undefined) {
          return '';
        }
        return value;
      });
      worksheetData.push(rowData);
    });
    
    // 4. 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // 5. 设置列宽 (可选)
    const colWidths = columns.map(col => ({
      wch: Math.max(col.header.length, 15) // 最小宽度15字符
    }));
    worksheet['!cols'] = colWidths;
    
    // 6. 创建工作簿
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '员工数据');
    
    // 7. 生成 Excel 文件
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array',
      compression: true // 启用压缩
    });
    
    return new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const { data, columns } = getDataToExport();
      
      if (data.length === 0) {
        alert('没有数据可导出');
        return;
      }

      let blob: Blob;
      let fileExtension: string;

      switch (config.format) {
        case 'csv':
          // 添加BOM以支持中文
          const bom = '\uFEFF';
          blob = new Blob([bom + generateCSV(data, columns)], { 
            type: 'text/csv;charset=utf-8' 
          });
          fileExtension = 'csv';
          break;
        case 'json':
          blob = new Blob([generateJSON(data)], { 
            type: 'application/json;charset=utf-8' 
          });
          fileExtension = 'json';
          break;
        case 'xlsx':
          blob = await generateExcel(data, columns);
          fileExtension = 'xlsx';
          break;
        default:
          throw new Error(`不支持的导出格式: ${config.format}`);
      }

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().slice(0, 10);
      const finalFileName = `${config.customFileName}_${timestamp}.${fileExtension}`;
      
      if (downloadRef.current) {
        downloadRef.current.href = url;
        downloadRef.current.download = finalFileName;
        downloadRef.current.click();
      }

      // 清理
      setTimeout(() => URL.revokeObjectURL(url), 100);
      setIsOpen(false);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedRowsCount = table.getSelectedRowModel().rows.length;
  const totalRowsCount = table.getPreFilteredRowModel().rows.length;
  const visibleColumnsCount = table.getVisibleLeafColumns().filter(col => 
    col.id !== 'select' && col.id !== 'actions' && col.id !== 'checkbox'
  ).length;

  return (
    <div className={cn('relative', className)}>
      {/* Export Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-primary btn-md gap-2"
        disabled={totalRowsCount === 0}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        导出员工数据
      </button>

      {/* Hidden download link */}
      <a ref={downloadRef} style={{ display: 'none' }} />

      {/* Export Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card bg-base-100 shadow-xl w-full max-w-lg mx-4">
            <div className="card-body p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="card-title text-lg">导出员工数据</h3>
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
                  <span className="label-text font-medium">导出格式</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {exportFormats.map(format => (
                    <label
                      key={format.value}
                      className={cn(
                        'cursor-pointer border rounded-lg p-3 transition-colors flex items-center gap-3',
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
                        className="radio radio-primary radio-sm"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{format.icon}</span>
                          <span className="font-medium">{format.label}</span>
                        </div>
                        <div className="text-xs opacity-60 mt-1">{format.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* File Name */}
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-medium">文件名</span>
                </label>
                <input
                  type="text"
                  value={config.customFileName}
                  onChange={(e) => setConfig(prev => ({ ...prev, customFileName: e.target.value }))}
                  className="input input-bordered"
                  placeholder="请输入文件名"
                />
                <label className="label">
                  <span className="label-text-alt">将自动添加日期和文件扩展名</span>
                </label>
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
                    <span className="label-text font-medium">包含表头</span>
                    <div className="text-xs opacity-60">在文件中包含列标题</div>
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
                    <span className="label-text font-medium">仅导出可见列</span>
                    <div className="text-xs opacity-60">
                      当前可见列数: {visibleColumnsCount}
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
                      <span className="label-text font-medium">仅导出选中行</span>
                      <div className="text-xs opacity-60">
                        已选中 {selectedRowsCount} 行，共 {totalRowsCount} 行
                      </div>
                    </div>
                  </label>
                )}
              </div>

              {/* Export Summary */}
              <div className="bg-base-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-sm mb-2">导出预览</h4>
                <div className="text-sm space-y-1 opacity-80">
                  <div>导出行数: {config.selectedRowsOnly ? selectedRowsCount : totalRowsCount}</div>
                  <div>导出列数: {config.visibleColumnsOnly ? visibleColumnsCount : table.getAllLeafColumns().length - 3}</div>
                  <div>文件格式: {config.format.toUpperCase()}</div>
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
                    正在导出...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3" />
                    </svg>
                    开始导出
                  </>
                )}
              </button>

              {totalRowsCount === 0 && (
                <div className="text-center text-warning text-sm mt-2">
                  暂无数据可导出
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}