/**
 * 基础Repository接口
 * 
 * 提供通用的数据访问操作，支持类型安全的泛型实现
 * 符合企业级架构的Repository模式规范
 */

import { ValidationResult } from '../value-objects/ValidationResult';
import { DomainError } from '../errors/DomainError';

/**
 * 分页查询参数
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

/**
 * 排序选项
 */
export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * 查询选项
 */
export interface QueryOptions {
  pagination?: PaginationOptions;
  sort?: SortOption[];
  filters?: Record<string, any>;
  search?: {
    fields: string[];
    term: string;
  };
}

/**
 * 分页查询结果
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 操作结果
 */
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: DomainError;
  executionTime?: number;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult<T> {
  success: boolean;
  successCount: number;
  failureCount: number;
  successItems: T[];
  failureItems: { item: T; error: DomainError }[];
  executionTime?: number;
}

/**
 * 基础Repository接口
 * 
 * @template TEntity 实体类型
 * @template TId ID类型
 */
export interface IBaseRepository<TEntity, TId = string> {
  
  // ==================== 基本CRUD操作 ====================
  
  /**
   * 根据ID查找单个实体
   * 
   * @param id 实体ID
   * @returns 实体或null（如果不存在）
   * @throws NotFoundError 当实体不存在时
   */
  findById(id: TId): Promise<TEntity | null>;

  /**
   * 根据ID列表查找多个实体
   * 
   * @param ids ID列表
   * @returns 实体数组
   */
  findByIds(ids: TId[]): Promise<TEntity[]>;

  /**
   * 查找所有实体
   * 
   * @param options 查询选项
   * @returns 分页查询结果
   */
  findAll(options?: QueryOptions): Promise<PaginatedResult<TEntity>>;

  /**
   * 创建单个实体
   * 
   * @param entity 要创建的实体
   * @returns 操作结果
   */
  create(entity: TEntity): Promise<OperationResult<TEntity>>;

  /**
   * 更新单个实体
   * 
   * @param entity 要更新的实体
   * @returns 操作结果
   */
  update(entity: TEntity): Promise<OperationResult<TEntity>>;

  /**
   * 删除单个实体
   * 
   * @param id 实体ID
   * @returns 操作结果
   */
  delete(id: TId): Promise<OperationResult<boolean>>;

  // ==================== 批量操作 ====================

  /**
   * 批量创建实体
   * 
   * 所有操作在单个事务中执行，任一失败则全部回滚
   * 
   * @param entities 要创建的实体列表
   * @returns 批量操作结果
   */
  createBatch(entities: TEntity[]): Promise<BatchOperationResult<TEntity>>;

  /**
   * 批量更新实体
   * 
   * 所有操作在单个事务中执行，任一失败则全部回滚
   * 
   * @param entities 要更新的实体列表
   * @returns 批量操作结果
   */
  updateBatch(entities: TEntity[]): Promise<BatchOperationResult<TEntity>>;

  /**
   * 批量删除实体
   * 
   * 所有操作在单个事务中执行，任一失败则全部回滚
   * 
   * @param ids 要删除的实体ID列表
   * @returns 批量操作结果
   */
  deleteBatch(ids: TId[]): Promise<BatchOperationResult<boolean>>;

  // ==================== 查询操作 ====================

  /**
   * 根据条件查找实体
   * 
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 分页查询结果
   */
  findWhere(
    conditions: Partial<TEntity>,
    options?: QueryOptions
  ): Promise<PaginatedResult<TEntity>>;

  /**
   * 根据条件查找单个实体
   * 
   * @param conditions 查询条件
   * @returns 实体或null
   */
  findOneWhere(conditions: Partial<TEntity>): Promise<TEntity | null>;

  /**
   * 统计满足条件的实体数量
   * 
   * @param conditions 查询条件
   * @returns 实体数量
   */
  count(conditions?: Partial<TEntity>): Promise<number>;

  /**
   * 检查实体是否存在
   * 
   * @param id 实体ID
   * @returns 是否存在
   */
  exists(id: TId): Promise<boolean>;

  // ==================== 性能优化 ====================

  /**
   * 获取查询执行统计信息
   * 
   * @returns 查询统计
   */
  getQueryStats(): Promise<{
    totalQueries: number;
    averageExecutionTime: number;
    slowQueries: Array<{
      query: string;
      executionTime: number;
      timestamp: Date;
    }>;
  }>;

  /**
   * 清理缓存
   */
  clearCache(): Promise<void>;
}

/**
 * Repository工厂接口
 */
export interface IRepositoryFactory {
  /**
   * 创建Repository实例
   * 
   * @param entityType 实体类型
   * @returns Repository实例
   */
  create<TEntity, TId = string>(
    entityType: new (...args: any[]) => TEntity
  ): IBaseRepository<TEntity, TId>;
}