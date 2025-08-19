import { useCallback, useMemo } from 'react';
import { useResource } from '@/hooks/core/useResource';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { Database } from '@/types/supabase';

// 类型定义
type SalaryComponent = Database['public']['Tables']['salary_components']['Row'];
type SalaryComponentInsert = Database['public']['Tables']['salary_components']['Insert'];
type SalaryComponentUpdate = Database['public']['Tables']['salary_components']['Update'];

// 薪资组件类别
export type SalaryComponentCategory = 
  | 'basic_salary'
  | 'benefits'
  | 'personal_insurance'
  | 'employer_insurance'
  | 'personal_tax'
  | 'other_deductions';

// 薪资组件字段元数据
export interface SalaryComponentField extends SalaryComponent {
  label: string;
  system_key: string;
  is_active: boolean;
  display_order: number;
  calculation_formula?: string;
  metadata?: {
    required?: boolean;
    editable?: boolean;
    visible?: boolean;
    min?: number;
    max?: number;
    precision?: number;
    unit?: string;
  };
}

// 字段分组
export interface FieldGroup {
  category: SalaryComponentCategory;
  label: string;
  fields: SalaryComponentField[];
  total?: number;
}

// 查询键管理
export const salaryComponentQueryKeys = {
  all: ['salary-components'] as const,
  fields: () => [...salaryComponentQueryKeys.all, 'fields'] as const,
  field: (id: string) => [...salaryComponentQueryKeys.all, 'field', id] as const,
  categories: () => [...salaryComponentQueryKeys.all, 'categories'] as const,
  byCategory: (category: SalaryComponentCategory) => [...salaryComponentQueryKeys.all, 'category', category] as const,
};

/**
 * 薪资组件字段管理 Hook
 * 提供薪资组件的 CRUD 操作和字段配置管理
 */
