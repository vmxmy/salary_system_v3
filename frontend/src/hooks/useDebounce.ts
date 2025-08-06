import { useState, useEffect, useCallback } from 'react';

/**
 * 防抖 Hook
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
 * 防抖搜索 Hook
 * @param initialValue 初始搜索值
 * @param delay 防抖延迟时间（毫秒），默认300ms
 * @returns 搜索相关的状态和方法
 */
export function useSearchDebounce(initialValue: string = '', delay: number = 300) {
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