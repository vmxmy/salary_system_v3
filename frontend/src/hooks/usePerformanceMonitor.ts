import { useState, useEffect, useCallback, useRef } from 'react';

// 类型定义
export interface QueryPerformanceMetric {
  id: string;
  operation: string;
  duration: number;
  timestamp: Date;
  error?: string;
  details?: Record<string, any>;
}

export interface PerformanceSummary {
  total_queries: number;
  slow_queries: number;
  errors: number;
  average_duration: number;
  min_duration: number;
  max_duration: number;
  operations: Array<{
    operation: string;
    count: number;
    average_duration: number;
  }>;
  error_rate: number;
  throughput: number; // queries per minute
}

export interface UsePerformanceMonitorOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  summaryWindow?: number; // minutes for summary
  slowQueryThreshold?: number; // milliseconds
  enabled?: boolean;
}

export interface PerformanceMonitorState {
  summary: PerformanceSummary | null;
  slowQueries: QueryPerformanceMetric[];
  errorQueries: QueryPerformanceMetric[];
  isLoading: boolean;
  lastUpdated: Date | null;
  insights: string[];
}

/**
 * 纯 Hook 性能监控系统
 * 无服务层依赖，直接使用浏览器性能API和本地状态
 */
export const usePerformanceMonitor = (options: UsePerformanceMonitorOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 5000,
    summaryWindow = 10,
    slowQueryThreshold = 1000,
    enabled = process.env.NODE_ENV === 'development'
  } = options;

  // 状态管理
  const [state, setState] = useState<PerformanceMonitorState>({
    summary: null,
    slowQueries: [],
    errorQueries: [],
    isLoading: true,
    lastUpdated: null,
    insights: []
  });

  // 存储性能指标的本地缓存
  const metricsRef = useRef<QueryPerformanceMetric[]>([]);
  const enabledRef = useRef(enabled);
  const thresholdRef = useRef(slowQueryThreshold);

  // 记录性能指标
  const recordMetric = useCallback((metric: Omit<QueryPerformanceMetric, 'id' | 'timestamp'>) => {
    if (!enabledRef.current) return;

    const newMetric: QueryPerformanceMetric = {
      ...metric,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    metricsRef.current.push(newMetric);

    // 保持最近1000条记录，避免内存泄漏
    if (metricsRef.current.length > 1000) {
      metricsRef.current = metricsRef.current.slice(-800);
    }
  }, []);

  // 获取性能汇总
  const getPerformanceSummary = useCallback((windowMinutes: number): PerformanceSummary => {
    const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000);
    const recentMetrics = metricsRef.current.filter(
      metric => metric.timestamp >= cutoffTime
    );

    if (recentMetrics.length === 0) {
      return {
        total_queries: 0,
        slow_queries: 0,
        errors: 0,
        average_duration: 0,
        min_duration: 0,
        max_duration: 0,
        operations: [],
        error_rate: 0,
        throughput: 0
      };
    }

    const durations = recentMetrics.map(m => m.duration);
    const slowQueries = recentMetrics.filter(m => m.duration > thresholdRef.current).length;
    const errors = recentMetrics.filter(m => m.error).length;

    // 操作统计
    const operationStats = recentMetrics.reduce((acc, metric) => {
      const op = metric.operation;
      if (!acc[op]) {
        acc[op] = { count: 0, totalDuration: 0 };
      }
      acc[op].count++;
      acc[op].totalDuration += metric.duration;
      return acc;
    }, {} as Record<string, { count: number; totalDuration: number }>);

    const operations = Object.entries(operationStats)
      .map(([operation, stats]) => ({
        operation,
        count: stats.count,
        average_duration: Math.round(stats.totalDuration / stats.count)
      }))
      .sort((a, b) => b.count - a.count);

    return {
      total_queries: recentMetrics.length,
      slow_queries: slowQueries,
      errors,
      average_duration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      min_duration: Math.min(...durations),
      max_duration: Math.max(...durations),
      operations,
      error_rate: errors / recentMetrics.length,
      throughput: Math.round((recentMetrics.length / windowMinutes) * 10) / 10
    };
  }, []);

  // 获取慢查询
  const getSlowQueries = useCallback((windowMinutes: number): QueryPerformanceMetric[] => {
    const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000);
    return metricsRef.current
      .filter(metric => 
        metric.timestamp >= cutoffTime && 
        metric.duration > thresholdRef.current
      )
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 20); // 最多返回20条
  }, []);

  // 获取错误查询
  const getErrorQueries = useCallback((windowMinutes: number): QueryPerformanceMetric[] => {
    const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000);
    return metricsRef.current
      .filter(metric => 
        metric.timestamp >= cutoffTime && 
        metric.error
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20); // 最多返回20条
  }, []);

  // 生成性能洞察
  const generateInsights = useCallback((summary: PerformanceSummary, slowQueries: QueryPerformanceMetric[], errorQueries: QueryPerformanceMetric[]): string[] => {
    const insights: string[] = [];

    if (summary.total_queries === 0) {
      insights.push('暂无查询数据');
      return insights;
    }

    // 性能洞察
    if (summary.slow_queries > summary.total_queries * 0.1) {
      insights.push(`慢查询比例较高: ${Math.round(summary.slow_queries / summary.total_queries * 100)}%`);
    }

    if (summary.average_duration > 1000) {
      insights.push(`平均响应时间较长: ${summary.average_duration}ms`);
    } else if (summary.average_duration < 200) {
      insights.push(`响应时间良好: ${summary.average_duration}ms`);
    }

    if (summary.errors > 0) {
      insights.push(`发现 ${summary.errors} 个查询错误`);
    }

    if (summary.total_queries > 100) {
      insights.push(`查询频率较高: ${summary.total_queries} 次查询`);
    }

    // 操作洞察
    if (summary.operations.length > 0) {
      const topOp = summary.operations[0];
      if (topOp.count > summary.total_queries * 0.3) {
        insights.push(`热点操作: ${topOp.operation} (${topOp.count}次)`);
      }
    }

    // 错误模式
    if (errorQueries.length > 0) {
      const errorTypes = new Set(errorQueries.map(q => q.error?.split(':')[0] || 'Unknown'));
      if (errorTypes.size === 1) {
        insights.push(`重复错误模式: ${Array.from(errorTypes)[0]}`);
      }
    }

    // 吞吐量洞察
    if (summary.throughput > 10) {
      insights.push(`高吞吐量: ${summary.throughput} 查询/分钟`);
    }

    return insights;
  }, []);

  // 刷新数据
  const refreshData = useCallback(() => {
    setState(prevState => ({ ...prevState, isLoading: true }));

    try {
      const summary = getPerformanceSummary(summaryWindow);
      const slowQueries = getSlowQueries(summaryWindow);
      const errorQueries = getErrorQueries(summaryWindow);
      const insights = generateInsights(summary, slowQueries, errorQueries);

      setState({
        summary,
        slowQueries,
        errorQueries,
        insights,
        isLoading: false,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('[usePerformanceMonitor] Error refreshing data:', error);
      setState(prevState => ({
        ...prevState,
        isLoading: false,
        lastUpdated: new Date()
      }));
    }
  }, [summaryWindow, getPerformanceSummary, getSlowQueries, getErrorQueries, generateInsights]);

  // 手动刷新
  const refresh = useCallback(() => {
    refreshData();
  }, [refreshData]);

  // 清除指标
  const clearMetrics = useCallback(() => {
    metricsRef.current = [];
    refreshData();
  }, [refreshData]);

  // 导出指标
  const exportMetrics = useCallback(() => {
    try {
      const exportData = {
        metrics: metricsRef.current,
        summary: state.summary,
        exportTime: new Date().toISOString(),
        window: summaryWindow
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `performance-metrics-${new Date().toISOString().slice(0, 19)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('[usePerformanceMonitor] Error exporting metrics:', error);
      return false;
    }
  }, [state.summary, summaryWindow]);

  // 设置监控状态
  const setEnabled = useCallback((newEnabled: boolean) => {
    enabledRef.current = newEnabled;
  }, []);

  // 设置慢查询阈值
  const setSlowQueryThreshold = useCallback((threshold: number) => {
    thresholdRef.current = threshold;
  }, []);

  // 自动刷新设置
  useEffect(() => {
    refreshData();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshData]);

  // 浏览器性能API集成
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // 监听导航性能
    const handleNavigation = () => {
      if (window.performance && window.performance.navigation) {
        const navTiming = window.performance.timing;
        if (navTiming && navTiming.loadEventEnd > 0) {
          const pageLoadTime = navTiming.loadEventEnd - navTiming.navigationStart;
          recordMetric({
            operation: 'page_load',
            duration: pageLoadTime
          });
        }
      }
    };

    // 页面加载完成后记录性能
    if (document.readyState === 'complete') {
      handleNavigation();
    } else {
      window.addEventListener('load', handleNavigation);
      return () => window.removeEventListener('load', handleNavigation);
    }
  }, [enabled, recordMetric]);

  return {
    ...state,
    refresh,
    clearMetrics,
    exportMetrics,
    setEnabled,
    setSlowQueryThreshold,
    recordMetric,
    isMonitoringEnabled: enabledRef.current,
    slowQueryThreshold: thresholdRef.current
  };
};

export default usePerformanceMonitor;