/**
 * 统一权限常量定义
 * 
 * ⚠️ 重要：此常量完全基于数据库 unified_permission_config 表的实际权限
 * 遵循正确的数据驱动架构：数据库 → Hook层 → 前端应用
 * 数据库是权限的唯一权威来源(Single Source of Truth)
 * 
 * 最后同步时间：2025-08-26
 * 数据库权限总数：27个
 */

// 权限常量定义（与数据库权限配置100%匹配）
export const PERMISSIONS = {
  // 基础页面访问权限
  DASHBOARD_READ: 'dashboard.read',
  
  // 数据访问权限（按范围分级）
  DATA_ALL_READ: 'data.all.read',
  DATA_DEPARTMENT_READ: 'data.department.read', 
  DATA_SELF_READ: 'data.self.read',
  
  // 员工管理权限（数据库格式：employee_management.*）
  EMPLOYEE_MANAGEMENT_READ: 'employee_management.read',
  EMPLOYEE_MANAGEMENT_WRITE: 'employee_management.write',
  
  // 用户管理权限（数据库格式：user_management.*）
  USER_MANAGEMENT_READ: 'user_management.read',
  USER_MANAGEMENT_WRITE: 'user_management.write',
  
  // 角色管理权限（数据库格式：无统一前缀）
  ROLE_VIEW: 'view_roles',
  ROLE_MANAGE: 'manage_roles',
  ROLE_ASSIGN: 'assign_roles',
  ROLE_PERMISSION_VIEW: 'view_role_permissions',
  ROLE_PERMISSION_MANAGE: 'manage_role_permissions',
  ROLE_HISTORY_VIEW: 'view_role_history',
  ROLE_REQUEST_APPROVE: 'approve_role_requests',
  
  // 角色管理操作权限（数据库格式：role_management.*）
  ROLE_MANAGEMENT_READ: 'role_management.read',
  ROLE_MANAGEMENT_WRITE: 'role_management.write',
  
  // 权限管理（数据库格式：permission_management.*）
  PERMISSION_MANAGEMENT_READ: 'permission_management.read',
  PERMISSION_MANAGEMENT_WRITE: 'permission_management.write',
  
  // 薪资管理权限（数据库格式：payroll_management.* + payroll.clear）
  PAYROLL_MANAGEMENT_READ: 'payroll_management.read',
  PAYROLL_MANAGEMENT_WRITE: 'payroll_management.write',
  PAYROLL_CLEAR: 'payroll.clear',
  
  // 统计报表权限（数据库格式：statistics.*）
  STATISTICS_VIEW: 'statistics.view',
  STATISTICS_EXPORT: 'statistics.export',
  STATISTICS_TRENDS_VIEW: 'statistics.trends.view',
  HR_STATISTICS_VIEW: 'hr.statistics.view',
  PAYROLL_STATISTICS_VIEW: 'payroll.statistics.view'
} as const;

/**
 * 角色权限映射（兼容性和降级处理）
 * 
 * ⚠️ 注意：新系统中权限通过数据库统一管理
 * 这个映射仅用于开发时的权限参考和紧急降级处理
 * 实际权限配置以数据库 unified_permission_config 表为准
 */
