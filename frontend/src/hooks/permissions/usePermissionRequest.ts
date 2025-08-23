/**
 * 权限申请管理 Hook
 * 
 * 功能特性：
 * - 权限申请提交和跟踪
 * - 临时权限申请
 * - 申请审批管理
 * - 权限申请历史
 * - 实时状态更新
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/lib/supabase';
import { permissionManager } from '@/lib/permissionManager';
import type {
  Permission,
  PermissionRequest,
  PermissionRequestStatus,
  UsePermissionRequestReturn,
  PermissionChangeEvent
} from '@/types/permission';

/**
 * 权限申请管理 Hook
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

  // 提交权限申请
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
      const requestData = {
        user_id: user.id,
        permission,
        resource_id: resourceId,
        reason: reason || `Request for ${permission} permission`,
        status: 'pending' as PermissionRequestStatus,
        requested_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天过期
        metadata: {
          user_email: user.email,
          user_role: user.role,
          request_type: 'manual'
        }
      };

      const { data, error: insertError } = await supabase
        .from('permission_requests')
        .insert(requestData)
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to create permission request: ${insertError.message}`);
      }

      // 刷新我的申请列表
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

    setLoading(true);
    setError(null);

    try {
      const expiresAt = new Date(Date.now() + duration);
      
      const requestData = {
        user_id: user.id,
        permission,
        reason,
        status: 'pending' as PermissionRequestStatus,
        requested_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        metadata: {
          user_email: user.email,
          user_role: user.role,
          request_type: 'temporary',
          duration_ms: duration,
          temp_expires_at: expiresAt.toISOString()
        }
      };

      const { data, error: insertError } = await supabase
        .from('permission_requests')
        .insert(requestData)
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to create temporary permission request: ${insertError.message}`);
      }

      // 刷新我的申请列表
      await fetchMyRequests();

      console.log(`[usePermissionRequest] Temporary permission request created: ${data.id} for ${permission} (${duration}ms)`);
      return data.id;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Temporary permission request failed');
      setError(error);
      console.error('[usePermissionRequest] Temporary request error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 获取我的权限申请
  const fetchMyRequests = useCallback(async (): Promise<PermissionRequest[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('permission_requests')
        .select(`
          id,
          permission,
          resource_id,
          reason,
          status,
          requested_at,
          processed_at,
          processed_by,
          expires_at,
          metadata
        `)
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch requests: ${error.message}`);
      }

      const requests: PermissionRequest[] = data.map(item => ({
        id: item.id,
        userId: user.id,
        permission: item.permission,
        resourceId: item.resource_id,
        reason: item.reason,
        status: item.status,
        requestedAt: new Date(item.requested_at),
        processedAt: item.processed_at ? new Date(item.processed_at) : undefined,
        processedBy: item.processed_by,
        expiresAt: item.expires_at ? new Date(item.expires_at) : undefined,
        metadata: item.metadata || {}
      }));

      setMyRequests(requests);
      return requests;

    } catch (err) {
      console.error('[usePermissionRequest] Error fetching my requests:', err);
      return [];
    }
  }, [user]);

  // 获取我的权限申请（同步版本）
  const getMyRequests = useCallback(async (): Promise<PermissionRequest[]> => {
    setLoading(true);
    setError(null);

    try {
      return await fetchMyRequests();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get requests');
      setError(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchMyRequests]);

  // 获取待处理的权限申请（管理员）
  const fetchPendingRequests = useCallback(async (): Promise<PermissionRequest[]> => {
    if (!user || !canApproveRequests) return [];

    try {
      const { data, error } = await supabase
        .from('permission_requests')
        .select(`
          id,
          user_id,
          permission,
          resource_id,
          reason,
          status,
          requested_at,
          processed_at,
          processed_by,
          expires_at,
          metadata,
          user_profiles!inner(email)
        `)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('requested_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch pending requests: ${error.message}`);
      }

      const requests: PermissionRequest[] = data.map(item => ({
        id: item.id,
        userId: item.user_id,
        permission: item.permission,
        resourceId: item.resource_id,
        reason: item.reason,
        status: item.status,
        requestedAt: new Date(item.requested_at),
        processedAt: item.processed_at ? new Date(item.processed_at) : undefined,
        processedBy: item.processed_by,
        expiresAt: item.expires_at ? new Date(item.expires_at) : undefined,
        metadata: {
          ...item.metadata,
          user_email: item.user_profiles?.email
        }
      }));

      setPendingRequests(requests);
      return requests;

    } catch (err) {
      console.error('[usePermissionRequest] Error fetching pending requests:', err);
      return [];
    }
  }, [user, canApproveRequests]);

  // 获取待处理的权限申请（同步版本）
  const getPendingRequests = useCallback(async (): Promise<PermissionRequest[]> => {
    if (!canApproveRequests) {
      throw new Error('Insufficient permissions to view pending requests');
    }

    setLoading(true);
    setError(null);

    try {
      return await fetchPendingRequests();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get pending requests');
      setError(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [canApproveRequests, fetchPendingRequests]);

  // 审批权限申请
  const approveRequest = useCallback(async (
    requestId: string,
    approvalReason?: string
  ): Promise<boolean> => {
    if (!user || !canApproveRequests) {
      throw new Error('Insufficient permissions to approve requests');
    }

    setLoading(true);
    setError(null);

    try {
      // 更新申请状态
      const { error: updateError } = await supabase
        .from('permission_requests')
        .update({
          status: 'approved' as PermissionRequestStatus,
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          metadata: supabase.raw(`
            COALESCE(metadata, '{}'::jsonb) || 
            '{"approval_reason": "${approvalReason || 'Approved'}", "approved_by_email": "${user.email}"}'::jsonb
          `)
        })
        .eq('id', requestId);

      if (updateError) {
        throw new Error(`Failed to approve request: ${updateError.message}`);
      }

      // 获取申请详情以广播权限变更
      const { data: requestData, error: fetchError } = await supabase
        .from('permission_requests')
        .select('user_id, permission, resource_id')
        .eq('id', requestId)
        .single();

      if (!fetchError && requestData) {
        // 广播权限授予事件
        const changeEvent: PermissionChangeEvent = {
          type: 'permission_granted',
          userId: requestData.user_id,
          permission: requestData.permission,
          timestamp: new Date(),
          metadata: {
            requestId,
            approvedBy: user.id,
            approvedByEmail: user.email,
            resourceId: requestData.resource_id,
            reason: approvalReason
          }
        };

        permissionManager.broadcastPermissionChange(changeEvent);
      }

      // 刷新申请列表
      await Promise.all([
        fetchMyRequests(),
        fetchPendingRequests()
      ]);

      console.log(`[usePermissionRequest] Request approved: ${requestId} by ${user.email}`);
      return true;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Request approval failed');
      setError(error);
      console.error('[usePermissionRequest] Approval error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, canApproveRequests, fetchMyRequests, fetchPendingRequests]);

  // 拒绝权限申请
  const rejectRequest = useCallback(async (
    requestId: string,
    rejectionReason?: string
  ): Promise<boolean> => {
    if (!user || !canApproveRequests) {
      throw new Error('Insufficient permissions to reject requests');
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('permission_requests')
        .update({
          status: 'rejected' as PermissionRequestStatus,
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          metadata: supabase.raw(`
            COALESCE(metadata, '{}'::jsonb) || 
            '{"rejection_reason": "${rejectionReason || 'Rejected'}", "rejected_by_email": "${user.email}"}'::jsonb
          `)
        })
        .eq('id', requestId);

      if (updateError) {
        throw new Error(`Failed to reject request: ${updateError.message}`);
      }

      // 刷新申请列表
      await Promise.all([
        fetchMyRequests(),
        fetchPendingRequests()
      ]);

      console.log(`[usePermissionRequest] Request rejected: ${requestId} by ${user.email}`);
      return true;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Request rejection failed');
      setError(error);
      console.error('[usePermissionRequest] Rejection error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, canApproveRequests, fetchMyRequests, fetchPendingRequests]);

  // 初始化数据加载
  useEffect(() => {
    if (user) {
      fetchMyRequests();
      
      if (canApproveRequests) {
        fetchPendingRequests();
      }
    }
  }, [user, canApproveRequests, fetchMyRequests, fetchPendingRequests]);

  // 实时更新监听
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('permission_requests_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'permission_requests'
      }, (payload) => {
        console.log('[usePermissionRequest] Real-time update:', payload);
        
        // 刷新相关数据
        if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
          fetchMyRequests();
        }
        
        if (canApproveRequests) {
          fetchPendingRequests();
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, canApproveRequests, fetchMyRequests, fetchPendingRequests]);

  return {
    // 权限申请
    requestPermission,
    requestTemporaryPermission,
    
    // 申请管理
    getMyRequests,
    getPendingRequests,
    
    // 申请处理
    approveRequest,
    rejectRequest,
    
    // 状态跟踪
    myRequests,
    pendingRequests,
    loading,
    error,
  };
}

// 权限申请工具函数
export const permissionRequestUtils = {
  /**
   * 获取申请状态显示名称
   */
  getStatusDisplayName(status: PermissionRequestStatus): string {
    const statusNames: Record<PermissionRequestStatus, string> = {
      'pending': '待审批',
      'approved': '已批准',
      'rejected': '已拒绝',
      'expired': '已过期'
    };
    return statusNames[status] || status;
  },

  /**
   * 获取申请状态颜色
   */
  getStatusColor(status: PermissionRequestStatus): string {
    const statusColors: Record<PermissionRequestStatus, string> = {
      'pending': 'warning',
      'approved': 'success',
      'rejected': 'error',
      'expired': 'neutral'
    };
    return statusColors[status] || 'neutral';
  },

  /**
   * 检查申请是否已过期
   */
  isExpired(request: PermissionRequest): boolean {
    if (!request.expiresAt) return false;
    return request.expiresAt < new Date();
  },

  /**
   * 获取申请剩余时间（毫秒）
   */
  getRemainingTime(request: PermissionRequest): number {
    if (!request.expiresAt) return 0;
    return Math.max(0, request.expiresAt.getTime() - Date.now());
  },

  /**
   * 格式化申请剩余时间
   */
  formatRemainingTime(request: PermissionRequest): string {
    const remaining = this.getRemainingTime(request);
    
    if (remaining === 0) return '已过期';
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) return `${days}天${hours}小时`;
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  },

  /**
   * 检查申请是否为临时权限申请
   */
  isTemporaryRequest(request: PermissionRequest): boolean {
    return request.metadata?.request_type === 'temporary';
  },

  /**
   * 获取申请紧急程度
   */
  getUrgency(request: PermissionRequest): 'low' | 'medium' | 'high' | 'critical' {
    const remaining = this.getRemainingTime(request);
    const total = request.expiresAt ? 
      request.expiresAt.getTime() - request.requestedAt.getTime() : 
      7 * 24 * 60 * 60 * 1000; // 默认7天
    
    const ratio = remaining / total;
    
    if (ratio < 0.1) return 'critical';
    if (ratio < 0.25) return 'high';
    if (ratio < 0.5) return 'medium';
    return 'low';
  }
};