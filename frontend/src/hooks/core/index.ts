/**
 * 核心Hook库导出
 * 
 * 这个模块提供了应用程序核心的通用Hook功能：
 * - 统一的错误处理机制
 * - 细粒度的加载状态管理
 * - 通用的资源CRUD操作
 * - 新架构：表格元数据和智能表格功能
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

// ============ 新架构：智能表格系统 ============

// 表格元数据相关
export { useTableMetadata, tableMetadataKeys } from './useTableMetadata';
export type { TableColumn, TableMetadata } from './useTableMetadata';

// 用户偏好设置相关
export { 
  useUserPreferences, 
  useTablePreferences, 
  generateDefaultColumnPreferences 
} from './useUserPreferences';
export type { ColumnPreference, TablePreferences } from './useUserPreferences';

// 智能表格列配置
export { useSmartTableColumns, smartTableColumnsKeys } from './useSmartTableColumns';
export type { TableOptions } from './useSmartTableColumns';

// 通用表格功能
export { useUniversalTable, universalTableKeys } from './useUniversalTable';
export type { UniversalTableOptions, TableAction } from './useUniversalTable';

// 新迁移的核心工具
export { useTableConfiguration } from './useTableConfiguration';
export { usePermission, PERMISSIONS } from './usePermission';
export { useConfirmDialog } from './useConfirmDialog';
export { useUserRole } from './useUserRole';