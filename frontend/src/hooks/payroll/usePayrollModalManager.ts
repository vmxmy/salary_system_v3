import { useState, useCallback } from 'react';
import type { BasePayrollData } from '@/components/payroll/PayrollTableContainer';

// 模态框类型枚举
export type ModalType = 
  | 'detail'
  | 'history'
  | 'edit'
  | 'delete'
  | 'confirm'
  | 'batch-confirm'
  | 'rollback-confirm'
  | 'calculation-progress'
  | 'import'
  | 'export'
  | 'custom';

// 模态框状态接口
export interface ModalState {
  type: ModalType;
  open: boolean;
  loading?: boolean;
  data?: any;
  title?: string;
  subtitle?: string;
}

// 模态框配置接口
export interface ModalConfig {
  type: ModalType;
  title?: string;
  subtitle?: string;
  data?: any;
  loading?: boolean;
}

// 确认模态框特定配置
export interface ConfirmModalConfig {
  action: string;
  selectedCount?: number;
  details?: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'primary';
  onConfirm: () => void | Promise<void>;
}

// 回滚确认模态框配置
export interface RollbackConfirmConfig {
  selectedCount: number;
  onConfirm: (reason: string) => void | Promise<void>;
}

/**
 * 薪资模态框管理Hook
 * 统一管理各种模态框的状态和操作
 */
