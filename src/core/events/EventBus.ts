/**
 * 事件总线系统
 * 
 * 实现事件的发布、订阅和路由机制
 * 支持同步和异步事件处理
 */

import { AllDomainEvents, EventMetadata, EventPriority, EventCategory } from './DomainEvents';
import { EventStore } from './EventStore';
import { Logger } from '../infrastructure/Logger';

// 事件处理器接口
export interface EventHandler<T extends AllDomainEvents = AllDomainEvents> {
    handle(event: T, metadata?: EventMetadata): Promise<void>;
    canHandle(eventType: string): boolean;
    getPriority(): number; // 数字越小优先级越高
}

// 事件订阅者接口
export interface EventSubscription {
    id: string;
    eventTypes: string[];
    handler: EventHandler;
    priority: number;
    isActive: boolean;
    errorCount: number;
    lastError?: {
        message: string;
        timestamp: Date;
    };
    metadata?: {
        subscriberName?: string;
        description?: string;
        maxRetries?: number;
    };
}

// 事件发布结果
export interface PublishResult {
    eventId: string;
    success: boolean;
    handlerResults: Array<{
        subscriptionId: string;
        success: boolean;
        error?: string;
        executionTime: number;
    }>;
    totalExecutionTime: number;
}

// 事件总线配置
export interface EventBusConfig {
    enableAsyncProcessing: boolean;
    maxRetries: number;
    retryDelay: number;
    enableEventStore: boolean;
    enableMetrics: boolean;
    deadLetterQueue?: boolean;
}

/**
 * 内存事件总线实现
 */
export class EventBus {
    private logger: Logger;
    private subscriptions = new Map<string, EventSubscription>();
    private eventStore?: EventStore;
    private config: EventBusConfig;
    private metrics = {
        eventsPublished: 0,
        eventsProcessed: 0,
        eventsFailed: 0,
        averageProcessingTime: 0
    };

    constructor(
        config: Partial<EventBusConfig> = {},
        eventStore?: EventStore
    ) {
        this.logger = Logger.getInstance();
        this.eventStore = eventStore;
        this.config = {
            enableAsyncProcessing: true,
            maxRetries: 3,
            retryDelay: 1000,
            enableEventStore: true,
            enableMetrics: true,
            deadLetterQueue: false,
            ...config
        };

        this.logger.info('事件总线已初始化', {
            config: this.config,
            eventStoreEnabled: !!this.eventStore
        });
    }

    /**
     * 发布事件
     * 
     * @param event 领域事件
     * @param metadata 事件元数据
     * @param context 发布上下文
     */
    async publish(
        event: AllDomainEvents,
        metadata?: EventMetadata,
        context?: {
            aggregateId?: string;
            aggregateType?: string;
            userId?: string;
            sessionId?: string;
            correlationId?: string;
        }
    ): Promise<PublishResult> {
        const startTime = Date.now();
        let eventId = '';

        try {
            // 设置默认元数据
            const eventMetadata: EventMetadata = {
                priority: EventPriority.NORMAL,
                category: EventCategory.BUSINESS,
                retryable: true,
                correlationId: context?.correlationId || this.generateCorrelationId(),
                ...metadata
            };

            // 保存到事件存储
            if (this.config.enableEventStore && this.eventStore) {
                eventId = await this.eventStore.saveEvent(
                    event,
                    eventMetadata,
                    context?.aggregateId,
                    context?.aggregateType,
                    context?.userId,
                    context?.sessionId
                );
            }

            // 查找匹配的订阅者
            const matchingSubscriptions = Array.from(this.subscriptions.values())
                .filter(sub => 
                    sub.isActive && 
                    sub.eventTypes.some(type => type === event.eventType || type === '*')
                )
                .sort((a, b) => a.priority - b.priority);

            if (matchingSubscriptions.length === 0) {
                this.logger.warn('没有找到匹配的事件处理器', {
                    eventType: event.eventType,
                    eventId
                });
            }

            // 处理事件
            const handlerResults = await this.processEventHandlers(
                event,
                eventMetadata,
                matchingSubscriptions
            );

            const totalExecutionTime = Date.now() - startTime;
            const success = handlerResults.every(result => result.success);

            // 更新指标
            if (this.config.enableMetrics) {
                this.updateMetrics(success, totalExecutionTime);
            }

            const result: PublishResult = {
                eventId,
                success,
                handlerResults,
                totalExecutionTime
            };

            this.logger.info('事件发布完成', {
                eventType: event.eventType,
                eventId,
                success,
                handlersExecuted: handlerResults.length,
                totalExecutionTime
            });

            return result;

        } catch (error) {
            const totalExecutionTime = Date.now() - startTime;

            this.logger.error('事件发布失败', {
                eventType: event.eventType,
                eventId,
                error: error.message,
                totalExecutionTime
            });

            // 更新失败指标
            if (this.config.enableMetrics) {
                this.metrics.eventsFailed++;
            }

            return {
                eventId,
                success: false,
                handlerResults: [],
                totalExecutionTime
            };
        }
    }

