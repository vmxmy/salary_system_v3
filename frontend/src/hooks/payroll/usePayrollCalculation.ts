import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { Database } from '@/types/supabase';

// 类型定义
type PayrollPeriod = Database['public']['Tables']['payroll_periods']['Row'];

// 计算结果类型
export interface CalculationResult {
  payrollId: string;
  employeeId: string;
  employeeName: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  items: Array<{
    componentId: string;
    componentName: string;
    componentType: 'earning' | 'deduction';
    amount: number;
    notes?: string;
  }>;
  insurances: Array<{
    insuranceType: string;
    employeeAmount: number;
    employerAmount: number;
    contributionBase: number;
  }>;
  warnings?: string[];
  errors?: string[];
}

// 预览计算参数
export interface PreviewCalculationParams {
  employeeId: string;
  year: number;
  month: number;
  configOverrides?: {
    basicSalary?: number;
    positionSalary?: number;
    performanceBonus?: number;
    otherEarnings?: Array<{
      componentId: string;
      amount: number;
    }>;
    insuranceBases?: Array<{
      insuranceTypeId: string;
      contributionBase: number;
    }>;
  };
}

// 批量计算参数
export interface BatchCalculationParams {
  periodId: string;
  employeeIds?: string[];
  departmentIds?: string[];
  dryRun?: boolean;
}

// 计算进度
export interface CalculationProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  currentEmployee?: string;
  errors: Array<{
    employeeId: string;
    employeeName: string;
    error: string;
  }>;
}

// 查询键管理
export const calculationQueryKeys = {
  all: ['payroll-calculation'] as const,
  preview: (params: PreviewCalculationParams) => 
    [...calculationQueryKeys.all, 'preview', params] as const,
  validation: (periodId: string) => 
    [...calculationQueryKeys.all, 'validation', periodId] as const,
  formula: (componentId: string) => 
    [...calculationQueryKeys.all, 'formula', componentId] as const,
};

/**
 * 薪资计算 Hook
 */
