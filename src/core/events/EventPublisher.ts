/**
 * 事件发布器
 * 
 * 提供高级的事件发布接口，封装EventBus和EventStore的复杂性
 * 支持事务性发布、批量发布、延迟发布等高级功能
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AllDomainEvents, EventMetadata, EventPriority, EventCategory } from './DomainEvents';
import { EventBus } from './EventBus';
import { EventStore } from './EventStore';
import { Logger } from '../infrastructure/Logger';

// 发布上下文接口
export interface PublishContext {
    userId?: string;
    sessionId?: string;
    correlationId?: string;
    aggregateId?: string;
    aggregateType?: string;
    causedBy?: string; // 引发此事件的其他事件ID
    metadata?: Record<string, any>;
    tags?: string[];
}

// 事件与上下文的组合
export interface EventWithContext {
    event: AllDomainEvents;
    context?: PublishContext;
    metadata?: Partial<EventMetadata>;
}

// 批量发布选项
export interface BatchPublishOptions {
    maxBatchSize?: number;
    timeoutMs?: number;
    continueOnError?: boolean;
    enableTransaction?: boolean;
}

// 延迟发布选项
export interface DelayedPublishOptions {
    delayMs: number;
    maxRetries?: number;
    retryDelayMs?: number;
    enablePersistence?: boolean;
}

// 发布结果
export interface PublishResult {
    eventId: string;
    success: boolean;
    publishedAt: Date;
    executionTime: number;
    error?: string;
}

// 批量发布结果
export interface BatchPublishResult {
    results: PublishResult[];
    summary: {
        total: number;
        successful: number;
        failed: number;
        totalExecutionTime: number;
    };
}

/**
 * 事件发布器接口
 */
export interface IEventPublisher {
    /**
     * 发布单个事件
     */
    publish<T extends AllDomainEvents>(
        event: T, 
        context?: PublishContext, 
        metadata?: Partial<EventMetadata>
    ): Promise<PublishResult>;

    /**
     * 批量发布事件
     */
    publishBatch(
        events: EventWithContext[], 
        options?: BatchPublishOptions
    ): Promise<BatchPublishResult>;

    /**
     * 事务性发布（事务提交后发布）
     */
    publishAfterCommit<T extends AllDomainEvents>(
        event: T, 
        context?: PublishContext, 
        metadata?: Partial<EventMetadata>
    ): Promise<void>;

    /**
     * 延迟发布事件
     */
    scheduleEvent<T extends AllDomainEvents>(
        event: T, 
        options: DelayedPublishOptions, 
        context?: PublishContext,
        metadata?: Partial<EventMetadata>
    ): Promise<string>;

    /**
     * 取消延迟事件
     */
    cancelScheduledEvent(scheduleId: string): Promise<boolean>;

    /**
     * 获取发布器状态
     */
    getStatus(): Promise<{
        healthy: boolean;
        pendingTransactionalEvents: number;
        scheduledEvents: number;
        metrics: {
            totalPublished: number;
            totalFailed: number;
            averageExecutionTime: number;
        };
    }>;
}

/**
 * 事件发布器实现
 */
export class EventPublisher implements IEventPublisher {
    private logger: Logger;
    private transactionalEvents = new Map<string, EventWithContext[]>(); // 事务ID -> 待发布事件
    private scheduledEvents = new Map<string, {
        event: EventWithContext;
        options: DelayedPublishOptions;
        timeoutId: NodeJS.Timeout;
        createdAt: Date;
    }>();
    private metrics = {
        totalPublished: 0,
        totalFailed: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0
    };

    constructor(
        private eventBus: EventBus,
        private eventStore?: EventStore,
        private supabase?: SupabaseClient
    ) {
        this.logger = Logger.getInstance();
        this.logger.info('EventPublisher已初始化', {
            eventStoreEnabled: !!this.eventStore,
            supabaseEnabled: !!this.supabase
        });
    }

