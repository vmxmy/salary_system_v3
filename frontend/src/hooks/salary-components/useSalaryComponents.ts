/**
 * 薪资组件管理 Hook
 * 提供薪资字段的CRUD操作和数据管理功能
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCacheInvalidationManager } from '@/hooks/core/useCacheInvalidationManager';
import type { 
  SalaryComponent, 
  CreateSalaryComponentRequest, 
  UpdateSalaryComponentRequest,
  SalaryComponentQuery,
  SalaryComponentStats,
  ComponentType,
  ComponentCategory
} from '@/types/salary-component';

// Query Keys
export const SALARY_COMPONENT_KEYS = {
  all: ['salary-components'] as const,
  lists: () => [...SALARY_COMPONENT_KEYS.all, 'list'] as const,
  list: (query: SalaryComponentQuery) => [...SALARY_COMPONENT_KEYS.lists(), query] as const,
  details: () => [...SALARY_COMPONENT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...SALARY_COMPONENT_KEYS.details(), id] as const,
  stats: () => [...SALARY_COMPONENT_KEYS.all, 'stats'] as const,
};

/**
 * 获取薪资组件列表
 */
export function useSalaryComponents(query: SalaryComponentQuery = {}) {
  return useQuery({
    queryKey: SALARY_COMPONENT_KEYS.list(query),
    queryFn: async (): Promise<SalaryComponent[]> => {
      let queryBuilder = supabase
        .from('salary_components')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      // 应用筛选条件
      if (query.type) {
        queryBuilder = queryBuilder.eq('type', query.type);
      }
      
      if (query.category) {
        queryBuilder = queryBuilder.eq('category', query.category);
      }
      
      if (typeof query.is_taxable === 'boolean') {
        queryBuilder = queryBuilder.eq('is_taxable', query.is_taxable);
      }
      
      if (query.search) {
        queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);
      }

      // 应用分页
      if (query.limit) {
        queryBuilder = queryBuilder.limit(query.limit);
      }
      
      if (query.offset) {
        queryBuilder = queryBuilder.range(query.offset, query.offset + (query.limit || 50) - 1);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('获取薪资组件列表失败:', error);
        throw new Error(`获取薪资组件列表失败: ${error.message}`);
      }

      return (data || []) as SalaryComponent[];
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
}

/**
 * 获取薪资组件详情
 */
export function useSalaryComponent(id: string) {
  return useQuery({
    queryKey: SALARY_COMPONENT_KEYS.detail(id),
    queryFn: async (): Promise<SalaryComponent | null> => {
      const { data, error } = await supabase
        .from('salary_components')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return null;
        }
        console.error('获取薪资组件详情失败:', error);
        throw new Error(`获取薪资组件详情失败: ${error.message}`);
      }

      return data as SalaryComponent;
    },
    enabled: !!id,
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // 10分钟
  });
}

/**
 * 获取薪资组件统计信息
 */
export function useSalaryComponentStats() {
  return useQuery({
    queryKey: SALARY_COMPONENT_KEYS.stats(),
    queryFn: async (): Promise<SalaryComponentStats> => {
      // 获取总数和分类统计
      const { data: components, error } = await supabase
        .from('salary_components')
        .select('type, category, is_taxable');

      if (error) {
        console.error('获取薪资组件统计失败:', error);
        throw new Error(`获取薪资组件统计失败: ${error.message}`);
      }

      if (!components) {
        return {
          total: 0,
          by_type: { earning: 0, deduction: 0 },
          by_category: {
            basic_salary: 0,
            benefits: 0,
            personal_insurance: 0,
            employer_insurance: 0,
            personal_tax: 0,
            other_deductions: 0,
          },
          taxable_count: 0,
          non_taxable_count: 0,
        };
      }

      const stats: SalaryComponentStats = {
        total: components.length,
        by_type: { earning: 0, deduction: 0 },
        by_category: {
          basic_salary: 0,
          benefits: 0,
          personal_insurance: 0,
          employer_insurance: 0,
          personal_tax: 0,
          other_deductions: 0,
        },
        taxable_count: 0,
        non_taxable_count: 0,
      };

      components.forEach(component => {
        // 按类型统计
        if (component.type === 'earning' || component.type === 'deduction') {
          stats.by_type[component.type as ComponentType]++;
        }

        // 按类别统计
        if (component.category && component.category in stats.by_category) {
          stats.by_category[component.category as ComponentCategory]++;
        }

        // 按税务属性统计
        if (component.is_taxable) {
          stats.taxable_count++;
        } else {
          stats.non_taxable_count++;
        }
      });

      return stats;
    },
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // 10分钟
  });
}

