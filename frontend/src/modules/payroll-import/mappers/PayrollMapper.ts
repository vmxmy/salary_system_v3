/**
 * 薪资实体与DTO映射器
 * 
 * 处理Payroll领域实体与PayrollDto之间的转换
 */

import { BaseMapper, Mapper, MapperUtils, MapperValidator } from '../../../shared/mappers/BaseMapper';
import { PayrollEnhanced, PayrollStatus, PayrollComponentType } from '../domain/entities/PayrollEnhanced';
import { 
  PayrollDto, 
  PayrollDtoStatus, 
  PayrollComponentDtoType,
  PayrollComponentDto,
  CreatePayrollDto,
  UpdatePayrollDto,
  PayrollDetailDto,
  BatchCreatePayrollDto
} from '../dto/PayrollDto';

/**
 * 薪资映射器
 */
@Mapper('payroll')
export class PayrollMapper extends BaseMapper<PayrollEnhanced, PayrollDto> {

  /**
   * 从薪资实体转换为DTO
   */
  toDto(payroll: PayrollEnhanced): PayrollDto {
    MapperValidator.validateRequired(payroll, ['id', 'employeeId', 'payPeriodStart', 'payPeriodEnd'], 'Payroll');

    return {
      ...this.mapBaseDtoProperties(payroll),
      employeeId: payroll.employeeId,
      employeeName: payroll.employee?.employeeName,
      employeeNumber: payroll.employee?.employeeNumber,
      departmentName: payroll.employee?.department?.name,
      positionName: payroll.employee?.position?.name,
      payPeriodStart: this.dateToString(payroll.payPeriodStart)!,
      payPeriodEnd: this.dateToString(payroll.payPeriodEnd)!,
      payDate: this.dateToString(payroll.payDate)!,
      status: this.mapPayrollStatusToDto(payroll.status),
      grossPay: payroll.grossPay,
      netPay: payroll.netPay,
      totalDeductions: payroll.totalDeductions,
      components: this.mapComponentsToDto(payroll.components),
      workDays: payroll.workDays,
      overtimeHours: payroll.overtimeHours,
      remarks: payroll.remarks,
      auditInfo: this.mapAuditInfo(payroll)
    };
  }

  /**
   * 从DTO转换为薪资实体
   */
  toDomain(dto: PayrollDto): PayrollEnhanced {
    MapperValidator.validateRequired(dto, ['employeeId', 'payPeriodStart', 'payPeriodEnd', 'payDate'], 'PayrollDto');

    const payroll = new PayrollEnhanced(
      dto.employeeId,
      this.stringToDate(dto.payPeriodStart)!,
      this.stringToDate(dto.payPeriodEnd)!,
      this.stringToDate(dto.payDate)!,
      this.mapPayrollStatusFromDto(dto.status),
      dto.id
    );

    // 设置组件
    if (dto.components && dto.components.length > 0) {
      payroll.setComponents(this.mapComponentsFromDto(dto.components));
    }

    // 设置可选属性
    if (dto.workDays !== undefined) {
      payroll.workDays = dto.workDays;
    }

    if (dto.overtimeHours !== undefined) {
      payroll.overtimeHours = dto.overtimeHours;
    }

    if (dto.remarks !== undefined) {
      payroll.remarks = dto.remarks;
    }

    return payroll;
  }

  /**
   * 从创建DTO转换为薪资实体
   */
  fromCreateDto(dto: CreatePayrollDto): PayrollEnhanced {
    MapperValidator.validateRequired(dto, ['employeeId', 'payPeriodStart', 'payPeriodEnd', 'payDate'], 'CreatePayrollDto');

    const payroll = new PayrollEnhanced(
      dto.employeeId,
      this.stringToDate(dto.payPeriodStart)!,
      this.stringToDate(dto.payPeriodEnd)!,
      this.stringToDate(dto.payDate)!,
      PayrollStatus.DRAFT
    );

    if (dto.components && dto.components.length > 0) {
      payroll.setComponents(this.mapComponentsFromDto(dto.components));
    }

    if (dto.workDays !== undefined) {
      payroll.workDays = dto.workDays;
    }

    if (dto.overtimeHours !== undefined) {
      payroll.overtimeHours = dto.overtimeHours;
    }

    if (dto.remarks !== undefined) {
      payroll.remarks = dto.remarks;
    }

    return payroll;
  }

