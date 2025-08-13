/**
 * 薪资服务 - 务实版本
 * 
 * 展示复杂业务逻辑的处理方式：
 * - 简单查询直接处理
 * - 复杂计算使用数据库函数
 * - 批量操作使用RPC
 */

import { supabase } from '../../../shared/supabase/client';
import { authService, Role } from '../../../shared/auth/auth.service';
import { simpleMapper, batchMapper } from '../../../core/utils/mapper';
import { ValidationError } from '../../../core/errors';
import { EventPublisher } from '../../../core/events/EventPublisher';
import { PayrollProcessedEvent } from '../../../core/events/DomainEvents';

/**
 * 薪资DTO
 */
export interface PayrollDTO {
    id: string;
    periodId: string;
    periodName: string;
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    departmentName: string;
    positionName: string;
    baseSalary: number;
    allowances: number;
    deductions: number;
    socialInsurance: number;
    housingFund: number;
    personalTax: number;
    grossPay: number;
    netPay: number;
    paymentStatus: 'pending' | 'processing' | 'paid' | 'failed';
    paymentDate?: string;
    createdAt: string;
}

/**
 * 薪资服务类
 */
export class PayrollService {
    constructor(
        private eventPublisher?: EventPublisher
    ) {}
    
    /**
     * 获取薪资列表 - 简单查询，使用视图
     */
    async getPayrollList(params: {
        periodId?: string;
        departmentId?: string;
        employeeId?: string;
        status?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{ data: PayrollDTO[]; total: number }> {
        // 检查权限
        await authService.checkPermission(Role.HR_MANAGER);
        
        // 使用薪资视图
        let query = supabase
            .from('view_employee_payroll_statistics')
            .select('*', { count: 'exact' });
        
        // 应用过滤
        if (params.periodId) {
            query = query.eq('period_id', params.periodId);
        }
        if (params.employeeId) {
            query = query.eq('employee_id', params.employeeId);
        }
        
        // 分页
        const pageSize = params.pageSize || 20;
        const page = params.page || 1;
        query = query.range((page - 1) * pageSize, page * pageSize - 1);
        
        const { data, count, error } = await query;
        
        if (error) throw error;
        
        return {
            data: this.mapPayrollData(data || []),
            total: count || 0
        };
    }
    
    /**
     * 创建薪资批次 - 复杂操作，使用RPC
     */
    async createPayrollBatch(params: {
        periodId: string;
        departmentIds?: string[];
        employeeIds?: string[];
        calculateBonus?: boolean;
    }): Promise<{
        batchId: string;
        totalEmployees: number;
        totalAmount: number;
    }> {
        // 检查权限
        await authService.checkPermission(Role.HR_MANAGER);
        const user = await authService.getCurrentUserInfo();
        
        // 调用数据库函数处理复杂计算
        const { data, error } = await supabase.rpc('create_payroll_batch', {
            p_period_id: params.periodId,
            p_department_ids: params.departmentIds || null,
            p_employee_ids: params.employeeIds || null,
            p_calculate_bonus: params.calculateBonus || false,
            p_created_by: user.id
        });
        
        if (error) {
            throw new ValidationError(`创建薪资批次失败: ${error.message}`);
        }
        
        // 发布事件
        if (this.eventPublisher && data) {
            await this.eventPublisher.publish(
                new PayrollProcessedEvent(
                    data.batch_id,
                    {
                        periodId: params.periodId,
                        employeeCount: data.total_employees,
                        totalAmount: data.total_amount,
                        status: 'created'
                    },
                    user.id
                )
            );
        }
        
        return {
            batchId: data.batch_id,
            totalEmployees: data.total_employees,
            totalAmount: data.total_amount
        };
    }
    
    /**
     * 计算单个员工薪资 - 使用数据库函数
     */
    async calculateEmployeePayroll(
        employeeId: string,
        periodId: string
    ): Promise<PayrollDTO> {
        const { data, error } = await supabase.rpc('calculate_employee_salary', {
            p_employee_id: employeeId,
            p_period_id: periodId
        });
        
        if (error) {
            throw new ValidationError(`计算薪资失败: ${error.message}`);
        }
        
        return this.mapPayrollData([data])[0];
    }
    
    /**
     * 批量导入个税数据 - 简单更新
     */
    async importPersonalTax(data: Array<{
        employeeId: string;
        periodId: string;
        taxAmount: number;
    }>): Promise<{
        success: number;
        failed: number;
    }> {
        // 检查权限
        await authService.checkPermission(Role.HR_MANAGER);
        const user = await authService.getCurrentUserInfo();
        
        let success = 0;
        let failed = 0;
        
        // 批量更新
        for (const item of data) {
            const { error } = await supabase
                .from('payroll_entries')
                .update({
                    personal_income_tax: item.taxAmount,
                    updated_by: user.id,
                    updated_at: new Date().toISOString()
                })
                .match({
                    employee_id: item.employeeId,
                    period_id: item.periodId
                });
            
            if (error) {
                failed++;
            } else {
                success++;
            }
        }
        
        return { success, failed };
    }
    
    /**
     * 批量导入薪资调整 - 使用RPC事务
     */
    async importSalaryAdjustments(adjustments: Array<{
        employeeId: string;
        adjustmentType: string;
        amount: number;
        effectiveDate: string;
        reason?: string;
    }>): Promise<{
        success: number;
        failed: number;
        errors: string[];
    }> {
        // 检查权限
        await authService.checkPermission(Role.HR_MANAGER);
        const user = await authService.getCurrentUserInfo();
        
        // 使用RPC批量处理
        const { data, error } = await supabase.rpc('import_salary_adjustments', {
            p_adjustments: adjustments,
            p_imported_by: user.id
        });
        
        if (error) {
            throw new ValidationError(`导入薪资调整失败: ${error.message}`);
        }
        
        return {
            success: data.success_count,
            failed: data.failed_count,
            errors: data.errors || []
        };
    }
    
    /**
     * 审核薪资批次
     */
    async approvePayrollBatch(
        batchId: string,
        comments?: string
    ): Promise<void> {
        // 检查权限
        await authService.checkPermission(Role.ADMIN);
        const user = await authService.getCurrentUserInfo();
        
        const { error } = await supabase.rpc('approve_payroll_batch', {
            p_batch_id: batchId,
            p_approved_by: user.id,
            p_comments: comments
        });
        
        if (error) {
            throw new ValidationError(`审核薪资批次失败: ${error.message}`);
        }
    }
    
    /**
     * 执行薪资发放
     */
    async executePayment(batchId: string): Promise<{
        successCount: number;
        failedCount: number;
        totalAmount: number;
    }> {
        // 检查权限
        await authService.checkPermission(Role.ADMIN);
        const user = await authService.getCurrentUserInfo();
        
        const { data, error } = await supabase.rpc('execute_payroll_payment', {
            p_batch_id: batchId,
            p_executed_by: user.id
        });
        
        if (error) {
            throw new ValidationError(`执行薪资发放失败: ${error.message}`);
        }
        
        return {
            successCount: data.success_count,
            failedCount: data.failed_count,
            totalAmount: data.total_amount
        };
    }
    
    /**
     * 获取薪资统计 - 使用视图
     */
    async getPayrollStatistics(params: {
        periodId?: string;
        departmentId?: string;
        year?: number;
        month?: number;
    }): Promise<{
        totalEmployees: number;
        totalGrossPay: number;
        totalNetPay: number;
        totalDeductions: number;
        averageSalary: number;
        medianSalary: number;
    }> {
        const { data, error } = await supabase
            .from('v_payroll_statistics')
            .select('*')
            .match(params)
            .single();
        
        if (error) throw error;
        
        return {
            totalEmployees: data.total_employees,
            totalGrossPay: data.total_gross_pay,
            totalNetPay: data.total_net_pay,
            totalDeductions: data.total_deductions,
            averageSalary: data.average_salary,
            medianSalary: data.median_salary
        };
    }
    
    /**
     * 导出薪资单
     */
    async exportPayslips(
        periodId: string,
        format: 'pdf' | 'excel' = 'pdf'
    ): Promise<string> {
        // 检查权限
        await authService.checkPermission(Role.HR_MANAGER);
        
        const { data, error } = await supabase.rpc('generate_payslips', {
            p_period_id: periodId,
            p_format: format
        });
        
        if (error) {
            throw new ValidationError(`生成薪资单失败: ${error.message}`);
        }
        
        return data.download_url;
    }
    
    /**
     * 映射薪资数据
     */
    private mapPayrollData(data: any[]): PayrollDTO[] {
        return data.map(row => ({
            id: row.id,
            periodId: row.period_id,
            periodName: row.period_name,
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            employeeCode: row.employee_code,
            departmentName: row.department_name,
            positionName: row.position_name,
            baseSalary: row.base_salary || 0,
            allowances: row.total_allowances || 0,
            deductions: row.total_deductions || 0,
            socialInsurance: row.social_insurance || 0,
            housingFund: row.housing_fund || 0,
            personalTax: row.personal_income_tax || 0,
            grossPay: row.gross_pay || 0,
            netPay: row.net_pay || 0,
            paymentStatus: row.payment_status || 'pending',
            paymentDate: row.payment_date,
            createdAt: row.created_at
        }));
    }
}

// 导出默认实例
export const payrollService = new PayrollService();