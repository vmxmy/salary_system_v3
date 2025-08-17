/**
 * 进度管理器
 * 整合批处理器和权重进度计算器，提供统一的进度管理接口
 */

import { SmartBatchProcessor } from './SmartBatchProcessor';
import type { BatchProcessorConfig, BatchProcessorState } from './SmartBatchProcessor';
import { WeightedProgressCalculator } from './WeightedProgressCalculator';
import type { ProgressPhase, ProgressSnapshot } from './WeightedProgressCalculator';

export interface EnhancedImportProgress {
  // 基本进度信息
  phase: 'parsing' | 'validating' | 'importing' | 'creating_payrolls' | 'inserting_items' | 'completed' | 'error';
  
  // 全局进度
  global: {
    totalGroups: number;
    processedGroups: number;
    totalRecords: number;
    processedRecords: number;
    dataGroups: string[];
  };
  
  // 当前数据组进度
  current: {
    groupName: string;
    groupIndex: number;
    sheetName: string;
    totalRecords: number;
    processedRecords: number;
    currentRecord?: number;
    successCount?: number;
    errorCount?: number;
  };
  
  // 增强的进度信息
  enhanced: {
    // 权重进度
    weightedProgress: ProgressSnapshot;
    
    // 批处理状态
    batchProcessor: {
      currentBatchSize: number;
      isProcessing: boolean;
      processingSpeed?: number; // 记录/秒
    };
    
    // 控制状态
    canCancel: boolean;
    isCancelling: boolean;
    
    // 性能指标
    performance: {
      averageProcessingTime: number; // 毫秒
      memoryUsage?: number; // MB
      estimatedTimeRemaining?: number; // 秒
    };
  };
  
  // 进度消息
  message?: string;
  
  errors: any[];
  warnings: any[];
}

export interface ProgressManagerConfig {
  batchProcessor?: BatchProcessorConfig;
  enablePerformanceMonitoring?: boolean;
  progressUpdateInterval?: number; // 毫秒
}

export class ProgressManager {
  private batchProcessor: SmartBatchProcessor<any>;
  private progressCalculator: WeightedProgressCalculator;
  private config: ProgressManagerConfig;
  private progressCallback?: (progress: EnhancedImportProgress) => void;
  private performanceData: {
    processingTimes: number[];
    memoryUsages: number[];
    startTime: number;
  };
  private currentProgress: Partial<EnhancedImportProgress>;

  constructor(
    totalRecords: number,
    dataGroups: string[],
    config: ProgressManagerConfig = {}
  ) {
    this.config = {
      enablePerformanceMonitoring: config.enablePerformanceMonitoring ?? true,
      progressUpdateInterval: config.progressUpdateInterval ?? 100,
      ...config,
    };

    // 初始化批处理器
    this.batchProcessor = new SmartBatchProcessor(config.batchProcessor);
    this.batchProcessor.setProgressCallback(this.handleBatchProgress.bind(this));

    // 初始化权重进度计算器
    const phases = WeightedProgressCalculator.createPayrollImportPhases(totalRecords, dataGroups);
    this.progressCalculator = new WeightedProgressCalculator({ phases });

    // 初始化性能数据
    this.performanceData = {
      processingTimes: [],
      memoryUsages: [],
      startTime: Date.now(),
    };

    // 初始化当前进度
    this.currentProgress = {
      phase: 'parsing',
      global: {
        totalGroups: dataGroups.length,
        processedGroups: 0,
        totalRecords,
        processedRecords: 0,
        dataGroups,
      },
      current: {
        groupName: '',
        groupIndex: 0,
        sheetName: '',
        totalRecords: 0,
        processedRecords: 0,
        successCount: 0,
        errorCount: 0,
      },
      enhanced: {
        weightedProgress: this.progressCalculator.getProgressSnapshot(),
        batchProcessor: {
          currentBatchSize: this.batchProcessor.getState().currentBatchSize,
          isProcessing: false,
        },
        canCancel: true,
        isCancelling: false,
        performance: {
          averageProcessingTime: 0,
        },
      },
      errors: [],
      warnings: [],
    };
  }

