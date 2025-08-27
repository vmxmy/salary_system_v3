/**
 * 薪资组件统计卡片
 * 显示薪资组件的统计信息
 */

import React from 'react';
import { 
  useSalaryComponentStats, 
  COMPONENT_TYPE_CONFIG, 
  COMPONENT_CATEGORY_CONFIG 
} from '@/hooks/salary-components';

export function SalaryComponentStatsCard() {
  const { data: stats, isLoading, error } = useSalaryComponentStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="skeleton h-4 w-20 mb-2"></div>
              <div className="skeleton h-8 w-16 mb-2"></div>
              <div className="skeleton h-3 w-24"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>加载统计信息失败: {error.message}</span>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 总数统计 */}
      <div className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-base-content/70">总组件数</h3>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary text-xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* 收入项统计 */}
      <div className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-base-content/70">收入项</h3>
              <p className="text-2xl font-bold text-success">{stats.by_type.earning}</p>
              <p className="text-xs text-base-content/60">
                占比 {stats.total > 0 ? ((stats.by_type.earning / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
              <span className="text-success text-xl">📈</span>
            </div>
          </div>
        </div>
      </div>

      {/* 扣除项统计 */}
      <div className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-base-content/70">扣除项</h3>
              <p className="text-2xl font-bold text-error">{stats.by_type.deduction}</p>
              <p className="text-xs text-base-content/60">
                占比 {stats.total > 0 ? ((stats.by_type.deduction / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
              <span className="text-error text-xl">📉</span>
            </div>
          </div>
        </div>
      </div>

      {/* 应税项统计 */}
      <div className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-base-content/70">应税项</h3>
              <p className="text-2xl font-bold text-warning">{stats.taxable_count}</p>
              <p className="text-xs text-base-content/60">
                免税 {stats.non_taxable_count} 项
              </p>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
              <span className="text-warning text-xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* 类别分布统计 */}
      <div className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow md:col-span-2 lg:col-span-4">
        <div className="card-body">
          <h3 className="text-lg font-semibold mb-4">类别分布</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(stats.by_category).map(([categoryKey, count]) => {
              const config = COMPONENT_CATEGORY_CONFIG[categoryKey as keyof typeof COMPONENT_CATEGORY_CONFIG];
              if (!config) return null;

              const percentage = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0';

              return (
                <div key={categoryKey} className="text-center">
                  <div className={`badge ${config.color} badge-lg mb-2 w-full`}>
                    {config.label}
                  </div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-base-content/60">{percentage}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}