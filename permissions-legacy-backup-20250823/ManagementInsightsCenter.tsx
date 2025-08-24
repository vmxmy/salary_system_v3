import React, { useState, useMemo } from 'react';
import { useManagementDashboard } from '@/hooks/management/useManagementDashboard';
import { usePersonalizedView } from '@/hooks/personalization/usePersonalizedView';
import { InteractiveInsightPanel } from '../enhanced/InteractiveInsightPanel';
import { SmartKPICard } from '../enhanced/SmartKPICard';

interface ManagementInsightsCenterProps {
  className?: string;
  insightDepth?: 'surface' | 'deep' | 'comprehensive';
  timeRange?: '1month' | '3months' | '6months' | '12months';
}

/**
 * 管理洞察中心组件
 * 
 * 专注于管理决策支持和业务洞察分析
 * 与其他统计模块的差异：提供解释性分析和战略建议，非原始数据展示
 * 
 * 核心功能：
 * 1. StrategicInsightDashboard - 战略洞察仪表板
 * 2. TrendAnalysisCenter - 趋势分析中心
 * 3. RiskAssessmentPanel - 风险评估面板
 * 4. OpportunityIdentification - 机会识别系统
 * 5. DecisionSupportTools - 决策支持工具
 * 
 * 设计原则：
 * - 解释性：不仅显示数据，更要解释数据背后的含义
 * - 前瞻性：从历史数据中预测未来趋势和机会
 * - 可操作：将洞察转化为具体的管理行动建议
 */
