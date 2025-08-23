/**
 * 用户管理系统类型定义
 * 
 * 基于 Supabase 数据库架构的用户管理类型系统
 */

import type { Permission, Role } from './permission';

// 用户基础信息接口
export interface UserProfile {
  id: string;
  email: string;
  employee_id?: string;
  employee_name?: string;
  department_name?: string;
  position_name?: string;
  created_at?: string;
  updated_at?: string;
}

// 用户角色分配接口
export interface UserRole {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// 角色定义接口
export interface RoleDefinition {
  id: string;
  role_code: string;
  role_name: string;
  parent_role_id?: string;
  level?: number;
  description?: string;
  metadata?: Record<string, any>;
  is_system_role?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// 权限申请记录接口
export interface PermissionRequestRecord {
  id: string;
  user_id: string;
  permission_code: string;
  resource_id?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

// 用户完整信息（联合查询结果）
export interface UserWithDetails extends UserProfile {
  roles: UserRole[];
  permissions: Permission[];
  active_role?: string;
  role_names?: string[];
  last_login?: string;
  login_count?: number;
  status: 'active' | 'inactive' | 'suspended';
}

// 用户搜索过滤条件
export interface UserSearchFilters {
  search?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'suspended';
  department?: string;
  has_employee?: boolean;
  created_after?: string;
  created_before?: string;
}

// 用户排序选项
export type UserSortField = 'email' | 'employee_name' | 'created_at' | 'last_login' | 'status';
export type UserSortOrder = 'asc' | 'desc';

export interface UserSortOptions {
  field: UserSortField;
  order: UserSortOrder;
}

// 用户列表分页参数
export interface UserListPagination {
  page: number;
  pageSize: number;
  total?: number;
  totalPages?: number;
}

// 用户操作类型
export type UserAction = 
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'assign_role'
  | 'remove_role'
  | 'activate'
  | 'deactivate'
  | 'suspend'
  | 'reset_password'
  | 'view_permissions'
  | 'manage_permissions';

// 批量操作类型
export type BatchUserAction = 
  | 'activate'
  | 'deactivate'
  | 'suspend'
  | 'delete'
  | 'assign_role'
  | 'remove_role'
  | 'export';

// 批量操作配置
export interface BatchUserOperation {
  action: BatchUserAction;
  userIds: string[];
  parameters?: {
    role?: string;
    reason?: string;
    notify?: boolean;
  };
}

// 用户创建表单数据
export interface CreateUserData {
  email: string;
  employee_id?: string;
  role: string;
  send_invitation?: boolean;
  temporary_password?: string;
}

// 用户更新表单数据
export interface UpdateUserData {
  email?: string;
  employee_id?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

// 角色分配表单数据
export interface AssignRoleData {
  user_id: string;
  role: string;
  reason?: string;
  expires_at?: string;
}

// 用户活动日志
export interface UserActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

// 用户统计信息
export interface UserStatistics {
  total_users: number;
  active_users: number;
  inactive_users: number;
  suspended_users: number;
  users_with_employees: number;
  recent_logins: number;
  pending_permission_requests: number;
  role_distribution: Record<string, number>;
}

// 用户管理 Hook 配置选项
export interface UseUserManagementOptions {
  enableRealtime?: boolean;
  cacheTimeout?: number;
  pageSize?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// 用户管理 Hook 返回类型
export interface UseUserManagementReturn {
  // 用户数据
  users: UserWithDetails[];
  total: number;
  loading: boolean;
  error: Error | null;
  
  // 分页和筛选
  pagination: UserListPagination;
  filters: UserSearchFilters;
  sorting: UserSortOptions;
  
  // 数据操作方法
  loadUsers: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  searchUsers: (filters: UserSearchFilters) => Promise<void>;
  sortUsers: (options: UserSortOptions) => void;
  changePage: (page: number) => void;
  changePageSize: (size: number) => void;
  
  // CRUD 操作
  createUser: (data: CreateUserData) => Promise<string>;
  updateUser: (id: string, data: UpdateUserData) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  getUserById: (id: string) => Promise<UserWithDetails>;
  
  // 角色管理
  assignRole: (data: AssignRoleData) => Promise<void>;
  removeRole: (userId: string, role: string) => Promise<void>;
  getUserRoles: (userId: string) => Promise<UserRole[]>;
  
  // 批量操作
  performBatchOperation: (operation: BatchUserOperation) => Promise<void>;
  
  // 统计信息
  getStatistics: () => Promise<UserStatistics>;
  
  // 实时更新
  isSubscribed: boolean;
  subscribe: () => void;
  unsubscribe: () => void;
}

// 用户表格列配置
export interface UserTableColumn {
  id: string;
  header: string;
  accessor?: keyof UserWithDetails;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
  render?: (user: UserWithDetails) => React.ReactNode;
}

// 用户管理页面状态
export interface UserManagementPageState {
  selectedUsers: string[];
  showCreateModal: boolean;
  showEditModal: boolean;
  showRoleModal: boolean;
  showBatchModal: boolean;
  editingUser?: UserWithDetails;
  batchAction?: BatchUserAction;
  viewMode: 'table' | 'grid' | 'list';
}

// 权限申请处理结果
export interface ProcessPermissionRequestResult {
  success: boolean;
  message: string;
  updatedRequest?: PermissionRequestRecord;
}

// 角色层级树节点
export interface RoleTreeNode extends RoleDefinition {
  children: RoleTreeNode[];
  user_count?: number;
  permissions?: Permission[];
}

// 用户导出格式选项
export type UserExportFormat = 'csv' | 'excel' | 'json' | 'pdf';

// 用户导出配置
export interface UserExportConfig {
  format: UserExportFormat;
  fields: (keyof UserWithDetails)[];
  includeRoles?: boolean;
  includePermissions?: boolean;
  filters?: UserSearchFilters;
  filename?: string;
}

// 用户导入配置
export interface UserImportConfig {
  file: File;
  mapping: Record<string, keyof CreateUserData>;
  options: {
    skipFirstRow: boolean;
    sendInvitations: boolean;
    defaultRole?: string;
    updateExisting: boolean;
  };
}

// 用户邀请配置
export interface UserInvitationConfig {
  emails: string[];
  role: string;
  message?: string;
  expires_in_days?: number;
  require_employee_link?: boolean;
}

// 错误类型定义
export class UserManagementError extends Error {
  public code: string;
  public details?: any;

  constructor(
    message: string,
    code: string,
    details?: any
  ) {
    super(message);
    this.name = 'UserManagementError';
    this.code = code;
    this.details = details;
  }
}

export class UserNotFoundError extends UserManagementError {
  constructor(userId: string) {
    super(`User not found: ${userId}`, 'USER_NOT_FOUND', { userId });
    this.name = 'UserNotFoundError';
  }
}

export class RoleAssignmentError extends UserManagementError {
  constructor(message: string, userId: string, role: string) {
    super(message, 'ROLE_ASSIGNMENT_ERROR', { userId, role });
    this.name = 'RoleAssignmentError';
  }
}

export class BatchOperationError extends UserManagementError {
  public failedUsers: { id: string; error: string }[];

  constructor(
    message: string,
    failedUsers: { id: string; error: string }[]
  ) {
    super(message, 'BATCH_OPERATION_ERROR', { failedUsers });
    this.name = 'BatchOperationError';
    this.failedUsers = failedUsers;
  }
}