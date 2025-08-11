import { useState, useEffect } from 'react';
import { departmentService } from '@/services/department.service';
import { payrollService } from '@/services/payroll.service';
import { MonthPicker } from '@/components/common/MonthPicker';
import { getCurrentYearMonth } from '@/lib/dateUtils';
import type { FilterOptions } from '@/types/metadata';

interface MetadataFiltersProps {
  filters: FilterOptions;
  onChange: (filters: Partial<FilterOptions>) => void;
  onReset: () => void;
}

export function MetadataFilters({ filters, onChange, onReset }: MetadataFiltersProps) {
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [positions, setPositions] = useState<Array<{ id: string; name: string }>>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // 获取部门和职位列表 - 使用服务层
  useEffect(() => {
    const fetchFiltersData = async () => {
      try {
        // 获取部门列表
        const deptTree = await departmentService.getDepartmentTree();
        const flatDepts = flattenDepartments(deptTree);
        setDepartments(flatDepts);

        // 注：职位数据可能需要从薪资视图中提取唯一值，或者使用其他服务
        // 暂时使用硬编码的示例数据
        setPositions([
          { id: '1', name: '主任' },
          { id: '2', name: '副主任' },
          { id: '3', name: '科员' },
          { id: '4', name: '未知职务' }
        ]);
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
      }
    };
    
    fetchFiltersData();
  }, []);

  // 展平部门树结构
  const flattenDepartments = (tree: any[]): Array<{ id: string; name: string }> => {
    const result: Array<{ id: string; name: string }> = [];
    
    const flatten = (nodes: any[], prefix = '') => {
      nodes.forEach(node => {
        const displayName = prefix ? `${prefix} > ${node.name}` : node.name;
        result.push({ id: node.id, name: displayName });
        
        if (node.children && node.children.length > 0) {
          flatten(node.children, displayName);
        }
      });
    };
    
    flatten(tree);
    return result;
  };

  // 格式化月份显示
  const formatMonthDisplay = (yearMonth: string) => {
    if (!yearMonth) return '';
    const [year, month] = yearMonth.split('-');
    return `${year}年${parseInt(month)}月`;
  };


  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        {/* 基础筛选条件 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 期间选择 - 使用MonthPicker组件 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">薪资期间</span>
            </label>
            <MonthPicker
              value={filters.period || ''}
              onChange={(value) => onChange({ period: value || undefined })}
              size="sm"
              placeholder="选择月份"
              showDataIndicators={true}
            />
          </div>

          {/* 部门选择 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">部门</span>
            </label>
            <select
              className="select select-bordered select-sm"
              value={filters.departmentId || ''}
              onChange={(e) => onChange({ departmentId: e.target.value })}
            >
              <option value="">全部部门</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* 职位选择 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">职位</span>
            </label>
            <select
              className="select select-bordered select-sm"
              value={filters.positionId || ''}
              onChange={(e) => onChange({ positionId: e.target.value })}
            >
              <option value="">全部职位</option>
              {positions.map(pos => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>
          </div>

          {/* 搜索框 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">搜索</span>
            </label>
            <input
              type="text"
              placeholder="姓名或工号..."
              className="input input-bordered input-sm"
              value={filters.searchText || ''}
              onChange={(e) => onChange({ searchText: e.target.value })}
            />
          </div>
        </div>

        {/* 高级筛选条件 */}
        <div className="collapse collapse-arrow">
          <input 
            type="checkbox" 
            checked={isExpanded}
            onChange={(e) => setIsExpanded(e.target.checked)}
          />
          <div className="collapse-title text-sm font-medium">
            高级筛选
          </div>
          <div className="collapse-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* 员工状态 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">员工状态</span>
                </label>
                <select
                  className="select select-bordered select-sm"
                  value={filters.employeeStatus || ''}
                  onChange={(e) => onChange({ employeeStatus: e.target.value as 'active' | 'resigned' | 'suspended' | undefined })}
                >
                  <option value="">全部状态</option>
                  <option value="active">在职</option>
                  <option value="resigned">离职</option>
                  <option value="suspended">停薪留职</option>
                </select>
              </div>

              {/* 薪资范围 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">薪资范围</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="最小"
                    className="input input-bordered input-sm w-24"
                    value={filters.salaryMin || ''}
                    onChange={(e) => onChange({ salaryMin: parseFloat(e.target.value) || undefined })}
                  />
                  <span className="self-center">-</span>
                  <input
                    type="number"
                    placeholder="最大"
                    className="input input-bordered input-sm w-24"
                    value={filters.salaryMax || ''}
                    onChange={(e) => onChange({ salaryMax: parseFloat(e.target.value) || undefined })}
                  />
                </div>
              </div>

              {/* 数据状态 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">数据状态</span>
                </label>
                <select
                  className="select select-bordered select-sm"
                  value={filters.dataStatus || ''}
                  onChange={(e) => onChange({ dataStatus: e.target.value as 'draft' | 'locked' | 'confirmed' | 'archived' | undefined })}
                >
                  <option value="">全部</option>
                  <option value="draft">草稿</option>
                  <option value="confirmed">已确认</option>
                  <option value="locked">已锁定</option>
                  <option value="archived">已归档</option>
                </select>
              </div>

              {/* 是否有调整 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">数据调整</span>
                </label>
                <select
                  className="select select-bordered select-sm"
                  value={filters.hasAdjustment || ''}
                  onChange={(e) => onChange({ hasAdjustment: e.target.value as 'yes' | 'no' | undefined })}
                >
                  <option value="">全部</option>
                  <option value="yes">有调整</option>
                  <option value="no">无调整</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            className="btn btn-ghost btn-sm"
            onClick={onReset}
          >
            重置
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              // 触发搜索
              onChange(filters);
            }}
          >
            搜索
          </button>
        </div>

        {/* 当前筛选条件标签 */}
        {Object.keys(filters).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {filters.period && (
              <div className="badge badge-outline gap-1">
                期间: {formatMonthDisplay(filters.period)}
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => onChange({ period: undefined })}
                >
                  ×
                </button>
              </div>
            )}
            {filters.departmentId && (
              <div className="badge badge-outline gap-1">
                部门: {departments.find(d => d.id === filters.departmentId)?.name}
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => onChange({ departmentId: undefined })}
                >
                  ×
                </button>
              </div>
            )}
            {filters.positionId && (
              <div className="badge badge-outline gap-1">
                职位: {positions.find(p => p.id === filters.positionId)?.name}
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => onChange({ positionId: undefined })}
                >
                  ×
                </button>
              </div>
            )}
            {filters.searchText && (
              <div className="badge badge-outline gap-1">
                搜索: {filters.searchText}
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => onChange({ searchText: undefined })}
                >
                  ×
                </button>
              </div>
            )}
            {filters.employeeStatus && (
              <div className="badge badge-outline gap-1">
                状态: {filters.employeeStatus === 'active' ? '在职' : filters.employeeStatus === 'resigned' ? '离职' : '停薪留职'}
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => onChange({ employeeStatus: undefined })}
                >
                  ×
                </button>
              </div>
            )}
            {(filters.salaryMin || filters.salaryMax) && (
              <div className="badge badge-outline gap-1">
                薪资: {filters.salaryMin || 0} - {filters.salaryMax || '∞'}
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => onChange({ salaryMin: undefined, salaryMax: undefined })}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}