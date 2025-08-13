/**
 * 业务规则基类
 * 
 * 提供业务规则的基础实现和通用功能
 */

import { 
  IBusinessRule, 
  BusinessRuleContext, 
  BusinessRuleResult, 
  IRuleCondition,
  IRuleAction
} from '../interfaces/IBusinessRule';

/**
 * 业务规则基类
 */
export abstract class BaseBusinessRule implements IBusinessRule {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly priority: number;
  public readonly entityTypes: string[];
  public readonly operations: string[];
  
  private _enabled: boolean = true;
  private _configuration: Record<string, any> = {};

  constructor(
    id: string,
    name: string,
    description: string,
    priority: number = 0,
    entityTypes: string[] = [],
    operations: string[] = ['create', 'update', 'delete', 'validate']
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.priority = priority;
    this.entityTypes = entityTypes;
    this.operations = operations;
  }

  public get enabled(): boolean {
    return this._enabled;
  }

  /**
   * 设置规则启用状态（内部方法）
   */
  public setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /**
   * 检查规则是否适用于给定上下文
   */
  public isApplicable(context: BusinessRuleContext): boolean {
    // 检查实体类型
    if (this.entityTypes.length > 0 && !this.entityTypes.includes(context.entityType)) {
      return false;
    }

    // 检查操作类型
    if (this.operations.length > 0 && !this.operations.includes(context.operation)) {
      return false;
    }

    // 检查自定义条件
    return this.checkCustomConditions(context);
  }

