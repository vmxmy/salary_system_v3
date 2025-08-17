import React from 'react';
import { ImportDataGroup } from '@/types/payroll-import';
import { MoneyIcon, BankIcon, PeopleIcon, BriefcaseIcon } from '@/components/common/Icons';

interface DataGroupOption {
  value: ImportDataGroup;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DataGroupSelectorProps {
  selectedGroups: ImportDataGroup[];
  onGroupToggle: (group: ImportDataGroup) => void;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

export const DataGroupSelector: React.FC<DataGroupSelectorProps> = ({
  selectedGroups,
  onGroupToggle,
  multiple = true,
  disabled = false,
  className = ""
}) => {
  // 数据组选项配置
  const dataGroupOptions: DataGroupOption[] = [
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

  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dataGroupOptions.map(option => (
          <div
            key={option.value}
            className={`card bordered cursor-pointer transition-all ${
              selectedGroups.includes(option.value) ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-primary/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !disabled && onGroupToggle(option.value)}
          >
            <div className="card-body p-4">
              <div className="flex items-start gap-3">
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={multiple ? undefined : "data-group-controller"}
                  className={multiple ? "checkbox checkbox-primary mt-1" : "radio radio-primary mt-1"}
                  checked={selectedGroups.includes(option.value)}
                  onChange={() => {}}
                  disabled={disabled}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <option.icon className="text-2xl" />
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
export const DATA_GROUP_OPTIONS: DataGroupOption[] = [
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