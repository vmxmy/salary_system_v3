import { supabase } from './supabaseClient';
import { 
  taxConfigCreateSchema,
  taxConfigUpdateSchema,
  taxConfigFilterSchema,
  taxConfigResponseSchema,
  taxConfigListResponseSchema,
  type TaxConfigCreate,
  type TaxConfigUpdate,
  type TaxConfigFilter
} from './validation/taxConfigSchema';
import { validateData, sanitizeInput, RateLimiter } from '../utils/validation';
import { withAuth, createAuditLog } from './authMiddleware';
import { UserRole } from '../components/ProtectedRoute';

// 个税配置类型定义
export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
  deduction: number;
}

export interface TaxExemptions {
  basic: number;
  special_deductions: {
    child_education: { max: number; per_child: number };
    continuing_education: { max: number };
    medical: { max: number };
    housing_loan: { max: number };
    housing_rent: { max: number };
    elderly_care: { max: number };
  };
}

export interface TaxConfig {
  id: string;
  tax_type: string;
  region: string;
  description?: string;
  
  // 税率表
  brackets: TaxBracket[];
  
  // 免税额和专项扣除
  exemptions: TaxExemptions;
  
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

export interface TaxConfigFilters {
  search?: string;
  tax_type?: string;
  region?: string;
  is_active?: boolean;
  effective_date?: string;
}

export interface TaxConfigListResponse {
  data: TaxConfig[];
  total: number;
  page: number;
  pageSize: number;
}

// Rate limiter instance
const apiRateLimiter = new RateLimiter(30, 60000); // 30 requests per minute

// 个税配置 API 访问层
export class TaxConfigAPI {
  
