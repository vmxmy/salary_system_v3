import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Select Option Interface
 */
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string;
}

/**
 * Select Variants
 */
const selectVariants = cva(
  'flex w-full rounded-md border bg-bg-surface px-3 py-2 text-sm text-text-primary ' +
  'placeholder:text-text-placeholder cursor-pointer ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ' +
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-bg-interactive ' +
  'transition-all duration-150 ease-in-out',
  {
    variants: {
      variant: {
        default: 'border-border-default hover:border-border-strong',
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

export interface SelectProps extends VariantProps<typeof selectVariants> {
  /**
   * Select options
   */
  options: SelectOption[];
  /**
   * Current selected value
   */
  value?: string | number;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Label for the select
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
   * Whether field is searchable
   */
  searchable?: boolean;
  /**
   * Multiple selection
   */
  multiple?: boolean;
  /**
   * Max height for dropdown
   */
  maxHeight?: number;
  /**
   * Change handler
   */
  onChange?: (value: string | number | (string | number)[]) => void;
  /**
   * Search change handler
   */
  onSearchChange?: (search: string) => void;
  /**
   * Additional wrapper className
   */
  wrapperClassName?: string;
  /**
   * Component ID
   */
  id?: string;
}

/**
 * Professional Select Component
 * 
 * Features:
 * - Single and multiple selection
 * - Searchable options
 * - Grouped options
 * - Keyboard navigation
 * - Error states and validation
 * - Accessibility optimized
 * 
 * @example
 * ```tsx
 * const options = [
 *   { value: 'tech', label: '技术部' },
 *   { value: 'hr', label: '人力资源部' },
 *   { value: 'finance', label: '财务部' }
 * ];
 * 
 * <Select
 *   label="Department"
 *   options={options}
 *   placeholder="Select department"
 *   onChange={(value) => console.log(value)}
 * />
 * ```
 */
export const Select: React.FC<SelectProps> = ({
  options,
  value,
  placeholder = 'Select option',
  label,
  helpText,
  error,
  required,
  disabled,
  searchable = false,
  multiple = false,
  maxHeight = 200,
  onChange,
  onSearchChange,
  wrapperClassName,
  id,
  variant,
  size,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Generate unique ID
  const selectId = id || `select-${Math.random().toString(36).substr(2, 8)}`;
  const helpTextId = helpText ? `${selectId}-help` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  // Determine variant based on error state
  const currentVariant = error ? 'error' : variant;

  // Filter options based on search
  const filteredOptions = searchable && searchTerm
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Get selected options
  const selectedOptions = multiple
    ? options.filter(option => Array.isArray(value) && value.includes(option.value))
    : options.find(option => option.value === value);

  // Handle option selection
  const handleSelect = (optionValue: string | number) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue];
      onChange?.(newValues);
    } else {
      onChange?.(optionValue);
      setIsOpen(false);
    }
  };

  // Handle search
  const handleSearch = (search: string) => {
    setSearchTerm(search);
    onSearchChange?.(search);
    setFocusedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          setIsOpen(true);
          e.preventDefault();
        } else if (focusedIndex >= 0) {
          handleSelect(filteredOptions[focusedIndex].value);
          e.preventDefault();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        }
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  return (
    <div className={cn('space-y-2', wrapperClassName)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-text-primary"
        >
          {label}
          {required && (
            <span className="ml-1 text-negative" aria-label="Required field">
              *
            </span>
          )}
        </label>
      )}

      {/* Select Container */}
      <div ref={selectRef} className="relative">
        <div
          id={selectId}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-describedby={cn(helpTextId, errorId)}
          aria-invalid={error ? 'true' : undefined}
          tabIndex={disabled ? -1 : 0}
          className={cn(
            selectVariants({ variant: currentVariant, size }),
            'justify-between items-center',
            disabled && 'cursor-not-allowed'
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
        >
          {/* Selected Value Display */}
          <div className="flex-1 truncate">
            {multiple ? (
              Array.isArray(selectedOptions) && selectedOptions.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedOptions.slice(0, 2).map((option) => (
                    <span
                      key={option.value}
                      className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs"
                    >
                      {option.label}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(option.value);
                        }}
                        className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {Array.isArray(selectedOptions) && selectedOptions.length > 2 && (
                    <span className="text-text-tertiary text-xs">
                      +{selectedOptions.length - 2} more
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-text-placeholder">{placeholder}</span>
              )
            ) : (
              <span className={selectedOptions ? 'text-text-primary' : 'text-text-placeholder'}>
                {selectedOptions ? (selectedOptions as SelectOption).label : placeholder}
              </span>
            )}
          </div>

          {/* Dropdown Arrow */}
          <svg
            className={cn(
              'w-4 h-4 text-text-tertiary transition-transform ml-2 flex-shrink-0',
              isOpen && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-bg-surface border border-border-default rounded-md shadow-elevated"
            style={{ maxHeight: maxHeight + 'px' }}
          >
            {/* Search Input */}
            {searchable && (
              <div className="p-2 border-b border-border-subtle">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Search options..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Options List */}
            <div
              role="listbox"
              aria-multiselectable={multiple}
              className="overflow-y-auto"
              style={{ maxHeight: (maxHeight - (searchable ? 60 : 0)) + 'px' }}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-text-tertiary">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = multiple
                    ? Array.isArray(value) && value.includes(option.value)
                    : value === option.value;
                  const isFocused = index === focusedIndex;

                  return (
                    <div
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        'px-3 py-2 text-sm cursor-pointer flex items-center justify-between',
                        'hover:bg-bg-interactive-hover',
                        isSelected && 'bg-primary/10 text-primary',
                        isFocused && 'bg-bg-interactive-hover',
                        option.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                      onClick={() => !option.disabled && handleSelect(option.value)}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && (
                        <svg className="w-4 h-4 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
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
    </div>
  );
};