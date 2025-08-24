/**
 * 资源访问控制 Hook - 基于新的统一权限系统
 * 
 * 功能特性：
 * - 基于 unified_permission_check 函数进行资源级权限验证
 * - 支持资源所有权检查和部门级访问控制
 * - 提供批量资源过滤和访问控制
 * - 集成实时权限更新和缓存机制
 * 
 * 设计原则：
 * - 资源粒度：细粒度的资源访问控制
 * - 上下文感知：基于资源属性的动态权限检查
 * - 性能优化：批量检查和智能缓存
 * - 安全第一：默认拒绝访问策略
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/lib/supabase';
import { usePermission } from './usePermission';
import type {
  Permission,
  PermissionContext,
  PermissionResult,
  UseResourceAccessReturn
} from '@/types/permission';

/**
 * 资源类型定义
 */
export type ResourceType = 'employee' | 'department' | 'payroll' | 'report' | 'system';

/**
 * 资源访问选项
 */
export interface ResourceAccessOptions {
  /** 资源类型 */
  resourceType: ResourceType;
  /** 资源ID（可选，为空则检查资源类型级别权限） */
  resourceId?: string;
  /** 访问范围 */
  scope?: 'own' | 'department' | 'all';
  /** 是否检查资源所有权 */
  checkOwnership?: boolean;
  /** 错误时的降级行为 */
  fallbackResult?: boolean;
  /** 权限检查失败时是否抛出错误 */
  throwOnError?: boolean;
}

/**
 * 资源权限操作
 */
export type ResourceAction = 'view' | 'create' | 'update' | 'delete' | 'export' | 'manage' | 'approve';

/**
 * 资源访问错误
 */
export class ResourceAccessError extends Error {
  resourceType: ResourceType;
  resourceId: string;
  permission: Permission;
  context?: PermissionContext;
  
  constructor(
    message: string,
    resourceType: ResourceType,
    resourceId: string,
    permission: Permission,
    context?: PermissionContext
  ) {
    super(message);
    this.name = 'ResourceAccessError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    this.permission = permission;
    this.context = context;
  }
}

/**
 * 资源访问控制 Hook
 */
