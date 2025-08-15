import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { Database } from '@/types/supabase';

// 类型定义
type PayrollPeriod = Database['public']['Tables']['payroll_periods']['Row'];
type PayrollPeriodInsert = Database['public']['Tables']['payroll_periods']['Insert'];
type PayrollPeriodUpdate = Database['public']['Tables']['payroll_periods']['Update'];

// 周期状态枚举
export const PeriodStatus = {
  DRAFT: 'draft',
  OPEN: 'open',
  CLOSED: 'closed',
  ARCHIVED: 'archived'
} as const;

export type PeriodStatusType = typeof PeriodStatus[keyof typeof PeriodStatus];

// 查询键管理
export const payrollPeriodQueryKeys = {
  all: ['payroll-periods'] as const,
  lists: () => [...payrollPeriodQueryKeys.all, 'list'] as const,
  list: (filters?: any) => [...payrollPeriodQueryKeys.lists(), filters] as const,
  detail: (id: string) => [...payrollPeriodQueryKeys.all, 'detail', id] as const,
  byMonth: (yearMonth: string) => [...payrollPeriodQueryKeys.all, 'month', yearMonth] as const,
  current: () => [...payrollPeriodQueryKeys.all, 'current'] as const,
  statistics: (periodId: string) => [...payrollPeriodQueryKeys.all, 'statistics', periodId] as const,
};

// 获取所有薪资周期
export const usePayrollPeriods = (filters?: {
  status?: PeriodStatusType;
  year?: number;
  month?: number;
  page?: number;
  pageSize?: number;
}) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollPeriodQueryKeys.list(filters),
    queryFn: async () => {
      const page = filters?.page || 1;
      const pageSize = filters?.pageSize || 20;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('payroll_periods')
        .select('*', { count: 'exact' });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.year) {
        query = query.eq('period_year', filters.year);
      }
      if (filters?.month) {
        query = query.eq('period_month', filters.month);
      }

      query = query
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        handleError(error, { customMessage: '获取薪资周期列表失败' });
        throw error;
      }

      return {
        data: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};

// 获取当前活跃周期
export const useCurrentPayrollPeriod = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollPeriodQueryKeys.current(),
    queryFn: async (): Promise<PayrollPeriod | null> => {
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('status', PeriodStatus.OPEN)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        handleError(error, { customMessage: '获取当前薪资周期失败' });
        throw error;
      }
      
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// 根据年月获取周期
export const usePayrollPeriodByMonth = (yearMonth: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollPeriodQueryKeys.byMonth(yearMonth),
    queryFn: async (): Promise<PayrollPeriod | null> => {
      if (!yearMonth || !yearMonth.match(/^\d{4}-\d{2}$/)) {
        return null;
      }
      
      const [year, month] = yearMonth.split('-').map(Number);
      
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('period_year', year)
        .eq('period_month', month)
        .single();

      if (error && error.code !== 'PGRST116') {
        handleError(error, { customMessage: '获取指定月份薪资周期失败' });
        throw error;
      }
      
      return data;
    },
    enabled: !!yearMonth && !!yearMonth.match(/^\d{4}-\d{2}$/),
    staleTime: 10 * 60 * 1000,
  });
};

// 获取周期详情
export const usePayrollPeriodDetail = (periodId: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollPeriodQueryKeys.detail(periodId),
    queryFn: async (): Promise<PayrollPeriod | null> => {
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('id', periodId)
        .single();

      if (error) {
        handleError(error, { customMessage: '获取薪资周期详情失败' });
        throw error;
      }
      
      return data;
    },
    enabled: !!periodId,
    staleTime: 5 * 60 * 1000,
  });
};

// 获取周期统计信息
export const usePayrollPeriodStatistics = (periodId: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollPeriodQueryKeys.statistics(periodId),
    queryFn: async () => {
      // 获取该周期的薪资统计
      const { data: payrolls, error: payrollError } = await supabase
        .from('payrolls')
        .select('id, gross_pay, total_deductions, net_pay, status')
        .eq('period_id', periodId);

      if (payrollError) {
        handleError(payrollError, { customMessage: '获取周期薪资统计失败' });
        throw payrollError;
      }

      // 计算统计数据
      const statistics = {
        totalEmployees: payrolls?.length || 0,
        totalGrossPay: payrolls?.reduce((sum, p) => sum + (p.gross_pay || 0), 0) || 0,
        totalDeductions: payrolls?.reduce((sum, p) => sum + (p.total_deductions || 0), 0) || 0,
        totalNetPay: payrolls?.reduce((sum, p) => sum + (p.net_pay || 0), 0) || 0,
        statusCounts: {
          draft: payrolls?.filter(p => p.status === 'draft').length || 0,
          calculating: payrolls?.filter(p => p.status === 'calculating').length || 0,
          calculated: payrolls?.filter(p => p.status === 'calculated').length || 0,
          approved: payrolls?.filter(p => p.status === 'approved').length || 0,
          paid: payrolls?.filter(p => p.status === 'paid').length || 0,
        }
      };

      return statistics;
    },
    enabled: !!periodId,
    staleTime: 2 * 60 * 1000,
  });
};

