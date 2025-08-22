import React, { useState } from 'react';
import { useManagementDashboard } from '@/hooks/management/useManagementDashboard';
import { useSystemMonitoring } from '@/hooks/monitoring/useSystemMonitoring';
import { usePersonalizedView } from '@/hooks/personalization/usePersonalizedView';
import { SmartKPICard, BudgetExecutionCard, LaborEfficiencyCard, OrganizationHealthCard, RiskLevelCard } from '../enhanced/SmartKPICard';
import { InteractiveInsightPanel } from '../enhanced/InteractiveInsightPanel';
import { RealTimeMonitorCard } from '../enhanced/RealTimeMonitorCard';

interface SmartDecisionDashboardProps {
  className?: string;
  timeRange?: '1month' | '3months' | '6months' | '12months';
}

/**
 * 智能决策仪表板组件
 * 
 * 集成管理决策支持系统，是统计页面的核心增强模块
 * 与其他统计模块的差异：专注于管理决策和异常检测，非详细分析
 * 
 * 核心功能：
 * 1. DecisionKPIGrid - 决策关键指标网格
 * 2. AnomalyDetectionPanel - 异常智能检测面板
 * 3. ManagementSuggestions - 决策支持建议
 * 4. QuickActionPortal - 快速操作入口
 * 
 * 设计原则：
 * - 管理者视角：突出决策相关的宏观指标
 * - 智能化：自动异常检测和风险预警
 * - 可操作：提供具体的行动建议和快速入口
 */
