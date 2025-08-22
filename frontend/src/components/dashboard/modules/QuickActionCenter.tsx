import React, { useState, useMemo } from 'react';
import { useManagementDashboard } from '@/hooks/management/useManagementDashboard';
import { usePersonalizedView } from '@/hooks/personalization/usePersonalizedView';

interface QuickActionCenterProps {
  className?: string;
  layout?: 'grid' | 'list' | 'compact';
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'report' | 'analysis' | 'workflow' | 'export' | 'management';
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  requiredPermissions?: string[];
  url?: string;
  action?: () => void;
  status?: 'available' | 'processing' | 'completed' | 'disabled';
  badgeText?: string;
  badgeColor?: string;
}

/**
 * 快速行动中心组件
 * 
 * 集中展示和执行常用的管理操作和分析任务
 * 与其他模块的差异：专注于操作执行而非数据展示
 * 
 * 核心功能：
 * 1. ActionGrid - 操作网格布局
 * 2. SmartRecommendations - 智能推荐操作
 * 3. RecentActions - 最近执行记录
 * 4. QuickFilters - 快速筛选功能
 * 5. BatchOperations - 批量操作支持
 * 
 * 设计原则：
 * - 效率导向：最常用的操作放在最显眼的位置
 * - 智能推荐：根据用户行为和数据状态推荐相关操作
 * - 状态感知：根据系统状态动态启用/禁用操作
 */