// 创建薪资周期
export const useCreatePayrollPeriod = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (data: PayrollPeriodInsert) => {
      // 检查是否已存在相同年月的周期
      const { data: existing } = await supabase
        .from('payroll_periods')
        .select('id')
        .eq('period_year', data.period_year)
        .eq('period_month', data.period_month)
        .single();
      
      if (existing) {
        throw new Error(`${data.period_year}年${data.period_month}月的薪资周期已存在`);
      }

      const { data: result, error } = await supabase
        .from('payroll_periods')
        .insert({
          ...data,
          period_code: `${data.period_year}-${String(data.period_month).padStart(2, '0')}`,
          period_name: `${data.period_year}年${data.period_month}月`,
          status: data.status || PeriodStatus.DRAFT
        })
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: '创建薪资周期失败' });
        throw error;
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollPeriodQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: payrollPeriodQueryKeys.current() });
    },
  });
};

// 更新薪资周期
export const useUpdatePayrollPeriod = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ periodId, data }: {
      periodId: string;
      data: PayrollPeriodUpdate;
    }) => {
      const { data: result, error } = await supabase
        .from('payroll_periods')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId)
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: '更新薪资周期失败' });
        throw error;
      }
      return result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: payrollPeriodQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: payrollPeriodQueryKeys.detail(variables.periodId) });
      queryClient.invalidateQueries({ queryKey: payrollPeriodQueryKeys.current() });
    },
  });
};

// 更新周期状态
export const useUpdatePeriodStatus = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ periodId, status }: {
      periodId: string;
      status: PeriodStatusType;
    }) => {
      // 如果要打开一个周期，先关闭其他打开的周期
      if (status === PeriodStatus.OPEN) {
        await supabase
          .from('payroll_periods')
          .update({ 
            status: PeriodStatus.CLOSED,
            updated_at: new Date().toISOString()
          })
          .eq('status', PeriodStatus.OPEN);
      }

      const { data, error } = await supabase
        .from('payroll_periods')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          locked_at: status === PeriodStatus.CLOSED ? new Date().toISOString() : null
        })
        .eq('id', periodId)
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: '更新周期状态失败' });
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollPeriodQueryKeys.all });
    },
  });
};

// 锁定/解锁周期
export const useTogglePeriodLock = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ periodId, lock }: {
      periodId: string;
      lock: boolean;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('payroll_periods')
        .update({ 
          locked_at: lock ? new Date().toISOString() : null,
          locked_by: lock ? user.user?.id : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId)
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: lock ? '锁定周期失败' : '解锁周期失败' });
        throw error;
      }
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: payrollPeriodQueryKeys.detail(variables.periodId) });
      queryClient.invalidateQueries({ queryKey: payrollPeriodQueryKeys.lists() });
    },
  });
};

// 删除薪资周期
export const useDeletePayrollPeriod = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (periodId: string) => {
      // 检查是否有关联的薪资记录
      const { data: payrolls } = await supabase
        .from('payrolls')
        .select('id')
        .eq('period_id', periodId)
        .limit(1);
      
      if (payrolls && payrolls.length > 0) {
        throw new Error('该周期已有薪资记录，无法删除');
      }

      const { error } = await supabase
        .from('payroll_periods')
        .delete()
        .eq('id', periodId);

      if (error) {
        handleError(error, { customMessage: '删除薪资周期失败' });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollPeriodQueryKeys.lists() });
    },
  });
};

/**
 * 薪资周期管理 Hook 配置选项
 */
interface UsePayrollPeriodOptions {
  autoLoadCurrent?: boolean;
  enableRealtime?: boolean;
}

/**
 * 主薪资周期管理 Hook
 */
