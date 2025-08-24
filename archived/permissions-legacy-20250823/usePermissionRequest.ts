/**
 * 权限申请管理 Hook (适配新权限系统)
 * 
 * 功能特性：
 * - 基于unified_permission_config的权限申请
 * - 临时权限规则管理
 * - 权限变更历史追踪
 * - 实时权限状态同步
 * 
 * 注意：新系统中权限申请通过直接更新unified_permission_config表实现
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/lib/supabase';
import { unifiedPermissionManager } from '@/lib/unifiedPermissionManager';
import type {
  Permission,
  PermissionRequest,
  PermissionRequestStatus,
  UsePermissionRequestReturn,
  PermissionChangeEvent
} from '@/types/permission';

/**
 * 权限申请管理 Hook (新系统适配)
 */
export function usePermissionRequest(): UsePermissionRequestReturn {
  const { user } = useUnifiedAuth();
  const [myRequests, setMyRequests] = useState<PermissionRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 检查是否有审批权限
  const canApproveRequests = useMemo(() => {
    if (!user) return false;
    const role = user.role;
    return role === 'admin' || role === 'super_admin' || role === 'hr_manager';
  }, [user]);

  // 提交权限申请（新系统：直接创建临时权限规则）
  const requestPermission = useCallback(async (
    permission: Permission,
    resourceId?: string,
    reason?: string
  ): Promise<string> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      // 在新系统中，权限申请通过创建临时权限配置实现
      const permissionRule = {
        [permission]: {
          data_scope: resourceId ? 'self' : 'department',
          conditions: resourceId ? { resource_id: resourceId } : {},
          granted_by: 'system',
          reason: reason || `Requested ${permission} permission`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          requested: true // 标记为申请状态
        }
      };

      const { data, error: insertError } = await supabase
        .from('unified_permission_config')
        .insert({
          user_id: user.id,
          permission_rules: permissionRule,
          effective_from: new Date().toISOString(),
          effective_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: false // 等待批准
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to create permission request: ${insertError.message}`);
      }

      // 刷新权限缓存和请求列表
      unifiedPermissionManager.clearCache(user.id);
      await fetchMyRequests();

      console.log(`[usePermissionRequest] Permission request created: ${data.id} for ${permission}`);
      return data.id;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Permission request failed');
      setError(error);
      console.error('[usePermissionRequest] Request error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 提交临时权限申请
  const requestTemporaryPermission = useCallback(async (
    permission: Permission,
    duration: number, // 持续时间（毫秒）
    reason: string
  ): Promise<string> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const expiresAt = new Date(Date.now() + duration);
    return requestPermission(permission, undefined, `${reason} (临时权限，${Math.round(duration / (60 * 60 * 1000))}小时)`);
  }, [user, requestPermission]);

  // 获取我的权限申请（新系统：查询非活跃的权限配置）
  const fetchMyRequests = useCallback(async (): Promise<PermissionRequest[]> => {
    if (!user) return [];

    try {
      // 查询用户的权限申请（非活跃状态的配置）
      const { data, error } = await supabase
        .from('unified_permission_config')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', false) // 等待批准的申请
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch requests: ${error.message}`);
      }

      const requests: PermissionRequest[] = (data || []).map(item => {
        const permissions = Object.keys(item.permission_rules || {});
        const firstPermission = permissions[0];
        const rule = item.permission_rules?.[firstPermission];
        
        return {
          id: item.id,
          userId: user.id,
          permission: firstPermission as Permission,
          requestType: 'manual',
          reason: rule?.reason || '权限申请',
          status: 'pending' as PermissionRequestStatus,
          requestedAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at || item.created_at),
          expiresAt: item.effective_until ? new Date(item.effective_until) : undefined,
          metadata: { rule: rule }
        };
      });

      setMyRequests(requests);
      return requests;
    } catch (err) {
      console.error('Error fetching my requests:', err);
      setError(err as Error);
      return [];
    }
  }, [user]);

  // 获取待审批的权限申请（新系统）
  const fetchPendingRequests = useCallback(async (): Promise<PermissionRequest[]> => {
    if (!user || !canApproveRequests) return [];

    try {
      const { data, error } = await supabase
        .from('unified_permission_config')
        .select(`
          *,
          user_profiles!inner(email, employee_id),
          employees!inner(employee_name)
        `)
        .eq('is_active', false) // 待审批状态
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch pending requests: ${error.message}`);
      }

      const requests: PermissionRequest[] = (data || []).map(item => {
        const permissions = Object.keys(item.permission_rules || {});
        const firstPermission = permissions[0];
        const rule = item.permission_rules?.[firstPermission];
        
        return {
          id: item.id,
          userId: item.user_id,
          permission: firstPermission as Permission,
          requestType: 'manual',
          reason: rule?.reason || '权限申请',
          status: 'pending' as PermissionRequestStatus,
          requestedAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at || item.created_at),
          expiresAt: item.effective_until ? new Date(item.effective_until) : undefined,
          metadata: { 
            rule: rule,
            user_email: item.user_profiles?.email,
            user_name: item.employees?.employee_name
          }
        };
      });

      setPendingRequests(requests);
      return requests;
    } catch (err) {
      console.error('Error fetching pending requests:', err);
      setError(err as Error);
      return [];
    }
  }, [user, canApproveRequests]);

  // 获取我的申请列表（兼容接口）
  const getMyRequests = useCallback(async (): Promise<PermissionRequest[]> => {
    return await fetchMyRequests();
  }, [fetchMyRequests]);

  // 获取待处理申请列表（兼容接口）
  const getPendingRequests = useCallback(async (): Promise<PermissionRequest[]> => {
    return await fetchPendingRequests();
  }, [fetchPendingRequests]);

  // 批准权限申请
  const approveRequest = useCallback(async (
    requestId: string,
    approverComments?: string
  ): Promise<void> => {
    if (!user || !canApproveRequests) {
      throw new Error('Insufficient permissions to approve requests');
    }

    setLoading(true);
    try {
      // 激活权限配置
      const { error: updateError } = await supabase
        .from('unified_permission_config')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        throw new Error(`Failed to approve request: ${updateError.message}`);
      }

      // 刷新权限矩阵
      await supabase.rpc('refresh_permission_matrix');
      
      // 刷新申请列表
      await fetchPendingRequests();
      
      console.log(`[usePermissionRequest] Request approved: ${requestId} by ${user.id}`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Approval failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, canApproveRequests, fetchPendingRequests]);

  // 拒绝权限申请
  const rejectRequest = useCallback(async (
    requestId: string,
    reason?: string
  ): Promise<void> => {
    if (!user || !canApproveRequests) {
      throw new Error('Insufficient permissions to reject requests');
    }

    setLoading(true);
    try {
      // 删除权限配置申请
      const { error: deleteError } = await supabase
        .from('unified_permission_config')
        .delete()
        .eq('id', requestId);

      if (deleteError) {
        throw new Error(`Failed to reject request: ${deleteError.message}`);
      }

      // 刷新申请列表
      await fetchPendingRequests();
      
      console.log(`[usePermissionRequest] Request rejected: ${requestId} by ${user.id}`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Rejection failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, canApproveRequests, fetchPendingRequests]);

  // 初始化数据加载
  useEffect(() => {
    if (user) {
      fetchMyRequests();
      if (canApproveRequests) {
        fetchPendingRequests();
      }
    }
  }, [user, canApproveRequests, fetchMyRequests, fetchPendingRequests]);

  return {
    // 申请管理
    requestPermission,
    requestTemporaryPermission,
    
    // 数据获取
    getMyRequests,
    getPendingRequests,
    
    // 审批管理
    approveRequest,
    rejectRequest,
    
    // 状态数据
    myRequests,
    pendingRequests,
    loading,
    error,
    
    // 权限检查
    canApproveRequests
  };
}

// 导出权限申请工具函数
export const permissionRequestUtils = {
  /**
   * 格式化权限申请状态显示文本
   */
  getStatusText: (status: PermissionRequestStatus): string => {
    const statusMap: Record<PermissionRequestStatus, string> = {
      'pending': '待审批',
      'approved': '已批准',
      'rejected': '已拒绝',
      'expired': '已过期'
    };
    return statusMap[status] || status;
  },

  /**
   * 获取权限申请状态颜色
   */
  getStatusColor: (status: PermissionRequestStatus): string => {
    const colorMap: Record<PermissionRequestStatus, string> = {
      'pending': 'warning',
      'approved': 'success', 
      'rejected': 'error',
      'expired': 'neutral'
    };
    return colorMap[status] || 'neutral';
  },

  /**
   * 检查权限申请是否过期
   */
  isExpired: (request: PermissionRequest): boolean => {
    return request.expiresAt ? request.expiresAt < new Date() : false;
  },

  /**
   * 获取权限申请剩余时间描述
   */
  getTimeRemaining: (request: PermissionRequest): string => {
    if (!request.expiresAt) return '永久有效';
    
    const now = new Date();
    const remaining = request.expiresAt.getTime() - now.getTime();
    
    if (remaining <= 0) return '已过期';
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) return `${days}天后过期`;
    if (hours > 0) return `${hours}小时后过期`;
    
    return '即将过期';
  }
};