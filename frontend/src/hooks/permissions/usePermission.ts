/**
 * 核心权限检查 Hook - 基于新的统一权限系统
 * 
 * 功能特性：
 * - 基于 unified_permission_config 表和 permission_matrix_mv 视图
 * - 集成 unified_permission_check 数据库函数
 * - 支持实时权限检查和缓存
 * - 提供完整的权限上下文
 * 
 * 设计原则：
 * - 数据库驱动：所有权限决策都通过数据库函数
 * - 高性能缓存：利用物化视图和本地缓存
 * - 实时更新：通过Supabase实时订阅权限变更
 * - 类型安全：完整的TypeScript支持
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { unifiedPermissionManager } from '@/lib/unifiedPermissionManager';
import type {
  Permission,
  PermissionContext,
  PermissionResult,
  UsePermissionOptions,
  UsePermissionReturn
} from '@/types/permission';

/**
 * 权限检查选项
 */
export interface PermissionOptions extends UsePermissionOptions {
  /** 自动检查权限变更 */
  watchChanges?: boolean;
  /** 缓存权限结果 */
  enableCache?: boolean;
  /** 错误时的降级行为 */
  fallbackResult?: boolean;
  /** 权限检查失败时是否抛出错误 */
  throwOnError?: boolean;
  /** 权限上下文覆盖 */
  contextOverride?: Partial<PermissionContext>;
}

/**
 * 核心权限检查 Hook
 * 
 * 使用新的统一权限系统进行权限验证
 */
