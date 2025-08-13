/**
 * Employee 领域服务
 * 
 * 提供复杂的员工相关业务逻辑，处理跨实体的业务规则
 */

import { Injectable, ServiceLifetime } from '../../../../core/di/DIContainer';
import { DomainError } from '../../../../shared/domain/errors/DomainError';
import { EmployeeEnhanced, EmploymentStatus, EmployeeType } from '../entities/EmployeeEnhanced';
import { Department, DepartmentStatus } from '../../../organization/domain/entities/Department';
import { Position, PositionStatus } from '../../../organization/domain/entities/Position';
import { PayrollEnhanced, PayrollStatus } from '../entities/PayrollEnhanced';

/**
 * 员工升职信息
 */
export interface PromotionInfo {
  /** 员工ID */
  employeeId: string;
  /** 新职位ID */
  newPositionId: string;
  /** 新部门ID（可选，如果职位变动同时部门变动） */
  newDepartmentId?: string;
  /** 新薪资 */
  newSalary: number;
  /** 生效日期 */
  effectiveDate: Date;
  /** 升职原因 */
  reason: string;
  /** 试用期（月数，如果有） */
  probationMonths?: number;
}

/**
 * 员工转移信息
 */
export interface TransferInfo {
  /** 员工ID */
  employeeId: string;
  /** 目标部门ID */
  targetDepartmentId: string;
  /** 目标职位ID（可选） */
  targetPositionId?: string;
  /** 新薪资（可选） */
  newSalary?: number;
  /** 生效日期 */
  effectiveDate: Date;
  /** 转移原因 */
  reason: string;
  /** 是否保留原有权限 */
  retainPermissions?: boolean;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult<T> {
  /** 成功的项目 */
  successItems: T[];
  /** 失败的项目 */
  failedItems: Array<{
    item: T;
    error: string;
  }>;
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failureCount: number;
  /** 总数量 */
  totalCount: number;
}

/**
 * 员工验证规则
 */
export interface EmployeeValidationRules {
  /** 最小入职年龄 */
  minHireAge: number;
  /** 最大入职年龄 */
  maxHireAge: number;
  /** 是否允许重复身份证号 */
  allowDuplicateIdNumber: boolean;
  /** 是否允许重复邮箱 */
  allowDuplicateEmail: boolean;
  /** 试用期最大月数 */
  maxProbationMonths: number;
  /** 是否需要紧急联系人 */
  requireEmergencyContact: boolean;
}

/**
 * Employee 领域服务
 */
@Injectable(ServiceLifetime.Singleton)
export class EmployeeDomainService {
  private readonly defaultValidationRules: EmployeeValidationRules = {
    minHireAge: 16,
    maxHireAge: 65,
    allowDuplicateIdNumber: false,
    allowDuplicateEmail: false,
    maxProbationMonths: 6,
    requireEmergencyContact: true
  };

  constructor(
    private validationRules: EmployeeValidationRules = this.defaultValidationRules
  ) {}

  /**
   * 创建新员工（包含业务规则验证）
   */
  async createEmployee(
    employeeData: {
      employeeName: string;
      idNumber: string;
      dateOfBirth?: Date;
      hireDate: Date;
      departmentId: string;
      positionId: string;
      baseSalary: number;
      employeeType?: EmployeeType;
      email?: string;
      phoneNumber?: string;
    },
    department: Department,
    position: Position,
    existingEmployees: EmployeeEnhanced[] = []
  ): Promise<EmployeeEnhanced> {
    
    // 验证部门状态
    this.validateDepartmentForHiring(department);
    
    // 验证职位状态
    this.validatePositionForHiring(position);
    
    // 验证员工数据
    this.validateNewEmployeeData(employeeData, existingEmployees);
    
    // 创建员工实体
    const employee = new EmployeeEnhanced(
      employeeData.employeeName,
      employeeData.idNumber,
      employeeData.hireDate,
      EmploymentStatus.PROBATION,
      employeeData.employeeType || EmployeeType.FULL_TIME
    );

    // 设置基本信息
    if (employeeData.dateOfBirth) {
      employee.updateBasicInfo(
        undefined,
        employeeData.dateOfBirth,
        undefined,
        '员工入职信息设置'
      );
    }

    // 设置联系信息
    if (employeeData.email || employeeData.phoneNumber) {
      employee.updateContactInfo(
        employeeData.email,
        employeeData.phoneNumber,
        undefined,
        undefined
      );
    }

    // 分配职位和薪资
    employee.assignPosition(
      employeeData.departmentId,
      employeeData.positionId,
      employeeData.baseSalary,
      employeeData.hireDate,
      '员工入职'
    );

    return employee;
  }

