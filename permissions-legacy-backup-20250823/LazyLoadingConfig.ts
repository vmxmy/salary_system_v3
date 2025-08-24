import { lazy } from 'react';

/**
 * 懒加载配置文件
 * 
 * 为增强仪表板系统配置组件懒加载策略
 * 优化应用启动性能和资源使用效率
 */

// 核心仪表板组件懒加载
export const EnhancedDashboardModule = lazy(() => 
  import('@/components/statistics/EnhancedDashboardModule').then(module => ({
    default: module.EnhancedDashboardModule
  }))
);

// 智能决策仪表板懒加载
export const SmartDecisionDashboard = lazy(() => 
  import('@/components/dashboard/modules/SmartDecisionDashboard').then(module => ({
    default: module.SmartDecisionDashboard
  }))
);

// 实时监控面板懒加载
export const RealtimeMonitoringPanel = lazy(() => 
  import('@/components/dashboard/modules/RealtimeMonitoringPanel').then(module => ({
    default: module.RealtimeMonitoringPanel
  }))
);

// 管理洞察中心懒加载
export const ManagementInsightsCenter = lazy(() => 
  import('@/components/dashboard/modules/ManagementInsightsCenter').then(module => ({
    default: module.ManagementInsightsCenter
  }))
);

// 交互式可视化模块懒加载
export const InteractiveVisualizationModule = lazy(() => 
  import('@/components/dashboard/modules/InteractiveVisualizationModule').then(module => ({
    default: module.InteractiveVisualizationModule
  }))
);

// 快速行动中心懒加载
export const QuickActionCenter = lazy(() => 
  import('@/components/dashboard/modules/QuickActionCenter').then(module => ({
    default: module.QuickActionCenter
  }))
);

// 数据故事化模块懒加载
export const DataStorytellingModule = lazy(() => 
  import('@/components/dashboard/modules/DataStorytellingModule').then(module => ({
    default: module.DataStorytellingModule
  }))
);

// 增强组件懒加载
export const SmartKPICard = lazy(() => 
  import('@/components/dashboard/enhanced/SmartKPICard').then(module => ({
    default: module.SmartKPICard
  }))
);

export const InteractiveInsightPanel = lazy(() => 
  import('@/components/dashboard/enhanced/InteractiveInsightPanel').then(module => ({
    default: module.InteractiveInsightPanel
  }))
);

export const RealTimeMonitorCard = lazy(() => 
  import('@/components/dashboard/enhanced/RealTimeMonitorCard').then(module => ({
    default: module.RealTimeMonitorCard
  }))
);

// Hooks 懒加载策略（使用动态导入）
export const lazyLoadHook = {
  useManagementDashboard: () => 
    import('@/hooks/management/useManagementDashboard').then(module => module.useManagementDashboard),
  
  useSystemMonitoring: () => 
    import('@/hooks/monitoring/useSystemMonitoring').then(module => module.useSystemMonitoring),
  
  usePersonalizedView: () => 
    import('@/hooks/personalization/usePersonalizedView').then(module => module.usePersonalizedView)
};

/**
 * 组件预加载策略
 * 在用户可能需要时提前加载组件
 */
export const preloadComponents = {
  // 预加载核心组件
  preloadCore: () => {
    Promise.all([
      import('@/components/statistics/EnhancedDashboardModule'),
      import('@/components/dashboard/modules/SmartDecisionDashboard')
    ]);
  },

  // 预加载可视化组件
  preloadVisualization: () => {
    Promise.all([
      import('@/components/dashboard/modules/InteractiveVisualizationModule'),
      import('@/components/dashboard/modules/DataStorytellingModule')
    ]);
  },

  // 预加载管理工具
  preloadManagement: () => {
    Promise.all([
      import('@/components/dashboard/modules/ManagementInsightsCenter'),
      import('@/components/dashboard/modules/QuickActionCenter')
    ]);
  },

  // 预加载监控工具
  preloadMonitoring: () => {
    import('@/components/dashboard/modules/RealtimeMonitoringPanel');
  }
};

/**
 * 加载优先级配置
 */
export const LOADING_PRIORITIES = {
  CRITICAL: 0,    // 立即加载
  HIGH: 1,        // 用户交互时加载
  MEDIUM: 2,      // 空闲时预加载
  LOW: 3          // 按需加载
} as const;

