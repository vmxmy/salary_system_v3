/**
 * 社保计算服务
 * 
 * 企业级架构与数据库函数的桥接层
 * 提供类型安全、业务友好的社保计算接口
 */

import { 
    DatabaseFunctionAdapter, 
    SocialInsuranceResult, 
    SocialInsuranceComponent,
    BatchCalculationResult,
    BaseValidationResult 
} from '../../../core/adapters/DatabaseFunctionAdapter';
import { EmployeeRepository } from '../../../core/repositories/EmployeeRepository';
import { PayrollRepository } from '../../../core/repositories/PayrollRepository';
import { BusinessRuleEngine } from '../../../core/business-rules/BusinessRuleEngine';
import { Employee } from '../../../core/domain/Employee';
import { PayrollPeriod } from '../../../core/domain/PayrollPeriod';
import { Logger } from '../../../core/infrastructure/Logger';
import { DomainEvent } from '../../../core/domain/DomainEvent';
import { EventBus } from '../../../core/events/EventBus';

// 社保计算请求
export interface SocialInsuranceCalculationRequest {
    employeeId: string;
    periodId: string;
    calculationDate?: string;
    forceRecalculation?: boolean;
    validateOnly?: boolean;
}

// 批量社保计算请求
export interface BatchSocialInsuranceCalculationRequest {
    employeeIds: string[];
    periodId: string;
    calculationDate?: string;
    batchSize?: number;
    continueOnError?: boolean;
}

// 社保计算响应
export interface SocialInsuranceCalculationResponse {
    employeeId: string;
    periodId: string;
    calculationDate: string;
    components: SocialInsuranceComponentResult[];
    summary: {
        totalEmployeeContribution: number;
        totalEmployerContribution: number;
        totalContribution: number;
        applicableInsuranceTypes: string[];
        exemptInsuranceTypes: string[];
    };
    validation: {
        isValid: boolean;
        warnings: string[];
        errors: string[];
    };
    metadata: {
        calculationVersion: string;
        calculatedAt: string;
        calculationDuration: number;
        appliedRules: string[];
    };
}

// 社保组件结果
export interface SocialInsuranceComponentResult {
    type: string;
    name: string;
    baseAmount: number;
    adjustedBaseAmount: number;
    employeeRate: number;
    employerRate: number;
    employeeContribution: number;
    employerContribution: number;
    isApplicable: boolean;
    exemptionReason?: string;
    baseAdjustment?: {
        originalBase: number;
        adjustedBase: number;
        adjustmentReason: string;
    };
}

// 事件定义
export class SocialInsuranceCalculatedEvent extends DomainEvent {
    constructor(
        public readonly employeeId: string,
        public readonly periodId: string,
        public readonly result: SocialInsuranceCalculationResponse,
        public readonly timestamp: Date = new Date()
    ) {
        super('SocialInsuranceCalculated', timestamp);
    }
}

export class BatchSocialInsuranceCalculatedEvent extends DomainEvent {
    constructor(
        public readonly batchId: string,
        public readonly results: SocialInsuranceCalculationResponse[],
        public readonly summary: {
            totalProcessed: number;
            successCount: number;
            errorCount: number;
            totalDuration: number;
        },
        public readonly timestamp: Date = new Date()
    ) {
        super('BatchSocialInsuranceCalculated', timestamp);
    }
}

/**
 * 社保计算服务实现
 * 
 * 职责：
 * 1. 提供统一的社保计算入口
 * 2. 整合数据库函数和业务规则引擎
 * 3. 处理计算结果的业务逻辑转换
 * 4. 发布领域事件
 * 5. 提供计算结果缓存和优化
 */
export class SocialInsuranceCalculationService {
    private logger: Logger;
    private calculationCache = new Map<string, SocialInsuranceCalculationResponse>();

    constructor(
        private dbAdapter: DatabaseFunctionAdapter,
        private employeeRepo: EmployeeRepository,
        private payrollRepo: PayrollRepository,
        private businessRuleEngine: BusinessRuleEngine,
        private eventBus: EventBus
    ) {
        this.logger = Logger.getInstance();
    }