export const ROLE_PERMISSIONS = {
  super_admin: ['*'], // 超级管理员拥有所有权限（数据库配置为准）
  
  admin: [
    // 基础权限
    PERMISSIONS.DASHBOARD_READ,
    
    // 数据访问权限
    PERMISSIONS.DATA_ALL_READ,
    PERMISSIONS.DATA_DEPARTMENT_READ,
    PERMISSIONS.DATA_SELF_READ,
    
    // 员工管理
    PERMISSIONS.EMPLOYEE_MANAGEMENT_READ,
    PERMISSIONS.EMPLOYEE_MANAGEMENT_WRITE,
    
    // 用户管理
    PERMISSIONS.USER_MANAGEMENT_READ,
    PERMISSIONS.USER_MANAGEMENT_WRITE,
    
    // 角色管理
    PERMISSIONS.ROLE_VIEW,
    PERMISSIONS.ROLE_MANAGE,
    PERMISSIONS.ROLE_ASSIGN,
    PERMISSIONS.ROLE_PERMISSION_VIEW,
    PERMISSIONS.ROLE_PERMISSION_MANAGE,
    PERMISSIONS.ROLE_HISTORY_VIEW,
    PERMISSIONS.ROLE_REQUEST_APPROVE,
    PERMISSIONS.ROLE_MANAGEMENT_READ,
    PERMISSIONS.ROLE_MANAGEMENT_WRITE,
    
    // 权限管理
    PERMISSIONS.PERMISSION_MANAGEMENT_READ,
    PERMISSIONS.PERMISSION_MANAGEMENT_WRITE,
    
    // 薪资管理
    PERMISSIONS.PAYROLL_MANAGEMENT_READ,
    PERMISSIONS.PAYROLL_MANAGEMENT_WRITE,
    PERMISSIONS.PAYROLL_CLEAR,
    
    // 统计报表
    PERMISSIONS.STATISTICS_VIEW,
    PERMISSIONS.STATISTICS_EXPORT,
    PERMISSIONS.STATISTICS_TRENDS_VIEW,
    PERMISSIONS.HR_STATISTICS_VIEW,
    PERMISSIONS.PAYROLL_STATISTICS_VIEW
  ],
  
  hr_manager: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.EMPLOYEE_MANAGEMENT_READ,
    PERMISSIONS.EMPLOYEE_MANAGEMENT_WRITE,
    PERMISSIONS.DATA_DEPARTMENT_READ,
    PERMISSIONS.USER_MANAGEMENT_READ,
    PERMISSIONS.PAYROLL_MANAGEMENT_READ,
    PERMISSIONS.PAYROLL_MANAGEMENT_WRITE,
    PERMISSIONS.STATISTICS_VIEW,
    PERMISSIONS.HR_STATISTICS_VIEW,
    PERMISSIONS.PAYROLL_STATISTICS_VIEW
  ],
  
  manager: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.EMPLOYEE_MANAGEMENT_READ,
    PERMISSIONS.DATA_DEPARTMENT_READ,
    PERMISSIONS.PAYROLL_MANAGEMENT_READ,
    PERMISSIONS.STATISTICS_VIEW
  ],
  
  employee: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.DATA_SELF_READ
    // 注意：员工级别的薪资查看权限通过数据范围控制，不在此处定义
  ]
} as const;

/**
 * 权限分组（用于UI组织）
 * 基于数据库实际权限重新组织，便于权限管理界面展示
 */
export const PERMISSION_GROUPS = {
  基础功能: [
    PERMISSIONS.DASHBOARD_READ
  ],
  数据访问: [
    PERMISSIONS.DATA_ALL_READ,
    PERMISSIONS.DATA_DEPARTMENT_READ,
    PERMISSIONS.DATA_SELF_READ
  ],
  员工管理: [
    PERMISSIONS.EMPLOYEE_MANAGEMENT_READ,
    PERMISSIONS.EMPLOYEE_MANAGEMENT_WRITE
  ],
  用户管理: [
    PERMISSIONS.USER_MANAGEMENT_READ,
    PERMISSIONS.USER_MANAGEMENT_WRITE
  ],
  角色管理: [
    PERMISSIONS.ROLE_VIEW,
    PERMISSIONS.ROLE_MANAGE,
    PERMISSIONS.ROLE_ASSIGN,
    PERMISSIONS.ROLE_PERMISSION_VIEW,
    PERMISSIONS.ROLE_PERMISSION_MANAGE,
    PERMISSIONS.ROLE_HISTORY_VIEW,
    PERMISSIONS.ROLE_REQUEST_APPROVE,
    PERMISSIONS.ROLE_MANAGEMENT_READ,
    PERMISSIONS.ROLE_MANAGEMENT_WRITE
  ],
  权限管理: [
    PERMISSIONS.PERMISSION_MANAGEMENT_READ,
    PERMISSIONS.PERMISSION_MANAGEMENT_WRITE
  ],
  薪资管理: [
    PERMISSIONS.PAYROLL_MANAGEMENT_READ,
    PERMISSIONS.PAYROLL_MANAGEMENT_WRITE,
    PERMISSIONS.PAYROLL_CLEAR
  ],
  统计报表: [
    PERMISSIONS.STATISTICS_VIEW,
    PERMISSIONS.STATISTICS_EXPORT,
    PERMISSIONS.STATISTICS_TRENDS_VIEW,
    PERMISSIONS.HR_STATISTICS_VIEW,
    PERMISSIONS.PAYROLL_STATISTICS_VIEW
  ]
} as const;

