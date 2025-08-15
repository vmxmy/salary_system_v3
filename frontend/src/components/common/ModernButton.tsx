import React from 'react';
import { cn } from '@/lib/utils';

export interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode | React.ComponentType<any>;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function ModernButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}: ModernButtonProps) {
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-error'
  };

  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  };

  // 智能渲染icon - 处理组件引用和JSX元素
  const renderIcon = () => {
    if (!icon) return null;
    
    // 如果是React组件（函数或类），渲染为JSX元素
    if (typeof icon === 'function') {
      const IconComponent = icon;
      return <IconComponent className="w-4 h-4" />;
    }
    
    // 如果已经是JSX元素或其他React节点，直接返回
    return icon;
  };

  return (
    <button
      className={cn(
        'btn',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="loading loading-spinner loading-sm"></span>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="inline-flex items-center">{renderIcon()}</span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className="inline-flex items-center">{renderIcon()}</span>
          )}
        </>
      )}
    </button>
  );
}