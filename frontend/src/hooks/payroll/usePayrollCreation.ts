import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import { useLoadingState } from '@/hooks/core/useLoadingState';
import type { Database } from '@/types/supabase';

// 类型定义
type Payroll = Database['public']['Tables']['payrolls']['Row'];
type PayrollInsert = Database['public']['Tables']['payrolls']['Insert'];

// 薪资创建配置
export interface PayrollCreationConfig {
  periodId: string;
  departmentIds?: string[];
  employeeIds?: string[];
  calculateInsurance?: boolean;
  calculateTax?: boolean;
  overwriteExisting?: boolean;
}

// 创建进度
export interface CreationProgress {
  phase: 'preparing' | 'creating' | 'calculating' | 'validating' | 'completed' | 'error';
  total: number;
  processed: number;
  currentEmployee?: string;
  message?: string;
}

// 创建结果
export interface PayrollCreationResult {
  success: boolean;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  total?: number;
  errors: Array<{
    employeeId: string;
    employeeName: string;
    error: string;
  }>;
  payrollIds: string[];
}

// 批量创建选项
export interface BatchCreateOptions {
  periodId: string;
  employeeIds?: string[];
  departmentIds?: string[];
  status?: 'draft' | 'approved' | 'paid';
  autoCalculate?: boolean;
}

// 查询键管理
export const payrollCreationQueryKeys = {
  all: ['payroll-creation'] as const,
  period: (periodId: string) => [...payrollCreationQueryKeys.all, 'period', periodId] as const,
  preview: (config: PayrollCreationConfig) => [...payrollCreationQueryKeys.all, 'preview', config] as const,
};

/**
 * 薪资创建 Hook
 * 提供批量创建薪资记录的功能
 */
