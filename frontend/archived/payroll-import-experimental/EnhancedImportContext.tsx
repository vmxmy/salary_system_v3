/**
 * EnhancedImportContext - 集成真实导入功能的Context
 * 基于SimpleImportContext，集成useEnhancedFileProcessor Hook
 * 
 * 功能扩展:
 * - 真实Excel文件处理
 * - 真实Supabase数据导入
 * - 完整的进度跟踪和错误处理
 * - 导入历史记录
 * - 向后兼容SimpleImportContext API
 */

import React, { createContext, useContext, useCallback, useRef, useState, useMemo } from 'react';
import { ImportDataGroup } from '@/types/payroll-import';
import type { ImportMode, SalaryComponentCategory } from '@/hooks/payroll/import-export/types';

// 导入增强的Hook
import { useEnhancedFileProcessor } from '../hooks/useEnhancedFileProcessor';
import type { RealImportConfig, RealImportResult } from '../hooks/useEnhancedFileProcessor';

// 导入现有的真实导入Hook
import { usePayrollImportExport } from '@/hooks/payroll/import-export';
import type { ImportResult } from '@/hooks/payroll/import-export/types';

/**
 * 增强的导入阶段枚举 - 扩展原有阶段
 */
export const EnhancedImportPhase = {
  CONFIGURATION: 'configuration',
  FILE_PROCESSING: 'file_processing', 
  DATA_VALIDATION: 'data_validation',
  REAL_IMPORT: 'real_import',
  COMPLETED: 'completed',
  ERROR: 'error'
} as const;

export type EnhancedImportPhaseType = typeof EnhancedImportPhase[keyof typeof EnhancedImportPhase];

/**
 * 增强的Context值类型 - 继承并扩展SimpleImportContext
 */
export interface EnhancedImportContextValue {
  // === 基础状态 (继承自SimpleImportContext) ===
  currentState: {
    phase: EnhancedImportPhaseType;
    selectedMonth: string;
    selectedDataGroups: ImportDataGroup[];
    hasFile: boolean;
    isProcessing: boolean;
    hasErrors: boolean;
    canProceed: boolean;
    
    // 新增：增强状态
    fileName?: string;
    fileSize?: number;
    isRealImporting: boolean;
    hasParseResult: boolean;
    importMode: ImportMode;
    selectedCategories: SalaryComponentCategory[];
  };
  
  // === 进度信息 (增强版) ===
  progress: {
    overall: number; // 0-100
    phase: EnhancedImportPhaseType;
    message: string;
    isActive: boolean;
    
    // 新增：详细进度信息
    fileProgress: number; // 文件处理进度
    importProgress: number; // 导入进度
    currentOperation?: string; // 当前操作描述
    estimatedTimeLeft?: number; // 预估剩余时间（秒）
  };
  
  // === 错误管理 (增强版) ===
  errors: {
    configErrors: string[];
    fileErrors: string[];
    processErrors: string[];
    importErrors: Array<{ row: number; message: string; error?: string }>;
    hasAnyError: boolean;
    lastError?: Error | null;
  };
  
  // === 数据访问 (新增) ===
  data: {
    parseResult: any | null; // 解析结果
    importResult: RealImportResult | null; // 导入结果
    statistics: {
      totalFiles: number;
      totalSheets: number;
      totalRows: number;
      validRows: number;
      uniqueEmployees: number;
      dataTypes: ImportDataGroup[];
    };
    importHistory: Array<{
      timestamp: number;
      config: RealImportConfig;
      result: RealImportResult;
    }>;
  };
  
  // === 事件处理 (继承并扩展) ===
  notifyConfigChange: (config: { 
    month?: string; 
    dataGroups?: ImportDataGroup[]; 
    importMode?: ImportMode;
    categories?: SalaryComponentCategory[];
  }) => void;
  notifyFileChange: (fileState: { hasFile: boolean; fileName?: string; fileSize?: number }) => void;
  notifyProgress: (progress: { phase: EnhancedImportPhaseType; progress: number; message?: string }) => void;
  notifyError: (error: { source: 'config' | 'file' | 'process' | 'import'; message: string; details?: any }) => void;
  clearErrors: (source?: 'config' | 'file' | 'process' | 'import') => void;
  
  // === 文件操作 (新增) ===
  processFile: (file: File) => Promise<void>;
  clearFileResults: () => void;
  
  // === 导入操作 (新增) ===
  performRealImport: (availableMonths?: any[]) => Promise<RealImportResult>;
  
  // === 生命周期 (继承并扩展) ===
  resetImport: () => Promise<void>;
  startImport: (availableMonths?: any[]) => Promise<void>;
  completeImport: () => Promise<void>;
  
  // === 数据查询 (新增) ===
  getSheetData: (sheetName: string) => any[] | null;
  getEmployeeData: (employeeName: string) => Array<{ sheet: string; data: any }>;
  getDataByType: (dataType: ImportDataGroup) => any[];
  
  // === 调试 (继承并扩展) ===
  sessionId: string;
  getDiagnostics: () => {
    stateSnapshot: any;
    timeLine: Array<{ timestamp: number; event: string; data?: any }>;
    performance: { startTime: number; currentTime: number; duration: number };
    hookState: any; // Hook内部状态
  };
}

/**
 * Context创建
 */
const EnhancedImportContext = createContext<EnhancedImportContextValue | null>(null);

/**
 * Provider Props
 */
export interface EnhancedImportContextProviderProps {
  children: React.ReactNode;
  initialConfig?: {
    month?: string;
    dataGroups?: ImportDataGroup[];
    importMode?: ImportMode;
    categories?: SalaryComponentCategory[];
  };
  debug?: boolean;
  onStateChange?: (state: EnhancedImportContextValue['currentState']) => void;
  onProgressChange?: (progress: EnhancedImportContextValue['progress']) => void;
  onError?: (error: any) => void;
  onComplete?: (result: RealImportResult) => void;
}

/**
 * 增强版Provider实现
 */
