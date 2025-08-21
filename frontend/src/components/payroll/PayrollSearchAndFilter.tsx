import React, { useState, useCallback, type ReactNode } from 'react';
import type { PayrollStatusType } from '@/hooks/payroll/usePayrollTableColumns';
import type { BasePayrollData } from './PayrollTableContainer';

// 搜索字段配置
export interface SearchFieldConfig {
  key: string;
  getter: (item: any) => string | undefined;
  searchable?: boolean;
}

// 状态筛选选项
export interface StatusOption {
  value: string;
  label: string;
}

// 搜索和筛选Props
export interface PayrollSearchAndFilterProps<T extends BasePayrollData = BasePayrollData> {
  // 搜索相关
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  searchPlaceholder?: string;
  loading?: boolean;
  
  // 状态筛选
  statusFilter: PayrollStatusType | 'all';
  onStatusFilterChange: (status: PayrollStatusType | 'all') => void;
  statusOptions?: StatusOption[];
  
  // 导出功能
  showExport?: boolean;
  exportData?: T[];
  exportFilename?: string;
  
  // 自定义内容
  additionalFilters?: ReactNode;
  className?: string;
}

// 默认搜索字段配置
const defaultSearchFields: SearchFieldConfig[] = [
  { key: 'employee_name', getter: (item) => item.employee_name },
  { key: 'department_name', getter: (item) => item.department_name },
  { key: 'position_name', getter: (item) => item.position_name },
  { key: 'category_name', getter: (item) => item.category_name },
  { key: 'payroll_status', getter: (item) => item.payroll_status || item.status },
  { key: 'pay_date', getter: (item) => item.pay_date || item.actual_pay_date || item.scheduled_pay_date },
  { key: 'gross_pay', getter: (item) => item.gross_pay?.toString() },
  { key: 'net_pay', getter: (item) => item.net_pay?.toString() },
  { key: 'last_operator', getter: (item) => item.last_operator },
];

// 默认状态选项
const defaultStatusOptions: StatusOption[] = [
  { value: 'all', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'calculating', label: '计算中' },
  { value: 'calculated', label: '已计算' },
  { value: 'approved', label: '已审批' },
  { value: 'paid', label: '已发放' },
  { value: 'cancelled', label: '已取消' },
];

/**
 * 薪资搜索和筛选组件
 * 统一处理搜索逻辑和状态筛选
 */
export function PayrollSearchAndFilter<T extends BasePayrollData = BasePayrollData>({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onReset,
  searchPlaceholder = "搜索员工姓名、状态...",
  loading = false,
  statusFilter,
  onStatusFilterChange,
  statusOptions = defaultStatusOptions,
  showExport = false,
  exportData = [],
  exportFilename = 'export',
  additionalFilters,
  className = '',
}: PayrollSearchAndFilterProps<T>) {
  
  // 处理搜索触发
  const handleSearch = useCallback(() => {
    onSearch();
  }, [onSearch]);

  // 处理搜索重置
  const handleSearchReset = useCallback(() => {
    onReset();
  }, [onReset]);

  // 导出功能
  const handleExport = useCallback(() => {
    if (!exportData || exportData.length === 0) {
      return;
    }
    
    // 简单的CSV导出
    const csvData = exportData.map(item => {
      return {
        '员工姓名': item.employee_name || '',
        '部门': item.department_name || '',
        '职位': item.position_name || '',
        '状态': item.payroll_status || item.status || '',
        '应发金额': item.gross_pay || '',
        '实发金额': item.net_pay || ''
      };
    });
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${exportFilename || 'export'}.csv`;
    link.click();
  }, [exportData, exportFilename]);

  return (
    <div className={`payroll-search-filter ${className}`}>
      <div className="card bg-base-100 shadow-sm border border-base-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* 搜索输入框 */}
          <div className="flex items-center gap-2 flex-grow min-w-64">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="input input-bordered input-sm w-full pr-20"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                disabled={loading}
              />
              <div className="absolute right-1 top-1 flex gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={handleSearchReset}
                    title="清除搜索"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  className={`btn btn-primary btn-xs ${loading ? 'loading' : ''}`}
                  onClick={handleSearch}
                  disabled={loading}
                  title="搜索"
                >
                  {!loading && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 状态筛选 */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
            </svg>
            <span className="text-xs font-medium text-base-content">状态：</span>
            <select 
              className="select select-bordered select-xs bg-base-100 w-28 text-xs"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as PayrollStatusType | 'all')}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 额外的筛选控件 */}
          {additionalFilters}

          {/* 导出按钮 */}
          {showExport && exportData && exportData.length > 0 && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleExport}
              title="导出数据"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              导出
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 搜索和筛选Hook
 * 提供搜索和筛选的状态管理
 */
export function usePayrollSearchAndFilter<T extends BasePayrollData = BasePayrollData>(
  data: T[],
  searchFields?: SearchFieldConfig[]
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayrollStatusType | 'all'>('all');
  
  // 搜索处理函数
  const handleSearch = useCallback(() => {
    setActiveSearchQuery(searchQuery);
  }, [searchQuery]);

  const handleSearchReset = useCallback(() => {
    setSearchQuery('');
    setActiveSearchQuery('');
  }, []);

  // 数据过滤逻辑
  const processedData = React.useMemo(() => {
    let filteredData = [...data];
    
    // 状态过滤
    if (statusFilter !== 'all') {
      filteredData = filteredData.filter(item => {
        const itemStatus = item.payroll_status || item.status;
        return itemStatus === statusFilter;
      });
    }
    
    // 搜索过滤
    if (activeSearchQuery.trim()) {
      const query = activeSearchQuery.toLowerCase().trim();
      const fields = searchFields || defaultSearchFields;
      
      filteredData = filteredData.filter(item => {
        // 搜索所有配置的字段
        const searchableFields = fields
          .map(field => field.getter(item))
          .filter(Boolean); // 过滤掉空值
        
        // 检查是否任一字段包含搜索关键词
        return searchableFields.some(field => 
          field && field.toLowerCase().includes(query)
        );
      });
    }
    
    return filteredData;
  }, [data, statusFilter, activeSearchQuery, searchFields]);

  return {
    // 状态
    searchQuery,
    activeSearchQuery,
    statusFilter,
    processedData,
    
    // 处理函数
    setSearchQuery,
    setStatusFilter,
    handleSearch,
    handleSearchReset,
  };
}

export default PayrollSearchAndFilter;