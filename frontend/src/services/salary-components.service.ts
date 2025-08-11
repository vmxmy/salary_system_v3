import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

// 类型定义 - TODO: 数据库表尚未实现
type SalaryComponent = any; // Database['public']['Tables']['salary_components']['Row'];
type SalaryComponentInsert = any; // Database['public']['Tables']['salary_components']['Insert'];
type SalaryComponentUpdate = any; // Database['public']['Tables']['salary_components']['Update'];

// TODO: 这个表还未在数据库中实现，暂时使用 any 类型
type EmployeePayrollConfig = any;
type EmployeePayrollConfigInsert = any;
type EmployeePayrollConfigUpdate = any;

// 薪资分类枚举
export const SalaryCategories = {
  BASIC_SALARY: 'basic_salary',           // 基本薪酬
  BENEFITS_ALLOWANCE: 'benefits_allowance', // 福利津贴
  PERSONAL_INSURANCE: 'personal_insurance', // 个人五险一金
  EMPLOYER_INSURANCE: 'employer_insurance', // 单位五险一金
  INCOME_TAX: 'income_tax',              // 个税
  OTHER_DEDUCTIONS: 'other_deductions'    // 其他扣缴
} as const;

export type SalaryCategoryType = typeof SalaryCategories[keyof typeof SalaryCategories];

// 薪资组件服务类
export class SalaryComponentsService {
  // ==================== 薪资组件管理 ====================
  
