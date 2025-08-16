import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { Database } from '@/types/supabase';

// 类型定义
type DepartmentRow = Database['public']['Tables']['departments']['Row'];
type DepartmentInsert = Database['public']['Tables']['departments']['Insert'];
type DepartmentUpdate = Database['public']['Tables']['departments']['Update'];

/**
 * 部门节点类型（包含树结构）
 */
export interface DepartmentNode extends DepartmentRow {
  children?: DepartmentNode[];
  employee_count?: number;
  full_path?: string;
  level?: number;
  children_count?: number;
}

/**
 * 部门查询键管理
 */
export const DEPARTMENT_KEYS = {
  all: ['departments'] as const,
  tree: () => [...DEPARTMENT_KEYS.all, 'tree'] as const,
  hierarchy: () => [...DEPARTMENT_KEYS.all, 'hierarchy'] as const,
  detail: (id: string) => [...DEPARTMENT_KEYS.all, 'detail', id] as const,
  employees: (departmentId: string) => [...DEPARTMENT_KEYS.all, 'employees', departmentId] as const,
  payrollStats: (filters?: any) => [...DEPARTMENT_KEYS.all, 'payroll-stats', filters] as const,
} as const;

// 兼容旧的导出名称
export const departmentQueryKeys = DEPARTMENT_KEYS;

/**
 * Hook for department tree structure
 */
