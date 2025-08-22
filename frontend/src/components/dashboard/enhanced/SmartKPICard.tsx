import React from 'react';
import type { DecisionKPI, RiskIndicator } from '@/hooks/management/useManagementDashboard';

interface SmartKPIStatProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
  status?: 'excellent' | 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
  description?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  insights?: string[];
  actionable?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * 智能KPI统计组件 - DaisyUI 5 Stat组件标准化
 * 
 * 完全基于DaisyUI 5 stat组件设计，替换原有的card组件
 * 核心特性：
 * 1. 使用标准 DaisyUI stat 组件结构
 * 2. 语义化的数据展示
 * 3. 内置趋势和状态指示
 * 4. 响应式和无障碍优化
 * 5. 统一的视觉层次
 */
export const SmartKPIStat: React.FC<SmartKPIStatProps> = ({
  title,
  value,
  unit = '',
  trend,
  status = 'good',
  icon,
  description,
  riskLevel = 'low',
  insights = [],
  actionable = false,
  onClick,
  className = ''
}) => {
  // DaisyUI 5 Stat组件样式映射
  const getStatClasses = () => {
    const baseClasses = "stat bg-base-100 shadow rounded-box";
    const clickableClasses = actionable || onClick ? "cursor-pointer hover:shadow-md transition-shadow duration-200" : "";
    const statusClasses = {
      excellent: "border-l-4 border-success",
      good: "border-l-4 border-info", 
      warning: "border-l-4 border-warning",
      critical: "border-l-4 border-error"
    };
    
    return `${baseClasses} ${clickableClasses} ${statusClasses[status]} ${className}`.trim();
  };

  // DaisyUI 5 标准趋势显示（stat-desc格式）
  const getTrendDescription = () => {
    if (!trend) return description;

    const { direction, percentage, period } = trend;
    const arrows = {
      up: "↗",
      down: "↘",
      stable: "→"
    };

    const trendText = `${arrows[direction]} ${Math.abs(percentage)}% ${period}`;
    return description ? `${description} • ${trendText}` : trendText;
  };

  // 状态颜色映射（stat-value使用）
  const getValueColorClass = () => {
    const colors = {
      excellent: "text-success",
      good: "text-info", 
      warning: "text-warning",
      critical: "text-error"
    };
    return colors[status];
  };

  // 获取图标颜色
  const getIconColorClass = () => {
    const colors = {
      excellent: "text-success",
      good: "text-info", 
      warning: "text-warning",
      critical: "text-error"
    };
    return colors[status];
  };

  // DaisyUI 5 标准交互处理
  const handleClick = () => {
    if (actionable || onClick) {
      onClick?.();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((actionable || onClick) && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div 
      className={getStatClasses()}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={actionable || onClick ? "button" : "region"}
      tabIndex={actionable || onClick ? 0 : undefined}
      aria-label={`${title}: ${value}${unit}`}
    >
      {/* DaisyUI 5 标准stat结构 */}
      <div className="stat-figure text-2xl">
        <div className={getIconColorClass()}>
          {icon}
        </div>
      </div>
      
      <div className="stat-title flex items-center justify-between">
        <span>{title}</span>
        {/* 风险标识作为stat-title的补充 */}
        {riskLevel !== 'low' && (
          <div className={`badge badge-sm ${
            riskLevel === 'critical' ? 'badge-error animate-pulse' :
            riskLevel === 'high' ? 'badge-error' :
            'badge-warning'
          }`}>
            {riskLevel === 'critical' ? '严重' : 
             riskLevel === 'high' ? '高风险' : '中风险'}
          </div>
        )}
      </div>
      
      <div className={`stat-value ${getValueColorClass()}`}>
        {value}
        {unit && <span className="stat-unit text-base opacity-60">{unit}</span>}
      </div>
      
      <div className="stat-desc text-base-content/60">
        {getTrendDescription()}
      </div>

      {/* 洞察信息（作为stat的补充信息） */}
      {insights.length > 0 && (
        <div className="mt-2">
          <div className="tooltip tooltip-top w-full" data-tip={insights[0]}>
            <div className="alert alert-info py-1 px-2 text-xs">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>{insights[0]}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* 可点击提示 */}
      {(actionable || onClick) && (
        <div className="stat-actions mt-2">
          <div className="badge badge-outline badge-xs opacity-50">
            点击查看详情 →
          </div>
        </div>
      )}
    </div>
  );
};

// 为了保持向后兼容性，保留SmartKPICard别名
export const SmartKPICard = SmartKPIStat;

// 预定义的KPI统计组件类型（基于DaisyUI stat）
export const BudgetExecutionStat: React.FC<{
  rate: number;
  trend?: SmartKPIStatProps['trend'];
  onClick?: () => void;
}> = ({ rate, trend, onClick }) => (
  <SmartKPIStat
    title="预算执行率"
    value={rate}
    unit="%"
    trend={trend}
    status={rate >= 90 ? 'excellent' : rate >= 80 ? 'good' : rate >= 70 ? 'warning' : 'critical'}
    riskLevel={rate < 70 ? 'high' : rate < 80 ? 'medium' : 'low'}
    icon={
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
      </svg>
    }
    description="月度预算控制情况"
    insights={[
      `当前执行率${rate}%，${rate >= 85 ? '在合理范围内' : '需要重点关注'}`
    ]}
    actionable
    onClick={onClick}
  />
);

export const LaborEfficiencyStat: React.FC<{
  efficiency: number;
  trend?: SmartKPIStatProps['trend'];
  onClick?: () => void;
}> = ({ efficiency, trend, onClick }) => (
  <SmartKPIStat
    title="人力成本效率"
    value={efficiency}
    unit="%"
    trend={trend}
    status={efficiency >= 85 ? 'excellent' : efficiency >= 75 ? 'good' : efficiency >= 60 ? 'warning' : 'critical'}
    riskLevel={efficiency < 60 ? 'high' : efficiency < 75 ? 'medium' : 'low'}
    icon={
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    }
    description="人均产出效率评估"
    insights={[
      `效率指数${efficiency}%，${efficiency >= 80 ? '人力配置合理' : '有优化空间'}`
    ]}
    actionable
    onClick={onClick}
  />
);

export const OrganizationHealthStat: React.FC<{
  score: number;
  trend?: SmartKPIStatProps['trend'];
  onClick?: () => void;
}> = ({ score, trend, onClick }) => (
  <SmartKPIStat
    title="组织健康度"
    value={score}
    unit="分"
    trend={trend}
    status={score >= 85 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'warning' : 'critical'}
    riskLevel={score < 60 ? 'high' : score < 75 ? 'medium' : 'low'}
    icon={
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
      </svg>
    }
    description="综合组织运营状况"
    insights={[
      `健康指数${score}分，${score >= 80 ? '组织运营良好' : '需要改善措施'}`
    ]}
    actionable
    onClick={onClick}
  />
);

export const RiskLevelStat: React.FC<{
  level: 'low' | 'medium' | 'high' | 'critical';
  riskCount: number;
  onClick?: () => void;
}> = ({ level, riskCount, onClick }) => {
  const levelConfig = {
    low: { 
      value: '低风险', 
      status: 'excellent' as const,
      description: '风险控制良好',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    },
    medium: { 
      value: '中等风险', 
      status: 'warning' as const,
      description: '需要关注监控',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    },
    high: { 
      value: '高风险', 
      status: 'critical' as const,
      description: '需要立即处理',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    },
    critical: { 
      value: '严重风险', 
      status: 'critical' as const,
      description: '紧急处理必须',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )
    }
  };

  const config = levelConfig[level];

  return (
    <SmartKPIStat
      title="风险等级"
      value={config.value}
      status={config.status}
      riskLevel={level}
      icon={config.icon}
      description={`${riskCount} 个风险项需要关注`}
      insights={[config.description]}
      actionable
      onClick={onClick}
    />
  );
};

// 向后兼容性别名，保持原有的Card命名
export const BudgetExecutionCard = BudgetExecutionStat;
export const LaborEfficiencyCard = LaborEfficiencyStat;
export const OrganizationHealthCard = OrganizationHealthStat;
export const RiskLevelCard = RiskLevelStat;

export default SmartKPICard;