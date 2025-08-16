import { useState, useEffect } from 'react';
import { PayrollApprovalPanel, PayrollDetailModal, ApprovalHistoryModal } from '@/components/payroll';
import { usePayrollApproval, useAvailablePayrollMonths } from '@/hooks/payroll';
import { useCurrentPayrollPeriod } from '@/hooks/payroll/usePayrollPeriod';
import { formatCurrency } from '@/lib/format';
import { MonthPicker } from '@/components/common/MonthPicker';

/**
 * 薪资审批管理页面
 * 展示完整的审批流程管理功能
 */
export default function PayrollApprovalPage() {
  const [showFullPanel, setShowFullPanel] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const { queries, utils } = usePayrollApproval();
  
  // 获取当前活跃周期
  const { data: currentPeriod } = useCurrentPayrollPeriod();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  
  // 获取可用的薪资月份数据
  const { data: availableMonths } = useAvailablePayrollMonths(true);
  
  // 设置默认周期
  useEffect(() => {
    if (currentPeriod && !selectedPeriodId) {
      setSelectedPeriodId(currentPeriod.id);
      // 设置对应的月份
      if (currentPeriod.period_year && currentPeriod.period_month) {
        setSelectedMonth(`${currentPeriod.period_year}-${currentPeriod.period_month.toString().padStart(2, '0')}`);
      }
    }
  }, [currentPeriod, selectedPeriodId]);
  
  // 获取统计数据（根据选中周期筛选）
  const { data: stats, isLoading: statsLoading } = queries.useApprovalStats(selectedPeriodId);
  const { data: pendingList, isLoading: pendingLoading } = queries.usePendingApprovals(selectedPeriodId);

  // 计算待审批总金额
  const pendingAmount = pendingList?.reduce((sum, item) => sum + (item.net_pay || 0), 0) || 0;

  // 处理查看详情
  const handleViewDetail = (payrollId: string) => {
    setSelectedPayrollId(payrollId);
    setShowDetailModal(true);
  };

  // 关闭详情模态框
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPayrollId(null);
  };

  // 处理查看审批历史
  const handleViewHistory = () => {
    setShowHistoryModal(true);
  };

  // 关闭审批历史模态框
  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false);
  };

  return (
    <div className="container mx-auto p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">薪资审批管理</h1>
        <p className="text-base-content/60 mt-1">
          管理薪资审批流程，查看审批历史记录
        </p>
      </div>

      {/* 统计卡片 - 使用标准 DaisyUI 5 stat 组件 */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full mb-6">
        {/* 待审批 */}
        <div className="stat">
          <div className="stat-figure text-warning">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-title">待审批</div>
          <div className="stat-value text-warning">
            {statsLoading ? (
              <span className="loading loading-spinner loading-md"></span>
            ) : (
              stats?.draft || 0
            )}
          </div>
          <div className="stat-desc">总金额: {formatCurrency(pendingAmount)}</div>
        </div>

        {/* 已审批 */}
        <div className="stat">
          <div className="stat-figure text-success">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-title">已审批</div>
          <div className="stat-value text-success">
            {statsLoading ? (
              <span className="loading loading-spinner loading-md"></span>
            ) : (
              stats?.approved || 0
            )}
          </div>
          <div className="stat-desc">待发放</div>
        </div>

        {/* 已发放 */}
        <div className="stat">
          <div className="stat-figure text-info">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="stat-title">已发放</div>
          <div className="stat-value text-info">
            {statsLoading ? (
              <span className="loading loading-spinner loading-md"></span>
            ) : (
              stats?.paid || 0
            )}
          </div>
          <div className="stat-desc">本月完成</div>
        </div>

        {/* 已取消 */}
        <div className="stat">
          <div className="stat-figure text-error">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-title">已取消</div>
          <div className="stat-value text-error">
            {statsLoading ? (
              <span className="loading loading-spinner loading-md"></span>
            ) : (
              stats?.cancelled || 0
            )}
          </div>
          <div className="stat-desc">无效记录</div>
        </div>
      </div>

      {/* 快速操作区 */}
      <div className="card bg-base-100 shadow-sm mb-6">
        <div className="card-body">
          <h3 className="card-title text-lg">快速操作</h3>
          <div className="flex items-center gap-4 mt-4">
            {/* 月份选择器 - 放在最左边 */}
            <MonthPicker
              value={selectedMonth}
              onChange={(month) => {
                setSelectedMonth(month);
                // 查找对应的周期ID
                const monthData = availableMonths?.find(m => m.month === month);
                if (monthData?.periodId) {
                  setSelectedPeriodId(monthData.periodId);
                } else {
                  setSelectedPeriodId('');
                }
              }}
              showDataIndicators={true}
              availableMonths={availableMonths}
              onlyShowMonthsWithData={true}
              placeholder="选择薪资周期"
              className="w-48"
            />
            
            <div className="divider divider-horizontal m-0"></div>
            
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
            
            <button 
              className="btn btn-outline"
              onClick={handleViewHistory}
            >
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
                        <button 
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleViewDetail(item.payroll_id)}
                        >
                          查看
                        </button>
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

      {/* 薪资详情模态框 */}
      <PayrollDetailModal
        payrollId={selectedPayrollId}
        open={showDetailModal}
        onClose={handleCloseDetailModal}
      />

      {/* 审批历史模态框 */}
      <ApprovalHistoryModal
        initialPeriodId={selectedPeriodId}
        open={showHistoryModal}
        onClose={handleCloseHistoryModal}
      />
    </div>
  );
}