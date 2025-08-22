import type { ReactNode } from 'react';

export interface StatisticsModuleLayoutProps {
  /** 模块标题 */
  title: string;
  /** 模块描述 */
  description?: string;
  /** 右侧操作组件（筛选器、按钮等） */
  actions?: ReactNode;
  /** 模块内容 */
  children: ReactNode;
  /** 额外的CSS类名 */
  className?: string;
}

/**
 * 统计模块通用布局组件
 * 
 * 提供统一的页面结构、间距和样式规范
 * 确保所有统计模块具有一致的视觉体验
 */
export function StatisticsModuleLayout({
  title,
  description,
  actions,
  children,
  className = ""
}: StatisticsModuleLayoutProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标准化的页面标题区域 */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-primary">
            {title}
          </h1>
          {description && (
            <p className="text-base-content/60 mt-2">{description}</p>
          )}
        </div>
        
        {/* 右侧操作区域（筛选器、刷新按钮等） */}
        {actions && (
          <div className="flex flex-col lg:flex-row gap-4">
            {actions}
          </div>
        )}
      </div>

      {/* 模块内容区域 - 应用宽度优化 */}
      <div className="space-y-6 statistics-wide-content">
        {children}
      </div>
    </div>
  );
}

export default StatisticsModuleLayout;