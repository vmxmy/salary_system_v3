/**
 * 用户编辑模态框组件 - 专门用于用户信息编辑
 * 
 * 功能特性：
 * - 基于权限的用户信息编辑
 * - 角色和权限管理
 * - 表单验证和错误处理
 * - 实时数据同步
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePermission } from '@/hooks/permissions/usePermission';
import { useUserManagement } from '@/hooks/user-management/useUserManagement';
import type { UserWithPermissions } from '@/hooks/user-management/useUserManagement';
import { supabase } from '@/lib/supabase';
import { cardEffects } from '@/lib/utils';

import {
  XMarkIcon,
  UserIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface UserEditModalProps {
  isOpen: boolean;
  user: UserWithPermissions | null;
  onClose: () => void;
  onSuccess: (updatedUser: UserWithPermissions) => void;
  permissions: {
    canUpdate: boolean;
    canAssignRoles: boolean;
    canManagePermissions: boolean;
  };
}

interface UserEditFormData {
  email: string;
  employee_name: string;
  user_role: string;
  data_scope: string;
  role_active: boolean;
  config_active: boolean;
  effective_from?: string;
  effective_until?: string;
}

interface FormErrors {
  [key: string]: string;
}

/**
 * 用户编辑模态框主组件
 */
export default function UserEditModal({
  isOpen,
  user,
  onClose,
  onSuccess,
  permissions
}: UserEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [formData, setFormData] = useState<UserEditFormData>({
    email: '',
    employee_name: '',
    user_role: '',
    data_scope: '',
    role_active: true,
    config_active: true
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isDirty, setIsDirty] = useState(false);

  const userManagement = useUserManagement();

  // 角色选项配置
  const roleOptions = [
    { value: 'super_admin', label: '超级管理员', level: 1, color: 'badge-error' },
    { value: 'admin', label: '系统管理员', level: 2, color: 'badge-warning' },
    { value: 'hr_manager', label: '人事经理', level: 3, color: 'badge-info' },
    { value: 'manager', label: '部门经理', level: 4, color: 'badge-success' },
    { value: 'employee', label: '普通员工', level: 5, color: 'badge-neutral' }
  ];

  // 数据范围选项
  const dataScopeOptions = [
    { value: 'all', label: '全部数据', icon: '🌍' },
    { value: 'department', label: '部门数据', icon: '🏢' },
    { value: 'team', label: '团队数据', icon: '👥' },
    { value: 'self', label: '个人数据', icon: '👤' }
  ];

  /**
   * 初始化表单数据
   */
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        email: user.email || '',
        employee_name: user.employee_name || '',
        user_role: user.user_role || '',
        data_scope: user.data_scope || 'self',
        role_active: user.role_active !== false,
        config_active: user.config_active !== false,
        effective_from: user.effective_from || undefined,
        effective_until: user.effective_until || undefined
      });
      setFormErrors({});
      setError(null);
      setIsDirty(false);
    }
  }, [isOpen, user]);

  /**
   * 表单验证
   */
  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};

    // 邮箱验证
    if (!formData.email) {
      errors.email = '邮箱地址不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    // 员工姓名验证
    if (!formData.employee_name.trim()) {
      errors.employee_name = '员工姓名不能为空';
    }

    // 角色验证
    if (!formData.user_role) {
      errors.user_role = '请选择用户角色';
    }

    // 数据范围验证
    if (!formData.data_scope) {
      errors.data_scope = '请选择数据访问范围';
    }

    // 时间验证
    if (formData.effective_from && formData.effective_until) {
      if (new Date(formData.effective_from) >= new Date(formData.effective_until)) {
        errors.effective_until = '失效时间必须晚于生效时间';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  /**
   * 处理表单输入变化
   */
  const handleInputChange = useCallback((field: keyof UserEditFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
    
    // 清除对应字段的错误
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, [formErrors]);

  /**
   * 提交表单
   */
  const handleSubmit = useCallback(async () => {
    if (!user?.user_id || !permissions.canUpdate) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 更新用户基本信息
      if (formData.email !== user.email || formData.employee_name !== user.employee_name) {
        await userManagement.updateUserProfile(user.user_id, {
          email: formData.email,
          employee_name: formData.employee_name
        });
      }

      // 更新角色信息（如果有权限）
      if (permissions.canAssignRoles && formData.user_role !== user.user_role) {
        await userManagement.assignUserRole({
          user_id: user.user_id,
          role: formData.user_role,
          effective_from: formData.effective_from,
          effective_until: formData.effective_until
        });
      }

      // 更新状态（如果有权限）
      if (permissions.canUpdate && 
          (formData.role_active !== user.role_active || formData.config_active !== user.config_active)) {
        if (formData.role_active && !user.role_active) {
          await userManagement.reactivateUser(user.user_id);
        } else if (!formData.role_active && user.role_active) {
          await userManagement.deactivateUser(user.user_id);
        }
      }

      // 获取更新后的用户信息
      const updatedUser = await userManagement.getUserById(user.user_id);
      if (updatedUser) {
        onSuccess(updatedUser);
      }

      onClose();

    } catch (err) {
      console.error('[UserEditModal] Failed to update user:', err);
      setError(err instanceof Error ? err : new Error('更新用户信息失败'));
    } finally {
      setLoading(false);
    }
  }, [user, formData, permissions, validateForm, userManagement, onSuccess, onClose]);

  /**
   * 重置表单
   */
  const handleReset = useCallback(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        employee_name: user.employee_name || '',
        user_role: user.user_role || '',
        data_scope: user.data_scope || 'self',
        role_active: user.role_active !== false,
        config_active: user.config_active !== false,
        effective_from: user.effective_from || undefined,
        effective_until: user.effective_until || undefined
      });
      setFormErrors({});
      setIsDirty(false);
    }
  }, [user]);

  /**
   * 检查权限是否足够进行编辑
   */
  const canEdit = useMemo(() => {
    return permissions.canUpdate || permissions.canAssignRoles;
  }, [permissions]);

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-full max-w-4xl">
        {/* 模态框头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <UserIcon className="w-7 h-7 text-primary" />
              编辑用户信息
            </h2>
            <p className="text-base-content/70 mt-1">
              修改用户的基本信息、角色和权限设置
            </p>
          </div>
          <button 
            className="btn btn-sm btn-circle btn-ghost" 
            onClick={onClose}
            disabled={loading}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 权限检查提示 */}
        {!canEdit && (
          <div className="alert alert-warning mb-6">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span>您没有足够的权限编辑用户信息</span>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="alert alert-error mb-6">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span>{error.message}</span>
          </div>
        )}

        {/* 表单内容 */}
        <div className="space-y-6">
          {/* 基本信息部分 */}
          <div className={cardEffects.modern}>
            <div className="card-body">
              <h3 className="card-title text-lg mb-4">
                <UserCircleIcon className="w-5 h-5" />
                基本信息
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 邮箱地址 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <EnvelopeIcon className="w-4 h-4" />
                      邮箱地址 *
                    </span>
                  </label>
                  <input
                    type="email"
                    className={`input input-bordered ${formErrors.email ? 'input-error' : ''}`}
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!permissions.canUpdate || loading}
                    placeholder="请输入邮箱地址"
                  />
                  {formErrors.email && (
                    <label className="label">
                      <span className="label-text-alt text-error">{formErrors.email}</span>
                    </label>
                  )}
                </div>

                {/* 员工姓名 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      员工姓名 *
                    </span>
                  </label>
                  <input
                    type="text"
                    className={`input input-bordered ${formErrors.employee_name ? 'input-error' : ''}`}
                    value={formData.employee_name}
                    onChange={(e) => handleInputChange('employee_name', e.target.value)}
                    disabled={!permissions.canUpdate || loading}
                    placeholder="请输入员工姓名"
                  />
                  {formErrors.employee_name && (
                    <label className="label">
                      <span className="label-text-alt text-error">{formErrors.employee_name}</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 角色权限部分 */}
          <div className={cardEffects.modern}>
            <div className="card-body">
              <h3 className="card-title text-lg mb-4">
                <ShieldCheckIcon className="w-5 h-5" />
                角色权限
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 用户角色 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <CogIcon className="w-4 h-4" />
                      用户角色 *
                    </span>
                  </label>
                  <select
                    className={`select select-bordered ${formErrors.user_role ? 'select-error' : ''}`}
                    value={formData.user_role}
                    onChange={(e) => handleInputChange('user_role', e.target.value)}
                    disabled={!permissions.canAssignRoles || loading}
                  >
                    <option value="">请选择角色</option>
                    {roleOptions.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.user_role && (
                    <label className="label">
                      <span className="label-text-alt text-error">{formErrors.user_role}</span>
                    </label>
                  )}
                </div>

                {/* 数据范围 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <BuildingOfficeIcon className="w-4 h-4" />
                      数据访问范围 *
                    </span>
                  </label>
                  <select
                    className={`select select-bordered ${formErrors.data_scope ? 'select-error' : ''}`}
                    value={formData.data_scope}
                    onChange={(e) => handleInputChange('data_scope', e.target.value)}
                    disabled={!permissions.canAssignRoles || loading}
                  >
                    <option value="">请选择数据范围</option>
                    {dataScopeOptions.map(scope => (
                      <option key={scope.value} value={scope.value}>
                        {scope.icon} {scope.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.data_scope && (
                    <label className="label">
                      <span className="label-text-alt text-error">{formErrors.data_scope}</span>
                    </label>
                  )}
                </div>
              </div>

              {/* 状态设置 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">角色激活状态</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={formData.role_active}
                      onChange={(e) => handleInputChange('role_active', e.target.checked)}
                      disabled={!permissions.canUpdate || loading}
                    />
                  </label>
                  <label className="label">
                    <span className="label-text-alt text-base-content/70">
                      关闭后用户将无法登录系统
                    </span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">配置激活状态</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-secondary"
                      checked={formData.config_active}
                      onChange={(e) => handleInputChange('config_active', e.target.checked)}
                      disabled={!permissions.canUpdate || loading}
                    />
                  </label>
                  <label className="label">
                    <span className="label-text-alt text-base-content/70">
                      控制用户系统配置的访问权限
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 时间设置部分 */}
          <div className={cardEffects.modern}>
            <div className="card-body">
              <h3 className="card-title text-lg mb-4">
                <InformationCircleIcon className="w-5 h-5" />
                时间设置
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 生效时间 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">角色生效时间</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="input input-bordered"
                    value={formData.effective_from || ''}
                    onChange={(e) => handleInputChange('effective_from', e.target.value)}
                    disabled={!permissions.canAssignRoles || loading}
                  />
                </div>

                {/* 失效时间 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">角色失效时间</span>
                  </label>
                  <input
                    type="datetime-local"
                    className={`input input-bordered ${formErrors.effective_until ? 'input-error' : ''}`}
                    value={formData.effective_until || ''}
                    onChange={(e) => handleInputChange('effective_until', e.target.value)}
                    disabled={!permissions.canAssignRoles || loading}
                  />
                  {formErrors.effective_until && (
                    <label className="label">
                      <span className="label-text-alt text-error">{formErrors.effective_until}</span>
                    </label>
                  )}
                  <label className="label">
                    <span className="label-text-alt text-base-content/70">
                      留空表示无限制
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-base-300">
          <div>
            {isDirty && (
              <div className="flex items-center gap-2 text-warning">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span className="text-sm">有未保存的更改</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              className="btn btn-outline"
              onClick={handleReset}
              disabled={loading || !isDirty}
            >
              重置
            </button>
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
              disabled={loading || !canEdit || !isDirty}
            >
              {loading && <span className="loading loading-spinner loading-sm"></span>}
              保存更改
            </button>
          </div>
        </div>
      </div>
      
      {/* 背景遮罩 */}
      <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
    </div>
  );
}