  /**
   * 设置进度回调函数
   */
  setProgressCallback(callback: (progress: EnhancedImportProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * 开始新的阶段
   */
  startPhase(
    phase: EnhancedImportProgress['phase'],
    message?: string,
    totalSteps?: number
  ): void {
    this.currentProgress.phase = phase;
    this.currentProgress.message = message;

    // 更新权重进度计算器
    if (totalSteps !== undefined) {
      const phaseObj = this.progressCalculator.getPhaseDetails().find(p => p.name === phase);
      if (phaseObj) {
        phaseObj.totalSteps = totalSteps;
      }
    }

    this.progressCalculator.updatePhase(phase, 0, true);
    this.updateProgress();
  }

  /**
   * 更新当前阶段进度
   */
  updatePhaseProgress(
    completedSteps: number,
    currentRecord?: number,
    message?: string
  ): void {
    if (!this.currentProgress.phase) return;

    // 更新权重进度计算器
    this.progressCalculator.updatePhase(this.currentProgress.phase, completedSteps);

    // 更新当前记录信息
    if (this.currentProgress.current) {
      this.currentProgress.current.processedRecords = completedSteps;
      if (currentRecord !== undefined) {
        this.currentProgress.current.currentRecord = currentRecord;
      }
    }

    // 更新全局进度
    if (this.currentProgress.global) {
      this.currentProgress.global.processedRecords = Math.min(
        (this.currentProgress.global.processedRecords || 0) + 1,
        this.currentProgress.global.totalRecords
      );
    }

    if (message) {
      this.currentProgress.message = message;
    }

    this.updateProgress();
  }

  /**
   * 更新当前数据组信息
   */
  updateCurrentGroup(
    groupName: string,
    groupIndex: number,
    sheetName: string,
    totalRecords: number
  ): void {
    if (this.currentProgress.current) {
      this.currentProgress.current.groupName = groupName;
      this.currentProgress.current.groupIndex = groupIndex;
      this.currentProgress.current.sheetName = sheetName;
      this.currentProgress.current.totalRecords = totalRecords;
      this.currentProgress.current.processedRecords = 0;
      this.currentProgress.current.successCount = 0;
      this.currentProgress.current.errorCount = 0;
    }

    this.updateProgress();
  }

  /**
   * 添加成功记录
   */
  addSuccess(count = 1): void {
    if (this.currentProgress.current) {
      this.currentProgress.current.successCount = 
        (this.currentProgress.current.successCount || 0) + count;
    }
    this.updateProgress();
  }

  /**
   * 添加错误记录
   */
  addError(error: any, count = 1): void {
    if (this.currentProgress.current) {
      this.currentProgress.current.errorCount = 
        (this.currentProgress.current.errorCount || 0) + count;
    }
    
    this.currentProgress.errors = this.currentProgress.errors || [];
    this.currentProgress.errors.push(error);
    
    this.updateProgress();
  }

  /**
   * 添加警告
   */
  addWarning(warning: any): void {
    this.currentProgress.warnings = this.currentProgress.warnings || [];
    this.currentProgress.warnings.push(warning);
    this.updateProgress();
  }

  /**
   * 完成当前数据组
   */
  completeCurrentGroup(): void {
    if (this.currentProgress.global) {
      this.currentProgress.global.processedGroups += 1;
    }
    this.updateProgress();
  }

  /**
   * 批量处理数据
   */
  async processBatch<T, R>(
    items: T[],
    processor: (batch: T[], signal: AbortSignal) => Promise<R[]>
  ): Promise<{
    results: R[];
    errors: Array<{ index: number; item: T; error: string }>;
    cancelled: boolean;
  }> {
    return await this.batchProcessor.processBatches(
      items,
      processor,
      (result, batchIndex) => {
        // 更新性能数据
        this.recordPerformanceData(result.processingTime);
        
        // 更新进度
        this.updatePhaseProgress(
          this.batchProcessor.getState().processedCount,
          undefined,
          `处理批次 ${batchIndex + 1}`
        );
      }
    );
  }

  /**
   * 取消当前操作
   */
  cancel(): void {
    if (this.currentProgress.enhanced) {
      this.currentProgress.enhanced.isCancelling = true;
      this.currentProgress.enhanced.canCancel = false;
    }
    
    this.batchProcessor.cancel();
    this.updateProgress();
  }

  /**
   * 重置进度管理器
   */
  reset(): void {
    this.batchProcessor.reset();
    this.progressCalculator.reset();
    
    this.performanceData = {
      processingTimes: [],
      memoryUsages: [],
      startTime: Date.now(),
    };

    // 重置进度状态
    if (this.currentProgress.global) {
      this.currentProgress.global.processedGroups = 0;
      this.currentProgress.global.processedRecords = 0;
    }
    
    if (this.currentProgress.current) {
      this.currentProgress.current.processedRecords = 0;
      this.currentProgress.current.successCount = 0;
      this.currentProgress.current.errorCount = 0;
    }
    
    if (this.currentProgress.enhanced) {
      this.currentProgress.enhanced.canCancel = true;
      this.currentProgress.enhanced.isCancelling = false;
    }
    
    this.currentProgress.errors = [];
    this.currentProgress.warnings = [];
    
    this.updateProgress();
  }

  /**
   * 获取当前进度
   */
  getCurrentProgress(): EnhancedImportProgress {
    return this.buildProgressSnapshot();
  }

  // 私有方法

  private handleBatchProgress(batchState: BatchProcessorState): void {
    if (this.currentProgress.enhanced) {
      this.currentProgress.enhanced.batchProcessor = {
        currentBatchSize: batchState.currentBatchSize,
        isProcessing: batchState.isProcessing,
        processingSpeed: this.calculateProcessingSpeed(),
      };
    }
    this.updateProgress();
  }

  private recordPerformanceData(processingTime: number): void {
    if (!this.config.enablePerformanceMonitoring) return;

    this.performanceData.processingTimes.push(processingTime);
    
    // 保持数组大小限制
    if (this.performanceData.processingTimes.length > 50) {
      this.performanceData.processingTimes.shift();
    }

    // 记录内存使用（如果可用）
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        this.performanceData.memoryUsages.push(memoryUsage);
        
        if (this.performanceData.memoryUsages.length > 20) {
          this.performanceData.memoryUsages.shift();
        }
      }
    }
  }

