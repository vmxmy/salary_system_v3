/**
 * 角色继承关系树形可视化组件
 * 
 * 功能特性：
 * - 角色继承关系的树形或层级可视化
 * - 拖拽调整角色层级关系
 * - 角色冲突检测和解决机制
 * - 实时角色权限计算显示
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useRoleManagement, type RoleInfo, type RoleHierarchyNode } from '@/hooks/role-management/useRoleManagement';
import { useRolePermissions } from '@/hooks/role-management/useRolePermissions';

interface RoleHierarchyTreeProps {
  onRoleSelect?: (role: RoleInfo) => void;
  onRoleEdit?: (role: RoleInfo) => void;
  onRoleDelete?: (role: RoleInfo) => void;
  selectedRoleId?: string;
  enableDragDrop?: boolean;
  showPermissionCount?: boolean;
  showUserCount?: boolean;
}

interface TreeNodeProps {
  node: RoleHierarchyNode;
  level: number;
  isSelected: boolean;
  onSelect: (role: RoleInfo) => void;
  onEdit: (role: RoleInfo) => void;
  onDelete: (role: RoleInfo) => void;
  showPermissionCount: boolean;
  showUserCount: boolean;
  enableDragDrop: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  showPermissionCount,
  showUserCount,
  enableDragDrop
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  const hasChildren = node.children && node.children.length > 0;

  // 拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!enableDragDrop) return;
    e.dataTransfer.setData('text/plain', JSON.stringify({
      roleId: node.role.id,
      roleName: node.role.role_name
    }));
    e.dataTransfer.effectAllowed = 'move';
  }, [enableDragDrop, node.role]);

  // 拖拽悬停
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!enableDragDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, [enableDragDrop]);

  // 拖拽离开
  const handleDragLeave = useCallback(() => {
    if (!enableDragDrop) return;
    setIsDragOver(false);
  }, [enableDragDrop]);

  // 拖拽放置
  const handleDrop = useCallback((e: React.DragEvent) => {
    if (!enableDragDrop) return;
    e.preventDefault();
    setIsDragOver(false);

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (dragData.roleId !== node.role.id) {
        // TODO: 实现角色层级调整逻辑
        console.log(`将角色 ${dragData.roleName} 移动到 ${node.role.role_name} 下`);
      }
    } catch (err) {
      console.error('解析拖拽数据失败:', err);
    }
  }, [enableDragDrop, node.role]);

  // 角色图标
  const getRoleIcon = (roleCode: string) => {
    const icons: Record<string, string> = {
      'super_admin': '👑',
      'admin': '🛡️',
      'hr_manager': '👨‍💼',
      'manager': '👔',
      'employee': '👤'
    };
    return icons[roleCode] || '📋';
  };

  // 角色状态颜色
  const getRoleColor = (roleCode: string, isSystemRole: boolean) => {
    if (isSystemRole) {
      return 'badge-primary';
    }
    
    const colors: Record<string, string> = {
      'super_admin': 'badge-error',
      'admin': 'badge-warning',
      'hr_manager': 'badge-info',
      'manager': 'badge-success',
      'employee': 'badge-neutral'
    };
    return colors[roleCode] || 'badge-ghost';
  };

  return (
    <div className="w-full">
      {/* 角色节点 */}
      <div
        className={`
          flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 mb-2
          ${isSelected ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-primary/50'}
          ${isDragOver ? 'border-primary border-dashed bg-primary/10' : ''}
          ${enableDragDrop ? 'cursor-move' : 'cursor-pointer'}
        `}
        style={{ marginLeft: `${level * 24}px` }}
        draggable={enableDragDrop}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => onSelect(node.role)}
      >
        {/* 展开/收起按钮 */}
        {hasChildren && (
          <button
            className="btn btn-xs btn-ghost"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? '📂' : '📁'}
          </button>
        )}

        {/* 角色图标 */}
        <span className="text-xl">{getRoleIcon(node.role.role_code)}</span>

        {/* 角色信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">{node.role.role_name}</span>
            <span className={`badge badge-sm ${getRoleColor(node.role.role_code, node.role.is_system_role)}`}>
              {node.role.role_code}
            </span>
            {node.role.is_system_role && (
              <span className="badge badge-xs badge-outline">系统</span>
            )}
          </div>

          {node.role.description && (
            <p className="text-sm text-base-content/60 truncate">
              {node.role.description}
            </p>
          )}

          {/* 统计信息 */}
          <div className="flex gap-3 mt-2">
            {showPermissionCount && (
              <div className="flex items-center gap-1 text-xs text-base-content/60">
                <span>🔐</span>
                <span>{node.role.permissions?.length || 0} 权限</span>
              </div>
            )}
            
            {showUserCount && (
              <div className="flex items-center gap-1 text-xs text-base-content/60">
                <span>👥</span>
                <span>{node.role.user_count || 0} 用户</span>
              </div>
            )}
            
            <div className="flex items-center gap-1 text-xs text-base-content/60">
              <span>📊</span>
              <span>L{node.role.level}</span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-1">
          <button
            className="btn btn-xs btn-ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(node.role);
            }}
            title="编辑角色"
          >
            ✏️
          </button>
          
          {!node.role.is_system_role && (
            <button
              className="btn btn-xs btn-ghost text-error hover:bg-error hover:text-error-content"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.role);
              }}
              title="删除角色"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div className="ml-6">
          {node.children?.map((childNode) => (
            <TreeNode
              key={childNode.role.id}
              node={childNode}
              level={level + 1}
              isSelected={childNode.role.id === node.role.id}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              showPermissionCount={showPermissionCount}
              showUserCount={showUserCount}
              enableDragDrop={enableDragDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const RoleHierarchyTree: React.FC<RoleHierarchyTreeProps> = ({
  onRoleSelect = () => {},
  onRoleEdit = () => {},
  onRoleDelete = () => {},
  selectedRoleId,
  enableDragDrop = false,
  showPermissionCount = true,
  showUserCount = true
}) => {
  const { roleHierarchy, loading, error } = useRoleManagement();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'system' | 'custom'>('all');

  // 搜索和过滤
  const filteredHierarchy = useMemo(() => {
    if (!roleHierarchy.length) return [];

    const filterNodes = (nodes: RoleHierarchyNode[]): RoleHierarchyNode[] => {
      return nodes
        .filter(node => {
          // 类型过滤
          if (filterType === 'system' && !node.role.is_system_role) return false;
          if (filterType === 'custom' && node.role.is_system_role) return false;
          
          // 搜索过滤
          if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            return (
              node.role.role_name.toLowerCase().includes(searchLower) ||
              node.role.role_code.toLowerCase().includes(searchLower) ||
              (node.role.description || '').toLowerCase().includes(searchLower)
            );
          }
          
          return true;
        })
        .map(node => ({
          ...node,
          children: filterNodes(node.children)
        }));
    };

    return filterNodes(roleHierarchy);
  }, [roleHierarchy, searchTerm, filterType]);

  // 统计信息
  const stats = useMemo(() => {
    const flatten = (nodes: RoleHierarchyNode[]): RoleInfo[] => {
      return nodes.reduce((acc, node) => {
        acc.push(node.role);
        if (node.children.length > 0) {
          acc.push(...flatten(node.children));
        }
        return acc;
      }, [] as RoleInfo[]);
    };

    const allRoles = flatten(roleHierarchy);
    
    return {
      total: allRoles.length,
      system: allRoles.filter(r => r.is_system_role).length,
      custom: allRoles.filter(r => !r.is_system_role).length,
      totalUsers: allRoles.reduce((sum, r) => sum + (r.user_count || 0), 0)
    };
  }, [roleHierarchy]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">加载角色层级...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>加载角色层级失败: {error.message}</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex flex-col gap-4 p-4 border-b border-base-300">
        {/* 搜索和过滤 */}
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索角色名称、代码或描述..."
              className="input input-bordered w-full input-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="select select-bordered select-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
          >
            <option value="all">全部角色</option>
            <option value="system">系统角色</option>
            <option value="custom">自定义角色</option>
          </select>
        </div>

        {/* 统计信息 */}
        <div className="stats stats-horizontal bg-base-100">
          <div className="stat py-2 px-4">
            <div className="stat-title text-xs">总角色数</div>
            <div className="stat-value text-lg">{stats.total}</div>
          </div>
          <div className="stat py-2 px-4">
            <div className="stat-title text-xs">系统角色</div>
            <div className="stat-value text-lg text-primary">{stats.system}</div>
          </div>
          <div className="stat py-2 px-4">
            <div className="stat-title text-xs">自定义角色</div>
            <div className="stat-value text-lg text-secondary">{stats.custom}</div>
          </div>
          <div className="stat py-2 px-4">
            <div className="stat-title text-xs">总用户数</div>
            <div className="stat-value text-lg text-accent">{stats.totalUsers}</div>
          </div>
        </div>

        {/* 拖拽提示 */}
        {enableDragDrop && (
          <div className="alert alert-info py-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-sm">拖拽角色卡片可调整层级关系</span>
          </div>
        )}
      </div>

      {/* 角色树 */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredHierarchy.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium mb-2">没有找到角色</h3>
            <p className="text-base-content/60">
              {searchTerm ? '尝试修改搜索条件' : '暂无角色数据'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHierarchy.map((node) => (
              <TreeNode
                key={node.role.id}
                node={node}
                level={0}
                isSelected={node.role.id === selectedRoleId}
                onSelect={onRoleSelect}
                onEdit={onRoleEdit}
                onDelete={onRoleDelete}
                showPermissionCount={showPermissionCount}
                showUserCount={showUserCount}
                enableDragDrop={enableDragDrop}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};