export function useDepartmentTree() {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: DEPARTMENT_KEYS.tree(),
    queryFn: async (): Promise<DepartmentNode[]> => {
      try {
        // Get all departments
        const { data: departments, error: deptError } = await supabase
          .from('departments')
          .select('*')
          .order('name', { ascending: true });

        if (deptError) throw deptError;
        if (!departments) return [];

        // Get employee counts
        const { data: employeeCounts, error: countError } = await supabase
          .from('view_employee_basic_info')
          .select('department_id');

        if (countError) throw countError;

        // Count employees by department
        const countMap = new Map<string, number>();
        employeeCounts?.forEach(assignment => {
          if (assignment.department_id) {
            countMap.set(assignment.department_id, (countMap.get(assignment.department_id) || 0) + 1);
          }
        });

        // Build tree structure
        const departmentMap = new Map<string, DepartmentNode>();
        const roots: DepartmentNode[] = [];

        // First pass: create all nodes
        departments.forEach(dept => {
          departmentMap.set(dept.id, {
            ...dept,
            children: [],
            employee_count: countMap.get(dept.id) || 0,
          });
        });

        // Second pass: build tree
        departments.forEach(dept => {
          const node = departmentMap.get(dept.id)!;
          if (dept.parent_department_id) {
            const parent = departmentMap.get(dept.parent_department_id);
            if (parent) {
              parent.children!.push(node);
            }
          } else {
            roots.push(node);
          }
        });

        return roots;
      } catch (error) {
        handleError(error, { customMessage: '获取部门树失败' });
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for department hierarchy view
 */
export function useDepartmentHierarchy() {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: DEPARTMENT_KEYS.hierarchy(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_department_hierarchy')
        .select('*')
        .order('level', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        handleError(error, { customMessage: '获取部门层级失败' });
        throw error;
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for single department (alias for useDepartmentDetail)
 */
export function useDepartment(departmentId: string) {
  return useDepartmentDetail(departmentId);
}

/**
 * Hook for department details with stats
 */
export function useDepartmentDetail(departmentId: string) {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: DEPARTMENT_KEYS.detail(departmentId),
    queryFn: async () => {
      try {
        // Get basic department info
        const { data: department, error } = await supabase
          .from('departments')
          .select('*')
          .eq('id', departmentId)
          .single();

        if (error) throw error;
        if (!department) return null;

        // Get employee count
        const { count: employeeCount } = await supabase
          .from('view_employee_basic_info')
          .select('*', { count: 'exact', head: true })
          .eq('department_id', departmentId);

        // Get hierarchy info
        const { data: hierarchyInfo } = await supabase
          .from('view_department_hierarchy')
          .select('full_path, level')
          .eq('id', departmentId)
          .single();

        // Get children count
        const { count: childrenCount } = await supabase
          .from('departments')
          .select('*', { count: 'exact', head: true })
          .eq('parent_department_id', departmentId);

        return {
          ...department,
          employee_count: employeeCount || 0,
          full_path: hierarchyInfo?.full_path || department.name,
          level: hierarchyInfo?.level || 1,
          children_count: childrenCount || 0
        };
      } catch (error) {
        handleError(error, { customMessage: '获取部门详情失败' });
        throw error;
      }
    },
    enabled: !!departmentId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook for department employees
 */
export function useDepartmentEmployees(departmentId: string) {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: DEPARTMENT_KEYS.employees(departmentId),
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('view_employee_basic_info')
          .select('*')
          .eq('department_id', departmentId)
          .order('employee_name', { ascending: true });

        if (error) throw error;
        
        // Transform for compatibility - filter out null IDs
        return (data || [])
          .filter(employee => employee.employee_id != null)
          .map(employee => ({
            id: employee.employee_id || '',
            employee_id: employee.employee_id || '',
            employee_name: employee.employee_name || '',
            name: employee.employee_name || '',
            position_name: employee.position_name || undefined,
            personnel_category: employee.category_name || undefined,
            employment_status: employee.employment_status || '',
            status: employee.employment_status || '',
            assignment_start_date: employee.hire_date || undefined,
            department_id: employee.department_id || '',
            department_name: employee.department_name || undefined,
          }));
      } catch (error) {
        handleError(error, { customMessage: '获取部门员工失败' });
        throw error;
      }
    },
    enabled: !!departmentId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook for getting latest payroll period with data
 */
export function useLatestPayrollPeriod() {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: [...DEPARTMENT_KEYS.all, 'latest-period'],
    queryFn: async () => {
      try {
        // 获取最新有数据的薪资周期
        const { data, error } = await supabase
          .from('view_department_payroll_statistics')
          .select('pay_year, pay_month')
          .order('pay_year', { ascending: false })
          .order('pay_month', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          return {
            year: data[0].pay_year,
            month: data[0].pay_month
          };
        }

        // 如果没有数据，返回当前月份
        const now = new Date();
        return {
          year: now.getFullYear(),
          month: now.getMonth() + 1
        };
      } catch (error) {
        handleError(error, { customMessage: '获取最新薪资周期失败' });
        // 返回当前月份作为后备
        const now = new Date();
        return {
          year: now.getFullYear(),
          month: now.getMonth() + 1
        };
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for department payroll statistics
 */
export function useDepartmentPayrollStats(filters?: {
  year?: number;
  month?: number;
  departmentIds?: string[];
  useLatestIfEmpty?: boolean; // 新增参数：如果没有指定年月，是否使用最新数据
}) {
  const { handleError } = useErrorHandler();
  const { data: latestPeriod } = useLatestPayrollPeriod();
  
  // 如果没有指定年月且设置了使用最新数据，则使用最新周期
  const effectiveYear = filters?.year || (filters?.useLatestIfEmpty && latestPeriod?.year);
  const effectiveMonth = filters?.month || (filters?.useLatestIfEmpty && latestPeriod?.month);
  
  return useQuery({
    queryKey: DEPARTMENT_KEYS.payrollStats({ ...filters, year: effectiveYear, month: effectiveMonth }),
    queryFn: async () => {
      try {
        let query = supabase
          .from('view_department_payroll_statistics')
          .select('*');

        if (effectiveYear) {
          query = query.eq('pay_year', effectiveYear);
        }

        if (effectiveMonth) {
          query = query.eq('pay_month', effectiveMonth);
        }

        if (filters?.departmentIds && filters.departmentIds.length > 0) {
          query = query.in('department_id', filters.departmentIds);
        }

        const { data, error } = await query
          .order('department_name', { ascending: true });

        if (error) throw error;

        // Format numeric values
        return (data || []).map(item => ({
          ...item,
          total_gross_pay: formatNumber(item.total_gross_pay),
          total_deductions: formatNumber(item.total_deductions),
          total_net_pay: formatNumber(item.total_net_pay),
          avg_gross_pay: formatNumber(item.avg_gross_pay),
          avg_net_pay: formatNumber(item.avg_net_pay),
          min_gross_pay: formatNumber(item.min_gross_pay),
          max_gross_pay: formatNumber(item.max_gross_pay),
          dept_gross_pay_percentage: formatNumber((item as any).dept_gross_pay_percentage || 0, 4),
          dept_employee_percentage: formatNumber((item as any).dept_employee_percentage || 0, 4),
        }));
      } catch (error) {
        handleError(error, { customMessage: '获取部门薪资统计失败' });
        throw error;
      }
    },
    enabled: Boolean(effectiveYear && effectiveMonth),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook for creating department
 */
export function useCreateDepartment() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (data: DepartmentInsert) => {
      const { data: result, error } = await supabase
        .from('departments')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENT_KEYS.all });
    },
    onError: (error) => {
      handleError(error, { customMessage: '创建部门失败' });
    },
  });
}

/**
 * Hook for updating department
 */
export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DepartmentUpdate }) => {
      const { data: result, error } = await supabase
        .from('departments')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENT_KEYS.all });
    },
    onError: (error) => {
      handleError(error, { customMessage: '更新部门失败' });
    },
  });
}

