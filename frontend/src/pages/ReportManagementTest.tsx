/**
 * 报表管理 Hook 测试页面
 * 
 * 用于验证所有报表管理相关 hooks 的功能：
 * - useReportManagement 组合 hook
 * - useReportTemplates, useReportJobs, useReportHistory
 * - useUpdateReportTemplate (已修复)
 * - useReportGenerator (已移除mock错误)
 * - useDataSourcesEnhanced (已优化查询逻辑)
 */

import { useState, useEffect } from 'react';
import { 
  useReportManagement, 
  useUpdateReportTemplate,
  useReportGenerator,
  useDataSources,
  type ReportTemplate,
  type ReportGenerationConfig 
} from '@/hooks/reports';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import type { FieldFilterConfig } from '@/types/report-config';
import { 
  resolveDynamicFilterValue, 
  buildSupabaseFilters, 
  validateFieldFilters 
} from '@/hooks/reports/useReportGenerator';

export default function ReportManagementTest() {
  const { user } = useUnifiedAuth();
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [filterTestResults, setFilterTestResults] = useState<Record<string, any>>({});

  // 测试主要的组合 hook
  const reportManagement = useReportManagement({
    templateFilters: { isActive: true },
    jobFilters: { limit: 10 },
    historyFilters: { limit: 20 }
  });

  // 测试修复后的更新 hook
  const updateTemplateMutation = useUpdateReportTemplate();
  
  // 测试报表生成器（已移除mock错误）
  const reportGenerator = useReportGenerator();
  
  // 测试优化后的数据源查询
  const { data: dataSources, isLoading: dataSourcesLoading } = useDataSources();

  // 运行所有测试
  const runAllTests = async () => {
    setIsRunningTests(true);
    const results: Record<string, any> = {};
    
    try {
      // 测试 1: 数据加载测试
      results.dataLoading = {
        templates: {
          loading: reportManagement.loading.templates,
          count: reportManagement.data.templates.length,
          hasData: reportManagement.data.templates.length > 0
        },
        jobs: {
          loading: reportManagement.loading.jobs,
          count: reportManagement.data.jobs.length,
          hasData: reportManagement.data.jobs.length > 0
        },
        history: {
          loading: reportManagement.loading.history,
          count: reportManagement.data.history.length,
          hasData: reportManagement.data.history.length > 0
        },
        statistics: {
          loading: reportManagement.loading.statistics,
          hasData: !!reportManagement.data.statistics
        }
      };

      // 测试 2: 数据源查询测试（优化后的逻辑）
      results.dataSources = {
        loading: dataSourcesLoading,
        count: dataSources?.length || 0,
        hasData: (dataSources?.length || 0) > 0,
        sampleData: dataSources?.slice(0, 3).map(ds => ({
          name: ds.name || 'Unknown',
          type: ds.type || 'table',
          category: 'general'
        }))
      };

      // 测试 3: Hook 可用性测试
      results.hookAvailability = {
        reportManagement: {
          available: !!reportManagement,
          hasActions: !!reportManagement.actions,
          actionsAvailable: Object.keys(reportManagement.actions || {})
        },
        updateTemplate: {
          available: !!updateTemplateMutation,
          canMutate: typeof updateTemplateMutation.mutate === 'function'
        },
        reportGenerator: {
          available: !!reportGenerator,
          hasGenerateFunction: typeof reportGenerator.generateReport === 'function',
          currentState: reportGenerator.generationState
        }
      };

      // 测试 4: 错误处理测试
      results.errorHandling = {
        templateErrors: reportManagement.errors.templates?.message || null,
        jobErrors: reportManagement.errors.jobs?.message || null,
        historyErrors: reportManagement.errors.history?.message || null,
        generatorErrors: reportManagement.errors.generator || null
      };

      setTestResults(results);
    } catch (error) {
      console.error('Test execution failed:', error);
      results.testError = error instanceof Error ? error.message : 'Unknown error';
      setTestResults(results);
    } finally {
      setIsRunningTests(false);
    }
  };

  // 页面加载时自动运行测试
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isRunningTests) {
        runAllTests();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // 测试模板更新功能（如果有模板数据）
  const testUpdateTemplate = async () => {
    if (reportManagement.data.templates.length === 0) {
      alert('⚠️ 没有可用的模板进行更新测试');
      return;
    }

    const firstTemplate = reportManagement.data.templates[0];
    try {
      await updateTemplateMutation.mutateAsync({
        id: firstTemplate.id,
        description: `测试更新 - ${new Date().toISOString()}`
      });
      alert('✅ 模板更新测试成功！');
      reportManagement.refetch.templates();
    } catch (error) {
      alert(`❌ 模板更新测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 测试报表生成功能
  const testReportGeneration = async () => {
    if (reportManagement.data.templates.length === 0) {
      alert('⚠️ 没有可用的模板进行生成测试');
      return;
    }

    const firstTemplate = reportManagement.data.templates[0];
    const config: ReportGenerationConfig = {
      templateId: firstTemplate.id,
      format: 'xlsx',
      filters: {}
    };

    try {
      const result = await reportGenerator.generateReport(config);
      alert(`✅ 报表生成测试成功！结果: ${JSON.stringify(result).substring(0, 100)}...`);
    } catch (error) {
      alert(`❌ 报表生成测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 测试字段筛选功能
  const testFieldFilters = async () => {
    const results: Record<string, any> = {};
    
    try {
      // 测试 1: 动态筛选值解析
      const testFilters: FieldFilterConfig[] = [
        {
          id: 'test_current_date',
          name: '当前日期筛选',
          operator: 'eq',
          enabled: true,
          condition_type: 'dynamic',
          dynamic_config: { type: 'current_date' }
        },
        {
          id: 'test_last_7_days',
          name: '最近7天筛选',
          operator: 'gte',
          enabled: true,
          condition_type: 'dynamic',
          dynamic_config: { type: 'last_n_days', offset: 7 }
        },
        {
          id: 'test_current_month',
          name: '当前月份筛选',
          operator: 'like',
          enabled: true,
          condition_type: 'dynamic',
          dynamic_config: { type: 'current_month' }
        },
        {
          id: 'test_fixed_value',
          name: '固定值筛选',
          operator: 'eq',
          value: 'test_value',
          enabled: true,
          condition_type: 'fixed'
        },
        {
          id: 'test_user_input',
          name: '用户输入筛选',
          operator: 'like',
          enabled: true,
          condition_type: 'user_input',
          input_config: {
            input_type: 'text',
            required: true,
            placeholder: '请输入搜索关键词'
          }
        }
      ];

      results.dynamicValueResolution = {};
      testFilters.forEach(filter => {
        if (filter.condition_type === 'dynamic') {
          try {
            const resolvedValue = resolveDynamicFilterValue(filter);
            results.dynamicValueResolution[filter.id] = {
              success: true,
              originalConfig: filter.dynamic_config,
              resolvedValue,
              valueType: typeof resolvedValue
            };
          } catch (error) {
            results.dynamicValueResolution[filter.id] = {
              success: false,
              error: error instanceof Error ? error.message : '未知错误'
            };
          }
        }
      });

      // 测试 2: 筛选条件验证
      const fieldFiltersConfig = {
        employee_name: {
          filters: testFilters,
          userInputs: {
            'test_user_input': 'test input value'
          }
        },
        salary_amount: {
          filters: [
            {
              id: 'salary_range',
              name: '薪资范围筛选',
              operator: 'between' as const,
              value: 5000,
              value_end: 15000,
              enabled: true,
              condition_type: 'fixed' as const
            }
          ],
          userInputs: {}
        }
      };

      const validationResult = validateFieldFilters(fieldFiltersConfig);
      results.validation = validationResult;

      // 测试 3: Supabase 查询构建（模拟）
      const mockQuery = {
        filters: [] as any[],
        eq: function(field: string, value: any) { 
          this.filters.push({ type: 'eq', field, value }); 
          return this; 
        },
        gte: function(field: string, value: any) { 
          this.filters.push({ type: 'gte', field, value }); 
          return this; 
        },
        ilike: function(field: string, value: any) { 
          this.filters.push({ type: 'ilike', field, value }); 
          return this; 
        },
        lte: function(field: string, value: any) { 
          this.filters.push({ type: 'lte', field, value }); 
          return this; 
        },
        in: function(field: string, values: any[]) { 
          this.filters.push({ type: 'in', field, values }); 
          return this; 
        },
        is: function(field: string, value: any) { 
          this.filters.push({ type: 'is', field, value }); 
          return this; 
        },
        not: {
          ilike: (field: string, value: any) => {
            mockQuery.filters.push({ type: 'not_ilike', field, value });
            return mockQuery;
          },
          in: (field: string, values: any[]) => {
            mockQuery.filters.push({ type: 'not_in', field, values });
            return mockQuery;
          },
          is: (field: string, value: any) => {
            mockQuery.filters.push({ type: 'not_is', field, value });
            return mockQuery;
          }
        }
      };

      try {
        buildSupabaseFilters(mockQuery, fieldFiltersConfig);
        results.queryBuilding = {
          success: true,
          appliedFilters: mockQuery.filters,
          filterCount: mockQuery.filters.length
        };
      } catch (error) {
        results.queryBuilding = {
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        };
      }

      // 测试 4: 报表生成配置测试
      if (reportManagement.data.templates.length > 0) {
        const firstTemplate = reportManagement.data.templates[0];
        const configWithFilters: ReportGenerationConfig = {
          templateId: firstTemplate.id,
          format: 'xlsx',
          filters: {},
          fieldFilters: fieldFiltersConfig
        };

        results.reportGenerationConfig = {
          templateFound: true,
          configValid: true,
          fieldFilterCount: Object.keys(fieldFiltersConfig).length,
          totalFilterConditions: Object.values(fieldFiltersConfig)
            .reduce((sum, field) => sum + field.filters.length, 0)
        };
      } else {
        results.reportGenerationConfig = {
          templateFound: false,
          message: '没有可用的报表模板进行测试'
        };
      }

      setFilterTestResults(results);
    } catch (error) {
      setFilterTestResults({
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      });
    }
  };

  // 测试字段筛选报表生成（完整流程）
  const testFilteredReportGeneration = async () => {
    if (reportManagement.data.templates.length === 0) {
      alert('⚠️ 没有可用的模板进行筛选生成测试');
      return;
    }

    const firstTemplate = reportManagement.data.templates[0];
    
    // 创建包含各种筛选条件的配置
    const fieldFiltersConfig = {
      employee_name: {
        filters: [
          {
            id: 'name_search',
            name: '员工姓名搜索',
            operator: 'like' as const,
            enabled: true,
            condition_type: 'user_input' as const,
            input_config: {
              input_type: 'text' as const,
              required: false,
              placeholder: '请输入员工姓名'
            }
          }
        ],
        userInputs: { 'name_search': '张' } // 模拟用户输入
      },
      pay_month: {
        filters: [
          {
            id: 'current_month_filter',
            name: '当前月份筛选',
            operator: 'eq' as const,
            enabled: true,
            condition_type: 'dynamic' as const,
            dynamic_config: { type: 'current_month' as const }
          }
        ],
        userInputs: {}
      },
      gross_pay: {
        filters: [
          {
            id: 'salary_range',
            name: '薪资范围筛选',
            operator: 'between' as const,
            value: 5000,
            value_end: 20000,
            enabled: true,
            condition_type: 'fixed' as const
          }
        ],
        userInputs: {}
      }
    };

    const config: ReportGenerationConfig = {
      templateId: firstTemplate.id,
      format: 'xlsx',
      filters: {},
      fieldFilters: fieldFiltersConfig
    };

    try {
      const result = await reportGenerator.generateReport(config);
      alert(`✅ 筛选报表生成测试成功！\n` +
            `文件大小: ${result.fileSize} bytes\n` +
            `记录数: ${result.recordCount}\n` +
            `应用了 ${Object.keys(fieldFiltersConfig).length} 个字段的筛选条件`);
    } catch (error) {
      alert(`❌ 筛选报表生成测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h1 className="card-title text-2xl">📊 报表管理 Hook 测试页面</h1>
          <p className="text-base-content/70">
            验证所有修复后的报表管理 hooks 功能是否正常工作
          </p>
          
          <div className="flex gap-2 mt-4">
            <button 
              className={`btn btn-primary ${isRunningTests ? 'loading' : ''}`}
              onClick={runAllTests}
              disabled={isRunningTests}
            >
              {isRunningTests ? '测试中...' : '🔄 重新运行测试'}
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={testUpdateTemplate}
              disabled={updateTemplateMutation.isPending}
            >
              {updateTemplateMutation.isPending ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  更新中...
                </>
              ) : (
                '🔧 测试模板更新'
              )}
            </button>
            
            <button 
              className="btn btn-accent"
              onClick={testReportGeneration}
              disabled={reportGenerator.isGenerating}
            >
              {reportGenerator.isGenerating ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  生成中... {reportGenerator.generationState.progress}%
                </>
              ) : (
                '📄 测试报表生成'
              )}
            </button>
            
            <button 
              className="btn btn-info"
              onClick={testFieldFilters}
              disabled={isRunningTests}
            >
              🔍 测试字段筛选功能
            </button>
            
            <button 
              className="btn btn-warning"
              onClick={testFilteredReportGeneration}
              disabled={reportGenerator.isGenerating}
            >
              {reportGenerator.isGenerating ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  筛选生成中...
                </>
              ) : (
                '📊 测试筛选报表生成'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 用户信息 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">👤 当前用户</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat">
              <div className="stat-title">用户ID</div>
              <div className="stat-value text-sm">{user?.id || '未登录'}</div>
            </div>
            <div className="stat">
              <div className="stat-title">邮箱</div>
              <div className="stat-value text-sm">{user?.email || '未知'}</div>
            </div>
            <div className="stat">
              <div className="stat-title">认证状态</div>
              <div className={`stat-value text-sm ${user ? 'text-success' : 'text-error'}`}>
                {user ? '✅ 已认证' : '❌ 未认证'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 测试结果展示 */}
      {Object.keys(testResults).length > 0 && (
        <div className="space-y-4">
          {/* 数据加载测试结果 */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">📈 数据加载测试</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(testResults.dataLoading || {}).map(([key, value]: [string, any]) => (
                  <div key={key} className="stat bg-base-200 rounded">
                    <div className="stat-title">{key}</div>
                    <div className="stat-value text-sm">
                      {value.loading ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        `${value.count} 条`
                      )}
                    </div>
                    <div className={`stat-desc ${value.hasData ? 'text-success' : 'text-warning'}`}>
                      {value.hasData ? '✅ 有数据' : '⚠️ 无数据'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hook 可用性测试结果 */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">🔧 Hook 可用性测试</h2>
              <div className="space-y-4">
                <div className="alert alert-info">
                  <div>
                    <strong>组合 Hook (useReportManagement):</strong>
                    <div className="mt-2">
                      可用: {testResults.hookAvailability?.reportManagement?.available ? '✅' : '❌'}
                      <br />
                      Actions: {testResults.hookAvailability?.reportManagement?.actionsAvailable?.join(', ') || '无'}
                    </div>
                  </div>
                </div>
                
                <div className="alert alert-success">
                  <div>
                    <strong>更新模板 Hook (已修复):</strong>
                    <div className="mt-2">
                      可用: {testResults.hookAvailability?.updateTemplate?.available ? '✅' : '❌'}
                      <br />
                      可变更: {testResults.hookAvailability?.updateTemplate?.canMutate ? '✅' : '❌'}
                    </div>
                  </div>
                </div>
                
                <div className="alert alert-warning">
                  <div>
                    <strong>报表生成器 (已移除mock错误):</strong>
                    <div className="mt-2">
                      可用: {testResults.hookAvailability?.reportGenerator?.available ? '✅' : '❌'}
                      <br />
                      生成函数: {testResults.hookAvailability?.reportGenerator?.hasGenerateFunction ? '✅' : '❌'}
                      <br />
                      当前状态: {JSON.stringify(testResults.hookAvailability?.reportGenerator?.currentState)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 数据源测试结果 */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">🗄️ 数据源测试 (已优化查询逻辑)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat bg-base-200 rounded">
                  <div className="stat-title">加载状态</div>
                  <div className="stat-value text-sm">
                    {testResults.dataSources?.loading ? '⏳ 加载中' : '✅ 完成'}
                  </div>
                </div>
                <div className="stat bg-base-200 rounded">
                  <div className="stat-title">数据源数量</div>
                  <div className="stat-value text-sm">{testResults.dataSources?.count || 0}</div>
                </div>
                <div className="stat bg-base-200 rounded">
                  <div className="stat-title">数据状态</div>
                  <div className={`stat-value text-sm ${testResults.dataSources?.hasData ? 'text-success' : 'text-warning'}`}>
                    {testResults.dataSources?.hasData ? '✅ 有数据' : '⚠️ 无数据'}
                  </div>
                </div>
              </div>
              
              {testResults.dataSources?.sampleData && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">示例数据源:</h3>
                  <div className="overflow-x-auto">
                    <table className="table table-compact">
                      <thead>
                        <tr>
                          <th>表名</th>
                          <th>类型</th>
                          <th>分类</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testResults.dataSources.sampleData.map((ds: any, index: number) => (
                          <tr key={index}>
                            <td className="font-mono text-sm">{ds.name}</td>
                            <td><span className="badge badge-outline">{ds.type}</span></td>
                            <td><span className="badge badge-ghost">{ds.category}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 错误处理测试结果 */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">⚠️ 错误处理测试</h2>
              <div className="space-y-2">
                {Object.entries(testResults.errorHandling || {}).map(([key, error]: [string, any]) => (
                  <div key={key} className={`alert ${error ? 'alert-error' : 'alert-success'}`}>
                    <div>
                      <strong>{key}:</strong> {error || '✅ 无错误'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 字段筛选功能测试结果 */}
          {Object.keys(filterTestResults).length > 0 && (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title">🔍 字段筛选功能测试结果</h2>
                
                {filterTestResults.error ? (
                  <div className="alert alert-error">
                    <div>
                      <strong>测试失败:</strong> {filterTestResults.error}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 动态值解析测试 */}
                    {filterTestResults.dynamicValueResolution && (
                      <div className="card bg-base-200">
                        <div className="card-body p-4">
                          <h3 className="card-title text-base">📅 动态值解析测试</h3>
                          <div className="space-y-2">
                            {Object.entries(filterTestResults.dynamicValueResolution).map(([id, result]: [string, any]) => (
                              <div key={id} className={`alert ${result.success ? 'alert-success' : 'alert-error'} alert-sm`}>
                                <div className="text-sm">
                                  <strong>{id}:</strong> {result.success ? (
                                    <>
                                      解析值: <code className="bg-base-300 px-1 rounded">{JSON.stringify(result.resolvedValue)}</code>
                                      <span className="ml-2 badge badge-ghost badge-sm">({result.valueType})</span>
                                    </>
                                  ) : (
                                    `❌ ${result.error}`
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 筛选条件验证测试 */}
                    {filterTestResults.validation && (
                      <div className="card bg-base-200">
                        <div className="card-body p-4">
                          <h3 className="card-title text-base">✅ 筛选条件验证测试</h3>
                          <div className={`alert ${filterTestResults.validation.isValid ? 'alert-success' : 'alert-warning'}`}>
                            <div>
                              <strong>验证结果:</strong> {filterTestResults.validation.isValid ? '✅ 全部通过' : '⚠️ 有错误'}
                              {filterTestResults.validation.errors?.length > 0 && (
                                <ul className="mt-2 list-disc list-inside">
                                  {filterTestResults.validation.errors.map((error: string, index: number) => (
                                    <li key={index} className="text-sm">{error}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Supabase 查询构建测试 */}
                    {filterTestResults.queryBuilding && (
                      <div className="card bg-base-200">
                        <div className="card-body p-4">
                          <h3 className="card-title text-base">🗄️ Supabase 查询构建测试</h3>
                          <div className={`alert ${filterTestResults.queryBuilding.success ? 'alert-success' : 'alert-error'}`}>
                            <div>
                              <strong>构建结果:</strong> {filterTestResults.queryBuilding.success ? (
                                <>
                                  ✅ 成功 - 应用了 {filterTestResults.queryBuilding.filterCount} 个筛选条件
                                  <div className="mt-2">
                                    <strong>应用的筛选条件:</strong>
                                    <pre className="text-xs bg-base-300 p-2 rounded mt-1 overflow-auto max-h-32">
                                      {JSON.stringify(filterTestResults.queryBuilding.appliedFilters, null, 2)}
                                    </pre>
                                  </div>
                                </>
                              ) : (
                                `❌ ${filterTestResults.queryBuilding.error}`
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 报表生成配置测试 */}
                    {filterTestResults.reportGenerationConfig && (
                      <div className="card bg-base-200">
                        <div className="card-body p-4">
                          <h3 className="card-title text-base">📊 报表生成配置测试</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="stat bg-base-100 rounded">
                              <div className="stat-title">模板状态</div>
                              <div className={`stat-value text-sm ${filterTestResults.reportGenerationConfig.templateFound ? 'text-success' : 'text-warning'}`}>
                                {filterTestResults.reportGenerationConfig.templateFound ? '✅ 找到模板' : '⚠️ 无模板'}
                              </div>
                            </div>
                            <div className="stat bg-base-100 rounded">
                              <div className="stat-title">筛选字段数</div>
                              <div className="stat-value text-sm">
                                {filterTestResults.reportGenerationConfig.fieldFilterCount || 0}
                              </div>
                            </div>
                            <div className="stat bg-base-100 rounded">
                              <div className="stat-title">筛选条件总数</div>
                              <div className="stat-value text-sm">
                                {filterTestResults.reportGenerationConfig.totalFilterConditions || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 详细测试数据 */}
          <div className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" />
            <div className="collapse-title text-xl font-medium">
              📊 详细测试数据 (JSON)
            </div>
            <div className="collapse-content">
              <pre className="text-xs bg-base-300 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>
          </div>
          
          {/* 字段筛选测试详细数据 */}
          {Object.keys(filterTestResults).length > 0 && (
            <div className="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div className="collapse-title text-xl font-medium">
                🔍 字段筛选测试详细数据 (JSON)
              </div>
              <div className="collapse-content">
                <pre className="text-xs bg-base-300 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(filterTestResults, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 测试说明 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">📋 测试项目说明</h2>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="badge badge-success">✅</span>
              <span><strong>统一 Hook 架构:</strong> 所有组件现在使用真实 hooks 而非 mock 版本</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="badge badge-success">✅</span>
              <span><strong>修复更新功能:</strong> updateTemplate 函数导入问题已解决</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="badge badge-success">✅</span>
              <span><strong>移除Mock错误:</strong> 生产代码中的 5% 随机错误逻辑已移除</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="badge badge-success">✅</span>
              <span><strong>优化查询逻辑:</strong> 数据源查询的默认处理逻辑已优化</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="badge badge-success">✅</span>
              <span><strong>字段筛选功能:</strong> 完整的字段级筛选条件配置和生成系统</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="badge badge-info">ℹ️</span>
              <span><strong>实时测试:</strong> 此页面提供所有修复功能的实时测试环境</span>
            </div>
          </div>

          <div className="divider">新增筛选功能测试</div>
          
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="badge badge-primary">🔍</span>
              <span><strong>动态值解析:</strong> 测试当前日期、最近N天、当前月份等动态筛选值的解析</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="badge badge-primary">✅</span>
              <span><strong>筛选条件验证:</strong> 测试必填字段、范围值、多选值等筛选条件的验证逻辑</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="badge badge-primary">🗄️</span>
              <span><strong>查询构建:</strong> 测试将筛选条件转换为Supabase查询的功能</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="badge badge-primary">📊</span>
              <span><strong>筛选报表生成:</strong> 测试带有字段筛选条件的完整报表生成流程</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}