  /**
   * 员工升职
   */
  async promoteEmployee(
    employee: EmployeeEnhanced,
    promotionInfo: PromotionInfo,
    newPosition: Position,
    newDepartment?: Department
  ): Promise<void> {
    
    // 验证员工是否可以升职
    this.validateEmployeeForPromotion(employee);
    
    // 验证新职位
    this.validatePositionForPromotion(newPosition, employee);
    
    // 验证新部门（如果有变动）
    if (newDepartment) {
      this.validateDepartmentForTransfer(newDepartment);
    }

    // 验证薪资调整的合理性
    this.validateSalaryAdjustment(employee.baseSalary, promotionInfo.newSalary, 'promotion');

    // 执行升职操作
    if (promotionInfo.newDepartmentId && promotionInfo.newDepartmentId !== employee.departmentId) {
      // 同时变更部门和职位
      employee.assignPosition(
        promotionInfo.newDepartmentId,
        promotionInfo.newPositionId,
        promotionInfo.newSalary,
        promotionInfo.effectiveDate,
        `升职: ${promotionInfo.reason}`
      );
    } else {
      // 只变更职位
      employee.assignPosition(
        employee.departmentId!,
        promotionInfo.newPositionId,
        promotionInfo.newSalary,
        promotionInfo.effectiveDate,
        `升职: ${promotionInfo.reason}`
      );
    }

    // 如果有试用期要求，设置为试用状态
    if (promotionInfo.probationMonths && promotionInfo.probationMonths > 0) {
      // 这里可以添加试用期管理逻辑
      console.log(`员工升职试用期: ${promotionInfo.probationMonths}个月`);
    }
  }

  /**
   * 员工转移（部门间调动）
   */
  async transferEmployee(
    employee: EmployeeEnhanced,
    transferInfo: TransferInfo,
    targetDepartment: Department,
    targetPosition?: Position
  ): Promise<void> {
    
    // 验证员工是否可以转移
    this.validateEmployeeForTransfer(employee);
    
    // 验证目标部门
    this.validateDepartmentForTransfer(targetDepartment);
    
    // 验证目标职位（如果指定）
    if (targetPosition) {
      this.validatePositionForTransfer(targetPosition);
    }

    // 确定最终职位和薪资
    const finalPositionId = transferInfo.targetPositionId || employee.positionId!;
    const finalSalary = transferInfo.newSalary || employee.baseSalary;

    // 如果有薪资调整，验证合理性
    if (transferInfo.newSalary && transferInfo.newSalary !== employee.baseSalary) {
      this.validateSalaryAdjustment(employee.baseSalary, transferInfo.newSalary, 'transfer');
    }

    // 执行转移操作
    employee.assignPosition(
      transferInfo.targetDepartmentId,
      finalPositionId,
      finalSalary,
      transferInfo.effectiveDate,
      `部门调动: ${transferInfo.reason}`
    );
  }

  /**
   * 批量确认试用期员工
   */
  async batchConfirmProbationEmployees(
    employees: EmployeeEnhanced[],
    confirmationDate: Date = new Date(),
    reason: string = '试用期满转正'
  ): Promise<BatchOperationResult<EmployeeEnhanced>> {
    
    const result: BatchOperationResult<EmployeeEnhanced> = {
      successItems: [],
      failedItems: [],
      successCount: 0,
      failureCount: 0,
      totalCount: employees.length
    };

    for (const employee of employees) {
      try {
        // 验证员工是否符合转正条件
        this.validateEmployeeForConfirmation(employee, confirmationDate);
        
        // 执行转正
        employee.confirmEmployment(confirmationDate, reason);
        
        result.successItems.push(employee);
        result.successCount++;
      } catch (error) {
        result.failedItems.push({
          item: employee,
          error: (error as Error).message
        });
        result.failureCount++;
      }
    }

    return result;
  }

