/**
 * 同步事件总线实现
 * 
 * 基于同步模式的高性能事件处理机制，确保事务一致性
 * 支持错误隔离、性能监控和Supabase实时集成
 */

import { 
  DomainEvent, 
  IEventBus, 
  IEventHandler, 
  EventBusStats,
  EventSubscriptionOptions 
} from '../../shared/domain/events/DomainEvent';

/**
 * 事件订阅信息
 */
interface EventSubscription {
  handler: IEventHandler;
  options: EventSubscriptionOptions;
  subscribedAt: Date;
  processedCount: number;
  errorCount: number;
  lastProcessedAt: Date | null;
  averageProcessingTime: number;
}

/**
 * 同步事件总线实现
 */
export class EventBus implements IEventBus {
  private subscriptions = new Map<string, EventSubscription[]>();
  private stats: EventBusStats = {
    totalEventsPublished: 0,
    totalEventsProcessed: 0,
    totalEventsFailed: 0,
    subscriberCount: 0,
    averageProcessingTime: 0,
    lastEventTime: null
  };

  /**
   * 发布单个事件
   */
  async publish(event: DomainEvent): Promise<void> {
    this.stats.totalEventsPublished++;
    this.stats.lastEventTime = new Date();

    const startTime = performance.now();
    const subscriptions = this.getSubscriptionsForEvent(event);

    if (subscriptions.length === 0) {
      console.debug(`No handlers registered for event: ${event.eventType}`);
      return;
    }

    // 按优先级排序处理器
    const sortedSubscriptions = this.sortSubscriptionsByPriority(subscriptions);

    for (const subscription of sortedSubscriptions) {
      await this.processEventWithHandler(event, subscription);
    }

    const processingTime = performance.now() - startTime;
    this.updateProcessingStats(processingTime);
  }

