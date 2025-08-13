/**
 * API请求响应DTO
 * 
 * 定义标准化的API请求和响应结构
 */

import { BaseDto, PaginationDto, FilterDto, ValidationResultDto } from './BaseDto';

/**
 * 标准API响应包装器
 */
export interface ApiResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: ApiError;
  /** 分页信息（如果适用） */
  pagination?: PaginationMeta;
  /** 元数据 */
  meta?: ApiMeta;
}

/**
 * API错误信息
 */
export interface ApiError {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 详细错误信息 */
  details?: any;
  /** 字段验证错误 */
  validationErrors?: Array<{
    field: string;
    message: string;
    code?: string;
    rejectedValue?: any;
  }>;
  /** 错误堆栈（仅开发环境） */
  stack?: string;
}

/**
 * 分页元数据
 */
export interface PaginationMeta {
  /** 当前页码 */
  currentPage: number;
  /** 每页大小 */
  pageSize: number;
  /** 总记录数 */
  totalCount: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrevious: boolean;
  /** 下一页链接 */
  nextUrl?: string;
  /** 上一页链接 */
  previousUrl?: string;
}

/**
 * API元数据
 */
export interface ApiMeta {
  /** 请求时间戳 */
  timestamp: string;
  /** 请求ID */
  requestId?: string;
  /** API版本 */
  version?: string;
  /** 响应时间（毫秒） */
  duration?: number;
  /** 服务器信息 */
  server?: string;
  /** 缓存信息 */
  cache?: {
    hit: boolean;
    ttl?: number;
    key?: string;
  };
}

/**
 * 标准列表查询请求
 */
export interface ListRequest extends PaginationDto {
  /** 过滤条件 */
  filters?: FilterDto;
  /** 包含的关联数据 */
  include?: string[];
  /** 排除的字段 */
  exclude?: string[];
}

/**
 * 标准列表响应
 */
export interface ListResponse<T> {
  /** 数据列表 */
  items: T[];
  /** 分页信息 */
  pagination: PaginationMeta;
  /** 统计信息 */
  statistics?: {
    total: number;
    filtered: number;
    [key: string]: any;
  };
}

/**
 * 批量操作请求
 */
export interface BatchOperationRequest<T> {
  /** 操作类型 */
  operation: 'create' | 'update' | 'delete' | 'activate' | 'deactivate';
  /** 操作数据 */
  items: T[];
  /** 批量选项 */
  options?: {
    /** 是否继续执行（即使有错误） */
    continueOnError?: boolean;
    /** 是否事务性操作 */
    transactional?: boolean;
    /** 批次大小 */
    batchSize?: number;
    /** 是否返回详细结果 */
    returnDetails?: boolean;
  };
  /** 验证规则 */
  validation?: {
    /** 是否严格验证 */
    strict?: boolean;
    /** 跳过的验证规则 */
    skipRules?: string[];
  };
}

/**
 * 批量操作响应
 */
export interface BatchOperationResponse<T> {
  /** 成功项 */
  succeeded: T[];
  /** 失败项 */
  failed: Array<{
    item: T;
    error: ApiError;
    index: number;
  }>;
  /** 统计信息 */
  statistics: {
    total: number;
    succeeded: number;
    failed: number;
    duration?: number;
  };
  /** 详细结果 */
  details?: Array<{
    item: T;
    status: 'success' | 'error' | 'warning';
    message?: string;
    result?: any;
  }>;
}

/**
 * 搜索请求
 */
export interface SearchRequest extends PaginationDto {
  /** 搜索查询 */
  query: string;
  /** 搜索字段 */
  fields?: string[];
  /** 过滤条件 */
  filters?: FilterDto;
  /** 高亮设置 */
  highlight?: {
    enabled: boolean;
    fields?: string[];
    preTag?: string;
    postTag?: string;
  };
  /** 搜索选项 */
  options?: {
    /** 模糊匹配 */
    fuzzy?: boolean;
    /** 最小匹配度 */
    minScore?: number;
    /** 同义词搜索 */
    synonyms?: boolean;
  };
}

/**
 * 搜索响应
 */
export interface SearchResponse<T> {
  /** 搜索结果 */
  results: Array<{
    item: T;
    score?: number;
    highlights?: Record<string, string[]>;
  }>;
  /** 分页信息 */
  pagination: PaginationMeta;
  /** 搜索统计 */
  statistics: {
    totalMatches: number;
    searchTime: number;
    suggestions?: string[];
  };
  /** 聚合结果 */
  aggregations?: Record<string, any>;
}

/**
 * 导出请求
 */
