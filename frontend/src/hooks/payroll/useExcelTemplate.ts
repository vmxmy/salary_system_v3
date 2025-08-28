import { useState, useCallback } from 'react';
import { excelLoader } from '@/lib/excel-lazy-loader';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { Database } from '@/types/supabase';

// 导入数据分组类型 - 与 payroll-import.ts 保持一致
import { ImportDataGroup } from '@/types/payroll-import';

// 字段映射类型
export interface FieldMapping {
  excelColumn: string;
  dbField: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

interface TemplateConfig {
  groups: ImportDataGroup[];
  includeExample: boolean;
  payPeriod?: {
    year: number;
    month: number;
  };
}

interface UseExcelTemplateReturn {
  generating: boolean;
  error: string | null;
  generateTemplate: (config: TemplateConfig) => Promise<any>;
  downloadTemplate: (config: TemplateConfig) => Promise<void>;
}

// 字段映射配置常量
const FIELD_MAPPINGS: Record<ImportDataGroup, FieldMapping[]> = {
  [ImportDataGroup.EARNINGS]: [
    { excelColumn: '员工编号', dbField: 'employee_number', dataType: 'string', required: false, description: '员工编号（员工编号、姓名、身份证号至少填一个）' },
    { excelColumn: '员工姓名', dbField: 'employee_name', dataType: 'string', required: false, description: '员工姓名' },
    { excelColumn: '身份证号', dbField: 'id_number', dataType: 'string', required: false, description: '身份证号码' },
    { excelColumn: '*基本工资', dbField: 'basic_salary', dataType: 'number', required: true, description: '基本工资金额' },
    { excelColumn: '岗位津贴', dbField: 'position_allowance', dataType: 'number', required: false, defaultValue: 0, description: '岗位津贴' },
    { excelColumn: '绩效工资', dbField: 'performance_salary', dataType: 'number', required: false, defaultValue: 0, description: '绩效工资' },
    { excelColumn: '加班费', dbField: 'overtime_pay', dataType: 'number', required: false, defaultValue: 0, description: '加班费' },
    { excelColumn: '交通补贴', dbField: 'transport_allowance', dataType: 'number', required: false, defaultValue: 0, description: '交通补贴' },
    { excelColumn: '餐饮补贴', dbField: 'meal_allowance', dataType: 'number', required: false, defaultValue: 0, description: '餐饮补贴' },
    { excelColumn: '通讯补贴', dbField: 'communication_allowance', dataType: 'number', required: false, defaultValue: 0, description: '通讯补贴' },
    { excelColumn: '年终奖', dbField: 'annual_bonus', dataType: 'number', required: false, defaultValue: 0, description: '年终奖金' },
    { excelColumn: '其他收入', dbField: 'other_income', dataType: 'number', required: false, defaultValue: 0, description: '其他收入' },
  ],
  [ImportDataGroup.CONTRIBUTION_BASES]: [
    { excelColumn: '员工编号', dbField: 'employee_number', dataType: 'string', required: false, description: '员工编号（员工编号、姓名、身份证号至少填一个）' },
    { excelColumn: '员工姓名', dbField: 'employee_name', dataType: 'string', required: false, description: '员工姓名' },
    { excelColumn: '身份证号', dbField: 'id_number', dataType: 'string', required: false, description: '身份证号码' },
    { excelColumn: '*养老保险基数', dbField: 'pension_base', dataType: 'number', required: true, description: '养老保险缴费基数' },
    { excelColumn: '*医疗保险基数', dbField: 'medical_base', dataType: 'number', required: true, description: '医疗保险缴费基数' },
    { excelColumn: '*失业保险基数', dbField: 'unemployment_base', dataType: 'number', required: true, description: '失业保险缴费基数' },
    { excelColumn: '*工伤保险基数', dbField: 'work_injury_base', dataType: 'number', required: true, description: '工伤保险缴费基数' },
    { excelColumn: '*住房公积金基数', dbField: 'housing_fund_base', dataType: 'number', required: true, description: '住房公积金缴费基数' },
    { excelColumn: '生育保险基数', dbField: 'maternity_base', dataType: 'number', required: false, description: '生育保险缴费基数' },
    { excelColumn: '补充公积金基数', dbField: 'supplementary_fund_base', dataType: 'number', required: false, defaultValue: 0, description: '补充住房公积金基数' },
    { excelColumn: '*生效日期', dbField: 'effective_date', dataType: 'date', required: true, description: '基数生效日期，格式：YYYY-MM-DD' },
  ],
  [ImportDataGroup.CATEGORY_ASSIGNMENT]: [
    { excelColumn: '员工编号', dbField: 'employee_number', dataType: 'string', required: false, description: '员工编号（员工编号、姓名、身份证号至少填一个）' },
    { excelColumn: '员工姓名', dbField: 'employee_name', dataType: 'string', required: false, description: '员工姓名' },
    { excelColumn: '身份证号', dbField: 'id_number', dataType: 'string', required: false, description: '身份证号码' },
    { excelColumn: '*人员类别', dbField: 'personnel_category', dataType: 'string', required: true, description: '人员类别名称' },
    { excelColumn: '*生效日期', dbField: 'effective_start_date', dataType: 'date', required: true, description: '分配生效日期，格式：YYYY-MM-DD' },
    { excelColumn: '失效日期', dbField: 'effective_end_date', dataType: 'date', required: false, description: '分配失效日期，格式：YYYY-MM-DD' },
    { excelColumn: '备注', dbField: 'notes', dataType: 'string', required: false, description: '备注信息' },
  ],
  [ImportDataGroup.JOB_ASSIGNMENT]: [
    { excelColumn: '员工编号', dbField: 'employee_number', dataType: 'string', required: false, description: '员工编号（员工编号、姓名、身份证号至少填一个）' },
    { excelColumn: '员工姓名', dbField: 'employee_name', dataType: 'string', required: false, description: '员工姓名' },
    { excelColumn: '身份证号', dbField: 'id_number', dataType: 'string', required: false, description: '身份证号码' },
    { excelColumn: '*部门名称', dbField: 'department_name', dataType: 'string', required: true, description: '部门名称' },
    { excelColumn: '*职位名称', dbField: 'position_name', dataType: 'string', required: true, description: '职位名称' },
    { excelColumn: '职级', dbField: 'position_level', dataType: 'string', required: false, description: '职位级别' },
    { excelColumn: '*生效日期', dbField: 'effective_start_date', dataType: 'date', required: true, description: '任职生效日期，格式：YYYY-MM-DD' },
    { excelColumn: '失效日期', dbField: 'effective_end_date', dataType: 'date', required: false, description: '任职失效日期，格式：YYYY-MM-DD' },
    { excelColumn: '是否主职务', dbField: 'is_primary', dataType: 'boolean', required: false, defaultValue: true, description: '是否为主要职务（是/否）' },
    { excelColumn: '备注', dbField: 'notes', dataType: 'string', required: false, description: '备注信息' },
  ],
  [ImportDataGroup.ALL]: [] // 动态组合其他所有字段
};

// 示例数据配置
const SAMPLE_DATA: Record<ImportDataGroup, any[]> = {
  [ImportDataGroup.EARNINGS]: [
    {
      '员工编号': 'EMP001',
      '员工姓名': '张三',
      '身份证号': '110101199001011234',
      '*基本工资': 8000,
      '岗位津贴': 1200,
      '绩效工资': 2000,
      '加班费': 500,
      '交通补贴': 300,
      '餐饮补贴': 600,
      '通讯补贴': 200,
      '年终奖': 0,
      '其他收入': 0
    },
    {
      '员工编号': 'EMP002',
      '员工姓名': '李四',
      '身份证号': '110101199002021234',
      '*基本工资': 9500,
      '岗位津贴': 1500,
      '绩效工资': 2500,
      '加班费': 800,
      '交通补贴': 300,
      '餐饮补贴': 600,
      '通讯补贴': 200,
      '年终奖': 10000,
      '其他收入': 500
    }
  ],
  [ImportDataGroup.CONTRIBUTION_BASES]: [
    {
      '员工编号': 'EMP001',
      '员工姓名': '张三',
      '身份证号': '110101199001011234',
      '*养老保险基数': 8000,
      '*医疗保险基数': 8000,
      '*失业保险基数': 8000,
      '*工伤保险基数': 8000,
      '*住房公积金基数': 8000,
      '生育保险基数': 8000,
      '补充公积金基数': 0,
      '*生效日期': '2025-01-01'
    }
  ],
  [ImportDataGroup.CATEGORY_ASSIGNMENT]: [
    {
      '员工编号': 'EMP001',
      '员工姓名': '张三',
      '身份证号': '110101199001011234',
      '*人员类别': '正式员工',
      '*生效日期': '2025-01-01',
      '失效日期': '',
      '备注': '转正'
    }
  ],
  [ImportDataGroup.JOB_ASSIGNMENT]: [
    {
      '员工编号': 'EMP001',
      '员工姓名': '张三',
      '身份证号': '110101199001011234',
      '*部门名称': '技术部',
      '*职位名称': '高级工程师',
      '职级': 'P6',
      '*生效日期': '2025-01-01',
      '失效日期': '',
      '是否主职务': '是',
      '备注': '晋升'
    }
  ],
  [ImportDataGroup.ALL]: []
};

/**
 * 纯 Hook Excel模板生成器
 * 无服务层依赖，直接使用常量配置和本地逻辑
 */
export const useExcelTemplate = (): UseExcelTemplateReturn => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { handleError } = useErrorHandler();

  /**
   * 获取字段映射
   */
  const getFieldMappings = useCallback((group: ImportDataGroup): FieldMapping[] => {
    if (group === ImportDataGroup.ALL) {
      // 合并所有其他组的字段映射
      const allMappings: FieldMapping[] = [];
      const seenColumns = new Set<string>();
      
      Object.entries(FIELD_MAPPINGS).forEach(([key, mappings]) => {
        if (key !== ImportDataGroup.ALL) {
          mappings.forEach(mapping => {
            if (!seenColumns.has(mapping.excelColumn)) {
              allMappings.push(mapping);
              seenColumns.add(mapping.excelColumn);
            }
          });
        }
      });
      
      return allMappings;
    }
    
    return FIELD_MAPPINGS[group] || [];
  }, []);

  /**
   * 生成示例数据
   */
  const generateSampleData = useCallback((group: ImportDataGroup) => {
    if (group === ImportDataGroup.ALL) {
      // 对于ALL组，使用第一个示例数据并合并所有字段
      const combinedSample: any = {};
      Object.entries(SAMPLE_DATA).forEach(([key, samples]) => {
        if (key !== ImportDataGroup.ALL && samples.length > 0) {
          Object.assign(combinedSample, samples[0]);
        }
      });
      return [combinedSample];
    }
    
    return SAMPLE_DATA[group] || [];
  }, []);

  /**
   * 生成Excel模板
   */
  const generateTemplate = useCallback(async (config: TemplateConfig) => {
    setGenerating(true);
    setError(null);

    try {
      // 懒加载 Excel 库
      const libraries = await excelLoader.load();
      if (!libraries.available) {
        throw new Error('Excel库加载失败');
      }
      const { XLSX } = libraries;

      // 创建新的工作簿
      const workbook = XLSX.utils.book_new();

      // 为每个数据组创建工作表
      for (const group of config.groups) {
        const sheetData = await generateSheetData(group, config, XLSX);
        const worksheet = XLSX.utils.json_to_sheet(sheetData.data, {
          header: sheetData.headers
        });

        // 设置列宽
        worksheet['!cols'] = sheetData.colWidths;

        // 添加数据验证和格式
        applySheetFormatting(worksheet, sheetData.mappings, XLSX);

        // 添加工作表到工作簿
        const sheetName = getSheetName(group);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }

      // 添加说明工作表
      const instructionSheet = createInstructionSheet(config.groups, XLSX);
      XLSX.utils.book_append_sheet(workbook, instructionSheet, '使用说明');

      return workbook;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '生成模板失败';
      setError(errorMessage);
      handleError(err as Error, { customMessage: '生成Excel模板失败' });
      throw err;
    } finally {
      setGenerating(false);
    }
  }, [getFieldMappings, generateSampleData, handleError]);

