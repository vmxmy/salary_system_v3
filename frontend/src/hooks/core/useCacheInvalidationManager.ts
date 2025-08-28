import { useQueryClient } from '@tanstack/react-query';

// 缓存失效事件类型定义
export type CacheInvalidationEvent = 
  // 薪资相关事件
  | 'payroll:item:created' 
  | 'payroll:item:updated' 
  | 'payroll:item:deleted'
  | 'payroll:created'
  | 'payroll:updated'
  | 'payroll:deleted'
  | 'payroll:approved'
  | 'payroll:rejected'
  
  // 员工相关事件
  | 'employee:created'
  | 'employee:updated' 
  | 'employee:deleted'
  | 'employee:position:assigned'
  | 'employee:category:changed'
  
  // 五险一金相关事件
  | 'insurance:base:updated'
  | 'insurance:config:updated'
  | 'contribution:base:updated'
  
  // 部门和职位相关事件
  | 'department:created'
  | 'department:updated'
  | 'department:deleted'
  | 'position:created'
  | 'position:updated'
  | 'position:deleted'
  
  // 薪资组件相关事件
  | 'salary-component:created'
  | 'salary-component:updated'
  | 'salary-component:deleted'
  
  // 周期相关事件
  | 'payroll-period:created'
  | 'payroll-period:updated'
  | 'payroll-period:completed'
  | 'payroll-period:cleared'
  | 'payroll-period:finalized'
  
  // 报告相关事件
  | 'report:template:created'
  | 'report:template:updated'
  | 'report:template:deleted'
  | 'report:job:created'
  | 'report:job:updated'
  | 'report:generated'
  
  // 系统配置相关事件
  | 'system:settings:updated'
  | 'view:personalization:updated'
  
  // 批量操作相关事件
  | 'insurance:batch:calculated'
  | 'payroll:batch:created'
  | 'payroll:batch:updated';

// 缓存失效配置接口
interface CacheInvalidationConfig {
  event: CacheInvalidationEvent;
  queries: string[][];  // 查询键数组
  dynamicQueries?: (context: any) => string[][]; // 动态查询键生成函数
}

