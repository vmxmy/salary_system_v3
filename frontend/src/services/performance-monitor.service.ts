import { supabase } from '@/lib/supabase';

export interface QueryPerformanceMetric {
  id: string;
  operation: string;
  table?: string;
  method: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  duration: number; // milliseconds
  rows_affected?: number;
  error?: string;
  timestamp: Date;
  user_id?: string;
  context?: string;
}

export interface PerformanceSummary {
  total_queries: number;
  average_duration: number;
  slow_queries: number;
  errors: number;
  operations: Array<{
    operation: string;
    count: number;
    avg_duration: number;
    max_duration: number;
  }>;
}

export class PerformanceMonitorService {
  private metrics: QueryPerformanceMetric[] = [];
  private isEnabled = process.env.NODE_ENV === 'development';
  private slowQueryThreshold = 1000; // 1 second
  private maxMetrics = 1000; // Maximum metrics to keep in memory
  
  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`[PerformanceMonitor] Monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set slow query threshold in milliseconds
   */
  setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold;
    console.log(`[PerformanceMonitor] Slow query threshold set to ${threshold}ms`);
  }

  /**
   * Start monitoring a query operation
   */
  startOperation(operation: string, table?: string, context?: string): {
    end: (error?: string) => void;
    endWithResult: (result: any, error?: string) => void;
  } {
    if (!this.isEnabled) {
      return { 
        end: () => {}, 
        endWithResult: () => {} 
      };
    }

    const startTime = Date.now();
    const metricId = `${operation}_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      end: (error?: string) => {
        this.recordMetric({
          id: metricId,
          operation,
          table,
          method: this.inferMethod(operation),
          duration: Date.now() - startTime,
          error,
          timestamp: new Date(),
          context
        });
      },
      endWithResult: (result: any, error?: string) => {
        this.recordMetric({
          id: metricId,
          operation,
          table,
          method: this.inferMethod(operation),
          duration: Date.now() - startTime,
          rows_affected: this.extractRowCount(result),
          error,
          timestamp: new Date(),
          context
        });
      }
    };
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: QueryPerformanceMetric): void {
    this.metrics.push(metric);

    // Keep metrics within limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.splice(0, this.metrics.length - this.maxMetrics);
    }

    // Log slow queries
    if (metric.duration > this.slowQueryThreshold) {
      console.warn(`[PerformanceMonitor] 🐌 Slow query detected: ${metric.operation} took ${metric.duration}ms`, {
        table: metric.table,
        context: metric.context,
        error: metric.error
      });
    }

    // Log errors
    if (metric.error) {
      console.error(`[PerformanceMonitor] ❌ Query error: ${metric.operation}`, {
        error: metric.error,
        duration: metric.duration
      });
    }

    // Log normal operations in development
    if (process.env.NODE_ENV === 'development') {
      const statusIcon = metric.error ? '❌' : metric.duration > this.slowQueryThreshold ? '🐌' : '✅';
      console.log(`[PerformanceMonitor] ${statusIcon} ${metric.operation}: ${metric.duration}ms`, {
        table: metric.table,
        rows: metric.rows_affected,
        context: metric.context
      });
    }
  }

  /**
   * Get performance summary for the current session
   */
  getPerformanceSummary(minutes: number = 10): PerformanceSummary {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    if (recentMetrics.length === 0) {
      return {
        total_queries: 0,
        average_duration: 0,
        slow_queries: 0,
        errors: 0,
        operations: []
      };
    }

    const operations = new Map<string, { count: number; total_duration: number; max_duration: number }>();
    let totalDuration = 0;
    let slowQueries = 0;
    let errors = 0;

    recentMetrics.forEach(metric => {
      totalDuration += metric.duration;
      
      if (metric.duration > this.slowQueryThreshold) {
        slowQueries++;
      }
      
      if (metric.error) {
        errors++;
      }

      const key = metric.operation;
      const existing = operations.get(key) || { count: 0, total_duration: 0, max_duration: 0 };
      operations.set(key, {
        count: existing.count + 1,
        total_duration: existing.total_duration + metric.duration,
        max_duration: Math.max(existing.max_duration, metric.duration)
      });
    });

    const operationsArray = Array.from(operations.entries()).map(([operation, stats]) => ({
      operation,
      count: stats.count,
      avg_duration: Math.round(stats.total_duration / stats.count),
      max_duration: stats.max_duration
    })).sort((a, b) => b.avg_duration - a.avg_duration);

    return {
      total_queries: recentMetrics.length,
      average_duration: Math.round(totalDuration / recentMetrics.length),
      slow_queries: slowQueries,
      errors,
      operations: operationsArray
    };
  }

  /**
   * Get slow queries from recent history
   */
  getSlowQueries(minutes: number = 30): QueryPerformanceMetric[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.metrics
      .filter(m => m.timestamp >= cutoff && m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration);
  }

  /**
   * Get error queries from recent history
   */
  getErrorQueries(minutes: number = 30): QueryPerformanceMetric[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.metrics
      .filter(m => m.timestamp >= cutoff && m.error)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear all collected metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    console.log('[PerformanceMonitor] Metrics cleared');
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      exported_at: new Date().toISOString(),
      metrics: this.metrics,
      summary: this.getPerformanceSummary()
    }, null, 2);
  }

  /**
   * Monitor Supabase query performance
   */
  wrapSupabaseQuery<T>(
    operation: string,
    queryPromise: any,
    context?: string
  ): Promise<T> {
    if (!this.isEnabled) {
      return queryPromise;
    }

    // Safety check for queryPromise
    if (!queryPromise || typeof queryPromise.then !== 'function') {
      console.warn('[PerformanceMonitor] Invalid query promise provided, skipping monitoring');
      return Promise.reject(new Error('Invalid query promise: expected a thenable object'));
    }

    // Extract table name from operation if not available in context
    const tableName = this.extractTableFromOperation(operation, context);
    const monitor = this.startOperation(operation, tableName, context);
    
    return queryPromise
      .then((result: any) => {
        const tableFromResult = this.extractTable(result) || tableName;
        monitor.endWithResult(result, result?.error?.message);
        
        // Log successful operation (duration will be logged by recordMetric)
        
        return result;
      })
      .catch((error: any) => {
        monitor.end(error?.message || 'Unknown error');
        throw error;
      });
  }
  
  /**
   * Extract table name from operation string or context
   */
  private extractTableFromOperation(operation: string, context?: string): string | undefined {
    // Extract from operation name (e.g., "select_employees" -> "employees")
    const operationMatch = operation.match(/^(select|insert|update|delete)_(.+)$/);
    if (operationMatch) {
      return operationMatch[2];
    }
    
    // Extract from context if available
    if (context && context.includes('table: ')) {
      const contextMatch = context.match(/table: ([^,\s]+)/);
      if (contextMatch) {
        return contextMatch[1];
      }
    }
    
    return undefined;
  }

  /**
   * Infer HTTP method from operation name
   */
  private inferMethod(operation: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' {
    if (operation.includes('insert') || operation.includes('create')) return 'INSERT';
    if (operation.includes('update') || operation.includes('edit')) return 'UPDATE';
    if (operation.includes('delete') || operation.includes('remove')) return 'DELETE';
    return 'SELECT';
  }

  /**
   * Extract row count from Supabase result
   */
  private extractRowCount(result: any): number | undefined {
    if (!result) return undefined;
    if (result.data && Array.isArray(result.data)) return result.data.length;
    if (result.count !== undefined) return result.count;
    return undefined;
  }

  /**
   * Extract table name from query builder or promise (best effort)
   */
  private extractTable(queryBuilder: any): string | undefined {
    // Try to extract from various possible locations
    if (queryBuilder) {
      // Check if it's a response object with URL
      if (queryBuilder.url && typeof queryBuilder.url === 'string') {
        try {
          const matches = queryBuilder.url.match(/\/rest\/v1\/([^?]+)/);
          return matches ? matches[1] : undefined;
        } catch (error) {
          console.warn('[PerformanceMonitor] Failed to extract table name from URL:', error);
        }
      }
      
      // Check for internal properties that might contain the table name
      if (queryBuilder._table) {
        return queryBuilder._table;
      }
      
      // Check for configuration or context objects
      if (queryBuilder.config && queryBuilder.config.table) {
        return queryBuilder.config.table;
      }
    }
    
    return undefined;
  }
}

