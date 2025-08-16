import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// 审批历史项数据类型
export interface ApprovalHistoryItem {
  id: string;
  payroll_id: string;
  action: string;
  from_status: string;
  to_status: string;
  operator_id?: string;
  operator_name?: string;
  comments?: string;
  created_at: string;
  
  // 员工信息
  employee_name?: string;
  id_number?: string;
  
  // 薪资信息
  pay_date?: string;
  gross_pay?: number;
  net_pay?: number;
  period_id?: string;
  
  // 薪资周期信息
  period_name?: string;
  pay_month?: string;
  pay_month_string?: string;
}

// 筛选参数
export interface ApprovalHistoryFilters {
  periodId?: string;
  employeeId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

// 获取审批历史数据
async function fetchApprovalHistory(filters: ApprovalHistoryFilters = {}): Promise<ApprovalHistoryItem[]> {
  let query = (supabase as any)
    .from('view_approval_history')
    .select('*');

  // 应用筛选条件
  if (filters.periodId) {
    query = query.eq('period_id', filters.periodId);
  }

  if (filters.employeeId) {
    query = query.eq('employee_id', filters.employeeId);
  }

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  // 分页
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.offset) {
    query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
  }

  // 按时间倒序排列
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []) as ApprovalHistoryItem[];
}

// 获取审批历史统计信息
async function fetchApprovalHistoryStats(filters: ApprovalHistoryFilters = {}) {
  let query = (supabase as any)
    .from('view_approval_history')
    .select('action', { count: 'exact' });

  // 应用相同的筛选条件
  if (filters.periodId) {
    query = query.eq('period_id', filters.periodId);
  }

  if (filters.employeeId) {
    query = query.eq('employee_id', filters.employeeId);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return {
    totalCount: count || 0,
  };
}

// 操作类型配置
export const ACTION_CONFIG = {
  approve: {
    label: '审批通过',
    icon: '✅',
    color: 'success',
    bgColor: 'bg-success/10',
  },
  reject: {
    label: '驳回',
    icon: '❌',
    color: 'error',
    bgColor: 'bg-error/10',
  },
  pay: {
    label: '标记发放',
    icon: '💰',
    color: 'info',
    bgColor: 'bg-info/10',
  },
  cancel: {
    label: '取消',
    icon: '🚫',
    color: 'warning',
    bgColor: 'bg-warning/10',
  },
  create: {
    label: '创建',
    icon: '📝',
    color: 'primary',
    bgColor: 'bg-primary/10',
  },
  update: {
    label: '更新',
    icon: '✏️',
    color: 'secondary',
    bgColor: 'bg-secondary/10',
  },
} as const;

// 获取操作类型配置
export const getActionConfig = (action: string) => {
  return ACTION_CONFIG[action as keyof typeof ACTION_CONFIG] || {
    label: action,
    icon: '📋',
    color: 'neutral',
    bgColor: 'bg-neutral/10',
  };
};

// 格式化状态标签
export const formatStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    approved: '已审批',
    paid: '已发放',
    cancelled: '已取消',
    rejected: '已驳回',
  };
  return statusMap[status] || status;
};

// Hook: 获取审批历史列表
export function useApprovalHistory(filters: ApprovalHistoryFilters = {}) {
  return useQuery({
    queryKey: ['approval-history', filters],
    queryFn: () => fetchApprovalHistory(filters),
    staleTime: 1000 * 60 * 5, // 5分钟内不重新获取
    retry: 2,
  });
}

// Hook: 获取审批历史统计
export function useApprovalHistoryStats(filters: ApprovalHistoryFilters = {}) {
  return useQuery({
    queryKey: ['approval-history-stats', filters],
    queryFn: () => fetchApprovalHistoryStats(filters),
    staleTime: 1000 * 60 * 5, // 5分钟内不重新获取
    retry: 2,
  });
}

// Hook: 获取指定薪资记录的审批历史
export function usePayrollApprovalHistory(payrollId: string) {
  return useApprovalHistory({
    // Note: 需要根据实际需求调整筛选逻辑
    limit: 100, // 单个薪资记录的历史不会太多
  });
}

// Hook: 获取指定周期的审批历史
export function usePeriodApprovalHistory(periodId: string, options: Omit<ApprovalHistoryFilters, 'periodId'> = {}) {
  return useApprovalHistory({
    periodId,
    ...options,
  });
}

// Hook: 获取指定员工的审批历史
export function useEmployeeApprovalHistory(employeeId: string, options: Omit<ApprovalHistoryFilters, 'employeeId'> = {}) {
  return useApprovalHistory({
    employeeId,
    ...options,
  });
}