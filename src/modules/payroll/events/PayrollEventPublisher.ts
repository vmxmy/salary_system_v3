/**
 * 薪资领域专用事件发布器
 * 
 * 为薪资管理模块提供特定的事件发布功能
 * 封装常用的薪资事件发布场景
 */

import { 
    EventPublisher, 
    PublishContext, 
    PublishResult,
    BatchPublishResult 
} from '../../../core/events/EventPublisher';
import {
    PayrollPeriodCreatedEvent,
    PayrollPeriodStatusChangedEvent,
    PayrollCalculationStartedEvent,
    PayrollCalculationCompletedEvent,
    EmployeePayrollCalculatedEvent,
    PayrollApprovalEvent,
    PayrollDisbursementEvent,
    SocialInsuranceCalculatedEvent,
    PersonalIncomeTaxImportedEvent,
    PersonalIncomeTaxCalculatedEvent,
    EventMetadata,
    EventPriority,
    EventCategory
} from '../../../core/events/DomainEvents';
import { Logger } from '../../../core/infrastructure/Logger';

// 薪资事件上下文
export interface PayrollEventContext extends PublishContext {
    periodId: string;
    employeeId?: string;
    departmentId?: string;
    operatorId: string;
    operatorRole?: string;
}

// 薪资计算批次上下文
export interface PayrollBatchContext {
    periodId: string;
    batchId: string;
    employeeIds: string[];
    departmentIds?: string[];
    operatorId: string;
}

/**
 * 薪资事件发布器
 */
export class PayrollEventPublisher {
    private logger: Logger;

    constructor(private eventPublisher: EventPublisher) {
        this.logger = Logger.getInstance();
    }

    /**
     * 发布薪资期间创建事件
     */
    async publishPeriodCreated(
        periodId: string,
        periodData: {
            name: string;
            startDate: string;
            endDate: string;
            payDate: string;
            type: 'monthly' | 'weekly' | 'bi_weekly' | 'quarterly';
            status: 'draft' | 'in_progress' | 'completed' | 'closed';
        },
        createdBy: string
    ): Promise<PublishResult> {
        const event = new PayrollPeriodCreatedEvent(
            periodId,
            periodData,
            createdBy
        );

        const context: PayrollEventContext = {
            periodId,
            operatorId: createdBy,
            aggregateId: periodId,
            aggregateType: 'PayrollPeriod',
            userId: createdBy
        };

        const metadata: Partial<EventMetadata> = {
            priority: EventPriority.HIGH,
            category: EventCategory.BUSINESS,
            tags: ['payroll', 'period', 'creation']
        };

        this.logger.info('发布薪资期间创建事件', {
            periodId,
            periodName: periodData.name,
            createdBy
        });

        return this.eventPublisher.publish(event, context, metadata);
    }

    /**
     * 发布薪资期间状态变更事件
     */
    async publishPeriodStatusChanged(
        periodId: string,
        fromStatus: string,
        toStatus: string,
        changedBy: string,
        reason?: string
    ): Promise<PublishResult> {
        const event = new PayrollPeriodStatusChangedEvent(
            periodId,
            {
                fromStatus,
                toStatus,
                reason,
                metadata: {
                    changedAt: new Date().toISOString(),
                    changedBy
                }
            },
            changedBy
        );

        const context: PayrollEventContext = {
            periodId,
            operatorId: changedBy,
            aggregateId: periodId,
            aggregateType: 'PayrollPeriod',
            userId: changedBy
        };

        const metadata: Partial<EventMetadata> = {
            priority: EventPriority.HIGH,
            category: EventCategory.BUSINESS,
            tags: ['payroll', 'period', 'status-change']
        };

        this.logger.info('发布薪资期间状态变更事件', {
            periodId,
            fromStatus,
            toStatus,
            changedBy
        });

        return this.eventPublisher.publish(event, context, metadata);
    }

    /**
     * 发布薪资计算开始事件
     */
    async publishCalculationStarted(
        periodId: string,
        calculationParams: {
            employeeIds?: string[];
            calculationType: 'full' | 'partial' | 'recalculation';
            includeComponents: string[];
            excludeComponents?: string[];
        },
        initiatedBy: string
    ): Promise<PublishResult> {
        const event = new PayrollCalculationStartedEvent(
            periodId,
            calculationParams,
            initiatedBy
        );

        const context: PayrollEventContext = {
            periodId,
            operatorId: initiatedBy,
            aggregateId: periodId,
            aggregateType: 'PayrollPeriod',
            userId: initiatedBy,
            correlationId: `calc_${periodId}_${Date.now()}`
        };

        const metadata: Partial<EventMetadata> = {
            priority: EventPriority.HIGH,
            category: EventCategory.BUSINESS,
            tags: ['payroll', 'calculation', 'started']
        };

        this.logger.info('发布薪资计算开始事件', {
            periodId,
            calculationType: calculationParams.calculationType,
            employeeCount: calculationParams.employeeIds?.length || 'all',
            initiatedBy
        });

        return this.eventPublisher.publish(event, context, metadata);
    }

    /**
     * 发布薪资计算完成事件
     */
    async publishCalculationCompleted(
        periodId: string,
        calculationResults: {
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
        completedBy: string,
        correlationId?: string
    ): Promise<PublishResult> {
        const event = new PayrollCalculationCompletedEvent(
            periodId,
            calculationResults,
            completedBy
        );

        const context: PayrollEventContext = {
            periodId,
            operatorId: completedBy,
            aggregateId: periodId,
            aggregateType: 'PayrollPeriod',
            userId: completedBy,
            correlationId: correlationId || `calc_${periodId}_${Date.now()}`,
            causedBy: correlationId // 关联到开始事件
        };

        const metadata: Partial<EventMetadata> = {
            priority: EventPriority.HIGH,
            category: EventCategory.BUSINESS,
            tags: ['payroll', 'calculation', 'completed']
        };

        this.logger.info('发布薪资计算完成事件', {
            periodId,
            totalEmployees: calculationResults.totalEmployees,
            successfulCalculations: calculationResults.successfulCalculations,
            failedCalculations: calculationResults.failedCalculations,
            executionTime: calculationResults.executionTime,
            completedBy
        });

        return this.eventPublisher.publish(event, context, metadata);
    }

    /**
     * 批量发布员工薪资计算事件
     */
    async publishEmployeePayrollCalculatedBatch(
        periodId: string,
        employeePayrolls: Array<{
            employeeId: string;
            payrollData: {
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
            };
        }>,
        calculatedBy: string
    ): Promise<BatchPublishResult> {
        const events = employeePayrolls.map(({ employeeId, payrollData }) => ({
            event: new EmployeePayrollCalculatedEvent(
                employeeId,
                periodId,
                payrollData,
                calculatedBy
            ),
            context: {
                periodId,
                employeeId,
                operatorId: calculatedBy,
                aggregateId: employeeId,
                aggregateType: 'Employee',
                userId: calculatedBy
            } as PayrollEventContext,
            metadata: {
                priority: EventPriority.NORMAL,
                category: EventCategory.BUSINESS,
                tags: ['payroll', 'employee', 'calculation']
            } as Partial<EventMetadata>
        }));

        this.logger.info('批量发布员工薪资计算事件', {
            periodId,
            employeeCount: employeePayrolls.length,
            calculatedBy
        });

        return this.eventPublisher.publishBatch(events, {
            maxBatchSize: 100,
            continueOnError: true
        });
    }

    /**
     * 发布薪资审核事件
     */
    async publishPayrollApproval(
        periodId: string,
        approvalData: {
            approvalLevel: number;
            action: 'approved' | 'rejected' | 'returned';
            employeeIds?: string[];
            comments?: string;
            nextApprover?: string;
        },
        approvedBy: string
    ): Promise<PublishResult> {
        const event = new PayrollApprovalEvent(
            periodId,
            approvalData,
            approvedBy
        );

        const context: PayrollEventContext = {
            periodId,
            operatorId: approvedBy,
            aggregateId: periodId,
            aggregateType: 'PayrollPeriod',
            userId: approvedBy
        };

        const metadata: Partial<EventMetadata> = {
            priority: EventPriority.HIGH,
            category: EventCategory.BUSINESS,
            tags: ['payroll', 'approval', approvalData.action]
        };

        this.logger.info('发布薪资审核事件', {
            periodId,
            action: approvalData.action,
            approvalLevel: approvalData.approvalLevel,
            approvedBy
        });

        return this.eventPublisher.publish(event, context, metadata);
    }

    /**
     * 发布薪资发放事件
     */
    async publishPayrollDisbursement(
        periodId: string,
        disbursementData: {
            totalAmount: number;
            employeeCount: number;
            paymentMethod: 'bank_transfer' | 'cash' | 'check';
            batchId?: string;
            bankFileGenerated?: boolean;
            disbursementDate: string;
        },
        processedBy: string
    ): Promise<PublishResult> {
        const event = new PayrollDisbursementEvent(
            periodId,
            disbursementData,
            processedBy
        );

        const context: PayrollEventContext = {
            periodId,
            operatorId: processedBy,
            aggregateId: periodId,
            aggregateType: 'PayrollPeriod',
            userId: processedBy
        };

        const metadata: Partial<EventMetadata> = {
            priority: EventPriority.CRITICAL,
            category: EventCategory.BUSINESS,
            tags: ['payroll', 'disbursement', disbursementData.paymentMethod]
        };

        this.logger.info('发布薪资发放事件', {
            periodId,
            totalAmount: disbursementData.totalAmount,
            employeeCount: disbursementData.employeeCount,
            paymentMethod: disbursementData.paymentMethod,
            processedBy
        });

        return this.eventPublisher.publish(event, context, metadata);
    }

    /**
     * 发布社保计算事件
     */
    async publishSocialInsuranceCalculated(
        employeeId: string,
        periodId: string,
        socialInsuranceData: {
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
        calculatedBy: string
    ): Promise<PublishResult> {
        const event = new SocialInsuranceCalculatedEvent(
            employeeId,
            periodId,
            socialInsuranceData,
            calculatedBy
        );

        const context: PayrollEventContext = {
            periodId,
            employeeId,
            operatorId: calculatedBy,
            aggregateId: employeeId,
            aggregateType: 'Employee',
            userId: calculatedBy
        };

        const metadata: Partial<EventMetadata> = {
            priority: EventPriority.NORMAL,
            category: EventCategory.BUSINESS,
            tags: ['social-insurance', 'calculation', 'employee']
        };

        this.logger.info('发布社保计算事件', {
            employeeId,
            periodId,
            baseAmount: socialInsuranceData.baseAmount,
            totalEmployeeContribution: socialInsuranceData.totalEmployeeContribution,
            totalEmployerContribution: socialInsuranceData.totalEmployerContribution,
            calculatedBy
        });

        return this.eventPublisher.publish(event, context, metadata);
    }

    /**
     * 发布个税导入事件
     */
    async publishTaxImported(
        periodId: string,
        importResults: {
            totalRecords: number;
            successCount: number;
            errorCount: number;
            warningCount: number;
            totalTaxAmount: number;
            importMethod: 'excel' | 'manual' | 'api';
        },
        importedBy: string
    ): Promise<PublishResult> {
        const event = new PersonalIncomeTaxImportedEvent(
            periodId,
            importResults,
            importedBy
        );

        const context: PayrollEventContext = {
            periodId,
            operatorId: importedBy,
            aggregateId: periodId,
            aggregateType: 'PayrollPeriod',
            userId: importedBy
        };

        const metadata: Partial<EventMetadata> = {
            priority: EventPriority.NORMAL,
            category: EventCategory.BUSINESS,
            tags: ['tax', 'import', importResults.importMethod]
        };

        this.logger.info('发布个税导入事件', {
            periodId,
            totalRecords: importResults.totalRecords,
            successCount: importResults.successCount,
            importMethod: importResults.importMethod,
            importedBy
        });

        return this.eventPublisher.publish(event, context, metadata);
    }

    /**
     * 发布一系列相关的薪资事件（工作流）
     */
    async publishPayrollWorkflow(
        periodId: string,
        workflow: {
            startCalculation?: boolean;
            calculationResults?: any;
            approvalAction?: any;
            disbursementData?: any;
        },
        operatorId: string
    ): Promise<BatchPublishResult> {
        const events = [];
        const correlationId = `workflow_${periodId}_${Date.now()}`;

        // 构建工作流事件链
        if (workflow.startCalculation) {
            // 添加计算开始事件
        }

        if (workflow.calculationResults) {
            // 添加计算完成事件
        }

        if (workflow.approvalAction) {
            // 添加审核事件
        }

        if (workflow.disbursementData) {
            // 添加发放事件
        }

        return this.eventPublisher.publishBatch(events, {
            enableTransaction: true
        });
    }

    /**
     * 延迟发布薪资提醒事件
     */
    async schedulePayrollReminder(
        periodId: string,
        reminderType: 'calculation_due' | 'approval_due' | 'payment_due',
        delayMs: number,
        targetUsers: string[]
    ): Promise<string> {
        // 创建自定义提醒事件
        const event = new PayrollPeriodStatusChangedEvent(
            periodId,
            {
                fromStatus: 'pending',
                toStatus: 'reminder',
                reason: `${reminderType} reminder`,
                metadata: {
                    reminderType,
                    targetUsers
                }
            },
            'system'
        );

        const context: PayrollEventContext = {
            periodId,
            operatorId: 'system',
            aggregateId: periodId,
            aggregateType: 'PayrollPeriod'
        };

        const metadata: Partial<EventMetadata> = {
            priority: EventPriority.HIGH,
            category: EventCategory.SYSTEM,
            tags: ['reminder', reminderType]
        };

        return this.eventPublisher.scheduleEvent(
            event,
            {
                delayMs,
                maxRetries: 3,
                retryDelayMs: 60000,
                enablePersistence: true
            },
            context,
            metadata
        );
    }
}