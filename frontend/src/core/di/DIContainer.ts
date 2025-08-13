/**
 * 轻量级依赖注入容器
 * 
 * 提供类型安全的服务注册和解析，支持：
 * - @Injectable 和 @Inject 装饰器
 * - 单例和瞬态生命周期管理
 * - 循环依赖检测
 * - 接口到实现的类型安全绑定
 * - 自动服务发现和注册
 */

import { CircularDependencyError } from '../../shared/domain/errors/DomainError';

/**
 * 服务生命周期枚举
 */
export enum ServiceLifetime {
  /** 单例模式 - 全局唯一实例 */
  Singleton = 'singleton',
  /** 瞬态模式 - 每次请求创建新实例 */
  Transient = 'transient',
  /** 作用域模式 - 在特定作用域内单例 */
  Scoped = 'scoped'
}

/**
 * 服务标识符类型
 */
export type ServiceIdentifier<T = any> = string | symbol | (new (...args: any[]) => T);

/**
 * 服务描述符
 */
export interface ServiceDescriptor<T = any> {
  /** 服务标识符 */
  identifier: ServiceIdentifier<T>;
  /** 实现类型或实例 */
  implementation: new (...args: any[]) => T | T;
  /** 生命周期 */
  lifetime: ServiceLifetime;
  /** 依赖项 */
  dependencies: ServiceIdentifier[];
  /** 是否已解析 */
  resolved: boolean;
  /** 单例实例（仅用于Singleton） */
  instance?: T;
  /** 注册时间 */
  registeredAt: Date;
}

/**
 * 服务解析上下文
 */
interface ResolutionContext {
  /** 当前解析路径（用于循环依赖检测） */
  resolutionPath: ServiceIdentifier[];
  /** 作用域实例缓存 */
  scopedInstances: Map<ServiceIdentifier, any>;
}

/**
 * 服务工厂函数类型
 */
export type ServiceFactory<T> = (container: IDIContainer) => T;

/**
 * DI容器接口
 */
export interface IDIContainer {
  /** 注册服务 */
  register<T>(
    identifier: ServiceIdentifier<T>,
    implementation: new (...args: any[]) => T | ServiceFactory<T>,
    lifetime?: ServiceLifetime
  ): IDIContainer;

  /** 注册单例服务 */
  registerSingleton<T>(
    identifier: ServiceIdentifier<T>,
    implementation: new (...args: any[]) => T | ServiceFactory<T>
  ): IDIContainer;

  /** 注册瞬态服务 */
  registerTransient<T>(
    identifier: ServiceIdentifier<T>,
    implementation: new (...args: any[]) => T | ServiceFactory<T>
  ): IDIContainer;

  /** 绑定接口到实现 */
  bind<TInterface, TImplementation extends TInterface>(
    serviceInterface: ServiceIdentifier<TInterface>,
    implementation: new (...args: any[]) => TImplementation,
    lifetime?: ServiceLifetime
  ): IDIContainer;

  /** 解析服务 */
  resolve<T>(identifier: ServiceIdentifier<T>): T;

  /** 尝试解析服务 */
  tryResolve<T>(identifier: ServiceIdentifier<T>): T | null;

  /** 检查服务是否已注册 */
  isRegistered<T>(identifier: ServiceIdentifier<T>): boolean;

  /** 创建子容器（作用域） */
  createScope(): IDIContainer;

  /** 获取服务统计信息 */
  getStats(): ContainerStats;

  /** 清理容器 */
  dispose(): void;
}

/**
 * 容器统计信息
 */
export interface ContainerStats {
  registeredServices: number;
  singletonInstances: number;
  totalResolutions: number;
  averageResolutionTime: number;
  circularDependencyErrors: number;
}

/**
 * 轻量级DI容器实现
 */
export class DIContainer implements IDIContainer {
  private services = new Map<ServiceIdentifier, ServiceDescriptor>();
  private stats: ContainerStats = {
    registeredServices: 0,
    singletonInstances: 0,
    totalResolutions: 0,
    averageResolutionTime: 0,
    circularDependencyErrors: 0
  };

  constructor(private parent?: DIContainer) {}

  /**
   * 注册服务
   */
  register<T>(
    identifier: ServiceIdentifier<T>,
    implementation: new (...args: any[]) => T | ServiceFactory<T>,
    lifetime: ServiceLifetime = ServiceLifetime.Transient
  ): IDIContainer {
    const dependencies = this.extractDependencies(implementation);
    
    const descriptor: ServiceDescriptor<T> = {
      identifier,
      implementation,
      lifetime,
      dependencies,
      resolved: false,
      registeredAt: new Date()
    };

    this.services.set(identifier, descriptor);
    this.stats.registeredServices++;

    console.debug(`Service registered: ${this.getServiceName(identifier)} (${lifetime})`);
    return this;
  }

