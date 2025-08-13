/**
 * 薪资模块API请求响应DTO
 * 
 * 定义薪资模块特定的API请求和响应结构
 */

import { 
  ListRequest, 
  ListResponse, 
  BatchOperationRequest, 
  BatchOperationResponse,
  ImportRequest,
  ImportResponse,
  ExportRequest,
  StatisticsRequest,
  StatisticsResponse
} from '../../../shared/dto/ApiDto';
import { 
  PayrollDto, 
  PayrollFilterDto, 
  CreatePayrollDto, 
  UpdatePayrollDto,
  PayrollDetailDto,
  PayrollStatisticsDto,
  BatchCreatePayrollDto,
  BatchCreatePayrollResponseDto,
  PayrollApprovalDto,
  PayrollPaymentDto,
  PayrollCalculationConfigDto,
  PayrollImportPreviewDto,
  PayrollReportConfigDto
} from './PayrollDto';

// ==================== 薪资CRUD操作 ====================

/**
 * 薪资列表查询请求
 */
export interface GetPayrollsRequest extends ListRequest {
  /** 薪资特定过滤条件 */
  filters?: PayrollFilterDto;
  /** 包含关联数据 */
  include?: Array<'employee' | 'department' | 'components' | 'approval' | 'payment'>;
  /** 汇总选项 */
  summary?: {
    /** 是否包含汇总数据 */
    enabled: boolean;
    /** 汇总维度 */
    groupBy?: Array<'department' | 'position' | 'status' | 'payPeriod'>;
  };
}

/**
 * 薪资列表查询响应
 */
export interface GetPayrollsResponse extends ListResponse<PayrollDto> {
  /** 薪资汇总 */
  summary?: {
    totalRecords: number;
    totalGrossPay: number;
    totalNetPay: number;
    totalDeductions: number;
    averagePay: number;
    statusDistribution: Record<string, number>;
  };
  /** 分组统计 */
  groupedSummary?: Array<{
    groupKey: string;
    groupValue: string;
    count: number;
    totalGrossPay: number;
    totalNetPay: number;
    averagePay: number;
  }>;
}

/**
 * 薪资详情查询响应
 */
export interface GetPayrollDetailResponse {
  /** 薪资详细信息 */
  payroll: PayrollDetailDto;
  /** 审批历史 */
  approvalHistory?: Array<{
    stepName: string;
    approverName: string;
    approvalDate: string;
    status: 'approved' | 'rejected' | 'pending';
    comments?: string;
  }>;
  /** 相关薪资记录 */
  relatedPayrolls?: PayrollDto[];
}

/**
 * 薪资创建请求
 */
export interface CreatePayrollRequest {
  /** 薪资信息 */
  payroll: CreatePayrollDto;
  /** 创建选项 */
  options?: {
    /** 是否自动计算 */
    autoCalculate?: boolean;
    /** 是否验证重复 */
    checkDuplicates?: boolean;
    /** 是否自动提交审批 */
    autoSubmitForApproval?: boolean;
    /** 计算规则ID */
    calculationRuleId?: string;
  };
}

/**
 * 薪资更新请求
 */
export interface UpdatePayrollRequest {
  /** 更新数据 */
  payroll: UpdatePayrollDto;
  /** 更新选项 */
  options?: {
    /** 是否重新计算 */
    recalculate?: boolean;
    /** 是否发送通知 */
    sendNotification?: boolean;
    /** 更新原因 */
    updateReason?: string;
    /** 是否需要重新审批 */
    requireReapproval?: boolean;
  };
}

/**
 * 批量薪资创建请求
 */
export interface BatchCreatePayrollRequest {
  /** 批量创建信息 */
  batchData: BatchCreatePayrollDto;
  /** 处理选项 */
  options?: {
    /** 是否异步处理 */
    async?: boolean;
    /** 错误处理策略 */
    errorStrategy?: 'stop' | 'continue' | 'rollback';
    /** 通知设置 */
    notifications?: {
      onComplete?: boolean;
      onError?: boolean;
      recipients?: string[];
    };
  };
}

/**
 * 批量薪资创建响应
 */
