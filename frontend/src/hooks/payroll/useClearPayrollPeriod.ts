import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { payrollQueryKeys } from './usePayroll';
import { payrollPeriodQueryKeys } from './usePayrollPeriod';
import { formatMonth } from '@/lib/dateUtils';

interface ClearPayrollPeriodParams {
  periodId: string;
  periodName?: string;
  onProgress?: (step: string, completed: number, total: number) => void;
}

interface ClearPayrollPeriodResult {
  success: boolean;
  deletedCount: {
    payrolls: number;
    payrollItems: number;
    contributionBases?: number;
    categoryAssignments?: number;
    jobHistory?: number;
  };
  message: string;
}

/**
 * Hook for clearing all payroll data for a specific period
 * 清除指定薪资周期的所有数据（使用存储函数）
 */
export function useClearPayrollPeriod() {
  const queryClient = useQueryClient();
  const { showSuccess, showError, showInfo } = useToast();

  return useMutation<ClearPayrollPeriodResult, Error, ClearPayrollPeriodParams>({
    mutationFn: async ({ periodId, onProgress }) => {
      try {
        const deletedCount = {
          payrolls: 0,
          payrollItems: 0,
          contributionBases: 0,
          categoryAssignments: 0,
          jobHistory: 0,
          specialDeductions: 0
        };

        // 定义清除步骤
        const CLEAR_STEPS = {
          QUERY_PAYROLLS: '查询薪资记录',
          DELETE_APPROVALS: '删除审批记录',
          DELETE_ITEMS: '删除薪资明细',
          DELETE_PAYROLLS: '删除薪资记录',
          DELETE_EMPLOYEE_DATA: '清理员工数据',
          COMPLETE: '清理完成'
        };
        
        const totalSteps = Object.keys(CLEAR_STEPS).length;
        let currentStep = 0;

        // 进度回调辅助函数
        const updateProgress = (step: string) => {
          currentStep++;
          onProgress?.(step, currentStep, totalSteps);
        };

        // 第1步：获取该周期的所有薪资记录
        updateProgress(CLEAR_STEPS.QUERY_PAYROLLS);
        const { data: payrollsToDelete, error: payrollError } = await supabase
          .from('payrolls')
          .select('id')
          .eq('period_id', periodId)
          .abortSignal(AbortSignal.timeout(30000));
        
        if (payrollError) {
          if (payrollError.message.includes('AbortError') || payrollError.message.includes('aborted')) {
            throw new Error('查询薪资记录超时，请重试');
          }
          throw new Error(`查询薪资记录失败: ${payrollError.message}`);
        }

        if (payrollsToDelete && payrollsToDelete.length > 0) {
          const payrollIds = payrollsToDelete.map(p => p.id);
          
          // 第2步：删除薪资审批记录（外键依赖）
          updateProgress(CLEAR_STEPS.DELETE_APPROVALS);
          const { error: approvalError } = await supabase
            .from('payroll_approval_logs')
            .delete()
            .in('payroll_id', payrollIds)
            .abortSignal(AbortSignal.timeout(30000));
          
          if (approvalError && !approvalError.message.includes('No rows deleted')) {
            console.warn('删除审批记录失败:', approvalError.message);
          }

          // 第3步：删除薪资项目明细（外键依赖）
          updateProgress(CLEAR_STEPS.DELETE_ITEMS);
          const { error: itemsError } = await supabase
            .from('payroll_items')
            .delete()
            .in('payroll_id', payrollIds)
            .abortSignal(AbortSignal.timeout(30000));
          
          if (itemsError) {
            if (itemsError.message.includes('AbortError') || itemsError.message.includes('aborted')) {
              throw new Error('删除薪资项目超时，请重试');
            }
            throw new Error(`删除薪资项目失败: ${itemsError.message}`);
          }
          deletedCount.payrollItems = payrollIds.length;

          // 第4步：删除薪资记录
          updateProgress(CLEAR_STEPS.DELETE_PAYROLLS);
          const { error: payrollDeleteError } = await supabase
            .from('payrolls')
            .delete()
            .in('id', payrollIds)
            .abortSignal(AbortSignal.timeout(30000));

          if (payrollDeleteError) {
            if (payrollDeleteError.message.includes('AbortError') || payrollDeleteError.message.includes('aborted')) {
              throw new Error('删除薪资记录超时，请重试');
            }
            throw new Error(`删除薪资记录失败: ${payrollDeleteError.message}`);
          }
          
          deletedCount.payrolls = payrollIds.length;
        }

        // 第5步：并行删除独立的员工数据表（这些表之间没有外键依赖）
        updateProgress(CLEAR_STEPS.DELETE_EMPLOYEE_DATA);
        
        const employeeDataDeletions = [
          // 删除员工缴费基数
          supabase
            .from('employee_contribution_bases')
            .delete()
            .eq('period_id', periodId)
            .abortSignal(AbortSignal.timeout(30000))
            .then(({ error }) => {
              if (error && !error.message.includes('No rows deleted')) {
                console.warn('删除缴费基数失败:', error.message);
                return 0;
              }
              return 1;
            }),

          // 删除员工身份类别分配
          supabase
            .from('employee_category_assignments')
            .delete()
            .eq('period_id', periodId)
            .abortSignal(AbortSignal.timeout(30000))
            .then(({ error }) => {
              if (error && !error.message.includes('No rows deleted')) {
                console.warn('删除员工身份类别分配失败:', error.message);
                return 0;
              }
              return 1;
            }),

          // 删除员工职务信息
          supabase
            .from('employee_job_history')
            .delete()
            .eq('period_id', periodId)
            .abortSignal(AbortSignal.timeout(30000))
            .then(({ error }) => {
              if (error && !error.message.includes('No rows deleted')) {
                console.warn('删除员工职务信息失败:', error.message);
                return 0;
              }
              return 1;
            }),

          // 删除员工特殊扣除信息
          supabase
            .from('employee_special_deductions')
            .delete()
            .eq('period_id', periodId)
            .abortSignal(AbortSignal.timeout(30000))
            .then(({ error }) => {
              if (error && !error.message.includes('No rows deleted')) {
                console.warn('删除特殊扣除信息失败:', error.message);
                return 0;
              }
              return 1;
            })
        ];

        // 并行执行所有员工数据删除操作
        const results = await Promise.allSettled(employeeDataDeletions);
        
        // 统计删除结果
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const names = ['contributionBases', 'categoryAssignments', 'jobHistory', 'specialDeductions'] as const;
            (deletedCount as any)[names[index]] = result.value;
          } else {
            console.warn(`并行删除操作 ${index} 失败:`, result.reason);
          }
        });

        // 第6步：完成
        updateProgress(CLEAR_STEPS.COMPLETE);

        return {
          success: true,
          deletedCount,
          message: `成功清除该周期的所有相关数据（薪资记录: ${deletedCount.payrolls} 条）`
        };

      } catch (error) {
        console.error('Clear payroll period error:', error);
        throw error;
      }
    },

    onSuccess: (data, variables) => {
      // 清理缓存
      queryClient.invalidateQueries({ queryKey: payrollQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: payrollPeriodQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['payroll-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-completeness'] });

      // 显示成功消息
      if (data.deletedCount.payrolls > 0) {
        const message = variables.periodName 
          ? `${variables.periodName} 的薪资数据已清空`
          : '薪资数据已清空';
        
        showSuccess(
          `${message}\n` +
          `删除了 ${data.deletedCount.payrolls} 条薪资记录\n` +
          `删除了 ${data.deletedCount.payrollItems} 条薪资明细`
        );
      } else {
        showInfo(data.message);
      }
    },

    onError: (error) => {
      showError(`清空薪资数据失败: ${error.message}`);
    }
  });
}

