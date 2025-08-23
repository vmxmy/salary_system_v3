/**
 * 资源访问控制 Hook
 * 
 * 功能特性：
 * - 资源级别的权限检查
 * - 所有权和部门级访问控制
 * - 批量资源过滤
 * - 动态权限验证
 * - 上下文感知的访问控制
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { permissionManager } from '@/lib/permissionManager';
import { supabase } from '@/lib/supabase';
import { PERMISSIONS } from '@/constants/permissions';
import type {
  Permission,
  ResourceId,
  PermissionContext,
  PermissionResult,
  UseResourceOptions,
  UseResourceReturn,
  ResourceAccessError
} from '@/types/permission';

/**
 * 资源访问控制 Hook
 */
export function useResource(options: UseResourceOptions): UseResourceReturn {
  const { user } = useUnifiedAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    resourceType,
    resourceId,
    scope = 'all',
    checkOwnership = false,
    enableCache = true,
    enableRealtime = true,
    throwOnError = false,
    fallbackPermission = false,
    ...permissionOptions
  } = options;

  // 构建基础权限名称
  const basePermissions = useMemo(() => {
    const prefix = resourceType;
    return {
      view: `${prefix}.view` as Permission,
      create: `${prefix}.create` as Permission,
      update: `${prefix}.update` as Permission,
      delete: `${prefix}.delete` as Permission,
      export: `${prefix}.export` as Permission,
      manage: `${prefix}.manage` as Permission,
    };
  }, [resourceType]);

  // 构建权限上下文
  const buildContext = useCallback((targetResourceId?: string): PermissionContext => {
    const context: PermissionContext = {
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role as any,
        departmentId: user.departmentId,
        managedDepartments: user.managedDepartments
      } : undefined,
      timestamp: new Date()
    };

    if (targetResourceId) {
      context.resource = {
        type: resourceType,
        id: targetResourceId
      };
    }

    return context;
  }, [user, resourceType]);

  // 检查资源所有权
  const checkResourceOwnership = useCallback(async (targetResourceId: string): Promise<boolean> => {
    if (!user || !checkOwnership) return true;

    try {
      switch (resourceType) {
        case 'employee':
          // 员工资源：检查是否是本人
          return targetResourceId === user.id;

        case 'payroll':
          // 薪资资源：检查薪资记录是否属于当前用户
          const { data: payrollData, error: payrollError } = await supabase
            .from('view_payroll_summary')
            .select('employee_id')
            .eq('payroll_id', targetResourceId)
            .single();

          if (payrollError || !payrollData) return false;
          return payrollData.employee_id === user.id;

        case 'department':
          // 部门资源：检查是否是部门经理
          if (!user.managedDepartments) return false;
          return user.managedDepartments.includes(targetResourceId);

        case 'report':
          // 报表资源：检查报表创建者或查看权限
          const { data: reportData, error: reportError } = await supabase
            .from('reports')
            .select('created_by, is_public')
            .eq('id', targetResourceId)
            .single();

          if (reportError || !reportData) return false;
          return reportData.created_by === user.id || reportData.is_public;

        default:
          return true;
      }
    } catch (err) {
      console.error(`[useResource] Error checking ownership for ${resourceType}:${targetResourceId}:`, err);
      return false;
    }
  }, [user, checkOwnership, resourceType]);

  // 检查部门级访问权限
  const checkDepartmentAccess = useCallback(async (targetResourceId: string): Promise<boolean> => {
    if (!user || scope !== 'department') return true;

    try {
      switch (resourceType) {
        case 'employee':
          // 检查员工是否在管理的部门中
          const { data: employeeData, error: employeeError } = await supabase
            .from('view_employees_with_details')
            .select('department_id')
            .eq('employee_id', targetResourceId)
            .single();

          if (employeeError || !employeeData) return false;
          return user.managedDepartments?.includes(employeeData.department_id) || false;

        case 'payroll':
          // 检查薪资记录对应的员工是否在管理部门中
          const { data: payrollData, error: payrollError } = await supabase
            .from('view_payroll_summary')
            .select('department_id')
            .eq('payroll_id', targetResourceId)
            .single();

          if (payrollError || !payrollData) return false;
          return user.managedDepartments?.includes(payrollData.department_id) || false;

        case 'department':
          return user.managedDepartments?.includes(targetResourceId) || false;

        default:
          return true;
      }
    } catch (err) {
      console.error(`[useResource] Error checking department access for ${resourceType}:${targetResourceId}:`, err);
      return false;
    }
  }, [user, scope, resourceType]);

  // 通用权限检查方法
  const checkResourcePermission = useCallback(async (
    permission: Permission,
    targetResourceId?: string
  ): Promise<PermissionResult> => {
    if (!user) {
      return { 
        allowed: fallbackPermission, 
        reason: 'User not authenticated' 
      };
    }

    setLoading(true);
    setError(null);

    try {
      const context = buildContext(targetResourceId);
      
      // 基础权限检查
      const baseResult = await permissionManager.checkPermission(permission, context);
      if (!baseResult.allowed) {
        return baseResult;
      }

      const checkResourceId = targetResourceId || resourceId;
      if (!checkResourceId) {
        return baseResult; // 无特定资源，返回基础检查结果
      }

      // 所有权检查
      if (scope === 'own' || checkOwnership) {
        const hasOwnership = await checkResourceOwnership(checkResourceId);
        if (!hasOwnership) {
          return {
            allowed: false,
            reason: `Access denied: not owner of ${resourceType}:${checkResourceId}`,
            context
          };
        }
      }

      // 部门级访问检查
      if (scope === 'department') {
        const hasDepartmentAccess = await checkDepartmentAccess(checkResourceId);
        if (!hasDepartmentAccess) {
          return {
            allowed: false,
            reason: `Access denied: ${resourceType}:${checkResourceId} not in managed departments`,
            context
          };
        }
      }

      return baseResult;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Resource permission check failed');
      
      if (throwOnError) {
        throw new ResourceAccessError(
          error.message,
          resourceType,
          targetResourceId || resourceId || 'unknown',
          permission
        );
      }

      setError(error);
      return { 
        allowed: fallbackPermission, 
        reason: error.message 
      };
    } finally {
      setLoading(false);
    }
  }, [
    user, buildContext, resourceId, resourceType, scope, checkOwnership, 
    checkResourceOwnership, checkDepartmentAccess, fallbackPermission, throwOnError
  ]);

  // 基础 CRUD 权限检查
  const canView = useMemo(() => {
    return user?.permissions?.includes(basePermissions.view) || 
           user?.permissions?.includes('*') || 
           fallbackPermission;
  }, [user?.permissions, basePermissions.view, fallbackPermission]);

  const canCreate = useMemo(() => {
    return user?.permissions?.includes(basePermissions.create) || 
           user?.permissions?.includes('*') || 
           fallbackPermission;
  }, [user?.permissions, basePermissions.create, fallbackPermission]);

  const canUpdate = useMemo(() => {
    return user?.permissions?.includes(basePermissions.update) || 
           user?.permissions?.includes('*') || 
           fallbackPermission;
  }, [user?.permissions, basePermissions.update, fallbackPermission]);

  const canDelete = useMemo(() => {
    return user?.permissions?.includes(basePermissions.delete) || 
           user?.permissions?.includes('*') || 
           fallbackPermission;
  }, [user?.permissions, basePermissions.delete, fallbackPermission]);

  const canExport = useMemo(() => {
    return user?.permissions?.includes(basePermissions.export) || 
           user?.permissions?.includes('*') || 
           fallbackPermission;
  }, [user?.permissions, basePermissions.export, fallbackPermission]);

  const canManage = useMemo(() => {
    return user?.permissions?.includes(basePermissions.manage) || 
           user?.permissions?.includes('*') || 
           fallbackPermission;
  }, [user?.permissions, basePermissions.manage, fallbackPermission]);

  // 动态权限检查
  const can = useCallback((action: string, targetResourceId?: string): boolean => {
    const permission = `${resourceType}.${action}` as Permission;
    
    // 快速同步检查
    if (user?.permissions?.includes('*')) {
      return true;
    }
    
    return user?.permissions?.includes(permission) || fallbackPermission;
  }, [resourceType, user?.permissions, fallbackPermission]);

  // 带上下文的动态权限检查
  const canWithContext = useCallback(async (
    action: string, 
    contextOverride?: Partial<PermissionContext>
  ): Promise<PermissionResult> => {
    const permission = `${resourceType}.${action}` as Permission;
    const context = {
      ...buildContext(),
      ...contextOverride
    };

    return await permissionManager.checkPermission(permission, context);
  }, [resourceType, buildContext]);

  // 批量资源过滤
  const filterAccessible = useCallback(<T extends { id: string }>(items: T[]): T[] => {
    if (!user) return [];

    // 超级管理员可以访问所有资源
    if (user.permissions?.includes('*')) {
      return items;
    }

    // 基于权限和范围进行过滤
    return items.filter(item => {
      // 基础权限检查
      if (!canView) return false;

      // 范围检查
      switch (scope) {
        case 'own':
          if (resourceType === 'employee') {
            return item.id === user.id;
          }
          // 其他资源类型需要异步检查，这里返回保守结果
          return false;

        case 'department':
          // 部门级访问需要异步检查，这里返回保守结果
          return true; // 在实际使用时应该使用 getAccessibleIds

        case 'all':
        default:
          return true;
      }
    });
  }, [user, canView, scope, resourceType]);

  // 获取可访问的资源ID列表（异步版本）
  const getAccessibleIds = useCallback(async (ids: string[]): Promise<string[]> => {
    if (!user) return [];

    // 超级管理员可以访问所有资源
    if (user.permissions?.includes('*')) {
      return ids;
    }

    const accessibleIds: string[] = [];

    // 批量检查资源访问权限
    for (const id of ids) {
      try {
        const result = await checkResourcePermission(basePermissions.view, id);
        if (result.allowed) {
          accessibleIds.push(id);
        }
      } catch (err) {
        console.error(`[useResource] Error checking access for ${resourceType}:${id}:`, err);
      }
    }

    return accessibleIds;
  }, [user, checkResourcePermission, basePermissions.view, resourceType]);

  return {
    // 资源访问权限
    canView,
    canCreate,
    canUpdate,
    canDelete,
    canExport,
    canManage,
    
    // 动态权限检查
    can,
    canWithContext,
    
    // 资源过滤
    filterAccessible,
    getAccessibleIds,
    
    // 状态
    loading,
    error,
  };
}

