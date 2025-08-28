import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// 数据源类型
export interface DatabaseObject {
  name: string;
  type: 'table' | 'view';
  schema: string;
  comment?: string;
  columns?: ColumnInfo[];
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default?: string;
  character_maximum_length?: number;
}

// 获取数据库中所有的表和视图
export const useDataSources = () => {
  return useQuery({
    queryKey: ['database', 'data-sources'],
    queryFn: async (): Promise<DatabaseObject[]> => {
      try {
        // 暂时直接返回预定义的数据源，避免复杂的数据库调用
        // 未来可以通过数据库函数获取真实的表和视图信息
        return getDefaultDataSources();
      } catch (error) {
        console.error('Failed to fetch data sources:', error);
        return getDefaultDataSources();
      }
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
};

// 获取指定表/视图的列信息
export const useTableColumns = (tableName: string, enabled = true) => {
  return useQuery({
    queryKey: ['database', 'columns', tableName],
    queryFn: async (): Promise<ColumnInfo[]> => {
      try {
        // 暂时返回模拟的列信息，避免数据库调用问题
        // 未来可以通过实际的数据库查询获取列信息
        return getMockColumns(tableName);
      } catch (error) {
        console.error(`Failed to fetch columns for ${tableName}:`, error);
        return [];
      }
    },
    enabled: enabled && !!tableName,
    staleTime: 10 * 60 * 1000, // 10分钟缓存
  });
};

// 预定义的数据源（降级方案）
function getDefaultDataSources(): DatabaseObject[] {
  return [
    {
      name: 'view_payroll_summary',
      type: 'view',
      schema: 'public',
      comment: '薪资汇总视图 - 适用于列表展示和基本统计'
    },
    {
      name: 'view_payroll_unified',
      type: 'view',
      schema: 'public',
      comment: '薪资明细视图 - 包含所有薪资项目详情'
    },
    {
      name: 'view_payroll_trend_unified',
      type: 'view',
      schema: 'public',
      comment: '薪资趋势视图 - 用于统计分析和趋势报表'
    },
    {
      name: 'employees',
      type: 'table',
      schema: 'public',
      comment: '员工基本信息表'
    },
    {
      name: 'departments',
      type: 'table',
      schema: 'public',
      comment: '部门信息表'
    },
    {
      name: 'positions',
      type: 'table',
      schema: 'public',
      comment: '职位信息表'
    },
    {
      name: 'payrolls',
      type: 'table',
      schema: 'public',
      comment: '薪资记录表'
    },
    {
      name: 'payroll_items',
      type: 'table',
      schema: 'public',
      comment: '薪资明细项目表'
    },
    {
      name: 'salary_components',
      type: 'table',
      schema: 'public',
      comment: '薪资组件配置表'
    }
  ];
}

// 根据数据源名称推荐字段配置
export const getRecommendedFields = (dataSourceName: string): string[] => {
  const fieldMappings: Record<string, string[]> = {
    'view_payroll_summary': [
      'employee_name', 'department_name', 'position_name', 
      'gross_pay', 'total_deductions', 'net_pay', 'pay_month'
    ],
    'view_payroll_unified': [
      'employee_name', 'department_name', 'item_name', 
      'amount', 'item_type', 'pay_month'
    ],
    'view_payroll_trend_unified': [
      'employee_name', 'department_name', 'pay_month', 
      'gross_pay', 'net_pay', 'is_current_month'
    ],
    'employees': [
      'employee_name', 'employee_code', 'department_name', 
      'position_name', 'category_name', 'hire_date'
    ],
    'departments': [
      'department_name', 'parent_department_name', 
      'department_level', 'is_active'
    ],
    'payrolls': [
      'employee_name', 'pay_month', 'gross_pay', 
      'total_deductions', 'net_pay', 'status'
    ]
  };

  return fieldMappings[dataSourceName] || [
    'id', 'name', 'created_at', 'updated_at'
  ];
};

// 模拟的列信息函数
function getMockColumns(tableName: string): ColumnInfo[] {
  const columnMappings: Record<string, ColumnInfo[]> = {
    'view_payroll_summary': [
      { column_name: 'payroll_id', data_type: 'uuid', is_nullable: false },
      { column_name: 'employee_name', data_type: 'text', is_nullable: false },
      { column_name: 'department_name', data_type: 'text', is_nullable: true },
      { column_name: 'position_name', data_type: 'text', is_nullable: true },
      { column_name: 'gross_pay', data_type: 'numeric', is_nullable: true },
      { column_name: 'total_deductions', data_type: 'numeric', is_nullable: true },
      { column_name: 'net_pay', data_type: 'numeric', is_nullable: true },
      { column_name: 'pay_month', data_type: 'text', is_nullable: false },
    ],
    'view_payroll_unified': [
      { column_name: 'payroll_id', data_type: 'uuid', is_nullable: false },
      { column_name: 'employee_name', data_type: 'text', is_nullable: false },
      { column_name: 'item_name', data_type: 'text', is_nullable: false },
      { column_name: 'amount', data_type: 'numeric', is_nullable: true },
      { column_name: 'item_type', data_type: 'text', is_nullable: false },
      { column_name: 'pay_month', data_type: 'text', is_nullable: false },
    ],
    'employees': [
      { column_name: 'employee_id', data_type: 'uuid', is_nullable: false },
      { column_name: 'employee_name', data_type: 'text', is_nullable: false },
      { column_name: 'employee_code', data_type: 'text', is_nullable: true },
      { column_name: 'hire_date', data_type: 'date', is_nullable: true },
      { column_name: 'is_active', data_type: 'boolean', is_nullable: false },
    ]
  };

  return columnMappings[tableName] || [
    { column_name: 'id', data_type: 'uuid', is_nullable: false },
    { column_name: 'name', data_type: 'text', is_nullable: false },
    { column_name: 'created_at', data_type: 'timestamp', is_nullable: false },
    { column_name: 'updated_at', data_type: 'timestamp', is_nullable: false },
  ];
}

// 获取数据源的推荐分类
export const getDataSourceCategory = (dataSourceName: string): string => {
  if (dataSourceName.includes('payroll')) return 'payroll';
  if (dataSourceName.includes('employee')) return 'employee';
  if (dataSourceName.includes('department')) return 'department';
  if (dataSourceName.includes('position')) return 'employee';
  return 'statistics';
};

// ====================
// 新增：真实数据源发现功能
// ====================

// 新的数据源接口
export interface DataSourceEnhanced {
  schema_name: string;
  table_name: string;
  table_type: 'table' | 'view';
  description: string;
  display_name?: string;
  category?: string;
  record_count?: number;
}

// 增强的字段信息接口
export interface ColumnInfoEnhanced extends ColumnInfo {
  display_name?: string;
  category?: string;
  description?: string;
  is_key?: boolean;
}

// 真实数据源发现hook（增强版）
export const useDataSourcesEnhanced = (options?: {
  schema?: string;
  type?: 'table' | 'view' | 'all';
  category?: string;
  enableRealQuery?: boolean;
}) => {
  return useQuery({
    queryKey: ['database', 'data-sources-enhanced', options],
    queryFn: async (): Promise<DataSourceEnhanced[]> => {
      // 默认启用真实查询，除非明确禁用
      if (options?.enableRealQuery ?? true) {
        try {
          return await getRealDataSources(options);
        } catch (error) {
          console.error('Real data source query failed:', error);
          return getEnhancedDefaultDataSources();
        }
      }
      return getEnhancedDefaultDataSources();
    },
    staleTime: 5 * 60 * 1000,
  });
};

// 真实数据库查询函数
async function getRealDataSources(options?: {
  schema?: string;
  type?: 'table' | 'view' | 'all';
}): Promise<DataSourceEnhanced[]> {
  try {
    // 注意：Supabase 不允许直接查询 information_schema
    // 我们改用预定义数据源列表并验证其有效性
    
    // 改用 rpc 调用或直接查询的方式
    // 由于 Supabase 限制直接访问 information_schema，我们使用预定义的数据源列表
    // 但增加真实性检验：查询实际存在的表
    const realSources: DataSourceEnhanced[] = [];
    
    // 首先获取我们已知的重要数据源
    const candidateSources = getEnhancedDefaultDataSources();
    
    // 验证这些数据源是否真实存在（通过尝试查询少量数据）
    for (const source of candidateSources) {
      try {
        const { data, error } = await supabase
          .from(source.table_name as any)
          .select('*')
          .limit(1);
        
        if (!error) {
          // 数据源存在，获取记录数量
          const { count } = await supabase
            .from(source.table_name as any)
            .select('*', { count: 'exact', head: true });
          
          realSources.push({
            ...source,
            record_count: count || 0
          });
        }
      } catch (sourceError) {
        console.warn(`数据源 ${source.table_name} 不可访问:`, sourceError);
        // 仍然包含在列表中，但标记为无记录
        realSources.push({
          ...source,
          record_count: 0,
          description: `${source.description} (可能无访问权限)`
        });
      }
    }
    
    // 根据选项进行过滤
    let filtered = realSources;
    if (options?.type && options.type !== 'all') {
      filtered = filtered.filter(ds => ds.table_type === options.type);
    }
    if (options?.schema) {
      filtered = filtered.filter(ds => ds.schema_name === options.schema);
    }
    
    return filtered;
  } catch (error) {
    console.error('查询真实数据源失败:', error);
    return getEnhancedDefaultDataSources();
  }
}

// 增强的字段查询hook
export const useTableColumnsEnhanced = (tableName?: string, enabled = true) => {
  return useQuery({
    queryKey: ['database', 'columns-enhanced', tableName],
    queryFn: async (): Promise<ColumnInfoEnhanced[]> => {
      if (!tableName) return [];

      try {
        // 尝试通过查询表数据来推断字段结构
        const { data: sampleData, error } = await supabase
          .from(tableName as any)
          .select('*')
          .limit(1);

        if (error) {
          console.warn(`无法访问表 ${tableName}:`, error.message);
          return getMockColumnsEnhanced(tableName);
        }

        // 从样本数据推断字段信息
        if (sampleData && sampleData.length > 0) {
          const sampleRow = sampleData[0] as Record<string, any>;
          const realColumns: ColumnInfoEnhanced[] = Object.keys(sampleRow).map((columnName, index) => {
            const value = sampleRow[columnName];
            let dataType = 'text';
            
            // 根据值类型推断数据类型
            if (value === null) {
              dataType = 'text'; // 默认
            } else if (typeof value === 'number') {
              dataType = Number.isInteger(value) ? 'integer' : 'numeric';
            } else if (typeof value === 'boolean') {
              dataType = 'boolean';
            } else if (value instanceof Date || (typeof value === 'string' && isValidDate(value))) {
              dataType = 'timestamp';
            } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
              dataType = 'date';
            } else {
              dataType = 'text';
            }

            return {
              column_name: columnName,
              data_type: dataType,
              is_nullable: value === null,
              display_name: getFieldDisplayName(columnName),
              category: getFieldCategory(columnName, dataType),
              description: getFieldDescription(columnName),
              is_key: isKeyField(columnName)
            };
          });

          return realColumns;
        }

        // 如果没有数据，返回预设的列信息
        return getMockColumnsEnhanced(tableName);
      } catch (error) {
        console.error(`获取字段信息失败:`, error);
        return getMockColumnsEnhanced(tableName);
      }
    },
    enabled: enabled && !!tableName,
    staleTime: 10 * 60 * 1000,
  });
};

// 增强的默认数据源
function getEnhancedDefaultDataSources(): DataSourceEnhanced[] {
  return [
    // 核心薪资视图
    {
      schema_name: 'public',
      table_name: 'view_payroll_summary',
      table_type: 'view',
      description: '薪资汇总视图 - 适用于列表展示和基本统计',
      display_name: '薪资汇总视图',
      category: '薪资管理'
    },
    {
      schema_name: 'public',
      table_name: 'view_payroll_unified',
      table_type: 'view',
      description: '薪资明细视图 - 包含所有薪资项目详情',
      display_name: '薪资明细视图',
      category: '薪资管理'
    },
    {
      schema_name: 'public',
      table_name: 'view_payroll_trend_unified',
      table_type: 'view',
      description: '薪资趋势视图 - 用于统计分析和趋势报表',
      display_name: '薪资趋势视图',
      category: '薪资管理'
    },
    
    // 核心数据表
    {
      schema_name: 'public',
      table_name: 'employees',
      table_type: 'table',
      description: '员工基本信息表',
      display_name: '员工基础信息',
      category: '员工管理'
    },
    {
      schema_name: 'public',
      table_name: 'employee_job_history',
      table_type: 'table',
      description: '员工职务历史记录',
      display_name: '员工职务历史',
      category: '员工管理'
    },
    {
      schema_name: 'public',
      table_name: 'departments',
      table_type: 'table',
      description: '部门信息表',
      display_name: '部门信息',
      category: '部门管理'
    },
    {
      schema_name: 'public',
      table_name: 'positions',
      table_type: 'table',
      description: '职位信息表',
      display_name: '职位信息',
      category: '职位管理'
    },
    {
      schema_name: 'public',
      table_name: 'employee_categories',
      table_type: 'table',
      description: '员工类别表',
      display_name: '员工类别',
      category: '员工管理'
    },
    
    // 薪资相关表
    {
      schema_name: 'public',
      table_name: 'payrolls',
      table_type: 'table',
      description: '薪资记录表',
      display_name: '薪资记录',
      category: '薪资管理'
    },
    {
      schema_name: 'public',
      table_name: 'payroll_items',
      table_type: 'table',
      description: '薪资明细项目表',
      display_name: '薪资明细项目',
      category: '薪资管理'
    },
    {
      schema_name: 'public',
      table_name: 'salary_components',
      table_type: 'table',
      description: '薪资组件配置表',
      display_name: '薪资组件配置',
      category: '薪资管理'
    },
    {
      schema_name: 'public',
      table_name: 'payroll_periods',
      table_type: 'table',
      description: '薪资期间管理表',
      display_name: '薪资期间管理',
      category: '薪资管理'
    }
  ];
}

// 工具函数：获取显示名称
function getDisplayName(tableName: string): string {
  const displayNames: Record<string, string> = {
    'view_payroll_summary': '薪资汇总视图',
    'view_payroll_unified': '薪资明细视图',
    'view_employees_active': '在职员工视图',
    'view_department_hierarchy': '部门层级视图',
    'employees': '员工基础信息',
    'departments': '部门信息',
    'positions': '职位信息',
    'payrolls': '薪资记录',
    'payroll_periods': '薪资周期',
  };
  return displayNames[tableName] || tableName;
}

// 工具函数：获取表分类
function getCategoryFromTableName(tableName: string): string {
  if (tableName.includes('payroll')) return '薪资管理';
  if (tableName.includes('employee')) return '员工管理';
  if (tableName.includes('department')) return '部门管理';
  if (tableName.includes('position')) return '职位管理';
  if (tableName.includes('insurance')) return '保险管理';
  if (tableName.includes('report')) return '报表管理';
  return '其他';
}

// 工具函数：获取字段显示名称
function getFieldDisplayName(fieldName: string): string {
  const fieldNames: Record<string, string> = {
    'employee_name': '员工姓名',
    'full_name': '员工姓名',
    'department_name': '部门名称',
    'position_name': '职位名称',
    'gross_pay': '应发工资',
    'net_pay': '实发工资',
    'period_name': '薪资周期',
    'created_at': '创建时间',
    'updated_at': '更新时间',
  };
  return fieldNames[fieldName] || fieldName;
}

// 工具函数：获取字段分类
function getFieldCategory(fieldName: string, dataType: string): string {
  if (fieldName.includes('name') || fieldName.includes('title')) return '基础信息';
  if (fieldName.includes('pay') || fieldName.includes('salary')) return '薪资字段';
  if (fieldName.includes('date') || fieldName.includes('time')) return '时间字段';
  if (fieldName.includes('id')) return '标识字段';
  return '其他字段';
}

// 工具函数：获取字段描述
function getFieldDescription(fieldName: string): string {
  const descriptions: Record<string, string> = {
    'employee_name': '员工的完整姓名',
    'gross_pay': '税前应发工资总额',
    'net_pay': '扣除税费后的实际发放金额',
    'period_name': '薪资发放周期标识',
  };
  return descriptions[fieldName] || '';
}

// 工具函数：判断是否为关键字段
function isKeyField(fieldName: string): boolean {
  const keyFields = ['employee_name', 'full_name', 'gross_pay', 'net_pay', 'department_name'];
  return keyFields.includes(fieldName);
}

// 工具函数：验证日期格式
function isValidDate(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  // 检查常见的日期时间格式
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO 8601
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/, // PostgreSQL timestamp
    /^\d{4}-\d{2}-\d{2}$/ // Date only
  ];
  
  return datePatterns.some(pattern => pattern.test(value)) && !isNaN(Date.parse(value));
}

// 增强的模拟字段数据
function getMockColumnsEnhanced(tableName: string): ColumnInfoEnhanced[] {
  const mockColumns = getMockColumns(tableName);
  return mockColumns.map(col => ({
    ...col,
    display_name: getFieldDisplayName(col.column_name),
    category: getFieldCategory(col.column_name, col.data_type),
    description: getFieldDescription(col.column_name),
    is_key: isKeyField(col.column_name)
  }));
}