export function usePayrollCalculation() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const [calculationProgress, setCalculationProgress] = useState<CalculationProgress>({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    errors: []
  });

  // 预览薪资计算（不保存）
  const previewCalculation = useMutation({
    mutationFn: async (params: PreviewCalculationParams): Promise<CalculationResult> => {
      const { data, error } = await supabase.rpc('preview_payroll_calculation', {
        p_employee_id: params.employeeId,
        p_year: params.year,
        p_month: params.month,
        p_config_overrides: params.configOverrides || null
      });

      if (error) {
        handleError(error, { customMessage: '预览计算失败' });
        throw error;
      }

      // 转换返回的数据格式
      return {
        payrollId: '',
        employeeId: params.employeeId,
        employeeName: data.employee_name || '',
        grossPay: data.gross_pay || 0,
        totalDeductions: data.total_deductions || 0,
        netPay: data.net_pay || 0,
        items: data.items || [],
        insurances: data.insurances || [],
        warnings: data.warnings,
        errors: data.errors
      };
    }
  });

  // 批量计算薪资
  const batchCalculate = useMutation({
    mutationFn: async (params: BatchCalculationParams) => {
      // 重置进度
      setCalculationProgress({
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        errors: []
      });

      // 调用批量处理存储过程
      const { data, error } = await supabase.rpc('process_monthly_payroll_v2', {
        p_year: new Date().getFullYear(),
        p_month: new Date().getMonth() + 1,
        p_department_ids: params.departmentIds || null,
        p_dry_run: params.dryRun || false
      });

      if (error) {
        handleError(error, { customMessage: '批量计算失败' });
        throw error;
      }

      // 更新进度
      if (data) {
        setCalculationProgress({
          total: data.total_employees || 0,
          processed: data.processed_employees || 0,
          success: data.success_count || 0,
          failed: data.failed_count || 0,
          errors: data.errors || []
        });
      }

      return data;
    },
    onSuccess: () => {
      // 刷新薪资列表
      queryClient.invalidateQueries({ 
        queryKey: ['payrolls'] 
      });
    }
  });

  // 计算单个薪资
  const calculateSingle = useMutation({
    mutationFn: async (params: {
      payrollId: string;
      periodId: string;
    }) => {
      // 生成薪资项
      const { data, error } = await supabase.rpc('generate_payroll_items', {
        p_payroll_id: params.payrollId,
        p_period_id: params.periodId
      });

      if (error) {
        handleError(error, { customMessage: '计算薪资失败' });
        throw error;
      }

      // 计算汇总
      const { error: calcError } = await supabase.rpc('calc_payroll_summary_batch', {
        p_period_id: params.periodId
      });

      if (calcError) {
        handleError(calcError, { customMessage: '汇总计算失败' });
        throw calcError;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // 刷新薪资详情
      queryClient.invalidateQueries({ 
        queryKey: ['payrolls', 'detail', variables.payrollId] 
      });
    }
  });

  // 重新计算薪资
  const recalculate = useMutation({
    mutationFn: async (payrollIds: string[]) => {
      const results = [];
      
      for (const payrollId of payrollIds) {
        try {
          // 获取薪资记录的周期ID
          const { data: payroll, error: fetchError } = await supabase
            .from('payrolls')
            .select('period_id')
            .eq('id', payrollId)
            .single();

          if (fetchError) throw fetchError;

          // 删除原有薪资项
          const { error: deleteError } = await supabase
            .from('payroll_items')
            .delete()
            .eq('payroll_id', payrollId);

          if (deleteError) throw deleteError;

          // 重新生成薪资项
          const { data, error } = await supabase.rpc('generate_payroll_items', {
            p_payroll_id: payrollId,
            p_period_id: payroll.period_id
          });

          if (error) throw error;

          results.push({ payrollId, success: true, data });
        } catch (error) {
          results.push({ 
            payrollId, 
            success: false, 
            error: error instanceof Error ? error.message : '未知错误' 
          });
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    }
  });

  // 验证薪资周期数据
  const validatePeriod = useMutation({
    mutationFn: async (periodId: string) => {
      const { data, error } = await supabase.rpc('validate_payroll_period', {
        p_period_id: periodId
      });

      if (error) {
        handleError(error, { customMessage: '验证周期数据失败' });
        throw error;
      }

      return data;
    }
  });

  // 复制上期薪资配置
  const copyFromPreviousPeriod = useMutation({
    mutationFn: async (params: {
      fromPeriodId: string;
      toPeriodId: string;
      includeItems?: boolean;
    }) => {
      const { data, error } = await supabase.rpc('copy_payroll_from_previous_period', {
        p_from_period_id: params.fromPeriodId,
        p_to_period_id: params.toPeriodId
      });

      if (error) {
        handleError(error, { customMessage: '复制薪资配置失败' });
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    }
  });

  // 获取计算公式
  const useCalculationFormula = (componentId: string) => {
    return useQuery({
      queryKey: calculationQueryKeys.formula(componentId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('payroll_component_config')
          .select('*')
          .eq('component_id', componentId)
          .single();

        if (error) {
          handleError(error, { customMessage: '获取计算公式失败' });
          throw error;
        }

        return data;
      },
      enabled: !!componentId,
      staleTime: 10 * 60 * 1000
    });
  };

  // 估算薪资（用于预算）
  const estimatePayroll = useMutation({
    mutationFn: async (params: {
      employeeIds: string[];
      year: number;
      month: number;
    }) => {
      const { data, error } = await supabase.rpc('get_employees_payroll_estimation', {
        employee_ids: params.employeeIds
      });

      if (error) {
        handleError(error, { customMessage: '薪资估算失败' });
        throw error;
      }

      return data;
    }
  });

  // 清理计算进度
  const resetProgress = () => {
    setCalculationProgress({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      errors: []
    });
  };

  return {
    // 计算操作
    mutations: {
      preview: previewCalculation,
      batchCalculate,
      calculateSingle,
      recalculate,
      validatePeriod,
      copyFromPrevious: copyFromPreviousPeriod,
      estimate: estimatePayroll
    },

    // 查询
    queries: {
      useCalculationFormula
    },

    // 计算进度
    progress: calculationProgress,
    resetProgress,

    // 操作方法
    actions: {
      preview: previewCalculation.mutate,
      batchCalculate: batchCalculate.mutate,
      calculateSingle: calculateSingle.mutate,
      recalculate: recalculate.mutate,
      validatePeriod: validatePeriod.mutate,
      copyFromPrevious: copyFromPreviousPeriod.mutate,
      estimate: estimatePayroll.mutate
    },

    // 加载状态
    loading: {
      preview: previewCalculation.isPending,
      batch: batchCalculate.isPending,
      single: calculateSingle.isPending,
      recalculate: recalculate.isPending,
      validate: validatePeriod.isPending
    },

    // 工具函数
    utils: {
      // 检查是否可以计算
      canCalculate: (status: string) => {
        return status === 'draft';
      },

      // 格式化计算错误
      formatCalculationError: (error: any) => {
        if (typeof error === 'string') return error;
        if (error?.message) return error.message;
        return '计算过程中发生未知错误';
      },

      // 获取进度百分比
      getProgressPercentage: () => {
        if (calculationProgress.total === 0) return 0;
        return Math.round(
          (calculationProgress.processed / calculationProgress.total) * 100
        );
      }
    }
  };
}