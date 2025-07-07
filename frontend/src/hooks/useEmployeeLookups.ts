import { useState, useEffect, useCallback } from 'react';
import { EmployeeAPI } from '../lib/employeeApi';
import type { Department, Position, PersonnelCategory } from '../types/employee';

interface UseEmployeeLookupsState {
  departments: Department[];
  positions: Position[];
  personnelCategories: PersonnelCategory[];
  loading: boolean;
  error: string | null;
}

interface UseEmployeeLookupsActions {
  fetchDepartments: () => Promise<void>;
  fetchPositions: () => Promise<void>;
  fetchPersonnelCategories: () => Promise<void>;
  fetchAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useEmployeeLookups(autoFetch = true) {
  const [state, setState] = useState<UseEmployeeLookupsState>({
    departments: [],
    positions: [],
    personnelCategories: [],
    loading: false,
    error: null
  });

  // 获取部门列表
  const fetchDepartments = useCallback(async () => {
    try {
      const departments = await EmployeeAPI.getDepartments();
      setState(prev => ({ ...prev, departments }));
    } catch (error) {
      console.error('获取部门列表失败:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '获取部门列表失败'
      }));
    }
  }, []);

  // 获取职位列表
  const fetchPositions = useCallback(async () => {
    try {
      const positions = await EmployeeAPI.getPositions();
      setState(prev => ({ ...prev, positions }));
    } catch (error) {
      console.error('获取职位列表失败:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '获取职位列表失败'
      }));
    }
  }, []);

  // 获取人员类别列表
  const fetchPersonnelCategories = useCallback(async () => {
    try {
      const personnelCategories = await EmployeeAPI.getPersonnelCategories();
      setState(prev => ({ ...prev, personnelCategories }));
    } catch (error) {
      console.error('获取人员类别列表失败:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '获取人员类别列表失败'
      }));
    }
  }, []);

  // 获取所有查找数据
  const fetchAll = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      await Promise.all([
        fetchDepartments(),
        fetchPositions(),
        fetchPersonnelCategories()
      ]);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '获取基础数据失败'
      }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [fetchDepartments, fetchPositions, fetchPersonnelCategories]);

  // 刷新所有数据
  const refresh = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  // 自动获取数据
  useEffect(() => {
    if (autoFetch) {
      fetchAll();
    }
  }, [autoFetch, fetchAll]);

  // 返回状态和操作方法
  const actions: UseEmployeeLookupsActions = {
    fetchDepartments,
    fetchPositions,
    fetchPersonnelCategories,
    fetchAll,
    refresh
  };

  return {
    // 状态
    departments: state.departments,
    positions: state.positions,
    personnelCategories: state.personnelCategories,
    loading: state.loading,
    error: state.error,

    // 计算属性
    hasDepartments: state.departments.length > 0,
    hasPositions: state.positions.length > 0,
    hasPersonnelCategories: state.personnelCategories.length > 0,
    
    // 工具方法
    getDepartmentById: useCallback((id: string) => {
      return state.departments.find(dept => dept.id === id);
    }, [state.departments]),

    getPositionById: useCallback((id: string) => {
      return state.positions.find(pos => pos.id === id);
    }, [state.positions]),

    getPersonnelCategoryById: useCallback((id: string) => {
      return state.personnelCategories.find(cat => cat.id === id);
    }, [state.personnelCategories]),

    // 格式化为选择器选项
    departmentOptions: state.departments.map(dept => ({
      value: dept.id,
      label: dept.name,
      code: dept.code
    })),

    positionOptions: state.positions.map(pos => ({
      value: pos.id,
      label: pos.name,
      code: pos.code,
      level: pos.level
    })),

    personnelCategoryOptions: state.personnelCategories.map(cat => ({
      value: cat.id,
      label: cat.name,
      code: cat.code
    })),

    // 操作方法
    ...actions
  };
}