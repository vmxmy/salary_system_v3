/**
 * Data Source Configuration Constants
 * 数据源发现和分析的配置常量
 */

export const DATA_SOURCE_CONFIG = {
  // 缓存时间配置 (毫秒)
  CACHE_TIMES: {
    DATA_SOURCES: 5 * 60 * 1000,      // 数据源列表: 5分钟
    COLUMNS: 10 * 60 * 1000,          // 列信息: 10分钟
    RECORD_COUNT: 2 * 60 * 1000,      // 记录数: 2分钟
    VALIDATION: 1 * 60 * 1000,        // 验证结果: 1分钟
  },

  // 数据源评分权重
  SCORING_WEIGHTS: {
    PAYROLL_KEYWORD: 10,              // 表名包含薪资关键词
    PAYROLL_FIELD: 15,                // 包含薪资字段
    EMPLOYEE_FIELD: 10,               // 包含员工字段
    DATE_FIELD: 5,                    // 包含日期字段
    MAX_RECORD_SCORE: 20,             // 记录数最大得分
    RECORD_SCORE_DIVISOR: 10,         // 记录数得分除数
  },

  // 关键词定义
  KEYWORDS: {
    PAYROLL: [
      'payroll', 'salary', 'wage', 'pay', 'compensation',
      'earning', 'income', 'remuneration', '薪资', '工资'
    ] as const,
    EMPLOYEE: [
      'employee_id', 'employee_name', 'employee_code', 'staff_id', 
      'worker_id', 'personnel_id', 'emp_id', 'user_id'
    ] as const,
    PAYROLL_FIELDS: [
      'salary', 'wage', 'pay', 'amount', 'basic_salary', 'total_salary', 
      'net_pay', 'gross_pay', 'bonus', 'allowance', 'deduction'
    ] as const,
    DATE_FIELDS: [
      'date', 'period', 'month', 'year', 'pay_date', 'pay_period',
      'created_at', 'updated_at', 'time'
    ] as const,
  },

  // 查询限制
  QUERY_LIMITS: {
    SAMPLE_SIZE: 1,                   // 样本数据条数
    VALIDATION_SAMPLE: 3,             // 验证时的样本数
    MAX_CONCURRENT_QUERIES: 5,        // 最大并发查询数
    TIMEOUT_MS: 10000,                // 查询超时时间 (10秒)
  },

  // 数据类型映射
  TYPE_INFERENCE: {
    PATTERNS: {
      UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      DATE: /^\d{4}-\d{2}-\d{2}$/,
      TIMESTAMP: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    DEFAULT_TYPE: 'text' as const,
  },

  // 系统表过滤规则
  SYSTEM_TABLE_FILTERS: {
    PREFIXES_TO_EXCLUDE: ['_', 'pg_', 'information_schema', 'auth.'] as const,
    NAMES_TO_EXCLUDE: ['rpc', 'schema', 'migrations'] as const,
  },

  // 错误处理配置
  ERROR_HANDLING: {
    MAX_RETRIES: 2,                   // 最大重试次数
    RETRY_DELAY_MS: 1000,             // 重试延迟 (1秒)
    LOG_LEVELS: {
      ERROR: 'error',
      WARN: 'warn',
      INFO: 'info',
      DEBUG: 'debug',
    } as const,
  },

  // 发现策略优先级
  DISCOVERY_STRATEGIES: {
    PRIORITIES: [
      'supabase_metadata',            // 优先使用 Supabase 元数据
      'information_schema',           // 次选 PostgreSQL information_schema
      'intelligent_probing',          // 最后智能探测
    ] as const,
  },
} as const;

// 类型导出，确保类型安全
export type DataSourceConfigType = typeof DATA_SOURCE_CONFIG;
export type CacheTimeKeys = keyof typeof DATA_SOURCE_CONFIG.CACHE_TIMES;
export type ScoringWeightKeys = keyof typeof DATA_SOURCE_CONFIG.SCORING_WEIGHTS;
export type KeywordCategories = keyof typeof DATA_SOURCE_CONFIG.KEYWORDS;

// 验证配置完整性的工具函数
export const validateConfig = (): boolean => {
  const required = [
    DATA_SOURCE_CONFIG.CACHE_TIMES,
    DATA_SOURCE_CONFIG.SCORING_WEIGHTS,
    DATA_SOURCE_CONFIG.KEYWORDS,
    DATA_SOURCE_CONFIG.QUERY_LIMITS
  ];
  
  return required.every(section => section && Object.keys(section).length > 0);
};

// 获取配置值的工具函数
export const getConfigValue = <T extends keyof DataSourceConfigType>(
  section: T,
  key: keyof DataSourceConfigType[T]
): DataSourceConfigType[T][keyof DataSourceConfigType[T]] => {
  return DATA_SOURCE_CONFIG[section][key];
};