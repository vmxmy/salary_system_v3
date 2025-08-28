import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { getOptimizedConfig } from '@/lib/performanceConfig';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * 优化的Realtime订阅配置
 */
interface OptimizedRealtimeConfig {
  /** 表名列表 */
  tables: string[];
  /** 是否启用订阅 */
  enabled?: boolean;
  /** 连接稳定性配置 */
  stability?: {
    reconnectDelay?: number;
    maxReconnectAttempts?: number;
    heartbeatInterval?: number;
  };
  /** 缓存失效策略 */
  cacheInvalidation?: {
    queryKeys: string[][];
    debounceMs?: number;
  };
  /** 事件回调 */
  onEvent?: (event: string, payload: any, table: string) => void;
}

/**
 * 全局Realtime连接池
 * 避免重复创建连接
 */
class RealtimeConnectionPool {
  private static instance: RealtimeConnectionPool;
  private connections: Map<string, RealtimeChannel> = new Map();
  private subscribers: Map<string, Set<string>> = new Map();
  private config = getOptimizedConfig();

  public static getInstance(): RealtimeConnectionPool {
    if (!RealtimeConnectionPool.instance) {
      RealtimeConnectionPool.instance = new RealtimeConnectionPool();
    }
    return RealtimeConnectionPool.instance;
  }

  /**
   * 订阅表变化
   */
  subscribe(
    subscriptionId: string,
    tables: string[],
    callback: (event: string, payload: any, table: string) => void
  ): () => void {
    const channelName = `unified-${tables.join('-')}`;
    
    // 添加订阅者
    if (!this.subscribers.has(channelName)) {
      this.subscribers.set(channelName, new Set());
    }
    this.subscribers.get(channelName)!.add(subscriptionId);

    // 如果连接不存在，创建新连接
    if (!this.connections.has(channelName)) {
      this.createConnection(channelName, tables, callback);
    }

    console.log(`[RealtimePool] Subscribed ${subscriptionId} to ${channelName}`);

    // 返回取消订阅函数
    return () => this.unsubscribe(subscriptionId, channelName);
  }

  /**
   * 取消订阅
   */
  private unsubscribe(subscriptionId: string, channelName: string): void {
    const subscribers = this.subscribers.get(channelName);
    if (subscribers) {
      subscribers.delete(subscriptionId);
      
      // 如果没有订阅者了，关闭连接
      if (subscribers.size === 0) {
        this.closeConnection(channelName);
      }
    }
    
    console.log(`[RealtimePool] Unsubscribed ${subscriptionId} from ${channelName}`);
  }

  /**
   * 创建连接
   */
  private createConnection(
    channelName: string,
    tables: string[],
    callback: (event: string, payload: any, table: string) => void
  ): void {
    const channel = supabase.channel(channelName);

    // 监听数据库变化
    tables.forEach(table => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          console.log(`[RealtimePool] Event on ${table}:`, payload.eventType);
          callback(payload.eventType, payload, table);
        }
      );
    });

    // 监听连接状态
    channel.on('system', {}, (payload) => {
      console.log(`[RealtimePool] System event on ${channelName}:`, payload);
    });

    // 订阅并存储连接
    channel.subscribe((status) => {
      console.log(`[RealtimePool] Connection ${channelName} status:`, status);
      
      if (status === 'SUBSCRIBED') {
        console.log(`[RealtimePool] Successfully connected to ${channelName}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[RealtimePool] Connection error for ${channelName}`);
        // 重连逻辑
        setTimeout(() => {
          this.reconnectConnection(channelName, tables, callback);
        }, this.config.realtime.reconnectDelay);
      }
    });

    this.connections.set(channelName, channel);
  }

  /**
   * 重连连接
   */
  private reconnectConnection(
    channelName: string,
    tables: string[],
    callback: (event: string, payload: any, table: string) => void
  ): void {
    console.log(`[RealtimePool] Reconnecting ${channelName}...`);
    this.closeConnection(channelName);
    this.createConnection(channelName, tables, callback);
  }

  /**
   * 关闭连接
   */
  private closeConnection(channelName: string): void {
    const connection = this.connections.get(channelName);
    if (connection) {
      connection.unsubscribe();
      this.connections.delete(channelName);
      this.subscribers.delete(channelName);
      console.log(`[RealtimePool] Closed connection ${channelName}`);
    }
  }

  /**
   * 清理所有连接
   */
  cleanup(): void {
    this.connections.forEach((connection, channelName) => {
      connection.unsubscribe();
    });
    this.connections.clear();
    this.subscribers.clear();
    console.log(`[RealtimePool] All connections cleaned up`);
  }
}

/**
 * 优化的Realtime Hook
 * 使用连接池避免重复连接，支持智能缓存失效
 */
export function useOptimizedRealtime(config: OptimizedRealtimeConfig) {
  const queryClient = useQueryClient();
  const { user } = useUnifiedAuth();
  const connectionPool = useMemo(() => RealtimeConnectionPool.getInstance(), []);
  const subscriptionIdRef = useRef(`sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const performanceConfig = getOptimizedConfig();
  
  // 防抖的缓存失效函数
  const debouncedInvalidation = useRef<NodeJS.Timeout | undefined>(undefined);
  const invalidateCache = useCallback((table: string) => {
    if (debouncedInvalidation.current) {
      clearTimeout(debouncedInvalidation.current);
    }

    debouncedInvalidation.current = setTimeout(() => {
      if (config.cacheInvalidation?.queryKeys) {
        config.cacheInvalidation.queryKeys.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
        console.log(`[OptimizedRealtime] Cache invalidated for ${table}`);
      }
    }, config.cacheInvalidation?.debounceMs || performanceConfig.realtime.eventBufferTime);
  }, [queryClient, config.cacheInvalidation, performanceConfig.realtime.eventBufferTime]);

  // 事件处理函数
  const handleRealtimeEvent = useCallback((
    event: string,
    payload: any,
    table: string
  ) => {
    // 调用用户回调
    config.onEvent?.(event, payload, table);
    
    // 智能缓存失效
    invalidateCache(table);
    
    console.log(`[OptimizedRealtime] Handled ${event} on ${table}`);
  }, [config.onEvent, invalidateCache]);

  useEffect(() => {
    // 只有用户登录且配置启用时才订阅
    if (!user || !config.enabled || config.tables.length === 0) {
      return;
    }

    const subscriptionId = subscriptionIdRef.current;
    
    // 订阅Realtime事件
    const unsubscribe = connectionPool.subscribe(
      subscriptionId,
      config.tables,
      handleRealtimeEvent
    );

    console.log(`[OptimizedRealtime] Initialized for tables:`, config.tables);

    // 清理函数
    return () => {
      unsubscribe();
      if (debouncedInvalidation.current) {
        clearTimeout(debouncedInvalidation.current);
      }
    };
  }, [
    user,
    config.enabled,
    config.tables,
    connectionPool,
    handleRealtimeEvent,
  ]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (debouncedInvalidation.current) {
        clearTimeout(debouncedInvalidation.current);
      }
    };
  }, []);

  return {
    // 手动刷新缓存
    refreshCache: useCallback(() => {
      if (config.cacheInvalidation?.queryKeys) {
        config.cacheInvalidation.queryKeys.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
    }, [queryClient, config.cacheInvalidation]),

    // 获取连接状态
    isConnected: true, // 简化版，实际可以从连接池获取状态
  };
}

/**
 * 用于薪资页面的优化Realtime Hook
 */
export function usePayrollRealtime(enabled = true) {
  return useOptimizedRealtime({
    tables: ['payrolls', 'payroll_items', 'payroll_periods'],
    enabled,
    cacheInvalidation: {
      queryKeys: [
        ['payroll-list'],
        ['payroll-statistics'], 
        ['payroll-data'],
      ],
      debounceMs: 300, // 300ms防抖
    },
    onEvent: (event, payload, table) => {
      console.log(`[PayrollRealtime] ${event} on ${table}:`, payload.new || payload.old);
    },
  });
}

/**
 * 用于员工页面的优化Realtime Hook  
 */
export function useEmployeeRealtime(enabled = true) {
  return useOptimizedRealtime({
    tables: ['employees', 'employee_job_history', 'departments'],
    enabled,
    cacheInvalidation: {
      queryKeys: [
        ['employee-list'],
        ['employee-data'],
        ['department-data'],
      ],
      debounceMs: 200,
    },
  });
}

// 应用关闭时清理连接池
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    RealtimeConnectionPool.getInstance().cleanup();
  });
}