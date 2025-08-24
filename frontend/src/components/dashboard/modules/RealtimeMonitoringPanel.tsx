import React, { useState, useEffect } from 'react';
import { useSystemMonitoring } from '@/hooks/monitoring/useSystemMonitoring';
import { usePersonalizedView } from '@/hooks/personalization/usePersonalizedView';
import { RealTimeMonitorCard } from '../enhanced/RealTimeMonitorCard';

interface RealtimeMonitoringPanelProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // 秒
}

/**
 * 实时监控面板组件
 * 
 * 专注于系统运营状态的实时监控和可视化
 * 与其他统计模块的差异：关注系统层面的运营健康，非业务数据
 * 
 * 核心功能：
 * 1. SystemHealthOverview - 系统健康概览
 * 2. DataQualityDashboard - 数据质量仪表板  
 * 3. WorkflowMonitoring - 工作流程监控
 * 4. PerformanceMetrics - 性能指标监控
 * 5. AlertManagement - 告警管理中心
 * 
 * 设计原则：
 * - 实时性：自动刷新和实时状态更新
 * - 直观性：清晰的状态指示和趋势展示
 * - 可操作：快速响应和问题定位能力
 */
export const RealtimeMonitoringPanel: React.FC<RealtimeMonitoringPanelProps> = ({
  className = '',
  autoRefresh = true,
  refreshInterval = 30
}) => {
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // 获取监控数据
  const { data: monitoringData, isLoading, error, refresh } = useSystemMonitoring();
  const { viewState, updateFilter } = usePersonalizedView();

  // 自动刷新逻辑
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(async () => {
      await refresh();
      setLastRefreshTime(new Date());
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, refreshInterval, refresh]);

  // 手动刷新
  const handleManualRefresh = async () => {
    await refresh();
    setLastRefreshTime(new Date());
  };

  // 切换自动刷新
  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
  };

  // 处理指标点击
  const handleMetricClick = (metricId: string) => {
    setSelectedMetric(selectedMetric === metricId ? null : metricId);
  };

  // 处理告警操作
  const handleAlertAction = (alertId: string, action: 'acknowledge' | 'resolve' | 'escalate') => {
    console.log(`告警操作: ${alertId} - ${action}`);
    // 实际应用中会调用相应的API
  };

  // 获取系统整体状态样式
  const getSystemStatusStyle = () => {
    if (!monitoringData) return 'badge-ghost';
    
    switch (monitoringData.overallStatus) {
      case 'healthy': return 'badge-success';
      case 'warning': return 'badge-warning';
      case 'critical': return 'badge-error';
      default: return 'badge-ghost';
    }
  };

  // 获取系统状态文本
  const getSystemStatusText = () => {
    if (!monitoringData) return '未知';
    
    const statusTexts = {
      healthy: '健康',
      warning: '警告',
      critical: '严重'
    };
    
    return statusTexts[monitoringData.overallStatus] || '未知';
  };

  if (error) {
    return (
      <div className={`card bg-base-100 shadow-lg ${className}`}>
        <div className="card-body">
          <div className="alert alert-error">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>监控数据加载失败</span>
            <button className="btn btn-sm btn-ghost" onClick={handleManualRefresh}>
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 监控面板标题和控制区 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-info text-info-content rounded-full w-12 h-12 flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">实时监控面板</h1>
            <p className="text-base-content/70">系统运营状态实时监控</p>
          </div>
          {monitoringData && (
            <div className={`badge ${getSystemStatusStyle()} badge-lg`}>
              {getSystemStatusText()}
            </div>
          )}
        </div>

        {/* 监控控制 */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 自动刷新控制 */}
          <div className="form-control">
            <label className="label cursor-pointer gap-2">
              <span className="label-text">自动刷新</span>
              <input 
                type="checkbox" 
                className="toggle toggle-primary"
                checked={autoRefreshEnabled}
                onChange={toggleAutoRefresh}
              />
            </label>
          </div>

          {/* 手动刷新按钮 */}
          <button 
            className="btn btn-primary btn-outline"
            onClick={handleManualRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            )}
            刷新
          </button>

          {/* 刷新时间显示 */}
          <div className="text-sm text-base-content/60 flex items-center">
            最后更新: {lastRefreshTime.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* 加载状态 */}
      {isLoading && !monitoringData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card bg-base-100 shadow animate-pulse">
              <div className="card-body">
                <div className="h-6 bg-base-300 rounded w-3/4 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-base-300 rounded"></div>
                  <div className="h-4 bg-base-300 rounded w-5/6"></div>
                  <div className="h-4 bg-base-300 rounded w-4/6"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 主监控内容 */}
      {!isLoading && monitoringData && (
        <>
          {/* 1. SystemHealthOverview - 系统健康概览 */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title flex items-center gap-2">
                <svg className="w-6 h-6 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                系统健康概览
                <div className="badge badge-info">实时</div>
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title text-xs">系统可用性</div>
                  <div className="stat-value text-lg text-success">
                    {monitoringData.systemUsage.systemHealth.uptime}%
                  </div>
                  <div className="stat-desc">24小时内</div>
                </div>
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title text-xs">响应时间</div>
                  <div className="stat-value text-lg text-info">
                    {monitoringData.systemUsage.systemHealth.responseTime}ms
                  </div>
                  <div className="stat-desc">平均值</div>
                </div>
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title text-xs">错误率</div>
                  <div className="stat-value text-lg text-warning">
                    {monitoringData.systemUsage.systemHealth.errorRate}%
                  </div>
                  <div className="stat-desc">近1小时</div>
                </div>
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title text-xs">在线用户</div>
                  <div className="stat-value text-lg text-primary">
                    {monitoringData.systemUsage.activeUsers.current}
                  </div>
                  <div className="stat-desc">当前活跃</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. 核心监控卡片区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* DataQualityDashboard - 数据质量仪表板 */}
            <RealTimeMonitorCard
              title="数据质量监控"
              type="data_quality"
              dataQuality={monitoringData.dataQuality}
              refreshInterval={refreshInterval}
              onRefresh={handleManualRefresh}
              className="col-span-1"
            />

            {/* WorkflowMonitoring - 工作流程监控 */}
            <RealTimeMonitorCard
              title="工作流程状态"
              type="workflow"
              workflowProgress={[
                ...monitoringData.workflowStatus.payrollApprovalProgress,
                ...monitoringData.workflowStatus.hrChangeRequests,
                ...monitoringData.workflowStatus.systemOperations
              ]}
              refreshInterval={refreshInterval}
              onRefresh={handleManualRefresh}
              className="col-span-1"
            />

            {/* PerformanceMetrics - 性能指标监控 */}
            <RealTimeMonitorCard
              title="系统性能监控"
              type="system_usage"
              systemUsage={monitoringData.systemUsage}
              refreshInterval={refreshInterval}
              onRefresh={handleManualRefresh}
              className="col-span-1"
            />
          </div>

          {/* 3. AlertManagement - 告警管理中心 */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title flex items-center gap-2">
                <svg className="w-6 h-6 text-warning" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                系统告警中心
                {monitoringData.dataQuality.issues.length > 0 && (
                  <div className="badge badge-error">{monitoringData.dataQuality.issues.length}</div>
                )}
              </h2>

              {/* 数据质量问题告警 */}
              {monitoringData.dataQuality.issues.length > 0 ? (
                <div className="space-y-3 mt-4">
                  {monitoringData.dataQuality.issues.slice(0, 5).map((issue) => (
                    <div key={issue.id} className={`alert ${
                      issue.severity === 'critical' ? 'alert-error' :
                      issue.severity === 'high' ? 'alert-warning' : 'alert-info'
                    }`}>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{issue.description}</h3>
                          <span className={`badge badge-sm ${
                            issue.severity === 'critical' ? 'badge-error' :
                            issue.severity === 'high' ? 'badge-warning' : 'badge-info'
                          }`}>
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-sm opacity-80 mt-1">
                          影响范围: {issue.affectedRecords} 条记录 | 数据源: {issue.source}
                        </p>
                        <p className="text-sm opacity-70 mt-1">
                          建议: {issue.recommendation}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button 
                          className="btn btn-xs btn-ghost"
                          onClick={() => handleAlertAction(issue.id, 'acknowledge')}
                        >
                          确认
                        </button>
                        <button 
                          className="btn btn-xs btn-primary"
                          onClick={() => handleAlertAction(issue.id, 'resolve')}
                        >
                          处理
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {monitoringData.dataQuality.issues.length > 5 && (
                    <div className="text-center">
                      <button className="btn btn-ghost btn-sm">
                        查看全部 {monitoringData.dataQuality.issues.length} 个告警
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto text-success mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-lg font-semibold text-success">系统运行正常</p>
                  <p className="text-base-content/60">暂无告警需要处理</p>
                </div>
              )}
            </div>
          </div>

          {/* 4. 推荐系统操作 */}
          {monitoringData.recommendedActions.length > 0 && (
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h2 className="card-title flex items-center gap-2">
                  <svg className="w-6 h-6 text-info" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  推荐系统操作
                  <div className="badge badge-info">{monitoringData.recommendedActions.length}</div>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {monitoringData.recommendedActions.map((action) => (
                    <div key={action.id} className="card bg-base-200 shadow">
                      <div className="card-body p-4">
                        <div className="flex items-start justify-between">
                          <h3 className="card-title text-base">{action.title}</h3>
                          <span className={`badge badge-sm ${
                            action.priority === 'urgent' ? 'badge-error' :
                            action.priority === 'high' ? 'badge-warning' :
                            action.priority === 'medium' ? 'badge-info' : 'badge-ghost'
                          }`}>
                            {action.priority}
                          </span>
                        </div>
                        <p className="text-sm text-base-content/70 mt-2">{action.description}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                          <div>
                            <span className="text-base-content/60">预期影响: </span>
                            <span>{action.estimatedImpact}</span>
                          </div>
                          <div>
                            <span className="text-base-content/60">预估耗时: </span>
                            <span>{action.estimatedEffort}</span>
                          </div>
                        </div>
                        {action.deadline && (
                          <div className="text-xs text-warning mt-2">
                            截止时间: {new Date(action.deadline).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RealtimeMonitoringPanel;