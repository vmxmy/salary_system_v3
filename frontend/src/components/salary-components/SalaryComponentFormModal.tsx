/**
 * 薪资组件表单模态框
 * 支持创建和编辑薪资组件
 */

import React, { useEffect, useState } from 'react';
import { 
  useCreateSalaryComponent, 
  useUpdateSalaryComponent,
  type SalaryComponent,
  type CreateSalaryComponentRequest,
  type ComponentType,
  type ComponentCategory,
  type CopyStrategy,
  type StabilityLevel,
  COMPONENT_TYPE_CONFIG,
  COMPONENT_CATEGORY_CONFIG,
  COPY_STRATEGY_CONFIG,
  STABILITY_LEVEL_CONFIG,
} from '@/hooks/salary-components';

interface SalaryComponentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (component: SalaryComponent) => void;
  editingComponent?: SalaryComponent | null;
}

interface FormData {
  name: string;
  type: ComponentType;
  category: ComponentCategory;
  description: string;
  is_taxable: boolean;
  base_dependency: boolean;
  copy_strategy: CopyStrategy;
  stability_level: StabilityLevel;
  copy_notes: string;
}

const initialFormData: FormData = {
  name: '',
  type: 'earning',
  category: 'basic_salary',
  description: '',
  is_taxable: true,
  base_dependency: false,
  copy_strategy: 'auto',
  stability_level: 'fixed',
  copy_notes: '',
};

