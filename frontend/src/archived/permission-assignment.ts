/**
 * 权限分配系统类型定义
 * 
 * 支持权限分配、批量操作、权限覆盖和历史管理
 */

// 权限分配相关类型
export interface PermissionAssignment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  resourceType: string;
  actionType: string;
  assignmentType: 'role' | 'direct' | 'override';
  sourceId?: string; // 角色ID或覆盖ID
  sourceName?: string; // 角色名或覆盖描述
  assignedBy?: string;
  assignedByName?: string;
  assignedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface EffectivePermission {
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  resourceType: string;
  actionType: string;
  isGranted: boolean;
  source: PermissionSource;
  priority: number;
  conflicts?: ConflictInfo[];
  expiresAt?: Date;
}

export interface PermissionMatrix {
  userId: string;
  userName: string;
  resources: ResourcePermissions[];
  effectivePermissions: EffectivePermission[];
  inheritanceTree: PermissionInheritanceTree[];
}

export interface ResourcePermissions {
  resourceId: string;
  resourceCode: string;
  resourceName: string;
  resourceType: string;
  permissions: Array<{
    permissionId: string;
    permissionCode: string;
    permissionName: string;
    actionType: string;
    isGranted: boolean;
    source: PermissionSource;
    conflicts?: ConflictInfo[];
  }>;
}

export interface PermissionSource {
  type: 'role' | 'direct' | 'override';
  sourceId: string;
  sourceName: string;
  priority: number;
  expiresAt?: Date;
}