// 预定义的缓存失效配置映射
const CACHE_INVALIDATION_MAP: Record<CacheInvalidationEvent, CacheInvalidationConfig> = {
  // 薪资项目相关失效配置
  'payroll:item:created': {
    event: 'payroll:item:created',
    queries: [
      ['payrolls', 'list'],
      ['payrolls', 'statistics'], 
      ['payroll', 'unified'],
      ['view_payroll_unified'],
      ['view_payroll_summary'],
      ['payroll-earnings'],
      ['batch-payroll'] // 批量薪资查询缓存
    ],
    dynamicQueries: (context: { payrollId?: string }) => [
      ...(context.payrollId ? [
        ['payrolls', 'detail', context.payrollId],
        ['payroll-detail', context.payrollId],
        ['payrolls', 'items', context.payrollId],
        ['payroll-earnings', 'payroll', context.payrollId]
      ] : [])
    ]
  },

  'payroll:item:updated': {
    event: 'payroll:item:updated', 
    queries: [
      ['payrolls', 'list'],
      ['payrolls', 'statistics'],
      ['payroll', 'unified'],
      ['view_payroll_unified'],
      ['view_payroll_summary'],
      ['payroll-earnings'],
      ['batch-payroll'] // 批量薪资查询缓存
    ],
    dynamicQueries: (context: { payrollId?: string }) => [
      ...(context.payrollId ? [
        ['payrolls', 'detail', context.payrollId],
        ['payroll-detail', context.payrollId],
        ['payrolls', 'items', context.payrollId],
        ['payroll-earnings', 'payroll', context.payrollId]
      ] : [])
    ]
  },

  'payroll:item:deleted': {
    event: 'payroll:item:deleted',
    queries: [
      ['payrolls', 'list'],
      ['payrolls', 'statistics'],
      ['payroll', 'unified'], 
      ['view_payroll_unified'],
      ['view_payroll_summary'],
      ['payroll-earnings'],
      ['batch-payroll'] // 批量薪资查询缓存
    ],
    dynamicQueries: (context: { payrollId?: string }) => [
      ...(context.payrollId ? [
        ['payrolls', 'detail', context.payrollId],
        ['payroll-detail', context.payrollId],
        ['payrolls', 'items', context.payrollId],
        ['payroll-earnings', 'payroll', context.payrollId]
      ] : [])
    ]
  },

  // 员工职位分配失效配置
  'employee:position:assigned': {
    event: 'employee:position:assigned',
    queries: [
      ['payrolls', 'list'],  // 职位变更可能影响薪资标准
      ['payrolls', 'statistics'],
      ['view_payroll_summary'],
      ['view_payroll_unified'],
      ['employees', 'list'],
      ['departments', 'positions']
    ],
    dynamicQueries: (context: { employeeId?: string; departmentId?: string; payrollId?: string }) => [
      ...(context.employeeId ? [
        ['employees', 'position', context.employeeId],
        ['employees', 'position-history', context.employeeId],
        ['employees', 'detail', context.employeeId]
      ] : []),
      ...(context.departmentId ? [
        ['departments', 'positions', context.departmentId]
      ] : []),
      ...(context.payrollId ? [
        ['payrolls', 'detail', context.payrollId]
      ] : [])
    ]
  },

  // 缴费基数更新失效配置
  'contribution:base:updated': {
    event: 'contribution:base:updated',
    queries: [
      ['payrolls', 'list'],
      ['payrolls', 'statistics'],
      ['payrolls', 'detail'],
      ['insurance', 'calculation'],
      ['contribution-base']
    ],
    dynamicQueries: (context: { employeeId?: string; periodId?: string }) => [
      ...(context.employeeId && context.periodId ? [
        ['contribution-base', 'employee', context.employeeId, context.periodId],
        ['contribution-base', 'employee-history', context.employeeId]
      ] : []),
      ...(context.periodId ? [
        ['contribution-base', 'period', context.periodId]
      ] : [])
    ]
  },

  // 薪资创建失效配置
  'payroll:created': {
    event: 'payroll:created',
    queries: [
      ['payrolls', 'list'],
      ['payrolls', 'statistics'],
      ['employees', 'payroll-status'],
      ['dashboard', 'overview'],
      ['batch-payroll'] // 批量薪资查询缓存
    ],
    dynamicQueries: (context: { employeeId?: string; periodId?: string }) => [
      ...(context.employeeId ? [
        ['employees', 'payrolls', context.employeeId]
      ] : []),
      ...(context.periodId ? [
        ['payroll-periods', context.periodId, 'completeness']
      ] : [])
    ]
  },

  // 薪资更新失效配置
  'payroll:updated': {
    event: 'payroll:updated',
    queries: [
      ['payrolls', 'list'],
      ['payrolls', 'statistics'],
      ['view_payroll_summary'],
      ['view_payroll_unified'],
      ['batch-payroll'] // 批量薪资查询缓存
    ],
    dynamicQueries: (context: { payrollId?: string; employeeId?: string }) => [
      ...(context.payrollId ? [
        ['payrolls', 'detail', context.payrollId],
        ['payroll-detail', context.payrollId]
      ] : []),
      ...(context.employeeId ? [
        ['employees', 'payrolls', context.employeeId]
      ] : [])
    ]
  },

  // 薪资审批失效配置
  'payroll:approved': {
    event: 'payroll:approved',
    queries: [
      ['payrolls', 'list'],
      ['payrolls', 'statistics'],
      ['payrolls', 'approval-queue'],
      ['dashboard', 'overview'],
      ['batch-payroll'] // 批量薪资查询缓存
    ],
    dynamicQueries: (context: { payrollId?: string; employeeId?: string; periodId?: string }) => [
      ...(context.payrollId ? [
        ['payrolls', 'detail', context.payrollId]
      ] : []),
      ...(context.employeeId ? [
        ['employees', 'payrolls', context.employeeId]
      ] : []),
      ...(context.periodId ? [
        ['payroll-periods', context.periodId, 'completeness']
      ] : [])
    ]
  },

  // 薪资相关事件配置
  'payroll:deleted': { 
    event: 'payroll:deleted', 
    queries: [['payrolls', 'list'], ['payrolls', 'statistics'], ['batch-payroll']] 
  },
  'payroll:rejected': { 
    event: 'payroll:rejected', 
    queries: [['payrolls', 'list'], ['payrolls', 'approval-queue'], ['batch-payroll']] 
  },

  // 报告系统失效配置
  'report:template:created': {
    event: 'report:template:created',
    queries: [
      ['reports'],  // 失效所有报表相关查询
      ['reports', 'templates'],
      ['reports', 'statistics'],
      ['dashboard', 'overview']
    ],
    dynamicQueries: (context: { category?: string; filters?: any }) => [
      // 失效不同筛选条件的模板查询
      ...(context.filters ? [
        ['reports', 'templates', context.filters]
      ] : []),
      // 失效特定分类的查询
      ...(context.category ? [
        ['reports', 'templates', { category: context.category }]
      ] : [])
    ]
  },

  'report:template:updated': {
    event: 'report:template:updated',
    queries: [
      ['reports'],  // 失效所有报表相关查询
      ['reports', 'templates'],
      ['reports', 'statistics']
    ],
    dynamicQueries: (context: { templateId?: string; category?: string; filters?: any }) => [
      ...(context.templateId ? [
        ['reports', 'template', context.templateId]
      ] : []),
      // 失效不同筛选条件的模板查询
      ...(context.filters ? [
        ['reports', 'templates', context.filters]
      ] : []),
      // 失效特定分类的查询
      ...(context.category ? [
        ['reports', 'templates', { category: context.category }]
      ] : [])
    ]
  },

  'report:template:deleted': {
    event: 'report:template:deleted',
    queries: [
      ['reports'],  // 失效所有报表相关查询
      ['reports', 'templates'],
      ['reports', 'statistics']
    ],
    dynamicQueries: (context: { templateId?: string; category?: string; filters?: any }) => [
      ...(context.templateId ? [
        ['reports', 'template', context.templateId]
      ] : []),
      // 失效不同筛选条件的模板查询
      ...(context.filters ? [
        ['reports', 'templates', context.filters]
      ] : []),
      // 失效特定分类的查询
      ...(context.category ? [
        ['reports', 'templates', { category: context.category }]
      ] : [])
    ]
  },

  'report:job:created': {
    event: 'report:job:created',
    queries: [
      ['reports'],
      ['reports', 'jobs'],
      ['reports', 'statistics'],
      ['dashboard', 'recent-activities']
    ],
    dynamicQueries: (context: { templateId?: string; status?: string; filters?: any }) => [
      ...(context.templateId ? [
        ['reports', 'jobs', { templateId: context.templateId }]
      ] : []),
      ...(context.status ? [
        ['reports', 'jobs', { status: context.status }]
      ] : []),
      ...(context.filters ? [
        ['reports', 'jobs', context.filters]
      ] : [])
    ]
  },

  'report:job:updated': {
    event: 'report:job:updated',
    queries: [
      ['reports'],
      ['reports', 'jobs'],
      ['reports', 'statistics']
    ],
    dynamicQueries: (context: { jobId?: string; templateId?: string; filters?: any }) => [
      ...(context.jobId ? [
        ['reports', 'job', context.jobId]
      ] : []),
      ...(context.templateId ? [
        ['reports', 'jobs', { templateId: context.templateId }]
      ] : []),
      ...(context.filters ? [
        ['reports', 'jobs', context.filters]
      ] : [])
    ]
  },

  'report:generated': {
    event: 'report:generated',
    queries: [
      ['reports'],
      ['reports', 'jobs'],
      ['reports', 'history'],
      ['reports', 'statistics'],
      ['dashboard', 'overview']
    ],
    dynamicQueries: (context: { jobId?: string; templateId?: string; filters?: any }) => [
      ...(context.jobId ? [
        ['reports', 'job', context.jobId]
      ] : []),
      ...(context.templateId ? [
        ['reports', 'history', { templateId: context.templateId }]
      ] : []),
      ...(context.filters ? [
        ['reports', 'history', context.filters]
      ] : [])
    ]
  },

  // 批量操作失效配置
  'insurance:batch:calculated': {
    event: 'insurance:batch:calculated',
    queries: [
      ['insurance', 'calculation'],
      ['payrolls', 'list'],
      ['payrolls', 'statistics'],
      ['contribution-base'],
      ['dashboard', 'overview'],
      ['batch-payroll'] // 批量薪资查询缓存
    ],
    dynamicQueries: (context: { employeeIds?: string[]; periodId?: string }) => [
      ...(context.periodId ? [
        ['payroll-periods', context.periodId, 'completeness']
      ] : []),
      ...(context.employeeIds ? 
        context.employeeIds.map(employeeId => ['employees', 'insurance', employeeId]) : []
      )
    ]
  },

  'payroll:batch:created': {
    event: 'payroll:batch:created',
    queries: [
      ['payrolls', 'list'],
      ['payrolls', 'statistics'],
      ['employees', 'payroll-status'],
      ['dashboard', 'overview'],
      ['batch-payroll'] // 批量薪资查询缓存
    ]
  },

  // 系统配置失效配置
  'system:settings:updated': {
    event: 'system:settings:updated',
    queries: [
      ['system', 'settings'],
      ['system', 'config'],
      // 系统配置变更可能影响所有计算，需要失效相关查询
      ['payrolls', 'statistics'],
      ['insurance', 'config']
    ]
  },

  'view:personalization:updated': {
    event: 'view:personalization:updated',
    queries: [
      ['personalization', 'views'],
      ['user', 'preferences']
    ]
  },
  'employee:created': { event: 'employee:created', queries: [['employees', 'list']] },
  'employee:updated': { event: 'employee:updated', queries: [['employees', 'list']] },
  'employee:deleted': { event: 'employee:deleted', queries: [['employees', 'list']] },
  'employee:category:changed': { event: 'employee:category:changed', queries: [['employees', 'list']] },
  'insurance:base:updated': { event: 'insurance:base:updated', queries: [['insurance', 'bases']] },
  'insurance:config:updated': { event: 'insurance:config:updated', queries: [['insurance', 'config']] },
  'department:created': { event: 'department:created', queries: [['departments', 'list']] },
  'department:updated': { event: 'department:updated', queries: [['departments', 'list']] },
  'department:deleted': { event: 'department:deleted', queries: [['departments', 'list']] },
  'position:created': { event: 'position:created', queries: [['positions', 'list']] },
  'position:updated': { event: 'position:updated', queries: [['positions', 'list']] },
  'position:deleted': { event: 'position:deleted', queries: [['positions', 'list']] },
  'salary-component:created': { event: 'salary-component:created', queries: [['salary-components', 'list']] },
  'salary-component:updated': { event: 'salary-component:updated', queries: [['salary-components', 'list']] },
  'salary-component:deleted': { event: 'salary-component:deleted', queries: [['salary-components', 'list']] },
  'payroll-period:created': { event: 'payroll-period:created', queries: [['payroll-periods', 'list']] },
  'payroll-period:updated': { event: 'payroll-period:updated', queries: [['payroll-periods', 'list']] },
  'payroll-period:completed': { event: 'payroll-period:completed', queries: [['payroll-periods', 'list']] },
  'payroll-period:cleared': { event: 'payroll-period:cleared', queries: [['payroll-periods', 'list']] },
  'payroll-period:finalized': { event: 'payroll-period:finalized', queries: [['payroll-periods', 'list']] },
  'payroll:batch:updated': { 
    event: 'payroll:batch:updated', 
    queries: [['payrolls', 'list'], ['batch-payroll']] 
  }
};

