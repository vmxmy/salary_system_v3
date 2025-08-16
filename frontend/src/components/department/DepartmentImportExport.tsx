import React, { useState, useCallback, useRef } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { ModernButton } from '@/components/common/ModernButton';
import { useToast } from '@/contexts/ToastContext';
// Excel service types
interface ExcelImportResult {
  success: boolean;
  data?: any[];
  errors?: Array<{ row: number; field?: string; message: string }>;
  totalRows?: number;
  successCount?: number;
  errorCount?: number;
}
import { ResponsiveModal, ResponsiveButtonGroup, ResponsiveGrid } from '@/components/common/ResponsiveWrapper';
import { cn } from '@/lib/utils';
import type { DepartmentNode } from '@/types/department';

interface DepartmentImportExportProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'import' | 'export';
  departments?: DepartmentNode[];
  onImportComplete?: () => void;
}


export function DepartmentImportExport({
  isOpen,
  onClose,
  type,
  departments = [],
  onImportComplete
}: DepartmentImportExportProps) {
  const { showSuccess, showError, showWarning } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // DaisyUI classes for cards and buttons

  // 处理文件选择
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
        showError('请选择Excel文件（.xlsx、.xls或.csv格式）');
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  }, [showSuccess, showError]);


  // 处理导入
  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      showError('请先选择要导入的文件');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await ExcelService.importDepartments(selectedFile, departments);
      setImportResult(result);
      
      if (result.success) {
        showSuccess(`成功导入${result.successRows}个部门`);
        onImportComplete?.();
      } else {
        showWarning(`导入完成，${result.successRows}个成功，${result.errorRows}个失败`);
      }
    } catch (error) {
      showError('导入失败，请检查文件格式');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, departments, showSuccess, showWarning, showError, onImportComplete]);

  // 处理导出
  const handleExport = useCallback(async () => {
    setIsProcessing(true);
    try {
      // 模拟导出过程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      ExcelService.exportDepartments(departments, {
        filename: `部门数据_${new Date().toISOString().split('T')[0]}.csv`
      });
      
      showSuccess('部门数据导出成功');
    } catch (error) {
      showError('导出失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  }, [departments, showSuccess, showError]);

  // 下载模板
  const downloadTemplate = useCallback(() => {
    try {
      ExcelService.downloadTemplate();
      showSuccess('模板下载成功');
    } catch (error) {
      showError('模板下载失败');
    }
  }, [showSuccess, showError]);

  if (!isOpen) return null;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      fullScreenOnMobile={true}
    >
      <div className="p-4 sm:p-6">
          {/* 标题 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                type === 'import' 
                  ? 'bg-blue-500/10 text-blue-500' 
                  : 'bg-green-500/10 text-green-500'
              )}>
                {type === 'import' ? (
                  <ArrowDownTrayIcon className="w-6 h-6" />
                ) : (
                  <ArrowUpTrayIcon className="w-6 h-6" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text-primary">
                  {type === 'import' ? '导入部门数据' : '导出部门数据'}
                </h2>
                <p className="text-sm text-text-secondary">
                  {type === 'import' 
                    ? '从Excel文件导入部门信息' 
                    : `导出${departments.length}个部门的信息`
                  }
                </p>
              </div>
            </div>
            <ModernButton
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </ModernButton>
          </div>

          {type === 'import' ? (
            <>
              {/* 导入说明 */}
              <div className="bg-info/5 border border-info/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-info mb-2">导入说明</h3>
                    <ul className="text-sm text-info/80 space-y-1">
                      <li>• 支持Excel文件格式（.xlsx、.xls、.csv）</li>
                      <li>• 必填字段：部门名称、部门代码</li>
                      <li>• 上级部门代码留空表示顶级部门</li>
                      <li>• 部门代码必须唯一且不能重复</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 模板下载 */}
              <div className="flex items-center justify-between p-4 bg-background-secondary rounded-lg mb-6">
                <div className="flex items-center gap-3">
                  <DocumentIcon className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium text-text-primary">下载导入模板</p>
                    <p className="text-sm text-text-secondary">包含示例数据和字段说明</p>
                  </div>
                </div>
                <ModernButton
                  variant="ghost"
                  size="sm"
                  onClick={downloadTemplate}
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  下载模板
                </ModernButton>
              </div>

              {/* 文件选择 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  选择Excel文件
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                    selectedFile 
                      ? 'border-success bg-success/5' 
                      : 'border-border hover:border-primary hover:bg-primary/5'
                  )}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircleIcon className="w-8 h-8 text-success" />
                      <div>
                        <p className="font-medium text-success">{selectedFile.name}</p>
                        <p className="text-sm text-text-secondary">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <DocumentIcon className="w-12 h-12 text-text-disabled mx-auto mb-3" />
                      <p className="text-text-primary font-medium">点击选择Excel或CSV文件</p>
                      <p className="text-sm text-text-secondary mt-1">
                        支持.xlsx、.xls和.csv格式，文件大小不超过10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 导入结果 */}
              {importResult && (
                <div className="mb-6">
                  <h3 className="font-medium text-text-primary mb-3">导入结果</h3>
                  <div className={cn(
                    'p-4 rounded-lg border',
                    importResult.success 
                      ? 'bg-success/5 border-success/20' 
                      : 'bg-warning/5 border-warning/20'
                  )}>
                    <div className="flex items-start gap-3">
                      {importResult.success ? (
                        <CheckCircleIcon className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      ) : (
                        <ExclamationTriangleIcon className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-text-primary">
                              {importResult.totalRows}
                            </div>
                            <div className="text-sm text-text-secondary">总行数</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-success">
                              {importResult.successRows}
                            </div>
                            <div className="text-sm text-text-secondary">成功</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-error">
                              {importResult.errorRows}
                            </div>
                            <div className="text-sm text-text-secondary">失败</div>
                          </div>
                        </div>
                        
                        {importResult.errors.length > 0 && (
                          <div>
                            <p className="font-medium text-warning mb-2">错误详情：</p>
                            <div className="space-y-1">
                              {importResult.errors.map((error: any, index: number) => (
                                <div key={index} className="text-sm text-error">
                                  第{error.row}行 - {error.field}: {error.message}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <ResponsiveButtonGroup className="justify-end">
                <ModernButton
                  variant="ghost"
                  onClick={onClose}
                  disabled={isProcessing}
                >
                  取消
                </ModernButton>
                <ModernButton
                  variant="primary"
                  onClick={handleImport}
                  disabled={!selectedFile || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="loading loading-spinner loading-sm mr-2" />
                      导入中...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                      开始导入
                    </>
                  )}
                </ModernButton>
              </ResponsiveButtonGroup>
            </>
          ) : (
            <>
              {/* 导出说明 */}
              <div className="bg-info/5 border border-info/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-info mb-2">导出说明</h3>
                    <ul className="text-sm text-info/80 space-y-1">
                      <li>• 导出格式：CSV文件（Excel兼容）</li>
                      <li>• 包含所有部门的完整信息</li>
                      <li>• 支持层级关系导出</li>
                      <li>• 可直接用于导入其他系统</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 导出统计 */}
              <ResponsiveGrid
                cols={{ mobile: 2, tablet: 4, desktop: 4 }}
                gap="md"
                className="mb-6"
              >
                <div className="text-center p-4 bg-background-secondary rounded-lg">
                  <div className="text-2xl font-bold text-primary">{departments.length}</div>
                  <div className="text-sm text-text-secondary">部门总数</div>
                </div>
                <div className="text-center p-4 bg-background-secondary rounded-lg">
                  <div className="text-2xl font-bold text-green-500">
                    {departments.filter(d => !(d as any).parent_id).length}
                  </div>
                  <div className="text-sm text-text-secondary">顶级部门</div>
                </div>
                <div className="text-center p-4 bg-background-secondary rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">
                    {departments.filter(d => d.children && d.children.length > 0).length}
                  </div>
                  <div className="text-sm text-text-secondary">有子部门</div>
                </div>
                <div className="text-center p-4 bg-background-secondary rounded-lg">
                  <div className="text-2xl font-bold text-purple-500">
                    {departments.filter(d => (d.employee_count || 0) > 0).length}
                  </div>
                  <div className="text-sm text-text-secondary">有员工</div>
                </div>
              </ResponsiveGrid>

              {/* 操作按钮 */}
              <ResponsiveButtonGroup className="justify-end">
                <ModernButton
                  variant="ghost"
                  onClick={onClose}
                  disabled={isProcessing}
                >
                  取消
                </ModernButton>
                <ModernButton
                  variant="primary"
                  onClick={handleExport}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="loading loading-spinner loading-sm mr-2" />
                      导出中...
                    </>
                  ) : (
                    <>
                      <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                      开始导出
                    </>
                  )}
                </ModernButton>
              </ResponsiveButtonGroup>
            </>
          )}
        </div>
    </ResponsiveModal>
  );
}