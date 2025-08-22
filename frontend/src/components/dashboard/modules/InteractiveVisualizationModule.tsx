import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useManagementDashboard } from '@/hooks/management/useManagementDashboard';
import { useSystemMonitoring } from '@/hooks/monitoring/useSystemMonitoring';
import { usePersonalizedView } from '@/hooks/personalization/usePersonalizedView';

interface InteractiveVisualizationModuleProps {
  className?: string;
  autoRefresh?: boolean;
}

type ChartType = 'kpi_trends' | 'department_comparison' | 'risk_matrix' | 'workflow_status' | 'custom';
type InteractionMode = 'view' | 'drill' | 'filter' | 'export';

interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  description: string;
  icon: React.ReactNode;
  interactable: boolean;
  exportable: boolean;
}

/**
 * 交互式可视化模块
 * 
 * 提供丰富的数据可视化和交互功能
 * 与其他统计模块的差异：专注于数据的视觉呈现和交互探索
 * 
 * 核心功能：
 * 1. DynamicChartGrid - 动态图表网格
 * 2. InteractiveFilters - 交互式筛选器
 * 3. DrillDownAnalysis - 下钻分析
 * 4. CustomVisualization - 自定义可视化
 * 5. RealTimeDataStreaming - 实时数据流
 * 
 * 设计原则：
 * - 交互性：丰富的用户交互和数据探索功能
 * - 实时性：动态更新和实时数据展示
 * - 可定制：用户可以自定义图表类型和布局
 */
