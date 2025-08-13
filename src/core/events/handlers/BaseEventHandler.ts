/**
 * 事件处理器基类
 * 
 * 提供事件处理的基础功能和通用逻辑
 */

import { AllDomainEvents, EventMetadata } from '../DomainEvents';
import { EventHandler } from '../EventBus';
import { Logger } from '../../infrastructure/Logger';

// 处理器配置
export interface HandlerConfig {
    name: string;
    priority?: number;
    maxRetries?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
    enableLogging?: boolean;
    enableMetrics?: boolean;
}

// 处理器状态
export interface HandlerState {
    totalProcessed: number;
    totalFailed: number;
    averageExecutionTime: number;
    lastProcessedAt?: Date;
    lastError?: {
        message: string;
        occurredAt: Date;
        eventType?: string;
    };
}

/**
 * 基础事件处理器
 */
export abstract class BaseEventHandler<T extends AllDomainEvents = AllDomainEvents> 
    implements EventHandler<T> {
    
    protected logger: Logger;
    protected config: HandlerConfig;
    protected state: HandlerState = {
        totalProcessed: 0,
        totalFailed: 0,
        averageExecutionTime: 0
    };

    constructor(config: HandlerConfig) {
        this.logger = Logger.getInstance();
        this.config = {
            priority: 100,
            maxRetries: 3,
            retryDelayMs: 1000,
            timeoutMs: 30000,
            enableLogging: true,
            enableMetrics: true,
            ...config
        };
    }

    /**
     * 处理事件（模板方法）
     */
    async handle(event: T, metadata?: EventMetadata): Promise<void> {
        const startTime = Date.now();

        try {
            // 前置处理
            if (this.config.enableLogging) {
                this.logEventReceived(event, metadata);
            }

            // 验证事件
            await this.validateEvent(event, metadata);

            // 设置超时
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`处理超时: ${this.config.timeoutMs}ms`));
                }, this.config.timeoutMs);
            });

            // 执行处理逻辑
            await Promise.race([
                this.doHandle(event, metadata),
                timeoutPromise
            ]);

            // 后置处理
            const executionTime = Date.now() - startTime;
            this.updateSuccessMetrics(executionTime);

            if (this.config.enableLogging) {
                this.logEventProcessed(event, executionTime);
            }

        } catch (error) {
            const executionTime = Date.now() - startTime;
            await this.handleError(event, error, metadata, executionTime);
        }
    }

    /**
     * 判断是否能处理该事件类型
     */
    abstract canHandle(eventType: string): boolean;

    /**
     * 获取处理器优先级
     */
    getPriority(): number {
        return this.config.priority || 100;
    }

    /**
     * 获取处理器状态
     */
    getState(): HandlerState {
        return { ...this.state };
    }

    /**
     * 重置处理器状态
     */
    resetState(): void {
        this.state = {
            totalProcessed: 0,
            totalFailed: 0,
            averageExecutionTime: 0
        };
    }

    // 子类必须实现的方法

    /**
     * 执行实际的处理逻辑
     */
    protected abstract doHandle(event: T, metadata?: EventMetadata): Promise<void>;

    // 可选的钩子方法

    /**
     * 验证事件
     */
    protected async validateEvent(event: T, metadata?: EventMetadata): Promise<void> {
        // 子类可以覆盖此方法进行自定义验证
        if (!event || !event.eventType) {
            throw new Error('无效的事件对象');
        }
    }

    /**
     * 处理错误
     */
    protected async handleError(
        event: T,
        error: Error,
        metadata?: EventMetadata,
        executionTime?: number
    ): Promise<void> {
        this.updateErrorMetrics(executionTime || 0, error);

        if (this.config.enableLogging) {
            this.logger.error(`[${this.config.name}] 处理事件失败`, {
                eventType: event.eventType,
                eventId: event.id,
                error: error.message,
                executionTime
            });
        }

        // 判断是否需要重试
        if (this.shouldRetry(error, metadata)) {
            await this.scheduleRetry(event, metadata);
        } else {
            // 如果不重试，则抛出错误
            throw error;
        }
    }

    /**
     * 判断是否应该重试
     */
    protected shouldRetry(error: Error, metadata?: EventMetadata): boolean {
        // 检查元数据中的重试标志
        if (metadata?.retryable === false) {
            return false;
        }

        // 检查是否是临时性错误
        const temporaryErrors = [
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ENOTFOUND',
            'NetworkError',
            'TimeoutError'
        ];

        return temporaryErrors.some(errType => 
            error.message.includes(errType) || error.name === errType
        );
    }

    /**
     * 安排重试
     */
    protected async scheduleRetry(event: T, metadata?: EventMetadata): Promise<void> {
        const retryCount = (metadata as any)?._retryCount || 0;

        if (retryCount >= (this.config.maxRetries || 3)) {
            this.logger.warn(`[${this.config.name}] 达到最大重试次数`, {
                eventType: event.eventType,
                eventId: event.id,
                retryCount
            });
            return;
        }

        const delayMs = this.calculateRetryDelay(retryCount);

        this.logger.info(`[${this.config.name}] 安排事件重试`, {
            eventType: event.eventType,
            eventId: event.id,
            retryCount: retryCount + 1,
            delayMs
        });

        setTimeout(() => {
            const retryMetadata = {
                ...metadata,
                _retryCount: retryCount + 1,
                _retryAt: new Date().toISOString()
            };

            this.handle(event, retryMetadata as EventMetadata).catch(err => {
                this.logger.error(`[${this.config.name}] 重试失败`, {
                    eventType: event.eventType,
                    eventId: event.id,
                    error: err.message
                });
            });
        }, delayMs);
    }

    /**
     * 计算重试延迟（指数退避）
     */
    protected calculateRetryDelay(retryCount: number): number {
        const baseDelay = this.config.retryDelayMs || 1000;
        return Math.min(baseDelay * Math.pow(2, retryCount), 30000);
    }

    // 日志方法

    protected logEventReceived(event: T, metadata?: EventMetadata): void {
        this.logger.info(`[${this.config.name}] 收到事件`, {
            eventType: event.eventType,
            eventId: event.id,
            correlationId: metadata?.correlationId,
            priority: metadata?.priority
        });
    }

    protected logEventProcessed(event: T, executionTime: number): void {
        this.logger.info(`[${this.config.name}] 事件处理完成`, {
            eventType: event.eventType,
            eventId: event.id,
            executionTime
        });
    }

    // 指标更新方法

    protected updateSuccessMetrics(executionTime: number): void {
        if (!this.config.enableMetrics) return;

        this.state.totalProcessed++;
        this.state.lastProcessedAt = new Date();

        // 更新平均执行时间
        const totalEvents = this.state.totalProcessed + this.state.totalFailed;
        this.state.averageExecutionTime = 
            (this.state.averageExecutionTime * (totalEvents - 1) + executionTime) / totalEvents;
    }

    protected updateErrorMetrics(executionTime: number, error: Error): void {
        if (!this.config.enableMetrics) return;

        this.state.totalFailed++;
        this.state.lastError = {
            message: error.message,
            occurredAt: new Date()
        };

        // 更新平均执行时间
        const totalEvents = this.state.totalProcessed + this.state.totalFailed;
        this.state.averageExecutionTime = 
            (this.state.averageExecutionTime * (totalEvents - 1) + executionTime) / totalEvents;
    }
}

