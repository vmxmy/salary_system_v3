import { supabase } from './supabaseClient';
import { 
  insuranceConfigCreateSchema,
  insuranceConfigUpdateSchema,
  insuranceConfigFilterSchema,
  insuranceConfigResponseSchema,
  insuranceConfigListResponseSchema,
  type InsuranceConfigCreate,
  type InsuranceConfigUpdate,
  type InsuranceConfigFilter
} from './validation/insuranceConfigSchema';
import { validateData, sanitizeInput, RateLimiter } from '../utils/validation';
import { withAuth, createAuditLog } from './authMiddleware';
import { UserRole } from '../components/ProtectedRoute';

// 数据库原始结构
interface RawInsuranceConfig {
  id: string;
  type: 'social_insurance' | 'housing_fund';
  code: string;
  name: string;
  description?: string;
  
  // 费率配置 (JSONB)
  rates: {
    employee: number;
    employer: number;
    employer_additional?: number;
  };
  
  // 基数配置 (JSONB)
  base_config: {
    method: string;
    min_field?: string;
    max_field?: string;
    percentage?: number;
    round_to?: number;
  };
  
  // 适用规则 (JSONB)
  applicable_rules?: {
    departments?: string[];
    personnel_categories?: string[];
    date_range?: {
      from?: string;
      to?: string;
    };
  };
  
  // 其他字段
  calculation_rules?: any[];
  tags?: string[];
  priority?: number;
  
  // 状态
  is_active: boolean;
  effective_from: string;
  effective_to?: string;
  
  // 审计字段
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// 前端使用的转换后结构
export interface InsuranceConfig {
  id: string;
  type: 'social_insurance' | 'housing_fund';
  code: string;
  name: string;
  description?: string;
  
  // 费率配置（从rates中提取）
  employee_rate: number;
  employer_rate: number;
  
  // 基数配置（从base_config中提取，暂时使用默认值）
  min_base: number;
  max_base: number;
  
  // 适用条件（从applicable_rules中提取）
  applicable_personnel_categories: string[] | null;
  config_name?: string;
  
  // 状态
  is_active: boolean;
  effective_from: string;
  effective_to?: string;
  
  // 审计字段
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// 数据转换函数
function transformRawToInsuranceConfig(raw: RawInsuranceConfig, baseConfig?: { min_base: string; max_base: string } | null): InsuranceConfig {
  return {
    id: raw.id,
    type: raw.type,
    code: raw.code,
    name: raw.name,
    description: raw.description,
    
    // 从rates中提取费率
    employee_rate: raw.rates?.employee || 0,
    employer_rate: raw.rates?.employer || 0,
    
    // 使用实际的基数配置，如果没有则使用0
    min_base: baseConfig ? parseFloat(baseConfig.min_base) : 0,
    max_base: baseConfig ? parseFloat(baseConfig.max_base) : 0,
    
    // 从applicable_rules中提取适用人员类别
    applicable_personnel_categories: raw.applicable_rules?.personnel_categories || null,
    
    // 状态和其他字段
    is_active: raw.is_active,
    effective_from: raw.effective_from,
    effective_to: raw.effective_to,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    created_by: raw.created_by,
    updated_by: raw.updated_by
  };
}

export interface InsuranceConfigFilters {
  search?: string;
  type?: 'social_insurance' | 'housing_fund';
  is_active?: boolean;
  effective_date?: string;
}

export interface InsuranceConfigListResponse {
  data: InsuranceConfig[];
  total: number;
  page: number;
  pageSize: number;
}

// Rate limiter instance
const apiRateLimiter = new RateLimiter(30, 60000); // 30 requests per minute

// Cache for base configurations
interface BaseConfigCache {
  [key: string]: {
    data: { min_base: string; max_base: string } | null;
    timestamp: number;
  };
}

const baseConfigCache: BaseConfigCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// 五险一金配置 API 访问层
export class InsuranceConfigAPI {
  
  /**
   * 批量获取保险基数配置
   */
  private static async batchGetInsuranceBaseConfigs(
    configs: Array<{ code: string; type: string }>
  ): Promise<Map<string, { min_base: string; max_base: string } | null>> {
    const results = new Map<string, { min_base: string; max_base: string } | null>();
    const uncachedConfigs: Array<{ code: string; type: string }> = [];
    const now = Date.now();

    // Check cache first
    for (const config of configs) {
      const cacheKey = `${config.type}_${config.code}`;
      const cached = baseConfigCache[cacheKey];
      
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        results.set(cacheKey, cached.data);
      } else {
        uncachedConfigs.push(config);
      }
    }

    // Fetch uncached configs
    if (uncachedConfigs.length > 0) {
      const typeMapping: { [key: string]: string } = {
        'pension_insurance': 'pension',
        'medical_insurance': 'medical', 
        'unemployment_insurance': 'unemployment',
        'injury_insurance': 'injury',
        'maternity_insurance': 'maternity'
      };

      // Get unique insurance types to query
      const insuranceTypes = [...new Set(
        uncachedConfigs
          .filter(c => c.type === 'social_insurance')
          .map(c => typeMapping[c.code])
          .filter(Boolean)
      )];

      if (insuranceTypes.length > 0) {
        const { data, error } = await supabase
          .from('social_insurance_base_configs')
          .select('insurance_type, min_base, max_base')
          .in('insurance_type', insuranceTypes)
          .eq('region', 'beijing')
          .lte('effective_from', new Date().toISOString().split('T')[0])
          .or('effective_to.is.null,effective_to.gte.' + new Date().toISOString().split('T')[0]);

        if (!error && data) {
          // Create a map for quick lookup
          const baseConfigMap = new Map(
            data.map(item => [item.insurance_type, { min_base: item.min_base, max_base: item.max_base }])
          );

          // Update results and cache
          for (const config of uncachedConfigs) {
            const cacheKey = `${config.type}_${config.code}`;
            const insuranceType = typeMapping[config.code];
            const baseConfig = insuranceType ? baseConfigMap.get(insuranceType) : null;
            
            results.set(cacheKey, baseConfig || null);
            baseConfigCache[cacheKey] = {
              data: baseConfig || null,
              timestamp: now
            };
          }
        }
      }

      // Handle non-social insurance configs
      for (const config of uncachedConfigs.filter(c => c.type !== 'social_insurance')) {
        const cacheKey = `${config.type}_${config.code}`;
        results.set(cacheKey, null);
        baseConfigCache[cacheKey] = {
          data: null,
          timestamp: now
        };
      }
    }

    return results;
  }

  /**
   * 获取保险基数配置
   */
  private static async getInsuranceBaseConfig(code: string, type: string): Promise<{
    min_base: string;
    max_base: string;
  } | null> {
    try {
      // 将保险代码映射到social_insurance_base_configs表中的insurance_type
      const typeMapping: { [key: string]: string } = {
        'pension_insurance': 'pension',
        'medical_insurance': 'medical', 
        'unemployment_insurance': 'unemployment',
        'injury_insurance': 'injury',
        'maternity_insurance': 'maternity'
      };
      
      const insuranceType = typeMapping[code];
      if (!insuranceType || type !== 'social_insurance') {
        return null;
      }
      
      const { data, error } = await supabase
        .from('social_insurance_base_configs')
        .select('min_base, max_base')
        .eq('insurance_type', insuranceType)
        .eq('region', 'beijing') // 暂时默认使用北京地区
        .lte('effective_from', new Date().toISOString().split('T')[0])
        .or('effective_to.is.null,effective_to.gte.' + new Date().toISOString().split('T')[0])
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('获取基数配置失败:', error);
      return null;
    }
  }
  
