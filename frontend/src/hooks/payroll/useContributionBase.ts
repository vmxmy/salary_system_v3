import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { Database } from '@/types/supabase';

// 类型定义 - 临时使用 any 类型，等待数据库类型更新
type EmployeeContributionBase = any; // Database['public']['Tables']['employee_contribution_bases']['Row'];
type ContributionBaseInsert = any; // Database['public']['Tables']['employee_contribution_bases']['Insert'];
type ContributionBaseUpdate = any; // Database['public']['Tables']['employee_contribution_bases']['Update'];
type InsuranceType = any; // Database['public']['Tables']['insurance_types']['Row'];

// 查询键管理
export const contributionBaseQueryKeys = {
  all: ['contribution-bases'] as const,
  insuranceTypes: () => [...contributionBaseQueryKeys.all, 'insurance-types'] as const,
  employeeBases: (employeeId: string, periodId?: string) => 
    [...contributionBaseQueryKeys.all, 'employee', employeeId, periodId] as const,
  employeeHistory: (employeeId: string) => 
    [...contributionBaseQueryKeys.all, 'history', employeeId] as const,
  periodBases: (periodId: string) => 
    [...contributionBaseQueryKeys.all, 'period', periodId] as const,
  batchValidation: (params: any) => [...contributionBaseQueryKeys.all, 'validation', params] as const,
};

// 缴费基数接口
export interface ContributionBase {
  id: string;
  employee_id: string;
  employee_name?: string;
  insurance_type_id: string;
  insurance_type_name: string;
  insurance_type_key: string;
  period_id: string;
  period_name?: string;
  contribution_base: number;
  adjusted_base?: number; // 调整后基数
  adjustment_reason?: string; // 调整原因
  effective_date: string; // 兼容性保留
  end_date?: string | null; // 兼容性保留
  is_active: boolean;
  notes?: string;
  // 保险规则相关
  insurance_rules?: {
    employee_rate: number;
    employer_rate: number;
    min_base: number;
    max_base: number;
    is_mandatory: boolean;
  };
}

// 缴费基数模板接口
export interface ContributionBaseTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  bases: Array<{
    insurance_type_id: string;
    insurance_type_name: string;
    base_amount: number;
    is_mandatory: boolean;
  }>;
}

// 获取所有保险类型
export const useInsuranceTypes = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: contributionBaseQueryKeys.insuranceTypes(),
    queryFn: async (): Promise<InsuranceType[]> => {
      const { data, error } = await supabase
        .from('insurance_types')
        .select('*')
        .order('system_key', { ascending: true });

      if (error) {
        handleError(error, { customMessage: '获取保险类型失败' });
        throw error;
      }
      
      return data || [];
    },
    staleTime: 30 * 60 * 1000, // 30分钟缓存
  });
};

