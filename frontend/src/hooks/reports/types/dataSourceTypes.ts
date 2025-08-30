/**
 * Comprehensive TypeScript Types for Data Sources
 * 数据源相关的完整 TypeScript 类型定义
 */

// 基础数据源类型
export interface DatabaseObject {
  name: string;
  type: 'table' | 'view';
  schema: string;
  comment?: string;
  columns?: ColumnInfo[];
  record_count?: number;
  last_updated?: string;
}

// 列信息类型
export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default?: string;
  character_maximum_length?: number;
  display_name?: string;
  description?: string;
  is_key?: boolean;
}

// 增强版数据源接口
export interface DataSourceEnhanced {
  schema_name: string;
  table_name: string;
  table_type: 'table' | 'view';
  description: string;
  display_name?: string;
  category?: string;
  record_count?: number;
}

// 数据源验证结果
export interface DataSourceValidationResult {
  dataSource: string;
  isPreferred: boolean;
  available: boolean;
  recordCount?: number;
  sampleData?: Record<string, unknown>;
  error?: string;
}

// 薪资数据源推荐结果
export interface PayrollDataSourceRecommendation {
  recommended: string | null;
  alternatives: string[];
  analysis: PayrollDataSourceAnalysis[];
}

export interface PayrollDataSourceAnalysis {
  tableName: string;
  score: number;
  reasons: string[];
  recordCount: number;
  hasPayrollFields: boolean;
  sampleData?: Record<string, unknown>;
}

// Hook 查询选项
export interface DataSourceQueryOptions {
  schema?: string;
  type?: 'table' | 'view' | 'all';
  enabled?: boolean;
  staleTime?: number;
}

export interface ColumnQueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

// 查询状态类型
export interface QueryState<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  refetch: () => Promise<any>;
}

// Hook 返回类型
export interface UseDataSourcesReturn extends QueryState<DatabaseObject[]> {
  dataSources: DatabaseObject[];
  refresh: () => Promise<void>;
}

export interface UseDataSourcesEnhancedReturn extends QueryState<DataSourceEnhanced[]> {
  dataSources: DataSourceEnhanced[];
  refresh: () => Promise<void>;
}

export interface UseTableColumnsReturn extends QueryState<ColumnInfo[]> {
  columns: ColumnInfo[];
  columnNames: string[];
  refresh: () => Promise<void>;
}

// 数据源发现服务接口
export interface IDataSourceDiscoveryService {
  discoverAll(): Promise<DatabaseObject[]>;
  getColumns(tableName: string): Promise<ColumnInfo[]>;
  validateDataSource(tableName: string): Promise<DataSourceValidationResult>;
  recommendPayrollDataSource(): Promise<PayrollDataSourceRecommendation>;
}

// 可用数据源结果
export interface AvailableDataSourcesResult {
  primary: DataSourceEnhanced[];
  fallback: DataSourceEnhanced[];
}

// 查询构建器接口
export interface IQueryBuilder {
  select(fields: string | string[]): IQueryBuilder;
  where(field: string, operator: ComparisonOperator, value: unknown): IQueryBuilder;
  order(field: string, ascending?: boolean): IQueryBuilder;
  limit(count: number): IQueryBuilder;
  execute<T = Record<string, unknown>>(): Promise<QueryResult<T[]>>;
}

// 查询结果类型
export interface QueryResult<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

// 比较操作符类型
export type ComparisonOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'in';

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

// 错误类型
export interface DataSourceError {
  code: string;
  message: string;
  context: string;
  cause?: Error;
  metadata?: Record<string, unknown>;
}

// 缓存键类型
export type CacheKey = readonly (string | number | boolean | object | null | undefined)[];

// 数据类型推断
export type InferredDataType = 
  | 'text' 
  | 'integer' 
  | 'numeric' 
  | 'boolean' 
  | 'date' 
  | 'timestamp' 
  | 'uuid' 
  | 'email';