    /**
     * 发布单个事件
     */
    async publish<T extends AllDomainEvents>(
        event: T,
        context?: PublishContext,
        metadata?: Partial<EventMetadata>
    ): Promise<PublishResult> {
        const startTime = Date.now();
        
        try {
            // 构建完整的元数据
            const fullMetadata: EventMetadata = {
                priority: EventPriority.NORMAL,
                category: EventCategory.BUSINESS,
                retryable: true,
                correlationId: context?.correlationId || this.generateCorrelationId(),
                tags: context?.tags,
                causedBy: context?.causedBy,
                ...metadata
            };

            // 发布事件
            const publishResult = await this.eventBus.publish(
                event,
                fullMetadata,
                {
                    aggregateId: context?.aggregateId,
                    aggregateType: context?.aggregateType,
                    userId: context?.userId,
                    sessionId: context?.sessionId,
                    correlationId: fullMetadata.correlationId
                }
            );

            const executionTime = Date.now() - startTime;
            this.updateMetrics(true, executionTime);

            const result: PublishResult = {
                eventId: publishResult.eventId,
                success: publishResult.success,
                publishedAt: new Date(),
                executionTime,
                error: publishResult.success ? undefined : '事件发布失败'
            };

            this.logger.info('事件发布成功', {
                eventType: event.eventType,
                eventId: result.eventId,
                correlationId: fullMetadata.correlationId,
                executionTime
            });

            // 发送到Supabase Realtime（如果启用）
            if (this.supabase && publishResult.success) {
                await this.sendToRealtime(event, context, fullMetadata);
            }

            return result;

        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.updateMetrics(false, executionTime);

            this.logger.error('事件发布失败', {
                eventType: event.eventType,
                error: error.message,
                context,
                executionTime
            });

            return {
                eventId: '',
                success: false,
                publishedAt: new Date(),
                executionTime,
                error: error.message
            };
        }
    }

    /**
     * 批量发布事件
     */
    async publishBatch(
        events: EventWithContext[],
        options?: BatchPublishOptions
    ): Promise<BatchPublishResult> {
        const startTime = Date.now();
        const results: PublishResult[] = [];
        const opts = {
            maxBatchSize: 50,
            timeoutMs: 30000,
            continueOnError: true,
            enableTransaction: false,
            ...options
        };

        try {
            this.logger.info('开始批量发布事件', {
                eventCount: events.length,
                options: opts
            });

            // 分批处理
            const batches = this.chunkArray(events, opts.maxBatchSize);
            
            for (const batch of batches) {
                if (opts.enableTransaction) {
                    // 事务性批量发布
                    const batchResults = await this.publishBatchTransactional(batch);
                    results.push(...batchResults);
                } else {
                    // 普通批量发布
                    const batchPromises = batch.map(eventWithContext => 
                        this.publish(
                            eventWithContext.event, 
                            eventWithContext.context,
                            eventWithContext.metadata
                        )
                    );

                    if (opts.continueOnError) {
                        const batchResults = await Promise.allSettled(batchPromises);
                        for (const result of batchResults) {
                            if (result.status === 'fulfilled') {
                                results.push(result.value);
                            } else {
                                results.push({
                                    eventId: '',
                                    success: false,
                                    publishedAt: new Date(),
                                    executionTime: 0,
                                    error: result.reason?.message || '未知错误'
                                });
                            }
                        }
                    } else {
                        const batchResults = await Promise.all(batchPromises);
                        results.push(...batchResults);
                    }
                }
            }

            const totalExecutionTime = Date.now() - startTime;
            const successful = results.filter(r => r.success).length;
            const failed = results.length - successful;

            const summary = {
                total: events.length,
                successful,
                failed,
                totalExecutionTime
            };

            this.logger.info('批量发布事件完成', summary);

            return { results, summary };

        } catch (error) {
            this.logger.error('批量发布事件失败', {
                eventCount: events.length,
                error: error.message,
                executionTime: Date.now() - startTime
            });

            throw error;
        }
    }

    /**
     * 事务性发布（事务提交后发布）
     */
    async publishAfterCommit<T extends AllDomainEvents>(
        event: T,
        context?: PublishContext,
        metadata?: Partial<EventMetadata>
    ): Promise<void> {
        // 生成事务ID（在实际实现中应该从当前事务上下文获取）
        const transactionId = context?.sessionId || this.generateTransactionId();

        const eventWithContext: EventWithContext = {
            event,
            context,
            metadata
        };

        // 添加到待发布队列
        if (!this.transactionalEvents.has(transactionId)) {
            this.transactionalEvents.set(transactionId, []);
        }

        this.transactionalEvents.get(transactionId)!.push(eventWithContext);

        this.logger.info('事件已添加到事务发布队列', {
            eventType: event.eventType,
            transactionId,
            queueSize: this.transactionalEvents.get(transactionId)!.length
        });

        // 注册事务提交回调（在实际实现中应该与数据库事务集成）
        // 这里使用setTimeout模拟异步事务提交
        setTimeout(() => {
            this.commitTransactionalEvents(transactionId);
        }, 100);
    }