export function usePayrollModalManager<T extends BasePayrollData = BasePayrollData>() {
  // 模态框状态映射
  const [modals, setModals] = useState<Record<string, ModalState>>({});
  
  // 当前选中的记录
  const [selectedRecord, setSelectedRecord] = useState<T | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // 打开模态框
  const openModal = useCallback((config: ModalConfig) => {
    const modalKey = config.type;
    setModals(prev => ({
      ...prev,
      [modalKey]: {
        type: config.type,
        open: true,
        loading: config.loading || false,
        data: config.data,
        title: config.title,
        subtitle: config.subtitle,
      }
    }));
  }, []);

  // 关闭模态框
  const closeModal = useCallback((type: ModalType) => {
    setModals(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        open: false,
        loading: false,
      }
    }));
  }, []);

  // 更新模态框状态
  const updateModal = useCallback((type: ModalType, updates: Partial<ModalState>) => {
    setModals(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        ...updates,
      }
    }));
  }, []);

  // 设置模态框加载状态
  const setModalLoading = useCallback((type: ModalType, loading: boolean) => {
    updateModal(type, { loading });
  }, [updateModal]);

  // 关闭所有模态框
  const closeAllModals = useCallback(() => {
    setModals(prev => {
      const updated: Record<string, ModalState> = {};
      Object.keys(prev).forEach(key => {
        updated[key] = {
          ...prev[key],
          open: false,
          loading: false,
        };
      });
      return updated;
    });
  }, []);

  // 检查模态框是否打开
  const isModalOpen = useCallback((type: ModalType) => {
    return modals[type]?.open || false;
  }, [modals]);

  // 获取模态框状态
  const getModalState = useCallback((type: ModalType) => {
    return modals[type] || { type, open: false, loading: false };
  }, [modals]);

  // === 特定模态框的便捷方法 ===

  // 薪资详情模态框
  const openDetailModal = useCallback((record: T) => {
    const recordId = record.id || record.payroll_id;
    setSelectedRecord(record);
    setSelectedRecordId(recordId || null);
    openModal({
      type: 'detail',
      title: '薪资详情',
      subtitle: `员工: ${record.employee_name}`,
      data: record,
    });
  }, [openModal]);

  const closeDetailModal = useCallback(() => {
    closeModal('detail');
    setSelectedRecord(null);
    setSelectedRecordId(null);
  }, [closeModal]);

  // 审批历史模态框
  const openHistoryModal = useCallback((periodId?: string) => {
    openModal({
      type: 'history',
      title: '审批历史',
      data: { periodId },
    });
  }, [openModal]);

  const closeHistoryModal = useCallback(() => {
    closeModal('history');
  }, [closeModal]);

  // 确认模态框
  const openConfirmModal = useCallback((config: ConfirmModalConfig) => {
    openModal({
      type: 'confirm',
      title: `确认${config.action}`,
      data: config,
    });
  }, [openModal]);

  const closeConfirmModal = useCallback(() => {
    closeModal('confirm');
  }, [closeModal]);

  // 批量确认模态框
  const openBatchConfirmModal = useCallback((config: ConfirmModalConfig) => {
    openModal({
      type: 'batch-confirm',
      title: `批量${config.action}`,
      data: config,
    });
  }, [openModal]);

  const closeBatchConfirmModal = useCallback(() => {
    closeModal('batch-confirm');
  }, [closeModal]);

  // 回滚确认模态框
  const openRollbackConfirmModal = useCallback((config: RollbackConfirmConfig) => {
    openModal({
      type: 'rollback-confirm',
      title: '确认回滚操作',
      data: config,
    });
  }, [openModal]);

  const closeRollbackConfirmModal = useCallback(() => {
    closeModal('rollback-confirm');
  }, [closeModal]);

  // 计算进度模态框
  const openCalculationProgressModal = useCallback((title: string, steps: any[]) => {
    openModal({
      type: 'calculation-progress',
      title,
      data: { steps },
    });
  }, [openModal]);

  const closeCalculationProgressModal = useCallback(() => {
    closeModal('calculation-progress');
  }, [closeModal]);

  // 自定义模态框
  const openCustomModal = useCallback((key: string, config: Omit<ModalConfig, 'type'>) => {
    const customKey = `custom-${key}`;
    setModals(prev => ({
      ...prev,
      [customKey]: {
        type: 'custom',
        open: true,
        loading: config.loading || false,
        data: config.data,
        title: config.title,
        subtitle: config.subtitle,
      }
    }));
  }, []);

  const closeCustomModal = useCallback((key: string) => {
    const customKey = `custom-${key}`;
    setModals(prev => ({
      ...prev,
      [customKey]: {
        ...prev[customKey],
        open: false,
        loading: false,
      }
    }));
  }, []);

  // === 通用处理函数 ===

  // 处理查看详情
  const handleViewDetail = useCallback((record: T) => {
    openDetailModal(record);
  }, [openDetailModal]);

  // 处理查看详情（通过ID）
  const handleViewDetailById = useCallback((recordId: string, allRecords: T[]) => {
    const record = allRecords.find(r => 
      (r.id || r.payroll_id) === recordId
    );
    if (record) {
      openDetailModal(record);
    }
  }, [openDetailModal]);

  // 处理模态框关闭并可选地触发刷新
  const handleCloseModalWithRefresh = useCallback((
    type: ModalType, 
    onRefresh?: () => void
  ) => {
    closeModal(type);
    if (onRefresh) {
      // 延迟执行刷新，确保模态框完全关闭
      setTimeout(onRefresh, 100);
    }
  }, [closeModal]);

  return {
    // 基础状态
    modals,
    selectedRecord,
    selectedRecordId,
    
    // 基础操作
    openModal,
    closeModal,
    updateModal,
    setModalLoading,
    closeAllModals,
    
    // 查询方法
    isModalOpen,
    getModalState,
    
    // 特定模态框方法
    detail: {
      open: openDetailModal,
      close: closeDetailModal,
      isOpen: () => isModalOpen('detail'),
      state: () => getModalState('detail'),
    },
    
    history: {
      open: openHistoryModal,
      close: closeHistoryModal,
      isOpen: () => isModalOpen('history'),
      state: () => getModalState('history'),
    },
    
    confirm: {
      open: openConfirmModal,
      close: closeConfirmModal,
      isOpen: () => isModalOpen('confirm'),
      state: () => getModalState('confirm'),
    },
    
    batchConfirm: {
      open: openBatchConfirmModal,
      close: closeBatchConfirmModal,
      isOpen: () => isModalOpen('batch-confirm'),
      state: () => getModalState('batch-confirm'),
    },
    
    rollbackConfirm: {
      open: openRollbackConfirmModal,
      close: closeRollbackConfirmModal,
      isOpen: () => isModalOpen('rollback-confirm'),
      state: () => getModalState('rollback-confirm'),
    },
    
    calculationProgress: {
      open: openCalculationProgressModal,
      close: closeCalculationProgressModal,
      isOpen: () => isModalOpen('calculation-progress'),
      state: () => getModalState('calculation-progress'),
    },
    
    custom: {
      open: openCustomModal,
      close: closeCustomModal,
      isOpen: (key: string) => isModalOpen(`custom-${key}` as ModalType),
      state: (key: string) => getModalState(`custom-${key}` as ModalType),
    },
    
    // 便捷处理函数
    handlers: {
      handleViewDetail,
      handleViewDetailById,
      handleCloseModalWithRefresh,
    },
    
    // 工具函数
    utils: {
      // 检查是否有任何模态框打开
      hasOpenModal: () => Object.values(modals).some(modal => modal.open),
      
      // 获取所有打开的模态框
      getOpenModals: () => Object.values(modals).filter(modal => modal.open),
      
      // 检查是否有加载中的模态框
      hasLoadingModal: () => Object.values(modals).some(modal => modal.loading),
      
      // 批量关闭指定类型的模态框
      closeModalsByType: (types: ModalType[]) => {
        types.forEach(type => closeModal(type));
      },
    },
  };
}

export default usePayrollModalManager;