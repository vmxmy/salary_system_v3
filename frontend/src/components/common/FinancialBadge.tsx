import React from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

export interface FinancialBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * DaisyUI 徽章变体 + 财务状态扩展
   */
  variant?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'ghost' |
            'success' | 'warning' | 'error' | 'info' |
            'profit' | 'loss' | 'pending' | 'approved' | 'rejected' |
            'active' | 'inactive' | 'probation' | 'leave' |
            'critical' | 'high' | 'medium' | 'low';
  
  /**
   * DaisyUI 徽章尺寸
   */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  
  /**
   * 徽章内容
   */
  children: React.ReactNode;
  
  /**
   * 是否显示图标
   */
  showIcon?: boolean;
  
  /**
   * 自定义图标
   */
  icon?: React.ReactNode;
  
  /**
   * 是否可点击
   */
  clickable?: boolean;
  
  /**
   * 点击回调
   */
  onClick?: () => void;
}

/**
 * 获取状态对应的现代化SVG图标
 */
const getStatusIcon = (variant: string) => {
  const icons = {
    profit: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
      </svg>
    ),
    loss: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
      </svg>
    ),
    pending: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    approved: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    rejected: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    active: (
      <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
    ),
    inactive: (
      <div className="w-2 h-2 border border-current rounded-full opacity-60"></div>
    ),
    probation: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    leave: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
    critical: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    high: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    medium: (
      <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
    ),
    low: (
      <div className="w-1.5 h-1.5 border border-current rounded-full opacity-50"></div>
    ),
  };
  
  return icons[variant as keyof typeof icons] || null;
};

/**
 * 获取DaisyUI徽章变体类名
 */
const getBadgeVariant = (variant: string) => {
  // 标准DaisyUI变体
  const daisyVariants: Record<string, string> = {
    primary: 'badge-primary',
    secondary: 'badge-secondary', 
    accent: 'badge-accent',
    neutral: 'badge-neutral',
    ghost: 'badge-ghost',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    info: 'badge-info',
  };

  // 财务状态映射到DaisyUI语义化变体
  const financialVariants: Record<string, string> = {
    profit: 'badge-success',
    approved: 'badge-success',
    active: 'badge-success',
    
    loss: 'badge-error',
    rejected: 'badge-error',
    critical: 'badge-error',
    
    pending: 'badge-warning',
    probation: 'badge-warning',
    high: 'badge-warning',
    
    leave: 'badge-info',
    medium: 'badge-info',
    
    inactive: 'badge-neutral',
    low: 'badge-neutral',
  };

  return daisyVariants[variant] || financialVariants[variant] || 'badge-neutral';
};

/**
 * 获取DaisyUI徽章尺寸类名
 */
const getBadgeSize = (size: string) => {
  const sizeMap: Record<string, string> = {
    xs: 'badge-xs',
    sm: 'badge-sm', 
    md: '', // 默认尺寸
    lg: 'badge-lg',
  };
  return sizeMap[size] || '';
};

/**
 * FinancialBadge - 基于DaisyUI 5的财务状态徽章组件
 */
export const FinancialBadge: React.FC<FinancialBadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'sm',
  children,
  showIcon = false,
  icon,
  clickable = false,
  onClick,
  ...props
}) => {
  const Component = clickable ? 'button' : 'span';
  const statusIcon = icon || (showIcon ? getStatusIcon(variant) : null);
  
  return (
    <Component
      className={cn(
        'badge',
        getBadgeVariant(variant),
        getBadgeSize(size),
        'inline-flex items-center gap-1 font-medium transition-all duration-200',
        clickable && 'cursor-pointer hover:scale-105 active:scale-95',
        clickable && 'focus:outline-none focus:ring-2 focus:ring-primary/20',
        // 关键状态的动画效果
        variant === 'critical' && 'animate-pulse',
        className
      )}
      onClick={clickable ? onClick : undefined}
      {...props}
    >
      {/* 图标 */}
      {statusIcon && (
        <span className="flex items-center justify-center flex-shrink-0" aria-hidden="true">
          {statusIcon}
        </span>
      )}
      
      {/* 文本内容 */}
      <span className="truncate">{children}</span>
    </Component>
  );
};

/**
 * 预定义的财务徽章组件
 */
export const ProfitBadge: React.FC<Omit<FinancialBadgeProps, 'variant'>> = (props) => (
  <FinancialBadge variant="profit" showIcon {...props} />
);

export const LossBadge: React.FC<Omit<FinancialBadgeProps, 'variant'>> = (props) => (
  <FinancialBadge variant="loss" showIcon {...props} />
);

export const PendingBadge: React.FC<Omit<FinancialBadgeProps, 'variant'>> = (props) => (
  <FinancialBadge variant="pending" showIcon {...props} />
);

export const ApprovedBadge: React.FC<Omit<FinancialBadgeProps, 'variant'>> = (props) => (
  <FinancialBadge variant="approved" showIcon {...props} />
);

export const RejectedBadge: React.FC<Omit<FinancialBadgeProps, 'variant'>> = (props) => (
  <FinancialBadge variant="rejected" showIcon {...props} />
);

/**
 * 员工状态徽章
 */
export const EmployeeStatusBadge: React.FC<{
  status: 'active' | 'inactive' | 'probation' | 'leave';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ status, size = 'sm', className }) => {
  const { t } = useTranslation(['employee']);
  const labels = {
    active: t('employee:status.active'),
    inactive: t('employee:status.inactive'),
    probation: t('employee:status.probation'),
    leave: t('employee:status.leave'),
  };

  return (
    <FinancialBadge
      variant={status}
      size={size}
      showIcon
      className={className}
    >
      {labels[status]}
    </FinancialBadge>
  );
};

/**
 * 薪资状态徽章
 */
export const SalaryStatusBadge: React.FC<{
  status: 'profit' | 'loss' | 'pending' | 'approved' | 'rejected';
  amount?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ status, amount, size = 'sm', className }) => {
  const { t } = useTranslation(['finance']);
  const labels = {
    profit: t('finance:status.profit'),
    loss: t('finance:status.loss'),
    pending: t('finance:status.pending'),
    approved: t('finance:status.approved'),
    rejected: t('finance:status.rejected'),
  };

  return (
    <FinancialBadge
      variant={status}
      size={size}
      showIcon
      className={className}
    >
      {amount !== undefined ? `${labels[status]} ¥${amount.toLocaleString()}` : labels[status]}
    </FinancialBadge>
  );
};

/**
 * 优先级徽章
 */
export const PriorityBadge: React.FC<{
  priority: 'critical' | 'high' | 'medium' | 'low';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ priority, size = 'xs', className }) => {
  const { t } = useTranslation(['common']);
  const labels = {
    critical: t('common:priority.critical'),
    high: t('common:priority.high'),
    medium: t('common:priority.medium'),
    low: t('common:priority.low'),
  };

  return (
    <FinancialBadge
      variant={priority}
      size={size}
      showIcon
      className={className}
    >
      {labels[priority]}
    </FinancialBadge>
  );
};

export default FinancialBadge;