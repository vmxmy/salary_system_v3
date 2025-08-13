/**
 * 验证结果值对象
 * 
 * 用于封装验证操作的结果，包含成功状态、错误信息等
 */

/**
 * 验证错误详情
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * 验证结果类
 */
export class ValidationResult {
  private constructor(
    public readonly isValid: boolean,
    public readonly errors: ValidationError[] = [],
    public readonly warnings: ValidationError[] = []
  ) {}

  /**
   * 创建成功的验证结果
   */
  static success(): ValidationResult {
    return new ValidationResult(true);
  }

  /**
   * 创建失败的验证结果
   * 
   * @param errors 错误列表
   * @param warnings 警告列表
   */
  static failure(
    errors: ValidationError[] | string,
    warnings: ValidationError[] = []
  ): ValidationResult {
    const errorList = typeof errors === 'string' 
      ? [{ field: 'general', message: errors, code: 'VALIDATION_ERROR' }]
      : errors;
    
    return new ValidationResult(false, errorList, warnings);
  }

  /**
   * 创建带警告的成功结果
   * 
   * @param warnings 警告列表
   */
  static successWithWarnings(warnings: ValidationError[]): ValidationResult {
    return new ValidationResult(true, [], warnings);
  }

  /**
   * 添加错误
   * 
   * @param error 错误信息
   */
  addError(error: ValidationError): ValidationResult {
    return new ValidationResult(false, [...this.errors, error], this.warnings);
  }

  /**
   * 添加警告
   * 
   * @param warning 警告信息
   */
  addWarning(warning: ValidationError): ValidationResult {
    return new ValidationResult(this.isValid, this.errors, [...this.warnings, warning]);
  }

  /**
   * 合并验证结果
   * 
   * @param other 其他验证结果
   */
  merge(other: ValidationResult): ValidationResult {
    return new ValidationResult(
      this.isValid && other.isValid,
      [...this.errors, ...other.errors],
      [...this.warnings, ...other.warnings]
    );
  }

  /**
   * 获取第一个错误消息
   */
  get firstError(): string | null {
    return this.errors.length > 0 ? this.errors[0].message : null;
  }

  /**
   * 获取所有错误消息
   */
  get errorMessages(): string[] {
    return this.errors.map(e => e.message);
  }

  /**
   * 获取所有警告消息
   */
  get warningMessages(): string[] {
    return this.warnings.map(w => w.message);
  }

  /**
   * 检查是否有特定字段的错误
   * 
   * @param field 字段名
   */
  hasFieldError(field: string): boolean {
    return this.errors.some(e => e.field === field);
  }

  /**
   * 获取特定字段的错误
   * 
   * @param field 字段名
   */
  getFieldErrors(field: string): ValidationError[] {
    return this.errors.filter(e => e.field === field);
  }

  /**
   * 转换为简单对象
   */
  toJSON() {
    return {
      isValid: this.isValid,
      errors: this.errors,
      warnings: this.warnings,
      errorMessages: this.errorMessages,
      warningMessages: this.warningMessages
    };
  }
}