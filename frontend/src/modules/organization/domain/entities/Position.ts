/**
 * Position 领域实体
 * 
 * 职位实体负责管理岗位信息，包括职级、薪资范围、职责描述等
 */

import { BaseEntity } from '../../../../shared/domain/entities/BaseEntity';
import { DomainError } from '../../../../shared/domain/errors/DomainError';
import { ValidationResult } from '../../../../shared/domain/validation/ValidationResult';

/**
 * 职位状态枚举
 */
export enum PositionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

/**
 * 职位类型枚举
 */
export enum PositionType {
  FULL_TIME = 'full_time',      // 全职
  PART_TIME = 'part_time',      // 兼职
  CONTRACT = 'contract',        // 合同工
  INTERN = 'intern',           // 实习生
  CONSULTANT = 'consultant'     // 顾问
}

/**
 * 职位级别枚举
 */
export enum PositionLevel {
  ENTRY = 'entry',             // 入门级
  JUNIOR = 'junior',           // 初级
  INTERMEDIATE = 'intermediate', // 中级
  SENIOR = 'senior',           // 高级
  LEAD = 'lead',               // 主管级
  MANAGER = 'manager',         // 经理级
  DIRECTOR = 'director',       // 总监级
  VP = 'vp',                   // 副总裁级
  C_LEVEL = 'c_level'          // C级高管
}

/**
 * 薪资范围
 */
export interface SalaryRange {
  /** 最低薪资 */
  minSalary: number;
  /** 最高薪资 */
  maxSalary: number;
  /** 薪资类型（月薪、年薪等） */
  salaryType: 'monthly' | 'annual' | 'hourly';
  /** 货币单位 */
  currency: string;
}

/**
 * 职位要求
 */
export interface PositionRequirements {
  /** 教育要求 */
  education: string[];
  /** 工作经验年限 */
  experienceYears: number;
  /** 必需技能 */
  requiredSkills: string[];
  /** 优选技能 */
  preferredSkills: string[];
  /** 语言要求 */
  languages: string[];
  /** 证书要求 */
  certifications: string[];
}

/**
 * 职位统计信息
 */
export interface PositionStatistics {
  /** 在职员工数 */
  currentEmployees: number;
  /** 职位预算人数 */
  budgetedHeadcount: number;
  /** 空缺数量 */
  openings: number;
  /** 平均薪资 */
  averageSalary: number;
  /** 平均任职时长（月） */
  averageTenure: number;
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * Position 领域实体
 */
export class Position extends BaseEntity {
  private _name: string;
  private _description?: string;
  private _departmentId?: string;
  private _status: PositionStatus;
  private _type: PositionType;
  private _level: PositionLevel;
  private _salaryRange?: SalaryRange;
  private _requirements?: PositionRequirements;
  private _responsibilities: string[];
  private _reportsToPositionId?: string;
  private _budgetedHeadcount: number;
  private _isRemoteWork: boolean;
  private _metadata: Record<string, any>;

  // 关联数据（延迟加载）
  private _currentEmployeeCount: number = 0;

  constructor(
    name: string,
    level: PositionLevel,
    type: PositionType = PositionType.FULL_TIME,
    departmentId?: string,
    id?: string
  ) {
    super(id);
    this._name = name;
    this._level = level;
    this._type = type;
    this._departmentId = departmentId;
    this._status = PositionStatus.ACTIVE;
    this._responsibilities = [];
    this._budgetedHeadcount = 1;
    this._isRemoteWork = false;
    this._metadata = {};
    
    this.validateName(name);
  }

  // ==================== Getters ====================

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  get departmentId(): string | undefined {
    return this._departmentId;
  }

  get status(): PositionStatus {
    return this._status;
  }

  get type(): PositionType {
    return this._type;
  }

  get level(): PositionLevel {
    return this._level;
  }

  get salaryRange(): SalaryRange | undefined {
    return this._salaryRange ? { ...this._salaryRange } : undefined;
  }

  get requirements(): PositionRequirements | undefined {
    return this._requirements ? { 
      ...this._requirements,
      education: [...this._requirements.education],
      requiredSkills: [...this._requirements.requiredSkills],
      preferredSkills: [...this._requirements.preferredSkills],
      languages: [...this._requirements.languages],
      certifications: [...this._requirements.certifications]
    } : undefined;
  }

  get responsibilities(): string[] {
    return [...this._responsibilities];
  }

  get reportsToPositionId(): string | undefined {
    return this._reportsToPositionId;
  }

  get budgetedHeadcount(): number {
    return this._budgetedHeadcount;
  }

  get isRemoteWork(): boolean {
    return this._isRemoteWork;
  }

  get metadata(): Record<string, any> {
    return { ...this._metadata };
  }

