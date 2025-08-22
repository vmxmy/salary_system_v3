import React, { type ComponentType, useEffect, useState, memo, Suspense } from 'react';
import { ComponentLoadingPerformance, SmartPreloader } from '../config/LazyLoadingConfig';

interface PerformanceMetrics {
  renderTime: number;
  mountTime: number;
  updateCount: number;
  lastUpdate: number;
  memoryUsage?: number;
}

interface WithPerformanceMonitoringOptions {
  enableMemoryTracking?: boolean;
  enableRenderTracking?: boolean;
  enableUserInteractionTracking?: boolean;
  componentName?: string;
  logToConsole?: boolean;
  warningThresholds?: {
    renderTime?: number;
    updateCount?: number;
  };
}

/**
 * 性能监控高阶组件
 * 
 * 为组件添加性能监控功能，包括：
 * - 渲染时间监控
 * - 挂载时间监控
 * - 更新频率监控
 * - 内存使用监控
 * - 用户交互追踪
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithPerformanceMonitoringOptions = {}
) {
  const {
    enableMemoryTracking = false,
    enableRenderTracking = true,
    enableUserInteractionTracking = true,
    componentName = WrappedComponent.displayName || WrappedComponent.name || 'Unknown',
    logToConsole = process.env.NODE_ENV === 'development',
    warningThresholds = {
      renderTime: 16, // 超过16ms的渲染时间会发出警告
      updateCount: 50  // 超过50次更新会发出警告
    }
  } = options;

  const PerformanceEnhancedComponent = memo((props: P) => {
    const [metrics, setMetrics] = useState<PerformanceMetrics>({
      renderTime: 0,
      mountTime: 0,
      updateCount: 0,
      lastUpdate: Date.now()
    });

    const [isVisible, setIsVisible] = useState(true);

    // 组件挂载时间记录
    useEffect(() => {
      const mountStart = performance.now();
      
      // 记录挂载完成时间
      const mountEnd = performance.now();
      const mountTime = mountEnd - mountStart;
      
      setMetrics(prev => ({
        ...prev,
        mountTime,
        lastUpdate: Date.now()
      }));

      if (logToConsole) {
        console.log(`[Performance] ${componentName} mounted in ${mountTime.toFixed(2)}ms`);
      }

      // 记录用户交互
      if (enableUserInteractionTracking) {
        SmartPreloader.recordInteraction(componentName);
      }

      return () => {
        // 组件卸载时的清理工作
        if (logToConsole) {
          console.log(`[Performance] ${componentName} unmounted after ${metrics.updateCount} updates`);
        }
      };
    }, []);

    // 渲染时间监控
    useEffect(() => {
      if (!enableRenderTracking) return;

      const renderStart = performance.now();
      
      // 使用 requestAnimationFrame 确保DOM更新完成后再计算渲染时间
      requestAnimationFrame(() => {
        const renderEnd = performance.now();
        const renderTime = renderEnd - renderStart;
        
        setMetrics(prev => ({
          ...prev,
          renderTime,
          updateCount: prev.updateCount + 1,
          lastUpdate: Date.now()
        }));

        // 性能警告
        if (warningThresholds.renderTime && renderTime > warningThresholds.renderTime) {
          console.warn(
            `[Performance Warning] ${componentName} render time (${renderTime.toFixed(2)}ms) ` +
            `exceeds threshold (${warningThresholds.renderTime}ms)`
          );
        }

        if (warningThresholds.updateCount && metrics.updateCount > warningThresholds.updateCount) {
          console.warn(
            `[Performance Warning] ${componentName} update count (${metrics.updateCount}) ` +
            `exceeds threshold (${warningThresholds.updateCount})`
          );
        }

        if (logToConsole && renderTime > 1) {
          console.log(`[Performance] ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
        }
      });
    });

    // 内存使用监控
    useEffect(() => {
      if (!enableMemoryTracking || !('memory' in performance)) return;

      const checkMemoryUsage = () => {
        const memory = (performance as any).memory;
        if (memory) {
          const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
          setMetrics(prev => ({
            ...prev,
            memoryUsage
          }));

          if (logToConsole && memoryUsage > 50) {
            console.log(`[Performance] ${componentName} memory usage: ${memoryUsage.toFixed(2)}MB`);
          }
        }
      };

      const interval = setInterval(checkMemoryUsage, 5000);
      return () => clearInterval(interval);
    }, []);

    // 可见性监控（用于性能优化）
    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          setIsVisible(entry.isIntersecting);
          if (logToConsole) {
            console.log(`[Performance] ${componentName} visibility: ${entry.isIntersecting}`);
          }
        },
        { threshold: 0.1 }
      );

      const element = document.getElementById(`perf-${componentName}`);
      if (element) {
        observer.observe(element);
      }

      return () => observer.disconnect();
    }, []);

    // 错误边界处理
    const handleError = (error: Error, errorInfo: any) => {
      ComponentLoadingPerformance.recordError(componentName, error);
      console.error(`[Performance Error] ${componentName}:`, error, errorInfo);
    };

    // 开发环境下显示性能指标
    const renderPerformanceIndicator = () => {
      if (process.env.NODE_ENV !== 'development' || !logToConsole) return null;

      return (
        <div className="fixed bottom-4 right-4 z-50 opacity-50 hover:opacity-100 transition-opacity">
          <div className="bg-base-300 text-base-content p-2 rounded text-xs space-y-1 max-w-xs">
            <div className="font-semibold">{componentName}</div>
            <div>Render: {metrics.renderTime.toFixed(1)}ms</div>
            <div>Mount: {metrics.mountTime.toFixed(1)}ms</div>
            <div>Updates: {metrics.updateCount}</div>
            {metrics.memoryUsage && (
              <div>Memory: {metrics.memoryUsage.toFixed(1)}MB</div>
            )}
            <div className={`w-2 h-2 rounded-full ${isVisible ? 'bg-success' : 'bg-error'}`}></div>
          </div>
        </div>
      );
    };

    try {
      return (
        <div id={`perf-${componentName}`} className="performance-monitored-component">
          <WrappedComponent {...props} />
          {renderPerformanceIndicator()}
        </div>
      );
    } catch (error) {
      handleError(error as Error, { componentStack: componentName });
      return (
        <div className="alert alert-error">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>组件 {componentName} 加载失败</span>
        </div>
      );
    }
  });

  PerformanceEnhancedComponent.displayName = `withPerformanceMonitoring(${componentName})`;

  return PerformanceEnhancedComponent;
}

/**
 * 性能优化的Suspense包装器
 */
