/**
 * Payroll Enhanced 领域实体 - 增强版
 * 
 * 增强的薪资实体，包含更丰富的业务规则和计算逻辑
 */

import { BaseEntity } from '../../../../shared/domain/entities/BaseEntity';
import { DomainError, ValidationError } from '../../../../shared/domain/errors/DomainError';
import { ValidationResult } from '../../../../shared/domain/validation/ValidationResult';
import { SalaryComponent } from '../../../compensation/domain/entities/SalaryComponent';
import { EmployeeEnhanced } from './EmployeeEnhanced';

/**
 * 薪资状态枚举
 */
export enum PayrollStatus {
  DRAFT = 'draft',                    // 草稿
  PENDING_REVIEW = 'pending_review',  // 待审核
  APPROVED = 'approved',              // 已审核
  PROCESSING = 'processing',          // 处理中
  PAID = 'paid',                      // 已发放
  CANCELLED = 'cancelled',            // 已取消
  FAILED = 'failed'                   // 发放失败
}

/**
 * 薪资组件类型枚举
 */
export enum PayrollComponentType {
  BASIC_SALARY = 'basic_salary',      // 基本工资
  OVERTIME = 'overtime',              // 加班费
  BONUS = 'bonus',                    // 奖金
  ALLOWANCE = 'allowance',            // 津贴
  COMMISSION = 'commission',          // 提成
  SOCIAL_INSURANCE = 'social_insurance', // 社保
  HOUSING_FUND = 'housing_fund',      // 公积金
  TAX = 'tax',                        // 个人所得税
  OTHER_DEDUCTION = 'other_deduction' // 其他扣款
}

/**
 * 薪资组件
 */
export interface PayrollComponent {
  /** 组件ID */
  id?: string;
  /** 组件类型 */
  type: PayrollComponentType;
  /** 组件名称 */
  name: string;
  /** 金额 */
  amount: number;
  /** 是否为扣款 */
  isDeduction: boolean;
  /** 是否为法定项目 */
  isStatutory: boolean;
  /** 计算基础 */
  calculationBasis?: number;
  /** 计算比率 */
  rate?: number;
  /** 描述 */
  description?: string;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 薪资计算结果
 */
export interface PayrollCalculationResult {
  /** 总收入 */
  totalEarnings: number;
  /** 总扣款 */
  totalDeductions: number;
  /** 应发工资 */
  grossPay: number;
  /** 实发工资 */
  netPay: number;
  /** 计算时间 */
  calculatedAt: Date;
  /** 计算明细 */
  breakdown: {
    earnings: PayrollComponent[];
    deductions: PayrollComponent[];
    statutory: PayrollComponent[];
    voluntary: PayrollComponent[];
  };
}

/**
 * 薪资审批流程
 */
export interface ApprovalWorkflow {
  /** 审批步骤 */
  steps: Array<{
    stepName: string;
    approverId: string;
    approverName: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedAt?: Date;
    comments?: string;
  }>;
  /** 当前步骤 */
  currentStep: number;
  /** 是否完成 */
  isCompleted: boolean;
  /** 最终结果 */
  finalResult?: 'approved' | 'rejected';
}

/**
 * 薪资发放记录
 */
export interface PaymentRecord {
  /** 发放方式 */
  paymentMethod: 'bank_transfer' | 'cash' | 'check';
  /** 银行账户信息 */
  bankAccount?: {
    accountNumber: string;
    bankName: string;
    branchName?: string;
  };
  /** 发放时间 */
  paidAt: Date;
  /** 交易ID */
  transactionId?: string;
  /** 发放状态 */
  status: 'success' | 'failed' | 'pending';
  /** 失败原因 */
  failureReason?: string;
  /** 处理人 */
  processedBy: string;
}

/**
 * 薪资摘要
 */
export interface PayrollSummary {
  /** 员工ID */
  employeeId: string;
  /** 员工姓名 */
  employeeName: string;
  /** 部门名称 */
  departmentName?: string;
  /** 职位名称 */
  positionName?: string;
  /** 薪资期间 */
  payPeriod: string;
  /** 应发工资 */
  grossPay: number;
  /** 实发工资 */
  netPay: number;
  /** 总扣款 */
  totalDeductions: number;
  /** 薪资状态 */
  status: PayrollStatus;
  /** 发放日期 */
  payDate: Date;
}

/**
 * PayrollEnhanced 领域实体
 */
export class PayrollEnhanced extends BaseEntity {
  private _employeeId: string;
  private _payPeriodStart: Date;
  private _payPeriodEnd: Date;
  private _payDate: Date;
  private _status: PayrollStatus;
  private _components: PayrollComponent[] = [];
  private _notes?: string;
  
