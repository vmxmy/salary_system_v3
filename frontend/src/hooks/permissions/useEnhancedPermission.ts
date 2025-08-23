/**
 * 增强的权限验证 Hook
 * 
 * 特性：
 * - 支持上下文感知的权限检查
 * - 集成实时权限同步
 * - 智能缓存与性能优化
 * - 批量权限检查
 * - 错误边界处理
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { permissionManager } from '@/lib/permissionManager';
import type {
  Permission,
  PermissionContext,
  PermissionResult,
  UsePermissionOptions,
  UsePermissionReturn,
  PermissionChangeEvent,
  PermissionError
} from '@/types/permission';

/**
 * 增强的权限验证 Hook
 */
export function useEnhancedPermission(options: UsePermissionOptions = {}): UsePermissionReturn {
  const { user } = useUnifiedAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // 配置选项
  const config = useMemo(() => ({
    enableCache: true,
    cacheTimeout: 5 * 60 * 1000, // 5分钟
    enableRealtime: true,
    subscribeToChanges: true,
    throwOnError: false,
    fallbackPermission: false,
    debounceMs: 100,
    batchRequests: true,
    ...options
  }), [options]);

  // 防抖处理
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const subscriptionRef = useRef<(() => void) | null>(null);

  // 构建权限上下文
  const buildContext = useCallback((resourceId?: string, resourceType?: 'employee' | 'department' | 'payroll' | 'report'): PermissionContext => {
    const context: PermissionContext = {
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role as any,
        departmentId: user.departmentId,
        managedDepartments: user.managedDepartments
      } : undefined,
      timestamp: new Date()
    };

    if (resourceId && resourceType) {
      context.resource = {
        type: resourceType,
        id: resourceId
      };
    }

    return context;
  }, [user]);

  // 防抖包装器
  const debounce = useCallback(<T extends any[], R>(
    func: (...args: T) => Promise<R>,
    delay: number
  ) => {
    return (...args: T): Promise<R> => {
      return new Promise((resolve, reject) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(async () => {
          try {
            const result = await func(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, delay);
      });
    };
  }, []);

  // 基础权限检查
  const hasPermission = useCallback((permission: Permission, resourceId?: string): boolean => {
    if (!user) return config.fallbackPermission;

    try {
      // 使用现有的同步权限检查逻辑作为快速路径
      const rolePermissions = user.permissions || [];
      if (rolePermissions.includes('*') || rolePermissions.includes(permission)) {
        return true;
      }

      // 对于需要上下文检查的权限，返回保守结果
      if (resourceId) {
        return config.fallbackPermission;
      }

      return false;
    } catch (err) {
      if (config.throwOnError) {
        throw err;
      }
      setError(err as Error);
      return config.fallbackPermission;
    }
  }, [user, config.fallbackPermission, config.throwOnError]);

  // 多权限检查
  const hasAnyPermission = useCallback((permissions: Permission[], resourceId?: string): boolean => {
    return permissions.some(permission => hasPermission(permission, resourceId));
  }, [hasPermission]);

  const hasAllPermissions = useCallback((permissions: Permission[], resourceId?: string): boolean => {
    return permissions.every(permission => hasPermission(permission, resourceId));
  }, [hasPermission]);

  // 上下文感知权限检查
  const checkPermission = useCallback(async (
    permission: Permission, 
    contextOverride?: Partial<PermissionContext>
  ): Promise<PermissionResult> => {
    if (!user) {
      return { 
        allowed: config.fallbackPermission, 
        reason: 'User not authenticated' 
      };
    }

    setLoading(true);
    setError(null);

    try {
      const context = {
        ...buildContext(),
        ...contextOverride
      };

      const result = await permissionManager.checkPermission(permission, context);
      return result;
    } catch (err) {
      const error = err instanceof PermissionError ? err : new Error(err instanceof Error ? err.message : 'Unknown permission error');
      
      if (config.throwOnError) {
        throw error;
      }

      setError(error);
      return { 
        allowed: config.fallbackPermission, 
        reason: error.message 
      };
    } finally {
      setLoading(false);
    }
  }, [user, buildContext, config.fallbackPermission, config.throwOnError]);

  // 防抖的权限检查
  const debouncedCheckPermission = useMemo(
    () => debounce(checkPermission, config.debounceMs),
    [checkPermission, debounce, config.debounceMs]
  );

  // 批量权限检查
  const checkMultiplePermissions = useCallback(async (
    permissions: Permission[],
    contextOverride?: Partial<PermissionContext>
  ): Promise<Record<Permission, PermissionResult>> => {
    if (!user) {
      const emptyResult: Record<Permission, PermissionResult> = {};
      permissions.forEach(permission => {
        emptyResult[permission] = { 
          allowed: config.fallbackPermission, 
          reason: 'User not authenticated' 
        };
      });
      return emptyResult;
    }

    if (!config.batchRequests) {
      // 串行处理
      const results: Record<Permission, PermissionResult> = {};
      for (const permission of permissions) {
        results[permission] = await checkPermission(permission, contextOverride);
      }
      return results;
    }

    setLoading(true);
    setError(null);

    try {
      const context = {
        ...buildContext(),
        ...contextOverride
      };

      const results = await permissionManager.checkMultiplePermissions(permissions, context);
      return results;
    } catch (err) {
      const error = err instanceof PermissionError ? err : new Error(err instanceof Error ? err.message : 'Unknown permission error');
      
      if (config.throwOnError) {
        throw error;
      }

      setError(error);
      
      // 返回降级结果
      const fallbackResults: Record<Permission, PermissionResult> = {};
      permissions.forEach(permission => {
        fallbackResults[permission] = { 
          allowed: config.fallbackPermission, 
          reason: error.message 
        };
      });
      return fallbackResults;
    } finally {
      setLoading(false);
    }
  }, [user, buildContext, config.batchRequests, config.fallbackPermission, config.throwOnError, checkPermission]);

  // 缓存管理
  const clearCache = useCallback(() => {
    permissionManager.clearCache(user?.id);
  }, [user?.id]);

  const invalidatePermission = useCallback((permission: Permission, resourceId?: string) => {
    const cacheKey = resourceId ? `${permission}|${resourceId}` : permission;
    // 通过设置过期时间来无效化特定权限
    const expiredItem = permissionManager.getCachedResult(permission, resourceId);
    if (expiredItem) {
      expiredItem.expiresAt = new Date(0); // 设置为过期
    }
  }, []);

  // 权限变更事件处理
  const handlePermissionChange = useCallback((event: PermissionChangeEvent) => {
    if (event.userId === user?.id) {
      // 清理相关缓存
      clearCache();
      
      // 可以在这里触发重新渲染或显示通知
      if (config.enableRealtime) {
        console.log('[useEnhancedPermission] Permission change detected:', event);
      }
    }
  }, [user?.id, clearCache, config.enableRealtime]);

  // 实时订阅管理
  const subscribe = useCallback(() => {
    if (!user || !config.enableRealtime || !config.subscribeToChanges) {
      return;
    }

    if (subscriptionRef.current) {
      subscriptionRef.current(); // 清理现有订阅
    }

    const unsubscribe = permissionManager.subscribe({
      userId: user.id,
      permissions: user.permissions as Permission[],
      onPermissionChange: handlePermissionChange,
      onError: (error) => {
        console.error('[useEnhancedPermission] Subscription error:', error);
        setError(error);
      }
    });

    subscriptionRef.current = unsubscribe;
    setIsSubscribed(true);

    if (config.enableRealtime) {
      console.log('[useEnhancedPermission] Permission subscription activated for user:', user.id);
    }
  }, [user, config.enableRealtime, config.subscribeToChanges, handlePermissionChange]);

  const unsubscribe = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current();
      subscriptionRef.current = null;
      setIsSubscribed(false);

      if (config.enableRealtime) {
        console.log('[useEnhancedPermission] Permission subscription deactivated');
      }
    }
  }, [config.enableRealtime]);

  // 自动订阅管理
  useEffect(() => {
    if (config.enableRealtime && config.subscribeToChanges && user) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [user, config.enableRealtime, config.subscribeToChanges, subscribe, unsubscribe]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    // 基础权限检查
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // 上下文权限检查
    checkPermission: config.debounceMs > 0 ? debouncedCheckPermission : checkPermission,
    
    // 批量权限检查
    checkMultiplePermissions,
    
    // 权限状态
    loading,
    error,
    
    // 缓存管理
    clearCache,
    invalidatePermission,
    
    // 实时更新
    isSubscribed,
    subscribe,
    unsubscribe,
  };
}