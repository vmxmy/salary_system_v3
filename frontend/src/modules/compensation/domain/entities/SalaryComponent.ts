/**
 * SalaryComponent 领域实体
 * 
 * 薪资组件实体，管理薪资构成的各个部分，如基本工资、奖金、扣款等
 */

import { BaseEntity } from '../../../../shared/domain/entities/BaseEntity';
import { DomainError } from '../../../../shared/domain/errors/DomainError';
import { ValidationResult } from '../../../../shared/domain/validation/ValidationResult';
import { PayrollComponentType } from '../../../payroll-import/domain/entities/Payroll';

/**
 * 薪资组件状态枚举
 */
export enum SalaryComponentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

/**
 * 薪资组件应用范围
 */
export enum ComponentScope {
  GLOBAL = 'global',           // 全局（所有员工）
  DEPARTMENT = 'department',   // 部门级别
  POSITION = 'position',       // 职位级别
  INDIVIDUAL = 'individual'    // 个人级别
}

/**
 * 计算频率枚举
 */
export enum CalculationFrequency {
  MONTHLY = 'monthly',         // 每月
  QUARTERLY = 'quarterly',     // 每季度
  SEMI_ANNUAL = 'semi_annual', // 每半年
  ANNUAL = 'annual',          // 每年
  ONE_TIME = 'one_time'       // 一次性
}

/**
 * 计算方法枚举
 */
export enum CalculationMethod {
  FIXED_AMOUNT = 'fixed_amount',        // 固定金额
  PERCENTAGE = 'percentage',            // 百分比
  FORMULA = 'formula',                  // 公式计算
  TIERED = 'tiered',                   // 分层计算
  PERFORMANCE_BASED = 'performance_based' // 绩效相关
}

/**
 * 薪资组件计算规则
 */
export interface ComponentCalculationRule {
  /** 计算方法 */
  method: CalculationMethod;
  /** 基础值（固定金额、百分比等） */
  baseValue: number;
  /** 计算基础（如基本工资、总收入等） */
  calculationBasis?: string;
  /** 最小值 */
  minValue?: number;
  /** 最大值 */
  maxValue?: number;
  /** 计算公式（用于复杂计算） */
  formula?: string;
  /** 分层规则（用于分层计算） */
  tiers?: Array<{
    from: number;
    to: number;
    rate: number;
  }>;
  /** 绩效评级映射（用于绩效相关计算） */
  performanceMapping?: Record<string, number>;
}

/**
 * 薪资组件适用条件
 */
export interface ComponentConditions {
  /** 最小工作年限 */
  minTenureMonths?: number;
  /** 最大工作年限 */
  maxTenureMonths?: number;
  /** 适用的员工类别 */
  employeeCategories?: string[];
  /** 适用的职位级别 */
  positionLevels?: string[];
  /** 适用的部门ID */
  departmentIds?: string[];
  /** 适用的职位ID */
  positionIds?: string[];
  /** 生效日期 */
  effectiveFrom: Date;
  /** 失效日期 */
  effectiveTo?: Date;
  /** 自定义条件表达式 */
  customCondition?: string;
}

/**
 * 薪资组件历史记录
 */
export interface ComponentHistory {
  /** 变更日期 */
  changeDate: Date;
  /** 变更类型 */
  changeType: 'created' | 'updated' | 'activated' | 'deactivated' | 'archived';
  /** 变更前的值 */
  previousValue?: any;
  /** 变更后的值 */
  newValue?: any;
  /** 变更原因 */
  reason?: string;
  /** 操作人 */
  changedBy: string;
}

/**
 * SalaryComponent 领域实体
 */
export class SalaryComponent extends BaseEntity {
  private _name: string;
  private _description?: string;
  private _type: PayrollComponentType;
  private _status: SalaryComponentStatus;
  private _scope: ComponentScope;
  private _isDeduction: boolean;
  private _isStatutory: boolean;
  private _isTaxable: boolean;
  private _frequency: CalculationFrequency;
  private _calculationRule: ComponentCalculationRule;
  private _conditions?: ComponentConditions;
  private _priority: number;
  private _tags: string[];
  private _history: ComponentHistory[];
  private _metadata: Record<string, any>;