  /**
   * 注册单例服务
   */
  registerSingleton<T>(
    identifier: ServiceIdentifier<T>,
    implementation: new (...args: any[]) => T | ServiceFactory<T>
  ): IDIContainer {
    return this.register(identifier, implementation, ServiceLifetime.Singleton);
  }

  /**
   * 注册瞬态服务
   */
  registerTransient<T>(
    identifier: ServiceIdentifier<T>,
    implementation: new (...args: any[]) => T | ServiceFactory<T>
  ): IDIContainer {
    return this.register(identifier, implementation, ServiceLifetime.Transient);
  }

  /**
   * 绑定接口到实现
   */
  bind<TInterface, TImplementation extends TInterface>(
    serviceInterface: ServiceIdentifier<TInterface>,
    implementation: new (...args: any[]) => TImplementation,
    lifetime: ServiceLifetime = ServiceLifetime.Transient
  ): IDIContainer {
    return this.register(serviceInterface, implementation, lifetime);
  }

  /**
   * 解析服务
   */
  resolve<T>(identifier: ServiceIdentifier<T>): T {
    const startTime = performance.now();
    const context: ResolutionContext = {
      resolutionPath: [],
      scopedInstances: new Map()
    };

    try {
      const result = this.resolveInternal<T>(identifier, context);
      
      const resolutionTime = performance.now() - startTime;
      this.updateResolutionStats(resolutionTime);
      
      return result;
    } catch (error) {
      if (error instanceof CircularDependencyError) {
        this.stats.circularDependencyErrors++;
      }
      throw error;
    }
  }

  /**
   * 尝试解析服务
   */
  tryResolve<T>(identifier: ServiceIdentifier<T>): T | null {
    try {
      return this.resolve<T>(identifier);
    } catch {
      return null;
    }
  }

  /**
   * 检查服务是否已注册
   */
  isRegistered<T>(identifier: ServiceIdentifier<T>): boolean {
    return this.services.has(identifier) || (this.parent?.isRegistered(identifier) ?? false);
  }

  /**
   * 创建子容器（作用域）
   */
  createScope(): IDIContainer {
    return new DIContainer(this);
  }

  /**
   * 获取服务统计信息
   */
  getStats(): ContainerStats {
    return { ...this.stats };
  }

