/**
 * 领域错误基类
 * 
 * 定义了业务领域中的各种错误类型
 */

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 错误类别
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  BUSINESS_RULE = 'business_rule',
  NOT_FOUND = 'not_found',
  UNAUTHORIZED = 'unauthorized',
  CONFLICT = 'conflict',
  EXTERNAL_SERVICE = 'external_service',
  INFRASTRUCTURE = 'infrastructure'
}

/**
 * 领域错误基类
 */
export abstract class DomainError extends Error {
  public readonly timestamp: Date;
  public readonly errorId: string;

  constructor(
    message: string,
    public readonly code: string,
    public readonly category: ErrorCategory,
    public readonly severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.errorId = this.generateErrorId();
    
    // 确保错误栈正确显示
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 生成错误ID
   */
  private generateErrorId(): string {
    return `${this.category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 转换为JSON对象
   */
  toJSON() {
    return {
      errorId: this.errorId,
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * 获取用户友好的错误消息
   */
  abstract getUserFriendlyMessage(): string;
}

/**
 * 验证错误
 */
export class ValidationError extends DomainError {
  constructor(
    message: string,
    public readonly field?: string,
    context?: Record<string, any>
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      { field, ...context }
    );
  }

  getUserFriendlyMessage(): string {
    return this.field 
      ? `字段 "${this.field}" 验证失败: ${this.message}`
      : `验证失败: ${this.message}`;
  }
}

/**
 * 业务规则错误
 */
export class BusinessRuleError extends DomainError {
  constructor(
    message: string,
    public readonly ruleName: string,
    context?: Record<string, any>
  ) {
    super(
      message,
      'BUSINESS_RULE_VIOLATION',
      ErrorCategory.BUSINESS_RULE,
      ErrorSeverity.MEDIUM,
      { ruleName, ...context }
    );
  }

  getUserFriendlyMessage(): string {
    return `业务规则违反: ${this.message}`;
  }
}

/**
 * 实体未找到错误
 */
export class NotFoundError extends DomainError {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string | number,
    context?: Record<string, any>
  ) {
    super(
      `${entityType} with id ${entityId} not found`,
      'ENTITY_NOT_FOUND',
      ErrorCategory.NOT_FOUND,
      ErrorSeverity.LOW,
      { entityType, entityId, ...context }
    );
  }

  getUserFriendlyMessage(): string {
    return `未找到指定的${this.entityType}`;
  }
}

/**
 * 权限错误
 */
export class UnauthorizedError extends DomainError {
  constructor(
    message: string,
    public readonly action?: string,
    public readonly resource?: string,
    context?: Record<string, any>
  ) {
    super(
      message,
      'UNAUTHORIZED_ACCESS',
      ErrorCategory.UNAUTHORIZED,
      ErrorSeverity.HIGH,
      { action, resource, ...context }
    );
  }

  getUserFriendlyMessage(): string {
    return '您没有权限执行此操作';
  }
}

/**
 * 并发冲突错误
 */
export class ConflictError extends DomainError {
  constructor(
    message: string,
    public readonly resourceType: string,
    public readonly resourceId: string,
    context?: Record<string, any>
  ) {
    super(
      message,
      'RESOURCE_CONFLICT',
      ErrorCategory.CONFLICT,
      ErrorSeverity.MEDIUM,
      { resourceType, resourceId, ...context }
    );
  }

  getUserFriendlyMessage(): string {
    return '数据已被其他用户修改，请刷新后重试';
  }
}

/**
 * 循环依赖错误
 */
export class CircularDependencyError extends DomainError {
  constructor(
    public readonly serviceName: string,
    public readonly dependencyChain: string[],
    context?: Record<string, any>
  ) {
    super(
      `Circular dependency detected in service ${serviceName}: ${dependencyChain.join(' -> ')}`,
      'CIRCULAR_DEPENDENCY',
      ErrorCategory.INFRASTRUCTURE,
      ErrorSeverity.CRITICAL,
      { serviceName, dependencyChain, ...context }
    );
  }

  getUserFriendlyMessage(): string {
    return '系统配置错误，请联系管理员';
  }
}

/**
 * 外部服务错误
 */
export class ExternalServiceError extends DomainError {
  constructor(
    message: string,
    public readonly serviceName: string,
    public readonly statusCode?: number,
    context?: Record<string, any>
  ) {
    super(
      message,
      'EXTERNAL_SERVICE_ERROR',
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorSeverity.HIGH,
      { serviceName, statusCode, ...context }
    );
  }

  getUserFriendlyMessage(): string {
    return `${this.serviceName}服务暂时不可用，请稍后重试`;
  }
}