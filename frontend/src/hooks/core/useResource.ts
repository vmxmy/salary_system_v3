import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { useCallback, useMemo, useEffect } from 'react';
import { useErrorHandler } from './useErrorHandler';
import { useLoadingState } from './useLoadingState';
import { supabase } from '@/lib/supabase';

/**
 * 资源服务接口定义
 */
export interface ResourceService<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  /** 获取所有资源 */
  getAll: () => Promise<T[]>;
  /** 根据ID获取单个资源 */
  getById: (id: string) => Promise<T | null>;
  /** 创建新资源 */
  create: (data: TCreate) => Promise<T>;
  /** 更新资源 */
  update: (id: string, data: TUpdate) => Promise<T>;
  /** 删除资源 */
  delete: (id: string) => Promise<void>;
}

/**
 * Supabase表配置
 */
export interface SupabaseTableConfig<T> {
  /** 表名 */
  tableName: string;
  /** 视图名（用于查询，可选） */
  viewName?: string;
  /** 主键字段名 */
  idField?: string;
  /** 选择字段 */
  selectFields?: string;
  /** 排序字段 */
  orderBy?: { column: string; ascending?: boolean };
  /** 数据转换函数 */
  transform?: (data: any) => T;
}

/**
 * 通用资源Hook配置选项
 */
export interface UseResourceOptions<T> {
  /** 查询键 */
  queryKey: QueryKey;
  /** 资源服务 */
  service?: ResourceService<T>;
  /** Supabase表配置 */
  tableConfig?: SupabaseTableConfig<T>;
  /** 缓存时间（毫秒） */
  staleTime?: number;
  /** 是否启用实时订阅 */
  enableRealtime?: boolean;
  /** 错误处理选项 */
  errorOptions?: {
    showToast?: boolean;
    customMessage?: string;
  };
  /** 成功操作后的提示消息 */
  successMessages?: {
    create?: string;
    update?: string;
    delete?: string;
  };
}

/**
 * 创建基于Supabase的资源服务
 */
