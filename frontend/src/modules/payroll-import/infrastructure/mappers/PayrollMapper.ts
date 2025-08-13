/**
 * Payroll数据映射器
 * 
 * 负责在Payroll Domain实体和Supabase数据库记录之间进行转换
 */

import { IDataMapper } from '../../../../shared/infrastructure/repositories/SupabaseRepositoryBase';
import { Payroll, PayrollStatus, PayrollComponent, PayrollComponentType } from '../../domain/entities/Payroll';
import type { Database } from '@/types/supabase';

type PayrollRow = Database['public']['Tables']['payrolls']['Row'];
type PayrollInsert = Database['public']['Tables']['payrolls']['Insert'];
type PayrollUpdate = Database['public']['Tables']['payrolls']['Update'];

/**
 * Payroll映射器实现
 */
export class PayrollMapper implements IDataMapper<Payroll, PayrollRow> {
  
  /**
   * 从数据库行转换为Domain实体
   */
  toDomain(row: PayrollRow): Payroll {
    const payroll = new Payroll(
      row.employee_id,
      new Date(row.pay_period_start),
      new Date(row.pay_period_end),
      new Date(row.pay_date),
      this.mapPayrollStatus(row.status),
      row.id
    );

    // 设置可选属性
    if (row.notes) {
      payroll.setNotes(row.notes);
    }

    // 设置计算结果（从数据库缓存的值）
    (payroll as any)._grossPay = row.gross_pay;
    (payroll as any)._netPay = row.net_pay;
    (payroll as any)._totalDeductions = row.total_deductions;

    // 设置审计字段
    this.setAuditFields(payroll, row);

    return payroll;
  }

  /**
   * 从Domain实体转换为数据库插入对象
   */
  toInsert(entity: Payroll): PayrollInsert {
    return {
      id: entity.id,
      employee_id: entity.employeeId,
      pay_period_start: entity.payPeriodStart.toISOString().split('T')[0],
      pay_period_end: entity.payPeriodEnd.toISOString().split('T')[0],
      pay_date: entity.payDate.toISOString().split('T')[0],
      status: this.mapPayrollStatusToDb(entity.status),
      notes: entity.notes || null,
      gross_pay: entity.grossPay,
      net_pay: entity.netPay,
      total_deductions: entity.totalDeductions,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString()
    };
  }

  /**
   * 从Domain实体转换为数据库更新对象
   */
  toUpdate(entity: Payroll): PayrollUpdate {
    return {
      employee_id: entity.employeeId,
      pay_period_start: entity.payPeriodStart.toISOString().split('T')[0],
      pay_period_end: entity.payPeriodEnd.toISOString().split('T')[0],
      pay_date: entity.payDate.toISOString().split('T')[0],
      status: this.mapPayrollStatusToDb(entity.status),
      notes: entity.notes || null,
      gross_pay: entity.grossPay,
      net_pay: entity.netPay,
      total_deductions: entity.totalDeductions,
      updated_at: entity.updatedAt.toISOString()
    };
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 映射数据库薪资状态到Domain枚举
   */
  private mapPayrollStatus(dbStatus: string): PayrollStatus {
    switch (dbStatus.toLowerCase()) {
      case 'draft':
        return PayrollStatus.DRAFT;
      case 'pending':
        return PayrollStatus.PENDING;
      case 'approved':
        return PayrollStatus.APPROVED;
      case 'paid':
        return PayrollStatus.PAID;
      case 'cancelled':
        return PayrollStatus.CANCELLED;
      default:
        return PayrollStatus.DRAFT; // 默认值
    }
  }

  /**
   * 映射Domain薪资状态到数据库值
   */
  private mapPayrollStatusToDb(status: PayrollStatus): string {
    return status.toString();
  }

  /**
   * 设置审计字段
   */
  private setAuditFields(payroll: Payroll, row: PayrollRow): void {
    // 由于BaseEntity的字段是protected，我们需要通过类型断言来设置
    const entity = payroll as any;
    entity._createdAt = new Date(row.created_at);
    entity._updatedAt = new Date(row.updated_at);
  }
}

/**
 * 薪资组件映射器
 * 处理薪资组件与数据库记录的转换
 */
export class PayrollComponentMapper {
  
