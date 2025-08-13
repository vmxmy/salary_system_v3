/**
 * 薪资计算引擎服务
 * 
 * 前端调用Edge Function的统一接口
 * 整合企业级架构和现有数据库函数
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../../core/infrastructure/Logger';

// Edge Function请求接口
interface EdgeFunctionRequest {
  action: 'calculate_social_insurance' | 'batch_calculate_social_insurance' | 
          'import_tax_data' | 'generate_summary' | 'compare_periods' |
          'validate_base' | 'recalculate_period';
  data: any;
  options?: {
    useCache?: boolean;
    validateOnly?: boolean;
    batchSize?: number;
    includeBreakdown?: boolean;
  };
}

// Edge Function响应接口
interface EdgeFunctionResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    requestId: string;
    timestamp: string;
    duration: number;
    version: string;
  };
}

/**
 * 薪资计算引擎服务
 * 
 * 职责：
 * 1. 提供前端调用薪资计算的统一接口
 * 2. 封装Edge Function调用逻辑
 * 3. 处理请求/响应的数据转换
 * 4. 实现错误处理和重试机制
 * 5. 提供类型安全的API
 */
export class PayrollCalculationEngineService {
    private logger: Logger;
    private functionName = 'payroll-calculation-engine';

    constructor(private supabase: SupabaseClient) {
        this.logger = Logger.getInstance();
    }

    /**
     * 计算单个员工社保
     * 
     * @param employeeId 员工ID
     * @param periodId 期间ID
     * @param calculationDate 计算日期
     * @returns 计算结果
     */
    async calculateEmployeeSocialInsurance(
        employeeId: string,
        periodId: string,
        calculationDate?: string
    ): Promise<any> {
        return this.callEdgeFunction({
            action: 'calculate_social_insurance',
            data: {
                employeeId,
                periodId,
                calculationDate
            }
        });
    }

    /**
     * 批量计算社保
     * 
     * @param employeeIds 员工ID列表
     * @param periodId 期间ID
     * @param options 选项
     * @returns 批量计算结果
     */
    async batchCalculateSocialInsurance(
        employeeIds: string[],
        periodId: string,
        options: {
            calculationDate?: string;
            batchSize?: number;
        } = {}
    ): Promise<any> {
        return this.callEdgeFunction({
            action: 'batch_calculate_social_insurance',
            data: {
                employeeIds,
                periodId,
                calculationDate: options.calculationDate
            },
            options: {
                batchSize: options.batchSize
            }
        });
    }

    /**
     * 批量导入个税数据
     * 
     * @param periodId 期间ID
     * @param taxData 个税数据列表
     * @param validateOnly 是否仅验证
     * @returns 导入结果
     */
    async importPersonalIncomeTaxData(
        periodId: string,
        taxData: Array<{
            employeeCode: string;
            employeeName: string;
            taxableIncome: number;
            taxAmount: number;
            deductionAmount?: number;
        }>,
        validateOnly: boolean = false
    ): Promise<any> {
        return this.callEdgeFunction({
            action: 'import_tax_data',
            data: {
                periodId,
                taxData
            },
            options: {
                validateOnly
            }
        });
    }

    /**
     * 生成薪资汇总报告
     * 
     * @param periodId 期间ID
     * @param options 选项
     * @returns 汇总报告
     */
    async generatePayrollSummary(
        periodId: string,
        options: {
            useCache?: boolean;
            includeDepartmentBreakdown?: boolean;
            includePositionBreakdown?: boolean;
        } = {}
    ): Promise<any> {
        return this.callEdgeFunction({
            action: 'generate_summary',
            data: {
                periodId
            },
            options
        });
    }

    /**
     * 生成期间对比分析
     * 
     * @param currentPeriodId 当前期间ID
     * @param previousPeriodId 对比期间ID（可选）
     * @returns 对比分析结果
     */
    async comparePayrollPeriods(
        currentPeriodId: string,
        previousPeriodId?: string
    ): Promise<any> {
        return this.callEdgeFunction({
            action: 'compare_periods',
            data: {
                currentPeriodId,
                previousPeriodId
            }
        });
    }

    /**
     * 验证保险基数
     * 
     * @param region 地区
     * @param insuranceType 保险类型
     * @param baseAmount 基数金额
     * @param effectiveDate 生效日期
     * @returns 验证结果
     */
    async validateInsuranceBase(
        region: string,
        insuranceType: string,
        baseAmount: number,
        effectiveDate?: string
    ): Promise<any> {
        return this.callEdgeFunction({
            action: 'validate_base',
            data: {
                region,
                insuranceType,
                baseAmount,
                effectiveDate
            }
        });
    }

