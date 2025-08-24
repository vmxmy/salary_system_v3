/**
 * 权限审批管理 Hook - 基于新的统一权限系统
 * 
 * 功能特性：
 * - 基于 unified_permission_config 表进行权限审批管理
 * - 审批通过激活权限配置实现（is_active=true）
 * - 支持批量审批操作
 * - 提供审批统计和历史查询
 * 
 * 设计原则：
 * - 简化流程：审批即激活权限配置
 * - 安全控制：严格的审批权限检查
 * - 审计追踪：完整的审批记录
 * - 实时同步：审批状态实时更新
 */

import { useState, useEffect, useCallback } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/lib/supabase';
import { unifiedPermissionManager } from '@/lib/unifiedPermissionManager';
import type {
  Permission,
  PermissionRequest,
  PermissionRequestFilter,
  PermissionRequestStats,
  UsePermissionApprovalReturn
} from '@/types/permission';

/**
 * 审批操作数据
 */
export interface ApprovalAction {
  requestId: string;
  action: 'approve' | 'reject';
  reason?: string;
  conditions?: Record<string, any>;
}

/**
 * 批量审批数据
 */
export interface BatchApprovalData {
  actions: ApprovalAction[];
  globalReason?: string;
}

/**
 * 审批表单数据
 */
export interface ApprovalFormData {
  requestId: string;
  approved: boolean;
  reason?: string;
  rejectionReason?: string;
  modifyExpiration?: boolean;
  effectiveFrom?: Date;
  newExpirationDate?: Date;
  modifyConditions?: boolean;
  newConditions?: Record<string, any>;
}

/**
 * 权限审批管理 Hook
 */