    /**
     * 计算员工社保
     * 
     * @param request 计算请求
     * @returns 计算结果
     */
    async calculateEmployeeSocialInsurance(
        request: SocialInsuranceCalculationRequest
    ): Promise<SocialInsuranceCalculationResponse> {
        const startTime = Date.now();
        
        try {
            this.logger.info('开始社保计算', {
                employeeId: request.employeeId,
                periodId: request.periodId,
                validateOnly: request.validateOnly
            });

            // 检查缓存
            const cacheKey = this.buildCacheKey(request);
            if (!request.forceRecalculation && this.calculationCache.has(cacheKey)) {
                this.logger.info('使用缓存的社保计算结果', { cacheKey });
                return this.calculationCache.get(cacheKey)!;
            }

            // 验证输入参数
            await this.validateCalculationRequest(request);

            // 如果是仅验证模式，执行验证后返回
            if (request.validateOnly) {
                return await this.performValidationOnly(request);
            }

            // 调用数据库函数进行计算
            const dbResult = await this.dbAdapter.calculateEmployeeSocialInsurance(
                request.employeeId,
                request.periodId,
                request.calculationDate || new Date().toISOString().split('T')[0]
            );

            // 转换数据库结果为业务对象
            const response = await this.transformDatabaseResult(dbResult, startTime);

            // 应用业务规则
            await this.applyBusinessRules(response, request);

            // 缓存结果
            this.calculationCache.set(cacheKey, response);

            // 发布计算完成事件
            await this.eventBus.publish(
                new SocialInsuranceCalculatedEvent(
                    request.employeeId,
                    request.periodId,
                    response
                )
            );

            this.logger.info('社保计算完成', {
                employeeId: request.employeeId,
                totalContribution: response.summary.totalContribution,
                duration: Date.now() - startTime
            });

            return response;

        } catch (error) {
            this.logger.error('社保计算失败', {
                employeeId: request.employeeId,
                periodId: request.periodId,
                error: error.message,
                duration: Date.now() - startTime
            });
            throw error;
        }
    }

    /**
     * 批量计算社保
     * 
     * @param request 批量计算请求
     * @returns 批量计算结果
     */
    async batchCalculateSocialInsurance(
        request: BatchSocialInsuranceCalculationRequest
    ): Promise<{
        batchId: string;
        results: SocialInsuranceCalculationResponse[];
        summary: {
            totalProcessed: number;
            successCount: number;
            errorCount: number;
            totalDuration: number;
            avgDuration: number;
        };
        errors: Array<{
            employeeId: string;
            error: string;
        }>;
    }> {
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        
        try {
            this.logger.info('开始批量社保计算', {
                batchId,
                employeeCount: request.employeeIds.length,
                batchSize: request.batchSize || 50
            });

            const results: SocialInsuranceCalculationResponse[] = [];
            const errors: Array<{ employeeId: string; error: string }> = [];
            
            // 分批处理
            const batchSize = request.batchSize || 50;
            const batches = this.chunkArray(request.employeeIds, batchSize);

            for (const batch of batches) {
                try {
                    // 调用数据库批量计算函数
                    const batchResults = await this.dbAdapter.batchCalculateSocialInsurance(
                        batch,
                        request.periodId,
                        request.calculationDate
                    );

                    // 处理批量结果
                    for (const batchResult of batchResults) {
                        if (batchResult.status === 'success') {
                            const response = await this.transformDatabaseResult(
                                batchResult.result, 
                                startTime
                            );
                            results.push(response);
                        } else {
                            errors.push({
                                employeeId: batchResult.employee_id,
                                error: batchResult.error_message || '未知错误'
                            });

                            if (!request.continueOnError) {
                                throw new Error(`员工 ${batchResult.employee_id} 计算失败: ${batchResult.error_message}`);
                            }
                        }
                    }

                } catch (batchError) {
                    this.logger.error('批次处理失败', {
                        batchId,
                        batch,
                        error: batchError.message
                    });

                    if (!request.continueOnError) {
                        throw batchError;
                    }

                    // 记录整个批次的错误
                    batch.forEach(employeeId => {
                        errors.push({
                            employeeId,
                            error: `批次处理失败: ${batchError.message}`
                        });
                    });
                }
            }

            const totalDuration = Date.now() - startTime;
            const summary = {
                totalProcessed: request.employeeIds.length,
                successCount: results.length,
                errorCount: errors.length,
                totalDuration,
                avgDuration: results.length > 0 ? Math.round(totalDuration / results.length) : 0
            };

            // 发布批量计算完成事件
            await this.eventBus.publish(
                new BatchSocialInsuranceCalculatedEvent(batchId, results, summary)
            );

            this.logger.info('批量社保计算完成', {
                batchId,
                ...summary
            });

            return {
                batchId,
                results,
                summary,
                errors
            };

        } catch (error) {
            this.logger.error('批量社保计算失败', {
                batchId,
                error: error.message,
                duration: Date.now() - startTime
            });
            throw error;
        }
    }

