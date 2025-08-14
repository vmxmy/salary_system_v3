import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useResource } from '@/hooks/core/useResource';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';

/**
 * 部门数据类型
 */
export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  parent_id?: string;
  level: number;
  is_active: boolean;
  manager_id?: string;
  created_at: string;
  updated_at: string;
  // 计算属性
  children?: Department[];
  employee_count?: number;
}

/**
 * 部门树节点类型
 */
export interface DepartmentTreeNode extends Department {
  children: DepartmentTreeNode[];
  employee_count: number;
  manager_name?: string;
}

/**
 * 部门查询键管理
 */
export const departmentQueryKeys = {
  all: ['departments'] as const,
  list: () => [...departmentQueryKeys.all, 'list'] as const,
  tree: () => [...departmentQueryKeys.all, 'tree'] as const,
  detail: (id: string) => [...departmentQueryKeys.all, 'detail', id] as const,
  employees: (id: string) => [...departmentQueryKeys.all, id, 'employees'] as const,
};

/**
 * 部门管理Hook
 * 专注于部门数据的管理和组织架构处理
 */
export function useDepartments() {
  const { handleError } = useErrorHandler();

  // 使用通用资源Hook
  const {
    items: departments,
    loading,
    error,
    actions,
    utils
  } = useResource<Department>({
    queryKey: departmentQueryKeys.list(),
    tableConfig: {
      tableName: 'departments',
      orderBy: { column: 'level', ascending: true },
      transform: (data) => ({
        ...data,
        employee_count: data.employee_count || 0
      })
    },
    staleTime: 10 * 60 * 1000, // 部门数据相对稳定，10分钟缓存
    enableRealtime: true,
    successMessages: {
      create: '部门创建成功',
      update: '部门更新成功',
      delete: '部门删除成功'
    }
  });

  // 构建部门树结构
  const departmentTree = useMemo(() => {
    const buildTree = (
      departments: Department[], 
      parentId: string | null = null
    ): DepartmentTreeNode[] => {
      return departments
        .filter(dept => dept.parent_id === parentId)
        .map(dept => ({
          ...dept,
          children: buildTree(departments, dept.id),
          employee_count: dept.employee_count || 0
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    };

    return buildTree(departments);
  }, [departments]);

  // 获取扁平化的部门列表（按层级排序）
  const flattenedDepartments = useMemo(() => {
    const flatten = (nodes: DepartmentTreeNode[], prefix = ''): DepartmentTreeNode[] => {
      const result: DepartmentTreeNode[] = [];
      
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

    return flatten(departmentTree);
  }, [departmentTree]);

  // 根部门（顶级部门）
  const rootDepartments = useMemo(() => {
    return departments.filter(dept => !dept.parent_id);
  }, [departments]);

  // 获取部门路径
  const getDepartmentPath = useCallback((departmentId: string): Department[] => {
    const path: Department[] = [];
    let currentDept = departments.find(d => d.id === departmentId);
    
    while (currentDept) {
      path.unshift(currentDept);
      currentDept = currentDept.parent_id 
        ? departments.find(d => d.id === currentDept!.parent_id)
        : undefined;
    }
    
    return path;
  }, [departments]);

  // 获取部门层级名称
  const getDepartmentFullName = useCallback((departmentId: string): string => {
    const path = getDepartmentPath(departmentId);
    return path.map(dept => dept.name).join(' > ');
  }, [getDepartmentPath]);

  // 获取子部门（包括孙部门）
  const getChildDepartments = useCallback((
    parentId: string, 
    includeGrandChildren = true
  ): Department[] => {
    if (!includeGrandChildren) {
      return departments.filter(dept => dept.parent_id === parentId);
    }

    const getAllChildren = (id: string): Department[] => {
      const directChildren = departments.filter(dept => dept.parent_id === id);
      const allChildren = [...directChildren];
      
      directChildren.forEach(child => {
        allChildren.push(...getAllChildren(child.id));
      });
      
      return allChildren;
    };

    return getAllChildren(parentId);
  }, [departments]);

  // 检查是否为父部门
  const isParentDepartment = useCallback((departmentId: string): boolean => {
    return departments.some(dept => dept.parent_id === departmentId);
  }, [departments]);

  // 搜索部门
  const searchDepartments = useCallback((
    searchTerm: string
  ): Department[] => {
    if (!searchTerm) return departments;
    
    const term = searchTerm.toLowerCase();
    return departments.filter(dept =>
      dept.name.toLowerCase().includes(term) ||
      dept.code?.toLowerCase().includes(term) ||
      dept.description?.toLowerCase().includes(term)
    );
  }, [departments]);

  // 按状态筛选部门
  const getActiveDepartments = useCallback((): Department[] => {
    return departments.filter(dept => dept.is_active);
  }, [departments]);

  const getInactiveDepartments = useCallback((): Department[] => {
    return departments.filter(dept => !dept.is_active);
  }, [departments]);

  // 统计信息
  const statistics = useMemo(() => {
    const total = departments.length;
    const active = departments.filter(d => d.is_active).length;
    const inactive = total - active;
    const rootCount = rootDepartments.length;
    const maxLevel = Math.max(...departments.map(d => d.level), 0);
    const totalEmployees = departments.reduce((sum, d) => sum + (d.employee_count || 0), 0);

    return {
      total,
      active,
      inactive,
      rootCount,
      maxLevel,
      totalEmployees
    };
  }, [departments, rootDepartments]);

  // 验证部门操作
  const validateDepartmentOperation = useCallback((
    operation: 'create' | 'update' | 'delete',
    departmentData: Partial<Department>,
    targetId?: string
  ) => {
    const errors: string[] = [];

    switch (operation) {
      case 'create':
      case 'update':
        // 检查名称是否为空
        if (!departmentData.name?.trim()) {
          errors.push('部门名称不能为空');
        }

        // 检查名称是否重复
        const existingDept = departments.find(d => 
          d.name === departmentData.name && 
          (operation === 'create' || d.id !== targetId)
        );
        if (existingDept) {
          errors.push('部门名称已存在');
        }

        // 检查父部门是否存在
        if (departmentData.parent_id) {
          const parentExists = departments.some(d => d.id === departmentData.parent_id);
          if (!parentExists) {
            errors.push('指定的父部门不存在');
          }
        }

        // 检查是否会造成循环引用
        if (operation === 'update' && departmentData.parent_id && targetId) {
          const childIds = getChildDepartments(targetId, true).map(d => d.id);
          if (childIds.includes(departmentData.parent_id)) {
            errors.push('不能将部门设置为其子部门的下级');
          }
        }
        break;

      case 'delete':
        if (targetId) {
          // 检查是否有子部门
          if (isParentDepartment(targetId)) {
            errors.push('该部门下还有子部门，无法删除');
          }
          
          // 检查是否有员工
          const dept = departments.find(d => d.id === targetId);
          if (dept && dept.employee_count && dept.employee_count > 0) {
            errors.push('该部门下还有员工，无法删除');
          }
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [departments, getChildDepartments, isParentDepartment]);

  return {
    // 数据
    departments,
    departmentTree,
    flattenedDepartments,
    rootDepartments,
    statistics,
    
    // 状态
    loading,
    error,
    
    // 操作
    actions: {
      ...actions,
      // 包装原有操作，添加验证
      create: (data: Partial<Department>) => {
        const validation = validateDepartmentOperation('create', data);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
        return actions.create(data);
      },
      update: (data: { id: string; data: Partial<Department> }) => {
        const validation = validateDepartmentOperation('update', data.data, data.id);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
        return actions.update(data);
      },
      delete: (id: string) => {
        const validation = validateDepartmentOperation('delete', {}, id);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
        return actions.delete(id);
      }
    },
    
    // 工具函数
    utils: {
      ...utils,
      getDepartmentPath,
      getDepartmentFullName,
      getChildDepartments,
      isParentDepartment,
      searchDepartments,
      getActiveDepartments,
      getInactiveDepartments,
      validateDepartmentOperation
    }
  };
}

/**
 * 部门选择Hook
 * 专门用于表单中的部门选择功能
 */
export function useDepartmentSelector(options: {
  /** 是否包含停用的部门 */
  includeInactive?: boolean;
  /** 是否显示层级结构 */
  showHierarchy?: boolean;
  /** 排除的部门ID列表 */
  excludeIds?: string[];
}) {
  const { includeInactive = false, showHierarchy = true, excludeIds = [] } = options;
  
  const { departments, departmentTree, flattenedDepartments, loading } = useDepartments();

  // 构建选择器选项
  const selectorOptions = useMemo(() => {
    let sourceDepartments = showHierarchy ? flattenedDepartments : departments;
    
    // 过滤停用的部门
    if (!includeInactive) {
      sourceDepartments = sourceDepartments.filter(dept => dept.is_active);
    }
    
    // 排除指定的部门
    if (excludeIds.length > 0) {
      sourceDepartments = sourceDepartments.filter(dept => !excludeIds.includes(dept.id));
    }

    return sourceDepartments.map(dept => ({
      value: dept.id,
      label: dept.name,
      disabled: !dept.is_active,
      level: dept.level
    }));
  }, [departments, flattenedDepartments, showHierarchy, includeInactive, excludeIds]);

  return {
    options: selectorOptions,
    isLoading: loading.isInitialLoading,
    departments: showHierarchy ? departmentTree : departments
  };
}