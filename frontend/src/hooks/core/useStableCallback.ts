import { useCallback, useRef, useEffect } from 'react';

/**
 * 稳定的回调Hook - 避免不必要的重新创建
 * 基于性能优化需求，确保回调函数引用稳定
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps?: React.DependencyList
): T {
  const callbackRef = useRef<T>(callback);
  const depsRef = useRef<React.DependencyList | undefined>(deps);

  // 更新回调引用
  if (!deps || !depsRef.current || !areArraysEqual(deps, depsRef.current)) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }

  // 返回稳定的回调引用
  const stableCallback = useCallback(
    ((...args: any[]) => {
      return callbackRef.current(...args);
    }) as T,
    [] // 空依赖数组确保引用稳定
  );

  return stableCallback;
}

/**
 * 数组浅比较工具函数
 */
function areArraysEqual(a: readonly any[], b: readonly any[]): boolean {
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
}

/**
 * 稳定的事件处理器Hook
 * 专门用于处理事件回调，避免组件重渲染
 */
export function useStableEventHandler<T extends (...args: any[]) => any>(
  handler: T | undefined
): T | undefined {
  const handlerRef = useRef<T | undefined>(handler);
  
  // 更新处理器引用
  handlerRef.current = handler;

  const stableHandler = useCallback(
    ((...args: any[]) => {
      return handlerRef.current?.(...args);
    }) as T,
    []
  );

  return handler ? stableHandler : undefined;
}

/**
 * 防抖的稳定回调Hook
 * 结合防抖和稳定引用，用于频繁触发的操作
 */
export function useStableDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps?: React.DependencyList
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const callbackRef = useRef<T>(callback);
  const depsRef = useRef<React.DependencyList | undefined>(deps);

  // 更新回调引用
  if (!deps || !depsRef.current || !areArraysEqual(deps, depsRef.current)) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }

  const debouncedCallback = useCallback(
    ((...args: any[]) => {
      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 设置新的定时器
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * 节流的稳定回调Hook
 * 结合节流和稳定引用，用于高频触发但需要限制执行频率的操作
 */
export function useStableThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps?: React.DependencyList
): T {
  const lastExecutedRef = useRef<number>(0);
  const callbackRef = useRef<T>(callback);
  const depsRef = useRef<React.DependencyList | undefined>(deps);

  // 更新回调引用
  if (!deps || !depsRef.current || !areArraysEqual(deps, depsRef.current)) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }

  const throttledCallback = useCallback(
    ((...args: any[]) => {
      const now = Date.now();
      
      if (now - lastExecutedRef.current >= delay) {
        lastExecutedRef.current = now;
        return callbackRef.current(...args);
      }
    }) as T,
    [delay]
  );

  return throttledCallback;
}