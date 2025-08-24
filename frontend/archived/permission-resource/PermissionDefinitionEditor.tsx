/**
 * 权限定义编辑器组件
 * 
 * 为指定资源管理权限定义，支持批量操作和模板应用
 */

import React, { useState, useEffect, useMemo } from 'react';
import { usePermissionDefinition } from '@/hooks/permissions/usePermissionDefinition';
import { usePermissionResource } from '@/hooks/permissions/usePermissionResource';
import { PermissionCodeGenerator } from './PermissionCodeGenerator';
import type { 
  PermissionDefinitionEditorProps, 
  PermissionWithResource,
  Permission 
} from '@/types/permission-resource';

export function PermissionDefinitionEditor({
  resourceId,
  permissions: externalPermissions,
  onPermissionUpdate,
  onPermissionCreate,
  onPermissionDelete,
  readonly = false,
  className = ''
}: PermissionDefinitionEditorProps) {
  // 状态管理
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [editingPermission, setEditingPermission] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    permission_name: '',
    description: '',
    is_active: true
  });
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    action_type: 'view' as Permission['action_type'],
    permission_name: '',
    description: '',
    auto_generate_code: true
  });

  // Hooks
  const { 
    createPermissions, 
    bulkUpdatePermissions, 
    getAvailableActions,
    loading: definitionLoading 
  } = usePermissionDefinition();
  
  const { 
    getResourceById, 
    createPermission,
    updatePermission,
    deletePermission,
    generatePermissionCode,
    loading: resourceLoading 
  } = usePermissionResource();

  // 获取当前资源信息
  const currentResource = useMemo(() => {
    return getResourceById(resourceId);
  }, [resourceId, getResourceById]);

  // 使用外部传入的权限或从全局获取
  const resourcePermissions = useMemo(() => {
    return externalPermissions || 
      (currentResource?.permissions as PermissionWithResource[]) || [];
  }, [externalPermissions, currentResource]);

  // 获取可用的操作类型
  const availableActions = useMemo(() => {
    if (!currentResource) return [];
    return getAvailableActions(currentResource.resource_type);
  }, [currentResource, getAvailableActions]);

  // 获取已存在的操作类型
  const existingActions = useMemo(() => {
    return new Set(resourcePermissions.map(p => p.action_type));
  }, [resourcePermissions]);

  // 可创建的操作类型
  const creatableActions = useMemo(() => {
    return availableActions.filter(action => !existingActions.has(action));
  }, [availableActions, existingActions]);

  // 处理权限选择
  const handlePermissionSelect = (permissionId: string, selected: boolean) => {
    setSelectedPermissions(prev => {
      if (selected) {
        return [...prev, permissionId];
      } else {
        return prev.filter(id => id !== permissionId);
      }
    });
  };

  // 处理全选
  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedPermissions(resourcePermissions.map(p => p.id));
    } else {
      setSelectedPermissions([]);
    }
  };

  // 开始编辑权限
  const startEdit = (permission: PermissionWithResource) => {
    setEditingPermission(permission.id);
    setEditForm({
      permission_name: permission.permission_name,
      description: permission.description || '',
      is_active: permission.is_active
    });
  };

  // 保存编辑
  const saveEdit = async () => {
    if (!editingPermission) return;

    try {
      const updatedPermission = await updatePermission(editingPermission, editForm);
      onPermissionUpdate?.(updatedPermission as PermissionWithResource);
      setEditingPermission(null);
    } catch (error) {
      console.error('更新权限失败:', error);
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingPermission(null);
    setEditForm({ permission_name: '', description: '', is_active: true });
  };

  // 删除权限
  const handleDelete = async (permissionId: string) => {
    const permission = resourcePermissions.find(p => p.id === permissionId);
    if (!permission) return;

    if (!confirm(`确定要删除权限"${permission.permission_name}"吗？`)) {
      return;
    }

    try {
      await deletePermission(permissionId);
      onPermissionDelete?.(permissionId);
    } catch (error) {
      console.error('删除权限失败:', error);
    }
  };

  // 批量操作
  const handleBatchAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedPermissions.length === 0) {
      alert('请先选择要操作的权限');
      return;
    }

    try {
      switch (action) {
        case 'activate':
        case 'deactivate':
          const isActive = action === 'activate';
          const updates = selectedPermissions.map(id => ({
            id,
            data: { is_active: isActive }
          }));
          await bulkUpdatePermissions(updates);
          break;

        case 'delete':
          if (!confirm(`确定要删除选中的 ${selectedPermissions.length} 个权限吗？`)) {
            return;
          }
          await Promise.all(selectedPermissions.map(id => deletePermission(id)));
          break;
      }

      setSelectedPermissions([]);
      setShowBatchActions(false);
    } catch (error) {
      console.error('批量操作失败:', error);
    }
  };

  // 创建新权限
  const handleCreate = async () => {
    if (!currentResource) return;

    try {
      const permissionCode = createForm.auto_generate_code 
        ? generatePermissionCode(currentResource.resource_code, createForm.action_type)
        : `${currentResource.resource_code}.${createForm.action_type}`;

      const newPermission = await createPermission({
        permission_code: permissionCode,
        permission_name: createForm.permission_name || `${currentResource.resource_name} - ${getActionDisplayName(createForm.action_type)}`,
        resource_id: resourceId,
        action_type: createForm.action_type,
        description: createForm.description,
        is_active: true
      });

      onPermissionCreate?.(newPermission);
      setShowCreateForm(false);
      setCreateForm({
        action_type: 'view',
        permission_name: '',
        description: '',
        auto_generate_code: true
      });
    } catch (error) {
      console.error('创建权限失败:', error);
    }
  };

  // 快速创建所有可用权限
  const createAllPermissions = async () => {
    if (creatableActions.length === 0) {
      alert('没有可创建的权限类型');
      return;
    }

    if (!confirm(`确定要为当前资源创建 ${creatableActions.length} 个权限吗？`)) {
      return;
    }

    try {
      const newPermissions = await createPermissions(resourceId, creatableActions);
      newPermissions.forEach(permission => {
        onPermissionCreate?.(permission);
      });
    } catch (error) {
      console.error('批量创建权限失败:', error);
    }
  };

  const loading = definitionLoading || resourceLoading;

  if (!currentResource) {
    return (
      <div className={`permission-definition-editor ${className}`}>
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>请选择一个资源来管理其权限定义</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`permission-definition-editor ${className}`}>
      {/* 头部信息 */}
      <div className="bg-base-100 rounded-lg border p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">{currentResource.resource_name}</h3>
            <p className="text-sm text-base-content/60">
              资源代码: {currentResource.resource_code} | 类型: {getResourceTypeLabel(currentResource.resource_type)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="stats stats-horizontal stats-sm">
              <div className="stat">
                <div className="stat-title">权限数量</div>
                <div className="stat-value text-sm">{resourcePermissions.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 操作栏 */}
        {!readonly && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowCreateForm(true)}
              disabled={loading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新建权限
            </button>

            {creatableActions.length > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={createAllPermissions}
                disabled={loading}
              >
                快速创建全部
              </button>
            )}

            {selectedPermissions.length > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowBatchActions(true)}
              >
                批量操作 ({selectedPermissions.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* 权限列表 */}
      <div className="bg-base-100 rounded-lg border">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : resourcePermissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-base-content/60">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p>该资源还没有权限定义</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  {!readonly && (
                    <th>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedPermissions.length === resourcePermissions.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                  )}
                  <th>权限名称</th>
                  <th>权限代码</th>
                  <th>操作类型</th>
                  <th>状态</th>
                  <th>描述</th>
                  {!readonly && <th>操作</th>}
                </tr>
              </thead>
              <tbody>
                {resourcePermissions.map(permission => (
                  <tr key={permission.id}>
                    {!readonly && (
                      <td>
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={selectedPermissions.includes(permission.id)}
                          onChange={(e) => handlePermissionSelect(permission.id, e.target.checked)}
                        />
                      </td>
                    )}
                    <td>
                      {editingPermission === permission.id ? (
                        <input
                          type="text"
                          className="input input-xs input-bordered w-full"
                          value={editForm.permission_name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, permission_name: e.target.value }))}
                        />
                      ) : (
                        <span className="font-medium">{permission.permission_name}</span>
                      )}
                    </td>
                    <td>
                      <code className="text-xs">{permission.permission_code}</code>
                    </td>
                    <td>
                      <div className="badge badge-outline badge-sm">
                        {getActionDisplayName(permission.action_type)}
                      </div>
                    </td>
                    <td>
                      {editingPermission === permission.id ? (
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={editForm.is_active}
                          onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.checked }))}
                        />
                      ) : (
                        <div className={`badge badge-sm ${permission.is_active ? 'badge-success' : 'badge-error'}`}>
                          {permission.is_active ? '启用' : '禁用'}
                        </div>
                      )}
                    </td>
                    <td>
                      {editingPermission === permission.id ? (
                        <input
                          type="text"
                          className="input input-xs input-bordered w-full"
                          value={editForm.description}
                          onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="权限描述"
                        />
                      ) : (
                        <span className="text-sm text-base-content/60 truncate max-w-xs">
                          {permission.description || '-'}
                        </span>
                      )}
                    </td>
                    {!readonly && (
                      <td>
                        {editingPermission === permission.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              className="btn btn-success btn-xs"
                              onClick={saveEdit}
                              disabled={loading}
                            >
                              保存
                            </button>
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={cancelEdit}
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => startEdit(permission)}
                              title="编辑"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                              onClick={() => handleDelete(permission.id)}
                              title="删除"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 创建权限对话框 */}
      {showCreateForm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">创建新权限</h3>
            
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">操作类型</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={createForm.action_type}
                  onChange={(e) => setCreateForm(prev => ({ 
                    ...prev, 
                    action_type: e.target.value as Permission['action_type'] 
                  }))}
                >
                  {creatableActions.map(action => (
                    <option key={action} value={action}>
                      {getActionDisplayName(action)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">
                  <span className="label-text">权限名称</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={createForm.permission_name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, permission_name: e.target.value }))}
                  placeholder="留空则自动生成"
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">权限描述</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="可选的权限描述"
                  rows={3}
                />
              </div>

              <div>
                <label className="label cursor-pointer">
                  <span className="label-text">自动生成权限代码</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={createForm.auto_generate_code}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, auto_generate_code: e.target.checked }))}
                  />
                </label>
              </div>

              {createForm.auto_generate_code && currentResource && (
                <div className="bg-base-200 rounded p-3">
                  <p className="text-sm">
                    权限代码将自动生成为: <code className="text-primary">
                      {generatePermissionCode(currentResource.resource_code, createForm.action_type)}
                    </code>
                  </p>
                </div>
              )}
            </div>

            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={loading || creatableActions.length === 0}
              >
                创建
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowCreateForm(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量操作对话框 */}
      {showBatchActions && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">批量操作</h3>
            <p className="mb-4">已选择 {selectedPermissions.length} 个权限</p>
            
            <div className="flex items-center gap-2">
              <button
                className="btn btn-success btn-sm"
                onClick={() => handleBatchAction('activate')}
              >
                启用
              </button>
              <button
                className="btn btn-warning btn-sm"
                onClick={() => handleBatchAction('deactivate')}
              >
                禁用
              </button>
              <button
                className="btn btn-error btn-sm"
                onClick={() => handleBatchAction('delete')}
              >
                删除
              </button>
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowBatchActions(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 辅助函数
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