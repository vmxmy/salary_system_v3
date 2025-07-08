import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Button Component Variants
 * Professional styling optimized for HR/Payroll interfaces
 */
const buttonVariants = cva(
  // Base classes - accessibility and interaction optimized
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-150 ease-in-out ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-60 ' +
  'hover:transform hover:-translate-y-0.5 active:translate-y-0',
  {
    variants: {
      variant: {
        // Primary action button - for main actions
        primary: 'bg-primary text-primary-content hover:bg-primary/90 shadow-soft',
        
        // Secondary action button - for alternative actions
        secondary: 'bg-secondary text-secondary-content hover:bg-secondary/90 shadow-soft',
        
        // Outline button - for secondary actions with less weight
        outline: 'border border-border-default bg-bg-surface text-text-primary hover:bg-bg-interactive-hover',
        
        // Ghost button - minimal styling for tertiary actions
        ghost: 'text-text-primary hover:bg-bg-interactive-hover',
        
        // Destructive button - for delete/remove actions
        destructive: 'bg-negative text-negative-content hover:bg-negative/90 shadow-soft',
        
        // Success button - for positive actions like save/confirm
        success: 'bg-positive text-positive-content hover:bg-positive/90 shadow-soft',
        
        // Warning button - for actions requiring attention
        warning: 'bg-warning text-warning-content hover:bg-warning/90 shadow-soft',
        
        // Link button - styled like a link
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10',
      },
      width: {
        auto: 'w-auto',
        full: 'w-full',
        fit: 'w-fit',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      width: 'auto',
    },
  }
);

/**
 * Loading Spinner Component
 */
const LoadingSpinner = ({ className }: { className?: string }) => (
  <svg
    className={cn('animate-spin h-4 w-4', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Whether the button is in a loading state
   */
  loading?: boolean;
  /**
   * Icon to display before the button text
   */
  leftIcon?: React.ReactNode;
  /**
   * Icon to display after the button text
   */
  rightIcon?: React.ReactNode;
  /**
   * Accessible label for screen readers (especially useful for icon-only buttons)
   */
  'aria-label'?: string;
}

/**
 * Professional Button Component
 * 
 * Features:
 * - Multiple variants optimized for different actions
 * - Loading state with spinner
 * - Icon support (left/right)
 * - Full accessibility support
 * - Hover animations and focus management
 * - Responsive sizing
 * 
 * @example
 * ```tsx
 * // Primary action button
 * <Button variant="primary" size="lg">Save Employee</Button>
 * 
 * // Loading state
 * <Button loading disabled>Processing...</Button>
 * 
 * // With icons
 * <Button leftIcon={<PlusIcon />}>Add Employee</Button>
 * 
 * // Destructive action
 * <Button variant="destructive">Delete Record</Button>
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      width,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(buttonVariants({ variant, size, width, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {/* Left Icon or Loading Spinner */}
        {loading ? (
          <LoadingSpinner className="mr-2" />
        ) : leftIcon ? (
          <span className="mr-2 flex-shrink-0">{leftIcon}</span>
        ) : null}

        {/* Button Content */}
        {children && <span className="truncate">{children}</span>}

        {/* Right Icon */}
        {rightIcon && !loading && (
          <span className="ml-2 flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };