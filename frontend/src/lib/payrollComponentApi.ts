import { supabase } from './supabase';
import type { 
  PayrollComponent, 
  ComponentCategory, 
  ComponentFormData,
  ComponentStats 
} from '../types/payrollComponent';

// API 接口类
export class PayrollComponentApi {
  // 获取所有薪酬组件
  static async getComponents(): Promise<PayrollComponent[]> {
    const { data, error } = await supabase
      .from('payroll_components')
      .select(`
        *,
        type:type_lookup_id(value, display_name),
        subtype:subtype_lookup_id(value, display_name),
        data_type:data_type_lookup_id(value, display_name),
        calculation_type:calculation_type_lookup_id(value, display_name)
      `)
      .order('display_order');

    if (error) throw error;
    return data || [];
  }

  // 获取组件分类
  static async getCategories(): Promise<ComponentCategory[]> {
    const { data, error } = await supabase
      .from('lookup_values')
      .select('*')
      .eq('lookup_type_code', 'COMPONENT_SUBTYPE')
      .order('display_order');

    if (error) throw error;
    return data || [];
  }

  // 获取组件统计
  static async getStats(): Promise<ComponentStats> {
    const components = await this.getComponents();
    
    const stats: ComponentStats = {
      total: components.length,
      active: components.filter(c => c.is_active).length,
      byCategory: {},
      byPersonnelType: {}
    };

    // 按分类统计
    components.forEach(component => {
      const category = component.tags?.category || 'unknown';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    // 按人员类型统计
    components.forEach(component => {
      const personnelType = component.tags?.personnel_type || 'unknown';
      stats.byPersonnelType[personnelType] = (stats.byPersonnelType[personnelType] || 0) + 1;
    });

    return stats;
  }

  // 创建组件
  static async createComponent(data: ComponentFormData): Promise<PayrollComponent> {
    const { data: result, error } = await supabase
      .from('payroll_components')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // 更新组件
  static async updateComponent(code: string, data: Partial<ComponentFormData>): Promise<PayrollComponent> {
    const { data: result, error } = await supabase
      .from('payroll_components')
      .update(data)
      .eq('code', code)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // 删除组件
  static async deleteComponent(code: string): Promise<void> {
    const { error } = await supabase
      .from('payroll_components')
      .delete()
      .eq('code', code);

    if (error) throw error;
  }

  // 批量更新状态
  static async batchUpdateStatus(codes: string[], isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('payroll_components')
      .update({ is_active: isActive })
      .in('code', codes);

    if (error) throw error;
  }

  // 批量删除
  static async batchDelete(codes: string[]): Promise<void> {
    const { error } = await supabase
      .from('payroll_components')
      .delete()
      .in('code', codes);

    if (error) throw error;
  }

  // 获取查找值
  static async getLookupValues(type: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('lookup_values')
      .select('*')
      .eq('lookup_type_code', type)
      .order('display_order');

    if (error) throw error;
    return data || [];
  }
}