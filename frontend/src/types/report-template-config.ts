/**
 * 报表模板配置类型定义
 * 
 * 用于扩展报表模板的 config 字段，支持标签、分组和批量生成
 */

// 报表模板标签类型
export interface ReportTemplateTag {
  /** 标签键 */
  key: string;
  /** 标签显示名称 */
  name: string;
  /** 标签颜色 (DaisyUI颜色类名) */
  color?: string;
  /** 标签图标 */
  icon?: string;
}

// 报表模板分组配置
export interface ReportTemplateGroup {
  /** 分组ID */
  id: string;
  /** 分组名称 */
  name: string;
  /** 分组描述 */
  description?: string;
  /** 分组优先级 (数字越小优先级越高) */
  priority?: number;
  /** 是否为默认分组 */
  isDefault?: boolean;
}

// 批量生成配置
export interface BatchGenerationConfig {
  /** 是否支持批量生成 */
  enabled: boolean;
  /** 批量生成时的优先级 */
  priority?: number;
  /** 依赖的其他模板 */
  dependencies?: string[];
  /** 批量生成时的等待时间(毫秒) */
  delay?: number;
}

// 模板使用场景配置
export interface TemplateUsageConfig {
  /** 适用的数据源 */
  dataSources: string[];
  /** 适用的周期类型 */
  periodTypes: ('monthly' | 'quarterly' | 'yearly' | 'custom')[];
  /** 推荐的输出格式 */
  recommendedFormats: ('xlsx' | 'pdf' | 'csv')[];
}

// 扩展的报表模板配置结构
export interface ExtendedReportTemplateConfig {
  /** 基础配置 */
  basic?: {
    /** 模板版本 */
    version?: string;
    /** 作者信息 */
    author?: string;
    /** 最后更新时间 */
    lastUpdated?: string;
  };
  
  /** 标签配置 */
  tags?: ReportTemplateTag[];
  
  /** 分组配置 */
  group?: ReportTemplateGroup;
  
  /** 批量生成配置 */
  batchGeneration?: BatchGenerationConfig;
  
  /** 使用场景配置 */
  usage?: TemplateUsageConfig;
  
  /** 显示配置 */
  display?: {
    /** 模板图标 */
    icon?: string;
    /** 模板颜色主题 */
    theme?: string;
    /** 是否在快速选择中显示 */
    showInQuickSelect?: boolean;
    /** 排序权重 */
    sortWeight?: number;
  };
  
  /** 其他自定义配置 */
  [key: string]: any;
}

// 预定义的标签常量
export const PREDEFINED_TAGS: Record<string, ReportTemplateTag> = {
  // 报表类型标签
  SUMMARY: { key: 'summary', name: '汇总报表', color: 'badge-primary', icon: '📊' },
  DETAIL: { key: 'detail', name: '明细报表', color: 'badge-secondary', icon: '📋' },
  ANALYSIS: { key: 'analysis', name: '分析报表', color: 'badge-accent', icon: '📈' },
  
  // 周期标签
  MONTHLY: { key: 'monthly', name: '月度报表', color: 'badge-info', icon: '📅' },
  QUARTERLY: { key: 'quarterly', name: '季度报表', color: 'badge-warning', icon: '📆' },
  YEARLY: { key: 'yearly', name: '年度报表', color: 'badge-success', icon: '🗓️' },
  
  // 用途标签
  INTERNAL: { key: 'internal', name: '内部使用', color: 'badge-neutral', icon: '🏢' },
  EXTERNAL: { key: 'external', name: '对外报送', color: 'badge-error', icon: '📤' },
  COMPLIANCE: { key: 'compliance', name: '合规报表', color: 'badge-warning', icon: '⚖️' },
  
  // 重要性标签
  REQUIRED: { key: 'required', name: '必需报表', color: 'badge-error', icon: '❗' },
  OPTIONAL: { key: 'optional', name: '可选报表', color: 'badge-ghost', icon: '💡' },
  
  // 格式标签
  EXCEL_PREFERRED: { key: 'excel', name: '推荐Excel', color: 'badge-success', icon: '📊' },
  PDF_PREFERRED: { key: 'pdf', name: '推荐PDF', color: 'badge-error', icon: '📄' },
};

// 预定义的分组常量
export const PREDEFINED_GROUPS: Record<string, ReportTemplateGroup> = {
  MONTHLY_STANDARD: {
    id: 'monthly-standard',
    name: '月度标准报表套装',
    description: '每月必须生成的标准报表集合',
    priority: 1,
    isDefault: true
  },
  MONTHLY_DETAILED: {
    id: 'monthly-detailed',
    name: '月度详细报表套装',
    description: '包含详细分析的月度报表集合',
    priority: 2
  },
  COMPLIANCE_SET: {
    id: 'compliance',
    name: '合规报表套装',
    description: '监管部门要求的合规报表集合',
    priority: 3
  },
  MANAGEMENT_DASHBOARD: {
    id: 'management',
    name: '管理层报表套装',
    description: '面向管理层的分析报表集合',
    priority: 4
  },
  CUSTOM: {
    id: 'custom',
    name: '自定义报表',
    description: '用户自定义的报表模板',
    priority: 99
  }
};

// 工具函数：获取模板的标签
export function getTemplateTags(config: ExtendedReportTemplateConfig): ReportTemplateTag[] {
  return config.tags || [];
}

// 工具函数：获取模板的分组
export function getTemplateGroup(config: ExtendedReportTemplateConfig): ReportTemplateGroup | null {
  return config.group || null;
}

// 工具函数：检查模板是否支持批量生成
export function isBatchGenerationEnabled(config: ExtendedReportTemplateConfig): boolean {
  return config.batchGeneration?.enabled ?? false;
}

// 工具函数：获取模板的批量生成优先级
export function getBatchGenerationPriority(config: ExtendedReportTemplateConfig): number {
  return config.batchGeneration?.priority ?? 50;
}

// 工具函数：检查模板是否有指定标签
export function hasTag(config: ExtendedReportTemplateConfig, tagKey: string): boolean {
  return (config.tags || []).some(tag => tag.key === tagKey);
}

// 工具函数：按分组和优先级排序模板
export function sortTemplatesByGroupAndPriority(
  templates: Array<{ id: string; config: ExtendedReportTemplateConfig }>
): Array<{ id: string; config: ExtendedReportTemplateConfig }> {
  return templates.sort((a, b) => {
    const aGroup = getTemplateGroup(a.config);
    const bGroup = getTemplateGroup(b.config);
    
    // 先按分组优先级排序
    const aGroupPriority = aGroup?.priority ?? 99;
    const bGroupPriority = bGroup?.priority ?? 99;
    
    if (aGroupPriority !== bGroupPriority) {
      return aGroupPriority - bGroupPriority;
    }
    
    // 同一分组内按批量生成优先级排序
    const aBatchPriority = getBatchGenerationPriority(a.config);
    const bBatchPriority = getBatchGenerationPriority(b.config);
    
    if (aBatchPriority !== bBatchPriority) {
      return aBatchPriority - bBatchPriority;
    }
    
    // 最后按显示权重排序
    const aWeight = a.config.display?.sortWeight ?? 50;
    const bWeight = b.config.display?.sortWeight ?? 50;
    
    return aWeight - bWeight;
  });
}