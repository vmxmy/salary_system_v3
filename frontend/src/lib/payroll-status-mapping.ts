/**
 * 薪资周期状态映射工具
 * 基于DaisyUI主题颜色的完善状态标识体系
 */

// 薪资周期状态类型
export type PayrollPeriodStatus = 
  | 'preparing' 
  | 'ready' 
  | 'review' 
  | 'processing' 
  | 'approved' 
  | 'completed' 
  | 'closed';

// 状态映射配置
interface StatusConfig {
  /** 中文显示名称 */
  label: string;
  /** DaisyUI主题颜色类名 */
  colorClass: string;
  /** 背景色类名 */
  bgClass: string;
  /** 文本颜色类名 */
  textClass: string;
  /** 边框颜色类名 */
  borderClass: string;
  /** 环形颜色类名（用于指示器） */
  ringClass: string;
  /** 语义描述 */
  description: string;
  /** 优先级（用于排序，数字越大优先级越高） */
  priority: number;
}

/**
 * 薪资周期状态配置映射表
 * 基于DaisyUI 5主题颜色系统
 */
export const PAYROLL_STATUS_CONFIG: Record<PayrollPeriodStatus, StatusConfig> = {
  preparing: {
    label: '准备中',
    colorClass: 'neutral',
    bgClass: 'bg-neutral',
    textClass: 'text-neutral-content',
    borderClass: 'border-neutral',
    ringClass: 'ring-neutral',
    description: '薪资周期已创建，正在准备基础数据',
    priority: 1,
  },
  ready: {
    label: '就绪',
    colorClass: 'primary',
    bgClass: 'bg-primary',
    textClass: 'text-primary-content',
    borderClass: 'border-primary',
    ringClass: 'ring-primary',
    description: '数据准备就绪，可以开始薪资计算',
    priority: 2,
  },
  review: {
    label: '审核中',
    colorClass: 'warning',
    bgClass: 'bg-warning',
    textClass: 'text-warning-content',
    borderClass: 'border-warning',
    ringClass: 'ring-warning',
    description: '薪资数据等待审核确认',
    priority: 3,
  },
  processing: {
    label: '处理中',
    colorClass: 'info',
    bgClass: 'bg-info',
    textClass: 'text-info-content',
    borderClass: 'border-info',
    ringClass: 'ring-info',
    description: '正在处理薪资发放流程',
    priority: 4,
  },
  approved: {
    label: '已审批',
    colorClass: 'secondary',
    bgClass: 'bg-secondary',
    textClass: 'text-secondary-content',
    borderClass: 'border-secondary',
    ringClass: 'ring-secondary',
    description: '薪资审批通过，准备发放',
    priority: 5,
  },
  completed: {
    label: '已完成',
    colorClass: 'success',
    bgClass: 'bg-success',
    textClass: 'text-success-content',
    borderClass: 'border-success',
    ringClass: 'ring-success',
    description: '薪资发放完成',
    priority: 6,
  },
  closed: {
    label: '已关闭',
    colorClass: 'accent',
    bgClass: 'bg-accent',
    textClass: 'text-accent-content',
    borderClass: 'border-accent',
    ringClass: 'ring-accent',
    description: '薪资周期正式关闭，数据锁定',
    priority: 7,
  },
};

/**
 * 获取状态配置
 * @param status 薪资周期状态
 * @returns 状态配置对象
 */
export function getStatusConfig(status: PayrollPeriodStatus): StatusConfig {
  return PAYROLL_STATUS_CONFIG[status] || PAYROLL_STATUS_CONFIG.preparing;
}

/**
 * 获取状态显示名称
 * @param status 薪资周期状态
 * @returns 中文显示名称
 */
export function getStatusLabel(status: PayrollPeriodStatus): string {
  return getStatusConfig(status).label;
}

/**
 * 获取状态颜色类名
 * @param status 薪资周期状态
 * @param type 颜色类型
 * @returns 对应的CSS类名
 */
export function getStatusColorClass(
  status: PayrollPeriodStatus,
  type: 'bg' | 'text' | 'border' | 'ring' = 'bg'
): string {
  const config = getStatusConfig(status);
  switch (type) {
    case 'bg': return config.bgClass;
    case 'text': return config.textClass;
    case 'border': return config.borderClass;
    case 'ring': return config.ringClass;
    default: return config.bgClass;
  }
}

/**
 * 获取状态描述
 * @param status 薪资周期状态
 * @returns 状态语义描述
 */
export function getStatusDescription(status: PayrollPeriodStatus): string {
  return getStatusConfig(status).description;
}

/**
 * 按优先级排序状态列表
 * @param statuses 状态列表
 * @returns 排序后的状态列表
 */
export function sortStatusesByPriority(statuses: PayrollPeriodStatus[]): PayrollPeriodStatus[] {
  return statuses.sort((a, b) => {
    const priorityA = getStatusConfig(a).priority;
    const priorityB = getStatusConfig(b).priority;
    return priorityB - priorityA; // 降序排列，优先级高的在前
  });
}

/**
 * 检查状态是否为终态（不可再变更）
 * @param status 薪资周期状态
 * @returns 是否为终态
 */
export function isFinalStatus(status: PayrollPeriodStatus): boolean {
  return status === 'completed' || status === 'closed';
}

/**
 * 检查状态是否可以进行薪资操作
 * @param status 薪资周期状态
 * @returns 是否可以操作
 */
export function canModifyPayroll(status: PayrollPeriodStatus): boolean {
  return !isFinalStatus(status) && status !== 'processing';
}

/**
 * 获取月份选择器的状态指示器配置
 * @param status 薪资周期状态
 * @param hasData 是否有薪资数据
 * @param isLocked 是否被锁定
 * @returns 指示器配置
 */
export function getMonthIndicatorConfig(
  status: PayrollPeriodStatus,
  hasData: boolean = false,
  isLocked: boolean = false
) {
  const config = getStatusConfig(status);
  
  return {
    // 主指示器颜色（右上角数字背景）
    indicatorBg: hasData ? config.bgClass : 'bg-warning',
    indicatorText: hasData ? config.textClass : 'text-warning-content',
    
    // 状态指示器颜色（左上角圆点）
    statusBg: config.bgClass,
    statusRing: isLocked ? 'ring-error ring-2 ring-offset-1' : '',
    
    // 工具提示文本
    tooltip: `${config.label} - ${config.description}${isLocked ? ' (已锁定)' : ''}`,
    
    // 月份按钮样式
    monthButtonClass: hasData 
      ? `ring-1 ${config.ringClass}/30 ${config.bgClass}/5 hover:${config.bgClass}/10`
      : `ring-1 ring-warning/30 bg-warning/5 hover:bg-warning/10`,
    
    // 月份文本颜色  
    monthTextClass: hasData ? `text-${config.colorClass}` : 'text-warning',
  };
}