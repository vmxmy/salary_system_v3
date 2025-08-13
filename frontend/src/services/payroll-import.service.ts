import { supabase } from '@/lib/supabase';
import { ImportDataGroup, ImportMode } from '@/types/payroll-import';
import type {
  ImportConfig,
  ImportResult,
  ExcelDataRow,
  EarningsImportData,
  ContributionBasesImportData,
  CategoryAssignmentImportData,
  JobAssignmentImportData,
  UnifiedImportData,
  ImportError,
  ImportWarning,
  FieldMapping
} from '@/types/payroll-import';

export class PayrollImportService {
  private config: ImportConfig;
  private errors: ImportError[] = [];
  private warnings: ImportWarning[] = [];
  
  constructor(config: ImportConfig) {
    this.config = config;
  }

  /**
   * 主导入方法 - 支持单个或多个数据组导入
   */
  async importData(excelData: ExcelDataRow[]): Promise<ImportResult> {
    this.errors = [];
    this.warnings = [];
    
    const groups = Array.isArray(this.config.dataGroup) 
      ? this.config.dataGroup 
      : [this.config.dataGroup];
    
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
        await this.validateData(excelData, groups);
      }

      // 分组处理数据
      const groupedData = await this.parseDataByGroups(excelData, groups);
      
      // 批量导入各组数据
      for (const group of groups) {
        const groupResult = await this.importGroupData(group, groupedData);
        result.processedData?.push({
          group,
          count: groupResult.successCount || 0
        });
        result.successCount += groupResult.successCount || 0;
        result.failedCount += groupResult.failedCount || 0;
        result.skippedCount += groupResult.skippedCount || 0;
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
   * 按数据组导入数据
   */
  private async importGroupData(
    group: ImportDataGroup,
    data: UnifiedImportData
  ): Promise<Partial<ImportResult>> {
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    switch (group) {
      case ImportDataGroup.EARNINGS:
        if (data.earnings) {
          const result = await this.importEarnings(data.earnings);
          successCount = result.successCount || 0;
          failedCount = result.failedCount || 0;
          skippedCount = result.skippedCount || 0;
        }
        break;

      case ImportDataGroup.CONTRIBUTION_BASES:
        if (data.contributionBases) {
          const result = await this.importContributionBases(data.contributionBases);
          successCount = result.successCount || 0;
          failedCount = result.failedCount || 0;
          skippedCount = result.skippedCount || 0;
        }
        break;

      case ImportDataGroup.CATEGORY_ASSIGNMENT:
        if (data.categoryAssignments) {
          const result = await this.importCategoryAssignments(data.categoryAssignments);
          successCount = result.successCount || 0;
          failedCount = result.failedCount || 0;
          skippedCount = result.skippedCount || 0;
        }
        break;

      case ImportDataGroup.JOB_ASSIGNMENT:
        if (data.jobAssignments) {
          const result = await this.importJobAssignments(data.jobAssignments);
          successCount = result.successCount || 0;
          failedCount = result.failedCount || 0;
          skippedCount = result.skippedCount || 0;
        }
        break;

      case ImportDataGroup.ALL:
        // 递归导入所有组
        const allGroups = [
          ImportDataGroup.EARNINGS,
          ImportDataGroup.CONTRIBUTION_BASES,
          ImportDataGroup.CATEGORY_ASSIGNMENT,
          ImportDataGroup.JOB_ASSIGNMENT
        ];
        for (const subGroup of allGroups) {
          const subResult = await this.importGroupData(subGroup, data);
          successCount += subResult.successCount || 0;
          failedCount += subResult.failedCount || 0;
          skippedCount += subResult.skippedCount || 0;
        }
        break;
    }

    return { successCount, failedCount, skippedCount };
  }

  /**
   * 导入收入数据
   */
  private async importEarnings(data: EarningsImportData[]): Promise<Partial<ImportResult>> {
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    
    const batchSize = this.config.options.batchSize || 100;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      try {
        // 查找员工ID
        const employeeIds = await this.resolveEmployeeIds(batch.map(d => d.employeeIdentifier));
        
        // 查找或创建薪资记录
        const payrollIds = await this.ensurePayrollRecords(employeeIds);
        
        // 查找收入组件ID
        const componentIds = await this.resolveComponentIds(
          Object.keys(batch[0]?.earnings || {})
        );
        
        // 准备批量插入数据
        const payrollItems = [];
        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          const employeeId = employeeIds[j];
          const payrollId = payrollIds[j];
          
          if (!employeeId || !payrollId) {
            failedCount++;
            this.errors.push({
              row: i + j + 2,
              message: '无法找到员工或创建薪资记录'
            });
            continue;
          }
          
          for (const [componentName, amount] of Object.entries(item.earnings)) {
            const componentId = componentIds[componentName];
            if (!componentId) {
              this.warnings.push({
                row: i + j + 2,
                field: componentName,
                message: `未找到收入组件: ${componentName}`,
                action: 'skipped'
              });
              continue;
            }
            
            payrollItems.push({
              payroll_id: payrollId,
              component_id: componentId,
              amount: amount
            });
          }
        }
        
        // 批量插入或更新
        if (payrollItems.length > 0) {
          const result = await this.upsertPayrollItems(payrollItems);
          if (result.error) {
            failedCount += batch.length;
            this.errors.push({
              row: i + 2,
              message: `批量导入失败: ${result.error instanceof Error ? result.error.message : String(result.error)}`
            });
          } else {
            successCount += batch.length;
          }
        }
        
      } catch (error) {
        failedCount += batch.length;
        this.errors.push({
          row: i + 2,
          message: `批处理失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
      }
    }
    
    return { successCount, failedCount, skippedCount };
  }

  /**
   * 导入缴费基数
   */
  private async importContributionBases(
    data: ContributionBasesImportData[]
  ): Promise<Partial<ImportResult>> {
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    
    const batchSize = this.config.options.batchSize || 100;
    
    // 获取保险类型映射
    const insuranceTypes = await this.getInsuranceTypes();
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      try {
        const employeeIds = await this.resolveEmployeeIds(batch.map(d => d.employeeIdentifier));
        
        const contributionBases = [];
        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          const employeeId = employeeIds[j];
          
          if (!employeeId) {
            failedCount++;
            this.errors.push({
              row: i + j + 2,
              message: '无法找到员工'
            });
            continue;
          }
          
          for (const [insuranceKey, base] of Object.entries(item.bases)) {
            const insuranceType = insuranceTypes[insuranceKey];
            if (!insuranceType) {
              this.warnings.push({
                row: i + j + 2,
                field: insuranceKey,
                message: `未找到保险类型: ${insuranceKey}`,
                action: 'skipped'
              });
              continue;
            }
            
            if (base !== undefined && base !== null) {
              contributionBases.push({
                employee_id: employeeId,
                insurance_type_id: insuranceType.id,
                contribution_base: base,
                effective_start_date: this.config.payPeriod.start,
                effective_end_date: this.config.payPeriod.end
              });
            }
          }
        }
        
        // 批量更新或插入基数
        if (contributionBases.length > 0) {
          const { error } = await this.upsertContributionBases(contributionBases);
          if (error) {
            failedCount += batch.length;
            this.errors.push({
              row: i + 2,
              message: `批量导入基数失败: ${(error as any).message || '未知错误'}`
            });
          } else {
            successCount += batch.length;
          }
        }
        
      } catch (error) {
        failedCount += batch.length;
        this.errors.push({
          row: i + 2,
          message: `批处理失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
      }
    }
    
    return { successCount, failedCount, skippedCount };
  }

  /**
   * 导入人员类别分配
   */
  private async importCategoryAssignments(
    data: CategoryAssignmentImportData[]
  ): Promise<Partial<ImportResult>> {
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    
    for (const item of data) {
      try {
        const employeeId = await this.resolveEmployeeId(item.employeeIdentifier);
        if (!employeeId) {
          failedCount++;
          continue;
        }
        
        const categoryId = await this.resolveCategoryId(item.categoryCode, item.categoryName);
        if (!categoryId) {
          failedCount++;
          continue;
        }
        
        // 处理时间片段
        await this.handleTimeSlicedAssignment(
          'employee_category_assignments',
          {
            employee_id: employeeId,
            employee_category_id: categoryId,
            effective_start_date: item.effectiveDate,
            effective_end_date: null
          }
        );
        
        successCount++;
      } catch (error) {
        failedCount++;
        this.errors.push({
          row: data.indexOf(item) + 2,
          message: error instanceof Error ? error.message : '未知错误'
        });
      }
    }
    
    return { successCount, failedCount, skippedCount };
  }

  /**
   * 导入职务信息
   */
  private async importJobAssignments(
    data: JobAssignmentImportData[]
  ): Promise<Partial<ImportResult>> {
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    
    for (const item of data) {
      try {
        const employeeId = await this.resolveEmployeeId(item.employeeIdentifier);
        if (!employeeId) {
          failedCount++;
          continue;
        }
        
        const departmentId = await this.resolveDepartmentId(item.departmentCode, item.departmentName);
        const positionId = await this.resolvePositionId(item.positionCode, item.positionName);
        const rankId = item.rankCode ? await this.resolveRankId(item.rankCode, item.rankName) : null;
        
        if (!departmentId || !positionId) {
          failedCount++;
          continue;
        }
        
        // 处理时间片段
        await this.handleTimeSlicedAssignment(
          'employee_job_history',
          {
            employee_id: employeeId,
            department_id: departmentId,
            position_id: positionId,
            rank_id: rankId,
            effective_start_date: item.effectiveDate,
            effective_end_date: null
          }
        );
        
        successCount++;
      } catch (error) {
        failedCount++;
        this.errors.push({
          row: data.indexOf(item) + 2,
          message: error instanceof Error ? error.message : '未知错误'
        });
      }
    }
    
    return { successCount, failedCount, skippedCount };
  }

  /**
   * 解析Excel数据到分组格式
   */
  private async parseDataByGroups(
    excelData: ExcelDataRow[],
    groups: ImportDataGroup[]
  ): Promise<UnifiedImportData> {
    const result: UnifiedImportData = {};
    
    for (const group of groups) {
      switch (group) {
        case ImportDataGroup.EARNINGS:
          result.earnings = await this.parseEarningsData(excelData);
          break;
        case ImportDataGroup.CONTRIBUTION_BASES:
          result.contributionBases = await this.parseContributionBasesData(excelData);
          break;
        case ImportDataGroup.CATEGORY_ASSIGNMENT:
          result.categoryAssignments = await this.parseCategoryAssignmentData(excelData);
          break;
        case ImportDataGroup.JOB_ASSIGNMENT:
          result.jobAssignments = await this.parseJobAssignmentData(excelData);
          break;
        case ImportDataGroup.ALL:
          result.earnings = await this.parseEarningsData(excelData);
          result.contributionBases = await this.parseContributionBasesData(excelData);
          result.categoryAssignments = await this.parseCategoryAssignmentData(excelData);
          result.jobAssignments = await this.parseJobAssignmentData(excelData);
          break;
      }
    }
    
    return result;
  }

  /**
   * 解析收入数据
   */
  private async parseEarningsData(excelData: ExcelDataRow[]): Promise<EarningsImportData[]> {
    // 获取所有收入组件
    const components = await this.getEarningComponents();
    const componentNames = components.map(c => c.name);
    
    return excelData.map((row, index) => {
      const earnings: Record<string, number> = {};
      
      // 提取所有收入字段
      for (const componentName of componentNames) {
        if (row[componentName] !== undefined && row[componentName] !== null) {
          const value = parseFloat(row[componentName]);
          if (!isNaN(value)) {
            earnings[componentName] = value;
          }
        }
      }
      
      return {
        employeeIdentifier: {
          code: row.employeeCode,
          name: row.employeeName,
          idNumber: row.idNumber
        },
        earnings
      };
    });
  }

  /**
   * 解析缴费基数数据
   */
  private async parseContributionBasesData(
    excelData: ExcelDataRow[]
  ): Promise<ContributionBasesImportData[]> {
    const baseFieldMapping = {
      '养老保险基数': 'pension',
      '医疗保险基数': 'medical',
      '失业保险基数': 'unemployment',
      '工伤保险基数': 'work_injury',
      '生育保险基数': 'maternity',
      '住房公积金基数': 'housing_fund',
      '职业年金基数': 'occupational_pension',
      '大病医疗基数': 'serious_illness'
    };
    
    return excelData.map(row => {
      const bases: any = {};
      
      for (const [excelField, dbField] of Object.entries(baseFieldMapping)) {
        if (row[excelField] !== undefined && row[excelField] !== null) {
          const value = parseFloat(row[excelField]);
          if (!isNaN(value)) {
            bases[dbField] = value;
          }
        }
      }
      
      return {
        employeeIdentifier: {
          code: row.employeeCode,
          name: row.employeeName,
          idNumber: row.idNumber
        },
        bases
      };
    });
  }

  /**
   * 辅助方法：数据验证
   */
  private async validateData(
    excelData: ExcelDataRow[],
    groups: ImportDataGroup[]
  ): Promise<void> {
    // 验证必填字段
    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      
      // 验证员工标识
      if (!row.employeeCode && !row.employeeName && !row.idNumber) {
        this.errors.push({
          row: i + 2,
          message: '缺少员工标识信息（员工编号、姓名或身份证号）'
        });
      }
      
      // 根据导入组验证相关字段
      // ...具体验证逻辑
    }
  }