/**
 * 统一缓存失效管理器
 * 
 * 使用方式：
 * ```typescript
 * const cacheManager = useCacheInvalidationManager();
 * 
 * // 在mutation的onSuccess中调用
 * await cacheManager.invalidateByEvent('payroll:item:created', { 
 *   payrollId: data.payroll_id 
 * });
 * ```
 */
export const useCacheInvalidationManager = () => {
  const queryClient = useQueryClient();

  /**
   * 根据事件类型自动失效相关缓存
   * @param event 缓存失效事件类型
   * @param context 动态上下文数据（如ID等）
   * @param additionalQueries 额外需要失效的查询键
   */
  const invalidateByEvent = async (
    event: CacheInvalidationEvent, 
    context: any = {},
    additionalQueries: string[][] = []
  ) => {
    const config = CACHE_INVALIDATION_MAP[event];
    if (!config) {
      console.warn(`[CacheInvalidationManager] 未找到事件 "${event}" 的缓存失效配置`);
      return;
    }

    console.log(`[CacheInvalidationManager] 开始处理事件: ${event}`, context);

    // 收集所有需要失效的查询键
    const allQueries: string[][] = [
      ...config.queries,
      ...additionalQueries
    ];

    // 添加动态查询键
    if (config.dynamicQueries) {
      allQueries.push(...config.dynamicQueries(context));
    }

    // 批量失效查询
    const invalidationPromises = allQueries.map(queryKey => {
      console.log(`[CacheInvalidationManager] 失效查询: ${JSON.stringify(queryKey)}`);
      return queryClient.invalidateQueries({ queryKey });
    });

    try {
      await Promise.all(invalidationPromises);
      console.log(`[CacheInvalidationManager] 事件 "${event}" 缓存失效完成，共失效 ${allQueries.length} 个查询`);
    } catch (error) {
      console.error(`[CacheInvalidationManager] 事件 "${event}" 缓存失效失败:`, error);
    }
  };

  /**
   * 直接失效指定的查询键列表
   * @param queryKeys 查询键列表
   */
  const invalidateQueries = async (queryKeys: string[][]) => {
    const invalidationPromises = queryKeys.map(queryKey => 
      queryClient.invalidateQueries({ queryKey })
    );
    await Promise.all(invalidationPromises);
  };

  /**
   * 获取指定事件的失效配置
   * @param event 事件类型
   * @returns 失效配置或undefined
   */
  const getEventConfig = (event: CacheInvalidationEvent) => {
    return CACHE_INVALIDATION_MAP[event];
  };

  /**
   * 注册自定义事件配置
   * @param event 事件类型
   * @param config 失效配置
   */
  const registerEventConfig = (event: CacheInvalidationEvent, config: CacheInvalidationConfig) => {
    CACHE_INVALIDATION_MAP[event] = config;
  };

  return {
    invalidateByEvent,
    invalidateQueries,
    getEventConfig,
    registerEventConfig
  };
};

/**
 * 缓存失效管理器的工具函数
 */
export const CacheInvalidationUtils = {
  /**
   * 创建薪资相关的上下文对象
   */
  createPayrollContext: (payrollId?: string, employeeId?: string, periodId?: string) => ({
    payrollId,
    employeeId, 
    periodId
  }),

  /**
   * 创建员工相关的上下文对象
   */
  createEmployeeContext: (employeeId?: string, departmentId?: string, positionId?: string) => ({
    employeeId,
    departmentId,
    positionId
  }),

  /**
   * 创建缴费基数相关的上下文对象
   */
  createContributionContext: (employeeId?: string, periodId?: string, insuranceTypeId?: string) => ({
    employeeId,
    periodId,
    insuranceTypeId
  })
};