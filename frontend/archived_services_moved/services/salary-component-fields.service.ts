import { supabase } from '@/lib/supabase';

// 类型定义
export type SalaryComponentCategoryKey = 
  | 'basic_salary'
  | 'benefits' 
  | 'allowances'
  | 'performance'
  | 'overtime'
  | 'personal_insurance'
  | 'personal_benefits'
  | 'employer_insurance'
  | 'personal_tax'
  | 'other_deductions'
  | 'deductions';
export interface SalaryFieldStatistic {
  component_category: string;
  field_name: string;
  field_display_name: string;
  record_count: number;
  avg_amount: number;
}

export interface SalaryComponentCategory {
  category: string;
  displayName: string;
  icon: string;
  description: string;
  fields: SalaryFieldStatistic[];
}

// 分类图标映射
const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  basic_salary: '💰',
  benefits: '🎁',
  allowances: '🏆',
  performance: '📈',
  overtime: '⏰',
  personal_insurance: '🛡️',
  personal_benefits: '🏠',
  employer_insurance: '🏢',
  personal_tax: '📊',
  other_deductions: '📉',
  deductions: '📉'
};

// 数据库分类信息接口
export interface DatabaseCategoryInfo {
  category_key: string;
  category_name: string;
  component_count: number;
  earning_count: number;
  deduction_count: number;
  component_names: string[];
  sort_order: number;
}

// 薪资组件字段统计服务
export class SalaryComponentFieldsService {
  
  /**
   * 获取数据库中的分类元数据
   */
  static async getCategoryMetadata(): Promise<Record<string, DatabaseCategoryInfo>> {
    try {
      const { data, error } = await supabase
        .from('view_salary_component_categories')
        .select('*')
        .order('sort_order');

      if (error) {
        console.error('❌ Failed to fetch category metadata:', error);
        return {};
      }

      const categoryMap: Record<string, DatabaseCategoryInfo> = {};
      data?.forEach(category => {
        categoryMap[category.category_key] = category;
      });

      console.log('✅ Loaded category metadata:', Object.keys(categoryMap));
      return categoryMap;
    } catch (error) {
      console.error('🚨 Error loading category metadata:', error);
      return {};
    }
  }

  /**
   * 获取指定月份的薪资字段统计
   */
  static async getFieldsStatistics(targetMonth?: string): Promise<SalaryFieldStatistic[]> {
    try {
      console.log('🔍 Fetching salary fields statistics for month:', targetMonth);
      
      const { data, error } = await supabase
        .rpc('get_salary_fields_by_category_and_month', {
          target_month: targetMonth || null,
          category_filter: null
        });

      if (error) {
        console.error('❌ Failed to fetch salary fields statistics:', error);
        throw error;
      }

      console.log('✅ Successfully fetched salary fields statistics:', data?.length || 0, 'records');
      
      // 转换数据格式，使用 positive_record_count 作为显示的人数
      const formattedData = (data || []).map((item: any) => ({
        component_category: item.component_category,
        field_name: item.field_name,
        field_display_name: item.field_display_name,
        record_count: Number(item.positive_record_count), // 使用有金额的记录数
        avg_amount: Number(item.avg_amount),
        // 为组件提供驼峰命名的属性
        recordCount: Number(item.positive_record_count),
        avgAmount: Number(item.avg_amount),
        fieldName: item.field_name,
        fieldDisplayName: item.field_display_name
      }));

      return formattedData;
    } catch (error) {
      console.error('🚨 Error in getFieldsStatistics:', error);
      // 如果数据库函数不存在，使用备用查询
      return await this.getFieldsStatisticsFallback(targetMonth);
    }
  }

