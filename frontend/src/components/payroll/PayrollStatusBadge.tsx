import { cn } from '@/lib/utils';
import { PayrollStatus, type PayrollStatusType } from '@/hooks/payroll';
import { useTranslation } from '@/hooks/useTranslation';

interface PayrollStatusBadgeProps {
  status: PayrollStatusType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function PayrollStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className
}: PayrollStatusBadgeProps) {
  const { t } = useTranslation('payroll');
  
  // 确保 status 是有效的状态值
  const validStatuses = Object.values(PayrollStatus);
  const safeStatus = validStatuses.includes(status) ? status : PayrollStatus.DRAFT;

  // 状态配置
  const statusConfig = {
    [PayrollStatus.DRAFT]: {
      variant: 'info' as const,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    [PayrollStatus.CALCULATING]: {
      variant: 'warning' as const,
      icon: (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    },
    [PayrollStatus.CALCULATED]: {
      variant: 'info' as const,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    [PayrollStatus.PENDING]: {
      variant: 'warning' as const,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    [PayrollStatus.APPROVED]: {
      variant: 'success' as const,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    [PayrollStatus.PAID]: {
      variant: 'success' as const,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    [PayrollStatus.CANCELLED]: {
      variant: 'error' as const,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  };

  const config = statusConfig[safeStatus];
  if (!config) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  // DaisyUI 5 标准徽章样式
  const getBadgeClass = (variant: string) => {
    switch (variant) {
      case 'info': return 'badge badge-info';
      case 'warning': return 'badge badge-warning';
      case 'success': return 'badge badge-success';
      case 'error': return 'badge badge-error';
      default: return 'badge';
    }
  };

  return (
    <span 
      className={cn(
        getBadgeClass(config.variant),
        sizeClasses[size],
        'inline-flex items-center gap-1.5 font-medium',
        className
      )}
    >
      {showIcon && config.icon}
      {t(`status.${safeStatus}`)}
    </span>
  );
}