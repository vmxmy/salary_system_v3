/**
 * 数据库函数适配器
 * 
 * 将已部署的PostgreSQL存储函数包装为领域服务可用的接口
 * 实现数据库计算逻辑与领域层的解耦
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BaseAdapter } from './BaseAdapter';
import { Logger } from '../infrastructure/Logger';

// 社保计算结果类型定义
export interface SocialInsuranceComponent {
    code: string;
    name: string;
    calculation_base: number;
    employee_rate: number;
    employer_rate: number;
    employee_amount: number;
    employer_amount: number;
    min_base: number;
    max_base: number;
    is_applicable: boolean;
    rounding_rule: string;
    calculation_metadata: Record<string, any>;
}

export interface SocialInsuranceResult {
    employee_id: string;
    period_id: string;
    calculation_date: string;
    components: SocialInsuranceComponent[];
    total_employee: number;
    total_employer: number;
    applied_rules: string[];
    unapplied_rules: string[];
    calculation_steps: any[];
    warnings: string[];
    errors: string[];
    metadata: Record<string, any>;
}

// 批量计算结果
export interface BatchCalculationResult {
    employee_id: string;
    result: SocialInsuranceResult;
    status: 'success' | 'error';
    error_message?: string;
}

// 薪资汇总统计
export interface PayrollBatchSummary {
    total_employees: number;
    total_amount: number;
    total_deductions: number;
    total_net_pay: number;
    department_stats: Array<{
        department_name: string;
        employee_count: number;
        total_amount: number;
        avg_amount: number;
    }>;
}

// 基数验证结果
export interface BaseValidationResult {
    valid: boolean;
    base: number;
    adjusted_base: number;
    min_base: number;
    max_base: number;
    adjustment_type: 'no_adjustment' | 'min_adjustment' | 'max_adjustment';
    adjustment_reason: string;
    insurance_type: string;
    adjustment_date: string;
}

/**
 * 数据库函数适配器类
 * 
 * 职责：
 * 1. 封装已部署的数据库存储函数调用
 * 2. 提供类型安全的接口
 * 3. 处理数据库异常和错误
 * 4. 记录执行日志
 */
export class DatabaseFunctionAdapter extends BaseAdapter {
    private logger: Logger;

    constructor(supabaseClient: SupabaseClient) {
        super(supabaseClient);
        this.logger = Logger.getInstance();
    }

    /**
     * 调用社保计算函数
     * 
     * @param employeeId 员工ID
     * @param periodId 薪资期间ID
     * @param calculationDate 计算日期
     * @returns 社保计算结果
     */
    async calculateEmployeeSocialInsurance(
        employeeId: string,
        periodId: string,
        calculationDate: string = new Date().toISOString().split('T')[0]
    ): Promise<SocialInsuranceResult> {
        const startTime = Date.now();

        try {
            this.logger.info('开始调用社保计算函数', {
                employeeId,
                periodId,
                calculationDate
            });

            const { data, error } = await this.supabase
                .rpc('calculate_employee_social_insurance', {
                    p_employee_id: employeeId,
                    p_period_id: periodId,
                    p_calculation_date: calculationDate
                });

            if (error) {
                throw new Error(`社保计算函数调用失败: ${error.message}`);
            }

            if (!data) {
                throw new Error('社保计算函数返回空结果');
            }

            const result: SocialInsuranceResult = {
                employee_id: data.employee_id,
                period_id: data.period_id,
                calculation_date: data.calculation_date,
                components: data.components || [],
                total_employee: Number(data.total_employee || 0),
                total_employer: Number(data.total_employer || 0),
                applied_rules: data.applied_rules || [],
                unapplied_rules: data.unapplied_rules || [],
                calculation_steps: data.calculation_steps || [],
                warnings: data.warnings || [],
                errors: data.errors || [],
                metadata: data.metadata || {}
            };

            // 检查计算结果中的错误
            if (result.errors && result.errors.length > 0) {
                this.logger.warn('社保计算包含错误', { 
                    employeeId, 
                    errors: result.errors 
                });
            }

            this.logger.info('社保计算函数调用成功', {
                employeeId,
                totalEmployee: result.total_employee,
                totalEmployer: result.total_employer,
                duration: Date.now() - startTime
            });

            return result;

        } catch (error) {
            this.logger.error('社保计算函数调用异常', {
                employeeId,
                periodId,
                error: error.message,
                duration: Date.now() - startTime
            });
            throw error;
        }
    }

