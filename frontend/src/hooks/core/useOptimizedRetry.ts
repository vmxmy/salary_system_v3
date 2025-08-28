import { useState, useCallback, useRef, useEffect } from 'react';
import { getOptimizedConfig } from '@/lib/performanceConfig';

/**
 * 优化的重试机制Hook
 * 基于数据库性能提升调整重试策略
 */
export interface RetryOptions {
  // 最大重试次数
  maxRetries?: number;
  
  // 基础延迟时间（毫秒）
  baseDelay?: number;
  
  // 退避乘数
  backoffMultiplier?: number;
  
  // 最大延迟时间
  maxDelay?: number;
  
  // 网络错误快速重试延迟
  networkErrorDelay?: number;
  
  // 重试条件判断函数
  shouldRetry?: (error: any, attempt: number) => boolean;
  
  // 重试前的回调
  onRetry?: (error: any, attempt: number) => void;
  
  // 最终失败的回调
  onFinalFailure?: (error: any, totalAttempts: number) => void;
}

export function useOptimizedRetry<T>(
  asyncFunction: () => Promise<T>,
  options: RetryOptions = {}
) {
  const config = getOptimizedConfig();
  
  const {
    maxRetries = config.retry.maxRetries,
    baseDelay = config.retry.retryDelay,
    backoffMultiplier = config.retry.backoffMultiplier,
    maxDelay = config.retry.maxRetryDelay,
    networkErrorDelay = config.retry.networkErrorDelay,
    shouldRetry = defaultShouldRetry,
    onRetry,
    onFinalFailure,
  } = options;

  const [isRetrying, setIsRetrying] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastError, setLastError] = useState<any>(null);
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false);

  // 清理重试定时器
  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // 计算延迟时间
  const calculateDelay = useCallback((attempt: number, error: any): number => {
    // 网络错误使用快速重试
    if (isNetworkError(error)) {
      return networkErrorDelay;
    }
    
    // 指数退避
    const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
    return Math.min(delay, maxDelay);
  }, [baseDelay, backoffMultiplier, maxDelay, networkErrorDelay]);

  // 执行重试逻辑
  const executeWithRetry = useCallback(async (): Promise<T> => {
    isCancelledRef.current = false;
    setIsRetrying(false);
    setAttemptCount(0);
    setLastError(null);
    clearRetryTimeout();

    let lastAttemptError: any = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      if (isCancelledRef.current) {
        throw new Error('Retry cancelled');
      }

      setAttemptCount(attempt);

      try {
        const result = await asyncFunction();
        
        // 成功，重置状态
        setIsRetrying(false);
        setLastError(null);
        return result;
        
      } catch (error) {
        lastAttemptError = error;
        setLastError(error);

        // 检查是否应该重试
        if (attempt > maxRetries || !shouldRetry(error, attempt)) {
          break;
        }

        // 触发重试回调
        onRetry?.(error, attempt);
        
        // 计算延迟并等待
        const delay = calculateDelay(attempt, error);
        setIsRetrying(true);
        
        await new Promise<void>((resolve, reject) => {
          retryTimeoutRef.current = setTimeout(() => {
            if (isCancelledRef.current) {
              reject(new Error('Retry cancelled'));
            } else {
              resolve();
            }
          }, delay);
        });
      }
    }

    // 所有重试都失败了
    setIsRetrying(false);
    onFinalFailure?.(lastAttemptError, attemptCount);
    throw lastAttemptError;

  }, [
    asyncFunction,
    maxRetries,
    shouldRetry,
    onRetry,
    onFinalFailure,
    calculateDelay,
    clearRetryTimeout,
  ]);

  // 取消重试
  const cancelRetry = useCallback(() => {
    isCancelledRef.current = true;
    clearRetryTimeout();
    setIsRetrying(false);
  }, [clearRetryTimeout]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      clearRetryTimeout();
    };
  }, [clearRetryTimeout]);

  return {
    executeWithRetry,
    cancelRetry,
    isRetrying,
    attemptCount,
    lastError,
    maxRetries,
  };
}

// 默认重试条件判断
function defaultShouldRetry(error: any, attempt: number): boolean {
  // 网络错误总是重试
  if (isNetworkError(error)) {
    return true;
  }
  
  // 服务器错误（5xx）重试
  if (error?.status >= 500 && error?.status < 600) {
    return true;
  }
  
  // 超时错误重试
  if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
    return true;
  }
  
  // Supabase特定的可重试错误
  if (error?.message?.includes('network error') || 
      error?.message?.includes('Connection closed') ||
      error?.message?.includes('Failed to fetch')) {
    return true;
  }
  
  // 客户端错误（4xx）通常不重试，除了429（限流）
  if (error?.status === 429) {
    return true;
  }
  
  return false;
}

// 判断是否为网络错误
function isNetworkError(error: any): boolean {
  return (
    error?.name === 'NetworkError' ||
    error?.message?.includes('network error') ||
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('ERR_CONNECTION') ||
    error?.message?.includes('ERR_NETWORK') ||
    !navigator.onLine
  );
}

/**
 * 快速重试Hook - 用于简单查询
 */
export function useQuickRetry<T>(asyncFunction: () => Promise<T>) {
  return useOptimizedRetry(asyncFunction, {
    maxRetries: 2,
    baseDelay: 300,
    backoffMultiplier: 1.2,
  });
}

/**
 * 网络重试Hook - 专门处理网络相关错误
 */
export function useNetworkRetry<T>(asyncFunction: () => Promise<T>) {
  return useOptimizedRetry(asyncFunction, {
    maxRetries: 5,
    baseDelay: getOptimizedConfig().retry.networkErrorDelay,
    shouldRetry: (error) => isNetworkError(error),
  });
}

/**
 * API调用重试Hook - 用于API请求
 */
export function useApiRetry<T>(asyncFunction: () => Promise<T>) {
  return useOptimizedRetry(asyncFunction, {
    onRetry: (error, attempt) => {
      console.warn(`API call failed (attempt ${attempt}):`, error.message);
    },
    onFinalFailure: (error, attempts) => {
      console.error(`API call failed after ${attempts} attempts:`, error);
    },
  });
}