  get currentEmployeeCount(): number {
    return this._currentEmployeeCount;
  }

  get openings(): number {
    return Math.max(0, this._budgetedHeadcount - this._currentEmployeeCount);
  }

  get isOverBudget(): boolean {
    return this._currentEmployeeCount > this._budgetedHeadcount;
  }

  // ==================== 业务方法 ====================

  /**
   * 更新职位基本信息
   */
  updateBasicInfo(
    name: string, 
    description?: string, 
    level?: PositionLevel,
    type?: PositionType
  ): void {
    this.validateName(name);
    
    this._name = name;
    if (description !== undefined) {
      this._description = description;
    }
    if (level !== undefined) {
      this._level = level;
    }
    if (type !== undefined) {
      this._type = type;
    }
    
    this.markAsUpdated();
    this.publishEvent('PositionUpdated', {
      positionId: this.id,
      name: this._name,
      description: this._description,
      level: this._level,
      type: this._type
    });
  }

  /**
   * 设置所属部门
   */
  setDepartment(departmentId: string): void {
    if (!departmentId || departmentId.trim() === '') {
      throw new DomainError('部门ID不能为空');
    }

    if (departmentId === this._departmentId) {
      return; // 没有变化
    }

    const previousDepartmentId = this._departmentId;
    this._departmentId = departmentId;
    
    this.markAsUpdated();
    this.publishEvent('PositionDepartmentChanged', {
      positionId: this.id,
      previousDepartmentId,
      newDepartmentId: departmentId
    });
  }

  /**
   * 设置薪资范围
   */
  setSalaryRange(salaryRange: SalaryRange): void {
    this.validateSalaryRange(salaryRange);
    
    this._salaryRange = { ...salaryRange };
    this.markAsUpdated();
    this.publishEvent('PositionSalaryRangeUpdated', {
      positionId: this.id,
      salaryRange: this._salaryRange
    });
  }

  /**
   * 设置职位要求
   */
  setRequirements(requirements: PositionRequirements): void {
    this.validateRequirements(requirements);
    
    this._requirements = {
      education: [...requirements.education],
      experienceYears: requirements.experienceYears,
      requiredSkills: [...requirements.requiredSkills],
      preferredSkills: [...requirements.preferredSkills],
      languages: [...requirements.languages],
      certifications: [...requirements.certifications]
    };
    
    this.markAsUpdated();
    this.publishEvent('PositionRequirementsUpdated', {
      positionId: this.id,
      requirements: this._requirements
    });
  }

  /**
   * 设置职责列表
   */
  setResponsibilities(responsibilities: string[]): void {
    const validResponsibilities = responsibilities
      .map(r => r.trim())
      .filter(r => r.length > 0);
    
    if (validResponsibilities.length === 0) {
      throw new DomainError('职位至少需要一项职责描述');
    }

    this._responsibilities = validResponsibilities;
    this.markAsUpdated();
    this.publishEvent('PositionResponsibilitiesUpdated', {
      positionId: this.id,
      responsibilities: this._responsibilities
    });
  }

  /**
   * 添加职责
   */
  addResponsibility(responsibility: string): void {
    const trimmed = responsibility.trim();
    if (!trimmed) {
      throw new DomainError('职责描述不能为空');
    }

    if (this._responsibilities.includes(trimmed)) {
      return; // 已存在
    }

    this._responsibilities.push(trimmed);
    this.markAsUpdated();
    this.publishEvent('PositionResponsibilityAdded', {
      positionId: this.id,
      responsibility: trimmed
    });
  }

  /**
   * 移除职责
   */
  removeResponsibility(responsibility: string): void {
    const index = this._responsibilities.indexOf(responsibility);
    if (index >= 0) {
      this._responsibilities.splice(index, 1);
      this.markAsUpdated();
      this.publishEvent('PositionResponsibilityRemoved', {
        positionId: this.id,
        responsibility
      });
    }
  }

  /**
   * 设置汇报关系
   */
  setReportsTo(positionId: string): void {
    if (positionId === this.id) {
      throw new DomainError('职位不能向自己汇报');
    }

    const previousReportsTo = this._reportsToPositionId;
    this._reportsToPositionId = positionId;
    
    this.markAsUpdated();
    this.publishEvent('PositionReportingChanged', {
      positionId: this.id,
      previousReportsTo,
      newReportsTo: positionId
    });
  }

  /**
   * 移除汇报关系
   */
  removeReportsTo(): void {
    if (!this._reportsToPositionId) {
      return; // 已经没有汇报关系
    }

    const previousReportsTo = this._reportsToPositionId;
    this._reportsToPositionId = undefined;
    
    this.markAsUpdated();
    this.publishEvent('PositionReportingRemoved', {
      positionId: this.id,
      previousReportsTo
    });
  }

