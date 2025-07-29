import { useState, useCallback, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon,
  FunnelIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { ModernButton } from '@/components/common/ModernButton';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { DepartmentSearchFilters } from '@/types/department';

interface DepartmentSearchPanelProps {
  onSearch: (filters: DepartmentSearchFilters) => void;
  onReset?: () => void;
  loading?: boolean;
  className?: string;
  showAdvancedFilters?: boolean;
  onToggleAdvancedFilters?: () => void;
}

export function DepartmentSearchPanel({
  onSearch,
  onReset,
  loading = false,
  className,
  showAdvancedFilters = false,
  onToggleAdvancedFilters
}: DepartmentSearchPanelProps) {
  
  // 使用 DaisyUI 卡片样式
  const cardClasses = 'card bg-base-100 border border-base-300 shadow-sm';
  // 搜索状态
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<DepartmentSearchFilters>({
    searchTerm: '',
    parentId: undefined,
    level: undefined,
    hasEmployees: undefined,
    employeeCountMin: undefined,
    employeeCountMax: undefined,
    avgSalaryMin: undefined,
    avgSalaryMax: undefined
  });

  // 搜索历史
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('departmentSearchHistory');
    return saved ? JSON.parse(saved) : [];
  });

  // 防抖搜索词
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  // 当防抖搜索词变化时触发搜索
  useEffect(() => {
    if (debouncedSearchTerm !== filters.searchTerm) {
      const newFilters = { ...filters, searchTerm: debouncedSearchTerm };
      setFilters(newFilters);
      onSearch(newFilters);
    }
  }, [debouncedSearchTerm]);

  // 处理搜索
  const handleSearch = useCallback(() => {
    // 保存搜索历史
    if (searchTerm && !searchHistory.includes(searchTerm)) {
      const newHistory = [searchTerm, ...searchHistory.slice(0, 9)]; // 最多保存10条
      setSearchHistory(newHistory);
      localStorage.setItem('departmentSearchHistory', JSON.stringify(newHistory));
    }
    
    onSearch(filters);
  }, [searchTerm, filters, searchHistory, onSearch]);

  // 处理重置
  const handleReset = useCallback(() => {
    setSearchTerm('');
    setFilters({
      searchTerm: '',
      parentId: undefined,
      level: undefined,
      hasEmployees: undefined,
      employeeCountMin: undefined,
      employeeCountMax: undefined,
      avgSalaryMin: undefined,
      avgSalaryMax: undefined
    });
    onReset?.();
    onSearch({});
  }, [onReset, onSearch]);

  // 处理键盘事件
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // 更新过滤器
  const updateFilter = useCallback((key: keyof DepartmentSearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onSearch(newFilters);
  }, [filters, onSearch]);

  // 清除搜索历史
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('departmentSearchHistory');
  }, []);

  // 计算活跃过滤器数量
  const activeFilterCount = Object.values(filters).filter(v => 
    v !== undefined && v !== '' && v !== null
  ).length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* 主搜索栏 */}
      <div className={cardClasses}>
        <div className="p-4">
          <div className="flex gap-3 items-center">
            {/* 搜索输入框 */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" />
              <input
                type="text"
                className={cn(
                  'input input-bordered w-full pl-10 pr-10',
                  'focus:border-primary transition-colors',
                  loading && 'opacity-60'
                )}
                placeholder="搜索部门名称、路径..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
                  onClick={() => setSearchTerm('')}
                  disabled={loading}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            
            
            {/* 搜索按钮 */}
            <ModernButton
              variant="primary"
              size="md"
              onClick={handleSearch}
              disabled={loading}
              className="min-w-[100px]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  搜索中...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                  搜索
                </>
              )}
            </ModernButton>
            
            {/* 重置按钮 */}
            {(searchTerm || activeFilterCount > 0) && (
              <ModernButton
                variant="ghost"
                size="md"
                onClick={handleReset}
                disabled={loading}
              >
                重置
              </ModernButton>
            )}
          </div>

          {/* 搜索历史 */}
          {searchHistory.length > 0 && !searchTerm && (
            <div className="mt-3 pt-3 border-t border-base-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-base-content/70">
                  搜索历史
                </span>
                <button
                  className="text-xs text-base-content/70 hover:text-base-content transition-colors"
                  onClick={clearHistory}
                >
                  清除
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((term, index) => (
                  <button
                    key={index}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm',
                      'bg-base-200/50 hover:bg-base-200',
                      'text-base-content/70 hover:text-base-content',
                      'transition-all duration-200'
                    )}
                    onClick={() => {
                      setSearchTerm(term);
                      handleSearch();
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 高级筛选面板 */}
      {showAdvancedFilters && (
        <div className={cn(
          cardClasses,
          'animate-in slide-in-from-top-2 duration-200'
        )}>
          <div className="p-6">
            <h3 className="text-base font-semibold text-base-content mb-4 flex items-center gap-2">
              <FunnelIcon className="w-5 h-5" />
              高级筛选条件
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 部门层级 */}
              <div className="form-control">
                <label className="label">
                  <span className="text-sm text-base-content label-text">
                    部门层级
                  </span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={filters.level || ''}
                  onChange={(e) => updateFilter('level', e.target.value ? parseInt(e.target.value) : undefined)}
                >
                  <option value="">全部层级</option>
                  <option value="1">一级部门</option>
                  <option value="2">二级部门</option>
                  <option value="3">三级部门</option>
                  <option value="4">四级及以下</option>
                </select>
              </div>

              {/* 是否有员工 */}
              <div className="form-control">
                <label className="label">
                  <span className="text-sm text-base-content label-text">
                    员工状态
                  </span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={filters.hasEmployees === undefined ? '' : filters.hasEmployees.toString()}
                  onChange={(e) => updateFilter('hasEmployees', e.target.value === '' ? undefined : e.target.value === 'true')}
                >
                  <option value="">全部</option>
                  <option value="true">有员工</option>
                  <option value="false">无员工</option>
                </select>
              </div>

              {/* 员工数量范围 */}
              <div className="form-control">
                <label className="label">
                  <span className="text-sm text-base-content label-text flex items-center gap-1">
                    <UsersIcon className="w-4 h-4" />
                    员工数量
                  </span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    placeholder="最少"
                    value={filters.employeeCountMin || ''}
                    onChange={(e) => updateFilter('employeeCountMin', e.target.value ? parseInt(e.target.value) : undefined)}
                    min="0"
                  />
                  <span className="text-base-content/70">-</span>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    placeholder="最多"
                    value={filters.employeeCountMax || ''}
                    onChange={(e) => updateFilter('employeeCountMax', e.target.value ? parseInt(e.target.value) : undefined)}
                    min="0"
                  />
                </div>
              </div>

              {/* 平均薪资范围 */}
              <div className="form-control lg:col-span-2">
                <label className="label">
                  <span className="text-sm text-base-content label-text flex items-center gap-1">
                    <CurrencyDollarIcon className="w-4 h-4" />
                    平均薪资范围
                  </span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    placeholder="最低薪资"
                    value={filters.avgSalaryMin || ''}
                    onChange={(e) => updateFilter('avgSalaryMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    min="0"
                  />
                  <span className="text-base-content/70">-</span>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    placeholder="最高薪资"
                    value={filters.avgSalaryMax || ''}
                    onChange={(e) => updateFilter('avgSalaryMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* 快速筛选标签 */}
            <div className="mt-4 pt-4 border-t border-base-300">
              <div className="flex items-center gap-2 mb-3">
                <ChartBarIcon className="w-4 h-4 text-base-content/70" />
                <span className="text-sm text-base-content/70">
                  快速筛选
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterTag
                  label="大型部门"
                  icon={<BuildingOfficeIcon className="w-3 h-3" />}
                  active={filters.employeeCountMin === 50}
                  onClick={() => {
                    updateFilter('employeeCountMin', filters.employeeCountMin === 50 ? undefined : 50);
                    updateFilter('employeeCountMax', undefined);
                  }}
                />
                <FilterTag
                  label="小型部门"
                  icon={<UsersIcon className="w-3 h-3" />}
                  active={filters.employeeCountMax === 10}
                  onClick={() => {
                    updateFilter('employeeCountMin', undefined);
                    updateFilter('employeeCountMax', filters.employeeCountMax === 10 ? undefined : 10);
                  }}
                />
                <FilterTag
                  label="高薪部门"
                  icon={<CurrencyDollarIcon className="w-3 h-3" />}
                  active={filters.avgSalaryMin === 15000}
                  onClick={() => {
                    updateFilter('avgSalaryMin', filters.avgSalaryMin === 15000 ? undefined : 15000);
                    updateFilter('avgSalaryMax', undefined);
                  }}
                />
                <FilterTag
                  label="顶级部门"
                  active={filters.level === 1}
                  onClick={() => updateFilter('level', filters.level === 1 ? undefined : 1)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 活跃筛选条件展示 */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-base-content/70">筛选条件：</span>
          <div className="flex flex-wrap gap-2">
            {filters.searchTerm && (
              <ActiveFilterTag
                label={`搜索: ${filters.searchTerm}`}
                onRemove={() => {
                  setSearchTerm('');
                  updateFilter('searchTerm', '');
                }}
              />
            )}
            {filters.level && (
              <ActiveFilterTag
                label={`${filters.level}级部门`}
                onRemove={() => updateFilter('level', undefined)}
              />
            )}
            {filters.hasEmployees !== undefined && (
              <ActiveFilterTag
                label={filters.hasEmployees ? '有员工' : '无员工'}
                onRemove={() => updateFilter('hasEmployees', undefined)}
              />
            )}
            {(filters.employeeCountMin || filters.employeeCountMax) && (
              <ActiveFilterTag
                label={`员工数: ${filters.employeeCountMin || 0}-${filters.employeeCountMax || '∞'}`}
                onRemove={() => {
                  updateFilter('employeeCountMin', undefined);
                  updateFilter('employeeCountMax', undefined);
                }}
              />
            )}
            {(filters.avgSalaryMin || filters.avgSalaryMax) && (
              <ActiveFilterTag
                label={`薪资: ¥${filters.avgSalaryMin || 0}-${filters.avgSalaryMax || '∞'}`}
                onRemove={() => {
                  updateFilter('avgSalaryMin', undefined);
                  updateFilter('avgSalaryMax', undefined);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 快速筛选标签组件
interface FilterTagProps {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}

function FilterTag({ label, icon, active = false, onClick }: FilterTagProps) {
  return (
    <button
      className={cn(
        'px-3 py-1.5 rounded-full text-sm transition-all duration-200',
        'flex items-center gap-1.5',
        active 
          ? 'bg-primary/20 text-primary border border-primary/30' 
          : 'bg-base-200/50 hover:bg-base-200 text-base-content/70 hover:text-base-content'
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

// 活跃筛选条件标签
interface ActiveFilterTagProps {
  label: string;
  onRemove: () => void;
}

function ActiveFilterTag({ label, onRemove }: ActiveFilterTagProps) {
  return (
    <div className={cn(
      'px-3 py-1 rounded-full text-sm',
      'bg-primary/10 text-primary border border-primary/20',
      'flex items-center gap-2'
    )}>
      {label}
      <button
        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
        onClick={onRemove}
      >
        <XMarkIcon className="w-3 h-3" />
      </button>
    </div>
  );
}