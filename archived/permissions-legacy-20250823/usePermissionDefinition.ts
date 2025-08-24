/**
 * 权限定义管理 Hook
 * 
 * 提供权限定义的批量管理、模板操作和统计分析功能
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandlerWithToast } from '@/hooks/core/useErrorHandlerWithToast';
import type {
  Permission,
  PermissionResource,
  PermissionWithResource,
  PermissionFormData,
  PermissionTemplate,
  PermissionUsageStats,
  UsePermissionDefinitionReturn
} from '@/types/permission-resource';

// 预定义的操作类型映射
const ACTION_TYPE_MAP: Record<PermissionResource['resource_type'], Permission['action_type'][]> = {
  page: ['view'],
  action: ['view', 'create', 'update', 'delete', 'export', 'approve'],
  data: ['view', 'create', 'update', 'delete', 'export'],
  api: ['view', 'create', 'update', 'delete'],
  feature: ['view', 'manage']
};

export function usePermissionDefinition(): UsePermissionDefinitionReturn {
  // 状态管理
  const [permissions, setPermissions] = useState<PermissionWithResource[]>([]);
  const [usageStats, setUsageStats] = useState<PermissionUsageStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandlerWithToast();

  // 权限分组
  const permissionsByResource = useMemo(() => {
    const grouped: Record<string, PermissionWithResource[]> = {};
    
    permissions.forEach(permission => {
      const resourceId = permission.resource_id;
      if (!grouped[resourceId]) {
        grouped[resourceId] = [];
      }
      grouped[resourceId].push(permission);
    });
    
    return grouped;
  }, [permissions]);

  const permissionsByAction = useMemo(() => {
    const grouped: Record<Permission['action_type'], PermissionWithResource[]> = {} as any;
    
    permissions.forEach(permission => {
      const actionType = permission.action_type;
      if (!grouped[actionType]) {
        grouped[actionType] = [];
      }
      grouped[actionType].push(permission);
    });
    
    return grouped;
  }, [permissions]);

  // 加载权限数据
  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('permissions')
        .select(`
          *,
          resource:permission_resources(*)
        `)
        .eq('is_active', true)
        .order('permission_code');

      if (queryError) throw queryError;

      setPermissions((data || []) as PermissionWithResource[]);

    } catch (err) {
      handleError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // 加载使用统计
  const loadUsageStats = useCallback(async () => {
    try {
      // 由于这是演示，使用模拟数据
      // 实际项目中应该查询 user_role_assignments 和 role_permissions 表
      const mockStats: PermissionUsageStats[] = permissions.map(permission => ({
        permissionId: permission.id,
        permissionCode: permission.permission_code,
        totalUsers: Math.floor(Math.random() * 50) + 1,
        activeUsers: Math.floor(Math.random() * 30) + 1,
        roleAssignments: [
          { roleName: '管理员', userCount: Math.floor(Math.random() * 10) + 1 },
          { roleName: 'HR经理', userCount: Math.floor(Math.random() * 5) + 1 },
          { roleName: '部门经理', userCount: Math.floor(Math.random() * 8) + 1 }
        ],
        lastUsed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      }));

      setUsageStats(mockStats);
    } catch (err) {
      handleError(err as Error);
    }
  }, [permissions, handleError]);

  // 为资源批量创建权限
  const createPermissions = useCallback(async (
    resourceId: string, 
    actionTypes: Permission['action_type'][]
  ): Promise<Permission[]> => {
    try {
      setError(null);

      // 获取资源信息
      const { data: resource, error: resourceError } = await supabase
        .from('permission_resources')
        .select('*')
        .eq('id', resourceId)
        .single();

      if (resourceError) throw resourceError;
      if (!resource) throw new Error('资源不存在');

      // 检查已存在的权限
      const { data: existingPermissions, error: existingError } = await supabase
        .from('permissions')
        .select('action_type')
        .eq('resource_id', resourceId);

      if (existingError) throw existingError;

      const existingActions = new Set(existingPermissions?.map(p => p.action_type) || []);
      const newActionTypes = actionTypes.filter(action => !existingActions.has(action));

      if (newActionTypes.length === 0) {
        throw new Error('所选操作类型的权限已存在');
      }

      // 批量创建权限
      const newPermissions: PermissionFormData[] = newActionTypes.map(actionType => ({
        permission_code: `${resource.resource_code}.${actionType}`,
        permission_name: `${resource.resource_name} - ${getActionDisplayName(actionType)}`,
        resource_id: resourceId,
        action_type: actionType,
        description: `${resource.resource_name}的${getActionDisplayName(actionType)}权限`,
        metadata: {
          auto_generated: true,
          resource_type: resource.resource_type
        },
        is_active: true
      }));

      const { data: createdPermissions, error: createError } = await supabase
        .from('permissions')
        .insert(newPermissions)
        .select('*');

      if (createError) throw createError;

      // 刷新数据
      await loadPermissions();

      return (createdPermissions || []) as Permission[];
    } catch (err) {
      handleError(err as Error);
      throw err;
    }
  }, [handleError, loadPermissions]);

  // 批量更新权限
  const bulkUpdatePermissions = useCallback(async (
    updates: Array<{ id: string; data: Partial<PermissionFormData> }>
  ): Promise<boolean> => {
    try {
      setError(null);

      // 执行批量更新
      const updatePromises = updates.map(({ id, data }) =>
        supabase
          .from('permissions')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
      );

      const results = await Promise.all(updatePromises);
      
      // 检查是否有错误
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`批量更新失败: ${errors.map(e => e.error?.message).join(', ')}`);
      }

      // 刷新数据
      await loadPermissions();

      return true;
    } catch (err) {
      handleError(err as Error);
      return false;
    }
  }, [handleError, loadPermissions]);

  // 应用权限模板
  const applyTemplate = useCallback(async (templateId: string, resourceId: string): Promise<boolean> => {
    try {
      setError(null);

      // 由于这是演示，先创建一个模拟模板应用
      // 实际项目中应该从模板表中获取模板定义
      const commonActions: Permission['action_type'][] = ['view', 'create', 'update', 'delete'];
      await createPermissions(resourceId, commonActions);

      return true;
    } catch (err) {
      handleError(err as Error);
      return false;
    }
  }, [handleError, createPermissions]);

  // 保存为模板
  const saveAsTemplate = useCallback(async (
    name: string, 
    resourceIds: string[]
  ): Promise<PermissionTemplate> => {
    try {
      setError(null);

      // 获取指定资源的权限定义
      const resourcePermissions = permissions.filter(p => resourceIds.includes(p.resource_id));
      
      // 构建模板数据
      const templateData: Omit<PermissionTemplate, 'id' | 'created_at'> = {
        name,
        description: `基于 ${resourceIds.length} 个资源创建的权限模板`,
        resources: [],
        is_system: false
      };

      // 按资源分组权限
      const resourceGroups = resourcePermissions.reduce((groups, permission) => {
        const resourceId = permission.resource_id;
        if (!groups[resourceId]) {
          groups[resourceId] = {
            resource: permission.resource!,
            permissions: []
          };
        }
        groups[resourceId].permissions.push(permission);
        return groups;
      }, {} as Record<string, { resource: PermissionResource; permissions: PermissionWithResource[] }>);

      templateData.resources = Object.values(resourceGroups).map(group => ({
        resource_code: group.resource.resource_code,
        resource_name: group.resource.resource_name,
        resource_type: group.resource.resource_type,
        permissions: group.permissions.map(p => ({
          action_type: p.action_type,
          permission_name: p.permission_name
        }))
      }));

      // 在实际项目中，这里应该保存到 permission_templates 表
      const mockTemplate: PermissionTemplate = {
        id: `template_${Date.now()}`,
        ...templateData,
        created_at: new Date().toISOString()
      };

      return mockTemplate;
    } catch (err) {
      handleError(err as Error);
      throw err;
    }
  }, [handleError, permissions]);

  // 获取可用操作类型
  const getAvailableActions = useCallback((resourceType: PermissionResource['resource_type']): Permission['action_type'][] => {
    return ACTION_TYPE_MAP[resourceType] || [];
  }, []);

  // 获取可用权限列表
  const getAvailablePermissions = useCallback((resourceType?: PermissionResource['resource_type']) => {
    if (resourceType) {
      return permissions.filter(p => p.resource?.resource_type === resourceType);
    }
    return permissions;
  }, [permissions]);

  // 刷新数据
  const refresh = useCallback(async () => {
    await Promise.all([
      loadPermissions(),
      loadUsageStats()
    ]);
  }, [loadPermissions, loadUsageStats]);

  // 初始化加载数据
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // 加载使用统计（依赖于权限数据）
  useEffect(() => {
    if (permissions.length > 0) {
      loadUsageStats();
    }
  }, [permissions, loadUsageStats]);

  return {
    // 权限定义数据
    permissions,
    loading,
    error: error?.message || null,

    // 权限分组
    permissionsByResource,
    permissionsByAction,

    // 统计数据
    usageStats,

    // 操作方法
    createPermissions,
    bulkUpdatePermissions,

    // 模板操作
    applyTemplate,
    saveAsTemplate,

    // 工具方法
    getAvailableActions,
    getAvailablePermissions,

    // 刷新
    refresh
  };
}

// 辅助函数：获取操作类型的显示名称
function getActionDisplayName(actionType: Permission['action_type']): string {
  const displayNames: Record<Permission['action_type'], string> = {
    view: '查看',
    create: '创建',
    update: '更新',
    delete: '删除',
    export: '导出',
    approve: '审批',
    manage: '管理'
  };
  return displayNames[actionType] || actionType;
}