/**
 * 报表数据源配置类型定义
 * 用于指定报表模板的数据来源和跨表查询配置
 */

export interface DataSourceConfig {
  /** 数据源类型 */
  type: 'table' | 'view' | 'query' | 'aggregation';
  
  /** 主数据源（表名或视图名） */
  primary_source: string;
  
  /** 关联数据源配置 */
  joins?: JoinConfig[];
  
  /** 自定义查询（用于复杂场景） */
  custom_query?: string;
  
  /** 数据过滤条件 */
  filters?: FilterConfig[];
  
  /** 排序规则 */
  order_by?: OrderConfig[];
  
  /** 分组配置（用于聚合报表） */
  group_by?: string[];
  
  /** 聚合字段配置 */
  aggregations?: AggregationConfig[];
}

export interface JoinConfig {
  /** 关联表/视图名称 */
  table: string;
  
  /** 关联类型 */
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  
  /** 关联条件 */
  on: string;
  
  /** 别名 */
  alias?: string;
}

export interface FilterConfig {
  /** 字段名 */
  field: string;
  
  /** 操作符 */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like' | 'between';
  
  /** 值 */
  value: any;
  
  /** 逻辑连接符 */
  logical?: 'AND' | 'OR';
}

export interface OrderConfig {
  /** 字段名 */
  field: string;
  
  /** 排序方向 */
  direction: 'ASC' | 'DESC';
}

export interface AggregationConfig {
  /** 字段名 */
  field: string;
  
  /** 聚合函数 */
  function: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  
  /** 别名 */
  alias?: string;
}

/** 增强的报表模板接口 */
export interface EnhancedReportTemplate {
  id: string;
  template_name: string;
  description?: string;
  category: string;
  
  /** 数据源配置 - 新增 */
  data_source: DataSourceConfig;
  
  /** 字段映射（基于数据源字段） */
  field_mappings: FieldMapping[];
  
  output_formats: string[];
  is_active: boolean;
  is_scheduled: boolean;
  schedule_config?: any;
  created_at: string;
  updated_at: string;
}

export interface FieldMapping {
  field_key: string;
  display_name: string;
  field_type: 'string' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean';
  visible: boolean;
  sort_order: number;
  
  /** 数据源字段映射 - 新增 */
  source_field?: string;
  source_table?: string;
  
  /** 格式化配置 */
  format_config?: {
    decimal_places?: number;
    date_format?: string;
    currency_symbol?: string;
  };
}

/** 预定义数据源配置 */
export const PREDEFINED_DATA_SOURCES: Record<string, DataSourceConfig> = {
  // 薪资汇总报表
  payroll_summary: {
    type: 'view',
    primary_source: 'view_payroll_summary',
    filters: [],
    order_by: [
      { field: 'pay_month', direction: 'DESC' },
      { field: 'employee_name', direction: 'ASC' }
    ]
  },
  
  // 薪资详细报表（支持跨表）
  payroll_detailed: {
    type: 'view',
    primary_source: 'view_payroll_unified',
    joins: [
      {
        table: 'employees',
        type: 'LEFT',
        on: 'view_payroll_unified.employee_id = employees.employee_id',
        alias: 'emp'
      },
      {
        table: 'departments',
        type: 'LEFT', 
        on: 'employees.department_id = departments.department_id',
        alias: 'dept'
      }
    ],
    order_by: [
      { field: 'pay_month', direction: 'DESC' },
      { field: 'employee_name', direction: 'ASC' },
      { field: 'item_order', direction: 'ASC' }
    ]
  },
  
  // 部门统计报表（聚合查询）
  department_stats: {
    type: 'aggregation',
    primary_source: 'view_payroll_summary',
    joins: [
      {
        table: 'departments',
        type: 'LEFT',
        on: 'view_payroll_summary.department_id = departments.department_id',
        alias: 'd'
      }
    ],
    group_by: ['department_name', 'pay_month'],
    aggregations: [
      { field: 'gross_pay', function: 'SUM', alias: 'total_gross_pay' },
      { field: 'net_pay', function: 'SUM', alias: 'total_net_pay' },
      { field: 'employee_id', function: 'COUNT', alias: 'employee_count' },
      { field: 'gross_pay', function: 'AVG', alias: 'avg_gross_pay' }
    ],
    order_by: [
      { field: 'pay_month', direction: 'DESC' },
      { field: 'total_gross_pay', direction: 'DESC' }
    ]
  },
  
  // 员工基本信息报表
  employee_basic: {
    type: 'table',
    primary_source: 'employees',
    joins: [
      {
        table: 'departments',
        type: 'LEFT',
        on: 'employees.department_id = departments.department_id',
        alias: 'd'
      },
      {
        table: 'positions',
        type: 'LEFT',
        on: 'employees.position_id = positions.position_id',
        alias: 'p'
      },
      {
        table: 'personnel_categories',
        type: 'LEFT',
        on: 'employees.category_id = personnel_categories.category_id',
        alias: 'pc'
      }
    ],
    filters: [
      { field: 'employees.is_active', operator: 'eq', value: true }
    ],
    order_by: [
      { field: 'department_name', direction: 'ASC' },
      { field: 'employee_name', direction: 'ASC' }
    ]
  }
};