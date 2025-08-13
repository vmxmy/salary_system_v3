/**
 * Domain实体基类
 * 
 * 提供所有Domain实体的基础功能：
 * - 唯一标识符
 * - 审计字段（创建时间、更新时间）
 * - 软删除机制
 * - 乐观锁版本控制
 * - 领域事件支持
 * - 业务规则验证
 */

import { ValidationResult } from '../value-objects/ValidationResult';
import { DomainEvent } from '../events/DomainEvent';
import { BusinessRuleError } from '../errors/DomainError';

/**
 * 实体状态枚举
 */
export enum EntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted'
}

/**
 * 实体基类
 */
export abstract class BaseEntity {
  protected _id: string;
  protected _createdAt: Date;
  protected _updatedAt: Date;
  protected _deletedAt: Date | null = null;
  protected _version: number = 1;
  protected _status: EntityStatus = EntityStatus.ACTIVE;
  
  // 领域事件集合
  private _domainEvents: DomainEvent[] = [];

  constructor(id?: string) {
    this._id = id || this.generateId();
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  // ==================== 访问器 ====================

  /**
   * 获取实体ID
   */
  get id(): string {
    return this._id;
  }

  /**
   * 获取创建时间
   */
  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * 获取更新时间
   */
  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * 获取删除时间
   */
  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  /**
   * 获取版本号
   */
  get version(): number {
    return this._version;
  }

  /**
   * 获取状态
   */
  get status(): EntityStatus {
    return this._status;
  }

  /**
   * 检查是否已删除
   */
  get isDeleted(): boolean {
    return this._deletedAt !== null || this._status === EntityStatus.DELETED;
  }

  /**
   * 检查是否激活
   */
  get isActive(): boolean {
    return this._status === EntityStatus.ACTIVE && !this.isDeleted;
  }

  // ==================== 状态管理 ====================

  /**
   * 标记实体为更新状态
   * 自动更新时间戳和版本号
   */
  protected markAsUpdated(): void {
    this._updatedAt = new Date();
    this._version += 1;
  }

  /**
   * 软删除实体
   */
  delete(): void {
    if (this.isDeleted) {
      throw new BusinessRuleError('实体已被删除', 'ENTITY_ALREADY_DELETED', {
        entityId: this._id,
        entityType: this.constructor.name
      });
    }

    this._deletedAt = new Date();
    this._status = EntityStatus.DELETED;
    this.markAsUpdated();
    
    this.addDomainEvent(this.createEntityDeletedEvent());
  }

  /**
   * 恢复已删除的实体
   */
  restore(): void {
    if (!this.isDeleted) {
      throw new BusinessRuleError('实体未被删除，无需恢复', 'ENTITY_NOT_DELETED', {
        entityId: this._id,
        entityType: this.constructor.name
      });
    }

    this._deletedAt = null;
    this._status = EntityStatus.ACTIVE;
    this.markAsUpdated();
    
    this.addDomainEvent(this.createEntityRestoredEvent());
  }

  /**
   * 设置实体状态
   */
  setStatus(status: EntityStatus): void {
    if (this._status === status) {
      return;
    }

    const oldStatus = this._status;
    this._status = status;
    this.markAsUpdated();
    
    this.addDomainEvent(this.createEntityStatusChangedEvent(oldStatus, status));
  }

  // ==================== 业务规则验证 ====================

  /**
   * 验证实体的业务规则
   * 子类必须实现具体的验证逻辑
   */
  abstract validate(): ValidationResult;

  /**
   * 验证并抛出异常（如果验证失败）
   */
  validateAndThrow(): void {
    const result = this.validate();
    if (!result.isValid) {
      throw new BusinessRuleError(
        result.firstError || '实体验证失败',
        'ENTITY_VALIDATION_FAILED',
        {
          entityId: this._id,
          entityType: this.constructor.name,
          errors: result.errors
        }
      );
    }
  }

  /**
   * 检查基础业务规则
   */
  protected validateBaseRules(): ValidationResult {
    const errors = [];

    // 检查ID是否有效
    if (!this._id || this._id.trim() === '') {
      errors.push({
        field: 'id',
        message: '实体ID不能为空',
        code: 'INVALID_ID'
      });
    }

    // 检查创建时间
    if (!this._createdAt || this._createdAt > new Date()) {
      errors.push({
        field: 'createdAt',
        message: '创建时间无效',
        code: 'INVALID_CREATED_AT'
      });
    }

    // 检查更新时间
    if (!this._updatedAt || this._updatedAt < this._createdAt) {
      errors.push({
        field: 'updatedAt',
        message: '更新时间不能早于创建时间',
        code: 'INVALID_UPDATED_AT'
      });
    }

    // 检查版本号
    if (this._version < 1) {
      errors.push({
        field: 'version',
        message: '版本号必须大于0',
        code: 'INVALID_VERSION'
      });
    }

    return errors.length > 0 
      ? ValidationResult.failure(errors)
      : ValidationResult.success();
  }

  // ==================== 领域事件 ====================

  /**
   * 获取所有领域事件
   */
  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * 清空领域事件
   */
  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  /**
   * 添加领域事件
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * 创建实体删除事件
   * 子类可以重写以提供特定的事件类型
   */
  protected createEntityDeletedEvent(): DomainEvent {
    return new DomainEvent('EntityDeleted', {
      entityId: this._id,
      entityType: this.constructor.name,
      deletedAt: this._deletedAt
    });
  }

  /**
   * 创建实体恢复事件
   */
  protected createEntityRestoredEvent(): DomainEvent {
    return new DomainEvent('EntityRestored', {
      entityId: this._id,
      entityType: this.constructor.name,
      restoredAt: this._updatedAt
    });
  }

  /**
   * 创建状态变更事件
   */
  protected createEntityStatusChangedEvent(oldStatus: EntityStatus, newStatus: EntityStatus): DomainEvent {
    return new DomainEvent('EntityStatusChanged', {
      entityId: this._id,
      entityType: this.constructor.name,
      oldStatus,
      newStatus,
      changedAt: this._updatedAt
    });
  }

  // ==================== 工具方法 ====================

  /**
   * 生成唯一ID
   * 默认使用UUID v4，子类可以重写
   */
  protected generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * 检查版本冲突（乐观锁）
   */
  checkVersionConflict(expectedVersion: number): void {
    if (this._version !== expectedVersion) {
      throw new BusinessRuleError(
        `版本冲突：期望版本 ${expectedVersion}，实际版本 ${this._version}`,
        'VERSION_CONFLICT',
        {
          entityId: this._id,
          entityType: this.constructor.name,
          expectedVersion,
          actualVersion: this._version
        }
      );
    }
  }

  /**
   * 克隆实体
   * 深拷贝实体数据，但重置ID和时间戳
   */
  abstract clone(): BaseEntity;

  /**
   * 比较两个实体是否相等
   */
  equals(other: BaseEntity): boolean {
    if (!other || !(other instanceof BaseEntity)) {
      return false;
    }
    return this._id === other._id;
  }

  /**
   * 转换为简单对象（序列化）
   */
  toJSON(): Record<string, any> {
    return {
      id: this._id,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      deletedAt: this._deletedAt,
      version: this._version,
      status: this._status,
      isDeleted: this.isDeleted,
      isActive: this.isActive
    };
  }

  /**
   * 从简单对象恢复实体（反序列化）
   */
  static fromJSON<T extends BaseEntity>(
    this: new (...args: any[]) => T,
    data: Record<string, any>
  ): T {
    const entity = new this();
    
    if (data.id) entity._id = data.id;
    if (data.createdAt) entity._createdAt = new Date(data.createdAt);
    if (data.updatedAt) entity._updatedAt = new Date(data.updatedAt);
    if (data.deletedAt) entity._deletedAt = new Date(data.deletedAt);
    if (data.version) entity._version = data.version;
    if (data.status) entity._status = data.status;
    
    return entity;
  }
}