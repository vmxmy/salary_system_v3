import { type ReactNode } from 'react';
import { PageToolbar } from '@/components/common/PageToolbar';
import { DataTable } from '@/components/common/DataTable';
import { SimpleSearchBox } from '@/components/common/AdvancedSearchBox';
import { FieldSelector } from '@/components/common/FieldSelector';
import { ModernButton } from '@/components/common/ModernButton';
import type { Table } from '@tanstack/react-table';

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: ReactNode;
  colorClass?: string;
}

export interface ManagementPageLayoutProps {
  // 页面基本信息
  title: string;
  subtitle?: string;
  
  // 统计卡片
  statCards?: StatCardProps[];
  
  // 搜索功能
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearch?: () => void;
  onSearchReset?: () => void;
  searchPlaceholder?: string;
  searchLoading?: boolean;
  
  // 字段选择器
  showFieldSelector?: boolean;
  fields?: any[];
  userConfig?: any;
  onFieldConfigChange?: (config: any) => void;
  onFieldConfigReset?: () => void;
  
  // 导出功能
  exportComponent?: ReactNode;
  
  // 主要操作按钮
  primaryActions?: ReactNode[];
  
  // 额外操作组件
  actions?: ReactNode[];
  
  // 表格数据
  data?: any[];
  columns?: any[];
  loading?: boolean;
  onTableReady?: (table: Table<any>) => void;
  tableInstance?: Table<any>;
  
  // 表格配置
  initialSorting?: any[];
  initialPagination?: any;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (selection: any) => void;
  enableExport?: boolean;
  showGlobalFilter?: boolean;
  showColumnToggle?: boolean;
  
  // 模态框
  modal?: ReactNode;
  
  // 自定义内容区域
  customContent?: ReactNode;
  
  // 底部内容
  footerContent?: ReactNode;
}

export function ManagementPageLayout({
  title,
  subtitle,
  statCards = [],
  searchValue = '',
  onSearchChange,
  onSearch,
  onSearchReset,
  searchPlaceholder = '搜索...',
  searchLoading = false,
  showFieldSelector = true,
  fields = [],
  userConfig,
  onFieldConfigChange,
  onFieldConfigReset,
  exportComponent,
  primaryActions = [],
  data = [],
  columns = [],
  loading = false,
  onTableReady,
  initialSorting,
  initialPagination,
  enableExport = false,
  showGlobalFilter = false,
  showColumnToggle = false,
  modal,
  customContent,
  footerContent
}: ManagementPageLayoutProps) {
  
  // 渲染统计卡片
  const renderStatCards = () => {
    if (statCards.length === 0) return null;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
        {statCards.map((card, index) => (
          <div key={index} className="stat stat-compact bg-base-100 border border-base-200 rounded-lg">
            <div className={`stat-figure ${card.colorClass || 'text-primary'}`}>
              <div className="w-5 h-5">
                {card.icon}
              </div>
            </div>
            <div className="stat-title text-base-content/70 text-xs">{card.title}</div>
            <div className={`stat-value text-lg font-bold ${card.colorClass || ''}`}>
              {card.value}
            </div>
            {card.description && (
              <div className="stat-desc text-base-content/50 text-xs">{card.description}</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 渲染搜索组件
  const renderSearchComponent = () => {
    if (!onSearchChange) return null;
    
    return (
      <SimpleSearchBox
        value={searchValue}
        onChange={onSearchChange}
        onSearch={onSearch || (() => {})}
        onReset={onSearchReset || (() => {})}
        loading={searchLoading}
        placeholder={searchPlaceholder}
        className="w-full"
      />
    );
  };

  // 渲染字段选择器
  const renderFieldSelector = () => {
    if (!showFieldSelector || fields.length === 0) return null;
    
    return (
      <FieldSelector
        fields={fields}
        userConfig={userConfig}
        onChange={onFieldConfigChange || (() => {})}
        onReset={onFieldConfigReset || (() => {})}
      />
    );
  };

  // 渲染导出组件
  const renderExportComponent = () => {
    if (exportComponent) return exportComponent;
    
    // 默认的导出按钮
    return (
      <ModernButton
        variant="primary"
        size="md"
        disabled
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      >
        导出
      </ModernButton>
    );
  };

  return (
    <div className="page-compact">
      {/* 页面工具栏 */}
      <PageToolbar
        title={title}
        subtitle={subtitle}
        customContent={renderStatCards()}
        searchComponent={renderSearchComponent()}
        fieldSelector={renderFieldSelector()}
        exportComponent={renderExportComponent()}
        extraActions={primaryActions}
      />

      {/* 自定义内容区域 */}
      {customContent}

      {/* 数据表格 */}
      {columns.length > 0 && (
        <div className="overflow-x-auto">
          <DataTable
            data={data}
            columns={columns}
            loading={loading}
            onTableReady={onTableReady}
            initialSorting={initialSorting}
            initialPagination={initialPagination}
            enableExport={enableExport}
            showGlobalFilter={showGlobalFilter}
            showColumnToggle={showColumnToggle}
            compact={true}
          />
        </div>
      )}

      {/* 底部内容 */}
      {footerContent}

      {/* 模态框 */}
      {modal}
    </div>
  );
}

export default ManagementPageLayout;