  /**
   * 备用方法：直接查询视图
   */
  private static async getFieldsStatisticsFallback(targetMonth?: string): Promise<SalaryFieldStatistic[]> {
    try {
      console.log('🔄 Using fallback method to fetch from view');
      
      let query = supabase
        .from('view_salary_component_fields_statistics')
        .select('component_category, field_name, field_display_name, record_count, positive_record_count, avg_amount');

      if (targetMonth) {
        query = query.eq('pay_month_string', targetMonth);
        console.log('🔍 Filtering by month:', targetMonth);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Failed to fetch from view:', error);
        return [];
      }

      console.log('✅ Fallback query successful:', data?.length || 0, 'records');
      
      // 转换数据格式以匹配接口
      const formattedData = (data || []).map(item => ({
        component_category: item.component_category,
        field_name: item.field_name,
        field_display_name: item.field_display_name,
        record_count: Number(item.positive_record_count), // 使用有金额的记录数，不是总记录数
        avg_amount: Number(item.avg_amount),
        // 为组件提供驼峰命名的属性
        recordCount: Number(item.positive_record_count),
        avgAmount: Number(item.avg_amount),
        fieldName: item.field_name,
        fieldDisplayName: item.field_display_name
      }));

      return formattedData;
    } catch (error) {
      console.error('🚨 Error in fallback query:', error);
      return [];
    }
  }