  // 统计数据（延迟加载）
  private _applicableEmployeeCount: number = 0;
  private _totalAmountThisMonth: number = 0;

  constructor(
    name: string,
    type: PayrollComponentType,
    isDeduction: boolean,
    calculationRule: ComponentCalculationRule,
    id?: string
  ) {
    super(id);
    this._name = name;
    this._type = type;
    this._isDeduction = isDeduction;
    this._calculationRule = calculationRule;
    this._status = SalaryComponentStatus.ACTIVE;
    this._scope = ComponentScope.GLOBAL;
    this._isStatutory = false;
    this._isTaxable = !isDeduction; // 默认收入组件计税，扣款组件不计税
    this._frequency = CalculationFrequency.MONTHLY;
    this._priority = 0;
    this._tags = [];
    this._history = [];
    this._metadata = {};
    
    this.validateName(name);
    this.validateCalculationRule(calculationRule);
    
    // 记录创建历史
    this.addHistoryRecord('created', undefined, {
      name: this._name,
      type: this._type,
      isDeduction: this._isDeduction
    }, '创建薪资组件');
  }

  // ==================== Getters ====================

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  get type(): PayrollComponentType {
    return this._type;
  }

  get status(): SalaryComponentStatus {
    return this._status;
  }

  get scope(): ComponentScope {
    return this._scope;
  }

  get isDeduction(): boolean {
    return this._isDeduction;
  }

  get isStatutory(): boolean {
    return this._isStatutory;
  }

  get isTaxable(): boolean {
    return this._isTaxable;
  }

  get frequency(): CalculationFrequency {
    return this._frequency;
  }

  get calculationRule(): ComponentCalculationRule {
    return { ...this._calculationRule };
  }

  get conditions(): ComponentConditions | undefined {
    return this._conditions ? { ...this._conditions } : undefined;
  }

  get priority(): number {
    return this._priority;
  }

  get tags(): string[] {
    return [...this._tags];
  }

  get history(): ComponentHistory[] {
    return [...this._history];
  }

  get metadata(): Record<string, any> {
    return { ...this._metadata };
  }

  get applicableEmployeeCount(): number {
    return this._applicableEmployeeCount;
  }

  get totalAmountThisMonth(): number {
    return this._totalAmountThisMonth;
  }

  get isActive(): boolean {
    return this._status === SalaryComponentStatus.ACTIVE;
  }

  get isIncome(): boolean {
    return !this._isDeduction;
  }

  // ==================== 业务方法 ====================

  /**
   * 更新基本信息
   */
  updateBasicInfo(
    name: string,
    description?: string,
    reason?: string
  ): void {
    this.validateName(name);
    
    const previousValue = {
      name: this._name,
      description: this._description
    };

    this._name = name;
    if (description !== undefined) {
      this._description = description;
    }
    
    this.markAsUpdated();
    this.addHistoryRecord('updated', previousValue, {
      name: this._name,
      description: this._description
    }, reason || '更新基本信息');
    
    this.publishEvent('SalaryComponentUpdated', {
      componentId: this.id,
      name: this._name,
      description: this._description
    });
  }

  /**
   * 更新计算规则
   */
  updateCalculationRule(
    calculationRule: ComponentCalculationRule,
    reason?: string
  ): void {
    this.validateCalculationRule(calculationRule);
    
    const previousValue = { ...this._calculationRule };
    this._calculationRule = { ...calculationRule };
    
    this.markAsUpdated();
    this.addHistoryRecord('updated', previousValue, this._calculationRule, 
      reason || '更新计算规则');
    
    this.publishEvent('SalaryComponentCalculationRuleUpdated', {
      componentId: this.id,
      calculationRule: this._calculationRule
    });
  }

