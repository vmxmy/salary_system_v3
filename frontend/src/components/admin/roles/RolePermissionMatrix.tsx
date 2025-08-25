/**
 * 角色权限矩阵组件 - 管理角色的权限分配
 * 
 * 功能特性：
 * - 权限分组展示
 * - 批量权限操作
 * - 权限搜索和过滤
 * - 实时权限预览
 */

import React, { useState, useEffect, useMemo } from 'react';
import { usePermissions } from '@/hooks/permissions';
import { useDynamicPermissions, usePermissionSelection } from '@/hooks/permissions/useDynamicPermissions';
import type { DynamicPermission } from '@/services/dynamicPermissionService';

interface RoleData {
  id: string;
  code: string;
  name: string;
  description: string;
  level: number;
  color: string;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

// 使用动态权限类型，不再需要本地接口定义

interface RolePermissionMatrixProps {
  role: RoleData;
  onUpdatePermissions: (roleId: string, permissions: string[]) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

// 权限数据现在通过 useDynamicPermissions Hook 动态获取

export function RolePermissionMatrix({
  role,
  onUpdatePermissions,
  onClose,
  loading = false
}: RolePermissionMatrixProps) {
  const [saving, setSaving] = useState(false);

  // 使用动态权限Hook替代硬编码数据
  const dynamicPermissions = useDynamicPermissions({
    autoLoad: true,
    enableCache: true,
    watchChanges: true,
    onError: (error) => {
      console.error('[RolePermissionMatrix] 动态权限加载失败:', error);
    }
  });

  // 使用权限选择Hook管理权限状态
  const permissionSelection = usePermissionSelection(role.permissions);

  // 从动态权限Hook获取分类和过滤后的权限
  const permissionCategories = useMemo(() => {
    return dynamicPermissions.categories.map(cat => cat.name);
  }, [dynamicPermissions.categories]);

  // 按分组组织权限 - 使用动态权限数据
  const permissionsByCategory = useMemo(() => {
    const grouped: Record<string, DynamicPermission[]> = {};
    dynamicPermissions.filteredPermissions.forEach(permission => {
      if (!grouped[permission.category]) {
        grouped[permission.category] = [];
      }
      grouped[permission.category].push(permission);
    });
    return grouped;
  }, [dynamicPermissions.filteredPermissions]);

  // 检查权限是否被选中 - 委托给权限选择Hook
  const isPermissionSelected = (permissionCode: string) => {
    return permissionSelection.isSelected(permissionCode) || permissionSelection.isSelected('*');
  };

  // 切换单个权限 - 使用权限选择Hook
  const togglePermission = (permissionCode: string) => {
    if (permissionSelection.isSelected('*')) {
      // 如果有全部权限，不允许取消单个权限
      return;
    }
    permissionSelection.togglePermission(permissionCode);
  };

  // 切换分组权限 - 使用动态权限数据和权限选择Hook
  const toggleCategoryPermissions = (category: string, enable: boolean) => {
    const categoryData = dynamicPermissions.categories.find(cat => cat.name === category);
    if (categoryData) {
      permissionSelection.toggleCategoryPermissions(categoryData, enable);
    }
  };

  // 全选/取消全选 - 使用权限选择Hook
  const toggleAllPermissions = (enable: boolean) => {
    if (enable) {
      permissionSelection.setSelectedPermissions(['*']);
    } else {
      permissionSelection.clearSelection();
    }
  };

  // 保存权限配置 - 使用权限选择Hook的数据
  const handleSave = async () => {
    try {
      setSaving(true);
      const selectedPermissions = permissionSelection.getSelectedPermissions();
      await onUpdatePermissions(role.id, selectedPermissions);
      onClose();
    } catch (error) {
      console.error('保存权限失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // 计算选中状态统计 - 使用动态权限数据和权限选择Hook
  const selectionStats = useMemo(() => {
    const totalPermissions = dynamicPermissions.permissions.length;
    const selectedCount = permissionSelection.isSelected('*') ? totalPermissions : permissionSelection.selectedCount;
    
    return {
      total: totalPermissions,
      selected: selectedCount,
      percentage: totalPermissions > 0 ? Math.round((selectedCount / totalPermissions) * 100) : 0
    };
  }, [dynamicPermissions.permissions.length, permissionSelection.selectedCount, permissionSelection.isSelected]);

  // 显示加载状态
  if (dynamicPermissions.loading) {
    return (
      <div className="modal modal-open">
        <div className="modal-box w-11/12 max-w-4xl">
          <div className="flex flex-col items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
            <p className="text-base-content/70">正在加载权限数据...</p>
          </div>
        </div>
        <div className="modal-backdrop" onClick={onClose}></div>
      </div>
    );
  }

  // 显示错误状态
  if (dynamicPermissions.error) {
    return (
      <div className="modal modal-open">
        <div className="modal-box w-11/12 max-w-4xl">
          <div className="text-center py-12">
            <div className="text-error text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold mb-2">加载权限失败</h3>
            <p className="text-base-content/70 mb-6">{dynamicPermissions.error.message}</p>
            <div className="flex justify-center gap-4">
              <button 
                className="btn btn-primary"
                onClick={dynamicPermissions.refreshPermissions}
              >
                重试
              </button>
              <button 
                className="btn btn-ghost"
                onClick={onClose}
              >
                取消
              </button>
            </div>
          </div>
        </div>
        <div className="modal-backdrop" onClick={onClose}></div>
      </div>
    );
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-4xl max-h-[90vh]">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">权限分配</h2>
            <p className="text-sm text-base-content/70">
              为角色 <span className="font-medium text-primary">{role.name}</span> 分配权限
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
            disabled={saving}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat bg-primary/10 rounded-lg">
            <div className="stat-title text-primary">已选权限</div>
            <div className="stat-value text-primary text-2xl">{selectionStats.selected}</div>
          </div>
          <div className="stat bg-info/10 rounded-lg">
            <div className="stat-title text-info">总权限数</div>
            <div className="stat-value text-info text-2xl">{selectionStats.total}</div>
          </div>
          <div className="stat bg-success/10 rounded-lg">
            <div className="stat-title text-success">覆盖率</div>
            <div className="stat-value text-success text-2xl">{selectionStats.percentage}%</div>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="space-y-4 mb-6">
          {/* 搜索框 */}
          <div className="form-control">
            <div className="input-group">
              <span className="input-group-text">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="搜索权限..."
                className="input input-bordered flex-1"
                value={dynamicPermissions.searchQuery}
                onChange={(e) => dynamicPermissions.searchPermissions(e.target.value)}
              />
            </div>
          </div>
          
          {/* 过滤和操作区 */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="form-control flex-1">
              <select
                className="select select-bordered"
                value={dynamicPermissions.selectedCategory}
                onChange={(e) => dynamicPermissions.filterByCategory(e.target.value)}
              >
                <option value="all">全部分类</option>
                {permissionCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="join">
              <button
                onClick={() => toggleAllPermissions(true)}
                className="btn btn-sm btn-success join-item"
                disabled={saving}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                全选
              </button>
              <button
                onClick={() => toggleAllPermissions(false)}
                className="btn btn-sm btn-error join-item"
                disabled={saving}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                清空
              </button>
            </div>
          </div>
        </div>

        {/* 权限列表 */}
        <div className="max-h-96 overflow-y-auto border rounded-lg">
          {Object.entries(permissionsByCategory).map(([category, permissions]) => {
            const categoryPermissions = permissions.map(p => p.code);
            const selectedInCategory = categoryPermissions.filter(p => isPermissionSelected(p)).length;
            const isAllSelected = selectedInCategory === categoryPermissions.length;
            const isPartialSelected = selectedInCategory > 0 && selectedInCategory < categoryPermissions.length;

            return (
              <div key={category} className="collapse collapse-arrow border-b">
                <input type="checkbox" defaultChecked aria-label={`展开或折叠 ${category} 分组`} />
                <div className="collapse-title min-h-0 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <label className="label cursor-pointer p-0">
                        <input
                          type="checkbox"
                          className={`checkbox ${isPartialSelected ? 'checkbox-warning' : 'checkbox-primary'}`}
                          checked={isAllSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isPartialSelected;
                          }}
                          onChange={(e) => toggleCategoryPermissions(category, e.target.checked)}
                          disabled={saving}
                        />
                      </label>
                      <span className="font-medium text-base">{category}</span>
                    </div>
                    <span className="badge badge-sm">
                      {selectedInCategory} / {categoryPermissions.length}
                    </span>
                  </div>
                </div>
                <div className="collapse-content">
                  <div className="grid gap-2">
                    {permissions.map(permission => (
                      <label key={permission.id} className="label cursor-pointer justify-start py-3 px-2 hover:bg-base-200/50 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary mr-4"
                          checked={isPermissionSelected(permission.code)}
                          onChange={() => togglePermission(permission.code)}
                          disabled={saving || permissionSelection.isSelected('*')}
                          aria-describedby={`permission-desc-${permission.id}`}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{permission.name}</div>
                          <div id={`permission-desc-${permission.id}`} className="text-sm text-base-content/70">{permission.description}</div>
                          <div className="text-xs text-base-content/50 font-mono mt-1">{permission.code}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部按钮 */}
        <div className="modal-action">
          <button
            onClick={onClose}
            className="btn btn-ghost"
            disabled={saving}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                保存中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                保存权限配置
              </>
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}