export const SmartDecisionDashboard: React.FC<SmartDecisionDashboardProps> = ({
  className = '',
  timeRange = '3months'
}) => {
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed' | 'trends'>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['kpi-grid']));

  // 获取数据源
  const managementData = useManagementDashboard();
  const monitoringData = useSystemMonitoring();
  const { viewState, toggleSection, updateFilter } = usePersonalizedView();

  // 切换展开状态
  const toggleSectionExpansion = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
    toggleSection(sectionId);
  };

  // 处理KPI卡片点击
  const handleKPIClick = (kpiType: string) => {
    console.log(`KPI详情查看: ${kpiType}`);
    // 可以跳转到具体的分析页面或展开详情面板
  };

  // 处理快速操作
  const handleQuickAction = (actionId: string) => {
    console.log(`快速操作: ${actionId}`);
    // 执行具体的快速操作
  };

  // 处理时间范围变更
  const handleTimeRangeChange = (newTimeRange: string) => {
    updateFilter('timeRange', newTimeRange);
  };

  // 检查加载状态
  const isLoading = managementData.isLoading || monitoringData.isLoading;
  const hasError = managementData.error || monitoringData.error;

  if (hasError) {
    return (
      <div className={`card bg-base-100 shadow-lg ${className}`}>
        <div className="card-body">
          <div className="alert alert-error">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>数据加载失败，请刷新重试</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 仪表板标题和控制区 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-primary text-primary-content rounded-full w-12 h-12">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">智能决策仪表板</h1>
            <p className="text-base-content/70">数据驱动的管理决策支持系统</p>
          </div>
        </div>

        {/* 视图控制和时间范围选择 */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 视图切换 */}
          <div className="tabs tabs-boxed" role="tablist" aria-label="仪表板视图选择">
            <button 
              className={`tab ${selectedView === 'overview' ? 'tab-active' : ''}`}
              onClick={() => setSelectedView('overview')}
              role="tab"
              aria-selected={selectedView === 'overview'}
              aria-controls="dashboard-content-overview"
              id="tab-overview"
              tabIndex={selectedView === 'overview' ? 0 : -1}
            >
              概览
            </button>
            <button 
              className={`tab ${selectedView === 'detailed' ? 'tab-active' : ''}`}
              onClick={() => setSelectedView('detailed')}
              role="tab"
              aria-selected={selectedView === 'detailed'}
              aria-controls="dashboard-content-detailed"
              id="tab-detailed"
              tabIndex={selectedView === 'detailed' ? 0 : -1}
            >
              详细
            </button>
            <button 
              className={`tab ${selectedView === 'trends' ? 'tab-active' : ''}`}
              onClick={() => setSelectedView('trends')}
              role="tab"
              aria-selected={selectedView === 'trends'}
              aria-controls="dashboard-content-trends"
              id="tab-trends"
              tabIndex={selectedView === 'trends' ? 0 : -1}
            >
              趋势
            </button>
          </div>

          {/* 时间范围选择 */}
          <label className="form-control">
            <div className="label sr-only">
              <span className="label-text">选择时间范围</span>
            </div>
            <select 
              className="select select-bordered"
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              aria-label="选择数据统计时间范围"
            >
              <option value="1month">近1个月</option>
              <option value="3months">近3个月</option>
              <option value="6months">近6个月</option>
              <option value="12months">近12个月</option>
            </select>
          </label>
        </div>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card bg-base-100 shadow animate-pulse">
              <div className="card-body">
                <div className="h-4 bg-base-300 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-base-300 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-base-300 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 主要内容区域 */}
      {!isLoading && (
        <>
          {/* 1. DecisionKPIGrid - 决策关键指标网格 */}
          <section 
            className="collapse collapse-arrow bg-base-100 shadow-lg"
            aria-labelledby="kpi-grid-heading"
          >
            <input 
              type="checkbox" 
              checked={expandedSections.has('kpi-grid')}
              onChange={() => toggleSectionExpansion('kpi-grid')}
              aria-label={`${expandedSections.has('kpi-grid') ? '收起' : '展开'}核心决策指标区域`}
              aria-expanded={expandedSections.has('kpi-grid')}
              aria-controls="kpi-grid-content"
            />
            <div className="collapse-title flex items-center gap-3">
              <svg 
                className="w-6 h-6 text-primary" 
                fill="currentColor" 
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              <h2 id="kpi-grid-heading" className="text-xl font-bold">核心决策指标</h2>
              <div className="badge badge-primary" role="status">实时更新</div>
            </div>
            <div className="collapse-content" id="kpi-grid-content">
              <div 
                className="stats stats-vertical lg:stats-horizontal shadow w-full mt-4"
                role="group"
                aria-label="决策指标统计组"
              >
                {managementData.data && (
                  <>
                    <BudgetExecutionCard
                      rate={managementData.data.kpis.find(kpi => kpi.type === 'budget_execution')?.value || 0}
                      trend={{
                        direction: 'up',
                        percentage: 5.2,
                        period: '月环比'
                      }}
                      onClick={() => handleKPIClick('budget_execution')}
                    />
                    <LaborEfficiencyCard
                      efficiency={managementData.data.kpis.find(kpi => kpi.type === 'labor_efficiency')?.value || 0}
                      trend={{
                        direction: 'stable',
                        percentage: 1.1,
                        period: '月环比'
                      }}
                      onClick={() => handleKPIClick('labor_efficiency')}
                    />
                    <OrganizationHealthCard
                      score={managementData.data.kpis.find(kpi => kpi.type === 'organization_health')?.value || 0}
                      trend={{
                        direction: 'up',
                        percentage: 3.8,
                        period: '月环比'
                      }}
                      onClick={() => handleKPIClick('organization_health')}
                    />
                    <RiskLevelCard
                      level={managementData.data.risks[0]?.level || 'low'}
                      riskCount={managementData.data.risks.length}
                      onClick={() => handleKPIClick('risk_overview')}
                    />
                  </>
                )}
              </div>
            </div>
          </section>

          {/* 2. AnomalyDetectionPanel - 异常智能检测面板 */}
          <div className="collapse collapse-arrow bg-base-100 shadow-lg">
            <input 
              type="checkbox" 
              checked={expandedSections.has('anomaly-detection')}
              onChange={() => toggleSectionExpansion('anomaly-detection')}
            />
            <div className="collapse-title flex items-center gap-3">
              <svg className="w-6 h-6 text-warning" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h2 className="text-xl font-bold">智能异常检测</h2>
              <div className="badge badge-warning">AI驱动</div>
            </div>
            <div className="collapse-content">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4">
                {monitoringData.data && (
                  <>
                    <RealTimeMonitorCard
                      title="数据质量监控"
                      type="data_quality"
                      dataQuality={monitoringData.data.dataQuality}
                      refreshInterval={30}
                      onRefresh={monitoringData.refresh}
                    />
                    <RealTimeMonitorCard
                      title="工作流程监控"
                      type="workflow"
                      workflowProgress={[
                        ...monitoringData.data.workflowStatus.payrollApprovalProgress,
                        ...monitoringData.data.workflowStatus.hrChangeRequests
                      ]}
                      refreshInterval={60}
                      onRefresh={monitoringData.refresh}
                    />
                    <RealTimeMonitorCard
                      title="系统使用监控"
                      type="system_usage"
                      systemUsage={monitoringData.data.systemUsage}
                      refreshInterval={45}
                      onRefresh={monitoringData.refresh}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 3. ManagementSuggestions - 决策支持建议 */}
          <div className="collapse collapse-arrow bg-base-100 shadow-lg">
            <input 
              type="checkbox" 
              checked={expandedSections.has('management-suggestions')}
              onChange={() => toggleSectionExpansion('management-suggestions')}
            />
            <div className="collapse-title flex items-center gap-3">
              <svg className="w-6 h-6 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <h2 className="text-xl font-bold">管理洞察建议</h2>
              <div className="badge badge-success">智能推荐</div>
            </div>
            <div className="collapse-content">
              <div className="pt-4">
                {managementData.data && (
                  <InteractiveInsightPanel
                    title="智能管理建议"
                    recommendations={managementData.data.recommendations}
                    insights={managementData.data.insights}
                    maxItems={6}
                    collapsible={false}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 4. QuickActionPortal - 快速操作入口 */}
          <div className="collapse collapse-arrow bg-base-100 shadow-lg">
            <input 
              type="checkbox" 
              checked={expandedSections.has('quick-actions')}
              onChange={() => toggleSectionExpansion('quick-actions')}
            />
            <div className="collapse-title flex items-center gap-3">
              <svg className="w-6 h-6 text-info" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <h2 className="text-xl font-bold">快速操作中心</h2>
              <div className="badge badge-info">一键执行</div>
            </div>
            <div className="collapse-content">
              <div 
                className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-4"
                role="group"
                aria-label="快速操作按钮组"
              >
                <button 
                  className="btn btn-primary btn-outline"
                  onClick={() => handleQuickAction('monthly-report')}
                  aria-label="生成月度报告"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                  </svg>
                  月度报告
                </button>
                <button 
                  className="btn btn-secondary btn-outline"
                  onClick={() => handleQuickAction('payroll-analysis')}
                  aria-label="查看薪资分析报告"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clipRule="evenodd" />
                  </svg>
                  薪资分析
                </button>
                <button 
                  className="btn btn-accent btn-outline"
                  onClick={() => handleQuickAction('hr-overview')}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  人事概览
                </button>
                <button 
                  className="btn btn-warning btn-outline"
                  onClick={() => handleQuickAction('trend-analysis')}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  趋势分析
                </button>
                <button 
                  className="btn btn-error btn-outline"
                  onClick={() => handleQuickAction('risk-assessment')}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  风险评估
                </button>
                <button 
                  className="btn btn-neutral btn-outline"
                  onClick={() => handleQuickAction('export-data')}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  数据导出
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 状态提示区域 */}
      {!isLoading && monitoringData.data && (
        <div className="alert alert-info">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>
            系统状态: <strong className="capitalize">{monitoringData.data.overallStatus}</strong> | 
            数据更新: {new Date(monitoringData.data.lastUpdated).toLocaleTimeString()} |
            活跃用户: {monitoringData.data.systemUsage.activeUsers.current} 人
          </span>
        </div>
      )}
    </div>
  );
};

export default SmartDecisionDashboard;