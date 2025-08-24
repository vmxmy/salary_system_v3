/**
 * 权限申请管理 Hook - 基于新的统一权限系统
 * 
 * 功能特性：
 * - 基于 unified_permission_config 表进行权限申请管理
 * - 申请记录作为非激活状态的权限配置存储
 * - 支持临时权限和永久权限申请
 * - 提供申请状态跟踪和历史查询
 * 
 * 设计原则：
 * - 简化架构：权限申请即权限配置（is_active=false）
 * - 灵活配置：支持JSONB格式的复杂权限规则
 * - 审批流程：通过激活配置完成审批
 * - 实时同步：申请状态实时更新
 */

import { useState, useEffect, useCallback } from 'react';
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
 * 权限申请选项
 */
export interface PermissionRequestOptions {
  /** 权限代码 */
  permission: Permission;
  /** 资源类型（可选） */
  resourceType?: string;
  /** 资源ID（可选） */
  resourceId?: string;
  /** 申请原因 */
  reason?: string;
  /** 有效期（天数，默认7天） */
  durationDays?: number;
  /** 紧急程度 */
  urgencyLevel?: 'low' | 'normal' | 'high' | 'urgent';
  /** 数据范围 */
  dataScope?: 'self' | 'department' | 'all';
  /** 额外条件 */
  conditions?: Record<string, any>;
}

/**
 * 批量权限申请选项
 */
export interface BatchPermissionRequestOptions {
  permissions: PermissionRequestOptions[];
  globalReason?: string;
}

/**
 * 权限申请过滤器
 */
export interface PermissionRequestFilter {
  status?: PermissionRequestStatus;
  requestType?: 'permission' | 'role' | 'all';
  dateRange?: 'day' | 'week' | 'month' | 'all';
  sortBy?: 'created_at' | 'updated_at' | 'expires_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 权限申请统计
 */
export interface PermissionRequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
}

/**
 * 权限申请管理 Hook
 */
