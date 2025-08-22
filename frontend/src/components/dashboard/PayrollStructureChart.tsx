import { useMemo, useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePayrollAnalytics } from '@/hooks/payroll/usePayrollAnalytics';
import { useTranslation } from '@/hooks/useTranslation';
import { CHART_COLORS, CHART_COLOR_SCHEMES, onThemeChange } from './chartColors';

interface PayrollStructureChartProps {
  className?: string;
  height?: number;
  period?: string;
}


export default function PayrollStructureChart({ 
  className = "", 
  height = 350,
  period 
}: PayrollStructureChartProps) {
  const { t } = useTranslation(['dashboard']);
  const [themeColors, setThemeColors] = useState({
    primary: CHART_COLORS.primary(),
    secondary: CHART_COLORS.secondary(),
    accent: CHART_COLORS.accent(),
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
        accent: CHART_COLORS.accent(),
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
  
  // 如果没有指定期间，使用当前月份
  const currentPeriod = period || new Date().toISOString().slice(0, 7);
  
  const { 
    queries: { usePayrollStatistics, useComponentAnalysis }, 
    utils: { formatCurrency, formatPercentage } 
  } = usePayrollAnalytics();
  
  const { 
    data: statsData,
    isLoading: isLoadingStats, 
    error: statsError 
  } = usePayrollStatistics(currentPeriod);

  const {
    data: componentData = [],
    isLoading: isLoadingComponents,
    error: componentError
  } = useComponentAnalysis(currentPeriod);

  // 转换统计数据为饼图格式
  const structureData = useMemo(() => {
    if (!statsData) return [];

    return [
      {
        name: '应发工资',
        value: statsData.totalGrossPay,
        color: themeColors.primary,
        description: '员工基本工资和各项津贴补助'
      },
      {
        name: '扣除项',
        value: statsData.totalDeductions,
        color: themeColors.warning,
        description: '个税、社保、公积金等扣除'
      },
      {
        name: '实发工资',
        value: statsData.totalNetPay,
        color: themeColors.success,
        description: '扣除各项费用后的实际发放金额'
      }
    ].filter(item => item.value > 0);
  }, [statsData, themeColors]);

  // 转换组件数据为环形图格式（外环）
  const componentStructureData = useMemo(() => {
    const colorArray = [
      themeColors.primary,
      themeColors.secondary,
      themeColors.accent,
      themeColors.info,
      themeColors.success,
      themeColors.warning,
      themeColors.error,
      themeColors.neutral
    ];
    
    return componentData
      .slice(0, 6) // 只显示前6个组件避免过于复杂
      .map((component, index) => ({
        name: component.componentName || '未知组件',
        value: Math.abs(component.totalAmount),
        color: colorArray[index % colorArray.length],
        type: component.componentType,
        employeeCount: component.employeeCount,
        averageAmount: component.averageAmount
      }));
  }, [componentData, themeColors]);

  // 自定义工具提示
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div 
          className="p-3 shadow-lg border rounded-lg"
          style={{
            backgroundColor: themeColors.background,
            borderColor: themeColors.border,
            color: themeColors.text
          }}
        >
          <p className="font-semibold" style={{ color: themeColors.text }}>{data.name}</p>
          <div className="space-y-1 mt-2">
            <p style={{ color: themeColors.primary }}>
              金额：{formatCurrency(data.value)}
            </p>
            {data.description && (
              <p className="text-sm" style={{ color: themeColors.text, opacity: 0.7 }}>
                {data.description}
              </p>
            )}
            {data.employeeCount && (
              <p className="text-sm" style={{ color: themeColors.text, opacity: 0.7 }}>
                涉及：{data.employeeCount}人
              </p>
            )}
            {data.averageAmount && (
              <p className="text-sm" style={{ color: themeColors.text, opacity: 0.7 }}>
                人均：{formatCurrency(data.averageAmount)}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // 自定义标签渲染
  const renderLabel = (entry: any) => {
    const percent = ((entry.value / entry.payload.totalValue) * 100).toFixed(1);
    return `${entry.name} ${percent}%`;
  };

  const isLoading = isLoadingStats || isLoadingComponents;
  const error = statsError || componentError;

  if (isLoading) {
    return (
      <div className={`card bg-base-100 shadow ${className}`}>
        <div className="card-body">
          <h2 className="card-title text-lg">薪资结构分析</h2>
          <div className="flex items-center justify-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`card bg-base-100 shadow ${className}`}>
        <div className="card-body">
          <h2 className="card-title text-lg">薪资结构分析</h2>
          <div className="alert alert-error">
            <span>数据加载失败，请稍后重试</span>
          </div>
        </div>
      </div>
    );
  }

  if (structureData.length === 0) {
    return (
      <div className={`card bg-base-100 shadow ${className}`}>
        <div className="card-body">
          <h2 className="card-title text-lg">薪资结构分析</h2>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-2">💰</div>
              <p className="text-base-content/60">暂无该期间的薪资结构数据</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card bg-base-100 shadow ${className}`}>
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title text-lg">薪资结构分析</h2>
          <div className="badge badge-outline">
            {new Date(currentPeriod + '-01').toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long' 
            })}
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            {/* 内环：基本结构 */}
            <Pie
              data={structureData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {structureData.map((entry, index) => (
                <Cell key={`inner-cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            
            {/* 外环：详细组件（如果有数据） */}
            {componentStructureData.length > 0 && (
              <Pie
                data={componentStructureData}
                cx="50%"
                cy="50%"
                innerRadius={90}
                outerRadius={120}
                paddingAngle={1}
                dataKey="value"
              >
                {componentStructureData.map((entry, index) => (
                  <Cell 
                    key={`outer-cell-${index}`} 
                    fill={entry.color}
                    fillOpacity={0.7}
                  />
                ))}
              </Pie>
            )}
            
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* 数据摘要 */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-base-300">
          {structureData.map((item, index) => {
            const total = structureData.reduce((sum, d) => sum + d.value, 0);
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            
            return (
              <div key={item.name} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-lg font-bold" style={{ color: item.color }}>
                  {formatCurrency(item.value)}
                </div>
                <div className="text-xs text-base-content/60">
                  {formatPercentage(percentage)}
                </div>
              </div>
            );
          })}
        </div>

        {/* 关键指标 */}
        {statsData && (
          <div className="mt-4 pt-4 border-t border-base-300">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-base-content/60">扣除率：</span>
                <span className="font-semibold">
                  {formatPercentage(
                    statsData.totalGrossPay > 0 
                      ? (statsData.totalDeductions / statsData.totalGrossPay) * 100 
                      : 0
                  )}
                </span>
              </div>
              <div>
                <span className="text-base-content/60">实发率：</span>
                <span className="font-semibold">
                  {formatPercentage(
                    statsData.totalGrossPay > 0 
                      ? (statsData.totalNetPay / statsData.totalGrossPay) * 100 
                      : 0
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}