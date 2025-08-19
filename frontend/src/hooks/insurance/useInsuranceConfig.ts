import { useState, useCallback, useEffect } from 'react';
import { InsuranceDataService } from './core/insuranceDataService';
import { supabase } from '@/lib/supabase';
import type { 
  InsuranceTypeInfo, 
  EmployeeCategory, 
  InsuranceRuleConfig, 
  BatchConfigParams 
} from '@/types/insurance';

/**
 * 保险配置管理 Hook
 * 提供保险类型配置的完整管理功能
 */
export const useInsuranceRuleConfig = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceTypeInfo[]>([]);
  const [employeeCategories, setEmployeeCategories] = useState<EmployeeCategory[]>([]);
  const [rules, setRules] = useState<Map<string, Map<string, InsuranceRuleConfig>>>(new Map());

  // 加载保险类型
  const loadInsuranceTypes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('insurance_types')
        .select('id, system_key, name, description, is_active')
        .eq('is_active', true)
        .order('system_key');

      if (error) throw error;
      setInsuranceTypes(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load insurance types';
      setError(errorMessage);
      console.error('Error loading insurance types:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载员工类别（构建层级结构）
  const loadEmployeeCategories = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employee_categories')
        .select(`
          id, 
          name, 
          parent_category_id,
          parent:employee_categories!parent_category_id(name)
        `)
        .order('name');

      if (error) throw error;

      // 构建层级结构
      const categoriesMap = new Map<string, EmployeeCategory>();
      const rootCategories: EmployeeCategory[] = [];

      // 首先创建所有类别对象
      (data || []).forEach((cat: any) => {
        const category: EmployeeCategory = {
          id: cat.id,
          name: cat.name,
          parent_category_id: cat.parent_category_id,
          parent_name: cat.parent?.name,
          children: [],
          level: 0
        };
        categoriesMap.set(cat.id, category);
      });

      // 构建层级关系并计算层级
      categoriesMap.forEach((category) => {
        if (category.parent_category_id) {
          const parent = categoriesMap.get(category.parent_category_id);
          if (parent) {
            parent.children!.push(category);
            category.level = parent.level + 1;
          }
        } else {
          rootCategories.push(category);
        }
      });

      // 递归排序子类别
      const sortChildren = (categories: EmployeeCategory[]) => {
        categories.sort((a, b) => a.name.localeCompare(b.name));
        categories.forEach(cat => {
          if (cat.children && cat.children.length > 0) {
            sortChildren(cat.children);
          }
        });
      };

      sortChildren(rootCategories);
      setEmployeeCategories(rootCategories);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load employee categories';
      setError(errorMessage);
      console.error('Error loading employee categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载保险规则（基于当前有效期间）
  const loadInsuranceRules = useCallback(async (periodId?: string) => {
    try {
      setLoading(true);
      
      // 如果没有指定期间，获取最新期间
      let effectiveDate = new Date().toISOString().split('T')[0];
      
      if (periodId) {
        const { data: period, error: periodError } = await supabase
          .from('payroll_periods')
          .select('period_end')
          .eq('id', periodId)
          .single();
        
        if (periodError) throw periodError;
        effectiveDate = period.period_end;
      }

      const { data, error } = await supabase
        .from('insurance_type_category_rules')
        .select(`
          id,
          insurance_type_id,
          employee_category_id,
          is_applicable,
          employee_rate,
          employer_rate,
          base_floor,
          base_ceiling,
          effective_date,
          end_date,
          description
        `)
        .lte('effective_date', effectiveDate)
        .or(`end_date.is.null,end_date.gt.${effectiveDate}`);

      if (error) throw error;

      // 构建规则映射: insurance_type_id -> employee_category_id -> rule
      const rulesMap = new Map<string, Map<string, InsuranceRuleConfig>>();
      
      (data || []).forEach((rule: any) => {
        if (!rulesMap.has(rule.insurance_type_id)) {
          rulesMap.set(rule.insurance_type_id, new Map());
        }
        rulesMap.get(rule.insurance_type_id)!.set(rule.employee_category_id, {
          id: rule.id,
          insurance_type_id: rule.insurance_type_id,
          employee_category_id: rule.employee_category_id,
          is_applicable: rule.is_applicable,
          employee_rate: rule.employee_rate,
          employer_rate: rule.employer_rate,
          base_floor: rule.base_floor,
          base_ceiling: rule.base_ceiling,
          effective_date: rule.effective_date,
          end_date: rule.end_date,
          description: rule.description
        });
      });

      setRules(rulesMap);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load insurance rules';
      setError(errorMessage);
      console.error('Error loading insurance rules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 保存单个规则
  const saveRule = useCallback(async (rule: InsuranceRuleConfig): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const ruleData = {
        insurance_type_id: rule.insurance_type_id,
        employee_category_id: rule.employee_category_id,
        is_applicable: rule.is_applicable,
        employee_rate: rule.employee_rate || 0,
        employer_rate: rule.employer_rate || 0,
        base_floor: rule.base_floor || 0,
        base_ceiling: rule.base_ceiling || null,
        effective_date: rule.effective_date || new Date().toISOString().split('T')[0],
        end_date: rule.end_date || null,
        description: rule.description || null,
        updated_at: new Date().toISOString()
      };

      let result;
      if (rule.id) {
        // 更新现有规则
        result = await supabase
          .from('insurance_type_category_rules')
          .update(ruleData)
          .eq('id', rule.id)
          .select()
          .single();
      } else {
        // 创建新规则
        result = await supabase
          .from('insurance_type_category_rules')
          .insert(ruleData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // 更新本地状态
      const updatedRule = { ...rule, ...result.data };
      setRules(prev => {
        const newRules = new Map(prev);
        if (!newRules.has(rule.insurance_type_id)) {
          newRules.set(rule.insurance_type_id, new Map());
        }
        newRules.get(rule.insurance_type_id)!.set(rule.employee_category_id, updatedRule);
        return newRules;
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save rule';
      setError(errorMessage);
      console.error('Error saving rule:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 批量配置规则
  const batchConfigRules = useCallback(async (params: BatchConfigParams): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { insurance_type_id, category_ids, config, inherit_from_parent } = params;

      // 如果启用继承，需要获取父类别的配置
      let inheritedConfig = config;
      if (inherit_from_parent && category_ids.length > 0) {
        // 查找第一个类别的父类别配置
        const firstCategory = employeeCategories
          .flatMap(cat => [cat, ...getAllChildCategories(cat)])
          .find(cat => cat.id === category_ids[0]);

        if (firstCategory?.parent_category_id) {
          const parentRule = rules.get(insurance_type_id)?.get(firstCategory.parent_category_id);
          if (parentRule) {
            inheritedConfig = {
              ...config,
              employee_rate: parentRule.employee_rate,
              employer_rate: parentRule.employer_rate,
              base_floor: parentRule.base_floor,
              base_ceiling: parentRule.base_ceiling
            };
          }
        }
      }

      // 批量插入或更新规则
      const rulesToUpsert = category_ids.map(categoryId => ({
        insurance_type_id,
        employee_category_id: categoryId,
        is_applicable: inheritedConfig.is_applicable,
        employee_rate: inheritedConfig.employee_rate || 0,
        employer_rate: inheritedConfig.employer_rate || 0,
        base_floor: inheritedConfig.base_floor || 0,
        base_ceiling: inheritedConfig.base_ceiling || null,
        effective_date: inheritedConfig.effective_date || new Date().toISOString().split('T')[0],
        end_date: inheritedConfig.end_date || null,
        description: inheritedConfig.description || null,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('insurance_type_category_rules')
        .upsert(rulesToUpsert, {
          onConflict: 'insurance_type_id,employee_category_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      // 重新加载规则以更新本地状态
      await loadInsuranceRules();

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to batch configure rules';
      setError(errorMessage);
      console.error('Error batch configuring rules:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [employeeCategories, rules, loadInsuranceRules]);

  // 删除规则
  const deleteRule = useCallback(async (insuranceTypeId: string, employeeCategoryId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('insurance_type_category_rules')
        .delete()
        .eq('insurance_type_id', insuranceTypeId)
        .eq('employee_category_id', employeeCategoryId);

      if (error) throw error;

      // 更新本地状态
      setRules(prev => {
        const newRules = new Map(prev);
        const insuranceRules = newRules.get(insuranceTypeId);
        if (insuranceRules) {
          insuranceRules.delete(employeeCategoryId);
          if (insuranceRules.size === 0) {
            newRules.delete(insuranceTypeId);
          }
        }
        return newRules;
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete rule';
      setError(errorMessage);
      console.error('Error deleting rule:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取特定保险类型和类别的规则
  const getRule = useCallback((insuranceTypeId: string, employeeCategoryId: string): InsuranceRuleConfig | null => {
    return rules.get(insuranceTypeId)?.get(employeeCategoryId) || null;
  }, [rules]);

  // 获取所有子类别（递归）
  const getAllChildCategories = useCallback((category: EmployeeCategory): EmployeeCategory[] => {
    const result: EmployeeCategory[] = [];
    if (category.children) {
      category.children.forEach(child => {
        result.push(child);
        result.push(...getAllChildCategories(child));
      });
    }
    return result;
  }, []);

  // 获取扁平化的类别列表
  const getFlatCategories = useCallback((): EmployeeCategory[] => {
    const result: EmployeeCategory[] = [];
    const addCategories = (categories: EmployeeCategory[]) => {
      categories.forEach(cat => {
        result.push(cat);
        if (cat.children && cat.children.length > 0) {
          addCategories(cat.children);
        }
      });
    };
    addCategories(employeeCategories);
    return result;
  }, [employeeCategories]);

  // 初始化加载
  useEffect(() => {
    loadInsuranceTypes();
    loadEmployeeCategories();
    loadInsuranceRules();
  }, [loadInsuranceTypes, loadEmployeeCategories, loadInsuranceRules]);

  return {
    // 状态
    loading,
    error,
    insuranceTypes,
    employeeCategories,
    rules,

    // 数据加载
    loadInsuranceTypes,
    loadEmployeeCategories,
    loadInsuranceRules,

    // 规则管理
    saveRule,
    batchConfigRules,
    deleteRule,
    getRule,

    // 工具函数
    getAllChildCategories,
    getFlatCategories,

    // 清除错误
    clearError: () => setError(null)
  };
};