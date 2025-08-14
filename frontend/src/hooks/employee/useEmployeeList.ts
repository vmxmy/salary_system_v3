import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandlerWithToast } from '@/hooks/core/useErrorHandlerWithToast';
import { useLoadingState } from '@/hooks/core/useLoadingState';
import type { EmployeeListItem, CreateEmployeeRequest, FullEmployeeCreateRequest } from '@/types/employee';
import { useEmployeeFullCreate } from './useEmployeeFullCreate';

/**
 * 员工查询键管理
 */
export const employeeQueryKeys = {
  all: ['employees'] as const,
  list: () => [...employeeQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...employeeQueryKeys.all, 'detail', id] as const,
  filtered: (filters: any) => [...employeeQueryKeys.list(), 'filtered', filters] as const,
};

/**
 * 员工筛选参数
 */
export interface EmployeeFilters {
  search?: string;
  department?: string;
  position?: string;
  employment_status?: string;
  category?: string;
}

/**
 * 员工排序配置
 */
export interface EmployeeSorting {
  field: keyof EmployeeListItem;
  order: 'asc' | 'desc';
}

/**
 * 员工列表管理Hook
 * 专注于员工列表的CRUD操作和数据管理
 */
export function useEmployeeList() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandlerWithToast();
  const { loadingState, setLoading } = useLoadingState();
  const subscriptionRef = useRef<any>(null);
  
  // 获取完整创建功能
  const fullCreateHook = useEmployeeFullCreate();

  // 获取员工列表数据
  const {
    data: rawEmployees = [],
    isLoading: isInitialLoading,
    isRefetching,
    error,
    refetch
  } = useQuery<EmployeeListItem[]>({
    queryKey: employeeQueryKeys.list(),
    queryFn: async (): Promise<EmployeeListItem[]> => {
      const { data, error } = await supabase
        .from('view_employee_basic_info')
        .select('*')
        .order('employee_name', { ascending: true });

      if (error) throw error;

      return (data || []).map(emp => ({
        id: emp.employee_id,
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        id_number: emp.id_number,
        hire_date: emp.hire_date,
        termination_date: emp.termination_date,
        gender: emp.gender,
        date_of_birth: emp.date_of_birth,
        employment_status: emp.employment_status,
        current_status: emp.employment_status as 'active' | 'inactive' | 'terminated',
        manager_id: emp.manager_id,
        department_id: emp.department_id,
        department_name: emp.department_name,
        position_id: emp.position_id,
        position_name: emp.position_name,
        rank_id: emp.rank_id,
        rank_name: emp.rank_name,
        job_start_date: emp.job_start_date,
        category_id: emp.category_id,
        category_name: emp.category_name,
        category_start_date: emp.category_start_date,
        has_occupational_pension: emp.has_occupational_pension,
        mobile_phone: emp.mobile_phone,
        email: emp.email,
        work_email: emp.work_email,
        personal_email: emp.personal_email,
        primary_bank_account: emp.primary_bank_account,
        bank_name: emp.bank_name,
        branch_name: emp.branch_name,
        latest_institution: emp.latest_institution,
        latest_degree: emp.latest_degree,
        latest_field_of_study: emp.latest_field_of_study,
        latest_graduation_date: emp.latest_graduation_date,
        created_at: emp.created_at,
        updated_at: emp.updated_at,
      }));
    },
    staleTime: 5 * 60 * 1000 // 5分钟内认为数据是新鲜的
  });

  // 处理错误
  useEffect(() => {
    if (error) {
      handleError(error, { customMessage: '获取员工列表失败' });
    }
  }, [error, handleError]);

  // 类型安全的employees列表
  const employees = rawEmployees as EmployeeListItem[];

  // 设置实时订阅
  useEffect(() => {
    if (employees.length > 0) {
      console.log('[Realtime] Setting up employees subscription...');
      
      subscriptionRef.current = supabase
        .channel('employees_list')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'employees' 
          },
          (payload) => {
            console.log('[Realtime] Employee change detected:', payload);
            
            // 根据事件类型更新缓存
            switch (payload.eventType) {
              case 'INSERT':
              case 'DELETE':
                // 新增或删除需要重新获取数据
                queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
                break;
              case 'UPDATE':
                // 更新可以直接修改缓存，但为了简化逻辑，也直接重新获取
                queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
                break;
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Employees subscription status:', status);
        });

      // 同时订阅员工分配表的变更
      const assignmentChannel = supabase
        .channel('employee_assignments_list')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'employee_assignments' 
          },
          (payload) => {
            console.log('[Realtime] Employee assignment change detected:', payload);
            queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
          }
        )
        .subscribe();

      return () => {
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
          assignmentChannel.unsubscribe();
        }
      };
    }
  }, [employees.length, queryClient]);

  // 创建员工
  const createEmployee = useMutation({
    mutationFn: async (employeeData: CreateEmployeeRequest): Promise<EmployeeListItem> => {
      setLoading('isCreating', true);
      
      // 直接调用Supabase，不通过Service层
      const { data, error } = await supabase
        .from('employees')
        .insert({
          employee_name: employeeData.employee_name,
          id_number: employeeData.id_number,
          gender: employeeData.gender,
          date_of_birth: employeeData.date_of_birth,
          hire_date: employeeData.hire_date,
          employment_status: employeeData.employment_status || 'active',
          mobile_phone: employeeData.mobile_phone,
          email: employeeData.email,
          work_email: employeeData.work_email,
          personal_email: employeeData.personal_email,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
      console.log('员工创建成功');
    },
    onError: (error) => {
      handleError(error, { customMessage: '创建员工失败' });
    },
    onSettled: () => {
      setLoading('isCreating', false);
    }
  });

  // 更新员工
  const updateEmployee = useMutation({
    mutationFn: async ({ 
      employeeId, 
      updates 
    }: { 
      employeeId: string; 
      updates: Partial<CreateEmployeeRequest> 
    }) => {
      setLoading('isUpdating', true);
      
      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', employeeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
      queryClient.invalidateQueries({ queryKey: employeeQueryKeys.detail(employeeId) });
      console.log('员工更新成功');
    },
    onError: (error) => {
      handleError(error, { customMessage: '更新员工失败' });
    },
    onSettled: () => {
      setLoading('isUpdating', false);
    }
  });

  // 删除员工
  const deleteEmployee = useMutation({
    mutationFn: async (employeeId: string) => {
      setLoading('isDeleting', true);
      
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
      console.log('员工删除成功');
    },
    onError: (error) => {
      handleError(error, { customMessage: '删除员工失败' });
    },
    onSettled: () => {
      setLoading('isDeleting', false);
    }
  });

  // 批量删除员工
  const batchDeleteEmployees = useMutation({
    mutationFn: async (employeeIds: string[]) => {
      setLoading('isBatchProcessing', true);
      
      const promises = employeeIds.map(id =>
        supabase.from('employees').delete().eq('id', id)
      );
      
      const results = await Promise.allSettled(promises);
      
      // 检查是否有失败的操作
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        throw new Error(`${failures.length} 个员工删除失败`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
      console.log('批量删除员工成功');
    },
    onError: (error) => {
      handleError(error, { customMessage: '批量删除员工失败' });
    },
    onSettled: () => {
      setLoading('isBatchProcessing', false);
    }
  });

  // 客户端数据处理工具
  const dataUtils = useMemo(() => {
    /**
     * 筛选员工
     */
    const filterEmployees = (
      employees: EmployeeListItem[],
      filters: EmployeeFilters
    ): EmployeeListItem[] => {
      return employees.filter(employee => {
        // 搜索过滤
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          const searchableFields = [
            employee.employee_name,
            employee.employee_id,
            employee.email,
            employee.mobile_phone,
          ].filter(Boolean);
          
          const matchesSearch = searchableFields.some(field => 
            field?.toLowerCase().includes(searchTerm)
          );
          
          if (!matchesSearch) return false;
        }
        
        // 部门过滤
        if (filters.department && employee.department_name !== filters.department) {
          return false;
        }
        
        // 职位过滤
        if (filters.position && employee.position_name !== filters.position) {
          return false;
        }
        
        // 状态过滤
        if (filters.employment_status && employee.employment_status !== filters.employment_status) {
          return false;
        }
        
        // 类别过滤
        if (filters.category && employee.category_name !== filters.category) {
          return false;
        }
        
        return true;
      });
    };

    /**
     * 排序员工
     */
    const sortEmployees = (
      employees: EmployeeListItem[], 
      sorting: EmployeeSorting
    ): EmployeeListItem[] => {
      return [...employees].sort((a, b) => {
        let aValue: any = a[sorting.field];
        let bValue: any = b[sorting.field];
        
        // 处理空值 - 空值排在最后
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        
        // 字符串比较
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) return sorting.order === 'asc' ? -1 : 1;
        if (aValue > bValue) return sorting.order === 'asc' ? 1 : -1;
        return 0;
      });
    };

    /**
     * 分页员工
     */
    const paginateEmployees = (
      employees: EmployeeListItem[],
      page: number,
      pageSize: number
    ) => {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      
      return {
        data: employees.slice(startIndex, endIndex),
        total: employees.length,
        page,
        pageSize,
        totalPages: Math.ceil(employees.length / pageSize),
      };
    };

    return {
      filterEmployees,
      sortEmployees,
      paginateEmployees,
    };
  }, []);

  // 统计信息
  const statistics = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(emp => emp.employment_status === 'active').length;
    const inactive = employees.filter(emp => emp.employment_status === 'inactive').length;
    const terminated = employees.filter(emp => emp.employment_status === 'terminated').length;
    
    const departments = [...new Set(employees.map(emp => emp.department_name).filter(Boolean))];
    const positions = [...new Set(employees.map(emp => emp.position_name).filter(Boolean))];
    
    return {
      total,
      active,
      inactive,
      terminated,
      departmentCount: departments.length,
      positionCount: positions.length,
      departments,
      positions
    };
  }, [employees]);

  return {
    // 数据
    employees: employees,
    statistics,
    
    // 状态
    loading: {
      isInitialLoading,
      isRefetching,
      isCreating: loadingState.isCreating,
      isUpdating: loadingState.isUpdating,
      isDeleting: loadingState.isDeleting,
      isBatchProcessing: loadingState.isBatchProcessing,
    },
    error,
    
    // 操作
    actions: {
      create: createEmployee.mutate,
      createFull: fullCreateHook.actions.createFull,
      createBasic: fullCreateHook.actions.createBasic,
      update: updateEmployee.mutate,
      delete: deleteEmployee.mutate,
      batchDelete: batchDeleteEmployees.mutate,
      refresh: refetch,
    },
    
    // 数据处理工具
    utils: dataUtils,
    
    // 异步操作状态
    mutations: {
      create: createEmployee,
      createFull: fullCreateHook.mutations.createFull,
      createBasic: fullCreateHook.mutations.createBasic,
      update: updateEmployee,
      delete: deleteEmployee,
      batchDelete: batchDeleteEmployees,
    },
    
    // 完整创建相关数据
    fullCreate: {
      formOptions: fullCreateHook.formOptions,
      loading: fullCreateHook.loading,
      errors: fullCreateHook.errors,
    }
  };
}

/**
 * 带筛选和排序的员工列表Hook
 */
export function useFilteredEmployeeList(
  filters: EmployeeFilters = {},
  sorting: EmployeeSorting = { field: 'employee_name', order: 'asc' }
) {
  const { employees, ...rest } = useEmployeeList();
  
  const filteredAndSortedEmployees = useMemo(() => {
    let result = employees;
    
    // 应用筛选
    if (Object.keys(filters).length > 0) {
      result = rest.utils.filterEmployees(result, filters);
    }
    
    // 应用排序
    result = rest.utils.sortEmployees(result, sorting);
    
    return result;
  }, [employees, filters, sorting, rest.utils]);
  
  return {
    ...rest,
    employees: filteredAndSortedEmployees,
    originalEmployees: employees,
    filters,
    sorting,
  };
}