import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Date Picker Variants
 */
const datePickerVariants = cva(
  'flex w-full rounded-md border bg-base-200 px-3 py-2 text-sm text-gray-900 ' +
  'placeholder:text-gray-400 cursor-pointer ' +
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

export interface DatePickerProps extends VariantProps<typeof datePickerVariants> {
  /**
   * Selected date value
   */
  value?: Date | null;
  /**
   * Default date value
   */
  defaultValue?: Date | null;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Label for the date picker
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
   * Minimum selectable date
   */
  minDate?: Date;
  /**
   * Maximum selectable date
   */
  maxDate?: Date;
  /**
   * Date format for display
   */
  dateFormat?: string;
  /**
   * Locale for date formatting
   */
  locale?: string;
  /**
   * Whether to show time picker
   */
  showTime?: boolean;
  /**
   * Time format (when showTime is true)
   */
  timeFormat?: '12' | '24';
  /**
   * Change handler
   */
  onChange?: (date: Date | null) => void;
  /**
   * Additional wrapper className
   */
  wrapperClassName?: string;
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
 * Utility functions for date operations
 */
const dateUtils = {
  formatDate: (date: Date, format: string = 'YYYY-MM-DD'): string => {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // Basic format replacements
    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes);
  },
  
  parseDate: (dateString: string): Date | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  },
  
  isDateInRange: (date: Date, minDate?: Date, maxDate?: Date): boolean => {
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    return true;
  },
  
  getDaysInMonth: (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  },
  
  getFirstDayOfMonth: (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  }
};

/**
 * Calendar Component
 */
