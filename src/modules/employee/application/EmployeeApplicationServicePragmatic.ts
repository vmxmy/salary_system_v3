/**
 * 员工管理应用服务 - 务实DDD版本
 * 
 * 采用更务实的方式：
 * 1. 简单操作直接调用Repository
 * 2. 复杂业务逻辑才使用领域服务
 * 3. 充分利用Supabase特性
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../types/supabase';
import { IEmployeeRepository } from '../domain/repositories/IEmployeeRepository';
import { EmployeeDomainService } from '../domain/services/EmployeeDomainService';
import { EventPublisher } from '../../../core/events/EventPublisher';
import { 
    CreateEmployeeDTO, 
    UpdateEmployeeDTO, 
    TransferEmployeeDTO,
    EmployeeDTO,
    EmployeeSearchCriteria
} from './dto/EmployeeDTO';
import { 
    EmployeeCreatedEvent,
    EmployeeUpdatedEvent,
    EmployeeDepartmentChangedEvent
} from '../../../core/events/DomainEvents';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../core/errors';
import { simpleMapper } from '../../../core/utils/mapper';

/**
 * 务实的员工应用服务
 */
export class EmployeeApplicationServicePragmatic {
    private supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    constructor(
        private readonly employeeRepo: IEmployeeRepository,
        private readonly domainService: EmployeeDomainService,
        private readonly eventPublisher: EventPublisher
    ) {}

    /**
     * 获取当前用户信息（直接使用Supabase Auth）
     */
    private async getCurrentUser() {
        const { data: { user }, error } = await this.supabase.auth.getUser();
        if (error || !user) {
            throw new ForbiddenError('未认证用户');
        }
        return user;
    }

    /**
     * 检查用户权限（简单的角色检查）
     */
    private async checkPermission(userId: string, requiredRole: string) {
        const { data: userRole } = await this.supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .single();
        
        if (!userRole || !this.hasRequiredRole(userRole.role, requiredRole)) {
            throw new ForbiddenError('权限不足');
        }
    }

    /**
     * 创建员工 - 需要领域服务（涉及复杂验证和初始化）
     */
    async createEmployee(dto: CreateEmployeeDTO): Promise<EmployeeDTO> {
        const user = await this.getCurrentUser();
        await this.checkPermission(user.id, 'HR_MANAGER');

        // 使用Supabase事务
        const { data, error } = await this.supabase.rpc('create_employee_with_transaction', {
            employee_data: {
                name: dto.name,
                employee_code: dto.employeeCode,
                id_number: dto.idNumber,
                department_id: dto.departmentId,
                position_id: dto.positionId,
                hire_date: dto.hireDate,
                created_by: user.id
            },
            contact_data: dto.contact,
            bank_data: dto.bankAccount
        });

        if (error) throw error;

        // 发布事件
        await this.eventPublisher.publish(
            new EmployeeCreatedEvent(data.id, data, user.id)
        );

        // 使用简单映射
        return simpleMapper<EmployeeDTO>(data, {
            rename: {
                employee_code: 'employeeCode',
                id_number: 'idNumber',
                department_id: 'departmentId',
                position_id: 'positionId',
                hire_date: 'hireDate'
            }
        });
    }

    /**
     * 更新员工基本信息 - 简单操作，直接调用Repository
     */
    async updateEmployeeContact(
        employeeId: string, 
        contact: { phone?: string; email?: string; address?: string }
    ): Promise<void> {
        const user = await this.getCurrentUser();
        
        // 简单更新，直接使用Supabase
        const { error } = await this.supabase
            .from('employee_contacts')
            .update({
                phone: contact.phone,
                email: contact.email,
                address: contact.address,
                updated_by: user.id,
                updated_at: new Date().toISOString()
            })
            .eq('employee_id', employeeId);

        if (error) throw error;

        // 简单的更新事件
        await this.eventPublisher.publish(
            new EmployeeUpdatedEvent(
                employeeId,
                [{ field: 'contact', oldValue: null, newValue: contact }],
                user.id
            )
        );
    }

