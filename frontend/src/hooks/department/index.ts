/**
 * 部门相关Hook库导出
 * 
 * 这个模块提供了完整的部门管理功能：
 * - 部门列表和树形结构管理
 * - 部门选择器功能
 */

// 部门管理
export { useDepartments, useDepartmentSelector, departmentQueryKeys } from './useDepartments';
export type { Department, DepartmentTreeNode } from './useDepartments';