import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useEmployeeTable } from '@/hooks/employee/useEmployeeTable';
import { ManagementPageLayout, type StatCardProps } from '@/components/layout/ManagementPageLayout';
import { DataTable } from '@/components/common/DataTable';
import { ModernButton } from '@/components/common/ModernButton';
import { EmployeeModal } from '@/components/employee/EmployeeDetailModal';
import { EmployeeExport } from '@/components/employee/EmployeeExport';
import { RealtimeIndicator } from '@/components/common/RealtimeIndicator';
import { ColumnVisibility } from '@/components/common/DataTable/components/ColumnVisibility';
import { 
  UserPlusIcon, 
  EyeIcon, 
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import type { EmployeeListItem } from '@/types/employee';

export default function EmployeeListPage() {
  const { t } = useTranslation(['employee', 'common']);
  
  // 页面状态
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [tableInstance, setTableInstance] = useState<any>(null);
  
  // 使用ref存储删除函数，避免循环依赖
  const deleteEmployeeRef = useRef<((id: string) => Promise<void>) | null>(null);

  // 事件处理函数 - 必须在Hook之前定义
  const handleViewEmployee = useCallback((employee: EmployeeListItem) => {
    setSelectedEmployee(employee);
    setIsEmployeeModalOpen(true);
  }, []);

  const handleEditEmployee = useCallback((employee: EmployeeListItem) => {
    setSelectedEmployee(employee);
    setIsEmployeeModalOpen(true);
  }, []);
  
  // 删除操作回调
  const handleDeleteAction = useCallback(async (employee: any) => {
    if (window.confirm(`确定要删除员工 ${employee.employee_name} 吗？`)) {
      try {
        if (deleteEmployeeRef.current) {
          await deleteEmployeeRef.current(employee.employee_id);
        }
      } catch (error) {
        console.error('删除员工失败:', error);
      }
    }
  }, []);

  // 🚀 使用新架构的员工表格 Hook
  const {
    // 数据和列
    data,
    columns,
    loading,
    error,
    
    // 统计信息
    statistics,
    
    // 操作方法
    createEmployee,
    updateEmployee,
    deleteEmployee,
    batchUpdate,
    batchDelete,
    
    // 表格配置
    preferences,
    updateColumnPreference,
    toggleColumnVisibility,
    resetPreferences,
    
    // 其他信息
    visibleColumns,
    searchableFields,
    currentFilters,
    refetch,
  } = useEmployeeTable({
    enableRowSelection: true,
    enableActions: true,
    permissions: ['view', 'create', 'edit', 'delete'],
    showSensitiveData,
    statusFilter,
    // 操作回调
    onViewEmployee: handleViewEmployee,
    onEditEmployee: handleEditEmployee,
    onDeleteEmployee: handleDeleteAction,
    // 不使用 JSX 的列覆盖，改用操作按钮
    columnTypeOverrides: {},
  });
  
  // 更新删除函数ref
  useEffect(() => {
    deleteEmployeeRef.current = deleteEmployee;
  }, [deleteEmployee]);

  // 其他删除员工的处理逻辑（用于其他地方调用）
  const handleDeleteEmployee = useCallback(async (employeeId: string) => {
    if (window.confirm('确定要删除这名员工吗？')) {
      try {
        await deleteEmployee(employeeId);
      } catch (error) {
        console.error('删除员工失败:', error);
      }
    }
  }, [deleteEmployee]);

  const handleCreateEmployee = () => {
    setSelectedEmployee(null);
    setIsEmployeeModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEmployeeModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleSaveEmployee = async (employeeData: any) => {
    try {
      if (selectedEmployee) {
        // 更新现有员工
        await updateEmployee(selectedEmployee.employee_id, employeeData);
      } else {
        // 创建新员工
        await createEmployee(employeeData);
      }
      handleCloseModal();
    } catch (error) {
      console.error('保存员工失败:', error);
    }
  };

  // 将Hook系统的用户偏好转换为TanStack Table的VisibilityState格式
  const initialColumnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {};
    Object.entries(preferences).forEach(([columnId, pref]) => {
      if (pref?.visible !== undefined) {
        visibility[columnId] = pref.visible;
      }
    });
    return visibility;
  }, [preferences]);

  // 统计卡片数据
  const statCards: StatCardProps[] = useMemo(() => [
    {
      title: '总员工数',
      value: statistics.total,
      change: '+0',
      trend: 'stable' as const,
      icon: '👥',
    },
    {
      title: '在职员工',
      value: statistics.active,
      change: '+0',
      trend: 'stable' as const,
      icon: '✅',
    },
    {
      title: '离职员工',
      value: statistics.inactive,
      change: '+0',
      trend: 'stable' as const,
      icon: '❌',
    },
    {
      title: '部门数量',
      value: statistics.departments,
      change: '+0',
      trend: 'stable' as const,
      icon: '🏢',
    },
  ], [statistics]);

  // 页面操作按钮
  const pageActions = (
    <div className="flex gap-2">
      {/* 敏感数据开关 */}
      <div className="form-control">
        <label className="label cursor-pointer gap-2">
          <span className="label-text text-sm">敏感数据</span>
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={showSensitiveData}
            onChange={(e) => setShowSensitiveData(e.target.checked)}
          />
        </label>
      </div>

      {/* 状态筛选 */}
      <select
        className="select select-sm select-bordered"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as any)}
      >
        <option value="active">在职员工</option>
        <option value="inactive">离职员工</option>
        <option value="all">全部员工</option>
      </select>

      {/* 列配置 - 使用TanStack Table标准组件 */}
      {tableInstance && (
        <ColumnVisibility 
          table={tableInstance}
          onVisibilityChange={(visibility) => {
            // 同步到Hook系统的用户偏好
            Object.entries(visibility).forEach(([columnId, isVisible]) => {
              if (preferences[columnId]?.visible !== isVisible) {
                toggleColumnVisibility(columnId);
              }
            });
          }}
        />
      )}

      {/* 导出功能 */}
      {tableInstance && (
        <EmployeeExport 
          table={tableInstance}
          fileName="employees"
        />
      )}

      {/* 添加员工按钮 */}
      <ModernButton
        variant="primary"
        onClick={handleCreateEmployee}
        icon={<UserPlusIcon className="w-4 h-4" />}
      >
        添加员工
      </ModernButton>
    </div>
  );

  return (
    <>
      <ManagementPageLayout
        title="员工管理"
        subtitle={`管理 ${statistics.total} 名员工的基本信息、部门分配和状态`}
        statCards={statCards}
        primaryActions={[pageActions]}
        loading={loading}
        error={error?.message}
        // 表格数据
        data={data as EmployeeListItem[]}
        columns={columns}
        // 表格配置
        initialSorting={[{ id: 'employee_name', desc: false }]}
        initialPagination={{ pageSize: 20, pageIndex: 0 }}
        initialColumnVisibility={initialColumnVisibility}
        enableRowSelection={true}
        onRowSelectionChange={() => {}}
        onTableReady={setTableInstance}
        striped={true}
      />

      {/* 员工详情/编辑模态框 */}
      {isEmployeeModalOpen && (
        <EmployeeModal
          mode={selectedEmployee ? 'edit' : 'create'}
          employeeId={selectedEmployee?.employee_id || null}
          open={isEmployeeModalOpen}
          onClose={handleCloseModal}
          onSuccess={() => {
            handleCloseModal();
            refetch(); // 刷新数据
          }}
        />
      )}
    </>
  );
}