    /**
     * 更新银行账户 - 简单操作，直接更新
     */
    async updateBankAccount(
        employeeId: string,
        bankAccount: { bankName: string; accountNumber: string }
    ): Promise<void> {
        const user = await this.getCurrentUser();
        
        // 直接更新，无需领域服务
        const { error } = await this.supabase
            .from('employee_bank_accounts')
            .upsert({
                employee_id: employeeId,
                bank_name: bankAccount.bankName,
                account_number: bankAccount.accountNumber,
                updated_by: user.id,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
    }

    /**
     * 部门调动 - 复杂操作，使用领域服务
     */
    async transferEmployee(dto: TransferEmployeeDTO): Promise<void> {
        const user = await this.getCurrentUser();
        await this.checkPermission(user.id, 'HR_MANAGER');

        // 获取员工实体
        const employee = await this.employeeRepo.findById(dto.employeeId);
        if (!employee) {
            throw new NotFoundError('员工不存在');
        }

        // 复杂的业务逻辑，使用领域服务
        await this.domainService.transferEmployee(
            employee,
            dto.targetDepartmentId,
            dto.newPositionId,
            new Date(dto.effectiveDate),
            dto.reason
        );

        // 保存变更
        await this.employeeRepo.save(employee);

        // 发布事件
        await this.eventPublisher.publish(
            new EmployeeDepartmentChangedEvent(
                dto.employeeId,
                {
                    fromDepartmentId: employee.departmentId.value,
                    toDepartmentId: dto.targetDepartmentId,
                    effectiveDate: dto.effectiveDate,
                    reason: dto.reason
                },
                user.id
            )
        );
    }

    /**
     * 搜索员工 - 直接查询，利用数据库视图
     */
    async searchEmployees(criteria: EmployeeSearchCriteria): Promise<EmployeeDTO[]> {
        const user = await this.getCurrentUser();
        
        // 直接使用Supabase查询视图，RLS会自动过滤权限
        let query = this.supabase
            .from('v_employees_with_details')
            .select('*');

        // 构建查询条件
        if (criteria.keyword) {
            query = query.or(`name.ilike.%${criteria.keyword}%,employee_code.ilike.%${criteria.keyword}%`);
        }
        if (criteria.departmentId) {
            query = query.eq('department_id', criteria.departmentId);
        }
        if (criteria.status) {
            query = query.eq('status', criteria.status);
        }
        if (criteria.hireDateFrom) {
            query = query.gte('hire_date', criteria.hireDateFrom);
        }
        if (criteria.hireDateTo) {
            query = query.lte('hire_date', criteria.hireDateTo);
        }

        // 分页
        const limit = criteria.pageSize || 20;
        const offset = ((criteria.page || 1) - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        // 排序
        if (criteria.sortBy) {
            query = query.order(criteria.sortBy, { ascending: criteria.sortOrder !== 'desc' });
        }

        const { data, error } = await query;
        if (error) throw error;

        // 批量映射
        return data.map(row => simpleMapper<EmployeeDTO>(row, {
            rename: {
                employee_code: 'employeeCode',
                department_name: 'departmentName',
                position_name: 'positionName',
                hire_date: 'hireDate',
                created_at: 'createdAt',
                updated_at: 'updatedAt'
            }
        }));
    }

    /**
     * 批量更新员工状态 - 使用数据库函数
     */
    async bulkUpdateStatus(
        employeeIds: string[], 
        status: 'active' | 'inactive'
    ): Promise<void> {
        const user = await this.getCurrentUser();
        await this.checkPermission(user.id, 'HR_MANAGER');

        // 直接调用数据库函数
        const { error } = await this.supabase.rpc('bulk_update_employee_status', {
            employee_ids: employeeIds,
            new_status: status,
            updated_by: user.id
        });

        if (error) throw error;
    }

    /**
     * 获取部门员工统计 - 直接查询视图
     */
    async getDepartmentStatistics(departmentId: string): Promise<any> {
        // 利用数据库视图，无需复杂计算
        const { data, error } = await this.supabase
            .from('v_department_statistics')
            .select('*')
            .eq('department_id', departmentId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * 角色权限判断辅助方法
     */
    private hasRequiredRole(userRole: string, requiredRole: string): boolean {
        const roleHierarchy = {
            'SUPER_ADMIN': 5,
            'ADMIN': 4,
            'HR_MANAGER': 3,
            'MANAGER': 2,
            'EMPLOYEE': 1
        };
        
        return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
    }
}