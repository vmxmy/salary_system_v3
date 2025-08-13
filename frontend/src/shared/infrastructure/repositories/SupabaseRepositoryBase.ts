/**
 * Supabase Repository基础实现
 * 
 * 实现了IBaseRepository接口，提供基于Supabase的数据访问功能
 * 支持类型安全的CRUD操作、批量处理、性能监控和错误处理
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { 
  IBaseRepository, 
  PaginatedResult, 
  QueryOptions, 
  OperationResult, 
  BatchOperationResult,
  PaginationOptions,
  SortOption
} from '../../domain/repositories/IBaseRepository';
import { BaseEntity } from '../../domain/entities/BaseEntity';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  ExternalServiceError 
} from '../../domain/errors/DomainError';
import type { Database } from '@/types/supabase';

/**
 * Supabase查询构建器类型
 */
type SupabaseTable = keyof Database['public']['Tables'];
type SupabaseRow<T extends SupabaseTable> = Database['public']['Tables'][T]['Row'];
type SupabaseInsert<T extends SupabaseTable> = Database['public']['Tables'][T]['Insert'];
type SupabaseUpdate<T extends SupabaseTable> = Database['public']['Tables'][T]['Update'];

/**
 * 映射器接口
 */
export interface IDataMapper<TEntity extends BaseEntity, TRow> {
  /** 从数据库行转换为Domain实体 */
  toDomain(row: TRow): TEntity;
  /** 从Domain实体转换为数据库插入对象 */
  toInsert(entity: TEntity): any;
  /** 从Domain实体转换为数据库更新对象 */
  toUpdate(entity: TEntity): any;
}

/**
 * 查询统计信息
 */
interface QueryStat {
  query: string;
  executionTime: number;
  timestamp: Date;
}

/**
 * Supabase Repository基础类
 */
export abstract class SupabaseRepositoryBase<
  TEntity extends BaseEntity,
  TTable extends SupabaseTable,
  TId = string
