/**
 * 新重构的Hook库统一导出
 * 
 * 这个文件提供了重构后的Hook架构的统一入口：
 * - 核心通用Hook（错误处理、加载状态、资源管理）
 * - 员工管理Hook
 * - 部门管理Hook  
 * - 职位管理Hook
 * - 人员类别管理Hook
 */

// ============ 核心通用Hook ============
export * from './core';

// ============ 业务领域Hook ============

// 员工相关Hook
export * from './employee';

// 部门相关Hook
export * from './department';

// 职位相关Hook
export * from './position';

// 人员类别相关Hook
export * from './category';

// Dashboard相关Hook
export * from './dashboard';

// ============ 查询键统一导出（用于缓存管理） ============
export { employeeQueryKeys } from './employee/useEmployeeList';
export { departmentQueryKeys } from './department/useDepartments';
export { positionQueryKeys } from './position/usePositions';
export { personnelCategoryQueryKeys } from './category/usePersonnelCategories';
export { dashboardQueryKeys } from './dashboard/useDashboard';

// ============ 重构前的Hook（逐步迁移中） ============

// 保持向后兼容，原有Hook继续可用但会逐步迁移
// 这些Hook将在下个版本中标记为deprecated
export { useAuth } from './useAuth';
export { useTranslation } from './useTranslation';
export { useDebounce } from './useDebounce';
export { useDebouncedValue } from './useDebouncedValue';
export { useRealtimeConnection } from './useRealtimeConnection';
export { default as usePerformanceMonitor } from './usePerformanceMonitor';

// 薪资相关Hook（暂时保持原有架构）
export * from './payroll';

/**
 * Hook重构状态说明
 * 
 * ✅ 已完成重构并清理旧代码:
 * - useEmployeeList (替代并清理了原 useEmployees 的员工列表功能)
 * - useEmployeeDetail (替代并清理了原 useEmployees 的员工详情功能) 
 * - useEmployeeFullCreate (新增，支持完整员工创建)
 * - useEmployeeFormOptions (新增，表单选项管理)
 * - useDashboard (替代并清理了原 dashboard.service.ts)
 * - 已移除旧的 useEmployees.ts, employee.service.ts 和 dashboard.service.ts
 * 
 * 🔄 正在重构中:
 * - 薪资相关Hook (usePayroll系列)
 * - 统计相关Hook
 * 
 * ⏳ 计划重构:
 * - useInsuranceBases
 * - useExcelTemplate
 * - useTableConfiguration
 * 
 * 📝 迁移指南:
 * 
 * 迁移示例 (旧 → 新):
 * ```typescript
 * // 旧代码 (已清理)
 * import { useAllEmployees } from '@/hooks/useEmployees';
 * const { data: employees, isLoading } = useAllEmployees();
 * 
 * // 新代码
 * import { useEmployeeList } from '@/hooks/employee/useEmployeeList';
 * const { employees, loading } = useEmployeeList();
 * ```
 * 
 * 主要变化:
 * 1. 返回值结构更一致 (loading 而不是 isLoading)
 * 2. 更细粒度的加载状态 (loading.isInitialLoading, loading.isCreating 等)
 * 3. 统一的错误处理机制
 * 4. 操作函数集中在 actions 对象中
 * 5. 工具函数集中在 utils 对象中
 */