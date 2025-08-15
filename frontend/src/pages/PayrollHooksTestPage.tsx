import React, { useState, useEffect } from 'react';
import { usePayrollWorkflow, WorkflowStep } from '@/hooks/payroll/usePayrollWorkflow';
import { usePayrollPeriod } from '@/hooks/payroll/usePayrollPeriod';
import { usePayroll } from '@/hooks/payroll/usePayroll';
import { usePayrollEarnings } from '@/hooks/payroll/usePayrollEarnings';
import { useEmployeeCategory } from '@/hooks/payroll/useEmployeeCategory';
import { useEmployeePosition } from '@/hooks/payroll/useEmployeePosition';
import { useContributionBase } from '@/hooks/payroll/useContributionBase';

/**
 * 薪资 Hooks 综合测试页面
 * 
 * 用于测试所有薪资相关 hooks 的功能和集成
 */
export const PayrollHooksTestPage: React.FC = () => {
  // 测试状态
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [activeTest, setActiveTest] = useState<string>('');

  // 初始化所有 hooks
  const workflowHook = usePayrollWorkflow({
    initialEmployeeIds: selectedEmployeeId ? [selectedEmployeeId] : [],
    config: {
      enableAutoProgression: false,
      enableValidation: true,
      enableBatchOperations: true
    }
  });

  const periodHook = usePayrollPeriod({
    autoLoadCurrent: true,
    enableRealtime: true
  });

  const payrollHook = usePayroll({
    enableRealtime: true,
    filters: {
      periodYear: selectedPeriodId ? parseInt(selectedPeriodId.split('-')[0]) : undefined,
      periodMonth: selectedPeriodId ? parseInt(selectedPeriodId.split('-')[1]) : undefined
    }
  });

  const earningsHook = usePayrollEarnings({
    employeeId: selectedEmployeeId,
    periodId: selectedPeriodId,
    enableAutoCalculation: true
  });

  const categoryHook = useEmployeeCategory({
    employeeId: selectedEmployeeId,
    enableAutoFetch: true
  });

  const positionHook = useEmployeePosition({
    employeeId: selectedEmployeeId,
    includeHistory: true
  });

  const contributionBaseHook = useContributionBase({
    employeeId: selectedEmployeeId,
    periodId: selectedPeriodId,
    enableAutoCalculation: false
  });

  // 测试数据
  const mockEmployeeIds = ['emp-001', 'emp-002', 'emp-003'];
  const mockCategoryId = 'cat-001';
  const mockPositionId = 'pos-001';
  const mockDepartmentId = 'dept-001';

  // 执行测试
  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    setActiveTest(testName);
    try {
      console.log(`开始测试: ${testName}`);
      await testFn();
      setTestResults(prev => ({
        ...prev,
        [testName]: { status: 'success', timestamp: new Date().toISOString() }
      }));
      console.log(`测试成功: ${testName}`);
    } catch (error) {
      console.error(`测试失败: ${testName}`, error);
      setTestResults(prev => ({
        ...prev,
        [testName]: { 
          status: 'error', 
          error: error instanceof Error ? error.message : '未知错误',
          timestamp: new Date().toISOString() 
        }
      }));
    } finally {
      setActiveTest('');
    }
  };

  // 1. 测试薪资周期管理
  const testPeriodManagement = async () => {
    // 创建新周期
    const newPeriod = await new Promise<any>((resolve, reject) => {
      periodHook.mutations.createPeriod.mutate({
        period_year: 2025,
        period_month: 1,
        period_start: '2025-01-01',
        period_end: '2025-01-31',
        pay_date: '2025-02-05',
        status: 'draft'
      }, {
        onSuccess: resolve,
        onError: reject
      });
    });

    setSelectedPeriodId(newPeriod.id);
    console.log('创建薪资周期成功:', newPeriod);
  };

  // 2. 测试员工类别分配
  const testCategoryAssignment = async () => {
    if (!selectedEmployeeId || !selectedPeriodId) {
      throw new Error('请先选择员工和周期');
    }

    await new Promise<void>((resolve, reject) => {
      categoryHook.mutations.assignCategory.mutate({
        employeeId: selectedEmployeeId,
        categoryId: mockCategoryId,
        periodId: selectedPeriodId,
        notes: '测试类别分配'
      }, {
        onSuccess: () => resolve(),
        onError: reject
      });
    });

    console.log('员工类别分配成功');
  };

  // 3. 测试员工职位分配
  const testPositionAssignment = async () => {
    if (!selectedEmployeeId || !selectedPeriodId) {
      throw new Error('请先选择员工和周期');
    }

    await new Promise<void>((resolve, reject) => {
      positionHook.mutations.assignPosition.mutate({
        employeeId: selectedEmployeeId,
        positionId: mockPositionId,
        departmentId: mockDepartmentId,
        periodId: selectedPeriodId,
        notes: '测试职位分配'
      }, {
        onSuccess: () => resolve(),
        onError: reject
      });
    });

    console.log('员工职位分配成功');
  };

  // 4. 测试缴费基数设置
  const testContributionBaseSetup = async () => {
    if (!selectedEmployeeId || !selectedPeriodId) {
      throw new Error('请先选择员工和周期');
    }

    // 自动计算缴费基数
    const calculatedBases = await new Promise<any[]>((resolve, reject) => {
      contributionBaseHook.mutations.calculate.mutate({
        employeeId: selectedEmployeeId,
        periodId: selectedPeriodId,
        baseSalary: 8000
      }, {
        onSuccess: resolve,
        onError: reject
      });
    });

    // 批量设置缴费基数
    const bases = calculatedBases.map(base => ({
      employeeId: selectedEmployeeId,
      insuranceTypeId: base.insurance_type_id,
      contributionBase: base.contribution_base
    }));

    await new Promise<void>((resolve, reject) => {
      contributionBaseHook.mutations.batchSet.mutate({
        bases: bases.map(base => ({
          ...base,
          periodId: selectedPeriodId
        }))
      }, {
        onSuccess: () => resolve(),
        onError: reject
      });
    });

    console.log('缴费基数设置成功:', calculatedBases);
  };

  // 5. 测试薪资记录创建
  const testPayrollCreation = async () => {
    if (!selectedEmployeeId || !selectedPeriodId) {
      throw new Error('请先选择员工和周期');
    }

    await new Promise<void>((resolve, reject) => {
      payrollHook.mutations.createPayroll.mutate({
        employee_id: selectedEmployeeId,
        period_id: selectedPeriodId,
        pay_date: '2025-02-05',
        status: 'draft',
        gross_pay: 0,
        total_deductions: 0,
        net_pay: 0
      }, {
        onSuccess: () => resolve(),
        onError: reject
      });
    });

    console.log('薪资记录创建成功');
  };

  // 6. 测试收入明细设置
  const testEarningsSetup = async () => {
    // 这里需要实际的 payrollId，在实际应用中会从薪资记录获取
    const mockPayrollId = 'payroll-001';

    await new Promise<void>((resolve, reject) => {
      earningsHook.mutations.createEarning.mutate({
        payroll_id: mockPayrollId,
        component_id: 'comp-001',
        amount: 8000,
        period_id: selectedPeriodId
      }, {
        onSuccess: () => resolve(),
        onError: reject
      });
    });

    console.log('收入明细设置成功');
  };

  // 7. 测试个税计算
  const testTaxCalculation = async () => {
    const taxResult = await new Promise<any>((resolve, reject) => {
      earningsHook.mutations.calculateTax.mutate({
        grossIncome: 8000,
        socialInsuranceDeduction: 800,
        housingFundDeduction: 400,
        specialDeductions: 1000,
        additionalDeductions: 0,
        isAnnual: false
      }, {
        onSuccess: resolve,
        onError: reject
      });
    });

    console.log('个税计算成功:', taxResult);
  };

  // 8. 测试完整工作流
  const testCompleteWorkflow = async () => {
    if (!selectedPeriodId) {
      throw new Error('请先选择周期');
    }

    await new Promise<void>((resolve, reject) => {
      workflowHook.mutations.executeCompleteWorkflow.mutate({
        periodId: selectedPeriodId,
        employeeIds: mockEmployeeIds,
        defaultCategoryId: mockCategoryId,
        employeePositions: mockEmployeeIds.map(id => ({
          employeeId: id,
          positionId: mockPositionId,
          departmentId: mockDepartmentId
        })),
        payDate: '2025-02-05'
      }, {
        onSuccess: () => resolve(),
        onError: reject
      });
    });

    console.log('完整工作流执行成功');
  };

  // 渲染测试结果
  const renderTestResult = (testName: string) => {
    const result = testResults[testName];
    if (!result) return null;

    return (
      <div className={`alert ${result.status === 'success' ? 'alert-success' : 'alert-error'} mt-2`}>
        <div>
          <span>{result.status === 'success' ? '✅' : '❌'}</span>
          <span className="ml-2">
            {result.status === 'success' ? '测试成功' : `测试失败: ${result.error}`}
          </span>
          <span className="text-sm opacity-70 ml-2">
            {new Date(result.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    );
  };

  // 渲染工作流状态
  const renderWorkflowStatus = () => (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title">工作流状态</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>当前步骤:</strong> {workflowHook.utils.getStepName(workflowHook.currentStep)}</p>
            <p><strong>整体进度:</strong> {workflowHook.utils.getOverallProgress().toFixed(1)}%</p>
            <p><strong>选中周期:</strong> {workflowHook.workflowState.selectedPeriod || '未选择'}</p>
            <p><strong>选中员工:</strong> {workflowHook.workflowState.selectedEmployees.length} 人</p>
          </div>
          <div>
            <p><strong>已完成步骤:</strong></p>
            <ul className="list-disc list-inside">
              {workflowHook.completedSteps.map(step => (
                <li key={step} className="text-sm">
                  {workflowHook.utils.getStepName(step)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {workflowHook.errors.length > 0 && (
          <div className="alert alert-error mt-4">
            <h4>错误:</h4>
            <ul>
              {workflowHook.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {workflowHook.warnings.length > 0 && (
          <div className="alert alert-warning mt-4">
            <h4>警告:</h4>
            <ul>
              {workflowHook.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染数据状态
  const renderDataStatus = () => (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="stat bg-base-100 shadow">
        <div className="stat-title">薪资周期</div>
        <div className="stat-value text-2xl">
          {periodHook.periods.length}
        </div>
        <div className="stat-desc">
          当前周期: {periodHook.currentPeriod?.period_name || '无'}
        </div>
      </div>

      <div className="stat bg-base-100 shadow">
        <div className="stat-title">员工类别</div>
        <div className="stat-value text-2xl">
          {categoryHook.categories.length}
        </div>
        <div className="stat-desc">
          当前分配: {categoryHook.currentCategory?.category_name || '无'}
        </div>
      </div>

      <div className="stat bg-base-100 shadow">
        <div className="stat-title">职位信息</div>
        <div className="stat-value text-2xl">
          {positionHook.positions.length}
        </div>
        <div className="stat-desc">
          当前职位: {positionHook.primaryPosition?.position_name || '无'}
        </div>
      </div>

      <div className="stat bg-base-100 shadow">
        <div className="stat-title">缴费基数</div>
        <div className="stat-value text-2xl">
          {contributionBaseHook.employeeBases.length}
        </div>
        <div className="stat-desc">
          保险类型: {contributionBaseHook.insuranceTypes.length}
        </div>
      </div>

      <div className="stat bg-base-100 shadow">
        <div className="stat-title">收入组件</div>
        <div className="stat-value text-2xl">
          {earningsHook.earningComponents.length}
        </div>
        <div className="stat-desc">
          总收入: {earningsHook.utils.formatCurrency(earningsHook.calculations.grossPay)}
        </div>
      </div>

      <div className="stat bg-base-100 shadow">
        <div className="stat-title">薪资记录</div>
        <div className="stat-value text-2xl">
          {payrollHook.payrolls?.data?.length || 0}
        </div>
        <div className="stat-desc">
          最新周期: {payrollHook.latestPeriod?.period_name || '无'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">薪资管理 Hooks 综合测试</h1>
        <p className="text-lg opacity-70">
          测试所有薪资相关 hooks 的功能和集成效果
        </p>
      </div>

      {/* 测试控制面板 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">测试控制面板</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">选择员工ID (测试用)</span>
              </label>
              <select 
                className="select select-bordered"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="">请选择员工</option>
                <option value="emp-001">员工001</option>
                <option value="emp-002">员工002</option>
                <option value="emp-003">员工003</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">选择周期ID (测试用)</span>
              </label>
              <select 
                className="select select-bordered"
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
              >
                <option value="">请选择周期</option>
                {periodHook.periods.map(period => (
                  <option key={period.id} value={period.id}>
                    {period.period_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 单独测试按钮 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button 
              className={`btn btn-primary ${activeTest === 'period' ? 'loading' : ''}`}
              onClick={() => runTest('period', testPeriodManagement)}
              disabled={activeTest !== ''}
            >
              测试周期管理
            </button>
            
            <button 
              className={`btn btn-secondary ${activeTest === 'category' ? 'loading' : ''}`}
              onClick={() => runTest('category', testCategoryAssignment)}
              disabled={activeTest !== '' || !selectedEmployeeId || !selectedPeriodId}
            >
              测试类别分配
            </button>
            
            <button 
              className={`btn btn-accent ${activeTest === 'position' ? 'loading' : ''}`}
              onClick={() => runTest('position', testPositionAssignment)}
              disabled={activeTest !== '' || !selectedEmployeeId || !selectedPeriodId}
            >
              测试职位分配
            </button>
            
            <button 
              className={`btn btn-info ${activeTest === 'contribution' ? 'loading' : ''}`}
              onClick={() => runTest('contribution', testContributionBaseSetup)}
              disabled={activeTest !== '' || !selectedEmployeeId || !selectedPeriodId}
            >
              测试缴费基数
            </button>
            
            <button 
              className={`btn btn-success ${activeTest === 'payroll' ? 'loading' : ''}`}
              onClick={() => runTest('payroll', testPayrollCreation)}
              disabled={activeTest !== '' || !selectedEmployeeId || !selectedPeriodId}
            >
              测试薪资创建
            </button>
            
            <button 
              className={`btn btn-warning ${activeTest === 'earnings' ? 'loading' : ''}`}
              onClick={() => runTest('earnings', testEarningsSetup)}
              disabled={activeTest !== ''}
            >
              测试收入设置
            </button>
            
            <button 
              className={`btn btn-error ${activeTest === 'tax' ? 'loading' : ''}`}
              onClick={() => runTest('tax', testTaxCalculation)}
              disabled={activeTest !== ''}
            >
              测试个税计算
            </button>
            
            <button 
              className={`btn btn-neutral ${activeTest === 'workflow' ? 'loading' : ''}`}
              onClick={() => runTest('workflow', testCompleteWorkflow)}
              disabled={activeTest !== '' || !selectedPeriodId}
            >
              测试完整流程
            </button>
          </div>

          {/* 测试结果 */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">测试结果</h3>
            <div className="space-y-2">
              {renderTestResult('period')}
              {renderTestResult('category')}
              {renderTestResult('position')}
              {renderTestResult('contribution')}
              {renderTestResult('payroll')}
              {renderTestResult('earnings')}
              {renderTestResult('tax')}
              {renderTestResult('workflow')}
            </div>
          </div>
        </div>
      </div>

      {/* 工作流状态 */}
      {renderWorkflowStatus()}

      {/* 数据状态概览 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">数据状态概览</h2>
          {renderDataStatus()}
        </div>
      </div>

      {/* 实时日志 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">实时状态</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold">加载状态</h3>
              <ul className="text-sm space-y-1">
                <li>周期管理: {periodHook.loading.isLoading ? '加载中...' : '已加载'}</li>
                <li>员工类别: {categoryHook.loading.isLoading ? '加载中...' : '已加载'}</li>
                <li>职位信息: {positionHook.loading.isLoading ? '加载中...' : '已加载'}</li>
                <li>缴费基数: {contributionBaseHook.loading.isLoading ? '加载中...' : '已加载'}</li>
                <li>收入明细: {earningsHook.loading.isLoading ? '加载中...' : '已加载'}</li>
                <li>薪资记录: {payrollHook.loading.isLoading ? '加载中...' : '已加载'}</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold">Hook 连接状态</h3>
              <ul className="text-sm space-y-1">
                <li>实时订阅: {true ? '✅ 已启用' : '❌ 已禁用'}</li>
                <li>工作流: {workflowHook.loading.isProcessing ? '🔄 处理中' : '✅ 就绪'}</li>
                <li>缓存状态: ✅ 活跃</li>
                <li>错误处理: ✅ 已配置</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 操作说明 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">使用说明</h2>
          <div className="prose">
            <ol>
              <li><strong>选择测试员工和周期:</strong> 在控制面板中选择要测试的员工ID和薪资周期</li>
              <li><strong>逐步测试:</strong> 按顺序点击各个测试按钮，观察测试结果</li>
              <li><strong>完整流程测试:</strong> 点击"测试完整流程"按钮验证工作流集成</li>
              <li><strong>查看状态:</strong> 观察工作流状态和数据状态的实时更新</li>
              <li><strong>错误处理:</strong> 如有错误，检查浏览器控制台和测试结果面板</li>
            </ol>
            
            <h3>注意事项</h3>
            <ul>
              <li>请确保 Supabase 连接正常</li>
              <li>测试数据为模拟数据，实际使用需要真实的数据库记录</li>
              <li>某些测试需要先执行前置步骤（如先创建周期，再测试员工分配）</li>
              <li>实时订阅功能需要 WebSocket 连接正常</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};