// 获取员工在指定周期的缴费基数
export const useEmployeeContributionBasesByPeriod = (employeeId: string, periodId?: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: contributionBaseQueryKeys.employeeBases(employeeId, periodId),
    queryFn: async (): Promise<ContributionBase[]> => {
      let query = supabase
        .from('employee_contribution_bases')
        .select(`
          id,
          employee_id,
          insurance_type_id,
          period_id,
          contribution_base,
          created_at,
          employee:employees(
            id,
            employee_name
          ),
          insurance_type:insurance_types(
            id,
            system_key,
            name,
            description,
            is_active
          ),
          period:payroll_periods(
            id,
            period_name,
            period_year,
            period_month
          )
        `)
        .eq('employee_id', employeeId);
      
      if (periodId) {
        query = query.eq('period_id', periodId);
      }
      
      // Cannot order by nested field in Supabase, will sort client-side
      const { data, error } = await query;

      if (error) {
        handleError(error, { customMessage: '获取员工缴费基数失败' });
        throw error;
      }
      
      // Sort by insurance type system_key client-side
      const sortedData = (data || []).sort((a, b) => {
        const keyA = (a.insurance_type as any)?.system_key || '';
        const keyB = (b.insurance_type as any)?.system_key || '';
        return keyA.localeCompare(keyB);
      });
      
      return sortedData.map(item => ({
        id: item.id,
        employee_id: item.employee_id,
        employee_name: (item.employee as any)?.employee_name || '',
        insurance_type_id: item.insurance_type_id,
        insurance_type_name: (item.insurance_type as any)?.name || '',
        insurance_type_key: (item.insurance_type as any)?.system_key || '',
        period_id: item.period_id,
        period_name: (item.period as any)?.period_name || '',
        contribution_base: item.contribution_base || 0,
        adjusted_base: undefined, // Field doesn't exist in v3 DB
        adjustment_reason: undefined, // Field doesn't exist in v3 DB
        effective_date: '', // 新结构中没有日期字段
        end_date: null,
        is_active: true,
        notes: undefined, // Field doesn't exist in v3 DB
        insurance_rules: item.insurance_type ? {
          employee_rate: 0.08, // 默认员工缴费率
          employer_rate: 0.16, // 默认单位缴费率
          min_base: 3000, // 默认最低基数
          max_base: 30000, // 默认最高基数
          is_mandatory: (item.insurance_type as any)?.is_active || false
        } : undefined
      }));
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
};

// 兼容性方法：获取员工当前缴费基数
export const useCurrentEmployeeContributionBases = (employeeId: string) => {
  return useEmployeeContributionBasesByPeriod(employeeId);
};

// 获取员工缴费基数历史
export const useEmployeeContributionBasesHistory = (employeeId: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: contributionBaseQueryKeys.employeeHistory(employeeId),
    queryFn: async (): Promise<ContributionBase[]> => {
      const { data, error } = await supabase
        .from('employee_contribution_bases')
        .select(`
          id,
          employee_id,
          insurance_type_id,
          period_id,
          contribution_base,
          created_at,
          employee:employees(
            id,
            employee_name
          ),
          insurance_type:insurance_types(
            id,
            system_key,
            name,
            description,
            is_active
          ),
          period:payroll_periods(
            id,
            period_name,
            period_year,
            period_month
          )
        `)
        .eq('employee_id', employeeId);

      if (error) {
        handleError(error, { customMessage: '获取缴费基数历史失败' });
        throw error;
      }
      
      // 客户端排序
      const sortedData = (data || []).sort((a, b) => {
        // 先按年份降序
        const yearDiff = ((b.period as any)?.period_year || 0) - ((a.period as any)?.period_year || 0);
        if (yearDiff !== 0) return yearDiff;
        
        // 再按月份降序
        const monthDiff = ((b.period as any)?.period_month || 0) - ((a.period as any)?.period_month || 0);
        if (monthDiff !== 0) return monthDiff;
        
        // 最后按保险类型键排序
        return ((a.insurance_type as any)?.system_key || '').localeCompare((b.insurance_type as any)?.system_key || '');
      });
      
      return sortedData.map(item => ({
        id: item.id,
        employee_id: item.employee_id,
        employee_name: (item.employee as any)?.employee_name || '',
        insurance_type_id: item.insurance_type_id,
        insurance_type_name: (item.insurance_type as any)?.name || '',
        insurance_type_key: (item.insurance_type as any)?.system_key || '',
        period_id: item.period_id,
        period_name: (item.period as any)?.period_name || '',
        contribution_base: item.contribution_base || 0,
        adjusted_base: undefined, // Field doesn't exist in v3 DB
        adjustment_reason: undefined, // Field doesn't exist in v3 DB
        effective_date: '', // 新结构中用period代替
        end_date: null,
        is_active: true,
        notes: undefined, // Field doesn't exist in v3 DB
        insurance_rules: item.insurance_type ? {
          employee_rate: 0.08, // 默认员工缴费率
          employer_rate: 0.16, // 默认单位缴费率
          min_base: 3000, // 默认最低基数
          max_base: 30000, // 默认最高基数
          is_mandatory: (item.insurance_type as any)?.is_active || false
        } : undefined
      }));
    },
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000,
  });
};

