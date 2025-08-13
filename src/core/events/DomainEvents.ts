/**
 * 领域事件体系定义
 * 
 * 定义系统中所有的领域事件类型和结构
 * 支持事件驱动架构和业务解耦
 */

import { DomainEvent } from '../domain/DomainEvent';

// ====================================================================
// 员工相关事件
// ====================================================================

/**
 * 员工创建事件
 */
export class EmployeeCreatedEvent extends DomainEvent {
    constructor(
        public readonly employeeId: string,
        public readonly employeeData: {
            employeeCode: string;
            name: string;
            departmentId: string;
            positionId: string;
            hireDate: string;
        },
        public readonly createdBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('EmployeeCreated', timestamp);
    }
}

/**
 * 员工信息更新事件
 */
export class EmployeeUpdatedEvent extends DomainEvent {
    constructor(
        public readonly employeeId: string,
        public readonly changes: {
            field: string;
            oldValue: any;
            newValue: any;
        }[],
        public readonly updatedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('EmployeeUpdated', timestamp);
    }
}

/**
 * 员工离职事件
 */
export class EmployeeTerminatedEvent extends DomainEvent {
    constructor(
        public readonly employeeId: string,
        public readonly terminationData: {
            terminationDate: string;
            reason: string;
            finalSalaryPeriod?: string;
            notes?: string;
        },
        public readonly terminatedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('EmployeeTerminated', timestamp);
    }
}

/**
 * 员工部门调动事件
 */
export class EmployeeDepartmentChangedEvent extends DomainEvent {
    constructor(
        public readonly employeeId: string,
        public readonly transferData: {
            fromDepartmentId: string;
            toDepartmentId: string;
            fromPositionId?: string;
            toPositionId?: string;
            effectiveDate: string;
            reason?: string;
        },
        public readonly initiatedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('EmployeeDepartmentChanged', timestamp);
    }
}

/**
 * 员工职位变更事件
 */
export class EmployeePositionChangedEvent extends DomainEvent {
    constructor(
        public readonly employeeId: string,
        public readonly positionChange: {
            fromPositionId: string;
            toPositionId: string;
            effectiveDate: string;
            salaryImpact?: {
                affectsSalary: boolean;
                newBaseSalary?: number;
            };
            reason?: string;
        },
        public readonly approvedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('EmployeePositionChanged', timestamp);
    }
}

// ====================================================================
// 组织架构相关事件
// ====================================================================

/**
 * 部门创建事件
 */
export class DepartmentCreatedEvent extends DomainEvent {
    constructor(
        public readonly departmentId: string,
        public readonly departmentData: {
            name: string;
            code: string;
            parentDepartmentId?: string;
            managerId?: string;
            description?: string;
        },
        public readonly createdBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('DepartmentCreated', timestamp);
    }
}

/**
 * 部门更新事件
 */
export class DepartmentUpdatedEvent extends DomainEvent {
    constructor(
        public readonly departmentId: string,
        public readonly changes: {
            field: string;
            oldValue: any;
            newValue: any;
        }[],
        public readonly updatedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('DepartmentUpdated', timestamp);
    }
}

/**
 * 职位创建事件
 */
export class PositionCreatedEvent extends DomainEvent {
    constructor(
        public readonly positionId: string,
        public readonly positionData: {
            title: string;
            code: string;
            departmentId: string;
            level: number;
            salaryRange?: {
                min: number;
                max: number;
            };
            description?: string;
        },
        public readonly createdBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('PositionCreated', timestamp);
    }
}

// ====================================================================
// 薪资相关事件
// ====================================================================

/**
 * 薪资期间创建事件
 */
export class PayrollPeriodCreatedEvent extends DomainEvent {
    constructor(
        public readonly periodId: string,
        public readonly periodData: {
            name: string;
            startDate: string;
            endDate: string;
            payDate: string;
            type: 'monthly' | 'weekly' | 'bi_weekly' | 'quarterly';
            status: 'draft' | 'in_progress' | 'completed' | 'closed';
        },
        public readonly createdBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('PayrollPeriodCreated', timestamp);
    }
}