    /**
     * 重新计算指定期间的社保
     * 
     * @param periodStart 期间开始
     * @param periodEnd 期间结束
     * @param employeeIds 员工ID列表（可选）
     */
    async recalculatePeriodSocialInsurance(
        periodStart: string,
        periodEnd: string,
        employeeIds?: string[]
    ): Promise<void> {
        try {
            this.logger.info('开始重新计算期间社保', {
                periodStart,
                periodEnd,
                employeeCount: employeeIds?.length || 'all'
            });

            // 清理相关缓存
            this.clearCacheForPeriod(periodStart, periodEnd);

            // 调用数据库批量重算函数
            const results = await this.dbAdapter.batchRecalculateSocialInsurances(
                periodStart,
                periodEnd,
                employeeIds
            );

            const successCount = results.filter(r => r.calculation_status === 'SUCCESS').length;
            const errorCount = results.length - successCount;

            this.logger.info('期间社保重新计算完成', {
                totalCount: results.length,
                successCount,
                errorCount
            });

            // 记录失败的计算
            const failedResults = results.filter(r => r.calculation_status === 'ERROR');
            if (failedResults.length > 0) {
                this.logger.warn('部分员工社保重新计算失败', {
                    failedEmployees: failedResults.map(r => ({
                        employeeId: r.employee_id,
                        employeeName: r.employee_name,
                        error: r.error_message
                    }))
                });
            }

        } catch (error) {
            this.logger.error('期间社保重新计算失败', {
                periodStart,
                periodEnd,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 验证保险基数
     * 
     * @param employeeId 员工ID
     * @param insuranceType 保险类型
     * @param baseAmount 基数金额
     * @param effectiveDate 生效日期
     */
    async validateInsuranceBase(
        employeeId: string,
        insuranceType: string,
        baseAmount: number,
        effectiveDate: string = new Date().toISOString().split('T')[0]
    ): Promise<{
        isValid: boolean;
        originalBase: number;
        adjustedBase: number;
        adjustmentReason?: string;
        limits: {
            minBase: number;
            maxBase: number;
        };
    }> {
        try {
            // 获取员工信息以确定地区
            const employee = await this.employeeRepo.findById(employeeId);
            if (!employee) {
                throw new Error(`员工不存在: ${employeeId}`);
            }

            // 默认使用北京地区规则，实际应该根据员工所在地区确定
            const region = 'beijing';

            const validationResult = await this.dbAdapter.validateInsuranceBase(
                region,
                insuranceType,
                baseAmount,
                effectiveDate
            );

            return {
                isValid: validationResult.valid,
                originalBase: validationResult.base,
                adjustedBase: validationResult.adjusted_base,
                adjustmentReason: validationResult.valid ? undefined : validationResult.adjustment_reason,
                limits: {
                    minBase: validationResult.min_base,
                    maxBase: validationResult.max_base
                }
            };

        } catch (error) {
            this.logger.error('保险基数验证失败', {
                employeeId,
                insuranceType,
                baseAmount,
                error: error.message
            });
            throw error;
        }
    }

    // 私有方法

    private buildCacheKey(request: SocialInsuranceCalculationRequest): string {
        return `si_${request.employeeId}_${request.periodId}_${request.calculationDate || 'current'}`;
    }

    private async validateCalculationRequest(request: SocialInsuranceCalculationRequest): Promise<void> {
        // 验证员工是否存在
        const employee = await this.employeeRepo.findById(request.employeeId);
        if (!employee) {
            throw new Error(`员工不存在: ${request.employeeId}`);
        }

        // 验证薪资期间是否存在
        const period = await this.payrollRepo.findPeriodById(request.periodId);
        if (!period) {
            throw new Error(`薪资期间不存在: ${request.periodId}`);
        }
    }

    private async performValidationOnly(
        request: SocialInsuranceCalculationRequest
    ): Promise<SocialInsuranceCalculationResponse> {
        // 仅验证模式的实现
        // 这里可以执行基数验证、规则检查等，但不进行实际计算
        return {
            employeeId: request.employeeId,
            periodId: request.periodId,
            calculationDate: request.calculationDate || new Date().toISOString().split('T')[0],
            components: [],
            summary: {
                totalEmployeeContribution: 0,
                totalEmployerContribution: 0,
                totalContribution: 0,
                applicableInsuranceTypes: [],
                exemptInsuranceTypes: []
            },
            validation: {
                isValid: true,
                warnings: [],
                errors: []
            },
            metadata: {
                calculationVersion: '2.0',
                calculatedAt: new Date().toISOString(),
                calculationDuration: 0,
                appliedRules: []
            }
        };
    }

    private async transformDatabaseResult(
        dbResult: SocialInsuranceResult,
        startTime: number
    ): Promise<SocialInsuranceCalculationResponse> {
        const components: SocialInsuranceComponentResult[] = dbResult.components.map(comp => ({
            type: comp.code,
            name: comp.name,
            baseAmount: comp.calculation_base,
            adjustedBaseAmount: comp.calculation_base,
            employeeRate: comp.employee_rate,
            employerRate: comp.employer_rate,
            employeeContribution: comp.employee_amount,
            employerContribution: comp.employer_amount,
            isApplicable: comp.is_applicable,
            exemptionReason: comp.is_applicable ? undefined : '不符合适用条件'
        }));

        const applicableComponents = components.filter(c => c.isApplicable);
        const exemptComponents = components.filter(c => !c.isApplicable);

        return {
            employeeId: dbResult.employee_id,
            periodId: dbResult.period_id,
            calculationDate: dbResult.calculation_date,
            components,
            summary: {
                totalEmployeeContribution: dbResult.total_employee,
                totalEmployerContribution: dbResult.total_employer,
                totalContribution: dbResult.total_employee + dbResult.total_employer,
                applicableInsuranceTypes: applicableComponents.map(c => c.type),
                exemptInsuranceTypes: exemptComponents.map(c => c.type)
            },
            validation: {
                isValid: dbResult.errors.length === 0,
                warnings: dbResult.warnings,
                errors: dbResult.errors
            },
            metadata: {
                calculationVersion: dbResult.metadata.calculation_version || '2.0',
                calculatedAt: new Date().toISOString(),
                calculationDuration: Date.now() - startTime,
                appliedRules: dbResult.applied_rules
            }
        };
    }

    private async applyBusinessRules(
        response: SocialInsuranceCalculationResponse,
        request: SocialInsuranceCalculationRequest
    ): Promise<void> {
        // 这里可以应用额外的业务规则
        // 例如：特殊人员的社保减免、政策性调整等
        
        // 示例：检查是否有特殊规则需要应用
        const employee = await this.employeeRepo.findById(request.employeeId);
        if (employee) {
            const specialRules = await this.businessRuleEngine.evaluateRules(
                'social_insurance_special_cases',
                {
                    employee,
                    calculationDate: request.calculationDate,
                    calculationResult: response
                }
            );

            if (specialRules.length > 0) {
                response.metadata.appliedRules.push(...specialRules.map(rule => rule.name));
            }
        }
    }

    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    private clearCacheForPeriod(periodStart: string, periodEnd: string): void {
        const keysToDelete: string[] = [];
        
        for (const [key] of this.calculationCache) {
            // 简单的基于键名的缓存清理策略
            // 实际实现可能需要更复杂的逻辑
            if (key.includes(periodStart) || key.includes(periodEnd)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => {
            this.calculationCache.delete(key);
        });

        this.logger.info('清理社保计算缓存', {
            clearedKeys: keysToDelete.length
        });
    }
}