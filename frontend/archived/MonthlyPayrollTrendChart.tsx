import { useMemo, useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePayrollAnalytics } from '@/hooks/payroll/usePayrollAnalytics';
import { useTranslation } from '@/hooks/useTranslation';
import { CHART_COLORS, onThemeChange } from './chartColors';

interface MonthlyPayrollTrendChartProps {
  className?: string;
  height?: number;
}

export default function MonthlyPayrollTrendChart({ 
  className = "", 
  height = 300 
}: MonthlyPayrollTrendChartProps) {
  const { t } = useTranslation(['dashboard']);
  const [themeColors, setThemeColors] = useState({
    primary: CHART_COLORS.primary(),
    secondary: CHART_COLORS.secondary(),
    accent: CHART_COLORS.accent(),
    success: CHART_COLORS.success(),
    warning: CHART_COLORS.warning(),
    error: CHART_COLORS.error(),
    border: CHART_COLORS.border(),
    text: CHART_COLORS.text(),
    background: CHART_COLORS.background(),
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
        border: CHART_COLORS.border(),
        text: CHART_COLORS.text(),
        background: CHART_COLORS.background(),
      });
    };

    const cleanup = onThemeChange(updateColors);
    return cleanup;
  }, []);
  
  // 获取最近12个月的趋势数据
  const currentDate = new Date();
  const startPeriod = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1)
    .toISOString().slice(0, 7);
  const endPeriod = currentDate.toISOString().slice(0, 7);
  
  const { queries: { usePayrollTrends }, utils: { formatCurrency } } = usePayrollAnalytics();
  
  const { 
    data: trendsData = [], 
    isLoading, 
    error 
  } = usePayrollTrends({
    startPeriod,
    endPeriod,
    groupBy: 'month'
  });

  // 转换数据格式供图表使用
  const chartData = useMemo(() => {
    return trendsData.map(trend => ({
      period: trend.period,
      month: `${trend.year}年${String(trend.month).padStart(2, '0')}月`,
      totalGrossPay: trend.totalGrossPay / 10000, // 转换为万元
      employeeCount: trend.employeeCount,
      growthRate: trend.growthRate,
      yearOverYear: trend.yearOverYear
    }));
  }, [trendsData]);

  // 自定义工具提示内容
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div 
          style={{
            backgroundColor: themeColors.background,
            border: `1px solid ${themeColors.border}`,
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            color: themeColors.text
          }}
        >
          <p style={{ fontWeight: 'bold', marginBottom: '8px', color: themeColors.text }}>{label}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ color: themeColors.primary, margin: 0 }}>
              薪资总额：{data.totalGrossPay.toFixed(1)}万元
            </p>
            <p style={{ color: themeColors.secondary, margin: 0 }}>
              员工人数：{data.employeeCount}人
            </p>
            <p style={{ color: themeColors.accent, margin: 0 }}>
              环比增长：{data.growthRate > 0 ? '+' : ''}{data.growthRate.toFixed(2)}%
            </p>
            {data.yearOverYear !== 0 && (
              <p style={{ color: themeColors.text, opacity: 0.7, margin: 0 }}>
                同比增长：{data.yearOverYear > 0 ? '+' : ''}{data.yearOverYear.toFixed(2)}%
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className={`card bg-base-100 shadow ${className}`}>
        <div className="card-body">
          <h2 className="card-title text-lg">月度薪资成本趋势</h2>
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
          <h2 className="card-title text-lg">月度薪资成本趋势</h2>
          <div className="alert alert-error">
            <span>数据加载失败，请稍后重试</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card bg-base-100 shadow ${className}`}>
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title text-lg">月度薪资成本趋势</h2>
          <div className="badge badge-outline">近12个月</div>
        </div>
        
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={themeColors.border} 
              opacity={0.3}
            />
            <XAxis 
              dataKey="month" 
              stroke={themeColors.text}
              fontSize={12}
              tick={{ fill: themeColors.text, opacity: 0.8 }}
            />
            <YAxis 
              yAxisId="amount"
              orientation="left"
              stroke={themeColors.text}
              fontSize={12}
              tick={{ fill: themeColors.text, opacity: 0.8 }}
              label={{ 
                value: '薪资总额(万元)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: themeColors.text } 
              }}
            />
            <YAxis 
              yAxisId="count"
              orientation="right"
              stroke={themeColors.text}
              fontSize={12}
              tick={{ fill: themeColors.text, opacity: 0.8 }}
              label={{ 
                value: '员工人数(人)', 
                angle: 90, 
                position: 'insideRight',
                style: { textAnchor: 'middle', fill: themeColors.text }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ color: themeColors.text }}
            />
            
            {/* 薪资总额线 */}
            <Line
              yAxisId="amount"
              type="monotone"
              dataKey="totalGrossPay"
              stroke={themeColors.primary}
              strokeWidth={3}
              dot={{ fill: themeColors.primary, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: themeColors.primary, strokeWidth: 2, fill: themeColors.background }}
              name="薪资总额(万元)"
            />
            
            {/* 员工人数线 */}
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="employeeCount"
              stroke={themeColors.secondary}
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={{ fill: themeColors.secondary, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: themeColors.secondary, strokeWidth: 2, fill: themeColors.background }}
              name="员工人数(人)"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* 关键指标摘要 */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: `1px solid ${themeColors.border}`
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div 
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: themeColors.primary
              }}
            >
              {chartData.length > 0 ? formatCurrency(chartData[chartData.length - 1]?.totalGrossPay * 10000) : '¥0'}
            </div>
            <div style={{ fontSize: '0.875rem', color: themeColors.text, opacity: 0.6 }}>最新月薪资总额</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div 
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: themeColors.secondary
              }}
            >
              {chartData.length > 0 ? chartData[chartData.length - 1]?.employeeCount || 0 : 0}人
            </div>
            <div style={{ fontSize: '0.875rem', color: themeColors.text, opacity: 0.6 }}>当前员工人数</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div 
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: chartData.length > 0 && chartData[chartData.length - 1]?.growthRate > 0 
                  ? themeColors.success 
                  : chartData.length > 0 && chartData[chartData.length - 1]?.growthRate < 0
                  ? themeColors.error
                  : themeColors.text
              }}
            >
              {chartData.length > 0 ? 
                `${chartData[chartData.length - 1]?.growthRate > 0 ? '+' : ''}${chartData[chartData.length - 1]?.growthRate.toFixed(1)}%` 
                : '0%'
              }
            </div>
            <div style={{ fontSize: '0.875rem', color: themeColors.text, opacity: 0.6 }}>环比增长率</div>
          </div>
        </div>
      </div>
    </div>
  );
}