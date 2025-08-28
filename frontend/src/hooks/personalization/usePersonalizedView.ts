import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCacheInvalidationManager } from '@/hooks/core/useCacheInvalidationManager';

// 个性化配置类型定义
export interface PersonalizedViewConfig {
  userId: string;
  layout: 'compact' | 'detailed' | 'executive' | 'mobile';
  activeModules: DashboardModule[];
  defaultTimeRange: '1month' | '3months' | '6months' | '12months';
  preferredChartTypes: Record<string, ChartType>;
  customFilters: FilterConfig[];
  dashboardOrder: string[];
  refreshInterval: number; // 秒
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationSettings;
  quickActions: QuickActionConfig[];
  lastModified: string;
}

export interface DashboardModule {
  id: string;
  name: string;
  enabled: boolean;
  position: number;
  size: 'small' | 'medium' | 'large' | 'full';
  collapsed: boolean;
  customSettings: Record<string, any>;
}

export interface FilterConfig {
  id: string;
  name: string;
  type: 'department' | 'period' | 'status' | 'category';
  value: any;
  enabled: boolean;
  persistent: boolean; // 是否在会话间保持
}

export interface QuickActionConfig {
  id: string;
  label: string;
  action: string;
  icon: string;
  enabled: boolean;
  order: number;
}

export interface NotificationSettings {
  enabled: boolean;
  types: ('alerts' | 'reports' | 'approvals' | 'updates')[];
  frequency: 'immediate' | 'hourly' | 'daily';
  channels: ('browser' | 'email')[];
}

export type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'table';

// 视图状态管理类型
export interface ViewState {
  currentLayout: string;
  visibleModules: string[];
  filterStates: Record<string, any>;
  sortStates: Record<string, any>;
  expandedSections: string[];
  selectedTimeRange: string;
  isCustomizing: boolean;
}

// 用户偏好分析数据
export interface UserPreferenceAnalytics {
  mostUsedFeatures: string[];
  preferredTimeRange: string;
  averageSessionDuration: number;
  frequentFilters: FilterConfig[];
  usagePattern: 'morning' | 'afternoon' | 'evening' | 'mixed';
  devicePreference: 'desktop' | 'mobile' | 'tablet' | 'mixed';
}

/**
 * 个性化视图Hook
 * 
 * 管理用户的个性化设置，包括布局、筛选器、偏好等
 * 提供状态持久化和智能推荐功能
 * 
 * 核心功能：
 * 1. 个性化配置管理
 * 2. 视图状态持久化
 * 3. 智能布局推荐
 * 4. 用户行为分析
 */
