/**
 * Payroll Repository实现
 * 
 * 基于Supabase的薪资数据仓储实现，提供薪资管理和查询功能
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseRepositoryBase } from '../../../../shared/infrastructure/repositories/SupabaseRepositoryBase';
import { Payroll, PayrollStatus, PayrollComponent } from '../../domain/entities/Payroll';
import { PayrollMapper, PayrollComponentMapper, PayrollWithDetailsMapper } from '../mappers/PayrollMapper';
import { Injectable } from '../../../../core/di/DIContainer';
import { PaginatedResult, QueryOptions } from '../../../../shared/domain/repositories/IBaseRepository';
import type { Database } from '@/types/supabase';

/**
 * 薪资查询选项
 */
export interface PayrollQueryOptions extends QueryOptions {
  /** 员工ID过滤 */
  employeeId?: string;
  /** 薪资状态过滤 */
  status?: PayrollStatus;
  /** 薪资期间过滤 */
  payPeriodRange?: {
    start: Date;
    end: Date;
  };
  /** 发薪日期过滤 */
  payDateRange?: {
    start: Date;
    end: Date;
  };
  /** 包含详细信息（员工、部门等） */
  includeDetails?: boolean;
  /** 包含薪资组件 */
  includeComponents?: boolean;
}

/**
 * 薪资统计信息
 */
export interface PayrollStatistics {
  totalRecords: number;
  totalGrossPay: number;
  totalNetPay: number;
  averageGrossPay: number;
  averageNetPay: number;
  statusDistribution: Array<{ status: PayrollStatus; count: number; totalAmount: number }>;
  monthlyTrends: Array<{ month: string; count: number; totalAmount: number }>;
}

/**
 * 薪资仓储接口
 */
export interface IPayrollRepository extends SupabaseRepositoryBase<Payroll, 'payrolls', string> {
  /** 根据员工ID查找薪资记录 */
  findByEmployee(employeeId: string, options?: QueryOptions): Promise<PaginatedResult<Payroll>>;
  
  /** 根据薪资期间查找记录 */
  findByPayPeriod(start: Date, end: Date, options?: QueryOptions): Promise<PaginatedResult<Payroll>>;
  
  /** 查找待处理的薪资记录 */
  findPendingPayrolls(options?: QueryOptions): Promise<PaginatedResult<Payroll>>;
  
  /** 获取薪资统计信息 */
  getPayrollStatistics(filters?: {
    employeeIds?: string[];
    payPeriodRange?: { start: Date; end: Date };
    status?: PayrollStatus;
  }): Promise<PayrollStatistics>;
  
  /** 批量创建薪资记录 */
  createPayrollBatch(payrolls: Payroll[]): Promise<{
    successCount: number;
    failureCount: number;
    failures: Array<{ payroll: Payroll; error: string }>;
  }>;
  
  /** 获取薪资组件 */
  getPayrollComponents(payrollId: string): Promise<PayrollComponent[]>;
  
  /** 保存薪资组件 */
  savePayrollComponents(payrollId: string, components: PayrollComponent[]): Promise<void>;
  
  /** 复制薪资记录 */
  duplicatePayroll(payrollId: string, newPayPeriod: { start: Date; end: Date; payDate: Date }): Promise<Payroll>;
}

/**
 * Payroll Repository实现
 */
