import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { Database } from '@/types/supabase';

// 类型定义
type InsuranceType = Database['public']['Tables']['insurance_types']['Row'];
type InsuranceTypeInsert = Database['public']['Tables']['insurance_types']['Insert'];
type InsuranceTypeUpdate = Database['public']['Tables']['insurance_types']['Update'];

type EmployeeContributionBase = Database['public']['Tables']['employee_contribution_bases']['Row'];
type EmployeeContributionBaseInsert = Database['public']['Tables']['employee_contribution_bases']['Insert'];
type EmployeeContributionBaseUpdate = Database['public']['Tables']['employee_contribution_bases']['Update'];

type SocialInsurancePolicy = Database['public']['Tables']['social_insurance_policies']['Row'];
type SocialInsurancePolicyInsert = Database['public']['Tables']['social_insurance_policies']['Insert'];
type SocialInsurancePolicyUpdate = Database['public']['Tables']['social_insurance_policies']['Update'];

// Note: insurance_calculation_logs table doesn't exist in v3 database
// type InsuranceCalculationLog = Database['public']['Tables']['insurance_calculation_logs']['Row'];

// 查询键常量
const INSURANCE_KEYS = {
  all: ['insurance'] as const,
  types: () => [...INSURANCE_KEYS.all, 'types'] as const,
  type: (id: string) => [...INSURANCE_KEYS.types(), id] as const,
  
  bases: () => [...INSURANCE_KEYS.all, 'bases'] as const,
  basesList: (filters?: any) => [...INSURANCE_KEYS.bases(), 'list', filters] as const,
  monthlyBases: (params: any) => [...INSURANCE_KEYS.bases(), 'monthly', params] as const,
  baseSummary: (yearMonth: string) => [...INSURANCE_KEYS.bases(), 'summary', yearMonth] as const,
  
  policies: () => [...INSURANCE_KEYS.all, 'policies'] as const,
  policiesList: (filters?: any) => [...INSURANCE_KEYS.policies(), 'list', filters] as const,
  policy: (id: string) => [...INSURANCE_KEYS.policies(), id] as const,
  
  applicablePolicies: (employeeId: string, date: string) => 
    [...INSURANCE_KEYS.all, 'applicable', employeeId, date] as const,
  calculationLogs: (filters?: any) => [...INSURANCE_KEYS.all, 'logs', filters] as const,
};

// ==================== 保险类型相关 ====================

/**
 * 获取保险类型列表
 */
export const useInsuranceTypes = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: INSURANCE_KEYS.types(),
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
    staleTime: 30 * 60 * 1000, // 30分钟
  });
};

/**
 * 获取单个保险类型
 */
export const useInsuranceType = (id: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: INSURANCE_KEYS.type(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_types')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        handleError(error, { customMessage: '获取保险类型详情失败' });
        throw error;
      }

      return data;
    },
    enabled: !!id,
  });
};

/**
 * 创建保险类型
 */
export const useCreateInsuranceType = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (data: InsuranceTypeInsert) => {
      const { data: result, error } = await supabase
        .from('insurance_types')
        .insert(data)
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: '创建保险类型失败' });
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.types() });
    },
  });
};

/**
 * 更新保险类型
 */
export const useUpdateInsuranceType = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsuranceTypeUpdate }) => {
      const { data: result, error } = await supabase
        .from('insurance_types')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: '更新保险类型失败' });
        throw error;
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.types() });
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.type(variables.id) });
    },
  });
};

// ==================== 缴费基数相关 ====================

/**
 * 获取员工缴费基数列表
 */
