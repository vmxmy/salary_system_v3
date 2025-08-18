import React from 'react';
import { cn } from '@/lib/utils';

export interface AccordionSectionProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: (id: string) => void;
  isEditing?: boolean;
  className?: string;
  variant?: 'default' | 'form';
}

/**
 * 统一的手风琴组件
 * 用于详情模态框中的各个信息分组
 */
export function AccordionSection({
  id,
  icon,
  title,
  children,
  isOpen,
  onToggle,
  isEditing = false,
  className = '',
  variant = 'default'
}: AccordionSectionProps) {
  const isCompact = className.includes('compact-accordion');
  
  return (
    <div className={cn(
      "collapse collapse-arrow bg-base-100 border border-base-200/60",
      isCompact ? "rounded-lg" : "rounded-xl",
      isCompact 
        ? "shadow-sm hover:shadow-md" 
        : "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04),0_1px_3px_-1px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.08)]",
      "hover:border-base-200 transition-all duration-300 ease-out",
      isOpen && (isCompact 
        ? "shadow-md border-primary/20" 
        : "shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08),0_4px_12px_-2px_rgba(0,0,0,0.1)] border-primary/20"),
      className
    )}>
      <input 
        type="checkbox" 
        checked={isOpen}
        onChange={() => onToggle(id)}
        className="peer"
        id={`accordion-${id}`}
        aria-expanded={isOpen}
        aria-controls={`section-content-${id}`}
      />
      <div className={cn(
        "collapse-title flex items-center justify-between",
        isCompact ? "text-sm font-medium" : "text-lg font-semibold",
        "peer-checked:border-b peer-checked:border-base-200/60 peer-checked:bg-gradient-to-r peer-checked:from-primary/5 peer-checked:to-transparent",
        "hover:bg-gradient-to-r hover:from-base-100 hover:to-transparent",
        "hover:translate-y-[-1px] cursor-pointer transition-all duration-300 ease-out",
        isCompact ? "min-h-[3rem] py-3 px-4" : "min-h-[4.5rem] py-5 px-6"
      )}>
        <div className={cn("flex items-center", isCompact ? "gap-3" : "gap-4")}>
          {/* 现代化图标容器 */}
          <div className="relative group">
            {/* 外层光环效果 */}
            <div className={cn(
              "absolute inset-0 transition-all duration-300",
              isCompact ? "rounded-lg" : "rounded-xl",
              "bg-gradient-to-br from-primary/15 to-primary/5",
              isCompact 
                ? "blur-md group-hover:blur-lg opacity-0 group-hover:opacity-100" 
                : "blur-xl group-hover:blur-2xl opacity-0 group-hover:opacity-100",
              isOpen && (isCompact ? "opacity-100 blur-lg" : "opacity-100 blur-2xl")
            )} />
            
            {/* 主图标容器 */}
            <div className={cn(
              "relative flex items-center justify-center rounded-xl",
              isCompact ? "w-8 h-8 rounded-lg" : "w-10 h-10 rounded-xl",
              "bg-gradient-to-br from-primary/12 to-primary/6",
              "shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.05)]",
              "ring-1 ring-primary/10 text-primary",
              "transition-all duration-300 ease-out",
              "group-hover:shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.15),inset_0_-2px_4px_0_rgba(0,0,0,0.08)]",
              "group-hover:ring-primary/20 group-hover:scale-105",
              isOpen && "bg-gradient-to-br from-primary/20 to-primary/8 ring-primary/20 scale-105"
            )}>
              <div className={cn(
                "transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                isOpen && "rotate-3 scale-110"
              )}>
                {icon}
              </div>
            </div>
          </div>
          
          <span className={cn(
            isCompact ? "text-xs" : "text-base",
            "text-base-content transition-colors duration-200",
            isOpen && "text-primary/90"
          )}>
            {title}
          </span>
        </div>
        
        {/* 现代化编辑模式指示器 */}
        {isEditing && (
          <div className={cn("flex items-center mr-6", isCompact ? "gap-2" : "gap-3")}>
            <div className="relative">
              {/* 编辑徽章光环 */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-r from-warning/20 to-warning/10 rounded-full animate-pulse",
                isCompact ? "blur-md" : "blur-lg"
              )} />
              
              {/* 编辑徽章 */}
              <div className={cn(
                "relative flex items-center gap-1.5 rounded-full bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 shadow-[0_0_16px_-4px_rgba(251,191,36,0.3)]",
                isCompact ? "px-2 py-1" : "px-3 py-1.5"
              )}>
                <div className="relative">
                  <div className={cn(
                    "bg-warning rounded-full shadow-[0_0_6px_1px_rgba(251,191,36,0.5)]",
                    isCompact ? "h-1 w-1" : "h-1.5 w-1.5"
                  )} />
                  <div className={cn(
                    "absolute inset-0 bg-warning rounded-full animate-ping opacity-75",
                    isCompact ? "h-1 w-1" : "h-1.5 w-1.5"
                  )} />
                </div>
                <span className={cn(
                  "font-medium text-warning tracking-wide",
                  isCompact ? "text-xs" : "text-xs"
                )}>
                  编辑中
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className={cn(
        "collapse-content",
        isCompact ? "peer-checked:pb-4" : "peer-checked:pb-6"
      )} id={`section-content-${id}`}>
        <div className={cn(
          isCompact ? "pt-3 px-4" : "pt-6 px-6",
          variant === 'form' && !isCompact ? "px-8" : ""
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * 手风琴内容的统一布局容器
 */
export interface AccordionContentProps {
  children: React.ReactNode;
  variant?: 'grid' | 'custom';
  className?: string;
}

export function AccordionContent({
  children,
  variant = 'grid',
  className = ''
}: AccordionContentProps) {
  if (variant === 'custom') {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn(
      "grid grid-cols-1 lg:grid-cols-2",
      // Compact spacing for tight layouts
      "gap-4 lg:gap-5",
      className
    )}>
      {children}
    </div>
  );
}

/**
 * 手风琴表单项容器
 */
export interface AccordionFormGroupProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AccordionFormGroup({
  title,
  icon,
  children,
  className = ''
}: AccordionFormGroupProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {title && (
        <div className="relative">
          {/* 标题背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/2 to-transparent rounded-lg -m-1 opacity-50" />
          
          <div className="relative flex items-center gap-3 pb-3 border-b border-base-200/60">
            {icon && (
              <div className="relative group">
                {/* 图标光环 */}
                <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                
                {/* 图标容器 */}
                <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 text-primary ring-1 ring-primary/10 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.1)]">
                  {icon}
                </div>
              </div>
            )}
            <h4 className={cn(
              "text-base",
              "text-base-content/90"
            )}>
              {title}
            </h4>
          </div>
        </div>
      )}
      <div className="space-y-5">
        {children}
      </div>
    </div>
  );
}

export default AccordionSection;