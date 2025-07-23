import { useState, useEffect, useCallback } from 'react';
import { EmployeeAPI } from '../lib/employeeApi_new';
import type { 
  Employee, 
  EmployeeWithDetails, 
  EmployeePersonalDetails,
  EmployeeContact,
  EmployeeBankAccount,
  EmployeeEducation,
  EmployeeJobHistory
} from '../types/employee_new';

interface UseEmployeeOptions {
  employeeId?: string;
  autoFetch?: boolean;
}

interface UseEmployeeState {
  employee: EmployeeWithDetails | null;
  educations: EmployeeEducation[];
  jobHistories: EmployeeJobHistory[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
}

interface UseEmployeeActions {
  fetchEmployee: (id: string) => Promise<void>;
  fetchEmployeeWithSensitiveData: (id: string) => Promise<void>;
  createEmployee: (data: {
    employee: Partial<Employee>;
    personalDetails: Partial<EmployeePersonalDetails>;
    contacts: Partial<EmployeeContact>[];
    bankAccounts: Partial<EmployeeBankAccount>[];
  }) => Promise<Employee | null>;
  updateEmployee: (id: string, data: {
    employee: Partial<Employee>;
    personalDetails: Partial<EmployeePersonalDetails>;
    contacts: Partial<EmployeeContact>[];
    bankAccounts: Partial<EmployeeBankAccount>[];
  }) => Promise<boolean>;
  deleteEmployee: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  reset: () => void;
}

export function useEmployee(options: UseEmployeeOptions = {}) {
  const { employeeId, autoFetch = true } = options;

  // 状态管理
  const [state, setState] = useState<UseEmployeeState>({
    employee: null,
    educations: [],
    jobHistories: [],
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
      
      // 获取教育背景
      const educations = await EmployeeAPI.getEmployeeEducations(id);
      
      // 获取工作履历
      const jobHistories = await EmployeeAPI.getEmployeeJobHistories(id);
      
      setState(prev => ({
        ...prev,
        employee,
        educations,
        jobHistories,
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

  // 获取员工完整信息（用于编辑）
  const fetchEmployeeWithSensitiveData = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const employee = await EmployeeAPI.getEmployeeWithSensitiveData(id);
      
      // 获取教育背景
      const educations = await EmployeeAPI.getEmployeeEducations(id);
      
      // 获取工作履历
      const jobHistories = await EmployeeAPI.getEmployeeJobHistories(id);
      
      setState(prev => ({
        ...prev,
        employee,
        educations,
        jobHistories,
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

  // 创建员工
  const createEmployee = useCallback(async (data: {
    employee: Partial<Employee>;
    personalDetails: Partial<EmployeePersonalDetails>;
    contacts: Partial<EmployeeContact>[];
    bankAccounts: Partial<EmployeeBankAccount>[];
  }): Promise<Employee | null> => {
    setState(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      // 准备员工基本数据
      const employeeData: Partial<Employee> = {
        full_name: data.employee.full_name || '',
        gender: data.employee.gender || null,
        date_of_birth: data.employee.date_of_birth || null,
        hire_date: data.employee.hire_date || new Date().toISOString(),
        first_work_date: data.employee.first_work_date || null,
        current_status: data.employee.current_status || 'active',
        employment_status: data.employee.employment_status || 'active',
        department_id: data.employee.department_id || null,
        position_id: data.employee.position_id || null,
        position_text: data.employee.position_text || null,
        job_level_text: data.employee.job_level_text || null,
        personnel_category_id: data.employee.personnel_category_id || null,
      };

      const newEmployee = await EmployeeAPI.createEmployee(employeeData);
      
      // 如果有额外的信息需要更新（个人详情、联系方式、银行信息等）
      if (newEmployee) {
        // 更新个人详情
        if (Object.keys(data.personalDetails).length > 0) {
          await EmployeeAPI.updateEmployeePersonalDetails(
            newEmployee.id, 
            data.personalDetails
          );
        }
        
        // 更新联系方式
        for (const contact of data.contacts) {
          await EmployeeAPI.updateEmployeeContact(
            newEmployee.id, 
            contact
          );
        }
        
        // 更新银行账户信息
        for (const bankAccount of data.bankAccounts) {
          await EmployeeAPI.updateEmployeeBankAccount(
            newEmployee.id, 
            bankAccount
          );
        }
      }
      
      setState(prev => ({ ...prev, saving: false }));
      return newEmployee;
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        saveError: error instanceof Error ? error.message : '创建员工失败'
      }));
      return null;
    }
  }, []);

  // 更新员工信息
  const updateEmployee = useCallback(async (id: string, data: {
    employee: Partial<Employee>;
    personalDetails: Partial<EmployeePersonalDetails>;
    contacts: Partial<EmployeeContact>[];
    bankAccounts: Partial<EmployeeBankAccount>[];
  }): Promise<boolean> => {
    setState(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      // 更新员工基本信息
      let updatedEmployee = null;
      if (Object.keys(data.employee).length > 0) {
        updatedEmployee = await EmployeeAPI.updateEmployeeBaseInfo(id, data.employee);
      }
      
      // 更新个人详情
      if (Object.keys(data.personalDetails).length > 0) {
        await EmployeeAPI.updateEmployeePersonalDetails(id, data.personalDetails);
      }
      
      // 更新联系方式
      for (const contact of data.contacts) {
        await EmployeeAPI.updateEmployeeContact(id, contact);
      }
      
      // 更新银行账户信息
      for (const bankAccount of data.bankAccounts) {
        await EmployeeAPI.updateEmployeeBankAccount(id, bankAccount);
      }
      
      // 如果有更新员工基本信息，更新本地状态
      if (updatedEmployee) {
        setState(prev => ({
          ...prev,
          employee: prev.employee ? { ...prev.employee, ...updatedEmployee } as EmployeeWithDetails : null,
          saving: false
        }));
      } else {
        setState(prev => ({ ...prev, saving: false }));
      }

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
    fetchEmployeeWithSensitiveData,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    refresh,
    reset
  };

  // 教育背景操作方法
  const addEducation = useCallback(async (educationData: Omit<EmployeeEducation, 'id' | 'created_at'>) => {
    if (!state.employee) return null;
    
    try {
      const newEducation = await EmployeeAPI.addEmployeeEducation(educationData);
      setState(prev => ({
        ...prev,
        educations: [newEducation, ...prev.educations]
      }));
      return newEducation;
    } catch (error) {
      console.error('添加教育背景失败:', error);
      return null;
    }
  }, [state.employee, state.educations]);

  const updateEducation = useCallback(async (id: string, educationData: Partial<EmployeeEducation>) => {
    try {
      const updatedEducation = await EmployeeAPI.updateEmployeeEducation(id, educationData);
      setState(prev => ({
        ...prev,
        educations: prev.educations.map(edu => 
          edu.id === id ? { ...edu, ...updatedEducation } : edu
        )
      }));
      return updatedEducation;
    } catch (error) {
      console.error('更新教育背景失败:', error);
      return null;
    }
  }, []);

  const deleteEducation = useCallback(async (id: string) => {
    try {
      await EmployeeAPI.deleteEmployeeEducation(id);
      setState(prev => ({
        ...prev,
        educations: prev.educations.filter(edu => edu.id !== id)
      }));
      return true;
    } catch (error) {
      console.error('删除教育背景失败:', error);
      return false;
    }
  }, []);

  // 工作履历操作方法
  const addJobHistory = useCallback(async (jobHistoryData: Omit<EmployeeJobHistory, 'id' | 'created_at'>) => {
    if (!state.employee) return null;
    
    try {
      const newJobHistory = await EmployeeAPI.addEmployeeJobHistory(jobHistoryData);
      setState(prev => ({
        ...prev,
        jobHistories: [newJobHistory, ...prev.jobHistories]
      }));
      return newJobHistory;
    } catch (error) {
      console.error('添加工作履历失败:', error);
      return null;
    }
  }, [state.employee, state.jobHistories]);

  const updateJobHistory = useCallback(async (id: string, jobHistoryData: Partial<EmployeeJobHistory>) => {
    try {
      const updatedJobHistory = await EmployeeAPI.updateEmployeeJobHistory(id, jobHistoryData);
      setState(prev => ({
        ...prev,
        jobHistories: prev.jobHistories.map(job => 
          job.id === id ? { ...job, ...updatedJobHistory } : job
        )
      }));
      return updatedJobHistory;
    } catch (error) {
      console.error('更新工作履历失败:', error);
      return null;
    }
  }, []);

  const deleteJobHistory = useCallback(async (id: string) => {
    try {
      await EmployeeAPI.deleteEmployeeJobHistory(id);
      setState(prev => ({
        ...prev,
        jobHistories: prev.jobHistories.filter(job => job.id !== id)
      }));
      return true;
    } catch (error) {
      console.error('删除工作履历失败:', error);
      return false;
    }
  }, []);

  return {
    // 状态
    employee: state.employee,
    educations: state.educations,
    jobHistories: state.jobHistories,
    loading: state.loading,
    error: state.error,
    saving: state.saving,
    saveError: state.saveError,
    
    // 计算属性
    hasEmployee: state.employee !== null,
    isEditable: state.employee?.current_status === 'active',
    
    // 操作方法
    ...actions,
    
    // 教育背景操作方法
    addEducation,
    updateEducation,
    deleteEducation,
    
    // 工作履历操作方法
    addJobHistory,
    updateJobHistory,
    deleteJobHistory
  };
}

// 创建员工的专用 Hook
interface UseCreateEmployeeState {
  creating: boolean;
  error: string | null;
}

interface UseCreateEmployeeActions {
  createEmployee: (data: {
    employee: Partial<Employee>;
    personalDetails: Partial<EmployeePersonalDetails>;
    contacts: Partial<EmployeeContact>[];
    bankAccounts: Partial<EmployeeBankAccount>[];
  }) => Promise<Employee | null>;
  reset: () => void;
}

export function useCreateEmployee() {
  const [state, setState] = useState<UseCreateEmployeeState>({
    creating: false,
    error: null
  });

  const createEmployee = useCallback(async (data: {
    employee: Partial<Employee>;
    personalDetails: Partial<EmployeePersonalDetails>;
    contacts: Partial<EmployeeContact>[];
    bankAccounts: Partial<EmployeeBankAccount>[];
  }): Promise<Employee | null> => {
    setState(prev => ({ ...prev, creating: true, error: null }));

    try {
      const employee = await EmployeeAPI.createEmployee(data.employee);
      
      // 如果有额外的信息需要更新（个人详情、联系方式、银行信息等）
      if (employee) {
        // 更新个人详情
        if (Object.keys(data.personalDetails).length > 0) {
          await EmployeeAPI.updateEmployeePersonalDetails(
            employee.id, 
            data.personalDetails
          );
        }
        
        // 更新联系方式
        for (const contact of data.contacts) {
          await EmployeeAPI.updateEmployeeContact(
            employee.id, 
            contact
          );
        }
        
        // 更新银行账户信息
        for (const bankAccount of data.bankAccounts) {
          await EmployeeAPI.updateEmployeeBankAccount(
            employee.id, 
            bankAccount
          );
        }
      }
      
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