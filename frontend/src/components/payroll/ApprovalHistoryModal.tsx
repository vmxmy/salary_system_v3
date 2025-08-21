import { useState, useEffect, useCallback } from 'react';
import { ApprovalTimeline } from './ApprovalTimeline';
import { MonthPicker } from '@/components/common/MonthPicker';
import { useAvailablePayrollMonths } from '@/hooks/payroll';
import { 
  useApprovalHistory,
  type ApprovalHistoryFilters as HistoryFilters,
  ACTION_CONFIG 
} from '@/hooks/payroll/useApprovalHistory';

interface ApprovalHistoryModalProps {
  initialPeriodId?: string;
  open: boolean;
  onClose: () => void;
  // 新增：支持实时更新
  autoRefresh?: boolean;
  refreshInterval?: number; // 毫秒
  // 新增：支持指定特定员工的历史
  employeeId?: string;
}

// 筛选器组件
function ApprovalHistoryFilterPanel({ 
  filters, 
  onFiltersChange 
}: {
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const { data: availableMonths } = useAvailablePayrollMonths(true);
  
  // 当 periodId 改变时，更新选中的月份
  useEffect(() => {
    if (filters.periodId && availableMonths) {
      const monthData = availableMonths.find(m => m.periodId === filters.periodId);
      if (monthData) {
        setSelectedMonth(monthData.month);
      }
    }
  }, [filters.periodId, availableMonths]);
  
  const handleActionFilterChange = (action: string) => {
    onFiltersChange({
      ...filters,
      action: action === 'all' ? undefined : action,
    });
  };

  return (
    <div className="space-y-4">
      {/* 薪资周期选择 */}
      <div>
        <label className="label label-text font-medium">薪资周期</label>
        <MonthPicker
          value={selectedMonth}
          onChange={(month) => {
            setSelectedMonth(month);
            // 查找对应的周期ID
            const monthData = availableMonths?.find(m => m.month === month);
            if (monthData?.periodId) {
              onFiltersChange({ ...filters, periodId: monthData.periodId });
            } else {
              onFiltersChange({ ...filters, periodId: undefined });
            }
          }}
          showDataIndicators={true}
          availableMonths={availableMonths}
          onlyShowMonthsWithData={true}
          placeholder="选择薪资周期"
          className="w-full"
        />
      </div>

      {/* 操作类型筛选 - 改为下拉列表 */}
      <div>
        <label className="label label-text font-medium">操作类型</label>
        <select 
          className="select select-bordered w-full"
          value={filters.action || 'all'}
          onChange={(e) => handleActionFilterChange(e.target.value)}
        >
          <option value="all">全部操作</option>
          {Object.entries(ACTION_CONFIG).map(([actionKey, config]) => (
            <option key={actionKey} value={actionKey}>
              {config.icon} {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* 记录数量限制 */}
      <div>
        <label className="label label-text font-medium">显示数量</label>
        <select 
          className="select select-bordered w-full"
          value={filters.limit || 50}
          onChange={(e) => onFiltersChange({ 
            ...filters, 
            limit: parseInt(e.target.value) 
          })}
        >
          <option value={20}>20条</option>
          <option value={50}>50条</option>
          <option value={100}>100条</option>
          <option value={200}>200条</option>
          <option value={500}>500条</option>
        </select>
      </div>
    </div>
  );
}

// 审批历史统计卡片
function ApprovalStats({ 
  items 
}: { 
  items: any[] 
}) {
  // 统计各种操作数量
  const stats = items.reduce((acc, item) => {
    acc[item.action] = (acc[item.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalCount = items.length;
  const uniqueEmployees = new Set(items.map(item => item.employee_name)).size;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* 总数 */}
      <div className="stat bg-base-200 rounded-lg p-4">
        <div className="stat-title text-xs">总操作数</div>
        <div className="stat-value text-2xl">{totalCount}</div>
      </div>

      {/* 涉及员工数 */}
      <div className="stat bg-base-200 rounded-lg p-4">
        <div className="stat-title text-xs">涉及员工</div>
        <div className="stat-value text-2xl">{uniqueEmployees}</div>
      </div>

      {/* 各操作类型统计 */}
      {Object.entries(stats).slice(0, 2).map(([action, count]) => {
        const config = ACTION_CONFIG[action as keyof typeof ACTION_CONFIG];
        if (!config) return null;
        
        return (
          <div key={action} className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title text-xs">{config.label}</div>
            <div className={`stat-value text-2xl text-${config.color}`}>
              {typeof count === 'number' ? count : 0}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 主模态框组件
export function ApprovalHistoryModal({
  initialPeriodId,
  open,
  onClose,
  autoRefresh = false,
  refreshInterval = 30000, // 默认30秒
  employeeId,
}: ApprovalHistoryModalProps) {
  const [filters, setFilters] = useState<HistoryFilters>({
    periodId: initialPeriodId,
    employeeId,
    limit: 50,
  });
  
  const { data: availableMonths } = useAvailablePayrollMonths(true);

  // 当初始周期ID变化时更新筛选器
  useEffect(() => {
    if (initialPeriodId) {
      setFilters(prev => ({ ...prev, periodId: initialPeriodId }));
    }
  }, [initialPeriodId]);

  // 当指定员工ID变化时更新筛选器
  useEffect(() => {
    if (employeeId) {
      setFilters(prev => ({ ...prev, employeeId }));
    }
  }, [employeeId]);

  // 获取审批历史数据
  const { 
    data: historyItems = [], 
    isLoading, 
    error,
    refetch 
  } = useApprovalHistory({
    periodId: filters.periodId,
    employeeId: filters.employeeId,
    action: filters.action,
    limit: filters.limit,
  });

  // 自动刷新功能
  useEffect(() => {
    if (!autoRefresh || !open) return;

    const interval = setInterval(() => {
      refetch();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, open, refreshInterval, refetch]);

  // 关闭模态框时重置筛选器
  const handleClose = () => {
    setFilters({
      periodId: initialPeriodId,
      limit: 50,
    });
    onClose();
  };

  // 刷新数据
  const handleRefresh = () => {
    refetch();
  };

  if (!open) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-7xl h-[90vh] p-0">
        {/* 左右布局容器 */}
        <div className="flex h-full">
          {/* 左侧边栏 - 筛选器 */}
          <div className="w-80 border-r bg-base-200/30 p-6 flex flex-col">
            {/* 侧边栏标题 */}
            <div className="mb-6">
              <h3 className="font-bold text-lg">筛选条件</h3>
              <p className="text-base-content/60 text-sm mt-1">
                设置筛选条件查看历史记录
              </p>
            </div>
            
            {/* 筛选器面板 */}
            <div className="flex-1">
              <ApprovalHistoryFilterPanel
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>

            {/* 刷新按钮 */}
            <div className="mt-auto pt-4">
              <button 
                className="btn btn-primary btn-block"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                刷新数据
              </button>
            </div>
          </div>

          {/* 右侧主内容区 */}
          <div className="flex-1 flex flex-col">
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="font-bold text-2xl">审批历史</h2>
                <p className="text-base-content/60 text-sm mt-1">
                  查看薪资审批流程的详细操作记录
                </p>
              </div>
              
              <button 
                className="btn btn-ghost btn-circle"
                onClick={handleClose}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-hidden flex flex-col p-6">
              {/* 自动刷新提示 */}
              {autoRefresh && (
                <div className="alert alert-info mb-4">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>自动刷新已开启，每 {Math.round(refreshInterval / 1000)} 秒更新一次</span>
                </div>
              )}

              {error && (
                <div className="alert alert-error mb-4">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>加载审批历史失败: {error.message}</span>
                </div>
              )}

              {/* 统计信息 */}
              {historyItems.length > 0 && (
                <ApprovalStats items={historyItems} />
              )}

              {/* 时间线内容 - 可滚动区域 */}
              <div className="flex-1 overflow-y-auto pr-2">
                {isLoading ? (
                  <ApprovalTimeline.Loading />
                ) : historyItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-semibold text-base-content/70">暂无审批记录</h3>
                    <p className="text-base-content/50 mt-2">
                      {filters.periodId ? '当前周期暂无审批操作记录' : '请选择薪资周期查看审批历史'}
                    </p>
                  </div>
                ) : (
                  <ApprovalTimeline items={historyItems} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 背景遮罩 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
    </dialog>
  );
}