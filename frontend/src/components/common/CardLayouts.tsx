import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Information Display Card
interface InfoCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  className?: string;
}

export function InfoCard({
  title,
  subtitle,
  icon,
  children,
  variant = 'default',
  size = 'md',
  hoverable = false,
  className
}: InfoCardProps) {
  const variantClasses = {
    default: 'bg-base-100 border-base-300',
    primary: 'bg-primary/5 border-primary/20',
    success: 'bg-success/5 border-success/20',
    warning: 'bg-warning/5 border-warning/20',
    error: 'bg-error/5 border-error/20',
    info: 'bg-info/5 border-info/20'
  };

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const iconColors = {
    default: 'text-base-content',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    info: 'text-info'
  };

  return (
    <div className={cn(
      "card border shadow-sm rounded-lg transition-all duration-200",
      variantClasses[variant],
      sizeClasses[size],
      hoverable && "hover:shadow-md hover:scale-[1.01]",
      className
    )}>
      {/* Card Header */}
      <div className="flex items-center gap-3 mb-4">
        {icon && (
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
            variant === 'default' && "bg-base-200",
            variant !== 'default' && `bg-${variant}/10`,
            iconColors[variant]
          )}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-base text-base-content truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-base-content/60 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

// Statistics Card with Enhanced Visuals
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
    direction: 'up' | 'down' | 'neutral';
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  loading = false,
  className
}: StatCardProps) {
  const variantClasses = {
    default: 'from-base-100 to-base-100 border-base-300',
    primary: 'from-primary/10 to-primary/5 border-primary/20',
    success: 'from-success/10 to-success/5 border-success/20',
    warning: 'from-warning/10 to-warning/5 border-warning/20',
    error: 'from-error/10 to-error/5 border-error/20',
    info: 'from-info/10 to-info/5 border-info/20'
  };

  const iconColors = {
    default: 'text-base-content/70',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    info: 'text-info'
  };

  const getTrendIcon = () => {
    if (trend?.direction === 'up') {
      return (
        <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7m0 0H7" />
        </svg>
      );
    }
    if (trend?.direction === 'down') {
      return (
        <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10m0 0h10" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className={cn(
        "stat bg-gradient-to-br border rounded-lg p-6 shadow-sm",
        variantClasses[variant],
        className
      )}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-base-300 rounded w-1/2"></div>
          <div className="h-8 bg-base-300 rounded w-3/4"></div>
          <div className="h-3 bg-base-300 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "stat bg-gradient-to-br border rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200",
      variantClasses[variant],
      className
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="stat-title text-sm font-medium text-base-content/70">
          {title}
        </div>
        {icon && (
          <div className={cn("stat-figure", iconColors[variant])}>
            {icon}
          </div>
        )}
      </div>

      <div className="stat-value text-2xl font-bold text-base-content mb-1">
        {value}
      </div>

      <div className="flex items-center justify-between">
        {subtitle && (
          <div className="stat-desc text-xs text-base-content/60">
            {subtitle}
          </div>
        )}
        
        {trend && (
          <div className="flex items-center gap-1 text-xs">
            {getTrendIcon()}
            <span className={cn(
              "font-medium",
              trend.direction === 'up' && "text-success",
              trend.direction === 'down' && "text-error",
              trend.direction === 'neutral' && "text-base-content/50"
            )}>
              {trend.value}%
            </span>
            {trend.label && (
              <span className="text-base-content/50">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Section Container with Professional Styling
interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  variant?: 'default' | 'elevated' | 'bordered';
  className?: string;
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  collapsible = false,
  defaultExpanded = true,
  variant = 'default',
  className
}: SectionCardProps) {
  const variantClasses = {
    default: 'bg-base-100',
    elevated: 'bg-base-100 shadow-lg border border-base-300',
    bordered: 'bg-base-100 border-2 border-base-300'
  };

  if (collapsible) {
    return (
      <div className={cn(
        "collapse collapse-arrow rounded-lg",
        variantClasses[variant],
        className
      )}>
        <input type="checkbox" defaultChecked={defaultExpanded} />
        <div className="collapse-title text-lg font-semibold flex items-center justify-between pr-12">
          <div>
            <h3 className="text-base-content">{title}</h3>
            {subtitle && (
              <p className="text-sm text-base-content/60 font-normal mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="absolute right-12 top-1/2 -translate-y-1/2">{action}</div>}
        </div>
        <div className="collapse-content">
          <div className="pt-2">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-lg overflow-hidden",
      variantClasses[variant],
      className
    )}>
      <div className="px-6 py-4 border-b border-base-300 bg-base-100/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-base-content">{title}</h3>
            {subtitle && (
              <p className="text-sm text-base-content/60 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

// Data Grid Layout for Forms
interface DataGridProps {
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
}

export function DataGrid({
  columns = 2,
  gap = 'md',
  children,
  className
}: DataGridProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  };

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };

  return (
    <div className={cn(
      "grid",
      columnClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}

// Enhanced Field Display Component
interface FieldDisplayProps {
  label: string;
  value: ReactNode;
  copyable?: boolean;
  variant?: 'default' | 'emphasized' | 'muted';
  className?: string;
}

export function FieldDisplay({
  label,
  value,
  copyable = false,
  variant = 'default',
  className
}: FieldDisplayProps) {
  const variantClasses = {
    default: 'bg-base-100 border-base-300',
    emphasized: 'bg-primary/5 border-primary/20',
    muted: 'bg-base-200/50 border-base-200'
  };

  const handleCopy = async () => {
    if (typeof value === 'string') {
      await navigator.clipboard.writeText(value);
    }
  };

  return (
    <div className={cn("form-control", className)}>
      <label className="label pb-1">
        <span className="label-text text-sm font-medium text-base-content/70">
          {label}
        </span>
      </label>
      <div className={cn(
        "px-3 py-2 rounded-lg border text-sm bg-base-100 min-h-[2.5rem] flex items-center justify-between",
        variantClasses[variant]
      )}>
        <span className="text-base-content">
          {value || '-'}
        </span>
        {copyable && typeof value === 'string' && value && (
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={handleCopy}
            title="复制"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}