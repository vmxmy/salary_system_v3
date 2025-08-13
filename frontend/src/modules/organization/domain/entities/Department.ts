/**
 * Department 领域实体
 * 
 * 部门实体负责管理组织结构，支持层级部门管理、员工分配等业务逻辑
 */

import { BaseEntity } from '../../../../shared/domain/entities/BaseEntity';
import { DomainError } from '../../../../shared/domain/errors/DomainError';
import { ValidationResult } from '../../../../shared/domain/validation/ValidationResult';

/**
 * 部门状态枚举
 */
export enum DepartmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive', 
  ARCHIVED = 'archived'
}

/**
 * 部门类型枚举
 */
export enum DepartmentType {
  CORPORATE = 'corporate',      // 公司级别
  DIVISION = 'division',        // 事业部
  DEPARTMENT = 'department',    // 部门
  TEAM = 'team',               // 团队
  PROJECT = 'project'          // 项目组
}

/**
 * 部门预算信息
 */
export interface DepartmentBudget {
  /** 年度预算总额 */
  annualBudget: number;
  /** 已使用预算 */
  usedBudget: number;
  /** 预算年度 */
  budgetYear: number;
  /** 预算类型（人力成本、运营成本等） */
  budgetType: 'personnel' | 'operational' | 'capital';
  /** 预算描述 */
  description?: string;
}

/**
 * 部门统计信息
 */
export interface DepartmentStatistics {
  /** 员工总数 */
  totalEmployees: number;
  /** 直接下属员工数 */
  directEmployees: number;
  /** 子部门数量 */
  subDepartmentCount: number;
  /** 平均工资 */
  averageSalary: number;
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 部门层级路径
 */
export interface DepartmentPath {
  /** 完整路径 */
  fullPath: string;
  /** 层级深度 */
  level: number;
  /** 路径中的所有部门ID */
  pathIds: string[];
}

/**
 * Department 领域实体
 */
export class Department extends BaseEntity {
  private _name: string;
  private _description?: string;
  private _parentDepartmentId?: string;
  private _status: DepartmentStatus;
  private _type: DepartmentType;
  private _managerId?: string;
  private _budget?: DepartmentBudget;
  private _metadata: Record<string, any>;
  
  // 关联数据（延迟加载）
  private _parentDepartment?: Department;
  private _subDepartments: Department[] = [];
  private _employeeCount: number = 0;

  constructor(
    name: string,
    type: DepartmentType = DepartmentType.DEPARTMENT,
    parentDepartmentId?: string,
    id?: string
  ) {
    super(id);
    this._name = name;
    this._type = type;
    this._parentDepartmentId = parentDepartmentId;
    this._status = DepartmentStatus.ACTIVE;
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

  get parentDepartmentId(): string | undefined {
    return this._parentDepartmentId;
  }

  get status(): DepartmentStatus {
    return this._status;
  }

  get type(): DepartmentType {
    return this._type;
  }

  get managerId(): string | undefined {
    return this._managerId;
  }

  get budget(): DepartmentBudget | undefined {
    return this._budget;
  }

  get metadata(): Record<string, any> {
    return { ...this._metadata };
  }

  get parentDepartment(): Department | undefined {
    return this._parentDepartment;
  }

  get subDepartments(): Department[] {
    return [...this._subDepartments];
  }

  get employeeCount(): number {
    return this._employeeCount;
  }

  get isRootDepartment(): boolean {
    return !this._parentDepartmentId;
  }

  get hasSubDepartments(): boolean {
    return this._subDepartments.length > 0;
  }

  // ==================== 业务方法 ====================

  /**
   * 更新部门基本信息
   */
  updateBasicInfo(name: string, description?: string, type?: DepartmentType): void {
    this.validateName(name);
    
    this._name = name;
    if (description !== undefined) {
      this._description = description;
    }
    if (type !== undefined) {
      this._type = type;
    }
    
    this.markAsUpdated();
    this.publishEvent('DepartmentUpdated', {
      departmentId: this.id,
      name: this._name,
      description: this._description,
      type: this._type
    });
  }

  /**
   * 设置部门管理者
   */
  setManager(managerId: string): void {
    if (!managerId || managerId.trim() === '') {
      throw new DomainError('部门管理者ID不能为空');
    }

    if (managerId === this._managerId) {
      return; // 没有变化
    }

    const previousManagerId = this._managerId;
    this._managerId = managerId;
    
    this.markAsUpdated();
    this.publishEvent('DepartmentManagerChanged', {
      departmentId: this.id,
      previousManagerId,
      newManagerId: managerId
    });
  }

  /**
   * 移除部门管理者
   */
  removeManager(): void {
    if (!this._managerId) {
      return; // 已经没有管理者
    }

    const previousManagerId = this._managerId;
    this._managerId = undefined;
    
    this.markAsUpdated();
    this.publishEvent('DepartmentManagerRemoved', {
      departmentId: this.id,
      previousManagerId
    });
  }

  /**
   * 移动到新的父部门
   */
  moveTo(newParentDepartmentId?: string): void {
    // 防止循环引用
    if (newParentDepartmentId === this.id) {
      throw new DomainError('部门不能成为自己的父部门');
    }

    // 检查是否会造成循环层级
    if (newParentDepartmentId && this.wouldCreateCycle(newParentDepartmentId)) {
      throw new DomainError('此操作会造成部门层级循环引用');
    }

    const previousParentId = this._parentDepartmentId;
    this._parentDepartmentId = newParentDepartmentId;
    
    this.markAsUpdated();
    this.publishEvent('DepartmentMoved', {
      departmentId: this.id,
      previousParentId,
      newParentId: newParentDepartmentId
    });
  }

  /**
   * 激活部门
   */
  activate(): void {
    if (this._status === DepartmentStatus.ACTIVE) {
      return; // 已经是激活状态
    }

    this._status = DepartmentStatus.ACTIVE;
    this.markAsUpdated();
    this.publishEvent('DepartmentActivated', {
      departmentId: this.id
    });
  }

  /**
   * 停用部门
   */
  deactivate(): void {
    if (this._status === DepartmentStatus.INACTIVE) {
      return; // 已经是停用状态
    }

    // 检查是否有活跃的员工
    if (this._employeeCount > 0) {
      throw new DomainError('有员工的部门不能被停用，请先转移员工或终止员工合同');
    }

    this._status = DepartmentStatus.INACTIVE;
    this.markAsUpdated();
    this.publishEvent('DepartmentDeactivated', {
      departmentId: this.id
    });
  }

  /**
   * 归档部门
   */
  archive(): void {
    if (this._status === DepartmentStatus.ARCHIVED) {
      return; // 已经是归档状态
    }

    // 只有停用的部门才能归档
    if (this._status !== DepartmentStatus.INACTIVE) {
      throw new DomainError('只有停用的部门才能被归档');
    }

    // 检查是否有子部门
    if (this._subDepartments.length > 0) {
      throw new DomainError('有子部门的部门不能被归档，请先处理子部门');
    }

    this._status = DepartmentStatus.ARCHIVED;
    this.markAsUpdated();
    this.publishEvent('DepartmentArchived', {
      departmentId: this.id
    });
  }

  /**
   * 设置部门预算
   */
  setBudget(budget: DepartmentBudget): void {
    if (budget.annualBudget < 0) {
      throw new DomainError('年度预算不能为负数');
    }

    if (budget.usedBudget < 0) {
      throw new DomainError('已使用预算不能为负数');
    }

    if (budget.usedBudget > budget.annualBudget) {
      throw new DomainError('已使用预算不能超过年度预算');
    }

    this._budget = { ...budget };
    this.markAsUpdated();
    this.publishEvent('DepartmentBudgetUpdated', {
      departmentId: this.id,
      budget: this._budget
    });
  }

  /**
   * 使用预算
   */
  useBudget(amount: number, description?: string): void {
    if (!this._budget) {
      throw new DomainError('部门尚未设置预算');
    }

    if (amount <= 0) {
      throw new DomainError('使用金额必须大于0');
    }

    const newUsedBudget = this._budget.usedBudget + amount;
    if (newUsedBudget > this._budget.annualBudget) {
      throw new DomainError('预算使用超出限额');
    }

    this._budget.usedBudget = newUsedBudget;
    this.markAsUpdated();
    this.publishEvent('DepartmentBudgetUsed', {
      departmentId: this.id,
      amount,
      description,
      remainingBudget: this._budget.annualBudget - this._budget.usedBudget
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
   * 添加子部门
   */
  addSubDepartment(subDepartment: Department): void {
    if (subDepartment.parentDepartmentId !== this.id) {
      throw new DomainError('子部门的父部门ID必须与当前部门ID匹配');
    }

    if (this._subDepartments.find(dept => dept.id === subDepartment.id)) {
      return; // 已经存在
    }

    this._subDepartments.push(subDepartment);
    subDepartment._parentDepartment = this;
  }

  /**
   * 移除子部门
   */
  removeSubDepartment(subDepartmentId: string): void {
    const index = this._subDepartments.findIndex(dept => dept.id === subDepartmentId);
    if (index >= 0) {
      const removed = this._subDepartments.splice(index, 1)[0];
      removed._parentDepartment = undefined;
    }
  }

  /**
   * 设置员工数量
   */
  setEmployeeCount(count: number): void {
    if (count < 0) {
      throw new DomainError('员工数量不能为负数');
    }

    this._employeeCount = count;
  }

  /**
   * 获取部门层级路径
   */
  getPath(): DepartmentPath {
    const pathIds: string[] = [];
    const pathNames: string[] = [];
    let current: Department | undefined = this;
    
    while (current) {
      pathIds.unshift(current.id);
      pathNames.unshift(current.name);
      current = current._parentDepartment;
    }

    return {
      fullPath: pathNames.join(' > '),
      level: pathIds.length,
      pathIds
    };
  }

  /**
   * 计算预算使用率
   */
  getBudgetUtilization(): number {
    if (!this._budget || this._budget.annualBudget === 0) {
      return 0;
    }
    return (this._budget.usedBudget / this._budget.annualBudget) * 100;
  }

  /**
   * 获取部门统计信息
   */
  getStatistics(): DepartmentStatistics {
    const directEmployees = this._employeeCount;
    const totalEmployees = this.calculateTotalEmployees();

    return {
      totalEmployees,
      directEmployees,
      subDepartmentCount: this._subDepartments.length,
      averageSalary: 0, // 需要从外部服务计算
      lastUpdated: this.updatedAt
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
      errors.push('部门名称不能为空');
    } else if (this._name.length > 100) {
      errors.push('部门名称不能超过100个字符');
    }

    // 验证描述
    if (this._description && this._description.length > 500) {
      errors.push('部门描述不能超过500个字符');
    }

    // 验证预算
    if (this._budget) {
      if (this._budget.annualBudget < 0) {
        errors.push('年度预算不能为负数');
      }
      if (this._budget.usedBudget < 0) {
        errors.push('已使用预算不能为负数');
      }
      if (this._budget.usedBudget > this._budget.annualBudget) {
        errors.push('已使用预算不能超过年度预算');
      }
    }

    return ValidationResult.fromErrors(errors);
  }

  // ==================== 私有方法 ====================

  /**
   * 验证部门名称
   */
  private validateName(name: string): void {
    if (!name || name.trim() === '') {
      throw new DomainError('部门名称不能为空');
    }

    if (name.length > 100) {
      throw new DomainError('部门名称不能超过100个字符');
    }

    // 检查特殊字符
    const invalidChars = /[<>:"\/\\|?*]/;
    if (invalidChars.test(name)) {
      throw new DomainError('部门名称不能包含特殊字符: < > : " / \\ | ? *');
    }
  }

  /**
   * 检查是否会造成循环引用
   */
  private wouldCreateCycle(newParentId: string): boolean {
    // 检查新父部门是否是当前部门的子部门
    return this.isAncestorOf(newParentId);
  }

  /**
   * 检查是否是指定部门的祖先部门
   */
  private isAncestorOf(departmentId: string): boolean {
    for (const subDept of this._subDepartments) {
      if (subDept.id === departmentId || subDept.isAncestorOf(departmentId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 计算总员工数（包括子部门）
   */
  private calculateTotalEmployees(): number {
    let total = this._employeeCount;
    for (const subDept of this._subDepartments) {
      total += subDept.calculateTotalEmployees();
    }
    return total;
  }
}