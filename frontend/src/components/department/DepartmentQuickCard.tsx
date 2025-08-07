import { 
  UsersIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { DepartmentNode } from '@/types/department';

interface DepartmentQuickCardProps {
  department: DepartmentNode;
  isSelected?: boolean;
  isExpanded?: boolean;
  level?: number;
  onClick?: () => void;
  onToggleExpand?: () => void;
  showChildren?: boolean;
  selectionMode?: boolean;
  isChecked?: boolean;
  onCheckChange?: (checked: boolean) => void;
}

export function DepartmentQuickCard({
  department,
  isSelected = false,
  isExpanded = false,
  level = 0,
  onClick,
  onToggleExpand,
  showChildren = true,
  selectionMode = false,
  isChecked = false,
  onCheckChange
}: DepartmentQuickCardProps) {
  const hasChildren = department.children && department.children.length > 0;
  
  return (
    <div className="group">
      <div 
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer",
          "hover:bg-base-200/50",
          isSelected && "bg-primary/10 hover:bg-primary/15",
          level > 0 && "ml-6"
        )}
        onClick={onClick}
      >
        {/* 展开/折叠按钮 */}
        {hasChildren && showChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.();
            }}
            className="btn btn-ghost btn-xs btn-circle"
          >
            {isExpanded ? (
              <FolderOpenIcon className="w-4 h-4" />
            ) : (
              <FolderIcon className="w-4 h-4" />
            )}
          </button>
        )}
        
        {/* 选择框 */}
        {selectionMode && (
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              e.stopPropagation();
              onCheckChange?.(e.target.checked);
            }}
            className="checkbox checkbox-sm checkbox-primary"
          />
        )}
        
        {/* 部门信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{department.name}</h3>
            {department.employee_count > 0 && (
              <span className="badge badge-sm badge-ghost">
                <UsersIcon className="w-3 h-3 mr-1" />
                {department.employee_count}
              </span>
            )}
          </div>
          {hasChildren && (
            <p className="text-xs text-base-content/60 mt-0.5">
              {department.children.length} 个子部门
            </p>
          )}
        </div>
        
        {/* 箭头指示 */}
        <ChevronRightIcon className="w-4 h-4 text-base-content/40 group-hover:text-base-content/70" />
      </div>
      
      {/* 子部门 */}
      {showChildren && isExpanded && hasChildren && (
        <div className="mt-1">
          {department.children?.map(child => (
            <DepartmentQuickCard
              key={child.id}
              department={child}
              level={level + 1}
              onClick={onClick}
              onToggleExpand={onToggleExpand}
              showChildren={showChildren}
              selectionMode={selectionMode}
              isChecked={isChecked}
              onCheckChange={onCheckChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}