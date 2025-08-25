/**
 * 权限创建模态框 - 基于DaisyUI 5设计
 * 
 * 功能特性：
 * - 权限代码格式验证
 * - 权限分类管理
 * - 实时预览和验证
 * - 与现有权限冲突检测
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useDynamicPermissions } from '@/hooks/permissions/useDynamicPermissions';
import { 
  XMarkIcon, 
  ShieldCheckIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface PermissionCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 权限表单数据接口
 */
interface PermissionFormData {
  code: string;
  displayName: string;
  description: string;
  category: string;
  resourceType: string;
  actionType: string;
}

/**
 * 权限分类选项
 */
const PERMISSION_CATEGORIES = [
  { value: 'user_management', label: '用户管理' },
  { value: 'role_management', label: '角色管理' }, 
  { value: 'employee_management', label: '员工管理' },
  { value: 'payroll_management', label: '薪资管理' },
  { value: 'system_management', label: '系统管理' },
  { value: 'data_access', label: '数据访问' },
  { value: 'other', label: '其他' }
] as const;

/**
 * 资源类型选项
 */
const RESOURCE_TYPES = [
  { value: 'user', label: '用户' },
  { value: 'role', label: '角色' },
  { value: 'employee', label: '员工' },
  { value: 'payroll', label: '薪资' },
  { value: 'department', label: '部门' },
  { value: 'system', label: '系统' },
  { value: 'data', label: '数据' },
  { value: 'report', label: '报表' }
] as const;

/**
 * 操作类型选项
 */
const ACTION_TYPES = [
  { value: 'read', label: '查看' },
  { value: 'write', label: '编辑' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'manage', label: '管理' },
  { value: 'view', label: '浏览' },
  { value: 'export', label: '导出' },
  { value: 'import', label: '导入' },
  { value: 'approve', label: '审批' }
] as const;

