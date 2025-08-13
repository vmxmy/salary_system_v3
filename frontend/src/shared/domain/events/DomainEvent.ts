/**
 * 领域事件基类
 * 
 * 定义了领域事件的基础结构，支持事件溯源和事件驱动架构
 */

/**
 * 事件元数据
 */
export interface EventMetadata {
  /** 事件ID */
  eventId: string;
  /** 聚合根ID */
  aggregateId: string;
  /** 聚合根类型 */
  aggregateType: string;
  /** 事件序列号 */
  eventSequence: number;
  /** 事件版本 */
  eventVersion: string;
  /** 事件发生时间 */
  occurredAt: Date;
  /** 因果关系ID */
  causationId?: string;
  /** 相关性ID */
  correlationId?: string;
  /** 用户ID */
  userId?: string;
}

/**
 * 领域事件基类
 */
export abstract class DomainEvent {
  public readonly metadata: EventMetadata;
  
  constructor(
    public readonly eventType: string,
    public readonly payload: Record<string, any>,
    aggregateId?: string,
    aggregateType?: string,
    metadata?: Partial<EventMetadata>
  ) {
    this.metadata = {
      eventId: metadata?.eventId || this.generateEventId(),
      aggregateId: aggregateId || metadata?.aggregateId || '',
      aggregateType: aggregateType || metadata?.aggregateType || this.constructor.name,
      eventSequence: metadata?.eventSequence || 1,
      eventVersion: metadata?.eventVersion || '1.0.0',
      occurredAt: metadata?.occurredAt || new Date(),
      causationId: metadata?.causationId,
      correlationId: metadata?.correlationId || this.generateCorrelationId(),
      userId: metadata?.userId
    };
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成相关性ID
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取事件的完整名称
   */
  get fullEventName(): string {
    return `${this.metadata.aggregateType}.${this.eventType}`;
  }

  /**
   * 检查事件是否来自特定聚合
   */
  isFromAggregate(aggregateId: string): boolean {
    return this.metadata.aggregateId === aggregateId;
  }

  /**
   * 检查事件是否属于特定类型
   */
  isOfType(eventType: string): boolean {
    return this.eventType === eventType;
  }

  /**
   * 创建因果事件
   */
  createCausedEvent(
    eventType: string,
    payload: Record<string, any>,
    aggregateId?: string,
    aggregateType?: string
  ): DomainEvent {
    return new DomainEvent(
      eventType,
      payload,
      aggregateId || this.metadata.aggregateId,
      aggregateType || this.metadata.aggregateType,
      {
        causationId: this.metadata.eventId,
        correlationId: this.metadata.correlationId,
        userId: this.metadata.userId
      }
    );
  }

  /**
   * 转换为JSON对象
   */
  toJSON(): Record<string, any> {
    return {
      eventType: this.eventType,
      payload: this.payload,
      metadata: this.metadata
    };
  }

  /**
   * 从JSON对象创建事件
   */
  static fromJSON(data: Record<string, any>): DomainEvent {
    return new DomainEvent(
      data.eventType,
      data.payload,
      data.metadata?.aggregateId,
      data.metadata?.aggregateType,
      data.metadata
    );
  }
}

/**
 * 事件处理器接口
 */
export interface IEventHandler<T extends DomainEvent = DomainEvent> {
  /**
   * 处理事件
   */
  handle(event: T): Promise<void> | void;

  /**
   * 获取处理器名称
   */
  getHandlerName(): string;

  /**
   * 检查是否可以处理指定事件
   */
  canHandle(event: DomainEvent): boolean;
}

/**
 * 事件总线接口
 */
export interface IEventBus {
  /**
   * 发布单个事件
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * 批量发布事件
   */
  publishBatch(events: DomainEvent[]): Promise<void>;

  /**
   * 订阅事件
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): void;

  /**
   * 取消订阅
   */
  unsubscribe(eventType: string, handler: IEventHandler): void;

  /**
   * 获取事件统计信息
   */
  getStats(): EventBusStats;

  /**
   * 清理资源
   */
  dispose(): Promise<void>;
}

/**
 * 事件总线统计信息
 */
export interface EventBusStats {
  totalEventsPublished: number;
  totalEventsProcessed: number;
  totalEventsFailed: number;
  subscriberCount: number;
  averageProcessingTime: number;
  lastEventTime: Date | null;
}

/**
 * 事件存储接口
 */
export interface IEventStore {
  /**
   * 保存事件
   */
  save(event: DomainEvent): Promise<void>;

  /**
   * 批量保存事件
   */
  saveBatch(events: DomainEvent[]): Promise<void>;

  /**
   * 获取聚合的事件流
   */
  getEventStream(
    aggregateId: string,
    fromSequence?: number
  ): Promise<DomainEvent[]>;

  /**
   * 获取事件类型的所有事件
   */
  getEventsByType(
    eventType: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<DomainEvent[]>;

  /**
   * 获取事件快照
   */
  getSnapshot(aggregateId: string): Promise<EventSnapshot | null>;

  /**
   * 保存事件快照
   */
  saveSnapshot(snapshot: EventSnapshot): Promise<void>;
}

/**
 * 事件快照
 */
export interface EventSnapshot {
  aggregateId: string;
  aggregateType: string;
  data: Record<string, any>;
  sequence: number;
  timestamp: Date;
}

/**
 * 事件订阅选项
 */
export interface EventSubscriptionOptions {
  /** 是否异步处理 */
  async?: boolean;
  /** 重试次数 */
  retryCount?: number;
  /** 处理器优先级 */
  priority?: number;
  /** 错误处理策略 */
  errorHandling?: 'ignore' | 'retry' | 'deadletter';
}