// 配置相关类型
export interface DataSourceConfig {
  CACHE_TIMES: {
    DATA_SOURCES: number;
    COLUMNS: number;
    RECORD_COUNT: number;
    VALIDATION: number;
  };
  SCORING_WEIGHTS: {
    PAYROLL_KEYWORD: number;
    PAYROLL_FIELD: number;
    EMPLOYEE_FIELD: number;
    DATE_FIELD: number;
    MAX_RECORD_SCORE: number;
    RECORD_SCORE_DIVISOR: number;
  };
  KEYWORDS: {
    PAYROLL: readonly string[];
    EMPLOYEE: readonly string[];
    PAYROLL_FIELDS: readonly string[];
    DATE_FIELDS: readonly string[];
  };
  QUERY_LIMITS: {
    SAMPLE_SIZE: number;
    VALIDATION_SAMPLE: number;
    MAX_CONCURRENT_QUERIES: number;
    TIMEOUT_MS: number;
  };
}

// 发现策略接口
export interface DiscoveryStrategy {
  name: string;
  priority: number;
  canDiscover(): Promise<boolean>;
  discover(): Promise<DatabaseObject[]>;
}

// 批量操作结果
export interface BatchOperationResult<T, E = Error> {
  results: (T | null)[];
  errors: (E | null)[];
  successCount: number;
  failureCount: number;
}

// 安全执行结果
export interface SafeExecutionResult<T> {
  data: T | null;
  error: DataSourceError | null;
  success: boolean;
}

// 日志级别
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// 错误恢复策略接口
export interface ErrorRecoveryStrategy<T> {
  canRecover(error: DataSourceError): boolean;
  recover(error: DataSourceError): Promise<T>;
}

// 工具函数返回类型
export interface RecommendedFieldsResult {
  fields: string[];
  total: number;
  suggested: string[];
  required: string[];
}

export interface DataSourceCategoryResult {
  category: string;
  subcategory?: string;
  confidence: number;
}

// React Query 相关类型扩展
export interface QueryOptions<T> {
  queryKey: CacheKey;
  queryFn: () => Promise<T>;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  retry?: number | boolean;
  retryDelay?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

// 数据源状态枚举
export enum DataSourceStatus {
  UNKNOWN = 'unknown',
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  ERROR = 'error',
  LOADING = 'loading',
}

// 数据源类别枚举
export enum DataSourceCategory {
  PAYROLL = 'payroll',
  EMPLOYEE = 'employee', 
  DEPARTMENT = 'department',
  SYSTEM = 'system',
  REPORT = 'report',
  LOOKUP = 'lookup',
  UNKNOWN = 'unknown',
}

// 表类型联合
export type TableType = 'table' | 'view';
export type SchemaName = 'public' | 'auth' | 'storage' | string;

// 泛型约束类型
export type TableName = string;
export type ColumnName = string;
export type FieldValue = string | number | boolean | Date | null | undefined;

// 实用类型
export type NonNullable<T> = T extends null | undefined ? never : T;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// 深度只读类型
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// 条件类型工具
export type If<C extends boolean, T, F> = C extends true ? T : F;
export type IsString<T> = T extends string ? true : false;
export type IsArray<T> = T extends readonly unknown[] ? true : false;

// 键值对提取类型
export type ExtractKeys<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type ExtractValues<T, U> = T[ExtractKeys<T, U>];

// Hook 组合类型
export type UseDataSourcesHookResult = {
  // 基础数据源
  dataSources: DatabaseObject[];
  
  // 增强版数据源  
  dataSourcesEnhanced: DataSourceEnhanced[];
  
  // 查询状态
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  
  // 操作方法
  refresh: () => Promise<void>;
  validateSource: (tableName: string) => Promise<DataSourceValidationResult>;
  getColumns: (tableName: string) => Promise<ColumnInfo[]>;
  recommendPayrollSource: () => Promise<PayrollDataSourceRecommendation>;
};

// 导出所有类型的联合
export type AllDataSourceTypes = 
  | DatabaseObject
  | ColumnInfo  
  | DataSourceEnhanced
  | DataSourceValidationResult
  | PayrollDataSourceRecommendation
  | PayrollDataSourceAnalysis
  | TableMetadata
  | ColumnMetadata
  | QueryResult<unknown>
  | BatchOperationResult<unknown>
  | SafeExecutionResult<unknown>;