export const EnhancedImportContextProvider: React.FC<EnhancedImportContextProviderProps> = ({
  children,
  initialConfig,
  debug = false,
  onStateChange,
  onProgressChange,
  onError,
  onComplete
}) => {
  // === Hook集成 ===
  const fileProcessorHook = useEnhancedFileProcessor();
  
  // 集成现有的真实导入导出Hook
  const realImportHook = usePayrollImportExport();
  
  // === 内部状态 ===
  const sessionId = useRef(Date.now().toString());
  const timeLineRef = useRef<Array<{ timestamp: number; event: string; data?: any }>>([]);
  const startTimeRef = useRef(Date.now());
  const currentFileRef = useRef<File | null>(null); // 存储当前处理的文件
  
  const [state, setState] = useState({
    phase: EnhancedImportPhase.CONFIGURATION as EnhancedImportPhaseType,
    selectedMonth: initialConfig?.month || '2025-01',
    selectedDataGroups: initialConfig?.dataGroups || [ImportDataGroup.EARNINGS],
    importMode: initialConfig?.importMode || 'upsert' as ImportMode,
    selectedCategories: initialConfig?.categories || ['basic_salary', 'benefits', 'personal_tax', 'other_deductions'] as SalaryComponentCategory[],
    hasFile: false,
    isProcessing: false,
    fileName: '',
    fileSize: 0,
    overallProgress: 0,
    fileProgress: 0,
    importProgress: 0,
    progressMessage: '准备中...',
    currentOperation: '',
    errors: {
      config: [] as string[],
      file: [] as string[],
      process: [] as string[],
      import: [] as Array<{ row: number; message: string; error?: string }>
    },
    lastError: null as Error | null
  });

  // === 工具函数 ===
  const logEvent = useCallback((event: string, data?: any) => {
    const timestamp = Date.now();
    timeLineRef.current.push({ timestamp, event, data });
    if (debug) {
      console.log(`[EnhancedImportContext:${sessionId.current}] ${event}`, data);
    }
  }, [debug]);

  // === 计算属性 ===
  const currentState = useMemo(() => ({
    phase: state.phase,
    selectedMonth: state.selectedMonth,
    selectedDataGroups: state.selectedDataGroups,
    hasFile: state.hasFile,
    isProcessing: state.isProcessing,
    hasErrors: state.errors.config.length > 0 || 
               state.errors.file.length > 0 || 
               state.errors.process.length > 0 ||
               state.errors.import.length > 0,
    canProceed: state.selectedMonth !== '' &&
                state.selectedDataGroups.length > 0 &&
                state.hasFile &&
                !state.isProcessing &&
                fileProcessorHook.parseResult !== null,
    fileName: state.fileName,
    fileSize: state.fileSize,
    isRealImporting: fileProcessorHook.isRealImporting,
    hasParseResult: fileProcessorHook.parseResult !== null,
    importMode: state.importMode,
    selectedCategories: state.selectedCategories
  }), [state, fileProcessorHook.parseResult, fileProcessorHook.isRealImporting]);

  const progress = useMemo(() => ({
    overall: state.overallProgress,
    phase: state.phase,
    message: state.progressMessage,
    isActive: state.isProcessing || fileProcessorHook.isRealImporting,
    fileProgress: state.fileProgress,
    importProgress: state.importProgress,
    currentOperation: state.currentOperation
  }), [state, fileProcessorHook.isRealImporting]);

  const errors = useMemo(() => ({
    configErrors: state.errors.config,
    fileErrors: state.errors.file,
    processErrors: state.errors.process,
    importErrors: state.errors.import,
    hasAnyError: state.errors.config.length > 0 || 
                 state.errors.file.length > 0 || 
                 state.errors.process.length > 0 ||
                 state.errors.import.length > 0,
    lastError: state.lastError
  }), [state.errors, state.lastError]);

  const data = useMemo(() => ({
    parseResult: fileProcessorHook.parseResult,
    importResult: fileProcessorHook.realImportResult,
    statistics: fileProcessorHook.getStatistics(),
    importHistory: fileProcessorHook.getImportHistory()
  }), [
    fileProcessorHook.parseResult,
    fileProcessorHook.realImportResult,
    fileProcessorHook.getStatistics,
    fileProcessorHook.getImportHistory
  ]);

  // === 事件处理器 ===
  const notifyConfigChange = useCallback((config: {
    month?: string;
    dataGroups?: ImportDataGroup[];
    importMode?: ImportMode;
    categories?: SalaryComponentCategory[];
  }) => {
    logEvent('config_changed', config);
    setState(prev => ({
      ...prev,
      selectedMonth: config.month ?? prev.selectedMonth,
      selectedDataGroups: config.dataGroups ?? prev.selectedDataGroups,
      importMode: config.importMode ?? prev.importMode,
      selectedCategories: config.categories ?? prev.selectedCategories,
      errors: {
        ...prev.errors,
        config: [] // 清除配置错误
      }
    }));
  }, [logEvent]);

  const notifyFileChange = useCallback((fileState: {
    hasFile: boolean;
    fileName?: string;
    fileSize?: number;
  }) => {
    logEvent('file_changed', fileState);
    setState(prev => ({
      ...prev,
      hasFile: fileState.hasFile,
      fileName: fileState.fileName || '',
      fileSize: fileState.fileSize || 0,
      errors: {
        ...prev.errors,
        file: fileState.hasFile ? [] : prev.errors.file
      }
    }));
  }, [logEvent]);

  const notifyProgress = useCallback((progressUpdate: {
    phase: EnhancedImportPhaseType;
    progress: number;
    message?: string;
  }) => {
    logEvent('progress_updated', progressUpdate);
    setState(prev => ({
      ...prev,
      phase: progressUpdate.phase,
      overallProgress: progressUpdate.progress,
      progressMessage: progressUpdate.message || prev.progressMessage
    }));
  }, [logEvent]);

  const notifyError = useCallback((error: {
    source: 'config' | 'file' | 'process' | 'import';
    message: string;
    details?: any;
  }) => {
    logEvent('error_reported', error);
    setState(prev => {
      const newErrors = { ...prev.errors };
      
      if (error.source === 'import' && error.details) {
        // 导入错误包含行号信息
        newErrors.import = [...newErrors.import, error.details];
      } else if (error.source !== 'import') {
        // 非导入错误直接添加消息
        (newErrors[error.source] as string[]).push(error.message);
      }
      
      return {
        ...prev,
        errors: newErrors,
        lastError: new Error(error.message)
      };
    });
    
    if (onError) {
      onError(error);
    }
  }, [logEvent, onError]);

  const clearErrors = useCallback((source?: 'config' | 'file' | 'process' | 'import') => {
    setState(prev => {
      if (source) {
        logEvent('errors_cleared', { source });
        return {
          ...prev,
          errors: {
            ...prev.errors,
            [source]: []
          }
        };
      } else {
        logEvent('all_errors_cleared');
        return {
          ...prev,
          errors: { config: [], file: [], process: [], import: [] }
        };
      }
    });
  }, [logEvent]);

  // === 文件操作 (新增) ===
  const processFile = useCallback(async (file: File) => {
    logEvent('file_processing_started', { fileName: file.name, fileSize: file.size });
    
    try {
      setState(prev => ({
        ...prev,
        isProcessing: true,
        phase: EnhancedImportPhase.FILE_PROCESSING,
        progressMessage: '开始处理文件...'
      }));

      // 存储文件引用
      currentFileRef.current = file;
      
      // 通知文件变更
      notifyFileChange({
        hasFile: true,
        fileName: file.name,
        fileSize: file.size
      });

      // 使用Hook处理文件
      await fileProcessorHook.processFile(file, (phase, progress) => {
        setState(prev => ({
          ...prev,
          fileProgress: progress,
          overallProgress: Math.round(progress * 0.7), // 文件处理占总进度70%
          progressMessage: `文件处理: ${progress}%`,
          currentOperation: `解析${phase === 'parsing' ? '工作表' : '验证数据'}`
        }));
      });

      setState(prev => ({
        ...prev,
        phase: EnhancedImportPhase.DATA_VALIDATION,
        overallProgress: 70,
        progressMessage: '文件处理完成，数据验证完成',
        isProcessing: false
      }));

      logEvent('file_processing_completed');
      
    } catch (error) {
      logEvent('file_processing_failed', { error: error instanceof Error ? error.message : error });
      notifyError({
        source: 'file',
        message: `文件处理失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
      
      setState(prev => ({
        ...prev,
        phase: EnhancedImportPhase.ERROR,
        isProcessing: false,
        overallProgress: 0,
        progressMessage: '文件处理失败'
      }));
      
      throw error;
    }
  }, [fileProcessorHook, logEvent, notifyFileChange, notifyError]);

  const clearFileResults = useCallback(() => {
    logEvent('file_results_cleared');
    fileProcessorHook.clearResults();
    currentFileRef.current = null; // 清除文件引用
    setState(prev => ({
      ...prev,
      hasFile: false,
      fileName: '',
      fileSize: 0,
      fileProgress: 0,
      overallProgress: 0,
      phase: EnhancedImportPhase.CONFIGURATION,
      progressMessage: '准备中...'
    }));
  }, [fileProcessorHook, logEvent]);

  // === 导入操作 (新增) - 集成真实导入Hook ===
  const performRealImport = useCallback(async (availableMonths?: any[]): Promise<RealImportResult> => {
    if (!fileProcessorHook.parseResult) {
      throw new Error('请先处理Excel文件');
    }

    logEvent('real_import_started');
    
    try {
      setState(prev => ({
        ...prev,
        phase: EnhancedImportPhase.REAL_IMPORT,
        progressMessage: '开始真实数据导入...'
      }));

      // 查找真实的周期UUID
      const selectedMonthData = availableMonths?.find(month => month.month === state.selectedMonth);
      const realPeriodId = selectedMonthData?.periodId;
      
      if (!realPeriodId) {
        throw new Error(`无法找到月份 ${state.selectedMonth} 对应的薪资周期ID`);
      }

      // 获取当前处理的文件
      const currentFile = currentFileRef.current;
      if (!currentFile) {
        throw new Error('未找到要导入的文件，请先上传并处理Excel文件');
      }

      console.log('🎯 使用真实导入Hook执行导入:', {
        periodId: realPeriodId,
        selectedDataGroups: state.selectedDataGroups,
        importMode: state.importMode,
        fileName: currentFile.name
      });

      // 构建真实导入配置 - 适配现有Hook的格式
      const importConfig = {
        dataGroup: state.selectedDataGroups[0], // 现有Hook一次只处理一种数据类型
        mode: state.importMode,
        payPeriod: {
          start: new Date(),
          end: new Date()
        },
        options: {
          validateBeforeImport: true,
          skipInvalidRows: false
        }
      };

      // 创建高级进度监听器 - 适配Hook的ImportProgress到Context的进度格式
      const progressListener = () => {
        const hookProgress = realImportHook.importProgress;
        if (hookProgress) {
          // 计算整体进度百分比
          const globalProgress = hookProgress.global.totalRecords > 0
            ? Math.round((hookProgress.global.processedRecords / hookProgress.global.totalRecords) * 100)
            : 0;
          
          const currentProgress = hookProgress.current.totalRecords > 0
            ? Math.round((hookProgress.current.processedRecords / hookProgress.current.totalRecords) * 100)
            : 0;
          
          // 根据阶段调整进度权重
          let adjustedProgress = 0;
          switch (hookProgress.phase) {
            case 'parsing':
              adjustedProgress = Math.min(10, globalProgress * 0.1);
              break;
            case 'validating':
              adjustedProgress = 10 + Math.min(10, globalProgress * 0.1);
              break;
            case 'importing':
            case 'creating_payrolls':
            case 'inserting_items':
              adjustedProgress = 20 + Math.min(60, globalProgress * 0.6);
              break;
            case 'completed':
              adjustedProgress = 100;
              break;
            case 'error':
              adjustedProgress = globalProgress;
              break;
            default:
              adjustedProgress = globalProgress;
          }
          
          setState(prev => ({
            ...prev,
            importProgress: adjustedProgress,
            overallProgress: 70 + Math.round(adjustedProgress * 0.3), // 导入占总进度的30%
            progressMessage: hookProgress.message || `${hookProgress.phase}阶段进行中...`,
            currentOperation: hookProgress.current.groupName || hookProgress.phase || ''
          }));
        }
      };

      // 定期检查进度（每100ms）
      const progressInterval = setInterval(progressListener, 100);

      let realResult: ImportResult;
      try {
        // 调用真实的导入Hook - 这将执行真正的数据库写入
        realResult = await realImportHook.importExcel.mutateAsync({
          file: currentFile,
          config: importConfig,
          periodId: realPeriodId
        });

        // 清理进度监听器
        clearInterval(progressInterval);
        
        console.log('✅ 真实导入Hook执行完成:', realResult);
      } catch (error) {
        // 清理进度监听器
        clearInterval(progressInterval);
        throw error;
      }

      // 将ImportResult转换为RealImportResult格式
      const result: RealImportResult = {
        success: realResult.success,
        totalRows: realResult.totalRows,
        successCount: realResult.successCount,
        failedCount: realResult.failedCount,
        skippedCount: realResult.skippedCount || 0,
        errors: realResult.errors.map(error => ({
          row: error.row,
          message: error.message,
          error: error.field
        })),
        warnings: realResult.warnings?.map(w => w.message) || [],
        duration: Date.now() - startTimeRef.current,
        importedDataTypes: [state.selectedDataGroups[0]]
      };

      setState(prev => ({
        ...prev,
        phase: EnhancedImportPhase.COMPLETED,
        overallProgress: 100,
        progressMessage: result.success ? '导入完成' : '导入失败',
        isProcessing: false
      }));

      logEvent('real_import_completed', { success: result.success, records: result.totalRows });
      
      if (onComplete) {
        onComplete(result);
      }

      return result;
      
    } catch (error) {
      logEvent('real_import_failed', { error: error instanceof Error ? error.message : error });
      notifyError({
        source: 'import',
        message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
      
      setState(prev => ({
        ...prev,
        phase: EnhancedImportPhase.ERROR,
        isProcessing: false,
        progressMessage: '导入失败'
      }));
      
      throw error;
    }
  }, [fileProcessorHook, realImportHook.importExcel, state, logEvent, onComplete, notifyError]);

  // === 生命周期管理 ===
  const resetImport = useCallback(async () => {
    logEvent('import_reset_started');
    
    // 重置Hook状态
    fileProcessorHook.clearResults();
    
    // 重置Context状态
    setState({
      phase: EnhancedImportPhase.CONFIGURATION,
      selectedMonth: initialConfig?.month || '2025-01',
      selectedDataGroups: initialConfig?.dataGroups || [ImportDataGroup.EARNINGS],
      importMode: initialConfig?.importMode || 'upsert' as ImportMode,
      selectedCategories: initialConfig?.categories || ['basic_salary', 'benefits', 'personal_tax', 'other_deductions'] as SalaryComponentCategory[],
      hasFile: false,
      isProcessing: false,
      fileName: '',
      fileSize: 0,
      overallProgress: 0,
      fileProgress: 0,
      importProgress: 0,
      progressMessage: '准备中...',
      currentOperation: '',
      errors: { config: [], file: [], process: [], import: [] },
      lastError: null
    });
    
    timeLineRef.current = [];
    startTimeRef.current = Date.now();
    logEvent('import_reset_completed');
  }, [initialConfig, fileProcessorHook, logEvent]);

  const startImport = useCallback(async (availableMonths?: any[]) => {
    logEvent('import_start_requested');
    if (!currentState.canProceed) {
      const error = new Error('无法开始导入：配置不完整或存在错误');
      notifyError({
        source: 'process',
        message: error.message
      });
      throw error;
    }
    
    await performRealImport(availableMonths);
    logEvent('import_started');
  }, [currentState.canProceed, logEvent, notifyError, performRealImport]);

  const completeImport = useCallback(async () => {
    logEvent('import_completion_started');
    setState(prev => ({
      ...prev,
      phase: EnhancedImportPhase.COMPLETED,
      isProcessing: false,
      overallProgress: 100,
      progressMessage: '导入完成'
    }));
    logEvent('import_completed');
  }, [logEvent]);

  // === 数据查询 (新增) ===
  const getSheetData = useCallback((sheetName: string) => {
    return fileProcessorHook.getSheetData(sheetName);
  }, [fileProcessorHook]);

  const getEmployeeData = useCallback((employeeName: string) => {
    return fileProcessorHook.getEmployeeData(employeeName);
  }, [fileProcessorHook]);

  const getDataByType = useCallback((dataType: ImportDataGroup) => {
    return fileProcessorHook.getDataByType(dataType);
  }, [fileProcessorHook]);

  // === 调试功能 ===
  const getDiagnostics = useCallback(() => ({
    stateSnapshot: { currentState, progress, errors },
    timeLine: timeLineRef.current,
    performance: {
      startTime: startTimeRef.current,
      currentTime: Date.now(),
      duration: Date.now() - startTimeRef.current
    },
    hookState: {
      hasParseResult: !!fileProcessorHook.parseResult,
      isProcessing: fileProcessorHook.isProcessing,
      isRealImporting: fileProcessorHook.isRealImporting,
      hasErrors: fileProcessorHook.hasErrors,
      statistics: fileProcessorHook.getStatistics()
    }
  }), [currentState, progress, errors, fileProcessorHook]);

  // === 外部事件监听 ===
  React.useEffect(() => {
    if (onStateChange) {
      onStateChange(currentState);
    }
  }, [currentState, onStateChange]);

  React.useEffect(() => {
    if (onProgressChange) {
      onProgressChange(progress);
    }
  }, [progress, onProgressChange]);

  // === Context值构建 ===
  const contextValue: EnhancedImportContextValue = {
    currentState,
    progress,
    errors,
    data,
    notifyConfigChange,
    notifyFileChange,
    notifyProgress,
    notifyError,
    clearErrors,
    processFile,
    clearFileResults,
    performRealImport,
    resetImport,
    startImport,
    completeImport,
    getSheetData,
    getEmployeeData,
    getDataByType,
    sessionId: sessionId.current,
    getDiagnostics
  };

  return (
    <EnhancedImportContext.Provider value={contextValue}>
      {children}
    </EnhancedImportContext.Provider>
  );
};

/**
 * Hook访问Context
 */
export const useEnhancedImportContext = (): EnhancedImportContextValue => {
  const context = useContext(EnhancedImportContext);
  if (!context) {
    throw new Error('useEnhancedImportContext必须在EnhancedImportContextProvider内使用');
  }
  return context;
};

export default EnhancedImportContext;