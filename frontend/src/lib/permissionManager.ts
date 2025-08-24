/**
 * 权限管理器导出文件
 * 
 * 为了保持向后兼容性，这个文件重新导出统一权限管理器
 * 所有现有的Hook系统将无缝切换到新的权限系统
 * 
 * @deprecated 请直接使用 unifiedPermissionManager
 */

// 导入统一权限管理器
import { 
  unifiedPermissionManager, 
  UnifiedPermissionManager, 
  PermissionError 
} from './unifiedPermissionManager';

// 为了兼容性，重新导出为原始名称
export const permissionManager = unifiedPermissionManager;
export { UnifiedPermissionManager as PermissionManager, PermissionError };

// 导出类型定义（保持不变）
export type {
  IPermissionManager,
  Permission,
  Role,
  PermissionContext,
  PermissionResult,
  PermissionCacheItem,
  PermissionChangeEvent,
  PermissionSubscriptionConfig,
  PermissionRule,
  PermissionManagerConfig,
  ResourceId
} from '@/types/permission';