import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSalaryComponents } from '../../hooks/usePayroll';
import type { SalaryComponentWithDetails } from '../../types/employee_new';

const SalaryComponentListPage = () => {
  const { components, loading, error, refresh } = useSalaryComponents();
  const [searchTerm, setSearchTerm] = useState('');

  // 过滤和搜索
  const filteredComponents = useMemo(() => {
    if (!searchTerm) return components;
    
    const term = searchTerm.toLowerCase();
    return components.filter(component => 
      component.name.toLowerCase().includes(term) ||
      (component.description && component.description.toLowerCase().includes(term))
    );
  }, [components, searchTerm]);

  // 按类型分组
  const groupedComponents = useMemo(() => {
    return filteredComponents.reduce((acc, component) => {
      const type = component.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(component);
      return acc;
    }, {} as Record<string, SalaryComponentWithDetails[]>);
  }, [filteredComponents]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>加载薪资组件失败: {error}</span>
          <div className="flex-none">
            <button className="btn btn-sm" onClick={refresh}>重试</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">薪资组件管理</h1>
          <p className="text-base-content/70 mt-1">管理系统中所有可用的薪资组件</p>
        </div>
        <Link to="/payroll/components/create" className="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建薪资组件
        </Link>
      </div>

      {/* 搜索框 */}
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="搜索薪资组件名称或描述..."
                className="input input-bordered w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline" onClick={() => setSearchTerm('')}>
                清除
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">总组件数</div>
          <div className="stat-value text-primary">{components.length}</div>
        </div>
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">收入项</div>
          <div className="stat-value text-success">
            {components.filter(c => c.type === 'earning').length}
          </div>
        </div>
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">扣除项</div>
          <div className="stat-value text-warning">
            {components.filter(c => c.type === 'deduction').length}
          </div>
        </div>
      </div>

      {/* 薪资组件列表 */}
      {Object.keys(groupedComponents).length === 0 ? (
        <div className="card bg-base-100 shadow">
          <div className="card-body text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-base-content/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-base-content/70 mb-2">暂无薪资组件</h3>
            <p className="text-base-content/50 mb-4">您可以创建第一个薪资组件来开始管理薪资项目</p>
            <Link to="/payroll/components/create" className="btn btn-primary">创建薪资组件</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedComponents).map(([type, components]) => (
            <div key={type} className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title text-lg mb-4">
                  {type === 'earning' ? '收入项' : '扣除项'}
                  <div className="badge badge-lg ml-2">{components.length}</div>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {components.map((component) => (
                    <div key={component.id} className="border border-base-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{component.name}</h3>
                          <p className="text-sm text-base-content/70 mt-1">
                            {component.description || '无描述'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Link 
                            to={`/payroll/components/${component.id}/edit`}
                            className="btn btn-ghost btn-xs"
                          >
                            编辑
                          </Link>
                        </div>
                      </div>
                      <div className="flex items-center mt-3">
                        <div className={`badge ${component.is_taxable ? 'badge-success' : 'badge-ghost'}`}>
                          {component.is_taxable ? '应税' : '非应税'}
                        </div>
                        <div className="ml-auto text-sm text-base-content/50">
                          创建于 {new Date(component.created_at).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SalaryComponentListPage;