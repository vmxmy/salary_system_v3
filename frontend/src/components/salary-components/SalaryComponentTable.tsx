/**
 * 薪资组件数据表格
 * 支持搜索、筛选、排序和批量操作
 */

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { 
  useSalaryComponents,
  useDeleteSalaryComponent,
  useBatchDeleteSalaryComponents,
  type SalaryComponent,
  type SalaryComponentQuery,
  type ComponentType,
  type ComponentCategory,
  type CopyStrategy,
  type StabilityLevel,
  COMPONENT_TYPE_CONFIG,
  COMPONENT_CATEGORY_CONFIG,
  COPY_STRATEGY_CONFIG,
  STABILITY_LEVEL_CONFIG,
} from '@/hooks/salary-components';

interface SalaryComponentTableProps {
  onEdit?: (component: SalaryComponent) => void;
  onView?: (component: SalaryComponent) => void;
}

export function SalaryComponentTable({ onEdit, onView }: SalaryComponentTableProps) {
  const [query, setQuery] = useState<SalaryComponentQuery>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');

  const { data: components = [], isLoading, error, refetch } = useSalaryComponents(query);
  const deleteMutation = useDeleteSalaryComponent();
  const batchDeleteMutation = useBatchDeleteSalaryComponents();

  // 表格列定义
  const columns = useMemo<ColumnDef<SalaryComponent>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
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
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: '组件名称',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          {row.original.description && (
            <div className="text-sm text-base-content/70 truncate max-w-xs">
              {row.original.description}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: '类型',
      cell: ({ row }) => {
        const config = COMPONENT_TYPE_CONFIG[row.original.type];
        return (
          <div className={`flex items-center gap-2 ${config.color}`}>
            <span>{config.icon}</span>
            <span className="font-medium">{config.label}</span>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'category',
      header: '类别',
      cell: ({ row }) => {
        if (!row.original.category) {
          return <div className="badge badge-neutral">未分类</div>;
        }
        const config = COMPONENT_CATEGORY_CONFIG[row.original.category];
        return (
          <div className={`badge ${config.color}`}>
            {config.label}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'is_taxable',
      header: '税务属性',
      cell: ({ row }) => (
        <div className={`badge ${row.original.is_taxable ? 'badge-warning' : 'badge-success'}`}>
          {row.original.is_taxable ? '应税' : '免税'}
        </div>
      ),
    },
    {
      accessorKey: 'copy_strategy',
      header: '复制策略',
      cell: ({ row }) => {
        const strategy = row.original.copy_strategy;
        if (!strategy) return '-';
        const config = COPY_STRATEGY_CONFIG[strategy as CopyStrategy];
        if (!config) return strategy;
        return (
          <div className="text-sm">
            <div className="font-medium">{config.label}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'stability_level',
      header: '稳定性',
      cell: ({ row }) => {
        const level = row.original.stability_level;
        if (!level) return '-';
        const config = STABILITY_LEVEL_CONFIG[level as StabilityLevel];
        if (!config) return level;
        return (
          <div className={`badge ${config.color} badge-sm`}>
            {config.label}
          </div>
        );
      },
    },
    {
      accessorKey: 'base_dependency',
      header: '基数依赖',
      cell: ({ row }) => (
        <div className={`badge ${row.original.base_dependency ? 'badge-info' : 'badge-neutral'} badge-sm`}>
          {row.original.base_dependency ? '是' : '否'}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => onView?.(row.original)}
          >
            查看
          </button>
          <button
            className="btn btn-primary btn-xs"
            onClick={() => onEdit?.(row.original)}
          >
            编辑
          </button>
          <button
            className="btn btn-error btn-xs"
            onClick={() => handleDelete(row.original.id)}
            disabled={deleteMutation.isPending}
          >
            删除
          </button>
        </div>
      ),
      enableSorting: false,
    },
  ], [onEdit, onView, deleteMutation.isPending]);

  const table = useReactTable({
    data: components,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // 删除单个组件
  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这个薪资组件吗？')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('删除失败:', error);
      }
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedIds = selectedRows.map(row => row.original.id);

    if (selectedIds.length === 0) {
      alert('请先选择要删除的组件');
      return;
    }

    if (window.confirm(`确定要删除选中的 ${selectedIds.length} 个薪资组件吗？`)) {
      try {
        await batchDeleteMutation.mutateAsync(selectedIds);
        setRowSelection({});
      } catch (error) {
        console.error('批量删除失败:', error);
      }
    }
  };

  if (error) {
    return (
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <div className="font-bold">加载失败</div>
          <div className="text-xs">{error.message}</div>
        </div>
        <button className="btn btn-sm" onClick={() => refetch()}>
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 搜索和筛选工具栏 */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* 搜索框 */}
        <div className="flex-1 max-w-md">
          <div className="form-control">
            <div className="input-group">
              <input
                type="text"
                placeholder="搜索组件名称..."
                className="input input-bordered flex-1"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
              <button className="btn btn-square">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 筛选选项 */}
        <div className="flex flex-wrap gap-2">
          <select
            className="select select-bordered select-sm"
            value={table.getColumn('type')?.getFilterValue() as string || 'all'}
            onChange={(e) => {
              const value = e.target.value;
              table.getColumn('type')?.setFilterValue(value === 'all' ? undefined : [value]);
            }}
          >
            <option value="all">所有类型</option>
            {Object.entries(COMPONENT_TYPE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          <select
            className="select select-bordered select-sm"
            value={table.getColumn('category')?.getFilterValue() as string || 'all'}
            onChange={(e) => {
              const value = e.target.value;
              table.getColumn('category')?.setFilterValue(value === 'all' ? undefined : [value]);
            }}
          >
            <option value="all">所有类别</option>
            {Object.entries(COMPONENT_CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>

        {/* 批量操作 */}
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <div className="flex gap-2">
            <button
              className={`btn btn-error btn-sm ${batchDeleteMutation.isPending ? 'loading' : ''}`}
              onClick={handleBatchDelete}
              disabled={batchDeleteMutation.isPending}
            >
              批量删除 ({table.getFilteredSelectedRowModel().rows.length})
            </button>
          </div>
        )}
      </div>

      {/* 数据表格 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-2">
                          {header.isPlaceholder ? null : (
                            typeof header.column.columnDef.header === 'function'
                              ? header.column.columnDef.header(header.getContext())
                              : header.column.columnDef.header
                          )}
                          {header.column.getCanSort() && (
                            <span className="text-xs">
                              {header.column.getIsSorted() === 'desc' ? '↓' : 
                               header.column.getIsSorted() === 'asc' ? '↑' : '↕'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading ? (
                  // 加载状态
                  [...Array(5)].map((_, index) => (
                    <tr key={index}>
                      {columns.map((_, colIndex) => (
                        <td key={colIndex}>
                          <div className="skeleton h-4 w-full"></div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  // 空状态
                  <tr>
                    <td colSpan={columns.length} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-4xl opacity-50">📋</div>
                        <div className="text-base-content/70">暂无薪资组件数据</div>
                        {globalFilter && (
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => setGlobalFilter('')}
                          >
                            清除搜索条件
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  // 数据行
                  table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>
                          {typeof cell.column.columnDef.cell === 'function'
                            ? cell.column.columnDef.cell(cell.getContext())
                            : cell.getValue() as React.ReactNode}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 表格信息 */}
      <div className="flex items-center justify-between text-sm text-base-content/70">
        <div>
          共 {components.length} 项，已选择 {table.getFilteredSelectedRowModel().rows.length} 项
        </div>
        {globalFilter && (
          <div>
            搜索结果: {table.getFilteredRowModel().rows.length} 项
          </div>
        )}
      </div>
    </div>
  );
}