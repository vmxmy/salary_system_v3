/**
 * 员工相关DTO接口定义
 * 
 * 定义员工模块API传输的数据结构
 */

import { BaseDto, FilterDto, AuditInfoDto, OptionDto } from '../../../shared/dto/BaseDto';

/**
 * 员工状态枚举
 */
export enum EmployeeDtoStatus {
  ACTIVE = 'active',
  PROBATION = 'probation', 
  TERMINATED = 'terminated',
  SUSPENDED = 'suspended'
}

/**
 * 员工类型枚举
 */
export enum EmployeeDtoType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern',
  TEMPORARY = 'temporary'
}

/**
 * 员工基础DTO
 */
export interface EmployeeDto extends BaseDto {
  /** 员工姓名 */
  employeeName: string;
  /** 身份证号 */
  idNumber: string;
  /** 员工编号 */
  employeeNumber?: string;
  /** 入职日期 */
  hireDate: string;
  /** 离职日期 */
  terminationDate?: string;
  /** 雇佣状态 */
  employmentStatus: EmployeeDtoStatus;
  /** 员工类型 */
  employeeType: EmployeeDtoType;
  /** 基本薪资 */
  baseSalary: number;
  /** 部门ID */
  departmentId?: string;
  /** 部门名称 */
  departmentName?: string;
  /** 职位ID */
  positionId?: string;
  /** 职位名称 */
  positionName?: string;
  /** 直属上级ID */
  managerId?: string;
  /** 直属上级姓名 */
  managerName?: string;
  /** 联系方式 */
  contactInfo?: EmployeeContactDto;
  /** 个人信息 */
  personalInfo?: EmployeePersonalDto;
  /** 审计信息 */
  auditInfo?: AuditInfoDto;
}

/**
 * 员工联系方式DTO
 */
export interface EmployeeContactDto {
  /** 电话号码 */
  phoneNumber?: string;
  /** 邮箱地址 */
  email?: string;
  /** 紧急联系人 */
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  /** 家庭地址 */
  homeAddress?: {
    province: string;
    city: string;
    district: string;
    street: string;
    postalCode?: string;
  };
}

/**
 * 员工个人信息DTO
 */
export interface EmployeePersonalDto {
  /** 性别 */
  gender?: 'male' | 'female' | 'other';
  /** 出生日期 */
  birthDate?: string;
  /** 年龄 */
  age?: number;
  /** 民族 */
  ethnicity?: string;
  /** 政治面貌 */
  politicalStatus?: string;
  /** 婚姻状况 */
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  /** 教育程度 */
  education?: string;
  /** 专业 */
  major?: string;
  /** 毕业院校 */
  graduatedFrom?: string;
  /** 工作经验年限 */
  workExperience?: number;
}

/**
 * 员工创建请求DTO
 */
export interface CreateEmployeeDto {
  /** 员工姓名 */
  employeeName: string;
  /** 身份证号 */
  idNumber: string;
  /** 入职日期 */
  hireDate: string;
  /** 雇佣状态 */
  employmentStatus: EmployeeDtoStatus;
  /** 员工类型 */
  employeeType: EmployeeDtoType;
  /** 基本薪资 */
  baseSalary: number;
  /** 部门ID */
  departmentId?: string;
  /** 职位ID */
  positionId?: string;
  /** 直属上级ID */
  managerId?: string;
  /** 联系方式 */
  contactInfo?: EmployeeContactDto;
  /** 个人信息 */
  personalInfo?: EmployeePersonalDto;
}

/**
 * 员工更新请求DTO
 */
export interface UpdateEmployeeDto {
  /** 员工姓名 */
  employeeName?: string;
  /** 雇佣状态 */
  employmentStatus?: EmployeeDtoStatus;
  /** 员工类型 */
  employeeType?: EmployeeDtoType;
  /** 基本薪资 */
  baseSalary?: number;
  /** 部门ID */
  departmentId?: string;
  /** 职位ID */
  positionId?: string;
  /** 直属上级ID */
  managerId?: string;
  /** 离职日期 */
  terminationDate?: string;
  /** 联系方式 */
  contactInfo?: Partial<EmployeeContactDto>;
  /** 个人信息 */
  personalInfo?: Partial<EmployeePersonalDto>;
  /** 更新原因 */
  updateReason?: string;
}

/**
 * 员工查询过滤DTO
 */
export interface EmployeeFilterDto extends FilterDto {
  /** 雇佣状态过滤 */
  employmentStatus?: EmployeeDtoStatus[];
  /** 员工类型过滤 */
  employeeType?: EmployeeDtoType[];
  /** 部门ID过滤 */
  departmentIds?: string[];
  /** 职位ID过滤 */
  positionIds?: string[];
  /** 入职日期范围 */
  hireDateRange?: {
    start?: string;
    end?: string;
  };
  /** 薪资范围 */
  salaryRange?: {
    min?: number;
    max?: number;
  };
  /** 年龄范围 */
  ageRange?: {
    min?: number;
    max?: number;
  };
  /** 性别过滤 */
  gender?: ('male' | 'female' | 'other')[];
}

/**
 * 员工详情DTO
 */
export interface EmployeeDetailDto extends EmployeeDto {
  /** 统计信息 */
  statistics: {
    /** 在职天数 */
    tenureDays: number;
    /** 在职月数 */
    tenureMonths: number;
    /** 在职年数 */
    tenureYears: number;
    /** 薪资历史记录数 */
    payrollRecordsCount: number;
    /** 最近薪资记录 */
    latestPayroll?: {
      payDate: string;
      grossPay: number;
      netPay: number;
    };
    /** 年度总收入 */
    annualIncome?: number;
  };
  /** 职业发展历史 */
  careerHistory?: Array<{
    departmentName: string;
    positionName: string;
    startDate: string;
    endDate?: string;
    baseSalary: number;
    reason?: string;
  }>;
  /** 绩效记录 */
  performanceRecords?: Array<{
    evaluationDate: string;
    evaluatorName: string;
    ratingLevel: string;
    score: number;
    comments?: string;
  }>;
}

/**
 * 员工统计DTO
 */
export interface EmployeeStatisticsDto {
  /** 总员工数 */
  totalEmployees: number;
  /** 活跃员工数 */
  activeEmployees: number;
  /** 试用期员工数 */
  probationEmployees: number;
  /** 已离职员工数 */
  terminatedEmployees: number;
  /** 按部门统计 */
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    employeeCount: number;
    percentage: number;
  }>;
  /** 按员工类型统计 */
  byEmployeeType: Array<{
    employeeType: EmployeeDtoType;
    employeeCount: number;
    percentage: number;
  }>;
  /** 按年龄段统计 */
  byAgeGroup: Array<{
    ageGroup: string;
    employeeCount: number;
    percentage: number;
  }>;
  /** 平均薪资 */
  averageSalary: number;
  /** 薪资分布 */
  salaryDistribution: Array<{
    range: string;
    employeeCount: number;
    percentage: number;
  }>;
}

/**
 * 员工转岗请求DTO
 */
export interface EmployeeTransferDto {
  /** 员工ID */
  employeeId: string;
  /** 目标部门ID */
  targetDepartmentId: string;
  /** 目标职位ID */
  targetPositionId: string;
  /** 新基本薪资 */
  newBaseSalary?: number;
  /** 新直属上级ID */
  newManagerId?: string;
  /** 生效日期 */
  effectiveDate: string;
  /** 转岗原因 */
  transferReason: string;
  /** 审批信息 */
  approval?: {
    approverIds: string[];
    approvalReason?: string;
  };
}

/**
 * 员工离职请求DTO
 */
export interface EmployeeTerminationDto {
  /** 员工ID */
  employeeId: string;
  /** 离职日期 */
  terminationDate: string;
  /** 离职原因 */
  terminationReason: string;
  /** 离职类型 */
  terminationType: 'voluntary' | 'involuntary' | 'retirement';
  /** 是否符合再雇佣条件 */
  isEligibleForRehire: boolean;
  /** 工作交接信息 */
  handover?: {
    handoverTo?: string;
    handoverItems: string[];
    handoverStatus: 'pending' | 'in_progress' | 'completed';
  };
  /** 审批信息 */
  approval?: {
    approverIds: string[];
    approvalReason?: string;
  };
}

/**
 * 员工选项DTO（用于下拉框等）
 */
export interface EmployeeOptionDto extends OptionDto {
  /** 员工ID */
  value: string; // employeeId
  /** 员工姓名 */
  label: string; // employeeName
  /** 员工编号 */
  employeeNumber?: string;
  /** 部门名称 */
  departmentName?: string;
  /** 职位名称 */
  positionName?: string;
  /** 雇佣状态 */
  status: EmployeeDtoStatus;
}

/**
 * 员工导入预览DTO
 */
export interface EmployeeImportPreviewDto {
  /** 行号 */
  rowNumber: number;
  /** 员工数据 */
  data: CreateEmployeeDto;
  /** 验证结果 */
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  /** 操作类型 */
  operation: 'create' | 'update' | 'skip';
  /** 匹配的现有员工 */
  existingEmployee?: {
    id: string;
    name: string;
    idNumber: string;
  };
}