import React from 'react';
import type { DataQualityMetrics, WorkflowProgress, SystemUsageData } from '@/hooks/monitoring/useSystemMonitoring';

interface RealTimeMonitorCardProps {
  title: string;
  type: 'data_quality' | 'workflow' | 'system_usage';
  dataQuality?: DataQualityMetrics;
  workflowProgress?: WorkflowProgress[];
  systemUsage?: SystemUsageData;
  refreshInterval?: number;
  className?: string;
  onRefresh?: () => void;
}

/**
 * 实时监控卡片组件
 * 
 * 基于DaisyUI progress, badge, indicator组件构建
 * 特色功能：
 * 1. 数据质量实时状态显示
 * 2. 系统性能指标监控
 * 3. 工作流程进度展示
 * 4. 自动刷新和状态指示
 * 5. 异常状态警告提示
 */
export const RealTimeMonitorCard: React.FC<RealTimeMonitorCardProps> = ({
  title,
  type,
  dataQuality,
  workflowProgress = [],
  systemUsage,
  refreshInterval = 30,
  className = '',
  onRefresh
}) => {
  // 获取整体状态
  const getOverallStatus = () => {
    switch (type) {
      case 'data_quality':
        if (!dataQuality) return 'unknown';
        const avgQuality = (dataQuality.completeness + dataQuality.timeliness + 
                          dataQuality.consistency + dataQuality.accuracy) / 4;
        if (avgQuality >= 90) return 'excellent';
        if (avgQuality >= 80) return 'good';
        if (avgQuality >= 70) return 'warning';
        return 'critical';
      
      case 'workflow':
        const overallProgress = workflowProgress.reduce((sum, flow) => 
          sum + (flow.completedItems / flow.totalItems), 0) / workflowProgress.length;
        if (overallProgress >= 0.9) return 'excellent';
        if (overallProgress >= 0.8) return 'good';
        if (overallProgress >= 0.6) return 'warning';
        return 'critical';
      
      case 'system_usage':
        if (!systemUsage) return 'unknown';
        const criticalMetrics = systemUsage.performanceMetrics.filter(m => m.status === 'critical').length;
        if (criticalMetrics === 0 && systemUsage.systemHealth.uptime >= 99.5) return 'excellent';
        if (criticalMetrics === 0 && systemUsage.systemHealth.uptime >= 99) return 'good';
        if (criticalMetrics <= 1) return 'warning';
        return 'critical';
      
      default:
        return 'unknown';
    }
  };

  // 获取状态样式
  const getStatusStyles = (status: string) => {
    const baseClass = "card bg-base-100 shadow-lg transition-all duration-300";
    
    switch (status) {
      case 'excellent':
        return `${baseClass} border-l-4 border-success hover:shadow-xl`;
      case 'good':
        return `${baseClass} border-l-4 border-info hover:shadow-xl`;
      case 'warning':
        return `${baseClass} border-l-4 border-warning hover:shadow-xl`;
      case 'critical':
        return `${baseClass} border-l-4 border-error hover:shadow-xl animate-pulse`;
      default:
        return `${baseClass} border-l-4 border-base-300`;
    }
  };

  // 获取状态指示器
  const getStatusIndicator = (status: string) => {
    const indicatorClasses = "indicator-item badge badge-xs";
    
    switch (status) {
      case 'excellent':
        return <span className={`${indicatorClasses} badge-success`}></span>;
      case 'good':
        return <span className={`${indicatorClasses} badge-info`}></span>;
      case 'warning':
        return <span className={`${indicatorClasses} badge-warning animate-pulse`}></span>;
      case 'critical':
        return <span className={`${indicatorClasses} badge-error animate-ping`}></span>;
      default:
        return <span className={`${indicatorClasses} badge-ghost`}></span>;
    }
  };

  const overallStatus = getOverallStatus();

  // 渲染数据质量监控
  const renderDataQualityMonitor = () => {
    if (!dataQuality) return <div>无数据质量信息</div>;

    const qualities = [
      { label: '完整性', value: dataQuality.completeness, key: 'completeness' },
      { label: '及时性', value: dataQuality.timeliness, key: 'timeliness' },
      { label: '一致性', value: dataQuality.consistency, key: 'consistency' },
      { label: '准确性', value: dataQuality.accuracy, key: 'accuracy' }
    ];

    return (
      <div className="space-y-4">
        {/* 质量指标 */}
        <div className="grid grid-cols-2 gap-3">
          {qualities.map(({ label, value, key }) => (
            <div key={key} className="stat bg-base-200 rounded-lg p-3">
              <div className="stat-title text-xs">{label}</div>
              <div className="stat-value text-lg flex items-center gap-2">
                {value.toFixed(0)}%
                <progress 
                  className={`progress w-16 ${
                    value >= 90 ? 'progress-success' : 
                    value >= 80 ? 'progress-info' : 
                    value >= 70 ? 'progress-warning' : 'progress-error'
                  }`} 
                  value={value} 
                  max={100}
                ></progress>
              </div>
            </div>
          ))}
        </div>

        {/* 数据质量问题 */}
        {dataQuality.issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">数据质量问题：</h4>
            {dataQuality.issues.slice(0, 3).map((issue, index) => (
              <div key={issue.id} className={`alert py-2 px-3 ${
                issue.severity === 'critical' ? 'alert-error' :
                issue.severity === 'high' ? 'alert-warning' : 'alert-info'
              }`}>
                <div className="flex-1">
                  <div className="font-medium text-sm">{issue.description}</div>
                  <div className="text-xs opacity-80">影响记录: {issue.affectedRecords}</div>
                </div>
                <span className={`badge badge-xs ${
                  issue.severity === 'critical' ? 'badge-error' :
                  issue.severity === 'high' ? 'badge-warning' : 'badge-info'
                }`}>
                  {issue.severity}
                </span>
              </div>
            ))}
            {dataQuality.issues.length > 3 && (
              <div className="text-xs text-base-content/60 text-center">
                还有 {dataQuality.issues.length - 3} 个问题...
              </div>
            )}
          </div>
        )}

        {/* 最后检查时间 */}
        <div className="text-xs text-base-content/60 text-center">
          最后检查: {new Date(dataQuality.lastChecked).toLocaleTimeString()}
        </div>
      </div>
    );
  };

  // 渲染工作流程监控
  const renderWorkflowMonitor = () => {
    if (workflowProgress.length === 0) return <div>无工作流程信息</div>;

    return (
      <div className="space-y-4">
        {workflowProgress.map((flow, index) => {
          const progress = (flow.completedItems / flow.totalItems) * 100;
          const hasBottlenecks = flow.bottlenecks.length > 0;
          
          return (
            <div key={index} className="border border-base-300 rounded-lg p-4">
              {/* 流程标题和状态 */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">{getProcessTypeLabel(flow.processType)}</h4>
                <span className={`badge badge-sm ${getStatusBadge(flow.status)}`}>
                  {getStatusLabel(flow.status)}
                </span>
              </div>

              {/* 进度条 */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-base-content/70">
                    进度: {flow.completedItems}/{flow.totalItems}
                  </span>
                  <span className="text-xs font-medium">{progress.toFixed(1)}%</span>
                </div>
                <progress 
                  className={`progress w-full ${
                    flow.status === 'completed' ? 'progress-success' :
                    flow.status === 'failed' ? 'progress-error' :
                    progress >= 80 ? 'progress-info' : 'progress-warning'
                  }`} 
                  value={progress} 
                  max={100}
                ></progress>
              </div>

              {/* 详细信息 */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-base-content/60">平均处理: </span>
                  <span className="font-medium">{flow.averageProcessingTime}分钟</span>
                </div>
                <div>
                  <span className="text-base-content/60">失败项: </span>
                  <span className={`font-medium ${flow.failedItems > 0 ? 'text-error' : ''}`}>
                    {flow.failedItems}
                  </span>
                </div>
              </div>

              {/* 瓶颈提醒 */}
              {hasBottlenecks && (
                <div className="mt-2">
                  <div className="alert alert-warning py-1 px-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs">瓶颈: {flow.bottlenecks.join(', ')}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染系统使用监控
  const renderSystemUsageMonitor = () => {
    if (!systemUsage) return <div>无系统使用信息</div>;

    return (
      <div className="space-y-4">
        {/* 用户活动 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">当前在线</div>
            <div className="stat-value text-lg">{systemUsage.activeUsers.current}</div>
            <div className="stat-desc text-xs">24h峰值: {systemUsage.activeUsers.peak24h}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">平均会话</div>
            <div className="stat-value text-lg">{systemUsage.activeUsers.averageSessionDuration}分</div>
          </div>
        </div>

        {/* 系统健康 */}
        <div className="border border-base-300 rounded-lg p-3">
          <h4 className="font-semibold text-sm mb-2">系统健康状况</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-lg font-bold text-success">{systemUsage.systemHealth.uptime}%</div>
              <div className="text-base-content/60">可用性</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-info">{systemUsage.systemHealth.responseTime}ms</div>
              <div className="text-base-content/60">响应时间</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-warning">{systemUsage.systemHealth.errorRate}%</div>
              <div className="text-base-content/60">错误率</div>
            </div>
          </div>
        </div>

        {/* 性能指标 */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">性能指标：</h4>
          {systemUsage.performanceMetrics.map((metric, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-base-200 rounded">
              <span className="text-sm">{metric.metric}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {metric.value} {metric.unit}
                </span>
                <span className={`badge badge-xs ${
                  metric.status === 'excellent' ? 'badge-success' :
                  metric.status === 'good' ? 'badge-info' :
                  metric.status === 'warning' ? 'badge-warning' : 'badge-error'
                }`}>
                  {metric.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 辅助函数
  const getProcessTypeLabel = (type: string) => {
    const labels = {
      payroll_approval: '薪资审批',
      hr_change: '人事变更',
      department_update: '部门更新',
      employee_onboarding: '员工入职'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'badge-ghost',
      in_progress: 'badge-info',
      completed: 'badge-success',
      failed: 'badge-error',
      cancelled: 'badge-warning'
    };
    return badges[status as keyof typeof badges] || 'badge-ghost';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: '待处理',
      in_progress: '进行中',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消'
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className={`${getStatusStyles(overallStatus)} ${className}`}>
      <div className="card-body p-4">
        {/* 标题和状态指示器 */}
        <div className="flex items-center justify-between mb-4">
          <div className="indicator">
            {getStatusIndicator(overallStatus)}
            <h3 className="card-title text-lg font-semibold flex items-center gap-2">
              {/* 类型图标 */}
              {type === 'data_quality' && (
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              )}
              {type === 'workflow' && (
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" />
                </svg>
              )}
              {type === 'system_usage' && (
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {title}
            </h3>
          </div>

          {/* 刷新按钮 */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-base-content/60">
              {refreshInterval}s自动刷新
            </div>
            {onRefresh && (
              <button 
                className="btn btn-ghost btn-xs"
                onClick={onRefresh}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="max-h-80 overflow-y-auto">
          {type === 'data_quality' && renderDataQualityMonitor()}
          {type === 'workflow' && renderWorkflowMonitor()}
          {type === 'system_usage' && renderSystemUsageMonitor()}
        </div>
      </div>
    </div>
  );
};

export default RealTimeMonitorCard;