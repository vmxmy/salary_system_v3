import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrentYearPayrollTrend } from '@/hooks/payroll/useMonthlyPayrollTrend';
import type { MonthlyPayrollTrendData } from '@/hooks/payroll/useMonthlyPayrollTrend';

/**
 * 获取DaisyUI主题颜色的Hook
 */
function useDaisyUIColors() {
  return useMemo(() => {
    // 获取CSS变量的计算值
    const getColor = (cssVar: string) => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      const hslValue = computedStyle.getPropertyValue(cssVar).trim();
      
      if (hslValue) {
        // 将HSL值转换为完整的hsl()格式
        return `hsl(${hslValue})`;
      }
      
      // 降级到默认颜色
      return cssVar === '--p' ? '#3b82f6' : cssVar === '--wa' ? '#f59e0b' : '#10b981';
    };
    
    return {
      primary: getColor('--p'),
      warning: getColor('--wa'), 
      success: getColor('--su'),
    };
  }, []);
}

/**
 * 自定义工具提示组件
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    value: number;
    dataKey: string;
    payload: MonthlyPayrollTrendData;
  }>;
  label?: string;
  colors?: {
    primary: string;
    warning: string;
    success: string;
  };
}

function CustomTooltip({ active, payload, label, colors }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    return (
      <div className="bg-base-100 border border-base-300 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-base-content mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: colors?.primary || '#3b82f6' }}
              ></div>
              <span className="text-sm">应发总额</span>
            </div>
            <span className="text-sm font-medium">¥{data.totalGrossPay.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: colors?.success || '#10b981' }}
              ></div>
              <span className="text-sm">实发总额</span>
            </div>
            <span className="text-sm font-medium">¥{data.totalNetPay.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: colors?.warning || '#f59e0b' }}
              ></div>
              <span className="text-sm">扣除总额</span>
            </div>
            <span className="text-sm font-medium">¥{data.totalDeductions.toLocaleString()}</span>
          </div>
          <div className="border-t border-base-300 pt-2 mt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-base-content/60">发放人数</span>
              <span className="text-sm font-medium">{data.employeeCount} 人</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

/**
 * 薪资趋势折线图组件
 * 显示今年以来每个月的薪资统计：应发、扣除、实发
 */
export function PayrollTrendChart() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { data: trendData, isLoading, error } = useCurrentYearPayrollTrend();
  const colors = useDaisyUIColors();
  
  // 加载状态
  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">薪资趋势分析</h2>
          <div className="flex items-center justify-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }
  
  // 错误状态
  if (error) {
    return (
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">薪资趋势分析</h2>
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>加载薪资趋势数据失败</span>
          </div>
        </div>
      </div>
    );
  }
  
  // 无数据状态
  if (!trendData || trendData.length === 0) {
    return (
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">薪资趋势分析</h2>
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-base-content/60">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>暂无薪资趋势数据</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // 图表数据转换
  const chartData = trendData.map(item => ({
    ...item,
    // 转换为千元单位以便显示，确保为有效数字
    应发: Math.round((item.totalGrossPay || 0) / 1000),
    扣除: Math.round((item.totalDeductions || 0) / 1000), 
    实发: Math.round((item.totalNetPay || 0) / 1000),
  }));
  
  // 调试信息（开发环境下）
  if (import.meta.env.DEV) {
    console.log('[PayrollTrendChart] 原始数据:', trendData);
    console.log('[PayrollTrendChart] 图表数据:', chartData);
  }
  
  // 计算统计信息
  const totalEmployees = trendData.reduce((sum, item) => sum + item.employeeCount, 0);
  const totalMonths = trendData.filter(item => item.employeeCount > 0).length;
  const latestMonth = trendData[trendData.length - 1];
  
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">薪资趋势分析</h2>
          <div className="text-sm text-base-content/60">
            今年已发放 {totalMonths} 个月 • 累计 {totalEmployees} 人次
          </div>
        </div>
        
        
        {/* 折线图 */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="monthDisplay" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
                label={{ value: '金额 (千元)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip colors={colors} />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="应发" 
                stroke={colors.primary} 
                strokeWidth={2}
                connectNulls={true}
                dot={{ fill: colors.primary, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: colors.primary, strokeWidth: 2 }}
                name="应发总额 (千元)"
              />
              <Line 
                type="monotone" 
                dataKey="扣除" 
                stroke={colors.warning} 
                strokeWidth={2}
                connectNulls={true}
                dot={{ fill: colors.warning, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: colors.warning, strokeWidth: 2 }}
                name="扣除总额 (千元)"
              />
              <Line 
                type="monotone" 
                dataKey="实发" 
                stroke={colors.success} 
                strokeWidth={2}
                connectNulls={true}
                dot={{ fill: colors.success, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: colors.success, strokeWidth: 2 }}
                name="实发总额 (千元)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}