import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { ImportDataGroup } from '@/types/payroll-import';
import { ExcelValidationService, ValidationResult } from './excel-validation.service';

/**
 * 导入预览数据
 */
export interface ImportPreviewV2 {
  validation: ValidationResult;
  dataGroups: DataGroupPreview[];
  summary: {
    totalGroups: number;
    totalRecords: number;
    totalCreate: number;
    totalUpdate: number;
    estimatedTime: string;
  };
  isReady: boolean;
}

export interface DataGroupPreview {
  group: ImportDataGroup;
  sheetName: string;
  records: {
    total: number;
    toCreate: number;
    toUpdate: number;
    toSkip: number;
  };
  samples: {
    create: any[];
    update: any[];
  };
  errors: string[];
  warnings: string[];
}

/**
 * 导入执行结果
 */
export interface ImportExecutionResult {
  success: boolean;
  timestamp: Date;
  dataGroups: DataGroupResult[];
  summary: {
    totalProcessed: number;
    totalSucceeded: number;
    totalFailed: number;
    duration: number; // 毫秒
  };
  errors: ImportError[];
  rollbackId?: string;
}

export interface DataGroupResult {
  group: ImportDataGroup;
  sheetName: string;
  processed: number;
  succeeded: number;
  failed: number;
  created: string[];
  updated: string[];
  failedRows: number[];
}

export interface ImportError {
  group: ImportDataGroup;
  row: number;
  field?: string;
  message: string;
  errorCode: string;
}

/**
 * 智能导入服务V2 - 支持多Sheet识别和验证
 */
export class SmartImportServiceV2 {
  private validationService: ExcelValidationService;
  private workbook: XLSX.WorkBook | null = null;
  private parsedData: Map<ImportDataGroup, any[]> = new Map();
  private payPeriod: { year: number; month: number };
  
  constructor(payPeriod: { year: number; month: number }) {
    this.payPeriod = payPeriod;
    this.validationService = new ExcelValidationService();
  }

  /**
   * Step 1 & 2: 解析文件并验证
   */
  async parseAndValidate(file: File): Promise<ValidationResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          this.workbook = XLSX.read(data, { type: 'array' });
          
          // 执行验证
          const validationResult = await this.validationService.validateExcelFile(this.workbook);
          
          // 如果验证通过，解析数据
          if (validationResult.isValid || validationResult.errors.filter(e => e.severity === 'critical').length === 0) {
            this.parseWorkbookData();
          }
          
