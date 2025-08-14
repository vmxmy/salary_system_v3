import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useResource } from '@/hooks/core/useResource';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';

/**
 * 职位数据类型
 */
export interface Position {
  id: string;
  name: string;
  code?: string;
  description?: string;
  level: number;
  parent_id?: string;
  department_id?: string;
  is_active: boolean;
  salary_range_min?: number;
  salary_range_max?: number;
  requirements?: string;
  responsibilities?: string;
  created_at: string;
  updated_at: string;
  // 关联数据
  department_name?: string;
  employee_count?: number;
  children?: Position[];
}

/**
 * 职位树节点类型
 */
export interface PositionTreeNode extends Position {
  children: PositionTreeNode[];
  employee_count: number;
}

/**
 * 职位查询键管理
 */
export const positionQueryKeys = {
  all: ['positions'] as const,
  list: () => [...positionQueryKeys.all, 'list'] as const,
  tree: () => [...positionQueryKeys.all, 'tree'] as const,
  detail: (id: string) => [...positionQueryKeys.all, 'detail', id] as const,
  byDepartment: (departmentId: string) => [...positionQueryKeys.all, 'department', departmentId] as const,
};

/**
 * 职位管理Hook
 * 专注于职位数据的管理和层级结构处理
 */
export function usePositions() {
  const { handleError } = useErrorHandler();

  // 使用通用资源Hook
  const {
    items: positionsRaw,
    loading,
    error,
    actions,
    utils
  } = useResource<Position>({
    queryKey: positionQueryKeys.list(),
    tableConfig: {
      tableName: 'positions',
      viewName: 'view_positions_with_details', // 假设有这个视图包含关联信息
      orderBy: { column: 'level', ascending: true },
      transform: (data) => ({
        ...data,
        employee_count: data.employee_count || 0
      })
    },
    staleTime: 10 * 60 * 1000, // 职位数据相对稳定，10分钟缓存
    enableRealtime: true,
    successMessages: {
      create: '职位创建成功',
      update: '职位更新成功',
      delete: '职位删除成功'
    }
  });

  // Type assertion for positions
  const positions = positionsRaw as Position[];

  // 构建职位树结构
  const positionTree = useMemo(() => {
    const buildTree = (
      positions: Position[], 
      parentId: string | null = null
    ): PositionTreeNode[] => {
      return positions
        .filter(pos => pos.parent_id === parentId)
        .map(pos => ({
          ...pos,
          children: buildTree(positions, pos.id),
          employee_count: pos.employee_count || 0
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    };

    return buildTree(positions);
  }, [positions]);

  // 获取扁平化的职位列表（按层级排序）
  const flattenedPositions = useMemo(() => {
    const flatten = (nodes: PositionTreeNode[], prefix = ''): PositionTreeNode[] => {
      const result: PositionTreeNode[] = [];
      
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

    return flatten(positionTree);
  }, [positionTree]);

  // 根职位（顶级职位）
  const rootPositions = useMemo(() => {
    return positions.filter(pos => !pos.parent_id);
  }, [positions]);

  // 按部门分组的职位
  const positionsByDepartment = useMemo(() => {
    const grouped: Record<string, Position[]> = {};
    
    positions.forEach(position => {
      if (position.department_id) {
        if (!grouped[position.department_id]) {
          grouped[position.department_id] = [];
        }
        grouped[position.department_id].push(position);
      }
    });
    
    return grouped;
  }, [positions]);

  // 获取职位路径
  const getPositionPath = useCallback((positionId: string): Position[] => {
    const path: Position[] = [];
    let currentPos = positions.find(p => p.id === positionId);
    
    while (currentPos) {
      path.unshift(currentPos);
      currentPos = currentPos.parent_id 
        ? positions.find(p => p.id === currentPos!.parent_id)
        : undefined;
    }
    
    return path;
  }, [positions]);

  // 获取职位完整名称
  const getPositionFullName = useCallback((positionId: string): string => {
    const path = getPositionPath(positionId);
    return path.map(pos => pos.name).join(' > ');
  }, [getPositionPath]);

  // 获取子职位（包括孙职位）
  const getChildPositions = useCallback((
    parentId: string, 
    includeGrandChildren = true
  ): Position[] => {
    if (!includeGrandChildren) {
      return positions.filter(pos => pos.parent_id === parentId);
    }

    const getAllChildren = (id: string): Position[] => {
      const directChildren = positions.filter(pos => pos.parent_id === id);
      const allChildren = [...directChildren];
      
      directChildren.forEach(child => {
        allChildren.push(...getAllChildren(child.id));
      });
      
      return allChildren;
    };

    return getAllChildren(parentId);
  }, [positions]);

  // 检查是否为父职位
  const isParentPosition = useCallback((positionId: string): boolean => {
    return positions.some(pos => pos.parent_id === positionId);
  }, [positions]);

  // 按部门获取职位
  const getPositionsByDepartment = useCallback((departmentId: string): Position[] => {
    return positions.filter(pos => pos.department_id === departmentId);
  }, [positions]);

  // 按级别获取职位
  const getPositionsByLevel = useCallback((level: number): Position[] => {
    return positions.filter(pos => pos.level === level);
  }, [positions]);

  // 搜索职位
  const searchPositions = useCallback((
    searchTerm: string
  ): Position[] => {
    if (!searchTerm) return positions;
    
    const term = searchTerm.toLowerCase();
    return positions.filter(pos =>
      pos.name.toLowerCase().includes(term) ||
      pos.code?.toLowerCase().includes(term) ||
      pos.description?.toLowerCase().includes(term) ||
      pos.department_name?.toLowerCase().includes(term)
    );
  }, [positions]);

  // 按薪资范围筛选职位
  const getPositionsBySalaryRange = useCallback((
    minSalary?: number,
    maxSalary?: number
  ): Position[] => {
    return positions.filter(pos => {
      if (minSalary && pos.salary_range_min && pos.salary_range_min < minSalary) {
        return false;
      }
      if (maxSalary && pos.salary_range_max && pos.salary_range_max > maxSalary) {
        return false;
      }
      return true;
    });
  }, [positions]);

  // 按状态筛选职位
  const getActivePositions = useCallback((): Position[] => {
    return positions.filter(pos => pos.is_active);
  }, [positions]);

  const getInactivePositions = useCallback((): Position[] => {
    return positions.filter(pos => !pos.is_active);
  }, [positions]);

  // 统计信息
  const statistics = useMemo(() => {
    const total = positions.length;
    const active = positions.filter(p => p.is_active).length;
    const inactive = total - active;
    const rootCount = rootPositions.length;
    const maxLevel = Math.max(...positions.map(p => p.level), 0);
    const totalEmployees = positions.reduce((sum, p) => sum + (p.employee_count || 0), 0);
    
    const withSalaryRange = positions.filter(p => p.salary_range_min && p.salary_range_max).length;
    const avgMinSalary = positions
      .filter(p => p.salary_range_min)
      .reduce((sum, p) => sum + (p.salary_range_min || 0), 0) / 
      positions.filter(p => p.salary_range_min).length || 0;
    const avgMaxSalary = positions
      .filter(p => p.salary_range_max)
      .reduce((sum, p) => sum + (p.salary_range_max || 0), 0) / 
      positions.filter(p => p.salary_range_max).length || 0;

    return {
      total,
      active,
      inactive,
      rootCount,
      maxLevel,
      totalEmployees,
      withSalaryRange,
      avgMinSalary: Math.round(avgMinSalary),
      avgMaxSalary: Math.round(avgMaxSalary)
    };
  }, [positions, rootPositions]);

  // 验证职位操作
  const validatePositionOperation = useCallback((
    operation: 'create' | 'update' | 'delete',
    positionData: Partial<Position>,
    targetId?: string
  ) => {
    const errors: string[] = [];

    switch (operation) {
      case 'create':
      case 'update':
        // 检查名称是否为空
        if (!positionData.name?.trim()) {
          errors.push('职位名称不能为空');
        }

        // 检查名称是否重复（同一部门下）
        if (positionData.department_id) {
          const existingPos = positions.find(p => 
            p.name === positionData.name && 
            p.department_id === positionData.department_id &&
            (operation === 'create' || p.id !== targetId)
          );
          if (existingPos) {
            errors.push('该部门下已存在相同名称的职位');
          }
        }

        // 检查父职位是否存在
        if (positionData.parent_id) {
          const parentExists = positions.some(p => p.id === positionData.parent_id);
          if (!parentExists) {
            errors.push('指定的父职位不存在');
          }
        }

        // 检查是否会造成循环引用
        if (operation === 'update' && positionData.parent_id && targetId) {
          const childIds = getChildPositions(targetId, true).map(p => p.id);
          if (childIds.includes(positionData.parent_id)) {
            errors.push('不能将职位设置为其子职位的下级');
          }
        }

        // 检查薪资范围
        if (positionData.salary_range_min && positionData.salary_range_max) {
          if (positionData.salary_range_min > positionData.salary_range_max) {
            errors.push('最低薪资不能高于最高薪资');
          }
        }
        break;

      case 'delete':
        if (targetId) {
          // 检查是否有子职位
          if (isParentPosition(targetId)) {
            errors.push('该职位下还有子职位，无法删除');
          }
          
          // 检查是否有员工
          const pos = positions.find(p => p.id === targetId);
          if (pos && pos.employee_count && pos.employee_count > 0) {
            errors.push('该职位下还有员工，无法删除');
          }
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [positions, getChildPositions, isParentPosition]);

  return {
    // 数据
    positions,
    positionTree,
    flattenedPositions,
    rootPositions,
    positionsByDepartment,
    statistics,
    
    // 状态
    loading,
    error,
    
    // 操作
    actions: {
      ...actions,
      // 包装原有操作，添加验证
      create: (data: Partial<Position>) => {
        const validation = validatePositionOperation('create', data);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
        return actions.create(data);
      },
      update: (data: { id: string; data: Partial<Position> }) => {
        const validation = validatePositionOperation('update', data.data, data.id);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
        return actions.update(data);
      },
      delete: (id: string) => {
        const validation = validatePositionOperation('delete', {}, id);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
        return actions.delete(id);
      }
    },
    
    // 工具函数
    utils: {
      ...utils,
      getPositionPath,
      getPositionFullName,
      getChildPositions,
      isParentPosition,
      getPositionsByDepartment,
      getPositionsByLevel,
      searchPositions,
      getPositionsBySalaryRange,
      getActivePositions,
      getInactivePositions,
      validatePositionOperation
    }
  };
}

/**
 * 职位选择Hook
 * 专门用于表单中的职位选择功能
 */
export function usePositionSelector(options: {
  /** 部门ID，只显示该部门下的职位 */
  departmentId?: string;
  /** 是否包含停用的职位 */
  includeInactive?: boolean;
  /** 是否显示层级结构 */
  showHierarchy?: boolean;
  /** 排除的职位ID列表 */
  excludeIds?: string[];
  /** 薪资范围过滤 */
  salaryRange?: { min?: number; max?: number };
}) {
  const { 
    departmentId, 
    includeInactive = false, 
    showHierarchy = true, 
    excludeIds = [],
    salaryRange
  } = options;
  
  const { 
    positions, 
    positionTree, 
    flattenedPositions, 
    loading,
    utils 
  } = usePositions();

  // 构建选择器选项
  const selectorOptions = useMemo(() => {
    let sourcePositions = showHierarchy ? flattenedPositions : (positions as Position[]);
    
    // 按部门过滤
    if (departmentId) {
      sourcePositions = sourcePositions.filter(pos => pos.department_id === departmentId);
    }
    
    // 过滤停用的职位
    if (!includeInactive) {
      sourcePositions = sourcePositions.filter(pos => pos.is_active);
    }
    
    // 排除指定的职位
    if (excludeIds.length > 0) {
      sourcePositions = sourcePositions.filter(pos => !excludeIds.includes(pos.id));
    }

    // 薪资范围过滤
    if (salaryRange) {
      sourcePositions = utils.getPositionsBySalaryRange(salaryRange.min, salaryRange.max);
    }

    return sourcePositions.map(pos => ({
      value: pos.id,
      label: pos.name,
      disabled: !pos.is_active,
      level: pos.level,
      departmentName: pos.department_name,
      salaryRange: pos.salary_range_min && pos.salary_range_max 
        ? `${pos.salary_range_min}-${pos.salary_range_max}`
        : undefined
    }));
  }, [
    positions, 
    flattenedPositions, 
    showHierarchy, 
    departmentId, 
    includeInactive, 
    excludeIds, 
    salaryRange,
    utils
  ]);

  return {
    options: selectorOptions,
    isLoading: loading.isInitialLoading,
    positions: showHierarchy ? positionTree : positions
  };
}