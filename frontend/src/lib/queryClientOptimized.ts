import { QueryClient } from '@tanstack/react-query';

/**
 * 优化的 QueryClient 配置
 * 基于数据特性进行分层缓存策略
 */

// 缓存策略枚举
export const CACHE_STRATEGIES = {
  // 静态数据：部门、职位等（缓存时间长）
  STATIC: {
    staleTime: 30 * 60 * 1000, // 30分钟
    gcTime: 60 * 60 * 1000,    // 1小时
  },
  // 员工数据：相对稳定（中等缓存时间）
  EMPLOYEE: {
    staleTime: 15 * 60 * 1000, // 15分钟
    gcTime: 30 * 60 * 1000,    // 30分钟
  },
  // 薪资数据：更新较频繁（短缓存时间）
  PAYROLL: {
    staleTime: 5 * 60 * 1000,  // 5分钟
    gcTime: 15 * 60 * 1000,    // 15分钟
  },
  // 实时统计：需要最新数据（最短缓存时间）
  STATISTICS: {
    staleTime: 2 * 60 * 1000,  // 2分钟
    gcTime: 5 * 60 * 1000,     // 5分钟
  },
  // 仪表盘数据：平衡性能和实时性
  DASHBOARD: {
    staleTime: 3 * 60 * 1000,  // 3分钟
    gcTime: 10 * 60 * 1000,    // 10分钟
  },
} as const;

// 查询键常量
export const QUERY_KEYS = {
  // 员工相关
  EMPLOYEES: {
    all: ['employees'] as const,
    list: () => [...QUERY_KEYS.EMPLOYEES.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.EMPLOYEES.all, 'detail', id] as const,
    optimized: () => [...QUERY_KEYS.EMPLOYEES.all, 'optimized'] as const,
  },
  // 薪资相关
  PAYROLLS: {
    all: ['payrolls'] as const,
    list: (month?: string) => [...QUERY_KEYS.PAYROLLS.all, 'list', month] as const,
    detail: (id: string) => [...QUERY_KEYS.PAYROLLS.all, 'detail', id] as const,
    optimized: (month?: string) => [...QUERY_KEYS.PAYROLLS.all, 'optimized', month] as const,
    summary: (month?: string) => [...QUERY_KEYS.PAYROLLS.all, 'summary', month] as const,
  },
  // 统计相关
  STATISTICS: {
    all: ['statistics'] as const,
    monthly: () => [...QUERY_KEYS.STATISTICS.all, 'monthly'] as const,
    department: (month?: string) => [...QUERY_KEYS.STATISTICS.all, 'department', month] as const,
    dashboard: () => [...QUERY_KEYS.STATISTICS.all, 'dashboard'] as const,
  },
  // 基础数据
  MASTER_DATA: {
    departments: ['departments'] as const,
    positions: ['positions'] as const,
    salaryComponents: ['salary-components'] as const,
  },
} as const;

// 创建优化的 QueryClient
export const queryClientOptimized = new QueryClient({
  defaultOptions: {
    queries: {
      // 默认配置：使用薪资数据策略
      staleTime: CACHE_STRATEGIES.PAYROLL.staleTime,
      gcTime: CACHE_STRATEGIES.PAYROLL.gcTime,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // 对于网络错误重试，对于权限错误不重试
        if (error?.status === 403 || error?.status === 401) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      onError: (error: any) => {
        console.error('Mutation error:', error);
        // 这里可以添加全局错误处理，如显示错误通知
      },
    },
  },
});

// 预定义查询选项工厂
export const createQueryOptions = {
  // 静态数据查询选项
  static: <T>(config: {
    queryKey: readonly unknown[];
    queryFn: () => Promise<T>;
    enabled?: boolean;
  }) => ({
    ...config,
    staleTime: CACHE_STRATEGIES.STATIC.staleTime,
    gcTime: CACHE_STRATEGIES.STATIC.gcTime,
  }),

  // 员工数据查询选项
  employee: <T>(config: {
    queryKey: readonly unknown[];
    queryFn: () => Promise<T>;
    enabled?: boolean;
  }) => ({
    ...config,
    staleTime: CACHE_STRATEGIES.EMPLOYEE.staleTime,
    gcTime: CACHE_STRATEGIES.EMPLOYEE.gcTime,
  }),

  // 薪资数据查询选项
  payroll: <T>(config: {
    queryKey: readonly unknown[];
    queryFn: () => Promise<T>;
    enabled?: boolean;
  }) => ({
    ...config,
    staleTime: CACHE_STRATEGIES.PAYROLL.staleTime,
    gcTime: CACHE_STRATEGIES.PAYROLL.gcTime,
  }),

  // 统计数据查询选项
  statistics: <T>(config: {
    queryKey: readonly unknown[];
    queryFn: () => Promise<T>;
    enabled?: boolean;
  }) => ({
    ...config,
    staleTime: CACHE_STRATEGIES.STATISTICS.staleTime,
    gcTime: CACHE_STRATEGIES.STATISTICS.gcTime,
  }),

  // 仪表盘数据查询选项
  dashboard: <T>(config: {
    queryKey: readonly unknown[];
    queryFn: () => Promise<T>;
    enabled?: boolean;
  }) => ({
    ...config,
    staleTime: CACHE_STRATEGIES.DASHBOARD.staleTime,
    gcTime: CACHE_STRATEGIES.DASHBOARD.gcTime,
  }),
};

// 缓存失效工具函数
export const invalidationHelpers = {
  // 使薪资相关缓存失效
  invalidatePayrollData: (queryClient: QueryClient, month?: string) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAYROLLS.all });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STATISTICS.all });
    if (month) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAYROLLS.list(month) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STATISTICS.department(month) });
    }
  },

  // 使员工相关缓存失效
  invalidateEmployeeData: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES.all });
    // 员工变更可能影响薪资统计
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STATISTICS.all });
  },

  // 使仪表盘缓存失效
  invalidateDashboard: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STATISTICS.dashboard() });
  },

  // 全量缓存刷新（谨慎使用）
  invalidateAll: (queryClient: QueryClient) => {
    queryClient.invalidateQueries();
  },
};

// 预加载工具函数
export const prefetchHelpers = {
  // 预加载基础数据
  prefetchMasterData: async (queryClient: QueryClient) => {
    const { supabase } = await import('@/lib/supabase');
    
    await Promise.allSettled([
      queryClient.prefetchQuery(createQueryOptions.static({
        queryKey: QUERY_KEYS.MASTER_DATA.departments,
        queryFn: async () => {
          const { data, error } = await supabase
            .from('departments')
            .select('*')
            .order('name');
          if (error) throw error;
          return data || [];
        },
      })),
      queryClient.prefetchQuery(createQueryOptions.static({
        queryKey: QUERY_KEYS.MASTER_DATA.positions,
        queryFn: async () => {
          const { data, error } = await supabase
            .from('positions')
            .select('*')
            .order('name');
          if (error) throw error;
          return data || [];
        },
      })),
    ]);
  },

  // 预加载当前月薪资数据
  prefetchCurrentMonthPayroll: async (queryClient: QueryClient) => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const { supabase } = await import('@/lib/supabase');
    
    await queryClient.prefetchQuery(createQueryOptions.payroll({
      queryKey: QUERY_KEYS.PAYROLLS.optimized(currentMonth),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('view_payroll_list_optimized')
          .select('*')
          .eq('pay_month', currentMonth)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
    }));
  },
};