import React from 'react';
import { PayrollDetailModal } from './PayrollDetailModal';
import { ClearPayrollModal } from './ClearPayrollModal';
import { BatchApprovalProgressModal, calculateBatchSummary } from './BatchApprovalProgressModal';
import { PayrollCompletenessModal } from './PayrollCompletenessModal';
import { BatchConfirmModal } from '@/components/common/ConfirmModal';
import { PayrollElement, PAYROLL_ELEMENTS_CONFIG } from '@/types/payroll-completeness';
import type { PayrollPeriodCompleteness } from '@/types/payroll-completeness';
import type { BatchApprovalItem } from '@/components/payroll/BatchApprovalProgressModal';

// 详情模态框配置接口
interface DetailModalConfig {
  isOpen: boolean;
  payrollId?: string | null;
  onClose: () => void;
}

// 清空确认模态框配置接口
interface ClearModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  periodId: string;
  onConfirm: (onProgress?: (step: string, completed: number, total: number) => void) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// 批量操作模态框配置接口（来自useBatchOperationsManager）
interface BatchModalsConfig {
  // 提交审批确认模态框
  submitConfirm: {
    open: boolean;
    loading: boolean;
    onConfirm: () => void;
    onClose: () => void;
    selectedCount: number;
  };
  
  // 提交审批进度模态框
  submitProgress: {
    open: boolean;
    items: BatchApprovalItem[];
    currentItemId?: string;
    totalProgress: number;
    allowCancel: boolean;
    onClose: () => void;
    onCancel: () => void;
  };
  
  // 计算进度模态框
  calculationProgress: {
    open: boolean;
    type: 'insurance' | 'payroll';
    items: BatchApprovalItem[];
    currentItemId?: string;
    totalProgress: number;
    allowCancel: boolean;
    onClose: () => void;
    onCancel: () => void;
  };
}

// 完整度模态框配置接口
interface CompletenessModalConfig {
  isOpen: boolean;
  completeness: PayrollPeriodCompleteness | null;
  focusedElement?: PayrollElement;
  onClose: () => void;
  onElementClick: (element: PayrollElement) => void;
  onViewMissingEmployees: (element: PayrollElement) => Promise<void>;
}

// 缺失员工模态框状态接口
interface MissingEmployeesModalState {
  isOpen: boolean;
  element?: PayrollElement;
  employeeNames: string[];
  onClose: () => void;
}

// 组件Props接口
export interface PayrollModalManagerProps {
  // 详情模态框
  detailModal: DetailModalConfig;
  
  // 清空确认模态框
  clearModal: ClearModalConfig;
  
  // 批量操作模态框（来自useBatchOperationsManager Hook）
  batchModals: BatchModalsConfig;
  
  // 完整度模态框
  completenessModal: CompletenessModalConfig;
  
  // 缺失员工模态框状态
  missingEmployeesModal: MissingEmployeesModalState;
}

/**
 * 薪资模态框管理组件
 * 
 * 统一管理PayrollListPage中的所有模态框，包括：
 * - 薪资详情模态框（PayrollDetailModal）
 * - 清空确认模态框（ClearPayrollModal）
 * - 批量操作进度模态框（BatchApprovalProgressModal）
 * - 完整度统计模态框（PayrollCompletenessModal）
 * - 缺失员工详情模态框
 * 
 * 优化特点：
 * - 统一的接口设计，降低主组件复杂度
 * - 正确的z-index管理，防止模态框冲突
 * - 完整的TypeScript类型支持
 * - 支持键盘导航（ESC关闭等）
 */
