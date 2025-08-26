/**
 * Excel导出模板配置
 * 集中管理所有导出模板的字段定义、列宽、格式等
 */

export interface ExportFieldConfig {
  /** 显示的列名 */
  label: string;
  /** 数据字段路径（支持嵌套属性，如 'employees.employee_name'） */
  dataPath: string;
  /** 列宽 */
  width: number;
  /** 数据格式化函数 */
  formatter?: (value: any, item: any, index?: number) => any;
  /** 是否必需字段 */
  required?: boolean;
  /** 是否为固定列（透视模式下不会被动态列替换） */
  isFixed?: boolean;
  /** 是否为汇总列（透视模式下显示在动态列之后） */
  isSummary?: boolean;
}

export interface ExportSheetTemplate {
  /** 工作表名称 */
  sheetName: string;
  /** 字段配置 */
  fields: ExportFieldConfig[];
  /** 工作表描述 */
  description?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 是否为透视模式（动态生成列） */
  pivotMode?: boolean;
}

export interface ExportTemplateConfig {
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 工作表配置 */
  sheets: Record<string, ExportSheetTemplate>;
  /** 文件名前缀 */
  filePrefix: string;
  /** 创建时间 */
  createdAt: string;
  /** 版本号 */
  version: string;
}

// 数据格式化函数库
export const formatters = {
  /** 货币格式化 */
  currency: (value: number) => typeof value === 'number' ? value : 0,
  
  /** 状态格式化 */
  payrollStatus: (value: string) => {
    const statusMap: Record<string, string> = {
      'draft': '草稿',
      'submitted': '已提交',
      'approved': '已审批',
      'paid': '已发放',
      'cancelled': '已取消'
    };
    return statusMap[value] || value;
  },
  
  /** 日期格式化 */
  date: (value: string) => value ? new Date(value).toLocaleDateString('zh-CN') : '',
  
  /** 序号格式化 */
  serialNumber: (value: any, item: any, index?: number) => (index ?? 0) + 1,
  
  /** 嵌套字段提取 */
  nestedField: (dataPath: string) => (value: any, item: any) => {
    const keys = dataPath.split('.');
    let result = item;
    for (const key of keys) {
      result = result?.[key];
      if (result === undefined || result === null) break;
    }
    return result || '';
  }
};

/**
 * 完整薪资导出模板配置
 */
