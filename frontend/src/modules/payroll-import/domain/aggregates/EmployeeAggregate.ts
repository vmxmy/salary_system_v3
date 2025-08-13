/**
 * Employee 聚合根
 * 
 * 管理员工相关的所有实体和值对象，确保业务规则的一致性
 */

import { AggregateRoot, AggregateRootType, IAggregateFactory, AggregateSnapshot } from '../../../../shared/domain/aggregates/AggregateRoot';
import { DomainEvent } from '../../../../shared/domain/events/DomainEvent';
import { DomainError } from '../../../../shared/domain/errors/DomainError';
import { EmployeeEnhanced, EmploymentStatus, EmployeeType } from '../entities/EmployeeEnhanced';
import { PayrollEnhanced, PayrollStatus } from '../entities/PayrollEnhanced';
import { Department } from '../../../organization/domain/entities/Department';
import { Position } from '../../../organization/domain/entities/Position';

/**
 * 员工聚合状态
 */
interface EmployeeAggregateState {
  employee: EmployeeEnhanced;
  payrolls: PayrollEnhanced[];
  department?: Department;
  position?: Position;
  manager?: EmployeeEnhanced;
}

/**
 * 员工聚合根
 */
@AggregateRootType('EmployeeAggregate')
export class EmployeeAggregate extends AggregateRoot {
  private _employee: EmployeeEnhanced;
  private _payrolls: PayrollEnhanced[] = [];
  private _department?: Department;
  private _position?: Position;
  private _manager?: EmployeeEnhanced;

  constructor(employee: EmployeeEnhanced) {
    super(employee.id);
    this._employee = employee;
    
    // 订阅员工实体的领域事件
    this.subscribeToEmployeeEvents();
  }

  // ==================== 聚合访问器 ====================

  get employee(): EmployeeEnhanced {
    return this._employee;
  }