  /**
   * 批量调整薪资
   */
  async batchAdjustSalary(
    adjustments: Array<{
      employee: EmployeeEnhanced;
      newSalary: number;
      reason: string;
    }>,
    effectiveDate: Date = new Date()
  ): Promise<BatchOperationResult<{ employee: EmployeeEnhanced; oldSalary: number; newSalary: number }>> {
    
    const result: BatchOperationResult<{ employee: EmployeeEnhanced; oldSalary: number; newSalary: number }> = {
      successItems: [],
      failedItems: [],
      successCount: 0,
      failureCount: 0,
      totalCount: adjustments.length
    };

    for (const adjustment of adjustments) {
      try {
        const { employee, newSalary, reason } = adjustment;
        const oldSalary = employee.baseSalary;
        
        // 验证薪资调整
        this.validateSalaryAdjustment(oldSalary, newSalary, 'adjustment');
        
        // 验证员工状态
        if (!employee.isActive && !employee.isOnProbation) {
          throw new DomainError('只有在职或试用期员工才能调整薪资');
        }
        
        // 执行薪资调整
        employee.adjustSalary(newSalary, effectiveDate, reason);
        
        result.successItems.push({ employee, oldSalary, newSalary });
        result.successCount++;
      } catch (error) {
        result.failedItems.push({
          item: adjustment,
          error: (error as Error).message
        });
        result.failureCount++;
      }
    }

    return result;
  }

  /**
   * 计算员工离职补偿
   */
  calculateTerminationCompensation(
    employee: EmployeeEnhanced,
    terminationDate: Date,
    terminationType: 'voluntary' | 'involuntary' | 'layoff' | 'retirement'
  ): {
    severancePay: number;
    noticePay: number;
    unusedVacationPay: number;
    totalCompensation: number;
    breakdown: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
  } {
    
    const statistics = employee.getStatistics();
    const baseSalary = employee.baseSalary;
    const breakdown: Array<{ type: string; amount: number; description: string }> = [];
    
    let severancePay = 0;
    let noticePay = 0;
    let unusedVacationPay = 0;

    // 计算补偿金（根据工作年限）
    if (terminationType === 'involuntary' || terminationType === 'layoff') {
      const workYears = statistics.tenureYears;
      
      if (workYears >= 1) {
        // 每满一年支付一个月工资
        severancePay = Math.floor(workYears) * baseSalary;
        
        // 不满一年按比例计算
        const remainingMonths = statistics.tenureMonths % 12;
        if (remainingMonths >= 6) {
          severancePay += baseSalary;
        } else if (remainingMonths > 0) {
          severancePay += baseSalary * 0.5;
        }
        
        breakdown.push({
          type: 'severance',
          amount: severancePay,
          description: `工作${workYears}年${remainingMonths}月的补偿金`
        });
      }

      // 代通知金（如果未提前通知）
      noticePay = baseSalary;
      breakdown.push({
        type: 'notice',
        amount: noticePay,
        description: '代通知金（一个月薪资）'
      });
    }

    // 计算未使用年假补偿（简化计算）
    if (statistics.tenureMonths >= 12) {
      const annualLeaveDays = Math.min(15, Math.floor(statistics.tenureYears * 5)); // 简化的年假计算
      const dailySalary = baseSalary / 21.75; // 平均每月工作日
      unusedVacationPay = annualLeaveDays * dailySalary * 0.3; // 假设30%未使用
      
      breakdown.push({
        type: 'vacation',
        amount: unusedVacationPay,
        description: `未使用年假${Math.floor(annualLeaveDays * 0.3)}天补偿`
      });
    }

    const totalCompensation = severancePay + noticePay + unusedVacationPay;

    return {
      severancePay,
      noticePay,
      unusedVacationPay,
      totalCompensation,
      breakdown
    };
  }

  /**
   * 检查员工是否有未完成的薪资记录
   */
  checkPendingPayrolls(
    employee: EmployeeEnhanced,
    payrolls: PayrollEnhanced[]
  ): {
    hasPendingPayrolls: boolean;
    pendingPayrolls: PayrollEnhanced[];
    blockingReasons: string[];
  } {
    
    const pendingPayrolls = payrolls.filter(payroll => 
      payroll.employeeId === employee.id &&
      (payroll.status === PayrollStatus.DRAFT ||
       payroll.status === PayrollStatus.PENDING_REVIEW ||
       payroll.status === PayrollStatus.APPROVED ||
       payroll.status === PayrollStatus.PROCESSING)
    );

    const blockingReasons: string[] = [];
    
    if (pendingPayrolls.length > 0) {
      pendingPayrolls.forEach(payroll => {
        switch (payroll.status) {
          case PayrollStatus.DRAFT:
            blockingReasons.push(`草稿薪资记录: ${payroll.getSummary().payPeriod}`);
            break;
          case PayrollStatus.PENDING_REVIEW:
            blockingReasons.push(`待审核薪资记录: ${payroll.getSummary().payPeriod}`);
            break;
          case PayrollStatus.APPROVED:
            blockingReasons.push(`已审核待发放薪资记录: ${payroll.getSummary().payPeriod}`);
            break;
          case PayrollStatus.PROCESSING:
            blockingReasons.push(`处理中薪资记录: ${payroll.getSummary().payPeriod}`);
            break;
        }
      });
    }

    return {
      hasPendingPayrolls: pendingPayrolls.length > 0,
      pendingPayrolls,
      blockingReasons
    };
  }