  /**
   * 设置适用条件
   */
  setConditions(conditions: ComponentConditions, reason?: string): void {
    this.validateConditions(conditions);
    
    const previousValue = this._conditions;
    this._conditions = { ...conditions };
    
    this.markAsUpdated();
    this.addHistoryRecord('updated', previousValue, this._conditions,
      reason || '更新适用条件');
    
    this.publishEvent('SalaryComponentConditionsUpdated', {
      componentId: this.id,
      conditions: this._conditions
    });
  }

  /**
   * 移除适用条件
   */
  removeConditions(reason?: string): void {
    if (!this._conditions) {
      return; // 已经没有条件
    }

    const previousValue = this._conditions;
    this._conditions = undefined;
    
    this.markAsUpdated();
    this.addHistoryRecord('updated', previousValue, undefined,
      reason || '移除适用条件');
    
    this.publishEvent('SalaryComponentConditionsRemoved', {
      componentId: this.id
    });
  }

  /**
   * 设置应用范围
   */
  setScope(scope: ComponentScope, reason?: string): void {
    if (this._scope === scope) {
      return; // 没有变化
    }

    const previousValue = this._scope;
    this._scope = scope;
    
    this.markAsUpdated();
    this.addHistoryRecord('updated', previousValue, scope,
      reason || '更新应用范围');
    
    this.publishEvent('SalaryComponentScopeChanged', {
      componentId: this.id,
      previousScope: previousValue,
      newScope: scope
    });
  }

  /**
   * 设置计算频率
   */
  setFrequency(frequency: CalculationFrequency, reason?: string): void {
    if (this._frequency === frequency) {
      return; // 没有变化
    }

    const previousValue = this._frequency;
    this._frequency = frequency;
    
    this.markAsUpdated();
    this.addHistoryRecord('updated', previousValue, frequency,
      reason || '更新计算频率');
    
    this.publishEvent('SalaryComponentFrequencyChanged', {
      componentId: this.id,
      previousFrequency: previousValue,
      newFrequency: frequency
    });
  }

  /**
   * 设置优先级
   */
  setPriority(priority: number, reason?: string): void {
    if (priority < 0) {
      throw new DomainError('优先级不能为负数');
    }

    if (this._priority === priority) {
      return; // 没有变化
    }

    const previousValue = this._priority;
    this._priority = priority;
    
    this.markAsUpdated();
    this.addHistoryRecord('updated', previousValue, priority,
      reason || '更新优先级');
    
    this.publishEvent('SalaryComponentPriorityChanged', {
      componentId: this.id,
      previousPriority: previousValue,
      newPriority: priority
    });
  }

  /**
   * 设置法定标志
   */
  setStatutory(isStatutory: boolean, reason?: string): void {
    if (this._isStatutory === isStatutory) {
      return; // 没有变化
    }

    const previousValue = this._isStatutory;
    this._isStatutory = isStatutory;
    
    this.markAsUpdated();
    this.addHistoryRecord('updated', previousValue, isStatutory,
      reason || '更新法定标志');
    
    this.publishEvent('SalaryComponentStatutoryChanged', {
      componentId: this.id,
      isStatutory
    });
  }

  /**
   * 设置计税标志
   */
  setTaxable(isTaxable: boolean, reason?: string): void {
    if (this._isTaxable === isTaxable) {
      return; // 没有变化
    }

    const previousValue = this._isTaxable;
    this._isTaxable = isTaxable;
    
    this.markAsUpdated();
    this.addHistoryRecord('updated', previousValue, isTaxable,
      reason || '更新计税标志');
    
    this.publishEvent('SalaryComponentTaxableChanged', {
      componentId: this.id,
      isTaxable
    });
  }

  /**
   * 添加标签
   */
  addTag(tag: string): void {
    const trimmed = tag.trim();
    if (!trimmed) {
      throw new DomainError('标签不能为空');
    }

    if (this._tags.includes(trimmed)) {
      return; // 已存在
    }

    this._tags.push(trimmed);
    this.markAsUpdated();
    
    this.publishEvent('SalaryComponentTagAdded', {
      componentId: this.id,
      tag: trimmed
    });
  }

