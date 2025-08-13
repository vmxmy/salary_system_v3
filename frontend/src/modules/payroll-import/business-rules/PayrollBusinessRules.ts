/**
 * 薪资业务规则实现
 * 
 * 定义薪资模块特定的业务规则
 */

import { BaseBusinessRule, ConditionBuilder } from '../../../shared/business-rules/core/BaseBusinessRule';
import { BusinessRuleContext, BusinessRuleResult } from '../../../shared/business-rules/interfaces/IBusinessRule';
import { PayrollEnhanced } from '../domain/entities/PayrollEnhanced';
import { EmployeeEnhanced } from '../domain/entities/EmployeeEnhanced';

/**
 * 薪资重复检查规则
 */
export class DuplicatePayrollRule extends BaseBusinessRule {
  constructor() {
    super(
      'duplicate-payroll-check',
      '薪资重复检查',
      '检查同一员工在同一薪资周期内是否已存在薪资记录',
      100, // 高优先级
      ['PayrollEnhanced'],
      ['create']
    );
  }

  protected async executeCore(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const payroll = context.entity as PayrollEnhanced;
    const existingPayrolls = context.contextData?.existingPayrolls as PayrollEnhanced[] || [];

    // 检查必需属性
    const missingProps = this.validateRequiredProperties(payroll, ['employeeId', 'payPeriodStart', 'payPeriodEnd']);
    if (missingProps.length > 0) {
      return this.createFailureResult(
        `缺少必需属性: ${missingProps.join(', ')}`,
        'error'
      );
    }

    // 检查重复记录
    const duplicates = existingPayrolls.filter(existing => 
      existing.employeeId === payroll.employeeId &&
      this.isPeriodsOverlapping(
        existing.payPeriodStart, existing.payPeriodEnd,
        payroll.payPeriodStart, payroll.payPeriodEnd
      )
    );

    if (duplicates.length > 0) {
      return this.createFailureResult(
        `员工 ${payroll.employeeId} 在薪资周期 ${payroll.payPeriodStart.toLocaleDateString()} - ${payroll.payPeriodEnd.toLocaleDateString()} 内已存在薪资记录`,
        'error',
        ['请检查薪资周期设置', '考虑更新现有记录而非创建新记录'],
        { duplicateIds: duplicates.map(d => d.id) }
      );
    }

    return this.createSuccessResult('未发现重复薪资记录');
  }

  private isPeriodsOverlapping(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 <= end2 && start2 <= end1;
  }
}

/**
 * 薪资金额验证规则
 */
export class PayrollAmountValidationRule extends BaseBusinessRule {
  constructor() {
    super(
      'payroll-amount-validation',
      '薪资金额验证',
      '验证薪资金额是否在合理范围内',
      90,
      ['PayrollEnhanced'],
      ['create', 'update']
    );
  }

  protected async executeCore(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const payroll = context.entity as PayrollEnhanced;
    const employee = context.contextData?.employee as EmployeeEnhanced;

    // 获取配置的金额范围
    const minGrossPay = this.getConfigValue('minGrossPay', 0);
    const maxGrossPay = this.getConfigValue('maxGrossPay', 1000000);
    const maxSalaryMultiplier = this.getConfigValue('maxSalaryMultiplier', 3);

    const results: BusinessRuleResult[] = [];

    // 检查基本薪资金额
    if (payroll.grossPay < minGrossPay) {
      results.push(this.createFailureResult(
        `应发工资 ${payroll.grossPay} 低于最低限额 ${minGrossPay}`,
        'warning',
        ['请确认薪资计算是否正确', '检查是否有特殊情况需要审批']
      ));
    }

    if (payroll.grossPay > maxGrossPay) {
      results.push(this.createFailureResult(
        `应发工资 ${payroll.grossPay} 超过最高限额 ${maxGrossPay}`,
        'error',
        ['需要高级管理层审批', '确认是否为特殊奖金或补偿']
      ));
    }

    // 如果有员工信息，检查与基本工资的比例
    if (employee && employee.baseSalary) {
      const salaryRatio = payroll.grossPay / employee.baseSalary;
      if (salaryRatio > maxSalaryMultiplier) {
        results.push(this.createFailureResult(
          `应发工资是基本工资的 ${salaryRatio.toFixed(2)} 倍，超过限制 ${maxSalaryMultiplier} 倍`,
          'warning',
          ['确认是否包含特殊奖金', '检查加班费计算是否正确', '可能需要分期发放']
        ));
      }
    }

    // 检查实发工资不能为负数
    if (payroll.netPay < 0) {
      results.push(this.createFailureResult(
        `实发工资不能为负数: ${payroll.netPay}`,
        'error',
        ['检查扣除项目设置', '确认扣款是否过多']
      ));
    }

    // 检查扣除总额是否合理
    const deductionRatio = payroll.totalDeductions / payroll.grossPay;
    const maxDeductionRatio = this.getConfigValue('maxDeductionRatio', 0.5);
    
    if (deductionRatio > maxDeductionRatio) {
      results.push(this.createFailureResult(
        `扣除比例 ${(deductionRatio * 100).toFixed(1)}% 超过限制 ${(maxDeductionRatio * 100).toFixed(1)}%`,
        'warning',
        ['检查扣除项目是否正确', '确认是否有预扣款项目']
      ));
    }

    // 如果有任何失败，返回第一个失败结果
    const failures = results.filter(r => !r.passed);
    if (failures.length > 0) {
      return failures[0];
    }

    return this.createSuccessResult('薪资金额验证通过');
  }
}

