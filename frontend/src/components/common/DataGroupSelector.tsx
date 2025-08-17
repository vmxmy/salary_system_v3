import React, { useMemo } from 'react';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import type { VisibilityState } from '@tanstack/react-table';
import { ImportDataGroup } from '@/types/payroll-import';
import { MoneyIcon, BankIcon, PeopleIcon, BriefcaseIcon } from '@/components/common/Icons';

interface DataGroupOption {
  value: ImportDataGroup;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  selected: boolean;
}

interface DataGroupSelectorProps {
  selectedGroups: ImportDataGroup[];
  onGroupToggle: (group: ImportDataGroup) => void;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

const columnHelper = createColumnHelper<DataGroupOption>();

export const DataGroupSelector: React.FC<DataGroupSelectorProps> = ({
  selectedGroups,
  onGroupToggle,
  multiple = true,
  disabled = false,
  className = ""
}) => {
  // 数据组选项配置
  const dataGroupOptions: Omit<DataGroupOption, 'selected'>[] = [
    {
      value: ImportDataGroup.EARNINGS,
      label: '薪资项目明细',
      description: '各项薪资组成明细数据',
      icon: MoneyIcon
    },
    {
      value: ImportDataGroup.CONTRIBUTION_BASES,
      label: '缴费基数',
      description: '各类保险和公积金基数',
      icon: BankIcon
    },
    {
      value: ImportDataGroup.CATEGORY_ASSIGNMENT,
      label: '人员类别',
      description: '员工类别分配信息',
      icon: PeopleIcon
    },
    {
      value: ImportDataGroup.JOB_ASSIGNMENT,
      label: '职务分配',
      description: '部门和职位分配信息',
      icon: BriefcaseIcon
    }
  ];

  // 将数据转换为表格数据格式
  const data = useMemo<DataGroupOption[]>(() => {
    return dataGroupOptions.map(option => ({
      ...option,
      selected: selectedGroups.includes(option.value)
    }));
  }, [selectedGroups]);

  // 定义表格列
  const columns = useMemo(() => [
    columnHelper.accessor('selected', {
      id: 'select',
      header: () => null,
      cell: ({ row }) => (
        <input
          type={multiple ? "checkbox" : "radio"}
          name={multiple ? undefined : "data-group-selector"}
          className={`${multiple ? "checkbox" : "radio"} checkbox-primary`}
          checked={row.original.selected}
          onChange={() => onGroupToggle(row.original.value)}
          disabled={disabled}
        />
      ),
      size: 40,
    }),
    columnHelper.accessor('icon', {
      id: 'icon',
      header: () => null,
      cell: ({ row }) => {
        const Icon = row.original.icon;
        return <Icon className="w-6 h-6 text-primary" />;
      },
      size: 50,
    }),
    columnHelper.accessor('label', {
      id: 'label',
      header: '数据类型',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold">{row.original.label}</div>
          <div className="text-sm text-base-content/70">{row.original.description}</div>
        </div>
      ),
    }),
  ], [multiple, disabled, onGroupToggle]);

  // 创建表格实例
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: multiple,
    enableMultiRowSelection: multiple,
  });

  return (
    <div className={`${className}`}>
      {/* 桌面端表格视图 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} style={{ width: header.getSize() }}>
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
            {table.getRowModel().rows.map(row => (
              <tr 
                key={row.id}
                className={`hover cursor-pointer ${
                  row.original.selected ? 'bg-primary/5' : ''
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && onGroupToggle(row.original.value)}
              >
                {row.getVisibleCells().map(cell => (
                  <td 
                    key={cell.id} 
                    style={{ width: cell.column.getSize() }}
                    onClick={(e) => {
                      // 防止点击 checkbox/radio 时触发两次
                      if ((e.target as HTMLElement).tagName === 'INPUT') {
                        e.stopPropagation();
                      }
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* 移动端卡片视图 */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {data.map(option => (
          <div
            key={option.value}
            className={`card bordered cursor-pointer transition-all ${
              option.selected ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-primary/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !disabled && onGroupToggle(option.value)}
          >
            <div className="card-body p-4">
              <div className="flex items-start gap-3">
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={multiple ? undefined : "data-group-selector-mobile"}
                  className={`${multiple ? "checkbox" : "radio"} checkbox-primary mt-1`}
                  checked={option.selected}
                  onChange={() => {}}
                  disabled={disabled}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <option.icon className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">{option.label}</h3>
                  </div>
                  <p className="text-sm text-base-content/70 mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 导出数据组选项配置供其他组件使用
export const DATA_GROUP_OPTIONS = [
  {
    value: ImportDataGroup.EARNINGS,
    label: '薪资项目明细',
    description: '各项薪资组成明细数据',
    icon: MoneyIcon
  },
  {
    value: ImportDataGroup.CONTRIBUTION_BASES,
    label: '缴费基数',
    description: '各类保险和公积金基数',
    icon: BankIcon
  },
  {
    value: ImportDataGroup.CATEGORY_ASSIGNMENT,
    label: '人员类别',
    description: '员工类别分配信息',
    icon: PeopleIcon
  },
  {
    value: ImportDataGroup.JOB_ASSIGNMENT,
    label: '职务分配',
    description: '部门和职位分配信息',
    icon: BriefcaseIcon
  }
];