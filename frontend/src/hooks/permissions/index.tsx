/**
 * 权限 Hooks 统一入口
 * 
 * 提供一套完整的权限管理 Hooks：
 * - useEnhancedPermission: 增强的权限验证
 * - useRole: 角色管理
 * - useResource: 资源访问控制
 * - usePermissionRequest: 权限申请管理
 * - usePermissions: 统一权限管理入口
 */

import React from 'react';

// 导出所有权限相关 hooks
export { useEnhancedPermission } from './useEnhancedPermission';
export { useRole, roleUtils, ROLE_HIERARCHY } from './useRole';
export { useResource, resourceUtils } from './useResource';
export { usePermissionRequest, permissionRequestUtils } from './usePermissionRequest';

// 导出权限管理器
export { permissionManager, PermissionManager } from '@/lib/permissionManager';

// 导出类型定义
export type {
  Permission,
  Role,
  PermissionContext,
  PermissionResult,
  ResourceId,
  UsePermissionOptions,
  UsePermissionReturn,
  UseRoleReturn,
  UseResourceOptions,
  UseResourceReturn,
  UsePermissionRequestReturn,
  PermissionRequest,
  PermissionRequestStatus,
  PermissionChangeEvent,
  PermissionRule,
  DynamicPermission,
  PermissionError,
  ResourceAccessError,
  RoleEscalationError
} from '@/types/permission';

// 导出权限常量
export { PERMISSIONS, ROLE_PERMISSIONS } from '@/constants/permissions';

import { useCallback } from 'react';
import { useEnhancedPermission } from './useEnhancedPermission';
import { useRole } from './useRole';
import { useResource } from './useResource';
import { usePermissionRequest } from './usePermissionRequest';
import type { 
  Permission,
  UsePermissionOptions,
  UseResourceOptions,
  ResourceId
} from '@/types/permission';

/**
 * 统一权限管理 Hook
 * 
 * 整合了所有权限相关功能，提供一个统一的接口
 */
export function usePermissions(options: UsePermissionOptions = {}) {
  const permission = useEnhancedPermission(options);
  const role = useRole();
  const request = usePermissionRequest();

  // 创建资源访问控制实例的工厂方法
  const createResourceControl = useCallback((resourceOptions: UseResourceOptions) => {
    return useResource({ ...options, ...resourceOptions });
  }, [options]);

  // 便捷的资源访问方法
  const forResource = useCallback((
    resourceType: ResourceId['type'],
    resourceId?: string,
    scope?: 'own' | 'department' | 'all'
  ) => {
    return createResourceControl({
      resourceType,
      resourceId,
      scope,
      checkOwnership: scope === 'own',
      ...options
    });
  }, [createResourceControl, options]);

  return {
    // 基础权限功能
    ...permission,
    
    // 角色管理
    role: role.role,
    isRole: role.isRole,
    hasRoleLevel: role.hasRoleLevel,
    rolePermissions: role.rolePermissions,
    canEscalate: role.canEscalate,
    switchRole: role.switchRole,
    requestRole: role.requestRole,
    
    // 权限申请管理
    requestPermission: request.requestPermission,
    requestTemporaryPermission: request.requestTemporaryPermission,
    getMyRequests: request.getMyRequests,
    getPendingRequests: request.getPendingRequests,
    approveRequest: request.approveRequest,
    rejectRequest: request.rejectRequest,
    myRequests: request.myRequests,
    pendingRequests: request.pendingRequests,
    
    // 资源访问控制工厂
    createResourceControl,
    forResource,
    
    // 组合状态
    loading: permission.loading || role.loading || request.loading,
    error: permission.error || role.error || request.error,
  };
}

// 便捷的权限检查函数
export const createPermissionChecker = (options: UsePermissionOptions = {}) => {
  return (permission: Permission, resourceId?: string) => {
    const { hasPermission } = useEnhancedPermission(options);
    return hasPermission(permission, resourceId);
  };
};

// 权限装饰器工厂（用于类组件或函数）
export const withPermission = (
  permission: Permission | Permission[],
  options: UsePermissionOptions = {}
) => {
  return function <T extends React.ComponentType<any>>(Component: T): T {
    const PermissionWrapper = (props: any) => {
      const { hasPermission, hasAllPermissions } = useEnhancedPermission(options);
      
      const hasRequiredPermissions = Array.isArray(permission)
        ? hasAllPermissions(permission)
        : hasPermission(permission);

      if (!hasRequiredPermissions) {
        return (
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>您没有访问此功能的权限。</span>
          </div>
        );
      }

      return <Component {...props} />;
    };

    return PermissionWrapper as T;
  };
};

// 权限路由守卫工厂
export const createPermissionGuard = (
  permission: Permission | Permission[],
  options: UsePermissionOptions = {}
) => {
  return ({ children }: { children: React.ReactNode }) => {
    const { hasPermission, hasAllPermissions, loading } = useEnhancedPermission(options);
    
    if (loading) {
      return (
        <div className="flex justify-center items-center p-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      );
    }
    
    const hasRequiredPermissions = Array.isArray(permission)
      ? hasAllPermissions(permission)
      : hasPermission(permission);

    if (!hasRequiredPermissions) {
      return (
        <div className="hero min-h-screen bg-base-200">
          <div className="hero-content text-center">
            <div className="max-w-md">
              <div className="text-6xl mb-4">🔒</div>
              <h1 className="text-5xl font-bold">访问受限</h1>
              <p className="py-6">
                您没有访问此页面的权限。如需访问，请联系管理员申请相应权限。
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => window.history.back()}
              >
                返回上一页
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <>{children}</>;
  };
};