export function SalaryComponentFormModal({
  isOpen,
  onClose,
  onSuccess,
  editingComponent,
}: SalaryComponentFormModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const createMutation = useCreateSalaryComponent();
  const updateMutation = useUpdateSalaryComponent();

  const isEditing = !!editingComponent;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (editingComponent) {
        setFormData({
          name: editingComponent.name,
          type: editingComponent.type,
          category: editingComponent.category || 'basic_salary',
          description: editingComponent.description || '',
          is_taxable: editingComponent.is_taxable,
          base_dependency: editingComponent.base_dependency || false,
          copy_strategy: (editingComponent.copy_strategy as CopyStrategy) || 'auto',
          stability_level: (editingComponent.stability_level as StabilityLevel) || 'fixed',
          copy_notes: editingComponent.copy_notes || '',
        });
      } else {
        setFormData(initialFormData);
      }
      setErrors({});
    }
  }, [isOpen, editingComponent]);

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入组件名称';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = '组件名称不能超过50个字符';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = '描述不能超过200个字符';
    }

    if (formData.copy_notes && formData.copy_notes.length > 500) {
      newErrors.copy_notes = '复制说明不能超过500个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const submitData: CreateSalaryComponentRequest = {
        name: formData.name.trim(),
        type: formData.type,
        category: formData.category,
        description: formData.description.trim() || undefined,
        is_taxable: formData.is_taxable,
        base_dependency: formData.base_dependency,
        copy_strategy: formData.copy_strategy,
        stability_level: formData.stability_level,
        copy_notes: formData.copy_notes.trim() || undefined,
      };

      let result: SalaryComponent;
      
      if (isEditing) {
        result = await updateMutation.mutateAsync({
          id: editingComponent.id,
          ...submitData,
        });
      } else {
        result = await createMutation.mutateAsync(submitData);
      }

      onSuccess?.(result);
      onClose();
    } catch (error) {
      console.error('提交表单失败:', error);
    }
  };

  // 处理关闭
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl h-screen max-h-screen p-0 flex flex-col">
        {/* Header */}
        <div className="navbar bg-base-100 border-b">
          <div className="flex-1">
            <h3 className="text-lg font-bold">
              {isEditing ? '编辑薪资组件' : '新增薪资组件'}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="salary-component-form" onSubmit={handleSubmit} className="space-y-6">
            {/* 基本信息 */}
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <h4 className="card-title">基本信息</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">
                        组件名称 <span className="text-error">*</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      className={`input input-bordered ${errors.name ? 'input-error' : ''}`}
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="请输入薪资组件名称"
                      maxLength={50}
                    />
                    {errors.name && (
                      <label className="label">
                        <span className="label-text-alt text-error">{errors.name}</span>
                      </label>
                    )}
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">组件类型</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as ComponentType }))}
                    >
                      {Object.entries(COMPONENT_TYPE_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.icon} {config.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">组件类别</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as ComponentCategory }))}
                    >
                      {Object.entries(COMPONENT_CATEGORY_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                    <label className="label">
                      <span className="label-text-alt">
                        {COMPONENT_CATEGORY_CONFIG[formData.category]?.description}
                      </span>
                    </label>
                  </div>

                  {isEditing && editingComponent && (
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">组件ID</span>
                      </label>
                      <div className="font-mono text-sm opacity-70">{editingComponent.id}</div>
                    </div>
                  )}
                </div>

                {/* 描述说明 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">描述说明</span>
                  </label>
                  <textarea
                    className={`textarea textarea-bordered ${errors.description ? 'textarea-error' : ''}`}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="请输入组件描述（可选）"
                    rows={2}
                    maxLength={200}
                  />
                  {errors.description && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.description}</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* 属性配置 */}
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <h4 className="card-title">属性配置</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="stats shadow">
                    <div className="stat">
                      <div className="stat-title">税务属性</div>
                      <div className="stat-desc">是否需要缴纳个人所得税</div>
                      <div className="stat-actions">
                        <input
                          type="checkbox"
                          className="toggle toggle-primary"
                          checked={formData.is_taxable}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_taxable: e.target.checked }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="stats shadow">
                    <div className="stat">
                      <div className="stat-title">基数依赖</div>
                      <div className="stat-desc">是否依赖五险一金基数</div>
                      <div className="stat-actions">
                        <input
                          type="checkbox"
                          className="toggle toggle-secondary"
                          checked={formData.base_dependency}
                          onChange={(e) => setFormData(prev => ({ ...prev, base_dependency: e.target.checked }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="stats shadow">
                    <div className="stat">
                      <div className="stat-title">复制策略</div>
                      <div className="stat-desc">{COPY_STRATEGY_CONFIG[formData.copy_strategy].description}</div>
                      <div className="stat-actions">
                        <select
                          className="select select-bordered select-sm"
                          value={formData.copy_strategy}
                          onChange={(e) => setFormData(prev => ({ ...prev, copy_strategy: e.target.value as CopyStrategy }))}
                        >
                          {Object.entries(COPY_STRATEGY_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>
                              {config.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="stats shadow">
                    <div className="stat">
                      <div className="stat-title">稳定性级别</div>
                      <div className="stat-desc">{STABILITY_LEVEL_CONFIG[formData.stability_level].description}</div>
                      <div className="stat-actions">
                        <select
                          className="select select-bordered select-sm"
                          value={formData.stability_level}
                          onChange={(e) => setFormData(prev => ({ ...prev, stability_level: e.target.value as StabilityLevel }))}
                        >
                          {Object.entries(STABILITY_LEVEL_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>
                              {config.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 复制说明 */}
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <h4 className="card-title">复制说明</h4>
                <div className="form-control">
                  <textarea
                    className={`textarea textarea-bordered ${errors.copy_notes ? 'textarea-error' : ''}`}
                    value={formData.copy_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, copy_notes: e.target.value }))}
                    placeholder="请输入复制相关的说明信息（可选）"
                    rows={3}
                    maxLength={500}
                  />
                  {errors.copy_notes && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.copy_notes}</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

          {/* 错误信息显示 */}
          {(createMutation.error || updateMutation.error) && (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {(createMutation.error || updateMutation.error)?.message || '操作失败'}
              </span>
            </div>
          )}
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="navbar bg-base-100 border-t">
          <div className="navbar-end w-full">
            <div className="flex gap-2">
              <button
                type="button"
                className="btn"
                onClick={handleClose}
                disabled={isLoading}
              >
                取消
              </button>
              <button
                type="submit"
                form="salary-component-form"
                className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? '处理中...' : (isEditing ? '更新' : '创建')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}