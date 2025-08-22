import React, { useState } from 'react';
import type { ManagementRecommendation, TrendInsight } from '@/hooks/management/useManagementDashboard';

interface InteractiveInsightPanelProps {
  title: string;
  recommendations?: ManagementRecommendation[];
  insights?: TrendInsight[];
  className?: string;
  maxItems?: number;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

/**
 * 交互式洞察面板组件
 * 
 * 基于DaisyUI card和alert组件构建
 * 特色功能：
 * 1. 智能建议自动生成和展示
 * 2. 可折叠/展开详情内容
 * 3. 行动建议一键执行功能
 * 4. 优先级和重要性排序显示
 * 5. 响应式设计适配
 */
export const InteractiveInsightPanel: React.FC<InteractiveInsightPanelProps> = ({
  title,
  recommendations = [],
  insights = [],
  className = '',
  maxItems = 5,
  collapsible = true,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedTab, setSelectedTab] = useState<'recommendations' | 'insights'>('recommendations');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 切换项目展开/折叠状态
  const toggleItemExpansion = (itemId: string) => {
    const newExpandedItems = new Set(expandedItems);
    if (newExpandedItems.has(itemId)) {
      newExpandedItems.delete(itemId);
    } else {
      newExpandedItems.add(itemId);
    }
    setExpandedItems(newExpandedItems);
  };

  // 处理建议执行
  const handleRecommendationAction = (recommendation: ManagementRecommendation, actionIndex: number) => {
    console.log(`执行建议: ${recommendation.title}, 行动项: ${recommendation.actionItems[actionIndex]}`);
    // 这里可以集成实际的行动执行逻辑
  };

  // 获取优先级样式
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-4 border-error bg-error/5';
      case 'high': return 'border-l-4 border-warning bg-warning/5';
      case 'medium': return 'border-l-4 border-info bg-info/5';
      case 'low': return 'border-l-4 border-success bg-success/5';
      default: return 'border-l-4 border-base-300 bg-base-50';
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'badge-error';
      case 'high': return 'badge-warning';
      case 'medium': return 'badge-info';
      case 'low': return 'badge-success';
      default: return 'badge-ghost';
    }
  };

  // 获取重要性样式
  const getSignificanceStyle = (significance: string) => {
    switch (significance) {
      case 'major': return 'border-l-4 border-error bg-error/5';
      case 'moderate': return 'border-l-4 border-warning bg-warning/5';
      case 'minor': return 'border-l-4 border-info bg-info/5';
      default: return 'border-l-4 border-base-300 bg-base-50';
    }
  };

  // 渲染建议项
  const renderRecommendation = (recommendation: ManagementRecommendation) => {
    const isExpanded = expandedItems.has(recommendation.id);

    return (
      <div 
        key={recommendation.id}
        className={`card bg-base-100 shadow mb-4 ${getPriorityStyle(recommendation.priority)}`}
      >
        <div className="card-body p-4">
          {/* 建议标题和优先级 */}
          <div className="flex items-start justify-between">
            <h3 className="card-title text-base font-semibold flex items-center gap-2">
              {/* 类别图标 */}
              {getCategoryIcon(recommendation.category)}
              {recommendation.title}
            </h3>
            <div className="flex items-center gap-2">
              <span className={`badge badge-sm ${getPriorityColor(recommendation.priority)}`}>
                {getPriorityLabel(recommendation.priority)}
              </span>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => toggleItemExpansion(recommendation.id)}
              >
                <svg 
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* 建议描述 */}
          <p className="text-sm text-base-content/70 mt-2">{recommendation.description}</p>

          {/* 预期影响 */}
          <div className="alert alert-info mt-3 py-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{recommendation.expectedImpact}</span>
          </div>

          {/* 展开内容 */}
          {isExpanded && (
            <div className="mt-4 space-y-4">
              {/* 行动项列表 */}
              <div>
                <h4 className="font-semibold text-sm mb-2">具体行动项：</h4>
                <div className="space-y-2">
                  {recommendation.actionItems.map((action, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-base-200 rounded">
                      <span className="text-sm flex-1">{action}</span>
                      <button
                        className="btn btn-xs btn-primary"
                        onClick={() => handleRecommendationAction(recommendation, index)}
                      >
                        执行
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 实施信息 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="stat bg-base-200 rounded p-3">
                  <div className="stat-title text-xs">预估成本</div>
                  <div className="stat-value text-sm">¥{(recommendation.estimatedCost / 10000).toFixed(1)}万</div>
                </div>
                <div className="stat bg-base-200 rounded p-3">
                  <div className="stat-title text-xs">预计耗时</div>
                  <div className="stat-value text-sm">{recommendation.timeline}</div>
                </div>
                <div className="stat bg-base-200 rounded p-3">
                  <div className="stat-title text-xs">业务类别</div>
                  <div className="stat-value text-sm">{getCategoryLabel(recommendation.category)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染洞察项
  const renderInsight = (insight: TrendInsight, index: number) => {
    const isExpanded = expandedItems.has(`insight-${index}`);

    return (
      <div 
        key={index}
        className={`card bg-base-100 shadow mb-4 ${getSignificanceStyle(insight.significance)}`}
      >
        <div className="card-body p-4">
          {/* 洞察标题 */}
          <div className="flex items-start justify-between">
            <h3 className="card-title text-base font-semibold flex items-center gap-2">
              {getDirectionIcon(insight.direction)}
              {insight.metric} - {insight.interpretation}
            </h3>
            <div className="flex items-center gap-2">
              <span className={`badge badge-sm ${getSignificanceBadge(insight.significance)}`}>
                {getSignificanceLabel(insight.significance)}
              </span>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => toggleItemExpansion(`insight-${index}`)}
              >
                <svg 
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* 业务影响 */}
          <div className="alert alert-warning mt-3 py-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{insight.businessImplication}</span>
          </div>

          {/* 展开内容 - 详细分析 */}
          {isExpanded && (
            <div className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="stat bg-base-200 rounded p-3">
                  <div className="stat-title text-xs">趋势方向</div>
                  <div className="stat-value text-sm flex items-center gap-2">
                    {getDirectionIcon(insight.direction)}
                    {getDirectionLabel(insight.direction)}
                  </div>
                </div>
                <div className="stat bg-base-200 rounded p-3">
                  <div className="stat-title text-xs">重要程度</div>
                  <div className="stat-value text-sm">{getSignificanceLabel(insight.significance)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 辅助函数
  const getCategoryIcon = (category: string) => {
    const icons = {
      hr: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
      finance: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      ),
      operations: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
      strategic: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      )
    };
    return icons[category as keyof typeof icons] || icons.operations;
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      hr: '人事管理',
      finance: '财务管理',
      operations: '运营管理',
      strategic: '战略规划'
    };
    return labels[category as keyof typeof labels] || '其他';
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      urgent: '紧急',
      high: '高',
      medium: '中',
      low: '低'
    };
    return labels[priority as keyof typeof labels] || '中';
  };

  const getDirectionIcon = (direction: string) => {
    const icons = {
      increasing: (
        <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      ),
      decreasing: (
        <svg className="w-4 h-4 text-error" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ),
      stable: (
        <svg className="w-4 h-4 text-info" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
        </svg>
      )
    };
    return icons[direction as keyof typeof icons] || icons.stable;
  };

  const getDirectionLabel = (direction: string) => {
    const labels = {
      increasing: '上升',
      decreasing: '下降',
      stable: '稳定'
    };
    return labels[direction as keyof typeof labels] || '稳定';
  };

  const getSignificanceLabel = (significance: string) => {
    const labels = {
      major: '重要',
      moderate: '一般',
      minor: '轻微'
    };
    return labels[significance as keyof typeof labels] || '一般';
  };

  const getSignificanceBadge = (significance: string) => {
    const badges = {
      major: 'badge-error',
      moderate: 'badge-warning',
      minor: 'badge-info'
    };
    return badges[significance as keyof typeof badges] || 'badge-info';
  };

  return (
    <div className={`card bg-base-100 shadow-lg ${className}`}>
      <div className="card-body p-6">
        {/* 标题和折叠控制 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="card-title text-xl font-bold flex items-center gap-2">
            <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {title}
          </h2>
          
          {collapsible && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <svg 
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* 主要内容 */}
        {(!collapsible || isExpanded) && (
          <div>
            {/* 标签切换 */}
            {recommendations.length > 0 && insights.length > 0 && (
              <div className="tabs tabs-bordered mb-4">
                <button 
                  className={`tab ${selectedTab === 'recommendations' ? 'tab-active' : ''}`}
                  onClick={() => setSelectedTab('recommendations')}
                >
                  管理建议 ({recommendations.length})
                </button>
                <button 
                  className={`tab ${selectedTab === 'insights' ? 'tab-active' : ''}`}
                  onClick={() => setSelectedTab('insights')}
                >
                  趋势洞察 ({insights.length})
                </button>
              </div>
            )}

            {/* 内容显示 */}
            <div className="max-h-96 overflow-y-auto">
              {selectedTab === 'recommendations' && recommendations.length > 0 && (
                <div>
                  {recommendations.slice(0, maxItems).map(renderRecommendation)}
                  {recommendations.length > maxItems && (
                    <div className="text-center mt-4">
                      <span className="text-sm text-base-content/60">
                        还有 {recommendations.length - maxItems} 个建议...
                      </span>
                    </div>
                  )}
                </div>
              )}

              {selectedTab === 'insights' && insights.length > 0 && (
                <div>
                  {insights.slice(0, maxItems).map(renderInsight)}
                  {insights.length > maxItems && (
                    <div className="text-center mt-4">
                      <span className="text-sm text-base-content/60">
                        还有 {insights.length - maxItems} 个洞察...
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 无数据状态 */}
              {recommendations.length === 0 && insights.length === 0 && (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto text-base-content/30 mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-base-content/60">暂无智能洞察数据</p>
                  <p className="text-sm text-base-content/40">系统会根据数据变化自动生成管理建议</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveInsightPanel;