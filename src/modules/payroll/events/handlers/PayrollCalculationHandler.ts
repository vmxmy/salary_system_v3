/**
 * 薪资计算事件处理器
 * 
 * 处理薪资计算相关的事件
 */

import { BaseEventHandler } from '../../../../core/events/handlers/BaseEventHandler';
import {
    PayrollCalculationStartedEvent,
    PayrollCalculationCompletedEvent,
    EmployeePayrollCalculatedEvent,
    EventMetadata,
    DomainEventType
} from '../../../../core/events/DomainEvents';
import { PayrollSummaryService } from '../../services/PayrollSummaryService';
import { SocialInsuranceCalculationService } from '../../services/SocialInsuranceCalculationService';
import { PersonalIncomeTaxService } from '../../services/PersonalIncomeTaxService';
import { Logger } from '../../../../core/infrastructure/Logger';

/**
 * 薪资计算开始事件处理器
 */
export class PayrollCalculationStartedHandler extends BaseEventHandler<PayrollCalculationStartedEvent> {
    constructor(
        private payrollService: PayrollSummaryService,
        private socialInsuranceService: SocialInsuranceCalculationService
    ) {
        super({
            name: 'PayrollCalculationStartedHandler',
            priority: 50,
            maxRetries: 3,
            timeoutMs: 60000
        });
    }

    canHandle(eventType: string): boolean {
        return eventType === DomainEventType.PAYROLL_CALCULATION_STARTED;
    }

    protected async doHandle(
        event: PayrollCalculationStartedEvent,
        metadata?: EventMetadata
    ): Promise<void> {
        const { periodId, calculationParams, initiatedBy } = event;

        this.logger.info('开始处理薪资计算开始事件', {
            periodId,
            calculationType: calculationParams.calculationType,
            employeeCount: calculationParams.employeeIds?.length || 'all',
            initiatedBy
        });

        try {
            // 1. 验证薪资期间状态
            await this.validatePeriodStatus(periodId);

            // 2. 锁定相关员工记录（防止并发修改）
            if (calculationParams.employeeIds) {
                await this.lockEmployeeRecords(calculationParams.employeeIds);
            }

            // 3. 初始化计算上下文
            await this.initializeCalculationContext(periodId, calculationParams);

            // 4. 预计算社保基数
            if (calculationParams.includeComponents.includes('social_insurance')) {
                await this.preCalculateSocialInsuranceBase(
                    periodId,
                    calculationParams.employeeIds
                );
            }

            // 5. 发送开始通知
            await this.sendStartNotification(periodId, initiatedBy);

            this.logger.info('薪资计算开始事件处理完成', {
                periodId,
                correlationId: metadata?.correlationId
            });

        } catch (error) {
            this.logger.error('处理薪资计算开始事件失败', {
                periodId,
                error: error.message
            });
            throw error;
        }
    }

    private async validatePeriodStatus(periodId: string): Promise<void> {
        // 验证薪资期间是否可以开始计算
        // 实际实现中应该调用数据库查询
        this.logger.debug('验证薪资期间状态', { periodId });
    }

    private async lockEmployeeRecords(employeeIds: string[]): Promise<void> {
        // 锁定员工记录防止并发修改
        this.logger.debug('锁定员工记录', { 
            employeeCount: employeeIds.length 
        });
    }

    private async initializeCalculationContext(
        periodId: string,
        params: any
    ): Promise<void> {
        // 初始化计算上下文
        this.logger.debug('初始化计算上下文', { 
            periodId,
            calculationType: params.calculationType 
        });
    }

    private async preCalculateSocialInsuranceBase(
        periodId: string,
        employeeIds?: string[]
    ): Promise<void> {
        // 预计算社保基数
        if (employeeIds && employeeIds.length > 0) {
            for (const employeeId of employeeIds) {
                await this.socialInsuranceService.validateInsuranceBase(
                    employeeId,
                    periodId
                );
            }
        }
    }

    private async sendStartNotification(
        periodId: string,
        initiatedBy: string
    ): Promise<void> {
        // 发送开始通知
        this.logger.info('发送薪资计算开始通知', {
            periodId,
            initiatedBy
        });
    }
}

