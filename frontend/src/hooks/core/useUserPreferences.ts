import { useState, useCallback } from 'react';

// 列偏好设置接口
export interface ColumnPreference {
  visible: boolean;
  width?: number;
  order?: number;
}

// 表格偏好设置接口
export interface TablePreferences {
  columns: Record<string, ColumnPreference>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pageSize?: number;
  filters?: Record<string, any>;
}

// 通用用户偏好设置 Hook
export function useUserPreferences<T = any>(
  key: string,
  defaultValue?: T
): {
  preferences: T;
  updatePreferences: (newPrefs: T | ((prev: T) => T)) => void;
  resetPreferences: () => void;
} {
  // 从 localStorage 加载初始值
  const [preferences, setPreferences] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn(`Failed to parse stored preferences for key "${key}":`, error);
    }
    return defaultValue as T;
  });

  // 更新偏好设置
  const updatePreferences = useCallback((newPrefs: T | ((prev: T) => T)) => {
    const updatedPrefs = typeof newPrefs === 'function' 
      ? (newPrefs as (prev: T) => T)(preferences)
      : newPrefs;
    
    setPreferences(updatedPrefs);
    
    try {
      localStorage.setItem(key, JSON.stringify(updatedPrefs));
    } catch (error) {
      console.error(`Failed to save preferences for key "${key}":`, error);
    }
  }, [key, preferences]);

  // 重置为默认值
  const resetPreferences = useCallback(() => {
    setPreferences(defaultValue as T);
    
    try {
      if (defaultValue !== undefined) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Failed to reset preferences for key "${key}":`, error);
    }
  }, [key, defaultValue]);

  return {
    preferences,
    updatePreferences,
    resetPreferences,
  };
}

/**
 * 专门用于表格列偏好设置的 Hook
 * @param tableName 表名
 * @param defaultColumns 默认列配置
 * @returns 表格偏好设置和操作方法
 */
export function useTablePreferences(
  tableName: string,
  defaultColumns?: Record<string, ColumnPreference>
) {
  const defaultPreferences: TablePreferences = {
    columns: defaultColumns || {},
    pageSize: 20,
  };

  const {
    preferences,
    updatePreferences,
    resetPreferences
  } = useUserPreferences<TablePreferences>(
    `table-preferences-${tableName}`,
    defaultPreferences
  );

  // 更新单个列的偏好设置
  const updateColumnPreference = useCallback((
    columnName: string,
    columnPref: Partial<ColumnPreference>
  ) => {
    updatePreferences(prev => ({
      ...prev,
      columns: {
        ...prev.columns,
        [columnName]: {
          ...prev.columns[columnName],
          ...columnPref,
        },
      },
    }));
  }, [updatePreferences]);

  // 批量更新列偏好设置
  const updateColumnsPreferences = useCallback((
    columnsUpdate: Record<string, Partial<ColumnPreference>>
  ) => {
    updatePreferences(prev => {
      const updatedColumns = { ...prev.columns };
      
      Object.entries(columnsUpdate).forEach(([columnName, columnPref]) => {
        updatedColumns[columnName] = {
          ...updatedColumns[columnName],
          ...columnPref,
        };
      });

      return {
        ...prev,
        columns: updatedColumns,
      };
    });
  }, [updatePreferences]);

  // 切换列可见性
  const toggleColumnVisibility = useCallback((columnName: string) => {
    updateColumnPreference(columnName, {
      visible: !preferences.columns[columnName]?.visible,
    });
  }, [preferences.columns, updateColumnPreference]);

  // 设置列宽度
  const setColumnWidth = useCallback((columnName: string, width: number) => {
    updateColumnPreference(columnName, { width });
  }, [updateColumnPreference]);

  // 重置列顺序
  const resetColumnOrder = useCallback(() => {
    updatePreferences(prev => ({
      ...prev,
      columns: Object.fromEntries(
        Object.entries(prev.columns).map(([name, pref]) => [
          name,
          { ...pref, order: undefined }
        ])
      ),
    }));
  }, [updatePreferences]);

  // 设置排序
  const setSorting = useCallback((field: string, direction: 'asc' | 'desc') => {
    updatePreferences(prev => ({
      ...prev,
      sort: { field, direction },
    }));
  }, [updatePreferences]);

  // 清除排序
  const clearSorting = useCallback(() => {
    updatePreferences(prev => ({
      ...prev,
      sort: undefined,
    }));
  }, [updatePreferences]);

  // 设置页面大小
  const setPageSize = useCallback((pageSize: number) => {
    updatePreferences(prev => ({
      ...prev,
      pageSize,
    }));
  }, [updatePreferences]);

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    
    // 列相关操作
    updateColumnPreference,
    updateColumnsPreferences, 
    toggleColumnVisibility,
    setColumnWidth,
    resetColumnOrder,
    
    // 排序相关操作
    setSorting,
    clearSorting,
    
    // 分页相关操作
    setPageSize,
  };
}

/**
 * 生成默认的列偏好设置
 * @param columnNames 列名数组
 * @param hiddenColumns 默认隐藏的列
 * @returns 默认列偏好设置
 */
export function generateDefaultColumnPreferences(
  columnNames: string[],
  hiddenColumns: string[] = []
): Record<string, ColumnPreference> {
  return Object.fromEntries(
    columnNames.map((name, index) => [
      name,
      {
        visible: !hiddenColumns.includes(name),
        order: index,
      },
    ])
  );
}