/**
 * Hook for clearing payroll data by month (convenience wrapper)
 * 按月份清除薪资数据（便捷封装，使用存储函数）
 */
export function useClearPayrollMonth() {
  const queryClient = useQueryClient();
  const { showSuccess, showError, showInfo } = useToast();

  return useMutation<any, Error, { year: number; month: number }>({
    mutationFn: async ({ year, month }) => {
      try {
        // 查找对应月份的薪资周期
        const periodCode = `${year}-${month.toString().padStart(2, '0')}`;
        const { data: period, error: periodError } = await supabase
          .from('payroll_periods')
          .select('id, period_name')
          .eq('period_code', periodCode)
          .single();

        if (periodError || !period) {
          throw new Error(`找不到 ${year}年${month}月 的薪资周期`);
        }

        // 直接调用清理逻辑（复制主要逻辑）
        const deletedCount = {
          payrolls: 0,
          payrollItems: 0
        };

        // 获取该周期的所有薪资记录
        const { data: payrollsToDelete, error: payrollError } = await supabase
          .from('payrolls')
          .select('id')
          .eq('period_id', period.id);
        
        if (payrollError) {
          throw new Error(`查询薪资记录失败: ${payrollError.message}`);
        }

        // 删除薪资相关数据
        if (payrollsToDelete && payrollsToDelete.length > 0) {
          const payrollIds = payrollsToDelete.map(p => p.id);
          
          // 删除薪资项目明细
          await supabase.from('payroll_items').delete().in('payroll_id', payrollIds);
          
          // 删除薪资记录
          await supabase.from('payrolls').delete().in('id', payrollIds);
          
          deletedCount.payrolls = payrollIds.length;
        }

        // 删除该周期的员工分配数据
        await supabase.from('employee_contribution_bases').delete().eq('period_id', period.id);
        await supabase.from('employee_category_assignments').delete().eq('period_id', period.id);
        await supabase.from('employee_job_history').delete().eq('period_id', period.id);
        await supabase.from('employee_special_deductions').delete().eq('period_id', period.id);

        const result = {
          success: true,
          message: `成功清除 ${deletedCount.payrolls} 条薪资记录`,
          deletedCount
        };

        return {
          success: result.success,
          message: result.message,
          deleted_counts: {
            payrolls: result.deletedCount.payrolls,
            payroll_items: result.deletedCount.payrollItems
          }
        };
      } catch (error) {
        throw error;
      }
    },
    
    onSuccess: (data) => {
      // 清理缓存
      queryClient.invalidateQueries({ queryKey: payrollQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: payrollPeriodQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['payroll-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-completeness'] });

      // 显示成功消息
      if (data.deleted_counts?.payrolls > 0) {
        showSuccess(
          `${data.message}\n` +
          `删除了 ${data.deleted_counts.payrolls} 条薪资记录`
        );
      } else {
        showInfo(data.message);
      }
    },
    
    onError: (error) => {
      showError(error.message);
    }
  });
}

