import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { TemplateDownloader } from './TemplateDownloader';
import { HistoryDataExporter } from './HistoryDataExporter';
import { ImportDataGroup, ImportMode } from '@/types/payroll-import';
import type { ImportConfig, ExcelDataRow } from '@/types/payroll-import';
import { usePayrollImportExport } from '@/hooks/payroll/import-export';
import { DataGroupSelector } from '@/components/common/DataGroupSelector';
import { DataGroupSelectAllController } from '@/components/common/DataGroupSelectAllController';
import { MonthPicker } from '@/components/common/MonthPicker';
import { useAvailablePayrollMonths, usePayrollPeriod } from '@/hooks/payroll';
import * as XLSX from 'xlsx';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { DownloadIcon, UploadIcon, FolderIcon, CheckCircleIcon, CloseIcon } from '@/components/common/Icons';
import { PayrollElement } from '@/types/payroll-completeness';

export const PayrollImportPage: React.FC = () => {
  const location = useLocation();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const { 
    importExcel, 
    exportExcel, 
    downloadTemplate, 
    importProgress: hookProgress, 
    resetProgress, 
    analyzeFieldMapping,
    isImporting,
    isExporting,
    isDownloading,
    utils
  } = usePayrollImportExport();
  const { data: availableMonths } = useAvailablePayrollMonths(true);
  const { actions: periodActions } = usePayrollPeriod();
  const [activeTab, setActiveTab] = useState<'template' | 'import' | 'export'>('template');
  const [importing, setImporting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ExcelDataRow[]>([]);
  const [selectedDataGroups, setSelectedDataGroups] = useState<ImportDataGroup[]>([]);
  
  // 从路由状态获取参数
  const locationState = location.state as { 
    selectedMonth?: string; 
    selectedPeriodId?: string; 
    targetElement?: PayrollElement;
  } | null;
  
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // 优先使用路由传递的月份
    if (locationState?.selectedMonth) {
      return locationState.selectedMonth;
    }
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
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(() => {
    // 优先使用路由传递的周期ID
    return locationState?.selectedPeriodId || null;
  });
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [failedRows, setFailedRows] = useState<ExcelDataRow[]>([]);
  const [retryMode, setRetryMode] = useState(false);
  const [parseResult, setParseResult] = useState<{
    sheets: {
      name: string;
      rowCount: number;
      columnCount: number;
      headers: string[];
      isEmpty: boolean;
      hasData: boolean;
    }[];
    expectedSheets: string[];
    missingSheets: string[];
    unexpectedSheets: string[];
    totalRows: number;
    validRows: number;
    emptyRows: number;
    duplicateEmployees: string[];
    dataConsistency: {
      allSheetsHaveSameRowCount: boolean;
      rowCountVariance: number[];
      employeeListConsistent: boolean;
      missingInSheets: { employee: string; sheets: string[] }[];
    };
    warnings: string[];
    hasErrors: boolean;
    errors: string[];
  } | null>(null);

  // 根据传入的目标要素自动选择数据组并切换到导入页签
  useEffect(() => {
    if (locationState?.targetElement) {
      // 映射要素到数据组
      const elementToDataGroup: Record<string, ImportDataGroup[]> = {
        [PayrollElement.Earnings]: [ImportDataGroup.EARNINGS],
        [PayrollElement.Bases]: [ImportDataGroup.CONTRIBUTION_BASES],
        [PayrollElement.Category]: [ImportDataGroup.CATEGORY_ASSIGNMENT],
        [PayrollElement.Job]: [ImportDataGroup.JOB_ASSIGNMENT]
      };
      
      const targetGroups = elementToDataGroup[locationState.targetElement];
      if (targetGroups) {
        setSelectedDataGroups(targetGroups);
        setImportConfig(prev => ({
          ...prev,
          dataGroup: targetGroups
        }));
        // 自动切换到导入页签
        setActiveTab('import');
        
        // 显示提示信息
        const elementNames: Record<string, string> = {
          [PayrollElement.Earnings]: '薪资项目',
          [PayrollElement.Bases]: '缴费基数',
          [PayrollElement.Category]: '人员类别',
          [PayrollElement.Job]: '职务信息'
        };
        showInfo(`已自动选择 ${elementNames[locationState.targetElement]} 数据组，请上传对应的Excel文件`);
      }
    }
  }, [locationState?.targetElement]);

  // 获取或创建薪资周期
  const getOrCreatePeriod = async (month: string): Promise<string | null> => {
    try {
      // 首先检查是否已有周期（从缓存中查找）
      const monthData = availableMonths?.find(m => m.month === month);
      if (monthData?.periodId) {
        return monthData.periodId;
      }
      
      // 解析年月
      const [year, monthNum] = month.split('-');
      const yearInt = parseInt(year);
      const monthInt = parseInt(monthNum);
      
      // 使用 hook 的 getOrCreatePeriod 方法
      const period = await periodActions.getOrCreatePeriod(yearInt, monthInt);
      
      if (!period) {
        showError('无法创建薪资周期');
        return null;
      }
      
      console.log(`成功获取或创建薪资周期: ${month}, ID: ${period.id}`);
      return period.id;
    } catch (error: any) {
      console.error('获取或创建周期失败:', error);
      showError(error.message || '获取或创建周期失败');
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
    setParseResult(null);

    // 读取Excel文件
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 根据选中的数据组定义期望的工作表
        const getExpectedSheets = () => {
          const sheets: string[] = [];
          if (selectedDataGroups.includes(ImportDataGroup.EARNINGS)) {
            sheets.push('薪资项目明细');
          }
          if (selectedDataGroups.includes(ImportDataGroup.CONTRIBUTION_BASES)) {
            sheets.push('缴费基数');
          }
          if (selectedDataGroups.includes(ImportDataGroup.CATEGORY_ASSIGNMENT)) {
            sheets.push('人员类别');
          }
          if (selectedDataGroups.includes(ImportDataGroup.JOB_ASSIGNMENT)) {
            sheets.push('职务分配');
          }
          return sheets;
        };
        
        const expectedSheets = getExpectedSheets();
        const foundSheets: string[] = [];
        const missingSheets: string[] = [];
        const unexpectedSheets: string[] = [];
        
        // 解析结果详情
        const sheetDetails: any[] = [];
        const allData: ExcelDataRow[] = [];
        const employeesBySheet: { [sheetName: string]: Set<string> } = {};
        const rowCountBySheet: { [sheetName: string]: number } = {};
        let totalEmptyRows = 0;
        let rowNumber = 1;
        
        // 分析每个工作表
        workbook.SheetNames.forEach(sheetName => {
          if (sheetName === '使用说明') {
            // 跳过说明表但记录
            sheetDetails.push({
              name: sheetName,
              rowCount: 0,
              columnCount: 0,
              headers: [],
              isEmpty: true,
              hasData: false
            });
            return;
          }
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '' 
          });
          
          // 记录sheet信息
          const headers = jsonData.length > 0 ? (jsonData[0] as string[]).filter(h => h) : [];
          const dataRows = jsonData.length > 1 ? jsonData.slice(1) : [];
          const validDataRows = dataRows.filter((row) => {
            const rowData = row as any[];
            return rowData.some(cell => cell !== null && cell !== undefined && cell !== '');
          });
          
          sheetDetails.push({
            name: sheetName,
            rowCount: validDataRows.length,
            columnCount: headers.length,
            headers: headers,
            isEmpty: validDataRows.length === 0,
            hasData: validDataRows.length > 0
          });
          
          // 检查是否是期望的sheet
          if (expectedSheets.includes(sheetName)) {
            foundSheets.push(sheetName);
          } else {
            unexpectedSheets.push(sheetName);
          }
          
          // 收集员工信息用于一致性检查
          employeesBySheet[sheetName] = new Set();
          rowCountBySheet[sheetName] = validDataRows.length;
          
          // 解析数据行
          if (jsonData.length > 1) {
            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              const rowData: ExcelDataRow = { 
                rowNumber: rowNumber++,
                _sheetName: sheetName // 记录来源sheet
              };
              
              let isEmptyRow = true;
              headers.forEach((header, index) => {
                const value = row[index];
                rowData[header] = value;
                if (value && value !== '') {
                  isEmptyRow = false;
                }
                
                // 收集员工姓名或编号
                if ((header === '员工姓名' || header === '姓名' || header === 'employee_name') && value) {
                  employeesBySheet[sheetName].add(String(value));
                }
              });
              
              // 只添加非空行
              if (!isEmptyRow) {
                allData.push(rowData);
              } else {
                totalEmptyRows++;
              }
            }
          }
        });
        
        // 找出缺失的期望sheet
        missingSheets.push(...expectedSheets.filter(sheet => !foundSheets.includes(sheet)));
        
        // 检查数据一致性
        const allEmployees = new Set<string>();
        const employeeSheetCount: { [employee: string]: string[] } = {};
        
        Object.entries(employeesBySheet).forEach(([sheetName, employees]) => {
          employees.forEach(emp => {
            allEmployees.add(emp);
            if (!employeeSheetCount[emp]) {
              employeeSheetCount[emp] = [];
            }
            employeeSheetCount[emp].push(sheetName);
          });
        });
        
        // 找出不一致的员工（没有出现在所有sheet中）
        const missingInSheets: { employee: string; sheets: string[] }[] = [];
        const dataSheets = Object.keys(employeesBySheet).filter(s => s !== '使用说明');
        
        allEmployees.forEach(emp => {
          const appearInSheets = employeeSheetCount[emp] || [];
          const missingFromSheets = dataSheets.filter(s => !appearInSheets.includes(s));
          if (missingFromSheets.length > 0) {
            missingInSheets.push({
              employee: emp,
              sheets: missingFromSheets
            });
          }
        });
        
        // 检查行数一致性
        const rowCounts = Object.values(rowCountBySheet).filter(c => c > 0);
        const allSheetsHaveSameRowCount = rowCounts.length > 0 && 
          rowCounts.every(count => count === rowCounts[0]);
        
        // 查找重复的员工
        const employeeCounts: { [name: string]: number } = {};
        allData.forEach(row => {
          const name = row['员工姓名'] || row['姓名'] || row['employee_name'];
          if (name) {
            employeeCounts[name] = (employeeCounts[name] || 0) + 1;
          }
        });
        const duplicateEmployees = Object.entries(employeeCounts)
          .filter(([_, count]) => count > 1)
          .map(([name, _]) => name);
        
        // 生成警告和错误信息
        const warnings: string[] = [];
        const errors: string[] = [];
        
        // 严重错误（会阻止导入）- 只有当选择了数据组但缺少对应sheet时才报错
        if (missingSheets.length > 0 && selectedDataGroups.length > 0) {
          errors.push(`缺少选中数据组对应的工作表: ${missingSheets.join(', ')}`);
        }
        if (allData.length === 0) {
          errors.push('文件中没有有效数据');
        }
        if (sheetDetails.filter(s => s.name !== '使用说明' && s.hasData).length === 0) {
          errors.push('所有工作表都为空，没有可导入的数据');
        }
        
        // 警告信息（不会阻止导入）
        if (unexpectedSheets.length > 0 && unexpectedSheets.filter(s => s !== '使用说明').length > 0) {
          warnings.push(`发现非标准工作表: ${unexpectedSheets.filter(s => s !== '使用说明').join(', ')}`);
        }
        if (!allSheetsHaveSameRowCount && rowCounts.length > 1) {
          warnings.push(`各工作表数据行数不一致: ${JSON.stringify(rowCountBySheet)}`);
        }
        if (duplicateEmployees.length > 0) {
          warnings.push(`发现重复的员工: ${duplicateEmployees.slice(0, 5).join(', ')}${duplicateEmployees.length > 5 ? '...' : ''}`);
        }
        if (missingInSheets.length > 0) {
          warnings.push(`部分员工数据不完整，未出现在所有工作表中`);
        }
        if (totalEmptyRows > 10) {
          warnings.push(`文件包含 ${totalEmptyRows} 个空行，建议清理后重新上传`);
        }
        
        const hasErrors = errors.length > 0;
        
        // 设置解析结果
        setParseResult({
          sheets: sheetDetails,
          expectedSheets,
          missingSheets,
          unexpectedSheets,
          totalRows: allData.length,
          validRows: allData.length,
          emptyRows: totalEmptyRows,
          duplicateEmployees,
          dataConsistency: {
            allSheetsHaveSameRowCount,
            rowCountVariance: rowCounts,
            employeeListConsistent: missingInSheets.length === 0,
            missingInSheets: missingInSheets.slice(0, 10) // 只显示前10个
          },
          warnings,
          hasErrors,
          errors
        });
        
        setParsedData(allData);
        
        // 显示解析结果通知
        if (hasErrors) {
          showError(`文件解析失败: ${errors[0]}`);
        } else if (warnings.length > 0) {
          showWarning(`文件解析成功，但发现 ${warnings.length} 个潜在问题`);
        } else {
          showSuccess(`文件解析成功，共 ${allData.length} 条有效数据`);
        }
        
      } catch (error) {
        console.error('文件解析失败:', error);
        showError('文件解析失败，请检查文件格式');
        setParseResult(null);
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
    
    // 重置进度状态
    resetProgress();

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
      
      // 逐个数据组导入
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
        

        try {
          // 构建导入配置 - 使用正确的ImportConfig接口
          const importConfigForGroup: ImportConfig = {
            dataGroup: group as ImportDataGroup,  // 修复：使用正确的字段名和类型
            mode: importConfig.mode,
            payPeriod: importConfig.payPeriod,
            options: importConfig.options
          };
          
          console.log(`🚀 开始导入数据组: ${group}`, importConfigForGroup);
          
          const groupResult = await importExcel.mutateAsync({
            file: uploadedFile,
            config: importConfigForGroup,
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
          
          
        } catch (error) {
          console.error(`导入 ${groupName} 失败:`, error);
          results.failedCount += dataToImport.length;
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
    }
  };

  // 获取数据组标签
  const getDataGroupLabel = (group: ImportDataGroup): string => {
    switch(group) {
      case ImportDataGroup.EARNINGS:
        return '薪资项目明细';
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
    setParseResult(null);
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
                      availableMonths={availableMonths}
                      isMonthDisabledCustom={(yearMonth, monthData) => {
                        // 禁用状态为"处理中"(processing)或"已完成"(completed)的月份
                        if (monthData?.periodStatus === 'processing' || monthData?.periodStatus === 'completed') {
                          return true;
                        }
                        return false;
                      }}
                      className="select-bordered"
                    />
                    <label className="label">
                      <span className="label-text-alt">不能选择处理中或已完成状态的月份</span>
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

                    {/* 解析结果详情 */}
                    {parseResult && (
                      <div className="card bg-base-200">
                        <div className="card-body">
                          <h3 className="card-title text-base">解析结果分析</h3>
                          
                          {/* 错误信息展示 */}
                          {parseResult.hasErrors && (
                            <div className="alert alert-error mb-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <h3 className="font-bold">无法导入 - 发现以下错误：</h3>
                                <ul className="mt-2 ml-4 list-disc">
                                  {parseResult.errors.map((error, idx) => (
                                    <li key={idx}>{error}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                          
                          {/* Sheet分析 */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                            <div>
                              <h4 className="font-semibold mb-2">工作表信息</h4>
                              <div className="space-y-1 text-sm">
                                {parseResult.sheets.map((sheet, idx) => (
                                  <div key={idx} className="flex justify-between items-center">
                                    <span className={`${sheet.isEmpty ? 'opacity-50' : ''}`}>
                                      {sheet.name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {sheet.isEmpty ? (
                                        <span className="badge badge-ghost badge-sm">空表</span>
                                      ) : (
                                        <>
                                          <span className="badge badge-info badge-sm">{sheet.rowCount} 行</span>
                                          <span className="badge badge-secondary badge-sm">{sheet.columnCount} 列</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold mb-2">数据统计</h4>
                              <div className="stats stats-vertical shadow-sm">
                                <div className="stat py-2">
                                  <div className="stat-title text-xs">有效数据行</div>
                                  <div className="stat-value text-lg">{parseResult.validRows}</div>
                                </div>
                                <div className="stat py-2">
                                  <div className="stat-title text-xs">空行数量</div>
                                  <div className="stat-value text-lg">{parseResult.emptyRows}</div>
                                </div>
                                <div className="stat py-2">
                                  <div className="stat-title text-xs">重复员工</div>
                                  <div className="stat-value text-lg">{parseResult.duplicateEmployees.length}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Sheet匹配状态 */}
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">工作表匹配状态</h4>
                            {selectedDataGroups.length === 0 ? (
                              <div className="text-sm text-warning">请先选择要导入的数据组</div>
                            ) : (
                              <>
                                <div className="text-sm mb-2 opacity-70">
                                  根据选中的数据组，期望包含: {parseResult.expectedSheets.join(', ')}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {parseResult.expectedSheets.map(sheet => {
                                    const isMissing = parseResult.missingSheets.includes(sheet);
                                    return (
                                      <span 
                                        key={sheet}
                                        className={`badge ${isMissing ? 'badge-error' : 'badge-success'}`}
                                      >
                                        {isMissing && '✗ '}{!isMissing && '✓ '}{sheet}
                                      </span>
                                    );
                                  })}
                                  {parseResult.unexpectedSheets.filter(s => s !== '使用说明').map(sheet => (
                                    <span key={sheet} className="badge badge-warning">
                                      ? {sheet}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          
                          {/* 数据一致性检查 */}
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">数据一致性</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                {parseResult.dataConsistency.allSheetsHaveSameRowCount ? (
                                  <>
                                    <CheckCircleIcon className="w-4 h-4 text-success" />
                                    <span className="text-success">各工作表行数一致</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <span className="text-warning">
                                      各工作表行数不一致 ({parseResult.dataConsistency.rowCountVariance.join(', ')})
                                    </span>
                                  </>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {parseResult.dataConsistency.employeeListConsistent ? (
                                  <>
                                    <CheckCircleIcon className="w-4 h-4 text-success" />
                                    <span className="text-success">所有员工数据完整</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <span className="text-warning">
                                      {parseResult.dataConsistency.missingInSheets.length} 个员工数据不完整
                                    </span>
                                  </>
                                )}
                              </div>
                              
                              {parseResult.duplicateEmployees.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <svg className="w-4 h-4 text-info mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <div className="text-info">
                                    <div>发现重复员工：</div>
                                    <div className="text-xs opacity-80">
                                      {parseResult.duplicateEmployees.slice(0, 3).join(', ')}
                                      {parseResult.duplicateEmployees.length > 3 && ` 等${parseResult.duplicateEmployees.length}人`}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* 警告信息 */}
                          {parseResult.warnings.length > 0 && (
                            <div className="alert alert-warning">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <div>
                                <div className="font-semibold">发现 {parseResult.warnings.length} 个问题</div>
                                <ul className="text-sm mt-1">
                                  {parseResult.warnings.map((warning, idx) => (
                                    <li key={idx}>• {warning}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

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
                        disabled={importing || parsedData.length === 0 || selectedDataGroups.length === 0 || parseResult?.hasErrors}
                      >
                        {importing && <span className="loading loading-spinner"></span>}
                        {importing ? '导入中...' : 
                         parseResult?.hasErrors ? '无法导入（有错误）' :
                         selectedDataGroups.length === 0 ? '请选择数据类型' : 
                         `开始导入 (${parsedData.length} 条)`}
                      </button>
                    </div>

                    {/* 详细导入进度展示 */}
                    {importing && hookProgress.global.totalRecords > 0 && (
                      <div className="mt-6 space-y-4">
                        {/* 全局进度概览 */}
                        <div className="card bg-base-200 shadow-sm">
                          <div className="card-body p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-lg font-semibold">导入进度总览</h3>
                              <div className="badge badge-info">
                                {utils?.getPhaseDescription(hookProgress.phase) || '处理中'}
                              </div>
                            </div>
                            
                            {/* 全局统计卡片 */}
                            <div className="stats stats-horizontal shadow">
                              <div className="stat">
                                <div className="stat-title">数据组</div>
                                <div className="stat-value text-sm">
                                  {hookProgress.global.processedGroups} / {hookProgress.global.totalGroups}
                                </div>
                                <div className="stat-desc">
                                  {hookProgress.global.dataGroups.join(', ')}
                                </div>
                              </div>
                              
                              <div className="stat">
                                <div className="stat-title">总记录数</div>
                                <div className="stat-value text-primary text-sm">
                                  {hookProgress.global.processedRecords} / {hookProgress.global.totalRecords}
                                </div>
                                <div className="stat-desc">
                                  {utils?.getProgressPercentage()}% 完成
                                </div>
                              </div>
                            </div>
                            
                            {/* 全局进度条 */}
                            <div className="mt-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span>总体进度</span>
                                <span>{utils?.getProgressPercentage()}%</span>
                              </div>
                              <progress 
                                className="progress progress-primary w-full" 
                                value={utils?.getProgressPercentage() || 0} 
                                max="100"
                              ></progress>
                            </div>
                          </div>
                        </div>

                        {/* 当前数据组详细进度 */}
                        {hookProgress.current.groupName && (
                          <div className="card bg-base-100 shadow-sm border border-primary/20">
                            <div className="card-body p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-primary">
                                  当前处理: {hookProgress.current.groupName}
                                </h4>
                                <div className="badge badge-outline">
                                  第 {hookProgress.current.groupIndex + 1} 组
                                </div>
                              </div>
                              
                              {/* 当前数据组统计 */}
                              <div className="stats stats-horizontal shadow-sm">
                                <div className="stat">
                                  <div className="stat-title text-xs">工作表</div>
                                  <div className="stat-value text-xs text-accent">
                                    {hookProgress.current.sheetName}
                                  </div>
                                </div>
                                
                                <div className="stat">
                                  <div className="stat-title text-xs">当前进度</div>
                                  <div className="stat-value text-xs text-secondary">
                                    {hookProgress.current.processedRecords} / {hookProgress.current.totalRecords}
                                  </div>
                                  <div className="stat-desc text-xs">
                                    {utils?.getCurrentGroupPercentage()}% 完成
                                  </div>
                                </div>
                              </div>
                              
                              {/* 当前数据组进度条 */}
                              <div className="mt-3">
                                <div className="flex justify-between text-xs mb-1">
                                  <span>当前工作表进度</span>
                                  <span>{utils?.getCurrentGroupPercentage()}%</span>
                                </div>
                                <progress 
                                  className="progress progress-secondary w-full h-2" 
                                  value={utils?.getCurrentGroupPercentage() || 0} 
                                  max="100"
                                ></progress>
                              </div>
                              
                              {/* 实时处理信息 */}
                              <div className="mt-2 text-xs text-base-content/70">
                                正在处理 {hookProgress.current.sheetName} 工作表中的数据...
                              </div>
                            </div>
                          </div>
                        )}
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
                disabled={importing || parseResult?.hasErrors}
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