  // 计算结果缓存
  private _calculationResult?: PayrollCalculationResult;
  private _isCalculationValid: boolean = false;
  
  // 审批流程
  private _approvalWorkflow?: ApprovalWorkflow;
  
  // 发放记录
  private _paymentRecord?: PaymentRecord;
  
  // 关联对象（延迟加载）
  private _employee?: EmployeeEnhanced;
  private _salaryComponents?: SalaryComponent[];

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
    
    this.validatePayPeriod(payPeriodStart, payPeriodEnd);
    this.validatePayDate(payDate, payPeriodEnd);

    // 发布薪资创建事件
    this.publishEvent('PayrollCreated', {
      payrollId: this.id,
      employeeId: this._employeeId,
      payPeriodStart: this._payPeriodStart,
      payPeriodEnd: this._payPeriodEnd,
      payDate: this._payDate,
      status: this._status
    });
  }

  // ==================== Getters ====================

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

  get components(): PayrollComponent[] {
    return [...this._components];
  }

  get notes(): string | undefined {
    return this._notes;
  }

  get calculationResult(): PayrollCalculationResult | undefined {
    return this._calculationResult ? { ...this._calculationResult } : undefined;
  }

  get isCalculationValid(): boolean {
    return this._isCalculationValid;
  }

  get approvalWorkflow(): ApprovalWorkflow | undefined {
    return this._approvalWorkflow ? { ...this._approvalWorkflow } : undefined;
  }

  get paymentRecord(): PaymentRecord | undefined {
    return this._paymentRecord ? { ...this._paymentRecord } : undefined;
  }

  get employee(): EmployeeEnhanced | undefined {
    return this._employee;
  }

  get salaryComponents(): SalaryComponent[] {
    return this._salaryComponents ? [...this._salaryComponents] : [];
  }

  // 计算属性
  get grossPay(): number {
    return this._calculationResult?.grossPay || 0;
  }

  get netPay(): number {
    return this._calculationResult?.netPay || 0;
  }

  get totalDeductions(): number {
    return this._calculationResult?.totalDeductions || 0;
  }

  get totalEarnings(): number {
    return this._calculationResult?.totalEarnings || 0;
  }

