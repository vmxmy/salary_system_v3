import { supabase } from './supabase';

/**
 * Supabase查询重试工具
 * 为网络超时和连接问题提供自动重试机制
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryCondition: (error: any) => {
    // 重试条件：网络错误、超时错误、连接关闭等
    return (
      error?.message?.includes('timeout') ||
      error?.message?.includes('timed out') ||
      error?.message?.includes('network') ||
      error?.message?.includes('fetch') ||
      error?.message?.includes('Connection closed') ||
      error?.message?.includes('ERR_NETWORK') ||
      error?.code === '23' || // Supabase timeout code
      error?.code === 'PGRST301' || // 连接超时
      false
    );
  },
  onRetry: (attempt: number, error: any) => {
    console.warn(`[Supabase Retry] Attempt ${attempt} failed, retrying...`, error?.message || error);
  }
};

/**
 * 指数退避延迟计算
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * Math.pow(2, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * 带重试机制的Supabase操作执行器
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // 检查是否应该重试
      if (!config.retryCondition(error) || attempt === config.maxAttempts) {
        break;
      }

      // 执行重试回调
      config.onRetry(attempt, error);

      // 计算延迟时间并等待
      const delay = calculateDelay(attempt, config.baseDelay, config.maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Supabase查询构建器的重试包装器
 */
export class RetryableSupabaseQuery {
  private retryOptions: RetryOptions;

  constructor(retryOptions: RetryOptions = {}) {
    this.retryOptions = retryOptions;
  }

  /**
   * 包装Supabase查询以支持重试
   */
  async query<T>(queryBuilder: any): Promise<{ data: T | null; error: any }> {
    return withRetry(async () => {
      const result = await queryBuilder;
      return result;
    }, this.retryOptions);
  }

  /**
   * RPC调用重试包装器
   */
  async rpc<T>(functionName: any, params?: any): Promise<{ data: T; error: any }> {
    return withRetry(async () => {
      const result = await supabase.rpc(functionName, params);
      return result as { data: T; error: any };
    }, this.retryOptions);
  }

  /**
   * 视图查询重试包装器（优化大视图查询）
   */
  async viewQuery<T>(
    viewName: any,
    selectClause: string = '*',
    additionalOptions: {
      filters?: (query: any) => any;
      ordering?: (query: any) => any;
      limit?: number;
      timeout?: number;
    } = {}
  ): Promise<{ data: T[] | null; error: any }> {
    return withRetry(async () => {
      let query = supabase
        .from(viewName)
        .select(selectClause);

      // 应用筛选器
      if (additionalOptions.filters) {
        query = additionalOptions.filters(query);
      }

      // 应用排序
      if (additionalOptions.ordering) {
        query = additionalOptions.ordering(query);
      }

      // 应用限制
      if (additionalOptions.limit) {
        query = query.limit(additionalOptions.limit);
      }

      const result = await query;
      return result as { data: T[] | null; error: any };
    }, {
      ...this.retryOptions,
      maxAttempts: 2, // 视图查询重试次数较少，避免长时间等待
      baseDelay: 2000, // 视图查询延迟稍长
      onRetry: (attempt: number, error: any) => {
        console.warn(
          `[Supabase Retry] View query "${viewName}" attempt ${attempt} failed, retrying...`, 
          error?.message || error
        );
      }
    });
  }
}

/**
 * 创建默认的重试实例
 */
export const retryableSupabase = new RetryableSupabaseQuery({
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 8000,
});

/**
 * 为特定Hook创建重试实例
 */
export const createHookRetryInstance = (hookName: string) => {
  return new RetryableSupabaseQuery({
    maxAttempts: 2,
    baseDelay: 1500,
    maxDelay: 6000,
    onRetry: (attempt: number, error: any) => {
      console.warn(
        `[${hookName}] Query attempt ${attempt} failed, retrying...`, 
        error?.message || error
      );
    }
  });
};

/**
 * 快速重试实例（用于频繁调用的操作）
 */
export const fastRetrySupabase = new RetryableSupabaseQuery({
  maxAttempts: 2,
  baseDelay: 500,
  maxDelay: 3000,
});

/**
 * 慢查询重试实例（用于复杂查询和RPC）
 */
export const slowQueryRetrySupabase = new RetryableSupabaseQuery({
  maxAttempts: 2,
  baseDelay: 3000,
  maxDelay: 15000,
  retryCondition: (error: any) => {
    // 对慢查询更宽松的重试条件
    return (
      error?.message?.includes('timeout') ||
      error?.message?.includes('timed out') ||
      error?.message?.includes('Connection closed') ||
      error?.code === '23' ||
      false
    );
  }
});