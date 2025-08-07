import { useState, useEffect, useCallback } from 'react';
import { performanceMonitor } from '@/services/performance-monitor.service';
import type { PerformanceSummary, QueryPerformanceMetric } from '@/services/performance-monitor.service';

export interface UsePerformanceMonitorOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  summaryWindow?: number; // minutes for summary
}

export interface PerformanceMonitorState {
  summary: PerformanceSummary | null;
  slowQueries: QueryPerformanceMetric[];
  errorQueries: QueryPerformanceMetric[];
  isLoading: boolean;
  lastUpdated: Date | null;
}

export const usePerformanceMonitor = (options: UsePerformanceMonitorOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 5000,
    summaryWindow = 10
  } = options;

  const [state, setState] = useState<PerformanceMonitorState>({
    summary: null,
    slowQueries: [],
    errorQueries: [],
    isLoading: true,
    lastUpdated: null
  });

  const refreshData = useCallback(() => {
    setState(prevState => ({ ...prevState, isLoading: true }));

    try {
      const summary = performanceMonitor.getPerformanceSummary(summaryWindow);
      const slowQueries = performanceMonitor.getSlowQueries(summaryWindow);
      const errorQueries = performanceMonitor.getErrorQueries(summaryWindow);

      setState({
        summary,
        slowQueries,
        errorQueries,
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
  }, [summaryWindow]);

  // Manual refresh function
  const refresh = useCallback(() => {
    refreshData();
  }, [refreshData]);

  // Clear metrics function
  const clearMetrics = useCallback(() => {
    performanceMonitor.clearMetrics();
    refreshData();
  }, [refreshData]);

  // Export metrics function
  const exportMetrics = useCallback(() => {
    try {
      const exportData = performanceMonitor.exportMetrics();
      const blob = new Blob([exportData], { type: 'application/json' });
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
  }, []);

  // Configure monitoring settings
  const setEnabled = useCallback((enabled: boolean) => {
    performanceMonitor.setEnabled(enabled);
  }, []);

  const setSlowQueryThreshold = useCallback((threshold: number) => {
    performanceMonitor.setSlowQueryThreshold(threshold);
  }, []);

  // Initial data load and auto-refresh setup
  useEffect(() => {
    refreshData();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshData]);

  // Compute performance insights
  const insights = useState(() => {
    if (!state.summary) return [];

    const insights: string[] = [];
    const { summary, slowQueries, errorQueries } = state;

    if (summary.total_queries === 0) {
      insights.push('暂无查询数据');
      return insights;
    }

    // Performance insights
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

    // Operation insights
    if (summary.operations.length > 0) {
      const topOp = summary.operations[0];
      if (topOp.count > summary.total_queries * 0.3) {
        insights.push(`热点操作: ${topOp.operation} (${topOp.count}次)`);
      }
    }

    // Error patterns
    if (errorQueries.length > 0) {
      const errorTypes = new Set(errorQueries.map(q => q.error?.split(':')[0] || 'Unknown'));
      if (errorTypes.size === 1) {
        insights.push(`重复错误模式: ${Array.from(errorTypes)[0]}`);
      }
    }

    return insights;
  })[0];

  return {
    ...state,
    insights,
    refresh,
    clearMetrics,
    exportMetrics,
    setEnabled,
    setSlowQueryThreshold,
    isMonitoringEnabled: process.env.NODE_ENV === 'development',
  };
};

export default usePerformanceMonitor;