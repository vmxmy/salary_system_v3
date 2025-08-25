/**
 * 管理员相关 Hook 统一导出
 * 
 * 包含：
 * - 系统设置管理
 * - 用户管理（已有）
 * - 权限管理
 */

// 系统设置管理
export * from './useSystemSettings';

// 用户管理（从user-management目录重新导出）
export * from '../user-management/useUserManagement';

// 权限管理
export * from '../permissions';