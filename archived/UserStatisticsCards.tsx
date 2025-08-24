/**
 * 用户统计卡片组件
 * 
 * 显示用户管理相关的统计信息，基于 DaisyUI 5 设计
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { usePermissions } from '@/hooks/permissions';
import { useUserManagement } from '@/hooks/user-management/useUserManagement';
import { PERMISSIONS } from '@/constants/permissions';
import type { UserStatistics } from '@/types/user-management';

export function UserStatisticsCards() {
  const { t } = useTranslation('admin');
  const { hasPermission } = usePermissions();
  const { getUserStats, loading: statsLoading, error: statsError } = useUserManagement();
  
  const [stats, setStats] = useState<UserStatistics>({
    total_users: 0,
    active_users: 0,
    inactive_users: 0,
    suspended_users: 0,
    users_with_employees: 0,
    recent_logins: 0,
    pending_permission_requests: 0,
    role_distribution: {}
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载统计数据
  const loadStatistics = useCallback(async () => {
    if (!hasPermission(PERMISSIONS.USER_VIEW)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const statistics = await getUserStats();
      setStats(statistics);
    } catch (err) {
      console.error('Failed to load user statistics:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [hasPermission, getUserStats]);

  // 初始加载
  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  if (!hasPermission(PERMISSIONS.USER_VIEW)) {
    return null;
  }

  if (error) {
    return (
      <div className="alert alert-error mb-6">
        <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{t('user.statisticsLoadError')}: {error}</span>
        <div className="flex-none">
          <button className="btn btn-sm btn-ghost" onClick={loadStatistics}>
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* 主要统计数据 */}
      <div className="stats shadow w-full statistics-kpi-card mb-4">
        <div className="stat">
          <div className="stat-figure text-primary">
            <svg className="inline-block w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <div className="stat-title">{t('user.totalUsers')}</div>
          <div className="stat-value text-primary">
            {loading ? (
              <div className="skeleton w-16 h-8"></div>
            ) : (
              stats.total_users
            )}
          </div>
          <div className="stat-desc">
            {!loading && t('user.registeredUsers')}
          </div>
        </div>

        <div className="stat">
          <div className="stat-figure text-success">
            <svg className="inline-block w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-title">{t('user.activeUsers')}</div>
          <div className="stat-value text-success">
            {loading ? (
              <div className="skeleton w-16 h-8"></div>
            ) : (
              stats.active_users
            )}
          </div>
          <div className="stat-desc">
            {!loading && stats.total_users > 0 && (
              <span className="text-success">
                {Math.round((stats.active_users / stats.total_users) * 100)}% {t('user.ofTotal')}
              </span>
            )}
          </div>
        </div>

        <div className="stat">
          <div className="stat-figure text-warning">
            <svg className="inline-block w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="stat-title">{t('user.inactiveUsers')}</div>
          <div className="stat-value text-warning">
            {loading ? (
              <div className="skeleton w-16 h-8"></div>
            ) : (
              stats.inactive_users
            )}
          </div>
          <div className="stat-desc">
            {!loading && t('user.requiresAttention')}
          </div>
        </div>

        <div className="stat">
          <div className="stat-figure text-info">
            <svg className="inline-block w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="stat-title">{t('user.linkedEmployees')}</div>
          <div className="stat-value text-info">
            {loading ? (
              <div className="skeleton w-16 h-8"></div>
            ) : (
              stats.users_with_employees
            )}
          </div>
          <div className="stat-desc">
            {!loading && stats.total_users > 0 && (
              <span className="text-info">
                {Math.round((stats.users_with_employees / stats.total_users) * 100)}% {t('user.linked')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 角色分布和权限申请 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 角色分布 */}
        <div className="card card-compact bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {t('user.roleDistribution')}
            </h3>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="skeleton h-4 w-24"></div>
                    <div className="skeleton h-6 w-16"></div>
                  </div>
                ))}
              </div>
            ) : Object.keys(stats.role_distribution).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.role_distribution)
                  .sort(([,a], [,b]) => b - a)
                  .map(([role, count]) => (
                    <div key={role} className="flex justify-between items-center">
                      <span className="font-medium">{t(`role.${role}`, role)}</span>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-primary badge-sm">
                          {count}
                        </span>
                        <div className="w-20 h-2 bg-base-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{
                              width: `${(count / stats.active_users) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center text-base-content/50 py-8">
                {t('user.noRoleData')}
              </div>
            )}
          </div>
        </div>

        {/* 权限申请状态 */}
        <div className="card card-compact bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5-5-5h5v-12a1 1 0 011-1h3a1 1 0 011 1v12z" />
              </svg>
              {t('user.permissionRequests')}
            </h3>

            <div className="space-y-4">
              <div className="stat-compact bg-base-200/50 rounded-lg p-4">
                <div className="stat-title text-sm">{t('user.pendingRequests')}</div>
                <div className="stat-value text-2xl text-warning">
                  {loading ? (
                    <div className="skeleton w-12 h-8"></div>
                  ) : (
                    stats.pending_permission_requests
                  )}
                </div>
                <div className="stat-desc">
                  {!loading && (
                    <span className={
                      stats.pending_permission_requests > 0
                        ? 'text-warning'
                        : 'text-success'
                    }>
                      {stats.pending_permission_requests > 0
                        ? t('user.needsReview')
                        : t('user.allProcessed')
                      }
                    </span>
                  )}
                </div>
              </div>

              {hasPermission(PERMISSIONS.PERMISSION_MANAGE) && stats.pending_permission_requests > 0 && (
                <div className="card-actions">
                  <button
                    className="btn btn-warning btn-sm w-full"
                    onClick={() => {
                      // TODO: 导航到权限申请页面
                      console.log('Navigate to permission requests');
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    {t('user.reviewRequests')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 刷新按钮 */}
      <div className="flex justify-end mt-4">
        <button
          className={`btn btn-ghost btn-sm ${loading ? 'loading' : ''}`}
          onClick={loadStatistics}
          disabled={loading}
        >
          {!loading && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {t('common.refresh')}
        </button>
      </div>
    </div>
  );
}