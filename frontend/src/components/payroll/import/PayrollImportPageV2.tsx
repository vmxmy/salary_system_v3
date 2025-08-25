/**
 * PayrollImportPageV2 - 基于验证成功的测试套件构建的新版薪资导入页面
 * 
 * 基于DataTypeTestSuite的成功模式，提供简洁高效的导入体验
 * 支持4种数据类型：earnings, bases, category, job
 */

import React, { useState, useCallback } from 'react';
import { ImportDataGroup } from '@/types/payroll-import';
import type { ImportMode } from '@/hooks/payroll/import-export/types';
import { usePayrollImportExport } from '@/hooks/payroll/import-export';
import { MonthSelector } from './components/config/MonthSelector';
import { useAvailablePayrollMonths } from '@/hooks/payroll/useAvailablePayrollMonths';
import { ImportProgressBar } from './components/common/ImportProgressBar';
import { getExcelSheetNames, parseMultiSheetExcelFile } from '@/hooks/payroll/import-export/utils/excel-parser';
import { EXCEL_PARSING_CONSTANTS } from '@/hooks/payroll/import-export/constants';

/**
 * 数据组配置接口
 */
interface DataGroupConfig {
  dataGroup: ImportDataGroup;
  name: string;
  description: string;
  icon: string;
  expectedColumns: string[];
  defaultImportMode: ImportMode;
  color: string;
  bgColor: string;
}

/**
 * 支持的数据组配置
 */
const DATA_GROUP_CONFIGS: DataGroupConfig[] = [
  {
    dataGroup: ImportDataGroup.EARNINGS,
    name: '薪资项目导入',
    description: '导入薪资明细数据（基本工资、奖金、补贴、扣款等）',
    icon: '💰',
    expectedColumns: ['员工姓名', '基本工资', '岗位工资', '绩效奖金', '加班费', '交通补贴'],
    defaultImportMode: 'upsert',
    color: 'text-success',
    bgColor: 'bg-success/10'
  },
  {
    dataGroup: ImportDataGroup.CONTRIBUTION_BASES,
    name: '缴费基数导入',
    description: '导入社保公积金缴费基数数据',
    icon: '🏦',
    expectedColumns: ['员工姓名', '养老保险基数', '医疗保险基数', '失业保险基数', '工伤保险基数', '生育保险基数', '住房公积金基数'],
    defaultImportMode: 'replace',
    color: 'text-info',
    bgColor: 'bg-info/10'
  },
  {
    dataGroup: ImportDataGroup.CATEGORY_ASSIGNMENT,
    name: '人员类别导入',
    description: '导入员工人员类别分配数据（在编、合同工等）',
    icon: '👥',
    expectedColumns: ['员工姓名', '人员类别'],
    defaultImportMode: 'upsert',
    color: 'text-warning',
    bgColor: 'bg-warning/10'
  },
  {
    dataGroup: ImportDataGroup.JOB_ASSIGNMENT,
    name: '职务信息导入',
    description: '导入员工部门职位分配数据',
    icon: '🏢',
    expectedColumns: ['员工姓名', '部门', '职位'],
    defaultImportMode: 'upsert',
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  }
];

/**
 * 导入步骤常量对象（替代枚举以兼容 erasableSyntaxOnly）
 */
const ImportStep = {
  SELECT_MONTH: 'SELECT_MONTH',
  SELECT_DATA_TYPE: 'SELECT_DATA_TYPE', 
  UPLOAD_FILE: 'UPLOAD_FILE',
  CONFIGURE_IMPORT: 'CONFIGURE_IMPORT',
  CONFIRM_AND_IMPORT: 'CONFIRM_AND_IMPORT',
  VIEW_RESULTS: 'VIEW_RESULTS'
} as const;

type ImportStep = typeof ImportStep[keyof typeof ImportStep];

/**
 * 步骤配置接口
 */
interface StepConfig {
  step: ImportStep;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  active: boolean;
}

/**
 * 薪资导入页面V2组件 - 引导式分步骤版本
 */
// Extended file storage type to support both individual files and sheet mapping
interface FileStorage {
  main?: File;
  sheets?: Record<string, {
    sheetName: string;
    rowCount: number;
    columns: string[];
    data: any[];
  }>;
  [key: string]: File | any; // For backward compatibility
}

