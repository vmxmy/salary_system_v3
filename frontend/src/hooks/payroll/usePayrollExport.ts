import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import { useLoadingState } from '@/hooks/core/useLoadingState';
import * as XLSX from 'xlsx';
import type { Database } from '@/types/supabase';

// 导出配置
export interface ExportConfig {
  periodId?: string;
  departmentId?: string;
  employeeIds?: string[];
  status?: string;
  format?: 'xlsx' | 'csv' | 'json';
  filename?: string;
  includeDetails?: boolean;
  includeInsurance?: boolean;
  template?: string;
}

// 导出进度
export interface ExportProgress {
  phase: 'preparing' | 'fetching' | 'formatting' | 'generating' | 'completed' | 'error';
  total: number;
  processed: number;
  message?: string;
}

// 导出模板
export interface ExportTemplate {
  id: string;
  name: string;
  description?: string;
  fields: string[];
  format: 'xlsx' | 'csv';
  isDefault?: boolean;
}

// 查询键管理
export const payrollExportQueryKeys = {
  all: ['payroll-export'] as const,
  templates: () => [...payrollExportQueryKeys.all, 'templates'] as const,
  template: (id: string) => [...payrollExportQueryKeys.all, 'template', id] as const,
};

/**
 * 薪资导出 Hook
 * 提供薪资数据导出到 Excel、CSV、JSON 的功能
 */
