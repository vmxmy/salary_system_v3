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
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body space-y-6">
          {/* 卡片标题 skeleton */}
          <div>
            <div className="skeleton h-7 w-32 mb-2"></div>
            <div className="skeleton h-4 w-48"></div>
          </div>

          {/* 主要统计指标 skeleton */}
          <div>
            <div className="skeleton h-6 w-20 mb-3"></div>
            <div className="stats stats-vertical lg:stats-horizontal shadow-sm bg-base-200/30 w-full">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="stat">
                  <div className="stat-figure">
                    <div className="skeleton w-8 h-8 rounded-full"></div>
                  </div>
                  <div className="stat-title">
                    <div className="skeleton h-4 w-16"></div>
                  </div>
                  <div className="stat-value">
                    <div className="skeleton h-8 w-12"></div>
                  </div>
                  <div className="stat-desc">
                    <div className="skeleton h-3 w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 字段类别分布 skeleton */}
          <div>
            <div className="skeleton h-6 w-24 mb-3"></div>
            <div className="stats stats-vertical md:stats-horizontal shadow-sm bg-base-200/30 w-full">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="stat place-items-center">
                  <div className="stat-title">
                    <div className="skeleton h-3 w-12"></div>
                  </div>
                  <div className="stat-value">
                    <div className="skeleton h-6 w-8"></div>
                  </div>
                  <div className="stat-desc">
                    <div className="skeleton h-4 w-10 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
    <div className="card bg-base-100 shadow mb-6">
      <div className="card-body space-y-6">
        <div>
          <h3 className="card-title text-xl mb-2">薪资组件统计概览</h3>
          <p className="text-base-content/70 text-sm">系统中薪资字段的分类分布和数据统计</p>
        </div>

        {/* 主要统计指标 */}
        <div>
          <h4 className="text-lg font-medium mb-3 text-base-content/90">主要指标</h4>
          <div className="stats stats-vertical lg:stats-horizontal shadow-sm bg-base-200/30 w-full">
            {/* 总数统计 */}
            <div className="stat">
              <div className="stat-figure text-primary">
                <span className="text-2xl">📊</span>
              </div>
              <div className="stat-title">总组件数</div>
              <div className="stat-value text-primary">{stats.total}</div>
              <div className="stat-desc">系统中所有薪资组件</div>
            </div>

            {/* 收入项统计 */}
            <div className="stat">
              <div className="stat-figure text-success">
                <span className="text-2xl">📈</span>
              </div>
              <div className="stat-title">收入项</div>
              <div className="stat-value text-success">{stats.by_type.earning}</div>
              <div className="stat-desc">
                占比 {stats.total > 0 ? ((stats.by_type.earning / stats.total) * 100).toFixed(1) : 0}%
              </div>
            </div>

            {/* 扣除项统计 */}
            <div className="stat">
              <div className="stat-figure text-error">
                <span className="text-2xl">📉</span>
              </div>
              <div className="stat-title">扣除项</div>
              <div className="stat-value text-error">{stats.by_type.deduction}</div>
              <div className="stat-desc">
                占比 {stats.total > 0 ? ((stats.by_type.deduction / stats.total) * 100).toFixed(1) : 0}%
              </div>
            </div>

            {/* 应税项统计 */}
            <div className="stat">
              <div className="stat-figure text-warning">
                <span className="text-2xl">💰</span>
              </div>
              <div className="stat-title">应税项</div>
              <div className="stat-value text-warning">{stats.taxable_count}</div>
              <div className="stat-desc">免税 {stats.non_taxable_count} 项</div>
            </div>
          </div>
        </div>

        {/* 字段类别分布统计 */}
        <div>
          <h4 className="text-lg font-medium mb-3 text-base-content/90">字段类别分布</h4>
          <div className="stats stats-vertical md:stats-horizontal shadow-sm bg-base-200/30 w-full">
            {Object.entries(stats.by_category).map(([categoryKey, count]) => {
              const config = COMPONENT_CATEGORY_CONFIG[categoryKey as keyof typeof COMPONENT_CATEGORY_CONFIG];
              if (!config) return null;

              const percentage = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0';

              return (
                <div key={categoryKey} className="stat place-items-center">
                  <div className="stat-title text-xs">{config.label}</div>
                  <div className="stat-value text-lg">{count}</div>
                  <div className="stat-desc">
                    <div className={`badge ${config.color} badge-sm`}>
                      {percentage}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}