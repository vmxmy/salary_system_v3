import React, { useState, useRef, useEffect } from 'react';
import { TemplateDownloader } from './TemplateDownloader';
import { HistoryDataExporter } from './HistoryDataExporter';
import { ImportDataGroup, ImportMode } from '@/types/payroll-import';
import type { ImportConfig, ExcelDataRow } from '@/types/payroll-import';
import { usePayrollImportExport } from '@/hooks/payroll/usePayrollImportExport';
import { DataGroupSelector } from '@/components/common/DataGroupSelector';
import { DataGroupSelectAllController } from '@/components/common/DataGroupSelectAllController';
import { MonthPicker } from '@/components/common/MonthPicker';
import { useAvailablePayrollMonths } from '@/hooks/payroll';
import * as XLSX from 'xlsx';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { DownloadIcon, UploadIcon, FolderIcon, CheckCircleIcon, CloseIcon } from '@/components/common/Icons';

export const PayrollImportPage: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const { mutations, resetImportProgress } = usePayrollImportExport();
  const { data: availableMonths } = useAvailablePayrollMonths(true);
  const [activeTab, setActiveTab] = useState<'template' | 'import' | 'export'>('template');
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
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    currentGroup: string;
    percentage: number;
  }>({ current: 0, total: 0, currentGroup: '', percentage: 0 });
  const [failedRows, setFailedRows] = useState<ExcelDataRow[]>([]);
  const [retryMode, setRetryMode] = useState(false);

  // 获取或创建薪资周期
  const getOrCreatePeriod = async (month: string): Promise<string | null> => {
    try {
      // 首先检查是否已有周期
      const monthData = availableMonths?.find(m => m.month === month);
      if (monthData?.periodId) {
        return monthData.periodId;
      }
      
      // 如果没有，创建新周期
      const [year, monthNum] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0);
      
      const { data, error } = await supabase
        .from('payroll_periods')
        .insert({
          period_code: month,
          period_year: parseInt(year),
          period_month: parseInt(monthNum),
          period_name: `${year}年${monthNum}月薪资`,
          period_start: startDate.toISOString().split('T')[0],
          period_end: endDate.toISOString().split('T')[0],
          pay_date: endDate.toISOString().split('T')[0],
          status: 'draft',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('创建薪资周期失败:', error);
        showError('创建薪资周期失败: ' + error.message);
        return null;
      }
      
      return data?.id || null;
    } catch (error) {
      console.error('获取或创建周期失败:', error);
      showError('获取或创建周期失败');
      return null;
    }
  };

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
    
    // 查找对应的周期ID
    const monthData = availableMonths?.find(m => m.month === month);
    setSelectedPeriodId(monthData?.periodId || null);
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
        
        // 显示预览 - 开发环境下才输出日志
        if (process.env.NODE_ENV === 'development') {
          console.log(`成功解析 ${allData.length} 行数据`);
        }
        
      } catch (error) {
        console.error('文件解析失败:', error);
        showError('文件解析失败，请检查文件格式');
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  // 显示导入预览
  const handleShowPreview = () => {
    if (!parsedData.length) {
      showWarning('没有可导入的数据');
      return;
    }

    if (selectedDataGroups.length === 0) {
      showWarning('请选择要导入的数据类型');
      return;
    }

    setShowPreviewModal(true);
  };

  // 执行导入
  const handleImport = async () => {
    if (!parsedData.length) {
      showWarning('没有可导入的数据');
      return;
    }

    if (selectedDataGroups.length === 0) {
      showWarning('请选择要导入的数据类型');
      return;
    }

    if (!uploadedFile) {
      showWarning('请上传文件');
      return;
    }

    setImporting(true);
    setImportResult(null);
    setShowPreviewModal(false);
    resetImportProgress();

    // 初始化进度
    const totalGroups = selectedDataGroups.length;
    const rowsPerGroup = parsedData.length;
    const totalRows = totalGroups * rowsPerGroup;
    
    setImportProgress({
      current: 0,
      total: totalRows,
      currentGroup: '',
      percentage: 0
    });

    try {
      // 获取或创建周期ID
      let periodId = selectedPeriodId;
      if (!periodId) {
        periodId = await getOrCreatePeriod(selectedMonth);
        if (!periodId) {
          showError('无法创建薪资周期，请重试');
          setImporting(false);
          return;
        }
        setSelectedPeriodId(periodId);
      }
      
      // 逐个数据组导入并更新进度
      let processedRows = 0;
      const results = {
        success: true,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        totalRows: parsedData.length,
        errors: [] as any[],
        warnings: [] as any[]
      };

      const dataToImport = retryMode ? failedRows : parsedData;
      const failedRowsInThisImport: ExcelDataRow[] = [];

      for (let i = 0; i < selectedDataGroups.length; i++) {
        const group = selectedDataGroups[i];
        const groupName = getDataGroupLabel(group);
        
        // 更新当前处理的数据组
        setImportProgress(prev => ({
          ...prev,
          currentGroup: groupName,
          percentage: Math.round((processedRows / totalRows) * 100)
        }));

        try {
          // 构建导入配置
          const importConfi = {
            mode: importConfig.mode === ImportMode.UPSERT ? 'update' : 'append' as 'append' | 'update' | 'replace',
            validateBeforeImport: importConfig.options?.validateBeforeImport || true,
            skipDuplicates: importConfig.options?.skipInvalidRows || false,
            dataGroups: [group.toString()],
            fieldMappings: {}
          };
          
          const groupResult = await mutations.importExcel.mutateAsync({
            file: uploadedFile,
            config: importConfi,
            periodId: periodId
          });

          // 合并结果
          results.successCount += groupResult.successCount || 0;
          results.failedCount += groupResult.failedCount || 0;
          results.skippedCount += groupResult.skippedCount || 0;
          if (groupResult.errors) {
            results.errors.push(...groupResult.errors);
            // 收集失败的行用于重试
            groupResult.errors.forEach((error: any) => {
              if (error.row && dataToImport[error.row - 1]) {
                failedRowsInThisImport.push(dataToImport[error.row - 1]);
              }
            });
          }
          if (groupResult.warnings) results.warnings.push(...groupResult.warnings);
          
          processedRows += rowsPerGroup;
          
          // 更新进度
          setImportProgress(prev => ({
            ...prev,
            current: processedRows,
            percentage: Math.round((processedRows / totalRows) * 100)
          }));
          
        } catch (error) {
          console.error(`导入 ${groupName} 失败:`, error);
          results.failedCount += rowsPerGroup;
          results.errors.push({
            row: 0,
            message: `${groupName} 导入失败: ${error instanceof Error ? error.message : '未知错误'}`
          });
          // 批量失败时，将所有行标记为失败
          failedRowsInThisImport.push(...dataToImport);
        }
      }
      
      // 保存失败的行以供重试
      setFailedRows(failedRowsInThisImport);
      setRetryMode(false);
      
      setImportResult(results);
      
      if (results.failedCount === 0) {
        showSuccess(`导入成功！成功 ${results.successCount} 条`);
      } else if (results.successCount > 0) {
        showWarning(`导入完成，但有错误。成功 ${results.successCount} 条，失败 ${results.failedCount} 条`);
      } else {
        showError(`导入失败，所有数据都未能成功导入`);
      }
    } catch (error) {
      // 开发环境下才输出错误日志
      if (process.env.NODE_ENV === 'development') {
        console.error('导入失败:', error);
      }
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      showError('导入失败: ' + errorMessage);
    } finally {
      setImporting(false);
      // 重置进度
      setImportProgress({
        current: 0,
        total: 0,
        currentGroup: '',
        percentage: 0
      });
    }
  };

  // 获取数据组标签
  const getDataGroupLabel = (group: ImportDataGroup): string => {
    switch(group) {
      case ImportDataGroup.EARNINGS:
        return '薪资收入';
      case ImportDataGroup.CONTRIBUTION_BASES:
        return '缴费基数';
      case ImportDataGroup.CATEGORY_ASSIGNMENT:
        return '人员类别';
      case ImportDataGroup.JOB_ASSIGNMENT:
        return '岗位分配';
      default:
        return '未知类型';
    }
  };

  // 清除上传
  const handleClearUpload = () => {
    setUploadedFile(null);
    setParsedData([]);
    setImportResult(null);
    setFailedRows([]);
    setRetryMode(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 重试失败的行
  const handleRetryFailed = () => {
    if (failedRows.length === 0) {
      showWarning('没有失败的行可以重试');
      return;
    }
    
    setRetryMode(true);
    setParsedData(failedRows);
    setImportResult(null);
    showInfo(`准备重试 ${failedRows.length} 条失败的记录`);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">薪资数据导入导出</h1>
      <div className="divider"></div>

      {/* 标签页 - 使用 DaisyUI 5 tabs-border 样式 */}
      <div className="tabs tabs-border">
        <input
          type="radio"
          name="payroll_import_tabs"
          className="tab"
          aria-label="下载模板"
          checked={activeTab === 'template'}
          onChange={() => setActiveTab('template')}
        />
        <div className="tab-content border-base-300 bg-base-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <DownloadIcon className="w-5 h-5" />
            <h2 className="text-xl font-semibold">下载模板</h2>
          </div>
          <TemplateDownloader
            defaultPeriod={{
              year: importConfig.payPeriod.start.getFullYear(),
              month: importConfig.payPeriod.start.getMonth() + 1
            }}
          />
        </div>

        <input
          type="radio"
          name="payroll_import_tabs"
          className="tab"
          aria-label="导入数据"
          checked={activeTab === 'import'}
          onChange={() => setActiveTab('import')}
        />
        <div className="tab-content border-base-300 bg-base-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <UploadIcon className="w-5 h-5" />
            <h2 className="text-xl font-semibold">导入数据</h2>
          </div>
          <div className="flex flex-col gap-6">
            {/* 导入配置 */}
            <div className="card bg-base-100 shadow-xl">
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
                      <option value={ImportMode.UPSERT}>更新或创建</option>
                      <option value={ImportMode.APPEND}>追加新字段</option>
                    </select>
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
            <div className="card bg-base-100 shadow-xl">
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
                        className="btn btn-outline btn-primary"
                        onClick={handleShowPreview}
                        disabled={importing || parsedData.length === 0 || selectedDataGroups.length === 0}
                      >
                        预览导入
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

                    {/* 导入进度条 */}
                    {importing && importProgress.total > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>正在导入: {importProgress.currentGroup}</span>
                          <span>{importProgress.percentage}%</span>
                        </div>
                        <progress 
                          className="progress progress-primary w-full" 
                          value={importProgress.percentage} 
                          max="100"
                        ></progress>
                        <div className="text-sm text-base-content/60">
                          已处理 {importProgress.current} / {importProgress.total} 条记录
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 导入结果 */}
            {importResult && (
              <div className="card bg-base-100 shadow-xl">
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

                  {/* 失败重试按钮 */}
                  {failedRows.length > 0 && (
                    <div className="mt-4 flex justify-end gap-2">
                      <button 
                        className="btn btn-outline btn-error"
                        onClick={() => {
                          setFailedRows([]);
                          showInfo('已清除失败记录');
                        }}
                      >
                        清除失败记录
                      </button>
                      <button 
                        className="btn btn-primary"
                        onClick={handleRetryFailed}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        重试失败的 {failedRows.length} 条记录
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <input
          type="radio"
          name="payroll_import_tabs"
          className="tab"
          aria-label="导出历史"
          checked={activeTab === 'export'}
          onChange={() => setActiveTab('export')}
        />
        <div className="tab-content border-base-300 bg-base-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FolderIcon className="w-5 h-5" />
            <h2 className="text-xl font-semibold">导出历史</h2>
          </div>
          <HistoryDataExporter />
        </div>
      </div>

      {/* 导入预览模态框 */}
      {showPreviewModal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">导入数据预览</h3>
            
            {/* 数据汇总 */}
            <div className="stats shadow w-full mb-4">
              <div className="stat">
                <div className="stat-title">数据行数</div>
                <div className="stat-value text-primary">{parsedData.length}</div>
              </div>
              <div className="stat">
                <div className="stat-title">选择的数据类型</div>
                <div className="stat-value text-secondary">{selectedDataGroups.length}</div>
              </div>
              <div className="stat">
                <div className="stat-title">导入模式</div>
                <div className="stat-value text-sm">
                  {importConfig.mode === ImportMode.CREATE ? '仅创建' : 
                   importConfig.mode === ImportMode.UPDATE ? '仅更新' :
                   importConfig.mode === ImportMode.UPSERT ? '更新或创建' : '追加'}
                </div>
              </div>
            </div>

            {/* 选择的数据组 */}
            <div className="mb-4">
              <h4 className="font-semibold mb-2">将导入以下数据类型：</h4>
              <div className="flex flex-wrap gap-2">
                {selectedDataGroups.map(group => (
                  <span key={group} className="badge badge-primary">
                    {getDataGroupLabel(group)}
                  </span>
                ))}
              </div>
            </div>

            {/* 数据预览表格 */}
            <div className="mb-4">
              <h4 className="font-semibold mb-2">数据样本（前10行）：</h4>
              <div className="overflow-x-auto max-h-96">
                <table className="table table-xs table-zebra">
                  <thead>
                    <tr>
                      <th>行号</th>
                      <th>员工编号</th>
                      <th>员工姓名</th>
                      <th>部门</th>
                      <th>基本工资</th>
                      <th>更多字段</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        <td>{row.rowNumber}</td>
                        <td>{row['员工编号'] || '-'}</td>
                        <td>{row['员工姓名'] || '-'}</td>
                        <td>{row['部门'] || '-'}</td>
                        <td>{row['基本工资'] || '-'}</td>
                        <td>
                          <span className="badge badge-ghost badge-sm">
                            {Object.keys(row).length - 5} 个字段
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 10 && (
                <div className="text-sm text-base-content/60 mt-2">
                  还有 {parsedData.length - 10} 行未显示...
                </div>
              )}
            </div>

            {/* 导入选项确认 */}
            <div className="alert alert-info mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="font-semibold">导入设置</div>
                <ul className="text-sm mt-1">
                  <li>• 导入前验证: {importConfig.options.validateBeforeImport ? '✓ 已启用' : '✗ 已禁用'}</li>
                  <li>• 跳过无效行: {importConfig.options.skipInvalidRows ? '✓ 已启用' : '✗ 已禁用'}</li>
                  <li>• 批处理大小: {importConfig.options.batchSize} 行/批</li>
                </ul>
              </div>
            </div>

            {/* 警告信息 */}
            {parsedData.length > 1000 && (
              <div className="alert alert-warning mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>数据量较大（{parsedData.length} 行），导入可能需要较长时间</span>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="modal-action">
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowPreviewModal(false)}
              >
                取消
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleImport}
                disabled={importing}
              >
                {importing && <span className="loading loading-spinner"></span>}
                确认导入
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowPreviewModal(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
};