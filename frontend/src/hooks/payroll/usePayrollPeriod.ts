import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { Database } from '@/types/supabase';

// 类型定义 - 直接使用数据库类型
export type PayrollPeriod = Database['public']['Tables']['payroll_periods']['Row'];
export type PayrollPeriodInsert = Database['public']['Tables']['payroll_periods']['Insert'];

// 视图类型定义，基于 view_payroll_period_completeness
export type PayrollPeriodWithStats = {
  period_id: string;
  period_name: string;
  period_year: number;
  period_month: number;
  period_status: string;
  total_employees: number;
  earnings_count: number;
  earnings_percentage: string;
  earnings_status: string;
  bases_count: number;
  bases_percentage: string;
  bases_status: string;
  category_count: number;
  category_percentage: string;
  category_status: string;
  job_count: number;
  job_percentage: string;
  job_status: string;
  complete_employees_count: number;
  overall_completeness_percentage: string;
  metadata_status: string;
};

type PayrollPeriodUpdate = Database['public']['Tables']['payroll_periods']['Update'];

// 周期状态枚举
export const PeriodStatus = {
  DRAFT: 'draft',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
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
  upcoming: () => [...payrollPeriodQueryKeys.all, 'upcoming'] as const,
  recent: (limit: number) => [...payrollPeriodQueryKeys.all, 'recent', limit] as const,
  yearSummary: (year: number) => [...payrollPeriodQueryKeys.all, 'year-summary', year] as const,
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
        .from('view_payroll_period_completeness')
        .select('*', { count: 'exact' });

      if (filters?.status) {
        query = query.eq('period_status', filters.status);
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
        data: (data || []) as unknown as PayrollPeriodWithStats[],
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
      // 简化逻辑：直接按状态优先级和时间顺序获取最新的可用周期
      
      // 先尝试获取处理中的周期
      const { data: processingPeriod } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('status', PeriodStatus.PROCESSING)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (processingPeriod) {
        return processingPeriod;
      }
      
      // 如果没有处理中的周期，获取最新的草稿周期
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('status', PeriodStatus.DRAFT)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(1)
        .maybeSingle();

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
          // calculating 和 calculated 状态不在数据库中，设为0
          calculating: 0,
          calculated: 0,
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
          period_code: data.period_code,
          period_name: data.period_name,
          period_year: data.period_year,
          period_month: data.period_month,
          period_start: data.period_start,
          period_end: data.period_end,
          pay_date: data.pay_date,
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
      // 如果要处理一个周期，先完成其他处理中的周期
      if (status === PeriodStatus.PROCESSING) {
        await supabase
          .from('payroll_periods')
          .update({ 
            status: PeriodStatus.COMPLETED,
            updated_at: new Date().toISOString()
          })
          .eq('status', PeriodStatus.PROCESSING);
      }

      const { data, error } = await supabase
        .from('payroll_periods')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          locked_at: status === PeriodStatus.COMPLETED ? new Date().toISOString() : null
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
        return period.status === PeriodStatus.COMPLETED || period.status === PeriodStatus.ARCHIVED;
      },
      canEditPeriod: (period: PayrollPeriod) => {
        return period.status === PeriodStatus.DRAFT || period.status === PeriodStatus.PROCESSING;
      }
    }
  };
}

// ============ 增强功能 ============

/**
 * 获取即将到来的薪资周期
 */
