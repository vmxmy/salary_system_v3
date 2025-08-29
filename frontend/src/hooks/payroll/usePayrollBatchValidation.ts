import { useMemo } from 'react';
import { usePayrollApproval } from './usePayrollApproval';
import type { PayrollStatusType } from './usePayrollTableColumns';
import type { BasePayrollData } from '@/components/payroll/PayrollTableContainer';

// 验证结果接口
export interface ValidationResult {
  canOperate: boolean;
  reason: string;
}

// 批量操作验证结果
export interface BatchValidationResults {
  // 计算相关
  calculateInsurance: ValidationResult;
  calculatePayroll: ValidationResult;
  calculateAll: ValidationResult;
  
  // 审批相关
  approve: ValidationResult;
  markPaid: ValidationResult;
  rollback: ValidationResult;
  submit: ValidationResult;
  cancel: ValidationResult;
  
  // 删除相关
  delete: ValidationResult;
  
  // 通用
  hasSelection: boolean;
  selectedCount: number;
  selectedStatuses: PayrollStatusType[];
}

// 单个记录验证结果
export interface SingleValidationResults {
  canCalculateInsurance: boolean;
  canCalculatePayroll: boolean;
  canApprove: boolean;
  canMarkPaid: boolean;
  canRollback: boolean;
  canCancel: boolean;
  canSubmit: boolean;
  canDelete: boolean;
  nextAction: string;
}

/**
 * 薪资批量操作验证逻辑Hook
 * 统一处理各种批量操作的验证逻辑
 */
