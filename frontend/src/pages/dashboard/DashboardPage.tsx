import { useTranslation } from '@/hooks/useTranslation';

export default function DashboardPage() {
  const { t } = useTranslation(['dashboard', 'common']);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-base-content">{t('dashboard:title')}</h1>
      
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        {/* Stats Cards */}
        <div className="stat">
          <div className="stat-title">{t('dashboard:stats.totalEmployees')}</div>
          <div className="stat-value text-primary">1,234</div>
          <div className="stat-desc">{t('dashboard:stats.fromLastMonth', { percent: 12 })}</div>
        </div>

        <div className="stat">
          <div className="stat-title">{t('dashboard:stats.departments')}</div>
          <div className="stat-value text-secondary">23</div>
          <div className="stat-desc">{t('dashboard:stats.newThisMonth', { count: 2 })}</div>
        </div>

        <div className="stat">
          <div className="stat-title">{t('dashboard:stats.payrollTotal')}</div>
          <div className="stat-value">¥1.2M</div>
          <div className="stat-desc">{t('dashboard:stats.nextRunIn', { days: 5 })}</div>
        </div>

        <div className="stat">
          <div className="stat-title">{t('dashboard:stats.activePositions')}</div>
          <div className="stat-value">89</div>
          <div className="stat-desc">{t('dashboard:stats.vacantPositions', { count: 3 })}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">{t('dashboard:recentActivities.title')}</h2>
            <div className="space-y-2">
              <p>{t('dashboard:recentActivities.newEmployee', { name: 'Zhang Wei' })}</p>
              <p>{t('dashboard:recentActivities.payrollCompleted', { month: t('common:months.December') })}</p>
              <p>{t('dashboard:recentActivities.departmentRestructure', { department: 'Marketing' })}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">{t('dashboard:quickActions.title')}</h2>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-sm">{t('dashboard:quickActions.addEmployee')}</button>
              <button className="btn btn-sm">{t('dashboard:quickActions.runPayroll')}</button>
              <button className="btn btn-sm">{t('dashboard:quickActions.viewReports')}</button>
              <button className="btn btn-sm">{t('dashboard:quickActions.settings')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}