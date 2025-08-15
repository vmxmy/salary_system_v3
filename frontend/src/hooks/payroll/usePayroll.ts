import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { Database } from '@/types/supabase';

// 类型定义
type PayrollInsert = Database['public']['Tables']['payrolls']['Insert'];
type PayrollUpdate = Database['public']['Tables']['payrolls']['Update'];

// 薪资状态枚举
export const PayrollStatus = {
  DRAFT: 'draft',
  CALCULATING: 'calculating',
  CALCULATED: 'calculated',
  APPROVED: 'approved', 
  PAID: 'paid',
  CANCELLED: 'cancelled'
} as const;

export type PayrollStatusType = typeof PayrollStatus[keyof typeof PayrollStatus];

// 查询键管理
export const payrollQueryKeys = {
  all: ['payrolls'] as const,
  lists: () => [...payrollQueryKeys.all, 'list'] as const,
  list: (filters?: any) => [...payrollQueryKeys.lists(), filters] as const,
  detail: (id: string) => [...payrollQueryKeys.all, 'detail', id] as const,
  statistics: (params: any) => [...payrollQueryKeys.all, 'statistics', params] as const,
  costAnalysis: (params: any) => [...payrollQueryKeys.all, 'cost-analysis', params] as const,
  latestMonth: () => [...payrollQueryKeys.all, 'latest-month'] as const,
  insurance: (payrollId: string) => [...payrollQueryKeys.all, 'insurance', payrollId] as const,
  contributionBases: (employeeId: string, yearMonth: string) => 
    [...payrollQueryKeys.all, 'contribution-bases', employeeId, yearMonth] as const,
  insuranceTypes: () => [...payrollQueryKeys.all, 'insurance-types'] as const,
};

// 数值格式化工具函数
const formatNumber = (value: any, decimals: number = 2): number => {
  if (value == null || value === '') return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : parseFloat(num.toFixed(decimals));
};

// 获取最近有薪资记录的周期
export const useLatestPayrollPeriod = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollQueryKeys.latestMonth(),
    queryFn: async (): Promise<{ period_id: string; period_name: string } | null> => {
      const { data, error } = await supabase
        .from('payrolls')
        .select(`
          period_id,
          payroll_periods!inner(
            id,
            period_name,
            period_year,
            period_month
          )
        `)
        .not('period_id', 'is', null)
        .order('payroll_periods.period_year', { ascending: false })
        .order('payroll_periods.period_month', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        handleError(error, { customMessage: '获取最近薪资周期失败' });
        throw error;
      }
      
      if (data && data.payroll_periods) {
        return {
          period_id: data.period_id,
          period_name: data.payroll_periods.period_name
        };
      }
      
      return null;
    },
    staleTime: 10 * 60 * 1000, // 10分钟
  });
};

