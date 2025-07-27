import React from 'react';
import { cn } from '@/lib/utils';

export interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
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
            <span className="inline-flex items-center">{icon}</span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className="inline-flex items-center">{icon}</span>
          )}
        </>
      )}
    </button>
  );
}