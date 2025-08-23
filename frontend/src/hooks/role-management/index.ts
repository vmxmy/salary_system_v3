/**
 * 角色管理 Hooks 统一导出
 * 
 * 提供完整的角色管理功能集：
 * - 角色管理核心功能
 * - 角色权限分配管理
 * - 类型定义和工具函数
 */

// 导出核心角色管理 Hook
export { 
  useRoleManagement,
  type RoleInfo,
  type CreateRoleData,
  type UpdateRoleData,
  type RoleHierarchyNode,
  type RoleUsageStats,
  type RoleChangeHistory
} from './useRoleManagement';

// 导出角色权限管理 Hook
export {
  useRolePermissions,
  type PermissionInfo,
  type RolePermissionAssignment,
  type PermissionMatrixItem,
  type PermissionConflict,
  type PermissionInheritanceResult
} from './useRolePermissions';

// 组合 Hook：同时使用角色和权限管理功能
export function useCompleteRoleManagement() {
  const roleManagement = useRoleManagement();
  const rolePermissions = useRolePermissions();

  return {
    // 角色管理功能
    ...roleManagement,
    
    // 权限管理功能
    permissions: rolePermissions.permissions,
    rolePermissions: rolePermissions.rolePermissions,
    assignPermissionToRole: rolePermissions.assignPermissionToRole,
    revokePermissionFromRole: rolePermissions.revokePermissionFromRole,
    batchAssignPermissions: rolePermissions.batchAssignPermissions,
    calculatePermissionInheritance: rolePermissions.calculatePermissionInheritance,
    buildPermissionMatrix: rolePermissions.buildPermissionMatrix,
    detectPermissionConflicts: rolePermissions.detectPermissionConflicts,
    
    // 组合状态
    loading: roleManagement.loading || rolePermissions.loading,
    error: roleManagement.error || rolePermissions.error,
    
    // 工具方法
    getPermissionById: rolePermissions.getPermissionById,
    getRolePermissions: rolePermissions.getRolePermissions,
    hasRolePermission: rolePermissions.hasRolePermission
  };
}