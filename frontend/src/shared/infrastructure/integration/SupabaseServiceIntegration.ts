/**
 * Supabase服务集成层
 * 
 * 提供新Repository架构与现有BaseService架构的桥接和兼容性
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { container, Injectable, ServiceLifetime, SERVICE_TOKENS } from '../../../core/di/DIContainer';
import { EmployeeRepository } from '../../../modules/payroll-import/infrastructure/repositories/EmployeeRepository';
import { PayrollRepository } from '../../../modules/payroll-import/infrastructure/repositories/PayrollRepository';
import { EventBus } from '../../../core/events/EventBus';
import type { Database } from '@/types/supabase';

/**
 * 服务集成配置选项
 */
export interface ServiceIntegrationOptions {
  /** 是否启用事件发布 */
  enableEvents?: boolean;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring?: boolean;
  /** 自定义Supabase客户端 */
  customSupabaseClient?: SupabaseClient<Database>;
}

/**
 * 服务注册信息
 */
interface ServiceRegistration {
  token: symbol;
  implementation: any;
  lifetime: ServiceLifetime;
  initialized: boolean;
}

/**
 * Supabase服务集成管理器
 */
export class SupabaseServiceIntegration {
  private static _instance: SupabaseServiceIntegration;
  private _supabaseClient: SupabaseClient<Database>;
  private _eventBus: EventBus;
  private _registrations: Map<string, ServiceRegistration> = new Map();
  private _isInitialized = false;

  private constructor(options: ServiceIntegrationOptions = {}) {
    this._supabaseClient = options.customSupabaseClient || supabase;
    this._eventBus = new EventBus();
  }

  /**
   * 获取单例实例
   */
  static getInstance(options?: ServiceIntegrationOptions): SupabaseServiceIntegration {
    if (!SupabaseServiceIntegration._instance) {
      SupabaseServiceIntegration._instance = new SupabaseServiceIntegration(options);
    }
    return SupabaseServiceIntegration._instance;
  }

  /**
   * 初始化服务集成
   */
  async initialize(): Promise<void> {
    if (this._isInitialized) {
      console.warn('SupabaseServiceIntegration already initialized');
      return;
    }

    try {
      console.log('🔌 Initializing Supabase service integration...');

      // 1. 注册核心服务
      this.registerCoreServices();

      // 2. 注册Repository服务
      this.registerRepositories();

      // 3. 设置事件订阅
      this.setupEventSubscriptions();

      // 4. 验证服务注册
      await this.validateServiceRegistrations();

      this._isInitialized = true;
      console.log('✅ Supabase service integration initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Supabase service integration:', error);
      throw error;
    }
  }

  /**
   * 注册核心服务
   */
  private registerCoreServices(): void {
    // 注册Supabase客户端
    container.registerSingleton(
      SERVICE_TOKENS.ISupabaseClient,
      () => this._supabaseClient
    );

    // 注册事件总线
    container.registerSingleton(
      SERVICE_TOKENS.IEventBus,
      () => this._eventBus
    );

    this._registrations.set('SupabaseClient', {
      token: SERVICE_TOKENS.ISupabaseClient,
      implementation: this._supabaseClient,
      lifetime: ServiceLifetime.Singleton,
      initialized: true
    });

    this._registrations.set('EventBus', {
      token: SERVICE_TOKENS.IEventBus,
      implementation: this._eventBus,
      lifetime: ServiceLifetime.Singleton,
      initialized: true
    });

    console.log('✅ Core services registered');
  }

  /**
   * 注册Repository服务
   */
  private registerRepositories(): void {
    // 注册Employee Repository
    container.registerSingleton(
      SERVICE_TOKENS.IEmployeeRepository,
      (container) => {
        const supabaseClient = container.resolve(SERVICE_TOKENS.ISupabaseClient);
        return new EmployeeRepository(supabaseClient);
      }
    );

    // 注册Payroll Repository
    container.registerSingleton(
      SERVICE_TOKENS.IPayrollRepository,
      (container) => {
        const supabaseClient = container.resolve(SERVICE_TOKENS.ISupabaseClient);
        return new PayrollRepository(supabaseClient);
      }
    );

    this._registrations.set('EmployeeRepository', {
      token: SERVICE_TOKENS.IEmployeeRepository,
      implementation: EmployeeRepository,
      lifetime: ServiceLifetime.Singleton,
      initialized: false
    });

    this._registrations.set('PayrollRepository', {
      token: SERVICE_TOKENS.IPayrollRepository,
      implementation: PayrollRepository,
      lifetime: ServiceLifetime.Singleton,
      initialized: false
    });

    console.log('✅ Repository services registered');
  }

  /**
   * 设置事件订阅
   */
  private setupEventSubscriptions(): void {
    // 订阅员工相关事件
    this._eventBus.subscribe('Employee*', {
      handle: async (event) => {
        console.debug('Employee event received:', event.eventType, event.payload);
        // 可以在这里添加业务逻辑，如缓存失效、审计日志等
      },
      getHandlerName: () => 'EmployeeEventHandler',
      canHandle: (event) => event.eventType.startsWith('Employee')
    });

    // 订阅薪资相关事件
    this._eventBus.subscribe('Payroll*', {
      handle: async (event) => {
        console.debug('Payroll event received:', event.eventType, event.payload);
        // 可以在这里添加业务逻辑，如审计日志、通知等
      },
      getHandlerName: () => 'PayrollEventHandler',
      canHandle: (event) => event.eventType.startsWith('Payroll')
    });

    console.log('✅ Event subscriptions setup completed');
  }

