/**
 * Employee Enhanced 领域实体 - 增强版
 * 
 * 增强的员工实体，包含更丰富的业务规则和领域逻辑
 */

import { BaseEntity } from '../../../../shared/domain/entities/BaseEntity';
import { DomainError, ValidationError } from '../../../../shared/domain/errors/DomainError';
import { ValidationResult } from '../../../../shared/domain/validation/ValidationResult';
import { DomainEvent } from '../../../../shared/domain/events/DomainEvent';
import { Department } from '../../../organization/domain/entities/Department';
import { Position } from '../../../organization/domain/entities/Position';

/**
 * 雇佣状态枚举
 */
export enum EmploymentStatus {
  ACTIVE = 'active',
  PROBATION = 'probation',        // 试用期
  LEAVE = 'leave',                // 请假
  SUSPENDED = 'suspended',        // 停职
  TERMINATED = 'terminated',      // 离职
  RETIRED = 'retired'             // 退休
}

/**
 * 性别枚举
 */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

/**
 * 员工类型枚举
 */
export enum EmployeeType {
  FULL_TIME = 'full_time',        // 全职
  PART_TIME = 'part_time',        // 兼职
  CONTRACT = 'contract',          // 合同工
  INTERN = 'intern',              // 实习生
  CONSULTANT = 'consultant'       // 顾问
}

/**
 * 银行账户信息
 */
export interface BankAccount {
  /** 银行名称 */
  bankName: string;
  /** 账号 */
  accountNumber: string;
  /** 账户持有人姓名 */
  accountHolderName: string;
  /** 支行名称 */
  branchName?: string;
  /** 是否为主账户 */
  isPrimary: boolean;
  /** 生效开始日期 */
  effectiveStartDate: Date;
  /** 生效结束日期 */
  effectiveEndDate?: Date;
}

/**
 * 工作经历记录
 */
export interface JobHistory {
  /** 部门ID */
  departmentId: string;
  /** 职位ID */
  positionId: string;
  /** 开始日期 */
  startDate: Date;
  /** 结束日期 */
  endDate?: Date;
  /** 基本薪资 */
  baseSalary: number;
  /** 变更原因 */
  changeReason?: string;
  /** 是否为当前职位 */
  isCurrent: boolean;
}

/**
 * 绩效评估记录
 */
export interface PerformanceRecord {
  /** 评估期间开始 */
  periodStart: Date;
  /** 评估期间结束 */
  periodEnd: Date;
  /** 总体评分 */
  overallRating: number;
  /** 评分等级 */
  ratingLevel: 'outstanding' | 'excellent' | 'good' | 'satisfactory' | 'needs_improvement';
  /** 目标完成情况 */
  goalAchievement: number;
  /** 评估者ID */
  reviewerId: string;
  /** 评估意见 */
  comments?: string;
  /** 改进建议 */
  improvementAreas?: string[];
  /** 职业发展建议 */
  careerDevelopment?: string;
}

/**
 * 员工统计信息
 */
export interface EmployeeStatistics {
  /** 入职天数 */
  tenureDays: number;
  /** 入职月数 */
  tenureMonths: number;
  /** 入职年数 */
  tenureYears: number;
  /** 平均绩效评分 */
  averagePerformance: number;
  /** 职位变动次数 */
  positionChanges: number;
  /** 薪资调整次数 */
  salaryAdjustments: number;
  /** 当前薪资水平 */
  currentSalaryLevel: 'below_market' | 'market_average' | 'above_market';
}

/**
 * Employee Enhanced 领域实体
 */
export class EmployeeEnhanced extends BaseEntity {
  private _employeeName: string;
  private _idNumber: string;
  private _dateOfBirth?: Date;
  private _gender?: Gender;
  private _hireDate: Date;
  private _employmentStatus: EmploymentStatus;
  private _employeeType: EmployeeType;
  
  // 组织关系
  private _departmentId?: string;
  private _positionId?: string;
  private _managerId?: string;
  private _baseSalary: number;
  
  // 联系信息
  private _email?: string;
  private _phoneNumber?: string;
  private _address?: string;
  private _emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  
  // 银行和薪资信息
  private _bankAccounts: BankAccount[] = [];
  private _taxId?: string;
  private _socialSecurityNumber?: string;
  
