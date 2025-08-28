// 格式化工具函数

/**
 * 格式化金额
 * @param amount 金额数值
 * @param showSymbol 是否显示货币符号
 * @param precision 小数位数，默认2位
 */
export function formatCurrency(
  amount: number | null | undefined, 
  showSymbol = false,
  precision = 2
): string {
  if (amount === null || amount === undefined) {
    return '--';
  }

  const formattedAmount = new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  }).format(amount);

  return showSymbol ? `¥${formattedAmount}` : formattedAmount;
}

/**
 * 格式化百分比
 * @param value 数值
 * @param precision 小数位数，默认2位
 */
export function formatPercent(
  value: number | null | undefined, 
  precision = 2
): string {
  if (value === null || value === undefined) {
    return '--';
  }

  return `${(value * 100).toFixed(precision)}%`;
}

/**
 * 格式化日期
 * @param date 日期字符串或Date对象
 * @param format 格式类型
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: 'date' | 'datetime' | 'time' | 'month' | 'year' = 'date'
): string {
  if (!date) {
    return '--';
  }

  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return '--';
  }

  const options: Intl.DateTimeFormatOptions = {};

  switch (format) {
    case 'date':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'datetime':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      break;
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      break;
    case 'month':
      options.year = 'numeric';
      options.month = 'long';
      break;
    case 'year':
      options.year = 'numeric';
      break;
  }

  return new Intl.DateTimeFormat('zh-CN', options).format(d);
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 格式化数字（添加千分位分隔符）
 * @param number 数字
 * @param precision 小数位数
 */
export function formatNumber(
  number: number | null | undefined,
  precision?: number
): string {
  if (number === null || number === undefined) {
    return '--';
  }

  const options: Intl.NumberFormatOptions = {};
  
  if (precision !== undefined) {
    options.minimumFractionDigits = precision;
    options.maximumFractionDigits = precision;
  }

  return new Intl.NumberFormat('zh-CN', options).format(number);
}

/**
 * 解析金额字符串（去除格式化）
 * @param amountStr 格式化的金额字符串
 */
export function parseCurrency(amountStr: string): number | null {
  if (!amountStr || amountStr === '--') {
    return null;
  }

  // 去除所有非数字和小数点的字符
  const cleaned = amountStr.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? null : parsed;
}

/**
 * 格式化电话号码
 * @param phone 电话号码
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) {
    return '--';
  }

  // 手机号码格式化：138 1234 5678
  if (/^1[3-9]\d{9}$/.test(phone)) {
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3');
  }

  // 固定电话格式化：010-1234 5678
  if (/^\d{3,4}-?\d{7,8}$/.test(phone)) {
    const cleaned = phone.replace('-', '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2 $3');
    } else if (cleaned.length === 11) {
      return cleaned.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2 $3');
    }
  }

  return phone;
}

/**
 * 格式化身份证号码（脱敏）
 * @param idCard 身份证号码
 * @param maskLength 脱敏长度
 */
export function formatIdCard(
  idCard: string | null | undefined,
  maskLength = 8
): string {
  if (!idCard) {
    return '--';
  }

  if (idCard.length < maskLength + 4) {
    return idCard;
  }

  const start = idCard.slice(0, 4);
  const end = idCard.slice(-4);
  const mask = '*'.repeat(maskLength);

  return `${start}${mask}${end}`;
}

/**
 * 格式化相对时间
 * @param date 日期
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const target = typeof date === 'string' ? new Date(date) : date;
  const diff = now.getTime() - target.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  if (years > 0) {
    return `${years}年前`;
  } else if (months > 0) {
    return `${months}个月前`;
  } else if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
}

/**
 * 格式化薪资期间
 * @param period YYYY-MM格式的期间字符串
 */
export function formatPeriod(period: string | null | undefined): string {
  if (!period) {
    return '--';
  }

  try {
    const [year, month] = period.split('-');
    return `${year}年${parseInt(month)}月`;
  } catch {
    return period;
  }
}

/**
 * 格式化员工状态
 * @param status 员工状态
 */
export function formatEmployeeStatus(
  status: 'active' | 'resigned' | 'suspended' | null | undefined
): string {
  const statusMap = {
    active: '在职',
    resigned: '离职',
    suspended: '停薪留职'
  };

  return status ? statusMap[status] : '--';
}

/**
 * 格式化数据状态
 * @param status 数据状态
 */
export function formatDataStatus(
  status: 'draft' | 'confirmed' | 'locked' | 'archived' | null | undefined
): string {
  const statusMap = {
    draft: '草稿',
    confirmed: '已确认',
    locked: '已锁定',
    archived: '已归档'
  };

  return status ? statusMap[status] : '--';
}