export function usePayrollBatchValidation<T extends BasePayrollData = BasePayrollData>(
  selectedIds: string[] = [],
  processedData: T[] = []
) {
  const { utils: approvalUtils } = usePayrollApproval();

  // 获取选中记录的状态
  const selectedRecordsInfo = useMemo(() => {
    if (selectedIds.length === 0) {
      return {
        records: [],
        statuses: [],
        count: 0,
      };
    }

    const selectedRecords = processedData.filter(record => 
      selectedIds.includes(record.id || record.payroll_id || '')
    );

    const selectedStatuses = selectedRecords.map(record => {
      // 获取状态字段，优先使用 status，再使用 payroll_status
      const status = record.status || record.payroll_status;
      return status as PayrollStatusType;
    }).filter(Boolean);

    return {
      records: selectedRecords,
      statuses: selectedStatuses,
      count: selectedRecords.length,
    };
  }, [selectedIds, processedData]);

  // 批量操作验证结果
  const batchValidation: BatchValidationResults = useMemo(() => {
    const { count, statuses } = selectedRecordsInfo;
    
    if (count === 0) {
      const noSelectionResult: ValidationResult = { canOperate: false, reason: '未选择任何记录' };
      return {
        calculateInsurance: noSelectionResult,
        calculatePayroll: noSelectionResult,
        calculateAll: noSelectionResult,
        approve: noSelectionResult,
        markPaid: noSelectionResult,
        rollback: noSelectionResult,
        submit: noSelectionResult,
        cancel: noSelectionResult,
        delete: noSelectionResult,
        hasSelection: false,
        selectedCount: 0,
        selectedStatuses: [],
      };
    }

    return {
      // 计算相关验证
      calculateInsurance: approvalUtils.batchCanCalculateInsurance(statuses),
      calculatePayroll: approvalUtils.batchCanCalculatePayroll(statuses),
      calculateAll: approvalUtils.batchCanCalculateInsurance(statuses), // 使用相同逻辑
      
      // 审批相关验证
      approve: approvalUtils.batchCanApprove(statuses),
      markPaid: approvalUtils.batchCanMarkPaid(statuses),
      rollback: approvalUtils.batchCanRollback(statuses),
      
      // 其他操作（基于基础逻辑）
      submit: { 
        canOperate: statuses.every(status => status === 'calculated'),
        reason: statuses.some(status => status !== 'calculated') 
          ? '选中记录中包含非已计算状态的记录，无法提交审批（仅已计算状态可提交）' 
          : ''
      },
      cancel: { 
        canOperate: statuses.every(status => status !== 'paid' && status !== 'cancelled'),
        reason: statuses.some(status => status === 'paid' || status === 'cancelled') 
          ? '选中记录中包含已发放或已取消的记录，无法取消' 
          : ''
      },
      
      // 删除相关验证 - 草稿和已计算状态的记录可以删除
      delete: { 
        canOperate: statuses.every(status => status === 'draft' || status === 'calculated'),
        reason: statuses.some(status => status !== 'draft' && status !== 'calculated') 
          ? '选中记录中包含已提交审批或更高状态的记录，只能删除草稿或已计算状态的薪资记录' 
          : ''
      },
      
      // 基础信息
      hasSelection: true,
      selectedCount: count,
      selectedStatuses: statuses,
    };
  }, [selectedRecordsInfo, approvalUtils]);

  // 单个记录验证
  const validateSingleRecord = useMemo(() => {
    return (record: T): SingleValidationResults => {
      const status = (record.payroll_status || record.status) as PayrollStatusType;
      
      return {
        canCalculateInsurance: approvalUtils.canCalculateInsurance(status),
        canCalculatePayroll: approvalUtils.canCalculatePayroll(status),
        canApprove: approvalUtils.canApprove(status),
        canMarkPaid: approvalUtils.canMarkPaid(status),
        canRollback: approvalUtils.canRollback(status),
        canCancel: approvalUtils.canCancel(status),
        canSubmit: status === 'calculated', // 只有已计算状态可以提交审批
        canDelete: status === 'draft' || status === 'calculated', // 草稿和已计算状态可以删除
        nextAction: approvalUtils.getNextAction(status),
      };
    };
  }, [approvalUtils]);

  // 便捷验证函数
  const canBatchOperate = useMemo(() => ({
    // 计算操作
    calculateInsurance: () => batchValidation.calculateInsurance.canOperate,
    calculatePayroll: () => batchValidation.calculatePayroll.canOperate,
    calculateAll: () => batchValidation.calculateAll.canOperate,
    
    // 审批操作
    approve: () => batchValidation.approve.canOperate,
    markPaid: () => batchValidation.markPaid.canOperate,
    rollback: () => batchValidation.rollback.canOperate,
    submit: () => batchValidation.submit.canOperate,
    cancel: () => batchValidation.cancel.canOperate,
    
    // 删除操作
    delete: () => batchValidation.delete.canOperate,
  }), [batchValidation]);

  // 获取操作失败原因
  const getOperationReason = useMemo(() => ({
    calculateInsurance: () => batchValidation.calculateInsurance.reason,
    calculatePayroll: () => batchValidation.calculatePayroll.reason,
    calculateAll: () => batchValidation.calculateAll.reason,
    approve: () => batchValidation.approve.reason,
    markPaid: () => batchValidation.markPaid.reason,
    rollback: () => batchValidation.rollback.reason,
    submit: () => batchValidation.submit.reason,
    cancel: () => batchValidation.cancel.reason,
    delete: () => batchValidation.delete.reason,
  }), [batchValidation]);

  // 状态统计
  const statusStats = useMemo(() => {
    const { statuses } = selectedRecordsInfo;
    const stats: Record<string, number> = {};
    
    statuses.forEach(status => {
      stats[status] = (stats[status] || 0) + 1;
    });
    
    return stats;
  }, [selectedRecordsInfo]);

  return {
    // 验证结果
    batchValidation,
    validateSingleRecord,
    
    // 便捷函数
    canBatchOperate,
    getOperationReason,
    
    // 选中信息
    selectedRecordsInfo,
    statusStats,
    
    // 快捷属性
    hasSelection: batchValidation.hasSelection,
    selectedCount: batchValidation.selectedCount,
    selectedStatuses: batchValidation.selectedStatuses,
    
    // 工具函数
    utils: {
      // 检查特定状态的记录数量
      countByStatus: (status: PayrollStatusType) => statusStats[status] || 0,
      
      // 检查是否所有选中记录都是某个状态
      allRecordsAre: (status: PayrollStatusType) => 
        selectedRecordsInfo.statuses.length > 0 && 
        selectedRecordsInfo.statuses.every(s => s === status),
      
      // 检查是否包含某个状态的记录
      hasRecordsWithStatus: (status: PayrollStatusType) => 
        selectedRecordsInfo.statuses.includes(status),
      
      // 获取可执行操作的记录数量
      getOperableCount: (operation: keyof typeof canBatchOperate) => {
        if (operation === 'calculateInsurance' || operation === 'calculateAll') {
          return selectedRecordsInfo.statuses.filter(s => s !== 'calculating').length;
        }
        if (operation === 'calculatePayroll') {
          return selectedRecordsInfo.statuses.filter(s => s !== 'calculating').length;
        }
        if (operation === 'approve') {
          return selectedRecordsInfo.statuses.filter(s => s === 'pending').length;
        }
        if (operation === 'submit') {
          return selectedRecordsInfo.statuses.filter(s => s === 'calculated').length;
        }
        if (operation === 'markPaid') {
          return selectedRecordsInfo.statuses.filter(s => s === 'approved').length;
        }
        if (operation === 'rollback') {
          return selectedRecordsInfo.statuses.filter(s => s === 'approved' || s === 'paid').length;
        }
        if (operation === 'cancel') {
          return selectedRecordsInfo.statuses.filter(s => s !== 'paid' && s !== 'cancelled').length;
        }
        if (operation === 'delete') {
          return selectedRecordsInfo.statuses.filter(s => s === 'draft' || s === 'calculated').length;
        }
        return 0;
      },
    },
  };
}

export default usePayrollBatchValidation;