  /**
   * 从数据库行转换为薪资组件
   */
  static fromDatabaseRow(row: any): PayrollComponent {
    return {
      id: row.id,
      type: this.mapComponentType(row.component_type),
      name: row.component_name,
      amount: parseFloat(row.amount) || 0,
      isDeduction: row.is_deduction || false,
      isStatutory: row.is_statutory || false,
      description: row.description || undefined,
      calculationBasis: row.calculation_basis ? parseFloat(row.calculation_basis) : undefined,
      rate: row.rate ? parseFloat(row.rate) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }

  /**
   * 转换为数据库插入对象
   */
  static toDatabaseInsert(component: PayrollComponent, payrollId: string): any {
    return {
      id: component.id,
      payroll_id: payrollId,
      component_type: this.mapComponentTypeToDb(component.type),
      component_name: component.name,
      amount: component.amount,
      is_deduction: component.isDeduction,
      is_statutory: component.isStatutory,
      description: component.description || null,
      calculation_basis: component.calculationBasis || null,
      rate: component.rate || null,
      metadata: component.metadata ? JSON.stringify(component.metadata) : null
    };
  }

  /**
   * 映射组件类型
   */
  private static mapComponentType(dbType: string): PayrollComponentType {
    switch (dbType.toLowerCase()) {
      case 'basic_salary':
        return PayrollComponentType.BASIC_SALARY;
      case 'overtime':
        return PayrollComponentType.OVERTIME;
      case 'bonus':
        return PayrollComponentType.BONUS;
      case 'allowance':
        return PayrollComponentType.ALLOWANCE;
      case 'commission':
        return PayrollComponentType.COMMISSION;
      case 'social_insurance':
        return PayrollComponentType.SOCIAL_INSURANCE;
      case 'housing_fund':
        return PayrollComponentType.HOUSING_FUND;
      case 'tax':
        return PayrollComponentType.TAX;
      case 'other_deduction':
        return PayrollComponentType.OTHER_DEDUCTION;
      default:
        return PayrollComponentType.BASIC_SALARY;
    }
  }

  /**
   * 映射组件类型到数据库值
   */
  private static mapComponentTypeToDb(type: PayrollComponentType): string {
    return type.toString();
  }
}

/**
 * 薪资详情映射器
 * 用于处理包含员工信息、部门信息等的复杂查询结果
 */
export class PayrollWithDetailsMapper {
  
  /**
   * 从薪资详情视图转换为Domain实体
   */
  static fromPayrollView(viewData: any): Payroll {
    const mapper = new PayrollMapper();
    
    // 首先创建基础薪资实体
    const payroll = mapper.toDomain({
      id: viewData.payroll_id,
      employee_id: viewData.employee_id,
      pay_period_start: viewData.pay_period_start,
      pay_period_end: viewData.pay_period_end,
      pay_date: viewData.pay_date,
      status: viewData.status,
      notes: viewData.notes,
      gross_pay: viewData.gross_pay,
      net_pay: viewData.net_pay,
      total_deductions: viewData.total_deductions,
      created_at: viewData.created_at,
      updated_at: viewData.updated_at
    });

    // 可以添加额外的信息到元数据中
    (payroll as any)._employeeName = viewData.employee_name;
    (payroll as any)._departmentName = viewData.department_name;
    (payroll as any)._positionName = viewData.position_name;

    return payroll;
  }
}

/**
 * 批量导入薪资数据映射器
 * 专门处理Excel导入时的薪资数据转换
 */
export class PayrollImportMapper {
  
  /**
   * 从Excel行数据创建Payroll实体
   */
  static fromExcelRow(excelRow: Record<string, any>, employeeId: string): Payroll {
    // 解析薪资期间
    const payPeriodStart = this.parseDate(excelRow['薪资期间开始'] || excelRow['pay_period_start']);
    const payPeriodEnd = this.parseDate(excelRow['薪资期间结束'] || excelRow['pay_period_end']);
    const payDate = this.parseDate(excelRow['发薪日期'] || excelRow['pay_date']);

    if (!payPeriodStart || !payPeriodEnd || !payDate) {
      throw new Error(`薪资期间信息缺失: 开始=${payPeriodStart}, 结束=${payPeriodEnd}, 发薪=${payDate}`);
    }

    const payroll = new Payroll(
      employeeId,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      PayrollStatus.DRAFT
    );

    // 解析薪资组件
    const components = this.parsePayrollComponents(excelRow);
    if (components.length > 0) {
      payroll.setComponents(components);
    }

    // 设置备注
    const notes = this.cleanString(excelRow['备注'] || excelRow['notes']);
    if (notes) {
      payroll.setNotes(notes);
    }

    return payroll;
  }

