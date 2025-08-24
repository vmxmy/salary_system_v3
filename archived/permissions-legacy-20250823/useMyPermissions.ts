/**
 * 个人权限管理 Hook
 * 
 * 功能特性：
 * - 个人权限查看和管理
 * - 权限使用统计
 * - 智能权限推荐
 * - 通知设置管理
 * - 权限到期提醒
 */

import { useState, useEffect, useCallback } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/lib/supabase';
import type {
  MyPermissionInfo,
  PermissionRecommendation,
  NotificationSettings,
  UseMyPermissionsReturn
} from '@/types/permission-request';

/**
 * 个人权限管理 Hook
 */
export function useMyPermissions(): UseMyPermissionsReturn {
  const { user } = useUnifiedAuth();
  const [myPermissions, setMyPermissions] = useState<MyPermissionInfo[]>([]);
  const [recommendations, setRecommendations] = useState<PermissionRecommendation[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 获取我的权限
  const getMyPermissions = useCallback(async (): Promise<MyPermissionInfo[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      // 通过用户角色获取权限（基于实际数据库架构）
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          role,
          is_active,
          created_at
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (rolesError) {
        throw new Error(`Failed to fetch user roles: ${rolesError.message}`);
      }

      // 获取权限覆盖
      const { data: directPermissions, error: directError } = await supabase
        .from('user_permission_overrides')
        .select(`
          permission_id,
          granted_at,
          granted_by,
          expires_at,
          is_active,
          permissions!inner(
            permission_name,
            description
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (directError) {
        throw new Error(`Failed to fetch direct permissions: ${directError.message}`);
      }

      // 简化实现：暂时返回空的角色权限数组
      // 实际项目中需要根据用户角色查询对应的权限
      const rolePermissions: any[] = [];

      // 获取权限使用统计
      const permissionIds = [
        ...directPermissions.map(p => p.permission_id),
        ...rolePermissions.map(p => p.permission_id)
      ];

      const usageStats = await getPermissionUsageStats(permissionIds);

      // 合并权限信息
      const allPermissions: MyPermissionInfo[] = [
        // 直接授予的权限
        ...directPermissions.map(p => ({
          permission_id: p.permission_id,
          permission_name: (p.permissions as any)?.permission_name || 'Unknown Permission',
          permission_description: (p.permissions as any)?.description || '',
          granted_at: p.granted_at || new Date().toISOString(),
          granted_by: 'System', // 简化实现
          expires_at: p.expires_at || undefined,
          is_temporary: !!p.expires_at,
          source: 'direct' as const,
          usage_stats: usageStats[p.permission_id]
        })),
        // 角色权限（简化实现为空数组）
        // 实际项目中需要根据用户角色查询对应的权限
      ];

      // 去重（优先显示直接授予的权限）
      const uniquePermissions = allPermissions.reduce((acc, permission) => {
        const existing = acc.find(p => p.permission_id === permission.permission_id);
        if (!existing || permission.source === 'direct') {
          acc = acc.filter(p => p.permission_id !== permission.permission_id);
          acc.push(permission);
        }
        return acc;
      }, [] as MyPermissionInfo[]);

      // 按权限名称排序
      uniquePermissions.sort((a, b) => a.permission_name.localeCompare(b.permission_name));

      setMyPermissions(uniquePermissions);
      return uniquePermissions;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch permissions');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 获取权限使用统计
  const getPermissionUsage = useCallback(async (
    permissionId: string
  ): Promise<any> => {
    if (!user) return null;

    try {
      // 查询权限使用日志
      const { data, error } = await supabase
        .from('permission_usage_log')
        .select('*')
        .eq('permission_id', permissionId)
        .eq('user_id', user.id)
        .order('used_at', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('Error fetching permission usage:', error);
        return null;
      }

      // 分析使用模式
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentUsage = (data || []).filter(u => new Date(u.used_at) > lastMonth);

      return {
        total_usage: (data || []).length,
        recent_usage: recentUsage.length,
        last_used_at: (data || [])[0]?.used_at,
        usage_frequency: calculateUsageFrequency(recentUsage),
        common_actions: getCommonActions(data || []),
        usage_trend: getUsageTrend(data || [])
      };

    } catch (error) {
      console.warn('Error fetching permission usage:', error);
      return null;
    }
  }, [user]);

  // 获取权限推荐
  const getRecommendations = useCallback(async (): Promise<PermissionRecommendation[]> => {
    if (!user) return [];

    setLoading(true);

    try {
      // 简化实现：返回空推荐数组
      // 实际项目中需要实现复杂的推荐算法
      console.log('Mock: Generating permission recommendations');
      const similarUsers: any[] = [];
      const commonMissingPermissions = new Map<string, number>();

      // 获取推荐权限的详细信息
      const recommendedPermissionIds = Array.from(commonMissingPermissions.keys())
        .sort((a, b) => (commonMissingPermissions.get(b) || 0) - (commonMissingPermissions.get(a) || 0))
        .slice(0, 10);

      // 简化实现：直接返回空推荐
      const recommendations: PermissionRecommendation[] = [];

      setRecommendations(recommendations);
      return recommendations;

    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, myPermissions]);

  // 获取通知设置
  const getNotificationSettings = useCallback(async (): Promise<NotificationSettings> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // 如果没有设置记录，返回默认设置
        if (error.code === 'PGRST116') {
          const defaultSettings: NotificationSettings = {
            user_id: user.id,
            request_submitted: true,
            request_approved: true,
            request_denied: true,
            request_expired: true,
            permission_expiring: true,
            new_pending_requests: false,
            approval_deadline: false,
            email_notifications: true,
            in_app_notifications: true,
            sms_notifications: false
          };
          
          setNotificationSettings(defaultSettings);
          return defaultSettings;
        }
        
        throw new Error(`Failed to fetch notification settings: ${error.message}`);
      }

      const settings: NotificationSettings = {
        user_id: data.user_id,
        request_submitted: data.request_submitted,
        request_approved: data.request_approved,
        request_denied: data.request_denied,
        request_expired: data.request_expired,
        permission_expiring: data.permission_expiring,
        new_pending_requests: data.new_pending_requests,
        approval_deadline: data.approval_deadline,
        email_notifications: data.email_notifications,
        in_app_notifications: data.in_app_notifications,
        sms_notifications: data.sms_notifications
      };
      
      setNotificationSettings(settings);
      return settings;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get notification settings');
      setError(error);
      throw error;
    }
  }, [user]);

  // 更新通知设置
  const updateNotificationSettings = useCallback(async (
    settings: Partial<NotificationSettings>
  ): Promise<boolean> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const updateData = {
        ...settings,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          ...updateData
        });

      if (error) {
        throw new Error(`Failed to update notification settings: ${error.message}`);
      }

      // 更新本地状态
      setNotificationSettings(prev => prev ? { ...prev, ...settings } : null);

      console.log('[useMyPermissions] Notification settings updated');
      return true;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update notification settings');
      setError(error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 刷新数据
  const refreshPermissions = useCallback(async (): Promise<void> => {
    await getMyPermissions();
  }, [getMyPermissions]);

  const refreshRecommendations = useCallback(async (): Promise<void> => {
    await getRecommendations();
  }, [getRecommendations]);

  // 初始化数据
  useEffect(() => {
    if (user) {
      getMyPermissions();
      getNotificationSettings();
      getRecommendations();
    }
  }, [user, getMyPermissions, getNotificationSettings, getRecommendations]);

  // 权限到期提醒检查
  useEffect(() => {
    if (!myPermissions.length) return;

    const checkExpiringPermissions = () => {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const expiringPermissions = myPermissions.filter(p => 
        p.expires_at && 
        new Date(p.expires_at) <= threeDaysFromNow &&
        new Date(p.expires_at) > now
      );

      if (expiringPermissions.length > 0) {
        console.log('[useMyPermissions] Found expiring permissions:', expiringPermissions);
        // 这里可以触发通知
      }
    };

    checkExpiringPermissions();
    const interval = setInterval(checkExpiringPermissions, 24 * 60 * 60 * 1000); // 每天检查一次

    return () => clearInterval(interval);
  }, [myPermissions]);

  return {
    // 权限查看
    getMyPermissions,
    getPermissionUsage,
    
    // 权限推荐
    getRecommendations,
    
    // 通知设置
    getNotificationSettings,
    updateNotificationSettings,
    
    // 状态数据
    myPermissions,
    recommendations,
    notificationSettings,
    loading,
    error,
    
    // 刷新
    refreshPermissions,
    refreshRecommendations
  };
}

// 工具函数
async function getPermissionUsageStats(permissionIds: string[]): Promise<Record<string, any>> {
  if (permissionIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('permission_usage_log')
      .select('permission_id, used_at')
      .in('permission_id', permissionIds)
      .order('used_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch usage stats:', error);
      return {};
    }

    const stats: Record<string, any> = {};
    
    permissionIds.forEach(id => {
      const usage = data.filter(u => u.permission_id === id);
      
      stats[id] = {
        last_used_at: usage[0]?.used_at,
        usage_count: usage.length,
        usage_frequency: calculateUsageFrequency(usage)
      };
    });

    return stats;

  } catch (error) {
    console.warn('Error calculating usage stats:', error);
    return {};
  }
}

function calculateUsageFrequency(usage: any[]): 'never' | 'rare' | 'occasional' | 'frequent' {
  if (usage.length === 0) return 'never';
  
  const now = new Date();
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentUsage = usage.filter(u => new Date(u.used_at) > lastMonth).length;
  
  if (recentUsage === 0) return 'rare';
  if (recentUsage < 5) return 'occasional';
  return 'frequent';
}

function getCommonActions(usage: any[]): string[] {
  const actions = usage.map(u => u.action).filter(Boolean);
  const actionCounts = actions.reduce((acc, action) => {
    acc[action] = (acc[action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(actionCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([action]) => action);
}

function getUsageTrend(usage: any[]): 'increasing' | 'stable' | 'decreasing' {
  if (usage.length < 10) return 'stable';
  
  const now = new Date();
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousMonth = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  
  const recentUsage = usage.filter(u => {
    const date = new Date(u.used_at);
    return date > lastMonth;
  }).length;
  
  const previousUsage = usage.filter(u => {
    const date = new Date(u.used_at);
    return date > previousMonth && date <= lastMonth;
  }).length;
  
  if (recentUsage > previousUsage * 1.2) return 'increasing';
  if (recentUsage < previousUsage * 0.8) return 'decreasing';
  return 'stable';
}

function determineUsagePattern(permissionId: string, users: any[]): string {
  const usersWithPermission = users.filter(u => 
    u.user_permissions.some((up: any) => up.permission_id === permissionId)
  );
  
  const percentage = (usersWithPermission.length / users.length) * 100;
  
  if (percentage > 75) return '高频使用';
  if (percentage > 50) return '常规使用';
  if (percentage > 25) return '偶尔使用';
  return '少量使用';
}