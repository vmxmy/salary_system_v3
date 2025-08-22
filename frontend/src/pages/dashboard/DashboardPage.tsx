import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useDashboard, dashboardFormatters } from '@/hooks/dashboard';
import MonthlyPayrollTrendChart from '@/components/dashboard/MonthlyPayrollTrendChart';
import DepartmentPayrollChart from '@/components/dashboard/DepartmentPayrollChart';
import PayrollStructureChart from '@/components/dashboard/PayrollStructureChart';
import FinancialWarningDashboard from '@/components/dashboard/FinancialWarningDashboard';
// HookTestPanel已移除，测试功能可通过专门的测试页面访问

export default function DashboardPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  
  // 使用新的 useDashboard hook
  const {
    stats,
    activities,
    monthlyTrends,
    derivedData,
    loading,
    error,
    actions,
  } = useDashboard({
    enableRealtime: true,
    refetchInterval: 60000, // 每分钟刷新
  });

  // 使用 hook 提供的格式化工具
  const { currency, date, relativeTime, activityMessage } = dashboardFormatters;

  if (loading.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error m-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{error instanceof Error ? error.message : t('dashboard:error.loadFailed')}</span>
        <button className="btn btn-sm" onClick={actions.refresh}>{t('dashboard:error.retry')}</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-base-content">{t('dashboard:title')}</h1>
      
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-title">{t('dashboard:stats.totalEmployees')}</div>
          <div className="stat-value text-primary">{stats?.totalEmployees || 0}</div>
          <div className="stat-desc">
            {t('dashboard:stats.activeInactive', { 
              active: stats?.activeEmployees || 0, 
              inactive: stats?.terminatedEmployees || 0 
            })}
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">{t('dashboard:stats.departments')}</div>
          <div className="stat-value text-secondary">{stats?.totalDepartments || 0}</div>
          <div className="stat-desc">
            {t('dashboard:stats.newDepartmentsThisMonth', { count: stats?.newDepartmentsThisMonth || 0 })}
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">{t('dashboard:stats.payrollTotal')}</div>
          <div className="stat-value">{currency(stats?.lastPayrollTotal || 0)}</div>
          <div className="stat-desc">
            {stats?.daysUntilNextPayroll ? 
              t('dashboard:stats.daysUntilPayroll', { days: stats.daysUntilNextPayroll }) : 
              t('dashboard:stats.pending')
            }
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">{t('dashboard:stats.activePositions')}</div>
          <div className="stat-value">{stats?.totalPositions || 0}</div>
          <div className="stat-desc">
            {t('dashboard:stats.newEmployeesThisMonth', { count: stats?.newEmployeesThisMonth || 0 })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">{t('dashboard:recentActivities.title')}</h2>
            <div className="space-y-3">
              {activities.length > 0 ? (
                activities.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="badge badge-ghost badge-sm mt-1">
                      {relativeTime(activity.activityDate)}
                    </div>
                    <p className="text-sm flex-1">{activityMessage(activity)}</p>
                  </div>
                ))
              ) : (
                <p className="text-base-content/60">{t('dashboard:activities.noRecentActivities')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">{t('dashboard:quickActions.title')}</h2>
            <div className="grid grid-cols-2 gap-2">
              <button 
                className="btn btn-sm"
                onClick={() => navigate('/employees/new')}
              >
                {t('dashboard:quickActions.addEmployee')}
              </button>
              <button 
                className="btn btn-sm"
                onClick={() => navigate('/payroll/run')}
              >
                {t('dashboard:quickActions.runPayroll')}
              </button>
              <button 
                className="btn btn-sm"
                onClick={() => navigate('/reports')}
              >
                {t('dashboard:quickActions.viewReports')}
              </button>
              <button 
                className="btn btn-sm"
                onClick={() => navigate('/settings')}
              >
                {t('dashboard:quickActions.settings')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">{t('dashboard:payrollInfo.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-base-content/60">{t('dashboard:payrollInfo.lastPayDate')}</p>
              <p className="text-lg font-semibold">{date(stats?.lastPayrollDate || null)}</p>
            </div>
            <div>
              <p className="text-sm text-base-content/60">{t('dashboard:payrollInfo.lastPayCount')}</p>
              <p className="text-lg font-semibold">{stats?.lastPayrollEmployeeCount || 0} {t('dashboard:payrollInfo.people')}</p>
            </div>
            <div>
              <p className="text-sm text-base-content/60">{t('dashboard:payrollInfo.nextPayDate')}</p>
              <p className="text-lg font-semibold">{date(stats?.nextPayrollDate || null)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 财务分析图表区域 */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-base-content">财务分析报表</h2>
          <div className="badge badge-outline">实时数据</div>
        </div>
        
        {/* 第一行：趋势图和预警仪表盘 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <MonthlyPayrollTrendChart height={300} />
          </div>
          <div className="xl:col-span-1">
            <FinancialWarningDashboard />
          </div>
        </div>
        
        {/* 第二行：部门对比和结构分析 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DepartmentPayrollChart height={350} />
          <PayrollStructureChart height={350} />
        </div>
      </div>

      {/* Hook测试面板 - 仅在开发环境显示 */}
      {import.meta.env.DEV && (
        <div className="mt-6">
          {/* HookTestPanel已移除，测试功能移至专门的测试页面 */}
        </div>
      )}
    </div>
  );
}