/**
 * 网络请求重试工具
 * 提供智能重试机制和渐进式超时策略
 */

import { networkAwareTimeout, type TimeoutConfig } from './network-aware-timeout';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;      // 初始延迟（毫秒）
  maxDelay: number;          // 最大延迟（毫秒）
  backoffFactor: number;     // 退避因子
  timeoutMultiplier: number; // 每次重试时超时时间的倍数
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

class NetworkRetry {
  // 不同网络质量对应的重试配置
  private readonly retryConfigs: Record<string, RetryConfig> = {
    excellent: {
      maxRetries: 2,
      initialDelay: 500,
      maxDelay: 2000,
      backoffFactor: 1.5,
      timeoutMultiplier: 1.2
    },
    good: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 4000,
      backoffFactor: 1.8,
      timeoutMultiplier: 1.5
    },
    fair: {
      maxRetries: 4,
      initialDelay: 2000,
      maxDelay: 8000,
      backoffFactor: 2.0,
      timeoutMultiplier: 2.0
    },
    poor: {
      maxRetries: 5,
      initialDelay: 3000,
      maxDelay: 15000,
      backoffFactor: 2.2,
      timeoutMultiplier: 2.5
    },
    offline: {
      maxRetries: 1,
      initialDelay: 5000,
      maxDelay: 5000,
      backoffFactor: 1.0,
      timeoutMultiplier: 1.0
    }
  };

  /**
   * 执行带重试的异步操作
   */
  public async executeWithRetry<T>(
    operation: (signal: AbortSignal, attempt: number) => Promise<T>,
    operationType: keyof TimeoutConfig = 'api',
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const startTime = performance.now();
    const networkInfo = networkAwareTimeout.getNetworkInfo();
    const retryConfig = { 
      ...this.retryConfigs[networkInfo.quality], 
      ...customConfig 
    };
    
    let lastError: Error | null = null;
    let delay = retryConfig.initialDelay;
    
    console.log(`[NetworkRetry] Starting operation with ${retryConfig.maxRetries + 1} max attempts (network: ${networkInfo.quality})`);

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        // 计算当前尝试的超时时间（逐步增加）
        const baseTimeout = networkInfo.timeouts[operationType];
        const currentTimeout = Math.min(
          baseTimeout * Math.pow(retryConfig.timeoutMultiplier, attempt),
          baseTimeout * 3 // 最大不超过基础超时的3倍
        );
        
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          controller.abort();
        }, currentTimeout);

        console.log(`[NetworkRetry] Attempt ${attempt + 1}/${retryConfig.maxRetries + 1}, timeout: ${currentTimeout}ms`);

        try {
          const result = await operation(controller.signal, attempt + 1);
          clearTimeout(timeout);
          
          const totalTime = performance.now() - startTime;
          console.log(`[NetworkRetry] Success on attempt ${attempt + 1}, total time: ${totalTime.toFixed(0)}ms`);
          
          return {
            success: true,
            data: result,
            attempts: attempt + 1,
            totalTime
          };
        } catch (error) {
          clearTimeout(timeout);
          throw error;
        }
      } catch (error) {
        lastError = error as Error;
        
        // 最后一次尝试失败，不需要等待
        if (attempt === retryConfig.maxRetries) {
          break;
        }
        
        // 判断是否应该重试
        if (!this.shouldRetry(lastError, attempt + 1)) {
          console.log(`[NetworkRetry] Non-retryable error: ${lastError.message}`);
          break;
        }
        
        console.warn(`[NetworkRetry] Attempt ${attempt + 1} failed: ${lastError.message}, retrying in ${delay}ms...`);
        
        // 等待后重试
        await this.sleep(delay);
        
        // 增加下次重试的延迟（指数退避）
        delay = Math.min(
          delay * retryConfig.backoffFactor,
          retryConfig.maxDelay
        );
      }
    }

    const totalTime = performance.now() - startTime;
    console.error(`[NetworkRetry] All ${retryConfig.maxRetries + 1} attempts failed, total time: ${totalTime.toFixed(0)}ms`);
    
    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attempts: retryConfig.maxRetries + 1,
      totalTime
    };
  }

  /**
   * 判断错误是否可以重试
   */
  private shouldRetry(error: Error, attemptNumber: number): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // 不可重试的错误
    const nonRetryableErrors = [
      'unauthorized',
      'forbidden',
      'not found',
      'bad request',
      'unprocessable entity',
      'invalid',
      '401',
      '403',
      '404',
      '400',
      '422'
    ];
    
    if (nonRetryableErrors.some(msg => errorMessage.includes(msg))) {
      return false;
    }
    
    // 可重试的错误
    const retryableErrors = [
      'timeout',
      'network',
      'connection',
      'fetch',
      'abort',
      'too many requests',
      'server error',
      'service unavailable',
      'bad gateway',
      '408',
      '429',
      '500',
      '502',
      '503',
      '504'
    ];
    
    const isRetryable = retryableErrors.some(msg => errorMessage.includes(msg));
    
    // 对于网络质量差的环境，更宽容的重试策略
    const networkQuality = networkAwareTimeout.getNetworkInfo().quality;
    if (['poor', 'fair'].includes(networkQuality)) {
      return isRetryable || attemptNumber <= 3; // 前3次尝试都重试
    }
    
    return isRetryable;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 创建具有重试功能的fetch函数
   */
  public createRetryFetch() {
    return async (
      url: string | URL, 
      options: RequestInit = {}, 
      operationType: keyof TimeoutConfig = 'api'
    ): Promise<Response> => {
      const result = await this.executeWithRetry(
        async (signal, attempt) => {
          console.log(`[RetryFetch] Fetching ${url}, attempt ${attempt}`);
          return fetch(url, {
            ...options,
            signal
          });
        },
        operationType
      );

      if (result.success && result.data) {
        return result.data;
      } else {
        throw result.error || new Error('Fetch failed after all retries');
      }
    };
  }

  /**
   * 获取当前网络质量对应的重试配置
   */
  public getRetryConfig(): RetryConfig {
    const networkQuality = networkAwareTimeout.getNetworkInfo().quality;
    return this.retryConfigs[networkQuality];
  }
}

// 创建全局实例
export const networkRetry = new NetworkRetry();

// 导出便捷函数
export const retryFetch = networkRetry.createRetryFetch();

export const executeWithRetry = <T>(
  operation: (signal: AbortSignal, attempt: number) => Promise<T>,
  operationType: keyof TimeoutConfig = 'api',
  customConfig?: Partial<RetryConfig>
): Promise<RetryResult<T>> => {
  return networkRetry.executeWithRetry(operation, operationType, customConfig);
};

export default networkRetry;