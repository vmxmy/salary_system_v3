import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes with proper precedence
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 * 
 * @param inputs - Class values to merge
 * @returns Merged class string
 * 
 * @example
 * ```tsx
 * cn('px-4 py-2', 'bg-blue-500', condition && 'hover:bg-blue-600')
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency for display in HR/Payroll interfaces
 * Handles Chinese Yuan formatting with proper separators
 * 
 * @param amount - Numeric amount to format
 * @param currency - Currency code (default: 'CNY')
 * @param locale - Locale for formatting (default: 'zh-CN')
 * @returns Formatted currency string
 * 
 * @example
 * ```tsx
 * formatCurrency(12345.67) // "¥12,345.67"
 * formatCurrency(12345.67, 'USD', 'en-US') // "$12,345.67"
 * ```
 */
export function formatCurrency(
  amount: number,
  currency: string = 'CNY',
  locale: string = 'zh-CN'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage for display
 * 
 * @param value - Decimal value (0.1 = 10%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 * 
 * @example
 * ```tsx
 * formatPercentage(0.123) // "12.3%"
 * formatPercentage(0.123, 2) // "12.30%"
 * ```
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format date for consistent display across the application
 * Supports both Chinese and English locales
 * 
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'zh-CN')
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 * 
 * @example
 * ```tsx
 * formatDate(new Date()) // "2023年12月25日"
 * formatDate(new Date(), 'en-US') // "December 25, 2023"
 * ```
 */
export function formatDate(
  date: Date | string,
  locale: string = 'zh-CN',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Format date and time for detailed timestamps
 * 
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'zh-CN')
 * @returns Formatted datetime string
 * 
 * @example
 * ```tsx
 * formatDateTime(new Date()) // "2023年12月25日 14:30:15"
 * ```
 */
export function formatDateTime(
  date: Date | string,
  locale: string = 'zh-CN'
): string {
  return formatDate(date, locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Truncate text with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 * 
 * @example
 * ```tsx
 * truncateText("This is a very long text", 10) // "This is a..."
 * ```
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Generate a random ID for components
 * Useful for accessibility labels and form associations
 * 
 * @param prefix - Optional prefix for the ID
 * @returns Random ID string
 * 
 * @example
 * ```tsx
 * generateId('form') // "form-a1b2c3d4"
 * generateId() // "a1b2c3d4"
 * ```
 */
export function generateId(prefix?: string): string {
  const id = Math.random().toString(36).substr(2, 8);
  return prefix ? `${prefix}-${id}` : id;
}

/**
 * Debounce function to limit rapid function calls
 * Useful for search inputs and API calls
 * 
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 * 
 * @example
 * ```tsx
 * const debouncedSearch = debounce((query: string) => {
 *   performSearch(query);
 * }, 300);
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sleep utility for async operations
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 * 
 * @example
 * ```tsx
 * await sleep(1000); // Wait 1 second
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate Chinese ID number format
 * Basic validation for 18-digit Chinese ID numbers
 * 
 * @param idNumber - ID number to validate
 * @returns True if format is valid
 * 
 * @example
 * ```tsx
 * validateChineseId('110101199001011234') // true
 * validateChineseId('invalid') // false
 * ```
 */
export function validateChineseId(idNumber: string): boolean {
  const regex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
  return regex.test(idNumber);
}

/**
 * Validate email format
 * 
 * @param email - Email to validate
 * @returns True if format is valid
 */
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validate phone number format (Chinese mobile)
 * 
 * @param phone - Phone number to validate
 * @returns True if format is valid
 */
export function validatePhone(phone: string): boolean {
  const regex = /^1[3-9]\d{9}$/;
  return regex.test(phone);
}

/**
 * Format file size for display
 * 
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 * 
 * @example
 * ```tsx
 * formatFileSize(1024) // "1.0 KB"
 * formatFileSize(1048576) // "1.0 MB"
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Calculate age from birth date
 * 
 * @param birthDate - Birth date
 * @returns Age in years
 * 
 * @example
 * ```tsx
 * calculateAge(new Date('1990-01-01')) // Current age based on birth year
 * ```
 */
export function calculateAge(birthDate: Date | string): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Deep clone an object
 * 
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const copy = {} as any;
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone((obj as any)[key]);
    });
    return copy;
  }
  return obj;
}

/**
 * DaisyUI Card Effects - Modern card styling patterns
 * Provides consistent card appearance across the application
 */
export const cardEffects = {
  modern: cn(
    'card bg-base-100 shadow-sm border border-base-200/60',
    'hover:shadow-md transition-all duration-200',
    'backdrop-blur-sm'
  ),
  elevated: cn(
    'card bg-base-100 shadow-lg border border-base-200/60',
    'hover:shadow-xl transition-all duration-300',
    'backdrop-blur-md'
  ),
  glass: cn(
    'card bg-base-100/80 backdrop-blur-xl shadow-sm',
    'border border-base-200/40',
    'hover:bg-base-100/90 transition-all duration-200'
  ),
  gradient: cn(
    'card bg-gradient-to-br from-base-100 to-base-50/50',
    'shadow-sm border border-base-200/60',
    'hover:shadow-md transition-all duration-200'
  )
};

/**
 * DaisyUI Icon Container - Consistent icon styling
 * Provides themed icon containers with various sizes and colors
 */
export const iconContainer = {
  modern: (variant: string = 'primary', size: string = 'md') => {
    const sizeClasses = {
      xs: 'w-6 h-6',
      sm: 'w-8 h-8', 
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
      xl: 'w-14 h-14',
      '2xl': 'w-16 h-16'
    };

    const variantClasses = {
      primary: 'bg-primary/10 text-primary border-primary/20',
      secondary: 'bg-secondary/10 text-secondary border-secondary/20',
      accent: 'bg-accent/10 text-accent border-accent/20',
      success: 'bg-success/10 text-success border-success/20',
      warning: 'bg-warning/10 text-warning border-warning/20',
      error: 'bg-error/10 text-error border-error/20',
      info: 'bg-info/10 text-info border-info/20',
      neutral: 'bg-neutral/10 text-neutral border-neutral/20'
    };

    return cn(
      'rounded-lg border flex items-center justify-center',
      'transition-all duration-200 hover:scale-105',
      sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md,
      variantClasses[variant as keyof typeof variantClasses] || variantClasses.primary
    );
  }
};

/**
 * DaisyUI Button Effects - Consistent button styling
 * Provides themed button styles following DaisyUI patterns
 */
export const buttonEffects = {
  primary: cn(
    'btn-primary hover:btn-primary',
    'transition-all duration-200',
    'hover:scale-105 active:scale-95'
  ),
  secondary: cn(
    'btn-secondary hover:btn-secondary',
    'transition-all duration-200',
    'hover:scale-105 active:scale-95'
  ),
  accent: cn(
    'btn-accent hover:btn-accent',
    'transition-all duration-200',
    'hover:scale-105 active:scale-95'
  ),
  ghost: cn(
    'btn-ghost hover:btn-ghost',
    'transition-all duration-200',
    'hover:scale-105 active:scale-95'
  ),
  outline: cn(
    'btn-outline hover:btn-outline',
    'transition-all duration-200',
    'hover:scale-105 active:scale-95'
  ),
  link: cn(
    'btn-link hover:btn-link',
    'transition-all duration-200',
    'hover:scale-105 active:scale-95'
  )
};