  // 工作记录
  private _jobHistory: JobHistory[] = [];
  private _performanceRecords: PerformanceRecord[] = [];
  
  // 离职信息
  private _terminationDate?: Date;
  private _terminationReason?: string;
  private _isEligibleForRehire: boolean = true;
  
  // 关联对象（延迟加载）
  private _department?: Department;
  private _position?: Position;
  private _manager?: EmployeeEnhanced;

  constructor(
    employeeName: string,
    idNumber: string,
    hireDate: Date,
    employmentStatus: EmploymentStatus = EmploymentStatus.PROBATION,
    employeeType: EmployeeType = EmployeeType.FULL_TIME,
    id?: string
  ) {
    super(id);
    this._employeeName = employeeName;
    this._idNumber = idNumber;
    this._hireDate = hireDate;
    this._employmentStatus = employmentStatus;
    this._employeeType = employeeType;
    this._baseSalary = 0;
    
    this.validateEmployeeName(employeeName);
    this.validateIdNumber(idNumber);
    this.validateHireDate(hireDate);

    // 发布员工创建事件
    this.publishEvent('EmployeeCreated', {
      employeeId: this.id,
      employeeName: this._employeeName,
      idNumber: this._idNumber,
      hireDate: this._hireDate,
      employmentStatus: this._employmentStatus,
      employeeType: this._employeeType
    });
  }

  // ==================== Getters ====================

  get employeeName(): string {
    return this._employeeName;
  }

  get idNumber(): string {
    return this._idNumber;
  }

  get dateOfBirth(): Date | undefined {
    return this._dateOfBirth;
  }

  get gender(): Gender | undefined {
    return this._gender;
  }

  get hireDate(): Date {
    return this._hireDate;
  }

  get employmentStatus(): EmploymentStatus {
    return this._employmentStatus;
  }

  get employeeType(): EmployeeType {
    return this._employeeType;
  }

  get departmentId(): string | undefined {
    return this._departmentId;
  }

  get positionId(): string | undefined {
    return this._positionId;
  }

  get managerId(): string | undefined {
    return this._managerId;
  }

  get baseSalary(): number {
    return this._baseSalary;
  }

  get email(): string | undefined {
    return this._email;
  }

  get phoneNumber(): string | undefined {
    return this._phoneNumber;
  }

  get address(): string | undefined {
    return this._address;
  }

  get emergencyContact(): any {
    return this._emergencyContact ? { ...this._emergencyContact } : undefined;
  }

  get bankAccounts(): BankAccount[] {
    return [...this._bankAccounts];
  }

  get taxId(): string | undefined {
    return this._taxId;
  }

  get socialSecurityNumber(): string | undefined {
    return this._socialSecurityNumber;
  }

  get jobHistory(): JobHistory[] {
    return [...this._jobHistory];
  }

  get performanceRecords(): PerformanceRecord[] {
    return [...this._performanceRecords];
  }

  get terminationDate(): Date | undefined {
    return this._terminationDate;
  }

  get terminationReason(): string | undefined {
    return this._terminationReason;
  }

  get isEligibleForRehire(): boolean {
    return this._isEligibleForRehire;
  }

  get department(): Department | undefined {
    return this._department;
  }

  get position(): Position | undefined {
    return this._position;
  }

  get manager(): EmployeeEnhanced | undefined {
    return this._manager;
  }

  // 计算属性
  get age(): number | undefined {
    if (!this._dateOfBirth) return undefined;
    
    const today = new Date();
    const birthDate = this._dateOfBirth;
    let age = today.getFullYear() - birthDate.getFullYear();
    
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  get isActive(): boolean {
    return this._employmentStatus === EmploymentStatus.ACTIVE;
  }

  get isOnProbation(): boolean {
    return this._employmentStatus === EmploymentStatus.PROBATION;
  }

  get isTerminated(): boolean {
    return this._employmentStatus === EmploymentStatus.TERMINATED || 
           this._employmentStatus === EmploymentStatus.RETIRED;
  }

  get primaryBankAccount(): BankAccount | undefined {
    return this._bankAccounts.find(account => account.isPrimary);
  }

  get currentJobHistory(): JobHistory | undefined {
    return this._jobHistory.find(job => job.isCurrent);
  }

  get latestPerformanceRecord(): PerformanceRecord | undefined {
    return this._performanceRecords
      .sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime())[0];
  }

