import React, { useState } from 'react';
import { PerformanceDashboard } from '@/components/common/PerformanceDashboard';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

const PerformanceMonitorPage: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [slowQueryThreshold, setSlowQueryThreshold] = useState(1000);
  const [summaryWindow, setSummaryWindow] = useState(10);
  const [isEnabled, setIsEnabled] = useState(true);

  const {
    summary,
    slowQueries,
    errorQueries,
    insights,
    isLoading,
    lastUpdated,
    refresh,
    clearMetrics,
    exportMetrics,
    setEnabled,
    setSlowQueryThreshold: updateSlowQueryThreshold,
    isMonitoringEnabled
  } = usePerformanceMonitor({
    refreshInterval,
    summaryWindow,
    autoRefresh: true
  });

  const handleThresholdChange = (newThreshold: number) => {
    setSlowQueryThreshold(newThreshold);
    updateSlowQueryThreshold(newThreshold);
  };

  const handleToggleMonitoring = (enabled: boolean) => {
    setIsEnabled(enabled);
    setEnabled(enabled);
  };

  if (!isMonitoringEnabled) {
    return (
      <div className="container mx-auto p-6">
        <div className="alert alert-info">
          <span>⚠️</span>
          <div>
            <h3 className="font-bold">性能监控未启用</h3>
            <div className="text-sm">性能监控仅在开发环境中可用。</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">系统性能监控</h1>
        <p className="text-base-content/70">
          实时监控数据库查询性能，识别慢查询和错误，优化系统响应速度
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Dashboard */}
        <div className="xl:col-span-2">
          <PerformanceDashboard 
            autoRefresh={true}
            refreshInterval={refreshInterval}
            className="h-full"
          />
        </div>

        {/* Settings & Controls */}
        <div className="space-y-6">
          {/* Monitoring Controls */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h3 className="card-title text-base mb-4">监控设置</h3>
              
              <div className="space-y-4">
                {/* Enable/Disable Monitoring */}
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">启用性能监控</span>
                    <input 
                      type="checkbox" 
                      className="toggle toggle-primary"
                      checked={isEnabled}
                      onChange={(e) => handleToggleMonitoring(e.target.checked)}
                    />
                  </label>
                </div>

                {/* Refresh Interval */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">刷新间隔 (秒)</span>
                  </label>
                  <select 
                    className="select select-bordered select-sm"
                    value={refreshInterval / 1000}
                    onChange={(e) => setRefreshInterval(Number(e.target.value) * 1000)}
                  >
                    <option value={1}>1秒</option>
                    <option value={5}>5秒</option>
                    <option value={10}>10秒</option>
                    <option value={30}>30秒</option>
                    <option value={60}>1分钟</option>
                  </select>
                </div>

                {/* Slow Query Threshold */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">慢查询阈值 (毫秒)</span>
                  </label>
                  <input 
                    type="number"
                    className="input input-bordered input-sm"
                    value={slowQueryThreshold}
                    onChange={(e) => handleThresholdChange(Number(e.target.value))}
                    min="100"
                    max="10000"
                    step="100"
                  />
                </div>

                {/* Summary Window */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">统计时间窗口 (分钟)</span>
                  </label>
                  <select 
                    className="select select-bordered select-sm"
                    value={summaryWindow}
                    onChange={(e) => setSummaryWindow(Number(e.target.value))}
                  >
                    <option value={5}>5分钟</option>
                    <option value={10}>10分钟</option>
                    <option value={30}>30分钟</option>
                    <option value={60}>1小时</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h3 className="card-title text-base mb-4">操作</h3>
              
              <div className="space-y-3">
                <button 
                  className="btn btn-primary btn-sm w-full"
                  onClick={refresh}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      刷新中...
                    </>
                  ) : (
                    '🔄 手动刷新'
                  )}
                </button>

                <button 
                  className="btn btn-outline btn-sm w-full"
                  onClick={() => exportMetrics()}
                >
                  💾 导出数据
                </button>

                <button 
                  className="btn btn-error btn-sm w-full"
                  onClick={() => {
                    if (confirm('确定要清空所有性能指标吗？')) {
                      clearMetrics();
                    }
                  }}
                >
                  🗑️ 清空数据
                </button>
              </div>

              {lastUpdated && (
                <div className="text-xs text-base-content/50 text-center mt-4">
                  最后更新: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* Performance Insights */}
          {insights.length > 0 && (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body p-4">
                <h3 className="card-title text-base mb-4">💡 性能洞察</h3>
                
                <div className="space-y-2">
                  {insights.map((insight, index) => (
                    <div key={index} className="text-sm p-2 bg-base-200 rounded">
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Analysis */}
      {summary && (summary.slow_queries > 0 || summary.errors > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Slow Queries Analysis */}
          {slowQueries.length > 0 && (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h3 className="card-title text-lg mb-4">🐌 慢查询分析</h3>
                
                <div className="overflow-x-auto">
                  <table className="table table-xs">
                    <thead>
                      <tr>
                        <th>操作</th>
                        <th>耗时</th>
                        <th>时间</th>
                        <th>上下文</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slowQueries.slice(0, 10).map((query) => (
                        <tr key={query.id}>
                          <td>
                            <code className="text-xs">{query.operation}</code>
                          </td>
                          <td>
                            <span className="badge badge-warning badge-xs">
                              {query.duration}ms
                            </span>
                          </td>
                          <td className="text-xs">
                            {query.timestamp.toLocaleTimeString()}
                          </td>
                          <td className="text-xs truncate max-w-32" title={query.context}>
                            {query.context || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Error Queries Analysis */}
          {errorQueries.length > 0 && (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h3 className="card-title text-lg mb-4">❌ 错误查询分析</h3>
                
                <div className="space-y-3">
                  {errorQueries.slice(0, 5).map((query) => (
                    <div key={query.id} className="p-3 bg-error/10 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <code className="text-sm font-mono">{query.operation}</code>
                        <span className="text-xs text-base-content/50">
                          {query.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-error text-sm mb-2">
                        {query.error}
                      </div>
                      <div className="text-xs text-base-content/50">
                        耗时: {query.duration}ms {query.context && `• ${query.context}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="card bg-base-100 shadow-sm mt-6">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">📚 使用说明</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold mb-2">指标说明</h4>
              <ul className="space-y-1 text-base-content/70">
                <li>• <strong>总查询数</strong>: 统计时间窗口内的查询总数</li>
                <li>• <strong>平均耗时</strong>: 所有查询的平均响应时间</li>
                <li>• <strong>慢查询</strong>: 超过阈值的查询数量</li>
                <li>• <strong>错误数</strong>: 执行失败的查询数量</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">性能优化建议</h4>
              <ul className="space-y-1 text-base-content/70">
                <li>• 慢查询 {'>'} 10%: 考虑添加数据库索引</li>
                <li>• 平均耗时 {'>'} 500ms: 实现查询结果缓存</li>
                <li>• 高频操作: 考虑批量处理优化</li>
                <li>• 重复错误: 检查数据库连接和权限</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitorPage;