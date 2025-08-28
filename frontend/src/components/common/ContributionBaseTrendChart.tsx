import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ContributionBaseTrendData } from '@/hooks/payroll/useContributionBaseTrend';

/**
 * ★ Insight ─────────────────────────────────────
 * 这个组件使用 Recharts 库创建柱状图，完全遵循 DaisyUI 的设计系统
 * 利用 CSS 变量来实现主题适配，确保在不同主题下都能正确显示
 * 响应式设计确保在不同屏幕尺寸下都有良好的用户体验
 * ─────────────────────────────────────────────────
 */

interface ContributionBaseTrendChartProps {
  data: ContributionBaseTrendData[];
  loading?: boolean;
  className?: string;
}

// 自定义Tooltip组件
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-base-100 border border-base-300 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-base-content mb-2">{data.monthDisplay}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-base-content/70">缴费基数:</span>
            <span className="font-mono font-semibold text-info">
              ¥{data.baseAmount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-base-content/70">员工缴费:</span>
            <span className="font-mono text-warning">
              ¥{data.employeeAmount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-base-content/70">单位缴费:</span>
            <span className="font-mono text-success">
              ¥{data.employerAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const ContributionBaseTrendChart: React.FC<ContributionBaseTrendChartProps> = ({
  data,
  loading = false,
  className = ''
}) => {
  if (loading) {
    return (
      <div className={`bg-base-100 rounded-lg border border-base-300 p-3 ${className}`}>
        <div className="flex items-center justify-center h-24">
          <div className="loading loading-spinner loading-sm text-info"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`bg-base-100 rounded-lg border border-base-300 p-3 ${className}`}>
        <div className="flex flex-col items-center justify-center h-24 text-base-content/60">
          <svg className="w-6 h-6 mb-1 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-xs">缴费基数趋势数据为空</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-base-100 rounded-lg border border-base-300 ${className}`}>
      {/* 迷你标题区域 - 极简设计 */}
      <div className="px-3 py-2 border-b border-base-300/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-info/10 text-info flex items-center justify-center">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-base-content">公积金缴费基数趋势</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-base-content/50">
            <div className="w-1.5 h-1.5 rounded-full bg-info"></div>
            <span>本年度</span>
          </div>
        </div>
      </div>

      {/* 迷你图表内容区域 - 大幅压缩高度 */}
      <div className="p-2">
        <div className="h-24 w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 4,
                right: 4,
                left: 4,
                bottom: 4,
              }}
            >
              <CartesianGrid 
                strokeDasharray="1 1" 
                stroke="#e5e7eb"
                horizontal={true}
                vertical={false}
              />
              <XAxis 
                dataKey="monthDisplay"
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fontSize: 9, 
                  fill: '#9ca3af' 
                }}
                interval="preserveStartEnd"
                tickFormatter={(value) => {
                  // 只显示月份数字，如 "1月", "6月", "12月"
                  const match = value.match(/(\d+)月/);
                  return match ? `${match[1]}` : value;
                }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fontSize: 9, 
                  fill: '#9ca3af' 
                }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                domain={['dataMin * 0.98', 'dataMax * 1.02']}
                width={28}
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{
                  fill: '#3b82f6',
                  opacity: 0.1
                }}
              />
              <Bar
                dataKey="baseAmount"
                fill="#3b82f6"
                radius={[2, 2, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};