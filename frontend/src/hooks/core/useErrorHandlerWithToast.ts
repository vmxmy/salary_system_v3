import { useErrorHandler, type ToastService } from './useErrorHandler';
import { useToast } from '@/contexts/ToastContext';

/**
 * 与ToastContext集成的错误处理Hook
 * 这是useErrorHandler的封装版本，自动集成Toast通知
 */
export function useErrorHandlerWithToast() {
  const toast = useToast();
  
  // 将ToastContext转换为ToastService接口
  const toastService: ToastService = {
    showSuccess: toast.showSuccess,
    showError: toast.showError,
    showWarning: toast.showWarning,
    showInfo: toast.showInfo
  };

  return useErrorHandler(toastService);
}

// 重新导出类型
export type { ToastService, ErrorHandlerOptions, AppError } from './useErrorHandler';