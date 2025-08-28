/**
 * 报表Excel生成器
 * 使用官方ExcelJS库生成真正的Excel文件
 */

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
 * 生成Excel报表文件
 */
export async function generateReportExcel(
  reportData: ReportExcelData
): Promise<ExcelGenerationResult> {
  const { templateName, periodName, data, fieldMappings } = reportData;
  
  try {
    // 动态导入ExcelJS并创建工作簿
    const ExcelJS = await import('exceljs');
    
    let workbook: any = null;
    
    // 优先使用全局变量方式 (UMD模式，ExcelJS在浏览器中的主要模式)
    if (typeof window !== 'undefined' && (window as any).ExcelJS) {
      if ((window as any).ExcelJS.Workbook) {
        workbook = new (window as any).ExcelJS.Workbook();
      } else if (typeof (window as any).ExcelJS === 'function') {
        workbook = new (window as any).ExcelJS();
      }
    }
    
    // Fallback到ES模块方式
    if (!workbook && ExcelJS.default && (ExcelJS.default as any).Workbook) {
      workbook = new (ExcelJS.default as any).Workbook();
    }
    
    // Fallback到CommonJS方式
    if (!workbook && (ExcelJS as any).Workbook) {
      workbook = new (ExcelJS as any).Workbook();
    }
    
    // 最后的fallback
    if (!workbook && typeof ExcelJS.default === 'function') {
      workbook = new (ExcelJS.default as any)();
    }
    
    // 调试工具已归档 - archived/test-pages-20250828/debug-exceljs.ts
    // if (!workbook) {
    //   try {
    //     const debugModule = await import('@/utils/debug-exceljs');
    //     const result = await debugModule.getExcelJSWorkbook();
    //     if (result) {
    //       workbook = result.workbook;
    //     }
    //   } catch (error) {
    //     // 忽略调试工具加载错误
    //   }
    // }
    
    // 如果所有方法都失败，抛出错误
    if (!workbook) {
      throw new Error('无法创建ExcelJS工作簿，所有构造方法均失败');
    }
    
    // 设置工作簿属性
    workbook.creator = '薪资管理系统';
    workbook.lastModifiedBy = '薪资管理系统';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();
    
    // 创建工作表
    const worksheet = workbook.addWorksheet(templateName || '报表数据', {
      pageSetup: { 
        paperSize: 9, // A4
        orientation: 'landscape',
        horizontalCentered: true,
        verticalCentered: false
      },
      headerFooter: {
        firstHeader: `&C&B${templateName || '薪资报表'}`,
        firstFooter: '&L生成时间: &D &T&R第 &P 页 / 共 &N 页'
      }
    });
    
    // 获取可见字段并排序
    const visibleFields = fieldMappings
      .filter(field => field.visible)
      .sort((a, b) => a.sort_order - b.sort_order);
    
    if (visibleFields.length === 0) {
      throw new Error('没有可见的字段用于生成报表');
    }
    
    // 设置列定义
    worksheet.columns = visibleFields.map((field, index) => ({
      header: field.display_name,
      key: field.field_key,
      width: getColumnWidth(field.field_type, field.display_name),
      style: {
        alignment: { 
          horizontal: getAlignment(field.field_type),
          vertical: 'middle',
          wrapText: true
        }
      }
    }));
    
    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell: any) => {
      cell.style = {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F81BD' }
        },
        font: {
          name: '微软雅黑',
          color: { argb: 'FFFFFFFF' },
          bold: true,
          size: 12
        },
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        },
        border: {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        }
      };
    });
    
    // 添加数据行
    data.forEach((record, index) => {
      const row = worksheet.addRow({});
      visibleFields.forEach((field, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        const value = record[field.field_key] ?? '';
        
        // 根据字段类型设置值和格式
        switch (field.field_type) {
          case 'currency':
            cell.value = parseFloat(value) || 0;
            cell.numFmt = '¥#,##0.00';
            break;
          case 'number':
            cell.value = parseFloat(value) || 0;
            cell.numFmt = '#,##0.00';
            break;
          case 'date':
            if (value) {
              cell.value = new Date(value);
              cell.numFmt = 'yyyy-mm-dd';
            } else {
              cell.value = '';
            }
            break;
          case 'datetime':
            if (value) {
              cell.value = new Date(value);
              cell.numFmt = 'yyyy-mm-dd hh:mm:ss';
            } else {
              cell.value = '';
            }
            break;
          default:
            cell.value = String(value);
            break;
        }
        
        // 设置数据行样式
        cell.style = {
          font: {
            name: '微软雅黑',
            size: 10
          },
          alignment: {
            horizontal: getAlignment(field.field_type),
            vertical: 'middle',
            wrapText: true
          },
          border: {
            top: { style: 'thin', color: { argb: 'FFD0D7E5' } },
            left: { style: 'thin', color: { argb: 'FFD0D7E5' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D7E5' } },
            right: { style: 'thin', color: { argb: 'FFD0D7E5' } }
          },
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : 'FFF2F2F2' }
          }
        };
      });
      
      row.height = 20;
    });
    
    // 添加汇总信息
    const summaryStartRow = data.length + 3;
    
    // 添加空行
    worksheet.addRow([]);
    
    // 添加报表信息标题
    const infoTitleRow = worksheet.getRow(summaryStartRow);
    infoTitleRow.getCell(1).value = '报表生成信息';
    infoTitleRow.getCell(1).style = {
      font: {
        name: '微软雅黑',
        bold: true,
        size: 12,
        color: { argb: 'FF4F81BD' }
      },
      alignment: {
        horizontal: 'left',
        vertical: 'middle'
      }
    };
    
    // 添加报表信息
    const infoData = [
      ['报表名称', templateName || '未知报表'],
      ['生成时间', new Date().toLocaleString('zh-CN')],
      ['数据期间', periodName || '全部'],
      ['记录数量', data.length.toString()],
      ['字段数量', visibleFields.length.toString()]
    ];
    
    infoData.forEach((info, index) => {
      const row = worksheet.getRow(summaryStartRow + 1 + index);
      row.getCell(1).value = info[0];
      row.getCell(2).value = info[1];
      
      row.eachCell((cell: any, colNumber: number) => {
        if (colNumber <= 2) {
          cell.style = {
            font: {
              name: '微软雅黑',
              size: 9,
              bold: colNumber === 1
            },
            alignment: {
              horizontal: colNumber === 1 ? 'right' : 'left',
              vertical: 'middle'
            }
          };
        }
      });
    });
    
    // 自动调整列宽（基于内容）
    worksheet.columns.forEach((column: any, index: number) => {
      if (column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: false }, (cell: any) => {
          const cellLength = String(cell.value).length;
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        });
        
        // 设置最小和最大宽度
        const minWidth = 8;
        const maxWidth = 50;
        const calculatedWidth = Math.min(Math.max(maxLength + 2, minWidth), maxWidth);
        column.width = calculatedWidth;
      }
    });
    
    // 生成Excel文件缓冲区
    const buffer = await workbook.xlsx.writeBuffer();
    
    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
    const fileName = `${templateName}_${timestamp}.xlsx`;
    
    return {
      buffer: buffer as ArrayBuffer,
      fileName,
      fileSize: buffer.byteLength,
      recordCount: data.length
    };
    
  } catch (error) {
    console.error('Excel生成失败，使用CSV作为后备方案:', error);
    
    // 如果Excel生成失败，使用CSV作为后备
    return generateCSVFallback(reportData);
  }
}

