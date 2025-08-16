import { useState, useCallback } from 'react';

interface ConfirmDialogState {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  onConfirm?: () => void | Promise<void>;
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>({
    open: false,
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const showConfirm = useCallback((options: Omit<ConfirmDialogState, 'open'>) => {
    return new Promise<boolean>((resolve) => {
      setState({
        ...options,
        open: true,
        onConfirm: async () => {
          setLoading(true);
          try {
            if (options.onConfirm) {
              await options.onConfirm();
            }
            resolve(true);
            setState(prev => ({ ...prev, open: false }));
          } catch (error) {
            console.error('Confirm action failed:', error);
            // Keep dialog open on error
            setLoading(false);
            throw error;
          } finally {
            setLoading(false);
          }
        },
      });
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setState(prev => ({ ...prev, open: false }));
    setLoading(false);
  }, []);

  const confirmDelete = useCallback((entityName: string, onConfirm?: () => void | Promise<void>) => {
    return showConfirm({
      title: '确认删除',
      message: `确定要删除${entityName}吗？删除后可以在回收站中恢复。`,
      confirmText: '删除',
      cancelText: '取消',
      confirmVariant: 'error',
      onConfirm,
    });
  }, [showConfirm]);

  const confirmAction = useCallback((
    message: string,
    onConfirm?: () => void | Promise<void>,
    options?: {
      title?: string;
      confirmText?: string;
      cancelText?: string;
      confirmVariant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    }
  ) => {
    return showConfirm({
      title: options?.title || '确认操作',
      message,
      confirmText: options?.confirmText || '确认',
      cancelText: options?.cancelText || '取消',
      confirmVariant: options?.confirmVariant || 'primary',
      onConfirm,
    });
  }, [showConfirm]);

  return {
    dialogState: state,
    loading,
    showConfirm,
    hideConfirm,
    confirmDelete,
    confirmAction,
  };
}