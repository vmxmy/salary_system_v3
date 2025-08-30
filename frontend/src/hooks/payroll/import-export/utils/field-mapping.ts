import { supabase } from '@/lib/supabase';
import { ImportDataGroup } from '@/types/payroll-import';
import type { ColumnMatchResult, FieldMappingAnalysis, SalaryComponent } from '../types';
import { performSmartFieldMatching, FUZZY_MATCHING_CONFIG } from './fuzzy-matching';

/**
 * 动态获取所有可能的目标字段
 */
export interface DynamicField {
  name: string;
  display_name?: string;  // 中文显示名称
  match_aliases?: string[]; // 匹配别名（用于提高匹配率）
  type: 'basic' | 'assignment' | 'contribution_base' | 'salary_component';
  required: boolean;
  source_table?: string;
}

export const getDynamicTargetFields = async (dataGroup?: ImportDataGroup): Promise<DynamicField[]> => {
  console.log('🔍 开始动态获取目标字段，数据组:', dataGroup);
  const fields: DynamicField[] = [];

  try {
    // 1. 基础字段：系统核心字段配置
    fields.push({
      name: 'employee_name',
      display_name: '员工姓名',
      match_aliases: [
        '员工姓名', '姓名', '人员姓名', '员工', '姓名',
        'employee_name', 'name', 'full_name', 'emp_name'
      ],
      type: 'basic',
      required: true,
      source_table: 'employees'
    });

    // 2. 根据数据组获取特定字段
    if (dataGroup === 'job' || dataGroup === 'all') {
      // 添加通用部门字段（用于匹配Excel中的部门列）
      fields.push({
        name: 'department_name',
        display_name: '部门',
        match_aliases: [
          '部门', '部门名称', '所在部门', '工作部门', '归属部门',
          'department', 'department_name', 'dept', 'dept_name'
        ],
        type: 'assignment',
        required: true,
        source_table: 'departments'
      });

      // 添加通用职位字段（用于匹配Excel中的职位列）
      fields.push({
        name: 'position_name',
        display_name: '职位',
        match_aliases: [
          '职位', '职位名称', '岗位', '岗位名称', '职务', '职务名称',
          'position', 'position_name', 'job_title', 'title'
        ],
        type: 'assignment',
        required: true,
        source_table: 'positions'
      });

      // 从 departments 表获取具体部门名称（作为额外候选）
      const { data: departments } = await supabase
        .from('departments')
        .select('name')
        .order('name');
      
      departments?.forEach(dept => {
        fields.push({
          name: dept.name,
          type: 'assignment',
          required: false, // 具体部门名称不是必填的
          source_table: 'departments'
        });
      });

      // 从 positions 表获取具体职位名称（作为额外候选）
      const { data: positions } = await supabase
        .from('positions')
        .select('name')
        .order('name');
      
      positions?.forEach(pos => {
        fields.push({
          name: pos.name,
          type: 'assignment',
          required: false, // 具体职位名称不是必填的
          source_table: 'positions'
        });
      });

      // 添加职级字段（从 job_ranks 表获取）
      fields.push({
        name: 'rank_name',
        display_name: '职级',
        match_aliases: [
          '职级', '职级名称', '级别', '等级', '职务级别',
          'rank', 'rank_name', 'level', 'grade'
        ],
        type: 'assignment',
        required: false,
        source_table: 'job_ranks'
      });

      // 从 job_ranks 表获取具体职级名称
      const { data: ranks } = await supabase
        .from('job_ranks')
        .select('name')
        .order('name');
      
      ranks?.forEach(rank => {
        fields.push({
          name: rank.name,
          type: 'assignment',
          required: false,
          source_table: 'job_ranks'
        });
      });
    }

    if (dataGroup === 'category' || dataGroup === 'all') {
      // 添加通用人员类别字段（用于匹配Excel中的类别列）
      fields.push({
        name: 'category_name',
        display_name: '人员类别',
        match_aliases: [
          '人员类别', '类别', '人员类别名称', '类别名称', '员工类别', 
          '身份类别', '人员性质', '编制性质', '用工性质',
          'category', 'category_name', 'employee_category', 'staff_type'
        ],
        type: 'assignment',
        required: true,
        source_table: 'employee_categories'
      });

      // 从 employee_categories 表获取具体类别名称（作为额外候选）
      const { data: categories } = await supabase
        .from('employee_categories')
        .select('name')
        .order('name');
      
      categories?.forEach(cat => {
        fields.push({
          name: cat.name,
          type: 'assignment',
          required: false, // 具体类别名称不是必填的
          source_table: 'employee_categories'
        });
      });
    }

    if (dataGroup === 'bases' || dataGroup === 'all') {
      // 从 insurance_types 表动态生成缴费基数字段
      const { data: insuranceTypes } = await supabase
        .from('insurance_types')
        .select('name, system_key')
        .eq('is_active', true)
        .order('name');
      
      insuranceTypes?.forEach(insurance => {
        // 生成基数字段名
        const baseName = `${insurance.name}基数`;
        fields.push({
          name: baseName,
          type: 'contribution_base',
          required: false,
          source_table: 'insurance_types'
        });
      });
    }

    if (dataGroup === 'earnings' || dataGroup === 'all') {
      // 获取薪资组件
      const salaryComponents = await getSalaryComponents(dataGroup);
      salaryComponents.forEach(component => {
        fields.push({
          name: component.name,
          type: 'salary_component',
          required: component.is_required || false,
          source_table: 'salary_components'
        });
      });
    }

    console.log(`✅ 动态获取目标字段完成，共 ${fields.length} 个字段`);
    console.log('📋 字段详情:', fields.map(f => `${f.name} (${f.type}, ${f.source_table})`));
    
    return fields;
  } catch (error) {
    console.error('❌ 获取动态目标字段失败:', error);
    return [];
  }
};

