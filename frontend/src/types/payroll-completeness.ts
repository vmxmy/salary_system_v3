/**
 * 薪资周期四要素完整度类型定义
 */

// 要素状态类型
export type ElementStatus = 'empty' | 'partial' | 'complete';

// 元数据状态类型
export type MetadataStatus = 'empty' | 'incomplete' | 'complete';

/**
 * 薪资周期四要素完整度信息
 */
export interface PayrollPeriodCompleteness {
  // 周期基本信息
  period_id: string;
  period_name: string;
  period_year: number;
  period_month: number;
  period_status: 'draft' | 'processing' | 'completed';
  total_employees: number;

  // 薪资项目完整度
  earnings_count: number;
  earnings_percentage: number;
  earnings_status: ElementStatus;

  // 缴费基数完整度
  bases_count: number;
  bases_percentage: number;
  bases_status: ElementStatus;

  // 人员类别完整度
  category_count: number;
  category_percentage: number;
  category_status: ElementStatus;

  // 职务信息完整度
  job_count: number;
  job_percentage: number;
  job_status: ElementStatus;

  // 总体完整度
  complete_employees_count: number;
  overall_completeness_percentage: number;
  metadata_status: MetadataStatus;
}

/**
 * 单个要素的完整度详情
 */
export interface ElementCompleteness {
  name: string;
  displayName: string;
  count: number;
  total: number;
  percentage: number;
  status: ElementStatus;
  icon?: string;
  color?: string;
}

/**
 * 四要素名称枚举
 */
export const PayrollElement = {
  Earnings: 'earnings',
  Bases: 'bases',
  Category: 'category',
  Job: 'job'
} as const;

export type PayrollElement = typeof PayrollElement[keyof typeof PayrollElement];

/**
 * 四要素显示配置
 */
export const PAYROLL_ELEMENTS_CONFIG: Record<string, {
  displayName: string;
  icon: string;
  description: string;
  requiredFields?: string[];
}> = {
  [PayrollElement.Earnings]: {
    displayName: '薪资项目',
    icon: '💰',
    description: '基本工资、津贴、奖金等收入项目',
    requiredFields: ['基本工资']
  },
  [PayrollElement.Bases]: {
    displayName: '缴费基数',
    icon: '🏦',
    description: '社保、公积金等各项缴费基数',
    requiredFields: ['养老保险基数', '医疗保险基数', '住房公积金基数']
  },
  [PayrollElement.Category]: {
    displayName: '人员类别',
    icon: '👥',
    description: '员工的人员类别分配（正式、合同、临时等）',
    requiredFields: ['人员类别']
  },
  [PayrollElement.Job]: {
    displayName: '职务信息',
    icon: '🏢',
    description: '员工的部门和职位分配',
    requiredFields: ['部门', '职位']
  }
};

/**
 * 获取要素状态的颜色
 */
export function getElementStatusColor(status: ElementStatus): string {
  switch (status) {
    case 'complete':
      return 'success';
    case 'partial':
      return 'warning';
    case 'empty':
      return 'error';
    default:
      return 'base-300';
  }
}

/**
 * 获取要素状态的标签文字
 */
export function getElementStatusLabel(status: ElementStatus): string {
  switch (status) {
    case 'complete':
      return '完整';
    case 'partial':
      return '部分';
    case 'empty':
      return '空缺';
    default:
      return '未知';
  }
}

/**
 * 获取元数据状态的颜色
 */
export function getMetadataStatusColor(status: MetadataStatus): string {
  switch (status) {
    case 'complete':
      return 'success';
    case 'incomplete':
      return 'warning';
    case 'empty':
      return 'error';
    default:
      return 'base-300';
  }
}

/**
 * 获取元数据状态的标签文字
 */
export function getMetadataStatusLabel(status: MetadataStatus): string {
  switch (status) {
    case 'complete':
      return '元数据完整';
    case 'incomplete':
      return '元数据不完整';
    case 'empty':
      return '无数据';
    default:
      return '未知';
  }
}

/**
 * 计算完整度等级
 */
export function getCompletenessLevel(percentage: number): {
  level: 'critical' | 'low' | 'medium' | 'high' | 'complete';
  color: string;
  label: string;
} {
  if (percentage === 100) {
    return { level: 'complete', color: 'success', label: '完整' };
  } else if (percentage >= 80) {
    return { level: 'high', color: 'info', label: '高' };
  } else if (percentage >= 50) {
    return { level: 'medium', color: 'warning', label: '中' };
  } else if (percentage > 0) {
    return { level: 'low', color: 'error', label: '低' };
  } else {
    return { level: 'critical', color: 'error', label: '空' };
  }
}