export const QuickActionCenter: React.FC<QuickActionCenterProps> = ({
  className = '',
  layout = 'grid'
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentActions, setRecentActions] = useState<string[]>([]);
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());

  const { data: managementData } = useManagementDashboard();
  const { config } = usePersonalizedView();

  // 预定义的快速操作
  const allActions: QuickAction[] = useMemo(() => [
    {
      id: 'monthly-report',
      title: '生成月度报告',
      description: '生成当月薪资统计和分析报告',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
        </svg>
      ),
      category: 'report',
      priority: 'high',
      estimatedTime: '2-3分钟',
      badgeText: '热门',
      badgeColor: 'badge-error'
    },
    {
      id: 'payroll-analysis',
      title: '薪资数据分析',
      description: '深度分析薪资结构和趋势',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clipRule="evenodd" />
        </svg>
      ),
      category: 'analysis',
      priority: 'high',
      estimatedTime: '5-10分钟'
    },
    {
      id: 'hr-overview',
      title: '人事概览',
      description: '查看员工统计和部门分布',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
      category: 'analysis',
      priority: 'medium',
      estimatedTime: '1-2分钟',
      badgeText: '快速',
      badgeColor: 'badge-success'
    },
    {
      id: 'export-payroll',
      title: '导出薪资数据',
      description: '导出Excel格式的薪资明细',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      ),
      category: 'export',
      priority: 'medium',
      estimatedTime: '30秒-1分钟'
    },
    {
      id: 'bulk-approval',
      title: '批量审批',
      description: '批量处理待审批的薪资项目',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ),
      category: 'workflow',
      priority: 'high',
      estimatedTime: '3-5分钟',
      status: 'disabled' // 示例：当前无待审批项目
    },
    {
      id: 'dashboard-customize',
      title: '自定义仪表板',
      description: '个性化配置仪表板布局',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
      category: 'management',
      priority: 'low',
      estimatedTime: '5-15分钟'
    },
    {
      id: 'trend-forecast',
      title: '趋势预测',
      description: '基于历史数据预测未来趋势',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      category: 'analysis',
      priority: 'medium',
      estimatedTime: '10-20分钟',
      badgeText: 'AI',
      badgeColor: 'badge-info'
    },
    {
      id: 'security-audit',
      title: '安全审计',
      description: '检查系统访问日志和权限',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      category: 'management',
      priority: 'low',
      estimatedTime: '15-30分钟'
    }
  ], []);

  // 智能推荐操作
  const recommendedActions = useMemo(() => {
    if (!managementData) return [];
    
    const recommendations = [];
    
    // 基于风险状态推荐
    const highRisks = managementData.risks.filter(r => r.level === 'high');
    if (highRisks.length > 0) {
      recommendations.push('security-audit');
      recommendations.push('bulk-approval');
    }
    
    // 基于时间推荐
    const currentDate = new Date();
    const isMonthEnd = currentDate.getDate() > 25;
    if (isMonthEnd) {
      recommendations.push('monthly-report');
      recommendations.push('export-payroll');
    }
    
    // 基于用户配置推荐
    if (config?.layout === 'executive') {
      recommendations.push('trend-forecast');
      recommendations.push('payroll-analysis');
    }
    
    return [...new Set(recommendations)]; // 去重
  }, [managementData, config]);

  // 筛选操作
  const filteredActions = useMemo(() => {
    let filtered = allActions;
    
    // 分类筛选
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(action => action.category === selectedCategory);
    }
    
    // 搜索筛选
    if (searchQuery) {
      filtered = filtered.filter(action => 
        action.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [allActions, selectedCategory, searchQuery]);

  // 处理操作执行
  const handleActionExecute = async (action: QuickAction) => {
    if (action.status === 'disabled' || processingActions.has(action.id)) {
      return;
    }
    
    setProcessingActions(prev => new Set(prev).add(action.id));
    
    try {
      // 模拟操作执行
      console.log(`执行操作: ${action.title}`);
      
      if (action.action) {
        action.action();
      } else if (action.url) {
        window.open(action.url, '_blank');
      }
      
      // 模拟处理时间
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 添加到最近操作
      setRecentActions(prev => [action.id, ...prev.filter(id => id !== action.id)].slice(0, 5));
      
    } catch (error) {
      console.error('操作执行失败:', error);
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(action.id);
        return newSet;
      });
    }
  };

  // 获取操作状态样式
  const getActionStatusStyle = (action: QuickAction) => {
    if (action.status === 'disabled') {
      return 'opacity-50 cursor-not-allowed';
    }
    if (processingActions.has(action.id)) {
      return 'opacity-75';
    }
    return 'hover:scale-105 transition-all duration-200 cursor-pointer';
  };

  // 获取分类图标
  const getCategoryIcon = (category: string) => {
    const icons = {
      report: '📊',
      analysis: '🔍',
      workflow: '⚡',
      export: '📥',
      management: '⚙️'
    };
    return icons[category as keyof typeof icons] || '📋';
  };

  // 渲染操作卡片
  const renderActionCard = (action: QuickAction) => {
    const isProcessing = processingActions.has(action.id);
    const isRecommended = recommendedActions.includes(action.id);
    
    return (
      <div
        key={action.id}
        className={`card bg-base-100 shadow-lg ${getActionStatusStyle(action)} ${
          isRecommended ? 'ring-2 ring-primary ring-opacity-50' : ''
        }`}
        onClick={() => handleActionExecute(action)}
      >
        <div className="card-body p-4">
          {/* 卡片头部 */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                action.priority === 'high' ? 'bg-error/10 text-error' :
                action.priority === 'medium' ? 'bg-warning/10 text-warning' :
                'bg-info/10 text-info'
              }`}>
                {action.icon}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{action.title}</h3>
                <p className="text-xs text-base-content/70">{action.description}</p>
              </div>
            </div>
            
            {/* 状态指示器 */}
            <div className="flex flex-col items-end gap-1">
              {action.badgeText && (
                <div className={`badge badge-xs ${action.badgeColor || 'badge-neutral'}`}>
                  {action.badgeText}
                </div>
              )}
              {isRecommended && (
                <div className="badge badge-xs badge-primary">推荐</div>
              )}
              {isProcessing && (
                <span className="loading loading-spinner loading-xs"></span>
              )}
            </div>
          </div>
          
          {/* 操作信息 */}
          <div className="flex items-center justify-between mt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base-content/60">预计:</span>
              <span className="font-medium">{action.estimatedTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{getCategoryIcon(action.category)}</span>
              <span className="text-base-content/60 capitalize">{action.category}</span>
            </div>
          </div>
          
          {/* 处理状态 */}
          {isProcessing && (
            <div className="mt-2">
              <div className="progress progress-primary progress-xs"></div>
              <div className="text-xs text-center mt-1 text-primary">处理中...</div>
            </div>
          )}
          
          {action.status === 'disabled' && (
            <div className="mt-2 text-xs text-center text-base-content/50">
              当前不可用
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 快速行动中心标题和控制区 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-primary text-primary-content rounded-full w-12 h-12">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">快速行动中心</h1>
            <p className="text-base-content/70">高效执行常用管理操作</p>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="form-control">
            <input
              type="text"
              placeholder="搜索操作..."
              className="input input-bordered input-sm w-48"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select
            className="select select-bordered select-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">全部分类</option>
            <option value="report">📊 报告</option>
            <option value="analysis">🔍 分析</option>
            <option value="workflow">⚡ 工作流</option>
            <option value="export">📥 导出</option>
            <option value="management">⚙️ 管理</option>
          </select>
        </div>
      </div>

      {/* 智能推荐区域 */}
      {recommendedActions.length > 0 && (
        <div className="card bg-gradient-to-r from-primary/5 to-secondary/5 shadow-lg">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              智能推荐操作
              <div className="badge badge-primary">{recommendedActions.length}</div>
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              基于当前系统状态和您的使用习惯推荐的操作
            </p>
            <div className="flex flex-wrap gap-2">
              {recommendedActions.map(actionId => {
                const action = allActions.find(a => a.id === actionId);
                if (!action) return null;
                
                return (
                  <button
                    key={actionId}
                    className="btn btn-primary btn-sm gap-2"
                    onClick={() => handleActionExecute(action)}
                    disabled={processingActions.has(actionId)}
                  >
                    {action.icon}
                    {action.title}
                    {processingActions.has(actionId) && (
                      <span className="loading loading-spinner loading-xs"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 操作网格 */}
      <div className={`grid gap-4 ${
        layout === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
        layout === 'list' ? 'grid-cols-1' :
        'grid-cols-1 md:grid-cols-2'
      }`}>
        {filteredActions.map(renderActionCard)}
      </div>

      {/* 无匹配结果 */}
      {filteredActions.length === 0 && (
        <div className="text-center py-20">
          <svg className="w-16 h-16 mx-auto text-base-content/30 mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <p className="text-lg font-semibold">未找到匹配的操作</p>
          <p className="text-base-content/60">请尝试调整搜索条件或分类筛选</p>
        </div>
      )}

      {/* 最近操作记录 */}
      {recentActions.length > 0 && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">最近执行的操作</h2>
            <div className="flex flex-wrap gap-2">
              {recentActions.map(actionId => {
                const action = allActions.find(a => a.id === actionId);
                if (!action) return null;
                
                return (
                  <div key={actionId} className="badge badge-ghost gap-1">
                    <span className="text-xs">{getCategoryIcon(action.category)}</span>
                    {action.title}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 操作统计 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(['report', 'analysis', 'workflow', 'export', 'management'] as const).map(category => {
          const count = allActions.filter(a => a.category === category).length;
          const availableCount = allActions.filter(a => a.category === category && a.status !== 'disabled').length;
          
          return (
            <div key={category} className="stat bg-base-200 rounded-lg">
              <div className="stat-figure text-primary">
                <span className="text-2xl">{getCategoryIcon(category)}</span>
              </div>
              <div className="stat-title text-xs capitalize">{category}</div>
              <div className="stat-value text-lg">{availableCount}/{count}</div>
              <div className="stat-desc">可用操作</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActionCenter;