/**
 * 组织架构模块API请求响应DTO
 * 
 * 定义组织架构模块特定的API请求和响应结构
 */

import { 
  ListRequest, 
  ListResponse, 
  BatchOperationRequest, 
  BatchOperationResponse,
  StatisticsRequest,
  StatisticsResponse
} from '../../../shared/dto/ApiDto';
import { 
  DepartmentDto, 
  DepartmentFilterDto, 
  CreateDepartmentDto, 
  UpdateDepartmentDto,
  PositionDto,
  PositionFilterDto,
  CreatePositionDto,
  UpdatePositionDto,
  OrganizationTreeDto,
  OrganizationStatisticsDto,
  DepartmentReorganizationDto,
  OrganizationAnalysisDto,
  PositionDesignSuggestionDto
} from './OrganizationDto';

// ==================== 部门管理 ====================

/**
 * 部门列表查询请求
 */
export interface GetDepartmentsRequest extends ListRequest {
  /** 部门特定过滤条件 */
  filters?: DepartmentFilterDto;
  /** 包含关联数据 */
  include?: Array<'parent' | 'children' | 'manager' | 'employees' | 'positions'>;
  /** 树形结构选项 */
  treeOptions?: {
    /** 是否返回树形结构 */
    asTree?: boolean;
    /** 展开级别 */
    expandLevel?: number;
    /** 根节点ID */
    rootId?: string;
  };
}

/**
 * 部门列表查询响应
 */
export interface GetDepartmentsResponse extends ListResponse<DepartmentDto> {
  /** 部门统计 */
  summary?: {
    totalDepartments: number;
    activeDepartments: number;
    maxHierarchyDepth: number;
    totalEmployees: number;
    averageTeamSize: number;
  };
  /** 树形结构数据 */
  tree?: OrganizationTreeDto[];
}

/**
 * 部门详情查询响应
 */
export interface GetDepartmentDetailResponse {
  /** 部门详细信息 */
  department: DepartmentDto;
  /** 子部门列表 */
  subDepartments?: DepartmentDto[];
  /** 部门职位 */
  positions?: PositionDto[];
  /** 部门统计 */
  statistics?: {
    directEmployees: number;
    totalEmployees: number;
    positionCount: number;
    vacantPositions: number;
    averageSalary: number;
    budgetUtilization: number;
  };
  /** 组织关系 */
  relationships?: {
    parentDepartment?: DepartmentDto;
    siblingDepartments?: DepartmentDto[];
    managerChain?: Array<{
      departmentName: string;
      managerName: string;
      level: number;
    }>;
  };
}

/**
 * 部门创建请求
 */
export interface CreateDepartmentRequest {
  /** 部门信息 */
  department: CreateDepartmentDto;
  /** 创建选项 */
  options?: {
    /** 是否自动分配部门编号 */
    autoAssignCode?: boolean;
    /** 是否继承父部门预算 */
    inheritParentBudget?: boolean;
    /** 是否自动创建默认职位 */
    createDefaultPositions?: boolean;
    /** 通知相关人员 */
    notifyStakeholders?: boolean;
  };
}

/**
 * 部门更新请求
 */
export interface UpdateDepartmentRequest {
  /** 更新数据 */
  department: UpdateDepartmentDto;
  /** 更新选项 */
  options?: {
    /** 是否级联更新子部门 */
    cascadeToChildren?: boolean;
    /** 是否重新计算预算 */
    recalculateBudget?: boolean;
    /** 是否发送变更通知 */
    sendNotifications?: boolean;
    /** 变更原因 */
    changeReason?: string;
  };
}

/**
 * 部门重组请求
 */
export interface ReorganizeDepartmentRequest {
  /** 重组计划 */
  reorganization: DepartmentReorganizationDto;
  /** 重组选项 */
  options?: {
    /** 是否需要审批 */
    requireApproval?: boolean;
    /** 是否模拟执行 */
    dryRun?: boolean;
    /** 执行时间 */
    scheduledDate?: string;
    /** 通知设置 */
    notifications?: {
      beforeExecution?: boolean;
      afterCompletion?: boolean;
      recipients?: string[];
    };
  };
}

/**
 * 部门重组响应
 */
export interface ReorganizeDepartmentResponse {
  /** 重组结果 */
  result: {
    successful: boolean;
    affectedDepartments: number;
    affectedEmployees: number;
    affectedPositions: number;
  };
  /** 执行详情 */
  executionDetails?: Array<{
    step: string;
    status: 'completed' | 'failed' | 'skipped';
    message: string;
    timestamp: string;
  }>;
  /** 模拟结果（dryRun模式） */
  simulation?: {
    impact: {
      departmentChanges: number;
      employeeTransfers: number;
      positionAdjustments: number;
      budgetImpact: number;
    };
    risks: string[];
    recommendations: string[];
  };
}

