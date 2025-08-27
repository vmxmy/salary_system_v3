/**
 * 优化版薪资组件筛选器管理 Hook
 * 修复页面死机问题，提供稳定的两级联动功能
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ComponentType, ComponentCategory } from '@/types/salary-component';

// 筛选选项接口
export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

// 类别筛选选项（带类型关联）
export interface CategoryFilterOption extends FilterOption {
  type: ComponentType;
}

// 筛选器数据结构
export interface SalaryComponentFilters {
  types: FilterOption[];
  categories: CategoryFilterOption[];
  categoriesByType: Record<ComponentType, FilterOption[]>;
}

// 静态查询键，防止不必要的重新查询
const FILTER_QUERY_KEY = ['salary-component-filters-v2'] as const;

/**
 * 优化版：获取薪资组件筛选器选项
 * 解决原版本的循环依赖和性能问题
 */
export function useSalaryComponentFiltersOptimized() {
  return useQuery({
    queryKey: FILTER_QUERY_KEY,
    queryFn: async (): Promise<SalaryComponentFilters> => {
      // 直接使用优化的查询方案
      return await getFallbackFilterData();
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 15 * 60 * 1000, // 15分钟，比原来更长的缓存时间
    gcTime: 30 * 60 * 1000, // 30分钟垃圾回收时间
  });
}

/**
 * 备用方案：当存储过程不可用时使用原始查询
 */
async function getFallbackFilterData(): Promise<SalaryComponentFilters> {
  const { data: components, error } = await supabase
    .from('salary_components')
    .select('type, category')
    .not('type', 'is', null);

  if (error) {
    console.error('备用方案查询失败:', error);
    throw new Error(`获取筛选器数据失败: ${error.message}`);
  }

  if (!components || components.length === 0) {
    return {
      types: [],
      categories: [],
      categoriesByType: { earning: [], deduction: [] },
    };
  }

  // 统计各类型的数量
  const typeStats = new Map<ComponentType, number>();
  const categoryStats = new Map<string, { count: number; type: ComponentType }>();
  
  components.forEach(component => {
    // 统计类型
    if (component.type) {
      const currentCount = typeStats.get(component.type as ComponentType) || 0;
      typeStats.set(component.type as ComponentType, currentCount + 1);
    }

    // 统计类别
    if (component.category && component.type) {
      const key = `${component.type}:${component.category}`;
      const current = categoryStats.get(key) || { count: 0, type: component.type as ComponentType };
      categoryStats.set(key, { count: current.count + 1, type: component.type as ComponentType });
    }
  });

  return buildFilterOptions(typeStats, categoryStats);
}


/**
 * 构建筛选器选项
 */
function buildFilterOptions(
  typeStats: Map<ComponentType, number>,
  categoryStats: Map<string, { count: number; type: ComponentType }>
): SalaryComponentFilters {
  // 构建类型选项
  const types: FilterOption[] = [
    {
      value: 'earning',
      label: '收入项',
      count: typeStats.get('earning') || 0,
    },
    {
      value: 'deduction', 
      label: '扣除项',
      count: typeStats.get('deduction') || 0,
    },
  ].filter(option => option.count > 0);

  // 构建类别选项
  const categories: CategoryFilterOption[] = [];
  const categoriesByType: Record<ComponentType, FilterOption[]> = {
    earning: [],
    deduction: [],
  };

  // 类别标签映射
  const categoryLabels: Record<ComponentCategory, string> = {
    basic_salary: '基本工资',
    benefits: '津贴补贴',
    personal_insurance: '个人保险',
    employer_insurance: '单位保险',
    personal_tax: '个人税费',
    other_deductions: '其他扣除',
  };

  categoryStats.forEach(({ count, type }, key) => {
    const [, categoryValue] = key.split(':');
    const label = categoryLabels[categoryValue as ComponentCategory] || categoryValue;
    
    const option: FilterOption = {
      value: categoryValue,
      label,
      count,
    };

    const categoryOption: CategoryFilterOption = {
      ...option,
      type,
    };

    categories.push(categoryOption);
    categoriesByType[type].push(option);
  });

  // 按标签排序
  categories.sort((a, b) => a.label.localeCompare(b.label));
  Object.keys(categoriesByType).forEach(type => {
    categoriesByType[type as ComponentType].sort((a, b) => a.label.localeCompare(b.label));
  });

  return {
    types,
    categories,
    categoriesByType,
  };
}

/**
 * 优化版：根据类型获取对应的类别选项
 * 使用 useMemo 防止不必要的重新计算
 */
export function useCategoriesByTypeOptimized(type: ComponentType | null) {
  const { data: filters } = useSalaryComponentFiltersOptimized();
  
  return useMemo(() => {
    if (!type || !filters) {
      return [];
    }
    
    return filters.categoriesByType[type] || [];
  }, [type, filters]);
}

/**
 * 防抖版筛选器更新 Hook
 * 防止用户快速操作时的频繁查询
 */
export function useDebounceFilterUpdate() {
  return useCallback((updateFn: () => void, delay = 300) => {
    let timeoutId: NodeJS.Timeout;
    
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateFn, delay);
    };
  }, []);
}