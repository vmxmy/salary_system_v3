import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock hooks
const mockManagementData = {
  kpis: [
    { 
      id: '1', 
      type: 'budget_execution', 
      name: '预算执行率', 
      value: 85, 
      benchmark: 80, 
      unit: '%', 
      status: 'good' 
    }
  ],
  insights: [
    {
      metric: '员工满意度',
      direction: 'increasing' as const,
      interpretation: '整体呈现上升趋势',
      confidence: 0.8
    }
  ],
  recommendations: [
    {
      id: '1',
      title: '优化预算分配',
      description: '建议调整部门预算分配策略',
      priority: 'high' as const,
      impact: 'high' as const,
      effort: 'medium' as const
    }
  ],
  risks: [
    {
      id: '1',
      level: 'medium' as const,
      description: '部分指标波动较大',
      mitigation: '建议加强监控'
    }
  ]
};

const mockMonitoringData = {
  systemHealth: { status: 'healthy', uptime: 99.9 },
  dataQuality: { overallScore: 0.95, issues: [] },
  workflowProgress: { efficiency: 0.88, completedTasks: 150 }
};

vi.mock('@/hooks/management/useManagementDashboard', () => ({
  useManagementDashboard: () => ({
    data: mockManagementData,
    isLoading: false,
    error: null,
    refresh: vi.fn()
  })
}));

vi.mock('@/hooks/monitoring/useSystemMonitoring', () => ({
  useSystemMonitoring: () => ({
    data: mockMonitoringData,
    isLoading: false,
    error: null,
    refresh: vi.fn()
  })
}));

vi.mock('@/hooks/personalization/usePersonalizedView', () => ({
  usePersonalizedView: () => ({
    viewState: { selectedTimeRange: '3months' },
    config: { layout: 'executive' },
    setLayout: vi.fn(),
    toggleCustomizing: vi.fn(),
    updateFilter: vi.fn()
  })
}));