@Injectable()
export class PayrollRepository 
  extends SupabaseRepositoryBase<Payroll, 'payrolls', string> 
  implements IPayrollRepository {

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'payrolls', new PayrollMapper());
  }

  /**
   * 根据员工ID查找薪资记录
   */
  async findByEmployee(
    employeeId: string, 
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Payroll>> {
    return this.findWhere({ employeeId } as Partial<Payroll>, options);
  }

  /**
   * 根据薪资期间查找记录
   */
  async findByPayPeriod(
    start: Date, 
    end: Date, 
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Payroll>> {
    const startTime = performance.now();
    
    try {
      let query = this.supabase
        .from('payrolls')
        .select('*', { count: 'exact' })
        .gte('pay_period_start', start.toISOString().split('T')[0])
        .lte('pay_period_end', end.toISOString().split('T')[0]);

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
        throw this.mapSupabaseError(error, `Failed to find payrolls by pay period`);
      }

      const payrolls = data.map(row => this.mapper.toDomain(row));
      this.recordQueryStat(`SELECT by pay period from payrolls`, startTime);

      const totalPages = options.pagination 
        ? Math.ceil((count || 0) / options.pagination.pageSize)
        : 1;

      return {
        data: payrolls,
        total: count || 0,
        page: options.pagination?.page || 1,
        pageSize: options.pagination?.pageSize || payrolls.length,
        totalPages
      };
    } catch (error) {
      this.recordQueryStat(`SELECT by pay period from payrolls (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 查找待处理的薪资记录
   */
  async findPendingPayrolls(options: QueryOptions = {}): Promise<PaginatedResult<Payroll>> {
    return this.findWhere({ status: PayrollStatus.PENDING } as Partial<Payroll>, options);
  }

  /**
   * 获取薪资统计信息
   */
  async getPayrollStatistics(filters?: {
    employeeIds?: string[];
    payPeriodRange?: { start: Date; end: Date };
    status?: PayrollStatus;
  }): Promise<PayrollStatistics> {
    const startTime = performance.now();
    
    try {
      let query = this.supabase
        .from('payrolls')
        .select(`
          id,
          employee_id,
          status,
          gross_pay,
          net_pay,
          pay_period_start,
          pay_period_end,
          pay_date
        `);

      // 应用过滤器
      if (filters?.employeeIds && filters.employeeIds.length > 0) {
        query = query.in('employee_id', filters.employeeIds);
      }

      if (filters?.payPeriodRange) {
        query = query
          .gte('pay_period_start', filters.payPeriodRange.start.toISOString().split('T')[0])
          .lte('pay_period_end', filters.payPeriodRange.end.toISOString().split('T')[0]);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        throw this.mapSupabaseError(error, 'Failed to get payroll statistics');
      }

      // 计算统计信息
      const totalRecords = data.length;
      const totalGrossPay = data.reduce((sum, record) => sum + (record.gross_pay || 0), 0);
      const totalNetPay = data.reduce((sum, record) => sum + (record.net_pay || 0), 0);
      const averageGrossPay = totalRecords > 0 ? totalGrossPay / totalRecords : 0;
      const averageNetPay = totalRecords > 0 ? totalNetPay / totalRecords : 0;

      // 状态分布
      const statusMap = new Map<PayrollStatus, { count: number; totalAmount: number }>();
      data.forEach(record => {
        const status = record.status as PayrollStatus;
        const existing = statusMap.get(status) || { count: 0, totalAmount: 0 };
        statusMap.set(status, {
          count: existing.count + 1,
          totalAmount: existing.totalAmount + (record.net_pay || 0)
        });
      });

      const statusDistribution = Array.from(statusMap.entries()).map(([status, info]) => ({
        status,
        count: info.count,
        totalAmount: info.totalAmount
      }));

      // 月度趋势
      const monthlyMap = new Map<string, { count: number; totalAmount: number }>();
      data.forEach(record => {
        const month = new Date(record.pay_date).toISOString().slice(0, 7); // YYYY-MM
        const existing = monthlyMap.get(month) || { count: 0, totalAmount: 0 };
        monthlyMap.set(month, {
          count: existing.count + 1,
          totalAmount: existing.totalAmount + (record.net_pay || 0)
        });
      });

      const monthlyTrends = Array.from(monthlyMap.entries())
        .map(([month, info]) => ({
          month,
          count: info.count,
          totalAmount: info.totalAmount
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      this.recordQueryStat(`SELECT payroll statistics`, startTime);

      return {
        totalRecords,
        totalGrossPay: Math.round(totalGrossPay * 100) / 100,
        totalNetPay: Math.round(totalNetPay * 100) / 100,
        averageGrossPay: Math.round(averageGrossPay * 100) / 100,
        averageNetPay: Math.round(averageNetPay * 100) / 100,
        statusDistribution,
        monthlyTrends
      };
    } catch (error) {
      this.recordQueryStat(`SELECT payroll statistics (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 批量创建薪资记录
   */
  async createPayrollBatch(payrolls: Payroll[]): Promise<{
    successCount: number;
    failureCount: number;
    failures: Array<{ payroll: Payroll; error: string }>;
  }> {
    const startTime = performance.now();
    const failures: Array<{ payroll: Payroll; error: string }> = [];
    let successCount = 0;

    try {
      // 分批处理，每批30个（考虑到薪资记录可能包含组件，数据量较大）
      const batchSize = 30;
      
      for (let i = 0; i < payrolls.length; i += batchSize) {
        const batch = payrolls.slice(i, i + batchSize);
        
        try {
          // 验证批次中的所有薪资记录
          const validPayrolls: Payroll[] = [];
          
          for (const payroll of batch) {
            const validation = payroll.validate();
            if (validation.isValid) {
              validPayrolls.push(payroll);
            } else {
              failures.push({
                payroll,
                error: validation.firstError || 'Validation failed'
              });
            }
          }

          if (validPayrolls.length > 0) {
            // 检查重复的薪资记录（同一员工同一期间）
            const duplicateChecks = await this.checkDuplicatePayrolls(validPayrolls);

            const nonDuplicatePayrolls = validPayrolls.filter((payroll, index) => {
              const isDuplicate = duplicateChecks[index];
              if (isDuplicate) {
                failures.push({
                  payroll,
                  error: `员工 ${payroll.employeeId} 在期间 ${payroll.payPeriodStart.toISOString().split('T')[0]} 到 ${payroll.payPeriodEnd.toISOString().split('T')[0]} 的薪资记录已存在`
                });
              }
              return !isDuplicate;
            });

            if (nonDuplicatePayrolls.length > 0) {
              // 批量插入薪资记录
              const result = await this.createBatch(nonDuplicatePayrolls);
              successCount += result.successCount;
              
              // 为成功创建的薪资记录保存组件
              for (const successPayroll of result.successItems) {
                if (successPayroll.components.length > 0) {
                  try {
                    await this.savePayrollComponents(successPayroll.id, successPayroll.components);
                  } catch (componentError) {
                    console.error(`Failed to save components for payroll ${successPayroll.id}:`, componentError);
                  }
                }
              }
              
              // 添加失败的项
              result.failureItems.forEach(failure => {
                failures.push({
                  payroll: failure.item,
                  error: failure.error?.message || 'Unknown error'
                });
              });
            }
          }
        } catch (error) {
          // 整个批次失败
          batch.forEach(payroll => {
            failures.push({
              payroll,
              error: `Batch processing failed: ${(error as Error).message}`
            });
          });
        }
      }

      this.recordQueryStat(`BATCH CREATE payrolls`, startTime);

      return {
        successCount,
        failureCount: failures.length,
        failures
      };
    } catch (error) {
      this.recordQueryStat(`BATCH CREATE payrolls (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 获取薪资组件
   */
  async getPayrollComponents(payrollId: string): Promise<PayrollComponent[]> {
    const startTime = performance.now();
    
    try {
      const { data, error } = await this.supabase
        .from('payroll_items')
        .select('*')
        .eq('payroll_id', payrollId)
        .order('created_at', { ascending: true });

      if (error) {
        throw this.mapSupabaseError(error, `Failed to get payroll components for payroll: ${payrollId}`);
      }

      const components = data.map(row => PayrollComponentMapper.fromDatabaseRow(row));
      this.recordQueryStat(`SELECT payroll components`, startTime);
      
      return components;
    } catch (error) {
      this.recordQueryStat(`SELECT payroll components (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 保存薪资组件
   */
  async savePayrollComponents(payrollId: string, components: PayrollComponent[]): Promise<void> {
    const startTime = performance.now();
    
    try {
      // 首先删除现有组件
      const { error: deleteError } = await this.supabase
        .from('payroll_items')
        .delete()
        .eq('payroll_id', payrollId);

      if (deleteError) {
        throw this.mapSupabaseError(deleteError, `Failed to delete existing payroll components`);
      }

      // 插入新组件
      if (components.length > 0) {
        const insertData = components.map(component => 
          PayrollComponentMapper.toDatabaseInsert(component, payrollId)
        );

        const { error: insertError } = await this.supabase
          .from('payroll_items')
          .insert(insertData);

        if (insertError) {
          throw this.mapSupabaseError(insertError, `Failed to insert payroll components`);
        }
      }

      this.recordQueryStat(`SAVE payroll components`, startTime);
    } catch (error) {
      this.recordQueryStat(`SAVE payroll components (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 复制薪资记录
   */
  async duplicatePayroll(
    payrollId: string, 
    newPayPeriod: { start: Date; end: Date; payDate: Date }
  ): Promise<Payroll> {
    const startTime = performance.now();
    
    try {
      // 获取原薪资记录
      const originalPayroll = await this.findById(payrollId);
      if (!originalPayroll) {
        throw new Error(`Payroll not found: ${payrollId}`);
      }

      // 获取原薪资组件
      const originalComponents = await this.getPayrollComponents(payrollId);

      // 创建新的薪资记录
      const duplicatedPayroll = new Payroll(
        originalPayroll.employeeId,
        newPayPeriod.start,
        newPayPeriod.end,
        newPayPeriod.payDate,
        PayrollStatus.DRAFT
      );

      // 复制组件
      if (originalComponents.length > 0) {
        const newComponents = originalComponents.map(component => ({
          type: component.type,
          name: component.name,
          amount: component.amount,
          isDeduction: component.isDeduction,
          isStatutory: component.isStatutory,
          description: component.description,
          calculationBasis: component.calculationBasis,
          rate: component.rate,
          metadata: component.metadata
        }));

        duplicatedPayroll.setComponents(newComponents);
      }

      // 保存新薪资记录
      const createResult = await this.create(duplicatedPayroll);
      if (!createResult.success || !createResult.data) {
        throw new Error(`Failed to create duplicated payroll: ${createResult.error?.message}`);
      }

      this.recordQueryStat(`DUPLICATE payroll`, startTime);
      
      return createResult.data;
    } catch (error) {
      this.recordQueryStat(`DUPLICATE payroll (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 重写查询条件映射
   */
  protected mapDomainConditionsToDb(conditions: Partial<Payroll>): Record<string, any> {
    const dbConditions: Record<string, any> = {};

    if (conditions.employeeId !== undefined) {
      dbConditions.employee_id = conditions.employeeId;
    }

    if (conditions.status !== undefined) {
      dbConditions.status = conditions.status;
    }

    // 可以添加更多映射逻辑

    return dbConditions;
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 检查重复的薪资记录
   */
  private async checkDuplicatePayrolls(payrolls: Payroll[]): Promise<boolean[]> {
    const results: boolean[] = [];

    // 批量检查重复记录
    for (const payroll of payrolls) {
      const { data, error } = await this.supabase
        .from('payrolls')
        .select('id')
        .eq('employee_id', payroll.employeeId)
        .eq('pay_period_start', payroll.payPeriodStart.toISOString().split('T')[0])
        .eq('pay_period_end', payroll.payPeriodEnd.toISOString().split('T')[0]);

      if (error) {
        console.error('Error checking duplicate payrolls:', error);
        results.push(false); // 在错误情况下假设不重复
      } else {
        results.push(data.length > 0);
      }
    }

    return results;
  }

  /**
   * 完整保存薪资记录（包含组件）
   */
  async savePayrollWithComponents(payroll: Payroll): Promise<void> {
    const startTime = performance.now();
    
    try {
      // 保存薪资记录
      const updateResult = await this.update(payroll);
      if (!updateResult.success) {
        throw new Error(`Failed to save payroll: ${updateResult.error?.message}`);
      }

      // 保存组件
      await this.savePayrollComponents(payroll.id, payroll.components);

      this.recordQueryStat(`SAVE payroll with components`, startTime);
    } catch (error) {
      this.recordQueryStat(`SAVE payroll with components (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 获取完整的薪资记录（包含组件）
   */
  async findByIdWithComponents(payrollId: string): Promise<Payroll | null> {
    const payroll = await this.findById(payrollId);
    if (!payroll) {
      return null;
    }

    // 加载组件
    const components = await this.getPayrollComponents(payrollId);
    if (components.length > 0) {
      payroll.setComponents(components);
    }

    return payroll;
  }
}