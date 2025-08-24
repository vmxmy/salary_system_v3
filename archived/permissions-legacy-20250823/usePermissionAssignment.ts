/**
 * 权限分配管理 Hook
 * 
 * 提供权限分配、权限矩阵管理和权限计算功能
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { 
  PermissionAssignment,
  PermissionMatrix,
  UserPermissionSummary,
  PermissionConflict,
  AssignmentOperation
} from '@/types/permission-assignment';
import { useErrorHandlerWithToast } from '@/hooks/core/useErrorHandlerWithToast';

export interface UsePermissionAssignmentReturn {
  // 权限分配状态
  assignments: PermissionAssignment[];
  userSummaries: UserPermissionSummary[];
  conflicts: PermissionConflict[];
  loading: boolean;
  error: Error | null;
  
  // 权限分配操作
  assignPermission: (userId: string, permissionId: string, options?: AssignmentOptions) => Promise<boolean>;
  revokePermission: (userId: string, permissionId: string, reason?: string) => Promise<boolean>;
  assignRolePermissions: (userId: string, roleId: string) => Promise<boolean>;
  
  // 权限覆盖操作
  createOverride: (userId: string, permissionId: string, type: 'grant' | 'deny', options?: OverrideOptions) => Promise<boolean>;
  removeOverride: (overrideId: string, reason?: string) => Promise<boolean>;
  
  // 权限计算和查询
  calculateUserPermissions: (userId: string) => Promise<UserPermissionSummary>;
  getUserPermissionMatrix: (userId: string) => Promise<PermissionMatrix>;
  checkPermissionConflicts: (userId: string) => Promise<PermissionConflict[]>;
  
  // 权限继承分析
  analyzePermissionInheritance: (userId: string, permissionId: string) => Promise<PermissionInheritance>;
  getEffectivePermissions: (userId: string) => Promise<EffectivePermission[]>;
  
  // 批量预览
  previewBatchAssignment: (operations: AssignmentOperation[]) => Promise<BatchPreview>;
  
  // 数据刷新
  refreshData: () => Promise<void>;
  invalidateUser: (userId: string) => void;
}

interface AssignmentOptions {
  reason?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

interface OverrideOptions extends AssignmentOptions {
  priority?: number;
  scope?: 'global' | 'resource';
  resourceId?: string;
}

interface PermissionInheritance {
  permissionId: string;
  permissionName: string;
  sources: InheritanceSource[];
  conflicts: InheritanceConflict[];
  finalDecision: 'granted' | 'denied' | 'undefined';
}

interface InheritanceSource {
  type: 'role' | 'override' | 'direct';
  sourceId: string;
  sourceName: string;
  decision: 'grant' | 'deny';
  priority: number;
  expiresAt?: Date;
}

interface InheritanceConflict {
  conflictType: 'role_override' | 'multiple_overrides' | 'expired_grant';
  description: string;
  sources: InheritanceSource[];
  resolution: string;
}

interface EffectivePermission {
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  resourceType: string;
  actionType: string;
  isGranted: boolean;
  source: InheritanceSource;
  expiresAt?: Date;
}

interface BatchPreview {
  operations: AssignmentOperation[];
  affectedUsers: string[];
  potentialConflicts: PermissionConflict[];
  estimatedChanges: {
    permissionsGranted: number;
    permissionsRevoked: number;
    overridesCreated: number;
    conflictsResolved: number;
  };
  warnings: PreviewWarning[];
}

interface PreviewWarning {
  type: 'permission_escalation' | 'mass_revocation' | 'system_role_change';
  message: string;
  affectedUsers: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function usePermissionAssignment(): UsePermissionAssignmentReturn {
  const [assignments, setAssignments] = useState<PermissionAssignment[]>([]);
  const [userSummaries, setUserSummaries] = useState<UserPermissionSummary[]>([]);
  const [conflicts, setConflicts] = useState<PermissionConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandlerWithToast();

  // 获取用户权限分配数据
  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      
      // 获取用户权限分配（角色权限 + 权限覆盖）
      const { data: assignments, error: assignmentsError } = await (supabase as any)
        .from('view_user_permission_assignments')
        .select(`
          *,
          user_profiles!inner(id, email),
          permissions!inner(id, permission_code, permission_name, resource_id, action_type),
          permission_resources!inner(id, resource_code, resource_name, resource_type)
        `);

      if (assignmentsError) throw assignmentsError;

      // 获取用户权限摘要
      const { data: summaries, error: summariesError } = await (supabase as any)
        .from('view_user_permission_summary')
        .select('*');

      if (summariesError) throw summariesError;

      // 检测权限冲突
      const { data: conflictData, error: conflictsError } = await (supabase as any)
        .rpc('detect_permission_conflicts');

      if (conflictsError) throw conflictsError;

      setAssignments(assignments || []);
      setUserSummaries(summaries || []);
      setConflicts(conflictData || []);
      
    } catch (err) {
      handleError(err, { customMessage: '获取权限分配数据失败', level: 'error' });
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // 分配权限给用户
  const assignPermission = useCallback(async (
    userId: string,
    permissionId: string,
    options: AssignmentOptions = {}
  ): Promise<boolean> => {
    try {
      const { error } = await (supabase as any).rpc('assign_user_permission', {
        p_user_id: userId,
        p_permission_id: permissionId,
        p_reason: options.reason,
        p_expires_at: options.expiresAt?.toISOString(),
        p_metadata: options.metadata
      });

      if (error) throw error;

      // 刷新数据
      await fetchAssignments();
      return true;
      
    } catch (err) {
      handleError(err, { customMessage: '分配权限失败', level: 'error' });
      return false;
    }
  }, [handleError, fetchAssignments]);

  // 撤销用户权限
  const revokePermission = useCallback(async (
    userId: string,
    permissionId: string,
    reason?: string
  ): Promise<boolean> => {
    try {
      const { error } = await (supabase as any).rpc('revoke_user_permission', {
        p_user_id: userId,
        p_permission_id: permissionId,
        p_reason: reason
      });

      if (error) throw error;

      // 刷新数据
      await fetchAssignments();
      return true;
      
    } catch (err) {
      handleError(err, { customMessage: '撤销权限失败', level: 'error' });
      return false;
    }
  }, [handleError, fetchAssignments]);

  // 分配角色权限给用户
  const assignRolePermissions = useCallback(async (
    userId: string,
    roleId: string
  ): Promise<boolean> => {
    try {
      const { error } = await (supabase as any).rpc('assign_role_to_user', {
        p_user_id: userId,
        p_role_id: roleId
      });

      if (error) throw error;

      // 刷新数据
      await fetchAssignments();
      return true;
      
    } catch (err) {
      handleError(err, { customMessage: '分配角色权限失败', level: 'error' });
      return false;
    }
  }, [handleError, fetchAssignments]);

  // 创建权限覆盖
  const createOverride = useCallback(async (
    userId: string,
    permissionId: string,
    type: 'grant' | 'deny',
    options: OverrideOptions = {}
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_permission_overrides')
        .insert({
          user_id: userId,
          permission_id: permissionId,
          override_type: type,
          reason: options.reason,
          expires_at: options.expiresAt?.toISOString(),
          granted_by: (await supabase.auth.getUser()).data.user?.id,
          granted_at: new Date().toISOString(),
          is_active: true
        });

      if (error) throw error;

      // 刷新数据
      await fetchAssignments();
      return true;
      
    } catch (err) {
      handleError(err, { customMessage: '创建权限覆盖失败', level: 'error' });
      return false;
    }
  }, [handleError, fetchAssignments]);

  // 移除权限覆盖
  const removeOverride = useCallback(async (
    overrideId: string,
    reason?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_permission_overrides')
        .update({ 
          is_active: false,
          reason: reason 
        })
        .eq('id', overrideId);

      if (error) throw error;

      // 刷新数据
      await fetchAssignments();
      return true;
      
    } catch (err) {
      handleError(err, { customMessage: '移除权限覆盖失败', level: 'error' });
      return false;
    }
  }, [handleError, fetchAssignments]);

  // 计算用户权限
  const calculateUserPermissions = useCallback(async (
    userId: string
  ): Promise<UserPermissionSummary> => {
    try {
      const { data, error } = await (supabase as any).rpc('calculate_user_permissions', {
        p_user_id: userId
      });

      if (error) throw error;
      return data as UserPermissionSummary;
      
    } catch (err) {
      handleError(err, { customMessage: '计算用户权限失败', level: 'error' });
      throw err;
    }
  }, [handleError]);

  // 获取用户权限矩阵
  const getUserPermissionMatrix = useCallback(async (
    userId: string
  ): Promise<PermissionMatrix> => {
    try {
      const { data, error } = await (supabase as any).rpc('get_user_permission_matrix', {
        p_user_id: userId
      });

      if (error) throw error;
      return data as PermissionMatrix;
      
    } catch (err) {
      handleError(err, { customMessage: '获取权限矩阵失败', level: 'error' });
      throw err;
    }
  }, [handleError]);

  // 检查权限冲突
  const checkPermissionConflicts = useCallback(async (
    userId: string
  ): Promise<PermissionConflict[]> => {
    try {
      const { data, error } = await (supabase as any).rpc('check_user_permission_conflicts', {
        p_user_id: userId
      });

      if (error) throw error;
      return data || [];
      
    } catch (err) {
      handleError(err, { customMessage: '检查权限冲突失败', level: 'error' });
      return [];
    }
  }, [handleError]);

  // 分析权限继承
  const analyzePermissionInheritance = useCallback(async (
    userId: string,
    permissionId: string
  ): Promise<PermissionInheritance> => {
    try {
      const { data, error } = await (supabase as any).rpc('analyze_permission_inheritance', {
        p_user_id: userId,
        p_permission_id: permissionId
      });

      if (error) throw error;
      return data;
      
    } catch (err) {
      handleError(err, { customMessage: '分析权限继承失败', level: 'error' });
      throw err;
    }
  }, [handleError]);

  // 获取有效权限
  const getEffectivePermissions = useCallback(async (
    userId: string
  ): Promise<EffectivePermission[]> => {
    try {
      const { data, error } = await (supabase as any).rpc('get_effective_permissions', {
        p_user_id: userId
      });

      if (error) throw error;
      return data || [];
      
    } catch (err) {
      handleError(err, { customMessage: '获取有效权限失败', level: 'error' });
      return [];
    }
  }, [handleError]);

  // 批量操作预览
  const previewBatchAssignment = useCallback(async (
    operations: AssignmentOperation[]
  ): Promise<BatchPreview> => {
    try {
      const { data, error } = await (supabase as any).rpc('preview_batch_permission_assignment', {
        p_operations: operations
      });

      if (error) throw error;
      return data;
      
    } catch (err) {
      handleError(err, { customMessage: '批量操作预览失败', level: 'error' });
      throw err;
    }
  }, [handleError]);

  // 刷新数据
  const refreshData = useCallback(async () => {
    await fetchAssignments();
  }, [fetchAssignments]);

  // 使缓存失效
  const invalidateUser = useCallback((userId: string) => {
    setUserSummaries(prev => prev.filter(s => s.userId !== userId));
    setAssignments(prev => prev.filter(a => a.userId !== userId));
  }, []);

  // 初始化加载数据
  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return {
    assignments,
    userSummaries,
    conflicts,
    loading,
    error,
    assignPermission,
    revokePermission,
    assignRolePermissions,
    createOverride,
    removeOverride,
    calculateUserPermissions,
    getUserPermissionMatrix,
    checkPermissionConflicts,
    analyzePermissionInheritance,
    getEffectivePermissions,
    previewBatchAssignment,
    refreshData,
    invalidateUser
  };
}