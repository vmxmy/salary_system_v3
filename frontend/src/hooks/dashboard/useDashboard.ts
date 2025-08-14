import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';

/**
 * Dashboard 统计数据类型
 */
export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  terminatedEmployees: number;
  newEmployeesThisMonth: number;
  totalDepartments: number;
  newDepartmentsThisMonth: number;
  totalPositions: number;
  lastPayrollTotal: number;
  lastPayrollDate: string | null;
  lastPayrollEmployeeCount: number;
  nextPayrollDate: string;
  daysUntilNextPayroll: number;
}

/**
 * 最近活动类型
 */
export interface RecentActivity {
  activityType: 'new_employee' | 'payroll_completed' | 'department_created';
  entityName: string;
  activityDate: string;
  additionalInfo: string | null;
}

/**
 * 月度薪资趋势类型
 */
export interface MonthlyPayrollTrend {
  month: string;
  employeeCount: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  avgNetPay: number;
}

/**
 * Dashboard 查询键管理
 */
export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardQueryKeys.all, 'stats'] as const,
  activities: () => [...dashboardQueryKeys.all, 'activities'] as const,
  trends: () => [...dashboardQueryKeys.all, 'trends'] as const,
  monthlyTrends: () => [...dashboardQueryKeys.all, 'monthly-trends'] as const,
};

/**
 * Dashboard Hook 配置选项
 */
interface UseDashboardOptions {
  enableRealtime?: boolean;
  refetchInterval?: number;
}

/**
 * Dashboard 数据管理 Hook
 * 提供仪表板所需的统计数据、活动记录和趋势分析
 */