export const usePersonalizedView = () => {
  const queryClient = useQueryClient();
  const cacheManager = useCacheInvalidationManager();
  
  // 本地状态管理
  const [viewState, setViewState] = useState<ViewState>({
    currentLayout: 'detailed',
    visibleModules: [],
    filterStates: {},
    sortStates: {},
    expandedSections: [],
    selectedTimeRange: '3months',
    isCustomizing: false
  });

  // 获取用户个性化配置
  const { data: config, isLoading: configLoading, error: configError } = useQuery({
    queryKey: ['personalized-config'],
    queryFn: loadPersonalizedConfig,
    staleTime: 30 * 60 * 1000, // 30分钟缓存
    refetchOnWindowFocus: false
  });

  // 获取用户偏好分析
  const { data: analytics } = useQuery({
    queryKey: ['user-preferences-analytics'],
    queryFn: analyzeUserPreferences,
    staleTime: 60 * 60 * 1000, // 1小时缓存
    enabled: !!config
  });

  // 保存个性化配置
  const saveConfigMutation = useMutation({
    mutationFn: savePersonalizedConfig,
    onSuccess: async () => {
      await cacheManager.invalidateByEvent('view:personalization:updated');
    }
  });

  // 重置配置到默认值
  const resetConfigMutation = useMutation({
    mutationFn: resetToDefaultConfig,
    onSuccess: async () => {
      await cacheManager.invalidateByEvent('view:personalization:updated');
      setViewState(getDefaultViewState());
    }
  });

  // 应用预设布局
  const applyPresetMutation = useMutation({
    mutationFn: ({ preset }: { preset: string }) => applyLayoutPreset(preset),
    onSuccess: (newConfig) => {
      queryClient.setQueryData(['personalized-config'], newConfig);
      updateViewStateFromConfig(newConfig);
    }
  });

  // 从配置更新视图状态
  const updateViewStateFromConfig = useCallback((newConfig: PersonalizedViewConfig) => {
    setViewState(prev => ({
      ...prev,
      currentLayout: newConfig.layout,
      visibleModules: newConfig.activeModules.filter(m => m.enabled).map(m => m.id),
      selectedTimeRange: newConfig.defaultTimeRange,
      filterStates: newConfig.customFilters.reduce((acc, filter) => {
        if (filter.enabled) {
          acc[filter.name] = filter.value;
        }
        return acc;
      }, {} as Record<string, any>)
    }));
  }, []);

  // 监听配置变化并更新视图状态
  useEffect(() => {
    if (config) {
      updateViewStateFromConfig(config);
    }
  }, [config, updateViewStateFromConfig]);

  // 保存当前视图状态到配置
  const saveCurrentViewState = useCallback(async () => {
    if (!config) return;

    const updatedConfig: PersonalizedViewConfig = {
      ...config,
      layout: viewState.currentLayout as any,
      defaultTimeRange: viewState.selectedTimeRange as any,
      activeModules: config.activeModules.map(module => ({
        ...module,
        enabled: viewState.visibleModules.includes(module.id)
      })),
      customFilters: config.customFilters.map(filter => ({
        ...filter,
        value: viewState.filterStates[filter.name] || filter.value,
        enabled: viewState.filterStates[filter.name] !== undefined
      })),
      lastModified: new Date().toISOString()
    };

    await saveConfigMutation.mutateAsync(updatedConfig);
  }, [config, viewState, saveConfigMutation]);

  // 切换模块可见性
  const toggleModule = useCallback((moduleId: string) => {
    setViewState(prev => ({
      ...prev,
      visibleModules: prev.visibleModules.includes(moduleId)
        ? prev.visibleModules.filter(id => id !== moduleId)
        : [...prev.visibleModules, moduleId]
    }));
  }, []);

  // 更新筛选器状态
  const updateFilter = useCallback((filterName: string, value: any) => {
    setViewState(prev => ({
      ...prev,
      filterStates: {
        ...prev.filterStates,
        [filterName]: value
      }
    }));
  }, []);

  // 切换布局模式
  const setLayout = useCallback((layout: string) => {
    setViewState(prev => ({
      ...prev,
      currentLayout: layout
    }));
  }, []);

  // 切换时间范围
  const setTimeRange = useCallback((timeRange: string) => {
    setViewState(prev => ({
      ...prev,
      selectedTimeRange: timeRange
    }));
  }, []);

  // 切换定制模式
  const toggleCustomizing = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      isCustomizing: !prev.isCustomizing
    }));
  }, []);

  // 切换展开/折叠状态
  const toggleSection = useCallback((sectionId: string) => {
    setViewState(prev => ({
      ...prev,
      expandedSections: prev.expandedSections.includes(sectionId)
        ? prev.expandedSections.filter(id => id !== sectionId)
        : [...prev.expandedSections, sectionId]
    }));
  }, []);

  // 智能布局推荐
  const getLayoutRecommendations = useCallback(() => {
    if (!analytics) return [];

    const recommendations = [];

    // 基于使用模式推荐
    if (analytics.devicePreference === 'mobile') {
      recommendations.push({
        layout: 'mobile',
        reason: '检测到您主要使用移动设备，推荐移动优化布局',
        confidence: 0.9
      });
    }

    if (analytics.usagePattern === 'morning') {
      recommendations.push({
        layout: 'executive',
        reason: '您习惯在早晨查看数据，推荐管理者视图快速了解概况',
        confidence: 0.8
      });
    }

    if (analytics.averageSessionDuration < 5) {
      recommendations.push({
        layout: 'compact',
        reason: '您的浏览时间较短，推荐紧凑布局快速获取信息',
        confidence: 0.7
      });
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }, [analytics]);

  return {
    // 配置数据
    config,
    analytics,
    isLoading: configLoading,
    error: configError,

    // 视图状态
    viewState,
    
    // 状态更新方法
    toggleModule,
    updateFilter,
    setLayout,
    setTimeRange,
    toggleCustomizing,
    toggleSection,
    
    // 配置管理方法
    saveCurrentViewState,
    resetConfig: resetConfigMutation.mutate,
    applyPreset: applyPresetMutation.mutate,
    
    // 智能推荐
    getLayoutRecommendations,
    
    // 状态标识
    isSaving: saveConfigMutation.isPending,
    isResetting: resetConfigMutation.isPending,
    isApplyingPreset: applyPresetMutation.isPending
  };
};

