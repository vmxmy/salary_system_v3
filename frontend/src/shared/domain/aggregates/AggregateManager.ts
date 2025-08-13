/**
 * 聚合管理器
 * 
 * 负责管理聚合的生命周期、事务边界和跨聚合操作
 */

import { AggregateRoot, AggregateSnapshot } from './AggregateRoot';
import { DomainEvent } from '../events/DomainEvent';
import { DomainError } from '../errors/DomainError';

/**
 * 聚合仓储接口
 */
export interface IAggregateRepository<T extends AggregateRoot> {
  /** 根据ID获取聚合 */
  getById(id: string): Promise<T | undefined>;
  /** 保存聚合 */
  save(aggregate: T): Promise<void>;
  /** 删除聚合 */
  delete(id: string): Promise<void>;
  /** 根据条件查询聚合 */
  findBy(criteria: any): Promise<T[]>;
}

/**
 * 事件存储接口
 */
export interface IEventStore {
  /** 保存事件 */
  saveEvents(aggregateId: string, events: DomainEvent[], expectedVersion: number): Promise<void>;
  /** 获取事件流 */
  getEvents(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]>;
  /** 获取所有聚合的事件流 */
  getAllEvents(fromTimestamp?: Date): Promise<DomainEvent[]>;
}

/**
 * 快照存储接口
 */
export interface ISnapshotStore {
  /** 保存快照 */
  saveSnapshot(snapshot: AggregateSnapshot): Promise<void>;
  /** 获取快照 */
  getSnapshot(aggregateId: string): Promise<AggregateSnapshot | undefined>;
  /** 删除快照 */
  deleteSnapshot(aggregateId: string): Promise<void>;
}

/**
 * 工作单元接口
 */
export interface IUnitOfWork {
  /** 注册新聚合 */
  registerNew<T extends AggregateRoot>(aggregate: T, repository: IAggregateRepository<T>): void;
  /** 注册修改的聚合 */
  registerDirty<T extends AggregateRoot>(aggregate: T, repository: IAggregateRepository<T>): void;
  /** 注册删除的聚合 */
  registerRemoved<T extends AggregateRoot>(aggregate: T, repository: IAggregateRepository<T>): void;
  /** 提交所有变更 */
  commit(): Promise<void>;
  /** 回滚变更 */
  rollback(): void;
}

/**
 * 聚合操作类型
 */
enum AggregateOperation {
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete'
}

/**
 * 聚合注册项
 */
interface AggregateRegistration<T extends AggregateRoot> {
  aggregate: T;
  repository: IAggregateRepository<T>;
  operation: AggregateOperation;
  originalVersion: number;
}

/**
 * 工作单元实现
 */
export class UnitOfWork implements IUnitOfWork {
  private _registrations = new Map<string, AggregateRegistration<any>>();
  private _committed = false;

  constructor(
    private eventStore: IEventStore,
    private snapshotStore?: ISnapshotStore,
    private eventPublisher?: (events: DomainEvent[]) => Promise<void>
  ) {}

  /**
   * 注册新聚合
   */
  registerNew<T extends AggregateRoot>(
    aggregate: T,
    repository: IAggregateRepository<T>
  ): void {
    this.ensureNotCommitted();
    
    if (this._registrations.has(aggregate.aggregateId)) {
      throw new DomainError(`聚合 ${aggregate.aggregateId} 已经注册`);
    }

    this._registrations.set(aggregate.aggregateId, {
      aggregate,
      repository,
      operation: AggregateOperation.INSERT,
      originalVersion: aggregate.version
    });
  }

  /**
   * 注册修改的聚合
   */
  registerDirty<T extends AggregateRoot>(
    aggregate: T,
    repository: IAggregateRepository<T>
  ): void {
    this.ensureNotCommitted();

    const existing = this._registrations.get(aggregate.aggregateId);
    if (existing) {
      // 如果已经注册为新增，保持新增状态
      if (existing.operation === AggregateOperation.INSERT) {
        return;
      }
      // 更新注册信息
      existing.aggregate = aggregate;
      existing.operation = AggregateOperation.UPDATE;
    } else {
      this._registrations.set(aggregate.aggregateId, {
        aggregate,
        repository,
        operation: AggregateOperation.UPDATE,
        originalVersion: aggregate.version
      });
    }
  }

  /**
   * 注册删除的聚合
   */
  registerRemoved<T extends AggregateRoot>(
    aggregate: T,
    repository: IAggregateRepository<T>
  ): void {
    this.ensureNotCommitted();

    this._registrations.set(aggregate.aggregateId, {
      aggregate,
      repository,
      operation: AggregateOperation.DELETE,
      originalVersion: aggregate.version
    });
  }

