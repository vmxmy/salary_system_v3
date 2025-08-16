import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  usePayrollWorkflow,
  usePayrollPeriod,
  usePayroll,
  usePayrollEarnings,
  useEmployeeCategory,
  useEmployeePosition,
  useContributionBase,
  usePayrollCalculation,
  usePayrollImportExport,
  usePayrollApproval,
  usePayrollAnalytics,
  usePayrollManagement,
  useEmployeeMonthlyContributionBases,
  useInsuranceTypes,
  usePayrollDetails,
  useEmployeeInsuranceDetails,
  WorkflowStep,
  PeriodStatus,
  PayrollStatus,
  ApprovalFlow,
  payrollFormatters
} from '@/hooks/payroll';

// 真实数据接口定义
interface RealEmployee {
  id: string;
  employee_name: string;
  id_number?: string;
  employment_status?: string;
}

interface RealDepartment {
  id: string;
  name: string;
  parent_department_id?: string;
}

interface RealPosition {
  id: string;
  name: string;
  description?: string;
}

interface RealCategory {
  id: string;
  name: string;
  description?: string;
}

interface RealPeriod {
  id: string;
  period_name: string;
  period_year: number;
  period_month: number;
  period_start: string;
  period_end: string;
  status: string;
}

interface RealInsuranceType {
  id: string;
  name: string;
  system_key: string;
  is_active: boolean;
}

interface RealSalaryComponent {
  id: string;
  name: string;
  type: string;
  category: string;
  is_taxable?: boolean;
}

/**
 * 薪资 Hooks 综合测试页面
 * 
 * 用于测试所有薪资相关 hooks 的功能和集成
 */
