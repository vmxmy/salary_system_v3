/**
 * 权限资源列表组件
 * 
 * 提供权限资源的树形展示和基本操作功能
 */

import React, { useState, useMemo } from 'react';
import { useResourceTree } from '@/hooks/permissions/useResourceTree';
import { usePermissionResource } from '@/hooks/permissions/usePermissionResource';
import type { 
  PermissionResourceListProps, 
  PermissionResourceWithChildren,
  ResourceFilter 
} from '@/types/permission-resource';

export function PermissionResourceList({
  onResourceSelect,
  onResourceEdit,
  onResourceDelete,
  selectedResourceId,
  className = ''
}: PermissionResourceListProps) {
  // 状态管理
  const [filter, setFilter] = useState<ResourceFilter>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Hooks
  const { treeData, expandedKeys, expandNode, collapseNode, loading, error } = useResourceTree({
    includePermissions: true,
    sortBy: 'code'
  });
  
  const { resources, deleteResource, batchOperation } = usePermissionResource();

  // 过滤后的树形数据
  const filteredTreeData = useMemo(() => {
    if (!searchTerm && selectedType === 'all') {
      return treeData;
    }

    const filterTree = (nodes: typeof treeData): typeof treeData => {
      return nodes.filter(node => {
        const matchesSearch = !searchTerm || 
          node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.data.resource_code.toLowerCase().includes(searchTerm.toLowerCase());
          
        const matchesType = selectedType === 'all' || node.data.resource_type === selectedType;
        
        // 如果当前节点匹配，包含它及其所有子节点
        if (matchesSearch && matchesType) {
          return true;
        }
        
        // 如果当前节点不匹配，检查子节点
        if (node.children) {
          const filteredChildren = filterTree(node.children);
          if (filteredChildren.length > 0) {
            node.children = filteredChildren;
            return true;
          }
        }
        
        return false;
      });
    };

    return filterTree([...treeData]);
  }, [treeData, searchTerm, selectedType]);

  // 处理节点点击
  const handleNodeClick = (resource: PermissionResourceWithChildren) => {
    onResourceSelect?.(resource);
  };

  // 处理节点展开/折叠
  const handleNodeToggle = (resourceId: string, isExpanded: boolean) => {
    if (isExpanded) {
      collapseNode(resourceId);
    } else {
      expandNode(resourceId);
    }
  };

  // 处理编辑
  const handleEdit = (resource: PermissionResourceWithChildren, e: React.MouseEvent) => {
    e.stopPropagation();
    onResourceEdit?.(resource);
  };

  // 处理删除
  const handleDelete = async (resource: PermissionResourceWithChildren, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`确定要删除资源"${resource.resource_name}"吗？此操作不可撤销。`)) {
      return;
    }

    const success = await deleteResource(resource.id);
    if (success) {
      onResourceDelete?.(resource);
    }
  };

  // 渲染树节点
  const renderTreeNode = (node: typeof treeData[0], level: number = 0) => {
    const isExpanded = expandedKeys.includes(node.key);
    const isSelected = selectedResourceId === node.key;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.key} className="tree-node">
        <div 
          className={`
            flex items-center p-2 rounded-lg cursor-pointer transition-colors
            hover:bg-base-200 
            ${isSelected ? 'bg-primary/10 border border-primary/20' : ''}
          `}
          style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
          onClick={() => handleNodeClick(node.data as PermissionResourceWithChildren)}
        >
          {/* 展开/折叠图标 */}
          {hasChildren && (
            <button
              className="btn btn-ghost btn-xs mr-2 p-0 min-h-0 h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                handleNodeToggle(node.key, isExpanded);
              }}
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* 资源图标 */}
          <span className="mr-2 text-lg">{node.icon}</span>

          {/* 资源信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{node.label}</span>
              <div className="badge badge-sm badge-outline">
                {getResourceTypeLabel(node.data.resource_type)}
              </div>
              {!node.data.is_active && (
                <div className="badge badge-sm badge-error">已禁用</div>
              )}
            </div>
            <div className="text-xs text-base-content/60 truncate">
              {node.data.resource_code}
            </div>
          </div>

          {/* 权限数量 */}
          {(node.data as any).permissions && (
            <div className="badge badge-sm badge-info mr-2">
              {(node.data as any).permissions.length} 个权限
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="btn btn-ghost btn-xs"
              onClick={(e) => handleEdit(node.data as PermissionResourceWithChildren, e)}
              title="编辑"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              className="btn btn-ghost btn-xs text-error hover:bg-error/10"
              onClick={(e) => handleDelete(node.data as PermissionResourceWithChildren, e)}
              title="删除"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {node.children!.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>加载权限资源时出错: {error}</span>
      </div>
    );
  }

  return (
    <div className={`permission-resource-list ${className}`}>
      {/* 搜索和过滤栏 */}
      <div className="flex items-center gap-4 mb-4 p-4 bg-base-100 rounded-lg border">
        {/* 搜索输入 */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="搜索资源名称或代码..."
            className="input input-sm input-bordered w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 类型过滤 */}
        <select
          className="select select-sm select-bordered"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="all">所有类型</option>
          <option value="page">页面</option>
          <option value="action">操作</option>
          <option value="data">数据</option>
          <option value="api">接口</option>
          <option value="feature">功能</option>
        </select>

        {/* 统计信息 */}
        <div className="stats stats-horizontal stats-sm">
          <div className="stat">
            <div className="stat-title">总数</div>
            <div className="stat-value text-sm">{resources.length}</div>
          </div>
        </div>
      </div>

      {/* 资源树 */}
      <div className="bg-base-100 rounded-lg border min-h-96">
        {filteredTreeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-base-content/60">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium mb-2">暂无权限资源</p>
            <p className="text-sm">请创建第一个权限资源</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredTreeData.map(node => renderTreeNode(node))}
          </div>
        )}
      </div>
    </div>
  );
}

// 辅助函数：获取资源类型标签
function getResourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    page: '页面',
    action: '操作',
    data: '数据',
    api: '接口',
    feature: '功能'
  };
  return labels[type] || type;
}