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
  scheduled_pay_date?: string;
  actual_pay_date?: string;
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
  // 从审批日志表获取基础数据
  let logsQuery = supabase
    .from('payroll_approval_logs')
    .select(`
      id,
      payroll_id,
      action,
      from_status,
      to_status,
      operator_id,
      operator_name,
      comments,
      created_at
    `);

  // 应用筛选条件
  if (filters.action) {
    logsQuery = logsQuery.eq('action', filters.action);
  }

  if (filters.dateFrom) {
    logsQuery = logsQuery.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    logsQuery = logsQuery.lte('created_at', filters.dateTo);
  }

  // 分页
  if (filters.limit) {
    logsQuery = logsQuery.limit(filters.limit);
  }

  if (filters.offset) {
    logsQuery = logsQuery.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
  }

  // 按时间倒序排列
  logsQuery = logsQuery.order('created_at', { ascending: false });

  const { data: logsData, error: logsError } = await logsQuery;

  if (logsError) {
    throw logsError;
  }

  if (!logsData || logsData.length === 0) {
    return [];
  }

  // 获取关联的薪资信息和员工信息
  const payrollIds = [...new Set(logsData.map(log => log.payroll_id))];
  
  let payrollsData: any[] = [];
  let payrollsError: any = null;
  
  // 分批查询避免URL过长
  const batchSize = 20;
  for (let i = 0; i < payrollIds.length; i += batchSize) {
    const batch = payrollIds.slice(i, i + batchSize);
    
    const { data: batchData, error: batchError } = await supabase
      .from('view_payroll_summary')
      .select(`
        payroll_id,
        employee_id,
        employee_name,
        id_number,
        scheduled_pay_date,
        actual_pay_date,
        gross_pay,
        net_pay,
        period_id,
        period_name
      `)
      .in('payroll_id', batch);

    if (batchError) {
      payrollsError = batchError;
      break;
    }
    
    if (batchData) {
      payrollsData.push(...batchData);
    }
  }

  if (payrollsError) {
    console.warn('薪资信息查询失败:', payrollsError);
  }

  // 组合数据
  const payrollMap = new Map(
    (payrollsData || []).map(p => [p.payroll_id, p])
  );

  const combinedData = logsData.map(log => ({
    ...log,
    ...(payrollMap.get(log.payroll_id) || {})
  }));

  // 应用薪资相关的筛选条件
  let filteredData = combinedData;

  if (filters.periodId) {
    filteredData = filteredData.filter(item => item.period_id === filters.periodId);
  }

  if (filters.employeeId) {
    filteredData = filteredData.filter(item => item.employee_id === filters.employeeId);
  }

  return filteredData as ApprovalHistoryItem[];
}

// 获取审批历史统计信息
async function fetchApprovalHistoryStats(filters: ApprovalHistoryFilters = {}) {
  // 从审批日志表获取统计
  let query = supabase
    .from('payroll_approval_logs')
    .select('action', { count: 'exact' });

  // 应用筛选条件
  if (filters.action) {
    query = query.eq('action', filters.action);
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

// 操作类型配置 - 匹配数据库约束的操作类型
export const ACTION_CONFIG = {
  // 审批通过操作
  approve: {
    label: '审批通过',
    icon: '✅',
    color: 'success',
    bgColor: 'bg-success/10',
  },
  
  // 驳回操作
  reject: {
    label: '驳回',
    icon: '❌',
    color: 'error',
    bgColor: 'bg-error/10',
  },
  
  // 标记发放操作 (数据库中为 'pay')
  pay: {
    label: '标记发放',
    icon: '💰',
    color: 'accent',
    bgColor: 'bg-accent/10',
  },
  
  // 取消操作 (包含回滚)
  cancel: {
    label: '取消/回滚',
    icon: '🚫',
    color: 'warning',
    bgColor: 'bg-warning/10',
  },
  
  // 提交审批操作
  submit: {
    label: '提交审批',
    icon: '📤',
    color: 'info',
    bgColor: 'bg-info/10',
  },
  
  // 薪资计算操作
  calculate: {
    label: '薪资计算',
    icon: '🧮',
    color: 'primary',
    bgColor: 'bg-primary/10',
  },
  
  // 五险一金计算操作
  calculate_insurance: {
    label: '五险一金计算',
    icon: '🛡️',
    color: 'secondary',
    bgColor: 'bg-secondary/10',
  },
  
  // 兼容性映射 - 用于前端显示
  markPaid: {
    label: '标记发放',
    icon: '💰',
    color: 'accent',
    bgColor: 'bg-accent/10',
  },
  
  rollback: {
    label: '回滚',
    icon: '↩️',
    color: 'warning',
    bgColor: 'bg-warning/10',
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

// 格式化状态标签 - 当前系统支持的状态
export const formatStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    calculating: '计算中',
    calculated: '已计算',
    approved: '已审批',
    paid: '已发放',
    cancelled: '已取消',
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