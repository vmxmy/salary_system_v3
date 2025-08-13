/**
 * Employee Repository实现
 * 
 * 基于Supabase的员工数据仓储实现，提供丰富的查询和操作方法
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseRepositoryBase } from '../../../../shared/infrastructure/repositories/SupabaseRepositoryBase';
import { Employee, EmploymentStatus } from '../../domain/entities/Employee';
import { EmployeeMapper, EmployeeWithDetailsMapper } from '../mappers/EmployeeMapper';
import { Injectable } from '../../../../core/di/DIContainer';
import { PaginatedResult, QueryOptions } from '../../../../shared/domain/repositories/IBaseRepository';
import type { Database } from '@/types/supabase';

/**
 * 员工查询选项
 */
export interface EmployeeQueryOptions extends QueryOptions {
  /** 部门ID过滤 */
  departmentId?: string;
  /** 雇佣状态过滤 */
  employmentStatus?: EmploymentStatus;
  /** 管理者ID过滤 */
  managerId?: string;
  /** 入职日期范围 */
  hireDateRange?: {
    start: Date;
    end: Date;
  };
  /** 包含详细信息（部门、职位等） */
  includeDetails?: boolean;
}

/**
 * 员工仓储接口
 */
export interface IEmployeeRepository extends SupabaseRepositoryBase<Employee, 'employees', string> {
  /** 根据身份证号查找员工 */
  findByIdNumber(idNumber: string): Promise<Employee | null>;
  
  /** 根据员工姓名查找员工（模糊搜索） */
  findByNamePattern(namePattern: string): Promise<Employee[]>;
  
  /** 查找部门下的所有员工 */
  findByDepartment(departmentId: string, options?: QueryOptions): Promise<PaginatedResult<Employee>>;
  
  /** 查找管理者下的所有员工 */
  findByManager(managerId: string, options?: QueryOptions): Promise<PaginatedResult<Employee>>;
  
  /** 获取员工统计信息 */
  getEmployeeStats(): Promise<{
    totalCount: number;
    activeCount: number;
    terminatedCount: number;
    averageAge: number;
    departmentDistribution: Array<{ departmentId: string; departmentName: string; count: number }>;
  }>;
  
  /** 批量导入员工 */
  importEmployeesBatch(employees: Employee[]): Promise<{
    successCount: number;
    failureCount: number;
    failures: Array<{ employee: Employee; error: string }>;
  }>;
}

/**
 * Employee Repository实现
 */