  /**
   * 获取五险一金配置列表（带分页和过滤）
   */
  static async getInsuranceConfigs(
    page = 0,
    pageSize = 20,
    filters: InsuranceConfigFilters = {}
  ): Promise<InsuranceConfigListResponse> {
    try {
      // Rate limiting check
      if (!apiRateLimiter.canMakeRequest()) {
        throw new Error('请求过于频繁，请稍后再试');
      }

      // Validate filters
      const validationResult = validateData(insuranceConfigFilterSchema, {
        ...filters,
        page,
        pageSize
      });
      
      if (!validationResult.success) {
        throw new Error(`参数验证失败: ${validationResult.errors[0].message}`);
      }
      
      const validatedFilters = validationResult.data;
      let query = supabase
        .from('deduction_configs')
        .select('*', { count: 'exact' })
        .in('type', ['social_insurance', 'housing_fund']);

      // 应用过滤条件
      if (validatedFilters.search) {
        const sanitizedSearch = sanitizeInput(validatedFilters.search);
        query = query.or(
          `name.ilike.%${sanitizedSearch}%,` +
          `code.ilike.%${sanitizedSearch}%,` +
          `description.ilike.%${sanitizedSearch}%`
        );
      }

      if (validatedFilters.type) {
        query = query.eq('type', validatedFilters.type);
      }

      if (validatedFilters.is_active !== undefined) {
        query = query.eq('is_active', validatedFilters.is_active);
      }

      if (validatedFilters.effective_date) {
        query = query
          .lte('effective_from', validatedFilters.effective_date)
          .or(`effective_to.is.null,effective_to.gte.${validatedFilters.effective_date}`);
      }

      // 分页
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 批量获取基数配置
      const rawConfigs = data as RawInsuranceConfig[];
      const configKeys = rawConfigs.map(raw => ({ code: raw.code, type: raw.type }));
      const baseConfigMap = await this.batchGetInsuranceBaseConfigs(configKeys);
      
      // 转换原始数据到前端期望的格式
      const transformedData = rawConfigs.map(raw => {
        const cacheKey = `${raw.type}_${raw.code}`;
        const baseConfig = baseConfigMap.get(cacheKey) || null;
        return transformRawToInsuranceConfig(raw, baseConfig);
      });
      
      return {
        data: transformedData,
        total: count || 0,
        page,
        pageSize
      };

    } catch (error) {
      console.error('获取五险一金配置列表失败:', error);
      throw new Error('获取五险一金配置列表失败');
    }
  }

