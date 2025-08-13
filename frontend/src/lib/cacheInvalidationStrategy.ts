import { QueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryClientOptimized';

/**
 * 缓存失效策略配置
 * 基于数据关联性和业务逻辑的智能缓存管理
 */

// 缓存失效策略类型
export type InvalidationStrategy = 'immediate' | 'delayed' | 'smart' | 'background';

// 缓存失效配置
export interface CacheInvalidationConfig {
  strategy: InvalidationStrategy;
  delay?: number; // 延迟时间（毫秒）
  affectedKeys: readonly unknown[][]; // 受影响的查询键
  condition?: () => boolean; // 失效条件
}

// 预定义的缓存失效规则
export const INVALIDATION_RULES = {
  // 薪资数据变更
  PAYROLL_CHANGE: {
    strategy: 'immediate' as const,
    affectedKeys: [
      QUERY_KEYS.PAYROLLS.all,
      QUERY_KEYS.STATISTICS.all,
    ],
  },

  // 员工信息变更
  EMPLOYEE_CHANGE: {
    strategy: 'immediate' as const,
    affectedKeys: [
      QUERY_KEYS.EMPLOYEES.all,
      QUERY_KEYS.STATISTICS.dashboard(),
    ],
  },

  // 批量操作
  BATCH_OPERATION: {
    strategy: 'delayed' as const,
    delay: 1000, // 1秒延迟，避免频繁刷新
    affectedKeys: [
      QUERY_KEYS.PAYROLLS.all,
      QUERY_KEYS.EMPLOYEES.all,
      QUERY_KEYS.STATISTICS.all,
    ],
  },

  // 基础数据变更（部门、职位等）
  MASTER_DATA_CHANGE: {
    strategy: 'smart' as const,
    affectedKeys: [
      QUERY_KEYS.MASTER_DATA.departments,
      QUERY_KEYS.MASTER_DATA.positions,
      QUERY_KEYS.EMPLOYEES.all, // 可能影响员工列表显示
      QUERY_KEYS.STATISTICS.department(),
    ],
  },

  // 统计数据刷新
  STATISTICS_REFRESH: {
    strategy: 'background' as const,
    affectedKeys: [
      QUERY_KEYS.STATISTICS.all,
    ],
  },
} as const;

// 缓存失效执行器
export class CacheInvalidationManager {
  private queryClient: QueryClient;
  private pendingInvalidations = new Map<string, NodeJS.Timeout>();

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  // 执行缓存失效
  async invalidate(
    rule: CacheInvalidationConfig,
    context?: { 
      month?: string; 
      employeeId?: string; 
      departmentId?: string 
    }
  ) {
    const ruleKey = this.generateRuleKey(rule, context);

    switch (rule.strategy) {
      case 'immediate':
        await this.executeImmediate(rule, context);
        break;

      case 'delayed':
        this.executeDelayed(rule, context, ruleKey);
        break;

      case 'smart':
        await this.executeSmart(rule, context);
        break;

      case 'background':
        this.executeBackground(rule, context);
        break;
    }
  }

  // 立即执行失效
  private async executeImmediate(
    rule: CacheInvalidationConfig,
    context?: any
  ) {
    if (rule.condition && !rule.condition()) {
      return;
    }

    const promises = rule.affectedKeys.map(queryKey => 
      this.queryClient.invalidateQueries({ queryKey })
    );

    await Promise.allSettled(promises);
  }

  // 延迟执行失效
  private executeDelayed(
    rule: CacheInvalidationConfig,
    context: any,
    ruleKey: string
  ) {
    // 清除之前的延迟执行
    if (this.pendingInvalidations.has(ruleKey)) {
      clearTimeout(this.pendingInvalidations.get(ruleKey)!);
    }

    // 设置新的延迟执行
    const timeoutId = setTimeout(async () => {
      await this.executeImmediate(rule, context);
      this.pendingInvalidations.delete(ruleKey);
    }, rule.delay || 1000);

    this.pendingInvalidations.set(ruleKey, timeoutId);
  }

  // 智能执行失效（根据数据状态决定）
  private async executeSmart(
    rule: CacheInvalidationConfig,
    context?: any
  ) {
    // 检查相关数据是否正在使用中
    const hasActiveQueries = rule.affectedKeys.some(queryKey => {
      const queryState = this.queryClient.getQueryState(queryKey);
      return queryState?.fetchStatus === 'fetching';
    });

    if (hasActiveQueries) {
      // 如果有正在进行的查询，延迟执行
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await this.executeImmediate(rule, context);
  }

  // 后台执行失效（不阻塞UI）
  private executeBackground(
    rule: CacheInvalidationConfig,
    context?: any
  ) {
    // 使用 requestIdleCallback 或 setTimeout 在空闲时执行
    const executeWhenIdle = () => {
      if (rule.condition && !rule.condition()) {
        return;
      }

      rule.affectedKeys.forEach(queryKey => {
        this.queryClient.invalidateQueries({ 
          queryKey,
          refetchType: 'none' // 只标记为过期，不立即重新获取
        });
      });
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(executeWhenIdle);
    } else {
      setTimeout(executeWhenIdle, 0);
    }
  }

  // 生成规则键用于去重
  private generateRuleKey(
    rule: CacheInvalidationConfig,
    context?: any
  ): string {
    const contextKey = context ? JSON.stringify(context) : '';
    return `${rule.strategy}_${contextKey}`;
  }

  // 清理所有待执行的失效操作
  cleanup() {
    this.pendingInvalidations.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.pendingInvalidations.clear();
  }
}

// 创建全局缓存失效管理器实例
let globalInvalidationManager: CacheInvalidationManager | null = null;

export function createInvalidationManager(queryClient: QueryClient) {
  if (!globalInvalidationManager) {
    globalInvalidationManager = new CacheInvalidationManager(queryClient);
  }
  return globalInvalidationManager;
}

export function getInvalidationManager() {
  if (!globalInvalidationManager) {
    throw new Error('Invalidation manager not initialized. Call createInvalidationManager first.');
  }
  return globalInvalidationManager;
}

// 便捷的失效操作函数
export const cacheInvalidation = {
  // 薪资数据变更
  onPayrollChange: (queryClient: QueryClient, month?: string) => {
    const manager = createInvalidationManager(queryClient);
    manager.invalidate(INVALIDATION_RULES.PAYROLL_CHANGE, { month });
  },

  // 员工数据变更
  onEmployeeChange: (queryClient: QueryClient, employeeId?: string) => {
    const manager = createInvalidationManager(queryClient);
    manager.invalidate(INVALIDATION_RULES.EMPLOYEE_CHANGE, { employeeId });
  },

  // 批量操作
  onBatchOperation: (queryClient: QueryClient) => {
    const manager = createInvalidationManager(queryClient);
    manager.invalidate(INVALIDATION_RULES.BATCH_OPERATION);
  },

  // 基础数据变更
  onMasterDataChange: (queryClient: QueryClient) => {
    const manager = createInvalidationManager(queryClient);
    manager.invalidate(INVALIDATION_RULES.MASTER_DATA_CHANGE);
  },

  // 统计数据刷新
  refreshStatistics: (queryClient: QueryClient) => {
    const manager = createInvalidationManager(queryClient);
    manager.invalidate(INVALIDATION_RULES.STATISTICS_REFRESH);
  },
};

// 自动失效监听器
export function setupAutoInvalidation(queryClient: QueryClient) {
  const manager = createInvalidationManager(queryClient);

  // 监听网络重连，刷新关键数据
  window.addEventListener('online', () => {
    cacheInvalidation.refreshStatistics(queryClient);
  });

  // 监听页面可见性变化，刷新实时数据
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // 页面重新可见时，刷新仪表盘数据
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.STATISTICS.dashboard(),
        refetchType: 'active'
      });
    }
  });

  // 定期清理过期缓存（每10分钟）
  setInterval(() => {
    queryClient.getQueryCache().clear();
  }, 10 * 60 * 1000);

  // 页面卸载时清理
  window.addEventListener('beforeunload', () => {
    manager.cleanup();
  });

  return manager;
}

// 缓存性能监控
export function setupCacheMonitoring(queryClient: QueryClient) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // 监控缓存命中率
  const originalGetQueryData = queryClient.getQueryData;
  let cacheHits = 0;
  let totalQueries = 0;

  queryClient.getQueryData = function(queryKey: any) {
    totalQueries++;
    const result = originalGetQueryData.call(this, queryKey);
    if (result !== undefined) {
      cacheHits++;
    }
    
    // 每100次查询报告一次命中率
    if (totalQueries % 100 === 0) {
      const hitRate = (cacheHits / totalQueries * 100).toFixed(2);
      console.log(`Cache hit rate: ${hitRate}% (${cacheHits}/${totalQueries})`);
    }
    
    return result;
  };
}