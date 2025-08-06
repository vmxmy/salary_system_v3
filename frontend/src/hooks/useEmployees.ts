import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { employeeService } from '@/services/employee.service';
import { supabase } from '@/lib/supabase';
import type { EmployeeListItem, EmployeeQueryParams } from '@/types/employee';

// Query Keys
export const employeeQueryKeys = {
  all: ['employees'] as const,
  list: () => [...employeeQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...employeeQueryKeys.all, 'detail', id] as const,
  departments: () => [...employeeQueryKeys.all, 'departments'] as const,
  categories: () => [...employeeQueryKeys.all, 'categories'] as const,
  positions: () => [...employeeQueryKeys.all, 'positions'] as const,
};

/**
 * 获取所有员工数据 - 用于客户端排序和筛选
 * 支持 Supabase Realtime 实时更新
 */
export function useAllEmployees() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);
  
  const query = useQuery({
    queryKey: employeeQueryKeys.list(),
    queryFn: () => employeeService.getAllEmployeesRaw(),
    staleTime: 5 * 60 * 1000, // 5分钟内认为数据是新鲜的
  });

  useEffect(() => {
    // 只有在查询成功且有数据时才设置订阅
    if (query.isSuccess && query.data) {
      console.log('[Realtime] Setting up employees subscription...');
      
      // 订阅员工表的变更
      subscriptionRef.current = supabase
        .channel('public:employees')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'employees' 
          },
          (payload) => {
            console.log('[Realtime] Employee change detected:', payload);
            
            // 实时更新缓存数据
            queryClient.setQueryData(employeeQueryKeys.list(), (oldData: EmployeeListItem[] | undefined) => {
              if (!oldData) return oldData;
              
              const { eventType, new: newRecord, old: oldRecord } = payload;
              
              switch (eventType) {
                case 'INSERT':
                  // 新增员工 - 需要重新获取数据以获取完整的关联信息
                  queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
                  return oldData;
                  
                case 'UPDATE':
                  // 更新员工
                  if (newRecord && oldRecord) {
                    const updatedData = oldData.map(employee => 
                      employee.employee_id === newRecord.id ? {
                        ...employee,
                        full_name: newRecord.full_name || employee.full_name,
                        email: newRecord.email || employee.email,
                        mobile_phone: newRecord.mobile_phone || employee.mobile_phone,
                        employment_status: newRecord.employment_status || employee.employment_status,
                        hire_date: newRecord.hire_date || employee.hire_date,
                        // 注意：关联字段可能需要重新获取
                      } : employee
                    );
                    return updatedData;
                  }
                  // 如果数据结构复杂，重新获取
                  queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
                  return oldData;
                  
                case 'DELETE':
                  // 删除员工
                  if (oldRecord) {
                    return oldData.filter(employee => employee.employee_id !== oldRecord.id);
                  }
                  return oldData;
                  
                default:
                  return oldData;
              }
            });
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Employees subscription status:', status);
        });

      // 订阅员工分配表的变更（影响部门、职位等关联信息）
      const assignmentSubscription = supabase
        .channel('public:employee_assignments')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'employee_assignments' 
          },
          (payload) => {
            console.log('[Realtime] Employee assignment change detected:', payload);
            // 分配信息变更时，需要重新获取员工列表以更新关联信息
            queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
          }
        )
        .subscribe();
    }

    // 清理订阅
    return () => {
      if (subscriptionRef.current) {
        console.log('[Realtime] Cleaning up employees subscription...');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [query.isSuccess, query.data, queryClient]);

  return query;
}

/**
 * 获取部门列表
 */
export function useDepartments() {
  return useQuery({
    queryKey: employeeQueryKeys.departments(),
    queryFn: () => employeeService.getDepartments(),
    staleTime: 10 * 60 * 1000, // 部门信息相对静态，10分钟缓存
  });
}

/**
 * 获取人员类别列表（层级结构）
 */
