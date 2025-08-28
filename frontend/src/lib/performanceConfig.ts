/**
 * 前端性能配置
 * 基于数据库 Security Definer 优化后的性能提升进行调整
 */

// 数据库查询性能提升后的前端配置优化
export const PERFORMANCE_CONFIG = {
  // Loading 状态配置
  loading: {
    // 最小显示时间（毫秒）- 从500ms减少到200ms
    minDisplayTime: 200,
    
    // 快速查询超时时间 - 从2000ms减少到1000ms
    quickTimeout: 1000,
    
    // 复杂查询超时时间 - 从5000ms减少到3000ms
    complexTimeout: 3000,
    
    // 骨架屏显示阈值 - 从300ms减少到150ms
    skeletonThreshold: 150,
  },

  // 错误重试策略配置
  retry: {
    // 重试次数
    maxRetries: 3,
    
    // 重试延迟（毫秒）- 从1000ms减少到500ms
    retryDelay: 500,
    
    // 指数退避乘数
    backoffMultiplier: 1.5,
    
    // 最大重试延迟
    maxRetryDelay: 3000,
    
    // 网络错误快速重试延迟 - 从500ms减少到200ms
    networkErrorDelay: 200,
  },

  // 分页策略配置
  pagination: {
    // 默认每页数据量 - 从20增加到50
    defaultPageSize: 50,
    
    // 员工表每页数据量 - 从25增加到75
    employeePageSize: 75,
    
    // 薪资表每页数据量 - 从30增加到60
    payrollPageSize: 60,
    
    // 大表每页数据量（如日志表）- 从50增加到100
    largeTablePageSize: 100,
    
    // 移动端每页数据量 - 从15增加到30
    mobilePageSize: 30,
  },

  // React Query 缓存配置优化
  cache: {
    // 数据新鲜度时间 - 从60秒增加到120秒
    staleTime: 2 * 60 * 1000, // 2分钟
    
    // 缓存时间 - 从5分钟增加到10分钟
    cacheTime: 10 * 60 * 1000, // 10分钟
    
    // 后台重新获取间隔 - 从30秒增加到60秒
    refetchInterval: 60 * 1000, // 1分钟
    
    // 快速缓存失效时间（用于频繁更新的数据）
    fastStaleTime: 30 * 1000, // 30秒
  },

  // 防抖配置优化
  debounce: {
    // 搜索输入防抖 - 从400ms减少到200ms
    search: 200,
    
    // 筛选器防抖 - 从300ms减少到150ms
    filter: 150,
    
    // 表单输入防抖 - 从500ms减少到300ms
    input: 300,
    
    // API调用防抖 - 从600ms减少到400ms
    apiCall: 400,
  },

  // 批量操作配置
  batch: {
    // 批量处理大小 - 从10增加到25
    size: 25,
    
    // 批量请求并发数 - 从3增加到5
    concurrency: 5,
    
    // 批量请求间隔 - 从200ms减少到100ms
    interval: 100,
  },

  // 实时更新配置
  realtime: {
    // 连接重试间隔 - 从2000ms减少到1000ms
    reconnectDelay: 1000,
    
    // 心跳间隔 - 从30秒增加到45秒（减少服务器负载）
    heartbeatInterval: 45 * 1000,
    
    // 事件缓冲时间 - 从500ms减少到200ms
    eventBufferTime: 200,
  },
} as const;

// 根据设备性能动态调整配置
export function getOptimizedConfig() {
  const isMobile = window.innerWidth < 768;
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const isSlowConnection = connection?.effectiveType === '2g' || 
                          connection?.effectiveType === 'slow-2g';

  if (isMobile || isSlowConnection) {
    return {
      ...PERFORMANCE_CONFIG,
      pagination: {
        ...PERFORMANCE_CONFIG.pagination,
        defaultPageSize: PERFORMANCE_CONFIG.pagination.mobilePageSize,
        employeePageSize: 40,
        payrollPageSize: 30,
      },
      loading: {
        ...PERFORMANCE_CONFIG.loading,
        minDisplayTime: 300,
        quickTimeout: 2000,
      },
      retry: {
        ...PERFORMANCE_CONFIG.retry,
        retryDelay: 800,
        maxRetries: 2,
      },
    };
  }

  return PERFORMANCE_CONFIG;
}

// 表格特定配置
export const TABLE_PERFORMANCE_CONFIG = {
  // 虚拟化阈值 - 从100行减少到50行（因为查询更快了）
  virtualizationThreshold: 50,
  
  // 预加载行数 - 从10行增加到20行
  overscanCount: 20,
  
  // 列宽度缓存时间
  columnWidthCacheTime: 24 * 60 * 60 * 1000, // 24小时
  
  // 排序防抖时间 - 从300ms减少到150ms
  sortDebounce: 150,
  
  // 滚动防抖时间 - 从100ms减少到50ms
  scrollDebounce: 50,
};

// 导出类型定义
export type PerformanceConfig = typeof PERFORMANCE_CONFIG;
export type TablePerformanceConfig = typeof TABLE_PERFORMANCE_CONFIG;