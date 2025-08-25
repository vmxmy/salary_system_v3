/**
 * 基于ExcelJS的样式化Excel生成器
 * 支持丰富的单元格样式和格式化功能
 */

import * as ExcelJS from 'exceljs';
import type { 
  ExportTemplateConfig, 
  ExportSheetTemplate, 
  ExportFieldConfig 
} from '../config/export-templates';

export interface GenerateStyledExcelOptions {
  /** 模板配置 */
  template: ExportTemplateConfig;
  /** 数据集合，键为工作表标识符 */
  data: Record<string, any[]>;
  /** 是否包含空工作表 */
  includeEmptySheets?: boolean;
}

/**
 * 根据薪资项目获取对应的背景颜色
 * 返回ExcelJS兼容的颜色配置
 */
function getComponentCategoryColor(componentName: string, componentTypesMap: Map<string, string>, categoriesMap?: Map<string, string>): string {
  // 获取组件类型和分类
  const componentType = componentTypesMap.get(componentName) || '';
  const componentCategory = categoriesMap?.get(componentName) || '';
  
  // 根据数据库中的真实分类分配颜色（ARGB格式）
  let color: string;
  
  if (componentType === 'earning' || componentType === 'income') {
    // 收入类 (basic_salary + benefits) - 青灰绿色 #9CAFAA
    color = 'FF9CAFAA';
  } else if (componentType === 'deduction') {
    // 扣除类 - 按照数据库中的category字段分类
    switch (componentCategory) {
      case 'personal_tax':
        // 个人所得税 - 奶油色 #FBF3D5
        color = 'FFFBF3D5';
        break;
      case 'personal_insurance':
        // 个人保险扣缴 - 鼠尾草绿 #D6DAC8
        color = 'FFD6DAC8';
        break;
      case 'employer_insurance':
      case 'other_deductions':
      default:
        // 单位保险扣缴和其他扣除 - 玫瑰灰色 #D6A99D
        color = 'FFD6A99D';
        break;
    }
  } else {
    // 未知类型 - 默认灰色
    color = 'FFF5F5F5';
  }
  
  return color;
}

/**
 * 基于数据库分类的薪资项目排序函数
 * 使用数据库中的component_type和salary_category字段进行分组排序
 */
function sortComponentsByCategory(
  a: string, 
  b: string, 
  componentTypesMap: Map<string, string>,
  categoriesMap?: Map<string, string>
): number {
  // 获取组件类型和分类信息
  const aType = componentTypesMap.get(a) || '';
  const bType = componentTypesMap.get(b) || '';
  const aCategory = categoriesMap?.get(a) || '';
  const bCategory = categoriesMap?.get(b) || '';
  
  // 定义基于数据库字段的分类权重
  const getCategoryWeight = (type: string, category: string, componentName: string): number => {
    // 1. 收入类 (1000-2999)
    if (type === 'earning' || type === 'income') {
      switch (category) {
        case 'basic_salary': return 1000; // 基本工资类
        case 'benefits': return 2000;     // 奖金津贴类
        default: return 1500;             // 其他收入类
      }
    }
    
    // 2. 扣除类 (3000-6999) - 按用户要求分组
    if (type === 'deduction') {
      switch (category) {
        // 2.1 个人所得税 (3000-3999)
        case 'personal_tax': return 3000;
        
        // 2.2 个人扣缴类 (4000-4999) - 个人应缴费额，grouped together
        case 'personal_insurance': return 4000;
        
        // 2.3 单位扣缴类 (5000-5999) - 单位应缴费额，grouped together  
        case 'employer_insurance': return 5000;
        case 'other_deductions': return 5100;
        
        default: return 6000; // 未分类扣除项
      }
    }
    
    // 3. 未知类型 (9000+)
    return 9000;
  };
  
  // 获取权重
  const aWeight = getCategoryWeight(aType, aCategory, a);
  const bWeight = getCategoryWeight(bType, bCategory, b);
  
  // 按权重排序
  if (aWeight !== bWeight) {
    return aWeight - bWeight;
  }
  
  // 权重相同时按名称排序（中文排序）
  return a.localeCompare(b, 'zh-CN');
}

/**
 * 基于ExcelJS生成带样式的Excel文件
 */