    /**
     * 订阅事件
     * 
     * @param eventTypes 事件类型列表
     * @param handler 事件处理器
     * @param options 订阅选项
     */
    subscribe(
        eventTypes: string[],
        handler: EventHandler,
        options?: {
            priority?: number;
            subscriberName?: string;
            description?: string;
            maxRetries?: number;
        }
    ): string {
        const subscriptionId = this.generateSubscriptionId();
        
        const subscription: EventSubscription = {
            id: subscriptionId,
            eventTypes: [...eventTypes],
            handler,
            priority: options?.priority || handler.getPriority(),
            isActive: true,
            errorCount: 0,
            metadata: {
                subscriberName: options?.subscriberName,
                description: options?.description,
                maxRetries: options?.maxRetries || this.config.maxRetries
            }
        };

        this.subscriptions.set(subscriptionId, subscription);

        this.logger.info('事件订阅已创建', {
            subscriptionId,
            eventTypes,
            subscriberName: options?.subscriberName,
            priority: subscription.priority
        });

        return subscriptionId;
    }

    /**
     * 取消订阅
     * 
     * @param subscriptionId 订阅ID
     */
    unsubscribe(subscriptionId: string): boolean {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription) {
            this.logger.warn('尝试取消不存在的订阅', { subscriptionId });
            return false;
        }

        this.subscriptions.delete(subscriptionId);

        this.logger.info('事件订阅已取消', {
            subscriptionId,
            subscriberName: subscription.metadata?.subscriberName
        });

        return true;
    }

    /**
     * 暂停订阅
     * 
     * @param subscriptionId 订阅ID
     */
    pauseSubscription(subscriptionId: string): boolean {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription) {
            return false;
        }

        subscription.isActive = false;
        
        this.logger.info('事件订阅已暂停', {
            subscriptionId,
            subscriberName: subscription.metadata?.subscriberName
        });

        return true;
    }

    /**
     * 恢复订阅
     * 
     * @param subscriptionId 订阅ID
     */
    resumeSubscription(subscriptionId: string): boolean {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription) {
            return false;
        }

        subscription.isActive = true;
        subscription.errorCount = 0; // 重置错误计数
        delete subscription.lastError;
        
        this.logger.info('事件订阅已恢复', {
            subscriptionId,
            subscriberName: subscription.metadata?.subscriberName
        });

        return true;
    }

    /**
     * 获取订阅信息
     * 
     * @param subscriptionId 订阅ID（可选）
     */
    getSubscriptions(subscriptionId?: string): EventSubscription[] {
        if (subscriptionId) {
            const subscription = this.subscriptions.get(subscriptionId);
            return subscription ? [subscription] : [];
        }

        return Array.from(this.subscriptions.values());
    }

    /**
     * 获取事件总线指标
     */
    getMetrics() {
        return {
            ...this.metrics,
            activeSubscriptions: this.subscriptions.size,
            config: this.config
        };
    }

    /**
     * 清理失败的订阅
     * 
     * @param maxErrors 最大错误数
     */
    cleanupFailedSubscriptions(maxErrors: number = 10): number {
        let removedCount = 0;

        for (const [subscriptionId, subscription] of this.subscriptions.entries()) {
            if (subscription.errorCount >= maxErrors) {
                this.subscriptions.delete(subscriptionId);
                removedCount++;

                this.logger.info('移除失败的订阅', {
                    subscriptionId,
                    errorCount: subscription.errorCount,
                    subscriberName: subscription.metadata?.subscriberName
                });
            }
        }

        return removedCount;
    }

    // 私有方法

    /**
     * 处理事件处理器
     */
    private async processEventHandlers(
        event: AllDomainEvents,
        metadata: EventMetadata,
        subscriptions: EventSubscription[]
    ): Promise<Array<{
        subscriptionId: string;
        success: boolean;
        error?: string;
        executionTime: number;
    }>> {
        const results = [];

        if (this.config.enableAsyncProcessing) {
            // 异步并行处理
            const promises = subscriptions.map(sub => 
                this.executeHandler(event, metadata, sub)
            );
            
            const handlerResults = await Promise.allSettled(promises);
            
            for (let i = 0; i < handlerResults.length; i++) {
                const result = handlerResults[i];
                const subscription = subscriptions[i];
                
                if (result.status === 'fulfilled') {
                    results.push({
                        subscriptionId: subscription.id,
                        success: result.value.success,
                        error: result.value.error,
                        executionTime: result.value.executionTime
                    });
                } else {
                    results.push({
                        subscriptionId: subscription.id,
                        success: false,
                        error: result.reason?.message || '未知错误',
                        executionTime: 0
                    });
                }
            }
        } else {
            // 同步串行处理
            for (const subscription of subscriptions) {
                const result = await this.executeHandler(event, metadata, subscription);
                results.push({
                    subscriptionId: subscription.id,
                    success: result.success,
                    error: result.error,
                    executionTime: result.executionTime
                });
            }
        }

        return results;
    }

    /**
     * 执行单个处理器
     */
    private async executeHandler(
        event: AllDomainEvents,
        metadata: EventMetadata,
        subscription: EventSubscription
    ): Promise<{
        success: boolean;
        error?: string;
        executionTime: number;
    }> {
        const startTime = Date.now();

        try {
            if (!subscription.handler.canHandle(event.eventType)) {
                return {
                    success: false,
                    error: '处理器无法处理此事件类型',
                    executionTime: Date.now() - startTime
                };
            }

            await subscription.handler.handle(event, metadata);

            return {
                success: true,
                executionTime: Date.now() - startTime
            };

        } catch (error) {
            // 记录错误
            subscription.errorCount++;
            subscription.lastError = {
                message: error.message,
                timestamp: new Date()
            };

            // 如果错误过多，暂停订阅
            const maxRetries = subscription.metadata?.maxRetries || this.config.maxRetries;
            if (subscription.errorCount >= maxRetries) {
                subscription.isActive = false;
                
                this.logger.warn('订阅因错误过多被暂停', {
                    subscriptionId: subscription.id,
                    errorCount: subscription.errorCount,
                    subscriberName: subscription.metadata?.subscriberName
                });
            }

            this.logger.error('事件处理器执行失败', {
                subscriptionId: subscription.id,
                eventType: event.eventType,
                error: error.message,
                errorCount: subscription.errorCount
            });

            return {
                success: false,
                error: error.message,
                executionTime: Date.now() - startTime
            };
        }
    }

    /**
     * 更新指标
     */
    private updateMetrics(success: boolean, executionTime: number): void {
        this.metrics.eventsPublished++;
        
        if (success) {
            this.metrics.eventsProcessed++;
        } else {
            this.metrics.eventsFailed++;
        }

        // 计算平均处理时间
        const totalProcessed = this.metrics.eventsProcessed + this.metrics.eventsFailed;
        this.metrics.averageProcessingTime = 
            (this.metrics.averageProcessingTime * (totalProcessed - 1) + executionTime) / totalProcessed;
    }

    /**
     * 生成关联ID
     */
    private generateCorrelationId(): string {
        return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 生成订阅ID
     */
    private generateSubscriptionId(): string {
        return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * 基础事件处理器抽象类
 */
export abstract class BaseEventHandler<T extends AllDomainEvents = AllDomainEvents> 
    implements EventHandler<T> {
    
    protected logger: Logger;

    constructor(protected name: string, protected priority: number = 100) {
        this.logger = Logger.getInstance();
    }

    abstract handle(event: T, metadata?: EventMetadata): Promise<void>;
    abstract canHandle(eventType: string): boolean;

    getPriority(): number {
        return this.priority;
    }

    protected logHandling(event: T, action: string): void {
        this.logger.info(`[${this.name}] ${action}`, {
            eventType: event.eventType,
            eventId: event.id,
            occurredAt: event.occurredAt
        });
    }

    protected logError(event: T, error: Error): void {
        this.logger.error(`[${this.name}] 处理事件失败`, {
            eventType: event.eventType,
            eventId: event.id,
            error: error.message
        });
    }
}