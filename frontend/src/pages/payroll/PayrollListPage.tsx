import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePayrolls } from '../../hooks/usePayroll';
import type { PayrollWithDetails } from '../../types/employee_new';

const PayrollListPage = () => {
  const { payrolls, loading, error, fetchPayrolls, total, page, pageSize } = usePayrolls();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // 获取数据
  useState(() => {
    fetchPayrolls();
  }, [fetchPayrolls]);

  // 过滤数据
  const filteredPayrolls = useMemo(() => {
    let result = payrolls;
    
    // 搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(payroll => 
        payroll.employee_name.toLowerCase().includes(term)
      );
    }
    
    // 状态过滤
    if (statusFilter) {
      result = result.filter(payroll => payroll.status === statusFilter);
    }
    
    // 日期范围过滤
    if (dateRange.start) {
      result = result.filter(payroll => payroll.pay_period_start >= dateRange.start);
    }
    
    if (dateRange.end) {
      result = result.filter(payroll => payroll.pay_period_end <= dateRange.end);
    }
    
    return result;
  }, [payrolls, searchTerm, statusFilter, dateRange]);

  // 分页处理
  const totalPages = Math.ceil(total / pageSize);
  const canPreviousPage = page > 0;
  const canNextPage = page < totalPages - 1;

  const handlePageChange = (newPage: number) => {
    fetchPayrolls(newPage, pageSize);
  };

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
          <span>加载薪资单失败: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">薪资单管理</h1>
          <p className="text-base-content/70 mt-1">管理员工薪资单和发放状态</p>
        </div>
        <Link to="/payroll/create" className="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建薪资单
        </Link>
      </div>

      {/* 过滤器 */}
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">
                <span className="label-text">搜索员工</span>
              </label>
              <input
                type="text"
                placeholder="输入员工姓名"
                className="input input-bordered w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <label className="label">
                <span className="label-text">状态</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">全部状态</option>
                <option value="draft">草稿</option>
                <option value="approved">已批准</option>
                <option value="paid">已发放</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            
            <div>
              <label className="label">
                <span className="label-text">开始日期</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="label">
                <span className="label-text">结束日期</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <button 
              className="btn btn-outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setDateRange({ start: '', end: '' });
              }}
            >
              清除筛选
            </button>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">总薪资单</div>
          <div className="stat-value text-primary">{total}</div>
        </div>
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">草稿</div>
          <div className="stat-value text-info">
            {payrolls.filter(p => p.status === 'draft').length}
          </div>
        </div>
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">已批准</div>
          <div className="stat-value text-warning">
            {payrolls.filter(p => p.status === 'approved').length}
          </div>
        </div>
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">已发放</div>
          <div className="stat-value text-success">
            {payrolls.filter(p => p.status === 'paid').length}
          </div>
        </div>
      </div>

      {/* 薪资单表格 */}
      {filteredPayrolls.length === 0 ? (
        <div className="card bg-base-100 shadow">
          <div className="card-body text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-base-content/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-base-content/70 mb-2">暂无薪资单</h3>
            <p className="text-base-content/50 mb-4">您可以创建第一个薪资单来开始薪资管理</p>
            <Link to="/payroll/create" className="btn btn-primary">创建薪资单</Link>
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow">
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>员工</th>
                    <th>部门</th>
                    <th>薪资周期</th>
                    <th>发薪日期</th>
                    <th>应发</th>
                    <th>扣除</th>
                    <th>实发</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayrolls.map((payroll) => (
                    <tr key={payroll.id}>
                      <td>
                        <div className="font-medium">{payroll.employee_name}</div>
                      </td>
                      <td>{payroll.department_name}</td>
                      <td>
                        <div className="text-sm">
                          {new Date(payroll.pay_period_start).toLocaleDateString('zh-CN')} - {new Date(payroll.pay_period_end).toLocaleDateString('zh-CN')}
                        </div>
                      </td>
                      <td>{new Date(payroll.pay_date).toLocaleDateString('zh-CN')}</td>
                      <td className="font-medium">¥{payroll.gross_pay.toFixed(2)}</td>
                      <td className="font-medium">¥{payroll.total_deductions.toFixed(2)}</td>
                      <td className="font-bold text-primary">¥{payroll.net_pay.toFixed(2)}</td>
                      <td>
                        <div className={`badge ${
                          payroll.status === 'draft' ? 'badge-info' :
                          payroll.status === 'approved' ? 'badge-warning' :
                          payroll.status === 'paid' ? 'badge-success' : 'badge-error'
                        }`}>
                          {payroll.status === 'draft' ? '草稿' :
                           payroll.status === 'approved' ? '已批准' :
                           payroll.status === 'paid' ? '已发放' : '已取消'}
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <Link 
                            to={`/payroll/${payroll.id}`}
                            className="btn btn-ghost btn-xs"
                          >
                            查看
                          </Link>
                          {payroll.status === 'draft' && (
                            <Link 
                              to={`/payroll/${payroll.id}/edit`}
                              className="btn btn-ghost btn-xs"
                            >
                              编辑
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* 分页 */}
            <div className="flex items-center justify-between border-t border-base-200 px-4 py-2">
              <div className="text-sm text-base-content/70">
                显示第 {(page * pageSize) + 1} 到 {Math.min((page + 1) * pageSize, total)} 条，共 {total} 条
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={!canPreviousPage}
                >
                  上一页
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!canNextPage}
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollListPage;