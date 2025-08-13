/**
 * Shared Domain Layer Exports
 * 
 * 统一导出领域层的核心组件
 */

// 实体基类
export { BaseEntity, EntityStatus } from './entities/BaseEntity';

// 错误类型
export {
  DomainError,
  ValidationError,
  BusinessRuleError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  CircularDependencyError,
  ExternalServiceError,
  ErrorSeverity,
  ErrorCategory
} from './errors/DomainError';

// 值对象
export {
  ValidationResult,
  type ValidationError as ValidationErrorInterface
} from './value-objects/ValidationResult';

// Repository接口
export {
  type IBaseRepository,
  type IRepositoryFactory,
  type PaginationOptions,
  type SortOption,
  type QueryOptions,
  type PaginatedResult,
  type OperationResult,
  type BatchOperationResult
} from './repositories/IBaseRepository';

// 事件系统
export {
  DomainEvent,
  type IEventHandler,
  type IEventBus,
  type IEventStore,
  type EventMetadata,
  type EventBusStats,
  type EventSnapshot,
  type EventSubscriptionOptions
} from './events/DomainEvent';