  get payPeriodDays(): number {
    return Math.ceil((this._payPeriodEnd.getTime() - this._payPeriodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  get isPaid(): boolean {
    return this._status === PayrollStatus.PAID;
  }

  get isPending(): boolean {
    return this._status === PayrollStatus.PENDING_REVIEW;
  }

  get isApproved(): boolean {
    return this._status === PayrollStatus.APPROVED;
  }

  get isDraft(): boolean {
    return this._status === PayrollStatus.DRAFT;
  }

  get canBeEdited(): boolean {
    return this._status === PayrollStatus.DRAFT || this._status === PayrollStatus.FAILED;
  }

  get canBeSubmitted(): boolean {
    return this._status === PayrollStatus.DRAFT && this._components.length > 0;
  }

  get canBeApproved(): boolean {
    return this._status === PayrollStatus.PENDING_REVIEW;
  }

  get canBePaid(): boolean {
    return this._status === PayrollStatus.APPROVED;
  }

  // ==================== 业务方法 ====================

  /**
   * 更新薪资期间
   */
  updatePayPeriod(
    payPeriodStart: Date,
    payPeriodEnd: Date,
    payDate: Date,
    reason?: string
  ): void {
    if (!this.canBeEdited) {
      throw new DomainError('当前状态下不能修改薪资期间');
    }

    this.validatePayPeriod(payPeriodStart, payPeriodEnd);
    this.validatePayDate(payDate, payPeriodEnd);

    const previousPeriod = {
      start: this._payPeriodStart,
      end: this._payPeriodEnd,
      payDate: this._payDate
    };

    this._payPeriodStart = payPeriodStart;
    this._payPeriodEnd = payPeriodEnd;
    this._payDate = payDate;

    // 标记计算结果无效
    this._isCalculationValid = false;

    this.markAsUpdated();
    
    this.publishEvent('PayrollPeriodUpdated', {
      payrollId: this.id,
      previousPeriod,
      newPeriod: {
        start: payPeriodStart,
        end: payPeriodEnd,
        payDate
      },
      reason
    });
  }

  /**
   * 设置备注
   */
  setNotes(notes: string): void {
    this._notes = notes.trim() || undefined;
    this.markAsUpdated();
    
    this.publishEvent('PayrollNotesUpdated', {
      payrollId: this.id,
      notes: this._notes
    });
  }

  /**
   * 添加薪资组件
   */
  addComponent(component: Omit<PayrollComponent, 'id'>): void {
    if (!this.canBeEdited) {
      throw new DomainError('当前状态下不能添加薪资组件');
    }

    this.validateComponent(component);

    // 检查是否已存在相同类型的组件
    const existingComponent = this._components.find(c => 
      c.type === component.type && c.name === component.name
    );

    if (existingComponent) {
      throw new DomainError(`薪资组件"${component.name}"已存在`);
    }

    const newComponent: PayrollComponent = {
      id: this.generateComponentId(),
      ...component
    };

    this._components.push(newComponent);
    this._isCalculationValid = false;

    this.markAsUpdated();
    
    this.publishEvent('PayrollComponentAdded', {
      payrollId: this.id,
      component: newComponent
    });
  }

  /**
   * 更新薪资组件
   */
  updateComponent(componentId: string, updates: Partial<PayrollComponent>): void {
    if (!this.canBeEdited) {
      throw new DomainError('当前状态下不能修改薪资组件');
    }

    const component = this._components.find(c => c.id === componentId);
    if (!component) {
      throw new DomainError('薪资组件不存在');
    }

    const previousComponent = { ...component };

    // 更新组件属性
    Object.assign(component, updates);

    // 验证更新后的组件
    this.validateComponent(component);

    this._isCalculationValid = false;
    this.markAsUpdated();
    
    this.publishEvent('PayrollComponentUpdated', {
      payrollId: this.id,
      componentId,
      previousComponent,
      updatedComponent: component
    });
  }

  /**
   * 移除薪资组件
   */
  removeComponent(componentId: string): void {
    if (!this.canBeEdited) {
      throw new DomainError('当前状态下不能移除薪资组件');
    }

    const index = this._components.findIndex(c => c.id === componentId);
    if (index === -1) {
      throw new DomainError('薪资组件不存在');
    }

    const removedComponent = this._components.splice(index, 1)[0];
    this._isCalculationValid = false;

    this.markAsUpdated();
    
    this.publishEvent('PayrollComponentRemoved', {
      payrollId: this.id,
      removedComponent
    });
  }

  /**
   * 设置薪资组件列表
   */
  setComponents(components: Omit<PayrollComponent, 'id'>[]): void {
    if (!this.canBeEdited) {
      throw new DomainError('当前状态下不能设置薪资组件');
    }

    // 验证所有组件
    components.forEach(component => this.validateComponent(component));

    // 清除现有组件并添加新组件
    this._components = components.map(component => ({
      id: this.generateComponentId(),
      ...component
    }));

    this._isCalculationValid = false;
    this.markAsUpdated();
    
    this.publishEvent('PayrollComponentsSet', {
      payrollId: this.id,
      components: this._components
    });
  }

  /**
   * 根据类型获取组件
   */
  getComponentsByType(type: PayrollComponentType): PayrollComponent[] {
    return this._components.filter(component => component.type === type);
  }

  /**
   * 计算薪资
   */
  calculate(): PayrollCalculationResult {
    // 分类组件
    const earnings = this._components.filter(c => !c.isDeduction);
    const deductions = this._components.filter(c => c.isDeduction);
    const statutory = this._components.filter(c => c.isStatutory);
    const voluntary = this._components.filter(c => !c.isStatutory);

    // 计算总额
    const totalEarnings = earnings.reduce((sum, c) => sum + c.amount, 0);
    const totalDeductions = deductions.reduce((sum, c) => sum + c.amount, 0);

    // 应发 = 总收入
    const grossPay = totalEarnings;
    
    // 实发 = 应发 - 总扣款
    const netPay = grossPay - totalDeductions;

    // 创建计算结果
    this._calculationResult = {
      totalEarnings,
      totalDeductions,
      grossPay,
      netPay,
      calculatedAt: new Date(),
      breakdown: {
        earnings,
        deductions,
        statutory,
        voluntary
      }
    };

    this._isCalculationValid = true;
    this.markAsUpdated();
    
    this.publishEvent('PayrollCalculated', {
      payrollId: this.id,
      calculationResult: this._calculationResult
    });

    return { ...this._calculationResult };
  }

  /**
   * 自动计算薪资（基于薪资组件配置）
   */
  autoCalculate(
    employee: EmployeeEnhanced,
    salaryComponents: SalaryComponent[]
  ): PayrollCalculationResult {
    if (!this.canBeEdited) {
      throw new DomainError('当前状态下不能重新计算薪资');
    }

    // 清除现有组件
    this._components = [];

    // 构建员工数据用于组件计算
    const employeeData = {
      baseSalary: employee.baseSalary,
      totalIncome: employee.baseSalary,
      tenureMonths: employee.getStatistics().tenureMonths,
      departmentId: employee.departmentId || '',
      positionId: employee.positionId || '',
      employeeCategory: employee.employeeType,
      positionLevel: employee.position?.level,
      performanceRating: employee.latestPerformanceRecord?.ratingLevel
    };

    // 应用每个薪资组件
    for (const salaryComponent of salaryComponents) {
      if (!salaryComponent.isActive) continue;

      const amount = salaryComponent.calculateAmount(employeeData);
      if (amount <= 0) continue;

      this.addComponent({
        type: this.mapSalaryComponentType(salaryComponent.type),
        name: salaryComponent.name,
        amount,
        isDeduction: salaryComponent.isDeduction,
        isStatutory: salaryComponent.isStatutory,
        description: salaryComponent.description,
        metadata: {
          salaryComponentId: salaryComponent.id,
          calculationRule: salaryComponent.calculationRule
        }
      });
    }

    // 计算最终结果
    return this.calculate();
  }

  /**
   * 提交审核
   */
  submitForReview(submitterId: string, approvalWorkflow?: ApprovalWorkflow): void {
    if (!this.canBeSubmitted) {
      throw new DomainError('薪资记录不能提交审核');
    }

    // 确保计算结果有效
    if (!this._isCalculationValid) {
      this.calculate();
    }

    this._status = PayrollStatus.PENDING_REVIEW;
    
    if (approvalWorkflow) {
      this._approvalWorkflow = { ...approvalWorkflow };
    }

    this.markAsUpdated();
    
    this.publishEvent('PayrollSubmittedForReview', {
      payrollId: this.id,
      submitterId,
      grossPay: this.grossPay,
      netPay: this.netPay,
      approvalWorkflow: this._approvalWorkflow
    });
  }

  /**
   * 审核通过
   */
  approve(approverId: string, comments?: string): void {
    if (!this.canBeApproved) {
      throw new DomainError('薪资记录不能审核通过');
    }

    this._status = PayrollStatus.APPROVED;
    
    // 更新审批流程
    if (this._approvalWorkflow) {
      const currentStep = this._approvalWorkflow.steps[this._approvalWorkflow.currentStep];
      if (currentStep) {
        currentStep.status = 'approved';
        currentStep.approvedAt = new Date();
        currentStep.comments = comments;
      }
      
      this._approvalWorkflow.currentStep++;
      this._approvalWorkflow.isCompleted = 
        this._approvalWorkflow.currentStep >= this._approvalWorkflow.steps.length;
      this._approvalWorkflow.finalResult = 'approved';
    }

    this.markAsUpdated();
    
    this.publishEvent('PayrollApproved', {
      payrollId: this.id,
      approverId,
      comments,
      approvedAt: new Date(),
      approvalWorkflow: this._approvalWorkflow
    });
  }

  /**
   * 审核拒绝
   */
  reject(approverId: string, reason: string): void {
    if (!this.canBeApproved) {
      throw new DomainError('薪资记录不能审核拒绝');
    }

    this._status = PayrollStatus.DRAFT;
    
    // 更新审批流程
    if (this._approvalWorkflow) {
      const currentStep = this._approvalWorkflow.steps[this._approvalWorkflow.currentStep];
      if (currentStep) {
        currentStep.status = 'rejected';
        currentStep.approvedAt = new Date();
        currentStep.comments = reason;
      }
      
      this._approvalWorkflow.isCompleted = true;
      this._approvalWorkflow.finalResult = 'rejected';
    }

    this.markAsUpdated();
    
    this.publishEvent('PayrollRejected', {
      payrollId: this.id,
      approverId,
      reason,
      rejectedAt: new Date(),
      approvalWorkflow: this._approvalWorkflow
    });
  }

  /**
   * 开始发放流程
   */
  startPayment(
    paymentMethod: PaymentRecord['paymentMethod'],
    bankAccount?: PaymentRecord['bankAccount'],
    processedBy?: string
  ): void {
    if (!this.canBePaid) {
      throw new DomainError('薪资记录不能发放');
    }

    this._status = PayrollStatus.PROCESSING;
    this._paymentRecord = {
      paymentMethod,
      bankAccount,
      paidAt: new Date(),
      status: 'pending',
      processedBy: processedBy || 'system'
    };

    this.markAsUpdated();
    
    this.publishEvent('PayrollPaymentStarted', {
      payrollId: this.id,
      paymentMethod,
      bankAccount,
      processedBy,
      amount: this.netPay
    });
  }

  /**
   * 标记为已发放
   */
  markAsPaid(transactionId: string, processedBy: string): void {
    if (this._status !== PayrollStatus.PROCESSING) {
      throw new DomainError('只有处理中的薪资记录才能标记为已发放');
    }

    this._status = PayrollStatus.PAID;
    
    if (this._paymentRecord) {
      this._paymentRecord.status = 'success';
      this._paymentRecord.transactionId = transactionId;
      this._paymentRecord.paidAt = new Date();
      this._paymentRecord.processedBy = processedBy;
    }

    this.markAsUpdated();
    
    this.publishEvent('PayrollPaid', {
      payrollId: this.id,
      transactionId,
      processedBy,
      paidAt: new Date(),
      amount: this.netPay
    });
  }

  /**
   * 标记发放失败
   */
  markPaymentFailed(reason: string, processedBy: string): void {
    if (this._status !== PayrollStatus.PROCESSING) {
      throw new DomainError('只有处理中的薪资记录才能标记发放失败');
    }

    this._status = PayrollStatus.FAILED;
    
    if (this._paymentRecord) {
      this._paymentRecord.status = 'failed';
      this._paymentRecord.failureReason = reason;
      this._paymentRecord.processedBy = processedBy;
    }

    this.markAsUpdated();
    
    this.publishEvent('PayrollPaymentFailed', {
      payrollId: this.id,
      reason,
      processedBy,
      failedAt: new Date(),
      amount: this.netPay
    });
  }

  /**
   * 取消薪资记录
   */
  cancel(reason: string, cancelledBy: string): void {
    if (this.isPaid) {
      throw new DomainError('已发放的薪资记录不能取消');
    }

    this._status = PayrollStatus.CANCELLED;
    this.markAsUpdated();
    
    this.publishEvent('PayrollCancelled', {
      payrollId: this.id,
      reason,
      cancelledBy,
      cancelledAt: new Date()
    });
  }

  /**
   * 获取薪资摘要
   */
  getSummary(): PayrollSummary {
    return {
      employeeId: this._employeeId,
      employeeName: this._employee?.employeeName || 'Unknown',
      departmentName: this._employee?.department?.name,
      positionName: this._employee?.position?.name,
      payPeriod: `${this._payPeriodStart.toISOString().split('T')[0]} ~ ${this._payPeriodEnd.toISOString().split('T')[0]}`,
      grossPay: this.grossPay,
      netPay: this.netPay,
      totalDeductions: this.totalDeductions,
      status: this._status,
      payDate: this._payDate
    };
  }

  /**
   * 复制薪资记录
   */
  duplicate(
    newPayPeriodStart: Date,
    newPayPeriodEnd: Date,
    newPayDate: Date
  ): PayrollEnhanced {
    const duplicated = new PayrollEnhanced(
      this._employeeId,
      newPayPeriodStart,
      newPayPeriodEnd,
      newPayDate,
      PayrollStatus.DRAFT
    );

    // 复制组件（不包括ID）
    const componentsToAdd = this._components.map(component => ({
      type: component.type,
      name: component.name,
      amount: component.amount,
      isDeduction: component.isDeduction,
      isStatutory: component.isStatutory,
      calculationBasis: component.calculationBasis,
      rate: component.rate,
      description: component.description,
      metadata: component.metadata
    }));

    duplicated.setComponents(componentsToAdd);

    if (this._notes) {
      duplicated.setNotes(this._notes);
    }

    return duplicated;
  }

  // ==================== 验证方法 ====================

  /**
   * 实体验证
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    // 验证员工ID
    if (!this._employeeId || this._employeeId.trim() === '') {
      errors.push('员工ID不能为空');
    }

    // 验证薪资期间
    if (this._payPeriodStart >= this._payPeriodEnd) {
      errors.push('薪资期间开始日期必须早于结束日期');
    }

    // 验证发薪日期
    if (this._payDate < this._payPeriodEnd) {
      errors.push('发薪日期不能早于薪资期间结束日期');
    }

    // 验证组件
    for (const component of this._components) {
      const componentValidation = this.validateComponent(component, false);
      if (!componentValidation.isValid) {
        errors.push(...componentValidation.errors);
      }
    }

    // 验证计算结果
    if (this._calculationResult && this._calculationResult.netPay < 0) {
      errors.push('实发工资不能为负数');
    }

    return ValidationResult.fromErrors(errors);
  }

  // ==================== 私有方法 ====================

  private validatePayPeriod(start: Date, end: Date): void {
    if (start >= end) {
      throw new DomainError('薪资期间开始日期必须早于结束日期');
    }

    // 检查期间长度是否合理（不超过3个月）
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 93) { // 约3个月
      throw new DomainError('薪资期间不能超过3个月');
    }
  }

  private validatePayDate(payDate: Date, periodEnd: Date): void {
    if (payDate < periodEnd) {
      throw new DomainError('发薪日期不能早于薪资期间结束日期');
    }

    // 检查发薪日期不能太久远（不超过期间结束后6个月）
    const daysDiff = (payDate.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 180) { // 6个月
      throw new DomainError('发薪日期不能晚于薪资期间结束后6个月');
    }
  }

  private validateComponent(
    component: Partial<PayrollComponent>,
    throwError: boolean = true
  ): ValidationResult {
    const errors: string[] = [];

    if (!component.type) {
      errors.push('薪资组件类型不能为空');
    }

    if (!component.name || component.name.trim() === '') {
      errors.push('薪资组件名称不能为空');
    }

    if (component.amount === undefined || component.amount < 0) {
      errors.push('薪资组件金额不能为负数');
    }

    if (component.rate !== undefined && (component.rate < 0 || component.rate > 100)) {
      errors.push('薪资组件比率必须在0-100之间');
    }

    const result = ValidationResult.fromErrors(errors);
    
    if (throwError && !result.isValid) {
      throw new ValidationError(result.errors);
    }

    return result;
  }

  private generateComponentId(): string {
    return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapSalaryComponentType(type: any): PayrollComponentType {
    // 这里应该有一个完整的类型映射
    // 暂时简化处理
    return type as PayrollComponentType;
  }

  // ==================== 关联对象管理 ====================

  setEmployee(employee: EmployeeEnhanced): void {
    this._employee = employee;
  }

  setSalaryComponents(components: SalaryComponent[]): void {
    this._salaryComponents = components;
  }
}