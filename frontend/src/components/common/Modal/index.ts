/**
 * 模态框组件统一导出
 * 
 * 包含：
 * - AlertModal: 替代alert()的提示模态框
 * - ConfirmModal: 替代confirm()的确认模态框
 * - 相应的Hook方法
 */

export { AlertModal, useAlertModal } from './AlertModal';
export type { AlertModalProps } from './AlertModal';

export { ConfirmModal, useConfirmModal } from './ConfirmModal';
export type { ConfirmModalProps } from './ConfirmModal';

// 导入hooks用于useModal
import { useAlertModal } from './AlertModal';
import { useConfirmModal } from './ConfirmModal';

// 全局模态框Hook - 可以在应用的任何地方使用
export function useModal() {
  const alert = useAlertModal();
  const confirm = useConfirmModal();

  return {
    // Alert相关
    showAlert: alert.showAlert,
    showSuccess: alert.showSuccess,
    showError: alert.showError,
    showWarning: alert.showWarning,
    showInfo: alert.showInfo,
    
    // Confirm相关
    showConfirm: confirm.showConfirm,
    confirmDelete: confirm.confirmDelete,
    confirmAction: confirm.confirmAction,

    // 模态框组件（需要放在JSX中）
    AlertModal: alert.AlertModal,
    ConfirmModal: confirm.ConfirmModal
  };
}