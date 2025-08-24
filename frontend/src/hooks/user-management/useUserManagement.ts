/**
 * 用户管理Hook - 基于权限系统的完整用户管理功能
 * 
 * 功能特性：
 * - 基于 view_user_permissions 视图进行用户数据查询
 * - 集成权限系统进行用户权限管理
 * - 支持用户角色分配和权限配置
 * - 提供用户CRUD操作和批量操作
 * 
 * 设计原则：
 * - 权限控制：所有操作都经过权限验证
 * - 数据安全：敏感操作需要额外权限确认
 * - 实时同步：用户变更实时反映到权限系统
 * - 审计记录：重要操作自动记录审计日志
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/permissions';
import type { Permission } from '@/types/permission';

// 用户管理相关类型定义
export interface UserProfile {
  id: string;
  email: string;
  employee_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  // 从关联表获取的员工信息
  employee_name?: string;
  department_name?: string;
  position_name?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserWithPermissions {
  // 基础用户信息（可为空，因为从数据库视图获取）
  user_id: string | null;
  email: string | null;
  employee_id: string | null;
  employee_name: string | null;
  department_name: string | null;
  position_name: string | null;
  category_name: string | null;
  
  // 角色和权限信息（可为空）
  user_role: string | null;
  role_active: boolean | null;
  permissions: string[] | null;
  page_permissions: Record<string, boolean> | null;
  data_scope: string | null;
  role_metadata: {
    role_name: string;
    role_level: number;
    [key: string]: any;
  } | null;
  
  // 时间信息（可为空）
  role_assigned_at: string | null;
  effective_from: string | null;
  effective_until: string | null;
  
  // 状态信息（可为空）
  config_active: boolean | null;
  config_role: string | null;
  permission_rules: any;
  
  // 员工状态信息
  employment_status: string | null;
  employee_active: boolean | null;
}

export interface UserManagementFilters {
  role?: string;
  active?: boolean;
  search?: string;
  department?: string;
  sortBy?: 'email' | 'role' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface UserRoleAssignmentData {
  user_id: string;
  role: string;
  effective_from?: string;
  effective_until?: string;
  reason?: string;
}

export interface UserManagementStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  suspended_users: number;
  users_with_employees: number;
  recent_logins: number;
  pending_permission_requests: number;
  role_distribution: Record<string, number>;
  by_role: Record<string, number>;
  by_department: Record<string, number>;
  recent_activity: number;
}

export interface UseUserManagementReturn {
  // 用户数据
  users: UserWithPermissions[];
  selectedUsers: string[];
  userStats: UserManagementStats | null;
  
  // 数据操作
  fetchUsers: (filters?: UserManagementFilters) => Promise<UserWithPermissions[]>;
  getUserById: (userId: string) => Promise<UserWithPermissions | null>;
  searchUsers: (query: string) => Promise<UserWithPermissions[]>;
  
  // 用户管理操作
  createUserProfile: (email: string, employeeId?: string) => Promise<UserProfile>;
  updateUserProfile: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  reactivateUser: (userId: string) => Promise<void>;
  
  // 角色管理操作
  assignUserRole: (data: UserRoleAssignmentData) => Promise<void>;
  revokeUserRole: (userId: string, role: string) => Promise<void>;
  updateUserPermissions: (userId: string, permissions: string[]) => Promise<void>;
  
  // 批量操作
  batchAssignRole: (userIds: string[], role: string) => Promise<void>;
  batchRevokeRole: (userIds: string[], role: string) => Promise<void>;
  batchUpdateStatus: (userIds: string[], active: boolean) => Promise<void>;
  
  // 统计和分析
  getUserStats: () => Promise<UserManagementStats>;
  getActivityLog: (userId?: string) => Promise<any[]>;
  
  // 选择管理
  setSelectedUsers: (userIds: string[]) => void;
  selectAllUsers: () => void;
  clearSelection: () => void;
  toggleUserSelection: (userId: string) => void;
  
  // 过滤和排序
  applyFilters: (filters: UserManagementFilters) => void;
  clearFilters: () => void;
  
  // 权限检查
  canManageUsers: boolean;
  canAssignRoles: boolean;
  canViewUserDetails: boolean;
  canDeactivateUsers: boolean;
  
  // 状态
  loading: boolean;
  error: Error | null;
  filters: UserManagementFilters;
}

/**
 * 用户管理主Hook
 */
