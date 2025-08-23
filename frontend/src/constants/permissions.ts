// 权限常量定义
export const PERMISSIONS = {
  // 员工权限
  EMPLOYEE_VIEW: 'employee.view',
  EMPLOYEE_CREATE: 'employee.create',
  EMPLOYEE_UPDATE: 'employee.update',
  EMPLOYEE_DELETE: 'employee.delete',
  EMPLOYEE_EXPORT: 'employee.export',
  
  // 部门权限
  DEPARTMENT_VIEW: 'department.view',
  DEPARTMENT_CREATE: 'department.create',
  DEPARTMENT_UPDATE: 'department.update',
  DEPARTMENT_DELETE: 'department.delete',
  
  // 职位权限
  POSITION_VIEW: 'position.view',
  POSITION_CREATE: 'position.create',
  POSITION_UPDATE: 'position.update',
  POSITION_DELETE: 'position.delete',
  
  // 薪资权限
  PAYROLL_VIEW: 'payroll.view',
  PAYROLL_CREATE: 'payroll.create',
  PAYROLL_UPDATE: 'payroll.update',
  PAYROLL_DELETE: 'payroll.delete',
  PAYROLL_CLEAR: 'payroll.clear',
  PAYROLL_APPROVE: 'payroll.approve',
  PAYROLL_EXPORT: 'payroll.export',
  PAYROLL_IMPORT: 'payroll.import',
  
  // 报表权限
  REPORT_VIEW: 'report.view',
  REPORT_CREATE: 'report.create',
  REPORT_EXPORT: 'report.export',
  
  // 系统管理权限
  SYSTEM_CONFIG: 'system.config',
  SYSTEM_BACKUP: 'system.backup',
  SYSTEM_LOGS: 'system.logs',
  USER_MANAGEMENT: 'user.management',
  
  // 角色管理权限
  ROLE_VIEW: 'view_roles',
  ROLE_MANAGE: 'manage_roles',
  ROLE_ASSIGN: 'assign_roles',
  ROLE_PERMISSION_VIEW: 'view_role_permissions',
  ROLE_PERMISSION_MANAGE: 'manage_role_permissions',
  ROLE_HISTORY_VIEW: 'view_role_history',
  ROLE_REQUEST_APPROVE: 'approve_role_requests',
  
  // 薪资组件权限
  COMPONENT_VIEW: 'component.view',
  COMPONENT_CREATE: 'component.create',
  COMPONENT_UPDATE: 'component.update',
  COMPONENT_DELETE: 'component.delete',
  
  // 保险配置权限
  INSURANCE_VIEW: 'insurance.view',
  INSURANCE_CONFIG: 'insurance.config',
  INSURANCE_CALCULATE: 'insurance.calculate'
} as const;

// 角色权限映射
export const ROLE_PERMISSIONS = {
  super_admin: ['*'], // 超级管理员拥有所有权限
  admin: [
    // 员工管理
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_UPDATE,
    PERMISSIONS.EMPLOYEE_DELETE,
    PERMISSIONS.EMPLOYEE_EXPORT,
    
    // 部门管理
    PERMISSIONS.DEPARTMENT_VIEW,
    PERMISSIONS.DEPARTMENT_CREATE,
    PERMISSIONS.DEPARTMENT_UPDATE,
    PERMISSIONS.DEPARTMENT_DELETE,
    
    // 薪资管理
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_CREATE,
    PERMISSIONS.PAYROLL_UPDATE,
    PERMISSIONS.PAYROLL_DELETE,
    PERMISSIONS.PAYROLL_CLEAR,
    PERMISSIONS.PAYROLL_APPROVE,
    PERMISSIONS.PAYROLL_EXPORT,
    PERMISSIONS.PAYROLL_IMPORT,
    
    // 报表
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.REPORT_EXPORT,
    
    // 薪资组件
    PERMISSIONS.COMPONENT_VIEW,
    PERMISSIONS.COMPONENT_CREATE,
    PERMISSIONS.COMPONENT_UPDATE,
    
    // 保险配置
    PERMISSIONS.INSURANCE_VIEW,
    PERMISSIONS.INSURANCE_CONFIG,
    
    // 角色管理（部分权限）
    PERMISSIONS.ROLE_VIEW,
    PERMISSIONS.ROLE_ASSIGN,
    PERMISSIONS.ROLE_PERMISSION_VIEW,
    PERMISSIONS.ROLE_HISTORY_VIEW,
    
    // 系统管理
    PERMISSIONS.USER_MANAGEMENT
  ],
  hr_manager: [
    // 员工查看和基本操作
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_UPDATE,
    PERMISSIONS.EMPLOYEE_EXPORT,
    
    // 部门查看
    PERMISSIONS.DEPARTMENT_VIEW,
    
    // 薪资查看和基本操作
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_CREATE,
    PERMISSIONS.PAYROLL_UPDATE,
    PERMISSIONS.PAYROLL_EXPORT,
    
    // 报表查看
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    
    // 薪资组件查看
    PERMISSIONS.COMPONENT_VIEW,
    
    // 保险查看
    PERMISSIONS.INSURANCE_VIEW
  ],
  manager: [
    // 员工查看（本部门）
    PERMISSIONS.EMPLOYEE_VIEW,
    
    // 薪资查看（本部门）
    PERMISSIONS.PAYROLL_VIEW,
    
    // 报表查看（本部门）
    PERMISSIONS.REPORT_VIEW
  ],
  employee: [
    // 只能查看自己的信息
    PERMISSIONS.EMPLOYEE_VIEW, // 限制为自己
    PERMISSIONS.PAYROLL_VIEW   // 限制为自己
  ]
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type Role = keyof typeof ROLE_PERMISSIONS;