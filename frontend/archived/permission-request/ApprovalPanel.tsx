/**
 * 权限申请审批面板组件
 * 
 * 功能特性：
 * - 待审批申请列表
 * - 批量审批操作
 * - 审批表单
 * - 申请详情查看
 * - 委托审批
 * - 过滤和搜索
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { usePermissionApproval } from '@/hooks/permissions/usePermissionApproval';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { RequestStatusTracker } from './RequestStatusTracker';
import type {
  PermissionRequest,
  PermissionRequestFilter,
  ApprovalFormData,
  BatchApprovalFormData
} from '@/types/permission-request';

interface ApprovalPanelProps {
  onApprovalComplete?: (requestId: string, approved: boolean) => void;
  showStats?: boolean;
  autoRefresh?: boolean;
}

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({
  onApprovalComplete,
  showStats = true,
  autoRefresh = true
}) => {
  const { t } = useTranslation();
  const {
    pendingRequests,
    stats,
    loading,
    error,
    canApprove,
    getPendingRequests,
    approveRequest,
    denyRequest,
    approveBatch,
    delegateRequest,
    refreshRequests,
    refreshStats
  } = usePermissionApproval();

  // 状态管理
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [filter, setFilter] = useState<PermissionRequestFilter>({});
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<PermissionRequest | null>(null);
  const [approvalData, setApprovalData] = useState<ApprovalFormData>({
    decision: 'approved',
    reason: '',
    notify_user: true
  });
  const [batchApprovalData, setBatchApprovalData] = useState<BatchApprovalFormData>({
    request_ids: [],
    decision: 'approved',
    reason: '',
    apply_to_all: true
  });

  // 权限检查
  if (!canApprove) {
    return (
      <div className="alert alert-warning">
        <div>
          <h3 className="font-bold">权限不足</h3>
          <div className="text-sm">您没有权限审批权限申请。</div>
        </div>
      </div>
    );
  }

  // 过滤后的申请列表
  const filteredRequests = useMemo(() => {
    let filtered = [...pendingRequests];

    if (filter.keywords) {
      const keywords = filter.keywords.toLowerCase();
      filtered = filtered.filter(req =>
        req.reason.toLowerCase().includes(keywords) ||
        req.permission_name?.toLowerCase().includes(keywords) ||
        req.user_email?.toLowerCase().includes(keywords)
      );
    }

    if (filter.urgency?.length) {
      filtered = filtered.filter(req =>
        filter.urgency!.includes(req.urgency || 'medium')
      );
    }

    if (filter.request_type?.length) {
      filtered = filtered.filter(req =>
        filter.request_type!.includes(req.request_type)
      );
    }

    if (filter.date_range) {
      filtered = filtered.filter(req => {
        const requestDate = new Date(req.requested_at);
        return requestDate >= filter.date_range!.start && requestDate <= filter.date_range!.end;
      });
    }

    return filtered;
  }, [pendingRequests, filter]);

  // 表格列配置
  const columns = useMemo(() => [
    {
      id: 'selection',
      header: '选择',
      size: 60,
      cell: ({ row }: { row: any }) => (
        <input
          type="checkbox"
          className="checkbox checkbox-primary checkbox-sm"
          checked={selectedRequests.includes(row.original.request_id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedRequests(prev => [...prev, row.original.request_id]);
            } else {
              setSelectedRequests(prev => prev.filter(id => id !== row.original.request_id));
            }
          }}
        />
      )
    },
    {
      accessorKey: 'user_email',
      header: '申请人',
      cell: ({ row }: { row: any }) => (
        <div>
          <div className="font-medium">{row.original.user_email}</div>
          <div className="text-xs text-base-content/60">
            {new Date(row.original.requested_at).toLocaleDateString('zh-CN')}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'permission_name',
      header: '权限',
      cell: ({ row }: { row: any }) => (
        <div>
          <div className="font-medium">{row.original.permission_name || row.original.permission_id}</div>
          <div className="flex gap-1 mt-1">
            <span className="badge badge-xs">
              {row.original.request_type === 'grant' ? '永久' : '临时'}
            </span>
            {row.original.urgency && (
              <span className={`badge badge-xs ${getUrgencyColor(row.original.urgency)}`}>
                {getUrgencyText(row.original.urgency)}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'reason',
      header: '申请理由',
      cell: ({ row }: { row: any }) => (
        <div className="max-w-xs">
          <p className="text-sm truncate" title={row.original.reason}>
            {row.original.reason}
          </p>
        </div>
      )
    },
    {
      accessorKey: 'expires_at',
      header: '截止时间',
      cell: ({ row }) => {
        if (!row.original.expires_at) return <span className="text-base-content/60">无期限</span>;
        
        const expiresAt = new Date(row.original.expires_at);
        const now = new Date();
        const diffMs = expiresAt.getTime() - now.getTime();
        const isUrgent = diffMs > 0 && diffMs < 24 * 60 * 60 * 1000;
        
        return (
          <div className={isUrgent ? 'text-warning' : ''}>
            <div className="text-sm">
              {expiresAt.toLocaleDateString('zh-CN')}
            </div>
            <div className="text-xs">
              {expiresAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            {isUrgent && (
              <div className="text-xs text-warning font-medium">即将过期</div>
            )}
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: '操作',
      size: 200,
      cell: ({ row }: { row: any }) => (
        <div className="flex gap-1">
          <button
            className="btn btn-success btn-xs"
            onClick={() => handleSingleApproval(row.original, 'approved')}
            disabled={loading}
          >
            批准
          </button>
          <button
            className="btn btn-error btn-xs"
            onClick={() => handleSingleApproval(row.original, 'denied')}
            disabled={loading}
          >
            拒绝
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => handleViewDetails(row.original)}
          >
            详情
          </button>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-xs">
              ⋯
            </div>
            <ul className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40">
              <li>
                <button onClick={() => handleDelegate(row.original)}>
                  委托审批
                </button>
              </li>
            </ul>
          </div>
        </div>
      )
    }
  ], [selectedRequests, loading]);

  // 处理单个审批
  const handleSingleApproval = useCallback(async (
    request: PermissionRequest,
    decision: 'approved' | 'denied'
  ) => {
    setCurrentRequest(request);
    setApprovalData({
      decision,
      reason: '',
      notify_user: true
    });
    setShowApprovalModal(true);
  }, []);

  // 处理批量审批
  const handleBatchApproval = useCallback((decision: 'approved' | 'denied') => {
    if (selectedRequests.length === 0) {
      alert('请先选择要审批的申请');
      return;
    }

    setBatchApprovalData({
      request_ids: selectedRequests,
      decision,
      reason: '',
      apply_to_all: true
    });
    setShowBatchModal(true);
  }, [selectedRequests]);

  // 确认单个审批
  const confirmSingleApproval = useCallback(async () => {
    if (!currentRequest) return;

    try {
      const success = await approveRequest(currentRequest.request_id, approvalData);
      
      if (success) {
        setShowApprovalModal(false);
        setCurrentRequest(null);
        setSelectedRequests(prev => prev.filter(id => id !== currentRequest.request_id));
        onApprovalComplete?.(currentRequest.request_id, approvalData.decision === 'approved');
      }
    } catch (error) {
      console.error('Approval failed:', error);
    }
  }, [currentRequest, approvalData, approveRequest, onApprovalComplete]);

  // 确认批量审批
  const confirmBatchApproval = useCallback(async () => {
    try {
      const success = await approveBatch(batchApprovalData);
      
      if (success) {
        setShowBatchModal(false);
        setSelectedRequests([]);
        
        // 通知每个申请的审批完成
        batchApprovalData.request_ids.forEach(requestId => {
          onApprovalComplete?.(requestId, batchApprovalData.decision === 'approved');
        });
      }
    } catch (error) {
      console.error('Batch approval failed:', error);
    }
  }, [batchApprovalData, approveBatch, onApprovalComplete]);

  // 处理详情查看
  const handleViewDetails = useCallback((request: PermissionRequest) => {
    // 可以打开详情模态框或跳转到详情页面
    console.log('View details for request:', request.request_id);
  }, []);

  // 处理委托
  const handleDelegate = useCallback((request: PermissionRequest) => {
    // 可以打开委托模态框
    console.log('Delegate request:', request.request_id);
  }, []);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshRequests();
      refreshStats();
    }, 30000); // 30秒刷新一次

    return () => clearInterval(interval);
  }, [autoRefresh, refreshRequests, refreshStats]);

  // 全选/取消全选
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedRequests(filteredRequests.map(req => req.request_id));
    } else {
      setSelectedRequests([]);
    }
  }, [filteredRequests]);

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      {showStats && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="stat bg-base-200">
            <div className="stat-title">待审批</div>
            <div className="stat-value text-warning">{stats.pending_requests}</div>
          </div>
          <div className="stat bg-base-200">
            <div className="stat-title">审批率</div>
            <div className="stat-value text-success">{stats.approval_rate.toFixed(1)}%</div>
          </div>
          <div className="stat bg-base-200">
            <div className="stat-title">平均处理时间</div>
            <div className="stat-value text-info">{stats.average_approval_time.toFixed(1)}h</div>
          </div>
          <div className="stat bg-base-200">
            <div className="stat-title">逾期申请</div>
            <div className="stat-value text-error">{stats.pending_overdue}</div>
          </div>
        </div>
      )}

      {/* 操作工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            className="btn btn-success btn-sm"
            onClick={() => handleBatchApproval('approved')}
            disabled={selectedRequests.length === 0 || loading}
          >
            批量批准 ({selectedRequests.length})
          </button>
          <button
            className="btn btn-error btn-sm"
            onClick={() => handleBatchApproval('denied')}
            disabled={selectedRequests.length === 0 || loading}
          >
            批量拒绝 ({selectedRequests.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* 过滤器 */}
          <select
            className="select select-bordered select-sm"
            value={filter.urgency?.[0] || ''}
            onChange={(e) => setFilter(prev => ({
              ...prev,
              urgency: e.target.value ? [e.target.value as any] : undefined
            }))}
          >
            <option value="">所有紧急程度</option>
            <option value="low">低</option>
            <option value="medium">中等</option>
            <option value="high">高</option>
            <option value="critical">紧急</option>
          </select>

          <input
            type="text"
            placeholder="搜索申请..."
            className="input input-bordered input-sm"
            value={filter.keywords || ''}
            onChange={(e) => setFilter(prev => ({ ...prev, keywords: e.target.value }))}
          />

          <button
            className="btn btn-ghost btn-sm"
            onClick={refreshRequests}
            disabled={loading}
          >
            🔄
          </button>
        </div>
      </div>

      {/* 申请列表 */}
      <div className="card bg-base-100">
        <div className="card-body p-0">
          <DataTable
            data={filteredRequests}
            columns={columns}
            loading={loading}
            emptyMessage="暂无待审批的申请"
            showPagination={true}
            initialPagination={{ pageIndex: 0, pageSize: 10 }}
            enableRowSelection={true}
            onRowSelectionChange={(selection) => {
              const selectedIds = Object.keys(selection).filter(id => selection[id]);
              setSelectedRequests(selectedIds);
            }}
          />
        </div>
      </div>

      {/* 单个审批模态框 */}
      <ConfirmModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onConfirm={confirmSingleApproval}
        title={`${approvalData.decision === 'approved' ? '批准' : '拒绝'}申请`}
        confirmText={approvalData.decision === 'approved' ? '批准' : '拒绝'}
        confirmClassName={`btn-${approvalData.decision === 'approved' ? 'success' : 'error'}`}
        loading={loading}
      >
        {currentRequest && (
          <div className="space-y-4">
            {/* 申请信息 */}
            <RequestStatusTracker request={currentRequest} compact />

            {/* 审批表单 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">审批意见 *</span>
              </label>
              <textarea
                className="textarea textarea-bordered"
                placeholder="请填写审批意见..."
                value={approvalData.reason}
                onChange={(e) => setApprovalData(prev => ({
                  ...prev,
                  reason: e.target.value
                }))}
                required
              />
            </div>

            {approvalData.decision === 'approved' && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">附加条件</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  placeholder="权限使用的附加条件或限制..."
                  value={approvalData.conditions || ''}
                  onChange={(e) => setApprovalData(prev => ({
                    ...prev,
                    conditions: e.target.value
                  }))}
                />
              </div>
            )}

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">发送通知给申请人</span>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={approvalData.notify_user !== false}
                  onChange={(e) => setApprovalData(prev => ({
                    ...prev,
                    notify_user: e.target.checked
                  }))}
                />
              </label>
            </div>
          </div>
        )}
      </ConfirmModal>

      {/* 批量审批模态框 */}
      <ConfirmModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        onConfirm={confirmBatchApproval}
        title={`批量${batchApprovalData.decision === 'approved' ? '批准' : '拒绝'}申请`}
        confirmText={`${batchApprovalData.decision === 'approved' ? '批准' : '拒绝'} ${batchApprovalData.request_ids.length} 个申请`}
        confirmClassName={`btn-${batchApprovalData.decision === 'approved' ? 'success' : 'error'}`}
        loading={loading}
      >
        <div className="space-y-4">
          <div className="alert alert-info">
            <div>
              <h4 className="font-medium">
                即将{batchApprovalData.decision === 'approved' ? '批准' : '拒绝'} {batchApprovalData.request_ids.length} 个申请
              </h4>
              <p className="text-sm">此操作将对所有选中的申请生效，请确认后继续。</p>
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">批量审批意见 *</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              placeholder="请填写适用于所有申请的审批意见..."
              value={batchApprovalData.reason}
              onChange={(e) => setBatchApprovalData(prev => ({
                ...prev,
                reason: e.target.value
              }))}
              required
            />
          </div>

          {batchApprovalData.decision === 'approved' && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">统一附加条件</span>
              </label>
              <textarea
                className="textarea textarea-bordered"
                placeholder="适用于所有申请的附加条件..."
                value={batchApprovalData.conditions || ''}
                onChange={(e) => setBatchApprovalData(prev => ({
                  ...prev,
                  conditions: e.target.value
                }))}
              />
            </div>
          )}
        </div>
      </ConfirmModal>
    </div>
  );
};

// 工具函数
function getUrgencyColor(urgency: string): string {
  const colors: Record<string, string> = {
    low: 'badge-info',
    medium: 'badge-warning',
    high: 'badge-error',
    critical: 'badge-error'
  };
  return colors[urgency] || 'badge-neutral';
}

function getUrgencyText(urgency: string): string {
  const texts: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '紧急'
  };
  return texts[urgency] || urgency;
}

export default ApprovalPanel;