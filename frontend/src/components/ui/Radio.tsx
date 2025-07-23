import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Radio Option Interface
 */
export interface RadioOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  description?: string;
}

/**
 * Radio Variants
 */
const radioVariants = cva(
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

const radioInputVariants = cva(
  'mr-3 border-2 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 ' +
  'transition-all duration-150 ease-in-out cursor-pointer ' +
  'disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        default: 'border-gray-300 hover:border-gray-strong',
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

export interface RadioProps extends VariantProps<typeof radioVariants> {
  /**
   * Radio value
   */
  value: string | number;
  /**
   * Whether radio is checked
   */
  checked?: boolean;
  /**
   * Label for the radio
   */
  label?: string;
  /**
   * Description text
   */
  description?: string;
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
  onChange?: (value: string | number) => void;
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
 * RadioGroup Props
 */
export interface RadioGroupProps extends VariantProps<typeof radioVariants> {
  /**
   * Group label
   */
  label?: string;
  /**
   * Radio options
   */
  options: RadioOption[];
  /**
   * Selected value
   */
  value?: string | number;
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
  onChange?: (value: string | number) => void;
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
 * Professional Radio Component
 * 
 * Features:
 * - Single radio button with label and description
 * - Error states and validation
 * - Accessibility optimized
 * - Multiple size variants
 * 
 * @example
 * ```tsx
 * <Radio
 *   value="option1"
 *   label="Option 1"
 *   description="This is the first option"
 *   onChange={(value) => console.log(value)}
 * />
 * ```
 */
export const Radio: React.FC<RadioProps> = ({
  value,
  checked = false,
  label,
  description,
  disabled,
  variant,
  size,
  onChange,
  className,
  id,
  name,
}) => {
  // Generate unique ID
  const radioId = id || `radio-${Math.random().toString(36).substr(2, 8)}`;

  const handleChange = () => {
    if (!disabled) {
      onChange?.(value);
    }
  };

  return (
    <label
      className={cn(radioVariants({ size }), className)}
      htmlFor={radioId}
    >
      <input
        type="radio"
        id={radioId}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        className={cn(radioInputVariants({ variant, size }))}
      />
      
      <div className="flex-1">
        {label && (
          <span className="font-medium text-gray-900">
            {label}
          </span>
        )}
        
        {description && (
          <p className="text-sm text-gray-600 mt-1">
            {description}
          </p>
        )}
      </div>
    </label>
  );
};

/**
 * Professional RadioGroup Component
 * 
 * Features:
 * - Single selection from multiple options
 * - Horizontal and vertical layouts
 * - Group validation and error states
 * - Accessibility optimized
 * - Rich option descriptions
 * 
 * @example
 * ```tsx
 * const options = [
 *   { 
 *     value: 'monthly', 
 *     label: '月结算', 
 *     description: '每月最后一天发放薪资' 
 *   },
 *   { 
 *     value: 'biweekly', 
 *     label: '双周结算', 
 *     description: '每两周发放一次薪资' 
 *   },
 *   { 
 *     value: 'weekly', 
 *     label: '周结算', 
 *     description: '每周发放薪资' 
 *   }
 * ];
 * 
 * <RadioGroup
 *   label="薪资发放频率"
 *   options={options}
 *   value="monthly"
 *   onChange={(value) => console.log(value)}
 * />
 * ```
 */
export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  options,
  value,
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
  // Generate unique ID and name
  const groupId = id || `radio-group-${Math.random().toString(36).substr(2, 8)}`;
  const groupName = name || groupId;
  const helpTextId = helpText ? `${groupId}-help` : undefined;
  const errorId = error ? `${groupId}-error` : undefined;

  // Determine variant based on error state
  const currentVariant = error ? 'error' : variant;

  return (
    <fieldset className={cn('space-y-3', wrapperClassName)}>
      {/* Group Label */}
      {label && (
        <legend className="text-sm font-medium text-gray-900">
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
        role="radiogroup"
        aria-describedby={cn(helpTextId, errorId)}
        aria-invalid={error ? 'true' : undefined}
        aria-required={required}
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            value={option.value}
            checked={value === option.value}
            label={option.label}
            description={option.description}
            disabled={disabled || option.disabled}
            variant={currentVariant}
            size={size}
            onChange={onChange}
            name={groupName}
          />
        ))}
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
    </fieldset>
  );
};