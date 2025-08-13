/**
 * 薪资相关DTO接口定义
 * 
 * 定义薪资模块API传输的数据结构
 */

import { BaseDto, FilterDto, AuditInfoDto, StatisticsDto } from '../../../shared/dto/BaseDto';

/**
 * 薪资状态枚举
 */
export enum PayrollDtoStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

/**
 * 薪资组件类型枚举
 */
export enum PayrollComponentDtoType {
  BASIC_SALARY = 'basic_salary',
  OVERTIME = 'overtime',
  BONUS = 'bonus',
  ALLOWANCE = 'allowance',
  COMMISSION = 'commission',
  SOCIAL_INSURANCE = 'social_insurance',
  HOUSING_FUND = 'housing_fund',
  TAX = 'tax',
  OTHER_DEDUCTION = 'other_deduction'
}

/**
 * 薪资组件DTO
 */
export interface PayrollComponentDto {
  /** 组件类型 */
  type: PayrollComponentDtoType;
  /** 组件名称 */
  name: string;
  /** 金额 */
  amount: number;
  /** 是否为扣款项 */
  isDeduction: boolean;
  /** 是否为法定项目 */
  isStatutory: boolean;
  /** 计算基数 */
  calculationBase?: number;
  /** 计算比例 */
  calculationRate?: number;
  /** 描述 */
  description?: string;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 薪资记录DTO
 */
export interface PayrollDto extends BaseDto {
  /** 员工ID */
  employeeId: string;
  /** 员工姓名 */
  employeeName?: string;
  /** 员工编号 */
  employeeNumber?: string;
  /** 部门名称 */
  departmentName?: string;
  /** 职位名称 */
  positionName?: string;
  /** 薪资期间开始 */
  payPeriodStart: string;
  /** 薪资期间结束 */
  payPeriodEnd: string;
  /** 发薪日期 */
  payDate: string;
  /** 薪资状态 */
  status: PayrollDtoStatus;
  /** 应发工资 */
  grossPay: number;
  /** 实发工资 */
  netPay: number;
  /** 总扣款 */
  totalDeductions: number;
  /** 薪资组件列表 */
  components: PayrollComponentDto[];
  /** 工作天数 */
  workDays?: number;
  /** 加班小时数 */
  overtimeHours?: number;
  /** 备注 */
  remarks?: string;
  /** 审计信息 */
  auditInfo?: AuditInfoDto;
}

/**
 * 薪资创建请求DTO
 */
export interface CreatePayrollDto {
  /** 员工ID */
  employeeId: string;
  /** 薪资期间开始 */
  payPeriodStart: string;
  /** 薪资期间结束 */
  payPeriodEnd: string;
  /** 发薪日期 */
  payDate: string;
  /** 薪资组件列表 */
  components?: PayrollComponentDto[];
  /** 工作天数 */
  workDays?: number;
  /** 加班小时数 */
  overtimeHours?: number;
  /** 备注 */
  remarks?: string;
  /** 是否自动计算 */
  autoCalculate?: boolean;
}

/**
 * 薪资更新请求DTO
 */
export interface UpdatePayrollDto {
  /** 发薪日期 */
  payDate?: string;
  /** 薪资状态 */
  status?: PayrollDtoStatus;
  /** 薪资组件列表 */
  components?: PayrollComponentDto[];
  /** 工作天数 */
  workDays?: number;
  /** 加班小时数 */
  overtimeHours?: number;
  /** 备注 */
  remarks?: string;
  /** 更新原因 */
  updateReason?: string;
}

/**
 * 薪资查询过滤DTO
 */
export interface PayrollFilterDto extends FilterDto {
  /** 薪资状态过滤 */
  status?: PayrollDtoStatus[];
  /** 员工ID过滤 */
  employeeIds?: string[];
  /** 部门ID过滤 */
  departmentIds?: string[];
  /** 薪资期间过滤 */
  payPeriodRange?: {
    start?: string;
    end?: string;
  };
  /** 发薪日期过滤 */
  payDateRange?: {
    start?: string;
    end?: string;
  };
  /** 薪资金额范围 */
  salaryRange?: {
    min?: number;
    max?: number;
  };
  /** 包含组件类型 */
  includeComponentTypes?: PayrollComponentDtoType[];
  /** 排除组件类型 */
  excludeComponentTypes?: PayrollComponentDtoType[];
}

/**
 * 批量薪资创建请求DTO
 */
export interface BatchCreatePayrollDto {
  /** 薪资期间开始 */
  payPeriodStart: string;
  /** 薪资期间结束 */
  payPeriodEnd: string;
  /** 发薪日期 */
  payDate: string;
  /** 目标员工列表 */
  targetEmployees: Array<{
    employeeId: string;
    workDays?: number;
    overtimeHours?: number;
    additionalComponents?: PayrollComponentDto[];
  }>;
  /** 通用薪资组件 */
  commonComponents?: PayrollComponentDto[];
  /** 批次描述 */
  description?: string;
  /** 是否自动计算 */
  autoCalculate?: boolean;
  /** 批处理选项 */
  options?: {
    skipExisting?: boolean;
    continueOnError?: boolean;
  };
}

/**
 * 批量薪资创建响应DTO
 */
export interface BatchCreatePayrollResponseDto {
  /** 成功创建的薪资记录 */
  successItems: PayrollDto[];
  /** 失败的项目 */
  failedItems: Array<{
    employeeId: string;
    employeeName: string;
    error: string;
  }>;
  /** 统计信息 */
  statistics: {
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
 * 薪资详情DTO
 */
export interface PayrollDetailDto extends PayrollDto {
  /** 员工详细信息 */
  employee: {
    employeeName: string;
    employeeNumber?: string;
    department: string;
    position: string;
    baseSalary: number;
    hireDate: string;
  };
  /** 计算明细 */
  calculationDetails: Array<{
    step: number;
    description: string;
    formula?: string;
    baseAmount: number;
    rate?: number;
    result: number;
  }>;
  /** 历史比较 */
  historicalComparison?: {
    previousPeriod?: {
      payPeriod: string;
      grossPay: number;
      netPay: number;
      variance: number;
      variancePercentage: number;
    };
    yearToDate?: {
      totalGrossPay: number;
      totalNetPay: number;
      totalTax: number;
      averageMonthlyPay: number;
    };
  };
}

/**
 * 薪资统计DTO
 */
export interface PayrollStatisticsDto {
  /** 统计期间 */
  period: {
    start: string;
    end: string;
  };
  /** 员工统计 */
  employeeStats: {
    totalEmployees: number;
    paidEmployees: number;
    pendingEmployees: number;
    averageSalary: number;
  };
  /** 金额统计 */
  amountStats: {
    totalGrossPay: number;
    totalNetPay: number;
    totalDeductions: number;
    totalTax: number;
    highestPay: number;
    lowestPay: number;
  };
  /** 组件统计 */
  componentStats: Array<{
    componentType: PayrollComponentDtoType;
    totalAmount: number;
    employeeCount: number;
    averageAmount: number;
    percentage: number;
  }>;
  /** 部门统计 */
  departmentStats: Array<{
    departmentId: string;
    departmentName: string;
    employeeCount: number;
    totalAmount: number;
    averageAmount: number;
    percentage: number;
  }>;
  /** 趋势数据 */
  trends?: Array<{
    period: string;
    totalGrossPay: number;
    totalNetPay: number;
    employeeCount: number;
  }>;
}

/**
 * 薪资审批请求DTO
 */
export interface PayrollApprovalDto {
  /** 薪资记录ID列表 */
  payrollIds: string[];
  /** 审批动作 */
  action: 'approve' | 'reject';
  /** 审批意见 */
  comments?: string;
  /** 审批级别 */
  approvalLevel?: string;
}

/**
 * 薪资发放请求DTO
 */
export interface PayrollPaymentDto {
  /** 薪资记录ID列表 */
  payrollIds: string[];
  /** 发放方式 */
  paymentMethod: 'bank_transfer' | 'cash' | 'check';
  /** 发放批次号 */
  batchNumber?: string;
  /** 银行信息（银行转账时） */
  bankInfo?: {
    bankName: string;
    bankAccount: string;
    accountHolder: string;
  };
  /** 发放选项 */
  options?: {
    sendNotification?: boolean;
    generateReceipt?: boolean;
  };
}

/**
 * 薪资计算配置DTO
 */
export interface PayrollCalculationConfigDto {
  /** 基本薪资计算规则 */
  basicSalaryRules: {
    monthlyWorkDays: number;
    overtimeRate: number;
    weekendOvertimeRate: number;
    holidayOvertimeRate: number;
  };
  /** 社保配置 */
  socialInsuranceConfig: {
    employeeRate: number;
    employerRate: number;
    baseAmount: number;
    capAmount: number;
  };
  /** 公积金配置 */
  housingFundConfig: {
    employeeRate: number;
    employerRate: number;
    baseAmount: number;
    capAmount: number;
  };
  /** 个税配置 */
  taxConfig: {
    taxBrackets: Array<{
      min: number;
      max: number;
      rate: number;
      deduction: number;
    }>;
    monthlyDeduction: number;
    additionalDeductions?: number;
  };
}

/**
 * 薪资导入预览DTO
 */
export interface PayrollImportPreviewDto {
  /** 行号 */
  rowNumber: number;
  /** 薪资数据 */
  data: CreatePayrollDto;
  /** 验证结果 */
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  /** 操作类型 */
  operation: 'create' | 'update' | 'skip';
  /** 匹配的现有记录 */
  existingPayroll?: {
    id: string;
    payPeriod: string;
    status: PayrollDtoStatus;
  };
  /** 计算结果预览 */
  calculationPreview?: {
    grossPay: number;
    netPay: number;
    totalDeductions: number;
  };
}

/**
 * 薪资报表配置DTO
 */
export interface PayrollReportConfigDto {
  /** 报表类型 */
  reportType: 'summary' | 'detail' | 'analysis' | 'comparison';
  /** 报表期间 */
  period: {
    start: string;
    end: string;
  };
  /** 包含的部门 */
  departments?: string[];
  /** 包含的员工 */
  employees?: string[];
  /** 报表选项 */
  options: {
    includeCharts?: boolean;
    includeComparison?: boolean;
    groupByDepartment?: boolean;
    showCalculationDetails?: boolean;
  };
  /** 导出格式 */
  exportFormat?: 'excel' | 'pdf' | 'csv';
}