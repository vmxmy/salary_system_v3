import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { EmployeeAPI } from '../lib/employeeApi';
import type { 
  EmployeeWithDetails, 
  EmployeeFilters, 
  EmployeeListResponse 
} from '../types/employee';

interface UseEmployeesOptions {
  initialPageSize?: number;
  enableRealtime?: boolean;
  autoFetch?: boolean;
}

interface UseEmployeesState {
  data: EmployeeWithDetails[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: EmployeeFilters;
}

interface UseEmployeesActions {
  fetchEmployees: () => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setFilters: (filters: EmployeeFilters) => void;
  updateFilters: (partialFilters: Partial<EmployeeFilters>) => void;
  clearFilters: () => void;
  refresh: () => Promise<void>;
  searchEmployees: (searchTerm: string) => void;
}

export function useEmployees(options: UseEmployeesOptions = {}) {
  const {
    initialPageSize = 20,
    enableRealtime = true,
    autoFetch = true
  } = options;

  // 使用 ref 来避免无限循环
  const filtersRef = useRef<EmployeeFilters>({});
  const paginationRef = useRef({
    page: 0,
    pageSize: initialPageSize,
    total: 0,
    totalPages: 0
  });

  // 状态管理
  const [state, setState] = useState<UseEmployeesState>({
    data: [],
    loading: false,
    error: null,
    pagination: paginationRef.current,
    filters: filtersRef.current
  });

  // 计算总页数
  const totalPages = useMemo(() => {
    return Math.ceil(state.pagination.total / state.pagination.pageSize);
  }, [state.pagination.total, state.pagination.pageSize]);

  // 获取员工列表
  const fetchEmployees = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response: EmployeeListResponse = await EmployeeAPI.getEmployees(
        paginationRef.current.page,
        paginationRef.current.pageSize,
        filtersRef.current
      );

      const newPagination = {
        ...paginationRef.current,
        total: response.total,
        totalPages: Math.ceil(response.total / response.pageSize)
      };

      paginationRef.current = newPagination;

      setState(prev => ({
        ...prev,
        data: response.data,
        loading: false,
        pagination: newPagination
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '获取员工列表失败'
      }));
    }
  }, []);

  // 设置页码
  const setPage = useCallback((page: number) => {
    paginationRef.current = { ...paginationRef.current, page };
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page }
    }));
  }, []);

  // 设置页面大小
  const setPageSize = useCallback((pageSize: number) => {
    paginationRef.current = { ...paginationRef.current, pageSize, page: 0 };
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, pageSize, page: 0 }
    }));
  }, []);

  // 设置过滤条件
  const setFilters = useCallback((filters: EmployeeFilters) => {
    filtersRef.current = filters;
    paginationRef.current = { ...paginationRef.current, page: 0 };
    setState(prev => ({
      ...prev,
      filters,
      pagination: { ...prev.pagination, page: 0 }
    }));
  }, []);

  // 更新部分过滤条件
  const updateFilters = useCallback((partialFilters: Partial<EmployeeFilters>) => {
    const newFilters = { ...filtersRef.current, ...partialFilters };
    filtersRef.current = newFilters;
    paginationRef.current = { ...paginationRef.current, page: 0 };
    setState(prev => ({
      ...prev,
      filters: newFilters,
      pagination: { ...prev.pagination, page: 0 }
    }));
  }, []);

  // 清除过滤条件
  const clearFilters = useCallback(() => {
    filtersRef.current = {};
    paginationRef.current = { ...paginationRef.current, page: 0 };
    setState(prev => ({
      ...prev,
      filters: {},
      pagination: { ...prev.pagination, page: 0 }
    }));
  }, []);

  // 刷新数据
  const refresh = useCallback(async () => {
    await fetchEmployees();
  }, [fetchEmployees]);

  // 搜索员工
  const searchEmployees = useCallback((searchTerm: string) => {
    updateFilters({ search: searchTerm });
  }, [updateFilters]);

  // 实时订阅
  useEffect(() => {
    let subscription: any;

    if (enableRealtime) {
      subscription = EmployeeAPI.subscribeToEmployees((payload) => {
        console.log('员工数据变更:', payload);
        // 数据变更时自动刷新
        fetchEmployees();
      });
    }

    return () => {
      if (subscription) {
        EmployeeAPI.unsubscribeFromEmployees(subscription);
      }
    };
  }, [enableRealtime, fetchEmployees]);

  // 当分页或过滤条件变化时自动获取数据
  useEffect(() => {
    if (autoFetch) {
      fetchEmployees();
    }
  }, [
    state.pagination.page, 
    state.pagination.pageSize, 
    JSON.stringify(state.filters), // 序列化对象避免引用比较
    autoFetch, 
    fetchEmployees
  ]);

  // 初始加载
  useEffect(() => {
    if (autoFetch) {
      fetchEmployees();
    }
  }, []); // 只在组件挂载时执行一次

  // 返回状态和操作方法
  const actions: UseEmployeesActions = {
    fetchEmployees,
    setPage,
    setPageSize,
    setFilters,
    updateFilters,
    clearFilters,
    refresh,
    searchEmployees
  };

  return {
    // 状态
    data: state.data,
    loading: state.loading,
    error: state.error,
    pagination: {
      ...state.pagination,
      totalPages
    },
    filters: state.filters,
    
    // 计算属性
    isEmpty: state.data.length === 0 && !state.loading,
    hasData: state.data.length > 0,
    hasNextPage: state.pagination.page < totalPages - 1,
    hasPreviousPage: state.pagination.page > 0,
    
    // 操作方法
    ...actions
  };
}