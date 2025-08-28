import { useState, useEffect, useCallback } from 'react';

/**
 * 防抖值 Hook - 延迟更新值直到停止变化指定时间
 * @param value 需要防抖的值
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的值
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 防抖值 Hook - useDebouncedValue 的别名，保持兼容性
 * @param value 要防抖的值
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的值
 */
export const useDebouncedValue = useDebounce;

/**
 * 防抖回调 Hook - 延迟执行回调函数
 * @param callback 要防抖的回调函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的回调函数
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 组件卸载时清除定时器
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return useCallback((...args: Parameters<T>) => {
    // 清除之前的定时器
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // 设置新的定时器
    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  }, [callback, delay, timeoutId]);
}

/**
 * 防抖搜索 Hook
 * @param initialValue 初始搜索值
 * @param delay 防抖延迟时间（毫秒），默认300ms
 * @returns 搜索相关的状态和方法
 */
export function useSearchDebounce(initialValue = '', delay = 300) {
  const [searchValue, setSearchValue] = useState(initialValue);
  const [debouncedSearchValue, setDebouncedSearchValue] = useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchValue, delay]);

  // 立即搜索（不等待防抖）
  const triggerImmediateSearch = useCallback(() => {
    setDebouncedSearchValue(searchValue);
  }, [searchValue]);

  // 重置搜索
  const resetSearch = useCallback(() => {
    setSearchValue('');
    setDebouncedSearchValue('');
  }, []);

  // 优化的搜索值设置函数
  const setSearchValueOptimized = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  return {
    searchValue,
    debouncedSearchValue,
    setSearchValue: setSearchValueOptimized,
    triggerImmediateSearch,
    resetSearch,
    isSearching: searchValue !== debouncedSearchValue,
  };
}