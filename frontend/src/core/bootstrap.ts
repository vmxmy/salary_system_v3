/**
 * 企业架构基础设施引导程序
 * 
 * 初始化和配置所有核心组件
 */

import 'reflect-metadata';
import { container, autoRegisterServices, SERVICE_TOKENS, ServiceLifetime } from './di/DIContainer';
import { EventBus } from './events/EventBus';
import { type IEventBus } from '../shared/domain/events/DomainEvent';

/**
 * 引导配置选项
 */
export interface BootstrapOptions {
  /** 是否启用开发模式调试 */
  enableDebug?: boolean;
  /** 自动注册的服务类列表 */
  serviceClasses?: any[];
  /** 事件总线配置 */
  eventBus?: {
    enableStats?: boolean;
    maxRetries?: number;
  };
}

/**
 * 应用引导器
 */
export class ApplicationBootstrap {
  private static _instance: ApplicationBootstrap;
  private _isInitialized = false;
  private _eventBus: EventBus;

  private constructor() {
    this._eventBus = new EventBus();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ApplicationBootstrap {
    if (!ApplicationBootstrap._instance) {
      ApplicationBootstrap._instance = new ApplicationBootstrap();
    }
    return ApplicationBootstrap._instance;
  }

  /**
   * 初始化应用基础设施
   */
  async initialize(options: BootstrapOptions = {}): Promise<void> {
    if (this._isInitialized) {
      console.warn('Application already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing enterprise architecture foundation...');

      // 1. 注册核心服务
      this.registerCoreServices();

      // 2. 自动注册服务
      if (options.serviceClasses && options.serviceClasses.length > 0) {
        autoRegisterServices(options.serviceClasses);
        console.log(`✅ Auto-registered ${options.serviceClasses.length} services`);
      }

      // 3. 配置事件总线
      this.configureEventBus(options.eventBus);

      // 4. 启用调试模式
      if (options.enableDebug) {
        this.enableDebugMode();
      }

      this._isInitialized = true;
      console.log('🎉 Enterprise architecture foundation initialized successfully');

      // 5. 发布初始化完成事件
      // await this._eventBus.publish(new ApplicationInitializedEvent());

    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      throw error;
    }
  }

  /**
   * 注册核心服务
   */
  private registerCoreServices(): void {
    // 注册事件总线
    container.registerSingleton(SERVICE_TOKENS.IEventBus, () => this._eventBus);

    console.log('✅ Core services registered');
  }

  /**
   * 配置事件总线
   */
  private configureEventBus(config?: BootstrapOptions['eventBus']): void {
    if (config?.enableStats) {
      // 启用统计信息
      setInterval(() => {
        const stats = this._eventBus.getStats();
        console.debug('EventBus Stats:', stats);
      }, 30000); // 每30秒输出一次统计
    }

    console.log('✅ Event bus configured');
  }

  /**
   * 启用调试模式
   */
  private enableDebugMode(): void {
    // 添加全局错误处理
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
    });

    // 暴露容器到全局（仅开发模式）
    if (process.env.NODE_ENV === 'development') {
      (window as any).__DI_CONTAINER__ = container;
      (window as any).__EVENT_BUS__ = this._eventBus;
    }

    console.log('🐛 Debug mode enabled');
  }

  /**
   * 获取事件总线实例
   */
  getEventBus(): IEventBus {
    return this._eventBus;
  }

  /**
   * 获取容器统计信息
   */
  getContainerStats() {
    return {
      container: container.getStats(),
      eventBus: this._eventBus.getStats(),
      services: container.getRegisteredServices()
    };
  }

  /**
   * 关闭应用
   */
  async shutdown(): Promise<void> {
    if (!this._isInitialized) {
      return;
    }

    console.log('🛑 Shutting down application...');

    try {
      // 清理事件总线
      await this._eventBus.dispose();

      // 清理DI容器
      container.dispose();

      this._isInitialized = false;
      console.log('✅ Application shutdown completed');

    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * 检查是否已初始化
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }
}

/**
 * 快捷初始化函数
 */
export async function bootstrap(options: BootstrapOptions = {}): Promise<ApplicationBootstrap> {
  const app = ApplicationBootstrap.getInstance();
  await app.initialize(options);
  return app;
}

/**
 * 获取应用实例
 */
export function getApplication(): ApplicationBootstrap {
  return ApplicationBootstrap.getInstance();
}