// 配置加载函数
const loadPersonalizedConfig = async (): Promise<PersonalizedViewConfig> => {
  // 从localStorage或API加载配置
  const stored = localStorage.getItem('dashboard-personalization');
  
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Failed to parse stored personalization config:', error);
    }
  }
  
  // 返回默认配置
  return getDefaultConfig();
};

// 配置保存函数
const savePersonalizedConfig = async (config: PersonalizedViewConfig): Promise<void> => {
  // 保存到localStorage和/或API
  localStorage.setItem('dashboard-personalization', JSON.stringify(config));
  
  // 记录用户行为用于分析
  recordUserAction('config_saved', {
    layout: config.layout,
    activeModulesCount: config.activeModules.filter(m => m.enabled).length,
    customFiltersCount: config.customFilters.filter(f => f.enabled).length
  });
};

// 重置配置函数
const resetToDefaultConfig = async (): Promise<PersonalizedViewConfig> => {
  const defaultConfig = getDefaultConfig();
  localStorage.setItem('dashboard-personalization', JSON.stringify(defaultConfig));
  
  recordUserAction('config_reset', {});
  
  return defaultConfig;
};

// 应用预设布局
const applyLayoutPreset = async (preset: string): Promise<PersonalizedViewConfig> => {
  const baseConfig = await loadPersonalizedConfig();
  let presetConfig: Partial<PersonalizedViewConfig> = {};

  switch (preset) {
    case 'executive':
      presetConfig = {
        layout: 'executive',
        activeModules: baseConfig.activeModules.map(module => ({
          ...module,
          enabled: ['smart-decision', 'management-insights', 'quick-actions'].includes(module.id),
          size: module.id === 'smart-decision' ? 'large' : 'medium'
        })),
        defaultTimeRange: '3months',
        refreshInterval: 300 // 5分钟
      };
      break;
      
    case 'analyst':
      presetConfig = {
        layout: 'detailed',
        activeModules: baseConfig.activeModules.map(module => ({
          ...module,
          enabled: true,
          size: ['monitoring', 'insights'].includes(module.id) ? 'large' : 'medium'
        })),
        defaultTimeRange: '12months',
        refreshInterval: 120 // 2分钟
      };
      break;
      
    case 'manager':
      presetConfig = {
        layout: 'detailed',
        activeModules: baseConfig.activeModules.map(module => ({
          ...module,
          enabled: !['system-monitoring'].includes(module.id),
          size: 'medium'
        })),
        defaultTimeRange: '6months',
        refreshInterval: 180 // 3分钟
      };
      break;
      
    case 'mobile':
      presetConfig = {
        layout: 'mobile',
        activeModules: baseConfig.activeModules.map(module => ({
          ...module,
          enabled: ['smart-decision', 'quick-actions'].includes(module.id),
          size: 'small',
          collapsed: !['smart-decision'].includes(module.id)
        })),
        defaultTimeRange: '1month',
        refreshInterval: 600 // 10分钟
      };
      break;
  }

  const newConfig = {
    ...baseConfig,
    ...presetConfig,
    lastModified: new Date().toISOString()
  };

  await savePersonalizedConfig(newConfig);
  recordUserAction('preset_applied', { preset });
  
  return newConfig;
};

// 用户偏好分析函数
const analyzeUserPreferences = async (): Promise<UserPreferenceAnalytics> => {
  // 分析用户行为数据（从localStorage或分析API获取）
  const actionHistory = getStoredActionHistory();
  
  const mostUsedFeatures = analyzeMostUsedFeatures(actionHistory);
  const preferredTimeRange = analyzePreferredTimeRange(actionHistory);
  const usagePattern = analyzeUsagePattern(actionHistory);
  const devicePreference = analyzeDevicePreference();
  
  return {
    mostUsedFeatures,
    preferredTimeRange,
    averageSessionDuration: calculateAverageSessionDuration(actionHistory),
    frequentFilters: analyzeFrequentFilters(actionHistory),
    usagePattern,
    devicePreference
  };
};

