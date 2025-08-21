import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useEmployeeTable } from '@/hooks/employee/useEmployeeTable';
import { ManagementPageLayout, type StatCardProps } from '@/components/layout/ManagementPageLayout';
import { ModernButton } from '@/components/common/ModernButton';
import { 
  EmployeeTableContainer,
  EmployeeToolbar,
  EmployeeDetailModalPro as EmployeeModal,
  type BaseEmployeeData,
  type EmployeeStatusOption,
  type DepartmentOption,
  type EmployeeSearchConfig,
  type EmployeeToolbarActionConfig
} from '@/components/employee';
import { RealtimeIndicator } from '@/components/common/RealtimeIndicator';
import { ColumnVisibility } from '@/components/common/DataTable/components/ColumnVisibility';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/core';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import type { EmployeeListItem } from '@/types/employee';
import type { Table } from '@tanstack/react-table';

export default function EmployeeListPageOptimized() {
  const { t } = useTranslation(['employee', 'common']);
  const { dialogState, loading: confirmLoading, hideConfirm, confirmDelete } = useConfirmDialog();
  
  // 页面状态
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [tableInstance, setTableInstance] = useState<Table<BaseEmployeeData> | null>(null);
  
  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  
  // 选择状态
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // 使用ref存储删除函数，避免循环依赖
  const deleteEmployeeRef = useRef<((id: string) => Promise<void>) | null>(null);

  // 事件处理函数 - 必须在Hook之前定义
  const handleViewEmployee = useCallback((employee: EmployeeListItem) => {
    setSelectedEmployee(employee);
    setModalMode('view');
    setIsEmployeeModalOpen(true);
  }, []);

  const handleEditEmployee = useCallback((employee: EmployeeListItem) => {
    setSelectedEmployee(employee);
    setModalMode('edit');
    setIsEmployeeModalOpen(true);
  }, []);
  
  // 删除操作回调
  const handleDeleteAction = useCallback(async (employee: any) => {
    await confirmDelete(`员工 "${employee.employee_name}"`, async () => {
      try {
        if (deleteEmployeeRef.current) {
          await deleteEmployeeRef.current(employee.employee_id);
        }
      } catch (error) {
        console.error('删除员工失败:', error);
        throw error;
      }
    });
  }, [confirmDelete]);

  // 使用新架构的员工表格 Hook
  const {
    data,
    columns,
    loading,
    error,
    statistics,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    batchUpdate,
    batchDelete,
    preferences,
    updateColumnPreference,
    toggleColumnVisibility,
    resetPreferences,
    initialColumnVisibility,
    visibleColumns,
    searchableFields,
    currentFilters,
    refetch,
  } = useEmployeeTable({
    enableRowSelection: true,
    enableActions: true,
    permissions: ['view', 'create', 'edit', 'delete'],
    onViewEmployee: handleViewEmployee,
    onEditEmployee: handleEditEmployee,
    onDeleteEmployee: handleDeleteAction,
    columnTypeOverrides: {},
    // 搜索和筛选参数 - 暂时注释掉不支持的参数
    // searchQuery,
    statusFilter: statusFilter === 'all' ? undefined : statusFilter as any,
    departmentFilter: departmentFilter === 'all' ? undefined : departmentFilter,
    // positionFilter: positionFilter === 'all' ? undefined : positionFilter,
  });
  
  // 更新删除函数ref
  useEffect(() => {
    deleteEmployeeRef.current = deleteEmployee;
  }, [deleteEmployee]);

  // 员工操作处理
  const handleCreateEmployee = useCallback(() => {
    setSelectedEmployee(null);
    setModalMode('create');
    setIsEmployeeModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsEmployeeModalOpen(false);
    setSelectedEmployee(null);
  }, []);

  const handleSaveEmployee = useCallback(async (employeeData: any) => {
    try {
      if (selectedEmployee) {
        await updateEmployee(selectedEmployee.employee_id, employeeData);
      } else {
        await createEmployee(employeeData);
      }
      handleCloseModal();
    } catch (error) {
      console.error('保存员工失败:', error);
    }
  }, [selectedEmployee, updateEmployee, createEmployee, handleCloseModal]);

  // 搜索和筛选处理
  const handleSearch = useCallback(() => {
    // 搜索逻辑已通过 useEmployeeTable Hook 处理
    console.log('执行搜索:', { searchQuery, statusFilter, departmentFilter, positionFilter });
  }, [searchQuery, statusFilter, departmentFilter, positionFilter]);

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setPositionFilter('all');
    setSelectedIds([]);
  }, []);

  // 批量操作处理
  const handleBatchEdit = useCallback((records: BaseEmployeeData[]) => {
    console.log('批量编辑:', records);
    // TODO: 实现批量编辑逻辑
  }, []);

  const handleBatchDelete = useCallback(async (records: BaseEmployeeData[]) => {
    await confirmDelete(`${records.length} 名员工`, async () => {
      try {
        const ids = records.map(r => r.employee_id!);
        await batchDelete(ids);
        setSelectedIds([]);
      } catch (error) {
        console.error('批量删除失败:', error);
        throw error;
      }
    });
  }, [batchDelete, confirmDelete]);

  const handleBatchExport = useCallback((records: BaseEmployeeData[]) => {
    if (tableInstance) {
      // 使用已有的导出功能
      console.log('批量导出:', records);
    }
  }, [tableInstance]);

  const handleBatchStatusChange = useCallback(async (records: BaseEmployeeData[], status: string) => {
    try {
      const ids = records.map(r => (r as any).employee_id!);
      const updates = { employment_status: status === 'active' ? 'active' : 'inactive' };
      await batchUpdate(ids, updates);
      setSelectedIds([]);
    } catch (error) {
      console.error('批量状态变更失败:', error);
    }
  }, [batchUpdate]);

  // 获取选中的记录
  const selectedRecords = useMemo(() => {
    return data.filter(item => selectedIds.includes((item as any).employee_id || ''));
  }, [data, selectedIds]);

  // 状态选项配置
  const statusOptions: EmployeeStatusOption[] = useMemo(() => [
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '在职', color: 'success' },
    { value: 'inactive', label: '离职', color: 'error' },
    { value: 'suspended', label: '停职', color: 'warning' },
  ], []);

  // 部门选项配置（从统计数据或其他地方获取）
  const departmentOptions: DepartmentOption[] = useMemo(() => {
    // TODO: 从实际数据中提取部门列表
    return [
      { value: 'all', label: '全部部门' },
      { value: '1', label: '管理部门' },
      { value: '2', label: '技术部门' },
      { value: '3', label: '销售部门' },
    ];
  }, []);

  // 职位选项配置
  const positionOptions: DepartmentOption[] = useMemo(() => {
    // TODO: 从实际数据中提取职位列表
    return [
      { value: 'all', label: '全部职位' },
      { value: '1', label: '经理' },
      { value: '2', label: '主管' },
      { value: '3', label: '员工' },
    ];
  }, []);

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

  // 搜索配置
  const searchConfig: EmployeeSearchConfig = useMemo(() => ({
    searchQuery,
    onSearchQueryChange: setSearchQuery,
    onSearch: handleSearch,
    placeholder: "搜索员工姓名、部门、职位等...",
    loading
  }), [searchQuery, handleSearch, loading]);

  // 主要操作配置
  const primaryActions: EmployeeToolbarActionConfig[] = useMemo(() => [
    {
      key: 'add-employee',
      label: '添加员工',
      onClick: handleCreateEmployee,
      icon: <UserPlusIcon className="w-4 h-4" />,
      variant: 'primary',
      title: '创建新员工记录'
    }
  ], [handleCreateEmployee]);

  return (
    <>
      <ManagementPageLayout
        title="员工管理"
        subtitle={`管理 ${statistics.total} 名员工的基本信息、部门分配和状态`}
        statCards={statCards}
        loading={loading}
        error={error?.message}
        customContent={
          <div className="space-y-6">
          {/* 统一工具栏 - 与薪资管理页面一致的设计 */}
          <div className="border border-base-200 rounded-lg bg-base-100 p-4">
            <EmployeeToolbar
              searchConfig={searchConfig}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              departmentFilter={departmentFilter}
              onDepartmentFilterChange={setDepartmentFilter}
              tableInstance={tableInstance}
              primaryActions={primaryActions}
            />
          </div>

          {/* 批量操作组件 - 条件显示 */}
          {selectedIds.length > 0 && (
            <div className="card bg-base-100 shadow-sm border border-base-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">
                    已选择 <span className="text-primary font-semibold">{selectedIds.length}</span> 个项目
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelectedIds([])}
                    title="清除选择"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    清除
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <ModernButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleBatchEdit(selectedRecords)}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    }
                  >
                    批量编辑
                  </ModernButton>
                  <ModernButton
                    variant="primary"
                    size="sm"
                    onClick={() => handleBatchStatusChange(selectedRecords, 'active')}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  >
                    批量状态变更
                  </ModernButton>
                  <ModernButton
                    variant="danger"
                    size="sm"
                    onClick={() => handleBatchDelete(selectedRecords)}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    }
                  >
                    批量删除
                  </ModernButton>
                  <ModernButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleBatchExport(selectedRecords)}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    }
                  >
                    导出选中
                  </ModernButton>
                </div>
              </div>
            </div>
          )}

          {/* 员工表格容器 - DataTable 已包含卡片样式 */}
          <EmployeeTableContainer
            data={data}
            columns={columns}
            loading={loading}
            error={error?.message}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            enableRowSelection={true}
            onTableReady={setTableInstance as any}
            initialSorting={[{ id: 'employee_name', desc: false }]}
            initialPagination={{ pageSize: 20, pageIndex: 0 }}
            initialColumnVisibility={initialColumnVisibility}
            striped={true}
          />
        </div>
        }
      />

      {/* 员工详情/编辑模态框 */}
      {isEmployeeModalOpen && (
        <EmployeeModal
          mode={modalMode}
          employeeId={selectedEmployee?.employee_id || null}
          open={isEmployeeModalOpen}
          onClose={handleCloseModal}
          onSuccess={() => {
            handleCloseModal();
            refetch();
          }}
        />
      )}

      {/* 确认对话框 */}
      <ConfirmDialog
        open={dialogState.open}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        confirmVariant={dialogState.confirmVariant}
        onConfirm={dialogState.onConfirm || (() => {})}
        onCancel={hideConfirm}
        loading={confirmLoading}
      />
    </>
  );
}