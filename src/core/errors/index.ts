/**
 * 应用错误类型定义
 * 
 * 定义系统中的各种错误类型
 * 支持错误分类和统一处理
 */

/**
 * 基础错误类
 */
export abstract class BaseError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly details?: any;
    readonly timestamp: Date;
    
    constructor(
        message: string,
        code: string,
        statusCode: number,
        isOperational: boolean = true,
        details?: any
    ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;
        this.timestamp = new Date();
        
        Error.captureStackTrace(this, this.constructor);
    }
    
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

/**
 * 验证错误
 */
export class ValidationError extends BaseError {
    constructor(message: string, details?: any) {
        super(message, 'VALIDATION_ERROR', 400, true, details);
    }
}

/**
 * 未找到错误
 */
export class NotFoundError extends BaseError {
    constructor(message: string, details?: any) {
        super(message, 'NOT_FOUND', 404, true, details);
    }
}

/**
 * 未授权错误
 */
export class UnauthorizedError extends BaseError {
    constructor(message: string = 'Unauthorized', details?: any) {
        super(message, 'UNAUTHORIZED', 401, true, details);
    }
}

/**
 * 权限不足错误
 */
export class ForbiddenError extends BaseError {
    constructor(message: string = 'Forbidden', details?: any) {
        super(message, 'FORBIDDEN', 403, true, details);
    }
}

/**
 * 冲突错误
 */
export class ConflictError extends BaseError {
    constructor(message: string, details?: any) {
        super(message, 'CONFLICT', 409, true, details);
    }
}

/**
 * 业务逻辑错误
 */
export class BusinessError extends BaseError {
    constructor(message: string, code: string = 'BUSINESS_ERROR', details?: any) {
        super(message, code, 422, true, details);
    }
}

/**
 * 应用错误
 */
export class ApplicationError extends BaseError {
    constructor(message: string, originalError?: any) {
        super(
            message,
            'APPLICATION_ERROR',
            500,
            false,
            originalError
        );
    }
}

/**
 * 授权错误
 */
export class AuthorizationError extends BaseError {
    constructor(message: string = 'Authorization failed', details?: any) {
        super(message, 'AUTHORIZATION_ERROR', 403, true, details);
    }
}

/**
 * 数据库错误
 */
export class DatabaseError extends BaseError {
    constructor(message: string, originalError?: any) {
        super(
            message,
            'DATABASE_ERROR',
            500,
            false,
            originalError
        );
    }
}

/**
 * 外部服务错误
 */
export class ExternalServiceError extends BaseError {
    constructor(service: string, message: string, originalError?: any) {
        super(
            `External service error (${service}): ${message}`,
            'EXTERNAL_SERVICE_ERROR',
            502,
            false,
            { service, originalError }
        );
    }
}

/**
 * 超时错误
 */
export class TimeoutError extends BaseError {
    constructor(message: string = 'Operation timed out', details?: any) {
        super(message, 'TIMEOUT', 408, true, details);
    }
}

/**
 * 限流错误
 */
export class RateLimitError extends BaseError {
    constructor(message: string = 'Rate limit exceeded', details?: any) {
        super(message, 'RATE_LIMIT', 429, true, details);
    }
}

/**
 * 文件错误
 */
export class FileError extends BaseError {
    constructor(message: string, details?: any) {
        super(message, 'FILE_ERROR', 400, true, details);
    }
}

/**
 * 网络错误
 */
export class NetworkError extends BaseError {
    constructor(message: string, originalError?: any) {
        super(
            message,
            'NETWORK_ERROR',
            503,
            false,
            originalError
        );
    }
}

/**
 * 配置错误
 */
export class ConfigurationError extends BaseError {
    constructor(message: string, details?: any) {
        super(
            message,
            'CONFIGURATION_ERROR',
            500,
            false,
            details
        );
    }
}

/**
 * 错误处理工具
 */
export class ErrorHandler {
    /**
     * 判断是否为操作性错误
     */
    static isOperationalError(error: Error): boolean {
        if (error instanceof BaseError) {
            return error.isOperational;
        }
        return false;
    }
    
    /**
     * 格式化错误响应
     */
    static formatErrorResponse(error: Error): {
        error: {
            message: string;
            code: string;
            statusCode: number;
            details?: any;
        }
    } {
        if (error instanceof BaseError) {
            return {
                error: {
                    message: error.message,
                    code: error.code,
                    statusCode: error.statusCode,
                    details: error.details
                }
            };
        }
        
        // 未知错误，返回通用错误响应
        return {
            error: {
                message: 'An unexpected error occurred',
                code: 'INTERNAL_ERROR',
                statusCode: 500
            }
        };
    }
    
    /**
     * 记录错误
     */
    static logError(error: Error, context?: any): void {
        console.error('Error occurred:', {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });
        
        // 可以集成错误监控服务（如Sentry）
        // Sentry.captureException(error, { extra: context });
    }
    
    /**
     * 处理未捕获的错误
     */
    static handleUncaughtError(error: Error): void {
        this.logError(error, { type: 'uncaught' });
        
        if (!this.isOperationalError(error)) {
            // 非操作性错误，可能需要重启应用
            console.error('Fatal error occurred, application may be in unstable state');
            // process.exit(1); // Node.js环境
        }
    }
}

/**
 * 全局错误处理器注册
 */
export function registerGlobalErrorHandlers(): void {
    // 浏览器环境
    if (typeof window !== 'undefined') {
        window.addEventListener('unhandledrejection', (event) => {
            ErrorHandler.handleUncaughtError(
                new Error(`Unhandled promise rejection: ${event.reason}`)
            );
        });
        
        window.addEventListener('error', (event) => {
            ErrorHandler.handleUncaughtError(event.error);
        });
    }
    
    // Node.js环境
    if (typeof process !== 'undefined') {
        process.on('uncaughtException', (error) => {
            ErrorHandler.handleUncaughtError(error);
        });
        
        process.on('unhandledRejection', (reason) => {
            ErrorHandler.handleUncaughtError(
                new Error(`Unhandled promise rejection: ${reason}`)
            );
        });
    }
}