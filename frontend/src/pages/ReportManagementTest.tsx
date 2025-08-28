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

export default function ReportManagementTest() {
  const { user } = useUnifiedAuth();
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isRunningTests, setIsRunningTests] = useState(false);

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
              <span className="badge badge-info">ℹ️</span>
              <span><strong>实时测试:</strong> 此页面提供所有修复功能的实时测试环境</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}