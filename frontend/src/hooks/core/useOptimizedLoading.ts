import { useState, useEffect, useCallback, useRef } from 'react';
import { getOptimizedConfig } from '@/lib/performanceConfig';

/**
 * 优化的Loading状态管理Hook
 * 基于数据库性能提升调整Loading行为
 */
export interface OptimizedLoadingOptions {
  // 最小显示时间（毫秒）
  minDisplayTime?: number;
  
  // 是否为快速查询（影响超时时间）
  isQuickQuery?: boolean;
  
  // 自定义超时时间
  timeout?: number;
  
  // 是否显示骨架屏
  showSkeleton?: boolean;
  
  // 骨架屏显示阈值
  skeletonThreshold?: number;
}

export function useOptimizedLoading(
  isActuallyLoading: boolean,
  options: OptimizedLoadingOptions = {}
) {
  const config = getOptimizedConfig();
  
  const {
    minDisplayTime = config.loading.minDisplayTime,
    isQuickQuery = true,
    timeout = isQuickQuery ? config.loading.quickTimeout : config.loading.complexTimeout,
    showSkeleton = true,
    skeletonThreshold = config.loading.skeletonThreshold,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [showSkeletonScreen, setShowSkeletonScreen] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  
  const startTimeRef = useRef<number | null>(null);
  const minTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skeletonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 清理所有定时器
  const clearTimeouts = useCallback(() => {
    if (minTimeoutRef.current) {
      clearTimeout(minTimeoutRef.current);
      minTimeoutRef.current = null;
    }
    if (skeletonTimeoutRef.current) {
      clearTimeout(skeletonTimeoutRef.current);
      skeletonTimeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isActuallyLoading) {
      // 开始Loading
      startTimeRef.current = Date.now();
      setIsVisible(true);
      setHasTimedOut(false);
      
      // 骨架屏显示
      if (showSkeleton) {
        skeletonTimeoutRef.current = setTimeout(() => {
          setShowSkeletonScreen(true);
        }, skeletonThreshold);
      }
      
      // 超时处理
      maxTimeoutRef.current = setTimeout(() => {
        setHasTimedOut(true);
        console.warn(`Loading timeout after ${timeout}ms`);
      }, timeout);
      
    } else {
      // 结束Loading
      const elapsedTime = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      
      // 清理定时器
      clearTimeouts();
      setShowSkeletonScreen(false);
      
      if (elapsedTime < minDisplayTime) {
        // 确保最小显示时间
        minTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, minDisplayTime - elapsedTime);
      } else {
        // 立即隐藏
        setIsVisible(false);
      }
    }

    return clearTimeouts;
  }, [isActuallyLoading, minDisplayTime, timeout, showSkeleton, skeletonThreshold, clearTimeouts]);

  // 组件卸载时清理
  useEffect(() => {
    return clearTimeouts;
  }, [clearTimeouts]);

  return {
    // 是否显示Loading指示器
    isLoading: isVisible,
    
    // 是否显示骨架屏
    showSkeleton: showSkeletonScreen,
    
    // 是否已超时
    hasTimedOut,
    
    // 强制结束Loading
    forceEnd: useCallback(() => {
      clearTimeouts();
      setIsVisible(false);
      setShowSkeletonScreen(false);
      setHasTimedOut(false);
    }, [clearTimeouts]),
    
    // 重新开始Loading
    restart: useCallback(() => {
      clearTimeouts();
      startTimeRef.current = Date.now();
      setIsVisible(true);
      setShowSkeletonScreen(false);
      setHasTimedOut(false);
      
      if (showSkeleton) {
        skeletonTimeoutRef.current = setTimeout(() => {
          setShowSkeletonScreen(true);
        }, skeletonThreshold);
      }
    }, [clearTimeouts, showSkeleton, skeletonThreshold]),
  };
}

/**
 * 简化版Loading Hook - 用于快速查询
 */
export function useQuickLoading(isActuallyLoading: boolean) {
  return useOptimizedLoading(isActuallyLoading, {
    isQuickQuery: true,
    showSkeleton: false,
    minDisplayTime: 100, // 很短的最小显示时间
  });
}

/**
 * 复杂查询Loading Hook - 用于复杂查询
 */
export function useComplexLoading(isActuallyLoading: boolean) {
  return useOptimizedLoading(isActuallyLoading, {
    isQuickQuery: false,
    showSkeleton: true,
    minDisplayTime: getOptimizedConfig().loading.minDisplayTime,
  });
}

/**
 * 表格Loading Hook - 专门用于表格数据加载
 */
export function useTableLoading(isActuallyLoading: boolean, recordCount?: number) {
  const isLargeDataset = (recordCount ?? 0) > 100;
  
  return useOptimizedLoading(isActuallyLoading, {
    isQuickQuery: !isLargeDataset,
    showSkeleton: isLargeDataset,
    minDisplayTime: isLargeDataset ? 300 : 150,
  });
}