export interface ConflictInfo {
  conflictType: 'role_permission' | 'override_conflict' | 'expiry_mismatch';
  conflictingSource: PermissionSource;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PermissionInheritanceTree {
  permissionId: string;
  permissionName: string;
  finalDecision: 'granted' | 'denied' | 'undefined';
  sources: InheritanceNode[];
}

export interface InheritanceNode {
  level: number;
  sourceType: 'role' | 'parent_role' | 'override' | 'default';
  sourceId: string;
  sourceName: string;
  decision: 'grant' | 'deny' | 'inherit';
  priority: number;
  children?: InheritanceNode[];
}

export interface UserPermissionSummary {
  userId: string;
  userName: string;
  userEmail: string;
  primaryRole?: string;
  additionalRoles: string[];
  totalPermissions: number;
  directPermissions: number;
  rolePermissions: number;
  overridePermissions: number;
  expiredPermissions: number;
  conflictCount: number;
  lastUpdated: Date;
  permissionsByCategory: Array<{
    category: string;
    count: number;
    details: PermissionDetail[];
  }>;
}

export interface PermissionDetail {
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  resourceType: string;
  actionType: string;
  source: PermissionSource;
  isActive: boolean;
  expiresAt?: Date;
}

export interface PermissionConflict {
  id: string;
  userId: string;
  userName: string;
  conflictType: 'role_permission_conflict' | 'override_conflict' | 'inheritance_conflict' | 'expiry_conflict';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  involvedPermissions: Array<{
    permissionId: string;
    permissionName: string;
    sources: PermissionSource[];
  }>;
  suggestedResolution?: string;
  autoResolvable: boolean;
  detectedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  metadata?: Record<string, any>;
}

// 批量操作相关类型
export interface BatchOperation {
  userId: string;
  permissionId: string;
  operationType: BatchOperationType;
  reason?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export type BatchOperationType = 
  | 'assign_permissions'
  | 'revoke_permissions'
  | 'assign_roles'
  | 'remove_roles'
  | 'create_overrides'
  | 'remove_overrides'
  | 'apply_template'
  | 'apply_role_permissions'
  | 'cleanup_expired'
  | 'remove_inactive';

export interface BatchOperationResult {
  id: string;
  success: boolean;
  error?: string;
  operationType: BatchOperationType;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
  estimatedTimeRemaining: number; // 毫秒
  currentBatch: number;
  totalBatches: number;
}

export interface OperationError {
  operationId: string;
  message: string;
  timestamp: Date;
}

export interface BatchValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
  estimatedDuration?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  affectedUsers?: string[];
  conflictingOperations?: OperationConflict[];
}

export interface ValidationSummary {
  totalOperations: number;
  validOperations: number;
  invalidOperations: number;
  estimatedDuration: number;
}

export interface ValidationError {
  code?: string;
  message: string;
  operationIndex?: number;
  field?: string;
}

export interface ValidationWarning {
  code?: string;
  message: string;
  operationIndex?: number;
  suggestion?: string;
  type?: string;
  affectedOperations?: number[];
}

export interface OperationConflict {
  operationIndex1: number;
  operationIndex2: number;
  conflictType: 'duplicate_assignment' | 'revoke_before_assign' | 'role_permission_overlap';
  description: string;
  resolution: 'merge' | 'sequence' | 'skip_duplicate';
}

export interface AssignmentOperation {
  type: 'assign' | 'revoke' | 'override';
  userId: string;
  permissionId?: string;
  roleId?: string;
  overrideType?: 'grant' | 'deny';
  reason?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

// 权限覆盖相关类型
export interface PermissionOverride {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  resourceType: string;
  actionType: string;
  overrideType: 'grant' | 'deny';
  reason?: string;
  grantedBy?: string;
  grantedByName?: string;
  grantedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  priority: number;
  scope?: 'global' | 'resource';
  resourceId?: string;
  metadata?: Record<string, any>;
}

export interface OverrideConflict {
  id: string;
  conflictType: 'multiple_overrides' | 'role_override_conflict' | 'inheritance_override_conflict';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  involvedOverrides: PermissionOverride[];
  suggestedResolution?: OverrideResolution;
  detectedAt: Date;
}

export interface OverrideResolution {
  type: 'remove_lower_priority' | 'merge_overrides' | 'escalate_to_admin' | 'create_exception';
  description: string;
  parameters?: Record<string, any>;
}

export interface OverrideTemplate {
  id: string;
  name: string;
  description: string;
  category?: string;
  overrides: Array<{
    permissionId: string;
    overrideType: 'grant' | 'deny';
    reason?: string;
    expiresAt?: Date;
    metadata?: Record<string, any>;
  }>;
  isPublic: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  usageCount: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface TemporaryOverride extends PermissionOverride {
  duration: number; // 小时
  autoRevoke: boolean;
  maxExtensions: number;
  extensionCount: number;
}

// 历史记录相关类型
export interface PermissionHistoryEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  permissionId?: string;
  permissionCode?: string;
  permissionName?: string;
  roleId?: string;
  roleName?: string;
  actionType: HistoryActionType;
  actionDescription: string;
  performedBy: string;
  performedByName: string;
  performedAt: Date;
  reason?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export type HistoryActionType = 
  | 'permission_granted'
  | 'permission_revoked'
  | 'role_assigned'
  | 'role_removed'
  | 'override_created'
  | 'override_removed'
  | 'override_updated'
  | 'permission_expired'
  | 'login_attempt'
  | 'access_denied'
  | 'system_change';

export interface PermissionAuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
  actionType: AuditActionType;
  resourceType?: string;
  resourceId?: string;
  actionDescription: string;
  result: 'success' | 'failure' | 'denied';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  correlationId?: string;
}

export type AuditActionType =
  | 'authentication'
  | 'authorization'
  | 'permission_change'
  | 'role_change'
  | 'data_access'
  | 'system_administration'
  | 'security_event';

export interface HistoryFilters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  permissionId?: string;
  actionTypes?: HistoryActionType[];
  performedBy?: string;
  limit?: number;
  offset?: number;
}

export interface HistoryAnalytics {
  totalEvents: number;
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  eventsByType: Array<{
    actionType: HistoryActionType;
    count: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  topUsers: Array<{
    userId: string;
    userName: string;
    eventCount: number;
  }>;
  topPermissions: Array<{
    permissionId: string;
    permissionName: string;
    changeCount: number;
  }>;
  securityEvents: Array<{
    eventType: string;
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

export interface ComplianceReport {
  reportId: string;
  generatedAt: Date;
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  overallComplianceScore: number;
  sections: Array<{
    sectionName: string;
    score: number;
    status: 'compliant' | 'non_compliant' | 'warning';
    findings: ComplianceFinding[];
  }>;
  recommendations: ComplianceRecommendation[];
  violations: ComplianceViolation[];
  summary: {
    totalUsers: number;
    totalPermissions: number;
    activeOverrides: number;
    expiredPermissions: number;
    conflicts: number;
  };
}

export interface ComplianceFinding {
  id: string;
  type: 'violation' | 'warning' | 'recommendation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedUsers?: string[];
  affectedPermissions?: string[];
  evidence: Record<string, any>;
  remediation?: string;
}

export interface ComplianceRecommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedEffort: 'low' | 'medium' | 'high';
  expectedBenefit: string;
  implementationSteps: string[];
}

export interface ComplianceViolation {
  id: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedUsers: string[];
  detectedAt: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'acknowledged';
  assignedTo?: string;
  dueDate?: Date;
  resolution?: string;
  resolvedAt?: Date;
}