  /**
   * 获取个税配置列表（带分页和过滤）
   */
  static async getTaxConfigs(
    page = 0,
    pageSize = 20,
    filters: TaxConfigFilters = {}
  ): Promise<TaxConfigListResponse> {
    try {
      // Rate limiting check
      if (!apiRateLimiter.canMakeRequest()) {
        throw new Error('请求过于频繁，请稍后再试');
      }

      // Validate filters
      const validationResult = validateData(taxConfigFilterSchema, {
        ...filters,
        page,
        pageSize
      });
      
      if (!validationResult.success) {
        throw new Error(`参数验证失败: ${validationResult.errors[0].message}`);
      }
      
      const validatedFilters = validationResult.data;
      let query = supabase
        .from('tax_brackets_config')
        .select('*', { count: 'exact' });

      // 应用过滤条件
      if (validatedFilters.search) {
        const sanitizedSearch = sanitizeInput(validatedFilters.search);
        query = query.or(
          `tax_type.ilike.%${sanitizedSearch}%,` +
          `region.ilike.%${sanitizedSearch}%,` +
          `description.ilike.%${sanitizedSearch}%`
        );
      }

      if (validatedFilters.tax_type) {
        query = query.eq('tax_type', validatedFilters.tax_type);
      }

      if (validatedFilters.region) {
        query = query.eq('region', validatedFilters.region);
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

      return {
        data: data as TaxConfig[],
        total: count || 0,
        page,
        pageSize
      };

    } catch (error) {
      console.error('获取个税配置列表失败:', error);
      throw new Error('获取个税配置列表失败');
    }
  }

  /**
   * 获取单个个税配置详情
   */
  static async getTaxConfig(id: string): Promise<TaxConfig> {
    try {
      const { data, error } = await supabase
        .from('tax_brackets_config')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('配置不存在');

      return data as TaxConfig;

    } catch (error) {
      console.error('获取个税配置详情失败:', error);
      throw new Error('获取个税配置详情失败');
    }
  }

  /**
   * 创建新的个税配置
   */
  static createTaxConfig = withAuth(async (
    configData: Omit<TaxConfig, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TaxConfig> => {
    try {
      // Rate limiting check
      if (!apiRateLimiter.canMakeRequest()) {
        throw new Error('请求过于频繁，请稍后再试');
      }

      // Validate input data
      const validationResult = validateData(taxConfigCreateSchema, configData);
      
      if (!validationResult.success) {
        throw new Error(`数据验证失败: ${validationResult.errors[0].message}`);
      }
      
      const validatedData = validationResult.data;
      const { data, error } = await supabase
        .from('tax_brackets_config')
        .insert([{
          ...validatedData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await createAuditLog({
        user_id: '', // Will be filled by createAuditLog
        action: 'create',
        resource_type: 'tax_config',
        resource_id: data.id,
        changes: validatedData
      });

      return data as TaxConfig;

    } catch (error) {
      console.error('创建个税配置失败:', error);
      throw new Error('创建个税配置失败');
    }
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER])

  /**
   * 更新个税配置
   */
  static updateTaxConfig = withAuth(async (
    id: string,
    configData: Partial<TaxConfig>
  ): Promise<TaxConfig> => {
    try {
      // Rate limiting check
      if (!apiRateLimiter.canMakeRequest()) {
        throw new Error('请求过于频繁，请稍后再试');
      }

      // Validate input data
      const validationResult = validateData(taxConfigUpdateSchema, configData);
      
      if (!validationResult.success) {
        throw new Error(`数据验证失败: ${validationResult.errors[0].message}`);
      }
      
      const validatedData = validationResult.data;
      const { data, error } = await supabase
        .from('tax_brackets_config')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await createAuditLog({
        user_id: '', // Will be filled by createAuditLog
        action: 'update',
        resource_type: 'tax_config',
        resource_id: id,
        changes: validatedData
      });

      return data as TaxConfig;

    } catch (error) {
      console.error('更新个税配置失败:', error);
      throw new Error('更新个税配置失败');
    }
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER])

  /**
   * 删除个税配置
   */
  static deleteTaxConfig = withAuth(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('tax_brackets_config')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Create audit log
      await createAuditLog({
        user_id: '', // Will be filled by createAuditLog
        action: 'delete',
        resource_type: 'tax_config',
        resource_id: id,
        changes: null
      });

    } catch (error) {
      console.error('删除个税配置失败:', error);
      throw new Error('删除个税配置失败');
    }
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER])

  /**
   * 批量删除个税配置
   */
  static bulkDeleteTaxConfigs = withAuth(async (ids: string[]): Promise<void> => {
    try {
      const { error } = await supabase
        .from('tax_brackets_config')
        .delete()
        .in('id', ids);

      if (error) throw error;

      // Create audit log
      await createAuditLog({
        user_id: '', // Will be filled by createAuditLog
        action: 'bulk_delete',
        resource_type: 'tax_config',
        resource_id: ids.join(','),
        changes: { deleted_ids: ids }
      });

    } catch (error) {
      console.error('批量删除个税配置失败:', error);
      throw new Error('批量删除个税配置失败');
    }
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN])

  /**
   * 切换个税配置状态
   */
  static toggleTaxConfigStatus = withAuth(async (id: string): Promise<TaxConfig> => {
    try {
      // Rate limiting check
      if (!apiRateLimiter.canMakeRequest()) {
        throw new Error('请求过于频繁，请稍后再试');
      }

      // 先获取当前状态
      const { data: currentConfig, error: getError } = await supabase
        .from('tax_brackets_config')
        .select('is_active')
        .eq('id', id)
        .single();

      if (getError) throw getError;

      const newStatus = !currentConfig.is_active;

      // 切换状态
      const { data, error } = await supabase
        .from('tax_brackets_config')
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
        resource_type: 'tax_config',
        resource_id: id,
        changes: { 
          old_status: currentConfig.is_active,
          new_status: newStatus
        }
      });

      return data as TaxConfig;

    } catch (error) {
      console.error('切换个税配置状态失败:', error);
      throw new Error('切换个税配置状态失败');
    }
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER])

  /**
   * 搜索个税配置
   */
  static async searchTaxConfigs(
    searchTerm: string,
    limit = 10
  ): Promise<TaxConfig[]> {
    try {
      // Rate limiting check
      if (!apiRateLimiter.canMakeRequest()) {
        throw new Error('请求过于频繁，请稍后再试');
      }

      // Sanitize search term
      const sanitizedSearchTerm = sanitizeInput(searchTerm);
      const { data, error } = await supabase
        .from('tax_brackets_config')
        .select('*')
        .or(
          `tax_type.ilike.%${sanitizedSearchTerm}%,` +
          `region.ilike.%${sanitizedSearchTerm}%,` +
          `description.ilike.%${sanitizedSearchTerm}%`
        )
        .eq('is_active', true)
        .limit(limit);

      if (error) throw error;

      return data as TaxConfig[];

    } catch (error) {
      console.error('搜索个税配置失败:', error);
      throw new Error('搜索个税配置失败');
    }
  }

  /**
   * 获取个税配置统计信息
   */
  static async getTaxConfigStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byType: { type: string; count: number }[];
    byRegion: { region: string; count: number }[];
  }> {
    try {
      const { data, error } = await supabase
        .from('tax_brackets_config')
        .select('tax_type, region, is_active');

      if (error) throw error;

      const total = data.length;
      const active = data.filter(c => c.is_active).length;
      const inactive = data.filter(c => !c.is_active).length;

      const byType = data
        .reduce((acc: any[], curr) => {
          const existing = acc.find(item => item.type === curr.tax_type);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ type: curr.tax_type, count: 1 });
          }
          return acc;
        }, [])
        .sort((a, b) => b.count - a.count);