export const useEmployeeContributionBases = (filters?: {
  employeeId?: string;
  insuranceTypeId?: string;
  periodId?: string;
}) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: INSURANCE_KEYS.basesList(filters),
    queryFn: async () => {
      let query = supabase
        .from('employee_contribution_bases')
        .select(`
          *,
          insurance_type:insurance_types(
            id,
            name,
            system_key,
            description
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters?.insuranceTypeId) {
        query = query.eq('insurance_type_id', filters.insuranceTypeId);
      }
      if (filters?.periodId) {
        query = query.eq('period_id', filters.periodId);
      }

      const { data, error } = await query;

      if (error) {
        handleError(error, { customMessage: '获取员工缴费基数失败' });
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 获取月度缴费基数
 */
export const useMonthlyInsuranceBases = (params: {
  employeeIds?: string[];
  yearMonth?: string;
}) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: INSURANCE_KEYS.monthlyBases(params),
    queryFn: async () => {
      let query = supabase.from('view_employee_insurance_base_monthly_latest').select('*');

      if (params.employeeIds && params.employeeIds.length > 0) {
        query = query.in('employee_id', params.employeeIds);
      }

      if (params.yearMonth) {
        query = query.eq('year_month', params.yearMonth);
      }

      const { data, error } = await query;

      if (error) {
        handleError(error, { customMessage: '获取月度缴费基数失败' });
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 获取缴费基数汇总
 */
export const useInsuranceBaseSummary = (yearMonth: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: INSURANCE_KEYS.baseSummary(yearMonth),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_employee_insurance_base_monthly_latest')
        .select('*')
        .eq('year_month', yearMonth);

      if (error) {
        handleError(error, { customMessage: '获取缴费基数汇总失败' });
        throw error;
      }

      return data || [];
    },
    enabled: !!yearMonth,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * 创建缴费基数
 */
export const useCreateContributionBase = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (data: EmployeeContributionBaseInsert) => {
      const { data: result, error } = await supabase
        .from('employee_contribution_bases')
        .insert(data)
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: '创建缴费基数失败' });
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.bases() });
    },
  });
};

/**
 * 批量创建缴费基数
 */
export const useCreateBatchContributionBases = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ employeeIds, baseData }: {
      employeeIds: string[];
      baseData: Omit<EmployeeContributionBaseInsert, 'employee_id'>;
    }) => {
      const insertData = employeeIds.map(employeeId => ({
        ...baseData,
        employee_id: employeeId
      }));

      const { data, error } = await supabase
        .from('employee_contribution_bases')
        .insert(insertData)
        .select();

      if (error) {
        handleError(error, { customMessage: '批量创建缴费基数失败' });
        throw error;
      }

      return data || [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.bases() });
    },
  });
};

/**
 * 更新缴费基数
 */
export const useUpdateContributionBase = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EmployeeContributionBaseUpdate }) => {
      const { data: result, error } = await supabase
        .from('employee_contribution_bases')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: '更新缴费基数失败' });
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.bases() });
    },
  });
};

/**
 * 结束缴费基数（软删除或设置结束日期）
 */
export const useEndContributionBase = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ id, endDate }: { id: string; endDate: string }) => {
      // 这里需要根据实际业务逻辑来实现
      // 可能是软删除，也可能是设置结束日期字段
      // 暂时使用删除操作，实际应该根据表结构调整
      const { error } = await supabase
        .from('employee_contribution_bases')
        .delete()
        .eq('id', id);

      if (error) {
        handleError(error, { customMessage: '结束缴费基数失败' });
        throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.bases() });
    },
  });
};

// ==================== 社保政策相关 ====================

/**
 * 获取社保政策列表
 */
export const useSocialInsurancePolicies = (filters?: {
  insuranceTypeId?: string;
  isActive?: boolean;
}) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: INSURANCE_KEYS.policiesList(filters),
    queryFn: async () => {
      let query = supabase
        .from('social_insurance_policies')
        .select(`
          *,
          applicable_categories:social_insurance_policy_applicable_categories(
            employee_category_id
          )
        `)
        .order('effective_start_date', { ascending: false });

      // 过滤活跃状态（根据有效期判断）
      if (filters?.isActive !== undefined) {
        const now = new Date().toISOString();
        if (filters.isActive) {
          query = query
            .lte('effective_start_date', now)
            .or(`effective_end_date.is.null,effective_end_date.gte.${now}`);
        } else {
          query = query.lt('effective_end_date', now);
        }
      }

      const { data, error } = await query;

      if (error) {
        handleError(error, { customMessage: '获取社保政策列表失败' });
        throw error;
      }

      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * 获取单个社保政策
 */
export const useSocialInsurancePolicy = (id: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: INSURANCE_KEYS.policy(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_insurance_policies')
        .select(`
          *,
          applicable_categories:social_insurance_policy_applicable_categories(
            employee_category_id
          ),
          policy_rules:policy_rules(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        handleError(error, { customMessage: '获取社保政策详情失败' });
        throw error;
      }

      return data;
    },
    enabled: !!id,
  });
};

