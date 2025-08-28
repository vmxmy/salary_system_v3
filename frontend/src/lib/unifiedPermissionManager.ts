/**
 * 统一权限管理器
 * 
 * 集成新的数据库权限系统，替换旧的静态权限配置
 * 提供与现有Hook系统完全兼容的API接口
 * 
 * 核心改进：
 * - 基于 unified_permission_check 函数
 * - 利用 permission_matrix_mv 物化视图
 * - 集成 JWT Claims 缓存机制
 * - 保持现有Hook接口不变
 */

import { supabase } from './supabase';
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
  ResourceId
} from '@/types/permission';
import { PermissionError } from '@/types/permission';

/**
 * 统一权限管理器类
 * 
 * 与数据库权限系统深度集成，提供高性能的权限验证
 */
class UnifiedPermissionManager implements IPermissionManager {
  private cache = new Map<string, PermissionCacheItem>();
  private subscriptions = new Map<string, PermissionSubscriptionConfig>();
  private realtimeChannel: any = null;
  private permissionVersionCache: number | null = null;
  private requestQueue = new Map<string, Promise<PermissionResult>>();
  private activeRequests = 0;
  private maxConcurrentRequests = 3;
  
  private config: PermissionManagerConfig = {
    cacheSize: 1000,
    cacheTimeout: 5 * 60 * 1000, // 5分钟
    enableRealtime: true,
    realtimeChannel: 'unified_permission_changes',
    batchSize: 50,
    debounceMs: 100,
    validateContext: true,
    logPermissionChecks: process.env.NODE_ENV === 'development',
    retryAttempts: 3,
    fallbackToStaticRules: true
  };

  constructor() {
    this.initializeRealtime();
    this.startCacheCleanup();
    this.loadPermissionVersion();
  }

  /**
   * 加载权限版本号用于缓存一致性
   */
  private async loadPermissionVersion(): Promise<void> {
    try {
      await this.withRetry(async () => {
        const { data, error } = await supabase.rpc('get_current_permission_version');
        if (error) throw error;
        
        this.permissionVersionCache = data;
        console.log('[UnifiedPermissionManager] Permission version loaded:', data);
        return data;
      }, 'loadPermissionVersion');
    } catch (error) {
      console.error('[UnifiedPermissionManager] Failed to load permission version after retries:', error);
      // 设置默认版本避免应用崩溃
      this.permissionVersionCache = 0;
    }
  }

