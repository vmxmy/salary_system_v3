import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

// 类型定义 - TODO: 数据库表尚未实现
type EmployeeContributionBase = any; // Database['public']['Tables']['employee_contribution_bases']['Row'];
type EmployeeContributionBaseInsert = any; // Database['public']['Tables']['employee_contribution_bases']['Insert'];
type EmployeeContributionBaseUpdate = any; // Database['public']['Tables']['employee_contribution_bases']['Update'];

// 基数复制策略枚举
export const BaseStrategy = {
  COPY: 'copy',
  NEW: 'new'
} as const;

export type BaseStrategyType = typeof BaseStrategy[keyof typeof BaseStrategy];

// 基数调整方式枚举
export const BaseAdjustmentType = {
  PERCENTAGE: 'percentage',
  FIXED_AMOUNT: 'fixed_amount',
  TEMPLATE: 'template',
  INDIVIDUAL: 'individual'
} as const;

export type BaseAdjustmentTypeType = typeof BaseAdjustmentType[keyof typeof BaseAdjustmentType];

// 接口定义
export interface BaseAdjustmentConfig {
  type: BaseAdjustmentTypeType;
  percentage?: number; // 百分比调整，如 110 表示 110%
  fixedAmount?: number; // 固定金额调整
  templateId?: string; // 基数模板ID
}

export interface EmployeeBaseData {
  employeeId: string;
  insuranceTypeId: string;
  newBase: number;
  effectiveDate: string;
}

export interface BaseCopyResult {
  strategy: BaseStrategyType;
  sourceMonth: string;
  targetMonth: string;
  employeeCount: number;
  insuranceTypeCount: number;
}

export interface BaseCreateResult {
  strategy: BaseStrategyType;
  targetMonth: string;
  affectedEmployees: number;
  createdRecords: number;
  terminatedRecords: number;
}

// 五险一金基数服务类
export class InsuranceBaseService {
  
  /**
   * 复制基数策略 - 继续使用现有基数
   * 在这种模式下，不对employee_contribution_bases表进行任何操作
   * 薪资计算时会自动使用源月份的基数数据
   */
  static async copyBases(
    sourceMonth: string, 
    targetMonth: string,
    employeeIds?: string[]
  ): Promise<BaseCopyResult> {
    // 使用新的统一视图获取基数统计信息
    let query = supabase
      .from('view_employee_insurance_base_unified')
      .select('employee_id, insurance_type_id', { count: 'exact' })
      .eq('month_string', sourceMonth)
      .eq('rn', 1); // 只获取最新记录
    
    if (employeeIds && employeeIds.length > 0) {
      query = query.in('employee_id', employeeIds);
    }
    
    const { count, error } = await query;
    
    if (error) throw error;
    
    // 获取涉及的保险类型数量
    const { data: insuranceTypes } = await supabase
      .from('insurance_types')
      .select('id', { count: 'exact' });
    
    const employeeCount = employeeIds?.length || 0;
    const insuranceTypeCount = insuranceTypes?.length || 8;
    
    return {
      strategy: BaseStrategy.COPY,
      sourceMonth,
      targetMonth,
      employeeCount,
      insuranceTypeCount
    };
  }

  /**
   * 创建新基数策略 - 设置新的缴费基数
   * 需要终止当前有效的基数记录，并创建新的基数记录
   */
  static async createNewBases(
    employeeBaseData: EmployeeBaseData[]
  ): Promise<BaseCreateResult> {
    if (!employeeBaseData.length) {
      throw new Error('员工基数数据不能为空');
    }

    const targetMonth = employeeBaseData[0].effectiveDate.substring(0, 7);
    const employeeIds = [...new Set(employeeBaseData.map(d => d.employeeId))];
    
    try {
      // 开始事务
      const { data, error } = await supabase.rpc('create_new_insurance_bases_transaction', {
        employee_base_data: employeeBaseData,
        target_month: targetMonth
      });

      if (error) throw error;

      return {
        strategy: BaseStrategy.NEW,
        targetMonth,
        affectedEmployees: employeeIds.length,
        createdRecords: employeeBaseData.length,
        terminatedRecords: data?.terminated_records || 0
      };
    } catch (error) {
      // 如果数据库函数不存在，使用客户端事务处理
      return await this.createNewBasesClientSide(employeeBaseData);
    }
  }

