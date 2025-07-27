import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string | undefined;
  children?: React.ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

/**
 * StatusBadge - 员工状态徽章组件 
 * 使用标准DaisyUI 5徽章系统
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  className,
  size = 'sm',
  showIcon = true,
  ...props
}) => {
  // 根据状态返回对应的DaisyUI语义化徽章类名
  const getStatusBadgeClass = (status: string | undefined) => {
    switch (status) {
      case 'active':
      case '在职':
        return 'badge badge-success';
      case 'inactive':
      case '离职':
        return 'badge badge-neutral';
      case 'probation':
      case '试用期':
        return 'badge badge-warning';
      case 'leave':
      case '休假':
        return 'badge badge-info';
      case 'terminated':
      case '终止':
        return 'badge badge-error';
      default:
        return 'badge badge-ghost';
    }
  };

  // 获取尺寸类名
  const getSizeClass = (size: string) => {
    const sizeMap: Record<string, string> = {
      xs: 'badge-xs',
      sm: 'badge-sm',
      md: '', // 默认尺寸
      lg: 'badge-lg',
    };
    return sizeMap[size] || '';
  };

  // 获取状态图标
  const getStatusIcon = (status: string | undefined) => {
    if (!showIcon) return null;
    
    switch (status) {
      case 'active':
      case '在职':
        return <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>;
      case 'inactive':
      case '离职':
        return <div className="w-2 h-2 border border-current rounded-full opacity-60"></div>;
      case 'probation':
      case '试用期':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'leave':
      case '休假':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'terminated':
      case '终止':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const statusIcon = getStatusIcon(status);

  return (
    <span
      className={cn(
        getStatusBadgeClass(status),
        getSizeClass(size),
        'inline-flex items-center gap-1',
        className
      )}
      {...props}
    >
      {statusIcon && (
        <span className="flex items-center justify-center flex-shrink-0" aria-hidden="true">
          {statusIcon}
        </span>
      )}
      <span className="truncate">
        {children || status || '-'}
      </span>
    </span>
  );
};

export default StatusBadge;