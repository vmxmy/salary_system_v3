import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Textarea Variants
 */
const textareaVariants = cva(
  'flex w-full rounded-md border bg-base-200 px-3 py-2 text-sm text-gray-900 ' +
  'placeholder:text-gray-400 resize-vertical ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ' +
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-gray-100 ' +
  'transition-all duration-150 ease-in-out',
  {
    variants: {
      variant: {
        default: 'border-gray-300 hover:border-gray-strong',
        error: 'border-negative focus:ring-negative',
        success: 'border-positive focus:ring-positive',
        warning: 'border-warning focus:ring-warning',
      },
      size: {
        sm: 'text-xs px-2 py-1',
        default: 'text-sm px-3 py-2',
        lg: 'text-base px-4 py-3',
      },
      resize: {
        none: 'resize-none',
        vertical: 'resize-y',
        horizontal: 'resize-x',
        both: 'resize',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      resize: 'vertical',
    },
  }
);

export interface TextareaProps extends VariantProps<typeof textareaVariants> {
  /**
   * Textarea value
   */
  value?: string;
  /**
   * Default value for uncontrolled component
   */
  defaultValue?: string;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Label for the textarea
   */
  label?: string;
  /**
   * Help text
   */
  helpText?: string;
  /**
   * Error message
   */
  error?: string;
  /**
   * Whether field is required
   */
  required?: boolean;
  /**
   * Whether field is disabled
   */
  disabled?: boolean;
  /**
   * Whether field is read-only
   */
  readOnly?: boolean;
  /**
   * Number of visible text lines
   */
  rows?: number;
  /**
   * Minimum number of rows (for auto-resize)
   */
  minRows?: number;
  /**
   * Maximum number of rows (for auto-resize)
   */
  maxRows?: number;
  /**
   * Whether to auto-resize based on content
   */
  autoResize?: boolean;
  /**
   * Maximum character length
   */
  maxLength?: number;
  /**
   * Whether to show character count
   */
  showCharCount?: boolean;
  /**
   * Change handler
   */
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /**
   * Blur handler
   */
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  /**
   * Focus handler
   */
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  /**
   * Additional wrapper className
   */
  wrapperClassName?: string;
  /**
   * Additional className for textarea
   */
  className?: string;
  /**
   * Component ID
   */
  id?: string;
  /**
   * Name attribute
   */
  name?: string;
}

/**
 * Professional Textarea Component
 * 
 * Features:
 * - Auto-resize based on content
 * - Character count display
 * - Error states and validation
 * - Multiple size and resize variants
 * - Accessibility optimized
 * - Support for rich text descriptions
 * 
 * @example
 * ```tsx
 * <Textarea
 *   label="员工备注"
 *   placeholder="请输入员工相关备注信息..."
 *   rows={3}
 *   maxLength={500}
 *   showCharCount
 *   autoResize
 *   onChange={(e) => console.log(e.target.value)}
 * />
 * ```
 */
export const Textarea: React.FC<TextareaProps> = ({
  value,
  defaultValue,
  placeholder,
  label,
  helpText,
  error,
  required,
  disabled,
  readOnly,
  rows = 3,
  minRows,
  maxRows,
  autoResize = false,
  maxLength,
  showCharCount = false,
  onChange,
  onBlur,
  onFocus,
  wrapperClassName,
  className,
  id,
  name,
  variant,
  size,
  resize,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [currentValue, setCurrentValue] = useState(value || defaultValue || '');

  // Generate unique ID
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 8)}`;
  const helpTextId = helpText ? `${textareaId}-help` : undefined;
  const errorId = error ? `${textareaId}-error` : undefined;
  const charCountId = showCharCount ? `${textareaId}-char-count` : undefined;

  // Determine variant based on error state
  const currentVariant = error ? 'error' : variant;

  // Auto-resize functionality
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea || !autoResize) return;

    // Reset height to recalculate
    textarea.style.height = 'auto';
    
    // Calculate new height
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const paddingTop = parseInt(getComputedStyle(textarea).paddingTop);
    const paddingBottom = parseInt(getComputedStyle(textarea).paddingBottom);
    const border = parseInt(getComputedStyle(textarea).borderTopWidth) + 
                  parseInt(getComputedStyle(textarea).borderBottomWidth);
    
    let newHeight = textarea.scrollHeight;
    
    // Apply min/max constraints
    if (minRows) {
      const minHeight = (minRows * lineHeight) + paddingTop + paddingBottom + border;
      newHeight = Math.max(newHeight, minHeight);
    }
    
    if (maxRows) {
      const maxHeight = (maxRows * lineHeight) + paddingTop + paddingBottom + border;
      newHeight = Math.min(newHeight, maxHeight);
    }
    
    textarea.style.height = `${newHeight}px`;
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Enforce max length
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    
    setCurrentValue(newValue);
    onChange?.(e);
    
    // Adjust height after state update
    setTimeout(adjustHeight, 0);
  };

  // Adjust height on mount and value changes
  useEffect(() => {
    adjustHeight();
  }, [autoResize, minRows, maxRows]);

  useEffect(() => {
    if (value !== undefined) {
      setCurrentValue(value);
    }
  }, [value]);

  // Character count information
  const charCount = currentValue.length;
  const isNearLimit = maxLength && charCount > maxLength * 0.8;
  const isOverLimit = maxLength && charCount > maxLength;

  return (
    <div className={cn('space-y-2', wrapperClassName)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-900"
        >
          {label}
          {required && (
            <span className="ml-1 text-negative" aria-label="Required field">
              *
            </span>
          )}
        </label>
      )}

      {/* Textarea Container */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          id={textareaId}
          name={name}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={autoResize ? undefined : rows}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          maxLength={maxLength}
          onChange={handleChange}
          onBlur={onBlur}
          onFocus={onFocus}
          aria-describedby={cn(helpTextId, errorId, charCountId)}
          aria-invalid={error ? 'true' : undefined}
          className={cn(
            textareaVariants({ 
              variant: currentVariant, 
              size, 
              resize: autoResize ? 'none' : resize 
            }),
            className
          )}
          style={autoResize ? { minHeight: `${rows * 1.5}rem` } : undefined}
        />

        {/* Character Count */}
        {showCharCount && maxLength && (
          <div
            id={charCountId}
            className={cn(
              'absolute bottom-2 right-2 text-xs px-2 py-1 rounded bg-base-200 border border-gray-300',
              isOverLimit && 'text-negative border-negative bg-negative/10',
              isNearLimit && !isOverLimit && 'text-warning border-warning bg-warning/10',
              !isNearLimit && 'text-gray-500'
            )}
          >
            {charCount}/{maxLength}
          </div>
        )}
      </div>

      {/* Help Text */}
      {helpText && !error && (
        <p id={helpTextId} className="text-sm text-gray-500">
          {helpText}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p
          id={errorId}
          className="text-sm text-negative flex items-center"
          role="alert"
        >
          <svg
            className="w-4 h-4 mr-1 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {/* Character Count (Bottom Display) */}
      {showCharCount && !maxLength && (
        <p className="text-sm text-gray-500">
          {charCount} characters
        </p>
      )}
    </div>
  );
};