// 资源工具函数
export const resourceUtils = {
  /**
   * 获取资源类型显示名称
   */
  getResourceDisplayName(resourceType: ResourceId['type']): string {
    const displayNames: Record<ResourceId['type'], string> = {
      'employee': '员工',
      'department': '部门',
      'payroll': '薪资',
      'report': '报表',
      'system': '系统'
    };
    return displayNames[resourceType] || resourceType;
  },

  /**
   * 获取操作显示名称
   */
  getActionDisplayName(action: string): string {
    const actionNames: Record<string, string> = {
      'view': '查看',
      'create': '创建',
      'update': '修改',
      'delete': '删除',
      'export': '导出',
      'manage': '管理',
      'approve': '审批',
      'clear': '清空',
      'import': '导入'
    };
    return actionNames[action] || action;
  },

  /**
   * 构建权限字符串
   */
  buildPermission(resourceType: ResourceId['type'], action: string): Permission {
    return `${resourceType}.${action}` as Permission;
  },

  /**
   * 解析权限字符串
   */
  parsePermission(permission: Permission): { resource: string; action: string } {
    const [resource, action] = permission.split('.');
    return { resource, action };
  },

  /**
   * 获取资源的所有相关权限
   */
  getResourcePermissions(resourceType: ResourceId['type']): Permission[] {
    const actions = ['view', 'create', 'update', 'delete', 'export'];
    return actions.map(action => `${resourceType}.${action}` as Permission);
  },

  /**
   * 检查权限是否适用于资源类型
   */
  isPermissionForResource(permission: Permission, resourceType: ResourceId['type']): boolean {
    return permission.startsWith(`${resourceType}.`);
  }
};