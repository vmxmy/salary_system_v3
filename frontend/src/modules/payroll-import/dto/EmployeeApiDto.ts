/**
 * 员工模块API请求响应DTO
 * 
 * 定义员工模块特定的API请求和响应结构
 */

import { 
  ListRequest, 
  ListResponse, 
  BatchOperationRequest, 
  BatchOperationResponse,
  SearchRequest,
  SearchResponse,
  ImportRequest,
  ImportResponse,
  ExportRequest,
  StatisticsRequest,
  StatisticsResponse
} from '../../../shared/dto/ApiDto';
import { 
  EmployeeDto, 
  EmployeeFilterDto, 
  CreateEmployeeDto, 
  UpdateEmployeeDto,
  EmployeeDetailDto,
  EmployeeStatisticsDto,
  EmployeeTransferDto,
  EmployeeTerminationDto,
  EmployeeImportPreviewDto
} from './EmployeeDto';

// ==================== 员工CRUD操作 ====================

/**
 * 员工列表查询请求
 */
export interface GetEmployeesRequest extends ListRequest {
  /** 员工特定过滤条件 */
  filters?: EmployeeFilterDto;
  /** 包含关联数据 */
  include?: Array<'department' | 'position' | 'manager' | 'directReports' | 'payrolls'>;
}

/**
 * 员工列表查询响应
 */
export interface GetEmployeesResponse extends ListResponse<EmployeeDto> {
  /** 员工统计摘要 */
  summary?: {
    totalEmployees: number;
    activeEmployees: number;
    probationEmployees: number;
    newHires: number;
    terminatedThisMonth: number;
  };
}

/**
 * 员工详情查询响应
 */
export interface GetEmployeeDetailResponse {
  /** 员工详细信息 */
  employee: EmployeeDetailDto;
  /** 相关推荐 */
  recommendations?: Array<{
    type: 'similar_employees' | 'department_colleagues' | 'career_progression';
    items: EmployeeDto[];
  }>;
}

/**
 * 员工创建请求
 */
export interface CreateEmployeeRequest {
  /** 员工信息 */
  employee: CreateEmployeeDto;
  /** 创建选项 */
  options?: {
    /** 是否发送欢迎邮件 */
    sendWelcomeEmail?: boolean;
    /** 是否自动分配员工编号 */
    autoAssignEmployeeNumber?: boolean;
    /** 是否立即激活 */
    activate?: boolean;
  };
}

/**
 * 员工更新请求
 */
export interface UpdateEmployeeRequest {
  /** 更新数据 */
  employee: UpdateEmployeeDto;
  /** 更新选项 */
  options?: {
    /** 是否发送变更通知 */
    sendNotification?: boolean;
    /** 是否记录变更历史 */
    recordHistory?: boolean;
    /** 变更原因 */
    changeReason?: string;
  };
}

/**
 * 员工批量操作请求
 */
export interface BatchEmployeeOperationRequest extends BatchOperationRequest<CreateEmployeeDto | UpdateEmployeeDto> {
  /** 员工特定批量选项 */
  employeeOptions?: {
    /** 批量转移部门 */
    transferDepartment?: {
      targetDepartmentId: string;
      effectiveDate: string;
    };
    /** 批量调薪 */
    salaryAdjustment?: {
      adjustmentType: 'amount' | 'percentage';
      adjustmentValue: number;
      effectiveDate: string;
    };
    /** 批量状态变更 */
    statusChange?: {
      newStatus: string;
      reason: string;
    };
  };
}

// ==================== 员工搜索 ====================

/**
 * 员工搜索请求
 */
export interface SearchEmployeesRequest extends SearchRequest {
  /** 搜索范围 */
  scope?: Array<'name' | 'employeeNumber' | 'department' | 'position' | 'skills'>;
  /** 员工特定过滤 */
  filters?: EmployeeFilterDto;
}

/**
 * 员工搜索响应
 */
export interface SearchEmployeesResponse extends SearchResponse<EmployeeDto> {
  /** 搜索建议 */
  suggestions?: {
    departments: string[];
    positions: string[];
    skills: string[];
  };
}

// ==================== 员工转岗离职 ====================

/**
 * 员工转岗请求
 */
export interface TransferEmployeeRequest {
  /** 转岗信息 */
  transfer: EmployeeTransferDto;
  /** 转岗选项 */
  options?: {
    /** 是否需要审批 */
    requireApproval?: boolean;
    /** 是否保留原职位权限 */
    retainPermissions?: boolean;
    /** 通知相关人员 */
    notifyStakeholders?: boolean;
  };
}

/**
 * 员工离职请求
 */
export interface TerminateEmployeeRequest {
  /** 离职信息 */
  termination: EmployeeTerminationDto;
  /** 离职选项 */
  options?: {
    /** 是否需要审批 */
    requireApproval?: boolean;
    /** 是否立即生效 */
    immediateEffect?: boolean;
    /** 自动处理工作交接 */
    autoHandover?: boolean;
    /** 发送离职确认 */
    sendConfirmation?: boolean;
  };
}

/**
 * 员工重新雇佣请求
 */
export interface RehireEmployeeRequest {
  /** 原员工ID */
  formerEmployeeId: string;
  /** 重新雇佣信息 */
  rehireInfo: {
    hireDate: string;
    departmentId?: string;
    positionId?: string;
    baseSalary?: number;
    employmentStatus?: string;
    rehireReason: string;
  };
  /** 选项 */
  options?: {
    /** 是否保留历史记录 */
    preserveHistory?: boolean;
    /** 是否重置员工编号 */
    resetEmployeeNumber?: boolean;
  };
}

