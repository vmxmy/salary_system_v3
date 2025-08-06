import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { dashboardService, type DashboardStats, type RecentActivity } from '@/services/dashboard.service';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function DashboardPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsData, activitiesData] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getRecentActivities(),
      ]);
      
      setStats(statsData);
      setRecentActivities(activitiesData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'yyyy年MM月dd日', { locale: zhCN });
    } catch {
      return '-';
    }
  };

  const formatActivityDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return '今天';
      if (diffDays === 1) return '昨天';
      if (diffDays < 7) return `${diffDays}天前`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
      
      return format(date, 'MM月dd日', { locale: zhCN });
    } catch {
      return dateStr;
    }
  };

  const getActivityMessage = (activity: RecentActivity) => {
    switch (activity.activityType) {
      case 'new_employee':
        return `新员工 ${activity.entityName} 入职 (${activity.additionalInfo})`;
      case 'payroll_completed':
        return `${activity.entityName} 薪资发放完成 (${activity.additionalInfo})`;
      case 'department_created':
        return `创建新部门 ${activity.entityName}`;
      default:
        return activity.entityName;
    }
  };

  if (loading) {
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
        <span>{error}</span>
        <button className="btn btn-sm" onClick={fetchDashboardData}>重试</button>
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
            在职 {stats?.activeEmployees || 0} / 离职 {stats?.terminatedEmployees || 0}
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">{t('dashboard:stats.departments')}</div>
          <div className="stat-value text-secondary">{stats?.totalDepartments || 0}</div>
          <div className="stat-desc">
            本月新增 {stats?.newDepartmentsThisMonth || 0} 个
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">{t('dashboard:stats.payrollTotal')}</div>
          <div className="stat-value">{formatCurrency(stats?.lastPayrollTotal || 0)}</div>
          <div className="stat-desc">
            {stats?.daysUntilNextPayroll ? `${stats.daysUntilNextPayroll} 天后发薪` : '待定'}
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">{t('dashboard:stats.activePositions')}</div>
          <div className="stat-value">{stats?.totalPositions || 0}</div>
          <div className="stat-desc">
            本月新入职 {stats?.newEmployeesThisMonth || 0} 人
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">{t('dashboard:recentActivities.title')}</h2>
            <div className="space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="badge badge-ghost badge-sm mt-1">
                      {formatActivityDate(activity.activityDate)}
                    </div>
                    <p className="text-sm flex-1">{getActivityMessage(activity)}</p>
                  </div>
                ))
              ) : (
                <p className="text-base-content/60">暂无最近活动</p>
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
          <h2 className="card-title">薪资发放信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-base-content/60">上次发薪日期</p>
              <p className="text-lg font-semibold">{formatDate(stats?.lastPayrollDate)}</p>
            </div>
            <div>
              <p className="text-sm text-base-content/60">上次发薪人数</p>
              <p className="text-lg font-semibold">{stats?.lastPayrollEmployeeCount || 0} 人</p>
            </div>
            <div>
              <p className="text-sm text-base-content/60">下次发薪日期</p>
              <p className="text-lg font-semibold">{formatDate(stats?.nextPayrollDate || null)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}