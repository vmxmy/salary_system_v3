/**
 * 个人所得税服务
 * 
 * 支持多种个税处理方式：
 * 1. Excel批量导入（当前主要方式）
 * 2. 手工录入
 * 3. 自动计算（未来扩展）
 */

import { EmployeeRepository } from '../../../core/repositories/EmployeeRepository';
import { PayrollRepository } from '../../../core/repositories/PayrollRepository';
import { DatabaseFunctionAdapter } from '../../../core/adapters/DatabaseFunctionAdapter';
import { Logger } from '../../../core/infrastructure/Logger';
import { DomainEvent } from '../../../core/domain/DomainEvent';
import { EventBus } from '../../../core/events/EventBus';

// 个税数据导入结果
export interface TaxImportResult {
    employeeId: string;
    employeeName: string;
    periodId: string;
    taxableIncome: number;
    taxAmount: number;
    deductionAmount: number;
    specialDeductions: SpecialDeduction[];
    status: 'success' | 'error' | 'warning';
    message?: string;
}

// 专项扣除项目
export interface SpecialDeduction {
    type: 'child_education' | 'continuing_education' | 'housing_loan' | 'housing_rent' | 'elderly_care' | 'medical_treatment';
    name: string;
    amount: number;
    description?: string;
}

// 个税计算结果
export interface TaxCalculationResult {
    employeeId: string;
    periodId: string;
    grossIncome: number;
    socialInsuranceDeduction: number;
    housingFundDeduction: number;
    standardDeduction: number; // 起征点 5000
    specialDeductions: SpecialDeduction[];
    totalSpecialDeductions: number;
    taxableIncome: number;
    taxAmount: number;
    taxRate: number;
    quickDeduction: number;
    netIncome: number;
    calculationMethod: 'imported' | 'calculated' | 'manual';
    calculatedAt: string;
    metadata: Record<string, any>;
}

// 批量导入请求
export interface BatchTaxImportRequest {
    periodId: string;
    importData: Array<{
        employeeCode: string;
        employeeName: string;
        taxableIncome: number;
        taxAmount: number;
        deductionAmount?: number;
        specialDeductions?: SpecialDeduction[];
        notes?: string;
    }>;
    importMode: 'replace' | 'update' | 'append';
    validateOnly?: boolean;
}

// 个税验证结果
export interface TaxValidationResult {
    isValid: boolean;
    warnings: string[];
    errors: string[];
    suggestions: string[];
}

// 事件定义
export class PersonalIncomeTaxImportedEvent extends DomainEvent {
    constructor(
        public readonly periodId: string,
        public readonly results: TaxImportResult[],
        public readonly summary: {
            totalRecords: number;
            successCount: number;
            errorCount: number;
            warningCount: number;
        },
        public readonly timestamp: Date = new Date()
    ) {
        super('PersonalIncomeTaxImported', timestamp);
    }
}

export class PersonalIncomeTaxCalculatedEvent extends DomainEvent {
    constructor(
        public readonly employeeId: string,
        public readonly periodId: string,
        public readonly result: TaxCalculationResult,
        public readonly timestamp: Date = new Date()
    ) {
        super('PersonalIncomeTaxCalculated', timestamp);
    }
}

/**
 * 个人所得税服务实现
 * 
 * 职责：
 * 1. 处理Excel批量导入个税数据
 * 2. 验证个税数据的合理性
 * 3. 支持手工录入和调整
 * 4. 预留自动计算能力
 * 5. 管理个税相关的业务逻辑
 */
export class PersonalIncomeTaxService {
    private logger: Logger;

    constructor(
        private employeeRepo: EmployeeRepository,
        private payrollRepo: PayrollRepository,
        private dbAdapter: DatabaseFunctionAdapter,
        private eventBus: EventBus
    ) {
        this.logger = Logger.getInstance();
    }

