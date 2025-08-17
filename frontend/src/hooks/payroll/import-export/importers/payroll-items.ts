import { supabase } from '@/lib/supabase';
import type { ExcelDataRow, SalaryComponentCategory, ImportProgress } from '../types';
import { IMPORT_CONFIG } from '../constants';

/**
 * 导入薪资项目明细数据（动态获取薪资组件）
 */
export const importPayrollItems = async (
  data: ExcelDataRow[],
  periodId: string,
  options?: {
    includeCategories?: SalaryComponentCategory[];  // 要导入的薪资组件类别，默认：['basic_salary', 'benefits', 'personal_tax']
  },
  onProgressUpdate?: (progress: Partial<ImportProgress>) => void,
  globalProgressRef?: { current: number }
) => {
  console.log('🚀 开始导入薪资项目明细数据');
  console.log(`📊 数据行数: ${data.length}`);
  console.log(`🔰 薪资周期ID: ${periodId}`);
  console.log('📋 配置选项:', options);
  
  const results: any[] = [];
  
  // 默认配置：导入所有收入项类别(basic_salary, benefits) + 个人所得税(personal_tax)
  const defaultCategories: SalaryComponentCategory[] = ['basic_salary', 'benefits', 'personal_tax'];
  const includeCategories = options?.includeCategories || defaultCategories;
  
  console.log('🎯 将导入的薪资组件类别:', includeCategories);
  
  // 获取指定类别的薪资组件
  console.log('🔍 查询薪资组件数据...');
  const { data: salaryComponents, error: componentsError } = await supabase
    .from('salary_components')
    .select('id, name, type, category')
    .in('category', includeCategories);
  
  if (componentsError) {
    console.error('❌ 获取薪资组件失败:', componentsError);
    throw new Error('无法获取薪资组件列表');
  }
  
  if (!salaryComponents || salaryComponents.length === 0) {
    console.error('❌ 未找到任何薪资组件');
    throw new Error('未找到符合条件的薪资组件');
  }
  
  console.log(`✅ 成功获取 ${salaryComponents.length} 个薪资组件`);
  
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
  }
  
  // 批量查询优化：预先获取所有需要的员工数据
  console.log('\n🚀 批量预加载数据优化...');
  const employeeNames = [...new Set(data.map(row => 
    row['员工姓名'] || row['employee_name']
  ).filter(Boolean))];
  
  console.log(`📊 需要查询的员工数量: ${employeeNames.length}`);
  const { data: allEmployees, error: employeesError } = await supabase
    .from('employees')
    .select('id, employee_name')
    .in('employee_name', employeeNames);
  
  if (employeesError) {
    console.error('❌ 批量查询员工失败:', employeesError);
    throw new Error(`批量查询员工失败: ${employeesError.message}`);
  }
  
  // 创建员工映射表（姓名 -> 员工信息）
  const employeeMap = new Map(
    (allEmployees || []).map(emp => [emp.employee_name, emp])
  );
  console.log(`✅ 成功预加载 ${employeeMap.size} 个员工数据`);
  
  // 检查是否有找不到的员工
  const missingEmployees = employeeNames.filter(name => !employeeMap.has(name));
  if (missingEmployees.length > 0) {
    console.warn('⚠️ 以下员工在数据库中不存在:', missingEmployees);
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
      for (const [columnName, value] of Object.entries(row)) {
        const component = componentMap.get(columnName);
        if (component && value !== null && value !== undefined && value !== '') {
          const amount = parseFloat(value as string);
          if (!isNaN(amount) && amount !== 0) {
            allPayrollItems.push({
              payroll_id: payrollId, // 临时ID，批量插入后会替换
              component_id: component.id,
              amount: amount,
              period_id: periodId, // payroll_items 表需要 period_id
              employee_id: employee.id // 添加员工ID，用于后续匹配
            });
          }
        }
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
  
  // Step 4: 批量插入新的薪资记录
  if (newPayrollsToInsert.length > 0) {
    console.log(`\n🚀 批量插入 ${newPayrollsToInsert.length} 条新薪资记录...`);
    
    const { data: insertedPayrolls, error: insertError } = await supabase
      .from('payrolls')
      .insert(newPayrollsToInsert)
      .select('id, employee_id');
    
    if (insertError) {
      console.error('❌ 批量插入薪资记录失败:', insertError);
      throw new Error(`批量插入薪资记录失败: ${insertError.message}`);
    }
    
    // 更新映射表，使用真实的payroll_id替换临时ID
    if (insertedPayrolls) {
      insertedPayrolls.forEach(payroll => {
        existingPayrollMap.set(payroll.employee_id, payroll.id);
      });
    }
    
    console.log(`✅ 成功插入 ${insertedPayrolls?.length || 0} 条薪资记录`);
  }
  
  // Step 5: 更新薪资项目中的payroll_id
  console.log(`\n🚀 处理 ${allPayrollItems.length} 个薪资项目...`);
  
  const validPayrollItems = allPayrollItems
    .filter(item => {
      const realPayrollId = existingPayrollMap.get(item.employee_id);
      if (realPayrollId && !realPayrollId.startsWith('temp_')) {
        item.payroll_id = realPayrollId;
        // 保留 period_id，删除临时的 employee_id
        delete (item as any).employee_id;
        return true;
      }
      return false;
    });
  
  console.log(`✅ 有效薪资项目数量: ${validPayrollItems.length}`);
  
  // Step 6: 批量插入薪资项目
  if (validPayrollItems.length > 0) {
    console.log('🚀 开始批量插入薪资项目...');
    
    // 分批插入，避免单次请求过大
    const batchSize = IMPORT_CONFIG.BATCH_SIZE;
    for (let i = 0; i < validPayrollItems.length; i += batchSize) {
      const batch = validPayrollItems.slice(i, i + batchSize);
      
      const { error: itemsError } = await supabase
        .from('payroll_items')
        .insert(batch);
      
      if (itemsError) {
        console.error(`❌ 批量插入薪资项目失败 (批次 ${i / batchSize + 1}):`, itemsError);
        // 继续处理下一批，而不是中断
        errors.push({
          row: -1,
          message: `批量插入薪资项目失败 (批次 ${i / batchSize + 1}): ${itemsError.message}`,
          error: itemsError.message
        });
      } else {
        console.log(`✅ 成功插入批次 ${i / batchSize + 1}/${Math.ceil(validPayrollItems.length / batchSize)}`);
      }
    }
  }
  
  console.log(`\n🎯 薪资项目导入完成:`);
  console.log(`  - 处理数据行数: ${data.length}`);
  console.log(`  - 成功创建薪资记录: ${newPayrollsToInsert.length}`);
  console.log(`  - 成功导入薪资项目: ${validPayrollItems.length}`);
  console.log(`  - 错误数量: ${errors.length}`);
  
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