import { useState, useEffect } from 'react';
import { PayrollApprovalPanel } from '@/components/payroll';
import { usePayrollApprovalV2 } from '@/hooks/payroll';
import { useCurrentPayrollPeriod } from '@/hooks/payroll/usePayrollPeriod';
import { formatCurrency } from '@/lib/format';
import { PayrollPeriodSelector } from '@/components/common/PayrollPeriodSelector';

/**
 * 薪资审批管理页面
 * 展示完整的审批流程管理功能
 */
export default function PayrollApprovalPage() {
  const [showFullPanel, setShowFullPanel] = useState(false);
  const { queries, utils } = usePayrollApprovalV2();
  
  // 获取当前活跃周期
  const { data: currentPeriod } = useCurrentPayrollPeriod();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  
  // 设置默认周期
  useEffect(() => {
    if (currentPeriod && !selectedPeriodId) {
      setSelectedPeriodId(currentPeriod.id);
    }
  }, [currentPeriod, selectedPeriodId]);
  
  // 获取统计数据（根据选中周期筛选）
  const { data: stats, isLoading: statsLoading } = queries.useApprovalStats(selectedPeriodId);
  const { data: pendingList, isLoading: pendingLoading } = queries.usePendingApprovals(selectedPeriodId);

  // 计算待审批总金额
  const pendingAmount = pendingList?.reduce((sum, item) => sum + (item.net_pay || 0), 0) || 0;

  return (
    <div className="container mx-auto p-6">
      {/* 页面标题和周期选择器 */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">薪资审批管理</h1>
          <p className="text-base-content/60 mt-1">
            管理薪资审批流程，查看审批历史记录
          </p>
        </div>
        <div className="flex items-center gap-4">
          <PayrollPeriodSelector
            value={selectedPeriodId}
            onChange={(periodId) => setSelectedPeriodId(periodId)}
            onlyWithData={true}
            showCountBadge={true}
            placeholder="选择薪资周期"
            className="w-64"
          />
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 待审批 */}
        <div className="card bg-warning/10 border-warning/20">
          <div className="card-body">
            <h2 className="card-title text-sm text-warning">待审批</h2>
            <div className="stat-value text-3xl text-warning">
              {statsLoading ? (
                <span className="loading loading-dots loading-sm"></span>
              ) : (
                stats?.draft || 0
              )}
            </div>
            <div className="text-xs text-base-content/60 mt-2">
              总金额: {formatCurrency(pendingAmount)}
            </div>
          </div>
        </div>

        {/* 已审批 */}
        <div className="card bg-success/10 border-success/20">
          <div className="card-body">
            <h2 className="card-title text-sm text-success">已审批</h2>
            <div className="stat-value text-3xl text-success">
              {statsLoading ? (
                <span className="loading loading-dots loading-sm"></span>
              ) : (
                stats?.approved || 0
              )}
            </div>
            <div className="text-xs text-base-content/60 mt-2">
              待发放
            </div>
          </div>
        </div>

        {/* 已发放 */}
        <div className="card bg-info/10 border-info/20">
          <div className="card-body">
            <h2 className="card-title text-sm text-info">已发放</h2>
            <div className="stat-value text-3xl text-info">
              {statsLoading ? (
                <span className="loading loading-dots loading-sm"></span>
              ) : (
                stats?.paid || 0
              )}
            </div>
            <div className="text-xs text-base-content/60 mt-2">
              本月完成
            </div>
          </div>
        </div>

        {/* 已取消 */}
        <div className="card bg-error/10 border-error/20">
          <div className="card-body">
            <h2 className="card-title text-sm text-error">已取消</h2>
            <div className="stat-value text-3xl text-error">
              {statsLoading ? (
                <span className="loading loading-dots loading-sm"></span>
              ) : (
                stats?.cancelled || 0
              )}
            </div>
            <div className="text-xs text-base-content/60 mt-2">
              无效记录
            </div>
          </div>
        </div>
      </div>

      {/* 快速操作区 */}
      <div className="card bg-base-100 shadow-sm mb-6">
        <div className="card-body">
          <h3 className="card-title text-lg">快速操作</h3>
          <div className="flex gap-4 mt-4">
            <button 
              className="btn btn-primary"
              onClick={() => setShowFullPanel(true)}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              打开审批面板
            </button>
            
            <button className="btn btn-outline">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              创建薪资批次
            </button>
            
            <button className="btn btn-outline">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 17v1a3 3 0 003 3h0a3 3 0 003-3v-1m3-3.87a9.37 9.37 0 01-5.24 3.58 2.09 2.09 0 01-1.52 0A9.37 9.37 0 016 13.13" />
              </svg>
              查看审批历史
            </button>
          </div>
        </div>
      </div>

      {/* 待审批列表预览 */}
      {pendingList && pendingList.length > 0 && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h3 className="card-title text-lg">
              待审批列表
              <span className="badge badge-warning">{pendingList.length}</span>
            </h3>
            <div className="overflow-x-auto mt-4">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>员工姓名</th>
                    <th>支付日期</th>
                    <th>应发工资</th>
                    <th>实发工资</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingList.slice(0, 5).map((item) => (
                    <tr key={item.payroll_id}>
                      <td>{item.employee_name}</td>
                      <td>{new Date(item.pay_date).toLocaleDateString()}</td>
                      <td>{formatCurrency(item.gross_pay)}</td>
                      <td>{formatCurrency(item.net_pay)}</td>
                      <td>
                        <span className={`badge badge-${utils.getStatusColor(item.status)} badge-sm`}>
                          {item.status_label}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-xs">查看</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pendingList.length > 5 && (
                <div className="text-center mt-4">
                  <button 
                    className="btn btn-sm btn-ghost"
                    onClick={() => setShowFullPanel(true)}
                  >
                    查看全部 {pendingList.length} 条记录
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {pendingList && pendingList.length === 0 && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold">暂无待审批记录</h3>
            <p className="text-base-content/60 mt-2">
              所有薪资记录都已处理完成
            </p>
          </div>
        </div>
      )}

      {/* 审批面板模态框 */}
      {showFullPanel && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-6xl">
            <PayrollApprovalPanel 
              periodId={selectedPeriodId}
              onClose={() => setShowFullPanel(false)}
            />
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowFullPanel(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}