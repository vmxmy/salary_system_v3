import { useMemo, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePayrollAnalytics } from '@/hooks/payroll/usePayrollAnalytics';
import { useTranslation } from '@/hooks/useTranslation';
import { CHART_COLORS, onThemeChange } from './chartColors';

interface DepartmentPayrollChartProps {
  className?: string;
  height?: number;
  period?: string;
}

export default function DepartmentPayrollChart({ 
  className = "", 
  height = 350,
  period 
}: DepartmentPayrollChartProps) {
  const { t } = useTranslation(['dashboard']);
  const [themeColors, setThemeColors] = useState({
    primary: CHART_COLORS.primary(),
    secondary: CHART_COLORS.secondary(),
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
        border: CHART_COLORS.border(),
        text: CHART_COLORS.text(),
        background: CHART_COLORS.background(),
      });
    };

    const cleanup = onThemeChange(updateColors);
    return cleanup;
  }, []);
  
  // 如果没有指定期间，使用当前月份
  const currentPeriod = period || new Date().toISOString().slice(0, 7);
  
  const { 
    queries: { useDepartmentStatistics }, 
    utils: { formatCurrency, formatPercentage } 
  } = usePayrollAnalytics();
  
  const { 
    data: departmentData = [], 
    isLoading, 
    error 
  } = useDepartmentStatistics(currentPeriod);

  // 转换数据格式供图表使用，只取前8个部门避免图表过于拥挤
  const chartData = useMemo(() => {
    return departmentData
      .slice(0, 8)
      .map(dept => ({
        name: dept.departmentName.length > 8 
          ? dept.departmentName.slice(0, 8) + '...' 
          : dept.departmentName,
        fullName: dept.departmentName,
        totalGrossPay: dept.totalGrossPay / 10000, // 转换为万元
        averageGrossPay: dept.averageGrossPay / 1000, // 转换为千元
        employeeCount: dept.employeeCount,
        percentOfTotal: dept.percentOfTotal
      }))
      .sort((a, b) => b.totalGrossPay - a.totalGrossPay);
  }, [departmentData]);

  // 格式化工具提示
  const formatTooltip = (value: any, name: string, props: any) => {
    const data = props.payload;
    if (name === '总薪资(万元)') {
      return [
        `${value.toFixed(1)}万元`,
        `${data.fullName} - 总薪资`
      ];
    }
    if (name === '平均薪资(千元)') {
      return [
        `${value.toFixed(1)}千元`,
        `${data.fullName} - 平均薪资`
      ];
    }
    return [value, name];
  };

  // 自定义工具提示内容
  const CustomTooltip = ({ active, payload, label }: any) => {
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
          <p className="font-semibold" style={{ color: themeColors.text }}>{data.fullName}</p>
          <div className="space-y-1 mt-2">
            <p style={{ color: themeColors.primary }}>
              总薪资：{formatCurrency(data.totalGrossPay * 10000)}
            </p>
            <p style={{ color: themeColors.secondary }}>
              平均薪资：{formatCurrency(data.averageGrossPay * 1000)}
            </p>
            <p style={{ color: themeColors.text, opacity: 0.7 }}>
              员工人数：{data.employeeCount}人
            </p>
            <p style={{ color: themeColors.text, opacity: 0.7 }}>
              占总额：{formatPercentage(data.percentOfTotal)}
            </p>
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
          <h2 className="card-title text-lg">部门薪资分布对比</h2>
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
          <h2 className="card-title text-lg">部门薪资分布对比</h2>
          <div className="alert alert-error">
            <span>数据加载失败，请稍后重试</span>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className={`card bg-base-100 shadow ${className}`}>
        <div className="card-body">
          <h2 className="card-title text-lg">部门薪资分布对比</h2>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-base-content/60">暂无该期间的部门薪资数据</p>
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
          <h2 className="card-title text-lg">部门薪资分布对比</h2>
          <div className="badge badge-outline">
            {new Date(currentPeriod + '-01').toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long' 
            })}
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            layout="horizontal"
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={themeColors.border} 
              opacity={0.3}
            />
            <XAxis 
              type="number"
              stroke={themeColors.text}
              fontSize={12}
              tick={{ fill: themeColors.text, opacity: 0.8 }}
            />
            <YAxis 
              type="category"
              dataKey="name"
              stroke={themeColors.text}
              fontSize={11}
              tick={{ fill: themeColors.text, opacity: 0.8 }}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* 总薪资条形图 */}
            <Bar
              dataKey="totalGrossPay"
              fill={themeColors.primary}
              name="总薪资(万元)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* 统计摘要 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-base-300">
          <div className="text-center">
            <div className="text-xl font-bold text-primary">
              {departmentData.length}
            </div>
            <div className="text-xs text-base-content/60">参与部门</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-secondary">
              {formatCurrency(
                departmentData.reduce((sum, dept) => sum + dept.totalGrossPay, 0)
              )}
            </div>
            <div className="text-xs text-base-content/60">总薪资</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-accent">
              {chartData.length > 0 ? chartData[0].fullName : '-'}
            </div>
            <div className="text-xs text-base-content/60">最高部门</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-base-content">
              {formatCurrency(
                departmentData.reduce((sum, dept) => sum + dept.averageGrossPay, 0) / 
                Math.max(departmentData.length, 1)
              )}
            </div>
            <div className="text-xs text-base-content/60">平均薪资</div>
          </div>
        </div>

        {/* 显示更多部门提示 */}
        {departmentData.length > 8 && (
          <div className="text-center mt-2">
            <div className="text-sm text-base-content/60">
              显示前8个部门，共{departmentData.length}个部门
            </div>
          </div>
        )}
      </div>
    </div>
  );
}