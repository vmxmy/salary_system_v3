/**
 * MonthSelector 组件演示
 * 用于测试和验证组件功能
 */

import React, { useState } from 'react';
import { MonthSelector } from './MonthSelector';
import { type AvailablePayrollMonth } from '@/hooks/payroll';

// 模拟数据
const mockAvailableMonths: AvailablePayrollMonth[] = [
  {
    month: '2024-12',
    payrollCount: 45,
    hasData: true,
    hasPeriod: true,
    expectedEmployeeCount: 50
  },
  {
    month: '2025-01', 
    payrollCount: 48,
    hasData: true,
    hasPeriod: true,
    expectedEmployeeCount: 50
  },
  {
    month: '2025-02',
    payrollCount: 0,
    hasData: false,
    hasPeriod: true,
    expectedEmployeeCount: 50
  }
];

/**
 * MonthSelector 演示组件
 */
export const MonthSelectorDemo: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2025-01');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleMonthChange = (month: string) => {
    console.log('月份变更:', month);
    setSelectedMonth(month);
    
    // 模拟验证逻辑
    if (month === '2025-03') {
      setError('2025年3月数据不可用');
    } else {
      setError(null);
    }
  };

  const toggleLoading = () => {
    setLoading(!loading);
  };

  const toggleError = () => {
    if (error) {
      setError(null);
    } else {
      setError('模拟错误状态：无法加载薪资周期数据');
    }
  };

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-base-content mb-2">
            MonthSelector 组件演示
          </h1>
          <p className="text-base-content/70">
            测试薪资导入月份选择器的各种功能和状态
          </p>
        </div>

        {/* 控制面板 */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">测试控制面板</h2>
            <div className="flex flex-wrap gap-4">
              <button 
                className="btn btn-primary"
                onClick={toggleLoading}
              >
                {loading ? '停止加载' : '开始加载'}
              </button>
              <button 
                className="btn btn-error"
                onClick={toggleError}
              >
                {error ? '清除错误' : '模拟错误'}
              </button>
            </div>
          </div>
        </div>

        {/* MonthSelector 组件 */}
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          availableMonths={mockAvailableMonths}
          loading={loading}
          error={error}
          showDataIndicators={true}
          showCompletenessIndicators={true}
        />

        {/* 状态显示 */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">当前状态</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>选中月份:</span>
                <code className="bg-base-300 px-2 py-1 rounded">
                  {selectedMonth}
                </code>
              </div>
              <div className="flex justify-between">
                <span>加载状态:</span>
                <span className={`badge ${loading ? 'badge-warning' : 'badge-success'}`}>
                  {loading ? '加载中' : '就绪'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>错误状态:</span>
                <span className={`badge ${error ? 'badge-error' : 'badge-success'}`}>
                  {error ? '有错误' : '正常'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 可用月份数据 */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">可用月份数据</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>月份</th>
                    <th>薪资记录数</th>
                    <th>期望员工数</th>
                    <th>有周期</th>
                    <th>有数据</th>
                  </tr>
                </thead>
                <tbody>
                  {mockAvailableMonths.map((month) => (
                    <tr key={month.month}>
                      <td>
                        <code>{month.month}</code>
                      </td>
                      <td>{month.payrollCount}</td>
                      <td>{month.expectedEmployeeCount}</td>
                      <td>
                        <span className={`badge ${
                          month.hasPeriod ? 'badge-success' : 'badge-warning'
                        }`}>
                          {month.hasPeriod ? '是' : '否'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          month.hasData ? 'badge-success' : 'badge-ghost'
                        }`}>
                          {month.hasData ? '是' : '否'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthSelectorDemo;