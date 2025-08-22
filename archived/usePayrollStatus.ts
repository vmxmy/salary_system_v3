import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// 薪资状态配置类型
export interface PayrollStatusConfig {
  value: string;
  label: string;
  description?: string;
  color: 'default' | 'info' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
}

// 状态标签映射（中文显示）
const statusLabels: Record<string, string> = {
  draft: '草稿',
  calculating: '计算中',
  calculated: '已计算',
  pending: '待审批',
  approved: '已审批',
  paid: '已发放',
  cancelled: '已取消'
};

// 状态描述映射
const statusDescriptions: Record<string, string> = {
  draft: '薪资记录已创建，尚未进行计算',
  calculating: '正在进行薪资计算',
  calculated: '薪资计算完成，待提交审批',
  pending: '已提交审批，等待审批结果',
  approved: '审批通过，可以发放薪资',
  paid: '薪资已发放给员工',
  cancelled: '薪资记录已取消'
};

// 状态颜色映射
const statusColors: Record<string, PayrollStatusConfig['color']> = {
  draft: 'default',
  calculating: 'warning',
  calculated: 'info',
  pending: 'warning',
  approved: 'success',
  paid: 'success',
  cancelled: 'error'
};

/**
 * 从数据库动态获取薪资状态枚举值
 */
const fetchPayrollStatusEnum = async (): Promise<string[]> => {
  try {
    // 使用直接查询 pg_enum 的方式获取枚举值
    const { data, error } = await supabase
      .from('pg_enum')
      .select('enumlabel')
      .eq('enumtypid', (
        await supabase
          .from('pg_type')
          .select('oid')
          .eq('typname', 'payroll_status')
          .single()
      ).data?.oid)
      .order('enumsortorder');

    if (error) {
      console.warn('获取薪资状态枚举失败，使用默认值:', error);
      // 降级方案：使用已知的状态值
      return ['draft', 'calculating', 'calculated', 'pending', 'approved', 'paid', 'cancelled'];
    }

    return data?.map(item => item.enumlabel) || ['draft', 'calculating', 'calculated', 'pending', 'approved', 'paid', 'cancelled'];
  } catch (error) {
    console.warn('获取薪资状态枚举异常，使用默认值:', error);
    // 降级方案：使用已知的状态值
    return ['draft', 'calculating', 'calculated', 'pending', 'approved', 'paid', 'cancelled'];
  }
};

/**
 * 薪资状态管理 Hook
 * 提供动态获取的状态枚举值和相关配置
 */
export const usePayrollStatus = () => {
  // 获取数据库中的状态枚举值
  const {
    data: statusValues = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['payroll', 'status-enum'],
    queryFn: fetchPayrollStatusEnum,
    staleTime: 1000 * 60 * 60, // 1小时缓存
    retry: 2,
    retryDelay: 1000
  });

  /**
   * 将状态值转换为完整的状态配置
   */
  const getStatusConfigs = (): PayrollStatusConfig[] => {
    return statusValues.map(value => ({
      value,
      label: statusLabels[value] || value,
      description: statusDescriptions[value],
      color: statusColors[value] || 'default'
    }));
  };

  /**
   * 获取状态标签
   */
  const getStatusLabel = (status: string): string => {
    return statusLabels[status] || status;
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: string): PayrollStatusConfig['color'] => {
    return statusColors[status] || 'default';
  };

  /**
   * 获取状态描述
   */
  const getStatusDescription = (status: string): string => {
    return statusDescriptions[status] || '';
  };

  /**
   * 检查状态是否存在
   */
  const isValidStatus = (status: string): boolean => {
    return statusValues.includes(status);
  };

  /**
   * 获取用于下拉选择的选项（包含"全部状态"选项）
   */
  const getSelectOptions = (includeAll = true) => {
    const options = getStatusConfigs().map(config => ({
      value: config.value,
      label: config.label,
      description: config.description
    }));

    if (includeAll) {
      return [
        { value: 'all', label: '全部状态', description: '显示所有状态的薪资记录' },
        ...options
      ];
    }

    return options;
  };

  /**
   * 获取状态的图标（可扩展）
   */
  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      draft: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      calculating: (
        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      calculated: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      pending: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      approved: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      paid: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      cancelled: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    };

    return icons[status] || null;
  };

  return {
    // 数据
    statusValues,
    statusConfigs: getStatusConfigs(),
    selectOptions: getSelectOptions(),
    
    // 状态
    isLoading,
    error,
    
    // 方法
    getStatusLabel,
    getStatusColor,
    getStatusDescription,
    getStatusIcon,
    getSelectOptions,
    isValidStatus,
    refetch,
    
    // 原始状态映射（向后兼容）
    PayrollStatus: Object.fromEntries(
      statusValues.map(status => [status.toUpperCase(), status])
    ) as Record<string, string>
  };
};

/**
 * 简化版 Hook - 仅获取状态选项用于下拉列表
 */
export const usePayrollStatusOptions = () => {
  const { selectOptions, isLoading, error } = usePayrollStatus();
  
  return {
    options: selectOptions,
    isLoading,
    error
  };
};

// 导出类型
export type { PayrollStatusConfig };