import { useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DepartmentCard } from './DepartmentCard';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import type { DepartmentNode, DepartmentPayrollStatistics } from '@/types/department';

interface DepartmentCardGridProps {
  departments: DepartmentNode[];
  payrollStats?: Map<string, DepartmentPayrollStatistics> | DepartmentPayrollStatistics[];
  selectedDepartmentId?: string;
  onSelect?: (departmentId: string) => void;
  onAction?: (action: string, department: DepartmentNode) => void;
  showPayrollStats?: boolean;
  isLoading?: boolean;
  searchTerm?: string;
  sortBy?: 'name' | 'employee_count' | 'average_salary';
  sortOrder?: 'asc' | 'desc';
  className?: string;
  // Batch selection props
  selectionMode?: boolean;
  selectedDepartments?: DepartmentNode[];
  onSelectionChange?: (departments: DepartmentNode[]) => void;
}

export function DepartmentCardGrid({
  departments,
  payrollStats,
  selectedDepartmentId,
  onSelect,
  onAction,
  showPayrollStats = true,
  isLoading = false,
  searchTerm = '',
  sortBy = 'name',
  sortOrder = 'asc',
  className,
  selectionMode = false,
  selectedDepartments = [],
  onSelectionChange
}: DepartmentCardGridProps) {
  
  // 创建薪资统计映射
  const payrollStatsMap = useMemo(() => {
    if (payrollStats instanceof Map) {
      return payrollStats;
    }
    const map = new Map<string, DepartmentPayrollStatistics>();
    if (Array.isArray(payrollStats)) {
      payrollStats.forEach(stat => {
        if (stat.department_id) {
          map.set(stat.department_id, stat as any);
        }
      });
    }
    return map;
  }, [payrollStats]);

  // 过滤和排序部门
  const filteredAndSortedDepartments = useMemo(() => {
    let filtered = departments;

    // 搜索过滤
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = departments.filter(dept => 
        dept.name.toLowerCase().includes(searchLower) ||
        dept.full_path?.toLowerCase().includes(searchLower)
      );
    }

    // 排序
    return [...filtered].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'employee_count':
          aValue = a.employee_count || 0;
          bValue = b.employee_count || 0;
          break;
        case 'average_salary':
          const aStats = payrollStatsMap.get(a.id);
          const bStats = payrollStatsMap.get(b.id);
          aValue = aStats?.avg_gross_pay || 0;
          bValue = bStats?.avg_gross_pay || 0;
          break;
        default: // 'name'
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [departments, searchTerm, sortBy, sortOrder, payrollStatsMap]);

  // 处理批量选择
  const handleSelectionChange = useCallback((department: DepartmentNode, checked: boolean) => {
    if (!onSelectionChange) return;

    let newSelection: DepartmentNode[];
    if (checked) {
      newSelection = [...selectedDepartments, department];
    } else {
      newSelection = selectedDepartments.filter(d => d.id !== department.id);
    }
    onSelectionChange(newSelection);
  }, [selectedDepartments, onSelectionChange]);

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingScreen message="加载部门数据中..." />
      </div>
    );
  }

  // 空状态
  if (filteredAndSortedDepartments.length === 0) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-background-secondary/50 flex items-center justify-center">
          <BuildingOfficeIcon className="w-8 h-8 text-text-disabled" />
        </div>
        <h3 className="text-lg font-semibold text-text-secondary mb-2">
          {searchTerm ? '未找到匹配的部门' : '暂无部门数据'}
        </h3>
        <p className="text-sm text-text-tertiary max-w-md">
          {searchTerm 
            ? `未找到包含 "${searchTerm}" 的部门，请尝试其他关键词。`
            : '还没有创建任何部门，请先添加部门信息。'
          }
        </p>
      </div>
    );
  }

  return (
    <div className={cn('department-card-grid', className)}>
      {/* 网格容器 */}
      <div className={cn(
        'grid gap-6',
        'grid-cols-1', // 默认单列
        'sm:grid-cols-2', // 小屏双列
        'lg:grid-cols-3', // 大屏三列
        'xl:grid-cols-4', // 超大屏四列
        '2xl:grid-cols-5', // 2K屏五列
        'auto-rows-fr' // 等高行
      )}>
        {filteredAndSortedDepartments.map((department) => {
          const departmentStats = payrollStatsMap.get(department.id);
          
          return (
            <DepartmentCard
              key={department.id}
              department={department}
              payrollStats={departmentStats}
              isSelected={selectedDepartmentId === department.id}
              onSelect={() => onSelect?.(department.id)}
              onMenuAction={(action) => onAction?.(action, department)}
              showPayrollStats={showPayrollStats}
              className="h-full" // 确保卡片填满网格高度
              selectionMode={selectionMode}
              isChecked={selectedDepartments.some(d => d.id === department.id)}
              onCheckChange={(checked) => handleSelectionChange(department, checked)}
            />
          );
        })}
      </div>

      {/* 统计信息 */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-text-secondary">
        <div className="flex items-center gap-4">
          <span>共 {filteredAndSortedDepartments.length} 个部门</span>
          {searchTerm && (
            <span>搜索: "{searchTerm}"</span>
          )}
        </div>
        
        {showPayrollStats && payrollStatsMap.size > 0 && (
          <div className="flex items-center gap-4">
            <span>
              薪资数据覆盖: {payrollStatsMap.size} 个部门
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// 导出组件的CSS类名用于外部样式扩展
export const departmentCardGridClasses = {
  container: 'department-card-grid',
  grid: cn(
    'grid gap-6',
    'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
    'auto-rows-fr'
  ),
  empty: 'min-h-[400px] flex flex-col items-center justify-center text-center',
  stats: 'mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-text-secondary'
};