export const InteractiveVisualizationModule: React.FC<InteractiveVisualizationModuleProps> = ({
  className = '',
  autoRefresh = true
}) => {
  const [selectedCharts, setSelectedCharts] = useState<string[]>(['kpi_trends', 'department_comparison']);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('view');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [drillDownData, setDrillDownData] = useState<any>(null);
  const [customConfig, setCustomConfig] = useState<any>(null);

  // 数据源
  const { data: managementData, isLoading: mgmtLoading } = useManagementDashboard();
  const { data: monitoringData, isLoading: monitorLoading } = useSystemMonitoring();
  const { viewState, config } = usePersonalizedView();

  const isLoading = mgmtLoading || monitorLoading;

  // 图表配置
  const chartConfigs: ChartConfig[] = useMemo(() => [
    {
      id: 'kpi_trends',
      type: 'kpi_trends',
      title: 'KPI趋势分析',
      description: '关键绩效指标的时间序列趋势',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      interactable: true,
      exportable: true
    },
    {
      id: 'department_comparison',
      type: 'department_comparison',
      title: '部门对比分析',
      description: '各部门绩效指标的横向对比',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      ),
      interactable: true,
      exportable: true
    },
    {
      id: 'risk_matrix',
      type: 'risk_matrix',
      title: '风险矩阵热图',
      description: '风险概率与影响的二维分布',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      interactable: true,
      exportable: true
    },
    {
      id: 'workflow_status',
      type: 'workflow_status',
      title: '工作流状态图',
      description: '业务流程的实时状态展示',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
      interactable: false,
      exportable: true
    }
  ], []);

  // 处理图表选择
  const handleChartToggle = (chartId: string) => {
    setSelectedCharts(prev => 
      prev.includes(chartId) 
        ? prev.filter(id => id !== chartId)
        : [...prev, chartId]
    );
  };

  // 处理交互模式切换
  const handleInteractionModeChange = (mode: InteractionMode) => {
    setInteractionMode(mode);
  };

  // 处理筛选器变更
  const handleFilterChange = (filterKey: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  // 处理下钻分析
  const handleDrillDown = (chartId: string, dataPoint: any) => {
    setDrillDownData({
      chartId,
      dataPoint,
      timestamp: new Date().toISOString()
    });
  };

  // 处理数据导出
  const handleExport = (chartId: string, format: 'png' | 'pdf' | 'csv' | 'json') => {
    console.log(`导出图表 ${chartId} 为 ${format} 格式`);
    // 实际应用中会调用相应的导出API
  };

  // 模拟图表组件
  const MockChart = ({ config, data }: { config: ChartConfig; data?: any }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div 
        className={`card bg-base-100 shadow-lg transition-all duration-300 ${
          isHovered ? 'shadow-xl scale-[1.02]' : ''
        } ${interactionMode === 'drill' ? 'cursor-crosshair' : 'cursor-pointer'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (interactionMode === 'drill') {
            handleDrillDown(config.id, { x: 100, y: 200, value: Math.random() * 100 });
          }
        }}
      >
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h3 className="card-title flex items-center gap-2">
              {config.icon}
              {config.title}
            </h3>
            <div className="flex gap-1">
              {config.interactable && (
                <div className="tooltip" data-tip="支持交互">
                  <div className="badge badge-info badge-xs">交互</div>
                </div>
              )}
              {config.exportable && (
                <div className="tooltip" data-tip="可导出">
                  <div className="badge badge-success badge-xs">导出</div>
                </div>
              )}
            </div>
          </div>
          
          <p className="text-sm text-base-content/70 mb-4">{config.description}</p>
          
          {/* 模拟图表内容 */}
          <div className="h-64 bg-base-200 rounded-lg flex items-center justify-center relative overflow-hidden">
            {/* 背景网格 */}
            <div className="absolute inset-0 opacity-10">
              <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div key={i} className="border border-base-content/20"></div>
                ))}
              </div>
            </div>
            
            {/* 图表内容 */}
            <div className="relative z-10 text-center">
              <div className="text-4xl mb-2">{config.icon}</div>
              <div className="text-lg font-semibold">{config.title}</div>
              <div className="text-sm text-base-content/60">模拟数据可视化</div>
              
              {/* 交互提示 */}
              {interactionMode === 'drill' && config.interactable && (
                <div className="absolute top-2 right-2">
                  <div className="badge badge-warning badge-sm animate-pulse">点击下钻</div>
                </div>
              )}
            </div>
            
            {/* 模拟数据点 */}
            {config.interactable && (
              <div className="absolute inset-0">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className={`absolute w-2 h-2 bg-primary rounded-full transition-all duration-300 ${
                      isHovered ? 'animate-pulse' : ''
                    }`}
                    style={{
                      left: `${10 + (i % 4) * 20}%`,
                      bottom: `${20 + Math.random() * 60}%`
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* 图表操作 */}
          <div className="card-actions justify-end mt-4">
            {config.exportable && (
              <div className="dropdown dropdown-top dropdown-end">
                <label tabIndex={0} className="btn btn-ghost btn-xs">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  导出
                </label>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
                  <li><a onClick={() => handleExport(config.id, 'png')}>PNG图片</a></li>
                  <li><a onClick={() => handleExport(config.id, 'pdf')}>PDF文档</a></li>
                  <li><a onClick={() => handleExport(config.id, 'csv')}>CSV数据</a></li>
                  <li><a onClick={() => handleExport(config.id, 'json')}>JSON数据</a></li>
                </ul>
              </div>
            )}
            {config.interactable && (
              <button 
                className="btn btn-ghost btn-xs"
                onClick={() => handleDrillDown(config.id, { action: 'fullscreen' })}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                详情
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-base-content/70">加载可视化组件中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 可视化模块标题和控制区 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-accent text-accent-content rounded-full w-12 h-12">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">交互式可视化</h1>
            <p className="text-base-content/70">动态数据展示与交互分析</p>
          </div>
        </div>

        {/* 交互模式控制 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="join">
            {(['view', 'drill', 'filter', 'export'] as InteractionMode[]).map((mode) => (
              <button
                key={mode}
                className={`btn btn-sm join-item ${interactionMode === mode ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => handleInteractionModeChange(mode)}
              >
                {mode === 'view' && '👁️ 查看'}
                {mode === 'drill' && '🔍 下钻'}
                {mode === 'filter' && '🎛️ 筛选'}
                {mode === 'export' && '📥 导出'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 图表选择器 */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">图表配置</h2>
          <p className="text-sm text-base-content/70 mb-4">选择要显示的可视化图表</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {chartConfigs.map((config) => (
              <div key={config.id} className="form-control">
                <label className="label cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={selectedCharts.includes(config.id)}
                      onChange={() => handleChartToggle(config.id)}
                    />
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <span className="label-text font-medium">{config.title}</span>
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 交互式筛选器 */}
      {interactionMode === 'filter' && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">数据筛选</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">时间范围</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={activeFilters.timeRange || '3months'}
                  onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                >
                  <option value="1month">近1个月</option>
                  <option value="3months">近3个月</option>
                  <option value="6months">近6个月</option>
                  <option value="12months">近12个月</option>
                </select>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">部门筛选</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={activeFilters.department || 'all'}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                >
                  <option value="all">全部部门</option>
                  <option value="tech">技术部门</option>
                  <option value="sales">销售部门</option>
                  <option value="hr">人事部门</option>
                  <option value="finance">财务部门</option>
                </select>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">指标类型</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={activeFilters.metricType || 'all'}
                  onChange={(e) => handleFilterChange('metricType', e.target.value)}
                >
                  <option value="all">全部指标</option>
                  <option value="performance">绩效指标</option>
                  <option value="financial">财务指标</option>
                  <option value="operational">运营指标</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 动态图表网格 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {chartConfigs
          .filter(config => selectedCharts.includes(config.id))
          .map(config => (
            <MockChart 
              key={config.id} 
              config={config}
              data={activeFilters}
            />
          ))}
      </div>

      {/* 无选中图表时的提示 */}
      {selectedCharts.length === 0 && (
        <div className="text-center py-20">
          <svg className="w-16 h-16 mx-auto text-base-content/30 mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-lg font-semibold">暂未选择任何图表</p>
          <p className="text-base-content/60">请在图表配置中选择要显示的可视化内容</p>
        </div>
      )}

      {/* 下钻分析结果 */}
      {drillDownData && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">下钻分析详情</h3>
            <div className="space-y-4">
              <div className="alert alert-info">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>图表ID: {drillDownData.chartId}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="stat bg-base-200 rounded">
                  <div className="stat-title">数据点</div>
                  <div className="stat-value text-lg">{JSON.stringify(drillDownData.dataPoint)}</div>
                </div>
                <div className="stat bg-base-200 rounded">
                  <div className="stat-title">分析时间</div>
                  <div className="stat-value text-lg">{new Date(drillDownData.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-ghost"
                onClick={() => setDrillDownData(null)}
              >
                关闭
              </button>
              <button className="btn btn-primary">保存分析</button>
            </div>
          </div>
        </div>
      )}

      {/* 交互说明 */}
      <div className="alert alert-info">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>
          当前交互模式：<strong>{
            interactionMode === 'view' ? '查看模式' :
            interactionMode === 'drill' ? '下钻分析模式' :
            interactionMode === 'filter' ? '数据筛选模式' : '数据导出模式'
          }</strong>
          {interactionMode === 'drill' && ' - 点击图表进行下钻分析'}
        </span>
      </div>
    </div>
  );
};

export default InteractiveVisualizationModule;