// ==================== 员工导入导出 ====================

/**
 * 员工导入请求
 */
export interface ImportEmployeesRequest extends ImportRequest {
  /** 员工特定导入选项 */
  employeeOptions?: {
    /** 默认部门ID */
    defaultDepartmentId?: string;
    /** 默认员工类型 */
    defaultEmployeeType?: string;
    /** 默认雇佣状态 */
    defaultEmploymentStatus?: string;
    /** 自动分配员工编号 */
    autoAssignNumbers?: boolean;
  };
}

/**
 * 员工导入响应
 */
export interface ImportEmployeesResponse extends ImportResponse<EmployeeImportPreviewDto> {
  /** 导入统计 */
  importStatistics?: {
    duplicateIdNumbers: number;
    invalidDepartments: number;
    invalidPositions: number;
    salaryOutOfRange: number;
  };
}

/**
 * 员工导出请求
 */
export interface ExportEmployeesRequest extends ExportRequest {
  /** 员工特定过滤条件 */
  filters?: EmployeeFilterDto;
  /** 导出模板 */
  template?: 'basic' | 'detailed' | 'payroll' | 'hr_report';
  /** 包含敏感信息 */
  includeSensitive?: boolean;
}

// ==================== 员工统计分析 ====================

/**
 * 员工统计请求
 */
export interface GetEmployeeStatisticsRequest extends StatisticsRequest {
  /** 统计维度 */
  dimensions?: Array<'department' | 'position' | 'employeeType' | 'age' | 'tenure' | 'salary'>;
  /** 包含趋势分析 */
  includeTrends?: boolean;
  /** 对比期间 */
  comparisonPeriod?: {
    start: string;
    end: string;
  };
}

/**
 * 员工统计响应
 */
export interface GetEmployeeStatisticsResponse extends StatisticsResponse {
  /** 员工特定统计 */
  employeeMetrics: EmployeeStatisticsDto;
  /** 趋势分析 */
  trends?: Array<{
    metric: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    changeRate: number;
    prediction?: number;
  }>;
}

/**
 * 员工流失分析请求
 */
export interface EmployeeTurnoverAnalysisRequest {
  /** 分析时间范围 */
  dateRange: {
    start: string;
    end: string;
  };
  /** 分析维度 */
  dimensions?: Array<'department' | 'position' | 'tenure' | 'salary' | 'performance'>;
  /** 包含预测 */
  includePrediction?: boolean;
}

/**
 * 员工流失分析响应
 */
export interface EmployeeTurnoverAnalysisResponse {
  /** 流失率统计 */
  turnoverRate: {
    overall: number;
    voluntary: number;
    involuntary: number;
    byDepartment: Array<{
      departmentId: string;
      departmentName: string;
      rate: number;
    }>;
    byTenure: Array<{
      tenureRange: string;
      rate: number;
    }>;
  };
  /** 流失原因分析 */
  reasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  /** 风险预警 */
  riskAlerts?: Array<{
    employeeId: string;
    employeeName: string;
    riskLevel: 'high' | 'medium' | 'low';
    riskFactors: string[];
    recommendations: string[];
  }>;
  /** 流失预测 */
  prediction?: {
    nextQuarter: number;
    nextYear: number;
    highRiskCount: number;
  };
}

// ==================== 员工绩效相关 ====================

/**
 * 员工绩效评估请求
 */
export interface EmployeePerformanceRequest {
  /** 员工ID */
  employeeId: string;
  /** 评估期间 */
  period: {
    start: string;
    end: string;
  };
  /** 评估类型 */
  evaluationType: 'annual' | 'quarterly' | 'probation' | 'project';
  /** 评估内容 */
  evaluation: {
    evaluatorId: string;
    ratingLevel: string;
    score: number;
    goals: Array<{
      description: string;
      weight: number;
      achievement: number;
      comments?: string;
    }>;
    competencies: Array<{
      name: string;
      rating: number;
      comments?: string;
    }>;
    overallComments: string;
    developmentPlan?: string[];
  };
}

/**
 * 员工技能管理请求
 */
export interface EmployeeSkillsRequest {
  /** 员工ID */
  employeeId: string;
  /** 技能更新 */
  skillUpdates: Array<{
    skillName: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    certified?: boolean;
    certificationDate?: string;
    validUntil?: string;
  }>;
}

/**
 * 团队分析请求
 */
export interface TeamAnalysisRequest {
  /** 部门ID */
  departmentId?: string;
  /** 团队领导ID */
  managerId?: string;
  /** 分析类型 */
  analysisType: Array<'composition' | 'skills' | 'performance' | 'workload'>;
  /** 时间范围 */
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * 团队分析响应
 */
export interface TeamAnalysisResponse {
  /** 团队组成 */
  composition?: {
    totalMembers: number;
    byLevel: Record<string, number>;
    byType: Record<string, number>;
    averageTenure: number;
    diversityMetrics: Record<string, any>;
  };
  /** 技能分析 */
  skills?: {
    availableSkills: Array<{
      skill: string;
      memberCount: number;
      averageLevel: number;
    }>;
    skillGaps: string[];
    recommendations: string[];
  };
  /** 绩效分析 */
  performance?: {
    averageRating: number;
    distributionByRating: Record<string, number>;
    topPerformers: string[];
    improvementNeeded: string[];
  };
  /** 工作负荷分析 */
  workload?: {
    averageUtilization: number;
    overloadedMembers: string[];
    underutilizedMembers: string[];
    recommendations: string[];
  };
}