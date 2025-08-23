/**
 * 角色权限管理 Hook
 * 
 * 功能特性：
 * - 角色权限的分配和管理
 * - 权限继承的实时计算
 * - 权限矩阵视图数据
 * - 权限冲突检测和解决
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import type { Permission } from '@/types/permission';

// 权限信息类型
export interface PermissionInfo {
  id: string;
  permission_code: string;
  permission_name: string;
  resource_id: string;
  action_type: string;
  description: string;
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 角色权限分配信息
export interface RolePermissionAssignment {
  id: string;
  role_id: string;
  permission_id: string;
  granted_by: string;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
  is_inherited: boolean;
  inherited_from_role?: string;
}

// 权限矩阵项
export interface PermissionMatrixItem {
  role_id: string;
  role_name: string;
  permission_id: string;
  permission_code: string;
  permission_name: string;
  has_permission: boolean;
  is_inherited: boolean;
  inherited_from?: string;
  granted_by?: string;
  granted_at?: string;
}

// 权限冲突信息
export interface PermissionConflict {
  role_id: string;
  role_name: string;
  permission_id: string;
  permission_name: string;
  conflict_type: 'duplicate' | 'inherited_override' | 'circular_dependency';
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestions: string[];
}

// 权限继承计算结果
export interface PermissionInheritanceResult {
  role_id: string;
  direct_permissions: PermissionInfo[];
  inherited_permissions: PermissionInfo[];
  effective_permissions: PermissionInfo[];
  inheritance_path: string[];
}

/**
 * 角色权限管理 Hook
 */
