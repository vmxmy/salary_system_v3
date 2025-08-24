import React from 'react';
import { PayrollPeriodSelector, CompactPayrollStatusSelector } from '@/components/payroll';
import { cardEffects, inputEffects } from '@/styles/design-effects';
import type { Database } from '@/types/supabase';

type PayrollStatus = Database['public']['Enums']['payroll_status'];

interface PayrollApprovalToolbarProps {
  // 周期选择器相关
  selectedMonth: string;
  availableMonths: Array<{
    month: string;
    periodId: string;
    hasData: boolean;
    payrollCount: number;
  }>;
  onMonthChange: (month: string) => void;
  isLoadingMonths: boolean;
  
  // 状态筛选相关
  statusFilter: PayrollStatus | 'all';
  onStatusFilterChange: (status: PayrollStatus | 'all') => void;
  
  // 搜索相关
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  
  // 其他状态
  totalLoading: boolean;
  
  // 操作相关
  onHistoryClick: () => void;
}

/**
 * 薪资审批工具栏组件
 * 整合了PayrollApprovalPage中的工具栏逻辑，包括：
 * - 薪资周期选择器
 * - 状态筛选器
 * - 搜索框
 * - 审批历史按钮
 */
export function PayrollApprovalToolbar({
  selectedMonth,
  availableMonths,
  onMonthChange,
  isLoadingMonths,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  totalLoading,
  onHistoryClick
}: PayrollApprovalToolbarProps) {
  
  return (
    <div className={`${cardEffects.standard} p-4`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        
        {/* 左侧：选择器组 */}
        <div className="flex items-center gap-3">
          {/* 薪资周期选择器 */}
          <PayrollPeriodSelector
            selectedMonth={selectedMonth}
            availableMonths={availableMonths}
            onMonthChange={onMonthChange}
            isLoading={isLoadingMonths}
            showCompletenessIndicators={false}
            size="sm"
          />
          
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
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索员工姓名、部门名称..."
              className={`${inputEffects.sm}`}
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
        <div className="flex items-center gap-2" data-tour="approval-reports">
          {/* 审批历史 */}
          <button
            className="btn btn-outline btn-sm"
            onClick={onHistoryClick}
            data-tour="approval-notifications"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            审批历史
          </button>
        </div>
      </div>
    </div>
  );
}