export interface BatchCreatePayrollResponse extends BatchCreatePayrollResponseDto {
  /** 处理任务ID（异步模式） */
  taskId?: string;
  /** 预估完成时间 */
  estimatedCompletionTime?: string;
}

// ==================== 薪资计算与验证 ====================

/**
 * 薪资计算请求
 */
export interface CalculatePayrollRequest {
  /** 员工ID */
  employeeId: string;
  /** 计算期间 */
  payPeriod: {
    start: string;
    end: string;
  };
  /** 计算参数 */
  parameters?: {
    workDays?: number;
    overtimeHours?: number;
    additionalComponents?: Array<{
      type: string;
      amount: number;
      description?: string;
    }>;
  };
  /** 计算配置 */
  config?: PayrollCalculationConfigDto;
}

/**
 * 薪资计算响应
 */
export interface CalculatePayrollResponse {
  /** 计算结果 */
  calculation: {
    grossPay: number;
    netPay: number;
    totalDeductions: number;
    components: Array<{
      type: string;
      name: string;
      amount: number;
      isDeduction: boolean;
      calculationDetail?: {
        base: number;
        rate: number;
        formula: string;
      };
    }>;
  };
  /** 计算明细 */
  details: Array<{
    step: number;
    description: string;
    calculation: string;
    result: number;
  }>;
  /** 验证结果 */
  validation: {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  };
}

/**
 * 薪资验证请求
 */
export interface ValidatePayrollRequest {
  /** 薪资数据 */
  payroll: CreatePayrollDto | UpdatePayrollDto;
  /** 验证规则 */
  rules?: Array<'duplicate_check' | 'amount_range' | 'period_overlap' | 'employee_status'>;
  /** 验证选项 */
  options?: {
    strict?: boolean;
    includeWarnings?: boolean;
  };
}

/**
 * 薪资验证响应
 */
export interface ValidatePayrollResponse {
  /** 验证结果 */
  isValid: boolean;
  /** 错误信息 */
  errors: Array<{
    rule: string;
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  /** 建议修正 */
  suggestions?: Array<{
    field: string;
    currentValue: any;
    suggestedValue: any;
    reason: string;
  }>;
}

// ==================== 薪资审批流程 ====================

/**
 * 薪资审批提交请求
 */
export interface SubmitPayrollApprovalRequest {
  /** 薪资ID列表 */
  payrollIds: string[];
  /** 审批流程配置 */
  workflowConfig?: {
    workflowId?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    deadline?: string;
    comments?: string;
  };
  /** 提交选项 */
  options?: {
    /** 是否批量提交 */
    batchSubmission?: boolean;
    /** 是否自动分配审批人 */
    autoAssignApprovers?: boolean;
  };
}

/**
 * 薪资审批操作请求
 */
export interface PayrollApprovalActionRequest extends PayrollApprovalDto {
  /** 审批选项 */
  options?: {
    /** 是否发送通知 */
    sendNotification?: boolean;
    /** 下一步审批人 */
    nextApprover?: string;
    /** 是否跳过后续步骤 */
    skipSubsequentSteps?: boolean;
  };
}

/**
 * 薪资审批状态查询响应
 */
export interface PayrollApprovalStatusResponse {
  /** 审批状态 */
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
  /** 当前步骤 */
  currentStep: {
    stepName: string;
    approverName: string;
    dueDate?: string;
    assignedDate: string;
  };
  /** 审批历史 */
  history: Array<{
    stepName: string;
    approverName: string;
    action: 'approved' | 'rejected' | 'returned';
    actionDate: string;
    comments?: string;
    duration?: number;
  }>;
  /** 待处理审批 */
  pendingApprovals?: Array<{
    stepName: string;
    approverName: string;
    dueDate?: string;
  }>;
}

// ==================== 薪资发放管理 ====================

/**
 * 薪资发放请求
 */
export interface ProcessPayrollPaymentRequest extends PayrollPaymentDto {
  /** 发放选项 */
  options?: {
    /** 是否异步处理 */
    async?: boolean;
    /** 失败重试次数 */
    retryCount?: number;
    /** 发放通知 */
    notifications?: {
      sendToEmployee?: boolean;
      sendToHR?: boolean;
      emailTemplate?: string;
    };
  };
}

/**
 * 薪资发放响应
 */
export interface ProcessPayrollPaymentResponse {
  /** 发放结果 */
  result: {
    successful: string[];
    failed: Array<{
      payrollId: string;
      employeeName: string;
      error: string;
      canRetry: boolean;
    }>;
    totalAmount: number;
    processedCount: number;
  };
  /** 批次信息 */
  batchInfo?: {
    batchId: string;
    processingTime: number;
    bankReferenceNumber?: string;
  };
  /** 异步任务ID */
  taskId?: string;
}

/**
 * 发放状态查询响应
 */
export interface PaymentStatusResponse {
  /** 发放状态 */
  status: 'processing' | 'completed' | 'partially_failed' | 'failed';
  /** 进度信息 */
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    percentage: number;
  };
  /** 详细结果 */
  details?: Array<{
    payrollId: string;
    employeeName: string;
    amount: number;
    status: 'success' | 'failed' | 'pending';
    transactionId?: string;
    errorMessage?: string;
  }>;
}

