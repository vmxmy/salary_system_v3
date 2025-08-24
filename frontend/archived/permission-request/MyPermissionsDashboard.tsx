/**
 * 个人权限仪表板组件
 * 
 * 功能特性：
 * - 权限概览
 * - 权限使用统计
 * - 到期提醒
 * - 权限推荐
 * - 快捷申请
 * - 通知设置
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useMyPermissions } from '@/hooks/permissions/useMyPermissions';
import { usePermissionRequest } from '@/hooks/permissions/usePermissionRequest';
import { usePermissionNotification } from '@/hooks/permissions/usePermissionNotification';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import type {
  MyPermissionInfo,
  PermissionRecommendation,
  NotificationSettings
} from '@/types/permission-request';

interface MyPermissionsDashboardProps {
  onRequestPermission?: (permissionId: string) => void;
  showRecommendations?: boolean;
  showNotificationSettings?: boolean;
}

export const MyPermissionsDashboard: React.FC<MyPermissionsDashboardProps> = ({
  onRequestPermission,
  showRecommendations = true,
  showNotificationSettings = true
}) => {
  const { t } = useTranslation();
  
  const {
    myPermissions,
    recommendations,
    notificationSettings,
    loading: permissionsLoading,
    error: permissionsError,
    getPermissionUsage,
    refreshPermissions,
    refreshRecommendations,
    updateNotificationSettings
  } = useMyPermissions();

  const {
    requestPermission,
    loading: requestLoading
  } = usePermissionRequest();

  const {
    notifications,
    unreadCount,
    markAllAsRead
  } = usePermissionNotification();

  // 状态管理
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions' | 'recommendations' | 'settings'>('overview');
  const [selectedPermission, setSelectedPermission] = useState<MyPermissionInfo | null>(null);
  const [usageDetails, setUsageDetails] = useState<any>(null);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [localNotificationSettings, setLocalNotificationSettings] = useState<NotificationSettings | null>(null);

  // 初始化本地设置
  useEffect(() => {
    if (notificationSettings) {
      setLocalNotificationSettings({ ...notificationSettings });
    }
  }, [notificationSettings]);

  // 权限分类统计
  const permissionStats = useMemo(() => {
    if (!myPermissions.length) return null;

    const total = myPermissions.length;
    const temporary = myPermissions.filter(p => p.is_temporary).length;
    const permanent = total - temporary;
    const expiringSoon = myPermissions.filter(p => {
      if (!p.expires_at) return false;
      const expiresAt = new Date(p.expires_at);
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      return expiresAt <= threeDaysFromNow;
    }).length;

    const bySource = myPermissions.reduce((acc, p) => {
      acc[p.source] = (acc[p.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentlyUsed = myPermissions.filter(p => {
      if (!p.usage_stats?.last_used_at) return false;
      const lastUsed = new Date(p.usage_stats.last_used_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return lastUsed >= weekAgo;
    }).length;

    return {
      total,
      temporary,
      permanent,
      expiringSoon,
      bySource,
      recentlyUsed
    };
  }, [myPermissions]);

  // 即将过期的权限
  const expiringPermissions = useMemo(() => {
    return myPermissions.filter(p => {
      if (!p.expires_at) return false;
      const expiresAt = new Date(p.expires_at);
      const now = new Date();
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      return expiresAt > now && expiresAt <= threeDaysFromNow;
    }).sort((a, b) => 
      new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime()
    );
  }, [myPermissions]);

  // 处理权限使用详情查看
  const handleViewUsage = useCallback(async (permission: MyPermissionInfo) => {
    setSelectedPermission(permission);
    
    try {
      const usage = await getPermissionUsage(permission.permission_id);
      setUsageDetails(usage);
      setShowUsageModal(true);
    } catch (error) {
      console.error('Failed to get usage details:', error);
      setShowUsageModal(true); // 即使失败也显示基本信息
    }
  }, [getPermissionUsage]);

  // 处理权限推荐申请
  const handleRequestRecommended = useCallback(async (recommendation: PermissionRecommendation) => {
    try {
      const reason = `基于系统推荐申请权限：${recommendation.reason}`;
      await requestPermission(recommendation.permission_id as any, undefined, reason);
      
      // 刷新推荐列表
      refreshRecommendations();
      
      // 通知父组件
      onRequestPermission?.(recommendation.permission_id);
    } catch (error) {
      console.error('Failed to request permission:', error);
    }
  }, [requestPermission, refreshRecommendations, onRequestPermission]);

  // 处理通知设置更新
  const handleUpdateNotificationSettings = useCallback(async () => {
    if (!localNotificationSettings) return;

    try {
      const success = await updateNotificationSettings(localNotificationSettings);
      if (success) {
        setShowNotificationModal(false);
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  }, [localNotificationSettings, updateNotificationSettings]);

  // 概览标签内容
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {permissionStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat bg-primary/10">
            <div className="stat-figure text-primary">
              🛡️
            </div>
            <div className="stat-title">总权限</div>
            <div className="stat-value text-primary">{permissionStats.total}</div>
            <div className="stat-desc">
              永久: {permissionStats.permanent} | 临时: {permissionStats.temporary}
            </div>
          </div>

          <div className="stat bg-warning/10">
            <div className="stat-figure text-warning">
              ⏰
            </div>
            <div className="stat-title">即将过期</div>
            <div className="stat-value text-warning">{permissionStats.expiringSoon}</div>
            <div className="stat-desc">3天内过期</div>
          </div>

          <div className="stat bg-success/10">
            <div className="stat-figure text-success">
              📊
            </div>
            <div className="stat-title">最近使用</div>
            <div className="stat-value text-success">{permissionStats.recentlyUsed}</div>
            <div className="stat-desc">7天内使用</div>
          </div>

          <div className="stat bg-info/10">
            <div className="stat-figure text-info">
              🔔
            </div>
            <div className="stat-title">未读通知</div>
            <div className="stat-value text-info">{unreadCount}</div>
            <div className="stat-desc">
              <button
                className="link link-info text-xs"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                标记已读
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 即将过期的权限 */}
      {expiringPermissions.length > 0 && (
        <div className="card bg-warning/5 border border-warning/20">
          <div className="card-body">
            <h3 className="card-title text-warning">
              ⚠️ 权限即将过期
            </h3>
            <div className="space-y-2">
              {expiringPermissions.slice(0, 3).map(permission => {
                const expiresAt = new Date(permission.expires_at!);
                const diffMs = expiresAt.getTime() - Date.now();
                const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
                
                return (
                  <div key={permission.permission_id} className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                    <div>
                      <div className="font-medium">{permission.permission_name}</div>
                      <div className="text-sm text-base-content/60">
                        {diffDays === 1 ? '明天过期' : `${diffDays}天后过期`}
                      </div>
                    </div>
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => onRequestPermission?.(permission.permission_id)}
                    >
                      申请延期
                    </button>
                  </div>
                );
              })}
              {expiringPermissions.length > 3 && (
                <div className="text-center">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setActiveTab('permissions')}
                  >
                    查看全部 {expiringPermissions.length} 个即将过期的权限
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 最近通知 */}
      {notifications.length > 0 && (
        <div className="card bg-base-100">
          <div className="card-body">
            <h3 className="card-title">最近通知</h3>
            <div className="space-y-2">
              {notifications.slice(0, 5).map(notification => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.is_read ? 'bg-base-200' : 'bg-info/5 border-info/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <p className="text-xs text-base-content/70 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-base-content/50 mt-1">
                        {new Date(notification.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <span className="badge badge-info badge-sm">新</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 权限列表标签内容
  const PermissionsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">我的权限 ({myPermissions.length})</h3>
        <button
          className="btn btn-ghost btn-sm"
          onClick={refreshPermissions}
          disabled={permissionsLoading}
        >
          🔄 刷新
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {myPermissions.map(permission => (
          <div
            key={permission.permission_id}
            className={`card bg-base-100 border ${
              permission.is_temporary ? 'border-warning/30' : 'border-base-300'
            }`}
          >
            <div className="card-body p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{permission.permission_name}</h4>
                  <p className="text-sm text-base-content/70 mt-1">
                    {permission.permission_description}
                  </p>
                  
                  <div className="flex gap-2 mt-2">
                    <span className={`badge badge-sm ${
                      permission.source === 'role' ? 'badge-info' : 
                      permission.source === 'direct' ? 'badge-success' : 'badge-neutral'
                    }`}>
                      {permission.source === 'role' ? '角色权限' : 
                       permission.source === 'direct' ? '直接授予' : '申请获得'}
                    </span>
                    
                    {permission.is_temporary && (
                      <span className="badge badge-warning badge-sm">临时</span>
                    )}
                  </div>

                  <div className="text-xs text-base-content/60 mt-2">
                    授予时间：{new Date(permission.granted_at).toLocaleDateString('zh-CN')}
                    <br />
                    授予人：{permission.granted_by}
                    {permission.expires_at && (
                      <>
                        <br />
                        过期时间：{new Date(permission.expires_at).toLocaleDateString('zh-CN')}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleViewUsage(permission)}
                  >
                    使用统计
                  </button>
                  
                  {permission.is_temporary && permission.expires_at && (
                    <button
                      className="btn btn-warning btn-xs"
                      onClick={() => onRequestPermission?.(permission.permission_id)}
                    >
                      申请延期
                    </button>
                  )}
                </div>
              </div>

              {/* 使用频率指示 */}
              {permission.usage_stats && (
                <div className="mt-2 pt-2 border-t border-base-300">
                  <div className="flex items-center justify-between text-xs">
                    <span>使用频率：</span>
                    <span className={`font-medium ${
                      permission.usage_stats.usage_frequency === 'frequent' ? 'text-success' :
                      permission.usage_stats.usage_frequency === 'occasional' ? 'text-warning' :
                      permission.usage_stats.usage_frequency === 'rare' ? 'text-error' : 'text-neutral'
                    }`}>
                      {getUsageFrequencyText(permission.usage_stats.usage_frequency)}
                    </span>
                  </div>
                  
                  {permission.usage_stats.last_used_at && (
                    <div className="text-xs text-base-content/60 mt-1">
                      最后使用：{new Date(permission.usage_stats.last_used_at).toLocaleDateString('zh-CN')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {myPermissions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-medium mb-2">暂无权限</h3>
          <p className="text-base-content/60 mb-4">您当前没有任何权限，请联系管理员或申请相关权限。</p>
          <button
            className="btn btn-primary"
            onClick={() => onRequestPermission?.('')}
          >
            申请权限
          </button>
        </div>
      )}
    </div>
  );

  // 推荐标签内容
  const RecommendationsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">权限推荐 ({recommendations.length})</h3>
        <button
          className="btn btn-ghost btn-sm"
          onClick={refreshRecommendations}
          disabled={permissionsLoading}
        >
          🔄 刷新
        </button>
      </div>

      {recommendations.length > 0 ? (
        <div className="space-y-3">
          {recommendations.map(recommendation => (
            <div key={recommendation.permission_id} className="card bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20">
              <div className="card-body p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{recommendation.permission_name}</h4>
                    <p className="text-sm text-base-content/70 mt-1">
                      {recommendation.reason}
                    </p>
                    <p className="text-sm mt-2">
                      使用模式：{recommendation.usage_pattern}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">推荐度：</span>
                        <progress
                          className="progress progress-primary w-20 h-2"
                          value={recommendation.confidence * 100}
                          max="100"
                        />
                        <span className="text-xs">{Math.round(recommendation.confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleRequestRecommended(recommendation)}
                    disabled={requestLoading}
                  >
                    申请权限
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">💡</div>
          <h3 className="text-lg font-medium mb-2">暂无推荐</h3>
          <p className="text-base-content/60">
            系统会根据您的角色和使用模式推荐合适的权限。
          </p>
        </div>
      )}
    </div>
  );

  // 设置标签内容
  const SettingsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">通知设置</h3>
      
      {localNotificationSettings ? (
        <div className="card bg-base-100">
          <div className="card-body">
            <h4 className="font-medium mb-4">权限通知偏好</h4>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">申请状态变更通知</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={localNotificationSettings.request_submitted}
                    onChange={(e) => setLocalNotificationSettings(prev => prev ? {
                      ...prev,
                      request_submitted: e.target.checked
                    } : null)}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">申请批准通知</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={localNotificationSettings.request_approved}
                    onChange={(e) => setLocalNotificationSettings(prev => prev ? {
                      ...prev,
                      request_approved: e.target.checked
                    } : null)}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">申请拒绝通知</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={localNotificationSettings.request_denied}
                    onChange={(e) => setLocalNotificationSettings(prev => prev ? {
                      ...prev,
                      request_denied: e.target.checked
                    } : null)}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">权限即将过期提醒</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={localNotificationSettings.permission_expiring}
                    onChange={(e) => setLocalNotificationSettings(prev => prev ? {
                      ...prev,
                      permission_expiring: e.target.checked
                    } : null)}
                  />
                </label>
              </div>

              <div className="divider">通知方式</div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">邮件通知</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={localNotificationSettings.email_notifications}
                    onChange={(e) => setLocalNotificationSettings(prev => prev ? {
                      ...prev,
                      email_notifications: e.target.checked
                    } : null)}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">应用内通知</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={localNotificationSettings.in_app_notifications}
                    onChange={(e) => setLocalNotificationSettings(prev => prev ? {
                      ...prev,
                      in_app_notifications: e.target.checked
                    } : null)}
                  />
                </label>
              </div>
            </div>

            <div className="card-actions justify-end mt-6">
              <button
                className="btn btn-primary"
                onClick={handleUpdateNotificationSettings}
                disabled={permissionsLoading}
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">加载设置中...</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 标签导航 */}
      <div className="tabs tabs-boxed">
        <button
          className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          概览
        </button>
        <button
          className={`tab ${activeTab === 'permissions' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          我的权限
        </button>
        {showRecommendations && (
          <button
            className={`tab ${activeTab === 'recommendations' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            权限推荐
          </button>
        )}
        {showNotificationSettings && (
          <button
            className={`tab ${activeTab === 'settings' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            通知设置
          </button>
        )}
      </div>

      {/* 标签内容 */}
      {permissionsLoading ? (
        <div className="text-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">加载中...</p>
        </div>
      ) : permissionsError ? (
        <div className="alert alert-error">
          <div>
            <h3 className="font-bold">加载失败</h3>
            <div className="text-sm">{permissionsError.message}</div>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'permissions' && <PermissionsTab />}
          {activeTab === 'recommendations' && showRecommendations && <RecommendationsTab />}
          {activeTab === 'settings' && showNotificationSettings && <SettingsTab />}
        </>
      )}

      {/* 使用详情模态框 */}
      <ConfirmModal
        isOpen={showUsageModal}
        onClose={() => setShowUsageModal(false)}
        onConfirm={() => setShowUsageModal(false)}
        title="权限使用详情"
        confirmText="关闭"
        confirmOnly
      >
        {selectedPermission && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">{selectedPermission.permission_name}</h4>
              <p className="text-sm text-base-content/70">
                {selectedPermission.permission_description}
              </p>
            </div>

            {usageDetails ? (
              <div className="space-y-3">
                <div className="stats stats-vertical lg:stats-horizontal shadow">
                  <div className="stat">
                    <div className="stat-title">总使用次数</div>
                    <div className="stat-value text-primary">{usageDetails.total_usage}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">最近30天</div>
                    <div className="stat-value text-secondary">{usageDetails.recent_usage}</div>
                  </div>
                </div>

                {usageDetails.last_used_at && (
                  <div>
                    <span className="font-medium">最后使用时间：</span>
                    {new Date(usageDetails.last_used_at).toLocaleString('zh-CN')}
                  </div>
                )}

                {usageDetails.usage_frequency && (
                  <div>
                    <span className="font-medium">使用频率：</span>
                    <span className={`ml-2 badge ${
                      usageDetails.usage_frequency === 'frequent' ? 'badge-success' :
                      usageDetails.usage_frequency === 'occasional' ? 'badge-warning' :
                      'badge-error'
                    }`}>
                      {getUsageFrequencyText(usageDetails.usage_frequency)}
                    </span>
                  </div>
                )}

                {usageDetails.common_actions?.length > 0 && (
                  <div>
                    <span className="font-medium">常用操作：</span>
                    <div className="flex gap-1 mt-1">
                      {usageDetails.common_actions.map((action: string, index: number) => (
                        <span key={index} className="badge badge-outline badge-sm">
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <span className="loading loading-spinner"></span>
                <p className="mt-2 text-sm">加载使用详情...</p>
              </div>
            )}
          </div>
        )}
      </ConfirmModal>
    </div>
  );
};

// 工具函数
function getUsageFrequencyText(frequency: string): string {
  const frequencyTexts: Record<string, string> = {
    never: '从未使用',
    rare: '很少使用',
    occasional: '偶尔使用',
    frequent: '经常使用'
  };
  return frequencyTexts[frequency] || frequency;
}

export default MyPermissionsDashboard;