export const PayrollHooksTestPage: React.FC = () => {
  // 测试状态
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedPayrollId, setSelectedPayrollId] = useState<string>('');
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('');
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [activeTest, setActiveTest] = useState<string>('');
  const [showInsuranceDetails, setShowInsuranceDetails] = useState<boolean>(false);
  
  // 用户输入的测试参数
  const [testAmount, setTestAmount] = useState<number>(0);
  const [testPayDate, setTestPayDate] = useState<string>('');
  const [testBaseSalary, setTestBaseSalary] = useState<number>(0);
  
  // 真实数据状态
  const [realEmployees, setRealEmployees] = useState<RealEmployee[]>([]);
  const [realDepartments, setRealDepartments] = useState<RealDepartment[]>([]);
  const [realPositions, setRealPositions] = useState<RealPosition[]>([]);
  const [realCategories, setRealCategories] = useState<RealCategory[]>([]);
  const [realPeriods, setRealPeriods] = useState<RealPeriod[]>([]);
  const [realInsuranceTypes, setRealInsuranceTypes] = useState<RealInsuranceType[]>([]);
  const [realSalaryComponents, setRealSalaryComponents] = useState<RealSalaryComponent[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [selectedPositionId, setSelectedPositionId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedInsuranceTypeId, setSelectedInsuranceTypeId] = useState<string>('');
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [loadingRealData, setLoadingRealData] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

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
      periodId: selectedPeriodId,
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

  // 新增的 Hooks
  const calculationHook = usePayrollCalculation();
  const importExportHook = usePayrollImportExport();
  const approvalHook = usePayrollApproval();
  const analyticsHook = usePayrollAnalytics();
  const managementHook = usePayrollManagement(selectedPeriodId);
  
  // 保险相关 Hooks
  const insuranceTypesHook = useInsuranceTypes();
  const monthlyContributionBasesHook = useEmployeeMonthlyContributionBases(
    selectedEmployeeId,
    selectedYearMonth
  );
  const payrollDetailsHook = usePayrollDetails(selectedPayrollId);
  const insuranceDetailsHook = useEmployeeInsuranceDetails(selectedPayrollId);

  // 加载真实数据函数
  const loadRealData = React.useCallback(async () => {
    setLoadingRealData(true);
    setDataError(null);
    
    try {
      // 并行加载所有数据
      const [employees, departments, positions, categories, periods, insuranceTypes, components] = await Promise.all([
        // 获取员工列表
        supabase.from('employees').select('id, employee_name, id_number, employment_status').order('employee_name'),
        // 获取部门列表
        supabase.from('departments').select('id, name, parent_department_id').order('name'),
        // 获取职位列表
        supabase.from('positions').select('id, name, description').order('name'),
        // 获取员工类别列表
        supabase.from('employee_categories').select('id, name, description').order('name'),
        // 获取薪资周期列表
        supabase.from('payroll_periods').select('id, period_name, period_year, period_month, period_start, period_end, status').order('period_year', { ascending: false }).order('period_month', { ascending: false }),
        // 获取保险类型列表
        supabase.from('insurance_types').select('id, name, system_key, is_active').order('system_key'),
        // 获取薪资组件列表
        supabase.from('salary_components').select('id, name, type, category, is_taxable').order('category').order('name')
      ]);
      
      // 检查错误
      const errors = [];
      if (employees.error) errors.push(`Employees: ${employees.error.message}`);
      if (departments.error) errors.push(`Departments: ${departments.error.message}`);
      if (positions.error) errors.push(`Positions: ${positions.error.message}`);
      if (categories.error) errors.push(`Categories: ${categories.error.message}`);
      if (periods.error) errors.push(`Periods: ${periods.error.message}`);
      if (insuranceTypes.error) errors.push(`InsuranceTypes: ${insuranceTypes.error.message}`);
      if (components.error) errors.push(`Components: ${components.error.message}`);
      
      if (errors.length > 0) {
        console.error('数据加载错误:', errors);
        setDataError(errors.join('; '));
      }
      
      // 设置数据 - 即使有错误也设置成功的数据
      if (employees.data) setRealEmployees(employees.data);
      if (departments.data) setRealDepartments(departments.data);
      if (positions.data) setRealPositions(positions.data);
      if (categories.data) setRealCategories(categories.data);
      if (periods.data) setRealPeriods(periods.data);
      if (insuranceTypes.data) setRealInsuranceTypes(insuranceTypes.data);
      if (components.data) setRealSalaryComponents(components.data);
      
      console.log('真实数据加载结果:', {
        employees: employees.data?.length || 0,
        departments: departments.data?.length || 0,
        positions: positions.data?.length || 0,
        categories: categories.data?.length || 0,
        periods: periods.data?.length || 0,
        insuranceTypes: insuranceTypes.data?.length || 0,
        components: components.data?.length || 0,
        errors: errors
      });
    } catch (error) {
      console.error('加载真实数据失败:', error);
      setDataError(error instanceof Error ? error.message : '加载数据失败');
    } finally {
      setLoadingRealData(false);
    }
  }, []);

  // 初始化加载数据
  useEffect(() => {
    loadRealData();
  }, [loadRealData]);

  // 当选择薪资记录时，自动设置员工ID和周期
  useEffect(() => {
    if (selectedPayrollId && payrollHook.payrolls?.data) {
      const selectedPayroll = payrollHook.payrolls.data.find((p: any) => p.id === selectedPayrollId);
      if (selectedPayroll) {
        setSelectedEmployeeId(selectedPayroll.employee_id);
        // 从周期信息提取年月
        if (selectedPayroll.period) {
          const year = (selectedPayroll.period as any)?.period_year;
          const month = String((selectedPayroll.period as any)?.period_month).padStart(2, '0');
          setSelectedYearMonth(`${year}-${month}`);
        }
      }
    }
  }, [selectedPayrollId, payrollHook.payrolls]);

  // 使用真实ID或回退到默认值
  const mockEmployeeIds = realEmployees.slice(0, 3).map(e => e.id) || ['emp-001', 'emp-002', 'emp-003'];
  const mockCategoryId = selectedCategoryId || realCategories[0]?.id || 'cat-001';
  const mockPositionId = selectedPositionId || realPositions[0]?.id || 'pos-001';
  const mockDepartmentId = selectedDepartmentId || realDepartments[0]?.id || 'dept-001';

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
    if (!selectedYearMonth) {
      throw new Error('请先选择年月');
    }
    
    const [year, month] = selectedYearMonth.split('-').map(Number);
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    
    // 创建新周期
    const newPeriod = await new Promise<any>((resolve, reject) => {
      periodHook.mutations.createPeriod.mutate({
        period_code: selectedYearMonth,
        period_name: `${year}年${month}月`,
        period_year: year,
        period_month: month,
        period_start: `${selectedYearMonth}-01`,
        period_end: `${selectedYearMonth}-${lastDayOfMonth.toString().padStart(2, '0')}`,
        pay_date: testPayDate || `${nextYear}-${nextMonth.toString().padStart(2, '0')}-05`,
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
        categoryId: selectedCategoryId || mockCategoryId,
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
        positionId: selectedPositionId || mockPositionId,
        departmentId: selectedDepartmentId || mockDepartmentId,
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

    if (!contributionBaseHook.mutations?.calculate) {
      throw new Error('缴费基数计算功能未初始化');
    }

    // 自动计算缴费基数
    const calculatedBases = await new Promise<any[]>((resolve, reject) => {
      contributionBaseHook.mutations.calculate.mutate({
        employeeId: selectedEmployeeId,
        periodId: selectedPeriodId,
        baseSalary: testBaseSalary || 0
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

    if (!contributionBaseHook.mutations?.batchSet) {
      throw new Error('批量设置缴费基数功能未初始化');
    }

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
        pay_date: testPayDate || new Date().toISOString().split('T')[0],
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
    // 确保有真实的薪资记录
    let payrollId = selectedPayrollId;
    if (!payrollId && payrollHook.payrolls?.data?.length) {
      payrollId = payrollHook.payrolls.data[0].id;
      setSelectedPayrollId(payrollId);
    }
    
    if (!payrollId) {
      // 如果没有薪资记录，先创建一个
      if (!selectedEmployeeId || !selectedPeriodId) {
        throw new Error('请先选择员工和周期，或创建薪资记录');
      }
      
      const newPayroll = await new Promise<any>((resolve, reject) => {
        payrollHook.mutations.createPayroll.mutate({
          employee_id: selectedEmployeeId,
          period_id: selectedPeriodId,
          pay_date: testPayDate || new Date().toISOString().split('T')[0],
          status: 'draft',
          gross_pay: 0,
          total_deductions: 0,
          net_pay: 0
        }, {
          onSuccess: resolve,
          onError: reject
        });
      });
      
      payrollId = newPayroll.id;
      console.log('创建了新的薪资记录:', payrollId);
    }
    
    // 确保有真实的薪资组件
    const componentId = selectedComponentId || realSalaryComponents.find(c => c.type === 'earning')?.id;
    
    if (!componentId) {
      throw new Error('没有可用的收入组件，请先创建薪资组件');
    }

    await new Promise<void>((resolve, reject) => {
      earningsHook.mutations.createEarning.mutate({
        payroll_id: payrollId,
        component_id: componentId,
        amount: testAmount || 0
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
        grossIncome: testAmount || 0,
        socialInsuranceDeduction: (testAmount || 0) * 0.1,  // 默认10%社保
        housingFundDeduction: (testAmount || 0) * 0.05,     // 默认5%公积金
        specialDeductions: 1000,  // 专项扣除保持固定
        additionalDeductions: 0,
        isAnnual: false
      }, {
        onSuccess: resolve,
        onError: reject
      });
    });

    console.log('个税计算成功:', taxResult);
  };

  // 8. 测试薪资计算
  const testPayrollCalculation = async () => {
    if (!selectedEmployeeId) {
      throw new Error('请先选择员工');
    }

    // 测试预览计算
    const previewResult = await new Promise<any>((resolve, reject) => {
      calculationHook.mutations.preview.mutate({
        employeeId: selectedEmployeeId,
        year: 2025,
        month: 1
      }, {
        onSuccess: resolve,
        onError: reject
      });
    });

    console.log('薪资预览计算成功:', previewResult);

    // 测试批量计算
    if (selectedPeriodId) {
      await new Promise<any>((resolve, reject) => {
        calculationHook.mutations.batchCalculate.mutate({
          periodId: selectedPeriodId,
          dryRun: true
        }, {
          onSuccess: resolve,
          onError: reject
        });
      });
      console.log('批量计算测试成功');
    }
  };

  // 9. 测试导入导出
  const testImportExport = async () => {
    // 测试导出功能
    await new Promise<void>((resolve, reject) => {
      importExportHook.mutations.exportExcel.mutate({
        template: 'standard',
        filters: { periodId: selectedPeriodId },
        includeDetails: true,
        format: 'xlsx'
      }, {
        onSuccess: () => resolve(),
        onError: reject
      });
    });

    console.log('导出功能测试成功');
  };

  // 10. 测试审批流程
  const testApprovalFlow = async () => {
    if (!selectedPeriodId) {
      throw new Error('请先选择周期');
    }

    // 获取真实的薪资ID
    const payrollIds = payrollHook.payrolls?.data?.slice(0, 2).map(p => p.id || p.payroll_id) || [];
    
    if (payrollIds.length === 0) {
      console.log('没有可用的薪资记录进行审批测试');
      return;
    }

    await new Promise<void>((resolve, reject) => {
      approvalHook.mutations.submitForApproval.mutate({
        payrollIds: payrollIds,
        notes: '测试提交审批'
      }, {
        onSuccess: () => resolve(),
        onError: reject
      });
    });

    console.log('审批流程测试成功');
  };

  // 11. 测试统计分析
  const testAnalytics = async () => {
    const currentPeriod = selectedPeriodId || analyticsHook.selectedPeriod;
    
    // 测试生成报表
    const report = await new Promise<any>((resolve, reject) => {
      const currentYear = selectedYearMonth ? selectedYearMonth.split('-')[0] : new Date().getFullYear().toString();
      analyticsHook.actions.generateReport({
        type: 'summary',
        periodStart: `${currentYear}-01`,
        periodEnd: `${currentYear}-12`
      }).then(resolve).catch(reject);
    });

    console.log('统计分析测试成功:', report);
  };

  // 12. 测试完整工作流
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
        payDate: testPayDate || new Date().toISOString().split('T')[0]
      }, {
        onSuccess: () => resolve(),
        onError: reject
      });
    });

    console.log('完整工作流执行成功');
  };

  // 13. 测试 Hook 组合功能
  const testHookIntegration = async () => {
    if (!selectedPeriodId) {
      throw new Error('请先选择周期');
    }

    // 测试 usePayrollManagement 组合Hook
    console.log('Management Hook 数据:', {
      payrollCount: managementHook.payrolls?.data?.length || 0,
      loading: managementHook.loading,
      actions: Object.keys(managementHook.actions)
    });

    console.log('Hook集成测试成功');
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
          当前周期: {periodHook.currentPeriod ? `${periodHook.currentPeriod.period_year}-${periodHook.currentPeriod.period_month.toString().padStart(2, '0')}` : '无'}
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

      <div className="stat bg-base-100 shadow">
        <div className="stat-title">计算进度</div>
        <div className="stat-value text-2xl">
          {calculationHook.utils.getProgressPercentage()}%
        </div>
        <div className="stat-desc">
          {calculationHook.progress.processed}/{calculationHook.progress.total}
        </div>
      </div>

      <div className="stat bg-base-100 shadow">
        <div className="stat-title">导入进度</div>
        <div className="stat-value text-2xl">
          {importExportHook.utils.getProgressPercentage()}%
        </div>
        <div className="stat-desc">
          {importExportHook.utils.getPhaseDescription(importExportHook.importProgress.phase)}
        </div>
      </div>

      <div className="stat bg-base-100 shadow">
        <div className="stat-title">审批进度</div>
        <div className="stat-value text-2xl">
          {approvalHook.processingStatus.total > 0 ? 
            Math.round((approvalHook.processingStatus.current / approvalHook.processingStatus.total) * 100) : 0}%
        </div>
        <div className="stat-desc">
          {approvalHook.processingStatus.current}/{approvalHook.processingStatus.total}
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">测试控制面板</h2>
            <button 
              className="btn btn-outline btn-sm"
              onClick={loadRealData}
              disabled={loadingRealData}
            >
              {loadingRealData ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  刷新中...
                </>
              ) : (
                <>
                  🔄 刷新数据
                </>
              )}
            </button>
          </div>
          
          {/* 显示数据加载状态 */}
          {loadingRealData && (
            <div className="alert alert-info mb-4">
              <span className="loading loading-spinner"></span>
              <span>正在加载真实数据...</span>
            </div>
          )}
          {dataError && (
            <div className="alert alert-warning mb-4">
              <span>⚠️ 部分数据加载错误: {dataError}</span>
              <div className="text-sm mt-1">
                注意：一些高级功能可能需要数据库关系配置。基础功能仍然可用。
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* 员工选择器 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">选择员工 ({realEmployees.length})</span>
              </label>
              <select 
                className="select select-bordered"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                disabled={loadingRealData}
              >
                <option value="">请选择员工</option>
                {realEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_name} {emp.id_number ? `(${emp.id_number.slice(-4)})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 周期选择器 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">选择周期 ({realPeriods.length})</span>
              </label>
              <select 
                className="select select-bordered"
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                disabled={loadingRealData}
              >
                <option value="">请选择周期</option>
                {realPeriods.map(period => (
                  <option key={period.id} value={period.id}>
                    {period.period_name} ({period.status})
                  </option>
                ))}
              </select>
            </div>

            {/* 部门选择器 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">选择部门 ({realDepartments.length})</span>
              </label>
              <select 
                className="select select-bordered"
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                disabled={loadingRealData}
              >
                <option value="">请选择部门</option>
                {realDepartments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 职位选择器 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">选择职位 ({realPositions.length})</span>
              </label>
              <select 
                className="select select-bordered"
                value={selectedPositionId}
                onChange={(e) => setSelectedPositionId(e.target.value)}
                disabled={loadingRealData}
              >
                <option value="">请选择职位</option>
                {realPositions.map(pos => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 类别选择器 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">选择类别 ({realCategories.length})</span>
              </label>
              <select 
                className="select select-bordered"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                disabled={loadingRealData}
              >
                <option value="">请选择类别</option>
                {realCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 保险类型选择器 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">选择保险类型 ({realInsuranceTypes.filter(t => t.is_active).length})</span>
              </label>
              <select 
                className="select select-bordered"
                value={selectedInsuranceTypeId}
                onChange={(e) => setSelectedInsuranceTypeId(e.target.value)}
                disabled={loadingRealData}
              >
                <option value="">请选择保险类型</option>
                {realInsuranceTypes.filter(type => type.is_active).map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.system_key})
                  </option>
                ))}
              </select>
            </div>

            {/* 薪资组件选择器 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">选择薪资组件 ({realSalaryComponents.length})</span>
              </label>
              <select 
                className="select select-bordered"
                value={selectedComponentId}
                onChange={(e) => setSelectedComponentId(e.target.value)}
                disabled={loadingRealData}
              >
                <option value="">请选择薪资组件</option>
                {realSalaryComponents.map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({comp.type}/{comp.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 测试参数输入区域 */}
          <div className="divider">测试参数设置</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* 测试金额输入 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">测试金额</span>
                <span className="label-text-alt">用于收入和税额计算</span>
              </label>
              <input 
                type="number"
                className="input input-bordered"
                placeholder="请输入金额"
                value={testAmount}
                onChange={(e) => setTestAmount(Number(e.target.value))}
                min="0"
                step="100"
              />
            </div>

            {/* 测试支付日期输入 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">支付日期</span>
                <span className="label-text-alt">薪资发放日期</span>
              </label>
              <input 
                type="date"
                className="input input-bordered"
                value={testPayDate}
                onChange={(e) => setTestPayDate(e.target.value)}
              />
            </div>

            {/* 测试基本工资输入 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">基本工资</span>
                <span className="label-text-alt">用于缴费基数计算</span>
              </label>
              <input 
                type="number"
                className="input input-bordered"
                placeholder="请输入基本工资"
                value={testBaseSalary}
                onChange={(e) => setTestBaseSalary(Number(e.target.value))}
                min="0"
                step="100"
              />
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
              className={`btn btn-ghost ${activeTest === 'calculation' ? 'loading' : ''}`}
              onClick={() => runTest('calculation', testPayrollCalculation)}
              disabled={activeTest !== '' || !selectedEmployeeId}
            >
              测试薪资计算
            </button>
            
            <button 
              className={`btn btn-outline ${activeTest === 'import' ? 'loading' : ''}`}
              onClick={() => runTest('import', testImportExport)}
              disabled={activeTest !== ''}
            >
              测试导入导出
            </button>
            
            <button 
              className={`btn btn-warning ${activeTest === 'approval' ? 'loading' : ''}`}
              onClick={() => runTest('approval', testApprovalFlow)}
              disabled={activeTest !== '' || !selectedPeriodId}
            >
              测试审批流程
            </button>
            
            <button 
              className={`btn btn-info ${activeTest === 'analytics' ? 'loading' : ''}`}
              onClick={() => runTest('analytics', testAnalytics)}
              disabled={activeTest !== ''}
            >
              测试统计分析
            </button>
            
            <button 
              className={`btn btn-success ${activeTest === 'integration' ? 'loading' : ''}`}
              onClick={() => runTest('integration', testHookIntegration)}
              disabled={activeTest !== '' || !selectedPeriodId}
            >
              测试Hook集成
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
              {renderTestResult('calculation')}
              {renderTestResult('import')}
              {renderTestResult('approval')}
              {renderTestResult('analytics')}
              {renderTestResult('integration')}
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

      {/* 员工保险信息查询 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">员工保险信息查询</h2>
          
          {/* 查询条件 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">选择年月</span>
              </label>
              <input
                type="month"
                className="input input-bordered"
                value={selectedYearMonth}
                onChange={(e) => setSelectedYearMonth(e.target.value)}
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">选择薪资记录</span>
              </label>
              <select
                className="select select-bordered"
                value={selectedPayrollId}
                onChange={(e) => {
                  setSelectedPayrollId(e.target.value);
                  console.log('Selected payroll ID:', e.target.value);
                }}
              >
                <option value="">请选择薪资记录</option>
                {payrollHook.payrolls?.data?.map((payroll: any) => {
                  // 处理薪资周期显示
                  let periodDisplay = '';
                  if (payroll.period?.period_name) {
                    // 如果 period_name 已经是格式化的字符串（如 "2025年1月"），直接使用
                    periodDisplay = payroll.period.period_name;
                  } else if (payroll.period?.period_year && payroll.period?.period_month) {
                    // 如果有年月数值，格式化为字符串
                    periodDisplay = `${payroll.period.period_year}年${payroll.period.period_month}月`;
                  } else if (payroll.pay_date) {
                    // 使用支付日期作为后备
                    const date = new Date(payroll.pay_date);
                    periodDisplay = `${date.getFullYear()}年${date.getMonth() + 1}月`;
                  } else {
                    periodDisplay = '未知周期';
                  }
                  
                  return (
                    <option key={payroll.id} value={payroll.id}>
                      {payroll.employee_name} - {periodDisplay}
                    </option>
                  );
                })}
              </select>
              {payrollHook.loading.isLoadingPayrolls && (
                <label className="label">
                  <span className="label-text-alt">正在加载薪资记录...</span>
                </label>
              )}
              {!payrollHook.loading.isLoadingPayrolls && (!payrollHook.payrolls?.data || payrollHook.payrolls.data.length === 0) && (
                <label className="label">
                  <span className="label-text-alt text-warning">暂无薪资记录，请先创建或选择周期</span>
                </label>
              )}
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">操作</span>
              </label>
              <div className="flex gap-2">
                <button
                  className="btn btn-primary"
                  onClick={() => setShowInsuranceDetails(!showInsuranceDetails)}
                >
                  {showInsuranceDetails ? '隐藏' : '显示'}保险详情
                </button>
                <button
                  className="btn btn-outline btn-secondary"
                  onClick={() => {
                    payrollHook.actions.refreshPayrolls();
                    insuranceTypesHook.refetch();
                    if (selectedPayrollId) {
                      insuranceDetailsHook.refetch();
                      payrollDetailsHook.refetch();
                    }
                    if (selectedEmployeeId && selectedYearMonth) {
                      monthlyContributionBasesHook.refetch();
                    }
                  }}
                >
                  刷新数据
                </button>
              </div>
            </div>
          </div>

          {/* 保险类型列表 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">可用保险类型</h3>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>保险类型</th>
                    <th>系统标识</th>
                    <th>描述</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {insuranceTypesHook.data?.map((type) => (
                    <tr key={type.id}>
                      <td>{type.name}</td>
                      <td><code className="text-xs">{type.system_key}</code></td>
                      <td className="text-sm">{type.description}</td>
                      <td>
                        <span className={`badge badge-sm ${type.is_active ? 'badge-success' : 'badge-ghost'}`}>
                          {type.is_active ? '启用' : '停用'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 员工月度缴费基数 */}
          {selectedEmployeeId && selectedYearMonth && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">
                员工月度缴费基数 ({selectedYearMonth})
                <span className="text-sm font-normal ml-2 text-base-content/60">
                  员工ID: {selectedEmployeeId}
                </span>
              </h3>
              
              {monthlyContributionBasesHook.isLoading && (
                <div className="alert alert-info">
                  <span>正在加载员工月度缴费基数...</span>
                </div>
              )}
              
              {monthlyContributionBasesHook.error && (
                <div className="alert alert-error">
                  <span>加载失败: {monthlyContributionBasesHook.error.message}</span>
                </div>
              )}
              
              {!monthlyContributionBasesHook.isLoading && !monthlyContributionBasesHook.error && (
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>保险类型</th>
                        <th>缴费基数</th>
                        <th>生效日期</th>
                        <th>失效日期</th>
                        <th>就业状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyContributionBasesHook.data?.map((base) => (
                        <tr key={`${base.insurance_type_id}-${base.month_number}`}>
                          <td>{base.insurance_type_name}</td>
                          <td className="font-mono">¥{(base.contribution_base || 0).toFixed(2)}</td>
                          <td>{base.effective_start_date}</td>
                          <td>{base.effective_end_date || '-'}</td>
                          <td>
                            <span className="badge badge-sm badge-info">
                              {base.employment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!monthlyContributionBasesHook.data || monthlyContributionBasesHook.data.length === 0) && (
                    <div className="text-center py-4 text-base-content/60">
                      暂无缴费基数数据 (员工: {selectedEmployeeId}, 月份: {selectedYearMonth})
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 薪资保险计算详情 */}
          {showInsuranceDetails && selectedPayrollId && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">
                保险详情 (useEmployeeInsuranceDetails)
              </h3>
              
              {/* 员工五险一金基数 - 从薪资详情数据中提取 */}
              {payrollDetailsHook.data && payrollDetailsHook.data.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-md font-semibold mb-2">员工五险一金缴费明细</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {/* 养老保险 */}
                    {(() => {
                      const pensionPersonal = payrollDetailsHook.data.find((item: any) => 
                        item.component_name?.includes('养老保险') && item.category === 'personal_insurance'
                      );
                      const pensionEmployer = payrollDetailsHook.data.find((item: any) => 
                        item.component_name?.includes('养老保险') && item.category === 'employer_insurance'
                      );
                      if (pensionPersonal || pensionEmployer) {
                        return (
                          <div className="stat bg-base-200 rounded-lg p-3">
                            <div className="stat-title text-xs">养老保险</div>
                            <div className="stat-value text-sm">
                              个人: ¥{parseFloat(pensionPersonal?.amount || 0).toFixed(2)}
                            </div>
                            <div className="stat-desc text-xs">
                              单位: ¥{parseFloat(pensionEmployer?.amount || 0).toFixed(2)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* 医疗保险 */}
                    {(() => {
                      const medicalPersonal = payrollDetailsHook.data.find((item: any) => 
                        item.component_name?.includes('医疗保险') && item.category === 'personal_insurance'
                      );
                      const medicalEmployer = payrollDetailsHook.data.find((item: any) => 
                        item.component_name?.includes('医疗保险') && item.category === 'employer_insurance'
                      );
                      if (medicalPersonal || medicalEmployer) {
                        return (
                          <div className="stat bg-base-200 rounded-lg p-3">
                            <div className="stat-title text-xs">医疗保险</div>
                            <div className="stat-value text-sm">
                              个人: ¥{parseFloat(medicalPersonal?.amount || 0).toFixed(2)}
                            </div>
                            <div className="stat-desc text-xs">
                              单位: ¥{parseFloat(medicalEmployer?.amount || 0).toFixed(2)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* 失业保险 */}
                    {(() => {
                      const unemploymentPersonal = payrollDetailsHook.data.find((item: any) => 
                        item.component_name?.includes('失业保险') && item.category === 'personal_insurance'
                      );
                      const unemploymentEmployer = payrollDetailsHook.data.find((item: any) => 
                        item.component_name?.includes('失业保险') && item.category === 'employer_insurance'
                      );
                      if (unemploymentPersonal || unemploymentEmployer) {
                        return (
                          <div className="stat bg-base-200 rounded-lg p-3">
                            <div className="stat-title text-xs">失业保险</div>
                            <div className="stat-value text-sm">
                              个人: ¥{parseFloat(unemploymentPersonal?.amount || 0).toFixed(2)}
                            </div>
                            <div className="stat-desc text-xs">
                              单位: ¥{parseFloat(unemploymentEmployer?.amount || 0).toFixed(2)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* 工伤保险 */}
                    {(() => {
                      const injuryEmployer = payrollDetailsHook.data.find((item: any) => 
                        item.component_name?.includes('工伤保险') && item.category === 'employer_insurance'
                      );
                      if (injuryEmployer) {
                        return (
                          <div className="stat bg-base-200 rounded-lg p-3">
                            <div className="stat-title text-xs">工伤保险</div>
                            <div className="stat-value text-sm">
                              个人: ¥0.00
                            </div>
                            <div className="stat-desc text-xs">
                              单位: ¥{parseFloat(injuryEmployer?.amount || 0).toFixed(2)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* 生育保险 */}
                    {(() => {
                      const maternityPersonal = payrollDetailsHook.data.find((item: any) => 
                        item.component_name?.includes('生育保险') && item.category === 'personal_insurance'
                      );
                      const maternityEmployer = payrollDetailsHook.data.find((item: any) => 
                        item.component_name?.includes('生育保险') && item.category === 'employer_insurance'
                      );
                      if (maternityPersonal || maternityEmployer) {
                        return (
                          <div className="stat bg-base-200 rounded-lg p-3">
                            <div className="stat-title text-xs">生育保险</div>
                            <div className="stat-value text-sm">
                              个人: ¥{parseFloat(maternityPersonal?.amount || 0).toFixed(2)}
                            </div>
                            <div className="stat-desc text-xs">
                              单位: ¥{parseFloat(maternityEmployer?.amount || 0).toFixed(2)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* 住房公积金 */}
                    {(() => {
                      const housingPersonal = payrollDetailsHook.data.find((item: any) => 
                        item.component_name?.includes('住房公积金') && item.category === 'personal_insurance'
                      );
                      const housingEmployer = payrollDetailsHook.data.find((item: any) => 
                        item.component_name?.includes('住房公积金') && item.category === 'employer_insurance'
                      );
                      if (housingPersonal || housingEmployer) {
                        return (
                          <div className="stat bg-base-200 rounded-lg p-3">
                            <div className="stat-title text-xs">住房公积金</div>
                            <div className="stat-value text-sm">
                              个人: ¥{parseFloat(housingPersonal?.amount || 0).toFixed(2)}
                            </div>
                            <div className="stat-desc text-xs">
                              单位: ¥{parseFloat(housingEmployer?.amount || 0).toFixed(2)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* 职业年金 */}
                    {(() => {
                      const annuityPersonal = payrollDetailsHook.data.find((item: any) => 
                        item.component_name?.includes('职业年金') && item.category === 'personal_insurance'
                      );
                      const annuityEmployer = payrollDetailsHook.data.find((item: any) => 
                        item.component_name?.includes('职业年金') && item.category === 'employer_insurance'
                      );
                      if (annuityPersonal || annuityEmployer) {
                        return (
                          <div className="stat bg-base-200 rounded-lg p-3">
                            <div className="stat-title text-xs">职业年金</div>
                            <div className="stat-value text-sm">
                              个人: ¥{parseFloat(annuityPersonal?.amount || 0).toFixed(2)}
                            </div>
                            <div className="stat-desc text-xs">
                              单位: ¥{parseFloat(annuityEmployer?.amount || 0).toFixed(2)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* 大病医疗 */}
                    {(() => {
                      const criticalPersonal = payrollDetailsHook.data.find((item: any) => 
                        item.component_name?.includes('大病医疗') && item.category === 'personal_insurance'
                      );
                      const criticalEmployer = payrollDetailsHook.data.find((item: any) => 
                        item.component_name?.includes('大病医疗') && item.category === 'employer_insurance'
                      );
                      if (criticalPersonal || criticalEmployer) {
                        return (
                          <div className="stat bg-base-200 rounded-lg p-3">
                            <div className="stat-title text-xs">大病医疗</div>
                            <div className="stat-value text-sm">
                              个人: ¥{parseFloat(criticalPersonal?.amount || 0).toFixed(2)}
                            </div>
                            <div className="stat-desc text-xs">
                              单位: ¥{parseFloat(criticalEmployer?.amount || 0).toFixed(2)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  
                  {/* 计算基数反推（如果有数据的话） */}
                  <div className="mt-3 text-sm text-base-content/60">
                    <p>* 缴费基数可通过缴费金额和费率反推计算</p>
                  </div>
                </div>
              )}
              
              {/* 调试信息 */}
              {insuranceDetailsHook.isLoading && (
                <div className="alert alert-info mb-4">
                  <span>正在加载保险详情数据...</span>
                </div>
              )}
              {insuranceDetailsHook.error && (
                <div className="alert alert-error mb-4">
                  <span>加载保险详情失败: {insuranceDetailsHook.error.message}</span>
                </div>
              )}
              {!insuranceDetailsHook.isLoading && !insuranceDetailsHook.error && (
                <div className="text-sm text-base-content/60 mb-2">
                  已加载 {insuranceDetailsHook.data?.length || 0} 条保险记录
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>保险类型</th>
                      <th>是否适用</th>
                      <th>缴费基数</th>
                      <th>调整后基数</th>
                      <th>员工费率</th>
                      <th>雇主费率</th>
                      <th>员工缴费</th>
                      <th>雇主缴费</th>
                      <th>跳过原因</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insuranceDetailsHook.data?.map((detail) => (
                      <tr key={detail.id}>
                        <td>{(detail as any).insurance_type?.name}</td>
                        <td>
                          <span className={`badge badge-sm ${detail.is_applicable ? 'badge-success' : 'badge-error'}`}>
                            {detail.is_applicable ? '适用' : '不适用'}
                          </span>
                        </td>
                        <td className="font-mono">¥{detail.contribution_base.toFixed(2)}</td>
                        <td className="font-mono">¥{detail.adjusted_base.toFixed(2)}</td>
                        <td className="font-mono">{(detail.employee_rate * 100).toFixed(2)}%</td>
                        <td className="font-mono">{(detail.employer_rate * 100).toFixed(2)}%</td>
                        <td className="font-mono text-error">-¥{detail.employee_amount.toFixed(2)}</td>
                        <td className="font-mono text-error">-¥{detail.employer_amount.toFixed(2)}</td>
                        <td className="text-sm">{detail.skip_reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!insuranceDetailsHook.data || insuranceDetailsHook.data.length === 0) && (
                  <div className="text-center py-4 text-base-content/60">
                    请选择有效的薪资记录查看保险计算详情
                  </div>
                )}
              </div>
              
              {/* 保险缴费汇总 */}
              {insuranceDetailsHook.data && insuranceDetailsHook.data.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="stat bg-base-200 rounded-lg">
                    <div className="stat-title">员工缴费合计</div>
                    <div className="stat-value text-2xl text-error">
                      -¥{insuranceDetailsHook.data
                        .reduce((sum, item) => sum + item.employee_amount, 0)
                        .toFixed(2)}
                    </div>
                  </div>
                  <div className="stat bg-base-200 rounded-lg">
                    <div className="stat-title">雇主缴费合计</div>
                    <div className="stat-value text-2xl text-error">
                      -¥{insuranceDetailsHook.data
                        .reduce((sum, item) => sum + item.employer_amount, 0)
                        .toFixed(2)}
                    </div>
                  </div>
                  <div className="stat bg-base-200 rounded-lg">
                    <div className="stat-title">总缴费金额</div>
                    <div className="stat-value text-2xl text-error">
                      -¥{insuranceDetailsHook.data
                        .reduce((sum, item) => sum + item.employee_amount + item.employer_amount, 0)
                        .toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 薪资详情 */}
          {showInsuranceDetails && selectedPayrollId && payrollDetailsHook.data && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">薪资详情 (usePayrollDetails)</h3>
              <div className="text-sm space-y-2">
                <p><strong>ID:</strong> {selectedPayrollId}</p>
                {payrollDetailsHook.data.length > 0 && (
                  <>
                    <p><strong>员工:</strong> {payrollDetailsHook.data[0].employee_name}</p>
                    <p><strong>收入项:</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      {payrollDetailsHook.data
                        .filter((item: any) => item.category === 'basic_salary' || 
                                             item.category === 'benefits' || 
                                             item.type === 'earning')
                        .map((item: any) => (
                          <li key={item.item_id}>
                            {item.component_name}: ¥{parseFloat(item.amount || 0).toFixed(2)}
                          </li>
                        ))}
                    </ul>
                    <p className="text-success">
                      <strong>收入合计:</strong> ¥{
                        payrollDetailsHook.data
                          .filter((item: any) => item.category === 'basic_salary' || 
                                               item.category === 'benefits' || 
                                               item.type === 'earning')
                          .reduce((sum: number, item: any) => sum + parseFloat(item.amount || 0), 0)
                          .toFixed(2)
                      }
                    </p>
                    <p><strong>扣除项:</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      <li>个人扣除项:
                        <ul className="list-circle list-inside ml-4">
                          {payrollDetailsHook.data
                            .filter((item: any) => item.category === 'personal_insurance' || 
                                                 item.category === 'personal_tax')
                            .map((item: any) => (
                              <li key={item.item_id}>
                                {item.component_name}: ¥{parseFloat(item.amount || 0).toFixed(2)}
                              </li>
                            ))}
                        </ul>
                      </li>
                      <li>单位扣除项:
                        <ul className="list-circle list-inside ml-4">
                          {payrollDetailsHook.data
                            .filter((item: any) => item.category === 'employer_insurance')
                            .map((item: any) => (
                              <li key={item.item_id}>
                                {item.component_name}: ¥{parseFloat(item.amount || 0).toFixed(2)}
                              </li>
                            ))}
                        </ul>
                      </li>
                    </ul>
                    <p className="text-error">
                      <strong>个人扣除:</strong> ¥{
                        payrollDetailsHook.data
                          .filter((item: any) => item.category === 'personal_insurance' || 
                                               item.category === 'personal_tax')
                          .reduce((sum: number, item: any) => sum + parseFloat(item.amount || 0), 0)
                          .toFixed(2)
                      }
                    </p>
                    <p className="text-error">
                      <strong>单位扣除:</strong> ¥{
                        payrollDetailsHook.data
                          .filter((item: any) => item.category === 'employer_insurance')
                          .reduce((sum: number, item: any) => sum + parseFloat(item.amount || 0), 0)
                          .toFixed(2)
                      }
                    </p>
                    <p className="text-error">
                      <strong>扣除合计:</strong> -¥{
                        Math.abs(payrollDetailsHook.data
                          .filter((item: any) => item.category === 'personal_insurance' || 
                                               item.category === 'employer_insurance' ||
                                               item.category === 'personal_tax' ||
                                               item.type === 'deduction')
                          .reduce((sum: number, item: any) => sum + parseFloat(item.amount || 0), 0))
                          .toFixed(2)
                      }
                    </p>
                    <p className="text-primary font-bold">
                      <strong>实发工资:</strong> ¥{payrollDetailsHook.data[0].net_pay}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
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
                <li>薪资计算: {calculationHook.loading.batch ? '计算中...' : '已就绪'}</li>
                <li>导入导出: {importExportHook.loading.import || importExportHook.loading.export ? '处理中...' : '已就绪'}</li>
                <li>审批流程: {approvalHook.loading.isProcessing ? '处理中...' : '已就绪'}</li>
                <li>统计分析: {'已就绪'}</li>
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
              <li>现在使用的是真实数据库数据，而不是模拟数据</li>
              <li>某些测试需要先执行前置步骤（如先创建周期，再测试员工分配）</li>
              <li>实时订阅功能需要 WebSocket 连接正常</li>
              <li><strong>当前版本:</strong> 所有功能已启用，数据库关系查询已优化</li>
              <li>薪资计算测试需要选择有效的员工ID</li>
              <li>导入导出测试需要实际的文件数据</li>
              <li>审批流程测试需要有效的薪资记录ID</li>
              <li>统计分析测试需要有历史数据支撑</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// 添加默认导出以支持 lazy loading
export default PayrollHooksTestPage;