/**
 * 角色管理模态框组件
 * 
 * 功能特性：
 * - 角色的创建/编辑表单
 * - 角色模板选择
 * - 角色继承关系配置
 * - 权限预览和快速分配
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRoleManagement, type RoleInfo, type CreateRoleData, type UpdateRoleData } from '@/hooks/role-management/useRoleManagement';
import { useRolePermissions, type PermissionInfo } from '@/hooks/role-management/useRolePermissions';

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: RoleInfo | null; // null = 创建新角色
  onSuccess?: (role: RoleInfo) => void;
}

// 角色模板
const ROLE_TEMPLATES = [
  {
    id: 'basic_employee',
    name: '基础员工',
    description: '只能查看自己的信息',
    permissions: ['view_own_profile', 'view_own_payroll'],
    metadata: { template: true, category: 'employee' }
  },
  {
    id: 'team_lead',
    name: '团队主管',
    description: '管理小组成员',
    permissions: ['view_own_profile', 'view_own_payroll', 'view_team_employees', 'manage_team_assignments'],
    metadata: { template: true, category: 'management' }
  },
  {
    id: 'department_manager',
    name: '部门经理',
    description: '管理整个部门',
    permissions: ['view_department_employees', 'manage_department_payroll', 'approve_department_changes'],
    metadata: { template: true, category: 'management' }
  },
  {
    id: 'hr_specialist',
    name: 'HR专员',
    description: 'HR日常操作权限',
    permissions: ['manage_employees', 'view_all_payroll', 'manage_employee_categories'],
    metadata: { template: true, category: 'hr' }
  }
];

export const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  isOpen,
  onClose,
  role,
  onSuccess = () => {}
}) => {
  const { 
    roles, 
    createRole, 
    updateRole, 
    loading: roleLoading 
  } = useRoleManagement();
  
  const { 
    permissions, 
    assignPermissionToRole,
    getRolePermissions,
    loading: permissionLoading 
  } = useRolePermissions();

  // 表单状态
  const [formData, setFormData] = useState<CreateRoleData>({
    role_code: '',
    role_name: '',
    parent_role_id: undefined,
    description: '',
    metadata: {},
    is_system_role: false
  });

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'basic' | 'permissions' | 'preview'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const isEditing = !!role;

  // 可选择的父角色（排除当前角色和其子角色）
  const availableParentRoles = useMemo(() => {
    if (!isEditing) {
      return roles.filter(r => r.is_active);
    }

    // 编辑模式下，排除自己和子角色
    const getChildRoleIds = (roleId: string, visited = new Set<string>()): Set<string> => {
      if (visited.has(roleId)) return visited;
      visited.add(roleId);
      
      roles
        .filter(r => r.parent_role_id === roleId)
        .forEach(childRole => getChildRoleIds(childRole.id, visited));
      
      return visited;
    };

    const excludedIds = getChildRoleIds(role!.id);
    return roles.filter(r => r.is_active && !excludedIds.has(r.id));
  }, [roles, role, isEditing]);

  // 权限分组
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionInfo[]> = {};
    permissions.forEach(permission => {
      const resource = permission.resource_id || 'other';
      if (!groups[resource]) {
        groups[resource] = [];
      }
      groups[resource].push(permission);
    });
    return groups;
  }, [permissions]);

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (isEditing && role) {
        setFormData({
          role_code: role.role_code,
          role_name: role.role_name,
          parent_role_id: role.parent_role_id || undefined,
          description: role.description || '',
          metadata: role.metadata || {},
          is_system_role: role.is_system_role
        });

        // 加载角色权限
        const rolePermissions = getRolePermissions(role.id);
        setSelectedPermissions(new Set(rolePermissions.map(rp => rp.permission_id)));
      } else {
        // 新建角色
        setFormData({
          role_code: '',
          role_name: '',
          parent_role_id: undefined,
          description: '',
          metadata: {},
          is_system_role: false
        });
        setSelectedPermissions(new Set());
      }
      
      setSelectedTemplate('');
      setActiveTab('basic');
      setErrors({});
    }
  }, [isOpen, isEditing, role, getRolePermissions]);

  // 应用角色模板
  const applyTemplate = useCallback((templateId: string) => {
    const template = ROLE_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setFormData(prev => ({
      ...prev,
      role_name: prev.role_name || template.name,
      description: prev.description || template.description,
      metadata: {
        ...prev.metadata,
        ...template.metadata
      }
    }));

    // 应用权限模板
    const templatePermissionCodes = new Set(template.permissions);
    const templatePermissionIds = permissions
      .filter(p => templatePermissionCodes.has(p.permission_code))
      .map(p => p.id);
    
    setSelectedPermissions(new Set(templatePermissionIds));
    setSelectedTemplate(templateId);
  }, [permissions]);

  // 表单验证
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.role_code.trim()) {
      newErrors.role_code = '角色代码不能为空';
    } else if (!/^[a-z_]+$/.test(formData.role_code)) {
      newErrors.role_code = '角色代码只能包含小写字母和下划线';
    } else if (!isEditing && roles.some(r => r.role_code === formData.role_code)) {
      newErrors.role_code = '角色代码已存在';
    }

    if (!formData.role_name.trim()) {
      newErrors.role_name = '角色名称不能为空';
    } else if (!isEditing && roles.some(r => r.role_name === formData.role_name)) {
      newErrors.role_name = '角色名称已存在';
    }

    if (formData.parent_role_id === role?.id) {
      newErrors.parent_role_id = '不能选择自己作为父角色';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, roles, role, isEditing]);

  // 提交表单
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      setActiveTab('basic');
      return;
    }

    setLoading(true);
    try {
      let roleId: string;

      if (isEditing && role) {
        const updateData: UpdateRoleData = {
          id: role.id,
          ...formData
        };
        await updateRole(updateData);
        roleId = role.id;
      } else {
        roleId = await createRole(formData);
      }

      // 分配权限
      if (selectedPermissions.size > 0) {
        const existingPermissions = new Set(getRolePermissions(roleId).map(rp => rp.permission_id));
        
        for (const permissionId of selectedPermissions) {
          if (!existingPermissions.has(permissionId)) {
            await assignPermissionToRole(roleId, permissionId);
          }
        }
      }

      // 成功回调
      const updatedRole = roles.find(r => r.id === roleId);
      if (updatedRole) {
        onSuccess(updatedRole);
      }

      onClose();
    } catch (error) {
      console.error('保存角色失败:', error);
      setErrors({ submit: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setLoading(false);
    }
  }, [
    validateForm,
    isEditing,
    role,
    formData,
    selectedPermissions,
    updateRole,
    createRole,
    getRolePermissions,
    assignPermissionToRole,
    roles,
    onSuccess,
    onClose
  ]);

  // 权限统计
  const permissionStats = useMemo(() => {
    const total = permissions.length;
    const selected = selectedPermissions.size;
    const byResource = Object.entries(groupedPermissions).map(([resource, perms]) => ({
      resource,
      total: perms.length,
      selected: perms.filter(p => selectedPermissions.has(p.id)).length
    }));

    return { total, selected, byResource };
  }, [permissions, selectedPermissions, groupedPermissions]);

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl h-[80vh] flex flex-col">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            {isEditing ? `编辑角色: ${role?.role_name}` : '创建新角色'}
          </h3>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 选项卡 */}
        <div className="tabs tabs-bordered mb-4">
          <button 
            className={`tab ${activeTab === 'basic' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            基本信息
          </button>
          <button 
            className={`tab ${activeTab === 'permissions' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            权限配置 ({selectedPermissions.size})
          </button>
          <button 
            className={`tab ${activeTab === 'preview' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            预览
          </button>
        </div>

        {/* 表单内容 */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              {/* 角色模板选择 */}
              {!isEditing && (
                <div className="card bg-base-200 p-4">
                  <h4 className="font-medium mb-3">从模板创建</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {ROLE_TEMPLATES.map(template => (
                      <button
                        key={template.id}
                        className={`card bg-base-100 p-3 text-left hover:bg-base-300 transition-colors ${
                          selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => applyTemplate(template.id)}
                      >
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-base-content/60">{template.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 基本信息表单 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">角色代码 *</span>
                  </label>
                  <input
                    type="text"
                    className={`input input-bordered ${errors.role_code ? 'input-error' : ''}`}
                    placeholder="例如: department_manager"
                    value={formData.role_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, role_code: e.target.value }))}
                    disabled={isEditing && role?.is_system_role}
                  />
                  {errors.role_code && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.role_code}</span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">角色名称 *</span>
                  </label>
                  <input
                    type="text"
                    className={`input input-bordered ${errors.role_name ? 'input-error' : ''}`}
                    placeholder="例如: 部门经理"
                    value={formData.role_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, role_name: e.target.value }))}
                  />
                  {errors.role_name && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.role_name}</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">父角色</span>
                </label>
                <select
                  className={`select select-bordered ${errors.parent_role_id ? 'select-error' : ''}`}
                  value={formData.parent_role_id || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    parent_role_id: e.target.value || undefined 
                  }))}
                >
                  <option value="">无父角色（顶级角色）</option>
                  {availableParentRoles.map(parentRole => (
                    <option key={parentRole.id} value={parentRole.id}>
                      {parentRole.role_name} ({parentRole.role_code})
                    </option>
                  ))}
                </select>
                {errors.parent_role_id && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.parent_role_id}</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">描述</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-24"
                  placeholder="描述角色的职责和权限范围..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {!isEditing && (
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">系统角色</span>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={formData.is_system_role}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        is_system_role: e.target.checked 
                      }))}
                    />
                  </label>
                  <label className="label">
                    <span className="label-text-alt">系统角色受保护，无法被普通用户删除</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-4">
              {/* 权限统计 */}
              <div className="stats stats-horizontal bg-base-100 shadow">
                <div className="stat py-3 px-4">
                  <div className="stat-title text-xs">已选权限</div>
                  <div className="stat-value text-lg">{permissionStats.selected}</div>
                </div>
                <div className="stat py-3 px-4">
                  <div className="stat-title text-xs">总权限数</div>
                  <div className="stat-value text-lg">{permissionStats.total}</div>
                </div>
                <div className="stat py-3 px-4">
                  <div className="stat-title text-xs">覆盖率</div>
                  <div className="stat-value text-lg">
                    {permissionStats.total > 0 
                      ? ((permissionStats.selected / permissionStats.total) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
              </div>

              {/* 权限分组 */}
              {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => {
                const resourceStats = permissionStats.byResource.find(r => r.resource === resource);
                const allSelected = resourcePermissions.every(p => selectedPermissions.has(p.id));
                const someSelected = resourcePermissions.some(p => selectedPermissions.has(p.id));

                return (
                  <div key={resource} className="card bg-base-100 border border-base-300">
                    <div className="card-header p-4 border-b border-base-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="checkbox"
                            checked={allSelected}
                            ref={input => {
                              if (input) input.indeterminate = someSelected && !allSelected;
                            }}
                            onChange={(e) => {
                              const newSelected = new Set(selectedPermissions);
                              if (e.target.checked) {
                                resourcePermissions.forEach(p => newSelected.add(p.id));
                              } else {
                                resourcePermissions.forEach(p => newSelected.delete(p.id));
                              }
                              setSelectedPermissions(newSelected);
                            }}
                          />
                          <h4 className="font-medium capitalize">{resource}</h4>
                          <span className="badge badge-outline badge-sm">
                            {resourceStats?.selected || 0} / {resourceStats?.total || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="card-body p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {resourcePermissions.map(permission => (
                          <div key={permission.id} className="form-control">
                            <label className="label cursor-pointer justify-start gap-3">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={selectedPermissions.has(permission.id)}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedPermissions);
                                  if (e.target.checked) {
                                    newSelected.add(permission.id);
                                  } else {
                                    newSelected.delete(permission.id);
                                  }
                                  setSelectedPermissions(newSelected);
                                }}
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium">{permission.permission_name}</div>
                                <div className="text-xs text-base-content/60">
                                  {permission.action_type}
                                </div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="card bg-base-100 border border-base-300">
                <div className="card-header p-4 border-b border-base-300">
                  <h4 className="font-medium">角色预览</h4>
                </div>
                <div className="card-body p-4">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-base-content/60">角色代码</dt>
                      <dd className="mt-1">{formData.role_code || '未设置'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-base-content/60">角色名称</dt>
                      <dd className="mt-1">{formData.role_name || '未设置'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-base-content/60">父角色</dt>
                      <dd className="mt-1">
                        {formData.parent_role_id 
                          ? availableParentRoles.find(r => r.id === formData.parent_role_id)?.role_name 
                          : '无父角色'
                        }
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-base-content/60">权限数量</dt>
                      <dd className="mt-1">{selectedPermissions.size} 个权限</dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="text-sm font-medium text-base-content/60">描述</dt>
                      <dd className="mt-1">{formData.description || '无描述'}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {selectedPermissions.size > 0 && (
                <div className="card bg-base-100 border border-base-300">
                  <div className="card-header p-4 border-b border-base-300">
                    <h4 className="font-medium">权限清单</h4>
                  </div>
                  <div className="card-body p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Array.from(selectedPermissions).map(permissionId => {
                        const permission = permissions.find(p => p.id === permissionId);
                        return permission ? (
                          <div key={permissionId} className="flex items-center gap-2 p-2 bg-base-200 rounded">
                            <span className="text-success">✓</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{permission.permission_name}</div>
                              <div className="text-xs text-base-content/60 truncate">{permission.action_type}</div>
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 错误提示 */}
        {errors.submit && (
          <div className="alert alert-error mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errors.submit}</span>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="modal-action">
          <button 
            className="btn btn-ghost" 
            onClick={onClose}
            disabled={loading}
          >
            取消
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={loading || roleLoading || permissionLoading}
          >
            {loading && <span className="loading loading-spinner loading-sm mr-2"></span>}
            {isEditing ? '更新角色' : '创建角色'}
          </button>
        </div>
      </div>
    </div>
  );
};