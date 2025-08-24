/**
 * 角色管理 Hook
 * 
 * 功能特性：
 * - 角色层级管理和验证
 * - 角色切换和权限升级
 * - 角色权限映射
 * - 实时角色状态同步
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/lib/supabase';
import { permissionManager } from '@/lib/permissionManager';
import { ROLE_PERMISSIONS } from '@/constants/permissions';
import type {
  Role,
  Permission,
  UseRoleReturn,
  PermissionChangeEvent
} from '@/types/permission';
import { RoleEscalationError } from '@/types/permission';

// 角色层级定义（数值越高权限越大）
const ROLE_HIERARCHY: Record<Role, number> = {
  'employee': 1,
  'manager': 2,
  'hr_manager': 3,
  'admin': 4,
  'super_admin': 5
} as const;

/**
 * 角色管理 Hook
 */
export function useRole(): UseRoleReturn {
  const { user } = useUnifiedAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 当前角色信息
  const role = useMemo((): Role => {
    return (user?.role as Role) || 'employee';
  }, [user?.role]);

  const rolePermissions = useMemo((): Permission[] => {
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['employee'];
    
    // 如果是超级管理员，返回所有权限
    if (permissions.includes('*' as any)) {
      return Object.values(ROLE_PERMISSIONS).flat().filter(p => p !== '*') as Permission[];
    }
    
    return [...permissions] as Permission[];
  }, [role]);

  // 角色验证方法
  const isRole = useCallback((targetRole: Role | Role[]): boolean => {
    if (!user) return false;

    const currentRole = role;
    const targetRoles = Array.isArray(targetRole) ? targetRole : [targetRole];
    
    return targetRoles.includes(currentRole);
  }, [role, user]);

  // 角色层级检查
  const hasRoleLevel = useCallback((minLevel: Role): boolean => {
    if (!user) return false;

    const currentLevel = ROLE_HIERARCHY[role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minLevel] || 0;
    
    return currentLevel >= requiredLevel;
  }, [role, user]);

  // 检查是否可以升级权限
  const canEscalate = useMemo((): boolean => {
    if (!user) return false;

    const currentLevel = ROLE_HIERARCHY[role] || 0;
    const maxLevel = Math.max(...Object.values(ROLE_HIERARCHY));
    
    return currentLevel < maxLevel;
  }, [role, user]);

  // 角色切换
  const switchRole = useCallback(async (newRole: Role): Promise<boolean> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const currentLevel = ROLE_HIERARCHY[role] || 0;
    const targetLevel = ROLE_HIERARCHY[newRole] || 0;

    // 检查是否允许切换到目标角色
    if (targetLevel > currentLevel) {
      throw new RoleEscalationError(
        `Cannot escalate from ${role} to ${newRole}`,
        role,
        newRole
      );
    }

    setLoading(true);
    setError(null);

    try {
      // 更新数据库中的角色
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (updateError) {
        throw new Error(`Failed to switch role: ${updateError.message}`);
      }

      // 清理权限缓存
      permissionManager.clearCache(user.id);

      // 广播角色变更事件
      const changeEvent: PermissionChangeEvent = {
        type: 'role_changed',
        userId: user.id,
        role: newRole,
        timestamp: new Date(),
        metadata: { 
          previousRole: role,
          switchType: 'manual'
        }
      };

      permissionManager.broadcastPermissionChange(changeEvent);

      console.log(`[useRole] Role switched from ${role} to ${newRole} for user ${user.id}`);
      return true;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Role switch failed');
      setError(error);
      console.error('[useRole] Role switch error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  // 权限申请
  const requestRole = useCallback(async (targetRole: Role, reason: string): Promise<string> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const currentLevel = ROLE_HIERARCHY[role] || 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0;

    if (targetLevel <= currentLevel) {
      throw new Error(`Cannot request lower or equal role level: ${targetRole}`);
    }

    setLoading(true);
    setError(null);

    try {
      // 创建角色申请记录
      const { data, error: insertError } = await supabase
        .from('role_requests')
        .insert({
          user_id: user.id,
          current_role_name: role,
          requested_role_name: targetRole,
          reason: reason,
          status: 'pending',
          requested_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7天过期
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to create role request: ${insertError.message}`);
      }

      console.log(`[useRole] Role request created: ${data.id} for ${user.email} (${role} -> ${targetRole})`);
      return data.id;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Role request failed');
      setError(error);
      console.error('[useRole] Role request error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  // 监听角色变更
  useEffect(() => {
    if (!user) return;

    const handlePermissionChange = (event: PermissionChangeEvent) => {
      if (event.type === 'role_changed' && event.userId === user.id) {
        // 角色变更时可以执行额外的逻辑
        console.log(`[useRole] User role changed to: ${event.role}`);
      }
    };

    const unsubscribe = permissionManager.subscribe({
      userId: user.id,
      permissions: rolePermissions,
      onPermissionChange: handlePermissionChange,
      onError: (error) => {
        console.error('[useRole] Subscription error:', error);
        setError(error);
      }
    });

    return unsubscribe;
  }, [user, rolePermissions]);

  return {
    // 角色信息
    role,
    isRole,
    hasRoleLevel,
    
    // 角色权限
    rolePermissions,
    canEscalate,
    
    // 状态
    loading,
    error,
    
    // 角色管理
    switchRole,
    requestRole,
  };
}

// 角色工具函数
export const roleUtils = {
  /**
   * 获取角色显示名称
   */
  getRoleDisplayName(role: Role): string {
    const displayNames: Record<Role, string> = {
      'employee': '员工',
      'manager': '经理',
      'hr_manager': 'HR经理',
      'admin': '管理员',
      'super_admin': '超级管理员'
    };
    return displayNames[role] || role;
  },

  /**
   * 获取角色描述
   */
  getRoleDescription(role: Role): string {
    const descriptions: Record<Role, string> = {
      'employee': '基本员工权限，可查看个人信息和薪资',
      'manager': '部门经理权限，可管理本部门员工',
      'hr_manager': 'HR经理权限，可管理员工和薪资',
      'admin': '系统管理员权限，可管理大部分系统功能',
      'super_admin': '超级管理员权限，拥有所有系统权限'
    };
    return descriptions[role] || '未知角色';
  },

  /**
   * 获取角色层级
   */
  getRoleLevel(role: Role): number {
    return ROLE_HIERARCHY[role] || 0;
  },

  /**
   * 检查角色升级是否有效
   */
  isValidRoleEscalation(fromRole: Role, toRole: Role): boolean {
    const fromLevel = ROLE_HIERARCHY[fromRole] || 0;
    const toLevel = ROLE_HIERARCHY[toRole] || 0;
    return toLevel > fromLevel;
  },

  /**
   * 获取可升级的角色列表
   */
  getEscalatableRoles(currentRole: Role): Role[] {
    const currentLevel = ROLE_HIERARCHY[currentRole] || 0;
    return Object.entries(ROLE_HIERARCHY)
      .filter(([, level]) => level > currentLevel)
      .map(([role]) => role as Role);
  },

  /**
   * 获取角色权限数量
   */
  getRolePermissionCount(role: Role): number {
    const permissions = ROLE_PERMISSIONS[role] || [];
    
    if (permissions.includes('*' as Permission)) {
      return Object.keys(ROLE_PERMISSIONS).flat().length;
    }
    
    return permissions.length;
  },

  /**
   * 比较两个角色的权限级别
   */
  compareRoles(roleA: Role, roleB: Role): number {
    const levelA = ROLE_HIERARCHY[roleA] || 0;
    const levelB = ROLE_HIERARCHY[roleB] || 0;
    return levelA - levelB;
  }
};

// 导出角色常量
export { ROLE_HIERARCHY };