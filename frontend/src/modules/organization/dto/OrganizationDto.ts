/**
 * 组织架构相关DTO接口定义
 * 
 * 定义组织架构模块API传输的数据结构
 */

import { BaseDto, FilterDto, AuditInfoDto, TreeNodeDto, StatisticsDto } from '../../../shared/dto/BaseDto';

/**
 * 部门状态枚举
 */
export enum DepartmentDtoStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DISSOLVED = 'dissolved'
}

/**
 * 部门类型枚举
 */
export enum DepartmentDtoType {
  HEADQUARTERS = 'headquarters',
  BRANCH = 'branch',
  CORE_BUSINESS = 'core_business',
  SUPPORT = 'support',
  RESEARCH = 'research',
  SALES = 'sales',
  FINANCE = 'finance',
  HR = 'hr',
  IT = 'it',
  OPERATIONS = 'operations'
}

/**
 * 职位状态枚举
 */
export enum PositionDtoStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DISCONTINUED = 'discontinued'
}

/**
 * 工作地点枚举
 */
export enum WorkLocationDto {
  OFFICE = 'office',
  REMOTE = 'remote',
  HYBRID = 'hybrid',
  FIELD = 'field',
  CLIENT_SITE = 'client_site'
}

/**
 * 部门DTO
 */
export interface DepartmentDto extends BaseDto {
  /** 部门名称 */
  name: string;
  /** 部门编号 */
  code?: string;
  /** 部门类型 */
  type: DepartmentDtoType;
  /** 部门状态 */
  status: DepartmentDtoStatus;
  /** 父部门ID */
  parentId?: string;
  /** 父部门名称 */
  parentName?: string;
  /** 部门负责人ID */
  managerId?: string;
  /** 部门负责人姓名 */
  managerName?: string;
  /** 部门描述 */
  description?: string;
  /** 成立日期 */
  establishDate?: string;
  /** 预算 */
  budget?: number;
  /** 员工数量 */
  employeeCount?: number;
  /** 职位数量 */
  positionCount?: number;
  /** 联系信息 */
  contactInfo?: {
    phoneNumber?: string;
    email?: string;
    address?: string;
  };
  /** 审计信息 */
  auditInfo?: AuditInfoDto;
}

/**
 * 职位DTO
 */
export interface PositionDto extends BaseDto {
  /** 职位名称 */
  name: string;
  /** 职位编号 */
  code?: string;
  /** 职位级别 */
  level: string;
  /** 职位状态 */
  status: PositionDtoStatus;
  /** 所属部门ID */
  departmentId: string;
  /** 所属部门名称 */
  departmentName?: string;
  /** 职位描述 */
  description?: string;
  /** 岗位职责 */
  responsibilities: string[];
  /** 任职要求 */
  requirements: string[];
  /** 薪资范围 */
  salaryRange: {
    min: number;
    max: number;
    currency?: string;
  };
  /** 编制人数 */
  headcount: number;
  /** 现有人数 */
  currentCount?: number;
  /** 空缺人数 */
  openings?: number;
  /** 工作地点 */
  workLocation: WorkLocationDto;
  /** 汇报对象ID */
  reportsTo?: string;
  /** 汇报对象姓名 */
  reportsToName?: string;
  /** 审计信息 */
  auditInfo?: AuditInfoDto;
}

/**
 * 部门创建请求DTO
 */
export interface CreateDepartmentDto {
  /** 部门名称 */
  name: string;
  /** 部门编号 */
  code?: string;
  /** 部门类型 */
  type: DepartmentDtoType;
  /** 父部门ID */
  parentId?: string;
  /** 部门负责人ID */
  managerId?: string;
  /** 部门描述 */
  description?: string;
  /** 成立日期 */
  establishDate?: string;
  /** 预算 */
  budget?: number;
  /** 联系信息 */
  contactInfo?: {
    phoneNumber?: string;
    email?: string;
    address?: string;
  };
}

