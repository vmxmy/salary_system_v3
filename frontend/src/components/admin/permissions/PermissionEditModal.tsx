/**
 * 权限编辑模态框 - 基于DaisyUI 5设计
 * 
 * 功能特性：
 * - 权限信息修改
 * - 角色关联显示
 * - 权限使用影响分析
 * - 批量操作支持
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useDynamicPermissions } from '@/hooks/permissions/useDynamicPermissions';
import type { DynamicPermission } from '@/services/dynamicPermissionService';
import { 
  XMarkIcon, 
  PencilIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UserGroupIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

interface PermissionEditModalProps {
  isOpen: boolean;
  permission: DynamicPermission;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 权限编辑表单数据接口
 */
interface PermissionEditFormData {
  displayName: string;
  description: string;
  category: string;
}

/**
 * 权限分类选项 - 与动态分类系统保持一致
 */
const PERMISSION_CATEGORIES = [
  // 核心管理模块
  { value: '用户管理', label: '用户管理' },
  { value: '角色管理', label: '角色管理' },
  { value: '权限管理', label: '权限管理' },
  { value: '员工管理', label: '员工管理' },
  { value: '薪资管理', label: '薪资管理' },
  { value: '薪资操作', label: '薪资操作' },
  
  // 基础功能
  { value: '基础功能', label: '基础功能' },
  { value: '数据访问', label: '数据访问' },
  { value: '统计报表', label: '统计报表' },
  { value: '人力资源', label: '人力资源' },
  
  // 系统功能
  { value: '系统管理', label: '系统管理' },
  { value: '系统配置', label: '系统配置' },
  { value: '审计日志', label: '审计日志' },
  { value: '报表管理', label: '报表管理' },
  { value: '数据导入', label: '数据导入' },
  { value: '数据导出', label: '数据导出' },
  { value: '数据备份', label: '数据备份' },
  
  // 财务相关
  { value: '财务管理', label: '财务管理' },
  { value: '薪资核算', label: '薪资核算' },
  { value: '福利管理', label: '福利管理' },
  { value: '税务管理', label: '税务管理' },
  
  // 其他管理模块
  { value: '考勤管理', label: '考勤管理' },
  { value: '请假管理', label: '请假管理' },
  { value: '培训管理', label: '培训管理' },
  { value: '绩效管理', label: '绩效管理' },
  { value: '合同管理', label: '合同管理' },
  { value: '部门管理', label: '部门管理' },
  { value: '职位管理', label: '职位管理' },
  
  // 兜底选项
  { value: '其他功能', label: '其他功能' }
] as const;

