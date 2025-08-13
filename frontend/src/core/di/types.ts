/**
 * DI容器类型定义
 * 
 * 提供完整的TypeScript类型支持，确保编译时类型安全
 */

import 'reflect-metadata';

// 确保 reflect-metadata 可用
declare global {
  namespace Reflect {
    function getMetadata(metadataKey: any, target: any): any;
    function defineMetadata(metadataKey: any, metadataValue: any, target: any): void;
  }
}

/**
 * 可注入的服务接口
 */
export interface IInjectable {
  /**
   * 服务清理方法（可选）
   * 在容器销毁时调用
   */
  dispose?(): void | Promise<void>;
}

/**
 * 服务构造函数类型
 */
export type ServiceConstructor<T = any> = new (...args: any[]) => T;

/**
 * 服务工厂函数类型
 */
export type ServiceFactory<T> = (container: any) => T;

/**
 * 服务实现类型
 */
export type ServiceImplementation<T> = ServiceConstructor<T> | ServiceFactory<T> | T;

/**
 * 类型安全的服务标识符
 */
export interface ServiceToken<T> {
  readonly _type: T;
  readonly description: string;
}

/**
 * 创建类型安全的服务标识符
 */
export function createToken<T>(description: string): ServiceToken<T> {
  return {
    _type: undefined as any,
    description
  };
}

/**
 * 装饰器元数据键
 */
export const METADATA_KEYS = {
  INJECTABLE: 'di:injectable',
  LIFETIME: 'di:lifetime',
  DEPENDENCIES: 'di:dependencies',
  TOKEN: 'di:token'
} as const;

/**
 * 参数装饰器信息
 */
export interface ParameterMetadata {
  index: number;
  token: any;
  optional?: boolean;
}

/**
 * 依赖注入错误类型
 */
export class DIError extends Error {
  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message);
    this.name = 'DIError';
  }
}

/**
 * 循环依赖错误
 */
export class CircularDependencyDIError extends DIError {
  constructor(dependencyChain: string[]) {
    super(`Circular dependency detected: ${dependencyChain.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

/**
 * 服务未找到错误
 */
export class ServiceNotFoundError extends DIError {
  constructor(identifier: string) {
    super(`Service not found: ${identifier}`);
    this.name = 'ServiceNotFoundError';
  }
}