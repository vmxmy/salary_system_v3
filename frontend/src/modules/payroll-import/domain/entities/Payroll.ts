/**
 * Payroll Domain实体
 * 
 * 薪资记录领域实体，包含薪资计算规则和业务逻辑
 */

import { BaseEntity, ValidationResult } from '../../../../shared/domain/entities/BaseEntity';
import { DomainEvent } from '../../../../shared/domain/events/DomainEvent';
import { BusinessRuleError } from '../../../../shared/domain/errors/DomainError';

/**
 * 薪资状态枚举
 */
export enum PayrollStatus {
  DRAFT = 'draft',           // 草稿
  PENDING = 'pending',       // 待审核
  APPROVED = 'approved',     // 已审核
  PAID = 'paid',             // 已发放
  CANCELLED = 'cancelled'    // 已取消
}

/**
 * 薪资组件类型
 */
export enum PayrollComponentType {
  BASIC_SALARY = 'basic_salary',         // 基本工资
  OVERTIME = 'overtime',                 // 加班费
  BONUS = 'bonus',                       // 奖金
  ALLOWANCE = 'allowance',               // 津贴
  COMMISSION = 'commission',             // 提成
  SOCIAL_INSURANCE = 'social_insurance', // 社保
  HOUSING_FUND = 'housing_fund',         // 公积金
  TAX = 'tax',                          // 个人所得税
  OTHER_DEDUCTION = 'other_deduction'    // 其他扣除
}

/**
 * 薪资组件
 */
export interface PayrollComponent {
  id: string;
  type: PayrollComponentType;
  name: string;
  amount: number;
  isDeduction: boolean;     // 是否为扣除项
  isStatutory: boolean;     // 是否为法定项目
  description?: string;
  calculationBasis?: number; // 计算基数
  rate?: number;            // 费率
  metadata?: Record<string, any>;
}

/**
 * 薪资计算摘要
 */
export interface PayrollSummary {
  totalEarnings: number;      // 总收入
  totalDeductions: number;    // 总扣除
  grossPay: number;          // 应发工资
  netPay: number;            // 实发工资
  taxableIncome: number;     // 应税收入
  componentCounts: {
    earnings: number;
    deductions: number;
    statutory: number;
      };
}

/**
 * 薪资领域实体
 */
export class Payroll extends BaseEntity {
  private _employeeId: string;
  private _payPeriodStart: Date;
  private _payPeriodEnd: Date;
  private _payDate: Date;
  private _status: PayrollStatus;
  private _notes?: string;
  
  // 薪资组件
  private _components: PayrollComponent[] = [];
  
  // 计算结果（缓存）
  private _grossPay: number = 0;
  private _netPay: number = 0;
  private _totalDeductions: number = 0;
  private _calculationCache?: PayrollSummary;

  constructor(
    employeeId: string,
    payPeriodStart: Date,
    payPeriodEnd: Date,
    payDate: Date,
    status: PayrollStatus = PayrollStatus.DRAFT,
    id?: string
  ) {
    super(id);
    this._employeeId = employeeId;
    this._payPeriodStart = payPeriodStart;
    this._payPeriodEnd = payPeriodEnd;
    this._payDate = payDate;
    this._status = status;
  }

  // ==================== 访问器 ====================

  get employeeId(): string {
    return this._employeeId;
  }

  get payPeriodStart(): Date {
    return this._payPeriodStart;
  }

  get payPeriodEnd(): Date {
    return this._payPeriodEnd;
  }

  get payDate(): Date {
    return this._payDate;
  }

  get status(): PayrollStatus {
    return this._status;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  get components(): PayrollComponent[] {
    return [...this._components];
  }

  get grossPay(): number {
    return this._grossPay;
  }

  get netPay(): number {
    return this._netPay;
  }

  get totalDeductions(): number {
    return this._totalDeductions;
  }

  get isDraft(): boolean {
    return this._status === PayrollStatus.DRAFT;
  }

  get isApproved(): boolean {
    return this._status === PayrollStatus.APPROVED;
  }

  get isPaid(): boolean {
    return this._status === PayrollStatus.PAID;
  }

  get isCancelled(): boolean {
    return this._status === PayrollStatus.CANCELLED;
  }

  get canEdit(): boolean {
    return this._status === PayrollStatus.DRAFT;
  }

  get canApprove(): boolean {
    return this._status === PayrollStatus.PENDING;
  }

  get canPay(): boolean {
    return this._status === PayrollStatus.APPROVED;
  }

  // ==================== 业务方法 ====================

  /**
   * 设置备注
   */
  setNotes(notes?: string): void {
    this._notes = notes;
    this.markAsUpdated();
  }

  /**
   * 更新薪资期间
   */
  updatePayPeriod(start: Date, end: Date): void {
    if (!this.canEdit) {
      throw new BusinessRuleError('只有草稿状态的薪资记录可以修改期间', 'PAYROLL_NOT_EDITABLE');
    }

    if (start >= end) {
      throw new BusinessRuleError('薪资期间开始日期必须早于结束日期', 'INVALID_PAY_PERIOD');
    }

    this._payPeriodStart = start;
    this._payPeriodEnd = end;
    this.markAsUpdated();
    this.invalidateCache();

    this.addDomainEvent(new DomainEvent(
      'PayrollPeriodUpdated',
      { oldStart: this._payPeriodStart, oldEnd: this._payPeriodEnd, newStart: start, newEnd: end },
      this.id,
      'Payroll'
    ));
  }

  /**
   * 更新发薪日期
   */
  updatePayDate(payDate: Date): void {
    if (!this.canEdit) {
      throw new BusinessRuleError('只有草稿状态的薪资记录可以修改发薪日期', 'PAYROLL_NOT_EDITABLE');
    }

    if (payDate < this._payPeriodEnd) {
      throw new BusinessRuleError('发薪日期不能早于薪资期间结束日期', 'INVALID_PAY_DATE');
    }

    const oldPayDate = this._payDate;
    this._payDate = payDate;
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'PayrollPayDateUpdated',
      { oldPayDate, newPayDate: payDate },
      this.id,
      'Payroll'
    ));
  }

  /**
   * 添加薪资组件
   */
  addComponent(component: Omit<PayrollComponent, 'id'>): void {
    if (!this.canEdit) {
      throw new BusinessRuleError('只有草稿状态的薪资记录可以添加组件', 'PAYROLL_NOT_EDITABLE');
    }

    this.validateComponent(component);

    const newComponent: PayrollComponent = {
      ...component,
      id: crypto.randomUUID()
    };

    this._components.push(newComponent);
    this.recalculate();
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'PayrollComponentAdded',
      { componentId: newComponent.id, type: newComponent.type, amount: newComponent.amount },
      this.id,
      'Payroll'
    ));
  }

  /**
   * 更新薪资组件
   */
  updateComponent(componentId: string, updates: Partial<PayrollComponent>): void {
    if (!this.canEdit) {
      throw new BusinessRuleError('只有草稿状态的薪资记录可以修改组件', 'PAYROLL_NOT_EDITABLE');
    }

    const componentIndex = this._components.findIndex(c => c.id === componentId);
    if (componentIndex === -1) {
      throw new BusinessRuleError('薪资组件不存在', 'COMPONENT_NOT_FOUND');
    }

    const oldComponent = { ...this._components[componentIndex] };
    Object.assign(this._components[componentIndex], updates);
    
    this.validateComponent(this._components[componentIndex]);
    this.recalculate();
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'PayrollComponentUpdated',
      { componentId, oldComponent, newComponent: this._components[componentIndex] },
      this.id,
      'Payroll'
    ));
  }

  /**
   * 删除薪资组件
   */
  removeComponent(componentId: string): void {
    if (!this.canEdit) {
      throw new BusinessRuleError('只有草稿状态的薪资记录可以删除组件', 'PAYROLL_NOT_EDITABLE');
    }

    const componentIndex = this._components.findIndex(c => c.id === componentId);
    if (componentIndex === -1) {
      throw new BusinessRuleError('薪资组件不存在', 'COMPONENT_NOT_FOUND');
    }

    const removedComponent = this._components[componentIndex];
    this._components.splice(componentIndex, 1);
    this.recalculate();
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'PayrollComponentRemoved',
      { componentId, type: removedComponent.type, amount: removedComponent.amount },
      this.id,
      'Payroll'
    ));
  }

  /**
   * 批量设置薪资组件
   */
  setComponents(components: Omit<PayrollComponent, 'id'>[]): void {
    if (!this.canEdit) {
      throw new BusinessRuleError('只有草稿状态的薪资记录可以设置组件', 'PAYROLL_NOT_EDITABLE');
    }

    // 验证所有组件
    components.forEach(component => this.validateComponent(component));

    const oldComponents = [...this._components];
    this._components = components.map(component => ({
      ...component,
      id: crypto.randomUUID()
    }));

    this.recalculate();
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'PayrollComponentsReplaced',
      { oldCount: oldComponents.length, newCount: this._components.length },
      this.id,
      'Payroll'
    ));
  }

  /**
   * 提交审核
   */
  submitForApproval(): void {
    if (this._status !== PayrollStatus.DRAFT) {
      throw new BusinessRuleError('只有草稿状态的薪资记录可以提交审核', 'INVALID_STATUS_TRANSITION');
    }

    if (this._components.length === 0) {
      throw new BusinessRuleError('薪资记录必须包含至少一个薪资组件', 'NO_COMPONENTS');
    }

    this._status = PayrollStatus.PENDING;
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'PayrollSubmittedForApproval',
      { summary: this.getSummary() },
      this.id,
      'Payroll'
    ));
  }

  /**
   * 审核通过
   */
  approve(): void {
    if (this._status !== PayrollStatus.PENDING) {
      throw new BusinessRuleError('只有待审核状态的薪资记录可以审核通过', 'INVALID_STATUS_TRANSITION');
    }

    this._status = PayrollStatus.APPROVED;
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'PayrollApproved',
      { approvedAt: new Date(), summary: this.getSummary() },
      this.id,
      'Payroll'
    ));
  }

  /**
   * 拒绝审核
   */
  reject(reason?: string): void {
    if (this._status !== PayrollStatus.PENDING) {
      throw new BusinessRuleError('只有待审核状态的薪资记录可以拒绝', 'INVALID_STATUS_TRANSITION');
    }

    this._status = PayrollStatus.DRAFT;
    if (reason) {
      this._notes = (this._notes ? this._notes + '\n' : '') + `拒绝原因: ${reason}`;
    }
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'PayrollRejected',
      { reason, rejectedAt: new Date() },
      this.id,
      'Payroll'
    ));
  }

  /**
   * 标记为已支付
   */
  markAsPaid(): void {
    if (this._status !== PayrollStatus.APPROVED) {
      throw new BusinessRuleError('只有已审核的薪资记录可以标记为已支付', 'INVALID_STATUS_TRANSITION');
    }

    this._status = PayrollStatus.PAID;
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'PayrollPaid',
      { paidAt: new Date(), summary: this.getSummary() },
      this.id,
      'Payroll'
    ));
  }

  /**
   * 取消薪资记录
   */
  cancel(reason?: string): void {
    if (this._status === PayrollStatus.PAID) {
      throw new BusinessRuleError('已支付的薪资记录不能取消', 'CANNOT_CANCEL_PAID');
    }

    this._status = PayrollStatus.CANCELLED;
    if (reason) {
      this._notes = (this._notes ? this._notes + '\n' : '') + `取消原因: ${reason}`;
    }
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'PayrollCancelled',
      { reason, cancelledAt: new Date() },
      this.id,
      'Payroll'
    ));
  }

  /**
   * 重新计算薪资
   */
  recalculate(): void {
    let totalEarnings = 0;
    let totalDeductions = 0;

    this._components.forEach(component => {
      if (component.isDeduction) {
        totalDeductions += component.amount;
      } else {
        totalEarnings += component.amount;
      }
    });

    this._grossPay = totalEarnings;
    this._totalDeductions = totalDeductions;
    this._netPay = this._grossPay - this._totalDeductions;

    // 确保实发工资不为负数
    if (this._netPay < 0) {
      this._netPay = 0;
    }

    this.invalidateCache();
  }

  /**
   * 获取薪资计算摘要
   */
  getSummary(): PayrollSummary {
    if (!this._calculationCache) {
      const earnings = this._components.filter(c => !c.isDeduction);
      const deductions = this._components.filter(c => c.isDeduction);
      const statutory = this._components.filter(c => c.isStatutory);

      const totalEarnings = earnings.reduce((sum, c) => sum + c.amount, 0);
      const totalDeductions = deductions.reduce((sum, c) => sum + c.amount, 0);

      // 简化的应税收入计算（实际应根据税法规定）
      const taxExemptComponents = this._components.filter(c => 
        c.type === PayrollComponentType.SOCIAL_INSURANCE || 
        c.type === PayrollComponentType.HOUSING_FUND
      );
      const taxExemptAmount = taxExemptComponents.reduce((sum, c) => sum + c.amount, 0);
      const taxableIncome = Math.max(0, totalEarnings - taxExemptAmount);

      this._calculationCache = {
        totalEarnings,
        totalDeductions,
        grossPay: this._grossPay,
        netPay: this._netPay,
        taxableIncome,
        componentCounts: {
          earnings: earnings.length,
          deductions: deductions.length,
          statutory: statutory.length
        }
      };
    }

    return this._calculationCache;
  }

  /**
   * 获取特定类型的组件
   */
  getComponentsByType(type: PayrollComponentType): PayrollComponent[] {
    return this._components.filter(c => c.type === type);
  }

  /**
   * 获取基本工资
   */
  getBasicSalary(): number {
    const basicSalaryComponents = this.getComponentsByType(PayrollComponentType.BASIC_SALARY);
    return basicSalaryComponents.reduce((sum, c) => sum + c.amount, 0);
  }

  /**
   * 获取税额
   */
  getTaxAmount(): number {
    const taxComponents = this.getComponentsByType(PayrollComponentType.TAX);
    return taxComponents.reduce((sum, c) => sum + c.amount, 0);
  }

  // ==================== 验证方法 ====================

  /**
   * 验证薪资实体
   */
  validate(): ValidationResult {
    const baseValidation = this.validateBaseRules();
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    const errors = [];

    // 验证员工ID
    if (!this._employeeId || this._employeeId.trim().length === 0) {
      errors.push({
        field: 'employeeId',
        message: '员工ID不能为空',
        code: 'REQUIRED'
      });
    }

    // 验证薪资期间
    if (this._payPeriodStart >= this._payPeriodEnd) {
      errors.push({
        field: 'payPeriod',
        message: '薪资期间开始日期必须早于结束日期',
        code: 'INVALID_PAY_PERIOD'
      });
    }

    // 验证发薪日期
    if (this._payDate < this._payPeriodEnd) {
      errors.push({
        field: 'payDate',
        message: '发薪日期不能早于薪资期间结束日期',
        code: 'INVALID_PAY_DATE'
      });
    }

    // 验证薪资组件
    this._components.forEach((component, index) => {
      try {
        this.validateComponent(component);
      } catch (error) {
        errors.push({
          field: `components[${index}]`,
          message: (error as Error).message,
          code: 'INVALID_COMPONENT'
        });
      }
    });

    // 业务规则验证
    if (this._netPay < 0 && this._status !== PayrollStatus.DRAFT) {
      errors.push({
        field: 'netPay',
        message: '实发工资不能为负数',
        code: 'NEGATIVE_NET_PAY'
      });
    }

    return errors.length > 0 
      ? ValidationResult.failure(errors)
      : ValidationResult.success();
  }

  /**
   * 验证薪资组件
   */
  private validateComponent(component: Partial<PayrollComponent>): void {
    if (!component.name || component.name.trim().length === 0) {
      throw new Error('薪资组件名称不能为空');
    }

    if (component.amount === undefined || component.amount === null) {
      throw new Error('薪资组件金额不能为空');
    }

    if (component.amount < 0) {
      throw new Error('薪资组件金额不能为负数');
    }

    if (!component.type) {
      throw new Error('薪资组件类型不能为空');
    }

    if (component.rate !== undefined && (component.rate < 0 || component.rate > 1)) {
      throw new Error('薪资组件费率必须在0-1之间');
    }
  }

  /**
   * 使缓存失效
   */
  private invalidateCache(): void {
    this._calculationCache = undefined;
  }

  /**
   * 克隆薪资记录
   */
  clone(): Payroll {
    const cloned = new Payroll(
      this._employeeId,
      this._payPeriodStart,
      this._payPeriodEnd,
      this._payDate,
      this._status
    );

    cloned._notes = this._notes;
    cloned._components = this._components.map(component => ({ ...component, id: crypto.randomUUID() }));
    cloned.recalculate();

    return cloned;
  }

  /**
   * 转换为JSON对象
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      employeeId: this._employeeId,
      payPeriodStart: this._payPeriodStart,
      payPeriodEnd: this._payPeriodEnd,
      payDate: this._payDate,
      status: this._status,
      notes: this._notes,
      components: this._components,
      grossPay: this._grossPay,
      netPay: this._netPay,
      totalDeductions: this._totalDeductions,
      summary: this.getSummary(),
      canEdit: this.canEdit,
      canApprove: this.canApprove,
      canPay: this.canPay
    };
  }
}