  private calculateProcessingSpeed(): number {
    const elapsedTime = (Date.now() - this.performanceData.startTime) / 1000; // 秒
    const totalProcessed = this.currentProgress.global?.processedRecords || 0;
    
    return elapsedTime > 0 ? totalProcessed / elapsedTime : 0;
  }

  private calculateAverageProcessingTime(): number {
    const times = this.performanceData.processingTimes;
    if (times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  private calculateMemoryUsage(): number | undefined {
    const usages = this.performanceData.memoryUsages;
    if (usages.length === 0) return undefined;
    
    return usages[usages.length - 1]; // 返回最新的内存使用量
  }

  private updateProgress(): void {
    if (this.progressCallback) {
      const progress = this.buildProgressSnapshot();
      this.progressCallback(progress);
    }
  }

  private buildProgressSnapshot(): EnhancedImportProgress {
    const weightedProgress = this.progressCalculator.getProgressSnapshot();
    const batchState = this.batchProcessor.getState();

    return {
      phase: this.currentProgress.phase!,
      global: this.currentProgress.global!,
      current: this.currentProgress.current!,
      enhanced: {
        weightedProgress,
        batchProcessor: {
          currentBatchSize: batchState.currentBatchSize,
          isProcessing: batchState.isProcessing,
          processingSpeed: this.calculateProcessingSpeed(),
        },
        canCancel: !batchState.isCancelled && !(this.currentProgress.enhanced?.isCancelling),
        isCancelling: this.currentProgress.enhanced?.isCancelling || false,
        performance: {
          averageProcessingTime: this.calculateAverageProcessingTime(),
          memoryUsage: this.calculateMemoryUsage(),
          estimatedTimeRemaining: weightedProgress.estimatedTimeRemaining,
        },
      },
      message: this.currentProgress.message,
      errors: this.currentProgress.errors || [],
      warnings: this.currentProgress.warnings || [],
    };
  }
}