export function usePermissionApproval(): UsePermissionApprovalReturn {
  const { user } = useUnifiedAuth();
  const [pendingRequests, setPendingRequests] = useState<PermissionRequest[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<PermissionRequest[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 检查是否有审批权限
  const canApprove = user ? ['admin', 'super_admin', 'hr_manager'].includes(user.role) : false;

  // 转换数据库记录为前端格式
  const transformDatabaseRecord = useCallback((item: any): PermissionRequest => {
    const permissions = Object.keys(item.permission_rules || {});
    const firstPermission = permissions[0];
    const rule = item.permission_rules?.[firstPermission];
    
    return {
      id: item.id || '',
      userId: item.user_id || '',
      userEmail: item.user_profiles?.email || '',
      permission: firstPermission as Permission,
      requestType: 'permission' as const,
      reason: rule?.reason || '权限申请',
      status: item.is_active ? 'approved' : 'pending',
      statusDisplay: item.is_active ? '已批准' : '待审批',
      requestedAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at || item.created_at),
      expiresAt: item.effective_until ? new Date(item.effective_until) : undefined,
      resourceId: rule?.conditions?.resource_id,
      dataScope: rule?.data_scope || 'self',
      durationDays: 7,
      urgencyLevel: 'normal' as const,
      remainingHours: 0,
      metadata: { 
        rule: rule,
        user_email: item.user_profiles?.email,
        user_name: item.employees?.employee_name,
        database_record: item
      }
    };
  }, []);

  // 获取待审批的权限申请
  const fetchPendingRequests = useCallback(async (): Promise<PermissionRequest[]> => {
    if (!user || !canApprove) return [];

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('view_user_permission_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch pending requests: ${error.message}`);
      }

      const requests = (data || [])
        .filter(record => record.id) // Filter out null IDs
        .map(record => ({
          id: record.id!,
        userId: record.requester_id!,
        userEmail: record.requester_email!,
        permission: record.requested_permission as Permission,
        resourceType: record.resource_type || undefined,
        resourceId: record.resource_id || undefined,
        reason: record.reason!,
        requestType: 'permission' as const,
        status: record.status as 'pending' | 'approved' | 'rejected' | 'expired' | 'revoked',
        statusDisplay: record.status_display!,
        requestedAt: new Date(record.created_at!),
        updatedAt: new Date(record.updated_at || record.created_at!),
        reviewedAt: record.approved_at ? new Date(record.approved_at) : undefined,
        reviewedBy: record.approved_by || undefined,
        reviewerEmail: record.approver_email || undefined,
        rejectionReason: record.rejection_reason || undefined,
        effectiveFrom: record.effective_from ? new Date(record.effective_from) : undefined,
        expiresAt: record.expires_at ? new Date(record.expires_at) : undefined,
        durationDays: record.duration_days || 7,
        urgencyLevel: record.urgency_level as 'low' | 'normal' | 'high' | 'urgent',
        dataScope: record.data_scope as 'self' | 'department' | 'all',
        remainingHours: record.remaining_hours || 0
      }));

      setPendingRequests(requests);
      return requests;
    } catch (err) {
      console.error('Error fetching pending requests:', err);
      setError(err as Error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, canApprove, transformDatabaseRecord]);

  // 获取审批历史
  const fetchApprovalHistory = useCallback(async (limit = 50): Promise<PermissionRequest[]> => {
    if (!user || !canApprove) return [];

    try {
      const { data, error } = await supabase
        .from('view_user_permission_requests')
        .select('*')
        .in('status', ['approved', 'rejected', 'expired', 'revoked'])
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch approval history: ${error.message}`);
      }

      const requests = (data || [])
        .filter(record => record.id) // Filter out null IDs
        .map(record => ({
          id: record.id!,
        userId: record.requester_id!,
        userEmail: record.requester_email!,
        permission: record.requested_permission as Permission,
        resourceType: record.resource_type || undefined,
        resourceId: record.resource_id || undefined,
        reason: record.reason!,
        requestType: 'permission' as const,
        status: record.status as 'pending' | 'approved' | 'rejected' | 'expired' | 'revoked',
        statusDisplay: record.status_display!,
        requestedAt: new Date(record.created_at!),
        updatedAt: new Date(record.updated_at || record.created_at!),
        reviewedAt: record.approved_at ? new Date(record.approved_at) : undefined,
        reviewedBy: record.approved_by || undefined,
        reviewerEmail: record.approver_email || undefined,
        rejectionReason: record.rejection_reason || undefined,
        effectiveFrom: record.effective_from ? new Date(record.effective_from) : undefined,
        expiresAt: record.expires_at ? new Date(record.expires_at) : undefined,
        durationDays: record.duration_days || 7,
        urgencyLevel: record.urgency_level as 'low' | 'normal' | 'high' | 'urgent',
        dataScope: record.data_scope as 'self' | 'department' | 'all',
        remainingHours: record.remaining_hours || 0
      }));

      setApprovalHistory(requests);
      return requests;
    } catch (err) {
      console.error('Error fetching approval history:', err);
      setError(err as Error);
      return [];
    }
  }, [user, canApprove, transformDatabaseRecord]);

  // 批准单个权限申请
  const approveRequest = useCallback(async (formData: ApprovalFormData): Promise<void> => {
    if (!user || !canApprove) {
      throw new Error('Insufficient permissions to approve requests');
    }

    setLoading(true);
    try {
      const now = new Date();
      const updateData: any = {
        status: formData.approved ? 'approved' : 'rejected',
        approved_by: user.id,
        approved_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      if (formData.approved) {
        // 批准的情况：设置生效和过期时间
        const effectiveFrom = formData.modifyExpiration && formData.effectiveFrom 
          ? formData.effectiveFrom : now;
        const expiresAt = formData.modifyExpiration && formData.newExpirationDate 
          ? formData.newExpirationDate 
          : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 默认7天
        
        updateData.effective_from = effectiveFrom.toISOString();
        updateData.expires_at = expiresAt.toISOString();
        
        // 如果修改了条件
        if (formData.modifyConditions && formData.newConditions) {
          updateData.conditions = formData.newConditions;
        }
      } else {
        // 拒绝的情况：记录拒绝原因
        updateData.rejection_reason = formData.rejectionReason || '未提供拒绝原因';
      }

      // 更新权限申请记录
      const { error: updateError } = await supabase
        .from('permission_requests')
        .update(updateData)
        .eq('id', formData.requestId);

      if (updateError) {
        throw new Error(`Failed to update permission request: ${updateError.message}`);
      }

      // 如果是批准的权限申请，记录审批日志
      if (formData.approved) {
        await supabase.from('permission_approval_logs').insert({
          request_id: formData.requestId,
          operator_id: user.id,
          operator_email: user.email,
          action_type: 'approve',
          old_status: 'pending',
          new_status: 'approved',
          comments: formData.reason || null,
          changes: {
            effective_from: updateData.effective_from,
            expires_at: updateData.expires_at,
            conditions: formData.newConditions || {}
          }
        });
      } else {
        await supabase.from('permission_approval_logs').insert({
          request_id: formData.requestId,
          operator_id: user.id,
          operator_email: user.email,
          action_type: 'reject',
          old_status: 'pending',
          new_status: 'rejected',
          comments: formData.rejectionReason || null
        });
      }
      
      // 刷新申请列表
      await fetchPendingRequests();
      await fetchApprovalHistory();
      
      console.log(`[usePermissionApproval] Request ${formData.approved ? 'approved' : 'rejected'}: ${formData.requestId}`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Approval operation failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, canApprove, fetchPendingRequests, fetchApprovalHistory]);

  // 批量审批
  const batchApprove = useCallback(async (batchData: BatchApprovalData): Promise<void> => {
    if (!user || !canApprove) {
      throw new Error('Insufficient permissions for batch approval');
    }

    setLoading(true);
    try {
      const approvals = batchData.actions.filter(action => action.action === 'approve');
      const rejections = batchData.actions.filter(action => action.action === 'reject');

      // 批量批准
      if (approvals.length > 0) {
        const approvalIds = approvals.map(a => a.requestId);
        
        const { error: approveError } = await supabase
          .from('unified_permission_config')
          .update({
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .in('id', approvalIds);

        if (approveError) {
          throw new Error(`Batch approval failed: ${approveError.message}`);
        }
      }

      // 批量拒绝
      if (rejections.length > 0) {
        const rejectionIds = rejections.map(r => r.requestId);
        
        const { error: rejectError } = await supabase
          .from('unified_permission_config')
          .delete()
          .in('id', rejectionIds);

        if (rejectError) {
          throw new Error(`Batch rejection failed: ${rejectError.message}`);
        }
      }

      // 如果有批准操作，刷新权限矩阵
      if (approvals.length > 0) {
        await supabase.from('permission_matrix_mv').select('count').limit(1); // 触发权限矩阵刷新
      }
      
      // 刷新申请列表
      await fetchPendingRequests();
      await fetchApprovalHistory();
      
      console.log(`[usePermissionApproval] Batch operation completed: ${approvals.length} approved, ${rejections.length} rejected`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Batch approval failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, canApprove, fetchPendingRequests, fetchApprovalHistory]);

  // 快速批准（使用默认参数）
  const quickApprove = useCallback(async (requestId: string, reason?: string): Promise<void> => {
    await approveRequest({
      requestId,
      approved: true,
      reason
    });
  }, [approveRequest]);

  // 快速拒绝
  const quickReject = useCallback(async (requestId: string, reason?: string): Promise<void> => {
    await approveRequest({
      requestId,
      approved: false,
      reason
    });
  }, [approveRequest]);

  // 获取审批统计信息
  const getApprovalStats = useCallback(async (): Promise<PermissionRequestStats> => {
    if (!user || !canApprove) {
      return { total: 0, pending: 0, approved: 0, rejected: 0, expired: 0 };
    }

    try {
      const { data, error } = await supabase
        .from('unified_permission_config')
        .select('is_active, effective_until')
        .not('permission_rules', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch approval stats: ${error.message}`);
      }

      const now = new Date();
      const stats = {
        total: data.length,
        pending: data.filter(r => !r.is_active).length,
        approved: data.filter(r => r.is_active && (!r.effective_until || new Date(r.effective_until) > now)).length,
        rejected: 0, // 拒绝的申请被删除，无法统计
        expired: data.filter(r => r.is_active && r.effective_until && new Date(r.effective_until) <= now).length
      };

      return stats;
    } catch (err) {
      console.error('Error fetching approval stats:', err);
      return { total: 0, pending: 0, approved: 0, rejected: 0, expired: 0 };
    }
  }, [user, canApprove]);

  // 过滤申请列表
  const filterRequests = useCallback((
    requests: PermissionRequest[],
    filter: PermissionRequestFilter
  ): PermissionRequest[] => {
    let filtered = [...requests];

    // 状态过滤
    if (filter.status && filter.status !== 'all') {
      filtered = filtered.filter(req => req.status === filter.status);
    }

    // 申请类型过滤
    if (filter.requestType && filter.requestType !== 'all') {
      filtered = filtered.filter(req => req.requestType === filter.requestType);
    }

    // 时间范围过滤
    if (filter.dateRange && filter.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filter.dateRange) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(req => req.requestedAt >= startDate);
    }

    // 排序
    if (filter.sortBy) {
      filtered.sort((a, b) => {
        let aValue: Date | undefined;
        let bValue: Date | undefined;
        
        switch (filter.sortBy) {
          case 'created_at':
            aValue = a.requestedAt;
            bValue = b.requestedAt;
            break;
          case 'updated_at':
            aValue = a.updatedAt;
            bValue = b.updatedAt;
            break;
          case 'expires_at':
            aValue = a.expiresAt;
            bValue = b.expiresAt;
            break;
        }
        
        if (!aValue && !bValue) return 0;
        if (!aValue) return 1;
        if (!bValue) return -1;
        
        const diff = aValue.getTime() - bValue.getTime();
        return filter.sortOrder === 'desc' ? -diff : diff;
      });
    }

    return filtered;
  }, []);

  // 初始化数据加载
  useEffect(() => {
    if (user && canApprove) {
      fetchPendingRequests();
      fetchApprovalHistory(20);
    }
  }, [user, canApprove, fetchPendingRequests, fetchApprovalHistory]);

  // 监听权限变更
  useEffect(() => {
    if (!user || !canApprove) return;

    const unsubscribe = unifiedPermissionManager.subscribe({
      userId: user.id,
      permissions: [],
      onPermissionChange: (event) => {
        if (event.type === 'permission_updated') {
          // 权限变更时刷新申请列表
          fetchPendingRequests();
        }
      },
      onError: (error) => {
        console.error('[usePermissionApproval] Subscription error:', error);
        setError(error);
      }
    });

    return unsubscribe;
  }, [user, canApprove, fetchPendingRequests]);

  return {
    // 审批数据
    pendingRequests,
    approvalHistory,
    selectedRequests,
    
    // 审批操作
    approveRequest,
    batchApprove,
    quickApprove,
    quickReject,
    
    // 数据管理
    fetchPendingRequests,
    fetchApprovalHistory,
    getApprovalStats,
    filterRequests,
    
    // 状态管理
    setSelectedRequests,
    
    // 状态
    loading,
    error,
    canApprove
  };
}

