import React from 'react';
import { ImportDataGroup } from '@/types/payroll-import';

interface DataGroupSelectAllControllerProps {
  selectedGroups: ImportDataGroup[];
  onSelectAll: () => void;
  disabled?: boolean;
  className?: string;
}

export const DataGroupSelectAllController: React.FC<DataGroupSelectAllControllerProps> = ({
  selectedGroups,
  onSelectAll,
  disabled = false,
  className = ""
}) => {
  // 可选择的数据组
  const allDataGroups = [
    ImportDataGroup.EARNINGS,
    ImportDataGroup.CONTRIBUTION_BASES,
    ImportDataGroup.CATEGORY_ASSIGNMENT,
    ImportDataGroup.JOB_ASSIGNMENT
  ];

  // 判断是否全选
  const isAllSelected = selectedGroups.length === allDataGroups.length && 
    allDataGroups.every(group => selectedGroups.includes(group));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        type="radio"
        name="data-group-all-selector"
        className="radio radio-primary"
        checked={isAllSelected}
        onChange={() => {}}
        disabled={disabled}
        onClick={() => !disabled && onSelectAll()}
      />
      <span 
        className="label-text font-medium flex items-center gap-1 cursor-pointer"
        onClick={() => !disabled && onSelectAll()}
      >
        <div className="text-lg">📋</div>
        全选
      </span>
    </div>
  );
};