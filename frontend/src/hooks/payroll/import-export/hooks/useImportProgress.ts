import { useState, useCallback } from 'react';
import type { ImportProgress } from '../types';

/**
 * 导入进度管理 Hook
 */
export function useImportProgress() {
  // 基础进度状态
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    phase: 'parsing',
    global: {
      totalGroups: 0,
      processedGroups: 0,
      totalRecords: 0,
      processedRecords: 0,
      dataGroups: []
    },
    current: {
      groupName: '',
      groupIndex: 0,
      sheetName: '',
      totalRecords: 0,
      processedRecords: 0
    },
    errors: [],
    warnings: []
  });

  /**
   * 初始化进度
   */
  const initializeProgress = useCallback((totalRecords: number, dataGroups: string[]) => {
    console.log('🚀 初始化进度管理器');
    
    setImportProgress({
      phase: 'parsing',
      global: {
        totalGroups: dataGroups.length,
        processedGroups: 0,
        totalRecords,
        processedRecords: 0,
        dataGroups
      },
      current: {
        groupName: dataGroups[0] || '',
        groupIndex: 0,
        sheetName: dataGroups[0] || '',
        totalRecords: 0,
        processedRecords: 0
      },
      errors: [],
      warnings: []
    });
  }, []);

  /**
   * 更新进度
   */
  const updateProgress = useCallback((updates: Partial<ImportProgress>) => {
    setImportProgress(prev => ({
      ...prev,
      ...updates,
      global: updates.global ? { ...prev.global, ...updates.global } : prev.global,
      current: updates.current ? { ...prev.current, ...updates.current } : prev.current,
      errors: updates.errors || prev.errors,
      warnings: updates.warnings || prev.warnings
    }));
  }, []);

  /**
   * 添加错误
   */
  const addError = useCallback((error: any) => {
    setImportProgress(prev => ({
      ...prev,
      errors: [...prev.errors, error]
    }));
  }, []);

  /**
   * 添加警告
   */
  const addWarning = useCallback((warning: any) => {
    setImportProgress(prev => ({
      ...prev,
      warnings: [...prev.warnings, warning]
    }));
  }, []);

  /**
   * 设置当前阶段
   */
  const setPhase = useCallback((phase: ImportProgress['phase']) => {
    setImportProgress(prev => ({
      ...prev,
      phase
    }));
  }, []);

  /**
   * 设置消息
   */
  const setMessage = useCallback((message: string) => {
    setImportProgress(prev => ({
      ...prev,
      message
    }));
  }, []);

  /**
   * 重置进度
   */
  const resetProgress = useCallback(() => {
    setImportProgress({
      phase: 'parsing',
      global: {
        totalGroups: 0,
        processedGroups: 0,
        totalRecords: 0,
        processedRecords: 0,
        dataGroups: []
      },
      current: {
        groupName: '',
        groupIndex: 0,
        sheetName: '',
        totalRecords: 0,
        processedRecords: 0
      },
      errors: [],
      warnings: []
    });
  }, []);

  /**
   * 取消导入操作
   */
  const cancelImport = useCallback(() => {
    console.log('🛑 取消导入操作');
    
    setImportProgress(prev => ({
      ...prev,
      phase: 'error',
      message: '导入操作已取消'
    }));
  }, []);

  /**
   * 完成导入
   */
  const completeImport = useCallback((summary?: {
    totalProcessed: number;
    successCount: number;
    errorCount: number;
  }) => {
    const message = summary 
      ? `导入完成: 处理 ${summary.totalProcessed} 条，成功 ${summary.successCount} 条，失败 ${summary.errorCount} 条`
      : '导入完成';
    
    setImportProgress(prev => ({
      ...prev,
      phase: 'completed',
      message
    }));
  }, []);

  return {
    // 状态
    importProgress,
    enhancedProgress: null, // 暂时设为null
    progressManager: null, // 暂时设为null
    
    // 操作方法
    initializeProgress,
    updateProgress,
    addError,
    addWarning,
    setPhase,
    setMessage,
    resetProgress,
    cancelImport,
    completeImport
  };
}