/**
 * 薪资计算完成事件处理器
 */
export class PayrollCalculationCompletedHandler extends BaseEventHandler<PayrollCalculationCompletedEvent> {
    constructor(
        private payrollService: PayrollSummaryService,
        private taxService: PersonalIncomeTaxService
    ) {
        super({
            name: 'PayrollCalculationCompletedHandler',
            priority: 60,
            maxRetries: 5,
            timeoutMs: 120000
        });
    }

    canHandle(eventType: string): boolean {
        return eventType === DomainEventType.PAYROLL_CALCULATION_COMPLETED;
    }

    protected async doHandle(
        event: PayrollCalculationCompletedEvent,
        metadata?: EventMetadata
    ): Promise<void> {
        const { periodId, calculationResults, completedBy } = event;

        this.logger.info('开始处理薪资计算完成事件', {
            periodId,
            totalEmployees: calculationResults.totalEmployees,
            successfulCalculations: calculationResults.successfulCalculations,
            failedCalculations: calculationResults.failedCalculations,
            completedBy
        });

        try {
            // 1. 生成薪资汇总报告
            const summary = await this.payrollService.generatePayrollSummary(
                periodId,
                {
                    includeDetails: true,
                    includeDepartmentSummary: true,
                    includeStatistics: true,
                    format: 'detailed'
                }
            );

            // 2. 处理计算失败的员工
            if (calculationResults.errors && calculationResults.errors.length > 0) {
                await this.handleFailedCalculations(
                    periodId,
                    calculationResults.errors
                );
            }

            // 3. 更新薪资期间状态
            await this.updatePeriodStatus(periodId, 'calculated');

            // 4. 生成审计记录
            await this.createAuditRecord(event, summary);

            // 5. 发送完成通知
            await this.sendCompletionNotification(
                periodId,
                calculationResults,
                completedBy
            );

            // 6. 触发后续流程（如审批流程）
            if (calculationResults.failedCalculations === 0) {
                await this.triggerApprovalWorkflow(periodId);
            }

            this.logger.info('薪资计算完成事件处理成功', {
                periodId,
                summaryId: summary.summaryId,
                correlationId: metadata?.correlationId
            });

        } catch (error) {
            this.logger.error('处理薪资计算完成事件失败', {
                periodId,
                error: error.message
            });
            throw error;
        }
    }

    private async handleFailedCalculations(
        periodId: string,
        errors: Array<{ employeeId: string; error: string }>
    ): Promise<void> {
        this.logger.warn('处理计算失败的员工', {
            periodId,
            failedCount: errors.length,
            employeeIds: errors.map(e => e.employeeId)
        });

        // 记录失败详情，可能需要人工干预
        for (const error of errors) {
            this.logger.error('员工薪资计算失败', {
                periodId,
                employeeId: error.employeeId,
                error: error.error
            });
        }
    }

    private async updatePeriodStatus(
        periodId: string,
        status: string
    ): Promise<void> {
        // 更新薪资期间状态
        this.logger.info('更新薪资期间状态', {
            periodId,
            newStatus: status
        });
    }

    private async createAuditRecord(
        event: PayrollCalculationCompletedEvent,
        summary: any
    ): Promise<void> {
        // 创建审计记录
        this.logger.info('创建薪资计算审计记录', {
            periodId: event.periodId,
            summaryId: summary.summaryId,
            totalAmount: summary.totalNetPay
        });
    }

    private async sendCompletionNotification(
        periodId: string,
        results: any,
        completedBy: string
    ): Promise<void> {
        // 发送完成通知
        this.logger.info('发送薪资计算完成通知', {
            periodId,
            recipients: ['hr_manager', 'finance_manager'],
            completedBy
        });
    }

    private async triggerApprovalWorkflow(periodId: string): Promise<void> {
        // 触发审批工作流
        this.logger.info('触发薪资审批工作流', {
            periodId,
            workflowType: 'payroll_approval'
        });
    }
}

/**
 * 员工薪资计算事件处理器
 */
export class EmployeePayrollCalculatedHandler extends BaseEventHandler<EmployeePayrollCalculatedEvent> {
    constructor(private notificationService?: any) {
        super({
            name: 'EmployeePayrollCalculatedHandler',
            priority: 70,
            maxRetries: 3,
            timeoutMs: 30000
        });
    }

    canHandle(eventType: string): boolean {
        return eventType === DomainEventType.EMPLOYEE_PAYROLL_CALCULATED;
    }

    protected async doHandle(
        event: EmployeePayrollCalculatedEvent,
        metadata?: EventMetadata
    ): Promise<void> {
        const { employeeId, periodId, payrollData, calculatedBy } = event;

        this.logger.info('开始处理员工薪资计算事件', {
            employeeId,
            periodId,
            netPay: payrollData.netPay,
            calculatedBy
        });

        try {
            // 1. 验证计算结果
            await this.validateCalculationResult(payrollData);

            // 2. 检查异常情况
            const anomalies = await this.detectAnomalies(
                employeeId,
                periodId,
                payrollData
            );

            if (anomalies.length > 0) {
                await this.handleAnomalies(employeeId, periodId, anomalies);
            }

            // 3. 生成员工薪资单
            await this.generatePayslip(employeeId, periodId, payrollData);

            // 4. 发送员工通知（如果配置了）
            if (this.shouldNotifyEmployee(employeeId)) {
                await this.notifyEmployee(employeeId, periodId, payrollData);
            }

            // 5. 更新员工薪资统计
            await this.updateEmployeeStatistics(employeeId, payrollData);

            this.logger.info('员工薪资计算事件处理完成', {
                employeeId,
                periodId
            });

        } catch (error) {
            this.logger.error('处理员工薪资计算事件失败', {
                employeeId,
                periodId,
                error: error.message
            });
            throw error;
        }
    }

    private async validateCalculationResult(payrollData: any): Promise<void> {
        // 验证计算结果的合理性
        if (payrollData.netPay < 0) {
            throw new Error('净工资不能为负数');
        }

        if (payrollData.grossPay < payrollData.netPay) {
            throw new Error('净工资不能大于总工资');
        }
    }

    private async detectAnomalies(
        employeeId: string,
        periodId: string,
        payrollData: any
    ): Promise<string[]> {
        const anomalies = [];

        // 检查薪资变化幅度
        // 实际实现中应该与历史数据对比
        if (payrollData.netPay > 100000) {
            anomalies.push('薪资异常高');
        }

        if (payrollData.personalIncomeTax > payrollData.grossPay * 0.45) {
            anomalies.push('个税比例异常');
        }

        return anomalies;
    }

    private async handleAnomalies(
        employeeId: string,
        periodId: string,
        anomalies: string[]
    ): Promise<void> {
        this.logger.warn('检测到薪资异常', {
            employeeId,
            periodId,
            anomalies
        });

        // 标记需要人工审核
    }

    private async generatePayslip(
        employeeId: string,
        periodId: string,
        payrollData: any
    ): Promise<void> {
        // 生成员工薪资单
        this.logger.info('生成员工薪资单', {
            employeeId,
            periodId
        });
    }

    private shouldNotifyEmployee(employeeId: string): boolean {
        // 判断是否需要通知员工
        // 可以基于员工设置或系统配置
        return true;
    }

    private async notifyEmployee(
        employeeId: string,
        periodId: string,
        payrollData: any
    ): Promise<void> {
        if (!this.notificationService) {
            this.logger.debug('未配置通知服务，跳过员工通知');
            return;
        }

        // 发送薪资通知给员工
        this.logger.info('发送薪资通知给员工', {
            employeeId,
            periodId,
            notificationType: 'payroll_calculated'
        });
    }

    private async updateEmployeeStatistics(
        employeeId: string,
        payrollData: any
    ): Promise<void> {
        // 更新员工薪资统计数据
        this.logger.debug('更新员工薪资统计', {
            employeeId,
            netPay: payrollData.netPay
        });
    }
}