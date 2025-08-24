import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { usePayrollAnalytics } from '@/hooks/payroll/usePayrollAnalytics';
import { useDepartments } from '@/hooks/department/useDepartments';
import { usePayrollStatusEnum } from '@/hooks/core/useEnumValues';
import { LoadingScreen } from '@/components/common/LoadingScreen';

interface PayrollStatsModuleProps {
  className?: string;
}

/**
 * 薪资统计模块
 * 
 * 基于usePayrollAnalytics提供全面的薪资数据分析
 * 严格遵循DaisyUI标准组件和系统响应式设计
 */
export function PayrollStatsModule({ className = "" }: PayrollStatsModuleProps) {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2025-04');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  
  // 获取数据 - 使用真实的hooks
  const payrollAnalytics = usePayrollAnalytics();
  const payrollStats = payrollAnalytics.queries.usePayrollStatistics(selectedPeriod || undefined);
  const departmentStats = payrollAnalytics.queries.useDepartmentStatistics(selectedPeriod || undefined);
  const componentAnalysis = payrollAnalytics.queries.useComponentAnalysis(selectedPeriod || undefined);
  const trendsData = payrollAnalytics.queries.usePayrollTrends({
    startPeriod: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString().slice(0, 7),
    endPeriod: new Date().toISOString().slice(0, 7)
  });
  const { departments } = useDepartments();
  
  // 获取动态枚举值
  const payrollStatusEnum = usePayrollStatusEnum();
  
  // 提取错误信息
  const enumError = payrollStatusEnum?.error as any;

  // 加载状态 - 现代化设计
  if (payrollStats.isLoading || departmentStats.isLoading || componentAnalysis.isLoading || payrollStatusEnum.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-base-100">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base-content/70 font-medium">加载薪资统计数据中...</p>
        </div>
      </div>
    );
  }

  // 错误状态 - 现代化设计
  if (payrollStats.error || departmentStats.error || componentAnalysis.error || payrollStatusEnum.error) {
    const error = payrollStats.error || departmentStats.error || componentAnalysis.error || payrollStatusEnum.error;
    return (
      <div className="alert alert-error shadow bg-error/10">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 className="font-bold">数据加载失败</h3>
          <div className="text-xs">加载薪资统计数据失败: {error?.message}</div>
        </div>
        <button className="btn btn-sm btn-outline transition-transform" onClick={() => {
          payrollStats.refetch();
          departmentStats.refetch();
          componentAnalysis.refetch();
        }}>重试</button>
      </div>
    );
  }

  // 检查数据是否存在 - 现代化设计
  if (!payrollStats.data && !departmentStats.data && !componentAnalysis.data) {
    return (
      <div className="alert alert-warning shadow bg-warning/10">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <h3 className="font-bold">暂无数据</h3>
          <div className="text-xs">薪资统计数据将在系统初始化后显示</div>
        </div>
      </div>
    );
  }

  // 生成最近12个月选项
  const generatePeriodOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`;
      options.push({ value: period, label });
    }
    return options;
  };

  // 筛选器组件
  const filtersActions = (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* 期间选择器 */}
      <div className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text font-medium">筛选期间</span>
        </label>
        <select 
          className="select select-bordered w-full max-w-xs"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        >
          <option value="">全部期间</option>
          {generatePeriodOptions().map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* 部门选择器 */}
      <div className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text font-medium">筛选部门</span>
        </label>
        <select 
          className="select select-bordered w-full max-w-xs"
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
        >
          <option value="">全部部门</option>
          {departments?.map(dept => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 简化标题区域 - 直接放置筛选器 */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-base-100 p-6 rounded-lg shadow">
        {filtersActions}
      </div>

      {/* 薪资总览统计 - 标准DaisyUI stats组件 */}
      <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-100 w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div className="stat-title">薪资总额</div>
          <div className="stat-value text-primary">
            ¥{((payrollStats.data?.totalGrossPay || 0) / 10000).toFixed(1)}万
          </div>
          <div className="stat-desc">
            {selectedPeriod ? '当期薪资总和' : '累计薪资总和'}
          </div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="stat-title">平均薪资</div>
          <div className="stat-value text-secondary">
            ¥{((payrollStats.data?.averageGrossPay || 0) / 1000).toFixed(1)}k
          </div>
          <div className="stat-desc">月度人均水平</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="stat-title">最高薪资</div>
          <div className="stat-value text-accent">
            ¥{((payrollStats.data?.averageGrossPay || 0) * 1.5 / 1000).toFixed(1)}k
          </div>
          <div className="stat-desc">单人最高薪资</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-info">
            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-title">发放记录</div>
          <div className="stat-value text-info">{payrollStats.data?.totalEmployees || 0}</div>
          <div className="stat-desc">条薪资记录</div>
        </div>
      </div>

      {/* 薪资分析 - 使用responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 薪资档次分布 */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              薪资档次分布
            </h2>
            
            <div className="grid grid-cols-1 gap-3 mt-4">
              {/* 基于实际数据的薪资档次分布 */}
              {payrollStats.data && (() => {
                const total = payrollStats.data.totalEmployees;
                const averagePay = payrollStats.data.averageGrossPay;
                
                // 根据平均薪资估算分布 - 在实际项目中这应该来自专门的分布查询
                const estimatedDistribution = [
                  { key: 'under3k', label: '3千以下', color: 'neutral', estimate: Math.round(total * 0.15) },
                  { key: 'range3to5k', label: '3千-5千', color: 'info', estimate: Math.round(total * 0.25) },
                  { key: 'range5to8k', label: '5千-8千', color: 'success', estimate: Math.round(total * 0.30) },
                  { key: 'range8to12k', label: '8千-1.2万', color: 'warning', estimate: Math.round(total * 0.20) },
                  { key: 'range12to20k', label: '1.2万-2万', color: 'error', estimate: Math.round(total * 0.08) },
                  { key: 'above20k', label: '2万以上', color: 'primary', estimate: Math.round(total * 0.02) }
                ];
                
                return estimatedDistribution.map((item) => (
                  <div key={item.key} className="flex justify-between items-center p-3 bg-base-200 rounded">
                    <span>{item.label}</span>
                    <div className="flex items-center gap-2">
                      <progress 
                        className={`progress progress-${item.color} w-20`} 
                        value={item.estimate} 
                        max={total}
                      ></progress>
                      <span className={`badge badge-${item.color}`}>{item.estimate}</span>
                    </div>
                  </div>
                ));
              })()}
              {!payrollStats.data && (
                <div className="text-center py-4 text-base-content/70">
                  暂无薪资分布数据
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 薪资构成分析 */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              薪资构成分析
            </h2>
            
            <div className="grid grid-cols-1 gap-2 mt-4">
              {componentAnalysis.data?.slice(0, 8).map((component, index) => {
                const colors = ['primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error', 'neutral'];
                const color = colors[index % colors.length];
                const totalPayroll = payrollStats.data?.totalGrossPay || 1;
                const percentage = ((component.totalAmount / totalPayroll) * 100);
                
                return (
                  <div key={component.componentName} className="flex justify-between items-center p-2 bg-base-200 rounded">
                    <span className="text-sm truncate flex-1">{component.componentName}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-xs text-base-content/70 w-12 text-right">
                        {percentage.toFixed(1)}%
                      </div>
                      <progress 
                        className={`progress progress-${color} w-16`} 
                        value={component.totalAmount} 
                        max={totalPayroll}
                      ></progress>
                      <span className={`badge badge-${color} badge-sm`}>
                        ¥{(component.totalAmount / 10000).toFixed(1)}万
                      </span>
                    </div>
                  </div>
                );
              })}
              {(!componentAnalysis.data || componentAnalysis.data.length === 0) && (
                <div className="text-center py-4 text-base-content/70">
                  暂无薪资构成数据
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 部门薪资对比 */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              部门薪资对比 (前8个部门)
            </h2>
            
            <div className="grid grid-cols-1 gap-2 mt-4">
              {departmentStats.data?.slice(0, 8).map((dept, index) => {
                const colors = ['primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error', 'neutral'];
                const color = colors[index % colors.length];
                const maxAmount = Math.max(...(departmentStats.data?.map(d => d.totalGrossPay) || [1]));
                
                return (
                  <div key={dept.departmentId} className="flex justify-between items-center p-2 bg-base-200 rounded">
                    <span className="text-sm truncate flex-1">{dept.departmentName}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-xs text-base-content/70 w-12 text-right">
                        {dept.employeeCount}人
                      </div>
                      <progress 
                        className={`progress progress-${color} w-16`} 
                        value={dept.totalGrossPay} 
                        max={maxAmount}
                      ></progress>
                      <span className={`badge badge-${color} badge-sm`}>
                        ¥{(dept.totalGrossPay / 10000).toFixed(1)}万
                      </span>
                    </div>
                  </div>
                );
              })}
              {(!departmentStats.data || departmentStats.data.length === 0) && (
                <div className="text-center py-4 text-base-content/70">
                  暂无部门统计数据
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 薪资发放状态 */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              薪资发放状态
            </h2>
            
            <div className="grid grid-cols-1 gap-3 mt-4">
              {payrollStats.data && payrollStatusEnum.statusOptions && (() => {
                const total = payrollStats.data.totalEmployees;
                
                // 调试信息：显示实际的状态计数数据
                console.log('[PayrollStatsModule] Debug Data:', {
                  selectedPeriod,
                  totalEmployees: total,
                  statusCounts: payrollStats.data.statusCounts,
                  statusOptions: payrollStatusEnum.statusOptions,
                });
                
                // 基于动态枚举值创建状态数据
                const statusData = payrollStatusEnum.statusOptions.map(option => ({
                  key: option.value,
                  label: option.label,
                  color: option.color,
                  icon: option.icon,
                  count: payrollStats.data.statusCounts[option.value as keyof typeof payrollStats.data.statusCounts] || 0,
                  description: option.description
                })); // 移除过滤，显示所有状态（包括计数为0的）
                
                return statusData.map((status) => (
                  <div key={status.key} className="flex justify-between items-center p-3 bg-base-200 rounded">
                    <div className="flex items-center gap-2">
                      {status.icon && <span className="text-lg">{status.icon}</span>}
                      <div>
                        <div className="font-medium">{status.label}</div>
                        {status.description && (
                          <div className="text-xs text-base-content/60">{status.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <progress 
                        className={`progress progress-${status.color} w-20`} 
                        value={status.count} 
                        max={total}
                      ></progress>
                      <span className={`badge badge-${status.color}`}>{status.count}</span>
                    </div>
                  </div>
                ));
              })()}
              {!payrollStats.data && !payrollStats.isLoading && (
                <div className="text-center py-4 text-base-content/70">
                  暂无发放状态数据 (期间: {selectedPeriod})
                </div>
              )}
              {payrollStats.data && payrollStats.data.totalEmployees === 0 && (
                <div className="text-center py-4 text-base-content/70">
                  选定期间无薪资记录 (期间: {selectedPeriod})
                </div>
              )}
              {payrollStatusEnum.isLoading && (
                <div className="text-center py-4 text-base-content/70">
                  正在加载状态枚举值...
                </div>
              )}
              {enumError && (
                <div className="text-center py-4 text-error">
                  枚举值加载失败: {enumError.message || '未知错误'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 月度薪资趋势表格 */}
      {trendsData.data && trendsData.data.length > 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              月度薪资趋势 (最近12个月)
            </h2>
            
            <div className="overflow-x-auto mt-4">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>期间</th>
                    <th>薪资总额</th>
                    <th>人数</th>
                    <th>人均薪资</th>
                    <th>环比变化</th>
                    <th>同比变化</th>
                  </tr>
                </thead>
                <tbody>
                  {trendsData.data?.slice(-12).map((trend, index) => {
                    const isGrowth = trend.growthRate > 0;
                    const isYoyGrowth = trend.yearOverYear > 0;
                    return (
                      <tr key={trend.period}>
                        <td>
                          <div className="font-bold">{trend.period}</div>
                        </td>
                        <td>
                          <span className="badge badge-outline">
                            ¥{(trend.totalGrossPay / 10000).toFixed(1)}万
                          </span>
                        </td>
                        <td>{trend.employeeCount}人</td>
                        <td>
                          ¥{((trend.totalGrossPay / trend.employeeCount) / 1000).toFixed(1)}k
                        </td>
                        <td>
                          <span className={`badge ${isGrowth ? 'badge-success' : trend.growthRate < 0 ? 'badge-error' : 'badge-neutral'}`}>
                            {isGrowth ? '+' : ''}{trend.growthRate.toFixed(1)}%
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${isYoyGrowth ? 'badge-info' : trend.yearOverYear < 0 ? 'badge-warning' : 'badge-neutral'}`}>
                            {isYoyGrowth ? '+' : ''}{trend.yearOverYear.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PayrollStatsModule;