  /**
   * 根据分类获取字段统计
   */
  static async getFieldsByCategory(
    category: SalaryComponentCategoryKey,
    targetMonth?: string
  ): Promise<SalaryFieldStatistic[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_salary_fields_by_category_and_month', {
          target_month: targetMonth || null,
          category_filter: category
        });

      if (error) {
        console.error(`Failed to fetch fields for category ${category}:`, error);
        return [];
      }

      // 转换数据格式，使用 positive_record_count 作为显示的人数
      const formattedData = (data || []).map((item: any) => ({
        component_category: item.component_category,
        field_name: item.field_name,
        field_display_name: item.field_display_name,
        record_count: Number(item.positive_record_count), // 使用有金额的记录数
        avg_amount: Number(item.avg_amount),
        // 为组件提供驼峰命名的属性
        recordCount: Number(item.positive_record_count),
        avgAmount: Number(item.avg_amount),
        fieldName: item.field_name,
        fieldDisplayName: item.field_display_name
      }));

      return formattedData;
    } catch (error) {
      console.error('Error in getFieldsByCategory:', error);
      return [];
    }
  }

  /**
   * 获取按分类组织的薪资组件数据
   */
  static async getSalaryComponentCategories(targetMonth?: string): Promise<SalaryComponentCategory[]> {
    console.log('📊 Getting salary component categories for month:', targetMonth);
    
    // 获取分类元数据和字段统计数据
    const [allFields, categoryMetadata] = await Promise.all([
      this.getFieldsStatistics(targetMonth),
      this.getCategoryMetadata()
    ]);
    
    console.log('📋 Raw fields data:', allFields.length, 'fields');
    console.log('🏷️ Category metadata loaded:', Object.keys(categoryMetadata).length, 'categories');
    
    // 按分类分组
    const categoriesMap = new Map<string, SalaryFieldStatistic[]>();
    
    allFields.forEach(field => {
      const category = field.component_category;
      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, []);
      }
      categoriesMap.get(category)!.push(field);
    });

    console.log('🗂️ Categories found in data:', Array.from(categoriesMap.keys()));

    // 转换为组件分类格式，使用数据库的分类信息
    const categories: SalaryComponentCategory[] = [];
    
    for (const [categoryKey, fields] of categoriesMap) {
      const categoryInfo = categoryMetadata[categoryKey];
      
      if (categoryInfo) {
        // 过滤掉记录数为0的字段
        const validFields = fields.filter(field => field.record_count > 0);
        
        if (validFields.length > 0) {
          // 生成描述信息
          const sampleComponents = categoryInfo.component_names.slice(0, 3).join('、');
          const description = categoryInfo.component_count > 3 
            ? `${sampleComponents}等${categoryInfo.component_count}种组件`
            : sampleComponents;

          categories.push({
            category: categoryKey,
            displayName: categoryInfo.category_name, // 使用数据库的分类名称
            icon: DEFAULT_CATEGORY_ICONS[categoryKey] || '📄', // 使用图标映射
            description: description, // 基于实际组件生成描述
            fields: validFields.sort((a, b) => b.record_count - a.record_count) // 按记录数降序排列
          });
          console.log(`✅ Added category: ${categoryInfo.category_name} with ${validFields.length} fields`);
        } else {
          console.log(`⚠️ Skipped category: ${categoryInfo.category_name} (no valid fields)`);
        }
      } else {
        console.log(`❌ Unknown category key: ${categoryKey} (not found in metadata)`);
        
        // 对于未知分类，使用默认信息
        const validFields = fields.filter(field => field.record_count > 0);
        if (validFields.length > 0) {
          categories.push({
            category: categoryKey,
            displayName: categoryKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            icon: DEFAULT_CATEGORY_ICONS[categoryKey] || '📄',
            description: `${categoryKey} 相关组件`,
            fields: validFields.sort((a, b) => b.record_count - a.record_count)
          });
          console.log(`⚠️ Added unknown category: ${categoryKey} with ${validFields.length} fields`);
        }
      }
    }

    console.log('🎯 Final categories:', categories.length);
    
    // 按数据库的排序顺序排列，如果没有排序信息则按字段数量排序
    return categories.sort((a, b) => {
      const aMetadata = categoryMetadata[a.category];
      const bMetadata = categoryMetadata[b.category];
      
      if (aMetadata && bMetadata) {
        return aMetadata.sort_order - bMetadata.sort_order;
      } else if (aMetadata) {
        return -1;
      } else if (bMetadata) {
        return 1;
      } else {
        return b.fields.length - a.fields.length;
      }
    });
  }

  /**
   * 获取薪资组件分类的摘要信息
   */
  static async getCategorySummary(targetMonth?: string): Promise<{
    category: SalaryComponentCategoryKey;
    displayName: string;
    icon: string;
    fieldCount: number;
    totalRecords: number;
    avgAmount: number;
  }[]> {
    const categories = await this.getSalaryComponentCategories(targetMonth);
    
    return categories.map(category => ({
      category: category.category as SalaryComponentCategoryKey,
      displayName: category.displayName,
      icon: category.icon,
      fieldCount: category.fields.length,
      totalRecords: category.fields.reduce((sum, field) => sum + field.record_count, 0),
      avgAmount: category.fields.length > 0 
        ? category.fields.reduce((sum, field) => sum + field.avg_amount, 0) / category.fields.length 
        : 0
    }));
  }

  /**
   * 检查指定月份是否有薪资数据
   */
  static async hasPayrollData(yearMonth: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('payroll_results')
        .select('id', { count: 'exact' })
        .eq('payroll_month', yearMonth)
        .limit(1);

      if (error) {
        console.error('Error checking payroll data:', error);
        return false;
      }

      return (count || 0) > 0;
    } catch (error) {
      console.error('Error in hasPayrollData:', error);
      return false;
    }
  }

  /**
   * 获取有薪资数据的月份列表
   */
  static async getMonthsWithData(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_results')
        .select('payroll_month')
        .order('payroll_month', { ascending: false });

      if (error) {
        console.error('Error fetching months with data:', error);
        return [];
      }

      // 去重并返回
      const uniqueMonths = [...new Set(data?.map(item => item.payroll_month) || [])];
      return uniqueMonths;
    } catch (error) {
      console.error('Error in getMonthsWithData:', error);
      return [];
    }
  }

  /**
   * 获取上个月的年月字符串
   */
  static getPreviousMonth(): string {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * 格式化金额显示
   */
  static formatAmount(amount: number): string {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}千`;
    } else {
      return amount.toFixed(0);
    }
  }

  /**
   * 获取分类的变体样式
   */
  static getCategoryVariant(category: string): 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error' {
    const variantMap: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'> = {
      basic_salary: 'primary',
      benefits: 'success',
      allowances: 'info',
      performance: 'warning',
      overtime: 'secondary',
      personal_insurance: 'error',
      personal_benefits: 'success',
      employer_insurance: 'info',
      personal_tax: 'warning',
      other_deductions: 'error',
      deductions: 'error'
    };

    return variantMap[category] || 'primary';
  }
}

// 导出便捷方法
export const {
  getFieldsStatistics,
  getFieldsByCategory,
  getSalaryComponentCategories,
  getCategorySummary,
  hasPayrollData,
  getMonthsWithData,
  getPreviousMonth,
  formatAmount,
  getCategoryVariant
} = SalaryComponentFieldsService;

// 创建默认导出实例
export const salaryComponentFieldsService = SalaryComponentFieldsService;