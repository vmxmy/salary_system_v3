import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn, iconContainer, cardEffects } from '@/lib/utils';

// 现代化信息卡片
interface ModernInfoCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  headerActions?: ReactNode;
  className?: string;
}

export function ModernInfoCard({
  title,
  subtitle,
  description,
  icon,
  children,
  variant = 'default',
  size = 'md',
  hoverable = false,
  collapsible = false,
  defaultCollapsed = false,
  headerActions,
  className
}: ModernInfoCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const variantStyles = {
    default: {
      card: 'bg-base-100 border-base-300/60',
      header: 'bg-gradient-to-r from-base-100/50 to-transparent',
      icon: 'primary'
    },
    primary: {
      card: 'bg-primary/5 border-primary/20 shadow-primary/5',
      header: 'bg-gradient-to-r from-primary/10 to-primary/5',
      icon: 'primary'
    },
    success: {
      card: 'bg-success/5 border-success/20 shadow-success/5',
      header: 'bg-gradient-to-r from-success/10 to-success/5',
      icon: 'success'
    },
    warning: {
      card: 'bg-warning/5 border-warning/20 shadow-warning/5',
      header: 'bg-gradient-to-r from-warning/10 to-warning/5',
      icon: 'warning'
    },
    error: {
      card: 'bg-error/5 border-error/20 shadow-error/5',
      header: 'bg-gradient-to-r from-error/10 to-error/5',
      icon: 'error'
    },
    info: {
      card: 'bg-info/5 border-info/20 shadow-info/5',
      header: 'bg-gradient-to-r from-info/10 to-info/5',
      icon: 'info'
    }
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn(
      'card border shadow-sm transition-all duration-200',
      styles.card,
      hoverable && 'hover:shadow-md hover:scale-[1.01]',
      sizeClasses[size],
      className
    )}>
      {/* 增强的卡片头部 */}
      <div className={cn(
        'px-6 py-4 border-b border-base-300/40',
        styles.header,
        'backdrop-blur-sm'
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* 现代化图标容器 */}
            {icon && (
              <div className={iconContainer.modern(styles.icon, size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md')}>
                {icon}
              </div>
            )}
            
            {/* 标题和描述区域 */}
            <div className="min-w-0 flex-1">
              <h3 className={cn(
                'font-semibold text-base-content truncate leading-tight',
                size === 'sm' && 'text-base',
                size === 'md' && 'text-lg',
                size === 'lg' && 'text-xl'
              )}>
                {title}
              </h3>
              
              {subtitle && (
                <p className={cn(
                  'text-base-content/70 mt-1 line-clamp-1',
                  size === 'sm' && 'text-xs',
                  size === 'md' && 'text-sm',
                  size === 'lg' && 'text-base'
                )}>
                  {subtitle}
                </p>
              )}
              
              {description && (
                <p className={cn(
                  'text-base-content/60 mt-2 line-clamp-2 leading-relaxed',
                  size === 'sm' && 'text-xs',
                  size === 'md' && 'text-sm',
                  size === 'lg' && 'text-sm'
                )}>
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* 头部操作区域 */}
          <div className="flex items-center gap-2 ml-4">
            {headerActions}
            {collapsible && (
              <button
                type="button"
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setIsCollapsed(!isCollapsed)}
                aria-label={isCollapsed ? "展开" : "收起"}
              >
                <svg 
                  className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    isCollapsed ? "rotate-180" : "rotate-0"
                  )} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 卡片内容 */}
      {!isCollapsed && (
        <div className={cn(
          paddingClasses[size],
          'animate-in slide-in-from-top-2 fade-in duration-200'
        )}>
          {children}
        </div>
      )}
    </div>
  );
}

// 统计数据卡片
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period?: string;
  };
  icon?: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  change,
  icon,
  variant = 'default',
  size = 'md',
  loading = false,
  onClick,
  className
}: StatCardProps) {
  const variantStyles = {
    default: 'from-base-100 to-base-100/50 border-base-300/60',
    primary: 'from-primary/10 to-primary/5 border-primary/20',
    success: 'from-success/10 to-success/5 border-success/20',
    warning: 'from-warning/10 to-warning/5 border-warning/20',
    error: 'from-error/10 to-error/5 border-error/20',
    info: 'from-info/10 to-info/5 border-info/20'
  };

  const sizeClasses = {
    sm: {
      card: 'p-4',
      value: 'text-xl',
      title: 'text-sm',
      icon: 'sm'
    },
    md: {
      card: 'p-6',
      value: 'text-2xl',
      title: 'text-base',
      icon: 'md'
    },
    lg: {
      card: 'p-8',
      value: 'text-3xl',
      title: 'text-lg',
      icon: 'lg'
    }
  };

  const sizeConfig = sizeClasses[size];

  if (loading) {
    return (
      <div className={cn(
        'card bg-gradient-to-br border shadow-sm',
        variantStyles[variant],
        sizeConfig.card,
        onClick && 'cursor-pointer hover:shadow-md transition-all duration-200',
        className
      )}>
        <div className="animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-base-300 rounded w-3/4"></div>
            <div className="w-8 h-8 bg-base-300 rounded-lg"></div>
          </div>
          <div className="h-8 bg-base-300 rounded w-1/2"></div>
          <div className="h-3 bg-base-300 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'card bg-gradient-to-br border shadow-sm transition-all duration-200',
        variantStyles[variant],
        sizeConfig.card,
        onClick && 'cursor-pointer hover:shadow-md hover:scale-105',
        className
      )}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* 标题和图标 */}
        <div className="flex items-center justify-between">
          <h3 className={cn(
            'font-medium text-base-content/80 truncate',
            sizeConfig.title
          )}>
            {title}
          </h3>
          {icon && (
            <div className={iconContainer.modern(variant, sizeConfig.icon as any)}>
              {icon}
            </div>
          )}
        </div>

        {/* 主要数值 */}
        <div className={cn(
          'font-bold text-base-content',
          sizeConfig.value
        )}>
          {value}
        </div>

        {/* 副标题和变化指标 */}
        {(subtitle || change) && (
          <div className="flex items-center justify-between text-sm">
            {subtitle && (
              <span className="text-base-content/60 truncate">
                {subtitle}
              </span>
            )}
            
            {change && (
              <div className={cn(
                'flex items-center gap-1 font-medium',
                change.type === 'increase' && 'text-success',
                change.type === 'decrease' && 'text-error',
                change.type === 'neutral' && 'text-base-content/60'
              )}>
                {change.type === 'increase' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L10 4.414 4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {change.type === 'decrease' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L10 15.586l5.293-5.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span>{Math.abs(change.value)}%</span>
                {change.period && (
                  <span className="text-base-content/40">
                    {change.period}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 现代化数据网格
interface DataGridProps {
  columns?: number;
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
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4', 
    lg: 'gap-6'
  };

  return (
    <div className={cn(
      'grid',
      `grid-cols-1 sm:grid-cols-${Math.min(columns, 2)} lg:grid-cols-${columns}`,
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}

// 增强的字段显示组件
interface FieldDisplayProps {
  label: string;
  value: ReactNode;
  copyable?: boolean;
  variant?: 'default' | 'muted' | 'accent';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function FieldDisplay({
  label,
  value,
  copyable = false,
  variant = 'default',
  orientation = 'vertical',
  className
}: FieldDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof value === 'string') {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const variantClasses = {
    default: 'text-base-content',
    muted: 'text-base-content/60',
    accent: 'text-primary font-medium'
  };

  if (orientation === 'horizontal') {
    return (
      <div className={cn('flex items-center justify-between', className)}>
        <span className="text-sm text-base-content/70 font-medium">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm', variantClasses[variant])}>
            {value || '—'}
          </span>
          {copyable && value && (
            <button
              type="button"
              className="btn btn-xs btn-circle btn-ghost"
              onClick={handleCopy}
              title={copied ? "已复制" : "复制"}
            >
              {copied ? (
                <svg className="w-3 h-3 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-sm text-base-content/70 font-medium block">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className={cn('text-sm', variantClasses[variant])}>
          {value || (
            <span className="text-base-content/40 italic">未设置</span>
          )}
        </div>
        {copyable && value && (
          <button
            type="button"
            className="btn btn-xs btn-circle btn-ghost opacity-60 hover:opacity-100"
            onClick={handleCopy}
            title={copied ? "已复制" : "复制"}
          >
            {copied ? (
              <svg className="w-3 h-3 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// 分组卡片容器
interface CardGroupProps {
  title?: string;
  description?: string;
  children: ReactNode;
  columns?: number;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CardGroup({
  title,
  description,
  children,
  columns = 1,
  gap = 'md',
  className
}: CardGroupProps) {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };

  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h3 className="text-lg font-semibold text-base-content">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-base-content/70 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
      
      <div className={cn(
        'grid',
        columns === 1 ? 'grid-cols-1' : `grid-cols-1 md:grid-cols-${Math.min(columns, 2)} lg:grid-cols-${columns}`,
        gapClasses[gap]
      )}>
        {children}
      </div>
    </div>
  );
}