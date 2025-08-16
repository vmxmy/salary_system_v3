import { useState, useCallback, useMemo } from 'react';
import { 
  UsersIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  UserPlusIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { ModernButton } from '@/components/common/ModernButton';
import { useToast } from '@/contexts/ToastContext';
import { useDepartmentEmployees } from '@/hooks/department';
import { cn } from '@/lib/utils';
import type { DepartmentNode, DepartmentEmployee } from '@/types/department';

interface DepartmentEmployeePanelProps {
  department: DepartmentNode;
  className?: string;
}

interface EmployeeSearchFilters {
  name?: string;
  position?: string;
  status?: 'active' | 'inactive' | 'all';
  category?: string;
}

export function DepartmentEmployeePanel({ 
  department, 
  className 
}: DepartmentEmployeePanelProps) {
  const { showSuccess, showInfo } = useToast();
  const [searchFilters, setSearchFilters] = useState<EmployeeSearchFilters>({
    status: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  // 使用 DaisyUI 样式系统
  const cardClasses = 'card bg-base-100 shadow-lg border border-base-200';

  // 获取部门员工数据
  const { 
    data: employees = [], 
    isLoading, 
    error,
    refetch 
  } = useDepartmentEmployees(department.id);

  // 过滤员工数据
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    // 按姓名搜索
    if (searchFilters.name?.trim()) {
      const searchTerm = searchFilters.name.toLowerCase().trim();
      filtered = filtered.filter(emp => 
        emp.name?.toLowerCase().includes(searchTerm) ||
        emp.employee_id?.toLowerCase().includes(searchTerm)
      );
    }

    // 按职位搜索
    if (searchFilters.position?.trim()) {
      const positionTerm = searchFilters.position.toLowerCase().trim();
      filtered = filtered.filter(emp => 
        emp.position_name?.toLowerCase().includes(positionTerm)
      );
    }

    // 按状态过滤
    if (searchFilters.status && searchFilters.status !== 'all') {
      filtered = filtered.filter(emp => emp.status === searchFilters.status);
    }

    // 按人员类别过滤
    if (searchFilters.category?.trim()) {
      const categoryTerm = searchFilters.category.toLowerCase().trim();
      filtered = filtered.filter(emp => 
        emp.personnel_category?.toLowerCase().includes(categoryTerm)
      );
    }

    return filtered;
  }, [employees, searchFilters]);

  // 处理员工操作
  const handleEmployeeAction = useCallback(async (action: string, employee: DepartmentEmployee) => {
    switch (action) {
      case 'view':
        showInfo(`查看员工: ${employee.name}`);
        break;
      case 'edit':
        showInfo(`编辑员工: ${employee.name}`);
        break;
      case 'remove':
        if (confirm(`确定要将员工 ${employee.name} 从部门 ${department.name} 中移除吗？`)) {
          showSuccess(`已将 ${employee.name} 从部门中移除`);
          refetch();
        }
        break;
      case 'transfer':
        showInfo(`转移员工: ${employee.name}`);
        break;
      default:
        console.warn('未知操作:', action);
    }
  }, [department.name, showInfo, showSuccess, refetch]);

  // 添加员工到部门
  const handleAddEmployee = useCallback(() => {
    showInfo('添加员工功能开发中...');
  }, [showInfo]);

  // 批量操作
  const handleBatchTransfer = useCallback(() => {
    showInfo('批量转移功能开发中...');
  }, [showInfo]);

  // 定义表格列
  const columns = useMemo(() => [
    {
      accessorKey: 'employee_id',
      header: '工号',
      size: 100,
      cell: ({ row }: any) => (
        <span className="font-mono text-sm">{row.original.employee_id}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: '姓名',
      size: 120,
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <UsersIcon className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'position_name',
      header: '职位',
      size: 150,
    },
    {
      accessorKey: 'personnel_category',
      header: '人员类别',
      size: 120,
      cell: ({ row }: any) => (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-background-secondary text-text-secondary">
          {row.original.personnel_category}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: '状态',
      size: 80,
      cell: ({ row }: any) => {
        const status = row.original.status;
        const statusConfig = {
          active: { label: '在职', className: 'bg-success/10 text-success' },
          inactive: { label: '离职', className: 'bg-error/10 text-error' },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || 
                     { label: status, className: 'bg-background-secondary text-text-secondary' };
        
        return (
          <span className={cn(
            'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium',
            config.className
          )}>
            {config.label}
          </span>
        );
      },
    },
    {
      accessorKey: 'assignment_start_date',
      header: '入职日期',
      size: 120,
      cell: ({ row }: any) => {
        const date = row.original.assignment_start_date;
        return date ? new Date(date).toLocaleDateString('zh-CN') : '-';
      },
    },
    {
      id: 'actions',
      header: '操作',
      size: 120,
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <ModernButton
            variant="ghost"
            size="sm"
            onClick={() => handleEmployeeAction('view', row.original)}
          >
            <EyeIcon className="w-4 h-4" />
          </ModernButton>
          <ModernButton
            variant="ghost"
            size="sm"
            onClick={() => handleEmployeeAction('edit', row.original)}
          >
            <PencilSquareIcon className="w-4 h-4" />
          </ModernButton>
          <ModernButton
            variant="ghost"
            size="sm"
            onClick={() => handleEmployeeAction('remove', row.original)}
          >
            <TrashIcon className="w-4 h-4 text-error" />
          </ModernButton>
        </div>
      ),
    },
  ], [handleEmployeeAction]);

  if (error) {
    return (
      <div className={cn(cardClasses, 'p-6 text-center', className)}>
        <div className="text-error">
          <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium mb-2">加载员工数据失败</p>
          <p className="text-sm opacity-70">{error.message}</p>
          <ModernButton
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="mt-3"
          >
            重试
          </ModernButton>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 标题和操作栏 */}
      <div className={cn(cardClasses, 'p-4')}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-base-content">
                部门员工
              </h3>
              <p className="text-sm text-base-content/70">
                管理 {department.name} 的员工分配
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ModernButton
              variant="ghost"
              size="sm"
              onClick={handleBatchTransfer}
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
              批量转移
            </ModernButton>
            <ModernButton
              variant="primary"
              size="sm"
              onClick={handleAddEmployee}
            >
              <UserPlusIcon className="w-4 h-4 mr-2" />
              添加员工
            </ModernButton>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
              <input
                type="text"
                placeholder="搜索员工姓名或工号..."
                value={searchFilters.name || ''}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, name: e.target.value }))}
                className="input input-bordered w-full pl-10 focus:input-primary"
              />
            </div>
            
            <ModernButton
              variant={showFilters ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              筛选
            </ModernButton>
          </div>

          {/* 高级筛选 */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-base-200 rounded-lg">
              <input
                type="text"
                placeholder="职位搜索..."
                value={searchFilters.position || ''}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, position: e.target.value }))}
                className="input input-bordered input-sm w-full"
              />
              
              <select
                value={searchFilters.status || 'all'}
                onChange={(e) => setSearchFilters(prev => ({ 
                  ...prev, 
                  status: e.target.value as any 
                }))}
                className="select select-bordered select-sm w-full"
              >
                <option value="all">全部状态</option>
                <option value="active">在职</option>
                <option value="inactive">离职</option>
              </select>
              
              <input
                type="text"
                placeholder="人员类别..."
                value={searchFilters.category || ''}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, category: e.target.value }))}
                className="input input-bordered input-sm w-full"
              />
            </div>
          )}
        </div>

        {/* 统计信息 */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-base-300">
          <div className="text-sm">
            <span className="text-base-content/70">总员工: </span>
            <span className="font-semibold text-base-content">{employees.length}</span>
          </div>
          <div className="text-sm">
            <span className="text-base-content/70">在职: </span>
            <span className="font-semibold text-success">
              {employees.filter(emp => emp.status === 'active').length}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-base-content/70">离职: </span>
            <span className="font-semibold text-error">
              {employees.filter(emp => emp.status === 'inactive').length}
            </span>
          </div>
          {filteredEmployees.length !== employees.length && (
            <div className="text-sm">
              <span className="text-base-content/70">筛选结果: </span>
              <span className="font-semibold text-primary">{filteredEmployees.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* 员工表格 */}
      <div className={cardClasses}>
        <DataTable
          data={filteredEmployees}
          columns={columns}
          loading={isLoading}
          className="border-none"
        />
      </div>
    </div>
  );
}