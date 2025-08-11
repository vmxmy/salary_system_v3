import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

// 类型定义 - TODO: 数据库表尚未实现
type InsuranceType = any; // Database['public']['Tables']['insurance_types']['Row'];
type InsuranceTypeInsert = any; // Database['public']['Tables']['insurance_types']['Insert'];
type InsuranceTypeUpdate = any; // Database['public']['Tables']['insurance_types']['Update'];

// TODO: 这些表还未在数据库中实现，暂时使用 any 类型
type EmployeeContributionBase = any;
type EmployeeContributionBaseInsert = any;
type EmployeeContributionBaseUpdate = any;

type SocialInsurancePolicy = any;
type SocialInsurancePolicyInsert = any;
type SocialInsurancePolicyUpdate = any;

// 保险配置服务类
export class InsuranceConfigService {
  // ==================== 保险类型管理 ====================
  
  // 获取保险类型列表
  static async getInsuranceTypes() {
    const { data, error } = await supabase
      .from('insurance_types')
      .select('*')
      .order('display_order');

    if (error) throw error;
    return data || [];
  }

  // 获取单个保险类型
  static async getInsuranceType(id: string) {
    const { data, error } = await supabase
      .from('insurance_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // 创建保险类型
  static async createInsuranceType(data: InsuranceTypeInsert) {
    const { data: result, error } = await supabase
      .from('insurance_types')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // 更新保险类型
  static async updateInsuranceType(id: string, data: InsuranceTypeUpdate) {
    const { data: result, error } = await supabase
      .from('insurance_types')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // ==================== 缴费基数管理 ====================
  
  // 获取员工缴费基数列表
  static async getEmployeeContributionBases(filters?: {
    employeeId?: string;
    insuranceTypeId?: string;
    effectiveDate?: string;
  }) {
    let query = supabase
      .from('employee_contribution_bases')
      .select(`
        *,
        employee:employees(
          id,
          employee_name,
          id_number
        ),
        insurance_type:insurance_types(
          id,
          name,
          system_key
        )
      `);

    // 应用过滤条件
    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }
    if (filters?.insuranceTypeId) {
      query = query.eq('insurance_type_id', filters.insuranceTypeId);
    }
    if (filters?.effectiveDate) {
      query = query.lte('valid_from', filters.effectiveDate)
        .or(`valid_until.is.null,valid_until.gte.${filters.effectiveDate}`);
    }

    const { data, error } = await query
      .order('valid_from', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // 获取员工月度缴费基数视图数据
  static async getMonthlyInsuranceBases(params: {
    employeeIds?: string[];
    yearMonth?: string;
  }) {
    let query = supabase
      .from('view_employee_insurance_base_monthly')
      .select('*');

    if (params.employeeIds && params.employeeIds.length > 0) {
      query = query.in('employee_id', params.employeeIds);
    }
    if (params.yearMonth) {
      query = query.eq('base_month', params.yearMonth);
    }

    const { data, error } = await query
      .order('employee_employee_name')
      .order('insurance_type_name');

    if (error) throw error;
    return data || [];
  }

  // 获取缴费基数汇总
  static async getInsuranceBaseSummary(yearMonth: string) {
    const { data, error } = await supabase
      .from('view_insurance_base_monthly_summary')
      .select('*')
      .eq('summary_month', yearMonth)
      .order('insurance_type_name');

    if (error) throw error;
    return data || [];
  }

  // 创建缴费基数
  static async createContributionBase(data: EmployeeContributionBaseInsert) {
    const { data: result, error } = await supabase
      .from('employee_contribution_bases')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // 批量创建缴费基数
  static async createBatchContributionBases(
    employeeIds: string[],
    baseData: Omit<EmployeeContributionBaseInsert, 'employee_id'>
  ) {
    const bases = employeeIds.map(employeeId => ({
      ...baseData,
      employee_id: employeeId
    }));

    const { data, error } = await supabase
      .from('employee_contribution_bases')
      .insert(bases)
      .select();

    if (error) throw error;
    return data || [];
  }

  // 更新缴费基数
  static async updateContributionBase(
    id: string, 
    data: EmployeeContributionBaseUpdate
  ) {
    const { data: result, error } = await supabase
      .from('employee_contribution_bases')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // 结束缴费基数有效期
  static async endContributionBase(id: string, endDate: string) {
    const { data, error } = await supabase
      .from('employee_contribution_bases')
      .update({ valid_until: endDate })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ==================== 社保政策管理 ====================
  
  // 获取社保政策列表
  static async getSocialInsurancePolicies(filters?: {
    insuranceTypeId?: string;
    isActive?: boolean;
  }) {
    let query = supabase
      .from('social_insurance_policies')
      .select(`
        *,
        insurance_type:insurance_types(
          id,
          name,
          system_key
        )
      `);

    if (filters?.insuranceTypeId) {
      query = query.eq('insurance_type_id', filters.insuranceTypeId);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // 获取单个社保政策
  static async getSocialInsurancePolicy(id: string) {
    const { data, error } = await supabase
      .from('social_insurance_policies')
      .select(`
        *,
        insurance_type:insurance_types(
          id,
          name,
          system_key
        ),
        applicable_categories:social_insurance_policy_applicable_categories(
          personnel_category_id,
          personnel_category:personnel_categories(
            id,
            name,
            code
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // 创建社保政策
  static async createSocialInsurancePolicy(
    data: SocialInsurancePolicyInsert,
    applicableCategoryIds?: string[]
  ) {
    // 开始事务
    const { data: policy, error: policyError } = await supabase
      .from('social_insurance_policies')
      .insert(data)
      .select()
      .single();

    if (policyError) throw policyError;

    // 如果有适用类别，创建关联记录
    if (applicableCategoryIds && applicableCategoryIds.length > 0) {
      const categoryRelations = applicableCategoryIds.map(categoryId => ({
        policy_id: policy.id,
        personnel_category_id: categoryId
      }));

      const { error: relationError } = await supabase
        .from('social_insurance_policy_applicable_categories')
        .insert(categoryRelations);

      if (relationError) throw relationError;
    }

    return policy;
  }

  // 更新社保政策
  static async updateSocialInsurancePolicy(
    id: string,
    data: SocialInsurancePolicyUpdate,
    applicableCategoryIds?: string[]
  ) {
    // 更新政策主表
    const { data: policy, error: policyError } = await supabase
      .from('social_insurance_policies')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (policyError) throw policyError;

    // 如果提供了适用类别，更新关联关系
    if (applicableCategoryIds !== undefined) {
      // 先删除旧的关联
      const { error: deleteError } = await supabase
        .from('social_insurance_policy_applicable_categories')
        .delete()
        .eq('policy_id', id);

      if (deleteError) throw deleteError;

      // 创建新的关联
      if (applicableCategoryIds.length > 0) {
        const categoryRelations = applicableCategoryIds.map(categoryId => ({
          policy_id: id,
          personnel_category_id: categoryId
        }));

        const { error: insertError } = await supabase
          .from('social_insurance_policy_applicable_categories')
          .insert(categoryRelations);

        if (insertError) throw insertError;
      }
    }

    return policy;
  }

  // 激活/停用社保政策
  static async togglePolicyStatus(id: string, isActive: boolean) {
    const { data, error } = await supabase
      .from('social_insurance_policies')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ==================== 保险计算相关 ====================
  
  // 获取员工适用的保险政策
  static async getApplicablePolicies(
    employeeId: string,
    effectiveDate: string
  ) {
    // 这个需要根据员工的人员类别和日期来查询适用的政策
    // 实际实现可能需要调用数据库函数或复杂查询
    const { data, error } = await supabase.rpc(
      'get_employee_applicable_policies',
      {
        p_employee_id: employeeId,
        p_effective_date: effectiveDate
      }
    );

    if (error) throw error;
    return data || [];
  }

  // 获取保险计算日志
  static async getInsuranceCalculationLogs(filters?: {
    employeeId?: string;
    payrollId?: string;
    yearMonth?: string;
  }) {
    let query = supabase
      .from('insurance_calculation_logs')
      .select(`
        *,
        employee:employees(
          id,
          employee_name,
          id_number
        ),
        insurance_type:insurance_types(
          id,
          name,
          system_key
        )
      `);

    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }
    if (filters?.payrollId) {
      query = query.eq('payroll_id', filters.payrollId);
    }
    if (filters?.yearMonth) {
      query = query.eq('calculation_month', filters.yearMonth);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

// 导出便捷方法
export const {
  // 保险类型
  getInsuranceTypes,
  getInsuranceType,
  createInsuranceType,
  updateInsuranceType,
  
  // 缴费基数
  getEmployeeContributionBases,
  getMonthlyInsuranceBases,
  getInsuranceBaseSummary,
  createContributionBase,
  createBatchContributionBases,
  updateContributionBase,
  endContributionBase,
  
  // 社保政策
  getSocialInsurancePolicies,
  getSocialInsurancePolicy,
  createSocialInsurancePolicy,
  updateSocialInsurancePolicy,
  togglePolicyStatus,
  
  // 计算相关
  getApplicablePolicies,
  getInsuranceCalculationLogs
} = InsuranceConfigService;