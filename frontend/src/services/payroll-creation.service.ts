/**
 * Payroll Creation Service
 * 薪资周期创建服务
 * 
 * 提供薪资周期创建的事务处理和验证功能
 * 集成Supabase RPC函数实现数据库级别的事务控制
 */

import { supabase } from '../lib/supabase';

// 类型定义（适配现有数据库结构）
export interface PayrollValidation {
  is_valid: boolean;
  error_code?: string;
  error_message?: string;
  conflicting_records?: number;
}

export interface PayrollDataCopyResult {
  copied_employees: number;
  copied_items: number;
  total_amount: number;
}

export interface PayrollBatchSummary {
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  source_period_start?: string;
  source_period_end?: string;
  copied_employees: number;
  copied_items: number;
  total_amount: number;
  created_employees?: number;
  selected_employee_count?: number;
  creation_mode: 'copy' | 'manual';
}

export interface PayrollBatchResult {
  success: boolean;  
  error_code?: string;
  error_message?: string;
  summary?: PayrollBatchSummary;
}

export interface PayrollPeriodSummary {
  period_info: {
    pay_period_start: string;
    pay_period_end: string;
    period_description: string;
  };
  employee_count: number;
  item_count: number;
  total_gross_pay: number;
  total_net_pay: number;
  status_breakdown: {
    draft: number;
    calculated: number;
    approved: number;
    paid: number;
  };
}

export interface PayrollClearSummary {
  deleted_payrolls: number;
  deleted_items: number;
  affected_employees: number;
  total_amount: number;
  period_start: string;
  period_end: string;
  execution_time: number;
}

export interface PayrollClearResult {
  success: boolean;
  error_code?: string;
  error_message?: string;
  deleted_summary?: PayrollClearSummary;
}

/**
 * 薪资周期创建服务类
 */
export class PayrollCreationService {
  