/**
 * 组件加载配置
 */
export const COMPONENT_LOAD_CONFIG = {
  'EnhancedDashboardModule': {
    priority: LOADING_PRIORITIES.CRITICAL,
    preload: true,
    chunkName: 'enhanced-dashboard'
  },
  'SmartDecisionDashboard': {
    priority: LOADING_PRIORITIES.HIGH,
    preload: true,
    chunkName: 'smart-decision'
  },
  'RealtimeMonitoringPanel': {
    priority: LOADING_PRIORITIES.HIGH,
    preload: false,
    chunkName: 'realtime-monitoring'
  },
  'ManagementInsightsCenter': {
    priority: LOADING_PRIORITIES.MEDIUM,
    preload: false,
    chunkName: 'management-insights'
  },
  'InteractiveVisualizationModule': {
    priority: LOADING_PRIORITIES.MEDIUM,
    preload: false,
    chunkName: 'interactive-visualization'
  },
  'QuickActionCenter': {
    priority: LOADING_PRIORITIES.LOW,
    preload: false,
    chunkName: 'quick-actions'
  },
  'DataStorytellingModule': {
    priority: LOADING_PRIORITIES.LOW,
    preload: false,
    chunkName: 'data-storytelling'
  }
} as const;

/**
 * 性能监控工具
 */
export class ComponentLoadingPerformance {
  private static loadTimes = new Map<string, number>();
  private static loadErrors = new Map<string, Error>();

  static startLoading(componentName: string) {
    this.loadTimes.set(`${componentName}_start`, performance.now());
  }

  static endLoading(componentName: string) {
    const startTime = this.loadTimes.get(`${componentName}_start`);
    if (startTime) {
      const loadTime = performance.now() - startTime;
      this.loadTimes.set(`${componentName}_duration`, loadTime);
      console.log(`[Performance] ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
    }
  }

  static recordError(componentName: string, error: Error) {
    this.loadErrors.set(componentName, error);
    console.error(`[Performance] Failed to load ${componentName}:`, error);
  }

  static getPerformanceReport() {
    const report = {
      loadTimes: Object.fromEntries(this.loadTimes),
      errors: Object.fromEntries(this.loadErrors),
      totalComponents: Array.from(this.loadTimes.keys()).filter(key => key.endsWith('_duration')).length
    };
    
    return report;
  }

  static clearMetrics() {
    this.loadTimes.clear();
    this.loadErrors.clear();
  }
}

/**
 * 智能预加载器
 * 基于用户行为模式智能预加载组件
 */
export class SmartPreloader {
  private static userInteractions = new Map<string, number>();
  private static preloadQueue: string[] = [];

  static recordInteraction(componentName: string) {
    const count = this.userInteractions.get(componentName) || 0;
    this.userInteractions.set(componentName, count + 1);
    
    // 如果用户频繁访问某个组件，提高其预加载优先级
    if (count >= 3 && !this.preloadQueue.includes(componentName)) {
      this.preloadQueue.unshift(componentName);
      this.processPreloadQueue();
    }
  }

  private static async processPreloadQueue() {
    if (this.preloadQueue.length === 0) return;

    const componentName = this.preloadQueue.shift();
    if (!componentName) return;

    try {
      ComponentLoadingPerformance.startLoading(`preload_${componentName}`);
      
      // 根据组件名动态导入
      switch (componentName) {
        case 'ManagementInsightsCenter':
          await import('@/components/dashboard/modules/ManagementInsightsCenter');
          break;
        case 'InteractiveVisualizationModule':
          await import('@/components/dashboard/modules/InteractiveVisualizationModule');
          break;
        case 'DataStorytellingModule':
          await import('@/components/dashboard/modules/DataStorytellingModule');
          break;
        case 'QuickActionCenter':
          await import('@/components/dashboard/modules/QuickActionCenter');
          break;
      }
      
      ComponentLoadingPerformance.endLoading(`preload_${componentName}`);
    } catch (error) {
      ComponentLoadingPerformance.recordError(`preload_${componentName}`, error as Error);
    }

    // 继续处理队列中的下一个组件
    setTimeout(() => this.processPreloadQueue(), 100);
  }

  static getUsageStats() {
    return Object.fromEntries(this.userInteractions);
  }

  static clearStats() {
    this.userInteractions.clear();
    this.preloadQueue = [];
  }
}