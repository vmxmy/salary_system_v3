import { useMemo } from 'react';
import { formatCurrency } from '@/lib/format';
import type { FieldMetadata } from '@/components/common/FieldSelector';

export interface PayrollColumnConfig {
  id: string;
  accessorKey: string;
  header: string;
  size?: number;
  type: 'text' | 'currency' | 'date' | 'status' | 'id' | 'timestamp';
  required?: boolean;
  defaultVisible?: boolean;
  defaultOrder?: number;
  description?: string;
  cell?: (getValue: () => any) => React.ReactNode;
  enableSorting?: boolean;
  enableColumnFilter?: boolean;
  useBadge?: boolean; // 是否使用徽章样式
}

export type PayrollStatusType = 'draft' | 'calculating' | 'calculated' | 'approved' | 'paid' | 'cancelled';

/**
 * 动态生成薪资表格列配置
 * 基于数据库视图 view_payroll_summary 的完整字段列表
 */
export const usePayrollTableColumns = () => {
  // 完整的薪资字段配置 - 基于数据库schema
  const allColumnConfigs: PayrollColumnConfig[] = useMemo(() => [
    // 核心字段 - 默认显示
    {
      id: 'employee_name',
      accessorKey: 'employee_name',
      header: '员工姓名',
      type: 'text',
      required: true,
      defaultVisible: true,
      defaultOrder: 1,
      description: '员工的全名',
      size: 120,
      cell: (getValue) => {
        const value = getValue();
        return value || '-';
      }
    },
    {
      id: 'id_number',
      accessorKey: 'id_number',
      header: '身份证号',
      type: 'text',
      defaultVisible: false, // 默认隐藏敏感信息
      defaultOrder: 2,
      description: '员工身份证号码',
      size: 140,
      cell: (getValue) => {
        const value = getValue();
        if (!value) return '-';
        // 脱敏显示：显示前4位和后4位
        return value.length > 8 ? 
          `${value.slice(0, 4)}****${value.slice(-4)}` : 
          value;
      }
    },
    {
      id: 'department_name',
      accessorKey: 'department_name', 
      header: '部门',
      type: 'text',
      defaultVisible: true,
      defaultOrder: 3,
      description: '员工所属部门',
      size: 100,
      cell: (getValue) => {
        const value = getValue();
        return value || '-';
      }
    },
    {
      id: 'position_name',
      accessorKey: 'position_name',
      header: '职位',
      type: 'text',
      defaultVisible: true,
      defaultOrder: 4,
      description: '员工职位信息',
      size: 100,
      cell: (getValue) => {
        const value = getValue();
        return value || '-';
      }
    },
    {
      id: 'category_name',
      accessorKey: 'category_name',
      header: '身份类别',
      type: 'text',
      defaultVisible: true,
      defaultOrder: 5,
      description: '员工身份类别（如公务员、事业编制等）',
      size: 120,
      cell: (getValue) => {
        const value = getValue();
        return value || '-';
      }
    },
    
    // 薪资期间字段
    {
      id: 'period_code',
      accessorKey: 'period_code',
      header: '期间代码',
      type: 'text',
      defaultVisible: false,
      defaultOrder: 6,
      description: '薪资期间编码',
      size: 100
    },
    {
      id: 'period_name',
      accessorKey: 'period_name',
      header: '期间名称',
      type: 'text',
      defaultVisible: false,
      defaultOrder: 7,
      description: '薪资期间名称',
      size: 120
    },
    {
      id: 'period_start',
      accessorKey: 'period_start',
      header: '期间开始',
      type: 'date',
      defaultVisible: false,
      defaultOrder: 8,
      description: '薪资期间开始日期',
      size: 120,
      cell: (getValue) => {
        const value = getValue();
        if (!value) return '-';
        return new Date(value).toLocaleDateString('zh-CN');
      }
    },
    {
      id: 'period_end',
      accessorKey: 'period_end',
      header: '期间结束',
      type: 'date',
      defaultVisible: false,
      defaultOrder: 9,
      description: '薪资期间结束日期',
      size: 120,
      cell: (getValue) => {
        const value = getValue();
        if (!value) return '-';
        return new Date(value).toLocaleDateString('zh-CN');
      }
    },
    {
      id: 'scheduled_pay_date',
      accessorKey: 'scheduled_pay_date',
      header: '计划发薪日',
      type: 'date',
      defaultVisible: false,
      defaultOrder: 10,
      description: '计划的薪资发放日期',
      size: 120,
      cell: (getValue) => {
        const value = getValue();
        if (!value) return '-';
        return new Date(value).toLocaleDateString('zh-CN');
      }
    },
    {
      id: 'actual_pay_date',
      accessorKey: 'actual_pay_date',
      header: '实际发薪日',
      type: 'date',
      defaultVisible: true,
      defaultOrder: 11,
      description: '实际的薪资发放日期',
      size: 120,
      cell: (getValue) => {
        const value = getValue();
        if (!value) return '-';
        return new Date(value).toLocaleDateString('zh-CN');
      }
    },
    
    // 薪资金额字段 - 重点显示
    {
      id: 'gross_pay',
      accessorKey: 'gross_pay',
      header: '应发工资',
      type: 'currency',
      defaultVisible: true,
      defaultOrder: 12,
      description: '扣除前的总工资',
      size: 100,
      cell: (getValue) => {
        const value = getValue();
        if (value == null) return '-';
        return formatCurrency(value);
      }
    },
    {
      id: 'total_deductions',
      accessorKey: 'total_deductions',
      header: '扣除合计',
      type: 'currency',
      defaultVisible: true,
      defaultOrder: 13,
      description: '所有扣除项目的总和',
      size: 100,
      cell: (getValue) => {
        const value = getValue();
        if (value == null) return '-';
        return formatCurrency(value);
      }
    },
    {
      id: 'net_pay',
      accessorKey: 'net_pay',
      header: '实发工资',
      type: 'currency',
      defaultVisible: true,
      defaultOrder: 14,
      description: '扣除后的实际发放工资',
      size: 100,
      cell: (getValue) => {
        const value = getValue();
        if (value == null) return '-';
        return formatCurrency(value);
      }
    },
    
    // 状态字段
    {
      id: 'status',
      accessorKey: 'payroll_status', // 修正为数据库视图中的实际字段名
      header: '薪资状态',
      type: 'status',
      defaultVisible: true,
      defaultOrder: 15,
      description: '当前薪资记录的处理状态',
      size: 100,
      cell: (getValue) => {
        const status = getValue() as PayrollStatusType;
        const statusLabels: Record<PayrollStatusType, string> = {
          draft: '草稿',
          calculating: '计算中',
          calculated: '已计算',
          approved: '已审批',
          paid: '已发放',
          cancelled: '已取消'
        };
        return statusLabels[status] || status;
      },
      // 标记为使用徽章样式
      useBadge: true
    },
    {
      id: 'period_status',
      accessorKey: 'period_status',
      header: '期间状态',
      type: 'status',
      defaultVisible: false,
      defaultOrder: 16,
      description: '薪资期间的状态',
      size: 100
    },
    
    // ID字段 - 通常隐藏
    {
      id: 'payroll_id',
      accessorKey: 'payroll_id',
      header: '薪资ID',
      type: 'id',
      defaultVisible: false,
      defaultOrder: 17,
      description: '薪资记录的唯一标识',
      size: 200
    },
    {
      id: 'employee_id',
      accessorKey: 'employee_id',
      header: '员工ID',
      type: 'id',
      defaultVisible: false,
      defaultOrder: 18,
      description: '员工的唯一标识',
      size: 200
    },
    {
      id: 'period_id',
      accessorKey: 'period_id',
      header: '期间ID',
      type: 'id',
      defaultVisible: false,
      defaultOrder: 19,
      description: '薪资期间的唯一标识',
      size: 200
    },
    
    // 时间戳字段 - 通常隐藏
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: '创建时间',
      type: 'timestamp',
      defaultVisible: false,
      defaultOrder: 20,
      description: '记录创建时间',
      size: 160,
      cell: (getValue) => {
        const value = getValue();
        if (!value) return '-';
        return new Date(value).toLocaleString('zh-CN');
      }
    },
    {
      id: 'updated_at',
      accessorKey: 'updated_at',
      header: '更新时间',
      type: 'timestamp',
      defaultVisible: false,
      defaultOrder: 21,
      description: '记录最后更新时间',
      size: 160,
      cell: (getValue) => {
        const value = getValue();
        if (!value) return '-';
        return new Date(value).toLocaleString('zh-CN');
      }
    }
  ], []);

  // 获取所有字段的元数据
  const generateFieldMetadata = (columnVisibility: Record<string, boolean>): FieldMetadata[] => {
    return allColumnConfigs.map(config => ({
      name: config.id,
      label: config.header,
      description: config.description || '',
      visible: columnVisibility[config.id] ?? (config.defaultVisible ?? false),
      order: config.defaultOrder ?? 99,
      type: config.type,
      required: config.required ?? false,
      width: config.size
    })).sort((a, b) => a.order - b.order);
  };

  // 获取默认的列可见性配置
  const getDefaultColumnVisibility = (): Record<string, boolean> => {
    const visibility: Record<string, boolean> = {};
    allColumnConfigs.forEach(config => {
      visibility[config.id] = config.defaultVisible ?? false;
    });
    return visibility;
  };

  // 根据类型过滤字段
  const getColumnsByType = (types: PayrollColumnConfig['type'][]): PayrollColumnConfig[] => {
    return allColumnConfigs.filter(config => types.includes(config.type));
  };

  // 获取核心字段（默认显示的）
  const getCoreColumns = (): PayrollColumnConfig[] => {
    return allColumnConfigs.filter(config => config.defaultVisible === true);
  };

  // 获取可选字段（默认隐藏的）
  const getOptionalColumns = (): PayrollColumnConfig[] => {
    return allColumnConfigs.filter(config => config.defaultVisible !== true);
  };

  return {
    allColumnConfigs,
    generateFieldMetadata,
    getDefaultColumnVisibility,
    getColumnsByType,
    getCoreColumns,
    getOptionalColumns
  };
};