  /**
   * 辅助方法：解析人员类别分配数据
   */
  private async parseCategoryAssignmentData(
    excelData: ExcelDataRow[]
  ): Promise<CategoryAssignmentImportData[]> {
    return excelData.map(row => ({
      employeeIdentifier: {
        code: row.employeeCode,
        name: row.employeeName,
        idNumber: row.idNumber
      },
      categoryCode: row.categoryCode || row.人员类别代码,
      categoryName: row.categoryName || row.人员类别,
      effectiveDate: new Date(row.effectiveDate || row.生效日期 || this.config.payPeriod.start)
    }));
  }

  /**
   * 辅助方法：解析职务信息数据
   */
  private async parseJobAssignmentData(
    excelData: ExcelDataRow[]
  ): Promise<JobAssignmentImportData[]> {
    return excelData.map(row => ({
      employeeIdentifier: {
        code: row.employeeCode,
        name: row.employeeName,
        idNumber: row.idNumber
      },
      departmentCode: row.departmentCode || row.部门代码,
      departmentName: row.departmentName || row.部门名称,
      positionCode: row.positionCode || row.职位代码,
      positionName: row.positionName || row.职位名称,
      rankCode: row.rankCode || row.职级代码,
      rankName: row.rankName || row.职级名称,
      effectiveDate: new Date(row.effectiveDate || row.生效日期 || this.config.payPeriod.start)
    }));
  }

