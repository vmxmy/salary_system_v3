import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { Database } from '@/types/supabase';

// 类型定义
type PersonnelCategory = Database['public']['Tables']['employee_categories']['Row'];
type EmployeeCategoryAssignment = Database['public']['Tables']['employee_category_assignments']['Row'];

// 查询键管理
export const employeeCategoryQueryKeys = {
  all: ['employee-categories'] as const,
  categories: () => [...employeeCategoryQueryKeys.all, 'list'] as const,
  employeeCategory: (employeeId: string) => 
    [...employeeCategoryQueryKeys.all, 'employee', employeeId] as const,
  employeeHistory: (employeeId: string) => 
    [...employeeCategoryQueryKeys.all, 'history', employeeId] as const,
  categoryRules: (categoryId: string) => 
    [...employeeCategoryQueryKeys.all, 'rules', categoryId] as const,
};

// 员工类别接口
export interface EmployeeCategory {
  id: string;
  employee_id: string;
  category_id: string;
  category_name: string;
  category_code?: string;
  effective_date: string; // 兼容性保留
  end_date?: string | null; // 兼容性保留
  period_id?: string; // 新增周期ID
  period_name?: string; // 周期名称
  is_active: boolean;
  // 类别相关的薪资规则
  salary_rules?: {
    has_social_insurance: boolean;
    has_housing_fund: boolean;
    tax_calculation_method: 'standard' | 'simplified' | 'exempt';
    overtime_rate_multiplier: number;
    probation_salary_ratio?: number;
  };
}

// 类别规则接口
interface CategoryRules {
  category_id: string;
  has_social_insurance: boolean;
  has_housing_fund: boolean;
  tax_calculation_method: 'standard' | 'simplified' | 'exempt';
  overtime_rate_multiplier: number;
  probation_salary_ratio?: number;
  min_salary?: number;
  max_salary?: number;
  allowances?: Array<{
    type: string;
    amount: number;
    is_taxable: boolean;
  }>;
}

// 获取所有人员类别
export const useEmployeeCategories = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: employeeCategoryQueryKeys.categories(),
    queryFn: async (): Promise<PersonnelCategory[]> => {
      const { data, error } = await supabase
        .from('employee_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        handleError(error, { customMessage: '获取人员类别失败' });
        throw error;
      }
      
      return data || [];
    },
    staleTime: 30 * 60 * 1000, // 30分钟缓存
  });
};

// 获取员工在指定周期的类别
export const useEmployeeCategoryByPeriod = (employeeId: string, periodId?: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: employeeCategoryQueryKeys.employeeCategory(employeeId),
    queryFn: async (): Promise<EmployeeCategory | null> => {
      let query = supabase
        .from('employee_category_assignments')
        .select(`
          id,
          employee_id,
          employee_category_id,
          period_id,
          notes,
          created_at,
          personnel_category:employee_categories(
            id,
            name,
            description
          )
        `)
        .eq('employee_id', employeeId);
      
      if (periodId) {
        query = query.eq('period_id', periodId);
      }
      
      query = query
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: queryData, error } = await query.single();
      const data = queryData as any;

      if (error && error.code !== 'PGRST116') {
        handleError(error, { customMessage: '获取员工类别失败' });
        throw error;
      }
      
      if (!data || !data.personnel_category) return null;
      
      const category = Array.isArray(data.personnel_category) ? data.personnel_category[0] : data.personnel_category;
      
      // 获取类别规则
      const rulesData = await getCategoryRules(data.employee_category_id);
      
      return {
        id: data.id,
        employee_id: data.employee_id,
        category_id: data.employee_category_id,
        category_name: category?.name || '',
        category_code: undefined, // v3数据库没有code字段
        effective_date: '', // 新结构中没有日期字段
        end_date: null,
        period_id: data.period_id,
        is_active: true,
        salary_rules: rulesData
      };
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
};

