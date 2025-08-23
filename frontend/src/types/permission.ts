/**
 * 权限系统类型定义
 * 
 * 支持 RBAC（基于角色的访问控制）和 ABAC（基于属性的访问控制）
 */

import type { PERMISSIONS, ROLE_PERMISSIONS } from '@/constants/permissions';

// 基础权限类型
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type Role = keyof typeof ROLE_PERMISSIONS;

// 资源标识符类型
export interface ResourceId {
  type: 'employee' | 'department' | 'payroll' | 'report' | 'system';
  id: string;
  attributes?: Record<string, unknown>;
}

// 权限上下文
export interface PermissionContext {
  user?: {
    id: string;
    email: string;
    role: Role;
    departmentId?: string;
    managedDepartments?: string[];
  };
  resource?: ResourceId;
  environment?: 'development' | 'production' | 'testing';
  timestamp?: Date;
}

// 权限检查结果
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  context?: PermissionContext;
}

// 权限规则接口
export interface PermissionRule {
  permission: Permission;
  condition?: (context: PermissionContext) => boolean | Promise<boolean>;
  resource?: ResourceId['type'];
  scope?: 'own' | 'department' | 'all';
}

// 动态权限接口
export interface DynamicPermission {
  id: string;
  name: string;
  description: string;
  resource: ResourceId['type'];
  action: string;
  condition: string; // JSON序列化的条件函数
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 权限申请状态
export type PermissionRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';

// 权限申请接口
export interface PermissionRequest {
  id: string;
  userId: string;
  permission: Permission;
  resourceId?: string;
  reason: string;
  status: PermissionRequestStatus;
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

// 权限缓存项
export interface PermissionCacheItem {
  permission: Permission;
  resourceId?: string;
  result: PermissionResult;
  cachedAt: Date;
  expiresAt: Date;
}

// 权限变更事件
export interface PermissionChangeEvent {
  type: 'role_changed' | 'permission_granted' | 'permission_revoked' | 'resource_updated';
  userId: string;
  permission?: Permission;
  role?: Role;
  resourceId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// 权限订阅配置
export interface PermissionSubscriptionConfig {
  userId: string;
  permissions: Permission[];
  resources?: ResourceId[];
  onPermissionChange: (event: PermissionChangeEvent) => void;
  onError?: (error: Error) => void;
}

// Hook 配置选项
export interface UsePermissionOptions {
  // 缓存配置
  enableCache?: boolean;
  cacheTimeout?: number; // 毫秒
  
  // 实时同步配置
  enableRealtime?: boolean;
  subscribeToChanges?: boolean;
  
  // 错误处理
  throwOnError?: boolean;
  fallbackPermission?: boolean;
  
  // 性能配置
  debounceMs?: number;
  batchRequests?: boolean;
}

// 资源访问配置
export interface UseResourceOptions extends UsePermissionOptions {
  resourceType: ResourceId['type'];
  resourceId?: string;
  scope?: 'own' | 'department' | 'all';
  checkOwnership?: boolean;
}

// 权限管理器配置
export interface PermissionManagerConfig {
  // 缓存设置
  cacheSize: number;
  cacheTimeout: number;
  
  // 实时更新设置
  enableRealtime: boolean;
  realtimeChannel: string;
  
  // 性能设置
  batchSize: number;
  debounceMs: number;
  
  // 安全设置
  validateContext: boolean;
  logPermissionChecks: boolean;
  
  // 错误处理
  retryAttempts: number;
  fallbackToStaticRules: boolean;
}

// Hook 返回类型
export interface UsePermissionReturn {
  // 基础权限检查
  hasPermission: (permission: Permission, resourceId?: string) => boolean;
  hasAnyPermission: (permissions: Permission[], resourceId?: string) => boolean;
  hasAllPermissions: (permissions: Permission[], resourceId?: string) => boolean;
  
  // 上下文权限检查
  checkPermission: (permission: Permission, context?: Partial<PermissionContext>) => Promise<PermissionResult>;
  
  // 批量权限检查
  checkMultiplePermissions: (permissions: Permission[], context?: Partial<PermissionContext>) => Promise<Record<Permission, PermissionResult>>;
  
  // 权限状态
  loading: boolean;
  error: Error | null;
  
