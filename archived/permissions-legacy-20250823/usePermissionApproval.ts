/**
 * 权限申请审批管理 Hook (适配新权限系统)
 * 
 * 功能特性：
 * - 权限申请审批管理
 * - 批量审批操作
 * - 审批历史查询
 * - 实时审批状态同步
 * 
 * 注意：适配unified_permission_config表的新权限系统
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/lib/supabase';
import { unifiedPermissionManager } from '@/lib/unifiedPermissionManager';
import type {
  UsePermissionApprovalReturn,
  PermissionRequestFilter,
  ApprovalFormData,
  BatchApprovalFormData,
  PermissionRequestStats,
  RequestTimelineEntry,
  PermissionRequest,
  PermissionRequestStatus,
  Permission
} from '@/types/permission-request';

/**
 * 权限审批管理 Hook (新系统适配)
 */
export function usePermissionApproval(): UsePermissionApprovalReturn {
  const { user } = useUnifiedAuth();
  const [pendingRequests, setPendingRequests] = useState<PermissionRequest[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<PermissionRequestFilter>({
    status: 'pending',
    requestType: 'all',
    dateRange: 'week',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 检查是否有审批权限
  const canApprove = useMemo(() => {
    if (!user) return false;
    const role = user.role;
    return role === 'admin' || role === 'super_admin' || role === 'hr_manager';
  }, [user]);

  // 获取待审批的权限申请（适配新系统）
  const fetchPendingRequests = useCallback(async (): Promise<PermissionRequest[]> => {
    if (!user || !canApprove) return [];

    setLoading(true);
    try {
      let query = supabase
        .from('unified_permission_config')
        .select(`
          *,
          user_profiles!inner(email, employee_id),
          employees!inner(employee_name)
        `)
        .eq('is_active', false) // 待审批状态
        .order('created_at', { ascending: false });

      // 应用过滤条件
      if (approvalFilter.dateRange === 'day') {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        query = query.gte('created_at', oneDayAgo.toISOString());
      } else if (approvalFilter.dateRange === 'week') {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', oneWeekAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch approval requests: ${error.message}`);
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
      console.error('Error fetching approval requests:', err);
      setError(err as Error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, canApprove, approvalFilter]);

  // 批准单个权限申请
  const approveRequest = useCallback(async (formData: ApprovalFormData): Promise<void> => {
    if (!user || !canApprove) {
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
        .eq('id', formData.requestId);

      if (updateError) {
        throw new Error(`Failed to approve request: ${updateError.message}`);
      }

      // 刷新权限矩阵
      await supabase.rpc('refresh_permission_matrix');
      
      // 刷新申请列表
      await fetchPendingRequests();
      
      console.log(`[usePermissionApproval] Request approved: ${formData.requestId}`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Approval failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, canApprove, fetchPendingRequests]);

  // 拒绝单个权限申请
  const rejectRequest = useCallback(async (requestId: string, reason?: string): Promise<void> => {
    if (!user || !canApprove) {
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
      
      console.log(`[usePermissionApproval] Request rejected: ${requestId}`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Rejection failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, canApprove, fetchPendingRequests]);

  // 批量审批
  const batchApprove = useCallback(async (formData: BatchApprovalFormData): Promise<void> => {
    if (!user || !canApprove) {
      throw new Error('Insufficient permissions for batch approval');
    }

    setLoading(true);
    try {
      const requests = formData.requests.filter(req => req.action === 'approve');
      const rejections = formData.requests.filter(req => req.action === 'reject');

      // 批量批准
      if (requests.length > 0) {
        const { error: approveError } = await supabase
          .from('unified_permission_config')
          .update({
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .in('id', requests.map(r => r.requestId));

        if (approveError) {
          throw new Error(`Batch approval failed: ${approveError.message}`);
        }
      }

      // 批量拒绝
      if (rejections.length > 0) {
        const { error: rejectError } = await supabase
          .from('unified_permission_config')
          .delete()
          .in('id', rejections.map(r => r.requestId));

        if (rejectError) {
          throw new Error(`Batch rejection failed: ${rejectError.message}`);
        }
      }

      // 刷新权限矩阵和申请列表
      if (requests.length > 0) {
        await supabase.rpc('refresh_permission_matrix');
      }
      await fetchPendingRequests();
      
      console.log(`[usePermissionApproval] Batch operation completed: ${requests.length} approved, ${rejections.length} rejected`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Batch approval failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, canApprove, fetchPendingRequests]);

  // 获取审批统计信息
  const getApprovalStats = useCallback(async (): Promise<PermissionRequestStats> => {
    if (!user || !canApprove) {
      return { total: 0, pending: 0, approved: 0, rejected: 0, expired: 0 };
    }

    try {
      // 获取所有权限配置记录的统计
      const { data: allRequests, error } = await supabase
        .from('unified_permission_config')
        .select('is_active, effective_until')
        .not('permission_rules', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch approval stats: ${error.message}`);
      }

      const now = new Date();
      const stats = {
        total: allRequests.length,
        pending: allRequests.filter(r => !r.is_active).length,
        approved: allRequests.filter(r => r.is_active && (!r.effective_until || new Date(r.effective_until) > now)).length,
        rejected: 0, // 拒绝的申请被删除，无法统计
        expired: allRequests.filter(r => r.is_active && r.effective_until && new Date(r.effective_until) <= now).length
      };

      return stats;
    } catch (err) {
      console.error('Error fetching approval stats:', err);
      return { total: 0, pending: 0, approved: 0, rejected: 0, expired: 0 };
    }
  }, [user, canApprove]);

  // 获取审批历史时间线
  const getApprovalTimeline = useCallback(async (requestId: string): Promise<RequestTimelineEntry[]> => {
    try {
      // 在新系统中，时间线信息相对简化
      const { data, error } = await supabase
        .from('unified_permission_config')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error || !data) {
        return [];
      }

      const timeline: RequestTimelineEntry[] = [
        {
          id: `${requestId}-created`,
          timestamp: new Date(data.created_at),
          event: 'request_created',
          description: '权限申请已提交',
          userId: data.user_id,
          metadata: {}
        }
      ];

      if (data.is_active) {
        timeline.push({
          id: `${requestId}-approved`,
          timestamp: new Date(data.updated_at || data.created_at),
          event: 'request_approved',
          description: '权限申请已批准',
          userId: 'system',
          metadata: {}
        });
      }

      return timeline;
    } catch (err) {
      console.error('Error fetching approval timeline:', err);
      return [];
    }
  }, []);

  // 初始化数据加载
  useEffect(() => {
    if (user && canApprove) {
      fetchPendingRequests();
    }
  }, [user, canApprove, fetchPendingRequests]);

  return {
    // 审批数据
    pendingRequests,
    selectedRequests,
    approvalFilter,
    
    // 审批操作
    approveRequest,
    rejectRequest,
    batchApprove,
    
    // 数据查询
    getApprovalStats,
    getApprovalTimeline,
    
    // 状态管理
    setSelectedRequests,
    setApprovalFilter,
    
    // 状态
    loading,
    error,
    canApprove
  };
}