export async function generateStyledExcelFromTemplate(
  options: GenerateStyledExcelOptions
): Promise<ArrayBuffer> {
  const { template, data, includeEmptySheets = false } = options;
  
  console.log('🎨 开始基于ExcelJS生成带样式的Excel:', template.name);
  console.log('📈 数据概览:', Object.entries(data).map(([key, items]) => 
    `${key}: ${items?.length || 0}条`
  ).join(', '));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = '薪资管理系统';
  workbook.lastModifiedBy = '系统自动生成';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  let sheetsCreated = 0;

  // 遍历模板中的每个工作表配置
  for (const [sheetKey, sheetConfig] of Object.entries(template.sheets)) {
    if (!sheetConfig.enabled) {
      console.log(`⏭️ 跳过已禁用的工作表: ${sheetConfig.sheetName}`);
      continue;
    }

    const sheetData = data[sheetKey] || [];
    
    // 检查是否有数据
    if (sheetData.length === 0) {
      if (includeEmptySheets) {
        console.log(`📋 创建空工作表: ${sheetConfig.sheetName}`);
        const emptySheet = createEmptyStyledSheet(workbook, sheetConfig);
        sheetsCreated++;
      } else {
        console.log(`⏭️ 跳过空数据工作表: ${sheetConfig.sheetName}`);
      }
      continue;
    }

    // 生成工作表数据
    console.log(`📋 生成工作表: ${sheetConfig.sheetName} (${sheetData.length}条数据)`);
    if (sheetConfig.pivotMode) {
      await createStyledPivotWorksheet(workbook, sheetConfig, sheetData);
    } else {
      await createStyledNormalWorksheet(workbook, sheetConfig, sheetData);
    }
    sheetsCreated++;
  }

  // 确保至少有一个工作表
  if (sheetsCreated === 0) {
    console.warn('⚠️ 没有创建任何工作表，创建默认说明工作表');
    const explanationSheet = workbook.addWorksheet('导出说明');
    explanationSheet.addRow(['说明', '当前选择的条件没有找到数据']);
    explanationSheet.addRow(['模板', template.name]);
    explanationSheet.addRow(['导出时间', new Date().toLocaleString('zh-CN')]);
    sheetsCreated++;
  }

  console.log(`✅ 成功创建 ${sheetsCreated} 个工作表`);
  
  // 生成Excel缓冲区
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

/**
 * 创建样式化的透视工作表
 */
async function createStyledPivotWorksheet(
  workbook: ExcelJS.Workbook,
  sheetConfig: ExportSheetTemplate,
  data: any[]
): Promise<void> {
  console.log('🔄 创建样式化透视格式工作表，薪资项目将作为列名');
  
  const worksheet = workbook.addWorksheet(sheetConfig.sheetName);
  
  // 1. 提取所有唯一的薪资项目名称和类型信息
  const salaryComponentsSet = new Set<string>();
  const componentTypesMap = new Map<string, string>();
  const componentCategoriesMap = new Map<string, string>();
  
  data.forEach(item => {
    if (item.component_name) {
      salaryComponentsSet.add(item.component_name);
      
      // 收集组件类型和分类信息
      if (item.component_type) {
        componentTypesMap.set(item.component_name, item.component_type);
      }
      if (item.component_category) {
        componentCategoriesMap.set(item.component_name, item.component_category);
      }
    }
  });
  
  // 按类别分组排序薪资项目
  const salaryComponents = Array.from(salaryComponentsSet).sort((a, b) => {
    return sortComponentsByCategory(a, b, componentTypesMap, componentCategoriesMap);
  });
  console.log(`📊 发现 ${salaryComponents.length} 个薪资项目(已按类别排序):`, salaryComponents);
  
  // 2. 将薪资明细数据按员工分组并转换为透视格式
  const employeeMap = new Map<string, any>();
  
  data.forEach(item => {
    const employeeKey = item.employee_id || item.payroll_id;
    if (!employeeKey) return;
    
    if (!employeeMap.has(employeeKey)) {
      employeeMap.set(employeeKey, {
        ...item,
        salaryComponents: {}
      });
    }
    
    const employee = employeeMap.get(employeeKey)!;
    let componentValue = item.component_value || item.item_amount || item.amount || 0;
    
    if (item.component_name && componentValue !== undefined) {
      employee.salaryComponents[item.component_name] = componentValue;
    }
  });
  
  // 3. 构建表头和列配置
  const headers: string[] = [];
  const columnWidths: number[] = [];
  
  // 添加固定列（前置列）
  sheetConfig.fields.forEach(field => {
    if (field.isFixed && !field.isSummary) {
      headers.push(field.label);
      columnWidths.push(field.width);
    }
  });
  
  // 添加动态薪资项目列
  salaryComponents.forEach(componentName => {
    headers.push(componentName);
    columnWidths.push(12);
  });
  
  // 添加汇总列（后置列）
  sheetConfig.fields.forEach(field => {
    if (field.isFixed && field.isSummary) {
      headers.push(field.label);
      columnWidths.push(field.width);
    }
  });
  
  // 4. 设置列宽
  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });
  
  // 5. 添加表头行并设置样式
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 25;
  
  headers.forEach((header, colIndex) => {
    const cell = headerRow.getCell(colIndex + 1);
    
    // 设置基础样式
    cell.font = {
      bold: true,
      size: 11,
      name: '微软雅黑'
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    
    // 设置背景色
    let backgroundColor = 'FFFFFFFF'; // 默认白色
    
    const fixedColumnNames = ['序号', '员工姓名', '部门', '职位', '薪资月份'];
    const summaryColumnNames = ['应发合计', '扣款合计', '实发工资'];
    
    if (fixedColumnNames.includes(header)) {
      backgroundColor = 'FFD9D9D9'; // 固定列使用灰色
    } else if (summaryColumnNames.includes(header)) {
      backgroundColor = 'FFFFFF99'; // 汇总列使用黄色
    } else {
      // 动态薪资项目列使用分类颜色
      backgroundColor = getComponentCategoryColor(header, componentTypesMap, componentCategoriesMap);
    }
    
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: backgroundColor }
    };
    
    console.log(`🎨 设置 "${header}" 列背景色: ${backgroundColor}`);
  });
  
  // 6. 添加数据行
  const pivotData = Array.from(employeeMap.values());
  pivotData.forEach((employee, index) => {
    const rowData: any[] = [];
    
    // 固定列数据
    sheetConfig.fields.forEach(field => {
      if (field.isFixed && !field.isSummary) {
        let value = extractFieldValue(employee, field, index);
        if (field.formatter) {
          const formatterLength = field.formatter.length;
          if (formatterLength >= 3) {
            value = field.formatter(value, employee, index);
          } else {
            value = field.formatter(value, employee);
          }
        }
        rowData.push(value);
      }
    });
    
    // 动态薪资项目数据
    salaryComponents.forEach(componentName => {
      const value = employee.salaryComponents[componentName] || 0;
      rowData.push(value);
    });
    
    // 汇总列数据
    sheetConfig.fields.forEach(field => {
      if (field.isFixed && field.isSummary) {
        let value = extractFieldValue(employee, field, index);
        if (field.formatter) {
          const formatterLength = field.formatter.length;
          if (formatterLength >= 3) {
            value = field.formatter(value, employee, index);
          } else {
            value = field.formatter(value, employee);
          }
        }
        rowData.push(value);
      }
    });
    
    const dataRow = worksheet.addRow(rowData);
    
    // 设置数据行样式
    dataRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.font = {
        name: '微软雅黑',
        size: 10
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
    });
  });
  
  console.log(`✅ 样式化透视工作表创建完成: ${pivotData.length} 行数据，${headers.length} 列`);
}