  /**
   * 下载Excel模板
   */
  const downloadTemplate = useCallback(async (config: TemplateConfig) => {
    try {
      // 懒加载 Excel 库
      const libraries = await excelLoader.load();
      if (!libraries.available) {
        throw new Error('Excel库加载失败');
      }
      const { XLSX } = libraries;

      const workbook = await generateTemplate(config);
      
      // 生成文件名
      const fileName = generateFileName(config);
      
      // 下载文件
      XLSX.writeFile(workbook, fileName);
      
    } catch (err) {
      console.error('下载模板失败:', err);
      handleError(err as Error, { customMessage: '下载Excel模板失败' });
    }
  }, [generateTemplate, handleError]);

  /**
   * 生成工作表数据
   */
  async function generateSheetData(group: ImportDataGroup, config: TemplateConfig, XLSX: any) {
    const mappings = getFieldMappings(group);
    const headers = mappings.map(m => m.excelColumn);
    
    let data = [];
    
    if (config.includeExample) {
      // 添加示例数据
      const samples = generateSampleData(group);
      data = samples;
    } else {
      // 只有表头的空模板
      data = [{}];
    }

    // 计算列宽
    const colWidths = headers.map(header => ({
      wch: Math.max(header.length * 1.5, 12)
    }));

    return {
      headers,
      data,
      mappings,
      colWidths
    };
  }

  return {
    generating,
    error,
    generateTemplate,
    downloadTemplate
  };
};

/**
 * 应用工作表格式
 */
function applySheetFormatting(worksheet: any, mappings: FieldMapping[], XLSX: any) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // 设置表头样式
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = worksheet[cellAddress];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
  }

  // 添加数据验证注释
  mappings.forEach((mapping, index) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
    const cell = worksheet[cellAddress];
    if (cell) {
      // 添加注释说明字段类型和是否必填
      let comment = `字段类型: ${mapping.dataType}`;
      if (mapping.required) {
        comment += '\n必填字段';
      }
      if (mapping.defaultValue !== undefined) {
        comment += `\n默认值: ${mapping.defaultValue}`;
      }
      if (mapping.description) {
        comment += `\n说明: ${mapping.description}`;
      }
      
      if (!cell.c) cell.c = [];
      cell.c.push({
        a: 'Excel模板生成器',
        t: comment
      });
    }
  });

  // 设置数字格式
  mappings.forEach((mapping, colIndex) => {
    if (mapping.dataType === 'number') {
      for (let row = 1; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
        const cell = worksheet[cellAddress];
        if (cell && cell.t === 'n') {
          cell.z = '#,##0.00';
        }
      }
    }
  });
}

/**
 * 创建使用说明工作表
 */