// 获取薪资列表
export const usePayrolls = (filters?: {
  status?: PayrollStatusType;
  employeeId?: string;
  periodId?: string;
  periodYear?: number;
  periodMonth?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollQueryKeys.list(filters),
    queryFn: async () => {
      const searchTerm = filters?.search?.trim();
      const page = filters?.page || 1;
      const pageSize = filters?.pageSize || 20;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('payrolls')
        .select(`
          id,
          pay_date,
          period_id,
          employee_id,
          gross_pay,
          total_deductions,
          net_pay,
          status,
          employee:employees!inner(
            id,
            employee_name,
            id_number
          ),
          period:payroll_periods!inner(
            id,
            period_name,
            period_year,
            period_month,
            period_start,
            period_end
          )
        `, { count: 'exact' });

      // 搜索条件 - 注意：status是enum类型，不能使用ilike
      if (searchTerm) {
        query = query.or(
          `employee.employee_name.ilike.%${searchTerm}%`
        );
      }

      // 过滤条件
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters?.periodId) {
        query = query.eq('period_id', filters.periodId);
      }
      if (filters?.periodYear) {
        query = query.eq('period.period_year', filters.periodYear);
      }
      if (filters?.periodMonth) {
        query = query.eq('period.period_month', filters.periodMonth);
      }

      query = query
        .order('period.period_year', { ascending: false })
        .order('period.period_month', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        handleError(error, { customMessage: '获取薪资列表失败' });
        throw error;
      }

      // 转换数据格式
      const transformedData = (data || []).map(item => ({
        id: item.id,
        payroll_id: item.id,
        pay_date: item.pay_date,
        period_id: item.period_id,
        period_name: item.period?.period_name || '',
        pay_period_start: item.period?.period_start || '',
        pay_period_end: item.period?.period_end || '',
        employee_id: item.employee_id,
        employee_name: item.employee?.employee_name || '',
        gross_pay: item.gross_pay,
        total_deductions: item.total_deductions,
        net_pay: item.net_pay,
        status: item.status,
        employee: {
          id: item.employee_id,
          employee_name: item.employee?.employee_name || '',
          id_number: item.employee?.id_number || null
        },
        period: item.period
      }));

      return {
        data: transformedData,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

// 获取薪资详情（包含明细项）
export const usePayrollDetails = (payrollId: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollQueryKeys.detail(payrollId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_payroll_unified')
        .select('*')
        .eq('payroll_id', payrollId)
        .not('payroll_item_id', 'is', null)
        .order('category_sort_order', { ascending: true })
        .order('component_name', { ascending: true });

      if (error) {
        handleError(error, { customMessage: '获取薪资详情失败' });
        throw error;
      }
      
      // 统一字段名映射
      return (data || []).map(item => ({
        ...item,
        amount: item.item_amount,
        item_notes: item.item_notes
      }));
    },
    enabled: !!payrollId,
    staleTime: 5 * 60 * 1000,
  });
};

// 获取薪资统计（按参数查询）
export const usePayrollStatisticsByParams = (params: {
  year: number;
  month?: number;
  departmentId?: string;
}) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollQueryKeys.statistics(params),
    queryFn: async () => {
      let query = supabase
        .from('view_department_payroll_statistics')
        .select('*')
        .eq('pay_year', params.year);

      if (params.month) {
        query = query.eq('pay_month', params.month);
      }
      if (params.departmentId) {
        query = query.eq('department_id', params.departmentId);
      }

      const { data, error } = await query
        .order('pay_month', { ascending: false })
        .order('department_name');

      if (error) {
        handleError(error, { customMessage: '获取薪资统计失败' });
        throw error;
      }
      
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10分钟
  });
};

// 获取成本分析
export const useCostAnalysis = (params: {
  startMonth: string;
  endMonth: string;
}) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollQueryKeys.costAnalysis(params),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_payroll_cost_analysis')
        .select('*')
        .gte('pay_month_string', params.startMonth)
        .lte('pay_month_string', params.endMonth)
        .order('pay_year', { ascending: false })
        .order('pay_month', { ascending: false });

      if (error) {
        handleError(error, { customMessage: '获取成本分析失败' });
        throw error;
      }
      
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
};

// 创建薪资记录
export const useCreatePayroll = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (data: PayrollInsert) => {
      const { data: result, error } = await supabase
        .from('payrolls')
        .insert(data)
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: '创建薪资记录失败' });
        throw error;
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollQueryKeys.lists() });
    },
  });
};

// 批量创建薪资记录
export const useCreateBatchPayrolls = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (params: {
      employeeIds: string[];
      periodId: string;
      payDate: string;
    }) => {
      const payrolls: PayrollInsert[] = params.employeeIds.map(employeeId => ({
        employee_id: employeeId,
        period_id: params.periodId,
        pay_date: params.payDate,
        status: PayrollStatus.DRAFT,
        gross_pay: 0,
        total_deductions: 0,
        net_pay: 0
      }));

      const { data, error } = await supabase
        .from('payrolls')
        .insert(payrolls)
        .select();

      if (error) {
        handleError(error, { customMessage: '批量创建薪资记录失败' });
        throw error;
      }
      return data || [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollQueryKeys.lists() });
    },
  });
};

// 更新薪资状态
export const useUpdatePayrollStatus = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ payrollId, status, notes }: {
      payrollId: string;
      status: PayrollStatusType;
      notes?: string;
    }) => {
      const update: PayrollUpdate = {
        status,
        updated_at: new Date().toISOString()
      };

      if (notes) {
        update.notes = notes;
      }

      const { data, error } = await supabase
        .from('payrolls')
        .update(update)
        .eq('id', payrollId)
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: '更新薪资状态失败' });
        throw error;
      }
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: payrollQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: payrollQueryKeys.detail(variables.payrollId) });
    },
  });
};

// 批量更新薪资状态
export const useUpdateBatchPayrollStatus = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ payrollIds, status }: {
      payrollIds: string[];
      status: PayrollStatusType;
    }) => {
      const { data, error } = await supabase
        .from('payrolls')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .in('id', payrollIds)
        .select();

      if (error) {
        handleError(error, { customMessage: '批量更新薪资状态失败' });
        throw error;
      }
      return data || [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollQueryKeys.lists() });
    },
  });
};