/**
 * 部门更新请求DTO
 */
export interface UpdateDepartmentDto {
  /** 部门名称 */
  name?: string;
  /** 部门类型 */
  type?: DepartmentDtoType;
  /** 部门状态 */
  status?: DepartmentDtoStatus;
  /** 父部门ID */
  parentId?: string;
  /** 部门负责人ID */
  managerId?: string;
  /** 部门描述 */
  description?: string;
  /** 预算 */
  budget?: number;
  /** 联系信息 */
  contactInfo?: {
    phoneNumber?: string;
    email?: string;
    address?: string;
  };
  /** 更新原因 */
  updateReason?: string;
}

/**
 * 职位创建请求DTO
 */
export interface CreatePositionDto {
  /** 职位名称 */
  name: string;
  /** 职位编号 */
  code?: string;
  /** 职位级别 */
  level: string;
  /** 所属部门ID */
  departmentId: string;
  /** 职位描述 */
  description?: string;
  /** 岗位职责 */
  responsibilities: string[];
  /** 任职要求 */
  requirements: string[];
  /** 薪资范围 */
  salaryRange: {
    min: number;
    max: number;
    currency?: string;
  };
  /** 编制人数 */
  headcount: number;
  /** 工作地点 */
  workLocation: WorkLocationDto;
  /** 汇报对象ID */
  reportsTo?: string;
}

/**
 * 职位更新请求DTO
 */
export interface UpdatePositionDto {
  /** 职位名称 */
  name?: string;
  /** 职位级别 */
  level?: string;
  /** 职位状态 */
  status?: PositionDtoStatus;
  /** 所属部门ID */
  departmentId?: string;
  /** 职位描述 */
  description?: string;
  /** 岗位职责 */
  responsibilities?: string[];
  /** 任职要求 */
  requirements?: string[];
  /** 薪资范围 */
  salaryRange?: {
    min: number;
    max: number;
    currency?: string;
  };
  /** 编制人数 */
  headcount?: number;
  /** 工作地点 */
  workLocation?: WorkLocationDto;
  /** 汇报对象ID */
  reportsTo?: string;
  /** 更新原因 */
  updateReason?: string;
}

/**
 * 部门查询过滤DTO
 */
export interface DepartmentFilterDto extends FilterDto {
  /** 部门类型过滤 */
  type?: DepartmentDtoType[];
  /** 部门状态过滤 */
  status?: DepartmentDtoStatus[];
  /** 父部门ID过滤 */
  parentIds?: string[];
  /** 是否包含子部门 */
  includeChildren?: boolean;
  /** 员工数量范围 */
  employeeCountRange?: {
    min?: number;
    max?: number;
  };
  /** 预算范围 */
  budgetRange?: {
    min?: number;
    max?: number;
  };
}

/**
 * 职位查询过滤DTO
 */
export interface PositionFilterDto extends FilterDto {
  /** 职位级别过滤 */
  levels?: string[];
  /** 职位状态过滤 */
  status?: PositionDtoStatus[];
  /** 部门ID过滤 */
  departmentIds?: string[];
  /** 工作地点过滤 */
  workLocations?: WorkLocationDto[];
  /** 薪资范围过滤 */
  salaryRange?: {
    min?: number;
    max?: number;
  };
  /** 是否有空缺 */
  hasOpenings?: boolean;
  /** 编制人数范围 */
  headcountRange?: {
    min?: number;
    max?: number;
  };
}

/**
 * 组织架构树DTO
 */
export interface OrganizationTreeDto extends TreeNodeDto {
  /** 节点ID（部门ID） */
  id: string;
  /** 部门名称 */
  label: string;
  /** 父部门ID */
  parentId?: string;
  /** 子部门列表 */
  children?: OrganizationTreeDto[];
  /** 部门详细信息 */
  data: {
    department: DepartmentDto;
    employeeCount: number;
    positionCount: number;
    activePositions: number;
    vacantPositions: number;
  };
}

/**
 * 组织架构统计DTO
 */
export interface OrganizationStatisticsDto {
  /** 部门统计 */
  departmentStats: {
    totalDepartments: number;
    activeDepartments: number;
    departmentsByType: Array<{
      type: DepartmentDtoType;
      count: number;
      percentage: number;
    }>;
    averageEmployeesPerDepartment: number;
    departmentHierarchyDepth: number;
  };
  /** 职位统计 */
  positionStats: {
    totalPositions: number;
    activePositions: number;
    vacantPositions: number;
    totalHeadcount: number;
    utilizationRate: number;
    positionsByLevel: Array<{
      level: string;
      count: number;
      percentage: number;
    }>;
    positionsByLocation: Array<{
      location: WorkLocationDto;
      count: number;
      percentage: number;
    }>;
  };
  /** 组织健康度 */
  healthMetrics: {
    managementSpan: number;
    organizationBalance: number;
    positionFillRate: number;
    departmentEfficiency: number;
    overallScore: number;
  };
}

/**
 * 部门重组计划DTO
 */
export interface DepartmentReorganizationDto {
  /** 重组类型 */
  type: 'merge' | 'split' | 'restructure' | 'dissolve';
  /** 源部门ID列表 */
  sourceDepartmentIds: string[];
  /** 目标部门配置 */
  targetDepartments: Array<{
    name: string;
    type: DepartmentDtoType;
    parentId?: string;
    description?: string;
  }>;
  /** 员工转移计划 */
  employeeTransferPlan: Array<{
    employeeId: string;
    fromDepartmentId: string;
    toDepartmentId: string;
    newPositionId?: string;
    effectiveDate: string;
  }>;
  /** 职位调整计划 */
  positionAdjustmentPlan: Array<{
    positionId: string;
    fromDepartmentId: string;
    toDepartmentId: string;
    adjustments?: Partial<UpdatePositionDto>;
  }>;
  /** 重组原因 */
  reason: string;
  /** 预期效果 */
  expectedOutcomes: string[];
  /** 风险评估 */
  risks: Array<{
    risk: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  /** 实施时间表 */
  timeline?: Array<{
    phase: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
}

/**
 * 组织架构分析报告DTO
 */
export interface OrganizationAnalysisDto {
  /** 分析日期 */
  analysisDate: string;
  /** 组织架构概览 */
  overview: {
    totalDepartments: number;
    totalPositions: number;
    totalEmployees: number;
    organizationSpan: number;
    hierarchyDepth: number;
  };
  /** 问题识别 */
  issues: Array<{
    type: 'structure' | 'staffing' | 'efficiency' | 'balance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedDepartments: string[];
    recommendations: string[];
  }>;
  /** 优化建议 */
  recommendations: Array<{
    category: 'restructure' | 'staffing' | 'process' | 'policy';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    expectedBenefits: string[];
    estimatedCost?: number;
    implementationTime?: string;
  }>;
  /** 趋势分析 */
  trends?: Array<{
    metric: string;
    currentValue: number;
    previousValue: number;
    changePercentage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
}

/**
 * 职位设计建议DTO
 */
export interface PositionDesignSuggestionDto {
  /** 建议类型 */
  type: 'create' | 'modify' | 'combine' | 'eliminate';
  /** 目标职位ID（修改/合并/删除时） */
  targetPositionId?: string;
  /** 建议的职位配置 */
  suggestedPosition: {
    name: string;
    level: string;
    departmentId: string;
    salaryRange: { min: number; max: number };
    headcount: number;
    requirements: string[];
    responsibilities: string[];
  };
  /** 建议原因 */
  reason: string;
  /** 影响分析 */
  impact: {
    affectedEmployees: number;
    budgetImpact: number;
    workloadRedistribution: string;
  };
  /** 实施优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 实施步骤 */
  implementationSteps?: string[];
}