  /**
   * 客户端事务处理新基数创建
   * 作为数据库函数的备用方案
   */
  private static async createNewBasesClientSide(
    employeeBaseData: EmployeeBaseData[]
  ): Promise<BaseCreateResult> {
    const targetMonth = employeeBaseData[0].effectiveDate.substring(0, 7);
    const employeeIds = [...new Set(employeeBaseData.map(d => d.employeeId))];
    const effectiveStartDate = employeeBaseData[0].effectiveDate;
    const effectiveEndDate = new Date(effectiveStartDate);
    effectiveEndDate.setDate(effectiveEndDate.getDate() - 1);
    const terminationDate = effectiveEndDate.toISOString().split('T')[0];

    let terminatedRecords = 0;
    let createdRecords = 0;

    // 1. 终止当前有效的基数记录
    for (const employeeId of employeeIds) {
      const { count, error: terminateError } = await supabase
        .from('employee_contribution_bases')
        .update({ 
          effective_end_date: terminationDate 
        })
        .eq('employee_id', employeeId)
        .is('effective_end_date', null);

      if (terminateError) throw terminateError;
      
      terminatedRecords += count || 0;
    }

    // 2. 创建新的基数记录
    const newBaseRecords: EmployeeContributionBaseInsert[] = employeeBaseData.map(data => ({
      employee_id: data.employeeId,
      insurance_type_id: data.insuranceTypeId,
      contribution_base: data.newBase,
      effective_start_date: data.effectiveDate,
      effective_end_date: null // 新记录为当前有效
    }));

    const { data: insertedData, error: insertError } = await supabase
      .from('employee_contribution_bases')
      .insert(newBaseRecords)
      .select();

    if (insertError) throw insertError;
    
    createdRecords = insertedData?.length || 0;

    return {
      strategy: BaseStrategy.NEW,
      targetMonth,
      affectedEmployees: employeeIds.length,
      createdRecords,
      terminatedRecords
    };
  }

  /**
   * 获取员工当前基数信息
   */
  static async getCurrentBases(employeeIds: string[], yearMonth?: string) {
    const month = yearMonth || new Date().toISOString().substring(0, 7);
    
    const { data, error } = await supabase
      .from('view_employee_insurance_base_unified')
      .select(`
        employee_id,
        employee_name,
        insurance_type_id,
        insurance_type_name,
        insurance_type_key,
        contribution_base,
        effective_start_date,
        effective_end_date
      `)
      .in('employee_id', employeeIds)
      .eq('month_string', month)
      .eq('rn', 1) // 只获取最新记录
      .order('employee_name')
      .order('insurance_type_key');

    if (error) throw error;
    
    return data || [];
  }

  /**
   * 批量调整基数
   */
  static async applyBatchAdjustment(
    employeeIds: string[],
    adjustmentConfig: BaseAdjustmentConfig,
    effectiveDate: string
  ): Promise<EmployeeBaseData[]> {
    // 获取当前基数
    const currentBases = await this.getCurrentBases(employeeIds);
    
    const adjustedBases: EmployeeBaseData[] = [];
    
    for (const base of currentBases) {
      let newBase = base.contribution_base;
      
      switch (adjustmentConfig.type) {
        case BaseAdjustmentType.PERCENTAGE:
          if (adjustmentConfig.percentage) {
            newBase = (base.contribution_base * adjustmentConfig.percentage) / 100;
          }
          break;
        case BaseAdjustmentType.FIXED_AMOUNT:
          if (adjustmentConfig.fixedAmount) {
            newBase = base.contribution_base + adjustmentConfig.fixedAmount;
          }
          break;
        case BaseAdjustmentType.TEMPLATE:
          // TODO: 实现基数模板逻辑
          break;
      }
      
      // 确保基数为正数且保留2位小数
      newBase = Math.max(0, Math.round(newBase * 100) / 100);
      
      adjustedBases.push({
        employeeId: base.employee_id,
        insuranceTypeId: base.insurance_type_id,
        newBase,
        effectiveDate
      });
    }
    
    return adjustedBases;
  }

