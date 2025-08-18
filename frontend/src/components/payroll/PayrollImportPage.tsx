import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { HistoryDataExporter } from './HistoryDataExporter';
import { ImportDataGroup, ImportMode } from '@/types/payroll-import';
import type { ImportConfig, ExcelDataRow } from '@/types/payroll-import';
import { usePayrollImportExport } from '@/hooks/payroll/import-export';
import { DataGroupSelectorWithControls } from '@/components/common/DataGroupSelectorWithControls';
import { MonthPicker } from '@/components/common/MonthPicker';
import { useAvailablePayrollMonths, usePayrollPeriod } from '@/hooks/payroll';
import * as XLSX from 'xlsx';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { UploadIcon, FolderIcon, CheckCircleIcon, CloseIcon } from '@/components/common/Icons';
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
    isExporting
  } = usePayrollImportExport();
  const { data: availableMonths } = useAvailablePayrollMonths(true);
  const { actions: periodActions } = usePayrollPeriod();
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');

  // 辅助函数替代 utils 方法
  const getPhaseDescription = (phase: string) => {
    const phaseMap: Record<string, string> = {
      'idle': '准备中',
      'parsing': '解析文件',
      'validating': '验证数据',
      'importing': '导入数据',
      'creating_payrolls': '创建薪资记录',
      'inserting_items': '插入薪资项目',
      'completed': '完成',
      'error': '错误'
    };
    return phaseMap[phase] || '处理中';
  };

  const getProgressPercentage = () => {
    if (!hookProgress.global.totalRecords) return 0;
    return Math.round((hookProgress.global.processedRecords / hookProgress.global.totalRecords) * 100);
  };

  const getCurrentGroupPercentage = () => {
    if (!hookProgress.current.totalRecords) return 0;
    return Math.round((hookProgress.current.processedRecords / hookProgress.current.totalRecords) * 100);
  };
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
    totalEmployees: number;
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
                
                // 收集员工姓名或编号 - 更灵活的匹配
                if ((header === '员工姓名' || header === '姓名' || header === 'employee_name' || 
                     header.includes('员工') || header.includes('姓名') || header.includes('name')) && value) {
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
        
        // 从employeesBySheet收集员工
        Object.entries(employeesBySheet).forEach(([sheetName, employees]) => {
          employees.forEach(emp => {
            allEmployees.add(emp);
            if (!employeeSheetCount[emp]) {
              employeeSheetCount[emp] = [];
            }
            employeeSheetCount[emp].push(sheetName);
          });
        });
        
        // 如果employeesBySheet没有收集到员工，直接从allData中提取
        if (allEmployees.size === 0 && allData.length > 0) {
          allData.forEach(row => {
            const employeeName = row['员工姓名'] || row['姓名'] || row['employee_name'];
            if (employeeName && employeeName.trim()) {
              allEmployees.add(String(employeeName).trim());
            }
          });
        }
        
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
        
        // 查找重复的员工（仅在同一个sheet内检查重复）
        const duplicateEmployees: string[] = [];
        const duplicateDetails: { [sheet: string]: string[] } = {};
        
        // 按sheet分组数据
        const dataBySheet: { [sheet: string]: any[] } = {};
        allData.forEach(row => {
          const sheetName = row._sheetName;
          if (sheetName) {
            if (!dataBySheet[sheetName]) {
              dataBySheet[sheetName] = [];
            }
            dataBySheet[sheetName].push(row);
          }
        });
        
        // 在每个sheet内检查重复员工
        Object.entries(dataBySheet).forEach(([sheetName, rows]) => {
          const employeeCounts: { [name: string]: number } = {};
          rows.forEach((row: any) => {
            const name = row['员工姓名'] || row['姓名'] || row['employee_name'];
            if (name) {
              employeeCounts[name] = (employeeCounts[name] || 0) + 1;
            }
          });
          
          const sheetDuplicates = Object.entries(employeeCounts)
            .filter(([_, count]) => count > 1)
            .map(([name, _]) => name);
            
          if (sheetDuplicates.length > 0) {
            duplicateDetails[sheetName] = sheetDuplicates;
            duplicateEmployees.push(...sheetDuplicates);
          }
        });
        
        // 去重（如果同一个员工在多个sheet中都有重复）
        const uniqueDuplicateEmployees = [...new Set(duplicateEmployees)];
        
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
        if (uniqueDuplicateEmployees.length > 0) {
          const duplicateSheets = Object.keys(duplicateDetails);
          warnings.push(`在${duplicateSheets.length}个工作表中发现重复员工: ${uniqueDuplicateEmployees.slice(0, 5).join(', ')}${uniqueDuplicateEmployees.length > 5 ? '...' : ''}`);
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
          totalEmployees: allEmployees.size,
          duplicateEmployees: uniqueDuplicateEmployees,
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
            {/* 导入配置 - 高级专业设计 */}
            <div className="card bg-gradient-to-br from-base-100 via-base-100 to-base-100 shadow-2xl border border-base-300/50">
              <div className="card-body p-8">
                {/* 标题区域 */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-base-content bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      导入配置
                    </h2>
                    <p className="text-base-content/70 text-sm mt-1">
                      请完成以下配置以开始数据导入流程
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="badge badge-primary badge-lg font-medium">
                      步骤 1/3
                    </div>
                  </div>
                </div>

                {/* 配置步骤指示器 */}
                <div className="mb-8">
                  <ul className="steps steps-horizontal w-full">
                    <li className="step step-primary">基础配置</li>
                    <li className="step">上传文件</li>
                    <li className="step">执行导入</li>
                  </ul>
                </div>
                
                {/* 主要配置区域 */}
                <div className="space-y-8">
                  {/* 第一行：薪资周期和导入模式 */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* 薪资周期选择 */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-base-content">薪资周期</h3>
                          <p className="text-sm text-base-content/60">选择要导入数据的薪资周期</p>
                        </div>
                      </div>
                      
                      <div className="p-6 bg-base-200/50 rounded-xl border border-base-300/30">
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
                          className="select-bordered w-full select-lg"
                        />
                        <div className="mt-3 flex items-center gap-2 text-sm text-base-content/60">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          不能选择处理中或已完成状态的月份
                        </div>
                      </div>
                    </div>

                    {/* 导入模式 */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-base-content">导入模式</h3>
                          <p className="text-sm text-base-content/60">选择数据处理方式</p>
                        </div>
                      </div>
                      
                      <div className="p-6 bg-base-200/50 rounded-xl border border-base-300/30">
                        <select
                          className="select select-bordered w-full select-lg"
                          value={importConfig.mode}
                          onChange={(e) => setImportConfig(prev => ({
                            ...prev,
                            mode: e.target.value as ImportMode
                          }))}
                        >
                          <option value={ImportMode.UPSERT}>🔄 更新或创建（推荐）</option>
                          <option value={ImportMode.REPLACE}>🔄 替换现有数据</option>
                        </select>
                        <div className="mt-3 text-sm text-base-content/60">
                          {importConfig.mode === ImportMode.UPSERT && "智能处理：更新现有记录，创建新记录（推荐）"}
                          {importConfig.mode === ImportMode.REPLACE && "删除该周期的现有数据，然后插入新数据"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 数据类型选择区域 */}
                  <div className="space-y-6">
                    <DataGroupSelectorWithControls
                      selectedGroups={selectedDataGroups}
                      onGroupToggle={handleGroupToggle}
                      onSelectAll={handleSelectAllDataGroups}
                      title="数据类型选择"
                      subtitle="选择要导入的数据类型（可多选）"
                      className="mt-0"
                      iconColor="accent"
                      icon={
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      }
                    />
                      
                    {selectedDataGroups.length > 0 && (
                        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <svg className="w-5 h-5 text-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-primary">
                                已选择 {selectedDataGroups.length} 种数据类型
                              </p>
                              <p className="text-xs text-base-content/60 mt-1">
                                确保您的Excel文件包含对应的工作表，系统将自动验证文件结构
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>

                </div>

                {/* 配置状态指示 */}
                <div className="mt-8 p-6 bg-gradient-to-r from-success/5 to-success/10 rounded-xl border border-success/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-success">配置已完成</h4>
                        <p className="text-sm text-base-content/70">
                          {selectedDataGroups.length > 0 
                            ? `已配置 ${selectedDataGroups.length} 种数据类型，可以继续上传文件`
                            : '请至少选择一种数据类型后继续'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="badge badge-success badge-lg">
                        {selectedDataGroups.length > 0 ? '✓ 就绪' : '⚠ 待配置'}
                      </div>
                    </div>
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

                    {/* 解析结果详情 - 高级排版设计 */}
                    {parseResult && (
                      <div className="space-y-6">
                        {/* 状态概览卡片 */}
                        <div className="card bg-gradient-to-br from-base-100 to-base-200 shadow-xl border border-base-300">
                          <div className="card-body">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                    parseResult.hasErrors 
                                      ? 'bg-error/10 text-error' 
                                      : parseResult.warnings.length > 0 
                                        ? 'bg-warning/10 text-warning'
                                        : 'bg-success/10 text-success'
                                  }`}>
                                    {parseResult.hasErrors ? (
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                          d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    ) : parseResult.warnings.length > 0 ? (
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                      </svg>
                                    ) : (
                                      <CheckCircleIcon className="w-6 h-6" />
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold text-base-content">
                                    文件解析{parseResult.hasErrors ? '失败' : '成功'}
                                  </h3>
                                  <p className="text-base-content/70 text-sm mt-1">
                                    {parseResult.hasErrors 
                                      ? '发现错误，无法继续导入' 
                                      : parseResult.warnings.length > 0 
                                        ? `发现 ${parseResult.warnings.length} 个警告，可继续导入`
                                        : '文件格式正确，可以开始导入'
                                    }
                                  </p>
                                </div>
                              </div>
                              <div className={`badge badge-lg ${
                                parseResult.hasErrors 
                                  ? 'badge-error' 
                                  : parseResult.warnings.length > 0 
                                    ? 'badge-warning'
                                    : 'badge-success'
                              }`}>
                                {parseResult.hasErrors ? '❌ 错误' : parseResult.warnings.length > 0 ? '⚠️ 警告' : '✅ 正常'}
                              </div>
                            </div>

                            {/* 数据统计面板 */}
                            <div className="stats stats-horizontal shadow bg-base-100">
                              <div className="stat">
                                <div className="stat-figure text-secondary">
                                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div className="stat-title">工作表数量</div>
                                <div className="stat-value text-secondary">{parseResult.sheets.length}</div>
                                <div className="stat-desc">
                                  {parseResult.sheets.filter(s => s.hasData).length} 个有数据
                                </div>
                              </div>
                              
                              <div className="stat">
                                <div className="stat-figure text-primary">
                                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                </div>
                                <div className="stat-title">数据行数</div>
                                <div className="stat-value text-primary">{parseResult.totalRows}</div>
                                <div className="stat-desc">
                                  {parseResult.emptyRows > 0 && `跳过 ${parseResult.emptyRows} 空行`}
                                </div>
                              </div>
                              
                              <div className="stat">
                                <div className="stat-figure text-accent">
                                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                  </svg>
                                </div>
                                <div className="stat-title">员工数量</div>
                                <div className="stat-value text-accent">
                                  {parseResult.totalEmployees || '0'}
                                </div>
                                <div className="stat-desc">
                                  {parseResult.duplicateEmployees.length > 0 && 
                                    `${parseResult.duplicateEmployees.length} 个重复`
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 错误信息卡片 */}
                        {parseResult.hasErrors && (
                          <div className="card bg-error/5 border border-error/20 shadow-lg">
                            <div className="card-body">
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 bg-error/10 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-lg font-semibold text-error mb-3">发现严重错误</h4>
                                  <p className="text-base-content/70 mb-4 text-sm">
                                    以下错误必须修复后才能继续导入，请检查文件内容或重新选择正确的数据组。
                                  </p>
                                  <div className="space-y-2">
                                    {parseResult.errors.map((error, idx) => (
                                      <div key={idx} className="flex items-start gap-3 p-3 bg-base-100 rounded-lg border border-error/10">
                                        <span className="flex-shrink-0 w-5 h-5 bg-error text-error-content rounded-full flex items-center justify-center text-xs font-bold">
                                          {idx + 1}
                                        </span>
                                        <span className="text-sm text-base-content">{error}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 工作表详情和匹配状态 */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          {/* 工作表信息 */}
                          <div className="card bg-base-100 shadow-lg border border-base-300">
                            <div className="card-body">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-info/10 rounded-lg flex items-center justify-center">
                                  <svg className="w-4 h-4 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-base-content">工作表详情</h4>
                              </div>
                              
                              <div className="space-y-3">
                                {parseResult.sheets.map((sheet, idx) => (
                                  <div key={idx} className={`p-4 rounded-xl border transition-all ${
                                    sheet.isEmpty 
                                      ? 'bg-base-200 border-base-300 opacity-60' 
                                      : 'bg-gradient-to-r from-base-100 to-base-100 border-base-300 hover:shadow-sm'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${
                                          sheet.isEmpty ? 'bg-base-content/20' : 'bg-success'
                                        }`}></div>
                                        <span className={`font-medium ${sheet.isEmpty ? 'text-base-content/50' : 'text-base-content'}`}>
                                          {sheet.name}
                                        </span>
                                      </div>
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
                                    {sheet.hasData && sheet.headers.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-base-300">
                                        <div className="flex flex-wrap gap-1">
                                          {sheet.headers.slice(0, 3).map((header, hIdx) => (
                                            <span key={hIdx} className="badge badge-outline badge-xs">
                                              {header}
                                            </span>
                                          ))}
                                          {sheet.headers.length > 3 && (
                                            <span className="badge badge-ghost badge-xs">
                                              +{sheet.headers.length - 3} 更多
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* 匹配状态 */}
                          <div className="card bg-base-100 shadow-lg border border-base-300">
                            <div className="card-body">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                                  <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-base-content">匹配状态</h4>
                              </div>
                              
                              {selectedDataGroups.length === 0 ? (
                                <div className="flex items-center gap-3 p-4 bg-warning/10 rounded-xl border border-warning/20">
                                  <div className="w-6 h-6 bg-warning/20 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                  </div>
                                  <span className="text-sm text-warning font-medium">请先选择要导入的数据组</span>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="p-3 bg-base-200 rounded-lg">
                                    <p className="text-sm text-base-content/70 mb-2">
                                      根据选中的数据组，期望包含以下工作表：
                                    </p>
                                    <div className="text-sm font-medium text-base-content">
                                      {parseResult.expectedSheets.join(' • ')}
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <div>
                                      <h5 className="font-medium text-base-content mb-2">期望的工作表</h5>
                                      <div className="flex flex-wrap gap-2">
                                        {parseResult.expectedSheets.map(sheet => {
                                          const isMissing = parseResult.missingSheets.includes(sheet);
                                          return (
                                            <div key={sheet} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                                              isMissing 
                                                ? 'bg-error/5 border-error/20 text-error' 
                                                : 'bg-success/5 border-success/20 text-success'
                                            }`}>
                                              {isMissing ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                    d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                              ) : (
                                                <CheckCircleIcon className="w-4 h-4" />
                                              )}
                                              <span className="text-sm font-medium">{sheet}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    
                                    {parseResult.unexpectedSheets.filter(s => s !== '使用说明').length > 0 && (
                                      <div>
                                        <h5 className="font-medium text-base-content mb-2">意外的工作表</h5>
                                        <div className="flex flex-wrap gap-2">
                                          {parseResult.unexpectedSheets.filter(s => s !== '使用说明').map(sheet => (
                                            <div key={sheet} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-warning/5 border-warning/20 text-warning">
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                              <span className="text-sm font-medium">{sheet}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 数据一致性检查 */}
                        <div className="card bg-base-100 shadow-lg border border-base-300">
                          <div className="card-body">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                              </div>
                              <h4 className="text-lg font-semibold text-base-content">数据一致性检查</h4>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* 行数一致性 */}
                              <div className={`p-4 rounded-xl border transition-all ${
                                parseResult.dataConsistency.allSheetsHaveSameRowCount
                                  ? 'bg-success/5 border-success/20 hover:bg-success/10'
                                  : 'bg-warning/5 border-warning/20 hover:bg-warning/10'
                              }`}>
                                <div className="flex items-start gap-3">
                                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                    parseResult.dataConsistency.allSheetsHaveSameRowCount
                                      ? 'bg-success/10 text-success'
                                      : 'bg-warning/10 text-warning'
                                  }`}>
                                    {parseResult.dataConsistency.allSheetsHaveSameRowCount ? (
                                      <CheckCircleIcon className="w-4 h-4" />
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <h5 className={`font-semibold mb-1 ${
                                      parseResult.dataConsistency.allSheetsHaveSameRowCount ? 'text-success' : 'text-warning'
                                    }`}>
                                      行数一致性
                                    </h5>
                                    <p className="text-sm text-base-content/70 mb-2">
                                      {parseResult.dataConsistency.allSheetsHaveSameRowCount
                                        ? '所有工作表的数据行数保持一致'
                                        : '工作表之间存在行数差异'
                                      }
                                    </p>
                                    {!parseResult.dataConsistency.allSheetsHaveSameRowCount && (
                                      <div className="flex flex-wrap gap-1">
                                        {parseResult.dataConsistency.rowCountVariance.map((count, idx) => (
                                          <span key={idx} className="badge badge-warning badge-sm">
                                            {count} 行
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 员工数据完整性 */}
                              <div className={`p-4 rounded-xl border transition-all ${
                                parseResult.dataConsistency.employeeListConsistent
                                  ? 'bg-success/5 border-success/20 hover:bg-success/10'
                                  : 'bg-warning/5 border-warning/20 hover:bg-warning/10'
                              }`}>
                                <div className="flex items-start gap-3">
                                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                    parseResult.dataConsistency.employeeListConsistent
                                      ? 'bg-success/10 text-success'
                                      : 'bg-warning/10 text-warning'
                                  }`}>
                                    {parseResult.dataConsistency.employeeListConsistent ? (
                                      <CheckCircleIcon className="w-4 h-4" />
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <h5 className={`font-semibold mb-1 ${
                                      parseResult.dataConsistency.employeeListConsistent ? 'text-success' : 'text-warning'
                                    }`}>
                                      员工数据完整性
                                    </h5>
                                    <p className="text-sm text-base-content/70 mb-2">
                                      {parseResult.dataConsistency.employeeListConsistent
                                        ? '所有员工在各工作表中数据完整'
                                        : `${parseResult.dataConsistency.missingInSheets.length} 个员工数据不完整`
                                      }
                                    </p>
                                    {!parseResult.dataConsistency.employeeListConsistent && (
                                      <div className="text-xs text-base-content/60">
                                        部分员工未在所有必需的工作表中出现
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 警告信息 */}
                        {parseResult.warnings.length > 0 && (
                          <div className="card bg-warning/5 border border-warning/20 shadow-lg">
                            <div className="card-body">
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-lg font-semibold text-warning mb-3">注意事项</h4>
                                  <p className="text-base-content/70 mb-4 text-sm">
                                    发现 {parseResult.warnings.length} 个潜在问题，建议检查后再导入，或者在导入时选择"跳过无效行"选项。
                                  </p>
                                  <div className="space-y-2">
                                    {parseResult.warnings.map((warning, idx) => (
                                      <div key={idx} className="flex items-start gap-3 p-3 bg-base-100 rounded-lg border border-warning/10">
                                        <span className="flex-shrink-0 w-5 h-5 bg-warning text-warning-content rounded-full flex items-center justify-center text-xs font-bold">
                                          {idx + 1}
                                        </span>
                                        <span className="text-sm text-base-content">{warning}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 数据预览 - 按Sheet分Tab显示 */}
                    {parsedData.length > 0 && parseResult && (
                      <div className="card bg-base-200">
                        <div className="card-body">
                          <h3 className="card-title text-base">数据预览（按工作表）</h3>
                          
                          {/* Sheet Tab导航 */}
                          <div className="tabs tabs-bordered">
                            {parseResult.sheets
                              .filter(sheet => sheet.name !== '使用说明' && sheet.hasData)
                              .map((sheet, index) => (
                                <React.Fragment key={sheet.name}>
                                  <input
                                    type="radio"
                                    name="data_preview_tabs"
                                    className="tab"
                                    aria-label={`${sheet.name} (${sheet.rowCount}行)`}
                                    defaultChecked={index === 0}
                                  />
                                  <div className="tab-content bg-base-100 border-base-300 rounded-box p-6">
                                    <div className="flex items-center justify-between mb-4">
                                      <div>
                                        <h4 className="font-semibold">{sheet.name}</h4>
                                        <p className="text-sm text-base-content/60">
                                          {sheet.rowCount} 行数据，{sheet.columnCount} 列
                                        </p>
                                      </div>
                                      <div className="badge badge-primary">
                                        前5行预览
                                      </div>
                                    </div>
                                    
                                    <div className="overflow-x-auto">
                                      <table className="table table-zebra table-sm">
                                        <thead>
                                          <tr>
                                            <th>行号</th>
                                            {sheet.headers.slice(0, 6).map(header => (
                                              <th key={header} className="min-w-24">
                                                {header}
                                              </th>
                                            ))}
                                            {sheet.headers.length > 6 && (
                                              <th>更多字段</th>
                                            )}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {parsedData
                                            .filter(row => row._sheetName === sheet.name)
                                            .slice(0, 5)
                                            .map((row, rowIndex) => (
                                              <tr key={rowIndex}>
                                                <td>{row.rowNumber}</td>
                                                {sheet.headers.slice(0, 6).map(header => (
                                                  <td key={header} className="max-w-32 truncate">
                                                    {header === '身份证号' && row[header] 
                                                      ? '****' + String(row[header]).slice(-4)
                                                      : (row[header] || '-')
                                                    }
                                                  </td>
                                                ))}
                                                {sheet.headers.length > 6 && (
                                                  <td>
                                                    <span className="badge badge-ghost badge-sm">
                                                      +{sheet.headers.length - 6} 列
                                                    </span>
                                                  </td>
                                                )}
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    
                                    {parsedData.filter(row => row._sheetName === sheet.name).length > 5 && (
                                      <div className="text-sm text-base-content/60 mt-2">
                                        还有 {parsedData.filter(row => row._sheetName === sheet.name).length - 5} 行未显示...
                                      </div>
                                    )}
                                  </div>
                                </React.Fragment>
                              ))}
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
                                {getPhaseDescription(hookProgress.phase)}
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
                                  {getProgressPercentage()}% 完成
                                </div>
                              </div>
                            </div>
                            
                            {/* 全局进度条 */}
                            <div className="mt-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span>总体进度</span>
                                <span>{getProgressPercentage()}%</span>
                              </div>
                              <progress 
                                className="progress progress-primary w-full" 
                                value={getProgressPercentage()} 
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
                                    {getCurrentGroupPercentage()}% 完成
                                  </div>
                                </div>
                              </div>
                              
                              {/* 当前数据组进度条 */}
                              <div className="mt-3">
                                <div className="flex justify-between text-xs mb-1">
                                  <span>当前工作表进度</span>
                                  <span>{getCurrentGroupPercentage()}%</span>
                                </div>
                                <progress 
                                  className="progress progress-secondary w-full h-2" 
                                  value={getCurrentGroupPercentage()} 
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
          aria-label="导出数据"
          checked={activeTab === 'export'}
          onChange={() => setActiveTab('export')}
        />
        <div className="tab-content border-base-300 bg-base-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <FolderIcon className="w-5 h-5" />
            <h2 className="text-xl font-semibold">导出数据</h2>
          </div>
          <div className="flex flex-col gap-6">
            {/* 导出配置 - 高级专业设计 */}
            <div className="card bg-gradient-to-br from-base-100 via-base-100 to-base-100 shadow-2xl border border-base-300/50">
              <div className="card-body p-8">
                {/* 标题区域 */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-base-content bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      导出配置
                    </h2>
                    <p className="text-base-content/70 text-sm mt-1">
                      选择要导出的数据类型和格式选项
                    </p>
                  </div>
                </div>
                
                {/* 导出器组件 */}
                <HistoryDataExporter />
              </div>
            </div>
          </div>
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
                  {importConfig.mode === ImportMode.UPSERT ? '更新或创建' : 
                   importConfig.mode === ImportMode.REPLACE ? '替换模式' : '未知'}
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
                <div className="text-sm mt-1">
                  导入前验证已启用，将自动验证数据格式和完整性
                </div>
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