/**
 * Hook for batch clearing multiple periods
 * 批量清除多个周期的数据（使用存储函数）
 */
export function useBatchClearPayrollPeriods() {
  const queryClient = useQueryClient();
  const { showSuccess, showError, showInfo } = useToast();

  return useMutation<any, Error, { periodIds: string[] }>({
    mutationFn: async ({ periodIds }) => {
      const summary = {
        success_count: 0,
        failed_count: 0,
        total_payrolls_deleted: 0,
        failures: [] as Array<{ periodId: string; error: string }>
      };

      // 依次处理每个周期
      for (const periodId of periodIds) {
        try {
          // 查找周期信息
          const { data: period } = await supabase
            .from('payroll_periods')
            .select('period_name')
            .eq('id', periodId)
            .single();

          // 直接实现清理逻辑
          const deletedCount = { payrolls: 0 };

          // 获取该周期的所有薪资记录
          const { data: payrollsToDelete, error: payrollError } = await supabase
            .from('payrolls')
            .select('id')
            .eq('period_id', periodId);
          
          if (payrollError) {
            throw new Error(`查询薪资记录失败: ${payrollError.message}`);
          }

          // 删除薪资相关数据
          if (payrollsToDelete && payrollsToDelete.length > 0) {
            const payrollIds = payrollsToDelete.map(p => p.id);

            // 删除薪资审批记录和明细
            await supabase.from('payroll_approval_logs').delete().in('payroll_id', payrollIds);
            await supabase.from('payroll_items').delete().in('payroll_id', payrollIds);
            await supabase.from('payrolls').delete().in('id', payrollIds);
            
            deletedCount.payrolls = payrollIds.length;
          }

          // 删除该周期的员工分配数据
          await supabase.from('employee_contribution_bases').delete().eq('period_id', periodId);
          await supabase.from('employee_category_assignments').delete().eq('period_id', periodId);
          await supabase.from('employee_job_history').delete().eq('period_id', periodId);
          await supabase.from('employee_special_deductions').delete().eq('period_id', periodId);

          const result = {
            success: true,
            message: `成功清除 ${deletedCount.payrolls} 条薪资记录`,
            deletedCount
          };

          if (result.success) {
            summary.success_count++;
            summary.total_payrolls_deleted += result.deletedCount.payrolls;
          } else {
            summary.failed_count++;
            summary.failures.push({
              periodId,
              error: result.message || '清理失败'
            });
          }
        } catch (error) {
          summary.failed_count++;
          summary.failures.push({
            periodId,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }
      }

      return { summary };
    },
    
    onSuccess: (data) => {
      // 清理缓存
      queryClient.invalidateQueries({ queryKey: payrollQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: payrollPeriodQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['payroll-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-completeness'] });

      // 显示结果
      const summary = data?.summary;
      if (summary?.success_count > 0) {
        showSuccess(
          `成功清除 ${summary.success_count} 个周期\n` +
          `共删除 ${summary.total_payrolls_deleted} 条薪资记录`
        );
      }
      
      if (summary?.failed_count > 0) {
        showError(`${summary.failed_count} 个周期清除失败`);
      }
    },
    
    onError: (error) => {
      showError(error.message);
    }
  });
}

// 导出查询键
export const clearPayrollQueryKeys = {
  all: ['clear-payroll'] as const,
  byPeriod: (periodId: string) => ['clear-payroll', 'period', periodId] as const,
  byMonth: (year: number, month: number) => ['clear-payroll', 'month', year, month] as const,
};