export function usePermissionRequest(): UsePermissionRequestReturn {
  const { user } = useUnifiedAuth();
  const [myRequests, setMyRequests] = useState<PermissionRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 权限申请转换为数据库记录
  const buildPermissionRule = useCallback((options: PermissionRequestOptions) => {
    const { permission, resourceId, reason, durationDays = 7, dataScope = 'self', conditions = {} } = options;
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    
    return {
      [permission]: {
        data_scope: dataScope,
        conditions: {
          ...conditions,
          ...(resourceId && { resource_id: resourceId })
        },
        granted_by: 'system',
        reason: reason || `Requested ${permission} permission`,
        expires_at: expiresAt.toISOString(),
        requested: true,
        request_metadata: {
          permission_code: permission,
          resource_id: resourceId,
          data_scope: dataScope,
          duration_days: durationDays,
          requested_at: new Date().toISOString()
        }
      }
    };
  }, []);

  // 提交权限申请
  const requestPermission = useCallback(async (options: PermissionRequestOptions): Promise<string> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (options.durationDays || 7));

      const insertData = {
        requester_id: user.id,
        requester_email: user.email!,
        requested_permission: options.permission,
        reason: options.reason || `申请权限: ${options.permission}`,
        duration_days: options.durationDays || 7,
        urgency_level: options.urgencyLevel || 'normal',
        data_scope: options.dataScope || 'self',
        conditions: options.conditions || {},
        ...(options.resourceType && { resource_type: options.resourceType }),
        ...(options.resourceId && { resource_id: options.resourceId })
      };

      const { data, error: insertError } = await supabase
        .from('permission_requests')
        .insert(insertData)
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to create permission request: ${insertError.message}`);
      }
      
      // 刷新我的申请列表
      await fetchMyRequests();

      console.log(`[usePermissionRequest] Permission request created: ${data.id} for ${options.permission}`);
      return data.id;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Permission request failed');
      setError(error);
      console.error('[usePermissionRequest] Request error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, buildPermissionRule]);

  // 批量权限申请
  const batchRequestPermissions = useCallback(async (options: BatchPermissionRequestOptions): Promise<string[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const requestIds: string[] = [];
      
      for (const permissionOptions of options.permissions) {
        const requestOptions = {
          ...permissionOptions,
          reason: permissionOptions.reason || options.globalReason || `批量权限申请: ${permissionOptions.permission}`
        };
        
        const requestId = await requestPermission(requestOptions);
        requestIds.push(requestId);
      }

      return requestIds;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Batch permission request failed');
      setError(error);
      console.error('[usePermissionRequest] Batch request error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, requestPermission]);

  // 申请临时权限
  const requestTemporaryPermission = useCallback(async (
    permission: Permission,
    durationHours: number,
    reason: string,
    resourceId?: string
  ): Promise<string> => {
    const durationDays = Math.ceil(durationHours / 24);
    
    return requestPermission({
      permission,
      resourceId,
      reason: `${reason} (临时权限，${durationHours}小时)`,
      durationDays,
      dataScope: resourceId ? 'self' : 'department'
    });
  }, [requestPermission]);

  // 转换数据库记录为前端格式
  const transformDatabaseRecord = useCallback((item: any): PermissionRequest => {
    const permissions = Object.keys(item.permission_rules || {});
    const firstPermission = permissions[0];
    const rule = item.permission_rules?.[firstPermission];
    
    return {
      id: item.id,
      userId: item.user_id,
      userEmail: item.user_profiles?.email || '',
      permission: firstPermission as Permission,
      requestType: 'permission' as const,
      reason: rule?.reason || '权限申请',
      status: item.is_active ? 'approved' : 'pending' as PermissionRequestStatus,
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
        database_record: item
      }
    };
  }, []);

  // 获取我的权限申请
  const fetchMyRequests = useCallback(async (): Promise<PermissionRequest[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('view_user_permission_requests')
        .select('*')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch requests: ${error.message}`);
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

      setMyRequests(requests);
      return requests;
    } catch (err) {
      console.error('Error fetching my requests:', err);
      setError(err as Error);
      return [];
    }
  }, [user]);

  // 获取待审批的权限申请（仅限管理员）
  const fetchPendingRequests = useCallback(async (): Promise<PermissionRequest[]> => {
    if (!user || !['admin', 'super_admin', 'hr_manager'].includes(user.role)) return [];

    try {
      const { data, error } = await supabase
        .from('unified_permission_config')
        .select(`
          *,
          user_profiles!inner(email, employee_id, employees!inner(employee_name))
        `)
        .eq('is_active', false) // 待审批状态
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch pending requests: ${error.message}`);
      }

      const requests = (data || []).map(item => {
        const request = transformDatabaseRecord(item);
        return {
          ...request,
          metadata: {
            ...request.metadata,
            user_email: item.user_profiles?.email,
            user_name: item.user_profiles?.employees?.employee_name
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
  }, [user, transformDatabaseRecord]);

  // 撤销权限申请
  const cancelRequest = useCallback(async (requestId: string): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('unified_permission_config')
        .delete()
        .eq('id', requestId)
        .eq('user_id', user.id) // 确保只能撤销自己的申请
        .eq('is_active', false); // 只能撤销未批准的申请

      if (deleteError) {
        throw new Error(`Failed to cancel request: ${deleteError.message}`);
      }

      // 刷新申请列表
      await fetchMyRequests();
      
      console.log(`[usePermissionRequest] Request cancelled: ${requestId}`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Cancel request failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, fetchMyRequests]);

  // 获取申请统计
  const getRequestStats = useCallback(async (): Promise<PermissionRequestStats> => {
    if (!user) {
      return { total: 0, pending: 0, approved: 0, rejected: 0, expired: 0 };
    }

    try {
      const { data, error } = await supabase
        .from('unified_permission_config')
        .select('is_active, effective_until, created_at')
        .eq('user_id', user.id)
        .not('permission_rules', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch request stats: ${error.message}`);
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
      console.error('Error fetching request stats:', err);
      return { total: 0, pending: 0, approved: 0, rejected: 0, expired: 0 };
    }
  }, [user]);

  // 过滤申请列表
  const filterRequests = useCallback((
    requests: PermissionRequest[],
    filter: PermissionRequestFilter
  ): PermissionRequest[] => {
    let filtered = [...requests];

    // 状态过滤
    if (filter.status && (filter.status as string) !== 'all') {
      const statusFilter = filter.status as PermissionRequestStatus;
      filtered = filtered.filter(req => req.status === statusFilter);
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
    if (user) {
      fetchMyRequests();
      
      // 如果是管理员，同时加载待审批申请
      if (['admin', 'super_admin', 'hr_manager'].includes(user.role)) {
        fetchPendingRequests();
      }
    }
  }, [user, fetchMyRequests, fetchPendingRequests]);

  // 监听权限变更
  useEffect(() => {
    if (!user) return;

    const unsubscribe = unifiedPermissionManager.subscribe({
      userId: user.id,
      permissions: [],
      onPermissionChange: (event: PermissionChangeEvent) => {
        if (event.type === 'permission_updated' && event.userId === user.id) {
          // 权限变更时刷新申请列表
          fetchMyRequests();
        }
      },
      onError: (error) => {
        console.error('[usePermissionRequest] Subscription error:', error);
        setError(error);
      }
    });

    return unsubscribe;
  }, [user, fetchMyRequests]);

  return {
    // 申请管理
    requestPermission,
    batchRequestPermissions,
    requestTemporaryPermission,
    cancelRequest,
    
    // 数据获取
    fetchMyRequests,
    fetchPendingRequests,
    getRequestStats,
    filterRequests,
    
    // 状态数据
    myRequests,
    pendingRequests,
    loading,
    error,
    
    // 权限检查
    canApproveRequests: user ? ['admin', 'super_admin', 'hr_manager'].includes(user.role) : false
  };
}

// 权限申请工具函数
export const permissionRequestUtils = {
  /**
   * 格式化权限申请状态显示文本
   */
  getStatusText: (status: PermissionRequestStatus): string => {
    const statusMap: Record<PermissionRequestStatus, string> = {
      'pending': '待审批',
      'approved': '已批准',
      'rejected': '已拒绝',
      'expired': '已过期',
      'revoked': '已撤销'
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
      'expired': 'neutral',
      'revoked': 'error'
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
  },

  /**
   * 生成申请摘要文本
   */
  getRequestSummary: (request: PermissionRequest): string => {
    const parts: string[] = [request.permission];
    
    if (request.resourceId) {
      parts.push(`资源: ${request.resourceId}`);
    }
    
    if (request.dataScope && request.dataScope !== 'self') {
      parts.push(`范围: ${request.dataScope}`);
    }
    
    return parts.join(' | ');
  }
};