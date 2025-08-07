import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface DetailFieldProps {
  label: string;
  value: string | undefined | null;
  type?: 'text' | 'date' | 'email' | 'phone' | 'status' | 'select' | 'textarea';
  variant?: 'text' | 'amount' | 'status';
  sensitive?: boolean;
  className?: string;
  isEditing?: boolean;
  onChange?: (value: string) => void;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  renderValue?: () => React.ReactNode;
}

/**
 * 统一的详情字段组件
 * 支持查看和编辑模式
 */
export function DetailField({ 
  label, 
  value, 
  type = 'text',
  variant = 'text',
  sensitive = false, 
  className = '',
  isEditing = false,
  onChange,
  options = [],
  required = false,
  placeholder,
  rows = 3,
  disabled = false,
  renderValue
}: DetailFieldProps) {
  const [showSensitive, setShowSensitive] = useState(false);

  // 格式化值
  const formatValue = (val: string | undefined | null, fieldType: string, fieldVariant: string): React.ReactNode => {
    if (!val) return <span className={cn("text-base", "text-base-content/40 italic")}>-</span>;
    
    // 如果提供了自定义渲染函数，优先使用
    if (renderValue && !isEditing) return renderValue();
    
    switch (fieldType) {
      case 'date':
        return new Date(val).toLocaleDateString('zh-CN');
      case 'status':
        return (
          <span className={cn(
            "badge badge-sm",
            val === 'active' ? 'badge-success' : 
            val === 'inactive' ? 'badge-error' : 
            'badge-warning'
          )}>
            {val === 'active' ? '在职' : val === 'inactive' ? '离职' : val}
          </span>
        );
      case 'email':
        return (
          <a href={`mailto:${val}`} className="link link-primary hover:link-accent">
            {val}
          </a>
        );
      case 'phone':
        return (
          <a href={`tel:${val}`} className="link link-primary hover:link-accent">
            {val}
          </a>
        );
      default:
        // 根据variant进行格式化
        switch (fieldVariant) {
          case 'amount':
            return <span className={cn("text-base", "font-mono", "text-base-content")}>{val}</span>;
          case 'status':
            return (
              <span className={cn(
                "badge badge-sm",
                val === 'active' ? 'badge-success' : 
                val === 'inactive' ? 'badge-error' : 
                'badge-warning'
              )}>
                {val}
              </span>
            );
          default:
            return <span className={cn("text-base", "text-base-content")}>{val}</span>;
        }
    }
  };

  // 渲染编辑输入框
  const renderEditInput = () => {
    const inputValue = value || '';
    const commonClasses = "w-full transition-colors duration-200 focus:ring-2 focus:ring-primary/20";
    
    if (type === 'select') {
      return (
        <select 
          className={cn(
            "select select-bordered select-sm",
            commonClasses,
            options.length === 0 && "select-disabled"
          )}
          value={inputValue}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled || options.length === 0}
        >
          <option value="">
            {options.length === 0 ? '加载中...' : placeholder || '请选择'}
          </option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
    
    if (type === 'textarea') {
      return (
        <textarea
          className={cn(
            "textarea textarea-bordered textarea-sm resize-none",
            commonClasses
          )}
          value={inputValue}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
        />
      );
    }
    
    return (
      <input
        type={type === 'date' ? 'date' : type === 'email' ? 'email' : 'text'}
        className={cn(
          "input input-bordered input-sm",
          commonClasses
        )}
        value={inputValue}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    );
  };

  const displayValue = sensitive && !showSensitive && !isEditing
    ? '••••••••' 
    : formatValue(value, type, variant);

  return (
    <div className={cn("form-control", className)}>
      <label className="label pb-1">
        <span className={cn(
          "label-text font-medium text-sm",
          "text-base-content/80",
          required && "after:content-['*'] after:text-error after:ml-1"
        )}>
          {label}
        </span>
      </label>
      
      <div className="flex items-center space-x-2">
        {isEditing ? (
          <div className="flex-1">
            {renderEditInput()}
          </div>
        ) : (
          <div className="flex-1 min-h-[1.75rem] flex items-center">
            {displayValue}
          </div>
        )}
        
        {sensitive && !isEditing && value && (
          <button
            onClick={() => setShowSensitive(!showSensitive)}
            className="btn btn-xs btn-ghost tooltip"
            data-tip={showSensitive ? '隐藏' : '显示'}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showSensitive ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              )}
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 字段组布局组件
 */
export interface FieldGroupProps {
  children: React.ReactNode;
  columns?: 1 | 2;
  className?: string;
}

export function FieldGroup({ 
  children, 
  columns = 2, 
  className = '' 
}: FieldGroupProps) {
  return (
    <div className={cn(
      "grid",
      // Compact gap spacing for better density
      "gap-4 lg:gap-5",
      columns === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2",
      className
    )}>
      {children}
    </div>
  );
}

export default DetailField;