  /**
   * 移除标签
   */
  removeTag(tag: string): void {
    const index = this._tags.indexOf(tag);
    if (index >= 0) {
      this._tags.splice(index, 1);
      this.markAsUpdated();
      
      this.publishEvent('SalaryComponentTagRemoved', {
        componentId: this.id,
        tag
      });
    }
  }

  /**
   * 激活组件
   */
  activate(reason?: string): void {
    if (this._status === SalaryComponentStatus.ACTIVE) {
      return; // 已经是激活状态
    }

    const previousValue = this._status;
    this._status = SalaryComponentStatus.ACTIVE;
    
    this.markAsUpdated();
    this.addHistoryRecord('activated', previousValue, this._status,
      reason || '激活薪资组件');
    
    this.publishEvent('SalaryComponentActivated', {
      componentId: this.id
    });
  }

  /**
   * 停用组件
   */
  deactivate(reason?: string): void {
    if (this._status === SalaryComponentStatus.INACTIVE) {
      return; // 已经是停用状态
    }

    const previousValue = this._status;
    this._status = SalaryComponentStatus.INACTIVE;
    
    this.markAsUpdated();
    this.addHistoryRecord('deactivated', previousValue, this._status,
      reason || '停用薪资组件');
    
    this.publishEvent('SalaryComponentDeactivated', {
      componentId: this.id
    });
  }

  /**
   * 归档组件
   */
  archive(reason?: string): void {
    if (this._status === SalaryComponentStatus.ARCHIVED) {
      return; // 已经是归档状态
    }

    // 只有停用的组件才能归档
    if (this._status !== SalaryComponentStatus.INACTIVE) {
      throw new DomainError('只有停用的薪资组件才能被归档');
    }

    const previousValue = this._status;
    this._status = SalaryComponentStatus.ARCHIVED;
    
    this.markAsUpdated();
    this.addHistoryRecord('archived', previousValue, this._status,
      reason || '归档薪资组件');
    
    this.publishEvent('SalaryComponentArchived', {
      componentId: this.id
    });
  }

  /**
   * 计算组件金额
   */
  calculateAmount(
    employeeData: {
      baseSalary: number;
      totalIncome: number;
      performanceRating?: string;
      tenureMonths: number;
      departmentId: string;
      positionId: string;
      employeeCategory: string;
      [key: string]: any;
    }
  ): number {
    // 检查适用条件
    if (!this.isApplicableTo(employeeData)) {
      return 0;
    }

    return this.performCalculation(employeeData);
  }

  /**
   * 检查是否适用于特定员工
   */
  isApplicableTo(employeeData: {
    tenureMonths: number;
    departmentId: string;
    positionId: string;
    employeeCategory: string;
    positionLevel?: string;
    [key: string]: any;
  }): boolean {
    if (!this._conditions) {
      return true; // 没有条件限制，适用于所有员工
    }

    const conditions = this._conditions;

    // 检查工作年限
    if (conditions.minTenureMonths !== undefined && 
        employeeData.tenureMonths < conditions.minTenureMonths) {
      return false;
    }

    if (conditions.maxTenureMonths !== undefined && 
        employeeData.tenureMonths > conditions.maxTenureMonths) {
      return false;
    }

    // 检查员工类别
    if (conditions.employeeCategories && 
        !conditions.employeeCategories.includes(employeeData.employeeCategory)) {
      return false;
    }

    // 检查职位级别
    if (conditions.positionLevels && employeeData.positionLevel &&
        !conditions.positionLevels.includes(employeeData.positionLevel)) {
      return false;
    }

    // 检查部门
    if (conditions.departmentIds && 
        !conditions.departmentIds.includes(employeeData.departmentId)) {
      return false;
    }

    // 检查职位
    if (conditions.positionIds && 
        !conditions.positionIds.includes(employeeData.positionId)) {
      return false;
    }

    // 检查生效日期
    const now = new Date();
    if (conditions.effectiveFrom > now) {
      return false;
    }

    if (conditions.effectiveTo && conditions.effectiveTo < now) {
      return false;
    }

    return true;
  }