export const PAYROLL_COMPLETE_TEMPLATE: ExportTemplateConfig = {
  name: 'payroll_complete',
  description: '完整薪资数据导出（五个工作表：薪资收入、缴费基数、职务分配、人员类别、薪资明细）',
  filePrefix: '薪资完整导出',
  version: '1.1.0',
  createdAt: '2025-01-25',
  
  sheets: {
    // 薪资收入工作表
    payroll: {
      sheetName: '薪资收入',
      description: '员工薪资收入汇总数据',
      enabled: true,
      fields: [
        {
          label: '序号',
          dataPath: '_index',
          width: 8,
          formatter: formatters.serialNumber,
          required: true
        },
        {
          label: '员工姓名',
          dataPath: 'employee_name',
          width: 12,
          required: true
        },
        {
          label: '人员类别名称',
          dataPath: 'employee_categories.name',
          width: 20,
          formatter: formatters.nestedField('employee_categories.name'),
          required: true
        },
        {
          label: '部门',
          dataPath: 'department_name',
          width: 15,
          required: true
        },
        {
          label: '职位',
          dataPath: 'position_name',
          width: 15,
          required: false
        },
        {
          label: '薪资月份',
          dataPath: 'period_name',
          width: 12,
          formatter: (value: any, item: any) => value || item.period_code,
          required: true
        },
        {
          label: '应发工资',
          dataPath: 'gross_pay',
          width: 12,
          formatter: formatters.currency,
          required: true
        },
        {
          label: '扣款合计',
          dataPath: 'total_deductions',
          width: 12,
          formatter: formatters.currency,
          required: true
        },
        {
          label: '实发工资',
          dataPath: 'net_pay',
          width: 12,
          formatter: formatters.currency,
          required: true
        },
        {
          label: '状态',
          dataPath: 'payroll_status',
          width: 10,
          formatter: formatters.payrollStatus,
          required: true
        }
      ]
    },

    // 缴费基数工作表
    contributionBases: {
      sheetName: '缴费基数',
      description: '员工各项保险缴费基数',
      enabled: true,
      fields: [
        {
          label: '序号',
          dataPath: '_index',
          width: 8,
          formatter: formatters.serialNumber,
          required: true
        },
        {
          label: '员工姓名',
          dataPath: 'employee_name',
          width: 12,
          required: true
        },
        {
          label: '住房公积金基数',
          dataPath: 'housing_fund_base',
          width: 18,
          formatter: formatters.currency
        },
        {
          label: '养老保险基数',
          dataPath: 'pension_base',
          width: 15,
          formatter: formatters.currency
        },
        {
          label: '医疗保险基数',
          dataPath: 'medical_base',
          width: 15,
          formatter: formatters.currency
        },
        {
          label: '失业保险基数',
          dataPath: 'unemployment_base',
          width: 15,
          formatter: formatters.currency
        },
        {
          label: '工伤保险基数',
          dataPath: 'work_injury_base',
          width: 15,
          formatter: formatters.currency
        },
        {
          label: '生育保险基数',
          dataPath: 'maternity_base',
          width: 15,
          formatter: formatters.currency
        },
        {
          label: '职业年金基数',
          dataPath: 'occupational_pension_base',
          width: 15,
          formatter: formatters.currency
        },
        {
          label: '大病医疗基数',
          dataPath: 'serious_illness_base',
          width: 15,
          formatter: formatters.currency
        }
      ]
    },

    // 职务分配工作表
    jobAssignments: {
      sheetName: '职务分配',
      description: '员工职务和部门分配情况',
      enabled: true,
      fields: [
        {
          label: '序号',
          dataPath: '_index',
          width: 8,
          formatter: formatters.serialNumber,
          required: true
        },
        {
          label: '员工姓名',
          dataPath: 'employees.employee_name',
          width: 12,
          formatter: formatters.nestedField('employees.employee_name'),
          required: true
        },
        {
          label: '部门',
          dataPath: 'departments.name',
          width: 15,
          formatter: formatters.nestedField('departments.name'),
          required: true
        },
        {
          label: '职位',
          dataPath: 'positions.name',
          width: 15,
          formatter: formatters.nestedField('positions.name'),
          required: true
        },
        {
          label: '职级',
          dataPath: 'job_ranks.name',
          width: 15,
          formatter: (value: any, item: any) => {
            return formatters.nestedField('job_ranks.name')(value, item) || 
                   formatters.nestedField('ranks.name')(value, item) || '';
          }
        }
      ]
    },

    // 人员类别工作表
    categoryAssignments: {
      sheetName: '人员类别',
      description: '员工人员类别分配情况',
      enabled: true,
      fields: [
        {
          label: '序号',
          dataPath: '_index',
          width: 8,
          formatter: formatters.serialNumber,
          required: true
        },
        {
          label: '员工姓名',
          dataPath: 'employees.employee_name',
          width: 12,
          formatter: formatters.nestedField('employees.employee_name'),
          required: true
        },
        {
          label: '人员类别名称',
          dataPath: 'employee_categories.name',
          width: 20,
          formatter: formatters.nestedField('employee_categories.name'),
          required: true
        }
      ]
    },

    // 薪资明细工作表 - 透视格式，动态生成列
    payrollDetails: {
      sheetName: '薪资项目明细',
      description: '透视格式薪资明细表，每个薪资项目作为列名',
      enabled: true,
      pivotMode: true, // 标识为透视模式
      fields: [
        {
          label: '序号',
          dataPath: '_index',
          width: 8,
          formatter: formatters.serialNumber,
          required: true,
          isFixed: true // 固定列，不会被动态生成的列替换
        },
        {
          label: '员工姓名',
          dataPath: 'employee_name',
          width: 12,
          required: true,
          isFixed: true
        },
        {
          label: '根分类',
          dataPath: 'root_category_name',
          width: 10,
          isFixed: true
        },
        {
          label: '部门',
          dataPath: 'department_name',
          width: 15,
          required: true,
          isFixed: true
        },
        {
          label: '职位',
          dataPath: 'position_name',
          width: 15,
          isFixed: true
        },
        {
          label: '薪资月份',
          dataPath: 'pay_month',
          width: 12,
          formatter: (value: any, item: any) => value || item.period_name,
          required: true,
          isFixed: true
        },
        // 动态薪资项目列会在运行时自动生成
        {
          label: '应发合计',
          dataPath: 'gross_pay',
          width: 12,
          formatter: formatters.currency,
          required: true,
          isFixed: true,
          isSummary: true // 标识为汇总列
        },
        {
          label: '扣款合计',
          dataPath: 'total_deductions',
          width: 12,
          formatter: formatters.currency,
          required: true,
          isFixed: true,
          isSummary: true
        },
        {
          label: '实发工资',
          dataPath: 'net_pay',
          width: 12,
          formatter: formatters.currency,
          required: true,
          isFixed: true,
          isSummary: true
        }
      ]
    }
  }
};