    /**
     * 重新计算指定期间的薪资
     * 
     * @param periodStart 期间开始
     * @param periodEnd 期间结束
     * @param employeeIds 员工ID列表（可选）
     * @returns 重算结果
     */
    async recalculatePeriod(
        periodStart: string,
        periodEnd: string,
        employeeIds?: string[]
    ): Promise<any> {
        return this.callEdgeFunction({
            action: 'recalculate_period',
            data: {
                periodStart,
                periodEnd,
                employeeIds
            }
        });
    }

    /**
     * 获取计算引擎状态
     */
    async getEngineStatus(): Promise<{
        available: boolean;
        version: string;
        lastCheck: string;
        capabilities: string[];
    }> {
        try {
            // 发送一个轻量级的测试请求
            const result = await this.callEdgeFunction({
                action: 'validate_base',
                data: {
                    region: 'beijing',
                    insuranceType: 'pension',
                    baseAmount: 5000
                }
            });

            return {
                available: true,
                version: result.metadata?.version || '2.0',
                lastCheck: new Date().toISOString(),
                capabilities: [
                    'calculate_social_insurance',
                    'batch_calculate_social_insurance',
                    'import_tax_data',
                    'generate_summary',
                    'compare_periods',
                    'validate_base',
                    'recalculate_period'
                ]
            };
        } catch (error) {
            this.logger.error('计算引擎状态检查失败', { error: error.message });
            
            return {
                available: false,
                version: 'unknown',
                lastCheck: new Date().toISOString(),
                capabilities: []
            };
        }
    }

    // 私有方法

    /**
     * 调用Edge Function
     * 
     * @param request 请求参数
     * @param retries 重试次数
     * @returns 响应结果
     */
    private async callEdgeFunction(
        request: EdgeFunctionRequest,
        retries: number = 2
    ): Promise<any> {
        const startTime = Date.now();
        let lastError: Error;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                this.logger.info('调用薪资计算引擎', {
                    action: request.action,
                    attempt: attempt + 1,
                    maxAttempts: retries + 1
                });

                const { data, error } = await this.supabase.functions.invoke(
                    this.functionName,
                    {
                        body: request,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (error) {
                    throw new Error(`Edge Function调用失败: ${error.message}`);
                }

                const response: EdgeFunctionResponse = data;

                if (!response.success) {
                    throw new Error(response.error || '计算引擎返回错误');
                }

                this.logger.info('薪资计算引擎调用成功', {
                    action: request.action,
                    requestId: response.metadata?.requestId,
                    duration: Date.now() - startTime,
                    engineDuration: response.metadata?.duration
                });

                return response.data;

            } catch (error) {
                lastError = error;
                const isLastAttempt = attempt === retries;

                this.logger.warn('薪资计算引擎调用失败', {
                    action: request.action,
                    attempt: attempt + 1,
                    error: error.message,
                    willRetry: !isLastAttempt
                });

                if (isLastAttempt) {
                    break;
                }

                // 重试前等待
                await this.delay(Math.pow(2, attempt) * 1000); // 指数退避
            }
        }

        this.logger.error('薪资计算引擎调用最终失败', {
            action: request.action,
            attempts: retries + 1,
            totalDuration: Date.now() - startTime,
            error: lastError.message
        });

        throw new Error(`薪资计算引擎调用失败: ${lastError.message}`);
    }

    /**
     * 延时函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 验证请求参数
     */
    private validateRequest(request: EdgeFunctionRequest): void {
        if (!request.action) {
            throw new Error('缺少操作类型');
        }

        if (!request.data) {
            throw new Error('缺少请求数据');
        }

        // 根据不同的操作类型验证必要参数
        switch (request.action) {
            case 'calculate_social_insurance':
                if (!request.data.employeeId || !request.data.periodId) {
                    throw new Error('社保计算需要员工ID和期间ID');
                }
                break;

            case 'batch_calculate_social_insurance':
                if (!request.data.employeeIds || !Array.isArray(request.data.employeeIds) || 
                    request.data.employeeIds.length === 0 || !request.data.periodId) {
                    throw new Error('批量社保计算需要员工ID列表和期间ID');
                }
                break;

            case 'import_tax_data':
                if (!request.data.periodId || !request.data.taxData || 
                    !Array.isArray(request.data.taxData)) {
                    throw new Error('个税导入需要期间ID和个税数据列表');
                }
                break;

            case 'generate_summary':
                if (!request.data.periodId) {
                    throw new Error('生成汇总需要期间ID');
                }
                break;

            case 'compare_periods':
                if (!request.data.currentPeriodId) {
                    throw new Error('期间对比需要当前期间ID');
                }
                break;

            case 'validate_base':
                if (!request.data.region || !request.data.insuranceType || 
                    typeof request.data.baseAmount !== 'number') {
                    throw new Error('基数验证需要地区、保险类型和基数金额');
                }
                break;

            case 'recalculate_period':
                if (!request.data.periodStart || !request.data.periodEnd) {
                    throw new Error('期间重算需要开始和结束日期');
                }
                break;
        }
    }
}