export const useUpcomingPayrollPeriods = (limit = 3) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollPeriodQueryKeys.upcoming(),
    queryFn: async () => {
      // 简化：直接获取草稿和处理中的周期，按时间正序排列
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .in('status', [PeriodStatus.DRAFT, PeriodStatus.PROCESSING])
        .order('period_year', { ascending: true })
        .order('period_month', { ascending: true })
        .limit(limit);

      if (error) {
        handleError(error, { customMessage: '获取即将到来的薪资周期失败' });
        throw error;
      }
      
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 获取最近的薪资周期（包括已完成的）
 */
export const useRecentPayrollPeriods = (limit = 6) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollPeriodQueryKeys.recent(limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(limit);

      if (error) {
        handleError(error, { customMessage: '获取最近薪资周期失败' });
        throw error;
      }
      
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * 获取年度周期汇总
 */
export const useYearPayrollSummary = (year: number) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollPeriodQueryKeys.yearSummary(year),
    queryFn: async () => {
      // 获取该年度所有周期
      const { data: periods, error: periodError } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('period_year', year)
        .order('period_month', { ascending: true });

      if (periodError) {
        handleError(periodError, { customMessage: '获取年度周期失败' });
        throw periodError;
      }

      // 获取每个周期的薪资统计
      const summaries = await Promise.all(
        (periods || []).map(async (period) => {
          const { data: payrolls } = await supabase
            .from('payrolls')
            .select('gross_pay, total_deductions, net_pay, status')
            .eq('period_id', period.id);

          const stats = {
            period,
            totalEmployees: payrolls?.length || 0,
            totalGrossPay: payrolls?.reduce((sum, p) => sum + (p.gross_pay || 0), 0) || 0,
            totalDeductions: payrolls?.reduce((sum, p) => sum + (p.total_deductions || 0), 0) || 0,
            totalNetPay: payrolls?.reduce((sum, p) => sum + (p.net_pay || 0), 0) || 0,
            paidCount: payrolls?.filter(p => p.status === 'paid').length || 0,
            completionRate: payrolls?.length ? 
              (payrolls.filter(p => p.status === 'paid').length / payrolls.length) * 100 : 0
          };

          return stats;
        })
      );

      // 计算年度汇总
      const yearTotal = summaries.reduce((acc, month) => ({
        totalEmployees: acc.totalEmployees + month.totalEmployees,
        totalGrossPay: acc.totalGrossPay + month.totalGrossPay,
        totalDeductions: acc.totalDeductions + month.totalDeductions,
        totalNetPay: acc.totalNetPay + month.totalNetPay,
        totalPaidCount: acc.totalPaidCount + month.paidCount,
      }), {
        totalEmployees: 0,
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        totalPaidCount: 0,
      });

      return {
        year,
        months: summaries,
        yearTotal,
        averageMonthlyGrossPay: yearTotal.totalGrossPay / (summaries.length || 1),
        averageMonthlyNetPay: yearTotal.totalNetPay / (summaries.length || 1),
        completedMonths: summaries.filter(s => s.period.status === PeriodStatus.COMPLETED).length,
        totalMonths: summaries.length,
      };
    },
    enabled: !!year,
    staleTime: 30 * 60 * 1000, // 30分钟缓存
  });
};

/**
 * 批量生成周期
 */
export const useGeneratePayrollPeriods = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (params: {
      startYear: number;
      startMonth: number;
      endYear: number;
      endMonth: number;
      payDay?: number;
    }) => {
      const periods: PayrollPeriodInsert[] = [];
      const { payDay = 5 } = params;
      
      let currentYear = params.startYear;
      let currentMonth = params.startMonth;
      
      while (
        currentYear < params.endYear || 
        (currentYear === params.endYear && currentMonth <= params.endMonth)
      ) {
        // 检查是否已存在
        const { data: existing } = await supabase
          .from('payroll_periods')
          .select('id')
          .eq('period_year', currentYear)
          .eq('period_month', currentMonth)
          .single();
        
        if (!existing) {
          const startDate = new Date(currentYear, currentMonth - 1, 1);
          const endDate = new Date(currentYear, currentMonth, 0);
          const payDate = new Date(currentYear, currentMonth, payDay);
          
          periods.push({
            period_code: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
            period_name: `${currentYear}年${currentMonth}月`,
            period_year: currentYear,
            period_month: currentMonth,
            period_start: startDate.toISOString().split('T')[0],
            period_end: endDate.toISOString().split('T')[0],
            pay_date: payDate.toISOString().split('T')[0],
            status: PeriodStatus.DRAFT
          });
        }
        
        // 移到下一个月
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
      
      if (periods.length > 0) {
        const { error } = await supabase
          .from('payroll_periods')
          .insert(periods);
        
        if (error) {
          handleError(error, { customMessage: '批量生成周期失败' });
          throw error;
        }
      }
      
      return {
        created: periods.length,
        skipped: 
          ((params.endYear - params.startYear) * 12 + 
           (params.endMonth - params.startMonth + 1)) - periods.length
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollPeriodQueryKeys.all });
    },
  });
};