/**
 * 创建薪资组件
 */
export function useCreateSalaryComponent() {
  const cacheManager = useCacheInvalidationManager();

  return useMutation({
    mutationFn: async (data: CreateSalaryComponentRequest): Promise<SalaryComponent> => {
      // 检查名称是否已存在
      const { data: existing, error: checkError } = await supabase
        .from('salary_components')
        .select('id')
        .eq('name', data.name)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`检查组件名称失败: ${checkError.message}`);
      }

      if (existing) {
        throw new Error(`薪资组件名称"${data.name}"已存在`);
      }

      const { data: newComponent, error } = await supabase
        .from('salary_components')
        .insert([data])
        .select('*')
        .single();

      if (error) {
        console.error('创建薪资组件失败:', error);
        throw new Error(`创建薪资组件失败: ${error.message}`);
      }

      return newComponent as SalaryComponent;
    },
    onSuccess: async (data) => {
      await cacheManager.invalidateByEvent('salary-component:created');
    },
  });
}

/**
 * 更新薪资组件
 */
export function useUpdateSalaryComponent() {
  const cacheManager = useCacheInvalidationManager();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateSalaryComponentRequest): Promise<SalaryComponent> => {
      // 如果更新名称，检查是否重复
      if (updateData.name) {
        const { data: existing, error: checkError } = await supabase
          .from('salary_components')
          .select('id')
          .eq('name', updateData.name)
          .neq('id', id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw new Error(`检查组件名称失败: ${checkError.message}`);
        }

        if (existing) {
          throw new Error(`薪资组件名称"${updateData.name}"已存在`);
        }
      }

      const { data: updatedComponent, error } = await supabase
        .from('salary_components')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('更新薪资组件失败:', error);
        throw new Error(`更新薪资组件失败: ${error.message}`);
      }

      return updatedComponent as SalaryComponent;
    },
    onSuccess: async (data) => {
      await cacheManager.invalidateByEvent('salary-component:updated');
    },
  });
}

/**
 * 删除薪资组件
 */
export function useDeleteSalaryComponent() {
  const cacheManager = useCacheInvalidationManager();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // 检查是否有相关的薪资数据使用此组件
      const { data: usage, error: checkError } = await supabase
        .from('payroll_items')
        .select('id')
        .eq('component_id', id)
        .limit(1);

      if (checkError) {
        console.error('检查组件使用情况失败:', checkError);
        throw new Error(`检查组件使用情况失败: ${checkError.message}`);
      }

      if (usage && usage.length > 0) {
        throw new Error('该薪资组件正在使用中，无法删除');
      }

      const { error } = await supabase
        .from('salary_components')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('删除薪资组件失败:', error);
        throw new Error(`删除薪资组件失败: ${error.message}`);
      }
    },
    onSuccess: async (_, deletedId) => {
      await cacheManager.invalidateByEvent('salary-component:deleted');
    },
  });
}

/**
 * 批量删除薪资组件
 */
export function useBatchDeleteSalaryComponents() {
  const cacheManager = useCacheInvalidationManager();

  return useMutation({
    mutationFn: async (ids: string[]): Promise<void> => {
      // 检查是否有相关的薪资数据使用这些组件
      const { data: usage, error: checkError } = await supabase
        .from('payroll_items')
        .select('component_id')
        .in('component_id', ids);

      if (checkError) {
        console.error('检查组件使用情况失败:', checkError);
        throw new Error(`检查组件使用情况失败: ${checkError.message}`);
      }

      if (usage && usage.length > 0) {
        const usedIds = [...new Set(usage.map(u => u.component_id))];
        throw new Error(`有 ${usedIds.length} 个薪资组件正在使用中，无法删除`);
      }

      const { error } = await supabase
        .from('salary_components')
        .delete()
        .in('id', ids);

      if (error) {
        console.error('批量删除薪资组件失败:', error);
        throw new Error(`批量删除薪资组件失败: ${error.message}`);
      }
    },
    onSuccess: async (_, deletedIds) => {
      await cacheManager.invalidateByEvent('salary-component:deleted');
    },
  });
}