/**
 * Hook for deleting department
 */
export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENT_KEYS.all });
    },
    onError: (error) => {
      handleError(error, { customMessage: '删除部门失败' });
    },
  });
}

/**
 * Hook for moving department
 */
export function useMoveDepartment() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ departmentId, newParentId }: { 
      departmentId: string; 
      newParentId: string | null;
    }) => {
      // Check for circular reference
      if (newParentId) {
        const isCircular = await checkCircularReference(departmentId, newParentId);
        if (isCircular) {
          throw new Error('不能创建循环部门引用');
        }
      }

      const { error } = await supabase
        .from('departments')
        .update({ parent_department_id: newParentId })
        .eq('id', departmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENT_KEYS.all });
    },
    onError: (error) => {
      handleError(error, { customMessage: '移动部门失败' });
    },
  });
}

/**
 * Hook for department mutations (combined)
 */
export function useDepartmentMutations() {
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const moveDepartment = useMoveDepartment();

  return {
    createDepartment,
    updateDepartment,
    deleteDepartment,
    moveDepartment,
  };
}

/**
 * Hook for department search
 */
export function useDepartmentSearch(searchTerm: string) {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: [...DEPARTMENT_KEYS.all, 'search', searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_department_hierarchy')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('level', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        handleError(error, { customMessage: '搜索部门失败' });
        throw error;
      }
      return data || [];
    },
    enabled: !!searchTerm,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for department list (flat)
 */
export function useDepartmentList() {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: [...DEPARTMENT_KEYS.all, 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_department_hierarchy')
        .select('*')
        .order('full_path', { ascending: true });

      if (error) {
        handleError(error, { customMessage: '获取部门列表失败' });
        throw error;
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Main departments hook (backward compatibility)
 */
export function useDepartments() {
  const tree = useDepartmentTree();
  const hierarchy = useDepartmentHierarchy();
  const mutations = useDepartmentMutations();
  
  return {
    // Data
    departments: tree.data || [],
    departmentTree: tree.data || [],
    hierarchyData: hierarchy.data || [],
    
    // Status
    loading: tree.isLoading || hierarchy.isLoading,
    error: tree.error || hierarchy.error,
    
    // Actions
    actions: {
      create: mutations.createDepartment.mutate,
      update: mutations.updateDepartment.mutate,
      delete: mutations.deleteDepartment.mutate,
      move: mutations.moveDepartment.mutate,
    },
    
    // Mutations (for direct access)
    mutations,
  };
}

// Helper functions
async function checkCircularReference(
  departmentId: string,
  targetParentId: string
): Promise<boolean> {
  let currentId: string | null = targetParentId;
  
  while (currentId) {
    if (currentId === departmentId) {
      return true; // Circular reference detected
    }

    const { data }: { data: any } = await supabase
      .from('departments')
      .select('parent_department_id')
      .eq('id', currentId)
      .single();

    currentId = data?.parent_department_id || null;
  }

  return false;
}

function formatNumber(value: any, decimals: number = 2): number {
  if (value == null || value === '') return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : parseFloat(num.toFixed(decimals));
}