  /**
   * 获取员工职业发展建议
   */
  getCareerDevelopmentSuggestions(employee: EmployeeEnhanced): {
    currentLevel: string;
    nextSteps: Array<{
      suggestion: string;
      timeframe: string;
      requirements: string[];
    }>;
    trainingRecommendations: string[];
    performanceGaps: string[];
  } {
    
    const statistics = employee.getStatistics();
    const latestPerformance = employee.latestPerformanceRecord;
    
    const suggestions = {
      currentLevel: this.determineCareerLevel(employee),
      nextSteps: [] as Array<{
        suggestion: string;
        timeframe: string;
        requirements: string[];
      }>,
      trainingRecommendations: [] as string[],
      performanceGaps: [] as string[]
    };

    // 基于工作年限和绩效的建议
    if (statistics.tenureYears < 2) {
      suggestions.nextSteps.push({
        suggestion: '专注于技能提升和经验积累',
        timeframe: '1-2年',
        requirements: ['完成岗位培训', '通过绩效考核', '获得直属领导推荐']
      });
    } else if (statistics.tenureYears < 5) {
      suggestions.nextSteps.push({
        suggestion: '考虑高级职位或专业方向发展',
        timeframe: '2-3年',
        requirements: ['获得相关认证', '承担更多责任', '培养团队管理能力']
      });
    } else {
      suggestions.nextSteps.push({
        suggestion: '考虑管理岗位或专家路线',
        timeframe: '1-2年',
        requirements: ['完成管理培训', '具备跨部门协作经验', '有成功项目经验']
      });
    }

    // 基于绩效的培训建议
    if (latestPerformance) {
      if (latestPerformance.overallRating < 3) {
        suggestions.trainingRecommendations.push('基础技能强化培训');
        suggestions.performanceGaps.push('绩效表现需要改善');
      } else if (latestPerformance.overallRating >= 4) {
        suggestions.trainingRecommendations.push('领导力发展培训');
        suggestions.trainingRecommendations.push('高级专业技能培训');
      }

      if (latestPerformance.improvementAreas) {
        suggestions.performanceGaps.push(...latestPerformance.improvementAreas);
      }
    }

    return suggestions;
  }

  // ==================== 私有验证方法 ====================

  private validateDepartmentForHiring(department: Department): void {
    if (department.status !== DepartmentStatus.ACTIVE) {
      throw new DomainError('只能向活跃状态的部门招聘员工');
    }
  }

  private validatePositionForHiring(position: Position): void {
    if (position.status !== PositionStatus.ACTIVE) {
      throw new DomainError('只能招聘到活跃状态的职位');
    }

    if (position.openings <= 0) {
      throw new DomainError('该职位没有空缺，不能招聘新员工');
    }
  }

  private validateNewEmployeeData(
    employeeData: any,
    existingEmployees: EmployeeEnhanced[]
  ): void {
    
    // 验证年龄
    if (employeeData.dateOfBirth) {
      const age = new Date().getFullYear() - employeeData.dateOfBirth.getFullYear();
      if (age < this.validationRules.minHireAge) {
        throw new DomainError(`员工年龄不能小于${this.validationRules.minHireAge}岁`);
      }
      if (age > this.validationRules.maxHireAge) {
        throw new DomainError(`员工年龄不能大于${this.validationRules.maxHireAge}岁`);
      }
    }

    // 验证身份证号唯一性
    if (!this.validationRules.allowDuplicateIdNumber) {
      const duplicateId = existingEmployees.find(emp => 
        emp.idNumber === employeeData.idNumber && !emp.isTerminated
      );
      if (duplicateId) {
        throw new DomainError('身份证号已存在');
      }
    }

    // 验证邮箱唯一性
    if (employeeData.email && !this.validationRules.allowDuplicateEmail) {
      const duplicateEmail = existingEmployees.find(emp => 
        emp.email === employeeData.email && !emp.isTerminated
      );
      if (duplicateEmail) {
        throw new DomainError('邮箱地址已存在');
      }
    }
  }

