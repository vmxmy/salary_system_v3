import { useState, useCallback } from 'react';
import { ChevronRightIcon, BuildingOfficeIcon, UsersIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { ModernButton } from '@/components/common/ModernButton';
import type { DepartmentNode } from '@/types/department';

interface DepartmentTreeNodeProps {
  department: DepartmentNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: (departmentId: string) => void;
  onSelect: (department: DepartmentNode) => void;
  onMenuAction: (action: string, department: DepartmentNode) => void;
  className?: string;
  // Batch selection props
  selectionMode?: boolean;
  isChecked?: boolean;
  onCheckChange?: (department: DepartmentNode, checked: boolean) => void;
}

export function DepartmentTreeNode({
  department,
  level,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onMenuAction,
  className,
  selectionMode = false,
  isChecked = false,
  onCheckChange
}: DepartmentTreeNodeProps) {
  const [showMenu, setShowMenu] = useState(false);
  const hasChildren = department.children && department.children.length > 0;
  const employeeCount = department.employee_count || 0;

  // 使用 DaisyUI 样式系统

  const handleToggle = useCallback(() => {
    if (hasChildren) {
      onToggle(department.id);
    }
  }, [hasChildren, department.id, onToggle]);

  const handleSelect = useCallback(() => {
    onSelect(department);
  }, [department, onSelect]);

  const handleMenuAction = useCallback((action: string) => {
    onMenuAction(action, department);
    setShowMenu(false);
  }, [department, onMenuAction]);

  const handleCheckChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onCheckChange?.(department, e.target.checked);
  }, [department, onCheckChange]);

  return (
    <div 
      className={cn(
        'department-tree-node',
        isSelected && 'selected',
        className
      )}
      data-level={level}
    >
      {/* 深度指示器 */}
      <div className="department-depth-indicator" />
      
      {/* 部门节点 */}
      <div 
        className={cn(
          'flex items-center gap-2 py-2 px-3 rounded-lg transition-all duration-200',
          'hover:bg-base-200/60 cursor-pointer group relative',
          isSelected && 'bg-primary/10 border border-primary/20'
        )}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={handleSelect}
      >
        {/* 选择模式下的复选框 */}
        {selectionMode && (
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleCheckChange}
            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary focus:ring-2"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* 展开/折叠图标 */}
        <button
          className={cn(
            'flex items-center justify-center w-5 h-5 rounded transition-all duration-200',
            'department-toggle-button',
            hasChildren 
              ? 'hover:bg-base-300 text-base-content/70' 
              : 'invisible',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            isExpanded && hasChildren && 'expanded'
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          disabled={!hasChildren}
        >
          {hasChildren && (
            <ChevronRightIcon 
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isExpanded && 'rotate-90'
              )} 
            />
          )}
        </button>

        {/* 部门图标 */}
        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
          <BuildingOfficeIcon className="w-4 h-4 text-primary" />
        </div>

        {/* 部门信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span 
              className={cn(
                'text-base font-semibold',
                isSelected ? 'text-primary' : 'text-base-content',
                'truncate'
              )}
            >
              {department.name}
            </span>
            
            {/* 部门路径提示 */}
            {department.full_path && level > 0 && (
              <span className="text-xs text-base-content/50 truncate">
                {department.full_path}
              </span>
            )}
          </div>
          
          {/* 员工数量 */}
          {employeeCount > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <UsersIcon className="w-3 h-3 text-base-content/50" />
              <span className="text-xs text-base-content/70">
                {employeeCount} 人
              </span>
            </div>
          )}
        </div>

        {/* 操作菜单 */}
        <div className="relative">
          <ModernButton
            variant="ghost"
            size="sm"
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity',
              showMenu && 'opacity-100'
            )}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <EllipsisHorizontalIcon className="w-4 h-4" />
          </ModernButton>

          {/* 下拉菜单 */}
          {showMenu && (
            <div className="menu bg-base-100 shadow-lg rounded-lg border border-base-300 absolute right-0 top-full mt-1 z-50 min-w-[160px] py-1">
              <button
                className="w-full px-3 py-2 text-left text-sm text-base-content hover:bg-base-200 transition-colors"
                onClick={() => handleMenuAction('view')}
              >
                查看详情
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm text-base-content hover:bg-base-200 transition-colors"
                onClick={() => handleMenuAction('edit')}
              >
                编辑部门
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm text-base-content hover:bg-base-200 transition-colors"
                onClick={() => handleMenuAction('addChild')}
              >
                添加子部门
              </button>
              <div className="border-t border-base-300 my-1" />
              <button
                className="w-full px-3 py-2 text-left text-sm text-error hover:bg-error/10 transition-colors"
                onClick={() => handleMenuAction('delete')}
              >
                删除部门
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 子部门 */}
      {hasChildren && isExpanded && (
        <div className="department-children">
          {department.children?.map((child) => (
            <DepartmentTreeNode
              key={child.id}
              department={child}
              level={level + 1}
              isExpanded={isExpanded}
              isSelected={isSelected}
              onToggle={onToggle}
              onSelect={onSelect}
              onMenuAction={onMenuAction}
              selectionMode={selectionMode}
              isChecked={isChecked}
              onCheckChange={onCheckChange}
            />
          ))}
        </div>
      )}

      {/* 点击外部关闭菜单 */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}