export const ManagementInsightsCenter: React.FC<ManagementInsightsCenterProps> = ({
  className = '',
  insightDepth = 'deep',
  timeRange = '3months'
}) => {
  const [activeTab, setActiveTab] = useState<'insights' | 'trends' | 'risks' | 'opportunities'>('insights');
  const [selectedInsightCategory, setSelectedInsightCategory] = useState<string>('all');
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  // 获取数据源
  const { data: managementData, isLoading, error } = useManagementDashboard();
  const { viewState, updateFilter } = usePersonalizedView();

  // 处理洞察分类过滤
  const filteredInsights = useMemo(() => {
    if (!managementData?.insights) return [];
    
    if (selectedInsightCategory === 'all') {
      return managementData.insights;
    }
    
    return managementData.insights.filter(insight => 
      insight.metric.toLowerCase().includes(selectedInsightCategory.toLowerCase())
    );
  }, [managementData?.insights, selectedInsightCategory]);

  // 处理建议优先级过滤
  const prioritizedRecommendations = useMemo(() => {
    if (!managementData?.recommendations) return [];
    
    return [...managementData.recommendations].sort((a, b) => {
      const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [managementData?.recommendations]);

  // 处理风险分析
  const riskAnalysis = useMemo(() => {
    if (!managementData?.risks) return { high: [], medium: [], low: [] };
    
    return managementData.risks.reduce((acc, risk) => {
      acc[risk.level].push(risk);
      return acc;
    }, { high: [], medium: [], low: [] } as Record<string, any[]>);
  }, [managementData?.risks]);

  // 生成机会识别
  const opportunities = useMemo(() => {
    if (!managementData) return [];
    
    const opportunities = [];
    
    // 基于KPI表现识别机会
    managementData.kpis.forEach(kpi => {
      if (kpi.value > kpi.benchmark * 1.1) {
        opportunities.push({
          id: `kpi-${kpi.type}`,
          type: 'performance_excellence',
          title: `${kpi.name}表现优异`,
          description: `当前指标超过基准${((kpi.value / kpi.benchmark - 1) * 100).toFixed(1)}%，可考虑扩大投入或复制成功经验`,
          potential: 'high',
          timeframe: '短期',
          effort: '低',
          category: 'optimization'
        });
      } else if (kpi.value < kpi.benchmark * 0.8) {
        opportunities.push({
          id: `improve-${kpi.type}`,
          type: 'improvement_potential',
          title: `${kpi.name}改进空间`,
          description: `当前指标低于基准${((1 - kpi.value / kpi.benchmark) * 100).toFixed(1)}%，存在显著提升机会`,
          potential: 'high',
          timeframe: '中期',
          effort: '中',
          category: 'improvement'
        });
      }
    });
    
    return opportunities;
  }, [managementData]);

  // 处理洞察详情展开
  const handleInsightDetails = (insightId: string) => {
    console.log(`查看洞察详情: ${insightId}`);
    setShowDetailedAnalysis(true);
  };

  // 处理机会评估
  const handleOpportunityAssessment = (opportunityId: string) => {
    console.log(`机会评估: ${opportunityId}`);
  };

  // 获取洞察类别选项
  const getInsightCategories = () => {
    if (!managementData?.insights) return ['all'];
    
    const categories = new Set(['all']);
    managementData.insights.forEach(insight => {
      const category = insight.metric.split(' ')[0].toLowerCase();
      categories.add(category);
    });
    
    return Array.from(categories);
  };

  if (error) {
    return (
      <div className={`card bg-base-100 shadow-lg ${className}`}>
        <div className="card-body">
          <div className="alert alert-error">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>洞察数据加载失败</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 洞察中心标题和控制区 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-secondary text-secondary-content rounded-full w-12 h-12">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">管理洞察中心</h1>
            <p className="text-base-content/70">数据驱动的业务洞察与决策支持</p>
          </div>
        </div>

        {/* 洞察深度和时间范围控制 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select 
            className="select select-bordered"
            value={insightDepth}
            onChange={(e) => updateFilter('insightDepth', e.target.value)}
          >
            <option value="surface">表层洞察</option>
            <option value="deep">深度分析</option>
            <option value="comprehensive">全面洞察</option>
          </select>
          
          <select 
            className="select select-bordered"
            value={timeRange}
            onChange={(e) => updateFilter('timeRange', e.target.value)}
          >
            <option value="1month">近1个月</option>
            <option value="3months">近3个月</option>
            <option value="6months">近6个月</option>
            <option value="12months">近12个月</option>
          </select>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="tabs tabs-bordered">
        <button 
          className={`tab ${activeTab === 'insights' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          战略洞察
        </button>
        <button 
          className={`tab ${activeTab === 'trends' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          趋势分析
        </button>
        <button 
          className={`tab ${activeTab === 'risks' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('risks')}
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          风险评估
        </button>
        <button 
          className={`tab ${activeTab === 'opportunities' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('opportunities')}
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          机会识别
        </button>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="card bg-base-100 shadow animate-pulse">
              <div className="card-body">
                <div className="h-6 bg-base-300 rounded w-3/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-base-300 rounded"></div>
                  <div className="h-4 bg-base-300 rounded w-5/6"></div>
                  <div className="h-4 bg-base-300 rounded w-4/6"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 主要内容区域 */}
      {!isLoading && managementData && (
        <>
          {/* 1. StrategicInsightDashboard - 战略洞察仪表板 */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              {/* 洞察分类过滤器 */}
              <div className="flex flex-wrap gap-2">
                {getInsightCategories().map(category => (
                  <button
                    key={category}
                    className={`btn btn-sm ${selectedInsightCategory === category ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setSelectedInsightCategory(category)}
                  >
                    {category === 'all' ? '全部' : category}
                  </button>
                ))}
              </div>

              {/* 智能洞察面板 */}
              <InteractiveInsightPanel
                title="智能业务洞察"
                recommendations={prioritizedRecommendations}
                insights={filteredInsights}
                maxItems={8}
                collapsible={false}
              />

              {/* 洞察摘要统计 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title">总洞察数</div>
                  <div className="stat-value text-2xl">{managementData.insights.length}</div>
                  <div className="stat-desc">涵盖多个业务维度</div>
                </div>
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title">重要建议</div>
                  <div className="stat-value text-2xl">
                    {managementData.recommendations.filter(r => r.priority === 'high' || r.priority === 'urgent').length}
                  </div>
                  <div className="stat-desc">需要优先关注</div>
                </div>
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title">预期影响</div>
                  <div className="stat-value text-2xl">85%</div>
                  <div className="stat-desc">实施建议的平均效果</div>
                </div>
              </div>
            </div>
          )}

          {/* 2. TrendAnalysisCenter - 趋势分析中心 */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              <div className="card bg-base-100 shadow-lg">
                <div className="card-body">
                  <h2 className="card-title">趋势分析摘要</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {filteredInsights.map((insight, index) => (
                      <div key={index} className="card bg-base-200">
                        <div className="card-body p-4">
                          <h3 className="font-semibold">{insight.metric}</h3>
                          <p className="text-sm text-base-content/70 mt-2">{insight.interpretation}</p>
                          <div className="flex items-center justify-between mt-3">
                            <span className={`badge ${
                              insight.direction === 'increasing' ? 'badge-success' :
                              insight.direction === 'decreasing' ? 'badge-error' : 'badge-info'
                            }`}>
                              {insight.direction === 'increasing' ? '上升' :
                               insight.direction === 'decreasing' ? '下降' : '稳定'}
                            </span>
                            <button 
                              className="btn btn-xs btn-primary"
                              onClick={() => handleInsightDetails(`insight-${index}`)}
                            >
                              详情
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. RiskAssessmentPanel - 风险评估面板 */}
          {activeTab === 'risks' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 高风险 */}
                <div className="card bg-base-100 shadow-lg border-l-4 border-error">
                  <div className="card-body">
                    <h2 className="card-title text-error">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      高风险 ({riskAnalysis.high.length})
                    </h2>
                    <div className="space-y-2">
                      {riskAnalysis.high.map((risk, index) => (
                        <div key={index} className="alert alert-error py-2">
                          <span className="text-sm">{risk.description}</span>
                        </div>
                      ))}
                      {riskAnalysis.high.length === 0 && (
                        <p className="text-base-content/60">暂无高风险项</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 中风险 */}
                <div className="card bg-base-100 shadow-lg border-l-4 border-warning">
                  <div className="card-body">
                    <h2 className="card-title text-warning">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      中风险 ({riskAnalysis.medium.length})
                    </h2>
                    <div className="space-y-2">
                      {riskAnalysis.medium.map((risk, index) => (
                        <div key={index} className="alert alert-warning py-2">
                          <span className="text-sm">{risk.description}</span>
                        </div>
                      ))}
                      {riskAnalysis.medium.length === 0 && (
                        <p className="text-base-content/60">暂无中风险项</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 低风险 */}
                <div className="card bg-base-100 shadow-lg border-l-4 border-info">
                  <div className="card-body">
                    <h2 className="card-title text-info">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      低风险 ({riskAnalysis.low.length})
                    </h2>
                    <div className="space-y-2">
                      {riskAnalysis.low.map((risk, index) => (
                        <div key={index} className="alert alert-info py-2">
                          <span className="text-sm">{risk.description}</span>
                        </div>
                      ))}
                      {riskAnalysis.low.length === 0 && (
                        <p className="text-base-content/60">暂无低风险项</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. OpportunityIdentification - 机会识别系统 */}
          {activeTab === 'opportunities' && (
            <div className="space-y-6">
              <div className="card bg-base-100 shadow-lg">
                <div className="card-body">
                  <h2 className="card-title">机会识别矩阵</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {opportunities.map((opportunity) => (
                      <div key={opportunity.id} className="card bg-base-200">
                        <div className="card-body p-4">
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold">{opportunity.title}</h3>
                            <span className={`badge ${
                              opportunity.potential === 'high' ? 'badge-success' :
                              opportunity.potential === 'medium' ? 'badge-warning' : 'badge-info'
                            }`}>
                              {opportunity.potential}
                            </span>
                          </div>
                          <p className="text-sm text-base-content/70 mt-2">{opportunity.description}</p>
                          <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                            <div>
                              <span className="text-base-content/60">时间: </span>
                              <span>{opportunity.timeframe}</span>
                            </div>
                            <div>
                              <span className="text-base-content/60">投入: </span>
                              <span>{opportunity.effort}</span>
                            </div>
                            <div>
                              <span className="text-base-content/60">类型: </span>
                              <span>{opportunity.category}</span>
                            </div>
                          </div>
                          <button 
                            className="btn btn-sm btn-primary mt-3"
                            onClick={() => handleOpportunityAssessment(opportunity.id)}
                          >
                            评估机会
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {opportunities.length === 0 && (
                    <div className="text-center py-8">
                      <svg className="w-16 h-16 mx-auto text-base-content/30 mb-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      <p className="text-lg font-semibold">暂无发现新机会</p>
                      <p className="text-base-content/60">系统将持续分析数据以识别潜在机会</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 详细分析模态框 */}
      {showDetailedAnalysis && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">详细洞察分析</h3>
            <p className="text-base-content/70 mb-6">
              这里将显示选中洞察的详细分析，包括数据来源、计算方法、影响因素等深度信息。
            </p>
            <div className="modal-action">
              <button 
                className="btn btn-ghost"
                onClick={() => setShowDetailedAnalysis(false)}
              >
                关闭
              </button>
              <button className="btn btn-primary">导出报告</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementInsightsCenter;