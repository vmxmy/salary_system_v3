/**
 * 标准Alert模态框组件 - 替代JavaScript alert()
 * 
 * 功能特性：
 * - 统一的视觉设计
 * - 支持不同类型（成功、错误、警告、信息）
 * - 支持标题和内容
 * - 自动关闭和手动关闭
 * - DaisyUI 5标准样式
 */

import React from 'react';

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  autoClose?: number; // 自动关闭时间（毫秒）
  showCloseButton?: boolean;
}

const TYPE_CONFIGS = {
  success: {
    icon: '✅',
    alertClass: 'alert-success',
    title: '成功'
  },
  error: {
    icon: '❌',
    alertClass: 'alert-error',
    title: '错误'
  },
  warning: {
    icon: '⚠️',
    alertClass: 'alert-warning',
    title: '警告'
  },
  info: {
    icon: 'ℹ️',
    alertClass: 'alert-info',
    title: '提示'
  }
};

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  autoClose,
  showCloseButton = true
}: AlertModalProps) {
  const config = TYPE_CONFIGS[type];

  // 自动关闭逻辑
  React.useEffect(() => {
    if (isOpen && autoClose && autoClose > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  // 键盘事件处理
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <div className={`alert ${config.alertClass} mb-4`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{config.icon}</span>
            <div className="flex-1">
              <h3 className="font-bold text-lg">
                {title || config.title}
              </h3>
              <div className="text-sm mt-1">
                {message}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-action">
          {showCloseButton && (
            <button
              className="btn btn-primary"
              onClick={onClose}
              autoFocus
            >
              确定
            </button>
          )}
        </div>
      </div>
      
      {/* 背景点击关闭 */}
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

// Hook使用AlertModal的便捷方法
export function useAlertModal() {
  const [alertState, setAlertState] = React.useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    autoClose?: number;
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const showAlert = React.useCallback((
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    title?: string,
    autoClose?: number
  ) => {
    setAlertState({
      isOpen: true,
      message,
      type,
      title,
      autoClose
    });
  }, []);

  const hideAlert = React.useCallback(() => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // 便捷方法
  const showSuccess = React.useCallback((message: string, title?: string, autoClose?: number) => {
    showAlert(message, 'success', title, autoClose);
  }, [showAlert]);

  const showError = React.useCallback((message: string, title?: string, autoClose?: number) => {
    showAlert(message, 'error', title, autoClose);
  }, [showAlert]);

  const showWarning = React.useCallback((message: string, title?: string, autoClose?: number) => {
    showAlert(message, 'warning', title, autoClose);
  }, [showAlert]);

  const showInfo = React.useCallback((message: string, title?: string, autoClose?: number) => {
    showAlert(message, 'info', title, autoClose);
  }, [showAlert]);

  const AlertModalComponent = React.useMemo(() => (
    <AlertModal
      isOpen={alertState.isOpen}
      onClose={hideAlert}
      title={alertState.title}
      message={alertState.message}
      type={alertState.type}
      autoClose={alertState.autoClose}
    />
  ), [alertState, hideAlert]);

  return {
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideAlert,
    AlertModal: AlertModalComponent
  };
}