// ==================== 薪资报表 ====================

/**
 * 薪资报表生成请求
 */
export interface GeneratePayrollReportRequest {
  /** 报表配置 */
  config: PayrollReportConfigDto;
  /** 生成选项 */
  options?: {
    /** 是否异步生成 */
    async?: boolean;
    /** 报表模板 */
    template?: string;
    /** 语言设置 */
    locale?: string;
    /** 水印设置 */
    watermark?: {
      enabled: boolean;
      text?: string;
    };
  };
}

/**
 * 薪资报表生成响应
 */
export interface GeneratePayrollReportResponse {
  /** 是否异步生成 */
  async: boolean;
  /** 报表数据（同步模式） */
  reportData?: {
    summary: Record<string, any>;
    details: Array<Record<string, any>>;
    charts?: Array<{
      type: string;
      title: string;
      data: any[];
    }>;
  };
  /** 报表文件信息 */
  fileInfo?: {
    filename: string;
    downloadUrl: string;
    size: number;
    expiresAt: string;
  };
  /** 异步任务ID */
  taskId?: string;
}

// ==================== 薪资统计分析 ====================

/**
 * 薪资统计请求
 */
export interface GetPayrollStatisticsRequest extends StatisticsRequest {
  /** 统计维度 */
  dimensions?: Array<'department' | 'position' | 'employeeType' | 'component' | 'status'>;
  /** 包含对比分析 */
  includeComparison?: boolean;
  /** 对比基准 */
  comparisonBaseline?: 'previous_period' | 'same_period_last_year' | 'budget';
}

/**
 * 薪资统计响应
 */
export interface GetPayrollStatisticsResponse extends StatisticsResponse {
  /** 薪资特定统计 */
  payrollMetrics: PayrollStatisticsDto;
  /** 成本分析 */
  costAnalysis?: {
    totalCost: number;
    costByCategory: Record<string, number>;
    costTrends: Array<{
      period: string;
      amount: number;
      changePercentage: number;
    }>;
    budgetComparison?: {
      budgeted: number;
      actual: number;
      variance: number;
      variancePercentage: number;
    };
  };
}

/**
 * 薪资异常分析请求
 */
export interface PayrollAnomalyAnalysisRequest {
  /** 分析期间 */
  period: {
    start: string;
    end: string;
  };
  /** 异常检测规则 */
  rules?: Array<{
    type: 'amount_spike' | 'component_missing' | 'calculation_error' | 'approval_delay';
    threshold?: number;
    enabled: boolean;
  }>;
  /** 分析选项 */
  options?: {
    includeFalsePositives?: boolean;
    severityFilter?: Array<'low' | 'medium' | 'high' | 'critical'>;
  };
}

/**
 * 薪资异常分析响应
 */
export interface PayrollAnomalyAnalysisResponse {
  /** 异常记录 */
  anomalies: Array<{
    payrollId: string;
    employeeName: string;
    anomalyType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detectedValue: any;
    expectedValue?: any;
    deviation?: number;
    confidence: number;
    recommendations: string[];
  }>;
  /** 异常统计 */
  statistics: {
    totalAnomalies: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    falsePositiveRate?: number;
  };
  /** 趋势分析 */
  trends?: Array<{
    anomalyType: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    frequency: number;
    prediction?: string;
  }>;
}