import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/core/useUserRole';
import { useTranslation } from '@/hooks/useTranslation';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { ManagementPageLayout } from '@/components/layout/ManagementPageLayout';
import { DashboardModule, HRStatsModule, PayrollStatsModule, TrendsModule, ExportModule } from '@/components/statistics';
import type { StatisticsPageState } from '@/types/statistics-extended';
import { OnboardingButton } from '@/components/onboarding';

/**
 * 统计报表系统主页面
 * 
 * 功能：
 * - 统计模块导航和内容展示
 * - 权限控制和用户角色验证
 * - 全局状态管理（筛选器、布局等）
 * - 响应式布局适配
 */
const StatisticsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userRoleData = useUserRole(user?.email);
  const { role: userRole, permissions, loading: roleLoading } = userRoleData;
  
  // 页面状态管理
  const [pageState, setPageState] = useState<StatisticsPageState>({
    activeModule: 'dashboard',
    loading: false,
    error: null,
    filters: {
      dateRange: {
        start: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString().slice(0, 10),
        end: new Date().toISOString().slice(0, 10),
        preset: 'lastyear'
      },
      departments: [],
      positions: [],
      employeeTypes: ['regular', 'contract'],
      payrollStatus: ['approved', 'paid']
    },
    layout: 'grid',
    sidebarCollapsed: false,
    preferences: {
      defaultDateRange: 'lastyear',
      defaultDepartments: [],
      theme: 'auto',
      chartAnimations: true
    }
  });

  // 页面初始化
  useEffect(() => {
    // 从localStorage恢复用户偏好设置
    const savedPreferences = localStorage.getItem('statistics-preferences');
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        setPageState(prev => ({
          ...prev,
          preferences: { ...prev.preferences, ...preferences }
        }));
      } catch (error) {
        console.warn('Failed to restore statistics preferences:', error);
      }
    }
  }, []);

  // 保存用户偏好设置
  const savePreferences = (preferences: Partial<StatisticsPageState['preferences']>) => {
    const newPreferences = { ...pageState.preferences, ...preferences };
    setPageState(prev => ({
      ...prev,
      preferences: newPreferences
    }));
    localStorage.setItem('statistics-preferences', JSON.stringify(newPreferences));
  };

  // 切换活动模块
  const setActiveModule = (module: StatisticsPageState['activeModule']) => {
    setPageState(prev => ({
      ...prev,
      activeModule: module,
      error: null // 清除错误状态
    }));
  };

  // 更新筛选器
  const updateFilters = (filters: Partial<StatisticsPageState['filters']>) => {
    setPageState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...filters }
    }));
  };

  // 切换布局模式
  const toggleLayout = () => {
    setPageState(prev => ({
      ...prev,
      layout: prev.layout === 'grid' ? 'list' : 'grid'
    }));
  };

  // 切换侧边栏
  const toggleSidebar = () => {
    setPageState(prev => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed
    }));
  };

  // 设置错误状态
  const setError = (error: string | null) => {
    setPageState(prev => ({
      ...prev,
      error
    }));
  };

  // 设置加载状态
  const setLoading = (loading: boolean) => {
    setPageState(prev => ({
      ...prev,
      loading
    }));
  };

  // 权限检查
  const hasStatisticsPermission = (module: string) => {
    if (!permissions) return false;
    
    // 超级管理员拥有所有权限
    if (userRole === 'super_admin' || permissions.includes('*') || permissions.includes('admin.*')) {
      return true;
    }
    
    const modulePermissions = {
      dashboard: ['statistics.view', 'dashboard.view'],
      'hr-stats': ['hr.statistics.view', 'employee.view'],
      'payroll-stats': ['payroll.statistics.view', 'payroll.view'],
      trends: ['statistics.trends.view'],
      export: ['statistics.export', 'data.export']
    };
    
    const requiredPermissions = modulePermissions[module as keyof typeof modulePermissions] || [];
    return requiredPermissions.some(permission => 
      permissions.includes(permission)
    );
  };

  // 加载状态
  if (roleLoading) {
    return <LoadingScreen message={t('common.loading')} />;
  }

  // 页面标题
  const pageTitle = t('statistics.title', '统计报表');

  // 渲染模块导航组件 - 借鉴薪资导入导出页面的DaisyUI标准tabs
  const renderModuleNavigation = () => (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-base-content mb-4 flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 01 2-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <span className="stat-value-gradient">统计分析模块</span>
      </h3>
      
      {/* 使用DaisyUI标准tabs组件 - 充分利用屏幕宽度 */}
      <div className="tabs tabs-bordered w-full">
        <button 
          className={`tab tab-lg ${pageState.activeModule === 'dashboard' ? 'tab-active' : ''}`}
          onClick={() => setActiveModule('dashboard')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 01 2-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          综合概览
        </button>
        
        <button 
          className={`tab tab-lg ${pageState.activeModule === 'hr-stats' ? 'tab-active' : ''} ${!hasStatisticsPermission('hr-stats') ? 'tab-disabled opacity-50' : ''}`}
          onClick={() => hasStatisticsPermission('hr-stats') && setActiveModule('hr-stats')}
          disabled={!hasStatisticsPermission('hr-stats')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          人事统计
        </button>
        
        <button 
          className={`tab tab-lg ${pageState.activeModule === 'payroll-stats' ? 'tab-active' : ''} ${!hasStatisticsPermission('payroll-stats') ? 'tab-disabled opacity-50' : ''}`}
          onClick={() => hasStatisticsPermission('payroll-stats') && setActiveModule('payroll-stats')}
          disabled={!hasStatisticsPermission('payroll-stats')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          薪资统计
        </button>
        
        <button 
          className={`tab tab-lg ${pageState.activeModule === 'trends' ? 'tab-active' : ''} ${!hasStatisticsPermission('trends') ? 'tab-disabled opacity-50' : ''}`}
          onClick={() => hasStatisticsPermission('trends') && setActiveModule('trends')}
          disabled={!hasStatisticsPermission('trends')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          趋势分析
        </button>
        
        <button 
          className={`tab tab-lg ${pageState.activeModule === 'export' ? 'tab-active' : ''} ${!hasStatisticsPermission('export') ? 'tab-disabled opacity-50' : ''}`}
          onClick={() => hasStatisticsPermission('export') && setActiveModule('export')}
          disabled={!hasStatisticsPermission('export')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          数据导出
        </button>
      </div>
    </div>
  );

  // 渲染模块内容 - 使用语义化的tabpanel结构
  const renderModuleContent = () => (
    <div className="min-h-[70vh]">
      {pageState.activeModule === 'dashboard' && (
        <div 
          role="tabpanel" 
          id="tabpanel-dashboard" 
          aria-labelledby="tab-dashboard"
          className="focus:outline-none"
          tabIndex={0}
        >
          <DashboardModule />
        </div>
      )}
      {pageState.activeModule === 'hr-stats' && (
        <div 
          role="tabpanel" 
          id="tabpanel-hr-stats" 
          aria-labelledby="tab-hr-stats"
          className="focus:outline-none"
          tabIndex={0}
        >
          <HRStatsModule />
        </div>
      )}
      {pageState.activeModule === 'payroll-stats' && (
        <div 
          role="tabpanel" 
          id="tabpanel-payroll-stats" 
          aria-labelledby="tab-payroll-stats"
          className="focus:outline-none"
          tabIndex={0}
        >
          <PayrollStatsModule />
        </div>
      )}
      {pageState.activeModule === 'trends' && (
        <div 
          role="tabpanel" 
          id="tabpanel-trends" 
          aria-labelledby="tab-trends"
          className="focus:outline-none"
          tabIndex={0}
        >
          <TrendsModule />
        </div>
      )}
      {pageState.activeModule === 'export' && (
        <div 
          role="tabpanel" 
          id="tabpanel-export" 
          aria-labelledby="tab-export"
          className="focus:outline-none"
          tabIndex={0}
        >
          <ExportModule />
        </div>
      )}
    </div>
  );

  // 渲染开发调试信息
  const renderDebugInfo = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="card mt-6 collapse collapse-arrow bg-base-100 shadow-sm border border-base-200">
        <input type="checkbox" /> 
        <div className="collapse-title text-xl font-bold text-accent">
          🔧 开发调试信息
        </div>
        <div className="collapse-content"> 
          <div className="stats stats-vertical lg:stats-horizontal shadow w-full mb-6">
            <div className="stat">
              <div className="stat-figure text-accent">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="stat-title">当前用户</div>
              <div className="stat-value text-accent">{user?.email}</div>
              <div className="stat-desc">
                <span className="badge badge-accent badge-sm">角色: {userRole}</span>
              </div>
            </div>
            <div className="stat">
              <div className="stat-figure text-info">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="stat-title">权限数量</div>
              <div className="stat-value text-info">{permissions?.length || 0}</div>
              <div className="stat-desc">
                <span className="badge badge-info badge-sm">项权限</span>
              </div>
            </div>
          </div>
          <div className="bg-base-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h3 className="font-bold text-lg">模块访问权限</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {['dashboard', 'hr-stats', 'payroll-stats', 'trends', 'export'].map(module => (
                <div 
                  key={module}
                  className={`card card-compact ${
                    hasStatisticsPermission(module) 
                      ? 'bg-success/10 border border-success/30' 
                      : 'bg-neutral/10 border border-neutral/30'
                  } hover:shadow-lg transition-all duration-300`}
                >
                  <div className="card-body items-center text-center">
                    <div className={`badge ${
                      hasStatisticsPermission(module) ? 'badge-success' : 'badge-neutral'
                    } badge-sm mb-1`}>
                      {hasStatisticsPermission(module) ? '✓' : '✗'}
                    </div>
                    <span className="text-xs font-medium">{module}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PermissionGuard 
      permissions={['statistics.view']} 
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('common.accessDenied', '访问被拒绝')}
            </h2>
            <p className="text-gray-600">
              {t('statistics.noPermission', '您没有访问统计报表的权限')}
            </p>
          </div>
        </div>
      }
    >
      {/* 简化布局：借鉴薪资导入导出页面的布局方式 */}
      <div className="container mx-auto p-6 max-w-none">
        {/* 页面标题 */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">{pageTitle}</h1>
              <p className="text-base-content/60">政府部门人事和薪资统计分析</p>
            </div>
            <OnboardingButton />
          </div>
        </div>
        
        <div className="divider"></div>
        
        <div className="space-y-6">
          {/* 模块导航 */}
          {renderModuleNavigation()}
          
          {/* 模块内容 */}
          {renderModuleContent()}
          
          {/* 开发调试信息 */}
          {renderDebugInfo()}
        </div>
      </div>
      
    </PermissionGuard>
  );
};

export default StatisticsPage;