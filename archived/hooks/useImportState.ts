/**
 * useImportState Hook
 * 为薪资导入流程提供集中化状态管理
 * 
 * 功能特性:
 * - 配置状态管理 (月份、数据组、模式)
 * - 文件处理状态管理 (上传、解析、验证)
 * - 进度追踪状态管理 (阶段、进度百分比、当前操作)
 * - 错误和警告状态管理
 * - 结果状态管理 (成功、失败、重试)
 * - 状态验证和自动转换逻辑
 */

import { useState, useCallback, useRef } from 'react';
import { ImportDataGroup, ImportMode } from '@/types/payroll-import';
import type { ImportConfig, ExcelDataRow } from '@/types/payroll-import';
import type { 
  ImportPhase, 
  DetailedImportProgress, 
  FileProcessingState,
  ValidationResult,
  ImportStateConfig,
  ImportResult
} from '../types/enhanced-types';
import { getPhaseDescription, getProgressPercentage, validateExcelFile } from '../utils/import-helpers';
import { validateImportConfig, validateFileContent } from '../utils/validation-helpers';

/**
 * useImportState Hook 返回类型
 */
export interface UseImportStateReturn {
  // 核心状态
  config: ImportStateConfig;
  fileState: FileProcessingState;
  progress: DetailedImportProgress;
  validation: ValidationResult;
  result: ImportResult | null;
  
  // 配置操作
  updateSelectedMonth: (month: string) => void;
  updateSelectedDataGroups: (groups: ImportDataGroup[]) => void;
  toggleDataGroup: (group: ImportDataGroup) => void;
  selectAllDataGroups: () => void;
  updateImportMode: (mode: ImportMode) => void;
  updateImportOptions: (options: Partial<ImportConfig['options']>) => void;
  
  // 文件操作
  handleFileUpload: (file: File) => Promise<void>;
  clearFile: () => void;
  
  // 进度操作
  updateProgress: (updates: Partial<DetailedImportProgress>) => void;
  setCurrentPhase: (phase: ImportPhase) => void;
  resetProgress: () => void;
  
  // 验证操作
  validateConfiguration: () => ValidationResult;
  validateFile: (file: File) => ValidationResult;
  
  // 结果操作
  setImportResult: (result: ImportResult) => void;
  clearResult: () => void;
  
  // 重置操作
  resetAll: () => void;
  resetToConfiguration: () => void;
  
  // 状态查询
  isConfigValid: boolean;
  isReadyForImport: boolean;
  isProcessing: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  currentPhaseDescription: string;
  progressPercentage: number;
}

/**
 * 初始配置状态
 */
const createInitialConfig = (): ImportStateConfig => {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  return {
    selectedMonth: currentMonth,
    selectedDataGroups: [],
    importMode: ImportMode.UPSERT,
    selectedPeriodId: null,
    payPeriod: {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
    },
    options: {
      validateBeforeImport: true,
      skipInvalidRows: false,
      batchSize: 100
    }
  };
};

/**
 * 初始文件状态
 */
const createInitialFileState = (): FileProcessingState => ({
  file: null,
  fileName: '',
  fileSize: 0,
  parsedData: [],
  parseResult: null,
  isUploading: false,
  isParsing: false,
  isValidating: false
});

/**
 * 初始进度状态
 */
const createInitialProgress = (): DetailedImportProgress => ({
  phase: 'idle',
  global: {
    totalRecords: 0,
    processedRecords: 0
  },
  current: {
    groupName: '',
    totalRecords: 0,
    processedRecords: 0
  },
  startTime: null,
  estimatedEndTime: null,
  currentOperation: '',
  isActive: false
});

/**
 * 初始验证结果
 */
const createInitialValidation = (): ValidationResult => ({
  isValid: false,
  errors: [],
  warnings: [],
  timestamp: Date.now()
});

/**
 * useImportState Hook 实现
 */
