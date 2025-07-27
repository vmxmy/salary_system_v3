import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentService, type DepartmentNode } from '@/services/department.service';
import { useToast } from '../contexts/ToastContext';

export const DEPARTMENT_KEYS = {
  all: ['departments'] as const,
  tree: () => [...DEPARTMENT_KEYS.all, 'tree'] as const,
  hierarchy: () => [...DEPARTMENT_KEYS.all, 'hierarchy'] as const,
  payrollStats: (filters?: any) => [...DEPARTMENT_KEYS.all, 'payroll-stats', filters] as const,
  employees: (departmentId: string) => [...DEPARTMENT_KEYS.all, 'employees', departmentId] as const,
  detail: (id: string) => [...DEPARTMENT_KEYS.all, 'detail', id] as const,
} as const;

/**
 * Hook for department tree structure
 */
export function useDepartmentTree() {
  return useQuery({
    queryKey: DEPARTMENT_KEYS.tree(),
    queryFn: () => departmentService.getDepartmentTree(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for department hierarchy view
 */
export function useDepartmentHierarchy() {
  return useQuery({
    queryKey: DEPARTMENT_KEYS.hierarchy(),
    queryFn: () => departmentService.getDepartmentHierarchy(),
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
}) {
  return useQuery({
    queryKey: DEPARTMENT_KEYS.payrollStats(filters),
    queryFn: () => departmentService.getDepartmentPayrollStats(filters),
    enabled: Boolean(filters?.year && filters?.month),
    staleTime: 2 * 60 * 1000, // 2 minutes for payroll data
  });
}

/**
 * Hook for department employees
 */
export function useDepartmentEmployees(departmentId: string) {
  return useQuery({
    queryKey: DEPARTMENT_KEYS.employees(departmentId),
    queryFn: () => departmentService.getDepartmentEmployees(departmentId),
    enabled: Boolean(departmentId),
    staleTime: 3 * 60 * 1000, // 3 minutes for employee data
  });
}

/**
 * Hook for single department detail
 */
export function useDepartment(departmentId: string) {
  return useQuery({
    queryKey: DEPARTMENT_KEYS.detail(departmentId),
    queryFn: () => departmentService.getDepartmentWithDetails(departmentId),
    enabled: Boolean(departmentId),
  });
}

/**
 * Hook for creating department
 */
export function useCreateDepartment() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: departmentService.create.bind(departmentService),
    onSuccess: () => {
      // Invalidate and refetch department queries
      queryClient.invalidateQueries({ queryKey: DEPARTMENT_KEYS.all });
      showSuccess('部门创建成功');
    },
    onError: (error) => {
      console.error('Create department error:', error);
      showError('创建部门失败');
    },
  });
}

/**
 * Hook for updating department
 */
export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      departmentService.update(id, updates),
    onSuccess: (_, { id }) => {
      // Invalidate specific department and tree queries
      queryClient.invalidateQueries({ queryKey: DEPARTMENT_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: DEPARTMENT_KEYS.tree() });
      queryClient.invalidateQueries({ queryKey: DEPARTMENT_KEYS.hierarchy() });
      showSuccess('部门更新成功');
    },
    onError: (error) => {
      console.error('Update department error:', error);
      showError('更新部门失败');
    },
  });
}

/**
 * Hook for deleting department
 */
export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: departmentService.delete.bind(departmentService),
    onSuccess: () => {
      // Invalidate all department queries
      queryClient.invalidateQueries({ queryKey: DEPARTMENT_KEYS.all });
      showSuccess('部门删除成功');
    },
    onError: (error) => {
      console.error('Delete department error:', error);
      showError('删除部门失败');
    },
  });
}

/**
 * Hook for moving department to new parent
 */
export function useMoveDepartment() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ departmentId, newParentId }: { 
      departmentId: string; 
      newParentId: string | null; 
    }) => departmentService.moveDepartment(departmentId, newParentId),
    onSuccess: () => {
      // Invalidate tree structure queries
      queryClient.invalidateQueries({ queryKey: DEPARTMENT_KEYS.tree() });
      queryClient.invalidateQueries({ queryKey: DEPARTMENT_KEYS.hierarchy() });
      showSuccess('部门移动成功');
    },
    onError: (error) => {
      console.error('Move department error:', error);
      showError('移动部门失败');
    },
  });
}

/**
 * Hook for updating department manager
 */
export function useUpdateDepartmentManager() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ departmentId, managerId }: { 
      departmentId: string; 
      managerId: string | null; 
    }) => departmentService.updateManager(departmentId, managerId),
    onSuccess: (_, { departmentId }) => {
      // Invalidate specific department query
      queryClient.invalidateQueries({ queryKey: DEPARTMENT_KEYS.detail(departmentId) });
      queryClient.invalidateQueries({ queryKey: DEPARTMENT_KEYS.tree() });
      showSuccess('部门负责人更新成功');
    },
    onError: (error) => {
      console.error('Update department manager error:', error);
      showError('更新部门负责人失败');
    },
  });
}