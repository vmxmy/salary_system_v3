import { useMemo, useEffect, useState } from 'react';
import { usePayrollAnalytics } from '@/hooks/payroll/usePayrollAnalytics';
import { useDashboard } from '@/hooks/dashboard/useDashboard';
import { useTranslation } from '@/hooks/useTranslation';
import { CHART_COLORS, CHART_COLOR_SCHEMES, onThemeChange } from './chartColors';

interface FinancialWarningDashboardProps {
  className?: string;
}

// 预警级别类型
type WarningLevel = 'safe' | 'caution' | 'warning' | 'critical';

// 预警指标类型
interface WarningMetric {
  id: string;
  name: string;
  value: number;
  threshold: {
    safe: number;
    caution: number;
    warning: number;
  };
  level: WarningLevel;
  description: string;
  trend: 'up' | 'down' | 'stable';
}

export default function FinancialWarningDashboard({ 
  className = ""
}: FinancialWarningDashboardProps) {
  const { t } = useTranslation(['dashboard']);
  const [themeColors, setThemeColors] = useState({
    primary: CHART_COLORS.primary(),
    secondary: CHART_COLORS.secondary(),
    success: CHART_COLORS.success(),
    warning: CHART_COLORS.warning(),
    error: CHART_COLORS.error(),
    info: CHART_COLORS.info(),
    neutral: CHART_COLORS.neutral(),
    background: CHART_COLORS.background(),
    border: CHART_COLORS.border(),
    text: CHART_COLORS.text(),
  });

  // 监听主题变化
  useEffect(() => {
    const updateColors = () => {
      setThemeColors({
        primary: CHART_COLORS.primary(),
        secondary: CHART_COLORS.secondary(),
        success: CHART_COLORS.success(),
        warning: CHART_COLORS.warning(),
        error: CHART_COLORS.error(),
        info: CHART_COLORS.info(),
        neutral: CHART_COLORS.neutral(),
        background: CHART_COLORS.background(),
        border: CHART_COLORS.border(),
        text: CHART_COLORS.text(),
      });
    };

    const cleanup = onThemeChange(updateColors);
    return cleanup;
  }, []);
  
  // 获取当前和上月数据进行对比
  const currentDate = new Date();
  const currentPeriod = currentDate.toISOString().slice(0, 7);
  const lastMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const lastPeriod = lastMonthDate.toISOString().slice(0, 7);
  
  const { 
    queries: { usePayrollStatistics, useDepartmentStatistics, useComparison },
    utils: { formatCurrency, formatPercentage, getTrendIcon }
  } = usePayrollAnalytics();
  
  const { stats: dashboardStats } = useDashboard();
  
  // 当前月数据
  const { 
    data: currentStats, 
    isLoading: isLoadingCurrent 
  } = usePayrollStatistics(currentPeriod);
  
  // 上月数据
  const { 
    data: lastStats,
    isLoading: isLoadingLast
  } = usePayrollStatistics(lastPeriod);
  
  // 部门数据
  const { 
    data: departmentData = [],
    isLoading: isLoadingDepartments
  } = useDepartmentStatistics(currentPeriod);

  // 对比数据
  const {
    data: comparisonData = [],
    isLoading: isLoadingComparison
  } = useComparison({
    basePeriod: lastPeriod,
    comparePeriod: currentPeriod
  });

  // 计算预警指标
  const warningMetrics = useMemo((): WarningMetric[] => {
    if (!currentStats || !lastStats || !dashboardStats) return [];

    const metrics: WarningMetric[] = [];

    // 1. 薪资增长率预警
    const growthRate = lastStats.totalGrossPay > 0 
      ? ((currentStats.totalGrossPay - lastStats.totalGrossPay) / lastStats.totalGrossPay) * 100
      : 0;
    
    metrics.push({
      id: 'growth_rate',
      name: '薪资增长率',
      value: growthRate,
      threshold: { safe: 5, caution: 10, warning: 15 },
      level: growthRate > 15 ? 'critical' : growthRate > 10 ? 'warning' : growthRate > 5 ? 'caution' : 'safe',
      description: '月度薪资增长超过预期阈值',
      trend: growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'stable'
    });

    // 2. 人均薪资偏差预警
    const avgDeviation = currentStats.totalEmployees > 0 && departmentData.length > 0
      ? Math.abs((currentStats.averageGrossPay - 
          departmentData.reduce((sum, dept) => sum + dept.averageGrossPay, 0) / departmentData.length
        ) / currentStats.averageGrossPay) * 100
      : 0;
    
    metrics.push({
      id: 'avg_deviation',
      name: '人均薪资偏差',
      value: avgDeviation,
      threshold: { safe: 10, caution: 20, warning: 30 },
      level: avgDeviation > 30 ? 'critical' : avgDeviation > 20 ? 'warning' : avgDeviation > 10 ? 'caution' : 'safe',
      description: '部门间人均薪资差异过大',
      trend: 'stable'
    });

    // 3. 扣除率预警
    const deductionRate = currentStats.totalGrossPay > 0 
      ? (currentStats.totalDeductions / currentStats.totalGrossPay) * 100
      : 0;
    
    metrics.push({
      id: 'deduction_rate',
      name: '扣除率',
      value: deductionRate,
      threshold: { safe: 25, caution: 30, warning: 35 },
      level: deductionRate > 35 ? 'critical' : deductionRate > 30 ? 'warning' : deductionRate > 25 ? 'caution' : 'safe',
      description: '扣除项占比过高可能影响员工满意度',
      trend: 'stable'
    });

    // 4. 预算执行进度预警（假设年度预算）
    const yearlyBudget = 15000000; // 假设1500万年度预算
    const monthsPassed = currentDate.getMonth() + 1;
    const expectedSpending = (yearlyBudget / 12) * monthsPassed;
    const actualSpending = currentStats.totalGrossPay * monthsPassed; // 简化计算
    const budgetProgress = expectedSpending > 0 ? (actualSpending / expectedSpending) * 100 : 0;
    
    metrics.push({
      id: 'budget_progress',
      name: '预算执行进度',
      value: budgetProgress,
      threshold: { safe: 90, caution: 100, warning: 110 },
      level: budgetProgress > 110 ? 'critical' : budgetProgress > 100 ? 'warning' : budgetProgress > 90 ? 'caution' : 'safe',
      description: '预算执行超出计划进度',
      trend: budgetProgress > 100 ? 'up' : 'stable'
    });

    return metrics;
  }, [currentStats, lastStats, dashboardStats, departmentData]);

  // 获取预警级别颜色
  const getWarningLevelColor = (level: WarningLevel) => {
    const colors = {
      safe: themeColors.success,
      caution: themeColors.warning,
      warning: themeColors.error,
      critical: themeColors.error
    };
    return colors[level];
  };

  // 获取预警图标
  const getWarningIcon = (level: WarningLevel) => {
    const icons = {
      safe: '✅',
      caution: '⚠️',
      warning: '🔶',
      critical: '🚨'
    };
    return icons[level];
  };

  // Stat组件配置
  const getStatConfig = (metric: WarningMetric) => {
    const statColor = getWarningLevelColor(metric.level);
    const valueText = `${metric.value.toFixed(1)}${metric.id.includes('rate') || metric.id.includes('progress') ? '%' : ''}`;
    
    return {
      title: metric.name,
      value: valueText,
      desc: metric.description,
      icon: getWarningIcon(metric.level),
      color: statColor,
      level: metric.level,
      trend: metric.trend
    };
  };

  const isLoading = isLoadingCurrent || isLoadingLast || isLoadingDepartments || isLoadingComparison;

  if (isLoading) {
    return (
      <div className={`card bg-base-100 shadow ${className}`}>
        <div className="card-body">
          <h2 className="card-title text-lg">财务预警仪表盘</h2>
          <div className="flex items-center justify-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  if (warningMetrics.length === 0) {
    return (
      <div className={`card bg-base-100 shadow ${className}`}>
        <div className="card-body">
          <h2 className="card-title text-lg">财务预警仪表盘</h2>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-base-content/60">暂无足够数据生成预警分析</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 计算整体风险等级
  const overallRiskLevel = warningMetrics.reduce((highest, metric) => {
    const levels = ['safe', 'caution', 'warning', 'critical'];
    const currentLevel = levels.indexOf(metric.level);
    const highestLevel = levels.indexOf(highest);
    return currentLevel > highestLevel ? metric.level : highest;
  }, 'safe' as WarningLevel);

  return (
    <div className={`card bg-base-100 shadow ${className}`}>
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title text-lg">财务预警仪表盘</h2>
          <div 
            className="badge"
            style={{
              backgroundColor: `${getWarningLevelColor(overallRiskLevel)}20`,
              color: getWarningLevelColor(overallRiskLevel),
              borderColor: getWarningLevelColor(overallRiskLevel)
            }}
          >
            {getWarningIcon(overallRiskLevel)} 整体风险: {
              overallRiskLevel === 'safe' ? '正常' :
              overallRiskLevel === 'caution' ? '注意' :
              overallRiskLevel === 'warning' ? '预警' : '严重'
            }
          </div>
        </div>

        {/* 预警指标统计卡片 */}
        <div className="stats stats-vertical lg:stats-horizontal w-full mb-6">
          {warningMetrics.map((metric) => {
            const config = getStatConfig(metric);
            return (
              <div key={metric.id} className="stat">
                <div className="stat-figure text-2xl" style={{ color: config.color }}>
                  {config.icon}
                </div>
                <div className="stat-title text-sm">{config.title}</div>
                <div 
                  className="stat-value text-2xl font-bold"
                  style={{ color: config.color }}
                >
                  {config.value}
                </div>
                <div className="stat-desc text-xs leading-tight">
                  {config.desc}
                  {metric.trend !== 'stable' && (
                    <span className="ml-2">
                      趋势: {getTrendIcon(metric.trend)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 详细信息表格 */}
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>指标</th>
                <th>当前值</th>
                <th>状态</th>
                <th>安全阈值</th>
                <th>预警阈值</th>
              </tr>
            </thead>
            <tbody>
              {warningMetrics.map((metric) => (
                <tr key={metric.id}>
                  <td className="font-medium">{metric.name}</td>
                  <td>
                    {metric.value.toFixed(1)}
                    {metric.id.includes('rate') || metric.id.includes('progress') ? '%' : ''}
                  </td>
                  <td>
                    <div 
                      className="badge badge-sm"
                      style={{
                        backgroundColor: `${getWarningLevelColor(metric.level)}20`,
                        color: getWarningLevelColor(metric.level),
                        borderColor: getWarningLevelColor(metric.level)
                      }}
                    >
                      {getWarningIcon(metric.level)}
                      {metric.level === 'safe' ? '正常' :
                       metric.level === 'caution' ? '注意' :
                       metric.level === 'warning' ? '预警' : '严重'}
                    </div>
                  </td>
                  <td>{metric.threshold.safe}{metric.id.includes('rate') || metric.id.includes('progress') ? '%' : ''}</td>
                  <td>{metric.threshold.warning}{metric.id.includes('rate') || metric.id.includes('progress') ? '%' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 统计汇总 */}
        <div className="stats shadow w-full">
          <div className="stat">
            <div className="stat-figure" style={{ color: themeColors.success }}>
              ✅
            </div>
            <div className="stat-title">正常指标</div>
            <div 
              className="stat-value text-xl font-bold"
              style={{ color: themeColors.success }}
            >
              {warningMetrics.filter(m => m.level === 'safe').length}
            </div>
          </div>
          
          <div className="stat">
            <div className="stat-figure" style={{ color: themeColors.warning }}>
              ⚠️
            </div>
            <div className="stat-title">关注指标</div>
            <div 
              className="stat-value text-xl font-bold"
              style={{ color: themeColors.warning }}
            >
              {warningMetrics.filter(m => m.level === 'caution').length}
            </div>
          </div>
          
          <div className="stat">
            <div className="stat-figure" style={{ color: themeColors.error }}>
              🔶
            </div>
            <div className="stat-title">预警指标</div>
            <div 
              className="stat-value text-xl font-bold"
              style={{ color: themeColors.error }}
            >
              {warningMetrics.filter(m => m.level === 'warning').length}
            </div>
          </div>
          
          <div className="stat">
            <div className="stat-figure" style={{ color: themeColors.error }}>
              🚨
            </div>
            <div className="stat-title">严重指标</div>
            <div 
              className="stat-value text-xl font-bold"
              style={{ color: themeColors.error }}
            >
              {warningMetrics.filter(m => m.level === 'critical').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}