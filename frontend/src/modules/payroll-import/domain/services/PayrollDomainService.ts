/**
 * Payroll 领域服务
 * 
 * 提供复杂的薪资相关业务逻辑，处理跨实体的薪资业务规则
 */

import { Injectable, ServiceLifetime } from '../../../../core/di/DIContainer';
import { DomainError } from '../../../../shared/domain/errors/DomainError';
import { PayrollEnhanced, PayrollStatus, PayrollComponentType } from '../entities/PayrollEnhanced';
import { EmployeeEnhanced, EmploymentStatus } from '../entities/EmployeeEnhanced';
import { SalaryComponent, CalculationMethod, ComponentScope } from '../../../compensation/domain/entities/SalaryComponent';

/**
 * 批量薪资创建信息
 */
export interface BatchPayrollCreation {
  /** 薪资期间开始 */
  payPeriodStart: Date;
  /** 薪资期间结束 */
  payPeriodEnd: Date;
  /** 发薪日期 */
  payDate: Date;
  /** 目标员工列表 */
  targetEmployees: EmployeeEnhanced[];
  /** 薪资组件配置 */
  salaryComponents: SalaryComponent[];
  /** 批次描述 */
  description?: string;
  /** 是否自动计算 */
  autoCalculate?: boolean;
}

/**
 * 批量薪资创建结果
 */
export interface BatchPayrollCreationResult {
  /** 成功创建的薪资记录 */
  successItems: PayrollEnhanced[];
  /** 失败的员工及原因 */
  failedItems: Array<{
    employee: EmployeeEnhanced;
    error: string;
  }>;
  /** 总计信息 */
  summary: {
    totalEmployees: number;
    successCount: number;
    failureCount: number;
    totalGrossPay: number;
    totalNetPay: number;
    averageGrossPay: number;
    averageNetPay: number;
  };
}

/**
 * 薪资统计信息
 */
export interface PayrollStatistics {
  /** 期间 */
  period: {
    start: Date;
    end: Date;
  };
  /** 员工统计 */
  employeeStats: {
    totalEmployees: number;
    activeEmployees: number;
    paidEmployees: number;
    pendingEmployees: number;
  };
  /** 金额统计 */
  amountStats: {
    totalGrossPay: number;
    totalNetPay: number;
    totalDeductions: number;
    averageGrossPay: number;
    averageNetPay: number;
    highestPay: number;
    lowestPay: number;
  };
  /** 组件统计 */
  componentStats: Array<{
    componentType: PayrollComponentType;
    totalAmount: number;
    employeeCount: number;
    averageAmount: number;
  }>;
  /** 部门统计 */
  departmentStats?: Array<{
    departmentId: string;
    departmentName: string;
    employeeCount: number;
    totalAmount: number;
    averageAmount: number;
  }>;
}

/**
 * 薪资审批配置
 */
export interface PayrollApprovalConfig {
  /** 是否需要审批 */
  requiresApproval: boolean;
  /** 审批阈值（超过此金额需要审批） */
  approvalThreshold?: number;
  /** 审批流程步骤 */
  approvalSteps: Array<{
    stepName: string;
    approverRole: string;
    isRequired: boolean;
    canSkip?: boolean;
  }>;
  /** 自动审批条件 */
  autoApprovalConditions?: Array<{
    condition: string;
    description: string;
  }>;
}

/**
 * 薪资发放配置
 */
export interface PayrollPaymentConfig {
  /** 默认发放方式 */
  defaultPaymentMethod: 'bank_transfer' | 'cash' | 'check';
  /** 银行发放配置 */
  bankTransferConfig?: {
    batchSize: number;
    retryAttempts: number;
    failureNotification: boolean;
  };
  /** 发放时间限制 */
  paymentTimeConstraints?: {
    earliestPayTime: string; // HH:mm
    latestPayTime: string;   // HH:mm
    excludeWeekends: boolean;
    excludeHolidays: boolean;
  };
}

/**
 * Payroll 领域服务
 */
