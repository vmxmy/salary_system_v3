import { useState, useEffect, useCallback } from 'react';
import { InsuranceConfigAPI, type InsuranceConfig, type InsuranceConfigFilters, type InsuranceConfigListResponse } from '../lib/insuranceConfigApi';
import { useToast } from './useToast';

interface UseInsuranceConfigsOptions {
  initialPage?: number;
  initialPageSize?: number;
  initialFilters?: InsuranceConfigFilters;
  autoLoad?: boolean;
}

export function useInsuranceConfigs(options: UseInsuranceConfigsOptions = {}) {
  const {
    initialPage = 0,
    initialPageSize = 20,
    initialFilters = {},
    autoLoad = true
  } = options;

  const [data, setData] = useState<InsuranceConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<InsuranceConfigFilters>(initialFilters);
  
  const { showToast } = useToast();

  // 获取配置列表
  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response: InsuranceConfigListResponse = await InsuranceConfigAPI.getInsuranceConfigs(
        page,
        pageSize,
        filters
      );
      
      setData(response.data);
      setTotal(response.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取五险一金配置失败';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, showToast]);

  // 创建配置
  const createConfig = useCallback(async (configData: Omit<InsuranceConfig, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    try {
      const newConfig = await InsuranceConfigAPI.createInsuranceConfig(configData);
      setData(prev => [newConfig, ...prev]);
      setTotal(prev => prev + 1);
      showToast('五险一金配置创建成功', 'success');
      return newConfig;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建五险一金配置失败';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // 更新配置
  const updateConfig = useCallback(async (id: string, configData: Partial<InsuranceConfig>) => {
    setLoading(true);
    try {
      const updatedConfig = await InsuranceConfigAPI.updateInsuranceConfig(id, configData);
      setData(prev => prev.map(config => 
        config.id === id ? updatedConfig : config
      ));
      showToast('五险一金配置更新成功', 'success');
      return updatedConfig;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新五险一金配置失败';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // 删除配置
  const deleteConfig = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await InsuranceConfigAPI.deleteInsuranceConfig(id);
      setData(prev => prev.filter(config => config.id !== id));
      setTotal(prev => prev - 1);
      showToast('五险一金配置删除成功', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除五险一金配置失败';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // 批量删除配置
  const bulkDeleteConfigs = useCallback(async (ids: string[]) => {
    setLoading(true);
    try {
      await InsuranceConfigAPI.bulkDeleteInsuranceConfigs(ids);
      setData(prev => prev.filter(config => !ids.includes(config.id)));
      setTotal(prev => prev - ids.length);
      showToast(`成功删除 ${ids.length} 个配置`, 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '批量删除配置失败';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // 切换配置状态
  const toggleConfigStatus = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const updatedConfig = await InsuranceConfigAPI.toggleInsuranceConfigStatus(id);
      setData(prev => prev.map(config => 
        config.id === id ? updatedConfig : config
      ));
      showToast(`配置已${updatedConfig.is_active ? '启用' : '停用'}`, 'success');
      return updatedConfig;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '状态更新失败';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // 搜索配置
  const searchConfigs = useCallback(async (searchTerm: string, limit = 10) => {
    try {
      const results = await InsuranceConfigAPI.searchInsuranceConfigs(searchTerm, limit);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '搜索配置失败';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return [];
    }
  }, [showToast]);

  // 获取统计信息
  const getStats = useCallback(async () => {
    try {
      const stats = await InsuranceConfigAPI.getInsuranceConfigStats();
      return stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取统计信息失败';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return null;
    }
  }, [showToast]);

  // 验证配置代码唯一性
  const validateConfigCode = useCallback(async (code: string, excludeId?: string) => {
    try {
      return await InsuranceConfigAPI.validateConfigCode(code, excludeId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '验证失败';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return false;
    }
  }, [showToast]);

  // 获取人员类别选项
  const getPersonnelCategoryOptions = useCallback(async () => {
    try {
      return await InsuranceConfigAPI.getPersonnelCategoryOptions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取人员类别选项失败';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return [];
    }
  }, [showToast]);

  // 获取险种代码选项
  const getInsuranceCodeOptions = useCallback(async () => {
    try {
      return await InsuranceConfigAPI.getInsuranceCodeOptions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取险种代码选项失败';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return [];
    }
  }, [showToast]);

  // 获取人员类别树形结构
  const getPersonnelCategoryTree = useCallback(async () => {
    try {
      return await InsuranceConfigAPI.getPersonnelCategoryTree();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取人员类别树形结构失败';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return [];
    }
  }, [showToast]);

  // 分页控制
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0); // 重置到第一页
  }, []);

  // 过滤控制
  const updateFilters = useCallback((newFilters: Partial<InsuranceConfigFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(0); // 重置到第一页
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setPage(0);
  }, []);

  // 刷新数据
  const refresh = useCallback(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // 重置状态
  const reset = useCallback(() => {
    setData([]);
    setError(null);
    setPage(initialPage);
    setPageSize(initialPageSize);
    setFilters(initialFilters);
    setTotal(0);
  }, [initialPage, initialPageSize, initialFilters]);

  // 自动加载数据
  useEffect(() => {
    if (autoLoad) {
      fetchConfigs();
    }
  }, [fetchConfigs, autoLoad]);

  // 实时订阅数据变更
  useEffect(() => {
    let subscription: any = null;
    let isSubscribed = true;

    const setupSubscription = async () => {
      try {
        subscription = InsuranceConfigAPI.subscribeToInsuranceConfigs((payload) => {
          // Check if component is still mounted
          if (!isSubscribed) return;
          
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          switch (eventType) {
            case 'INSERT':
              if (newRecord) {
                setData(prev => {
                  // Avoid duplicates
                  if (prev.some(config => config.id === newRecord.id)) {
                    return prev;
                  }
                  return [newRecord, ...prev];
                });
                setTotal(prev => prev + 1);
              }
              break;
              
            case 'UPDATE':
              if (newRecord) {
                setData(prev => prev.map(config => 
                  config.id === newRecord.id ? newRecord : config
                ));
              }
              break;
              
            case 'DELETE':
              if (oldRecord) {
                setData(prev => prev.filter(config => config.id !== oldRecord.id));
                setTotal(prev => Math.max(0, prev - 1));
              }
              break;
          }
        });
      } catch (error) {
        console.error('Failed to setup subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      isSubscribed = false;
      if (subscription) {
        InsuranceConfigAPI.unsubscribeFromInsuranceConfigs(subscription);
      }
    };
  }, []);

  return {
    // 数据状态
    data,
    loading,
    error,
    total,
    page,
    pageSize,
    filters,

    // 数据操作
    createConfig,
    updateConfig,
    deleteConfig,
    bulkDeleteConfigs,
    toggleConfigStatus,
    searchConfigs,
    getStats,
    validateConfigCode,
    getPersonnelCategoryOptions,
    getInsuranceCodeOptions,
    getPersonnelCategoryTree,

    // 分页控制
    handlePageChange,
    handlePageSizeChange,

    // 过滤控制
    updateFilters,
    clearFilters,

    // 工具方法
    refresh,
    reset,
    fetchConfigs,

    // 分页信息
    pagination: {
      pageIndex: page,
      pageSize,
      total,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    },

    // 过滤信息
    filterState: {
      filters,
      updateFilters,
      clearFilters,
    },
  };
}

// 获取单个配置的Hook
export function useInsuranceConfig(id: string | null) {
  const [config, setConfig] = useState<InsuranceConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { showToast } = useToast();

  const fetchConfig = useCallback(async () => {
    if (!id) {
      setConfig(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const configData = await InsuranceConfigAPI.getInsuranceConfig(id);
      setConfig(configData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取配置详情失败';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    loading,
    error,
    refresh: fetchConfig,
  };
}