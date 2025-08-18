import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// 现代化表单字段包装器
interface FormFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  labelClassName?: string;
  helpText?: string;
}

export function FormField({
  label,
  children,
  error,
  hint,
  required = false,
  optional = false,
  className,
  labelClassName,
  helpText
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* 标签区域 */}
      <div className="flex items-center justify-between">
        <label className={cn(
          'text-sm font-medium text-base-content',
          error && 'text-error',
          labelClassName
        )}>
          {label}
          {required && (
            <span className="text-error ml-1" aria-label="必填">*</span>
          )}
          {optional && (
            <span className="text-base-content/50 ml-1 text-xs">(可选)</span>
          )}
        </label>
        
        {hint && (
          <span className="text-xs text-base-content/60">
            {hint}
          </span>
        )}
      </div>

      {/* 输入控件 */}
      <div className="relative">
        {children}
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="flex items-center gap-1 text-sm text-error">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* 帮助文本 */}
      {helpText && !error && (
        <p className="text-xs text-base-content/60 leading-relaxed">
          {helpText}
        </p>
      )}
    </div>
  );
}

// 现代化输入框
interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  variant?: 'default' | 'filled' | 'bordered';
  helpText?: string;
}

export function ModernInput({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  loading = false,
  variant = 'default',
  helpText,
  className,
  ...props
}: ModernInputProps) {
  const variantClasses = {
    default: cn(
      'input input-bordered w-full',
      'bg-base-100 border-base-300',
      'focus:border-primary focus:ring-2 focus:ring-primary/20',
      'transition-all duration-200'
    ),
    filled: cn(
      'input w-full border-0',
      'bg-base-200/50 hover:bg-base-200/70',
      'focus:bg-base-100 focus:ring-2 focus:ring-primary/20',
      'transition-all duration-200'
    ),
    bordered: cn(
      'input input-bordered w-full',
      'border-2 border-base-300',
      'focus:border-primary focus:ring-4 focus:ring-primary/10',
      'transition-all duration-200'
    )
  };

  const inputContent = (
    <div className="relative">
      {/* 左侧图标 */}
      {leftIcon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <div className="w-5 h-5 text-base-content/50">
            {leftIcon}
          </div>
        </div>
      )}

      {/* 输入框 */}
      <input
        className={cn(
          variantClasses[variant],
          leftIcon && 'pl-10',
          rightIcon && 'pr-10',
          error && 'input-error border-error focus:border-error focus:ring-error/20',
          loading && 'pr-10',
          className
        )}
        {...props}
      />

      {/* 右侧图标或加载状态 */}
      {(rightIcon || loading) && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {loading ? (
            <span className="loading loading-spinner loading-sm text-primary" />
          ) : (
            <div className="w-5 h-5 text-base-content/50">
              {rightIcon}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (label) {
    return (
      <FormField
        label={label}
        error={error}
        hint={hint}
        required={props.required}
        helpText={helpText}
      >
        {inputContent}
      </FormField>
    );
  }

  return inputContent;
}

// 现代化选择框
interface ModernSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  loading?: boolean;
  helpText?: string;
}

export function ModernSelect({
  label,
  error,
  hint,
  options,
  placeholder = "请选择...",
  loading = false,
  helpText,
  className,
  ...props
}: ModernSelectProps) {
  const selectContent = (
    <div className="relative">
      <select
        className={cn(
          'select select-bordered w-full',
          'bg-base-100 border-base-300',
          'focus:border-primary focus:ring-2 focus:ring-primary/20',
          'transition-all duration-200',
          error && 'select-error border-error focus:border-error focus:ring-error/20',
          loading && 'opacity-50 cursor-not-allowed',
          className
        )}
        disabled={loading || props.disabled}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {loading && (
        <div className="absolute inset-y-0 right-8 flex items-center">
          <span className="loading loading-spinner loading-sm text-primary" />
        </div>
      )}
    </div>
  );

  if (label) {
    return (
      <FormField
        label={label}
        error={error}
        hint={hint}
        required={props.required}
        helpText={helpText}
      >
        {selectContent}
      </FormField>
    );
  }

  return selectContent;
}

// 现代化文本域
interface ModernTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  autoResize?: boolean;
  maxHeight?: number;
  helpText?: string;
}

export function ModernTextarea({
  label,
  error,
  hint,
  autoResize = false,
  maxHeight = 200,
  helpText,
  className,
  ...props
}: ModernTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      const adjustHeight = () => {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${newHeight}px`;
      };

      textarea.addEventListener('input', adjustHeight);
      adjustHeight(); // 初始调整

      return () => textarea.removeEventListener('input', adjustHeight);
    }
  }, [autoResize, maxHeight]);

  const textareaContent = (
    <textarea
      ref={textareaRef}
      className={cn(
        'textarea textarea-bordered w-full',
        'bg-base-100 border-base-300',
        'focus:border-primary focus:ring-2 focus:ring-primary/20',
        'transition-all duration-200 resize-none',
        error && 'textarea-error border-error focus:border-error focus:ring-error/20',
        autoResize && 'overflow-hidden',
        className
      )}
      style={autoResize ? { minHeight: '80px', maxHeight: `${maxHeight}px` } : undefined}
      {...props}
    />
  );

  if (label) {
    return (
      <FormField
        label={label}
        error={error}
        hint={hint}
        required={props.required}
        helpText={helpText}
      >
        {textareaContent}
      </FormField>
    );
  }

  return textareaContent;
}

// 表单分组容器
interface FormGroupProps {
  title?: string;
  description?: string;
  children: ReactNode;
  columns?: number;
  gap?: 'sm' | 'md' | 'lg';
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

export function FormGroup({
  title,
  description,
  children,
  columns = 1,
  gap = 'md',
  collapsible = false,
  defaultCollapsed = false,
  className
}: FormGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 分组标题 */}
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-base-content">
                {title}
              </h3>
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
          )}
          {description && (
            <p className="text-sm text-base-content/70 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}

      {/* 表单字段网格 */}
      {!isCollapsed && (
        <div className={cn(
          'grid',
          columns === 1 ? 'grid-cols-1' : `grid-cols-1 md:grid-cols-${Math.min(columns, 2)} lg:grid-cols-${columns}`,
          gapClasses[gap],
          'animate-in slide-in-from-top-2 fade-in duration-200'
        )}>
          {children}
        </div>
      )}
    </div>
  );
}

// 表单操作按钮组
interface FormActionsProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right' | 'between';
  sticky?: boolean;
  className?: string;
}

export function FormActions({
  children,
  align = 'right',
  sticky = false,
  className
}: FormActionsProps) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between'
  };

  return (
    <div className={cn(
      'flex items-center gap-3 pt-6 mt-6 border-t border-base-300/60',
      alignClasses[align],
      sticky && 'sticky bottom-0 bg-base-100/95 backdrop-blur-sm -mx-6 px-6 pb-6',
      className
    )}>
      {children}
    </div>
  );
}

// 现代化复选框
interface ModernCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: string;
  variant?: 'default' | 'card';
}

export function ModernCheckbox({
  label,
  description,
  error,
  variant = 'default',
  className,
  ...props
}: ModernCheckboxProps) {
  if (variant === 'card') {
    return (
      <div className={cn(
        'card bg-base-100 border border-base-300 p-4 cursor-pointer',
        'hover:bg-base-100 transition-colors duration-200',
        props.checked && 'border-primary bg-primary/5',
        error && 'border-error',
        className
      )}>
        <label className="cursor-pointer">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              className="checkbox checkbox-primary mt-0.5"
              {...props}
            />
            <div className="flex-1">
              <div className="font-medium text-base-content">
                {label}
              </div>
              {description && (
                <div className="text-sm text-base-content/70 mt-1">
                  {description}
                </div>
              )}
            </div>
          </div>
        </label>
        {error && (
          <div className="text-sm text-error mt-2">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('form-control', className)}>
      <label className="label cursor-pointer justify-start gap-3">
        <input
          type="checkbox"
          className={cn(
            'checkbox checkbox-primary',
            error && 'checkbox-error'
          )}
          {...props}
        />
        <div className="flex-1">
          <span className="label-text font-medium">
            {label}
          </span>
          {description && (
            <div className="text-sm text-base-content/70 mt-1">
              {description}
            </div>
          )}
        </div>
      </label>
      {error && (
        <div className="text-sm text-error mt-1">
          {error}
        </div>
      )}
    </div>
  );
}