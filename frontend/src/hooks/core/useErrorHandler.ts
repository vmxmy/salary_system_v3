import { useCallback } from 'react';

/**
 * 统一错误处理Hook
 * 提供应用层面的错误处理策略
 */
export interface ErrorHandlerOptions {
  /** 是否显示Toast提示 */
  showToast?: boolean;
  /** 自定义错误消息 */
  customMessage?: string;
  /** 错误级别 */
  level?: 'error' | 'warning' | 'info';
  /** 是否上报错误（用于监控） */
  reportError?: boolean;
}

/**
 * 错误信息映射
 */
const ERROR_MESSAGES = {
  // 网络错误
  'fetch_error': '网络连接异常，请检查您的网络连接',
  'timeout': '请求超时，请稍后再试',
  'network_error': '网络错误，请检查网络连接',
  
  // 认证错误
  'auth_required': '请先登录后再进行操作',
  'permission_denied': '您没有执行此操作的权限',
  'token_expired': '登录已过期，请重新登录',
  
  // 数据错误
  'validation_failed': '数据验证失败，请检查输入内容',
  'duplicate_entry': '数据已存在，请勿重复提交',
  'not_found': '未找到相关数据',
  'foreign_key_violation': '数据关联异常，无法执行操作',
  
  // Supabase 特定错误
  'PGRST116': '数据不存在或已被删除',
  'PGRST204': '没有找到匹配的数据',
  '23505': '数据重复，该记录已存在',
  '23503': '数据关联错误，无法删除相关数据',
  '42501': '权限不足，无法执行此操作',
  
  // 默认错误
  'unknown_error': '操作失败，请稍后再试'
} as const;

/**
 * 错误类型定义
 */
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
  hint?: string;
}

/**
 * Toast服务接口（用于集成）
 */
export interface ToastService {
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

export function useErrorHandler(toastService?: ToastService) {

  /**
   * 解析错误信息
   */
  const parseError = useCallback((error: any): { message: string; code?: string } => {
    // Supabase 错误
    if (error?.code) {
      const supabaseMessage = ERROR_MESSAGES[error.code as keyof typeof ERROR_MESSAGES];
      if (supabaseMessage) {
        return { message: supabaseMessage, code: error.code };
      }
    }

    // HTTP 状态码错误
    if (error?.statusCode) {
      switch (error.statusCode) {
        case 400:
          return { message: '请求参数错误', code: 'bad_request' };
        case 401:
          return { message: ERROR_MESSAGES.auth_required, code: 'unauthorized' };
        case 403:
          return { message: ERROR_MESSAGES.permission_denied, code: 'forbidden' };
        case 404:
          return { message: ERROR_MESSAGES.not_found, code: 'not_found' };
        case 409:
          return { message: ERROR_MESSAGES.duplicate_entry, code: 'conflict' };
        case 422:
          return { message: ERROR_MESSAGES.validation_failed, code: 'validation_error' };
        case 500:
          return { message: '服务器内部错误，请联系管理员', code: 'server_error' };
        default:
          return { message: `服务器错误 (${error.statusCode})`, code: 'http_error' };
      }
    }

    // 网络错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { message: ERROR_MESSAGES.fetch_error, code: 'network_error' };
    }

    // 超时错误
    if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
      return { message: ERROR_MESSAGES.timeout, code: 'timeout' };
    }

    // 其他错误
    if (error?.message) {
      // 检查是否是已知错误类型
      const errorKey = Object.keys(ERROR_MESSAGES).find(key => 
        error.message.toLowerCase().includes(key.toLowerCase())
      ) as keyof typeof ERROR_MESSAGES;
      
      if (errorKey) {
        return { message: ERROR_MESSAGES[errorKey], code: errorKey };
      }
      
      return { message: error.message, code: 'custom_error' };
    }

    // 默认错误
    return { message: ERROR_MESSAGES.unknown_error, code: 'unknown_error' };
  }, []);

  /**
   * 处理错误的主要函数
   */
  const handleError = useCallback((
    error: any, 
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      customMessage,
      level = 'error',
      reportError = false
    } = options;

    const { message, code } = parseError(error);
    const finalMessage = customMessage || message;

    // 显示Toast通知
    if (showToast && toastService) {
      switch (level) {
        case 'error':
          toastService.showError(finalMessage, 5000);
          break;
        case 'warning':
          toastService.showWarning(finalMessage, 4000);
          break;
        case 'info':
          toastService.showInfo(finalMessage, 3000);
          break;
        default:
          toastService.showError(finalMessage, 5000);
      }
    } else if (showToast) {
      // 如果没有toast服务，使用控制台输出
      console.log(`[${level.toUpperCase()}] ${finalMessage}`);
    }

    // 错误上报（用于监控系统）
    if (reportError) {
      console.group('🚨 Error Report');
      console.error('Original Error:', error);
      console.error('Parsed Message:', finalMessage);
      console.error('Error Code:', code);
      console.error('Timestamp:', new Date().toISOString());
      console.groupEnd();
      
      // 这里可以集成错误监控服务（如 Sentry）
      // sentry.captureException(error, { tags: { code } });
    }

    // 开发环境下打印详细错误信息
    if (import.meta.env.DEV) {
      console.group(`🚨 Error Handler [${level.toUpperCase()}]`);
      console.error('Message:', finalMessage);
      console.error('Code:', code);
      console.error('Original Error:', error);
      console.groupEnd();
    }

    return { message: finalMessage, code };
  }, [parseError, toastService]);

  /**
   * 创建特定场景的错误处理器
   */
  const createErrorHandler = useCallback((
    defaultOptions: ErrorHandlerOptions = {}
  ) => {
    return (error: any, options: ErrorHandlerOptions = {}) => {
      return handleError(error, { ...defaultOptions, ...options });
    };
  }, [handleError]);

  /**
   * 网络错误处理器
   */
  const handleNetworkError = createErrorHandler({
    customMessage: '网络连接异常，请检查您的网络设置',
    level: 'error',
    reportError: true
  });

  /**
   * 验证错误处理器
   */
  const handleValidationError = createErrorHandler({
    level: 'warning',
    showToast: true
  });

  /**
   * 权限错误处理器
   */
  const handlePermissionError = createErrorHandler({
    customMessage: '您没有执行此操作的权限',
    level: 'error',
    reportError: false
  });

  return {
    handleError,
    createErrorHandler,
    handleNetworkError,
    handleValidationError,
    handlePermissionError,
    parseError
  };
}

/**
 * 错误边界Hook - 用于组件级别的错误处理
 */
export function useErrorBoundary() {
  const { handleError } = useErrorHandler();

  const captureError = useCallback((error: Error, errorInfo?: any) => {
    handleError(error, {
      reportError: true,
      customMessage: '组件渲染出现异常',
      showToast: true
    });
  }, [handleError]);

  return { captureError };
}