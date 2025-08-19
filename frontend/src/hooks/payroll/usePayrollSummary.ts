import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * 薪资汇总计算结果
 */
export interface PayrollSummaryResult {
  payrollId: string;
  employeeId: string;
  employeeName?: string;
  grossPay: number;        // 应发工资
  totalDeductions: number; // 扣除总额
  netPay: number;         // 实发工资
  success: boolean;
  message?: string;
  breakdown?: {
    earningsCount: number;
    deductionCount: number;
  };
}

/**
 * 批量计算结果
 */
export interface BatchSummaryResult {
  results: PayrollSummaryResult[];
  successCount: number;
  failureCount: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
}

/**
 * 薪资汇总计算Hook
 * 
 * 计算规则（基于salary_components表的category字段）：
 * 1. 应发工资（gross_pay）= 
 *    - category='basic_salary'的项目（基本工资、岗位工资、级别工资等）
 *    - category='benefits'的项目（津贴、补贴、绩效奖金等）
 * 
 * 2. 扣除总额（total_deductions）= 
 *    - category='personal_insurance'的项目（个人缴纳的五险一金）
 *    - category='personal_tax'的项目（个人所得税）
 *    - category='other_deductions'的项目（补扣款等）
 * 
 * 3. 实发工资（net_pay）= 应发工资 - 扣除总额
 * 
 * 注意：category='employer_insurance'（单位缴纳部分）不计入个人扣除项
 */
