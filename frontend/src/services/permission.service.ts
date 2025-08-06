import { supabase } from '@/lib/supabase';

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
}

// Export singleton instance
export const permissionService = new PermissionService();