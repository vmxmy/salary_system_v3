import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../components/common/DataTable';
import { SearchInput } from '../../components/common/SearchInput';
import { LoadingSpinner, ButtonLoading } from '../../components/common/LoadingSpinner';
import { useEmployees } from '../../hooks/useEmployees';
import { useEmployeeLookups } from '../../hooks/useEmployeeLookups';
import { useBulkEmployeeActions } from '../../hooks/useEmployee';
import { useAuth } from '../../contexts/AuthContext';
import type { EmployeeWithDetails, UserPermissions } from '../../types/employee';

export default function EmployeeListPage() {
  const { user } = useAuth();
  const [selectedEmployees, setSelectedEmployees] = useState<EmployeeWithDetails[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // 用户权限（暂时硬编码，后续从认证上下文获取）
  const permissions: UserPermissions = {
    canViewSensitiveData: true, // 基于用户角色判断
    canEditEmployee: true,
    canDeleteEmployee: true,
    canCreateEmployee: true,
    canExportData: true
  };

  // 员工数据管理
  const {
    data: employees,
    loading,
    error,
    pagination,
    setPage,
    setPageSize,
    searchEmployees,
    updateFilters,
    refresh
  } = useEmployees({
    initialPageSize: 20,
    enableRealtime: true
  });

  // 查找数据
  const {
    departments,
    positions,
    personnelCategories,
    departmentOptions,
    positionOptions,
    personnelCategoryOptions
  } = useEmployeeLookups();

  // 批量操作
  const { bulkDelete, processing: bulkProcessing } = useBulkEmployeeActions();

  // 表格列定义
  const columns = useMemo<ColumnDef<EmployeeWithDetails>[]>(() => [
    // 选择列
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
      enableGlobalFilter: false,
    },
    
    // 工号
    {
      accessorKey: 'employee_code',
      header: '工号',
      cell: ({ getValue, row }) => (
        <Link
          to={`/employees/${row.original.id}`}
          className="link link-primary font-medium"
        >
          {getValue<string>()}
        </Link>
      ),
    },
    
    // 姓名
    {
      accessorKey: 'full_name',
      header: '姓名',
      cell: ({ getValue, row }) => (
        <div className="flex items-center gap-2">
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content rounded-full w-8">
              <span className="text-xs">{getValue<string>()?.charAt(0)}</span>
            </div>
          </div>
          <span className="font-medium">{getValue<string>()}</span>
        </div>
      ),
    },
    
    // 性别
    {
      accessorKey: 'gender',
      header: '性别',
      cell: ({ getValue }) => {
        const gender = getValue<string>();
        return (
          <span className={`badge badge-sm ${gender === '男' ? 'badge-info' : 'badge-secondary'}`}>
            {gender || '未知'}
          </span>
        );
      },
    },
    
    // 部门
    {
      accessorKey: 'department_name',
      header: '部门',
      cell: ({ getValue }) => (
        <span className="text-sm">{getValue<string>() || '未分配'}</span>
      ),
    },
    
    // 职位
    {
      accessorKey: 'position_name',
      header: '职位',
      cell: ({ getValue }) => (
        <span className="text-sm">{getValue<string>() || '未分配'}</span>
      ),
    },
    
    // 人员类别
    {
      accessorKey: 'personnel_category_name',
      header: '人员类别',
      cell: ({ getValue }) => {
        const category = getValue<string>();
        return (
          <span className="badge badge-outline badge-sm">
            {category || '未分类'}
          </span>
        );
      },
    },
    
    // 入职日期
    {
      accessorKey: 'hire_date',
      header: '入职日期',
      cell: ({ getValue }) => {
        const date = getValue<string>();
        return date ? new Date(date).toLocaleDateString('zh-CN') : '-';
      },
    },
    
    // 状态
    {
      accessorKey: 'employee_status',
      header: '状态',
      cell: ({ getValue }) => {
        const status = getValue<string>();
        const statusConfig = {
          active: { label: '在职', class: 'badge-success' },
          inactive: { label: '休假', class: 'badge-warning' },
          terminated: { label: '离职', class: 'badge-error' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || 
                     { label: '未知', class: 'badge-ghost' };
        
        return (
          <span className={`badge badge-sm ${config.class}`}>
            {config.label}
          </span>
        );
      },
    },
    
    // 身份证号（敏感数据）
    ...(permissions.canViewSensitiveData ? [{
      accessorKey: 'id_number_masked',
      header: '身份证号',
      cell: ({ getValue }: { getValue: () => string }) => {
        const idNumber = getValue();
        return (
          <span className="text-sm font-mono">
            {idNumber || '****'}
          </span>
        );
      },
    }] : []),
    
    // 操作列
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Link
            to={`/employees/${row.original.id}`}
            className="btn btn-ghost btn-xs"
            title="查看详情"
          >
            查看
          </Link>
          {permissions.canEditEmployee && (
            <Link
              to={`/employees/${row.original.id}/edit`}
              className="btn btn-ghost btn-xs"
              title="编辑"
            >
              编辑
            </Link>
          )}
          {permissions.canDeleteEmployee && (
            <button
              className="btn btn-ghost btn-xs text-error"
              onClick={() => handleDeleteEmployee(row.original)}
              title="删除"
            >
              删除
            </button>
          )}
        </div>
      ),
      enableSorting: false,
      enableGlobalFilter: false,
    },
  ], [permissions]);

  // 处理搜索
  const handleSearch = (searchTerm: string) => {
    searchEmployees(searchTerm);
  };

  // 处理删除单个员工
  const handleDeleteEmployee = async (employee: EmployeeWithDetails) => {
    if (confirm(`确定要删除员工 ${employee.full_name} 吗？`)) {
      try {
        // 这里应该调用删除API
        console.log('删除员工:', employee);
        await refresh();
      } catch (error) {
        console.error('删除失败:', error);
      }
    }
  };

  // 处理批量删除
  const handleBulkDelete = async () => {
    if (selectedEmployees.length === 0) return;
    
    const confirmMessage = `确定要删除选中的 ${selectedEmployees.length} 名员工吗？`;
    if (confirm(confirmMessage)) {
      try {
        const ids = selectedEmployees.map(emp => emp.id);
        await bulkDelete(ids);
        setSelectedEmployees([]);
        setShowBulkActions(false);
        await refresh();
      } catch (error) {
        console.error('批量删除失败:', error);
      }
    }
  };

  // 处理批量导出
  const handleBulkExport = () => {
    if (selectedEmployees.length === 0) return;
    
    // 导出逻辑
    console.log('导出员工数据:', selectedEmployees);
  };

  // 监听选择变化
  const handleRowSelectionChange = (selected: EmployeeWithDetails[]) => {
    setSelectedEmployees(selected);
    setShowBulkActions(selected.length > 0);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-error mb-2">加载失败</div>
          <div className="text-sm text-base-content/70 mb-4">{error}</div>
          <button className="btn btn-primary" onClick={refresh}>
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">员工管理</h1>
          <p className="text-base-content/70">
            管理员工基本信息、部门分配和工作状态
          </p>
        </div>
        
        <div className="flex gap-2">
          {permissions.canCreateEmployee && (
            <Link to="/employees/create" className="btn btn-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建员工
            </Link>
          )}
          
          {permissions.canExportData && (
            <button className="btn btn-outline">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              导出
            </button>
          )}
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1">
              <SearchInput
                placeholder="搜索员工姓名或工号..."
                onChange={handleSearch}
                loading={loading}
              />
            </div>
            
            {/* 过滤器 */}
            <div className="flex gap-2">
              <select
                className="select select-bordered"
                onChange={(e) => updateFilters({ department_id: e.target.value || undefined })}
              >
                <option value="">全部部门</option>
                {departmentOptions.map(dept => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
              
              <select
                className="select select-bordered"
                onChange={(e) => updateFilters({ personnel_category_id: e.target.value || undefined })}
              >
                <option value="">全部类别</option>
                {personnelCategoryOptions.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              
              <select
                className="select select-bordered"
                onChange={(e) => updateFilters({ employee_status: e.target.value as any || undefined })}
              >
                <option value="">全部状态</option>
                <option value="active">在职</option>
                <option value="inactive">休假</option>
                <option value="terminated">离职</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 批量操作栏 */}
      {showBulkActions && (
        <div className="alert alert-info">
          <div className="flex-1">
            <span>已选择 {selectedEmployees.length} 名员工</span>
          </div>
          <div className="flex gap-2">
            {permissions.canExportData && (
              <button
                className="btn btn-sm btn-outline"
                onClick={handleBulkExport}
              >
                导出选中
              </button>
            )}
            {permissions.canDeleteEmployee && (
              <ButtonLoading
                loading={bulkProcessing}
                onClick={handleBulkDelete}
                variant="outline"
                size="sm"
                className="text-error border-error hover:bg-error hover:text-error-content"
              >
                批量删除
              </ButtonLoading>
            )}
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setSelectedEmployees([]);
                setShowBulkActions(false);
              }}
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      {/* 数据表格 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body p-0">
          <DataTable
            data={employees}
            columns={columns}
            loading={loading}
            pagination={{
              pageIndex: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
            }}
            selection={{
              enableRowSelection: true,
              onRowSelectionChange: handleRowSelectionChange,
            }}
            sorting={{
              enableSorting: true,
            }}
            emptyMessage="暂无员工数据"
            className="overflow-hidden"
          />
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">总员工数</div>
          <div className="stat-value text-primary">{pagination.total}</div>
          <div className="stat-desc">包含所有状态</div>
        </div>
        
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">在职员工</div>
          <div className="stat-value text-success">
            {employees.filter(emp => emp.employee_status === 'active').length}
          </div>
          <div className="stat-desc">当前在职</div>
        </div>
        
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">部门数量</div>
          <div className="stat-value text-info">{departments.length}</div>
          <div className="stat-desc">活跃部门</div>
        </div>
        
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">职位数量</div>
          <div className="stat-value text-warning">{positions.length}</div>
          <div className="stat-desc">活跃职位</div>
        </div>
      </div>
    </div>
  );
}