/**
 * 角色表单组件 - 创建和编辑角色
 * 
 * 功能特性：
 * - 创建和编辑模式支持
 * - 表单验证
 * - DaisyUI 模态框设计
 * - 响应式布局
 */

import React, { useState, useEffect } from 'react';
import { useAlertModal } from '@/components/common/Modal';

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

interface RoleFormData {
  code: string;
  name: string;
  description: string;
  level: number;
  color: string;
  isActive: boolean;
}

interface RoleFormProps {
  role?: RoleData | null;
  onSave: (data: RoleFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const ROLE_COLORS = [
  { value: 'primary', label: '主色', class: 'bg-primary' },
  { value: 'secondary', label: '辅色', class: 'bg-secondary' },
  { value: 'success', label: '成功', class: 'bg-success' },
  { value: 'info', label: '信息', class: 'bg-info' },
  { value: 'warning', label: '警告', class: 'bg-warning' },
  { value: 'error', label: '错误', class: 'bg-error' }
];

const ROLE_LEVELS = [
  { value: 1, label: '1级 - 基础员工' },
  { value: 2, label: '2级 - 部门经理' },
  { value: 3, label: '3级 - 高级经理' },
  { value: 4, label: '4级 - 系统管理员' },
  { value: 5, label: '5级 - 超级管理员' }
];

export function RoleForm({ role, onSave, onCancel, loading = false }: RoleFormProps) {
  const { showError, AlertModal } = useAlertModal();
  const isEditing = !!role;
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 表单状态
  const [formData, setFormData] = useState<RoleFormData>({
    code: '',
    name: '',
    description: '',
    level: 1,
    color: 'primary',
    isActive: true
  });

  // 初始化表单数据
  useEffect(() => {
    if (role) {
      setFormData({
        code: role.code,
        name: role.name,
        description: role.description,
        level: role.level,
        color: role.color,
        isActive: role.isActive
      });
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        level: 1,
        color: 'primary',
        isActive: true
      });
    }
    setErrors({});
  }, [role]);

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '角色名称不能为空';
    } else if (formData.name.length > 50) {
      newErrors.name = '角色名称不能超过50个字符';
    }

    if (!formData.code.trim()) {
      newErrors.code = '角色代码不能为空';
    } else if (!/^[a-z_]+$/.test(formData.code)) {
      newErrors.code = '角色代码只能包含小写字母和下划线';
    } else if (formData.code.length > 20) {
      newErrors.code = '角色代码不能超过20个字符';
    }

    if (formData.description.length > 200) {
      newErrors.description = '描述不能超过200个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 生成角色代码建议
  const generateRoleCode = (name: string) => {
    const code = name
      .toLowerCase()
      .replace(/[\s\-]+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 20);
    setFormData(prev => ({ ...prev, code }));
  };

  // 处理表单字段变化
  const handleInputChange = (field: keyof RoleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // 实时生成角色代码建议
    if (field === 'name' && !isEditing) {
      generateRoleCode(value);
    }
  };

  // 表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
    } catch (error) {
      console.error('保存角色失败:', error);
      showError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        {/* 模态框标题 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {isEditing ? '编辑角色' : '创建角色'}
          </h2>
          <button
            onClick={onCancel}
            className="btn btn-sm btn-circle btn-ghost"
            disabled={saving}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 角色名称 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  角色名称 <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                placeholder="请输入角色名称"
                className={`input input-bordered ${errors.name ? 'input-error' : ''}`}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={saving}
                aria-required="true"
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <label className="label">
                  <span id="name-error" className="label-text-alt text-error" role="alert">{errors.name}</span>
                </label>
              )}
            </div>

            {/* 角色代码 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  角色代码 <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                placeholder="role_code"
                className={`input input-bordered ${errors.code ? 'input-error' : ''}`}
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                disabled={saving || (isEditing && role?.isSystem)}
                aria-required="true"
                aria-invalid={errors.code ? 'true' : 'false'}
                aria-describedby={errors.code ? 'code-error' : (isEditing && role?.isSystem) ? 'code-system-note' : undefined}
              />
              {errors.code && (
                <label className="label">
                  <span id="code-error" className="label-text-alt text-error" role="alert">{errors.code}</span>
                </label>
              )}
              {isEditing && role?.isSystem && (
                <label className="label">
                  <span id="code-system-note" className="label-text-alt text-warning">系统角色代码不可修改</span>
                </label>
              )}
            </div>
          </div>

          {/* 角色描述 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">角色描述</span>
            </label>
            <textarea
              className={`textarea textarea-bordered h-20 ${errors.description ? 'textarea-error' : ''}`}
              placeholder="请输入角色描述，简要说明这个角色的职责和权限..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={saving}
              aria-invalid={errors.description ? 'true' : 'false'}
              aria-describedby={errors.description ? 'description-error' : undefined}
            />
            {errors.description && (
              <label className="label">
                <span id="description-error" className="label-text-alt text-error" role="alert">{errors.description}</span>
              </label>
            )}
          </div>

          {/* 角色等级和颜色 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 角色等级 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  角色等级 <span className="text-error">*</span>
                </span>
              </label>
              <select
                className={`select select-bordered ${errors.level ? 'select-error' : ''}`}
                value={formData.level}
                onChange={(e) => handleInputChange('level', parseInt(e.target.value))}
                disabled={saving || (isEditing && role?.isSystem)}
                aria-required="true"
                aria-invalid={errors.level ? 'true' : 'false'}
                aria-describedby={errors.level ? 'level-error' : (isEditing && role?.isSystem) ? 'level-system-note' : undefined}
              >
                {ROLE_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              {errors.level && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.level}</span>
                </label>
              )}
              {isEditing && role?.isSystem && (
                <label className="label">
                  <span className="label-text-alt text-warning">系统角色等级不可修改</span>
                </label>
              )}
            </div>

            {/* 角色颜色 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">角色颜色</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ROLE_COLORS.map(color => (
                  <label key={color.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="color"
                      value={color.value}
                      checked={formData.color === color.value}
                      onChange={(e) => handleInputChange('color', e.target.value)}
                      className="sr-only"
                      disabled={saving}
                    />
                    <div className={`
                      w-8 h-8 rounded-full border-2 flex items-center justify-center
                      ${color.class}
                      ${formData.color === color.value ? 'border-base-content scale-110' : 'border-base-300'}
                      transition-all duration-200
                    `}>
                      {formData.color === color.value && (
                        <svg className="w-4 h-4 text-base-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 状态设置 */}
          <div className="form-control">
            <label className="label cursor-pointer justify-start">
              <input
                type="checkbox"
                className="checkbox checkbox-primary mr-3"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                disabled={saving}
              />
              <span className="label-text font-medium">启用此角色</span>
            </label>
            <div className="text-sm text-base-content/70 ml-8">
              禁用的角色将不能分配给用户，但不会影响已有用户的权限
            </div>
          </div>

          {/* 表单按钮 */}
          <div className="modal-action">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-ghost"
              disabled={saving}
            >
              取消
            </button>
            <button
              type="submit"
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
                  {isEditing ? '更新角色' : '创建角色'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onCancel}></div>
      
      {/* Alert模态框 */}
      {AlertModal}
    </div>
  );
}