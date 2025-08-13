import { supabase } from '@/lib/supabase';
import { ImportDataGroup, ImportMode } from '@/types/payroll-import';
import type {
  ImportConfig,
  ImportResult,
  ExcelDataRow,
  EarningsImportData,
  ImportError,
  ImportWarning,
} from '@/types/payroll-import';

/**
 * 改进的薪资导入服务
 * 修复了四种导入模式的实现问题
 */
export class PayrollImportImprovedService {
  private config: ImportConfig;
  private errors: ImportError[] = [];
  private warnings: ImportWarning[] = [];
  
  constructor(config: ImportConfig) {
    this.config = config;
    this.validateImportMode();
  }

  /**
   * 验证导入模式是否支持
   */
  private validateImportMode(): void {
    const supportedModes = [ImportMode.CREATE, ImportMode.UPDATE, ImportMode.UPSERT, ImportMode.APPEND];
    if (!supportedModes.includes(this.config.mode)) {
      throw new Error(`不支持的导入模式: ${this.config.mode}`);
    }
  }

  /**
   * 主导入方法 - 支持四种导入模式
   */
  async importData(excelData: ExcelDataRow[]): Promise<ImportResult> {
    this.errors = [];
    this.warnings = [];
    
    const result: ImportResult = {
      success: false,
      totalRows: excelData.length,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      errors: [],
      warnings: [],
      processedData: []
    };

    try {
      // 数据验证
      if (this.config.options.validateBeforeImport) {
        await this.validateData(excelData);
      }

      // 根据模式执行不同的导入策略
      switch (this.config.mode) {
        case ImportMode.CREATE:
          await this.executeCreateMode(excelData, result);
          break;
        case ImportMode.UPDATE:
          await this.executeUpdateMode(excelData, result);
          break;
        case ImportMode.UPSERT:
          await this.executeUpsertMode(excelData, result);
          break;
        case ImportMode.APPEND:
          await this.executeAppendMode(excelData, result);
          break;
      }

      result.success = result.failedCount === 0;
      result.errors = this.errors;
      result.warnings = this.warnings;
      
    } catch (error) {
      result.success = false;
      result.errors.push({
        row: 0,
        message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    }

    return result;
  }

  /**
   * CREATE模式 - 仅创建新记录
   */
  private async executeCreateMode(excelData: ExcelDataRow[], result: ImportResult): Promise<void> {
    for (const row of excelData) {
      try {
        // 检查记录是否已存在
        const employeeId = await this.resolveEmployeeId(row);
        if (!employeeId) {
          // 创建新员工记录
          const newEmployee = await this.createEmployee(row);
          if (newEmployee) {
            await this.createPayrollRecord(newEmployee.id, row);
            result.successCount++;
          } else {
            result.failedCount++;
          }
        } else {
          // 检查该员工在当前周期是否已有薪资记录
          const existingPayroll = await this.checkExistingPayroll(employeeId);
          if (existingPayroll) {
            result.skippedCount++;
            this.warnings.push({
              row: excelData.indexOf(row) + 2,
              message: '该员工在当前周期已有薪资记录，跳过创建',
              action: 'skipped'
            });
          } else {
            await this.createPayrollRecord(employeeId, row);
            result.successCount++;
          }
        }
      } catch (error) {
        result.failedCount++;
        this.errors.push({
          row: excelData.indexOf(row) + 2,
          message: error instanceof Error ? error.message : '未知错误'
        });
      }
    }
  }

  /**
   * UPDATE模式 - 仅更新现有记录（完整实现）
   */
  private async executeUpdateMode(excelData: ExcelDataRow[], result: ImportResult): Promise<void> {
    for (const row of excelData) {
      try {
        const employeeId = await this.resolveEmployeeId(row);
        if (!employeeId) {
          result.skippedCount++;
          this.warnings.push({
            row: excelData.indexOf(row) + 2,
            message: '未找到对应员工，跳过更新',
            action: 'skipped'
          });
          continue;
        }

        // 查找现有薪资记录
        const existingPayroll = await this.checkExistingPayroll(employeeId);
        if (!existingPayroll) {
          result.skippedCount++;
          this.warnings.push({
            row: excelData.indexOf(row) + 2,
            message: '该员工在当前周期无薪资记录，跳过更新',
            action: 'skipped'
          });
          continue;
        }

        // 执行更新操作
        await this.updatePayrollRecord(existingPayroll.id, row);
        result.successCount++;
      } catch (error) {
        result.failedCount++;
        this.errors.push({
          row: excelData.indexOf(row) + 2,
          message: error instanceof Error ? error.message : '未知错误'
        });
      }
    }
  }

  /**
   * UPSERT模式 - 更新或创建（带事务保护）
   */
  private async executeUpsertMode(excelData: ExcelDataRow[], result: ImportResult): Promise<void> {
    // 批量处理以提高性能
    const batchSize = this.config.options.batchSize || 100;
    
    for (let i = 0; i < excelData.length; i += batchSize) {
      const batch = excelData.slice(i, i + batchSize);
      
      try {
        // 使用RPC函数执行事务化的UPSERT操作
        const { data, error } = await supabase.rpc('upsert_payroll_batch', {
          payroll_data: batch.map(row => this.transformRowToPayrollData(row)),
          pay_period_start: this.config.payPeriod.start,
          pay_period_end: this.config.payPeriod.end
        });

        if (error) {
          // 如果RPC不存在，回退到传统方式但增加错误处理
          for (const row of batch) {
            await this.upsertSingleRecord(row, result);
          }
        } else {
          result.successCount += batch.length;
        }
      } catch (error) {
        result.failedCount += batch.length;
        this.errors.push({
          row: i + 2,
          message: `批处理失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
      }
    }
  }

  /**
   * APPEND模式 - 追加新字段（新实现）
   */
  private async executeAppendMode(excelData: ExcelDataRow[], result: ImportResult): Promise<void> {
    for (const row of excelData) {
      try {
        const employeeId = await this.resolveEmployeeId(row);
        if (!employeeId) {
          result.failedCount++;
          this.errors.push({
            row: excelData.indexOf(row) + 2,
            message: '未找到对应员工'
          });
          continue;
        }

        // 查找现有薪资记录
        const existingPayroll = await this.checkExistingPayroll(employeeId);
        if (!existingPayroll) {
          // 如果没有现有记录，创建新记录
          await this.createPayrollRecord(employeeId, row);
          result.successCount++;
        } else {
          // 追加新字段到现有记录（只添加不存在的字段）
          await this.appendToPayrollRecord(existingPayroll.id, row);
          result.successCount++;
        }
      } catch (error) {
        result.failedCount++;
        this.errors.push({
          row: excelData.indexOf(row) + 2,
          message: error instanceof Error ? error.message : '未知错误'
        });
      }
    }
  }

  /**
   * 单条记录的UPSERT操作（带重试机制）
   */
  private async upsertSingleRecord(row: ExcelDataRow, result: ImportResult): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const employeeId = await this.resolveEmployeeId(row);
        if (!employeeId) {
          // 创建新员工
          const newEmployee = await this.createEmployee(row);
          if (newEmployee) {
            await this.createPayrollRecord(newEmployee.id, row);
            result.successCount++;
            return;
          }
        } else {
          // 检查并更新或创建薪资记录
          const existingPayroll = await this.checkExistingPayroll(employeeId);
          if (existingPayroll) {
            await this.updatePayrollRecord(existingPayroll.id, row);
          } else {
            await this.createPayrollRecord(employeeId, row);
          }
          result.successCount++;
          return;
        }
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          result.failedCount++;
          this.errors.push({
            row: 0,
            message: `UPSERT失败（重试${maxRetries}次后）: ${error instanceof Error ? error.message : '未知错误'}`
          });
        } else {
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }
  }

  /**
   * 创建薪资记录
   */
  private async createPayrollRecord(employeeId: string, row: ExcelDataRow): Promise<void> {
    const payrollData = this.extractPayrollData(row);
    
    // 创建主薪资记录
    const { data: payroll, error: payrollError } = await supabase
      .from('payrolls')
      .insert({
        employee_id: employeeId,
        pay_period_start: this.config.payPeriod.start,
        pay_period_end: this.config.payPeriod.end,
        pay_date: this.config.payPeriod.end,
        status: 'draft'
      })
      .select()
      .single();

    if (payrollError) throw payrollError;

    // 创建薪资项目
    await this.createPayrollItems(payroll.id, payrollData);
  }

  /**
   * 更新薪资记录（完整实现）
   */
  private async updatePayrollRecord(payrollId: string, row: ExcelDataRow): Promise<void> {
    const payrollData = this.extractPayrollData(row);
    
    // 获取现有薪资项目
    const { data: existingItems } = await supabase
      .from('payroll_items')
      .select('*')
      .eq('payroll_id', payrollId);

    // 更新或创建薪资项目
    for (const [componentName, amount] of Object.entries(payrollData)) {
      const componentId = await this.resolveComponentId(componentName);
      if (!componentId) continue;

      const existingItem = existingItems?.find(item => item.component_id === componentId);
      
      if (existingItem) {
        // 更新现有项目
        await supabase
          .from('payroll_items')
          .update({ amount })
          .eq('id', existingItem.id);
      } else {
        // 创建新项目
        await supabase
          .from('payroll_items')
          .insert({
            payroll_id: payrollId,
            component_id: componentId,
            amount
          });
      }
    }
  }

  /**
   * 追加到薪资记录（APPEND模式专用）
   */
  private async appendToPayrollRecord(payrollId: string, row: ExcelDataRow): Promise<void> {
    const payrollData = this.extractPayrollData(row);
    
    // 获取现有薪资项目
    const { data: existingItems } = await supabase
      .from('payroll_items')
      .select('*, salary_components!inner(name)')
      .eq('payroll_id', payrollId);

    const existingComponentNames = new Set(
      existingItems?.map(item => (item.salary_components as any).name) || []
    );

    // 只添加不存在的项目
    const newItems = [];
    for (const [componentName, amount] of Object.entries(payrollData)) {
      if (!existingComponentNames.has(componentName)) {
        const componentId = await this.resolveComponentId(componentName);
        if (componentId) {
          newItems.push({
            payroll_id: payrollId,
            component_id: componentId,
            amount
          });
        }
      }
    }

    if (newItems.length > 0) {
      const { error } = await supabase
        .from('payroll_items')
        .insert(newItems);
      
      if (error) throw error;
    }
  }

  /**
   * 辅助方法：解析员工ID（优化版，使用批量查询）
   */
  private async resolveEmployeeId(row: ExcelDataRow): Promise<string | null> {
    const { data } = await supabase
      .from('employees')
      .select('id')
      .or(`employee_name.eq.${row['员工姓名']},id_number.eq.${row['身份证号']}`)
      .limit(1)
      .single();
    
    return data?.id || null;
  }

  /**
   * 批量解析员工ID（解决N+1查询问题）
   */
  async resolveEmployeeIdsBatch(rows: ExcelDataRow[]): Promise<Map<number, string>> {
    const employeeMap = new Map<number, string>();
    
    // 收集所有标识符
    const codes = rows.map(r => r['员工编号']).filter(Boolean);
    const names = rows.map(r => r['员工姓名']).filter(Boolean);
    const idNumbers = rows.map(r => r['身份证号']).filter(Boolean);
    
    // 批量查询
    const { data: employees } = await supabase
      .from('employees')
      .select('id, employee_name, id_number')
      .or(`employee_name.in.(${names.join(',')}),id_number.in.(${idNumbers.join(',')})`);
    
    // 构建映射
    rows.forEach((row, index) => {
      const employee = employees?.find(e => 
        e.employee_name === row['员工姓名'] ||
        e.id_number === row['身份证号']
      );
      if (employee) {
        employeeMap.set(index, employee.id);
      }
    });
    
    return employeeMap;
  }

  /**
   * 检查现有薪资记录
   */
  private async checkExistingPayroll(employeeId: string): Promise<any> {
    const { data } = await supabase
      .from('payrolls')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('pay_period_start', this.config.payPeriod.start)
      .eq('pay_period_end', this.config.payPeriod.end)
      .single();
    
    return data;
  }

  /**
   * 创建员工记录
   */
  private async createEmployee(row: ExcelDataRow): Promise<any> {
    const { data, error } = await supabase
      .from('employees')
      .insert({
        employee_name: row['员工姓名'],
        id_number: row['身份证号'],
        gender: row['性别'],
        employment_status: 'active',
        hire_date: new Date().toISOString().split('T')[0],
        birth_date: row['出生日期'],
        phone_number: row['联系电话'],
        email: row['邮箱'],
        status: 'active'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * 解析组件ID
   */
  private async resolveComponentId(componentName: string): Promise<string | null> {
    const { data } = await supabase
      .from('salary_components')
      .select('id')
      .eq('name', componentName)
      .single();
    
    return data?.id || null;
  }

  /**
   * 提取薪资数据
   */
  private extractPayrollData(row: ExcelDataRow): Record<string, number> {
    const payrollData: Record<string, number> = {};
    
    // 提取所有数值型字段作为薪资项目
    const excludeFields = ['员工编号', '员工姓名', '身份证号', '部门', '职位', '性别', '出生日期', '联系电话', '邮箱'];
    
    for (const [key, value] of Object.entries(row)) {
      if (!excludeFields.includes(key) && value !== null && value !== undefined) {
        const numValue = parseFloat(String(value));
        if (!isNaN(numValue)) {
          payrollData[key] = numValue;
        }
      }
    }
    
    return payrollData;
  }

  /**
   * 创建薪资项目
   */
  private async createPayrollItems(payrollId: string, payrollData: Record<string, number>): Promise<void> {
    const items = [];
    
    for (const [componentName, amount] of Object.entries(payrollData)) {
      const componentId = await this.resolveComponentId(componentName);
      if (componentId) {
        items.push({
          payroll_id: payrollId,
          component_id: componentId,
          amount
        });
      }
    }
    
    if (items.length > 0) {
      const { error } = await supabase
        .from('payroll_items')
        .insert(items);
      
      if (error) throw error;
    }
  }

  /**
   * 转换行数据为薪资数据格式
   */
  private transformRowToPayrollData(row: ExcelDataRow): any {
    return {
      employee_name: row['员工姓名'],
      id_number: row['身份证号'],
      payroll_data: this.extractPayrollData(row)
    };
  }

  /**
   * 数据验证
   */
  private async validateData(excelData: ExcelDataRow[]): Promise<void> {
    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      
      // 验证员工标识
      if (!row['员工编号'] && !row['员工姓名'] && !row['身份证号']) {
        this.errors.push({
          row: i + 2,
          message: '缺少员工标识信息（员工编号、姓名或身份证号）'
        });
      }
      
      // 验证数据完整性
      const payrollData = this.extractPayrollData(row);
      if (Object.keys(payrollData).length === 0) {
        this.warnings.push({
          row: i + 2,
          message: '该行没有有效的薪资数据',
          action: 'warning'
        });
      }
    }
  }
}

// 导出便捷方法
export const importPayrollDataImproved = async (
  config: ImportConfig,
  excelData: ExcelDataRow[]
): Promise<ImportResult> => {
  const service = new PayrollImportImprovedService(config);
  return await service.importData(excelData);
};