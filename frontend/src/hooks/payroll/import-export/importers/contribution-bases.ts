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
  
  // 预加载员工数据
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
  
  // 预加载保险类型数据
  const { data: insuranceTypes } = await supabase
    .from('insurance_types')
    .select('id, system_key, name')
    .eq('is_active', true);
  
  const insuranceTypeMap = new Map((insuranceTypes || []).map(type => [type.system_key, type]));
  console.log(`✅ 预加载 ${insuranceTypeMap.size} 个保险类型`);
  
  // 社保基数字段映射 - 映射到 insurance_types.system_key
  const baseFields = [
    { field: '养老保险基数', systemKey: 'pension' },
    { field: '医疗保险基数', systemKey: 'medical' },
    { field: '失业保险基数', systemKey: 'unemployment' },
    { field: '工伤保险基数', systemKey: 'work_injury' },
    { field: '生育保险基数', systemKey: 'maternity' },
    { field: '住房公积金基数', systemKey: 'housing_fund' },
    { field: '职业年金基数', systemKey: 'occupational_pension' },
    { field: '大病医疗基数', systemKey: 'serious_illness' },
    // 兼容旧的字段名称
    { field: '养老基数', systemKey: 'pension' },
    { field: '医疗基数', systemKey: 'medical' },
    { field: '失业基数', systemKey: 'unemployment' },
    { field: '工伤基数', systemKey: 'work_injury' },
    { field: '生育基数', systemKey: 'maternity' },
    { field: '公积金基数', systemKey: 'housing_fund' }
  ];
  
  // 准备批量数据
  const allContributionBases: any[] = [];
  
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
      
      // 处理每种保险基数，创建单独的记录
      let processedCount = 0;
      
      for (const { field, systemKey } of baseFields) {
        const value = row[field];
        
        // 检查该员工的这种保险类型是否已经处理过（避免重复字段导致的重复记录）
        const existingRecord = allContributionBases.find(
          record => record.employee_id === employee.id && 
                   record.insurance_type_id === insuranceTypeMap.get(systemKey)?.id
        );
        
        if (!existingRecord && value && Number(value) > 0) {
          const insuranceType = insuranceTypeMap.get(systemKey);
          if (insuranceType) {
            allContributionBases.push({
              employee_id: employee.id,
              insurance_type_id: insuranceType.id,
              contribution_base: Number(value),
              period_id: periodId
            });
            processedCount++;
          } else {
            console.warn(`找不到保险类型: ${systemKey}`);
          }
        }
      }
      
      if (processedCount === 0) {
        console.warn(`第 ${i + 1} 行: 没有找到有效的基数数据`);
        results.push({ 
          row, 
          success: false, 
          error: '没有找到有效的基数数据'
        });
      } else {
        results.push({ row, success: true, processedCount });
      }
      
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
  
  // 批量插入缴费基数数据
  if (allContributionBases.length > 0) {
    console.log(`🚀 批量插入 ${allContributionBases.length} 条缴费基数记录...`);
    
    try {
      // 更新进度：开始删除现有数据
      if (onProgressUpdate && globalProgressRef) {
        onProgressUpdate({
          message: '正在清理现有缴费基数数据...'
        });
      }
      
      // 先删除该周期的现有数据，然后插入新数据（upsert替代方案）
      const employeeIds = [...new Set(allContributionBases.map(item => item.employee_id))];
      
      // 删除现有数据
      console.log(`🗑️ 删除 ${employeeIds.length} 个员工的现有缴费基数数据...`);
      await supabase
        .from('employee_contribution_bases')
        .delete()
        .eq('period_id', periodId)
        .in('employee_id', employeeIds);
      
      // 更新进度：开始插入新数据
      if (onProgressUpdate && globalProgressRef) {
        onProgressUpdate({
          message: `正在批量插入 ${allContributionBases.length} 条缴费基数记录...`
        });
      }
      
      // 批量插入新数据
      console.log(`📝 批量插入 ${allContributionBases.length} 条新的缴费基数记录...`);
      const { error: insertError } = await supabase
        .from('employee_contribution_bases')
        .insert(allContributionBases);
      
      if (insertError) {
        console.error('❌ 批量插入缴费基数失败:', insertError);
        throw new Error(`批量插入缴费基数失败: ${insertError.message}`);
      }
      
      console.log(`✅ 成功插入 ${allContributionBases.length} 条缴费基数记录`);
      
      // 更新进度：批量操作完成
      if (onProgressUpdate && globalProgressRef) {
        onProgressUpdate({
          message: `成功导入 ${allContributionBases.length} 条缴费基数记录`
        });
      }
      
    } catch (error) {
      console.error('❌ 批量操作失败:', error);
      
      // 更新进度：操作失败
      if (onProgressUpdate && globalProgressRef) {
        onProgressUpdate({
          message: `批量操作失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
      }
      
      errors.push({
        row: -1,
        message: `批量插入失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    }
  }
  
  // 统计结果
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`\n🎯 社保基数导入完成:`);
  console.log(`  - 成功处理行数: ${successCount} 条`);
  console.log(`  - 失败行数: ${failCount} 条`);
  console.log(`  - 插入基数记录: ${allContributionBases.length} 条`);
  
  return {
    success: errors.length === 0,
    totalRows: data.length,
    successCount,
    failedCount: failCount,
    skippedCount: 0,
    errors,
    warnings: [],
    results
  };
};