/**
 * 权限分配与批量操作组件统一入口
 * 
 * 提供完整的权限分配管理UI组件集：
 * - 权限分配矩阵组件
 * - 批量操作面板组件
 * - 用户权限摘要组件
 * - 权限冲突解决器组件
 * - 权限历史查看器组件
 * - 权限覆盖管理器组件
 */

// 核心权限分配组件
export { PermissionAssignmentMatrix } from './PermissionAssignmentMatrix';
export { BatchOperationPanel } from './BatchOperationPanel';
export { UserPermissionSummary } from './UserPermissionSummary';
export { PermissionConflictResolver } from './PermissionConflictResolver';
export { PermissionHistoryViewer } from './PermissionHistoryViewer';

// 权限覆盖管理器组件 - 待实现
// export { PermissionOverrideManager } from './PermissionOverrideManager';

// 组件类型导出 - 注意：Props接口需要从各组件文件中单独导出
// 暂时注释掉未导出的类型，待组件完善后再启用
// export type { PermissionAssignmentMatrixProps } from './PermissionAssignmentMatrix';
// export type { BatchOperationPanelProps } from './BatchOperationPanel';
// export type { UserPermissionSummaryProps } from './UserPermissionSummary';
// export type { PermissionConflictResolverProps } from './PermissionConflictResolver';
// export type { PermissionHistoryViewerProps } from './PermissionHistoryViewer';

// 便捷的组合导出 - 暂时注释掉，避免循环引用问题
// export const PermissionAssignmentComponents = {
//   AssignmentMatrix: PermissionAssignmentMatrix,
//   BatchOperationPanel: BatchOperationPanel,
//   UserSummary: UserPermissionSummary,
//   ConflictResolver: PermissionConflictResolver,
//   HistoryViewer: PermissionHistoryViewer
// } as const;

// 权限分配相关的常量和工具函数
export const PERMISSION_ASSIGNMENT_CONSTANTS = {
  // 批量操作类型
  BATCH_OPERATION_TYPES: {
    ASSIGN_PERMISSIONS: 'assign_permissions',
    REVOKE_PERMISSIONS: 'revoke_permissions',
    ASSIGN_ROLES: 'assign_roles',
    REMOVE_ROLES: 'remove_roles',
    CREATE_OVERRIDES: 'create_overrides',
    REMOVE_OVERRIDES: 'remove_overrides',
    APPLY_TEMPLATE: 'apply_template',
    CLEANUP_EXPIRED: 'cleanup_expired'
  } as const,

  // 权限源类型
  PERMISSION_SOURCE_TYPES: {
    ROLE: 'role',
    DIRECT: 'direct', 
    OVERRIDE: 'override'
  } as const,

  // 冲突类型
  CONFLICT_TYPES: {
    ROLE_PERMISSION_CONFLICT: 'role_permission_conflict',
    OVERRIDE_CONFLICT: 'override_conflict',
    INHERITANCE_CONFLICT: 'inheritance_conflict',
    EXPIRY_CONFLICT: 'expiry_conflict'
  } as const,

  // 权限覆盖类型
  OVERRIDE_TYPES: {
    GRANT: 'grant',
    DENY: 'deny'
  } as const,

  // 风险级别
  RISK_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium', 
    HIGH: 'high',
    CRITICAL: 'critical'
  } as const,

  // 历史操作类型
  HISTORY_ACTION_TYPES: {
    PERMISSION_GRANTED: 'permission_granted',
    PERMISSION_REVOKED: 'permission_revoked',
    ROLE_ASSIGNED: 'role_assigned',
    ROLE_REMOVED: 'role_removed',
    OVERRIDE_CREATED: 'override_created',
    OVERRIDE_REMOVED: 'override_removed',
    OVERRIDE_UPDATED: 'override_updated',
    PERMISSION_EXPIRED: 'permission_expired',
    LOGIN_ATTEMPT: 'login_attempt',
    ACCESS_DENIED: 'access_denied',
    SYSTEM_CHANGE: 'system_change'
  } as const
} as const;

// 权限分配工具函数
export const permissionAssignmentUtils = {
  /**
   * 获取权限源显示名称
   */
  getSourceTypeLabel: (sourceType: string): string => {
    const labels = {
      role: '角色',
      direct: '直接',
      override: '覆盖'
    };
    return labels[sourceType as keyof typeof labels] || sourceType;
  },

  /**
   * 获取权限源样式类名
   */
  getSourceTypeClassName: (sourceType: string): string => {
    const classNames = {
      role: 'badge-primary',
      direct: 'badge-secondary',
      override: 'badge-accent'
    };
    return classNames[sourceType as keyof typeof classNames] || 'badge-neutral';
  },

  /**
   * 获取冲突严重程度样式类名
   */
  getSeverityClassName: (severity: string): string => {
    const classNames = {
      critical: 'badge-error',
      high: 'badge-warning',
      medium: 'badge-info',
      low: 'badge-success'
    };
    return classNames[severity as keyof typeof classNames] || 'badge-neutral';
  },

  /**
   * 获取风险级别样式类名
   */
  getRiskLevelClassName: (riskLevel: string): string => {
    const classNames = {
      critical: 'badge-error animate-pulse',
      high: 'badge-error',
      medium: 'badge-warning',
      low: 'badge-success'
    };
    return classNames[riskLevel as keyof typeof classNames] || 'badge-neutral';
  },

  /**
   * 格式化操作类型显示名称
   */
  formatActionType: (actionType: string): string => {
    const actionLabels = {
      permission_granted: '权限授予',
      permission_revoked: '权限撤销',
      role_assigned: '角色分配',
      role_removed: '角色移除',
      override_created: '覆盖创建',
      override_removed: '覆盖移除',
      override_updated: '覆盖更新',
      permission_expired: '权限过期',
      login_attempt: '登录尝试',
      access_denied: '访问拒绝',
      system_change: '系统变更'
    };
    return actionLabels[actionType as keyof typeof actionLabels] || actionType;
  },

  /**
   * 计算权限统计
   */
  calculatePermissionStats: (permissions: any[]): {
    total: number;
    role: number;
    direct: number;
    override: number;
    expired: number;
  } => {
    const stats = {
      total: permissions.length,
      role: 0,
      direct: 0,
      override: 0,
      expired: 0
    };

    permissions.forEach(permission => {
      switch (permission.source?.type) {
        case 'role':
          stats.role++;
          break;
        case 'direct':
          stats.direct++;
          break;
        case 'override':
          stats.override++;
          break;
      }

      if (permission.expiresAt && new Date(permission.expiresAt) < new Date()) {
        stats.expired++;
      }
    });

    return stats;
  },

  /**
   * 验证批量操作输入
   */
  validateBatchOperation: (operations: any[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } => {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    if (operations.length === 0) {
      result.isValid = false;
      result.errors.push('至少需要一个操作');
      return result;
    }

    operations.forEach((operation, index) => {
      if (!operation.userId) {
        result.isValid = false;
        result.errors.push(`操作 ${index + 1}: 缺少用户ID`);
      }

      if (!operation.operationType) {
        result.isValid = false;
        result.errors.push(`操作 ${index + 1}: 缺少操作类型`);
      }

      // 检查高风险操作
      if (['remove_roles', 'revoke_permissions'].includes(operation.operationType)) {
        result.warnings.push(`操作 ${index + 1}: 这是一个高风险操作，请确认`);
      }
    });

    return result;
  }
} as const;