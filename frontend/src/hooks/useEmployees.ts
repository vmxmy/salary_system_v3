import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '@/services/employee.service';
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
 */
export function useAllEmployees() {
  return useQuery({
    queryKey: employeeQueryKeys.list(),
    queryFn: () => employeeService.getAllEmployeesRaw(),
    staleTime: 5 * 60 * 1000, // 5分钟内认为数据是新鲜的
  });
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
 * 获取人员类别列表
 */
export function usePersonnelCategories() {
  return useQuery({
    queryKey: employeeQueryKeys.categories(),
    queryFn: () => employeeService.getPersonnelCategories(),
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
 */
export function useEmployee(employeeId: string) {
  return useQuery({
    queryKey: employeeQueryKeys.detail(employeeId),
    queryFn: () => employeeService.getEmployeeWithDetails(employeeId),
    enabled: !!employeeId,
  });
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