// 计算薪资
export const useCalculatePayrolls = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (payrollIds: string[]) => {
      const { data, error } = await supabase.rpc('calculate_payrolls', {
        payroll_ids: payrollIds
      });

      if (error) {
        handleError(error, { customMessage: '计算薪资失败' });
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollQueryKeys.all });
    },
  });
};

// 删除薪资记录
export const useDeletePayroll = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (payrollId: string) => {
      // 先检查状态
      const { data: payroll, error: checkError } = await supabase
        .from('payrolls')
        .select('status')
        .eq('id', payrollId)
        .single();

      if (checkError) {
        handleError(checkError, { customMessage: '检查薪资状态失败' });
        throw checkError;
      }
      
      if (payroll.status !== PayrollStatus.DRAFT) {
        const error = new Error('只能删除草稿状态的薪资记录');
        handleError(error, { customMessage: '删除失败' });
        throw error;
      }

      const { error } = await supabase
        .from('payrolls')
        .delete()
        .eq('id', payrollId);

      if (error) {
        handleError(error, { customMessage: '删除薪资记录失败' });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollQueryKeys.lists() });
    },
  });
};

// 获取员工五险一金信息
export const useEmployeeInsuranceDetails = (payrollId: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollQueryKeys.insurance(payrollId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_calculation_logs')
        .select(`
          id,
          payroll_id,
          employee_id,
          insurance_type_id,
          calculation_date,
          is_applicable,
          contribution_base,
          adjusted_base,
          employee_rate,
          employer_rate,
          employee_amount,
          employer_amount,
          skip_reason,
          insurance_type:insurance_types(
            id,
            system_key,
            name,
            description
          )
        `)
        .eq('payroll_id', payrollId)
        .order('insurance_type_id');

      if (error) {
        handleError(error, { customMessage: '获取员工五险一金信息失败' });
        throw error;
      }
      
      // 处理数据格式，确保数值字段保持正确的小数位数
      const processedData = (data || []).map(item => ({
        ...item,
        contribution_base: formatNumber(item.contribution_base, 2),
        adjusted_base: formatNumber(item.adjusted_base, 2),
        employee_rate: formatNumber(item.employee_rate, 4),
        employer_rate: formatNumber(item.employer_rate, 4),
        employee_amount: formatNumber(item.employee_amount, 2),
        employer_amount: formatNumber(item.employer_amount, 2)
      }));
      
      return processedData;
    },
    enabled: !!payrollId,
    staleTime: 5 * 60 * 1000,
  });
};

// 获取员工当月缴费基数信息
export const useEmployeeMonthlyContributionBases = (
  employeeId: string, 
  yearMonth: string
) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollQueryKeys.contributionBases(employeeId, yearMonth),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_employee_insurance_base_monthly_latest')
        .select(`
          employee_id,
          employee_name,
          id_number,
          employment_status,
          insurance_type_id,
          insurance_type_name,
          insurance_type_key,
          month,
          month_string,
          year,
          month_number,
          contribution_base,
          effective_start_date,
          effective_end_date
        `)
        .eq('employee_id', employeeId)
        .eq('month_string', yearMonth)
        .order('insurance_type_key');

      if (error) {
        handleError(error, { customMessage: '获取员工缴费基数信息失败' });
        throw error;
      }
      
      // 处理数据格式，确保缴费基数保持2位小数
      const processedData = (data || []).map(item => ({
        ...item,
        contribution_base: formatNumber(item.contribution_base, 2)
      }));
      
      return processedData;
    },
    enabled: !!employeeId && !!yearMonth,
    staleTime: 5 * 60 * 1000,
  });
};

// 兼容旧方法名
export const useEmployeeContributionBases = useEmployeeMonthlyContributionBases;

// 获取所有保险类型
export const useInsuranceTypes = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollQueryKeys.insuranceTypes(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_types')
        .select('*')
        .order('system_key');

      if (error) {
        handleError(error, { customMessage: '获取保险类型列表失败' });
        throw error;
      }
      return data || [];
    },
    staleTime: 30 * 60 * 1000, // 30分钟缓存
  });
};

/**
 * Payroll Hook 配置选项
 */
interface UsePayrollOptions {
  enableRealtime?: boolean;
  filters?: {
    status?: PayrollStatusType;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  };
}

/**
 * 主 Payroll Hook - 提供统一的薪资管理功能
 */
