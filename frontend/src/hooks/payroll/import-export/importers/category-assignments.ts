import { supabase } from '@/lib/supabase';
import type { ExcelDataRow, ImportProgress } from '../types';
import { IMPORT_CONFIG } from '../constants';

/**
 * 导入人员类别分配（使用批量插入优化）
 */
export const importCategoryAssignments = async (
  data: ExcelDataRow[],
  periodId: string,
  onProgressUpdate?: (progress: Partial<ImportProgress>) => void,
  globalProgressRef?: { current: number }
) => {
  console.log('🔍 开始导入人员类别分配（批量优化版）');
  console.log('📊 数据行数:', data.length);
  console.log('📋 第一行数据示例:', data[0]);
  
  const results: any[] = [];
  const errors: any[] = [];
  
  // Step 1: 批量预加载所有需要的数据
  console.log('\n🚀 批量预加载相关数据...');
  
  // 预加载所有员工
  const employeeNames = [...new Set(data.map(row => 
    row['员工姓名'] || row['姓名'] || row['employee_name'] || row['name']
  ).filter(Boolean))];
  
  console.log(`📊 需要查询的员工数量: ${employeeNames.length}`);
  const { data: allEmployees } = await supabase
    .from('employees')
    .select('id, employee_name')
    .in('employee_name', employeeNames);
  
  const employeeMap = new Map((allEmployees || []).map(emp => [emp.employee_name, emp]));
  console.log(`✅ 预加载 ${employeeMap.size} 个员工数据`);
  
  // 预加载所有人员类别
  const categoryNames = [...new Set(data.map(row => 
    row['人员类别名称'] || row['人员类别'] || row['类别'] || row['category_name']
  ).filter(Boolean))];
  
  console.log(`📊 需要查询的类别数量: ${categoryNames.length}`);
  const { data: allCategories } = await supabase
    .from('employee_categories')
    .select('id, name')
    .in('name', categoryNames);
  
  const categoryMap = new Map((allCategories || []).map(cat => [cat.name, cat]));
  console.log(`✅ 预加载 ${categoryMap.size} 个类别数据`);
  
  // 预加载现有分配记录
  const employeeIds = Array.from(employeeMap.values()).map(emp => emp.id);
  const { data: existingAssignments } = await supabase
    .from('employee_category_assignments')
    .select('id, employee_id')
    .in('employee_id', employeeIds)
    .eq('period_id', periodId);
  
  const existingMap = new Map((existingAssignments || []).map(a => [a.employee_id, a]));
  console.log(`✅ 找到 ${existingMap.size} 条现有分配记录`);
  
  // Step 2: 准备批量数据
  console.log('\n📋 准备批量插入/更新数据...');
  const toInsert = [];
  const toUpdate = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    try {
      // 查找员工
      const employeeName = row['员工姓名'] || row['姓名'] || row['employee_name'] || row['name'];
      if (!employeeName) {
        throw new Error(`第 ${i + 1} 行: 缺少员工姓名`);
      }
      
      const employee = employeeMap.get(employeeName);
      if (!employee) {
        throw new Error(`第 ${i + 1} 行: 找不到员工 ${employeeName}`);
      }
      
      // 查找类别
      const categoryName = row['人员类别名称'] || row['人员类别'] || row['类别'] || row['category_name'];
      if (!categoryName) {
        throw new Error(`第 ${i + 1} 行: 缺少人员类别`);
      }
      
      const category = categoryMap.get(categoryName);
      if (!category) {
        throw new Error(`第 ${i + 1} 行: 找不到人员类别 ${categoryName}`);
      }
      
      // 检查是否需要更新
      const existing = existingMap.get(employee.id);
      
      if (existing) {
        toUpdate.push({
          id: existing.id,
          employee_category_id: category.id
        });
      } else {
        toInsert.push({
          employee_id: employee.id,
          employee_category_id: category.id,
          period_id: periodId
        });
      }
      
    } catch (error) {
      errors.push({
        row: i + 1,
        message: error instanceof Error ? error.message : '未知错误',
        data: row
      });
    }
    
    // 更新进度
    if (onProgressUpdate && globalProgressRef) {
      globalProgressRef.current++;
      onProgressUpdate({
        global: {
          totalGroups: 0,
          processedGroups: 0,
          totalRecords: 0,
          processedRecords: globalProgressRef.current,
          dataGroups: []
        },
        current: {
          groupName: 'category_assignments',
          groupIndex: 0,
          sheetName: 'category_assignments',
          totalRecords: data.length,
          processedRecords: i + 1,
          successCount: i + 1 - errors.length,
          errorCount: errors.length
        },
        phase: 'importing' as const,
        message: `正在处理人员类别分配 ${i + 1}/${data.length}...`
      });
    }
  }
  
  // Step 3: 执行批量操作
  console.log('\n🚀 执行批量数据库操作...');
  console.log(`📊 待插入: ${toInsert.length} 条, 待更新: ${toUpdate.length} 条`);
  
  // 批量插入新记录（每批 100 条）
  if (toInsert.length > 0) {
    const insertChunkSize = IMPORT_CONFIG.BATCH_SIZE;
    for (let i = 0; i < toInsert.length; i += insertChunkSize) {
      const chunk = toInsert.slice(i, i + insertChunkSize);
      console.log(`💾 插入第 ${Math.floor(i / insertChunkSize) + 1} 批，共 ${chunk.length} 条`);
      
      const { error: insertError } = await supabase
        .from('employee_category_assignments')
        .insert(chunk);
      
      if (insertError) {
        console.error('❌ 批量插入失败:', insertError);
        chunk.forEach((_, index) => {
          errors.push({
            row: Math.floor(i / insertChunkSize) + 1,
            message: `批量插入失败: ${insertError.message}`
          });
        });
      }
    }
  }
  
  // 批量更新现有记录
  if (toUpdate.length > 0) {
    console.log(`📝 批量更新 ${toUpdate.length} 条记录`);
    // Supabase 不支持批量更新，需要逐条更新
    // 但可以使用 Promise.all 并行执行
    const updatePromises = toUpdate.map(item => 
      supabase
        .from('employee_category_assignments')
        .update({ employee_category_id: item.employee_category_id })
        .eq('id', item.id)
    );
    
    const updateResults = await Promise.allSettled(updatePromises);
    updateResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        errors.push({
          row: -1,
          message: `更新失败: ${result.reason}`
        });
      }
    });
  }
  
  // Step 4: 构建返回结果
  data.forEach((row, index) => {
    const hasError = errors.find(e => e.row === index + 1);
    if (hasError) {
      results.push({ 
        row, 
        success: false, 
        error: hasError.message 
      });
    } else {
      results.push({ row, success: true });
    }
  });
  
  // 统计结果
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`\n🎯 人员类别分配导入完成:`);
  console.log(`  - 成功: ${successCount} 条`);
  console.log(`  - 失败: ${failCount} 条`);
  console.log(`  - 插入: ${toInsert.length} 条`);
  console.log(`  - 更新: ${toUpdate.length} 条`);
  
  return {
    success: errors.length === 0,
    totalRows: data.length,
    successCount,
    failedCount: failCount,
    skippedCount: 0, // 当前实现中没有跳过的记录
    errors,
    warnings: [], // 当前实现中没有警告
    results
  };
};