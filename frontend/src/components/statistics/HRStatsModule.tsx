import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useEmployeeStatistics, useEmployeeTrends } from '@/hooks/employee/useEmployeeStatistics';
import { useDepartments } from '@/hooks/department/useDepartments';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { StatisticsModuleLayout } from './common';

interface HRStatsModuleProps {
  className?: string;
}

/**
 * 人事统计模块
 * 
 * 基于useEmployeeStatistics提供全面的人员分析
 * 严格遵循DaisyUI标准组件和系统响应式设计
 */
export function HRStatsModule({ className = "" }: HRStatsModuleProps) {
  const { t } = useTranslation();
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  
  // 获取数据
  const employeeStats = useEmployeeStatistics({ 
    departmentId: selectedDepartment || undefined 
  });
  const employeeTrends = useEmployeeTrends(12);
  const { departments } = useDepartments();

  // 加载状态 - 现代化设计
  if (employeeStats.isLoading || employeeTrends.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-base-100">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base-content/70 font-medium">加载人事统计数据中...</p>
        </div>
      </div>
    );
  }

  // 错误状态 - 现代化设计
  if (employeeStats.error) {
    return (
      <div className="alert alert-error shadow bg-error/10">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 className="font-bold">数据加载失败</h3>
          <div className="text-xs">加载人事统计数据失败: {employeeStats.error.message}</div>
        </div>
        <button className="btn btn-sm btn-outline transition-transform" onClick={() => employeeStats.refetch()}>重试</button>
      </div>
    );
  }

  const stats = employeeStats.data;
  const trends = employeeTrends.data;

  if (!stats) {
    return (
      <div className="alert alert-warning shadow bg-warning/10">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <h3 className="font-bold">暂无数据</h3>
          <div className="text-xs">人事统计数据将在系统初始化后显示</div>
        </div>
      </div>
    );
  }

  // 部门筛选器组件
  const departmentSelector = (
    <div className="form-control w-full max-w-xs">
      <label className="label">
        <span className="label-text font-medium">筛选部门</span>
      </label>
      <select 
        className="select select-bordered w-full max-w-xs"
        value={selectedDepartment}
        onChange={(e) => setSelectedDepartment(e.target.value)}
      >
        <option value="">全部部门</option>
        {departments?.map((dept: any) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <StatisticsModuleLayout
      title="人事统计分析"
      description="员工结构与组织架构分析"
      actions={departmentSelector}
      className={className}
    >

      {/* 总体概览统计 - 标准DaisyUI stats组件 */}
      <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-100 w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="stat-title">员工总数</div>
          <div className="stat-value text-primary">{stats.total}</div>
          <div className="stat-desc">
            {selectedDepartment ? '当前部门' : '全部员工'}
          </div>
        </div>

        <div className="stat">
          <div className="stat-figure text-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-title">在职人员</div>
          <div className="stat-value text-success">{stats.byStatus.active}</div>
          <div className="stat-desc">
            <span className="badge badge-success badge-sm">
              {stats.total > 0 ? ((stats.byStatus.active / stats.total) * 100).toFixed(1) : 0}%
            </span>
            <span className="ml-1">在职占比</span>
          </div>
        </div>

        <div className="stat">
          <div className="stat-figure text-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="stat-title">离职人员</div>
          <div className="stat-value text-warning">{stats.byStatus.inactive + stats.byStatus.terminated}</div>
          <div className="stat-desc">
            <span className="badge badge-warning badge-sm">
              {trends && trends.turnoverRate.length > 0 ? trends.turnoverRate[trends.turnoverRate.length - 1].value.toFixed(1) : 0}%
            </span>
            <span className="ml-1">流动率</span>
          </div>
        </div>

        <div className="stat">
          <div className="stat-figure text-info">
            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="stat-title">部门数量</div>
          <div className="stat-value text-info">{stats.byDepartment.length}</div>
          <div className="stat-desc">组织架构单位</div>
        </div>
      </div>

      {/* 人员结构分析 - 使用responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 人员类别分布 */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              人员类别分布
            </h2>
            
            <div className="grid grid-cols-1 gap-3 mt-4">
              <div className="flex justify-between items-center p-4 bg-base-200 rounded">
                <span className="font-medium">正编人员</span>
                <div className="flex items-center gap-3">
                  <progress 
                    className="progress progress-primary w-24" 
                    value={stats.byCategory.regular} 
                    max={stats.total}
                  ></progress>
                  <span className="badge badge-primary shadow-lg">{stats.byCategory.regular}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-base-200 rounded">
                <span className="font-medium">聘用人员</span>
                <div className="flex items-center gap-3">
                  <progress 
                    className="progress progress-secondary w-24" 
                    value={stats.byCategory.contract} 
                    max={stats.total}
                  ></progress>
                  <span className="badge badge-secondary shadow-lg">{stats.byCategory.contract}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-base-200 rounded">
                <span className="font-medium">其他人员</span>
                <div className="flex items-center gap-3">
                  <progress 
                    className="progress progress-accent w-24" 
                    value={stats.byCategory.other} 
                    max={stats.total}
                  ></progress>
                  <span className="badge badge-accent shadow-lg">{stats.byCategory.other}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 年龄结构分布 */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              年龄结构分布
            </h2>
            
            <div className="grid grid-cols-1 gap-2 mt-4">
              {Object.entries({
                'under25': { label: '25岁以下', color: 'success' },
                'age25to35': { label: '25-35岁', color: 'info' },
                'age36to45': { label: '36-45岁', color: 'warning' },
                'age46to55': { label: '46-55岁', color: 'error' },
                'above55': { label: '55岁以上', color: 'neutral' }
              }).map(([key, config]) => (
                <div key={key} className="flex justify-between items-center p-2 bg-base-200 rounded">
                  <span className="text-sm">{config.label}</span>
                  <div className="flex items-center gap-2">
                    <progress 
                      className={`progress progress-${config.color} w-16`} 
                      value={stats.byAgeGroup[key as keyof typeof stats.byAgeGroup]} 
                      max={stats.total}
                    ></progress>
                    <span className={`badge badge-${config.color} badge-sm`}>
                      {stats.byAgeGroup[key as keyof typeof stats.byAgeGroup]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 学历结构分布 */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              学历结构分布
            </h2>
            
            <div className="grid grid-cols-1 gap-2 mt-4">
              {Object.entries({
                'doctorate': { label: '博士', color: 'error' },
                'master': { label: '硕士', color: 'warning' },
                'bachelor': { label: '本科', color: 'info' },
                'associate': { label: '专科', color: 'success' },
                'highSchool': { label: '高中及以下', color: 'neutral' }
              }).map(([key, config]) => (
                <div key={key} className="flex justify-between items-center p-2 bg-base-200 rounded">
                  <span className="text-sm">{config.label}</span>
                  <div className="flex items-center gap-2">
                    <progress 
                      className={`progress progress-${config.color} w-16`} 
                      value={stats.byEducation[key as keyof typeof stats.byEducation]} 
                      max={stats.total}
                    ></progress>
                    <span className={`badge badge-${config.color} badge-sm`}>
                      {stats.byEducation[key as keyof typeof stats.byEducation]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 性别分布 */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              性别分布
            </h2>
            
            <div className="grid grid-cols-1 gap-3 mt-4">
              <div className="flex justify-between items-center p-4 bg-base-200 rounded">
                <span className="font-medium">男性</span>
                <div className="flex items-center gap-3">
                  <progress 
                    className="progress progress-info w-24" 
                    value={stats.byGender.male} 
                    max={stats.total}
                  ></progress>
                  <span className="badge badge-info shadow-lg">{stats.byGender.male}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-base-200 rounded">
                <span className="font-medium">女性</span>
                <div className="flex items-center gap-3">
                  <progress 
                    className="progress progress-secondary w-24" 
                    value={stats.byGender.female} 
                    max={stats.total}
                  ></progress>
                  <span className="badge badge-secondary shadow-lg">{stats.byGender.female}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 部门人员分布 */}
      {!selectedDepartment && stats.byDepartment.length > 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              部门人员分布 (前10个部门)
            </h2>
            
            <div className="overflow-x-auto mt-4">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>部门名称</th>
                    <th>人员数量</th>
                    <th>占比</th>
                    <th>可视化</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byDepartment.slice(0, 10).map((dept, index) => (
                    <tr key={dept.departmentId || index}>
                      <td>
                        <div className="font-bold">{dept.departmentName}</div>
                      </td>
                      <td>
                        <span className="badge badge-outline">{dept.count}</span>
                      </td>
                      <td>
                        {((dept.count / stats.total) * 100).toFixed(1)}%
                      </td>
                      <td>
                        <progress 
                          className="progress progress-primary w-24" 
                          value={dept.count} 
                          max={Math.max(...stats.byDepartment.map(d => d.count))}
                        ></progress>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
    </StatisticsModuleLayout>
  );
}

export default HRStatsModule;