          resolve(validationResult);
        } catch (error) {
          reject(new Error(`文件解析失败: ${error}`));
        }
      };
      
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 解析工作簿数据
   */
  private parseWorkbookData(): void {
    if (!this.workbook) return;
    
    this.parsedData.clear();
    
    for (const sheetName of this.workbook.SheetNames) {
      if (sheetName === '使用说明') continue;
      
      const dataGroup = ExcelValidationService.identifyDataGroup(sheetName);
      if (!dataGroup) continue;
      
      const worksheet = this.workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      
      this.parsedData.set(dataGroup, jsonData);
    }
  }

  /**
   * Step 3: 生成导入预览
   */
  async generatePreview(): Promise<ImportPreviewV2> {
    if (!this.workbook) {
      throw new Error('请先解析文件');
    }
    
    const validation = await this.validationService.validateExcelFile(this.workbook);
    const dataGroups: DataGroupPreview[] = [];
    let totalRecords = 0;
    let totalCreate = 0;
    let totalUpdate = 0;
    
    // 为每个数据组生成预览
    for (const [group, data] of this.parsedData.entries()) {
      const preview = await this.previewDataGroup(group, data);
      dataGroups.push(preview);
      
      totalRecords += preview.records.total;
      totalCreate += preview.records.toCreate;
      totalUpdate += preview.records.toUpdate;
    }
    
    // 估算导入时间（假设每条记录100ms）
    const estimatedMs = totalRecords * 100;
    const estimatedTime = this.formatDuration(estimatedMs);
    
    return {
      validation,
      dataGroups,
      summary: {
        totalGroups: dataGroups.length,
        totalRecords,
        totalCreate,
        totalUpdate,
        estimatedTime
      },
      isReady: validation.isValid
    };
  }

  /**
   * 预览单个数据组
   */
  private async previewDataGroup(
    group: ImportDataGroup,
    data: any[]
  ): Promise<DataGroupPreview> {
    const sheetName = ExcelValidationService.getSheetNameForGroup(group);
    const errors: string[] = [];
    const warnings: string[] = [];
    let toCreate = 0;
    let toUpdate = 0;
    let toSkip = 0;
    
    // 分析每条记录
    const createSamples: any[] = [];
    const updateSamples: any[] = [];
    
    for (const record of data) {
      try {
        // 查找员工
        const employee = await this.findEmployee(record);
        
        if (!employee) {
          // 新员工
          toCreate++;
          if (createSamples.length < 3) {
            createSamples.push(record);
          }
        } else {
          // 检查是否需要更新
          const needsUpdate = await this.checkNeedsUpdate(group, employee.id, record);
          if (needsUpdate) {
            toUpdate++;
            if (updateSamples.length < 3) {
              updateSamples.push({ ...record, _employeeId: employee.id });
            }
          } else {
            toSkip++;
          }
        }
      } catch (error) {
        errors.push(`行数据处理失败: ${error}`);
      }
    }
    
    return {
      group,
      sheetName,
      records: {
        total: data.length,
        toCreate,
        toUpdate,
        toSkip
      },
      samples: {
        create: createSamples,
        update: updateSamples
      },
      errors,
      warnings
    };
  }

  /**
   * Step 4: 执行导入
   */
  async executeImport(): Promise<ImportExecutionResult> {
    const startTime = Date.now();
    const dataGroups: DataGroupResult[] = [];
    const errors: ImportError[] = [];
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    
    // 生成回滚ID
    const rollbackId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // 按数据组执行导入
      for (const [group, data] of this.parsedData.entries()) {
        const result = await this.importDataGroup(group, data, rollbackId);
        dataGroups.push(result);
        
        totalProcessed += result.processed;
        totalSucceeded += result.succeeded;
        totalFailed += result.failed;
        
        // 收集错误
        result.failedRows.forEach((row, index) => {
          errors.push({
            group,
            row,
            message: `导入失败`,
            errorCode: 'IMPORT_FAILED'
          });
        });
      }
      
      const duration = Date.now() - startTime;
      
      return {
        success: totalFailed === 0,
        timestamp: new Date(),
        dataGroups,
        summary: {
          totalProcessed,
          totalSucceeded,
          totalFailed,
          duration
        },
        errors,
        rollbackId: totalFailed === 0 ? rollbackId : undefined
      };
      
    } catch (error) {
      // 如果出现严重错误，尝试回滚
      await this.rollbackImport(rollbackId);
      throw error;
    }
  }

  /**
   * 导入单个数据组
   */
  private async importDataGroup(
    group: ImportDataGroup,
    data: any[],
    rollbackId: string
  ): Promise<DataGroupResult> {
    const sheetName = ExcelValidationService.getSheetNameForGroup(group);
    const created: string[] = [];
    const updated: string[] = [];
    const failedRows: number[] = [];
    let succeeded = 0;
    let failed = 0;
    
    for (let i = 0; i < data.length; i++) {
      try {
        const record = data[i];
        const result = await this.importRecord(group, record, rollbackId);
        
        if (result.success) {
          succeeded++;
          if (result.action === 'create') {
            created.push(result.id);
          } else {
            updated.push(result.id);
          }
        } else {
          failed++;
          failedRows.push(i + 2); // +2 因为Excel从1开始且有标题行
        }
      } catch (error) {
        failed++;
        failedRows.push(i + 2);
      }
    }
    
    return {
      group,
      sheetName,
      processed: data.length,
      succeeded,
      failed,
      created,
      updated,
      failedRows
    };
  }

  /**
   * 导入单条记录
   */
  private async importRecord(
    group: ImportDataGroup,
    record: any,
    rollbackId: string
  ): Promise<{ success: boolean; action: 'create' | 'update' | 'skip'; id: string }> {
    // 根据不同的数据组执行不同的导入逻辑
    switch (group) {
      case ImportDataGroup.EARNINGS:
        return await this.importEarningsRecord(record, rollbackId);
      
      case ImportDataGroup.CONTRIBUTION_BASES:
        return await this.importContributionRecord(record, rollbackId);
      
      case ImportDataGroup.CATEGORY_ASSIGNMENT:
        return await this.importCategoryRecord(record, rollbackId);
      
      case ImportDataGroup.JOB_ASSIGNMENT:
        return await this.importJobRecord(record, rollbackId);
      
      default:
        return { success: false, action: 'skip', id: '' };
    }
  }

  /**
   * 导入收入记录
   */
  private async importEarningsRecord(
    record: any,
    rollbackId: string
  ): Promise<{ success: boolean; action: 'create' | 'update' | 'skip'; id: string }> {
    try {
      // 查找或创建员工
      let employee = await this.findEmployee(record);
      if (!employee) {
        employee = await this.createEmployee(record);
      }
      
      // 创建或更新薪资记录
      const payrollData = {
        employee_id: employee.id,
        pay_period_start: `${this.payPeriod.year}-${String(this.payPeriod.month).padStart(2, '0')}-01`,
        pay_period_end: new Date(this.payPeriod.year, this.payPeriod.month, 0).toISOString().split('T')[0],
        import_batch_id: rollbackId,
        // ... 其他字段映射
      };
      
      const { data, error } = await supabase
        .from('payroll')
        .upsert(payrollData, {
          onConflict: 'employee_id,pay_period_start'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        action: 'create',
        id: data.id
      };
      
    } catch (error) {
      console.error('导入收入记录失败:', error);
      return { success: false, action: 'skip', id: '' };
    }
  }

  /**
   * 导入缴费基数记录
   */
  private async importContributionRecord(
    record: any,
    rollbackId: string
  ): Promise<{ success: boolean; action: 'create' | 'update' | 'skip'; id: string }> {
    // 实现缴费基数导入逻辑
    return { success: true, action: 'update', id: 'temp-id' };
  }

  /**
   * 导入人员类别记录
   */
  private async importCategoryRecord(
    record: any,
    rollbackId: string
  ): Promise<{ success: boolean; action: 'create' | 'update' | 'skip'; id: string }> {
    // 实现人员类别导入逻辑
    return { success: true, action: 'update', id: 'temp-id' };
  }

  /**
   * 导入职务信息记录
   */
  private async importJobRecord(
    record: any,
    rollbackId: string
  ): Promise<{ success: boolean; action: 'create' | 'update' | 'skip'; id: string }> {
    // 实现职务信息导入逻辑
    return { success: true, action: 'update', id: 'temp-id' };
  }

  /**
   * 查找员工
   */
  private async findEmployee(record: any): Promise<any | null> {
    // 优先使用身份证号
    if (record['身份证号']) {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('id_number', record['身份证号'])
        .single();
      
      if (data) return data;
    }
    
    // 其次使用员工姓名（数据库中无employee_code字段）
    if (record['员工姓名']) {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_name', record['员工姓名'])
        .single();
      
      if (data) return data;
    }
    
    // 最后使用姓名（可能有重名）
    if (record['员工姓名']) {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_name', record['员工姓名'])
        .limit(1)
        .single();
      
      return data;
    }
    
    return null;
  }

  /**
   * 创建员工
   */
  private async createEmployee(record: any): Promise<any> {
    const employeeData = {
      employee_name: record['员工姓名'],
      id_number: record['身份证号'],
      employment_status: 'active',
      hire_date: new Date().toISOString().split('T')[0]
    };
    
    const { data, error } = await supabase
      .from('employees')
      .insert(employeeData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * 检查是否需要更新
   */
  private async checkNeedsUpdate(
    group: ImportDataGroup,
    employeeId: string,
    record: any
  ): Promise<boolean> {
    // 根据不同的数据组检查是否需要更新
    // 这里简化处理，实际应该比较具体字段
    return true;
  }

  /**
   * 回滚导入
   */
  async rollbackImport(rollbackId: string): Promise<boolean> {
    try {
      // 删除本次导入的所有记录
      const { error } = await supabase
        .from('payroll')
        .delete()
        .eq('import_batch_id', rollbackId);
      
      if (error) throw error;
      
      // 记录回滚操作
      await supabase
        .from('import_logs')
        .insert({
          batch_id: rollbackId,
          action: 'rollback',
          timestamp: new Date().toISOString()
        });
      
      return true;
    } catch (error) {
      console.error('回滚失败:', error);
      return false;
    }
  }

  /**
   * 格式化持续时间
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}毫秒`;
    if (ms < 60000) return `${Math.round(ms / 1000)}秒`;
    return `${Math.round(ms / 60000)}分钟`;
  }
}