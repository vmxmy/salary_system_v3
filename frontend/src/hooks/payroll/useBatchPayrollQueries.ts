/**
 * 批量薪资查询优化Hook
 * 专门用于解决大量单独查询导致的性能问题
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';

// 查询键管理
export const batchPayrollQueryKeys = {
  all: ['batch-payroll'] as const,
  details: (payrollIds: string[]) => [...batchPayrollQueryKeys.all, 'details', payrollIds.sort().join(',')] as const,
  insurance: (payrollIds: string[]) => [...batchPayrollQueryKeys.all, 'insurance', payrollIds.sort().join(',')] as const,
  summary: (payrollIds: string[]) => [...batchPayrollQueryKeys.all, 'summary', payrollIds.sort().join(',')] as const,
  employees: (employeeIds: string[]) => [...batchPayrollQueryKeys.all, 'employees', employeeIds.sort().join(',')] as const,
};

/**
 * 批量获取薪资详情 - 优化版本
 * 替代多次调用 usePayrollDetails
 */
export const useBatchPayrollDetails = (payrollIds: string[]) => {
  const { handleError } = useErrorHandler();
  
  // 排序ID以确保查询键稳定性
  const sortedIds = useMemo(() => 
    payrollIds.filter(id => id && typeof id === 'string').sort(),
    [payrollIds]
  );

  return useQuery({
    queryKey: batchPayrollQueryKeys.details(sortedIds),
    queryFn: async (): Promise<Record<string, any[]>> => {
      if (!sortedIds.length) return {};

      // 使用单个批量查询替代多个单独查询
      const { data, error } = await supabase
        .from('view_payroll_unified')
        .select('*')
        .in('payroll_id', sortedIds)
        .not('item_id', 'is', null)
        .order('payroll_id')
        .order('category')
        .order('component_name');

      if (error) {
        handleError(error, { customMessage: '批量获取薪资详情失败' });
        throw error;
      }

      // 按薪资ID分组返回结果
      const grouped = (data || []).reduce((acc, item) => {
        const payrollId = item?.payroll_id;
        if (payrollId && !acc[payrollId]) {
          acc[payrollId] = [];
        }
        if (payrollId) {
          acc[payrollId].push(item);
        }
        return acc;
      }, {} as Record<string, any[]>);

      return grouped;
    },
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5分钟
    gcTime: 10 * 60 * 1000, // 10分钟
  });
};

/**
 * 批量获取薪资汇总信息
 * 优化多次查询薪资基本信息的场景
 */
export const useBatchPayrollSummary = (payrollIds: string[]) => {
  const { handleError } = useErrorHandler();
  
  const sortedIds = useMemo(() => 
    payrollIds.filter(id => id && typeof id === 'string').sort(),
    [payrollIds]
  );

  return useQuery({
    queryKey: batchPayrollQueryKeys.summary(sortedIds),
    queryFn: async () => {
      if (!sortedIds.length) return {};

      const { data, error } = await supabase
        .from('view_payroll_summary')
        .select('*')
        .in('payroll_id', sortedIds);

      if (error) {
        handleError(error, { customMessage: '批量获取薪资汇总失败' });
        throw error;
      }

      // 转换为Map以便快速查找
      const summaryMap = new Map();
      (data || []).forEach(item => {
        summaryMap.set(item.payroll_id, item);
      });

      return summaryMap;
    },
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 批量获取员工五险一金信息
 * 优化逐个查询保险详情的性能问题
 */
export const useBatchEmployeeInsurance = (payrollIds: string[]) => {
  const { handleError } = useErrorHandler();
  
  const sortedIds = useMemo(() => 
    payrollIds.filter(id => id && typeof id === 'string').sort(),
    [payrollIds]
  );

  return useQuery({
    queryKey: batchPayrollQueryKeys.insurance(sortedIds),
    queryFn: async (): Promise<Record<string, any[]>> => {
      if (!sortedIds.length) return {};

      // 批量获取五险一金相关的薪资项目
      const { data: insuranceData, error: insuranceError } = await supabase
        .from('view_payroll_unified')
        .select('*')
        .in('payroll_id', sortedIds)
        .in('category', ['personal_insurance', 'employer_insurance']);

      if (insuranceError) {
        handleError(insuranceError, { customMessage: '批量获取保险信息失败' });
        throw insuranceError;
      }

      // 获取保险类型配置
      const { data: insuranceTypes, error: typesError } = await supabase
        .from('insurance_types')
        .select('*')
        .eq('is_active', true)
        .order('system_key');

      if (typesError) {
        handleError(typesError, { customMessage: '获取保险类型失败' });
        throw typesError;
      }

      // 按薪资ID分组保险数据
      const grouped = (insuranceData || []).reduce((acc, item) => {
        const payrollId = item?.payroll_id;
        if (payrollId && !acc[payrollId]) {
          acc[payrollId] = [];
        }
        if (payrollId) {
          acc[payrollId].push(item);
        }
        return acc;
      }, {} as Record<string, any[]>);

      // 为每个薪资记录构建完整的保险信息
      const result: Record<string, any[]> = {};
      
      sortedIds.forEach(payrollId => {
        const payrollInsurance = grouped[payrollId] || [];
        
        result[payrollId] = (insuranceTypes || []).map(insuranceType => {
          const employeeItem = payrollInsurance.find(item => 
            item.insurance_type_key === insuranceType.system_key && 
            item.is_employer_contribution === false
          );
          
          const employerItem = payrollInsurance.find(item => 
            item.insurance_type_key === insuranceType.system_key && 
            item.is_employer_contribution === true
          );

          return {
            id: `${payrollId}-${insuranceType.id}`,
            payroll_id: payrollId,
            insurance_type_id: insuranceType.id,
            employee_amount: employeeItem?.amount || 0,
            employer_amount: employerItem?.amount || 0,
            is_applicable: !!(employeeItem || employerItem),
            insurance_type: insuranceType
          };
        });
      });

      return result;
    },
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 批量获取员工基本信息
 * 优化重复查询员工信息的场景
 */
export const useBatchEmployeeInfo = (employeeIds: string[]) => {
  const { handleError } = useErrorHandler();
  
  const sortedIds = useMemo(() => 
    [...new Set(employeeIds)].filter(id => id && typeof id === 'string').sort(),
    [employeeIds]
  );

  return useQuery({
    queryKey: batchPayrollQueryKeys.employees(sortedIds),
    queryFn: async () => {
      if (!sortedIds.length) return new Map();

      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          employee_name,
          id_number,
          hire_date,
          employment_status
        `)
        .in('id', sortedIds);

      if (error) {
        handleError(error, { customMessage: '批量获取员工信息失败' });
        throw error;
      }

      // 转换为Map以便快速查找
      const employeeMap = new Map();
      (data || []).forEach((employee: any) => {
        employeeMap.set(employee.id, employee);
      });

      return employeeMap;
    },
    enabled: sortedIds.length > 0,
    staleTime: 10 * 60 * 1000, // 员工信息相对稳定，缓存时间更长
  });
};

/**
 * 高级批量查询Hook - 同时获取多种相关数据
 * 适用于需要薪资详情、汇总和保险信息的综合场景
 */
export const useBatchPayrollComplete = (payrollIds: string[]) => {
  const detailsQuery = useBatchPayrollDetails(payrollIds);
  const summaryQuery = useBatchPayrollSummary(payrollIds);
  const insuranceQuery = useBatchEmployeeInsurance(payrollIds);

  const isLoading = detailsQuery.isLoading || summaryQuery.isLoading || insuranceQuery.isLoading;
  const isError = detailsQuery.isError || summaryQuery.isError || insuranceQuery.isError;
  const error = detailsQuery.error || summaryQuery.error || insuranceQuery.error;

  return {
    // 数据
    details: detailsQuery.data || {},
    summary: summaryQuery.data || new Map(),
    insurance: insuranceQuery.data || {},
    
    // 状态
    isLoading,
    isError,
    error,
    
    // 单独的查询状态（用于细粒度控制）
    queries: {
      details: detailsQuery,
      summary: summaryQuery,
      insurance: insuranceQuery,
    },

    // 刷新所有数据
    refetchAll: () => {
      detailsQuery.refetch();
      summaryQuery.refetch();
      insuranceQuery.refetch();
    }
  };
};

/**
 * 智能批量查询管理器
 * 根据查询需求自动选择最优的批量查询策略
 */
export const useSmartBatchPayroll = (config: {
  payrollIds: string[];
  includeDetails?: boolean;
  includeSummary?: boolean;
  includeInsurance?: boolean;
  batchSize?: number; // 批量大小，默认50
}) => {
  const {
    payrollIds,
    includeDetails = true,
    includeSummary = true,
    includeInsurance = false,
    batchSize = 50
  } = config;

  // 如果ID数量过多，分批处理
  const shouldUseBatching = payrollIds.length > batchSize;
  
  const primaryBatch = payrollIds.slice(0, batchSize);
  const remainingIds = payrollIds.slice(batchSize);

  // 主批次查询
  const primaryQuery = useBatchPayrollComplete(primaryBatch);
  
  // 剩余批次查询（如果需要）
  const secondaryQuery = useBatchPayrollComplete(
    shouldUseBatching ? remainingIds : []
  );

  // 合并结果
  const combinedData = useMemo(() => {
    if (!shouldUseBatching) return primaryQuery;

    const primarySummary = primaryQuery.summary instanceof Map ? primaryQuery.summary : new Map();
    const secondarySummary = secondaryQuery.summary instanceof Map ? secondaryQuery.summary : new Map();
    
    return {
      details: { ...(primaryQuery.details || {}), ...(secondaryQuery.details || {}) },
      summary: new Map([
        ...Array.from(primarySummary.entries()),
        ...Array.from(secondarySummary.entries())
      ]),
      insurance: { ...(primaryQuery.insurance || {}), ...(secondaryQuery.insurance || {}) },
      isLoading: primaryQuery.isLoading || secondaryQuery.isLoading,
      isError: primaryQuery.isError || secondaryQuery.isError,
      error: primaryQuery.error || secondaryQuery.error,
      refetchAll: () => {
        primaryQuery.refetchAll?.();
        secondaryQuery.refetchAll?.();
      }
    };
  }, [primaryQuery, secondaryQuery, shouldUseBatching]);

  return combinedData;
};

// 导出常用的批量查询配置
export const BATCH_QUERY_CONFIGS = {
  // 薪资列表页面
  PAYROLL_LIST: {
    includeDetails: false,
    includeSummary: true,
    includeInsurance: false,
    batchSize: 100,
  },
  
  // 薪资详情页面
  PAYROLL_DETAIL: {
    includeDetails: true,
    includeSummary: true,
    includeInsurance: true,
    batchSize: 20,
  },
  
  // 薪资导出
  PAYROLL_EXPORT: {
    includeDetails: true,
    includeSummary: true,
    includeInsurance: true,
    batchSize: 50,
  },
  
  // 薪资计算
  PAYROLL_CALCULATION: {
    includeDetails: true,
    includeSummary: false,
    includeInsurance: false,
    batchSize: 30,
  },
};