  // 缓存管理
  clearCache: () => void;
  invalidatePermission: (permission: Permission, resourceId?: string) => void;
  
  // 实时更新
  isSubscribed: boolean;
  subscribe: () => void;
  unsubscribe: () => void;
}

export interface UseRoleReturn {
  // 角色信息
  role: Role;
  isRole: (role: Role | Role[]) => boolean;
  hasRoleLevel: (minLevel: Role) => boolean;
  
  // 角色权限
  rolePermissions: Permission[];
  canEscalate: boolean;
  
  // 状态
  loading: boolean;
  error: Error | null;
  
  // 角色管理
  switchRole: (newRole: Role) => Promise<boolean>;
  requestRole: (role: Role, reason: string) => Promise<string>; // 返回申请ID
}

export interface UseResourceReturn {
  // 资源访问权限
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  canManage: boolean;
  
  // 动态权限检查
  can: (action: string, resourceId?: string) => boolean;
  canWithContext: (action: string, context?: Partial<PermissionContext>) => Promise<PermissionResult>;
  
  // 资源过滤
  filterAccessible: <T extends { id: string }>(items: T[]) => T[];
  getAccessibleIds: (ids: string[]) => Promise<string[]>;
  
  // 状态
  loading: boolean;
  error: Error | null;
}

export interface UsePermissionRequestReturn {
  // 权限申请
  requestPermission: (permission: Permission, resourceId?: string, reason?: string) => Promise<string>;
  requestTemporaryPermission: (permission: Permission, duration: number, reason: string) => Promise<string>;
  
  // 申请管理
  getMyRequests: () => Promise<PermissionRequest[]>;
  getPendingRequests: () => Promise<PermissionRequest[]>; // 仅管理员
  
  // 申请处理
  approveRequest: (requestId: string, reason?: string) => Promise<boolean>;
  rejectRequest: (requestId: string, reason?: string) => Promise<boolean>;
  
  // 状态跟踪
  myRequests: PermissionRequest[];
  pendingRequests: PermissionRequest[]; // 仅管理员可见
  loading: boolean;
  error: Error | null;
}

// 权限错误类型
export class PermissionError extends Error {
  public permission: Permission;
  public resourceId?: string;
  public context?: PermissionContext;

  constructor(
    message: string,
    permission: Permission,
    resourceId?: string,
    context?: PermissionContext
  ) {
    super(message);
    this.name = 'PermissionError';
    this.permission = permission;
    this.resourceId = resourceId;
    this.context = context;
  }
}

export class ResourceAccessError extends Error {
  public resourceType: ResourceId['type'];
  public resourceId: string;
  public requiredPermission: Permission;

  constructor(
    message: string,
    resourceType: ResourceId['type'],
    resourceId: string,
    requiredPermission: Permission
  ) {
    super(message);
    this.name = 'ResourceAccessError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    this.requiredPermission = requiredPermission;
  }
}

export class RoleEscalationError extends Error {
  public currentRole: Role;
  public requestedRole: Role;

  constructor(
    message: string,
    currentRole: Role,
    requestedRole: Role
  ) {
    super(message);
    this.name = 'RoleEscalationError';
    this.currentRole = currentRole;
    this.requestedRole = requestedRole;
  }
}

// 权限管理器接口
export interface IPermissionManager {
  // 权限检查
  checkPermission(permission: Permission, context?: PermissionContext): Promise<PermissionResult>;
  checkMultiplePermissions(permissions: Permission[], context?: PermissionContext): Promise<Record<Permission, PermissionResult>>;
  
  // 缓存管理
  getCachedResult(permission: Permission, resourceId?: string): PermissionCacheItem | null;
  setCachedResult(permission: Permission, result: PermissionResult, resourceId?: string): void;
  clearCache(userId?: string): void;
  
  // 实时同步
  subscribe(config: PermissionSubscriptionConfig): () => void;
  broadcastPermissionChange(event: PermissionChangeEvent): void;
  
  // 规则管理
  addRule(rule: PermissionRule): void;
  removeRule(permission: Permission, resourceType?: ResourceId['type']): void;
  getRules(permission?: Permission): PermissionRule[];
  
  // 配置管理
  updateConfig(config: Partial<PermissionManagerConfig>): void;
  getConfig(): PermissionManagerConfig;
}