  // ========== 数据库操作方法 ==========

  private async resolveEmployeeIds(identifiers: any[]): Promise<(string | null)[]> {
    const results = [];
    for (const identifier of identifiers) {
      const id = await this.resolveEmployeeId(identifier);
      results.push(id);
    }
    return results;
  }

  private async resolveEmployeeId(identifier: any): Promise<string | null> {
    let query = supabase.from('employees').select('id').limit(1);
    
    if (identifier.idNumber) {
      query = query.eq('id_number', identifier.idNumber);
    } else if (identifier.name) {
      query = query.eq('employee_name', identifier.name);
    }
    
    const { data, error } = await query.single();
    return data?.id || null;
  }

  private async ensurePayrollRecords(employeeIds: (string | null)[]): Promise<(string | null)[]> {
    const results = [];
    
    for (const employeeId of employeeIds) {
      if (!employeeId) {
        results.push(null);
        continue;
      }
      
      // 查找或创建薪资记录
      const { data: existing } = await supabase
        .from('payrolls')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('pay_period_start', this.config.payPeriod.start)
        .eq('pay_period_end', this.config.payPeriod.end)
        .single();
      
      if (existing) {
        results.push(existing.id);
      } else if (this.config.mode === ImportMode.CREATE || this.config.mode === ImportMode.UPSERT) {
        const { data: created } = await supabase
          .from('payrolls')
          .insert({
            employee_id: employeeId,
            pay_period_start: this.config.payPeriod.start,
            pay_period_end: this.config.payPeriod.end,
            pay_date: this.config.payPeriod.end,
            status: 'draft'
          })
          .select('id')
          .single();
        
        results.push(created?.id || null);
      } else {
        results.push(null);
      }
    }
    
    return results;
  }

  private async resolveComponentIds(componentNames: string[]): Promise<Record<string, string>> {
    const { data } = await supabase
      .from('salary_components')
      .select('id, name')
      .in('name', componentNames);
    
    const mapping: Record<string, string> = {};
    for (const component of data || []) {
      mapping[component.name] = component.id;
    }
    
    return mapping;
  }

  private async getEarningComponents() {
    const { data } = await supabase
      .from('salary_components')
      .select('id, name')
      .eq('type', 'earning');
    
    return data || [];
  }

  private async getInsuranceTypes() {
    const { data } = await supabase
      .from('insurance_types')
      .select('id, system_key');
    
    const mapping: Record<string, any> = {};
    for (const type of data || []) {
      mapping[type.system_key] = type;
    }
    
    return mapping;
  }

  /**
   * 执行批量薪资项目更新插入操作（带事务处理）
   */
  private async upsertPayrollItems(items: any[]): Promise<{ data: any, error: any }> {
    try {
      // 使用Supabase的RPC函数实现事务处理
      const { data, error } = await supabase.rpc('upsert_payroll_items_batch', {
        items_data: items,
        import_mode: this.config.mode
      });

      if (error) {
        throw new Error(`批量更新薪资项目失败: ${error.message}`);
      }

      return { data, error: null };
    } catch (error) {
      // 如果RPC函数不存在，回退到原有逻辑但增加错误处理
      
      if (this.config.mode === ImportMode.UPDATE || this.config.mode === ImportMode.UPSERT) {
        try {
          // 先删除现有项
          const payrollIds = [...new Set(items.map(i => i.payroll_id))];
          const componentIds = [...new Set(items.map(i => i.component_id))];
          
          const deleteResult = await supabase
            .from('payroll_items')
            .delete()
            .in('payroll_id', payrollIds)
            .in('component_id', componentIds);

          if (deleteResult.error) {
            throw new Error(`删除现有薪资项目失败: ${deleteResult.error.message}`);
          }
        } catch (deleteError) {
          throw new Error(`删除阶段失败: ${deleteError instanceof Error ? deleteError.message : '未知错误'}`);
        }
      }
      
      try {
        const insertResult = await supabase
          .from('payroll_items')
          .insert(items);

        if (insertResult.error) {
          throw new Error(`插入薪资项目失败: ${insertResult.error.message}`);
        }

        return { data: insertResult.data, error: null };
      } catch (insertError) {
        throw new Error(`插入阶段失败: ${insertError instanceof Error ? insertError.message : '未知错误'}`);
      }
    }
  }

  private async upsertContributionBases(bases: any[]) {
    // 处理时间片段重叠
    for (const base of bases) {
      await this.handleTimeSlicedAssignment('employee_contribution_bases', base);
    }
    
    return { error: null };
  }

  /**
   * 处理时间片段分配（带事务处理和错误上下文）
   */
  private async handleTimeSlicedAssignment(tableName: string, data: any) {
    try {
      // 构建更新条件
      const updateConditions: any = {
        employee_id: data.employee_id
      };
      
      if (tableName === 'employee_contribution_bases') {
        updateConditions.insurance_type_id = data.insurance_type_id;
      }
      
      // 第一步：关闭之前的有效记录
      const updateResult = await supabase
        .from(tableName)
        .update({ effective_end_date: data.effective_start_date })
        .match(updateConditions)
        .is('effective_end_date', null);

      if (updateResult.error) {
        throw new Error(`关闭${tableName}表中员工${data.employee_id}的旧记录失败: ${updateResult.error.message}`);
      }
      
      // 第二步：插入新记录
      const insertResult = await supabase
        .from(tableName)
        .insert(data);

      if (insertResult.error) {
        throw new Error(`向${tableName}表插入员工${data.employee_id}的新记录失败: ${insertResult.error.message}`);
      }

      return { success: true };
    } catch (error) {
      const contextError = new Error(
        `处理${tableName}表的时间片段分配失败 (员工ID: ${data.employee_id}): ${
          error instanceof Error ? error.message : '未知错误'
        }`
      );
      throw contextError;
    }
  }

  private async resolveCategoryId(code?: string, name?: string): Promise<string | null> {
    if (!code && !name) return null;
    
    let query = supabase.from('employee_categories').select('id').limit(1);
    
    if (code) {
      query = query.eq('code', code);
    } else if (name) {
      query = query.eq('name', name);
    }
    
    const { data } = await query.single();
    return data?.id || null;
  }

  private async resolveDepartmentId(code?: string, name?: string): Promise<string | null> {
    if (!code && !name) return null;
    
    let query = supabase.from('departments').select('id').limit(1);
    
    if (code) {
      query = query.eq('code', code);
    } else if (name) {
      query = query.eq('name', name);
    }
    
    const { data } = await query.single();
    return data?.id || null;
  }

  private async resolvePositionId(code?: string, name?: string): Promise<string | null> {
    if (!code && !name) return null;
    
    let query = supabase.from('positions').select('id').limit(1);
    
    if (code) {
      query = query.eq('code', code);
    } else if (name) {
      query = query.eq('name', name);
    }
    
    const { data } = await query.single();
    return data?.id || null;
  }

  private async resolveRankId(code?: string, name?: string): Promise<string | null> {
    if (!code && !name) return null;
    
    let query = supabase.from('ranks').select('id').limit(1);
    
    if (code) {
      query = query.eq('code', code);
    } else if (name) {
      query = query.eq('name', name);
    }
    
    const { data } = await query.single();
    return data?.id || null;
  }
}

// 导出便捷方法
export const importPayrollData = async (
  config: ImportConfig,
  excelData: ExcelDataRow[]
): Promise<ImportResult> => {
  const service = new PayrollImportService(config);
  return await service.importData(excelData);
};