@Injectable()
export class EmployeeRepository 
  extends SupabaseRepositoryBase<Employee, 'employees', string> 
  implements IEmployeeRepository {

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'employees', new EmployeeMapper());
  }

  /**
   * 根据身份证号查找员工
   */
  async findByIdNumber(idNumber: string): Promise<Employee | null> {
    const startTime = performance.now();
    
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .eq('id_number', idNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // 记录不存在
        }
        throw this.mapSupabaseError(error, `Failed to find employee by id_number: ${idNumber}`);
      }

      const employee = this.mapper.toDomain(data);
      this.recordQueryStat(`SELECT by id_number from employees`, startTime);
      
      return employee;
    } catch (error) {
      this.recordQueryStat(`SELECT by id_number from employees (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 根据员工姓名查找员工（模糊搜索）
   */
  async findByNamePattern(namePattern: string): Promise<Employee[]> {
    const startTime = performance.now();
    
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .ilike('employee_name', `%${namePattern}%`)
        .limit(50); // 限制结果数量

      if (error) {
        throw this.mapSupabaseError(error, `Failed to find employees by name pattern: ${namePattern}`);
      }

      const employees = data.map(row => this.mapper.toDomain(row));
      this.recordQueryStat(`SELECT by name pattern from employees`, startTime);
      
      return employees;
    } catch (error) {
      this.recordQueryStat(`SELECT by name pattern from employees (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 查找部门下的所有员工
   */
  async findByDepartment(
    departmentId: string, 
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Employee>> {
    const startTime = performance.now();
    
    try {
      // 使用员工详情视图来获取部门信息
      let query = this.supabase
        .from('view_employee_basic_info')
        .select('*', { count: 'exact' })
        .eq('department_id', departmentId);

      // 应用过滤器
      query = this.applyFilters(query, options.filters);

      // 应用排序
      query = this.applySorting(query, options.sort);

      // 应用分页
      if (options.pagination) {
        const { page, pageSize } = options.pagination;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) {
        throw this.mapSupabaseError(error, `Failed to find employees by department: ${departmentId}`);
      }

      // 转换为Domain实体
      const employees = data.map(row => EmployeeWithDetailsMapper.fromEmployeeView(row));
      this.recordQueryStat(`SELECT by department from employees`, startTime);

      const totalPages = options.pagination 
        ? Math.ceil((count || 0) / options.pagination.pageSize)
        : 1;

      return {
        data: employees,
        total: count || 0,
        page: options.pagination?.page || 1,
        pageSize: options.pagination?.pageSize || employees.length,
        totalPages
      };
    } catch (error) {
      this.recordQueryStat(`SELECT by department from employees (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 查找管理者下的所有员工
   */
  async findByManager(
    managerId: string, 
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Employee>> {
    return this.findWhere({ managerId } as Partial<Employee>, options);
  }

  /**
   * 获取员工统计信息
   */
  async getEmployeeStats(): Promise<{
    totalCount: number;
    activeCount: number;
    terminatedCount: number;
    averageAge: number;
    departmentDistribution: Array<{ departmentId: string; departmentName: string; count: number }>;
  }> {
    const startTime = performance.now();
    
    try {
      // 获取基础统计
      const { data: statsData, error: statsError } = await this.supabase
        .from('view_employee_basic_info')
        .select(`
          employment_status,
          date_of_birth,
          department_id,
          department_name
        `);

      if (statsError) {
        throw this.mapSupabaseError(statsError, 'Failed to get employee stats');
      }

      // 计算统计信息
      const totalCount = statsData.length;
      const activeCount = statsData.filter(emp => emp.employment_status === 'active').length;
      const terminatedCount = statsData.filter(emp => emp.employment_status === 'terminated').length;

      // 计算平均年龄
      const now = new Date();
      const ages = statsData
        .filter(emp => emp.date_of_birth)
        .map(emp => {
          const birthDate = new Date(emp.date_of_birth);
          let age = now.getFullYear() - birthDate.getFullYear();
          const monthDiff = now.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
            age--;
          }
          return age;
        });
      
      const averageAge = ages.length > 0 
        ? ages.reduce((sum, age) => sum + age, 0) / ages.length 
        : 0;

      // 计算部门分布
      const departmentMap = new Map<string, { departmentName: string; count: number }>();
      
      statsData.forEach(emp => {
        if (emp.department_id && emp.department_name) {
          const existing = departmentMap.get(emp.department_id);
          if (existing) {
            existing.count++;
          } else {
            departmentMap.set(emp.department_id, {
              departmentName: emp.department_name,
              count: 1
            });
          }
        }
      });

      const departmentDistribution = Array.from(departmentMap.entries()).map(([departmentId, info]) => ({
        departmentId,
        departmentName: info.departmentName,
        count: info.count
      }));

      this.recordQueryStat(`SELECT employee stats`, startTime);

      return {
        totalCount,
        activeCount,
        terminatedCount,
        averageAge: Math.round(averageAge * 100) / 100, // 保留2位小数
        departmentDistribution
      };
    } catch (error) {
      this.recordQueryStat(`SELECT employee stats (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 批量导入员工
   */
  async importEmployeesBatch(employees: Employee[]): Promise<{
    successCount: number;
    failureCount: number;
    failures: Array<{ employee: Employee; error: string }>;
  }> {
    const startTime = performance.now();
    const failures: Array<{ employee: Employee; error: string }> = [];
    let successCount = 0;

    try {
      // 分批处理，每批50个
      const batchSize = 50;
      
      for (let i = 0; i < employees.length; i += batchSize) {
        const batch = employees.slice(i, i + batchSize);
        
        try {
          // 验证批次中的所有员工
          const validEmployees: Employee[] = [];
          
          for (const employee of batch) {
            const validation = employee.validate();
            if (validation.isValid) {
              validEmployees.push(employee);
            } else {
              failures.push({
                employee,
                error: validation.firstError || 'Validation failed'
              });
            }
          }

          if (validEmployees.length > 0) {
            // 检查重复的身份证号
            const existingEmployees = await this.checkDuplicateIdNumbers(
              validEmployees.map(emp => emp.idNumber)
            );

            const nonDuplicateEmployees = validEmployees.filter(emp => {
              const isDuplicate = existingEmployees.includes(emp.idNumber);
              if (isDuplicate) {
                failures.push({
                  employee: emp,
                  error: `身份证号已存在: ${emp.idNumber}`
                });
              }
              return !isDuplicate;
            });

            if (nonDuplicateEmployees.length > 0) {
              // 批量插入
              const result = await this.createBatch(nonDuplicateEmployees);
              successCount += result.successCount;
              
              // 添加失败的项
              result.failureItems.forEach(failure => {
                failures.push({
                  employee: failure.item,
                  error: failure.error?.message || 'Unknown error'
                });
              });
            }
          }
        } catch (error) {
          // 整个批次失败
          batch.forEach(employee => {
            failures.push({
              employee,
              error: `Batch processing failed: ${(error as Error).message}`
            });
          });
        }
      }

      this.recordQueryStat(`BATCH IMPORT employees`, startTime);

      return {
        successCount,
        failureCount: failures.length,
        failures
      };
    } catch (error) {
      this.recordQueryStat(`BATCH IMPORT employees (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 重写查询条件映射
   */
  protected mapDomainConditionsToDb(conditions: Partial<Employee>): Record<string, any> {
    const dbConditions: Record<string, any> = {};

    if (conditions.employeeName !== undefined) {
      dbConditions.employee_name = conditions.employeeName;
    }

    if (conditions.idNumber !== undefined) {
      dbConditions.id_number = conditions.idNumber;
    }

    if (conditions.employmentStatus !== undefined) {
      dbConditions.employment_status = conditions.employmentStatus;
    }

    if (conditions.managerId !== undefined) {
      dbConditions.manager_id = conditions.managerId;
    }

    if (conditions.userId !== undefined) {
      dbConditions.user_id = conditions.userId;
    }

    return dbConditions;
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 检查重复的身份证号
   */
  private async checkDuplicateIdNumbers(idNumbers: string[]): Promise<string[]> {
    if (idNumbers.length === 0) return [];

    const { data, error } = await this.supabase
      .from('employees')
      .select('id_number')
      .in('id_number', idNumbers);

    if (error) {
      console.error('Error checking duplicate id numbers:', error);
      return []; // 在错误情况下返回空数组，允许继续处理
    }

    return data.map(row => row.id_number).filter(Boolean);
  }

  /**
   * 获取员工的银行账户信息
   */
  async getEmployeeBankAccounts(employeeId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('employee_bank_accounts')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      throw this.mapSupabaseError(error, `Failed to get bank accounts for employee: ${employeeId}`);
    }

    return EmployeeWithDetailsMapper.mapBankAccounts(data);
  }

  /**
   * 添加员工银行账户
   */
  async addEmployeeBankAccount(
    employeeId: string,
    bankAccount: {
      bankName: string;
      accountNumber: string;
      accountHolderName: string;
      branchName?: string;
      isPrimary?: boolean;
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('employee_bank_accounts')
      .insert({
        employee_id: employeeId,
        bank_name: bankAccount.bankName,
        account_number: bankAccount.accountNumber,
        account_holder_name: bankAccount.accountHolderName,
        branch_name: bankAccount.branchName || null,
        is_primary: bankAccount.isPrimary || false,
        effective_start_date: new Date().toISOString().split('T')[0]
      });

    if (error) {
      throw this.mapSupabaseError(error, `Failed to add bank account for employee: ${employeeId}`);
    }
  }
}