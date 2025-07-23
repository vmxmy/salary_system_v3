import React, { useEffect, useState, memo, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { 
  taxConfigCreateSchema,
  taxConfigUpdateSchema,
  TaxTypeEnum
} from '../../lib/validation/taxConfigSchema';
import { validateData } from '../../utils/validation';

/**
 * 个税配置表单组件
 * 专用于创建和编辑个人所得税配置的表单
 */

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
  deduction: number;
}

export interface TaxExemptions {
  basic: number;
  special_deductions: {
    child_education: { max: number; per_child: number };
    continuing_education: { max: number };
    medical: { max: number };
    housing_loan: { max: number };
    housing_rent: { max: number };
    elderly_care: { max: number };
  };
}

export interface TaxConfig {
  id?: string;
  tax_type: 'income_tax' | 'year_end_bonus' | 'labor_income' | 'author_income';
  region: string;
  description?: string;
  brackets: TaxBracket[];
  exemptions: TaxExemptions;
  is_active: boolean;
  effective_from: string;
  effective_to?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaxConfigFormProps {
  /** 表单模式：创建或编辑 */
  mode: 'create' | 'edit';
  /** 初始数据（编辑模式时使用） */
  initialData?: TaxConfig;
  /** 提交表单时的回调函数 */
  onSubmit: (data: TaxConfig) => Promise<void>;
  /** 取消时的回调函数 */
  onCancel?: () => void;
  /** 是否正在提交 */
  isSubmitting?: boolean;
  /** 是否只读模式 */
  readonly?: boolean;
  /** 额外的CSS类名 */
  className?: string;
}

const TaxConfigForm = memo(function TaxConfigForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  readonly = false,
  className = ''
}: TaxConfigFormProps) {
  
  // 默认税率表 - 使用 useMemo 进行优化
  const defaultBrackets: TaxBracket[] = useMemo(() => [
    { min: 0, max: 3000, rate: 0.03, deduction: 0 },
    { min: 3000, max: 12000, rate: 0.1, deduction: 210 },
    { min: 12000, max: 25000, rate: 0.2, deduction: 1410 },
    { min: 25000, max: 35000, rate: 0.25, deduction: 2660 },
    { min: 35000, max: 55000, rate: 0.3, deduction: 4410 },
    { min: 55000, max: 80000, rate: 0.35, deduction: 7160 },
    { min: 80000, max: null, rate: 0.45, deduction: 15160 }
  ], []);

  // 默认免税额和专项扣除 - 使用 useMemo 进行优化
  const defaultExemptions: TaxExemptions = useMemo(() => ({
    basic: 5000,
    special_deductions: {
      child_education: { max: 12000, per_child: 1000 },
      continuing_education: { max: 4800 },
      medical: { max: 80000 },
      housing_loan: { max: 12000 },
      housing_rent: { max: 18000 },
      elderly_care: { max: 24000 }
    }
  }), []);

  // 表单数据状态
  const [formData, setFormData] = useState<TaxConfig>(() => ({
    tax_type: 'income_tax',
    region: '',
    description: '',
    brackets: defaultBrackets,
    exemptions: defaultExemptions,
    is_active: true,
    effective_from: new Date().toISOString().split('T')[0],
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

  // 更新税率级数 - 使用 useCallback 优化
  const updateBracket = useCallback((index: number, field: keyof TaxBracket, value: number | null) => {
    if (readonly) return;
    
    const newBrackets = [...formData.brackets];
    newBrackets[index] = {
      ...newBrackets[index],
      [field]: value
    };
    
    updateField('brackets', newBrackets);
  }, [readonly, formData.brackets, updateField]);

  // 添加税率级数 - 使用 useCallback 优化
  const addBracket = useCallback(() => {
    if (readonly) return;
    
    const lastBracket = formData.brackets[formData.brackets.length - 1];
    const newBracket: TaxBracket = {
      min: lastBracket.max || 0,
      max: null,
      rate: lastBracket.rate,
      deduction: lastBracket.deduction
    };
    
    updateField('brackets', [...formData.brackets, newBracket]);
  }, [readonly, formData.brackets, updateField]);

  // 删除税率级数 - 使用 useCallback 优化
  const removeBracket = useCallback((index: number) => {
    if (readonly || formData.brackets.length <= 1) return;
    
    const newBrackets = formData.brackets.filter((_, i) => i !== index);
    updateField('brackets', newBrackets);
  }, [readonly, formData.brackets, updateField]);

  // 表单验证 - 使用 useCallback 优化
  const validateForm = useCallback((): boolean => {
    try {
      const schema = mode === 'create' ? taxConfigCreateSchema : taxConfigUpdateSchema;
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
  }, [mode, formData]);

  // 处理表单提交 - 使用 useCallback 优化
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('表单提交失败:', error);
    }
  }, [validateForm, onSubmit, formData]);

  // 渲染错误信息 - 使用 useCallback 优化
  const renderError = useCallback((fieldPath: string) => {
    const error = errors[fieldPath];
    return error ? (
      <div className="text-error text-sm mt-1">
        {error}
      </div>
    ) : null;
  }, [errors]);

  // 获取税种标签 - 使用 useCallback 优化
  const getTaxTypeLabel = useCallback((type: string) => {
    const labels: Record<string, string> = {
      income_tax: '综合所得税',
      year_end_bonus: '年终奖税',
      labor_income: '劳务报酬税',
      author_income: '稿酬所得税'
    };
    return labels[type] || type;
  }, []);

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* 基本信息 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-base">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 税种类型 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">税种类型 *</span>
              </label>
              <select
                className={`select select-bordered ${errors.tax_type ? 'select-error' : ''}`}
                value={formData.tax_type}
                onChange={(e) => updateField('tax_type', e.target.value)}
                disabled={readonly || isSubmitting}
              >
                <option value="income_tax">综合所得税</option>
                <option value="year_end_bonus">年终奖税</option>
                <option value="labor_income">劳务报酬税</option>
                <option value="author_income">稿酬所得税</option>
              </select>
              {renderError('tax_type')}
            </div>

            {/* 适用地区 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">适用地区 *</span>
              </label>
              <input
                type="text"
                className={`input input-bordered ${errors.region ? 'input-error' : ''}`}
                value={formData.region}
                onChange={(e) => updateField('region', e.target.value)}
                disabled={readonly || isSubmitting}
                placeholder="例如：全国"
              />
              {renderError('region')}
            </div>

            {/* 生效日期 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">生效日期 *</span>
              </label>
              <input
                type="date"
                className={`input input-bordered ${errors.effective_from ? 'input-error' : ''}`}
                value={formData.effective_from}
                onChange={(e) => updateField('effective_from', e.target.value)}
                disabled={readonly || isSubmitting}
              />
              {renderError('effective_from')}
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

      {/* 税率表配置 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h3 className="card-title text-base">税率表配置</h3>
            {!readonly && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={addBracket}
                disabled={isSubmitting}
              >
                添加级数
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>级数</th>
                  <th>起征金额</th>
                  <th>上限金额</th>
                  <th>税率</th>
                  <th>速算扣除数</th>
                  {!readonly && <th>操作</th>}
                </tr>
              </thead>
              <tbody>
                {formData.brackets.map((bracket, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      {readonly ? (
                        <span>¥{bracket.min.toLocaleString()}</span>
                      ) : (
                        <input
                          type="number"
                          className="input input-bordered input-xs w-24"
                          value={bracket.min}
                          onChange={(e) => updateBracket(index, 'min', parseFloat(e.target.value) || 0)}
                          disabled={isSubmitting}
                        />
                      )}
                    </td>
                    <td>
                      {readonly ? (
                        <span>{bracket.max === null ? '无上限' : `¥${bracket.max.toLocaleString()}`}</span>
                      ) : (
                        <input
                          type="number"
                          className="input input-bordered input-xs w-24"
                          value={bracket.max || ''}
                          onChange={(e) => updateBracket(index, 'max', e.target.value ? parseFloat(e.target.value) : null)}
                          disabled={isSubmitting}
                          placeholder="无上限"
                        />
                      )}
                    </td>
                    <td>
                      {readonly ? (
                        <span>{(bracket.rate * 100).toFixed(2)}%</span>
                      ) : (
                        <div className="input-group input-group-xs">
                          <input
                            type="number"
                            step="0.01"
                            className="input input-bordered w-16"
                            value={(bracket.rate * 100).toFixed(2)}
                            onChange={(e) => updateBracket(index, 'rate', (parseFloat(e.target.value) || 0) / 100)}
                            disabled={isSubmitting}
                          />
                          <span className="bg-base-200 px-1">%</span>
                        </div>
                      )}
                    </td>
                    <td>
                      {readonly ? (
                        <span>¥{bracket.deduction.toLocaleString()}</span>
                      ) : (
                        <input
                          type="number"
                          className="input input-bordered input-xs w-24"
                          value={bracket.deduction}
                          onChange={(e) => updateBracket(index, 'deduction', parseFloat(e.target.value) || 0)}
                          disabled={isSubmitting}
                        />
                      )}
                    </td>
                    {!readonly && (
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => removeBracket(index)}
                          disabled={isSubmitting || formData.brackets.length <= 1}
                        >
                          删除
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 免税额和专项扣除配置 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-base mb-4">免税额和专项扣除</h3>
          
          {/* 基本免征额 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">基本免征额</span>
            </label>
            <div className="input-group">
              <span className="bg-base-200 px-3 flex items-center">¥</span>
              <input
                type="number"
                className={`input input-bordered flex-1 ${errors['exemptions.basic'] ? 'input-error' : ''}`}
                value={formData.exemptions.basic}
                onChange={(e) => updateField('exemptions.basic', parseFloat(e.target.value) || 0)}
                disabled={readonly || isSubmitting}
              />
            </div>
            {renderError('exemptions.basic')}
          </div>

          {/* 专项扣除 */}
          <div className="divider">专项扣除限额</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 子女教育 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">子女教育（年度最高/每个子女月度）</span>
              </label>
              <div className="flex gap-2">
                <div className="input-group input-group-sm flex-1">
                  <span className="bg-base-200 px-2 text-xs">¥</span>
                  <input
                    type="number"
                    className="input input-bordered input-sm"
                    value={formData.exemptions.special_deductions.child_education.max}
                    onChange={(e) => updateField('exemptions.special_deductions.child_education.max', parseFloat(e.target.value) || 0)}
                    disabled={readonly || isSubmitting}
                    placeholder="年度最高"
                  />
                </div>
                <div className="input-group input-group-sm flex-1">
                  <span className="bg-base-200 px-2 text-xs">¥</span>
                  <input
                    type="number"
                    className="input input-bordered input-sm"
                    value={formData.exemptions.special_deductions.child_education.per_child}
                    onChange={(e) => updateField('exemptions.special_deductions.child_education.per_child', parseFloat(e.target.value) || 0)}
                    disabled={readonly || isSubmitting}
                    placeholder="每子女/月"
                  />
                </div>
              </div>
            </div>

            {/* 继续教育 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">继续教育（年度最高）</span>
              </label>
              <div className="input-group input-group-sm">
                <span className="bg-base-200 px-2 text-xs">¥</span>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  value={formData.exemptions.special_deductions.continuing_education.max}
                  onChange={(e) => updateField('exemptions.special_deductions.continuing_education.max', parseFloat(e.target.value) || 0)}
                  disabled={readonly || isSubmitting}
                />
              </div>
            </div>

            {/* 大病医疗 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">大病医疗（年度最高）</span>
              </label>
              <div className="input-group input-group-sm">
                <span className="bg-base-200 px-2 text-xs">¥</span>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  value={formData.exemptions.special_deductions.medical.max}
                  onChange={(e) => updateField('exemptions.special_deductions.medical.max', parseFloat(e.target.value) || 0)}
                  disabled={readonly || isSubmitting}
                />
              </div>
            </div>

            {/* 住房贷款利息 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">住房贷款利息（年度最高）</span>
              </label>
              <div className="input-group input-group-sm">
                <span className="bg-base-200 px-2 text-xs">¥</span>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  value={formData.exemptions.special_deductions.housing_loan.max}
                  onChange={(e) => updateField('exemptions.special_deductions.housing_loan.max', parseFloat(e.target.value) || 0)}
                  disabled={readonly || isSubmitting}
                />
              </div>
            </div>

            {/* 住房租金 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">住房租金（年度最高）</span>
              </label>
              <div className="input-group input-group-sm">
                <span className="bg-base-200 px-2 text-xs">¥</span>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  value={formData.exemptions.special_deductions.housing_rent.max}
                  onChange={(e) => updateField('exemptions.special_deductions.housing_rent.max', parseFloat(e.target.value) || 0)}
                  disabled={readonly || isSubmitting}
                />
              </div>
            </div>

            {/* 赡养老人 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">赡养老人（年度最高）</span>
              </label>
              <div className="input-group input-group-sm">
                <span className="bg-base-200 px-2 text-xs">¥</span>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  value={formData.exemptions.special_deductions.elderly_care.max}
                  onChange={(e) => updateField('exemptions.special_deductions.elderly_care.max', parseFloat(e.target.value) || 0)}
                  disabled={readonly || isSubmitting}
                />
              </div>
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

export { TaxConfigForm };
export default TaxConfigForm;