import React from 'react';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/common/DataTable';
import { SimpleSearchBox } from '@/components/common/AdvancedSearchBox';
import { FieldSelector } from '@/components/common/FieldSelector';
import { ModernButton } from '@/components/common/ModernButton';
import type { Table } from '@tanstack/react-table';

// 统计卡片接口
export interface StatCardConfig {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  colorClass?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    period: string;
  };
}

// 搜索配置接口
export interface SearchConfig {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: () => void;
  onReset?: () => void;
  placeholder?: string;
  loading?: boolean;
}

// 工具栏配置接口
export interface ToolbarConfig {
  search?: SearchConfig;
  fieldSelector?: {
    show?: boolean;
    fields?: any[];
    userConfig?: any;
    onChange?: (config: any) => void;
    onReset?: () => void;
  };
  actions?: React.ReactNode[];
  exportComponent?: React.ReactNode;
}

// 内容配置接口
export interface ContentConfig {
  type?: 'table' | 'custom';
  // 表格配置
  table?: {
    data?: any[];
    columns?: any[];
    loading?: boolean;
    onTableReady?: (table: Table<any>) => void;
    initialSorting?: any[];
    initialPagination?: any;
    pageCount?: number;
    currentPage?: number;
    onPaginationChange?: (pagination: any) => void;
    enableRowSelection?: boolean;
    onRowSelectionChange?: (selection: any) => void;
    enableExport?: boolean;
    showGlobalFilter?: boolean;
    showColumnToggle?: boolean;
    striped?: boolean;
  };
  // 自定义内容
  custom?: React.ReactNode;
}

// 页面样式配置
export interface PageStylingConfig {
  compact?: boolean;
  spacing?: 'tight' | 'normal' | 'loose';
  containerClass?: string;
}

// 主要接口
export interface UniversalPageLayoutProps {
  // 页面基础信息
  page: {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
  };
  
  // 统计卡片
  statistics?: {
    cards: StatCardConfig[];
    loading?: boolean;
  };
  
  // 工具栏配置
  toolbar?: ToolbarConfig;
  
  // 主内容配置
  content?: ContentConfig;
  
  // 底部内容
  footer?: React.ReactNode;
  
  // 模态框
  modals?: React.ReactNode;
  
  // 样式配置
  styling?: PageStylingConfig;
  
  // 子组件
  children?: React.ReactNode;
}