export function usePayrollCreation() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const { loadingState, setLoading, withLoading } = useLoadingState();
  
  const [creationProgress, setCreationProgress] = useState<CreationProgress>({
    phase: 'preparing',
    total: 0,
    processed: 0
  });

  // 获取员工列表（根据部门过滤）
  const getEligibleEmployees = useCallback(async (config: PayrollCreationConfig) => {
    let query = supabase
      .from('employees')
      .select('id, employee_name')
      .eq('employment_status', 'active');

    if (config.employeeIds && config.employeeIds.length > 0) {
      query = query.in('id', config.employeeIds);
    } else if (config.departmentIds && config.departmentIds.length > 0) {
      // 先获取部门的员工分配
      const { data: assignments } = await supabase
        .from('employee_job_history' as any)
        .select('employee_id')
        .in('department_id', config.departmentIds);
      
      if (assignments) {
        const employeeIds = assignments.map((a: any) => a.employee_id).filter(Boolean) as string[];
        if (employeeIds.length > 0) {
          query = query.in('id', employeeIds);
        }
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data || [];
  }, []);

  // 检查薪资是否已存在
  const checkExistingPayrolls = useCallback(async (
    periodId: string,
    employeeIds: string[]
  ) => {
    const { data, error } = await supabase
      .from('payrolls')
      .select('employee_id')
      .eq('period_id', periodId)
      .in('employee_id', employeeIds);

    if (error) throw error;
    
    return new Set(data?.map(p => p.employee_id) || []);
  }, []);

  // 创建单个薪资记录
  const createPayroll = useCallback(async (
    employeeId: string,
    periodId: string,
    config: PayrollCreationConfig
  ): Promise<string | null> => {
    try {
      // 获取薪资周期信息
      const { data: period } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('id', periodId)
        .single();

      if (!period) {
        throw new Error('薪资周期不存在');
      }

      // 创建薪资记录
      const payrollData: PayrollInsert = {
        employee_id: employeeId,
        period_id: periodId,
        pay_date: period.pay_date || new Date().toISOString().split('T')[0],
        status: 'draft',
        gross_pay: 0,
        total_deductions: 0,
        net_pay: 0
      };

      const { data: payroll, error } = await supabase
        .from('payrolls')
        .insert(payrollData)
        .select()
        .single();

      if (error) throw error;

      // 如果需要自动计算
      if (config.calculateInsurance || config.calculateTax) {
        // 这里可以调用计算服务或存储过程
        // 暂时跳过，等待后续实现
      }

      return payroll.id;
    } catch (error) {
      console.error(`创建员工 ${employeeId} 的薪资失败:`, error);
      throw error;
    }
  }, []);

  // 批量创建薪资
  const batchCreate = useMutation({
    mutationFn: async (config: PayrollCreationConfig): Promise<PayrollCreationResult> => {
      const result: PayrollCreationResult = {
        success: false,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errors: [],
        payrollIds: []
      };

      try {
        setCreationProgress({ phase: 'preparing', total: 0, processed: 0, message: '准备创建薪资...' });

        // 1. 获取符合条件的员工
        const employees = await getEligibleEmployees(config);
        result.total = employees.length;
        setCreationProgress(prev => ({ ...prev, total: employees.length }));

        if (employees.length === 0) {
          throw new Error('没有符合条件的员工');
        }

        // 2. 检查已存在的薪资
        setCreationProgress(prev => ({ ...prev, phase: 'creating', message: '检查现有薪资记录...' }));
        const existingPayrolls = await checkExistingPayrolls(
          config.periodId,
          employees.map(e => e.id)
        );

        // 3. 逐个创建薪资
        for (let i = 0; i < employees.length; i++) {
          const employee = employees[i];
          setCreationProgress(prev => ({
            ...prev,
            processed: i + 1,
            currentEmployee: employee.employee_name || '',
            message: `正在创建 ${employee.employee_name || '未知员工'} 的薪资...`
          }));

          // 检查是否已存在
          if (existingPayrolls.has(employee.id)) {
            if (config.overwriteExisting) {
              // 更新现有薪资
              // TODO: 实现更新逻辑
              result.updatedCount++;
            } else {
              result.skippedCount++;
              continue;
            }
          } else {
            // 创建新薪资
            try {
              const payrollId = await createPayroll(employee.id, config.periodId, config);
              if (payrollId) {
                result.payrollIds.push(payrollId);
                result.createdCount++;
              }
            } catch (error) {
              result.errors.push({
                employeeId: employee.id,
                employeeName: employee.employee_name || '未知',
                error: error instanceof Error ? error.message : '创建失败'
              });
            }
          }
        }

        result.success = result.errors.length === 0;
        setCreationProgress({ 
          phase: 'completed', 
          total: employees.length, 
          processed: employees.length,
          message: '薪资创建完成'
        });

        return result;
      } catch (error) {
        setCreationProgress(prev => ({ ...prev, phase: 'error', message: '创建失败' }));
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
    },
    onError: (error) => {
      handleError(error, { customMessage: '批量创建薪资失败' });
    }
  });

  // 预览将要创建的薪资
  const previewCreation = useCallback(async (config: PayrollCreationConfig) => {
    return withLoading('isPreviewing', async () => {
      try {
        const employees = await getEligibleEmployees(config);
        const existingPayrolls = await checkExistingPayrolls(
          config.periodId,
          employees.map(e => e.id)
        );

        return {
          totalEmployees: employees.length,
          newPayrolls: employees.filter(e => !existingPayrolls.has(e.id)).length,
          existingPayrolls: existingPayrolls.size,
          employees: employees.map(e => ({
            ...e,
            hasExistingPayroll: existingPayrolls.has(e.id)
          }))
        };
      } catch (error) {
        handleError(error, { customMessage: '预览失败' });
        throw error;
      }
    });
  }, [getEligibleEmployees, checkExistingPayrolls, withLoading, handleError]);

  // 计算薪资总额
  const calculatePayrollTotals = useCallback(async (payrollIds: string[]) => {
    return withLoading('isCalculating', async () => {
      try {
        const { data, error } = await supabase
          .from('payrolls')
          .select('gross_pay, total_deductions, net_pay')
          .in('id', payrollIds);

        if (error) throw error;

        const totals = (data || []).reduce((acc, payroll) => ({
          totalGross: acc.totalGross + (payroll.gross_pay || 0),
          totalDeductions: acc.totalDeductions + (payroll.total_deductions || 0),
          totalNet: acc.totalNet + (payroll.net_pay || 0)
        }), { totalGross: 0, totalDeductions: 0, totalNet: 0 });

        return totals;
      } catch (error) {
        handleError(error, { customMessage: '计算失败' });
        throw error;
      }
    });
  }, [withLoading, handleError]);

  // 快速创建当月薪资
  const quickCreateCurrentMonth = useCallback(async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // 查找或创建当月薪资周期
    const { data: period } = await supabase
      .from('payroll_periods')
      .select('id')
      .eq('period_code', currentMonth)
      .single();

    if (!period) {
      throw new Error('当月薪资周期不存在，请先创建薪资周期');
    }

    return batchCreate.mutateAsync({
      periodId: period.id,
      calculateInsurance: true,
      calculateTax: true,
      overwriteExisting: false
    });
  }, [batchCreate]);

  return {
    // 创建功能
    batchCreate: batchCreate.mutate,
    batchCreateAsync: batchCreate.mutateAsync,
    previewCreation,
    quickCreateCurrentMonth,
    
    // 计算功能
    calculatePayrollTotals,
    
    // 进度状态
    creationProgress,
    
    // 加载状态
    loading: {
      isCreating: batchCreate.isPending,
      isPreviewing: loadingState.isPreviewing,
      isCalculating: loadingState.isCalculating
    },
    
    // 错误状态
    error: batchCreate.error,
    
    // 重置
    reset: () => {
      batchCreate.reset();
      setCreationProgress({
        phase: 'preparing',
        total: 0,
        processed: 0
      });
    }
  };
}

// 导出便捷函数
export function useQuickPayrollCreate() {
  const { batchCreate, loading, creationProgress } = usePayrollCreation();

  const createForDepartment = useCallback(async (
    periodId: string,
    departmentId: string
  ) => {
    return batchCreate({
      periodId,
      departmentIds: [departmentId],
      calculateInsurance: true,
      calculateTax: true,
      overwriteExisting: false
    });
  }, [batchCreate]);

  const createForEmployees = useCallback(async (
    periodId: string,
    employeeIds: string[]
  ) => {
    return batchCreate({
      periodId,
      employeeIds,
      calculateInsurance: true,
      calculateTax: true,
      overwriteExisting: false
    });
  }, [batchCreate]);

  return {
    createForDepartment,
    createForEmployees,
    loading,
    progress: creationProgress
  };
}