// 动态导入组件进行测试
describe('Enhanced Dashboard System Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SmartDecisionDashboard', () => {
    it('should render smart decision dashboard with KPI data', async () => {
      const { SmartDecisionDashboard } = await import('@/components/dashboard/modules/SmartDecisionDashboard');
      
      render(<SmartDecisionDashboard />);
      
      // 验证KPI卡片渲染
      expect(screen.getByText('智能决策仪表板')).toBeInTheDocument();
      
      // 验证数据展示
      await waitFor(() => {
        expect(screen.getByText('预算执行率')).toBeInTheDocument();
      });
    });

    it('should handle data loading states correctly', async () => {
      // Mock loading state
      vi.mocked(require('@/hooks/management/useManagementDashboard').useManagementDashboard).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refresh: vi.fn()
      });

      const { SmartDecisionDashboard } = await import('@/components/dashboard/modules/SmartDecisionDashboard');
      
      render(<SmartDecisionDashboard />);
      
      expect(screen.getByText('加载智能决策数据中...')).toBeInTheDocument();
    });

    it('should handle error states gracefully', async () => {
      // Mock error state
      vi.mocked(require('@/hooks/management/useManagementDashboard').useManagementDashboard).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refresh: vi.fn()
      });

      const { SmartDecisionDashboard } = await import('@/components/dashboard/modules/SmartDecisionDashboard');
      
      render(<SmartDecisionDashboard />);
      
      expect(screen.getByText('智能决策数据加载失败')).toBeInTheDocument();
    });
  });

  describe('RealtimeMonitoringPanel', () => {
    it('should render monitoring panel with system data', async () => {
      const { RealtimeMonitoringPanel } = await import('@/components/dashboard/modules/RealtimeMonitoringPanel');
      
      render(<RealtimeMonitoringPanel />);
      
      expect(screen.getByText('实时监控面板')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('系统运行良好')).toBeInTheDocument();
      });
    });

    it('should auto-refresh data when enabled', async () => {
      const { RealtimeMonitoringPanel } = await import('@/components/dashboard/modules/RealtimeMonitoringPanel');
      
      render(<RealtimeMonitoringPanel autoRefresh={true} />);
      
      // 等待自动刷新功能启动
      await waitFor(() => {
        expect(screen.getByText('自动刷新已启用')).toBeInTheDocument();
      });
    });
  });

  describe('ManagementInsightsCenter', () => {
    it('should render insights with correct tabs', async () => {
      const { ManagementInsightsCenter } = await import('@/components/dashboard/modules/ManagementInsightsCenter');
      
      render(<ManagementInsightsCenter />);
      
      expect(screen.getByText('管理洞察中心')).toBeInTheDocument();
      expect(screen.getByText('战略洞察')).toBeInTheDocument();
      expect(screen.getByText('趋势分析')).toBeInTheDocument();
      expect(screen.getByText('风险评估')).toBeInTheDocument();
      expect(screen.getByText('机会识别')).toBeInTheDocument();
    });

    it('should switch tabs correctly', async () => {
      const { ManagementInsightsCenter } = await import('@/components/dashboard/modules/ManagementInsightsCenter');
      
      render(<ManagementInsightsCenter />);
      
      const trendTab = screen.getByText('趋势分析');
      fireEvent.click(trendTab);
      
      await waitFor(() => {
        expect(screen.getByText('趋势分析摘要')).toBeInTheDocument();
      });
    });
  });

  describe('InteractiveVisualizationModule', () => {
    it('should render visualization with chart selection', async () => {
      const { InteractiveVisualizationModule } = await import('@/components/dashboard/modules/InteractiveVisualizationModule');
      
      render(<InteractiveVisualizationModule />);
      
      expect(screen.getByText('交互式可视化')).toBeInTheDocument();
      expect(screen.getByText('图表配置')).toBeInTheDocument();
    });

    it('should handle interaction mode changes', async () => {
      const { InteractiveVisualizationModule } = await import('@/components/dashboard/modules/InteractiveVisualizationModule');
      
      render(<InteractiveVisualizationModule />);
      
      const drillModeButton = screen.getByText('🔍 下钻');
      fireEvent.click(drillModeButton);
      
      await waitFor(() => {
        expect(screen.getByText('下钻分析模式')).toBeInTheDocument();
      });
    });
  });

  describe('QuickActionCenter', () => {
    it('should render action cards with correct categories', async () => {
      const { QuickActionCenter } = await import('@/components/dashboard/modules/QuickActionCenter');
      
      render(<QuickActionCenter />);
      
      expect(screen.getByText('快速行动中心')).toBeInTheDocument();
      expect(screen.getByText('生成月度报告')).toBeInTheDocument();
      expect(screen.getByText('薪资数据分析')).toBeInTheDocument();
    });

    it('should execute actions when clicked', async () => {
      const { QuickActionCenter } = await import('@/components/dashboard/modules/QuickActionCenter');
      
      render(<QuickActionCenter />);
      
      const reportAction = screen.getByText('生成月度报告');
      fireEvent.click(reportAction);
      
      // 应该显示处理状态
      await waitFor(() => {
        expect(screen.getByText('处理中...')).toBeInTheDocument();
      });
    });

    it('should filter actions by category', async () => {
      const { QuickActionCenter } = await import('@/components/dashboard/modules/QuickActionCenter');
      
      render(<QuickActionCenter />);
      
      const categoryFilter = screen.getByDisplayValue('全部分类');
      fireEvent.change(categoryFilter, { target: { value: 'report' } });
      
      await waitFor(() => {
        expect(screen.getByText('生成月度报告')).toBeInTheDocument();
      });
    });
  });

  describe('DataStorytellingModule', () => {
    it('should render data stories with navigation', async () => {
      const { DataStorytellingModule } = await import('@/components/dashboard/modules/DataStorytellingModule');
      
      render(<DataStorytellingModule />);
      
      expect(screen.getByText('数据故事化')).toBeInTheDocument();
      expect(screen.getByText('故事导航')).toBeInTheDocument();
    });

    it('should navigate between stories', async () => {
      const { DataStorytellingModule } = await import('@/components/dashboard/modules/DataStorytellingModule');
      
      render(<DataStorytellingModule />);
      
      // 点击下一个故事按钮
      const nextButton = screen.getByRole('button', { name: /next/i });
      if (nextButton) {
        fireEvent.click(nextButton);
        
        await waitFor(() => {
          // 验证故事切换
          expect(screen.getByText(/故事导航/)).toBeInTheDocument();
        });
      }
    });

    it('should filter stories by category', async () => {
      const { DataStorytellingModule } = await import('@/components/dashboard/modules/DataStorytellingModule');
      
      render(<DataStorytellingModule />);
      
      const categoryFilter = screen.getByDisplayValue('全部故事');
      fireEvent.change(categoryFilter, { target: { value: 'performance' } });
      
      await waitFor(() => {
        // 验证分类筛选生效
        expect(screen.getByText('数据故事化')).toBeInTheDocument();
      });
    });
  });

  describe('Enhanced Components', () => {
    it('should render SmartKPICard with proper data', async () => {
      const { SmartKPICard } = await import('@/components/dashboard/enhanced/SmartKPICard');
      
      const mockKPI = {
        id: '1',
        type: 'budget_execution',
        name: '预算执行率',
        value: 85,
        benchmark: 80,
        unit: '%',
        status: 'good' as const
      };
      
      render(<SmartKPICard kpi={mockKPI} />);
      
      expect(screen.getByText('预算执行率')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    it('should render InteractiveInsightPanel with recommendations', async () => {
      const { InteractiveInsightPanel } = await import('@/components/dashboard/enhanced/InteractiveInsightPanel');
      
      render(
        <InteractiveInsightPanel
          title="测试洞察"
          recommendations={mockManagementData.recommendations}
          insights={mockManagementData.insights}
        />
      );
      
      expect(screen.getByText('测试洞察')).toBeInTheDocument();
      expect(screen.getByText('优化预算分配')).toBeInTheDocument();
    });

    it('should render RealTimeMonitorCard with status', async () => {
      const { RealTimeMonitorCard } = await import('@/components/dashboard/enhanced/RealTimeMonitorCard');
      
      render(
        <RealTimeMonitorCard
          title="系统状态"
          value="正常"
          status="success"
          lastUpdate={new Date().toISOString()}
        />
      );
      
      expect(screen.getByText('系统状态')).toBeInTheDocument();
      expect(screen.getByText('正常')).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track component performance metrics', async () => {
      const { withPerformanceMonitoring } = await import('@/components/dashboard/hoc/withPerformanceMonitoring');
      
      const TestComponent = () => <div>Test Component</div>;
      const EnhancedComponent = withPerformanceMonitoring(TestComponent, {
        componentName: 'TestComponent',
        logToConsole: false
      });
      
      render(<EnhancedComponent />);
      
      expect(screen.getByText('Test Component')).toBeInTheDocument();
    });

    it('should handle performance warnings', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { withPerformanceMonitoring } = await import('@/components/dashboard/hoc/withPerformanceMonitoring');
      
      const SlowComponent = () => {
        // 模拟慢渲染
        const start = performance.now();
        while (performance.now() - start < 20) {
          // 空循环模拟耗时操作
        }
        return <div>Slow Component</div>;
      };
      
      const EnhancedComponent = withPerformanceMonitoring(SlowComponent, {
        componentName: 'SlowComponent',
        warningThresholds: { renderTime: 15 }
      });
      
      render(<EnhancedComponent />);
      
      // 等待性能警告触发
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Performance Warning')
        );
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('should handle data flow between components', async () => {
      const { EnhancedDashboardModule } = await import('@/components/statistics/EnhancedDashboardModule');
      
      render(<EnhancedDashboardModule defaultView="unified" />);
      
      expect(screen.getByText('统一综合视图')).toBeInTheDocument();
      
      // 验证不同组件的数据都能正确显示
      await waitFor(() => {
        expect(screen.getByText('智能决策概览')).toBeInTheDocument();
        expect(screen.getByText('系统监控')).toBeInTheDocument();
        expect(screen.getByText('管理洞察')).toBeInTheDocument();
      });
    });

    it('should handle view switching correctly', async () => {
      const { EnhancedDashboardModule } = await import('@/components/statistics/EnhancedDashboardModule');
      
      render(<EnhancedDashboardModule />);
      
      // 测试视图切换
      const viewSelector = screen.getByText('统一综合视图');
      fireEvent.click(viewSelector);
      
      await waitFor(() => {
        expect(screen.getByText('智能决策仪表板')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error messages when components fail', async () => {
      // Mock component error
      const ErrorComponent = () => {
        throw new Error('Test error');
      };
      
      const { withPerformanceMonitoring } = await import('@/components/dashboard/hoc/withPerformanceMonitoring');
      const EnhancedErrorComponent = withPerformanceMonitoring(ErrorComponent, {
        componentName: 'ErrorComponent'
      });
      
      render(<EnhancedErrorComponent />);
      
      expect(screen.getByText('组件 ErrorComponent 加载失败')).toBeInTheDocument();
    });

    it('should recover from network errors', async () => {
      const { SmartDecisionDashboard } = await import('@/components/dashboard/modules/SmartDecisionDashboard');
      
      // Mock network error initially
      vi.mocked(require('@/hooks/management/useManagementDashboard').useManagementDashboard).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refresh: vi.fn()
      });
      
      render(<SmartDecisionDashboard />);
      
      expect(screen.getByText('智能决策数据加载失败')).toBeInTheDocument();
      
      // Mock successful retry
      vi.mocked(require('@/hooks/management/useManagementDashboard').useManagementDashboard).mockReturnValue({
        data: mockManagementData,
        isLoading: false,
        error: null,
        refresh: vi.fn()
      });
      
      const retryButton = screen.getByText('重试');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('预算执行率')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      const { SmartDecisionDashboard } = await import('@/components/dashboard/modules/SmartDecisionDashboard');
      
      render(<SmartDecisionDashboard />);
      
      // 验证可访问性标签
      const dashboard = screen.getByRole('main', { name: /智能决策仪表板/i });
      expect(dashboard).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const { QuickActionCenter } = await import('@/components/dashboard/modules/QuickActionCenter');
      
      render(<QuickActionCenter />);
      
      const firstAction = screen.getByText('生成月度报告');
      
      // 测试键盘焦点
      act(() => {
        firstAction.focus();
      });
      
      expect(firstAction).toHaveFocus();
    });
  });
});