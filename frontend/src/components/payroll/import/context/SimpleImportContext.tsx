/**
 * 简化版ImportContext - 用于演示和测试
 * 避免复杂的类型依赖问题，专注于核心功能演示
 */

import React, { createContext, useContext, useCallback, useRef, useState, useMemo } from 'react';
import { ImportDataGroup } from '@/types/payroll-import';

/**
 * 简化的导入阶段枚举
 */
export const SimpleImportPhase = {
  CONFIGURATION: 'configuration',
  FILE_PROCESSING: 'file_processing', 
  DATA_VALIDATION: 'data_validation',
  DATA_IMPORT: 'data_import',
  COMPLETED: 'completed'
} as const;

export type SimpleImportPhaseType = typeof SimpleImportPhase[keyof typeof SimpleImportPhase];

/**
 * 简化的Context值类型
 */
export interface SimpleImportContextValue {
  // === 基础状态 ===
  currentState: {
    phase: SimpleImportPhaseType;
    selectedMonth: string;
    selectedDataGroups: ImportDataGroup[];
    hasFile: boolean;
    isProcessing: boolean;
    hasErrors: boolean;
    canProceed: boolean;
  };
  
  // === 进度信息 ===
  progress: {
    overall: number; // 0-100
    phase: SimpleImportPhaseType;
    message: string;
    isActive: boolean;
  };
  
  // === 错误管理 ===
  errors: {
    configErrors: string[];
    fileErrors: string[];
    processErrors: string[];
    hasAnyError: boolean;
  };
  
  // === 事件处理 ===
  notifyConfigChange: (config: { month?: string; dataGroups?: ImportDataGroup[] }) => void;
  notifyFileChange: (fileState: { hasFile: boolean; fileName?: string; fileSize?: number }) => void;
  notifyProgress: (progress: { phase: SimpleImportPhaseType; progress: number; message?: string }) => void;
  notifyError: (error: { source: 'config' | 'file' | 'process'; message: string }) => void;
  clearErrors: (source?: 'config' | 'file' | 'process') => void;
  
  // === 生命周期 ===
  resetImport: () => Promise<void>;
  startImport: () => Promise<void>;
  toggleImport: () => void;
  completeImport: () => Promise<void>;
  
  // === 调试 ===
  sessionId: string;
  getDiagnostics: () => {
    stateSnapshot: any;
    timeLine: Array<{ timestamp: number; event: string; data?: any }>;
    performance: { startTime: number; currentTime: number; duration: number };
  };
}

/**
 * Context创建
 */
const SimpleImportContext = createContext<SimpleImportContextValue | null>(null);

/**
 * Provider Props
 */
export interface SimpleImportContextProviderProps {
  children: React.ReactNode;
  initialConfig?: {
    month?: string;
    dataGroups?: ImportDataGroup[];
  };
  debug?: boolean;
  onStateChange?: (state: SimpleImportContextValue['currentState']) => void;
  onProgressChange?: (progress: SimpleImportContextValue['progress']) => void;
  onError?: (error: any) => void;
  onComplete?: (result: any) => void;
}

/**
 * 简化版Provider实现
 */
export const SimpleImportContextProvider: React.FC<SimpleImportContextProviderProps> = ({
  children,
  initialConfig,
  debug = false,
  onStateChange,
  onProgressChange,
  onError,
  onComplete
}) => {
  // === 内部状态 ===
  const sessionId = useRef(Date.now().toString());
  const timeLineRef = useRef<Array<{ timestamp: number; event: string; data?: any }>>([]);
  const startTimeRef = useRef(Date.now());
  
  const [state, setState] = useState({
    phase: SimpleImportPhase.CONFIGURATION as SimpleImportPhaseType,
    selectedMonth: initialConfig?.month || '2025-01',
    selectedDataGroups: initialConfig?.dataGroups || [ImportDataGroup.EARNINGS],
    hasFile: false,
    isProcessing: false,
    fileName: '',
    fileSize: 0,
    overallProgress: 0,
    progressMessage: '准备中...',
    errors: {
      config: [] as string[],
      file: [] as string[],
      process: [] as string[]
    }
  });

  // === 工具函数 ===
  const logEvent = useCallback((event: string, data?: any) => {
    const timestamp = Date.now();
    timeLineRef.current.push({ timestamp, event, data });
    if (debug) {
      console.log(`[SimpleImportContext:${sessionId.current}] ${event}`, data);
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
               state.errors.process.length > 0,
    canProceed: state.selectedMonth !== '' &&
                state.selectedDataGroups.length > 0 &&
                state.hasFile &&
                !state.isProcessing
  }), [state]);

  const progress = useMemo(() => ({
    overall: state.overallProgress,
    phase: state.phase,
    message: state.progressMessage,
    isActive: state.isProcessing
  }), [state.overallProgress, state.phase, state.progressMessage, state.isProcessing]);

  const errors = useMemo(() => ({
    configErrors: state.errors.config,
    fileErrors: state.errors.file,
    processErrors: state.errors.process,
    hasAnyError: state.errors.config.length > 0 || 
                 state.errors.file.length > 0 || 
                 state.errors.process.length > 0
  }), [state.errors]);

  // === 事件处理器 ===
  const notifyConfigChange = useCallback((config: { month?: string; dataGroups?: ImportDataGroup[] }) => {
    logEvent('config_changed', config);
    setState(prev => ({
      ...prev,
      selectedMonth: config.month ?? prev.selectedMonth,
      selectedDataGroups: config.dataGroups ?? prev.selectedDataGroups,
      errors: {
        ...prev.errors,
        config: [] // 清除配置错误
      }
    }));
  }, [logEvent]);

  const notifyFileChange = useCallback((fileState: { hasFile: boolean; fileName?: string; fileSize?: number }) => {
    logEvent('file_changed', fileState);
    setState(prev => ({
      ...prev,
      hasFile: fileState.hasFile,
      fileName: fileState.fileName || '',
      fileSize: fileState.fileSize || 0,
      errors: {
        ...prev.errors,
        file: fileState.hasFile ? [] : prev.errors.file // 清除文件错误
      }
    }));
  }, [logEvent]);

  const notifyProgress = useCallback((progressUpdate: { phase: SimpleImportPhaseType; progress: number; message?: string }) => {
    logEvent('progress_updated', progressUpdate);
    setState(prev => ({
      ...prev,
      phase: progressUpdate.phase,
      overallProgress: progressUpdate.progress,
      progressMessage: progressUpdate.message || prev.progressMessage
    }));
  }, [logEvent]);

  const notifyError = useCallback((error: { source: 'config' | 'file' | 'process'; message: string }) => {
    logEvent('error_reported', error);
    setState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [error.source]: [...prev.errors[error.source], error.message]
      }
    }));
    if (onError) {
      onError(error);
    }
  }, [logEvent, onError]);

  const clearErrors = useCallback((source?: 'config' | 'file' | 'process') => {
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
          errors: { config: [], file: [], process: [] }
        };
      }
    });
  }, [logEvent]);

  // === 生命周期管理 ===
  const resetImport = useCallback(async () => {
    logEvent('import_reset_started');
    setState({
      phase: SimpleImportPhase.CONFIGURATION as SimpleImportPhaseType,
      selectedMonth: initialConfig?.month || '2025-01',
      selectedDataGroups: initialConfig?.dataGroups || [ImportDataGroup.EARNINGS],
      hasFile: false,
      isProcessing: false,
      fileName: '',
      fileSize: 0,
      overallProgress: 0,
      progressMessage: '准备中...',
      errors: { config: [], file: [], process: [] }
    });
    timeLineRef.current = [];
    startTimeRef.current = Date.now();
    logEvent('import_reset_completed');
  }, [initialConfig, logEvent]);

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
    
    setState(prev => ({
      ...prev,
      phase: SimpleImportPhase.DATA_IMPORT as SimpleImportPhaseType,
      isProcessing: true,
      progressMessage: '开始导入...'
    }));
    logEvent('import_started');
  }, [currentState.canProceed, logEvent, notifyError]);

  const toggleImport = useCallback(() => {
    setState(prev => {
      const newProcessingState = !prev.isProcessing;
      logEvent('import_toggled', { isProcessing: newProcessingState });
      return {
        ...prev,
        isProcessing: newProcessingState,
        progressMessage: newProcessingState ? '处理中...' : '已暂停'
      };
    });
  }, [logEvent]);

  const completeImport = useCallback(async () => {
    logEvent('import_completion_started');
    setState(prev => ({
      ...prev,
      phase: SimpleImportPhase.COMPLETED as SimpleImportPhaseType,
      isProcessing: false,
      overallProgress: 100,
      progressMessage: '导入完成'
    }));
    
    const result = {
      sessionId: sessionId.current,
      duration: Date.now() - startTimeRef.current,
      finalState: currentState
    };
    
    if (onComplete) {
      onComplete(result);
    }
    logEvent('import_completed', result);
  }, [currentState, onComplete, logEvent]);

  // === 调试功能 ===
  const getDiagnostics = useCallback(() => ({
    stateSnapshot: { currentState, progress, errors },
    timeLine: timeLineRef.current,
    performance: {
      startTime: startTimeRef.current,
      currentTime: Date.now(),
      duration: Date.now() - startTimeRef.current
    }
  }), [currentState, progress, errors]);

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
  const contextValue: SimpleImportContextValue = {
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
    <SimpleImportContext.Provider value={contextValue}>
      {children}
    </SimpleImportContext.Provider>
  );
};

/**
 * Hook访问Context
 */
export const useSimpleImportContext = (): SimpleImportContextValue => {
  const context = useContext(SimpleImportContext);
  if (!context) {
    throw new Error('useSimpleImportContext必须在SimpleImportContextProvider内使用');
  }
  return context;
};

export default SimpleImportContext;