@Injectable(ServiceLifetime.Singleton)
export class PayrollDomainService {
  private readonly defaultApprovalConfig: PayrollApprovalConfig = {
    requiresApproval: true,
    approvalThreshold: 50000, // 5万元以上需要审批
    approvalSteps: [
      {
        stepName: '部门主管审批',
        approverRole: 'DEPARTMENT_MANAGER',
        isRequired: true
      },
      {
        stepName: 'HR审批',
        approverRole: 'HR_MANAGER',
        isRequired: true
      },
      {
        stepName: '财务审批',
        approverRole: 'FINANCE_MANAGER',
        isRequired: true
      }
    ]
  };

  private readonly defaultPaymentConfig: PayrollPaymentConfig = {
    defaultPaymentMethod: 'bank_transfer',
    bankTransferConfig: {
      batchSize: 50,
      retryAttempts: 3,
      failureNotification: true
    },
    paymentTimeConstraints: {
      earliestPayTime: '09:00',
      latestPayTime: '17:00',
      excludeWeekends: true,
      excludeHolidays: true
    }
  };

  constructor(
    private approvalConfig: PayrollApprovalConfig = this.defaultApprovalConfig,
    private paymentConfig: PayrollPaymentConfig = this.defaultPaymentConfig
  ) {}

  /**
   * 批量创建薪资记录
   */
  async createBatchPayroll(
    creation: BatchPayrollCreation
  ): Promise<BatchPayrollCreationResult> {
    
    // 验证批量创建请求
    this.validateBatchPayrollCreation(creation);

    const result: BatchPayrollCreationResult = {
      successItems: [],
      failedItems: [],
      summary: {
        totalEmployees: creation.targetEmployees.length,
        successCount: 0,
        failureCount: 0,
        totalGrossPay: 0,
        totalNetPay: 0,
        averageGrossPay: 0,
        averageNetPay: 0
      }
    };

    // 为每个员工创建薪资记录
    for (const employee of creation.targetEmployees) {
      try {
        // 验证员工是否适合创建薪资记录
        this.validateEmployeeForPayroll(employee, creation.payPeriodStart, creation.payPeriodEnd);

        // 创建薪资记录
        const payroll = new PayrollEnhanced(
          employee.id!,
          creation.payPeriodStart,
          creation.payPeriodEnd,
          creation.payDate,
          PayrollStatus.DRAFT
        );

        // 设置员工关联
        payroll.setEmployee(employee);
        payroll.setSalaryComponents(creation.salaryComponents);

        // 自动计算薪资
        if (creation.autoCalculate) {
          payroll.autoCalculate(employee, creation.salaryComponents);
        }

        result.successItems.push(payroll);
        result.summary.successCount++;
        result.summary.totalGrossPay += payroll.grossPay;
        result.summary.totalNetPay += payroll.netPay;

      } catch (error) {
        result.failedItems.push({
          employee,
          error: (error as Error).message
        });
        result.summary.failureCount++;
      }
    }

    // 计算平均值
    if (result.summary.successCount > 0) {
      result.summary.averageGrossPay = result.summary.totalGrossPay / result.summary.successCount;
      result.summary.averageNetPay = result.summary.totalNetPay / result.summary.successCount;
    }

    return result;
  }

  /**
   * 薪资计算优化
   */
  async optimizePayrollCalculation(
    payroll: PayrollEnhanced,
    employee: EmployeeEnhanced,
    salaryComponents: SalaryComponent[]
  ): Promise<void> {
    
    // 清除现有计算结果
    payroll.setComponents([]);

    // 按优先级排序组件
    const sortedComponents = salaryComponents
      .filter(component => component.isActive)
      .sort((a, b) => b.priority - a.priority);

    // 构建员工数据上下文
    const employeeData = this.buildEmployeeDataContext(employee, payroll);

    // 分阶段应用薪资组件
    const stages = [
      { name: '基本薪资', types: [PayrollComponentType.BASIC_SALARY] },
      { name: '收入类', types: [PayrollComponentType.OVERTIME, PayrollComponentType.BONUS, 
                              PayrollComponentType.ALLOWANCE, PayrollComponentType.COMMISSION] },
      { name: '法定扣款', types: [PayrollComponentType.SOCIAL_INSURANCE, PayrollComponentType.HOUSING_FUND] },
      { name: '税款计算', types: [PayrollComponentType.TAX] },
      { name: '其他扣款', types: [PayrollComponentType.OTHER_DEDUCTION] }
    ];

    for (const stage of stages) {
      const stageComponents = sortedComponents.filter(component => 
        stage.types.includes(component.type)
      );

      for (const component of stageComponents) {
        const amount = component.calculateAmount(employeeData);
        if (amount > 0) {
          payroll.addComponent({
            type: component.type,
            name: component.name,
            amount,
            isDeduction: component.isDeduction,
            isStatutory: component.isStatutory,
            description: component.description,
            metadata: {
              componentId: component.id,
              stage: stage.name,
              calculationRule: component.calculationRule
            }
          });

          // 更新员工数据上下文（用于后续计算）
          if (!component.isDeduction) {
            employeeData.totalIncome += amount;
          }
        }
      }
    }

    // 执行最终计算
    payroll.calculate();
  }