// Create and export singleton instance
export const performanceMonitor = new PerformanceMonitorService();

// Enhanced Supabase client wrapper with performance monitoring
export const createMonitoredSupabase = () => {
  const originalFrom = supabase.from;
  
  // Override the from method to add monitoring
  supabase.from = function(table: string) {
    const originalQuery = originalFrom.call(this, table);
    
    // Create a proxy to intercept all method calls and preserve chaining
    return new Proxy(originalQuery, {
      get(target, prop, receiver) {
        const originalMethod = Reflect.get(target, prop, receiver);
        
        // Only wrap query execution methods, not builder methods
        if (typeof originalMethod === 'function' && ['select', 'insert', 'update', 'delete'].includes(prop as string)) {
          return function(...args: any[]) {
            const result = originalMethod.apply(target, args);
            
            // Return a new proxy that wraps the query builder with monitoring
            return createQueryBuilderProxy(result, table, prop as string, args);
          };
        }
        
        return originalMethod;
      }
    });
  };

  return supabase;
};

// Create a proxy for the query builder that preserves all methods and adds monitoring at execution
function createQueryBuilderProxy(queryBuilder: any, table: string, operation: string, args: any[]) {
  let queryContext = {
    table,
    operation,
    columns: operation === 'select' ? (args[0] || '*') : undefined,
    records: operation === 'insert' && Array.isArray(args[0]) ? args[0].length : (operation === 'insert' ? 1 : undefined)
  };

  return new Proxy(queryBuilder, {
    get(target, prop, receiver) {
      const originalMethod = Reflect.get(target, prop, receiver);
      
      // If it's the 'then' method (Promise execution), wrap with monitoring
      if (prop === 'then' && typeof originalMethod === 'function') {
        return function(onFulfilled?: any, onRejected?: any) {
          // Start monitoring when the query actually executes
          const contextString = `table: ${queryContext.table}${queryContext.columns ? `, columns: ${queryContext.columns}` : ''}${queryContext.records ? `, records: ${queryContext.records}` : ''}`;
          
          const wrappedPromise = performanceMonitor.wrapSupabaseQuery(
            `${queryContext.operation}_${queryContext.table}`,
            originalMethod.call(target, onFulfilled, onRejected), // ✅ 使用正确的target上下文
            contextString
          );
          
          return wrappedPromise;
        };
      }
      
      // For other methods, just return them as-is to preserve chaining
      if (typeof originalMethod === 'function') {
        return function(...methodArgs: any[]) {
          const result = originalMethod.apply(target, methodArgs); // ✅ 使用正确的target上下文
          
          // Only wrap the result if it's a new query builder, avoid recursive wrapping
          if (result && typeof result.then === 'function' && result !== target) {
            return createQueryBuilderProxy(result, queryContext.table, queryContext.operation, args);
          }
          
          return result;
        };
      }
      
      return originalMethod;
    }
  });
}

// Initialize monitoring if in development mode
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.setEnabled(true);
  console.log('[PerformanceMonitor] 🚀 Performance monitoring initialized for development');
  
  // Add global performance summary to window for debugging
  (window as any).getPerformanceSummary = () => performanceMonitor.getPerformanceSummary();
  (window as any).getSlowQueries = () => performanceMonitor.getSlowQueries();
  (window as any).clearMetrics = () => performanceMonitor.clearMetrics();
  
  // Log performance summary every 2 minutes
  setInterval(() => {
    const summary = performanceMonitor.getPerformanceSummary();
    if (summary.total_queries > 0) {
      console.log('[PerformanceMonitor] 📊 Performance Summary (last 10 min):', summary);
      
      if (summary.slow_queries > 0) {
        console.warn('[PerformanceMonitor] 🐌 Recent slow queries:', 
          performanceMonitor.getSlowQueries(10));
      }
    }
  }, 120000); // 2 minutes
}