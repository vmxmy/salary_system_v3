import { supabase } from '@/lib/supabase';
import type { ExcelDataRow, ImportProgress } from '../types';
import { IMPORT_CONFIG } from '../constants';

/**
 * 导入岗位分配数据（使用批量插入优化）
 */
export const importJobAssignments = async (
  data: ExcelDataRow[],
  periodId: string,
  onProgressUpdate?: (progress: Partial<ImportProgress>) => void,
  globalProgressRef?: { current: number }
) => {
  console.log('🏢 开始导入职务分配数据（批量优化版）');
  console.log(`📊 数据行数: ${data.length}`);
  console.log(`🆔 周期ID: ${periodId}`);
  console.log('📋 原始数据预览:', data.slice(0, 3));
  
  const results: any[] = [];
  const errors: any[] = [];
  
  // Step 1: 批量预加载所有相关数据
  console.log('\n🚀 批量预加载职务分配相关数据...');
  
  // 1. 预加载所有员工
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
  
  // 2. 预加载所有部门
  const departmentNames = [...new Set(data.map(row => 
    row['部门'] || row['department_name']
  ).filter(Boolean))];
  
  console.log(`📊 需要查询的部门数量: ${departmentNames.length}`);
  const { data: allDepartments } = await supabase
    .from('departments')
    .select('id, name')
    .in('name', departmentNames);
  
  const departmentMap = new Map((allDepartments || []).map(dept => [dept.name, dept]));
  console.log(`✅ 预加载 ${departmentMap.size} 个部门数据`);
  
  // 3. 预加载所有职位
  const positionNames = [...new Set(data.map(row => 
    row['职位'] || row['position_name']
  ).filter(Boolean))];
  
  console.log(`📊 需要查询的职位数量: ${positionNames.length}`);
  const { data: allPositions } = await supabase
    .from('positions')
    .select('id, name')
    .in('name', positionNames);
  
  const positionMap = new Map((allPositions || []).map(pos => [pos.name, pos]));
  console.log(`✅ 预加载 ${positionMap.size} 个职位数据`);
  
  // 4. 预加载所有职级（如果有）
  const rankNames = [...new Set(data.map(row => 
    row['职级'] || row['rank_name']
  ).filter(Boolean))];
  
  let rankMap = new Map();
  if (rankNames.length > 0) {
    console.log(`📊 需要查询的职级数量: ${rankNames.length}`);
    const { data: allRanks } = await supabase
      .from('job_ranks')
      .select('id, name')
      .in('name', rankNames);
    
    rankMap = new Map((allRanks || []).map(rank => [rank.name, rank]));
    console.log(`✅ 预加载 ${rankMap.size} 个职级数据`);
  }
  
  // Step 2: 准备批量数据
  console.log('\n📋 准备批量插入数据...');
  const toInsert = [];
  
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
      
      // 准备岗位分配数据
      const assignmentData: any = {
        employee_id: employee.id,
        period_id: periodId,
        created_at: new Date().toISOString()
      };
      
      // 处理Excel中的创建时间（如果有）
      const excelCreatedAt = row['创建时间'] || row['created_at'] || row['创建日期'];
      if (excelCreatedAt) {
        try {
          const parsedDate = new Date(excelCreatedAt);
          if (!isNaN(parsedDate.getTime())) {
            assignmentData.created_at = parsedDate.toISOString();
          }
        } catch {
          // 使用默认时间
        }
      }
      
      // 查找部门
      const departmentName = row['部门'] || row['department_name'];
      if (departmentName) {
        const department = departmentMap.get(departmentName);
        if (!department) {
          throw new Error(`第 ${i + 1} 行: 找不到部门 ${departmentName}`);
        }
        assignmentData.department_id = department.id;
      } else {
        throw new Error(`第 ${i + 1} 行: 缺少部门信息`);
      }
      
      // 查找职位
      const positionName = row['职位'] || row['position_name'];
      if (positionName) {
        const position = positionMap.get(positionName);
        if (!position) {
          throw new Error(`第 ${i + 1} 行: 找不到职位 ${positionName}`);
        }
        assignmentData.position_id = position.id;
      } else {
        throw new Error(`第 ${i + 1} 行: 缺少职位信息`);
      }
      
      // 查找职级（可选）
      const rankName = row['职级'] || row['rank_name'];
      if (rankName) {
        const rank = rankMap.get(rankName);
        if (rank) {
          assignmentData.rank_id = rank.id;
        }
      }
      
      toInsert.push(assignmentData);
      
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
          groupName: 'job_assignments',
          groupIndex: 0,
          sheetName: 'job_assignments',
          totalRecords: data.length,
          processedRecords: i + 1,
          successCount: i + 1 - errors.length,
          errorCount: errors.length
        },
        phase: 'importing' as const,
        message: `正在处理职务分配 ${i + 1}/${data.length}...`
      });
    }
  }
  
  // Step 3: 执行批量插入
  console.log('\n🚀 执行批量数据库操作...');
  console.log(`📊 待插入: ${toInsert.length} 条`);
  
  if (toInsert.length > 0) {
    const insertChunkSize = IMPORT_CONFIG.BATCH_SIZE;
    for (let i = 0; i < toInsert.length; i += insertChunkSize) {
      const chunk = toInsert.slice(i, i + insertChunkSize);
      console.log(`💾 插入第 ${Math.floor(i / insertChunkSize) + 1} 批，共 ${chunk.length} 条`);
      
      const { error: insertError } = await supabase
        .from('employee_job_history')
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
  
  console.log(`\n🎯 职务分配导入完成:`);
  console.log(`  - 成功: ${successCount} 条`);
  console.log(`  - 失败: ${failCount} 条`);
  console.log(`  - 插入: ${toInsert.length} 条`);
  
  return {
    success: errors.length === 0,
    totalRows: data.length,
    successCount,
    failedCount: failCount,
    errors,
    results
  };
};