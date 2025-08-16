/**
 * 日期工具函数
 */

/**
 * 根据年月获取该月的开始和结束日期
 * @param yearMonth 格式: YYYY-MM
 * @returns { startDate: string, endDate: string } 格式: YYYY-MM-DD
 */
export function getMonthDateRange(yearMonth: string): { startDate: string; endDate: string } {
  if (!yearMonth) {
    return { startDate: '', endDate: '' };
  }

  const [year, month] = yearMonth.split('-').map(Number);
  
  // 直接构造日期字符串，避免时区问题
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  
  // 获取下个月的第一天，然后减去一天得到当月最后一天
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  
  // 创建下个月第一天的日期对象（使用中国时区）
  const nextMonthFirst = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+08:00`);
  
  // 减去一天得到当月最后一天
  const lastDayDate = new Date(nextMonthFirst.getTime() - 1);
  
  // 格式化为 YYYY-MM-DD
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
  
  return {
    startDate,
    endDate
  };
}

/**
 * 获取当前年月
 * @returns 格式: YYYY-MM
 */
export function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 获取上个月年月
 * @returns 格式: YYYY-MM
 */
export function getLastYearMonth(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  
  if (month === 0) {
    return `${year - 1}-12`;
  }
  
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * 获取上个月年月 (别名函数)
 * @returns 格式: YYYY-MM
 */
export function getPreviousMonth(): string {
  return getLastYearMonth();
}

/**
 * 比较两个年月的大小
 * @param yearMonth1 格式: YYYY-MM
 * @param yearMonth2 格式: YYYY-MM
 * @returns -1: yearMonth1 < yearMonth2, 0: 相等, 1: yearMonth1 > yearMonth2
 */
export function compareYearMonth(yearMonth1: string, yearMonth2: string): number {
  if (yearMonth1 === yearMonth2) return 0;
  return yearMonth1 < yearMonth2 ? -1 : 1;
}

/**
 * 格式化年月为中文显示
 * @param yearMonth 格式: YYYY-MM
 * @returns 格式: YYYY年M月
 */
export function formatYearMonth(yearMonth: string): string {
  if (!yearMonth) return '';
  
  const [year, month] = yearMonth.split('-');
  return `${year}年${parseInt(month)}月`;
}

/**
 * 格式化月份为中文显示
 * @param month 月份数字 (1-12) 或字符串格式的月份，也支持 YYYY-MM 格式
 * @returns 格式: M月 或 YYYY年M月
 */
export function formatMonth(month: number | string): string {
  if (!month) return '';
  
  // 如果是 YYYY-MM 格式，提取月份部分
  if (typeof month === 'string' && month.includes('-')) {
    const [year, monthPart] = month.split('-');
    const monthNum = parseInt(monthPart);
    return `${year}年${monthNum}月`;
  }
  
  const monthNum = typeof month === 'string' ? parseInt(month) : month;
  return `${monthNum}月`;
}

/**
 * 格式化日期为中文显示
 * @param date 日期字符串或Date对象
 * @param format 格式化方式 'date' | 'datetime' | 'time'
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: string | Date | null | undefined, format: 'date' | 'datetime' | 'time' = 'datetime'): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  
  switch (format) {
    case 'date':
      return `${year}-${month}-${day}`;
    case 'time':
      return `${hours}:${minutes}:${seconds}`;
    case 'datetime':
    default:
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}