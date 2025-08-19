import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { Database } from '@/types/supabase';

// 类型定义
type EmployeeContributionBase = Database['public']['Tables']['employee_contribution_bases']['Row'];
type EmployeeContributionBaseInsert = Database['public']['Tables']['employee_contribution_bases']['Insert'];
type EmployeeContributionBaseUpdate = Database['public']['Tables']['employee_contribution_bases']['Update'];
type InsuranceType = Database['public']['Tables']['insurance_types']['Row'];

// 基数复制策略枚举
export const BaseStrategy = {
  COPY: 'copy',
  NEW: 'new'
} as const;

export type BaseStrategyType = typeof BaseStrategy[keyof typeof BaseStrategy];

// 基数调整配置
export interface BaseAdjustmentConfig {
  employeeId: string;
  insuranceTypeId: string;
  newBase: number;
  periodId?: string; // 关联的薪资周期ID
}

// 员工基数数据
export interface EmployeeBaseData {
  employee_id: string;
  employee_name: string;
  insurance_type_id: string;
  insurance_type_name: string;
  current_base: number;
  last_updated: string;
  period_id?: string; // 关联的薪资周期ID
}

/**
 * 获取员工当前基数信息
 */
export function useCurrentBases(employeeIds: string[], yearMonth?: string) {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['insurance-bases', 'current', employeeIds, yearMonth],
    queryFn: async () => {
      if (employeeIds.length === 0) return [];

      // 使用视图获取员工最新的缴费基数信息
      let query = supabase
        .from('view_employee_contribution_bases_by_period')
        .select('*')
        .in('employee_id', employeeIds);

      const { data, error } = await query;

      if (error) {
        handleError(error, { customMessage: '获取员工基数信息失败' });
        throw error;
      }

      // 转换数据格式
      return (data || []).map((item: any) => ({
        employee_id: item.employee_id,
        employee_name: item.employee_name,
        insurance_type_id: item.insurance_type_id,
        insurance_type_name: item.insurance_type_name,
        current_base: item.base_amount || 0,
        last_updated: item.effective_date || new Date().toISOString()
      })) as EmployeeBaseData[];
    },
    enabled: employeeIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    refetchOnWindowFocus: false,
  });
}

/**
 * 获取保险类型列表
 */
export function useInsuranceTypes() {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['insurance-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_types')
        .select('*')
        .eq('is_active', true)
        .order('system_key');

      if (error) {
        handleError(error, { customMessage: '获取保险类型失败' });
        throw error;
      }

      return data || [];
    },
    staleTime: 30 * 60 * 1000, // 30分钟缓存
    refetchOnWindowFocus: false,
  });
}

/**
 * 获取员工基数历史记录
 */
export function useEmployeeBaseHistory(employeeId: string, insuranceTypeId?: string) {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['insurance-bases', 'history', employeeId, insuranceTypeId],
    queryFn: async () => {
      let query = supabase
        .from('employee_contribution_bases')
        .select(`
          *,
          insurance_type:insurance_types(
            id,
            name,
            system_key
          )
        `)
        .eq('employee_id', employeeId)
        .order('effective_date', { ascending: false });

      if (insuranceTypeId) {
        query = query.eq('insurance_type_id', insuranceTypeId);
      }

      const { data, error } = await query;

      if (error) {
        handleError(error, { customMessage: '获取基数历史记录失败' });
        throw error;
      }

      return data || [];
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 更新员工缴费基数
 */
export function useUpdateEmployeeBase() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (config: BaseAdjustmentConfig) => {
      const insertData: EmployeeContributionBaseInsert = {
        employee_id: config.employeeId,
        insurance_type_id: config.insuranceTypeId,
        contribution_base: config.newBase,
        period_id: config.periodId || null, // 关联的薪资周期ID
      };

      const { data, error } = await supabase
        .from('employee_contribution_bases')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: '更新缴费基数失败' });
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: ['insurance-bases'] });
      queryClient.invalidateQueries({ 
        queryKey: ['insurance-bases', 'current', [data.employee_id]] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['insurance-bases', 'history', data.employee_id] 
      });
    },
  });
}

/**
 * 批量更新员工缴费基数
 */
export function useBatchUpdateEmployeeBases() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (configs: BaseAdjustmentConfig[]) => {
      const insertData: EmployeeContributionBaseInsert[] = configs.map(config => ({
        employee_id: config.employeeId,
        insurance_type_id: config.insuranceTypeId,
        contribution_base: config.newBase,
        period_id: config.periodId || null,
      }));

      const { data, error } = await supabase
        .from('employee_contribution_bases')
        .insert(insertData)
        .select();

      if (error) {
        handleError(error, { customMessage: '批量更新缴费基数失败' });
        throw error;
      }

      return data || [];
    },
    onSuccess: () => {
      // 刷新所有相关查询
      queryClient.invalidateQueries({ queryKey: ['insurance-bases'] });
    },
  });
}

/**
 * 获取部门员工基数统计
 */
export function useDepartmentBaseStatistics(departmentId?: string, yearMonth?: string) {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['insurance-bases', 'department-stats', departmentId, yearMonth],
    queryFn: async () => {
      // 这里可以使用一个专门的视图或者复杂查询来获取部门基数统计
      // 暂时返回空数组，需要根据实际需求实现
      return [];
    },
    enabled: !!departmentId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * 复制上月基数
 */
export function useCopyPreviousMonthBases() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (params: {
      employeeIds: string[];
      targetMonth: string;
      strategy: BaseStrategyType;
    }) => {
      // 这里需要实现复制逻辑
      // 可能需要创建一个 RPC 函数来处理复杂的复制逻辑
      const { data, error } = await (supabase as any).rpc('copy_previous_month_bases', {
        employee_ids: params.employeeIds,
        target_month: params.targetMonth,
        copy_strategy: params.strategy
      });

      if (error) {
        handleError(error, { customMessage: '复制上月基数失败' });
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-bases'] });
    },
  });
}