import React from 'react';
import { cn } from '@/lib/utils';

export interface FinancialCardProps {
  title: string;
  amount: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

export function FinancialCard({
  title,
  amount,
  subtitle,
  icon,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  onClick
}: FinancialCardProps) {
  const variantClasses = {
    primary: 'border-primary/20 bg-primary/5',
    secondary: 'border-secondary/20 bg-secondary/5',
    success: 'border-success/20 bg-success/5',
    error: 'border-error/20 bg-error/5',
    warning: 'border-warning/20 bg-warning/5',
    info: 'border-info/20 bg-info/5'
  };

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const amountColorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    success: 'text-success',
    error: 'text-error',
    warning: 'text-warning',
    info: 'text-info'
  };

  if (loading) {
    return (
      <div className={cn(
        'card border',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}>
        <div className="card-body">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-base-300 rounded w-1/2"></div>
            <div className="h-8 bg-base-300 rounded w-3/4"></div>
            <div className="h-3 bg-base-300 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'card border transition-all duration-200',
        variantClasses[variant],
        sizeClasses[size],
        onClick && 'cursor-pointer hover:shadow-lg hover:scale-105',
        className
      )}
      onClick={onClick}
    >
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-base-content/70 mb-2">
              {title}
            </h3>
            <div className={cn(
              'text-2xl font-bold mb-1',
              amountColorClasses[variant]
            )}>
              {amount}
            </div>
            {subtitle && (
              <p className="text-sm text-base-content/60">
                {subtitle}
              </p>
            )}
          </div>
          {icon && (
            <div className={cn(
              'flex items-center justify-center w-12 h-12 rounded-lg',
              variantClasses[variant],
              amountColorClasses[variant]
            )}>
              {icon}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}