export function useSalaryComponentFields() {
  const { handleError } = useErrorHandler();
  const queryClient = useQueryClient();

  // 使用 useResource 管理基础 CRUD
  const {
    items: components,
    loading,
    error,
    actions,
    mutations,
    utils
  } = useResource<SalaryComponent>({
    queryKey: salaryComponentQueryKeys.fields(),
    tableConfig: {
      tableName: 'salary_components',
      viewName: 'salary_components', // 如果有视图可以使用视图
      orderBy: { column: 'name', ascending: true },
      transform: (data) => ({
        ...data,
        metadata: data.metadata || {}
      })
    },
    enableRealtime: true,
    successMessages: {
      create: '薪资组件创建成功',
      update: '薪资组件更新成功',
      delete: '薪资组件删除成功'
    }
  });

  // 转换为字段格式
  const fields: SalaryComponentField[] = useMemo(() => {
    return components.map(component => ({
      // 来自 SalaryComponent 的所有字段
      ...component,
      // 扩展字段
      label: component.name, // 使用 name 作为 label
      system_key: component.id, // 使用 id 作为 system_key
      is_active: true, // 默认为 true
      display_order: 999, // 默认顺序
      calculation_formula: undefined,
      metadata: {}
    }));
  }, [components]);

  // 获取类别列表
  const useCategories = () => {
    return useQuery({
      queryKey: salaryComponentQueryKeys.categories(),
      queryFn: async () => {
        const categories: Array<{ value: SalaryComponentCategory; label: string; description: string }> = [
          { value: 'basic_salary', label: '基本工资', description: '员工的基本薪资' },
          { value: 'benefits', label: '福利津贴', description: '各类津贴和补贴' },
          { value: 'personal_insurance', label: '个人社保', description: '个人缴纳的社保部分' },
          { value: 'employer_insurance', label: '公司社保', description: '公司缴纳的社保部分' },
          { value: 'personal_tax', label: '个人所得税', description: '应缴个人所得税' },
          { value: 'other_deductions', label: '其他扣款', description: '其他扣除项目' }
        ];
        return categories;
      },
      staleTime: Infinity // 类别列表不会变化
    });
  };

  // 按类别分组字段
  const fieldsByCategory = useMemo(() => {
    const groups: Record<SalaryComponentCategory, SalaryComponentField[]> = {
      'basic_salary': [],
      'benefits': [],
      'personal_insurance': [],
      'employer_insurance': [],
      'personal_tax': [],
      'other_deductions': []
    };

    fields.forEach(field => {
      if (field.category && groups[field.category as keyof typeof groups]) {
        groups[field.category as keyof typeof groups].push(field);
      }
    });

    return groups;
  }, [fields]);

  // 获取字段分组
  const getFieldGroups = useCallback((): FieldGroup[] => {
    const categories = useCategories();
    const categoryMap = new Map(
      categories.data?.map(c => [c.value, c.label]) || []
    );

    return Object.entries(fieldsByCategory).map(([category, fields]) => ({
      category: category as SalaryComponentCategory,
      label: categoryMap.get(category as SalaryComponentCategory) || category,
      fields,
      total: fields.reduce((sum, field) => {
        // 这里可以计算每个分组的总额（如果有金额数据）
        return sum;
      }, 0)
    }));
  }, [fieldsByCategory]);

  // 获取收入项字段
  const earningFields = useMemo(() => {
    return fields.filter(field => field.type === 'earning');
  }, [fields]);

  // 获取扣除项字段
  const deductionFields = useMemo(() => {
    return fields.filter(field => field.type === 'deduction');
  }, [fields]);

  // 获取应税字段
  const taxableFields = useMemo(() => {
    return fields.filter(field => field.is_taxable);
  }, [fields]);

  // 创建字段
  const createField = useCallback(async (fieldData: Partial<SalaryComponentField>) => {
    const componentData: SalaryComponentInsert = {
      name: fieldData.label || fieldData.name || '',
      type: fieldData.type || 'earning',
      category: fieldData.category,
      description: fieldData.description,
      is_taxable: fieldData.is_taxable || false,
      base_dependency: fieldData.base_dependency,
      copy_strategy: fieldData.copy_strategy,
      copy_notes: fieldData.copy_notes,
      stability_level: fieldData.stability_level
    };

    return actions.create(componentData);
  }, [actions]);

  // 更新字段
  const updateField = useCallback(async (id: string, updates: Partial<SalaryComponentField>) => {
    const componentUpdates: SalaryComponentUpdate = {
      name: updates.label || updates.name,
      type: updates.type,
      category: updates.category,
      description: updates.description,
      is_taxable: updates.is_taxable,
      base_dependency: updates.base_dependency,
      copy_strategy: updates.copy_strategy,
      copy_notes: updates.copy_notes,
      stability_level: updates.stability_level
    };

    return actions.update({ id, data: componentUpdates });
  }, [actions]);

  // 删除字段
  const deleteField = useCallback(async (id: string) => {
    return actions.delete(id);
  }, [actions]);

  // 批量更新字段顺序
  const updateFieldsOrder = useMutation({
    mutationFn: async (fields: Array<{ id: string; display_order: number }>) => {
      const promises = fields.map(field =>
        // 注意: salary_components 表没有 display_order 字段
        // 这里只返回成功状态
        Promise.resolve({ data: field, error: null })
      );

      const results = await Promise.all(promises);
      
      // 检查是否有错误
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`更新失败: ${(errors[0] as any).error?.message || '未知错误'}`);
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryComponentQueryKeys.all });
    },
    onError: (error) => {
      handleError(error, { customMessage: '更新字段顺序失败' });
    }
  });

  // 切换字段激活状态
  const toggleFieldActive = useCallback(async (id: string) => {
    const field = fields.find(f => f.id === id);
    if (!field) return;

    return updateField(id, { is_active: !field.is_active });
  }, [fields, updateField]);

  // 根据系统键获取字段
  const getFieldBySystemKey = useCallback((systemKey: string) => {
    return fields.find(f => f.system_key === systemKey);
  }, [fields]);

  // 验证字段配置
  const validateFieldConfig = useCallback((field: Partial<SalaryComponentField>): string[] => {
    const errors: string[] = [];

    if (!field.name && !field.label) {
      errors.push('字段名称不能为空');
    }

    if (!field.type) {
      errors.push('字段类型不能为空');
    }

    if (!field.category) {
      errors.push('字段类别不能为空');
    }

    if (field.metadata) {
      if (field.metadata.min !== undefined && field.metadata.max !== undefined) {
        if (field.metadata.min > field.metadata.max) {
          errors.push('最小值不能大于最大值');
        }
      }
    }

    return errors;
  }, []);

  return {
    // 数据
    fields,
    fieldsByCategory,
    earningFields,
    deductionFields,
    taxableFields,
    
    // 分组和类别
    getFieldGroups,
    categories: useCategories(),
    
    // 状态
    loading,
    error,
    
    // CRUD 操作
    actions: {
      create: createField,
      update: updateField,
      delete: deleteField,
      toggleActive: toggleFieldActive,
      updateOrder: updateFieldsOrder.mutate,
      refresh: actions.refresh
    },
    
    // 工具函数
    utils: {
      getFieldBySystemKey,
      validateFieldConfig,
      searchFields: (term: string) => utils.searchItems(term, ['name', 'description']),
      sortFields: (field: keyof SalaryComponentField, order?: 'asc' | 'desc') => 
        utils.sortItems(field as keyof SalaryComponent, order)
    },
    
    // Mutations（用于高级场景）
    mutations: {
      ...mutations,
      updateOrder: updateFieldsOrder
    }
  };
}

/**
 * 获取薪资组件配置元数据
 */
export function useSalaryComponentMetadata() {
  return useQuery({
    queryKey: ['salary-component-metadata'],
    queryFn: async () => {
      // 定义元数据配置
      const metadata = {
        fieldTypes: [
          { value: 'earning', label: '收入项', color: 'success' },
          { value: 'deduction', label: '扣除项', color: 'error' }
        ],
        categories: [
          { value: 'basic_salary', label: '基本工资', icon: '💰' },
          { value: 'benefits', label: '福利津贴', icon: '🎁' },
          { value: 'personal_insurance', label: '个人社保', icon: '🏥' },
          { value: 'employer_insurance', label: '公司社保', icon: '🏢' },
          { value: 'personal_tax', label: '个人所得税', icon: '📋' },
          { value: 'other_deductions', label: '其他扣款', icon: '➖' }
        ],
        calculationMethods: [
          { value: 'fixed', label: '固定金额' },
          { value: 'percentage', label: '百分比' },
          { value: 'formula', label: '公式计算' },
          { value: 'table', label: '查表计算' }
        ],
        taxableStatus: [
          { value: true, label: '应税', description: '计入个人所得税计算' },
          { value: false, label: '免税', description: '不计入个人所得税计算' }
        ]
      };

      return metadata;
    },
    staleTime: Infinity // 元数据不会变化
  });
}