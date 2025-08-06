import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Supabase Realtime 连接状态监控钩子
 * 用于监控实时连接的状态和管理连接生命周期
 */
export function useRealtimeConnection() {
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'OPEN' | 'CLOSED' | 'ERROR'>('CONNECTING');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log('[Realtime] Initializing connection monitor...');

    // 使用现代 Supabase realtime API
    const channel = supabase
      .channel('connection-monitor')
      .on('system', { event: 'connect' }, () => {
        console.log('[Realtime] Connected successfully');
        setConnectionStatus('OPEN');
        setIsConnected(true);
      })
      .on('system', { event: 'disconnect' }, () => {
        console.log('[Realtime] Disconnected');
        setConnectionStatus('CLOSED');
        setIsConnected(false);
      })
      .on('system', { event: 'error' }, (error: any) => {
        console.error('[Realtime] Connection error:', error);
        setConnectionStatus('ERROR');
        setIsConnected(false);
      });

    // 订阅频道
    channel.subscribe();

    // 检查初始连接状态
    const checkInitialStatus = () => {
      // 设置初始状态为连接中
      setConnectionStatus('CONNECTING');
      setIsConnected(false);
    };

    checkInitialStatus();

    // 清理监听器
    return () => {
      console.log('[Realtime] Cleaning up connection monitor...');
      channel.unsubscribe();
    };
  }, []);

  return {
    connectionStatus,
    isConnected,
    reconnect: () => {
      console.log('[Realtime] Manual reconnection requested...');
      supabase.realtime.disconnect();
      setTimeout(() => {
        supabase.realtime.connect();
      }, 1000);
    }
  };
}

/**
 * Realtime 连接状态指示器组件数据
 */
export function useRealtimeIndicator() {
  const { connectionStatus, isConnected, reconnect } = useRealtimeConnection();

  const getIndicatorProps = () => {
    switch (connectionStatus) {
      case 'OPEN':
        return {
          color: 'success' as const,
          text: '实时连接正常',
          icon: '🟢',
          pulse: false,
        };
      case 'CONNECTING':
        return {
          color: 'warning' as const,
          text: '正在连接...',
          icon: '🟡',
          pulse: true,
        };
      case 'CLOSED':
        return {
          color: 'error' as const,
          text: '连接已断开',
          icon: '🔴',
          pulse: false,
        };
      case 'ERROR':
        return {
          color: 'error' as const,
          text: '连接错误',
          icon: '⚠️',
          pulse: false,
        };
      default:
        return {
          color: 'neutral' as const,
          text: '未知状态',
          icon: '⚫',
          pulse: false,
        };
    }
  };

  return {
    connectionStatus,
    isConnected,
    reconnect,
    indicator: getIndicatorProps(),
  };
}