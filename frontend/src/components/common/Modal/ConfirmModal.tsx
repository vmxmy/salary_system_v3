/**
 * 标准Confirm模态框组件 - 替代JavaScript confirm()
 * 
 * 功能特性：
 * - 统一的确认操作界面
 * - 支持不同类型的确认操作（删除、保存、警告等）
 * - 可自定义确认和取消按钮文本
 * - 支持危险操作的特殊样式
 * - DaisyUI 5标准样式
 */

import React from 'react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'danger' | 'warning' | 'success';
  loading?: boolean;
  confirmButtonClass?: string;
  cancelButtonClass?: string;
}

const TYPE_CONFIGS = {
  default: {
    icon: '❓',
    confirmClass: 'btn-primary',
    title: '确认操作'
  },
  danger: {
    icon: '⚠️',
    confirmClass: 'btn-error',
    title: '危险操作'
  },
  warning: {
    icon: '⚠️',
    confirmClass: 'btn-warning',
    title: '警告'
  },
  success: {
    icon: '✅',
    confirmClass: 'btn-success',
    title: '确认'
  }
};

export function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  type = 'default',
  loading = false,
  confirmButtonClass,
  cancelButtonClass
}: ConfirmModalProps) {
  const config = TYPE_CONFIGS[type];

  // 键盘事件处理
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      } else if (event.key === 'Enter' && !loading) {
        onConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm, loading]);

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <div className="flex items-center gap-4 mb-6">
          <span className="text-3xl">{config.icon}</span>
          <div className="flex-1">
            <h3 className="font-bold text-xl">
              {title || config.title}
            </h3>
            <p className="text-base-content/70 mt-2">
              {message}
            </p>
          </div>
        </div>

        <div className="modal-action gap-3">
          <button
            className={`btn ${cancelButtonClass || 'btn-ghost'}`}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={`btn ${confirmButtonClass || config.confirmClass} ${loading ? 'loading' : ''}`}
            onClick={onConfirm}
            disabled={loading}
            autoFocus
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                处理中...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
      
      {/* 背景点击关闭（仅在非加载状态） */}
      {!loading && (
        <div className="modal-backdrop" onClick={onCancel} />
      )}
    </div>
  );
}

// Hook使用ConfirmModal的便捷方法
export function useConfirmModal() {
  const [confirmState, setConfirmState] = React.useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type: 'default' | 'danger' | 'warning' | 'success';
    loading: boolean;
    onConfirm?: () => void | Promise<void>;
  }>({
    isOpen: false,
    message: '',
    type: 'default',
    loading: false
  });

  const showConfirm = React.useCallback((options: {
    message: string;
    onConfirm: () => void | Promise<void>;
    title?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'default' | 'danger' | 'warning' | 'success';
  }) => {
    setConfirmState({
      isOpen: true,
      message: options.message,
      title: options.title,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      type: options.type || 'default',
      loading: false,
      onConfirm: options.onConfirm
    });
  }, []);

  const hideConfirm = React.useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false, loading: false }));
  }, []);

  const handleConfirm = React.useCallback(async () => {
    if (!confirmState.onConfirm) return;

    try {
      setConfirmState(prev => ({ ...prev, loading: true }));
      await confirmState.onConfirm();
      hideConfirm();
    } catch (error) {
      console.error('Confirm action failed:', error);
      // 发生错误时也隐藏模态框，让外部处理错误
      hideConfirm();
    }
  }, [confirmState.onConfirm, hideConfirm]);

  // 便捷方法
  const confirmDelete = React.useCallback((
    message: string,
    onConfirm: () => void | Promise<void>,
    title: string = '确认删除'
  ) => {
    showConfirm({
      message,
      onConfirm,
      title,
      confirmText: '删除',
      cancelText: '取消',
      type: 'danger'
    });
  }, [showConfirm]);

  const confirmAction = React.useCallback((
    message: string,
    onConfirm: () => void | Promise<void>,
    title?: string
  ) => {
    showConfirm({
      message,
      onConfirm,
      title,
      type: 'default'
    });
  }, [showConfirm]);

  const ConfirmModalComponent = React.useMemo(() => (
    <ConfirmModal
      isOpen={confirmState.isOpen}
      onConfirm={handleConfirm}
      onCancel={hideConfirm}
      title={confirmState.title}
      message={confirmState.message}
      confirmText={confirmState.confirmText}
      cancelText={confirmState.cancelText}
      type={confirmState.type}
      loading={confirmState.loading}
    />
  ), [confirmState, handleConfirm, hideConfirm]);

  return {
    showConfirm,
    confirmDelete,
    confirmAction,
    hideConfirm,
    ConfirmModal: ConfirmModalComponent
  };
}