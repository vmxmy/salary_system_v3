/**
 * 基于配置的Excel生成器
 * 使用模板配置文件生成Excel，实现配置与逻辑分离
 */

import * as XLSX from 'xlsx';
import type { 
  ExportTemplateConfig, 
  ExportSheetTemplate, 
  ExportFieldConfig 
} from '../config/export-templates';

export interface GenerateExcelOptions {
  /** 模板配置 */
  template: ExportTemplateConfig;
  /** 数据集合，键为工作表标识符 */
  data: Record<string, any[]>;
  /** 是否包含空工作表 */
  includeEmptySheets?: boolean;
}

/**
 * 根据薪资项目获取对应的背景颜色
 * 返回Excel兼容的十六进制颜色代码
 */
function getComponentCategoryColor(componentName: string, componentTypesMap: Map<string, string>, categoriesMap?: Map<string, string>): string {
  // 获取组件类型和分类
  const componentType = componentTypesMap.get(componentName) || '';
  const componentCategory = categoriesMap?.get(componentName) || '';
  
  // 根据数据库中的真实分类分配颜色
  let color: string;
  
  if (componentType === 'earning' || componentType === 'income') {
    // 收入类 (basic_salary + benefits) - 青灰绿色 #9CAFAA
    color = '9CAFAA';
  } else if (componentType === 'deduction') {
    // 扣除类 - 按照数据库中的category字段分类
    switch (componentCategory) {
      case 'personal_tax':
        // 个人所得税 - 奶油色 #FBF3D5
        color = 'FBF3D5';
        break;
      case 'personal_insurance':
        // 个人保险扣缴 - 鼠尾草绿 #D6DAC8
        color = 'D6DAC8';
        break;
      case 'employer_insurance':
      case 'other_deductions':
      default:
        // 单位保险扣缴和其他扣除 - 玫瑰灰色 #D6A99D
        color = 'D6A99D';
        break;
    }
  } else {
    // 未知类型 - 默认灰色
    color = 'F5F5F5';
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
 * 基于配置生成Excel缓冲区
 */
export async function generateExcelFromTemplate(
  options: GenerateExcelOptions
): Promise<ArrayBuffer> {
  const { template, data, includeEmptySheets = false } = options;
  
  console.log('📊 开始基于模板生成Excel:', template.name);
  console.log('📈 数据概览:', Object.entries(data).map(([key, items]) => 
    `${key}: ${items?.length || 0}条`
  ).join(', '));

  const workbook = XLSX.utils.book_new();
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
        const emptySheet = createEmptySheet(sheetConfig);
        XLSX.utils.book_append_sheet(workbook, emptySheet, sheetConfig.sheetName);
        sheetsCreated++;
      } else {
        console.log(`⏭️ 跳过空数据工作表: ${sheetConfig.sheetName}`);
      }
      continue;
    }

    // 生成工作表数据
    console.log(`📋 生成工作表: ${sheetConfig.sheetName} (${sheetData.length}条数据)`);
    const worksheet = createWorksheet(sheetConfig, sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetConfig.sheetName);
    sheetsCreated++;
  }

  // 确保至少有一个工作表
  if (sheetsCreated === 0) {
    console.warn('⚠️ 没有创建任何工作表，创建默认说明工作表');
    const explanationSheet = XLSX.utils.json_to_sheet([{
      '说明': '当前选择的条件没有找到数据',
      '模板': template.name,
      '导出时间': new Date().toLocaleString('zh-CN')
    }]);
    XLSX.utils.book_append_sheet(workbook, explanationSheet, '导出说明');
    sheetsCreated++;
  }

  console.log(`✅ 成功创建 ${sheetsCreated} 个工作表`);

  // 生成Excel缓冲区 - 启用单元格样式支持
  const buffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    cellStyles: true // 启用单元格样式支持
  });

  return buffer;
}

/**
 * 创建工作表
 */
function createWorksheet(
  sheetConfig: ExportSheetTemplate,
  data: any[]
): XLSX.WorkSheet {
  if (sheetConfig.pivotMode) {
    return createPivotWorksheet(sheetConfig, data);
  } else {
    return createNormalWorksheet(sheetConfig, data);
  }
}

/**
 * 创建普通工作表
 */
function createNormalWorksheet(
  sheetConfig: ExportSheetTemplate,
  data: any[]
): XLSX.WorkSheet {
  // 转换数据为Excel行格式
  const excelData = data.map((item, index) => {
    const row: any = {};
    
    for (const field of sheetConfig.fields) {
      let value = extractFieldValue(item, field, index);
      
      // 应用格式化函数
      if (field.formatter) {
        // 根据formatter函数的参数数量决定如何调用
        const formatterLength = field.formatter.length;
        if (formatterLength >= 3) {
          value = field.formatter(value, item, index);
        } else {
          value = field.formatter(value, item);
        }
      }
      
      row[field.label] = value;
    }
    
    return row;
  });

  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // 设置列宽
  const columnWidths = sheetConfig.fields.map(field => ({ wch: field.width }));
  worksheet['!cols'] = columnWidths;

  return worksheet;
}

