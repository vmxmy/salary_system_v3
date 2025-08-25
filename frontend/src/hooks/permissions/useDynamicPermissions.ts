/**
 * 动态权限加载 Hook - 替代硬编码权限系统
 * 
 * 核心功能：
 * - 动态加载权限数据，替代静态 MOCK_PERMISSIONS
 * - 提供权限搜索、分类、统计功能
 * - 集成缓存机制提升性能
 * - 支持实时权限更新和同步
 * 
 * 设计原则：
 * - 向后兼容：与现有权限检查逻辑兼容
 * - 性能优先：利用缓存减少数据库查询
 * - 类型安全：完整的 TypeScript 类型覆盖
 * - 错误处理：优雅的错误恢复和用户反馈
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { dynamicPermissionService } from '@/services/dynamicPermissionService';
import type { DynamicPermission, PermissionCategory } from '@/services/dynamicPermissionService';

/**
 * Hook 配置选项
 */
interface UseDynamicPermissionsOptions {
  /** 是否启用自动加载 */
  autoLoad?: boolean;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 是否监听权限变更 */
  watchChanges?: boolean;
  /** 初始搜索查询 */
  initialSearch?: string;
  /** 初始分类过滤 */
  initialCategory?: string;
  /** 错误处理策略 */
  onError?: (error: Error) => void;
}

/**
 * Hook 返回值类型
 */
interface UseDynamicPermissionsReturn {
  // 权限数据
  permissions: DynamicPermission[];
  categories: PermissionCategory[];
  
  // 搜索和过滤
  searchQuery: string;
  selectedCategory: string;
  filteredPermissions: DynamicPermission[];
  
  // 状态管理
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  
  // 操作方法
  loadPermissions: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  searchPermissions: (query: string) => void;
  filterByCategory: (category: string) => void;
  getPermissionByCode: (code: string) => DynamicPermission | undefined;
  getRolePermissions: (roleCode: string) => Promise<DynamicPermission[]>;
  
  // 统计信息
  stats: {
    total: number;
    categories: number;
    systemPermissions: number;
    mostUsedPermissions: Array<{ code: string; roleCount: number }>;
  };
  
  // 工具方法
  clearCache: () => void;
  validatePermissionCode: (code: string) => boolean;
}

/**
 * 权限代码验证规则
 */
const PERMISSION_CODE_PATTERN = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

/**
 * 动态权限管理 Hook
 */