/**
 * 员工状态验证规则
 */
export class EmployeeStatusValidationRule extends BaseBusinessRule {
  constructor() {
    super(
      'employee-status-validation',
      '员工状态验证',
      '验证员工状态是否允许发放薪资',
      95,
      ['PayrollEnhanced'],
      ['create', 'update']
    );
  }

  protected async executeCore(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const payroll = context.entity as PayrollEnhanced;
    const employee = context.contextData?.employee as EmployeeEnhanced;

    if (!employee) {
      return this.createFailureResult(
        `未找到员工信息: ${payroll.employeeId}`,
        'error',
        ['确认员工ID是否正确', '检查员工是否仍在职']
      );
    }

    // 检查员工状态
    const validStatuses = this.getConfigValue('validEmployeeStatuses', ['active', 'probation']);
    if (!validStatuses.includes(employee.employmentStatus)) {
      return this.createFailureResult(
        `员工状态 "${employee.employmentStatus}" 不允许发放薪资`,
        'error',
        ['确认员工当前状态', '如需发放需要特殊审批'],
        { currentStatus: employee.employmentStatus, validStatuses }
      );
    }

    // 检查薪资周期是否在员工入职后
    if (employee.hireDate && payroll.payPeriodStart < employee.hireDate) {
      return this.createFailureResult(
        `薪资周期开始日期 ${payroll.payPeriodStart.toLocaleDateString()} 早于员工入职日期 ${employee.hireDate.toLocaleDateString()}`,
        'error',
        ['调整薪资周期', '确认入职日期是否正确']
      );
    }

    // 检查薪资周期是否在员工离职前（如果已离职）
    if (employee.terminationDate && payroll.payPeriodEnd > employee.terminationDate) {
      return this.createFailureResult(
        `薪资周期结束日期 ${payroll.payPeriodEnd.toLocaleDateString()} 晚于员工离职日期 ${employee.terminationDate.toLocaleDateString()}`,
        'warning',
        ['调整薪资周期', '确认是否为离职补偿', '可能需要特殊审批']
      );
    }

    return this.createSuccessResult('员工状态验证通过');
  }
}

/**
 * 薪资组件验证规则
 */
export class PayrollComponentValidationRule extends BaseBusinessRule {
  constructor() {
    super(
      'payroll-component-validation',
      '薪资组件验证',
      '验证薪资组件的完整性和准确性',
      80,
      ['PayrollEnhanced'],
      ['create', 'update']
    );
  }