/**
 * 创建透视工作表 - 薪资项目作为列名
 */
function createPivotWorksheet(
  sheetConfig: ExportSheetTemplate,
  data: any[]
): XLSX.WorkSheet {
  console.log('🔄 创建透视格式工作表，薪资项目将作为列名');
  
  // 1. 提取所有唯一的薪资项目名称和类型信息
  const salaryComponentsSet = new Set<string>();
  const componentTypesMap = new Map<string, string>(); // 存储组件类型信息
  const componentCategoriesMap = new Map<string, string>(); // 存储组件分类信息
  
  data.forEach(item => {
    // 薪资明细数据来自 view_payroll_unified 视图，包含 component_name 字段
    // 添加调试日志查看实际数据结构
    if (item.component_name) {
      salaryComponentsSet.add(item.component_name);
      
      // 收集组件类型和分类信息
      if (item.component_type) {
        componentTypesMap.set(item.component_name, item.component_type);
      }
      if (item.component_category) {
        componentCategoriesMap.set(item.component_name, item.component_category);
      }
    } else {
      // 调试：输出数据结构以识别字段名
      console.log('⚠️ 透视模式数据缺少component_name字段，实际字段:', Object.keys(item));
    }
  });
  
  // 按类别分组排序薪资项目
  const salaryComponents = Array.from(salaryComponentsSet).sort((a, b) => {
    return sortComponentsByCategory(a, b, componentTypesMap, componentCategoriesMap);
  });
  console.log(`📊 发现 ${salaryComponents.length} 个薪资项目(已按类别排序):`, salaryComponents);
  console.log(`📊 类别信息:`, Array.from(componentTypesMap.entries()));
  
  // 2. 将薪资明细数据按员工分组并转换为透视格式
  const employeeMap = new Map<string, any>();
  
  data.forEach(item => {
    const employeeKey = item.employee_id || item.payroll_id;
    if (!employeeKey) return;
    
    if (!employeeMap.has(employeeKey)) {
      // 初始化员工基础信息
      employeeMap.set(employeeKey, {
        ...item, // 包含员工基础信息
        salaryComponents: {} // 用于存储各薪资项目的值
      });
    }
    
    const employee = employeeMap.get(employeeKey)!;
    
    // 将薪资项目的值添加到对应的字段中
    // 检查多种可能的金额字段名
    let componentValue = item.component_value || item.item_amount || item.amount || 0;
    
    if (item.component_name && componentValue !== undefined) {
      employee.salaryComponents[item.component_name] = componentValue;
    }
  });
  
  // 3. 构建最终的Excel列配置
  const finalFields: ExportFieldConfig[] = [];
  const columnWidths: Array<{ wch: number }> = [];
  
  // 添加固定列（前置列）
  sheetConfig.fields.forEach(field => {
    if (field.isFixed && !field.isSummary) {
      finalFields.push(field);
      columnWidths.push({ wch: field.width });
    }
  });
  
  // 添加动态薪资项目列
  salaryComponents.forEach(componentName => {
    finalFields.push({
      label: componentName,
      dataPath: `salaryComponents.${componentName}`,
      width: 12,
      formatter: (value) => typeof value === 'number' ? value : 0
    });
    columnWidths.push({ wch: 12 });
  });
  
  // 添加汇总列（后置列）
  sheetConfig.fields.forEach(field => {
    if (field.isFixed && field.isSummary) {
      finalFields.push(field);
      columnWidths.push({ wch: field.width });
    }
  });
  
  console.log(`📋 最终列配置: ${finalFields.length} 列 (固定列 + ${salaryComponents.length} 个薪资项目 + 汇总列)`);
  
  // 4. 转换为Excel行数据
  const pivotData = Array.from(employeeMap.values()).map((employee, index) => {
    const row: any = {};
    
    finalFields.forEach(field => {
      let value = extractFieldValue(employee, field, index);
      
      // 应用格式化函数
      if (field.formatter) {
        const formatterLength = field.formatter.length;
        if (formatterLength >= 3) {
          value = field.formatter(value, employee, index);
        } else {
          value = field.formatter(value, employee);
        }
      }
      
      row[field.label] = value;
    });
    
    return row;
  });
  
  // 5. 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(pivotData);
  
  // 设置列宽
  worksheet['!cols'] = columnWidths;
  
  // 6. 设置表头单元格样式（背景色）
  if (pivotData.length > 0) {
    const headerCells = Object.keys(pivotData[0]); // 获取表头列名
    console.log(`🎨 开始为 ${headerCells.length} 个表头设置背景色`);
    
    headerCells.forEach((cellName, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex }); // 第一行(r=0)的各列
      
      // 确保单元格存在
      if (!worksheet[cellAddress]) {
        worksheet[cellAddress] = { t: 's', v: cellName };
      }
      
      // 获取背景色
      let backgroundColor = 'FFFFFF'; // 默认白色
      
      // 为固定列设置特殊背景色
      const fixedColumnNames = ['序号', '员工姓名', '部门', '职位', '薪资月份'];
      const summaryColumnNames = ['应发合计', '扣款合计', '实发工资'];
      
      if (fixedColumnNames.includes(cellName)) {
        backgroundColor = 'D9D9D9'; // 固定列使用灰色
      } else if (summaryColumnNames.includes(cellName)) {
        backgroundColor = 'FFFF99'; // 汇总列使用黄色
      } else {
        // 动态薪资项目列使用分类颜色
        backgroundColor = getComponentCategoryColor(cellName, componentTypesMap, componentCategoriesMap);
      }
      
      // 设置单元格样式
      if (!worksheet[cellAddress].s) {
        worksheet[cellAddress].s = {};
      }
      if (!worksheet[cellAddress].s.fill) {
        worksheet[cellAddress].s.fill = {};
      }
      
      worksheet[cellAddress].s.fill = {
        fgColor: { rgb: backgroundColor },
        patternType: 'solid'
      };
      
      // 设置字体样式（表头加粗）
      if (!worksheet[cellAddress].s.font) {
        worksheet[cellAddress].s.font = {};
      }
      worksheet[cellAddress].s.font.bold = true;
      
      console.log(`🎨 设置 "${cellName}" 列背景色: ${backgroundColor}`);
    });
  }
  
  console.log(`✅ 透视工作表创建完成: ${pivotData.length} 行数据，已设置表头样式`);
  return worksheet;
}

