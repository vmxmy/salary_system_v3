import { supabase } from '@/lib/supabase';
import type { ExcelDataRow, ImportProgress } from '../types';

/**
 * 导入社保基数数据
 */
export const importContributionBases = async (
  data: ExcelDataRow[],
  periodId: string,
  onProgressUpdate?: (progress: Partial<ImportProgress>) => void,
  globalProgressRef?: { current: number }
) => {
  console.log('🏦 开始导入社保基数数据');
  console.log(`📊 数据行数: ${data.length}`);
  console.log(`🆔 周期ID: ${periodId}`);
  
  const results: any[] = [];
  const errors: any[] = [];
  
  // 批量预加载员工数据
  const employeeNames = [...new Set(data.map(row => 
    row['员工姓名'] || row['employee_name']
  ).filter(Boolean))];
  
  console.log(`📊 需要查询的员工数量: ${employeeNames.length}`);
  const { data: allEmployees } = await supabase
    .from('employees')
    .select('id, employee_name')
    .in('employee_name', employeeNames);
  
  const employeeMap = new Map((allEmployees || []).map(emp => [emp.employee_name, emp]));
  console.log(`✅ 预加载 ${employeeMap.size} 个员工数据`);
  
  // 社保基数字段映射 - 扩展支持更多基数类型
  const baseFields = [
    { field: '养老保险基数', baseType: 'pension_base' },
    { field: '医疗保险基数', baseType: 'medical_base' },
    { field: '失业保险基数', baseType: 'unemployment_base' },
    { field: '工伤保险基数', baseType: 'work_injury_base' },
    { field: '生育保险基数', baseType: 'maternity_base' },
    { field: '住房公积金基数', baseType: 'housing_fund_base' },
    { field: '职业年金基数', baseType: 'occupational_annuity_base' },
    { field: '大病医疗基数', baseType: 'serious_illness_base' },
    // 兼容旧的字段名称
    { field: '养老基数', baseType: 'pension_base' },
    { field: '医疗基数', baseType: 'medical_base' },
    { field: '失业基数', baseType: 'unemployment_base' },
    { field: '工伤基数', baseType: 'work_injury_base' },
    { field: '生育基数', baseType: 'maternity_base' },
    { field: '公积金基数', baseType: 'housing_fund_base' }
  ];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    try {
      // 查找员工
      const employeeName = row['员工姓名'] || row['employee_name'];
      if (!employeeName) {
        throw new Error(`第 ${i + 1} 行: 缺少员工姓名`);
      }
      
      const employee = employeeMap.get(employeeName);
      if (!employee) {
        throw new Error(`第 ${i + 1} 行: 找不到员工 ${employeeName}`);
      }
      
      // 准备基数数据
      const baseData: any = {
        employee_id: employee.id,
        period_id: periodId,  // 使用正确的字段名 period_id
        effective_date: new Date().toISOString().split('T')[0]
      };
      
      // 使用Set避免重复处理相同的基数类型
      const processedBaseTypes = new Set<string>();
      
      for (const { field, baseType } of baseFields) {
        // 如果该基数类型已处理过，跳过
        if (processedBaseTypes.has(baseType)) {
          continue;
        }
        
        const value = row[field] || row[baseType];
        if (value && Number(value) > 0) {
          baseData[baseType] = Number(value);
          processedBaseTypes.add(baseType);
        }
      }
      
      // 检查是否有有效的基数数据
      const hasValidData = processedBaseTypes.size > 0;
      if (!hasValidData) {
        console.warn(`第 ${i + 1} 行: 没有找到有效的基数数据`);
        results.push({ 
          row, 
          success: false, 
          error: '没有找到有效的基数数据'
        });
        continue;
      }
      
      // 插入或更新社保基数
      const { error } = await supabase
        .from('employee_contribution_bases')
        .upsert(baseData, {
          onConflict: 'employee_id,period_id'
        });
      
      if (error) {
        throw new Error(`数据库操作失败: ${error.message}`);
      }
      
      results.push({ row, success: true });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      errors.push({
        row: i + 1,
        message: errorMessage
      });
      results.push({ 
        row, 
        success: false, 
        error: errorMessage
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
          groupName: 'contribution_bases',
          groupIndex: 0,
          sheetName: 'contribution_bases',
          totalRecords: data.length,
          processedRecords: i + 1,
          successCount: i + 1 - errors.length,
          errorCount: errors.length
        },
        phase: 'importing' as const,
        message: `正在处理社保基数 ${i + 1}/${data.length}...`
      });
    }
  }
  
  // 统计结果
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`\n🎯 社保基数导入完成:`);
  console.log(`  - 成功: ${successCount} 条`);
  console.log(`  - 失败: ${failCount} 条`);
  
  return {
    success: errors.length === 0,
    totalRows: data.length,
    successCount,
    failedCount: failCount,
    errors,
    results
  };
};