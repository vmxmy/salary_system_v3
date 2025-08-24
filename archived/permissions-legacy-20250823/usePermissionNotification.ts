/**
 * 权限通知管理 Hook
 * 
 * 功能特性：
 * - 实时通知接收
 * - 通知状态管理
 * - 批量操作支持
 * - 通知类型过滤
 * - 自动标记已读
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/lib/supabase';
import type {
  NotificationItem,
  UsePermissionNotificationReturn
} from '@/types/permission-request';

/**
 * 权限通知管理 Hook
 */
export function usePermissionNotification(): UsePermissionNotificationReturn {
  const { user } = useUnifiedAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 使用 ref 避免无限重渲染
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 获取通知列表
  const getNotifications = useCallback(async (limit: number = 50): Promise<NotificationItem[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
      }

      const notificationItems: NotificationItem[] = data.map(item => ({
        id: item.id,
        user_id: item.user_id,
        type: item.type as NotificationItem['type'],
        title: item.title,
        message: item.message,
        is_read: item.is_read,
        created_at: item.created_at,
        metadata: item.metadata as NotificationItem['metadata']
      }));

      setNotifications(notificationItems);
      
      // 更新未读数量
      const unreadCount = notificationItems.filter(n => !n.is_read).length;
      setUnreadCount(unreadCount);

      return notificationItems;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch notifications');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 获取未读数量
  const getUnreadCount = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      const { count, error } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.warn('Failed to fetch unread count:', error);
        return 0;
      }

      const unreadCount = count || 0;
      setUnreadCount(unreadCount);
      return unreadCount;

    } catch (error) {
      console.warn('Error fetching unread count:', error);
      return 0;
    }
  }, [user]);

  // 标记为已读
  const markAsRead = useCallback(async (notificationIds: string[]): Promise<boolean> => {
    if (!user || notificationIds.length === 0) {
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('user_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', notificationIds)
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(`Failed to mark notifications as read: ${updateError.message}`);
      }

      // 更新本地状态
      setNotifications(prev => 
        prev.map(notification =>
          notificationIds.includes(notification.id)
            ? { ...notification, is_read: true }
            : notification
        )
      );

      // 更新未读数量
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));

      console.log(`[usePermissionNotification] Marked ${notificationIds.length} notifications as read`);
      return true;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to mark notifications as read');
      setError(error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 标记所有为已读
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!user) {
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('user_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (updateError) {
        throw new Error(`Failed to mark all notifications as read: ${updateError.message}`);
      }

      // 更新本地状态
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );

      setUnreadCount(0);

      console.log('[usePermissionNotification] Marked all notifications as read');
      return true;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to mark all notifications as read');
      setError(error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 删除通知
  const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!user) {
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error(`Failed to delete notification: ${deleteError.message}`);
      }

      // 更新本地状态
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      // 如果删除的是未读通知，更新未读数量
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      console.log(`[usePermissionNotification] Deleted notification: ${notificationId}`);
      return true;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete notification');
      setError(error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, notifications]);

  // 刷新通知
  const refreshNotifications = useCallback(async (): Promise<void> => {
    await getNotifications();
  }, [getNotifications]);

  // 自动标记已读（延迟执行）
  const autoMarkAsRead = useCallback((notificationIds: string[]) => {
    // 清除之前的定时器
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }

    // 延迟5秒后自动标记为已读
    markAsReadTimeoutRef.current = setTimeout(() => {
      const unreadIds = notificationIds.filter(id => {
        const notification = notifications.find(n => n.id === id);
        return notification && !notification.is_read;
      });

      if (unreadIds.length > 0) {
        markAsRead(unreadIds);
      }
    }, 5000);
  }, [notifications, markAsRead]);

  // 初始化数据加载
  useEffect(() => {
    if (user) {
      getNotifications();
      getUnreadCount();
    }
  }, [user, getNotifications, getUnreadCount]);

  // 实时通知监听
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('user_notifications_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('[usePermissionNotification] New notification received:', payload);
        
        const newNotification: NotificationItem = {
          id: payload.new.id,
          user_id: payload.new.user_id,
          type: payload.new.type,
          title: payload.new.title,
          message: payload.new.message,
          is_read: payload.new.is_read,
          created_at: payload.new.created_at,
          metadata: payload.new.metadata
        };

        // 添加到通知列表顶部
        setNotifications(prev => [newNotification, ...prev]);
        
        // 如果是未读通知，更新未读数量
        if (!newNotification.is_read) {
          setUnreadCount(prev => prev + 1);
        }

        // 显示浏览器通知（如果用户允许）
        showBrowserNotification(newNotification);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('[usePermissionNotification] Notification updated:', payload);
        
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === payload.new.id
              ? {
                  ...notification,
                  is_read: payload.new.is_read,
                  title: payload.new.title,
                  message: payload.new.message,
                  metadata: payload.new.metadata
                }
              : notification
          )
        );

        // 如果状态从未读变为已读，更新未读数量
        if (!payload.old.is_read && payload.new.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('[usePermissionNotification] Notification deleted:', payload);
        
        setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        
        // 如果删除的是未读通知，更新未读数量
        if (!payload.old.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }
    };
  }, []);

  return {
    // 通知获取
    getNotifications,
    getUnreadCount,
    
    // 通知操作
    markAsRead,
    markAllAsRead,
    deleteNotification,
    
    // 状态数据
    notifications,
    unreadCount,
    loading,
    error,
    
    // 刷新
    refreshNotifications
  };
}