  /**
   * 应用更新DTO到薪资实体
   */
  applyUpdateDto(payroll: PayrollEnhanced, dto: UpdatePayrollDto): void {
    if (dto.payDate !== undefined) {
      payroll.payDate = this.stringToDate(dto.payDate)!;
    }

    if (dto.status !== undefined) {
      payroll.status = this.mapPayrollStatusFromDto(dto.status);
    }

    if (dto.components !== undefined) {
      payroll.setComponents(this.mapComponentsFromDto(dto.components));
    }

    if (dto.workDays !== undefined) {
      payroll.workDays = dto.workDays;
    }

    if (dto.overtimeHours !== undefined) {
      payroll.overtimeHours = dto.overtimeHours;
    }

    if (dto.remarks !== undefined) {
      payroll.remarks = dto.remarks;
    }
  }

  /**
   * 转换为详情DTO
   */
  toDetailDto(payroll: PayrollEnhanced): PayrollDetailDto {
    const baseDto = this.toDto(payroll);

    return {
      ...baseDto,
      employee: {
        employeeName: payroll.employee?.employeeName || '',
        employeeNumber: payroll.employee?.employeeNumber,
        department: payroll.employee?.department?.name || '',
        position: payroll.employee?.position?.name || '',
        baseSalary: payroll.employee?.baseSalary || 0,
        hireDate: this.dateToString(payroll.employee?.hireDate) || ''
      },
      calculationDetails: this.mapCalculationDetails(payroll),
      historicalComparison: this.mapHistoricalComparison(payroll)
    };
  }

  /**
   * 从批量创建DTO转换为薪资实体列表
   */
  fromBatchCreateDto(dto: BatchCreatePayrollDto): PayrollEnhanced[] {
    MapperValidator.validateRequired(dto, ['payPeriodStart', 'payPeriodEnd', 'payDate', 'targetEmployees'], 'BatchCreatePayrollDto');
    MapperValidator.validateNonEmptyArray(dto.targetEmployees, 'targetEmployees');

    const payPeriodStart = this.stringToDate(dto.payPeriodStart)!;
    const payPeriodEnd = this.stringToDate(dto.payPeriodEnd)!;
    const payDate = this.stringToDate(dto.payDate)!;

    return dto.targetEmployees.map(target => {
      const payroll = new PayrollEnhanced(
        target.employeeId,
        payPeriodStart,
        payPeriodEnd,
        payDate,
        PayrollStatus.DRAFT
      );

      // 合并通用组件和个人组件
      const allComponents = [
        ...(dto.commonComponents || []),
        ...(target.additionalComponents || [])
      ];

      if (allComponents.length > 0) {
        payroll.setComponents(this.mapComponentsFromDto(allComponents));
      }

      if (target.workDays !== undefined) {
        payroll.workDays = target.workDays;
      }

      if (target.overtimeHours !== undefined) {
        payroll.overtimeHours = target.overtimeHours;
      }

      return payroll;
    });
  }

  // ==================== 私有映射方法 ====================

  private mapPayrollStatusToDto(status: PayrollStatus): PayrollDtoStatus {
    return MapperUtils.mapEnum(status, {
      [PayrollStatus.DRAFT]: PayrollDtoStatus.DRAFT,
      [PayrollStatus.PENDING_REVIEW]: PayrollDtoStatus.PENDING_REVIEW,
      [PayrollStatus.APPROVED]: PayrollDtoStatus.APPROVED,
      [PayrollStatus.PROCESSING]: PayrollDtoStatus.PROCESSING,
      [PayrollStatus.PAID]: PayrollDtoStatus.PAID,
      [PayrollStatus.CANCELLED]: PayrollDtoStatus.CANCELLED,
      [PayrollStatus.FAILED]: PayrollDtoStatus.FAILED
    });
  }

  private mapPayrollStatusFromDto(status: PayrollDtoStatus): PayrollStatus {
    return MapperUtils.mapEnum(status, {
      [PayrollDtoStatus.DRAFT]: PayrollStatus.DRAFT,
      [PayrollDtoStatus.PENDING_REVIEW]: PayrollStatus.PENDING_REVIEW,
      [PayrollDtoStatus.APPROVED]: PayrollStatus.APPROVED,
      [PayrollDtoStatus.PROCESSING]: PayrollStatus.PROCESSING,
      [PayrollDtoStatus.PAID]: PayrollStatus.PAID,
      [PayrollDtoStatus.CANCELLED]: PayrollStatus.CANCELLED,
      [PayrollDtoStatus.FAILED]: PayrollStatus.FAILED
    });
  }