    /**
     * 批量社保计算
     * 
     * @param employeeIds 员工ID数组
     * @param periodId 薪资期间ID
     * @param calculationDate 计算日期
     * @returns 批量计算结果
     */
    async batchCalculateSocialInsurance(
        employeeIds: string[],
        periodId: string,
        calculationDate: string = new Date().toISOString().split('T')[0]
    ): Promise<BatchCalculationResult[]> {
        const startTime = Date.now();

        try {
            this.logger.info('开始批量社保计算', {
                employeeCount: employeeIds.length,
                periodId,
                calculationDate
            });

            const { data, error } = await this.supabase
                .rpc('batch_calculate_social_insurance', {
                    p_employee_ids: employeeIds,
                    p_period_id: periodId,
                    p_calculation_date: calculationDate
                });

            if (error) {
                throw new Error(`批量社保计算函数调用失败: ${error.message}`);
            }

            const results: BatchCalculationResult[] = (data || []).map((item: any) => ({
                employee_id: item.employee_id,
                result: item.result,
                status: item.status,
                error_message: item.error_message
            }));

            const successCount = results.filter(r => r.status === 'success').length;
            const errorCount = results.length - successCount;

            this.logger.info('批量社保计算完成', {
                totalCount: results.length,
                successCount,
                errorCount,
                duration: Date.now() - startTime
            });

            return results;

        } catch (error) {
            this.logger.error('批量社保计算异常', {
                employeeIds,
                periodId,
                error: error.message,
                duration: Date.now() - startTime
            });
            throw error;
        }
    }

