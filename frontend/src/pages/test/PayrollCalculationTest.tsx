import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePayrollCalculation, type PayrollCalculationResult } from '@/hooks/payroll/usePayrollCalculation';
import { usePayrollSummary, type PayrollSummaryResult } from '@/hooks/payroll/usePayrollSummary';
import { usePayrollPeriods } from '@/hooks/payroll/usePayrollPeriod';
import { useQuery } from '@tanstack/react-query';

const PayrollCalculationTest: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [saveToDatabase, setSaveToDatabase] = useState<boolean>(false);

  // 使用薪资期间 hook
  const { data: periodsData, isLoading: periodsLoading } = usePayrollPeriods({
    pageSize: 50 // 增加页面大小以包含所有期间包括completed状态
  });
  const periods = periodsData?.data || [];

  // 获取期间的员工和薪资记录
  const { data: employeesWithPayroll = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['period-employees-payroll', selectedPeriod],
    queryFn: async () => {
      if (!selectedPeriod) return [];
      
      const { data: payrollData, error: payrollError } = await supabase
        .from('payrolls')
        .select(`
          id,
          employee_id,
          gross_pay,
          total_deductions,
          net_pay,
          status,
          employees (
            employee_name
          )
        `)
        .eq('period_id', selectedPeriod)
        .order('employees(employee_name)');
      
      if (payrollError) throw payrollError;
      
      return payrollData || [];
    },
    enabled: !!selectedPeriod
  });

  // 使用新的计算hooks
  const payrollCalculation = usePayrollCalculation();
  const payrollSummary = usePayrollSummary();

  // 当选择期间后，重置员工选择
  useEffect(() => {
    if (!selectedPeriod) {
      setSelectedEmployee('');
    } else if (employeesWithPayroll.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employeesWithPayroll[0].id);
    }
  }, [selectedPeriod, employeesWithPayroll]);

  // 测试单个薪资计算（仅计算）
  const testSingleCalculation = async () => {
    if (!selectedEmployee) {
      alert('请选择薪资记录');
      return;
    }

    try {
      setTestResults([]);
      
      console.log('🧮 [薪资计算测试] 开始单个计算:', selectedEmployee);
      
      const result = await payrollCalculation.calculateSingle(selectedEmployee);
      
      console.log('🧮 [薪资计算测试] 计算结果:', result);
      
      setTestResults([{
        type: '薪资计算结果（仅计算）',
        success: result.success,
        payrollId: result.payrollId,
        employeeName: result.employeeName,
        grossPay: result.grossPay,
        totalDeductions: result.totalDeductions,
        netPay: result.netPay,
        breakdown: result.breakdown,
        itemCounts: result.itemCounts,
        message: result.message,
        errors: result.errors
      }]);
      
    } catch (error) {
      setTestResults([{
        type: '薪资计算错误',
        success: false,
        message: error instanceof Error ? error.message : '计算失败'
      }]);
    }
  };

  // 测试单个薪资计算（计算并保存）
  const testSingleCalculationAndSave = async () => {
    if (!selectedEmployee) {
      alert('请选择薪资记录');
      return;
    }

    try {
      setTestResults([]);
      
      console.log('💾 [薪资计算测试] 开始计算并保存:', selectedEmployee);
      
      const result = await payrollCalculation.calculateAndSave(selectedEmployee);
      
      console.log('💾 [薪资计算测试] 计算并保存结果:', result);
      
      setTestResults([{
        type: '薪资计算结果（已保存）',
        success: result.success,
        payrollId: result.payrollId,
        employeeName: result.employeeName,
        grossPay: result.grossPay,
        totalDeductions: result.totalDeductions,
        netPay: result.netPay,
        breakdown: result.breakdown,
        itemCounts: result.itemCounts,
        message: result.message,
        errors: result.errors
      }]);
      
    } catch (error) {
      setTestResults([{
        type: '薪资计算错误',
        success: false,
        message: error instanceof Error ? error.message : '计算失败'
      }]);
    }
  };

  // 测试批量计算
  const testBatchCalculation = async () => {
    if (!selectedPeriod) {
      alert('请选择期间');
      return;
    }

    try {
      setTestResults([]);
      
      const payrollIds = employeesWithPayroll.map(p => p.id);
      
      if (payrollIds.length === 0) {
        alert('该期间没有薪资记录');
        return;
      }

      const confirmMessage = saveToDatabase 
        ? `确定要对当前期间的 ${payrollIds.length} 名员工进行批量薪资计算并保存吗？` 
        : `确定要对当前期间的 ${payrollIds.length} 名员工进行批量薪资计算吗？（仅计算，不保存）`;
      
      if (!confirm(confirmMessage)) {
        return;
      }

      console.log('📊 [批量薪资计算测试] 开始批量计算:', { payrollIds, saveToDatabase });
      
      const result = await payrollCalculation.calculateBatch(payrollIds, saveToDatabase);
      
      console.log('📊 [批量薪资计算测试] 批量计算结果:', result);
      
      // 显示批量计算结果
      setTestResults(result.results.map((res, index) => ({
        type: `员工 ${index + 1}`,
        success: res.success,
        payrollId: res.payrollId,
        employeeName: res.employeeName,
        grossPay: res.grossPay,
        totalDeductions: res.totalDeductions,
        netPay: res.netPay,
        breakdown: res.breakdown,
        itemCounts: res.itemCounts,
        message: res.message,
        errors: res.errors || []
      })));
      
      // 添加汇总信息
      setTestResults(prev => [...prev, {
        type: '批量计算汇总',
        success: result.summary.successCount > 0,
        message: `成功: ${result.summary.successCount}, 失败: ${result.summary.failureCount}, 总应发: ${result.summary.totalGrossPay.toFixed(2)}, 总扣除: ${result.summary.totalDeductions.toFixed(2)}, 总实发: ${result.summary.totalNetPay.toFixed(2)}`
      }]);
      
    } catch (error) {
      setTestResults([{
        type: '批量计算错误',
        success: false,
        message: error instanceof Error ? error.message : '批量计算失败'
      }]);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">薪资计算测试（前端Hook版）</h1>

      {/* 数据加载状态 */}
      {periodsLoading ? (
        <div className="flex items-center justify-center p-8">
          <span className="loading loading-spinner loading-lg"></span>
          <span className="ml-4">正在加载薪资期间...</span>
        </div>
      ) : (
        <>
          {/* 选择控件 */}
          <div className="bg-base-200 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-2 gap-4">
              {/* 期间选择 */}
              <div>
                <label className="label">
                  <span className="label-text">1. 选择薪资期间</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  <option value="">请选择期间</option>
                  {periods?.map(period => (
                    <option key={period.id} value={period.id}>
                      {period.period_name || period.period_code}
                    </option>
                  ))}
                </select>
              </div>

              {/* 薪资记录选择 */}
              <div>
                <label className="label">
                  <span className="label-text">2. 选择薪资记录</span>
                  {employeesLoading && <span className="loading loading-spinner loading-xs ml-2"></span>}
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  disabled={!selectedPeriod || employeesLoading}
                >
                  {!selectedPeriod ? (
                    <option value="">请先选择期间</option>
                  ) : employeesWithPayroll.length === 0 ? (
                    <option value="">该期间无薪资记录</option>
                  ) : (
                    <>
                      <option value="">请选择薪资记录</option>
                      {employeesWithPayroll.map(payroll => (
                        <option key={payroll.id} value={payroll.id}>
                          {payroll.employees?.employee_name} - 状态: {payroll.status}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {selectedPeriod && employeesWithPayroll.length > 0 && (
                  <label className="label">
                    <span className="label-text-alt">共 {employeesWithPayroll.length} 条薪资记录</span>
                  </label>
                )}
              </div>
            </div>

            {/* 批量计算选项 */}
            <div className="mt-4 p-3 bg-base-300 rounded-lg">
              <h3 className="text-sm font-medium mb-2">批量计算选项</h3>
              <label className="cursor-pointer label justify-start gap-2">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary checkbox-sm" 
                  checked={saveToDatabase}
                  onChange={(e) => setSaveToDatabase(e.target.checked)}
                />
                <span className="label-text text-sm">
                  计算后保存到数据库 
                  <span className="text-warning text-xs ml-1">
                    (勾选后会更新薪资记录的状态和金额)
                  </span>
                </span>
              </label>
            </div>

            {/* 测试按钮 */}
            <div className="flex flex-wrap gap-4 mt-6">
              <button 
                className="btn btn-primary"
                onClick={testSingleCalculation}
                disabled={payrollCalculation.loading || !selectedEmployee}
              >
                {payrollCalculation.loading ? '计算中...' : '测试单个计算（仅计算）'}
              </button>

              <button 
                className="btn btn-secondary"
                onClick={testSingleCalculationAndSave}
                disabled={payrollCalculation.loading || !selectedEmployee}
              >
                {payrollCalculation.loading ? '计算中...' : '测试单个计算（计算并保存）'}
              </button>

              <button 
                className="btn btn-accent"
                onClick={testBatchCalculation}
                disabled={payrollCalculation.loading || !selectedPeriod || employeesWithPayroll.length === 0}
                title={saveToDatabase ? `对当前期间的 ${employeesWithPayroll.length} 条薪资记录进行批量计算并保存` : `对当前期间的 ${employeesWithPayroll.length} 条薪资记录进行批量计算（仅计算）`}
              >
                {payrollCalculation.loading ? '计算中...' : (saveToDatabase ? `批量计算并保存 (${employeesWithPayroll.length}条)` : `批量计算 (${employeesWithPayroll.length}条)`)}
              </button>
            </div>
          </div>

          {/* 测试结果 */}
          {testResults.length > 0 && (
            <div className="bg-base-100 rounded-lg overflow-hidden">
              <div className="p-4 bg-base-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold">测试结果</h2>
                <button 
                  className="btn btn-sm btn-ghost"
                  onClick={() => setTestResults([])}
                  title="清除结果"
                >
                  清除结果
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>类型</th>
                      <th>员工</th>
                      <th>状态</th>
                      <th>应发工资</th>
                      <th>扣除总额</th>
                      <th>实发工资</th>
                      <th>收入项目</th>
                      <th>扣除项目</th>
                      <th>详细分解</th>
                      <th>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResults.map((result, index) => (
                      <tr key={index}>
                        <td>{result.type}</td>
                        <td>{result.employeeName || '-'}</td>
                        <td>
                          <span className={`badge ${result.success ? 'badge-success' : 'badge-error'}`}>
                            {result.success ? '成功' : '失败'}
                          </span>
                        </td>
                        <td>{result.grossPay !== undefined ? formatAmount(result.grossPay) : '-'}</td>
                        <td>{result.totalDeductions !== undefined ? formatAmount(result.totalDeductions) : '-'}</td>
                        <td>{result.netPay !== undefined ? formatAmount(result.netPay) : '-'}</td>
                        <td>{result.itemCounts?.earningsCount || result.breakdown?.earningsCount || '-'}</td>
                        <td>{result.itemCounts?.deductionCount || result.breakdown?.deductionCount || '-'}</td>
                        <td>
                          {result.breakdown && (
                            <details className="cursor-pointer">
                              <summary className="text-sm">查看分解</summary>
                              <div className="text-xs mt-2 p-2 bg-base-200 rounded">
                                {Object.entries(result.breakdown)
                                  .filter(([key, value]) => typeof value === 'number' && value > 0)
                                  .map(([key, value]) => (
                                    <div key={key}>
                                      {key}: {formatAmount(value as number)}
                                    </div>
                                  ))}
                              </div>
                            </details>
                          )}
                        </td>
                        <td>
                          <div className="text-sm">
                            {result.message && <div>{result.message}</div>}
                            {result.errors && result.errors.length > 0 && (
                              <div className="text-error text-xs mt-1">
                                {result.errors.join('; ')}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 调试信息 */}
          <div className="mt-6 text-sm text-base-content/60">
            <p>选中期间ID: {selectedPeriod}</p>
            <p>选中薪资记录ID: {selectedEmployee}</p>
            <p>薪资记录数量: {employeesWithPayroll.length}</p>
            <p>期间数量: {periods.length}</p>
          </div>
        </>
      )}
    </div>
  );
};

export default PayrollCalculationTest;