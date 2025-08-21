import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'success' | 'warning' | 'error';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  details,
  confirmText,
  cancelText,
  confirmVariant = 'primary',
  loading = false,
  icon
}: ConfirmModalProps) {
  const { t } = useTranslation(['common']);

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    if (!loading) {
      onClose();
    }
  };

  // 根据确认按钮类型设置样式
  const getConfirmButtonClass = () => {
    switch (confirmVariant) {
      case 'success': return 'btn-success';
      case 'warning': return 'btn-warning';
      case 'error': return 'btn-error';
      default: return 'btn-primary';
    }
  };

  // 默认图标
  const defaultIcon = () => {
    switch (confirmVariant) {
      case 'success':
        return (
          <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (!open) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        {/* 标题区域 */}
        <div className="flex items-center gap-3 mb-4">
          {icon || defaultIcon()}
          <h3 className="font-bold text-lg text-base-content">{title}</h3>
        </div>

        {/* 消息内容 */}
        <div className="py-2">
          <p className="text-base-content/80 mb-3 leading-relaxed">{message}</p>
          
          {/* 详细信息 */}
          {details && (
            <div className="bg-base-200 rounded-lg p-3 mt-3">
              <p className="text-sm text-base-content/70 whitespace-pre-line">{details}</p>
            </div>
          )}
        </div>

        {/* 按钮区域 */}
        <div className="modal-action justify-end gap-2 mt-6">
          <button
            className="btn btn-ghost"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText || t('cancel')}
          </button>
          <button
            className={cn(
              'btn',
              getConfirmButtonClass(),
              loading && 'loading'
            )}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm mr-2"></span>
            ) : null}
            {confirmText || t('confirm')}
          </button>
        </div>
      </div>

      {/* 背景遮罩 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleCancel} disabled={loading}>close</button>
      </form>
    </dialog>
  );
}

// 批量操作确认模态框的特化组件
interface BatchConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: string;
  selectedCount: number;
  details?: string;
  loading?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'error';
}

export function BatchConfirmModal({
  open,
  onClose,
  onConfirm,
  action,
  selectedCount,
  details,
  loading = false,
  variant = 'primary'
}: BatchConfirmModalProps) {
  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`批量${action}`}
      message={`确定要${action}选中的 ${selectedCount} 条记录吗？`}
      details={details}
      confirmText={`确认${action}`}
      confirmVariant={variant}
      loading={loading}
    />
  );
}

// 回滚确认模态框的特化组件
interface RollbackConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  selectedCount: number;
  loading?: boolean;
}

export function RollbackConfirmModal({
  open,
  onClose,
  onConfirm,
  selectedCount,
  loading = false
}: RollbackConfirmModalProps) {
  const [reason, setReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);

  const handleConfirm = () => {
    if (!showReasonInput) {
      setShowReasonInput(true);
      return;
    }
    
    if (!reason.trim()) {
      return;
    }
    
    onConfirm(reason.trim());
  };

  const handleClose = () => {
    setReason('');
    setShowReasonInput(false);
    onClose();
  };

  if (!open) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        {/* 标题区域 */}
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <h3 className="font-bold text-lg text-base-content">批量回滚</h3>
        </div>

        {/* 消息内容 */}
        <div className="py-2">
          {!showReasonInput ? (
            <>
              <p className="text-base-content/80 mb-3 leading-relaxed">
                即将回滚 {selectedCount} 条记录的审批状态
              </p>
              <div className="bg-base-200 rounded-lg p-3">
                <p className="text-sm text-base-content/70">
                  • 已审批记录将回滚为"已计算"状态{'\n'}
                  • 已支付记录将回滚为"已审批"状态{'\n'}
                  • 此操作将记录在审批日志中
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-base-content/80 mb-3">请输入回滚原因：</p>
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="请详细说明回滚的原因..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                disabled={loading}
              />
              {!reason.trim() && (
                <p className="text-error text-xs mt-1">回滚原因不能为空</p>
              )}
            </>
          )}
        </div>

        {/* 按钮区域 */}
        <div className="modal-action justify-end gap-2 mt-6">
          <button
            className="btn btn-ghost"
            onClick={handleClose}
            disabled={loading}
          >
            取消
          </button>
          <button
            className={cn(
              'btn btn-warning',
              loading && 'loading',
              showReasonInput && !reason.trim() && 'btn-disabled'
            )}
            onClick={handleConfirm}
            disabled={loading || (showReasonInput && !reason.trim())}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm mr-2"></span>
            ) : null}
            {showReasonInput ? '确认回滚' : '下一步'}
          </button>
        </div>
      </div>

      {/* 背景遮罩 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose} disabled={loading}>close</button>
      </form>
    </dialog>
  );
}