import uFuzzy from '@leeoniya/ufuzzy';
import { supabase } from '@/lib/supabase';
import { ImportDataGroup } from '@/types/payroll-import';
import type { ColumnMatchResult, FieldMappingAnalysis, SalaryComponent } from '../types';
import { FUZZY_MATCH_CONFIG, FIELD_MAPPINGS } from '../constants';

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
        case 'payroll':
          // 薪资项目：获取所有活跃的薪资组件
          break;
        case 'earnings':
          query = query.eq('type', 'earning');
          break;
        case 'deductions':
          query = query.eq('type', 'deduction');
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
  
  // 添加基础字段
  FIELD_MAPPINGS.BASIC_FIELDS.forEach((value, key) => {
    dbFields.set(key, { type: 'basic', required: true });
  });
  
  // 添加薪资组件字段
  salaryComponents.forEach(component => {
    dbFields.set(component.name, { 
      type: component.type === 'earning' ? 'earning' : 'deduction', 
      required: component.is_required 
    });
  });
  
  // 根据数据组添加特定字段
  if (dataGroup === 'category' || dataGroup === 'all') {
    FIELD_MAPPINGS.ASSIGNMENT_FIELDS.forEach((value, key) => {
      if (key.includes('类别') || key.includes('category')) {
        dbFields.set(key, { type: 'assignment', required: true });
      }
    });
  }
  
  if (dataGroup === 'job' || dataGroup === 'all') {
    FIELD_MAPPINGS.ASSIGNMENT_FIELDS.forEach((value, key) => {
      if (key.includes('部门') || key.includes('职位') || 
          key.includes('department') || key.includes('position')) {
        dbFields.set(key, { type: 'assignment', required: true });
      }
    });
  }
  
  if (dataGroup === 'bases' || dataGroup === 'all') {
    FIELD_MAPPINGS.CONTRIBUTION_BASE_FIELDS.forEach((value, key) => {
      dbFields.set(key, { type: 'contribution_base', required: false });
    });
  }

  return dbFields;
};

/**
 * 使用 uFuzzy 进行字段匹配
 */
export const performFuzzyMatching = (
  excelColumns: string[],
  dbFields: Map<string, { type: string; required: boolean }>
): ColumnMatchResult[] => {
  // 使用 uFuzzy 进行高效的模糊匹配
  // uFuzzy 是2025年最新的高性能模糊匹配库，仅7.5KB，零依赖
  const uf = new uFuzzy(FUZZY_MATCH_CONFIG);

  // 构建搜索数据库字段列表
  const haystack = Array.from(dbFields.keys());
  
  console.log('🔍 使用 uFuzzy 进行字段匹配，数据库字段:', haystack);

  const matchResults: ColumnMatchResult[] = [];

  // 分析每个Excel列
  excelColumns.forEach(excelColumn => {
    console.log(`🔍 分析Excel列: "${excelColumn}"`);
    
    // 使用 uFuzzy 进行搜索
    const idxs = uf.filter(haystack, excelColumn);
    
    if (idxs && idxs.length > 0) {
      // 获取匹配信息和排序
      const info = uf.info(idxs, haystack, excelColumn);
      const order = uf.sort(info, haystack, excelColumn);
      
      if (order.length > 0) {
        // 获取最佳匹配
        const bestMatchIdx = info.idx[order[0]];
        const bestMatchField = haystack[bestMatchIdx];
        const fieldInfo = dbFields.get(bestMatchField);
        
        // 计算相似度分数 (uFuzzy 没有直接提供相似度分数，我们基于排名估算)
        const similarity = order[0] === 0 ? 1.0 : Math.max(0.6, 1 - (order[0] * 0.1));
        
        // 判断匹配类型
        let matchType: 'exact' | 'fuzzy' | 'unmapped';
        if (excelColumn.toLowerCase() === bestMatchField.toLowerCase()) {
          matchType = 'exact';
        } else if (similarity >= FUZZY_MATCH_CONFIG.SIMILARITY_THRESHOLD) {
          matchType = 'fuzzy';
        } else {
          matchType = 'unmapped';
        }
        
        // 获取建议列表（前3个匹配）
        const suggestions = order.slice(0, 3).map(idx => haystack[info.idx[idx]]);
        
        matchResults.push({
          excelColumn,
          dbField: matchType !== 'unmapped' ? bestMatchField : null,
          matchType,
          suggestions,
          isRequired: fieldInfo?.required || false
        });
        
        console.log(`  🎯 匹配结果: ${excelColumn} -> ${bestMatchField} (${matchType}, ${similarity.toFixed(2)})`);
      } else {
        matchResults.push({
          excelColumn,
          dbField: null,
          matchType: 'unmapped',
          suggestions: [],
          isRequired: false
        });
        console.log(`  ❓ 无匹配: ${excelColumn}`);
      }
    } else {
      matchResults.push({
        excelColumn,
        dbField: null,
        matchType: 'unmapped',
        suggestions: [],
        isRequired: false
      });
      console.log(`  ❓ 无匹配: ${excelColumn}`);
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
  sheetName: string = 'Sheet1'
): Promise<FieldMappingAnalysis> => {
  console.log('🔍 开始分析字段映射...');
  console.log('📊 Excel列名:', excelColumns);
  console.log('📋 数据组:', dataGroup);

  // 获取薪资组件
  const salaryComponents = await getSalaryComponents(dataGroup);
  
  // 构建数据库字段映射
  const dbFields = buildDbFieldsMapping(salaryComponents, dataGroup);
  
  // 执行模糊匹配
  const matchResults = performFuzzyMatching(excelColumns, dbFields);
  
  // 统计分析结果
  const totalColumns = excelColumns.length;
  const mappedColumns = matchResults.filter(r => r.matchType !== 'unmapped').length;
  const unmappedColumns = totalColumns - mappedColumns;
  
  // 统计必填字段匹配情况
  const requiredFields = Array.from(dbFields.entries())
    .filter(([_, info]) => info.required)
    .map(([field, _]) => field);
  const requiredFieldsTotal = requiredFields.length;
  const requiredFieldsMatched = matchResults.filter(r => 
    r.matchType !== 'unmapped' && requiredFields.includes(r.dbField!)
  ).length;
  
  // 生成警告和建议
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  if (unmappedColumns > 0) {
    warnings.push(`有 ${unmappedColumns} 个Excel列无法自动匹配到数据库字段`);
  }
  
  if (requiredFieldsMatched < requiredFieldsTotal) {
    const missingRequired = requiredFields.filter(field => 
      !matchResults.some(r => r.dbField === field && r.matchType !== 'unmapped')
    );
    warnings.push(`缺少必填字段: ${missingRequired.join(', ')}`);
    recommendations.push('请检查Excel文件是否包含所有必填字段，或手动调整字段映射');
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