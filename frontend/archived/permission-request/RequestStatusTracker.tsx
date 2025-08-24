/**
 * 权限申请状态跟踪组件
 * 
 * 功能特性：
 * - 申请状态可视化
 * - 时间线展示
 * - 进度指示
 * - 操作历史
 * - 剩余时间显示
 */

import React, { useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import type {
  PermissionRequest,
  RequestTimelineEntry,
  PermissionRequestStatus
} from '@/types/permission-request';

interface RequestStatusTrackerProps {
  request: PermissionRequest;
  timeline?: RequestTimelineEntry[];
  showActions?: boolean;
  onViewDetails?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

interface StatusConfig {
  color: string;
  icon: string;
  text: string;
  bgColor: string;
}

export const RequestStatusTracker: React.FC<RequestStatusTrackerProps> = ({
  request,
  timeline = [],
  showActions = false,
  onViewDetails,
  onCancel,
  compact = false
}) => {
  const { t } = useTranslation();

  // 状态配置
  const statusConfig: Record<PermissionRequestStatus, StatusConfig> = useMemo(() => ({
    pending: {
      color: 'text-warning',
      icon: '⏳',
      text: '待审批',
      bgColor: 'bg-warning/10'
    },
    approved: {
      color: 'text-success',
      icon: '✅',
      text: '已批准',
      bgColor: 'bg-success/10'
    },
    denied: {
      color: 'text-error',
      icon: '❌',
      text: '已拒绝',
      bgColor: 'bg-error/10'
    },
    expired: {
      color: 'text-neutral',
      icon: '⏰',
      text: '已过期',
      bgColor: 'bg-neutral/10'
    },
    cancelled: {
      color: 'text-neutral',
      icon: '🚫',
      text: '已取消',
      bgColor: 'bg-neutral/10'
    }
  }), []);

  const currentStatus = statusConfig[request.status];

  // 计算剩余时间
  const timeInfo = useMemo(() => {
    if (!request.expires_at) return null;

    const expiresAt = new Date(request.expires_at);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { expired: true, text: '已过期' };
    }

    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const diffHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const diffMinutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

    let text = '';
    if (diffDays > 0) text = `${diffDays}天${diffHours}小时`;
    else if (diffHours > 0) text = `${diffHours}小时${diffMinutes}分钟`;
    else text = `${diffMinutes}分钟`;

    return {
      expired: false,
      text: `剩余 ${text}`,
      urgent: diffMs < 24 * 60 * 60 * 1000 // 24小时内
    };
  }, [request.expires_at]);

  // 进度计算（基于状态）
  const progress = useMemo(() => {
    switch (request.status) {
      case 'pending': return 50;
      case 'approved': return 100;
      case 'denied': return 100;
      case 'expired': return 100;
      case 'cancelled': return 100;
      default: return 0;
    }
  }, [request.status]);

  // 生成时间线数据
  const defaultTimeline = useMemo<RequestTimelineEntry[]>(() => {
    const entries: RequestTimelineEntry[] = [
      {
        id: '1',
        type: 'submitted',
        title: '申请提交',
        description: `权限申请已提交`,
        timestamp: request.requested_at,
        user_name: request.user_email || '用户',
        user_email: request.user_email || ''
      }
    ];

    if (request.reviewed_at) {
      entries.push({
        id: '2',
        type: request.status === 'approved' ? 'approved' : 'denied',
        title: request.status === 'approved' ? '申请批准' : '申请拒绝',
        description: request.review_reason || `申请已${request.status === 'approved' ? '批准' : '拒绝'}`,
        timestamp: request.reviewed_at,
        user_name: request.reviewer_email || '审批人',
        user_email: request.reviewer_email || ''
      });
    }

    return entries;
  }, [request]);

  const timelineData = timeline.length > 0 ? timeline : defaultTimeline;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {/* 状态指示 */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${currentStatus.bgColor}`}>
          <span className="text-sm">{currentStatus.icon}</span>
          <span className={`text-sm font-medium ${currentStatus.color}`}>
            {currentStatus.text}
          </span>
        </div>

        {/* 剩余时间 */}
        {timeInfo && request.status === 'pending' && (
          <div className={`text-xs ${timeInfo.urgent ? 'text-warning' : 'text-base-content/60'}`}>
            {timeInfo.text}
          </div>
        )}

        {/* 快捷操作 */}
        {showActions && (
          <div className="flex gap-1">
            {onViewDetails && (
              <button
                className="btn btn-ghost btn-xs"
                onClick={onViewDetails}
              >
                详情
              </button>
            )}
            {onCancel && request.status === 'pending' && (
              <button
                className="btn btn-ghost btn-xs text-error"
                onClick={onCancel}
              >
                取消
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 状态头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${currentStatus.bgColor}`}>
            {currentStatus.icon}
          </div>
          <div>
            <h3 className={`font-semibold ${currentStatus.color}`}>
              {currentStatus.text}
            </h3>
            <p className="text-sm text-base-content/60">
              申请于 {new Date(request.requested_at).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>

        {/* 时间信息 */}
        {timeInfo && request.status === 'pending' && (
          <div className={`text-right ${timeInfo.urgent ? 'text-warning' : ''}`}>
            <div className="text-sm font-medium">{timeInfo.text}</div>
            <div className="text-xs text-base-content/60">
              截止时间：{new Date(request.expires_at!).toLocaleString('zh-CN')}
            </div>
          </div>
        )}
      </div>

      {/* 进度条 */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>处理进度</span>
          <span>{progress}%</span>
        </div>
        <div className="progress progress-primary w-full">
          <div
            className="progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 申请信息卡片 */}
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">权限名称：</span>
              <span>{request.permission_name || request.permission_id}</span>
            </div>
            <div>
              <span className="font-medium">申请类型：</span>
              <span className="badge badge-sm">
                {request.request_type === 'grant' ? '永久权限' : 
                 request.request_type === 'temporary' ? '临时权限' : 
                 request.request_type}
              </span>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium">申请理由：</span>
              <p className="mt-1 text-base-content/80">{request.reason}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 时间线 */}
      {timelineData.length > 0 && (
        <div className="card bg-base-100">
          <div className="card-body p-4">
            <h4 className="font-medium mb-3">处理历史</h4>
            <div className="timeline timeline-vertical">
              {timelineData.map((entry, index) => (
                <div key={entry.id} className="timeline-item">
                  <div className="timeline-marker">
                    {getTimelineIcon(entry.type)}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-time">
                      {new Date(entry.timestamp).toLocaleString('zh-CN')}
                    </div>
                    <div className="timeline-title font-medium">
                      {entry.title}
                    </div>
                    <div className="timeline-description text-sm text-base-content/70">
                      {entry.description}
                    </div>
                    <div className="timeline-user text-xs text-base-content/60">
                      操作人：{entry.user_name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 审批意见 */}
      {request.review_reason && (
        <div className={`alert ${request.status === 'approved' ? 'alert-success' : 'alert-error'}`}>
          <div>
            <h4 className="font-medium">审批意见</h4>
            <p className="text-sm mt-1">{request.review_reason}</p>
            {request.reviewer_email && (
              <p className="text-xs mt-1 opacity-70">
                审批人：{request.reviewer_email} | 
                审批时间：{request.reviewed_at ? new Date(request.reviewed_at).toLocaleString('zh-CN') : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {showActions && (
        <div className="flex justify-end gap-2">
          {onViewDetails && (
            <button
              className="btn btn-outline btn-sm"
              onClick={onViewDetails}
            >
              查看详情
            </button>
          )}
          {onCancel && request.status === 'pending' && (
            <button
              className="btn btn-error btn-outline btn-sm"
              onClick={onCancel}
            >
              取消申请
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// 获取时间线图标
function getTimelineIcon(type: string): string {
  const icons: Record<string, string> = {
    submitted: '📝',
    approved: '✅',
    denied: '❌',
    expired: '⏰',
    cancelled: '🚫',
    delegated: '👥',
    commented: '💬'
  };
  return icons[type] || '📍';
}

// 状态工具函数
export const statusUtils = {
  /**
   * 检查申请是否可以取消
   */
  canCancel(request: PermissionRequest): boolean {
    return request.status === 'pending';
  },

  /**
   * 检查申请是否已过期
   */
  isExpired(request: PermissionRequest): boolean {
    if (!request.expires_at) return false;
    return new Date(request.expires_at) < new Date();
  },

  /**
   * 检查申请是否紧急
   */
  isUrgent(request: PermissionRequest): boolean {
    if (!request.expires_at || request.status !== 'pending') return false;
    
    const expiresAt = new Date(request.expires_at);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    
    return diffMs > 0 && diffMs < 24 * 60 * 60 * 1000; // 24小时内
  },

  /**
   * 获取申请优先级
   */
  getPriority(request: PermissionRequest): 'low' | 'medium' | 'high' | 'urgent' {
    if (request.metadata?.priority) {
      return request.metadata.priority as any;
    }
    
    if (this.isUrgent(request)) return 'urgent';
    if (request.request_type === 'temporary') return 'high';
    return 'medium';
  },

  /**
   * 格式化申请持续时间
   */
  formatDuration(request: PermissionRequest): string {
    const requestedAt = new Date(request.requested_at);
    const now = new Date();
    const diffMs = now.getTime() - requestedAt.getTime();
    
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const diffHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (diffDays > 0) return `${diffDays}天前提交`;
    if (diffHours > 0) return `${diffHours}小时前提交`;
    return '刚刚提交';
  }
};

export default RequestStatusTracker;