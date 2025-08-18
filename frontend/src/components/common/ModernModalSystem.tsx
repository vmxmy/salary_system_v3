import { useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

// 现代化模态框尺寸系统
export const modalSizes = {
  xs: 'max-w-sm',     // 320px - 确认对话框
  sm: 'max-w-md',     // 448px - 简单表单
  md: 'max-w-lg',     // 512px - 中等表单
  lg: 'max-w-2xl',    // 672px - 详情查看
  xl: 'max-w-4xl',    // 896px - 复杂表单
  '2xl': 'max-w-6xl', // 1152px - 数据表格
  '3xl': 'max-w-7xl', // 1280px - 仪表板
  full: 'max-w-[95vw] max-h-[95vh]' // 全屏模式
} as const;

// 响应式高度系统
export const modalHeights = {
  auto: 'max-h-fit',
  compact: 'max-h-[60vh]',
  standard: 'max-h-[80vh]',
  tall: 'max-h-[90vh]',
  full: 'max-h-[95vh]'
} as const;

// 现代化模态框变体
export const modalVariants = {
  default: {
    header: 'bg-gradient-to-r from-base-200/50 to-base-100/30',
    border: 'border-base-300/60',
    backdrop: 'bg-black/40 backdrop-blur-sm'
  },
  success: {
    header: 'bg-gradient-to-r from-success/10 via-success/5 to-transparent',
    border: 'border-success/30 shadow-success/10',
    backdrop: 'bg-black/40 backdrop-blur-sm'
  },
  warning: {
    header: 'bg-gradient-to-r from-warning/10 via-warning/5 to-transparent',
    border: 'border-warning/30 shadow-warning/10',
    backdrop: 'bg-black/40 backdrop-blur-sm'
  },
  error: {
    header: 'bg-gradient-to-r from-error/10 via-error/5 to-transparent',
    border: 'border-error/30 shadow-error/10',
    backdrop: 'bg-black/40 backdrop-blur-sm'
  },
  info: {
    header: 'bg-gradient-to-r from-info/10 via-info/5 to-transparent',
    border: 'border-info/30 shadow-info/10',
    backdrop: 'bg-black/40 backdrop-blur-sm'
  }
} as const;

// 动画配置
export const modalAnimations = {
  fast: 'duration-150 ease-out',
  normal: 'duration-300 ease-out',
  slow: 'duration-500 ease-out'
} as const;

interface ModernModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  
  // 标题区域配置
  title?: string;
  subtitle?: string;
  headerIcon?: ReactNode;
  headerActions?: ReactNode;
  
  // 布局配置
  size?: keyof typeof modalSizes;
  height?: keyof typeof modalHeights;
  variant?: keyof typeof modalVariants;
  
  // 行为配置
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  preventScroll?: boolean;
  
  // 页脚配置
  footer?: ReactNode;
  footerSticky?: boolean;
  
  // 动画配置
  animation?: keyof typeof modalAnimations;
  
  // 可访问性
  ariaLabel?: string;
  ariaDescribedBy?: string;
  role?: string;
}