  private validateEmployeeForPromotion(employee: EmployeeEnhanced): void {
    if (!employee.isActive && !employee.isOnProbation) {
      throw new DomainError('只有在职或试用期员工才能升职');
    }

    const statistics = employee.getStatistics();
    if (statistics.tenureMonths < 6) {
      throw new DomainError('员工工作时间不足6个月，不能升职');
    }
  }

  private validatePositionForPromotion(position: Position, employee: EmployeeEnhanced): void {
    if (position.status !== PositionStatus.ACTIVE) {
      throw new DomainError('只能升职到活跃状态的职位');
    }

    if (position.id === employee.positionId) {
      throw new DomainError('不能升职到相同的职位');
    }
  }

  private validateEmployeeForTransfer(employee: EmployeeEnhanced): void {
    if (!employee.isActive && !employee.isOnProbation) {
      throw new DomainError('只有在职或试用期员工才能转移');
    }
  }

  private validateDepartmentForTransfer(department: Department): void {
    if (department.status !== DepartmentStatus.ACTIVE) {
      throw new DomainError('只能转移到活跃状态的部门');
    }
  }

  private validatePositionForTransfer(position: Position): void {
    if (position.status !== PositionStatus.ACTIVE) {
      throw new DomainError('只能转移到活跃状态的职位');
    }
  }

  private validateSalaryAdjustment(
    oldSalary: number,
    newSalary: number,
    adjustmentType: 'promotion' | 'transfer' | 'adjustment'
  ): void {
    
    if (newSalary <= 0) {
      throw new DomainError('新薪资必须大于0');
    }

    const changePercent = ((newSalary - oldSalary) / oldSalary) * 100;

    // 根据调整类型设置合理的范围
    let maxIncrease = 0;
    let maxDecrease = 0;

    switch (adjustmentType) {
      case 'promotion':
        maxIncrease = 50; // 升职最多涨50%
        maxDecrease = 0;  // 升职不能降薪
        break;
      case 'transfer':
        maxIncrease = 20; // 转移最多涨20%
        maxDecrease = 10; // 转移最多降10%
        break;
      case 'adjustment':
        maxIncrease = 30; // 调薪最多涨30%
        maxDecrease = 20; // 调薪最多降20%
        break;
    }

    if (changePercent > maxIncrease) {
      throw new DomainError(`${adjustmentType === 'promotion' ? '升职' : adjustmentType === 'transfer' ? '转移' : '调薪'}幅度不能超过${maxIncrease}%`);
    }

    if (changePercent < -maxDecrease) {
      throw new DomainError(`${adjustmentType === 'promotion' ? '升职' : adjustmentType === 'transfer' ? '转移' : '调薪'}降幅不能超过${maxDecrease}%`);
    }
  }

  private validateEmployeeForConfirmation(employee: EmployeeEnhanced, confirmationDate: Date): void {
    if (employee.employmentStatus !== EmploymentStatus.PROBATION) {
      throw new DomainError('只有试用期员工才能转正');
    }

    const tenureDays = Math.floor((confirmationDate.getTime() - employee.hireDate.getTime()) / (1000 * 60 * 60 * 24));
    const minProbationDays = 30; // 最少试用30天
    const maxProbationDays = this.validationRules.maxProbationMonths * 30;

    if (tenureDays < minProbationDays) {
      throw new DomainError(`试用期不足${minProbationDays}天，不能转正`);
    }

    if (tenureDays > maxProbationDays) {
      throw new DomainError(`试用期超过${this.validationRules.maxProbationMonths}个月，应该已经转正或离职`);
    }
  }

  private determineCareerLevel(employee: EmployeeEnhanced): string {
    const statistics = employee.getStatistics();
    
    if (statistics.tenureYears < 1) {
      return '新员工';
    } else if (statistics.tenureYears < 3) {
      return '初级员工';
    } else if (statistics.tenureYears < 5) {
      return '中级员工';
    } else if (statistics.tenureYears < 10) {
      return '高级员工';
    } else {
      return '资深员工';
    }
  }
}