import { supabase } from '@/lib/supabase';
import React from 'react';

// Permission constants
export const PERMISSIONS = {
  // Employee permissions
  EMPLOYEE_VIEW: 'employee.view',
  EMPLOYEE_CREATE: 'employee.create',
  EMPLOYEE_UPDATE: 'employee.update',
  EMPLOYEE_DELETE: 'employee.delete',
  EMPLOYEE_EXPORT: 'employee.export',
  
  // Department permissions
  DEPARTMENT_VIEW: 'department.view',
  DEPARTMENT_CREATE: 'department.create',
  DEPARTMENT_UPDATE: 'department.update',
  DEPARTMENT_DELETE: 'department.delete',
  
  // Position permissions
  POSITION_VIEW: 'position.view',
  POSITION_CREATE: 'position.create',
  POSITION_UPDATE: 'position.update',
  POSITION_DELETE: 'position.delete',
  
  // Payroll permissions
  PAYROLL_VIEW: 'payroll.view',
  PAYROLL_CREATE: 'payroll.create',
  PAYROLL_UPDATE: 'payroll.update',
  PAYROLL_DELETE: 'payroll.delete',
  PAYROLL_CLEAR: 'payroll.clear',
  PAYROLL_APPROVE: 'payroll.approve',
  PAYROLL_EXPORT: 'payroll.export',
  
  // System permissions
  SYSTEM_SETTINGS: 'system.settings',
  SYSTEM_USERS: 'system.users',
  SYSTEM_ROLES: 'system.roles',
  SYSTEM_AUDIT: 'system.audit',
  SYSTEM_BACKUP: 'system.backup',
} as const;

// Role definitions
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  HR_MANAGER: 'hr_manager',
  FINANCE_ADMIN: 'finance_admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
} as const;

// Role hierarchy (higher index = higher privilege)
export const ROLE_HIERARCHY = [
  ROLES.EMPLOYEE,
  ROLES.MANAGER,
  ROLES.HR_MANAGER,
  ROLES.FINANCE_ADMIN,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
] as const;

// Default permissions for each role
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  
  [ROLES.ADMIN]: [
    ...Object.values(PERMISSIONS).filter(p => !p.startsWith('system.backup')),
  ],
  
  [ROLES.HR_MANAGER]: [
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_UPDATE,
    PERMISSIONS.EMPLOYEE_EXPORT,
    PERMISSIONS.DEPARTMENT_VIEW,
    PERMISSIONS.DEPARTMENT_CREATE,
    PERMISSIONS.DEPARTMENT_UPDATE,
    PERMISSIONS.POSITION_VIEW,
    PERMISSIONS.POSITION_CREATE,
    PERMISSIONS.POSITION_UPDATE,
    PERMISSIONS.PAYROLL_VIEW,
  ],
  
  [ROLES.FINANCE_ADMIN]: [
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_CREATE,
    PERMISSIONS.PAYROLL_UPDATE,
    PERMISSIONS.PAYROLL_DELETE,
    PERMISSIONS.PAYROLL_CLEAR,
    PERMISSIONS.PAYROLL_APPROVE,
    PERMISSIONS.PAYROLL_EXPORT,
  ],
  
  [ROLES.MANAGER]: [
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.DEPARTMENT_VIEW,
    PERMISSIONS.PAYROLL_VIEW,
  ],
  
  [ROLES.EMPLOYEE]: [
    // Employees can only view their own data through row-level security
  ],
};

export class PermissionService {
  /**
   * Check if a role has a specific permission
   */
  static roleHasPermission(role: string, permission: string): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  /**
   * Check if a role is higher than another role
   */
  static isRoleHigher(role1: string, role2: string): boolean {
    const index1 = ROLE_HIERARCHY.indexOf(role1 as any);
    const index2 = ROLE_HIERARCHY.indexOf(role2 as any);
    return index1 > index2;
  }

