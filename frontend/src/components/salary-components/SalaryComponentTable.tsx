/**
 * 薪资组件数据表格
 * 支持搜索、筛选、排序和批量操作
 */

import React, { useState, useMemo, useCallback } from 'react';
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
import {
  useSalaryComponentFiltersOptimized,
  useCategoriesByTypeOptimized,
  useDebounceFilterUpdate,
} from '@/hooks/salary-components/useSalaryComponentFilters.optimized';

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
  
  // 筛选器状态 - 使用独立状态管理，避免循环依赖
  const [selectedType, setSelectedType] = useState<ComponentType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | null>(null);

  // 使用优化版 hooks
  const { data: components = [], isLoading, error, refetch } = useSalaryComponents(query);
  const { data: filterOptions, isLoading: isLoadingFilters } = useSalaryComponentFiltersOptimized();
  const availableCategories = useCategoriesByTypeOptimized(selectedType);
  const deleteMutation = useDeleteSalaryComponent();
  const batchDeleteMutation = useBatchDeleteSalaryComponents();
  
  // 防抖更新函数
  const createDebounceUpdate = useDebounceFilterUpdate();

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
        <div className="flex items-center gap-1">
          {/* 查看按钮 */}
          <button
            className="p-1 rounded hover:bg-base-200 transition-colors"
            onClick={() => onView?.(row.original)}
            title="查看详情"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/70 hover:text-base-content" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          {/* 编辑按钮 */}
          <button
            className="p-1 rounded hover:bg-primary/10 transition-colors"
            onClick={() => onEdit?.(row.original)}
            title="编辑组件"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary/70 hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {/* 删除按钮 */}
          <button
            className="p-1 rounded hover:bg-error/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleDelete(row.original.id)}
            disabled={deleteMutation.isPending}
            title="删除组件"
          >
            {deleteMutation.isPending ? (
              <div className="loading loading-spinner loading-xs text-error/70"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error/70 hover:text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      ),
      enableSorting: false,
    },
  ], [onEdit, onView, deleteMutation.isPending]);

  // 优化版筛选器变化处理 - 使用防抖和批量状态更新
  const handleTypeChange = useCallback((type: ComponentType | null) => {
    const debouncedUpdate = createDebounceUpdate(() => {
      // 批量状态更新，减少重新渲染次数
      setSelectedType(type);
      setSelectedCategory(null);
      setQuery(prev => ({
        ...prev,
        type: type || undefined,
        category: undefined,
      }));
    });
    
    debouncedUpdate();
  }, [createDebounceUpdate]);

  const handleCategoryChange = useCallback((category: ComponentCategory | null) => {
    const debouncedUpdate = createDebounceUpdate(() => {
      setSelectedCategory(category);
      setQuery(prev => ({
        ...prev,
        category: category || undefined,
      }));
    });
    
    debouncedUpdate();
  }, [createDebounceUpdate]);

  // 清除筛选条件 - 优化版
  const handleClearFilters = useCallback(() => {
    setSelectedType(null);
    setSelectedCategory(null);
    setQuery({});
    setGlobalFilter('');
  }, []);

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
  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('确定要删除这个薪资组件吗？')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('删除失败:', error);
      }
    }
  }, [deleteMutation]);

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
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
  }, [table, batchDeleteMutation]);

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
      {/* 搜索和筛选工具卡片 */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            {/* 搜索区域 - 左侧 */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-base-content/70">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="font-medium">搜索</span>
              </div>
              <div className="form-control w-full lg:w-72 flex-shrink-0">
                <div className="join">
                  <input
                    type="text"
                    placeholder="搜索组件名称..."
                    className="input input-bordered input-sm join-item flex-1"
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                  <button className="btn btn-square btn-sm join-item">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* 筛选区域 - 右侧 */}
            <div className="flex items-center gap-3 justify-end">
              <div className="flex items-center gap-2 text-sm text-base-content/70">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
                <span className="font-medium">筛选</span>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {/* 类型筛选器 */}
                <select
                  className="select select-bordered select-sm min-w-[120px]"
                  value={selectedType || 'all'}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleTypeChange(value === 'all' ? null : value as ComponentType);
                  }}
                  disabled={isLoadingFilters}
                >
                  <option value="all">所有类型</option>
                  {filterOptions?.types.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.count})
                    </option>
                  ))}
                </select>

                {/* 类别筛选器 */}
                <select
                  className="select select-bordered select-sm min-w-[140px]"
                  value={selectedCategory || 'all'}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleCategoryChange(value === 'all' ? null : value as ComponentCategory);
                  }}
                  disabled={!selectedType || availableCategories.length === 0}
                >
                  <option value="all">
                    {!selectedType ? '请先选择类型' : '所有类别'}
                  </option>
                  {availableCategories.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.count})
                    </option>
                  ))}
                </select>

                {/* 清除筛选按钮 */}
                {(selectedType || selectedCategory || globalFilter) && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleClearFilters}
                    title="清除所有筛选条件"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    清除
                  </button>
                )}

                {/* 加载状态指示器 */}
                {(isLoading || isLoadingFilters) && (
                  <div className="loading loading-spinner loading-sm"></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选结果状态栏 */}
      {(globalFilter || selectedType || selectedCategory) && (
        <div className="flex items-center justify-between text-sm text-base-content/70 px-1">
          <div className="flex items-center gap-2">
            <span>当前筛选条件：</span>
            {globalFilter && (
              <div className="badge badge-outline badge-sm">
                搜索: "{globalFilter}"
              </div>
            )}
            {selectedType && (
              <div className="badge badge-primary badge-sm">
                类型: {filterOptions?.types.find(t => t.value === selectedType)?.label}
              </div>
            )}
            {selectedCategory && (
              <div className="badge badge-secondary badge-sm">
                类别: {availableCategories.find(c => c.value === selectedCategory)?.label}
              </div>
            )}
          </div>
          <div>
            显示结果: {table.getFilteredRowModel().rows.length} / {components.length} 项
          </div>
        </div>
      )}

      {/* 批量操作行 */}
      {table.getFilteredSelectedRowModel().rows.length > 0 && (
        <div className="flex justify-between items-center bg-base-200 p-3 rounded-lg">
          <div className="text-sm">
            已选择 <span className="font-semibold">{table.getFilteredSelectedRowModel().rows.length}</span> 个组件
          </div>
          <div className="flex gap-2">
            <button
              className={`btn btn-error btn-sm ${batchDeleteMutation.isPending ? 'loading' : ''}`}
              onClick={handleBatchDelete}
              disabled={batchDeleteMutation.isPending}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              批量删除
            </button>
          </div>
        </div>
      )}

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
                        {(globalFilter || selectedType || selectedCategory) && (
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={handleClearFilters}
                          >
                            清除筛选条件
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

    </div>
  );
}