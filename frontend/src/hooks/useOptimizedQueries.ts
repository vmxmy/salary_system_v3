import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  QUERY_KEYS, 
  createQueryOptions, 
  invalidationHelpers 
} from '@/lib/queryClientOptimized';
import type { Database } from '@/types/supabase';

// 类型定义
type PayrollListOptimized = Database['public']['Views']['view_payroll_list_optimized']['Row'];
type EmployeeListOptimized = Database['public']['Views']['view_employee_list_optimized']['Row'];
type MonthlyStatistics = Database['public']['Views']['view_monthly_statistics']['Row'];
type DepartmentStatistics = Database['public']['Views']['view_department_statistics']['Row'];
type DashboardStats = Database['public']['Views']['view_dashboard_stats_optimized']['Row'];

/**
 * 优化的薪资查询钩子
 * 使用预聚合视图避免 N+1 查询
 */

// 薪资列表查询（优化版）
export function usePayrollListOptimized(month?: string) {
  return useQuery(createQueryOptions.payroll({
    queryKey: QUERY_KEYS.PAYROLLS.optimized(month),
    queryFn: async (): Promise<PayrollListOptimized[]> => {
      let query = supabase
        .from('view_payroll_list_optimized')
        .select('*')
        .order('created_at', { ascending: false });

      if (month) {
        query = query.eq('pay_month', month);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: true,
  }));
}

// 当前月薪资列表
export function useCurrentMonthPayroll() {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  return usePayrollListOptimized(currentMonth);
}

// 员工列表查询（优化版，包含最新薪资信息）
export function useEmployeeListOptimized(filters?: {
  isActive?: boolean;
  hasPayroll?: boolean;
  departmentName?: string;
}) {
  return useQuery(createQueryOptions.employee({
    queryKey: QUERY_KEYS.EMPLOYEES.optimized(),
    queryFn: async (): Promise<EmployeeListOptimized[]> => {
      let query = supabase
        .from('view_employee_list_optimized')
        .select('*')
        .order('employee_name');

      // 应用过滤器
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters?.hasPayroll !== undefined) {
        query = query.eq('has_payroll', filters.hasPayroll);
      }
      if (filters?.departmentName) {
        query = query.eq('department_name', filters.departmentName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  }));
}

// 在职员工列表
export function useActiveEmployees() {
  return useEmployeeListOptimized({ isActive: true });
}

// 有薪资记录的员工列表
export function useEmployeesWithPayroll() {
  return useEmployeeListOptimized({ isActive: true, hasPayroll: true });
}

// 月度统计查询
export function useMonthlyStatistics() {
  return useQuery(createQueryOptions.statistics({
    queryKey: QUERY_KEYS.STATISTICS.monthly(),
    queryFn: async (): Promise<MonthlyStatistics[]> => {
      const { data, error } = await supabase
        .from('view_monthly_statistics')
        .select('*')
        .order('year', { ascending: false })
        .order('month_number', { ascending: false })
        .limit(12); // 最近12个月

      if (error) throw error;
      return data || [];
    },
  }));
}

// 部门统计查询
export function useDepartmentStatistics(month?: string) {
  return useQuery(createQueryOptions.statistics({
    queryKey: QUERY_KEYS.STATISTICS.department(month),
    queryFn: async (): Promise<DepartmentStatistics[]> => {
      let query = supabase
        .from('view_department_statistics')
        .select('*')
        .order('dept_rank');

      if (month) {
        query = query.eq('month', month);
      } else {
        // 默认获取最近月份
        const currentMonth = new Date().toISOString().slice(0, 7);
        query = query.eq('month', currentMonth);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  }));
}

// 仪表盘统计查询
export function useDashboardStats() {
  return useQuery(createQueryOptions.dashboard({
    queryKey: QUERY_KEYS.STATISTICS.dashboard(),
    queryFn: async (): Promise<DashboardStats> => {
      const { data, error } = await supabase
        .from('view_dashboard_stats_optimized')
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
  }));
}

// 基础数据查询（部门）
export function useDepartments() {
  return useQuery(createQueryOptions.static({
    queryKey: QUERY_KEYS.MASTER_DATA.departments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  }));
}

// 基础数据查询（职位）
export function usePositions() {
  return useQuery(createQueryOptions.static({
    queryKey: QUERY_KEYS.MASTER_DATA.positions,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  }));
}

// 薪资组件查询
export function useSalaryComponents() {
  return useQuery(createQueryOptions.static({
    queryKey: QUERY_KEYS.MASTER_DATA.salaryComponents,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_components')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  }));
}

/**
 * 变更操作钩子
 * 自动处理缓存失效
 */

// 更新薪资记录
export function useUpdatePayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Database['public']['Tables']['payrolls']['Update']>
    }) => {
      const { data, error } = await supabase
        .from('payrolls')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // 获取薪资月份进行精确缓存失效
      const payMonth = data.pay_period_end ? 
        data.pay_period_end.slice(0, 7) : undefined;
      
      invalidationHelpers.invalidatePayrollData(queryClient, payMonth);
      invalidationHelpers.invalidateDashboard(queryClient);
    },
  });
}

// 批量更新薪资状态
export function useBatchUpdatePayrollStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      status
    }: {
      ids: string[];
      status: string;
    }) => {
      const { data, error } = await supabase
        .from('payrolls')
        .update({ status })
        .in('id', ids)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // 批量操作后全面刷新薪资相关缓存
      invalidationHelpers.invalidatePayrollData(queryClient);
      invalidationHelpers.invalidateDashboard(queryClient);
    },
  });
}

// 更新员工信息
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates
    }: {
      id: string;
      updates: Partial<Database['public']['Tables']['employees']['Update']>
    }) => {
      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidationHelpers.invalidateEmployeeData(queryClient);
    },
  });
}

// 创建新员工
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      employeeData: Database['public']['Tables']['employees']['Insert']
    ) => {
      const { data, error } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidationHelpers.invalidateEmployeeData(queryClient);
      invalidationHelpers.invalidateDashboard(queryClient);
    },
  });
}

/**
 * 实用工具钩子
 */

// 手动刷新特定数据
export function useRefreshData() {
  const queryClient = useQueryClient();

  return {
    refreshPayroll: (month?: string) => {
      invalidationHelpers.invalidatePayrollData(queryClient, month);
    },
    refreshEmployees: () => {
      invalidationHelpers.invalidateEmployeeData(queryClient);
    },
    refreshDashboard: () => {
      invalidationHelpers.invalidateDashboard(queryClient);
    },
    refreshAll: () => {
      invalidationHelpers.invalidateAll(queryClient);
    },
  };
}

// 数据预加载
export function usePrefetchData() {
  const queryClient = useQueryClient();

  return {
    prefetchCurrentMonth: async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
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
    prefetchDashboard: async () => {
      await queryClient.prefetchQuery(createQueryOptions.dashboard({
        queryKey: QUERY_KEYS.STATISTICS.dashboard(),
        queryFn: async () => {
          const { data, error } = await supabase
            .from('view_dashboard_stats_optimized')
            .select('*')
            .single();
          if (error) throw error;
          return data;
        },
      }));
    },
  };
}