export function usePermission(options: PermissionOptions = {}): UsePermissionReturn {
  const { user } = useUnifiedAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [permissionCache, setPermissionCache] = useState<Record<string, PermissionResult>>({});
  const [initialized, setInitialized] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  
  const {
    watchChanges = true,
    enableCache = true,
    fallbackResult = true, // 网络问题时的降级策略：允许访问
    throwOnError = false,
    contextOverride = {},
    ...baseOptions
  } = options;

  // 构建基础权限上下文
  const baseContext = useMemo((): PermissionContext => ({
    user: user ? {
      id: user.id,
      email: user.email,
      role: user.role as any,
      departmentId: user.departmentId,
      managedDepartments: user.managedDepartments
    } : undefined,
    timestamp: new Date(),
    ...contextOverride
  }), [user, contextOverride]);

  // 请求防抖控制
  const maxConcurrentRequests = 3; // 限制并发请求数量
  
  // 检查单个权限
  const checkPermission = useCallback(async (
    permission: Permission,
    context?: PermissionContext
  ): Promise<PermissionResult> => {
    if (!user) {
      const result: PermissionResult = {
        allowed: fallbackResult,
        reason: 'User not authenticated',
        context: context || baseContext
      };
      return result;
    }

    // 控制并发请求数量，防止资源耗尽
    if (requestCount >= maxConcurrentRequests) {
      console.warn('[usePermission] Too many concurrent requests, queuing...');
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setRequestCount(prev => prev + 1);
    setLoading(true);
    setError(null);

    try {
      const finalContext = {
        ...baseContext,
        ...context
      };

      // 检查缓存
      const cacheKey = permission;
      if (enableCache && permissionCache[cacheKey]) {
        const cached = permissionCache[cacheKey];
        // 检查缓存是否过期（5分钟）
        const cacheAge = Date.now() - (cached.context?.timestamp?.getTime() || 0);
        if (cacheAge < 5 * 60 * 1000) {
          setRequestCount(prev => Math.max(0, prev - 1));
          return cached;
        }
      }

      // 使用统一权限管理器进行检查
      const result = await unifiedPermissionManager.checkPermission(permission, finalContext);
      
      // 缓存结果
      if (enableCache) {
        setPermissionCache(prev => ({
          ...prev,
          [cacheKey]: result
        }));
      }

      return result;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Permission check failed');
      
      // 针对网络超时和资源不足错误的特殊处理
      if (
        error.message.includes('TimeoutError') || 
        error.message.includes('signal timed out') ||
        error.message.includes('ERR_INSUFFICIENT_RESOURCES') ||
        error.message.includes('Failed to fetch')
      ) {
        console.warn('[usePermission] Network/resource error, using fallback strategy:', error.message);
        setError(error);
        return {
          allowed: true, // 网络问题时允许访问，确保用户体验
          reason: 'Network/resource error - fallback to allow access',
          context: baseContext
        };
      }
      
      setError(error);
      
      if (throwOnError) {
        throw error;
      }

      return {
        allowed: fallbackResult,
        reason: error.message,
        context: baseContext
      };
    } finally {
      setLoading(false);
      setRequestCount(prev => Math.max(0, prev - 1));
    }
  }, [user?.id, baseContext, enableCache, fallbackResult, throwOnError, requestCount]); // 移除 permissionCache 依赖

  // 检查多个权限
  const checkMultiplePermissions = useCallback(async (
    permissions: Permission[],
    context?: PermissionContext
  ): Promise<Record<Permission, PermissionResult>> => {
    const finalContext = {
      ...baseContext,
      ...context
    };

    try {
      return await unifiedPermissionManager.checkMultiplePermissions(permissions, finalContext);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Multiple permission check failed');
      setError(error);

      if (throwOnError) {
        throw error;
      }

      // 返回降级结果
      const fallbackResults: Record<string, PermissionResult> = {};
      permissions.forEach(permission => {
        fallbackResults[permission] = {
          allowed: fallbackResult,
          reason: error.message,
          context: finalContext
        };
      });
      return fallbackResults;
    }
  }, [baseContext, fallbackResult, throwOnError]);

  // 便捷的权限检查方法 - 重新定义以避免循环依赖
  const hasPermissionAsync = useCallback(async (permission: Permission, context?: PermissionContext): Promise<boolean> => {
    const result = await checkPermission(permission, context);
    return result.allowed;
  }, [checkPermission]);

  const hasAnyPermissionAsync = useCallback(async (permissions: Permission[], context?: PermissionContext): Promise<boolean> => {
    const results = await checkMultiplePermissions(permissions, context);
    return Object.values(results).some(result => result.allowed);
  }, [checkMultiplePermissions]);

  const hasAllPermissionsAsync = useCallback(async (permissions: Permission[], context?: PermissionContext): Promise<boolean> => {
    const results = await checkMultiplePermissions(permissions, context);
    return Object.values(results).every(result => result.allowed);
  }, [checkMultiplePermissions]);

  // 同步权限检查（基于缓存）- 改进版本，更明确地处理缓存未命中
  const hasCachedPermission = useCallback((permission: Permission): boolean => {
    if (!enableCache) {
      // 缓存禁用时，返回安全的默认值
      console.warn(`[usePermission] Cache disabled, cannot perform sync check for: ${permission}`);
      return false;
    }
    
    if (!permissionCache[permission]) {
      // 缓存未命中，记录警告并返回安全的默认值
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[usePermission] Permission "${permission}" not found in cache. Consider using checkPermission() for accurate results.`);
      }
      return false; // 安全默认值，避免误判
    }
    
    const cached = permissionCache[permission];
    const cacheAge = Date.now() - (cached.context?.timestamp?.getTime() || 0);
    
    // 缓存过期则返回安全默认值并记录警告
    if (cacheAge >= 5 * 60 * 1000) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[usePermission] Cached permission "${permission}" expired (age: ${Math.round(cacheAge / 1000)}s). Use checkPermission() for fresh results.`);
      }
      return false; // 安全默认值
    }
    
    return cached.allowed;
  }, [enableCache, permissionCache]);

  // 清理权限缓存函数移动到 return 语句之前避免重复声明

  // 预加载用户权限到缓存 (仅执行一次)
  useEffect(() => {
    if (!user || initialized) return;

    const preloadPermissions = async () => {
      setInitialized(true); // 立即设置标志，防止重复执行
      try {
        // 扩展的权限预加载列表，包含角色管理相关权限
        const commonPermissions = [
          // 基础权限
          'user_management.read',
          'user_management.write',
          'dashboard.read',
          'employee_management.read',
          
          // 角色管理相关权限（修复同步检查问题）
          'manage_roles',
          'view_roles',
          'assign_roles',
          'view_role_permissions',
          'manage_role_permissions',
          
          // 其他常用权限
          'payroll.read',
          'payroll.write',
          'statistics:read'
        ] as Permission[];

        console.log('[usePermission] Preloading extended permissions for user:', user.id);
        
        // 使用统一权限管理器直接批量检查，避免触发状态更新
        try {
          const results = await unifiedPermissionManager.checkMultiplePermissions(
            commonPermissions, 
            baseContext
          );
          
          // 手动更新缓存，避免触发状态更新循环
          const newCache: Record<string, PermissionResult> = {};
          Object.entries(results).forEach(([permission, result]) => {
            newCache[permission] = result;
          });
          
          setPermissionCache(prev => ({ ...prev, ...newCache }));
          
          console.log('[usePermission] Permission cache preloaded with', commonPermissions.length, 'permissions');
          
          // 输出调试信息，帮助诊断缓存状态
          if (process.env.NODE_ENV === 'development') {
            const cacheStatus = commonPermissions.map(p => ({
              permission: p,
              cached: !!newCache[p],
              allowed: newCache[p]?.allowed || false
            }));
            console.table(cacheStatus);
          }
        } catch (error) {
          console.error('[usePermission] Error in batch permission check:', error);
          
          // 降级到单个检查，但添加延迟避免资源耗尽
          for (let i = 0; i < commonPermissions.length; i++) {
            const permission = commonPermissions[i];
            try {
              // 添加延迟避免并发过多
              if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
              
              const result = await unifiedPermissionManager.checkPermission(permission, baseContext);
              setPermissionCache(prev => ({ 
                ...prev, 
                [permission]: result 
              }));
            } catch (singleError) {
              console.warn(`[usePermission] Failed to preload permission ${permission}:`, singleError);
            }
          }
        }
      } catch (error) {
        console.error('[usePermission] Error preloading permissions:', error);
      }
    };

    // 添加防抖，避免频繁调用
    const timeoutId = setTimeout(() => {
      preloadPermissions();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [user?.id, initialized]); // 依赖用户ID和初始化状态
  
  // 当用户变更时重置初始化状态
  useEffect(() => {
    setInitialized(false);
    setPermissionCache({});
  }, [user?.id]);

  // 监听权限变更 - 稳定化依赖
  useEffect(() => {
    if (!user || !watchChanges) return;

    const unsubscribe = unifiedPermissionManager.subscribe({
      userId: user.id,
      permissions: [], // 监听所有权限变更
      onPermissionChange: (event) => {
        console.log('[usePermission] Permission change detected:', event);
        
        // 清理相关权限的缓存
        if (event.permission) {
          setPermissionCache(prev => {
            const newCache = { ...prev };
            delete newCache[event.permission!];
            return newCache;
          });
        } else {
          // 角色变更或全局权限变更，清理所有缓存
          setPermissionCache({});
        }
      },
      onError: (error) => {
        console.error('[usePermission] Permission subscription error:', error);
        setError(error);
      }
    });

    return unsubscribe;
  }, [user?.id, watchChanges]); // 只依赖 user.id 和 watchChanges

  // 清理权限缓存 - 稳定化实现
  const clearPermissionCache = useCallback((permission?: Permission) => {
    if (permission) {
      setPermissionCache(prev => {
        const newCache = { ...prev };
        delete newCache[permission];
        return newCache;
      });
    } else {
      setPermissionCache({});
    }
  }, []);

  // 测试专用：批量预加载权限到缓存
  const populateCache = useCallback(async (permissions: Permission[]): Promise<void> => {
    if (!user) {
      console.warn('[usePermission] Cannot populate cache: user not authenticated');
      return;
    }
    
    try {
      console.log(`[usePermission] Populating cache with ${permissions.length} permissions for testing`);
      
      const results = await unifiedPermissionManager.checkMultiplePermissions(
        permissions, 
        baseContext
      );
      
      const newCache: Record<string, PermissionResult> = {};
      Object.entries(results).forEach(([permission, result]) => {
        newCache[permission] = result;
      });
      
      setPermissionCache(prev => ({ ...prev, ...newCache }));
      
      console.log('[usePermission] Cache populated successfully');
      
      // 调试输出缓存状态
      if (process.env.NODE_ENV === 'development') {
        const cacheStatus = permissions.map(p => ({
          permission: p,
          cached: !!newCache[p],
          allowed: newCache[p]?.allowed || false
        }));
        console.table(cacheStatus);
      }
    } catch (error) {
      console.error('[usePermission] Error populating cache:', error);
      throw error;
    }
  }, [user, baseContext]);

  return {
    // 基础权限检查 (同步版本，基于缓存)
    hasPermission: (permission: Permission, resourceId?: string): boolean => {
      return hasCachedPermission(permission);
    },
    hasAnyPermission: (permissions: Permission[], resourceId?: string): boolean => {
      return permissions.some(p => hasCachedPermission(p));
    },
    hasAllPermissions: (permissions: Permission[], resourceId?: string): boolean => {
      return permissions.every(p => hasCachedPermission(p));
    },
    
    // 上下文权限检查 (异步版本)
    checkPermission,
    checkMultiplePermissions,
    
    // 异步权限检查方法
    hasPermissionAsync,
    hasAnyPermissionAsync,
    hasAllPermissionsAsync,
    
    // 状态
    loading,
    error,
    initialized, // 权限系统初始化状态
    
    // 缓存管理
    clearCache: () => clearPermissionCache(),
    invalidatePermission: (permission: Permission, resourceId?: string) => clearPermissionCache(permission),
    populateCache, // 测试专用：批量预加载权限
    
    // 实时更新
    isSubscribed: true,
    subscribe: () => {},
    unsubscribe: () => {},
    
    // 调试信息
    debug: {
      cacheSize: Object.keys(permissionCache).length,
      requestCount,
      userId: user?.id,
      ...(process.env.NODE_ENV === 'development' && { cacheContents: permissionCache })
    }
  };
}

// 导出权限工具函数
export const permissionUtils = {
  /**
   * 构建资源权限上下文
   */
  buildResourceContext: (
    resourceType: 'employee' | 'department' | 'payroll' | 'report' | 'system',
    resourceId: string,
    attributes?: Record<string, any>
  ): Pick<PermissionContext, 'resource'> => ({
    resource: {
      type: resourceType,
      id: resourceId,
      attributes
    }
  }),

  /**
   * 权限字符串格式化
   */
  formatPermission: (domain: string, action: string): Permission => {
    return `${domain}.${action}` as Permission;
  },

  /**
   * 解析权限字符串
   */
  parsePermission: (permission: Permission): { domain: string; action: string } => {
    const [domain, action] = permission.split('.');
    return { domain, action };
  },

  /**
   * 检查权限格式是否有效
   */
  isValidPermission: (permission: string): permission is Permission => {
    return /^[a-z_]+\.[a-z_]+$/.test(permission);
  }
};