export function usePayrollPeriod(options: UsePayrollPeriodOptions = {}) {
  const {
    autoLoadCurrent = true,
    enableRealtime = true
  } = options;

  const queryClient = useQueryClient();

  // 使用各个子Hook
  const periodsQuery = usePayrollPeriods();
  const currentPeriodQuery = useCurrentPayrollPeriod();
  const createPeriodMutation = useCreatePayrollPeriod();
  const updatePeriodMutation = useUpdatePayrollPeriod();
  const updateStatusMutation = useUpdatePeriodStatus();
  const toggleLockMutation = useTogglePeriodLock();
  const deletePeriodMutation = useDeletePayrollPeriod();

  // 设置实时订阅
  useEffect(() => {
    if (!enableRealtime) return;

    console.log('[PayrollPeriod] Setting up realtime subscription');

    const channel = supabase
      .channel('payroll-period-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payroll_periods' },
        (payload) => {
          console.log('[PayrollPeriod] Period change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: payrollPeriodQueryKeys.all });
        }
      )
      .subscribe();

    return () => {
      console.log('[PayrollPeriod] Cleaning up realtime subscription');
      channel.unsubscribe();
    };
  }, [enableRealtime, queryClient]);

  // 辅助函数
  const getPeriodByMonth = async (yearMonth: string): Promise<PayrollPeriod | null> => {
    const [year, month] = yearMonth.split('-').map(Number);
    const { data } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('period_year', year)
      .eq('period_month', month)
      .single();
    return data;
  };

  const getOrCreatePeriod = async (year: number, month: number): Promise<PayrollPeriod> => {
    // 先尝试获取
    const { data: existing } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('period_year', year)
      .eq('period_month', month)
      .single();
    
    if (existing) return existing;
    
    // 不存在则创建
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const payDate = new Date(year, month, 5); // 默认每月5号发薪
    
    const { data, error } = await supabase
      .from('payroll_periods')
      .insert({
        period_code: `${year}-${String(month).padStart(2, '0')}`,
        period_name: `${year}年${month}月`,
        period_year: year,
        period_month: month,
        period_start: startDate.toISOString().split('T')[0],
        period_end: endDate.toISOString().split('T')[0],
        pay_date: payDate.toISOString().split('T')[0],
        status: PeriodStatus.DRAFT
      })
      .select()
      .single();
    
    if (error) throw error;
    return data!;
  };

  // 刷新所有数据
  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: payrollPeriodQueryKeys.all });
  };

  return {
    // 数据
    periods: periodsQuery.data?.data || [],
    currentPeriod: autoLoadCurrent ? currentPeriodQuery.data : null,
    pagination: periodsQuery.data ? {
      total: periodsQuery.data.total,
      page: periodsQuery.data.page,
      pageSize: periodsQuery.data.pageSize,
      totalPages: periodsQuery.data.totalPages
    } : null,
    
    // 加载状态
    loading: {
      periods: periodsQuery.isLoading,
      currentPeriod: currentPeriodQuery.isLoading,
      isLoading: periodsQuery.isLoading || currentPeriodQuery.isLoading
    },

    // 错误状态
    errors: {
      periods: periodsQuery.error,
      currentPeriod: currentPeriodQuery.error
    },

    // Mutations
    mutations: {
      createPeriod: createPeriodMutation,
      updatePeriod: updatePeriodMutation,
      updateStatus: updateStatusMutation,
      toggleLock: toggleLockMutation,
      deletePeriod: deletePeriodMutation
    },

    // 操作
    actions: {
      refresh: refreshAll,
      createPeriod: createPeriodMutation.mutate,
      updatePeriod: updatePeriodMutation.mutate,
      updateStatus: updateStatusMutation.mutate,
      toggleLock: toggleLockMutation.mutate,
      deletePeriod: deletePeriodMutation.mutate,
      getPeriodByMonth,
      getOrCreatePeriod
    },

    // 常量
    PeriodStatus,

    // 工具函数
    utils: {
      formatPeriodName: (period: PayrollPeriod) => {
        return `${period.period_year}年${period.period_month}月`;
      },
      isPeriodLocked: (period: PayrollPeriod) => {
        return !!period.locked_at || period.status === PeriodStatus.CLOSED || period.status === PeriodStatus.ARCHIVED;
      },
      canEditPeriod: (period: PayrollPeriod) => {
        return !period.locked_at && period.status === PeriodStatus.OPEN;
      }
    }
  };
}