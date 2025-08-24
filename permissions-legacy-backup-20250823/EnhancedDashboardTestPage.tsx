import React, { useState } from 'react';
import { EnhancedDashboardModule } from '@/components/statistics/EnhancedDashboardModule';

/**
 * 增强仪表板测试页面
 * 
 * 用于验证新开发的增强仪表板功能
 * 可以在开发环境中独立测试各个组件
 */
const EnhancedDashboardTestPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<'classic' | 'smart' | 'monitoring' | 'insights' | 'unified'>('unified');

  return (
    <div className="container mx-auto p-6 max-w-none">
      {/* 测试页面标题 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">增强仪表板系统测试</h1>
            <p className="text-base-content/70 text-lg">验证新开发的智能化仪表板功能</p>
          </div>
          
          {/* 开发环境标识 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="badge badge-warning gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              开发模式
            </div>
          )}
        </div>
      </div>

      {/* 功能说明卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-primary">🎯 智能决策支持</h2>
            <p className="text-sm">
              基于数据分析提供管理决策建议，包括异常检测、KPI分析和管理建议等功能。
            </p>
            <div className="badge badge-primary badge-sm">AI驱动</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-info/5 to-info/10 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-info">⚡ 实时监控</h2>
            <p className="text-sm">
              实时监控系统运行状态、数据质量和工作流效率，及时发现和预警问题。
            </p>
            <div className="badge badge-info badge-sm">实时更新</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-secondary/5 to-secondary/10 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-secondary">💡 数据洞察</h2>
            <p className="text-sm">
              深度挖掘数据价值，提供战略洞察、趋势分析和机会识别等高级分析功能。
            </p>
            <div className="badge badge-secondary badge-sm">深度分析</div>
          </div>
        </div>
      </div>

      {/* 视图模式选择器 */}
      <div className="card bg-base-100 shadow-lg mb-8">
        <div className="card-body">
          <h2 className="card-title mb-4">🎨 视图模式选择</h2>
          <p className="text-base-content/70 mb-4">
            选择不同的视图模式来体验增强仪表板的各种功能
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              { key: 'unified', title: '统一综合视图', desc: '展示所有功能模块', icon: '🎯', color: 'btn-accent' },
              { key: 'smart', title: '智能决策仪表板', desc: '管理决策支持', icon: '🧠', color: 'btn-primary' },
              { key: 'monitoring', title: '实时监控面板', desc: '系统运营监控', icon: '⚡', color: 'btn-info' },
              { key: 'insights', title: '管理洞察中心', desc: '深度业务洞察', icon: '💡', color: 'btn-secondary' },
              { key: 'classic', title: '经典统计视图', desc: '传统数据展示', icon: '📊', color: 'btn-neutral' }
            ].map((view) => (
              <button
                key={view.key}
                className={`btn ${view.color} ${currentView === view.key ? 'btn-active' : 'btn-outline'} flex-col h-auto py-4`}
                onClick={() => setCurrentView(view.key as any)}
              >
                <span className="text-2xl mb-1">{view.icon}</span>
                <span className="text-xs font-semibold">{view.title}</span>
                <span className="text-xs opacity-70">{view.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 当前视图说明 */}
      <div className="alert alert-info mb-6">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div>
          <strong>当前视图：{currentView === 'unified' ? '统一综合视图' : 
                                currentView === 'smart' ? '智能决策仪表板' :
                                currentView === 'monitoring' ? '实时监控面板' :
                                currentView === 'insights' ? '管理洞察中心' : '经典统计视图'}</strong>
          <div className="text-sm mt-1">
            {currentView === 'unified' && '展示所有新开发的功能模块，是增强仪表板的完整体验'}
            {currentView === 'smart' && '专注于管理决策支持，提供KPI分析和智能建议'}
            {currentView === 'monitoring' && '实时监控系统状态，包括数据质量和工作流效率'}
            {currentView === 'insights' && '深度业务洞察，包括战略分析和机会识别'}
            {currentView === 'classic' && '保持原有的传统统计数据展示方式'}
          </div>
        </div>
      </div>

      {/* 增强仪表板组件 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body p-2">
          <EnhancedDashboardModule 
            defaultView={currentView}
            className="min-h-[600px]"
          />
        </div>
      </div>

      {/* 开发说明 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8">
          <div className="collapse collapse-arrow bg-base-200 shadow-lg">
            <input type="checkbox" />
            <div className="collapse-title text-xl font-medium">
              🔧 开发者说明
            </div>
            <div className="collapse-content">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">新增功能模块：</h4>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>SmartDecisionDashboard</strong>：智能决策支持，包含KPI网格、异常检测、管理建议</li>
                    <li><strong>RealtimeMonitoringPanel</strong>：实时监控面板，监控系统健康、数据质量、工作流</li>
                    <li><strong>ManagementInsightsCenter</strong>：管理洞察中心，提供战略洞察、风险评估、机会识别</li>
                    <li><strong>InteractiveVisualizationModule</strong>：交互式可视化，支持下钻分析和数据筛选</li>
                    <li><strong>QuickActionCenter</strong>：快速行动中心，提供常用操作的快速执行入口</li>
                    <li><strong>DataStorytellingModule</strong>：数据故事化，将数据转化为易懂的故事叙述</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">技术特性：</h4>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>React 19 + TypeScript 5.8 + DaisyUI 5现代技术栈</li>
                    <li>组件懒加载和性能监控</li>
                    <li>智能预加载和用户行为分析</li>
                    <li>全面的错误处理和重试机制</li>
                    <li>响应式设计和可访问性支持</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">与现有模块的差异化：</h4>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>避免与HRStatsModule、PayrollStatsModule等模块功能重复</li>
                    <li>专注于管理决策支持而非原始数据展示</li>
                    <li>提供智能化分析而非传统统计报表</li>
                    <li>强调实时性和交互性</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDashboardTestPage;