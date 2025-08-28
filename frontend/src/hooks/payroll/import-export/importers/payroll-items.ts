import { supabase } from '@/lib/supabase';
import type { ExcelDataRow, SalaryComponentCategory, ImportProgress, ImportMode } from '../types';
import { IMPORT_CONFIG } from '../constants';
import { validateImportData } from '../utils/validation';
import { createImportLogger, formatDuration } from '../utils/import-logger';

/**
 * 导入薪资项目明细数据（动态获取薪资组件）
 */
export const importPayrollItems = async (
  data: ExcelDataRow[],
  periodId: string,
  mode: ImportMode = 'upsert',  // 添加导入模式参数，默认为upsert
  options?: {
    includeCategories?: SalaryComponentCategory[];  // 要导入的薪资组件类别，默认：['basic_salary', 'benefits', 'personal_tax', 'other_deductions']
  },
  onProgressUpdate?: (progress: Partial<ImportProgress>) => void,
  globalProgressRef?: { current: number }
) => {
  // 初始化导入日志记录器
  const logger = createImportLogger(periodId, 'payroll_items', data.length, {
    enableConsole: true,
    enableDatabase: false // 当前未启用数据库存储
  });
  
  logger.info('开始导入薪资项目明细数据', {
    operation: 'import_start',
    additionalData: { 
      dataRowCount: data.length, 
      mode, 
      includeCategories: options?.includeCategories 
    }
  });
  
  const results: any[] = [];
  const importStartTime = Date.now();
  
  // Step 0: 数据验证
  if (onProgressUpdate) {
    onProgressUpdate({
      phase: 'validating',
      message: '正在验证导入数据...'
    });
  }
  
  logger.info('开始数据验证', { operation: 'validation_start' });
  try {
    const validationConfig = {
      dataGroup: 'earnings' as const,
      mode: mode,
      payPeriod: {
        start: new Date(),
        end: new Date()
      },
      options: {
        validateBeforeImport: true,
        skipInvalidRows: false
      }
    };
    
    const validationResult = await validateImportData(data, validationConfig);
    
    // 记录验证结果
    logger.logValidationResult(
      validationResult.isValid,
      validationResult.errors.length,
      validationResult.warnings.length
    );
    
    if (!validationResult.isValid) {
      logger.error('数据验证失败，终止导入', undefined, {
        operation: 'validation_failed',
        additionalData: { 
          errorCount: validationResult.errors.length,
          errors: validationResult.errors 
        }
      });
      
      logger.completeSession('failed');
      return {
        success: false,
        totalRows: data.length,
        successCount: 0,
        failedCount: data.length,
        skippedCount: 0,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        results
      };
    }
    
    if (validationResult.warnings.length > 0) {
      logger.warn('数据验证发现警告', {
        operation: 'validation_warnings',
        additionalData: { warnings: validationResult.warnings }
      });
    }
    
  } catch (validationError) {
    logger.warn('数据验证异常，跳过验证步骤', {
      operation: 'validation_error',
      additionalData: { error: validationError }
    });
  }
  
  // 验证完成，开始导入阶段
  if (onProgressUpdate) {
    onProgressUpdate({
      phase: 'importing',
      message: '开始导入薪资数据...'
    });
  }
  
  // 默认配置：导入所有收入项类别(basic_salary, benefits) + 个人所得税(personal_tax) + 其他扣除项(other_deductions)
  const defaultCategories: SalaryComponentCategory[] = ['basic_salary', 'benefits', 'personal_tax', 'other_deductions'];
  const includeCategories = options?.includeCategories || defaultCategories;
  
  console.log('🎯 将导入的薪资组件类别:', includeCategories);
  
  // 获取指定类别的薪资组件
  logger.info('查询薪资组件数据', {
    operation: 'fetch_salary_components',
    additionalData: { includeCategories }
  });
  
  const { data: salaryComponents, error: componentsError } = await supabase
    .from('salary_components')
    .select('id, name, type, category')
    .in('category', includeCategories);
  
  if (componentsError) {
    logger.error('获取薪资组件失败', componentsError, {
      operation: 'fetch_salary_components_failed'
    });
    logger.completeSession('failed');
    throw new Error('无法获取薪资组件列表');
  }
  
  if (!salaryComponents || salaryComponents.length === 0) {
    logger.error('未找到任何薪资组件', undefined, {
      operation: 'no_salary_components',
      additionalData: { includeCategories }
    });
    logger.completeSession('failed');
    throw new Error('未找到符合条件的薪资组件');
  }
  
  logger.success(`成功获取薪资组件`, {
    operation: 'fetch_salary_components_success',
    additionalData: { componentCount: salaryComponents.length }
  });
  
  // 创建组件名称到ID的映射
  const componentMap = new Map(
    salaryComponents.map(comp => [comp.name, comp])
  );
  
  // 调试：打印获取到的组件
  console.log('💼 薪资组件映射表:');
  salaryComponents.forEach(comp => {
    console.log(`  - ${comp.name} (${comp.category}/${comp.type}) -> ${comp.id}`);
  });
  console.log('🔗 组件名称映射Keys:', Array.from(componentMap.keys()));
  
  // 分析Excel数据的列结构
  if (data.length > 0) {
    const sampleRow = data[0];
    console.log('📝 Excel数据列结构分析:');
    console.log('  可用列名:', Object.keys(sampleRow));
    console.log('  示例数据行:', sampleRow);
    
    // 检查哪些Excel列可以匹配到薪资组件
    const matchedColumns = [];
    const unmatchedColumns = [];
    
    for (const columnName of Object.keys(sampleRow)) {
      if (componentMap.has(columnName)) {
        matchedColumns.push(columnName);
      } else if (!['员工姓名', 'employee_name', '部门', '职位', 'rowNumber', '_sheetName'].includes(columnName)) {
        unmatchedColumns.push(columnName);
      }
    }
    
    console.log('✅ 匹配到的薪资组件列:', matchedColumns);
    console.log('⚠️ 未匹配的数据列:', unmatchedColumns);
    
    // 🔍 调试日志：分析所有行中个税字段的值分布
    const personalTaxValues = data.map(row => ({
      employee: row['员工姓名'] || row['employee_name'],
      value: row['个人所得税'],
      valueType: typeof row['个人所得税']
    })).filter(item => item.value !== undefined);
    
    console.log('🔍 [DEBUG] 个人所得税字段值分布:', personalTaxValues);
    
    // 统计0值的情况
    const zeroValues = personalTaxValues.filter(item => 
      item.value === 0 || item.value === '0' || item.value === ''
    );
    console.log('🔍 [DEBUG] 个税为0或空的记录:', zeroValues);
  }
  
  // 批量查询优化：预先获取所有需要的员工数据
  logger.info('开始批量预加载员工数据', { operation: 'employee_preload_start' });
  
  const employeeNames = [...new Set(data.map(row => 
    row['员工姓名'] || row['employee_name']
  ).filter(Boolean))];
  
  logger.info('解析员工姓名', {
    operation: 'employee_name_extraction',
    additionalData: { uniqueEmployeeCount: employeeNames.length }
  });
  
  const { data: allEmployees, error: employeesError } = await supabase
    .from('employees')
    .select('id, employee_name')
    .in('employee_name', employeeNames);
  
  if (employeesError) {
    logger.error('批量查询员工失败', employeesError, {
      operation: 'employee_batch_query_failed'
    });
    logger.completeSession('failed');
    throw new Error(`批量查询员工失败: ${employeesError.message}`);
  }
  
  // 创建员工映射表（姓名 -> 员工信息）
  const employeeMap = new Map(
    (allEmployees || []).map(emp => [emp.employee_name, emp])
  );
  
  // 检查是否有找不到的员工
  const missingEmployees = employeeNames.filter(name => !employeeMap.has(name));
  
  // 记录员工解析结果
  logger.logEmployeeResolution(
    employeeMap.size,
    missingEmployees.length,
    employeeNames.length
  );
  
  if (missingEmployees.length > 0) {
    logger.warn('发现缺失员工', {
      operation: 'missing_employees',
      additionalData: { missingEmployees }
    });
  }
  
  // 批量处理优化：先收集所有数据，然后批量插入
  console.log(`\n🚀 开始批量处理 ${data.length} 条数据...`);
  
  // Step 1: 获取薪资周期信息（只查询一次）
  console.log('🔍 查询薪资周期信息...');
  const { data: period, error: periodError } = await supabase
    .from('payroll_periods')
    .select('pay_date, period_year, period_month')
    .eq('id', periodId)
    .single();
  
  if (periodError) {
    console.error('❌ 查询薪资周期失败:', periodError);
    throw new Error(`查询薪资周期失败: ${periodError.message}`);
  }
  
  // 计算默认发薪日期
  let defaultPayDate: string;
  if (period?.pay_date) {
    defaultPayDate = period.pay_date;
  } else if (period?.period_year && period?.period_month) {
    const lastDay = new Date(period.period_year, period.period_month, 0).getDate();
    defaultPayDate = `${period.period_year}-${period.period_month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  } else {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    defaultPayDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  }
  console.log(`📅 默认发薪日期: ${defaultPayDate}`);
  
  // Step 2: 批量查询现有薪资记录
  console.log('🔍 批量查询现有薪资记录...');
  const employeeIds = [...employeeMap.values()].map(e => e.id);
  const { data: existingPayrolls } = await supabase
    .from('payrolls')
    .select('id, employee_id')
    .eq('period_id', periodId)
    .in('employee_id', employeeIds);
  
  const existingPayrollMap = new Map(
    (existingPayrolls || []).map(p => [p.employee_id, p.id])
  );
  console.log(`✅ 找到 ${existingPayrollMap.size} 条现有薪资记录`);
  
  // Step 3: 准备批量数据
  const newPayrollsToInsert = [];
  const allPayrollItems = [];
  const errors: any[] = [];
  
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    
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
          groupName: 'payroll_items',
          groupIndex: 0,
          sheetName: 'payroll_items',
          totalRecords: data.length,
          processedRecords: rowIndex + 1,
          successCount: rowIndex + 1 - errors.length,
          errorCount: errors.length
        },
        phase: 'importing' as const,
        message: `正在处理第 ${rowIndex + 1}/${data.length} 条记录...`
      });
    }
    
    try {
      // 从映射表中查找员工
      const employeeName = row['员工姓名'] || row['employee_name'];
      const employee = employeeMap.get(employeeName);
      
      if (!employee) {
        errors.push({
          row: rowIndex + 1,
          message: `找不到员工: ${employeeName}`,
          error: `找不到员工: ${employeeName}` // 保持向后兼容
        });
        continue;
      }
      
      // 检查是否需要创建新的薪资记录
      let payrollId = existingPayrollMap.get(employee.id);
      
      if (!payrollId) {
        // 需要创建新记录，先收集起来
        const payrollData = {
          period_id: periodId,
          employee_id: employee.id,
          pay_date: defaultPayDate,
          gross_pay: 0,  // 修正字段名：total_earnings -> gross_pay
          total_deductions: 0,
          net_pay: 0,
          status: 'draft' as const
        };
        
        newPayrollsToInsert.push(payrollData);
        
        // 为后续薪资项目准备payroll_id（批量插入后会更新）
        payrollId = `temp_${employee.id}`;
        existingPayrollMap.set(employee.id, payrollId);
      }
      
      // 处理薪资项目
      let processedItemsInRow = 0;
      let skippedItemsInRow = 0;
      
      for (const [columnName, value] of Object.entries(row)) {
        const component = componentMap.get(columnName);
        // 修复过滤逻辑：允许数字0通过，但过滤掉真正的空值
        const shouldProcessValue = component && value !== null && value !== undefined && 
          (value !== '' || value === 0 || value === '0');
        
        // 🔍 调试日志：详细记录每个字段的处理情况
        if (component) {
          const valueDetails = {
            columnName,
            value,
            valueType: typeof value,
            hasComponent: !!component,
            shouldProcess: shouldProcessValue,
            checks: {
              isNull: value === null,
              isUndefined: value === undefined,
              isEmpty: value === '',
              isZero: value === 0,
              isZeroString: value === '0'
            }
          };
          
          // 重点关注个人所得税字段
          if (columnName === '个人所得税' || employeeName === '张磊') {
            console.log(`🔍 [DEBUG] 字段处理详情 - ${employeeName}.${columnName}:`, valueDetails);
          }
          
          if (!shouldProcessValue) {
            skippedItemsInRow++;
            if (columnName === '个人所得税' && value === 0) {
              console.log(`⚠️ [DEBUG] 个税0值被跳过:`, valueDetails);
            }
          }
        }
        
        if (shouldProcessValue) {
          const amount = parseFloat(value as string);
          
          // 🔍 调试日志：特别关注张磊的个税记录
          if (employeeName === '张磊' && columnName === '个人所得税') {
            console.log(`🔍 [DEBUG] 处理张磊个税记录:`, {
              employeeName,
              columnName,
              originalValue: value,
              parsedAmount: amount,
              isValidNumber: !isNaN(amount),
              componentId: component.id,
              componentName: component.name,
              payrollId,
              rowIndex: rowIndex + 1
            });
          }
          
          if (!isNaN(amount)) {  // 移除 amount !== 0 条件，允许导入金额为0的记录
            const payrollItemData = {
              payroll_id: payrollId, // 临时ID，批量插入后会替换
              component_id: component.id,
              amount: amount,  // 包括金额为0的记录
              period_id: periodId, // payroll_items 表需要 period_id
              employee_id: employee.id // 添加员工ID，用于后续匹配
            };
            
            allPayrollItems.push(payrollItemData);
            processedItemsInRow++;
            
            // 🔍 调试日志：记录添加到批量数据中
            if (employeeName === '张磊' && columnName === '个人所得税') {
              console.log(`✅ [DEBUG] 张磊个税记录已添加到批量数据:`, payrollItemData);
            }
          } else {
            // 🔍 调试日志：记录无效数字的情况
            if (employeeName === '张磊' && columnName === '个人所得税') {
              console.log(`❌ [DEBUG] 张磊个税记录数值无效:`, {
                employeeName,
                columnName,
                originalValue: value,
                parsedAmount: amount,
                reason: 'isNaN(amount) = true'
              });
            }
          }
        } else {
          // 🔍 调试日志：记录未处理的情况
          if (employeeName === '张磊' && columnName === '个人所得税') {
            console.log(`⚠️ [DEBUG] 张磊个税记录未处理:`, {
              employeeName,
              columnName,
              value,
              hasComponent: !!component,
              componentDetails: component,
              valueCheck: {
                isNull: value === null,
                isUndefined: value === undefined,
                isEmpty: value === ''
              }
            });
          }
        }
      }
      
      // 🔍 调试日志：行级汇总统计
      if (processedItemsInRow > 0 || skippedItemsInRow > 0) {
        console.log(`🔍 [DEBUG] 行 ${rowIndex + 1} (${employeeName}) 处理汇总:`, {
          processedItems: processedItemsInRow,
          skippedItems: skippedItemsInRow,
          totalColumns: Object.keys(row).length,
          componentColumns: Object.keys(row).filter(col => componentMap.has(col)).length
        });
      }
      
    } catch (error) {
      console.error(`❌ 处理第 ${rowIndex + 1} 行数据时发生错误:`, error);
      errors.push({
        row: rowIndex + 1,
        message: `处理数据时发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
        error: `处理数据时发生错误: ${error instanceof Error ? error.message : '未知错误'}`
      });
    }
  }
  
  // Step 4: 批量UPSERT新的薪资记录（防止重复）
  if (newPayrollsToInsert.length > 0) {
    logger.logBatchStart('payroll_upsert', newPayrollsToInsert.length, 1);
    const batchStartTime = Date.now();
    
    const { data: insertedPayrolls, error: insertError } = await supabase
      .from('payrolls')
      .upsert(newPayrollsToInsert, {
        onConflict: 'employee_id,period_id',
        ignoreDuplicates: false
      })
      .select('id, employee_id');
    
    if (insertError) {
      logger.error('批量UPSERT薪资记录失败', insertError, {
        operation: 'payroll_upsert_failed',
        additionalData: { batchSize: newPayrollsToInsert.length }
      });
      logger.completeSession('failed');
      throw new Error(`批量UPSERT薪资记录失败: ${insertError.message}`);
    }
    
    // 更新映射表，使用真实的payroll_id替换临时ID
    if (insertedPayrolls) {
      insertedPayrolls.forEach(payroll => {
        existingPayrollMap.set(payroll.employee_id, payroll.id);
      });
    }
    
    const batchDuration = Date.now() - batchStartTime;
    logger.logBatchComplete(
      'payroll_upsert',
      1,
      insertedPayrolls?.length || 0,
      0,
      batchDuration
    );
  }
  
  // Step 5: 更新薪资项目中的payroll_id
  console.log(`\n🚀 处理 ${allPayrollItems.length} 个薪资项目...`);
  
  // 🔍 调试日志：查找张磊的记录
  const zhangLeiItems = allPayrollItems.filter(item => {
    const employee = [...employeeMap.values()].find(e => e.id === item.employee_id);
    return employee?.employee_name === '张磊';
  });
  
  if (zhangLeiItems.length > 0) {
    console.log(`🔍 [DEBUG] 找到张磊的薪资项目 ${zhangLeiItems.length} 条:`, zhangLeiItems.map(item => ({
      component_id: item.component_id,
      amount: item.amount,
      payroll_id: item.payroll_id,
      employee_id: item.employee_id
    })));
  }
  
  // 🔍 调试日志：分析过滤前的薪资项目分布
  console.log(`🔍 [DEBUG] 过滤前薪资项目分析:`, {
    totalItems: allPayrollItems.length,
    employeeDistribution: [...new Set(allPayrollItems.map(item => {
      const emp = [...employeeMap.values()].find(e => e.id === item.employee_id);
      return emp?.employee_name || 'Unknown';
    }))],
    componentDistribution: [...new Set(allPayrollItems.map(item => item.component_id))].length,
    amountDistribution: {
      zeroAmounts: allPayrollItems.filter(item => item.amount === 0).length,
      nonZeroAmounts: allPayrollItems.filter(item => item.amount !== 0).length
    }
  });

  let filteredCount = 0;
  let validCount = 0;

  const validPayrollItems = allPayrollItems
    .filter(item => {
      const realPayrollId = existingPayrollMap.get(item.employee_id);
      const employee = [...employeeMap.values()].find(e => e.id === item.employee_id);
      const isValid = realPayrollId && !realPayrollId.startsWith('temp_');
      
      // 🔍 调试日志：详细记录每个项目的过滤过程
      const filterDetails = {
        employeeName: employee?.employee_name || 'Unknown',
        employee_id: item.employee_id,
        component_id: item.component_id,
        amount: item.amount,
        tempPayrollId: item.payroll_id,
        realPayrollId: realPayrollId,
        isValid,
        filterReason: !realPayrollId ? 'NO_REAL_PAYROLL_ID' : 
                     realPayrollId.startsWith('temp_') ? 'TEMP_PAYROLL_ID' : 'VALID'
      };
      
      // 重点关注张磊和个税记录
      if (employee?.employee_name === '张磊' || item.component_id === '7a425704-eb54-406a-80e6-eb74ad3929f0') {
        console.log(`🔍 [DEBUG] 重要记录过滤详情:`, filterDetails);
      }
      
      if (isValid) {
        validCount++;
        item.payroll_id = realPayrollId;
        // 保留 period_id，删除临时的 employee_id
        delete (item as any).employee_id;
        return true;
      } else {
        filteredCount++;
        // 记录被过滤的个税为0的记录
        if (item.amount === 0) {
          console.log(`⚠️ [DEBUG] 金额为0的记录被过滤:`, filterDetails);
        }
        return false;
      }
    });
  
  console.log(`🔍 [DEBUG] 过滤结果统计:`, {
    原始项目数: allPayrollItems.length,
    有效项目数: validCount,
    被过滤项目数: filteredCount,
    过滤率: `${(filteredCount / allPayrollItems.length * 100).toFixed(1)}%`
  });
  
  console.log(`✅ 有效薪资项目数量: ${validPayrollItems.length}`);
  
  // 🔍 调试日志：检查张磊的有效记录
  const validZhangLeiItems = validPayrollItems.filter(item => {
    // 通过component_id匹配个税组件
    return item.component_id === '7a425704-eb54-406a-80e6-eb74ad3929f0'; // 个人所得税组件ID
  });
  
  if (validZhangLeiItems.length > 0) {
    console.log(`🔍 [DEBUG] 张磊的有效个税记录:`, validZhangLeiItems);
  }
  
  // Step 6: 根据导入模式处理薪资项目
  if (validPayrollItems.length > 0) {
    console.log(`🚀 开始批量处理薪资项目 (${mode}模式)...`);
    
    if (mode === 'replace') {
      // REPLACE模式：先删除该周期的现有数据，再插入新数据
      console.log('🗑️ REPLACE模式：删除该周期的现有薪资项目数据...');
      
      // 获取所有要处理的薪资记录ID
      const payrollIds = [...new Set(validPayrollItems.map(item => item.payroll_id))];
      
      const { error: deleteError } = await supabase
        .from('payroll_items')
        .delete()
        .eq('period_id', periodId)
        .in('payroll_id', payrollIds);
      
      if (deleteError) {
        console.error('❌ 删除现有薪资项目失败:', deleteError);
        throw new Error(`删除现有薪资项目失败: ${deleteError.message}`);
      }
      
      console.log(`✅ 成功删除 ${payrollIds.length} 个薪资记录的现有数据`);
    }
    
    // 分批处理，避免单次请求过大
    const batchSize = IMPORT_CONFIG.BATCH_SIZE;
    for (let i = 0; i < validPayrollItems.length; i += batchSize) {
      const batch = validPayrollItems.slice(i, i + batchSize);
      
      let itemsError;
      
      if (mode === 'upsert') {
        // UPSERT模式：使用upsert方法，遇到冲突时更新
        console.log(`🔄 UPSERT批次 ${i / batchSize + 1}: 更新或插入 ${batch.length} 条记录`);
        
        // 🔍 调试日志：检查当前批次中是否包含张磊的个税记录
        const zhangLeiPersonalTaxInBatch = batch.filter(item => 
          item.component_id === '7a425704-eb54-406a-80e6-eb74ad3929f0'
        );
        
        if (zhangLeiPersonalTaxInBatch.length > 0) {
          console.log(`🔍 [DEBUG] UPSERT批次 ${i / batchSize + 1} 包含张磊个税记录:`, zhangLeiPersonalTaxInBatch);
          console.log(`🔍 [DEBUG] UPSERT操作详情:`, {
            tableName: 'payroll_items',
            onConflict: 'payroll_id,component_id',
            batchSize: batch.length,
            zhangLeiItemCount: zhangLeiPersonalTaxInBatch.length
          });
        }
        
        const { error } = await supabase
          .from('payroll_items')
          .upsert(batch, {
            onConflict: 'payroll_id,component_id'
          });
        itemsError = error;
        
        // 🔍 调试日志：记录UPSERT操作结果
        if (zhangLeiPersonalTaxInBatch.length > 0) {
          if (itemsError) {
            console.log(`❌ [DEBUG] 张磊个税记录UPSERT失败:`, {
              error: itemsError,
              batchData: zhangLeiPersonalTaxInBatch
            });
          } else {
            console.log(`✅ [DEBUG] 张磊个税记录UPSERT成功`, zhangLeiPersonalTaxInBatch);
          }
        }
      } else {
        // REPLACE模式：纯插入（因为已经删除了冲突数据）
        console.log(`➕ INSERT批次 ${i / batchSize + 1}: 插入 ${batch.length} 条记录`);
        const { error } = await supabase
          .from('payroll_items')
          .insert(batch);
        itemsError = error;
      }
      
      if (itemsError) {
        console.error(`❌ 批量处理薪资项目失败 (批次 ${i / batchSize + 1}):`, itemsError);
        // 继续处理下一批，而不是中断
        errors.push({
          row: -1,
          message: `批量${mode === 'upsert' ? 'UPSERT' : 'INSERT'}薪资项目失败 (批次 ${i / batchSize + 1}): ${itemsError.message}`,
          error: itemsError.message
        });
      } else {
        console.log(`✅ 成功处理批次 ${i / batchSize + 1}/${Math.ceil(validPayrollItems.length / batchSize)} (${mode}模式)`);
      }
    }
  }
  
  const importDuration = Date.now() - importStartTime;
  const successCount = data.length - errors.length;
  
  // 更新会话统计
  logger.updateStats(successCount, errors.length);
  
  // 记录导入完成
  logger.success('薪资项目导入完成', {
    operation: 'import_complete',
    duration: importDuration,
    additionalData: {
      totalRows: data.length,
      newPayrollRecords: newPayrollsToInsert.length,
      payrollItems: validPayrollItems.length,
      successCount,
      errorCount: errors.length,
      totalDuration: formatDuration(importDuration)
    }
  });
  
  // 完成导入会话
  const sessionStatus = errors.length === 0 ? 'completed' : 'failed';
  logger.completeSession(sessionStatus);
  
  // 输出会话摘要
  const sessionSummary = logger.getSessionSummary();
  console.log('📊 导入会话摘要:', sessionSummary);
  
  return {
    success: errors.length === 0,
    totalRows: data.length,
    successCount: data.length - errors.length,
    failedCount: errors.length,
    skippedCount: 0, // 当前实现中没有跳过的记录
    errors,
    warnings: [], // 当前实现中没有警告
    results
  };
};