// 兼容性方法：获取员工当前类别
export const useCurrentEmployeeCategory = (employeeId: string) => {
  return useEmployeeCategoryByPeriod(employeeId);
};

// 获取员工类别历史
export const useEmployeeCategoryHistory = (employeeId: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: employeeCategoryQueryKeys.employeeHistory(employeeId),
    queryFn: async (): Promise<EmployeeCategory[]> => {
      const { data, error } = await supabase
        .from('employee_category_assignments')
        .select(`
          id,
          employee_id,
          employee_category_id,
          period_id,
          notes,
          created_at,
          personnel_category:employee_categories(
            id,
            name,
            description
          ),
          period:payroll_periods(
            id,
            period_name,
            period_year,
            period_month
          )
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) {
        handleError(error, { customMessage: '获取员工类别历史失败' });
        throw error;
      }
      
      const history = await Promise.all((data || []).map(async (item: any) => {
        if (!item.personnel_category) return null;
        
        const category = Array.isArray(item.personnel_category) ? item.personnel_category[0] : item.personnel_category;
        const period = Array.isArray(item.period) ? item.period[0] : item.period;
        const rulesData = await getCategoryRules(item.employee_category_id);
        
        return {
          id: item.id,
          employee_id: item.employee_id,
          category_id: item.employee_category_id,
          category_name: category?.name || '',
          category_code: undefined, // v3数据库没有code字段
          effective_date: '', // 新结构中用period代替
          end_date: null,
          period_id: item.period_id,
          period_name: period?.period_name || '',
          is_active: true,
          salary_rules: rulesData
        };
      }));
      
      return history.filter(Boolean) as EmployeeCategory[];
    },
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000,
  });
};

// 获取类别薪资规则（内部函数）
const getCategoryRules = async (categoryId: string): Promise<EmployeeCategory['salary_rules']> => {
  // 从 lookup_values 表获取类别相关的配置
  // 这里简化处理，实际应该从配置表读取
  const categoryDefaults: Record<string, EmployeeCategory['salary_rules']> = {
    'full_time': {
      has_social_insurance: true,
      has_housing_fund: true,
      tax_calculation_method: 'standard',
      overtime_rate_multiplier: 1.5,
      probation_salary_ratio: 0.8
    },
    'contract': {
      has_social_insurance: true,
      has_housing_fund: false,
      tax_calculation_method: 'standard',
      overtime_rate_multiplier: 1.5,
      probation_salary_ratio: 0.9
    },
    'temporary': {
      has_social_insurance: false,
      has_housing_fund: false,
      tax_calculation_method: 'simplified',
      overtime_rate_multiplier: 1.0,
      probation_salary_ratio: 1.0
    },
    'intern': {
      has_social_insurance: false,
      has_housing_fund: false,
      tax_calculation_method: 'exempt',
      overtime_rate_multiplier: 1.0,
      probation_salary_ratio: 1.0
    }
  };
  
  // 获取类别信息以确定类型
  const { data: category } = await supabase
    .from('employee_categories')
    .select('name')
    .eq('id', categoryId)
    .single();
  
  // v3数据库没有code字段，使用name来判断类型
  const name = category?.name?.toLowerCase() || '';
  let code = 'full_time'; // 默认全职
  
  if (name.includes('合同') || name.includes('contract')) {
    code = 'contract';
  } else if (name.includes('临时') || name.includes('temporary')) {
    code = 'temporary';
  } else if (name.includes('实习') || name.includes('intern')) {
    code = 'intern';
  }
  
  return categoryDefaults[code] || categoryDefaults['full_time'];
};

// 为员工分配类别（基于周期）
export const useAssignEmployeeCategory = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      categoryId: string;
      periodId: string;
      notes?: string;
    }) => {
      const { employeeId, categoryId, periodId, notes } = params;
      
      // 检查该员工在该周期是否已有类别分配
      const { data: existing } = await supabase
        .from('employee_category_assignments')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('period_id', periodId)
        .single();
      
      if (existing) {
        // 更新现有记录
        const { data, error } = await supabase
          .from('employee_category_assignments')
          .update({
            employee_category_id: categoryId,
            notes
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) {
          handleError(error, { customMessage: '更新员工类别分配失败' });
          throw error;
        }
        return data;
      } else {
        // 创建新记录
        const { data, error } = await supabase
          .from('employee_category_assignments')
          .insert({
            employee_id: employeeId,
            employee_category_id: categoryId,
            period_id: periodId,
            notes
          })
          .select()
          .single();

        if (error) {
          handleError(error, { customMessage: '分配员工类别失败' });
          throw error;
        }
        return data;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: employeeCategoryQueryKeys.employeeCategory(variables.employeeId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: employeeCategoryQueryKeys.employeeHistory(variables.employeeId) 
      });
    },
  });
};

// 兼容性方法
export const useUpdateEmployeeCategory = useAssignEmployeeCategory;

// 批量分配员工类别
export const useBatchAssignEmployeeCategories = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (params: {
      assignments: Array<{
        employeeId: string;
        categoryId: string;
        periodId: string;
        notes?: string;
      }>;
    }) => {
      const { assignments } = params;
      
      // 转换为数据库插入格式
      const insertData = assignments.map(assignment => ({
        employee_id: assignment.employeeId,
        employee_category_id: assignment.categoryId,
        period_id: assignment.periodId,
        notes: assignment.notes
      }));
      
      const { data, error } = await supabase
        .from('employee_category_assignments')
        .upsert(insertData, {
          onConflict: 'employee_id,period_id'
        })
        .select();

      if (error) {
        handleError(error, { customMessage: '批量分配员工类别失败' });
        throw error;
      }
      
      return data || [];
    },
    onSuccess: (data, variables) => {
      // 使所有相关查询失效
      const employeeIds = [...new Set(variables.assignments.map(a => a.employeeId))];
      employeeIds.forEach(employeeId => {
        queryClient.invalidateQueries({ 
          queryKey: employeeCategoryQueryKeys.employeeCategory(employeeId) 
        });
        queryClient.invalidateQueries({ 
          queryKey: employeeCategoryQueryKeys.employeeHistory(employeeId) 
        });
      });
    },
  });
};

// 兼容性方法
export const useBatchUpdateEmployeeCategories = useBatchAssignEmployeeCategories;

// 验证类别变更
export const useValidateCategoryChange = () => {
  const { handleError } = useErrorHandler();
  
  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      fromCategoryId: string;
      toCategoryId: string;
      effectiveDate: string;
    }): Promise<{
      isValid: boolean;
      warnings: string[];
      errors: string[];
    }> => {
      const warnings: string[] = [];
      const errors: string[] = [];
      
      // 检查是否有未完成的薪资
      const { data: pendingPayrolls } = await supabase
        .from('payrolls')
        .select('id, pay_period_start, status')
        .eq('employee_id', params.employeeId)
        .in('status', ['draft', 'calculating', 'calculated'])
        .gte('pay_period_start', params.effectiveDate);
      
      if (pendingPayrolls && pendingPayrolls.length > 0) {
        warnings.push(`有 ${pendingPayrolls.length} 条未完成的薪资记录可能受影响`);
      }
      
      // 检查类别规则差异
      const fromRules = await getCategoryRules(params.fromCategoryId);
      const toRules = await getCategoryRules(params.toCategoryId);
      
      if (fromRules?.has_social_insurance && !toRules?.has_social_insurance) {
        warnings.push('新类别不包含社保，请确认是否正确');
      }
      
      if (fromRules?.has_housing_fund && !toRules?.has_housing_fund) {
        warnings.push('新类别不包含公积金，请确认是否正确');
      }
      
      if (fromRules?.tax_calculation_method !== toRules?.tax_calculation_method) {
        warnings.push('个税计算方式将发生变化');
      }
      
      // 检查生效日期是否合理
      const effectiveDate = new Date(params.effectiveDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (effectiveDate < today) {
        errors.push('生效日期不能早于今天');
      }
      
      return {
        isValid: errors.length === 0,
        warnings,
        errors
      };
    }
  });
};

/**
 * 员工类别管理 Hook 配置选项
 */
interface UseEmployeeCategoryOptions {
  employeeId?: string;
  enableAutoFetch?: boolean;
}

/**
 * 主员工类别管理 Hook
 */
export function useEmployeeCategory(options: UseEmployeeCategoryOptions = {}) {
  const {
    employeeId,
    enableAutoFetch = true
  } = options;

  const queryClient = useQueryClient();

  // 使用各个子Hook
  const categoriesQuery = useEmployeeCategories();
  const currentCategoryQuery = useCurrentEmployeeCategory(employeeId || '');
  const categoryHistoryQuery = useEmployeeCategoryHistory(employeeId || '');
  const updateCategoryMutation = useUpdateEmployeeCategory();
  const batchUpdateMutation = useBatchUpdateEmployeeCategories();
  const validateChangeMutation = useValidateCategoryChange();

  // 设置实时订阅
  useEffect(() => {
    if (!employeeId) return;

    console.log('[EmployeeCategory] Setting up realtime subscription for employee:', employeeId);

    const channel = supabase
      .channel(`employee-category-${employeeId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'employee_category_assignments',
          filter: `employee_id=eq.${employeeId}`
        },
        (payload) => {
          console.log('[EmployeeCategory] Category assignment change detected:', payload.eventType);
          queryClient.invalidateQueries({ 
            queryKey: employeeCategoryQueryKeys.employeeCategory(employeeId) 
          });
          queryClient.invalidateQueries({ 
            queryKey: employeeCategoryQueryKeys.employeeHistory(employeeId) 
          });
        }
      )
      .subscribe();

    return () => {
      console.log('[EmployeeCategory] Cleaning up realtime subscription');
      channel.unsubscribe();
    };
  }, [employeeId, queryClient]);

  // 刷新数据
  const refresh = async () => {
    const promises = [];
    promises.push(categoriesQuery.refetch());
    if (employeeId) {
      promises.push(currentCategoryQuery.refetch());
      promises.push(categoryHistoryQuery.refetch());
    }
    await Promise.all(promises);
  };

  return {
    // 数据
    categories: categoriesQuery.data || [],
    currentCategory: currentCategoryQuery.data,
    categoryHistory: categoryHistoryQuery.data || [],
    
    // 加载状态
    loading: {
      categories: categoriesQuery.isLoading,
      currentCategory: currentCategoryQuery.isLoading,
      history: categoryHistoryQuery.isLoading,
      isLoading: categoriesQuery.isLoading || 
                 currentCategoryQuery.isLoading || 
                 categoryHistoryQuery.isLoading
    },

    // 错误状态
    errors: {
      categories: categoriesQuery.error,
      currentCategory: currentCategoryQuery.error,
      history: categoryHistoryQuery.error
    },

    // Mutations
    mutations: {
      assignCategory: updateCategoryMutation,
      batchAssign: batchUpdateMutation,
      validateChange: validateChangeMutation
    },

    // 操作
    actions: {
      refresh,
      assignCategory: updateCategoryMutation.mutate,
      batchAssignCategories: batchUpdateMutation.mutate,
      validateChange: validateChangeMutation.mutate
    },

    // 验证
    validation: {
      canChangeCategory: (fromId: string, toId: string) => {
        // 简单的前端验证
        return fromId !== toId;
      },
      hasActivePayrolls: async (employeeId: string) => {
        const { data } = await supabase
          .from('payrolls')
          .select('id')
          .eq('employee_id', employeeId)
          .in('status', ['draft', 'calculating', 'calculated'])
          .limit(1);
        return (data?.length || 0) > 0;
      }
    }
  };
}