// 获取周期内所有员工的缴费基数
export const usePeriodContributionBases = (periodId: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: contributionBaseQueryKeys.periodBases(periodId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_contribution_bases')
        .select(`
          id,
          employee_id,
          insurance_type_id,
          contribution_base,
          employee:employees(
            id,
            employee_name
          ),
          insurance_type:insurance_types(
            id,
            system_key,
            name,
            description
          )
        `)
        .eq('period_id', periodId);

      if (error) {
        handleError(error, { customMessage: '获取周期缴费基数失败' });
        throw error;
      }
      
      // Sort client-side since Supabase doesn't support nested field ordering
      const sortedData = (data || []).sort((a, b) => {
        // First sort by employee name
        const nameCompare = ((a.employee as any)?.employee_name || '').localeCompare((b.employee as any)?.employee_name || '');
        if (nameCompare !== 0) return nameCompare;
        
        // Then sort by insurance type system key
        return ((a.insurance_type as any)?.system_key || '').localeCompare((b.insurance_type as any)?.system_key || '');
      });
      
      return sortedData;
    },
    enabled: !!periodId,
    staleTime: 5 * 60 * 1000,
  });
};

// 设置员工缴费基数
export const useSetContributionBase = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      insuranceTypeId: string;
      periodId: string;
      contributionBase: number;
      adjustedBase?: number;
      adjustmentReason?: string;
      notes?: string;
    }) => {
      const { employeeId, insuranceTypeId, periodId, contributionBase, adjustedBase, adjustmentReason, notes } = params;
      
      // 检查该员工在该周期是否已有该保险类型的基数
      const { data: existing } = await supabase
        .from('employee_contribution_bases')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('insurance_type_id', insuranceTypeId)
        .eq('period_id', periodId)
        .single();
      
      if (existing) {
        // 更新现有记录
        const { data, error } = await supabase
          .from('employee_contribution_bases')
          .update({
            contribution_base: contributionBase
            // adjusted_base, adjustment_reason, notes fields don't exist in v3 DB
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) {
          handleError(error, { customMessage: '更新缴费基数失败' });
          throw error;
        }
        return data;
      } else {
        // 创建新记录
        const { data, error } = await supabase
          .from('employee_contribution_bases')
          .insert({
            employee_id: employeeId,
            insurance_type_id: insuranceTypeId,
            period_id: periodId,
            contribution_base: contributionBase
            // adjusted_base, adjustment_reason, notes fields don't exist in v3 DB
          })
          .select()
          .single();

        if (error) {
          handleError(error, { customMessage: '设置缴费基数失败' });
          throw error;
        }
        return data;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: contributionBaseQueryKeys.employeeBases(variables.employeeId, variables.periodId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: contributionBaseQueryKeys.employeeHistory(variables.employeeId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: contributionBaseQueryKeys.periodBases(variables.periodId) 
      });
    },
  });
};

// 批量设置缴费基数
export const useBatchSetContributionBases = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (params: {
      bases: Array<{
        employeeId: string;
        insuranceTypeId: string;
        periodId: string;
        contributionBase: number;
        adjustedBase?: number;
        adjustmentReason?: string;
        notes?: string;
      }>;
    }) => {
      const { bases } = params;
      
      // 转换为数据库插入格式
      const insertData = bases.map(base => ({
        employee_id: base.employeeId,
        insurance_type_id: base.insuranceTypeId,
        period_id: base.periodId,
        contribution_base: base.contributionBase
        // adjusted_base, adjustment_reason, notes fields don't exist in v3 DB
      }));
      
      const { data, error } = await supabase
        .from('employee_contribution_bases')
        .upsert(insertData, {
          onConflict: 'employee_id,insurance_type_id,period_id'
        })
        .select();

      if (error) {
        handleError(error, { customMessage: '批量设置缴费基数失败' });
        throw error;
      }
      
      return data || [];
    },
    onSuccess: (data, variables) => {
      // 使所有相关查询失效
      const employeeIds = [...new Set(variables.bases.map(b => b.employeeId))];
      const periodIds = [...new Set(variables.bases.map(b => b.periodId))];
      
      employeeIds.forEach(employeeId => {
        queryClient.invalidateQueries({ 
          queryKey: contributionBaseQueryKeys.employeeHistory(employeeId) 
        });
        periodIds.forEach(periodId => {
          queryClient.invalidateQueries({ 
            queryKey: contributionBaseQueryKeys.employeeBases(employeeId, periodId) 
          });
        });
      });
      
      periodIds.forEach(periodId => {
        queryClient.invalidateQueries({ 
          queryKey: contributionBaseQueryKeys.periodBases(periodId) 
        });
      });
    },
  });
};

// 自动计算缴费基数（基于薪资）
export const useCalculateContributionBases = () => {
  const { handleError } = useErrorHandler();
  
  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      periodId: string;
      baseSalary?: number;
      lastMonthsAverage?: number;
    }): Promise<ContributionBase[]> => {
      const { employeeId, periodId, baseSalary, lastMonthsAverage } = params;
      
      // 获取所有保险类型
      const { data: insuranceTypes, error: typesError } = await supabase
        .from('insurance_types')
        .select('*')
        .order('system_key');
      
      if (typesError) {
        handleError(typesError, { customMessage: '获取保险类型失败' });
        throw typesError;
      }
      
      // 如果没有提供基数，尝试从最近的薪资计算
      let calculationBase = baseSalary || lastMonthsAverage || 0;
      
      if (!calculationBase) {
        // 获取员工最近的薪资作为基数
        const { data: recentPayroll } = await supabase
          .from('view_payroll_summary')
          .select('gross_pay')
          .eq('employee_id', employeeId)
          .order('pay_date', { ascending: false })
          .limit(1)
          .single();
        
        calculationBase = recentPayroll?.gross_pay || 0;
      }
      
      // 为每个保险类型计算缴费基数
      const calculatedBases: ContributionBase[] = (insuranceTypes || []).map(type => {
        let contributionBase = calculationBase;
        
        // 应用最小值和最大值限制
        if (type.min_base && contributionBase < type.min_base) {
          contributionBase = type.min_base;
        }
        if (type.max_base && contributionBase > type.max_base) {
          contributionBase = type.max_base;
        }
        
        return {
          id: '', // 新计算的基数还没有ID
          employee_id: employeeId,
          insurance_type_id: type.id,
          insurance_type_name: type.name,
          insurance_type_key: type.system_key,
          period_id: periodId,
          contribution_base: contributionBase,
          effective_date: '',
          end_date: null,
          is_active: true,
          insurance_rules: {
            employee_rate: type.employee_rate || 0,
            employer_rate: type.employer_rate || 0,
            min_base: type.min_base || 0,
            max_base: type.max_base || 0,
            is_mandatory: type.is_mandatory || false
          }
        };
      });
      
      return calculatedBases;
    }
  });
};

// 验证缴费基数设置
export const useValidateContributionBases = () => {
  const { handleError } = useErrorHandler();
  
  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      periodId: string;
      bases: Array<{
        insuranceTypeId: string;
        contributionBase: number;
      }>;
    }): Promise<{
      isValid: boolean;
      warnings: string[];
      errors: string[];
    }> => {
      const { employeeId, periodId, bases } = params;
      const warnings: string[] = [];
      const errors: string[] = [];
      
      // 获取保险类型规则
      const { data: insuranceTypes } = await supabase
        .from('insurance_types')
        .select('*')
        .in('id', bases.map(b => b.insuranceTypeId));
      
      // 验证每个缴费基数
      for (const base of bases) {
        const insuranceType = insuranceTypes?.find(t => t.id === base.insuranceTypeId);
        if (!insuranceType) continue;
        
        // 检查最小值
        if (insuranceType.min_base && base.contributionBase < insuranceType.min_base) {
          errors.push(`${insuranceType.name}缴费基数不能低于${insuranceType.min_base}元`);
        }
        
        // 检查最大值
        if (insuranceType.max_base && base.contributionBase > insuranceType.max_base) {
          errors.push(`${insuranceType.name}缴费基数不能高于${insuranceType.max_base}元`);
        }
        
        // 检查是否为必须的保险类型
        if (insuranceType.is_mandatory && base.contributionBase <= 0) {
          errors.push(`${insuranceType.name}是必须的保险类型，缴费基数必须大于0`);
        }
      }
      
      // 检查是否缺少必须的保险类型
      const { data: mandatoryTypes } = await supabase
        .from('insurance_types')
        .select('id, name')
        .eq('is_mandatory', true);
      
      const providedTypeIds = bases.map(b => b.insuranceTypeId);
      const missingMandatory = (mandatoryTypes || []).filter(
        type => !providedTypeIds.includes(type.id)
      );
      
      if (missingMandatory.length > 0) {
        errors.push(`缺少必须的保险类型: ${missingMandatory.map(t => t.name).join(', ')}`);
      }
      
      // 检查基数是否合理（与薪资比较）
      const { data: recentPayroll } = await supabase
        .from('view_payroll_summary')
        .select('gross_pay')
        .eq('employee_id', employeeId)
        .order('pay_date', { ascending: false })
        .limit(1)
        .single();
      
      if (recentPayroll?.gross_pay) {
        const grossPay = recentPayroll.gross_pay;
        bases.forEach(base => {
          const ratio = base.contributionBase / grossPay;
          if (ratio > 2) {
            warnings.push(`缴费基数明显高于薪资，请检查是否正确`);
          } else if (ratio < 0.5) {
            warnings.push(`缴费基数明显低于薪资，请检查是否正确`);
          }
        });
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
 * 缴费基数管理 Hook 配置选项
 */
interface UseContributionBaseOptions {
  employeeId?: string;
  periodId?: string;
  enableAutoCalculation?: boolean;
}

/**
 * 主缴费基数管理 Hook
 */
export function useContributionBase(options: UseContributionBaseOptions = {}) {
  const {
    employeeId,
    periodId,
    enableAutoCalculation = false
  } = options;

  const queryClient = useQueryClient();

  // 使用各个子Hook
  const insuranceTypesQuery = useInsuranceTypes();
  const employeeBasesQuery = useEmployeeContributionBasesByPeriod(employeeId || '', periodId);
  const employeeHistoryQuery = useEmployeeContributionBasesHistory(employeeId || '');
  const periodBasesQuery = usePeriodContributionBases(periodId || '');
  
  const setBaseMutation = useSetContributionBase();
  const batchSetMutation = useBatchSetContributionBases();
  const calculateMutation = useCalculateContributionBases();
  const validateMutation = useValidateContributionBases();

  // 设置实时订阅
  useEffect(() => {
    if (!employeeId) return;

    console.log('[ContributionBase] Setting up realtime subscription for employee:', employeeId);

    const channel = supabase
      .channel(`contribution-base-${employeeId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'employee_contribution_bases',
          filter: `employee_id=eq.${employeeId}`
        },
        (payload) => {
          console.log('[ContributionBase] Contribution base change detected:', payload.eventType);
          queryClient.invalidateQueries({ 
            queryKey: contributionBaseQueryKeys.employeeBases(employeeId, periodId) 
          });
          queryClient.invalidateQueries({ 
            queryKey: contributionBaseQueryKeys.employeeHistory(employeeId) 
          });
          if (periodId) {
            queryClient.invalidateQueries({ 
              queryKey: contributionBaseQueryKeys.periodBases(periodId) 
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[ContributionBase] Cleaning up realtime subscription');
      channel.unsubscribe();
    };
  }, [employeeId, periodId, queryClient]);

  // 刷新数据
  const refresh = async () => {
    const promises = [];
    promises.push(insuranceTypesQuery.refetch());
    if (employeeId) {
      promises.push(employeeBasesQuery.refetch());
      promises.push(employeeHistoryQuery.refetch());
    }
    if (periodId) {
      promises.push(periodBasesQuery.refetch());
    }
    await Promise.all(promises);
  };

  return {
    // 数据
    insuranceTypes: insuranceTypesQuery.data || [],
    employeeBases: employeeBasesQuery.data || [],
    employeeHistory: employeeHistoryQuery.data || [],
    periodBases: periodBasesQuery.data || [],
    
    // 加载状态
    loading: {
      insuranceTypes: insuranceTypesQuery.isLoading,
      employeeBases: employeeBasesQuery.isLoading,
      employeeHistory: employeeHistoryQuery.isLoading,
      periodBases: periodBasesQuery.isLoading,
      isLoading: insuranceTypesQuery.isLoading || 
                 employeeBasesQuery.isLoading || 
                 employeeHistoryQuery.isLoading ||
                 periodBasesQuery.isLoading
    },

    // 错误状态
    errors: {
      insuranceTypes: insuranceTypesQuery.error,
      employeeBases: employeeBasesQuery.error,
      employeeHistory: employeeHistoryQuery.error,
      periodBases: periodBasesQuery.error
    },

    // Mutations
    mutations: {
      setBase: setBaseMutation,
      batchSet: batchSetMutation,
      calculate: calculateMutation,
      validate: validateMutation
    },

    // 操作
    actions: {
      refresh,
      setContributionBase: setBaseMutation.mutate,
      batchSetBases: batchSetMutation.mutate,
      calculateBases: calculateMutation.mutate,
      validateBases: validateMutation.mutate
    },

    // 工具函数
    utils: {
      // 格式化货币
      formatCurrency: (amount: number) => {
        return new Intl.NumberFormat('zh-CN', {
          style: 'currency',
          currency: 'CNY'
        }).format(amount);
      },
      
      // 按保险类型分组
      groupBasesByInsuranceType: (bases: ContributionBase[]) => {
        return bases.reduce((groups, base) => {
          const key = base.insurance_type_key;
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(base);
          return groups;
        }, {} as Record<string, ContributionBase[]>);
      },
      
      // 计算总缴费金额
      calculateTotalContribution: (bases: ContributionBase[]) => {
        return bases.reduce((total, base) => {
          const effectiveBase = base.contribution_base; // adjusted_base doesn't exist in v3 DB
          const employeeAmount = effectiveBase * (base.insurance_rules?.employee_rate || 0);
          const employerAmount = effectiveBase * (base.insurance_rules?.employer_rate || 0);
          return {
            employeeAmount: total.employeeAmount + employeeAmount,
            employerAmount: total.employerAmount + employerAmount,
            totalAmount: total.totalAmount + employeeAmount + employerAmount
          };
        }, { employeeAmount: 0, employerAmount: 0, totalAmount: 0 });
      },
      
      // 验证基数是否在有效范围内
      isBaseValid: (base: ContributionBase) => {
        const effectiveBase = base.contribution_base; // adjusted_base doesn't exist in v3 DB
        const rules = base.insurance_rules;
        if (!rules) return true;
        
        const isAboveMin = !rules.min_base || effectiveBase >= rules.min_base;
        const isBelowMax = !rules.max_base || effectiveBase <= rules.max_base;
        
        return isAboveMin && isBelowMax;
      }
    }
  };
}