  /**
   * 提交所有变更
   */
  async commit(): Promise<void> {
    this.ensureNotCommitted();

    const allEvents: DomainEvent[] = [];

    try {
      // 验证所有聚合的不变式
      for (const registration of this._registrations.values()) {
        registration.aggregate.validateInvariant();
      }

      // 保存聚合和事件
      for (const registration of this._registrations.values()) {
        const { aggregate, repository, operation, originalVersion } = registration;

        switch (operation) {
          case AggregateOperation.INSERT:
          case AggregateOperation.UPDATE:
            // 保存聚合
            await repository.save(aggregate);
            
            // 收集事件
            const events = aggregate.getUncommittedEvents();
            if (events.length > 0) {
              await this.eventStore.saveEvents(
                aggregate.aggregateId,
                events,
                originalVersion
              );
              allEvents.push(...events);
            }

            // 保存快照（可选）
            if (this.snapshotStore && this.shouldCreateSnapshot(aggregate)) {
              const snapshot = aggregate.createSnapshot();
              await this.snapshotStore.saveSnapshot(snapshot);
            }

            // 标记事件为已提交
            aggregate.markEventsAsCommitted();
            break;

          case AggregateOperation.DELETE:
            await repository.delete(aggregate.aggregateId);
            // 删除快照
            if (this.snapshotStore) {
              await this.snapshotStore.deleteSnapshot(aggregate.aggregateId);
            }
            break;
        }
      }

      // 发布事件
      if (this.eventPublisher && allEvents.length > 0) {
        await this.eventPublisher(allEvents);
      }

      this._committed = true;

    } catch (error) {
      // 回滚操作
      this.rollback();
      throw error;
    }
  }

  /**
   * 回滚变更
   */
  rollback(): void {
    // 清除未提交的事件
    for (const registration of this._registrations.values()) {
      registration.aggregate.markEventsAsCommitted();
    }
    
    this._registrations.clear();
  }

  /**
   * 获取注册的聚合数量
   */
  get registrationCount(): number {
    return this._registrations.size;
  }

  /**
   * 检查是否有未提交的变更
   */
  hasUncommittedChanges(): boolean {
    return this._registrations.size > 0 && !this._committed;
  }

  // ==================== 私有方法 ====================

  private ensureNotCommitted(): void {
    if (this._committed) {
      throw new DomainError('工作单元已经提交，不能进行更多操作');
    }
  }

  private shouldCreateSnapshot(aggregate: AggregateRoot): boolean {
    // 每10个版本创建一个快照
    return aggregate.version % 10 === 0;
  }
}

/**
 * 聚合管理器
 */
export class AggregateManager {
  private _repositories = new Map<string, IAggregateRepository<any>>();

  constructor(
    private eventStore: IEventStore,
    private snapshotStore?: ISnapshotStore,
    private eventPublisher?: (events: DomainEvent[]) => Promise<void>
  ) {}

  /**
   * 注册聚合仓储
   */
  registerRepository<T extends AggregateRoot>(
    aggregateType: string,
    repository: IAggregateRepository<T>
  ): void {
    this._repositories.set(aggregateType, repository);
  }

  /**
   * 获取聚合仓储
   */
  getRepository<T extends AggregateRoot>(aggregateType: string): IAggregateRepository<T> {
    const repository = this._repositories.get(aggregateType);
    if (!repository) {
      throw new DomainError(`未找到聚合类型 ${aggregateType} 的仓储`);
    }
    return repository;
  }

  /**
   * 创建工作单元
   */
  createUnitOfWork(): IUnitOfWork {
    return new UnitOfWork(this.eventStore, this.snapshotStore, this.eventPublisher);
  }

  /**
   * 执行事务操作
   */
  async executeInTransaction<T>(operation: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
    const unitOfWork = this.createUnitOfWork();
    
    try {
      const result = await operation(unitOfWork);
      await unitOfWork.commit();
      return result;
    } catch (error) {
      unitOfWork.rollback();
      throw error;
    }
  }

  /**
   * 加载聚合（优先从快照加载）
   */
  async loadAggregate<T extends AggregateRoot>(
    aggregateType: string,
    aggregateId: string
  ): Promise<T | undefined> {
    const repository = this.getRepository<T>(aggregateType);
    
    // 首先尝试从仓储加载
    let aggregate = await repository.getById(aggregateId);
    
    if (!aggregate && this.snapshotStore) {
      // 如果仓储中没有，尝试从事件源重建
      const snapshot = await this.snapshotStore.getSnapshot(aggregateId);
      const events = await this.eventStore.getEvents(
        aggregateId,
        snapshot ? snapshot.version + 1 : 0
      );

      if (snapshot || events.length > 0) {
        // 使用工厂重建聚合
        const factory = this.getAggregateFactory<T>(aggregateType);
        
        if (snapshot) {
          aggregate = factory.fromSnapshot(snapshot);
          if (events.length > 0) {
            aggregate.loadFromHistory(events);
          }
        } else {
          aggregate = factory.fromHistory(aggregateId, events);
        }
      }
    }

    return aggregate;
  }

  /**
   * 重放事件到投影
   */
  async replayEvents(
    fromTimestamp?: Date,
    projection?: (event: DomainEvent) => Promise<void>
  ): Promise<void> {
    const events = await this.eventStore.getAllEvents(fromTimestamp);
    
    for (const event of events) {
      if (projection) {
        await projection(event);
      }
    }
  }

  // ==================== 私有方法 ====================

  private getAggregateFactory<T extends AggregateRoot>(aggregateType: string): any {
    // 这里需要实现获取聚合工厂的逻辑
    // 可以通过注册表或依赖注入容器获取
    throw new DomainError(`聚合工厂 ${aggregateType} 尚未实现`);
  }
}

/**
 * 聚合管理器装饰器
 */
export function Transactional() {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const aggregateManager: AggregateManager = this.aggregateManager;
      
      if (!aggregateManager) {
        throw new DomainError('类中未找到 aggregateManager 属性');
      }

      return await aggregateManager.executeInTransaction(async (uow) => {
        // 将工作单元注入到当前上下文
        (this as any).currentUnitOfWork = uow;
        
        try {
          return await method.apply(this, args);
        } finally {
          // 清理工作单元引用
          delete (this as any).currentUnitOfWork;
        }
      });
    };

    return descriptor;
  };
}