export function usePayroll(options: UsePayrollOptions = {}) {
  const {
    enableRealtime = true,
    filters
  } = options;

  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);

  // 使用各个子Hook
  const payrollsQuery = usePayrolls(filters);
  const latestPeriodQuery = useLatestPayrollPeriod();
  const createPayrollMutation = useCreatePayroll();
  const createBatchPayrollsMutation = useCreateBatchPayrolls();
  const updateStatusMutation = useUpdatePayrollStatus();
  const updateBatchStatusMutation = useUpdateBatchPayrollStatus();
  const calculatePayrollsMutation = useCalculatePayrolls();
  const deletePayrollMutation = useDeletePayroll();

  // 设置实时订阅
  useEffect(() => {
    if (!enableRealtime) return;

    console.log('[Payroll] Setting up realtime subscriptions');

    // 订阅薪资表变更
    const payrollChannel = supabase
      .channel('payroll-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payrolls' },
        (payload) => {
          console.log('[Payroll] Payroll change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: payrollQueryKeys.all });
        }
      );

    // 订阅薪资项目变更
    const payrollItemChannel = supabase
      .channel('payroll-item-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payroll_items' },
        (payload) => {
          console.log('[Payroll] Payroll item change detected:', payload.eventType);
          // 刷新相关的薪资详情
          if (payload.new && 'payroll_id' in payload.new) {
            queryClient.invalidateQueries({ 
              queryKey: payrollQueryKeys.detail(payload.new.payroll_id as string) 
            });
          }
        }
      );

    // 订阅保险计算日志变更
    const insuranceChannel = supabase
      .channel('insurance-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'insurance_calculation_logs' },
        (payload) => {
          console.log('[Payroll] Insurance calculation change detected:', payload.eventType);
          if (payload.new && 'payroll_id' in payload.new) {
            queryClient.invalidateQueries({ 
              queryKey: payrollQueryKeys.insurance(payload.new.payroll_id as string) 
            });
          }
        }
      );

    // 启动订阅
    Promise.all([
      payrollChannel.subscribe(),
      payrollItemChannel.subscribe(),
      insuranceChannel.subscribe(),
    ]).then(() => {
      console.log('[Payroll] Realtime subscriptions active');
    });

    // 清理函数
    return () => {
      console.log('[Payroll] Cleaning up realtime subscriptions');
      payrollChannel.unsubscribe();
      payrollItemChannel.unsubscribe();
      insuranceChannel.unsubscribe();
    };
  }, [enableRealtime, queryClient]);

  // 刷新所有数据
  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: payrollQueryKeys.all });
  };

  return {
    // 查询数据
    payrolls: payrollsQuery.data,
    latestPeriod: latestPeriodQuery.data,
    
    // 加载状态
    loading: {
      isLoading: payrollsQuery.isLoading || latestPeriodQuery.isLoading,
      isLoadingPayrolls: payrollsQuery.isLoading,
      isLoadingLatestPeriod: latestPeriodQuery.isLoading,
    },

    // 错误状态
    error: payrollsQuery.error || latestPeriodQuery.error,
    errors: {
      payrollsError: payrollsQuery.error,
      latestPeriodError: latestPeriodQuery.error,
    },

    // Mutations
    mutations: {
      createPayroll: createPayrollMutation,
      createBatchPayrolls: createBatchPayrollsMutation,
      updateStatus: updateStatusMutation,
      updateBatchStatus: updateBatchStatusMutation,
      calculatePayrolls: calculatePayrollsMutation,
      deletePayroll: deletePayrollMutation,
    },

    // 操作
    actions: {
      refresh: refreshAll,
      refreshPayrolls: payrollsQuery.refetch,
      refreshLatestPeriod: latestPeriodQuery.refetch,
    },

    // 常量
    PayrollStatus,
  };
}

/**
 * 格式化工具函数
 */
export const payrollFormatters = {
  // 格式化货币
  currency: (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  },

  // 格式化薪资状态
  status: (status: PayrollStatusType) => {
    const statusMap = {
      [PayrollStatus.DRAFT]: '草稿',
      [PayrollStatus.CALCULATING]: '计算中',
      [PayrollStatus.CALCULATED]: '已计算',
      [PayrollStatus.APPROVED]: '已审批',
      [PayrollStatus.PAID]: '已发放',
      [PayrollStatus.CANCELLED]: '已取消',
    };
    return statusMap[status] || status;
  },

  // 格式化日期为月份
  monthString: (dateStr: string) => {
    if (!dateStr) return '-';
    const [year, month] = dateStr.substring(0, 7).split('-');
    return `${year}年${parseInt(month)}月`;
  },

  // 格式化日期
  date: (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    } catch {
      return '-';
    }
  },

  // 格式化百分比
  percentage: (value: number, decimals: number = 2) => {
    return `${(value * 100).toFixed(decimals)}%`;
  },

  // 格式化数字（带千分位）
  number: (value: number) => {
    return new Intl.NumberFormat('zh-CN').format(value);
  },
};