/**
 * 权限管理页面 - 基于DaisyUI 5设计系统
 * 
 * 功能特性：
 * - 动态权限配置和管理
 * - 权限分组和分类展示
 * - 权限使用统计和分析
 * - 与角色管理页面一致的UI风格
 * - 完整的权限CRUD操作
 * 
 * 使用专用的useDynamicPermissions hook进行数据管理
 */

import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { useEffect } from 'react';
import { usePermission } from '@/hooks/permissions/usePermission';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { useDynamicPermissions, usePermissionSelection } from '@/hooks/permissions/useDynamicPermissions';
import { cardEffects } from '@/lib/utils';
import type { DynamicPermission } from '@/services/dynamicPermissionService';
import {
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChartBarSquareIcon,
  AdjustmentsHorizontalIcon,
  CogIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

// 懒加载组件
const PermissionCreateModal = React.lazy(() => import('@/components/admin/permissions/PermissionCreateModal'));
const PermissionEditModal = React.lazy(() => import('@/components/admin/permissions/PermissionEditModal'));
const PermissionDeleteModal = React.lazy(() => import('@/components/admin/permissions/PermissionDeleteModal'));

/**
 * 权限过滤器接口
 */
interface PermissionFilters {
  search: string;
  category: string;
  status: 'all' | 'active' | 'inactive';
  hasRoles: 'all' | 'with-roles' | 'without-roles';
}

/**
 * 权限分类常量
 */
const PERMISSION_CATEGORIES = {
  user_management: '用户管理',
  role_management: '角色管理', 
  employee_management: '员工管理',
  payroll_management: '薪资管理',
  system_management: '系统管理',
  data_access: '数据访问',
  other: '其他'
} as const;

/**
 * 权限管理页面主组件
 */
export default function PermissionManagementPage() {
  const { user: currentUser } = useUnifiedAuth();
  
  // 权限检查
  const permission = usePermission({
    enableCache: true,
    watchChanges: true,
    fallbackResult: false,
    throwOnError: false
  });

  // 使用动态权限加载hook
  const {
    permissions,
    filteredPermissions,
    loading: permissionLoading,
    error: permissionError,
    refreshPermissions,
    searchPermissions,
    filterByCategory,
    stats: permissionStats
  } = useDynamicPermissions({
    autoLoad: true,
    enableCache: true,
    watchChanges: true,
    onError: (error) => {
      console.error('[PermissionManagementPage] Hook error:', error);
    }
  });

  // 权限选择管理
  const {
    selectedPermissions: selectedPermissionCodes,
    selectedCount,
    togglePermission,
    toggleAllPermissions,
    clearSelection,
    isSelected,
    setSelectedPermissions
  } = usePermissionSelection();

  // 页面状态
  const [filters, setFilters] = useState<PermissionFilters>({
    search: '',
    category: 'all',
    status: 'all',
    hasRoles: 'all'
  });
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'categories' | 'statistics'>('list');

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<DynamicPermission | null>(null);
  const [deletingPermissions, setDeletingPermissions] = useState<DynamicPermission[]>([]);

  /**
   * 搜索防抖处理 - 与hook集成
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      searchPermissions(searchInput);
      setFilters(prev => ({ ...prev, search: searchInput }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, searchPermissions]);

  /**
   * 应用额外过滤器（hook未处理的）
   */
  const finalFilteredPermissions = useMemo(() => {
    let filtered = filteredPermissions;

    // 角色关联过滤
    if (filters.hasRoles === 'with-roles') {
      filtered = filtered.filter(perm => perm.usedByRoles.length > 0);
    } else if (filters.hasRoles === 'without-roles') {
      filtered = filtered.filter(perm => perm.usedByRoles.length === 0);
    }

    // 分类过滤 - 触发hook的filterByCategory
    if (filters.category !== 'all') {
      filterByCategory(filters.category);
    }

    return filtered.sort((a, b) => {
      // 按分类和权限代码排序
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.code.localeCompare(b.code);
    });
  }, [filteredPermissions, filters, filterByCategory]);

  /**
   * 权限分类统计
   */
  const categoryStats = useMemo(() => {
    const stats = new Map<string, { count: number; withRoles: number; withoutRoles: number }>();
    
    finalFilteredPermissions.forEach(perm => {
      const category = perm.category || 'other';
      const current = stats.get(category) || { count: 0, withRoles: 0, withoutRoles: 0 };
      
      current.count++;
      if (perm.usedByRoles.length > 0) {
        current.withRoles++;
      } else {
        current.withoutRoles++;
      }
      
      stats.set(category, current);
    });
    
    return stats;
  }, [finalFilteredPermissions]);

  /**
   * 总体权限统计 - 使用hook提供的统计数据
   */
  const overallStats = useMemo(() => {
    const total = permissions.length;
    const withRoles = permissions.filter(p => p.usedByRoles.length > 0).length;
    const categoriesCount = new Set(permissions.map(p => p.category)).size;
    const totalRoles = new Set(
      permissions.flatMap(p => p.usedByRoles)
    ).size;

    return {
      total,
      withRoles,
      withoutRoles: total - withRoles,
      categories: categoriesCount,
      totalRoles,
      systemPermissions: permissionStats.systemPermissions,
      mostUsedPermissions: permissionStats.mostUsedPermissions
    };
  }, [permissions, permissionStats]);

  /**
   * 处理权限选择 - 使用hook
   */
  const handlePermissionSelect = useCallback((permissionCode: string, selected: boolean) => {
    togglePermission(permissionCode);
  }, [togglePermission]);

  /**
   * 全选/取消全选 - 使用hook
   */
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      toggleAllPermissions(finalFilteredPermissions, true);
    } else {
      clearSelection();
    }
  }, [finalFilteredPermissions, toggleAllPermissions, clearSelection]);

  /**
   * 处理权限编辑
   */
  const handleEditPermission = useCallback((permission: DynamicPermission) => {
    setEditingPermission(permission);
    setShowEditModal(true);
  }, []);

  /**
   * 处理权限删除
   */
  const handleDeletePermissions = useCallback((permissions: DynamicPermission[]) => {
    setDeletingPermissions(permissions);
    setShowDeleteModal(true);
  }, []);

  /**
   * 刷新权限数据 - 使用hook
   */
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    clearSelection();
    
    try {
      await refreshPermissions();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('刷新失败'));
    } finally {
      setIsLoading(false);
    }
  }, [refreshPermissions, clearSelection]);

  /**
   * 加载状态
   */
  if (isLoading || permissionLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/70">正在加载权限数据...</p>
        </div>
      </div>
    );
  }

  /**
   * 错误状态
   */
  if (error || permissionError) {
    const displayError = error || permissionError;
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-error mb-4" />
          <h2 className="text-2xl font-bold mb-2">权限数据加载失败</h2>
          <p className="text-base-content/70 mb-6">
            {displayError?.message || '未知错误'}
          </p>
          <div className="flex justify-center gap-4">
            <button 
              className="btn btn-primary"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              重试
            </button>
            <button 
              className="btn btn-ghost"
              onClick={() => window.history.back()}
            >
              返回上一页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* 页面头部 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShieldCheckIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">权限管理</h1>
                <p className="text-base-content/70">管理系统权限配置和分配</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* 视图切换 */}
              <div className="join">
                <button
                  className={`btn join-item btn-sm ${activeView === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveView('list')}
                >
                  <EyeIcon className="w-4 h-4 mr-1" />
                  列表
                </button>
                <button
                  className={`btn join-item btn-sm ${activeView === 'categories' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveView('categories')}
                >
                  <AdjustmentsHorizontalIcon className="w-4 h-4 mr-1" />
                  分类
                </button>
                <button
                  className={`btn join-item btn-sm ${activeView === 'statistics' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveView('statistics')}
                >
                  <ChartBarSquareIcon className="w-4 h-4 mr-1" />
                  统计
                </button>
              </div>

              {/* 操作按钮 */}
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowCreateModal(true)}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                新建权限
              </button>

              <button
                className="btn btn-ghost btn-sm"
                onClick={handleRefresh}
                disabled={isLoading || permissionLoading}
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 权限统计概览 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="stat bg-base-200/50 rounded-lg">
              <div className="stat-title text-xs">总权限数</div>
              <div className="stat-value text-lg text-primary">{overallStats.total}</div>
            </div>
            <div className="stat bg-base-200/50 rounded-lg">
              <div className="stat-title text-xs">已分配</div>
              <div className="stat-value text-lg text-success">{overallStats.withRoles}</div>
            </div>
            <div className="stat bg-base-200/50 rounded-lg">
              <div className="stat-title text-xs">未分配</div>
              <div className="stat-value text-lg text-warning">{overallStats.withoutRoles}</div>
            </div>
            <div className="stat bg-base-200/50 rounded-lg">
              <div className="stat-title text-xs">权限分类</div>
              <div className="stat-value text-lg text-info">{overallStats.categories}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和过滤工具栏 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
              <input
                type="text"
                placeholder="搜索权限代码、名称或描述..."
                className="input input-bordered w-full pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            {/* 分类筛选 */}
            <select
              className="select select-bordered w-full md:w-auto"
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="all">所有分类</option>
              {Object.entries(PERMISSION_CATEGORIES).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>

            {/* 角色关联筛选 */}
            <select
              className="select select-bordered w-full md:w-auto"
              value={filters.hasRoles}
              onChange={(e) => setFilters(prev => ({ ...prev, hasRoles: e.target.value as any }))}
            >
              <option value="all">所有权限</option>
              <option value="with-roles">已分配角色</option>
              <option value="without-roles">未分配角色</option>
            </select>

            {/* 高级筛选按钮 */}
            <button className="btn btn-ghost">
              <FunnelIcon className="w-4 h-4 mr-2" />
              筛选
            </button>
          </div>

          {/* 搜索结果统计 */}
          {(filters.search || filters.category !== 'all' || filters.hasRoles !== 'all') && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-base-300">
              <span className="text-sm text-base-content/70">
                找到 {finalFilteredPermissions.length} 个权限
                {filters.search && ` (搜索: "${filters.search}")`}
              </span>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setFilters({
                    search: '',
                    category: 'all',
                    status: 'all',
                    hasRoles: 'all'
                  });
                  setSearchInput('');
                }}
              >
                清除筛选
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 批量操作工具栏 */}
      {selectedCount > 0 && (
        <div className="card bg-base-100 shadow-sm border-l-4 border-l-primary">
          <div className="card-body py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                已选择 {selectedCount} 个权限
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-error btn-sm"
                  onClick={() => {
                    const selectedPerms = finalFilteredPermissions.filter(p => 
                      isSelected(p.code)
                    );
                    handleDeletePermissions(selectedPerms);
                  }}
                >
                  <TrashIcon className="w-4 h-4 mr-1" />
                  批量删除
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={clearSelection}
                >
                  取消选择
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主内容区域 - 根据activeView显示不同内容 */}
      <div className="space-y-6">
        {activeView === 'list' && (
          <PermissionListView
            permissions={finalFilteredPermissions}
            selectedPermissions={new Set(selectedPermissionCodes)}
            onPermissionSelect={handlePermissionSelect}
            onSelectAll={handleSelectAll}
            onEditPermission={handleEditPermission}
            onDeletePermissions={handleDeletePermissions}
          />
        )}

        {activeView === 'categories' && (
          <PermissionCategoryView
            categoryStats={categoryStats}
            permissions={finalFilteredPermissions}
            onEditPermission={handleEditPermission}
          />
        )}

        {activeView === 'statistics' && (
          <PermissionStatisticsView
            permissions={permissions}
            stats={overallStats}
            categoryStats={categoryStats}
          />
        )}
      </div>

      {/* 模态框 */}
      <Suspense fallback={<div className="loading loading-spinner" />}>
        {showCreateModal && (
          <PermissionCreateModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              handleRefresh();
            }}
          />
        )}

        {showEditModal && editingPermission && (
          <PermissionEditModal
            isOpen={showEditModal}
            permission={editingPermission}
            onClose={() => {
              setShowEditModal(false);
              setEditingPermission(null);
            }}
            onSuccess={() => {
              setShowEditModal(false);
              setEditingPermission(null);
              handleRefresh();
            }}
          />
        )}

        {showDeleteModal && deletingPermissions.length > 0 && (
          <PermissionDeleteModal
            isOpen={showDeleteModal}
            permissions={deletingPermissions}
            onClose={() => {
              setShowDeleteModal(false);
              setDeletingPermissions([]);
            }}
            onSuccess={() => {
              setShowDeleteModal(false);
              setDeletingPermissions([]);
              clearSelection();
              handleRefresh();
            }}
          />
        )}
      </Suspense>
    </div>
  );
}

/**
 * 权限列表视图组件
 */
interface PermissionListViewProps {
  permissions: DynamicPermission[];
  selectedPermissions: Set<string>;
  onPermissionSelect: (permissionCode: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEditPermission: (permission: DynamicPermission) => void;
  onDeletePermissions: (permissions: DynamicPermission[]) => void;
}

function PermissionListView({ 
  permissions, 
  selectedPermissions,
  onPermissionSelect,
  onSelectAll,
  onEditPermission,
  onDeletePermissions
}: PermissionListViewProps) {
  const isAllSelected = permissions.length > 0 && permissions.every(p => selectedPermissions.has(p.code));
  const isPartialSelected = permissions.some(p => selectedPermissions.has(p.code)) && !isAllSelected;

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-0">
        {/* 表头 */}
        <div className="flex items-center gap-4 p-4 border-b border-base-300">
          <label className="label cursor-pointer">
            <input
              type="checkbox"
              className={`checkbox checkbox-sm ${isPartialSelected ? 'checkbox-primary' : ''}`}
              checked={isAllSelected}
              ref={(input) => {
                if (input) input.indeterminate = isPartialSelected;
              }}
              onChange={(e) => onSelectAll(e.target.checked)}
            />
          </label>
          <div className="flex-1 grid grid-cols-12 gap-4 text-sm font-medium text-base-content/70">
            <div className="col-span-3">权限信息</div>
            <div className="col-span-2">分类</div>
            <div className="col-span-3">关联角色</div>
            <div className="col-span-2">状态</div>
            <div className="col-span-2 text-right">操作</div>
          </div>
        </div>

        {/* 权限列表 */}
        <div className="divide-y divide-base-200">
          {permissions.length === 0 ? (
            <div className="p-8 text-center text-base-content/50">
              <ShieldCheckIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>没有找到匹配的权限</p>
            </div>
          ) : (
            permissions.map((permission) => (
              <PermissionListItem
                key={permission.code}
                permission={permission}
                selected={selectedPermissions.has(permission.code)}
                onSelect={onPermissionSelect}
                onEdit={onEditPermission}
                onDelete={() => onDeletePermissions([permission])}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 权限列表项组件
 */
interface PermissionListItemProps {
  permission: DynamicPermission;
  selected: boolean;
  onSelect: (permissionCode: string, selected: boolean) => void;
  onEdit: (permission: DynamicPermission) => void;
  onDelete: () => void;
}

function PermissionListItem({ permission, selected, onSelect, onEdit, onDelete }: PermissionListItemProps) {
  return (
    <div className={`flex items-center gap-4 p-4 hover:bg-base-200/50 transition-colors ${selected ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
      <label className="label cursor-pointer">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={selected}
          onChange={(e) => onSelect(permission.code, e.target.checked)}
        />
      </label>

      <div className="flex-1 grid grid-cols-12 gap-4">
        {/* 权限信息 */}
        <div className="col-span-3">
          <div className="font-medium text-sm">{permission.name}</div>
          <div className="text-xs text-base-content/60 font-mono">{permission.code}</div>
          {permission.description && (
            <div className="text-xs text-base-content/50 mt-1">{permission.description}</div>
          )}
        </div>

        {/* 分类 */}
        <div className="col-span-2">
          <span className="badge badge-outline badge-sm">
            {PERMISSION_CATEGORIES[permission.category as keyof typeof PERMISSION_CATEGORIES] || permission.category}
          </span>
        </div>

        {/* 关联角色 */}
        <div className="col-span-3">
          {permission.usedByRoles.length === 0 ? (
            <span className="text-xs text-base-content/40">未分配</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {permission.usedByRoles.slice(0, 2).map(role => (
                <span key={role} className="badge badge-primary badge-xs">{role}</span>
              ))}
              {permission.usedByRoles.length > 2 && (
                <span className="badge badge-ghost badge-xs">+{permission.usedByRoles.length - 2}</span>
              )}
            </div>
          )}
        </div>

        {/* 状态 */}
        <div className="col-span-2">
          <span className="badge badge-success badge-sm">
            <div className="w-1 h-1 bg-current rounded-full mr-1"></div>
            正常
          </span>
        </div>

        {/* 操作 */}
        <div className="col-span-2 flex justify-end gap-1">
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => onEdit(permission)}
            title="编辑权限"
          >
            <PencilIcon className="w-3 h-3" />
          </button>
          <button
            className="btn btn-ghost btn-xs text-error hover:bg-error/10"
            onClick={onDelete}
            title="删除权限"
          >
            <TrashIcon className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 权限分类视图组件
 */
interface PermissionCategoryViewProps {
  categoryStats: Map<string, { count: number; withRoles: number; withoutRoles: number }>;
  permissions: DynamicPermission[];
  onEditPermission: (permission: DynamicPermission) => void;
}

function PermissionCategoryView({ categoryStats, permissions, onEditPermission }: PermissionCategoryViewProps) {
  return (
    <div className="grid gap-6">
      {Array.from(categoryStats.entries()).map(([category, stats]) => {
        const categoryPermissions = permissions.filter(p => (p.category || 'other') === category);
        const categoryName = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] || category;

        return (
          <div key={category} className="card bg-base-100 shadow-sm">
            <div className="card-body">
              {/* 分类头部 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <AdjustmentsHorizontalIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{categoryName}</h3>
                    <p className="text-sm text-base-content/60">{stats.count} 个权限</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-base-content/50">已分配/未分配</div>
                    <div className="text-sm font-medium">
                      <span className="text-success">{stats.withRoles}</span>
                      <span className="text-base-content/30 mx-1">/</span>
                      <span className="text-warning">{stats.withoutRoles}</span>
                    </div>
                  </div>
                  
                  <div className="radial-progress text-primary text-xs" style={{"--value": Math.round((stats.withRoles / stats.count) * 100)} as any}>
                    {Math.round((stats.withRoles / stats.count) * 100)}%
                  </div>
                </div>
              </div>

              {/* 权限列表 */}
              <div className="grid md:grid-cols-2 gap-3">
                {categoryPermissions.map(permission => (
                  <div key={permission.code} className="p-3 rounded-lg bg-base-200/30 hover:bg-base-200/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{permission.name}</div>
                        <div className="text-xs text-base-content/50 font-mono truncate">{permission.code}</div>
                        {permission.usedByRoles.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <UserGroupIcon className="w-3 h-3 text-base-content/40" />
                            <span className="text-xs text-base-content/60">
                              {permission.usedByRoles.length} 个角色使用
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        className="btn btn-ghost btn-xs ml-2"
                        onClick={() => onEditPermission(permission)}
                      >
                        <PencilIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 权限统计视图组件
 */
interface PermissionStatisticsViewProps {
  permissions: DynamicPermission[];
  stats: {
    total: number;
    withRoles: number;
    withoutRoles: number;
    categories: number;
    totalRoles: number;
  };
  categoryStats: Map<string, { count: number; withRoles: number; withoutRoles: number }>;
}

function PermissionStatisticsView({ permissions, stats, categoryStats }: PermissionStatisticsViewProps) {
  return (
    <div className="space-y-6">
      {/* 总体统计 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ChartBarSquareIcon className="w-5 h-5" />
            权限总览统计
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="stat bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg">
              <div className="stat-title">总权限数</div>
              <div className="stat-value text-primary">{stats.total}</div>
              <div className="stat-desc">系统权限总数</div>
            </div>
            
            <div className="stat bg-gradient-to-br from-success/10 to-success/20 rounded-lg">
              <div className="stat-title">已分配</div>
              <div className="stat-value text-success">{stats.withRoles}</div>
              <div className="stat-desc">{Math.round((stats.withRoles / stats.total) * 100)}% 已使用</div>
            </div>
            
            <div className="stat bg-gradient-to-br from-warning/10 to-warning/20 rounded-lg">
              <div className="stat-title">未分配</div>
              <div className="stat-value text-warning">{stats.withoutRoles}</div>
              <div className="stat-desc">{Math.round((stats.withoutRoles / stats.total) * 100)}% 闲置</div>
            </div>
            
            <div className="stat bg-gradient-to-br from-info/10 to-info/20 rounded-lg">
              <div className="stat-title">权限分类</div>
              <div className="stat-value text-info">{stats.categories}</div>
              <div className="stat-desc">个权限分类</div>
            </div>
            
            <div className="stat bg-gradient-to-br from-secondary/10 to-secondary/20 rounded-lg">
              <div className="stat-title">关联角色</div>
              <div className="stat-value text-secondary">{stats.totalRoles}</div>
              <div className="stat-desc">个系统角色</div>
            </div>
          </div>
        </div>
      </div>

      {/* 分类统计图表 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="text-lg font-semibold mb-4">分类统计详情</h3>
          
          <div className="space-y-4">
            {Array.from(categoryStats.entries()).map(([category, categoryData]) => {
              const categoryName = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] || category;
              const usageRate = Math.round((categoryData.withRoles / categoryData.count) * 100);
              
              return (
                <div key={category} className="flex items-center gap-4 p-4 rounded-lg bg-base-200/30">
                  <div className="w-16 text-center">
                    <div className="text-lg font-bold">{categoryData.count}</div>
                    <div className="text-xs text-base-content/50">权限</div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{categoryName}</span>
                      <span className="text-sm text-base-content/60">{usageRate}% 使用率</span>
                    </div>
                    
                    <div className="flex gap-1">
                      <div className="flex-1 bg-base-300 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-success to-success/80 transition-all duration-300"
                          style={{ width: `${usageRate}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-base-content/50 w-12 text-right">
                        {categoryData.withRoles}/{categoryData.count}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm">
                      <span className="text-success font-medium">{categoryData.withRoles}</span>
                      <span className="text-base-content/30 mx-1">/</span>
                      <span className="text-warning">{categoryData.withoutRoles}</span>
                    </div>
                    <div className="text-xs text-base-content/50">已分配/未分配</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 权限使用趋势 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="text-lg font-semibold mb-4">权限使用分布</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* 按角色数量分布 */}
            <div>
              <h4 className="font-medium mb-3 text-base-content/80">按关联角色数量分布</h4>
              {(() => {
                const distribution = new Map<number, number>();
                permissions.forEach(perm => {
                  const roleCount = perm.usedByRoles.length;
                  distribution.set(roleCount, (distribution.get(roleCount) || 0) + 1);
                });
                
                return Array.from(distribution.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([roleCount, permCount]) => (
                    <div key={roleCount} className="flex items-center justify-between py-2">
                      <span className="text-sm">
                        {roleCount === 0 ? '未分配' : `${roleCount} 个角色`}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-base-300 rounded-full h-1">
                          <div 
                            className={`h-full rounded-full ${roleCount === 0 ? 'bg-warning' : 'bg-primary'}`}
                            style={{ width: `${(permCount / stats.total) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{permCount}</span>
                      </div>
                    </div>
                  ));
              })()}
            </div>

            {/* 权限代码格式分析 */}
            <div>
              <h4 className="font-medium mb-3 text-base-content/80">权限代码格式分布</h4>
              {(() => {
                const formats = {
                  'resource.action': permissions.filter(p => p.code.includes('.') && p.code.split('.').length === 2).length,
                  'standalone': permissions.filter(p => !p.code.includes('.') || p.code.split('.').length !== 2).length,
                };
                
                return Object.entries(formats).map(([format, count]) => (
                  <div key={format} className="flex items-center justify-between py-2">
                    <span className="text-sm">
                      {format === 'resource.action' ? '标准格式' : '独立权限'}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-base-300 rounded-full h-1">
                        <div 
                          className="h-full bg-info rounded-full"
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{count}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}