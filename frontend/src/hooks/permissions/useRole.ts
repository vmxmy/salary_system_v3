/**
 * 角色管理 Hook - 基于新的统一权限系统
 * 
 * 功能特性：
 * - 基于 user_roles 表进行角色管理
 * - 集成 unified_permission_config 的角色权限
 * - 支持角色层级验证
 * - 提供角色切换和申请功能
 * 
 * 设计原则：
 * - 数据库驱动：角色信息直接从数据库获取
 * - 权限集成：角色权限通过权限矩阵查询
 * - 安全第一：严格的角色层级控制
 * - 实时同步：角色变更实时反映
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/lib/supabase';
import { unifiedPermissionManager } from '@/lib/unifiedPermissionManager';
import type {
  Role,
  Permission,
  UseRoleReturn,
  PermissionChangeEvent
} from '@/types/permission';

// 角色层级定义（数值越高权限越大）
const ROLE_HIERARCHY: Record<Role, number> = {
  'employee': 1,
  'manager': 2,
  'hr_manager': 3,
  'admin': 4,
  'super_admin': 5
} as const;

// 角色显示信息
const ROLE_INFO: Record<Role, { name: string; description: string; color: string }> = {
  'employee': {
    name: '员工',
    description: '基本员工权限，可查看个人信息和薪资',
    color: 'primary'
  },
  'manager': {
    name: '经理',
    description: '部门经理权限，可管理本部门员工',
    color: 'secondary'
  },
  'hr_manager': {
    name: 'HR经理',
    description: 'HR经理权限，可管理员工和薪资',
    color: 'accent'
  },
  'admin': {
    name: '管理员',
    description: '系统管理员权限，可管理大部分系统功能',
    color: 'warning'
  },
  'super_admin': {
    name: '超级管理员',
    description: '超级管理员权限，拥有所有系统权限',
    color: 'error'
  }
} as const;

/**
 * 角色管理错误类
 */
interface RoleError extends Error {
  currentRole: Role;
  targetRole?: Role;
  code?: string;
}

/**
 * 角色升级错误类
 */
interface RoleEscalationError extends RoleError {
  targetRole: Role;
}

// 错误创建函数
const createRoleError = (message: string, currentRole: Role, targetRole?: Role, code?: string): RoleError => {
  const error = new Error(message) as RoleError;
  error.name = 'RoleError';
  error.currentRole = currentRole;
  error.targetRole = targetRole;
  error.code = code;
  return error;
};

const createRoleEscalationError = (message: string, currentRole: Role, targetRole: Role): RoleEscalationError => {
  const error = createRoleError(message, currentRole, targetRole, 'ESCALATION_DENIED') as RoleEscalationError;
  error.name = 'RoleEscalationError';
  return error;
};

/**
 * 角色管理 Hook
 */