  /**
   * Get all permissions for a role
   */
  static getRolePermissions(role: string): string[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Get user's effective permissions based on their roles
   */
  static async getUserPermissions(userId: string): Promise<string[]> {
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !roles) return [];

    // Combine permissions from all roles
    const allPermissions = new Set<string>();
    roles.forEach(({ role }) => {
      const permissions = this.getRolePermissions(role);
      permissions.forEach(p => allPermissions.add(p));
    });

    return Array.from(allPermissions);
  }

  /**
   * Check if user has a specific permission
   */
  static async userHasPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  /**
   * Get user's highest role
   */
  static async getUserHighestRole(userId: string): Promise<string | null> {
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !roles || roles.length === 0) return null;

    // Find the highest role based on hierarchy
    return roles.reduce((highest, { role }) => {
      if (!highest) return role;
      return this.isRoleHigher(role, highest) ? role : highest;
    }, null as string | null);
  }

  /**
   * 应用层访问控制 - 数据行级权限检查
   */
  static canAccessUserData(
    currentUserId: string,
    currentUserRole: string,
    targetUserId: string,
    action: 'view' | 'edit' | 'delete' = 'view'
  ): boolean {
    // 用户总是可以访问自己的数据
    if (currentUserId === targetUserId) {
      return true;
    }

    // 管理员和HR可以访问所有用户数据
    const adminRoles: string[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR_MANAGER];
    if (adminRoles.includes(currentUserRole)) {
      return action !== 'delete' || this.isRoleHigher(currentUserRole, ROLES.HR_MANAGER);
    }

    // 财务管理员可以查看所有用户的薪资相关数据
    if (currentUserRole === ROLES.FINANCE_ADMIN && action === 'view') {
      return true;
    }

    return false;
  }

  /**
   * 部门级访问控制
   */
  static canAccessDepartmentData(
    userRole: string,
    userDepartmentId?: string,
    targetDepartmentId?: string,
    action: 'view' | 'manage' = 'view'
  ): boolean {
    // 超级管理员和系统管理员可以访问所有部门
    const systemAdminRoles: string[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
    if (systemAdminRoles.includes(userRole)) {
      return true;
    }

    // HR管理员可以管理所有部门
    if (userRole === ROLES.HR_MANAGER) {
      return true;
    }

    // 普通管理者只能查看自己部门的数据
    if (userRole === ROLES.MANAGER && action === 'view') {
      return !targetDepartmentId || userDepartmentId === targetDepartmentId;
    }

    return false;
  }

  /**
   * 薪资数据访问控制
   */
  static canAccessPayrollData(
    userRole: string,
    currentUserId: string,
    targetUserId?: string,
    action: 'view' | 'create' | 'edit' | 'approve' | 'delete' = 'view'
  ): boolean {
    // 财务管理员和超级管理员拥有完全权限
    const payrollAdminRoles: string[] = [ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN];
    if (payrollAdminRoles.includes(userRole)) {
      return true;
    }

    // 系统管理员可以查看和编辑
    if (userRole === ROLES.ADMIN && ['view', 'edit'].includes(action)) {
      return true;
    }

    // 用户可以查看自己的薪资数据
    if (action === 'view' && targetUserId && currentUserId === targetUserId) {
      return true;
    }

    return false;
  }

  /**
   * 时间敏感权限检查（如薪资周期）
   */
  static canModifyPayrollPeriod(
    userRole: string,
    periodStatus: 'draft' | 'processing' | 'completed' | 'locked',
    action: 'edit' | 'delete' | 'approve'
  ): boolean {
    // 超级管理员可以修改任何状态的周期
    if (userRole === ROLES.SUPER_ADMIN) {
      return true;
    }

    // 财务管理员的权限限制
    if (userRole === ROLES.FINANCE_ADMIN) {
      // 已锁定的周期不能修改
      if (periodStatus === 'locked') return false;
      
      // 已完成的周期只有超级管理员能修改
      if (periodStatus === 'completed') return false;
      
      return true;
    }

    // 其他角色不能修改薪资周期
    return false;
  }

  /**
   * 批量操作权限检查
   */
  static canPerformBatchOperation(
    userRole: string,
    operation: 'export' | 'import' | 'delete' | 'update',
    targetCount: number
  ): boolean {
    // 超级管理员无限制
    if (userRole === ROLES.SUPER_ADMIN) return true;

    // 根据角色和操作类型限制批量大小
    const limits: Record<string, Record<string, number>> = {
      [ROLES.ADMIN]: { export: 10000, import: 1000, delete: 100, update: 1000 },
      [ROLES.HR_MANAGER]: { export: 5000, import: 500, delete: 50, update: 500 },
      [ROLES.FINANCE_ADMIN]: { export: 5000, import: 100, delete: 10, update: 100 },
      [ROLES.MANAGER]: { export: 1000, import: 0, delete: 0, update: 0 },
    };

    const roleLimit = limits[userRole]?.[operation] ?? 0;
    return targetCount <= roleLimit;
  }

  /**
   * 生成权限错误信息
   */
  static getPermissionError(permission: string, context?: string): string {
    const baseMessages: Record<string, string> = {
      [PERMISSIONS.EMPLOYEE_VIEW]: '您没有权限查看员工信息',
      [PERMISSIONS.EMPLOYEE_CREATE]: '您没有权限创建员工档案',
      [PERMISSIONS.EMPLOYEE_UPDATE]: '您没有权限编辑员工信息',
      [PERMISSIONS.EMPLOYEE_DELETE]: '您没有权限删除员工档案',
      [PERMISSIONS.PAYROLL_VIEW]: '您没有权限查看薪资信息',
      [PERMISSIONS.PAYROLL_CREATE]: '您没有权限创建薪资记录',
      [PERMISSIONS.PAYROLL_UPDATE]: '您没有权限编辑薪资数据',
      [PERMISSIONS.PAYROLL_APPROVE]: '您没有权限审批薪资',
      [PERMISSIONS.DEPARTMENT_VIEW]: '您没有权限查看部门信息',
      [PERMISSIONS.SYSTEM_SETTINGS]: '您没有权限访问系统设置',
    };

    const message = baseMessages[permission] || '您没有执行此操作的权限';
    return context ? `${message}：${context}` : message;
  }

  /**
   * 权限验证中间件（用于API调用前）
   */
  static async validatePermissionMiddleware(
    userId: string,
    requiredPermission: string,
    resourceId?: string
  ): Promise<{ allowed: boolean; error?: string }> {
    try {
      const hasPermission = await this.userHasPermission(userId, requiredPermission);
      
      if (!hasPermission) {
        return {
          allowed: false,
          error: this.getPermissionError(requiredPermission, resourceId)
        };
      }

      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        error: '权限验证失败，请重试'
      };
    }
  }
}

// Export singleton instance
export const permissionService = new PermissionService();

/**
 * React组件权限守卫HOC
 */
export const withPermissionGuard = <T extends object>(
  WrappedComponent: React.ComponentType<T>,
  requiredPermission: string | string[],
  fallback?: React.ComponentType
) => {
  return (props: T & { userRole?: string; userId?: string }) => {
    const { userRole = ROLES.EMPLOYEE, userId, ...restProps } = props;
    
    const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const hasAccess = permissions.some(permission => 
      PermissionService.roleHasPermission(userRole, permission)
    );

    if (!hasAccess) {
      if (fallback) {
        const FallbackComponent = fallback;
        return <FallbackComponent />;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-error mb-2">访问被拒绝</h2>
          <p className="text-base-content/70 text-center max-w-md">
            {PermissionService.getPermissionError(permissions[0])}
          </p>
          <button 
            className="btn btn-primary mt-4"
            onClick={() => window.history.back()}
          >
            返回上一页
          </button>
        </div>
      );
    }

    return <WrappedComponent {...(restProps as T)} />;
  };
};