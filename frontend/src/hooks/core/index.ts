/**
 * 核心Hook库导出
 * 
 * 这个模块提供了应用程序核心的通用Hook功能：
 * - 统一的错误处理机制
 * - 细粒度的加载状态管理
 * - 通用的资源CRUD操作
 */

export { useErrorHandler, useErrorBoundary } from './useErrorHandler';
export { useErrorHandlerWithToast } from './useErrorHandlerWithToast';
export type { ErrorHandlerOptions, AppError, ToastService } from './useErrorHandler';

export { useLoadingState, useSimpleLoading } from './useLoadingState';
export type { LoadingState, LoadingAction, LoadingStateOptions } from './useLoadingState';

export { useResource, useResourceData } from './useResource';
export type { 
  ResourceService, 
  SupabaseTableConfig, 
  UseResourceOptions 
} from './useResource';