  /**
   * 执行业务规则
   */
  public async execute(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const startTime = Date.now();

    try {
      // 预处理
      await this.preExecute(context);

      // 执行核心逻辑
      const result = await this.executeCore(context);
      
      // 后处理
      await this.postExecute(context, result);

      // 设置执行时间
      result.executionTime = Date.now() - startTime;

      return result;
    } catch (error) {
      return {
        passed: false,
        ruleId: this.id,
        ruleName: this.name,
        message: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 获取规则配置
   */
  public getConfiguration(): Record<string, any> {
    return { ...this._configuration };
  }

  /**
   * 更新规则配置
   */
  public updateConfiguration(config: Record<string, any>): void {
    this._configuration = { ...this._configuration, ...config };
    this.onConfigurationUpdated(this._configuration);
  }

  // ==================== 抽象方法 ====================

  /**
   * 执行核心业务逻辑（子类实现）
   */
  protected abstract executeCore(context: BusinessRuleContext): Promise<BusinessRuleResult>;

  // ==================== 可重写方法 ====================

  /**
   * 检查自定义条件（子类可重写）
   */
  protected checkCustomConditions(context: BusinessRuleContext): boolean {
    return true;
  }

  /**
   * 预执行处理（子类可重写）
   */
  protected async preExecute(context: BusinessRuleContext): Promise<void> {
    // 默认空实现
  }

  /**
   * 后执行处理（子类可重写）
   */
  protected async postExecute(context: BusinessRuleContext, result: BusinessRuleResult): Promise<void> {
    // 默认空实现
  }

  /**
   * 配置更新回调（子类可重写）
   */
  protected onConfigurationUpdated(config: Record<string, any>): void {
    // 默认空实现
  }

  // ==================== 工具方法 ====================

  /**
   * 创建成功结果
   */
  protected createSuccessResult(message?: string, details?: Record<string, any>): BusinessRuleResult {
    return {
      passed: true,
      ruleId: this.id,
      ruleName: this.name,
      message,
      severity: 'info',
      details,
      executionTime: 0 // 将在execute方法中设置
    };
  }

  /**
   * 创建失败结果
   */
  protected createFailureResult(
    message: string,
    severity: 'warning' | 'error' | 'critical' = 'error',
    suggestions?: string[],
    details?: Record<string, any>
  ): BusinessRuleResult {
    return {
      passed: false,
      ruleId: this.id,
      ruleName: this.name,
      message,
      severity,
      suggestions,
      details,
      executionTime: 0 // 将在execute方法中设置
    };
  }

  /**
   * 获取配置值
   */
  protected getConfigValue<T>(key: string, defaultValue: T): T {
    return this._configuration[key] ?? defaultValue;
  }

  /**
   * 检查实体是否具有指定属性
   */
  protected hasProperty(entity: any, property: string): boolean {
    return entity && typeof entity === 'object' && property in entity;
  }

  /**
   * 获取实体属性值
   */
  protected getPropertyValue(entity: any, property: string): any {
    return this.hasProperty(entity, property) ? entity[property] : undefined;
  }

  /**
   * 验证必需属性
   */
  protected validateRequiredProperties(entity: any, properties: string[]): string[] {
    const missingProperties: string[] = [];
    
    for (const property of properties) {
      if (!this.hasProperty(entity, property) || entity[property] == null) {
        missingProperties.push(property);
      }
    }

    return missingProperties;
  }
}

/**
 * 条件基类
 */
export abstract class BaseRuleCondition implements IRuleCondition {
  public readonly id: string;
  public readonly name: string;
  public readonly type: 'simple' | 'composite' | 'custom';

  constructor(id: string, name: string, type: 'simple' | 'composite' | 'custom' = 'simple') {
    this.id = id;
    this.name = name;
    this.type = type;
  }

  public abstract evaluate(context: BusinessRuleContext): boolean;
}

/**
 * 动作基类
 */
export abstract class BaseRuleAction implements IRuleAction {
  public readonly id: string;
  public readonly name: string;
  public readonly type: 'validation' | 'transformation' | 'notification' | 'custom';

  constructor(id: string, name: string, type: 'validation' | 'transformation' | 'notification' | 'custom' = 'validation') {
    this.id = id;
    this.name = name;
    this.type = type;
  }

  public abstract execute(context: BusinessRuleContext): Promise<BusinessRuleResult>;
}

/**
 * 简单条件实现
 */
export class SimpleCondition extends BaseRuleCondition {
  private readonly predicate: (context: BusinessRuleContext) => boolean;

  constructor(id: string, name: string, predicate: (context: BusinessRuleContext) => boolean) {
    super(id, name, 'simple');
    this.predicate = predicate;
  }

  public evaluate(context: BusinessRuleContext): boolean {
    return this.predicate(context);
  }
}

/**
 * 复合条件实现
 */
export class CompositeCondition extends BaseRuleCondition {
  private readonly conditions: IRuleCondition[];
  private readonly operator: 'AND' | 'OR' | 'NOT';

  constructor(
    id: string, 
    name: string, 
    conditions: IRuleCondition[], 
    operator: 'AND' | 'OR' | 'NOT' = 'AND'
  ) {
    super(id, name, 'composite');
    this.conditions = conditions;
    this.operator = operator;
  }

  public evaluate(context: BusinessRuleContext): boolean {
    switch (this.operator) {
      case 'AND':
        return this.conditions.every(condition => condition.evaluate(context));
      case 'OR':
        return this.conditions.some(condition => condition.evaluate(context));
      case 'NOT':
        return !this.conditions.every(condition => condition.evaluate(context));
      default:
        return false;
    }
  }
}

/**
 * 条件建造器
 */
export class ConditionBuilder {
  private conditions: IRuleCondition[] = [];

  public static create(): ConditionBuilder {
    return new ConditionBuilder();
  }

  public property(propertyPath: string): PropertyConditionBuilder {
    return new PropertyConditionBuilder(this, propertyPath);
  }

  public custom(id: string, name: string, predicate: (context: BusinessRuleContext) => boolean): ConditionBuilder {
    this.conditions.push(new SimpleCondition(id, name, predicate));
    return this;
  }

  public and(...conditions: IRuleCondition[]): ConditionBuilder {
    if (conditions.length > 0) {
      this.conditions.push(new CompositeCondition(`and-${Date.now()}`, 'AND Condition', conditions, 'AND'));
    }
    return this;
  }

  public or(...conditions: IRuleCondition[]): ConditionBuilder {
    if (conditions.length > 0) {
      this.conditions.push(new CompositeCondition(`or-${Date.now()}`, 'OR Condition', conditions, 'OR'));
    }
    return this;
  }

  public build(): IRuleCondition {
    if (this.conditions.length === 0) {
      throw new Error('At least one condition must be defined');
    }
    if (this.conditions.length === 1) {
      return this.conditions[0];
    }
    return new CompositeCondition(`composite-${Date.now()}`, 'Composite Condition', this.conditions, 'AND');
  }
}

/**
 * 属性条件建造器
 */
export class PropertyConditionBuilder {
  constructor(
    private parent: ConditionBuilder,
    private propertyPath: string
  ) {}

  public equals(value: any): ConditionBuilder {
    const condition = new SimpleCondition(
      `${this.propertyPath}-equals-${Date.now()}`,
      `${this.propertyPath} equals ${value}`,
      (context) => this.getPropertyValue(context) === value
    );
    return this.addCondition(condition);
  }

  public notEquals(value: any): ConditionBuilder {
    const condition = new SimpleCondition(
      `${this.propertyPath}-not-equals-${Date.now()}`,
      `${this.propertyPath} not equals ${value}`,
      (context) => this.getPropertyValue(context) !== value
    );
    return this.addCondition(condition);
  }

  public greaterThan(value: number): ConditionBuilder {
    const condition = new SimpleCondition(
      `${this.propertyPath}-gt-${Date.now()}`,
      `${this.propertyPath} > ${value}`,
      (context) => {
        const propValue = this.getPropertyValue(context);
        return typeof propValue === 'number' && propValue > value;
      }
    );
    return this.addCondition(condition);
  }

  public lessThan(value: number): ConditionBuilder {
    const condition = new SimpleCondition(
      `${this.propertyPath}-lt-${Date.now()}`,
      `${this.propertyPath} < ${value}`,
      (context) => {
        const propValue = this.getPropertyValue(context);
        return typeof propValue === 'number' && propValue < value;
      }
    );
    return this.addCondition(condition);
  }

  public exists(): ConditionBuilder {
    const condition = new SimpleCondition(
      `${this.propertyPath}-exists-${Date.now()}`,
      `${this.propertyPath} exists`,
      (context) => this.getPropertyValue(context) != null
    );
    return this.addCondition(condition);
  }

  public notExists(): ConditionBuilder {
    const condition = new SimpleCondition(
      `${this.propertyPath}-not-exists-${Date.now()}`,
      `${this.propertyPath} not exists`,
      (context) => this.getPropertyValue(context) == null
    );
    return this.addCondition(condition);
  }

  private getPropertyValue(context: BusinessRuleContext): any {
    const paths = this.propertyPath.split('.');
    let current = context.entity;
    
    for (const path of paths) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = current[path];
    }
    
    return current;
  }

  private addCondition(condition: IRuleCondition): ConditionBuilder {
    (this.parent as any).conditions.push(condition);
    return this.parent;
  }
}