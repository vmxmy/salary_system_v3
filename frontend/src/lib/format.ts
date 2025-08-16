/**
 * 格式化工具函数
 */

/**
 * 格式化货币
 */
export function formatCurrency(amount: number, currency = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * 格式化数字
 */
export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, decimals = 1): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
}

/**
 * 格式化日期
 */
export function formatDate(
  date: string | Date,
  format: 'full' | 'long' | 'medium' | 'short' = 'medium'
): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // 检查日期是否有效
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    full: { 
      weekday: 'long' as const, 
      year: 'numeric' as const, 
      month: 'long' as const, 
      day: 'numeric' as const
    },
    long: { 
      year: 'numeric' as const, 
      month: 'long' as const, 
      day: 'numeric' as const
    },
    medium: { 
      year: 'numeric' as const, 
      month: 'short' as const, 
      day: 'numeric' as const
    },
    short: { 
      year: 'numeric' as const, 
      month: '2-digit' as const, 
      day: '2-digit' as const
    }
  };
  
  const options = formatOptions[format];

  try {
    return new Intl.DateTimeFormat('zh-CN', options).format(dateObj);
  } catch (error) {
    console.warn('Date formatting error:', error, 'for date:', date);
    return '';
  }
}

/**
 * 格式化日期时间
 */
export function formatDateTime(
  date: string | Date,
  includeSeconds = false
): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // 检查日期是否有效
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' })
  };

  try {
    return new Intl.DateTimeFormat('zh-CN', options).format(dateObj);
  } catch (error) {
    console.warn('DateTime formatting error:', error, 'for date:', date);
    return '';
  }
}

/**
 * 格式化月份
 */
export function formatMonth(yearMonth: string): string {
  if (!yearMonth) return '';
  
  const [year, month] = yearMonth.split('-');
  return `${year}年${parseInt(month)}月`;
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return '刚刚';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`;
  } else if (diffInHours < 24) {
    return `${diffInHours}小时前`;
  } else if (diffInDays < 30) {
    return `${diffInDays}天前`;
  } else {
    return formatDate(dateObj, 'short');
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 格式化持续时间
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);

  return parts.join(' ');
}

/**
 * 格式化电话号码
 */
export function formatPhoneNumber(phone: string): string {
  // 移除所有非数字字符
  const cleaned = phone.replace(/\D/g, '');
  
  // 中国手机号格式: 139 0000 0000
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3');
  }
  
  // 固定电话格式: 010-12345678
  if (cleaned.length >= 10) {
    const areaCode = cleaned.slice(0, cleaned.length - 8);
    const number = cleaned.slice(-8);
    return `${areaCode}-${number.slice(0, 4)} ${number.slice(4)}`;
  }
  
  return phone;
}

/**
 * 格式化身份证号（隐藏中间部分）
 */
export function formatIdNumber(idNumber: string, hideMiddle = true): string {
  if (!idNumber || idNumber.length < 8) return idNumber;
  
  if (hideMiddle) {
    const start = idNumber.slice(0, 6);
    const end = idNumber.slice(-4);
    const middle = '*'.repeat(idNumber.length - 10);
    return `${start}${middle}${end}`;
  }
  
  // 格式化为: 110101 19900101 001X
  if (idNumber.length === 18) {
    return idNumber.replace(/(\d{6})(\d{8})(\d{3}[\dXx])/, '$1 $2 $3');
  }
  
  return idNumber;
}