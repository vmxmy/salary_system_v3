import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Supabase Realtime 订阅配置
 */
interface RealtimeSubscriptionConfig {
  /** 表名 */
  table: string;
  /** 监听的事件类型 */
  events?: ('INSERT' | 'UPDATE' | 'DELETE')[];
  /** 监听的schema，默认为 public */
  schema?: string;
  /** 过滤条件 */
  filter?: string;
  /** 是否启用订阅 */
  enabled?: boolean;
}

/**
 * React Query 缓存失效配置
 */
interface CacheInvalidationConfig {
  /** 要失效的查询键模式 */
  queryKeys: string[][];
  /** 是否同时刷新数据 */
  refetch?: boolean;
  /** 自定义失效逻辑 */
  customInvalidation?: (payload: any, queryClient: any) => void;
}

/**
 * Realtime 事件处理配置
 */
interface RealtimeConfig {
  /** 订阅配置 */
  subscriptions: RealtimeSubscriptionConfig[];
  /** 缓存失效配置 */
  cacheInvalidation: CacheInvalidationConfig;
  /** 成功回调 */
  onSuccess?: (event: string, payload: any) => void;
  /** 错误回调 */
  onError?: (error: any) => void;
  /** 是否显示通知 */
  showNotifications?: boolean;
}

/**
 * 通用 Supabase Realtime Hook
 * 
 * 功能特性：
 * - 自动订阅/取消订阅数据库变更
 * - 智能缓存失效和数据刷新
 * - 认证状态感知
 * - 连接状态管理
 * - 错误处理和重连机制
 */
export function useSupabaseRealtime(config: RealtimeConfig) {
  const queryClient = useQueryClient();
  const { user } = useUnifiedAuth();
  const { showInfo, showError } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const {
    subscriptions,
    cacheInvalidation,
    onSuccess,
    onError,
    showNotifications = false
  } = config;

  // 处理数据库变更事件
  const handleDatabaseChange = useCallback(async (payload: any) => {
    const { eventType, table, new: newRecord, old: oldRecord } = payload;
    
    console.log(`[Realtime] ${eventType} event on ${table}:`, payload);

    try {
      // 执行缓存失效
      if (cacheInvalidation.customInvalidation) {
        cacheInvalidation.customInvalidation(payload, queryClient);
      } else {
        // 默认失效策略
        for (const queryKey of cacheInvalidation.queryKeys) {
          await queryClient.invalidateQueries({ 
            queryKey,
            exact: false // 支持前缀匹配
          });
          
          if (cacheInvalidation.refetch) {
            await queryClient.refetchQueries({ 
              queryKey,
              exact: false 
            });
          }
        }
      }

      // 显示通知
      if (showNotifications) {
        const messages = {
          INSERT: '新增数据',
          UPDATE: '数据已更新', 
          DELETE: '数据已删除'
        };
        showInfo(`${messages[eventType as keyof typeof messages] || '数据变更'}`);
      }

      // 执行成功回调
      onSuccess?.(eventType, payload);
      
    } catch (error) {
      console.error('[Realtime] Error handling database change:', error);
      onError?.(error);
      
      if (showNotifications) {
        showError('数据同步失败');
      }
    }
  }, [queryClient, cacheInvalidation, onSuccess, onError, showNotifications, showInfo, showError]);

  // 清理重连定时器
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // 订阅数据库变更
  const subscribe = useCallback(() => {
    if (!user || isSubscribedRef.current || !isMountedRef.current) return;

    console.log('[Realtime] Setting up subscriptions...');
    
    // 清理之前可能存在的重连定时器
    clearReconnectTimeout();

    // 创建频道
    const channelName = `payroll-realtime-${Date.now()}`;
    const channel = supabase.channel(channelName);

    // 为每个表设置订阅
    subscriptions.forEach(sub => {
      const {
        table,
        events = ['INSERT', 'UPDATE', 'DELETE'],
        schema = 'public',
        filter,
        enabled = true
      } = sub;

      if (!enabled) return;

      console.log(`[Realtime] Subscribing to ${schema}.${table} for events: ${events.join(', ')}`);

      // 设置postgres_changes监听
      channel.on(
        'postgres_changes',
        {
          event: '*', // 监听所有事件，在回调中过滤
          schema,
          table,
          ...(filter && { filter })
        },
        (payload) => {
          // 过滤事件类型
          if (events.includes(payload.eventType as any)) {
            handleDatabaseChange(payload);
          }
        }
      );
    });

    // 订阅频道
    channel.subscribe((status) => {
      console.log(`[Realtime] Subscription status: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Successfully subscribed to database changes');
        isSubscribedRef.current = true;
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime] Subscription error - this usually means tables are not enabled for Realtime');
        console.log('[Realtime] Make sure tables are added to supabase_realtime publication');
        console.warn('[Realtime] Falling back to manual refresh mode - data will update on user actions');
        
        onError?.(new Error('Realtime subscription failed - check table publication settings'));
        
        // 优雅降级：停用自动重连，改为手动刷新模式
        console.log('[Realtime] Disabling automatic reconnection to prevent error loops');
        // 不再尝试自动重连，避免错误循环
      } else if (status === 'TIMED_OUT') {
        console.warn('[Realtime] Subscription timed out, attempting reconnection...');
        if (isMountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              resubscribe();
            }
          }, 2000);
        }
      } else if (status === 'CLOSED') {
        console.log('[Realtime] Connection closed');
        isSubscribedRef.current = false;
        // 在正常卸载时不需要重连
      }
    });

    channelRef.current = channel;
  }, [user, subscriptions, handleDatabaseChange, onError, clearReconnectTimeout]);

  // 取消订阅
  const unsubscribe = useCallback(() => {
    // 清理重连定时器
    clearReconnectTimeout();
    
    if (channelRef.current) {
      console.log('[Realtime] Unsubscribing from database changes');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }
  }, [clearReconnectTimeout]);

  // 重新订阅
  const resubscribe = useCallback(() => {
    if (!isMountedRef.current) return;
    unsubscribe();
    setTimeout(() => {
      if (isMountedRef.current) {
        subscribe();
      }
    }, 1000); // 延迟重连
  }, [subscribe, unsubscribe]);

  // 设置组件挂载状态追踪
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearReconnectTimeout();
    };
  }, [clearReconnectTimeout]);

  // 设置订阅
  useEffect(() => {
    if (isMountedRef.current) {
      subscribe();
    }
    return unsubscribe;
  }, [subscribe, unsubscribe]);

  // 监听认证状态变化
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    if (!user && isSubscribedRef.current) {
      unsubscribe();
    } else if (user && !isSubscribedRef.current) {
      subscribe();
    }
  }, [user, subscribe, unsubscribe]);

  return {
    // 状态
    isSubscribed: isSubscribedRef.current,
    
    // 操作方法
    subscribe,
    unsubscribe,
    resubscribe,
    
    // 手动触发缓存失效
    invalidateCache: useCallback(async () => {
      for (const queryKey of cacheInvalidation.queryKeys) {
        await queryClient.invalidateQueries({ queryKey, exact: false });
      }
    }, [queryClient, cacheInvalidation.queryKeys]),
    
    // 手动刷新数据
    refetchData: useCallback(async () => {
      for (const queryKey of cacheInvalidation.queryKeys) {
        await queryClient.refetchQueries({ queryKey, exact: false });
      }
    }, [queryClient, cacheInvalidation.queryKeys])
  };
}

/**
 * 薪资管理专用 Realtime Hook
 * 预配置了薪资相关表的订阅
 */
export function usePayrollRealtime(options: {
  /** 是否启用订阅 */
  enabled?: boolean;
  /** 是否显示通知 */
  showNotifications?: boolean;
  /** 自定义成功回调 */
  onSuccess?: (event: string, payload: any) => void;
  /** 自定义错误回调 */
  onError?: (error: any) => void;
} = {}) {
  const { enabled = true, showNotifications = true, onSuccess, onError } = options;

  return useSupabaseRealtime({
    subscriptions: [
      {
        table: 'payrolls',
        events: ['INSERT', 'UPDATE', 'DELETE'],
        enabled
      },
      {
        table: 'payroll_items',
        events: ['INSERT', 'UPDATE', 'DELETE'],
        enabled
      },
      {
        table: 'employees',
        events: ['UPDATE'], // 员工信息更新
        enabled
      },
      {
        table: 'employee_category_assignments',
        events: ['INSERT', 'UPDATE', 'DELETE'], // 员工类别分配变更
        enabled
      },
      {
        table: 'employee_job_history', 
        events: ['INSERT', 'UPDATE', 'DELETE'], // 员工岗位变更
        enabled
      }
    ],
    cacheInvalidation: {
      queryKeys: [
        ['payrolls'], // 薪资查询 - 根查询键，会失效所有薪资相关缓存
        ['employees'], // 员工查询 - 根查询键，会失效所有员工相关缓存
        ['departments'], // 部门查询 - 根查询键，会失效所有部门相关缓存
        ['positions'], // 职位查询 - 根查询键，会失效所有职位相关缓存
        ['payroll-statistics'], // 统计查询
        ['payroll-approval-records'], // 审批记录查询
        ['payroll-approval-stats'], // 审批统计查询
        ['payroll-workflow-progress'], // 工作流进度查询
        ['insurance'] // 保险查询
      ],
      refetch: true
    },
    onSuccess,
    onError,
    showNotifications
  });
}

/**
 * 员工管理专用 Realtime Hook
 */
export function useEmployeeRealtime(options: {
  enabled?: boolean;
  showNotifications?: boolean;
  onSuccess?: (event: string, payload: any) => void;
  onError?: (error: any) => void;
} = {}) {
  const { enabled = true, showNotifications = false, onSuccess, onError } = options;

  return useSupabaseRealtime({
    subscriptions: [
      {
        table: 'employees',
        events: ['INSERT', 'UPDATE', 'DELETE'],
        enabled
      },
      {
        table: 'employee_category_assignments',
        events: ['INSERT', 'UPDATE', 'DELETE'],
        enabled
      },
      {
        table: 'employee_job_history',
        events: ['INSERT', 'UPDATE', 'DELETE'], 
        enabled
      },
      {
        table: 'departments',
        events: ['INSERT', 'UPDATE', 'DELETE'],
        enabled
      },
      {
        table: 'positions',
        events: ['INSERT', 'UPDATE', 'DELETE'],
        enabled
      }
    ],
    cacheInvalidation: {
      queryKeys: [
        ['employees'],
        ['departments'],
        ['positions'],
        ['employee-statistics']
      ],
      refetch: true
    },
    onSuccess,
    onError,
    showNotifications
  });
}