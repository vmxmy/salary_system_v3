import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useEmployeeTrends } from '@/hooks/employee/useEmployeeStatistics';
import { usePayrollAnalytics } from '@/hooks/payroll/usePayrollAnalytics';
import { StatisticsModuleLayout } from './common';

interface TrendsModuleProps {
  className?: string;
}

/**
 * 趋势分析模块
 * 
 * 基于多个hooks提供综合的趋势分析和预测
 * 严格遵循DaisyUI标准组件和系统响应式设计
 */
export function TrendsModule({ className = "" }: TrendsModuleProps) {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<number>(12); // 默认12个月
  const [analysisType, setAnalysisType] = useState<'combined' | 'employee' | 'payroll'>('combined');
  
  // 获取趋势数据
  const employeeTrends = useEmployeeTrends(timeRange);
  const payrollAnalytics = usePayrollAnalytics();
  
  // 获取薪资趋势数据
  const payrollTrends = payrollAnalytics.queries.usePayrollTrends({
    startPeriod: new Date(new Date().getFullYear(), new Date().getMonth() - timeRange, 1).toISOString().slice(0, 7),
    endPeriod: new Date().toISOString().slice(0, 7)
  });

  // 加载状态
  if (employeeTrends.isLoading || payrollTrends.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // 错误状态
  if (employeeTrends.error || payrollTrends.error) {
    return (
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>加载趋势分析数据失败</span>
        <button className="btn btn-sm" onClick={() => {
          employeeTrends.refetch();
          payrollTrends.refetch();
        }}>重试</button>
      </div>
    );
  }

  const trends = employeeTrends.data;
  const payrollData = payrollTrends.data;

  if (!trends || !payrollData) {
    return (
      <div className="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span>暂无趋势分析数据</span>
      </div>
    );
  }

  // 计算趋势指标 - 修改为使用实际的数据结构 {date, value}
  const calculateTrend = (data: { value: number; date: string }[]) => {
    if (data.length < 2) return { trend: 'stable', rate: 0 };
    
    const recent = data.slice(-3); // 最近3个月
    const older = data.slice(-6, -3); // 之前3个月
    
    const recentAvg = recent.reduce((sum, item) => sum + item.value, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, item) => sum + item.value, 0) / older.length : recentAvg;
    
    const rate = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
    
    return {
      trend: rate > 5 ? 'rising' : rate < -5 ? 'falling' : 'stable',
      rate: Math.abs(rate)
    };
  };

  // 获取趋势显示样式
  const getTrendStyle = (trend: string) => {
    switch (trend) {
      case 'rising': return { 
        color: 'success', 
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ), 
        text: '上升' 
      };
      case 'falling': return { 
        color: 'error', 
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17L8 12l-4 4m0 0H9m-9 0v-5" />
          </svg>
        ), 
        text: '下降' 
      };
      default: return { 
        color: 'info', 
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        ), 
        text: '稳定' 
      };
    }
  };

  const employeeCountTrend = calculateTrend(trends.headcount || []);
  const turnoverTrend = calculateTrend(trends.turnoverRate || []);
  const employeeCountStyle = getTrendStyle(employeeCountTrend.trend);
  const turnoverStyle = getTrendStyle(turnoverTrend.trend);

  // 控制器组件
  const controlsActions = (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* 时间范围选择 */}
      <div className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text">分析周期</span>
        </label>
        <select 
          className="select select-bordered w-full max-w-xs"
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
        >
          <option value={6}>最近6个月</option>
          <option value={12}>最近12个月</option>
          <option value={24}>最近24个月</option>
        </select>
      </div>

      {/* 分析类型选择 */}
      <div className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text">分析维度</span>
        </label>
        <select 
          className="select select-bordered w-full max-w-xs"
          value={analysisType}
          onChange={(e) => setAnalysisType(e.target.value as any)}
        >
          <option value="combined">综合分析</option>
          <option value="employee">人事趋势</option>
          <option value="payroll">薪资趋势</option>
        </select>
      </div>
    </div>
  );

  return (
    <StatisticsModuleLayout
      title="趋势分析预测"
      description="数据走向与预测分析"
      actions={controlsActions}
      className={className}
    >

      {/* 趋势概览指标 */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <div className="text-primary">{employeeCountStyle.icon}</div>
          </div>
          <div className="stat-title">员工数量趋势</div>
          <div className={`stat-value text-${employeeCountStyle.color}`}>
            {employeeCountStyle.text}
          </div>
          <div className="stat-desc">
            {employeeCountTrend.rate.toFixed(1)}% 变化率
          </div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <div className="text-secondary">{turnoverStyle.icon}</div>
          </div>
          <div className="stat-title">流动率趋势</div>
          <div className={`stat-value text-${turnoverStyle.color}`}>
            {turnoverStyle.text}
          </div>
          <div className="stat-desc">
            {turnoverTrend.rate.toFixed(1)}% 变化率
          </div>
        </div>

        <div className="stat">
          <div className="stat-figure text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div className="stat-title">薪资增长</div>
          <div className="stat-value text-accent">
            {(payrollData && payrollData.length > 1) ? 
              (payrollData[payrollData.length - 1].growthRate > 0 ? '上升' : 
               payrollData[payrollData.length - 1].growthRate < 0 ? '下降' : '稳定') : 
              '稳定'
            }
          </div>
          <div className="stat-desc">
            {(payrollData && payrollData.length > 1) ? 
              `${Math.abs(payrollData[payrollData.length - 1].growthRate).toFixed(1)}% 环比` : 
              '暂无数据'
            }
          </div>
        </div>

        <div className="stat">
          <div className="stat-figure text-info">
            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="stat-title">预测指标</div>
          <div className="stat-value text-info">健康</div>
          <div className="stat-desc">基于历史数据</div>
        </div>
      </div>

      {/* 详细趋势分析 - 使用responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 员工数量变化趋势 */}
        {(analysisType === 'combined' || analysisType === 'employee') && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                员工数量变化趋势
              </h2>
              
              <div className="overflow-x-auto mt-4">
                <table className="table table-zebra table-xs">
                  <thead>
                    <tr>
                      <th>期间</th>
                      <th>人数</th>
                      <th>变化</th>
                      <th>趋势</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(trends.headcount || []).slice(-8).map((item, index, arr) => {
                      const prevValue = index > 0 ? arr[index - 1].value : item.value;
                      const change = item.value - prevValue;
                      const changeRate = prevValue > 0 ? (change / prevValue) * 100 : 0;
                      
                      return (
                        <tr key={item.date}>
                          <td className="font-mono text-xs">{item.date}</td>
                          <td><span className="badge badge-outline badge-sm">{item.value}</span></td>
                          <td>
                            <span className={`badge badge-sm ${change > 0 ? 'badge-success' : change < 0 ? 'badge-error' : 'badge-neutral'}`}>
                              {change > 0 ? '+' : ''}{change}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <progress 
                                className={`progress w-12 ${changeRate > 0 ? 'progress-success' : changeRate < 0 ? 'progress-error' : 'progress-neutral'}`} 
                                value={Math.abs(changeRate)} 
                                max={10}
                              ></progress>
                              <span className="text-xs">{changeRate.toFixed(1)}%</span>
                            </div>
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

        {/* 人员流动率趋势 */}
        {(analysisType === 'combined' || analysisType === 'employee') && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                人员流动率趋势
              </h2>
              
              <div className="grid grid-cols-1 gap-2 mt-4">
                {trends.turnoverRate.slice(-6).map((item, index) => {
                  const level = item.value > 15 ? 'high' : item.value > 8 ? 'medium' : 'low';
                  const levelConfig = {
                    high: { color: 'error', label: '偏高', bg: 'bg-error/10' },
                    medium: { color: 'warning', label: '正常', bg: 'bg-warning/10' },
                    low: { color: 'success', label: '健康', bg: 'bg-success/10' }
                  };
                  const config = levelConfig[level];
                  
                  return (
                    <div key={item.date} className={`p-3 rounded ${config.bg}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-mono text-sm">{item.date}</div>
                          <div className="text-xs opacity-70">{config.label}水平</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <progress 
                            className={`progress progress-${config.color} w-20`} 
                            value={item.value} 
                            max={20}
                          ></progress>
                          <span className={`badge badge-${config.color}`}>
                            {item.value.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 薪资增长趋势 */}
        {(analysisType === 'combined' || analysisType === 'payroll') && payrollData && payrollData.length > 0 && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                薪资增长趋势
              </h2>
              
              <div className="overflow-x-auto mt-4">
                <table className="table table-zebra table-xs">
                  <thead>
                    <tr>
                      <th>期间</th>
                      <th>总额</th>
                      <th>人均</th>
                      <th>增长率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payrollData || []).slice(-8).map((item) => (
                      <tr key={item.period}>
                        <td className="font-mono text-xs">{item.period}</td>
                        <td>
                          <span className="badge badge-outline badge-sm">
                            ¥{(item.totalGrossPay / 10000).toFixed(1)}万
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-outline badge-sm">
                            ¥{((item.totalGrossPay / item.employeeCount) / 1000).toFixed(1)}k
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <span className={`badge badge-sm ${
                              item.growthRate > 0 ? 'badge-success' : 
                              item.growthRate < 0 ? 'badge-error' : 
                              'badge-neutral'
                            }`}>
                              {item.growthRate > 0 ? '+' : ''}{item.growthRate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 预测性分析指标 */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              趋势预测指标
            </h2>
            
            <div className="grid grid-cols-1 gap-3 mt-4">
              <div className="stat bg-base-200 rounded p-3">
                <div className="stat-title">员工规模预期</div>
                <div className="stat-value text-primary">
                  {(trends.headcount && trends.headcount.length > 0) ? 
                    Math.round(trends.headcount[trends.headcount.length - 1].value * (1 + employeeCountTrend.rate / 100)) : 
                    '暂无数据'
                  }人
                </div>
                <div className="stat-desc">基于当前趋势预测</div>
              </div>
              
              <div className="stat bg-base-200 rounded p-3">
                <div className="stat-title">流动率预期</div>
                <div className="stat-value text-warning">
                  {(trends.turnoverRate && trends.turnoverRate.length > 0) ? 
                    `${Math.max(0, trends.turnoverRate[trends.turnoverRate.length - 1].value + (turnoverTrend.trend === 'rising' ? 1 : turnoverTrend.trend === 'falling' ? -1 : 0)).toFixed(1)}%` : 
                    '暂无数据'
                  }
                </div>
                <div className="stat-desc">预期变化范围</div>
              </div>
              
              <div className="stat bg-base-200 rounded p-3">
                <div className="stat-title">薪资增长预期</div>
                <div className="stat-value text-info">
                  {(payrollData && payrollData.length > 0) ? 
                    `${Math.max(-10, Math.min(15, payrollData[payrollData.length - 1].growthRate * 1.1)).toFixed(1)}%` : 
                    '暂无数据'
                  }
                </div>
                <div className="stat-desc">下期预期增长</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 趋势分析建议 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            趋势分析建议
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* 人事管理建议 */}
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-bold">人事管理</h3>
                <div className="text-xs mt-1">
                  {employeeCountTrend.trend === 'rising' ? 
                    '员工数量呈上升趋势，建议加强新员工培训和管理体系建设' :
                    employeeCountTrend.trend === 'falling' ?
                    '员工数量下降，建议分析流失原因并制定挽留策略' :
                    '员工规模稳定，建议关注团队质量和效能提升'
                  }
                </div>
              </div>
            </div>

            {/* 薪资管理建议 */}
            <div className="alert alert-warning">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="font-bold">薪资管理</h3>
                <div className="text-xs mt-1">
                  {(payrollData && payrollData.length > 0 && payrollData[payrollData.length - 1].growthRate > 5) ?
                    '薪资增长较快，建议评估预算承受能力并优化薪资结构' :
                    (payrollData && payrollData.length > 0 && payrollData[payrollData.length - 1].growthRate < -2) ?
                    '薪资下降趋势，建议关注员工满意度和市场竞争力' :
                    '薪资水平稳定合理，建议保持现有薪资策略'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </StatisticsModuleLayout>
  );
}

export default TrendsModule;