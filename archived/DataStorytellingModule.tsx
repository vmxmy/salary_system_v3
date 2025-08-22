import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useManagementDashboard } from '@/hooks/management/useManagementDashboard';
import { useSystemMonitoring } from '@/hooks/monitoring/useSystemMonitoring';
import { usePersonalizedView } from '@/hooks/personalization/usePersonalizedView';

interface DataStorytellingModuleProps {
  className?: string;
  autoNarrate?: boolean;
  storyDepth?: 'summary' | 'detailed' | 'comprehensive';
}

interface DataStory {
  id: string;
  title: string;
  category: 'performance' | 'trend' | 'anomaly' | 'opportunity' | 'risk';
  narrative: string;
  keyPoints: string[];
  dataEvidence: {
    metric: string;
    value: number;
    change: number;
    significance: 'low' | 'medium' | 'high';
  }[];
  visualMetaphors: {
    icon: React.ReactNode;
    description: string;
  }[];
  actionable: boolean;
  confidence: number;
  timestamp: string;
}

/**
 * 数据故事化模块
 * 
 * 将原始数据转化为易于理解的故事叙述
 * 与其他模块的差异：专注于数据的故事化呈现和情境化解释
 * 
 * 核心功能：
 * 1. NarrativeEngine - 故事叙述引擎
 * 2. DataVisualizationStory - 数据可视化故事
 * 3. TrendNarrative - 趋势叙述生成
 * 4. AnomalyStoryTelling - 异常事件故事化
 * 5. ProgressiveDisclosure - 渐进式信息披露
 * 
 * 设计原则：
 * - 故事性：用故事的方式呈现数据，增强理解和记忆
 * - 情境化：结合业务背景解释数据含义
 * - 渐进式：从简单到复杂，逐步深入数据内容
 */