  /**
   * 清理容器
   */
  dispose(): void {
    // 清理单例实例
    for (const descriptor of this.services.values()) {
      if (descriptor.instance && typeof descriptor.instance === 'object') {
        if ('dispose' in descriptor.instance && typeof descriptor.instance.dispose === 'function') {
          try {
            descriptor.instance.dispose();
          } catch (error) {
            console.error(`Error disposing service ${this.getServiceName(descriptor.identifier)}:`, error);
          }
        }
      }
    }

    this.services.clear();
    this.stats = {
      registeredServices: 0,
      singletonInstances: 0,
      totalResolutions: 0,
      averageResolutionTime: 0,
      circularDependencyErrors: 0
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 内部解析方法
   */
  private resolveInternal<T>(identifier: ServiceIdentifier<T>, context: ResolutionContext): T {
    // 检查循环依赖
    if (context.resolutionPath.includes(identifier)) {
      const dependencyChain = [...context.resolutionPath, identifier].map(id => this.getServiceName(id));
      throw new CircularDependencyError(
        this.getServiceName(identifier),
        dependencyChain
      );
    }

    // 获取服务描述符
    const descriptor = this.getServiceDescriptor<T>(identifier);
    if (!descriptor) {
      throw new Error(`Service not registered: ${this.getServiceName(identifier)}`);
    }

    // 检查作用域缓存
    if (descriptor.lifetime === ServiceLifetime.Scoped) {
      const cachedInstance = context.scopedInstances.get(identifier);
      if (cachedInstance) {
        return cachedInstance;
      }
    }

    // 检查单例缓存
    if (descriptor.lifetime === ServiceLifetime.Singleton && descriptor.instance) {
      return descriptor.instance;
    }

    // 添加到解析路径
    context.resolutionPath.push(identifier);

    try {
      // 解析依赖项
      const dependencies = descriptor.dependencies.map(dep => 
        this.resolveInternal(dep, context)
      );

      // 创建实例
      const instance = this.createInstance<T>(descriptor, dependencies);

      // 缓存实例
      if (descriptor.lifetime === ServiceLifetime.Singleton) {
        descriptor.instance = instance;
        this.stats.singletonInstances++;
      } else if (descriptor.lifetime === ServiceLifetime.Scoped) {
        context.scopedInstances.set(identifier, instance);
      }

      return instance;
    } finally {
      // 从解析路径中移除
      context.resolutionPath.pop();
    }
  }

  /**
   * 获取服务描述符
   */
  private getServiceDescriptor<T>(identifier: ServiceIdentifier<T>): ServiceDescriptor<T> | null {
    const descriptor = this.services.get(identifier);
    if (descriptor) {
      return descriptor as ServiceDescriptor<T>;
    }

    // 在父容器中查找
    if (this.parent) {
      return this.parent.getServiceDescriptor(identifier);
    }

    return null;
  }

  /**
   * 创建服务实例
   */
  private createInstance<T>(descriptor: ServiceDescriptor<T>, dependencies: any[]): T {
    const { implementation } = descriptor;

    // 工厂函数
    if (typeof implementation === 'function' && implementation.length === 1) {
      const factory = implementation as ServiceFactory<T>;
      return factory(this);
    }

    // 构造函数
    if (typeof implementation === 'function') {
      const Constructor = implementation as new (...args: any[]) => T;
      return new Constructor(...dependencies);
    }

    // 直接实例
    return implementation as T;
  }

  /**
   * 提取依赖项
   */
  private extractDependencies(implementation: any): ServiceIdentifier[] {
    // 如果是工厂函数，不需要提取依赖
    if (typeof implementation === 'function' && implementation.length === 1) {
      return [];
    }

    // 从装饰器元数据中提取依赖项
    const dependencies: ServiceIdentifier[] = [];
    
    if (typeof implementation === 'function') {
      const metadata = Reflect.getMetadata('di:dependencies', implementation);
      if (metadata && Array.isArray(metadata)) {
        dependencies.push(...metadata);
      }
    }

    return dependencies;
  }

  /**
   * 获取服务名称
   */
  private getServiceName(identifier: ServiceIdentifier): string {
    if (typeof identifier === 'string') {
      return identifier;
    }
    if (typeof identifier === 'symbol') {
      return identifier.toString();
    }
    if (typeof identifier === 'function') {
      return identifier.name || 'Anonymous';
    }
    return 'Unknown';
  }

  /**
   * 更新解析统计信息
   */
  private updateResolutionStats(resolutionTime: number): void {
    this.stats.totalResolutions++;
    const totalTime = this.stats.averageResolutionTime * (this.stats.totalResolutions - 1) + resolutionTime;
    this.stats.averageResolutionTime = totalTime / this.stats.totalResolutions;
  }

  /**
   * 获取所有已注册的服务
   */
  getRegisteredServices(): Array<{
    identifier: string;
    lifetime: ServiceLifetime;
    hasInstance: boolean;
    dependencies: string[];
    registeredAt: Date;
  }> {
    return Array.from(this.services.values()).map(descriptor => ({
      identifier: this.getServiceName(descriptor.identifier),
      lifetime: descriptor.lifetime,
      hasInstance: !!descriptor.instance,
      dependencies: descriptor.dependencies.map(dep => this.getServiceName(dep)),
      registeredAt: descriptor.registeredAt
    }));
  }
}

// ==================== 装饰器 ====================

/**
 * 服务标识符符号
 */
export const SERVICE_TOKENS = {
  IEventBus: Symbol('IEventBus'),
  IEmployeeRepository: Symbol('IEmployeeRepository'),
  IPayrollRepository: Symbol('IPayrollRepository'),
  ISalaryComponentRepository: Symbol('ISalaryComponentRepository'),
  IImportDomainService: Symbol('IImportDomainService'),
  ISupabaseClient: Symbol('ISupabaseClient')
} as const;

/**
 * Injectable 装饰器
 */
export function Injectable(lifetime: ServiceLifetime = ServiceLifetime.Transient) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    Reflect.defineMetadata('di:injectable', true, constructor);
    Reflect.defineMetadata('di:lifetime', lifetime, constructor);
    return constructor;
  };
}

/**
 * Inject 装饰器
 */
export function Inject(token: ServiceIdentifier) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingTokens = Reflect.getMetadata('di:dependencies', target) || [];
    existingTokens[parameterIndex] = token;
    Reflect.defineMetadata('di:dependencies', existingTokens, target);
  };
}

/**
 * 全局DI容器实例
 */
export const container = new DIContainer();

/**
 * 自动服务发现和注册
 */
export function autoRegisterServices(serviceClasses: any[]): void {
  for (const serviceClass of serviceClasses) {
    const isInjectable = Reflect.getMetadata('di:injectable', serviceClass);
    if (isInjectable) {
      const lifetime = Reflect.getMetadata('di:lifetime', serviceClass) || ServiceLifetime.Transient;
      container.register(serviceClass, serviceClass, lifetime);
    }
  }
}