/**
 * DTO基础接口
 * 
 * 定义所有DTO的通用结构和规范
 */

/**
 * 基础DTO接口
 */
export interface BaseDto {
  /** 实体ID */
  id?: string;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
}

/**
 * 分页查询DTO
 */
export interface PaginationDto {
  /** 页码（从1开始） */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应DTO
 */
export interface PaginatedResponseDto<T> {
  /** 数据列表 */
  data: T[];
  /** 分页信息 */
  pagination: {
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
  };
}

/**
 * 查询过滤DTO基础接口
 */
export interface FilterDto {
  /** 搜索关键词 */
  search?: string;
  /** 状态过滤 */
  status?: string[];
  /** 日期范围过滤 */
  dateRange?: {
    start?: string;
    end?: string;
  };
}

/**
 * API响应包装DTO
 */
export interface ApiResponseDto<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  /** 元数据 */
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

/**
 * 批量操作请求DTO
 */
export interface BatchRequestDto<T> {
  /** 操作类型 */
  operation: 'create' | 'update' | 'delete';
  /** 操作数据 */
  items: T[];
  /** 批量选项 */
  options?: {
    /** 是否继续执行（即使有错误） */
    continueOnError?: boolean;
    /** 是否事务性操作 */
    transactional?: boolean;
  };
}

/**
 * 批量操作响应DTO
 */
export interface BatchResponseDto<T> {
  /** 成功项 */
  success: T[];
  /** 失败项 */
  failures: Array<{
    item: T;
    error: string;
    index: number;
  }>;
  /** 统计信息 */
  statistics: {
    total: number;
    successCount: number;
    failureCount: number;
  };
}

/**
 * 验证结果DTO
 */
export interface ValidationResultDto {
  /** 是否有效 */
  isValid: boolean;
  /** 错误信息 */
  errors: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
  /** 警告信息 */
  warnings?: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
}

/**
 * 审计信息DTO
 */
export interface AuditInfoDto {
  /** 创建者ID */
  createdBy?: string;
  /** 创建者姓名 */
  createdByName?: string;
  /** 创建时间 */
  createdAt?: string;
  /** 最后修改者ID */
  lastModifiedBy?: string;
  /** 最后修改者姓名 */
  lastModifiedByName?: string;
  /** 最后修改时间 */
  lastModifiedAt?: string;
  /** 版本号 */
  version?: number;
}

/**
 * 统计信息DTO
 */
export interface StatisticsDto {
  /** 指标名称 */
  name: string;
  /** 指标值 */
  value: number;
  /** 单位 */
  unit?: string;
  /** 描述 */
  description?: string;
  /** 同比变化 */
  changeFromPrevious?: {
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  };
}

/**
 * 导出配置DTO
 */
export interface ExportConfigDto {
  /** 导出格式 */
  format: 'excel' | 'csv' | 'pdf';
  /** 包含的字段 */
  fields?: string[];
  /** 过滤条件 */
  filters?: FilterDto;
  /** 文件名 */
  filename?: string;
  /** 导出选项 */
  options?: {
    includeHeaders?: boolean;
    dateFormat?: string;
    numberFormat?: string;
  };
}

/**
 * 导入配置DTO
 */
export interface ImportConfigDto {
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
  };
}

/**
 * 选项DTO（用于下拉框等）
 */
export interface OptionDto {
  /** 选项值 */
  value: string;
  /** 显示标签 */
  label: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 描述 */
  description?: string;
  /** 分组 */
  group?: string;
}

/**
 * 树形结构DTO
 */
export interface TreeNodeDto {
  /** 节点ID */
  id: string;
  /** 父节点ID */
  parentId?: string;
  /** 节点标签 */
  label: string;
  /** 子节点 */
  children?: TreeNodeDto[];
  /** 是否展开 */
  expanded?: boolean;
  /** 是否选中 */
  selected?: boolean;
  /** 节点数据 */
  data?: any;
}