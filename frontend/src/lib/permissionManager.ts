/**
 * 权限管理器核心实现
 * 
 * 功能特性：
 * - 多层权限缓存策略
 * - Supabase Realtime 集成
 * - 批量权限检查优化
 * - 上下文感知的权限验证
 * - 动态权限规则支持
 */

import { supabase } from './supabase';
import { ROLE_PERMISSIONS, PERMISSIONS } from '@/constants/permissions';
import type {
  IPermissionManager,
  Permission,
  Role,
  PermissionContext,
  PermissionResult,
  PermissionCacheItem,
  PermissionChangeEvent,
  PermissionSubscriptionConfig,
  PermissionRule,
  PermissionManagerConfig,
  ResourceId,
  PermissionError
} from '@/types/permission';

/**
 * 权限管理器单例类
 */
class PermissionManager implements IPermissionManager {
  private cache = new Map<string, PermissionCacheItem>();
  private subscriptions = new Map<string, PermissionSubscriptionConfig>();
  private rules = new Map<string, PermissionRule[]>();
  private realtimeChannel: any = null;
  
  private config: PermissionManagerConfig = {
    cacheSize: 1000,
    cacheTimeout: 5 * 60 * 1000, // 5分钟
    enableRealtime: true,
    realtimeChannel: 'permission_changes',
    batchSize: 50,
    debounceMs: 100,
    validateContext: true,
    logPermissionChecks: process.env.NODE_ENV === 'development',
    retryAttempts: 3,
    fallbackToStaticRules: true
  };

  constructor() {
    this.initializeRealtime();
    this.loadStaticRules();
    this.startCacheCleanup();
  }

  /**
   * 初始化实时权限同步
   */
  private initializeRealtime(): void {
    if (!this.config.enableRealtime) return;

    try {
      this.realtimeChannel = supabase.channel(this.config.realtimeChannel)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_roles'
        }, (payload) => {
          this.handleRoleChange(payload);
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'permission_requests'
        }, (payload) => {
          this.handlePermissionRequestChange(payload);
        })
        .subscribe();

      console.log('[PermissionManager] Realtime subscription initialized');
    } catch (error) {
      console.error('[PermissionManager] Failed to initialize realtime:', error);
    }
  }

  /**
   * 加载静态权限规则
   */
  private loadStaticRules(): void {
    // 基础 CRUD 权限规则
    const crudActions = ['view', 'create', 'update', 'delete'] as const;
    const resources = ['employee', 'department', 'payroll', 'report'] as const;

    resources.forEach(resource => {
      crudActions.forEach(action => {
        const permission = `${resource}.${action}` as Permission;
        const ruleKey = `${resource}_${action}`;
        
        if (!this.rules.has(ruleKey)) {
          this.rules.set(ruleKey, []);
        }

        // 基础权限规则
        const baseRule: PermissionRule = {
          permission,
          resource,
          scope: 'all'
        };

        // 部门级权限规则（经理角色）
        const departmentRule: PermissionRule = {
          permission,
          resource,
          scope: 'department',
          condition: (context) => this.checkDepartmentAccess(context)
        };

        // 个人级权限规则（员工角色）
        const ownRule: PermissionRule = {
          permission,
          resource,
          scope: 'own',
          condition: (context) => this.checkOwnerAccess(context)
        };

        this.rules.get(ruleKey)!.push(baseRule, departmentRule, ownRule);
      });
    });

    console.log('[PermissionManager] Static permission rules loaded');
  }

  /**
   * 启动缓存清理任务
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];

      this.cache.forEach((item, key) => {
        if (item.expiresAt.getTime() < now) {
          expiredKeys.push(key);
        }
      });

      expiredKeys.forEach(key => {
        this.cache.delete(key);
      });

      // 限制缓存大小
      if (this.cache.size > this.config.cacheSize) {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].cachedAt.getTime() - b[1].cachedAt.getTime());
        
        const toRemove = entries.slice(0, this.cache.size - this.config.cacheSize);
        toRemove.forEach(([key]) => this.cache.delete(key));
      }

      if (this.config.logPermissionChecks && (expiredKeys.length > 0 || this.cache.size > this.config.cacheSize)) {
        console.log(`[PermissionManager] Cache cleanup: removed ${expiredKeys.length} expired items, cache size: ${this.cache.size}`);
      }
    }, this.config.cacheTimeout / 2);
  }

  /**
   * 处理角色变更事件
   */
  private handleRoleChange(payload: any): void {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    try {
      const userId = newRecord?.user_id || oldRecord?.user_id;
      if (!userId) return;

      // 清理用户相关缓存
      this.clearCache(userId);

      // 构建权限变更事件
      const event: PermissionChangeEvent = {
        type: 'role_changed',
        userId,
        role: newRecord?.role,
        timestamp: new Date(),
        metadata: { eventType, oldRole: oldRecord?.role }
      };

      // 通知订阅者
      this.broadcastPermissionChange(event);

      if (this.config.logPermissionChecks) {
        console.log('[PermissionManager] Role change processed:', event);
      }
    } catch (error) {
      console.error('[PermissionManager] Error handling role change:', error);
    }
  }

  /**
   * 处理权限申请变更事件
   */
  private handlePermissionRequestChange(payload: any): void {
    const { eventType, new: newRecord } = payload;
    
    try {
      if (newRecord?.status === 'approved') {
        // 权限申请被批准，清理相关缓存
        this.clearCache(newRecord.user_id);

        const event: PermissionChangeEvent = {
          type: 'permission_granted',
          userId: newRecord.user_id,
          permission: newRecord.permission,
          timestamp: new Date(),
          metadata: { requestId: newRecord.id, eventType }
        };

        this.broadcastPermissionChange(event);
      }

      if (this.config.logPermissionChecks) {
        console.log('[PermissionManager] Permission request change processed:', newRecord);
      }
    } catch (error) {
      console.error('[PermissionManager] Error handling permission request change:', error);
    }
  }

  /**
   * 检查部门访问权限
   */
  private async checkDepartmentAccess(context: PermissionContext): Promise<boolean> {
    if (!context.user?.managedDepartments || !context.resource?.id) {
      return false;
    }

    // 如果是员工资源，需要检查员工所属部门
    if (context.resource.type === 'employee') {
      try {
        const { data, error } = await supabase
          .from('view_employees_with_details')
          .select('department_id')
          .eq('employee_id', context.resource.id)
          .single();

        if (error || !data) return false;

        return context.user.managedDepartments.includes(data.department_id);
      } catch (error) {
        console.error('[PermissionManager] Error checking department access:', error);
        return false;
      }
    }

    return true;
  }

  /**
   * 检查所有者访问权限
   */
  private checkOwnerAccess(context: PermissionContext): boolean {
    if (!context.user || !context.resource?.id) return false;

    // 员工只能访问自己的记录
    if (context.resource.type === 'employee') {
      return context.resource.id === context.user.id;
    }

    if (context.resource.type === 'payroll') {
      // 需要额外检查薪资记录的所有者
      return context.resource.attributes?.employeeId === context.user.id;
    }

    return false;
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(permission: Permission, context?: PermissionContext): string {
    const parts = [permission];
    
    if (context?.user?.id) {
      parts.push(context.user.id);
    }
    
    if (context?.resource?.id) {
      parts.push(`${context.resource.type}:${context.resource.id}`);
    }
    
    return parts.join('|');
  }

  /**
   * 验证权限上下文
   */
  private validateContext(context?: PermissionContext): boolean {
    if (!this.config.validateContext || !context) return true;

    if (context.user && typeof context.user.id !== 'string') return false;
    if (context.resource && (!context.resource.type || !context.resource.id)) return false;
    
    return true;
  }

  // 实现 IPermissionManager 接口方法

  async checkPermission(permission: Permission, context?: PermissionContext): Promise<PermissionResult> {
    try {
      if (!this.validateContext(context)) {
        throw new PermissionError('Invalid permission context', permission, context?.resource?.id, context);
      }

      const cacheKey = this.getCacheKey(permission, context);
      
      // 检查缓存
      const cached = this.getCachedResult(permission, context?.resource?.id);
      if (cached) {
        if (this.config.logPermissionChecks) {
          console.log(`[PermissionManager] Cache hit for ${permission}`);
        }
        return cached.result;
      }

      // 基础角色权限检查
      const userRole = context?.user?.role || 'employee';
      const rolePermissions = ROLE_PERMISSIONS[userRole as Role] || [];

      // 超级管理员拥有所有权限
      if (rolePermissions.includes('*' as any)) {
        const result: PermissionResult = { allowed: true, reason: 'Super admin access', context };
        this.setCachedResult(permission, result, context?.resource?.id);
        return result;
      }

      // 检查基础权限
      if (!rolePermissions.includes(permission as any)) {
        const result: PermissionResult = { 
          allowed: false, 
          reason: `Role ${userRole} does not have permission ${permission}`, 
          context 
        };
        this.setCachedResult(permission, result, context?.resource?.id);
        return result;
      }

      // 检查动态规则
      const resourceType = context?.resource?.type;
      if (resourceType) {
        const ruleKey = `${resourceType}_${permission.split('.')[1]}`;
        const rules = this.rules.get(ruleKey) || [];

        for (const rule of rules) {
          if (rule.condition && context) {
            try {
              const conditionResult = await rule.condition(context);
              if (!conditionResult) {
                const result: PermissionResult = { 
                  allowed: false, 
                  reason: `Rule condition failed for ${permission}`, 
                  context 
                };
                this.setCachedResult(permission, result, context?.resource?.id);
                return result;
              }
            } catch (error) {
              console.error(`[PermissionManager] Rule condition error for ${permission}:`, error);
              if (!this.config.fallbackToStaticRules) {
                throw error;
              }
            }
          }
        }
      }

      const result: PermissionResult = { allowed: true, reason: 'Permission granted', context };
      this.setCachedResult(permission, result, context?.resource?.id);

      if (this.config.logPermissionChecks) {
        console.log(`[PermissionManager] Permission ${permission} granted for user ${context?.user?.id}`);
      }

      return result;

    } catch (error) {
      console.error(`[PermissionManager] Error checking permission ${permission}:`, error);
      
      if (this.config.fallbackToStaticRules) {
        // 降级到静态权限检查
        const userRole = context?.user?.role || 'employee';
        const rolePermissions = ROLE_PERMISSIONS[userRole as Role] || [];
        const allowed = rolePermissions.includes(permission as any) || rolePermissions.includes('*' as any);
        
        return { 
          allowed, 
          reason: allowed ? 'Static fallback granted' : 'Static fallback denied', 
          context 
        };
      }

      throw error;
    }
  }

  async checkMultiplePermissions(
    permissions: Permission[], 
    context?: PermissionContext
  ): Promise<Record<Permission, PermissionResult>> {
    const results: Record<Permission, PermissionResult> = {} as Record<Permission, PermissionResult>;
    
    // 批量处理权限检查
    const batches: Permission[][] = [];
    for (let i = 0; i < permissions.length; i += this.config.batchSize) {
      batches.push(permissions.slice(i, i + this.config.batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async permission => {
        try {
          const result = await this.checkPermission(permission, context);
          return { permission, result };
        } catch (error) {
          return { 
            permission, 
            result: { allowed: false, reason: `Error: ${error.message}`, context } 
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ permission, result }) => {
        results[permission] = result;
      });
    }

    return results;
  }

  getCachedResult(permission: Permission, resourceId?: string): PermissionCacheItem | null {
    const cacheKey = resourceId ? `${permission}|${resourceId}` : permission;
    const item = this.cache.get(cacheKey);
    
    if (item && item.expiresAt > new Date()) {
      return item;
    }
    
    if (item) {
      this.cache.delete(cacheKey);
    }
    
    return null;
  }

  setCachedResult(permission: Permission, result: PermissionResult, resourceId?: string): void {
    const cacheKey = resourceId ? `${permission}|${resourceId}` : permission;
    const now = new Date();
    
    const item: PermissionCacheItem = {
      permission,
      resourceId,
      result,
      cachedAt: now,
      expiresAt: new Date(now.getTime() + this.config.cacheTimeout)
    };

    this.cache.set(cacheKey, item);
  }

  clearCache(userId?: string): void {
    if (userId) {
      // 清理特定用户的缓存
      const keysToDelete: string[] = [];
      this.cache.forEach((item, key) => {
        if (item.result.context?.user?.id === userId) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      // 清理所有缓存
      this.cache.clear();
    }

    if (this.config.logPermissionChecks) {
      console.log(`[PermissionManager] Cache cleared${userId ? ` for user ${userId}` : ''}`);
    }
  }

  subscribe(config: PermissionSubscriptionConfig): () => void {
    const subscriptionId = `${config.userId}_${Date.now()}`;
    this.subscriptions.set(subscriptionId, config);

    if (this.config.logPermissionChecks) {
      console.log(`[PermissionManager] Subscription created: ${subscriptionId}`);
    }

    return () => {
      this.subscriptions.delete(subscriptionId);
      if (this.config.logPermissionChecks) {
        console.log(`[PermissionManager] Subscription removed: ${subscriptionId}`);
      }
    };
  }

  broadcastPermissionChange(event: PermissionChangeEvent): void {
    this.subscriptions.forEach((config, subscriptionId) => {
      try {
        if (config.userId === event.userId || config.permissions.includes(event.permission!)) {
          config.onPermissionChange(event);
        }
      } catch (error) {
        console.error(`[PermissionManager] Error broadcasting to ${subscriptionId}:`, error);
        if (config.onError) {
          config.onError(error as Error);
        }
      }
    });

    if (this.config.logPermissionChecks) {
      console.log('[PermissionManager] Permission change broadcasted:', event);
    }
  }

  addRule(rule: PermissionRule): void {
    const key = `${rule.resource}_${rule.permission.split('.')[1]}`;
    if (!this.rules.has(key)) {
      this.rules.set(key, []);
    }
    this.rules.get(key)!.push(rule);
  }

  removeRule(permission: Permission, resourceType?: ResourceId['type']): void {
    if (resourceType) {
      const key = `${resourceType}_${permission.split('.')[1]}`;
      this.rules.delete(key);
    } else {
      // 移除所有相关规则
      const keysToDelete: string[] = [];
      this.rules.forEach((rules, key) => {
        if (rules.some(rule => rule.permission === permission)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.rules.delete(key));
    }
  }

  getRules(permission?: Permission): PermissionRule[] {
    const allRules: PermissionRule[] = [];
    this.rules.forEach(rules => {
      const filteredRules = permission 
        ? rules.filter(rule => rule.permission === permission)
        : rules;
      allRules.push(...filteredRules);
    });
    return allRules;
  }

  updateConfig(config: Partial<PermissionManagerConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.enableRealtime !== undefined) {
      if (config.enableRealtime && !this.realtimeChannel) {
        this.initializeRealtime();
      } else if (!config.enableRealtime && this.realtimeChannel) {
        this.realtimeChannel.unsubscribe();
        this.realtimeChannel = null;
      }
    }

    if (this.config.logPermissionChecks) {
      console.log('[PermissionManager] Configuration updated:', config);
    }
  }

  getConfig(): PermissionManagerConfig {
    return { ...this.config };
  }

  /**
   * 优雅关闭
   */
  destroy(): void {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }
    this.cache.clear();
    this.subscriptions.clear();
    console.log('[PermissionManager] Destroyed');
  }
}

// 导出单例实例
export const permissionManager = new PermissionManager();

// 导出类型和错误类
export { PermissionManager, PermissionError };