export const PayrollImportPageV2: React.FC = () => {
  // 状态管理
  const [currentStep, setCurrentStep] = useState<ImportStep>(ImportStep.SELECT_MONTH);
  const [selectedDataGroups, setSelectedDataGroups] = useState<DataGroupConfig[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileStorage>({});
  const [importMode, setImportMode] = useState<ImportMode>('upsert');
  const [selectedMonth, setSelectedMonth] = useState<string>('2025-01');
  const [importResults, setImportResults] = useState<Record<string, any>>({});

  // Hooks
  const importHook = usePayrollImportExport();
  const { data: availableMonths, isLoading: isLoadingMonths, error: monthsError } = useAvailablePayrollMonths();

  /**
   * 生成步骤配置
   */
  const getStepConfigs = useCallback((): StepConfig[] => {
    return [
      {
        step: ImportStep.SELECT_MONTH,
        title: '选择导入月份',
        description: '选择要导入数据的薪资周期',
        icon: '📅',
        completed: !!selectedMonth && (availableMonths?.some(m => m.month === selectedMonth) ?? false),
        active: currentStep === ImportStep.SELECT_MONTH
      },
      {
        step: ImportStep.SELECT_DATA_TYPE,
        title: '选择数据类型',
        description: '选择要导入的数据类型',
        icon: '🎯',
        completed: selectedDataGroups.length > 0,
        active: currentStep === ImportStep.SELECT_DATA_TYPE
      },
      {
        step: ImportStep.UPLOAD_FILE,
        title: '上传文件',
        description: '选择Excel文件并验证格式',
        icon: '📁',
        completed: selectedDataGroups.length > 0 && !!selectedFiles.main && !!selectedFiles.sheets && selectedDataGroups.every(group => !!selectedFiles.sheets?.[group.dataGroup]?.sheetName),
        active: currentStep === ImportStep.UPLOAD_FILE
      },
      {
        step: ImportStep.CONFIGURE_IMPORT,
        title: '配置导入',
        description: '设置导入模式和参数',
        icon: '⚙️',
        completed: selectedDataGroups.length > 0 && !!selectedFiles.main && !!selectedFiles.sheets && selectedDataGroups.every(group => !!selectedFiles.sheets?.[group.dataGroup]?.sheetName) && !!importMode,
        active: currentStep === ImportStep.CONFIGURE_IMPORT
      },
      {
        step: ImportStep.CONFIRM_AND_IMPORT,
        title: '确认并导入',
        description: '检查设置并执行导入操作',
        icon: '🚀',
        completed: selectedDataGroups.length > 0 && selectedDataGroups.every(group => !!importResults[group.dataGroup]),
        active: currentStep === ImportStep.CONFIRM_AND_IMPORT
      },
      {
        step: ImportStep.VIEW_RESULTS,
        title: '查看结果',
        description: '查看导入结果和错误信息',
        icon: '📊',
        completed: selectedDataGroups.some(group => !!importResults[group.dataGroup]),
        active: currentStep === ImportStep.VIEW_RESULTS
      }
    ];
  }, [currentStep, selectedMonth, availableMonths, selectedDataGroups, selectedFiles, importMode, importResults]);

  /**
   * 步骤导航方法
   */
  const goToNextStep = useCallback(() => {
    const steps = Object.values(ImportStep);
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  }, [currentStep]);

  const goToPreviousStep = useCallback(() => {
    const steps = Object.values(ImportStep);
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: ImportStep) => {
    setCurrentStep(step);
  }, []);

  /**
   * 验证当前步骤是否可以继续
   */
  const canProceedToNextStep = useCallback((): boolean => {
    switch (currentStep) {
      case ImportStep.SELECT_MONTH:
        return !!selectedMonth && (availableMonths?.some(m => m.month === selectedMonth) ?? false);
      case ImportStep.SELECT_DATA_TYPE:
        return selectedDataGroups.length > 0;
      case ImportStep.UPLOAD_FILE:
        return selectedDataGroups.length > 0 && !!selectedFiles.main && !!selectedFiles.sheets && selectedDataGroups.every(group => !!selectedFiles.sheets?.[group.dataGroup]?.sheetName);
      case ImportStep.CONFIGURE_IMPORT:
        return selectedDataGroups.length > 0 && !!selectedFiles.main && !!selectedFiles.sheets && selectedDataGroups.every(group => !!selectedFiles.sheets?.[group.dataGroup]?.sheetName) && !!importMode;
      case ImportStep.CONFIRM_AND_IMPORT:
        return !importHook.isImporting;
      default:
        return false;
    }
  }, [currentStep, selectedMonth, availableMonths, selectedDataGroups, selectedFiles, importMode, importHook.isImporting]);

  /**
   * 处理数据组多选
   */
  const handleDataGroupToggle = useCallback((config: DataGroupConfig) => {
    setSelectedDataGroups(prev => {
      const isSelected = prev.some(group => group.dataGroup === config.dataGroup);
      if (isSelected) {
        // 取消选择
        return prev.filter(group => group.dataGroup !== config.dataGroup);
      } else {
        // 添加选择
        return [...prev, config];
      }
    });
    
    // 设置默认导入模式（使用第一个选中项的模式）
    if (selectedDataGroups.length === 0) {
      setImportMode(config.defaultImportMode);
    }
  }, [selectedDataGroups]);

  /**
   * 全选/取消全选数据类型
   */
  const handleSelectAllDataGroups = useCallback((selectAll: boolean) => {
    if (selectAll) {
      setSelectedDataGroups([...DATA_GROUP_CONFIGS]);
      setImportMode('upsert'); // 全选时使用通用模式
    } else {
      setSelectedDataGroups([]);
    }
  }, []);

  /**
   * 确认数据类型选择
   */
  const handleConfirmDataGroupSelection = useCallback(() => {
    if (selectedDataGroups.length > 0) {
      goToNextStep();
    }
  }, [selectedDataGroups, goToNextStep]);

  /**
   * 获取数据组对应的期望工作表名称
   */
  const getExpectedSheetNames = useCallback((dataGroup: ImportDataGroup): string[] => {
    switch (dataGroup) {
      case ImportDataGroup.EARNINGS:
        return [...EXCEL_PARSING_CONSTANTS.SHEET_NAMES.PAYROLL_ITEMS];
      case ImportDataGroup.CONTRIBUTION_BASES:
        return [...EXCEL_PARSING_CONSTANTS.SHEET_NAMES.CONTRIBUTION_BASES];
      case ImportDataGroup.CATEGORY_ASSIGNMENT:
        return [...EXCEL_PARSING_CONSTANTS.SHEET_NAMES.CATEGORY_ASSIGNMENTS];
      case ImportDataGroup.JOB_ASSIGNMENT:
        return [...EXCEL_PARSING_CONSTANTS.SHEET_NAMES.JOB_ASSIGNMENTS];
      default:
        return [];
    }
  }, []);

  /**
   * 查找工作表名称与数据组的最佳匹配
   */
  const findBestSheetMatch = useCallback((sheetNames: string[], dataGroup: ImportDataGroup): string | null => {
    const expectedNames = getExpectedSheetNames(dataGroup);
    
    // 1. 精确匹配
    for (const sheetName of sheetNames) {
      if (expectedNames.includes(sheetName)) {
        return sheetName;
      }
    }
    
    // 2. 包含匹配
    for (const sheetName of sheetNames) {
      for (const expectedName of expectedNames) {
        if (sheetName.includes(expectedName) || expectedName.includes(sheetName)) {
          return sheetName;
        }
      }
    }
    
    return null;
  }, [getExpectedSheetNames]);

  /**
   * 处理单个Excel文件上传（包含多个工作表）
   */
  const handleSingleExcelUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.log('📁 开始解析多工作表Excel文件:', file.name);
      
      // 保存主文件
      setSelectedFiles(prev => ({
        ...prev,
        main: file
      }));

      // 获取所有工作表名称
      const sheetNames = await getExcelSheetNames(file);
      console.log('📋 检测到工作表:', sheetNames);

      // 解析所有工作表数据
      const allSheetData = await parseMultiSheetExcelFile(file);

      // 为每个选中的数据组尝试匹配工作表
      const sheetMappings: Record<string, any> = {};
      
      for (const dataGroup of selectedDataGroups) {
        const bestMatch = findBestSheetMatch(sheetNames, dataGroup.dataGroup);
        
        if (bestMatch && allSheetData[bestMatch]) {
          const sheetData = allSheetData[bestMatch];
          sheetMappings[dataGroup.dataGroup] = {
            sheetName: bestMatch,
            rowCount: sheetData.length,
            columns: sheetData.length > 0 ? Object.keys(sheetData[0]) : [],
            data: sheetData
          };
          
          console.log(`✅ 数据组 "${dataGroup.name}" 映射到工作表 "${bestMatch}" (${sheetData.length} 行)`);
        } else {
          console.warn(`⚠️ 数据组 "${dataGroup.name}" 未找到匹配的工作表`);
          sheetMappings[dataGroup.dataGroup] = {
            sheetName: null,
            rowCount: 0,
            columns: [],
            data: []
          };
        }
      }

      // 保存工作表映射结果
      setSelectedFiles(prev => ({
        ...prev,
        sheets: sheetMappings
      }));

      // 不再自动跳转，让用户手动确认后进入下一步

    } catch (error) {
      console.error('❌ 解析Excel文件失败:', error);
      alert(`解析Excel文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [selectedDataGroups, findBestSheetMatch, currentStep, goToNextStep]);

  /**
   * 清除主文件
   */
  const clearMainFile = useCallback(() => {
    setSelectedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles['main'];
      delete newFiles['sheets'];
      return newFiles;
    });
    
    // 清理文件输入框
    const fileInput = document.getElementById('multi-sheet-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  /**
   * 旧的文件上传处理函数（保持兼容性）
   */
  const handleFileUpload = useCallback((dataGroup: string, file: File | null) => {
    if (file) {
      setSelectedFiles(prev => ({
        ...prev,
        [dataGroup]: file
      }));
      
      console.log(`📄 上传文件 [${dataGroup}]:`, {
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type || '未知'
      });
      
      // 自动进入下一步
      if (currentStep === ImportStep.UPLOAD_FILE) {
        goToNextStep();
      }
    }
  }, [currentStep, goToNextStep]);

  /**
   * 清除文件
   */
  const clearFile = useCallback((dataGroup: string) => {
    setSelectedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[dataGroup];
      return newFiles;
    });
    
    // 清理文件输入框
    const fileInput = document.getElementById(`file-${dataGroup}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  /**
   * 执行导入操作 - 支持多数据组批量导入
   */
  const handleImport = useCallback(async () => {
    if (selectedDataGroups.length === 0) {
      alert('请至少选择一个数据类型');
      return;
    }

    // 检查所有选中的数据组都有对应的工作表数据
    const missingSheets = selectedDataGroups.filter(
      group => !selectedFiles.sheets?.[group.dataGroup]?.sheetName
    );
    
    if (missingSheets.length > 0) {
      alert(`以下数据类型缺少对应的工作表: ${missingSheets.map(g => g.name).join(', ')}`);
      return;
    }

    console.log(`🚀 开始批量导入 ${selectedDataGroups.length} 个数据类型`, {
      dataGroups: selectedDataGroups.map(g => g.name),
      importMode,
      selectedMonth
    });

    try {
      // 获取选中月份的周期ID
      const selectedMonthData = availableMonths?.find(m => m.month === selectedMonth);
      const periodId = selectedMonthData?.periodId;
      
      if (!periodId) {
        throw new Error(`未找到月份 ${selectedMonth} 对应的薪资周期ID`);
      }

      // 构建日期范围
      const [year, month] = selectedMonth.split('-').map(Number);
      const payPeriodStart = new Date(year, month - 1, 1);
      const payPeriodEnd = new Date(year, month, 0);

      // 依次执行每个数据组的导入（使用工作表数据）
      for (const dataGroup of selectedDataGroups) {
        const sheetData = selectedFiles.sheets?.[dataGroup.dataGroup];
        const mainFile = selectedFiles.main;
        
        if (!sheetData?.sheetName || !sheetData?.data || !mainFile) {
          console.error(`❌ ${dataGroup.name} 缺少工作表数据或主文件`);
          continue;
        }
        
        console.log(`📁 导入 ${dataGroup.name} (工作表: ${sheetData.sheetName})...`);
        
        try {
          // 创建一个虚拟的File对象，包含该工作表的数据
          // 注意：这里我们仍然需要传递原始文件，让解析器根据数据组自动选择工作表
          const result = await importHook.importExcel.mutateAsync({
            file: mainFile,
            config: {
              dataGroup: dataGroup.dataGroup,
              mode: importMode,
              payPeriod: {
                start: payPeriodStart,
                end: payPeriodEnd
              },
              options: {
                validateBeforeImport: true,
                skipInvalidRows: false
              }
            },
            periodId
          });

          console.log(`✅ ${dataGroup.name} 导入完成:`, {
            success: result.success,
            totalRows: result.totalRows,
            successCount: result.successCount,
            failedCount: result.failedCount,
            errorCount: result.errors?.length || 0,
            sheetName: sheetData.sheetName
          });

          // 保存成功结果
          setImportResults(prev => ({
            ...prev,
            [dataGroup.dataGroup]: {
              ...result,
              timestamp: new Date().toISOString(),
              dataGroupName: dataGroup.name,
              sheetName: sheetData.sheetName
            }
          }));

        } catch (error) {
          console.error(`❌ ${dataGroup.name} 导入失败:`, error);
          
          // 保存失败结果
          setImportResults(prev => ({
            ...prev,
            [dataGroup.dataGroup]: {
              success: false,
              error: error instanceof Error ? error.message : '未知错误',
              timestamp: new Date().toISOString(),
              dataGroupName: dataGroup.name,
              sheetName: sheetData.sheetName,
              totalRows: sheetData.rowCount || 0,
              successCount: 0,
              failedCount: sheetData.rowCount || 0
            }
          }));
        }
      }

      // 导入完成后跳转到结果页面
      setCurrentStep(ImportStep.VIEW_RESULTS);

    } catch (error) {
      console.error('❌ 批量导入失败:', error);
      alert(`❌ 导入过程发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [selectedDataGroups, selectedFiles, importMode, selectedMonth, availableMonths, importHook]);

  /**
   * 获取所有选中数据组的导入结果
   */
  const getAllResults = () => {
    return selectedDataGroups.map(group => ({
      ...group,
      result: importResults[group.dataGroup] || null
    }));
  };

  /**
   * 获取导入结果统计
   */
  const getResultsStats = () => {
    const results = getAllResults();
    const total = results.length;
    const completed = results.filter(r => r.result !== null).length;
    const successful = results.filter(r => r.result?.success === true).length;
    const failed = results.filter(r => r.result?.success === false).length;
    
    return { total, completed, successful, failed };
  };


  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case ImportStep.SELECT_MONTH:
        return renderSelectMonthStep();
      case ImportStep.SELECT_DATA_TYPE:
        return renderSelectDataTypeStep();
      case ImportStep.UPLOAD_FILE:
        return renderUploadFileStep();
      case ImportStep.CONFIGURE_IMPORT:
        return renderConfigureImportStep();
      case ImportStep.CONFIRM_AND_IMPORT:
        return renderConfirmAndImportStep();
      case ImportStep.VIEW_RESULTS:
        return renderViewResultsStep();
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 - 标准格式 */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-base-content">薪资数据导入中心</h1>
        <p className="text-base-content/70 mt-2">
          引导式分步骤导入流程，支持4种数据类型的批量导入
        </p>
        <div className="mt-3">
          <div className="badge badge-success">
            基于验证成功的导入引擎
          </div>
        </div>
      </header>

      {/* 主体布局：垂直排列 */}
      <div className="space-y-6">
        {/* 步骤详情区域 - 合并步骤导航和内容 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {/* 步骤导航 */}
            <div className="mb-6">
              <div className="w-full flex justify-center overflow-x-auto">
                <ul className="steps steps-vertical sm:steps-horizontal w-full max-w-4xl">
                  {getStepConfigs().map((stepConfig, index) => (
                    <li 
                      key={stepConfig.step} 
                      className={`step flex-1 ${stepConfig.completed ? 'step-primary' : ''} ${stepConfig.active ? 'step-accent' : ''}`}
                    >
                      <div className="flex flex-col items-center gap-1 px-2">
                        <span className="text-lg">{stepConfig.icon}</span>
                        <span className="text-xs sm:block text-center leading-tight">{stepConfig.title}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* 当前步骤信息 */}
              <div className="text-center mt-4">
                <h3 className="text-lg font-semibold">
                  {getStepConfigs().find(s => s.active)?.title}
                </h3>
                <p className="text-sm text-base-content/70 mt-1">
                  {getStepConfigs().find(s => s.active)?.description}
                </p>
              </div>
            </div>
            
            {/* 步骤内容 */}
            <div>
              {renderStepContent()}
            </div>
          </div>
        </div>

        {/* 操作按钮区域 - 移到最下方 */}
        <div>
          {renderStepActions()}
        </div>
      </div>
    </div>
  );

  // ========== 步骤渲染方法 ==========

  /**
   * 步骤1: 选择月份
   */
  function renderSelectMonthStep() {
    return (
      <div className="border-t pt-6">
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={(month) => {
            setSelectedMonth(month);
          }}
          availableMonths={availableMonths}
          loading={isLoadingMonths}
          error={monthsError?.message || null}
          showDataIndicators={true}
          showCompletenessIndicators={true}
        />
      </div>
    );
  }

  /**
   * 步骤2: 选择数据类型（支持多选）
   */
  function renderSelectDataTypeStep() {
    const isAllSelected = selectedDataGroups.length === DATA_GROUP_CONFIGS.length;
    const hasSelection = selectedDataGroups.length > 0;
    
    return (
      <div className="border-t pt-6">
        <div>
          {/* 全选控制和提示 */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text mr-2">全选</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAllDataGroups(e.target.checked)}
                  />
                </label>
              </div>
              
              {hasSelection && (
                <div className="badge badge-primary">
                  已选择 {selectedDataGroups.length} 项
                </div>
              )}
            </div>
          </div>

          {/* 数据类型选择卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {DATA_GROUP_CONFIGS.map(config => {
              const isSelected = selectedDataGroups.some(group => group.dataGroup === config.dataGroup);
              
              return (
                <div
                  key={config.dataGroup}
                  className={`card cursor-pointer transition-all border-2 ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : 'border-base-300 bg-base-200 hover:bg-base-300 hover:border-primary/50'
                  }`}
                  onClick={() => handleDataGroupToggle(config)}
                >
                  <div className="card-body items-center text-center relative">
                    {/* 选中状态复选框 */}
                    <div className="absolute top-2 right-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-sm"
                        checked={isSelected}
                        onChange={() => {}} // 由父元素的onClick处理
                        onClick={(e) => e.stopPropagation()} // 防止重复触发
                      />
                    </div>
                    
                    <div className="text-3xl mb-2">{config.icon}</div>
                    <h3 className="card-title text-sm">{config.name}</h3>
                    <p className="text-xs opacity-70 mb-2">{config.description}</p>
                    
                    <div className="flex flex-wrap gap-1 justify-center mb-2">
                      {config.expectedColumns.slice(0, 2).map((col, index) => (
                        <div key={index} className="badge badge-outline badge-xs">
                          {col}
                        </div>
                      ))}
                      {config.expectedColumns.length > 2 && (
                        <div className="badge badge-outline badge-xs">+{config.expectedColumns.length - 2}</div>
                      )}
                    </div>
                    
                    <div className={`badge badge-sm ${isSelected ? 'badge-success' : 'badge-ghost'}`}>
                      {isSelected ? '✓ 已选择' : '点击选择'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
        </div>
      </div>
    );
  }

  /**
   * 步骤3: 上传Excel文件（单文件多sheet模式）
   */
  function renderUploadFileStep() {
    if (selectedDataGroups.length === 0) return null;

    const hasMainFile = !!selectedFiles.main;
    const hasSheetData = !!selectedFiles.sheets;

    return (
      <div className="border-t pt-6 space-y-6">
        {/* 单文件上传说明 */}
        <div className="p-6 bg-base-50 rounded-lg border">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">上传Excel文件</h3>
                <p className="text-sm text-base-content/70">
                  上传包含多个工作表的Excel文件，系统将自动识别并映射各数据类型
                </p>
              </div>
              <div className={`badge ${hasMainFile ? 'badge-success' : 'badge-warning'}`}>
                {hasMainFile ? '✓ 已上传' : '等待上传'}
              </div>
            </div>
            

            {/* 文件上传区域 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">选择包含多个工作表的Excel文件</span>
                <span className="label-text-alt">支持 .xlsx, .xls</span>
              </label>
              <input
                id="multi-sheet-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleSingleExcelUpload}
                className="file-input file-input-bordered file-input-primary w-full"
              />
            </div>

            {/* 上传成功信息 */}
            {hasMainFile && selectedFiles.main && (
              <div className="alert alert-success mt-4">
                <div className="flex justify-between items-center w-full">
                  <div>
                    <span className="font-medium">
                      {selectedFiles.main.name}
                    </span>
                    <div className="text-sm opacity-70">
                      文件大小: {(selectedFiles.main.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={clearMainFile}
                  >
                    重新选择
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 工作表预览和映射结果 */}
        {hasMainFile && hasSheetData && (
          <div className="p-6 bg-base-50 rounded-lg border">
            <div>
              <h3 className="text-lg font-semibold mb-4">📊 工作表检测结果</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {selectedDataGroups.map(group => {
                  const sheetMapping = selectedFiles.sheets?.[group.dataGroup];
                  const hasValidSheet = !!sheetMapping?.sheetName;
                  
                  return (
                    <div 
                      key={group.dataGroup} 
                      className={`card border-2 ${
                        hasValidSheet 
                          ? 'border-success bg-success/5' 
                          : 'border-warning bg-warning/5'
                      }`}
                    >
                      <div className="card-body">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-xl">{group.icon}</span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{group.name}</h4>
                            <p className="text-xs opacity-70">{group.description}</p>
                          </div>
                          <div className={`badge ${hasValidSheet ? 'badge-success' : 'badge-warning'}`}>
                            {hasValidSheet ? '✓ 找到' : '⚠️ 未找到'}
                          </div>
                        </div>
                        
                        {hasValidSheet ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="badge badge-primary badge-sm">工作表</span>
                              <span className="text-sm font-medium">{sheetMapping.sheetName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="badge badge-info badge-sm">数据行数</span>
                              <span className="text-sm">{sheetMapping.rowCount || 0} 行</span>
                            </div>
                            {sheetMapping.columns && sheetMapping.columns.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs opacity-70 mb-1">提取到的列:</div>
                                <div className="flex flex-wrap gap-1">
                                  {sheetMapping.columns.slice(0, 10).map((col: string, index: number) => (
                                    <div key={index} className="badge badge-outline badge-xs">
                                      {col}
                                    </div>
                                  ))}
                                  {sheetMapping.columns.length > 10 && (
                                    <div className="badge badge-outline badge-xs">
                                      +{sheetMapping.columns.length - 10}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs opacity-70">
                            未找到匹配的工作表，期望名称包含: {getExpectedSheetNames(group.dataGroup).slice(0, 2).join('、')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* 操作提示 */}
              <div className="mt-4">
                {selectedDataGroups.every(group => selectedFiles.sheets?.[group.dataGroup]?.sheetName) ? (
                  <div className="alert alert-success">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>所有必需的工作表都已找到，可以进入下一步进行配置！</span>
                  </div>
                ) : (
                  <div className="alert alert-warning">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <span className="font-semibold">部分工作表未找到</span>
                      <div className="text-sm mt-1">
                        请确保Excel文件包含所有必需的工作表，或调整工作表名称符合命名规范
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /**
   * 步骤4: 配置导入（多数据组支持）
   */
  function renderConfigureImportStep() {
    if (selectedDataGroups.length === 0 || !selectedFiles.main || !selectedFiles.sheets || !selectedDataGroups.every(group => !!selectedFiles.sheets?.[group.dataGroup]?.sheetName)) return null;

    return (
      <div className="border-t pt-6 space-y-8">
        {/* 主要配置区域 - 导入模式选择 */}
        <div className="card bg-base-50 border border-base-300">
          <div className="card-body">
            <h4 className="card-title text-lg mb-4">🔧 导入模式配置</h4>
            
            <div className="form-control w-full max-w-md">
              <select 
                className="select select-bordered select-lg"
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as ImportMode)}
              >
                <option value="upsert">UPSERT - 更新或插入（推荐）</option>
                <option value="replace">REPLACE - 完全替换</option>
              </select>
            </div>

            {/* 重要提醒 */}
            <div className="alert alert-warning mt-4">
              <div>
                <span className="font-semibold">⚠️ 重要提醒</span>
                <div className="text-sm mt-2">
                  {importMode === 'replace' ? (
                    <>
                      <p>• REPLACE模式将删除所选月份 ({selectedMonth}) 的所有现有数据</p>
                      <p>• 影响数据类型：{selectedDataGroups.map(g => g.name).join('、')}</p>
                      <p>• 建议在执行前备份重要数据</p>
                    </>
                  ) : (
                    <>
                      <p>• UPSERT模式会智能更新现有记录</p>
                      <p>• 推荐用于日常数据更新操作</p>
                      <p>• 处理数据类型：{selectedDataGroups.map(g => g.name).join('、')}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 导入清单区域 - 响应式布局 */}
        <div>
          <h4 className="text-lg font-semibold mb-4">📋 导入清单</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {selectedDataGroups.map(group => {
              const sheetData = selectedFiles.sheets?.[group.dataGroup];
              return (
                <div key={group.dataGroup} className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
                  <div className="card-body p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{group.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-sm truncate">{group.name}</h5>
                      </div>
                      <div className="badge badge-success badge-sm">✓</div>
                    </div>
                    
                    <div className="space-y-1 text-xs text-base-content/70">
                      <div className="flex justify-between">
                        <span>工作表:</span>
                        <span className="font-medium truncate ml-2">{sheetData?.sheetName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>数据行数:</span>
                        <span className="font-medium">{sheetData?.rowCount || 0} 行</span>
                      </div>
                    </div>
                    
                    <div className="card-actions justify-end mt-3">
                      <div className="badge badge-outline badge-xs">已就绪</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /**
   * 步骤5: 确认并导入
   */
  function renderConfirmAndImportStep() {
    if (selectedDataGroups.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-info/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">尚未选择数据类型</h3>
          <p className="text-base-content/60 text-center max-w-md mb-6">
            请先返回选择数据类型步骤，选择要导入的数据类型后再进行确认。
          </p>
          <button 
            className="btn btn-info btn-sm"
            onClick={() => setCurrentStep(ImportStep.SELECT_DATA_TYPE)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回选择数据类型
          </button>
        </div>
      );
    }

    const missingSheets = selectedDataGroups.filter(group => !selectedFiles['sheets']?.[group.dataGroup]?.sheetName);
    const validSheets = selectedDataGroups.filter(group => selectedFiles['sheets']?.[group.dataGroup]?.sheetName);
    const totalRows = validSheets.reduce((sum, group) => {
      const sheetData = selectedFiles['sheets']?.[group.dataGroup];
      return sum + (sheetData?.rowCount || 0);
    }, 0);

    return (
      <div className="border-t pt-6 space-y-6">
        {/* 概览统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat bg-gradient-to-br from-info/10 to-info/5 rounded-lg border border-info/20">
            <div className="stat-figure text-info">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="stat-title text-xs">目标月份</div>
            <div className="stat-value text-xl text-info">{selectedMonth}</div>
            <div className="stat-desc">{importMode === 'upsert' ? '更新模式' : '替换模式'}</div>
          </div>

          <div className="stat bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
            <div className="stat-figure text-primary">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="stat-title text-xs">数据类型</div>
            <div className="stat-value text-2xl text-primary">{validSheets.length}</div>
            <div className="stat-desc">已准备就绪</div>
          </div>
          
          <div className="stat bg-gradient-to-br from-success/10 to-success/5 rounded-lg border border-success/20">
            <div className="stat-figure text-success">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="stat-title text-xs">数据行数</div>
            <div className="stat-value text-2xl text-success">{totalRows.toLocaleString()}</div>
            <div className="stat-desc">条记录待导入</div>
          </div>
        </div>

        {/* 数据类型清单 */}
        <div className="card bg-base-100 border border-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              <div className="badge badge-primary badge-lg">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                数据类型清单 ({selectedDataGroups.length} 个)
              </div>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedDataGroups.map(group => {
                const sheetData = selectedFiles['sheets']?.[group.dataGroup];
                const hasSheet = !!sheetData?.sheetName;
                const rowCount = sheetData?.rowCount || 0;
                
                return (
                  <div 
                    key={group.dataGroup} 
                    className={`group relative overflow-hidden rounded-lg border transition-all duration-200 hover:shadow-md ${
                      hasSheet 
                        ? 'bg-success/5 border-success/20 hover:bg-success/10' 
                        : 'bg-error/5 border-error/20 hover:bg-error/10'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-2xl flex-shrink-0">{group.icon}</div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-base truncate">{group.name}</div>
                          <div className="text-xs text-base-content/60 truncate">
                            {hasSheet ? `${sheetData.sheetName}` : '未找到匹配工作表'}
                          </div>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          hasSheet ? 'bg-success text-success-content' : 'bg-error text-error-content'
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {hasSheet ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            )}
                          </svg>
                        </div>
                      </div>
                      
                      {hasSheet && rowCount > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-base-content/70">数据行数</span>
                          <div className="badge badge-success">
                            {rowCount.toLocaleString()} 行
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* 进度条装饰 */}
                    {hasSheet && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-success/20">
                        <div className="h-full bg-success transition-all duration-1000 w-full"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 警告和风险提示 */}
        {missingSheets.length > 0 && (
          <div className="alert alert-warning">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-bold">检测到缺失的工作表</h3>
              <div className="text-sm mt-1">
                以下 {missingSheets.length} 个数据类型缺少匹配的工作表：
                <span className="font-medium ml-1">
                  {missingSheets.map(g => g.name).join('、')}
                </span>
              </div>
              <div className="text-xs mt-2 opacity-80">
                建议返回文件上传步骤，确认文件包含所需的工作表，或取消选择这些数据类型。
              </div>
            </div>
          </div>
        )}

        {/* 最终确认区域 */}
        {validSheets.length > 0 && (
          <div className="card bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
            <div className="card-body">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-primary mb-2">最终确认</h3>
                  <div className="prose prose-sm max-w-none text-base-content/80">
                    <p>您即将导入 <strong className="text-primary">{validSheets.length}</strong> 种数据类型，
                    共计 <strong className="text-primary">{totalRows.toLocaleString()}</strong> 条记录到 
                    <strong className="text-primary">{selectedMonth}</strong> 月份。</p>
                    
                    {importMode === 'replace' && (
                      <p className="text-warning font-medium">
                        ⚠️ 注意：替换模式将删除该月份的所有现有数据后插入新数据，此操作不可撤销。
                      </p>
                    )}
                    
                    <p className="text-sm">
                      请确认所有配置信息无误后点击开始导入。导入过程可能需要几分钟时间，请耐心等待。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /**
   * 步骤6: 查看结果
   */
  function renderViewResultsStep() {
    const results = getAllResults();
    const stats = getResultsStats();
    
    if (results.length === 0) {
      return (
        <div className="border-t pt-6">
          <div className="alert alert-info">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>暂无导入结果可显示。</span>
          </div>
        </div>
      );
    }

    return (
      <div className="border-t pt-6 space-y-6">
        {/* 总体导入结果统计 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <span>📊</span>
              批量导入结果汇总
            </h2>
            <p className="text-sm text-base-content/70">
              导入时间: {new Date().toLocaleString()}
            </p>
            
            {/* 整体统计 - 标准DaisyUI Stats组件 */}
            <div className="stats shadow stats-vertical lg:stats-horizontal mt-4">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="stat-title">数据类型</div>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-desc">总数</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-success">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="stat-title">成功</div>
                <div className="stat-value text-success">{stats.successful}</div>
                <div className="stat-desc">已完成</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-error">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="stat-title">失败</div>
                <div className="stat-value text-error">{stats.failed}</div>
                <div className="stat-desc">需处理</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-info">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="stat-title">完成率</div>
                <div className="stat-value text-info">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</div>
                <div className="stat-desc">{stats.completed}/{stats.total}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 各数据类型详细结果 */}
        <div>
          <h3 className="text-lg font-semibold mb-4">各数据类型导入详情</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((item, index) => {
            const result = item.result;
            const hasResult = result !== null;
            
            return (
              <div key={item.dataGroup} className="card bg-base-100 shadow-lg">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <h4 className="card-title text-base">{item.name}</h4>
                        <p className="text-sm opacity-70">{item.description}</p>
                      </div>
                    </div>
                    <div className={`badge ${hasResult ? (result?.success ? 'badge-success' : 'badge-error') : 'badge-warning'}`}>
                      {hasResult ? (result?.success ? '✅ 完成' : '❌ 失败') : '⏳ 等待'}
                    </div>
                  </div>
                  
                  {hasResult ? (
                    <>
                      {/* 成功结果显示 */}
                      {result?.success ? (
                        <div className="alert alert-success">
                          <div className="w-full">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center">
                                <div className="text-lg font-bold">📊</div>
                                <div className="font-medium">{result.totalRows || 0}</div>
                                <div className="text-sm opacity-70">总记录</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold">✅</div>
                                <div className="font-medium">{result.successCount || 0}</div>
                                <div className="text-sm opacity-70">成功</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold">❌</div>
                                <div className="font-medium">{result.failedCount || 0}</div>
                                <div className="text-sm opacity-70">失败</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold">⚠️</div>
                                <div className="font-medium">{result.errors?.length || 0}</div>
                                <div className="text-sm opacity-70">错误</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* 失败结果显示 */
                        <div className="alert alert-error">
                          <div>
                            <h3 className="font-bold">导入失败!</h3>
                            <div className="text-sm">错误信息: {result?.error || '未知错误'}</div>
                          </div>
                        </div>
                      )}
                      
                      {/* 错误详情 */}
                      {result?.errors && result.errors.length > 0 && (
                        <div className="collapse collapse-arrow bg-base-200 mt-4">
                          <input type="checkbox" />
                          <div className="collapse-title text-sm font-medium">
                            查看错误详情 ({result.errors.length} 个错误)
                          </div>
                          <div className="collapse-content">
                            <div className="max-h-60 overflow-y-auto space-y-1">
                              {result.errors.slice(0, 20).map((error: any, errorIndex: number) => (
                                <div key={errorIndex} className="text-sm flex items-center gap-2">
                                  <span className="badge badge-error badge-xs">第{error.row}行</span>
                                  <span>{error.message}</span>
                                </div>
                              ))}
                              {result.errors.length > 20 && (
                                <div className="text-xs opacity-70 text-center pt-2 border-t">
                                  还有 {result.errors.length - 20} 个错误未显示...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="alert alert-warning">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>此数据类型尚未导入或导入过程中出现问题</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {/* 操作建议 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">下一步操作</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card bg-base-200">
                <div className="card-body">
                  <h4 className="card-title text-base">重新导入失败项</h4>
                  <p className="text-sm">重新处理导入失败的数据类型</p>
                  <div className="card-actions">
                    <button 
                      className="btn btn-warning btn-sm"
                      onClick={() => {
                        // 只保留失败的数据组
                        const failedGroups = results.filter(r => !r.result || !r.result.success);
                        setSelectedDataGroups(failedGroups);
                        setCurrentStep(ImportStep.UPLOAD_FILE);
                      }}
                      disabled={stats.failed === 0}
                    >
                      重新导入失败项
                    </button>
                  </div>
                </div>
              </div>
              <div className="card bg-base-200">
                <div className="card-body">
                  <h4 className="card-title text-base">继续导入</h4>
                  <p className="text-sm">导入其他数据类型或更新现有数据</p>
                  <div className="card-actions">
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setCurrentStep(ImportStep.SELECT_DATA_TYPE);
                        setSelectedDataGroups([]);
                        setSelectedFiles({});
                        setImportResults({});
                      }}
                    >
                      重新开始
                    </button>
                  </div>
                </div>
              </div>
              <div className="card bg-base-200">
                <div className="card-body">
                  <h4 className="card-title text-base">查看数据</h4>
                  <p className="text-sm">前往薪资管理页面查看导入的数据</p>
                  <div className="card-actions">
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => window.open('/payroll/list', '_blank')}
                      disabled={stats.successful === 0}
                    >
                      查看薪资数据
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * 步骤导航按钮
   */
  function renderStepActions() {
    const canProceed = canProceedToNextStep();
    const currentIndex = Object.values(ImportStep).indexOf(currentStep);
    const isFirstStep = currentIndex === 0;
    const isLastStep = currentIndex === Object.values(ImportStep).length - 1;
    const stats = getResultsStats();

    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {/* 导入进度统一显示 - 只在导入过程中显示一个进度条 */}
          {importHook.isImporting && (
            <div className="mb-4">
              <ImportProgressBar
                progress={importHook.importProgress}
                isImporting={importHook.isImporting}
                dataGroup={selectedDataGroups[0]?.dataGroup || 'earnings'}
                showDetails={true}
                className="border-2"
              />
              {selectedDataGroups.length > 1 }
            </div>
          )}
          
          {/* 导航按钮 - 左右排列 */}
          <div className="flex justify-between items-center">
            <button
              className="btn btn-ghost"
              onClick={goToPreviousStep}
              disabled={isFirstStep || importHook.isImporting}
            >
              ← 上一步
            </button>
            
            <div className="text-sm text-base-content/70 text-center">
              步骤 {currentIndex + 1} / {Object.values(ImportStep).length}
            </div>
            
            <button
              className={`btn ${
                currentStep === ImportStep.CONFIRM_AND_IMPORT ? 'btn-success btn-lg' : 'btn-primary'
              }`}
              onClick={currentStep === ImportStep.CONFIRM_AND_IMPORT ? handleImport : goToNextStep}
              disabled={!canProceed || importHook.isImporting || isLastStep}
            >
              {currentStep === ImportStep.CONFIRM_AND_IMPORT ? (
                importHook.isImporting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    导入中...
                  </>
                ) : (
                  <>
                    🚀 开始导入
                  </>
                )
              ) : (
                '下一步 →'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default PayrollImportPageV2;