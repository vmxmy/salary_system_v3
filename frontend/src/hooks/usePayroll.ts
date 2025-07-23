import { useState, useEffect, useCallback } from 'react';
import { PayrollAPI } from '../lib/payrollApi';
import type { 
  SalaryComponent, 
  Payroll, 
  PayrollItem,
  SalaryComponentWithDetails,
  PayrollWithDetails,
  PayrollItemWithDetails
} from '../types/employee_new';

// 薪资组件管理 Hook
interface UseSalaryComponentsState {
  components: SalaryComponentWithDetails[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
}

interface UseSalaryComponentsActions {
  fetchComponents: () => Promise<void>;
  createComponent: (data: Omit<SalaryComponent, 'id' | 'created_at'>) => Promise<SalaryComponent | null>;
  updateComponent: (id: string, data: Partial<SalaryComponent>) => Promise<SalaryComponent | null>;
  deleteComponent: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useSalaryComponents() {
  const [state, setState] = useState<UseSalaryComponentsState>({
    components: [],
    loading: false,
    error: null,
    saving: false,
    saveError: null
  });

  // 获取薪资组件列表
  const fetchComponents = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const components = await PayrollAPI.getSalaryComponents();
      setState(prev => ({
        ...prev,
        components,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '获取薪资组件失败'
      }));
    }
  }, []);

  // 创建薪资组件
  const createComponent = useCallback(async (data: Omit<SalaryComponent, 'id' | 'created_at'>): Promise<SalaryComponent | null> => {
    setState(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      const newComponent = await PayrollAPI.createSalaryComponent(data);
      setState(prev => ({
        ...prev,
        components: [newComponent, ...prev.components],
        saving: false
      }));
      return newComponent;
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        saveError: error instanceof Error ? error.message : '创建薪资组件失败'
      }));
      return null;
    }
  }, []);

  // 更新薪资组件
  const updateComponent = useCallback(async (id: string, data: Partial<SalaryComponent>): Promise<SalaryComponent | null> => {
    setState(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      const updatedComponent = await PayrollAPI.updateSalaryComponent(id, data);
      setState(prev => ({
        ...prev,
        components: prev.components.map(comp => 
          comp.id === id ? { ...comp, ...updatedComponent } : comp
        ),
        saving: false
      }));
      return updatedComponent;
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        saveError: error instanceof Error ? error.message : '更新薪资组件失败'
      }));
      return null;
    }
  }, []);

  // 删除薪资组件
  const deleteComponent = useCallback(async (id: string): Promise<boolean> => {
    setState(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      await PayrollAPI.deleteSalaryComponent(id);
      setState(prev => ({
        ...prev,
        components: prev.components.filter(comp => comp.id !== id),
        saving: false
      }));
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        saveError: error instanceof Error ? error.message : '删除薪资组件失败'
      }));
      return false;
    }
  }, []);

  // 刷新数据
  const refresh = useCallback(async () => {
    await fetchComponents();
  }, [fetchComponents]);

  // 初始化时获取数据
  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const actions: UseSalaryComponentsActions = {
    fetchComponents,
    createComponent,
    updateComponent,
    deleteComponent,
    refresh
  };

  return {
    // 状态
    components: state.components,
    loading: state.loading,
    error: state.error,
    saving: state.saving,
    saveError: state.saveError,
    
    // 操作方法
    ...actions
  };
}

// 薪资单管理 Hook
interface UsePayrollsState {
  payrolls: PayrollWithDetails[];
  payroll: PayrollWithDetails | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
  total: number;
  page: number;
  pageSize: number;
}

interface UsePayrollsActions {
  fetchPayrolls: (page?: number, pageSize?: number, filters?: { 
    employee_id?: string; 
    status?: string; 
    pay_period_start?: string; 
    pay_period_end?: string 
  }) => Promise<void>;
  fetchPayroll: (id: string) => Promise<void>;
  createPayroll: (data: Omit<Payroll, 'id' | 'created_at' | 'updated_at'>) => Promise<Payroll | null>;
  updatePayroll: (id: string, data: Partial<Payroll>) => Promise<Payroll | null>;
  deletePayroll: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function usePayrolls() {
  const [state, setState] = useState<UsePayrollsState>({
    payrolls: [],
    payroll: null,
    loading: false,
    error: null,
    saving: false,
    saveError: null,
    total: 0,
    page: 0,
    pageSize: 20
  });

  // 获取薪资单列表
  const fetchPayrolls = useCallback(async (
    page = 0, 
    pageSize = 20, 
    filters: { 
      employee_id?: string; 
      status?: string; 
      pay_period_start?: string; 
      pay_period_end?: string 
    } = {}
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, total } = await PayrollAPI.getPayrolls(page, pageSize, filters);
      setState(prev => ({
        ...prev,
        payrolls: data,
        total,
        page,
        pageSize,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '获取薪资单列表失败'
      }));
    }
  }, []);

  // 获取单个薪资单详情
  const fetchPayroll = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const payroll = await PayrollAPI.getPayroll(id);
      setState(prev => ({
        ...prev,
        payroll,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '获取薪资单详情失败'
      }));
    }
  }, []);

  // 创建薪资单
  const createPayroll = useCallback(async (data: Omit<Payroll, 'id' | 'created_at' | 'updated_at'>): Promise<Payroll | null> => {
    setState(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      const newPayroll = await PayrollAPI.createPayroll(data);
      setState(prev => ({
        ...prev,
        saving: false
      }));
      return newPayroll;
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        saveError: error instanceof Error ? error.message : '创建薪资单失败'
      }));
      return null;
    }
  }, []);

  // 更新薪资单
  const updatePayroll = useCallback(async (id: string, data: Partial<Payroll>): Promise<Payroll | null> => {
    setState(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      const updatedPayroll = await PayrollAPI.updatePayroll(id, data);
      setState(prev => ({
        ...prev,
        payroll: prev.payroll?.id === id ? { ...prev.payroll, ...updatedPayroll } : prev.payroll,
        payrolls: prev.payrolls.map(p => 
          p.id === id ? { ...p, ...updatedPayroll } : p
        ),
        saving: false
      }));
      return updatedPayroll;
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        saveError: error instanceof Error ? error.message : '更新薪资单失败'
      }));
      return null;
    }
  }, []);

  // 删除薪资单
  const deletePayroll = useCallback(async (id: string): Promise<boolean> => {
    setState(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      await PayrollAPI.deletePayroll(id);
      setState(prev => ({
        ...prev,
        payrolls: prev.payrolls.filter(p => p.id !== id),
        payroll: prev.payroll?.id === id ? null : prev.payroll,
        saving: false
      }));
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        saveError: error instanceof Error ? error.message : '删除薪资单失败'
      }));
      return false;
    }
  }, []);

  // 刷新数据
  const refresh = useCallback(async () => {
    await fetchPayrolls(state.page, state.pageSize);
  }, [fetchPayrolls, state.page, state.pageSize]);

  const actions: UsePayrollsActions = {
    fetchPayrolls,
    fetchPayroll,
    createPayroll,
    updatePayroll,
    deletePayroll,
    refresh
  };

  return {
    // 状态
    payrolls: state.payrolls,
    payroll: state.payroll,
    loading: state.loading,
    error: state.error,
    saving: state.saving,
    saveError: state.saveError,
    total: state.total,
    page: state.page,
    pageSize: state.pageSize,
    
    // 操作方法
    ...actions
  };
}

// 薪资单项明细管理 Hook
interface UsePayrollItemsState {
  items: PayrollItemWithDetails[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
}

interface UsePayrollItemsActions {
  fetchItems: (payrollId: string) => Promise<void>;
  addItem: (data: Omit<PayrollItem, 'id' | 'created_at'>) => Promise<PayrollItem | null>;
  updateItem: (id: string, data: Partial<PayrollItem>) => Promise<PayrollItem | null>;
  deleteItem: (id: string) => Promise<boolean>;
  refresh: (payrollId: string) => Promise<void>;
  calculateTotals: (payrollId: string) => Promise<{ grossPay: number; totalDeductions: number; netPay: number } | null>;
}

export function usePayrollItems() {
  const [state, setState] = useState<UsePayrollItemsState>({
    items: [],
    loading: false,
    error: null,
    saving: false,
    saveError: null
  });

  // 获取薪资单项明细列表
  const fetchItems = useCallback(async (payrollId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 注意：这里需要修改 PayrollAPI 以支持通过 payrollId 获取 items
      // 暂时用空数组代替
      setState(prev => ({
        ...prev,
        items: [],
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '获取薪资单项明细失败'
      }));
    }
  }, []);

  // 添加薪资单项明细
  const addItem = useCallback(async (data: Omit<PayrollItem, 'id' | 'created_at'>): Promise<PayrollItem | null> => {
    setState(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      const newItem = await PayrollAPI.addPayrollItem(data);
      setState(prev => ({
        ...prev,
        items: [newItem, ...prev.items],
        saving: false
      }));
      return newItem;
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        saveError: error instanceof Error ? error.message : '添加薪资单项明细失败'
      }));
      return null;
    }
  }, []);

  // 更新薪资单项明细
  const updateItem = useCallback(async (id: string, data: Partial<PayrollItem>): Promise<PayrollItem | null> => {
    setState(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      const updatedItem = await PayrollAPI.updatePayrollItem(id, data);
      setState(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === id ? { ...item, ...updatedItem } : item
        ),
        saving: false
      }));
      return updatedItem;
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        saveError: error instanceof Error ? error.message : '更新薪资单项明细失败'
      }));
      return null;
    }
  }, []);

  // 删除薪资单项明细
  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    setState(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      await PayrollAPI.deletePayrollItem(id);
      setState(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id),
        saving: false
      }));
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        saveError: error instanceof Error ? error.message : '删除薪资单项明细失败'
      }));
      return false;
    }
  }, []);

  // 刷新数据
  const refresh = useCallback(async (payrollId: string) => {
    await fetchItems(payrollId);
  }, [fetchItems]);

  // 计算薪资单总额
  const calculateTotals = useCallback(async (payrollId: string) => {
    setState(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      const totals = await PayrollAPI.calculatePayrollTotals(payrollId);
      setState(prev => ({ ...prev, saving: false }));
      return totals;
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        saveError: error instanceof Error ? error.message : '计算薪资单总额失败'
      }));
      return null;
    }
  }, []);

  const actions: UsePayrollItemsActions = {
    fetchItems,
    addItem,
    updateItem,
    deleteItem,
    refresh,
    calculateTotals
  };

  return {
    // 状态
    items: state.items,
    loading: state.loading,
    error: state.error,
    saving: state.saving,
    saveError: state.saveError,
    
    // 操作方法
    ...actions
  };
}