/**
 * Unified Error Handling System for Data Sources
 * 数据源操作的统一错误处理系统
 */

import { DATA_SOURCE_CONFIG } from '../config/dataSourceConfig';

// 数据源特定的错误类型
export class DataSourceError extends Error {
  constructor(
    message: string,
    public readonly code: DataSourceErrorCode,
    public readonly context: string,
    public readonly cause?: Error,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DataSourceError';
    
    // 保持错误堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DataSourceError);
    }
  }

  // 创建带有上下文的错误
  static withContext(context: string, cause: unknown, metadata?: Record<string, unknown>): DataSourceError {
    const message = cause instanceof Error ? cause.message : String(cause);
    const code = inferErrorCode(message);
    
    return new DataSourceError(
      `[${context}] ${message}`,
      code,
      context,
      cause instanceof Error ? cause : undefined,
      metadata
    );
  }

  // 创建验证错误
  static validation(field: string, value: unknown, reason: string): DataSourceError {
    return new DataSourceError(
      `Validation failed for ${field}: ${reason}`,
      DataSourceErrorCode.VALIDATION_ERROR,
      'validation',
      undefined,
      { field, value, reason }
    );
  }

  // 创建网络错误
  static network(operation: string, cause?: Error): DataSourceError {
    return new DataSourceError(
      `Network error during ${operation}`,
      DataSourceErrorCode.NETWORK_ERROR,
      'network',
      cause,
      { operation }
    );
  }

  // 创建权限错误
  static permission(resource: string, action: string): DataSourceError {
    return new DataSourceError(
      `Permission denied: cannot ${action} ${resource}`,
      DataSourceErrorCode.PERMISSION_ERROR,
      'permission',
      undefined,
      { resource, action }
    );
  }
}

// 错误代码枚举
export enum DataSourceErrorCode {
  // 网络相关错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_CLOSED = 'CONNECTION_CLOSED',
  
  // 认证和授权错误
  AUTH_ERROR = 'AUTH_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // 数据相关错误
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  INVALID_DATA_FORMAT = 'INVALID_DATA_FORMAT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // 配置错误
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  
  // 系统错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// 错误推断函数
function inferErrorCode(message: string): DataSourceErrorCode {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('connection') && lowerMessage.includes('closed')) {
    return DataSourceErrorCode.CONNECTION_CLOSED;
  }
  if (lowerMessage.includes('timeout')) {
    return DataSourceErrorCode.TIMEOUT_ERROR;
  }
  if (lowerMessage.includes('permission') || lowerMessage.includes('forbidden')) {
    return DataSourceErrorCode.PERMISSION_ERROR;
  }
  if (lowerMessage.includes('auth') || lowerMessage.includes('unauthorized')) {
    return DataSourceErrorCode.AUTH_ERROR;
  }
  if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
    return DataSourceErrorCode.DATA_NOT_FOUND;
  }
  if (lowerMessage.includes('invalid') && lowerMessage.includes('token')) {
    return DataSourceErrorCode.INVALID_TOKEN;
  }
  
  return DataSourceErrorCode.UNKNOWN_ERROR;
}

// 日志级别类型
type LogLevel = typeof DATA_SOURCE_CONFIG.ERROR_HANDLING.LOG_LEVELS[keyof typeof DATA_SOURCE_CONFIG.ERROR_HANDLING.LOG_LEVELS];

// 统一的日志记录器
export class DataSourceLogger {
  private static prefix = '[DataSource]';