// 审批工具函数
export const approvalUtils = {
  /**
   * 生成审批摘要文本
   */
  getApprovalSummary: (request: PermissionRequest): string => {
    const parts = [
      `权限: ${request.permission}`,
      `用户: ${request.metadata?.user_name || request.userId}`,
      `申请时间: ${request.requestedAt.toLocaleDateString()}`
    ];
    
    if (request.resourceId) {
      parts.push(`资源: ${request.resourceId}`);
    }
    
    return parts.join(' | ');
  },

  /**
   * 检查申请是否需要特殊审批
   */
  requiresSpecialApproval: (request: PermissionRequest): boolean => {
    // 高权限申请需要特殊审批
    const highPrivilegePermissions = [
      'system.',
      'admin.',
      'super_admin.',
      'user.delete',
      'payroll.approve'
    ];
    
    return highPrivilegePermissions.some(prefix => request.permission.startsWith(prefix));
  },

  /**
   * 获取建议的过期时间
   */
  getSuggestedExpiration: (request: PermissionRequest): Date => {
    const now = new Date();
    
    // 根据权限类型设置不同的过期时间
    if (request.permission.startsWith('system.') || request.permission.startsWith('admin.')) {
      // 系统权限：1天
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (request.permission.includes('delete') || request.permission.includes('manage')) {
      // 危险权限：3天
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    } else {
      // 普通权限：7天
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  },

  /**
   * 格式化审批批次信息
   */
  formatBatchInfo: (actions: ApprovalAction[]): string => {
    const approvals = actions.filter(a => a.action === 'approve').length;
    const rejections = actions.filter(a => a.action === 'reject').length;
    
    const parts = [];
    if (approvals > 0) parts.push(`批准 ${approvals} 个`);
    if (rejections > 0) parts.push(`拒绝 ${rejections} 个`);
    
    return parts.join('，') || '无操作';
  }
};