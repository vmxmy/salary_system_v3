import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 加载状态类型定义
 */
export interface LoadingState {
  /** 初始加载状态 */
  isInitialLoading: boolean;
  /** 重新获取数据状态 */
  isRefetching: boolean;
  /** 创建操作加载状态 */
  isCreating: boolean;
  /** 更新操作加载状态 */
  isUpdating: boolean;
  /** 删除操作加载状态 */
  isDeleting: boolean;
  /** 批量操作加载状态 */
  isBatchProcessing: boolean;
  /** 导入操作加载状态 */
  isImporting: boolean;
  /** 导出操作加载状态 */
  isExporting: boolean;
  /** 验证操作加载状态 */
  isValidating: boolean;
  /** 自定义操作加载状态 */
  customLoading: Record<string, boolean>;
}

/**
 * 加载状态操作类型
 */
export type LoadingAction = keyof Omit<LoadingState, 'customLoading'> | string;

/**
 * 加载状态配置选项
 */
export interface LoadingStateOptions {
  /** 初始加载状态 */
  initialState?: Partial<LoadingState>;
  /** 自动重置超时时间（毫秒） */
  autoResetTimeout?: number;
  /** 是否启用调试模式 */
  debug?: boolean;
}

/**
 * 默认加载状态
 */
const DEFAULT_LOADING_STATE: LoadingState = {
  isInitialLoading: false,
  isRefetching: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  isBatchProcessing: false,
  isImporting: false,
  isExporting: false,
  isValidating: false,
  customLoading: {}
};

/**
 * 细粒度加载状态管理Hook
 * 提供多种加载状态的管理和控制
 */
