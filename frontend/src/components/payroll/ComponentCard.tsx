import React from 'react';
import { 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  TagIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import type { PayrollComponent } from '../../types/payrollComponent';

interface ComponentCardProps {
  component: PayrollComponent;
  isSelected: boolean;
  onSelect: (code: string) => void;
  onView: (component: PayrollComponent) => void;
  onEdit: (component: PayrollComponent) => void;
  onDelete: (component: PayrollComponent) => void;
}

export function ComponentCard({ 
  component, 
  isSelected, 
  onSelect, 
  onView, 
  onEdit, 
  onDelete 
}: ComponentCardProps) {
  const personnelTypeMap = {
    staff: { label: '正编', color: 'badge-primary' },
    contract: { label: '聘用', color: 'badge-secondary' }
  };

  const categoryMap = {
    basic_salary: { label: '基本工资', color: 'bg-blue-100 text-blue-800' },
    allowance: { label: '补贴津贴', color: 'bg-green-100 text-green-800' },
    performance: { label: '绩效奖金', color: 'bg-purple-100 text-purple-800' }
  };

  const personnelType = component.tags?.personnel_type;
  const category = component.tags?.category;

  return (
    <div className={`
      card bg-base-100 shadow-sm border transition-all duration-200 hover:shadow-md
      ${isSelected ? 'ring-2 ring-primary ring-opacity-50 border-primary' : ''}
      ${!component.is_active ? 'opacity-60' : ''}
    `}>
      <div className="card-body p-4">
        {/* 头部：选择框和状态 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={isSelected}
              onChange={() => onSelect(component.code)}
            />
            <div className="flex items-center gap-1">
              {component.is_active ? (
                <CheckCircleIcon className="w-4 h-4 text-success" />
              ) : (
                <XCircleIcon className="w-4 h-4 text-error" />
              )}
              <span className={`text-xs font-medium ${
                component.is_active ? 'text-success' : 'text-error'
              }`}>
                {component.is_active ? '启用' : '停用'}
              </span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-xs">
              ⋯
            </div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
              <li><a onClick={() => onView(component)}><EyeIcon className="w-4 h-4" />查看</a></li>
              <li><a onClick={() => onEdit(component)}><PencilIcon className="w-4 h-4" />编辑</a></li>
              <li><a onClick={() => onDelete(component)} className="text-error"><TrashIcon className="w-4 h-4" />删除</a></li>
            </ul>
          </div>
        </div>

        {/* 标题和代码 */}
        <div className="mb-3">
          <h3 className="font-semibold text-sm text-base-content mb-1 line-clamp-2">
            {component.name}
          </h3>
          <div className="text-xs text-base-content/60 font-mono">
            {component.code}
          </div>
        </div>

        {/* 标签区域 */}
        <div className="flex flex-wrap gap-1 mb-3">
          {/* 人员类型标签 */}
          {personnelType && personnelTypeMap[personnelType] && (
            <div className={`badge badge-sm ${personnelTypeMap[personnelType].color}`}>
              {personnelTypeMap[personnelType].label}
            </div>
          )}

          {/* 分类标签 */}
          {category && categoryMap[category] && (
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${categoryMap[category].color}`}>
              {categoryMap[category].label}
            </span>
          )}
        </div>

        {/* 属性图标 */}
        <div className="flex items-center gap-3 text-xs text-base-content/60">
          {component.is_taxable && (
            <div className="flex items-center gap-1" title="计税">
              <CurrencyDollarIcon className="w-3 h-3" />
              <span>税</span>
            </div>
          )}
          {component.is_social_insurance_base && (
            <div className="flex items-center gap-1" title="社保基数">
              <ShieldCheckIcon className="w-3 h-3" />
              <span>社保</span>
            </div>
          )}
          {component.is_housing_fund_base && (
            <div className="flex items-center gap-1" title="公积金基数">
              <TagIcon className="w-3 h-3" />
              <span>公积金</span>
            </div>
          )}
        </div>

        {/* 描述（如果有） */}
        {component.description && (
          <div className="mt-2 pt-2 border-t border-base-200">
            <p className="text-xs text-base-content/70 line-clamp-2">
              {component.description}
            </p>
          </div>
        )}

        {/* 底部信息 */}
        <div className="mt-2 pt-2 border-t border-base-200 flex justify-between items-center text-xs text-base-content/50">
          <span>序号: {component.display_order}</span>
          {component.is_visible_on_payslip && (
            <span className="badge badge-xs badge-outline">工资条显示</span>
          )}
        </div>
      </div>
    </div>
  );
}