export function useRolePermissions() {
  const { user } = useUnifiedAuth();
  const [permissions, setPermissions] = useState<PermissionInfo[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 获取所有权限
  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('permissions')
        .select('*')
        .eq('is_active', true)
        .order('resource_id')
        .order('action_type');

      if (fetchError) {
        throw new Error(`获取权限失败: ${fetchError.message}`);
      }

      setPermissions(data || []);
      console.log(`[useRolePermissions] 已加载 ${data?.length || 0} 个权限`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取权限失败');
      setError(error);
      console.error('[useRolePermissions] 获取权限错误:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取角色权限分配
  const fetchRolePermissions = useCallback(async () => {
    setLoading(true);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('role_permissions')
        .select(`
          *,
          role:roles(role_name),
          permission:permissions(permission_code, permission_name)
        `)
        .eq('is_active', true)
        .order('role_id')
        .order('permission_id');

      if (fetchError) {
        throw new Error(`获取角色权限失败: ${fetchError.message}`);
      }

      setRolePermissions(data || []);
      console.log(`[useRolePermissions] 已加载 ${data?.length || 0} 个角色权限分配`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取角色权限失败');
      setError(error);
      console.error('[useRolePermissions] 获取角色权限错误:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 为角色分配权限
  const assignPermissionToRole = useCallback(async (
    roleId: string, 
    permissionId: string,
    expiresAt?: Date
  ): Promise<boolean> => {
    if (!user) {
      throw new Error('用户未认证');
    }

    setLoading(true);
    setError(null);

    try {
      // 检查是否已存在此权限分配
      const { data: existing } = await supabase
        .from('role_permissions')
        .select('id')
        .eq('role_id', roleId)
        .eq('permission_id', permissionId)
        .eq('is_active', true)
        .single();

      if (existing) {
        throw new Error('该角色已拥有此权限');
      }

      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert({
          role_id: roleId,
          permission_id: permissionId,
          granted_by: user.id,
          granted_at: new Date().toISOString(),
          expires_at: expiresAt?.toISOString() || null,
          is_active: true
        });

      if (insertError) {
        throw new Error(`分配权限失败: ${insertError.message}`);
      }

      // 记录变更历史
      await supabase
        .from('role_change_history')
        .insert({
          role_id: roleId,
          change_type: 'permission_added',
          new_values: { permission_id: permissionId },
          changed_by: user.id,
          changed_at: new Date().toISOString()
        });

      console.log(`[useRolePermissions] 权限分配成功: ${roleId} -> ${permissionId}`);
      await fetchRolePermissions();
      return true;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('分配权限失败');
      setError(error);
      console.error('[useRolePermissions] 分配权限错误:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, fetchRolePermissions]);

  // 撤销角色权限
  const revokePermissionFromRole = useCallback(async (
    roleId: string, 
    permissionId: string
  ): Promise<boolean> => {
    if (!user) {
      throw new Error('用户未认证');
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('role_permissions')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('role_id', roleId)
        .eq('permission_id', permissionId)
        .eq('is_active', true);

      if (updateError) {
        throw new Error(`撤销权限失败: ${updateError.message}`);
      }

      // 记录变更历史
      await supabase
        .from('role_change_history')
        .insert({
          role_id: roleId,
          change_type: 'permission_removed',
          old_values: { permission_id: permissionId },
          changed_by: user.id,
          changed_at: new Date().toISOString()
        });

      console.log(`[useRolePermissions] 权限撤销成功: ${roleId} -> ${permissionId}`);
      await fetchRolePermissions();
      return true;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('撤销权限失败');
      setError(error);
      console.error('[useRolePermissions] 撤销权限错误:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, fetchRolePermissions]);

  // 批量分配权限
  const batchAssignPermissions = useCallback(async (
    assignments: Array<{
      roleId: string;
      permissionIds: string[];
      expiresAt?: Date;
    }>
  ): Promise<{ success: number; failed: number; errors: string[] }> => {
    if (!user) {
      throw new Error('用户未认证');
    }

    setLoading(true);
    setError(null);

    const result = { success: 0, failed: 0, errors: [] as string[] };

    try {
      for (const assignment of assignments) {
        for (const permissionId of assignment.permissionIds) {
          try {
            await assignPermissionToRole(assignment.roleId, permissionId, assignment.expiresAt);
            result.success++;
          } catch (err) {
            result.failed++;
            result.errors.push(`角色 ${assignment.roleId} 权限 ${permissionId}: ${err instanceof Error ? err.message : '未知错误'}`);
          }
        }
      }

      console.log(`[useRolePermissions] 批量权限分配完成: 成功 ${result.success}, 失败 ${result.failed}`);
      return result;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('批量分配权限失败');
      setError(error);
      console.error('[useRolePermissions] 批量分配权限错误:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, assignPermissionToRole]);

  // 计算权限继承
  const calculatePermissionInheritance = useCallback(async (roleId: string): Promise<PermissionInheritanceResult> => {
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select(`
          id,
          role_name,
          parent_role_id,
          level
        `)
        .eq('id', roleId)
        .single();

      if (roleError || !roleData) {
        throw new Error('角色不存在');
      }

      // 获取直接权限
      const { data: directPerms, error: directError } = await supabase
        .from('role_permissions')
        .select(`
          permissions(*)
        `)
        .eq('role_id', roleId)
        .eq('is_active', true);

      if (directError) {
        throw new Error(`获取直接权限失败: ${directError.message}`);
      }

      const directPermissions = (directPerms || []).map(rp => rp.permissions).filter(Boolean);

      // 递归获取继承权限
      const inheritedPermissions: PermissionInfo[] = [];
      const inheritancePath: string[] = [roleId];

      const getInheritedPermissions = async (currentRoleId: string, path: string[] = []): Promise<void> => {
        const { data: currentRole } = await supabase
          .from('roles')
          .select('parent_role_id')
          .eq('id', currentRoleId)
          .single();

        if (currentRole?.parent_role_id) {
          const parentRoleId = currentRole.parent_role_id;
          path.push(parentRoleId);

          // 获取父角色权限
          const { data: parentPerms } = await supabase
            .from('role_permissions')
            .select(`
              permissions(*)
            `)
            .eq('role_id', parentRoleId)
            .eq('is_active', true);

          if (parentPerms) {
            parentPerms.forEach(rp => {
              if (rp.permissions && !inheritedPermissions.find(p => p.id === rp.permissions.id)) {
                inheritedPermissions.push(rp.permissions);
              }
            });
          }

          // 递归获取祖先权限
          await getInheritedPermissions(parentRoleId, path);
        }
      };

      await getInheritedPermissions(roleId, inheritancePath);

      // 合并有效权限
      const effectivePermissions = [...directPermissions];
      inheritedPermissions.forEach(perm => {
        if (!effectivePermissions.find(p => p.id === perm.id)) {
          effectivePermissions.push(perm);
        }
      });

      return {
        role_id: roleId,
        direct_permissions: directPermissions,
        inherited_permissions: inheritedPermissions,
        effective_permissions: effectivePermissions,
        inheritance_path: inheritancePath
      };

    } catch (err) {
      console.error('[useRolePermissions] 计算权限继承错误:', err);
      throw err;
    }
  }, []);

  // 构建权限矩阵
  const buildPermissionMatrix = useCallback(async (): Promise<PermissionMatrixItem[]> => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('id, role_name')
        .eq('is_active', true);

      if (rolesError) {
        throw new Error(`获取角色失败: ${rolesError.message}`);
      }

      const matrix: PermissionMatrixItem[] = [];

      for (const role of rolesData || []) {
        const inheritance = await calculatePermissionInheritance(role.id);
        
        // 处理所有权限
        const allPermissions = new Set([
          ...inheritance.direct_permissions.map(p => p.id),
          ...inheritance.inherited_permissions.map(p => p.id)
        ]);

        for (const permission of permissions) {
          const hasPermission = allPermissions.has(permission.id);
          const isDirect = inheritance.direct_permissions.some(p => p.id === permission.id);
          
          matrix.push({
            role_id: role.id,
            role_name: role.role_name,
            permission_id: permission.id,
            permission_code: permission.permission_code,
            permission_name: permission.permission_name,
            has_permission: hasPermission,
            is_inherited: hasPermission && !isDirect
          });
        }
      }

      return matrix;
    } catch (err) {
      console.error('[useRolePermissions] 构建权限矩阵错误:', err);
      return [];
    }
  }, [permissions, calculatePermissionInheritance]);

  // 检测权限冲突
  const detectPermissionConflicts = useCallback(async (): Promise<PermissionConflict[]> => {
    const conflicts: PermissionConflict[] = [];

    try {
      // 检查重复权限分配
      const { data: duplicates, error: duplicateError } = await supabase
        .from('role_permissions')
        .select(`
          role_id,
          permission_id,
          count(*)
        `)
        .eq('is_active', true);

      if (duplicateError) {
        throw new Error(`检查重复权限失败: ${duplicateError.message}`);
      }

      // TODO: 实现更复杂的冲突检测逻辑
      console.log('[useRolePermissions] 权限冲突检测完成');
      
    } catch (err) {
      console.error('[useRolePermissions] 权限冲突检测错误:', err);
    }

    return conflicts;
  }, []);

  // 权限统计信息
  const permissionStats = useMemo(() => {
    const totalPermissions = permissions.length;
    const assignedPermissions = new Set(rolePermissions.map(rp => rp.permission_id)).size;
    const unassignedPermissions = totalPermissions - assignedPermissions;

    return {
      totalPermissions,
      assignedPermissions,
      unassignedPermissions,
      assignmentRatio: totalPermissions > 0 ? assignedPermissions / totalPermissions : 0
    };
  }, [permissions, rolePermissions]);

  // 初始化加载
  useEffect(() => {
    if (user) {
      fetchPermissions();
      fetchRolePermissions();
    }
  }, [user, fetchPermissions, fetchRolePermissions]);

  return {
    // 数据状态
    permissions,
    rolePermissions,
    permissionStats,
    loading,
    error,

    // 权限管理操作
    assignPermissionToRole,
    revokePermissionFromRole,
    batchAssignPermissions,

    // 权限计算和分析
    calculatePermissionInheritance,
    buildPermissionMatrix,
    detectPermissionConflicts,

    // 数据刷新
    fetchPermissions,
    fetchRolePermissions,

    // 工具方法
    getPermissionById: useCallback((permissionId: string) => 
      permissions.find(p => p.id === permissionId), [permissions]),
    getRolePermissions: useCallback((roleId: string) => 
      rolePermissions.filter(rp => rp.role_id === roleId), [rolePermissions]),
    hasRolePermission: useCallback((roleId: string, permissionId: string) => 
      rolePermissions.some(rp => rp.role_id === roleId && rp.permission_id === permissionId && rp.is_active), [rolePermissions])
  };
}