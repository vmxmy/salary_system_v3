import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** 启用移动端安全区域适配 */
  safeArea?: boolean;
  /** 启用移动端无横向滚动 */
  noHorizontalScroll?: boolean;
  /** 启用移动端平滑滚动 */
  smoothScroll?: boolean;
  /** 移动端减少动画 */
  reducedMotion?: boolean;
  /** 内容间距模式 */
  spacing?: 'none' | 'compact' | 'normal' | 'relaxed';
  /** 最大宽度约束 */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
}

export function ResponsiveWrapper({
  children,
  className,
  safeArea = false,
  noHorizontalScroll = true,
  smoothScroll = true,
  reducedMotion = true,
  spacing = 'normal',
  maxWidth = 'full'
}: ResponsiveWrapperProps) {
  const spacingClasses = {
    none: '',
    compact: 'space-y-3 sm:space-y-4',
    normal: 'space-y-4 sm:space-y-6',
    relaxed: 'space-y-6 sm:space-y-8'
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'w-full'
  };

  return (
    <div
      className={cn(
        // 基础样式
        'w-full',
        maxWidthClasses[maxWidth],
        
        // 间距
        spacingClasses[spacing],
        
        // 安全区域适配
        safeArea && 'safe-area-padding',
        
        // 防止横向滚动
        noHorizontalScroll && 'mobile-no-scroll',
        
        // 平滑滚动
        smoothScroll && 'mobile-scroll-smooth',
        
        // 减少动画
        reducedMotion && 'mobile-reduce-motion',
        
        // 自定义类名
        className
      )}
    >
      {children}
    </div>
  );
}

// 移动端优化的按钮组组件
interface ResponsiveButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  /** 移动端是否堆叠显示 */
  stackOnMobile?: boolean;
  /** 按钮间距 */
  gap?: 'sm' | 'md' | 'lg';
}

export function ResponsiveButtonGroup({
  children,
  className,
  stackOnMobile = true,
  gap = 'md'
}: ResponsiveButtonGroupProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  };

  return (
    <div
      className={cn(
        'flex',
        gapClasses[gap],
        stackOnMobile ? 'flex-col sm:flex-row' : 'flex-row flex-wrap',
        stackOnMobile && 'mobile-button-group',
        className
      )}
    >
      {children}
    </div>
  );
}

// 移动端优化的表格容器
interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
  /** 启用水平滚动 */
  horizontalScroll?: boolean;
}

export function ResponsiveTable({
  children,
  className,
  horizontalScroll = true
}: ResponsiveTableProps) {
  return (
    <div
      className={cn(
        horizontalScroll && 'responsive-table-container',
        className
      )}
    >
      <div className={cn(horizontalScroll && 'responsive-table')}>
        {children}
      </div>
    </div>
  );
}

// 移动端优化的网格容器
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  /** 列数配置 */
  cols?: {
    mobile?: 1 | 2 | 3;
    tablet?: 1 | 2 | 3 | 4;
    desktop?: 1 | 2 | 3 | 4 | 5 | 6;
  };
  /** 间距 */
  gap?: 'sm' | 'md' | 'lg';
}

export function ResponsiveGrid({
  children,
  className,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md'
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const getGridCols = (count: number) => {
    const colsMap = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6'
    };
    return colsMap[count as keyof typeof colsMap] || 'grid-cols-1';
  };

  return (
    <div
      className={cn(
        'grid',
        gapClasses[gap],
        cols.mobile && getGridCols(cols.mobile),
        cols.tablet && `md:${getGridCols(cols.tablet)}`,
        cols.desktop && `lg:${getGridCols(cols.desktop)}`,
        className
      )}
    >
      {children}
    </div>
  );
}

// 移动端优化的模态框容器
interface ResponsiveModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  className?: string;
  /** 移动端全屏显示 */
  fullScreenOnMobile?: boolean;
  /** 最大宽度 */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export function ResponsiveModal({
  children,
  isOpen,
  onClose,
  className,
  fullScreenOnMobile = true,
  maxWidth = 'lg'
}: ResponsiveModalProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl'
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-base-100 rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto',
          maxWidthClasses[maxWidth],
          fullScreenOnMobile && 'sm:max-h-[90vh] mobile-modal',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(fullScreenOnMobile && 'mobile-modal-content')}>
          {children}
        </div>
      </div>
    </div>
  );
}

// 移动端优化的搜索表单
interface ResponsiveSearchFormProps {
  children: React.ReactNode;
  className?: string;
  /** 启用移动端堆叠布局 */
  stackOnMobile?: boolean;
}

export function ResponsiveSearchForm({
  children,
  className,
  stackOnMobile = true
}: ResponsiveSearchFormProps) {
  return (
    <div
      className={cn(
        'w-full',
        stackOnMobile && 'mobile-search',
        className
      )}
    >
      {children}
    </div>
  );
}

// 响应式断点检测 Hook
export function useResponsiveBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  React.useEffect(() => {
    const updateBreakpoint = () => {
      if (window.innerWidth < 768) {
        setBreakpoint('mobile');
      } else if (window.innerWidth < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop'
  };
}