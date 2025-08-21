import React from 'react';
import type { Database } from '@/types/supabase';

type PayrollStatus = Database['public']['Enums']['payroll_status'];

interface PayrollStatusBadgeProps {
  status: PayrollStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * 薪资状态徽章组件
 * 与薪资审批页面使用相同的样式和颜色映射
 */
export const PayrollStatusBadge: React.FC<PayrollStatusBadgeProps> = ({
  status,
  size = 'sm',
  className = ''
}) => {
  // 状态标签映射
  const getStatusLabel = (status: PayrollStatus) => {
    const labels: Record<string, string> = {
      draft: '草稿',
      calculating: '计算中',
      calculated: '已计算',
      approved: '已审批',
      paid: '已发放',
      cancelled: '已取消',
    };
    return labels[status] || status;
  };

  // 状态颜色映射（与 usePayrollApproval 保持一致）
  const getStatusColor = (status: PayrollStatus) => {
    const colors: Record<string, string> = {
      draft: 'warning',        // 草稿 - 黄色警告
      calculating: 'info',     // 计算中 - 蓝色信息
      calculated: 'primary',   // 已计算 - 主色调
      approved: 'success',     // 已审批 - 绿色成功
      paid: 'accent',          // 已发放 - 强调色
      cancelled: 'error',      // 已取消 - 红色错误
    };
    return colors[status] || 'neutral';
  };

  const badgeClass = `badge badge-${getStatusColor(status)} badge-${size} ${className}`;

  return (
    <span className={badgeClass}>
      {getStatusLabel(status)}
    </span>
  );
};

export default PayrollStatusBadge;