  /**
   * 获取单个五险一金配置详情
   */
  static async getInsuranceConfig(id: string): Promise<InsuranceConfig> {
    try {
      const { data, error } = await supabase
        .from('deduction_configs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('配置不存在');

      const raw = data as RawInsuranceConfig;
      
      // 获取实际的基数配置
      const baseConfig = await this.getInsuranceBaseConfig(raw.code, raw.type);
      const transformed = transformRawToInsuranceConfig(raw, baseConfig);

      return transformed;

    } catch (error) {
      console.error('获取五险一金配置详情失败:', error);
      throw new Error('获取五险一金配置详情失败');
    }
  }

  /**
   * 创建新的五险一金配置
   */
  static createInsuranceConfig = withAuth(async (
    configData: Omit<InsuranceConfig, 'id' | 'created_at' | 'updated_at'>
  ): Promise<InsuranceConfig> => {
    try {
      // Rate limiting check
      if (!apiRateLimiter.canMakeRequest()) {
        throw new Error('请求过于频繁，请稍后再试');
      }

      // Validate input data
      const validationResult = validateData(insuranceConfigCreateSchema, configData);
      
      if (!validationResult.success) {
        throw new Error(`数据验证失败: ${validationResult.errors[0].message}`);
      }
      
      const validatedData = validationResult.data;
      // 将前端格式转换为数据库格式
      const rawData = {
        type: validatedData.type,
        code: validatedData.code,
        name: validatedData.name,
        description: validatedData.description,
        
        // 转换费率到JSONB格式
        rates: {
          employee: validatedData.employee_rate,
          employer: validatedData.employer_rate
        },
        
        // 基数配置 (暂时使用默认配置)
        base_config: {
          method: 'percentage',
          percentage: 100,
          round_to: 1
        },
        
        // 适用规则
        applicable_rules: validatedData.applicable_personnel_categories ? {
          personnel_categories: validatedData.applicable_personnel_categories
        } : null,
        
        // 其他字段
        is_active: validatedData.is_active,
        effective_from: validatedData.effective_from,
        effective_to: validatedData.effective_to,
        created_by: configData.created_by,
        updated_by: configData.updated_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('deduction_configs')
        .insert([rawData])
        .select()
        .single();

      if (error) throw error;

      const raw = data as RawInsuranceConfig;
      
      // Create audit log
      await createAuditLog({
        user_id: '', // Will be filled by createAuditLog
        action: 'create',
        resource_type: 'insurance_config',
        resource_id: raw.id,
        changes: rawData
      });

      // For newly created config, we don't have base config yet, so pass null
      return transformRawToInsuranceConfig(raw, null);

    } catch (error) {
      console.error('创建五险一金配置失败:', error);
      throw new Error('创建五险一金配置失败');
    }
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER])

  /**
   * 更新五险一金配置
   */
  static updateInsuranceConfig = withAuth(async (
    id: string,
    configData: Partial<InsuranceConfig>
  ): Promise<InsuranceConfig> => {
    try {
      // Rate limiting check
      if (!apiRateLimiter.canMakeRequest()) {
        throw new Error('请求过于频繁，请稍后再试');
      }

      // Validate input data
      const validationResult = validateData(insuranceConfigUpdateSchema, configData);
      
      if (!validationResult.success) {
        throw new Error(`数据验证失败: ${validationResult.errors[0].message}`);
      }
      
      const validatedData = validationResult.data;
      // 将前端格式的部分更新数据转换为数据库格式
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      // 转换基本字段
      if (validatedData.type !== undefined) updateData.type = validatedData.type;
      if (validatedData.code !== undefined) updateData.code = validatedData.code;
      if (validatedData.name !== undefined) updateData.name = validatedData.name;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;
      if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active;
      if (validatedData.effective_from !== undefined) updateData.effective_from = validatedData.effective_from;
      if (validatedData.effective_to !== undefined) updateData.effective_to = validatedData.effective_to;
      if (configData.created_by !== undefined) updateData.created_by = configData.created_by;
      if (configData.updated_by !== undefined) updateData.updated_by = configData.updated_by;
      
      // 转换费率配置
      if (validatedData.employee_rate !== undefined || validatedData.employer_rate !== undefined) {
        // 先获取当前数据以保持其他费率不变
        const { data: currentData } = await supabase
          .from('deduction_configs')
          .select('rates')
          .eq('id', id)
          .single();
          
        const currentRates = currentData?.rates || {};
        updateData.rates = {
          ...currentRates,
          ...(validatedData.employee_rate !== undefined && { employee: validatedData.employee_rate }),
          ...(validatedData.employer_rate !== undefined && { employer: validatedData.employer_rate })
        };
      }
      
      // 转换适用规则
      if (validatedData.applicable_personnel_categories !== undefined) {
        updateData.applicable_rules = validatedData.applicable_personnel_categories ? {
          personnel_categories: validatedData.applicable_personnel_categories
        } : null;
      }

      const { data, error } = await supabase
        .from('deduction_configs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const raw = data as RawInsuranceConfig;
      
      // Create audit log
      await createAuditLog({
        user_id: '', // Will be filled by createAuditLog
        action: 'update',
        resource_type: 'insurance_config',
        resource_id: id,
        changes: updateData
      });
      
      // 获取实际的基数配置
      const baseConfig = await this.getInsuranceBaseConfig(raw.code, raw.type);
      const transformed = transformRawToInsuranceConfig(raw, baseConfig);

      return transformed;

    } catch (error) {
      console.error('更新五险一金配置失败:', error);
      throw new Error('更新五险一金配置失败');
    }
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER])

  /**
   * 删除五险一金配置
   */
  static deleteInsuranceConfig = withAuth(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('deduction_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Create audit log
      await createAuditLog({
        user_id: '', // Will be filled by createAuditLog
        action: 'delete',
        resource_type: 'insurance_config',
        resource_id: id,
        changes: null
      });

    } catch (error) {
      console.error('删除五险一金配置失败:', error);
      throw new Error('删除五险一金配置失败');
    }
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER])

  /**
   * 批量删除五险一金配置
   */
  static bulkDeleteInsuranceConfigs = withAuth(async (ids: string[]): Promise<void> => {
    try {
      const { error } = await supabase
        .from('deduction_configs')
        .delete()
        .in('id', ids);

      if (error) throw error;

      // Create audit log
      await createAuditLog({
        user_id: '', // Will be filled by createAuditLog
        action: 'bulk_delete',
        resource_type: 'insurance_config',
        resource_id: ids.join(','),
        changes: { deleted_ids: ids }
      });

    } catch (error) {
      console.error('批量删除五险一金配置失败:', error);
      throw new Error('批量删除五险一金配置失败');
    }
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN])

  /**
   * 切换五险一金配置状态
   */
  static toggleInsuranceConfigStatus = withAuth(async (id: string): Promise<InsuranceConfig> => {
    try {
      // Rate limiting check
      if (!apiRateLimiter.canMakeRequest()) {
        throw new Error('请求过于频繁，请稍后再试');
      }

      // 先获取当前状态
      const { data: currentConfig, error: getError } = await supabase
        .from('deduction_configs')
        .select('is_active')
        .eq('id', id)
        .single();

      if (getError) throw getError;

      const newStatus = !currentConfig.is_active;

      // 切换状态
      const { data, error } = await supabase
        .from('deduction_configs')
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await createAuditLog({
        user_id: '', // Will be filled by createAuditLog
        action: 'toggle_status',
        resource_type: 'insurance_config',
        resource_id: id,
        changes: { 
          old_status: currentConfig.is_active,
          new_status: newStatus
        }
      });

      const raw = data as RawInsuranceConfig;
      
      // 获取实际的基数配置
      const baseConfig = await this.getInsuranceBaseConfig(raw.code, raw.type);
      const transformed = transformRawToInsuranceConfig(raw, baseConfig);

      return transformed;

    } catch (error) {
      console.error('切换五险一金配置状态失败:', error);
      throw new Error('切换五险一金配置状态失败');
    }
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER])

  /**
   * 搜索五险一金配置
   */
  static async searchInsuranceConfigs(
    searchTerm: string,
    limit = 10
  ): Promise<InsuranceConfig[]> {
    try {
      // Rate limiting check
      if (!apiRateLimiter.canMakeRequest()) {
        throw new Error('请求过于频繁，请稍后再试');
      }

      // Sanitize search term
      const sanitizedSearchTerm = sanitizeInput(searchTerm);
      const { data, error } = await supabase
        .from('deduction_configs')
        .select('*')
        .in('type', ['social_insurance', 'housing_fund'])
        .or(
          `name.ilike.%${sanitizedSearchTerm}%,` +
          `code.ilike.%${sanitizedSearchTerm}%,` +
          `description.ilike.%${sanitizedSearchTerm}%`
        )
        .eq('is_active', true)
        .limit(limit);

      if (error) throw error;

      // 批量获取基数配置
      const rawConfigs = data as RawInsuranceConfig[];
      const configKeys = rawConfigs.map(raw => ({ code: raw.code, type: raw.type }));
      const baseConfigMap = await this.batchGetInsuranceBaseConfigs(configKeys);
      
      // 转换并获取基数配置
      const transformedData = rawConfigs.map(raw => {
        const cacheKey = `${raw.type}_${raw.code}`;
        const baseConfig = baseConfigMap.get(cacheKey) || null;
        return transformRawToInsuranceConfig(raw, baseConfig);
      });

      return transformedData;

    } catch (error) {
      console.error('搜索五险一金配置失败:', error);
      throw new Error('搜索五险一金配置失败');
    }
  }

  /**
   * 获取五险一金配置统计信息
   */
  static async getInsuranceConfigStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    socialInsurance: number;
    housingFund: number;
    byType: { type: string; count: number }[];
  }> {
    try {
      const { data, error } = await supabase
        .from('deduction_configs')
        .select('type, is_active')
        .in('type', ['social_insurance', 'housing_fund']);

      if (error) throw error;

      const total = data.length;
      const active = data.filter(c => c.is_active).length;
      const inactive = data.filter(c => !c.is_active).length;
      const socialInsurance = data.filter(c => c.type === 'social_insurance').length;
      const housingFund = data.filter(c => c.type === 'housing_fund').length;

      const byType = data
        .reduce((acc: any[], curr) => {
          const existing = acc.find(item => item.type === curr.type);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ 
              type: curr.type === 'social_insurance' ? '社会保险' : '住房公积金', 
              count: 1 
            });
          }
          return acc;
        }, [])
        .sort((a, b) => b.count - a.count);

      return {
        total,
        active,
        inactive,
        socialInsurance,
        housingFund,
        byType
      };

    } catch (error) {
      console.error('获取五险一金配置统计失败:', error);
      throw new Error('获取五险一金配置统计失败');
    }
  }

  /**
   * 实时订阅五险一金配置数据变更
   */
  static subscribeToInsuranceConfigs(callback: (payload: any) => void) {
    const subscription = supabase
      .channel('deduction-configs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deduction_configs',
          filter: 'type=in.(social_insurance,housing_fund)'
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  /**
   * 取消订阅
   */
  static unsubscribeFromInsuranceConfigs(subscription: any) {
    supabase.removeChannel(subscription);
  }

  /**
   * 验证配置代码是否唯一
   */
  static async validateConfigCode(code: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('deduction_configs')
        .select('id')
        .eq('code', code);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data?.length || 0) === 0;

    } catch (error) {
      console.error('验证配置代码失败:', error);
      return false;
    }
  }

  /**
   * 获取可用的人员类别选项
   */
  static async getPersonnelCategoryOptions(): Promise<Array<{value: string; label: string}>> {
    try {
      const { data, error } = await supabase
        .from('personnel_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return data.map(item => ({
        value: item.id,
        label: item.name
      }));

    } catch (error) {
      console.error('获取人员类别选项失败:', error);
      throw new Error('获取人员类别选项失败');
    }
  }

  /**
   * 获取人员类别树形结构
   */
  static async getPersonnelCategoryTree(): Promise<Array<{
    value: string;
    label: string;
    level: number;
    parentId: string | null;
    children: Array<any>;
  }>> {
    try {
      const { data, error } = await supabase
        .from('personnel_categories')
        .select('id, name, code, parent_id, level, sort_order')
        .eq('is_active', true)
        .order('level')
        .order('sort_order')
        .order('name');

      if (error) throw error;

      // 构建树形结构
      const treeMap = new Map();
      const roots: any[] = [];

      // 首先创建所有节点
      data.forEach(item => {
        treeMap.set(item.id, {
          value: item.id,
          label: item.name,
          code: item.code,
          level: item.level,
          parentId: item.parent_id,
          sortOrder: item.sort_order,
          children: []
        });
      });

      // 然后构建树形关系
      data.forEach(item => {
        const node = treeMap.get(item.id);
        if (item.parent_id) {
          const parent = treeMap.get(item.parent_id);
          if (parent) {
            parent.children.push(node);
          }
        } else {
          roots.push(node);
        }
      });

      return roots;

    } catch (error) {
      console.error('获取人员类别树形结构失败:', error);
      throw new Error('获取人员类别树形结构失败');
    }
  }

  /**
   * 获取可用的险种代码选项
   */
  static async getInsuranceCodeOptions(): Promise<Array<{value: string; label: string}>> {
    try {
      const { data, error } = await supabase
        .from('deduction_configs')
        .select('code, name')
        .in('type', ['social_insurance', 'housing_fund'])
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return data.map(item => ({
        value: item.code,
        label: item.name
      }));

    } catch (error) {
      console.error('获取险种代码选项失败:', error);
      throw new Error('获取险种代码选项失败');
    }
  }
}