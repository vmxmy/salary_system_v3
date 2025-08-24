/**
 * 权限申请审批管理页面
 * 
 * 功能特性：
 * - 待审批申请列表
 * - 批量审批操作
 * - 审批统计分析
 * - 申请历史查询
 * - 委托审批管理
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { usePermissionApproval } from '@/hooks/permissions/usePermissionApproval';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PageHeader } from '@/components/common/PageHeader';
import { ApprovalPanel } from '@/components/permission-request';
import { Toast, type ToastMessage } from '@/components/common/Toast';
import type {
  PermissionRequestFilter,
  PermissionRequestStats
} from '@/types/permission-request';

const PermissionApprovalPage: React.FC = () => {
  const { t } = useTranslation();
  
  const {
    pendingRequests,
    stats,
    loading,
    error,
    canApprove,
    getAllRequests,
    getStats,
    refreshRequests,
    refreshStats
  } = usePermissionApproval();

  // 状态管理
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'stats'>('pending');
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [historicalStats, setHistoricalStats] = useState<PermissionRequestStats | null>(null);

  // 显示提示消息
  const showMessage = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const toastMsg: ToastMessage = {
      id: `toast-${Date.now()}`,
      type,
      message,
      duration: 3000
    };
    setToastMessage(toastMsg);
  }, []);

  // 处理审批完成
  const handleApprovalComplete = useCallback((requestId: string, approved: boolean) => {
    showMessage(
      `申请已成功${approved ? '批准' : '拒绝'}`,
      'success'
    );
    
    // 刷新统计数据
    refreshStats();
  }, [showMessage, refreshStats]);

  // 加载历史申请
  const loadAllRequests = useCallback(async (filter?: PermissionRequestFilter) => {
    try {
      const requests = await getAllRequests(filter);
      setAllRequests(requests);
    } catch (error) {
      console.error('Failed to load all requests:', error);
    }
  }, [getAllRequests]);

  // 加载历史统计
  const loadHistoricalStats = useCallback(async (timeRange?: { start: Date; end: Date }) => {
    try {
      const historicalStats = await getStats(timeRange);
      setHistoricalStats(historicalStats);
    } catch (error) {
      console.error('Failed to load historical stats:', error);
    }
  }, [getStats]);

  // 页面初始化
  useEffect(() => {
    if (canApprove) {
      if (activeTab === 'history') {
        loadAllRequests();
      } else if (activeTab === 'stats') {
        loadHistoricalStats();
      }
    }
  }, [activeTab, canApprove, loadAllRequests, loadHistoricalStats]);

  // 权限检查包装器
  const ProtectedContent = () => (
    <PermissionGuard permission="MANAGE_PERMISSIONS" fallback={
      <div className="alert alert-warning">
        <div>
          <h3 className="font-bold">权限不足</h3>
          <div className="text-sm">您没有权限访问权限审批功能。</div>
        </div>
      </div>
    }>
      <div className="space-y-6">
        {/* 页面头部 */}
        <PageHeader
          title="权限审批"
          subtitle="审批用户权限申请并管理审批流程"
        >
          <div className="flex gap-2">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                refreshRequests();
                refreshStats();
              }}
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                '🔄'
              )}
              刷新数据
            </button>
          </div>
        </PageHeader>

        {/* 错误提示 */}
        {error && (
          <div className="alert alert-error">
            <div>
              <h3 className="font-bold">加载失败</h3>
              <div className="text-sm">{error.message}</div>
            </div>
          </div>
        )}

        {/* 标签导航 */}
        <div className="tabs tabs-boxed">
          <button
            className={`tab ${activeTab === 'pending' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            ⏳ 待审批 
            {pendingRequests.length > 0 && (
              <span className="badge badge-warning badge-sm ml-2">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📋 审批历史
          </button>
          <button
            className={`tab ${activeTab === 'stats' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 统计分析
          </button>
        </div>

        {/* 内容区域 */}
        <div className="min-h-[500px]">
          {activeTab === 'pending' && (
            <ApprovalPanel
              onApprovalComplete={handleApprovalComplete}
              showStats={true}
              autoRefresh={true}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTab
              requests={allRequests}
              loading={loading}
              onLoadRequests={loadAllRequests}
            />
          )}

          {activeTab === 'stats' && (
            <StatsTab
              stats={historicalStats || stats}
              loading={loading}
              onLoadStats={loadHistoricalStats}
            />
          )}
        </div>

        {/* Toast 通知 */}
        {toastMessage && (
          <Toast
            message={toastMessage}
            onClose={() => setToastMessage(null)}
          />
        )}
      </div>
    </PermissionGuard>
  );

  return <ProtectedContent />;
};

