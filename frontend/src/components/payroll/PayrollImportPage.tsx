import React, { useState, useRef } from 'react';
import { ImportDataGroup, ImportMode } from '@/types/payroll-import';
import type { ImportConfig, ExcelDataRow } from '@/types/payroll-import';
import { PayrollImportImprovedService } from '@/services/payroll-import-improved.service';
import { DataGroupSelector } from '@/components/common/DataGroupSelector';
import { DataGroupSelectAllController } from '@/components/common/DataGroupSelectAllController';
import { MonthPicker } from '@/components/common/MonthPicker';
import { UniversalPageLayout } from '@/components/layout/UniversalPageLayout';
import * as XLSX from 'xlsx';
import { useToast, ToastContainer } from '@/components/common/Toast';
import { UploadIcon, CheckCircleIcon, CloseIcon } from '@/components/common/Icons';
import { ImportModeDescription } from './ImportModeDescription';
import { ImportModeSelector } from './ImportModeSelector';

export const PayrollImportPage: React.FC = () => {
  const { messages, removeToast, toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ExcelDataRow[]>([]);
  const [selectedDataGroups, setSelectedDataGroups] = useState<ImportDataGroup[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [importConfig, setImportConfig] = useState<ImportConfig>({
    dataGroup: [],
    mode: ImportMode.UPSERT,
    payPeriod: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    },
    options: {
      validateBeforeImport: true,
      skipInvalidRows: false,
      batchSize: 100
    }
  });
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理月份选择
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    const [year, monthNum] = month.split('-');
    const start = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const end = new Date(parseInt(year), parseInt(monthNum), 0);
    
    setImportConfig(prev => ({
      ...prev,
      payPeriod: { start, end }
    }));
  };

  // 处理数据组选择（多选模式）
  const handleGroupToggle = (group: ImportDataGroup) => {
    setSelectedDataGroups(prev => {
      if (prev.includes(group)) {
        // 如果已选择，则取消选择
        const newGroups = prev.filter(g => g !== group);
        setImportConfig(prevConfig => ({
          ...prevConfig,
          dataGroup: newGroups
        }));
        return newGroups;
      } else {
        // 如果未选择，则添加选择
        const newGroups = [...prev, group];
        setImportConfig(prevConfig => ({
          ...prevConfig,
          dataGroup: newGroups
        }));
        return newGroups;
      }
    });
  };

  // 全选数据组（多选模式）
  const handleSelectAllDataGroups = () => {
    const allBasicGroups = [
      ImportDataGroup.EARNINGS,
      ImportDataGroup.CONTRIBUTION_BASES,
      ImportDataGroup.CATEGORY_ASSIGNMENT,
      ImportDataGroup.JOB_ASSIGNMENT
    ];
    
    const isAllSelected = selectedDataGroups.length === allBasicGroups.length && 
      allBasicGroups.every(group => selectedDataGroups.includes(group));
    
    const newGroups = isAllSelected ? [] : allBasicGroups;
    setSelectedDataGroups(newGroups);
    setImportConfig(prev => ({ ...prev, dataGroup: newGroups }));
  };


  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setImportResult(null);

    // 读取Excel文件
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 解析所有工作表
        const allData: ExcelDataRow[] = [];
        let rowNumber = 1;
        
        workbook.SheetNames.forEach(sheetName => {
          if (sheetName === '使用说明') return; // 跳过说明表
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '' 
          });
          
          if (jsonData.length > 1) {
            const headers = jsonData[0] as string[];
            
            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              const rowData: ExcelDataRow = { rowNumber: rowNumber++ };
              
              headers.forEach((header, index) => {
                rowData[header] = row[index];
              });
              
              // 只添加非空行
              if (Object.values(rowData).some(v => v && v !== '')) {
                allData.push(rowData);
              }
            }
          }
        });
        
        setParsedData(allData);
        
      } catch (error) {
        toast.error('文件解析失败，请检查文件格式');
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  // 执行导入
  const handleImport = async () => {
    if (!parsedData.length) {
      toast.warning('没有可导入的数据');
      return;
    }

    if (selectedDataGroups.length === 0) {
      toast.warning('请选择要导入的数据类型');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const service = new PayrollImportImprovedService(importConfig);
      const result = await service.importData(parsedData);
      
      setImportResult(result);
      
      if (result.success) {
        toast.success(`导入成功！成功 ${result.successCount} 条，失败 ${result.failedCount} 条`);
      } else {
        toast.warning(`导入完成，但有错误。成功 ${result.successCount} 条，失败 ${result.failedCount} 条`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error('导入失败: ' + errorMessage);
    } finally {
      setImporting(false);
    }
  };

  // 清除上传
  const handleClearUpload = () => {
    setUploadedFile(null);
    setParsedData([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <UniversalPageLayout
      page={{
        title: "薪资数据导入",
        subtitle: "上传薪资数据Excel文件，支持多种数据类型和导入模式。请先在模板下载页面获取标准模板。",
        icon: <UploadIcon className="w-6 h-6" />
      }}
      styling={{
        compact: true,
        spacing: 'normal'
      }}
    >
      <ToastContainer messages={messages} onClose={removeToast} />
      
      {/* 模式选择器 */}
      <ImportModeSelector />
      
      {/* 导入配置 */}
      <div className="card bg-base-100 shadow-sm border border-base-200/60">
        <div className="card-body">
            <h2 className="card-title">导入配置</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 薪资周期选择 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">薪资周期</span>
                </label>
                <MonthPicker
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  placeholder="请选择薪资周期"
                  showDataIndicators={true}
                  disableMonthsWithData={true}
                  className="select-bordered"
                />
                <label className="label">
                  <span className="label-text-alt">只能选择无薪资数据的月份</span>
                </label>
              </div>

              {/* 导入模式 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">导入模式</span>
                </label>
                <select
                  className="select select-bordered"
                  value={importConfig.mode}
                  onChange={(e) => setImportConfig(prev => ({
                    ...prev,
                    mode: e.target.value as ImportMode
                  }))}
                >
                  <option value={ImportMode.CREATE}>仅创建新记录</option>
                  <option value={ImportMode.UPDATE}>仅更新现有记录</option>
                  <option value={ImportMode.UPSERT}>更新或创建（推荐）</option>
                  <option value={ImportMode.APPEND}>追加新字段</option>
                </select>
                <ImportModeDescription mode={importConfig.mode} />
              </div>

              {/* 数据组选择 */}
              <div className="col-span-2">
                <div className="form-control mb-4">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="label-text font-semibold">选择数据类型</span>
                    <DataGroupSelectAllController
                      selectedGroups={selectedDataGroups}
                      onSelectAll={handleSelectAllDataGroups}
                    />
                  </div>
                </div>
                
                <DataGroupSelector
                  selectedGroups={selectedDataGroups}
                  onGroupToggle={handleGroupToggle}
                  multiple={true}
                  className="mt-0"
                />
              </div>
            </div>

            {/* 选项 */}
            <div className="flex flex-row gap-4 mt-4">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary mr-2"
                    checked={importConfig.options.validateBeforeImport}
                    onChange={(e) => setImportConfig(prev => ({
                      ...prev,
                      options: {
                        ...prev.options,
                        validateBeforeImport: e.target.checked
                      }
                    }))}
                  />
                  <span className="label-text">导入前验证</span>
                </label>
              </div>
              
              <div className="form-control">
                <label className="label cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary mr-2"
                    checked={importConfig.options.skipInvalidRows}
                    onChange={(e) => setImportConfig(prev => ({
                      ...prev,
                      options: {
                        ...prev.options,
                        skipInvalidRows: e.target.checked
                      }
                    }))}
                  />
                  <span className="label-text">跳过无效行</span>
                </label>
              </div>
            </div>
          </div>
        </div>

      {/* 文件上传 */}
      <div className="card bg-base-100 shadow-sm border border-base-200/60">
        <div className="card-body">
            <h2 className="card-title">上传Excel文件</h2>
            
            {!uploadedFile ? (
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-base-200 hover:bg-base-300 border-base-content border-opacity-20">
                  <div className="flex flex-col items-center justify-center">
                    <UploadIcon className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-base mb-2">
                      <span className="font-semibold">点击上传</span> 或拖拽文件到这里
                    </p>
                    <p className="text-sm opacity-70">支持 .xlsx, .xls 格式</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 文件信息 */}
                <div className="alert alert-success">
                  <CheckCircleIcon className="w-6 h-6" />
                  <div className="flex-1">
                    <div className="font-semibold">{uploadedFile.name}</div>
                    <div className="text-sm">
                      {(uploadedFile.size / 1024).toFixed(2)} KB | 
                      解析到 {parsedData.length} 行数据
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={handleClearUpload}
                  >
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* 数据预览 */}
                {parsedData.length > 0 && (
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="card-title text-base">数据预览（前5行）</h3>
                      <div className="overflow-x-auto">
                        <table className="table table-zebra">
                          <thead>
                            <tr>
                              <th>行号</th>
                              <th>员工编号</th>
                              <th>员工姓名</th>
                              <th>身份证号</th>
                              <th>更多</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedData.slice(0, 5).map((row, index) => (
                              <tr key={index}>
                                <td>{row.rowNumber}</td>
                                <td>{row['员工编号'] || '-'}</td>
                                <td>{row['员工姓名'] || '-'}</td>
                                <td>{row['身份证号'] ? '****' + row['身份证号'].slice(-4) : '-'}</td>
                                <td>
                                  <span className="badge badge-ghost">
                                    {Object.keys(row).length - 4} 个字段
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 导入按钮 */}
                <div className="flex justify-end gap-2">
                  <button
                    className="btn btn-ghost"
                    onClick={handleClearUpload}
                  >
                    重新上传
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleImport}
                    disabled={importing || parsedData.length === 0 || selectedDataGroups.length === 0}
                  >
                    {importing && <span className="loading loading-spinner"></span>}
                    {importing ? '导入中...' : selectedDataGroups.length === 0 ? '请选择数据类型' : `开始导入 (${parsedData.length} 条)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* 导入结果 */}
      {importResult && (
        <div className="card bg-base-100 shadow-sm border border-base-200/60">
          <div className="card-body">
              <h2 className="card-title">
                导入结果
                <div className={`badge ${importResult.success ? 'badge-success' : 'badge-warning'}`}>
                  {importResult.success ? '成功' : '部分失败'}
                </div>
              </h2>
              
              {/* 统计信息 */}
              <div className="stats shadow">
                <div className="stat">
                  <div className="stat-title">总计</div>
                  <div className="stat-value text-primary">{importResult.totalRows}</div>
                  <div className="stat-desc">条记录</div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">成功</div>
                  <div className="stat-value text-success">{importResult.successCount}</div>
                  <div className="stat-desc">已导入</div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">失败</div>
                  <div className="stat-value text-error">{importResult.failedCount}</div>
                  <div className="stat-desc">导入失败</div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">跳过</div>
                  <div className="stat-value text-warning">{importResult.skippedCount}</div>
                  <div className="stat-desc">已跳过</div>
                </div>
              </div>

              {/* 错误信息 */}
              {importResult.errors?.length > 0 && (
                <div className="collapse collapse-arrow bg-error/10 mt-4">
                  <input type="checkbox" defaultChecked />
                  <div className="collapse-title font-medium text-error">
                    错误信息 ({importResult.errors.length} 条)
                  </div>
                  <div className="collapse-content">
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {importResult.errors.map((error: any, index: number) => (
                        <div key={index} className="alert alert-error">
                          <span className="text-sm">第{error.row}行: {error.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 警告信息 */}
              {importResult.warnings?.length > 0 && (
                <div className="collapse collapse-arrow bg-warning/10 mt-4">
                  <input type="checkbox" />
                  <div className="collapse-title font-medium text-warning">
                    警告信息 ({importResult.warnings.length} 条)
                  </div>
                  <div className="collapse-content">
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {importResult.warnings.map((warning: any, index: number) => (
                        <div key={index} className="alert alert-warning">
                          <span className="text-sm">第{warning.row}行: {warning.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
      )}
    </UniversalPageLayout>
  );
};