  /**
   * 薪资重复检查
   */
  checkDuplicatePayroll(
    employeeId: string,
    payPeriodStart: Date,
    payPeriodEnd: Date,
    existingPayrolls: PayrollEnhanced[]
  ): {
    hasDuplicate: boolean;
    duplicatePayrolls: PayrollEnhanced[];
    suggestion: string;
  } {
    
    const duplicates = existingPayrolls.filter(payroll => 
      payroll.employeeId === employeeId &&
      payroll.status !== PayrollStatus.CANCELLED &&
      this.isPeriodsOverlapping(
        { start: payroll.payPeriodStart, end: payroll.payPeriodEnd },
        { start: payPeriodStart, end: payPeriodEnd }
      )
    );

    let suggestion = '';
    if (duplicates.length > 0) {
      if (duplicates.some(p => p.isPaid)) {
        suggestion = '该员工在此期间已有已发放的薪资记录，建议创建补发记录';
      } else if (duplicates.some(p => p.isApproved)) {
        suggestion = '该员工在此期间已有已审批的薪资记录，建议先取消现有记录';
      } else {
        suggestion = '该员工在此期间已有薪资记录，建议修改现有记录或调整期间';
      }
    }

    return {
      hasDuplicate: duplicates.length > 0,
      duplicatePayrolls: duplicates,
      suggestion
    };
  }

  /**
   * 薪资统计分析
   */
  calculatePayrollStatistics(
    payrolls: PayrollEnhanced[],
    periodStart: Date,
    periodEnd: Date,
    includeEmployeeDetails: boolean = false
  ): PayrollStatistics {
    
    const relevantPayrolls = payrolls.filter(payroll =>
      payroll.payPeriodStart >= periodStart &&
      payroll.payPeriodEnd <= periodEnd
    );

    // 员工统计
    const uniqueEmployees = new Set(relevantPayrolls.map(p => p.employeeId));
    const paidPayrolls = relevantPayrolls.filter(p => p.isPaid);
    const pendingPayrolls = relevantPayrolls.filter(p => p.isPending || p.isDraft);

    // 金额统计
    const grossPayAmounts = relevantPayrolls.map(p => p.grossPay);
    const netPayAmounts = relevantPayrolls.map(p => p.netPay);
    const deductionAmounts = relevantPayrolls.map(p => p.totalDeductions);

    const totalGrossPay = grossPayAmounts.reduce((sum, amount) => sum + amount, 0);
    const totalNetPay = netPayAmounts.reduce((sum, amount) => sum + amount, 0);
    const totalDeductions = deductionAmounts.reduce((sum, amount) => sum + amount, 0);

    // 组件统计
    const componentStats = this.calculateComponentStatistics(relevantPayrolls);

    return {
      period: {
        start: periodStart,
        end: periodEnd
      },
      employeeStats: {
        totalEmployees: uniqueEmployees.size,
        activeEmployees: relevantPayrolls.length,
        paidEmployees: paidPayrolls.length,
        pendingEmployees: pendingPayrolls.length
      },
      amountStats: {
        totalGrossPay,
        totalNetPay,
        totalDeductions,
        averageGrossPay: uniqueEmployees.size > 0 ? totalGrossPay / uniqueEmployees.size : 0,
        averageNetPay: uniqueEmployees.size > 0 ? totalNetPay / uniqueEmployees.size : 0,
        highestPay: Math.max(...netPayAmounts, 0),
        lowestPay: netPayAmounts.length > 0 ? Math.min(...netPayAmounts) : 0
      },
      componentStats
    };
  }