    /**
     * 延迟发布事件
     */
    async scheduleEvent<T extends AllDomainEvents>(
        event: T,
        options: DelayedPublishOptions,
        context?: PublishContext,
        metadata?: Partial<EventMetadata>
    ): Promise<string> {
        const scheduleId = this.generateScheduleId();
        const eventWithContext: EventWithContext = {
            event,
            context,
            metadata
        };

        // 创建定时器
        const timeoutId = setTimeout(async () => {
            try {
                await this.publish(event, context, metadata);
                this.scheduledEvents.delete(scheduleId);
                
                this.logger.info('延迟事件发布成功', {
                    scheduleId,
                    eventType: event.eventType,
                    delay: options.delayMs
                });
            } catch (error) {
                this.logger.error('延迟事件发布失败', {
                    scheduleId,
                    eventType: event.eventType,
                    error: error.message
                });

                // 重试逻辑
                if (options.maxRetries && options.maxRetries > 0) {
                    setTimeout(() => {
                        this.scheduleEvent(event, {
                            ...options,
                            maxRetries: options.maxRetries! - 1
                        }, context, metadata);
                    }, options.retryDelayMs || 1000);
                }
            }
        }, options.delayMs);

        // 保存到内存
        this.scheduledEvents.set(scheduleId, {
            event: eventWithContext,
            options,
            timeoutId,
            createdAt: new Date()
        });

        // 持久化（如果启用）
        if (options.enablePersistence && this.eventStore) {
            // 这里可以将延迟事件保存到数据库
            // 以便系统重启后能够恢复
        }

        this.logger.info('事件已安排延迟发布', {
            scheduleId,
            eventType: event.eventType,
            delay: options.delayMs,
            enablePersistence: options.enablePersistence
        });

        return scheduleId;
    }

    /**
     * 取消延迟事件
     */
    async cancelScheduledEvent(scheduleId: string): Promise<boolean> {
        const scheduledEvent = this.scheduledEvents.get(scheduleId);
        
        if (!scheduledEvent) {
            this.logger.warn('尝试取消不存在的延迟事件', { scheduleId });
            return false;
        }

        clearTimeout(scheduledEvent.timeoutId);
        this.scheduledEvents.delete(scheduleId);

        this.logger.info('延迟事件已取消', {
            scheduleId,
            eventType: scheduledEvent.event.event.eventType
        });

        return true;
    }

    /**
     * 获取发布器状态
     */
    async getStatus() {
        const pendingTransactionalEvents = Array.from(this.transactionalEvents.values())
            .reduce((total, events) => total + events.length, 0);

        return {
            healthy: true,
            pendingTransactionalEvents,
            scheduledEvents: this.scheduledEvents.size,
            metrics: {
                ...this.metrics,
                averageExecutionTime: this.calculateAverageExecutionTime()
            }
        };
    }

    // 私有方法

    /**
     * 提交事务性事件
     */
    private async commitTransactionalEvents(transactionId: string): Promise<void> {
        const events = this.transactionalEvents.get(transactionId);
        
        if (!events || events.length === 0) {
            return;
        }

        try {
            this.logger.info('开始提交事务性事件', {
                transactionId,
                eventCount: events.length
            });

            // 批量发布事务中的所有事件
            await this.publishBatch(events, {
                continueOnError: true,
                enableTransaction: false
            });

            // 清理
            this.transactionalEvents.delete(transactionId);

            this.logger.info('事务性事件提交完成', {
                transactionId,
                eventCount: events.length
            });

        } catch (error) {
            this.logger.error('事务性事件提交失败', {
                transactionId,
                error: error.message
            });
            
            // 可以考虑重试或放入死信队列
        }
    }

    /**
     * 事务性批量发布
     */
    private async publishBatchTransactional(events: EventWithContext[]): Promise<PublishResult[]> {
        // 在实际实现中，这里应该在单个事务中发布所有事件
        // 目前使用普通批量发布作为占位符
        const promises = events.map(eventWithContext => 
            this.publish(
                eventWithContext.event, 
                eventWithContext.context,
                eventWithContext.metadata
            )
        );

        return Promise.all(promises);
    }

    /**
     * 发送到Supabase Realtime
     */
    private async sendToRealtime(
        event: AllDomainEvents,
        context?: PublishContext,
        metadata?: EventMetadata
    ): Promise<void> {
        if (!this.supabase) return;

        try {
            const channel = this.supabase.channel('domain-events');
            
            await channel.send({
                type: 'broadcast',
                event: event.eventType,
                payload: {
                    eventData: event,
                    context,
                    metadata,
                    publishedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            this.logger.warn('发送到Realtime失败', {
                eventType: event.eventType,
                error: error.message
            });
        }
    }

    /**
     * 更新指标
     */
    private updateMetrics(success: boolean, executionTime: number): void {
        if (success) {
            this.metrics.totalPublished++;
        } else {
            this.metrics.totalFailed++;
        }

        this.metrics.totalExecutionTime += executionTime;
    }

    /**
     * 计算平均执行时间
     */
    private calculateAverageExecutionTime(): number {
        const totalEvents = this.metrics.totalPublished + this.metrics.totalFailed;
        return totalEvents > 0 ? this.metrics.totalExecutionTime / totalEvents : 0;
    }

    /**
     * 数组分块
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * 生成关联ID
     */
    private generateCorrelationId(): string {
        return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 生成事务ID
     */
    private generateTransactionId(): string {
        return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 生成调度ID
     */
    private generateScheduleId(): string {
        return `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}