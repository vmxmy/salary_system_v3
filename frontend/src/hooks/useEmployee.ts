import { useState, useEffect, useCallback } from 'react';
import { EmployeeAPI } from '../lib/employeeApi';
import type { Employee, EmployeeWithDetails } from '../types/employee';

interface UseEmployeeOptions {
  employeeId?: string;
  autoFetch?: boolean;
}

interface UseEmployeeState {
  employee: EmployeeWithDetails | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
}

interface UseEmployeeActions {
  fetchEmployee: (id: string) => Promise<void>;
  updateEmployee: (id: string, data: Partial<Employee>) => Promise<boolean>;
  deleteEmployee: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  reset: () => void;
}

export function useEmployee(options: UseEmployeeOptions = {}) {
  const { employeeId, autoFetch = true } = options;

  // 状态管理
  const [state, setState] = useState<UseEmployeeState>({
    employee: null,
    loading: false,
    error: null,
    saving: false,
    saveError: null
  });

  // 获取员工详情
  const fetchEmployee = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const employee = await EmployeeAPI.getEmployee(id);
      setState(prev => ({
        ...prev,
        employee,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '获取员工信息失败'
      }));
    }
  }, []);

  // 更新员工信息
  const updateEmployee = useCallback(async (id: string, data: Partial<Employee>): Promise<boolean> => {
    setState(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      const updatedEmployee = await EmployeeAPI.updateEmployee(id, data);
      
      // 更新本地状态
      setState(prev => ({
        ...prev,
        employee: prev.employee ? { ...prev.employee, ...updatedEmployee } : null,
        saving: false
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        saveError: error instanceof Error ? error.message : '更新员工信息失败'
      }));
      return false;
    }
  }, []);

  // 删除员工
  const deleteEmployee = useCallback(async (id: string): Promise<boolean> => {
    setState(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      await EmployeeAPI.deleteEmployee(id);
      
      // 清除本地状态
      setState(prev => ({
        ...prev,
        employee: null,
        saving: false
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        saveError: error instanceof Error ? error.message : '删除员工失败'
      }));
      return false;
    }
  }, []);

  // 刷新员工数据
  const refresh = useCallback(async () => {
    if (state.employee?.id) {
      await fetchEmployee(state.employee.id);
    }
  }, [state.employee?.id, fetchEmployee]);

  // 重置状态
  const reset = useCallback(() => {
    setState({
      employee: null,
      loading: false,
      error: null,
      saving: false,
      saveError: null
    });
  }, []);

  // 自动获取员工数据
  useEffect(() => {
    if (employeeId && autoFetch) {
      fetchEmployee(employeeId);
    }
  }, [employeeId, autoFetch, fetchEmployee]);

  // 返回状态和操作方法
  const actions: UseEmployeeActions = {
    fetchEmployee,
    updateEmployee,
    deleteEmployee,
    refresh,
    reset
  };

  return {
    // 状态
    employee: state.employee,
    loading: state.loading,
    error: state.error,
    saving: state.saving,
    saveError: state.saveError,
    
    // 计算属性
    hasEmployee: state.employee !== null,
    isEditable: state.employee?.employee_status === 'active',
    
    // 操作方法
    ...actions
  };
}

// 创建员工的专用 Hook
interface UseCreateEmployeeState {
  creating: boolean;
  error: string | null;
}

interface UseCreateEmployeeActions {
  createEmployee: (data: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => Promise<Employee | null>;
  reset: () => void;
}

export function useCreateEmployee() {
  const [state, setState] = useState<UseCreateEmployeeState>({
    creating: false,
    error: null
  });

  const createEmployee = useCallback(async (
    data: Omit<Employee, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Employee | null> => {
    setState(prev => ({ ...prev, creating: true, error: null }));

    try {
      const employee = await EmployeeAPI.createEmployee(data);
      setState(prev => ({ ...prev, creating: false }));
      return employee;
    } catch (error) {
      setState(prev => ({
        ...prev,
        creating: false,
        error: error instanceof Error ? error.message : '创建员工失败'
      }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      creating: false,
      error: null
    });
  }, []);

  const actions: UseCreateEmployeeActions = {
    createEmployee,
    reset
  };

  return {
    creating: state.creating,
    error: state.error,
    ...actions
  };
}

// 批量操作员工的专用 Hook
interface UseBulkEmployeeActionsState {
  processing: boolean;
  error: string | null;
  successCount: number;
  failureCount: number;
}

interface UseBulkEmployeeActionsActions {
  bulkDelete: (ids: string[]) => Promise<boolean>;
  reset: () => void;
}

export function useBulkEmployeeActions() {
  const [state, setState] = useState<UseBulkEmployeeActionsState>({
    processing: false,
    error: null,
    successCount: 0,
    failureCount: 0
  });

  const bulkDelete = useCallback(async (ids: string[]): Promise<boolean> => {
    setState(prev => ({ 
      ...prev, 
      processing: true, 
      error: null,
      successCount: 0,
      failureCount: 0 
    }));

    try {
      await EmployeeAPI.bulkDeleteEmployees(ids);
      setState(prev => ({
        ...prev,
        processing: false,
        successCount: ids.length
      }));
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        processing: false,
        error: error instanceof Error ? error.message : '批量删除失败',
        failureCount: ids.length
      }));
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      processing: false,
      error: null,
      successCount: 0,
      failureCount: 0
    });
  }, []);

  const actions: UseBulkEmployeeActionsActions = {
    bulkDelete,
    reset
  };

  return {
    processing: state.processing,
    error: state.error,
    successCount: state.successCount,
    failureCount: state.failureCount,
    ...actions
  };
}