export function PerformanceSuspense({ 
  children, 
  fallback, 
  componentName = 'Component' 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
  componentName?: string;
}) {
  const [loadingStartTime] = useState(performance.now());

  useEffect(() => {
    const loadingEndTime = performance.now();
    const loadingDuration = loadingEndTime - loadingStartTime;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} suspense resolved in ${loadingDuration.toFixed(2)}ms`);
    }
  }, [loadingStartTime, componentName]);

  const defaultFallback = (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-base-content/70">加载 {componentName} 中...</p>
      </div>
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

/**
 * 性能优化Hook
 */
export function usePerformanceMetrics(componentName: string) {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setMetrics(prev => ({
        renderCount: prev.renderCount + 1,
        lastRenderTime: renderTime,
        averageRenderTime: (prev.averageRenderTime * prev.renderCount + renderTime) / (prev.renderCount + 1)
      }));
    };
  });

  return metrics;
}

/**
 * 批量性能监控工具
 */
export class BatchPerformanceMonitor {
  private static componentMetrics = new Map<string, PerformanceMetrics[]>();

  static recordMetrics(componentName: string, metrics: PerformanceMetrics) {
    const existing = this.componentMetrics.get(componentName) || [];
    existing.push(metrics);
    
    // 只保留最近50次的记录
    if (existing.length > 50) {
      existing.shift();
    }
    
    this.componentMetrics.set(componentName, existing);
  }

  static getAverageMetrics(componentName: string) {
    const metrics = this.componentMetrics.get(componentName) || [];
    if (metrics.length === 0) return null;

    const avg = metrics.reduce((acc, metric) => ({
      renderTime: acc.renderTime + metric.renderTime,
      mountTime: acc.mountTime + metric.mountTime,
      updateCount: acc.updateCount + metric.updateCount,
      lastUpdate: Math.max(acc.lastUpdate, metric.lastUpdate)
    }), {
      renderTime: 0,
      mountTime: 0,
      updateCount: 0,
      lastUpdate: 0
    });

    return {
      renderTime: avg.renderTime / metrics.length,
      mountTime: avg.mountTime / metrics.length,
      updateCount: avg.updateCount / metrics.length,
      lastUpdate: avg.lastUpdate,
      sampleCount: metrics.length
    };
  }

  static getAllMetrics() {
    const report: Record<string, any> = {};
    
    this.componentMetrics.forEach((metrics, componentName) => {
      report[componentName] = this.getAverageMetrics(componentName);
    });
    
    return report;
  }

  static clearMetrics() {
    this.componentMetrics.clear();
  }
}