const Calendar: React.FC<{
  selectedDate: Date | null;
  currentMonth: Date;
  minDate?: Date;
  maxDate?: Date;
  showTime?: boolean;
  timeFormat?: '12' | '24';
  onDateSelect: (date: Date) => void;
  onMonthChange: (direction: 'prev' | 'next') => void;
  onClose: () => void;
}> = ({ 
  selectedDate, 
  currentMonth, 
  minDate, 
  maxDate, 
  showTime = false,
  onDateSelect, 
  onMonthChange,
  onClose
}) => {
  const [timeValue, setTimeValue] = useState({
    hours: selectedDate?.getHours() || 0,
    minutes: selectedDate?.getMinutes() || 0
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = dateUtils.getDaysInMonth(year, month);
  const firstDayOfMonth = dateUtils.getFirstDayOfMonth(year, month);
  
  // Generate calendar days
  const calendarDays = [];
  
  // Previous month's trailing days
  const prevMonth = new Date(year, month - 1, 0);
  const prevMonthDays = prevMonth.getDate();
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthDays - i)
    });
  }
  
  // Current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: true,
      date: new Date(year, month, day)
    });
  }
  
  // Next month's leading days
  const remainingDays = 42 - calendarDays.length; // 6 weeks * 7 days
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(year, month + 1, day)
    });
  }

  const handleDateClick = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    if (!dateUtils.isDateInRange(date, minDate, maxDate)) return;
    
    if (showTime) {
      // Apply time to selected date
      const newDate = new Date(date);
      newDate.setHours(timeValue.hours, timeValue.minutes);
      onDateSelect(newDate);
    } else {
      onDateSelect(date);
    }
  };

  const handleTimeChange = (field: 'hours' | 'minutes', value: number) => {
    const newTimeValue = { ...timeValue, [field]: value };
    setTimeValue(newTimeValue);
    
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(newTimeValue.hours, newTimeValue.minutes);
      onDateSelect(newDate);
    }
  };

  const isDateSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === date.getDate() &&
      selectedDate.getMonth() === date.getMonth() &&
      selectedDate.getFullYear() === date.getFullYear()
    );
  };

  const isDateDisabled = (date: Date): boolean => {
    return !dateUtils.isDateInRange(date, minDate, maxDate);
  };

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="bg-base-200 border border-gray-300 rounded-lg shadow-elevated p-4 w-72">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onMonthChange('prev')}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-sm font-medium text-gray-900">
          {year}年 {monthNames[month]}
        </h3>
        
        <button
          onClick={() => onMonthChange('next')}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 p-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {calendarDays.map(({ day, isCurrentMonth, date }, index) => (
          <button
            key={index}
            onClick={() => handleDateClick(date, isCurrentMonth)}
            disabled={!isCurrentMonth || isDateDisabled(date)}
            className={cn(
              'p-2 text-sm rounded hover:bg-gray-100 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
              !isCurrentMonth && 'text-gray-500',
              isCurrentMonth && 'text-gray-900',
              isDateSelected(date) && isCurrentMonth && 'bg-primary text-primary-content',
              isDateDisabled(date) && 'opacity-50 cursor-not-allowed hover:bg-transparent'
            )}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Time Picker */}
      {showTime && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="flex items-center">
              <input
                type="number"
                min="0"
                max="23"
                value={timeValue.hours}
                onChange={(e) => handleTimeChange('hours', parseInt(e.target.value) || 0)}
                className="w-12 px-2 py-1 text-sm border border-gray-300 rounded text-center"
              />
              <span className="mx-1">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={timeValue.minutes}
                onChange={(e) => handleTimeChange('minutes', parseInt(e.target.value) || 0)}
                className="w-12 px-2 py-1 text-sm border border-gray-300 rounded text-center"
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
        >
          取消
        </button>
        <button
          onClick={() => selectedDate && onDateSelect(selectedDate)}
          className="px-3 py-1 text-sm bg-primary text-primary-content rounded hover:bg-primary/90"
        >
          确定
        </button>
      </div>
    </div>
  );
};

/**
 * Professional DatePicker Component
 * 
 * Features:
 * - Calendar-based date selection
 * - Time picker support
 * - Min/Max date constraints
 * - Localized date formatting
 * - Error states and validation
 * - Accessibility optimized
 * 
 * @example
 * ```tsx
 * <DatePicker
 *   label="入职日期"
 *   placeholder="请选择入职日期"
 *   value={hireDate}
 *   minDate={new Date('2020-01-01')}
 *   maxDate={new Date()}
 *   onChange={(date) => setHireDate(date)}
 * />
 * ```
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  defaultValue,
  placeholder = '请选择日期',
  label,
  helpText,
  error,
  required,
  disabled,
  readOnly,
  minDate,
  maxDate,
  dateFormat = 'YYYY-MM-DD',
  showTime = false,
  timeFormat = '24',
  onChange,
  wrapperClassName,
  id,
  name,
  variant,
  size,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value || defaultValue || null);
  const [currentMonth, setCurrentMonth] = useState(
    value || defaultValue || new Date()
  );
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate unique ID
  const datePickerId = id || `datepicker-${Math.random().toString(36).substr(2, 8)}`;
  const helpTextId = helpText ? `${datePickerId}-help` : undefined;
  const errorId = error ? `${datePickerId}-error` : undefined;

  // Determine variant based on error state
  const currentVariant = error ? 'error' : variant;

  // Update selected date when value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setSelectedDate(value);
      if (value) {
        setCurrentMonth(value);
      }
    }
  }, [value]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onChange?.(date);
    if (!showTime) {
      setIsOpen(false);
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const handleInputClick = () => {
    if (!disabled && !readOnly) {
      setIsOpen(!isOpen);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(null);
    onChange?.(null);
  };

  const displayValue = selectedDate
    ? dateUtils.formatDate(
        selectedDate, 
        showTime ? `${dateFormat} HH:mm` : dateFormat
      )
    : '';

  return (
    <div className={cn('relative space-y-2', wrapperClassName)} ref={containerRef}>
      {/* Label */}
      {label && (
        <label
          htmlFor={datePickerId}
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

      {/* Input */}
      <div className="relative">
        <div
          id={datePickerId}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-describedby={cn(helpTextId, errorId)}
          aria-invalid={error ? 'true' : undefined}
          className={cn(
            datePickerVariants({ variant: currentVariant, size }),
            'justify-between items-center',
            disabled && 'cursor-not-allowed'
          )}
          onClick={handleInputClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleInputClick();
            }
          }}
        >
          <span className={displayValue ? 'text-gray-900' : 'text-gray-400'}>
            {displayValue || placeholder}
          </span>
          
          <div className="flex items-center space-x-1">
            {/* Clear Button */}
            {selectedDate && !disabled && !readOnly && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Clear date"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            {/* Calendar Icon */}
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* Calendar Popup */}
        {isOpen && (
          <div className="absolute top-full left-0 z-50 mt-1">
            <Calendar
              selectedDate={selectedDate}
              currentMonth={currentMonth}
              minDate={minDate}
              maxDate={maxDate}
              showTime={showTime}
              timeFormat={timeFormat}
              onDateSelect={handleDateSelect}
              onMonthChange={handleMonthChange}
              onClose={() => setIsOpen(false)}
            />
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

      {/* Hidden input for form submission */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={selectedDate ? selectedDate.toISOString() : ''}
        />
      )}
    </div>
  );
};