import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Input Component Variants
 * Optimized for form-heavy HR/Payroll interfaces
 */
const inputVariants = cva(
  // Base classes with accessibility and UX optimizations
  'flex w-full rounded-md border bg-base-200 px-3 py-2 text-sm text-gray-900 ' +
  'placeholder:text-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ' +
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-gray-100 ' +
  'transition-all duration-150 ease-in-out',
  {
    variants: {
      variant: {
        default: 'border-gray-300 hover:border-gray-400',
        error: 'border-negative focus:ring-negative',
        success: 'border-positive focus:ring-positive',
        warning: 'border-warning focus:ring-warning',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        default: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /**
   * Label for the input field
   */
  label?: string;
  /**
   * Help text to display below the input
   */
  helpText?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Icon to display on the left side
   */
  leftIcon?: React.ReactNode;
  /**
   * Icon to display on the right side
   */
  rightIcon?: React.ReactNode;
  /**
   * Whether the field is required
   */
  required?: boolean;
  /**
   * Additional wrapper className
   */
  wrapperClassName?: string;
}

/**
 * Professional Input Component
 * 
 * Features:
 * - Multiple variants for different states
 * - Icon support (left/right)
 * - Label and help text integration
 * - Error state management
 * - Full accessibility support
 * - Optimized for bilingual content
 * 
 * @example
 * ```tsx
 * // Basic input
 * <Input label="Employee Name" placeholder="Enter name" />
 * 
 * // With validation
 * <Input 
 *   label="Salary" 
 *   variant="error" 
 *   error="Salary must be positive"
 *   leftIcon={<CurrencyIcon />}
 * />
 * 
 * // With help text
 * <Input 
 *   label="ID Number"
 *   helpText="18-digit Chinese ID number"
 *   required
 * />
 * ```
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      label,
      helpText,
      error,
      leftIcon,
      rightIcon,
      required,
      wrapperClassName,
      id,
      ...props
    },
    ref
  ) => {
    // Generate unique ID if not provided
    const inputId = id || `input-${Math.random().toString(36).substr(2, 8)}`;
    const helpTextId = helpText ? `${inputId}-help` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    // Determine the variant based on error state
    const currentVariant = error ? 'error' : variant;

    return (
      <div className={cn('space-y-2', wrapperClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
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

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              {leftIcon}
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              inputVariants({ variant: currentVariant, size }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            aria-describedby={cn(
              helpTextId && helpTextId,
              errorId && errorId
            )}
            aria-invalid={error ? 'true' : undefined}
            {...props}
          />

          {/* Right Icon */}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              {rightIcon}
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
      </div>
    );
  }
);

Input.displayName = 'Input';

/**
 * Currency Input Component
 * Specialized for monetary values in HR/Payroll
 */
interface CurrencyInputProps extends Omit<InputProps, 'type' | 'leftIcon'> {
  /**
   * Currency symbol to display
   */
  currency?: string;
  /**
   * Callback when the numeric value changes
   */
  onValueChange?: (value: number | null) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ currency = '¥', onValueChange, onChange, value, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow only numbers, decimal point, and backspace
      if (!/^\d*\.?\d*$/.test(inputValue) && inputValue !== '') {
        return;
      }

      // Call original onChange
      if (onChange) {
        onChange(e);
      }

      // Call onValueChange with numeric value
      if (onValueChange) {
        const numericValue = inputValue === '' ? null : parseFloat(inputValue);
        onValueChange(isNaN(numericValue!) ? null : numericValue);
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        leftIcon={
          <span className="text-gray-600 font-medium">{currency}</span>
        }
        onChange={handleChange}
        value={value}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

/**
 * Search Input Component
 * Optimized for filtering and search functionality
 */
interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'rightIcon'> {
  /**
   * Callback when search is cleared
   */
  onClear?: () => void;
  /**
   * Show clear button when there's a value
   */
  showClear?: boolean;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, showClear = true, value, ...props }, ref) => {
    const hasValue = value && value.toString().length > 0;

    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        }
        rightIcon={
          showClear && hasValue && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="p-1 hover:bg-gray-100-hover rounded-full transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : null
        }
        value={value}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

export { Input, CurrencyInput, SearchInput, inputVariants };