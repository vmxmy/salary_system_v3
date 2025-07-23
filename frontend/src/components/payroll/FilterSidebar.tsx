import React from 'react';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import type { ComponentFilters, ComponentCategory, ComponentStats } from '../../types/payrollComponent';

interface FilterSidebarProps {
  filters: ComponentFilters;
  setFilters: React.Dispatch<React.SetStateAction<ComponentFilters>>;
  categories: ComponentCategory[];
  stats: ComponentStats | null;
  onClearFilters: () => void;
}

export function FilterSidebar({ 
  filters, 
  setFilters, 
  categories, 
  stats, 
  onClearFilters 
}: FilterSidebarProps) {
  const updateFilter = (key: keyof ComponentFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = filters.search || filters.category || filters.personnelType || 
                          filters.isActive !== null || filters.isTaxable !== null;

  return (
    <div className="bg-base-100 border-r border-base-200 h-full overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* 标题和清除 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-base-content/70" />
            <h3 className="font-semibold text-base-content">筛选条件</h3>
          </div>
          {hasActiveFilters && (
            <button 
              onClick={onClearFilters}
              className="btn btn-ghost btn-xs text-base-content/60 hover:text-base-content"
            >
              <XMarkIcon className="w-4 h-4" />
              清除
            </button>
          )}
        </div>

        {/* 搜索框 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">搜索</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="搜索组件名称或代码..."
              className="input input-bordered w-full pl-10"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40" />
          </div>
        </div>

        {/* 分类筛选 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">组件分类</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={filters.category || ''}
            onChange={(e) => updateFilter('category', e.target.value || null)}
          >
            <option value="">全部分类</option>
            <option value="basic_salary">基本工资类</option>
            <option value="allowance">补贴津贴类</option>
            <option value="performance">绩效奖金类</option>
          </select>
        </div>

        {/* 人员类型筛选 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">人员类型</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={filters.personnelType || ''}
            onChange={(e) => updateFilter('personnelType', e.target.value || null)}
          >
            <option value="">全部类型</option>
            <option value="staff">正编人员</option>
            <option value="contract">聘用人员</option>
          </select>
        </div>

        {/* 状态筛选 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">启用状态</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={filters.isActive === null ? '' : String(filters.isActive)}
            onChange={(e) => updateFilter('isActive', e.target.value === '' ? null : e.target.value === 'true')}
          >
            <option value="">全部状态</option>
            <option value="true">已启用</option>
            <option value="false">已停用</option>
          </select>
        </div>

        {/* 计税状态 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">计税状态</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={filters.isTaxable === null ? '' : String(filters.isTaxable)}
            onChange={(e) => updateFilter('isTaxable', e.target.value === '' ? null : e.target.value === 'true')}
          >
            <option value="">全部</option>
            <option value="true">计税</option>
            <option value="false">免税</option>
          </select>
        </div>

        {/* 统计信息 */}
        {stats && (
          <div className="space-y-4">
            <div className="divider"></div>
            <div>
              <h4 className="font-medium text-base-content mb-3">统计信息</h4>
              
              {/* 总体统计 */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/70">总组件数</span>
                  <span className="font-medium">{stats.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/70">已启用</span>
                  <span className="font-medium text-success">{stats.active}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/70">已停用</span>
                  <span className="font-medium text-error">{stats.total - stats.active}</span>
                </div>
              </div>

              {/* 按分类统计 */}
              <div className="mb-4">
                <h5 className="text-xs font-medium text-base-content/70 mb-2">按分类统计</h5>
                <div className="space-y-1">
                  {Object.entries(stats.byCategory).map(([category, count]) => (
                    <div key={category} className="flex justify-between text-xs">
                      <span className="text-base-content/60">
                        {category === 'basic_salary' ? '基本工资' : 
                         category === 'allowance' ? '补贴津贴' : 
                         category === 'performance' ? '绩效奖金' : category}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 按人员类型统计 */}
              <div>
                <h5 className="text-xs font-medium text-base-content/70 mb-2">按人员类型统计</h5>
                <div className="space-y-1">
                  {Object.entries(stats.byPersonnelType).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-xs">
                      <span className="text-base-content/60">
                        {type === 'staff' ? '正编人员' : type === 'contract' ? '聘用人员' : type}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}