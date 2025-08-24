/**
 * 权限资源管理 Hook
 * 
 * 提供完整的权限资源CRUD操作和数据管理
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type {
  PermissionResource,
  Permission,
  PermissionResourceWithChildren,
  PermissionWithResource,
  PermissionResourceFormData,
  PermissionFormData,
  BatchPermissionOperation,
  UsePermissionResourceOptions,
  UsePermissionResourceReturn,
  ResourceFilter,
  PermissionFilter
} from '@/types/permission-resource';

export function usePermissionResource(options: UsePermissionResourceOptions = {}): UsePermissionResourceReturn {
  const {
    includeChildren = true,
    includePermissions = true,
    includeStats = false,
    onlyActive = true
  } = options;

  // 状态管理
  const [resources, setResources] = useState<PermissionResourceWithChildren[]>([]);
  const [permissions, setPermissions] = useState<PermissionWithResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();
  
  const clearError = useCallback(() => setError(null), []);

  // 加载权限资源数据
  const loadResources = useCallback(async (filter?: ResourceFilter) => {
    try {
      setLoading(true);
      clearError();

      let query = supabase
        .from('permission_resources')
        .select(`
          *,
          ${includeChildren ? `
            children:permission_resources!parent_id(*),
            parent:permission_resources!permission_resources_parent_id_fkey(*)
          ` : ''}
          ${includePermissions ? ',permissions(*)' : ''}
        `);

      // 应用过滤条件
      if (onlyActive) {
        query = query.eq('is_active', true);
      }
      
      if (filter?.search) {
        query = query.or(`resource_name.ilike.%${filter.search}%,resource_code.ilike.%${filter.search}%`);
      }
      
      if (filter?.resourceType) {
        query = query.eq('resource_type', filter.resourceType);
      }
      
      if (filter?.isActive !== undefined) {
        query = query.eq('is_active', filter.isActive);
      }
      
      if (filter?.parentId) {
        query = query.eq('parent_id', filter.parentId);
      } else if (filter?.parentId === null) {
        query = query.is('parent_id', null);
      }

      const { data, error: queryError } = await query.order('resource_code');

      if (queryError) throw queryError;

      // 构建树形结构
      const resourcesWithRelations = buildResourceTree(data || []);
      setResources(resourcesWithRelations);

    } catch (err) {
      handleError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [includeChildren, includePermissions, onlyActive, clearError, handleError]);

  // 加载权限数据
  const loadPermissions = useCallback(async (filter?: PermissionFilter) => {
    try {
      setLoading(true);
      clearError();

      let query = supabase
        .from('permissions')
        .select(`
          *,
          resource:permission_resources(*)
        `);

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      if (filter?.search) {
        query = query.or(`permission_name.ilike.%${filter.search}%,permission_code.ilike.%${filter.search}%`);
      }

      if (filter?.resourceId) {
        query = query.eq('resource_id', filter.resourceId);
      }

      if (filter?.actionType) {
        query = query.eq('action_type', filter.actionType);
      }

      if (filter?.isActive !== undefined) {
        query = query.eq('is_active', filter.isActive);
      }

      const { data, error: queryError } = await query.order('permission_code');

      if (queryError) throw queryError;

      setPermissions((data || []) as PermissionWithResource[]);

    } catch (err) {
      handleError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [onlyActive, clearError, handleError]);

  // 创建权限资源
  const createResource = useCallback(async (data: PermissionResourceFormData): Promise<PermissionResource> => {
    try {
      clearError();
      
      // 验证资源代码唯一性
      const validation = await validateResourceCode(data.resource_code);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      const { data: newResource, error: createError } = await supabase
        .from('permission_resources')
        .insert([data])
        .select('*')
        .single();

      if (createError) throw createError;
      
      // 刷新数据
      await loadResources();
      
      return newResource as PermissionResource;
    } catch (err) {
      handleError(err as Error);
      throw err;
    }
  }, [clearError, handleError, loadResources]);

  // 更新权限资源
  const updateResource = useCallback(async (
    id: string, 
    data: Partial<PermissionResourceFormData>
  ): Promise<PermissionResource> => {
    try {
      clearError();

      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: updatedResource, error: updateError } = await supabase
        .from('permission_resources')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (updateError) throw updateError;
      
      // 刷新数据
      await loadResources();
      
      return updatedResource as PermissionResource;
    } catch (err) {
      handleError(err as Error);
      throw err;
    }
  }, [clearError, handleError, loadResources]);

  // 删除权限资源
  const deleteResource = useCallback(async (id: string): Promise<boolean> => {
    try {
      clearError();

      // 检查是否有子资源
      const { data: children, error: childrenError } = await supabase
        .from('permission_resources')
        .select('id')
        .eq('parent_id', id);

      if (childrenError) throw childrenError;

      if (children && children.length > 0) {
        throw new Error('无法删除包含子资源的资源，请先删除子资源');
      }

      // 检查是否有关联的权限
      const { data: permissions, error: permissionsError } = await supabase
        .from('permissions')
        .select('id')
        .eq('resource_id', id);

      if (permissionsError) throw permissionsError;

      if (permissions && permissions.length > 0) {
        throw new Error('无法删除包含权限定义的资源，请先删除相关权限');
      }

      const { error: deleteError } = await supabase
        .from('permission_resources')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      // 刷新数据
      await loadResources();
      
      return true;
    } catch (err) {
      handleError(err as Error);
      return false;
    }
  }, [clearError, handleError, loadResources]);

  // 创建权限
  const createPermission = useCallback(async (data: PermissionFormData): Promise<Permission> => {
    try {
      clearError();
      
      // 验证权限代码唯一性
      const validation = await validatePermissionCode(data.permission_code);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      const { data: newPermission, error: createError } = await supabase
        .from('permissions')
        .insert([data])
        .select('*')
        .single();

      if (createError) throw createError;
      
      // 刷新数据
      await loadPermissions();
      
      return newPermission as Permission;
    } catch (err) {
      handleError(err as Error);
      throw err;
    }
  }, [clearError, handleError, loadPermissions]);

  // 更新权限
  const updatePermission = useCallback(async (
    id: string, 
    data: Partial<PermissionFormData>
  ): Promise<Permission> => {
    try {
      clearError();

      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: updatedPermission, error: updateError } = await supabase
        .from('permissions')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (updateError) throw updateError;
      
      // 刷新数据
      await loadPermissions();
      
      return updatedPermission as Permission;
    } catch (err) {
      handleError(err as Error);
      throw err;
    }
  }, [clearError, handleError, loadPermissions]);

  // 删除权限
  const deletePermission = useCallback(async (id: string): Promise<boolean> => {
    try {
      clearError();

      const { error: deleteError } = await supabase
        .from('permissions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      // 刷新数据
      await loadPermissions();
      
      return true;
    } catch (err) {
      handleError(err as Error);
      return false;
    }
  }, [clearError, handleError, loadPermissions]);

  // 批量操作
  const batchOperation = useCallback(async (operation: BatchPermissionOperation): Promise<boolean> => {
    try {
      clearError();
      
      switch (operation.type) {
        case 'delete':
          if (operation.resourceIds) {
            await Promise.all(operation.resourceIds.map(id => deleteResource(id)));
          }
          if (operation.permissionIds) {
            await Promise.all(operation.permissionIds.map(id => deletePermission(id)));
          }
          break;
          
        case 'toggle_active':
          if (operation.resourceIds) {
            for (const id of operation.resourceIds) {
              const resource = resources.find(r => r.id === id);
              if (resource) {
                await updateResource(id, { is_active: !resource.is_active });
              }
            }
          }
          if (operation.permissionIds) {
            for (const id of operation.permissionIds) {
              const permission = permissions.find(p => p.id === id);
              if (permission) {
                await updatePermission(id, { is_active: !permission.is_active });
              }
            }
          }
          break;
          
        default:
          throw new Error(`不支持的批量操作类型: ${operation.type}`);
      }
      
      return true;
    } catch (err) {
      handleError(err as Error);
      return false;
    }
  }, [clearError, handleError, resources, permissions, deleteResource, deletePermission, updateResource, updatePermission]);

  // 查询方法
  const getResourceById = useCallback((id: string): PermissionResourceWithChildren | undefined => {
    return findResourceInTree(resources, id);
  }, [resources]);

  const getPermissionById = useCallback((id: string): PermissionWithResource | undefined => {
    return permissions.find(p => p.id === id);
  }, [permissions]);

  const getResourceByCode = useCallback((code: string): PermissionResourceWithChildren | undefined => {
    return findResourceInTreeByCode(resources, code);
  }, [resources]);

  const getPermissionByCode = useCallback((code: string): PermissionWithResource | undefined => {
    return permissions.find(p => p.permission_code === code);
  }, [permissions]);

  // 权限代码生成
  const generatePermissionCode = useCallback((resourceCode: string, actionType: Permission['action_type']): string => {
    return `${resourceCode}.${actionType}`;
  }, []);

  // 验证资源代码
  const validateResourceCode = useCallback(async (code: string): Promise<{ valid: boolean; message?: string }> => {
    if (!code) {
      return { valid: false, message: '资源代码不能为空' };
    }

    if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/.test(code)) {
      return { valid: false, message: '资源代码格式不正确，应使用小写字母、数字和点号，如：page.employee-management' };
    }

    const { data, error } = await supabase
      .from('permission_resources')
      .select('id')
      .eq('resource_code', code)
      .limit(1);

    if (error) {
      return { valid: false, message: '验证资源代码时出错' };
    }

    if (data && data.length > 0) {
      return { valid: false, message: '资源代码已存在' };
    }

    return { valid: true };
  }, []);

  // 验证权限代码
  const validatePermissionCode = useCallback(async (code: string): Promise<{ valid: boolean; message?: string }> => {
    if (!code) {
      return { valid: false, message: '权限代码不能为空' };
    }

    if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/.test(code)) {
      return { valid: false, message: '权限代码格式不正确，应使用小写字母、数字和点号，如：employee.view' };
    }

    const { data, error } = await supabase
      .from('permissions')
      .select('id')
      .eq('permission_code', code)
      .limit(1);

    if (error) {
      return { valid: false, message: '验证权限代码时出错' };
    }

    if (data && data.length > 0) {
      return { valid: false, message: '权限代码已存在' };
    }

    return { valid: true };
  }, []);

  // 刷新数据
  const refresh = useCallback(async () => {
    await Promise.all([
      loadResources(),
      loadPermissions()
    ]);
  }, [loadResources, loadPermissions]);

  // 初始化加载数据
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    // 数据状态
    resources,
    permissions,
    loading,
    error: error?.message || null,

    // CRUD 操作
    createResource,
    updateResource,
    deleteResource,
    createPermission,
    updatePermission,
    deletePermission,

    // 批量操作
    batchOperation,

    // 查询方法
    getResourceById,
    getPermissionById,
    getResourceByCode,
    getPermissionByCode,

    // 工具方法
    generatePermissionCode,
    validateResourceCode: validateResourceCode as (code: string) => { valid: boolean; message?: string },
    validatePermissionCode: validatePermissionCode as (code: string) => { valid: boolean; message?: string },

    // 刷新数据
    refresh
  };
}

// 辅助函数：构建资源树
function buildResourceTree(resources: any[]): PermissionResourceWithChildren[] {
  const resourceMap = new Map<string, PermissionResourceWithChildren>();
  const rootResources: PermissionResourceWithChildren[] = [];

  // 第一遍：创建所有节点
  resources.forEach(resource => {
    resourceMap.set(resource.id, { ...resource, children: [] });
  });

  // 第二遍：建立父子关系
  resources.forEach(resource => {
    const node = resourceMap.get(resource.id)!;
    
    if (resource.parent_id) {
      const parent = resourceMap.get(resource.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
        node.parent = parent;
      }
    } else {
      rootResources.push(node);
    }
  });

  return rootResources;
}

// 辅助函数：在树中查找资源
function findResourceInTree(resources: PermissionResourceWithChildren[], id: string): PermissionResourceWithChildren | undefined {
  for (const resource of resources) {
    if (resource.id === id) {
      return resource;
    }
    if (resource.children) {
      const found = findResourceInTree(resource.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

// 辅助函数：按代码在树中查找资源
function findResourceInTreeByCode(resources: PermissionResourceWithChildren[], code: string): PermissionResourceWithChildren | undefined {
  for (const resource of resources) {
    if (resource.resource_code === code) {
      return resource;
    }
    if (resource.children) {
      const found = findResourceInTreeByCode(resource.children, code);
      if (found) return found;
    }
  }
  return undefined;
}