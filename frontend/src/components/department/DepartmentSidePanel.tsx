import { useState, useEffect, useMemo } from 'react';
import { 
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon as CancelIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { 
  useDepartment,
  useDepartmentTree,
  useDepartmentEmployees,
  useUpdateDepartment,
  useCreateDepartment,
  useDeleteDepartment
} from '@/hooks/useDepartments';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  type SortingState
} from '@tanstack/react-table';
import type { DepartmentNode, DepartmentFormData } from '@/types/department';

interface DepartmentSidePanelProps {
  department: DepartmentNode | null;
  isOpen: boolean;
  onClose: () => void;
  mode?: 'view' | 'edit' | 'create';
  onSuccess?: () => void;
}

// 定义员工表格的列
const columnHelper = createColumnHelper<any>();

export function DepartmentSidePanel({
  department,
  isOpen,
  onClose,
  mode: initialMode = 'view',
  onSuccess
}: DepartmentSidePanelProps) {
  const [isEditing, setIsEditing] = useState(initialMode === 'edit' || initialMode === 'create');
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    parent_department_id: null
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const { showSuccess, showError } = useToast();
  const { data: departmentTree } = useDepartmentTree();
  const { data: employees = [] } = useDepartmentEmployees(department?.id || '');
  const updateDepartment = useUpdateDepartment();
  const createDepartment = useCreateDepartment();
  const deleteDepartment = useDeleteDepartment();

  // 初始化表单数据
  useEffect(() => {
    if (department && initialMode !== 'create') {
      setFormData({
        name: department.name,
        parent_department_id: department.parent_department_id || null
      });
    } else if (initialMode === 'create') {
      setFormData({
        name: '',
        parent_department_id: department?.id || null
      });
    }
    setIsEditing(initialMode === 'edit' || initialMode === 'create');
  }, [department, initialMode]);

  // 处理保存
  const handleSave = async () => {
    try {
      if (initialMode === 'create') {
        await createDepartment.mutateAsync(formData);
        showSuccess('部门创建成功');
      } else if (department) {
        await updateDepartment.mutateAsync({
          id: department.id,
          data: formData
        });
        showSuccess('部门更新成功');
      }
      setIsEditing(false);
      onSuccess?.();
    } catch (error) {
      showError('操作失败');
    }
  };

  // 处理删除
  const handleDelete = async () => {
    if (!department) return;
    
    if (window.confirm(`确定要删除部门"${department.name}"吗？`)) {
      try {
        await deleteDepartment.mutateAsync(department.id);
        showSuccess('部门删除成功');
        onClose();
        onSuccess?.();
      } catch (error) {
        showError('删除失败：部门可能存在关联数据');
      }
    }
  };

  // 获取可选的父部门列表（排除自己和子部门）
  const getAvailableParents = () => {
    if (!departmentTree) return [];
    
    const excludeIds = new Set<string>();
    if (department && initialMode !== 'create') {
      // 排除自己和所有子部门
      const collectIds = (node: DepartmentNode) => {
        excludeIds.add(node.id);
        node.children?.forEach(collectIds);
      };
      collectIds(department);
    }
    
    const flattenTree = (nodes: DepartmentNode[], level = 0): Array<{id: string; name: string; level: number}> => {
      return nodes.reduce((acc, node) => {
        if (!excludeIds.has(node.id)) {
          acc.push({ id: node.id, name: node.name, level });
          if (node.children) {
            acc.push(...flattenTree(node.children, level + 1));
          }
        }
        return acc;
      }, [] as Array<{id: string; name: string; level: number}>);
    };
    
    return flattenTree(departmentTree);
  };

  // 定义表格列
  const columns = useMemo(() => [
    columnHelper.accessor('employee_name', {
      header: '姓名',
      cell: info => info.getValue() || info.row.original.name || '-'
    }),
    columnHelper.accessor('personnel_category', {
      header: '人员类别',
      cell: info => info.getValue() || '-'
    }),
    columnHelper.accessor('employment_status', {
      header: '状态',
      cell: info => {
        const status = info.getValue() || info.row.original.status;
        return status === 'active' ? (
          <span className="badge badge-success badge-xs">在职</span>
        ) : (
          <span className="badge badge-ghost badge-xs">离职</span>
        );
      }
    })
  ], []);

  // 创建表格实例
  const table = useReactTable({
    data: employees,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/30 transition-opacity z-40",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* 侧边面板 */}
      <div 
        className={cn(
          "fixed right-0 top-0 h-full w-full sm:w-96 bg-base-100 shadow-2xl transition-transform z-50",
          "flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-base-200">
          <div className="flex items-center gap-2">
            <BuildingOfficeIcon className="w-5 h-5 text-base-content/60" />
            <h2 className="text-lg font-semibold">
              {initialMode === 'create' ? '新建部门' : department?.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {/* 基本信息 */}
          <div className="p-4 space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">部门名称</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input input-bordered"
                  placeholder="请输入部门名称"
                />
              ) : (
                <div className="text-base font-medium">{department?.name}</div>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">上级部门</span>
              </label>
              {isEditing ? (
                <select
                  value={formData.parent_department_id || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    parent_department_id: e.target.value || null 
                  }))}
                  className="select select-bordered"
                >
                  <option value="">无（顶级部门）</option>
                  {getAvailableParents().map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {'　'.repeat(dept.level)}{dept.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-base">
                  {department?.parent_department_id ? '有上级部门' : '顶级部门'}
                </div>
              )}
            </div>
          </div>

          {/* 统计信息 - 仅在查看模式显示 */}
          {!isEditing && department && initialMode !== 'create' && (
            <>
              {/* 快速统计 */}
              <div className="px-4 py-3 bg-base-200/30">
                <div className="grid grid-cols-2 gap-3">
                  <div className="stat p-3 bg-base-100 rounded-lg">
                    <div className="stat-figure text-primary">
                      <UsersIcon className="w-6 h-6" />
                    </div>
                    <div className="stat-title text-xs">员工数</div>
                    <div className="stat-value text-xl">{department.employee_count || 0}</div>
                  </div>
                  <div className="stat p-3 bg-base-100 rounded-lg">
                    <div className="stat-figure text-success">
                      <UserGroupIcon className="w-6 h-6" />
                    </div>
                    <div className="stat-title text-xs">子部门</div>
                    <div className="stat-value text-xl">{department.children?.length || 0}</div>
                  </div>
                </div>
              </div>

              {/* 员工列表 */}
              {employees.length > 0 && (
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-base-content/70 mb-3">
                    部门员工（{employees.length}人）
                  </h3>
                  <div className="overflow-x-auto max-h-80">
                    <table className="table table-xs table-zebra">
                      <thead className="sticky top-0 bg-base-200/80 backdrop-blur">
                        {table.getHeaderGroups().map(headerGroup => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                              <th
                                key={header.id}
                                className="cursor-pointer select-none hover:bg-base-300/50"
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                <div className="flex items-center gap-1">
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                  {{
                                    asc: <span className="text-primary">↑</span>,
                                    desc: <span className="text-primary">↓</span>,
                                  }[header.column.getIsSorted() as string] ?? null}
                                </div>
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {table.getRowModel().rows.map(row => (
                          <tr key={row.id} className="hover">
                            {row.getVisibleCells().map(cell => (
                              <td key={cell.id}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 时间信息 */}
              <div className="p-4 border-t border-base-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-base-content/50">创建时间</div>
                    <div className="font-medium">
                      {department.created_at ? new Date(department.created_at).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-base-content/50">更新时间</div>
                    <div className="font-medium">
                      {department.updated_at ? new Date(department.updated_at).toLocaleDateString() : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="border-t border-base-200 p-4">
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!formData.name.trim()}
                className="btn btn-primary btn-sm flex-1"
              >
                <CheckIcon className="w-4 h-4" />
                保存
              </button>
              <button
                onClick={() => {
                  if (initialMode === 'create') {
                    onClose();
                  } else {
                    setIsEditing(false);
                    setFormData({
                      name: department?.name || '',
                      parent_department_id: department?.parent_department_id || null
                    });
                  }
                }}
                className="btn btn-ghost btn-sm flex-1"
              >
                <CancelIcon className="w-4 h-4" />
                取消
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-primary btn-sm flex-1"
              >
                <PencilIcon className="w-4 h-4" />
                编辑
              </button>
              {department && (department.employee_count || 0) === 0 && (
                <button
                  onClick={handleDelete}
                  className="btn btn-error btn-sm"
                >
                  <TrashIcon className="w-4 h-4" />
                  删除
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}