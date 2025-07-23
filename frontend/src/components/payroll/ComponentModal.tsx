import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';
import type { PayrollComponent, ComponentFormData, ModalMode } from '../../types/payrollComponent';

interface ComponentModalProps {
  isOpen: boolean;
  mode: ModalMode;
  component?: PayrollComponent;
  onClose: () => void;
  onSubmit: (data: ComponentFormData) => Promise<void>;
  onDelete?: (component: PayrollComponent) => Promise<void>;
}

export function ComponentModal({ 
  isOpen, 
  mode, 
  component, 
  onClose, 
  onSubmit,
  onDelete 
}: ComponentModalProps) {
  const [formData, setFormData] = useState<ComponentFormData>({
    code: '',
    name: '',
    description: '',
    type_lookup_id: 6, // 默认收入类型
    subtype_lookup_id: 34, // 默认基本工资类
    data_type_lookup_id: 10, // 默认数值类型
    calculation_type_lookup_id: 15, // 默认手动输入
    is_taxable: true,
    is_social_insurance_base: false,
    is_housing_fund_base: false,
    display_order: 1,
    is_visible_on_payslip: true,
    is_editable_by_user: false,
    is_active: true,
    tags: {}
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初始化表单数据
  useEffect(() => {
    if (component && (mode === 'edit' || mode === 'view')) {
      setFormData({
        code: component.code,
        name: component.name,
        description: component.description || '',
        type_lookup_id: component.type_lookup_id,
        subtype_lookup_id: component.subtype_lookup_id,
        data_type_lookup_id: component.data_type_lookup_id,
        calculation_type_lookup_id: component.calculation_type_lookup_id,
        is_taxable: component.is_taxable,
        is_social_insurance_base: component.is_social_insurance_base,
        is_housing_fund_base: component.is_housing_fund_base,
        display_order: component.display_order,
        is_visible_on_payslip: component.is_visible_on_payslip,
        is_editable_by_user: component.is_editable_by_user,
        is_active: component.is_active,
        tags: component.tags || {}
      });
    } else if (mode === 'create') {
      setFormData({
        code: '',
        name: '',
        description: '',
        type_lookup_id: 6,
        subtype_lookup_id: 34,
        data_type_lookup_id: 10,
        calculation_type_lookup_id: 15,
        is_taxable: true,
        is_social_insurance_base: false,
        is_housing_fund_base: false,
        display_order: 1,
        is_visible_on_payslip: true,
        is_editable_by_user: false,
        is_active: true,
        tags: {}
      });
    }
  }, [component, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;

    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!component || !onDelete) return;

    try {
      setLoading(true);
      await onDelete(component);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (key: keyof ComponentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const updateTag = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      tags: { ...prev.tags, [key]: value }
    }));
  };

  const isReadOnly = mode === 'view';
  const modalTitle = mode === 'create' ? '创建薪酬组件' : 
                    mode === 'edit' ? '编辑薪酬组件' : '查看薪酬组件';

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 模态框头部 */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">{modalTitle}</h3>
          <button 
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="alert alert-error mb-4">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">组件代码 *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="如：BASIC_SALARY_STAFF"
                value={formData.code}
                onChange={(e) => updateField('code', e.target.value)}
                disabled={isReadOnly || mode === 'edit'} // 编辑时不允许修改代码
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">组件名称 *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="如：基本工资"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                disabled={isReadOnly}
                required
              />
            </div>
          </div>

          {/* 描述 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">描述</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              placeholder="组件的详细描述..."
              rows={3}
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          {/* 分类信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">主分类</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.subtype_lookup_id}
                onChange={(e) => updateField('subtype_lookup_id', Number(e.target.value))}
                disabled={isReadOnly}
              >
                <option value={34}>基本工资类</option>
                <option value={35}>补贴津贴类</option>
                <option value={36}>绩效奖金类</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">显示顺序</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={formData.display_order}
                onChange={(e) => updateField('display_order', Number(e.target.value))}
                disabled={isReadOnly}
                min={1}
              />
            </div>
          </div>

          {/* 标签信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">人员类型</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.tags.personnel_type || ''}
                onChange={(e) => updateTag('personnel_type', e.target.value)}
                disabled={isReadOnly}
              >
                <option value="">请选择</option>
                <option value="staff">正编人员</option>
                <option value="contract">聘用人员</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">组件分类</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.tags.category || ''}
                onChange={(e) => updateTag('category', e.target.value)}
                disabled={isReadOnly}
              >
                <option value="">请选择</option>
                <option value="basic_salary">基本工资</option>
                <option value="allowance">补贴津贴</option>
                <option value="performance">绩效奖金</option>
              </select>
            </div>
          </div>

          {/* 属性设置 */}
          <div className="space-y-3">
            <h4 className="font-medium text-base-content">属性设置</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text">是否计税</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.is_taxable}
                    onChange={(e) => updateField('is_taxable', e.target.checked)}
                    disabled={isReadOnly}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text">社保缴费基数</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.is_social_insurance_base}
                    onChange={(e) => updateField('is_social_insurance_base', e.target.checked)}
                    disabled={isReadOnly}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text">公积金缴费基数</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.is_housing_fund_base}
                    onChange={(e) => updateField('is_housing_fund_base', e.target.checked)}
                    disabled={isReadOnly}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text">工资条显示</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.is_visible_on_payslip}
                    onChange={(e) => updateField('is_visible_on_payslip', e.target.checked)}
                    disabled={isReadOnly}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text">用户可编辑</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.is_editable_by_user}
                    onChange={(e) => updateField('is_editable_by_user', e.target.checked)}
                    disabled={isReadOnly}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text">启用状态</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => updateField('is_active', e.target.checked)}
                    disabled={isReadOnly}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 模态框底部按钮 */}
          <div className="modal-action">
            {mode === 'view' ? (
              <>
                {onDelete && component && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="btn btn-error"
                    disabled={loading}
                  >
                    {loading ? '删除中...' : '删除'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="btn"
                >
                  关闭
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn"
                  disabled={loading}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}