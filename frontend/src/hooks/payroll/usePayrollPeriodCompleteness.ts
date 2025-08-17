import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { 
  PayrollPeriodCompleteness, 
  ElementCompleteness
} from '@/types/payroll-completeness';
import { 
  PAYROLL_ELEMENTS_CONFIG,
  PayrollElement 
} from '@/types/payroll-completeness';

// 查询键管理
export const payrollCompletenessQueryKeys = {
  all: ['payroll-completeness'] as const,
  period: (periodId: string) => 
    [...payrollCompletenessQueryKeys.all, 'period', periodId] as const,
  list: () => 
    [...payrollCompletenessQueryKeys.all, 'list'] as const,
};

/**
 * 获取单个薪资周期的四要素完整度
 */
export const usePayrollPeriodCompleteness = (periodId: string) => {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: payrollCompletenessQueryKeys.period(periodId),
    queryFn: async (): Promise<PayrollPeriodCompleteness | null> => {
      const { data, error } = await supabase
        .from('view_payroll_period_completeness')
        .select('*')
        .eq('period_id', periodId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 没有找到记录
          return null;
        }
        handleError(error, { customMessage: '获取周期完整度失败' });
        throw error;
      }

      return data as PayrollPeriodCompleteness;
    },
    enabled: !!periodId,
    staleTime: 30 * 1000, // 30秒缓存
  });
};

/**
 * 获取所有薪资周期的四要素完整度列表
 */
export const usePayrollPeriodsCompleteness = () => {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: payrollCompletenessQueryKeys.list(),
    queryFn: async (): Promise<PayrollPeriodCompleteness[]> => {
      const { data, error } = await supabase
        .from('view_payroll_period_completeness')
        .select('*')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });

      if (error) {
        handleError(error, { customMessage: '获取周期完整度列表失败' });
        throw error;
      }

      return (data || []) as PayrollPeriodCompleteness[];
    },
    staleTime: 60 * 1000, // 60秒缓存
  });
};

/**
 * 将完整度数据转换为要素数组
 */
export function transformToElementsArray(
  completeness: PayrollPeriodCompleteness
): ElementCompleteness[] {
  const elements: ElementCompleteness[] = [
    {
      name: PayrollElement.Earnings,
      displayName: PAYROLL_ELEMENTS_CONFIG[PayrollElement.Earnings].displayName,
      count: completeness.earnings_count,
      total: completeness.total_employees,
      percentage: completeness.earnings_percentage,
      status: completeness.earnings_status,
      icon: PAYROLL_ELEMENTS_CONFIG[PayrollElement.Earnings].icon,
      color: getElementColor(completeness.earnings_status)
    },
    {
      name: PayrollElement.Bases,
      displayName: PAYROLL_ELEMENTS_CONFIG[PayrollElement.Bases].displayName,
      count: completeness.bases_count,
      total: completeness.total_employees,
      percentage: completeness.bases_percentage,
      status: completeness.bases_status,
      icon: PAYROLL_ELEMENTS_CONFIG[PayrollElement.Bases].icon,
      color: getElementColor(completeness.bases_status)
    },
    {
      name: PayrollElement.Category,
      displayName: PAYROLL_ELEMENTS_CONFIG[PayrollElement.Category].displayName,
      count: completeness.category_count,
      total: completeness.total_employees,
      percentage: completeness.category_percentage,
      status: completeness.category_status,
      icon: PAYROLL_ELEMENTS_CONFIG[PayrollElement.Category].icon,
      color: getElementColor(completeness.category_status)
    },
    {
      name: PayrollElement.Job,
      displayName: PAYROLL_ELEMENTS_CONFIG[PayrollElement.Job].displayName,
      count: completeness.job_count,
      total: completeness.total_employees,
      percentage: completeness.job_percentage,
      status: completeness.job_status,
      icon: PAYROLL_ELEMENTS_CONFIG[PayrollElement.Job].icon,
      color: getElementColor(completeness.job_status)
    }
  ];

  return elements;
}

/**
 * 获取要素状态对应的颜色类名
 */
function getElementColor(status: string): string {
  switch (status) {
    case 'complete':
      return 'success';
    case 'partial':
      return 'warning';
    case 'empty':
      return 'error';
    default:
      return 'base-300';
  }
}

/**
 * 计算缺失的要素数量
 */
export function countMissingElements(completeness: PayrollPeriodCompleteness): number {
  let missingCount = 0;
  
  if (completeness.earnings_status !== 'complete') missingCount++;
  if (completeness.bases_status !== 'complete') missingCount++;
  if (completeness.category_status !== 'complete') missingCount++;
  if (completeness.job_status !== 'complete') missingCount++;
  
  return missingCount;
}

/**
 * 获取缺失的要素列表
 */
export function getMissingElements(completeness: PayrollPeriodCompleteness): PayrollElement[] {
  const missing: PayrollElement[] = [];
  
  if (completeness.earnings_status !== 'complete') {
    missing.push(PayrollElement.Earnings);
  }
  if (completeness.bases_status !== 'complete') {
    missing.push(PayrollElement.Bases);
  }
  if (completeness.category_status !== 'complete') {
    missing.push(PayrollElement.Category);
  }
  if (completeness.job_status !== 'complete') {
    missing.push(PayrollElement.Job);
  }
  
  return missing;
}

/**
 * 检查是否可以进行薪资计算
 */
export function canCalculatePayroll(completeness: PayrollPeriodCompleteness): {
  canCalculate: boolean;
  reason?: string;
  missingElements?: PayrollElement[];
} {
  if (completeness.metadata_status === 'complete') {
    return { canCalculate: true };
  }
  
  const missingElements = getMissingElements(completeness);
  
  if (missingElements.length === 0) {
    return { canCalculate: true };
  }
  
  const missingNames = missingElements.map(el => 
    PAYROLL_ELEMENTS_CONFIG[el].displayName
  ).join('、');
  
  return {
    canCalculate: false,
    reason: `以下要素数据不完整：${missingNames}`,
    missingElements
  };
}

/**
 * 主 Hook - 提供完整度相关的所有功能
 */
export function usePayrollCompleteness(periodId?: string) {
  const queryClient = useQueryClient();
  
  // 单个周期完整度
  const periodCompleteness = usePayrollPeriodCompleteness(periodId || '');
  
  // 所有周期完整度列表
  const periodsCompleteness = usePayrollPeriodsCompleteness();
  
  // 刷新数据
  const refresh = async () => {
    const promises = [];
    
    if (periodId) {
      promises.push(
        queryClient.invalidateQueries({ 
          queryKey: payrollCompletenessQueryKeys.period(periodId) 
        })
      );
    }
    
    promises.push(
      queryClient.invalidateQueries({ 
        queryKey: payrollCompletenessQueryKeys.list() 
      })
    );
    
    await Promise.all(promises);
  };
  
  return {
    // 数据
    periodCompleteness: periodCompleteness.data,
    periodsCompleteness: periodsCompleteness.data || [],
    
    // 加载状态
    isLoading: periodCompleteness.isLoading || periodsCompleteness.isLoading,
    
    // 错误状态
    error: periodCompleteness.error || periodsCompleteness.error,
    
    // 工具函数
    transformToElements: transformToElementsArray,
    countMissingElements,
    getMissingElements,
    canCalculatePayroll,
    
    // 操作
    refresh
  };
}