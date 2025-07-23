import { z, ZodError } from 'zod';

/**
 * Sanitizes input string to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  // Trim whitespace
  return sanitized.trim();
}

/**
 * Validates data against a Zod schema and returns formatted errors
 */
export function validateData<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = formatZodErrors(error);
      return { success: false, errors };
    }
    throw error;
  }
}

/**
 * Safely validates data without throwing errors
 */
export function safeValidate<T>(
  schema: z.ZodType<T>,
  data: unknown
): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Validation error type
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Formats Zod errors into a more user-friendly format
 */
export function formatZodErrors(error: ZodError): ValidationError[] {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  getResetTime(): number {
    if (this.requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...this.requests);
    return oldestRequest + this.windowMs;
  }
}

/**
 * Input size validator
 */
export function validateInputSize(
  input: string | any[],
  maxSize: number,
  fieldName: string
): void {
  const size = typeof input === 'string' ? input.length : input.length;
  if (size > maxSize) {
    throw new Error(`${fieldName} 超过最大限制 ${maxSize}`);
  }
}

/**
 * Validates file upload
 */
export function validateFileUpload(file: File, options: {
  maxSizeBytes?: number;
  allowedTypes?: string[];
}): ValidationError[] {
  const errors: ValidationError[] = [];
  const { maxSizeBytes = 10 * 1024 * 1024, allowedTypes = [] } = options;

  if (file.size > maxSizeBytes) {
    errors.push({
      field: 'file',
      message: `文件大小不能超过 ${Math.round(maxSizeBytes / 1024 / 1024)}MB`
    });
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    errors.push({
      field: 'file',
      message: `不支持的文件类型。允许的类型: ${allowedTypes.join(', ')}`
    });
  }

  return errors;
}

/**
 * Validates array uniqueness
 */
export function validateArrayUniqueness<T>(
  array: T[],
  keyExtractor?: (item: T) => string | number
): boolean {
  const seen = new Set<string | number>();
  
  for (const item of array) {
    const key = keyExtractor ? keyExtractor(item) : String(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
  }
  
  return true;
}

/**
 * Deep sanitize object recursively
 */
export function deepSanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitizeObject(item));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = deepSanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}