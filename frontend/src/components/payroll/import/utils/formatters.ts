/**
 * 格式化工具函数
 * 处理数据显示、转换和格式化相关逻辑
 */

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化的文件大小字符串
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * 格式化进度百分比显示
 * @param percentage 百分比 (0-100)
 * @returns 格式化的百分比字符串
 */
export const formatPercentage = (percentage: number): string => {
  return `${Math.round(percentage)}%`;
};

/**
 * 格式化处理速度
 * @param processedCount 已处理数量
 * @param startTime 开始时间戳
 * @returns 处理速度 (条/秒)
 */
export const formatProcessingSpeed = (processedCount: number, startTime: number): string => {
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  if (elapsedSeconds <= 0) return '0 条/秒';
  
  const speed = processedCount / elapsedSeconds;
  return speed >= 1 ? `${Math.round(speed)} 条/秒` : `${(speed * 60).toFixed(1)} 条/分钟`;
};

/**
 * 格式化剩余时间估算
 * @param processedCount 已处理数量
 * @param totalCount 总数量
 * @param startTime 开始时间戳
 * @returns 剩余时间估算
 */
export const formatEstimatedTime = (
  processedCount: number, 
  totalCount: number, 
  startTime: number
): string => {
  if (processedCount <= 0 || processedCount >= totalCount) return '完成';
  
  const elapsedMs = Date.now() - startTime;
  const avgTimePerItem = elapsedMs / processedCount;
  const remainingItems = totalCount - processedCount;
  const estimatedRemainingMs = remainingItems * avgTimePerItem;
  
  const seconds = Math.ceil(estimatedRemainingMs / 1000);
  
  if (seconds < 60) return `约 ${seconds} 秒`;
  if (seconds < 3600) return `约 ${Math.ceil(seconds / 60)} 分钟`;
  return `约 ${Math.ceil(seconds / 3600)} 小时`;
};

/**
 * 格式化错误信息
 * @param error 错误对象或字符串
 * @returns 用户友好的错误信息
 */
export const formatErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return '未知错误';
};

/**
 * 格式化导入状态显示
 * @param phase 导入阶段
 * @param progress 进度信息
 * @returns 状态显示文本
 */
export const formatImportStatus = (
  phase: string, 
  progress: { processedRecords: number; totalRecords: number }
): string => {
  const { processedRecords, totalRecords } = progress;
  
  switch (phase) {
    case 'idle':
      return '准备就绪';
    case 'parsing':
      return '正在解析文件...';
    case 'validating':
      return '正在验证数据...';
    case 'importing':
      return totalRecords > 0 
        ? `正在导入... (${processedRecords}/${totalRecords})`
        : '正在导入...';
    case 'completed':
      return '导入完成';
    case 'error':
      return '导入失败';
    default:
      return '处理中...';
  }
};

/**
 * 格式化数据统计信息
 * @param stats 统计数据
 * @returns 格式化的统计信息
 */
export const formatDataStats = (stats: {
  totalRows: number;
  validRows: number;
  emptyRows: number;
  totalEmployees: number;
  duplicateEmployees: string[];
}): {
  total: string;
  valid: string;
  empty: string;
  employees: string;
  duplicates: string;
} => {
  return {
    total: `${stats.totalRows} 条`,
    valid: `${stats.validRows} 条有效`,
    empty: stats.emptyRows > 0 ? `${stats.emptyRows} 条空行` : '无空行',
    employees: `${stats.totalEmployees} 名员工`,
    duplicates: stats.duplicateEmployees.length > 0 
      ? `${stats.duplicateEmployees.length} 名重复员工` 
      : '无重复员工'
  };
};

/**
 * 格式化工作表信息
 * @param sheet 工作表数据
 * @returns 格式化的工作表信息
 */
export const formatSheetInfo = (sheet: {
  name: string;
  rowCount: number;
  columnCount: number;
  isEmpty: boolean;
  hasData: boolean;
}): string => {
  if (sheet.isEmpty) return `${sheet.name} (空表)`;
  return `${sheet.name} (${sheet.rowCount} 行, ${sheet.columnCount} 列)`;
};

/**
 * 格式化导入配置显示
 * @param config 导入配置
 * @returns 格式化的配置信息
 */
export const formatImportConfig = (config: {
  dataGroup: string | string[];
  mode: string;
  selectedMonth: string;
}): {
  dataGroups: string;
  mode: string;
  period: string;
} => {
  const dataGroups = Array.isArray(config.dataGroup) 
    ? config.dataGroup.join(', ') 
    : config.dataGroup;
    
  const modeLabels: Record<string, string> = {
    'upsert': '更新或插入',
    'replace': '替换模式',
    'append': '追加模式'
  };
  
  return {
    dataGroups,
    mode: modeLabels[config.mode] || config.mode,
    period: config.selectedMonth.replace('-', '年') + '月'
  };
};

/**
 * 格式化数值显示
 * @param value 数值
 * @param decimals 小数位数
 * @returns 格式化的数值字符串
 */
export const formatNumber = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * 格式化金额显示
 * @param amount 金额
 * @returns 格式化的金额字符串
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount);
};