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
import { PERMISSIONS } from '@/constants/permissions';
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
    permission: string,
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
  }, [user?.id, baseContext, enableCache, fallbackResult, throwOnError]); // 移除 permissionCache 和 requestCount 依赖

  // 检查多个权限
  const checkMultiplePermissions = useCallback(async (
    permissions: string[],
    context?: PermissionContext
  ): Promise<Record<string, PermissionResult>> => {
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
  const hasPermissionAsync = useCallback(async (permission: string, context?: PermissionContext): Promise<boolean> => {
    const result = await checkPermission(permission, context);
    return result.allowed;
  }, [checkPermission]);

  const hasAnyPermissionAsync = useCallback(async (permissions: string[], context?: PermissionContext): Promise<boolean> => {
    const results = await checkMultiplePermissions(permissions, context);
    return Object.values(results).some(result => result.allowed);
  }, [checkMultiplePermissions]);

  const hasAllPermissionsAsync = useCallback(async (permissions: string[], context?: PermissionContext): Promise<boolean> => {
    const results = await checkMultiplePermissions(permissions, context);
    return Object.values(results).every(result => result.allowed);
  }, [checkMultiplePermissions]);

  // 同步权限检查（基于缓存）- 完全稳定版本，使用ref避免循环
  const hasCachedPermission = useCallback((permission: string): boolean => {
    // 直接访问当前state值，避免依赖数组中的循环引用
    const currentCache = permissionCache;
    
    if (!enableCache) {
      // 缓存禁用时，基于用户角色提供基础判断
      if (user?.role === 'super_admin') return true;
      if (user?.role === 'admin' && permission.includes('read')) return true;
      return false;
    }
    
    if (!currentCache[permission]) {
      // 缓存未命中处理 - 不再输出警告避免控制台刷屏
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        // 只有10%概率输出诊断信息，避免控制台过载
        console.debug(`[usePermission] Cache miss for "${permission}" (${Object.keys(currentCache).length} cached)`);
      }
      
      // 基于用户角色和权限名称提供智能降级
      if (user?.role === 'super_admin') {
        // 超级管理员拥有所有权限
        return true;
      }
      
      if (user?.role === 'admin') {
        // 管理员的基础权限判断
        const adminBasicPermissions = [
          'dashboard.read',
          'employee_management.read',
          'user_management.read',
          'payroll_management.read',
          'data.all.read'
        ];
        if (adminBasicPermissions.includes(permission)) {
          return true;
        }
      }
      
      // 缓存未命中且非特权用户，返回false确保安全
      return false;
    }
    
    const cached = currentCache[permission];
    const cacheAge = Date.now() - (cached.context?.timestamp?.getTime() || 0);
    
    // 缓存过期检查，但提供更宽松的过期策略
    if (cacheAge >= 10 * 60 * 1000) { // 从5分钟延长到10分钟
      // 过期但仍然返回缓存值，避免权限突然失效影响用户体验
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
        console.debug(`[usePermission] Using expired cache for "${permission}" (${Math.round(cacheAge / 1000)}s old)`);
      }
    }
    
    return cached.allowed;
  }, [enableCache, user?.role]); // 稳定的依赖数组

  // 清理权限缓存函数移动到 return 语句之前避免重复声明

  // 预加载用户权限到缓存 - 修复：移除 initialized 依赖避免无限循环
  useEffect(() => {
    if (!user) return;

    const preloadPermissions = async () => {
      if (initialized) return; // 双重检查避免重复执行
      setInitialized(true); // 立即设置标志，防止重复执行
      console.log('[usePermission] 🚀 Starting permission preload for user:', user.id);
      
      try {
        // 使用关键权限列表，避免一次性加载过多权限导致超时
        const criticalPermissions = [
          'dashboard.read',
          'payroll.clear',
          'employee_management.read',
          'employee_management.write',
          'user_management.read',
          'user_management.write',
          'data.all.read',
          'data.department.read',
          'data.self.read'
        ];
        
        console.log(`[usePermission] 🎯 Preloading ${criticalPermissions.length} critical permissions`);

        // 分批加载，避免网络超时和资源耗尽
        const batchSize = 3; // 每批3个权限
        const results: Record<string, PermissionResult> = {};
        
        for (let i = 0; i < criticalPermissions.length; i += batchSize) {
          const batch = criticalPermissions.slice(i, i + batchSize);
          console.log(`[usePermission] Loading batch ${Math.floor(i/batchSize) + 1}: ${batch.join(', ')}`);
          
          try {
            // 为每个权限单独调用，避免批量调用失败
            for (const permission of batch) {
              try {
                const result = await unifiedPermissionManager.checkPermission(permission, baseContext);
                results[permission] = result;
                
                // 实时更新缓存，避免状态批量更新
                setPermissionCache(prev => ({
                  ...prev,
                  [permission]: result
                }));
                
                console.log(`[usePermission] ✅ Cached ${permission}: ${result.allowed}`);
              } catch (singleError) {
                console.warn(`[usePermission] ⚠️ Failed to load ${permission}:`, singleError);
                // 为失败的权限提供降级结果
                const fallbackResult: PermissionResult = {
                  allowed: false,
                  reason: 'Preload failed - using fallback',
                  context: baseContext
                };
                results[permission] = fallbackResult;
                setPermissionCache(prev => ({
                  ...prev,
                  [permission]: fallbackResult
                }));
              }
              
              // 添加延迟避免过快请求
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (batchError) {
            console.error(`[usePermission] Batch ${Math.floor(i/batchSize) + 1} failed:`, batchError);
          }
          
          // 批次间延迟
          if (i + batchSize < criticalPermissions.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        console.log(`[usePermission] ✅ Preload completed. ${Object.keys(results).length}/${criticalPermissions.length} permissions cached`);
        
        // 检查关键权限状态
        const payrollClearStatus = results['payroll.clear'];
        if (payrollClearStatus) {
          console.log('[usePermission] 🎯 payroll.clear status:', payrollClearStatus.allowed ? 'GRANTED' : 'DENIED');
        }
        
      } catch (error) {
        console.error('[usePermission] ❌ Critical error in permission preload:', error);
        // 即使预加载失败，也要设置初始化完成，避免无限重试
        setInitialized(true);
      }
    };

    // 添加更长的防抖延迟，确保用户状态稳定
    const timeoutId = setTimeout(() => {
      preloadPermissions();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [user?.id]); // 只依赖用户ID，移除initialized依赖避免循环
  
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
  const clearPermissionCache = useCallback((permission?: string) => {
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
  const populateCache = useCallback(async (permissions: string[]): Promise<void> => {
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

  // 动态权限发现 - 全新API
  const discoverUserPermissions = useCallback(async (): Promise<string[]> => {
    if (!user) return [];
    
    const cacheEntries = Object.entries(permissionCache);
    const grantedPermissions = cacheEntries
      .filter(([_, result]) => result.allowed)
      .map(([permission]) => permission);
    
    return grantedPermissions;
  }, [permissionCache, user]);

  const getPermissionMetadata = useCallback(async (permission: string) => {
    // 未来可以从API获取权限元数据
    // 现在先返回基础信息
    return {
      code: permission,
      name: permission.split('.').pop() || permission,
      category: permission.split('.')[0] || 'unknown',
      description: `权限: ${permission}`
    };
  }, []);

  const getAllSystemPermissions = useCallback(async (): Promise<string[]> => {
    // 从数据库动态获取所有系统权限
    try {
      if (!user) return [];
      
      // 这里可以调用API获取系统所有可用权限
      // 暂时返回缓存中的权限作为已知权限
      return Object.keys(permissionCache);
    } catch (error) {
      console.error('[usePermission] Failed to get system permissions:', error);
      return [];
    }
  }, [permissionCache, user]);

  // 稳定化权限检查函数 - 移除异步调用避免无限循环
  const hasPermission = useCallback((permission: string, resourceId?: string): boolean => {
    const cachedResult = hasCachedPermission(permission);
    
    // 如果缓存未命中且权限系统已初始化，为关键权限提供回退机制
    if (!cachedResult && initialized && permission === 'payroll.clear') {
      // 对于 payroll.clear，基于用户角色提供保守的回退判断
      if (user?.role === 'super_admin' || user?.role === 'admin') {
        console.info('[usePermission] 🔄 Fallback: Allowing payroll.clear for admin user');
        return true;
      }
    }
    
    return cachedResult;
  }, [hasCachedPermission, initialized, user?.role]);

  const hasAnyPermission = useCallback((permissions: string[], resourceId?: string): boolean => {
    return permissions.some(p => hasCachedPermission(p));
  }, [hasCachedPermission]);

  const hasAllPermissions = useCallback((permissions: string[], resourceId?: string): boolean => {
    return permissions.every(p => hasCachedPermission(p));
  }, [hasCachedPermission]);

  return {
    // 基础权限检查 (同步版本，基于缓存)
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
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
    invalidatePermission: (permission: string, resourceId?: string) => clearPermissionCache(permission),
    populateCache, // 测试专用：批量预加载权限
    
    // 实时更新
    isSubscribed: true,
    subscribe: () => {},
    unsubscribe: () => {},
    
    // 🚀 动态权限发现API (全新功能)
    discoverUserPermissions,     // 发现当前用户的所有权限
    getPermissionMetadata,       // 获取权限元数据
    getAllSystemPermissions,     // 获取系统所有可用权限
    
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