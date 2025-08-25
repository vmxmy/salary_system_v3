/**
 * 薪资导入Context - 组件间通信的中央枢纽
 * 
 * 这个Context提供统一的状态管理和组件间通信机制，
 * 连接useImportState、useFileProcessor和所有UI组件
 * 
 * 核心职责：
 * - 统一状态管理和分发
 * - 组件间事件通信
 * - 进度同步和错误处理
 * - 生命周期管理
 */

import React, { createContext, useContext, useCallback, useRef, useEffect, useMemo } from 'react';
import { useImportState } from '../hooks/useImportState';
import { useFileProcessor } from '../hooks/useFileProcessor';
import type { 
  ImportPhase, 
  ImportDataGroup, 
  FileParseResult, 
  DataConsistencyCheckResult,
  FileProcessingState,
  ImportProgressState
} from '@/types/payroll-import';

/**
 * Context值的类型定义
 */
export interface ImportContextValue {
  // === 状态访问 ===
  /** 导入状态Hook的完整返回值 */
  importState: ReturnType<typeof useImportState>;
  
  /** 文件处理Hook的完整返回值 */
  fileProcessor: ReturnType<typeof useFileProcessor>;
  
  // === 统一状态视图 ===
  /** 当前整体状态快照 */
  currentState: {
    phase: ImportPhase;
    selectedMonth: string;
    selectedDataGroups: ImportDataGroup[];
    hasFile: boolean;
    isProcessing: boolean;
    hasErrors: boolean;
    canProceed: boolean;
  };
  
  /** 统一的进度信息 */
  progress: {
    overall: number; // 0-100 整体进度
    phase: ImportPhase;
    message: string;
    isActive: boolean;
  };
  
  /** 统一的错误信息 */
  errors: {
    configErrors: string[];
    fileErrors: string[];
    processErrors: string[];
    hasAnyError: boolean;
  };
  
  // === 组件间通信事件 ===
  /** 通知配置变更 */
  notifyConfigChange: (config: {
    month?: string;
    dataGroups?: ImportDataGroup[];
  }) => void;
  
  /** 通知文件状态变更 */
  notifyFileChange: (fileState: {
    hasFile: boolean;
    fileName?: string;
    fileSize?: number;
    parseResult?: FileParseResult | null;
  }) => void;
  
  /** 通知进度更新 */
  notifyProgress: (progress: {
    phase: ImportPhase;
    progress: number;
    message?: string;
  }) => void;
  
  /** 通知错误状态 */
  notifyError: (error: {
    source: 'config' | 'file' | 'process';
    message: string;
    details?: any;
  }) => void;
  
  /** 清除特定来源的错误 */
  clearErrors: (source?: 'config' | 'file' | 'process') => void;
  
  // === 生命周期管理 ===
  /** 重置整个导入流程 */
  resetImport: () => Promise<void>;
  
  /** 开始导入流程 */
  startImport: () => Promise<void>;
  
  /** 暂停/恢复导入 */
  toggleImport: () => void;
  
  /** 完成导入流程 */
  completeImport: () => Promise<void>;
  
  // === 调试和监控 ===
  /** 导入会话ID，用于日志关联 */
  sessionId: string;
  
  /** 获取详细的状态诊断信息 */
  getDiagnostics: () => {
    stateSnapshot: any;
    timeLine: Array<{ timestamp: number; event: string; data?: any }>;
    performance: {
      startTime: number;
      currentTime: number;
      duration: number;
    };
  };
}

/**
 * Context创建
 */
const ImportContext = createContext<ImportContextValue | null>(null);

/**
 * ImportContext Provider组件的Props
 */
export interface ImportContextProviderProps {
  children: React.ReactNode;
  
  /** 可选的初始配置 */
  initialConfig?: {
    month?: string;
    dataGroups?: ImportDataGroup[];
  };
  
  /** 调试模式 */
  debug?: boolean;
  
  /** 事件监听器 */
  onStateChange?: (state: ImportContextValue['currentState']) => void;
  onProgressChange?: (progress: ImportContextValue['progress']) => void;
  onError?: (error: any) => void;
  onComplete?: (result: any) => void;
}

/**
 * ImportContext Provider实现
 */
export const ImportContextProvider: React.FC<ImportContextProviderProps> = ({
  children,
  initialConfig,
  debug = false,
  onStateChange,
  onProgressChange,
  onError,
  onComplete
}) => {
  // === Hook集成 ===
  const importState = useImportState({
    initialMonth: initialConfig?.month || '2025-01',
    initialDataGroups: initialConfig?.dataGroups || []
  });
  
  const fileProcessor = useFileProcessor();
  
  // === 内部状态管理 ===
  const sessionId = useRef(Date.now().toString());
  const timeLineRef = useRef<Array<{ timestamp: number; event: string; data?: any }>>([]);
  const startTimeRef = useRef(Date.now());
  const errorsRef = useRef<{
    config: string[];
    file: string[];
    process: string[];
  }>({
    config: [],
    file: [],
    process: []
  });

  // === 日志记录工具函数 ===
  const logEvent = useCallback((event: string, data?: any) => {
    const timestamp = Date.now();
    timeLineRef.current.push({ timestamp, event, data });
    
    if (debug) {
      console.log(`[ImportContext:${sessionId.current}] ${event}`, data);
    }
  }, [debug]);

  // === 统一状态计算 ===
  const currentState = useMemo(() => {
    const state = {
      phase: importState.progress.phase,
      selectedMonth: importState.config.selectedMonth,
      selectedDataGroups: importState.config.selectedDataGroups,
      hasFile: !!fileProcessor.fileState.selectedFile,
      isProcessing: importState.progress.isProcessing || fileProcessor.fileState.isProcessing,
      hasErrors: errorsRef.current.config.length > 0 || 
                errorsRef.current.file.length > 0 || 
                errorsRef.current.process.length > 0,
      canProceed: importState.config.selectedMonth !== '' &&
                  importState.config.selectedDataGroups.length > 0 &&
                  !!fileProcessor.fileState.selectedFile &&
                  !fileProcessor.fileState.isProcessing
    };
    
    logEvent('state_calculated', state);
    return state;
  }, [
    importState.progress.phase,
    importState.config.selectedMonth,
    importState.config.selectedDataGroups,
    importState.progress.isProcessing,
    fileProcessor.fileState.selectedFile,
    fileProcessor.fileState.isProcessing,
    logEvent
  ]);

  // === 统一进度计算 ===
  const progress = useMemo(() => {
    let overall = 0;
    let message = '准备中...';
    
    // 基于当前阶段计算整体进度
    switch (currentState.phase) {
      case ImportPhase.CONFIGURATION:
        overall = currentState.selectedMonth && currentState.selectedDataGroups.length > 0 ? 20 : 0;
        message = '配置导入参数';
        break;
      case ImportPhase.FILE_PROCESSING:
        overall = 20 + (fileProcessor.fileState.processingProgress || 0) * 0.4;
        message = fileProcessor.fileState.statusMessage || '处理文件中...';
        break;
      case ImportPhase.DATA_VALIDATION:
        overall = 60 + (importState.progress.currentProgress || 0) * 0.2;
        message = '验证数据中...';
        break;
      case ImportPhase.DATA_IMPORT:
        overall = 80 + (importState.progress.currentProgress || 0) * 0.15;
        message = '导入数据中...';
        break;
      case ImportPhase.COMPLETED:
        overall = 100;
        message = '导入完成';
        break;
      default:
        overall = 0;
        message = '准备中...';
    }
    
    return {
      overall: Math.round(overall),
      phase: currentState.phase,
      message,
      isActive: currentState.isProcessing
    };
  }, [
    currentState.phase,
    currentState.selectedMonth,
    currentState.selectedDataGroups.length,
    currentState.isProcessing,
    fileProcessor.fileState.processingProgress,
    fileProcessor.fileState.statusMessage,
    importState.progress.currentProgress
  ]);

  // === 统一错误管理 ===
  const errors = useMemo(() => ({
    configErrors: errorsRef.current.config,
    fileErrors: errorsRef.current.file,
    processErrors: errorsRef.current.process,
    hasAnyError: errorsRef.current.config.length > 0 || 
                 errorsRef.current.file.length > 0 || 
                 errorsRef.current.process.length > 0
  }), [errorsRef.current]);

  // === 组件间通信事件处理 ===
  const notifyConfigChange = useCallback((config: {
    month?: string;
    dataGroups?: ImportDataGroup[];
  }) => {
    logEvent('config_changed', config);
    
    if (config.month !== undefined) {
      importState.actions.setSelectedMonth(config.month);
    }
    if (config.dataGroups !== undefined) {
      importState.actions.setSelectedDataGroups(config.dataGroups);
    }
    
    // 清除配置相关错误
    errorsRef.current.config = [];
  }, [importState.actions, logEvent]);

  const notifyFileChange = useCallback((fileState: {
    hasFile: boolean;
    fileName?: string;
    fileSize?: number;
    parseResult?: FileParseResult | null;
  }) => {
    logEvent('file_changed', fileState);
    
    if (fileState.hasFile && fileState.parseResult) {
      // 文件成功解析，更新进度
      importState.actions.setCurrentPhase(ImportPhase.DATA_VALIDATION);
    }
    
    // 清除文件相关错误
    if (fileState.hasFile) {
      errorsRef.current.file = [];
    }
  }, [importState.actions, logEvent]);

  const notifyProgress = useCallback((progressUpdate: {
    phase: ImportPhase;
    progress: number;
    message?: string;
  }) => {
    logEvent('progress_updated', progressUpdate);
    
    importState.actions.setCurrentPhase(progressUpdate.phase);
    importState.actions.updateProgress(progressUpdate.progress, progressUpdate.message);
  }, [importState.actions, logEvent]);

  const notifyError = useCallback((error: {
    source: 'config' | 'file' | 'process';
    message: string;
    details?: any;
  }) => {
    logEvent('error_reported', error);
    
    errorsRef.current[error.source].push(error.message);
    
    // 调用外部错误监听器
    if (onError) {
      onError(error);
    }
  }, [logEvent, onError]);

  const clearErrors = useCallback((source?: 'config' | 'file' | 'process') => {
    if (source) {
      errorsRef.current[source] = [];
      logEvent('errors_cleared', { source });
    } else {
      errorsRef.current = { config: [], file: [], process: [] };
      logEvent('all_errors_cleared');
    }
  }, [logEvent]);

  // === 生命周期管理 ===
  const resetImport = useCallback(async () => {
    logEvent('import_reset_started');
    
    try {
      await importState.actions.resetState();
      
      errorsRef.current = { config: [], file: [], process: [] };
      timeLineRef.current = [];
      startTimeRef.current = Date.now();
      
      logEvent('import_reset_completed');
    } catch (error) {
      logEvent('import_reset_failed', error);
      throw error;
    }
  }, [importState.actions, logEvent]);

  const startImport = useCallback(async () => {
    logEvent('import_start_requested');
    
    if (!currentState.canProceed) {
      const error = new Error('无法开始导入：配置不完整或存在错误');
      notifyError({
        source: 'process',
        message: error.message
      });
      throw error;
    }
    
    try {
      importState.actions.setCurrentPhase(ImportPhase.DATA_IMPORT);
      importState.actions.setIsProcessing(true);
      
      logEvent('import_started');
    } catch (error) {
      logEvent('import_start_failed', error);
      notifyError({
        source: 'process',
        message: `启动导入失败: ${error}`
      });
      throw error;
    }
  }, [currentState.canProceed, importState.actions, logEvent, notifyError]);

  const toggleImport = useCallback(() => {
    const newProcessingState = !importState.progress.isProcessing;
    importState.actions.setIsProcessing(newProcessingState);
    
    logEvent('import_toggled', { isProcessing: newProcessingState });
  }, [importState.progress.isProcessing, importState.actions, logEvent]);

  const completeImport = useCallback(async () => {
    logEvent('import_completion_started');
    
    try {
      importState.actions.setCurrentPhase(ImportPhase.COMPLETED);
      importState.actions.setIsProcessing(false);
      importState.actions.updateProgress(100, '导入完成');
      
      const result = {
        sessionId: sessionId.current,
        duration: Date.now() - startTimeRef.current,
        finalState: currentState
      };
      
      if (onComplete) {
        onComplete(result);
      }
      
      logEvent('import_completed', result);
    } catch (error) {
      logEvent('import_completion_failed', error);
      throw error;
    }
  }, [importState.actions, currentState, onComplete, logEvent]);

  // === 调试和监控 ===
  const getDiagnostics = useCallback(() => {
    return {
      stateSnapshot: {
        importState: importState,
        fileProcessor: fileProcessor,
        currentState,
        progress,
        errors
      },
      timeLine: timeLineRef.current,
      performance: {
        startTime: startTimeRef.current,
        currentTime: Date.now(),
        duration: Date.now() - startTimeRef.current
      }
    };
  }, [importState, fileProcessor, currentState, progress, errors]);

  // === 外部事件监听 ===
  useEffect(() => {
    if (onStateChange) {
      onStateChange(currentState);
    }
  }, [currentState, onStateChange]);

  useEffect(() => {
    if (onProgressChange) {
      onProgressChange(progress);
    }
  }, [progress, onProgressChange]);

  // === Context值构建 ===
  const contextValue: ImportContextValue = {
    importState,
    fileProcessor,
    currentState,
    progress,
    errors,
    notifyConfigChange,
    notifyFileChange,
    notifyProgress,
    notifyError,
    clearErrors,
    resetImport,
    startImport,
    toggleImport,
    completeImport,
    sessionId: sessionId.current,
    getDiagnostics
  };

  return (
    <ImportContext.Provider value={contextValue}>
      {children}
    </ImportContext.Provider>
  );
};

/**
 * useImportContext Hook - 访问ImportContext的便捷方式
 */
export const useImportContext = (): ImportContextValue => {
  const context = useContext(ImportContext);
  
  if (!context) {
    throw new Error('useImportContext必须在ImportContextProvider内使用');
  }
  
  return context;
};

/**
 * 条件性Hook - 仅在Context存在时使用
 */
export const useImportContextOptional = (): ImportContextValue | null => {
  return useContext(ImportContext);
};

/**
 * Context选择器 - 仅订阅特定状态变化
 */
export const useImportContextSelector = <T,>(
  selector: (context: ImportContextValue) => T
): T => {
  const context = useImportContext();
  return selector(context);
};

export default ImportContext;