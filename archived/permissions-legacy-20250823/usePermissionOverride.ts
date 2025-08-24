/**
 * 权限覆盖管理 Hook
 * 
 * 提供权限覆盖创建、管理和冲突解决功能
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { 
  PermissionOverride,
  OverrideConflict,
  OverrideResolution,
  OverrideTemplate,
  TemporaryOverride
} from '@/types/permission-assignment';
import { useErrorHandlerWithToast } from '@/hooks/core/useErrorHandlerWithToast';

export interface UsePermissionOverrideReturn {
  // 覆盖数据
  overrides: PermissionOverride[];
  conflicts: OverrideConflict[];
  templates: OverrideTemplate[];
  loading: boolean;
  error: Error | null;
  
  // 覆盖操作
  createOverride: (override: CreateOverrideInput) => Promise<string>;
  updateOverride: (overrideId: string, updates: UpdateOverrideInput) => Promise<boolean>;
  removeOverride: (overrideId: string, reason?: string) => Promise<boolean>;
  
  // 临时权限
  createTemporaryOverride: (input: TemporaryOverrideInput) => Promise<string>;
  extendOverride: (overrideId: string, newExpiryDate: Date, reason?: string) => Promise<boolean>;
  revokeTemporaryOverride: (overrideId: string, reason?: string) => Promise<boolean>;
  
  // 冲突管理
  detectConflicts: (userId: string) => Promise<OverrideConflict[]>;
  resolveConflict: (conflictId: string, resolution: OverrideResolution) => Promise<boolean>;
  getConflictSuggestions: (conflictId: string) => Promise<ResolutionSuggestion[]>;
  
  // 覆盖查询
  getUserOverrides: (userId: string) => Promise<PermissionOverride[]>;
  getOverrideHistory: (userId: string, permissionId?: string) => Promise<OverrideHistoryEntry[]>;
  getActiveOverrides: (filters?: OverrideFilters) => Promise<PermissionOverride[]>;
  
  // 模板管理
  createOverrideTemplate: (template: CreateTemplateInput) => Promise<string>;
  applyTemplate: (userId: string, templateId: string) => Promise<PermissionOverride[]>;
  
  // 覆盖分析
  analyzeOverrideImpact: (userId: string, permissionId: string, overrideType: 'grant' | 'deny') => Promise<OverrideImpact>;
  validateOverride: (userId: string, permissionId: string, overrideType: 'grant' | 'deny') => Promise<OverrideValidation>;
  
  // 批量覆盖操作
  batchCreateOverrides: (overrides: CreateOverrideInput[]) => Promise<BatchOverrideResult>;
  batchRemoveOverrides: (overrideIds: string[], reason?: string) => Promise<BatchOverrideResult>;
  
  // 数据刷新
  refreshData: () => Promise<void>;
  refreshUserOverrides: (userId: string) => Promise<void>;
}

interface CreateOverrideInput {
  userId: string;
  permissionId: string;
  overrideType: 'grant' | 'deny';
  reason: string;
  expiresAt?: Date;
  priority?: number;
  scope?: 'global' | 'resource';
  resourceId?: string;
  metadata?: Record<string, any>;
}

interface UpdateOverrideInput {
  reason?: string;
  expiresAt?: Date;
  priority?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

interface TemporaryOverrideInput extends CreateOverrideInput {
  duration: number; // 持续时间（小时）
  autoRevoke: boolean;
  maxExtensions?: number;
}

interface OverrideFilters {
  userId?: string;
  permissionId?: string;
  overrideType?: 'grant' | 'deny';
  isActive?: boolean;
  expiringBefore?: Date;
  createdAfter?: Date;
}

interface OverrideHistoryEntry {
  id: string;
  overrideId: string;
  changeType: 'created' | 'updated' | 'removed' | 'expired';
  changedBy: string;
  changedAt: Date;
  reason?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

interface ResolutionSuggestion {
  type: 'remove_lower_priority' | 'merge_overrides' | 'escalate_to_admin' | 'create_exception';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  autoApplicable: boolean;
  metadata?: Record<string, any>;
}

interface CreateTemplateInput {
  name: string;
  description: string;
  overrides: Omit<CreateOverrideInput, 'userId'>[];
  category?: string;
  isPublic: boolean;
  metadata?: Record<string, any>;
}

interface OverrideImpact {
  permissionChanges: {
    granted: string[];
    revoked: string[];
    conflicted: string[];
  };
  affectedResources: string[];
  securityImplications: SecurityImplication[];
  userAccessChanges: AccessChange[];
}

interface SecurityImplication {
  type: 'privilege_escalation' | 'data_access' | 'system_access' | 'administrative_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

interface AccessChange {
  resource: string;
  action: string;
  changeType: 'gained' | 'lost' | 'modified';
  impact: string;
}

interface OverrideValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

interface BatchOverrideResult {
  totalOperations: number;
  successCount: number;
  errorCount: number;
  results: Array<{
    index: number;
    success: boolean;
    overrideId?: string;
    error?: string;
  }>;
  errors: string[];
}

export function usePermissionOverride(): UsePermissionOverrideReturn {
  const [overrides, setOverrides] = useState<PermissionOverride[]>([]);
  const [conflicts, setConflicts] = useState<OverrideConflict[]>([]);
  const [templates, setTemplates] = useState<OverrideTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const { handleError } = useErrorHandlerWithToast();

  // 获取覆盖数据
  const fetchOverridesData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 获取所有活跃的权限覆盖
      const { data: overrideData, error: overrideError } = await supabase
        .from('user_permission_overrides')
        .select(`
          *,
          user_profiles!inner(id, email),
          permissions!inner(id, permission_code, permission_name, resource_id, action_type),
          permission_resources!inner(id, resource_code, resource_name, resource_type)
        `)
        .eq('is_active', true);

      if (overrideError) throw overrideError;

      // 简化实现：暂时返回空的冲突数组
      // 实际项目中需要实现复杂的冲突检测逻辑
      const conflictData: OverrideConflict[] = [];

      // 简化实现：暂时返回空的模板数组
      // 实际项目中需要创建permission_override_templates表
      const templateData: OverrideTemplate[] = [];

      // 转换数据格式以匹配TypeScript接口
      const transformedOverrides: PermissionOverride[] = (overrideData || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        userName: (item.user_profiles as any)?.email || 'Unknown User',
        userEmail: (item.user_profiles as any)?.email || 'unknown@example.com',
        permissionId: item.permission_id,
        permissionCode: (item.permissions as any)?.permission_code || 'unknown',
        permissionName: (item.permissions as any)?.permission_name || 'Unknown Permission',
        resourceId: (item.permissions as any)?.resource_id || '',
        resourceCode: (item.permission_resources as any)?.resource_code || 'unknown',
        resourceName: (item.permission_resources as any)?.resource_name || 'Unknown Resource',
        resourceType: (item.permission_resources as any)?.resource_type || 'unknown',
        actionType: (item.permissions as any)?.action_type || 'unknown',
        overrideType: item.override_type as 'grant' | 'deny',
        reason: item.reason || '',
        grantedBy: item.granted_by || '',
        grantedAt: new Date(item.granted_at || new Date()),
        expiresAt: item.expires_at ? new Date(item.expires_at) : undefined,
        isActive: item.is_active ?? true,
        priority: 0, // 默认优先级
        scope: 'global' as const,
        metadata: {}
      }));

      setOverrides(transformedOverrides);
      setConflicts(conflictData);
      setTemplates(templateData);
      
    } catch (err) {
      handleError(err, { customMessage: '获取权限覆盖数据失败', level: 'error' });
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // 创建权限覆盖
  const createOverride = useCallback(async (
    input: CreateOverrideInput
  ): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('user_permission_overrides')
        .insert({
          user_id: input.userId,
          permission_id: input.permissionId,
          override_type: input.overrideType,
          reason: input.reason,
          expires_at: input.expiresAt?.toISOString(),
          granted_by: (await supabase.auth.getUser()).data.user?.id,
          granted_at: new Date().toISOString(),
          is_active: true,
          metadata: input.metadata
        })
        .select('id')
        .single();

      if (error) throw error;

      // 刷新数据
      await fetchOverridesData();
      
      return data.id;
      
    } catch (err) {
      handleError(err, { customMessage: '创建权限覆盖失败', level: 'error' });
      throw err;
    }
  }, [handleError, fetchOverridesData]);

  // 更新权限覆盖
  const updateOverride = useCallback(async (
    overrideId: string,
    updates: UpdateOverrideInput
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_permission_overrides')
        .update({
          reason: updates.reason,
          expires_at: updates.expiresAt?.toISOString(),
          is_active: updates.isActive,
          metadata: updates.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', overrideId);

      if (error) throw error;

      // 刷新数据
      await fetchOverridesData();
      return true;
      
    } catch (err) {
      handleError(err, { customMessage: '更新权限覆盖失败', level: 'error' });
      return false;
    }
  }, [handleError, fetchOverridesData]);

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
          reason: reason || '手动移除覆盖',
          updated_at: new Date().toISOString()
        })
        .eq('id', overrideId);

      if (error) throw error;

      // 刷新数据
      await fetchOverridesData();
      return true;
      
    } catch (err) {
      handleError(err, { customMessage: '移除权限覆盖失败', level: 'error' });
      return false;
    }
  }, [handleError, fetchOverridesData]);

  // 创建临时权限覆盖
  const createTemporaryOverride = useCallback(async (
    input: TemporaryOverrideInput
  ): Promise<string> => {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + input.duration);

    return createOverride({
      ...input,
      expiresAt,
      metadata: {
        ...input.metadata,
        isTemporary: true,
        duration: input.duration,
        autoRevoke: input.autoRevoke,
        maxExtensions: input.maxExtensions || 0
      }
    });
  }, [createOverride]);

  // 延长覆盖有效期
  const extendOverride = useCallback(async (
    overrideId: string,
    newExpiryDate: Date,
    reason?: string
  ): Promise<boolean> => {
    return updateOverride(overrideId, {
      expiresAt: newExpiryDate,
      reason: reason || '延长覆盖有效期'
    });
  }, [updateOverride]);

  // 撤销临时覆盖
  const revokeTemporaryOverride = useCallback(async (
    overrideId: string,
    reason?: string
  ): Promise<boolean> => {
    return removeOverride(overrideId, reason || '撤销临时权限覆盖');
  }, [removeOverride]);

  // 检测冲突
  const detectConflicts = useCallback(async (
    userId: string
  ): Promise<OverrideConflict[]> => {
    try {
      // 简化实现：返回空冲突数组
      // 实际项目中需要实现复杂的冲突检测逻辑
      return [];
      
    } catch (err) {
      handleError(err, { customMessage: '检测权限冲突失败', level: 'error' });
      return [];
    }
  }, [handleError]);

  // 解决冲突
  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: OverrideResolution
  ): Promise<boolean> => {
    try {
      // 简化实现：模拟解决冲突成功
      // 实际项目中需要实现复杂的冲突解决逻辑
      console.log(`Mock: Resolved conflict ${conflictId} with resolution:`, resolution);
      
      // 刷新数据
      await fetchOverridesData();
      return true;
      
    } catch (err) {
      handleError(err, { customMessage: '解决权限冲突失败', level: 'error' });
      return false;
    }
  }, [handleError, fetchOverridesData]);

  // 获取冲突解决建议
  const getConflictSuggestions = useCallback(async (
    conflictId: string
  ): Promise<ResolutionSuggestion[]> => {
    try {
      // 简化实现：返回空建议数组
      // 实际项目中需要实现智能建议生成逻辑
      return [];
      
    } catch (err) {
      handleError(err, { customMessage: '获取冲突解决建议失败', level: 'error' });
      return [];
    }
  }, [handleError]);

  // 获取用户覆盖
  const getUserOverrides = useCallback(async (
    userId: string
  ): Promise<PermissionOverride[]> => {
    try {
      const { data, error } = await supabase
        .from('user_permission_overrides')
        .select(`
          *,
          permissions!inner(id, permission_code, permission_name, resource_id, action_type),
          permission_resources!inner(id, resource_code, resource_name, resource_type)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      
      // 转换数据格式
      const transformedOverrides: PermissionOverride[] = (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        userName: 'Unknown User', // 不需要用户信息
        userEmail: 'unknown@example.com',
        permissionId: item.permission_id,
        permissionCode: (item.permissions as any)?.permission_code || 'unknown',
        permissionName: (item.permissions as any)?.permission_name || 'Unknown Permission',
        resourceId: (item.permissions as any)?.resource_id || '',
        resourceCode: (item.permission_resources as any)?.resource_code || 'unknown',
        resourceName: (item.permission_resources as any)?.resource_name || 'Unknown Resource',
        resourceType: (item.permission_resources as any)?.resource_type || 'unknown',
        actionType: (item.permissions as any)?.action_type || 'unknown',
        overrideType: item.override_type as 'grant' | 'deny',
        reason: item.reason || '',
        grantedBy: item.granted_by || '',
        grantedAt: new Date(item.granted_at || new Date()),
        expiresAt: item.expires_at ? new Date(item.expires_at) : undefined,
        isActive: item.is_active ?? true,
        priority: 0,
        scope: 'global' as const,
        metadata: {}
      }));
      
      return transformedOverrides;
      
    } catch (err) {
      handleError(err, { customMessage: '获取用户权限覆盖失败', level: 'error' });
      return [];
    }
  }, [handleError]);

  // 获取覆盖历史
  const getOverrideHistory = useCallback(async (
    userId: string,
    permissionId?: string
  ): Promise<OverrideHistoryEntry[]> => {
    try {
      // 简化实现：返回空历史记录数组
      // 实际项目中需要创建permission_override_history表来记录历史变更
      console.log(`Mock: Fetching override history for user ${userId}, permission ${permissionId || 'all'}`);
      return [];
      
    } catch (err) {
      handleError(err, { customMessage: '获取覆盖历史失败', level: 'error' });
      return [];
    }
  }, [handleError]);

  // 获取活跃覆盖
  const getActiveOverrides = useCallback(async (
    filters: OverrideFilters = {}
  ): Promise<PermissionOverride[]> => {
    try {
      let query = supabase
        .from('user_permission_overrides')
        .select(`
          *,
          user_profiles!inner(id, email),
          permissions!inner(id, permission_code, permission_name, resource_id, action_type),
          permission_resources!inner(id, resource_code, resource_name, resource_type)
        `)
        .eq('is_active', true);

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.permissionId) {
        query = query.eq('permission_id', filters.permissionId);
      }
      if (filters.overrideType) {
        query = query.eq('override_type', filters.overrideType);
      }
      if (filters.expiringBefore) {
        query = query.lt('expires_at', filters.expiringBefore.toISOString());
      }
      if (filters.createdAfter) {
        query = query.gt('granted_at', filters.createdAfter.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // 转换数据格式
      const transformedOverrides: PermissionOverride[] = (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        userName: (item.user_profiles as any)?.email || 'Unknown User',
        userEmail: (item.user_profiles as any)?.email || 'unknown@example.com',
        permissionId: item.permission_id,
        permissionCode: (item.permissions as any)?.permission_code || 'unknown',
        permissionName: (item.permissions as any)?.permission_name || 'Unknown Permission',
        resourceId: (item.permissions as any)?.resource_id || '',
        resourceCode: (item.permission_resources as any)?.resource_code || 'unknown',
        resourceName: (item.permission_resources as any)?.resource_name || 'Unknown Resource',
        resourceType: (item.permission_resources as any)?.resource_type || 'unknown',
        actionType: (item.permissions as any)?.action_type || 'unknown',
        overrideType: item.override_type as 'grant' | 'deny',
        reason: item.reason || '',
        grantedBy: item.granted_by || '',
        grantedAt: new Date(item.granted_at || new Date()),
        expiresAt: item.expires_at ? new Date(item.expires_at) : undefined,
        isActive: item.is_active ?? true,
        priority: 0,
        scope: 'global' as const,
        metadata: {}
      }));
      
      return transformedOverrides;
      
    } catch (err) {
      handleError(err, { customMessage: '获取活跃权限覆盖失败', level: 'error' });
      return [];
    }
  }, [handleError]);

  // 创建覆盖模板
  const createOverrideTemplate = useCallback(async (
    template: CreateTemplateInput
  ): Promise<string> => {
    try {
      // 简化实现：模拟创建模板成功
      // 实际项目中需要创建permission_override_templates表
      const mockTemplateId = `template_${Date.now()}`;
      console.log(`Mock: Created override template "${template.name}" with ID:`, mockTemplateId);

      // 刷新模板数据
      await fetchOverridesData();
      
      return mockTemplateId;
      
    } catch (err) {
      handleError(err, { customMessage: '创建覆盖模板失败', level: 'error' });
      throw err;
    }
  }, [handleError, fetchOverridesData]);

  // 应用模板
  const applyTemplate = useCallback(async (
    userId: string,
    templateId: string
  ): Promise<PermissionOverride[]> => {
    try {
      // 简化实现：模拟应用模板成功
      // 实际项目中需要实现模板应用逻辑
      console.log(`Mock: Applied template ${templateId} to user ${userId}`);

      // 刷新数据
      await fetchOverridesData();
      
      return [];
      
    } catch (err) {
      handleError(err, { customMessage: '应用覆盖模板失败', level: 'error' });
      return [];
    }
  }, [handleError, fetchOverridesData]);

  // 分析覆盖影响
  const analyzeOverrideImpact = useCallback(async (
    userId: string,
    permissionId: string,
    overrideType: 'grant' | 'deny'
  ): Promise<OverrideImpact> => {
    try {
      // 简化实现：返回模拟的影响分析
      // 实际项目中需要实现复杂的影响分析逻辑
      const mockImpact: OverrideImpact = {
        permissionChanges: {
          granted: overrideType === 'grant' ? [permissionId] : [],
          revoked: overrideType === 'deny' ? [permissionId] : [],
          conflicted: []
        },
        affectedResources: [],
        securityImplications: [],
        userAccessChanges: []
      };
      
      return mockImpact;
      
    } catch (err) {
      handleError(err, { customMessage: '分析覆盖影响失败', level: 'error' });
      throw err;
    }
  }, [handleError]);

  // 验证覆盖
  const validateOverride = useCallback(async (
    userId: string,
    permissionId: string,
    overrideType: 'grant' | 'deny'
  ): Promise<OverrideValidation> => {
    try {
      // 简化实现：返回模拟的验证结果
      // 实际项目中需要实现复杂的权限验证逻辑
      const mockValidation: OverrideValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      };
      
      return mockValidation;
      
    } catch (err) {
      handleError(err, { customMessage: '验证权限覆盖失败', level: 'error' });
      throw err;
    }
  }, [handleError]);

  // 批量创建覆盖
  const batchCreateOverrides = useCallback(async (
    overrides: CreateOverrideInput[]
  ): Promise<BatchOverrideResult> => {
    try {
      // 简化实现：模拟批量创建操作
      // 实际项目中需要实现复杂的批量操作逻辑
      const mockResult: BatchOverrideResult = {
        totalOperations: overrides.length,
        successCount: overrides.length,
        errorCount: 0,
        results: overrides.map((_, index) => ({
          index,
          success: true,
          overrideId: `override_${Date.now()}_${index}`
        })),
        errors: []
      };

      // 刷新数据
      await fetchOverridesData();
      
      return mockResult;
      
    } catch (err) {
      handleError(err, { customMessage: '批量创建权限覆盖失败', level: 'error' });
      throw err;
    }
  }, [handleError, fetchOverridesData]);

  // 批量移除覆盖
  const batchRemoveOverrides = useCallback(async (
    overrideIds: string[],
    reason?: string
  ): Promise<BatchOverrideResult> => {
    try {
      // 简化实现：模拟批量移除操作
      // 实际项目中需要实现复杂的批量操作逻辑
      const mockResult: BatchOverrideResult = {
        totalOperations: overrideIds.length,
        successCount: overrideIds.length,
        errorCount: 0,
        results: overrideIds.map((id, index) => ({
          index,
          success: true,
          overrideId: id
        })),
        errors: []
      };

      // 刷新数据
      await fetchOverridesData();
      
      return mockResult;
      
    } catch (err) {
      handleError(err, { customMessage: '批量移除权限覆盖失败', level: 'error' });
      throw err;
    }
  }, [handleError, fetchOverridesData]);

  // 刷新数据
  const refreshData = useCallback(async () => {
    await fetchOverridesData();
  }, [fetchOverridesData]);

  // 刷新用户覆盖
  const refreshUserOverrides = useCallback(async (userId: string) => {
    try {
      const userOverrides = await getUserOverrides(userId);
      setOverrides(prev => [
        ...prev.filter(o => o.userId !== userId),
        ...userOverrides
      ]);
    } catch (err) {
      // 错误已在 getUserOverrides 中处理
    }
  }, [getUserOverrides]);

  // 初始化加载数据
  useEffect(() => {
    fetchOverridesData();
  }, [fetchOverridesData]);

  return {
    overrides,
    conflicts,
    templates,
    loading,
    error: null,
    createOverride,
    updateOverride,
    removeOverride,
    createTemporaryOverride,
    extendOverride,
    revokeTemporaryOverride,
    detectConflicts,
    resolveConflict,
    getConflictSuggestions,
    getUserOverrides,
    getOverrideHistory,
    getActiveOverrides,
    createOverrideTemplate,
    applyTemplate,
    analyzeOverrideImpact,
    validateOverride,
    batchCreateOverrides,
    batchRemoveOverrides,
    refreshData,
    refreshUserOverrides
  };
}