  /**
   * 设置元数据
   */
  setMetadata(key: string, value: any): void {
    this._metadata[key] = value;
    this.markAsUpdated();
  }

  /**
   * 获取元数据
   */
  getMetadata(key: string): any {
    return this._metadata[key];
  }

  /**
   * 设置统计数据
   */
  setStatistics(applicableEmployeeCount: number, totalAmountThisMonth: number): void {
    this._applicableEmployeeCount = Math.max(0, applicableEmployeeCount);
    this._totalAmountThisMonth = totalAmountThisMonth;
  }

  /**
   * 获取最近的变更记录
   */
  getRecentHistory(limit: number = 10): ComponentHistory[] {
    return this._history
      .sort((a, b) => b.changeDate.getTime() - a.changeDate.getTime())
      .slice(0, limit);
  }

  // ==================== 验证方法 ====================

  /**
   * 实体验证
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    // 验证名称
    if (!this._name || this._name.trim() === '') {
      errors.push('薪资组件名称不能为空');
    } else if (this._name.length > 100) {
      errors.push('薪资组件名称不能超过100个字符');
    }

    // 验证描述
    if (this._description && this._description.length > 500) {
      errors.push('薪资组件描述不能超过500个字符');
    }

    // 验证计算规则
    const ruleValidation = this.validateCalculationRule(this._calculationRule, false);
    if (!ruleValidation.isValid) {
      errors.push(...ruleValidation.errors);
    }

    // 验证条件
    if (this._conditions) {
      const conditionsValidation = this.validateConditions(this._conditions, false);
      if (!conditionsValidation.isValid) {
        errors.push(...conditionsValidation.errors);
      }
    }

    // 验证优先级
    if (this._priority < 0) {
      errors.push('优先级不能为负数');
    }

    return ValidationResult.fromErrors(errors);
  }

  // ==================== 私有方法 ====================

  /**
   * 验证名称
   */
  private validateName(name: string): void {
    if (!name || name.trim() === '') {
      throw new DomainError('薪资组件名称不能为空');
    }

    if (name.length > 100) {
      throw new DomainError('薪资组件名称不能超过100个字符');
    }
  }

  /**
   * 验证计算规则
   */
  private validateCalculationRule(
    rule: ComponentCalculationRule, 
    throwError: boolean = true
  ): ValidationResult {
    const errors: string[] = [];

    if (rule.baseValue < 0) {
      errors.push('基础值不能为负数');
    }

    if (rule.minValue !== undefined && rule.minValue < 0) {
      errors.push('最小值不能为负数');
    }

    if (rule.maxValue !== undefined && rule.maxValue < 0) {
      errors.push('最大值不能为负数');
    }

    if (rule.minValue !== undefined && rule.maxValue !== undefined &&
        rule.minValue > rule.maxValue) {
      errors.push('最小值不能大于最大值');
    }

    // 验证分层规则
    if (rule.method === CalculationMethod.TIERED && (!rule.tiers || rule.tiers.length === 0)) {
      errors.push('分层计算必须提供分层规则');
    }

    // 验证绩效映射
    if (rule.method === CalculationMethod.PERFORMANCE_BASED && 
        (!rule.performanceMapping || Object.keys(rule.performanceMapping).length === 0)) {
      errors.push('绩效相关计算必须提供绩效评级映射');
    }

    const result = ValidationResult.fromErrors(errors);
    
    if (throwError && !result.isValid) {
      throw new DomainError(result.firstError || '计算规则验证失败');
    }

    return result;
  }

  /**
   * 验证适用条件
   */
  private validateConditions(
    conditions: ComponentConditions, 
    throwError: boolean = true
  ): ValidationResult {
    const errors: string[] = [];

    if (conditions.minTenureMonths !== undefined && conditions.minTenureMonths < 0) {
      errors.push('最小工作年限不能为负数');
    }

    if (conditions.maxTenureMonths !== undefined && conditions.maxTenureMonths < 0) {
      errors.push('最大工作年限不能为负数');
    }

    if (conditions.minTenureMonths !== undefined && 
        conditions.maxTenureMonths !== undefined &&
        conditions.minTenureMonths > conditions.maxTenureMonths) {
      errors.push('最小工作年限不能大于最大工作年限');
    }

    if (conditions.effectiveTo && conditions.effectiveTo <= conditions.effectiveFrom) {
      errors.push('失效日期必须晚于生效日期');
    }

    const result = ValidationResult.fromErrors(errors);
    
    if (throwError && !result.isValid) {
      throw new DomainError(result.firstError || '适用条件验证失败');
    }

    return result;
  }

  /**
   * 执行计算
   */
  private performCalculation(employeeData: any): number {
    const rule = this._calculationRule;
    let amount = 0;

    switch (rule.method) {
      case CalculationMethod.FIXED_AMOUNT:
        amount = rule.baseValue;
        break;

      case CalculationMethod.PERCENTAGE:
        const basis = this.getCalculationBasis(employeeData, rule.calculationBasis);
        amount = basis * (rule.baseValue / 100);
        break;

      case CalculationMethod.TIERED:
        amount = this.calculateTieredAmount(employeeData, rule);
        break;

      case CalculationMethod.PERFORMANCE_BASED:
        amount = this.calculatePerformanceBasedAmount(employeeData, rule);
        break;

      case CalculationMethod.FORMULA:
        amount = this.calculateFormulaAmount(employeeData, rule);
        break;

      default:
        throw new DomainError(`不支持的计算方法: ${rule.method}`);
    }

    // 应用最小值和最大值限制
    if (rule.minValue !== undefined) {
      amount = Math.max(amount, rule.minValue);
    }

    if (rule.maxValue !== undefined) {
      amount = Math.min(amount, rule.maxValue);
    }

    return Math.round(amount * 100) / 100; // 保留两位小数
  }

  /**
   * 获取计算基础值
   */
  private getCalculationBasis(employeeData: any, basisType?: string): number {
    switch (basisType) {
      case 'baseSalary':
        return employeeData.baseSalary || 0;
      case 'totalIncome':
        return employeeData.totalIncome || 0;
      default:
        return employeeData.baseSalary || 0;
    }
  }

  /**
   * 计算分层金额
   */
  private calculateTieredAmount(employeeData: any, rule: ComponentCalculationRule): number {
    if (!rule.tiers) return 0;

    const basis = this.getCalculationBasis(employeeData, rule.calculationBasis);
    let amount = 0;

    for (const tier of rule.tiers) {
      if (basis > tier.from) {
        const tierAmount = Math.min(basis, tier.to) - tier.from;
        amount += tierAmount * (tier.rate / 100);
      }
    }

    return amount;
  }

  /**
   * 计算绩效相关金额
   */
  private calculatePerformanceBasedAmount(employeeData: any, rule: ComponentCalculationRule): number {
    if (!rule.performanceMapping || !employeeData.performanceRating) {
      return 0;
    }

    const multiplier = rule.performanceMapping[employeeData.performanceRating];
    if (multiplier === undefined) return 0;

    const basis = this.getCalculationBasis(employeeData, rule.calculationBasis);
    return basis * (multiplier / 100);
  }

  /**
   * 计算公式金额
   */
  private calculateFormulaAmount(employeeData: any, rule: ComponentCalculationRule): number {
    if (!rule.formula) return 0;

    // 这里应该实现公式解析和计算
    // 为简化，这里只返回基础值
    console.warn('公式计算尚未实现，使用基础值');
    return rule.baseValue;
  }

  /**
   * 添加历史记录
   */
  private addHistoryRecord(
    changeType: ComponentHistory['changeType'],
    previousValue: any,
    newValue: any,
    reason?: string,
    changedBy: string = 'system'
  ): void {
    this._history.push({
      changeDate: new Date(),
      changeType,
      previousValue,
      newValue,
      reason,
      changedBy
    });

    // 限制历史记录数量
    if (this._history.length > 100) {
      this._history.splice(0, this._history.length - 100);
    }
  }
}