import { useCallback } from 'react';
import { PERMISSIONS, ROLE_PERMISSIONS, type Permission, type Role } from '@/constants/permissions';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 纯 Hook 权限管理
 * 无服务层依赖，直接使用常量配置和用户上下文
 */
export function usePermission() {
  const { user } = useAuth();

  // 检查用户是否有特定权限
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;

    // 从用户元数据或用户配置中获取角色
    const userRole = user.user_metadata?.role || user.app_metadata?.role || 'employee';
    
    // 获取角色对应的权限列表
    const rolePermissions = ROLE_PERMISSIONS[userRole as Role] || [];
    
    // 超级管理员拥有所有权限
    if (rolePermissions.includes('*')) {
      return true;
    }
    
    // 检查是否有特定权限
    return rolePermissions.includes(permission);
  }, [user]);

  // 检查用户是否有任一权限
  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  }, [hasPermission]);

  // 检查用户是否拥有所有权限
  const hasAllPermissions = useCallback((permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  }, [hasPermission]);

  // 获取用户角色
  const getUserRole = useCallback((): Role => {
    if (!user) return 'employee';
    return (user.user_metadata?.role || user.app_metadata?.role || 'employee') as Role;
  }, [user]);

  // 获取用户所有权限
  const getUserPermissions = useCallback((): Permission[] => {
    const userRole = getUserRole();
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    
    // 如果是超级管理员，返回所有权限
    if (rolePermissions.includes('*')) {
      return Object.values(PERMISSIONS);
    }
    
    return rolePermissions;
  }, [getUserRole]);

  // 检查是否是管理员角色
  const isAdmin = useCallback((): boolean => {
    const role = getUserRole();
    return role === 'super_admin' || role === 'admin';
  }, [getUserRole]);

  // 检查是否是HR角色
  const isHR = useCallback((): boolean => {
    const role = getUserRole();
    return role === 'super_admin' || role === 'admin' || role === 'hr_manager';
  }, [getUserRole]);

  // 检查是否是经理角色
  const isManager = useCallback((): boolean => {
    const role = getUserRole();
    return role === 'super_admin' || role === 'admin' || role === 'hr_manager' || role === 'manager';
  }, [getUserRole]);

  // 权限检查的便捷方法
  const can = {
    // 员工管理权限
    viewEmployees: () => hasPermission(PERMISSIONS.EMPLOYEE_VIEW),
    createEmployee: () => hasPermission(PERMISSIONS.EMPLOYEE_CREATE),
    updateEmployee: () => hasPermission(PERMISSIONS.EMPLOYEE_UPDATE),
    deleteEmployee: () => hasPermission(PERMISSIONS.EMPLOYEE_DELETE),
    exportEmployees: () => hasPermission(PERMISSIONS.EMPLOYEE_EXPORT),

    // 部门管理权限
    viewDepartments: () => hasPermission(PERMISSIONS.DEPARTMENT_VIEW),
    createDepartment: () => hasPermission(PERMISSIONS.DEPARTMENT_CREATE),
    updateDepartment: () => hasPermission(PERMISSIONS.DEPARTMENT_UPDATE),
    deleteDepartment: () => hasPermission(PERMISSIONS.DEPARTMENT_DELETE),

    // 薪资管理权限
    viewPayroll: () => hasPermission(PERMISSIONS.PAYROLL_VIEW),
    createPayroll: () => hasPermission(PERMISSIONS.PAYROLL_CREATE),
    updatePayroll: () => hasPermission(PERMISSIONS.PAYROLL_UPDATE),
    deletePayroll: () => hasPermission(PERMISSIONS.PAYROLL_DELETE),
    approvePayroll: () => hasPermission(PERMISSIONS.PAYROLL_APPROVE),
    exportPayroll: () => hasPermission(PERMISSIONS.PAYROLL_EXPORT),
    importPayroll: () => hasPermission(PERMISSIONS.PAYROLL_IMPORT),

    // 报表权限
    viewReports: () => hasPermission(PERMISSIONS.REPORT_VIEW),
    createReports: () => hasPermission(PERMISSIONS.REPORT_CREATE),
    exportReports: () => hasPermission(PERMISSIONS.REPORT_EXPORT),

    // 系统管理权限
    systemConfig: () => hasPermission(PERMISSIONS.SYSTEM_CONFIG),
    systemBackup: () => hasPermission(PERMISSIONS.SYSTEM_BACKUP),
    viewSystemLogs: () => hasPermission(PERMISSIONS.SYSTEM_LOGS),
    manageUsers: () => hasPermission(PERMISSIONS.USER_MANAGEMENT),

    // 薪资组件权限
    viewComponents: () => hasPermission(PERMISSIONS.COMPONENT_VIEW),
    createComponents: () => hasPermission(PERMISSIONS.COMPONENT_CREATE),
    updateComponents: () => hasPermission(PERMISSIONS.COMPONENT_UPDATE),
    deleteComponents: () => hasPermission(PERMISSIONS.COMPONENT_DELETE),

    // 保险配置权限
    viewInsurance: () => hasPermission(PERMISSIONS.INSURANCE_VIEW),
    configInsurance: () => hasPermission(PERMISSIONS.INSURANCE_CONFIG),
    calculateInsurance: () => hasPermission(PERMISSIONS.INSURANCE_CALCULATE),
  };

  return {
    // 权限检查方法
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // 角色信息
    getUserRole,
    getUserPermissions,
    isAdmin,
    isHR,
    isManager,
    
    // 便捷权限检查
    can,
    
    // 权限常量（供其他地方使用）
    PERMISSIONS,
  };
}

// 导出权限常量供其他地方使用
export { PERMISSIONS } from '@/constants/permissions';