      const byRegion = data
        .reduce((acc: any[], curr) => {
          const existing = acc.find(item => item.region === curr.region);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ region: curr.region, count: 1 });
          }
          return acc;
        }, [])
        .sort((a, b) => b.count - a.count);

      return {
        total,
        active,
        inactive,
        byType,
        byRegion
      };

    } catch (error) {
      console.error('获取个税配置统计失败:', error);
      throw new Error('获取个税配置统计失败');
    }
  }

  /**
   * 实时订阅个税配置数据变更
   */
  static subscribeToTaxConfigs(callback: (payload: any) => void) {
    const subscription = supabase
      .channel('tax-brackets-config-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tax_brackets_config'
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  /**
   * 取消订阅
   */
  static unsubscribeFromTaxConfigs(subscription: any) {
    supabase.removeChannel(subscription);
  }

  /**
   * 验证税收类型和区域组合是否唯一
   */
  static async validateTaxConfigUnique(
    taxType: string,
    region: string,
    effectiveFrom: string,
    excludeId?: string
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('tax_brackets_config')
        .select('id')
        .eq('tax_type', taxType)
        .eq('region', region)
        .eq('effective_from', effectiveFrom);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data?.length || 0) === 0;

    } catch (error) {
      console.error('验证个税配置唯一性失败:', error);
      return false;
    }
  }

  /**
   * 获取可用的税收类型选项
   */
  static getTaxTypeOptions(): Array<{value: string; label: string}> {
    return [
      { value: 'income_tax', label: '个人所得税' },
      { value: 'year_end_bonus', label: '年终奖个税' },
      { value: 'labor_income', label: '劳务报酬' },
      { value: 'author_income', label: '稿酬所得' },
      { value: 'royalty_income', label: '特许权使用费' },
      { value: 'business_income', label: '经营所得' },
      { value: 'property_income', label: '财产租赁所得' },
      { value: 'transfer_income', label: '财产转让所得' },
      { value: 'dividend_income', label: '股息红利所得' },
      { value: 'incidental_income', label: '偶然所得' }
    ];
  }

  /**
   * 获取可用的区域选项
   */
  static getRegionOptions(): Array<{value: string; label: string}> {
    return [
      { value: 'default', label: '全国' },
      { value: 'beijing', label: '北京' },
      { value: 'shanghai', label: '上海' },
      { value: 'guangzhou', label: '广州' },
      { value: 'shenzhen', label: '深圳' },
      { value: 'hangzhou', label: '杭州' },
      { value: 'nanjing', label: '南京' },
      { value: 'chengdu', label: '成都' },
      { value: 'wuhan', label: '武汉' },
      { value: 'xian', label: '西安' }
    ];
  }

  /**
   * 计算个税
   */
  static calculateTax(
    taxableIncome: number,
    brackets: TaxBracket[],
    exemptions: TaxExemptions,
    specialDeductions: number = 0
  ): {
    taxableAmount: number;
    taxAmount: number;
    afterTaxAmount: number;
    appliedBracket: TaxBracket | null;
    calculation: Array<{
      bracket: TaxBracket;
      bracketTaxableAmount: number;
      bracketTaxAmount: number;
    }>;
  } {
    // 计算应纳税所得额
    const taxableAmount = Math.max(0, taxableIncome - exemptions.basic - specialDeductions);
    
    let totalTax = 0;
    let appliedBracket: TaxBracket | null = null;
    const calculation: Array<{
      bracket: TaxBracket;
      bracketTaxableAmount: number;
      bracketTaxAmount: number;
    }> = [];

    // 查找适用的税率级数
    for (const bracket of brackets) {
      if (taxableAmount > bracket.min) {
        const bracketMax = bracket.max || Infinity;
        const bracketTaxableAmount = Math.min(taxableAmount, bracketMax) - bracket.min;
        const bracketTaxAmount = bracketTaxableAmount * bracket.rate;
        
        totalTax += bracketTaxAmount;
        appliedBracket = bracket;
        
        calculation.push({
          bracket,
          bracketTaxableAmount,
          bracketTaxAmount
        });
        
        if (taxableAmount <= bracketMax) {
          break;
        }
      }
    }

    // 也可以使用速算扣除法
    if (appliedBracket) {
      totalTax = taxableAmount * appliedBracket.rate - appliedBracket.deduction;
      totalTax = Math.max(0, totalTax);
    }

    return {
      taxableAmount,
      taxAmount: totalTax,
      afterTaxAmount: taxableIncome - totalTax,
      appliedBracket,
      calculation
    };
  }
}