  get payrolls(): PayrollEnhanced[] {
    return [...this._payrolls];
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

  get activePayrolls(): PayrollEnhanced[] {
    return this._payrolls.filter(payroll => 
      payroll.status !== PayrollStatus.CANCELLED
    );
  }

  get pendingPayrolls(): PayrollEnhanced[] {
    return this._payrolls.filter(payroll => 
      payroll.status === PayrollStatus.DRAFT || 
      payroll.status === PayrollStatus.PENDING_REVIEW
    );
  }

  // ==================== 业务操作 ====================

  /**
   * 分配部门和职位
   */
  assignToDepartmentAndPosition(
    department: Department,
    position: Position,
    baseSalary: number,
    effectiveDate: Date = new Date(),
    reason?: string
  ): void {
    this.executeWithInvariantCheck(() => {
      // 验证部门和职位的关联性
      if (position.departmentId !== department.id) {
        throw new DomainError('职位与部门不匹配');
      }

      // 验证职位是否有空缺
      if (position.openings <= 0) {
        throw new DomainError('该职位没有空缺');
      }

      // 更新聚合状态
      this._department = department;
      this._position = position;
      
      // 更新员工职位信息
      this._employee.assignPosition(
        department.id!,
        position.id!,
        baseSalary,
        effectiveDate,
        reason
      );

      // 发布聚合事件
      this.publishEvent('EmployeeAssignedToDepartmentAndPosition', {
        employeeId: this.aggregateId,
        departmentId: department.id,
        departmentName: department.name,
        positionId: position.id,
        positionName: position.name,
        baseSalary,
        effectiveDate,
        reason
      });
    });
  }

  /**
   * 设置管理者
   */
  assignManager(manager: EmployeeEnhanced): void {
    this.executeWithInvariantCheck(() => {
      // 验证管理者不能是自己
      if (manager.id === this._employee.id) {
        throw new DomainError('员工不能成为自己的管理者');
      }

      // 验证管理者是否在同一部门或上级部门
      if (this._department && manager.departmentId !== this._department.id) {
        // 这里可以添加更复杂的层级验证逻辑
        console.warn('管理者不在同一部门，请确认组织架构正确');
      }

      this._manager = manager;
      this._employee.setManager(manager.id!);

      this.publishEvent('EmployeeManagerAssigned', {
        employeeId: this.aggregateId,
        managerId: manager.id,
        managerName: manager.employeeName
      });
    });
  }

  /**
   * 创建薪资记录
   */
  createPayroll(
    payPeriodStart: Date,
    payPeriodEnd: Date,
    payDate: Date
  ): PayrollEnhanced {
    return this.executeWithInvariantCheck(() => {
      // 检查是否已存在相同期间的薪资记录
      const duplicatePayroll = this._payrolls.find(payroll =>
        payroll.status !== PayrollStatus.CANCELLED &&
        this.isPeriodsOverlapping(
          { start: payroll.payPeriodStart, end: payroll.payPeriodEnd },
          { start: payPeriodStart, end: payPeriodEnd }
        )
      );

      if (duplicatePayroll) {
        throw new DomainError('该期间已存在薪资记录');
      }

      // 验证员工状态
      if (!this._employee.isActive && !this._employee.isOnProbation) {
        throw new DomainError('只有在职或试用期员工才能创建薪资记录');
      }

      // 创建薪资记录
      const payroll = new PayrollEnhanced(
        this._employee.id!,
        payPeriodStart,
        payPeriodEnd,
        payDate,
        PayrollStatus.DRAFT
      );

      // 设置员工关联
      payroll.setEmployee(this._employee);

      // 添加到聚合
      this._payrolls.push(payroll);

      this.publishEvent('PayrollCreatedForEmployee', {
        employeeId: this.aggregateId,
        payrollId: payroll.id,
        payPeriodStart,
        payPeriodEnd,
        payDate
      });

      return payroll;
    });
  }

  /**
   * 员工转正
   */
  confirmEmployment(confirmationDate: Date = new Date(), reason?: string): void {
    this.executeWithInvariantCheck(() => {
      if (this._employee.employmentStatus !== EmploymentStatus.PROBATION) {
        throw new DomainError('只有试用期员工才能转正');
      }

      // 检查是否有未完成的薪资记录
      const pendingPayrolls = this.pendingPayrolls;
      if (pendingPayrolls.length > 0) {
        console.warn(`员工有${pendingPayrolls.length}条待处理薪资记录，建议先处理完成`);
      }

      this._employee.confirmEmployment(confirmationDate, reason);

      this.publishEvent('EmployeeConfirmedInAggregate', {
        employeeId: this.aggregateId,
        confirmationDate,
        reason,
        pendingPayrollsCount: pendingPayrolls.length
      });
    });
  }

  /**
   * 员工离职
   */
  terminateEmployment(
    terminationDate: Date,
    reason: string,
    isEligibleForRehire: boolean = true,
    terminationType: 'voluntary' | 'involuntary' | 'retirement' = 'voluntary'
  ): void {
    this.executeWithInvariantCheck(() => {
      if (this._employee.isTerminated) {
        throw new DomainError('员工已处于离职状态');
      }

      // 检查未完成的薪资记录
      const pendingPayrolls = this.pendingPayrolls;
      if (pendingPayrolls.length > 0) {
        throw new DomainError('员工有未完成的薪资记录，请先处理完成后再办理离职');
      }

      // 取消草稿状态的薪资记录
      const draftPayrolls = this._payrolls.filter(p => p.status === PayrollStatus.DRAFT);
      draftPayrolls.forEach(payroll => {
        payroll.cancel('员工离职自动取消', 'system');
      });

      this._employee.terminate(terminationDate, reason, isEligibleForRehire, terminationType);

      this.publishEvent('EmployeeTerminatedInAggregate', {
        employeeId: this.aggregateId,
        terminationDate,
        reason,
        terminationType,
        isEligibleForRehire,
        cancelledPayrollsCount: draftPayrolls.length
      });
    });
  }

  /**
   * 薪资调整
   */
  adjustSalary(
    newSalary: number,
    effectiveDate: Date = new Date(),
    reason?: string
  ): void {
    this.executeWithInvariantCheck(() => {
      if (newSalary < 0) {
        throw new DomainError('薪资不能为负数');
      }

      const oldSalary = this._employee.baseSalary;
      const changePercentage = oldSalary > 0 ? ((newSalary - oldSalary) / oldSalary) * 100 : 0;

      // 检查薪资调整的合理性
      if (Math.abs(changePercentage) > 50) {
        console.warn(`薪资调整幅度较大: ${changePercentage.toFixed(1)}%，请确认是否正确`);
      }

      this._employee.adjustSalary(newSalary, effectiveDate, reason);

      this.publishEvent('EmployeeSalaryAdjustedInAggregate', {
        employeeId: this.aggregateId,
        oldSalary,
        newSalary,
        changePercentage,
        effectiveDate,
        reason
      });
    });
  }

  /**
   * 获取薪资统计
   */
  getPayrollStatistics(): {
    totalPayrolls: number;
    paidPayrolls: number;
    pendingPayrolls: number;
    totalEarnings: number;
    averageEarnings: number;
    lastPayrollDate?: Date;
  } {
    const paidPayrolls = this._payrolls.filter(p => p.isPaid);
    const totalEarnings = paidPayrolls.reduce((sum, p) => sum + p.netPay, 0);
    
    const lastPaidPayroll = paidPayrolls
      .sort((a, b) => b.payDate.getTime() - a.payDate.getTime())[0];

    return {
      totalPayrolls: this._payrolls.length,
      paidPayrolls: paidPayrolls.length,
      pendingPayrolls: this.pendingPayrolls.length,
      totalEarnings,
      averageEarnings: paidPayrolls.length > 0 ? totalEarnings / paidPayrolls.length : 0,
      lastPayrollDate: lastPaidPayroll?.payDate
    };
  }

  // ==================== 聚合根实现 ====================

  /**
   * 应用历史事件
   */
  protected applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case 'EmployeeAssignedToDepartmentAndPosition':
        this.applyEmployeeAssignedEvent(event);
        break;
      case 'EmployeeManagerAssigned':
        this.applyManagerAssignedEvent(event);
        break;
      case 'PayrollCreatedForEmployee':
        this.applyPayrollCreatedEvent(event);
        break;
      case 'EmployeeConfirmedInAggregate':
        this.applyEmployeeConfirmedEvent(event);
        break;
      case 'EmployeeTerminatedInAggregate':
        this.applyEmployeeTerminatedEvent(event);
        break;
      case 'EmployeeSalaryAdjustedInAggregate':
        this.applySalaryAdjustedEvent(event);
        break;
      default:
        console.warn(`未处理的事件类型: ${event.eventType}`);
    }
  }

  /**
   * 验证聚合不变式
   */
  validateInvariant(): void {
    // 验证员工基本信息
    if (!this._employee) {
      throw new DomainError('聚合必须包含员工实体');
    }

    // 验证部门和职位的一致性
    if (this._department && this._position) {
      if (this._position.departmentId !== this._department.id) {
        throw new DomainError('员工的职位与部门不匹配');
      }
    }

    // 验证管理者不能是自己
    if (this._manager && this._manager.id === this._employee.id) {
      throw new DomainError('员工不能成为自己的管理者');
    }

    // 验证薪资记录的一致性
    for (const payroll of this._payrolls) {
      if (payroll.employeeId !== this._employee.id) {
        throw new DomainError('薪资记录的员工ID与聚合员工ID不匹配');
      }
    }

    // 验证离职员工不能有活跃的薪资记录
    if (this._employee.isTerminated) {
      const activePayrolls = this._payrolls.filter(p => 
        p.status === PayrollStatus.DRAFT || 
        p.status === PayrollStatus.PENDING_REVIEW ||
        p.status === PayrollStatus.APPROVED ||
        p.status === PayrollStatus.PROCESSING
      );
      
      if (activePayrolls.length > 0) {
        throw new DomainError('离职员工不能有活跃的薪资记录');
      }
    }
  }

  /**
   * 序列化到快照
   */
  protected toSnapshot(): EmployeeAggregateState {
    return {
      employee: this._employee,
      payrolls: this._payrolls,
      department: this._department,
      position: this._position,
      manager: this._manager
    };
  }

  /**
   * 从快照恢复
   */
  protected fromSnapshot(data: EmployeeAggregateState): void {
    this._employee = data.employee;
    this._payrolls = data.payrolls || [];
    this._department = data.department;
    this._position = data.position;
    this._manager = data.manager;
  }

  // ==================== 私有方法 ====================

  private subscribeToEmployeeEvents(): void {
    // 这里可以订阅员工实体的事件，进行聚合级别的处理
  }

  private isPeriodsOverlapping(
    period1: { start: Date; end: Date },
    period2: { start: Date; end: Date }
  ): boolean {
    return period1.start <= period2.end && period2.start <= period1.end;
  }

  private applyEmployeeAssignedEvent(event: DomainEvent): void {
    // 从事件数据恢复状态
    const data = event.data;
    // 这里需要根据实际需要重建部门和职位对象
    console.log('Applied EmployeeAssigned event', data);
  }

  private applyManagerAssignedEvent(event: DomainEvent): void {
    const data = event.data;
    // 重建管理者关系
    console.log('Applied ManagerAssigned event', data);
  }

  private applyPayrollCreatedEvent(event: DomainEvent): void {
    const data = event.data;
    // 重建薪资记录
    console.log('Applied PayrollCreated event', data);
  }

  private applyEmployeeConfirmedEvent(event: DomainEvent): void {
    const data = event.data;
    console.log('Applied EmployeeConfirmed event', data);
  }

  private applyEmployeeTerminatedEvent(event: DomainEvent): void {
    const data = event.data;
    console.log('Applied EmployeeTerminated event', data);
  }

  private applySalaryAdjustedEvent(event: DomainEvent): void {
    const data = event.data;
    console.log('Applied SalaryAdjusted event', data);
  }
}

/**
 * 员工聚合工厂
 */
export class EmployeeAggregateFactory implements IAggregateFactory<EmployeeAggregate> {
  /**
   * 创建新员工聚合
   */
  create(
    employeeName: string,
    idNumber: string,
    hireDate: Date,
    employmentStatus: EmploymentStatus = EmploymentStatus.PROBATION,
    employeeType: EmployeeType = EmployeeType.FULL_TIME
  ): EmployeeAggregate {
    const employee = new EmployeeEnhanced(
      employeeName,
      idNumber,
      hireDate,
      employmentStatus,
      employeeType
    );

    return new EmployeeAggregate(employee);
  }

  /**
   * 从快照重建聚合
   */
  fromSnapshot(snapshot: AggregateSnapshot): EmployeeAggregate {
    const employee = new EmployeeEnhanced('', '', new Date()); // 临时创建
    const aggregate = new EmployeeAggregate(employee);
    aggregate.loadFromSnapshot(snapshot);
    return aggregate;
  }

  /**
   * 从事件历史重建聚合
   */
  fromHistory(aggregateId: string, events: DomainEvent[]): EmployeeAggregate {
    // 需要从第一个事件重建基本状态
    const createEvent = events.find(e => e.eventType === 'EmployeeCreated');
    if (!createEvent) {
      throw new DomainError('未找到员工创建事件');
    }

    const data = createEvent.data;
    const employee = new EmployeeEnhanced(
      data.employeeName,
      data.idNumber,
      new Date(data.hireDate),
      data.employmentStatus,
      data.employeeType,
      aggregateId
    );

    const aggregate = new EmployeeAggregate(employee);
    aggregate.loadFromHistory(events);
    return aggregate;
  }
}