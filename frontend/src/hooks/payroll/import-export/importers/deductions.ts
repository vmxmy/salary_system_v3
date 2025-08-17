import { supabase } from '@/lib/supabase';
import type { ExcelDataRow, ImportProgress } from '../types';

/**
 * 导入扣除项数据
 */
export const importDeductions = async (
  data: ExcelDataRow[],
  periodId: string,
  onProgressUpdate?: (progress: Partial<ImportProgress>) => void,
  globalProgressRef?: { current: number }
) => {
  console.log('💰 开始导入扣除项数据');
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
  
  // 批量预加载薪资记录
  const employeeIds = [...employeeMap.values()].map(e => e.id);
  const { data: existingPayrolls } = await supabase
    .from('payrolls')
    .select('id, employee_id')
    .eq('period_id', periodId)
    .in('employee_id', employeeIds);
  
  const payrollMap = new Map((existingPayrolls || []).map(p => [p.employee_id, p.id]));
  console.log(`✅ 预加载 ${payrollMap.size} 个薪资记录`);
  
  // 预加载薪资组件
  const deductionComponents = [
    '养老保险个人应缴费额',
    '医疗保险个人应缴费额', 
    '失业保险个人应缴费额',
    '工伤保险个人应缴费额',
    '生育保险个人应缴费额',
    '住房公积金个人应缴费额',
    '个人所得税'
  ];
  
  const { data: allComponents } = await supabase
    .from('salary_components')
    .select('id, name')
    .in('name', deductionComponents);
  
  const componentMap = new Map((allComponents || []).map(comp => [comp.name, comp.id]));
  console.log(`✅ 预加载 ${componentMap.size} 个薪资组件`);
  
  // 获取薪资周期信息（只查询一次）
  const { data: period } = await supabase
    .from('payroll_periods')
    .select('pay_date, period_year, period_month')
    .eq('id', periodId)
    .single();
  
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
  
  const newPayrollsToInsert = [];
  const allDeductionItems = [];
  
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
      
      // 查找或准备创建薪资记录
      let payrollId = payrollMap.get(employee.id);
      
      if (!payrollId) {
        // 准备创建新的薪资记录
        const payrollData = {
          employee_id: employee.id,
          period_id: periodId,
          pay_date: defaultPayDate,
          total_earnings: 0,
          total_deductions: 0,
          net_pay: 0,
          status: 'draft' as const
        };
        
        newPayrollsToInsert.push(payrollData);
        
        // 临时标记，批量插入后会更新
        payrollId = `temp_${employee.id}`;
        payrollMap.set(employee.id, payrollId);
      }
      
      // 准备扣除项数据
      const deductionFields = [
        { field: '养老保险', componentName: '养老保险个人应缴费额' },
        { field: '医疗保险', componentName: '医疗保险个人应缴费额' },
        { field: '失业保险', componentName: '失业保险个人应缴费额' },
        { field: '工伤保险', componentName: '工伤保险个人应缴费额' },
        { field: '生育保险', componentName: '生育保险个人应缴费额' },
        { field: '住房公积金', componentName: '住房公积金个人应缴费额' },
        { field: '个人所得税', componentName: '个人所得税' }
      ];
      
      for (const { field, componentName } of deductionFields) {
        const amount = row[field];
        if (amount && Number(amount) > 0) {
          const componentId = componentMap.get(componentName);
          
          if (componentId) {
            allDeductionItems.push({
              payroll_id: payrollId, // 临时ID，批量插入后会替换
              component_id: componentId,
              component_name: componentName,
              amount: Number(amount),
              calculated_amount: Number(amount),
              employee_id: employee.id // 添加员工ID，用于后续匹配
            });
          } else {
            console.warn(`未找到薪资组件: ${componentName}`);
          }
        }
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
          groupName: 'deductions',
          groupIndex: 0,
          sheetName: 'deductions',
          totalRecords: data.length,
          processedRecords: i + 1,
          successCount: i + 1 - errors.length,
          errorCount: errors.length
        },
        phase: 'importing' as const,
        message: `正在处理扣除项 ${i + 1}/${data.length}...`
      });
    }
  }
  
  // 批量插入新的薪资记录
  if (newPayrollsToInsert.length > 0) {
    console.log(`🚀 批量插入 ${newPayrollsToInsert.length} 条新薪资记录...`);
    
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
        payrollMap.set(payroll.employee_id, payroll.id);
      });
    }
    
    console.log(`✅ 成功插入 ${insertedPayrolls?.length || 0} 条薪资记录`);
  }
  
  // 更新扣除项中的payroll_id
  const validDeductionItems = allDeductionItems
    .filter(item => {
      const realPayrollId = payrollMap.get(item.employee_id);
      if (realPayrollId && !realPayrollId.toString().startsWith('temp_')) {
        item.payroll_id = realPayrollId;
        delete (item as any).employee_id; // 删除临时字段
        return true;
      }
      return false;
    });
  
  // 批量插入扣除项
  if (validDeductionItems.length > 0) {
    console.log(`🚀 批量插入 ${validDeductionItems.length} 个扣除项...`);
    
    const { error: itemsError } = await supabase
      .from('payroll_items')
      .insert(validDeductionItems);
    
    if (itemsError) {
      console.error('❌ 批量插入扣除项失败:', itemsError);
      // 不抛出错误，记录为警告
      errors.push({
        row: -1,
        message: `批量插入扣除项失败: ${itemsError.message}`
      });
    }
  }
  
  // 统计结果
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`\n🎯 扣除项导入完成:`);
  console.log(`  - 成功: ${successCount} 条`);
  console.log(`  - 失败: ${failCount} 条`);
  console.log(`  - 新建薪资记录: ${newPayrollsToInsert.length} 条`);
  console.log(`  - 导入扣除项: ${validDeductionItems.length} 个`);
  
  return {
    success: errors.length === 0,
    totalRows: data.length,
    successCount,
    failedCount: failCount,
    errors,
    results
  };
};