  // ==================== 业务方法 ====================

  /**
   * 更新员工基本信息
   */
  updateBasicInfo(
    employeeName?: string,
    dateOfBirth?: Date,
    gender?: Gender,
    reason?: string
  ): void {
    const oldName = this._employeeName;
    
    if (employeeName !== undefined && employeeName !== this._employeeName) {
      this.validateEmployeeName(employeeName);
      this._employeeName = employeeName;
    }
    
    if (dateOfBirth !== undefined) {
      this.validateDateOfBirth(dateOfBirth);
      this._dateOfBirth = dateOfBirth;
    }
    
    if (gender !== undefined) {
      this._gender = gender;
    }

    this.markAsUpdated();

    if (employeeName && employeeName !== oldName) {
      this.publishEvent('EmployeeBasicInfoUpdated', {
        employeeId: this.id,
        oldName,
        newName: employeeName,
        dateOfBirth: this._dateOfBirth,
        gender: this._gender,
        reason
      });
    }
  }

  /**
   * 更新联系信息
   */
  updateContactInfo(
    email?: string,
    phoneNumber?: string,
    address?: string,
    emergencyContact?: {
      name: string;
      relationship: string;
      phoneNumber: string;
    }
  ): void {
    if (email !== undefined) {
      this.validateEmail(email);
      this._email = email;
    }
    
    if (phoneNumber !== undefined) {
      this.validatePhoneNumber(phoneNumber);
      this._phoneNumber = phoneNumber;
    }
    
    if (address !== undefined) {
      this._address = address;
    }
    
    if (emergencyContact !== undefined) {
      this.validateEmergencyContact(emergencyContact);
      this._emergencyContact = { ...emergencyContact };
    }

    this.markAsUpdated();
    
    this.publishEvent('EmployeeContactInfoUpdated', {
      employeeId: this.id,
      email: this._email,
      phoneNumber: this._phoneNumber,
      address: this._address,
      emergencyContact: this._emergencyContact
    });
  }

  /**
   * 分配职位和部门
   */
  assignPosition(
    departmentId: string,
    positionId: string,
    baseSalary: number,
    effectiveDate: Date = new Date(),
    changeReason?: string
  ): void {
    if (baseSalary < 0) {
      throw new DomainError('基本薪资不能为负数');
    }

    // 结束当前工作记录
    const currentJob = this.currentJobHistory;
    if (currentJob) {
      currentJob.isCurrent = false;
      currentJob.endDate = effectiveDate;
    }

    // 创建新的工作记录
    const newJob: JobHistory = {
      departmentId,
      positionId,
      startDate: effectiveDate,
      baseSalary,
      changeReason,
      isCurrent: true
    };

    this._jobHistory.push(newJob);
    this._departmentId = departmentId;
    this._positionId = positionId;
    this._baseSalary = baseSalary;

    this.markAsUpdated();
    
    this.publishEvent('EmployeePositionAssigned', {
      employeeId: this.id,
      departmentId,
      positionId,
      baseSalary,
      effectiveDate,
      changeReason
    });
  }

  /**
   * 调整薪资
   */
  adjustSalary(
    newSalary: number,
    effectiveDate: Date = new Date(),
    reason?: string
  ): void {
    if (newSalary < 0) {
      throw new DomainError('薪资不能为负数');
    }

    if (!this.isActive && !this.isOnProbation) {
      throw new DomainError('只有在职或试用期员工才能调整薪资');
    }

    const oldSalary = this._baseSalary;
    const currentJob = this.currentJobHistory;
    
    if (!currentJob) {
      throw new DomainError('员工尚未分配职位，无法调整薪资');
    }

    this._baseSalary = newSalary;
    currentJob.baseSalary = newSalary;

    this.markAsUpdated();
    
    this.publishEvent('EmployeeSalaryAdjusted', {
      employeeId: this.id,
      oldSalary,
      newSalary,
      effectiveDate,
      reason,
      adjustmentPercentage: oldSalary > 0 ? ((newSalary - oldSalary) / oldSalary * 100) : 0
    });
  }

  /**
   * 设置管理者
   */
  setManager(managerId: string): void {
    if (managerId === this.id) {
      throw new DomainError('员工不能成为自己的管理者');
    }

    const previousManagerId = this._managerId;
    this._managerId = managerId;
    
    this.markAsUpdated();
    
    this.publishEvent('EmployeeManagerChanged', {
      employeeId: this.id,
      previousManagerId,
      newManagerId: managerId
    });
  }

