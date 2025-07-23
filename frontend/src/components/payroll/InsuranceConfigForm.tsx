import React, { useEffect, useState, memo, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { 
  insuranceConfigCreateSchema,
  insuranceConfigUpdateSchema,
  InsuranceTypeEnum
} from '../../lib/validation/insuranceConfigSchema';
import { validateData } from '../../utils/validation';

/**
 * 五险一金配置表单组件
 * 专用于创建和编辑保险配置的表单
 */

export interface InsuranceConfig {
  id?: string;
  type: 'social_insurance' | 'housing_fund';
  code: string;
  name: string;
  description?: string;
  rates: {
    employee: number;
    employer: number;
    employer_additional?: number;
  };
  base_config: {
    method: string;
    min_field?: string;
    max_field?: string;
    percentage?: number;
    round_to?: number;
  };
  applicable_rules?: {
    departments?: string[];
    personnel_categories?: string[];
    date_range?: {
      from?: string;
      to?: string;
    };
  };
  is_active: boolean;
  effective_from?: string;
  effective_to?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InsuranceConfigFormProps {
  /** 表单模式：创建或编辑 */
  mode: 'create' | 'edit';
  /** 初始数据（编辑模式时使用） */
  initialData?: InsuranceConfig;
  /** 提交表单时的回调函数 */
  onSubmit: (data: InsuranceConfig) => Promise<void>;
  /** 取消时的回调函数 */
  onCancel?: () => void;
  /** 是否正在提交 */
  isSubmitting?: boolean;
  /** 是否只读模式 */
  readonly?: boolean;
  /** 可用的部门选项 */
  departmentOptions?: Array<{ value: string; label: string }>;
  /** 可用的人员类别选项 */
  personnelCategoryOptions?: Array<{ value: string; label: string }>;
  /** 额外的CSS类名 */
  className?: string;
}

const InsuranceConfigForm = memo(function InsuranceConfigForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  readonly = false,
  departmentOptions = [],
  personnelCategoryOptions = [],
  className = ''
}: InsuranceConfigFormProps) {
  
  // 表单数据状态
  const [formData, setFormData] = useState<InsuranceConfig>(() => ({
    type: 'social_insurance',
    code: '',
    name: '',
    description: '',
    rates: {
      employee: 0,
      employer: 0,
      employer_additional: 0
    },
    base_config: {
      method: 'fixed_amount',
      percentage: 100,
      round_to: 1
    },
    applicable_rules: {
      departments: [],
      personnel_categories: [],
      date_range: {}
    },
    is_active: true,
    effective_from: '',
    effective_to: '',
    ...initialData
  }));

  // 表单验证错误状态
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // 表单是否被修改
  const [isDirty, setIsDirty] = useState(false);

  // 当初始数据更改时更新表单数据
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  // 更新表单字段 - 使用 useCallback 优化
  const updateField = useCallback((path: string, value: any) => {
    if (readonly) return;
    
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
    
    setIsDirty(true);
    
    // 清除该字段的错误
    setErrors(prev => {
      if (prev[path]) {
        const newErrors = { ...prev };
        delete newErrors[path];
        return newErrors;
      }
      return prev;
    });
  }, [readonly]);

  // 表单验证
  const validateForm = (): boolean => {
    try {
      const schema = mode === 'create' ? insuranceConfigCreateSchema : insuranceConfigUpdateSchema;
      const result = validateData(formData, schema);
      
      if (!result.success) {
        const newErrors: Record<string, string> = {};
        result.errors.forEach((error: any) => {
          newErrors[error.path.join('.')] = error.message;
        });
        setErrors(newErrors);
        return false;
      }
      
      setErrors({});
      return true;
    } catch (error) {
      console.error('表单验证失败:', error);
      return false;
    }
  };

  // 处理表单提交
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('表单提交失败:', error);
    }
  };

  // 渲染错误信息
  const renderError = (fieldPath: string) => {
    const error = errors[fieldPath];
    return error ? (
      <div className="text-error text-sm mt-1">
        {error}
      </div>
    ) : null;
  };

  // 渲染百分比输入
  const renderPercentageInput = (
    label: string,
    value: number,
    onChange: (value: number) => void,
    fieldPath: string
  ) => (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-medium">{label}</span>
      </label>
      <div className="input-group">
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          className={`input input-bordered flex-1 ${errors[fieldPath] ? 'input-error' : ''}`}
          value={(value * 100).toFixed(2)}
          onChange={(e) => onChange(parseFloat(e.target.value) / 100 || 0)}
          disabled={readonly || isSubmitting}
        />
        <span className="bg-base-200 px-3 flex items-center">%</span>
      </div>
      {renderError(fieldPath)}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* 基本信息 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-base">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 保险类型 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">保险类型 *</span>
              </label>
              <select
                className={`select select-bordered ${errors.type ? 'select-error' : ''}`}
                value={formData.type}
                onChange={(e) => updateField('type', e.target.value)}
                disabled={readonly || isSubmitting}
              >
                <option value="social_insurance">社会保险</option>
                <option value="housing_fund">住房公积金</option>
              </select>
              {renderError('type')}
            </div>

            {/* 配置代码 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">配置代码 *</span>
              </label>
              <input
                type="text"
                className={`input input-bordered ${errors.code ? 'input-error' : ''}`}
                value={formData.code}
                onChange={(e) => updateField('code', e.target.value)}
                disabled={readonly || isSubmitting || mode === 'edit'}
                placeholder="例如：pension_insurance"
              />
              {renderError('code')}
            </div>

            {/* 配置名称 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">配置名称 *</span>
              </label>
              <input
                type="text"
                className={`input input-bordered ${errors.name ? 'input-error' : ''}`}
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                disabled={readonly || isSubmitting}
                placeholder="例如：养老保险"
              />
              {renderError('name')}
            </div>

            {/* 启用状态 */}
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text font-medium">启用状态</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={formData.is_active}
                  onChange={(e) => updateField('is_active', e.target.checked)}
                  disabled={readonly || isSubmitting}
                />
              </label>
            </div>
          </div>

          {/* 描述 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">描述</span>
            </label>
            <textarea
              className={`textarea textarea-bordered ${errors.description ? 'textarea-error' : ''}`}
              rows={3}
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              disabled={readonly || isSubmitting}
              placeholder="配置说明..."
            />
            {renderError('description')}
          </div>
        </div>
      </div>

      {/* 费率配置 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-base">费率配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderPercentageInput(
              '个人费率 *',
              formData.rates.employee,
              (value) => updateField('rates.employee', value),
              'rates.employee'
            )}
            
            {renderPercentageInput(
              '单位费率 *',
              formData.rates.employer,
              (value) => updateField('rates.employer', value),
              'rates.employer'
            )}
            
            {renderPercentageInput(
              '单位补充费率',
              formData.rates.employer_additional || 0,
              (value) => updateField('rates.employer_additional', value),
              'rates.employer_additional'
            )}
          </div>
        </div>
      </div>

      {/* 基数配置 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-base">基数配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 计算方法 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">计算方法 *</span>
              </label>
              <select
                className={`select select-bordered ${errors['base_config.method'] ? 'select-error' : ''}`}
                value={formData.base_config.method}
                onChange={(e) => updateField('base_config.method', e.target.value)}
                disabled={readonly || isSubmitting}
              >
                <option value="fixed_amount">固定金额</option>
                <option value="salary_percentage">工资百分比</option>
                <option value="monthly_salary">月工资</option>
                <option value="custom_field">自定义字段</option>
              </select>
              {renderError('base_config.method')}
            </div>

            {/* 基数百分比 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">基数百分比</span>
              </label>
              <div className="input-group">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className={`input input-bordered flex-1 ${errors['base_config.percentage'] ? 'input-error' : ''}`}
                  value={formData.base_config.percentage || 100}
                  onChange={(e) => updateField('base_config.percentage', parseFloat(e.target.value) || 100)}
                  disabled={readonly || isSubmitting}
                />
                <span className="bg-base-200 px-3 flex items-center">%</span>
              </div>
              {renderError('base_config.percentage')}
            </div>

            {/* 最小值字段 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">最小值字段</span>
              </label>
              <input
                type="text"
                className={`input input-bordered ${errors['base_config.min_field'] ? 'input-error' : ''}`}
                value={formData.base_config.min_field || ''}
                onChange={(e) => updateField('base_config.min_field', e.target.value)}
                disabled={readonly || isSubmitting}
                placeholder="例如：min_insurance_base"
              />
              {renderError('base_config.min_field')}
            </div>

            {/* 最大值字段 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">最大值字段</span>
              </label>
              <input
                type="text"
                className={`input input-bordered ${errors['base_config.max_field'] ? 'input-error' : ''}`}
                value={formData.base_config.max_field || ''}
                onChange={(e) => updateField('base_config.max_field', e.target.value)}
                disabled={readonly || isSubmitting}
                placeholder="例如：max_insurance_base"
              />
              {renderError('base_config.max_field')}
            </div>
          </div>
        </div>
      </div>

      {/* 生效期间 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-base">生效期间</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">生效开始日期</span>
              </label>
              <input
                type="date"
                className={`input input-bordered ${errors.effective_from ? 'input-error' : ''}`}
                value={formData.effective_from || ''}
                onChange={(e) => updateField('effective_from', e.target.value)}
                disabled={readonly || isSubmitting}
              />
              {renderError('effective_from')}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">生效结束日期</span>
              </label>
              <input
                type="date"
                className={`input input-bordered ${errors.effective_to ? 'input-error' : ''}`}
                value={formData.effective_to || ''}
                onChange={(e) => updateField('effective_to', e.target.value)}
                disabled={readonly || isSubmitting}
              />
              {renderError('effective_to')}
            </div>
          </div>
        </div>
      </div>

      {/* 表单操作按钮 */}
      {!readonly && (
        <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
          {onCancel && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              取消
            </button>
          )}
          
          <button
            type="submit"
            className={`btn btn-primary ${isSubmitting ? 'loading' : ''}`}
            disabled={isSubmitting || (!isDirty && mode === 'edit')}
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : null}
            {isSubmitting ? '保存中...' : mode === 'create' ? '创建' : '保存'}
          </button>
        </div>
      )}
    </form>
  );
});

export { InsuranceConfigForm };
export default InsuranceConfigForm;