export function usePersonnelCategories() {
  return useQuery({
    queryKey: employeeQueryKeys.categories(),
    queryFn: () => employeeService.getPersonnelCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * 获取人员类别名称列表（简单字符串数组，用于向后兼容）
 */
export function usePersonnelCategoryNames() {
  return useQuery({
    queryKey: [...employeeQueryKeys.categories(), 'names'],
    queryFn: () => employeeService.getPersonnelCategoryNames(),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * 获取职位列表
 */
export function usePositions() {
  return useQuery({
    queryKey: employeeQueryKeys.positions(),
    queryFn: () => employeeService.getPositions(),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * 获取单个员工详情
 * 支持 Supabase Realtime 实时更新
 */
export function useEmployee(employeeId: string) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);
  
  const query = useQuery({
    queryKey: employeeQueryKeys.detail(employeeId),
    queryFn: () => employeeService.getEmployeeWithDetails(employeeId),
    enabled: !!employeeId,
  });

  useEffect(() => {
    // 只有在有员工ID且查询成功时才设置订阅
    if (employeeId && query.isSuccess && query.data) {
      console.log(`[Realtime] Setting up employee detail subscription for ID: ${employeeId}`);
      
      // 订阅员工表的变更
      subscriptionRef.current = supabase
        .channel(`employee_detail:${employeeId}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'employees',
            filter: `id=eq.${employeeId}`
          },
          (payload) => {
            console.log(`[Realtime] Employee ${employeeId} change detected:`, payload);
            
            // 员工基本信息变更时，重新获取详细信息
            queryClient.invalidateQueries({ queryKey: employeeQueryKeys.detail(employeeId) });
            // 同时更新员工列表缓存
            queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
          }
        )
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'employee_assignments',
            filter: `employee_id=eq.${employeeId}`
          },
          (payload) => {
            console.log(`[Realtime] Employee ${employeeId} assignment change detected:`, payload);
            
            // 员工分配信息变更时，重新获取详细信息
            queryClient.invalidateQueries({ queryKey: employeeQueryKeys.detail(employeeId) });
            queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] Employee ${employeeId} detail subscription status:`, status);
        });
    }

    // 清理订阅
    return () => {
      if (subscriptionRef.current) {
        console.log(`[Realtime] Cleaning up employee ${employeeId} detail subscription...`);
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [employeeId, query.isSuccess, query.data, queryClient]);

  return query;
}

/**
 * 创建员工
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: employeeService.create.bind(employeeService),
    onSuccess: () => {
      // 创建成功后刷新员工列表
      queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
    },
  });
}

/**
 * 更新员工
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ employeeId, updates }: { employeeId: string; updates: any }) => 
      employeeService.updateEmployeeDetails(employeeId, updates),
    onSuccess: (_, { employeeId }) => {
      // 更新成功后刷新相关数据
      queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
      queryClient.invalidateQueries({ queryKey: employeeQueryKeys.detail(employeeId) });
    },
  });
}

/**
 * 删除员工
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => employeeService.delete(id),
    onSuccess: () => {
      // 删除成功后刷新员工列表
      queryClient.invalidateQueries({ queryKey: employeeQueryKeys.list() });
    },
  });
}

/**
 * 客户端数据处理工具函数
 */
export function useEmployeeListFiltering() {
  // 排序函数
  const sortEmployees = (
    employees: EmployeeListItem[], 
    sortBy: string, 
    sortOrder: 'asc' | 'desc'
  ): EmployeeListItem[] => {
    return [...employees].sort((a, b) => {
      let aValue: any = a[sortBy as keyof EmployeeListItem];
      let bValue: any = b[sortBy as keyof EmployeeListItem];
      
      // 处理空值 - 空值排在最后
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      // 字符串比较
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // 筛选函数
  const filterEmployees = (
    employees: EmployeeListItem[],
    filters: {
      search?: string;
      department?: string;
      employment_status?: string;
      category?: string;
    }
  ): EmployeeListItem[] => {
    return employees.filter(employee => {
      // 搜索过滤
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchableFields = [
          employee.full_name,
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

  // 分页函数
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
    sortEmployees,
    filterEmployees,
    paginateEmployees,
  };
}