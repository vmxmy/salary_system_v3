import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { useReportTemplates, useReportJobs, useReportHistory } from '@/hooks/reports/useReportManagementMock';
import { useReportGenerator } from '@/hooks/reports/useReportGeneratorMock';
import { useAvailablePayrollMonths } from '@/hooks/payroll/useAvailablePayrollMonths';

export default function ReportDebugPanel() {
  const { user, hasAnyPermission, hasAllPermissions } = useUnifiedAuth();
  
  // 数据查询
  const templatesQuery = useReportTemplates({ isActive: true });
  const jobsQuery = useReportJobs({ limit: 10 });
  const historyQuery = useReportHistory({ limit: 20 });
  const monthsQuery = useAvailablePayrollMonths();
  
  // 报表生成器
  const { generationState } = useReportGenerator();

  const debugInfo = {
    auth: {
      authenticated: !!user,
      userId: user?.id,
      hasPayrollPermission: hasAnyPermission(['payroll_management.read']),
      allPermissions: 'Using UnifiedAuth - permissions not exposed directly'
    },
    queries: {
      templates: {
        isLoading: templatesQuery.isLoading,
        isError: templatesQuery.isError,
        error: templatesQuery.error?.message,
        dataCount: templatesQuery.data?.length,
        data: templatesQuery.data
      },
      jobs: {
        isLoading: jobsQuery.isLoading,
        isError: jobsQuery.isError, 
        error: jobsQuery.error?.message,
        dataCount: jobsQuery.data?.length
      },
      history: {
        isLoading: historyQuery.isLoading,
        isError: historyQuery.isError,
        error: historyQuery.error?.message,
        dataCount: historyQuery.data?.length
      },
      months: {
        isLoading: monthsQuery.isLoading,
        isError: monthsQuery.isError,
        error: monthsQuery.error?.message,
        dataCount: monthsQuery.data?.length
      }
    },
    generator: {
      isGenerating: generationState.isGenerating,
      progress: generationState.progress,
      currentStep: generationState.currentStep,
      error: generationState.error
    }
  };

  return (
    <div className="p-6 bg-base-100 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">报表管理页面调试信息</h2>
      
      <div className="space-y-4">
        <div className="card bg-base-200 p-4">
          <h3 className="font-semibold mb-2">认证状态</h3>
          <pre className="text-xs bg-base-300 p-2 rounded overflow-auto">
            {JSON.stringify(debugInfo.auth, null, 2)}
          </pre>
        </div>

        <div className="card bg-base-200 p-4">
          <h3 className="font-semibold mb-2">查询状态</h3>
          <pre className="text-xs bg-base-300 p-2 rounded overflow-auto">
            {JSON.stringify(debugInfo.queries, null, 2)}
          </pre>
        </div>

        <div className="card bg-base-200 p-4">
          <h3 className="font-semibold mb-2">生成器状态</h3>
          <pre className="text-xs bg-base-300 p-2 rounded overflow-auto">
            {JSON.stringify(debugInfo.generator, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mt-4 alert alert-info">
        <div>
          <strong>当前状态:</strong> 
          {templatesQuery.isLoading || jobsQuery.isLoading || historyQuery.isLoading ? 
            ' 正在加载数据...' : ' 数据加载完成'
          }
        </div>
      </div>
    </div>
  );
}