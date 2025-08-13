/**
 * 聚合根基类
 * 
 * 实现聚合根模式，管理聚合内实体的一致性边界和业务规则
 */

import { BaseEntity } from '../entities/BaseEntity';
import { DomainEvent } from '../events/DomainEvent';
import { DomainError } from '../errors/DomainError';

/**
 * 聚合根接口
 */
export interface IAggregateRoot {
  /** 聚合根ID */
  readonly aggregateId: string;
  /** 聚合版本 */
  readonly version: number;
  /** 获取未提交的领域事件 */
  getUncommittedEvents(): DomainEvent[];
  /** 标记事件为已提交 */
  markEventsAsCommitted(): void;
  /** 检查聚合是否有未提交的变更 */
  hasUncommittedChanges(): boolean;
  /** 应用历史事件（事件溯源） */
  loadFromHistory(events: DomainEvent[]): void;
  /** 验证聚合一致性 */
  validateInvariant(): void;
}

/**
 * 聚合根基类
 */
export abstract class AggregateRoot extends BaseEntity implements IAggregateRoot {
  private _version: number = 0;
  private _uncommittedEvents: DomainEvent[] = [];
  private _isLoading: boolean = false;

  constructor(id?: string) {
    super(id);
  }

  // ==================== 聚合根属性 ====================

  get aggregateId(): string {
    return this.id!;
  }

  get version(): number {
    return this._version;
  }

  protected get isLoading(): boolean {
    return this._isLoading;
  }

  // ==================== 事件管理 ====================

  /**
   * 发布领域事件
   */
  protected publishEvent(eventType: string, eventData: any): void {
    const event = new DomainEvent(
      eventType,
      eventData,
      this.aggregateId,
      this.constructor.name,
      this._version + 1
    );

    this._uncommittedEvents.push(event);
    this._version++;
    
    // 调用父类方法进行事件处理
    super.publishEvent(eventType, eventData);
  }

  /**
   * 获取未提交的领域事件
   */
  getUncommittedEvents(): DomainEvent[] {
    return [...this._uncommittedEvents];
  }

  /**
   * 标记事件为已提交
   */
  markEventsAsCommitted(): void {
    this._uncommittedEvents = [];
  }

  /**
   * 检查聚合是否有未提交的变更
   */
  hasUncommittedChanges(): boolean {
    return this._uncommittedEvents.length > 0;
  }

  /**
   * 应用历史事件（事件溯源）
   */
  loadFromHistory(events: DomainEvent[]): void {
    this._isLoading = true;
    
    try {
      events
        .sort((a, b) => a.version - b.version)
        .forEach(event => {
          this.applyEvent(event);
          this._version = Math.max(this._version, event.version);
        });
    } finally {
      this._isLoading = false;
      this._uncommittedEvents = [];
    }
  }

  /**
   * 应用单个历史事件
   */
  protected abstract applyEvent(event: DomainEvent): void;

  // ==================== 聚合一致性 ====================

  /**
   * 验证聚合不变式
   */
  abstract validateInvariant(): void;

  /**
   * 执行业务操作时的一致性检查
   */
  protected executeWithInvariantCheck<T>(operation: () => T): T {
    const result = operation();
    
    if (!this._isLoading) {
      this.validateInvariant();
    }
    
    return result;
  }

  // ==================== 快照支持 ====================

  /**
   * 创建聚合快照
   */
  createSnapshot(): AggregateSnapshot {
    return {
      aggregateId: this.aggregateId,
      aggregateType: this.constructor.name,
      version: this._version,
      data: this.toSnapshot(),
      createdAt: new Date()
    };
  }

  /**
   * 从快照恢复聚合
   */
  loadFromSnapshot(snapshot: AggregateSnapshot): void {
    this._isLoading = true;
    
    try {
      this._version = snapshot.version;
      this.fromSnapshot(snapshot.data);
    } finally {
      this._isLoading = false;
    }
  }

  /**
   * 序列化聚合状态到快照
   */
  protected abstract toSnapshot(): any;

  /**
   * 从快照数据恢复聚合状态
   */
  protected abstract fromSnapshot(data: any): void;

  // ==================== 并发控制 ====================

  /**
   * 检查版本冲突
   */
  checkConcurrency(expectedVersion: number): void {
    if (this._version !== expectedVersion) {
      throw new DomainError(
        `聚合版本冲突: 期望版本 ${expectedVersion}, 当前版本 ${this._version}`,
        'CONCURRENCY_CONFLICT'
      );
    }
  }

  /**
   * 乐观锁更新
   */
  protected updateWithOptimisticLock<T>(expectedVersion: number, operation: () => T): T {
    this.checkConcurrency(expectedVersion);
    return this.executeWithInvariantCheck(operation);
  }
}

/**
 * 聚合快照接口
 */
export interface AggregateSnapshot {
  /** 聚合ID */
  aggregateId: string;
  /** 聚合类型 */
  aggregateType: string;
  /** 版本号 */
  version: number;
  /** 序列化数据 */
  data: any;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 聚合根工厂接口
 */
export interface IAggregateFactory<T extends AggregateRoot> {
  /** 创建新聚合 */
  create(...args: any[]): T;
  /** 从快照重建聚合 */
  fromSnapshot(snapshot: AggregateSnapshot): T;
  /** 从事件历史重建聚合 */
  fromHistory(aggregateId: string, events: DomainEvent[]): T;
}

/**
 * 聚合根注册表
 */
export class AggregateRegistry {
  private static _factories = new Map<string, IAggregateFactory<any>>();

  /**
   * 注册聚合工厂
   */
  static register<T extends AggregateRoot>(
    aggregateType: string,
    factory: IAggregateFactory<T>
  ): void {
    this._factories.set(aggregateType, factory);
  }

  /**
   * 获取聚合工厂
   */
  static getFactory<T extends AggregateRoot>(aggregateType: string): IAggregateFactory<T> {
    const factory = this._factories.get(aggregateType);
    if (!factory) {
      throw new DomainError(`未找到聚合类型 ${aggregateType} 的工厂`);
    }
    return factory;
  }

  /**
   * 从快照重建聚合
   */
  static fromSnapshot<T extends AggregateRoot>(snapshot: AggregateSnapshot): T {
    const factory = this.getFactory<T>(snapshot.aggregateType);
    return factory.fromSnapshot(snapshot);
  }

  /**
   * 从事件历史重建聚合
   */
  static fromHistory<T extends AggregateRoot>(
    aggregateType: string,
    aggregateId: string,
    events: DomainEvent[]
  ): T {
    const factory = this.getFactory<T>(aggregateType);
    return factory.fromHistory(aggregateId, events);
  }
}

/**
 * 聚合根装饰器
 */
export function AggregateRootType(typeName: string) {
  return function <T extends new (...args: any[]) => AggregateRoot>(constructor: T) {
    // 可以在这里添加元数据或注册逻辑
    Object.defineProperty(constructor, 'aggregateTypeName', {
      value: typeName,
      writable: false,
      enumerable: false
    });
    
    return constructor;
  };
}