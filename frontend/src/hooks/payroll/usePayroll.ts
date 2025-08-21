import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { Database } from '@/types/supabase';

// 类型定义
type Payroll = Database['public']['Tables']['payrolls']['Row'];
type PayrollInsert = Database['public']['Tables']['payrolls']['Insert'];
type PayrollUpdate = Database['public']['Tables']['payrolls']['Update'];

// 薪资状态枚举 - 与数据库枚举保持一致
export const PayrollStatus = {
  DRAFT: 'draft',
  CALCULATING: 'calculating',
  CALCULATED: 'calculated',
  APPROVED: 'approved',
  PAID: 'paid',
  CANCELLED: 'cancelled'
} as const;

export type PayrollStatusType = typeof PayrollStatus[keyof typeof PayrollStatus];

// 查询过滤条件
export interface PayrollFilters {
  status?: PayrollStatusType;
  employeeId?: string;
  periodId?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// 薪资汇总视图类型
export interface PayrollSummary {
  payroll_id: string;
  employee_id: string;
  employee_name: string;
  department_name?: string;
  position_name?: string;
  category_name?: string;  // 新增身份类别字段
  pay_date: string;  // 从 actual_pay_date 或 scheduled_pay_date 映射
  actual_pay_date?: string;  // 实际发薪日期
  scheduled_pay_date?: string;  // 计划发薪日期
  pay_period_start?: string;  // 从period表获取，可选
  pay_period_end?: string;    // 从period表获取，可选
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: PayrollStatusType;
  period_id?: string;
  created_at: string;
  updated_at: string;
}

// 薪资详情视图类型
export interface PayrollDetail {
  payroll_id: string;
  payroll_item_id?: string;
  employee_id: string;
  employee_name: string;
  component_id?: string;
  component_name?: string;
  component_type?: string;
  category_name?: string;
  item_amount?: number;
  item_notes?: string;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: PayrollStatusType;
}

// 批量操作结果
export interface BatchOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

// 查询键管理
export const payrollQueryKeys = {
  all: ['payrolls'] as const,
  lists: () => [...payrollQueryKeys.all, 'list'] as const,
  list: (filters?: PayrollFilters) => [...payrollQueryKeys.lists(), filters] as const,
  detail: (id: string) => [...payrollQueryKeys.all, 'detail', id] as const,
  items: (payrollId: string) => [...payrollQueryKeys.all, 'items', payrollId] as const,
  statistics: (periodId?: string) => [...payrollQueryKeys.all, 'statistics', periodId] as const,
  insurance: (payrollId: string) => [...payrollQueryKeys.all, 'insurance', payrollId] as const,
  latestMonth: () => [...payrollQueryKeys.all, 'latest-month'] as const,
  insuranceTypes: () => [...payrollQueryKeys.all, 'insurance-types'] as const,
  costAnalysis: (params?: any) => [...payrollQueryKeys.all, 'cost-analysis', params] as const,
  contributionBases: (employeeId?: string, yearMonth?: string) => [...payrollQueryKeys.all, 'contribution-bases', employeeId, yearMonth] as const,
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
    queryFn: async (): Promise<{ id: string; period_id: string; period_name: string; year?: number; month?: number } | null> => {
      // 直接从 payroll_periods 表获取有薪资记录的最新周期
      const { data: payrollData, error: payrollError } = await supabase
        .from('payrolls')
        .select('period_id')
        .not('period_id', 'is', null);

      if (payrollError) {
        handleError(payrollError, { customMessage: '获取薪资记录失败' });
        throw payrollError;
      }

      if (!payrollData || payrollData.length === 0) {
        return null;
      }

      // 获取唯一的周期ID列表
      const periodIds = [...new Set(payrollData.map(p => p.period_id))];

      // 获取这些周期的详细信息
      const { data: periodData, error: periodError } = await supabase
        .from('payroll_periods')
        .select('id, period_name, period_year, period_month')
        .in('id', periodIds.filter(id => id !== null) as string[])
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(1);

      if (periodError) {
        handleError(periodError, { customMessage: '获取周期信息失败' });
        throw periodError;
      }
      
      if (periodData && periodData.length > 0) {
        const period = periodData[0];
        return {
          id: period.id,  // 添加 id 字段
          period_id: period.id,  // 保留兼容性
          period_name: period.period_name,
          year: period.period_year,
          month: period.period_month
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

      // 使用 view_payroll_summary 视图，已包含所有需要的字段
      let query = supabase
        .from('view_payroll_summary')
        .select('*', { count: 'exact' });

      // 搜索条件 - 支持多字段搜索
      if (searchTerm) {
        // 使用 or 条件进行多字段搜索
        query = query.or([
          `employee_name.ilike.%${searchTerm}%`,
          `department_name.ilike.%${searchTerm}%`,
          `position_name.ilike.%${searchTerm}%`,
          `id_number.ilike.%${searchTerm}%`
        ].join(','));
      }

      // 过滤条件
      if (filters?.status) {
        query = query.eq('payroll_status', filters.status);
      }
      if (filters?.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters?.periodId) {
        // 直接使用 period_id 过滤（视图现在包含此字段）
        query = query.eq('period_id', filters.periodId);
      }
      
      // 按年月过滤 - 使用 period_code 字段（格式：'2025-01'）
      if (filters?.periodYear && filters?.periodMonth) {
        const periodCode = `${filters.periodYear}-${String(filters.periodMonth).padStart(2, '0')}`;
        query = query.eq('period_code', periodCode);
      } else if (filters?.periodYear) {
        // 只按年过滤
        query = query.like('period_code', `${filters.periodYear}-%`);
      }

      // 排序 - 按创建时间降序
      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        handleError(error, { customMessage: '获取薪资列表失败' });
        throw error;
      }

      // 转换数据格式以兼容现有代码
      const transformedData = (data || []).map((item: any) => ({
        // 主要字段
        id: item.payroll_id,
        payroll_id: item.payroll_id,
        pay_date: item.actual_pay_date || item.scheduled_pay_date,
        actual_pay_date: item.actual_pay_date,
        scheduled_pay_date: item.scheduled_pay_date,
        
        // 员工信息
        employee_id: item.employee_id,
        employee_name: item.employee_name,
        department_name: item.department_name,
        position_name: item.position_name,
        category_name: item.category_name, // 添加身份类别字段
        
        // 周期信息
        period_id: item.period_id,  // 现在视图直接提供此字段
        period_code: item.period_code,
        period_name: item.period_name,
        pay_period_start: item.period_start,
        pay_period_end: item.period_end,
        
        // 金额信息
        gross_pay: formatNumber(item.gross_pay),
        total_deductions: formatNumber(item.total_deductions),
        net_pay: formatNumber(item.net_pay),
        
        // 状态
        payroll_status: item.payroll_status,
        status: item.payroll_status, // 兼容旧字段名
        
        // 兼容旧结构
        employee: {
          id: item.employee_id,
          employee_name: item.employee_name,
          id_number: item.id_number
        }
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
        .not('item_id', 'is', null);

      if (error) {
        handleError(error, { customMessage: '获取薪资详情失败' });
        throw error;
      }
      
      // 客户端排序 - 视图中没有 category_sort_order 字段，使用 category 进行排序
      const sortedData = (data || []).sort((a, b) => {
        // 先按类别排序
        const categoryOrder = (a.category || '').localeCompare(b.category || '');
        if (categoryOrder !== 0) return categoryOrder;
        
        // 再按组件名称排序
        return (a.component_name || '').localeCompare(b.component_name || '');
      });
      
      // 统一字段名映射（视图字段已经是 amount 和 item_notes）
      return sortedData;
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
    queryKey: payrollQueryKeys.statistics(JSON.stringify(params)),
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
        .from('view_payroll_trend_unified' as any)
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
      // 先获取薪资记录的基本信息，包括员工ID和周期ID
      const { data: payrollInfo, error: payrollError } = await supabase
        .from('payrolls')
        .select('employee_id, period_id')
        .eq('id', payrollId)
        .single();
      
      if (payrollError) {
        handleError(payrollError, { customMessage: '获取薪资信息失败' });
        throw payrollError;
      }
      
      if (!payrollInfo || !payrollInfo.employee_id || !payrollInfo.period_id) {
        return [];
      }
      
      // 使用现有的 hook 获取缴费基数和费率信息
      // 注意：这里我们需要导入并使用 useEmployeeContributionBasesByPeriod
      // 但由于这是在 queryFn 内部，我们需要直接调用相关的查询逻辑
      
      // 1. 先获取所有激活的保险类型
      const { data: insuranceTypes, error: typesError } = await supabase
        .from('insurance_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (typesError) {
        handleError(typesError, { customMessage: '获取保险类型失败' });
        throw typesError;
      }

      // 2. 获取薪资明细中的五险一金数据（现在包含 insurance_type_key 和 is_employer_contribution）
      const { data: payrollItems, error } = await supabase
        .from('view_payroll_unified')
        .select('*')
        .eq('payroll_id', payrollId)
        .in('category', ['personal_insurance', 'employer_insurance'])
        .order('component_name');

      if (error) {
        handleError(error, { customMessage: '获取员工五险一金信息失败' });
        throw error;
      }
      
      // 3. 构建保险数据，基于保险类型而不是基于薪资项目
      const insuranceData = (insuranceTypes || []).map(insuranceType => {
        // 初始化每个保险类型的记录
        const record = {
          id: `${payrollId}-${insuranceType.id}`,
          payroll_id: payrollId,
          employee_id: payrollInfo.employee_id,
          insurance_type_id: insuranceType.id,
          calculation_date: new Date().toISOString(),
          is_applicable: false,
          contribution_base: 0,
          adjusted_base: 0,
          employee_rate: 0,
          employer_rate: 0,
          employee_amount: 0,
          employer_amount: 0,
          skip_reason: null,
          insurance_type: {
            id: insuranceType.id,
            system_key: insuranceType.system_key,
            name: insuranceType.name,
            description: insuranceType.description || insuranceType.name
          }
        };

        // 查找该保险类型对应的薪资项目
        // 使用结构化数据精确匹配，不再依赖字符串匹配
        const employeeItem = (payrollItems || []).find(item => {
          // 使用视图提供的 insurance_type_key 和 is_employer_contribution 字段
          return item.insurance_type_key === insuranceType.system_key && 
                 item.is_employer_contribution === false;
        });

        const employerItem = (payrollItems || []).find(item => {
          // 使用视图提供的 insurance_type_key 和 is_employer_contribution 字段
          return item.insurance_type_key === insuranceType.system_key && 
                 item.is_employer_contribution === true;
        });

        // 设置金额
        if (employeeItem) {
          record.employee_amount = employeeItem.amount || 0;
          record.is_applicable = true;
        }
        if (employerItem) {
          record.employer_amount = employerItem.amount || 0;
          record.is_applicable = true;
        }

        // 如果没有任何金额，标记为不适用
        if (record.employee_amount === 0 && record.employer_amount === 0) {
          record.is_applicable = false;
          record.skip_reason = null;
        }

        return record;
      });
      
      return insuranceData;
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
        .from('view_employee_contribution_bases_by_period')
        .select(`
          employee_id,
          employee_name,
          id_number,
          employment_status,
          insurance_type_id,
          insurance_type_name,
          insurance_type_key,
          latest_contribution_base,
          employee_rate,
          employer_rate,
          base_floor,
          base_ceiling,
          base_period_display,
          base_period_year,
          base_period_month,
          base_last_updated
        `)
        .eq('employee_id', employeeId)
        .order('insurance_type_key');

      if (error) {
        handleError(error, { customMessage: '获取员工缴费基数信息失败' });
        throw error;
      }
      
      // 处理数据格式，映射字段名并确保缴费基数保持2位小数
      const processedData = (data || []).map(item => ({
        employee_id: item.employee_id,
        employee_name: item.employee_name,
        id_number: item.id_number,
        employment_status: item.employment_status,
        insurance_type_id: item.insurance_type_id,
        insurance_type_name: item.insurance_type_name,
        insurance_type_key: item.insurance_type_key,
        month_string: item.base_period_display,
        year: item.base_period_year,
        month_number: item.base_period_month,
        contribution_base: formatNumber(item.latest_contribution_base, 2),
        effective_start_date: item.base_last_updated,
        effective_end_date: null
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
    periodId?: string;
    periodYear?: number;
    periodMonth?: number;
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

    // 订阅薪资项目变更（包括保险项目）
    const insuranceChannel = supabase
      .channel('insurance-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payroll_items' },
        (payload) => {
          console.log('[Payroll] Payroll item (insurance) change detected:', payload.eventType);
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
  monthString: (input: string | { period_name?: string; year?: number; month?: number } | null) => {
    if (!input) return '-';
    
    // 如果是对象类型（来自 useLatestPayrollPeriod）
    if (typeof input === 'object') {
      if (input.period_name) {
        return input.period_name;
      }
      if (input.year && input.month) {
        return `${input.year}年${input.month}月`;
      }
      return '-';
    }
    
    // 如果是字符串类型
    if (typeof input === 'string') {
      const [year, month] = input.substring(0, 7).split('-');
      return `${year}年${parseInt(month)}月`;
    }
    
    return '-';
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