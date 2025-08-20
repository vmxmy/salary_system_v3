import React, { useState, useCallback, useEffect } from 'react';
import type { InsuranceTypeInfo, InsuranceRuleConfig, EmployeeCategory } from '@/types/insurance';

interface InsuranceRuleCardProps {
  insuranceType: InsuranceTypeInfo;
  category: EmployeeCategory;
  rule?: InsuranceRuleConfig | null;
  parentRule?: InsuranceRuleConfig | null; // 父类别的规则（用于继承）
  onSave: (rule: InsuranceRuleConfig) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
  loading?: boolean;
  canInherit?: boolean; // 是否可以继承父类别规则
}

/**
 * 保险规则配置卡片组件
 * 用于配置单个保险类型对特定员工类别的适用规则
 */
const InsuranceRuleCard: React.FC<InsuranceRuleCardProps> = ({
  insuranceType,
  category,
  rule,
  parentRule,
  onSave,
  onDelete,
  loading = false,
  canInherit = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<InsuranceRuleConfig>({
    insurance_type_id: insuranceType.id,
    employee_category_id: category.id,
    is_applicable: rule?.is_applicable ?? true,
    employee_rate: rule?.employee_rate ?? 0,
    employer_rate: rule?.employer_rate ?? 0,
    base_floor: rule?.base_floor ?? 0,
    base_ceiling: rule?.base_ceiling ?? undefined,
    effective_date: rule?.effective_date ?? new Date().toISOString().split('T')[0],
    end_date: rule?.end_date ?? undefined,
    description: rule?.description ?? ''
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 同步外部数据变化
  useEffect(() => {
    if (rule) {
      setFormData({
        id: rule.id,
        insurance_type_id: insuranceType.id,
        employee_category_id: category.id,
        is_applicable: rule.is_applicable,
        employee_rate: rule.employee_rate ?? 0,
        employer_rate: rule.employer_rate ?? 0,
        base_floor: rule.base_floor ?? 0,
        base_ceiling: rule.base_ceiling,
        effective_date: rule.effective_date ?? new Date().toISOString().split('T')[0],
        end_date: rule.end_date,
        description: rule.description ?? ''
      });
    }
  }, [rule, insuranceType.id, category.id]);

  // 表单验证
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.employee_rate !== undefined && formData.employee_rate !== null && 
        (formData.employee_rate < 0 || formData.employee_rate > 1)) {
      newErrors.employee_rate = '个人费率必须在 0-100% 之间';
    }

    if (formData.employer_rate !== undefined && formData.employer_rate !== null && 
        (formData.employer_rate < 0 || formData.employer_rate > 1)) {
      newErrors.employer_rate = '单位费率必须在 0-100% 之间';
    }

    if (formData.base_floor !== undefined && formData.base_floor !== null && formData.base_floor < 0) {
      newErrors.base_floor = '基数下限不能为负数';
    }

    if (formData.base_ceiling !== undefined && formData.base_ceiling !== null && 
        formData.base_floor !== undefined && formData.base_floor !== null && 
        formData.base_ceiling <= formData.base_floor) {
      newErrors.base_ceiling = '基数上限必须大于下限';
    }

    if (formData.end_date && formData.effective_date && formData.end_date <= formData.effective_date) {
      newErrors.end_date = '结束日期必须晚于生效日期';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // 保存规则
  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const success = await onSave(formData);
      if (success) {
        setIsEditing(false);
        setErrors({});
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  }, [formData, onSave, validateForm]);

  // 取消编辑
  const handleCancel = useCallback(() => {
    if (rule) {
      setFormData({
        id: rule.id,
        insurance_type_id: insuranceType.id,
        employee_category_id: category.id,
        is_applicable: rule.is_applicable,
        employee_rate: rule.employee_rate ?? 0,
        employer_rate: rule.employer_rate ?? 0,
        base_floor: rule.base_floor ?? 0,
        base_ceiling: rule.base_ceiling,
        effective_date: rule.effective_date ?? new Date().toISOString().split('T')[0],
        end_date: rule.end_date,
        description: rule.description ?? ''
      });
    }
    setIsEditing(false);
    setErrors({});
  }, [rule, insuranceType.id, category.id]);

  // 继承父类别规则
  const handleInheritFromParent = useCallback(() => {
    if (parentRule) {
      setFormData(prev => ({
        ...prev,
        is_applicable: parentRule.is_applicable,
        employee_rate: parentRule.employee_rate ?? 0,
        employer_rate: parentRule.employer_rate ?? 0,
        base_floor: parentRule.base_floor ?? 0,
        base_ceiling: parentRule.base_ceiling,
        description: `继承自 ${category.parent_name}: ${parentRule.description || ''}`
      }));
    }
  }, [parentRule, category.parent_name]);

  // 删除规则
  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    
    const confirmed = window.confirm(`确定要删除 ${insuranceType.name} 对 ${category.name} 的规则配置吗？`);
    if (confirmed) {
      await onDelete();
    }
  }, [onDelete, insuranceType.name, category.name]);

  // 格式化费率显示
  const formatRate = (rate?: number | null): string => {
    if (rate === undefined || rate === null) return '-';
    return `${(rate * 100).toFixed(2)}%`;
  };

  // 格式化金额显示
  const formatAmount = (amount?: number | null): string => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  return (
    <div className={`
      card bg-base-100 border border-base-300 shadow-sm
      ${formData.is_applicable ? 'border-success/20' : 'border-warning/20'}
      ${isEditing ? 'border-primary' : ''}
    `}>
      {/* 卡片头部 */}
      <div className="card-body p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="card-title text-base">{insuranceType.name}</h4>
            <p className="text-sm text-base-content/60">
              {category.name}
              {category.parent_name && ` (${category.parent_name})`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 适用状态 */}
            <div className={`
              badge badge-sm
              ${formData.is_applicable ? 'badge-success' : 'badge-warning'}
            `}>
              {formData.is_applicable ? '适用' : '不适用'}
            </div>

            {/* 操作按钮 */}
            {!isEditing ? (
              <div className="flex gap-1">
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => setIsEditing(true)}
                  disabled={loading}
                  title="编辑规则"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                
                {rule && onDelete && (
                  <button
                    className="btn btn-ghost btn-xs text-error"
                    onClick={handleDelete}
                    disabled={loading}
                    title="删除规则"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex gap-1">
                <button
                  className="btn btn-primary btn-xs"
                  onClick={handleSave}
                  disabled={saving}
                  title="保存规则"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={handleCancel}
                  disabled={saving}
                  title="取消编辑"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 规则内容 */}
        {!isEditing ? (
          // 只读模式
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-base-content/60">个人费率:</span>
              <span className="ml-2 font-medium">{formatRate(formData.employee_rate)}</span>
            </div>
            <div>
              <span className="text-base-content/60">单位费率:</span>
              <span className="ml-2 font-medium">{formatRate(formData.employer_rate)}</span>
            </div>
            <div>
              <span className="text-base-content/60">基数下限:</span>
              <span className="ml-2 font-medium">{formatAmount(formData.base_floor)}</span>
            </div>
            <div>
              <span className="text-base-content/60">基数上限:</span>
              <span className="ml-2 font-medium">{formatAmount(formData.base_ceiling)}</span>
            </div>
            {formData.description && (
              <div className="col-span-2">
                <span className="text-base-content/60">说明:</span>
                <span className="ml-2">{formData.description}</span>
              </div>
            )}
          </div>
        ) : (
          // 编辑模式
          <div className="space-y-3">
            {/* 适用性开关 */}
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-success"
                  checked={formData.is_applicable}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_applicable: e.target.checked }))}
                />
                <span className="label-text">此保险类型适用于该员工类别</span>
              </label>
            </div>

            {/* 继承父类别规则按钮 */}
            {canInherit && parentRule && (
              <button
                className="btn btn-outline btn-sm"
                onClick={handleInheritFromParent}
                type="button"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                继承自 {category.parent_name}
              </button>
            )}

            {/* 费率配置 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">个人费率 (%)</span>
                </label>
                <input
                  type="number"
                  className={`input input-bordered input-sm ${errors.employee_rate ? 'input-error' : ''}`}
                  value={(formData.employee_rate || 0) * 100}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    employee_rate: parseFloat(e.target.value) / 100 || 0 
                  }))}
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={!formData.is_applicable}
                />
                {errors.employee_rate && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.employee_rate}</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">单位费率 (%)</span>
                </label>
                <input
                  type="number"
                  className={`input input-bordered input-sm ${errors.employer_rate ? 'input-error' : ''}`}
                  value={(formData.employer_rate || 0) * 100}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    employer_rate: parseFloat(e.target.value) / 100 || 0 
                  }))}
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={!formData.is_applicable}
                />
                {errors.employer_rate && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.employer_rate}</span>
                  </label>
                )}
              </div>
            </div>

            {/* 基数范围配置 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">基数下限 (元)</span>
                </label>
                <input
                  type="number"
                  className={`input input-bordered input-sm ${errors.base_floor ? 'input-error' : ''}`}
                  value={formData.base_floor || 0}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    base_floor: parseFloat(e.target.value) || 0 
                  }))}
                  min="0"
                  step="0.01"
                  disabled={!formData.is_applicable}
                />
                {errors.base_floor && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.base_floor}</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">基数上限 (元)</span>
                </label>
                <input
                  type="number"
                  className={`input input-bordered input-sm ${errors.base_ceiling ? 'input-error' : ''}`}
                  value={formData.base_ceiling || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    base_ceiling: parseFloat(e.target.value) || undefined 
                  }))}
                  min="0"
                  step="0.01"
                  placeholder="不限制"
                  disabled={!formData.is_applicable}
                />
                {errors.base_ceiling && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.base_ceiling}</span>
                  </label>
                )}
              </div>
            </div>

            {/* 时间范围配置 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">生效日期</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered input-sm"
                  value={formData.effective_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">结束日期</span>
                </label>
                <input
                  type="date"
                  className={`input input-bordered input-sm ${errors.end_date ? 'input-error' : ''}`}
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value || undefined }))}
                  placeholder="永久有效"
                />
                {errors.end_date && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.end_date}</span>
                  </label>
                )}
              </div>
            </div>

            {/* 说明 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">说明</span>
              </label>
              <textarea
                className="textarea textarea-bordered textarea-sm"
                rows={2}
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="可选的规则说明..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsuranceRuleCard;