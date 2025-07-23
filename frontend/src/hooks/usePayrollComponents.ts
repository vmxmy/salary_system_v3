import { useState, useEffect, useMemo } from 'react';
import { PayrollComponentApi } from '../lib/payrollComponentApi';
import type { 
  PayrollComponent, 
  ComponentCategory, 
  ComponentFilters,
  ComponentStats,
  ComponentFormData 
} from '../types/payrollComponent';

export function usePayrollComponents() {
  const [components, setComponents] = useState<PayrollComponent[]>([]);
  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [stats, setStats] = useState<ComponentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 筛选条件
  const [filters, setFilters] = useState<ComponentFilters>({
    search: '',
    category: null,
    personnelType: null,
    isActive: null,
    isTaxable: null,
  });

  // 选中的组件
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(new Set());

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [componentsData, categoriesData, statsData] = await Promise.all([
        PayrollComponentApi.getComponents(),
        PayrollComponentApi.getCategories(),
        PayrollComponentApi.getStats()
      ]);

      setComponents(componentsData);
      setCategories(categoriesData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 筛选后的组件
  const filteredComponents = useMemo(() => {
    return components.filter(component => {
      // 搜索筛选
      if (filters.search && !component.name.toLowerCase().includes(filters.search.toLowerCase()) 
          && !component.code.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // 分类筛选
      if (filters.category && component.tags?.category !== filters.category) {
        return false;
      }

      // 人员类型筛选
      if (filters.personnelType && component.tags?.personnel_type !== filters.personnelType) {
        return false;
      }

      // 状态筛选
      if (filters.isActive !== null && component.is_active !== filters.isActive) {
        return false;
      }

      // 是否计税筛选
      if (filters.isTaxable !== null && component.is_taxable !== filters.isTaxable) {
        return false;
      }

      return true;
    });
  }, [components, filters]);

  // 按分类和人员类型分组
  const groupedComponents = useMemo(() => {
    const groups: Record<string, Record<string, PayrollComponent[]>> = {};
    
    filteredComponents.forEach(component => {
      const category = component.tags?.category || 'unknown';
      const personnelType = component.tags?.personnel_type || 'unknown';
      
      if (!groups[category]) {
        groups[category] = {};
      }
      if (!groups[category][personnelType]) {
        groups[category][personnelType] = [];
      }
      
      groups[category][personnelType].push(component);
    });

    return groups;
  }, [filteredComponents]);

  // 创建组件
  const createComponent = async (data: ComponentFormData) => {
    try {
      const newComponent = await PayrollComponentApi.createComponent(data);
      setComponents(prev => [...prev, newComponent].sort((a, b) => a.display_order - b.display_order));
      await loadData(); // 重新加载统计数据
      return newComponent;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : '创建失败');
    }
  };

  // 更新组件
  const updateComponent = async (code: string, data: Partial<ComponentFormData>) => {
    try {
      const updatedComponent = await PayrollComponentApi.updateComponent(code, data);
      setComponents(prev => 
        prev.map(c => c.code === code ? updatedComponent : c)
      );
      await loadData(); // 重新加载统计数据
      return updatedComponent;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : '更新失败');
    }
  };

  // 删除组件
  const deleteComponent = async (code: string) => {
    try {
      await PayrollComponentApi.deleteComponent(code);
      setComponents(prev => prev.filter(c => c.code !== code));
      setSelectedComponents(prev => {
        const newSet = new Set(prev);
        newSet.delete(code);
        return newSet;
      });
      await loadData(); // 重新加载统计数据
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 批量操作
  const batchActivate = async (codes: string[]) => {
    await PayrollComponentApi.batchUpdateStatus(codes, true);
    await loadData();
  };

  const batchDeactivate = async (codes: string[]) => {
    await PayrollComponentApi.batchUpdateStatus(codes, false);
    await loadData();
  };

  const batchDelete = async (codes: string[]) => {
    await PayrollComponentApi.batchDelete(codes);
    setSelectedComponents(new Set());
    await loadData();
  };

  // 选择操作
  const toggleSelection = (code: string) => {
    setSelectedComponents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedComponents(new Set(filteredComponents.map(c => c.code)));
  };

  const clearSelection = () => {
    setSelectedComponents(new Set());
  };

  // 初始化加载
  useEffect(() => {
    loadData();
  }, []);

  return {
    // 数据
    components: filteredComponents,
    groupedComponents,
    categories,
    stats,
    loading,
    error,

    // 筛选
    filters,
    setFilters,

    // 选择
    selectedComponents,
    toggleSelection,
    selectAll,
    clearSelection,

    // 操作
    createComponent,
    updateComponent,
    deleteComponent,
    batchActivate,
    batchDeactivate,
    batchDelete,
    refresh: loadData,
  };
}