export function PayrollModalManager({
  detailModal,
  clearModal,
  batchModals,
  completenessModal,
  missingEmployeesModal
}: PayrollModalManagerProps) {
  
  return (
    <>
      {/* 薪资详情模态框 */}
      <PayrollDetailModal
        payrollId={detailModal.payrollId || null}
        open={detailModal.isOpen}
        onClose={detailModal.onClose}
      />
      
      {/* 清空当月数据确认模态框 */}
      <ClearPayrollModal
        isOpen={clearModal.isOpen}
        month={clearModal.title}
        periodId={clearModal.periodId}
        onConfirm={clearModal.onConfirm}
        onCancel={clearModal.onCancel}
      />
      
      {/* 批量提交审批确认模态框 */}
      <BatchConfirmModal
        open={batchModals.submitConfirm.open}
        action="提交审批"
        selectedCount={batchModals.submitConfirm.selectedCount}
        variant="primary"
        loading={batchModals.submitConfirm.loading}
        onConfirm={batchModals.submitConfirm.onConfirm}
        onClose={batchModals.submitConfirm.onClose}
      />
      
      {/* 批量提交审批进度模态框 */}
      <BatchApprovalProgressModal
        isOpen={batchModals.submitProgress.open}
        onClose={batchModals.submitProgress.onClose}
        title="批量提交审批"
        operationType="approve"
        items={batchModals.submitProgress.items}
        currentItemId={batchModals.submitProgress.currentItemId}
        totalProgress={batchModals.submitProgress.totalProgress}
        allowCancel={batchModals.submitProgress.allowCancel}
        onCancel={batchModals.submitProgress.onCancel}
        summary={batchModals.submitProgress.items.length > 0 ? calculateBatchSummary(batchModals.submitProgress.items) : undefined}
      />
      
      {/* 批量计算进度模态框 */}
      <BatchApprovalProgressModal
        isOpen={batchModals.calculationProgress.open}
        onClose={batchModals.calculationProgress.onClose}
        title={batchModals.calculationProgress.type === 'insurance' ? '批量计算五险一金' : '批量计算薪资汇总'}
        operationType={batchModals.calculationProgress.type === 'insurance' ? 'approve' : 'markPaid'}
        items={batchModals.calculationProgress.items}
        currentItemId={batchModals.calculationProgress.currentItemId}
        totalProgress={batchModals.calculationProgress.totalProgress}
        allowCancel={batchModals.calculationProgress.allowCancel}
        onCancel={batchModals.calculationProgress.onCancel}
      />
      
      {/* 四要素完整度详情模态框 */}
      <PayrollCompletenessModal
        isOpen={completenessModal.isOpen}
        onClose={completenessModal.onClose}
        completeness={completenessModal.completeness}
        focusedElement={completenessModal.focusedElement}
        onClearFocus={() => completenessModal.onElementClick(undefined as any)}
        onViewDetails={completenessModal.onElementClick}
        onViewMissingEmployees={completenessModal.onViewMissingEmployees}
      />
      
      {/* 缺失员工详情模态框 */}
      {missingEmployeesModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-base-100 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* 标题栏 */}
            <div className="flex items-center justify-between p-6 border-b border-base-200">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-2xl">
                    {missingEmployeesModal.element && PAYROLL_ELEMENTS_CONFIG[missingEmployeesModal.element] && (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </span>
                  缺失员工名单
                </h2>
                <p className="text-sm text-base-content/60 mt-1">
                  {missingEmployeesModal.element && PAYROLL_ELEMENTS_CONFIG[missingEmployeesModal.element]?.displayName} - 
                  缺失 {missingEmployeesModal.employeeNames.length} 名员工的数据
                </p>
              </div>
              <button
                onClick={missingEmployeesModal.onClose}
                className="btn btn-ghost btn-circle"
                aria-label="关闭模态框"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* 员工名单 */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {missingEmployeesModal.employeeNames.map((employeeName, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 border border-error/30 bg-error/5 rounded-lg"
                  >
                    <svg className="w-5 h-5 text-error flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-medium text-error-content">{employeeName}</span>
                  </div>
                ))}
              </div>
              
              {missingEmployeesModal.employeeNames.length === 0 && (
                <div className="text-center py-8 text-base-content/60">
                  <svg className="w-16 h-16 mx-auto mb-4 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.485 0-4.735.847-6.56 2.264" />
                  </svg>
                  <p>暂无缺失员工数据</p>
                </div>
              )}
            </div>
            
            {/* 底部操作栏 */}
            <div className="flex justify-end gap-2 p-6 border-t border-base-200">
              <button
                onClick={missingEmployeesModal.onClose}
                className="btn btn-ghost"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 便捷的Hook接口适配器函数
// 将useBatchOperationsManager的返回值转换为PayrollModalManager需要的格式
export function createBatchModalsConfig(
  batchManager: any,
  selectedCount: number
): BatchModalsConfig {
  return {
    submitConfirm: {
      open: batchManager.confirmModal.open && batchManager.confirmModal.type === 'submit',
      loading: batchManager.confirmModal.loading,
      onConfirm: () => {/* 由调用方处理 */},
      onClose: () => batchManager.setConfirmModal((prev: any) => ({ ...prev, open: false, loading: false })),
      selectedCount
    },
    
    submitProgress: {
      open: batchManager.submitProgressModal.open,
      items: batchManager.submitProgressModal.items,
      currentItemId: batchManager.submitProgressModal.currentItemId,
      totalProgress: batchManager.submitProgressModal.totalProgress,
      allowCancel: batchManager.submitProgressModal.allowCancel,
      onClose: batchManager.closeSubmitProgressModal,
      onCancel: batchManager.cancelSubmitOperation
    },
    
    calculationProgress: {
      open: batchManager.calculationProgressModal.open,
      type: batchManager.calculationProgressModal.type,
      items: batchManager.calculationProgressModal.items,
      currentItemId: batchManager.calculationProgressModal.currentItemId,
      totalProgress: batchManager.calculationProgressModal.totalProgress,
      allowCancel: batchManager.calculationProgressModal.allowCancel,
      onClose: batchManager.closeCalculationProgressModal,
      onCancel: () => batchManager.setCalculationProgressModal((prev: any) => ({ ...prev, open: false, allowCancel: false }))
    }
  };
}

export default PayrollModalManager;