import React from 'react';
import { ImportDataGroup } from '@/types/payroll-import';
import { DataGroupSelector } from './DataGroupSelector';
import { DataGroupSelectAllController } from './DataGroupSelectAllController';

interface DataGroupSelectorWithControlsProps {
  selectedGroups: ImportDataGroup[];
  onGroupToggle: (group: ImportDataGroup) => void;
  onSelectAll: () => void;
  title?: string;
  subtitle?: string;
  multiple?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  showDescriptions?: boolean;
  className?: string;
  icon?: React.ReactNode;
  iconColor?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
}

export const DataGroupSelectorWithControls: React.FC<DataGroupSelectorWithControlsProps> = ({
  selectedGroups,
  onGroupToggle,
  onSelectAll,
  title = "选择要处理的数据类型",
  subtitle = "可多选",
  multiple = true,
  variant = "default",
  showDescriptions = true,
  className = "",
  icon,
  iconColor = "accent"
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className={`w-8 h-8 bg-${iconColor}/10 rounded-lg flex items-center justify-center`}>
              <div className={`w-4 h-4 text-${iconColor}`}>
                {icon}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-base-content">{title}</h3>
            <p className="text-sm text-base-content/60">{subtitle}</p>
          </div>
        </div>
        
        <DataGroupSelectAllController
          selectedGroups={selectedGroups}
          onSelectAll={onSelectAll}
        />
      </div>
      
      <div className="p-6 bg-gradient-to-br from-base-200/30 to-base-200/50 rounded-xl border border-base-300/30 mt-4">
        <DataGroupSelector
          selectedGroups={selectedGroups}
          onGroupToggle={onGroupToggle}
          multiple={multiple}
          variant={variant}
          showDescriptions={showDescriptions}
        />
      </div>
    </div>
  );
};