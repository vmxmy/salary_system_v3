import { supabase } from '@/lib/supabase';

// 统一的类型定义
export interface InsuranceBaseData {
  periodEnd: string;
  employeeCategoryId: string;
  employeeCategoryName: string;
  insuranceTypes: Map<string, { id: string; name: string; system_key: string }>;
  contributionBases: Map<string, number>;
  insuranceRules: Map<string, {
    insurance_type_id: string;
    employee_rate: number;
    employer_rate: number;
    base_floor: number;
    base_ceiling: number;
    is_applicable: boolean;
  }>;
}

export interface InsuranceTypeConfig {
  key: string;
  name: string;
  hasEmployee: boolean;
  hasEmployer: boolean;
}

// 保险类型配置
export const INSURANCE_TYPE_CONFIGS: InsuranceTypeConfig[] = [
  { key: 'pension', name: '养老保险', hasEmployee: true, hasEmployer: true },
  { key: 'medical', name: '医疗保险', hasEmployee: true, hasEmployer: true },
  { key: 'unemployment', name: '失业保险', hasEmployee: true, hasEmployer: true },
  { key: 'work_injury', name: '工伤保险', hasEmployee: false, hasEmployer: true },
  { key: 'housing_fund', name: '住房公积金', hasEmployee: true, hasEmployer: true },
  { key: 'occupational_pension', name: '职业年金', hasEmployee: true, hasEmployer: true }
];

/**
 * 保险数据服务 - 统一管理所有数据获取逻辑
 */
export class InsuranceDataService {
  /**
   * 批量获取员工保险计算所需的所有基础数据
   * 使用工程最佳实践：并行查询 + 正确的错误处理
   */
  static async fetchEmployeeInsuranceData(
    employeeId: string,
    periodId: string
  ): Promise<InsuranceBaseData> {
    // 第一批并行查询：基础数据
    const [
      periodResult,
      categoryAssignmentResult,
      insuranceTypesResult,
      contributionBasesResult
    ] = await Promise.all([
      // 1. 获取期间信息
      supabase
        .from('payroll_periods')
        .select('period_end')
        .eq('id', periodId)
        .single(),
      
      // 2. 获取员工类别分配（使用标准查询）
      supabase
        .from('employee_category_assignments')
        .select('employee_category_id')
        .eq('employee_id', employeeId)
        .eq('period_id', periodId)
        .limit(1),
      
      // 3. 获取所有保险类型
      supabase
        .from('insurance_types')
        .select('id, name, system_key'),
      
      // 4. 获取员工的缴费基数
      supabase
        .from('employee_contribution_bases')
        .select('insurance_type_id, contribution_base')
        .eq('employee_id', employeeId)
        .eq('period_id', periodId)
    ]);

    // 验证必要数据
    if (periodResult.error || !periodResult.data) {
      throw new Error(`Payroll period not found: ${periodId}`);
    }

    if (insuranceTypesResult.error || !insuranceTypesResult.data) {
      throw new Error('Failed to fetch insurance types');
    }

    // 获取员工类别ID（必须存在）
    if (categoryAssignmentResult.error || !categoryAssignmentResult.data || categoryAssignmentResult.data.length === 0) {
      throw new Error(`No employee category assignment found for employee ${employeeId} in period ${periodId}`);
    }

    const periodEnd = periodResult.data.period_end;
    const employeeCategoryId = categoryAssignmentResult.data[0].employee_category_id;
    
    // 第二批并行查询：关联数据
    const [categoryInfoResult, rulesResult] = await Promise.all([
      // 获取类别名称
      supabase
        .from('employee_categories')
        .select('name')
        .eq('id', employeeCategoryId)
        .single(),
      
      // 获取保险规则
      supabase
        .from('insurance_type_category_rules')
        .select('insurance_type_id, employee_rate, employer_rate, base_floor, base_ceiling, is_applicable')
        .in('insurance_type_id', insuranceTypesResult.data.map(it => it.id))
        .eq('employee_category_id', employeeCategoryId)
        .lte('effective_date', periodEnd)
        .or(`end_date.is.null,end_date.gt.${periodEnd}`)
    ]);

    if (categoryInfoResult.error || !categoryInfoResult.data) {
      throw new Error(`Employee category not found: ${employeeCategoryId}`);
    }

    if (rulesResult.error || !rulesResult.data) {
      throw new Error('Failed to fetch insurance rules');
    }

    const employeeCategoryName = categoryInfoResult.data.name;
    
    // 创建数据映射 - 使用 Map 提供 O(1) 查找性能
    const insuranceTypes = new Map(
      insuranceTypesResult.data.map(it => [it.system_key, it])
    );
    
    const contributionBases = new Map(
      (contributionBasesResult.data || []).map(cb => [cb.insurance_type_id, cb.contribution_base])
    );

    const insuranceRules = new Map(
      rulesResult.data.map(rule => [rule.insurance_type_id, rule])
    );

    // 返回结构化数据
    return {
      periodEnd,
      employeeCategoryId,
      employeeCategoryName,
      insuranceTypes,
      contributionBases,
      insuranceRules
    };
  }