export function useDashboard(options: UseDashboardOptions = {}) {
  const {
    enableRealtime = true,
    refetchInterval = 60000, // 默认每分钟刷新
  } = options;

  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const subscriptionRef = useRef<any>(null);

  // 获取仪表板统计数据
  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: dashboardQueryKeys.stats(),
    queryFn: async (): Promise<DashboardStats> => {
      const { data, error } = await supabase
        .from('view_dashboard_stats')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
      }

      return {
        totalEmployees: data?.total_employees || 0,
        activeEmployees: data?.active_employees || 0,
        terminatedEmployees: data?.terminated_employees || 0,
        newEmployeesThisMonth: data?.new_employees_this_month || 0,
        totalDepartments: data?.total_departments || 0,
        newDepartmentsThisMonth: data?.new_departments_this_month || 0,
        totalPositions: data?.total_positions || 0,
        lastPayrollTotal: data?.last_payroll_total || 0,
        lastPayrollDate: data?.last_payroll_date,
        lastPayrollEmployeeCount: data?.last_payroll_employee_count || 0,
        nextPayrollDate: data?.next_payroll_date,
        daysUntilNextPayroll: data?.days_until_next_payroll || 0,
      };
    },
    refetchInterval,
    staleTime: 30000, // 30秒缓存
  });

  // 获取最近活动
  const {
    data: activities = [],
    isLoading: isLoadingActivities,
    error: activitiesError,
    refetch: refetchActivities,
  } = useQuery({
    queryKey: dashboardQueryKeys.activities(),
    queryFn: async (): Promise<RecentActivity[]> => {
      const { data, error } = await supabase
        .from('view_recent_activities')
        .select('*')
        .order('activity_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching recent activities:', error);
        throw error;
      }

      return (data || []).map(activity => ({
        activityType: activity.activity_type,
        entityName: activity.entity_name,
        activityDate: activity.activity_date,
        additionalInfo: activity.additional_info,
      }));
    },
    refetchInterval: refetchInterval * 2, // 活动数据刷新频率减半
    staleTime: 60000, // 1分钟缓存
  });

  // 月度薪资趋势功能暂时禁用，因为数据库中没有对应视图
  // TODO: 创建 view_monthly_payroll_trend 视图后启用此功能
  const monthlyTrends: MonthlyPayrollTrend[] = [];
  const isLoadingTrends = false;
  const trendsError = null;
  const refetchTrends = async () => {};

  // 设置实时订阅
  useEffect(() => {
    if (!enableRealtime) return;

    console.log('[Dashboard] Setting up realtime subscriptions');

    // 订阅员工变更
    const employeeChannel = supabase
      .channel('dashboard-employees')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employees' },
        (payload) => {
          console.log('[Dashboard] Employee change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats() });
          queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.activities() });
        }
      );

    // 订阅部门变更
    const departmentChannel = supabase
      .channel('dashboard-departments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'departments' },
        (payload) => {
          console.log('[Dashboard] Department change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats() });
          if (payload.eventType === 'INSERT') {
            queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.activities() });
          }
        }
      );

    // 订阅薪资变更
    const payrollChannel = supabase
      .channel('dashboard-payroll')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payroll' },
        (payload) => {
          console.log('[Dashboard] Payroll change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats() });
          queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.monthlyTrends() });
          if (payload.eventType === 'INSERT') {
            queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.activities() });
          }
        }
      );

    // 启动订阅
    Promise.all([
      employeeChannel.subscribe(),
      departmentChannel.subscribe(),
      payrollChannel.subscribe(),
    ]).then(() => {
      console.log('[Dashboard] Realtime subscriptions active');
    });

    // 清理函数
    return () => {
      console.log('[Dashboard] Cleaning up realtime subscriptions');
      employeeChannel.unsubscribe();
      departmentChannel.unsubscribe();
      payrollChannel.unsubscribe();
    };
  }, [enableRealtime, queryClient]);

  // 刷新所有数据
  const refreshAll = async () => {
    await Promise.all([
      refetchStats(),
      refetchActivities(),
      // refetchTrends(), // 暂时禁用
    ]);
  };

  // 错误处理
  useEffect(() => {
    if (statsError) {
      handleError(statsError, { customMessage: '获取统计数据失败' });
    }
    if (activitiesError) {
      handleError(activitiesError, { customMessage: '获取活动记录失败' });
    }
    // trendsError 暂时禁用
  }, [statsError, activitiesError, handleError]);

  // 计算衍生数据
  const derivedData = {
    // 员工变化率
    employeeGrowthRate: stats ? 
      ((stats.newEmployeesThisMonth / Math.max(stats.totalEmployees - stats.newEmployeesThisMonth, 1)) * 100).toFixed(1) : '0',
    
    // 在职率
    activeEmployeeRate: stats ? 
      ((stats.activeEmployees / Math.max(stats.totalEmployees, 1)) * 100).toFixed(1) : '0',
    
    // 平均薪资（最近一次）
    averageLastPayroll: stats && stats.lastPayrollEmployeeCount > 0 ? 
      Math.round(stats.lastPayrollTotal / stats.lastPayrollEmployeeCount) : 0,
    
    // 薪资趋势方向（对比上月）
    payrollTrend: monthlyTrends.length >= 2 ? 
      monthlyTrends[0].totalNetPay > monthlyTrends[1].totalNetPay ? 'up' : 'down' : 'stable',
  };

  return {
    // 数据
    stats,
    activities,
    monthlyTrends,
    derivedData,

    // 加载状态
    loading: {
      isLoading: isLoadingStats || isLoadingActivities || isLoadingTrends,
      isLoadingStats,
      isLoadingActivities,
      isLoadingTrends,
    },

    // 错误状态
    error: statsError || activitiesError || trendsError,
    errors: {
      statsError,
      activitiesError,
      trendsError,
    },

    // 操作
    actions: {
      refresh: refreshAll,
      refreshStats: refetchStats,
      refreshActivities: refetchActivities,
      refreshTrends: refetchTrends,
    },
  };
}

/**
 * 格式化工具函数
 */
export const dashboardFormatters = {
  // 格式化货币
  currency: (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },

  // 格式化日期
  date: (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    } catch {
      return '-';
    }
  },

  // 格式化相对时间
  relativeTime: (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return '今天';
      if (diffDays === 1) return '昨天';
      if (diffDays < 7) return `${diffDays}天前`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
      
      return `${Math.floor(diffDays / 365)}年前`;
    } catch {
      return dateStr;
    }
  },

  // 格式化活动消息
  activityMessage: (activity: RecentActivity) => {
    switch (activity.activityType) {
      case 'new_employee':
        return `新员工 ${activity.entityName} 入职${activity.additionalInfo ? ` (${activity.additionalInfo})` : ''}`;
      case 'payroll_completed':
        return `${activity.entityName} 薪资发放完成${activity.additionalInfo ? ` (${activity.additionalInfo})` : ''}`;
      case 'department_created':
        return `创建新部门 ${activity.entityName}`;
      default:
        return activity.entityName;
    }
  },

  // 格式化百分比
  percentage: (value: number | string, decimals: number = 1) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${num.toFixed(decimals)}%`;
  },

  // 格式化数字（带千分位）
  number: (value: number) => {
    return new Intl.NumberFormat('zh-CN').format(value);
  },
};