/**
 * 业务规则引擎实现
 * 
 * 提供可配置的业务规则执行引擎
 */

import { 
  IBusinessRule, 
  IBusinessRuleEngine, 
  BusinessRuleContext, 
  BusinessRuleResult,
  BusinessRuleStatistics
} from '../interfaces/IBusinessRule';
import { EventEmitter } from '../../events/EventEmitter';
import { DomainEvent } from '../../events/DomainEvent';

/**
 * 业务规则执行事件
 */
export class BusinessRuleExecutedEvent extends DomainEvent {
  constructor(
    public readonly ruleId: string,
    public readonly result: BusinessRuleResult,
    public readonly context: BusinessRuleContext
  ) {
    super(`business-rule-executed-${ruleId}`);
  }
}

/**
 * 业务规则引擎实现
 */
export class BusinessRuleEngine implements IBusinessRuleEngine {
  private rules: Map<string, IBusinessRule> = new Map();
  private statistics: BusinessRuleStatistics;
  private eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.statistics = this.initializeStatistics();
  }

  /**
   * 注册业务规则
   */
  registerRule(rule: IBusinessRule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule with ID '${rule.id}' is already registered`);
    }

    this.rules.set(rule.id, rule);
    this.initializeRuleStatistics(rule.id);
  }

  /**
   * 取消注册业务规则
   */
  unregisterRule(ruleId: string): void {
    if (!this.rules.has(ruleId)) {
      throw new Error(`Rule with ID '${ruleId}' not found`);
    }

    this.rules.delete(ruleId);
    this.statistics.ruleStatistics.delete(ruleId);
  }

  /**
   * 获取所有规则
   */
  getAllRules(): IBusinessRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 根据ID获取规则
   */
  getRule(ruleId: string): IBusinessRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * 获取适用于上下文的规则
   */
  getApplicableRules(context: BusinessRuleContext): IBusinessRule[] {
    return Array.from(this.rules.values())
      .filter(rule => rule.enabled && rule.isApplicable(context))
      .sort((a, b) => b.priority - a.priority); // 按优先级降序排列
  }

  /**
   * 执行所有适用的规则
   */
  async executeRules(context: BusinessRuleContext): Promise<BusinessRuleResult[]> {
    const applicableRules = this.getApplicableRules(context);
    const results: BusinessRuleResult[] = [];

    for (const rule of applicableRules) {
      try {
        const result = await this.executeRule(rule.id, context);
        results.push(result);

        // 如果是严重错误，停止执行后续规则
        if (result.severity === 'critical' && !result.passed) {
          break;
        }
      } catch (error) {
        // 记录规则执行错误
        const errorResult: BusinessRuleResult = {
          passed: false,
          ruleId: rule.id,
          ruleName: rule.name,
          message: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
          executionTime: 0
        };
        results.push(errorResult);
      }
    }

    this.updateEntityStatistics(context.entityType, results);
    return results;
  }

  /**
   * 执行指定的规则
   */
  async executeRule(ruleId: string, context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule with ID '${ruleId}' not found`);
    }

    if (!rule.enabled) {
      throw new Error(`Rule '${ruleId}' is disabled`);
    }

    const startTime = Date.now();

    try {
      const result = await rule.execute(context);
      const executionTime = Date.now() - startTime;

      // 更新执行时间
      result.executionTime = executionTime;

      // 更新统计信息
      this.updateRuleStatistics(ruleId, true, executionTime);
      this.statistics.totalExecutions++;
      this.statistics.successfulExecutions++;

      // 发布事件
      this.eventEmitter.emit(new BusinessRuleExecutedEvent(ruleId, result, context));

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // 更新统计信息
      this.updateRuleStatistics(ruleId, false, executionTime);
      this.statistics.totalExecutions++;
      this.statistics.failedExecutions++;

      throw error;
    }
  }

  /**
   * 批量执行规则
   */
  async executeBatch(contexts: BusinessRuleContext[]): Promise<Map<BusinessRuleContext, BusinessRuleResult[]>> {
    const results = new Map<BusinessRuleContext, BusinessRuleResult[]>();

    // 并行执行多个上下文的规则
    const promises = contexts.map(async (context) => {
      const contextResults = await this.executeRules(context);
      return { context, results: contextResults };
    });

    const batchResults = await Promise.allSettled(promises);

    batchResults.forEach((promiseResult, index) => {
      if (promiseResult.status === 'fulfilled') {
        results.set(promiseResult.value.context, promiseResult.value.results);
      } else {
        // 处理失败的批次
        const context = contexts[index];
        const errorResult: BusinessRuleResult = {
          passed: false,
          ruleId: 'batch-execution',
          ruleName: 'Batch Execution',
          message: `Batch execution failed: ${promiseResult.reason}`,
          severity: 'error',
          executionTime: 0
        };
        results.set(context, [errorResult]);
      }
    });

    return results;
  }

  /**
   * 启用规则
   */
  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule with ID '${ruleId}' not found`);
    }

    // 由于 enabled 是 readonly，我们需要通过规则的内部机制来修改
    // 这里假设规则实现了内部的启用/禁用方法
    (rule as any).setEnabled?.(true);
  }

  /**
   * 禁用规则
   */
  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule with ID '${ruleId}' not found`);
    }

    // 由于 enabled 是 readonly，我们需要通过规则的内部机制来修改
    (rule as any).setEnabled?.(false);
  }

  /**
   * 获取规则执行统计
   */
  getExecutionStatistics(): BusinessRuleStatistics {
    // 计算平均执行时间
    if (this.statistics.totalExecutions > 0) {
      const totalTime = Array.from(this.statistics.ruleStatistics.values())
        .reduce((sum, stat) => sum + (stat.averageTime * stat.executions), 0);
      this.statistics.averageExecutionTime = totalTime / this.statistics.totalExecutions;
    }

    return { ...this.statistics };
  }

  /**
   * 订阅规则执行事件
   */
  onRuleExecuted(callback: (event: BusinessRuleExecutedEvent) => void): void {
    this.eventEmitter.on('business-rule-executed', callback);
  }

  /**
   * 获取规则引擎健康状态
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    registeredRules: number;
    enabledRules: number;
    recentFailureRate: number;
    averageResponseTime: number;
  } {
    const totalRules = this.rules.size;
    const enabledRules = Array.from(this.rules.values()).filter(r => r.enabled).length;
    const recentFailureRate = this.statistics.totalExecutions > 0 
      ? this.statistics.failedExecutions / this.statistics.totalExecutions 
      : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (recentFailureRate > 0.1) status = 'degraded';
    if (recentFailureRate > 0.3 || this.statistics.averageExecutionTime > 5000) status = 'unhealthy';

    return {
      status,
      registeredRules: totalRules,
      enabledRules,
      recentFailureRate,
      averageResponseTime: this.statistics.averageExecutionTime
    };
  }

  // ==================== 私有方法 ====================

  private initializeStatistics(): BusinessRuleStatistics {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      ruleStatistics: new Map(),
      entityStatistics: new Map()
    };
  }

  private initializeRuleStatistics(ruleId: string): void {
    this.statistics.ruleStatistics.set(ruleId, {
      executions: 0,
      successRate: 0,
      averageTime: 0,
      lastExecuted: new Date()
    });
  }

  private updateRuleStatistics(ruleId: string, success: boolean, executionTime: number): void {
    const stats = this.statistics.ruleStatistics.get(ruleId);
    if (!stats) return;

    const newExecutions = stats.executions + 1;
    const newAverageTime = (stats.averageTime * stats.executions + executionTime) / newExecutions;
    
    // 计算成功率需要跟踪成功次数
    const currentSuccessCount = Math.round(stats.successRate * stats.executions);
    const newSuccessCount = success ? currentSuccessCount + 1 : currentSuccessCount;
    const newSuccessRate = newSuccessCount / newExecutions;

    this.statistics.ruleStatistics.set(ruleId, {
      executions: newExecutions,
      successRate: newSuccessRate,
      averageTime: newAverageTime,
      lastExecuted: new Date()
    });
  }

  private updateEntityStatistics(entityType: string, results: BusinessRuleResult[]): void {
    const existingStats = this.statistics.entityStatistics.get(entityType);
    const executionCount = 1;
    const ruleCount = results.length;
    const averageTime = results.reduce((sum, r) => sum + r.executionTime, 0) / ruleCount;

    if (existingStats) {
      const newExecutions = existingStats.executions + executionCount;
      const newAverageTime = (existingStats.averageTime * existingStats.executions + averageTime) / newExecutions;

      this.statistics.entityStatistics.set(entityType, {
        executions: newExecutions,
        ruleCount: Math.max(existingStats.ruleCount, ruleCount),
        averageTime: newAverageTime
      });
    } else {
      this.statistics.entityStatistics.set(entityType, {
        executions: executionCount,
        ruleCount,
        averageTime
      });
    }
  }
}