  // 获取薪资组件列表
  static async getSalaryComponents(filters?: {
    category?: SalaryCategoryType;
    isActive?: boolean;
    type?: 'earning' | 'deduction';
  }) {
    let query = supabase
      .from('salary_components')
      .select('*');

    // 应用过滤条件
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    const { data, error } = await query
      .order('category')
      .order('display_order')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // 获取薪资组件分类统计
  static async getSalaryComponentCategories() {
    const { data, error } = await supabase
      .from('view_salary_component_categories')
      .select('*')
      .order('category_order');

    if (error) throw error;
    return data || [];
  }

  // 获取单个薪资组件
  static async getSalaryComponent(id: string) {
    const { data, error } = await supabase
      .from('salary_components')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // 创建薪资组件
  static async createSalaryComponent(data: SalaryComponentInsert) {
    const { data: result, error } = await supabase
      .from('salary_components')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // 更新薪资组件
  static async updateSalaryComponent(id: string, data: SalaryComponentUpdate) {
    const { data: result, error } = await supabase
      .from('salary_components')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // 激活/停用薪资组件
  static async toggleComponentStatus(id: string, isActive: boolean) {
    const { data, error } = await supabase
      .from('salary_components')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 批量更新组件顺序
  static async updateComponentOrders(updates: Array<{ id: string; display_order: number }>) {
    const promises = updates.map(({ id, display_order }) =>
      supabase
        .from('salary_components')
        .update({ display_order })
        .eq('id', id)
    );

    const results = await Promise.all(promises);
    
    // 检查是否有错误
    const errors = results.filter(r => r.error).map(r => r.error);
    if (errors.length > 0) {
      throw new Error(`Failed to update component orders: ${errors.map(e => e?.message).join(', ')}`);
    }

    return true;
  }

  // ==================== 员工薪资配置管理 ====================
  
  // 获取员工薪资配置列表
  static async getEmployeePayrollConfigs(filters?: {
    employeeId?: string;
    componentId?: string;
    effectiveDate?: string;
  }) {
    let query = supabase
      .from('employee_payroll_configs')
      .select(`
        *,
        employee:employees(
          id,
          employee_name,
          id_number
        ),
        salary_component:salary_components(
          id,
          name,
          code,
          category,
          type
        )
      `);

    // 应用过滤条件
    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }
    if (filters?.componentId) {
      query = query.eq('component_id', filters.componentId);
    }
    if (filters?.effectiveDate) {
      query = query.lte('effective_from', filters.effectiveDate)
        .or(`effective_until.is.null,effective_until.gte.${filters.effectiveDate}`);
    }

    const { data, error } = await query
      .order('effective_from', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // 获取员工当前生效的薪资配置
  static async getEmployeeActiveConfigs(employeeId: string, effectiveDate?: string) {
    const date = effectiveDate || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('employee_payroll_configs')
      .select(`
        *,
        salary_component:salary_components(
          id,
          name,
          code,
          category,
          type,
          calculation_method,
          is_active
        )
      `)
      .eq('employee_id', employeeId)
      .lte('effective_from', date)
      .or(`effective_until.is.null,effective_until.gte.${date}`)
      .order('salary_component(category)')
      .order('salary_component(display_order)');

    if (error) throw error;
    return data || [];
  }

  // 创建员工薪资配置
  static async createEmployeePayrollConfig(data: EmployeePayrollConfigInsert) {
    const { data: result, error } = await supabase
      .from('employee_payroll_configs')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // 批量创建员工薪资配置
  static async createBatchEmployeeConfigs(
    employeeIds: string[],
    configs: Array<Omit<EmployeePayrollConfigInsert, 'employee_id'>>
  ) {
    const allConfigs = employeeIds.flatMap(employeeId =>
      configs.map(config => ({
        ...config,
        employee_id: employeeId
      }))
    );

    const { data, error } = await supabase
      .from('employee_payroll_configs')
      .insert(allConfigs)
      .select();

    if (error) throw error;
    return data || [];
  }

  // 更新员工薪资配置
  static async updateEmployeePayrollConfig(
    id: string,
    data: EmployeePayrollConfigUpdate
  ) {
    const { data: result, error } = await supabase
      .from('employee_payroll_configs')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // 结束员工薪资配置
  static async endEmployeePayrollConfig(id: string, endDate: string) {
    const { data, error } = await supabase
      .from('employee_payroll_configs')
      .update({ effective_until: endDate })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 复制员工薪资配置
  static async copyEmployeeConfigs(
    sourceEmployeeId: string,
    targetEmployeeIds: string[],
    effectiveFrom: string
  ) {
    // 获取源员工的当前配置
    const sourceConfigs = await this.getEmployeeActiveConfigs(sourceEmployeeId);
    
    if (!sourceConfigs || sourceConfigs.length === 0) {
      throw new Error('源员工没有有效的薪资配置');
    }

    // 准备新的配置数据
    const newConfigs = targetEmployeeIds.flatMap(targetEmployeeId =>
      sourceConfigs.map(config => ({
        employee_id: targetEmployeeId,
        component_id: config.component_id,
        amount: config.amount,
        effective_from: effectiveFrom,
        effective_until: null,
        notes: `从员工 ${sourceEmployeeId} 复制`
      }))
    );

    const { data, error } = await supabase
      .from('employee_payroll_configs')
      .insert(newConfigs)
      .select();

    if (error) throw error;
    return data || [];
  }

  // ==================== 薪资模板管理 ====================
  
  // 创建薪资配置模板
  static async createPayrollTemplate(
    name: string,
    description: string,
    configs: Array<{
      component_id: string;
      amount: number;
    }>
  ) {
    // 这个功能可能需要在数据库中创建新表来支持
    // 暂时使用本地存储或其他方式实现
    const template = {
      id: crypto.randomUUID(),
      name,
      description,
      configs,
      created_at: new Date().toISOString()
    };

    // TODO: 实现模板存储逻辑
    console.log('Template created:', template);
    return template;
  }

  // 应用薪资模板到员工
  static async applyTemplateToEmployees(
    templateId: string,
    employeeIds: string[],
    effectiveFrom: string
  ) {
    // TODO: 实现模板应用逻辑
    console.log('Applying template:', templateId, 'to employees:', employeeIds, 'from date:', effectiveFrom);
    return true;
  }
}

// 导出便捷方法
export const {
  // 薪资组件
  getSalaryComponents,
  getSalaryComponentCategories,
  getSalaryComponent,
  createSalaryComponent,
  updateSalaryComponent,
  toggleComponentStatus,
  updateComponentOrders,
  
  // 员工配置
  getEmployeePayrollConfigs,
  getEmployeeActiveConfigs,
  createEmployeePayrollConfig,
  createBatchEmployeeConfigs,
  updateEmployeePayrollConfig,
  endEmployeePayrollConfig,
  copyEmployeeConfigs,
  
  // 模板管理
  createPayrollTemplate,
  applyTemplateToEmployees
} = SalaryComponentsService;