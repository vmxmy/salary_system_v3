import { memo } from 'react';
import { 
  Squares2X2Icon, 
  ListBulletIcon,
  AdjustmentsHorizontalIcon 
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { ModernButton } from '@/components/common/ModernButton';

export type DepartmentViewMode = 'tree' | 'card' | 'list';

interface DepartmentViewToggleProps {
  currentView: DepartmentViewMode;
  onViewChange: (view: DepartmentViewMode) => void;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const viewOptions = [
  {
    key: 'tree' as const,
    label: '树形视图',
    icon: ListBulletIcon,
    description: '层级树形结构展示'
  },
  {
    key: 'card' as const,
    label: '卡片视图',
    icon: Squares2X2Icon,
    description: '网格卡片布局展示'
  },
  {
    key: 'list' as const,
    label: '列表视图',
    icon: AdjustmentsHorizontalIcon,
    description: '表格列表形式展示'
  }
] as const;

export const DepartmentViewToggle = memo<DepartmentViewToggleProps>(({
  currentView,
  onViewChange,
  showLabels = false,
  size = 'md',
  className
}) => {
  const buttonSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md';
  
  return (
    <div className={cn(
      'flex items-center gap-1 p-1 bg-base-200 rounded-lg border border-base-300',
      className
    )}>
      {viewOptions.map((option) => {
        const isActive = currentView === option.key;
        const IconComponent = option.icon;
        
        return (
          <ModernButton
            key={option.key}
            variant={isActive ? 'primary' : 'ghost'}
            size={buttonSize}
            icon={<IconComponent className="w-4 h-4" />}
            className={cn(
              'relative transition-all duration-200',
              isActive && 'shadow-sm',
              !isActive && 'hover:bg-background-secondary'
            )}
            onClick={() => onViewChange(option.key)}
            title={option.description}
          >
            {showLabels && (
              <span className="ml-2 text-sm font-medium">
                {option.label}
              </span>
            )}
          </ModernButton>
        );
      })}
    </div>
  );
});

DepartmentViewToggle.displayName = 'DepartmentViewToggle';

// 扩展版本：带有设置菜单的视图切换器
interface DepartmentViewToggleWithOptionsProps extends DepartmentViewToggleProps {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  showPayrollStats?: boolean;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onTogglePayrollStats?: () => void;
  onExport?: () => void;
}

export const DepartmentViewToggleWithOptions = memo<DepartmentViewToggleWithOptionsProps>(({
  currentView,
  onViewChange,
  sortBy = 'name',
  sortOrder = 'asc',
  showPayrollStats = true,
  onSortChange,
  onTogglePayrollStats,
  onExport,
  showLabels = false,
  size = 'md',
  className
}) => {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* 主视图切换器 */}
      <DepartmentViewToggle
        currentView={currentView}
        onViewChange={onViewChange}
        showLabels={showLabels}
        size={size}
      />
      
      {/* 附加选项 */}
      <div className="flex items-center gap-2">
        {/* 排序选项 */}
        {onSortChange && (
          <div className="flex items-center gap-1">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-');
                onSortChange(newSortBy, newSortOrder as 'asc' | 'desc');
              }}
              className={cn(
                'select select-sm text-sm',
                'border-border-subtle bg-background-primary',
                'focus:border-primary focus:outline-none'
              )}
            >
              <option value="name-asc">名称 ↑</option>
              <option value="name-desc">名称 ↓</option>
              <option value="employee_count-desc">员工数 ↓</option>
              <option value="employee_count-asc">员工数 ↑</option>
              <option value="average_salary-desc">平均薪资 ↓</option>
              <option value="average_salary-asc">平均薪资 ↑</option>
            </select>
          </div>
        )}
        
        {/* 薪资统计开关 */}
        {onTogglePayrollStats && (
          <ModernButton
            variant={showPayrollStats ? 'primary' : 'ghost'}
            size="sm"
            onClick={onTogglePayrollStats}
            title={showPayrollStats ? '隐藏薪资统计' : '显示薪资统计'}
          >
            <span className="text-xs font-medium">
              薪资统计
            </span>
          </ModernButton>
        )}
        
        {/* 导出按钮 */}
        {onExport && (
          <ModernButton
            variant="secondary"
            size="sm"
            onClick={onExport}
            title="导出部门数据"
          >
            <span className="text-xs font-medium">
              导出
            </span>
          </ModernButton>
        )}
      </div>
    </div>
  );
});

DepartmentViewToggleWithOptions.displayName = 'DepartmentViewToggleWithOptions';

// 响应式视图切换器 - 在小屏幕上自动调整
export const ResponsiveDepartmentViewToggle = memo<DepartmentViewToggleProps>(({
  currentView,
  onViewChange,
  className,
  ...props
}) => {
  return (
    <div className={cn('responsive-view-toggle', className)}>
      {/* 桌面版 */}
      <div className="hidden md:block">
        <DepartmentViewToggle
          currentView={currentView}
          onViewChange={onViewChange}
          showLabels={true}
          size="md"
          {...props}
        />
      </div>
      
      {/* 移动版 */}
      <div className="block md:hidden">
        <DepartmentViewToggle
          currentView={currentView}
          onViewChange={onViewChange}
          showLabels={false}
          size="sm"
          {...props}
        />
      </div>
    </div>
  );
});

ResponsiveDepartmentViewToggle.displayName = 'ResponsiveDepartmentViewToggle';