import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useStatisticsSummary } from '@/hooks/statistics/useStatisticsSummary';
import { usePersonalizedView } from '@/hooks/personalization/usePersonalizedView';
import { useManagementDashboard } from '@/hooks/management/useManagementDashboard';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { StatisticsModuleLayout } from './common';

// 导入我们开发的核心组件
import { SmartDecisionDashboard } from '@/components/dashboard/modules/SmartDecisionDashboard';
import { RealtimeMonitoringPanel } from '@/components/dashboard/modules/RealtimeMonitoringPanel';
import { BudgetExecutionCard, LaborEfficiencyCard, OrganizationHealthCard, RiskLevelCard } from '@/components/dashboard/enhanced/SmartKPICard';

// 原有的基础统计组件（现在作为"经典视图"）
import DashboardModule from './DashboardModule';

interface EnhancedDashboardModuleProps {
  className?: string;
  defaultView?: 'classic' | 'smart' | 'monitoring' | 'insights' | 'unified';
}

type ViewMode = 'classic' | 'smart' | 'monitoring' | 'insights' | 'unified';

/**
 * 增强版综合仪表板模块
 * 
 * 集成原有的基础统计功能和新开发的智能化组件
 * 提供多种视图模式满足不同用户的需求
 * 
 * 视图模式：
 * - classic: 经典统计视图（原DashboardModule）
 * - smart: 智能决策仪表板
 * - monitoring: 实时监控面板
 * - insights: 管理洞察中心
 * - unified: 统一综合视图（所有功能）
 * 
 * 设计原则：
 * - 向下兼容：保留原有功能和交互
 * - 渐进增强：用户可以选择使用新功能
 * - 个性化：根据用户偏好自动推荐最佳视图
 */