/**
 * 复制周期配置
 */
export const useCopyPeriodConfig = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (params: {
      sourcePeriodId: string;
      targetPeriodId: string;
      includePayrolls?: boolean;
    }) => {
      const { data, error } = await (supabase as any).rpc('copy_period_configuration', {
        p_source_period_id: params.sourcePeriodId,
        p_target_period_id: params.targetPeriodId,
        p_include_payrolls: params.includePayrolls || false
      });

      if (error) {
        handleError(error, { customMessage: '复制周期配置失败' });
        throw error;
      }
      
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: payrollPeriodQueryKeys.detail(variables.targetPeriodId) 
      });
    },
  });
};

/**
 * 周期对比分析
 */
export const usePeriodComparison = (periodIds: string[]) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['period-comparison', periodIds],
    queryFn: async () => {
      if (periodIds.length < 2) {
        throw new Error('至少需要选择两个周期进行对比');
      }
      
      const comparisons = await Promise.all(
        periodIds.map(async (periodId) => {
          const { data: period } = await supabase
            .from('payroll_periods')
            .select('*')
            .eq('id', periodId)
            .single();
          
          const { data: payrolls } = await supabase
            .from('payrolls')
            .select('gross_pay, total_deductions, net_pay, status')
            .eq('period_id', periodId);
          
          return {
            period,
            stats: {
              totalEmployees: payrolls?.length || 0,
              totalGrossPay: payrolls?.reduce((sum, p) => sum + (p.gross_pay || 0), 0) || 0,
              totalDeductions: payrolls?.reduce((sum, p) => sum + (p.total_deductions || 0), 0) || 0,
              totalNetPay: payrolls?.reduce((sum, p) => sum + (p.net_pay || 0), 0) || 0,
              averageGrossPay: payrolls?.length ? 
                payrolls.reduce((sum, p) => sum + (p.gross_pay || 0), 0) / payrolls.length : 0,
              averageNetPay: payrolls?.length ? 
                payrolls.reduce((sum, p) => sum + (p.net_pay || 0), 0) / payrolls.length : 0,
            }
          };
        })
      );
      
      // 计算对比数据
      const baseStats = comparisons[0].stats;
      const comparisonResults = comparisons.slice(1).map(comp => ({
        period: comp.period,
        stats: comp.stats,
        changes: {
          employeeChange: comp.stats.totalEmployees - baseStats.totalEmployees,
          employeeChangePercent: baseStats.totalEmployees > 0 ? 
            ((comp.stats.totalEmployees - baseStats.totalEmployees) / baseStats.totalEmployees) * 100 : 0,
          grossPayChange: comp.stats.totalGrossPay - baseStats.totalGrossPay,
          grossPayChangePercent: baseStats.totalGrossPay > 0 ? 
            ((comp.stats.totalGrossPay - baseStats.totalGrossPay) / baseStats.totalGrossPay) * 100 : 0,
          netPayChange: comp.stats.totalNetPay - baseStats.totalNetPay,
          netPayChangePercent: baseStats.totalNetPay > 0 ? 
            ((comp.stats.totalNetPay - baseStats.totalNetPay) / baseStats.totalNetPay) * 100 : 0,
        }
      }));
      
      return {
        base: comparisons[0],
        comparisons: comparisonResults
      };
    },
    enabled: periodIds.length >= 2,
    staleTime: 15 * 60 * 1000,
  });
};

/**
 * 周期状态统计
 */
export const usePeriodStatusStats = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['period-status-stats'],
    queryFn: async () => {
      const { data: periods, error } = await supabase
        .from('payroll_periods')
        .select('status');
      
      if (error) {
        handleError(error, { customMessage: '获取周期状态统计失败' });
        throw error;
      }
      
      const stats = {
        draft: 0,
        open: 0,
        closed: 0,
        archived: 0,
        total: periods?.length || 0
      };
      
      periods?.forEach(period => {
        if (period.status in stats) {
          stats[period.status as keyof typeof stats]++;
        }
      });
      
      return stats;
    },
    staleTime: 5 * 60 * 1000,
  });
};