> implements IBaseRepository<TEntity, TId> {
  
  protected queryStats: QueryStat[] = [];
  protected slowQueryThreshold = 1000; // 1秒

  constructor(
    protected supabase: SupabaseClient<Database>,
    protected tableName: TTable,
    protected mapper: IDataMapper<TEntity, SupabaseRow<TTable>>
  ) {}

  // ==================== 基本CRUD操作 ====================

  /**
   * 根据ID查找单个实体
   */
  async findById(id: TId): Promise<TEntity | null> {
    const startTime = performance.now();
    
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // 记录不存在
        }
        throw this.mapSupabaseError(error, `Failed to find ${this.tableName} by id: ${id}`);
      }

      const entity = this.mapper.toDomain(data);
      this.recordQueryStat(`SELECT by id from ${this.tableName}`, startTime);
      
      return entity;
    } catch (error) {
      this.recordQueryStat(`SELECT by id from ${this.tableName} (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 根据ID列表查找多个实体
   */
  async findByIds(ids: TId[]): Promise<TEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const startTime = performance.now();
    
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .in('id', ids);

      if (error) {
        throw this.mapSupabaseError(error, `Failed to find ${this.tableName} by ids`);
      }

      const entities = data.map(row => this.mapper.toDomain(row));
      this.recordQueryStat(`SELECT by ids from ${this.tableName}`, startTime);
      
      return entities;
    } catch (error) {
      this.recordQueryStat(`SELECT by ids from ${this.tableName} (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 查找所有实体
   */
  async findAll(options: QueryOptions = {}): Promise<PaginatedResult<TEntity>> {
    const startTime = performance.now();
    
    try {
      let query = this.supabase.from(this.tableName).select('*', { count: 'exact' });

      // 应用过滤器
      query = this.applyFilters(query, options.filters);

      // 应用排序
      query = this.applySorting(query, options.sort);

      // 应用搜索
      query = this.applySearch(query, options.search);

      // 应用分页
      if (options.pagination) {
        const { page, pageSize } = options.pagination;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) {
        throw this.mapSupabaseError(error, `Failed to find all ${this.tableName}`);
      }

      const entities = data.map(row => this.mapper.toDomain(row));
      this.recordQueryStat(`SELECT all from ${this.tableName}`, startTime);

      const totalPages = options.pagination 
        ? Math.ceil((count || 0) / options.pagination.pageSize)
        : 1;

      return {
        data: entities,
        total: count || 0,
        page: options.pagination?.page || 1,
        pageSize: options.pagination?.pageSize || entities.length,
        totalPages
      };
    } catch (error) {
      this.recordQueryStat(`SELECT all from ${this.tableName} (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 创建单个实体
   */
  async create(entity: TEntity): Promise<OperationResult<TEntity>> {
    const startTime = performance.now();
    
    try {
      // 验证实体
      const validation = entity.validate();
      if (!validation.isValid) {
        return {
          success: false,
          error: new ValidationError(validation.firstError || 'Entity validation failed')
        };
      }

      const insertData = this.mapper.toInsert(entity);
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: this.mapSupabaseError(error, `Failed to create ${this.tableName}`)
        };
      }

      const createdEntity = this.mapper.toDomain(data);
      this.recordQueryStat(`INSERT into ${this.tableName}`, startTime);

      return {
        success: true,
        data: createdEntity,
        executionTime: performance.now() - startTime
      };
    } catch (error) {
      this.recordQueryStat(`INSERT into ${this.tableName} (ERROR)`, startTime);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * 更新单个实体
   */
  async update(entity: TEntity): Promise<OperationResult<TEntity>> {
    const startTime = performance.now();
    
    try {
      // 验证实体
      const validation = entity.validate();
      if (!validation.isValid) {
        return {
          success: false,
          error: new ValidationError(validation.firstError || 'Entity validation failed')
        };
      }

      const updateData = this.mapper.toUpdate(entity);
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', entity.id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: new NotFoundError(this.tableName, entity.id)
          };
        }
        return {
          success: false,
          error: this.mapSupabaseError(error, `Failed to update ${this.tableName}`)
        };
      }

      const updatedEntity = this.mapper.toDomain(data);
      this.recordQueryStat(`UPDATE ${this.tableName}`, startTime);

      return {
        success: true,
        data: updatedEntity,
        executionTime: performance.now() - startTime
      };
    } catch (error) {
      this.recordQueryStat(`UPDATE ${this.tableName} (ERROR)`, startTime);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * 删除单个实体
   */
  async delete(id: TId): Promise<OperationResult<boolean>> {
    const startTime = performance.now();
    
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        return {
          success: false,
          error: this.mapSupabaseError(error, `Failed to delete ${this.tableName}`)
        };
      }

      this.recordQueryStat(`DELETE from ${this.tableName}`, startTime);

      return {
        success: true,
        data: true,
        executionTime: performance.now() - startTime
      };
    } catch (error) {
      this.recordQueryStat(`DELETE from ${this.tableName} (ERROR)`, startTime);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  // ==================== 批量操作 ====================

  /**
   * 批量创建实体
   */
  async createBatch(entities: TEntity[]): Promise<BatchOperationResult<TEntity>> {
    const startTime = performance.now();
    const successItems: TEntity[] = [];
    const failureItems: { item: TEntity; error: any }[] = [];

    try {
      // 验证所有实体
      for (const entity of entities) {
        const validation = entity.validate();
        if (!validation.isValid) {
          failureItems.push({
            item: entity,
            error: new ValidationError(validation.firstError || 'Entity validation failed')
          });
          continue;
        }
      }

      // 批量插入有效实体
      const validEntities = entities.filter(e => 
        !failureItems.some(f => f.item.id === e.id)
      );

      if (validEntities.length > 0) {
        const insertData = validEntities.map(entity => this.mapper.toInsert(entity));
        
        const { data, error } = await this.supabase
          .from(this.tableName)
          .insert(insertData)
          .select();

        if (error) {
          // 如果批量插入失败，将所有项标记为失败
          const batchError = this.mapSupabaseError(error, `Failed to batch create ${this.tableName}`);
          validEntities.forEach(entity => {
            failureItems.push({ item: entity, error: batchError });
          });
        } else {
          // 成功的项
          data.forEach(row => {
            successItems.push(this.mapper.toDomain(row));
          });
        }
      }

      this.recordQueryStat(`BATCH INSERT into ${this.tableName}`, startTime);

      return {
        success: failureItems.length === 0,
        successCount: successItems.length,
        failureCount: failureItems.length,
        successItems,
        failureItems,
        executionTime: performance.now() - startTime
      };
    } catch (error) {
      this.recordQueryStat(`BATCH INSERT into ${this.tableName} (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 批量更新实体
   */
  async updateBatch(entities: TEntity[]): Promise<BatchOperationResult<TEntity>> {
    const startTime = performance.now();
    const successItems: TEntity[] = [];
    const failureItems: { item: TEntity; error: any }[] = [];

    try {
      // 由于Supabase不支持批量更新，使用串行处理
      for (const entity of entities) {
        const result = await this.update(entity);
        if (result.success && result.data) {
          successItems.push(result.data);
        } else {
          failureItems.push({
            item: entity,
            error: result.error || new Error('Unknown update error')
          });
        }
      }

      this.recordQueryStat(`BATCH UPDATE ${this.tableName}`, startTime);

      return {
        success: failureItems.length === 0,
        successCount: successItems.length,
        failureCount: failureItems.length,
        successItems,
        failureItems,
        executionTime: performance.now() - startTime
      };
    } catch (error) {
      this.recordQueryStat(`BATCH UPDATE ${this.tableName} (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 批量删除实体
   */
  async deleteBatch(ids: TId[]): Promise<BatchOperationResult<boolean>> {
    const startTime = performance.now();
    
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .in('id', ids);

      this.recordQueryStat(`BATCH DELETE from ${this.tableName}`, startTime);

      if (error) {
        return {
          success: false,
          successCount: 0,
          failureCount: ids.length,
          successItems: [],
          failureItems: ids.map(id => ({
            item: true,
            error: this.mapSupabaseError(error, `Failed to delete ${this.tableName}`)
          })),
          executionTime: performance.now() - startTime
        };
      }

      return {
        success: true,
        successCount: ids.length,
        failureCount: 0,
        successItems: ids.map(() => true),
        failureItems: [],
        executionTime: performance.now() - startTime
      };
    } catch (error) {
      this.recordQueryStat(`BATCH DELETE from ${this.tableName} (ERROR)`, startTime);
      throw error;
    }
  }

  // ==================== 查询操作 ====================

  /**
   * 根据条件查找实体
   */
  async findWhere(
    conditions: Partial<TEntity>,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<TEntity>> {
    // 将Domain实体条件转换为数据库查询条件
    const dbConditions = this.mapDomainConditionsToDb(conditions);
    
    return this.findAll({
      ...options,
      filters: { ...options.filters, ...dbConditions }
    });
  }

  /**
   * 根据条件查找单个实体
   */
  async findOneWhere(conditions: Partial<TEntity>): Promise<TEntity | null> {
    const result = await this.findWhere(conditions, { 
      pagination: { page: 1, pageSize: 1 } 
    });
    
    return result.data.length > 0 ? result.data[0] : null;
  }

  /**
   * 统计满足条件的实体数量
   */
  async count(conditions: Partial<TEntity> = {}): Promise<number> {
    const startTime = performance.now();
    
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      const dbConditions = this.mapDomainConditionsToDb(conditions);
      query = this.applyFilters(query, dbConditions);

      const { count, error } = await query;

      if (error) {
        throw this.mapSupabaseError(error, `Failed to count ${this.tableName}`);
      }

      this.recordQueryStat(`COUNT from ${this.tableName}`, startTime);
      return count || 0;
    } catch (error) {
      this.recordQueryStat(`COUNT from ${this.tableName} (ERROR)`, startTime);
      throw error;
    }
  }

  /**
   * 检查实体是否存在
   */
  async exists(id: TId): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }

  // ==================== 性能监控 ====================

  /**
   * 获取查询执行统计信息
   */
  async getQueryStats() {
    const totalQueries = this.queryStats.length;
    const averageExecutionTime = totalQueries > 0
      ? this.queryStats.reduce((sum, stat) => sum + stat.executionTime, 0) / totalQueries
      : 0;
    
    const slowQueries = this.queryStats
      .filter(stat => stat.executionTime > this.slowQueryThreshold)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      totalQueries,
      averageExecutionTime,
      slowQueries
    };
  }

  /**
   * 清理缓存
   */
  async clearCache(): Promise<void> {
    this.queryStats = [];
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 应用过滤器
   */
  protected applyFilters(query: any, filters?: Record<string, any>): any {
    if (!filters) return query;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    return query;
  }

  /**
   * 应用排序
   */
  protected applySorting(query: any, sort?: SortOption[]): any {
    if (!sort || sort.length === 0) return query;

    sort.forEach(({ field, direction }) => {
      query = query.order(field, { ascending: direction === 'asc' });
    });

    return query;
  }

  /**
   * 应用搜索
   */
  protected applySearch(query: any, search?: { fields: string[]; term: string }): any {
    if (!search || !search.term) return query;

    const searchConditions = search.fields.map(field => 
      `${field}.ilike.%${search.term}%`
    ).join(',');

    return query.or(searchConditions);
  }

  /**
   * 映射Supabase错误
   */
  protected mapSupabaseError(error: any, context: string): Error {
    if (error.code === '23505') {
      return new ConflictError(context, this.tableName, error.details);
    }
    
    return new ExternalServiceError(
      `${context}: ${error.message}`,
      'Supabase',
      error.code
    );
  }

  /**
   * 记录查询统计
   */
  protected recordQueryStat(query: string, startTime: number): void {
    const executionTime = performance.now() - startTime;
    
    this.queryStats.push({
      query,
      executionTime,
      timestamp: new Date()
    });

    // 保持最近1000条记录
    if (this.queryStats.length > 1000) {
      this.queryStats = this.queryStats.slice(-1000);
    }
  }

  /**
   * 将Domain实体条件映射为数据库条件
   * 子类可以重写此方法来实现自定义映射
   */
  protected mapDomainConditionsToDb(conditions: Partial<TEntity>): Record<string, any> {
    // 默认实现：直接使用条件
    // 子类应该重写此方法来实现正确的映射
    return conditions as Record<string, any>;
  }
}