  /**
   * 移除管理者
   */
  removeManager(): void {
    if (!this._managerId) {
      return; // 已经没有管理者
    }

    const previousManagerId = this._managerId;
    this._managerId = undefined;
    
    this.markAsUpdated();
    
    this.publishEvent('EmployeeManagerRemoved', {
      employeeId: this.id,
      previousManagerId
    });
  }

  /**
   * 转为正式员工（试用期转正）
   */
  confirmEmployment(confirmationDate: Date = new Date(), reason?: string): void {
    if (this._employmentStatus !== EmploymentStatus.PROBATION) {
      throw new DomainError('只有试用期员工才能转正');
    }

    this._employmentStatus = EmploymentStatus.ACTIVE;
    this.markAsUpdated();
    
    this.publishEvent('EmployeeConfirmed', {
      employeeId: this.id,
      confirmationDate,
      reason,
      probationPeriodDays: Math.floor((confirmationDate.getTime() - this._hireDate.getTime()) / (1000 * 60 * 60 * 24))
    });
  }

  /**
   * 员工请假
   */
  grantLeave(
    startDate: Date,
    endDate: Date,
    leaveType: 'annual' | 'sick' | 'maternity' | 'paternity' | 'personal' | 'unpaid',
    reason?: string
  ): void {
    if (!this.isActive && !this.isOnProbation) {
      throw new DomainError('只有在职或试用期员工才能请假');
    }

    if (startDate >= endDate) {
      throw new DomainError('请假开始日期必须早于结束日期');
    }

    this._employmentStatus = EmploymentStatus.LEAVE;
    this.markAsUpdated();
    
    this.publishEvent('EmployeeLeaveGranted', {
      employeeId: this.id,
      startDate,
      endDate,
      leaveType,
      reason,
      leaveDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    });
  }

  /**
   * 员工销假（从请假状态恢复）
   */
  returnFromLeave(returnDate: Date = new Date(), reason?: string): void {
    if (this._employmentStatus !== EmploymentStatus.LEAVE) {
      throw new DomainError('员工当前不在请假状态');
    }

    this._employmentStatus = EmploymentStatus.ACTIVE;
    this.markAsUpdated();
    
    this.publishEvent('EmployeeReturnedFromLeave', {
      employeeId: this.id,
      returnDate,
      reason
    });
  }

  /**
   * 停职
   */
  suspend(
    suspensionDate: Date = new Date(),
    reason: string,
    isEligibleForRehire: boolean = true
  ): void {
    if (this.isTerminated) {
      throw new DomainError('已离职的员工不能停职');
    }

    this._employmentStatus = EmploymentStatus.SUSPENDED;
    this._isEligibleForRehire = isEligibleForRehire;
    this.markAsUpdated();
    
    this.publishEvent('EmployeeSuspended', {
      employeeId: this.id,
      suspensionDate,
      reason,
      isEligibleForRehire
    });
  }

  /**
   * 恢复职务（从停职状态恢复）
   */
  reinstate(reinstateDate: Date = new Date(), reason?: string): void {
    if (this._employmentStatus !== EmploymentStatus.SUSPENDED) {
      throw new DomainError('员工当前不在停职状态');
    }

    this._employmentStatus = EmploymentStatus.ACTIVE;
    this.markAsUpdated();
    
    this.publishEvent('EmployeeReinstated', {
      employeeId: this.id,
      reinstateDate,
      reason
    });
  }

  /**
   * 员工离职
   */
  terminate(
    terminationDate: Date,
    reason: string,
    isEligibleForRehire: boolean = true,
    terminationType: 'voluntary' | 'involuntary' | 'retirement' = 'voluntary'
  ): void {
    if (this.isTerminated) {
      throw new DomainError('员工已处于离职状态');
    }

    if (terminationDate < this._hireDate) {
      throw new DomainError('离职日期不能早于入职日期');
    }

    // 结束当前工作记录
    const currentJob = this.currentJobHistory;
    if (currentJob) {
      currentJob.isCurrent = false;
      currentJob.endDate = terminationDate;
    }

    this._employmentStatus = terminationType === 'retirement' ? 
      EmploymentStatus.RETIRED : EmploymentStatus.TERMINATED;
    this._terminationDate = terminationDate;
    this._terminationReason = reason;
    this._isEligibleForRehire = isEligibleForRehire;

    this.markAsUpdated();
    
    this.publishEvent('EmployeeTerminated', {
      employeeId: this.id,
      terminationDate,
      reason,
      terminationType,
      isEligibleForRehire,
      tenureDays: Math.floor((terminationDate.getTime() - this._hireDate.getTime()) / (1000 * 60 * 60 * 24))
    });
  }