  /**
   * 智能薪资审批建议
   */
  getPayrollApprovalRecommendation(
    payroll: PayrollEnhanced,
    employee: EmployeeEnhanced,
    historicalPayrolls: PayrollEnhanced[]
  ): {
    requiresApproval: boolean;
    approvalLevel: 'auto' | 'standard' | 'senior' | 'executive';
    reasons: string[];
    recommendations: string[];
    estimatedApprovalTime: string;
  } {
    
    const reasons: string[] = [];
    const recommendations: string[] = [];
    let approvalLevel: 'auto' | 'standard' | 'senior' | 'executive' = 'auto';
    let requiresApproval = false;

    // 检查薪资金额阈值
    if (payroll.grossPay > this.approvalConfig.approvalThreshold!) {
      requiresApproval = true;
      approvalLevel = 'standard';
      reasons.push(`薪资金额${payroll.grossPay}超过审批阈值${this.approvalConfig.approvalThreshold}`);
    }

    // 检查与历史薪资的差异
    const recentPayrolls = historicalPayrolls
      .filter(p => p.employeeId === employee.id && p.isPaid)
      .sort((a, b) => b.payDate.getTime() - a.payDate.getTime())
      .slice(0, 3);

    if (recentPayrolls.length > 0) {
      const averageHistoricalPay = recentPayrolls.reduce((sum, p) => sum + p.grossPay, 0) / recentPayrolls.length;
      const variationPercentage = Math.abs((payroll.grossPay - averageHistoricalPay) / averageHistoricalPay * 100);

      if (variationPercentage > 30) {
        requiresApproval = true;
        approvalLevel = 'senior';
        reasons.push(`薪资变动幅度${variationPercentage.toFixed(1)}%超过30%`);
        recommendations.push('建议详细说明薪资变动原因');
      } else if (variationPercentage > 15) {
        requiresApproval = true;
        reasons.push(`薪资变动幅度${variationPercentage.toFixed(1)}%超过15%`);
      }
    }

    // 检查员工状态
    if (employee.employmentStatus === EmploymentStatus.PROBATION) {
      requiresApproval = true;
      reasons.push('员工处于试用期状态');
      recommendations.push('确认试用期薪资标准符合规定');
    }

    // 检查特殊组件
    const hasSpecialComponents = payroll.components.some(component => 
      component.type === PayrollComponentType.BONUS && component.amount > 10000
    );

    if (hasSpecialComponents) {
      requiresApproval = true;
      approvalLevel = 'senior';
      reasons.push('包含大额奖金组件');
      recommendations.push('确认奖金发放依据和审批流程');
    }

    // 估算审批时间
    let estimatedApprovalTime = '即时';
    if (requiresApproval) {
      switch (approvalLevel) {
        case 'standard':
          estimatedApprovalTime = '1-2个工作日';
          break;
        case 'senior':
          estimatedApprovalTime = '2-3个工作日';
          break;
        case 'executive':
          estimatedApprovalTime = '3-5个工作日';
          break;
      }
    }

    return {
      requiresApproval,
      approvalLevel,
      reasons,
      recommendations,
      estimatedApprovalTime
    };
  }