/**
 * 创建样式化的普通工作表
 */
async function createStyledNormalWorksheet(
  workbook: ExcelJS.Workbook,
  sheetConfig: ExportSheetTemplate,
  data: any[]
): Promise<void> {
  const worksheet = workbook.addWorksheet(sheetConfig.sheetName);
  
  // 设置列宽和表头
  const headers = sheetConfig.fields.map(field => field.label);
  sheetConfig.fields.forEach((field, index) => {
    worksheet.getColumn(index + 1).width = field.width;
  });
  
  // 添加表头行并设置样式
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 25;
  
  headerRow.eachCell((cell) => {
    cell.font = {
      bold: true,
      size: 11,
      name: '微软雅黑'
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // 添加数据行
  data.forEach((item, index) => {
    const rowData = sheetConfig.fields.map(field => {
      let value = extractFieldValue(item, field, index);
      if (field.formatter) {
        const formatterLength = field.formatter.length;
        if (formatterLength >= 3) {
          value = field.formatter(value, item, index);
        } else {
          value = field.formatter(value, item);
        }
      }
      return value;
    });
    
    const dataRow = worksheet.addRow(rowData);
    
    // 设置数据行样式
    dataRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.font = {
        name: '微软雅黑',
        size: 10
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
    });
  });
}

/**
 * 创建空的样式化工作表
 */
function createEmptyStyledSheet(
  workbook: ExcelJS.Workbook,
  sheetConfig: ExportSheetTemplate
): void {
  const worksheet = workbook.addWorksheet(sheetConfig.sheetName);
  
  if (sheetConfig.pivotMode) {
    // 透视模式的空工作表只包含固定列的表头
    const headers = sheetConfig.fields
      .filter(field => field.isFixed)
      .map(field => field.label);
    headers.push('说明');
    
    const headerRow = worksheet.addRow(headers);
    const explanationRow = worksheet.addRow(['', '', '', '', '', '无数据时无法显示动态薪资项目列']);
    
    // 设置样式
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' }
      };
    });
  } else {
    // 普通模式的空工作表
    const headers = sheetConfig.fields.map(field => field.label);
    const headerRow = worksheet.addRow(headers);
    
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' }
      };
    });
  }
}

/**
 * 提取字段值
 */
function extractFieldValue(
  item: any, 
  field: ExportFieldConfig, 
  index: number
): any {
  // 特殊字段处理
  if (field.dataPath === '_index') {
    return index + 1;
  }

  // 支持嵌套字段路径
  const keys = field.dataPath.split('.');
  let value = item;
  
  for (const key of keys) {
    if (value === null || value === undefined) {
      break;
    }
    value = value[key];
  }

  // 处理默认值
  if (value === undefined || value === null) {
    if (field.required) {
      console.warn(`⚠️ 必需字段 ${field.label}(${field.dataPath}) 值为空`);
    }
    return '';
  }

  return value;
}

/**
 * 生成文件名
 */
export function generateStyledFileName(
  template: ExportTemplateConfig,
  periodId: string,
  format: string = 'xlsx'
): string {
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
  return `${template.filePrefix}_${periodId}_${timestamp}.${format}`;
}