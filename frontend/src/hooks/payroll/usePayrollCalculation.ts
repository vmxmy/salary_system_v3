import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { usePayrollLogger } from './usePayrollLogger';

/**
 * 薪资项目明细
 */
export interface PayrollItemDetail {
  id: string;
  componentId: string;
  componentName: string;
  category: string | null;
  amount: number;
  notes?: string;
}

/**
 * 薪资计算结果
 */
export interface PayrollCalculationResult {
  payrollId: string;
  employeeId: string;
  employeeName?: string;
  periodId: string;
  
  // 计算结果
  grossPay: number;        // 应发工资
  totalDeductions: number; // 扣除总额  
  netPay: number;          // 实发工资
  
  // 明细分解
  breakdown: {
    basicSalary: number;      // 基本工资
    benefits: number;         // 津贴补贴
    allowances: number;       // 其他津贴
    personalInsurance: number;// 个人保险
    personalTax: number;      // 个人所得税
    otherDeductions: number;  // 其他扣除
    
    // 不计入个人扣除的项目（仅统计）
    employerInsurance: number;// 单位保险（不扣除）
  };
  
  // 项目统计
  itemCounts: {
    earningsCount: number;
    deductionCount: number;
    totalCount: number;
  };
  
  // 计算状态
  success: boolean;
  message?: string;
  errors: string[];
}

/**
 * 批量计算结果
 */
export interface BatchPayrollCalculationResult {
  results: PayrollCalculationResult[];
  summary: {
    successCount: number;
    failureCount: number;
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    totalEmployerInsurance: number; // 单位承担总额
  };
  errors: string[];
}

/**
 * 薪资计算Hook（前端实现）
 * 
 * 计算规则：
 * 1. 应发工资 = basic_salary + benefits + allowances
 * 2. 扣除总额 = personal_insurance + personal_tax + other_deductions
 * 3. 实发工资 = 应发工资 - 扣除总额
 * 
 * 注意：employer_insurance（单位保险）不从员工工资中扣除
 */
export const usePayrollCalculation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logger = usePayrollLogger();

  /**
   * 获取薪资项目明细
   */
  const fetchPayrollItems = useCallback(async (payrollId: string): Promise<PayrollItemDetail[]> => {
    const { data, error } = await supabase
      .from('payroll_items')
      .select(`
        id,
        component_id,
        amount,
        notes,
        salary_components!inner(
          id,
          name,
          category
        )
      `)
      .eq('payroll_id', payrollId);

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      componentId: item.component_id,
      componentName: item.salary_components.name,
      category: item.salary_components.category,
      amount: parseFloat(item.amount.toString()),
      notes: item.notes || undefined
    }));
  }, []);

  /**
   * 计算单个员工的薪资汇总
   */
  const calculateSingle = useCallback(async (payrollId: string): Promise<PayrollCalculationResult> => {
    setLoading(true);
    setError(null);

    try {
      // 1. 获取薪资记录基本信息
      const { data: payroll, error: payrollError } = await supabase
        .from('payrolls')
        .select(`
          id,
          employee_id,
          period_id,
          employees(employee_name)
        `)
        .eq('id', payrollId)
        .single();

      if (payrollError) throw payrollError;

      // 2. 获取薪资项目明细
      const items = await fetchPayrollItems(payrollId);

      // 3. 按类别分组计算
      const breakdown = {
        basicSalary: 0,
        benefits: 0,
        allowances: 0,
        personalInsurance: 0,
        personalTax: 0,
        otherDeductions: 0,
        employerInsurance: 0
      };

      let earningsCount = 0;
      let deductionCount = 0;
      const errors: string[] = [];

      items.forEach(item => {
        const amount = item.amount;
        
        // 验证金额
        if (isNaN(amount)) {
          errors.push(`项目 "${item.componentName}" 金额无效: ${item.amount}`);
          return;
        }

        // 按类别分类统计
        switch (item.category) {
          case 'basic_salary':
            breakdown.basicSalary += amount;
            if (amount > 0) earningsCount++;
            break;
            
          case 'benefits':
            breakdown.benefits += amount;
            if (amount > 0) earningsCount++;
            break;
            
          case 'allowances':
            breakdown.allowances += amount;
            if (amount > 0) earningsCount++;
            break;
            
          case 'personal_insurance':
            breakdown.personalInsurance += amount;
            if (amount > 0) deductionCount++;
            break;
            
          case 'personal_tax':
            breakdown.personalTax += amount;
            if (amount > 0) deductionCount++;
            break;
            
          case 'other_deductions':
            breakdown.otherDeductions += amount;
            if (amount > 0) deductionCount++;
            break;
            
          case 'employer_insurance':
            // 单位保险不计入个人扣除，仅统计
            breakdown.employerInsurance += amount;
            break;
            
          default:
            errors.push(`未知类别: ${item.category} (项目: ${item.componentName})`);
        }
      });

      // 4. 计算汇总金额
      const grossPay = breakdown.basicSalary + breakdown.benefits + breakdown.allowances;
      const totalDeductions = breakdown.personalInsurance + breakdown.personalTax + breakdown.otherDeductions;
      const netPay = grossPay - totalDeductions;

      // 5. 构建结果
      const result: PayrollCalculationResult = {
        payrollId,
        employeeId: payroll.employee_id,
        employeeName: payroll.employees?.employee_name || '',
        periodId: payroll.period_id || '',
        grossPay,
        totalDeductions,
        netPay,
        breakdown,
        itemCounts: {
          earningsCount,
          deductionCount,
          totalCount: items.length
        },
        success: errors.length === 0,
        message: errors.length === 0 ? '计算成功' : `计算完成，但有 ${errors.length} 个警告`,
        errors
      };

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '计算失败';
      setError(errorMessage);
      
      return {
        payrollId,
        employeeId: '',
        periodId: '',
        grossPay: 0,
        totalDeductions: 0,
        netPay: 0,
        breakdown: {
          basicSalary: 0,
          benefits: 0,
          allowances: 0,
          personalInsurance: 0,
          personalTax: 0,
          otherDeductions: 0,
          employerInsurance: 0
        },
        itemCounts: {
          earningsCount: 0,
          deductionCount: 0,
          totalCount: 0
        },
        success: false,
        message: errorMessage,
        errors: [errorMessage]
      };
    } finally {
      setLoading(false);
    }
  }, [fetchPayrollItems]);

  /**
   * 计算并更新薪资记录
   */
  const calculateAndSave = useCallback(async (payrollId: string): Promise<PayrollCalculationResult> => {
    const result = await calculateSingle(payrollId);
    
    if (result.success) {
      try {
        // 使用批量更新方式保存单个记录，获得更好性能
        const { error: updateError } = await supabase
          .from('payrolls')
          .update({
            gross_pay: result.grossPay,
            total_deductions: result.totalDeductions,
            net_pay: result.netPay,
            status: 'calculated' as const,
            updated_at: new Date().toISOString()
          })
          .eq('id', result.payrollId);

        if (updateError) {
          result.success = false;
          result.message = `计算成功但保存失败: ${updateError.message}`;
          result.errors.push(updateError.message);
        } else {
          result.message = '计算并保存成功';
        }
      } catch (saveError) {
        result.success = false;
        result.message = `计算成功但保存失败: ${saveError instanceof Error ? saveError.message : '未知错误'}`;
        result.errors.push(saveError instanceof Error ? saveError.message : '保存失败');
      }
    }

    return result;
  }, [calculateSingle]);

  /**
   * 批量计算薪资汇总
   */
  const calculateBatch = useCallback(async (
    payrollIds: string[], 
    saveToDatabase: boolean = false
  ): Promise<BatchPayrollCalculationResult> => {
    setLoading(true);
    setError(null);

    const results: PayrollCalculationResult[] = [];
    const errors: string[] = [];
    
    try {
      // 并发计算所有薪资记录（只计算，不保存）
      const promises = payrollIds.map(async (payrollId) => {
        try {
          return await calculateSingle(payrollId);
        } catch (err) {
          const errorMessage = `薪资记录 ${payrollId} 计算失败: ${err instanceof Error ? err.message : '未知错误'}`;
          errors.push(errorMessage);
          
          return {
            payrollId,
            employeeId: '',
            periodId: '',
            grossPay: 0,
            totalDeductions: 0,
            netPay: 0,
            breakdown: {
              basicSalary: 0,
              benefits: 0,
              allowances: 0,
              personalInsurance: 0,
              personalTax: 0,
              otherDeductions: 0,
              employerInsurance: 0
            },
            itemCounts: {
              earningsCount: 0,
              deductionCount: 0,
              totalCount: 0
            },
            success: false,
            message: errorMessage,
            errors: [errorMessage]
          } as PayrollCalculationResult;
        }
      });

      const calculationResults = await Promise.all(promises);
      results.push(...calculationResults);

      // 如果选择保存到数据库，使用批量更新
      if (saveToDatabase) {
        const successfulResults = results.filter(result => result.success);
        
        if (successfulResults.length > 0) {
          // 构建批量更新数据 - 包含所有必需字段确保upsert正常工作
          // 批量更新 - 使用多个单独的UPDATE操作以避免复杂的upsert类型问题
          const updatePromises = successfulResults.map(result => 
            supabase
              .from('payrolls')
              .update({
                gross_pay: result.grossPay,
                total_deductions: result.totalDeductions,
                net_pay: result.netPay,
                status: 'calculated' as const,
                updated_at: new Date().toISOString()
              })
              .eq('id', result.payrollId)
          );

          // 等待所有更新完成
          const updateResults = await Promise.all(updatePromises);
          const batchUpdateError = updateResults.find(r => r.error)?.error;

          if (batchUpdateError) {
            console.error('批量更新薪资记录失败:', batchUpdateError);
            // 将成功的结果标记为保存失败
            successfulResults.forEach(result => {
              result.success = false;
              result.message = `计算成功但保存失败: ${batchUpdateError.message}`;
              result.errors.push(batchUpdateError.message);
            });
          } else {
            // 更新成功的结果消息
            successfulResults.forEach(result => {
              result.message = '计算并保存成功';
            });
          }
        }
      }

      // 计算汇总统计
      const summary = {
        successCount: 0,
        failureCount: 0,
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        totalEmployerInsurance: 0
      };

      results.forEach(result => {
        if (result.success) {
          summary.successCount++;
          summary.totalGrossPay += result.grossPay;
          summary.totalDeductions += result.totalDeductions;
          summary.totalNetPay += result.netPay;
          summary.totalEmployerInsurance += result.breakdown.employerInsurance;
        } else {
          summary.failureCount++;
        }
      });

      // 记录薪资计算日志
      if (saveToDatabase && payrollIds.length > 0) {
        const logSuccess = await logger.logCalculation({
          payrollIds,
          successCount: summary.successCount,
          errorCount: summary.failureCount,
          calculationType: payrollIds.length === 1 ? 'single' : 'batch',
          details: `计算完成 - 成功: ${summary.successCount}, 失败: ${summary.failureCount}`
        });
        
        if (!logSuccess) {
          console.warn('薪资计算日志记录失败，但计算操作已完成');
        }
      }

      return {
        results,
        summary,
        errors
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '批量计算失败';
      setError(errorMessage);
      errors.push(errorMessage);

      return {
        results,
        summary: {
          successCount: 0,
          failureCount: payrollIds.length,
          totalGrossPay: 0,
          totalDeductions: 0,
          totalNetPay: 0,
          totalEmployerInsurance: 0
        },
        errors
      };
    } finally {
      setLoading(false);
    }
  }, [calculateSingle, logger]);

  /**
   * 按期间批量计算
   */
  const calculateByPeriod = useCallback(async (
    periodId: string,
    employeeIds?: string[],
    saveToDatabase: boolean = false
  ): Promise<BatchPayrollCalculationResult> => {
    try {
      // 获取期间内的薪资记录
      let query = supabase
        .from('payrolls')
        .select('id')
        .eq('period_id', periodId);

      if (employeeIds && employeeIds.length > 0) {
        query = query.in('employee_id', employeeIds);
      }

      const { data: payrolls, error: queryError } = await query;

      if (queryError) throw queryError;

      if (!payrolls || payrolls.length === 0) {
        return {
          results: [],
          summary: {
            successCount: 0,
            failureCount: 0,
            totalGrossPay: 0,
            totalDeductions: 0,
            totalNetPay: 0,
            totalEmployerInsurance: 0
          },
          errors: ['该期间没有找到薪资记录']
        };
      }

      const payrollIds = payrolls.map(p => p.id);
      return await calculateBatch(payrollIds, saveToDatabase);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '按期间批量计算失败';
      setError(errorMessage);
      
      return {
        results: [],
        summary: {
          successCount: 0,
          failureCount: 0,
          totalGrossPay: 0,
          totalDeductions: 0,
          totalNetPay: 0,
          totalEmployerInsurance: 0
        },
        errors: [errorMessage]
      };
    }
  }, [calculateBatch]);

  return {
    // 计算方法
    calculateSingle,
    calculateAndSave,
    calculateBatch,
    calculateByPeriod,
    
    // 辅助方法
    fetchPayrollItems,
    
    // 状态
    loading,
    error
  };
};