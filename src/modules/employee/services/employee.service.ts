/**
 * 员工服务 - 务实版本
 * 
 * 遵循务实DDD原则：
 * - 简单操作直接处理
 * - 复杂业务使用领域服务
 * - 充分利用Supabase特性
 */

import { supabase, handleSupabaseResponse, batchInsert } from '../../../shared/supabase/client';
import { authService, Role } from '../../../shared/auth/auth.service';
import { simpleMapper, batchMapper, dbToFrontendConfig } from '../../../core/utils/mapper';
import { ValidationError, NotFoundError } from '../../../core/errors';
import { EmployeeDomainService } from '../domain/services/EmployeeDomainService';
import { EventPublisher } from '../../../core/events/EventPublisher';
import { 
    EmployeeCreatedEvent,
    EmployeeUpdatedEvent,
    EmployeeDepartmentChangedEvent
} from '../../../core/events/DomainEvents';

/**
 * 员工DTO（简化版）
 */
export interface EmployeeDTO {
    id: string;
    employeeCode: string;
    name: string;
    idNumber?: string;
    gender?: 'male' | 'female';
    dateOfBirth?: string;
    departmentId: string;
    departmentName?: string;
    positionId: string;
    positionName?: string;
    managerId?: string;
    managerName?: string;
    hireDate: string;
    status: string;
    phone?: string;
    email?: string;
    address?: string;
    bankName?: string;
    accountNumber?: string;
    baseSalary?: number;
    createdAt: string;
    updatedAt: string;
}

/**
 * 员工服务类
 */
export class EmployeeService {
    constructor(
        private domainService?: EmployeeDomainService,
        private eventPublisher?: EventPublisher
    ) {}
    