  /**
   * 薪资发放时间验证
   */
  validatePaymentTiming(
    payDate: Date,
    paymentMethod: 'bank_transfer' | 'cash' | 'check' = 'bank_transfer'
  ): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
    nextAvailableTime?: Date;
  } {
    
    const issues: string[] = [];
    const suggestions: string[] = [];
    let nextAvailableTime: Date | undefined;

    const now = new Date();
    
    // 检查是否为过去时间
    if (payDate < now) {
      issues.push('发放时间不能为过去时间');
      nextAvailableTime = new Date(now.getTime() + 60 * 60 * 1000); // 1小时后
    }

    // 检查时间限制（仅银行转账）
    if (paymentMethod === 'bank_transfer' && this.paymentConfig.paymentTimeConstraints) {
      const constraints = this.paymentConfig.paymentTimeConstraints;
      const payHour = payDate.getHours();
      const payMinute = payDate.getMinutes();
      const payTimeStr = `${payHour.toString().padStart(2, '0')}:${payMinute.toString().padStart(2, '0')}`;

      if (payTimeStr < constraints.earliestPayTime || payTimeStr > constraints.latestPayTime) {
        issues.push(`银行转账只能在${constraints.earliestPayTime}-${constraints.latestPayTime}之间进行`);
        suggestions.push('建议调整发放时间到银行营业时间内');
      }

      // 检查周末限制
      if (constraints.excludeWeekends) {
        const dayOfWeek = payDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          issues.push('银行转账不能在周末进行');
          suggestions.push('建议调整到工作日进行发放');
          
          // 计算下一个工作日
          const nextWorkday = new Date(payDate);
          if (dayOfWeek === 0) { // 周日
            nextWorkday.setDate(nextWorkday.getDate() + 1);
          } else { // 周六
            nextWorkday.setDate(nextWorkday.getDate() + 2);
          }
          nextAvailableTime = nextWorkday;
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
      nextAvailableTime
    };
  }

  // ==================== 私有方法 ====================

  private validateBatchPayrollCreation(creation: BatchPayrollCreation): void {
    if (creation.payPeriodStart >= creation.payPeriodEnd) {
      throw new DomainError('薪资期间开始日期必须早于结束日期');
    }

    if (creation.payDate < creation.payPeriodEnd) {
      throw new DomainError('发薪日期不能早于薪资期间结束日期');
    }

    if (creation.targetEmployees.length === 0) {
      throw new DomainError('目标员工列表不能为空');
    }

    if (creation.salaryComponents.length === 0) {
      throw new DomainError('薪资组件配置不能为空');
    }
  }

  private validateEmployeeForPayroll(
    employee: EmployeeEnhanced,
    payPeriodStart: Date,
    payPeriodEnd: Date
  ): void {
    
    if (!employee.isActive && !employee.isOnProbation) {
      throw new DomainError(`员工${employee.employeeName}不在活跃状态，无法创建薪资记录`);
    }

    // 检查员工是否在薪资期间内在职
    if (employee.hireDate > payPeriodEnd) {
      throw new DomainError(`员工${employee.employeeName}的入职日期晚于薪资期间`);
    }

    if (employee.terminationDate && employee.terminationDate < payPeriodStart) {
      throw new DomainError(`员工${employee.employeeName}的离职日期早于薪资期间`);
    }

    // 检查基本薪资设置
    if (!employee.baseSalary || employee.baseSalary <= 0) {
      throw new DomainError(`员工${employee.employeeName}未设置基本薪资`);
    }
  }

  private buildEmployeeDataContext(
    employee: EmployeeEnhanced,
    payroll: PayrollEnhanced
  ): any {
    const statistics = employee.getStatistics();
    
    return {
      baseSalary: employee.baseSalary,
      totalIncome: employee.baseSalary,
      tenureMonths: statistics.tenureMonths,
      departmentId: employee.departmentId || '',
      positionId: employee.positionId || '',
      employeeCategory: employee.employeeType,
      positionLevel: employee.position?.level,
      performanceRating: employee.latestPerformanceRecord?.ratingLevel,
      payPeriodDays: payroll.payPeriodDays,
      isNewEmployee: statistics.tenureMonths < 6,
      isSeasonalBonus: payroll.payPeriodEnd.getMonth() === 11, // 12月
      workLocation: employee.position?.workLocation,
      employeeGrade: employee.position?.level || 'junior'
    };
  }

  private isPeriodsOverlapping(
    period1: { start: Date; end: Date },
    period2: { start: Date; end: Date }
  ): boolean {
    return period1.start <= period2.end && period2.start <= period1.end;
  }

  private calculateComponentStatistics(payrolls: PayrollEnhanced[]): Array<{
    componentType: PayrollComponentType;
    totalAmount: number;
    employeeCount: number;
    averageAmount: number;
  }> {
    const componentMap = new Map<PayrollComponentType, {
      totalAmount: number;
      employeeCount: number;
    }>();

    payrolls.forEach(payroll => {
      payroll.components.forEach(component => {
        const existing = componentMap.get(component.type) || {
          totalAmount: 0,
          employeeCount: 0
        };

        existing.totalAmount += component.amount;
        existing.employeeCount += 1;
        componentMap.set(component.type, existing);
      });
    });

    return Array.from(componentMap.entries()).map(([type, stats]) => ({
      componentType: type,
      totalAmount: stats.totalAmount,
      employeeCount: stats.employeeCount,
      averageAmount: stats.employeeCount > 0 ? stats.totalAmount / stats.employeeCount : 0
    }));
  }
}