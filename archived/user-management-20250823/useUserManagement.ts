/**
 * 用户管理 Hook
 * 
 * 提供完整的用户管理功能，包括 CRUD 操作、角色管理、批量操作等
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/permissions';
import { PERMISSIONS } from '@/constants/permissions';
import { useTranslation } from '@/hooks/useTranslation';
import type {
  UserWithDetails,
  UserSearchFilters,
  UserSortOptions,
  UserListPagination,
  CreateUserData,
  UpdateUserData,
  AssignRoleData,
  BatchUserOperation,
  UserStatistics,
  UseUserManagementOptions,
  UseUserManagementReturn
} from '@/types/user-management';
import { UserManagementError, UserNotFoundError, RoleAssignmentError, BatchOperationError } from '@/types/user-management';

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_CACHE_TIMEOUT = 5 * 60 * 1000; // 5分钟

export function useUserManagement(
  options: UseUserManagementOptions = {}
): UseUserManagementReturn {
  const { t } = useTranslation('admin');
  const { hasPermission } = usePermissions();
  
  // 配置选项
  const config = {
    enableRealtime: true,
    cacheTimeout: DEFAULT_CACHE_TIMEOUT,
    pageSize: DEFAULT_PAGE_SIZE,
    autoRefresh: false,
    refreshInterval: 30000,
    ...options
  };

  // 状态管理
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const [pagination, setPagination] = useState<UserListPagination>({
    page: 1,
    pageSize: config.pageSize,
    total: 0,
    totalPages: 0
  });
  
  const [filters, setFilters] = useState<UserSearchFilters>({});
  const [sorting, setSorting] = useState<UserSortOptions>({
    field: 'created_at',
    order: 'desc'
  });

  // 实时订阅管理
  const [isSubscribed, setIsSubscribed] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 错误处理辅助函数
  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`[useUserManagement] ${context}:`, err);
    const error = err instanceof Error ? err : new Error(String(err));
    setError(error);
    return error;
  }, []);

  // 构建查询条件
  const buildQuery = useCallback(() => {
    let query = supabase
      .from('user_profiles')
      .select(`
        *,
        user_roles (
          role,
          is_active,
          created_at
        ),
        employees (
          employee_name
        )
      `);

    // 应用过滤条件
    if (filters.search) {
      query = query.or(`email.ilike.%${filters.search}%,employees.employee_name.ilike.%${filters.search}%`);
    }
    
    if (filters.role) {
      query = query.eq('user_roles.role', filters.role);
    }
    
    if (filters.status === 'active') {
      query = query.eq('user_roles.is_active', true);
    } else if (filters.status === 'inactive') {
      query = query.eq('user_roles.is_active', false);
    }
    
    if (filters.department) {
      query = query.eq('employees.departments.department_name', filters.department);
    }
    
    if (filters.has_employee !== undefined) {
      if (filters.has_employee) {
        query = query.not('employee_id', 'is', null);
      } else {
        query = query.is('employee_id', null);
      }
    }
    
    if (filters.created_after) {
      query = query.gte('created_at', filters.created_after);
    }
    
    if (filters.created_before) {
      query = query.lte('created_at', filters.created_before);
    }

    // 应用排序
    const sortField = sorting.field === 'employee_name' ? 'employees.employee_name' : sorting.field;
    query = query.order(sortField, { ascending: sorting.order === 'asc' });

    return query;
  }, [filters, sorting]);

  // 加载用户数据
  const loadUsers = useCallback(async () => {
    if (!hasPermission(PERMISSIONS.USER_VIEW)) {
      setError(new UserManagementError('Insufficient permissions', 'PERMISSION_DENIED'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const query = buildQuery();
      
      // 获取总数
      const { count } = await query.select('*', { count: 'exact', head: true });
      
      // 获取分页数据
      const { data, error: queryError } = await query
        .range(
          (pagination.page - 1) * pagination.pageSize,
          pagination.page * pagination.pageSize - 1
        );

      if (queryError) throw queryError;

      // 转换数据格式并获取部门/职位信息
      const transformedUsers: UserWithDetails[] = [];
      
      for (const user of (data || [])) {
        // 获取员工的部门和职位信息
        let department_name: string | undefined;
        let position_name: string | undefined;
        
        if (user.employees?.employee_name) {
          const { data: empInfo } = await supabase
            .from('view_employee_basic_info')
            .select('department_name, position_name')
            .eq('employee_id', user.employee_id!)
            .single();
            
          department_name = empInfo?.department_name || undefined;
          position_name = empInfo?.position_name || undefined;
        }
        
        transformedUsers.push({
          ...user,
          employee_name: user.employees?.employee_name || undefined,
          department_name,
          position_name,
          roles: Array.isArray(user.user_roles) ? user.user_roles : [],
          permissions: [], // 需要单独查询
          active_role: Array.isArray(user.user_roles) ? user.user_roles.find((r: any) => r.is_active)?.role : undefined,
          role_names: Array.isArray(user.user_roles) ? user.user_roles.map((r: any) => r.role) : [],
          status: Array.isArray(user.user_roles) ? (user.user_roles.some((r: any) => r.is_active) ? 'active' : 'inactive') : 'inactive'
        });
      }

      setUsers(transformedUsers);
      setTotal(count || 0);
      setPagination(prev => ({
        ...prev,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / prev.pageSize)
      }));

    } catch (err) {
      handleError(err, 'loadUsers');
    } finally {
      setLoading(false);
    }
  }, [hasPermission, buildQuery, pagination.page, pagination.pageSize, handleError]);

  // 刷新用户数据
  const refreshUsers = useCallback(async () => {
    await loadUsers();
  }, [loadUsers]);

  // 搜索用户
  const searchUsers = useCallback(async (newFilters: UserSearchFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // 排序用户
  const sortUsers = useCallback((options: UserSortOptions) => {
    setSorting(options);
  }, []);

  // 分页控制
  const changePage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const changePageSize = useCallback((pageSize: number) => {
    setPagination(prev => ({ 
      ...prev, 
      pageSize, 
      page: 1,
      totalPages: Math.ceil(prev.total / pageSize)
    }));
  }, []);

  // 创建用户
  const createUser = useCallback(async (data: CreateUserData): Promise<string> => {
    if (!hasPermission(PERMISSIONS.USER_CREATE)) {
      throw new UserManagementError('Insufficient permissions', 'PERMISSION_DENIED');
    }

    setLoading(true);
    try {
      // 检查邮箱是否已存在
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', data.email)
        .single();

      if (existingUser) {
        throw new UserManagementError('Email already exists', 'EMAIL_DUPLICATE');
      }

      // 创建用户档案
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          email: data.email,
          employee_id: data.employee_id
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // 分配角色
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userProfile.id,
          role: data.role,
          is_active: true
        });

      if (roleError) throw roleError;

      // 发送邀请邮件（如果需要）
      if (data.send_invitation) {
        // TODO: 实现邀请邮件发送
        console.log('TODO: Send invitation email to:', data.email);
      }

      await refreshUsers();
      return userProfile.id;

    } catch (err) {
      throw handleError(err, 'createUser');
    } finally {
      setLoading(false);
    }
  }, [hasPermission, handleError, refreshUsers]);

  // 更新用户
  const updateUser = useCallback(async (id: string, data: UpdateUserData): Promise<void> => {
    if (!hasPermission(PERMISSIONS.USER_UPDATE)) {
      throw new UserManagementError('Insufficient permissions', 'PERMISSION_DENIED');
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // 如果更新状态，同步更新角色状态
      if (data.status !== undefined) {
        const isActive = data.status === 'active';
        await supabase
          .from('user_roles')
          .update({ is_active: isActive })
          .eq('user_id', id);
      }

      await refreshUsers();

    } catch (err) {
      throw handleError(err, 'updateUser');
    } finally {
      setLoading(false);
    }
  }, [hasPermission, handleError, refreshUsers]);

  // 删除用户
  const deleteUser = useCallback(async (id: string): Promise<void> => {
    if (!hasPermission(PERMISSIONS.USER_DELETE)) {
      throw new UserManagementError('Insufficient permissions', 'PERMISSION_DENIED');
    }

    setLoading(true);
    try {
      // 检查用户是否存在
      const { data: user } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', id)
        .single();

      if (!user) {
        throw new UserNotFoundError(id);
      }

      // 删除用户角色
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', id);

      // 删除用户档案
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await refreshUsers();

    } catch (err) {
      throw handleError(err, 'deleteUser');
    } finally {
      setLoading(false);
    }
  }, [hasPermission, handleError, refreshUsers]);

  // 获取用户详情
  const getUserById = useCallback(async (id: string): Promise<UserWithDetails> => {
    if (!hasPermission(PERMISSIONS.USER_VIEW)) {
      throw new UserManagementError('Insufficient permissions', 'PERMISSION_DENIED');
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          user_roles (
            role,
            is_active,
            created_at
          ),
          employees (
            employee_name
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new UserNotFoundError(id);

      // 获取员工的部门和职位信息
      let department_name: string | undefined;
      let position_name: string | undefined;
      
      if (data.employee_id) {
        const { data: empInfo } = await supabase
          .from('view_employee_basic_info')
          .select('department_name, position_name')
          .eq('employee_id', data.employee_id)
          .single();
          
        department_name = empInfo?.department_name || undefined;
        position_name = empInfo?.position_name || undefined;
      }

      return {
        ...data,
        employee_name: data.employees?.employee_name || undefined,
        department_name,
        position_name,
        roles: Array.isArray(data.user_roles) ? data.user_roles : [],
        permissions: [], // 需要单独查询
        active_role: Array.isArray(data.user_roles) ? data.user_roles.find((r: any) => r.is_active)?.role : undefined,
        role_names: Array.isArray(data.user_roles) ? data.user_roles.map((r: any) => r.role) : [],
        status: Array.isArray(data.user_roles) ? (data.user_roles.some((r: any) => r.is_active) ? 'active' : 'inactive') : 'inactive'
      };

    } catch (err) {
      throw handleError(err, 'getUserById');
    }
  }, [hasPermission, handleError]);

  // 分配角色
  const assignRole = useCallback(async (data: AssignRoleData): Promise<void> => {
    if (!hasPermission(PERMISSIONS.USER_ASSIGN_ROLE)) {
      throw new RoleAssignmentError('Insufficient permissions', data.user_id, data.role);
    }

    try {
      // 检查角色是否已存在
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', data.user_id)
        .eq('role', data.role)
        .single();

      if (existingRole) {
        throw new RoleAssignmentError('Role already assigned', data.user_id, data.role);
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user_id,
          role: data.role,
          is_active: true
        });

      if (error) throw error;

      await refreshUsers();

    } catch (err) {
      throw handleError(err, 'assignRole') as RoleAssignmentError;
    }
  }, [hasPermission, handleError, refreshUsers]);

  // 移除角色
  const removeRole = useCallback(async (userId: string, role: string): Promise<void> => {
    if (!hasPermission(PERMISSIONS.USER_REMOVE_ROLE)) {
      throw new RoleAssignmentError('Insufficient permissions', userId, role);
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      await refreshUsers();

    } catch (err) {
      throw handleError(err, 'removeRole') as RoleAssignmentError;
    }
  }, [hasPermission, handleError, refreshUsers]);

  // 获取用户角色
  const getUserRoles = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return (data || []).map(role => ({
      ...role,
      is_active: role.is_active ?? false,
      created_at: role.created_at || undefined,
      updated_at: role.updated_at || undefined
    }));
  }, []);

  // 批量操作
  const performBatchOperation = useCallback(async (operation: BatchUserOperation): Promise<void> => {
    if (!hasPermission(PERMISSIONS[`USER_${operation.action.toUpperCase()}` as keyof typeof PERMISSIONS])) {
      throw new UserManagementError('Insufficient permissions', 'PERMISSION_DENIED');
    }

    setLoading(true);
    const failedUsers: { id: string; error: string }[] = [];

    try {
      for (const userId of operation.userIds) {
        try {
          switch (operation.action) {
            case 'activate':
              await supabase
                .from('user_roles')
                .update({ is_active: true })
                .eq('user_id', userId);
              break;

            case 'deactivate':
              await supabase
                .from('user_roles')
                .update({ is_active: false })
                .eq('user_id', userId);
              break;

            case 'delete':
              await deleteUser(userId);
              break;

            case 'assign_role':
              if (operation.parameters?.role) {
                await assignRole({
                  user_id: userId,
                  role: operation.parameters.role,
                  reason: operation.parameters.reason
                });
              }
              break;

            case 'remove_role':
              if (operation.parameters?.role) {
                await removeRole(userId, operation.parameters.role);
              }
              break;
          }
        } catch (err) {
          failedUsers.push({
            id: userId,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }

      if (failedUsers.length > 0) {
        throw new BatchOperationError(
          `${failedUsers.length} operations failed`,
          failedUsers
        );
      }

      await refreshUsers();

    } catch (err) {
      if (err instanceof BatchOperationError) {
        throw err;
      }
      throw handleError(err, 'performBatchOperation');
    } finally {
      setLoading(false);
    }
  }, [hasPermission, deleteUser, assignRole, removeRole, refreshUsers, handleError]);

  // 获取统计信息
  const getStatistics = useCallback(async (): Promise<UserStatistics> => {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        user_roles (
          role,
          is_active
        )
      `);

    if (error) throw error;

    const stats: UserStatistics = {
      total_users: users?.length || 0,
      active_users: 0,
      inactive_users: 0,
      suspended_users: 0,
      users_with_employees: 0,
      recent_logins: 0,
      pending_permission_requests: 0,
      role_distribution: {}
    };

    users?.forEach(user => {
      const hasActiveRole = Array.isArray(user.user_roles) && user.user_roles.some((r: any) => r.is_active);
      if (hasActiveRole) {
        stats.active_users++;
      } else {
        stats.inactive_users++;
      }

      if (user.employee_id) {
        stats.users_with_employees++;
      }

      // 统计角色分布
      if (Array.isArray(user.user_roles)) {
        user.user_roles.forEach((role: any) => {
          if (role.is_active) {
            stats.role_distribution[role.role] = (stats.role_distribution[role.role] || 0) + 1;
          }
        });
      }
    });

    return stats;
  }, []);

  // 实时订阅
  const subscribe = useCallback(() => {
    if (!config.enableRealtime || isSubscribed) return;

    subscriptionRef.current = supabase
      .channel('user_management')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_profiles' },
        () => {
          console.log('[useUserManagement] User profiles changed, refreshing...');
          refreshUsers();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles' },
        () => {
          console.log('[useUserManagement] User roles changed, refreshing...');
          refreshUsers();
        }
      )
      .subscribe();

    setIsSubscribed(true);
  }, [config.enableRealtime, isSubscribed, refreshUsers]);

  const unsubscribe = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    setIsSubscribed(false);
  }, []);

  // 自动刷新
  useEffect(() => {
    if (config.autoRefresh && config.refreshInterval > 0) {
      refreshTimeoutRef.current = setInterval(refreshUsers, config.refreshInterval);
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
    };
  }, [config.autoRefresh, config.refreshInterval, refreshUsers]);

  // 自动订阅
  useEffect(() => {
    if (config.enableRealtime) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [config.enableRealtime, subscribe, unsubscribe]);

  // 初始加载
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return {
    // 数据状态
    users,
    total,
    loading,
    error,
    
    // 分页和筛选
    pagination,
    filters,
    sorting,
    
    // 数据操作方法
    loadUsers,
    refreshUsers,
    searchUsers,
    sortUsers,
    changePage,
    changePageSize,
    
    // CRUD 操作
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    
    // 角色管理
    assignRole,
    removeRole,
    getUserRoles,
    
    // 批量操作
    performBatchOperation,
    
    // 统计信息
    getStatistics,
    
    // 实时更新
    isSubscribed,
    subscribe,
    unsubscribe
  };
}