import { formatDate } from '@/lib/dateUtils';
import { 
  type ApprovalHistoryItem, 
  getActionConfig, 
  formatStatusLabel 
} from '@/hooks/payroll/useApprovalHistory';

interface ApprovalTimelineProps {
  items: ApprovalHistoryItem[];
  className?: string;
}

interface ApprovalTimelineItemProps {
  item: ApprovalHistoryItem;
  isLast?: boolean;
}

// 单个时间线项组件
function ApprovalTimelineItem({ item, isLast = false }: ApprovalTimelineItemProps) {
  const actionConfig = getActionConfig(item.action);

  return (
    <div className={`relative flex items-start ${!isLast ? 'pb-8' : ''}`}>
      {/* 时间线左侧：时间 */}
      <div className="flex-shrink-0 w-24 text-right pr-4">
        <time className="text-xs text-base-content/60 block">
          {formatDate(item.created_at, 'time')}
        </time>
        <time className="text-xs text-base-content/40 block mt-1">
          {formatDate(item.created_at, 'date')}
        </time>
      </div>

      {/* 时间线中间：图标和连接线 */}
      <div className="relative flex flex-col items-center">
        {/* 操作图标 */}
        <div className={`
          flex items-center justify-center w-10 h-10 rounded-full 
          ${actionConfig.bgColor} border-2 border-${actionConfig.color}
          relative z-10
        `}>
          <span className="text-lg" role="img" aria-label={actionConfig.label}>
            {actionConfig.icon}
          </span>
        </div>

        {/* 连接线 */}
        {!isLast && (
          <div className="absolute top-10 w-0.5 h-8 bg-base-300" />
        )}
      </div>

      {/* 时间线右侧：内容 */}
      <div className="flex-1 ml-4 min-w-0">
        <div className={`
          p-4 rounded-lg border ${actionConfig.bgColor} 
          border-${actionConfig.color}/20
        `}>
          {/* 标题行 */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-base-content">
                <span className="mr-2">{item.employee_name}</span>
                <span className={`badge badge-${actionConfig.color} badge-sm`}>
                  {actionConfig.label}
                </span>
              </h4>
              <p className="text-sm text-base-content/70 mt-1">
                {formatStatusLabel(item.from_status)} → {formatStatusLabel(item.to_status)}
              </p>
            </div>
            
            {/* 薪资金额（如果有） */}
            {item.net_pay && (
              <div className="text-right text-sm">
                <div className="font-medium">¥{item.net_pay.toLocaleString()}</div>
                <div className="text-base-content/60">实发</div>
              </div>
            )}
          </div>

          {/* 详细信息 */}
          <div className="text-sm text-base-content/70">
            <div className="flex items-center gap-4">
              <span>操作人: {item.operator_name}</span>
              {item.period_name && (
                <span>周期: {item.period_name}</span>
              )}
            </div>
            
            {/* 备注/原因 */}
            {item.comments && (
              <div className="mt-2 p-2 bg-base-200/50 rounded text-base-content/80">
                <span className="font-medium">备注: </span>
                {item.comments}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 空状态组件
function EmptyTimeline() {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📋</div>
      <h3 className="text-xl font-semibold text-base-content/70">暂无审批历史</h3>
      <p className="text-base-content/50 mt-2">
        当前筛选条件下没有找到审批记录
      </p>
    </div>
  );
}

// 加载状态组件
function TimelineLoading() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="relative flex items-start">
          <div className="flex-shrink-0 w-24 text-right pr-4">
            <div className="skeleton h-3 w-12 mb-2"></div>
            <div className="skeleton h-3 w-16"></div>
          </div>
          
          <div className="relative flex flex-col items-center">
            <div className="skeleton w-10 h-10 rounded-full"></div>
            {i < 3 && <div className="absolute top-10 w-0.5 h-8 bg-base-300" />}
          </div>
          
          <div className="flex-1 ml-4">
            <div className="p-4 rounded-lg border bg-base-100">
              <div className="skeleton h-4 w-48 mb-2"></div>
              <div className="skeleton h-3 w-32 mb-3"></div>
              <div className="skeleton h-3 w-64"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 主时间线组件
export function ApprovalTimeline({ items, className = '' }: ApprovalTimelineProps) {
  if (!items || items.length === 0) {
    return <EmptyTimeline />;
  }

  return (
    <div className={`approval-timeline ${className}`}>
      {/* 头部说明 */}
      <div className="mb-6 p-4 bg-base-200/30 rounded-lg">
        <h4 className="font-medium text-base-content/80 mb-2">审批流程记录</h4>
        <p className="text-sm text-base-content/60">
          显示所有薪资审批相关的操作历史，按时间倒序排列
        </p>
      </div>

      {/* 时间线列表 */}
      <div className="space-y-0">
        {items.map((item, index) => (
          <ApprovalTimelineItem
            key={item.id}
            item={item}
            isLast={index === items.length - 1}
          />
        ))}
      </div>

      {/* 底部统计 */}
      <div className="mt-6 p-4 bg-base-200/30 rounded-lg text-center">
        <p className="text-sm text-base-content/60">
          共 {items.length} 条操作记录
        </p>
      </div>
    </div>
  );
}

// 导出加载组件供外部使用
ApprovalTimeline.Loading = TimelineLoading;
ApprovalTimeline.Empty = EmptyTimeline;