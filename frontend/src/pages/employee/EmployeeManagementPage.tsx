import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useEmployeeTable } from '@/hooks/employee/useEmployeeTable';
import { ManagementPageLayout } from '@/components/layout/ManagementPageLayout';
import { 
  EmployeeTableContainer,
  EmployeeDetailModalPro as EmployeeModal,
  type BaseEmployeeData,
} from '@/components/employee';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/core';
import { UserPlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { createDataTableColumnHelper } from '@/components/common/DataTable/utils';
import type { EmployeeListItem } from '@/types/employee';
import * as XLSX from 'xlsx';

/**
 * 员工管理页面
 * 完全按照薪资管理页面的结构和样式重建
 */
export default function EmployeeManagementPage() {
  const { t } = useTranslation(['employee', 'common']);
  const { dialogState, loading: confirmLoading, hideConfirm, confirmDelete } = useConfirmDialog();
  
  // 页面状态
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  
  // 删除函数引用
  const deleteEmployeeRef = useRef<((id: string) => Promise<void>) | null>(null);

  // 事件处理函数
  const handleViewEmployee = useCallback((employee: BaseEmployeeData) => {
    setSelectedEmployee(employee as EmployeeListItem);
    setModalMode('view');
    setIsEmployeeModalOpen(true);
  }, []);

  const handleEditEmployee = useCallback((employee: BaseEmployeeData) => {
    setSelectedEmployee(employee as EmployeeListItem);
    setModalMode('edit');
    setIsEmployeeModalOpen(true);
  }, []);
  
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

  // 使用员工表格 Hook
  const {
    data: allData,
    loading,
    error,
    statistics,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    batchUpdate,
    batchDelete,
    refetch,
  } = useEmployeeTable({
    enableRowSelection: true,
    enableActions: true,
    permissions: ['view', 'create', 'edit', 'delete'],
    onViewEmployee: handleViewEmployee,
    onEditEmployee: handleEditEmployee,
    onDeleteEmployee: handleDeleteAction,
    statusFilter: statusFilter === 'all' ? undefined : statusFilter as any,
  });

  // 客户端搜索和筛选处理
  const data = useMemo(() => {
    let filteredData = [...(allData || [])];
    
    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredData = filteredData.filter((item: any) => {
        return (
          item.employee_name?.toLowerCase().includes(query) ||
          item.department_name?.toLowerCase().includes(query) ||
          item.position_name?.toLowerCase().includes(query) ||
          item.category_name?.toLowerCase().includes(query) ||
          item.employment_status?.toLowerCase().includes(query)
        );
      });
    }
    
    return filteredData;
  }, [allData, searchQuery]);
  
  // 更新删除函数引用
  useEffect(() => {
    deleteEmployeeRef.current = deleteEmployee;
  }, [deleteEmployee]);

  // 创建选择列配置
  const selectColumn = useMemo(() => ({
    id: 'select',
    header: ({ table }: any) => {
      const isAllSelected = data.length > 0 && selectedIds.length === data.length;
      const isIndeterminate = selectedIds.length > 0 && selectedIds.length < data.length;
      
      return (
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={isAllSelected}
          ref={(el) => {
            if (el) el.indeterminate = isIndeterminate;
          }}
          onChange={(e) => {
            if (e.target.checked) {
              // 全选：选择所有数据
              const allIds = data.map(item => (item as any).employee_id).filter(Boolean) as string[];
              setSelectedIds(allIds);
            } else {
              // 取消全选
              setSelectedIds([]);
            }
          }}
          title={isAllSelected ? "取消全选" : "全选所有数据"}
        />
      );
    },
    cell: ({ row }: any) => {
      const rowId = (row.original as any).employee_id;
      return (
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={selectedIds.includes(rowId)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedIds([...selectedIds, rowId]);
            } else {
              setSelectedIds(selectedIds.filter(id => id !== rowId));
            }
          }}
          title="选择此行"
        />
      );
    },
    size: 50,
    enableSorting: false,
    enableColumnFilter: false,
  }), [data, selectedIds]);

  // 创建操作列配置
  const actionsColumn = useMemo(() => ({
    id: 'actions',
    header: '操作',
    size: 120,
    enableSorting: false,
    enableColumnFilter: false,
    cell: ({ row }: { row: any }) => {
      const employee = row.original as BaseEmployeeData;
      return (
        <div className="flex gap-1">
          <button
            className="btn btn-ghost btn-xs text-primary"
            onClick={(e) => {
              e.stopPropagation();
              handleViewEmployee(employee);
            }}
            title="查看详情"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            className="btn btn-ghost btn-xs text-primary"
            onClick={(e) => {
              e.stopPropagation();
              handleEditEmployee(employee);
            }}
            title="编辑"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            className="btn btn-ghost btn-xs text-error"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteAction(employee);
            }}
            title="删除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      );
    }
  }), [handleViewEmployee, handleEditEmployee, handleDeleteAction]);

  // 创建表格列定义 - 与薪资管理页面保持一致
  const columnHelper = createDataTableColumnHelper<BaseEmployeeData>();
  const baseColumns = useMemo(() => [
    columnHelper.accessor('employee_name', {
      header: '员工姓名',
      cell: (info) => info.getValue()
    }),
    columnHelper.accessor('department_name', {
      header: '部门',
      cell: (info) => info.getValue() || '-'
    }),
    columnHelper.accessor('position_name', {
      header: '职位',
      cell: (info) => info.getValue() || '-'
    }),
    columnHelper.accessor('category_name', {
      header: '人员类别',
      cell: (info) => info.getValue() || '-'
    }),
    columnHelper.accessor('employment_status', {
      header: '状态',
      cell: (info) => {
        const status = info.getValue();
        const statusConfig = {
          active: { label: '在职', class: 'badge-success' },
          inactive: { label: '离职', class: 'badge-error' },
          suspended: { label: '停职', class: 'badge-warning' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || { label: status, class: 'badge-ghost' };
        return <span className={`badge ${config.class} badge-sm`}>{config.label}</span>;
      }
    }),
    columnHelper.accessor('hire_date', {
      header: '入职日期',
      cell: (info) => {
        const date = info.getValue();
        return date ? new Date(date).toLocaleDateString('zh-CN') : '-';
      }
    })
  ], [columnHelper]);

  // 组装完整的列配置
  const columns = useMemo(() => {
    const cols = [];
    
    // 添加选择列
    cols.push(selectColumn);
    
    // 添加基础列
    cols.push(...baseColumns);
    
    // 添加操作列
    cols.push(actionsColumn);
    
    return cols;
  }, [selectColumn, baseColumns, actionsColumn]);

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

  // 批量操作处理
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    
    await confirmDelete(`${selectedIds.length} 名员工`, async () => {
      try {
        await batchDelete(selectedIds);
        setSelectedIds([]);
      } catch (error) {
        console.error('批量删除失败:', error);
        throw error;
      }
    });
  }, [selectedIds, batchDelete, confirmDelete]);

  const handleBatchStatusChange = useCallback(async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    
    try {
      const updates = { employment_status: newStatus };
      await batchUpdate(selectedIds, updates);
      setSelectedIds([]);
    } catch (error) {
      console.error('批量状态变更失败:', error);
    }
  }, [selectedIds, batchUpdate]);

  // 通用Excel导出函数
  const generateExcelFile = useCallback(async (exportData: any[], filename: string) => {
    try {
      // 准备Excel数据
      const headers = ['员工姓名', '部门', '职位', '人员类别', '状态', '入职日期'];
      const worksheetData = [];
      
      // 添加表头
      worksheetData.push(headers);
      
      // 添加数据行
      exportData.forEach((row: any) => {
        const rowData = [
          row.employee_name || '',
          row.department_name || '',
          row.position_name || '',
          row.category_name || '',
          row.employment_status === 'active' ? '在职' : row.employment_status === 'inactive' ? '离职' : '停职',
          row.hire_date ? new Date(row.hire_date).toLocaleDateString('zh-CN') : ''
        ];
        worksheetData.push(rowData);
      });
      
      // 创建工作表
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // 设置列宽
      const columnWidths = [
        { wch: 12 }, // 员工姓名
        { wch: 15 }, // 部门
        { wch: 15 }, // 职位
        { wch: 12 }, // 人员类别
        { wch: 8 },  // 状态
        { wch: 12 }  // 入职日期
      ];
      worksheet['!cols'] = columnWidths;
      
      // 设置表头样式
      const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:F1');
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) continue;
        
        worksheet[cellAddress].s = {
          font: { bold: true },
          alignment: { horizontal: 'center' },
          fill: { fgColor: { rgb: 'E3F2FD' } }
        };
      }
      
      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '员工数据');
      
      // 生成Excel文件
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array',
        compression: true 
      });
      
      // 创建Blob并下载
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('Excel文件导出成功:', filename);
      
    } catch (error) {
      console.error('Excel导出失败:', error);
      alert('Excel导出失败，请重试');
    }
  }, []);

  // 导出处理函数
  const handleExportCSV = useCallback(() => {
    console.log('CSV导出被调用，数据长度：', data?.length);
    if (!data || data.length === 0) {
      alert('没有数据可导出');
      return;
    }
    
    // 简化的CSV导出
    const headers = ['员工姓名', '部门', '职位', '人员类别', '状态', '入职日期'];
    const csvContent = [
      '\uFEFF' + headers.join(','), // BOM for UTF-8
      ...data.map((row: any) => [
        row.employee_name || '',
        row.department_name || '',
        row.position_name || '',
        row.category_name || '',
        row.employment_status === 'active' ? '在职' : row.employment_status === 'inactive' ? '离职' : '停职',
        row.hire_date ? new Date(row.hire_date).toLocaleDateString('zh-CN') : ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `员工数据_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data]);

  const handleExportExcel = useCallback(async () => {
    console.log('Excel导出被调用，数据长度：', data?.length);
    if (!data || data.length === 0) {
      alert('没有数据可导出');
      return;
    }

    const filename = `员工数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
    await generateExcelFile(data, filename);
  }, [data, generateExcelFile]);

  const handleExportJSON = useCallback(() => {
    console.log('JSON导出被调用，数据长度：', data?.length);
    if (!data || data.length === 0) {
      alert('没有数据可导出');
      return;
    }
    
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `员工数据_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data]);

  const handleExportSelected = useCallback(async () => {
    if (selectedIds.length === 0) {
      alert('请先选择要导出的员工');
      return;
    }
    
    const selectedData = data.filter((item: any) => selectedIds.includes(item.employee_id));
    const filename = `员工数据_选中${selectedIds.length}项_${new Date().toISOString().slice(0, 10)}.xlsx`;
    
    await generateExcelFile(selectedData, filename);
  }, [selectedIds, data, generateExcelFile]);

  const isLoading = loading;

  return (
    <>
      <ManagementPageLayout
        title="员工管理"
        loading={isLoading}
        showFieldSelector={false}
        exportComponent={null}
        customContent={
          <div className="space-y-6">
            {/* 员工统计概览 - 使用 DaisyUI 标准 stats 组件 */}
            <div className="stats shadow w-full">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="stat-title">总员工数</div>
                <div className="stat-value text-primary">{statistics.total}</div>
                <div className="stat-desc">系统中所有员工</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-success">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="stat-title">在职员工</div>
                <div className="stat-value text-success">{statistics.active}</div>
                <div className="stat-desc">正常工作状态</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-error">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="stat-title">离职员工</div>
                <div className="stat-value text-error">{statistics.inactive}</div>
                <div className="stat-desc">已离开公司</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-info">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h4a1 1 0 011 1v5m-6 0V9a1 1 0 011-1h4a1 1 0 011 1v11" />
                  </svg>
                </div>
                <div className="stat-title">部门数量</div>
                <div className="stat-value text-info">{statistics.departments}</div>
                <div className="stat-desc">组织架构</div>
              </div>
            </div>

            {/* 工具栏 */}
            <div className="border border-base-200 rounded-lg bg-base-100 p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                
                {/* 左侧：筛选器组 */}
                <div className="flex items-center gap-3">
                  {/* 状态选择器 */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-base-content/70 whitespace-nowrap">状态：</span>
                    <select 
                      className="select select-bordered select-sm bg-base-100 w-28"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                      <option value="all">全部状态</option>
                      <option value="active">在职</option>
                      <option value="inactive">离职</option>
                      <option value="suspended">停职</option>
                    </select>
                  </div>
                </div>

                {/* 中间：搜索框 */}
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="搜索员工姓名、部门、职位..."
                      className="input input-bordered input-sm w-full pr-20"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={isLoading}
                    />
                    <div className="absolute right-1 top-1 flex gap-1">
                      {searchQuery && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => setSearchQuery('')}
                          title="清除搜索"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        title="搜索"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 右侧：操作按钮组 */}
                <div className="flex items-center gap-2">
                  {/* 添加员工 */}
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleCreateEmployee}
                  >
                    <UserPlusIcon className="w-4 h-4" />
                    添加员工
                  </button>
                  
                  {/* 导出按钮 */}
                  <div className="dropdown dropdown-end dropdown-hover">
                    <div tabIndex={0} role="button" className="btn btn-outline btn-sm">
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      导出
                    </div>
                    <ul className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 border border-base-300">
                      <li>
                        <button
                          type="button"
                          className="flex items-center gap-2 w-full text-left"
                          onClick={(e) => {
                            e.preventDefault();
                            handleExportCSV();
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          导出为 CSV
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="flex items-center gap-2 w-full text-left"
                          onClick={(e) => {
                            e.preventDefault();
                            handleExportExcel();
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17H7A2 2 0 015 15V5a2 2 0 012-2h6l5 5v7a2 2 0 01-2 2h-2M9 17v2a2 2 0 01-2 2H5" />
                          </svg>
                          导出为 Excel
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="flex items-center gap-2 w-full text-left"
                          onClick={(e) => {
                            e.preventDefault();
                            handleExportJSON();
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          导出为 JSON
                        </button>
                      </li>
                      {selectedIds.length > 0 && (
                        <>
                          <div className="divider my-1"></div>
                          <li>
                            <button
                              type="button"
                              className="flex items-center gap-2 w-full text-left"
                              onClick={(e) => {
                                e.preventDefault();
                                handleExportSelected();
                              }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              仅导出选中项 ({selectedIds.length})
                            </button>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 批量操作区域 */}
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
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleBatchStatusChange('active')}
                      title="批量激活"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      激活
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleBatchStatusChange('suspended')}
                      title="批量停职"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      停职
                    </button>
                    <button
                      className="btn btn-outline btn-sm btn-error"
                      onClick={handleBatchDelete}
                      title="批量删除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      删除
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 表格容器 */}
            <EmployeeTableContainer
              data={data}
              columns={columns}
              loading={loading}
              enableRowSelection={false} // 选择列已在 columns 中定义
              showGlobalFilter={false}
              showColumnToggle={false}
              enableExport={false}
            />
          </div>
        }
        modal={
          <>
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
        }
      />
    </>
  );
}