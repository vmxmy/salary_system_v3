/**
 * Core Architecture Components Exports
 * 
 * 统一导出核心架构组件
 */

// 事件系统
export { EventBus } from './events/EventBus';

// 依赖注入
export {
  DIContainer,
  ServiceLifetime,
  Injectable,
  Inject,
  container,
  autoRegisterServices,
  SERVICE_TOKENS,
  type IDIContainer,
  type ServiceIdentifier,
  type ServiceDescriptor,
  type ServiceFactory,
  type ContainerStats
} from './di/DIContainer';

// DI类型
export {
  createToken,
  DIError,
  CircularDependencyDIError,
  ServiceNotFoundError,
  METADATA_KEYS,
  type ServiceToken,
  type ServiceConstructor,
  type ServiceImplementation,
  type IInjectable,
  type ParameterMetadata
} from './di/types';