/**
 * 薪资期间状态变更事件
 */
export class PayrollPeriodStatusChangedEvent extends DomainEvent {
    constructor(
        public readonly periodId: string,
        public readonly statusChange: {
            fromStatus: string;
            toStatus: string;
            reason?: string;
            metadata?: Record<string, any>;
        },
        public readonly changedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('PayrollPeriodStatusChanged', timestamp);
    }
}

/**
 * 薪资计算开始事件
 */
export class PayrollCalculationStartedEvent extends DomainEvent {
    constructor(
        public readonly periodId: string,
        public readonly calculationParams: {
            employeeIds?: string[];
            calculationType: 'full' | 'partial' | 'recalculation';
            includeComponents: string[];
            excludeComponents?: string[];
        },
        public readonly initiatedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('PayrollCalculationStarted', timestamp);
    }
}

/**
 * 薪资计算完成事件
 */
export class PayrollCalculationCompletedEvent extends DomainEvent {
    constructor(
        public readonly periodId: string,
        public readonly calculationResults: {
            totalEmployees: number;
            successfulCalculations: number;
            failedCalculations: number;
            totalGrossPay: number;
            totalNetPay: number;
            executionTime: number;
            errors?: Array<{
                employeeId: string;
                error: string;
            }>;
        },
        public readonly completedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('PayrollCalculationCompleted', timestamp);
    }
}

/**
 * 个人薪资计算事件
 */
export class EmployeePayrollCalculatedEvent extends DomainEvent {
    constructor(
        public readonly employeeId: string,
        public readonly periodId: string,
        public readonly payrollData: {
            grossPay: number;
            socialInsuranceDeduction: number;
            personalIncomeTax: number;
            otherDeductions: number;
            netPay: number;
            components: Array<{
                type: string;
                amount: number;
                description?: string;
            }>;
        },
        public readonly calculatedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('EmployeePayrollCalculated', timestamp);
    }
}

/**
 * 薪资审核事件
 */
export class PayrollApprovalEvent extends DomainEvent {
    constructor(
        public readonly periodId: string,
        public readonly approvalData: {
            approvalLevel: number;
            action: 'approved' | 'rejected' | 'returned';
            employeeIds?: string[]; // 部分审核
            comments?: string;
            nextApprover?: string;
        },
        public readonly approvedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('PayrollApproval', timestamp);
    }
}

/**
 * 薪资发放事件
 */
export class PayrollDisbursementEvent extends DomainEvent {
    constructor(
        public readonly periodId: string,
        public readonly disbursementData: {
            totalAmount: number;
            employeeCount: number;
            paymentMethod: 'bank_transfer' | 'cash' | 'check';
            batchId?: string;
            bankFileGenerated?: boolean;
            disbursementDate: string;
        },
        public readonly processedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('PayrollDisbursement', timestamp);
    }
}

// ====================================================================
// 社保相关事件
// ====================================================================

/**
 * 社保计算事件
 */
export class SocialInsuranceCalculatedEvent extends DomainEvent {
    constructor(
        public readonly employeeId: string,
        public readonly periodId: string,
        public readonly socialInsuranceData: {
            pensionEmployee: number;
            pensionEmployer: number;
            medicalEmployee: number;
            medicalEmployer: number;
            unemploymentEmployee: number;
            unemploymentEmployer: number;
            workInjuryEmployer: number;
            maternityEmployer: number;
            housingFundEmployee: number;
            housingFundEmployer: number;
            totalEmployeeContribution: number;
            totalEmployerContribution: number;
            baseAmount: number;
        },
        public readonly calculatedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('SocialInsuranceCalculated', timestamp);
    }
}

/**
 * 社保基数调整事件
 */
export class SocialInsuranceBaseAdjustedEvent extends DomainEvent {
    constructor(
        public readonly employeeId: string,
        public readonly adjustment: {
            region: string;
            insuranceType: string;
            oldBase: number;
            newBase: number;
            adjustmentReason: string;
            effectiveDate: string;
        },
        public readonly adjustedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('SocialInsuranceBaseAdjusted', timestamp);
    }
}

// ====================================================================
// 个税相关事件
// ====================================================================

/**
 * 个税数据导入事件
 */
export class PersonalIncomeTaxImportedEvent extends DomainEvent {
    constructor(
        public readonly periodId: string,
        public readonly importResults: {
            totalRecords: number;
            successCount: number;
            errorCount: number;
            warningCount: number;
            totalTaxAmount: number;
            importMethod: 'excel' | 'manual' | 'api';
        },
        public readonly importedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('PersonalIncomeTaxImported', timestamp);
    }
}

/**
 * 个税计算事件
 */
export class PersonalIncomeTaxCalculatedEvent extends DomainEvent {
    constructor(
        public readonly employeeId: string,
        public readonly periodId: string,
        public readonly taxData: {
            taxableIncome: number;
            taxAmount: number;
            effectiveTaxRate: number;
            specialDeductions: Array<{
                type: string;
                amount: number;
            }>;
            calculationMethod: 'imported' | 'calculated' | 'manual';
        },
        public readonly calculatedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('PersonalIncomeTaxCalculated', timestamp);
    }
}

// ====================================================================
// 系统相关事件
// ====================================================================

/**
 * 数据导入事件
 */
export class DataImportEvent extends DomainEvent {
    constructor(
        public readonly importType: 'employee' | 'payroll' | 'tax' | 'social_insurance',
        public readonly importData: {
            fileName?: string;
            recordCount: number;
            successCount: number;
            errorCount: number;
            duration: number;
            validationErrors?: string[];
        },
        public readonly importedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('DataImport', timestamp);
    }
}

/**
 * 系统配置变更事件
 */
export class SystemConfigChangedEvent extends DomainEvent {
    constructor(
        public readonly configKey: string,
        public readonly configChange: {
            oldValue: any;
            newValue: any;
            category: 'payroll' | 'tax' | 'social_insurance' | 'system';
        },
        public readonly changedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('SystemConfigChanged', timestamp);
    }
}

/**
 * 业务规则执行事件
 */
export class BusinessRuleExecutedEvent extends DomainEvent {
    constructor(
        public readonly ruleId: string,
        public readonly execution: {
            entityType: string;
            entityId: string;
            ruleResult: 'passed' | 'failed' | 'warning';
            executionTime: number;
            violations?: Array<{
                field: string;
                message: string;
                severity: 'error' | 'warning';
            }>;
        },
        public readonly executedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('BusinessRuleExecuted', timestamp);
    }
}

// ====================================================================
// 审计相关事件
// ====================================================================

/**
 * 用户操作审计事件
 */
export class UserOperationAuditEvent extends DomainEvent {
    constructor(
        public readonly operation: {
            action: string;
            resource: string;
            resourceId?: string;
            method: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
            success: boolean;
            duration: number;
            ipAddress?: string;
            userAgent?: string;
        },
        public readonly performedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('UserOperationAudit', timestamp);
    }
}

/**
 * 数据变更审计事件
 */
export class DataChangeAuditEvent extends DomainEvent {
    constructor(
        public readonly change: {
            tableName: string;
            recordId: string;
            operation: 'INSERT' | 'UPDATE' | 'DELETE';
            changes?: Array<{
                field: string;
                oldValue: any;
                newValue: any;
            }>;
            metadata?: Record<string, any>;
        },
        public readonly changedBy: string,
        public readonly timestamp: Date = new Date()
    ) {
        super('DataChangeAudit', timestamp);
    }
}

// ====================================================================
// 事件类型映射
// ====================================================================

/**
 * 所有事件类型的联合类型
 */