  /**
   * 验证薪资创建的有效性
   * @param payPeriodStart 薪资期间开始日期
   * @param payPeriodEnd 薪资期间结束日期  
   * @param selectedEmployeeIds 选中的员工ID列表
   */
  static async validatePayrollCreation(
    payPeriodStart: string,
    payPeriodEnd: string,
    selectedEmployeeIds?: string[]
  ): Promise<PayrollValidation> {
    const debugId = `validation_${Date.now()}`;
    
    try {
      console.group(`🔍 [${debugId}] 开始验证薪资创建`);
      console.log('📋 验证参数:', {
        payPeriodStart,
        payPeriodEnd,
        selectedEmployeeCount: selectedEmployeeIds?.length || '全部员工',
        selectedEmployeeIds: selectedEmployeeIds?.slice(0, 3) || '未指定' // 只显示前3个
      });

      // 步骤1: 客户端预验证
      console.log('⚡ 步骤1: 客户端预验证');
      const dateValidation = this.validatePayrollDates(payPeriodStart, payPeriodEnd, payPeriodStart);
      if (!dateValidation.isValid) {
        console.warn('❌ 客户端预验证失败:', dateValidation.message);
        console.groupEnd();
        return {
          is_valid: false,
          error_code: 'CLIENT_VALIDATION_ERROR',
          error_message: dateValidation.message || '日期验证失败'
        };
      }
      console.log('✅ 客户端预验证通过');

      // 步骤2: 调用数据库验证
      console.log('⚡ 步骤2: 调用数据库验证函数');
      const rpcParams = {
        p_pay_period_start: payPeriodStart,
        p_pay_period_end: payPeriodEnd,
        p_selected_employee_ids: selectedEmployeeIds || null
      };
      console.log('📤 RPC验证参数:', rpcParams);

      const startTime = Date.now();
      const { data, error } = await supabase.rpc('validate_payroll_creation', rpcParams);
      const executionTime = Date.now() - startTime;

      console.log(`⏱️ 验证执行耗时: ${executionTime}ms`);

      // 步骤3: 检查RPC错误
      if (error) {
        console.error('❌ 步骤3: 数据库验证失败');
        console.error('🔍 验证错误详情:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        console.groupEnd();
        return {
          is_valid: false,
          error_code: 'RPC_ERROR',
          error_message: `调用验证函数失败: ${error.message}`
        };
      }

      console.log('✅ 步骤3: 数据库验证调用成功');

      // 步骤4: 检查返回数据
      console.log('🔍 步骤4: 解析验证结果');
      console.log('📥 验证返回数据:', data);

      if (!data || data.length === 0) {
        console.error('❌ 验证函数未返回结果');
        console.groupEnd();
        return {
          is_valid: false,
          error_code: 'NO_RESULT',
          error_message: '验证函数未返回结果'
        };
      }

      // 步骤5: 解析验证结果
      const result = data[0] as PayrollValidation;
      console.log('📊 验证结果详情:', {
        is_valid: result.is_valid,
        error_code: result.error_code,
        error_message: result.error_message,
        conflicting_records: result.conflicting_records
      });

      if (result.is_valid) {
        console.log('🎉 薪资创建验证通过!');
      } else {
        console.warn('⚠️ 薪资创建验证失败:', {
          error_code: result.error_code,
          error_message: result.error_message,
          conflicting_records: result.conflicting_records
        });
      }

      console.groupEnd();
      return result;
    } catch (error) {
      console.error(`💥 [${debugId}] 验证薪资创建发生异常:`);
      console.error('🔍 异常详情:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      console.groupEnd();
      
      return {
        is_valid: false,
        error_code: 'NETWORK_ERROR',
        error_message: `网络错误: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 批量创建薪资记录
   * @param params 创建参数
   */
  static async createPayrollBatch(params: {
    payPeriodStart: string;
    payPeriodEnd: string;
    payDate: string;
    sourcePeriodStart?: string;
    sourcePeriodEnd?: string;
    selectedEmployeeIds?: string[];
    createdBy?: string;
  }): Promise<PayrollBatchResult> {
    const debugId = `payroll_batch_${Date.now()}`;
    
    try {
      console.group(`🚀 [${debugId}] 开始批量创建薪资记录`);
      console.log('📋 创建参数详情:', {
        payPeriodStart: params.payPeriodStart,
        payPeriodEnd: params.payPeriodEnd, 
        payDate: params.payDate,
        sourcePeriodStart: params.sourcePeriodStart,
        sourcePeriodEnd: params.sourcePeriodEnd,
        selectedEmployeeCount: params.selectedEmployeeIds?.length || '全部员工',
        selectedEmployeeIds: params.selectedEmployeeIds?.slice(0, 5) || '未指定', // 只显示前5个
        createdBy: params.createdBy || '未指定',
        isCopyMode: !!(params.sourcePeriodStart && params.sourcePeriodEnd)
      });

      // 步骤1: 执行RPC调用
      console.log('⚡ 步骤1: 调用数据库RPC函数 create_payroll_batch');
      const rpcParams = {
        p_pay_period_start: params.payPeriodStart,
        p_pay_period_end: params.payPeriodEnd,
        p_pay_date: params.payDate,
        p_source_period_start: params.sourcePeriodStart || null,
        p_source_period_end: params.sourcePeriodEnd || null,
        p_selected_employee_ids: params.selectedEmployeeIds || null,
        p_created_by: params.createdBy || null
      };
      console.log('📤 RPC参数:', rpcParams);

      const startTime = Date.now();
      const { data, error } = await supabase.rpc('create_payroll_batch', rpcParams);
      const executionTime = Date.now() - startTime;

      console.log(`⏱️ RPC执行耗时: ${executionTime}ms`);

      // 步骤2: 检查RPC错误
      if (error) {
        console.error('❌ 步骤2: RPC执行失败');
        console.error('🔍 错误详情:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        console.groupEnd();
        return {
          success: false,
          error_code: 'RPC_ERROR',
          error_message: `创建失败: ${error.message}`
        };
      }

      console.log('✅ 步骤2: RPC执行成功');

      // 步骤3: 检查返回数据
      console.log('🔍 步骤3: 验证返回数据');
      console.log('📥 原始返回数据:', data);

      if (!data || data.length === 0) {
        console.error('❌ 返回数据为空或无效');
        console.groupEnd();
        return {
          success: false,
          error_code: 'NO_RESULT',
          error_message: '创建函数未返回结果'
        };
      }

      // 步骤4: 解析结果
      const result = data[0] as PayrollBatchResult;
      console.log('📊 步骤4: 解析创建结果');
      console.log('✨ 创建结果详情:', {
        success: result.success,
        error_code: result.error_code,
        error_message: result.error_message,
        summary: result.summary
      });

      if (result.summary) {
        console.log('📈 创建摘要统计:', {
          creation_mode: result.summary.creation_mode,
          pay_period: `${result.summary.pay_period_start} 至 ${result.summary.pay_period_end}`,
          source_period: result.summary.source_period_start 
            ? `${result.summary.source_period_start} 至 ${result.summary.source_period_end}` 
            : '无',
          copied_employees: result.summary.copied_employees,
          copied_items: result.summary.copied_items,
          created_employees: result.summary.created_employees || 0,
          total_amount: result.summary.total_amount,
          selected_employee_count: result.summary.selected_employee_count
        });
      }

      if (result.success) {
        console.log('🎉 薪资记录创建成功!');
      } else {
        console.warn('⚠️ 薪资记录创建失败:', {
          error_code: result.error_code,
          error_message: result.error_message
        });
      }

      console.groupEnd();
      return result;
    } catch (error) {
      console.error(`💥 [${debugId}] 批量创建薪资记录发生异常:`);
      console.error('🔍 异常详情:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      console.groupEnd();
      
      return {
        success: false,
        error_code: 'NETWORK_ERROR',
        error_message: `网络错误: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 获取薪资批次摘要
   * @param payPeriodStart 薪资期间开始日期
   * @param payPeriodEnd 薪资期间结束日期
   */
  static async getPayrollBatchSummary(
    payPeriodStart: string, 
    payPeriodEnd: string
  ): Promise<PayrollPeriodSummary | null> {
    try {
      const { data, error } = await supabase.rpc('get_payroll_batch_summary', {
        p_pay_period_start: payPeriodStart,
        p_pay_period_end: payPeriodEnd
      });

      if (error) {
        console.error('获取薪资批次摘要失败:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data[0] as PayrollPeriodSummary;
    } catch (error) {
      console.error('获取薪资批次摘要异常:', error);
      return null;
    }
  }

  /**
   * 检查薪资期间是否存在重叠记录
   * @param payPeriodStart 薪资期间开始日期
   * @param payPeriodEnd 薪资期间结束日期
   * @param selectedEmployeeIds 选中的员工ID列表
   */
  static async checkOverlappingPayrolls(
    payPeriodStart: string,
    payPeriodEnd: string,
    selectedEmployeeIds?: string[]
  ): Promise<{ hasOverlap: boolean; count: number }> {
    try {
      let query = supabase
        .from('payrolls')
        .select('id', { count: 'exact' })
        .or(`pay_period_start.lte.${payPeriodEnd},pay_period_end.gte.${payPeriodStart}`);

      if (selectedEmployeeIds && selectedEmployeeIds.length > 0) {
        query = query.in('employee_id', selectedEmployeeIds);
      }

      const { count, error } = await query;

      if (error) {
        console.error('检查重叠薪资记录失败:', error);
        return { hasOverlap: false, count: 0 };
      }

      return { hasOverlap: (count || 0) > 0, count: count || 0 };
    } catch (error) {
      console.error('检查重叠薪资记录异常:', error);
      return { hasOverlap: false, count: 0 };
    }
  }

  /**
   * 获取可用的源薪资期间列表
   * @param excludeDateRange 排除的日期范围
   */
  static async getAvailableSourcePeriods(excludeDateRange?: {
    start: string;
    end: string;
  }) {
    try {
      let query = supabase
        .from('payrolls')
        .select(`
          pay_period_start,
          pay_period_end,
          pay_date,
          employee_id
        `)
        .order('pay_period_start', { ascending: false });

      if (excludeDateRange) {
        query = query.not('pay_period_start', 'eq', excludeDateRange.start)
                    .not('pay_period_end', 'eq', excludeDateRange.end);
      }

      const { data, error } = await query;

      if (error) {
        console.error('获取源薪资期间列表失败:', error);
        return [];
      }

      // 按期间分组去重
      const periods = new Map();
      data?.forEach(record => {
        const key = `${record.pay_period_start}_${record.pay_period_end}`;
        if (!periods.has(key)) {
          periods.set(key, {
            pay_period_start: record.pay_period_start,
            pay_period_end: record.pay_period_end,
            pay_date: record.pay_date,
            employee_count: 1
          });
        } else {
          periods.get(key).employee_count++;
        }
      });

      return Array.from(periods.values());
    } catch (error) {
      console.error('获取源薪资期间列表异常:', error);
      return [];
    }
  }

  /**
   * 根据日期范围生成薪资期间描述
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  static generatePeriodDescription(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 至 ${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`;
  }

  /**
   * 验证薪资日期范围的合理性
   * @param payPeriodStart 薪资期间开始日期
   * @param payPeriodEnd 薪资期间结束日期
   * @param payDate 薪资发放日期
   */
  /**
   * 验证薪资期间日期（用于清空等不涉及发放日期的操作）
   */
  static validatePayrollPeriod(
    payPeriodStart: string,
    payPeriodEnd: string
  ): {
    isValid: boolean;
    message?: string;
  } {
    const startDate = new Date(payPeriodStart);
    const endDate = new Date(payPeriodEnd);

    // 检查期间日期顺序
    if (startDate >= endDate) {
      return {
        isValid: false,
        message: '薪资期间开始日期必须早于结束日期'
      };
    }

    // 检查日期不能太远的过去或未来
    const now = new Date();
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    if (startDate < twoYearsAgo) {
      return {
        isValid: false,
        message: '薪资期间不能早于两年前'
      };
    }

    if (endDate > oneYearLater) {
      return {
        isValid: false,
        message: '薪资期间不能晚于一年后'
      };
    }

    return { isValid: true };
  }

  static validatePayrollDates(
    payPeriodStart: string,
    payPeriodEnd: string,
    payDate: string
  ): {
    isValid: boolean;
    message?: string;
  } {
    const startDate = new Date(payPeriodStart);
    const endDate = new Date(payPeriodEnd);
    const paymentDate = new Date(payDate);

    // 检查期间日期顺序
    if (startDate >= endDate) {
      return {
        isValid: false,
        message: '薪资期间开始日期必须早于结束日期'
      };
    }

    // 检查薪资发放日期不能早于期间结束日期
    if (paymentDate < endDate) {
      return {
        isValid: false,
        message: '薪资发放日期不能早于薪资期间结束日期'
      };
    }

    // 检查薪资发放日期不能太晚（最多延后3个月）
    const maxPayDate = new Date(endDate);
    maxPayDate.setMonth(maxPayDate.getMonth() + 3);
    if (paymentDate > maxPayDate) {
      return {
        isValid: false,
        message: '薪资发放日期不能晚于薪资期间结束后3个月'
      };
    }

    // 检查日期不能太远的过去或未来
    const now = new Date();
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    if (startDate < twoYearsAgo) {
      return {
        isValid: false,
        message: '薪资期间不能早于两年前'
      };
    }

    if (endDate > oneYearLater) {
      return {
        isValid: false,
        message: '薪资期间不能晚于一年后'
      };
    }

    return { isValid: true };
  }

  /**
   * 清空指定期间的薪资数据
   * @param payPeriodStart 薪资期间开始日期
   * @param payPeriodEnd 薪资期间结束日期
   * @param confirmToken 确认令牌
   */
  static async clearPayrollDataByPeriod(
    payPeriodStart: string,
    payPeriodEnd: string,
    confirmToken: string = 'CLEAR_PAYROLL_CONFIRMED'
  ): Promise<PayrollClearResult> {
    const debugId = `payroll_clear_${Date.now()}`;
    
    try {
      console.group(`🗑️ [${debugId}] 开始清空薪资数据`);
      console.log('📋 清空参数详情:', {
        payPeriodStart,
        payPeriodEnd,
        confirmToken: confirmToken ? '已提供' : '未提供',
        dateRange: this.generatePeriodDescription(payPeriodStart, payPeriodEnd)
      });

      // 步骤1: 客户端预验证
      console.log('⚡ 步骤1: 客户端预验证');
      const dateValidation = this.validatePayrollPeriod(payPeriodStart, payPeriodEnd);
      if (!dateValidation.isValid) {
        console.warn('❌ 客户端预验证失败:', dateValidation.message);
        console.groupEnd();
        return {
          success: false,
          error_code: 'CLIENT_VALIDATION_ERROR',
          error_message: dateValidation.message || '日期验证失败'
        };
      }
      console.log('✅ 客户端预验证通过');

      // 步骤2: 调用数据库清空函数
      console.log('⚡ 步骤2: 调用数据库清空函数');
      const rpcParams = {
        p_pay_period_start: payPeriodStart,
        p_pay_period_end: payPeriodEnd,
        p_confirm_token: confirmToken
      };
      console.log('📤 RPC清空参数:', rpcParams);

      const startTime = Date.now();
      const { data, error } = await supabase.rpc('clear_payroll_data_by_period', rpcParams);
      const executionTime = Date.now() - startTime;

      console.log(`⏱️ 清空执行耗时: ${executionTime}ms`);

      // 步骤3: 检查RPC错误
      if (error) {
        console.error('❌ 步骤3: 数据库清空失败');
        console.error('🔍 清空错误详情:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        console.groupEnd();
        return {
          success: false,
          error_code: 'RPC_ERROR',
          error_message: `清空操作失败: ${error.message}`
        };
      }

      console.log('✅ 步骤3: 数据库清空调用成功');

      // 步骤4: 检查返回数据
      console.log('🔍 步骤4: 解析清空结果');
      console.log('📥 清空返回数据:', data);

      if (!data || data.length === 0) {
        console.error('❌ 清空函数未返回结果');
        console.groupEnd();
        return {
          success: false,
          error_code: 'NO_RESULT',
          error_message: '清空函数未返回结果'
        };
      }

      // 步骤5: 解析清空结果
      const result = data[0] as PayrollClearResult;
      console.log('📊 步骤5: 解析清空结果');
      console.log('✨ 清空结果详情:', {
        success: result.success,
        error_code: result.error_code,
        error_message: result.error_message,
        deleted_summary: result.deleted_summary
      });

      if (result.deleted_summary) {
        console.log('📈 清空摘要统计:', {
          period: `${result.deleted_summary.period_start} 至 ${result.deleted_summary.period_end}`,
          deleted_payrolls: result.deleted_summary.deleted_payrolls,
          deleted_items: result.deleted_summary.deleted_items,
          affected_employees: result.deleted_summary.affected_employees,
          total_amount: result.deleted_summary.total_amount,
          execution_time: `${result.deleted_summary.execution_time}秒`
        });
      }

      if (result.success) {
        console.log('🎉 薪资数据清空成功!');
      } else {
        console.warn('⚠️ 薪资数据清空失败:', {
          error_code: result.error_code,
          error_message: result.error_message
        });
      }

      console.groupEnd();
      return result;
    } catch (error) {
      console.error(`💥 [${debugId}] 清空薪资数据发生异常:`);
      console.error('🔍 异常详情:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      console.groupEnd();
      
      return {
        success: false,
        error_code: 'NETWORK_ERROR',
        error_message: `网络错误: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

export default PayrollCreationService;