  /**
   * 检查权限版本是否有更新
   */
  private async checkVersionUpdate(): Promise<boolean> {
    return this.withRetry(async () => {
      const { data, error } = await supabase.rpc('get_current_permission_version');
      if (error) throw error;
      
      if (data !== this.permissionVersionCache) {
        console.log('[UnifiedPermissionManager] Permission version updated:', this.permissionVersionCache, '->', data);
        this.permissionVersionCache = data;
        this.clearCache(); // 清理所有缓存
        return true;
      }
      return false;
    }, 'checkVersionUpdate').catch(error => {
      console.error('[UnifiedPermissionManager] Failed to check version update:', error);
      // 对于版本检查失败，返回false而不是抛出错误，避免阻塞应用
      return false;
    });
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
          table: 'unified_permission_config'
        }, (payload) => {
          this.handlePermissionConfigChange(payload);
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_roles'
        }, (payload) => {
          this.handleRoleChange(payload);
        })
        .subscribe();

      console.log('[UnifiedPermissionManager] Realtime subscription initialized');
    } catch (error) {
      console.error('[UnifiedPermissionManager] Failed to initialize realtime:', error);
    }
  }

  /**
   * 处理权限配置变更事件
   */
  private handlePermissionConfigChange(payload: any): void {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    try {
      const userId = newRecord?.user_id || oldRecord?.user_id;
      const roleCode = newRecord?.role_code || oldRecord?.role_code;
      
      // 清理相关缓存
      if (userId) {
        this.clearCache(userId);
      }
      
      // 如果是角色配置变更，清理所有相关用户的缓存
      if (roleCode && !userId) {
        this.clearCacheByRole(roleCode);
      }

      // 更新权限版本
      this.loadPermissionVersion();

      // 构建权限变更事件
      const event: PermissionChangeEvent = {
        type: 'permission_updated',
        userId,
        role: roleCode,
        timestamp: new Date(),
        metadata: { eventType, table: 'unified_permission_config' }
      };

      // 通知订阅者
      this.broadcastPermissionChange(event);

      if (this.config.logPermissionChecks) {
        console.log('[UnifiedPermissionManager] Permission config change processed:', event);
      }
    } catch (error) {
      console.error('[UnifiedPermissionManager] Error handling permission config change:', error);
    }
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
        metadata: { eventType, oldRole: oldRecord?.role, table: 'user_roles' }
      };

      // 通知订阅者
      this.broadcastPermissionChange(event);

      if (this.config.logPermissionChecks) {
        console.log('[UnifiedPermissionManager] Role change processed:', event);
      }
    } catch (error) {
      console.error('[UnifiedPermissionManager] Error handling role change:', error);
    }
  }

  /**
   * 按角色清理缓存
   */
  private clearCacheByRole(roleCode: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((item, key) => {
      if (item.result.context?.user?.role === roleCode) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));

    if (this.config.logPermissionChecks && keysToDelete.length > 0) {
      console.log(`[UnifiedPermissionManager] Cleared ${keysToDelete.length} cache entries for role: ${roleCode}`);
    }
  }

  /**
   * 启动缓存清理任务
   */
  private startCacheCleanup(): void {
    setInterval(async () => {
      // 检查权限版本更新
      await this.checkVersionUpdate();

      // 清理过期缓存
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

      if (this.config.logPermissionChecks && expiredKeys.length > 0) {
        console.log(`[UnifiedPermissionManager] Cache cleanup: removed ${expiredKeys.length} expired items, cache size: ${this.cache.size}`);
      }
    }, this.config.cacheTimeout / 2);
  }

  /**
   * 生成缓存键（包含权限版本）
   */
  private getCacheKey(permission: Permission, context?: PermissionContext): string {
    const parts: string[] = [
      `v${this.permissionVersionCache || 0}`,
      permission
    ];
    
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

  /**
   * 构建数据库查询上下文
   */
  private buildDatabaseContext(context?: PermissionContext): any {
    if (!context?.resource) return {};

    const dbContext: any = {};

    // 根据资源类型构建上下文
    switch (context.resource.type) {
      case 'employee':
        if (context.resource.attributes?.departmentId) {
          dbContext.resource_department_id = context.resource.attributes.departmentId;
        }
        if (context.resource.id) {
          dbContext.resource_employee_id = context.resource.id;
        }
        break;
      
      case 'payroll':
        if (context.resource.attributes?.employeeId) {
          dbContext.resource_employee_id = context.resource.attributes.employeeId;
        }
        if (context.resource.attributes?.departmentId) {
          dbContext.resource_department_id = context.resource.attributes.departmentId;
        }
        break;
      
      case 'department':
        if (context.resource.id) {
          dbContext.resource_department_id = context.resource.id;
        }
        break;
    }

    return dbContext;
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
          console.log(`[UnifiedPermissionManager] Cache hit for ${permission}`);
        }
        return cached.result;
      }

      // 检查是否有相同的请求正在进行（请求去重）
      if (this.requestQueue.has(cacheKey)) {
        if (this.config.logPermissionChecks) {
          console.log(`[UnifiedPermissionManager] Request deduplication for ${permission}`);
        }
        return await this.requestQueue.get(cacheKey)!;
      }

      // 检查并发请求限制
      if (this.activeRequests >= this.maxConcurrentRequests) {
        console.warn(`[UnifiedPermissionManager] Too many concurrent requests (${this.activeRequests}), throttling ${permission}`);
        await new Promise(resolve => setTimeout(resolve, 200)); // 等待200ms
      }

      // 使用统一权限检查函数
      const userId = context?.user?.id;
      const resourceId = context?.resource?.id;
      const dbContext = this.buildDatabaseContext(context);

      if (!userId) {
        const result: PermissionResult = { 
          allowed: false, 
          reason: 'User not authenticated', 
          context 
        };
        this.setCachedResult(permission, result, context?.resource?.id);
        return result;
      }

      // 创建请求Promise并添加到队列
      const requestPromise = this.executePermissionCheck(userId, permission, resourceId, dbContext, context);
      this.requestQueue.set(cacheKey, requestPromise);

      try {
        return await requestPromise;
      } finally {
        this.requestQueue.delete(cacheKey);
      }
    } catch (error) {
      console.error(`[UnifiedPermissionManager] Permission check failed for ${permission}:`, error);
      throw error;
    }
  }

  /**
   * 带重试机制的操作执行器
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName = 'operation',
    attempts: number = this.config.retryAttempts
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // 对于网络相关错误，进行重试
        const shouldRetry = (
          error?.message?.includes('timeout') ||
          error?.message?.includes('network') ||
          error?.message?.includes('fetch') ||
          error?.message?.includes('Connection closed') ||
          error?.code === '23' || // Supabase timeout code
          (attempt < attempts && !error?.message?.includes('Auth'))
        );
        
        if (!shouldRetry || attempt === attempts) {
          break;
        }
        
        // 指数退避重试延迟
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.warn(
          `[UnifiedPermissionManager] ${operationName} attempt ${attempt} failed, retrying in ${delay}ms:`, 
          error?.message || error
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * 执行实际的权限检查（内部方法）
   */
  private async executePermissionCheck(
    userId: string, 
    permission: Permission, 
    resourceId: string | undefined, 
    dbContext: any,
    context?: PermissionContext
  ): Promise<PermissionResult> {
    this.activeRequests++;
    
    try {
      // 调用数据库的统一权限检查函数
      const { data, error } = await supabase.rpc('unified_permission_check', {
        p_user_id: userId,
        p_permission_code: permission,
        p_resource_id: resourceId || undefined,
        p_context: dbContext
      });

      if (error) throw error;

      const dbResult = data as {
        granted: boolean;
        source: string;
        reason: string;
        data_scope: string;
        source_detail?: string;
      };

      const result: PermissionResult = {
        allowed: dbResult.granted,
        reason: dbResult.reason,
        context: {
          ...context,
          metadata: {
            source: dbResult.source,
            dataScope: dbResult.data_scope,
            sourceDetail: dbResult.source_detail
          }
        }
      };

      this.setCachedResult(permission, result, context?.resource?.id);

      if (this.config.logPermissionChecks) {
        console.log(`[UnifiedPermissionManager] Permission ${permission} ${dbResult.granted ? 'granted' : 'denied'} for user ${userId}:`, dbResult.reason);
      }

      return result;

    } catch (error) {
      console.error(`[UnifiedPermissionManager] Error checking permission ${permission}:`, error);
      
      if (this.config.fallbackToStaticRules) {
        // 简单的降级策略：只允许基础读取权限
        const isBasicReadPermission = permission.endsWith('.read') || permission.includes('dashboard');
        const allowed = context?.user?.role === 'super_admin' || isBasicReadPermission;
        
        return { 
          allowed, 
          reason: allowed ? 'Fallback permission granted' : 'Fallback permission denied', 
          context 
        };
      }

      throw error;
    } finally {
      this.activeRequests--;
    }
  }

  async checkMultiplePermissions(
    permissions: Permission[], 
    context?: PermissionContext
  ): Promise<Record<Permission, PermissionResult>> {
    const results: Record<Permission, PermissionResult> = {} as Record<Permission, PermissionResult>;
    
    // 优先使用数据库批量检查函数
    const userId = context?.user?.id;
    if (userId && permissions.length > 1) {
      try {
        const { data, error } = await supabase.rpc('check_multiple_permissions', {
          p_user_id: userId,
          p_permission_codes: permissions
        });

        if (!error && data) {
          // 处理批量结果
          Object.entries(data).forEach(([permission, dbResult]: [string, any]) => {
            results[permission as Permission] = {
              allowed: dbResult.granted,
              reason: dbResult.reason,
              context: {
                ...context,
                metadata: {
                  source: dbResult.source,
                  dataScope: dbResult.data_scope,
                  sourceDetail: dbResult.source_detail
                }
              }
            };

            // 缓存单个结果
            this.setCachedResult(permission as Permission, results[permission as Permission], context?.resource?.id);
          });

          return results;
        }
      } catch (error) {
        console.error('[UnifiedPermissionManager] Batch permission check failed, falling back to individual checks:', error);
      }
    }
    
    // 降级到逐个检查
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
            result: { 
              allowed: false, 
              reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
              context 
            } 
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
    const cacheKey = resourceId ? `v${this.permissionVersionCache || 0}|${permission}|${resourceId}` : `v${this.permissionVersionCache || 0}|${permission}`;
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
    const cacheKey = resourceId ? `v${this.permissionVersionCache || 0}|${permission}|${resourceId}` : `v${this.permissionVersionCache || 0}|${permission}`;
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
      console.log(`[UnifiedPermissionManager] Cache cleared${userId ? ` for user ${userId}` : ''}`);
    }
  }

  subscribe(config: PermissionSubscriptionConfig): () => void {
    const subscriptionId = `${config.userId}_${Date.now()}`;
    this.subscriptions.set(subscriptionId, config);

    if (this.config.logPermissionChecks) {
      console.log(`[UnifiedPermissionManager] Subscription created: ${subscriptionId}`);
    }

    return () => {
      this.subscriptions.delete(subscriptionId);
      if (this.config.logPermissionChecks) {
        console.log(`[UnifiedPermissionManager] Subscription removed: ${subscriptionId}`);
      }
    };
  }

  broadcastPermissionChange(event: PermissionChangeEvent): void {
    this.subscriptions.forEach((config, subscriptionId) => {
      try {
        if (config.userId === event.userId || (event.permission && config.permissions.includes(event.permission))) {
          config.onPermissionChange(event);
        }
      } catch (error) {
        console.error(`[UnifiedPermissionManager] Error broadcasting to ${subscriptionId}:`, error);
        if (config.onError) {
          config.onError(error as Error);
        }
      }
    });

    if (this.config.logPermissionChecks) {
      console.log('[UnifiedPermissionManager] Permission change broadcasted:', event);
    }
  }

  // 兼容性方法，保持与旧系统的接口一致
  addRule(rule: PermissionRule): void {
    console.warn('[UnifiedPermissionManager] addRule is deprecated. Use database configuration instead.');
  }

  removeRule(permission: Permission, resourceType?: ResourceId['type']): void {
    console.warn('[UnifiedPermissionManager] removeRule is deprecated. Use database configuration instead.');
  }

  getRules(permission?: Permission): PermissionRule[] {
    console.warn('[UnifiedPermissionManager] getRules is deprecated. Rules are managed in database.');
    return [];
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
      console.log('[UnifiedPermissionManager] Configuration updated:', config);
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
    console.log('[UnifiedPermissionManager] Destroyed');
  }
}

// 导出统一权限管理器单例实例
export const unifiedPermissionManager = new UnifiedPermissionManager();

// 导出类型和错误类
export { UnifiedPermissionManager, PermissionError };