import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { payrollQueryKeys } from './usePayroll';
import { payrollPeriodQueryKeys } from './usePayrollPeriod';
import { formatMonth } from '@/lib/dateUtils';

interface ClearPayrollPeriodParams {
  periodId: string;
  periodName?: string;
  clearStrategy?: 'all' | 'draft_only';  // 清除策略：全部或仅草稿
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
    mutationFn: async ({ periodId, clearStrategy = 'draft_only' }) => {
      try {
        // 调用存储函数清理数据
        const { data, error } = await supabase
          .rpc('clear_payroll_period' as any, {
            p_period_id: periodId,
            p_clear_strategy: clearStrategy
          }) as { data: any, error: any };

        if (error) {
          throw new Error(`清理薪资周期失败: ${error.message}`);
        }

        if (!data || !data.success) {
          throw new Error(data?.message || '清理失败');
        }

        // 转换返回格式
        const result: ClearPayrollPeriodResult = {
          success: data.success,
          deletedCount: {
            payrolls: data.deleted_counts?.payrolls || 0,
            payrollItems: data.deleted_counts?.payroll_items || 0,
            contributionBases: data.deleted_counts?.contribution_bases || 0,
            categoryAssignments: data.deleted_counts?.category_assignments || 0,
            jobHistory: data.deleted_counts?.job_history || 0
          },
          message: data.message
        };

        return result;

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

  return useMutation<any, Error, { year: number; month: number; clearStrategy?: 'all' | 'draft_only' }>({
    mutationFn: async ({ year, month, clearStrategy = 'draft_only' }) => {
      // 直接调用按月清理的存储函数
      const { data, error } = await supabase
        .rpc('clear_payroll_by_month' as any, {
          p_year: year,
          p_month: month,
          p_clear_strategy: clearStrategy
        }) as { data: any, error: any };

      if (error) {
        throw new Error(`清理失败: ${error.message}`);
      }

      if (!data || !data.success) {
        throw new Error(data?.message || `${year}年${month}月 没有薪资数据`);
      }

      return data;
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

  return useMutation<any, Error, { periodIds: string[]; clearStrategy?: 'all' | 'draft_only' }>({
    mutationFn: async ({ periodIds, clearStrategy = 'draft_only' }) => {
      // 调用批量清理的存储函数
      const { data, error } = await supabase
        .rpc('clear_multiple_payroll_periods' as any, {
          p_period_ids: periodIds,
          p_clear_strategy: clearStrategy
        }) as { data: any, error: any };

      if (error) {
        throw new Error(`批量清理失败: ${error.message}`);
      }

      return data;
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