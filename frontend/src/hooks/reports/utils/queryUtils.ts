/**
 * Type-Safe Query Utilities for Supabase Operations
 * Supabase 操作的类型安全查询工具
 */

import { supabase } from '@/lib/supabase';
import { DATA_SOURCE_CONFIG } from '../config/dataSourceConfig';
import { DataSourceError, DataSourceErrorCode, safeExecuteWithTimeout, DataSourceLogger } from './errorHandling';

// 查询结果类型
export interface QueryResult<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

// 表元数据类型
export interface TableMetadata {
  name: string;
  type: 'table' | 'view';
  schema: string;
  comment?: string;
  recordCount: number;
  exists: boolean;
}

// 列元数据类型
export interface ColumnMetadata {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  maxLength?: number;
  isKey: boolean;
  description?: string;
}

// 类型安全的表查询类
export class TypeSafeTableQuery {
  constructor(private tableName: string) {
    this.validateTableName(tableName);
  }

  private validateTableName(tableName: string): void {
    if (!tableName || typeof tableName !== 'string') {
      throw DataSourceError.validation('tableName', tableName, 'Table name must be a non-empty string');
    }
    
    if (tableName.length > 100) {
      throw DataSourceError.validation('tableName', tableName, 'Table name is too long (max 100 characters)');
    }
    
    // 检查表名格式（允许字母、数字、下划线）
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw DataSourceError.validation('tableName', tableName, 'Invalid table name format');
    }
  }

  // 安全的存在性检查
  async exists(): Promise<boolean> {
    const result = await safeExecuteWithTimeout(
      async () => {
        const { error } = await supabase
          .from(this.tableName as any) // Type assertion for dynamic table names
          .select('*', { count: 'exact', head: true })
          .limit(0);
        
        return !error;
      },
      `table-exists-${this.tableName}`,
      DATA_SOURCE_CONFIG.QUERY_LIMITS.TIMEOUT_MS
    );

    return result.data ?? false;
  }

  // 安全的记录数查询
  async getRecordCount(): Promise<number> {
    const result = await safeExecuteWithTimeout(
      async () => {
        const { count, error } = await supabase
          .from(this.tableName as any) // Type assertion for dynamic table names
          .select('*', { count: 'exact', head: true })
          .limit(0);
        
        if (error) {
          throw new Error(error.message);
        }
        
        return count ?? 0;
      },
      `record-count-${this.tableName}`,
      DATA_SOURCE_CONFIG.QUERY_LIMITS.TIMEOUT_MS
    );

    return result.data ?? 0;
  }

  // 安全的样本数据查询
  async getSampleData<T = Record<string, unknown>>(limit: number = 1): Promise<T[]> {
    const validatedLimit = Math.max(1, Math.min(limit, 10)); // 限制在 1-10 之间
    
    const result = await safeExecuteWithTimeout(
      async () => {
        const { data, error } = await supabase
          .from(this.tableName as any) // Type assertion for dynamic table names
          .select('*')
          .limit(validatedLimit);
        
        if (error) {
          throw new Error(error.message);
        }
        
        return data as T[] || [];
      },
      `sample-data-${this.tableName}`,
      DATA_SOURCE_CONFIG.QUERY_LIMITS.TIMEOUT_MS
    );

    return result.data ?? [];
  }

  // 安全的列信息推断
  async inferColumns(): Promise<ColumnMetadata[]> {
    const sampleData = await this.getSampleData(1);
    
    if (sampleData.length === 0) {
      DataSourceLogger.warn('column-inference', `No data available for table ${this.tableName}`);
      return [];
    }

    const sample = sampleData[0] as Record<string, unknown>;
    const columns: ColumnMetadata[] = [];

    for (const [columnName, value] of Object.entries(sample)) {
      const metadata = this.inferColumnType(columnName, value);
      columns.push(metadata);
    }

    return columns.sort((a, b) => a.name.localeCompare(b.name));
  }

  private inferColumnType(columnName: string, value: unknown): ColumnMetadata {
    let type: string = DATA_SOURCE_CONFIG.TYPE_INFERENCE.DEFAULT_TYPE;
    let nullable = true;
    let isKey = false;

    if (value !== null && value !== undefined) {
      nullable = false;
      
      if (typeof value === 'number') {
        type = Number.isInteger(value) ? 'integer' : 'numeric';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      } else if (value instanceof Date) {
        type = 'timestamp';
      } else if (typeof value === 'string') {
        const stringValue = value as string;
        
        // 使用配置中的模式进行类型推断
        if (DATA_SOURCE_CONFIG.TYPE_INFERENCE.PATTERNS.UUID.test(stringValue)) {
          type = 'uuid';
          isKey = columnName.toLowerCase().includes('id');
        } else if (DATA_SOURCE_CONFIG.TYPE_INFERENCE.PATTERNS.DATE.test(stringValue)) {
          type = 'date';
        } else if (DATA_SOURCE_CONFIG.TYPE_INFERENCE.PATTERNS.TIMESTAMP.test(stringValue)) {
          type = 'timestamp';
        } else if (DATA_SOURCE_CONFIG.TYPE_INFERENCE.PATTERNS.EMAIL.test(stringValue)) {
          type = 'email';
        } else {
          type = 'text';
        }
      }
    }

    // 检查是否可能是主键
    if (columnName.toLowerCase().includes('id') || columnName.toLowerCase().endsWith('_id')) {
      isKey = true;
    }

    return {
      name: columnName,
      type,
      nullable,
      isKey,
      description: `推断类型: ${type}`,
      maxLength: typeof value === 'string' ? (value as string).length : undefined,
    };
  }

  // 获取完整的表元数据
  async getMetadata(): Promise<TableMetadata> {
    const [exists, recordCount] = await Promise.all([
      this.exists(),
      this.getRecordCount(),
    ]);

    return {
      name: this.tableName,
      type: 'table', // 默认为 table，实际类型需要从系统表查询
      schema: 'public',
      recordCount,
      exists,
      comment: exists ? `表 ${this.tableName}` : '表不存在',
    };
  }
}