export const useImportState = (): UseImportStateReturn => {
  // 核心状态
  const [config, setConfig] = useState<ImportStateConfig>(createInitialConfig);
  const [fileState, setFileState] = useState<FileProcessingState>(createInitialFileState);
  const [progress, setProgress] = useState<DetailedImportProgress>(createInitialProgress);
  const [validation, setValidation] = useState<ValidationResult>(createInitialValidation);
  const [result, setResult] = useState<ImportResult | null>(null);
  
  // 引用状态用于异步操作
  const configRef = useRef(config);
  const fileStateRef = useRef(fileState);
  
  // 更新引用
  configRef.current = config;
  fileStateRef.current = fileState;

  // 配置操作
  const updateSelectedMonth = useCallback((month: string) => {
    const [year, monthNum] = month.split('-');
    const start = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const end = new Date(parseInt(year), parseInt(monthNum), 0);
    
    setConfig(prev => ({
      ...prev,
      selectedMonth: month,
      payPeriod: { start, end },
      selectedPeriodId: null // 重置周期ID，需要重新获取
    }));
  }, []);

  const updateSelectedDataGroups = useCallback((groups: ImportDataGroup[]) => {
    setConfig(prev => ({
      ...prev,
      selectedDataGroups: groups
    }));
  }, []);

  const toggleDataGroup = useCallback((group: ImportDataGroup) => {
    setConfig(prev => {
      const currentGroups = prev.selectedDataGroups;
      const newGroups = currentGroups.includes(group)
        ? currentGroups.filter(g => g !== group)
        : [...currentGroups, group];
      
      return {
        ...prev,
        selectedDataGroups: newGroups
      };
    });
  }, []);

  const selectAllDataGroups = useCallback(() => {
    const allGroups = [
      ImportDataGroup.EARNINGS,
      ImportDataGroup.CONTRIBUTION_BASES,
      ImportDataGroup.CATEGORY_ASSIGNMENT,
      ImportDataGroup.JOB_ASSIGNMENT
    ];
    
    setConfig(prev => {
      const isAllSelected = prev.selectedDataGroups.length === allGroups.length && 
        allGroups.every(group => prev.selectedDataGroups.includes(group));
      
      return {
        ...prev,
        selectedDataGroups: isAllSelected ? [] : allGroups
      };
    });
  }, []);

  const updateImportMode = useCallback((mode: ImportMode) => {
    setConfig(prev => ({
      ...prev,
      importMode: mode
    }));
  }, []);

  const updateImportOptions = useCallback((options: Partial<ImportConfig['options']>) => {
    setConfig(prev => ({
      ...prev,
      options: {
        ...prev.options,
        ...options
      }
    }));
  }, []);

  // 文件操作
  const handleFileUpload = useCallback(async (file: File) => {
    setFileState(prev => ({
      ...prev,
      isUploading: true
    }));

    try {
      // 基础文件验证
      const fileValidation = validateExcelFile(file);
      if (!fileValidation.isValid) {
        setValidation(prev => ({
          ...prev,
          errors: [...prev.errors, fileValidation.error || '文件验证失败'],
          isValid: false
        }));
        return;
      }

      // 更新文件状态
      setFileState(prev => ({
        ...prev,
        file,
        fileName: file.name,
        fileSize: file.size,
        isUploading: false,
        isParsing: true
      }));

      // 这里可以触发文件解析逻辑
      // 实际解析逻辑会在 useFileProcessor Hook 中实现
      console.log('文件上传成功，准备解析:', file.name);
      
    } catch (error) {
      console.error('文件上传失败:', error);
      setFileState(prev => ({
        ...prev,
        isUploading: false,
        isParsing: false
      }));
      
      setValidation(prev => ({
        ...prev,
        errors: [...prev.errors, '文件上传失败'],
        isValid: false
      }));
    }
  }, []);

  const clearFile = useCallback(() => {
    setFileState(createInitialFileState());
    setValidation(createInitialValidation());
    setResult(null);
  }, []);

  // 进度操作
  const updateProgress = useCallback((updates: Partial<DetailedImportProgress>) => {
    setProgress(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  const setCurrentPhase = useCallback((phase: ImportPhase) => {
    setProgress(prev => ({
      ...prev,
      phase,
      isActive: phase !== 'idle' && phase !== 'completed' && phase !== 'error',
      startTime: phase === 'parsing' && !prev.startTime ? Date.now() : prev.startTime
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(createInitialProgress());
  }, []);

  // 验证操作
  const validateConfiguration = useCallback((): ValidationResult => {
    const configValidation = validateImportConfig({
      dataGroup: config.selectedDataGroups,
      mode: config.importMode,
      payPeriod: config.payPeriod,
      options: config.options
    });

    const newValidation: ValidationResult = {
      isValid: configValidation.isValid,
      errors: configValidation.errors,
      warnings: configValidation.warnings,
      timestamp: Date.now()
    };

    setValidation(newValidation);
    return newValidation;
  }, [config]);

  const validateFile = useCallback((file: File): ValidationResult => {
    const fileValidation = validateExcelFile(file);
    
    const newValidation: ValidationResult = {
      isValid: fileValidation.isValid,
      errors: fileValidation.error ? [fileValidation.error] : [],
      warnings: [],
      timestamp: Date.now()
    };

    setValidation(newValidation);
    return newValidation;
  }, []);

  // 结果操作
  const setImportResult = useCallback((importResult: ImportResult) => {
    setResult(importResult);
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  // 重置操作
  const resetAll = useCallback(() => {
    setConfig(createInitialConfig());
    setFileState(createInitialFileState());
    setProgress(createInitialProgress());
    setValidation(createInitialValidation());
    setResult(null);
  }, []);

  const resetToConfiguration = useCallback(() => {
    setFileState(createInitialFileState());
    setProgress(createInitialProgress());
    setResult(null);
    // 重置验证状态
    setValidation(createInitialValidation());
  }, []);

  // 状态查询（计算属性）
  const isConfigValid = config.selectedMonth !== '' && config.selectedDataGroups.length > 0;
  const isReadyForImport = isConfigValid && fileState.file !== null && validation.isValid;
  const isProcessing = fileState.isUploading || fileState.isParsing || fileState.isValidating || progress.isActive;
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;
  const currentPhaseDescription = getPhaseDescription(progress.phase);
  const progressPercentage = getProgressPercentage(progress.global.processedRecords, progress.global.totalRecords);

  return {
    // 核心状态
    config,
    fileState,
    progress,
    validation,
    result,
    
    // 配置操作
    updateSelectedMonth,
    updateSelectedDataGroups,
    toggleDataGroup,
    selectAllDataGroups,
    updateImportMode,
    updateImportOptions,
    
    // 文件操作
    handleFileUpload,
    clearFile,
    
    // 进度操作
    updateProgress,
    setCurrentPhase,
    resetProgress,
    
    // 验证操作
    validateConfiguration,
    validateFile,
    
    // 结果操作
    setImportResult,
    clearResult,
    
    // 重置操作
    resetAll,
    resetToConfiguration,
    
    // 状态查询
    isConfigValid,
    isReadyForImport,
    isProcessing,
    hasErrors,
    hasWarnings,
    currentPhaseDescription,
    progressPercentage
  };
};