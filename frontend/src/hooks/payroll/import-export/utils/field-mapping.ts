import { supabase } from '@/lib/supabase';
import { ImportDataGroup } from '@/types/payroll-import';
import type { ColumnMatchResult, FieldMappingAnalysis, SalaryComponent } from '../types';
import { FIELD_MAPPINGS } from '../constants';

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
          query = query.eq('type', 'earning');
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
 * 构建数据库字段映射
 */
export const buildDbFieldsMapping = (
  salaryComponents: SalaryComponent[],
  dataGroup?: ImportDataGroup
): Map<string, { type: string; required: boolean }> => {
  const dbFields = new Map<string, { type: string; required: boolean }>();
  
  // 基础字段始终添加（所有数据组都需要员工姓名）
  // 注意：这里添加的是Excel中可能出现的字段名，不是数据库字段名
  FIELD_MAPPINGS.BASIC_FIELDS.forEach((dbFieldName, excelFieldName) => {
    dbFields.set(excelFieldName, { type: 'basic', required: true });
  });
  
  // 根据数据组添加特定字段
  if (dataGroup === 'earnings' || dataGroup === 'all') {
    // 动态添加薪资组件字段（从数据库获取）
    salaryComponents.forEach(component => {
      dbFields.set(component.name, { 
        type: component.type === 'earning' ? 'earning' : 'deduction', 
        required: component.is_required || false 
      });
    });
  }
  
  if (dataGroup === 'category' || dataGroup === 'all') {
    FIELD_MAPPINGS.ASSIGNMENT_FIELDS.forEach((dbFieldName, excelFieldName) => {
      if (excelFieldName.includes('类别') || excelFieldName.includes('category')) {
        dbFields.set(excelFieldName, { type: 'assignment', required: true });
      }
    });
  }
  
  if (dataGroup === 'job' || dataGroup === 'all') {
    FIELD_MAPPINGS.ASSIGNMENT_FIELDS.forEach((dbFieldName, excelFieldName) => {
      if (excelFieldName.includes('部门') || excelFieldName.includes('职位') || 
          excelFieldName.includes('department') || excelFieldName.includes('position')) {
        dbFields.set(excelFieldName, { type: 'assignment', required: true });
      }
    });
  }
  
  if (dataGroup === 'bases' || dataGroup === 'all') {
    FIELD_MAPPINGS.CONTRIBUTION_BASE_FIELDS.forEach((dbFieldName, excelFieldName) => {
      dbFields.set(excelFieldName, { type: 'contribution_base', required: false });
    });
  }

  console.log(`📋 构建字段映射完成，数据组: ${dataGroup}, 字段数量: ${dbFields.size}`);
  console.log('🔍 期望的Excel字段名:', Array.from(dbFields.keys()));
  console.log('🔍 字段详情:', Array.from(dbFields.entries()));

  return dbFields;
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
  sheetName = 'Sheet1'
): Promise<FieldMappingAnalysis> => {
  console.log('🔍 开始分析字段映射...');
  console.log('📊 Excel列名:', excelColumns);
  console.log('📋 数据组:', dataGroup);
  console.log('🔢 Excel列数量:', excelColumns.length);

  // 获取薪资组件
  const salaryComponents = await getSalaryComponents(dataGroup);
  
  // 构建数据库字段映射
  const dbFields = buildDbFieldsMapping(salaryComponents, dataGroup);
  
  // 执行精确匹配
  const matchResults = performExactFieldMatching(excelColumns, dbFields);
  
  // 统计分析结果
  const totalColumns = excelColumns.length;
  const mappedColumns = matchResults.filter(r => r.matchType !== 'unmapped').length;
  const unmappedColumns = totalColumns - mappedColumns;
  
  // 重新设计必填字段检查逻辑 - 按数据库字段分组
  const requiredDbFields = new Set<string>();
  
  // 从FIELD_MAPPINGS中提取必需的数据库字段
  FIELD_MAPPINGS.BASIC_FIELDS.forEach((dbFieldName, _) => {
    requiredDbFields.add(dbFieldName);
  });
  
  // 检查每个必需的数据库字段是否有匹配的Excel字段
  const missingDbFields: string[] = [];
  requiredDbFields.forEach(requiredDbField => {
    // 检查是否有任何Excel字段映射到这个数据库字段
    const hasMapping = Array.from(FIELD_MAPPINGS.BASIC_FIELDS.entries())
      .filter(([_, dbField]) => dbField === requiredDbField)
      .some(([excelField, _]) => matchResults.some(r => 
        r.excelColumn === excelField && r.matchType !== 'unmapped'
      ));
    
    if (!hasMapping) {
      missingDbFields.push(requiredDbField);
    }
  });
  
  const requiredFieldsTotal = requiredDbFields.size;
  const requiredFieldsMatched = requiredFieldsTotal - missingDbFields.length;
  
  // 调试必填字段检查
  console.log('🔍 必填字段检查调试 (重新设计):');
  console.log('📋 必需的数据库字段:', Array.from(requiredDbFields));
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