export default function PermissionCreateModal({ isOpen, onClose, onSuccess }: PermissionCreateModalProps) {
  const dynamicPermissions = useDynamicPermissions({
    autoLoad: true,
    enableCache: false
  });

  // 表单状态
  const [formData, setFormData] = useState<PermissionFormData>({
    code: '',
    displayName: '',
    description: '',
    category: 'other',
    resourceType: '',
    actionType: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeFormat, setCodeFormat] = useState<'manual' | 'structured'>('structured');

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setFormData({
        code: '',
        displayName: '',
        description: '',
        category: 'other',
        resourceType: '',
        actionType: ''
      });
      setError(null);
      setIsSubmitting(false);
      setCodeFormat('structured');
    }
  }, [isOpen]);

  /**
   * 生成权限代码
   */
  const generatedCode = useMemo(() => {
    if (codeFormat === 'manual' || !formData.resourceType || !formData.actionType) {
      return '';
    }
    return `${formData.resourceType}.${formData.actionType}`;
  }, [formData.resourceType, formData.actionType, codeFormat]);

  /**
   * 使用生成的代码
   */
  useEffect(() => {
    if (codeFormat === 'structured' && generatedCode) {
      setFormData(prev => ({ ...prev, code: generatedCode }));
    }
  }, [generatedCode, codeFormat]);

  /**
   * 权限代码验证
   */
  const codeValidation = useMemo(() => {
    if (!formData.code) {
      return { isValid: false, message: '请输入权限代码' };
    }

    // 检查格式
    const codePattern = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;
    if (!codePattern.test(formData.code)) {
      return { 
        isValid: false, 
        message: '权限代码格式错误：只能包含小写字母、数字、下划线，且以字母开头' 
      };
    }

    // 检查是否已存在
    const exists = dynamicPermissions.permissions.some(p => p.code === formData.code);
    if (exists) {
      return { isValid: false, message: '权限代码已存在' };
    }

    return { isValid: true, message: '权限代码格式正确' };
  }, [formData.code, dynamicPermissions.permissions]);

  /**
   * 表单验证
   */
  const formValidation = useMemo(() => {
    const errors: string[] = [];

    if (!codeValidation.isValid) {
      errors.push(codeValidation.message);
    }

    if (!formData.displayName.trim()) {
      errors.push('请输入权限显示名称');
    }

    if (!formData.category) {
      errors.push('请选择权限分类');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [formData, codeValidation]);

  /**
   * 处理表单提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formValidation.isValid) {
      setError(formValidation.errors.join('；'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // TODO: 实现实际的权限创建API调用
      // await createPermission(formData);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建权限失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 处理输入变更
   */
  const handleInputChange = (field: keyof PermissionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        {/* 模态框头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShieldCheckIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">创建新权限</h3>
              <p className="text-sm text-base-content/70">添加新的系统权限</p>
            </div>
          </div>
          <button
            className="btn btn-sm btn-ghost btn-circle"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 权限代码配置方式 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">权限代码配置方式</span>
            </label>
            <div className="flex gap-4">
              <label className="label cursor-pointer">
                <input
                  type="radio"
                  name="codeFormat"
                  className="radio radio-primary"
                  checked={codeFormat === 'structured'}
                  onChange={() => setCodeFormat('structured')}
                />
                <span className="label-text ml-2">结构化生成</span>
              </label>
              <label className="label cursor-pointer">
                <input
                  type="radio"
                  name="codeFormat"
                  className="radio radio-primary"
                  checked={codeFormat === 'manual'}
                  onChange={() => setCodeFormat('manual')}
                />
                <span className="label-text ml-2">手动输入</span>
              </label>
            </div>
          </div>

          {/* 结构化生成 */}
          {codeFormat === 'structured' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">资源类型</span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.resourceType}
                  onChange={(e) => handleInputChange('resourceType', e.target.value)}
                >
                  <option value="">选择资源类型</option>
                  {RESOURCE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">操作类型</span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.actionType}
                  onChange={(e) => handleInputChange('actionType', e.target.value)}
                >
                  <option value="">选择操作类型</option>
                  {ACTION_TYPES.map(action => (
                    <option key={action.value} value={action.value}>{action.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 权限代码 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">权限代码 *</span>
              <span className="label-text-alt">
                {codeFormat === 'structured' && generatedCode && '自动生成'}
              </span>
            </label>
            <input
              type="text"
              className={`input input-bordered ${
                formData.code 
                  ? codeValidation.isValid 
                    ? 'input-success' 
                    : 'input-error'
                  : ''
              }`}
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              disabled={codeFormat === 'structured'}
              placeholder="例如: user.create, role.manage"
            />
            <label className="label">
              <span className={`label-text-alt flex items-center gap-1 ${
                formData.code
                  ? codeValidation.isValid
                    ? 'text-success'
                    : 'text-error'
                  : 'text-base-content/50'
              }`}>
                {formData.code && (
                  codeValidation.isValid 
                    ? <CheckCircleIcon className="w-3 h-3" />
                    : <ExclamationTriangleIcon className="w-3 h-3" />
                )}
                {formData.code ? codeValidation.message : '权限的唯一标识符'}
              </span>
            </label>
          </div>

          {/* 权限显示名称 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">显示名称 *</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.displayName}
              onChange={(e) => handleInputChange('displayName', e.target.value)}
              placeholder="权限的友好显示名称"
            />
            <label className="label">
              <span className="label-text-alt">用户界面中显示的权限名称</span>
            </label>
          </div>

          {/* 权限描述 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">权限描述</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="详细描述此权限的用途和范围"
            />
          </div>

          {/* 权限分类 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">权限分类 *</span>
            </label>
            <select
              className="select select-bordered"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
            >
              {PERMISSION_CATEGORIES.map(category => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
          </div>

          {/* 权限预览 */}
          {(formData.code || formData.displayName) && (
            <div className="alert alert-info">
              <InformationCircleIcon className="w-5 h-5" />
              <div>
                <div className="font-medium">权限预览</div>
                <div className="text-sm mt-1">
                  <div>代码: <code className="font-mono">{formData.code || '(待输入)'}</code></div>
                  <div>名称: {formData.displayName || '(待输入)'}</div>
                  {formData.description && <div>描述: {formData.description}</div>}
                  <div>分类: {PERMISSION_CATEGORIES.find(c => c.value === formData.category)?.label}</div>
                </div>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="alert alert-error">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* 按钮组 */}
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !formValidation.isValid}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  创建中...
                </>
              ) : (
                '创建权限'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}