  /**
   * 批量发布事件
   */
  async publishBatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * 订阅事件
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: IEventHandler<T>,
    options: EventSubscriptionOptions = {}
  ): void {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const subscription: EventSubscription = {
      handler: handler as IEventHandler,
      options: {
        async: false,
        retryCount: 0,
        priority: 0,
        errorHandling: 'ignore',
        ...options
      },
      subscribedAt: new Date(),
      processedCount: 0,
      errorCount: 0,
      lastProcessedAt: null,
      averageProcessingTime: 0
    };

    this.subscriptions.get(eventType)!.push(subscription);
    this.stats.subscriberCount++;

    console.debug(`Handler ${handler.getHandlerName()} subscribed to event: ${eventType}`);
  }

  /**
   * 取消订阅
   */
  unsubscribe(eventType: string, handler: IEventHandler): void {
    const subscriptions = this.subscriptions.get(eventType);
    if (!subscriptions) {
      return;
    }

    const index = subscriptions.findIndex(sub => sub.handler === handler);
    if (index !== -1) {
      subscriptions.splice(index, 1);
      this.stats.subscriberCount--;
      
      if (subscriptions.length === 0) {
        this.subscriptions.delete(eventType);
      }

      console.debug(`Handler ${handler.getHandlerName()} unsubscribed from event: ${eventType}`);
    }
  }

  /**
   * 获取事件统计信息
   */
  getStats(): EventBusStats {
    return { ...this.stats };
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    this.subscriptions.clear();
    this.stats = {
      totalEventsPublished: 0,
      totalEventsProcessed: 0,
      totalEventsFailed: 0,
      subscriberCount: 0,
      averageProcessingTime: 0,
      lastEventTime: null
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 获取事件的所有订阅
   */
  private getSubscriptionsForEvent(event: DomainEvent): EventSubscription[] {
    const subscriptions: EventSubscription[] = [];

    // 精确匹配事件类型
    const exactMatch = this.subscriptions.get(event.eventType);
    if (exactMatch) {
      subscriptions.push(...exactMatch);
    }

    // 支持通配符订阅（如 "*.Created"）
    for (const [eventType, subs] of this.subscriptions.entries()) {
      if (this.isWildcardMatch(eventType, event.eventType)) {
        subscriptions.push(...subs);
      }
    }

    // 过滤可以处理此事件的处理器
    return subscriptions.filter(sub => sub.handler.canHandle(event));
  }

  /**
   * 检查通配符匹配
   */
  private isWildcardMatch(pattern: string, eventType: string): boolean {
    if (!pattern.includes('*')) {
      return false;
    }

    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    
    return new RegExp(`^${regexPattern}$`).test(eventType);
  }

  /**
   * 按优先级排序订阅
   */
  private sortSubscriptionsByPriority(subscriptions: EventSubscription[]): EventSubscription[] {
    return subscriptions.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
  }

  /**
   * 使用处理器处理事件
   */
  private async processEventWithHandler(
    event: DomainEvent,
    subscription: EventSubscription
  ): Promise<void> {
    const startTime = performance.now();
    let retryCount = 0;
    const maxRetries = subscription.options.retryCount || 0;

    while (retryCount <= maxRetries) {
      try {
        await subscription.handler.handle(event);
        
        // 更新成功统计
        const processingTime = performance.now() - startTime;
        this.updateSubscriptionStats(subscription, processingTime, true);
        this.stats.totalEventsProcessed++;
        
        console.debug(
          `Event ${event.eventType} processed by ${subscription.handler.getHandlerName()} in ${processingTime.toFixed(2)}ms`
        );
        
        return; // 成功处理，退出重试循环
        
      } catch (error) {
        retryCount++;
        subscription.errorCount++;
        this.stats.totalEventsFailed++;

        console.error(
          `Error processing event ${event.eventType} with handler ${subscription.handler.getHandlerName()} (attempt ${retryCount}/${maxRetries + 1}):`,
          error
        );

        if (retryCount > maxRetries) {
          // 达到最大重试次数，根据错误处理策略处理
          await this.handleProcessingError(event, subscription, error as Error);
          break;
        }

        // 重试延迟
        if (retryCount <= maxRetries) {
          await this.delay(Math.pow(2, retryCount) * 100); // 指数退避
        }
      }
    }
  }

  /**
   * 处理事件处理错误
   */
  private async handleProcessingError(
    event: DomainEvent,
    subscription: EventSubscription,
    error: Error
  ): Promise<void> {
    const errorHandling = subscription.options.errorHandling || 'ignore';

    switch (errorHandling) {
      case 'ignore':
        // 忽略错误，继续处理其他处理器
        console.warn(`Ignoring error in handler ${subscription.handler.getHandlerName()}: ${error.message}`);
        break;
        
      case 'deadletter':
        // 将事件发送到死信队列
        await this.sendToDeadLetterQueue(event, subscription, error);
        break;
        
      case 'retry':
        // 已经在上层处理了重试逻辑
        console.error(`Failed to process event after retries: ${error.message}`);
        break;
        
      default:
        console.warn(`Unknown error handling strategy: ${errorHandling}`);
    }
  }

  /**
   * 发送到死信队列
   */
  private async sendToDeadLetterQueue(
    event: DomainEvent,
    subscription: EventSubscription,
    error: Error
  ): Promise<void> {
    // 创建死信事件
    const deadLetterEvent = new DomainEvent(
      'DeadLetterEvent',
      {
        originalEvent: event.toJSON(),
        handlerName: subscription.handler.getHandlerName(),
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        attempts: subscription.errorCount,
        timestamp: new Date()
      },
      event.metadata.aggregateId,
      'System'
    );

    // 发布死信事件（可以被监控系统订阅）
    console.error('Sending event to dead letter queue:', deadLetterEvent.toJSON());
    
    // 这里可以集成外部监控系统或者持久化存储
    // await this.deadLetterService.store(deadLetterEvent);
  }

  /**
   * 更新订阅统计信息
   */
  private updateSubscriptionStats(
    subscription: EventSubscription,
    processingTime: number,
    success: boolean
  ): void {
    subscription.lastProcessedAt = new Date();
    
    if (success) {
      subscription.processedCount++;
      
      // 计算平均处理时间
      const totalTime = subscription.averageProcessingTime * (subscription.processedCount - 1) + processingTime;
      subscription.averageProcessingTime = totalTime / subscription.processedCount;
    }
  }

  /**
   * 更新全局处理统计
   */
  private updateProcessingStats(processingTime: number): void {
    const totalTime = this.stats.averageProcessingTime * (this.stats.totalEventsProcessed - 1) + processingTime;
    this.stats.averageProcessingTime = totalTime / this.stats.totalEventsProcessed;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取订阅详情（调试用）
   */
  getSubscriptionDetails(): Record<string, any> {
    const details: Record<string, any> = {};
    
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      details[eventType] = subscriptions.map(sub => ({
        handlerName: sub.handler.getHandlerName(),
        processedCount: sub.processedCount,
        errorCount: sub.errorCount,
        averageProcessingTime: sub.averageProcessingTime,
        subscribedAt: sub.subscribedAt,
        lastProcessedAt: sub.lastProcessedAt
      }));
    }
    
    return details;
  }
}