    /**
     * 触发所有保险计算
     * 
     * @param payrollId 薪资记录ID
     * @param employeeId 员工ID
     * @param effectiveDate 生效日期
     */
    async calculateAllSocialInsurances(
        payrollId: string,
        employeeId: string,
        effectiveDate: string = new Date().toISOString().split('T')[0]
    ): Promise<void> {
        try {
            this.logger.info('开始触发所有保险计算', {
                payrollId,
                employeeId,
                effectiveDate
            });

            const { error } = await this.supabase
                .rpc('calculate_all_social_insurances', {
                    p_payroll_id: payrollId,
                    p_employee_id: employeeId,
                    p_effective_date: effectiveDate
                });

            if (error) {
                throw new Error(`所有保险计算函数调用失败: ${error.message}`);
            }

            this.logger.info('所有保险计算触发成功', {
                payrollId,
                employeeId
            });

        } catch (error) {
            this.logger.error('触发所有保险计算异常', {
                payrollId,
                employeeId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 验证保险基数
     * 
     * @param region 地区
     * @param insuranceType 保险类型
     * @param base 基数
     * @param effectiveDate 生效日期
     * @returns 验证结果
     */
    async validateInsuranceBase(
        region: string,
        insuranceType: string,
        base: number,
        effectiveDate: string = new Date().toISOString().split('T')[0]
    ): Promise<BaseValidationResult> {
        try {
            const { data, error } = await this.supabase
                .rpc('validate_insurance_base', {
                    p_region: region,
                    p_insurance_type: insuranceType,
                    p_base: base,
                    p_effective_date: effectiveDate
                });

            if (error) {
                throw new Error(`保险基数验证函数调用失败: ${error.message}`);
            }

            return {
                valid: data.valid,
                base: Number(data.base),
                adjusted_base: Number(data.adjusted_base),
                min_base: Number(data.min_base),
                max_base: Number(data.max_base),
                adjustment_type: data.adjustment_type,
                adjustment_reason: data.adjustment_reason,
                insurance_type: data.insurance_type,
                adjustment_date: data.adjustment_date
            };

        } catch (error) {
            this.logger.error('保险基数验证异常', {
                region,
                insuranceType,
                base,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取薪资批次汇总
     * 
     * @param batchId 批次ID
     * @returns 汇总统计
     */
    async getPayrollBatchSummary(batchId: string): Promise<PayrollBatchSummary> {
        try {
            const { data, error } = await this.supabase
                .rpc('get_payroll_batch_summary', {
                    p_batch_id: batchId
                });

            if (error) {
                throw new Error(`薪资批次汇总函数调用失败: ${error.message}`);
            }

            return {
                total_employees: Number(data.total_employees || 0),
                total_amount: Number(data.total_amount || 0),
                total_deductions: Number(data.total_deductions || 0),
                total_net_pay: Number(data.total_net_pay || 0),
                department_stats: data.department_stats || []
            };

        } catch (error) {
            this.logger.error('获取薪资批次汇总异常', {
                batchId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 批量重算社保
     * 
     * @param payPeriodStart 薪资期间开始
     * @param payPeriodEnd 薪资期间结束
     * @param employeeIds 员工ID数组（可选）
     * @returns 重算结果
     */
    async batchRecalculateSocialInsurances(
        payPeriodStart: string,
        payPeriodEnd: string,
        employeeIds?: string[]
    ): Promise<Array<{
        payroll_id: string;
        employee_id: string;
        employee_name: string;
        calculation_status: 'SUCCESS' | 'ERROR';
        error_message?: string;
    }>> {
        try {
            this.logger.info('开始批量重算社保', {
                payPeriodStart,
                payPeriodEnd,
                employeeCount: employeeIds?.length || 'all'
            });

            const { data, error } = await this.supabase
                .rpc('batch_recalculate_social_insurances', {
                    p_pay_period_start: payPeriodStart,
                    p_pay_period_end: payPeriodEnd,
                    p_employee_ids: employeeIds || null
                });

            if (error) {
                throw new Error(`批量重算社保函数调用失败: ${error.message}`);
            }

            const results = (data || []).map((item: any) => ({
                payroll_id: item.payroll_id,
                employee_id: item.employee_id,
                employee_name: item.employee_name,
                calculation_status: item.calculation_status,
                error_message: item.error_message
            }));

            const successCount = results.filter(r => r.calculation_status === 'SUCCESS').length;

            this.logger.info('批量重算社保完成', {
                totalCount: results.length,
                successCount,
                errorCount: results.length - successCount
            });

            return results;

        } catch (error) {
            this.logger.error('批量重算社保异常', {
                payPeriodStart,
                payPeriodEnd,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 复制薪资数据
     * 
     * @param sourcePeriodStart 源期间开始
     * @param sourcePeriodEnd 源期间结束
     * @param targetPeriodStart 目标期间开始
     * @param targetPeriodEnd 目标期间结束
     * @param targetPayDate 目标发薪日
     * @param selectedEmployeeIds 选中的员工ID（可选）
     * @returns 复制结果
     */
    async copyPayrollDataFromSource(
        sourcePeriodStart: string,
        sourcePeriodEnd: string,
        targetPeriodStart: string,
        targetPeriodEnd: string,
        targetPayDate: string,
        selectedEmployeeIds?: string[]
    ): Promise<{
        copied_employees: number;
        copied_items: number;
        total_amount: number;
    }> {
        try {
            this.logger.info('开始复制薪资数据', {
                sourcePeriodStart,
                sourcePeriodEnd,
                targetPeriodStart,
                targetPeriodEnd,
                selectedEmployeeCount: selectedEmployeeIds?.length || 'all'
            });

            const { data, error } = await this.supabase
                .rpc('copy_payroll_data_from_source', {
                    p_source_period_start: sourcePeriodStart,
                    p_source_period_end: sourcePeriodEnd,
                    p_target_period_start: targetPeriodStart,
                    p_target_period_end: targetPeriodEnd,
                    p_target_pay_date: targetPayDate,
                    p_selected_employee_ids: selectedEmployeeIds || null
                });

            if (error) {
                throw new Error(`复制薪资数据函数调用失败: ${error.message}`);
            }

            const result = {
                copied_employees: Number(data[0]?.copied_employees || 0),
                copied_items: Number(data[0]?.copied_items || 0),
                total_amount: Number(data[0]?.total_amount || 0)
            };

            this.logger.info('薪资数据复制完成', result);

            return result;

        } catch (error) {
            this.logger.error('复制薪资数据异常', {
                sourcePeriodStart,
                targetPeriodStart,
                error: error.message
            });
            throw error;
        }
    }
}