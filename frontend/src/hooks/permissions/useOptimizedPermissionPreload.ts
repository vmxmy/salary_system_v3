import { useEffect, useState, useRef, useCallback } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { getOptimizedConfig } from '@/lib/performanceConfig';

/**
 * 优化的权限预加载Hook
 * 解决权限串行加载导致的性能问题
 * 
 * 注意：临时禁用，等待权限管理器完善
 */
export interface PermissionPreloadResult {
  isPreloading: boolean;
  preloadedPermissions: Set<string>;
  preloadProgress: number;
  error: string | null;
}

export function useOptimizedPermissionPreload(): PermissionPreloadResult {
  const { user } = useUnifiedAuth();
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadedPermissions, setPreloadedPermissions] = useState<Set<string>>(new Set());
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const preloadedRef = useRef(false);
  const performanceConfig = getOptimizedConfig();

  // 关键权限列表 - 根据业务重要性排序
  const criticalPermissions = [
    // 核心数据访问权限（最高优先级）
    'data.all.read',
    'dashboard.read', 
    'employee_management.read',
    
    // 业务操作权限（高优先级）
    'employee_management.write',
    'payroll.read',
    'payroll.write',
    
    // 管理功能权限（中优先级）  
    'user_management.read',
    'user_management.write',
    'system_settings.read',
    
    // 特殊权限（低优先级）
    'payroll.clear',
    'data.department.read',
    'data.self.read',
  ];

  // 构建权限上下文
  const buildPermissionContext = useCallback(() => {
    return {
      user_id: user?.id || '',
      employee_id: (user as any)?.user_metadata?.employee_id || '',
      ip_address: '', // 可以从请求中获取
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
  }, [user]);

  // 临时禁用权限预加载，直接返回空结果
  const preloadPermissionsParallel = useCallback(async () => {
    if (!user || preloadedRef.current) return;
    
    console.log('[PermissionPreload] 🚧 Temporarily disabled - waiting for permission manager');
    preloadedRef.current = true;
    setPreloadProgress(100); // 标记为完成
  }, [user]);

  // 监听用户变化触发预加载
  useEffect(() => {
    if (user && !preloadedRef.current) {
      // 小延迟确保其他系统初始化完成
      const timer = setTimeout(preloadPermissionsParallel, 100);
      return () => clearTimeout(timer);
    }
  }, [user, preloadPermissionsParallel]);

  // 重置预加载状态（用户变化时）
  useEffect(() => {
    if (!user) {
      preloadedRef.current = false;
      setPreloadedPermissions(new Set());
      setPreloadProgress(0);
      setError(null);
    }
  }, [user]);

  return {
    isPreloading,
    preloadedPermissions,
    preloadProgress,
    error,
  };
}

/**
 * 权限预加载状态Hook
 * 提供给组件使用的简化接口
 */
export function usePermissionPreloadStatus() {
  const { isPreloading, preloadedPermissions, preloadProgress, error } = useOptimizedPermissionPreload();

  return {
    isReady: !isPreloading && preloadedPermissions.size > 0,
    isLoading: isPreloading,
    progress: preloadProgress,
    loadedCount: preloadedPermissions.size,
    hasError: !!error,
    errorMessage: error,
  };
}

/**
 * 智能权限检查Hook
 * 结合预加载结果，提供更快的权限检查
 */
export function useSmartPermissionCheck() {
  const { preloadedPermissions } = useOptimizedPermissionPreload();
  const { user } = useUnifiedAuth();

  return useCallback(async (permission: string): Promise<boolean> => {
    // 临时实现：根据用户角色提供基础权限判断
    if (user?.role === 'super_admin') return true;
    if (user?.role === 'admin' && permission.includes('read')) return true;
    
    console.log(`[SmartPermission] 🚧 Temporarily using basic permission check for ${permission}`);
    return false;
  }, [preloadedPermissions, user]);
}