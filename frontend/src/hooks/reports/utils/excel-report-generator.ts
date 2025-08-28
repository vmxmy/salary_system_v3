/**
 * 报表Excel生成器
 * 用于报表管理系统生成真正的Excel文件
 */

import * as ExcelJS from 'exceljs';

export interface ReportExcelData {
  templateName: string;
  periodName?: string;
  data: any[];
  fieldMappings: Array<{
    field_key: string;
    display_name: string;
    field_type: string;
    visible: boolean;
    sort_order: number;
  }>;
}

export interface ExcelGenerationResult {
  buffer: ArrayBuffer;
  fileName: string;
  fileSize: number;
  recordCount: number;
}

/**
 * 生成报表Excel文件
 */
export async function generateReportExcel(
  reportData: ReportExcelData
): Promise<ExcelGenerationResult> {
  const { templateName, periodName, data, fieldMappings } = reportData;
  
  // 创建工作簿
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '薪资管理系统';
  workbook.lastModifiedBy = '报表生成器';
  workbook.created = new Date();
  workbook.modified = new Date();

  // 获取可见字段并按排序顺序排列
  const visibleFields = fieldMappings
    .filter(field => field.visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (visibleFields.length === 0) {
    throw new Error('没有可见的字段用于生成报表');
  }

  // 创建工作表
  const worksheet = workbook.addWorksheet('报表数据');

  // 设置表头
  const headerRow = worksheet.getRow(1);
  visibleFields.forEach((field, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = field.display_name;
    
    // 设置表头样式
    cell.style = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };
  });

  // 设置表头行高
  headerRow.height = 25;

  // 添加数据行
  data.forEach((record, rowIndex) => {
    const dataRow = worksheet.getRow(rowIndex + 2);
    
    visibleFields.forEach((field, colIndex) => {
      const cell = dataRow.getCell(colIndex + 1);
      const value = getFieldValue(record, field);
      cell.value = formatFieldValue(value, field.field_type);
      
      // 设置数据行样式
      cell.style = {
        alignment: getFieldAlignment(field.field_type),
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        },
        numFmt: getFieldNumberFormat(field.field_type)
      };

      // 交替行背景色
      if (rowIndex % 2 === 1) {
        cell.style.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8F9FA' }
        };
      }
    });
  });

  // 设置列宽
  visibleFields.forEach((field, index) => {
    const column = worksheet.getColumn(index + 1);
    column.width = getFieldColumnWidth(field.field_type, field.display_name);
  });

  // 添加汇总信息工作表
  const summarySheet = workbook.addWorksheet('生成信息');
  const summaryData = [
    ['报表名称', templateName],
    ['生成时间', new Date().toLocaleString('zh-CN')],
    ['数据期间', periodName || '全部'],
    ['记录数量', data.length],
    ['字段数量', visibleFields.length]
  ];

  summaryData.forEach((row, index) => {
    const summaryRow = summarySheet.getRow(index + 1);
    summaryRow.getCell(1).value = row[0];
    summaryRow.getCell(2).value = row[1];
    
    // 设置汇总信息样式
    summaryRow.getCell(1).style = {
      font: { bold: true },
      alignment: { horizontal: 'right' }
    };
  });

  summarySheet.getColumn(1).width = 15;
  summarySheet.getColumn(2).width = 30;

  // 生成缓冲区
  const buffer = await workbook.xlsx.writeBuffer();
  
  // 生成文件名
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
  const fileName = `报表_${templateName}_${timestamp}.xlsx`;

  return {
    buffer: buffer as ArrayBuffer,
    fileName,
    fileSize: buffer.byteLength,
    recordCount: data.length
  };
}

/**
 * 从记录中提取字段值
 */
function getFieldValue(record: any, field: { field_key: string }): any {
  return record[field.field_key] ?? '';
}

/**
 * 格式化字段值
 */
function formatFieldValue(value: any, fieldType: string): any {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  switch (fieldType) {
    case 'currency':
      const numValue = parseFloat(value);
      return isNaN(numValue) ? 0 : numValue;
      
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
      
    case 'date':
      if (value instanceof Date) {
        return value;
      }
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date;
      
    case 'datetime':
      if (value instanceof Date) {
        return value;
      }
      const datetime = new Date(value);
      return isNaN(datetime.getTime()) ? value : datetime;
      
    case 'boolean':
      return value ? '是' : '否';
      
    default:
      return String(value);
  }
}

/**
 * 获取字段对齐方式
 */
function getFieldAlignment(fieldType: string): Partial<ExcelJS.Alignment> {
  switch (fieldType) {
    case 'currency':
    case 'number':
      return { horizontal: 'right', vertical: 'middle' };
    case 'date':
    case 'datetime':
      return { horizontal: 'center', vertical: 'middle' };
    default:
      return { horizontal: 'left', vertical: 'middle' };
  }
}

/**
 * 获取字段数字格式
 */
function getFieldNumberFormat(fieldType: string): string {
  switch (fieldType) {
    case 'currency':
      return '#,##0.00"元"';
    case 'number':
      return '#,##0.00';
    case 'date':
      return 'yyyy-mm-dd';
    case 'datetime':
      return 'yyyy-mm-dd hh:mm:ss';
    default:
      return 'General';
  }
}

/**
 * 获取字段列宽
 */
function getFieldColumnWidth(fieldType: string, displayName: string): number {
  switch (fieldType) {
    case 'currency':
    case 'number':
      return 12;
    case 'date':
      return 12;
    case 'datetime':
      return 18;
    default:
      // 根据显示名称长度动态计算
      const nameLength = displayName ? displayName.length : 8;
      return Math.max(8, Math.min(25, nameLength * 1.5));
  }
}