/**
 * 智能批处理器
 * 提供自适应批次大小调整和进度节流功能
 */

export interface BatchProcessorConfig {
  initialBatchSize?: number;
  minBatchSize?: number;
  maxBatchSize?: number;
  progressThrottleMs?: number;
  performanceThreshold?: number; // 毫秒
}

export interface BatchProcessorState {
  currentBatchSize: number;
  processedCount: number;
  totalCount: number;
  isProcessing: boolean;
  isCancelled: boolean;
  lastUpdateTime: number;
}

export interface BatchResult<T, R = T> {
  success: boolean;
  processedItems: T[];
  errors: Array<{
    index: number;
    item: R;
    error: string;
  }>;
  processingTime: number;
}

export class SmartBatchProcessor<T> {
  private config: Required<BatchProcessorConfig>;
  private state: BatchProcessorState;
  private abortController: AbortController;
  private progressCallback?: (progress: BatchProcessorState) => void;
  private lastProgressUpdate = 0;

  constructor(config: BatchProcessorConfig = {}) {
    this.config = {
      initialBatchSize: config.initialBatchSize ?? 50,
      minBatchSize: config.minBatchSize ?? 10,
      maxBatchSize: config.maxBatchSize ?? 200,
      progressThrottleMs: config.progressThrottleMs ?? 100,
      performanceThreshold: config.performanceThreshold ?? 1000,
    };

    this.state = {
      currentBatchSize: this.config.initialBatchSize,
      processedCount: 0,
      totalCount: 0,
      isProcessing: false,
      isCancelled: false,
      lastUpdateTime: Date.now(),
    };

    this.abortController = new AbortController();
  }

  /**
   * 设置进度回调函数
   */
  setProgressCallback(callback: (progress: BatchProcessorState) => void): void {
    this.progressCallback = callback;
  }

  /**
   * 取消当前处理
   */
  cancel(): void {
    this.state.isCancelled = true;
    this.abortController.abort();
  }

  /**
   * 重置处理器状态
   */
  reset(): void {
    this.state = {
      currentBatchSize: this.config.initialBatchSize,
      processedCount: 0,
      totalCount: 0,
      isProcessing: false,
      isCancelled: false,
      lastUpdateTime: Date.now(),
    };
    this.abortController = new AbortController();
    this.lastProgressUpdate = 0;
  }

  /**
   * 批量处理数据
   */
  async processBatches<R>(
    items: T[],
    processor: (batch: T[], signal: AbortSignal) => Promise<R[]>,
    onBatchComplete?: (result: BatchResult<R, T>, batchIndex: number) => void
  ): Promise<{
    results: R[];
    errors: Array<{ index: number; item: T; error: string }>;
    cancelled: boolean;
  }> {
    this.state.totalCount = items.length;
    this.state.processedCount = 0;
    this.state.isProcessing = true;
    this.state.isCancelled = false;

    const allResults: R[] = [];
    const allErrors: Array<{ index: number; item: T; error: string }> = [];
    let batchIndex = 0;

    try {
      while (this.state.processedCount < items.length && !this.state.isCancelled) {
        // 检查取消状态
        if (this.abortController.signal.aborted) {
          break;
        }

        // 计算当前批次
        const startIndex = this.state.processedCount;
        const endIndex = Math.min(
          startIndex + this.state.currentBatchSize,
          items.length
        );
        const batch = items.slice(startIndex, endIndex);

        // 处理批次
        const startTime = Date.now();
        try {
          const batchResults = await processor(batch, this.abortController.signal);
          const processingTime = Date.now() - startTime;

          // 调整批次大小
          this.adjustBatchSize(processingTime);

          // 收集结果
          allResults.push(...batchResults);

          // 更新进度
          this.state.processedCount = endIndex;
          this.updateProgress();

          // 调用批次完成回调
          if (onBatchComplete) {
            const batchResult: BatchResult<R, T> = {
              success: true,
              processedItems: batchResults,
              errors: [],
              processingTime,
            };
            onBatchComplete(batchResult, batchIndex);
          }

        } catch (error) {
          const processingTime = Date.now() - startTime;
          
          // 记录错误
          const batchErrors = batch.map((item, index) => ({
            index: startIndex + index,
            item,
            error: error instanceof Error ? error.message : String(error),
          }));
          
          allErrors.push(...batchErrors);

          // 更新进度（即使出错也要更新）
          this.state.processedCount = endIndex;
          this.updateProgress();

          // 调用批次完成回调
          if (onBatchComplete) {
            const batchResult: BatchResult<R, T> = {
              success: false,
              processedItems: [],
              errors: batchErrors,
              processingTime,
            };
            onBatchComplete(batchResult, batchIndex);
          }
        }

        batchIndex++;

        // 添加小延迟以避免阻塞UI
        if (batchIndex % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

    } finally {
      this.state.isProcessing = false;
    }

    return {
      results: allResults,
      errors: allErrors,
      cancelled: this.state.isCancelled,
    };
  }

  /**
   * 根据处理时间调整批次大小
   */
  private adjustBatchSize(processingTime: number): void {
    const { performanceThreshold, minBatchSize, maxBatchSize } = this.config;

    if (processingTime > performanceThreshold) {
      // 处理时间过长，减小批次大小
      this.state.currentBatchSize = Math.max(
        Math.floor(this.state.currentBatchSize * 0.8),
        minBatchSize
      );
    } else if (processingTime < performanceThreshold * 0.5) {
      // 处理时间较短，增加批次大小
      this.state.currentBatchSize = Math.min(
        Math.floor(this.state.currentBatchSize * 1.2),
        maxBatchSize
      );
    }
  }

  /**
   * 节流更新进度
   */
  private updateProgress(): void {
    const now = Date.now();
    if (now - this.lastProgressUpdate >= this.config.progressThrottleMs) {
      this.state.lastUpdateTime = now;
      this.progressCallback?.(this.state);
      this.lastProgressUpdate = now;
    }
  }

  /**
   * 获取当前状态
   */
  getState(): BatchProcessorState {
    return { ...this.state };
  }

  /**
   * 获取进度百分比
   */
  getProgressPercentage(): number {
    if (this.state.totalCount === 0) return 0;
    return Math.round((this.state.processedCount / this.state.totalCount) * 100);
  }
}