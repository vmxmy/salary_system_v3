import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Checkbox Option Interface
 */
export interface CheckboxOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  description?: string;
}

/**
 * Checkbox Variants
 */
const checkboxVariants = cva(
  'inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      size: {
        sm: 'text-sm',
        default: 'text-base',
        lg: 'text-lg',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

const checkboxInputVariants = cva(
  'mr-3 rounded border-2 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 ' +
  'transition-all duration-150 ease-in-out cursor-pointer ' +
  'disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        default: 'border-border-default hover:border-border-strong',
        error: 'border-negative focus:ring-negative',
        success: 'border-positive focus:ring-positive',
        warning: 'border-warning focus:ring-warning',
      },
      size: {
        sm: 'h-4 w-4',
        default: 'h-5 w-5',
        lg: 'h-6 w-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface CheckboxProps extends VariantProps<typeof checkboxVariants> {
  /**
   * Checkbox value
   */
  value?: string | number;
  /**
   * Whether checkbox is checked
   */
  checked?: boolean;
  /**
   * Label for the checkbox
   */
  label?: string;
  /**
   * Description text
   */
  description?: string;
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
   * Whether checkbox is indeterminate
   */
  indeterminate?: boolean;
  /**
   * Variant styling
   */
  variant?: 'default' | 'error' | 'success' | 'warning';
  /**
   * Change handler
   */
  onChange?: (checked: boolean, value?: string | number) => void;
  /**
   * Additional className
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
 * CheckboxGroup Props
 */
export interface CheckboxGroupProps extends VariantProps<typeof checkboxVariants> {
  /**
   * Group label
   */
  label?: string;
  /**
   * Checkbox options
   */
  options: CheckboxOption[];
  /**
   * Selected values
   */
  value?: (string | number)[];
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
   * Variant styling
   */
  variant?: 'default' | 'error' | 'success' | 'warning';
  /**
   * Change handler
   */
  onChange?: (values: (string | number)[]) => void;
  /**
   * Additional wrapper className
   */
  wrapperClassName?: string;
  /**
   * Layout direction
   */
  direction?: 'horizontal' | 'vertical';
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
 * Professional Checkbox Component
 * 
 * Features:
 * - Single checkbox with label and description
 * - Error states and validation
 * - Indeterminate state support
 * - Accessibility optimized
 * - Multiple size variants
 * 
 * @example
 * ```tsx
 * <Checkbox
 *   label="Accept Terms"
 *   description="I agree to the terms and conditions"
 *   onChange={(checked) => console.log(checked)}
 * />
 * ```
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  value,
  checked = false,
  label,
  description,
  helpText,
  error,
  required,
  disabled,
  indeterminate = false,
  variant,
  size,
  onChange,
  className,
  id,
  name,
}) => {
  // Generate unique ID
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 8)}`;
  const helpTextId = helpText ? `${checkboxId}-help` : undefined;
  const errorId = error ? `${checkboxId}-error` : undefined;

  // Determine variant based on error state
  const currentVariant = error ? 'error' : variant;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.checked, value);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label
        className={cn(checkboxVariants({ size }))}
        htmlFor={checkboxId}
      >
        <input
          type="checkbox"
          id={checkboxId}
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          required={required}
          onChange={handleChange}
          ref={(input) => {
            if (input) input.indeterminate = indeterminate;
          }}
          aria-describedby={cn(helpTextId, errorId)}
          aria-invalid={error ? 'true' : undefined}
          className={cn(checkboxInputVariants({ variant: currentVariant, size }))}
        />
        
        <div className="flex-1">
          {label && (
            <span className="font-medium text-text-primary">
              {label}
              {required && (
                <span className="ml-1 text-negative" aria-label="Required field">
                  *
                </span>
              )}
            </span>
          )}
          
          {description && (
            <p className="text-sm text-text-secondary mt-1">
              {description}
            </p>
          )}
        </div>
      </label>

      {/* Help Text */}
      {helpText && !error && (
        <p id={helpTextId} className="text-sm text-text-tertiary">
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
    </div>
  );
};

/**
 * Professional CheckboxGroup Component
 * 
 * Features:
 * - Multiple checkbox selection
 * - Horizontal and vertical layouts
 * - Group validation and error states
 * - Accessibility optimized
 * 
 * @example
 * ```tsx
 * const options = [
 *   { value: 'email', label: '邮件通知', description: '接收重要邮件通知' },
 *   { value: 'sms', label: '短信通知', description: '接收重要短信通知' },
 *   { value: 'push', label: '推送通知', description: '接收应用推送通知' }
 * ];
 * 
 * <CheckboxGroup
 *   label="通知设置"
 *   options={options}
 *   value={['email', 'push']}
 *   onChange={(values) => console.log(values)}
 * />
 * ```
 */
export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  options,
  value = [],
  helpText,
  error,
  required,
  disabled,
  variant,
  size,
  onChange,
  wrapperClassName,
  direction = 'vertical',
  id,
  name,
}) => {
  // Generate unique ID
  const groupId = id || `checkbox-group-${Math.random().toString(36).substr(2, 8)}`;
  const helpTextId = helpText ? `${groupId}-help` : undefined;
  const errorId = error ? `${groupId}-error` : undefined;

  const handleCheckboxChange = (checked: boolean, optionValue?: string | number) => {
    if (!optionValue) return;

    const newValues = checked
      ? [...value, optionValue]
      : value.filter(v => v !== optionValue);

    onChange?.(newValues);
  };

  return (
    <fieldset className={cn('space-y-3', wrapperClassName)}>
      {/* Group Label */}
      {label && (
        <legend className="text-sm font-medium text-text-primary">
          {label}
          {required && (
            <span className="ml-1 text-negative" aria-label="Required field">
              *
            </span>
          )}
        </legend>
      )}

      {/* Options */}
      <div
        className={cn(
          'space-y-3',
          direction === 'horizontal' && 'flex flex-wrap gap-6 space-y-0'
        )}
        role="group"
        aria-describedby={cn(helpTextId, errorId)}
        aria-invalid={error ? 'true' : undefined}
      >
        {options.map((option) => (
          <Checkbox
            key={option.value}
            value={option.value}
            checked={value.includes(option.value)}
            label={option.label}
            description={option.description}
            disabled={disabled || option.disabled}
            variant={variant}
            size={size}
            onChange={handleCheckboxChange}
            name={name}
          />
        ))}
      </div>

      {/* Help Text */}
      {helpText && !error && (
        <p id={helpTextId} className="text-sm text-text-tertiary">
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
    </fieldset>
  );
};