export interface ExportRequest {
  /** 导出格式 */
  format: 'excel' | 'csv' | 'pdf' | 'json';
  /** 过滤条件 */
  filters?: FilterDto;
  /** 包含的字段 */
  fields?: string[];
  /** 导出选项 */
  options?: {
    filename?: string;
    includeHeaders?: boolean;
    dateFormat?: string;
    numberFormat?: string;
    templateId?: string;
  };
  /** 异步导出 */
  async?: boolean;
}

/**
 * 导出响应
 */
export interface ExportResponse {
  /** 是否异步导出 */
  async: boolean;
  /** 同步导出的数据（base64编码） */
  data?: string;
  /** 异步导出的任务ID */
  taskId?: string;
  /** 文件信息 */
  fileInfo?: {
    filename: string;
    size: number;
    mimeType: string;
    downloadUrl?: string;
  };
  /** 导出统计 */
  statistics?: {
    recordCount: number;
    processingTime: number;
  };
}

/**
 * 导入请求
 */
export interface ImportRequest {
  /** 文件数据（base64编码） */
  fileData: string;
  /** 文件类型 */
  fileType: 'excel' | 'csv';
  /** 字段映射 */
  fieldMapping: Record<string, string>;
  /** 导入选项 */
  options?: {
    hasHeaders?: boolean;
    skipRows?: number;
    validateOnly?: boolean;
    updateExisting?: boolean;
    batchSize?: number;
  };
  /** 验证规则 */
  validation?: {
    strict?: boolean;
    skipEmptyRows?: boolean;
    maxErrors?: number;
  };
}

/**
 * 导入响应
 */
export interface ImportResponse<T> {
  /** 是否仅验证 */
  validateOnly: boolean;
  /** 预览数据 */
  preview?: Array<{
    rowNumber: number;
    data: T;
    validation: ValidationResultDto;
    operation: 'create' | 'update' | 'skip';
  }>;
  /** 导入结果（非预览模式） */
  result?: {
    created: T[];
    updated: T[];
    failed: Array<{
      rowNumber: number;
      data: T;
      error: ApiError;
    }>;
    statistics: {
      totalRows: number;
      processedRows: number;
      createdCount: number;
      updatedCount: number;
      failedCount: number;
      skippedCount: number;
    };
  };
}

/**
 * 状态查询响应
 */
export interface StatusResponse {
  /** 服务状态 */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** 服务版本 */
  version: string;
  /** 运行时间 */
  uptime: number;
  /** 系统信息 */
  system?: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      load: number[];
    };
    disk: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  /** 依赖服务状态 */
  dependencies?: Array<{
    name: string;
    status: 'up' | 'down' | 'unknown';
    responseTime?: number;
    lastCheck: string;
  }>;
}

/**
 * 统计查询请求
 */
export interface StatisticsRequest {
  /** 统计时间范围 */
  dateRange: {
    start: string;
    end: string;
  };
  /** 分组维度 */
  groupBy?: string[];
  /** 统计指标 */
  metrics?: string[];
  /** 过滤条件 */
  filters?: FilterDto;
  /** 粒度 */
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'year';
}

/**
 * 统计查询响应
 */
export interface StatisticsResponse {
  /** 统计结果 */
  data: Array<{
    period: string;
    metrics: Record<string, number>;
    breakdown?: Record<string, Record<string, number>>;
  }>;
  /** 汇总信息 */
  summary: {
    total: Record<string, number>;
    average: Record<string, number>;
    growth: Record<string, {
      value: number;
      percentage: number;
      direction: 'up' | 'down' | 'stable';
    }>;
  };
  /** 元数据 */
  metadata: {
    period: { start: string; end: string };
    granularity: string;
    calculatedAt: string;
  };
}

/**
 * 操作日志请求
 */
export interface AuditLogRequest extends PaginationDto {
  /** 实体类型 */
  entityType?: string;
  /** 实体ID */
  entityId?: string;
  /** 操作类型 */
  operationType?: string[];
  /** 操作者 */
  userId?: string;
  /** 时间范围 */
  dateRange?: {
    start: string;
    end: string;
  };
  /** 包含详细信息 */
  includeDetails?: boolean;
}

/**
 * 操作日志响应
 */
export interface AuditLogResponse {
  /** 日志记录 */
  logs: Array<{
    id: string;
    entityType: string;
    entityId: string;
    operationType: string;
    userId: string;
    userName: string;
    timestamp: string;
    details?: {
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
      changes?: Array<{
        field: string;
        oldValue: any;
        newValue: any;
      }>;
    };
    metadata?: Record<string, any>;
  }>;
  /** 分页信息 */
  pagination: PaginationMeta;
}