import { useMemo } from 'react';
import { PayrollStatus, payrollFormatters, type PayrollStatusType } from './usePayroll';

// 状态选项类型
export interface StatusOption {
  value: PayrollStatusType | 'all';
  label: string;
  description?: string;
}

/**
 * 薪资状态选项 Hook
 * 基于现有的 PayrollStatus 枚举生成下拉选项
 */
export const usePayrollStatusOptions = () => {
  // 生成状态选项
  const statusOptions = useMemo<StatusOption[]>(() => {
    // 获取所有状态值，按逻辑顺序排列
    const statusOrder: PayrollStatusType[] = [
      PayrollStatus.DRAFT,
      PayrollStatus.CALCULATING, 
      PayrollStatus.CALCULATED,
      PayrollStatus.PENDING,
      PayrollStatus.APPROVED,
      PayrollStatus.PAID,
      PayrollStatus.CANCELLED
    ];

    return statusOrder.map(status => ({
      value: status,
      label: payrollFormatters.status(status),
      description: getStatusDescription(status)
    }));
  }, []);

  // 包含"全部状态"的选项
  const selectOptions = useMemo<StatusOption[]>(() => [
    { 
      value: 'all', 
      label: '全部状态', 
      description: '显示所有状态的薪资记录' 
    },
    ...statusOptions
  ], [statusOptions]);

  return {
    statusOptions,      // 纯状态选项（不含"全部"）
    selectOptions,      // 包含"全部状态"的选项
    getStatusLabel: payrollFormatters.status,
    getStatusDescription
  };
};

/**
 * 获取状态描述
 */
function getStatusDescription(status: PayrollStatusType): string {
  const descriptions: Record<PayrollStatusType, string> = {
    [PayrollStatus.DRAFT]: '薪资记录已创建，尚未进行计算',
    [PayrollStatus.CALCULATING]: '正在进行薪资计算',
    [PayrollStatus.CALCULATED]: '薪资计算完成，可提交审批',
    [PayrollStatus.PENDING]: '已提交审批，等待审批结果',
    [PayrollStatus.APPROVED]: '审批通过，可以发放薪资',
    [PayrollStatus.PAID]: '薪资已发放给员工',
    [PayrollStatus.CANCELLED]: '薪资记录已取消'
  };
  
  return descriptions[status] || '';
}

// 状态颜色映射（可用于 badge 组件）
export const getStatusColor = (status: PayrollStatusType | 'all') => {
  const colorMap: Record<PayrollStatusType | 'all', string> = {
    all: 'default',
    [PayrollStatus.DRAFT]: 'default',
    [PayrollStatus.CALCULATING]: 'warning',
    [PayrollStatus.CALCULATED]: 'info',
    [PayrollStatus.PENDING]: 'warning',
    [PayrollStatus.APPROVED]: 'success',
    [PayrollStatus.PAID]: 'success',
    [PayrollStatus.CANCELLED]: 'error'
  };
  
  return colorMap[status] || 'default';
};