/**
 * 薪资汇总导出模板配置
 */
export const PAYROLL_SUMMARY_TEMPLATE: ExportTemplateConfig = {
  name: 'payroll_summary',
  description: '薪资汇总数据导出（单工作表）',
  filePrefix: '薪资数据导出',
  version: '1.0.0',
  createdAt: '2025-01-25',
  
  sheets: {
    summary: {
      sheetName: '薪资项目明细',
      description: '薪资汇总明细表',
      enabled: true,
      fields: [
        {
          label: '薪资ID',
          dataPath: 'payroll_id',
          width: 12,
          required: true
        },
        {
          label: '员工ID',
          dataPath: 'employee_id',
          width: 12,
          required: true
        },
        {
          label: '员工姓名',
          dataPath: 'employee_name',
          width: 12,
          required: true
        },
        {
          label: '身份证号',
          dataPath: 'id_number',
          width: 15,
        },
        {
          label: '部门',
          dataPath: 'department_name',
          width: 15,
          required: true
        },
        {
          label: '职位',
          dataPath: 'position_name',
          width: 15,
        },
        {
          label: '人员类别',
          dataPath: 'category_name',
          width: 10,
        },
        {
          label: '薪资周期',
          dataPath: 'period_name',
          width: 10,
          required: true
        },
        {
          label: '周期代码',
          dataPath: 'period_code',
          width: 10,
        },
        {
          label: '周期开始',
          dataPath: 'period_start',
          width: 10,
          formatter: formatters.date
        },
        {
          label: '周期结束',
          dataPath: 'period_end',
          width: 10,
          formatter: formatters.date
        },
        {
          label: '计划发薪日',
          dataPath: 'scheduled_pay_date',
          width: 12,
          formatter: formatters.date
        },
        {
          label: '实际发薪日',
          dataPath: 'actual_pay_date',
          width: 10,
          formatter: formatters.date
        },
        {
          label: '应发工资',
          dataPath: 'gross_pay',
          width: 12,
          formatter: formatters.currency,
          required: true
        },
        {
          label: '扣款合计',
          dataPath: 'total_deductions',
          width: 12,
          formatter: formatters.currency,
          required: true
        },
        {
          label: '实发工资',
          dataPath: 'net_pay',
          width: 12,
          formatter: formatters.currency,
          required: true
        },
        {
          label: '薪资状态',
          dataPath: 'payroll_status',
          width: 10,
          formatter: formatters.payrollStatus,
          required: true
        },
        {
          label: '创建时间',
          dataPath: 'created_at',
          width: 10,
          formatter: formatters.date
        },
        {
          label: '更新时间',
          dataPath: 'updated_at',
          width: 10,
          formatter: formatters.date
        }
      ]
    }
  }
};

/**
 * 获取导出模板配置
 */
export function getExportTemplate(templateName: string): ExportTemplateConfig | null {
  const templates: Record<string, ExportTemplateConfig> = {
    'payroll_complete': PAYROLL_COMPLETE_TEMPLATE,
    'payroll_multi_sheet': PAYROLL_COMPLETE_TEMPLATE, // 别名
    'payroll_summary': PAYROLL_SUMMARY_TEMPLATE
  };
  
  return templates[templateName] || null;
}

/**
 * 获取所有可用的模板
 */
export function getAllExportTemplates(): ExportTemplateConfig[] {
  return [
    PAYROLL_COMPLETE_TEMPLATE,
    PAYROLL_SUMMARY_TEMPLATE
  ];
}