import React, { useState, useEffect } from 'react';
import { performanceMonitor, PerformanceSummary, QueryPerformanceMetric } from '@/services/performance-monitor.service';

interface PerformanceDashboardProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className = '',
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [slowQueries, setSlowQueries] = useState<QueryPerformanceMetric[]>([]);
  const [errorQueries, setErrorQueries] = useState<QueryPerformanceMetric[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const refreshData = () => {
    const newSummary = performanceMonitor.getPerformanceSummary();
    const newSlowQueries = performanceMonitor.getSlowQueries(10);
    const newErrorQueries = performanceMonitor.getErrorQueries(10);

    setSummary(newSummary);
    setSlowQueries(newSlowQueries);
    setErrorQueries(newErrorQueries);
  };

  useEffect(() => {
    // Initial load
    refreshData();

    // Set up auto-refresh if enabled
    if (autoRefresh) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const handleExportMetrics = () => {
    const exportData = performanceMonitor.exportMetrics();
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearMetrics = () => {
    if (confirm('确定要清空所有性能指标吗？')) {
      performanceMonitor.clearMetrics();
      refreshData();
    }
  };

  if (!summary) {
    return (
      <div className={`card bg-base-100 shadow-sm ${className}`}>
        <div className="card-body">
          <h3 className="card-title text-sm">性能监控</h3>
          <div className="text-base-content/70">暂无性能数据</div>
        </div>
      </div>
    );
  }

  const getPerformanceColor = (avgDuration: number) => {
    if (avgDuration > 2000) return 'text-error';
    if (avgDuration > 1000) return 'text-warning';
    return 'text-success';
  };

  const getPerformanceBadge = (avgDuration: number) => {
    if (avgDuration > 2000) return 'badge-error';
    if (avgDuration > 1000) return 'badge-warning';
    return 'badge-success';
  };

  return (
    <div className={`card bg-base-100 shadow-sm ${className}`}>
      <div className="card-body p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-title text-sm flex items-center gap-2">
            <span className="text-lg">📊</span>
            性能监控
            {summary.errors > 0 && (
              <div className="badge badge-error badge-sm">{summary.errors} 错误</div>
            )}
            {summary.slow_queries > 0 && (
              <div className="badge badge-warning badge-sm">{summary.slow_queries} 慢查询</div>
            )}
          </h3>
          <div className="flex gap-2">
            <button 
              className="btn btn-ghost btn-xs"
              onClick={refreshData}
              title="手动刷新"
            >
              🔄
            </button>
            <button 
              className="btn btn-ghost btn-xs"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "收起详情" : "展开详情"}
            >
              {isExpanded ? '🔼' : '🔽'}
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          <div className="stat p-2">
            <div className="stat-value text-lg text-primary">{summary.total_queries}</div>
            <div className="stat-title text-xs">总查询数</div>
          </div>
          <div className="stat p-2">
            <div className={`stat-value text-lg ${getPerformanceColor(summary.average_duration)}`}>
              {summary.average_duration}ms
            </div>
            <div className="stat-title text-xs">平均耗时</div>
          </div>
          <div className="stat p-2">
            <div className="stat-value text-lg text-warning">{summary.slow_queries}</div>
            <div className="stat-title text-xs">慢查询</div>
          </div>
          <div className="stat p-2">
            <div className="stat-value text-lg text-error">{summary.errors}</div>
            <div className="stat-title text-xs">错误数</div>
          </div>
        </div>

        {/* Top Operations */}
        {summary.operations.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-xs mb-2">热门操作 (前5个)</h4>
            <div className="space-y-1">
              {summary.operations.slice(0, 5).map((op, index) => (
                <div key={op.operation} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-base-content/70">#{index + 1}</span>
                    <code className="text-xs bg-base-200 px-1 rounded truncate">
                      {op.operation}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base-content/70">{op.count}次</span>
                    <span className={`badge badge-xs ${getPerformanceBadge(op.avg_duration)}`}>
                      {op.avg_duration}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button 
                className="btn btn-outline btn-xs"
                onClick={handleExportMetrics}
                title="导出性能数据"
              >
                💾 导出数据
              </button>
              <button 
                className="btn btn-outline btn-xs btn-error"
                onClick={handleClearMetrics}
                title="清空所有指标"
              >
                🗑️ 清空指标
              </button>
            </div>

            {/* Recent Slow Queries */}
            {slowQueries.length > 0 && (
              <div>
                <h4 className="font-semibold text-xs mb-2 flex items-center gap-2">
                  🐌 最近慢查询 ({slowQueries.length})
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {slowQueries.slice(0, 5).map((query) => (
                    <div key={query.id} className="bg-warning/10 p-2 rounded text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <code className="text-xs font-mono">{query.operation}</code>
                        <span className="badge badge-warning badge-xs">{query.duration}ms</span>
                      </div>
                      <div className="text-base-content/50 text-xs">
                        {query.timestamp.toLocaleTimeString()}
                        {query.context && ` • ${query.context}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Error Queries */}
            {errorQueries.length > 0 && (
              <div>
                <h4 className="font-semibold text-xs mb-2 flex items-center gap-2">
                  ❌ 最近错误查询 ({errorQueries.length})
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {errorQueries.slice(0, 3).map((query) => (
                    <div key={query.id} className="bg-error/10 p-2 rounded text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <code className="text-xs font-mono">{query.operation}</code>
                        <span className="badge badge-error badge-xs">{query.duration}ms</span>
                      </div>
                      <div className="text-error text-xs mb-1 truncate">
                        {query.error}
                      </div>
                      <div className="text-base-content/50 text-xs">
                        {query.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Tips */}
            <div className="bg-info/10 p-3 rounded">
              <h4 className="font-semibold text-xs mb-2">💡 性能优化建议</h4>
              <div className="text-xs text-base-content/70 space-y-1">
                {summary.slow_queries > summary.total_queries * 0.1 && (
                  <div>• 慢查询比例较高({Math.round(summary.slow_queries / summary.total_queries * 100)}%)，建议优化数据库查询</div>
                )}
                {summary.average_duration > 500 && (
                  <div>• 平均响应时间较长，考虑添加数据库索引或缓存</div>
                )}
                {summary.errors > 0 && (
                  <div>• 发现查询错误，请检查数据库连接和查询语法</div>
                )}
                {summary.total_queries > 100 && (
                  <div>• 查询数量较多，考虑实现查询结果缓存</div>
                )}
                {summary.operations.some(op => op.count > 10) && (
                  <div>• 发现高频操作，可考虑批量处理优化</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-base-content/50 text-center mt-4">
          数据来源：最近10分钟 • 
          {autoRefresh ? ` 每${refreshInterval/1000}秒自动刷新` : ' 手动刷新'}
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;