/**
 * 获取薪资组件
 */
export const getSalaryComponents = async (dataGroup?: ImportDataGroup): Promise<SalaryComponent[]> => {
  try {
    console.log('🔍 获取薪资组件，数据组:', dataGroup);
    
    let query = supabase
      .from('salary_components')
      .select('*');
    // 注意：salary_components 表没有 is_active 字段，默认所有组件都是活跃的

    // 根据数据组筛选薪资组件
    if (dataGroup && dataGroup !== 'all') {
      switch (dataGroup) {
        case 'earnings':
          // 薪资明细导入包括基本工资、津贴、个税和其他扣发等类别
          query = query.in('category', [
            'basic_salary',        // 基本工资
            'benefits',           // 津贴补贴
            'personal_tax',       // 个人所得税
            'other_deductions'    // 其他扣除
          ]);
          break;
        case 'bases':
        case 'category':
        case 'job':
          // 这些数据组不涉及薪资组件
          return [];
        default:
          break;
      }
    }

    // salary_components 表没有 display_order 字段，按 name 排序
    query = query.order('name');
    
    const { data: components, error } = await query;

    if (error) {
      console.warn('⚠️ 获取薪资组件失败，使用空列表:', error);
      return [];
    }

    console.log(`✅ 成功获取 ${components?.length || 0} 个薪资组件`);
    return components || [];
  } catch (error) {
    console.error('❌ 获取薪资组件时发生错误:', error);
    return [];
  }
};

/**
 * 构建数据库字段映射（完全动态版本）
 */
export const buildDbFieldsMapping = async (
  dataGroup?: ImportDataGroup
): Promise<Map<string, { type: string; required: boolean }>> => {
  console.log('🔄 开始构建动态字段映射，数据组:', dataGroup);
  const dbFields = new Map<string, { type: string; required: boolean }>();
  
  try {
    // 完全从数据库动态获取所有目标字段
    const dynamicFields = await getDynamicTargetFields(dataGroup);
    
    dynamicFields.forEach(field => {
      // 主字段名
      dbFields.set(field.name, {
        type: field.type,
        required: field.required
      });
      
      // 添加别名映射（都指向主字段）
      if (field.match_aliases) {
        field.match_aliases.forEach(alias => {
          dbFields.set(alias, {
            type: field.type,
            required: field.required
          });
        });
      }
      
      // 添加显示名称映射
      if (field.display_name) {
        dbFields.set(field.display_name, {
          type: field.type,
          required: field.required
        });
      }
    });

    console.log(`✅ 构建动态字段映射完成，数据组: ${dataGroup}, 字段数量: ${dbFields.size}`);
    console.log('🔍 动态目标字段名:', Array.from(dbFields.keys()));
    console.log('🔍 字段详情:', Array.from(dbFields.entries()));

    return dbFields;
  } catch (error) {
    console.error('❌ 构建动态字段映射失败:', error);
    return new Map();
  }
};

/**
 * 精确字段匹配函数
 * 只使用精确匹配，不使用模糊匹配算法
 */
const performExactMatching = (excelColumn: string, dbField: string): boolean => {
  // 特别调试 "员工姓名" 字段
  if (excelColumn === '员工姓名' || dbField === '员工姓名') {
    console.log(`🎯 特别调试 - Excel: "${excelColumn}", DB: "${dbField}"`);
  }
  
  // 1. 完全精确匹配（忽略大小写）
  if (excelColumn.toLowerCase() === dbField.toLowerCase()) {
    if (excelColumn === '员工姓名' || dbField === '员工姓名') {
      console.log(`✅ 精确匹配成功: "${excelColumn}" === "${dbField}"`);
    }
    return true;
  }
  
  // 2. 包含匹配（双向检查）
  if (excelColumn.includes(dbField) || dbField.includes(excelColumn)) {
    if (excelColumn === '员工姓名' || dbField === '员工姓名') {
      console.log(`✅ 包含匹配成功: "${excelColumn}" includes "${dbField}"`);
    }
    return true;
  }
  
  return false;
};

/**
 * 精确字段匹配实现
 * 只使用精确匹配规则，不使用模糊匹配算法
 */