export function useDynamicPermissions(options: UseDynamicPermissionsOptions = {}): UseDynamicPermissionsReturn {
  const {
    autoLoad = true,
    enableCache = true,
    watchChanges = false,
    initialSearch = '',
    initialCategory = 'all',
    onError
  } = options;

  // 基础状态
  const [permissions, setPermissions] = useState<DynamicPermission[]>([]);
  const [categories, setCategories] = useState<PermissionCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 搜索和过滤状态
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  /**
   * 加载权限数据
   */
  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[useDynamicPermissions] 开始加载动态权限数据...');
      
      // 并行加载权限和分类数据
      const [permissionsData, categoriesData] = await Promise.all([
        dynamicPermissionService.getAllPermissions(),
        dynamicPermissionService.getPermissionsByCategory()
      ]);
      
      setPermissions(permissionsData);
      setCategories(categoriesData);
      setLastUpdated(new Date());
      
      console.log(`[useDynamicPermissions] 成功加载 ${permissionsData.length} 个权限，${categoriesData.length} 个分类`);
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('加载权限数据失败');
      setError(error);
      console.error('[useDynamicPermissions] 加载失败:', error);
      
      // 调用用户自定义错误处理
      onError?.(error);
      
    } finally {
      setLoading(false);
    }
  }, [onError]);

  /**
   * 刷新权限数据（清除缓存）
   */
  const refreshPermissions = useCallback(async () => {
    console.log('[useDynamicPermissions] 刷新权限数据，清除缓存...');
    
    // 清除服务层缓存
    if (enableCache) {
      dynamicPermissionService.clearCache();
    }
    
    // 重新加载数据
    await loadPermissions();
  }, [loadPermissions, enableCache]);

  /**
   * 搜索权限
   */
  const searchPermissions = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /**
   * 按分类过滤
   */
  const filterByCategory = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  /**
   * 根据权限代码获取权限对象
   */
  const getPermissionByCode = useCallback((code: string): DynamicPermission | undefined => {
    return permissions.find(p => p.code === code);
  }, [permissions]);

  /**
   * 获取角色的权限列表
   */
  const getRolePermissions = useCallback(async (roleCode: string): Promise<DynamicPermission[]> => {
    try {
      return await dynamicPermissionService.getRolePermissions(roleCode);
    } catch (err) {
      console.error(`[useDynamicPermissions] 获取角色权限失败 (${roleCode}):`, err);
      return [];
    }
  }, []);

  /**
   * 清除缓存
   */
  const clearCache = useCallback(() => {
    console.log('[useDynamicPermissions] 清除权限缓存');
    dynamicPermissionService.clearCache();
  }, []);

  /**
   * 验证权限代码格式
   */
  const validatePermissionCode = useCallback((code: string): boolean => {
    return PERMISSION_CODE_PATTERN.test(code);
  }, []);

  /**
   * 过滤后的权限列表
   */
  const filteredPermissions = useMemo(() => {
    let filtered = permissions;

    // 分类过滤
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(permission => 
        permission.code.toLowerCase().includes(query) ||
        permission.name.toLowerCase().includes(query) ||
        permission.description.toLowerCase().includes(query) ||
        permission.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [permissions, selectedCategory, searchQuery]);

  /**
   * 统计信息 (同步计算)
   */
  const stats = useMemo(() => {
    // 如果数据还没加载完成，返回默认值
    if (loading || !permissions.length) {
      return {
        total: 0,
        categories: 0,
        systemPermissions: 0,
        mostUsedPermissions: []
      };
    }

    // 计算统计信息
    return {
      total: permissions.length,
      categories: categories.length,
      systemPermissions: permissions.filter(p => p.isSystem).length,
      mostUsedPermissions: permissions
        .map(p => ({ code: p.code, roleCount: p.usedByRoles.length }))
        .sort((a, b) => b.roleCount - a.roleCount)
        .slice(0, 10)
    };
  }, [permissions, categories, loading]);

  /**
   * 初始化数据加载
   */
  useEffect(() => {
    if (autoLoad) {
      loadPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]); // Only depend on autoLoad to avoid infinite loops

  /**
   * 权限变更监听（如果启用）
   */
  useEffect(() => {
    if (!watchChanges) return;

    // 监听权限配置变更事件
    const handlePermissionChange = () => {
      console.log('[useDynamicPermissions] 检测到权限变更，自动刷新...');
      refreshPermissions();
    };

    // 监听自定义权限变更事件
    window.addEventListener('permission-config-changed', handlePermissionChange);
    
    // 监听存储变更（如果其他组件清除了缓存）
    window.addEventListener('storage', (event) => {
      if (event.key === 'permission-cache-cleared') {
        handlePermissionChange();
      }
    });

    return () => {
      window.removeEventListener('permission-config-changed', handlePermissionChange);
      window.removeEventListener('storage', handlePermissionChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchChanges]); // Only depend on watchChanges to avoid infinite loops

  return {
    // 权限数据
    permissions,
    categories,
    
    // 搜索和过滤
    searchQuery,
    selectedCategory,
    filteredPermissions,
    
    // 状态管理
    loading,
    error,
    lastUpdated,
    
    // 操作方法
    loadPermissions,
    refreshPermissions,
    searchPermissions,
    filterByCategory,
    getPermissionByCode,
    getRolePermissions,
    
    // 统计信息
    stats,
    
    // 工具方法
    clearCache,
    validatePermissionCode
  };
}

/**
 * 权限选择 Hook - 用于权限分配界面
 */
export function usePermissionSelection(initialSelected: string[] = []) {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(initialSelected)
  );

  const togglePermission = useCallback((permissionCode: string) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permissionCode)) {
        newSet.delete(permissionCode);
      } else {
        newSet.add(permissionCode);
      }
      return newSet;
    });
  }, []);

  const toggleAllPermissions = useCallback((permissions: DynamicPermission[], select: boolean) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      permissions.forEach(permission => {
        if (select) {
          newSet.add(permission.code);
        } else {
          newSet.delete(permission.code);
        }
      });
      return newSet;
    });
  }, []);

  const toggleCategoryPermissions = useCallback((category: PermissionCategory, select: boolean) => {
    toggleAllPermissions(category.permissions, select);
  }, [toggleAllPermissions]);

  const clearSelection = useCallback(() => {
    setSelectedPermissions(new Set());
  }, []);

  const selectAll = useCallback((permissions: DynamicPermission[]) => {
    setSelectedPermissions(new Set(permissions.map(p => p.code)));
  }, []);

  const isSelected = useCallback((permissionCode: string): boolean => {
    return selectedPermissions.has(permissionCode);
  }, [selectedPermissions]);

  const getSelectedPermissions = useCallback((): string[] => {
    return Array.from(selectedPermissions);
  }, [selectedPermissions]);

  const getSelectedCount = useCallback((): number => {
    return selectedPermissions.size;
  }, [selectedPermissions]);

  return {
    selectedPermissions: Array.from(selectedPermissions),
    selectedCount: selectedPermissions.size,
    togglePermission,
    toggleAllPermissions,
    toggleCategoryPermissions,
    clearSelection,
    selectAll,
    isSelected,
    getSelectedPermissions,
    getSelectedCount,
    setSelectedPermissions: (permissions: string[]) => {
      setSelectedPermissions(new Set(permissions));
    }
  };
}

/**
 * 向后兼容性工具函数 - 将动态权限转换为旧格式
 */
export function convertToLegacyPermissionFormat(dynamicPermissions: DynamicPermission[]) {
  return dynamicPermissions.map(permission => ({
    id: permission.id,
    code: permission.code,
    name: permission.name,
    description: permission.description,
    category: permission.category,
    resource: permission.resource,
    action: permission.action
  }));
}

/**
 * 导出类型和常量
 */
export type { DynamicPermission, PermissionCategory, UseDynamicPermissionsOptions, UseDynamicPermissionsReturn };

/**
 * 默认 Hook 配置
 */
export const DEFAULT_DYNAMIC_PERMISSIONS_OPTIONS: UseDynamicPermissionsOptions = {
  autoLoad: true,
  enableCache: true,
  watchChanges: false,
  initialSearch: '',
  initialCategory: 'all'
};