function createSupabaseService<T>(config: SupabaseTableConfig<T>): ResourceService<T> {
  const {
    tableName,
    viewName,
    idField = 'id',
    selectFields = '*',
    orderBy,
    transform = (data) => data
  } = config;

  const queryTable = viewName || tableName;

  return {
    async getAll(): Promise<T[]> {
      let query = supabase.from(queryTable).select(selectFields);
      
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(transform);
    },

    async getById(id: string): Promise<T | null> {
      const { data, error } = await supabase
        .from(queryTable)
        .select(selectFields)
        .eq(idField, id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // 数据不存在
        throw error;
      }
      
      return data ? transform(data) : null;
    },

    async create(createData: Partial<T>): Promise<T> {
      const { data, error } = await supabase
        .from(tableName)
        .insert(createData)
        .select(selectFields)
        .single();
      
      if (error) throw error;
      return transform(data);
    },

    async update(id: string, updateData: Partial<T>): Promise<T> {
      const { data, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq(idField, id)
        .select(selectFields)
        .single();
      
      if (error) throw error;
      return transform(data);
    },

    async delete(id: string): Promise<void> {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq(idField, id);
      
      if (error) throw error;
    }
  };
}

/**
 * 通用资源管理Hook
 * 提供完整的CRUD操作和状态管理
 */
export function useResource<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  options: UseResourceOptions<T>
) {
  const {
    queryKey,
    service,
    tableConfig,
    staleTime = 5 * 60 * 1000, // 5分钟默认缓存
    enableRealtime = false,
    errorOptions = { showToast: true },
    successMessages = {
      create: '创建成功',
      update: '更新成功',
      delete: '删除成功'
    }
  } = options;

  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const { loadingState, setLoading } = useLoadingState();

  // 创建服务实例
  const resourceService = useMemo(() => {
    if (service) return service;
    if (tableConfig) return createSupabaseService(tableConfig);
    throw new Error('必须提供 service 或 tableConfig');
  }, [service, tableConfig]);

  // 获取资源列表
  const {
    data: rawItems = [],
    isLoading: isInitialLoading,
    isRefetching,
    error,
    refetch
  } = useQuery<T[]>({
    queryKey: queryKey,
    queryFn: resourceService.getAll,
    staleTime
  });

  // 类型安全的items
  const items = rawItems as T[];

  // 处理错误（替代onError）
  useEffect(() => {
    if (error) {
      handleError(error, errorOptions);
    }
  }, [error, handleError, errorOptions]);

  // 实时订阅（如果启用）
  useMemo(() => {
    if (!enableRealtime || !tableConfig) return;

    const channel = supabase
      .channel(`${tableConfig.tableName}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableConfig.tableName
        },
        (payload) => {
          console.log(`[Realtime] ${tableConfig.tableName} change:`, payload);
          // 重新获取数据
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [enableRealtime, tableConfig, queryClient, queryKey]);

  // 创建资源
  const createMutation = useMutation({
    mutationFn: resourceService.create,
    onMutate: () => setLoading('isCreating', true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      if (successMessages.create) {
        // 这里可以显示成功提示
        console.log(successMessages.create);
      }
    },
    onSettled: () => setLoading('isCreating', false)
  });

  // 更新资源
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TUpdate }) =>
      resourceService.update(id, data as Partial<T>),
    onMutate: () => setLoading('isUpdating', true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      if (successMessages.update) {
        console.log(successMessages.update);
      }
    },
    onSettled: () => setLoading('isUpdating', false)
  });

  // 删除资源
  const deleteMutation = useMutation({
    mutationFn: resourceService.delete,
    onMutate: () => setLoading('isDeleting', true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      if (successMessages.delete) {
        console.log(successMessages.delete);
      }
    },
    onSettled: () => setLoading('isDeleting', false)
  });

  // 批量删除
  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      setLoading('isBatchProcessing', true);
      const promises = ids.map(id => resourceService.delete(id));
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      console.log(`批量删除成功`);
    },
    onSettled: () => setLoading('isBatchProcessing', false)
  });

  // 获取单个资源的Hook工厂
  const createUseItem = useCallback((id: string) => {
    return useQuery<T | null>({
      queryKey: [...queryKey, 'detail', id],
      queryFn: () => resourceService.getById(id),
      enabled: !!id,
      staleTime,
    });
  }, [queryKey, resourceService, staleTime]);

  // 搜索和筛选功能
  const searchItems = useCallback((
    searchTerm: string,
    searchFields: (keyof T)[]
  ): T[] => {
    if (!searchTerm) return items;
    
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(term);
      })
    );
  }, [items]);

  // 排序功能
  const sortItems = useCallback((
    sortField: keyof T,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): T[] => {
    return [...items].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items]);

  return {
    // 数据
    items,
    
    // 状态
    loading: {
      isInitialLoading,
      isRefetching,
      isCreating: loadingState.isCreating,
      isUpdating: loadingState.isUpdating,
      isDeleting: loadingState.isDeleting,
      isBatchProcessing: loadingState.isBatchProcessing
    },
    error,
    
    // 操作
    actions: {
      create: createMutation.mutate,
      update: updateMutation.mutate,
      delete: deleteMutation.mutate,
      batchDelete: batchDeleteMutation.mutate,
      refresh: refetch
    },
    
    // 异步操作状态
    mutations: {
      create: createMutation,
      update: updateMutation,
      delete: deleteMutation,
      batchDelete: batchDeleteMutation
    },
    
    // 工具函数
    utils: {
      createUseItem,
      searchItems,
      sortItems
    }
  };
}

/**
 * 简化版资源Hook - 只读数据
 */
export function useResourceData<T>(
  queryKey: QueryKey,
  service: Pick<ResourceService<T>, 'getAll'>,
  options?: {
    staleTime?: number;
    enableRealtime?: boolean;
    tableName?: string;
  }
) {
  const { staleTime = 5 * 60 * 1000, enableRealtime = false, tableName } = options || {};
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey,
    queryFn: service.getAll,
    staleTime
  });

  // 实时订阅
  useMemo(() => {
    if (!enableRealtime || !tableName) return;

    const channel = supabase
      .channel(`${tableName}_readonly_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, [enableRealtime, tableName, queryClient, queryKey]);

  return query;
}