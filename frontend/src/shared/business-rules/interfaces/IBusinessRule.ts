/**
 * 业务规则接口
 * 
 * 定义可配置的业务规则体系架构
 */

/**
 * 业务规则执行上下文
 */
export interface BusinessRuleContext {
  /** 实体类型 */
  entityType: string;
  /** 实体数据 */
  entity: any;
  /** 操作类型 */
  operation: 'create' | 'update' | 'delete' | 'validate';
  /** 用户信息 */
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
  /** 业务上下文数据 */
  contextData?: Record<string, any>;
  /** 时间戳 */
  timestamp: Date;
}

/**
 * 业务规则执行结果
 */
export interface BusinessRuleResult {
  /** 是否通过 */
  passed: boolean;
  /** 规则ID */
  ruleId: string;
  /** 规则名称 */
  ruleName: string;
  /** 结果消息 */
  message?: string;
  /** 严重程度 */
  severity: 'info' | 'warning' | 'error' | 'critical';
  /** 建议操作 */
  suggestions?: string[];
  /** 详细信息 */
  details?: Record<string, any>;
  /** 执行时间 */
  executionTime: number;
}

/**
 * 业务规则接口
 */
export interface IBusinessRule {
  /** 规则唯一标识 */
  readonly id: string;
  /** 规则名称 */
  readonly name: string;
  /** 规则描述 */
  readonly description: string;
  /** 规则优先级 */
  readonly priority: number;
  /** 是否启用 */
  readonly enabled: boolean;
  /** 适用的实体类型 */
  readonly entityTypes: string[];
  /** 适用的操作类型 */
  readonly operations: string[];

  /**
   * 检查规则是否适用于给定上下文
   */
  isApplicable(context: BusinessRuleContext): boolean;

  /**
   * 执行业务规则
   */
  execute(context: BusinessRuleContext): Promise<BusinessRuleResult>;

  /**
   * 获取规则配置
   */
  getConfiguration(): Record<string, any>;

  /**
   * 更新规则配置
   */
  updateConfiguration(config: Record<string, any>): void;
}

/**
 * 业务规则引擎接口
 */
export interface IBusinessRuleEngine {
  /**
   * 注册业务规则
   */
  registerRule(rule: IBusinessRule): void;

  /**
   * 取消注册业务规则
   */
  unregisterRule(ruleId: string): void;

  /**
   * 获取所有规则
   */
  getAllRules(): IBusinessRule[];

  /**
   * 根据ID获取规则
   */
  getRule(ruleId: string): IBusinessRule | undefined;

  /**
   * 获取适用于上下文的规则
   */
  getApplicableRules(context: BusinessRuleContext): IBusinessRule[];

  /**
   * 执行所有适用的规则
   */
  executeRules(context: BusinessRuleContext): Promise<BusinessRuleResult[]>;

  /**
   * 执行指定的规则
   */
  executeRule(ruleId: string, context: BusinessRuleContext): Promise<BusinessRuleResult>;

  /**
   * 批量执行规则
   */
  executeBatch(contexts: BusinessRuleContext[]): Promise<Map<BusinessRuleContext, BusinessRuleResult[]>>;

  /**
   * 启用规则
   */
  enableRule(ruleId: string): void;

  /**
   * 禁用规则
   */
  disableRule(ruleId: string): void;

  /**
   * 获取规则执行统计
   */
  getExecutionStatistics(): BusinessRuleStatistics;
}

/**
 * 业务规则统计信息
 */
export interface BusinessRuleStatistics {
  /** 总执行次数 */
  totalExecutions: number;
  /** 成功次数 */
  successfulExecutions: number;
  /** 失败次数 */
  failedExecutions: number;
  /** 平均执行时间 */
  averageExecutionTime: number;
  /** 按规则分组的统计 */
  ruleStatistics: Map<string, {
    executions: number;
    successRate: number;
    averageTime: number;
    lastExecuted: Date;
  }>;
  /** 按实体类型分组的统计 */
  entityStatistics: Map<string, {
    executions: number;
    ruleCount: number;
    averageTime: number;
  }>;
}

/**
 * 规则条件接口
 */
export interface IRuleCondition {
  /** 条件ID */
  readonly id: string;
  /** 条件名称 */
  readonly name: string;
  /** 条件类型 */
  readonly type: 'simple' | 'composite' | 'custom';

  /**
   * 评估条件
   */
  evaluate(context: BusinessRuleContext): boolean;
}

/**
 * 规则动作接口
 */
export interface IRuleAction {
  /** 动作ID */
  readonly id: string;
  /** 动作名称 */
  readonly name: string;
  /** 动作类型 */
  readonly type: 'validation' | 'transformation' | 'notification' | 'custom';

  /**
   * 执行动作
   */
  execute(context: BusinessRuleContext): Promise<BusinessRuleResult>;
}

/**
 * 复合业务规则接口
 */
export interface ICompositeBusinessRule extends IBusinessRule {
  /** 子规则 */
  readonly childRules: IBusinessRule[];
  /** 组合逻辑 */
  readonly combineLogic: 'AND' | 'OR' | 'XOR';

  /**
   * 添加子规则
   */
  addChildRule(rule: IBusinessRule): void;

  /**
   * 移除子规则
   */
  removeChildRule(ruleId: string): void;
}

/**
 * 规则配置接口
 */
export interface IRuleConfiguration {
  /** 规则ID */
  ruleId: string;
  /** 配置数据 */
  configuration: Record<string, any>;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 创建者 */
  createdBy: string;
  /** 更新者 */
  updatedBy: string;
  /** 版本号 */
  version: number;
}