  /**
   * 计算基数调整影响预览
   */
  static async calculateAdjustmentImpact(
    employeeIds: string[],
    adjustmentConfig: BaseAdjustmentConfig
  ) {
    const currentBases = await this.getCurrentBases(employeeIds);
    
    let totalCurrentBase = 0;
    let totalNewBase = 0;
    const impactByInsuranceType: Record<string, {
      name: string;
      currentTotal: number;
      newTotal: number;
      difference: number;
    }> = {};
    
    for (const base of currentBases) {
      let newBase = base.contribution_base;
      
      switch (adjustmentConfig.type) {
        case BaseAdjustmentType.PERCENTAGE:
          if (adjustmentConfig.percentage) {
            newBase = (base.contribution_base * adjustmentConfig.percentage) / 100;
          }
          break;
        case BaseAdjustmentType.FIXED_AMOUNT:
          if (adjustmentConfig.fixedAmount) {
            newBase = base.contribution_base + adjustmentConfig.fixedAmount;
          }
          break;
      }
      
      newBase = Math.max(0, Math.round(newBase * 100) / 100);
      
      totalCurrentBase += base.contribution_base;
      totalNewBase += newBase;
      
      const insuranceKey = base.insurance_type_key;
      if (!impactByInsuranceType[insuranceKey]) {
        impactByInsuranceType[insuranceKey] = {
          name: base.insurance_type_name,
          currentTotal: 0,
          newTotal: 0,
          difference: 0
        };
      }
      
      impactByInsuranceType[insuranceKey].currentTotal += base.contribution_base;
      impactByInsuranceType[insuranceKey].newTotal += newBase;
      impactByInsuranceType[insuranceKey].difference = 
        impactByInsuranceType[insuranceKey].newTotal - 
        impactByInsuranceType[insuranceKey].currentTotal;
    }
    
    return {
      affectedEmployees: [...new Set(currentBases.map(b => b.employee_id))].length,
      totalCurrentBase,
      totalNewBase,
      totalDifference: totalNewBase - totalCurrentBase,
      impactByInsuranceType: Object.values(impactByInsuranceType)
    };
  }

  /**
   * 获取所有保险类型
   */
  static async getInsuranceTypes() {
    const { data, error } = await supabase
      .from('insurance_types')
      .select('*')
      .order('system_key');

    if (error) throw error;
    return data || [];
  }

  /**
   * 验证基数数据的合法性
   */
  static validateBaseData(employeeBaseData: EmployeeBaseData[]): string[] {
    const errors: string[] = [];
    
    if (!employeeBaseData.length) {
      errors.push('基数数据不能为空');
      return errors;
    }
    
    // 检查日期一致性
    const dates = [...new Set(employeeBaseData.map(d => d.effectiveDate))];
    if (dates.length > 1) {
      errors.push('所有基数记录的生效日期必须一致');
    }
    
    // 检查基数值
    for (const data of employeeBaseData) {
      if (data.newBase < 0) {
        errors.push(`员工 ${data.employeeId} 的基数不能为负数`);
      }
      if (data.newBase > 100000) {
        errors.push(`员工 ${data.employeeId} 的基数不能超过100,000元`);
      }
    }
    
    return errors;
  }
}

// 导出便捷方法
export const {
  copyBases,
  createNewBases,
  getCurrentBases,
  applyBatchAdjustment,
  calculateAdjustmentImpact,
  getInsuranceTypes,
  validateBaseData
} = InsuranceBaseService;

// 创建默认导出实例
export const insuranceBaseService = InsuranceBaseService;