export const performExactFieldMatching = (
  excelColumns: string[],
  dbFields: Map<string, { type: string; required: boolean }>
): ColumnMatchResult[] => {
  const haystack = Array.from(dbFields.keys());
  
  console.log('🔍 使用精确匹配规则进行字段匹配');
  console.log('📥 输入的Excel列名:', excelColumns);
  console.log('📋 期望的字段名:', haystack);

  const matchResults: ColumnMatchResult[] = [];

  // 分析每个Excel列
  excelColumns.forEach(excelColumn => {
    console.log(`🔍 分析Excel列: "${excelColumn}"`);
    
    let matchedField: string | null = null;
    
    // 遍历所有数据库字段，寻找精确匹配
    for (const dbField of haystack) {
      if (performExactMatching(excelColumn, dbField)) {
        matchedField = dbField;
        console.log(`  ✅ 精确匹配: ${excelColumn} -> ${dbField}`);
        break; // 找到第一个匹配就停止
      }
    }
    
    if (matchedField) {
      const fieldInfo = dbFields.get(matchedField);
      matchResults.push({
        excelColumn,
        dbField: matchedField,
        matchType: 'exact',
        suggestions: [matchedField], // 只提供匹配到的字段作为建议
        isRequired: fieldInfo?.required || false
      });
    } else {
      // 提供所有可能的字段作为建议
      const suggestions = haystack.slice(0, 5); // 前5个字段作为建议
      
      matchResults.push({
        excelColumn,
        dbField: null,
        matchType: 'unmapped',
        suggestions,
        isRequired: false
      });
      console.log(`  ❌ 无精确匹配: ${excelColumn}`);
    }
  });

  return matchResults;
};

/**
 * 分析字段映射
 */
export const analyzeFieldMapping = async (
  excelColumns: string[], 
  dataGroup?: ImportDataGroup,
  sheetName = 'Sheet1',
  useSmartMatching = true // 新增参数：是否使用智能匹配（精确+模糊）
): Promise<FieldMappingAnalysis> => {
  console.log('🔍 开始分析字段映射...');
  console.log('📊 Excel列名:', excelColumns);
  console.log('📋 数据组:', dataGroup);
  console.log('🔢 Excel列数量:', excelColumns.length);
  console.log('🧠 使用智能匹配:', useSmartMatching);

  // 构建完全动态的数据库字段映射
  const dbFields = await buildDbFieldsMapping(dataGroup);
  
  // 根据配置选择匹配策略
  const matchResults = useSmartMatching 
    ? performSmartFieldMatching(excelColumns, dbFields)
    : performExactFieldMatching(excelColumns, dbFields);
  
  // 统计分析结果
  const totalColumns = excelColumns.length;
  const mappedColumns = matchResults.filter(r => r.matchType !== 'unmapped').length;
  const unmappedColumns = totalColumns - mappedColumns;
  
  // 动态必填字段检查逻辑
  const dynamicFields = await getDynamicTargetFields(dataGroup);
  const requiredFields = dynamicFields.filter(field => field.required);
  const requiredFieldNames = new Set(requiredFields.map(field => field.name));
  
  // 检查每个必需字段是否有匹配的Excel字段
  const missingDbFields: string[] = [];
  requiredFieldNames.forEach(requiredFieldName => {
    // 检查是否有Excel字段匹配到这个必需字段
    const hasMapping = matchResults.some(r => 
      r.dbField === requiredFieldName && r.matchType !== 'unmapped'
    );
    
    if (!hasMapping) {
      missingDbFields.push(requiredFieldName);
    }
  });
  
  const requiredFieldsTotal = requiredFieldNames.size;
  const requiredFieldsMatched = requiredFieldsTotal - missingDbFields.length;
  
  // 调试必填字段检查
  console.log('🔍 动态必填字段检查调试:');
  console.log('📋 必需的数据库字段:', Array.from(requiredFieldNames));
  console.log('📊 匹配结果:', matchResults.map(r => `${r.excelColumn} -> ${r.dbField} (${r.matchType})`));
  console.log('❌ 缺少的数据库字段:', missingDbFields);
  console.log('✅ 成功匹配的数据库字段数量:', requiredFieldsMatched);
  console.log('📈 必需数据库字段总数:', requiredFieldsTotal);
  
  // 生成警告和建议
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  if (unmappedColumns > 0) {
    warnings.push(`有 ${unmappedColumns} 个Excel列无法自动匹配到数据库字段`);
  }
  
  if (requiredFieldsMatched < requiredFieldsTotal) {
    warnings.push(`缺少必填的数据库字段: ${missingDbFields.join(', ')}`);
    recommendations.push('请检查Excel文件是否包含员工姓名字段（可以是"员工姓名"、"姓名"或"name"）');
  }
  
  if (mappedColumns / totalColumns < 0.7) {
    recommendations.push('建议检查Excel文件的列名是否符合标准格式');
  }

  console.log(`✅ 字段映射分析完成: ${mappedColumns}/${totalColumns} 列已匹配`);

  return {
    sheetName,
    dataGroup,
    totalColumns,
    mappedColumns,
    unmappedColumns,
    requiredFieldsMatched,
    requiredFieldsTotal,
    matchResults,
    warnings,
    recommendations
  };
};