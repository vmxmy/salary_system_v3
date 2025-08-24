/**
 * 资源管理模态框组件
 * 
 * 用于创建和编辑权限资源的对话框
 */

import React, { useState, useEffect, useMemo } from 'react';
import { usePermissionResource } from '@/hooks/permissions/usePermissionResource';
import { useResourceTree } from '@/hooks/permissions/useResourceTree';
import { PermissionCodeGenerator } from './PermissionCodeGenerator';
import type { 
  ResourceManagementModalProps, 
  PermissionResourceFormData,
  PermissionResource 
} from '@/types/permission-resource';

export function ResourceManagementModal({
  isOpen,
  onClose,
  resource,
  parentResource,
  onSave,
  mode
}: ResourceManagementModalProps) {
  // 表单状态
  const [formData, setFormData] = useState<PermissionResourceFormData>({
    resource_code: '',
    resource_name: '',
    resource_type: 'page',
    parent_id: undefined,
    description: '',
    metadata: {},
    is_active: true
  });
  const [errors, setErrors] = useState<Partial<PermissionResourceFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hooks
  const { 
    createResource, 
    updateResource, 
    validateResourceCode,
    loading 
  } = usePermissionResource();
  
  const { treeData } = useResourceTree();

  // 可选的父资源列表
  const parentOptions = useMemo(() => {
    const flattenTree = (nodes: typeof treeData, level: number = 0): Array<{
      id: string;
      label: string;
      level: number;
      disabled: boolean;
    }> => {
      const result: Array<{
        id: string;
        label: string;
        level: number;
        disabled: boolean;
      }> = [];

      nodes.forEach(node => {
        // 编辑模式下，不能选择自己或自己的子节点作为父节点
        const isDisabled = mode === 'edit' && resource && (
          node.key === resource.id || 
          isDescendant(node.key, resource.id, treeData)
        );

        result.push({
          id: node.key,
          label: node.label,
          level,
          disabled: isDisabled || false
        });

        if (node.children) {
          result.push(...flattenTree(node.children, level + 1));
        }
      });

      return result;
    };

    return flattenTree(treeData);
  }, [treeData, mode, resource]);

  // 初始化表单数据
  useEffect(() => {
    if (mode === 'edit' && resource) {
      setFormData({
        resource_code: resource.resource_code,
        resource_name: resource.resource_name,
        resource_type: resource.resource_type,
        parent_id: resource.parent_id || undefined,
        description: resource.description || '',
        metadata: resource.metadata || {},
        is_active: resource.is_active
      });
    } else if (mode === 'create') {
      setFormData({
        resource_code: '',
        resource_name: '',
        resource_type: 'page',
        parent_id: parentResource?.id || undefined,
        description: '',
        metadata: {},
        is_active: true
      });
    }
    setErrors({});
  }, [mode, resource, parentResource, isOpen]);

  // 表单验证
  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    // 必填字段验证
    if (!formData.resource_code.trim()) {
      newErrors.resource_code = '资源代码不能为空';
    } else if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/.test(formData.resource_code)) {
      newErrors.resource_code = '资源代码格式不正确，应使用小写字母、数字和点号';
    } else if (mode === 'create' || (mode === 'edit' && resource?.resource_code !== formData.resource_code)) {
      // 验证资源代码唯一性
      const validation = await validateResourceCode(formData.resource_code);
      if (!validation.valid) {
        newErrors.resource_code = validation.message || '资源代码验证失败';
      }
    }

    if (!formData.resource_name.trim()) {
      newErrors.resource_name = '资源名称不能为空';
    }

    if (!formData.resource_type) {
      newErrors.resource_type = '请选择资源类型';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!(await validateForm())) {
      return;
    }

    setIsSubmitting(true);
    try {
      let savedResource: PermissionResource;

      if (mode === 'create') {
        savedResource = await createResource(formData);
      } else {
        savedResource = await updateResource(resource!.id, formData);
      }

      onSave?.(savedResource);
      onClose();
    } catch (error) {
      console.error('保存资源失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (field: keyof PermissionResourceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // 自动生成资源代码
  const handleCodeGeneration = (generatedCode: string) => {
    handleInputChange('resource_code', generatedCode);
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        <h3 className="font-bold text-lg mb-6">
          {mode === 'create' ? '创建权限资源' : '编辑权限资源'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 资源代码 */}
            <div className="col-span-2">
              <label className="label">
                <span className="label-text">资源代码 <span className="text-error">*</span></span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`input input-bordered flex-1 ${errors.resource_code ? 'input-error' : ''}`}
                  value={formData.resource_code}
                  onChange={(e) => handleInputChange('resource_code', e.target.value)}
                  placeholder="例如: page.employee-management"
                />
                <PermissionCodeGenerator
                  resourceCode=""
                  actionType="view"
                  onCodeGenerated={handleCodeGeneration}
                  autoGenerate={false}
                  className="btn btn-outline btn-sm"
                />
              </div>
              {errors.resource_code && (
                <div className="label">
                  <span className="label-text-alt text-error">{errors.resource_code}</span>
                </div>
              )}
              <div className="label">
                <span className="label-text-alt">使用小写字母、数字和点号，如：page.employee-management</span>
              </div>
            </div>

            {/* 资源名称 */}
            <div>
              <label className="label">
                <span className="label-text">资源名称 <span className="text-error">*</span></span>
              </label>
              <input
                type="text"
                className={`input input-bordered w-full ${errors.resource_name ? 'input-error' : ''}`}
                value={formData.resource_name}
                onChange={(e) => handleInputChange('resource_name', e.target.value)}
                placeholder="输入资源名称"
              />
              {errors.resource_name && (
                <div className="label">
                  <span className="label-text-alt text-error">{errors.resource_name}</span>
                </div>
              )}
            </div>

            {/* 资源类型 */}
            <div>
              <label className="label">
                <span className="label-text">资源类型 <span className="text-error">*</span></span>
              </label>
              <select
                className={`select select-bordered w-full ${errors.resource_type ? 'select-error' : ''}`}
                value={formData.resource_type}
                onChange={(e) => handleInputChange('resource_type', e.target.value)}
              >
                <option value="page">页面</option>
                <option value="action">操作</option>
                <option value="data">数据</option>
                <option value="api">接口</option>
                <option value="feature">功能</option>
              </select>
              {errors.resource_type && (
                <div className="label">
                  <span className="label-text-alt text-error">{errors.resource_type}</span>
                </div>
              )}
            </div>

            {/* 父资源 */}
            <div className="col-span-2">
              <label className="label">
                <span className="label-text">父资源</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={formData.parent_id || ''}
                onChange={(e) => handleInputChange('parent_id', e.target.value || undefined)}
              >
                <option value="">无父资源（根级资源）</option>
                {parentOptions.map(option => (
                  <option 
                    key={option.id} 
                    value={option.id}
                    disabled={option.disabled}
                  >
                    {'  '.repeat(option.level)}{option.label}
                  </option>
                ))}
              </select>
              <div className="label">
                <span className="label-text-alt">选择此资源的父级资源</span>
              </div>
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label className="label">
              <span className="label-text">描述</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="输入资源描述（可选）"
              rows={3}
            />
          </div>

          {/* 状态 */}
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">启用状态</span>
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
              />
            </label>
          </div>

          {/* 资源类型说明 */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="font-medium mb-2">资源类型说明</h4>
            <div className="text-sm space-y-1">
              <div><strong>页面:</strong> 前端页面或路由资源</div>
              <div><strong>操作:</strong> 用户可执行的业务操作</div>
              <div><strong>数据:</strong> 数据访问范围控制</div>
              <div><strong>接口:</strong> API 端点访问控制</div>
              <div><strong>功能:</strong> 系统功能模块</div>
            </div>
          </div>

          {/* 预览信息 */}
          {formData.resource_code && formData.resource_name && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium text-primary mb-2">预览</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">资源代码:</span> 
                  <code className="ml-2 text-primary">{formData.resource_code}</code>
                </div>
                <div>
                  <span className="font-medium">资源名称:</span> 
                  <span className="ml-2">{formData.resource_name}</span>
                </div>
                <div>
                  <span className="font-medium">资源类型:</span> 
                  <span className="ml-2">{getResourceTypeLabel(formData.resource_type)}</span>
                </div>
                {formData.parent_id && (
                  <div>
                    <span className="font-medium">父资源:</span> 
                    <span className="ml-2">
                      {parentOptions.find(p => p.id === formData.parent_id)?.label || '未知'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 按钮组 */}
          <div className="modal-action">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || loading}
            >
              {isSubmitting && <span className="loading loading-spinner loading-sm"></span>}
              {mode === 'create' ? '创建' : '保存'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 辅助函数：检查是否为子节点
function isDescendant(nodeId: string, ancestorId: string, treeData: any[]): boolean {
  const findNode = (nodes: any[], id: string): any => {
    for (const node of nodes) {
      if (node.key === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const checkDescendant = (node: any): boolean => {
    if (!node.children) return false;
    
    for (const child of node.children) {
      if (child.key === nodeId) return true;
      if (checkDescendant(child)) return true;
    }
    return false;
  };

  const ancestorNode = findNode(treeData, ancestorId);
  return ancestorNode ? checkDescendant(ancestorNode) : false;
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