    /**
     * 获取员工列表 - 简单查询，直接使用视图
     */
    async getEmployeeList(params?: {
        departmentId?: string;
        status?: string;
        keyword?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{ data: EmployeeDTO[]; total: number }> {
        // 使用数据库视图，RLS自动处理权限
        let query = supabase
            .from('v_employees_with_details')
            .select('*', { count: 'exact' });
        
        // 应用过滤条件
        if (params?.departmentId) {
            query = query.eq('department_id', params.departmentId);
        }
        if (params?.status) {
            query = query.eq('status', params.status);
        }
        if (params?.keyword) {
            query = query.or(`name.ilike.%${params.keyword}%,employee_code.ilike.%${params.keyword}%`);
        }
        
        // 分页
        const pageSize = params?.pageSize || 20;
        const page = params?.page || 1;
        query = query.range((page - 1) * pageSize, page * pageSize - 1);
        
        const { data, count, error } = await query;
        
        if (error) throw error;
        
        // 使用自动映射
        const employees = batchMapper<EmployeeDTO>(data || [], dbToFrontendConfig);
        
        return {
            data: employees,
            total: count || 0
        };
    }
    
    /**
     * 获取员工详情 - 简单查询
     */
    async getEmployeeById(id: string): Promise<EmployeeDTO> {
        const { data, error } = await supabase
            .from('v_employees_with_details')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw new NotFoundError('员工不存在');
        
        return simpleMapper<EmployeeDTO>(data, dbToFrontendConfig);
    }
    
    /**
     * 更新员工联系方式 - 简单操作，直接更新
     */
    async updateEmployeeContact(
        employeeId: string,
        contact: {
            phone?: string;
            email?: string;
            address?: string;
        }
    ): Promise<void> {
        const user = await authService.getCurrentUserInfo();
        
        // 简单更新，直接处理
        const { error } = await supabase
            .from('employees')
            .update({
                phone: contact.phone,
                email: contact.email,
                address: contact.address,
                updated_by: user.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', employeeId);
        
        if (error) throw error;
        
        // 发布简单的更新事件
        if (this.eventPublisher) {
            await this.eventPublisher.publish(
                new EmployeeUpdatedEvent(
                    employeeId,
                    [{ field: 'contact', oldValue: null, newValue: contact }],
                    user.id
                )
            );
        }
    }
    
    /**
     * 更新银行账户 - 简单操作，直接更新
     */
    async updateBankAccount(
        employeeId: string,
        bankAccount: {
            bankName: string;
            accountNumber: string;
            accountName?: string;
        }
    ): Promise<void> {
        const user = await authService.getCurrentUserInfo();
        
        // 使用upsert，自动处理创建或更新
        const { error } = await supabase
            .from('employee_bank_accounts')
            .upsert({
                employee_id: employeeId,
                bank_name: bankAccount.bankName,
                account_number: bankAccount.accountNumber,
                account_name: bankAccount.accountName,
                updated_by: user.id,
                updated_at: new Date().toISOString()
            });
        
        if (error) throw error;
    }
    
    /**
     * 创建员工 - 复杂操作，使用RPC事务
     */
    async createEmployee(data: {
        name: string;
        employeeCode: string;
        idNumber?: string;
        departmentId: string;
        positionId: string;
        hireDate: string;
        gender?: 'male' | 'female';
        phone?: string;
        email?: string;
        bankAccount?: {
            bankName: string;
            accountNumber: string;
        };
    }): Promise<EmployeeDTO> {
        const user = await authService.getCurrentUserInfo();
        await authService.checkPermission(Role.HR_MANAGER);
        
        // 使用RPC函数处理事务
        const { data: result, error } = await supabase.rpc('create_employee_transaction', {
            p_name: data.name,
            p_employee_code: data.employeeCode,
            p_id_number: data.idNumber,
            p_department_id: data.departmentId,
            p_position_id: data.positionId,
            p_hire_date: data.hireDate,
            p_gender: data.gender,
            p_phone: data.phone,
            p_email: data.email,
            p_bank_name: data.bankAccount?.bankName,
            p_account_number: data.bankAccount?.accountNumber,
            p_created_by: user.id
        });
        
        if (error) throw error;
        
        // 发布创建事件
        if (this.eventPublisher) {
            await this.eventPublisher.publish(
                new EmployeeCreatedEvent(result.id, result, user.id)
            );
        }
        
        return simpleMapper<EmployeeDTO>(result, dbToFrontendConfig);
    }
    
    /**
     * 部门调动 - 复杂操作，需要业务规则验证
     */
    async transferEmployee(data: {
        employeeId: string;
        targetDepartmentId: string;
        newPositionId?: string;
        effectiveDate: string;
        reason?: string;
    }): Promise<void> {
        const user = await authService.getCurrentUserInfo();
        await authService.checkPermission(Role.HR_MANAGER);
        
        // 复杂业务逻辑，使用领域服务（如果配置了）
        if (this.domainService) {
            // 获取员工实体
            const { data: employee } = await supabase
                .from('employees')
                .select('*')
                .eq('id', data.employeeId)
                .single();
            
            if (!employee) {
                throw new NotFoundError('员工不存在');
            }
            
            // 使用领域服务验证业务规则
            // await this.domainService.validateTransfer(...)
        }
        
        // 使用RPC函数执行调动
        const { error } = await supabase.rpc('transfer_employee', {
            p_employee_id: data.employeeId,
            p_target_department_id: data.targetDepartmentId,
            p_new_position_id: data.newPositionId,
            p_effective_date: data.effectiveDate,
            p_reason: data.reason,
            p_operated_by: user.id
        });
        
        if (error) throw error;
        
        // 发布调动事件
        if (this.eventPublisher) {
            await this.eventPublisher.publish(
                new EmployeeDepartmentChangedEvent(
                    data.employeeId,
                    {
                        fromDepartmentId: '', // 需要从结果中获取
                        toDepartmentId: data.targetDepartmentId,
                        effectiveDate: data.effectiveDate,
                        reason: data.reason
                    },
                    user.id
                )
            );
        }
    }
    
    /**
     * 批量导入员工 - 使用批量插入优化
     */
    async importEmployees(employees: Array<{
        name: string;
        employeeCode: string;
        departmentId: string;
        positionId: string;
        hireDate: string;
    }>): Promise<{
        success: number;
        failed: number;
        errors: Array<{ index: number; error: string }>;
    }> {
        const user = await authService.getCurrentUserInfo();
        await authService.checkPermission(Role.HR_MANAGER);
        
        const results = {
            success: 0,
            failed: 0,
            errors: [] as Array<{ index: number; error: string }>
        };
        
        // 准备数据
        const records = employees.map(emp => ({
            ...emp,
            hire_date: emp.hireDate,
            employee_code: emp.employeeCode,
            department_id: emp.departmentId,
            position_id: emp.positionId,
            status: 'active',
            created_by: user.id,
            created_at: new Date().toISOString()
        }));
        
        try {
            // 使用批量插入
            await batchInsert('employees', records, 50);
            results.success = records.length;
        } catch (error: any) {
            // 处理部分失败的情况
            if (error.details?.batch) {
                results.failed = error.details.batch.length;
                error.details.batch.forEach((item: any, index: number) => {
                    results.errors.push({
                        index,
                        error: '导入失败'
                    });
                });
            } else {
                results.failed = employees.length;
                results.errors.push({
                    index: 0,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    /**
     * 获取部门统计 - 直接使用数据库视图
     */
    async getDepartmentStatistics(departmentId: string): Promise<{
        totalEmployees: number;
        activeEmployees: number;
        averageSalary: number;
        totalSalary: number;
    }> {
        const { data, error } = await supabase
            .from('v_department_statistics')
            .select('*')
            .eq('department_id', departmentId)
            .single();
        
        if (error) throw error;
        
        return {
            totalEmployees: data.total_employees,
            activeEmployees: data.active_employees,
            averageSalary: data.average_salary,
            totalSalary: data.total_salary
        };
    }
    
    /**
     * 员工生日提醒 - 使用数据库函数
     */
    async getUpcomingBirthdays(days: number = 7): Promise<EmployeeDTO[]> {
        const { data, error } = await supabase.rpc('get_upcoming_birthdays', {
            days_ahead: days
        });
        
        if (error) throw error;
        
        return batchMapper<EmployeeDTO>(data || [], dbToFrontendConfig);
    }
    
    /**
     * 合同到期提醒 - 使用数据库函数
     */
    async getExpiringContracts(days: number = 30): Promise<EmployeeDTO[]> {
        const { data, error } = await supabase.rpc('get_expiring_contracts', {
            days_ahead: days
        });
        
        if (error) throw error;
        
        return batchMapper<EmployeeDTO>(data || [], dbToFrontendConfig);
    }
}

// 导出默认实例
export const employeeService = new EmployeeService();