export function useResourceAccess(options: ResourceAccessOptions): UseResourceAccessReturn {
  const { user } = useUnifiedAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const {
    resourceType,
    resourceId,
    scope = 'all',
    checkOwnership = false,
    fallbackResult = false,
    throwOnError = false
  } = options;

  // 使用核心权限Hook
  const permission = usePermission({
    fallbackResult,
    throwOnError,
    enableCache: true,
    watchChanges: true
  });

  // 构建资源权限名称
  const buildPermission = useCallback((action: string): string => {
    return `${resourceType}.${action}`;
  }, [resourceType]);

  // 构建资源权限上下文
  const buildResourceContext = useCallback((
    targetResourceId?: string,
    attributes?: Record<string, any>
  ): PermissionContext => {
    const baseContext: PermissionContext = {
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role as any,
        departmentId: user.departmentId
      } : undefined,
      timestamp: new Date()
    };
    
    if (targetResourceId || resourceId) {
      return {
        ...baseContext,
        resource: {
          type: resourceType,
          id: targetResourceId || resourceId || 'unknown',
          attributes: {
            ...attributes,
            scope,
            checkOwnership
          }
        }
      };
    }
    
    return baseContext;
  }, [user, resourceType, resourceId, scope, checkOwnership]);

  // 检查资源所有权
  const checkResourceOwnership = useCallback(async (targetResourceId: string): Promise<boolean> => {
    if (!user || !checkOwnership) return true;

    try {
      switch (resourceType) {
        case 'employee':
          // 员工资源：检查是否是本人或员工记录
          if (targetResourceId === user.id) return true;
          
          // 简化：如果targetResourceId等于用户ID，则拥有该资源
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
          // 报表资源：检查报表访问权限（基于角色）
          return ['admin', 'super_admin', 'hr_manager'].includes(user.role);

        case 'system':
          // 系统资源：仅系统管理员可访问
          return ['admin', 'super_admin'].includes(user.role);

        default:
          return true;
      }
    } catch (err) {
      console.error(`[useResourceAccess] Error checking ownership for ${resourceType}:${targetResourceId}:`, err);
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
            .from('view_employee_basic_info')
            .select('department_id')
            .eq('employee_id', targetResourceId)
            .single();

          if (employeeError || !employeeData) return false;
          return user.managedDepartments?.includes(employeeData.department_id!) || false;

        case 'payroll':
          // 检查薪资记录对应的员工是否在管理部门中
          // 由于view_payroll_summary没有department_id字段，需要通过employee_id查询员工部门
          const { data: payrollData, error: payrollError } = await supabase
            .from('view_payroll_summary')
            .select('employee_id')
            .eq('payroll_id', targetResourceId)
            .single();

          if (payrollError || !payrollData) return false;
          
          // 通过员工ID查询部门信息
          const { data: employeeDeptData, error: employeeDeptError } = await supabase
            .from('view_employee_basic_info')
            .select('department_id')
            .eq('employee_id', payrollData.employee_id!)
            .single();

          if (employeeDeptError || !employeeDeptData) return false;
          return user.managedDepartments?.includes(employeeDeptData.department_id!) || false;

        case 'department':
          return user.managedDepartments?.includes(targetResourceId) || false;

        default:
          return true;
      }
    } catch (err) {
      console.error(`[useResourceAccess] Error checking department access for ${resourceType}:${targetResourceId}:`, err);
      return false;
    }
  }, [user, scope, resourceType]);

  // 检查资源访问权限
  const checkResourceAccess = useCallback(async (
    action: string,
    targetResourceId?: string,
    attributes?: Record<string, any>
  ): Promise<any> => {
    if (!user) {
      return { 
        allowed: fallbackResult, 
        reason: 'User not authenticated',
        context: buildResourceContext(targetResourceId, attributes)
      };
    }

    setLoading(true);
    setError(null);

    try {
      const permissionCode = buildPermission(action) as Permission;
      const context = buildResourceContext(targetResourceId, attributes);
      
      // 基础权限检查
      const baseResult = await permission.checkPermission(permissionCode, context);
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
          const result: PermissionResult = {
            allowed: false,
            reason: `Access denied: not owner of ${resourceType}:${checkResourceId}`,
            context
          };
          
          if (throwOnError) {
            throw new ResourceAccessError(
              result.reason!,
              resourceType,
              checkResourceId,
              permissionCode,
              context
            );
          }
          
          return result;
        }
      }

      // 部门级访问检查
      if (scope === 'department') {
        const hasDepartmentAccess = await checkDepartmentAccess(checkResourceId);
        if (!hasDepartmentAccess) {
          const result: PermissionResult = {
            allowed: false,
            reason: `Access denied: ${resourceType}:${checkResourceId} not in managed departments`,
            context
          };
          
          if (throwOnError) {
            throw new ResourceAccessError(
              result.reason!,
              resourceType,
              checkResourceId,
              permissionCode,
              context
            );
          }
          
          return result;
        }
      }

      return baseResult;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Resource access check failed');
      setError(error);
      
      if (throwOnError && !(err instanceof ResourceAccessError)) {
        throw new ResourceAccessError(
          error.message,
          resourceType,
          targetResourceId || resourceId || 'unknown',
          buildPermission(action) as Permission
        );
      }

      return { 
        allowed: fallbackResult, 
        reason: error.message,
        context: buildResourceContext(targetResourceId, attributes)
      };
    } finally {
      setLoading(false);
    }
  }, [
    user, permission, buildPermission, buildResourceContext, resourceId, resourceType,
    scope, checkOwnership, checkResourceOwnership, checkDepartmentAccess,
    fallbackResult, throwOnError
  ]);

  // 便捷的资源权限检查方法
  const canView = useCallback(async (targetResourceId?: string): Promise<boolean> => {
    const result = await checkResourceAccess('view', targetResourceId);
    return result.allowed;
  }, [checkResourceAccess]);

  const canCreate = useCallback(async (): Promise<boolean> => {
    const result = await checkResourceAccess('create');
    return result.allowed;
  }, [checkResourceAccess]);

  const canUpdate = useCallback(async (targetResourceId?: string): Promise<boolean> => {
    const result = await checkResourceAccess('update', targetResourceId);
    return result.allowed;
  }, [checkResourceAccess]);

  const canDelete = useCallback(async (targetResourceId?: string): Promise<boolean> => {
    const result = await checkResourceAccess('delete', targetResourceId);
    return result.allowed;
  }, [checkResourceAccess]);

  const canExport = useCallback(async (targetResourceId?: string): Promise<boolean> => {
    const result = await checkResourceAccess('export', targetResourceId);
    return result.allowed;
  }, [checkResourceAccess]);

  const canManage = useCallback(async (targetResourceId?: string): Promise<boolean> => {
    const result = await checkResourceAccess('manage', targetResourceId);
    return result.allowed;
  }, [checkResourceAccess]);

  // 批量资源访问检查
  const checkMultipleResources = useCallback(async (
    action: string,
    resourceIds: string[]
  ): Promise<Record<string, any>> => {
    const results: Record<string, PermissionResult> = {};
    
    // 批量检查资源访问权限
    for (const id of resourceIds) {
      try {
        results[id] = await checkResourceAccess(action, id);
      } catch (err) {
        results[id] = {
          allowed: fallbackResult,
          reason: err instanceof Error ? err.message : 'Unknown error',
          context: buildResourceContext(id)
        };
      }
    }

    return results;
  }, [checkResourceAccess, fallbackResult, buildResourceContext]);

  // 过滤可访问的资源
  const filterAccessibleResources = useCallback(async <T extends { id: string }>(
    action: string,
    resources: T[]
  ): Promise<T[]> => {
    if (!user) return [];

    const accessibleResources: T[] = [];
    const resourceIds = resources.map(r => r.id);
    const accessResults = await checkMultipleResources(action, resourceIds);

    resources.forEach(resource => {
      const result = accessResults[resource.id];
      if (result?.allowed) {
        accessibleResources.push(resource);
      }
    });

    return accessibleResources;
  }, [user, checkMultipleResources]);

  // 获取可访问的资源ID列表
  const getAccessibleResourceIds = useCallback(async (
    action: string,
    resourceIds: string[]
  ): Promise<string[]> => {
    const accessResults = await checkMultipleResources(action, resourceIds);
    
    return resourceIds.filter(id => accessResults[id]?.allowed);
  }, [checkMultipleResources]);

  // 基础权限状态（同步检查，基于缓存）
  const permissions = useMemo(() => ({
    canViewCached: permission.hasPermission(buildPermission('view') as Permission),
    canCreateCached: permission.hasPermission(buildPermission('create') as Permission),
    canUpdateCached: permission.hasPermission(buildPermission('update') as Permission),
    canDeleteCached: permission.hasPermission(buildPermission('delete') as Permission),
    canExportCached: permission.hasPermission(buildPermission('export') as Permission),
    canManageCached: permission.hasPermission(buildPermission('manage') as Permission)
  }), [permission, buildPermission]);

  return {
    // 资源访问检查
    checkResourceAccess,
    checkMultipleResources,
    
    // 便捷权限检查
    canView,
    canCreate,
    canUpdate,
    canDelete,
    canExport,
    canManage,
    
    // 批量操作
    filterAccessibleResources,
    getAccessibleResourceIds,
    
    // 缓存权限状态
    ...permissions,
    
    // 工具方法
    buildPermission,
    buildResourceContext,
    
    // 状态
    loading: loading || permission.loading,
    error: error || permission.error,
    
    // 资源信息
    resourceType,
    resourceId,
    scope,
    user
  };
}

