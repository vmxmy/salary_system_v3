/**
 * 员工相关Hook库导出
 * 
 * 这个模块提供了完整的员工管理功能：
 * - 员工列表管理（CRUD操作）
 * - 员工详情管理（包含关联数据）
 * - 员工表单管理（创建和编辑）
 */

// 员工列表管理
export { useEmployeeList, useFilteredEmployeeList, employeeQueryKeys } from './useEmployeeList';
export type { EmployeeFilters, EmployeeSorting } from './useEmployeeList';

// 员工详情管理
export { useEmployeeDetail } from './useEmployeeDetail';

// 员工表单管理
export { useEmployeeForm } from './useEmployeeForm';
export type { 
  EmployeeFormData, 
  ValidationErrors, 
  FormMode, 
  EmployeeFormOptions 
} from './useEmployeeForm';