export function ModernModal({
  open,
  onClose,
  children,
  title,
  subtitle,
  headerIcon,
  headerActions,
  size = 'lg',
  height = 'standard',
  variant = 'default',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  preventScroll = true,
  footer,
  footerSticky = false,
  animation = 'normal',
  ariaLabel,
  ariaDescribedBy,
  role = 'dialog'
}: ModernModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // 处理模态框显示/隐藏状态
  useEffect(() => {
    if (open) {
      setIsMounted(true);
      setTimeout(() => setIsVisible(true), 50); // 延迟显示以确保平滑动画
      if (preventScroll) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      setIsVisible(false);
      if (preventScroll) {
        document.body.style.overflow = '';
      }
      // 等待动画完成后卸载
      setTimeout(() => setIsMounted(false), 300);
    }

    return () => {
      if (preventScroll) {
        document.body.style.overflow = '';
      }
    };
  }, [open, preventScroll]);

  // ESC键关闭
  useEffect(() => {
    if (!closeOnEscape || !open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeOnEscape, open, onClose]);

  // 焦点管理
  useEffect(() => {
    if (open && dialogRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      firstElement?.focus();
    }
  }, [open]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  }, [closeOnBackdrop, onClose]);

  if (!isMounted) return null;

  const variantStyles = modalVariants[variant];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'transition-all', modalAnimations[animation],
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        variantStyles.backdrop
      )}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <dialog
        ref={dialogRef}
        className={cn(
          'modal-box relative w-full p-0 overflow-hidden',
          'bg-base-100 shadow-2xl rounded-2xl border',
          modalSizes[size],
          modalHeights[height],
          variantStyles.border,
          'transform transition-all', modalAnimations[animation],
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        )}
        role={role}
        aria-label={ariaLabel || title}
        aria-describedby={ariaDescribedBy}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 现代化头部 */}
        {(title || headerIcon || headerActions || showCloseButton) && (
          <div className={cn(
            'px-6 py-4 border-b border-base-300/60',
            'backdrop-blur-sm',
            variantStyles.header
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* 图标容器 */}
                {headerIcon && (
                  <div className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-xl',
                    'flex items-center justify-center',
                    'bg-gradient-to-br from-primary/20 to-primary/10',
                    'border border-primary/30 text-primary',
                    'shadow-sm'
                  )}>
                    {headerIcon}
                  </div>
                )}
                
                {/* 标题区域 */}
                <div className="min-w-0 flex-1">
                  {title && (
                    <h2 className="text-xl font-bold text-base-content truncate leading-tight">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-sm text-base-content/70 mt-1 line-clamp-2 leading-relaxed">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* 头部操作区域 */}
              <div className="flex items-center gap-2 ml-4">
                {headerActions}
                {showCloseButton && (
                  <button
                    type="button"
                    className={cn(
                      'btn btn-sm btn-circle btn-ghost',
                      'hover:bg-base-200 transition-colors duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50'
                    )}
                    onClick={onClose}
                    aria-label="关闭对话框"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 内容区域 */}
        <div className={cn(
          'flex-1 overflow-hidden',
          footer && !footerSticky ? 'pb-0' : 'pb-6'
        )}>
          <div className="h-full overflow-y-auto">
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>

        {/* 现代化页脚 */}
        {footer && (
          <div className={cn(
            'border-t border-base-300/60',
            'bg-gradient-to-r from-base-100/80 to-base-100/40',
            'backdrop-blur-sm px-6 py-4',
            footerSticky && 'sticky bottom-0'
          )}>
            {footer}
          </div>
        )}
      </dialog>
    </div>
  );
}

// 响应式模态框包装器
interface ResponsiveModalWrapperProps extends ModernModalProps {
  mobileFullscreen?: boolean;
  tabletSize?: keyof typeof modalSizes;
}

export function ResponsiveModalWrapper({
  size = 'lg',
  mobileFullscreen = true,
  tabletSize = 'lg',
  ...props
}: ResponsiveModalWrapperProps) {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 768) {
        setScreenSize('mobile');
      } else if (window.innerWidth < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const responsiveSize = 
    screenSize === 'mobile' && mobileFullscreen ? 'full' :
    screenSize === 'tablet' ? tabletSize :
    size;

  return (
    <ModernModal
      {...props}
      size={responsiveSize}
    />
  );
}

// 预设模态框组件
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "确认操作",
  message,
  confirmText = "确认",
  cancelText = "取消",
  variant = "warning",
  loading = false,
  icon
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: keyof typeof modalVariants;
  loading?: boolean;
  icon?: ReactNode;
}) {
  const variantIcons = {
    warning: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    error: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    default: null
  };

  const buttonVariants = {
    warning: "btn-warning",
    error: "btn-error", 
    success: "btn-success",
    info: "btn-info",
    default: "btn-primary"
  };

  return (
    <ModernModal
      open={open}
      onClose={onClose}
      size="sm"
      variant={variant}
      title={title}
      headerIcon={icon || variantIcons[variant]}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={cn("btn", buttonVariants[variant])}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <span className="loading loading-spinner loading-sm mr-2" />}
            {confirmText}
          </button>
        </div>
      }
    >
      <div className="text-center space-y-4">
        <p className="text-base-content/80 leading-relaxed text-base">
          {message}
        </p>
      </div>
    </ModernModal>
  );
}