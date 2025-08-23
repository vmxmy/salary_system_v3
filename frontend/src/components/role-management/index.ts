/**
 * 角色管理组件统一导出
 * 
 * 提供完整的角色管理UI组件集：
 * - 角色层级树组件
 * - 权限矩阵组件
 * - 角色管理表单
 * - 角色统计组件
 */

// 核心角色管理组件
export { RoleHierarchyTree } from './RoleHierarchyTree';
export { PermissionMatrix } from './PermissionMatrix';
export { RoleManagementModal } from './RoleManagementModal';
export { RoleStatistics } from './RoleStatistics';

// 组件类型导出（如果需要）
export type { 
  RoleHierarchyTreeProps 
} from './RoleHierarchyTree';

export type { 
  PermissionMatrixProps 
} from './PermissionMatrix';

export type { 
  RoleManagementModalProps 
} from './RoleManagementModal';

export type { 
  RoleStatisticsProps 
} from './RoleStatistics';

// 便捷的组合导出
export const RoleManagementComponents = {
  HierarchyTree: RoleHierarchyTree,
  PermissionMatrix: PermissionMatrix,
  ManagementModal: RoleManagementModal,
  Statistics: RoleStatistics
} as const;