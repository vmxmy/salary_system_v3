import { useState, useMemo } from 'react';
import { usePayrollApprovalV2 } from '@/hooks/payroll/usePayrollApprovalV2';
import { formatCurrency } from '@/lib/format';
import { formatDate } from '@/lib/dateUtils';
import type { PayrollApprovalSummary } from '@/hooks/payroll/usePayrollApprovalV2';

interface PayrollApprovalPanelProps {
  periodId?: string;
  onClose?: () => void;
}

/**
 * 薪资审批管理面板
 * 提供批量审批、驳回、查看历史等功能
 */
export function PayrollApprovalPanel({ periodId, onClose }: PayrollApprovalPanelProps) {
  const {
    queries,
    mutations,
    actions,
    loading,
    utils,
  } = usePayrollApprovalV2();

  // 状态管理
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'history'>('pending');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);

  // 获取数据（使用周期ID筛选）
  const { data: pendingData, isLoading: pendingLoading } = queries.usePendingApprovals(periodId);
  const { data: allData, isLoading: allLoading } = queries.useApprovalSummary({ periodId });
  const { data: stats, isLoading: statsLoading } = queries.useApprovalStats(periodId);
  const { data: logs } = queries.useApprovalLogs(selectedPayrollId || '');

  // 当前显示的数据
  const displayData = useMemo(() => {
    if (activeTab === 'pending') {
      return pendingData || [];
    }
    return allData || [];
  }, [activeTab, pendingData, allData]);

  // 处理全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableIds = displayData
        .filter(item => item.can_operate)
        .map(item => item.payroll_id);
      setSelectedIds(selectableIds);
    } else {
      setSelectedIds([]);
    }
  };

  // 处理单选
  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  // 批量审批
  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    
    const confirmed = window.confirm(`确认审批通过 ${selectedIds.length} 条薪资记录？`);
    if (!confirmed) return;

    await actions.approve(selectedIds);
    setSelectedIds([]);
  };

  // 批量驳回
  const handleBatchReject = async () => {
    if (!rejectReason.trim()) {
      alert('请填写驳回原因');
      return;
    }

    await actions.reject(selectedIds, rejectReason);
    setRejectModalOpen(false);
    setRejectReason('');
    setSelectedIds([]);
  };

  // 批量发放
  const handleBatchPay = async () => {
    if (selectedIds.length === 0) return;
    
    const confirmed = window.confirm(`确认标记 ${selectedIds.length} 条薪资记录为已发放？`);
    if (!confirmed) return;

    await actions.markPaid(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="bg-base-100 rounded-lg shadow-lg">
      {/* 头部统计 */}
      <div className="p-6 border-b border-base-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">薪资审批管理</h2>
          {onClose && (
            <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
              ✕
            </button>
          )}
        </div>
        
        {/* 统计卡片 - 使用标准 DaisyUI 5 stat 组件 */}
        <div className="stats shadow w-full">
          <div className="stat place-items-center">
            <div className="stat-title">待审批</div>
            <div className="stat-value text-warning">{stats?.draft || 0}</div>
          </div>
          
          <div className="stat place-items-center">
            <div className="stat-title">已审批</div>
            <div className="stat-value text-success">{stats?.approved || 0}</div>
          </div>
          
          <div className="stat place-items-center">
            <div className="stat-title">已发放</div>
            <div className="stat-value text-info">{stats?.paid || 0}</div>
          </div>
          
          <div className="stat place-items-center">
            <div className="stat-title">已取消</div>
            <div className="stat-value text-error">{stats?.cancelled || 0}</div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="tabs tabs-boxed m-4">
        <button
          className={`tab ${activeTab === 'pending' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          待审批 ({pendingData?.length || 0})
        </button>
        <button
          className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          全部记录
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          审批历史
        </button>
      </div>

      {/* 批量操作栏 */}
      {selectedIds.length > 0 && activeTab !== 'history' && (
        <div className="mx-4 mb-4 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
          <span className="text-sm">
            已选择 <span className="font-bold">{selectedIds.length}</span> 条记录
          </span>
          <div className="space-x-2">
            <button
              className="btn btn-success btn-sm"
              onClick={handleBatchApprove}
              disabled={loading.approve}
            >
              批量通过
            </button>
            <button
              className="btn btn-error btn-sm"
              onClick={() => setRejectModalOpen(true)}
              disabled={loading.reject}
            >
              批量驳回
            </button>
            <button
              className="btn btn-info btn-sm"
              onClick={handleBatchPay}
              disabled={loading.markPaid}
            >
              标记发放
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedIds([])}
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      {/* 数据表格 */}
      <div className="overflow-x-auto px-4 pb-4">
        {activeTab !== 'history' ? (
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={selectedIds.length === displayData.filter(d => d.can_operate).length && displayData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th>员工姓名</th>
                <th>支付日期</th>
                <th>应发工资</th>
                <th>实发工资</th>
                <th>状态</th>
                <th>最后操作</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((item) => (
                <tr key={item.payroll_id}>
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={selectedIds.includes(item.payroll_id)}
                      onChange={(e) => handleSelectOne(item.payroll_id, e.target.checked)}
                      disabled={!item.can_operate}
                    />
                  </td>
                  <td>{item.employee_name}</td>
                  <td>{formatDate(item.pay_date)}</td>
                  <td>{formatCurrency(item.gross_pay)}</td>
                  <td>{formatCurrency(item.net_pay)}</td>
                  <td>
                    <span className={`badge badge-${utils.getStatusColor(item.status)}`}>
                      {item.status_label}
                    </span>
                  </td>
                  <td>
                    {item.last_action && (
                      <div className="text-xs">
                        <div>{item.last_operator}</div>
                        <div className="text-base-content/60">
                          {formatDate(item.last_action_at || '')}
                        </div>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="dropdown dropdown-end">
                      <button className="btn btn-ghost btn-xs">
                        操作
                      </button>
                      <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-32">
                        {utils.canApprove(item.status) && (
                          <li>
                            <button 
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const confirmed = window.confirm(`确认审批通过 ${item.employee_name} 的薪资记录？`);
                                if (confirmed) {
                                  await actions.approve([item.payroll_id]);
                                }
                              }}
                            >
                              审批通过
                            </button>
                          </li>
                        )}
                        {utils.canMarkPaid(item.status) && (
                          <li>
                            <button 
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const confirmed = window.confirm(`确认标记 ${item.employee_name} 的薪资为已发放？`);
                                if (confirmed) {
                                  await actions.markPaid([item.payroll_id]);
                                }
                              }}
                            >
                              标记发放
                            </button>
                          </li>
                        )}
                        <li>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedPayrollId(item.payroll_id);
                              setActiveTab('history');
                            }}
                          >
                            查看历史
                          </button>
                        </li>
                      </ul>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          // 审批历史视图
          <div className="space-y-4">
            {selectedPayrollId && logs && logs.length > 0 ? (
              <div className="timeline timeline-vertical">
                {logs.map((log) => (
                  <div key={log.id} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="card bg-base-200">
                        <div className="card-body p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium">{log.operator_name}</span>
                              <span className="mx-2">·</span>
                              <span className="text-sm text-base-content/60">
                                {formatDate(log.created_at)}
                              </span>
                            </div>
                            <span className={`badge badge-${getActionColor(log.action)}`}>
                              {getActionLabel(log.action)}
                            </span>
                          </div>
                          {log.comments && (
                            <p className="text-sm mt-2">{log.comments}</p>
                          )}
                          <div className="text-xs text-base-content/60 mt-1">
                            {log.from_status} → {log.to_status}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-base-content/60">
                {selectedPayrollId ? '暂无审批记录' : '请选择一条薪资记录查看审批历史'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 驳回模态框 */}
      {rejectModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">批量驳回</h3>
            <div className="py-4">
              <label className="label">
                <span className="label-text">驳回原因</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入驳回原因..."
              />
            </div>
            <div className="modal-action">
              <button
                className="btn btn-error"
                onClick={handleBatchReject}
                disabled={!rejectReason.trim() || loading.reject}
              >
                确认驳回
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectReason('');
                }}
              >
                取消
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

// 辅助函数
function getActionLabel(action: string) {
  const labels: Record<string, string> = {
    submit: '提交审批',
    approve: '审批通过',
    reject: '驳回',
    pay: '标记发放',
    cancel: '取消',
  };
  return labels[action] || action;
}

function getActionColor(action: string) {
  const colors: Record<string, string> = {
    submit: 'info',
    approve: 'success',
    reject: 'error',
    pay: 'primary',
    cancel: 'warning',
  };
  return colors[action] || 'default';
}