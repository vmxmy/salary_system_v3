/**
 * 页面级指导启动器
 * 根据当前页面自动显示相关的指导流程
 */

import { useLocation } from 'react-router-dom';
import { useMemo, useCallback } from 'react';
import { OnboardingLauncher } from './OnboardingLauncher';
import { getFlowsForPage, isOnboardingSupportedPage } from '@/utils/onboardingPageUtils';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface PageOnboardingLauncherProps {
  // 可选的用户权限
  userPermissions?: readonly string[];
  
  // 是否强制显示（即使页面没有相关流程）
  forceShow?: boolean;
  
  // 自定义过滤函数
  customFilter?: (flowId: string) => boolean;
  
  // 额外的流程ID（补充当前页面的流程）
  additionalFlowIds?: string[];
  
  // 样式相关
  className?: string;
  
  // 显示位置配置
  position?: 'floating' | 'inline';
  
  // 浮动位置（当position为floating时）
  floatingPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

/**
 * 页面级指导启动器组件
 * 自动根据当前页面路径显示相关的指导流程
 */
export function PageOnboardingLauncher({
  userPermissions = [],
  forceShow = false,
  customFilter,
  additionalFlowIds = [],
  className = '',
  position = 'floating',
  floatingPosition = 'top-right'
}: PageOnboardingLauncherProps) {
  const location = useLocation();
  const { getAvailableFlows, startFlow } = useOnboarding();

  // 计算当前页面的相关流程
  const pageFlows = useMemo(() => {
    const pathname = location.pathname;
    
    // 检查页面是否支持指导系统
    if (!isOnboardingSupportedPage(pathname) && !forceShow) {
      return [];
    }
    
    // 获取页面相关的流程
    let flows = getFlowsForPage(pathname, userPermissions);
    
    // 添加额外的流程ID
    if (additionalFlowIds.length > 0) {
      const allFlows = getAvailableFlows();
      const additionalFlows = allFlows.filter(flow => 
        additionalFlowIds.includes(flow.id)
      );
      flows = [...flows, ...additionalFlows];
    }
    
    // 应用自定义过滤
    if (customFilter) {
      flows = flows.filter(flow => customFilter(flow.id));
    }
    
    // 去重
    const uniqueFlows = flows.filter((flow, index, self) => 
      index === self.findIndex(f => f.id === flow.id)
    );
    
    return uniqueFlows;
  }, [location.pathname, userPermissions, forceShow, customFilter, additionalFlowIds, getAvailableFlows]);

  // 如果没有相关流程，不显示启动器
  if (pageFlows.length === 0) {
    return null;
  }

  // 根据显示位置决定样式
  const positionClasses = useMemo(() => {
    if (position === 'inline') {
      return className;
    }
    
    // 浮动位置样式 - 默认右上角
    const baseClasses = 'fixed z-40';
    const positionMap = {
      'bottom-right': 'bottom-6 right-6',
      'bottom-left': 'bottom-6 left-6', 
      'top-right': 'top-6 right-6',
      'top-left': 'top-6 left-6'
    };
    
    return `${baseClasses} ${positionMap[floatingPosition]} ${className}`;
  }, [position, floatingPosition, className]);

  // 如果是浮动模式，显示为简单的帮助按钮
  if (position === 'floating') {
    return (
      <div className={positionClasses}>
        <div className="dropdown dropdown-bottom dropdown-end">
          <div 
            tabIndex={0} 
            role="button" 
            className="btn btn-circle btn-primary btn-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
            title="页面指导帮助"
          >
            <svg 
              className="w-4 h-4" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" 
                clipRule="evenodd" 
              />
            </svg>
          </div>
          <div 
            tabIndex={0} 
            className="dropdown-content z-50 card card-compact w-80 p-4 shadow-xl bg-base-100 border border-base-200 rounded-lg"
          >
            <div className="card-body p-0">
              <h3 className="font-semibold text-base-content mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                页面指导
              </h3>
              <OnboardingLauncher 
                availableFlows={pageFlows}
                showTitle={false}
                compact={true}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // 启动指导流程的处理函数
  const handleStartFlow = useCallback(async () => {
    if (pageFlows.length > 0) {
      const firstFlow = pageFlows[0];
      try {
        await startFlow(firstFlow.id);
      } catch (error) {
        console.error('启动指导流程失败:', error);
      }
    }
  }, [pageFlows, startFlow]);

  // 内联模式 - 渲染为页面标题栏中的指导按钮
  return (
    <div className={positionClasses}>
      <button 
        className="btn btn-circle btn-outline btn-sm"
        onClick={handleStartFlow}
        title="启动页面指导"
        disabled={pageFlows.length === 0}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path 
            fillRule="evenodd" 
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>
    </div>
  );
}

/**
 * 用于内联显示的页面指导启动器
 * 适合在页面内容区域内显示
 */
export function InlinePageOnboardingLauncher(props: Omit<PageOnboardingLauncherProps, 'position' | 'floatingPosition'>) {
  return (
    <PageOnboardingLauncher 
      {...props} 
      position="inline"
    />
  );
}

/**
 * 用于浮动显示的页面指导启动器
 * 适合作为页面右下角的浮动按钮
 */
export function FloatingPageOnboardingLauncher(props: Omit<PageOnboardingLauncherProps, 'position'>) {
  return (
    <PageOnboardingLauncher 
      {...props} 
      position="floating"
    />
  );
}