/**
 * 权限描述映射（用于UI显示）
 * 基于数据库实际权限提供描述
 */
export const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.DASHBOARD_READ]: '访问仪表板',
  [PERMISSIONS.DATA_ALL_READ]: '访问所有数据',
  [PERMISSIONS.DATA_DEPARTMENT_READ]: '访问部门数据',
  [PERMISSIONS.DATA_SELF_READ]: '访问个人数据',
  [PERMISSIONS.EMPLOYEE_MANAGEMENT_READ]: '查看员工信息',
  [PERMISSIONS.EMPLOYEE_MANAGEMENT_WRITE]: '编辑员工信息',
  [PERMISSIONS.USER_MANAGEMENT_READ]: '查看用户管理',
  [PERMISSIONS.USER_MANAGEMENT_WRITE]: '用户管理操作',
  [PERMISSIONS.ROLE_VIEW]: '查看角色',
  [PERMISSIONS.ROLE_MANAGE]: '管理角色',
  [PERMISSIONS.ROLE_ASSIGN]: '分配角色',
  [PERMISSIONS.ROLE_PERMISSION_VIEW]: '查看角色权限',
  [PERMISSIONS.ROLE_PERMISSION_MANAGE]: '管理角色权限',
  [PERMISSIONS.ROLE_HISTORY_VIEW]: '查看角色历史',
  [PERMISSIONS.ROLE_REQUEST_APPROVE]: '批准角色申请',
  [PERMISSIONS.ROLE_MANAGEMENT_READ]: '查看角色管理',
  [PERMISSIONS.ROLE_MANAGEMENT_WRITE]: '编辑角色管理',
  [PERMISSIONS.PERMISSION_MANAGEMENT_READ]: '查看权限管理',
  [PERMISSIONS.PERMISSION_MANAGEMENT_WRITE]: '编辑权限管理',
  [PERMISSIONS.PAYROLL_MANAGEMENT_READ]: '查看薪资管理',
  [PERMISSIONS.PAYROLL_MANAGEMENT_WRITE]: '编辑薪资管理',
  [PERMISSIONS.PAYROLL_CLEAR]: '清空薪资',
  [PERMISSIONS.STATISTICS_VIEW]: '查看统计',
  [PERMISSIONS.STATISTICS_EXPORT]: '导出统计',
  [PERMISSIONS.STATISTICS_TRENDS_VIEW]: '查看趋势统计',
  [PERMISSIONS.HR_STATISTICS_VIEW]: '查看HR统计',
  [PERMISSIONS.PAYROLL_STATISTICS_VIEW]: '查看薪资统计'
} as const;

// 类型定义 - 支持动态权限字符串
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS] | string;  // 允许动态权限字符串
export type Role = keyof typeof ROLE_PERMISSIONS;
export type PermissionGroup = keyof typeof PERMISSION_GROUPS;

/**
 * 🚀 动态权限系统说明
 * 
 * 新架构支持：
 * 1. 静态权限常量：hasPermission(PERMISSIONS.DASHBOARD_READ)  
 * 2. 动态权限字符串：hasPermission('payroll.clear') ✅ 推荐
 * 3. 运行时权限发现：discoverUserPermissions()
 * 4. 权限元数据获取：getPermissionMetadata('payroll.clear')
 * 
 * 最佳实践：使用动态字符串，让数据库驱动权限系统
 */