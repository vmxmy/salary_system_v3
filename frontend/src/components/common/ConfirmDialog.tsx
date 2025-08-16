import { useEffect, useRef } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  confirmVariant = 'error',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!loading) {
      await onConfirm();
    }
  };

  const getButtonClass = () => {
    const baseClass = 'btn';
    switch (confirmVariant) {
      case 'primary':
        return `${baseClass} btn-primary`;
      case 'secondary':
        return `${baseClass} btn-secondary`;
      case 'success':
        return `${baseClass} btn-success`;
      case 'warning':
        return `${baseClass} btn-warning`;
      case 'error':
        return `${baseClass} btn-error`;
      default:
        return `${baseClass} btn-primary`;
    }
  };

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {confirmVariant === 'error' && (
            <ExclamationTriangleIcon className="w-6 h-6 text-error" />
          )}
          <h3 className="font-bold text-lg">{title}</h3>
          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={onCancel}
            disabled={loading}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <p className="py-4 text-base-content/80">{message}</p>

        {/* Actions */}
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={getButtonClass()}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <span className="loading loading-spinner loading-sm" />}
            {confirmText}
          </button>
        </div>
      </div>
      
      {/* Backdrop */}
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onCancel} disabled={loading}>
          close
        </button>
      </form>
    </dialog>
  );
}