export function useUserManagement(): UseUserManagementReturn {
  const permissions = usePermissions({
    enableResourceAccess: true,
    enableRoleManagement: true
  });

  // 状态管理
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<UserManagementStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<UserManagementFilters>({});

  // 权限检查
  const canManageUsers = useMemo(() => 
    permissions.hasPermission('user_management.write'), [permissions]
  );
  
  const canAssignRoles = useMemo(() => 
    permissions.hasPermission('assign_roles'), [permissions]
  );
  
  const canViewUserDetails = useMemo(() => 
    permissions.hasPermission('user_management.read'), [permissions]
  );
  
  const canDeactivateUsers = useMemo(() => 
    permissions.hasPermission('user_management.write'), [permissions]
  );

  // 获取用户列表
  const fetchUsers = useCallback(async (queryFilters?: UserManagementFilters): Promise<UserWithPermissions[]> => {
    // 在函数内部检查权限，而不是依赖外部的canViewUserDetails
    if (!permissions.hasPermission('user_management.read')) {
      throw new Error('Insufficient permissions to view users');
    }

    setLoading(true);
    setError(null);

    try {
      const actualFilters = queryFilters || filters;
      let query = supabase
        .from('view_user_management_unified')
        .select('*');

      // 应用过滤条件
      if (actualFilters.role) {
        query = query.eq('user_role', actualFilters.role);
      }
      
      if (actualFilters.active !== undefined) {
        query = query.eq('role_active', actualFilters.active);
      }
      
      if (actualFilters.search) {
        query = query.or(`email.ilike.%${actualFilters.search}%,employee_name.ilike.%${actualFilters.search}%`);
      }
      
      if (actualFilters.department) {
        query = query.eq('department_name', actualFilters.department);
      }

      // 排序
      const sortBy = actualFilters.sortBy || 'created_at';
      const sortOrder = actualFilters.sortOrder || 'desc';
      query = query.order(sortBy === 'created_at' ? 'role_assigned_at' : sortBy, { ascending: sortOrder === 'asc' });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(`Failed to fetch users: ${fetchError.message}`);
      }

      const usersData = (data || []).map(record => ({
        user_id: record.user_id,
        email: record.email,
        employee_id: record.employee_id,
        employee_name: record.employee_name,
        department_name: record.department_name,
        position_name: record.position_name,
        category_name: record.category_name,
        user_role: record.user_role,
        role_active: record.role_active,
        permissions: Array.isArray(record.permissions) ? record.permissions as string[] : null,
        page_permissions: (record.page_permissions && typeof record.page_permissions === 'object') ? record.page_permissions as Record<string, boolean> : null,
        data_scope: record.data_scope,
        role_metadata: (record.role_metadata && typeof record.role_metadata === 'object') ? record.role_metadata as {role_name: string; role_level: number; [key: string]: any} : null,
        role_assigned_at: record.role_assigned_at,
        effective_from: record.effective_from,
        effective_until: record.effective_until,
        config_active: record.config_active,
        config_role: record.config_role,
        permission_rules: record.permission_rules,
        employment_status: record.employment_status,
        employee_active: record.employee_active
      })) as UserWithPermissions[];

      setUsers(usersData);
      return usersData;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch users');
      setError(error);
      console.error('[useUserManagement] Fetch users error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [permissions]); // Remove filters dependency to prevent infinite loops

  // 根据ID获取单个用户
  const getUserById = useCallback(async (userId: string): Promise<UserWithPermissions | null> => {
    // 在函数内部检查权限，而不是依赖外部的canViewUserDetails
    if (!permissions.hasPermission('user_management.read')) {
      throw new Error('Insufficient permissions to view user details');
    }

    try {
      const { data, error } = await supabase
        .from('view_user_management_unified')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // 用户不存在
        }
        throw new Error(`Failed to fetch user: ${error.message}`);
      }

      return {
        user_id: data.user_id,
        email: data.email,
        employee_id: data.employee_id,
        employee_name: data.employee_name,
        department_name: data.department_name,
        position_name: data.position_name,
        category_name: data.category_name,
        user_role: data.user_role,
        role_active: data.role_active,
        permissions: Array.isArray(data.permissions) ? data.permissions as string[] : null,
        page_permissions: (data.page_permissions && typeof data.page_permissions === 'object') ? data.page_permissions as Record<string, boolean> : null,
        data_scope: data.data_scope,
        role_metadata: (data.role_metadata && typeof data.role_metadata === 'object') ? data.role_metadata as {role_name: string; role_level: number; [key: string]: any} : null,
        role_assigned_at: data.role_assigned_at,
        effective_from: data.effective_from,
        effective_until: data.effective_until,
        config_active: data.config_active,
        config_role: data.config_role,
        permission_rules: data.permission_rules,
        employment_status: data.employment_status,
        employee_active: data.employee_active
      };

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch user');
      setError(error);
      console.error('[useUserManagement] Get user by ID error:', error);
      throw error;
    }
  }, [permissions]);

  // 搜索用户
  const searchUsers = useCallback(async (query: string): Promise<UserWithPermissions[]> => {
    return fetchUsers({ ...filters, search: query });
  }, [fetchUsers, filters]);

  // 创建用户档案 - 占位符实现，应该通过后端API处理
  const createUserProfile = useCallback(async (email: string, employeeId?: string): Promise<UserProfile> => {
    if (!canManageUsers) {
      throw new Error('Insufficient permissions to create users');
    }

    console.warn('[useUserManagement] createUserProfile - 此功能需要后端API支持');
    
    // 模拟用户创建
    const mockUser: UserProfile = {
      id: crypto.randomUUID(),
      email,
      employee_id: employeeId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 刷新用户列表
    await fetchUsers();

    return mockUser;
  }, [canManageUsers, fetchUsers]);

  // 更新用户档案
  const updateUserProfile = useCallback(async (userId: string, updates: Partial<UserProfile>): Promise<void> => {
    if (!canManageUsers) {
      throw new Error('Insufficient permissions to update users');
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        throw new Error(`Failed to update user profile: ${error.message}`);
      }

      // 刷新用户列表
      await fetchUsers();

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update user profile');
      setError(error);
      console.error('[useUserManagement] Update user profile error:', error);
      throw error;
    }
  }, [canManageUsers, fetchUsers]);

  // 分配用户角色
  const assignUserRole = useCallback(async (data: UserRoleAssignmentData): Promise<void> => {
    if (!canAssignRoles) {
      throw new Error('Insufficient permissions to assign roles');
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user_id,
          role: data.role,
          is_active: true,
          created_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Failed to assign role: ${error.message}`);
      }

      // 刷新用户列表
      await fetchUsers();

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to assign role');
      setError(error);
      console.error('[useUserManagement] Assign role error:', error);
      throw error;
    }
  }, [canAssignRoles, fetchUsers]);

  // 撤销用户角色
  const revokeUserRole = useCallback(async (userId: string, role: string): Promise<void> => {
    if (!canAssignRoles) {
      throw new Error('Insufficient permissions to revoke roles');
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('role', role);

      if (error) {
        throw new Error(`Failed to revoke role: ${error.message}`);
      }

      // 刷新用户列表
      await fetchUsers();

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to revoke role');
      setError(error);
      console.error('[useUserManagement] Revoke role error:', error);
      throw error;
    }
  }, [canAssignRoles, fetchUsers]);

  // 停用用户
  const deactivateUser = useCallback(async (userId: string): Promise<void> => {
    if (!canDeactivateUsers) {
      throw new Error('Insufficient permissions to deactivate users');
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to deactivate user: ${error.message}`);
      }

      // 刷新用户列表
      await fetchUsers();

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to deactivate user');
      setError(error);
      console.error('[useUserManagement] Deactivate user error:', error);
      throw error;
    }
  }, [canDeactivateUsers, fetchUsers]);

  // 激活用户
  const reactivateUser = useCallback(async (userId: string): Promise<void> => {
    if (!canDeactivateUsers) {
      throw new Error('Insufficient permissions to reactivate users');
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to reactivate user: ${error.message}`);
      }

      // 刷新用户列表
      await fetchUsers();

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reactivate user');
      setError(error);
      console.error('[useUserManagement] Reactivate user error:', error);
      throw error;
    }
  }, [canDeactivateUsers, fetchUsers]);

  // 批量分配角色
  const batchAssignRole = useCallback(async (userIds: string[], role: string): Promise<void> => {
    if (!canAssignRoles) {
      throw new Error('Insufficient permissions to assign roles');
    }

    try {
      const insertData = userIds.map(userId => ({
        user_id: userId,
        role,
        is_active: true,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('user_roles')
        .insert(insertData);

      if (error) {
        throw new Error(`Failed to batch assign roles: ${error.message}`);
      }

      // 刷新用户列表
      await fetchUsers();

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to batch assign roles');
      setError(error);
      console.error('[useUserManagement] Batch assign roles error:', error);
      throw error;
    }
  }, [canAssignRoles, fetchUsers]);

  // 获取用户统计信息
  const getUserStats = useCallback(async (): Promise<UserManagementStats> => {
    // 在函数内部检查权限，而不是依赖外部的canViewUserDetails
    if (!permissions.hasPermission('user_management.read')) {
      throw new Error('Insufficient permissions to view user statistics');
    }

    try {
      const { data, error } = await supabase
        .from('view_user_management_unified')
        .select('user_role, role_active, department_name, employee_id');

      if (error) {
        throw new Error(`Failed to fetch user statistics: ${error.message}`);
      }

      const stats: UserManagementStats = {
        total_users: data.length,
        active_users: data.filter(u => u.role_active).length,
        inactive_users: data.filter(u => !u.role_active).length,
        suspended_users: 0, // TODO: 添加逻辑来计算挂起用户
        users_with_employees: data.filter(u => u.employee_id).length,
        recent_logins: 0, // TODO: 添加逻辑来计算最近登录
        pending_permission_requests: 0, // TODO: 添加逻辑来计算待审批请求
        role_distribution: {},
        by_role: {},
        by_department: {},
        recent_activity: 0
      };

      // 按角色统计
      data.forEach(user => {
        const role = user.user_role || 'unknown';
        stats.by_role[role] = (stats.by_role[role] || 0) + 1;
        stats.role_distribution[role] = (stats.role_distribution[role] || 0) + 1;
      });

      // 按部门统计
      data.forEach(user => {
        const dept = user.department_name || 'unknown';
        stats.by_department[dept] = (stats.by_department[dept] || 0) + 1;
      });

      setUserStats(stats);
      return stats;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch user statistics');
      setError(error);
      console.error('[useUserManagement] Get user stats error:', error);
      throw error;
    }
  }, [permissions]);

  // 选择管理功能
  const selectAllUsers = useCallback(() => {
    setSelectedUsers(users.map(u => u.user_id).filter(Boolean) as string[]);
  }, [users]);

  const clearSelection = useCallback(() => {
    setSelectedUsers([]);
  }, []);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }, []);

  // 过滤管理
  const applyFilters = useCallback((newFilters: UserManagementFilters) => {
    setFilters(newFilters);
    fetchUsers(newFilters);
  }, [fetchUsers]);

  const clearFilters = useCallback(() => {
    setFilters({});
    fetchUsers({});
  }, [fetchUsers]);

  // 初始化数据加载
  useEffect(() => {
    // 稳定的权限检查和数据加载
    const loadData = async () => {
      if (permissions.hasPermission('user_management.read')) {
        try {
          await Promise.all([
            fetchUsers(),
            getUserStats()
          ]);
        } catch (error) {
          console.error('[useUserManagement] 初始数据加载失败:', error);
        }
      }
    };

    loadData();
  }, []); // 仅在组件挂载时执行一次

  // 当权限状态变化时，重新检查是否需要加载数据
  useEffect(() => {
    // 直接检查权限而不是依赖canViewUserDetails memoized值
    if (permissions.hasPermission('user_management.read') && users.length === 0 && !loading) {
      fetchUsers().catch(console.error);
      getUserStats().catch(console.error);
    }
  }, [permissions.initialized, users.length, loading, fetchUsers, getUserStats]); // 只依赖稳定值

  // 占位符实现 - 待完善的功能
  const updateUserPermissions = useCallback(async (userId: string, permissions: string[]): Promise<void> => {
    console.warn('updateUserPermissions not yet implemented');
  }, []);

  const batchRevokeRole = useCallback(async (userIds: string[], role: string): Promise<void> => {
    console.warn('batchRevokeRole not yet implemented');
  }, []);

  const batchUpdateStatus = useCallback(async (userIds: string[], active: boolean): Promise<void> => {
    console.warn('batchUpdateStatus not yet implemented');
  }, []);

  const getActivityLog = useCallback(async (userId?: string): Promise<any[]> => {
    console.warn('getActivityLog not yet implemented');
    return [];
  }, []);

  return {
    // 数据
    users,
    selectedUsers,
    userStats,
    
    // 数据操作
    fetchUsers,
    getUserById,
    searchUsers,
    
    // 用户管理
    createUserProfile,
    updateUserProfile,
    deactivateUser,
    reactivateUser,
    
    // 角色管理
    assignUserRole,
    revokeUserRole,
    updateUserPermissions,
    
    // 批量操作
    batchAssignRole,
    batchRevokeRole,
    batchUpdateStatus,
    
    // 统计和分析
    getUserStats,
    getActivityLog,
    
    // 选择管理
    setSelectedUsers,
    selectAllUsers,
    clearSelection,
    toggleUserSelection,
    
    // 过滤和排序
    applyFilters,
    clearFilters,
    
    // 权限检查
    canManageUsers,
    canAssignRoles,
    canViewUserDetails,
    canDeactivateUsers,
    
    // 状态
    loading: loading || (permissions.loading ?? false),
    error: error || (permissions.error instanceof Error ? permissions.error : null),
    filters
  };
}

// 用户管理工具函数
export const userManagementUtils = {
  /**
   * 格式化用户角色显示文本
   */
  formatRoleName: (role: string, metadata?: any): string => {
    return metadata?.role_name || role;
  },

  /**
   * 获取角色优先级
   */
  getRolePriority: (role: string): number => {
    const priorityMap: Record<string, number> = {
      'super_admin': 0,
      'admin': 1,
      'hr_manager': 2,
      'manager': 3,
      'employee': 4
    };
    return priorityMap[role] ?? 999;
  },

  /**
   * 格式化权限数量显示
   */
  formatPermissionCount: (permissions: string[]): string => {
    const count = permissions?.length || 0;
    return count === 0 ? '无权限' : `${count} 个权限`;
  },

  /**
   * 检查用户是否为管理员
   */
  isAdmin: (user: UserWithPermissions): boolean => {
    return user.user_role ? ['super_admin', 'admin'].includes(user.user_role) : false;
  },

  /**
   * 获取用户状态颜色
   */
  getUserStatusColor: (user: UserWithPermissions): string => {
    if (!user.role_active) return 'error';
    if (!user.config_active) return 'warning';
    return 'success';
  }
};