export function useRole(): UseRoleReturn {
  const { user } = useUnifiedAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);

  // 当前角色信息
  const role = useMemo((): Role => {
    return (user?.role as Role) || 'employee';
  }, [user?.role]);

  const roleInfo = useMemo(() => {
    return ROLE_INFO[role] || ROLE_INFO['employee'];
  }, [role]);

  // 获取角色对应的权限列表
  const fetchRolePermissions = useCallback(async (targetRole?: Role): Promise<Permission[]> => {
    const checkRole = targetRole || role;
    
    try {
      // 使用统一权限配置表查询角色权限
      const { data, error } = await supabase
        .from('unified_permission_config')
        .select('permission_rules')
        .eq('role_code', checkRole)
        .eq('is_active', true);

      if (error) throw error;

      // 从JSONB权限规则中提取权限代码
      const permissions: Permission[] = [];
      (data || []).forEach(config => {
        if (config.permission_rules && typeof config.permission_rules === 'object') {
          Object.keys(config.permission_rules).forEach(key => {
            if (!permissions.includes(key as Permission)) {
              permissions.push(key as Permission);
            }
          });
        }
      });
      
      if (!targetRole) {
        setRolePermissions(permissions);
      }
      
      return permissions;
    } catch (err) {
      console.error(`[useRole] Error fetching permissions for role ${checkRole}:`, err);
      return [];
    }
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

  // 获取可升级的角色列表
  const getEscalatableRoles = useCallback((): Role[] => {
    const currentLevel = ROLE_HIERARCHY[role] || 0;
    return Object.entries(ROLE_HIERARCHY)
      .filter(([, level]) => level > currentLevel)
      .map(([roleCode]) => roleCode as Role);
  }, [role]);

  // 角色切换（仅限降级）
  const switchRole = useCallback(async (newRole: Role): Promise<boolean> => {
    if (!user) {
      throw createRoleError('User not authenticated', role);
    }

    const currentLevel = ROLE_HIERARCHY[role] || 0;
    const targetLevel = ROLE_HIERARCHY[newRole] || 0;

    // 检查是否允许切换到目标角色
    if (targetLevel > currentLevel) {
      throw createRoleEscalationError(
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
        throw createRoleError(`Failed to switch role: ${updateError.message}`, role, newRole);
      }

      // 清理权限缓存
      unifiedPermissionManager.clearCache(user.id);

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

      unifiedPermissionManager.broadcastPermissionChange(changeEvent);

      console.log(`[useRole] Role switched from ${role} to ${newRole} for user ${user.id}`);
      return true;

    } catch (err) {
      const error = err instanceof Error ? err : createRoleError('Role switch failed', role, newRole);
      setError(error);
      console.error('[useRole] Role switch error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  // 申请角色升级
  const requestRole = useCallback(async (targetRole: Role, reason: string): Promise<string> => {
    if (!user) {
      throw createRoleError('User not authenticated', role);
    }

    const currentLevel = ROLE_HIERARCHY[role] || 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0;

    if (targetLevel <= currentLevel) {
      throw createRoleError(`Cannot request lower or equal role level: ${targetRole}`, role, targetRole);
    }

    setLoading(true);
    setError(null);

    try {
      // 在新系统中，角色申请通过unified_permission_config表实现
      const permissionRule = {
        [`role.${targetRole}`]: {
          data_scope: 'self',
          conditions: {},
          granted_by: 'system',
          reason: `Role upgrade request: ${role} -> ${targetRole}. Reason: ${reason}`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          requested: true,
          role_request: {
            current_role: role,
            target_role: targetRole,
            request_type: 'upgrade'
          }
        }
      };

      const { data, error: insertError } = await supabase
        .from('unified_permission_config')
        .insert({
          user_id: user.id,
          permission_rules: permissionRule,
          effective_from: new Date().toISOString(),
          effective_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: false, // 等待批准
          request_type: 'role_upgrade'
        })
        .select('id')
        .single();

      if (insertError) {
        throw createRoleError(`Failed to create role request: ${insertError.message}`, role, targetRole);
      }

      console.log(`[useRole] Role request created: ${data.id} for ${user.email} (${role} -> ${targetRole})`);
      return data.id;

    } catch (err) {
      const error = err instanceof Error ? err : createRoleError('Role request failed', role, targetRole);
      setError(error);
      console.error('[useRole] Role request error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  // 获取用户的角色申请历史
  const getMyRoleRequests = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('unified_permission_config')
        .select('*')
        .eq('user_id', user.id)
        .eq('request_type', 'role_upgrade')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(item => {
        // 安全地解析权限规则
        const rules = item.permission_rules as any || {};
        const firstRuleKey = Object.keys(rules)[0];
        const firstRule = firstRuleKey ? rules[firstRuleKey] : {};
        const roleRequest = firstRule?.role_request || {};
        
        return {
          id: item.id,
          currentRole: roleRequest.current_role || role,
          targetRole: roleRequest.target_role || 'employee',
          reason: firstRule.reason || 'No reason provided',
          status: item.is_active ? 'approved' : 'pending',
          requestedAt: new Date(item.created_at || Date.now()),
          expiresAt: item.effective_until ? new Date(item.effective_until) : undefined
        };
      });
    } catch (err) {
      console.error('[useRole] Error fetching role requests:', err);
      return [];
    }
  }, [user]);

  // 初始化角色权限
  useEffect(() => {
    if (user && role) {
      fetchRolePermissions();
    }
  }, [user, role, fetchRolePermissions]);

  // 监听角色变更
  useEffect(() => {
    if (!user) return;

    const unsubscribe = unifiedPermissionManager.subscribe({
      userId: user.id,
      permissions: rolePermissions,
      onPermissionChange: (event) => {
        if (event.type === 'role_changed' && event.userId === user.id) {
          console.log(`[useRole] User role changed to: ${event.role}`);
          
          // 重新加载角色权限
          if (event.role) {
            fetchRolePermissions(event.role as Role);
          }
        }
      },
      onError: (error) => {
        console.error('[useRole] Subscription error:', error);
        setError(error);
      }
    });

    return unsubscribe;
  }, [user, rolePermissions, fetchRolePermissions]);

  return {
    // 角色信息
    role,
    rolePermissions,
    
    // 角色验证
    isRole,
    hasRoleLevel,
    canEscalate,
    
    // 角色管理
    switchRole,
    requestRole,
    getMyRoleRequests,
    
    // 工具方法
    fetchRolePermissions,
    
    // 状态
    loading,
    error,
  };
}

// 角色工具函数
export const roleUtils = {
  /**
   * 获取角色显示名称
   */
  getRoleDisplayName(role: Role): string {
    return ROLE_INFO[role]?.name || role;
  },

  /**
   * 获取角色描述
   */
  getRoleDescription(role: Role): string {
    return ROLE_INFO[role]?.description || '未知角色';
  },

  /**
   * 获取角色颜色
   */
  getRoleColor(role: Role): string {
    return ROLE_INFO[role]?.color || 'neutral';
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
   * 获取所有角色列表
   */
  getAllRoles(): Role[] {
    return Object.keys(ROLE_HIERARCHY) as Role[];
  },

  /**
   * 比较两个角色的权限级别
   */
  compareRoles(roleA: Role, roleB: Role): number {
    const levelA = ROLE_HIERARCHY[roleA] || 0;
    const levelB = ROLE_HIERARCHY[roleB] || 0;
    return levelA - levelB;
  },

  /**
   * 获取角色的完整信息
   */
  getRoleFullInfo(role: Role) {
    return {
      code: role,
      level: ROLE_HIERARCHY[role] || 0,
      ...ROLE_INFO[role]
    };
  }
};

// 导出角色常量和错误类
export { ROLE_HIERARCHY, ROLE_INFO };
export type { RoleError, RoleEscalationError };
export { createRoleError, createRoleEscalationError };