// ==================== 职位管理 ====================

/**
 * 职位列表查询请求
 */
export interface GetPositionsRequest extends ListRequest {
  /** 职位特定过滤条件 */
  filters?: PositionFilterDto;
  /** 包含关联数据 */
  include?: Array<'department' | 'supervisor' | 'subordinates' | 'employees'>;
  /** 职位分析选项 */
  analysis?: {
    /** 包含利用率分析 */
    includeUtilization?: boolean;
    /** 包含薪资分析 */
    includeSalaryAnalysis?: boolean;
    /** 包含技能匹配分析 */
    includeSkillMatching?: boolean;
  };
}

/**
 * 职位列表查询响应
 */
export interface GetPositionsResponse extends ListResponse<PositionDto> {
  /** 职位统计 */
  summary?: {
    totalPositions: number;
    activePositions: number;
    vacantPositions: number;
    totalHeadcount: number;
    utilizationRate: number;
  };
  /** 分析结果 */
  analysis?: {
    utilizationByDepartment?: Array<{
      departmentId: string;
      departmentName: string;
      utilizationRate: number;
      vacantCount: number;
    }>;
    salaryDistribution?: Array<{
      level: string;
      averageSalary: number;
      salaryRange: { min: number; max: number };
      positionCount: number;
    }>;
  };
}

/**
 * 职位详情查询响应
 */
export interface GetPositionDetailResponse {
  /** 职位详细信息 */
  position: PositionDto;
  /** 在职员工 */
  currentEmployees?: Array<{
    employeeId: string;
    employeeName: string;
    hireDate: string;
    performanceRating?: string;
  }>;
  /** 职位历史 */
  history?: Array<{
    changeDate: string;
    changeType: 'created' | 'modified' | 'headcount_change' | 'salary_adjustment';
    description: string;
    changedBy: string;
  }>;
  /** 相关职位 */
  relatedPositions?: {
    similarPositions?: PositionDto[];
    careerPath?: {
      previousLevels?: PositionDto[];
      nextLevels?: PositionDto[];
    };
  };
}

/**
 * 职位创建请求
 */
export interface CreatePositionRequest {
  /** 职位信息 */
  position: CreatePositionDto;
  /** 创建选项 */
  options?: {
    /** 是否自动分配职位编号 */
    autoAssignCode?: boolean;
    /** 是否验证预算 */
    validateBudget?: boolean;
    /** 是否创建招聘需求 */
    createRecruitmentRequest?: boolean;
    /** 审批流程 */
    approvalWorkflow?: string;
  };
}

/**
 * 职位更新请求
 */
export interface UpdatePositionRequest {
  /** 更新数据 */
  position: UpdatePositionDto;
  /** 更新选项 */
  options?: {
    /** 是否影响现有员工 */
    affectCurrentEmployees?: boolean;
    /** 是否重新评估薪资 */
    reevaluateSalary?: boolean;
    /** 是否需要审批 */
    requireApproval?: boolean;
    /** 通知设置 */
    notifyAffectedEmployees?: boolean;
  };
}

/**
 * 职位设计优化请求
 */
export interface OptimizePositionDesignRequest {
  /** 目标部门ID */
  departmentId?: string;
  /** 优化目标 */
  objectives?: Array<'reduce_redundancy' | 'improve_efficiency' | 'career_progression' | 'cost_optimization'>;
  /** 约束条件 */
  constraints?: {
    maxPositionReduction?: number;
    minHeadcountPerPosition?: number;
    budgetLimit?: number;
    preserveKeyPositions?: string[];
  };
  /** 分析选项 */
  options?: {
    includeMarketBenchmark?: boolean;
    considerEmployeeSkills?: boolean;
    analyzeWorkload?: boolean;
  };
}

/**
 * 职位设计优化响应
 */
export interface OptimizePositionDesignResponse {
  /** 优化建议 */
  suggestions: PositionDesignSuggestionDto[];
  /** 影响分析 */
  impact: {
    affectedPositions: number;
    affectedEmployees: number;
    estimatedCostSaving: number;
    efficiencyImprovement: number;
  };
  /** 实施计划 */
  implementationPlan?: Array<{
    phase: number;
    description: string;
    positions: string[];
    estimatedDuration: string;
    dependencies: string[];
  }>;
}

// ==================== 组织架构分析 ====================

/**
 * 组织架构统计请求
 */
