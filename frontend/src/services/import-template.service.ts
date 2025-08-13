import { ImportDataGroup } from '@/types/payroll-import';
import type { FieldMapping } from '@/types/payroll-import';
import { supabase } from '@/lib/supabase';

/**
 * 导入模板服务 - 生成和管理Excel导入模板
 */
export class ImportTemplateService {
  
  /**
   * 获取指定数据组的字段映射配置
   */
  static async getFieldMappings(group: ImportDataGroup): Promise<FieldMapping[]> {
    const mappings: Record<ImportDataGroup, FieldMapping[]> = {
      [ImportDataGroup.EARNINGS]: await this.getEarningsFieldMappings(),
      [ImportDataGroup.CONTRIBUTION_BASES]: this.getContributionBasesFieldMappings(),
      [ImportDataGroup.CATEGORY_ASSIGNMENT]: this.getCategoryFieldMappings(),
      [ImportDataGroup.JOB_ASSIGNMENT]: this.getJobFieldMappings(),
      [ImportDataGroup.ALL]: await this.getAllFieldMappings()
    };
    
    return mappings[group] || [];
  }

  /**
   * 获取收入字段映射（动态从数据库加载）
   */
  private static async getEarningsFieldMappings(): Promise<FieldMapping[]> {
    // 基础字段
    const baseFields: FieldMapping[] = [
      {
        excelColumn: '员工编号',
        dbField: 'virtual_employee_code', // 注意：数据库中无employee_code字段
        dataType: 'string',
        required: false
      },
      {
        excelColumn: '员工姓名',
        dbField: 'employee_name',
        dataType: 'string',
        required: false
      },
      {
        excelColumn: '身份证号',
        dbField: 'id_number',
        dataType: 'string',
        required: false
      }
    ];
    
    // 动态加载收入组件
    const { data: components } = await supabase
      .from('salary_components')
      .select('name, description')
      .eq('type', 'earning')
      .order('name');
    
    const earningsFields: FieldMapping[] = components?.map(comp => ({
      excelColumn: comp.name,
      dbField: comp.name,
      dataType: 'number' as const,
      required: false,
      defaultValue: 0,
      validator: (value: any) => !isNaN(parseFloat(value))
    })) || [];
    
    return [...baseFields, ...earningsFields];
  }

  /**
   * 获取缴费基数字段映射
   */
  private static getContributionBasesFieldMappings(): FieldMapping[] {
    return [
      // 员工标识字段
      {
        excelColumn: '员工编号',
        dbField: 'virtual_employee_code', // 注意：数据库中无employee_code字段
        dataType: 'string',
        required: false
      },
      {
        excelColumn: '员工姓名',
        dbField: 'employee_name',
        dataType: 'string',
        required: false
      },
      {
        excelColumn: '身份证号',
        dbField: 'id_number',
        dataType: 'string',
        required: false
      },
      // 基数字段
      {
        excelColumn: '养老保险基数',
        dbField: 'pension_base',
        dataType: 'number',
        required: false,
        validator: (value: any) => value >= 0
      },
      {
        excelColumn: '医疗保险基数',
        dbField: 'medical_base',
        dataType: 'number',
        required: false,
        validator: (value: any) => value >= 0
      },
      {
        excelColumn: '失业保险基数',
        dbField: 'unemployment_base',
        dataType: 'number',
        required: false,
        validator: (value: any) => value >= 0
      },
      {
        excelColumn: '工伤保险基数',
        dbField: 'work_injury_base',
        dataType: 'number',
        required: false,
        validator: (value: any) => value >= 0
      },
      {
        excelColumn: '生育保险基数',
        dbField: 'maternity_base',
        dataType: 'number',
        required: false,
        validator: (value: any) => value >= 0
      },
      {
        excelColumn: '住房公积金基数',
        dbField: 'housing_fund_base',
        dataType: 'number',
        required: false,
        validator: (value: any) => value >= 0
      },
      {
        excelColumn: '职业年金基数',
        dbField: 'occupational_pension_base',
        dataType: 'number',
        required: false,
        validator: (value: any) => value >= 0
      },
      {
        excelColumn: '大病医疗基数',
        dbField: 'serious_illness_base',
        dataType: 'number',
        required: false,
        validator: (value: any) => value >= 0
      }
    ];
  }

  /**
   * 获取人员类别字段映射
   */
  private static getCategoryFieldMappings(): FieldMapping[] {
    return [
      {
        excelColumn: '员工编号',
        dbField: 'virtual_employee_code', // 注意：数据库中无employee_code字段
        dataType: 'string',
        required: false
      },
      {
        excelColumn: '员工姓名',
        dbField: 'employee_name',
        dataType: 'string',
        required: false
      },
      {
        excelColumn: '身份证号',
        dbField: 'id_number',
        dataType: 'string',
        required: false
      },
      {
        excelColumn: '人员类别代码',
        dbField: 'category_code',
        dataType: 'string',
        required: false
      },
      {
        excelColumn: '人员类别',
        dbField: 'category_name',
        dataType: 'string',
        required: true
      },
      {
        excelColumn: '生效日期',
        dbField: 'effective_date',
        dataType: 'date',
        required: false,
        transformer: (value: any) => {
          if (!value) return new Date();
          const date = new Date(value);
          return isNaN(date.getTime()) ? new Date() : date;
        }
      }
    ];
  }

  /**
   * 获取职务信息字段映射
   */
  private static getJobFieldMappings(): FieldMapping[] {
    return [
      {
        excelColumn: '员工编号',
        dbField: 'virtual_employee_code', // 注意：数据库中无employee_code字段
        dataType: 'string',
        required: false
      },
      {
        excelColumn: '员工姓名',
        dbField: 'employee_name',
        dataType: 'string',
        required: false
      },
      {
        excelColumn: '身份证号',
        dbField: 'id_number',
        dataType: 'string',
        required: false
      },
      {
        excelColumn: '部门代码',
        dbField: 'department_code',
        dataType: 'string',
        required: false
      },
      {
        excelColumn: '部门名称',
        dbField: 'department_name',
        dataType: 'string',
        required: true
      },
      {
        excelColumn: '职位代码',
        dbField: 'position_code',
        dataType: 'string',
        required: false
      },
      {
        excelColumn: '职位名称',
        dbField: 'position_name',
        dataType: 'string',
        required: true
      },
      {
        excelColumn: '职级代码',
        dbField: 'rank_code',
        dataType: 'string',
        required: false
      },
      {
        excelColumn: '职级名称',
        dbField: 'rank_name',
        dataType: 'string',
        required: false
      },
      {
        excelColumn: '生效日期',
        dbField: 'effective_date',
        dataType: 'date',
        required: false,
        transformer: (value: any) => {
          if (!value) return new Date();
          const date = new Date(value);
          return isNaN(date.getTime()) ? new Date() : date;
        }
      }
    ];
  }

  /**
   * 获取所有字段映射
   */
  private static async getAllFieldMappings(): Promise<FieldMapping[]> {
    const earnings = await this.getEarningsFieldMappings();
    const bases = this.getContributionBasesFieldMappings();
    const category = this.getCategoryFieldMappings();
    const job = this.getJobFieldMappings();
    
    // 合并字段，去除重复的员工标识字段
    const allFields: FieldMapping[] = [];
    const addedColumns = new Set<string>();
    
    // 添加基础标识字段
    const identifierFields = earnings.slice(0, 3); // 员工编号、姓名、身份证号
    allFields.push(...identifierFields);
    identifierFields.forEach(f => addedColumns.add(f.excelColumn));
    
    // 添加其他字段（跳过重复的标识字段）
    const addUniqueFields = (fields: FieldMapping[]) => {
      fields.forEach(field => {
        if (!addedColumns.has(field.excelColumn)) {
          allFields.push(field);
          addedColumns.add(field.excelColumn);
        }
      });
    };
    
    addUniqueFields(earnings.slice(3)); // 收入字段
    addUniqueFields(bases.slice(3));    // 基数字段
    addUniqueFields(category.slice(3)); // 类别字段
    addUniqueFields(job.slice(3));      // 职务字段
    
    return allFields;
  }

  /**
   * 生成Excel模板头部
   */
  static async generateTemplateHeaders(group: ImportDataGroup): Promise<string[]> {
    const mappings = await this.getFieldMappings(group);
    return mappings.map(m => m.excelColumn);
  }

  /**
   * 生成示例数据
   */
  static async generateSampleData(group: ImportDataGroup): Promise<any[]> {
    const mappings = await this.getFieldMappings(group);
    
    // 生成3行示例数据
    const samples = [];
    for (let i = 1; i <= 3; i++) {
      const row: any = {};
      
      for (const mapping of mappings) {
        switch (mapping.dbField) {
          case 'virtual_employee_code':
            row[mapping.excelColumn] = `EMP00${i}`;
            break;
          case 'employee_name':
            row[mapping.excelColumn] = `员工${i}`;
            break;
          case 'id_number':
            row[mapping.excelColumn] = `11010119900101000${i}`;
            break;
          case 'department_name':
            row[mapping.excelColumn] = `部门${i}`;
            break;
          case 'position_name':
            row[mapping.excelColumn] = `职位${i}`;
            break;
          case 'category_name':
            row[mapping.excelColumn] = `类别${i}`;
            break;
          case 'effective_date':
            row[mapping.excelColumn] = new Date().toISOString().split('T')[0];
            break;
          default:
            if (mapping.dataType === 'number') {
              row[mapping.excelColumn] = Math.round(Math.random() * 10000);
            } else {
              row[mapping.excelColumn] = '';
            }
        }
      }
      
      samples.push(row);
    }
    
    return samples;
  }

  /**
   * 验证导入数据格式
   */
  static async validateImportData(
    data: any[],
    group: ImportDataGroup
  ): Promise<{ valid: boolean; errors: string[] }> {
    const mappings = await this.getFieldMappings(group);
    const errors: string[] = [];
    
    // 检查必填字段
    const requiredFields = mappings.filter(m => m.required);
    
    data.forEach((row, index) => {
      // 至少需要一个员工标识
      if (!row['员工编号'] && !row['员工姓名'] && !row['身份证号']) {
        errors.push(`第${index + 2}行: 缺少员工标识（员工编号、姓名或身份证号至少填写一个）`);
      }
      
      // 检查必填字段
      requiredFields.forEach(field => {
        if (!row[field.excelColumn]) {
          errors.push(`第${index + 2}行: 缺少必填字段"${field.excelColumn}"`);
        }
      });
      
      // 验证字段格式
      mappings.forEach(field => {
        const value = row[field.excelColumn];
        if (value !== undefined && value !== null && value !== '') {
          if (field.validator && !field.validator(value)) {
            errors.push(`第${index + 2}行: 字段"${field.excelColumn}"格式错误`);
          }
        }
      });
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// 导出快捷方法
export const getImportTemplate = async (group: ImportDataGroup) => {
  const headers = await ImportTemplateService.generateTemplateHeaders(group);
  const samples = await ImportTemplateService.generateSampleData(group);
  
  return {
    headers,
    samples
  };
};

export const validateImportFile = async (data: any[], group: ImportDataGroup) => {
  return await ImportTemplateService.validateImportData(data, group);
};