export default function PermissionEditModal({ isOpen, permission, onClose, onSuccess }: PermissionEditModalProps) {
  const dynamicPermissions = useDynamicPermissions({
    autoLoad: false,
    enableCache: false
  });

  // 表单状态
  const [formData, setFormData] = useState<PermissionEditFormData>({
    displayName: '',
    description: '',
    category: '其他功能'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImpactWarning, setShowImpactWarning] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (isOpen && permission) {
      setFormData({
        displayName: permission.name,
        description: permission.description || '',
        category: permission.category || '其他功能'
      });
      setError(null);
      setIsSubmitting(false);
      setShowImpactWarning(permission.usedByRoles.length > 0);
    }
  }, [isOpen, permission]);

  /**
   * 检查是否有更改
   */
  const hasChanges = useMemo(() => {
    if (!permission) return false;
    
    return (
      formData.displayName !== permission.name ||
      formData.description !== (permission.description || '') ||
      formData.category !== (permission.category || '其他功能')
    );
  }, [formData, permission]);

  /**
   * 表单验证
   */
  const formValidation = useMemo(() => {
    const errors: string[] = [];

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
  }, [formData]);

  /**
   * 处理表单提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formValidation.isValid) {
      setError(formValidation.errors.join('；'));
      return;
    }

    if (!hasChanges) {
      setError('没有检测到任何更改');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // TODO: 实现实际的权限更新API调用
      // await updatePermission(permission.code, formData);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新权限失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 处理输入变更
   */
  const handleInputChange = (field: keyof PermissionEditFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  if (!isOpen || !permission) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        {/* 模态框头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <PencilIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">编辑权限</h3>
              <p className="text-sm text-base-content/70 font-mono">{permission.code}</p>
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

        {/* 权限基本信息 */}
        <div className="alert alert-info mb-6">
          <InformationCircleIcon className="w-5 h-5" />
          <div>
            <div className="font-medium">权限基本信息</div>
            <div className="text-sm mt-1 space-y-1">
              <div>权限代码: <code className="font-mono bg-base-200 px-1 rounded">{permission.code}</code> (不可修改)</div>
              <div>资源类型: {permission.resource || '未分类'}</div>
              <div>操作类型: {permission.action || '未分类'}</div>
              <div>创建时间: {new Date(permission.createdAt || Date.now()).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* 角色使用情况 */}
        {permission.usedByRoles.length > 0 && (
          <div className="card bg-base-200/50 mb-6">
            <div className="card-body py-4">
              <div className="flex items-center gap-2 mb-3">
                <UserGroupIcon className="w-4 h-4" />
                <span className="font-medium">角色使用情况</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {permission.usedByRoles.map(role => (
                  <span key={role} className="badge badge-primary badge-sm">{role}</span>
                ))}
              </div>
              {showImpactWarning && (
                <div className="mt-3 flex items-start gap-2 text-sm text-warning">
                  <ShieldExclamationIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>此权限正被 {permission.usedByRoles.length} 个角色使用，修改可能影响相关用户的系统访问权限</span>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 权限显示名称 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">显示名称 *</span>
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
              <span className="label-text font-medium">权限描述</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              rows={4}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="详细描述此权限的用途和范围"
            />
            <label className="label">
              <span className="label-text-alt">帮助用户理解权限的作用</span>
            </label>
          </div>

          {/* 权限分类 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">权限分类 *</span>
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
            <label className="label">
              <span className="label-text-alt">用于权限管理界面的分类组织</span>
            </label>
          </div>

          {/* 更改预览 */}
          {hasChanges && (
            <div className="alert alert-warning">
              <InformationCircleIcon className="w-5 h-5" />
              <div>
                <div className="font-medium">待保存的更改</div>
                <div className="text-sm mt-1 space-y-1">
                  {formData.displayName !== permission.name && (
                    <div>
                      显示名称: <span className="line-through">{permission.name}</span> → 
                      <span className="font-medium"> {formData.displayName}</span>
                    </div>
                  )}
                  {formData.description !== (permission.description || '') && (
                    <div>
                      描述: <span className="line-through">{permission.description || '(无)'}</span> → 
                      <span className="font-medium"> {formData.description || '(无)'}</span>
                    </div>
                  )}
                  {formData.category !== (permission.category || '其他功能') && (
                    <div>
                      分类: <span className="line-through">
                        {PERMISSION_CATEGORIES.find(c => c.value === (permission.category || '其他功能'))?.label}
                      </span> → 
                      <span className="font-medium">
                        {PERMISSION_CATEGORIES.find(c => c.value === formData.category)?.label}
                      </span>
                    </div>
                  )}
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
              disabled={isSubmitting || !formValidation.isValid || !hasChanges}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  保存中...
                </>
              ) : (
                '保存更改'
              )}
            </button>
          </div>
        </form>

        {/* 危险操作区域 */}
        <div className="divider divider-error">危险操作</div>
        <div className="card bg-error/5 border border-error/20">
          <div className="card-body py-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-error mb-1">删除权限</h4>
                <p className="text-sm text-base-content/70">
                  删除后无法恢复，如果权限正在使用中将影响相关用户访问
                </p>
              </div>
              <button 
                className="btn btn-error btn-sm"
                disabled={isSubmitting}
                onClick={() => {
                  // TODO: 实现权限删除确认对话框
                  console.log('删除权限:', permission.code);
                }}
              >
                删除权限
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}