/**
 * 批量事件处理器基类
 */
export abstract class BatchEventHandler<T extends AllDomainEvents = AllDomainEvents> 
    extends BaseEventHandler<T> {
    
    private eventBatch: Array<{ event: T; metadata?: EventMetadata }> = [];
    private batchTimer?: NodeJS.Timeout;
    private readonly batchSize: number;
    private readonly batchTimeout: number;

    constructor(config: HandlerConfig & { batchSize?: number; batchTimeout?: number }) {
        super(config);
        this.batchSize = config.batchSize || 10;
        this.batchTimeout = config.batchTimeout || 5000;
    }

    /**
     * 处理单个事件（添加到批次）
     */
    protected async doHandle(event: T, metadata?: EventMetadata): Promise<void> {
        this.eventBatch.push({ event, metadata });

        // 如果达到批次大小，立即处理
        if (this.eventBatch.length >= this.batchSize) {
            await this.processBatch();
        } else {
            // 否则设置定时器
            this.scheduleBatchProcessing();
        }
    }

    /**
     * 处理批次（子类必须实现）
     */
    protected abstract processBatchEvents(
        events: Array<{ event: T; metadata?: EventMetadata }>
    ): Promise<void>;

    /**
     * 处理当前批次
     */
    private async processBatch(): Promise<void> {
        if (this.eventBatch.length === 0) return;

        // 清除定时器
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = undefined;
        }

        // 复制批次并清空
        const batch = [...this.eventBatch];
        this.eventBatch = [];

        try {
            await this.processBatchEvents(batch);
            
            this.logger.info(`[${this.config.name}] 批次处理完成`, {
                batchSize: batch.length
            });
        } catch (error) {
            this.logger.error(`[${this.config.name}] 批次处理失败`, {
                batchSize: batch.length,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 安排批次处理
     */
    private scheduleBatchProcessing(): void {
        if (this.batchTimer) return;

        this.batchTimer = setTimeout(() => {
            this.processBatch().catch(err => {
                this.logger.error(`[${this.config.name}] 定时批次处理失败`, {
                    error: err.message
                });
            });
        }, this.batchTimeout);
    }
}