export function useLoadingState(options: LoadingStateOptions = {}) {
  const {
    initialState = {},
    autoResetTimeout = 30000, // 30秒自动重置
    debug = false
  } = options;

  // 合并初始状态
  const [loadingState, setLoadingState] = useState<LoadingState>({
    ...DEFAULT_LOADING_STATE,
    ...initialState
  });

  // 超时重置的引用
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  /**
   * 设置加载状态
   */
  const setLoading = useCallback((
    action: LoadingAction,
    isLoading: boolean,
    options?: {
      /** 是否自动重置 */
      autoReset?: boolean;
      /** 自定义超时时间 */
      timeout?: number;
    }
  ) => {
    const { autoReset = true, timeout = autoResetTimeout } = options || {};

    setLoadingState(prev => {
      let newState: LoadingState;

      if (action in DEFAULT_LOADING_STATE) {
        // 标准加载状态
        newState = {
          ...prev,
          [action]: isLoading
        };
      } else {
        // 自定义加载状态
        newState = {
          ...prev,
          customLoading: {
            ...prev.customLoading,
            [action]: isLoading
          }
        };
      }

      if (debug) {
        console.log(`🔄 Loading State: ${action} = ${isLoading}`, newState);
      }

      return newState;
    });

    // 清除之前的超时
    if (timeoutRefs.current[action]) {
      clearTimeout(timeoutRefs.current[action]);
      delete timeoutRefs.current[action];
    }

    // 设置自动重置超时
    if (isLoading && autoReset && timeout > 0) {
      timeoutRefs.current[action] = setTimeout(() => {
        setLoading(action, false, { autoReset: false });
        if (debug) {
          console.warn(`⚠️ Loading State Auto Reset: ${action} (timeout: ${timeout}ms)`);
        }
      }, timeout);
    }
  }, [autoResetTimeout, debug]);

  /**
   * 获取单个加载状态
   */
  const getLoading = useCallback((action: LoadingAction): boolean => {
    if (action in DEFAULT_LOADING_STATE) {
      return loadingState[action as keyof Omit<LoadingState, 'customLoading'>];
    }
    return loadingState.customLoading[action] || false;
  }, [loadingState]);

  /**
   * 检查是否有任何加载状态
   */
  const hasAnyLoading = useCallback((): boolean => {
    const standardLoading = Object.keys(DEFAULT_LOADING_STATE)
      .filter(key => key !== 'customLoading')
      .some(key => loadingState[key as keyof Omit<LoadingState, 'customLoading'>]);

    const customLoading = Object.values(loadingState.customLoading).some(Boolean);

    return standardLoading || customLoading;
  }, [loadingState]);

  /**
   * 获取所有当前激活的加载状态
   */
  const getActiveLoadings = useCallback((): string[] => {
    const active: string[] = [];

    // 检查标准加载状态
    Object.entries(loadingState).forEach(([key, value]) => {
      if (key !== 'customLoading' && value) {
        active.push(key);
      }
    });

    // 检查自定义加载状态
    Object.entries(loadingState.customLoading).forEach(([key, value]) => {
      if (value) {
        active.push(key);
      }
    });

    return active;
  }, [loadingState]);

  /**
   * 重置所有加载状态
   */
  const resetAllLoading = useCallback(() => {
    setLoadingState(DEFAULT_LOADING_STATE);
    
    // 清除所有超时
    Object.values(timeoutRefs.current).forEach(clearTimeout);
    timeoutRefs.current = {};

    if (debug) {
      console.log('🔄 All Loading States Reset');
    }
  }, [debug]);

  /**
   * 批量设置加载状态
   */
  const setBatchLoading = useCallback((
    actions: LoadingAction[],
    isLoading: boolean
  ) => {
    actions.forEach(action => setLoading(action, isLoading));
  }, [setLoading]);

  /**
   * 创建特定操作的加载控制器
   */
  const createLoadingController = useCallback((action: LoadingAction) => {
    return {
      start: (options?: { autoReset?: boolean; timeout?: number }) =>
        setLoading(action, true, options),
      stop: () => setLoading(action, false, { autoReset: false }),
      isLoading: () => getLoading(action),
      toggle: () => setLoading(action, !getLoading(action))
    };
  }, [setLoading, getLoading]);

  /**
   * 异步操作包装器
   */
  const withLoading = useCallback(async <T>(
    action: LoadingAction,
    asyncFn: () => Promise<T>,
    options?: {
      autoReset?: boolean;
      timeout?: number;
      onStart?: () => void;
      onComplete?: () => void;
      onError?: (error: any) => void;
    }
  ): Promise<T> => {
    const {
      autoReset = true,
      timeout = autoResetTimeout,
      onStart,
      onComplete,
      onError
    } = options || {};

    try {
      setLoading(action, true, { autoReset, timeout });
      onStart?.();
      
      const result = await asyncFn();
      
      onComplete?.();
      return result;
    } catch (error) {
      onError?.(error);
      throw error;
    } finally {
      setLoading(action, false, { autoReset: false });
    }
  }, [setLoading, autoResetTimeout]);

  // 清理超时
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, []);

  return {
    // 状态
    loadingState,
    
    // 基础操作
    setLoading,
    getLoading,
    resetAllLoading,
    setBatchLoading,
    
    // 查询操作
    hasAnyLoading,
    getActiveLoadings,
    
    // 高级功能
    createLoadingController,
    withLoading,
    
    // 便捷操作（常用操作的快捷方式）
    operations: {
      startCreate: () => setLoading('isCreating', true),
      stopCreate: () => setLoading('isCreating', false),
      startUpdate: () => setLoading('isUpdating', true),
      stopUpdate: () => setLoading('isUpdating', false),
      startDelete: () => setLoading('isDeleting', true),
      stopDelete: () => setLoading('isDeleting', false),
      startFetch: () => setLoading('isRefetching', true),
      stopFetch: () => setLoading('isRefetching', false)
    }
  };
}

/**
 * 简化版加载状态Hook - 用于单一操作
 */
export function useSimpleLoading(initialLoading: boolean = false) {
  const [isLoading, setIsLoading] = useState(initialLoading);

  const withLoading = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    try {
      setIsLoading(true);
      return await asyncFn();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    setIsLoading,
    withLoading
  };
}