export const usePayrollSummary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 定义 RPC 函数返回类型
  interface CalcPayrollSummaryResponse {
    success: boolean;
    employee_id?: string;
    calculation?: {
      gross_pay: string | number;
      total_deductions: string | number;
      net_pay: string | number;
    };
    breakdown?: any;
    error?: string;
  }

  /**
   * 计算单个员工的薪资汇总
   */
  const calculateSingle = useCallback(async (payrollId: string): Promise<PayrollSummaryResult> => {
    try {
      // 调用数据库存储函数
      const { data, error: funcError } = await supabase
        .rpc('calc_payroll_summary', {
          p_payroll_id: payrollId
        });

      if (funcError) throw funcError;

      // 类型断言
      const result = data as unknown as CalcPayrollSummaryResponse;

      // 解析返回结果
      if (result?.success) {
        return {
          payrollId,
          employeeId: result.employee_id || '',
          grossPay: parseFloat(String(result.calculation?.gross_pay || 0)) || 0,
          totalDeductions: parseFloat(String(result.calculation?.total_deductions || 0)) || 0,
          netPay: parseFloat(String(result.calculation?.net_pay || 0)) || 0,
          success: true,
          message: '计算成功',
          breakdown: result.breakdown
        };
      } else {
        return {
          payrollId,
          employeeId: result?.employee_id || '',
          grossPay: 0,
          totalDeductions: 0,
          netPay: 0,
          success: false,
          message: result?.error || '计算失败'
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      return {
        payrollId,
        employeeId: '',
        grossPay: 0,
        totalDeductions: 0,
        netPay: 0,
        success: false,
        message: errorMessage
      };
    }
  }, []);

  // 定义批量计算返回类型
  interface BatchCalcResponse {
    payroll_id: string;
    employee_id?: string;
    employee_name?: string;
    gross_pay: string | number;
    total_deductions: string | number;
    net_pay: string | number;
    calculation_success?: boolean;
    error_message?: string;
  }

  /**
   * 批量计算薪资汇总
   */
  const calculateBatch = useCallback(async (
    payrollIds: string[]
  ): Promise<BatchSummaryResult> => {
    setLoading(true);
    setError(null);

    try {
      // 调用批量计算存储函数
      const { data, error: funcError } = await supabase
        .rpc('calc_payroll_summary_batch', {
          p_payroll_ids: payrollIds
        });

      if (funcError) throw funcError;

      // 处理返回结果
      const results: PayrollSummaryResult[] = [];
      let successCount = 0;
      let failureCount = 0;
      let totalGrossPay = 0;
      let totalDeductions = 0;
      let totalNetPay = 0;

      const batchData = data as BatchCalcResponse[] | null;
      
      if (batchData && Array.isArray(batchData)) {
        for (const record of batchData) {
          const result: PayrollSummaryResult = {
            payrollId: record.payroll_id,
            employeeId: record.employee_id || '',
            employeeName: record.employee_name,
            grossPay: parseFloat(String(record.gross_pay)) || 0,
            totalDeductions: parseFloat(String(record.total_deductions)) || 0,
            netPay: parseFloat(String(record.net_pay)) || 0,
            success: record.calculation_success ?? true,
            message: record.error_message || (record.calculation_success ? '计算成功' : '计算失败')
          };

          results.push(result);

          if (result.success) {
            successCount++;
            totalGrossPay += result.grossPay;
            totalDeductions += result.totalDeductions;
            totalNetPay += result.netPay;
          } else {
            failureCount++;
          }
        }
      }

      return {
        results,
        successCount,
        failureCount,
        totalGrossPay,
        totalDeductions,
        totalNetPay
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 按期间批量计算
   */
  const calculateByPeriod = useCallback(async (
    periodId: string,
    employeeIds?: string[]
  ): Promise<BatchSummaryResult> => {
    setLoading(true);
    setError(null);

    try {
      // 先获取该期间的所有薪资记录
      let query = supabase
        .from('payrolls')
        .select('id, employee_id')
        .eq('period_id', periodId);

      if (employeeIds && employeeIds.length > 0) {
        query = query.in('employee_id', employeeIds);
      }

      const { data: payrolls, error: queryError } = await query;

      if (queryError) throw queryError;

      if (!payrolls || payrolls.length === 0) {
        return {
          results: [],
          successCount: 0,
          failureCount: 0,
          totalGrossPay: 0,
          totalDeductions: 0,
          totalNetPay: 0
        };
      }

      // 提取payroll IDs并调用批量计算
      const payrollIds = payrolls.map(p => p.id);
      return await calculateBatch(payrollIds);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [calculateBatch]);

  /**
   * 验证薪资汇总
   * 用于检查计算结果是否正确
   */
  const validateSummary = useCallback(async (payrollId: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> => {
    try {
      // 获取薪资记录
      const { data: payroll, error: payrollError } = await supabase
        .from('payrolls')
        .select('gross_pay, total_deductions, net_pay')
        .eq('id', payrollId)
        .single();

      if (payrollError) throw payrollError;

      // 获取薪资项目明细
      const { data: items, error: itemsError } = await supabase
        .from('payroll_items')
        .select(`
          amount,
          salary_components!inner(
            category,
            name
          )
        `)
        .eq('payroll_id', payrollId);

      if (itemsError) throw itemsError;

      const errors: string[] = [];
      
      // 计算应发工资
      const calculatedGross = items
        ?.filter(item => ['basic_salary', 'benefits', 'allowances'].includes(item.salary_components.category || ''))
        .reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0) || 0;

      // 计算扣除总额（不包括单位缴纳部分）
      const calculatedDeductions = items
        ?.filter(item => ['personal_tax', 'personal_insurance', 'other_deductions'].includes(item.salary_components.category || ''))
        .reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0) || 0;

      // 计算实发工资
      const calculatedNet = calculatedGross - calculatedDeductions;

      // 验证计算结果
      const tolerance = 0.01; // 允许的误差范围

      if (Math.abs(parseFloat(payroll.gross_pay.toString()) - calculatedGross) > tolerance) {
        errors.push(`应发工资不匹配：记录值=${payroll.gross_pay}，计算值=${calculatedGross.toFixed(2)}`);
      }

      if (Math.abs(parseFloat(payroll.total_deductions.toString()) - calculatedDeductions) > tolerance) {
        errors.push(`扣除总额不匹配：记录值=${payroll.total_deductions}，计算值=${calculatedDeductions.toFixed(2)}`);
      }

      if (Math.abs(parseFloat(payroll.net_pay.toString()) - calculatedNet) > tolerance) {
        errors.push(`实发工资不匹配：记录值=${payroll.net_pay}，计算值=${calculatedNet.toFixed(2)}`);
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (err) {
      return {
        isValid: false,
        errors: [err instanceof Error ? err.message : '验证失败']
      };
    }
  }, []);

  return {
    calculateSingle,
    calculateBatch,
    calculateByPeriod,
    validateSummary,
    loading,
    error
  };
};