    /**
     * 批量导入个税数据
     * 
     * @param request 导入请求
     * @returns 导入结果
     */
    async batchImportTaxData(request: BatchTaxImportRequest): Promise<{
        results: TaxImportResult[];
        summary: {
            totalRecords: number;
            successCount: number;
            errorCount: number;
            warningCount: number;
            totalTaxAmount: number;
            avgTaxAmount: number;
        };
    }> {
        const startTime = Date.now();
        
        try {
            this.logger.info('开始批量导入个税数据', {
                periodId: request.periodId,
                recordCount: request.importData.length,
                importMode: request.importMode,
                validateOnly: request.validateOnly
            });

            const results: TaxImportResult[] = [];
            
            // 验证薪资期间是否存在
            const period = await this.payrollRepo.findPeriodById(request.periodId);
            if (!period) {
                throw new Error(`薪资期间不存在: ${request.periodId}`);
            }

            // 如果是替换模式，先清理现有数据
            if (request.importMode === 'replace' && !request.validateOnly) {
                await this.clearExistingTaxData(request.periodId);
            }

            // 逐条处理导入数据
            for (const importItem of request.importData) {
                try {
                    const result = await this.processImportItem(
                        importItem, 
                        request.periodId, 
                        request.importMode,
                        request.validateOnly
                    );
                    results.push(result);
                } catch (error) {
                    results.push({
                        employeeId: '',
                        employeeName: importItem.employeeName,
                        periodId: request.periodId,
                        taxableIncome: importItem.taxableIncome,
                        taxAmount: importItem.taxAmount,
                        deductionAmount: importItem.deductionAmount || 0,
                        specialDeductions: importItem.specialDeductions || [],
                        status: 'error',
                        message: error.message
                    });
                }
            }

            // 统计结果
            const successCount = results.filter(r => r.status === 'success').length;
            const errorCount = results.filter(r => r.status === 'error').length;
            const warningCount = results.filter(r => r.status === 'warning').length;
            const totalTaxAmount = results
                .filter(r => r.status === 'success')
                .reduce((sum, r) => sum + r.taxAmount, 0);

            const summary = {
                totalRecords: request.importData.length,
                successCount,
                errorCount,
                warningCount,
                totalTaxAmount,
                avgTaxAmount: successCount > 0 ? Math.round(totalTaxAmount / successCount) : 0
            };

            // 发布导入完成事件
            if (!request.validateOnly) {
                await this.eventBus.publish(
                    new PersonalIncomeTaxImportedEvent(request.periodId, results, summary)
                );
            }

            this.logger.info('个税数据批量导入完成', {
                periodId: request.periodId,
                ...summary,
                duration: Date.now() - startTime
            });

            return { results, summary };

        } catch (error) {
            this.logger.error('批量导入个税数据失败', {
                periodId: request.periodId,
                error: error.message,
                duration: Date.now() - startTime
            });
            throw error;
        }
    }

