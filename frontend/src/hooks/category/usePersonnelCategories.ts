import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useResource } from '@/hooks/core/useResource';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';

/**
 * 人员类别数据类型
 */
export interface PersonnelCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  level: number;
  parent_id?: string;
  is_active: boolean;
  sort_order?: number;
  created_at: string;
  updated_at: string;
  // 计算属性
  children?: PersonnelCategory[];
  employee_count?: number;
}

/**
 * 人员类别树节点类型
 */
export interface PersonnelCategoryTreeNode extends PersonnelCategory {
  children: PersonnelCategoryTreeNode[];
  employee_count: number;
}

/**
 * 人员类别查询键管理
 */
export const personnelCategoryQueryKeys = {
  all: ['employee_categories'] as const,
  list: () => [...personnelCategoryQueryKeys.all, 'list'] as const,
  tree: () => [...personnelCategoryQueryKeys.all, 'tree'] as const,
  names: () => [...personnelCategoryQueryKeys.all, 'names'] as const,
  detail: (id: string) => [...personnelCategoryQueryKeys.all, 'detail', id] as const,
};

/**
 * 人员类别管理Hook
 * 专注于人员类别数据的管理和层级结构处理
 */
export function usePersonnelCategories() {
  const { handleError } = useErrorHandler();

  // 使用通用资源Hook
  const {
    items: categoriesRaw,
    loading,
    error,
    actions,
    utils
  } = useResource<PersonnelCategory>({
    queryKey: personnelCategoryQueryKeys.list(),
    tableConfig: {
      tableName: 'employee_categories',
      orderBy: { column: 'sort_order', ascending: true },
      transform: (data) => ({
        ...data,
        employee_count: data.employee_count || 0
      })
    },
    staleTime: 15 * 60 * 1000, // 人员类别数据更稳定，15分钟缓存
    enableRealtime: true,
    successMessages: {
      create: '人员类别创建成功',
      update: '人员类别更新成功',
      delete: '人员类别删除成功'
    }
  });

  // Type assertion for categories
  const categories = categoriesRaw as PersonnelCategory[];

  // 构建类别树结构
  const categoryTree = useMemo(() => {
    const buildTree = (
      categories: PersonnelCategory[], 
      parentId: string | null = null
    ): PersonnelCategoryTreeNode[] => {
      return categories
        .filter(cat => cat.parent_id === parentId)
        .map(cat => ({
          ...cat,
          children: buildTree(categories, cat.id),
          employee_count: cat.employee_count || 0
        }))
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    };

    return buildTree(categories);
  }, [categories]);

  // 获取扁平化的类别列表（按层级和排序）
  const flattenedCategories = useMemo(() => {
    const flatten = (nodes: PersonnelCategoryTreeNode[], prefix = ''): PersonnelCategoryTreeNode[] => {
      const result: PersonnelCategoryTreeNode[] = [];
      
      nodes.forEach(node => {
        result.push({
          ...node,
          name: prefix + node.name
        });
        
        if (node.children.length > 0) {
          result.push(...flatten(node.children, prefix + '├─ '));
        }
      });
      
      return result;
    };

    return flatten(categoryTree);
  }, [categoryTree]);

  // 根类别（顶级类别）
  const rootCategories = useMemo(() => {
    return categories.filter(cat => !cat.parent_id);
  }, [categories]);

  // 获取类别名称列表（向后兼容）
  const categoryNames = useMemo(() => {
    return categories.map(cat => cat.name);
  }, [categories]);

  // 获取类别路径
  const getCategoryPath = useCallback((categoryId: string): PersonnelCategory[] => {
    const path: PersonnelCategory[] = [];
    let currentCat = categories.find(c => c.id === categoryId);
    
    while (currentCat) {
      path.unshift(currentCat);
      currentCat = currentCat.parent_id 
        ? categories.find(c => c.id === currentCat!.parent_id)
        : undefined;
    }
    
    return path;
  }, [categories]);

  // 获取类别完整名称
  const getCategoryFullName = useCallback((categoryId: string): string => {
    const path = getCategoryPath(categoryId);
    return path.map(cat => cat.name).join(' > ');
  }, [getCategoryPath]);

  // 获取子类别（包括孙类别）
  const getChildCategories = useCallback((
    parentId: string, 
    includeGrandChildren = true
  ): PersonnelCategory[] => {
    if (!includeGrandChildren) {
      return categories.filter(cat => cat.parent_id === parentId);
    }

    const getAllChildren = (id: string): PersonnelCategory[] => {
      const directChildren = categories.filter(cat => cat.parent_id === id);
      const allChildren = [...directChildren];
      
      directChildren.forEach(child => {
        allChildren.push(...getAllChildren(child.id));
      });
      
      return allChildren;
    };

    return getAllChildren(parentId);
  }, [categories]);

  // 检查是否为父类别
  const isParentCategory = useCallback((categoryId: string): boolean => {
    return categories.some(cat => cat.parent_id === categoryId);
  }, [categories]);

  // 按级别获取类别
  const getCategoriesByLevel = useCallback((level: number): PersonnelCategory[] => {
    return categories.filter(cat => cat.level === level);
  }, [categories]);

  // 搜索类别
  const searchCategories = useCallback((
    searchTerm: string
  ): PersonnelCategory[] => {
    if (!searchTerm) return categories;
    
    const term = searchTerm.toLowerCase();
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(term) ||
      cat.code?.toLowerCase().includes(term) ||
      cat.description?.toLowerCase().includes(term)
    );
  }, [categories]);

  // 按状态筛选类别
  const getActiveCategories = useCallback((): PersonnelCategory[] => {
    return categories.filter(cat => cat.is_active);
  }, [categories]);

  const getInactiveCategories = useCallback((): PersonnelCategory[] => {
    return categories.filter(cat => !cat.is_active);
  }, [categories]);

  // 获取叶子类别（最终类别，没有子类别）
  const getLeafCategories = useCallback((): PersonnelCategory[] => {
    return categories.filter(cat => !isParentCategory(cat.id));
  }, [categories, isParentCategory]);

  // 统计信息
  const statistics = useMemo(() => {
    const total = categories.length;
    const active = categories.filter(c => c.is_active).length;
    const inactive = total - active;
    const rootCount = rootCategories.length;
    const leafCount = categories.filter(cat => !isParentCategory(cat.id)).length;
    const maxLevel = Math.max(...categories.map(c => c.level), 0);
    const totalEmployees = categories.reduce((sum, c) => sum + (c.employee_count || 0), 0);

    return {
      total,
      active,
      inactive,
      rootCount,
      leafCount,
      maxLevel,
      totalEmployees
    };
  }, [categories, rootCategories, isParentCategory]);

  // 验证类别操作
  const validateCategoryOperation = useCallback((
    operation: 'create' | 'update' | 'delete',
    categoryData: Partial<PersonnelCategory>,
    targetId?: string
  ) => {
    const errors: string[] = [];

    switch (operation) {
      case 'create':
      case 'update':
        // 检查名称是否为空
        if (!categoryData.name?.trim()) {
          errors.push('人员类别名称不能为空');
        }

        // 检查名称是否重复
        const existingCat = categories.find(c => 
          c.name === categoryData.name && 
          (operation === 'create' || c.id !== targetId)
        );
        if (existingCat) {
          errors.push('人员类别名称已存在');
        }

        // 检查编码是否重复（如果提供）
        if (categoryData.code) {
          const existingCode = categories.find(c => 
            c.code === categoryData.code && 
            (operation === 'create' || c.id !== targetId)
          );
          if (existingCode) {
            errors.push('人员类别编码已存在');
          }
        }

        // 检查父类别是否存在
        if (categoryData.parent_id) {
          const parentExists = categories.some(c => c.id === categoryData.parent_id);
          if (!parentExists) {
            errors.push('指定的父类别不存在');
          }
        }

        // 检查是否会造成循环引用
        if (operation === 'update' && categoryData.parent_id && targetId) {
          const childIds = getChildCategories(targetId, true).map(c => c.id);
          if (childIds.includes(categoryData.parent_id)) {
            errors.push('不能将类别设置为其子类别的下级');
          }
        }

        // 检查排序顺序
        if (categoryData.sort_order !== undefined && categoryData.sort_order < 0) {
          errors.push('排序顺序不能为负数');
        }
        break;

      case 'delete':
        if (targetId) {
          // 检查是否有子类别
          if (isParentCategory(targetId)) {
            errors.push('该类别下还有子类别，无法删除');
          }
          
          // 检查是否有员工
          const cat = categories.find(c => c.id === targetId);
          if (cat && cat.employee_count && cat.employee_count > 0) {
            errors.push('该类别下还有员工，无法删除');
          }
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [categories, getChildCategories, isParentCategory]);

  // 重新排序类别
  const reorderCategories = useMutation({
    mutationFn: async (reorderData: Array<{ id: string; sort_order: number }>) => {
      const promises = reorderData.map(({ id, sort_order }) =>
        supabase
          .from('employee_categories')
          .update({ sort_order })
          .eq('id', id)
      );
      
      const results = await Promise.all(promises);
      
      // 检查是否有错误
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error('重新排序失败');
      }
    },
    onSuccess: () => {
      actions.refresh();
      console.log('类别排序更新成功');
    },
    onError: (error) => {
      handleError(error, { customMessage: '重新排序失败' });
    }
  });

  return {
    // 数据
    categories,
    categoryTree,
    flattenedCategories,
    rootCategories,
    categoryNames, // 向后兼容
    statistics,
    
    // 状态
    loading,
    error,
    
    // 操作
    actions: {
      ...actions,
      reorder: reorderCategories.mutate,
      // 包装原有操作，添加验证
      create: (data: Partial<PersonnelCategory>) => {
        const validation = validateCategoryOperation('create', data);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
        return actions.create(data);
      },
      update: (data: { id: string; data: Partial<PersonnelCategory> }) => {
        const validation = validateCategoryOperation('update', data.data, data.id);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
        return actions.update(data);
      },
      delete: (id: string) => {
        const validation = validateCategoryOperation('delete', {}, id);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
        return actions.delete(id);
      }
    },
    
    // 工具函数
    utils: {
      ...utils,
      getCategoryPath,
      getCategoryFullName,
      getChildCategories,
      isParentCategory,
      getCategoriesByLevel,
      searchCategories,
      getActiveCategories,
      getInactiveCategories,
      getLeafCategories,
      validateCategoryOperation
    }
  };
}

/**
 * 人员类别名称Hook（向后兼容）
 * 提供简单的字符串数组，用于旧代码兼容
 */
export function usePersonnelCategoryNames() {
  const { categoryNames, loading } = usePersonnelCategories();
  
  return {
    data: categoryNames,
    isLoading: loading.isInitialLoading,
    error: null
  };
}

/**
 * 人员类别选择Hook
 * 专门用于表单中的类别选择功能
 */
export function usePersonnelCategorySelector(options: {
  /** 是否包含停用的类别 */
  includeInactive?: boolean;
  /** 是否显示层级结构 */
  showHierarchy?: boolean;
  /** 只显示叶子类别（最终类别） */
  leafOnly?: boolean;
  /** 排除的类别ID列表 */
  excludeIds?: string[];
  /** 最大级别限制 */
  maxLevel?: number;
}) {
  const { 
    includeInactive = false, 
    showHierarchy = true, 
    leafOnly = false,
    excludeIds = [],
    maxLevel
  } = options;
  
  const { 
    categories, 
    categoryTree, 
    flattenedCategories, 
    loading,
    utils 
  } = usePersonnelCategories();

  // 构建选择器选项
  const selectorOptions = useMemo(() => {
    let sourceCategories = showHierarchy ? flattenedCategories : categories;
    
    // 过滤停用的类别
    if (!includeInactive) {
      sourceCategories = sourceCategories.filter(cat => cat.is_active);
    }
    
    // 只显示叶子类别
    if (leafOnly) {
      sourceCategories = sourceCategories.filter(cat => !utils.isParentCategory(cat.id));
    }
    
    // 排除指定的类别
    if (excludeIds.length > 0) {
      sourceCategories = sourceCategories.filter(cat => !excludeIds.includes(cat.id));
    }

    // 最大级别限制
    if (maxLevel !== undefined) {
      sourceCategories = sourceCategories.filter(cat => cat.level <= maxLevel);
    }

    return sourceCategories.map(cat => ({
      value: cat.id,
      label: cat.name,
      disabled: !cat.is_active,
      level: cat.level,
      code: cat.code,
      employeeCount: cat.employee_count || 0,
      isLeaf: !utils.isParentCategory(cat.id)
    }));
  }, [
    categories, 
    flattenedCategories, 
    showHierarchy, 
    includeInactive, 
    leafOnly,
    excludeIds, 
    maxLevel,
    utils
  ]);

  return {
    options: selectorOptions,
    isLoading: loading.isInitialLoading,
    categories: showHierarchy ? categoryTree : categories
  };
}