/**
 * 创建社保政策
 */
export const useCreateSocialInsurancePolicy = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ data, applicableCategoryIds }: {
      data: SocialInsurancePolicyInsert;
      applicableCategoryIds?: string[];
    }) => {
      const { data: policy, error } = await supabase
        .from('social_insurance_policies')
        .insert(data)
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: '创建社保政策失败' });
        throw error;
      }

      // 如果有适用类别，插入关联记录
      if (applicableCategoryIds && applicableCategoryIds.length > 0) {
        const categoryData = applicableCategoryIds.map(categoryId => ({
          policy_id: policy.id,
          employee_category_id: categoryId
        }));

        const { error: categoryError } = await supabase
          .from('social_insurance_policy_applicable_categories')
          .insert(categoryData);

        if (categoryError) {
          handleError(categoryError, { customMessage: '创建政策适用类别失败' });
          throw categoryError;
        }
      }

      return policy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.policies() });
    },
  });
};

/**
 * 更新社保政策
 */
export const useUpdateSocialInsurancePolicy = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ id, data, applicableCategoryIds }: {
      id: string;
      data: SocialInsurancePolicyUpdate;
      applicableCategoryIds?: string[];
    }) => {
      const { data: policy, error } = await supabase
        .from('social_insurance_policies')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: '更新社保政策失败' });
        throw error;
      }

      // 如果提供了适用类别，更新关联记录
      if (applicableCategoryIds !== undefined) {
        // 先删除现有关联
        await supabase
          .from('social_insurance_policy_applicable_categories')
          .delete()
          .eq('policy_id', id);

        // 插入新关联
        if (applicableCategoryIds.length > 0) {
          const categoryData = applicableCategoryIds.map(categoryId => ({
            policy_id: id,
            employee_category_id: categoryId
          }));

          const { error: categoryError } = await supabase
            .from('social_insurance_policy_applicable_categories')
            .insert(categoryData);

          if (categoryError) {
            handleError(categoryError, { customMessage: '更新政策适用类别失败' });
            throw categoryError;
          }
        }
      }

      return policy;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.policies() });
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.policy(variables.id) });
    },
  });
};

/**
 * 切换政策状态（通过设置结束日期）
 */
export const useTogglePolicyStatus = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const updateData: SocialInsurancePolicyUpdate = {
        effective_end_date: isActive ? null : new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('social_insurance_policies')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: '切换政策状态失败' });
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.policies() });
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.policy(variables.id) });
    },
  });
};

// ==================== 计算相关 ====================

/**
 * 获取员工适用的保险政策
 */
export const useApplicablePolicies = (employeeId: string, effectiveDate: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: INSURANCE_KEYS.applicablePolicies(employeeId, effectiveDate),
    queryFn: async () => {
      // 这里需要复杂的业务逻辑来确定适用的政策
      // 可能需要创建一个数据库函数或视图来处理
      // 暂时返回空数组，需要根据实际业务需求实现
      const { data, error } = await (supabase as any).rpc('get_applicable_policies', {
        p_employee_id: employeeId,
        p_effective_date: effectiveDate
      });

      if (error) {
        // 如果函数不存在，返回空数组而不抛出错误
        console.warn('get_applicable_policies function not found, returning empty array');
        return [];
      }

      return data || [];
    },
    enabled: !!employeeId && !!effectiveDate,
  });
};

/**
 * 获取保险计算日志
 */
export const useInsuranceCalculationLogs = (filters?: {
  employeeId?: string;
  payrollId?: string;
  yearMonth?: string;
}) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: INSURANCE_KEYS.calculationLogs(filters),
    queryFn: async () => {
      // Note: insurance_calculation_logs table doesn't exist in v3, 
      // using insurance_types as a fallback
      let query = supabase
        .from('insurance_types')
        .select(`
          id,
          name,
          system_key,
          description,
          is_active,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      // Note: Since we're using insurance_types instead of calculation logs,
      // employee and payroll filters don't apply
      if (filters?.yearMonth) {
        // Filter by year-month using created_at
        query = query.like('created_at', `${filters.yearMonth}%`);
      }

      const { data, error } = await query;

      if (error) {
        handleError(error, { customMessage: '获取保险计算日志失败' });
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};