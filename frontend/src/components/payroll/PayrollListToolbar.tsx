import { type ReactNode } from 'react';
import { PayrollPeriodSelector } from './PayrollPeriodSelector';
import { CompactPayrollStatusSelector } from './PayrollStatusSelector';
import { cardEffects, inputEffects } from '@/styles/design-effects';
import { exportTableToExcel } from '@/components/common/DataTable/utils';
import { usePermission } from '@/hooks/permissions/usePermission';
import { PERMISSIONS } from '@/constants/permissions';
import type { PayrollStatusType } from '@/hooks/payroll';

export interface PayrollListToolbarProps {
  // 薪资周期选择器
  selectedMonth: string;
  availableMonths: Array<{
    month: string;
    periodId: string;
    hasData: boolean;
    hasPeriod?: boolean;
    payrollCount: number;
    expectedEmployeeCount?: number;
  }>;
  onMonthChange: (month: string) => void;
  isLoading?: boolean;

  // 状态筛选
  statusFilter: PayrollStatusType | 'all';
  onStatusFilterChange: (status: PayrollStatusType | 'all') => void;

  // 搜索功能
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchPlaceholder?: string;
  totalLoading?: boolean;

  // 导出和操作
  exportData?: any[];
  onClearClick?: () => void;
  
  // 自定义内容
  additionalActions?: ReactNode;
  className?: string;
}

export function PayrollListToolbar({
  selectedMonth,
  availableMonths,
  onMonthChange,
  isLoading = false,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder = "搜索员工姓名、部门名称...",
  totalLoading = false,
  exportData = [],
  onClearClick,
  additionalActions,
  className = ""
}: PayrollListToolbarProps) {
  const { hasPermission } = usePermission();

  return (
    <div className={`${cardEffects.standard} p-4 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        
        {/* 左侧：选择器组 */}
        <div className="flex items-center gap-3">
          {/* 薪资周期选择器 */}
          <div data-tour="payroll-period-selector">
            <PayrollPeriodSelector
              selectedMonth={selectedMonth}
              availableMonths={availableMonths}
              onMonthChange={onMonthChange}
              isLoading={isLoading}
              showCompletenessIndicators={true}
              onlyShowMonthsWithData={false}
              size="sm"
            />
          </div>
          
          {/* 状态选择器 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-base-content/70 whitespace-nowrap">状态：</span>
            <CompactPayrollStatusSelector
              value={statusFilter}
              onChange={onStatusFilterChange}
              showIcon={false}
              className="w-28"
              placeholder="全部状态"
            />
          </div>
        </div>

        {/* 中间：搜索框 */}
        <div className="flex-1" data-tour="payroll-search">
          <div className="relative">
            <input
              type="text"
              placeholder={searchPlaceholder}
              className={`${inputEffects.sm} pr-20`}
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              disabled={totalLoading}
            />
            <div className="absolute right-1 top-1 flex gap-1">
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => onSearchQueryChange('')}
                  title="清除搜索"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary btn-xs"
                title="搜索"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 右侧：操作按钮组 */}
        <div className="flex items-center gap-2" data-tour="payroll-export-options">
          {/* 导出按钮 */}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => exportTableToExcel(exportData, 'payroll-all')}
            title="导出全部数据"
            disabled={!exportData || exportData.length === 0}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出全部
          </button>

          {/* 清空按钮 */}
          {hasPermission(PERMISSIONS.PAYROLL_CLEAR) && onClearClick && (
            <button
              className="btn btn-error btn-sm"
              onClick={onClearClick}
              title="清空本月薪资数据（需要薪资清除权限）"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              清空本月
            </button>
          )}

          {/* 自定义操作 */}
          {additionalActions}
        </div>
      </div>
    </div>
  );
}