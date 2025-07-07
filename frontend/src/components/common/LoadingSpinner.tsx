import React from 'react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
  text?: string;
  className?: string;
  overlay?: boolean;
}

export function LoadingSpinner({
  size = 'md',
  color,
  text,
  className = '',
  overlay = false
}: LoadingSpinnerProps) {
  const spinnerClasses = `
    loading loading-spinner
    ${size === 'xs' ? 'loading-xs' : ''}
    ${size === 'sm' ? 'loading-sm' : ''}
    ${size === 'md' ? 'loading-md' : ''}
    ${size === 'lg' ? 'loading-lg' : ''}
    ${color ? `text-${color}` : ''}
  `;

  const content = (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <span className={spinnerClasses}></span>
      {text && (
        <span className="text-sm text-base-content/70">{text}</span>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-base-100 p-6 rounded-lg shadow-xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
}

// 页面级加载组件
interface PageLoadingProps {
  text?: string;
  minHeight?: string;
}

export function PageLoading({ 
  text = '加载中...', 
  minHeight = 'min-h-96' 
}: PageLoadingProps) {
  return (
    <div className={`flex items-center justify-center ${minHeight}`}>
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

// 按钮加载状态
interface ButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function ButtonLoading({
  loading,
  children,
  className = '',
  disabled,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md'
}: ButtonLoadingProps) {
  const buttonClasses = `
    btn
    ${variant === 'primary' ? 'btn-primary' : ''}
    ${variant === 'secondary' ? 'btn-secondary' : ''}
    ${variant === 'accent' ? 'btn-accent' : ''}
    ${variant === 'ghost' ? 'btn-ghost' : ''}
    ${variant === 'outline' ? 'btn-outline' : ''}
    ${size === 'xs' ? 'btn-xs' : ''}
    ${size === 'sm' ? 'btn-sm' : ''}
    ${size === 'lg' ? 'btn-lg' : ''}
    ${className}
  `;

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <span className="loading loading-spinner loading-sm"></span>}
      {children}
    </button>
  );
}

// 表格行加载占位符
interface TableRowSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableRowSkeleton({ columns, rows = 5 }: TableRowSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex}>
              <div className="skeleton h-4 w-full"></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// 卡片加载占位符
interface CardSkeletonProps {
  className?: string;
  lines?: number;
}

export function CardSkeleton({ className = '', lines = 3 }: CardSkeletonProps) {
  return (
    <div className={`card bg-base-100 shadow ${className}`}>
      <div className="card-body">
        <div className="skeleton h-6 w-3/4 mb-4"></div>
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="skeleton h-4 w-full mb-2"></div>
        ))}
        <div className="skeleton h-4 w-1/2"></div>
      </div>
    </div>
  );
}

// 列表项加载占位符
interface ListItemSkeletonProps {
  avatar?: boolean;
  lines?: number;
  count?: number;
}

export function ListItemSkeleton({ 
  avatar = false, 
  lines = 2, 
  count = 5 
}: ListItemSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4">
          {avatar && (
            <div className="skeleton w-12 h-12 rounded-full shrink-0"></div>
          )}
          <div className="flex-1 space-y-2">
            {Array.from({ length: lines }).map((_, lineIndex) => (
              <div
                key={lineIndex}
                className={`skeleton h-4 ${
                  lineIndex === lines - 1 ? 'w-2/3' : 'w-full'
                }`}
              ></div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// Default export for convenience
export default LoadingSpinner;