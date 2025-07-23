import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * 通用配置表单模态窗口组件
 * 提供统一的模态窗口容器，支持表单验证和提交处理
 */

export interface ConfigFormModalProps {
  /** 模态窗口是否显示 */
  isOpen: boolean;
  /** 关闭模态窗口的回调函数 */
  onClose: () => void;
  /** 模态窗口标题 */
  title: string;
  /** 表单内容 */
  children: React.ReactNode;
  /** 提交按钮文本 */
  submitLabel?: string;
  /** 取消按钮文本 */
  cancelLabel?: string;
  /** 是否显示提交按钮 */
  showSubmit?: boolean;
  /** 是否显示取消按钮 */
  showCancel?: boolean;
  /** 提交处理函数 */
  onSubmit?: () => void;
  /** 提交按钮是否禁用 */
  submitDisabled?: boolean;
  /** 是否正在提交 */
  isSubmitting?: boolean;
  /** 模态窗口大小 */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 是否可以通过点击背景关闭 */
  closeOnBackdrop?: boolean;
  /** 是否可以通过ESC键关闭 */
  closeOnEscape?: boolean;
  /** 额外的CSS类名 */
  className?: string;
}

export function ConfigFormModal({
  isOpen,
  onClose,
  title,
  children,
  submitLabel = '保存',
  cancelLabel = '取消',
  showSubmit = true,
  showCancel = true,
  onSubmit,
  submitDisabled = false,
  isSubmitting = false,
  size = 'lg',
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = ''
}: ConfigFormModalProps) {
  
  // 处理ESC键关闭
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);
  
  // 处理body滚动锁定
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // 处理背景点击关闭
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };
  
  // 处理表单提交
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (onSubmit && !submitDisabled && !isSubmitting) {
      onSubmit();
    }
  };
  
  // 获取模态窗口大小类名
  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'modal-box w-96 max-w-sm';
      case 'md': return 'modal-box w-full max-w-md';
      case 'lg': return 'modal-box w-full max-w-2xl';
      case 'xl': return 'modal-box w-full max-w-4xl';
      case 'full': return 'modal-box w-full max-w-7xl h-full';
      default: return 'modal-box w-full max-w-2xl';
    }
  };
  
  if (!isOpen) return null;
  
  const modalContent = (
    <div 
      className={`modal modal-open ${className}`}
      onClick={handleBackdropClick}
    >
      <div className={getSizeClass()}>
        {/* 模态头部 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-base-content">
            {title}
          </h2>
          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        </div>
        
        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex-1 min-h-0">
            {children}
          </div>
          
          {/* 模态底部操作按钮 */}
          {(showSubmit || showCancel) && (
            <div className="flex justify-end gap-3 pt-6 border-t border-base-300">
              {showCancel && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  {cancelLabel}
                </button>
              )}
              
              {showSubmit && (
                <button
                  type="submit"
                  className={`btn btn-primary ${isSubmitting ? 'loading' : ''}`}
                  disabled={submitDisabled || isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : null}
                  {isSubmitting ? '保存中...' : submitLabel}
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
  
  // 使用Portal渲染到body中，确保正确的层级关系
  return createPortal(modalContent, document.body);
}

/**
 * 模态窗口Hook，提供模态窗口状态管理
 */
export function useConfigModal() {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen(prev => !prev), []);
  
  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen
  };
}

export default ConfigFormModal;