import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { ImportDataGroup } from '@/types/payroll-import';
import type { FieldMapping } from '@/types/payroll-import';
import { ImportTemplateService } from '@/services/import-template.service';
import { supabase } from '@/lib/supabase';

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
  generateTemplate: (config: TemplateConfig) => Promise<XLSX.WorkBook>;
  downloadTemplate: (config: TemplateConfig) => Promise<void>;
}

export const useExcelTemplate = (): UseExcelTemplateReturn => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 生成Excel模板
   */
  const generateTemplate = useCallback(async (config: TemplateConfig) => {
    setGenerating(true);
    setError(null);

    try {
      // 创建新的工作簿
      const workbook = XLSX.utils.book_new();

      // 为每个数据组创建工作表
      for (const group of config.groups) {
        const sheetData = await generateSheetData(group, config);
        const worksheet = XLSX.utils.json_to_sheet(sheetData.data, {
          header: sheetData.headers
        });

        // 设置列宽
        worksheet['!cols'] = sheetData.colWidths;

        // 添加数据验证和格式
        applySheetFormatting(worksheet, sheetData.mappings);

        // 添加工作表到工作簿
        const sheetName = getSheetName(group);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }

      // 添加说明工作表
      const instructionSheet = createInstructionSheet(config.groups);
      XLSX.utils.book_append_sheet(workbook, instructionSheet, '使用说明');

      return workbook;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '生成模板失败';
      setError(errorMessage);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  /**
   * 下载Excel模板
   */
  const downloadTemplate = useCallback(async (config: TemplateConfig) => {
    try {
      const workbook = await generateTemplate(config);
      
      // 生成文件名
      const fileName = generateFileName(config);
      
      // 下载文件
      XLSX.writeFile(workbook, fileName);
      
    } catch (err) {
      console.error('下载模板失败:', err);
    }
  }, [generateTemplate]);

  return {
    generating,
    error,
    generateTemplate,
    downloadTemplate
  };
};

/**
 * 生成工作表数据
 */
async function generateSheetData(group: ImportDataGroup, config: TemplateConfig) {
  const mappings = await ImportTemplateService.getFieldMappings(group);
  const headers = mappings.map(m => m.excelColumn);
  
  let data = [];
  
  if (config.includeExample) {
    // 添加示例数据
    const samples = await ImportTemplateService.generateSampleData(group);
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

/**
 * 应用工作表格式
 */
function applySheetFormatting(worksheet: XLSX.WorkSheet, mappings: FieldMapping[]) {
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
function createInstructionSheet(groups: ImportDataGroup[]): XLSX.WorkSheet {
  const instructions = [
    ['薪资数据导入模板使用说明'],
    [''],
    ['一、基本说明'],
    ['1. 本模板用于批量导入薪资相关数据'],
    ['2. 请按照模板格式填写数据，不要修改表头'],
    ['3. 员工标识（员工编号、姓名、身份证号）至少填写一个'],
    [''],
    ['二、包含的数据组'],
    ...groups.map((group, index) => [`${index + 1}. ${getGroupDescription(group)}`]),
    [''],
    ['三、注意事项'],
    ['1. 日期格式：YYYY-MM-DD'],
    ['2. 数字格式：直接填写数字，不要包含千分位符号'],
    ['3. 必填字段：表头带有*号的为必填字段'],
    ['4. 重复数据：系统会根据设置决定是更新还是跳过重复数据'],
    [''],
    ['四、数据验证'],
    ['1. 导入前会进行数据格式验证'],
    ['2. 无效数据会在导入结果中显示错误信息'],
    ['3. 建议先使用少量数据测试导入'],
    [''],
    ['五、常见问题'],
    ['Q: 找不到员工怎么办？'],
    ['A: 确保员工编号、姓名或身份证号至少一个与系统中的记录匹配'],
    [''],
    ['Q: 日期格式错误？'],
    ['A: 使用YYYY-MM-DD格式，如2025-01-15'],
    [''],
    ['Q: 数字格式错误？'],
    ['A: 直接输入数字，不要包含¥符号或千分位逗号']
  ];

  const ws = XLSX.utils.aoa_to_sheet(instructions);
  
  // 设置列宽
  ws['!cols'] = [{ wch: 80 }];
  
  // 设置标题样式
  const titleCell = ws['A1'];
  if (titleCell) {
    titleCell.s = {
      font: { bold: true, sz: 14 },
      alignment: { horizontal: 'center' }
    };
  }

  // 合并标题单元格
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }];

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
    [ImportDataGroup.ALL]: '全部数据 - 包含以上所有数据'
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