export function UniversalPageLayout({
  page,
  statistics,
  toolbar,
  content,
  footer,
  modals,
  styling = {},
  children
}: UniversalPageLayoutProps) {
  const {
    compact = true,
    spacing = 'normal',
    containerClass = ''
  } = styling;

  // 计算容器类名
  const containerClasses = cn(
    'page-layout-universal',
    {
      // 间距控制
      'p-3 lg:p-4 space-y-4 lg:space-y-6': spacing === 'normal',
      'p-2 lg:p-3 space-y-3 lg:space-y-4': spacing === 'tight',
      'p-4 lg:p-6 space-y-6 lg:space-y-8': spacing === 'loose',
    },
    containerClass
  );

  // 渲染页面标题
  const renderPageHeader = () => (
    <header className="page-header">
      <div className="flex items-start gap-3">
        {page.icon && (
          <div className="flex-shrink-0 text-primary">
            {page.icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-base-content">
            {page.title}
          </h1>
          {page.subtitle && (
            <p className="text-base-content/70 mt-1 lg:mt-2">
              {page.subtitle}
            </p>
          )}
        </div>
      </div>
    </header>
  );

  // 渲染统计卡片
  const renderStatistics = () => {
    if (!statistics?.cards || statistics.cards.length === 0) return null;

    if (statistics.loading) {
      return (
        <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="stat">
              <div className="stat-figure">
                <div className="w-8 h-8 bg-base-300 rounded animate-pulse" />
              </div>
              <div className="stat-title">
                <div className="w-16 h-4 bg-base-300 rounded animate-pulse" />
              </div>
              <div className="stat-value">
                <div className="w-20 h-8 bg-base-300 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="stats stats-vertical lg:stats-horizontal shadow-sm border border-base-200/60 w-full bg-gradient-to-br from-base-100 to-base-200/30">
        {statistics.cards.map((card, index) => (
          <div key={index} className="stat relative overflow-hidden">
            <div className={cn('stat-figure', card.colorClass || 'text-primary')}>
              {card.icon}
            </div>
            <div className="stat-title">{card.title}</div>
            <div className={cn('stat-value', card.colorClass || '')}>
              {card.value}
            </div>
            {card.description && (
              <div className="stat-desc">{card.description}</div>
            )}
            {card.trend && (
              <div className="stat-actions">
                <div className={cn(
                  'badge badge-sm',
                  card.trend.direction === 'up' ? 'badge-success' : 'badge-error'
                )}>
                  {card.trend.direction === 'up' ? '↗' : '↘'} {card.trend.value}%
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 渲染工具栏
  const renderToolbar = () => {
    if (!toolbar) return null;

    const hasToolbarContent = toolbar.search || 
      toolbar.fieldSelector?.show || 
      toolbar.actions?.length || 
      toolbar.exportComponent;

    if (!hasToolbarContent) return null;

    return (
      <div className="card bg-base-100 shadow-sm border border-base-200/60">
        <div className="card-body p-4 lg:p-5">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* 左侧 - 搜索 */}
            <div className="flex-1 w-full lg:w-auto lg:max-w-md">
              {toolbar.search && (
                <SimpleSearchBox
                  value={toolbar.search.value || ''}
                  onChange={toolbar.search.onChange || (() => {})}
                  onSearch={toolbar.search.onSearch || (() => {})}
                  onReset={toolbar.search.onReset || (() => {})}
                  loading={toolbar.search.loading || false}
                  placeholder={toolbar.search.placeholder || '搜索...'}
                  className="w-full"
                />
              )}
            </div>
            
            {/* 右侧 - 操作按钮 */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* 字段选择器 */}
              {toolbar.fieldSelector?.show && toolbar.fieldSelector.fields && (
                <FieldSelector
                  fields={toolbar.fieldSelector.fields}
                  userConfig={toolbar.fieldSelector.userConfig}
                  onChange={toolbar.fieldSelector.onChange || (() => {})}
                  onReset={toolbar.fieldSelector.onReset || (() => {})}
                />
              )}
              
              {/* 额外操作 */}
              {toolbar.actions?.map((action, index) => (
                <div key={index} className="shrink-0">
                  {action}
                </div>
              ))}
              
              {/* 导出组件 */}
              {toolbar.exportComponent}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染主内容
  const renderContent = () => {
    if (children) {
      return <div className="page-content">{children}</div>;
    }

    if (!content) return null;

    if (content.type === 'table' && content.table) {
      const tableConfig = content.table;
      return (
        <div className="overflow-x-auto">
          <DataTable
            data={tableConfig.data || []}
            columns={tableConfig.columns || []}
            loading={tableConfig.loading || false}
            onTableReady={tableConfig.onTableReady}
            initialSorting={tableConfig.initialSorting}
            initialPagination={tableConfig.initialPagination}
            pageCount={tableConfig.pageCount}
            currentPage={tableConfig.currentPage}
            onPaginationChange={tableConfig.onPaginationChange}
            enableRowSelection={tableConfig.enableRowSelection}
            onRowSelectionChange={tableConfig.onRowSelectionChange}
            enableExport={tableConfig.enableExport || false}
            showGlobalFilter={tableConfig.showGlobalFilter || false}
            showColumnToggle={tableConfig.showColumnToggle || false}
            compact={compact}
            striped={tableConfig.striped !== false}
          />
        </div>
      );
    }

    if (content.custom) {
      return <div className="page-content">{content.custom}</div>;
    }

    return null;
  };

  return (
    <div className={containerClasses}>
      {/* 页面标题 */}
      {renderPageHeader()}

      {/* 统计卡片 */}
      {renderStatistics()}

      {/* 工具栏 */}
      {renderToolbar()}

      {/* 主要内容 */}
      {renderContent()}

      {/* 底部内容 */}
      {footer && (
        <div className="page-footer">
          {footer}
        </div>
      )}

      {/* 模态框 */}
      {modals}
    </div>
  );
}

export default UniversalPageLayout;