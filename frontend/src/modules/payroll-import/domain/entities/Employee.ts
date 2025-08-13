/**
 * Employee Domain实体
 * 
 * 员工领域实体，包含业务规则验证和领域事件
 */

import { BaseEntity, ValidationResult } from '../../../../shared/domain/entities/BaseEntity';
import { DomainEvent } from '../../../../shared/domain/events/DomainEvent';
import { BusinessRuleError } from '../../../../shared/domain/errors/DomainError';

/**
 * 员工状态枚举
 */
export enum EmploymentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TERMINATED = 'terminated',
  ON_LEAVE = 'on_leave'
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
 * 员工银行账户
 */
export interface EmployeeBankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  branchName?: string;
  isPrimary: boolean;
  effectiveStartDate: Date;
  effectiveEndDate?: Date;
}

/**
 * 员工职位信息
 */
export interface EmployeePosition {
  departmentId: string;
  departmentName: string;
  positionId: string;
  positionName: string;
  categoryId: string;
  categoryName: string;
  effectiveStartDate: Date;
  effectiveEndDate?: Date;
}

/**
 * 员工领域实体
 */
export class Employee extends BaseEntity {
  private _employeeName: string;
  private _idNumber: string;
  private _employmentStatus: EmploymentStatus;
  private _hireDate: Date;
  private _terminationDate?: Date;
  private _dateOfBirth?: Date;
  private _gender?: Gender;
  private _managerId?: string;
  private _userId?: string;
  
  // 关联实体
  private _bankAccounts: EmployeeBankAccount[] = [];
  private _currentPosition?: EmployeePosition;

  constructor(
    employeeName: string,
    idNumber: string,
    hireDate: Date,
    employmentStatus: EmploymentStatus = EmploymentStatus.ACTIVE,
    id?: string
  ) {
    super(id);
    this._employeeName = employeeName;
    this._idNumber = idNumber;
    this._hireDate = hireDate;
    this._employmentStatus = employmentStatus;
  }

  // ==================== 访问器 ====================

  get employeeName(): string {
    return this._employeeName;
  }

  get idNumber(): string {
    return this._idNumber;
  }

  get employmentStatus(): EmploymentStatus {
    return this._employmentStatus;
  }

  get hireDate(): Date {
    return this._hireDate;
  }

  get terminationDate(): Date | undefined {
    return this._terminationDate;
  }

  get dateOfBirth(): Date | undefined {
    return this._dateOfBirth;
  }

  get gender(): Gender | undefined {
    return this._gender;
  }

  get managerId(): string | undefined {
    return this._managerId;
  }

  get userId(): string | undefined {
    return this._userId;
  }

  get bankAccounts(): EmployeeBankAccount[] {
    return [...this._bankAccounts];
  }

  get currentPosition(): EmployeePosition | undefined {
    return this._currentPosition ? { ...this._currentPosition } : undefined;
  }

  get primaryBankAccount(): EmployeeBankAccount | undefined {
    return this._bankAccounts.find(account => account.isPrimary);
  }

  get isActiveEmployee(): boolean {
    return this._employmentStatus === EmploymentStatus.ACTIVE && this.isActive;
  }

  get age(): number | undefined {
    if (!this._dateOfBirth) return undefined;
    
    const today = new Date();
    const birthDate = new Date(this._dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // ==================== 业务方法 ====================

  /**
   * 更新员工基本信息
   */
  updateBasicInfo(
    employeeName?: string,
    dateOfBirth?: Date,
    gender?: Gender
  ): void {
    const oldName = this._employeeName;
    
    if (employeeName !== undefined) {
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
      this.addDomainEvent(new DomainEvent(
        'EmployeeNameChanged',
        { oldName, newName: employeeName },
        this.id,
        'Employee'
      ));
    }
  }

  /**
   * 设置管理者
   */
  setManager(managerId?: string): void {
    if (managerId === this.id) {
      throw new BusinessRuleError('员工不能是自己的管理者', 'SELF_MANAGER_NOT_ALLOWED');
    }

    const oldManagerId = this._managerId;
    this._managerId = managerId;
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'EmployeeManagerChanged',
      { oldManagerId, newManagerId: managerId },
      this.id,
      'Employee'
    ));
  }

  /**
   * 设置用户关联
   */
  setUser(userId?: string): void {
    this._userId = userId;
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'EmployeeUserLinked',
      { userId },
      this.id,
      'Employee'
    ));
  }

  /**
   * 终止雇佣关系
   */
  terminate(terminationDate: Date, reason?: string): void {
    if (this._employmentStatus === EmploymentStatus.TERMINATED) {
      throw new BusinessRuleError('员工已经被终止雇佣', 'ALREADY_TERMINATED');
    }

    if (terminationDate < this._hireDate) {
      throw new BusinessRuleError('终止日期不能早于雇佣日期', 'INVALID_TERMINATION_DATE');
    }

    this._terminationDate = terminationDate;
    this._employmentStatus = EmploymentStatus.TERMINATED;
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'EmployeeTerminated',
      { terminationDate, reason },
      this.id,
      'Employee'
    ));
  }

  /**
   * 恢复雇佣关系
   */
  reinstate(): void {
    if (this._employmentStatus !== EmploymentStatus.TERMINATED) {
      throw new BusinessRuleError('只有被终止的员工才能恢复雇佣', 'NOT_TERMINATED');
    }

    this._terminationDate = undefined;
    this._employmentStatus = EmploymentStatus.ACTIVE;
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'EmployeeReinstated',
      {},
      this.id,
      'Employee'
    ));
  }

  /**
   * 更新雇佣状态
   */
  updateEmploymentStatus(status: EmploymentStatus): void {
    if (this._employmentStatus === status) {
      return;
    }

    const oldStatus = this._employmentStatus;
    this._employmentStatus = status;
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'EmployeeStatusChanged',
      { oldStatus, newStatus: status },
      this.id,
      'Employee'
    ));
  }

  /**
   * 添加银行账户
   */
  addBankAccount(bankAccount: Omit<EmployeeBankAccount, 'id'>): void {
    // 验证银行账户
    this.validateBankAccount(bankAccount);

    // 如果是主账户，将其他账户设为非主账户
    if (bankAccount.isPrimary) {
      this._bankAccounts.forEach(account => {
        account.isPrimary = false;
      });
    }

    const newAccount: EmployeeBankAccount = {
      ...bankAccount,
      id: crypto.randomUUID()
    };

    this._bankAccounts.push(newAccount);
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'EmployeeBankAccountAdded',
      { accountId: newAccount.id, bankName: newAccount.bankName, isPrimary: newAccount.isPrimary },
      this.id,
      'Employee'
    ));
  }

  /**
   * 更新银行账户
   */
  updateBankAccount(accountId: string, updates: Partial<EmployeeBankAccount>): void {
    const accountIndex = this._bankAccounts.findIndex(account => account.id === accountId);
    if (accountIndex === -1) {
      throw new BusinessRuleError('银行账户不存在', 'BANK_ACCOUNT_NOT_FOUND');
    }

    const account = this._bankAccounts[accountIndex];
    
    // 如果设置为主账户，将其他账户设为非主账户
    if (updates.isPrimary && !account.isPrimary) {
      this._bankAccounts.forEach((acc, index) => {
        if (index !== accountIndex) {
          acc.isPrimary = false;
        }
      });
    }

    Object.assign(account, updates);
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'EmployeeBankAccountUpdated',
      { accountId, updates },
      this.id,
      'Employee'
    ));
  }

  /**
   * 删除银行账户
   */
  removeBankAccount(accountId: string): void {
    const accountIndex = this._bankAccounts.findIndex(account => account.id === accountId);
    if (accountIndex === -1) {
      throw new BusinessRuleError('银行账户不存在', 'BANK_ACCOUNT_NOT_FOUND');
    }

    const account = this._bankAccounts[accountIndex];
    this._bankAccounts.splice(accountIndex, 1);
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'EmployeeBankAccountRemoved',
      { accountId, bankName: account.bankName },
      this.id,
      'Employee'
    ));
  }

  /**
   * 设置当前职位
   */
  setCurrentPosition(position: EmployeePosition): void {
    this._currentPosition = { ...position };
    this.markAsUpdated();

    this.addDomainEvent(new DomainEvent(
      'EmployeePositionChanged',
      { position },
      this.id,
      'Employee'
    ));
  }

  // ==================== 验证方法 ====================

  /**
   * 验证员工实体
   */
  validate(): ValidationResult {
    const baseValidation = this.validateBaseRules();
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    const errors = [];

    // 验证员工姓名
    try {
      this.validateEmployeeName(this._employeeName);
    } catch (error) {
      errors.push({
        field: 'employeeName',
        message: (error as Error).message,
        code: 'INVALID_EMPLOYEE_NAME'
      });
    }

    // 验证身份证号
    try {
      this.validateIdNumber(this._idNumber);
    } catch (error) {
      errors.push({
        field: 'idNumber',
        message: (error as Error).message,
        code: 'INVALID_ID_NUMBER'
      });
    }

    // 验证雇佣日期
    try {
      this.validateHireDate(this._hireDate);
    } catch (error) {
      errors.push({
        field: 'hireDate',
        message: (error as Error).message,
        code: 'INVALID_HIRE_DATE'
      });
    }

    // 验证出生日期
    if (this._dateOfBirth) {
      try {
        this.validateDateOfBirth(this._dateOfBirth);
      } catch (error) {
        errors.push({
          field: 'dateOfBirth',
          message: (error as Error).message,
          code: 'INVALID_DATE_OF_BIRTH'
        });
      }
    }

    // 验证终止日期
    if (this._terminationDate) {
      if (this._terminationDate < this._hireDate) {
        errors.push({
          field: 'terminationDate',
          message: '终止日期不能早于雇佣日期',
          code: 'INVALID_TERMINATION_DATE'
        });
      }
    }

    // 验证银行账户
    this._bankAccounts.forEach((account, index) => {
      try {
        this.validateBankAccount(account);
      } catch (error) {
        errors.push({
          field: `bankAccounts[${index}]`,
          message: (error as Error).message,
          code: 'INVALID_BANK_ACCOUNT'
        });
      }
    });

    return errors.length > 0 
      ? ValidationResult.failure(errors)
      : ValidationResult.success();
  }

  /**
   * 验证员工姓名
   */
  private validateEmployeeName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('员工姓名不能为空');
    }

    if (name.trim().length < 2) {
      throw new Error('员工姓名至少需要2个字符');
    }

    if (name.trim().length > 50) {
      throw new Error('员工姓名不能超过50个字符');
    }
  }

  /**
   * 验证身份证号
   */
  private validateIdNumber(idNumber: string): void {
    if (!idNumber || idNumber.trim().length === 0) {
      throw new Error('身份证号不能为空');
    }

    // 简单的身份证号验证（15位或18位）
    const idPattern = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$|^[1-9]\d{5}\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}$/;
    
    if (!idPattern.test(idNumber)) {
      throw new Error('身份证号格式不正确');
    }
  }

  /**
   * 验证雇佣日期
   */
  private validateHireDate(hireDate: Date): void {
    if (!hireDate) {
      throw new Error('雇佣日期不能为空');
    }

    const now = new Date();
    if (hireDate > now) {
      throw new Error('雇佣日期不能是未来日期');
    }

    // 不能超过100年前
    const hundredYearsAgo = new Date();
    hundredYearsAgo.setFullYear(now.getFullYear() - 100);
    if (hireDate < hundredYearsAgo) {
      throw new Error('雇佣日期不能超过100年前');
    }
  }

  /**
   * 验证出生日期
   */
  private validateDateOfBirth(dateOfBirth: Date): void {
    if (!dateOfBirth) {
      throw new Error('出生日期不能为空');
    }

    const now = new Date();
    if (dateOfBirth > now) {
      throw new Error('出生日期不能是未来日期');
    }

    // 年龄不能超过120岁
    const age = now.getFullYear() - dateOfBirth.getFullYear();
    if (age > 120) {
      throw new Error('年龄不能超过120岁');
    }

    // 年龄不能小于16岁
    if (age < 16) {
      throw new Error('年龄不能小于16岁');
    }
  }

  /**
   * 验证银行账户
   */
  private validateBankAccount(account: Partial<EmployeeBankAccount>): void {
    if (!account.bankName || account.bankName.trim().length === 0) {
      throw new Error('银行名称不能为空');
    }

    if (!account.accountNumber || account.accountNumber.trim().length === 0) {
      throw new Error('银行账号不能为空');
    }

    if (!account.accountHolderName || account.accountHolderName.trim().length === 0) {
      throw new Error('账户持有人姓名不能为空');
    }

    // 银行账号格式验证（简单验证）
    if (!/^\d{10,30}$/.test(account.accountNumber)) {
      throw new Error('银行账号格式不正确（应为10-30位数字）');
    }
  }

  /**
   * 克隆员工实体
   */
  clone(): Employee {
    const cloned = new Employee(
      this._employeeName,
      this._idNumber,
      this._hireDate,
      this._employmentStatus
    );

    // 复制其他属性
    cloned._dateOfBirth = this._dateOfBirth;
    cloned._gender = this._gender;
    cloned._managerId = this._managerId;
    cloned._userId = this._userId;
    cloned._terminationDate = this._terminationDate;
    
    // 深拷贝银行账户
    cloned._bankAccounts = this._bankAccounts.map(account => ({ ...account }));
    
    // 复制当前职位
    if (this._currentPosition) {
      cloned._currentPosition = { ...this._currentPosition };
    }

    return cloned;
  }

  /**
   * 转换为JSON对象
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      employeeName: this._employeeName,
      idNumber: this._idNumber,
      employmentStatus: this._employmentStatus,
      hireDate: this._hireDate,
      terminationDate: this._terminationDate,
      dateOfBirth: this._dateOfBirth,
      gender: this._gender,
      managerId: this._managerId,
      userId: this._userId,
      bankAccounts: this._bankAccounts,
      currentPosition: this._currentPosition,
      age: this.age,
      isActiveEmployee: this.isActiveEmployee
    };
  }
}