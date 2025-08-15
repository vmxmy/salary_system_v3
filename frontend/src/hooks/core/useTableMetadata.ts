import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// 表列元数据接口
export interface TableColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'currency' | 'email' | 'phone';
  label: string;
  nullable: boolean;
  defaultValue?: any;
  isSystemColumn?: boolean;
}

// 表元数据接口
export interface TableMetadata {
  tableName: string;
  displayName: string;
  columns: TableColumn[];
}

// PostgreSQL 类型到 UI 类型的映射
function mapPostgresTypeToUIType(pgType: string): TableColumn['type'] {
  const typeMap: Record<string, TableColumn['type']> = {
    'text': 'text',
    'varchar': 'text', 
    'character varying': 'text',
    'char': 'text',
    'character': 'text',
    'integer': 'number',
    'bigint': 'number',
    'smallint': 'number',
    'numeric': 'number',
    'decimal': 'number',
    'real': 'number',
    'double precision': 'number',
    'money': 'currency',
    'date': 'date',
    'timestamp': 'datetime',
    'timestamptz': 'datetime',
    'timestamp with time zone': 'datetime',
    'timestamp without time zone': 'datetime',
    'boolean': 'boolean',
    'bool': 'boolean',
  };

  const baseType = pgType.toLowerCase().replace(/\(\d+\)/, ''); // 移除长度限制如 varchar(255)
  return typeMap[baseType] || 'text';
}

// 智能标签生成
function generateLabel(columnName: string): string {
  const labelMap: Record<string, string> = {
    // 员工相关
    'employee_id': '员工ID',
    'employee_name': '员工姓名',
    'full_name': '姓名',
    'id_number': '身份证号',
    'phone': '电话',
    'email': '邮箱',
    'hire_date': '入职日期',
    'birth_date': '出生日期',
    'gender': '性别',
    'status': '状态',
    'is_active': '是否激活',
    
    // 部门相关
    'department_id': '部门ID',
    'department_name': '部门名称',
    'department_code': '部门编码',
    'parent_department_id': '上级部门',
    'manager_id': '部门负责人',
    
    // 职位相关
    'position_id': '职位ID',
    'position_name': '职位名称',
    'position_title': '职位标题',
    'position_level': '职位级别',
    
    // 薪资相关
    'payroll_id': '薪资ID',
    'gross_pay': '应发工资',
    'net_pay': '实发工资',
    'base_salary': '基本工资',
    'total_deductions': '总扣除',
    'pay_date': '发薪日期',
    'pay_period_start': '薪资周期开始',
    'pay_period_end': '薪资周期结束',
    'pay_month': '发薪月份',
    'pay_year': '发薪年份',
    
    // 人员类别相关
    'category_id': '类别ID', 
    'category_name': '人员类别',
    'personnel_category_name': '人员类别',
    
    // 系统字段
    'created_at': '创建时间',
    'updated_at': '更新时间',
    'created_by': '创建人',
    'updated_by': '更新人',
    'id': 'ID',
    'uuid': 'UUID',
  };
  
  // 如果有直接映射，返回
  if (labelMap[columnName]) {
    return labelMap[columnName];
  }
  
  // 智能转换：employee_name -> Employee Name -> 员工姓名
  return columnName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// 判断是否为系统列
function isSystemColumn(columnName: string): boolean {
  const systemColumns = [
    'id', 'uuid', 'created_at', 'updated_at', 'created_by', 'updated_by',
    'deleted_at', 'deleted_by', 'version', 'row_version'
  ];
  return systemColumns.includes(columnName);
}

// 生成表显示名称
function generateDisplayName(tableName: string): string {
  const displayNameMap: Record<string, string> = {
    'employees': '员工管理',
    'view_employees_with_details': '员工详情',
    'departments': '部门管理', 
    'positions': '职位管理',
    'personnel_categories': '人员类别',
    'payroll': '薪资管理',
    'view_payroll_summary': '薪资汇总',
    'view_payroll_unified': '薪资详情',
  };
  
  return displayNameMap[tableName] || tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * 动态获取表元数据的 Hook
 * @param tableName 表名或视图名
 * @returns 表元数据查询结果
 */
export function useTableMetadata(tableName: string) {
  return useQuery({
    queryKey: ['table-metadata', tableName],
    queryFn: async (): Promise<TableMetadata> => {
      try {
        // 尝试使用 RPC 函数获取表结构
        const { data, error } = await supabase.rpc('get_table_columns', { 
          table_name_param: tableName,
          schema_name_param: 'public'
        });

        if (error) {
          console.warn('RPC function failed, using fallback method:', error);
          throw error;
        }

        if (!data || data.length === 0) {
          throw new Error(`No columns found for table: ${tableName}`);
        }

        // 转换为统一的元数据格式
        const columns: TableColumn[] = data.map((col: any) => ({
          name: col.column_name,
          type: mapPostgresTypeToUIType(col.data_type),
          label: generateLabel(col.column_name),
          nullable: col.is_nullable === 'YES',
          defaultValue: col.column_default,
          isSystemColumn: isSystemColumn(col.column_name),
        }));

        return {
          tableName,
          displayName: generateDisplayName(tableName),
          columns,
        };

      } catch (error) {
        console.error(`Failed to fetch metadata for table ${tableName}:`, error);
        
        // 返回基础的错误恢复元数据
        return {
          tableName,
          displayName: generateDisplayName(tableName),
          columns: [],
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    retry: 1,
  });
}

/**
 * 查询键工厂
 */
export const tableMetadataKeys = {
  all: ['table-metadata'] as const,
  table: (tableName: string) => [...tableMetadataKeys.all, tableName] as const,
};