  /**
   * 验证服务注册
   */
  private async validateServiceRegistrations(): Promise<void> {
    const validationResults: Array<{ service: string; success: boolean; error?: string }> = [];

    for (const [serviceName, registration] of this._registrations.entries()) {
      try {
        const instance = container.resolve(registration.token);
        
        if (!instance) {
          throw new Error('Service instance is null or undefined');
        }

        // 标记为已初始化
        registration.initialized = true;
        
        validationResults.push({ service: serviceName, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        validationResults.push({ 
          service: serviceName, 
          success: false, 
          error: errorMessage 
        });
      }
    }

    // 输出验证结果
    const successCount = validationResults.filter(r => r.success).length;
    const failureCount = validationResults.filter(r => !r.success).length;

    console.log(`📊 Service validation completed: ${successCount} success, ${failureCount} failures`);

    if (failureCount > 0) {
      const failures = validationResults.filter(r => !r.success);
      console.error('❌ Service validation failures:', failures);
      throw new Error(`Failed to validate ${failureCount} services`);
    }
  }

  /**
   * 获取服务实例
   */
  getService<T>(serviceToken: symbol): T {
    if (!this._isInitialized) {
      throw new Error('SupabaseServiceIntegration not initialized. Call initialize() first.');
    }
    return container.resolve<T>(serviceToken);
  }

  /**
   * 获取Employee Repository
   */
  getEmployeeRepository(): EmployeeRepository {
    return this.getService<EmployeeRepository>(SERVICE_TOKENS.IEmployeeRepository);
  }

  /**
   * 获取Payroll Repository
   */
  getPayrollRepository(): PayrollRepository {
    return this.getService<PayrollRepository>(SERVICE_TOKENS.IPayrollRepository);
  }

  /**
   * 获取事件总线
   */
  getEventBus(): EventBus {
    return this._eventBus;
  }

  /**
   * 获取Supabase客户端
   */
  getSupabaseClient(): SupabaseClient<Database> {
    return this._supabaseClient;
  }

  /**
   * 获取服务统计信息
   */
  getServiceStats() {
    const containerStats = container.getStats();
    const eventBusStats = this._eventBus.getStats();
    
    const registrationSummary = Array.from(this._registrations.entries()).map(([name, reg]) => ({
      serviceName: name,
      lifetime: reg.lifetime,
      initialized: reg.initialized
    }));

    return {
      isInitialized: this._isInitialized,
      containerStats,
      eventBusStats,
      registeredServices: registrationSummary,
      totalRegistrations: this._registrations.size
    };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    if (!this._isInitialized) {
      return;
    }

    try {
      console.log('🧹 Cleaning up Supabase service integration...');

      // 清理事件总线
      await this._eventBus.dispose();

      // 清理DI容器
      container.dispose();

      // 清理注册信息
      this._registrations.clear();

      this._isInitialized = false;
      console.log('✅ Supabase service integration cleanup completed');

    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }
  }

  /**
   * 重新初始化
   */
  async reinitialize(options?: ServiceIntegrationOptions): Promise<void> {
    await this.cleanup();
    
    if (options) {
      this._supabaseClient = options.customSupabaseClient || supabase;
    }
    
    await this.initialize();
  }

  /**
   * 检查服务健康状态
   */
  async healthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: Array<{
      name: string;
      status: 'healthy' | 'unhealthy';
      message?: string;
    }>;
  }> {
    const serviceChecks: Array<{
      name: string;
      status: 'healthy' | 'unhealthy';
      message?: string;
    }> = [];

    // 检查Supabase连接
    try {
      const { data, error } = await this._supabaseClient
        .from('employees')
        .select('count')
        .limit(1);
      
      serviceChecks.push({
        name: 'Supabase Connection',
        status: error ? 'unhealthy' : 'healthy',
        message: error?.message
      });
    } catch (error) {
      serviceChecks.push({
        name: 'Supabase Connection',
        status: 'unhealthy',
        message: (error as Error).message
      });
    }

    // 检查Repository服务
    try {
      const employeeRepo = this.getEmployeeRepository();
      const stats = await employeeRepo.getQueryStats();
      
      serviceChecks.push({
        name: 'Employee Repository',
        status: 'healthy',
        message: `Total queries: ${stats.totalQueries}`
      });
    } catch (error) {
      serviceChecks.push({
        name: 'Employee Repository',
        status: 'unhealthy',
        message: (error as Error).message
      });
    }

    // 检查事件总线
    const eventStats = this._eventBus.getStats();
    serviceChecks.push({
      name: 'Event Bus',
      status: 'healthy',
      message: `Subscribers: ${eventStats.subscriberCount}, Events processed: ${eventStats.totalEventsProcessed}`
    });

    // 确定整体健康状态
    const unhealthyCount = serviceChecks.filter(s => s.status === 'unhealthy').length;
    const overall = unhealthyCount === 0 ? 'healthy' : 
                   unhealthyCount < serviceChecks.length ? 'degraded' : 'unhealthy';

    return {
      overall,
      services: serviceChecks
    };
  }
}

/**
 * 快捷初始化函数
 */
export async function initializeSupabaseIntegration(
  options: ServiceIntegrationOptions = {}
): Promise<SupabaseServiceIntegration> {
  const integration = SupabaseServiceIntegration.getInstance(options);
  await integration.initialize();
  return integration;
}

/**
 * 获取集成实例
 */
export function getSupabaseIntegration(): SupabaseServiceIntegration {
  return SupabaseServiceIntegration.getInstance();
}