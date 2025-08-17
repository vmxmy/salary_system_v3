import React, { useMemo, useState, useRef, useEffect } from 'react';
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
  variant?: 'default' | 'compact' | 'detailed';
  showDescriptions?: boolean;
  animateSelections?: boolean;
}

const columnHelper = createColumnHelper<DataGroupOption>();

export const DataGroupSelector: React.FC<DataGroupSelectorProps> = ({
  selectedGroups,
  onGroupToggle,
  multiple = true,
  disabled = false,
  className = "",
  variant = 'default',
  showDescriptions = true,
  animateSelections = true
}) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
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

  // 键盘导航处理
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev < data.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : data.length - 1
        );
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0) {
          onGroupToggle(data[focusedIndex].value);
        }
        break;
      case 'Escape':
        setFocusedIndex(-1);
        break;
    }
  };

  // 聚焦管理
  useEffect(() => {
    if (focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  // 获取布局类名
  const getLayoutClasses = () => {
    switch (variant) {
      case 'compact':
        return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3';
      case 'detailed':
        return 'grid grid-cols-1 lg:grid-cols-2 gap-6';
      default:
        return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`${className} focus-within:outline-none`}
      onKeyDown={handleKeyDown}
      role="group"
      aria-label="数据类型选择器"
    >
      {/* 统一的卡片布局 */}
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.map((option, index) => {
            const Icon = option.icon;
            const isSelected = option.selected;
            const isFocused = index === focusedIndex;
            
            return (
              <div
                key={option.value}
                ref={el => { optionRefs.current[index] = el; }}
                className={`
                  group relative cursor-pointer transition-all duration-300
                  border-2 rounded-xl p-4 hover:shadow-lg
                  w-full min-w-[200px]
                  ${
                    isSelected 
                      ? 'border-primary bg-primary/10 shadow-md transform scale-[1.02]' 
                      : 'border-base-300 bg-base-100 hover:border-primary/50 hover:bg-primary/5'
                  }
                  ${
                    isFocused 
                      ? 'ring-2 ring-primary ring-offset-2' 
                      : ''
                  }
                  ${
                    disabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:transform hover:scale-105'
                  }
                  ${animateSelections ? 'animate-pulse' : ''}
                `}
                onClick={() => !disabled && onGroupToggle(option.value)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(-1)}
                tabIndex={disabled ? -1 : 0}
                role="option"
                aria-selected={isSelected}
                aria-describedby={`option-${option.value}-desc`}
              >
                {/* 选择状态指示器 */}
                <div className="absolute top-3 right-3">
                  <input
                    type={multiple ? "checkbox" : "radio"}
                    name={multiple ? undefined : "data-group-selector"}
                    className={`${multiple ? "checkbox" : "radio"} checkbox-primary checkbox-sm`}
                    checked={isSelected}
                    onChange={() => {}}
                    disabled={disabled}
                    tabIndex={-1}
                  />
                </div>
                
                {/* 图标和标题 */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`
                    flex-shrink-0 p-2 rounded-lg transition-colors
                    ${
                      isSelected 
                        ? 'bg-primary text-primary-content' 
                        : 'bg-primary/10 text-primary group-hover:bg-primary/20'
                    }
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`
                      font-semibold text-sm leading-tight
                      ${isSelected ? 'text-primary' : 'text-base-content'}
                    `}>
                      {option.label}
                    </h3>
                  </div>
                </div>
                
                {/* 描述信息 */}
                {showDescriptions && variant !== 'compact' && (
                  <p 
                    id={`option-${option.value}-desc`}
                    className="text-xs text-base-content/70 leading-relaxed"
                  >
                    {option.description}
                  </p>
                )}
                
                {/* 选中状态的视觉反馈 */}
                {isSelected && (
                  <div className="absolute inset-0 border-2 border-primary rounded-xl bg-primary/5 pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
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