export const DataStorytellingModule: React.FC<DataStorytellingModuleProps> = ({
  className = '',
  autoNarrate = true,
  storyDepth = 'detailed'
}) => {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [playbackMode, setPlaybackMode] = useState<'manual' | 'auto'>('manual');
  const [playbackSpeed, setPlaybackSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  // 数据源
  const { data: managementData, isLoading: mgmtLoading } = useManagementDashboard();
  const { data: monitoringData, isLoading: monitorLoading } = useSystemMonitoring();
  const { viewState, config } = usePersonalizedView();

  const isLoading = mgmtLoading || monitorLoading;

  // 生成数据故事
  const dataStories: DataStory[] = useMemo(() => {
    if (!managementData || !monitoringData) return [];

    const stories: DataStory[] = [];

    // 1. 绩效故事
    if (managementData.kpis.length > 0) {
      const topPerformingKPI = managementData.kpis.reduce((prev, current) => 
        (current.value / current.benchmark) > (prev.value / prev.benchmark) ? current : prev
      );

      stories.push({
        id: 'performance-star',
        title: `${topPerformingKPI.name}：表现卓越的明星指标`,
        category: 'performance',
        narrative: `在本期的业务表现中，${topPerformingKPI.name}成为了当之无愧的明星。以${topPerformingKPI.value}的优异成绩，超越预期基准${((topPerformingKPI.value / topPerformingKPI.benchmark - 1) * 100).toFixed(1)}%，这一表现不仅体现了团队的努力，更为未来发展奠定了坚实基础。这个数字背后，是策略的精准执行和团队协作的完美体现。`,
        keyPoints: [
          `实际值 ${topPerformingKPI.value} 超越基准 ${topPerformingKPI.benchmark}`,
          `超额完成 ${((topPerformingKPI.value / topPerformingKPI.benchmark - 1) * 100).toFixed(1)}%`,
          '成为本期表现最佳的关键指标',
          '为其他指标提供了优秀的参考标杆'
        ],
        dataEvidence: [{
          metric: topPerformingKPI.name,
          value: topPerformingKPI.value,
          change: ((topPerformingKPI.value / topPerformingKPI.benchmark - 1) * 100),
          significance: 'high'
        }],
        visualMetaphors: [{
          icon: (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ),
          description: '闪亮的明星代表卓越表现'
        }],
        actionable: true,
        confidence: 0.9,
        timestamp: new Date().toISOString()
      });
    }

    // 2. 趋势故事
    if (managementData.insights.length > 0) {
      const trendInsight = managementData.insights.find(i => i.direction !== 'stable');
      if (trendInsight) {
        stories.push({
          id: 'trend-narrative',
          title: `${trendInsight.metric}：趋势的力量`,
          category: 'trend',
          narrative: `数据告诉我们一个有趣的故事：${trendInsight.metric}正在经历一个${trendInsight.direction === 'increasing' ? '上升' : '下降'}的趋势变化。${trendInsight.interpretation}这种变化不是偶然的，而是多种因素共同作用的结果。通过深入分析，我们发现这个趋势反映了业务环境的深层变化，值得我们密切关注和深入思考。`,
          keyPoints: [
            `趋势方向：${trendInsight.direction === 'increasing' ? '持续上升' : trendInsight.direction === 'decreasing' ? '持续下降' : '保持稳定'}`,
            `变化解释：${trendInsight.interpretation}`,
            '反映了业务环境的深层变化',
            '需要持续监控和适时调整策略'
          ],
          dataEvidence: [{
            metric: trendInsight.metric,
            value: 100, // 示意值
            change: trendInsight.direction === 'increasing' ? 15 : trendInsight.direction === 'decreasing' ? -15 : 0,
            significance: 'medium'
          }],
          visualMetaphors: [{
            icon: (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ),
            description: '趋势线展现变化的轨迹'
          }],
          actionable: true,
          confidence: 0.8,
          timestamp: new Date().toISOString()
        });
      }
    }

    // 3. 异常故事
    if (managementData.risks.some(risk => risk.level === 'high')) {
      const highRisk = managementData.risks.find(risk => risk.level === 'high');
      stories.push({
        id: 'anomaly-alert',
        title: '数据中的警告信号',
        category: 'anomaly',
        narrative: `在看似平静的数据海洋中，我们发现了一个需要立即关注的警告信号。${highRisk?.description}这个异常情况就像是系统发出的求救信号，提醒我们需要立即采取行动。数据的异常往往是问题的早期预警，及时发现和处理，能够避免更大的损失。`,
        keyPoints: [
          '发现高风险异常情况',
          `具体描述：${highRisk?.description}`,
          '需要立即关注和处理',
          '可能影响整体业务表现'
        ],
        dataEvidence: [{
          metric: '风险等级',
          value: 3,
          change: 0,
          significance: 'high'
        }],
        visualMetaphors: [{
          icon: (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
          description: '警告三角形代表需要注意的异常'
        }],
        actionable: true,
        confidence: 0.95,
        timestamp: new Date().toISOString()
      });
    }

    // 4. 机会故事
    if (managementData.recommendations.some(rec => rec.priority === 'high')) {
      const opportunity = managementData.recommendations.find(rec => rec.priority === 'high');
      stories.push({
        id: 'opportunity-window',
        title: '数据揭示的机会之窗',
        category: 'opportunity',
        narrative: `数据分析为我们打开了一扇机会之窗。${opportunity?.description}这个发现告诉我们，在当前的业务环境中，存在着一个值得把握的机会。机会往往稍纵即逝，但数据为我们提供了科学的决策依据，让我们能够更准确地识别和抓住这些珍贵的机会。`,
        keyPoints: [
          '识别出高价值机会',
          `机会描述：${opportunity?.description}`,
          '建议优先级为高',
          '具备良好的实施可行性'
        ],
        dataEvidence: [{
          metric: '机会优先级',
          value: 4,
          change: 0,
          significance: 'high'
        }],
        visualMetaphors: [{
          icon: (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          ),
          description: '闪电代表抓住机会的迅速行动'
        }],
        actionable: true,
        confidence: 0.85,
        timestamp: new Date().toISOString()
      });
    }

    // 5. 系统状态故事
    if (monitoringData.systemHealth) {
      stories.push({
        id: 'system-health',
        title: '系统运行状况：数字健康体检报告',
        category: 'performance',
        narrative: `让我们来看看系统的健康状况。就像人体需要定期体检一样，我们的系统也需要持续的健康监控。当前数据显示，系统整体运行状况良好，各项指标都在正常范围内。数据质量得分${(monitoringData.dataQuality.overallScore * 100).toFixed(0)}%，工作流效率${(monitoringData.workflowProgress.efficiency * 100).toFixed(0)}%，这些数字背后反映的是系统的稳定性和可靠性。`,
        keyPoints: [
          `数据质量得分：${(monitoringData.dataQuality.overallScore * 100).toFixed(0)}%`,
          `工作流效率：${(monitoringData.workflowProgress.efficiency * 100).toFixed(0)}%`,
          '系统运行稳定可靠',
          '各项指标均在正常范围'
        ],
        dataEvidence: [
          {
            metric: '数据质量',
            value: monitoringData.dataQuality.overallScore * 100,
            change: 5,
            significance: 'medium'
          },
          {
            metric: '工作流效率',
            value: monitoringData.workflowProgress.efficiency * 100,
            change: 2,
            significance: 'medium'
          }
        ],
        visualMetaphors: [{
          icon: (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 13.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ),
          description: '勾选标记代表系统健康运行'
        }],
        actionable: false,
        confidence: 0.9,
        timestamp: new Date().toISOString()
      });
    }

    return stories;
  }, [managementData, monitoringData]);

  // 筛选故事
  const filteredStories = useMemo(() => {
    if (selectedCategory === 'all') return dataStories;
    return dataStories.filter(story => story.category === selectedCategory);
  }, [dataStories, selectedCategory]);

  // 自动播放控制
  useEffect(() => {
    if (playbackMode === 'auto' && isPlaying && filteredStories.length > 0) {
      const speed = { slow: 8000, normal: 5000, fast: 3000 }[playbackSpeed];
      
      intervalRef.current = setInterval(() => {
        setCurrentStoryIndex(prev => 
          prev >= filteredStories.length - 1 ? 0 : prev + 1
        );
      }, speed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [playbackMode, isPlaying, filteredStories.length, playbackSpeed]);

  // 处理播放控制
  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    setCurrentStoryIndex(prev => 
      prev >= filteredStories.length - 1 ? 0 : prev + 1
    );
  };

  const handlePrevious = () => {
    setCurrentStoryIndex(prev => 
      prev <= 0 ? filteredStories.length - 1 : prev - 1
    );
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-success';
    if (confidence >= 0.7) return 'text-warning';
    return 'text-error';
  };

  // 获取分类图标
  const getCategoryIcon = (category: string) => {
    const icons = {
      performance: '🎯',
      trend: '📈',
      anomaly: '⚠️',
      opportunity: '💡',
      risk: '🔥'
    };
    return icons[category as keyof typeof icons] || '📊';
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-base-content/70">正在生成数据故事...</p>
          </div>
        </div>
      </div>
    );
  }

  if (filteredStories.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-20">
          <svg className="w-16 h-16 mx-auto text-base-content/30 mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-lg font-semibold">暂无可讲述的数据故事</p>
          <p className="text-base-content/60">等待更多数据累积后重新生成故事</p>
        </div>
      </div>
    );
  }

  const currentStory = filteredStories[currentStoryIndex];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 数据故事化标题和控制区 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-info text-info-content rounded-full w-12 h-12">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1h-1v1z" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">数据故事化</h1>
            <p className="text-base-content/70">用故事的方式解读数据洞察</p>
          </div>
        </div>

        {/* 播放控制和筛选 */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 分类筛选 */}
          <select
            className="select select-bordered select-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">全部故事</option>
            <option value="performance">🎯 绩效故事</option>
            <option value="trend">📈 趋势故事</option>
            <option value="anomaly">⚠️ 异常故事</option>
            <option value="opportunity">💡 机会故事</option>
            <option value="risk">🔥 风险故事</option>
          </select>

          {/* 播放控制 */}
          <div className="join">
            <button 
              className="btn btn-sm join-item"
              onClick={handlePrevious}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              className={`btn btn-sm join-item ${isPlaying ? 'btn-primary' : ''}`}
              onClick={handlePlayToggle}
            >
              {isPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button 
              className="btn btn-sm join-item"
              onClick={handleNext}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 故事导航器 */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-title">故事导航</h2>
            <div className="badge badge-info">{currentStoryIndex + 1} / {filteredStories.length}</div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {filteredStories.map((story, index) => (
              <button
                key={story.id}
                className={`btn btn-sm ${index === currentStoryIndex ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCurrentStoryIndex(index)}
              >
                <span>{getCategoryIcon(story.category)}</span>
                <span className="truncate">{story.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 主故事展示区 */}
      <div className="card bg-gradient-to-br from-base-100 to-base-200 shadow-xl">
        <div className="card-body">
          {/* 故事标题和元信息 */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{getCategoryIcon(currentStory.category)}</div>
              <div>
                <h1 className="text-2xl font-bold">{currentStory.title}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-base-content/70">
                  <span>置信度: <span className={`font-semibold ${getConfidenceColor(currentStory.confidence)}`}>
                    {(currentStory.confidence * 100).toFixed(0)}%
                  </span></span>
                  <span>类型: {currentStory.category}</span>
                  <span>{new Date(currentStory.timestamp).toLocaleString('zh-CN')}</span>
                </div>
              </div>
            </div>
            
            {currentStory.actionable && (
              <div className="badge badge-success gap-2">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                可执行
              </div>
            )}
          </div>

          {/* 故事叙述 */}
          <div className="prose prose-lg max-w-none mb-6">
            <p className="text-lg leading-relaxed">{currentStory.narrative}</p>
          </div>

          {/* 关键要点 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card bg-base-100 shadow">
              <div className="card-body p-4">
                <h3 className="card-title text-lg">📋 关键要点</h3>
                <ul className="space-y-2 mt-3">
                  {currentStory.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="badge badge-primary badge-sm mt-1">{index + 1}</div>
                      <span className="text-sm">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 数据证据 */}
            <div className="card bg-base-100 shadow">
              <div className="card-body p-4">
                <h3 className="card-title text-lg">📊 数据证据</h3>
                <div className="space-y-3 mt-3">
                  {currentStory.dataEvidence.map((evidence, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{evidence.metric}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{evidence.value}</span>
                        {evidence.change !== 0 && (
                          <span className={`text-xs badge ${
                            evidence.change > 0 ? 'badge-success' : 'badge-error'
                          }`}>
                            {evidence.change > 0 ? '+' : ''}{evidence.change.toFixed(1)}%
                          </span>
                        )}
                        <div className={`badge badge-xs ${
                          evidence.significance === 'high' ? 'badge-error' :
                          evidence.significance === 'medium' ? 'badge-warning' : 'badge-info'
                        }`}>
                          {evidence.significance}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 视觉隐喻 */}
          <div className="card bg-base-100 shadow">
            <div className="card-body p-4">
              <h3 className="card-title text-lg">🎨 视觉解读</h3>
              <div className="flex flex-wrap gap-4 mt-3">
                {currentStory.visualMetaphors.map((metaphor, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                    <div className="text-2xl text-primary">{metaphor.icon}</div>
                    <span className="text-sm">{metaphor.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 故事操作 */}
          <div className="card-actions justify-end mt-6">
            <button className="btn btn-ghost btn-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
              </svg>
              分享故事
            </button>
            <button className="btn btn-ghost btn-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              导出报告
            </button>
            {currentStory.actionable && (
              <button className="btn btn-primary btn-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                立即行动
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 故事统计摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {(['performance', 'trend', 'anomaly', 'opportunity', 'risk'] as const).map(category => {
          const count = dataStories.filter(s => s.category === category).length;
          const categoryName = {
            performance: '绩效故事',
            trend: '趋势故事', 
            anomaly: '异常故事',
            opportunity: '机会故事',
            risk: '风险故事'
          }[category];
          
          return (
            <div key={category} className="stat bg-base-200 rounded-lg">
              <div className="stat-figure text-primary">
                <span className="text-2xl">{getCategoryIcon(category)}</span>
              </div>
              <div className="stat-title text-xs">{categoryName}</div>
              <div className="stat-value text-lg">{count}</div>
              <div className="stat-desc">个故事</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DataStorytellingModule;