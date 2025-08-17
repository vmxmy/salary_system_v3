/**
 * 优化的批量导入示例
 * 展示如何使用 Supabase 批量插入 API 提升性能
 */

import { supabase } from '@/lib/supabase';

// ============ 批量插入最佳实践 ============

/**
 * 1. 基础批量插入
 */
export async function batchInsertPayrollItems(items: any[]) {
  // ✅ 好：一次性插入所有数据
  const { data, error } = await supabase
    .from('payroll_items')
    .insert(items);
  
  if (error) {
    console.error('批量插入失败:', error);
    throw error;
  }
  
  return data;
}

/**
 * 2. 分批插入（处理大量数据）
 * Supabase 单次插入建议不超过 1000 条
 */
export async function batchInsertWithChunks(
  items: any[],
  chunkSize: number = 500
) {
  const results = [];
  
  // 将数据分成多个批次
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    
    console.log(`插入第 ${i / chunkSize + 1} 批，共 ${chunk.length} 条`);
    
    const { data, error } = await supabase
      .from('payroll_items')
      .insert(chunk)
      .select(); // 可选：返回插入的数据
    
    if (error) {
      console.error(`第 ${i / chunkSize + 1} 批插入失败:`, error);
      // 可以选择继续或中断
      continue;
    }
    
    results.push(...(data || []));
  }
  
  return results;
}

/**
 * 3. 批量 Upsert（插入或更新）
 * 如果记录存在则更新，不存在则插入
 */
export async function batchUpsertPayrollItems(items: any[]) {
  const { data, error } = await supabase
    .from('payroll_items')
    .upsert(items, {
      onConflict: 'payroll_id,component_id', // 指定唯一键
      ignoreDuplicates: false, // false = 更新已存在的记录
    });
  
  if (error) {
    console.error('批量 upsert 失败:', error);
    throw error;
  }
  
  return data;
}

/**
 * 4. 事务性批量操作（使用 RPC）
 * 对于需要原子性的操作，可以创建存储过程
 */
export async function transactionalBatchInsert(
  payrollData: any[],
  itemsData: any[]
) {
  // 调用预定义的存储过程
  const { data, error } = await supabase.rpc('batch_insert_payroll', {
    p_payrolls: payrollData,
    p_items: itemsData
  });
  
  if (error) {
    console.error('事务批量插入失败:', error);
    throw error;
  }
  
  return data;
}

/**
 * 5. 优化的薪资导入实现
 */
export async function optimizedPayrollImport(
  excelData: any[],
  periodId: string
) {
  console.log('🚀 开始优化批量导入...');
  
  // Step 1: 批量预加载所有需要的数据
  const employeeNames = [...new Set(excelData.map(row => row.employee_name))];
  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_name')
    .in('employee_name', employeeNames);
  
  const employeeMap = new Map(
    employees?.map(e => [e.employee_name, e.id]) || []
  );
  
  // Step 2: 准备批量数据
  const payrollBatch = [];
  const itemsBatch = [];
  
  for (const row of excelData) {
    const employeeId = employeeMap.get(row.employee_name);
    if (!employeeId) continue;
    
    // 准备薪资主记录
    payrollBatch.push({
      employee_id: employeeId,
      period_id: periodId,
      pay_date: row.pay_date,
      status: 'draft'
    });
    
    // 准备薪资项目（假设已经映射好）
    Object.entries(row).forEach(([key, value]) => {
      if (key.startsWith('component_')) {
        itemsBatch.push({
          payroll_id: null, // 需要后续关联
          component_id: key.replace('component_', ''),
          amount: value,
          period_id: periodId
        });
      }
    });
  }
  
  // Step 3: 批量插入
  console.log(`📦 批量插入 ${payrollBatch.length} 条薪资记录`);
  const { data: payrolls, error: payrollError } = await supabase
    .from('payrolls')
    .insert(payrollBatch)
    .select();
  
  if (payrollError) {
    throw payrollError;
  }
  
  // Step 4: 关联并批量插入薪资项
  // ... 关联 payroll_id 后批量插入 items
  
  console.log('✅ 批量导入完成');
  return { payrolls, items: itemsBatch };
}

/**
 * 6. 并行批量操作
 */
export async function parallelBatchInsert(
  tables: Array<{ table: string; data: any[] }>
) {
  // 并行插入多个表
  const promises = tables.map(({ table, data }) => 
    supabase.from(table).insert(data)
  );
  
  const results = await Promise.allSettled(promises);
  
  // 处理结果
  return results.map((result, index) => ({
    table: tables[index].table,
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value.data : null,
    error: result.status === 'rejected' ? result.reason : null
  }));
}

/**
 * 7. 带进度回调的批量插入
 */
export async function batchInsertWithProgress(
  items: any[],
  options: {
    chunkSize?: number;
    onProgress?: (current: number, total: number) => void;
    table: string;
  }
) {
  const { chunkSize = 100, onProgress, table } = options;
  const total = items.length;
  let processed = 0;
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    
    const { error } = await supabase
      .from(table)
      .insert(chunk);
    
    if (error) {
      console.error(`批次 ${i / chunkSize + 1} 失败:`, error);
      // 可以选择继续或抛出错误
    }
    
    processed += chunk.length;
    onProgress?.(processed, total);
  }
  
  return { processed, total };
}

// ============ 性能优化技巧 ============

/**
 * 性能优化建议：
 * 
 * 1. 批量大小：
 *    - 小批量（< 100）：直接插入
 *    - 中批量（100-1000）：单次批量插入
 *    - 大批量（> 1000）：分批插入
 * 
 * 2. 错误处理：
 *    - 使用 upsert 避免重复键错误
 *    - 分批插入时记录失败批次
 *    - 提供重试机制
 * 
 * 3. 内存优化：
 *    - 对超大数据集使用流式处理
 *    - 及时释放不需要的引用
 * 
 * 4. 并发控制：
 *    - 使用 Promise.all 并行处理独立操作
 *    - 控制并发数量避免过载
 * 
 * 5. 数据验证：
 *    - 批量插入前验证数据完整性
 *    - 使用数据库约束保证一致性
 */

// ============ 实际应用示例 ============

/**
 * 在你的薪资导入中应用批量插入
 */
export async function improvedPayrollImport(
  excelData: any[],
  periodId: string
) {
  try {
    // 1. 数据验证和预处理
    const validatedData = validateExcelData(excelData);
    
    // 2. 批量查询参考数据
    const referenceData = await batchLoadReferenceData(validatedData);
    
    // 3. 转换为数据库格式
    const { payrolls, items } = transformToDbFormat(
      validatedData,
      referenceData,
      periodId
    );
    
    // 4. 批量插入薪资主记录
    const insertedPayrolls = await batchInsertWithChunks(payrolls, 500);
    
    // 5. 关联 payroll_id 到 items
    const itemsWithPayrollId = mapItemsToPayrolls(items, insertedPayrolls);
    
    // 6. 批量插入薪资项
    await batchInsertWithChunks(itemsWithPayrollId, 1000);
    
    return {
      success: true,
      imported: insertedPayrolls.length,
      message: `成功导入 ${insertedPayrolls.length} 条薪资记录`
    };
    
  } catch (error) {
    console.error('导入失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 辅助函数
function validateExcelData(data: any[]) {
  // 验证逻辑
  return data;
}

async function batchLoadReferenceData(data: any[]) {
  // 批量加载员工、部门等参考数据
  return {};
}

function transformToDbFormat(data: any[], refs: any, periodId: string) {
  // 转换数据格式
  return { payrolls: [], items: [] };
}

function mapItemsToPayrolls(items: any[], payrolls: any[]) {
  // 关联薪资项到薪资主记录
  return items;
}