  /**
   * 批量获取多个员工的保险数据
   * 用于批量计算场景
   */
  static async fetchBatchInsuranceData(
    employeeIds: string[],
    periodId: string
  ): Promise<Map<string, InsuranceBaseData>> {
    // 实现批量数据获取逻辑
    // 这里可以进一步优化，使用 IN 查询而不是多次单独查询
    const dataMap = new Map<string, InsuranceBaseData>();
    
    // 为了简化，这里暂时使用 Promise.all
    // 实际可以进一步优化为批量查询
    const results = await Promise.all(
      employeeIds.map(employeeId => 
        this.fetchEmployeeInsuranceData(employeeId, periodId)
          .then(data => ({ employeeId, data }))
          .catch(error => ({ employeeId, error }))
      )
    );

    for (const result of results) {
      if ('data' in result) {
        dataMap.set(result.employeeId, result.data);
      }
    }

    return dataMap;
  }

  /**
   * 获取单个保险类型的数据
   * 用于特定保险计算场景
   */
  static async fetchSingleInsuranceData(
    employeeId: string,
    periodId: string,
    insuranceTypeKey: string
  ): Promise<{
    insuranceType: { id: string; name: string; system_key: string };
    contributionBase: number;
    rule: any;
    employeeCategoryName: string;
  }> {
    // 获取基础数据
    const baseData = await this.fetchEmployeeInsuranceData(employeeId, periodId);
    
    const insuranceType = baseData.insuranceTypes.get(insuranceTypeKey);
    if (!insuranceType) {
      throw new Error(`Insurance type not found: ${insuranceTypeKey}`);
    }

    const contributionBase = baseData.contributionBases.get(insuranceType.id);
    if (contributionBase === undefined) {
      throw new Error(`Contribution base not found for ${insuranceType.name}`);
    }

    const rule = baseData.insuranceRules.get(insuranceType.id);
    if (!rule) {
      throw new Error(`No rule configured for ${insuranceType.name}`);
    }

    return {
      insuranceType,
      contributionBase,
      rule,
      employeeCategoryName: baseData.employeeCategoryName
    };
  }

  /**
   * 获取所有员工类别的保险规则
   * 用于显示保险类型对所有类别的适用情况
   */
  static async fetchAllCategoryRules(periodId: string): Promise<{
    categories: Array<{ 
      id: string; 
      name: string; 
      root_category?: string; // 添加root类别字段
    }>;
    rules: Map<string, Map<string, boolean>>; // insuranceTypeId -> categoryId -> isApplicable
  }> {
    // 获取期间信息
    const { data: period, error: periodError } = await supabase
      .from('payroll_periods')
      .select('period_end')
      .eq('id', periodId)
      .single();
    
    if (periodError || !period) {
      throw new Error(`Period not found: ${periodId}`);
    }

    // 并行查询类别和规则
    const [categoriesResult, rulesResult] = await Promise.all([
      supabase
        .from('employee_categories')
        .select('id, name, parent_category_id')
        .order('name'),
      
      supabase
        .from('insurance_type_category_rules')
        .select('insurance_type_id, employee_category_id, is_applicable')
        .lte('effective_date', period.period_end)
        .or(`end_date.is.null,end_date.gt.${period.period_end}`)
    ]);

    if (categoriesResult.error || !categoriesResult.data) {
      throw new Error('Failed to fetch employee categories');
    }

    if (rulesResult.error || !rulesResult.data) {
      throw new Error('Failed to fetch insurance rules');
    }

    // 构建类别的根分类映射
    const rootCategoryMap = new Map<string, string>();
    const categoriesById = new Map<string, any>();
    
    // 首先建立ID到类别的映射
    categoriesResult.data.forEach(cat => {
      categoriesById.set(cat.id, cat);
    });
    
    // 然后找出每个类别的根类别
    categoriesResult.data.forEach(cat => {
      // 如果类别本身没有父类别，说明它自己就是根类别，不需要设置root_category
      if (!cat.parent_category_id) {
        // 根类别不设置root_category，或者设置为null
        rootCategoryMap.set(cat.id, '');
      } else {
        // 向上追溯到根类别
        let currentCat = cat;
        let rootName = cat.name;
        
        while (currentCat.parent_category_id && categoriesById.has(currentCat.parent_category_id)) {
          currentCat = categoriesById.get(currentCat.parent_category_id);
          rootName = currentCat.name;
        }
        
        rootCategoryMap.set(cat.id, rootName);
      }
    });

    // 构建规则映射: insuranceTypeId -> categoryId -> isApplicable
    const rulesMap = new Map<string, Map<string, boolean>>();
    
    rulesResult.data.forEach(rule => {
      if (!rulesMap.has(rule.insurance_type_id)) {
        rulesMap.set(rule.insurance_type_id, new Map());
      }
      rulesMap.get(rule.insurance_type_id)!.set(
        rule.employee_category_id,
        rule.is_applicable
      );
    });

    // 为每个类别添加root_category字段（只为子类别添加）
    const categoriesWithRoot = categoriesResult.data.map(cat => {
      const rootCategory = rootCategoryMap.get(cat.id);
      return {
        id: cat.id,
        name: cat.name,
        root_category: rootCategory || undefined // 空字符串转为undefined
      };
    });

    return {
      categories: categoriesWithRoot,
      rules: rulesMap
    };
  }
}