  /**
   * 设置预算人数
   */
  setBudgetedHeadcount(count: number): void {
    if (count < 0) {
      throw new DomainError('预算人数不能为负数');
    }

    if (count !== Math.floor(count)) {
      throw new DomainError('预算人数必须是整数');
    }

    const previousCount = this._budgetedHeadcount;
    this._budgetedHeadcount = count;
    
    this.markAsUpdated();
    this.publishEvent('PositionBudgetedHeadcountChanged', {
      positionId: this.id,
      previousCount,
      newCount: count,
      openings: this.openings
    });
  }

  /**
   * 设置远程工作标志
   */
  setRemoteWork(isRemote: boolean): void {
    if (this._isRemoteWork === isRemote) {
      return; // 没有变化
    }

    this._isRemoteWork = isRemote;
    this.markAsUpdated();
    this.publishEvent('PositionRemoteWorkChanged', {
      positionId: this.id,
      isRemoteWork: isRemote
    });
  }

  /**
   * 激活职位
   */
  activate(): void {
    if (this._status === PositionStatus.ACTIVE) {
      return; // 已经是激活状态
    }

    this._status = PositionStatus.ACTIVE;
    this.markAsUpdated();
    this.publishEvent('PositionActivated', {
      positionId: this.id
    });
  }

  /**
   * 停用职位
   */
  deactivate(): void {
    if (this._status === PositionStatus.INACTIVE) {
      return; // 已经是停用状态
    }

    // 检查是否有在职员工
    if (this._currentEmployeeCount > 0) {
      throw new DomainError('有员工在职的职位不能被停用，请先转移员工');
    }

    this._status = PositionStatus.INACTIVE;
    this.markAsUpdated();
    this.publishEvent('PositionDeactivated', {
      positionId: this.id
    });
  }

  /**
   * 归档职位
   */
  archive(): void {
    if (this._status === PositionStatus.ARCHIVED) {
      return; // 已经是归档状态
    }

    // 只有停用的职位才能归档
    if (this._status !== PositionStatus.INACTIVE) {
      throw new DomainError('只有停用的职位才能被归档');
    }

    this._status = PositionStatus.ARCHIVED;
    this.markAsUpdated();
    this.publishEvent('PositionArchived', {
      positionId: this.id
    });
  }

  /**
   * 设置元数据
   */
  setMetadata(key: string, value: any): void {
    this._metadata[key] = value;
    this.markAsUpdated();
  }

  /**
   * 获取元数据
   */
  getMetadata(key: string): any {
    return this._metadata[key];
  }

  /**
   * 设置当前员工数量
   */
  setCurrentEmployeeCount(count: number): void {
    if (count < 0) {
      throw new DomainError('员工数量不能为负数');
    }

    this._currentEmployeeCount = count;
  }

  /**
   * 获取职位统计信息
   */
  getStatistics(): PositionStatistics {
    return {
      currentEmployees: this._currentEmployeeCount,
      budgetedHeadcount: this._budgetedHeadcount,
      openings: this.openings,
      averageSalary: 0, // 需要从外部服务计算
      averageTenure: 0, // 需要从外部服务计算
      lastUpdated: this.updatedAt
    };
  }

  /**
   * 检查候选人是否符合要求
   */
  checkCandidateQualification(candidate: {
    education: string;
    experienceYears: number;
    skills: string[];
    languages: string[];
    certifications: string[];
  }): {
    isQualified: boolean;
    missingRequirements: string[];
    score: number; // 匹配度评分 0-100
  } {
    if (!this._requirements) {
      return { isQualified: true, missingRequirements: [], score: 100 };
    }

    const missing: string[] = [];
    let score = 0;
    let totalCriteria = 0;

    // 检查教育要求
    if (this._requirements.education.length > 0) {
      totalCriteria++;
      const hasRequiredEducation = this._requirements.education.some(edu => 
        candidate.education.toLowerCase().includes(edu.toLowerCase())
      );
      if (hasRequiredEducation) {
        score += 20;
      } else {
        missing.push(`教育要求: ${this._requirements.education.join(' 或 ')}`);
      }
    }

    // 检查工作经验
    totalCriteria++;
    if (candidate.experienceYears >= this._requirements.experienceYears) {
      score += 20;
    } else {
      missing.push(`工作经验: 至少${this._requirements.experienceYears}年`);
    }

    // 检查必需技能
    if (this._requirements.requiredSkills.length > 0) {
      totalCriteria++;
      const hasRequiredSkills = this._requirements.requiredSkills.every(skill =>
        candidate.skills.some(cs => cs.toLowerCase().includes(skill.toLowerCase()))
      );
      if (hasRequiredSkills) {
        score += 30;
      } else {
        const missingSkills = this._requirements.requiredSkills.filter(skill =>
          !candidate.skills.some(cs => cs.toLowerCase().includes(skill.toLowerCase()))
        );
        missing.push(`必需技能: ${missingSkills.join(', ')}`);
      }
    }

    // 检查语言要求
    if (this._requirements.languages.length > 0) {
      totalCriteria++;
      const hasRequiredLanguages = this._requirements.languages.every(lang =>
        candidate.languages.some(cl => cl.toLowerCase().includes(lang.toLowerCase()))
      );
      if (hasRequiredLanguages) {
        score += 15;
      } else {
        const missingLanguages = this._requirements.languages.filter(lang =>
          !candidate.languages.some(cl => cl.toLowerCase().includes(lang.toLowerCase()))
        );
        missing.push(`语言要求: ${missingLanguages.join(', ')}`);
      }
    }

    // 检查证书要求
    if (this._requirements.certifications.length > 0) {
      totalCriteria++;
      const hasRequiredCertifications = this._requirements.certifications.every(cert =>
        candidate.certifications.some(cc => cc.toLowerCase().includes(cert.toLowerCase()))
      );
      if (hasRequiredCertifications) {
        score += 15;
      } else {
        const missingCertifications = this._requirements.certifications.filter(cert =>
          !candidate.certifications.some(cc => cc.toLowerCase().includes(cert.toLowerCase()))
        );
        missing.push(`证书要求: ${missingCertifications.join(', ')}`);
      }
    }

    const finalScore = totalCriteria > 0 ? Math.round(score / totalCriteria * 5) : 100;
    
    return {
      isQualified: missing.length === 0,
      missingRequirements: missing,
      score: Math.min(100, finalScore)
    };
  }

  // ==================== 验证方法 ====================

  /**
   * 实体验证
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    // 验证名称
    if (!this._name || this._name.trim() === '') {
      errors.push('职位名称不能为空');
    } else if (this._name.length > 100) {
      errors.push('职位名称不能超过100个字符');
    }

    // 验证描述
    if (this._description && this._description.length > 1000) {
      errors.push('职位描述不能超过1000个字符');
    }

    // 验证薪资范围
    if (this._salaryRange) {
      const salaryValidation = this.validateSalaryRange(this._salaryRange, false);
      if (!salaryValidation.isValid) {
        errors.push(...salaryValidation.errors);
      }
    }

    // 验证职位要求
    if (this._requirements) {
      const requirementsValidation = this.validateRequirements(this._requirements, false);
      if (!requirementsValidation.isValid) {
        errors.push(...requirementsValidation.errors);
      }
    }

    // 验证预算人数
    if (this._budgetedHeadcount < 0) {
      errors.push('预算人数不能为负数');
    }

    // 验证职责
    if (this._responsibilities.length === 0) {
      errors.push('职位至少需要一项职责描述');
    }

    return ValidationResult.fromErrors(errors);
  }

  // ==================== 私有方法 ====================

  /**
   * 验证职位名称
   */
  private validateName(name: string): void {
    if (!name || name.trim() === '') {
      throw new DomainError('职位名称不能为空');
    }

    if (name.length > 100) {
      throw new DomainError('职位名称不能超过100个字符');
    }
  }

  /**
   * 验证薪资范围
   */
  private validateSalaryRange(salaryRange: SalaryRange, throwError: boolean = true): ValidationResult {
    const errors: string[] = [];

    if (salaryRange.minSalary < 0) {
      errors.push('最低薪资不能为负数');
    }

    if (salaryRange.maxSalary < 0) {
      errors.push('最高薪资不能为负数');
    }

    if (salaryRange.minSalary > salaryRange.maxSalary) {
      errors.push('最低薪资不能高于最高薪资');
    }

    if (!salaryRange.currency || salaryRange.currency.trim() === '') {
      errors.push('货币单位不能为空');
    }

    const result = ValidationResult.fromErrors(errors);
    
    if (throwError && !result.isValid) {
      throw new DomainError(result.firstError || '薪资范围验证失败');
    }

    return result;
  }

  /**
   * 验证职位要求
   */
  private validateRequirements(requirements: PositionRequirements, throwError: boolean = true): ValidationResult {
    const errors: string[] = [];

    if (requirements.experienceYears < 0) {
      errors.push('工作经验年限不能为负数');
    }

    if (requirements.experienceYears > 50) {
      errors.push('工作经验年限不能超过50年');
    }

    const result = ValidationResult.fromErrors(errors);
    
    if (throwError && !result.isValid) {
      throw new DomainError(result.firstError || '职位要求验证失败');
    }

    return result;
  }
}