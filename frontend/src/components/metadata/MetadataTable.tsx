import { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type Row
} from '@tanstack/react-table';
import type { EmployeeMetadata } from '@/types/metadata';
import { formatCurrency, formatDate } from '@/utils/format';

interface MetadataTableProps {
  data: EmployeeMetadata[];
  loading: boolean;
  selectedRows: string[];
  onSelectionChange: (ids: string[]) => void;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  onPaginationChange: (page: number, pageSize?: number) => void;
  onRefresh: () => void;
}

const columnHelper = createColumnHelper<EmployeeMetadata>();

export function MetadataTable({
  data,
  loading,
  selectedRows,
  onSelectionChange,
  pagination,
  onPaginationChange,
  onRefresh
}: MetadataTableProps) {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [editingCell, setEditingCell] = useState<{ row: string; column: string } | null>(null);

  // 创建列定义
  const columns = useMemo<ColumnDef<EmployeeMetadata, any>[]>(
    () => [
      // 选择列
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={table.getIsAllRowsSelected()}
            {...(table.getIsSomeRowsSelected() ? { indeterminate: true } : {})}
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
        size: 40
      },
      // 员工姓名
      columnHelper.accessor('employee_name', {
        header: '姓名',
        cell: info => (
          <div className="font-semibold">{info.getValue()}</div>
        ),
        size: 100
      }),
      // 身份证号
      columnHelper.accessor('id_number', {
        header: '身份证号',
        cell: info => (
          <div className="font-mono text-xs">{info.getValue() || '-'}</div>
        ),
        size: 120
      }),
      // 部门
      columnHelper.accessor('department_name', {
        header: '部门',
        cell: info => (
          <span className="badge badge-outline badge-sm">
            {info.getValue()}
          </span>
        ),
        size: 120
      }),
      // 职位
      columnHelper.accessor('position_name', {
        header: '职位',
        cell: info => (
          <span className="text-sm">{info.getValue()}</span>
        ),
        size: 120
      }),
      // 人员类别
      columnHelper.accessor('category_name', {
        header: '人员类别',
        cell: info => (
          <span className="badge badge-outline badge-xs">
            {info.getValue()}
          </span>
        ),
        size: 100
      }),
      // 工资期间
      columnHelper.display({
        id: 'pay_period',
        header: '工资期间',
        cell: ({ row }) => {
          const start = formatDate(row.original.pay_period_start);
          const end = formatDate(row.original.pay_period_end);
          return (
            <div className="text-xs">
              {start} ~ {end}
            </div>
          );
        },
        size: 120
      }),
      // 应发工资
      columnHelper.accessor('gross_pay', {
        header: '应发工资',
        cell: info => (
          <div className="font-semibold text-primary">
            {formatCurrency(parseFloat(info.getValue()))}
          </div>
        ),
        size: 120
      }),
      // 扣除总额
      columnHelper.accessor('total_deductions', {
        header: '扣除总额',
        cell: info => (
          <div className="text-error">
            {formatCurrency(parseFloat(info.getValue()))}
          </div>
        ),
        size: 100
      }),
      // 实发工资
      columnHelper.accessor('net_pay', {
        header: '实发工资',
        cell: info => (
          <div className="font-semibold text-success">
            {formatCurrency(parseFloat(info.getValue()))}
          </div>
        ),
        size: 120
      }),
      // 银行信息
      columnHelper.display({
        id: 'bank_info',
        header: '银行信息',
        cell: ({ row }) => (
          <div className="text-xs max-w-40">
            <div className="font-mono">{row.original.primary_bank_account}</div>
            <div className="text-base-content/60 truncate">{row.original.bank_name}</div>
          </div>
        ),
        size: 160
      }),
      // 状态
      columnHelper.accessor('status', {
        header: '状态',
        cell: info => {
          const status = info.getValue();
          const statusMap: Record<string, { label: string; class: string }> = {
            draft: { label: '草稿', class: 'badge-ghost' },
            confirmed: { label: '已确认', class: 'badge-success' },
            locked: { label: '已锁定', class: 'badge-warning' },
            archived: { label: '已归档', class: 'badge-info' }
          };
          const statusInfo = statusMap[status] || { label: status, class: 'badge-ghost' };
          
          return (
            <span className={`badge badge-sm ${statusInfo.class}`}>
              {statusInfo.label}
            </span>
          );
        },
        size: 100
      }),
      // 操作
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => handleEdit(row.original)}
            >
              编辑
            </button>
            <button
              className="btn btn-ghost btn-xs text-error"
              onClick={() => handleDelete(row.original)}
            >
              删除
            </button>
          </div>
        ),
        size: 120
      }
    ],
    [editingCell]
  );

  // 处理编辑
  const handleEdit = (record: EmployeeMetadata) => {
    console.log('Edit record:', record);
    // 编辑逻辑将在后续实现
  };

  // 处理删除
  const handleDelete = (record: EmployeeMetadata) => {
    if (confirm(`确定要删除员工 ${record.employee_name} 的记录吗？`)) {
      console.log('Delete record:', record);
      // 删除逻辑将在后续实现
    }
  };

  // 创建表格实例
  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection
    },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(pagination.total / pagination.pageSize)
  });

  // 同步选中状态
  useEffect(() => {
    const selected = Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(index => data[parseInt(index)]?.payroll_id)
      .filter(Boolean);
    onSelectionChange(selected);
  }, [rowSelection, data, onSelectionChange]);

  return (
    <div className="space-y-4">
      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="bg-base-200"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8">
                  <span className="loading loading-spinner loading-md"></span>
                  <div className="mt-2">加载中...</div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8">
                  <div className="text-base-content/60">暂无数据</div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr 
                  key={row.id}
                  className={`hover ${row.getIsSelected() ? 'bg-base-200' : ''}`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-base-content/60">
          共 {pagination.total} 条记录，
          当前显示第 {(pagination.current - 1) * pagination.pageSize + 1} - {Math.min(pagination.current * pagination.pageSize, pagination.total)} 条
        </div>
        
        <div className="join">
          <button
            className="join-item btn btn-sm"
            onClick={() => onPaginationChange(1)}
            disabled={pagination.current === 1}
          >
            «
          </button>
          <button
            className="join-item btn btn-sm"
            onClick={() => onPaginationChange(pagination.current - 1)}
            disabled={pagination.current === 1}
          >
            ‹
          </button>
          <button className="join-item btn btn-sm btn-active">
            {pagination.current}
          </button>
          <button
            className="join-item btn btn-sm"
            onClick={() => onPaginationChange(pagination.current + 1)}
            disabled={pagination.current * pagination.pageSize >= pagination.total}
          >
            ›
          </button>
          <button
            className="join-item btn btn-sm"
            onClick={() => onPaginationChange(Math.ceil(pagination.total / pagination.pageSize))}
            disabled={pagination.current * pagination.pageSize >= pagination.total}
          >
            »
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm">每页显示</span>
          <select
            className="select select-bordered select-sm"
            value={pagination.pageSize}
            onChange={(e) => onPaginationChange(1, parseInt(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          
          <button
            className="btn btn-sm btn-ghost"
            onClick={onRefresh}
          >
            刷新
          </button>
        </div>
      </div>
    </div>
  );
}