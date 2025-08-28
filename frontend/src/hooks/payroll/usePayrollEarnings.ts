import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import { useCacheInvalidationManager, CacheInvalidationUtils } from '@/hooks/core/useCacheInvalidationManager';
import type { Database } from '@/types/supabase';

// 类型定义
type PayrollItem = Database['public']['Tables']['payroll_items']['Row'];
type PayrollItemInsert = Database['public']['Tables']['payroll_items']['Insert'];
type PayrollItemUpdate = Database['public']['Tables']['payroll_items']['Update'];
type PayrollComponent = Database['public']['Tables']['salary_components']['Row'];

// 查询键管理
export const payrollEarningsQueryKeys = {
  all: ['payroll-earnings'] as const,
  components: () => [...payrollEarningsQueryKeys.all, 'components'] as const,
  allComponents: () => [...payrollEarningsQueryKeys.components(), 'all-types'] as const,
  payrollEarnings: (payrollId: string) => 
    [...payrollEarningsQueryKeys.all, 'payroll', payrollId] as const,
  periodEarnings: (periodId: string) => 
    [...payrollEarningsQueryKeys.all, 'period', periodId] as const,
  employeeEarnings: (employeeId: string, periodId?: string) => 
    [...payrollEarningsQueryKeys.all, 'employee', employeeId, periodId] as const,
  templates: () => [...payrollEarningsQueryKeys.all, 'templates'] as const,
  taxCalculation: (params: any) => [...payrollEarningsQueryKeys.all, 'tax', params] as const,
};

// 薪资收入明细接口
export interface PayrollEarning {
  id: string;
  payroll_id: string;
  component_id: string;
  component_name: string;
  component_type: 'earning'; // 仅处理收入项
  category: 'basic_salary' | 'allowance' | 'bonus' | 'overtime' | 'other';
  amount: number;
  is_taxable: boolean;
  is_social_insurance_base: boolean;
  is_housing_fund_base: boolean;
  calculation_method: 'fixed' | 'percentage' | 'formula';
  calculation_config?: {
    base_amount?: number;
    percentage?: number;
    formula?: string;
  };
  notes?: string;
  period_id?: string;
}

// 个税计算结果接口
export interface TaxCalculationResult {
  gross_income: number; // 总收入
  taxable_income: number; // 应税收入
  pre_tax_deductions: number; // 税前扣除
  special_deductions: number; // 专项扣除
  additional_deductions: number; // 专项附加扣除
  taxable_amount: number; // 应纳税所得额
  tax_rate: number; // 适用税率
  quick_deduction: number; // 速算扣除数
  income_tax: number; // 应纳个人所得税
  after_tax_income: number; // 税后收入
  accumulated_income?: number; // 累计收入（年度）
  accumulated_tax?: number; // 累计税额（年度）
}

// 收入模板接口
export interface EarningTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  items: Array<{
    component_id: string;
    component_name: string;
    amount?: number;
    is_mandatory: boolean;
  }>;
}

// 获取所有薪资组件定义（包括收入和扣除）
export const useEarningComponents = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollEarningsQueryKeys.allComponents(),
    queryFn: async (): Promise<PayrollComponent[]> => {
      const { data, error } = await supabase
        .from('salary_components')
        .select('*')
        .in('type', ['earning', 'deduction'])  // 获取收入和扣除两种类型
        .order('type', { ascending: true })    // 先按类型排序
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        handleError(error, { customMessage: '获取薪资组件失败' });
        throw error;
      }
      
      return data || [];
    },
    staleTime: 30 * 60 * 1000, // 30分钟缓存
  });
};

// 获取薪资收入明细（基础版本）
export const usePayrollEarningsBasic = (payrollId: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollEarningsQueryKeys.payrollEarnings(payrollId),
    queryFn: async (): Promise<PayrollEarning[]> => {
      // 先获取所有项目，然后在客户端过滤
      const { data, error } = await supabase
        .from('payroll_items')
        .select(`
          id,
          payroll_id,
          component_id,
          amount,
          notes,
          period_id,
          component:salary_components(
            id,
            name,
            type,
            category,
            is_taxable
          )
        `)
        .eq('payroll_id', payrollId);

      if (error) {
        handleError(error, { customMessage: '获取薪资收入明细失败' });
        throw error;
      }
      
      // 客户端过滤，只保留 earning 类型
      const filteredData = (data || []).filter((item: any) => (item.component as any)?.type === 'earning');
      
      // 客户端排序
      const sortedData = filteredData.sort((a: any, b: any) => {
        // 先按类别排序
        const categoryOrder = ((a.component as any)?.category || '').localeCompare((b.component as any)?.category || '');
        if (categoryOrder !== 0) return categoryOrder;
        // 再按名称排序
        return ((a.component as any)?.name || '').localeCompare((b.component as any)?.name || '');
      });
      
      return sortedData.map((item: any) => ({
        id: item.id,
        payroll_id: item.payroll_id,
        component_id: item.component_id,
        component_name: (item.component as any)?.name || '',
        component_type: 'earning' as const,
        category: (item.component as any)?.category as PayrollEarning['category'],
        amount: item.amount || 0,
        is_taxable: (item.component as any)?.is_taxable || false,
        is_social_insurance_base: false, // v3数据库没有此字段，默认为false
        is_housing_fund_base: false, // v3数据库没有此字段，默认为false
        calculation_method: 'fixed' as PayrollEarning['calculation_method'], // v3数据库没有此字段，默认为fixed
        calculation_config: undefined, // v3数据库没有此字段
        notes: item.notes,
        period_id: item.period_id
      }));
    },
    enabled: !!payrollId,
    staleTime: 5 * 60 * 1000,
  });
};

// 获取员工在指定周期的收入历史
export const useEmployeeEarningHistory = (employeeId: string, periodId?: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollEarningsQueryKeys.employeeEarnings(employeeId, periodId),
    queryFn: async () => {
      let query = supabase
        .from('payroll_items')
        .select(`
          id,
          payroll_id,
          component_id,
          amount,
          notes,
          period_id,
          payroll:payrolls!inner(
            id,
            employee_id,
            pay_date,
            status
          ),
          component:salary_components(
            id,
            name,
            type,
            category
          )
        `)
        .eq('payroll.employee_id', employeeId);
      
      if (periodId) {
        query = query.eq('period_id', periodId);
      }
      
      query = query.order('payroll(pay_date)', { ascending: false });

      const { data, error } = await query;

      if (error) {
        handleError(error, { customMessage: '获取员工收入历史失败' });
        throw error;
      }
      
      // 客户端过滤，只保留 earning 类型
      const filteredData = (data || []).filter((item: any) => (item.component as any)?.type === 'earning');
      return filteredData;
    },
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000,
  });
};

// 添加收入项
export const useCreateEarning = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const cacheManager = useCacheInvalidationManager();

  return useMutation({
    mutationFn: async (data: PayrollItemInsert) => {
      const { data: result, error } = await supabase
        .from('payroll_items')
        .insert(data)
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: '添加收入项失败' });
        throw error;
      }
      return result;
    },
    onSuccess: async (data) => {
      if (data.payroll_id) {
        // 使用统一缓存管理器，自动处理所有相关缓存失效
        await cacheManager.invalidateByEvent('payroll:item:created', 
          CacheInvalidationUtils.createPayrollContext(data.payroll_id, undefined, data.period_id || undefined)
        );
      }
    },
  });
};

// 批量添加收入项
export const useBatchCreateEarnings = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (earnings: PayrollItemInsert[]) => {
      const { data, error } = await supabase
        .from('payroll_items')
        .insert(earnings)
        .select();

      if (error) {
        handleError(error, { customMessage: '批量添加收入项失败' });
        throw error;
      }
      return data || [];
    },
    onSuccess: (data) => {
      // 刷新所有相关的薪资收入查询
      const payrollIds = [...new Set(data.map(item => item.payroll_id).filter(Boolean))];
      payrollIds.forEach(payrollId => {
        queryClient.invalidateQueries({ 
          queryKey: payrollEarningsQueryKeys.payrollEarnings(payrollId!) 
        });
      });
    },
  });
};

// 更新收入项
export const useUpdateEarning = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const cacheManager = useCacheInvalidationManager();

  return useMutation({
    mutationFn: async ({ earningId, data }: {
      earningId: string;
      data: PayrollItemUpdate;
    }) => {
      const { data: result, error } = await supabase
        .from('payroll_items')
        .update(data)
        .eq('id', earningId)
        .select()
        .single();

      if (error) {
        handleError(error, { customMessage: '更新收入项失败' });
        throw error;
      }
      return result;
    },
    onSuccess: async (data) => {
      if (data.payroll_id) {
        // 使用统一缓存管理器，自动处理所有相关缓存失效
        await cacheManager.invalidateByEvent('payroll:item:updated', 
          CacheInvalidationUtils.createPayrollContext(data.payroll_id, undefined, data.period_id || undefined)
        );
      }
    },
  });
};

// 删除收入项
export const useDeleteEarning = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const cacheManager = useCacheInvalidationManager();

  return useMutation({
    mutationFn: async (earningId: string) => {
      // 先获取要删除的记录信息
      const { data: earning } = await supabase
        .from('payroll_items')
        .select('payroll_id, period_id')
        .eq('id', earningId)
        .single();

      const { error } = await supabase
        .from('payroll_items')
        .delete()
        .eq('id', earningId);

      if (error) {
        handleError(error, { customMessage: '删除薪资项目失败' });
        throw error;
      }
      
      return { 
        earningId, 
        payrollId: earning?.payroll_id,
        periodId: earning?.period_id
      };
    },
    onSuccess: async (data) => {
      if (data.payrollId) {
        // 使用统一缓存管理器，自动处理所有相关缓存失效
        await cacheManager.invalidateByEvent('payroll:item:deleted', 
          CacheInvalidationUtils.createPayrollContext(data.payrollId, undefined, data.periodId || undefined)
        );
      }
    },
  });
};

// 计算总收入
export const useCalculateGrossPay = (payrollId: string) => {
  const earningsQuery = usePayrollEarningsBasic(payrollId);
  
  return {
    ...earningsQuery,
    data: earningsQuery.data ? {
      earnings: earningsQuery.data,
      grossPay: earningsQuery.data.reduce((sum, item) => sum + item.amount, 0),
      taxableIncome: earningsQuery.data
        .filter(item => item.is_taxable)
        .reduce((sum, item) => sum + item.amount, 0),
      // v3数据库没有这些字段，使用总收入作为基数
      socialInsuranceBase: earningsQuery.data.reduce((sum, item) => sum + item.amount, 0),
      housingFundBase: earningsQuery.data.reduce((sum, item) => sum + item.amount, 0)
    } : null
  };
};

// 个税计算
export const useCalculateIncomeTax = () => {
  const { handleError } = useErrorHandler();
  
  return useMutation({
    mutationFn: async (params: {
      grossIncome: number;
      socialInsuranceDeduction: number;
      housingFundDeduction: number;
      specialDeductions?: number;
      additionalDeductions?: number;
      previousTaxableIncome?: number;
      previousTax?: number;
      isAnnual?: boolean;
    }): Promise<TaxCalculationResult> => {
      const {
        grossIncome,
        socialInsuranceDeduction = 0,
        housingFundDeduction = 0,
        specialDeductions = 0,
        additionalDeductions = 0,
        previousTaxableIncome = 0,
        previousTax = 0,
        isAnnual = false
      } = params;
      
      // 计算应税收入
      const taxableIncome = grossIncome - socialInsuranceDeduction - housingFundDeduction;
      
      // 计算应纳税所得额
      let taxableAmount = taxableIncome - specialDeductions - additionalDeductions;
      
      // 月度起征点
      const monthlyThreshold = 5000;
      
      if (!isAnnual) {
        // 月度计算
        taxableAmount = Math.max(0, taxableAmount - monthlyThreshold);
      } else {
        // 年度计算
        const annualThreshold = monthlyThreshold * 12;
        taxableAmount = Math.max(0, taxableAmount - annualThreshold);
      }
      
      // 累计计算（适用于年度汇算）
      const accumulatedTaxableAmount = taxableAmount + previousTaxableIncome;
      
      // 个税税率表（年度）
      const taxBrackets = [
        { min: 0, max: 36000, rate: 0.03, quickDeduction: 0 },
        { min: 36000, max: 144000, rate: 0.10, quickDeduction: 2520 },
        { min: 144000, max: 300000, rate: 0.20, quickDeduction: 16920 },
        { min: 300000, max: 420000, rate: 0.25, quickDeduction: 31920 },
        { min: 420000, max: 660000, rate: 0.30, quickDeduction: 52920 },
        { min: 660000, max: 960000, rate: 0.35, quickDeduction: 85920 },
        { min: 960000, max: Infinity, rate: 0.45, quickDeduction: 181920 }
      ];
      
      // 如果是月度计算，将年度税率表转换为月度
      const brackets = isAnnual ? taxBrackets : taxBrackets.map(bracket => ({
        ...bracket,
        min: bracket.min / 12,
        max: bracket.max / 12,
        quickDeduction: bracket.quickDeduction / 12
      }));
      
      // 查找适用税率
      const bracket = brackets.find(b => accumulatedTaxableAmount > b.min && accumulatedTaxableAmount <= b.max) 
        || brackets[brackets.length - 1];
      
      // 计算应纳税额
      const calculatedTax = Math.max(0, accumulatedTaxableAmount * bracket.rate - bracket.quickDeduction);
      const incomeTax = Math.max(0, calculatedTax - previousTax);
      
      return {
        gross_income: grossIncome,
        taxable_income: taxableIncome,
        pre_tax_deductions: socialInsuranceDeduction + housingFundDeduction,
        special_deductions: specialDeductions,
        additional_deductions: additionalDeductions,
        taxable_amount: taxableAmount,
        tax_rate: bracket.rate,
        quick_deduction: bracket.quickDeduction,
        income_tax: incomeTax,
        after_tax_income: grossIncome - socialInsuranceDeduction - housingFundDeduction - incomeTax,
        accumulated_income: accumulatedTaxableAmount,
        accumulated_tax: calculatedTax
      };
    }
  });
};

// 获取专项扣除标准
export const useTaxDeductions = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['tax-deductions'],
    queryFn: async () => {
      // 这里可以从配置表获取，现在返回标准值
      return {
        childEducation: 1000, // 子女教育
        continuingEducation: 400, // 继续教育
        medicalExpenses: 0, // 大病医疗（实际发生）
        housingLoanInterest: 1000, // 住房贷款利息
        housingRent: 1500, // 住房租金（根据城市不同）
        elderlySupport: 2000, // 赡养老人
        infantCare: 1000 // 3岁以下婴幼儿照护
      };
    },
    staleTime: 24 * 60 * 60 * 1000, // 24小时缓存
  });
};

/**
 * 薪资收入管理 Hook 配置选项
 */
interface UsePayrollEarningsOptions {
  payrollId?: string;
  employeeId?: string;
  periodId?: string;
  enableAutoCalculation?: boolean;
}

/**
 * 主薪资收入管理 Hook
 */
export function usePayrollEarnings(options: UsePayrollEarningsOptions = {}) {
  const {
    payrollId,
    employeeId,
    periodId,
    enableAutoCalculation = true
  } = options;

  const queryClient = useQueryClient();

  // 使用各个子Hook
  const componentsQuery = useEarningComponents();
  const earningsQuery = usePayrollEarningsBasic(payrollId || '');
  const employeeHistoryQuery = useEmployeeEarningHistory(employeeId || '', periodId);
  const grossPayCalculation = useCalculateGrossPay(payrollId || '');
  const taxDeductionsQuery = useTaxDeductions();
  
  const createEarningMutation = useCreateEarning();
  const batchCreateMutation = useBatchCreateEarnings();
  const updateEarningMutation = useUpdateEarning();
  const deleteEarningMutation = useDeleteEarning();
  const calculateTaxMutation = useCalculateIncomeTax();

  // 设置实时订阅
  useEffect(() => {
    if (!payrollId) return;

    console.log('[PayrollEarnings] Setting up realtime subscription for payroll:', payrollId);

    const channel = supabase
      .channel(`payroll-earnings-${payrollId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'payroll_items',
          filter: `payroll_id=eq.${payrollId}`
        },
        (payload) => {
          console.log('[PayrollEarnings] Payroll item change detected:', payload.eventType);
          queryClient.invalidateQueries({ 
            queryKey: payrollEarningsQueryKeys.payrollEarnings(payrollId) 
          });
        }
      )
      .subscribe();

    return () => {
      console.log('[PayrollEarnings] Cleaning up realtime subscription');
      channel.unsubscribe();
    };
  }, [payrollId, queryClient]);

  // 应用收入模板
  const applyTemplate = async (templateId: string, payrollIds: string[]) => {
    // 这里可以实现模板应用逻辑
    // 从模板定义中读取收入项配置，然后批量创建
  };

  // 刷新所有数据
  const refresh = async () => {
    const promises = [];
    promises.push(componentsQuery.refetch());
    if (payrollId) {
      promises.push(earningsQuery.refetch());
    }
    if (employeeId) {
      promises.push(employeeHistoryQuery.refetch());
    }
    promises.push(taxDeductionsQuery.refetch());
    await Promise.all(promises);
  };

  return {
    // 数据
    earningComponents: componentsQuery.data || [],
    earnings: earningsQuery.data || [],
    employeeHistory: employeeHistoryQuery.data || [],
    
    // 计算结果
    calculations: grossPayCalculation.data || {
      earnings: [],
      grossPay: 0,
      taxableIncome: 0,
      socialInsuranceBase: 0,
      housingFundBase: 0
    },
    
    // 加载状态
    loading: {
      components: componentsQuery.isLoading,
      earnings: earningsQuery.isLoading,
      employeeHistory: employeeHistoryQuery.isLoading,
      grossPay: grossPayCalculation.isLoading,
      taxDeductions: taxDeductionsQuery.isLoading,
      isLoading: componentsQuery.isLoading || 
                 earningsQuery.isLoading || 
                 employeeHistoryQuery.isLoading
    },

    // 错误状态
    errors: {
      components: componentsQuery.error,
      earnings: earningsQuery.error,
      employeeHistory: employeeHistoryQuery.error,
      grossPay: grossPayCalculation.error,
      taxDeductions: taxDeductionsQuery.error
    },

    // Mutations
    mutations: {
      createEarning: createEarningMutation,
      batchCreate: batchCreateMutation,
      updateEarning: updateEarningMutation,
      deleteEarning: deleteEarningMutation,
      calculateTax: calculateTaxMutation
    },

    // 操作
    actions: {
      refresh,
      createEarning: createEarningMutation.mutate,
      batchCreateEarnings: batchCreateMutation.mutate,
      updateEarning: updateEarningMutation.mutate,
      deleteEarning: deleteEarningMutation.mutate,
      calculateTax: calculateTaxMutation.mutate,
      applyTemplate
    },

    // 个税信息
    taxInfo: {
      deductions: taxDeductionsQuery.data,
      calculateTax: calculateTaxMutation.mutate,
      taxCalculationResult: calculateTaxMutation.data
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
      
      // 按类别分组收入项
      groupEarningsByCategory: (earnings: PayrollEarning[]) => {
        return earnings.reduce((groups, earning) => {
          const category = earning.category;
          if (!groups[category]) {
            groups[category] = [];
          }
          groups[category].push(earning);
          return groups;
        }, {} as Record<string, PayrollEarning[]>);
      },
      
      // 验证收入数据
      validateEarning: (earning: Partial<PayrollEarning>) => {
        const errors = [];
        if (!earning.component_id) errors.push('必须选择收入组件');
        if (!earning.amount || earning.amount <= 0) errors.push('收入金额必须大于0');
        return { isValid: errors.length === 0, errors };
      }
    }
  };
}