/**
 * 创建空工作表
 */
function createEmptySheet(sheetConfig: ExportSheetTemplate): XLSX.WorkSheet {
  if (sheetConfig.pivotMode) {
    // 透视模式的空工作表只包含固定列的表头
    const headerRow: any = {};
    const columnWidths: Array<{ wch: number }> = [];
    
    // 添加固定列
    sheetConfig.fields.forEach(field => {
      if (field.isFixed) {
        headerRow[field.label] = '';
        columnWidths.push({ wch: field.width });
      }
    });
    
    // 添加说明列
    headerRow['说明'] = '无数据时无法显示动态薪资项目列';
    columnWidths.push({ wch: 30 });
    
    const worksheet = XLSX.utils.json_to_sheet([headerRow]);
    worksheet['!cols'] = columnWidths;
    
    return worksheet;
  } else {
    // 普通模式的空工作表
    const headerRow: any = {};
    sheetConfig.fields.forEach(field => {
      headerRow[field.label] = '';
    });

    const worksheet = XLSX.utils.json_to_sheet([headerRow]);
    
    // 设置列宽
    const columnWidths = sheetConfig.fields.map(field => ({ wch: field.width }));
    worksheet['!cols'] = columnWidths;

    return worksheet;
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
export function generateFileName(
  template: ExportTemplateConfig,
  periodId: string,
  format: string = 'xlsx'
): string {
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
  return `${template.filePrefix}_${periodId}_${timestamp}.${format}`;
}

/**
 * 验证模板配置
 */
export function validateTemplate(template: ExportTemplateConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!template.name) {
    errors.push('模板名称不能为空');
  }

  if (!template.sheets || Object.keys(template.sheets).length === 0) {
    errors.push('模板必须包含至少一个工作表配置');
  }

  // 验证工作表配置
  for (const [sheetKey, sheetConfig] of Object.entries(template.sheets)) {
    if (!sheetConfig.sheetName) {
      errors.push(`工作表 ${sheetKey} 缺少工作表名称`);
    }

    if (!sheetConfig.fields || sheetConfig.fields.length === 0) {
      warnings.push(`工作表 ${sheetKey} 没有配置字段`);
      continue;
    }

    // 验证字段配置
    for (const [fieldIndex, field] of sheetConfig.fields.entries()) {
      if (!field.label) {
        errors.push(`工作表 ${sheetKey} 第 ${fieldIndex + 1} 个字段缺少标签`);
      }
      if (!field.dataPath) {
        errors.push(`工作表 ${sheetKey} 第 ${fieldIndex + 1} 个字段缺少数据路径`);
      }
      if (!field.width || field.width <= 0) {
        warnings.push(`工作表 ${sheetKey} 字段 ${field.label} 列宽配置异常`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}