  static error(context: string, error: unknown, metadata?: Record<string, unknown>): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${this.prefix}[${context}]`, message, metadata);
    
    // 在开发环境中，也打印错误堆栈
    if (import.meta.env.DEV && error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
  }

  static warn(context: string, message: string, metadata?: Record<string, unknown>): void {
    console.warn(`${this.prefix}[${context}]`, message, metadata);
  }

  static info(context: string, message: string, metadata?: Record<string, unknown>): void {
    console.info(`${this.prefix}[${context}]`, message, metadata);
  }

  static debug(context: string, message: string, metadata?: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      console.debug(`${this.prefix}[${context}]`, message, metadata);
    }
  }

  static log(level: LogLevel, context: string, message: string, metadata?: Record<string, unknown>): void {
    const logMethod = this[level] || this.info;
    logMethod.call(this, context, message, metadata);
  }
}

// 错误处理结果类型
export interface ErrorHandlingResult<T> {
  data: T | null;
  error: DataSourceError | null;
  success: boolean;
}

// 安全执行函数，带有统一的错误处理
export async function safeExecute<T>(
  operation: () => Promise<T>,
  context: string,
  options?: {
    retries?: number;
    retryDelay?: number;
    logLevel?: LogLevel;
    metadata?: Record<string, unknown>;
  }
): Promise<ErrorHandlingResult<T>> {
  const {
    retries = DATA_SOURCE_CONFIG.ERROR_HANDLING.MAX_RETRIES,
    retryDelay = DATA_SOURCE_CONFIG.ERROR_HANDLING.RETRY_DELAY_MS,
    logLevel = 'info',
    metadata = {}
  } = options || {};

  let lastError: DataSourceError | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      DataSourceLogger.debug(context, `Attempt ${attempt + 1}/${retries + 1}`, metadata);
      
      const result = await operation();
      
      if (attempt > 0) {
        DataSourceLogger.info(context, `Operation succeeded after ${attempt + 1} attempts`, metadata);
      }
      
      return {
        data: result,
        error: null,
        success: true
      };
      
    } catch (error) {
      lastError = error instanceof DataSourceError 
        ? error 
        : DataSourceError.withContext(context, error, metadata);
      
      DataSourceLogger.log(
        attempt < retries ? 'warn' : 'error', 
        context, 
        `Attempt ${attempt + 1} failed: ${lastError.message}`,
        { ...metadata, attempt, willRetry: attempt < retries }
      );
      
      // 如果还有重试机会，等待后继续
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  return {
    data: null,
    error: lastError,
    success: false
  };
}

// 带超时的安全执行函数
export async function safeExecuteWithTimeout<T>(
  operation: () => Promise<T>,
  context: string,
  timeoutMs: number = DATA_SOURCE_CONFIG.QUERY_LIMITS.TIMEOUT_MS,
  options?: Parameters<typeof safeExecute>[2]
): Promise<ErrorHandlingResult<T>> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new DataSourceError(
        `Operation timed out after ${timeoutMs}ms`,
        DataSourceErrorCode.TIMEOUT_ERROR,
        context
      ));
    }, timeoutMs);
  });

  const operationWithTimeout = () => Promise.race([operation(), timeoutPromise]);
  
  return safeExecute(operationWithTimeout, context, options);
}

// 错误恢复策略
export interface ErrorRecoveryStrategy<T> {
  canRecover(error: DataSourceError): boolean;
  recover(error: DataSourceError): Promise<T>;
}

// 使用恢复策略的安全执行
export async function safeExecuteWithRecovery<T>(
  operation: () => Promise<T>,
  context: string,
  recoveryStrategies: ErrorRecoveryStrategy<T>[],
  options?: Parameters<typeof safeExecute>[2]
): Promise<ErrorHandlingResult<T>> {
  const result = await safeExecute(operation, context, options);
  
  if (result.success || !result.error) {
    return result;
  }

  // 尝试错误恢复
  for (const strategy of recoveryStrategies) {
    if (strategy.canRecover(result.error)) {
      try {
        DataSourceLogger.info(context, 'Attempting error recovery', { 
          errorCode: result.error.code,
          strategy: strategy.constructor.name 
        });
        
        const recoveredData = await strategy.recover(result.error);
        
        DataSourceLogger.info(context, 'Error recovery successful');
        
        return {
          data: recoveredData,
          error: null,
          success: true
        };
      } catch (recoveryError) {
        DataSourceLogger.warn(context, 'Error recovery failed', { 
          recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError) 
        });
      }
    }
  }

  return result;
}

// 批量操作的错误处理
export async function safeBatchExecute<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  context: string,
  options?: {
    concurrency?: number;
    continueOnError?: boolean;
    logLevel?: LogLevel;
  }
): Promise<{
  results: (R | null)[];
  errors: (DataSourceError | null)[];
  successCount: number;
  failureCount: number;
}> {
  const {
    concurrency = DATA_SOURCE_CONFIG.QUERY_LIMITS.MAX_CONCURRENT_QUERIES,
    continueOnError = true,
    logLevel = 'info'
  } = options || {};

  const results: (R | null)[] = [];
  const errors: (DataSourceError | null)[] = [];
  let successCount = 0;
  let failureCount = 0;

  // 分批处理以控制并发
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchPromises = batch.map(async (item, batchIndex) => {
      const globalIndex = i + batchIndex;
      const itemContext = `${context}[${globalIndex}]`;
      
      const result = await safeExecute(
        () => operation(item),
        itemContext,
        { logLevel }
      );
      
      results[globalIndex] = result.data;
      errors[globalIndex] = result.error;
      
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        if (!continueOnError) {
          throw result.error;
        }
      }
    });

    await Promise.all(batchPromises);
  }

  DataSourceLogger.log(logLevel, context, 'Batch operation completed', {
    total: items.length,
    successful: successCount,
    failed: failureCount,
    successRate: ((successCount / items.length) * 100).toFixed(1) + '%'
  });

  return { results, errors, successCount, failureCount };
}