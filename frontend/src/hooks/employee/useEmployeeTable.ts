import { useMemo, useCallback } from 'react';
import { useUniversalTable, type UniversalTableOptions } from '@/hooks/core/useUniversalTable';
import { useEmployeeActions } from './useEmployeeActions';
import { formatCurrency } from '@/lib/format';
import { EyeIcon, PencilIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { getOptimizedConfig } from '@/lib/performanceConfig';

// 员工表格选项接口
export interface EmployeeTableOptions extends Omit<UniversalTableOptions, 'columnOverrides'> {
  // 是否显示敏感信息（如身份证号、薪资）
  showSensitiveData?: boolean;
  // 部门筛选
  departmentFilter?: string;
  // 状态筛选
  statusFilter?: 'active' | 'inactive' | 'all';
  // 操作回调
  onViewEmployee?: (employee: any) => void;
  onEditEmployee?: (employee: any) => void;
  onDeleteEmployee?: (employee: any) => void;
  // 自定义操作
  customActions?: Array<{
    key: string;
    label: string;
    icon?: React.ComponentType<any>;
    onClick: (employee: any) => void;
    variant?: string;
  }>;
}

// 敏感数据脱敏处理
function maskSensitiveData(value: string): string {
  if (!value || typeof value !== 'string') return '-';
  
  // 身份证号脱敏：显示前4位和后4位
  if (value.length === 18) {
    return `${value.slice(0, 4)}**********${value.slice(-4)}`;
  }
  
  // 其他敏感数据脱敏
  if (value.length > 6) {
    return `${value.slice(0, 3)}***${value.slice(-3)}`;
  }
  
  return '***';
}

/**
 * 员工表格 Hook
 * 基于通用表格 Hook，提供员工特定的功能和配置
 * @param options 员工表格选项
 * @returns 员工表格配置和操作
 */
export function useEmployeeTable(options?: EmployeeTableOptions) {
  // 员工相关操作
  const employeeActions = useEmployeeActions();

  // 构建筛选条件
  const filters = useMemo(() => {
    const baseFilters: Record<string, any> = {};
    
    // 部门筛选
    if (options?.departmentFilter) {
      baseFilters.department_id = options.departmentFilter;
    }
    
    // 状态筛选
    if (options?.statusFilter && options.statusFilter !== 'all') {
      baseFilters.is_active = options.statusFilter === 'active';
    }
    
    // 合并用户传入的筛选条件
    return { ...baseFilters, ...options?.filters };
  }, [options?.departmentFilter, options?.statusFilter, options?.filters]);

  // 列覆盖配置
  const columnOverrides = useMemo(() => {
    const overrides: Record<string, any> = {};
    
    // 身份证号列 - 根据是否显示敏感数据决定渲染方式
    overrides.id_number = {
      header: '身份证号',
      cell: ({ getValue }: { getValue: () => any }) => {
        const value = getValue();
        return options?.showSensitiveData ? value : maskSensitiveData(value);
      },
      size: 160,
    };
    
    // 员工状态列 - 使用badge样式
    overrides.is_active = {
      header: '状态',
      cell: ({ getValue }: { getValue: () => any }) => {
        const isActive = getValue();
        return isActive ? '在职' : '离职';
      },
      size: 80,
    };
    
    // 入职日期列 - 格式化显示
    overrides.hire_date = {
      header: '入职日期',
      cell: ({ getValue }: { getValue: () => any }) => {
        const date = getValue();
        return date ? new Date(date).toLocaleDateString('zh-CN') : '-';
      },
      size: 120,
    };
    
    // 如果有薪资相关字段，进行特殊处理
    overrides.base_salary = {
      header: '基本工资',
      cell: ({ getValue }: { getValue: () => any }) => {
        const salary = getValue();
        if (!salary) return '-';
        
        return options?.showSensitiveData 
          ? formatCurrency(salary)
          : '****';
      },
      size: 120,
    };
    
    return overrides;
  }, [options?.showSensitiveData]);

  // 通用表格配置 - 使用优化后的性能参数
  const performanceConfig = getOptimizedConfig();
  
  
  const universalTableOptions: UniversalTableOptions = {
    // 默认使用员工详情视图
    enableRowSelection: options?.enableRowSelection ?? true,
    enableActions: options?.enableActions ?? true,
    permissions: options?.permissions ?? ['view', 'edit', 'delete'],
    filters,
    columnOverrides,
    
    // 优化后的分页配置
    pagination: options?.pagination === undefined ? undefined : {
      pageSize: performanceConfig.pagination.employeePageSize,
      pageIndex: 0,
      ...options?.pagination,
    },
    
    // 操作回调 - 连接到员工页面的处理函数
    actionCallbacks: {
      onView: options?.onViewEmployee,
      onEdit: options?.onEditEmployee,
      onDelete: options?.onDeleteEmployee,
    },
    
    // 员工表特定的默认隐藏列
    defaultHiddenColumns: [
      'id', 'employee_id', 'created_at', 'updated_at',
      ...(options?.showSensitiveData ? [] : ['base_salary']),
      ...(options?.defaultHiddenColumns || [])
    ],
    
    // 搜索字段
    searchFields: options?.searchFields ?? [
      'employee_name', 'id_number', 'phone', 'email', 'department_name'
    ],
    
    // 其他选项（排除已经处理的 pagination 和 columnOverrides）
    ...Object.fromEntries(
      Object.entries(options || {}).filter(([key]) => 
        !['pagination', 'columnOverrides'].includes(key)
      )
    ),
  };

  
  // 使用通用表格 Hook
  const universalTable = useUniversalTable('view_employee_basic_info', universalTableOptions);

  // 员工特定的操作方法
  const createEmployee = useCallback(async (employeeData: any) => {
    try {
      const newEmployee = await employeeActions.create(employeeData);
      await universalTable.refetch(); // 刷新数据
      return newEmployee;
    } catch (error) {
      console.error('Failed to create employee:', error);
      throw error;
    }
  }, [employeeActions.create, universalTable.refetch]);

  const updateEmployee = useCallback(async (id: string, employeeData: any) => {
    try {
      const updatedEmployee = await employeeActions.update(id, employeeData);
      await universalTable.refetch(); // 刷新数据
      return updatedEmployee;
    } catch (error) {
      console.error('Failed to update employee:', error);
      throw error;
    }
  }, [employeeActions.update, universalTable.refetch]);

  const deleteEmployee = useCallback(async (id: string) => {
    try {
      await employeeActions.delete(id);
      await universalTable.refetch(); // 刷新数据
    } catch (error) {
      console.error('Failed to delete employee:', error);
      throw error;
    }
  }, [employeeActions.delete, universalTable.refetch]);

  // 批量操作
  const batchUpdate = useCallback(async (ids: string[], updates: any) => {
    try {
      await Promise.all(ids.map(id => employeeActions.update(id, updates)));
      await universalTable.refetch();
    } catch (error) {
      console.error('Failed to batch update employees:', error);
      throw error;
    }
  }, [employeeActions.update, universalTable.refetch]);

  const batchDelete = useCallback(async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => employeeActions.delete(id)));
      await universalTable.refetch();
    } catch (error) {
      console.error('Failed to batch delete employees:', error);
      throw error;
    }
  }, [employeeActions.delete, universalTable.refetch]);

  // 统计信息
  const statistics = useMemo(() => {
    const tableData = universalTable.data || [];
    
    return {
      total: tableData.length,
      active: tableData.filter((emp: any) => emp.is_active).length,
      inactive: tableData.filter((emp: any) => !emp.is_active).length,
      departments: new Set(tableData.map((emp: any) => emp.department_name)).size,
    };
  }, [universalTable.data]);

  return {
    // 继承通用表格的所有功能
    ...universalTable,
    
    // 员工特定的CRUD操作
    createEmployee,
    updateEmployee,
    deleteEmployee,
    batchUpdate,
    batchDelete,
    
    // 统计信息
    statistics,
    
    // 员工数据（带类型）
    employees: universalTable.data,
    
    // 敏感数据控制
    showSensitiveData: options?.showSensitiveData ?? false,
    
    // 筛选状态
    currentFilters: {
      department: options?.departmentFilter,
      status: options?.statusFilter ?? 'all',
    },
  };
}

/**
 * 简化版员工表格 Hook - 仅用于展示
 * @param options 基础选项
 * @returns 简化的员工表格配置
 */
export function useSimpleEmployeeTable(options?: {
  departmentFilter?: string;
  statusFilter?: 'active' | 'inactive' | 'all';
  showSensitiveData?: boolean;
}) {
  return useEmployeeTable({
    ...options,
    enableActions: false,
    enableRowSelection: false,
    permissions: ['view'],
  });
}

/**
 * 查询键工厂
 */
export const employeeTableKeys = {
  all: ['employee-table'] as const,
  table: (options?: EmployeeTableOptions) => [...employeeTableKeys.all, options] as const,
};