// 资源访问工具函数
export const resourceAccessUtils = {
  /**
   * 获取资源类型显示名称
   */
  getResourceDisplayName(resourceType: ResourceType): string {
    const displayNames: Record<ResourceType, string> = {
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
  getActionDisplayName(action: ResourceAction): string {
    const actionNames: Record<ResourceAction, string> = {
      'view': '查看',
      'create': '创建',
      'update': '修改',
      'delete': '删除',
      'export': '导出',
      'manage': '管理',
      'approve': '审批'
    };
    return actionNames[action] || action;
  },

  /**
   * 获取访问范围显示名称
   */
  getScopeDisplayName(scope: 'own' | 'department' | 'all'): string {
    const scopeNames = {
      'own': '仅自己',
      'department': '本部门',
      'all': '全部'
    };
    return scopeNames[scope] || scope;
  },

  /**
   * 构建权限字符串
   */
  buildPermission: (resourceType: ResourceType, action: ResourceAction): Permission => {
    return `${resourceType}.${action}` as Permission;
  },

  /**
   * 解析权限字符串
   */
  parsePermission: (permission: Permission): { resourceType: string; action: string } => {
    const [resourceType, action] = permission.split('.');
    return { resourceType, action };
  },

  /**
   * 获取资源的所有相关权限
   */
  getResourcePermissions: (resourceType: ResourceType): Permission[] => {
    const actions: ResourceAction[] = ['view', 'create', 'update', 'delete', 'export', 'manage'];
    return actions.map(action => `${resourceType}.${action}` as Permission);
  },

  /**
   * 检查权限是否适用于资源类型
   */
  isPermissionForResource: (permission: Permission, resourceType: ResourceType): boolean => {
    return permission.startsWith(`${resourceType}.`);
  },

  /**
   * 生成资源访问摘要
   */
  generateAccessSummary: (
    resourceType: ResourceType,
    permissions: Record<ResourceAction, boolean>
  ): string => {
    const allowedActions = Object.entries(permissions)
      .filter(([, allowed]) => allowed)
      .map(([action]) => resourceAccessUtils.getActionDisplayName(action as ResourceAction));
    
    if (allowedActions.length === 0) {
      return `无${resourceAccessUtils.getResourceDisplayName(resourceType)}权限`;
    }
    
    return `${resourceAccessUtils.getResourceDisplayName(resourceType)}权限: ${allowedActions.join('、')}`;
  }
};