  /**
   * 重新雇佣员工
   */
  rehire(
    rehireDate: Date,
    departmentId: string,
    positionId: string,
    baseSalary: number,
    reason?: string
  ): void {
    if (!this.isTerminated) {
      throw new DomainError('只有离职员工才能重新雇佣');
    }

    if (!this._isEligibleForRehire) {
      throw new DomainError('该员工不符合重新雇佣条件');
    }

    // 重置员工状态
    this._employmentStatus = EmploymentStatus.PROBATION;
    this._hireDate = rehireDate;
    this._terminationDate = undefined;
    this._terminationReason = undefined;

    // 分配新职位
    this.assignPosition(departmentId, positionId, baseSalary, rehireDate, 
      `重新雇佣: ${reason || '重新加入公司'}`);

    this.markAsUpdated();
    
    this.publishEvent('EmployeeRehired', {
      employeeId: this.id,
      rehireDate,
      departmentId,
      positionId,
      baseSalary,
      reason
    });
  }

  /**
   * 添加银行账户
   */
  addBankAccount(bankAccount: Omit<BankAccount, 'isPrimary'> & { isPrimary?: boolean }): void {
    this.validateBankAccount(bankAccount);

    // 如果设置为主账户，将其他账户设为非主账户
    if (bankAccount.isPrimary) {
      this._bankAccounts.forEach(account => {
        account.isPrimary = false;
      });
    }

    const newAccount: BankAccount = {
      ...bankAccount,
      isPrimary: bankAccount.isPrimary || this._bankAccounts.length === 0
    };

    this._bankAccounts.push(newAccount);
    this.markAsUpdated();
    
    this.publishEvent('EmployeeBankAccountAdded', {
      employeeId: this.id,
      bankAccount: newAccount
    });
  }

  /**
   * 移除银行账户
   */
  removeBankAccount(accountNumber: string): void {
    const index = this._bankAccounts.findIndex(account => account.accountNumber === accountNumber);
    if (index === -1) {
      throw new DomainError('银行账户不存在');
    }

    const removedAccount = this._bankAccounts[index];
    this._bankAccounts.splice(index, 1);

    // 如果移除的是主账户，设置下一个账户为主账户
    if (removedAccount.isPrimary && this._bankAccounts.length > 0) {
      this._bankAccounts[0].isPrimary = true;
    }

    this.markAsUpdated();
    
    this.publishEvent('EmployeeBankAccountRemoved', {
      employeeId: this.id,
      accountNumber
    });
  }

  /**
   * 设置主银行账户
   */
  setPrimaryBankAccount(accountNumber: string): void {
    const account = this._bankAccounts.find(acc => acc.accountNumber === accountNumber);
    if (!account) {
      throw new DomainError('银行账户不存在');
    }

    // 设置所有账户为非主账户
    this._bankAccounts.forEach(acc => {
      acc.isPrimary = false;
    });

    // 设置指定账户为主账户
    account.isPrimary = true;
    this.markAsUpdated();
    
    this.publishEvent('EmployeePrimaryBankAccountChanged', {
      employeeId: this.id,
      accountNumber
    });
  }

  /**
   * 添加绩效评估记录
   */
  addPerformanceRecord(record: PerformanceRecord): void {
    this.validatePerformanceRecord(record);

    // 检查评估期间是否重叠
    const overlapping = this._performanceRecords.find(existing => 
      (record.periodStart >= existing.periodStart && record.periodStart <= existing.periodEnd) ||
      (record.periodEnd >= existing.periodStart && record.periodEnd <= existing.periodEnd) ||
      (record.periodStart <= existing.periodStart && record.periodEnd >= existing.periodEnd)
    );

    if (overlapping) {
      throw new DomainError('绩效评估期间与现有记录重叠');
    }

    this._performanceRecords.push({ ...record });
    this.markAsUpdated();
    
    this.publishEvent('EmployeePerformanceRecordAdded', {
      employeeId: this.id,
      record
    });
  }

