/**
 * 新版权限 Hooks 统一入口 - 完整版
 * 
 * 提供一套完整的权限管理 Hooks，完全基于新的 unified_permission_config 系统：
 * - usePermission: 核心权限检查
 * - useRole: 角色管理
 * - usePermissionRequest: 权限申请管理
 * - usePermissionApproval: 权限审批管理
 * - useResourceAccess: 资源访问控制
 * - usePermissions: 统一权限管理入口
 */

import React, { useCallback, useMemo } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { usePermission } from './usePermission';
import { useRole } from './useRole';
// 重新启用所有权限Hook - 编译错误已修复
import { usePermissionRequest } from './usePermissionRequest';
import { usePermissionApproval } from './usePermissionApproval';
import { useResourceAccess } from './useResourceAccess';

// 导出所有权限相关 hooks
export { usePermission } from './usePermission';
export { useRole } from './useRole';
export { usePermissionRequest } from './usePermissionRequest';
export { usePermissionApproval } from './usePermissionApproval';
export { useResourceAccess } from './useResourceAccess';

// usePermissions 将在文件末尾通过默认导出提供

// 导出权限管理器
export { unifiedPermissionManager } from '@/lib/unifiedPermissionManager';

// 导出类型定义
export type {
  Permission,
  Role,
  PermissionContext,
  PermissionResult,
  UsePermissionOptions,
  UsePermissionReturn,
  UseRoleReturn,
  UsePermissionRequestReturn,
  UseResourceReturn,
  PermissionRequest,
  PermissionRequestStatus,
  PermissionChangeEvent,
  PermissionRule,
  ResourceId
} from '@/types/permission';

// 权限申请系统类型定义 (temporarily disabled)
// export type {
//   PermissionRequestFilter,
//   PermissionRequestStats,
//   PermissionRequestOptions,
//   BatchPermissionRequestOptions
// } from './usePermissionRequest';

// 资源访问控制类型定义 (temporarily disabled)
// export type {
//   ResourceType,
//   ResourceAccessOptions,
//   ResourceAction
// } from './useResourceAccess';

// 导出权限常量
export { PERMISSIONS, ROLE_PERMISSIONS } from '@/constants/permissions';

import type { 
  Permission,
  UsePermissionOptions
} from '@/types/permission';

/**
 * 统一权限管理配置
 */
export interface UsePermissionsOptions extends UsePermissionOptions {
  enableResourceAccess?: boolean;
  enableRoleManagement?: boolean;
  enablePermissionRequests?: boolean;
  enableApprovalWorkflow?: boolean;
}

/**
 * 权限守卫组件属性
 */
interface PermissionGuardProps {
  children: React.ReactNode;
  permissions: Permission[];
  mode?: 'requireAll' | 'requireAny';
  fallback?: React.ReactNode;
}

/**
 * 角色守卫组件属性
 */
