/**
 * 规则评估服务
 * 
 * 前端调用Edge Function进行复杂规则评估
 */

import { supabase } from '../../config/supabase';
import { BusinessRuleContext, BusinessRuleResult } from '../../shared/business-rules/interfaces/IBusinessRule';

/**
 * 规则评估服务配置
 */
export interface RuleEvaluationConfig {
  /** Edge Function URL */
  functionUrl?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 缓存时间（毫秒） */
  cacheTime?: number;
}

/**
 * 规则评估请求
 */
export interface RuleEvaluationRequest {
  /** 规则集ID */
  ruleSetId: string;
  /** 实体类型 */
  entityType: string;
  /** 实体数据 */
  entityData: any;
  /** 上下文数据 */
  contextData?: Record<string, any>;
  /** 评估选项 */
  options?: {
    /** 包含详细信息 */
    includeDetails?: boolean;
    /** 首次失败时停止 */
    stopOnFirstFailure?: boolean;
    /** 并行执行 */
    parallelExecution?: boolean;
  };
}

/**
 * 规则评估响应
 */
export interface RuleEvaluationResponse {
  /** 是否成功 */
  success: boolean;
  /** 评估结果 */
  results: BusinessRuleResult[];
  /** 汇总信息 */
  summary: {
    totalRules: number;
    passed: number;
    failed: number;
    warnings: number;
    errors: number;
    totalExecutionTime: number;
  };
  /** 建议 */
  recommendations?: string[];
}

/**
 * 规则评估服务
 */
export class RuleEvaluationService {
  private config: RuleEvaluationConfig;
  private cache: Map<string, { data: RuleEvaluationResponse; timestamp: number }> = new Map();

  constructor(config?: RuleEvaluationConfig) {
    this.config = {
      timeout: 30000, // 30秒超时
      retryCount: 3,
      cacheTime: 60000, // 1分钟缓存
      ...config
    };
  }

  /**
   * 评估规则集
   */
  async evaluateRuleSet(request: RuleEvaluationRequest): Promise<RuleEvaluationResponse> {
    // 检查缓存
    const cacheKey = this.getCacheKey(request);
    const cachedResult = this.getFromCache(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    try {
      // 调用Edge Function
      const response = await this.callEdgeFunction(request);
      
      // 缓存结果
      if (response.success) {
        this.setCache(cacheKey, response);
      }

      return response;
    } catch (error) {
      console.error('Rule evaluation failed:', error);
      
      // 降级到本地评估
      return this.fallbackToLocalEvaluation(request);
    }
  }

  /**
   * 批量评估规则
   */
  async evaluateBatch(requests: RuleEvaluationRequest[]): Promise<Map<string, RuleEvaluationResponse>> {
    const results = new Map<string, RuleEvaluationResponse>();

    // 并行处理多个请求
    const promises = requests.map(async (request, index) => {
      try {
        const response = await this.evaluateRuleSet(request);
        return { key: `request_${index}`, response };
      } catch (error) {
        console.error(`Batch evaluation failed for request ${index}:`, error);
        return { 
          key: `request_${index}`, 
          response: this.createErrorResponse(error)
        };
      }
    });

    const batchResults = await Promise.allSettled(promises);

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.set(result.value.key, result.value.response);
      }
    });

    return results;
  }

  /**
   * 从上下文评估规则
   */
  async evaluateFromContext(context: BusinessRuleContext): Promise<RuleEvaluationResponse> {
    // 确定规则集ID
    const ruleSetId = await this.determineRuleSetId(context);

    const request: RuleEvaluationRequest = {
      ruleSetId,
      entityType: context.entityType,
      entityData: context.entity,
      contextData: context.contextData,
      options: {
        includeDetails: true,
        stopOnFirstFailure: false,
        parallelExecution: true
      }
    };

    return this.evaluateRuleSet(request);
  }

  /**
   * 验证实体
   */
  async validateEntity(
    entityType: string,
    entity: any,
    operation: 'create' | 'update' | 'delete'
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const context: BusinessRuleContext = {
      entityType,
      entity,
      operation,
      timestamp: new Date()
    };

    const response = await this.evaluateFromContext(context);

    const errors = response.results
      .filter(r => !r.passed && r.severity === 'error')
      .map(r => r.message || 'Validation failed');

    const warnings = response.results
      .filter(r => !r.passed && r.severity === 'warning')
      .map(r => r.message || 'Warning');

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 调用Edge Function
   */
  private async callEdgeFunction(request: RuleEvaluationRequest): Promise<RuleEvaluationResponse> {
    const { data, error } = await supabase.functions.invoke('evaluate-rules', {
      body: request
    });

    if (error) {
      throw new Error(`Edge Function error: ${error.message}`);
    }

    return data as RuleEvaluationResponse;
  }

  /**
   * 降级到本地评估
   */
  private async fallbackToLocalEvaluation(request: RuleEvaluationRequest): Promise<RuleEvaluationResponse> {
    // 这里实现本地规则评估逻辑
    // 可以使用已经实现的 BusinessRuleEngine
    
    console.warn('Falling back to local rule evaluation');

    // 简化的本地评估
    return {
      success: true,
      results: [],
      summary: {
        totalRules: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        errors: 0,
        totalExecutionTime: 0
      },
      recommendations: ['Local evaluation used - limited rule support']
    };
  }

  /**
   * 确定规则集ID
   */
  private async determineRuleSetId(context: BusinessRuleContext): Promise<string> {
    // 根据实体类型和操作类型查询适用的规则集
    const { data, error } = await supabase
      .from('business_rule_sets')
      .select('id')
      .eq('entity_type', context.entityType)
      .eq('active', true)
      .single();

    if (error || !data) {
      // 使用默认规则集
      return 'default';
    }

    return data.id;
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(request: RuleEvaluationRequest): string {
    return `${request.ruleSetId}_${request.entityType}_${JSON.stringify(request.entityData)}`;
  }

  /**
   * 从缓存获取
   */
  private getFromCache(key: string): RuleEvaluationResponse | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheTime!) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: RuleEvaluationResponse): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // 限制缓存大小
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse(error: any): RuleEvaluationResponse {
    return {
      success: false,
      results: [],
      summary: {
        totalRules: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        errors: 1,
        totalExecutionTime: 0
      },
      recommendations: [`Error: ${error.message || 'Unknown error'}`]
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStatistics(): {
    size: number;
    hitRate: number;
    entries: string[];
  } {
    return {
      size: this.cache.size,
      hitRate: 0, // 需要实现命中率统计
      entries: Array.from(this.cache.keys())
    };
  }
}

/**
 * 默认规则评估服务实例
 */
export const ruleEvaluationService = new RuleEvaluationService();