// 历史记录标签
const HistoryTab: React.FC<{
  requests: any[];
  loading: boolean;
  onLoadRequests: (filter?: PermissionRequestFilter) => void;
}> = ({ requests, loading, onLoadRequests }) => {
  const [filter, setFilter] = useState<PermissionRequestFilter>({});

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          审批历史 ({requests.length})
        </h3>
        <div className="flex gap-2">
          <select
            className="select select-bordered select-sm"
            value={filter.status?.[0] || ''}
            onChange={(e) => {
              const newFilter = {
                ...filter,
                status: e.target.value ? [e.target.value as any] : undefined
              };
              setFilter(newFilter);
              onLoadRequests(newFilter);
            }}
          >
            <option value="">所有状态</option>
            <option value="approved">已批准</option>
            <option value="denied">已拒绝</option>
            <option value="expired">已过期</option>
            <option value="cancelled">已取消</option>
          </select>
          
          <input
            type="text"
            placeholder="搜索申请..."
            className="input input-bordered input-sm"
            value={filter.keywords || ''}
            onChange={(e) => {
              const newFilter = { ...filter, keywords: e.target.value };
              setFilter(newFilter);
              // 延迟搜索
              const timeoutId = setTimeout(() => onLoadRequests(newFilter), 500);
              return () => clearTimeout(timeoutId);
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map(request => (
            <div key={request.request_id} className="card bg-base-100">
              <div className="card-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{request.permission_name || request.permission_id}</h4>
                    <p className="text-sm text-base-content/70">
                      申请人：{request.user_email} | 
                      申请时间：{new Date(request.requested_at).toLocaleString('zh-CN')}
                    </p>
                    {request.reviewed_at && (
                      <p className="text-sm text-base-content/70">
                        审批时间：{new Date(request.reviewed_at).toLocaleString('zh-CN')} |
                        审批人：{request.reviewer_email}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`badge ${getStatusBadgeClass(request.status)}`}>
                      {getStatusText(request.status)}
                    </span>
                    {request.review_reason && (
                      <p className="text-xs text-base-content/60 mt-1">
                        {request.review_reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium mb-2">暂无审批记录</h3>
          <p className="text-base-content/60">
            没有找到符合条件的审批记录。
          </p>
        </div>
      )}
    </div>
  );
};

// 统计分析标签
const StatsTab: React.FC<{
  stats: PermissionRequestStats | null;
  loading: boolean;
  onLoadStats: (timeRange?: { start: Date; end: Date }) => void;
}> = ({ stats, loading, onLoadStats }) => {
  const [timeRange, setTimeRange] = useState<{ start: Date; end: Date } | undefined>();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-medium mb-2">无统计数据</h3>
        <p className="text-base-content/60">
          暂无可显示的统计数据。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">审批统计</h3>
        <div className="flex gap-2">
          <input
            type="date"
            className="input input-bordered input-sm"
            onChange={(e) => {
              if (e.target.value) {
                const start = new Date(e.target.value);
                const end = timeRange?.end || new Date();
                setTimeRange({ start, end });
              }
            }}
          />
          <input
            type="date"
            className="input input-bordered input-sm"
            onChange={(e) => {
              if (e.target.value) {
                const end = new Date(e.target.value);
                const start = timeRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                setTimeRange({ start, end });
              }
            }}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onLoadStats(timeRange)}
          >
            查询
          </button>
        </div>
      </div>

      {/* 总体统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-base-200">
          <div className="stat-title">总申请数</div>
          <div className="stat-value text-primary">{stats.total_requests}</div>
        </div>
        <div className="stat bg-base-200">
          <div className="stat-title">待审批</div>
          <div className="stat-value text-warning">{stats.pending_requests}</div>
        </div>
        <div className="stat bg-base-200">
          <div className="stat-title">已批准</div>
          <div className="stat-value text-success">{stats.approved_requests}</div>
        </div>
        <div className="stat bg-base-200">
          <div className="stat-title">已拒绝</div>
          <div className="stat-value text-error">{stats.denied_requests}</div>
        </div>
      </div>

      {/* 审批效率 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-base-100">
          <div className="card-body">
            <h4 className="card-title">审批效率</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>审批率</span>
                <span className="font-medium">{stats.approval_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>平均处理时间</span>
                <span className="font-medium">{stats.average_approval_time.toFixed(1)}小时</span>
              </div>
              <div className="flex justify-between">
                <span>逾期申请</span>
                <span className="font-medium text-error">{stats.pending_overdue}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100">
          <div className="card-body">
            <h4 className="card-title">申请类型分布</h4>
            <div className="space-y-2">
              {Object.entries(stats.by_type).map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span>{getRequestTypeText(type)}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 趋势图表 */}
      {stats.requests_by_day.length > 0 && (
        <div className="card bg-base-100">
          <div className="card-body">
            <h4 className="card-title">申请趋势</h4>
            <div className="h-64 flex items-end justify-between gap-1">
              {stats.requests_by_day.map(day => (
                <div
                  key={day.date}
                  className="flex flex-col items-center gap-1 flex-1"
                  title={`${day.date}: ${day.count} 个申请`}
                >
                  <div className="flex flex-col gap-0.5 w-full">
                    <div
                      className="bg-success rounded-t"
                      style={{ 
                        height: `${Math.max(4, (day.approved / Math.max(...stats.requests_by_day.map(d => d.count))) * 200)}px`,
                        width: '100%'
                      }}
                    />
                    <div
                      className="bg-error rounded-b"
                      style={{ 
                        height: `${Math.max(4, (day.denied / Math.max(...stats.requests_by_day.map(d => d.count))) * 200)}px`,
                        width: '100%'
                      }}
                    />
                  </div>
                  <span className="text-xs">{day.date.split('-')[2]}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-success rounded"></div>
                <span>已批准</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-error rounded"></div>
                <span>已拒绝</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 工具函数
function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    pending: 'badge-warning',
    approved: 'badge-success',
    denied: 'badge-error',
    expired: 'badge-neutral',
    cancelled: 'badge-ghost'
  };
  return classes[status] || 'badge-neutral';
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    pending: '待审批',
    approved: '已批准',
    denied: '已拒绝',
    expired: '已过期',
    cancelled: '已取消'
  };
  return texts[status] || status;
}

function getRequestTypeText(type: string): string {
  const texts: Record<string, string> = {
    grant: '权限申请',
    revoke: '权限撤销',
    temporary: '临时权限',
    extend: '权限延期'
  };
  return texts[type] || type;
}

export default PermissionApprovalPage;