/**
 * 资源树管理 Hook
 * 
 * 提供权限资源的树形结构管理和拖拽排序功能
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type {
  PermissionResource,
  ResourceTreeNode,
  UseResourceTreeOptions,
  UseResourceTreeReturn
} from '@/types/permission-resource';

export function useResourceTree(options: UseResourceTreeOptions = {}): UseResourceTreeReturn {
  const {
    rootOnly = false,
    includePermissions = false,
    sortBy = 'resource_code',
    sortOrder = 'asc'
  } = options;

  // 状态管理
  const [flatData, setFlatData] = useState<PermissionResource[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();
  
  const clearError = useCallback(() => setError(null), []);

  // 构建树形数据
  const treeData = useMemo(() => {
    if (!flatData.length) return [];
    
    const resourceMap = new Map<string, ResourceTreeNode>();
    const rootNodes: ResourceTreeNode[] = [];

    // 第一遍：创建所有节点
    flatData.forEach(resource => {
      const node: ResourceTreeNode = {
        key: resource.id,
        label: resource.resource_name,
        data: resource,
        children: [],
        isLeaf: false,
        icon: getResourceIcon(resource.resource_type)
      };
      resourceMap.set(resource.id, node);
    });

    // 第二遍：建立父子关系
    flatData.forEach(resource => {
      const node = resourceMap.get(resource.id)!;
      
      if (resource.parent_id && resourceMap.has(resource.parent_id)) {
        const parent = resourceMap.get(resource.parent_id)!;
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // 标记叶子节点并排序
    const sortNodes = (nodes: ResourceTreeNode[]) => {
      nodes.forEach(node => {
        if (!node.children || node.children.length === 0) {
          node.isLeaf = true;
        } else {
          node.isLeaf = false;
          sortNodes(node.children);
        }
      });

      // 排序节点
      nodes.sort((a, b) => {
        const aValue = getSortValue(a.data, sortBy);
        const bValue = getSortValue(b.data, sortBy);
        
        if (sortOrder === 'desc') {
          return bValue.localeCompare(aValue);
        }
        return aValue.localeCompare(bValue);
      });
    };

    sortNodes(rootNodes);
    
    return rootOnly ? rootNodes.filter(node => !node.data.parent_id) : rootNodes;
  }, [flatData, rootOnly, sortBy, sortOrder]);

  // 加载资源数据
  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      clearError();

      let query = supabase
        .from('permission_resources')
        .select(`
          *
          ${includePermissions ? ',permissions(*)' : ''}
        `)
        .eq('is_active', true);

      const { data, error: queryError } = await query.order(sortBy, { ascending: sortOrder === 'asc' });

      if (queryError) throw queryError;

      setFlatData((data || []) as PermissionResource[]);

    } catch (err) {
      handleError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [includePermissions, sortBy, sortOrder, clearError, handleError]);

  // 展开节点
  const expandNode = useCallback((key: string) => {
    setExpandedKeys(prev => [...new Set([...prev, key])]);
  }, []);

  // 折叠节点
  const collapseNode = useCallback((key: string) => {
    setExpandedKeys(prev => prev.filter(k => k !== key));
  }, []);

  // 选择节点
  const selectNode = useCallback((key: string) => {
    setSelectedKeys([key]);
  }, []);

  // 更新节点顺序（拖拽排序）
  const updateNodeOrder = useCallback(async (
    dragKey: string, 
    targetKey: string, 
    position: 'before' | 'after' | 'inside'
  ): Promise<boolean> => {
    try {
      clearError();

      const dragResource = flatData.find(r => r.id === dragKey);
      const targetResource = flatData.find(r => r.id === targetKey);

      if (!dragResource || !targetResource) {
        throw new Error('找不到拖拽或目标资源');
      }

      let newParentId = dragResource.parent_id;
      let newOrder = 0;

      switch (position) {
        case 'inside':
          // 拖拽到目标节点内部
          newParentId = targetKey;
          // 获取目标节点下子节点的最大顺序号
          const siblings = flatData.filter(r => r.parent_id === targetKey);
          newOrder = Math.max(0, ...siblings.map(s => s.metadata?.order || 0)) + 1;
          break;
          
        case 'before':
        case 'after':
          // 拖拽到目标节点前后
          newParentId = targetResource.parent_id;
          const targetOrder = targetResource.metadata?.order || 0;
          newOrder = position === 'before' ? targetOrder : targetOrder + 1;
          
          // 调整其他兄弟节点的顺序
          const affectedResources = flatData.filter(r => 
            r.parent_id === newParentId && 
            (r.metadata?.order || 0) >= newOrder &&
            r.id !== dragKey
          );
          
          for (const resource of affectedResources) {
            await supabase
              .from('permission_resources')
              .update({
                metadata: {
                  ...resource.metadata,
                  order: (resource.metadata?.order || 0) + 1
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', resource.id);
          }
          break;
      }

      // 更新拖拽的资源
      const { error: updateError } = await supabase
        .from('permission_resources')
        .update({
          parent_id: newParentId,
          metadata: {
            ...dragResource.metadata,
            order: newOrder
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', dragKey);

      if (updateError) throw updateError;

      // 刷新数据
      await loadResources();
      
      return true;
    } catch (err) {
      handleError(err as Error);
      return false;
    }
  }, [flatData, clearError, handleError, loadResources]);

  // 查找节点
  const findNode = useCallback((key: string): ResourceTreeNode | null => {
    const findInTree = (nodes: ResourceTreeNode[]): ResourceTreeNode | null => {
      for (const node of nodes) {
        if (node.key === key) {
          return node;
        }
        if (node.children) {
          const found = findInTree(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findInTree(treeData);
  }, [treeData]);

  // 获取节点路径
  const getNodePath = useCallback((key: string): ResourceTreeNode[] => {
    const path: ResourceTreeNode[] = [];
    
    const findPath = (nodes: ResourceTreeNode[], targetKey: string): boolean => {
      for (const node of nodes) {
        path.push(node);
        
        if (node.key === targetKey) {
          return true;
        }
        
        if (node.children && findPath(node.children, targetKey)) {
          return true;
        }
        
        path.pop();
      }
      return false;
    };

    findPath(treeData, key);
    return path;
  }, [treeData]);

  // 刷新数据
  const refresh = useCallback(async () => {
    await loadResources();
  }, [loadResources]);

  // 初始化加载数据
  useEffect(() => {
    loadResources();
  }, [loadResources]);

  // 自动展开根节点
  useEffect(() => {
    if (treeData.length > 0 && expandedKeys.length === 0) {
      const rootKeys = treeData.map(node => node.key);
      setExpandedKeys(rootKeys);
    }
  }, [treeData, expandedKeys.length]);

  return {
    // 树形数据
    treeData,
    flatData,
    loading,
    error: error?.message || null,

    // 树操作
    expandNode,
    collapseNode,
    selectNode,
    updateNodeOrder,

    // 状态
    expandedKeys,
    selectedKeys,

    // 工具方法
    findNode,
    getNodePath,

    // 刷新
    refresh
  };
}

// 辅助函数：获取资源图标
function getResourceIcon(resourceType: string): string {
  const iconMap: Record<string, string> = {
    page: '📄',
    action: '⚡',
    data: '💾',
    api: '🔌',
    feature: '✨'
  };
  return iconMap[resourceType] || '📁';
}

// 辅助函数：获取排序值
function getSortValue(resource: PermissionResource, sortBy: string): string {
  switch (sortBy) {
    case 'name':
      return resource.resource_name || '';
    case 'code':
      return resource.resource_code || '';
    case 'created_at':
      return resource.created_at || '';
    default:
      return resource.resource_code || '';
  }
}