interface RoleGuardProps {
  children: React.ReactNode;
  roles: string | string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

/**
 * 统一权限管理Hook
 * 
 * 集成所有权限相关功能，提供一个统一的入口
 */
export function usePermissions(options: UsePermissionsOptions = {}) {
  const { user } = useUnifiedAuth();
  const {
    enableResourceAccess = true,
    enableRoleManagement = true,
    enablePermissionRequests = true,
    enableApprovalWorkflow = true,
    ...permissionOptions
  } = options;

  // 构建基础权限上下文
  const baseContext = useMemo(() => ({
    user: user ? {
      id: user.id,
      email: user.email,
      role: user.role as any,
      departmentId: user.departmentId,
      managedDepartments: user.managedDepartments
    } : undefined,
    timestamp: new Date(),
  }), [user]);

  // 核心权限Hook
  const permissionHook = usePermission(permissionOptions);
  
  // 角色管理Hook (条件加载)
  const roleHook = useRole();
  
  // 重新启用高级权限Hook
  const requestHook = enablePermissionRequests ? usePermissionRequest() : undefined;
  const approvalHook = enableApprovalWorkflow ? usePermissionApproval() : undefined;
  const resourceHook = enableResourceAccess ? useResourceAccess({
    resourceType: 'system',
    fallbackResult: false
  }) : undefined;

  // 快速权限检查 (简化版本)
  const can = useCallback(async (permission: Permission, resourceId?: string): Promise<boolean> => {
    return permissionHook.hasPermission(permission, resourceId);
  }, [permissionHook]);

  return {
    // === 核心权限功能 ===
    checkPermission: permissionHook.checkPermission,
    checkMultiplePermissions: permissionHook.checkMultiplePermissions,
    hasPermission: permissionHook.hasPermission,
    hasAnyPermission: permissionHook.hasAnyPermission,
    hasAllPermissions: permissionHook.hasAllPermissions,
    clearPermissionCache: permissionHook.clearCache,
    
    // === 角色管理 ===
    ...(enableRoleManagement && {
      role: roleHook.role,
      rolePermissions: roleHook.rolePermissions,
      isRole: roleHook.isRole,
      hasRoleLevel: roleHook.hasRoleLevel,
      canEscalate: roleHook.canEscalate,
      switchRole: roleHook.switchRole,
      requestRole: roleHook.requestRole,
    }),
    
    // === 权限申请功能 ===
    ...(enablePermissionRequests && requestHook && {
      requestPermission: requestHook.requestPermission,
      fetchMyRequests: requestHook.fetchMyRequests,
      cancelRequest: requestHook.cancelRequest,
      myRequests: requestHook.myRequests,
    }),
    
    // === 权限审批功能 ===
    ...(enableApprovalWorkflow && approvalHook && {
      approveRequest: approvalHook.approveRequest,
      fetchPendingRequests: approvalHook.fetchPendingRequests,
      pendingRequests: approvalHook.pendingRequests,
      canApprove: approvalHook.canApprove,
    }),
    
    // === 资源访问控制功能 ===
    ...(enableResourceAccess && resourceHook && {
      checkResourceAccess: resourceHook.checkResourceAccess,
      canView: resourceHook.canView,
      canCreate: resourceHook.canCreate,
      canUpdate: resourceHook.canUpdate,
      canDelete: resourceHook.canDelete,
      canExport: resourceHook.canExport,
      canManage: resourceHook.canManage,
    }),
    
    // === 高级功能 ===
    can,
    
    // === 权限守卫组件 ===
    PermissionGuard: ({ children, permissions, mode = 'requireAll', fallback }: PermissionGuardProps) => {
      const [hasPermission, setHasPermission] = React.useState(false);
      const [checking, setChecking] = React.useState(true);
      
      React.useEffect(() => {
        const checkPermissions = async () => {
          setChecking(true);
          try {
            let result: boolean;
            if (mode === 'requireAll') {
              result = await permissionHook.hasAllPermissions(permissions);
            } else {
              result = await permissionHook.hasAnyPermission(permissions);
            }
            setHasPermission(result);
          } catch (error) {
            console.error('Permission check failed:', error);
            setHasPermission(false);
          } finally {
            setChecking(false);
          }
        };
        
        checkPermissions();
      }, [permissions, mode]);
      
      if (checking) {
        return null; // 或者返回加载指示器
      }
      
      if (!hasPermission) {
        return fallback ? <>{fallback}</> : null;
      }
      
      return <>{children}</>;
    },
    
    // === 角色守卫组件 ===
    RoleGuard: ({ children, roles, requireAll = false, fallback }: RoleGuardProps) => {
      const [hasRole, setHasRole] = React.useState(false);
      const [checking, setChecking] = React.useState(true);
      
      React.useEffect(() => {
        if (!enableRoleManagement) {
          setHasRole(false);
          setChecking(false);
          return;
        }
        
        const checkRoles = async () => {
          setChecking(true);
          try {
            const roleArray = Array.isArray(roles) ? roles : [roles];
            let result: boolean;
            
            if (requireAll) {
              result = roleArray.every(role => roleHook.isRole(role as any));
            } else {
              result = roleArray.some(role => roleHook.isRole(role as any));
            }
            
            setHasRole(result);
          } catch (error) {
            console.error('Role check failed:', error);
            setHasRole(false);
          } finally {
            setChecking(false);
          }
        };
        
        checkRoles();
      }, [roles, requireAll, enableRoleManagement]);
      
      if (checking) {
        return null;
      }
      
      if (!hasRole) {
        return fallback ? <>{fallback}</> : null;
      }
      
      return <>{children}</>;
    },
    
    // === 状态信息 ===
    loading: permissionHook.loading || 
             (enableRoleManagement && roleHook.loading) ||
             (enablePermissionRequests && requestHook?.loading) ||
             (enableApprovalWorkflow && approvalHook?.loading) ||
             (enableResourceAccess && resourceHook?.loading),
             
    error: permissionHook.error || 
           (enableRoleManagement && roleHook.error) ||
           (enablePermissionRequests && requestHook?.error) ||
           (enableApprovalWorkflow && approvalHook?.error) ||
           (enableResourceAccess && resourceHook?.error),
           
    initialized: permissionHook.initialized, // 权限系统初始化状态
    
    // === 用户上下文 ===
    user,
    baseContext,
    
    // === 配置信息 ===
    config: {
      enableResourceAccess,
      enableRoleManagement,
      enablePermissionRequests,
      enableApprovalWorkflow
    },
    
    // === 实时更新 ===
    isRealtime: true
  };
}

/**
 * 默认导出统一权限Hook
 */
export default usePermissions;