export interface GetOrganizationStatisticsRequest extends StatisticsRequest {
  /** 统计范围 */
  scope?: Array<'departments' | 'positions' | 'employees' | 'budget' | 'efficiency'>;
  /** 对比分析 */
  comparison?: {
    enabled: boolean;
    baselineDate?: string;
    comparisonPeriod?: string;
  };
  /** 健康度评估 */
  healthCheck?: {
    enabled: boolean;
    includeBenchmarks?: boolean;
    industryComparison?: boolean;
  };
}

/**
 * 组织架构统计响应
 */
export interface GetOrganizationStatisticsResponse extends StatisticsResponse {
  /** 组织统计 */
  organizationMetrics: OrganizationStatisticsDto;
  /** 健康度评估 */
  healthAssessment?: {
    overallScore: number;
    dimensions: Array<{
      dimension: string;
      score: number;
      status: 'excellent' | 'good' | 'fair' | 'poor';
      recommendations: string[];
    }>;
    industryBenchmark?: {
      percentile: number;
      averageScore: number;
      topQuartileScore: number;
    };
  };
}

/**
 * 组织架构分析请求
 */
export interface AnalyzeOrganizationRequest {
  /** 分析类型 */
  analysisType: Array<'structure' | 'efficiency' | 'cost' | 'talent' | 'growth'>;
  /** 分析深度 */
  depth?: 'summary' | 'detailed' | 'comprehensive';
  /** 分析选项 */
  options?: {
    includeRecommendations?: boolean;
    includeBenchmarks?: boolean;
    includeRiskAssessment?: boolean;
    futureProjection?: {
      enabled: boolean;
      timeHorizon?: string;
      growthAssumptions?: Record<string, number>;
    };
  };
}

/**
 * 组织架构分析响应
 */
export interface AnalyzeOrganizationResponse {
  /** 分析报告 */
  analysis: OrganizationAnalysisDto;
  /** 关键指标 */
  keyMetrics?: Array<{
    metric: string;
    value: number;
    unit: string;
    status: 'good' | 'warning' | 'critical';
    benchmark?: number;
    trend?: 'improving' | 'stable' | 'declining';
  }>;
  /** 未来预测 */
  projections?: Array<{
    metric: string;
    currentValue: number;
    projectedValue: number;
    timeframe: string;
    confidence: number;
    assumptions: string[];
  }>;
}

// ==================== 组织架构比较与基准 ====================

/**
 * 组织架构比较请求
 */
export interface CompareOrganizationRequest {
  /** 比较类型 */
  comparisonType: 'historical' | 'industry' | 'peer_companies' | 'best_practices';
  /** 比较维度 */
  dimensions?: Array<'structure' | 'efficiency' | 'cost' | 'spans_and_layers' | 'position_design'>;
  /** 比较选项 */
  options?: {
    timeframe?: string;
    includeConfidentialData?: boolean;
    anonymizeResults?: boolean;
  };
}

/**
 * 组织架构比较响应
 */
export interface CompareOrganizationResponse {
  /** 比较结果 */
  comparison: Array<{
    dimension: string;
    currentValue: number;
    benchmarkValue: number;
    variance: number;
    variancePercentage: number;
    percentile?: number;
    status: 'above_benchmark' | 'at_benchmark' | 'below_benchmark';
  }>;
  /** 竞争位置 */
  competitivePosition?: {
    overallRanking: number;
    strengthAreas: string[];
    improvementAreas: string[];
    uniqueAdvantages: string[];
  };
  /** 改进建议 */
  improvementRecommendations?: Array<{
    area: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImpact: string;
    implementationComplexity: 'low' | 'medium' | 'high';
    estimatedTimeframe: string;
  }>;
}

// ==================== 批量操作 ====================

/**
 * 批量部门操作请求
 */
export interface BatchDepartmentOperationRequest extends BatchOperationRequest<CreateDepartmentDto | UpdateDepartmentDto> {
  /** 部门特定选项 */
  departmentOptions?: {
    /** 保持层级关系 */
    maintainHierarchy?: boolean;
    /** 重新计算预算 */
    recalculateBudgets?: boolean;
    /** 通知影响的员工 */
    notifyAffectedEmployees?: boolean;
  };
}

/**
 * 批量职位操作请求
 */
export interface BatchPositionOperationRequest extends BatchOperationRequest<CreatePositionDto | UpdatePositionDto> {
  /** 职位特定选项 */
  positionOptions?: {
    /** 验证预算约束 */
    validateBudgetConstraints?: boolean;
    /** 自动调整员工分配 */
    autoAdjustEmployeeAssignments?: boolean;
    /** 更新相关招聘需求 */
    updateRecruitmentRequests?: boolean;
  };
}