  protected async executeCore(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const payroll = context.entity as PayrollEnhanced;
    
    if (!payroll.salaryComponents || payroll.salaryComponents.length === 0) {
      return this.createFailureResult(
        '薪资组件不能为空',
        'error',
        ['添加基本工资组件', '确认薪资结构配置']
      );
    }

    const results: BusinessRuleResult[] = [];

    // 检查是否有基本工资组件
    const hasBasicSalary = payroll.salaryComponents.some(component => 
      component.type === 'basic_salary' || component.type === 'base_salary'
    );

    if (!hasBasicSalary) {
      results.push(this.createFailureResult(
        '缺少基本工资组件',
        'error',
        ['添加基本工资组件', '检查薪资结构配置']
      ));
    }

    // 检查组件金额总和是否与应发工资一致
    const componentTotal = payroll.salaryComponents.reduce((sum, component) => {
      return component.isDeduction ? sum - component.amount : sum + component.amount;
    }, 0);

    const tolerance = this.getConfigValue('amountTolerance', 0.01);
    if (Math.abs(componentTotal - payroll.grossPay) > tolerance) {
      results.push(this.createFailureResult(
        `薪资组件总和 ${componentTotal} 与应发工资 ${payroll.grossPay} 不一致，差额: ${Math.abs(componentTotal - payroll.grossPay)}`,
        'error',
        ['重新计算薪资组件', '检查计算公式', '确认扣除项目设置']
      ));
    }

    // 检查重复组件
    const componentTypes = payroll.salaryComponents.map(c => c.type);
    const uniqueTypes = new Set(componentTypes);
    if (componentTypes.length !== uniqueTypes.size) {
      const duplicates = componentTypes.filter((type, index) => componentTypes.indexOf(type) !== index);
      results.push(this.createFailureResult(
        `存在重复的薪资组件类型: ${[...new Set(duplicates)].join(', ')}`,
        'warning',
        ['合并重复组件', '检查薪资结构配置']
      ));
    }

    // 检查负数组件（除扣除项目外）
    const negativeComponents = payroll.salaryComponents.filter(c => !c.isDeduction && c.amount < 0);
    if (negativeComponents.length > 0) {
      results.push(this.createFailureResult(
        `发现负数的非扣除组件: ${negativeComponents.map(c => c.name).join(', ')}`,
        'warning',
        ['确认组件是否应该为扣除项目', '检查计算逻辑']
      ));
    }

    // 如果有任何失败，返回第一个失败结果
    const failures = results.filter(r => !r.passed);
    if (failures.length > 0) {
      return failures[0];
    }

    return this.createSuccessResult('薪资组件验证通过');
  }
}

/**
 * 薪资周期验证规则
 */
export class PayrollPeriodValidationRule extends BaseBusinessRule {
  constructor() {
    super(
      'payroll-period-validation',
      '薪资周期验证',
      '验证薪资周期的合理性和一致性',
      85,
      ['PayrollEnhanced'],
      ['create', 'update']
    );
  }

