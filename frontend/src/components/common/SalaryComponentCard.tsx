import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SalaryFieldData {
  name: string;
  displayName: string;
  recordCount: number;
  avgAmount: number;
  category: string;
}

interface SalaryComponentCardProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
  fieldsData?: SalaryFieldData[];
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  className?: string;
}

export function SalaryComponentCard({
  title,
  subtitle,
  icon,
  checked,
  onChange,
  variant = 'primary',
  fieldsData = [],
  disabled = false,
  loading = false,
  error,
  className
}: SalaryComponentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation(); // 防止触发折叠面板
    onChange(e.target.checked);
  };

  const handleCardClick = () => {
    if (disabled) return;
    if (fieldsData.length > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  const variantClasses = {
    primary: 'border-primary/20 bg-primary/5 hover:bg-primary/10',
    secondary: 'border-secondary/20 bg-secondary/5 hover:bg-secondary/10',
    success: 'border-success/20 bg-success/5 hover:bg-success/10',
    warning: 'border-warning/20 bg-warning/5 hover:bg-warning/10',
    info: 'border-info/20 bg-info/5 hover:bg-info/10',
    error: 'border-error/20 bg-error/5 hover:bg-error/10'
  };

  const checkboxVariants = {
    primary: 'checkbox-primary',
    secondary: 'checkbox-secondary',
    success: 'checkbox-success',
    warning: 'checkbox-warning',
    info: 'checkbox-info',
    error: 'checkbox-error'
  };

  const badgeVariants = {
    primary: 'badge-primary',
    secondary: 'badge-secondary',
    success: 'badge-success',
    warning: 'badge-warning',
    info: 'badge-info',
    error: 'badge-error'
  };

  const textColors = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    success: 'text-success',
    warning: 'text-warning',
    info: 'text-info',
    error: 'text-error'
  };

  const hasFields = fieldsData.length > 0;
  const totalRecords = fieldsData.reduce((sum, field) => sum + field.recordCount, 0);
  const avgAmount = fieldsData.length > 0 
    ? fieldsData.reduce((sum, field) => sum + field.avgAmount, 0) / fieldsData.length 
    : 0;

  return (
    <div className={cn(
      "border rounded-lg transition-all duration-200",
      variantClasses[variant],
      (disabled || loading) && "opacity-50 cursor-not-allowed",
      (hasFields || loading) && !disabled && "cursor-pointer",
      loading && "animate-pulse",
      className
    )}>
      {/* 卡片头部 */}
      <div 
        className="p-3 select-none"
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between">
          {/* 左侧内容 */}
          <div className="flex items-center gap-3 flex-1">
            {/* 复选框 */}
            <input 
              type="checkbox" 
              className={cn("checkbox", checkboxVariants[variant])}
              checked={checked}
              onChange={handleCheckboxChange}
              disabled={disabled}
            />
            
            {/* 图标 */}
            <div className={cn("flex-shrink-0 text-lg", textColors[variant])}>
              {icon}
            </div>
            
            {/* 标题和副标题 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn("font-medium", textColors[variant])}>
                  {title}
                </h3>
                {hasFields && (
                  <div className={cn("badge badge-sm", badgeVariants[variant])}>
                    {fieldsData.length} 字段
                  </div>
                )}
              </div>
              <p className="text-xs text-base-content/60">
                {subtitle}
              </p>
              
              {/* 数据摘要 */}
              {hasFields && (
                <div className="flex items-center gap-3 mt-2 text-xs text-base-content/70">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {totalRecords} 人有数据
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    平均 ¥{avgAmount.toFixed(0)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 展开指示器 */}
          {hasFields && (
            <div className={cn(
              "flex-shrink-0 transition-transform duration-200 ml-2",
              isExpanded && "rotate-180",
              textColors[variant]
            )}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* 展开内容：字段详情 */}
      {(hasFields || loading || error) && (
        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="px-3 pb-3 border-t border-current/10">
            <div className="pt-3 space-y-3">
              <h5 className="font-medium text-base-content flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                包含字段详情
              </h5>
              
              {/* Loading状态 */}
              {loading && (
                <div className="flex items-center justify-center p-8">
                  <div className="flex items-center gap-3">
                    <span className="loading loading-spinner loading-sm"></span>
                    <span className="text-sm text-base-content/60">加载字段数据中...</span>
                  </div>
                </div>
              )}

              {/* Error状态 */}
              {error && !loading && (
                <div className="flex items-center justify-center p-8">
                  <div className="alert alert-error alert-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* 正常数据展示 */}
              {!loading && !error && hasFields && (
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {fieldsData.map((field, _index) => (
                  <div 
                    key={field.name}
                    className="flex justify-between items-center p-2 bg-base-100/50 rounded border border-base-200/30 hover:bg-base-100/80 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-base-content truncate">
                          {field.displayName}
                        </span>
                        <span className="text-xs text-base-content/40 font-mono">
                          {field.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-xs text-success font-medium">
                        {field.recordCount}人
                      </div>
                      <div className="text-xs text-base-content/60">
                        ¥{field.avgAmount.toFixed(0)}
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              )}
              
              {/* 说明信息 */}
              {!loading && !error && hasFields && (
                <div className="bg-info/5 border border-info/20 rounded-lg p-2">
                  <div className="flex items-start gap-2">
                    <svg className="w-3 h-3 text-info mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-base-content/70">
                      仅显示上月有记录且金额大于0的字段。选择复制后，这些字段的配置将应用到新薪资周期。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 无数据状态 */}
      {!hasFields && !loading && !error && (
        <div className="px-3 pb-3 border-t border-current/10">
          <div className="text-center py-3">
            <svg className="w-8 h-8 mx-auto text-base-content/20 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-xs text-base-content/50">
              上月此类别暂无数据
            </p>
          </div>
        </div>
      )}
    </div>
  );
}