/**
 * CSV后备方案
 */
async function generateCSVFallback(reportData: ReportExcelData): Promise<ExcelGenerationResult> {
  const { templateName, periodName, data, fieldMappings } = reportData;
  
  // 生成CSV内容
  const csvContent = generateCSVContent(data, fieldMappings, templateName, periodName);
  
  // 添加UTF-8 BOM以支持中文
  const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const encoder = new TextEncoder();
  const csvBytes = encoder.encode(csvContent);
  const result = new Uint8Array(BOM.length + csvBytes.length);
  result.set(BOM, 0);
  result.set(csvBytes, BOM.length);
  
  // 生成文件名
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
  const fileName = `${templateName}_${timestamp}.csv`;
  
  return {
    buffer: result.buffer,
    fileName,
    fileSize: result.byteLength,
    recordCount: data.length
  };
}

/**
 * 生成CSV内容
 */
function generateCSVContent(data: any[], fieldMappings: any[], templateName?: string, periodName?: string): string {
  const visibleFields = fieldMappings
    .filter(field => field.visible)
    .sort((a, b) => a.sort_order - b.sort_order);
  
  if (visibleFields.length === 0) {
    throw new Error('没有可见的字段用于生成报表');
  }
  
  // 生成表头
  const headers = visibleFields.map(field => `"${field.display_name}"`).join(',');
  
  // 生成数据行
  const rows = data.map(record => {
    return visibleFields.map(field => {
      const value = record[field.field_key] ?? '';
      // CSV转义：双引号需要转义为两个双引号
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });
  
  // 添加汇总信息
  const summaryRows = [
    '',
    '=== 报表生成信息 ===',
    `"报表名称","${templateName || '未知报表'}"`,
    `"生成时间","${new Date().toLocaleString('zh-CN')}"`,
    `"数据期间","${periodName || '全部'}"`,
    `"记录数量","${data.length}"`,
    `"字段数量","${visibleFields.length}"`
  ];
  
  return [headers, ...rows, ...summaryRows].join('\n');
}

/**
 * 根据字段类型获取列宽
 */
function getColumnWidth(fieldType: string, displayName: string): number {
  // 基于显示名称长度的基础宽度
  const nameLength = displayName.length;
  const baseWidth = Math.max(nameLength * 1.5, 8);
  
  // 根据字段类型调整
  switch (fieldType) {
    case 'currency':
      return Math.max(baseWidth, 12);
    case 'number':
      return Math.max(baseWidth, 10);
    case 'date':
      return Math.max(baseWidth, 12);
    case 'datetime':
      return Math.max(baseWidth, 18);
    case 'string':
    default:
      return Math.min(Math.max(baseWidth, 10), 30);
  }
}

/**
 * 根据字段类型获取对齐方式
 */
function getAlignment(fieldType: string): 'left' | 'center' | 'right' {
  switch (fieldType) {
    case 'currency':
    case 'number':
      return 'right';
    case 'date':
    case 'datetime':
      return 'center';
    case 'string':
    default:
      return 'left';
  }
}