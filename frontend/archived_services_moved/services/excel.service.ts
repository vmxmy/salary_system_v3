import type { DepartmentNode } from '@/types/department';

export interface ExcelImportResult {
  success: boolean;
  totalRows: number;
  successRows: number;
  errorRows: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  data?: Array<{
    name: string;
    code: string;
    parent_code: string;
    manager: string;
    description: string;
  }>;
}

export interface ExcelExportOptions {
  filename?: string;
  format?: 'csv' | 'xlsx';
  includeHeaders?: boolean;
}

// 部门字段映射
const DEPARTMENT_FIELDS = {
  name: { header: '部门名称', required: true, validator: (value: string) => value.trim().length > 0 },
  code: { header: '部门代码', required: true, validator: (value: string) => /^[A-Z0-9_]+$/.test(value) },
  parent_code: { header: '上级部门代码', required: false, validator: (value: string) => !value || /^[A-Z0-9_]+$/.test(value) },
  manager: { header: '部门经理', required: false, validator: () => true },
  description: { header: '部门描述', required: false, validator: () => true }
};

export class ExcelService {
  /**
   * 解析CSV内容
   */
  private static parseCSV(csvContent: string): string[][] {
    const rows: string[][] = [];
    const lines = csvContent.split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        // 简单的CSV解析，支持引号包围的字段
        const fields: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        fields.push(current.trim());
        rows.push(fields.map(field => field.replace(/^"(.*)"$/, '$1')));
      }
    }
    
    return rows;
  }

  /**
   * 验证部门数据
   */
  private static validateDepartmentData(data: any[], existingCodes: Set<string> = new Set()): ExcelImportResult['errors'] {
    const errors: ExcelImportResult['errors'] = [];
    const newCodes = new Set<string>();

    data.forEach((row, index) => {
      const rowNum = index + 2; // 从第2行开始（第1行是标题）

      // 验证必填字段
      Object.entries(DEPARTMENT_FIELDS).forEach(([field, config]) => {
        const value = row[field]?.toString().trim() || '';
        
        if (config.required && !value) {
          errors.push({
            row: rowNum,
            field: config.header,
            message: `${config.header}不能为空`
          });
        } else if (value && !config.validator(value)) {
          errors.push({
            row: rowNum,
            field: config.header,
            message: `${config.header}格式不正确`
          });
        }
      });

      // 检查部门代码重复
      const code = row.code?.toString().trim();
      if (code) {
        if (existingCodes.has(code) || newCodes.has(code)) {
          errors.push({
            row: rowNum,
            field: '部门代码',
            message: '部门代码已存在或重复'
          });
        } else {
          newCodes.add(code);
        }
      }

      // 验证上级部门代码存在性
      const parentCode = row.parent_code?.toString().trim();
      if (parentCode && !existingCodes.has(parentCode) && !newCodes.has(parentCode)) {
        errors.push({
          row: rowNum,
          field: '上级部门代码',
          message: '上级部门代码不存在'
        });
      }
    });

    return errors;
  }

  /**
   * 导入部门数据
   */
  static async importDepartments(
    file: File, 
    existingDepartments: DepartmentNode[] = []
  ): Promise<ExcelImportResult> {
    try {
      // 获取现有部门代码
      const existingCodes = new Set(
        existingDepartments.map(dept => dept.code).filter(Boolean) as string[]
      );

      return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const rows = this.parseCSV(content);
            
            if (rows.length < 2) {
              resolve({
                success: false,
                totalRows: 0,
                successRows: 0,
                errorRows: 0,
                errors: [{ row: 1, field: '文件', message: '文件内容为空或格式错误' }]
              });
              return;
            }

            // 验证标题行
            const headers = rows[0];
            const requiredHeaders = Object.values(DEPARTMENT_FIELDS).map(f => f.header);
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            
            if (missingHeaders.length > 0) {
              resolve({
                success: false,
                totalRows: 0,
                successRows: 0,
                errorRows: 0,
                errors: [{ 
                  row: 1, 
                  field: '标题行', 
                  message: `缺少必要的列：${missingHeaders.join(', ')}` 
                }]
              });
              return;
            }

            // 解析数据行
            const dataRows = rows.slice(1);
            const data = dataRows.map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                const field = Object.keys(DEPARTMENT_FIELDS).find(
                  key => DEPARTMENT_FIELDS[key as keyof typeof DEPARTMENT_FIELDS].header === header
                );
                if (field) {
                  obj[field] = row[index] || '';
                }
              });
              return obj;
            });

            // 验证数据
            const errors = this.validateDepartmentData(data, existingCodes);
            
            resolve({
              success: errors.length === 0,
              totalRows: data.length,
              successRows: data.length - errors.length,
              errorRows: errors.length,
              errors,
              data: errors.length === 0 ? data : undefined
            });
          } catch (error) {
            resolve({
              success: false,
              totalRows: 0,
              successRows: 0,
              errorRows: 0,
              errors: [{ row: 1, field: '文件', message: '文件解析失败' }]
            });
          }
        };

        reader.onerror = () => {
          resolve({
            success: false,
            totalRows: 0,
            successRows: 0,
            errorRows: 0,
            errors: [{ row: 1, field: '文件', message: '文件读取失败' }]
          });
        };

        reader.readAsText(file, 'UTF-8');
      });
    } catch (error) {
      return {
        success: false,
        totalRows: 0,
        successRows: 0,
        errorRows: 0,
        errors: [{ row: 1, field: '文件', message: '处理文件时发生错误' }]
      };
    }
  }

  /**
   * 导出部门数据
   */
  static exportDepartments(
    departments: DepartmentNode[],
    options: ExcelExportOptions = {}
  ): void {
    const {
      filename = `部门数据_${new Date().toISOString().split('T')[0]}.csv`,
      format = 'csv',
      includeHeaders = true
    } = options;

    // 扁平化部门数据
    const flattenDepartments = (deps: DepartmentNode[], parentCode = ''): any[] => {
      const result: any[] = [];
      
      deps.forEach(dept => {
        result.push({
          name: dept.name,
          code: dept.code || '',
          parent_code: parentCode,
          manager: dept.manager || '',
          description: dept.description || ''
        });
        
        if (dept.children && dept.children.length > 0) {
          result.push(...flattenDepartments(dept.children, dept.code || ''));
        }
      });
      
      return result;
    };

    const data = flattenDepartments(departments);

    // 生成CSV内容
    const headers = Object.values(DEPARTMENT_FIELDS).map(f => f.header);
    const rows = data.map(item => 
      Object.keys(DEPARTMENT_FIELDS).map(field => {
        const value = item[field] || '';
        // 如果包含逗号或引号，需要用引号包围
        return value.includes(',') || value.includes('"') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      })
    );

    const csvContent = [
      ...(includeHeaders ? [headers] : []),
      ...rows
    ].map(row => row.join(',')).join('\n');

    // 创建下载
    const blob = new Blob(['\ufeff' + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 生成导入模板
   */
  static downloadTemplate(): void {
    const templateData = [
      {
        name: '技术部',
        code: 'TECH',
        parent_code: '',
        manager: '张三',
        description: '负责技术开发工作'
      },
      {
        name: '前端组',
        code: 'FRONTEND',
        parent_code: 'TECH',
        manager: '李四',
        description: '前端开发团队'
      },
      {
        name: '后端组',
        code: 'BACKEND',
        parent_code: 'TECH',
        manager: '王五',
        description: '后端开发团队'
      },
      {
        name: '市场部',
        code: 'MARKET',
        parent_code: '',
        manager: '赵六',
        description: '市场营销部门'
      }
    ];

    // 创建模板内容
    const headers = Object.values(DEPARTMENT_FIELDS).map(f => f.header);
    const rows = templateData.map(item => 
      Object.keys(DEPARTMENT_FIELDS).map(field => item[field as keyof typeof item] || '')
    );

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // 下载模板
    const blob = new Blob(['\ufeff' + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '部门导入模板.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}