export function EnhancedDashboardModule({ 
  className = "",
  defaultView = 'unified'
}: EnhancedDashboardModuleProps) {
  const { t } = useTranslation();
  const { data: summary, isLoading, error, refresh } = useStatisticsSummary();
  const { viewState, config, setLayout, toggleCustomizing } = usePersonalizedView();
  
  const [currentView, setCurrentView] = useState<ViewMode>(defaultView);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showViewSelector, setShowViewSelector] = useState(false);

  // 初始化用户偏好视图
  useEffect(() => {
    if (config?.layout === 'executive') {
      setCurrentView('smart');
    } else if (config?.layout === 'compact') {
      setCurrentView('monitoring');
    } else if (viewState.selectedTimeRange === '12months') {
      setCurrentView('insights');
    }
  }, [config, viewState]);

  // 处理视图切换
  const handleViewChange = async (newView: ViewMode) => {
    if (newView === currentView) return;
    
    setIsTransitioning(true);
    
    // 模拟切换动画
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setCurrentView(newView);
    setIsTransitioning(false);
    
    // 更新个性化设置
    if (newView === 'smart') {
      setLayout('executive');
    } else if (newView === 'monitoring') {
      setLayout('compact');
    } else if (newView === 'insights') {
      setLayout('detailed');
    }
  };

  // 获取视图配置
  const getViewConfig = (view: ViewMode) => {
    const configs = {
      classic: {
        title: '经典统计视图',
        description: '传统的KPI指标和基础统计数据',
        icon: '📊',
        color: 'btn-neutral'
      },
      smart: {
        title: '智能决策仪表板',
        description: '管理决策支持和异常智能检测',
        icon: '🧠',
        color: 'btn-primary'
      },
      monitoring: {
        title: '实时监控面板',
        description: '系统运营状态实时监控',
        icon: '⚡',
        color: 'btn-info'
      },
      insights: {
        title: '管理洞察中心',
        description: '深度业务洞察和战略分析',
        icon: '💡',
        color: 'btn-secondary'
      },
      unified: {
        title: '统一综合视图',
        description: '所有功能模块的完整展示',
        icon: '🎯',
        color: 'btn-accent'
      }
    };
    
    return configs[view];
  };

  // DaisyUI 5 标准视图选择器
  const ViewSelector = () => (
    <div className="dropdown dropdown-bottom dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-outline btn-sm">
        <span className="text-lg">{getViewConfig(currentView).icon}</span>
        <span className="hidden sm:inline">{getViewConfig(currentView).title}</span>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
      <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-64 p-2 shadow">
        {(['classic', 'smart', 'monitoring', 'insights', 'unified'] as ViewMode[]).map((view) => {
          const config = getViewConfig(view);
          return (
            <li key={view}>
              <button 
                className={`justify-start ${currentView === view ? 'active' : ''}`}
                onClick={() => handleViewChange(view)}
              >
                <span className="text-lg">{config.icon}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium">{config.title}</div>
                  <div className="text-xs opacity-70">{config.description}</div>
                </div>
                {currentView === view && (
                  <div className="badge badge-primary badge-sm">✓</div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  // DaisyUI 5 标准操作按钮组
  const QuickActions = () => (
    <div className="join">
      <button 
        className="btn btn-ghost btn-sm join-item"
        onClick={() => toggleCustomizing()}
        title="个性化设置"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      </button>
      <button 
        className="btn btn-ghost btn-sm join-item"
        onClick={refresh}
        title="刷新数据"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );

  // 渲染视图内容
  const renderViewContent = () => {
    if (isTransitioning) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-base-content/70">切换视图中...</p>
          </div>
        </div>
      );
    }

    const commonProps = {
      className: "transition-all duration-500 ease-in-out"
    };

    switch (currentView) {
      case 'classic':
        return <DashboardModule {...commonProps} />;
        
      case 'smart':
        return <SmartDecisionDashboard {...commonProps} />;
        
      case 'monitoring':
        return <RealtimeMonitoringPanel {...commonProps} />;
        
      case 'insights':
        return (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">💡</div>
            <h3 className="text-xl font-bold mb-2">管理洞察中心</h3>
            <p className="text-base-content/70 mb-4">AI驱动的深度业务洞察和战略分析</p>
            <div className="badge badge-info">即将推出</div>
          </div>
        );
        
      case 'unified':
        return (
          <UnifiedProgressiveView />
        );
        
      default:
        return <DashboardModule {...commonProps} />;
    }
  };

  // DaisyUI 5 标准加载和错误状态
  if (isLoading && !summary) {
    return (
      <div className="card bg-base-100 shadow">
        <div className="card-body items-center text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <h3 className="card-title">加载增强仪表板中</h3>
          <p className="text-base-content/60">正在初始化智能分析组件...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 className="font-bold">增强仪表板加载失败</h3>
          <div className="text-sm">{error instanceof Error ? error.message : '加载智能分析组件失败，请检查网络连接'}</div>
        </div>
        <div>
          <button className="btn btn-sm" onClick={refresh}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* DaisyUI 5 标准卡片布局 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          {/* 卡片头部 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{getViewConfig(currentView).icon}</div>
              <div>
                <h2 className="card-title">{getViewConfig(currentView).title}</h2>
                <p className="text-sm text-base-content/60">{getViewConfig(currentView).description}</p>
              </div>
            </div>
            
            {/* 操作按钮组 */}
            <div className="flex items-center gap-3">
              <ViewSelector />
              <QuickActions />
            </div>
          </div>
          
          {/* 状态标识 */}
          {currentView === 'unified' && (
            <div className="alert alert-info mb-4">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>统一视图整合了所有功能模块，提供完整的分析体验</span>
            </div>
          )}
          
          {/* 主要内容 */}
          <div className="min-h-[500px]">
            {renderViewContent()}
          </div>
        </div>
      </div>
      
      {/* 底部提示信息 */}
      <div className="alert">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div className="flex items-center justify-between w-full">
          <span>提示：使用视图选择器快速切换不同的分析模式</span>
          <div className="badge badge-ghost">当前：{getViewConfig(currentView).title}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * 统一渐进式视图组件 - 三层信息架构
 * 
 * 层级1: 关键KPI概览 (始终可见)
 * 层级2: 功能模块选择器 (标签页切换)
 * 层级3: 详细内容展示 (可展开/收缩)
 */
const UnifiedProgressiveView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'smart' | 'monitoring' | 'insights' | 'classic'>('smart');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['kpi-summary']));
  const managementData = useManagementDashboard();

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // DaisyUI 5 标准KPI概览层
  const KPISummaryLayer = () => (
    <div className="card bg-base-100 shadow border-l-4 border-primary">
      <div className="card-body">
        <div className="card-title justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <span>核心指标概览</span>
            <div className="badge badge-primary badge-sm">实时</div>
          </div>
          <button 
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => toggleSection('kpi-summary')}
            aria-label={expandedSections.has('kpi-summary') ? '收起KPI概览' : '展开KPI概览'}
          >
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${
                expandedSections.has('kpi-summary') ? 'rotate-180' : ''
              }`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {expandedSections.has('kpi-summary') && (
          <div className="stats stats-vertical lg:stats-horizontal shadow mt-4 w-full">
            {managementData.data && (
              <>
                <BudgetExecutionCard
                  rate={managementData.data.kpis.find(kpi => kpi.type === 'budget_execution')?.value || 85}
                  trend={{ direction: 'up', percentage: 5.2, period: '月环比' }}
                  onClick={() => setActiveTab('smart')}
                />
                <LaborEfficiencyCard
                  efficiency={managementData.data.kpis.find(kpi => kpi.type === 'labor_efficiency')?.value || 78}
                  trend={{ direction: 'stable', percentage: 1.1, period: '月环比' }}
                  onClick={() => setActiveTab('smart')}
                />
                <OrganizationHealthCard
                  score={managementData.data.kpis.find(kpi => kpi.type === 'organization_health')?.value || 82}
                  trend={{ direction: 'up', percentage: 3.8, period: '月环比' }}
                  onClick={() => setActiveTab('smart')}
                />
                <RiskLevelCard
                  level={managementData.data.risks[0]?.level || 'low'}
                  riskCount={managementData.data.risks.length}
                  onClick={() => setActiveTab('smart')}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // DaisyUI 5 标准模块选择器层
  const ModuleTabsLayer = () => (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        {/* DaisyUI 5 简化tabs */}
        <div className="w-full mb-6">
          <div className="tabs tabs-boxed justify-center">
            <button 
              className={`tab ${activeTab === 'smart' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('smart')}
            >
              🧠 智能决策
            </button>
            <button 
              className={`tab ${activeTab === 'monitoring' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('monitoring')}
            >
              ⚡ 实时监控
            </button>
            <button 
              className={`tab ${activeTab === 'insights' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('insights')}
            >
              💡 管理洞察
            </button>
            <button 
              className={`tab ${activeTab === 'classic' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('classic')}
            >
              📊 经典统计
            </button>
          </div>
        </div>
        
        {/* 内容区域 */}
        <div className="min-h-[400px] bg-base-50 rounded-lg p-6">
          {activeTab === 'smart' && (
            <div role="tabpanel">
              <SmartDecisionDashboard />
            </div>
          )}
          {activeTab === 'monitoring' && (
            <div role="tabpanel">
              <RealtimeMonitoringPanel />
            </div>
          )}
          {activeTab === 'insights' && (
            <div role="tabpanel" className="text-center py-12">
              <div className="text-6xl mb-4">💡</div>
              <h3 className="text-2xl font-bold mb-2">管理洞察中心</h3>
              <p className="text-base-content/70 mb-6">AI驱动的深度业务洞察和战略分析</p>
              <div className="badge badge-info badge-lg">即将推出</div>
            </div>
          )}
          {activeTab === 'classic' && (
            <div role="tabpanel">
              <DashboardModule />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 层级1: 始终可见的KPI概览 */}
      <KPISummaryLayer />
      
      {/* 层级2和3: 模块选择器和详细内容 */}
      <ModuleTabsLayer />
      
      {/* DaisyUI 5 标准提示信息 */}
      <div className="alert alert-info">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div>
          <h3 className="font-bold">分层信息架构</h3>
          <p className="text-sm">顶部KPI始终可见，下方标签页可切换不同分析模块。点击KPI卡片可快速跳转到对应的详细分析。</p>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboardModule;