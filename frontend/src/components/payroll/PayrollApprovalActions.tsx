import { useState } from 'react';
import { usePayrollApproval } from '@/hooks/payroll/usePayrollApproval';
import type { Database } from '@/types/supabase';

type PayrollStatus = Database['public']['Enums']['payroll_status'];

interface PayrollApprovalActionsProps {
  selectedIds: string[];
  selectedStatus?: PayrollStatus[];
  onSuccess?: () => void;
  className?: string;
}

/**
 * 薪资审批操作按钮组
 * 根据选中记录的状态显示相应的操作按钮
 */
export function PayrollApprovalActions({ 
  selectedIds, 
  selectedStatus = [],
  onSuccess,
  className = ''
}: PayrollApprovalActionsProps) {
  const { actions, loading, utils } = usePayrollApproval();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveComments, setApproveComments] = useState('');

  // 判断可执行的操作
  const canApprove = selectedStatus.every(status => utils.canApprove(status));
  const canMarkPaid = selectedStatus.every(status => utils.canMarkPaid(status));
  const canCancel = selectedStatus.every(status => utils.canCancel(status));
  
  // 如果没有选中记录，不显示任何按钮
  if (selectedIds.length === 0) {
    return null;
  }

  // 处理批量审批
  const handleApprove = async () => {
    await actions.approve(selectedIds, approveComments);
    setShowApproveModal(false);
    setApproveComments('');
    onSuccess?.();
  };

  // 处理批量驳回
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('请输入驳回原因');
      return;
    }
    await actions.reject(selectedIds, rejectReason);
    setShowRejectModal(false);
    setRejectReason('');
    onSuccess?.();
  };

  // 处理标记发放
  const handleMarkPaid = async () => {
    const confirmed = confirm(`确认标记 ${selectedIds.length} 条记录为已发放？`);
    if (!confirmed) return;
    
    await actions.markPaid(selectedIds);
    onSuccess?.();
  };

  // 处理取消
  const handleCancel = async () => {
    const reason = prompt('请输入取消原因：');
    if (!reason) return;
    
    await actions.cancel(selectedIds, reason);
    onSuccess?.();
  };

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="text-sm text-base-content/70">
          已选择 <span className="font-bold text-primary">{selectedIds.length}</span> 条记录
        </div>
        
        <div className="divider divider-horizontal m-0"></div>
        
        {/* 审批通过按钮 */}
        {canApprove && (
          <button
            className="btn btn-success btn-sm"
            onClick={() => setShowApproveModal(true)}
            disabled={loading.approve}
          >
            {loading.approve && <span className="loading loading-spinner loading-xs"></span>}
            审批通过
          </button>
        )}

        {/* 驳回按钮 */}
        {canApprove && (
          <button
            className="btn btn-error btn-sm"
            onClick={() => setShowRejectModal(true)}
            disabled={loading.reject}
          >
            {loading.reject && <span className="loading loading-spinner loading-xs"></span>}
            驳回
          </button>
        )}

        {/* 标记发放按钮 */}
        {canMarkPaid && (
          <button
            className="btn btn-info btn-sm"
            onClick={handleMarkPaid}
            disabled={loading.markPaid}
          >
            {loading.markPaid && <span className="loading loading-spinner loading-xs"></span>}
            标记发放
          </button>
        )}

        {/* 取消按钮 */}
        {canCancel && (
          <button
            className="btn btn-warning btn-sm"
            onClick={handleCancel}
            disabled={loading.cancel}
          >
            {loading.cancel && <span className="loading loading-spinner loading-xs"></span>}
            取消
          </button>
        )}

        {/* 清空选择 */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onSuccess?.()}
        >
          清空选择
        </button>
      </div>

      {/* 审批通过模态框 */}
      {showApproveModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">批量审批</h3>
            <p className="py-2 text-sm text-base-content/70">
              即将审批通过 {selectedIds.length} 条薪资记录
            </p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">审批意见（可选）</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="请输入审批意见..."
                value={approveComments}
                onChange={(e) => setApproveComments(e.target.value)}
              ></textarea>
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-success"
                onClick={handleApprove}
                disabled={loading.approve}
              >
                {loading.approve && <span className="loading loading-spinner loading-xs"></span>}
                确认通过
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => {
                  setShowApproveModal(false);
                  setApproveComments('');
                }}
              >
                取消
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowApproveModal(false)}>close</button>
          </form>
        </dialog>
      )}

      {/* 驳回模态框 */}
      {showRejectModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">批量驳回</h3>
            <p className="py-2 text-sm text-base-content/70">
              即将驳回 {selectedIds.length} 条薪资记录
            </p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  驳回原因 <span className="text-error">*</span>
                </span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="请输入驳回原因..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              ></textarea>
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-error"
                onClick={handleReject}
                disabled={loading.reject || !rejectReason.trim()}
              >
                {loading.reject && <span className="loading loading-spinner loading-xs"></span>}
                确认驳回
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
              >
                取消
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowRejectModal(false)}>close</button>
          </form>
        </dialog>
      )}
    </>
  );
}