export function usePayrollExport() {
  const { handleError } = useErrorHandler();
  const { loadingState, setLoading, withLoading } = useLoadingState();
  const queryClient = useQueryClient();
  
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    phase: 'preparing',
    total: 0,
    processed: 0
  });

  // 获取导出模板列表
  const useExportTemplates = () => {
    return useQuery({
      queryKey: payrollExportQueryKeys.templates(),
      queryFn: async () => {
        // TODO: 当 export_templates 表创建后，从数据库获取
        // 现在返回默认模板
        const defaultTemplates: ExportTemplate[] = [
          {
            id: 'default-full',
            name: '完整薪资报表',
            description: '包含所有薪资项目和五险一金明细',
            fields: ['employee_name', 'department_name', 'gross_pay', 'deductions', 'net_pay'],
            format: 'xlsx',
            isDefault: true
          },
          {
            id: 'default-summary',
            name: '薪资汇总表',
            description: '仅包含基本薪资信息',
            fields: ['employee_name', 'gross_pay', 'net_pay'],
            format: 'xlsx'
          },
          {
            id: 'default-insurance',
            name: '五险一金明细表',
            description: '员工五险一金缴纳明细',
            fields: ['employee_name', 'pension', 'medical', 'unemployment', 'injury', 'maternity', 'housing_fund'],
            format: 'xlsx'
          }
        ];
        return defaultTemplates;
      },
      staleTime: 30 * 60 * 1000 // 30分钟缓存
    });
  };

  // 获取薪资数据
  const fetchPayrollData = useCallback(async (config: ExportConfig) => {
    setExportProgress({ phase: 'fetching', total: 0, processed: 0, message: '正在获取数据...' });
    
    try {
      let query = supabase
        .from('view_payroll_summary')
        .select('*');

      // 应用过滤条件
      if (config.periodId) {
        query = query.eq('period_id', config.periodId);
      }
      if (config.departmentId) {
        query = query.eq('department_id', config.departmentId);
      }
      if (config.employeeIds && config.employeeIds.length > 0) {
        query = query.in('employee_id', config.employeeIds);
      }
      if (config.status) {
        query = query.eq('payroll_status', config.status as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      // 如果需要详情，获取薪资项目
      if (config.includeDetails && data) {
        const payrollIds = data.map(p => p.payroll_id);
        const { data: details, error: detailError } = await supabase
          .from('view_payroll_unified')
          .select('*')
          .in('payroll_id', payrollIds);

        if (detailError) throw detailError;

        // 合并详情数据
        return data.map(payroll => ({
          ...payroll,
          details: details?.filter(d => d.payroll_id === payroll.payroll_id) || []
        }));
      }

      return data || [];
    } catch (error) {
      handleError(error, { customMessage: '获取薪资数据失败' });
      throw error;
    }
  }, [handleError]);

  // 转换为 Excel 格式
  const transformToExcelFormat = useCallback((data: any[], config: ExportConfig) => {
    setExportProgress({ 
      phase: 'formatting', 
      total: data.length, 
      processed: 0, 
      message: '正在格式化数据...' 
    });

    return data.map((item, index) => {
      setExportProgress(prev => ({ ...prev, processed: index + 1 }));

      const row: any = {
        '序号': index + 1,
        '员工姓名': item.employee_name,
        '部门': item.department_name,
        '职位': item.position_name,
        '薪资月份': item.period_name || item.period_code,
        '应发工资': item.gross_pay,
        '扣款合计': item.total_deductions,
        '实发工资': item.net_pay,
        '状态': item.payroll_status
      };

      // 如果包含详情，添加薪资项目列
      if (config.includeDetails && item.details) {
        item.details.forEach((detail: any) => {
          row[detail.component_name] = detail.amount;
        });
      }

      return row;
    });
  }, []);

  // 导出到 Excel
  const exportToExcel = useCallback(async (config: ExportConfig) => {
    return withLoading('isExporting', async () => {
      try {
        setExportProgress({ phase: 'preparing', total: 0, processed: 0, message: '准备导出...' });

        // 1. 获取数据
        const data = await fetchPayrollData(config);

        if (!data || data.length === 0) {
          throw new Error('没有可导出的数据');
        }

        // 2. 转换格式
        const excelData = transformToExcelFormat(data, config);

        // 3. 生成 Excel 文件
        setExportProgress({ 
          phase: 'generating', 
          total: excelData.length, 
          processed: excelData.length, 
          message: '正在生成文件...' 
        });

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // 设置列宽
        const columnWidths = [
          { wch: 8 },  // 序号
          { wch: 12 }, // 员工姓名
          { wch: 15 }, // 部门
          { wch: 15 }, // 职位
          { wch: 12 }, // 薪资月份
          { wch: 12 }, // 应发工资
          { wch: 12 }, // 扣款合计
          { wch: 12 }, // 实发工资
          { wch: 10 }, // 状态
        ];
        worksheet['!cols'] = columnWidths;

        XLSX.utils.book_append_sheet(workbook, worksheet, '薪资数据');

        // 4. 下载文件
        const filename = config.filename || `薪资数据_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, filename);

        setExportProgress({ 
          phase: 'completed', 
          total: excelData.length, 
          processed: excelData.length, 
          message: '导出成功' 
        });

        return { success: true, count: excelData.length };
      } catch (error) {
        setExportProgress({ phase: 'error', total: 0, processed: 0, message: '导出失败' });
        handleError(error, { customMessage: '导出Excel失败' });
        throw error;
      }
    });
  }, [withLoading, fetchPayrollData, transformToExcelFormat, handleError]);

  // 导出到 CSV
  const exportToCSV = useCallback(async (config: ExportConfig) => {
    return withLoading('isExporting', async () => {
      try {
        setExportProgress({ phase: 'preparing', total: 0, processed: 0, message: '准备导出...' });

        // 1. 获取数据
        const data = await fetchPayrollData(config);

        if (!data || data.length === 0) {
          throw new Error('没有可导出的数据');
        }

        // 2. 转换格式
        const csvData = transformToExcelFormat(data, config);

        // 3. 生成 CSV 内容
        setExportProgress({ 
          phase: 'generating', 
          total: csvData.length, 
          processed: csvData.length, 
          message: '正在生成文件...' 
        });

        const headers = Object.keys(csvData[0]);
        const csvContent = [
          headers.join(','),
          ...csvData.map(row => 
            headers.map(header => {
              const value = row[header];
              // 处理包含逗号或引号的值
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            }).join(',')
          )
        ].join('\n');

        // 4. 下载文件
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', config.filename || `薪资数据_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setExportProgress({ 
          phase: 'completed', 
          total: csvData.length, 
          processed: csvData.length, 
          message: '导出成功' 
        });

        return { success: true, count: csvData.length };
      } catch (error) {
        setExportProgress({ phase: 'error', total: 0, processed: 0, message: '导出失败' });
        handleError(error, { customMessage: '导出CSV失败' });
        throw error;
      }
    });
  }, [withLoading, fetchPayrollData, transformToExcelFormat, handleError]);

  // 导出到 JSON
  const exportToJSON = useCallback(async (config: ExportConfig) => {
    return withLoading('isExporting', async () => {
      try {
        setExportProgress({ phase: 'preparing', total: 0, processed: 0, message: '准备导出...' });

        // 1. 获取数据
        const data = await fetchPayrollData(config);

        if (!data || data.length === 0) {
          throw new Error('没有可导出的数据');
        }

        // 2. 生成 JSON 文件
        setExportProgress({ 
          phase: 'generating', 
          total: data.length, 
          processed: data.length, 
          message: '正在生成文件...' 
        });

        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', config.filename || `薪资数据_${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setExportProgress({ 
          phase: 'completed', 
          total: data.length, 
          processed: data.length, 
          message: '导出成功' 
        });

        return { success: true, count: data.length };
      } catch (error) {
        setExportProgress({ phase: 'error', total: 0, processed: 0, message: '导出失败' });
        handleError(error, { customMessage: '导出JSON失败' });
        throw error;
      }
    });
  }, [withLoading, fetchPayrollData, handleError]);

  // 下载导出模板
  const downloadTemplate = useCallback(async () => {
    return withLoading('isDownloading', async () => {
      try {
        // 创建模板数据
        const templateData = [
          {
            '员工姓名': '示例员工',
            '身份证号': '110101199001011234',
            '部门': '技术部',
            '职位': '工程师',
            '基本工资': 10000,
            '岗位工资': 3000,
            '绩效奖金': 2000,
            '加班费': 500,
            '津贴': 1000,
            '补贴': 500
          }
        ];

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        
        // 设置列宽
        worksheet['!cols'] = [
          { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
          { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
          { wch: 12 }, { wch: 12 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, '薪资导入模板');
        XLSX.writeFile(workbook, '薪资导入模板.xlsx');

        return { success: true };
      } catch (error) {
        handleError(error, { customMessage: '下载模板失败' });
        throw error;
      }
    });
  }, [withLoading, handleError]);

  return {
    // 导出功能
    exportToExcel,
    exportToCSV,
    exportToJSON,
    downloadTemplate,
    
    // 模板管理
    templates: useExportTemplates(),
    
    // 导出进度
    exportProgress,
    
    // 加载状态
    loading: {
      isExporting: loadingState.isExporting,
      isDownloading: loadingState.isDownloading
    }
  };
}

// 导出便捷函数
export function useQuickExport() {
  const { exportToExcel, exportToCSV, loading } = usePayrollExport();

  const quickExportCurrentMonth = useCallback(async (format: 'xlsx' | 'csv' = 'xlsx') => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const config: ExportConfig = {
      filename: `薪资数据_${currentMonth}`,
      format
    };

    if (format === 'csv') {
      return exportToCSV(config);
    }
    return exportToExcel(config);
  }, [exportToExcel, exportToCSV]);

  return {
    quickExportCurrentMonth,
    loading
  };
}