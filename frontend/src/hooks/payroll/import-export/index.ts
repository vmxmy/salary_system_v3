import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import { ImportDataGroup } from '@/types/payroll-import';

// 导入所有模块
import type { 
  ImportTemplate, 
  ExcelDataRow, 
  ImportConfig, 
  ImportResult, 
  ExportConfig,
  ImportProgress
} from './types';
import { importExportQueryKeys } from './constants';
import { parseExcelFile, validateExcelFile } from './utils/excel-parser';
import { validateImportData } from './utils/validation';
import { analyzeFieldMapping } from './utils/field-mapping';
import { importPayrollItems } from './importers/payroll-items';
import { importCategoryAssignments } from './importers/category-assignments';
import { importJobAssignments } from './importers/job-assignments';
import { importContributionBases } from './importers/contribution-bases';
import { importDeductions } from './importers/deductions';
import { exportPayrollToExcel, generateImportTemplate } from './exporters/excel-exporter';
import { useImportProgress } from './hooks/useImportProgress';

/**
 * 获取导入模板列表 Hook
 */
export function useImportTemplates() {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: importExportQueryKeys.templates(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_templates' as any)
        .select('*')
        .eq('category', 'payroll')
        .eq('is_active', true)
        .order('name');

      if (error) {
        handleError(error, { customMessage: '获取导入模板失败' });
        throw error;
      }

      return data || [];
    },
    staleTime: 30 * 60 * 1000 // 30分钟缓存
  });
}

/**
 * 薪资导入导出 Hook
 */
export function usePayrollImportExport() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  
  // 使用进度管理hook
  const {
    importProgress,
    enhancedProgress,
    progressManager,
    initializeProgress,
    updateProgress,
    addError,
    addWarning,
    setPhase,
    setMessage,
    resetProgress,
    cancelImport,
    completeImport
  } = useImportProgress();

  // 主导入函数
  const importExcel = useMutation({
    mutationFn: async (params: {
      file: File;
      config: ImportConfig;
      periodId: string;
    }) => {
      const { file, config, periodId } = params;
      
      console.log('🚀 开始Excel导入流程');
      console.log('📋 导入配置:', config);
      console.log('🗂️ 文件信息:', { name: file.name, size: file.size });
      console.log('🆔 薪资周期ID:', periodId);

      try {
        // 1. 验证文件
        setPhase('parsing');
        setMessage('验证文件格式...');
        
        const fileValidation = validateExcelFile(file);
        if (!fileValidation.valid) {
          throw new Error(fileValidation.error);
        }

        // 2. 解析Excel文件
        setMessage('解析Excel文件...');
        const data = await parseExcelFile(file, Array.isArray(config.dataGroup) ? config.dataGroup[0] : config.dataGroup, (progress) => {
          updateProgress(progress);
        });

        if (!data || data.length === 0) {
          throw new Error('Excel文件为空或无有效数据');
        }

        console.log(`📊 解析完成，共 ${data.length} 行数据`);

        // 3. 验证数据
        setPhase('validating');
        setMessage('验证数据格式...');
        
        const validation = await validateImportData(data, config);
        if (!validation.isValid) {
          console.warn('⚠️ 数据验证发现问题:', validation.errors);
          // 添加验证错误到进度中
          validation.errors.forEach(error => addError(error));
        }

        // 4. 根据数据组执行相应的导入逻辑
        setPhase('importing');
        
        const globalProgressRef = { current: 0 };
        initializeProgress(data.length, [config.dataGroup as string]);
        
        let importResult: ImportResult;

        const dataGroup = Array.isArray(config.dataGroup) ? config.dataGroup[0] : config.dataGroup;
        switch (dataGroup) {
          case 'earnings':
            setMessage('导入薪资项目数据...');
            importResult = await importPayrollItems(
              data, 
              periodId, 
              { includeCategories: ['basic_salary', 'benefits', 'personal_tax', 'other_deductions'] },
              (progress) => updateProgress(progress),
              globalProgressRef
            );
            break;

          case 'category':
            setMessage('导入人员类别分配...');
            importResult = await importCategoryAssignments(
              data,
              periodId,
              (progress) => updateProgress(progress),
              globalProgressRef
            );
            break;

          case 'job':
            setMessage('导入职务分配数据...');
            importResult = await importJobAssignments(
              data,
              periodId,
              (progress) => updateProgress(progress),
              globalProgressRef
            );
            break;

          case 'bases':
            setMessage('导入缴费基数数据...');
            importResult = await importContributionBases(
              data,
              periodId,
              (progress) => updateProgress(progress),
              globalProgressRef
            );
            break;

          default:
            throw new Error(`不支持的数据组类型: ${config.dataGroup}`);
        }

        // 5. 完成导入
        completeImport({
          totalProcessed: importResult.totalRows,
          successCount: importResult.successCount,
          errorCount: importResult.failedCount
        });

        console.log('🎯 导入流程完成:', importResult);
        return importResult;

      } catch (error) {
        console.error('❌ 导入失败:', error);
        setPhase('error');
        setMessage(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
        addError({
          row: -1,
          message: error instanceof Error ? error.message : '未知错误'
        });
        throw error;
      }
    },
    onError: (error) => {
      handleError(error, { customMessage: '导入Excel文件失败' });
    },
    onSuccess: () => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    }
  });

  // 导出Excel
  const exportExcel = useMutation({
    mutationFn: async (config: ExportConfig) => {
      try {
        await exportPayrollToExcel(config);
        return { success: true };
      } catch (error) {
        console.error('❌ 导出失败:', error);
        throw error;
      }
    },
    onError: (error) => {
      handleError(error, { customMessage: '导出Excel文件失败' });
    }
  });

  // 下载导入模板
  const downloadTemplate = useMutation({
    mutationFn: async (params: { templateType: string }) => {
      try {
        await generateImportTemplate(params.templateType);
        return { success: true };
      } catch (error) {
        console.error('❌ 下载模板失败:', error);
        throw error;
      }
    },
    onError: (error) => {
      handleError(error, { customMessage: '下载模板失败' });
    }
  });

  // 分析Excel列名与数据库字段的匹配情况
  const analyzeFieldMappingCallback = useCallback(async (
    excelColumns: string[], 
    dataGroup?: ImportDataGroup
  ) => {
    return analyzeFieldMapping(excelColumns, dataGroup);
  }, []);

  return {
    // 状态
    importProgress,
    enhancedProgress,
    progressManager,

    // 操作方法
    importExcel,
    exportExcel,
    downloadTemplate,
    analyzeFieldMapping: analyzeFieldMappingCallback,
    
    // 进度控制
    resetProgress,
    cancelImport,
    
    // 加载状态
    isImporting: importExcel.isPending,
    isExporting: exportExcel.isPending,
    isDownloading: downloadTemplate.isPending
  };
}

// 重新导出所有类型和常量
export * from './types';
export * from './constants';
export { analyzeFieldMapping } from './utils/field-mapping';
export { parseExcelFile, validateExcelFile } from './utils/excel-parser';
export { validateImportData } from './utils/validation';