function createInstructionSheet(groups: ImportDataGroup[], XLSX: any) {
  const instructions = [
    ['薪资数据导入模板使用说明'],
    [''],
    ['一、基本说明'],
    ['1. 本模板用于批量导入薪资相关数据'],
    ['2. 请按照模板格式填写数据，不要修改表头'],
    ['3. 员工标识（员工编号、姓名、身份证号）至少填写一个'],
    ['4. 带*号的字段为必填字段'],
    [''],
    ['二、包含的数据组'],
    ...groups.map((group, index) => [`${index + 1}. ${getGroupDescription(group)}`]),
    [''],
    ['三、数据格式说明'],
    ['1. 日期格式：YYYY-MM-DD（如：2025-01-15）'],
    ['2. 数字格式：直接填写数字，不要包含千分位符号'],
    ['3. 布尔值格式：是/否、true/false、1/0'],
    ['4. 文本格式：直接填写文本内容'],
    [''],
    ['四、注意事项'],
    ['1. 必填字段：表头带有*号的为必填字段'],
    ['2. 重复数据：系统会根据设置决定是更新还是跳过重复数据'],
    ['3. 员工匹配：优先使用员工编号，其次姓名，最后身份证号'],
    ['4. 数据验证：导入前会进行格式和业务规则验证'],
    [''],
    ['五、数据验证规则'],
    ['1. 员工信息必须在系统中存在'],
    ['2. 部门和职位名称必须与系统中的记录匹配'],
    ['3. 人员类别必须是系统中已配置的类别'],
    ['4. 日期范围必须合理（生效日期不能晚于失效日期）'],
    ['5. 数字字段不能为负数（除特殊说明外）'],
    [''],
    ['六、常见问题'],
    ['Q: 找不到员工怎么办？'],
    ['A: 确保员工编号、姓名或身份证号至少一个与系统中的记录完全匹配'],
    [''],
    ['Q: 日期格式错误？'],
    ['A: 使用YYYY-MM-DD格式，如2025-01-15，不要使用其他格式'],
    [''],
    ['Q: 数字格式错误？'],
    ['A: 直接输入数字，如8000.50，不要包含¥符号或千分位逗号'],
    [''],
    ['Q: 部门或职位找不到？'],
    ['A: 确保部门和职位名称与系统中完全一致，区分大小写'],
    [''],
    ['七、导入建议'],
    ['1. 建议先使用少量数据（1-5条）进行测试导入'],
    ['2. 大批量导入前请备份原有数据'],
    ['3. 导入过程中请勿关闭浏览器'],
    ['4. 如遇问题请联系系统管理员']
  ];

  const ws = XLSX.utils.aoa_to_sheet(instructions);
  
  // 设置列宽
  ws['!cols'] = [{ wch: 80 }];
  
  // 设置标题样式
  const titleCell = ws['A1'];
  if (titleCell) {
    titleCell.s = {
      font: { bold: true, sz: 16, color: { rgb: '000000' } },
      alignment: { horizontal: 'center' },
      fill: { fgColor: { rgb: 'E6F3FF' } }
    };
  }

  // 设置章节标题样式
  for (let i = 2; i < instructions.length; i++) {
    const instruction = instructions[i][0];
    if (instruction && /^[一二三四五六七]、/.test(instruction)) {
      const cellAddr = XLSX.utils.encode_cell({ r: i, c: 0 });
      const cell = ws[cellAddr];
      if (cell) {
        cell.s = {
          font: { bold: true, sz: 12, color: { rgb: '000000' } },
          fill: { fgColor: { rgb: 'F0F8FF' } }
        };
      }
    }
  }

  return ws;
}

/**
 * 获取数据组的工作表名称
 */
function getSheetName(group: ImportDataGroup): string {
  const names: Record<ImportDataGroup, string> = {
    [ImportDataGroup.EARNINGS]: '收入数据',
    [ImportDataGroup.CONTRIBUTION_BASES]: '缴费基数',
    [ImportDataGroup.CATEGORY_ASSIGNMENT]: '人员类别',
    [ImportDataGroup.JOB_ASSIGNMENT]: '职务信息',
    [ImportDataGroup.ALL]: '全部数据'
  };
  return names[group] || group;
}

/**
 * 获取数据组描述
 */
function getGroupDescription(group: ImportDataGroup): string {
  const descriptions: Record<ImportDataGroup, string> = {
    [ImportDataGroup.EARNINGS]: '收入数据 - 包含所有收入项目（基本工资、津贴、奖金等）',
    [ImportDataGroup.CONTRIBUTION_BASES]: '缴费基数 - 各类保险和公积金的缴费基数',
    [ImportDataGroup.CATEGORY_ASSIGNMENT]: '人员类别 - 员工的人员类别分配信息',
    [ImportDataGroup.JOB_ASSIGNMENT]: '职务信息 - 员工的部门、职位、职级信息',
    [ImportDataGroup.ALL]: '全部数据 - 包含以上所有数据类型'
  };
  return descriptions[group] || group;
}

/**
 * 生成文件名
 */
function generateFileName(config: TemplateConfig): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  
  let groupStr = '';
  if (config.groups.length === 1) {
    groupStr = getSheetName(config.groups[0]);
  } else if (config.groups.includes(ImportDataGroup.ALL)) {
    groupStr = '全部数据';
  } else {
    groupStr = '多组数据';
  }
  
  if (config.payPeriod) {
    const periodStr = `${config.payPeriod.year}年${String(config.payPeriod.month).padStart(2, '0')}月`;
    return `薪资导入模板_${groupStr}_${periodStr}_${dateStr}.xlsx`;
  }
  
  return `薪资导入模板_${groupStr}_${dateStr}.xlsx`;
}

export default useExcelTemplate;