  private mapComponentTypeToDto(type: PayrollComponentType): PayrollComponentDtoType {
    return MapperUtils.mapEnum(type, {
      [PayrollComponentType.BASIC_SALARY]: PayrollComponentDtoType.BASIC_SALARY,
      [PayrollComponentType.OVERTIME]: PayrollComponentDtoType.OVERTIME,
      [PayrollComponentType.BONUS]: PayrollComponentDtoType.BONUS,
      [PayrollComponentType.ALLOWANCE]: PayrollComponentDtoType.ALLOWANCE,
      [PayrollComponentType.COMMISSION]: PayrollComponentDtoType.COMMISSION,
      [PayrollComponentType.SOCIAL_INSURANCE]: PayrollComponentDtoType.SOCIAL_INSURANCE,
      [PayrollComponentType.HOUSING_FUND]: PayrollComponentDtoType.HOUSING_FUND,
      [PayrollComponentType.TAX]: PayrollComponentDtoType.TAX,
      [PayrollComponentType.OTHER_DEDUCTION]: PayrollComponentDtoType.OTHER_DEDUCTION
    });
  }

  private mapComponentTypeFromDto(type: PayrollComponentDtoType): PayrollComponentType {
    return MapperUtils.mapEnum(type, {
      [PayrollComponentDtoType.BASIC_SALARY]: PayrollComponentType.BASIC_SALARY,
      [PayrollComponentDtoType.OVERTIME]: PayrollComponentType.OVERTIME,
      [PayrollComponentDtoType.BONUS]: PayrollComponentType.BONUS,
      [PayrollComponentDtoType.ALLOWANCE]: PayrollComponentType.ALLOWANCE,
      [PayrollComponentDtoType.COMMISSION]: PayrollComponentType.COMMISSION,
      [PayrollComponentDtoType.SOCIAL_INSURANCE]: PayrollComponentType.SOCIAL_INSURANCE,
      [PayrollComponentDtoType.HOUSING_FUND]: PayrollComponentType.HOUSING_FUND,
      [PayrollComponentDtoType.TAX]: PayrollComponentType.TAX,
      [PayrollComponentDtoType.OTHER_DEDUCTION]: PayrollComponentType.OTHER_DEDUCTION
    });
  }

  private mapComponentsToDto(components: any[]): PayrollComponentDto[] {
    if (!components || components.length === 0) {
      return [];
    }

    return components.map(component => ({
      type: this.mapComponentTypeToDto(component.type),
      name: component.name,
      amount: component.amount,
      isDeduction: component.isDeduction,
      isStatutory: component.isStatutory,
      calculationBase: component.calculationBase,
      calculationRate: component.calculationRate,
      description: component.description,
      metadata: component.metadata
    }));
  }

  private mapComponentsFromDto(components: PayrollComponentDto[]): any[] {
    if (!components || components.length === 0) {
      return [];
    }

    return components.map(component => ({
      type: this.mapComponentTypeFromDto(component.type),
      name: component.name,
      amount: component.amount,
      isDeduction: component.isDeduction,
      isStatutory: component.isStatutory,
      calculationBase: component.calculationBase,
      calculationRate: component.calculationRate,
      description: component.description,
      metadata: component.metadata
    }));
  }

  private mapCalculationDetails(payroll: PayrollEnhanced): any[] {
    // 这里需要根据实际的计算明细结构来实现
    // 暂时返回基础的计算步骤
    const details: any[] = [];

    if (payroll.components && payroll.components.length > 0) {
      payroll.components.forEach((component, index) => {
        details.push({
          step: index + 1,
          description: `计算${component.name}`,
          formula: component.calculationRate ? 
            `${component.calculationBase} × ${component.calculationRate}%` : 
            undefined,
          baseAmount: component.calculationBase || 0,
          rate: component.calculationRate,
          result: component.amount
        });
      });
    }

    return details;
  }

  private mapHistoricalComparison(payroll: PayrollEnhanced): any {
    // 这里需要根据实际的历史数据来实现
    // 暂时返回空对象
    return undefined;
  }
}