  protected async executeCore(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const payroll = context.entity as PayrollEnhanced;

    // 检查必需的日期字段
    const missingProps = this.validateRequiredProperties(payroll, ['payPeriodStart', 'payPeriodEnd', 'payDate']);
    if (missingProps.length > 0) {
      return this.createFailureResult(
        `缺少必需的日期字段: ${missingProps.join(', ')}`,
        'error'
      );
    }

    const results: BusinessRuleResult[] = [];

    // 检查薪资周期开始日期不能晚于结束日期
    if (payroll.payPeriodStart >= payroll.payPeriodEnd) {
      results.push(this.createFailureResult(
        `薪资周期开始日期 ${payroll.payPeriodStart.toLocaleDateString()} 不能晚于或等于结束日期 ${payroll.payPeriodEnd.toLocaleDateString()}`,
        'error',
        ['调整薪资周期日期', '确认日期设置是否正确']
      ));
    }

    // 检查薪资周期长度
    const periodDays = Math.ceil((payroll.payPeriodEnd.getTime() - payroll.payPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
    const minPeriodDays = this.getConfigValue('minPeriodDays', 1);
    const maxPeriodDays = this.getConfigValue('maxPeriodDays', 31);

    if (periodDays < minPeriodDays) {
      results.push(this.createFailureResult(
        `薪资周期 ${periodDays} 天少于最小限制 ${minPeriodDays} 天`,
        'warning',
        ['确认是否为特殊薪资周期', '调整周期长度']
      ));
    }

    if (periodDays > maxPeriodDays) {
      results.push(this.createFailureResult(
        `薪资周期 ${periodDays} 天超过最大限制 ${maxPeriodDays} 天`,
        'warning',
        ['分割长周期为多个短周期', '确认是否为特殊情况']
      ));
    }

    // 检查发薪日期
    const payDateAfterPeriod = this.getConfigValue('payDateAfterPeriod', true);
    if (payDateAfterPeriod && payroll.payDate < payroll.payPeriodEnd) {
      results.push(this.createFailureResult(
        `发薪日期 ${payroll.payDate.toLocaleDateString()} 早于薪资周期结束日期 ${payroll.payPeriodEnd.toLocaleDateString()}`,
        'warning',
        ['调整发薪日期', '确认是否为预付薪资']
      ));
    }

    // 检查发薪日期不能太晚
    const maxDaysAfterPeriod = this.getConfigValue('maxDaysAfterPeriodEnd', 30);
    const daysAfterPeriod = Math.ceil((payroll.payDate.getTime() - payroll.payPeriodEnd.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysAfterPeriod > maxDaysAfterPeriod) {
      results.push(this.createFailureResult(
        `发薪日期距离薪资周期结束 ${daysAfterPeriod} 天，超过限制 ${maxDaysAfterPeriod} 天`,
        'warning',
        ['尽快安排发薪', '确认是否有特殊原因延迟']
      ));
    }

    // 检查未来日期
    const now = new Date();
    const allowFuturePay = this.getConfigValue('allowFuturePay', false);
    
    if (!allowFuturePay && payroll.payDate > now) {
      results.push(this.createFailureResult(
        `发薪日期 ${payroll.payDate.toLocaleDateString()} 为未来日期`,
        'warning',
        ['调整为当前或历史日期', '如需预设请启用未来发薪配置']
      ));
    }

    // 如果有任何失败，返回第一个失败结果
    const failures = results.filter(r => !r.passed);
    if (failures.length > 0) {
      return failures[0];
    }

    return this.createSuccessResult('薪资周期验证通过');
  }
}

/**
 * 薪资审批状态验证规则
 */
export class PayrollApprovalValidationRule extends BaseBusinessRule {
  constructor() {
    super(
      'payroll-approval-validation',
      '薪资审批状态验证',
      '验证薪资审批流程的合规性',
      70,
      ['PayrollEnhanced'],
      ['update']
    );
  }

  protected checkCustomConditions(context: BusinessRuleContext): boolean {
    // 只对涉及审批状态变更的操作执行此规则
    const payroll = context.entity as PayrollEnhanced;
    return payroll.approvalStatus !== undefined;
  }

  protected async executeCore(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const payroll = context.entity as PayrollEnhanced;
    const currentUser = context.user;

    if (!currentUser) {
      return this.createFailureResult(
        '无法确定当前用户身份',
        'error',
        ['请重新登录', '确认用户权限']
      );
    }

    // 检查用户是否有审批权限
    const requiredPermissions = this.getConfigValue('approvalPermissions', ['payroll:approve']);
    const hasPermission = requiredPermissions.some(permission => 
      currentUser.permissions.includes(permission)
    );

    if (!hasPermission) {
      return this.createFailureResult(
        `用户 ${currentUser.id} 没有薪资审批权限`,
        'error',
        ['联系管理员获取权限', '请有权限的用户进行审批']
      );
    }

    // 检查审批状态转换的合法性
    const currentStatus = context.contextData?.currentApprovalStatus || 'draft';
    const newStatus = payroll.approvalStatus;

    const validTransitions = this.getConfigValue('validStatusTransitions', {
      'draft': ['submitted', 'cancelled'],
      'submitted': ['approved', 'rejected', 'returned'],
      'returned': ['submitted', 'cancelled'],
      'approved': ['paid'],
      'rejected': ['submitted'],
      'paid': []
    });

    const allowedTransitions = validTransitions[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return this.createFailureResult(
        `不允许从状态 "${currentStatus}" 转换到 "${newStatus}"`,
        'error',
        [`允许的状态转换: ${allowedTransitions.join(', ')}`, '检查审批流程配置']
      );
    }

    // 检查审批金额限制
    if (newStatus === 'approved') {
      const userApprovalLimit = this.getConfigValue('userApprovalLimits', {})[currentUser.role] || 0;
      if (payroll.grossPay > userApprovalLimit) {
        return this.createFailureResult(
          `薪资金额 ${payroll.grossPay} 超过用户审批限额 ${userApprovalLimit}`,
          'error',
          ['需要更高级别审批', '分解为多笔审批', '联系高级审批者']
        );
      }
    }

    return this.createSuccessResult(`审批状态验证通过: ${currentStatus} -> ${newStatus}`);
  }
}