    /**
     * 手动设置员工个税
     * 
     * @param employeeId 员工ID
     * @param periodId 期间ID
     * @param taxData 个税数据
     */
    async setEmployeeTax(
        employeeId: string,
        periodId: string,
        taxData: {
            taxableIncome: number;
            taxAmount: number;
            deductionAmount?: number;
            specialDeductions?: SpecialDeduction[];
            notes?: string;
        }
    ): Promise<TaxCalculationResult> {
        try {
            this.logger.info('手动设置员工个税', {
                employeeId,
                periodId,
                taxAmount: taxData.taxAmount
            });

            // 验证员工和期间
            const employee = await this.employeeRepo.findById(employeeId);
            if (!employee) {
                throw new Error(`员工不存在: ${employeeId}`);
            }

            const period = await this.payrollRepo.findPeriodById(periodId);
            if (!period) {
                throw new Error(`薪资期间不存在: ${periodId}`);
            }

            // 验证个税数据
            const validation = await this.validateTaxData({
                employeeId,
                taxableIncome: taxData.taxableIncome,
                taxAmount: taxData.taxAmount,
                deductionAmount: taxData.deductionAmount || 0,
                specialDeductions: taxData.specialDeductions || []
            });

            if (!validation.isValid && validation.errors.length > 0) {
                throw new Error(`个税数据验证失败: ${validation.errors.join(', ')}`);
            }

            // 保存个税数据到数据库
            await this.saveTaxDataToDatabase(employeeId, periodId, taxData);

            // 构建计算结果
            const result: TaxCalculationResult = {
                employeeId,
                periodId,
                grossIncome: 0, // 需要从薪资数据获取
                socialInsuranceDeduction: 0, // 需要从社保计算结果获取
                housingFundDeduction: 0,
                standardDeduction: 5000,
                specialDeductions: taxData.specialDeductions || [],
                totalSpecialDeductions: (taxData.specialDeductions || []).reduce((sum, d) => sum + d.amount, 0),
                taxableIncome: taxData.taxableIncome,
                taxAmount: taxData.taxAmount,
                taxRate: this.calculateTaxRate(taxData.taxableIncome, taxData.taxAmount),
                quickDeduction: 0,
                netIncome: taxData.taxableIncome - taxData.taxAmount,
                calculationMethod: 'manual',
                calculatedAt: new Date().toISOString(),
                metadata: {
                    deductionAmount: taxData.deductionAmount || 0,
                    notes: taxData.notes,
                    validation
                }
            };

            // 发布个税设置事件
            await this.eventBus.publish(
                new PersonalIncomeTaxCalculatedEvent(employeeId, periodId, result)
            );

            return result;

        } catch (error) {
            this.logger.error('手动设置员工个税失败', {
                employeeId,
                periodId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取员工个税信息
     * 
     * @param employeeId 员工ID
     * @param periodId 期间ID
     * @returns 个税计算结果
     */
    async getEmployeeTax(
        employeeId: string,
        periodId: string
    ): Promise<TaxCalculationResult | null> {
        try {
            // 从数据库查询个税数据
            const taxData = await this.getTaxDataFromDatabase(employeeId, periodId);
            
            if (!taxData) {
                return null;
            }

            // 获取薪资数据以补充完整信息
            const payrollData = await this.payrollRepo.findPayrollByEmployeeAndPeriod(employeeId, periodId);
            
            return {
                employeeId,
                periodId,
                grossIncome: payrollData?.grossPay || 0,
                socialInsuranceDeduction: payrollData?.socialInsuranceDeduction || 0,
                housingFundDeduction: payrollData?.housingFundDeduction || 0,
                standardDeduction: 5000,
                specialDeductions: taxData.specialDeductions || [],
                totalSpecialDeductions: (taxData.specialDeductions || []).reduce((sum, d) => sum + d.amount, 0),
                taxableIncome: taxData.taxableIncome,
                taxAmount: taxData.taxAmount,
                taxRate: this.calculateTaxRate(taxData.taxableIncome, taxData.taxAmount),
                quickDeduction: 0,
                netIncome: taxData.taxableIncome - taxData.taxAmount,
                calculationMethod: taxData.calculationMethod,
                calculatedAt: taxData.calculatedAt,
                metadata: taxData.metadata || {}
            };

        } catch (error) {
            this.logger.error('获取员工个税信息失败', {
                employeeId,
                periodId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 验证个税数据
     * 
     * @param taxData 个税数据
     * @returns 验证结果
     */
    async validateTaxData(taxData: {
        employeeId: string;
        taxableIncome: number;
        taxAmount: number;
        deductionAmount: number;
        specialDeductions: SpecialDeduction[];
    }): Promise<TaxValidationResult> {
        const warnings: string[] = [];
        const errors: string[] = [];
        const suggestions: string[] = [];

        try {
            // 基本数值验证
            if (taxData.taxableIncome < 0) {
                errors.push('应纳税所得额不能为负数');
            }

            if (taxData.taxAmount < 0) {
                errors.push('个税金额不能为负数');
            }

            if (taxData.taxAmount > taxData.taxableIncome) {
                errors.push('个税金额不能超过应纳税所得额');
            }

            // 税率合理性验证
            if (taxData.taxableIncome > 0 && taxData.taxAmount > 0) {
                const effectiveRate = (taxData.taxAmount / taxData.taxableIncome) * 100;
                
                if (effectiveRate > 45) {
                    warnings.push(`有效税率${effectiveRate.toFixed(2)}%过高，请核实`);
                }

                // 根据税率表验证
                const expectedTaxInfo = this.calculateExpectedTax(taxData.taxableIncome);
                const deviation = Math.abs(taxData.taxAmount - expectedTaxInfo.expectedTax) / expectedTaxInfo.expectedTax;
                
                if (deviation > 0.1) { // 偏差超过10%
                    warnings.push(`个税金额与预期相比偏差${(deviation * 100).toFixed(1)}%，预期约${expectedTaxInfo.expectedTax}元`);
                }
            }

            // 专项扣除验证
            for (const deduction of taxData.specialDeductions) {
                if (deduction.amount < 0) {
                    errors.push(`专项扣除"${deduction.name}"金额不能为负数`);
                }
                
                // 验证扣除额度上限
                const limit = this.getSpecialDeductionLimit(deduction.type);
                if (deduction.amount > limit) {
                    warnings.push(`专项扣除"${deduction.name}"金额${deduction.amount}元超过上限${limit}元`);
                }
            }

            // 提供改进建议
            if (taxData.taxAmount === 0 && taxData.taxableIncome > 5000) {
                suggestions.push('应纳税所得额超过5000元但个税为0，请确认是否有未申报的专项扣除');
            }

            return {
                isValid: errors.length === 0,
                warnings,
                errors,
                suggestions
            };

        } catch (error) {
            this.logger.error('个税数据验证异常', {
                employeeId: taxData.employeeId,
                error: error.message
            });
            
            return {
                isValid: false,
                warnings: [],
                errors: [`验证过程异常: ${error.message}`],
                suggestions: []
            };
        }
    }

    /**
     * 获取期间个税汇总
     * 
     * @param periodId 期间ID
     * @returns 汇总统计
     */
    async getPeriodTaxSummary(periodId: string): Promise<{
        totalEmployees: number;
        totalTaxableIncome: number;
        totalTaxAmount: number;
        avgTaxAmount: number;
        maxTaxAmount: number;
        minTaxAmount: number;
        taxRateDistribution: Array<{
            range: string;
            count: number;
            totalAmount: number;
        }>;
        departmentStats: Array<{
            departmentName: string;
            employeeCount: number;
            totalTaxAmount: number;
            avgTaxAmount: number;
        }>;
    }> {
        try {
            // 这里应该调用数据库查询获取汇总数据
            // 由于没有具体的数据库查询函数，这里提供一个框架
            
            const summary = await this.getTaxSummaryFromDatabase(periodId);
            
            this.logger.info('获取期间个税汇总', {
                periodId,
                totalEmployees: summary.totalEmployees,
                totalTaxAmount: summary.totalTaxAmount
            });

            return summary;

        } catch (error) {
            this.logger.error('获取期间个税汇总失败', {
                periodId,
                error: error.message
            });
            throw error;
        }
    }

    // 私有方法

    private async processImportItem(
        importItem: BatchTaxImportRequest['importData'][0],
        periodId: string,
        importMode: string,
        validateOnly: boolean
    ): Promise<TaxImportResult> {
        // 查找员工
        const employee = await this.employeeRepo.findByEmployeeCode(importItem.employeeCode);
        if (!employee) {
            throw new Error(`员工代码不存在: ${importItem.employeeCode}`);
        }

        // 验证个税数据
        const validation = await this.validateTaxData({
            employeeId: employee.id,
            taxableIncome: importItem.taxableIncome,
            taxAmount: importItem.taxAmount,
            deductionAmount: importItem.deductionAmount || 0,
            specialDeductions: importItem.specialDeductions || []
        });

        const status = validation.isValid 
            ? (validation.warnings.length > 0 ? 'warning' : 'success')
            : 'error';

        // 如果不是仅验证模式，保存数据
        if (!validateOnly && status !== 'error') {
            await this.saveTaxDataToDatabase(employee.id, periodId, {
                taxableIncome: importItem.taxableIncome,
                taxAmount: importItem.taxAmount,
                deductionAmount: importItem.deductionAmount,
                specialDeductions: importItem.specialDeductions,
                notes: importItem.notes
            });
        }

        return {
            employeeId: employee.id,
            employeeName: importItem.employeeName,
            periodId,
            taxableIncome: importItem.taxableIncome,
            taxAmount: importItem.taxAmount,
            deductionAmount: importItem.deductionAmount || 0,
            specialDeductions: importItem.specialDeductions || [],
            status,
            message: status === 'error' 
                ? validation.errors.join(', ')
                : validation.warnings.join(', ') || undefined
        };
    }

    private calculateTaxRate(taxableIncome: number, taxAmount: number): number {
        if (taxableIncome <= 0) return 0;
        return (taxAmount / taxableIncome) * 100;
    }

    private calculateExpectedTax(taxableIncome: number): {
        expectedTax: number;
        taxRate: number;
        quickDeduction: number;
    } {
        // 2024年个税税率表
        const taxBrackets = [
            { min: 0, max: 3000, rate: 0.03, quickDeduction: 0 },
            { min: 3000, max: 12000, rate: 0.10, quickDeduction: 210 },
            { min: 12000, max: 25000, rate: 0.20, quickDeduction: 1410 },
            { min: 25000, max: 35000, rate: 0.25, quickDeduction: 2660 },
            { min: 35000, max: 55000, rate: 0.30, quickDeduction: 4410 },
            { min: 55000, max: 80000, rate: 0.35, quickDeduction: 7160 },
            { min: 80000, max: Infinity, rate: 0.45, quickDeduction: 15160 }
        ];

        for (const bracket of taxBrackets) {
            if (taxableIncome > bracket.min && taxableIncome <= bracket.max) {
                const expectedTax = Math.max(0, taxableIncome * bracket.rate - bracket.quickDeduction);
                return {
                    expectedTax: Math.round(expectedTax),
                    taxRate: bracket.rate * 100,
                    quickDeduction: bracket.quickDeduction
                };
            }
        }

        return { expectedTax: 0, taxRate: 0, quickDeduction: 0 };
    }

    private getSpecialDeductionLimit(type: SpecialDeduction['type']): number {
        // 2024年专项扣除标准
        const limits = {
            child_education: 1000,      // 子女教育
            continuing_education: 400,   // 继续教育
            housing_loan: 1000,         // 住房贷款利息
            housing_rent: 1500,         // 住房租金（一线城市）
            elderly_care: 2000,         // 赡养老人
            medical_treatment: 80000    // 大病医疗（年度）
        };

        return limits[type] || 0;
    }

    private async clearExistingTaxData(periodId: string): Promise<void> {
        // 这里应该调用数据库清理指定期间的个税数据
        this.logger.info('清理现有个税数据', { periodId });
    }

    private async saveTaxDataToDatabase(
        employeeId: string,
        periodId: string,
        taxData: any
    ): Promise<void> {
        // 这里应该调用数据库保存个税数据
        // 可能涉及的表：personal_income_tax_calculation_logs
        this.logger.info('保存个税数据到数据库', {
            employeeId,
            periodId,
            taxAmount: taxData.taxAmount
        });
    }

    private async getTaxDataFromDatabase(
        employeeId: string,
        periodId: string
    ): Promise<any> {
        // 这里应该从数据库查询个税数据
        this.logger.info('从数据库获取个税数据', { employeeId, periodId });
        return null;
    }

    private async getTaxSummaryFromDatabase(periodId: string): Promise<any> {
        // 这里应该从数据库获取个税汇总统计
        this.logger.info('从数据库获取个税汇总', { periodId });
        return {
            totalEmployees: 0,
            totalTaxableIncome: 0,
            totalTaxAmount: 0,
            avgTaxAmount: 0,
            maxTaxAmount: 0,
            minTaxAmount: 0,
            taxRateDistribution: [],
            departmentStats: []
        };
    }
}