import { useTranslation } from '@/hooks/useTranslation';
import { useStatisticsSummary } from '@/hooks/statistics/useStatisticsSummary';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { StatisticsModuleLayout } from './common';

interface DashboardModuleProps {
  className?: string;
}

/**
 * 综合仪表板模块
 * 
 * 基于DaisyUI标准组件展示KPI指标和核心统计数据
 * 严格遵循系统布局和响应式设计标准
 */
export function DashboardModule({ className = "" }: DashboardModuleProps) {
  const { t } = useTranslation();
  const { data: summary, isLoading, error, refresh } = useStatisticsSummary();

  // 加载状态 - 增强设计
  if (isLoading) {
    return (
      <div className="statistics-loading">
        <div className="flex flex-col items-center gap-6">
          <div className="statistics-loading-spinner">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-base-content/80 mb-2">加载统计数据中</p>
            <p className="text-sm text-base-content/60">正在获取最新的数据分析...</p>
          </div>
        </div>
      </div>
    );
  }

  // 错误状态 - 增强设计
  if (error) {
    return (
      <div className="alert alert-error alert-enhanced shadow-lg bg-error/5">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 className="font-bold text-lg">数据加载失败</h3>
          <div className="text-sm opacity-80">{error instanceof Error ? error.message : '加载统计数据失败，请检查网络连接'}</div>
        </div>
        <button className="btn btn-sm btn-outline hover:scale-105 transition-all duration-200" onClick={refresh}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          重试
        </button>
      </div>
    );
  }

  // 数据为空 - 现代化设计
  if (!summary) {
    return (
      <div className="alert alert-warning shadow bg-warning/10">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <h3 className="font-bold">暂无数据</h3>
          <div className="text-xs">统计数据将在系统初始化后显示</div>
        </div>
      </div>
    );
  }

  const { overview, trends, alerts } = summary;

  // 刷新按钮组件
  const refreshAction = (
    <button 
      className="btn btn-ghost btn-sm"
      onClick={refresh}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      刷新数据
    </button>
  );

  return (
    <StatisticsModuleLayout
      title="综合统计概览"
      description="实时数据分析与关键指标监控"
      actions={refreshAction}
      className={`statistics-fade-in statistics-enhanced ${className}`}
    >

      {/* KPI指标卡片 - 增强的统计样式，解决滚动问题 */}
      <div className="statistics-stats-container">
        <div className="stats stats-vertical lg:stats-horizontal statistics-kpi-card w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="stat-title">在职员工总数</div>
          <div className="stat-value stat-value-gradient">{overview.totalEmployees}</div>
          <div className="stat-desc">
            <span className={`trend-indicator ${trends.employeeGrowth > 0 ? 'trend-up' : trends.employeeGrowth < 0 ? 'trend-down' : 'trend-stable'}`}>
              <span className={`badge badge-sm ${trends.employeeGrowth >= 0 ? 'badge-success' : 'badge-error'}`}>
                {trends.employeeGrowth > 0 ? '+' : ''}{trends.employeeGrowth}%
              </span>
              {trends.employeeGrowth > 0 && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </span>
            <span className="ml-2">本月变化</span>
          </div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div className="stat-title">薪资总额</div>
          <div className="stat-value text-secondary">
            ¥{(overview.totalPayroll / 10000).toFixed(1)}万
          </div>
          <div className="stat-desc">
            <span className={`badge badge-sm ${trends.payrollGrowth >= 0 ? 'badge-success' : 'badge-error'}`}>
              {trends.payrollGrowth > 0 ? '+' : ''}{trends.payrollGrowth}%
            </span>
            <span className="ml-1">环比增长</span>
          </div>
        </div>

        <div className="stat">
          <div className="stat-figure text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="stat-title">人均薪资</div>
          <div className="stat-value text-accent">
            ¥{(overview.averageSalary / 1000).toFixed(1)}k
          </div>
          <div className="stat-desc">月度平均水平</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-info">
            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="stat-title">活跃部门</div>
          <div className="stat-value text-info">{overview.activeDepartments}</div>
          <div className="stat-desc">个组织单位</div>
        </div>
        </div>
      </div>

      {/* 趋势指标 - 增强的统计样式，解决滚动问题 */}
      <div className="statistics-stats-container">
        <div className="stats stats-vertical md:stats-horizontal statistics-kpi-card w-full">
        <div className="stat place-items-center">
          <div className="stat-figure text-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="stat-title">人员流动率</div>
          <div className="stat-value text-warning">
            {trends.turnoverRate.toFixed(1)}%
          </div>
          <div className="stat-desc">
            <div className={`badge badge-sm ${
              trends.turnoverRate > 15 ? 'badge-error' : trends.turnoverRate < 5 ? 'badge-success' : 'badge-info'
            }`}>
              {trends.turnoverRate > 15 ? '偏高需关注' : trends.turnoverRate < 5 ? '健康水平' : '正常范围'}
            </div>
          </div>
        </div>

        <div className="stat place-items-center">
          <div className="stat-figure text-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="stat-title">员工增长</div>
          <div className="stat-value text-success">
            {trends.employeeGrowth > 0 ? '+' : ''}{trends.employeeGrowth.toFixed(1)}%
          </div>
          <div className="stat-desc">环比上月</div>
        </div>

        <div className="stat place-items-center">
          <div className="stat-figure text-info">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div className="stat-title">薪资增长</div>
          <div className="stat-value text-info">
            {trends.payrollGrowth > 0 ? '+' : ''}{trends.payrollGrowth.toFixed(1)}%
          </div>
          <div className="stat-desc">环比上月</div>
        </div>

        <div className="stat place-items-center">
          <div className="stat-figure text-neutral">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-title">数据更新</div>
          <div className="stat-value">
            {new Date(overview.lastUpdated).toLocaleString('zh-CN', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div className="stat-desc">最后更新时间</div>
        </div>
        </div>
      </div>

      {/* 系统提醒 - 现代化设计 */}
      {alerts.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-primary rounded-full"></div>
            <h2 className="text-2xl font-bold text-base-content">系统提醒</h2>
            <div className="badge badge-primary badge-sm">{alerts.length}</div>
          </div>
          <div className="grid gap-4">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`alert shadow ${
                  alert.type === 'error' ? 'alert-error' : 
                  alert.type === 'warning' ? 'alert-warning' : 
                  'alert-info'
                }`}
              >
                <div className={`p-2 ${
                  alert.type === 'error' ? 'bg-error' : 
                  alert.type === 'warning' ? 'bg-warning' : 'bg-info'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${
                    alert.type === 'error' ? 'text-error' : 
                    alert.type === 'warning' ? 'text-warning' : 'text-info'
                  }`} fill="none" viewBox="0 0 24 24">
                    {alert.type === 'error' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                    {alert.type === 'warning' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    )}
                    {alert.type === 'info' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base-content">{alert.title}</h3>
                  <div className="text-sm text-base-content/70 mt-1">{alert.description}</div>
                </div>
                <div className={`badge badge-sm ${
                  alert.type === 'error' ? 'badge-error' : 
                  alert.type === 'warning' ? 'badge-warning' : 'badge-info'
                }`}>
                  {alert.type === 'error' ? '错误' : alert.type === 'warning' ? '警告' : '信息'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
    </StatisticsModuleLayout>
  );
}

export default DashboardModule;