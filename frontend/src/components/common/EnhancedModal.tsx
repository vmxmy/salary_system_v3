import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface EnhancedModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  
  // Header configuration
  title?: string;
  subtitle?: string;
  headerIcon?: ReactNode;
  headerActions?: ReactNode;
  
  // Layout configuration
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  maxHeight?: 'default' | 'screen' | 'compact';
  
  // Visual styling
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  backdrop?: 'blur' | 'dark' | 'transparent';
  
  // Behavior
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
  
  // Footer configuration
  footer?: ReactNode;
  footerVariant?: 'default' | 'compact' | 'actions-only';
  
  // Animation and accessibility
  animationDuration?: 'fast' | 'normal' | 'slow';
  trapFocus?: boolean;
}

export function EnhancedModal({
  open,
  onClose,
  children,
  title,
  subtitle,
  headerIcon,
  headerActions,
  size = 'lg',
  maxHeight = 'default',
  variant = 'default',
  backdrop = 'blur',
  closeOnBackdrop = true,
  closeOnEscape = true,
  preventScroll = true,
  footer,
  footerVariant = 'default',
  animationDuration = 'normal',
  trapFocus = true,
}: EnhancedModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const modalBoxRef = useRef<HTMLDivElement>(null);

  // Size mapping
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-[95vw]'
  };

  // Max height mapping
  const heightClasses = {
    default: 'max-h-[90vh]',
    screen: 'max-h-screen',
    compact: 'max-h-[75vh]'
  };

  // Variant styling
  const variantClasses = {
    default: '',
    success: 'border-success/20 shadow-success/10',
    warning: 'border-warning/20 shadow-warning/10',
    error: 'border-error/20 shadow-error/10',
    info: 'border-info/20 shadow-info/10'
  };

  // Header gradient variants
  const headerVariants = {
    default: 'bg-gradient-to-r from-base-200/50 to-base-200/20',
    success: 'bg-gradient-to-r from-success/10 to-success/5',
    warning: 'bg-gradient-to-r from-warning/10 to-warning/5',
    error: 'bg-gradient-to-r from-error/10 to-error/5',
    info: 'bg-gradient-to-r from-info/10 to-info/5'
  };

  // Animation classes
  const animationClasses = {
    fast: 'duration-150',
    normal: 'duration-300',
    slow: 'duration-500'
  };

  // Backdrop classes
  const backdropClasses = {
    blur: 'backdrop-blur-sm bg-black/30',
    dark: 'bg-black/50',
    transparent: 'bg-black/20'
  };

  // Handle modal opening/closing
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      if (preventScroll) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      dialog.close();
      if (preventScroll) {
        document.body.style.overflow = '';
      }
    }

    return () => {
      if (preventScroll) {
        document.body.style.overflow = '';
      }
    };
  }, [open, preventScroll]);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeOnEscape, open, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <dialog 
      ref={dialogRef}
      className={cn(
        "modal",
        `modal-open ${animationClasses[animationDuration]}`,
        "animate-in fade-in zoom-in-95"
      )}
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalBoxRef}
        className={cn(
          "modal-box relative p-0 overflow-hidden",
          sizeClasses[size],
          heightClasses[maxHeight],
          variantClasses[variant],
          "border border-base-300 shadow-2xl",
          "animate-in slide-in-from-bottom-4 fade-in zoom-in-95"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Enhanced Header */}
        {(title || headerActions || headerIcon) && (
          <div className={cn(
            "px-6 py-4 border-b border-base-300/50",
            headerVariants[variant],
            "backdrop-blur-sm"
          )}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {headerIcon && (
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                    variant === 'default' && "bg-primary/10 text-primary",
                    variant === 'success' && "bg-success/10 text-success",
                    variant === 'warning' && "bg-warning/10 text-warning",
                    variant === 'error' && "bg-error/10 text-error",
                    variant === 'info' && "bg-info/10 text-info"
                  )}>
                    {headerIcon}
                  </div>
                )}
                
                <div className="min-w-0 flex-1">
                  {title && (
                    <h2 className="text-xl font-bold text-base-content truncate">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-sm text-base-content/60 mt-1 line-clamp-2">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                {headerActions}
                <button
                  type="button"
                  className="btn btn-sm btn-circle btn-ghost flex-shrink-0"
                  onClick={onClose}
                  aria-label="关闭对话框"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Area with Optimized Scrolling */}
        <div className="flex-1 overflow-hidden">
          <div className="overflow-y-auto h-full">
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        {footer && (
          <div className={cn(
            "border-t border-base-300/50 bg-base-100/50 backdrop-blur-sm",
            footerVariant === 'compact' && "px-4 py-3",
            footerVariant === 'default' && "px-6 py-4",
            footerVariant === 'actions-only' && "px-6 py-3"
          )}>
            {footer}
          </div>
        )}
      </div>

      {/* Enhanced Backdrop */}
      <div 
        className={cn(
          "modal-backdrop",
          backdropClasses[backdrop],
          animationClasses[animationDuration]
        )}
        onClick={handleBackdropClick}
      />
    </dialog>
  );
}

// Convenience wrapper components for common modal types
export function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title = "确认操作",
  message,
  confirmText = "确认",
  cancelText = "取消",
  variant = "warning",
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'warning' | 'error' | 'info';
  loading?: boolean;
}) {
  const icons = {
    warning: <XMarkIcon className="w-6 h-6" />,
    error: <XMarkIcon className="w-6 h-6" />,
    info: <XMarkIcon className="w-6 h-6" />
  };

  const buttonVariants = {
    warning: "btn-warning",
    error: "btn-error", 
    info: "btn-info"
  };

  return (
    <EnhancedModal
      open={open}
      onClose={onClose}
      size="sm"
      variant={variant}
      title={title}
      headerIcon={icons[variant]}
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
            {loading && <span className="loading loading-spinner loading-sm" />}
            {confirmText}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-base-content/80 leading-relaxed">
          {message}
        </p>
      </div>
    </EnhancedModal>
  );
}

// Form Modal wrapper
export function FormModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  onSubmit,
  submitText = "保存",
  cancelText = "取消",
  loading = false,
  canSubmit = true,
  variant = "default",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onSubmit: () => void | Promise<void>;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  canSubmit?: boolean;
  variant?: 'default' | 'success' | 'info';
}) {
  return (
    <EnhancedModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      variant={variant}
      size="lg"
      footer={
        <div className="flex justify-between items-center">
          <div className="text-sm text-base-content/60">
            请填写完整信息后提交
          </div>
          <div className="flex gap-3">
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
              className="btn btn-primary"
              onClick={onSubmit}
              disabled={loading || !canSubmit}
            >
              {loading && <span className="loading loading-spinner loading-sm" />}
              {submitText}
            </button>
          </div>
        </div>
      }
    >
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-6"
      >
        {children}
      </form>
    </EnhancedModal>
  );
}