  /**
   * 解析薪资组件
   */
  private static parsePayrollComponents(excelRow: Record<string, any>): Omit<PayrollComponent, 'id'>[] {
    const components: Omit<PayrollComponent, 'id'>[] = [];

    // 基本工资
    const basicSalary = this.parseAmount(excelRow['基本工资'] || excelRow['basic_salary']);
    if (basicSalary > 0) {
      components.push({
        type: PayrollComponentType.BASIC_SALARY,
        name: '基本工资',
        amount: basicSalary,
        isDeduction: false,
        isStatutory: false
      });
    }

    // 加班费
    const overtime = this.parseAmount(excelRow['加班费'] || excelRow['overtime']);
    if (overtime > 0) {
      components.push({
        type: PayrollComponentType.OVERTIME,
        name: '加班费',
        amount: overtime,
        isDeduction: false,
        isStatutory: false
      });
    }

    // 奖金
    const bonus = this.parseAmount(excelRow['奖金'] || excelRow['bonus']);
    if (bonus > 0) {
      components.push({
        type: PayrollComponentType.BONUS,
        name: '奖金',
        amount: bonus,
        isDeduction: false,
        isStatutory: false
      });
    }

    // 津贴
    const allowance = this.parseAmount(excelRow['津贴'] || excelRow['allowance']);
    if (allowance > 0) {
      components.push({
        type: PayrollComponentType.ALLOWANCE,
        name: '津贴',
        amount: allowance,
        isDeduction: false,
        isStatutory: false
      });
    }

    // 社保（个人部分）
    const socialInsurance = this.parseAmount(excelRow['社保个人'] || excelRow['social_insurance']);
    if (socialInsurance > 0) {
      components.push({
        type: PayrollComponentType.SOCIAL_INSURANCE,
        name: '社保（个人）',
        amount: socialInsurance,
        isDeduction: true,
        isStatutory: true
      });
    }

    // 公积金（个人部分）
    const housingFund = this.parseAmount(excelRow['公积金个人'] || excelRow['housing_fund']);
    if (housingFund > 0) {
      components.push({
        type: PayrollComponentType.HOUSING_FUND,
        name: '公积金（个人）',
        amount: housingFund,
        isDeduction: true,
        isStatutory: true
      });
    }

    // 个人所得税
    const tax = this.parseAmount(excelRow['个人所得税'] || excelRow['tax']);
    if (tax > 0) {
      components.push({
        type: PayrollComponentType.TAX,
        name: '个人所得税',
        amount: tax,
        isDeduction: true,
        isStatutory: true
      });
    }

    // 其他扣除
    const otherDeduction = this.parseAmount(excelRow['其他扣除'] || excelRow['other_deduction']);
    if (otherDeduction > 0) {
      components.push({
        type: PayrollComponentType.OTHER_DEDUCTION,
        name: '其他扣除',
        amount: otherDeduction,
        isDeduction: true,
        isStatutory: false
      });
    }

    return components;
  }

  /**
   * 解析金额
   */
  private static parseAmount(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    if (typeof value === 'number') {
      return Math.max(0, value);
    }

    if (typeof value === 'string') {
      // 移除千分位分隔符和货币符号
      const cleaned = value.replace(/[,￥$]/g, '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }

    return 0;
  }

  /**
   * 解析日期
   */
  private static parseDate(value: any): Date | null {
    if (!value) return null;
    
    // 处理Excel日期格式
    if (typeof value === 'number') {
      // Excel日期序列号
      const excelDate = new Date((value - 25569) * 86400 * 1000);
      return isNaN(excelDate.getTime()) ? null : excelDate;
    }
    
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    
    return null;
  }

  /**
   * 清理字符串数据
   */
  private static cleanString(value: any): string | null {
    if (value === null || value === undefined) return null;
    
    const cleaned = String(value).trim();
    return cleaned === '' ? null : cleaned;
  }
}