  /**
   * 更新绩效评估记录
   */
  updatePerformanceRecord(
    periodStart: Date,
    updatedRecord: Partial<Omit<PerformanceRecord, 'periodStart'>>
  ): void {
    const record = this._performanceRecords.find(r => 
      r.periodStart.getTime() === periodStart.getTime()
    );
    
    if (!record) {
      throw new DomainError('绩效评估记录不存在');
    }

    Object.assign(record, updatedRecord);
    this.markAsUpdated();
    
    this.publishEvent('EmployeePerformanceRecordUpdated', {
      employeeId: this.id,
      periodStart,
      updatedRecord
    });
  }

  /**
   * 获取员工统计信息
   */
  getStatistics(): EmployeeStatistics {
    const now = new Date();
    const tenureDays = Math.floor((now.getTime() - this._hireDate.getTime()) / (1000 * 60 * 60 * 24));
    const tenureMonths = Math.floor(tenureDays / 30.44);
    const tenureYears = Math.floor(tenureMonths / 12);

    const averagePerformance = this._performanceRecords.length > 0 ?
      this._performanceRecords.reduce((sum, record) => sum + record.overallRating, 0) / this._performanceRecords.length :
      0;

    const positionChanges = this._jobHistory.length - 1; // 减去初始职位
    const salaryAdjustments = this._jobHistory.filter((job, index) => 
      index > 0 && job.changeReason?.includes('薪资')
    ).length;

    return {
      tenureDays,
      tenureMonths,
      tenureYears,
      averagePerformance,
      positionChanges,
      salaryAdjustments,
      currentSalaryLevel: 'market_average' // 需要外部服务计算
    };
  }

  /**
   * 检查员工是否可以申请特定假期
   */
  canApplyForLeave(
    leaveType: 'annual' | 'sick' | 'maternity' | 'paternity' | 'personal',
    startDate: Date,
    endDate: Date
  ): { canApply: boolean; reason?: string } {
    if (!this.isActive && !this.isOnProbation) {
      return { canApply: false, reason: '只有在职或试用期员工才能申请假期' };
    }

    const tenureMonths = this.getStatistics().tenureMonths;

    switch (leaveType) {
      case 'annual':
        if (tenureMonths < 12) {
          return { canApply: false, reason: '年假需要工作满12个月才能申请' };
        }
        break;
      case 'maternity':
      case 'paternity':
        if (tenureMonths < 6) {
          return { canApply: false, reason: '产假/陪产假需要工作满6个月才能申请' };
        }
        break;
    }

    return { canApply: true };
  }

  // ==================== 验证方法 ====================

