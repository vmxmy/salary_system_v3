import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  useInsuranceCalculation,
  useAllInsuranceCalculation,
  useBatchInsuranceCalculation
} from '@/hooks/insurance';
import { usePayrollPeriods } from '@/hooks/payroll/usePayrollPeriod';
import { useQuery } from '@tanstack/react-query';

const InsuranceCalculationTest: React.FC = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [testResults, setTestResults] = useState<any[]>([]);

  // 使用现有的薪资期间 hook
  const { data: periodsData, isLoading: periodsLoading } = usePayrollPeriods({
    pageSize: 10
  });
  
  // 从返回的对象中提取期间数组
  const periods = periodsData?.data || [];

  // 使用 React Query 获取期间的员工
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['period-employees', selectedPeriod],
    queryFn: async () => {
      if (!selectedPeriod) return [];
      
      // 先获取该期间的所有薪资记录
      const { data: payrollData, error: payrollError } = await supabase
        .from('payrolls')
        .select('employee_id')
        .eq('period_id', selectedPeriod);
      
      if (payrollError) throw payrollError;
      
      if (!payrollData || payrollData.length === 0) return [];
      
      // 获取唯一的员工ID列表
      const uniqueEmployeeIds = [...new Set(payrollData.map(p => p.employee_id))];
      
      // 批量获取员工信息
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, employee_name')
        .in('id', uniqueEmployeeIds)
        .order('employee_name');
      
      if (employeeError) throw employeeError;
      
      return employeeData || [];
    },
    enabled: !!selectedPeriod
  });

  const { calculateInsurance, loading: singleLoading } = useInsuranceCalculation();
  const { calculateAllInsurance, loading: allLoading } = useAllInsuranceCalculation();
  const { calculateBatchInsurance, loading: batchLoading, progress } = useBatchInsuranceCalculation();

  // 当选择期间后，重置员工选择
  useEffect(() => {
    if (!selectedPeriod) {
      setSelectedEmployee('');
    } else if (employees.length > 0 && !selectedEmployee) {
      // 自动选择第一个员工
      setSelectedEmployee(employees[0].id);
    }
  }, [selectedPeriod, employees]);

  // 测试单个保险计算
  const testSingleInsurance = async () => {
    if (!selectedEmployee || !selectedPeriod) {
      alert('请选择员工和期间');
      return;
    }

    const results = [];
    const insuranceTypes = ['pension', 'medical', 'unemployment', 'work_injury', 'housing_fund', 'occupational_pension'];
    
    for (const type of insuranceTypes) {
      // 计算个人部分
      if (type !== 'work_injury') {
        const employeeResult = await calculateInsurance({
          employeeId: selectedEmployee,
          periodId: selectedPeriod,
          insuranceTypeKey: type,
          isEmployer: false
        });
        results.push({
          type: `${type} (个人)`,
          ...employeeResult
        });
      }

      // 计算单位部分
      const employerResult = await calculateInsurance({
        employeeId: selectedEmployee,
        periodId: selectedPeriod,
        insuranceTypeKey: type,
        isEmployer: true
      });
      results.push({
        type: `${type} (单位)`,
        ...employerResult
      });
    }

    setTestResults(results);
  };

  // 测试综合计算
  const testAllInsurance = async () => {
    if (!selectedEmployee || !selectedPeriod) {
      alert('请选择员工和期间');
      return;
    }

    const result = await calculateAllInsurance({
      employeeId: selectedEmployee,
      periodId: selectedPeriod,
      includeOccupationalPension: true
    });

    setTestResults([{
      type: '综合计算结果',
      success: result.success,
      totalEmployeeAmount: result.totalEmployeeAmount,
      totalEmployerAmount: result.totalEmployerAmount,
      details: result.details,
      errors: result.errors
    }]);
  };

  // 测试批量计算 - 对当前周期所有员工进行计算
  const testBatchCalculation = async () => {
    if (!selectedPeriod) {
      alert('请选择期间');
      return;
    }

    // 对当前周期的所有员工进行批量计算
    const employeeIds = employees.map(e => e.id);
    
    // 显示确认提示
    if (!confirm(`确定要对当前周期的 ${employeeIds.length} 名员工进行批量五险一金计算吗？`)) {
      return;
    }
    
    const results = await calculateBatchInsurance({
      periodId: selectedPeriod,
      employeeIds,
      includeOccupationalPension: true
    });

    setTestResults(results);
  };

  // 测试员工保险类型适用关系
  const testInsuranceApplicability = async () => {
    if (!selectedEmployee || !selectedPeriod) {
      alert('请选择员工和期间');
      return;
    }

    try {
      // 使用现有的 hook 获取保险基础数据
      const { InsuranceDataService } = await import('@/hooks/insurance/core/insuranceDataService');
      const baseData = await InsuranceDataService.fetchEmployeeInsuranceData(selectedEmployee, selectedPeriod);
      
      // 获取所有类别的规则
      const allCategoryRules = await InsuranceDataService.fetchAllCategoryRules(selectedPeriod);
      
      // 整理结果
      const results: any[] = [];
      
      // 遍历所有保险类型
      for (const [key, insuranceType] of baseData.insuranceTypes) {
        const rule = baseData.insuranceRules.get(insuranceType.id);
        const contributionBase = baseData.contributionBases.get(insuranceType.id);
        
        // 获取该保险类型对所有类别的适用情况
        const categoryApplicability: Record<string, boolean> = {};
        const categoryRootInfo: Record<string, string> = {}; // 存储每个类别的root信息
        const insuranceRules = allCategoryRules.rules.get(insuranceType.id);
        
        if (insuranceRules) {
          allCategoryRules.categories.forEach(cat => {
            const isApplicable = insuranceRules.get(cat.id);
            categoryApplicability[cat.name] = isApplicable || false;
            // 存储root类别信息
            if (cat.root_category) {
              categoryRootInfo[cat.name] = cat.root_category;
            }
          });
        } else {
          // 如果没有找到该保险类型的规则，所有类别都设为不适用
          allCategoryRules.categories.forEach(cat => {
            categoryApplicability[cat.name] = false;
            // 存储root类别信息
            if (cat.root_category) {
              categoryRootInfo[cat.name] = cat.root_category;
            }
          });
        }
        
        results.push({
          type: `${insuranceType.name} (${insuranceType.system_key})`,
          success: true,
          is_applicable: rule?.is_applicable || false,
          employee_rate: rule?.employee_rate || 0,
          employer_rate: rule?.employer_rate || 0,
          contribution_base: contributionBase || 0,
          base_floor: rule?.base_floor || 0,
          base_ceiling: rule?.base_ceiling || 0,
          category_applicability: categoryApplicability,
          category_root_info: categoryRootInfo, // 添加root类别信息
          details: {
            insurance_type_id: insuranceType.id,
            category_id: baseData.employeeCategoryId,
            category_name: baseData.employeeCategoryName,
            has_rule: !!rule,
            has_base: contributionBase !== undefined,
            period_end: baseData.periodEnd
          }
        });
      }

      setTestResults(results);
    } catch (error) {
      setTestResults([{
        type: '保险适用关系测试',
        success: false,
        message: error instanceof Error ? error.message : '未知错误'
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
      <h1 className="text-2xl font-bold mb-6">五险一金计算测试</h1>

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
          {/* 期间选择（优先） */}
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

          {/* 员工选择（基于期间） */}
          <div>
            <label className="label">
              <span className="label-text">2. 选择员工</span>
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
              ) : employees.length === 0 ? (
                <option value="">该期间无员工数据</option>
              ) : (
                <>
                  <option value="">请选择员工</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_name}
                    </option>
                  ))}
                </>
              )}
            </select>
            {selectedPeriod && employees.length > 0 && (
              <label className="label">
                <span className="label-text-alt">共 {employees.length} 名员工</span>
              </label>
            )}
          </div>
        </div>

        {/* 测试按钮 */}
        <div className="flex flex-wrap gap-4 mt-6">
          <button 
            className="btn btn-info"
            onClick={testInsuranceApplicability}
            disabled={!selectedEmployee || !selectedPeriod}
          >
            测试保险适用关系
          </button>

          <button 
            className="btn btn-primary"
            onClick={testSingleInsurance}
            disabled={singleLoading || !selectedEmployee || !selectedPeriod}
          >
            {singleLoading ? '计算中...' : '测试单项保险计算'}
          </button>

          <button 
            className="btn btn-secondary"
            onClick={testAllInsurance}
            disabled={allLoading || !selectedEmployee || !selectedPeriod}
          >
            {allLoading ? '计算中...' : '测试综合计算'}
          </button>

          <button 
            className="btn btn-accent"
            onClick={testBatchCalculation}
            disabled={batchLoading || !selectedPeriod || employees.length === 0}
            title={`对当前周期的 ${employees.length} 名员工进行五险一金批量计算`}
          >
            {batchLoading ? `处理中 (${progress.current}/${progress.total})` : `批量计算全部员工 (${employees.length}人)`}
          </button>
        </div>
      </div>

      {/* 进度条 */}
      {batchLoading && progress.total > 0 && (
        <div className="mb-4">
          <progress 
            className="progress progress-primary w-full" 
            value={progress.current} 
            max={progress.total}
          />
          <p className="text-sm mt-1">
            正在处理当前周期所有员工: {progress.current} / {progress.total}
          </p>
        </div>
      )}

      {/* 测试结果 */}
      {testResults.length > 0 && (
        <div className="bg-base-100 rounded-lg overflow-hidden">
          <div className="p-4 bg-base-200">
            <h2 className="text-lg font-semibold">测试结果</h2>
            {/* 显示图例（仅在保险适用关系测试时显示） */}
            {testResults.some(r => r.is_applicable !== undefined) && (
              <div className="mt-2 text-sm space-y-1">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <span className="badge badge-success badge-xs"></span> 适用的保险
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="badge badge-warning badge-xs"></span> 不适用的保险（淡黄色背景行）
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-base-content/70">
                  <span>类别适用情况（按根类别分组）：</span>
                  <span className="badge badge-success badge-xs">类别名✓</span> = 该类别适用
                  <span className="badge badge-ghost badge-xs">类别名✗</span> = 该类别不适用
                </div>
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>类型</th>
                  <th>保险名称</th>
                  <th>状态</th>
                  <th>金额/基数</th>
                  <th>费率</th>
                  <th>详情</th>
                  <th>所有类别适用情况</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, index) => (
                  <tr key={index} className={result.is_applicable === false ? 'bg-warning/10' : ''}>
                    <td>{result.type || result.employeeName}</td>
                    <td>
                      {/* 保险名称列 - 显示中文名称 */}
                      {result.details?.insuranceTypeName || 
                       (result.type && result.type.includes('(') ? result.type.split(' ')[0] : '-')}
                    </td>
                    <td>
                      <span className={`badge ${result.success ? 'badge-success' : 'badge-error'}`}>
                        {result.success ? '成功' : '失败'}
                      </span>
                    </td>
                    <td>
                      {/* 金额/基数列 - 根据测试类型显示不同内容 */}
                      {result.contribution_base !== undefined ? (
                        // 保险适用关系测试 - 显示缴费基数
                        <div>
                          <div>基数: {formatAmount(result.contribution_base)}</div>
                          <div>范围: {formatAmount(result.base_floor)} - {formatAmount(result.base_ceiling)}</div>
                        </div>
                      ) : result.amount ? (
                        // 单项保险计算 - 显示金额
                        formatAmount(result.amount)
                      ) : result.totalEmployeeAmount ? (
                        // 综合计算 - 显示个人和单位金额
                        <div>
                          <div>个人: {formatAmount(result.totalEmployeeAmount)}</div>
                          <div>单位: {formatAmount(result.totalEmployerAmount)}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      {/* 费率列 - 显示费率和基数信息 */}
                      {result.details?.rate !== undefined ? (
                        <div className="space-y-1">
                          <div className="font-medium">{(result.details.rate * 100).toFixed(2)}%</div>
                          {result.details.contributionBase && (
                            <div className="text-xs text-base-content/60">
                              基数: {formatAmount(result.details.contributionBase)}
                            </div>
                          )}
                          {result.details.baseFloor && result.details.baseCeiling && (
                            <div className="text-xs text-base-content/60">
                              范围: {formatAmount(result.details.baseFloor)} - {formatAmount(result.details.baseCeiling)}
                            </div>
                          )}
                        </div>
                      ) : result.employee_rate !== undefined || result.employer_rate !== undefined ? (
                        <div>
                          {result.employee_rate !== undefined && (
                            <div>个人: {(result.employee_rate * 100).toFixed(2)}%</div>
                          )}
                          {result.employer_rate !== undefined && (
                            <div>单位: {(result.employer_rate * 100).toFixed(2)}%</div>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      {/* 详情列 - 显示适用性或其他详细信息 */}
                      {result.is_applicable !== undefined ? (
                        <div>
                          <div className="mb-1">
                            <span className={`badge ${result.is_applicable ? 'badge-success' : 'badge-warning'}`}>
                              {result.is_applicable ? '适用' : '不适用'}
                            </span>
                          </div>
                          {result.details && (
                            <div className="text-xs space-y-1">
                              <div>类别: {result.details.category_name}</div>
                              <div className="flex gap-2">
                                <span className={`badge badge-xs ${result.details.has_rule ? 'badge-info' : 'badge-ghost'}`}>
                                  {result.details.has_rule ? '规则已配置' : '无规则'}
                                </span>
                                <span className={`badge badge-xs ${result.details.has_base ? 'badge-info' : 'badge-ghost'}`}>
                                  {result.details.has_base ? '基数已设置' : '无基数'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : result.details ? (
                        <details className="cursor-pointer">
                          <summary className="text-sm">查看详情</summary>
                          <pre className="text-xs mt-2 p-2 bg-base-200 rounded overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      ) : result.itemsInserted !== undefined ? (
                        <span className="text-sm">插入 {result.itemsInserted} 条记录</span>
                      ) : '-'}
                    </td>
                    <td>
                      {/* 所有类别适用情况列 - 按root类别分组 */}
                      {result.category_applicability ? (
                        <div className="space-y-1">
                          {(() => {
                            // 使用hook返回的root类别信息进行分组
                            const rootCategories: Record<string, boolean> = {}; // 根类别及其适用性
                            const childCategories: Record<string, Array<[string, boolean]>> = {}; // 根类别下的子类别
                            
                            Object.entries(result.category_applicability).forEach(([categoryName, isApplicable]) => {
                              const rootCategory = result.category_root_info?.[categoryName];
                              
                              if (!rootCategory) {
                                // 没有root_category说明这是根类别本身
                                rootCategories[categoryName] = isApplicable;
                              } else {
                                // 有root_category说明这是子类别
                                if (!childCategories[rootCategory]) {
                                  childCategories[rootCategory] = [];
                                }
                                childCategories[rootCategory].push([categoryName, isApplicable]);
                              }
                            });
                            
                            // 按根类别名称排序
                            const sortedRootCategories = Object.keys(rootCategories).sort();
                            
                            return sortedRootCategories.map((rootName, index) => {
                              const rootIsApplicable = rootCategories[rootName];
                              const children = childCategories[rootName] || [];
                              
                              return (
                                <>
                                  {/* 在非第一个分组前添加空行 */}
                                  {index > 0 && (
                                    <div key={`spacer-${index}`} className="h-2"></div>
                                  )}
                                  
                                  <div key={rootName} className="flex items-start gap-2">
                                    <span className="text-xs font-medium text-base-content/60 min-w-[3rem] pt-0.5">
                                      {rootName}:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {/* 只显示子类别，不显示根类别本身 */}
                                      {children.length > 0 ? (
                                        children
                                          .sort((a, b) => a[0].localeCompare(b[0]))
                                          .map(([categoryName, isApplicable]) => (
                                          <span 
                                            key={categoryName}
                                            className={`badge badge-xs ${isApplicable ? 'badge-success' : 'badge-ghost'} whitespace-nowrap`}
                                            title={`${categoryName}: ${isApplicable ? '适用' : '不适用'}`}
                                          >
                                            {categoryName}{isApplicable ? '✓' : '✗'}
                                          </span>
                                        ))
                                      ) : (
                                        /* 如果没有子类别，显示根类别本身的适用情况 */
                                        <span 
                                          className={`badge badge-xs ${rootIsApplicable ? 'badge-success' : 'badge-ghost'} whitespace-nowrap`}
                                          title={`${rootName}: ${rootIsApplicable ? '适用' : '不适用'}`}
                                        >
                                          {rootIsApplicable ? '适用' : '不适用'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </>
                              );
                            });
                          })()}
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      {/* 备注列 - 显示错误信息或其他消息 */}
                      {result.errorMessage || result.message || 
                       (result.errors && result.errors.length > 0 ? result.errors.join(', ') : '-')}
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
        <p>选中员工ID: {selectedEmployee}</p>
        <p>选中期间ID: {selectedPeriod}</p>
        <p>员工数量: {employees.length}</p>
        <p>期间数量: {periods.length}</p>
      </div>
      </>
      )}
    </div>
  );
};

export default InsuranceCalculationTest;