// 获取默认配置
const getDefaultConfig = (): PersonalizedViewConfig => {
  return {
    userId: 'current-user', // 实际应用中从认证上下文获取
    layout: 'detailed',
    activeModules: [
      {
        id: 'smart-decision',
        name: '智能决策仪表板',
        enabled: true,
        position: 1,
        size: 'large',
        collapsed: false,
        customSettings: {}
      },
      {
        id: 'monitoring',
        name: '实时监控面板',
        enabled: true,
        position: 2,
        size: 'medium',
        collapsed: false,
        customSettings: {}
      },
      {
        id: 'insights',
        name: '管理洞察中心',
        enabled: true,
        position: 3,
        size: 'medium',
        collapsed: false,
        customSettings: {}
      },
      {
        id: 'visualization',
        name: '交互式可视化',
        enabled: false,
        position: 4,
        size: 'medium',
        collapsed: true,
        customSettings: {}
      },
      {
        id: 'quick-actions',
        name: '快速行动中心',
        enabled: true,
        position: 5,
        size: 'small',
        collapsed: false,
        customSettings: {}
      },
      {
        id: 'data-story',
        name: '数据故事化',
        enabled: false,
        position: 6,
        size: 'medium',
        collapsed: true,
        customSettings: {}
      }
    ],
    defaultTimeRange: '3months',
    preferredChartTypes: {
      'kpi-trends': 'line',
      'department-comparison': 'bar',
      'category-distribution': 'pie',
      'workflow-status': 'donut'
    },
    customFilters: [
      {
        id: 'department-filter',
        name: 'department',
        type: 'department',
        value: '',
        enabled: false,
        persistent: true
      },
      {
        id: 'period-filter',
        name: 'period',
        type: 'period',
        value: '',
        enabled: false,
        persistent: true
      }
    ],
    dashboardOrder: ['smart-decision', 'monitoring', 'insights', 'quick-actions'],
    refreshInterval: 300, // 5分钟
    theme: 'auto',
    notifications: {
      enabled: true,
      types: ['alerts', 'reports'],
      frequency: 'immediate',
      channels: ['browser']
    },
    quickActions: [
      {
        id: 'monthly-report',
        label: '月度报告',
        action: '/reports/monthly',
        icon: 'document-report',
        enabled: true,
        order: 1
      },
      {
        id: 'payroll-analysis',
        label: '薪资分析',
        action: '/statistics?tab=payroll',
        icon: 'currency-dollar',
        enabled: true,
        order: 2
      }
    ],
    lastModified: new Date().toISOString()
  };
};

// 获取默认视图状态
const getDefaultViewState = (): ViewState => {
  return {
    currentLayout: 'detailed',
    visibleModules: ['smart-decision', 'monitoring', 'insights', 'quick-actions'],
    filterStates: {},
    sortStates: {},
    expandedSections: [],
    selectedTimeRange: '3months',
    isCustomizing: false
  };
};

// 辅助函数：记录用户行为
const recordUserAction = (action: string, data: any) => {
  const history = getStoredActionHistory();
  history.push({
    action,
    data,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    screenSize: `${screen.width}x${screen.height}`
  });
  
  // 只保留最近1000条记录
  const recentHistory = history.slice(-1000);
  localStorage.setItem('user-action-history', JSON.stringify(recentHistory));
};

// 辅助函数：获取存储的行为历史
const getStoredActionHistory = () => {
  try {
    const stored = localStorage.getItem('user-action-history');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// 分析函数实现
const analyzeMostUsedFeatures = (history: any[]) => {
  const featureCounts: Record<string, number> = {};
  history.forEach(action => {
    if (action.action === 'module_viewed' || action.action === 'feature_used') {
      const feature = action.data.feature || action.data.module;
      featureCounts[feature] = (featureCounts[feature] || 0) + 1;
    }
  });
  
  return Object.entries(featureCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([feature]) => feature);
};

const analyzePreferredTimeRange = (history: any[]) => {
  const timeRangeCounts: Record<string, number> = {};
  history.forEach(action => {
    if (action.action === 'time_range_changed') {
      const range = action.data.timeRange;
      timeRangeCounts[range] = (timeRangeCounts[range] || 0) + 1;
    }
  });
  
  const mostUsed = Object.entries(timeRangeCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0];
  
  return mostUsed ? mostUsed[0] : '3months';
};

const analyzeUsagePattern = (history: any[]) => {
  const hourCounts = { morning: 0, afternoon: 0, evening: 0 };
  
  history.forEach(action => {
    const hour = new Date(action.timestamp).getHours();
    if (hour >= 6 && hour < 12) hourCounts.morning++;
    else if (hour >= 12 && hour < 18) hourCounts.afternoon++;
    else hourCounts.evening++;
  });
  
  const maxUsage = Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)[0];
  
  return maxUsage ? maxUsage[0] as any : 'mixed';
};

const analyzeDevicePreference = () => {
  const width = screen.width;
  if (width <= 768) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
};

const calculateAverageSessionDuration = (history: any[]) => {
  // 简化计算，实际应用中需要更复杂的会话分析
  return 15; // 默认15分钟
};

const analyzeFrequentFilters = (history: any[]) => {
  // 分析经常使用的筛选器
  return [];
};

export default usePersonalizedView;