  /**
   * 实体验证
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    // 验证员工姓名
    if (!this._employeeName || this._employeeName.trim() === '') {
      errors.push('员工姓名不能为空');
    } else if (this._employeeName.length > 50) {
      errors.push('员工姓名不能超过50个字符');
    }

    // 验证身份证号
    if (!this._idNumber || this._idNumber.trim() === '') {
      errors.push('身份证号不能为空');
    } else if (!this.isValidIdNumber(this._idNumber)) {
      errors.push('身份证号格式不正确');
    }

    // 验证入职日期
    if (this._hireDate > new Date()) {
      errors.push('入职日期不能为未来日期');
    }

    // 验证出生日期
    if (this._dateOfBirth) {
      if (this._dateOfBirth >= new Date()) {
        errors.push('出生日期不能为今天或未来日期');
      }
      
      if (this.age !== undefined && this.age < 16) {
        errors.push('员工年龄不能小于16岁');
      }
      
      if (this.age !== undefined && this.age > 80) {
        errors.push('员工年龄不能大于80岁');
      }
    }

    // 验证邮箱
    if (this._email && !this.isValidEmail(this._email)) {
      errors.push('邮箱格式不正确');
    }

    // 验证手机号
    if (this._phoneNumber && !this.isValidPhoneNumber(this._phoneNumber)) {
      errors.push('手机号格式不正确');
    }

    // 验证离职日期
    if (this._terminationDate && this._terminationDate < this._hireDate) {
      errors.push('离职日期不能早于入职日期');
    }

    // 验证银行账户
    for (const account of this._bankAccounts) {
      const accountValidation = this.validateBankAccount(account, false);
      if (!accountValidation.isValid) {
        errors.push(...accountValidation.errors);
      }
    }

    return ValidationResult.fromErrors(errors);
  }

  // ==================== 私有方法 ====================

  private validateEmployeeName(name: string): void {
    if (!name || name.trim() === '') {
      throw new DomainError('员工姓名不能为空');
    }
    if (name.length > 50) {
      throw new DomainError('员工姓名不能超过50个字符');
    }
  }

  private validateIdNumber(idNumber: string): void {
    if (!idNumber || idNumber.trim() === '') {
      throw new DomainError('身份证号不能为空');
    }
    if (!this.isValidIdNumber(idNumber)) {
      throw new DomainError('身份证号格式不正确');
    }
  }

  private validateHireDate(hireDate: Date): void {
    if (hireDate > new Date()) {
      throw new DomainError('入职日期不能为未来日期');
    }
  }

  private validateDateOfBirth(dateOfBirth: Date): void {
    if (dateOfBirth >= new Date()) {
      throw new DomainError('出生日期不能为今天或未来日期');
    }
    
    const age = new Date().getFullYear() - dateOfBirth.getFullYear();
    if (age < 16) {
      throw new DomainError('员工年龄不能小于16岁');
    }
    if (age > 80) {
      throw new DomainError('员工年龄不能大于80岁');
    }
  }

  private validateEmail(email: string): void {
    if (!this.isValidEmail(email)) {
      throw new DomainError('邮箱格式不正确');
    }
  }

  private validatePhoneNumber(phoneNumber: string): void {
    if (!this.isValidPhoneNumber(phoneNumber)) {
      throw new DomainError('手机号格式不正确');
    }
  }

  private validateEmergencyContact(contact: {
    name: string;
    relationship: string;
    phoneNumber: string;
  }): void {
    if (!contact.name || contact.name.trim() === '') {
      throw new DomainError('紧急联系人姓名不能为空');
    }
    if (!contact.relationship || contact.relationship.trim() === '') {
      throw new DomainError('紧急联系人关系不能为空');
    }
    if (!this.isValidPhoneNumber(contact.phoneNumber)) {
      throw new DomainError('紧急联系人电话格式不正确');
    }
  }

  private validateBankAccount(
    account: Partial<BankAccount>, 
    throwError: boolean = true
  ): ValidationResult {
    const errors: string[] = [];

    if (!account.bankName || account.bankName.trim() === '') {
      errors.push('银行名称不能为空');
    }

    if (!account.accountNumber || account.accountNumber.trim() === '') {
      errors.push('银行账号不能为空');
    } else if (!/^[0-9]{10,25}$/.test(account.accountNumber)) {
      errors.push('银行账号格式不正确');
    }

    if (!account.accountHolderName || account.accountHolderName.trim() === '') {
      errors.push('账户持有人姓名不能为空');
    }

    if (!account.effectiveStartDate) {
      errors.push('银行账户生效日期不能为空');
    }

    const result = ValidationResult.fromErrors(errors);
    
    if (throwError && !result.isValid) {
      throw new ValidationError(result.errors);
    }

    return result;
  }

  private validatePerformanceRecord(record: PerformanceRecord): void {
    if (record.periodStart >= record.periodEnd) {
      throw new DomainError('绩效评估期间开始日期必须早于结束日期');
    }

    if (record.overallRating < 0 || record.overallRating > 5) {
      throw new DomainError('总体评分必须在0-5之间');
    }

    if (record.goalAchievement < 0 || record.goalAchievement > 100) {
      throw new DomainError('目标完成情况必须在0-100之间');
    }

    if (!record.reviewerId || record.reviewerId.trim() === '') {
      throw new DomainError('评估者ID不能为空');
    }
  }

  private isValidIdNumber(idNumber: string): boolean {
    // 简化的身份证号验证（18位）
    return /^\d{17}[\dXx]$/.test(idNumber);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // 简化的手机号验证
    return /^1[3-9]\d{9}$/.test(phoneNumber);
  }

  // ==================== 关联对象管理 ====================

  setDepartment(department: Department): void {
    this._department = department;
  }

  setPosition(position: Position): void {
    this._position = position;
  }

  setManager(manager: EmployeeEnhanced): void {
    this._manager = manager;
  }
}