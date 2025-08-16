import { useState, useEffect } from 'react';
import { ApprovalTimeline } from './ApprovalTimeline';
import { PayrollPeriodSelector } from '@/components/common/PayrollPeriodSelector';
import { 
  usePeriodApprovalHistory, 
  ApprovalHistoryFilters as HistoryFilters,
  ACTION_CONFIG 
} from '@/hooks/payroll/useApprovalHistory';

interface ApprovalHistoryModalProps {
  initialPeriodId?: string;
  open: boolean;
  onClose: () => void;
}

// 筛选器组件
function ApprovalHistoryFilterPanel({ 
  filters, 
  onFiltersChange 
}: {
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
}) {
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
        <label className="label">
          <span className="label-text font-medium">薪资周期</span>
        </label>
        <PayrollPeriodSelector
          value={filters.periodId}
          onChange={(periodId) => onFiltersChange({ ...filters, periodId })}
          onlyWithData={true}
          showCountBadge={false}
          className="w-full"
        />
      </div>

      {/* 操作类型筛选 */}
      <div>
        <label className="label">
          <span className="label-text font-medium">操作类型</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* 全部 */}
          <button
            className={`btn btn-sm ${
              !filters.action ? 'btn-primary' : 'btn-outline'
            }`}
            onClick={() => handleActionFilterChange('all')}
          >
            全部
          </button>
          
          {/* 各种操作类型 */}
          {Object.entries(ACTION_CONFIG).map(([actionKey, config]) => (
            <button
              key={actionKey}
              className={`btn btn-sm ${
                filters.action === actionKey ? `btn-${config.color}` : 'btn-outline'
              }`}
              onClick={() => handleActionFilterChange(actionKey)}
            >
              <span className="mr-1">{config.icon}</span>
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* 记录数量限制 */}
      <div>
        <label className="label">
          <span className="label-text font-medium">显示数量</span>
        </label>
        <select 
          className="select select-bordered w-32"
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
              {count}
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
}: ApprovalHistoryModalProps) {
  const [filters, setFilters] = useState<HistoryFilters>({
    periodId: initialPeriodId,
    limit: 50,
  });

  // 当初始周期ID变化时更新筛选器
  useEffect(() => {
    if (initialPeriodId) {
      setFilters(prev => ({ ...prev, periodId: initialPeriodId }));
    }
  }, [initialPeriodId]);

  // 获取审批历史数据
  const { 
    data: historyItems = [], 
    isLoading, 
    error,
    refetch 
  } = usePeriodApprovalHistory(filters.periodId || '', {
    action: filters.action,
    limit: filters.limit,
  });

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
      <div className="modal-box max-w-6xl h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-xl">审批历史</h3>
            <p className="text-base-content/60 text-sm mt-1">
              查看薪资审批流程的详细操作记录
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              className="btn btn-ghost btn-sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新
            </button>
            
            <button 
              className="btn btn-ghost btn-sm"
              onClick={handleClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="card bg-base-100 border mb-4">
          <div className="card-body p-4">
            <ApprovalHistoryFilterPanel
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {error && (
            <div className="alert alert-error mb-4">
              <span>加载审批历史失败: {error.message}</span>
            </div>
          )}

          {/* 统计信息 */}
          {historyItems.length > 0 && (
            <ApprovalStats items={historyItems} />
          )}

          {/* 时间线内容 */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <ApprovalTimeline.Loading />
            ) : (
              <ApprovalTimeline items={historyItems} />
            )}
          </div>
        </div>

        {/* 底部操作 */}
        <div className="modal-action mt-4">
          <button className="btn" onClick={handleClose}>
            关闭
          </button>
        </div>
      </div>
      
      {/* 背景遮罩 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
    </dialog>
  );
}