// 工具函数 - 显示浏览器通知
async function showBrowserNotification(notification: NotificationItem): Promise<void> {
  // 检查通知权限
  if (Notification.permission === 'granted') {
    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: false,
        silent: false
      });

      // 点击通知时的处理
      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
        
        // 如果有跳转链接，进行页面跳转
        if (notification.metadata?.action_url) {
          window.location.href = notification.metadata.action_url;
        }
      };

      // 自动关闭通知
      setTimeout(() => {
        browserNotification.close();
      }, 5000);

    } catch (error) {
      console.warn('Failed to show browser notification:', error);
    }
  } else if (Notification.permission === 'default') {
    // 请求通知权限
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        showBrowserNotification(notification);
      }
    } catch (error) {
      console.warn('Failed to request notification permission:', error);
    }
  }
}

// 通知工具函数
export const notificationUtils = {
  /**
   * 获取通知类型显示名称
   */
  getTypeDisplayName(type: NotificationItem['type']): string {
    const typeNames: Record<NotificationItem['type'], string> = {
      'request_approved': '申请已批准',
      'request_denied': '申请被拒绝',
      'request_expired': '申请已过期',
      'permission_expiring': '权限即将过期',
      'new_request': '新的权限申请',
      'approval_deadline': '审批即将截止'
    };
    return typeNames[type] || type;
  },

  /**
   * 获取通知类型图标
   */
  getTypeIcon(type: NotificationItem['type']): string {
    const typeIcons: Record<NotificationItem['type'], string> = {
      'request_approved': '✅',
      'request_denied': '❌',
      'request_expired': '⏰',
      'permission_expiring': '⚠️',
      'new_request': '📋',
      'approval_deadline': '🚨'
    };
    return typeIcons[type] || '📢';
  },

  /**
   * 获取通知优先级
   */
  getPriority(type: NotificationItem['type']): 'low' | 'medium' | 'high' | 'urgent' {
    const typePriorities: Record<NotificationItem['type'], 'low' | 'medium' | 'high' | 'urgent'> = {
      'request_approved': 'medium',
      'request_denied': 'medium',
      'request_expired': 'low',
      'permission_expiring': 'high',
      'new_request': 'medium',
      'approval_deadline': 'urgent'
    };
    return typePriorities[type] || 'low';
  },

  /**
   * 格式化相对时间
   */
  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 30) return `${diffDays}天前`;
    
    return date.toLocaleDateString('zh-CN');
  },

  /**
   * 检查通知是否需要立即关注
   */
  requiresImmediateAttention(notification: NotificationItem): boolean {
    const urgentTypes: NotificationItem['type'][] = [
      'approval_deadline',
      'permission_expiring'
    ];
    
    return urgentTypes.includes(notification.type);
  }
};