// 数据源发现工具类
export class DataSourceDiscovery {
  private static readonly EXCLUDED_PREFIXES = DATA_SOURCE_CONFIG.SYSTEM_TABLE_FILTERS.PREFIXES_TO_EXCLUDE;
  private static readonly EXCLUDED_NAMES = DATA_SOURCE_CONFIG.SYSTEM_TABLE_FILTERS.NAMES_TO_EXCLUDE;

  // 通过错误信息推断可用表
  static async discoverFromError(): Promise<string[]> {
    const result = await safeExecuteWithTimeout(
      async () => {
        const { error } = await supabase
          .from('__non_existent_table_discovery_probe__' as any) // Type assertion for probe table
          .select('*')
          .limit(1);

        if (error && error.message) {
          return this.extractTableNamesFromError(error.message);
        }

        return [];
      },
      'error-discovery',
      5000 // 5秒超时
    );

    return result.data ?? [];
  }

  private static extractTableNamesFromError(errorMessage: string): string[] {
    const suggestions: string[] = [];
    
    // 常见的错误模式
    const patterns = [
      /relation "([^"]+)" does not exist/gi,
      /table "([^"]+)" does not exist/gi,
      /"([a-zA-Z_][a-zA-Z0-9_]*)"(?:\s+does not exist|\s+not found)/gi,
    ];

    for (const pattern of patterns) {
      const matches = errorMessage.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && this.isValidTableName(match[1])) {
          suggestions.push(match[1]);
        }
      }
    }

    return [...new Set(suggestions)];
  }

  private static isValidTableName(name: string): boolean {
    // 过滤系统表和无效名称
    if (this.EXCLUDED_PREFIXES.some(prefix => name.startsWith(prefix))) {
      return false;
    }

    if (this.EXCLUDED_NAMES.includes(name as any)) {
      return false;
    }

    // 检查长度和格式
    return name.length > 0 && 
           name.length < 100 && 
           /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  // 验证多个表的存在性
  static async validateTables(tableNames: string[]): Promise<Map<string, TableMetadata>> {
    const results = new Map<string, TableMetadata>();
    const concurrency = DATA_SOURCE_CONFIG.QUERY_LIMITS.MAX_CONCURRENT_QUERIES;

    // 分批处理以控制并发
    for (let i = 0; i < tableNames.length; i += concurrency) {
      const batch = tableNames.slice(i, i + concurrency);
      const batchPromises = batch.map(async (tableName) => {
        try {
          const query = new TypeSafeTableQuery(tableName);
          const metadata = await query.getMetadata();
          return { tableName, metadata };
        } catch (error) {
          DataSourceLogger.warn('table-validation', `Failed to validate table ${tableName}`, { error });
          return {
            tableName,
            metadata: {
              name: tableName,
              type: 'table' as const,
              schema: 'public',
              recordCount: 0,
              exists: false,
              comment: `验证失败: ${error instanceof Error ? error.message : String(error)}`,
            }
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ tableName, metadata }) => {
        results.set(tableName, metadata);
      });
    }

    return results;
  }
}

// 查询构建器工具
export class QueryBuilder {
  private selectFields: string[] = ['*'];
  private filters: Array<{ field: string; operator: string; value: unknown }> = [];
  private orderBy: Array<{ field: string; ascending: boolean }> = [];
  private limitValue?: number;

  constructor(private tableName: string) {}

  select(fields: string | string[]): this {
    this.selectFields = typeof fields === 'string' ? [fields] : fields;
    return this;
  }

  where(field: string, operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'in', value: unknown): this {
    this.filters.push({ field, operator, value });
    return this;
  }

  order(field: string, ascending: boolean = true): this {
    this.orderBy.push({ field, ascending });
    return this;
  }

  limit(count: number): this {
    this.limitValue = Math.max(1, Math.min(count, 1000)); // 限制在合理范围内
    return this;
  }

  async execute<T = Record<string, unknown>>(): Promise<QueryResult<T[]>> {
    return safeExecuteWithTimeout(
      async () => {
        let query = supabase
          .from(this.tableName as any) // Type assertion for dynamic table names
          .select(this.selectFields.join(', '), { count: 'exact' });

        // 应用过滤器
        for (const filter of this.filters) {
          switch (filter.operator) {
            case '=':
              query = query.eq(filter.field, filter.value as any);
              break;
            case '!=':
              query = query.neq(filter.field, filter.value as any);
              break;
            case '>':
              query = query.gt(filter.field, filter.value as any);
              break;
            case '<':
              query = query.lt(filter.field, filter.value as any);
              break;
            case '>=':
              query = query.gte(filter.field, filter.value as any);
              break;
            case '<=':
              query = query.lte(filter.field, filter.value as any);
              break;
            case 'like':
              query = query.like(filter.field, `%${filter.value}%`);
              break;
            case 'in':
              query = query.in(filter.field, filter.value as any[]);
              break;
          }
        }

        // 应用排序
        for (const order of this.orderBy) {
          query = query.order(order.field, { ascending: order.ascending });
        }

        // 应用限制
        if (this.limitValue) {
          query = query.limit(this.limitValue);
        }

        const { data, error, count } = await query;

        if (error) {
          throw new Error(error.message);
        }

        return {
          data: data as T[],
          error: null,
          count: count ?? undefined,
        };
      },
      `query-${this.tableName}`,
      DATA_SOURCE_CONFIG.QUERY_LIMITS.TIMEOUT_MS
    ).then(result => result.data ?? { data: null, error: 'Query execution failed', count: undefined });
  }
}

// 工厂函数
export const createTableQuery = (tableName: string): TypeSafeTableQuery => {
  return new TypeSafeTableQuery(tableName);
};

export const createQueryBuilder = (tableName: string): QueryBuilder => {
  return new QueryBuilder(tableName);
};

// 批量操作工具
export const batchValidateTables = (tableNames: string[]): Promise<Map<string, TableMetadata>> => {
  return DataSourceDiscovery.validateTables(tableNames);
};

export const discoverTablesFromError = (): Promise<string[]> => {
  return DataSourceDiscovery.discoverFromError();
};