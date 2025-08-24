/**
 * 角色管理核心 Hook
 * 
 * 功能特性：
 * - 角色的增删改查操作
 * - 角色继承关系管理
 * - 角色权限分配
 * - 角色使用统计
 * - 角色变更历史追踪
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import type { Role } from '@/types/permission';

// 角色管理相关类型定义
export interface RoleInfo {
  id: string;
  role_code: string;
  role_name: string;
  parent_role_id: string | null;
  parent_role_name?: string;
  level: number;
  description: string | null;
  metadata: Record<string, any>;
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: RoleInfo[];
  permissions?: RolePermission[];
  user_count?: number;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  permission_code: string;
  permission_name: string;
  resource_id: string;
  action_type: string;
  description: string;
  granted_by: string | null;
  granted_at: string;
  is_active: boolean;
}

export interface CreateRoleData {
  role_code: string;
  role_name: string;
  parent_role_id?: string;
  description?: string;
  metadata?: Record<string, any>;
  is_system_role?: boolean;
}

export interface UpdateRoleData extends Partial<CreateRoleData> {
  id: string;
}

export interface RoleHierarchyNode {
  role: RoleInfo;
  children: RoleHierarchyNode[];
  depth: number;
  path: string[];
}

export interface RoleUsageStats {
  role_id: string;
  role_name: string;
  active_users: number;
  inactive_users: number;
  total_users: number;
  recent_assignments: number;
  permission_count: number;
}

export interface RoleChangeHistory {
  id: string;
  role_id: string;
  change_type: 'created' | 'updated' | 'deleted' | 'permission_added' | 'permission_removed';
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  changed_by: string;
  changed_at: string;
  reason?: string;
}

/**
 * 角色管理主 Hook
 */
export function useRoleManagement() {
  const { user } = useUnifiedAuth();
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 获取所有角色
  const fetchRoles = useCallback(async (includeInactive = false) => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('roles')
        .select(`
          *,
          parent:roles!parent_role_id(role_name),
          role_permissions(
            id,
            permission_id,
            permissions(
              permission_code,
              permission_name,
              resource_id,
              action_type,
              description
            ),
            granted_by,
            granted_at,
            is_active
          )
        `)
        .order('level', { ascending: true })
        .order('role_name');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(`获取角色失败: ${fetchError.message}`);
      }

      // 处理数据结构，添加用户统计
      const rolesWithStats = await Promise.all(
        (data || []).map(async (role) => {
          // 获取该角色的用户数量
          const { count: userCount } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
            .eq('role_id', role.id)
            .eq('is_active', true);

          return {
            ...role,
            parent_role_name: role.parent?.role_name,
            user_count: userCount || 0,
            permissions: role.role_permissions?.map((rp: any) => ({
              id: rp.id,
              role_id: role.id,
              permission_id: rp.permission_id,
              permission_code: rp.permissions.permission_code,
              permission_name: rp.permissions.permission_name,
              resource_id: rp.permissions.resource_id,
              action_type: rp.permissions.action_type,
              description: rp.permissions.description,
              granted_by: rp.granted_by,
              granted_at: rp.granted_at,
              is_active: rp.is_active
            })) || []
          };
        })
      );

      setRoles(rolesWithStats as RoleInfo[]);
      console.log(`[useRoleManagement] 已加载 ${rolesWithStats.length} 个角色`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取角色失败');
      setError(error);
      console.error('[useRoleManagement] 获取角色错误:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建角色
  const createRole = useCallback(async (roleData: CreateRoleData): Promise<string> => {
    if (!user) {
      throw new Error('用户未认证');
    }

    setLoading(true);
    setError(null);

    try {
      // 计算角色层级
      let level = 0;
      if (roleData.parent_role_id) {
        const { data: parentRole } = await supabase
          .from('roles')
          .select('level')
          .eq('id', roleData.parent_role_id)
          .single();
        
        if (parentRole && parentRole.level !== null) {
          level = parentRole.level + 1;
        }
      }

      const { data, error: createError } = await supabase
        .from('roles')
        .insert({
          ...roleData,
          level,
          metadata: roleData.metadata || {},
          is_system_role: roleData.is_system_role || false,
          is_active: true
        })
        .select('id')
        .single();

      if (createError) {
        throw new Error(`创建角色失败: ${createError.message}`);
      }

      // 记录变更历史
      await supabase
        .from('role_change_history')
        .insert({
          role_id: data.id,
          change_type: 'created',
          new_values: roleData as any,
          changed_by: user.id,
          changed_at: new Date().toISOString()
        });

      console.log(`[useRoleManagement] 角色创建成功: ${data.id}`);
      await fetchRoles(); // 重新获取角色列表
      return data.id;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('创建角色失败');
      setError(error);
      console.error('[useRoleManagement] 创建角色错误:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, fetchRoles]);

  // 更新角色
  const updateRole = useCallback(async (updateData: UpdateRoleData): Promise<boolean> => {
    if (!user) {
      throw new Error('用户未认证');
    }

    setLoading(true);
    setError(null);

    try {
      // 获取旧值用于历史记录
      const { data: oldRole } = await supabase
        .from('roles')
        .select('*')
        .eq('id', updateData.id)
        .single();

      if (!oldRole) {
        throw new Error('角色不存在');
      }

      // 如果更改了父角色，重新计算层级
      let level = oldRole.level;
      if (updateData.parent_role_id && updateData.parent_role_id !== oldRole.parent_role_id) {
        const { data: parentRole } = await supabase
          .from('roles')
          .select('level')
          .eq('id', updateData.parent_role_id)
          .single();
        
        if (parentRole && parentRole.level !== null) {
          level = parentRole.level + 1;
        }
      }

      const { error: updateError } = await supabase
        .from('roles')
        .update({
          ...updateData,
          level,
          updated_at: new Date().toISOString()
        })
        .eq('id', updateData.id);

      if (updateError) {
        throw new Error(`更新角色失败: ${updateError.message}`);
      }

      // 记录变更历史
      await supabase
        .from('role_change_history')
        .insert({
          role_id: updateData.id,
          change_type: 'updated',
          old_values: oldRole as any,
          new_values: updateData as any,
          changed_by: user.id,
          changed_at: new Date().toISOString()
        });

      console.log(`[useRoleManagement] 角色更新成功: ${updateData.id}`);
      await fetchRoles(); // 重新获取角色列表
      return true;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('更新角色失败');
      setError(error);
      console.error('[useRoleManagement] 更新角色错误:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, fetchRoles]);

  // 删除角色（软删除）
  const deleteRole = useCallback(async (roleId: string): Promise<boolean> => {
    if (!user) {
      throw new Error('用户未认证');
    }

    setLoading(true);
    setError(null);

    try {
      // 检查是否是系统角色
      const { data: role } = await supabase
        .from('roles')
        .select('is_system_role, role_name')
        .eq('id', roleId)
        .single();

      if (!role) {
        throw new Error('角色不存在');
      }

      if (role.is_system_role) {
        throw new Error('无法删除系统角色');
      }

      // 检查是否有用户使用此角色
      const { count: userCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', roleId)
        .eq('is_active', true);

      if (userCount && userCount > 0) {
        throw new Error(`无法删除角色：仍有 ${userCount} 个用户使用此角色`);
      }

      // 软删除角色
      const { error: deleteError } = await supabase
        .from('roles')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', roleId);

      if (deleteError) {
        throw new Error(`删除角色失败: ${deleteError.message}`);
      }

      // 记录变更历史
      await supabase
        .from('role_change_history')
        .insert({
          role_id: roleId,
          change_type: 'deleted',
          old_values: { is_active: true },
          new_values: { is_active: false },
          changed_by: user.id,
          changed_at: new Date().toISOString()
        });

      console.log(`[useRoleManagement] 角色删除成功: ${roleId}`);
      await fetchRoles(); // 重新获取角色列表
      return true;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('删除角色失败');
      setError(error);
      console.error('[useRoleManagement] 删除角色错误:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, fetchRoles]);

  // 构建角色层级树
  const roleHierarchy = useMemo((): RoleHierarchyNode[] => {
    const buildHierarchy = (parentId: string | null, depth = 0, path: string[] = []): RoleHierarchyNode[] => {
      return roles
        .filter(role => role.parent_role_id === parentId)
        .map(role => ({
          role,
          depth,
          path: [...path, role.id],
          children: buildHierarchy(role.id, depth + 1, [...path, role.id])
        }));
    };

    return buildHierarchy(null);
  }, [roles]);

  // 获取角色使用统计
  const getRoleUsageStats = useCallback(async (): Promise<RoleUsageStats[]> => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select(`
          id,
          role_name,
          user_roles(
            is_active,
            user_profiles(
              id
            )
          ),
          role_permissions(
            id
          )
        `)
        .eq('is_active', true);

      if (error) {
        throw new Error(`获取角色统计失败: ${error.message}`);
      }

      return (data || []).map(role => {
        const userRoles = Array.isArray(role.user_roles) ? role.user_roles : [];
        const activeUsers = userRoles.filter((ur: any) => ur.is_active).length;
        const inactiveUsers = userRoles.filter((ur: any) => !ur.is_active).length;
        
        return {
          role_id: role.id,
          role_name: role.role_name,
          active_users: activeUsers,
          inactive_users: inactiveUsers,
          total_users: activeUsers + inactiveUsers,
          recent_assignments: 0, // TODO: 计算最近分配数
          permission_count: (role.role_permissions || []).length
        };
      });
    } catch (err) {
      console.error('[useRoleManagement] 获取角色统计错误:', err);
      return [];
    }
  }, []);

  // 获取角色变更历史
  const getRoleChangeHistory = useCallback(async (roleId?: string): Promise<RoleChangeHistory[]> => {
    try {
      let query = supabase
        .from('role_change_history')
        .select(`
          *,
          changed_by_user:user_profiles!changed_by(email),
          role:roles(role_name)
        `)
        .order('changed_at', { ascending: false });

      if (roleId) {
        query = query.eq('role_id', roleId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`获取变更历史失败: ${error.message}`);
      }

      return (data || []).map(item => ({
        id: item.id,
        role_id: item.role_id,
        change_type: item.change_type as RoleChangeHistory['change_type'],
        old_values: item.old_values as Record<string, any>,
        new_values: item.new_values as Record<string, any>,
        changed_by: item.changed_by || 'system',
        changed_at: item.changed_at,
        reason: item.reason || undefined
      }));
    } catch (err) {
      console.error('[useRoleManagement] 获取变更历史错误:', err);
      return [];
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    if (user) {
      fetchRoles();
    }
  }, [user, fetchRoles]);

  return {
    // 数据状态
    roles,
    roleHierarchy,
    loading,
    error,

    // 角色管理操作
    createRole,
    updateRole,
    deleteRole,
    fetchRoles,

    // 统计和历史
    getRoleUsageStats,
    getRoleChangeHistory,

    // 工具方法
    findRoleById: useCallback((roleId: string) => roles.find(r => r.id === roleId), [roles]),
    getRolesByLevel: useCallback((level: number) => roles.filter(r => r.level === level), [roles]),
    getChildRoles: useCallback((parentId: string) => roles.filter(r => r.parent_role_id === parentId), [roles])
  };
}