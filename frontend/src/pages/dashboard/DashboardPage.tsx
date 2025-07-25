import { useTranslation } from '@/hooks/useTranslation';

export default function DashboardPage() {
  const { t } = useTranslation(['dashboard', 'common']);

  return (
    <div>
      <h1 className="text-3xl font-serif mb-6">{t('title')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Stats Cards */}
        <div className="stat bg-base-100 shadow">
          <div className="stat-title">{t('stats.totalEmployees')}</div>
          <div className="stat-value text-primary">1,234</div>
          <div className="stat-desc">{t('stats.fromLastMonth', { percent: 12 })}</div>
        </div>

        <div className="stat bg-base-100 shadow">
          <div className="stat-title">{t('stats.departments')}</div>
          <div className="stat-value text-secondary">23</div>
          <div className="stat-desc">{t('stats.newThisMonth', { count: 2 })}</div>
        </div>

        <div className="stat bg-base-100 shadow">
          <div className="stat-title">{t('stats.payrollTotal')}</div>
          <div className="stat-value">¥1.2M</div>
          <div className="stat-desc">{t('stats.nextRunIn', { days: 5 })}</div>
        </div>

        <div className="stat bg-base-100 shadow">
          <div className="stat-title">{t('stats.activePositions')}</div>
          <div className="stat-value">89</div>
          <div className="stat-desc">{t('stats.vacantPositions', { count: 3 })}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">{t('recentActivities.title')}</h2>
            <div className="space-y-2">
              <p className="text-sm">{t('recentActivities.newEmployee', { name: 'Zhang Wei' })}</p>
              <p className="text-sm">{t('recentActivities.payrollCompleted', { month: t('common:months.December') })}</p>
              <p className="text-sm">{t('recentActivities.departmentRestructure', { department: 'Marketing' })}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">{t('quickActions.title')}</h2>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-sm">{t('quickActions.addEmployee')}</button>
              <button className="btn btn-sm">{t('quickActions.runPayroll')}</button>
              <button className="btn btn-sm">{t('quickActions.viewReports')}</button>
              <button className="btn btn-sm">{t('quickActions.settings')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}