export type AllDomainEvents = 
    // 员工事件
    | EmployeeCreatedEvent
    | EmployeeUpdatedEvent
    | EmployeeTerminatedEvent
    | EmployeeDepartmentChangedEvent
    | EmployeePositionChangedEvent
    // 组织事件
    | DepartmentCreatedEvent
    | DepartmentUpdatedEvent
    | PositionCreatedEvent
    // 薪资事件
    | PayrollPeriodCreatedEvent
    | PayrollPeriodStatusChangedEvent
    | PayrollCalculationStartedEvent
    | PayrollCalculationCompletedEvent
    | EmployeePayrollCalculatedEvent
    | PayrollApprovalEvent
    | PayrollDisbursementEvent
    // 社保事件
    | SocialInsuranceCalculatedEvent
    | SocialInsuranceBaseAdjustedEvent
    // 个税事件
    | PersonalIncomeTaxImportedEvent
    | PersonalIncomeTaxCalculatedEvent
    // 系统事件
    | DataImportEvent
    | SystemConfigChangedEvent
    | BusinessRuleExecutedEvent
    // 审计事件
    | UserOperationAuditEvent
    | DataChangeAuditEvent;

/**
 * 事件类型枚举
 */
export enum DomainEventType {
    // 员工事件
    EMPLOYEE_CREATED = 'EmployeeCreated',
    EMPLOYEE_UPDATED = 'EmployeeUpdated',
    EMPLOYEE_TERMINATED = 'EmployeeTerminated',
    EMPLOYEE_DEPARTMENT_CHANGED = 'EmployeeDepartmentChanged',
    EMPLOYEE_POSITION_CHANGED = 'EmployeePositionChanged',
    
    // 组织事件
    DEPARTMENT_CREATED = 'DepartmentCreated',
    DEPARTMENT_UPDATED = 'DepartmentUpdated',
    POSITION_CREATED = 'PositionCreated',
    
    // 薪资事件
    PAYROLL_PERIOD_CREATED = 'PayrollPeriodCreated',
    PAYROLL_PERIOD_STATUS_CHANGED = 'PayrollPeriodStatusChanged',
    PAYROLL_CALCULATION_STARTED = 'PayrollCalculationStarted',
    PAYROLL_CALCULATION_COMPLETED = 'PayrollCalculationCompleted',
    EMPLOYEE_PAYROLL_CALCULATED = 'EmployeePayrollCalculated',
    PAYROLL_APPROVAL = 'PayrollApproval',
    PAYROLL_DISBURSEMENT = 'PayrollDisbursement',
    
    // 社保事件
    SOCIAL_INSURANCE_CALCULATED = 'SocialInsuranceCalculated',
    SOCIAL_INSURANCE_BASE_ADJUSTED = 'SocialInsuranceBaseAdjusted',
    
    // 个税事件
    PERSONAL_INCOME_TAX_IMPORTED = 'PersonalIncomeTaxImported',
    PERSONAL_INCOME_TAX_CALCULATED = 'PersonalIncomeTaxCalculated',
    
    // 系统事件
    DATA_IMPORT = 'DataImport',
    SYSTEM_CONFIG_CHANGED = 'SystemConfigChanged',
    BUSINESS_RULE_EXECUTED = 'BusinessRuleExecuted',
    
    // 审计事件
    USER_OPERATION_AUDIT = 'UserOperationAudit',
    DATA_CHANGE_AUDIT = 'DataChangeAudit'
}

/**
 * 事件优先级定义
 */
export enum EventPriority {
    LOW = 1,
    NORMAL = 2,
    HIGH = 3,
    CRITICAL = 4
}

/**
 * 事件分类
 */
export enum EventCategory {
    BUSINESS = 'business',
    SYSTEM = 'system',
    AUDIT = 'audit',
    INTEGRATION = 'integration'
}

/**
 * 事件元数据接口
 */
export interface EventMetadata {
    priority: EventPriority;
    category: EventCategory;
    tags?: string[];
    correlationId?: string;
    causedBy?: string; // 引发此事件的其他事件ID
    retryable?: boolean;
    ttl?: number; // 生存时间（秒）
}