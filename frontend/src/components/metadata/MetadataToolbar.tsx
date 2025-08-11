import { useState } from 'react';
import { MonthPicker } from '@/components/common/MonthPicker';
import { ModernButton } from '@/components/common/ModernButton';
import { getCurrentYearMonth } from '@/lib/dateUtils';

interface MetadataToolbarProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  onSearch: () => void;
  onExport: () => void;
  isExporting?: boolean;
}

export function MetadataToolbar({
  selectedMonth,
  onMonthChange,
  statusFilter,
  onStatusChange,
  searchText,
  onSearchChange,
  onSearch,
  onExport,
  isExporting = false
}: MetadataToolbarProps) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* 月份选择 */}
          <MonthPicker
            value={selectedMonth}
            onChange={onMonthChange}
            size="sm"
            placeholder="选择月份"
            showDataIndicators={true}
          />

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="select select-bordered select-sm"
          >
            <option value="all">全部状态</option>
            <option value="draft">草稿</option>
            <option value="approved">已批准</option>
            <option value="paid">已发放</option>
            <option value="cancelled">已取消</option>
          </select>

          {/* 搜索框 */}
          <div className="join">
            <input
              type="text"
              placeholder="搜索员工姓名、工号..."
              className="input input-bordered input-sm join-item w-48"
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onSearch();
                }
              }}
            />
            <button
              className="btn btn-sm btn-square join-item"
              onClick={onSearch}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* 导出按钮 */}
        <div className="dropdown dropdown-end">
          <ModernButton
            variant="secondary"
            size="sm"
            className="tabindex-0"
            title="导出"
            disabled={isExporting}
            icon={
              isExporting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )
            }
          >
            导出
          </ModernButton>
          <ul className="dropdown-content menu p-2 mt-2 w-52 z-50 bg-base-100 border border-base-200 rounded-xl shadow-lg">
            <li>
              <a onClick={() => onExport()} className="rounded-lg">
                导出当前页
              </a>
            </li>
            <li>
              <a onClick={() => onExport()} className="rounded-lg">
                导出全部
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}